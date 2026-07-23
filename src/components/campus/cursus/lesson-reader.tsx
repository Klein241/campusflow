'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, ZoomIn, ZoomOut,
    Highlighter, BookOpen, StickyNote, Save,
    ChevronLeft, ChevronRight, Copy,
    Check, Trash2, FileText,
    Eye, Code2, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ContentBlock } from './rich-content-editor';

// ═══════════════════════════════════════════════════════════════
// LESSON FULLSCREEN READER
// Lecteur immersif avec : zoom, surlignage, sélection texte,
// bloc-notes personnel par leçon (persisté en Supabase)
// ═══════════════════════════════════════════════════════════════

export interface LessonReaderNote {
    id: string;
    lesson_id: string;
    user_id: string;
    content: string;
    highlight_text?: string;
    color?: string;
    created_at: string;
}

interface LessonReaderProps {
    isOpen: boolean;
    onClose: () => void;
    lesson: {
        id: string;
        title: string;
        content: string | null;
        chapter_title?: string;
        subject_title?: string;
    };
    userId: string;
    orgId: string;
    /** Si true, ouvre le panneau Notes directement à l'ouverture */
    initialShowNotes?: boolean;
}

// Palette de couleurs pour surlignage
const HIGHLIGHT_COLORS = [
    { id: 'yellow', label: 'Jaune', bg: 'bg-yellow-400/40', text: 'text-yellow-200', border: 'border-yellow-400/60', css: 'rgba(250,204,21,0.35)' },
    { id: 'green',  label: 'Vert',  bg: 'bg-green-400/40',  text: 'text-green-200',  border: 'border-green-400/60',  css: 'rgba(74,222,128,0.35)' },
    { id: 'blue',   label: 'Bleu',  bg: 'bg-blue-400/40',   text: 'text-blue-200',   border: 'border-blue-400/60',   css: 'rgba(96,165,250,0.35)' },
    { id: 'pink',   label: 'Rose',  bg: 'bg-pink-400/40',   text: 'text-pink-200',   border: 'border-pink-400/60',   css: 'rgba(244,114,182,0.35)' },
    { id: 'orange', label: 'Orange',bg: 'bg-orange-400/40', text: 'text-orange-200', border: 'border-orange-400/60', css: 'rgba(251,146,60,0.35)'  },
];

function parseBlocks(raw: string | null | undefined): ContentBlock[] {
    if (!raw) return [];
    try {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p as ContentBlock[];
    } catch {}
    return [{ type: 'text', value: raw }];
}

// ── Code fence parser for lesson content ───────────────────────────────────────
type TextSeg = { type: 'text'; value: string } | { type: 'code'; lang: string; value: string };

function parseCodeFences(raw: string): TextSeg[] {
    const parts: TextSeg[] = [];
    const re = /```(\w*)\n?([\s\S]*?)```/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw)) !== null) {
        if (m.index > last) parts.push({ type: 'text', value: raw.slice(last, m.index) });
        parts.push({ type: 'code', lang: (m[1] || 'text').toLowerCase(), value: m[2].trimEnd() });
        last = m.index + m[0].length;
    }
    if (last < raw.length) parts.push({ type: 'text', value: raw.slice(last) });
    return parts.length ? parts : [{ type: 'text', value: raw }];
}

const LANG_BADGE: Record<string, { bg: string; text: string; label: string }> = {
    html:       { bg: 'bg-orange-500/20', text: 'text-orange-300', label: 'HTML' },
    css:        { bg: 'bg-blue-500/20',   text: 'text-blue-300',   label: 'CSS' },
    js:         { bg: 'bg-yellow-500/20', text: 'text-yellow-300', label: 'JavaScript' },
    javascript: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', label: 'JavaScript' },
    ts:         { bg: 'bg-blue-400/20',   text: 'text-blue-200',   label: 'TypeScript' },
    typescript: { bg: 'bg-blue-400/20',   text: 'text-blue-200',   label: 'TypeScript' },
    python:     { bg: 'bg-green-500/20',  text: 'text-green-300',  label: 'Python' },
    sql:        { bg: 'bg-teal-500/20',   text: 'text-teal-300',   label: 'SQL' },
    bash:       { bg: 'bg-slate-500/20',  text: 'text-slate-300',  label: 'Bash' },
    json:       { bg: 'bg-amber-500/20',  text: 'text-amber-300',  label: 'JSON' },
};

