'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, CheckCircle2, XCircle, Pencil, Save,
    Loader2, Star, Users, BookOpen, Award, AlertCircle, Clock,
    TrendingUp, Download, ChevronDown, ChevronUp, BarChart3
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ExamSession, ExamQuestion } from './exam-room-view';

// ════════════════════════════════════════════════════════════
// EXAM GRADING VIEW — Interface de correction pour Prof/Admin
// ════════════════════════════════════════════════════════════

interface GradeEntry {
    participantId: string;
    questionId: string;
    earned: number;
    note: string;
}

interface StudentCopy {
    id: string;
    student_id: string;
    studentName: string;
    answers: Record<string, any>;
    status: string;
    score?: number;
    submitted_at?: string;
    manualGrades: Record<string, { earned: number; note: string }>;
    totalScore?: number;
}

interface ExamGradingViewProps {
    session: ExamSession;
    orgId: string;
    userId: string;
    onBack: () => void;
}

export function ExamGradingView({ session, orgId, userId, onBack }: ExamGradingViewProps) {
    const paper = session.paper!;
    const questions = paper.questions || [];
    const [copies, setCopies] = useState<StudentCopy[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCopy, setSelectedCopy] = useState<StudentCopy | null>(null);
    const [saving, setSaving] = useState(false);
    const [view, setView] = useState<'list' | 'correct'>('list');
    const [copyIndex, setCopyIndex] = useState(0);

    const totalPoints = questions.reduce((s, q) => s + (q.points || 0), 0);
    const manualQuestions = questions.filter(q => q.type === 'redaction' || q.type === 'texte_a_trou');
    const autoQuestions = questions.filter(q => q.type === 'qcm' || q.type === 'vrai_faux');

    // ── Load ───────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        const { data: parts } = await supabase.from('exam_participants')
            .select('*').eq('session_id', session.id)
            .in('status', ['submitted', 'failed'])
            .order('submitted_at', { ascending: true, nullsFirst: false });

        if (!parts) { setLoading(false); return; }

        const ids = parts.map((p: any) => p.student_id);
        const { data: students } = await supabase.from('student_profiles')
            .select('id, first_name, last_name').in('id', ids);
        const { data: teachers } = await supabase.from('teacher_profiles')
            .select('id, first_name, last_name').in('id', ids);
        const nameMap: Record<string, string> = {};
        [...(students || []), ...(teachers || [])].forEach((u: any) => {
            nameMap[u.id] = `${u.first_name} ${u.last_name}`;
        });

        setCopies(parts.map((p: any): StudentCopy => {
            const ans = p.answers || {};
            // Auto-compute grades for QCM/VF
            const manualGrades: Record<string, { earned: number; note: string }> = p.manual_grades || {};
            return {
                id: p.id, student_id: p.student_id,
                studentName: nameMap[p.student_id] || 'Étudiant',
                answers: ans, status: p.status, score: p.score,
                submitted_at: p.submitted_at,
                manualGrades,
                totalScore: computeTotal(p, questions, manualGrades),
            };
        }));
        setLoading(false);
    }, [session.id, questions]);

    useEffect(() => { load(); }, [load]);

    // ── Compute total score out of 20 ─────────────────────
    function computeTotal(p: any, qs: ExamQuestion[], manualG: Record<string, { earned: number; note: string }>) {
        let earned = 0;
        let total = 0;
        qs.forEach(q => {
            total += q.points;
            const ans = (p.answers || {})[q.id];
            if (q.type === 'qcm' && ans === q.correct) earned += q.points;
            else if (q.type === 'vrai_faux' && ans === q.correct) earned += q.points;
            else if (manualG[q.id]) earned += manualG[q.id].earned;
        });
        if (total === 0) return null;
        return Math.round((earned / total) * 20 * 100) / 100;
    }

    // ── Set manual grade for a question ───────────────────
    const setManualGrade = (qId: string, earned: number, note = '') => {
        if (!selectedCopy) return;
        const updated: Record<string, { earned: number; note: string }> = {
            ...selectedCopy.manualGrades,
            [qId]: { earned: Math.max(0, Math.min(questions.find(q => q.id === qId)?.points || 0, earned)), note }
        };
        const newTotal = computeTotal(selectedCopy, questions, updated);
        setSelectedCopy(prev => prev ? { ...prev, manualGrades: updated, totalScore: newTotal ?? undefined } : null);
    };

    // ── Save grades ────────────────────────────────────────
    const saveGrades = async () => {
        if (!selectedCopy) return;
        setSaving(true);
        const finalScore = selectedCopy.totalScore;
        await supabase.from('exam_participants').update({
            manual_grades: selectedCopy.manualGrades,
            score: finalScore,
        }).eq('id', selectedCopy.id);

        // Update student's grade record (optional: could also update student_profiles grade_points)
        setCopies(prev => prev.map(c =>
            c.id === selectedCopy.id ? { ...c, ...selectedCopy } : c
        ));
        setSaving(false);
        toast.success(`Note de ${selectedCopy.studentName} sauvegardée : ${finalScore?.toFixed(1)}/20 ✅`);
    };

    const openCopy = (copy: StudentCopy, idx: number) => {
        setSelectedCopy({ ...copy });
        setCopyIndex(idx);
        setView('correct');
    };

    const navCopy = (dir: 'prev' | 'next') => {
        const newIdx = dir === 'prev' ? copyIndex - 1 : copyIndex + 1;
        if (newIdx < 0 || newIdx >= copies.length) return;
        openCopy({ ...copies[newIdx] }, newIdx);
    };

    const needsManual = (copy: StudentCopy) =>
        manualQuestions.some(q => !copy.manualGrades[q.id]);

    // ── Score color ────────────────────────────────────────
    const scoreColor = (s?: number | null) => {
        if (s === undefined || s === null) return 'text-slate-400';
        if (s >= 16) return 'text-emerald-400';
        if (s >= 10) return 'text-blue-400';
        if (s >= 7) return 'text-amber-400';
        return 'text-red-400';
    };

    // ── CORRECTION VIEW ────────────────────────────────────
    if (view === 'correct' && selectedCopy) {
        return (
            <div className="flex flex-col h-full bg-[#0B0E14] text-white overflow-hidden">
                {/* Header */}
                <div className="shrink-0 px-4 py-3 border-b border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <button onClick={() => { setView('list'); setSelectedCopy(null); load(); }}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                            <ChevronLeft className="w-4.5 h-4.5" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-slate-500">Correction · {copyIndex + 1}/{copies.length}</p>
                            <p className="text-sm font-bold text-white">{selectedCopy.studentName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => navCopy('prev')} disabled={copyIndex === 0}
                                className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-white/10 text-slate-400 transition-all">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={() => navCopy('next')} disabled={copyIndex === copies.length - 1}
                                className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-white/10 text-slate-400 transition-all">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    {/* Score preview */}
                    <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
                        <span className="text-xs text-slate-400">Note calculée :</span>
                        <span className={cn("text-xl font-black", scoreColor(selectedCopy.totalScore))}>
                            {selectedCopy.totalScore !== undefined && selectedCopy.totalScore !== null
                                ? `${selectedCopy.totalScore.toFixed(1)}/20`
                                : '— /20'}
                        </span>
                        <button onClick={saveGrades} disabled={saving}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-xs font-bold text-white transition-all">
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Sauvegarder
                        </button>
                    </div>
                </div>

                {/* Questions */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
                    {questions.map((q, qi) => {
                        const ans = selectedCopy.answers[q.id];
                        const isAuto = q.type === 'qcm' || q.type === 'vrai_faux';
                        const autoCorrect = isAuto && ans === q.correct;
                        const grade = selectedCopy.manualGrades[q.id];

                        let ansDisplay = '—';
                        if (q.type === 'qcm') ansDisplay = ans !== undefined ? (q.options?.[ans] || `Option ${ans + 1}`) : '—';
                        else if (q.type === 'vrai_faux') ansDisplay = ans === true ? 'Vrai' : ans === false ? 'Faux' : '—';
                        else if (q.type === 'redaction') ansDisplay = ans || '—';
                        else if (q.type === 'texte_a_trou') ansDisplay = Array.isArray(ans) ? ans.join(' | ') : '—';

                        const typeColors: Record<string, string> = {
                            qcm: 'border-blue-500/20', vrai_faux: 'border-emerald-500/20',
                            redaction: 'border-amber-500/20', texte_a_trou: 'border-violet-500/20',
                        };

                        return (
                            <div key={q.id} className={cn(
                                "rounded-2xl border p-4 space-y-3 transition-all",
                                typeColors[q.type],
                                isAuto && autoCorrect ? 'bg-emerald-900/10' :
                                    isAuto && !autoCorrect ? 'bg-red-900/10' : 'bg-white/[0.03]'
                            )}>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                                            Q{qi + 1} · {q.type.replace('_', '/')} · {q.points} pt{q.points > 1 ? 's' : ''}
                                        </p>
                                        <p className="text-sm text-white leading-relaxed">{q.text}</p>
                                    </div>
                                    {isAuto && (
                                        autoCorrect
                                            ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-1" />
                                            : <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-1" />
                                    )}
                                </div>

                                {/* Student answer */}
                                <div className="bg-white/5 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-500 mb-1">Réponse de l'étudiant :</p>
                                    <p className={cn("text-sm leading-relaxed break-words",
                                        isAuto ? (autoCorrect ? 'text-emerald-300' : 'text-red-300') : 'text-white')}>
                                        {ansDisplay}
                                    </p>
                                </div>

                                {/* Correct answer for auto types */}
                                {isAuto && (
                                    <div className="bg-emerald-900/20 rounded-xl px-3 py-2">
                                        <p className="text-[10px] text-emerald-400 font-semibold">
                                            ✓ Bonne réponse :&nbsp;
                                            {q.type === 'qcm' ? (q.options?.[q.correct as number] || `Option ${(q.correct as number) + 1}`) :
                                                q.type === 'vrai_faux' ? (q.correct ? 'Vrai' : 'Faux') : ''}
                                        </p>
                                    </div>
                                )}

                                {/* Manual grading for redaction/trous */}
                                {!isAuto && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] text-slate-400 font-semibold">Note attribuée :</p>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                {Array.from({ length: q.points + 1 }).map((_, pi) => (
                                                    <button key={pi}
                                                        onClick={() => setManualGrade(q.id, pi, grade?.note || '')}
                                                        className={cn(
                                                            "w-8 h-8 rounded-lg text-xs font-bold transition-all border",
                                                            grade?.earned === pi
                                                                ? 'bg-amber-500 border-amber-400 text-white'
                                                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                                                        )}>
                                                        {pi}
                                                    </button>
                                                ))}
                                                <span className="text-xs text-slate-500">/ {q.points}</span>
                                            </div>
                                        </div>
                                        <input
                                            placeholder="Commentaire de correction (optionnel)"
                                            value={grade?.note || ''}
                                            onChange={e => setManualGrade(q.id, grade?.earned || 0, e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/40"
                                        />
                                    </div>
                                )}

                                {/* Points earned display */}
                                <div className="flex justify-end">
                                    <span className={cn("text-xs font-bold",
                                        isAuto ? (autoCorrect ? 'text-emerald-400' : 'text-red-400') :
                                            grade ? 'text-amber-400' : 'text-slate-500')}>
                                        {isAuto ? (autoCorrect ? `+${q.points}` : '0') :
                                            grade !== undefined ? `+${grade.earned}` : 'Non noté'} / {q.points} pt{q.points > 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ── LIST VIEW ──────────────────────────────────────────
    const gradedCount = copies.filter(c => c.totalScore !== undefined && c.totalScore !== null).length;
    const avgScore = copies.filter(c => c.totalScore != null).reduce((a, c) => a + c.totalScore!, 0) / (gradedCount || 1);

    return (
        <div className="flex flex-col h-full bg-[#0B0E14] text-white overflow-hidden">
            <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/5">
                <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                    <ChevronLeft className="w-4.5 h-4.5" />
                </button>
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-500">Correction des copies</p>
                    <p className="text-sm font-bold text-white truncate">{paper.title}</p>
                </div>
            </div>

            {/* Stats bar */}
            {copies.length > 0 && (
                <div className="shrink-0 grid grid-cols-3 gap-2 px-4 py-3 border-b border-white/5">
                    <div className="bg-white/[0.04] rounded-xl p-2 text-center">
                        <p className="text-base font-black text-white">{copies.length}</p>
                        <p className="text-[9px] text-slate-500">Copies</p>
                    </div>
                    <div className="bg-white/[0.04] rounded-xl p-2 text-center">
                        <p className="text-base font-black text-emerald-400">{gradedCount}</p>
                        <p className="text-[9px] text-slate-500">Notées</p>
                    </div>
                    <div className="bg-white/[0.04] rounded-xl p-2 text-center">
                        <p className={cn("text-base font-black", scoreColor(gradedCount > 0 ? avgScore : undefined))}>
                            {gradedCount > 0 ? avgScore.toFixed(1) : '—'}
                        </p>
                        <p className="text-[9px] text-slate-500">Moyenne/20</p>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-24">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                    </div>
                ) : copies.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 text-sm">
                        <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        Aucune copie soumise à corriger
                    </div>
                ) : (
                    copies.map((copy, idx) => {
                        const needsCorrection = needsManual(copy) && copy.status === 'submitted';
                        return (
                            <motion.button
                                key={copy.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => openCopy(copy, idx)}
                                className="w-full flex items-center gap-3 bg-white/[0.04] border border-white/[0.07] hover:border-violet-500/30 rounded-xl px-3 py-3 transition-all text-left">
                                <div className="w-9 h-9 rounded-xl bg-violet-900/30 flex items-center justify-center shrink-0 text-sm font-black text-violet-300">
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white">{copy.studentName}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {copy.submitted_at && (
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <Clock className="w-2.5 h-2.5" />
                                                {new Date(copy.submitted_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                        {needsCorrection && (
                                            <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full">
                                                À corriger
                                            </span>
                                        )}
                                        {copy.status === 'failed' && (
                                            <span className="text-[9px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-full">
                                                Éliminé
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className={cn("text-lg font-black", scoreColor(copy.totalScore))}>
                                        {copy.totalScore !== undefined && copy.totalScore !== null
                                            ? `${copy.totalScore.toFixed(1)}`
                                            : '—'}
                                    </p>
                                    <p className="text-[9px] text-slate-500">/20</p>
                                </div>
                                <Pencil className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            </motion.button>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function scoreColor(s?: number | null): string {
    if (s === undefined || s === null) return 'text-slate-400';
    if (s >= 16) return 'text-emerald-400';
    if (s >= 10) return 'text-blue-400';
    if (s >= 7) return 'text-amber-400';
    return 'text-red-400';
}
