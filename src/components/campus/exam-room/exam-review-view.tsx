'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2, XCircle, Minus, Download, Maximize2,
    Minimize2, ZoomIn, ZoomOut, ChevronDown, ChevronUp,
    BookOpen, Clock, Award, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExamPaper, ExamQuestion } from './exam-room-view';

// ════════════════════════════════════════════════════════════
// EXAM REVIEW VIEW — Vue correction étudiant après soumission
// Affiche: questions + réponses étudiant + réponses correctes
// Fonctions: télécharger PDF, fullscreen, zoom
// ════════════════════════════════════════════════════════════

interface ExamReviewViewProps {
    paper: ExamPaper;
    answers: Record<string, any>;
    score?: number;
    totalPoints: number;
    studentName: string;
    submittedAt?: string;
    onClose: () => void;
}

export function ExamReviewView({
    paper, answers, score, totalPoints, studentName, submittedAt, onClose
}: ExamReviewViewProps) {
    const questions = paper.questions || [];
    const [zoom, setZoom] = useState(1);
    const [fullscreen, setFullscreen] = useState(false);
    const [expandedQ, setExpandedQ] = useState<Set<string>>(new Set(questions.map(q => q.id)));
    const containerRef = useRef<HTMLDivElement>(null);
    const printRef = useRef<HTMLDivElement>(null);

    // ── Auto-score QCM / Vrai-Faux ──────────────────────────
    const computeScore = () => {
        let earned = 0;
        let auto = 0;
        questions.forEach(q => {
            const a = answers[q.id];
            if (q.type === 'qcm' || q.type === 'vrai_faux') {
                auto += q.points;
                if (a === q.correct) earned += q.points;
            }
        });
        return { earned, auto };
    };
    const { earned: autoEarned, auto: autoTotal } = computeScore();

    // ── Fullscreen API ───────────────────────────────────────
    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            await containerRef.current?.requestFullscreen?.();
            setFullscreen(true);
        } else {
            await document.exitFullscreen?.();
            setFullscreen(false);
        }
    };
    useEffect(() => {
        const handler = () => setFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    // ── PDF Download (print) ─────────────────────────────────
    const downloadPDF = () => {
        const date = submittedAt
            ? new Date(submittedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleDateString('fr-FR');

        const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Copie — ${paper.title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; background: #fff; }
  @page { size: A4; margin: 20mm 15mm; }
  .header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 18px; }
  .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .org { font-size: 10pt; color: #555; }
  .doc-type { font-size: 8pt; text-transform: uppercase; letter-spacing: 2px; color: #777; text-align: center; }
  .exam-title { font-size: 18pt; font-weight: bold; text-align: center; margin: 8px 0 4px; }
  .exam-sub { font-size: 10pt; text-align: center; color: #555; }
  .meta { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 12px; font-size: 9.5pt; }
  .meta-item { border: 1px solid #ddd; padding: 4px 8px; border-radius: 4px; }
  .meta-label { font-weight: bold; font-size: 8pt; text-transform: uppercase; color: #777; }
  .student-box { border: 2px solid #000; padding: 8px 12px; margin-top: 10px; display: flex; justify-content: space-between; }
  .score-box { background: #f5f5f5; border: 2px solid #000; padding: 8px 16px; text-align: center; border-radius: 4px; }
  .score-label { font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; color: #777; }
  .score-val { font-size: 22pt; font-weight: bold; }
  .q-block { margin-bottom: 18px; page-break-inside: avoid; }
  .q-header { display: flex; justify-content: space-between; align-items: center; background: #f0f0f0; padding: 6px 10px; border-left: 4px solid #333; font-weight: bold; font-size: 10.5pt; }
  .q-pts { font-size: 9pt; color: #555; }
  .q-text { padding: 8px 10px; font-size: 11pt; line-height: 1.5; }
  .answer-box { margin: 6px 10px; border: 1px solid #ccc; border-radius: 4px; overflow: hidden; }
  .answer-header { font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; padding: 3px 8px; font-weight: bold; }
  .answer-student { background: #fff8e1; }
  .answer-student .answer-header { background: #ffe082; color: #5d4037; }
  .answer-correct { background: #e8f5e9; }
  .answer-correct .answer-header { background: #a5d6a7; color: #1b5e20; }
  .answer-content { padding: 6px 8px; font-size: 11pt; }
  .status-correct { color: #2e7d32; font-weight: bold; }
  .status-wrong { color: #c62828; font-weight: bold; }
  .status-manual { color: #1565c0; font-weight: bold; }
  .footer { border-top: 1px solid #ccc; margin-top: 24px; padding-top: 8px; font-size: 8pt; color: #888; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="header">
  <p class="doc-type">Document du candidat — Épreuves officielles</p>
  <div class="exam-title">${paper.title}</div>
  <div class="exam-sub">${paper.subject || ''}</div>
  <div class="meta">
    <div class="meta-item"><div class="meta-label">Durée</div>${paper.duration_minutes} min</div>
    <div class="meta-item"><div class="meta-label">Coeff.</div>${paper.coefficient ?? 1}</div>
    <div class="meta-item"><div class="meta-label">Total</div>${totalPoints} points</div>
  </div>
  <div class="student-box">
    <div><span style="font-size:8pt;color:#777">NOM & PRÉNOM :</span><br/><strong style="font-size:13pt">${studentName}</strong></div>
    <div><span style="font-size:8pt;color:#777">DATE REMISE :</span><br/><strong>${date}</strong></div>
    ${score !== undefined ? `<div class="score-box"><div class="score-label">Note</div><div class="score-val">${score}/${totalPoints}</div></div>` : ''}
  </div>
</div>

${questions.map((q, i) => {
    const ans = answers[q.id];
    const isAuto = q.type === 'qcm' || q.type === 'vrai_faux';
    const isCorrect = isAuto && ans === q.correct;
    const statusClass = isAuto ? (isCorrect ? 'status-correct' : 'status-wrong') : 'status-manual';
    const statusText = isAuto ? (isCorrect ? `✓ Correct (+${q.points}pts)` : `✗ Incorrect (0/${q.points}pts)`) : `À corriger`;
    const qLabel = q.type === 'qcm' ? 'QCM' : q.type === 'vrai_faux' ? 'Vrai / Faux' : q.type === 'redaction' ? 'Rédaction' : 'Texte à trou';

    const formatAns = (a: any) => {
        if (!a && a !== false) return '<em style="color:#999">Sans réponse</em>';
        if (typeof a === 'boolean') return a ? 'Vrai' : 'Faux';
        return String(a);
    };

    return `
<div class="q-block">
  <div class="q-header">
    <span>■ Exercice ${i + 1} — ${qLabel}</span>
    <span class="q-pts">${q.points} point${q.points > 1 ? 's' : ''}</span>
  </div>
  <div class="q-text">${q.text}</div>
  ${isAuto && q.options ? `<div style="padding:4px 10px;font-size:10pt;color:#555">${(q.options as string[]).map((o, j) => `${String.fromCharCode(65 + j)}) ${o}`).join(' &nbsp;&nbsp; ')}</div>` : ''}
  <div class="answer-box answer-student">
    <div class="answer-header">Réponse de l'étudiant</div>
    <div class="answer-content">${formatAns(ans)}</div>
  </div>
  ${isAuto ? `
  <div class="answer-box answer-correct">
    <div class="answer-header">Réponse correcte</div>
    <div class="answer-content">${formatAns(q.correct)}</div>
  </div>` : ''}
  <div style="padding:2px 10px;font-size:9pt;" class="${statusClass}">${statusText}</div>
</div>`;
}).join('')}

<div class="footer">
  <span>Généré par CampusFlow • ${new Date().toLocaleString('fr-FR')}</span>
  <span>Document confidentiel — Usage interne uniquement</span>
</div>
</body></html>`;

        const win = window.open('', '_blank');
        if (win) {
            win.document.write(html);
            win.document.close();
            win.focus();
            setTimeout(() => win.print(), 500);
        }
    };

    // ── Question status helpers ──────────────────────────────
    const getStatus = (q: ExamQuestion) => {
        const a = answers[q.id];
        if (q.type === 'qcm' || q.type === 'vrai_faux') {
            if (a === undefined || a === null || a === '') return 'unanswered';
            return a === q.correct ? 'correct' : 'wrong';
        }
        return a ? 'manual' : 'unanswered';
    };

    const qTypeLabel = (type: string) => ({
        qcm: 'QCM', vrai_faux: 'Vrai/Faux', redaction: 'Rédaction', texte_a_trou: 'Texte à trou'
    }[type] || type);

    const correctCount = questions.filter(q => getStatus(q) === 'correct').length;
    const wrongCount = questions.filter(q => getStatus(q) === 'wrong').length;
    const manualCount = questions.filter(q => getStatus(q) === 'manual' || getStatus(q) === 'unanswered').length;

    return (
        <div
            ref={containerRef}
            className={cn(
                'flex flex-col bg-[#0B0E14] text-white overflow-hidden',
                fullscreen ? 'fixed inset-0 z-50' : 'h-full'
            )}
        >
            {/* ── Top bar ── */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-[#0d0d1a] border-b border-white/10 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <BookOpen className="w-4 h-4 text-violet-400 shrink-0" />
                    <span className="text-sm font-bold text-white truncate">{paper.title}</span>
                    <span className="text-[10px] text-slate-500 shrink-0">— Correction</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setZoom(z => Math.max(0.6, z - 0.1))}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all" title="Zoom -">
                        <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <span className="text-xs text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(2, z + 0.1))}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all" title="Zoom +">
                        <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button onClick={toggleFullscreen}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all" title="Plein écran">
                        {fullscreen ? <Minimize2 className="w-3.5 h-3.5 text-slate-400" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-400" />}
                    </button>
                    <button onClick={downloadPDF}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-all">
                        <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button onClick={onClose}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-slate-400 transition-all">
                        Fermer
                    </button>
                </div>
            </div>

            {/* ── Score summary ── */}
            <div className="shrink-0 px-4 py-4 border-b border-white/5">
                <div className="grid grid-cols-4 gap-3">
                    <div className="bg-violet-900/20 border border-violet-500/20 rounded-2xl p-3 text-center">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Score auto</p>
                        <p className="text-xl font-black text-white">{autoEarned}<span className="text-sm text-slate-500">/{autoTotal}</span></p>
                    </div>
                    <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-2xl p-3 text-center">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Corrects</p>
                        <p className="text-xl font-black text-emerald-400">{correctCount}</p>
                    </div>
                    <div className="bg-red-900/20 border border-red-500/20 rounded-2xl p-3 text-center">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Incorrects</p>
                        <p className="text-xl font-black text-red-400">{wrongCount}</p>
                    </div>
                    <div className="bg-blue-900/20 border border-blue-500/20 rounded-2xl p-3 text-center">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">À corriger</p>
                        <p className="text-xl font-black text-blue-400">{manualCount}</p>
                    </div>
                </div>
            </div>

            {/* ── Questions ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
                {questions.map((q, i) => {
                    const status = getStatus(q);
                    const ans = answers[q.id];
                    const isExpanded = expandedQ.has(q.id);

                    const borderColor = status === 'correct' ? 'border-emerald-500/40 bg-emerald-900/10'
                        : status === 'wrong' ? 'border-red-500/40 bg-red-900/10'
                        : status === 'manual' ? 'border-blue-500/40 bg-blue-900/10'
                        : 'border-white/10 bg-white/5';

                    const StatusIcon = status === 'correct' ? CheckCircle2
                        : status === 'wrong' ? XCircle
                        : status === 'unanswered' ? AlertCircle : Minus;

                    const iconColor = status === 'correct' ? 'text-emerald-400'
                        : status === 'wrong' ? 'text-red-400'
                        : status === 'manual' ? 'text-blue-400' : 'text-slate-500';

                    return (
                        <motion.div key={q.id}
                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            className={cn('border rounded-2xl overflow-hidden', borderColor)}>
                            {/* Question header */}
                            <button
                                onClick={() => setExpandedQ(prev => {
                                    const n = new Set(prev);
                                    n.has(q.id) ? n.delete(q.id) : n.add(q.id);
                                    return n;
                                })}
                                className="w-full flex items-center justify-between p-3 text-left gap-3"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <StatusIcon className={cn('w-4 h-4 shrink-0', iconColor)} />
                                    <span className="text-xs font-bold text-slate-500">Q{i + 1} · {qTypeLabel(q.type)}</span>
                                    <span className="text-xs font-semibold text-white truncate">{q.text.substring(0, 60)}{q.text.length > 60 ? '…' : ''}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={cn('text-xs font-bold', iconColor)}>
                                        {status === 'correct' ? `+${q.points}` : status === 'wrong' ? '0' : status === 'manual' ? '?' : '—'}
                                        <span className="text-slate-600">/{q.points}pt</span>
                                    </span>
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                                </div>
                            </button>

                            {/* Question body */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                                        className="overflow-hidden border-t border-white/5"
                                    >
                                        <div className="p-4 space-y-3">
                                            <p className="text-sm text-slate-200 leading-relaxed">{q.text}</p>

                                            {/* Options for QCM */}
                                            {q.type === 'qcm' && q.options && (
                                                <div className="grid gap-1.5">
                                                    {(q.options as string[]).map((opt, j) => {
                                                        const letter = String.fromCharCode(65 + j);
                                                        const isStudentChoice = ans === opt || ans === letter;
                                                        const isCorrectOpt = (q.correct as any) === opt || (q.correct as any) === letter;
                                                        return (
                                                            <div key={j} className={cn(
                                                                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm',
                                                                isCorrectOpt ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' :
                                                                isStudentChoice && !isCorrectOpt ? 'bg-red-500/20 border border-red-500/40 text-red-300' :
                                                                'bg-white/5 border border-white/10 text-slate-400'
                                                            )}>
                                                                <span className="font-bold text-xs">{letter}</span>
                                                                <span className="flex-1">{opt}</span>
                                                                {isCorrectOpt && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                                                                {isStudentChoice && !isCorrectOpt && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Vrai/Faux */}
                                            {q.type === 'vrai_faux' && (
                                                <div className="flex gap-2">
                                                    {['Vrai', 'Faux'].map(opt => {
                                                        const val = opt === 'Vrai' ? true : false;
                                                        const chosen = ans === val || ans === opt;
                                                        const isCorrectOpt = (q.correct as any) === val || (q.correct as any) === opt;
                                                        return (
                                                            <div key={opt} className={cn(
                                                                'flex-1 py-2 rounded-xl text-sm font-bold text-center',
                                                                isCorrectOpt ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' :
                                                                chosen ? 'bg-red-500/20 border border-red-500/40 text-red-300' :
                                                                'bg-white/5 border border-white/10 text-slate-500'
                                                            )}>
                                                                {opt}
                                                                {isCorrectOpt && ' ✓'}
                                                                {chosen && !isCorrectOpt && ' ✗'}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Rédaction / Texte à trou */}
                                            {(q.type === 'redaction' || q.type === 'texte_a_trou') && (
                                                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Votre réponse</p>
                                                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                                                        {ans || <span className="text-slate-500 italic">Sans réponse</span>}
                                                    </p>
                                                    {q.correct && (
                                                        <div className="mt-3 pt-3 border-t border-white/10">
                                                            <p className="text-[10px] text-blue-400 uppercase tracking-wider mb-1">Éléments de réponse</p>
                                                            <p className="text-sm text-blue-200/80 leading-relaxed">{String(q.correct)}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}

                {questions.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>Aucune question à afficher</p>
                    </div>
                )}
            </div>
        </div>
    );
}
