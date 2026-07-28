'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, Upload, Loader2, FileText, Trash2,
    CheckSquare, Type, MousePointer2, ZoomIn, ZoomOut,
    Save, Eye, ChevronUp, ChevronDown, X, Plus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { uploadToR2 } from '@/lib/r2';
import type { ExamPaper } from './exam-room-view';

// ════════════════════════════════════════════════════════════
// PDF INTERACTIVE EDITOR
// Le prof upload un PDF, il place des zones interactives dessus
// (cases à cocher QCM, zones de saisie), les étudiants y répondent
// ════════════════════════════════════════════════════════════

export type AnnotationType = 'checkbox' | 'text_input' | 'radio_group';

export interface PdfAnnotation {
    id: string;
    type: AnnotationType;
    page: number;           // page 1-indexed
    x: number;              // % from left
    y: number;              // % from top
    width: number;          // %
    height: number;         // %
    label?: string;         // question text
    options?: string[];     // for radio_group
    correct?: number | boolean; // correct answer for auto-grade
    points: number;
    groupId?: string;       // for radio_group clustering
}

interface PdfExamBuilderProps {
    orgId: string;
    userId: string;
    paper: ExamPaper | null;
    onBack: () => void;
    onSaved: () => void;
}

const ANNOTATION_COLORS: Record<AnnotationType, string> = {
    checkbox: 'border-emerald-400 bg-emerald-400/10 text-emerald-300',
    text_input: 'border-amber-400 bg-amber-400/10 text-amber-300',
    radio_group: 'border-blue-400 bg-blue-400/10 text-blue-300',
};

const TOOL_LABELS: Record<AnnotationType, string> = {
    checkbox: '☑ Case à cocher',
    text_input: '✏️ Zone de texte',
    radio_group: '🔘 QCM Radio',
};

