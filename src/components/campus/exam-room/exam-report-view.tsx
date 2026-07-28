'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    ChevronLeft, Download, BarChart3, Users, Clock, CheckCircle2,
    XCircle, AlertTriangle, Shield, Star, Award, Printer,
    TrendingUp, FileText, User, Timer, MessageSquare, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { ExamSession, ExamQuestion } from './exam-room-view';

// ════════════════════════════════════════════════════════════
// EXAM REPORT VIEW — Rapport auto-généré après épreuve
// ════════════════════════════════════════════════════════════

interface ReportParticipant {
    id: string;
    student_id: string;
    studentName: string;
    status: string;
    score?: number;
    submitted_at?: string;
    joined_at: string;
    left_at?: string;
    answers: Record<string, any>;
    permissionGranted?: boolean;
    permissionReason?: string;
    extraTime?: number;
}

interface ExamReportViewProps {
    session: ExamSession;
    onBack: () => void;
}

export function ExamReportView({ session, onBack }: ExamReportViewProps) {
    const [participants, setParticipants] = useState<ReportParticipant[]>([]);
    const [permRequests, setPermRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const paper = session.paper!;
    const questions = paper.questions || [];

    const load = useCallback(async () => {
        setLoading(true);
        // Load participants
        const { data: parts } = await supabase.from('exam_participants')
            .select('*').eq('session_id', session.id).order('submitted_at', { ascending: true, nullsFirst: false });

        // Load permission requests
        const { data: perms } = await supabase.from('exam_permission_requests')
            .select('*').eq('session_id', session.id);

        if (!parts) { setLoading(false); return; }

        // Resolve names
        const ids = parts.map((p: any) => p.student_id);
        const { data: students } = await supabase.from('student_profiles')
            .select('id, first_name, last_name').in('id', ids);
        const { data: teachers } = await supabase.from('teacher_profiles')
            .select('id, first_name, last_name').in('id', ids);
        const nameMap: Record<string, string> = {};
        [...(students || []), ...(teachers || [])].forEach((u: any) => {
            nameMap[u.id] = `${u.first_name} ${u.last_name}`;
        });

        const permsMap: Record<string, any> = {};
        (perms || []).forEach((p: any) => { permsMap[p.student_id] = p; });

        setParticipants(parts.map((p: any) => ({
            ...p,
            studentName: nameMap[p.student_id] || 'Étudiant',
            answers: p.answers || {},
            permissionGranted: permsMap[p.student_id]?.status === 'granted',
            permissionReason: permsMap[p.student_id]?.reason,
            extraTime: permsMap[p.student_id]?.extra_time_minutes || 0,
        })));
        setPermRequests(perms || []);
        setLoading(false);
    }, [session.id]);

    useEffect(() => { load(); }, [load]);

    // ── Stats ──────────────────────────────────────────────
    const submitted = participants.filter(p => p.status === 'submitted');
    const failed = participants.filter(p => p.status === 'failed');
    const scores = submitted.filter(p => p.score !== undefined && p.score !== null).map(p => p.score!);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const passCount = scores.filter(s => s >= 10).length;

    const totalDuration = (p: ReportParticipant) => {
        if (!p.submitted_at) return '—';
        const start = new Date(session.started_at || p.joined_at).getTime();
        const end = new Date(p.submitted_at).getTime();
        const mins = Math.floor((end - start) / 60000);
        return `${mins} min`;
    };

    // Auto-grade QCM/VF
    const autoGrade = (p: ReportParticipant) => {
        let auto = 0, total = 0;
        questions.forEach(q => {
            if (q.type === 'qcm' || q.type === 'vrai_faux') {
                total += q.points;
                if (p.answers[q.id] === q.correct) auto += q.points;
            }
        });
        return { auto, total };
    };

    const printReport = () => {
        const content = printRef.current?.innerHTML;
        if (!content) return;
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`<html><head><title>Rapport — ${paper.title}</title>
        <style>
            body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; padding: 20mm; }
            h1 { font-size: 14pt; } h2 { font-size: 11pt; margin-top: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 9pt; }
            th { background: #333; color: white; padding: 4px 8px; text-align: left; }
            td { padding: 4px 8px; border-bottom: 1px solid #ddd; }
            .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 8pt; font-weight: bold; }
            .pass { background: #d4edda; color: #155724; }
            .fail { background: #f8d7da; color: #721c24; }
        </style></head><body>${content}</body></html>`);
        win.document.close();
        win.print();
    };

    return (
        <div className="flex flex-col h-full bg-[#0B0E14] text-white overflow-hidden">
            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/5">
                <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                    <ChevronLeft className="w-4.5 h-4.5" />
                </button>
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-500">Rapport d'épreuve</p>
                    <p className="text-sm font-bold text-white truncate">{paper.title}</p>
                </div>
                <button onClick={printReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs text-slate-300 transition-all">
                    <Printer className="w-3.5 h-3.5" /> Imprimer
                </button>
            </div>

            <div ref={printRef} className="flex-1 overflow-y-auto px-4 pb-24 space-y-4 pt-3">
                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { label: 'Participants', val: participants.length, icon: Users, color: 'text-blue-400' },
                        { label: 'Soumis', val: submitted.length, icon: CheckCircle2, color: 'text-emerald-400' },
                        { label: 'Éliminés', val: failed.length, icon: XCircle, color: 'text-red-400' },
                        { label: 'Permissions', val: permRequests.length, icon: Shield, color: 'text-violet-400' },
                    ].map(s => {
                        const Icon = s.icon;
                        return (
                            <div key={s.label} className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-3 flex items-center gap-2.5">
                                <Icon className={cn("w-5 h-5 shrink-0", s.color)} />
                                <div>
                                    <p className="text-lg font-black text-white">{s.val}</p>
                                    <p className="text-[10px] text-slate-500">{s.label}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Score summary */}
                {scores.length > 0 && (
                    <div className="bg-gradient-to-br from-violet-900/30 to-purple-900/20 border border-violet-500/20 rounded-2xl p-4 space-y-3">
                        <h3 className="text-xs font-bold text-violet-300 uppercase tracking-wider flex items-center gap-2">
                            <BarChart3 className="w-3.5 h-3.5" /> Statistiques des scores
                        </h3>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                                <p className="text-2xl font-black text-white">{avgScore.toFixed(1)}</p>
                                <p className="text-[10px] text-slate-400">Moyenne /20</p>
                            </div>
                            <div>
                                <p className="text-2xl font-black text-emerald-400">{maxScore.toFixed(1)}</p>
                                <p className="text-[10px] text-slate-400">Maximum</p>
                            </div>
                            <div>
                                <p className="text-2xl font-black text-red-400">{minScore.toFixed(1)}</p>
                                <p className="text-[10px] text-slate-400">Minimum</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                                <div className="bg-emerald-500 h-full" style={{ width: `${scores.length > 0 ? (passCount / scores.length) * 100 : 0}%` }} />
                            </div>
                            <span className="text-[11px] text-slate-400 shrink-0">
                                {passCount}/{scores.length} admis (≥10)
                            </span>
                        </div>
                    </div>
                )}

                {/* Session info */}
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-3 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-400">
                        <span>Épreuve lancée :</span>
                        <span className="text-white">{session.started_at ? new Date(session.started_at).toLocaleString('fr-FR') : '—'}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>Terminée :</span>
                        <span className="text-white">{session.ended_at ? new Date(session.ended_at).toLocaleString('fr-FR') : '—'}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>Durée épreuve :</span>
                        <span className="text-white">{paper.duration_minutes} min</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>Coefficient :</span>
                        <span className="text-white">{paper.coefficient}</span>
                    </div>
                </div>

                {/* Participants list */}
                <section>
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" /> Détail par étudiant
                    </h3>
                    <div className="space-y-2">
                        {loading ? (
                            <div className="text-center py-8 text-slate-500">Chargement…</div>
                        ) : participants.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm">Aucun participant enregistré</div>
                        ) : (
                            participants.map((p, idx) => {
                                const { auto, total: autoTotal } = autoGrade(p);
                                const isExpanded = expandedStudent === p.id;
                                const statusColor: Record<string, string> = {
                                    submitted: 'text-emerald-400 bg-emerald-400/10',
                                    failed: 'text-red-400 bg-red-400/10',
                                    waiting: 'text-amber-400 bg-amber-400/10',
                                    active: 'text-blue-400 bg-blue-400/10',
                                    left_with_permission: 'text-violet-400 bg-violet-400/10',
                                };
                                const statusLabel: Record<string, string> = {
                                    submitted: 'Soumis', failed: 'Éliminé',
                                    waiting: 'Absent', active: 'Non soumis',
                                    left_with_permission: 'Perm. accordée'
                                };
                                return (
                                    <div key={p.id} className={cn(
                                        "rounded-xl border transition-all overflow-hidden",
                                        p.status === 'failed' ? 'border-red-500/20 bg-red-900/10' : 'border-white/[0.07] bg-white/[0.03]'
                                    )}>
                                        <button
                                            onClick={() => setExpandedStudent(isExpanded ? null : p.id)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left">
                                            <div className="w-7 h-7 rounded-lg bg-violet-900/30 flex items-center justify-center shrink-0 text-xs font-black text-violet-300">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-white truncate">{p.studentName}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", statusColor[p.status])}>
                                                        {statusLabel[p.status] || p.status}
                                                    </span>
                                                    {p.score !== undefined && p.score !== null && (
                                                        <span className={cn("text-[11px] font-bold", p.score >= 10 ? 'text-emerald-400' : 'text-red-400')}>
                                                            {p.score.toFixed(1)}/20
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-slate-500">{totalDuration(p)}</span>
                                                    {p.permissionGranted && (
                                                        <Shield className="w-3 h-3 text-violet-400" title="Permission accordée" />
                                                    )}
                                                </div>
                                            </div>
                                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                                        </button>
                                        {isExpanded && (
                                            <div className="px-3 pb-3 border-t border-white/5 pt-2 space-y-2">
                                                {/* Auto-grade info */}
                                                {autoTotal > 0 && (
                                                    <div className="text-[11px] text-slate-400 bg-white/5 rounded-lg px-3 py-2">
                                                        Score auto (QCM/VF) : <strong className="text-white">{auto}/{autoTotal} pts</strong>
                                                        {questions.some(q => q.type === 'redaction' || q.type === 'texte_a_trou') &&
                                                            <span className="text-amber-400 ml-2">+ questions à corriger manuellement</span>}
                                                    </div>
                                                )}
                                                {/* Answers detail */}
                                                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                                    {questions.map((q, qi) => {
                                                        const ans = p.answers[q.id];
                                                        let display = '—';
                                                        let isCorrect: boolean | null = null;
                                                        if (q.type === 'qcm') {
                                                            display = ans !== undefined ? (q.options?.[ans] || `Option ${ans + 1}`) : '—';
                                                            isCorrect = ans === q.correct;
                                                        } else if (q.type === 'vrai_faux') {
                                                            display = ans === true ? 'Vrai' : ans === false ? 'Faux' : '—';
                                                            isCorrect = ans === q.correct;
                                                        } else if (q.type === 'redaction') {
                                                            display = ans || '—';
                                                        } else if (q.type === 'texte_a_trou') {
                                                            display = Array.isArray(ans) ? ans.join(' / ') : '—';
                                                        }
                                                        return (
                                                            <div key={q.id} className="flex gap-2 text-[11px] border-b border-white/5 pb-1">
                                                                <span className="text-slate-500 shrink-0 w-4">Q{qi + 1}</span>
                                                                <span className="flex-1 text-slate-300 break-words">{display}</span>
                                                                {isCorrect !== null && (
                                                                    isCorrect
                                                                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                                        : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {p.permissionGranted && (
                                                    <div className="text-[11px] text-violet-300 bg-violet-900/20 px-2.5 py-1.5 rounded-lg flex items-center gap-2">
                                                        <Shield className="w-3 h-3" />
                                                        Permission accordée · {p.extraTime} min · "{p.permissionReason}"
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>

                {/* Permission requests */}
                {permRequests.length > 0 && (
                    <section>
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <MessageSquare className="w-3.5 h-3.5" /> Demandes de permission ({permRequests.length})
                        </h3>
                        <div className="space-y-1.5">
                            {permRequests.map(r => (
                                <div key={r.id} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs">
                                    <Shield className={cn("w-3.5 h-3.5 shrink-0",
                                        r.status === 'granted' ? 'text-emerald-400' : 'text-red-400')} />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-white">{r.student_name}</p>
                                        <p className="text-slate-500">{r.reason || 'Pas de motif'}</p>
                                    </div>
                                    <span className={cn("px-2 py-0.5 rounded-full font-bold text-[10px]",
                                        r.status === 'granted' ? 'bg-emerald-500/20 text-emerald-400' :
                                            r.status === 'denied' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400')}>
                                        {r.status === 'granted' ? `Accordé +${r.extra_time_minutes}min` :
                                            r.status === 'denied' ? 'Refusé' : 'En attente'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
