'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, Plus, Trash2, GripVertical, Eye, Download,
    FileText, CheckSquare, ToggleLeft, PenLine, AlignLeft,
    Save, Loader2, ChevronUp, ChevronDown, Settings, Star, Clock,
    BookOpen, AlignCenter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ExamPaper, ExamQuestion } from './exam-room-view';

// ════════════════════════════════════════════════════════════
// EXAM BUILDER — Éditeur d'épreuve format A4
// ════════════════════════════════════════════════════════════

interface ExamBuilderProps {
    orgId: string;
    userId: string;
    userName: string;
    paper: ExamPaper | null;
    onBack: () => void;
}

const QUESTION_TYPES = [
    { id: 'qcm', label: 'QCM', icon: CheckSquare, color: 'blue', desc: 'Choix multiple' },
    { id: 'vrai_faux', label: 'Vrai / Faux', icon: ToggleLeft, color: 'green', desc: 'Vrai ou Faux' },
    { id: 'redaction', label: 'Rédaction', icon: PenLine, color: 'amber', desc: 'Réponse libre' },
    { id: 'texte_a_trou', label: 'Texte à trou', icon: AlignLeft, color: 'violet', desc: 'Compléter les blancs' },
] as const;

const newQuestion = (type: ExamQuestion['type']): ExamQuestion => ({
    id: crypto.randomUUID(),
    type,
    points: 1,
    text: '',
    ...(type === 'qcm' ? { options: ['', '', ''], correct: 0 } : {}),
    ...(type === 'vrai_faux' ? { correct: true } : {}),
    ...(type === 'redaction' ? { lines: 4 } : {}),
    ...(type === 'texte_a_trou' ? { blanks: [] } : {}),
});