export function PdfExamBuilder({ orgId, userId, paper, onBack, onSaved }: PdfExamBuilderProps) {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string>(paper?.pdf_url || '');
    const [pdfPages, setPdfPages] = useState<string[]>([]); // base64 PNG per page
    const [currentPage, setCurrentPage] = useState(0);
    const [annotations, setAnnotations] = useState<PdfAnnotation[]>(
        (paper as any)?.pdf_annotations || []
    );
    const [activeTool, setActiveTool] = useState<AnnotationType | null>(null);
    const [selectedAnnot, setSelectedAnnot] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState(paper?.title || '');
    const [duration, setDuration] = useState(paper?.duration_minutes || 60);
    const [coefficient, setCoefficient] = useState(paper?.coefficient || 1);
    const [dragging, setDragging] = useState(false);

    const canvasRef = useRef<HTMLDivElement>(null);
    const fileInput = useRef<HTMLInputElement>(null);

    // ── Load PDF pages via pdf.js ──────────────────────────
    const renderPdf = useCallback(async (url: string) => {
        setLoading(true);
        try {
            // Dynamically import pdfjs
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

            const pdf = await pdfjsLib.getDocument({ url }).promise;
            const pages: string[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const scale = 1.5;
                const viewport = page.getViewport({ scale });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d')!;
                await page.render({ canvasContext: ctx as any, viewport }).promise;
                pages.push(canvas.toDataURL('image/png'));
            }
            setPdfPages(pages);
        } catch (e) {
            console.error('PDF render error:', e);
            toast.error('Impossible de lire le PDF. Vérifiez le format.');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (pdfUrl) renderPdf(pdfUrl);
    }, [pdfUrl, renderPdf]);

    // ── Upload PDF to R2 ───────────────────────────────────
    const handlePdfUpload = async (file: File) => {
        if (!file.type.includes('pdf')) { toast.error('Format PDF requis'); return; }
        setPdfFile(file);
        setLoading(true);
        try {
            const r2Res = await uploadToR2(file, `exams/${orgId}`, file.name);
            setPdfUrl(r2Res.url);
            toast.success('PDF uploadé ✅');
        } catch {
            // Fallback: use local blob URL for preview only
            const localUrl = URL.createObjectURL(file);
            setPdfUrl(localUrl);
            toast.info('Prévisualisation locale (configurez R2 pour le stockage permanent)');
        }
        setLoading(false);
    };

    // ── Place annotation on click ──────────────────────────
    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!activeTool || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const ann: PdfAnnotation = {
            id: crypto.randomUUID(),
            type: activeTool,
            page: currentPage,
            x: Math.max(0, Math.min(95, x)),
            y: Math.max(0, Math.min(95, y)),
            width: activeTool === 'text_input' ? 30 : activeTool === 'radio_group' ? 40 : 6,
            height: activeTool === 'text_input' ? 8 : activeTool === 'radio_group' ? 20 : 6,
            label: activeTool === 'checkbox' ? 'Bonne réponse ?' :
                activeTool === 'text_input' ? 'Réponse à rédiger' : 'Question QCM',
            options: activeTool === 'radio_group' ? ['Option A', 'Option B', 'Option C'] : undefined,
            correct: activeTool === 'radio_group' ? 0 : activeTool === 'checkbox' ? true : undefined,
            points: 1,
        };
        setAnnotations(prev => [...prev, ann]);
        setSelectedAnnot(ann.id);
    };

    const deleteAnnot = (id: string) => {
        setAnnotations(prev => prev.filter(a => a.id !== id));
        if (selectedAnnot === id) setSelectedAnnot(null);
    };

    const updateAnnot = (id: string, patch: Partial<PdfAnnotation>) => {
        setAnnotations(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
    };

    const selectedAnnotObj = annotations.find(a => a.id === selectedAnnot);
    const pageAnnotations = annotations.filter(a => a.page === currentPage);
    const totalPoints = annotations.reduce((s, a) => s + (a.points || 0), 0);

    // ── Save exam paper ────────────────────────────────────
    const save = async () => {
        if (!title.trim()) { toast.error('Titre requis'); return; }
        if (!pdfUrl) { toast.error('Veuillez uploader un PDF'); return; }
        setSaving(true);
        try {
            const payload = {
                org_id: orgId,
                created_by: userId,
                title: title.trim(),
                subject: '',
                duration_minutes: duration,
                coefficient,
                instructions: '',
                status: 'draft' as const,
                questions: [],          // no structured questions - PDF mode
                pdf_url: pdfUrl,
                pdf_annotations: annotations,
                exam_mode: 'pdf',
            };
            if (paper?.id) {
                await supabase.from('exam_papers').update(payload).eq('id', paper.id);
            } else {
                await supabase.from('exam_papers').insert(payload);
            }
            toast.success('Épreuve PDF sauvegardée ✅');
            onSaved();
        } catch (e: any) { toast.error(e.message); }
        setSaving(false);
    };

    return (
        <div className="flex flex-col h-full bg-[#0B0E14] text-white overflow-hidden">
            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/5">
                <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                    <ChevronLeft className="w-4.5 h-4.5" />
                </button>
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-500">Épreuve PDF interactive</p>
                    <input
                        value={title} onChange={e => setTitle(e.target.value)}
                        placeholder="Titre de l'épreuve..."
                        className="text-sm font-bold text-white bg-transparent outline-none w-full placeholder:text-slate-600"
                    />
                </div>
                <button onClick={save} disabled={saving || !pdfUrl}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded-xl text-xs font-bold text-white transition-all">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Sauvegarder
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* ── LEFT PANEL : PDF viewer + annotation overlay ── */}
                <div className="flex-1 overflow-auto bg-[#080B10] flex flex-col items-center py-4 relative">
                    {!pdfUrl ? (
                        // Upload zone
                        <div
                            onClick={() => fileInput.current?.click()}
                            onDragOver={e => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={e => {
                                e.preventDefault(); setDragging(false);
                                const f = e.dataTransfer.files[0];
                                if (f) handlePdfUpload(f);
                            }}
                            className={cn(
                                "w-[210mm] max-w-full aspect-[210/297] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all",
                                dragging ? "border-violet-400 bg-violet-900/20" : "border-white/10 hover:border-white/20"
                            )}>
                            <input ref={fileInput} type="file" accept=".pdf" className="hidden"
                                onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); }} />
                            <Upload className="w-12 h-12 text-violet-400 opacity-60" />
                            <div className="text-center">
                                <p className="text-white font-bold">Déposer le PDF ici</p>
                                <p className="text-slate-500 text-sm mt-1">ou cliquer pour sélectionner</p>
                            </div>
                            <p className="text-[11px] text-slate-600">Épreuves, exercices, QCM — tout format PDF</p>
                        </div>
                    ) : loading ? (
                        <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
                            <p className="text-sm">Chargement du PDF…</p>
                        </div>
                    ) : pdfPages.length > 0 ? (
                        <>
                            {/* Page navigation */}
                            <div className="flex items-center gap-3 mb-3">
                                <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                    disabled={currentPage === 0}
                                    className="px-2 py-1 bg-white/5 rounded-lg text-xs disabled:opacity-30 hover:bg-white/10 transition-all">
                                    ← Préc.
                                </button>
                                <span className="text-xs text-slate-400">Page {currentPage + 1} / {pdfPages.length}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(pdfPages.length - 1, p + 1))}
                                    disabled={currentPage === pdfPages.length - 1}
                                    className="px-2 py-1 bg-white/5 rounded-lg text-xs disabled:opacity-30 hover:bg-white/10 transition-all">
                                    Suiv. →
                                </button>
                                <div className="flex items-center gap-1 ml-3">
                                    <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-1 rounded hover:bg-white/10">
                                        <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
                                    </button>
                                    <span className="text-[10px] text-slate-500 w-8 text-center">{Math.round(zoom * 100)}%</span>
                                    <button onClick={() => setZoom(z => Math.min(2, z + 0.2))} className="p-1 rounded hover:bg-white/10">
                                        <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
                                    </button>
                                </div>
                            </div>

                            {/* PDF page + annotations overlay */}
                            <div
                                ref={canvasRef}
                                onClick={handleCanvasClick}
                                style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', cursor: activeTool ? 'crosshair' : 'default' }}
                                className="relative shadow-2xl shadow-black/60 select-none"
                            >
                                <img src={pdfPages[currentPage]} alt={`Page ${currentPage + 1}`}
                                    className="block max-w-full" draggable={false} />

                                {/* Annotation overlays */}
                                {pageAnnotations.map(ann => (
                                    <div
                                        key={ann.id}
                                        onClick={e => { e.stopPropagation(); setSelectedAnnot(ann.id); setActiveTool(null); }}
                                        style={{
                                            left: `${ann.x}%`, top: `${ann.y}%`,
                                            width: `${ann.width}%`, height: `${ann.height}%`,
                                        }}
                                        className={cn(
                                            "absolute border-2 rounded-lg cursor-pointer transition-all flex items-start justify-start p-1 overflow-hidden",
                                            ANNOTATION_COLORS[ann.type],
                                            selectedAnnot === ann.id ? 'ring-2 ring-white/60 ring-offset-1' : 'opacity-70 hover:opacity-100'
                                        )}>
                                        <span className="text-[8px] font-bold leading-tight truncate opacity-80">
                                            {ann.type === 'checkbox' ? '☑' : ann.type === 'radio_group' ? '⊙' : '✏'} {ann.label?.slice(0, 20)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        // PDF URL set but pages not rendered (blob or CORS issue)
                        <div className="flex flex-col items-center gap-3 py-20">
                            <FileText className="w-12 h-12 text-slate-600" />
                            <p className="text-slate-400 text-sm">PDF chargé — rendu non disponible</p>
                            <p className="text-slate-600 text-xs">Les étudiants verront le PDF natif</p>
                        </div>
                    )}
                </div>

                {/* ── RIGHT PANEL : Toolbar + annotation inspector ── */}
                <div className="w-64 shrink-0 border-l border-white/5 flex flex-col overflow-hidden bg-[#0D1018]">
                    {/* Toolbar */}
                    <div className="shrink-0 p-3 border-b border-white/5">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Outils d'annotation</p>
                        <div className="space-y-1.5">
                            {(Object.keys(TOOL_LABELS) as AnnotationType[]).map(tool => (
                                <button key={tool}
                                    onClick={() => setActiveTool(activeTool === tool ? null : tool)}
                                    disabled={!pdfUrl || pdfPages.length === 0}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all border disabled:opacity-30",
                                        activeTool === tool
                                            ? ANNOTATION_COLORS[tool] + ' border-current'
                                            : 'bg-white/[0.03] border-white/5 text-slate-400 hover:bg-white/[0.06]'
                                    )}>
                                    {TOOL_LABELS[tool]}
                                    {activeTool === tool && <span className="ml-auto text-[9px] opacity-60">Cliquez sur le PDF</span>}
                                </button>
                            ))}
                        </div>
                        <div className="mt-3 bg-white/[0.03] rounded-xl px-3 py-2 text-xs">
                            <div className="flex justify-between text-slate-500">
                                <span>Zones posées</span>
                                <span className="text-white font-bold">{annotations.length}</span>
                            </div>
                            <div className="flex justify-between text-slate-500 mt-0.5">
                                <span>Total points</span>
                                <span className="text-amber-400 font-bold">{totalPoints} pts</span>
                            </div>
                        </div>
                    </div>

                    {/* Annotation inspector */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {selectedAnnotObj ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Propriétés</p>
                                    <button onClick={() => deleteAnnot(selectedAnnotObj.id)}
                                        className="text-red-400 hover:text-red-300 p-1 rounded-lg hover:bg-red-900/20 transition-all">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <div>
                                        <label className="text-[10px] text-slate-500 mb-1 block">Intitulé</label>
                                        <input value={selectedAnnotObj.label || ''}
                                            onChange={e => updateAnnot(selectedAnnotObj.id, { label: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/40" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 mb-1 block">Points</label>
                                        <input type="number" min="0" max="100"
                                            value={selectedAnnotObj.points}
                                            onChange={e => updateAnnot(selectedAnnotObj.id, { points: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/40" />
                                    </div>

                                    {selectedAnnotObj.type === 'radio_group' && (
                                        <div>
                                            <label className="text-[10px] text-slate-500 mb-1 block">Options QCM</label>
                                            {(selectedAnnotObj.options || []).map((opt, oi) => (
                                                <div key={oi} className="flex items-center gap-1.5 mb-1.5">
                                                    <button
                                                        onClick={() => updateAnnot(selectedAnnotObj.id, { correct: oi })}
                                                        className={cn("w-4 h-4 rounded-full border shrink-0 transition-all",
                                                            selectedAnnotObj.correct === oi
                                                                ? 'border-emerald-400 bg-emerald-400' : 'border-slate-500')}>
                                                    </button>
                                                    <input value={opt}
                                                        onChange={e => {
                                                            const opts = [...(selectedAnnotObj.options || [])];
                                                            opts[oi] = e.target.value;
                                                            updateAnnot(selectedAnnotObj.id, { options: opts });
                                                        }}
                                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none"
                                                        placeholder={`Option ${oi + 1}`} />
                                                    <button onClick={() => {
                                                        const opts = (selectedAnnotObj.options || []).filter((_, i) => i !== oi);
                                                        updateAnnot(selectedAnnotObj.id, { options: opts });
                                                    }} className="text-slate-600 hover:text-red-400 transition-all">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => updateAnnot(selectedAnnotObj.id, { options: [...(selectedAnnotObj.options || []), ''] })}
                                                className="w-full text-[11px] text-slate-500 hover:text-white border border-dashed border-white/10 rounded-lg py-1 mt-1 transition-all flex items-center justify-center gap-1">
                                                <Plus className="w-3 h-3" /> Ajouter option
                                            </button>
                                        </div>
                                    )}

                                    {selectedAnnotObj.type === 'checkbox' && (
                                        <div>
                                            <label className="text-[10px] text-slate-500 mb-1 block">Réponse correcte</label>
                                            <div className="flex gap-2">
                                                {[true, false].map(v => (
                                                    <button key={String(v)}
                                                        onClick={() => updateAnnot(selectedAnnotObj.id, { correct: v })}
                                                        className={cn("flex-1 py-1.5 rounded-lg text-xs border transition-all",
                                                            selectedAnnotObj.correct === v
                                                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                                                                : 'bg-white/5 border-white/10 text-slate-400')}>
                                                        {v ? '✓ Vrai' : '✗ Faux'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Toutes les annotations</p>
                                {annotations.length === 0 ? (
                                    <p className="text-slate-600 text-[11px] text-center py-6">
                                        Aucune annotation.<br />Sélectionnez un outil et cliquez sur le PDF.
                                    </p>
                                ) : (
                                    annotations.map((ann, idx) => (
                                        <button key={ann.id}
                                            onClick={() => { setCurrentPage(ann.page); setSelectedAnnot(ann.id); }}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[11px] transition-all border",
                                                selectedAnnot === ann.id
                                                    ? ANNOTATION_COLORS[ann.type] + ' border-current'
                                                    : 'bg-white/[0.03] border-white/5 text-slate-400 hover:bg-white/[0.06]'
                                            )}>
                                            <span className="text-slate-500 shrink-0 w-4">#{idx + 1}</span>
                                            <span className="flex-1 truncate">{ann.label || ann.type}</span>
                                            <span className="text-amber-400 shrink-0">{ann.points}pt</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Config footer */}
                    <div className="shrink-0 border-t border-white/5 p-3 space-y-2">
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-[9px] text-slate-500 block mb-1">Durée (min)</label>
                                <input type="number" value={duration} onChange={e => setDuration(+e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none" />
                            </div>
                            <div className="flex-1">
                                <label className="text-[9px] text-slate-500 block mb-1">Coeff.</label>
                                <input type="number" step="0.5" value={coefficient} onChange={e => setCoefficient(+e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none" />
                            </div>
                        </div>
                        <button
                            onClick={() => fileInput.current?.click()}
                            className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-slate-400 transition-all flex items-center justify-center gap-2">
                            <Upload className="w-3.5 h-3.5" /> {pdfUrl ? 'Remplacer le PDF' : 'Uploader un PDF'}
                        </button>
                        <input ref={fileInput} type="file" accept=".pdf" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); }} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════
// PDF STUDENT VIEWER — L'étudiant répond sur le PDF interactif
// ════════════════════════════════════════════════════════════

interface PdfStudentViewerProps {
    pdfUrl: string;
    annotations: PdfAnnotation[];
    answers: Record<string, any>;
    onChange: (annId: string, value: any) => void;
    readOnly?: boolean;
}

export function PdfStudentViewer({ pdfUrl, annotations, answers, onChange, readOnly }: PdfStudentViewerProps) {
    const [pdfPages, setPdfPages] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [zoom, setZoom] = useState(1);

    const renderPdf = useCallback(async (url: string) => {
        setLoading(true);
        try {
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
            const pdf = await pdfjsLib.getDocument({ url }).promise;
            const pages: string[] = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width; canvas.height = viewport.height;
                const ctx = canvas.getContext('2d')!;
                await page.render({ canvasContext: ctx as any, viewport }).promise;
                pages.push(canvas.toDataURL('image/png'));
            }
            setPdfPages(pages);
        } catch { /* silent */ }
        setLoading(false);
    }, []);

    useEffect(() => { if (pdfUrl) renderPdf(pdfUrl); }, [pdfUrl, renderPdf]);

    const pageAnnotations = annotations.filter(a => a.page === currentPage);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Page nav */}
            {pdfPages.length > 1 && (
                <div className="shrink-0 flex items-center justify-center gap-3 py-2 bg-white/[0.02] border-b border-white/5">
                    <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}
                        className="px-3 py-1 bg-white/5 rounded-lg text-xs text-slate-400 disabled:opacity-30 hover:bg-white/10 transition-all">← Préc.</button>
                    <span className="text-xs text-slate-500">{currentPage + 1} / {pdfPages.length}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(pdfPages.length - 1, p + 1))} disabled={currentPage === pdfPages.length - 1}
                        className="px-3 py-1 bg-white/5 rounded-lg text-xs text-slate-400 disabled:opacity-30 hover:bg-white/10 transition-all">Suiv. →</button>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setZoom(z => Math.max(0.6, z - 0.15))} className="p-1 rounded hover:bg-white/10"><ZoomOut className="w-3.5 h-3.5 text-slate-400" /></button>
                        <button onClick={() => setZoom(z => Math.min(2, z + 0.15))} className="p-1 rounded hover:bg-white/10"><ZoomIn className="w-3.5 h-3.5 text-slate-400" /></button>
                    </div>
                </div>
            )}

            {/* PDF with interactive overlays */}
            <div className="flex-1 overflow-auto flex justify-center py-3 px-2">
                {loading ? (
                    <div className="flex items-center gap-2 text-slate-400 py-12">
                        <Loader2 className="w-5 h-5 animate-spin" /> Chargement de l'épreuve…
                    </div>
                ) : pdfPages.length > 0 ? (
                    <div className="relative shadow-2xl shadow-black/60" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
                        <img src={pdfPages[currentPage]} alt={`Page ${currentPage + 1}`} className="block max-w-full" draggable={false} />

                        {pageAnnotations.map(ann => (
                            <div key={ann.id} style={{ left: `${ann.x}%`, top: `${ann.y}%`, width: `${ann.width}%`, height: `${ann.height}%` }}
                                className="absolute flex items-center justify-center">
                                {ann.type === 'checkbox' && (
                                    <button
                                        disabled={readOnly}
                                        onClick={() => onChange(ann.id, !answers[ann.id])}
                                        className={cn(
                                            "w-full h-full border-2 rounded-lg flex items-center justify-center transition-all",
                                            answers[ann.id]
                                                ? 'bg-emerald-500/30 border-emerald-400'
                                                : 'bg-white/5 border-white/20 hover:border-white/40'
                                        )}>
                                        {answers[ann.id] && <span className="text-emerald-400 text-lg font-black">✓</span>}
                                    </button>
                                )}
                                {ann.type === 'text_input' && (
                                    <textarea
                                        readOnly={readOnly}
                                        value={answers[ann.id] || ''}
                                        onChange={e => onChange(ann.id, e.target.value)}
                                        placeholder="Votre réponse..."
                                        className="w-full h-full bg-amber-400/10 border-2 border-amber-400/40 rounded-lg px-2 py-1 text-white text-[11px] resize-none focus:outline-none focus:border-amber-400/70 placeholder:text-slate-500"
                                    />
                                )}
                                {ann.type === 'radio_group' && (
                                    <div className="w-full h-full bg-blue-400/10 border-2 border-blue-400/40 rounded-lg p-1.5 overflow-hidden">
                                        {(ann.options || []).map((opt, oi) => (
                                            <button key={oi} disabled={readOnly}
                                                onClick={() => onChange(ann.id, oi)}
                                                className={cn(
                                                    "w-full flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg text-left text-[10px] mb-0.5 transition-all",
                                                    answers[ann.id] === oi
                                                        ? 'bg-blue-500/30 text-white font-bold'
                                                        : 'text-slate-300 hover:bg-white/5'
                                                )}>
                                                <span className={cn("w-3 h-3 rounded-full border shrink-0 transition-all",
                                                    answers[ann.id] === oi ? 'border-blue-400 bg-blue-400' : 'border-slate-500')} />
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-slate-500 text-sm py-12">PDF non disponible</div>
                )}
            </div>
        </div>
    );
}