function InlineCodeBlock({ lang, code }: { lang: string; code: string }) {
    const [tab, setTab] = useState<'code' | 'preview'>('code');
    const [copied, setCopied] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const cfg = LANG_BADGE[lang] || { bg: 'bg-slate-500/20', text: 'text-slate-300', label: lang.toUpperCase() || 'CODE' };
    const isHtml = lang === 'html';
    const iframeSrc = isHtml ? `data:text/html;charset=utf-8,${encodeURIComponent(
        code.includes('<html') ? code :
        `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:system-ui,sans-serif;margin:16px;background:#fff}</style></head><body>${code}</body></html>`
    )}` : '';

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true); setTimeout(() => setCopied(false), 1800);
    };

    return (
        <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0a0d14] shadow-xl my-2">
            <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500/70" />
                    <span className="w-2 h-2 rounded-full bg-yellow-500/70" />
                    <span className="w-2 h-2 rounded-full bg-green-500/70" />
                    <span className={cn('ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full', cfg.bg, cfg.text)}>{cfg.label}</span>
                </div>
                <div className="flex items-center gap-1">
                    {isHtml && (
                        <div className="flex bg-white/[0.05] rounded-lg p-0.5">
                            <button onClick={() => setTab('code')} className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] transition-all', tab==='code' ? 'bg-white/10 text-white' : 'text-slate-500')}>
                                <Code2 className="w-2.5 h-2.5" />Code
                            </button>
                            <button onClick={() => setTab('preview')} className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] transition-all', tab==='preview' ? 'bg-orange-500/20 text-orange-300' : 'text-slate-500')}>
                                <Eye className="w-2.5 h-2.5" />Aperçu
                            </button>
                        </div>
                    )}
                    <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-white/10 transition text-slate-400">
                        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setCollapsed(v => !v)} className="p-1.5 rounded-lg hover:bg-white/10 transition text-slate-400">
                        {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>
            {!collapsed && (
                isHtml && tab === 'preview' ? (
                    <div className="bg-white" style={{ height: '300px' }}>
                        <iframe src={iframeSrc} sandbox="allow-scripts allow-same-origin" title="Aperçu HTML" className="w-full h-full border-0" style={{ colorScheme: 'normal' }} />
                    </div>
                ) : (
                    <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-slate-200 font-mono max-h-72">
                        <code>{code}</code>
                    </pre>
                )
            )}
        </div>
    );
}

function renderTextWithCode(raw: string, notes: LessonReaderNote[], colorMap: Record<string, string>): React.ReactNode[] {
    const segs = parseCodeFences(raw);
    return segs.map((seg, idx) => {
        if (seg.type === 'code') {
            return <InlineCodeBlock key={idx} lang={seg.lang} code={seg.value} />;
        }
        // Plain text with highlight marks
        let html = seg.value;
        notes.filter(n => n.highlight_text).forEach(n => {
            if (n.highlight_text) {
                const escaped = n.highlight_text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const colorCss = colorMap[n.color || 'yellow'];
                html = html.replace(new RegExp(escaped, 'gi'),
                    `<mark style="background:${colorCss};border-radius:3px;padding:0 2px;">${n.highlight_text}</mark>`);
            }
        });
        return html.trim() ? (
            <div key={idx} className="text-slate-200 leading-[1.9] tracking-wide whitespace-pre-line" dangerouslySetInnerHTML={{ __html: html }} />
        ) : null;
    }).filter(Boolean) as React.ReactNode[];
}

export function LessonReader({ isOpen, onClose, lesson, userId, orgId, initialShowNotes = false }: LessonReaderProps) {
    // Zoom
    const [zoom, setZoom] = useState(100);
    // Highlight mode
    const [highlightMode, setHighlightMode] = useState(false);
    const [activeColor, setActiveColor] = useState(HIGHLIGHT_COLORS[0]);
    // Notes panel
    const [showNotes, setShowNotes] = useState(false);
    const [notes, setNotes] = useState<LessonReaderNote[]>([]);
    const [newNote, setNewNote] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [loadingNotes, setLoadingNotes] = useState(false);
    // Selected text popup
    const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
    const [copied, setCopied] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const blocks = parseBlocks(lesson.content);

    // ── Load notes ────────────────────────────────────────
    const loadNotes = useCallback(async () => {
        if (!userId || !lesson.id) return;
        setLoadingNotes(true);
        const { data } = await supabase
            .from('lesson_reader_notes')
            .select('*')
            .eq('lesson_id', lesson.id)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        setNotes(data || []);
        setLoadingNotes(false);
    }, [lesson.id, userId]);

    useEffect(() => {
        if (isOpen) {
            loadNotes();
            setZoom(100);
            setHighlightMode(false);
            setShowNotes(initialShowNotes);
            setNewNote('');
        }
    }, [isOpen, loadNotes]);

    // ── Text selection handler ────────────────────────────
    const handleMouseUp = useCallback(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
            setSelection(null);
            return;
        }
        const text = sel.toString().trim();
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = contentRef.current?.getBoundingClientRect();
        if (!containerRect) return;

        setSelection({
            text,
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top - 10,
        });

        // If highlight mode is on — apply highlight automatically
        if (highlightMode) {
            applyHighlight(text);
            sel.removeAllRanges();
            setSelection(null);
        }
    }, [highlightMode, activeColor]);

    const applyHighlight = (text: string) => {
        // Save as a note with highlight
        saveNote(text, text);
    };

    const copySelection = async () => {
        if (!selection) return;
        await navigator.clipboard.writeText(selection.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const saveSelectionAsNote = () => {
        if (!selection) return;
        setNewNote(prev => prev ? `${prev}\n\n> ${selection.text}` : `> ${selection.text}`);
        setShowNotes(true);
        setSelection(null);
        window.getSelection()?.removeAllRanges();
    };

    // ── Save note ─────────────────────────────────────────
    const saveNote = async (content: string, highlightText?: string) => {
        if (!content.trim()) return;
        setSavingNote(true);
        const { error } = await supabase.from('lesson_reader_notes').insert({
            lesson_id:      lesson.id,
            user_id:        userId,
            content:        content.trim(),
            highlight_text: highlightText || null,
            color:          activeColor.id,
        });
        if (!error) {
            toast.success(highlightText ? '✨ Surlignage sauvegardé' : '📝 Note sauvegardée');
            setNewNote('');
            loadNotes();
            // Met à jour le state global des notes (pour la carte Bloc Notes)
        } else {
            toast.error('Erreur sauvegarde: ' + error.message);
            console.error('[BlocNotes] insert error:', error);
        }
        setSavingNote(false);
    };

    const deleteNote = async (noteId: string) => {
        await supabase.from('lesson_reader_notes').delete().eq('id', noteId);
        setNotes(prev => prev.filter(n => n.id !== noteId));
        toast.success('Note supprimée');
    };

    const zoomIn  = () => setZoom(z => Math.min(z + 10, 200));
    const zoomOut = () => setZoom(z => Math.max(z - 10, 60));
    const resetZoom = () => setZoom(100);

    const colorMap: Record<string, string> = {};
    HIGHLIGHT_COLORS.forEach(c => { colorMap[c.id] = c.css; });

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-[#060810] flex flex-col"
            >
                {/* ── Top toolbar ── */}
                <div className="flex-none flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-[#0A0D18]/80 backdrop-blur-xl">
                    {/* Close */}
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                        {lesson.subject_title && (
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest truncate">{lesson.subject_title}{lesson.chapter_title ? ` › ${lesson.chapter_title}` : ''}</p>
                        )}
                        <h2 className="text-sm font-bold text-white truncate">{lesson.title}</h2>
                    </div>

                    {/* Zoom controls */}
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                        <button onClick={zoomOut} className="p-1 hover:text-white text-slate-400 transition-colors" disabled={zoom <= 60}>
                            <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={resetZoom} className="text-[10px] font-mono text-slate-300 w-10 text-center hover:text-white transition-colors">
                            {zoom}%
                        </button>
                        <button onClick={zoomIn} className="p-1 hover:text-white text-slate-400 transition-colors" disabled={zoom >= 200}>
                            <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Highlight toggle */}
                    <button
                        onClick={() => setHighlightMode(h => !h)}
                        className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all",
                            highlightMode
                                ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-300"
                                : "bg-white/[0.04] border-white/[0.06] text-slate-400 hover:text-white"
                        )}
                    >
                        <Highlighter className="w-3.5 h-3.5" />
                        {highlightMode ? 'ON' : 'Surligner'}
                    </button>

                    {/* Notes panel toggle */}
                    <button
                        onClick={() => setShowNotes(n => !n)}
                        className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all relative",
                            showNotes
                                ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                                : "bg-white/[0.04] border-white/[0.06] text-slate-400 hover:text-white"
                        )}
                    >
                        <StickyNote className="w-3.5 h-3.5" />
                        Bloc Notes
                        {notes.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-[8px] font-bold flex items-center justify-center text-white">
                                {notes.length > 9 ? '9+' : notes.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* ── Color picker (visible when highlight mode) ── */}
                <AnimatePresence>
                    {highlightMode && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="flex-none flex items-center gap-2 px-4 py-2 border-b border-white/[0.06] bg-[#0A0D18]/60 overflow-hidden"
                        >
                            <span className="text-[10px] text-slate-500 mr-1">Couleur :</span>
                            {HIGHLIGHT_COLORS.map(color => (
                                <button
                                    key={color.id}
                                    onClick={() => setActiveColor(color)}
                                    className={cn(
                                        "w-6 h-6 rounded-full border-2 transition-all",
                                        color.bg,
                                        activeColor.id === color.id ? `border-white scale-125` : 'border-transparent hover:scale-110'
                                    )}
                                    title={color.label}
                                />
                            ))}
                            <span className="ml-2 text-[10px] text-slate-400">
                                {highlightMode ? '✨ Sélectionnez du texte pour le surligner' : ''}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Main area: content + notes panel ── */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                        <div
                            ref={contentRef}
                            className="relative max-w-3xl mx-auto px-6 py-8 select-text"
                            style={{ fontSize: `${zoom}%` }}
                            onMouseUp={handleMouseUp}
                            onTouchEnd={handleMouseUp}
                        >
                            {/* Text selection popup */}
                            <AnimatePresence>
                                {selection && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="absolute z-50 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-[#1a2035] border border-white/15 shadow-2xl shadow-black/60"
                                        style={{ left: `${selection.x}px`, top: `${selection.y}px`, transform: 'translate(-50%, -100%)' }}
                                    >
                                        <button
                                            onClick={copySelection}
                                            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white text-[10px] transition-colors"
                                        >
                                            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                            {copied ? 'Copié' : 'Copier'}
                                        </button>
                                        <div className="w-px h-4 bg-white/10" />
                                        <button
                                            onClick={saveSelectionAsNote}
                                            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-indigo-500/20 text-indigo-300 text-[10px] transition-colors"
                                        >
                                            <StickyNote className="w-3 h-3" />
                                            Note
                                        </button>
                                        {HIGHLIGHT_COLORS.slice(0, 3).map(color => (
                                            <button
                                                key={color.id}
                                                onClick={() => { setActiveColor(color); applyHighlight(selection.text); setSelection(null); window.getSelection()?.removeAllRanges(); }}
                                                className={cn("w-5 h-5 rounded-full border border-white/20 transition-all hover:scale-110", color.bg)}
                                                title={`Surligner en ${color.label}`}
                                            />
                                        ))}
                                        <button
                                            onClick={() => { setSelection(null); window.getSelection()?.removeAllRanges(); }}
                                            className="p-1 rounded hover:bg-white/10 text-slate-500"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Lesson content blocks */}
                            {blocks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <BookOpen className="w-12 h-12 text-slate-600 mb-3" />
                                    <p className="text-slate-500 text-sm">Cette leçon n'a pas encore de contenu</p>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {blocks.map((block, i) => {
                                        if (block.type === 'text') {
                                            if (!block.value?.trim()) return null;
                                            // Detect code fences
                                            const hasCodeFence = block.value.includes('```');
                                            if (hasCodeFence) {
                                                return (
                                                    <div key={i} className="space-y-3">
                                                        {renderTextWithCode(block.value, notes, colorMap)}
                                                    </div>
                                                );
                                            }
                                            // Plain text with highlight marks
                                            let html = block.value;
                                            notes
                                                .filter(n => n.highlight_text)
                                                .forEach(n => {
                                                    if (n.highlight_text) {
                                                        const escaped = n.highlight_text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                                        const colorCss = colorMap[n.color || 'yellow'];
                                                        html = html.replace(
                                                            new RegExp(escaped, 'gi'),
                                                            `<mark style="background:${colorCss};border-radius:3px;padding:0 2px;">${n.highlight_text}</mark>`
                                                        );
                                                    }
                                                });
                                            return (
                                                <div
                                                    key={i}
                                                    className="text-slate-200 leading-[1.9] tracking-wide whitespace-pre-line"
                                                    dangerouslySetInnerHTML={{ __html: html }}
                                                />
                                            );
                                        }
                                        if (block.type === 'image') {
                                            return (
                                                <figure key={i} className="rounded-2xl overflow-hidden border border-white/10 mx-auto">
                                                    <img
                                                        src={block.url}
                                                        alt={block.caption || ''}
                                                        className="w-full max-h-[70vh] object-contain mx-auto block bg-black/20"
                                                        loading="lazy"
                                                    />
                                                    {block.caption && (
                                                        <figcaption className="text-center text-xs text-slate-500 py-2 px-3 bg-black/20 italic">
                                                            {block.caption}
                                                        </figcaption>
                                                    )}
                                                </figure>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Notes Panel (slide-in) ── */}
                    <AnimatePresence>
                        {showNotes && (
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                                className="w-80 flex-none flex flex-col border-l border-white/[0.06] bg-[#0A0D18] overflow-hidden"
                            >
                                {/* Notes header */}
                                <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                                    <div className="flex items-center gap-2">
                                        <StickyNote className="w-4 h-4 text-indigo-400" />
                                        <span className="text-sm font-bold text-white">Bloc Notes</span>
                                        <span className="text-[10px] text-slate-500 bg-white/5 rounded-full px-2">{notes.length}</span>
                                    </div>
                                    <button onClick={() => setShowNotes(false)} className="p-1 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* New note input */}
                                <div className="flex-none p-3 border-b border-white/[0.06]">
                                    <textarea
                                        value={newNote}
                                        onChange={e => setNewNote(e.target.value)}
                                        placeholder="Écrire une note sur cette leçon..."
                                        rows={4}
                                        className="w-full text-xs bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-colors leading-relaxed"
                                    />
                                    <button
                                        onClick={() => saveNote(newNote)}
                                        disabled={!newNote.trim() || savingNote}
                                        className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-semibold disabled:opacity-40 hover:from-indigo-500 hover:to-violet-500 transition-all"
                                    >
                                        {savingNote ? (
                                            <span className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full" />
                                        ) : (
                                            <Save className="w-3 h-3" />
                                        )}
                                        Sauvegarder
                                    </button>
                                </div>

                                {/* Notes list */}
                                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                    {loadingNotes ? (
                                        <div className="flex justify-center py-8">
                                            <span className="w-5 h-5 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : notes.length === 0 ? (
                                        <div className="text-center py-10">
                                            <FileText className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                                            <p className="text-slate-600 text-xs">Aucune note pour cette leçon</p>
                                        </div>
                                    ) : (
                                        notes.map(note => {
                                            const color = HIGHLIGHT_COLORS.find(c => c.id === note.color) || HIGHLIGHT_COLORS[0];
                                            return (
                                                <div
                                                    key={note.id}
                                                    className={cn(
                                                        "rounded-xl p-3 border text-xs group relative",
                                                        note.highlight_text
                                                            ? `${color.bg} ${color.border}`
                                                            : "bg-white/[0.03] border-white/[0.06]"
                                                    )}
                                                >
                                                    {note.highlight_text && (
                                                        <p className={cn("font-semibold mb-1 text-[10px] truncate", color.text)}>
                                                            ✨ &ldquo;{note.highlight_text}&rdquo;
                                                        </p>
                                                    )}
                                                    <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                                                    <p className="text-slate-600 text-[9px] mt-1.5">
                                                        {new Date(note.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <button
                                                        onClick={() => deleteNote(note.id)}
                                                        className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 transition-all"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