export function ExamBuilder({ orgId, userId, paper, onBack }: ExamBuilderProps) {
    const [title, setTitle] = useState(paper?.title || '');
    const [subject, setSubject] = useState(paper?.subject || '');
    const [duration, setDuration] = useState(paper?.duration_minutes || 60);
    const [coefficient, setCoefficient] = useState(paper?.coefficient || 1);
    const [instructions, setInstructions] = useState(paper?.instructions || '');
    const [questions, setQuestions] = useState<ExamQuestion[]>(paper?.questions || []);
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState(false);
    const [activeTab, setActiveTab] = useState<'edit' | 'settings'>('edit');
    const printRef = useRef<HTMLDivElement>(null);

    const totalPoints = questions.reduce((s, q) => s + (q.points || 0), 0);

    // ── Question mutations ─────────────────────────────────
    const addQuestion = (type: ExamQuestion['type']) => {
        setQuestions(prev => [...prev, newQuestion(type)]);
    };

    const updateQuestion = (id: string, patch: Partial<ExamQuestion>) => {
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q));
    };

    const removeQuestion = (id: string) => {
        setQuestions(prev => prev.filter(q => q.id !== id));
    };

    const moveQuestion = (id: string, dir: 'up' | 'down') => {
        setQuestions(prev => {
            const idx = prev.findIndex(q => q.id === id);
            if (dir === 'up' && idx === 0) return prev;
            if (dir === 'down' && idx === prev.length - 1) return prev;
            const next = [...prev];
            const swap = dir === 'up' ? idx - 1 : idx + 1;
            [next[idx], next[swap]] = [next[swap], next[idx]];
            return next;
        });
    };

    // ── Save ───────────────────────────────────────────────
    const save = async (asDraft = true) => {
        if (!title.trim()) { toast.error('Donnez un titre à l\'épreuve'); return; }
        setSaving(true);
        try {
            const payload = {
                org_id: orgId, created_by: userId,
                title: title.trim(), subject: subject.trim() || null,
                duration_minutes: duration, coefficient,
                instructions: instructions.trim() || null,
                questions,
                status: asDraft ? 'draft' : 'published',
                updated_at: new Date().toISOString(),
            };

            if (paper?.id) {
                await supabase.from('exam_papers').update(payload).eq('id', paper.id);
            } else {
                await supabase.from('exam_papers').insert(payload);
            }
            toast.success(asDraft ? 'Brouillon sauvegardé ✅' : 'Épreuve publiée ✅');
            onBack();
        } catch (e: any) {
            toast.error(e.message || 'Erreur de sauvegarde');
        } finally {
            setSaving(false);
        }
    };

    // ── Print / Export PDF ─────────────────────────────────
    const printPDF = () => {
        const printContent = printRef.current?.innerHTML;
        if (!printContent) return;
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`
            <html><head>
            <title>${title} — Épreuve</title>
            <style>
                @page { size: A4; margin: 20mm 20mm 20mm 20mm; }
                body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; background: white; }
                .exam-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; }
                .exam-header h1 { font-size: 16pt; font-weight: bold; margin: 4px 0; }
                .exam-header p { font-size: 10pt; margin: 2px 0; }
                .meta-bar { display: flex; justify-content: space-between; font-size: 10pt; border: 1px solid #ccc; padding: 4px 8px; margin-bottom: 12px; }
                .instructions { font-size: 10pt; font-style: italic; margin-bottom: 16px; padding: 8px; border-left: 3px solid #666; }
                .question { margin-bottom: 20px; page-break-inside: avoid; }
                .question-header { display: flex; justify-content: space-between; font-weight: bold; font-size: 11pt; margin-bottom: 6px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
                .question-text { margin-bottom: 8px; font-size: 11pt; }
                .option { display: flex; align-items: center; gap: 8px; margin: 3px 0; font-size: 10pt; }
                .checkbox { width: 14px; height: 14px; border: 1.5px solid #333; display: inline-block; }
                .answer-lines { margin-top: 6px; }
                .answer-line { border-bottom: 1px solid #999; height: 20px; margin-bottom: 2px; }
                .blank-text { font-size: 11pt; line-height: 2; }
            </style>
            </head><body>${printContent}</body></html>
        `);
        win.document.close();
        win.print();
    };

    // ── Render ─────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full bg-[#0B0E14] text-white overflow-hidden">
            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/5">
                <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                    <ChevronLeft className="w-4.5 h-4.5" />
                </button>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">Concepteur d'épreuve</p>
                    <p className="text-sm font-bold text-white truncate">{title || 'Nouvelle épreuve'}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setPreview(!preview)}
                        className={cn("p-1.5 rounded-lg transition-all text-sm", preview ? 'bg-violet-600 text-white' : 'bg-white/10 text-slate-400 hover:text-white')}>
                        <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={printPDF}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all">
                        <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => save(true)} disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs text-slate-300 transition-all">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Brouillon
                    </button>
                    <button onClick={() => save(false)} disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-violet-900/30">
                        Publier
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="shrink-0 flex border-b border-white/5 px-4">
                {(['edit', 'settings'] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)}
                        className={cn("py-2.5 px-3 text-xs font-semibold border-b-2 transition-all",
                            activeTab === t ? 'border-violet-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300')}>
                        {t === 'edit' ? 'Questions' : 'Paramètres'}
                    </button>
                ))}
                <div className="ml-auto flex items-center gap-2 py-2">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400" />{totalPoints} pts
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />{questions.length} Q
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{duration} min
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {activeTab === 'settings' ? (
                    // ── SETTINGS TAB ──────────────────────────────────
                    <div className="p-4 space-y-4 max-w-xl mx-auto">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium">Titre de l'épreuve *</label>
                            <input value={title} onChange={e => setTitle(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/40"
                                placeholder="Ex: Contrôle de Mathématiques — Chapitre 3" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium">Matière</label>
                            <input value={subject} onChange={e => setSubject(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/40"
                                placeholder="Ex: Mathématiques, Français..." />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">Durée (minutes)</label>
                                <input type="number" value={duration} onChange={e => setDuration(+e.target.value)} min={5} max={480}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/40" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">Coefficient</label>
                                <input type="number" value={coefficient} onChange={e => setCoefficient(+e.target.value)} min={0.5} max={10} step={0.5}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/40" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium">Consignes générales</label>
                            <textarea value={instructions} onChange={e => setInstructions(e.target.value)}
                                rows={4} placeholder="Instructions données aux candidats..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-violet-500/40" />
                        </div>
                    </div>
                ) : preview ? (
                    // ── PREVIEW A4 ────────────────────────────────────
                    <div className="p-4 bg-gray-200 min-h-full flex justify-center">
                        <div ref={printRef} className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] p-[20mm] shadow-2xl font-serif text-[11pt] leading-relaxed">
                            {/* Header */}
                            <div className="exam-header text-center border-b-2 border-black pb-3 mb-4">
                                <p className="text-[9pt] font-semibold tracking-widest uppercase">DOCUMENT DU CANDIDAT</p>
                                <p className="text-[9pt] tracking-widest uppercase">ÉPREUVES COLLECTIVES</p>
                                <div className="flex justify-center my-2"><div className="w-3 h-3 bg-black"></div></div>
                                {subject && <h1 className="text-[16pt] font-bold uppercase mt-2">{subject}</h1>}
                                <h2 className="text-[14pt] font-bold mt-1">{title}</h2>
                                <p className="text-[10pt] mt-1">{totalPoints} points</p>
                                <div className="flex justify-center mt-2"><div className="w-3 h-3 bg-black"></div></div>
                            </div>
                            {/* Meta */}
                            <div className="flex justify-between text-[9pt] border border-gray-400 px-2 py-1 mb-3">
                                <span>Durée : <strong>{duration} min</strong></span>
                                <span>Coeff. : <strong>{coefficient}</strong></span>
                                <span>Total : <strong>{totalPoints} points</strong></span>
                            </div>
                            {/* Instructions */}
                            {instructions && (
                                <div className="border-l-4 border-gray-400 pl-3 italic text-[10pt] mb-4 text-gray-700">
                                    <strong>■ Consignes</strong><br />
                                    {instructions}
                                </div>
                            )}
                            {/* Questions */}
                            {questions.map((q, i) => (
                                <div key={q.id} className="mb-5 break-inside-avoid">
                                    <div className="flex justify-between border-b border-gray-300 pb-1 mb-2">
                                        <strong className="text-[11pt]">■ Exercice {i + 1}</strong>
                                        <span className="text-[10pt]">{q.points} point{q.points > 1 ? 's' : ''}</span>
                                    </div>
                                    <p className="mb-2">{q.text || <span className="text-gray-400 italic">Question vide…</span>}</p>
                                    {q.type === 'qcm' && (q.options || []).map((opt, oi) => (
                                        <div key={oi} className="flex items-center gap-2 mb-1 text-[10pt]">
                                            <div className="w-4 h-4 border-2 border-gray-400 shrink-0"></div>
                                            <span>{opt || `Option ${oi + 1}`}</span>
                                        </div>
                                    ))}
                                    {q.type === 'vrai_faux' && (
                                        <div className="flex gap-6 mt-1 text-[10pt]">
                                            <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-gray-400"></div><span>Vrai</span></div>
                                            <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-gray-400"></div><span>Faux</span></div>
                                        </div>
                                    )}
                                    {q.type === 'redaction' && (
                                        <div className="mt-2">
                                            {Array.from({ length: q.lines || 4 }).map((_, li) => (
                                                <div key={li} className="border-b border-gray-400 h-[22px] mb-[2px]"></div>
                                            ))}
                                        </div>
                                    )}
                                    {q.type === 'texte_a_trou' && (
                                        <p className="mt-1 leading-loose">{q.text}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    // ── EDIT MODE ─────────────────────────────────────
                    <div className="p-4 space-y-4 pb-32">
                        {/* Question type picker */}
                        <div className="grid grid-cols-2 gap-2">
                            {QUESTION_TYPES.map(qt => {
                                const Icon = qt.icon;
                                const colorMap: Record<string, string> = {
                                    blue: 'border-blue-500/30 hover:border-blue-500/60 text-blue-400',
                                    green: 'border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400',
                                    amber: 'border-amber-500/30 hover:border-amber-500/60 text-amber-400',
                                    violet: 'border-violet-500/30 hover:border-violet-500/60 text-violet-400',
                                };
                                return (
                                    <button key={qt.id} onClick={() => addQuestion(qt.id as any)}
                                        className={cn("flex items-center gap-2 p-3 rounded-xl border bg-white/[0.03] hover:bg-white/[0.06] transition-all text-left", colorMap[qt.color])}>
                                        <Icon className="w-4 h-4 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-white">{qt.label}</p>
                                            <p className="text-[10px] text-slate-500">{qt.desc}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Questions list */}
                        {questions.length === 0 && (
                            <div className="text-center py-12 text-slate-500 text-sm">
                                Ajoutez des questions avec les boutons ci-dessus
                            </div>
                        )}
                        {questions.map((q, i) => (
                            <QuestionEditor key={q.id} question={q} index={i}
                                isFirst={i === 0} isLast={i === questions.length - 1}
                                onChange={patch => updateQuestion(q.id, patch)}
                                onRemove={() => removeQuestion(q.id)}
                                onMove={dir => moveQuestion(q.id, dir)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Question Editor ────────────────────────────────────────
function QuestionEditor({
    question, index, isFirst, isLast, onChange, onRemove, onMove
}: {
    question: ExamQuestion; index: number; isFirst: boolean; isLast: boolean;
    onChange: (p: Partial<ExamQuestion>) => void;
    onRemove: () => void;
    onMove: (d: 'up' | 'down') => void;
}) {
    const typeColors: Record<string, string> = {
        qcm: 'border-blue-500/30 bg-blue-900/10',
        vrai_faux: 'border-emerald-500/30 bg-emerald-900/10',
        redaction: 'border-amber-500/30 bg-amber-900/10',
        texte_a_trou: 'border-violet-500/30 bg-violet-900/10',
    };
    const typeLabels: Record<string, string> = {
        qcm: 'QCM', vrai_faux: 'Vrai/Faux', redaction: 'Rédaction', texte_a_trou: 'Texte à trou'
    };

    return (
        <div className={cn("rounded-2xl border p-4 space-y-3", typeColors[question.type] || 'border-white/10')}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Q{index + 1} · {typeLabels[question.type]}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => onMove('up')} disabled={isFirst}
                        className="p-1 rounded hover:bg-white/10 disabled:opacity-30 text-slate-400 transition-all">
                        <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onMove('down')} disabled={isLast}
                        className="p-1 rounded hover:bg-white/10 disabled:opacity-30 text-slate-400 transition-all">
                        <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-1 ml-2">
                        <span className="text-[10px] text-slate-500">Points:</span>
                        <input type="number" value={question.points} onChange={e => onChange({ points: +e.target.value })}
                            min={0} max={100} className="w-10 bg-white/10 border border-white/10 rounded px-1 py-0.5 text-xs text-amber-400 font-bold text-center focus:outline-none" />
                    </div>
                    <button onClick={onRemove} className="ml-1 p-1 rounded hover:bg-red-500/20 text-red-500/70 hover:text-red-400 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Question text */}
            <textarea
                value={question.text} onChange={e => onChange({ text: e.target.value })}
                rows={2} placeholder="Énoncé de la question..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-white/30"
            />

            {/* QCM options */}
            {question.type === 'qcm' && (
                <div className="space-y-2">
                    {(question.options || []).map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                            <input type="radio" name={`correct_${question.id}`} checked={question.correct === oi}
                                onChange={() => onChange({ correct: oi })}
                                className="accent-emerald-500 shrink-0" />
                            <input value={opt} onChange={e => {
                                const opts = [...(question.options || [])];
                                opts[oi] = e.target.value;
                                onChange({ options: opts });
                            }}
                                placeholder={`Option ${oi + 1}`}
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-white/30" />
                            {(question.options || []).length > 2 && (
                                <button onClick={() => {
                                    const opts = (question.options || []).filter((_, i) => i !== oi);
                                    onChange({ options: opts, correct: 0 });
                                }} className="text-red-500/60 hover:text-red-400 transition-all">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}
                    <button onClick={() => onChange({ options: [...(question.options || []), ''] })}
                        className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-all">
                        <Plus className="w-3 h-3" /> Ajouter une option
                    </button>
                </div>
            )}

            {/* Vrai/Faux */}
            {question.type === 'vrai_faux' && (
                <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name={`vf_${question.id}`} checked={question.correct === true}
                            onChange={() => onChange({ correct: true })} className="accent-emerald-500" />
                        <span className="text-emerald-400 font-semibold">✓ Vrai</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name={`vf_${question.id}`} checked={question.correct === false}
                            onChange={() => onChange({ correct: false })} className="accent-red-500" />
                        <span className="text-red-400 font-semibold">✗ Faux</span>
                    </label>
                </div>
            )}

            {/* Rédaction */}
            {question.type === 'redaction' && (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Lignes de réponse :</span>
                    <input type="number" value={question.lines || 4} onChange={e => onChange({ lines: +e.target.value })}
                        min={1} max={30}
                        className="w-16 bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none" />
                    <span className="text-xs text-slate-500 italic">
                        (les lignes de réponse s'afficheront dans l'aperçu)
                    </span>
                </div>
            )}

            {/* Texte à trou — instructions */}
            {question.type === 'texte_a_trou' && (
                <p className="text-[11px] text-slate-500 italic">
                    Tapez le texte dans l'énoncé avec des séries de points pour marquer les espaces de réponse, ex: "La capitale est ..........."
                </p>
            )}
        </div>
    );
}
