'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, Users, Clock, CheckCircle2, AlertCircle, Shield, Loader2,
    Play, Square, BarChart3, FileText, Bell, BellRing, UserCheck, UserX,
    RefreshCw, Eye, Timer
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ExamSession } from './exam-room-view';

// ════════════════════════════════════════════════════════════
// EXAM SESSION MANAGER — Interface Professeur/Admin (Surveillant)
// ════════════════════════════════════════════════════════════

interface Participant {
    id: string;
    student_id: string;
    status: 'waiting' | 'active' | 'submitted' | 'failed' | 'left_with_permission';
    joined_at: string;
    submitted_at?: string;
    score?: number;
    studentName?: string;
    avatarUrl?: string;
}

interface PermissionRequest {
    id: string;
    student_id: string;
    student_name?: string;
    reason?: string;
    requested_at: string;
    status: 'pending' | 'granted' | 'denied';
    extra_time_minutes?: number;
}

interface ExamSessionManagerProps {
    session: ExamSession;
    orgId: string;
    userId: string;
    userName: string;
    onBack: () => void;
    onEnd: () => void;
}

export function ExamSessionManager({ session, orgId, userId, userName, onBack, onEnd }: ExamSessionManagerProps) {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [permRequests, setPermRequests] = useState<PermissionRequest[]>([]);
    const [sessionStatus, setSessionStatus] = useState(session.status);
    const [elapsed, setElapsed] = useState(0);
    const [loading, setLoading] = useState(true);
    const [ending, setEnding] = useState(false);
    const [tab, setTab] = useState<'participants' | 'requests'>('participants');

    const duration = session.paper?.duration_minutes || 60;
    const remaining = Math.max(0, duration * 60 - elapsed);
    const remainingMin = Math.floor(remaining / 60);
    const remainingSec = remaining % 60;

    // ── Load participants ──────────────────────────────────
    const loadParticipants = useCallback(async () => {
        const { data } = await supabase.from('exam_participants')
            .select('*').eq('session_id', session.id).order('joined_at');
        if (!data) return;

        // Resolve names
        const ids = data.map((p: any) => p.student_id);
        const { data: students } = await supabase.from('student_profiles')
            .select('id, first_name, last_name, photo_url').in('id', ids);
        const { data: teachers } = await supabase.from('teacher_profiles')
            .select('id, first_name, last_name, photo_url').in('id', ids);
        const nameMap: Record<string, { name: string; avatar?: string }> = {};
        [...(students || []), ...(teachers || [])].forEach((u: any) => {
            nameMap[u.id] = { name: `${u.first_name} ${u.last_name}`, avatar: u.photo_url };
        });

        setParticipants(data.map((p: any) => ({
            ...p,
            studentName: nameMap[p.student_id]?.name || 'Étudiant',
            avatarUrl: nameMap[p.student_id]?.avatar,
        })));
        setLoading(false);
    }, [session.id]);

    const loadPermRequests = useCallback(async () => {
        const { data } = await supabase.from('exam_permission_requests')
            .select('*').eq('session_id', session.id).order('requested_at', { ascending: false });
        setPermRequests(data || []);
    }, [session.id]);

    useEffect(() => {
        loadParticipants();
        loadPermRequests();
    }, [loadParticipants, loadPermRequests]);

    // ── Timer ──────────────────────────────────────────────
    useEffect(() => {
        if (sessionStatus !== 'active') return;
        const startTime = session.started_at ? new Date(session.started_at).getTime() : Date.now();
        const interval = setInterval(() => {
            const now = Date.now();
            const secs = Math.floor((now - startTime) / 1000);
            setElapsed(secs);
            if (secs >= duration * 60) {
                endSession();
                clearInterval(interval);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [sessionStatus, session.started_at, duration]);

    // ── Realtime subscriptions ─────────────────────────────
    useEffect(() => {
        const ch = supabase.channel(`session_mgr_${session.id}`)
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'exam_participants',
                filter: `session_id=eq.${session.id}`
            }, () => loadParticipants())
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'exam_permission_requests',
                filter: `session_id=eq.${session.id}`
            }, (payload) => {
                loadPermRequests();
                if (payload.eventType === 'INSERT') {
                    toast(`🚨 Demande de sortie : ${(payload.new as any).student_name || 'Un étudiant'}`, { duration: 8000 });
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [session.id, loadParticipants, loadPermRequests]);

    // ── Actions ────────────────────────────────────────────
    const startSession = async () => {
        await supabase.from('exam_sessions').update({
            status: 'active',
            started_at: new Date().toISOString()
        }).eq('id', session.id);
        setSessionStatus('active');
        toast.success('Épreuve lancée ! Les chronomètres démarrent. ⏱️');
    };

    const endSession = async () => {
        if (ending) return;
        setEnding(true);
        await supabase.from('exam_sessions').update({
            status: 'ended',
            ended_at: new Date().toISOString()
        }).eq('id', session.id);
        // Mark non-submitted participants as failed
        await supabase.from('exam_participants')
            .update({ status: 'failed', left_at: new Date().toISOString() })
            .eq('session_id', session.id)
            .in('status', ['waiting', 'active']);
        toast.success('Épreuve terminée. Génération du rapport...');
        onEnd();
    };

    const grantPermission = async (req: PermissionRequest, extraTime = 5) => {
        await supabase.from('exam_permission_requests').update({
            status: 'granted',
            granted_by: userId,
            granted_at: new Date().toISOString(),
            extra_time_minutes: extraTime,
        }).eq('id', req.id);
        await supabase.from('exam_participants').update({
            status: 'left_with_permission',
        }).eq('session_id', session.id).eq('student_id', req.student_id);
        toast.success(`Permission accordée à ${req.student_name} (+${extraTime} min)`);
    };

    const denyPermission = async (req: PermissionRequest) => {
        await supabase.from('exam_permission_requests').update({ status: 'denied' }).eq('id', req.id);
        toast.success('Permission refusée');
    };

    // ── Stats ──────────────────────────────────────────────
    const counts = {
        total: participants.length,
        active: participants.filter(p => p.status === 'active').length,
        submitted: participants.filter(p => p.status === 'submitted').length,
        waiting: participants.filter(p => p.status === 'waiting').length,
        failed: participants.filter(p => p.status === 'failed').length,
    };
    const pendingRequests = permRequests.filter(r => r.status === 'pending');

    const statusColor: Record<string, string> = {
        waiting: 'text-amber-400 bg-amber-400/10',
        active: 'text-emerald-400 bg-emerald-400/10',
        submitted: 'text-blue-400 bg-blue-400/10',
        failed: 'text-red-400 bg-red-400/10',
        left_with_permission: 'text-violet-400 bg-violet-400/10',
    };
    const statusLabel: Record<string, string> = {
        waiting: 'En attente', active: 'En cours', submitted: 'Soumis',
        failed: 'Éliminé', left_with_permission: 'Permission'
    };

    return (
        <div className="flex flex-col h-full bg-[#0B0E14] text-white overflow-hidden">
            {/* Header */}
            <div className="shrink-0 px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-3 mb-3">
                    <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                        <ChevronLeft className="w-4.5 h-4.5" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-slate-500">Surveillant · {userName}</p>
                        <p className="text-sm font-bold text-white truncate">{session.paper?.title}</p>
                    </div>
                    {/* Timer display */}
                    <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm font-bold",
                        remaining < 300 ? 'bg-red-500/20 text-red-400 animate-pulse' :
                            remaining < 600 ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white')}>
                        <Timer className="w-3.5 h-3.5" />
                        {String(remainingMin).padStart(2, '0')}:{String(remainingSec).padStart(2, '0')}
                    </div>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                    {[
                        { label: 'Total', val: counts.total, color: 'text-white' },
                        { label: 'En cours', val: counts.active, color: 'text-emerald-400' },
                        { label: 'Soumis', val: counts.submitted, color: 'text-blue-400' },
                        { label: 'Élim.', val: counts.failed, color: 'text-red-400' },
                    ].map(s => (
                        <div key={s.label} className="bg-white/[0.04] rounded-xl p-2 text-center">
                            <p className={cn("text-base font-black", s.color)}>{s.val}</p>
                            <p className="text-[10px] text-slate-500">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Control buttons */}
                <div className="flex gap-2">
                    {sessionStatus === 'waiting' && (
                        <button onClick={startSession}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-bold text-white transition-all">
                            <Play className="w-4 h-4" /> Démarrer l'épreuve
                        </button>
                    )}
                    {sessionStatus === 'active' && (
                        <button onClick={endSession} disabled={ending}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-bold text-white transition-all">
                            {ending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                            Terminer l'épreuve
                        </button>
                    )}
                    <button onClick={() => { loadParticipants(); loadPermRequests(); }}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 transition-all">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="shrink-0 flex border-b border-white/5 px-4">
                <button onClick={() => setTab('participants')}
                    className={cn("py-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5",
                        tab === 'participants' ? 'border-violet-500 text-white' : 'border-transparent text-slate-500')}>
                    <Users className="w-3.5 h-3.5" /> Participants ({counts.total})
                </button>
                <button onClick={() => setTab('requests')}
                    className={cn("py-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5",
                        tab === 'requests' ? 'border-violet-500 text-white' : 'border-transparent text-slate-500')}>
                    {pendingRequests.length > 0 && (
                        <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center animate-pulse">
                            {pendingRequests.length}
                        </span>
                    )}
                    Demandes ({permRequests.length})
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-24">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                    </div>
                ) : tab === 'participants' ? (
                    participants.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 text-sm">
                            Aucun étudiant en salle pour l'instant…
                        </div>
                    ) : (
                        participants.map(p => (
                            <motion.div key={p.id}
                                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5">
                                <div className="w-8 h-8 rounded-full bg-violet-900/40 flex items-center justify-center shrink-0 text-xs font-bold text-violet-300">
                                    {(p.studentName || 'E').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">{p.studentName}</p>
                                    <p className="text-[10px] text-slate-500">
                                        Rejoint à {new Date(p.joined_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        {p.submitted_at && ` · Soumis à ${new Date(p.submitted_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                                    </p>
                                </div>
                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", statusColor[p.status])}>
                                    {statusLabel[p.status]}
                                </span>
                            </motion.div>
                        ))
                    )
                ) : (
                    permRequests.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 text-sm">
                            Aucune demande de permission
                        </div>
                    ) : (
                        permRequests.map(req => (
                            <motion.div key={req.id}
                                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                className={cn("rounded-xl p-4 border space-y-3",
                                    req.status === 'pending' ? 'border-red-500/40 bg-red-900/15' : 'border-white/10 bg-white/[0.03]')}>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            {req.status === 'pending' && <BellRing className="w-3.5 h-3.5 text-red-400 animate-pulse" />}
                                            <p className="text-sm font-bold text-white">{req.student_name || 'Étudiant'}</p>
                                        </div>
                                        {req.reason && <p className="text-xs text-slate-400 mt-0.5">"{req.reason}"</p>}
                                        <p className="text-[10px] text-slate-600 mt-1">
                                            {new Date(req.requested_at).toLocaleTimeString('fr-FR')}
                                        </p>
                                    </div>
                                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                                        req.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                            req.status === 'granted' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>
                                        {req.status === 'pending' ? 'En attente' : req.status === 'granted' ? `Accordé +${req.extra_time_minutes}min` : 'Refusé'}
                                    </span>
                                </div>
                                {req.status === 'pending' && (
                                    <div className="flex gap-2">
                                        <button onClick={() => grantPermission(req, 5)}
                                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1">
                                            <UserCheck className="w-3.5 h-3.5" /> Accorder +5 min
                                        </button>
                                        <button onClick={() => grantPermission(req, 10)}
                                            className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1">
                                            <UserCheck className="w-3.5 h-3.5" /> +10 min
                                        </button>
                                        <button onClick={() => denyPermission(req)}
                                            className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 rounded-xl text-xs font-bold text-red-400 transition-all flex items-center gap-1">
                                            <UserX className="w-3.5 h-3.5" /> Refuser
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )
                )}
            </div>
        </div>
    );
}
