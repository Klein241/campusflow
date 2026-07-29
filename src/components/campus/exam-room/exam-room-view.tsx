'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ClipboardCheck, Plus, FileText, Play, Eye, Archive, Trash2, Settings,
    ChevronLeft, Clock, Users, BookOpen, Star, Download, Search, Filter,
    GraduationCap, PenTool, BarChart3, Loader2, AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ExamBuilder } from './exam-builder';
import { ExamSessionManager } from './exam-session-manager';
import { ExamStudentView } from './exam-student-view';
import { ExamReportView } from './exam-report-view';
import { ExamGradingView } from './exam-grading-view';
import { PdfExamBuilder } from './pdf-exam-builder';

// ════════════════════════════════════════════════════════════
// EXAM ROOM VIEW — Container principal Salle d'Évaluation
// ════════════════════════════════════════════════════════════

export interface ExamQuestion {
    id: string;
    type: 'qcm' | 'vrai_faux' | 'redaction' | 'texte_a_trou';
    points: number;
    text: string;
    options?: string[];       // Pour QCM
    correct?: number | boolean | string; // QCM (index), Vrai/Faux (bool), or barème/réponse (string)
    lines?: number;            // Pour Rédaction
    blanks?: string[];         // Pour Texte à trou
    studentAnswer?: any;
}

export interface ExamPaper {
    id: string;
    org_id: string;
    created_by: string;
    title: string;
    subject?: string;
    coefficient: number;
    duration_minutes: number;
    instructions?: string;
    questions: ExamQuestion[];
    status: 'draft' | 'published' | 'archived';
    created_at: string;
    updated_at: string;
    creatorName?: string;
    // PDF interactive mode
    pdf_url?: string;
    pdf_annotations?: any[];
    exam_mode?: 'structured' | 'pdf';
}

export interface ExamSession {
    id: string;
    exam_paper_id: string;
    org_id: string;
    launched_by: string;
    supervisor_id?: string;
    participant_ids: string[];
    status: 'waiting' | 'active' | 'ended';
    started_at?: string;
    ended_at?: string;
    created_at: string;
    paper?: ExamPaper;
}

interface ExamRoomViewProps {
    orgId: string;
    orgSlug: string;
    userId: string;
    userName: string;
    userRole: string;
}

type ViewMode = 'list' | 'builder' | 'pdf_builder' | 'session' | 'student' | 'report' | 'grading';

export function ExamRoomView({ orgId, orgSlug, userId, userName, userRole }: ExamRoomViewProps) {
    const [view, setView] = useState<ViewMode>('list');
    const [papers, setPapers] = useState<ExamPaper[]>([]);
    const [activeSessions, setActiveSessions] = useState<ExamSession[]>([]);
    const [endedSessions, setEndedSessions] = useState<ExamSession[]>([]);
    const [selectedPaper, setSelectedPaper] = useState<ExamPaper | null>(null);
    const [selectedSession, setSelectedSession] = useState<ExamSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQ, setSearchQ] = useState('');

    const isProf = userRole === 'teacher' || userRole === 'admin' || userRole === 'owner';

    // ── Load data ──────────────────────────────────────────
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Load exam papers
            const { data: papersData } = await supabase
                .from('exam_papers').select('*')
                .eq('org_id', orgId)
                .order('created_at', { ascending: false });

            // Load active/waiting sessions
            const { data: sessionsData } = await supabase
                .from('exam_sessions').select(`*, exam_papers(*)`)
                .eq('org_id', orgId)
                .in('status', ['waiting', 'active'])
                .order('created_at', { ascending: false });

            // Resolve creator names
            if (papersData && papersData.length > 0) {
                const creatorIds = [...new Set(papersData.map((p: any) => p.created_by))];
                const { data: teachers } = await supabase.from('teacher_profiles')
                    .select('id, first_name, last_name').in('id', creatorIds);
                const { data: students } = await supabase.from('student_profiles')
                    .select('id, first_name, last_name').in('id', creatorIds);
                const nameMap: Record<string, string> = {};
                [...(teachers || []), ...(students || [])].forEach((u: any) => {
                    nameMap[u.id] = `${u.first_name} ${u.last_name}`;
                });
                setPapers(papersData.map((p: any) => ({
                    ...p,
                    questions: p.questions || [],
                    creatorName: nameMap[p.created_by] || 'Membre'
                })));
            } else {
                setPapers([]);
            }

            if (sessionsData) {
                setActiveSessions(sessionsData.map((s: any) => ({ ...s, paper: s.exam_papers })));
            }

            // Load ended sessions for grading
            const { data: endedData } = await supabase
                .from('exam_sessions').select(`*, exam_papers(*)`)
                .eq('org_id', orgId)
                .eq('status', 'ended')
                .order('ended_at', { ascending: false })
                .limit(20);
            if (endedData) {
                setEndedSessions(endedData.map((s: any) => ({ ...s, paper: s.exam_papers })));
            }
        } catch (e) {
            console.error('[ExamRoom] Load error:', e);
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Realtime : active session notifications ────────────
    useEffect(() => {
        const channel = supabase.channel(`exam_room_${orgId}`)
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'exam_sessions',
                filter: `org_id=eq.${orgId}`
            }, () => loadData())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [orgId, loadData]);

    // ── Actions ────────────────────────────────────────────
    const deletePaper = async (id: string) => {
        if (!confirm('Supprimer cette épreuve ?')) return;
        await supabase.from('exam_papers').delete().eq('id', id);
        setPapers(prev => prev.filter(p => p.id !== id));
        toast.success('Épreuve supprimée');
    };

    const archivePaper = async (paper: ExamPaper) => {
        await supabase.from('exam_papers').update({ status: 'archived' }).eq('id', paper.id);
        setPapers(prev => prev.map(p => p.id === paper.id ? { ...p, status: 'archived' } : p));
        toast.success('Épreuve archivée');
    };

    const launchSession = async (paper: ExamPaper) => {
        const { data: session, error } = await supabase.from('exam_sessions').insert({
            exam_paper_id: paper.id,
            org_id: orgId,
            launched_by: userId,
            supervisor_id: userId,
            participant_ids: [],
            status: 'waiting',
        }).select().single();

        if (error) { toast.error('Erreur lors du lancement'); return; }
        await supabase.from('exam_papers').update({ status: 'published' }).eq('id', paper.id);
        setSelectedSession({ ...session, paper });
        setView('session');
        toast.success(`Salle ouverte pour "${paper.title}" ✅`);
    };

    const joinSession = async (session: ExamSession) => {
        // Check if already enrolled
        const { data: existing } = await supabase.from('exam_participants')
            .select('id, status').eq('session_id', session.id).eq('student_id', userId).maybeSingle();

        if (existing) {
            if (existing.status === 'failed') {
                toast.error('Vous avez été éliminé de cette épreuve.');
                return;
            }
            setSelectedSession(session);
            setView('student');
            return;
        }

        // Join
        const { error } = await supabase.from('exam_participants').insert({
            session_id: session.id,
            student_id: userId,
            status: 'waiting',
            answers: {},
        });
        if (error) { toast.error('Erreur lors de la connexion à la salle'); return; }
        setSelectedSession(session);
        setView('student');
    };

    // ── Filter ─────────────────────────────────────────────
    const filtered = papers.filter(p =>
        p.title.toLowerCase().includes(searchQ.toLowerCase()) ||
        (p.subject || '').toLowerCase().includes(searchQ.toLowerCase())
    );
    const drafts = filtered.filter(p => p.status === 'draft');
    const published = filtered.filter(p => p.status === 'published');
    const archived = filtered.filter(p => p.status === 'archived');

    const totalPoints = (p: ExamPaper) => (p.questions || []).reduce((s, q) => s + (q.points || 0), 0);

    // ── Render ─────────────────────────────────────────────
    if (view === 'builder') {
        return (
            <ExamBuilder
                orgId={orgId} userId={userId} userName={userName}
                paper={selectedPaper}
                onBack={() => { setSelectedPaper(null); setView('list'); loadData(); }}
            />
        );
    }

    if (view === 'pdf_builder') {
        return (
            <PdfExamBuilder
                orgId={orgId} userId={userId}
                paper={selectedPaper}
                onBack={() => { setSelectedPaper(null); setView('list'); }}
                onSaved={() => { setSelectedPaper(null); setView('list'); loadData(); }}
            />
        );
    }

    if (view === 'session' && selectedSession) {
        return (
            <ExamSessionManager
                session={selectedSession} orgId={orgId} userId={userId} userName={userName}
                onBack={() => { setSelectedSession(null); setView('list'); loadData(); }}
                onEnd={() => { setView('report'); }}
            />
        );
    }

    if (view === 'student' && selectedSession) {
        return (
            <ExamStudentView
                session={selectedSession} orgId={orgId} userId={userId} userName={userName}
                onEnd={() => { setSelectedSession(null); setView('list'); }}
            />
        );
    }

    if (view === 'report' && selectedSession) {
        return (
            <ExamReportView
                session={selectedSession}
                onBack={() => { setSelectedSession(null); setView('list'); loadData(); }}
            />
        );
    }

    if (view === 'grading' && selectedSession) {
        return (
            <ExamGradingView
                session={selectedSession} orgId={orgId} userId={userId}
                onBack={() => { setSelectedSession(null); setView('list'); loadData(); }}
            />
        );
    }

    // ── LIST VIEW ──────────────────────────────────────────
    return (
        <div className="flex flex-col h-full bg-[#0B0E14] text-white overflow-hidden">
            {/* Header */}
            <div className="shrink-0 px-4 pt-4 pb-3 border-b border-white/5">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-900/30">
                            <ClipboardCheck className="w-4.5 h-4.5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-white leading-tight">Salle d'Évaluation</h1>
                            <p className="text-[10px] text-slate-500">Épreuves en temps réel</p>
                        </div>
                    </div>
                    {isProf && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => { setSelectedPaper(null); setView('builder'); }}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-xs font-bold text-white transition-all"
                                title="Épreuve structurée (questions)"
                            >
                                <Plus className="w-3 h-3" /> Structurée
                            </button>
                            <button
                                onClick={() => { setSelectedPaper(null); setView('pdf_builder'); }}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-all"
                                title="Uploader un PDF interactif"
                            >
                                <Plus className="w-3 h-3" /> PDF
                            </button>
                        </div>
                    )}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input
                        type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                        placeholder="Rechercher une épreuve..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/40"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-5 pt-3">

                {/* Sessions actives */}
                {activeSessions.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                            </span>
                            <h2 className="text-xs font-bold text-red-400 uppercase tracking-wider">En cours</h2>
                        </div>
                        <div className="space-y-2">
                            {activeSessions.map(session => (
                                <motion.div
                                    key={session.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-red-900/20 border border-red-500/30 rounded-2xl p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-white text-sm truncate">{session.paper?.title || 'Épreuve'}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />{session.paper?.duration_minutes} min
                                                </span>
                                                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                                    <Users className="w-3 h-3" />{session.participant_ids?.length || 0} participants
                                                </span>
                                                <span className={cn(
                                                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                                    session.status === 'waiting' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                                                )}>
                                                    {session.status === 'waiting' ? 'Salle ouverte' : 'En cours'}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => isProf
                                                ? (() => { setSelectedSession(session); setView('session'); })()
                                                : joinSession(session)
                                            }
                                            className="shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all"
                                        >
                                            {isProf ? 'Gérer' : 'Rejoindre'}
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
                        <p className="text-slate-500 text-sm">Chargement des épreuves…</p>
                    </div>
                ) : (
                    <>
                        {/* Brouillons */}
                        {isProf && drafts.length > 0 && (
                            <PaperSection
                                title="Brouillons" papers={drafts} isProf={isProf}
                                accentColor="amber"
                                onEdit={p => { setSelectedPaper(p); setView(p.exam_mode === 'pdf' ? 'pdf_builder' : 'builder'); }}
                                onLaunch={launchSession}
                                onArchive={archivePaper}
                                onDelete={deletePaper}
                                totalPoints={totalPoints}
                            />
                        )}

                        {/* Publiées */}
                        {published.length > 0 && (
                            <PaperSection
                                title="Épreuves publiées" papers={published} isProf={isProf}
                                accentColor="emerald"
                                onEdit={p => { setSelectedPaper(p); setView(p.exam_mode === 'pdf' ? 'pdf_builder' : 'builder'); }}
                                onLaunch={launchSession}
                                onArchive={archivePaper}
                                onDelete={deletePaper}
                                totalPoints={totalPoints}
                            />
                        )}

                        {/* Archivées */}
                        {isProf && archived.length > 0 && (
                            <PaperSection
                                title="Archives" papers={archived} isProf={isProf}
                                accentColor="slate"
                                onEdit={p => { setSelectedPaper(p); setView(p.exam_mode === 'pdf' ? 'pdf_builder' : 'builder'); }}
                                onLaunch={launchSession}
                                onArchive={archivePaper}
                                onDelete={deletePaper}
                                totalPoints={totalPoints}
                            />
                        )}

                        {/* Sessions terminées — À corriger */}
                        {isProf && endedSessions.length > 0 && (
                            <section>
                                <h2 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <BarChart3 className="w-3.5 h-3.5" /> À corriger ({endedSessions.length})
                                </h2>
                                <div className="space-y-2">
                                    {endedSessions.map(sess => (
                                        <motion.div key={sess.id}
                                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                            className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-3 flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-blue-900/40 flex items-center justify-center shrink-0">
                                                <FileText className="w-4 h-4 text-blue-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white truncate">{sess.paper?.title}</p>
                                                <p className="text-[10px] text-slate-500">
                                                    Terminée le {sess.ended_at ? new Date(sess.ended_at).toLocaleDateString('fr-FR') : '—'}
                                                </p>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <button onClick={() => { setSelectedSession(sess); setView('report'); }}
                                                    className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[11px] text-slate-400 transition-all flex items-center gap-1">
                                                    <Eye className="w-3 h-3" /> Rapport
                                                </button>
                                                <button onClick={() => { setSelectedSession(sess); setView('grading'); }}
                                                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-[11px] text-white font-bold transition-all flex items-center gap-1">
                                                    <PenTool className="w-3 h-3" /> Corriger
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Empty state */}
                        {papers.length === 0 && activeSessions.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-violet-900/30 flex items-center justify-center">
                                    <ClipboardCheck className="w-8 h-8 text-violet-400" />
                                </div>
                                <div>
                                    <p className="text-slate-300 font-semibold">Aucune épreuve</p>
                                    <p className="text-slate-500 text-sm mt-1">
                                        {isProf ? 'Créez votre première épreuve pour commencer.' : 'Aucune épreuve disponible pour le moment.'}
                                    </p>
                                </div>
                                {isProf && (
                                    <div className="flex gap-2 flex-wrap justify-center">
                                        <button
                                            onClick={() => { setSelectedPaper(null); setView('builder'); }}
                                            className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2">
                                            ✏️ Épreuve structurée
                                        </button>
                                        <button
                                            onClick={() => { setSelectedPaper(null); setView('pdf_builder'); }}
                                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2">
                                            📄 Uploader un PDF
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ── Paper Section ──────────────────────────────────────────
function PaperSection({
    title, papers, isProf, accentColor, onEdit, onLaunch, onArchive, onDelete, totalPoints
}: {
    title: string; papers: ExamPaper[]; isProf: boolean; accentColor: string;
    onEdit: (p: ExamPaper) => void;
    onLaunch: (p: ExamPaper) => void;
    onArchive: (p: ExamPaper) => void;
    onDelete: (id: string) => void;
    totalPoints: (p: ExamPaper) => number;
}) {
    const colorMap: Record<string, string> = {
        amber: 'text-amber-400', emerald: 'text-emerald-400', slate: 'text-slate-400'
    };
    return (
        <section>
            <h2 className={cn("text-xs font-bold uppercase tracking-wider mb-2", colorMap[accentColor] || 'text-slate-400')}>
                {title} ({papers.length})
            </h2>
            <div className="space-y-2">
                {papers.map(paper => (
                    <motion.div
                        key={paper.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/[0.04] border border-white/[0.07] hover:border-violet-500/30 rounded-2xl p-4 transition-all"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-900/30 flex items-center justify-center shrink-0">
                                <FileText className="w-4.5 h-4.5 text-violet-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-white text-sm truncate">{paper.title}</p>
                                {paper.subject && <p className="text-[11px] text-violet-300 mt-0.5">{paper.subject}</p>}
                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />{paper.duration_minutes} min
                                    </span>
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                        <Star className="w-3 h-3" />{totalPoints(paper)} pts
                                    </span>
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                        <BookOpen className="w-3 h-3" />{(paper.questions || []).length} question{(paper.questions || []).length > 1 ? 's' : ''}
                                    </span>
                                    <span className="text-[10px] text-slate-500">coeff. {paper.coefficient}</span>
                                </div>
                                <p className="text-[10px] text-slate-600 mt-1">Par {paper.creatorName}</p>
                            </div>
                        </div>

                        {isProf && (
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                                <button onClick={() => onEdit(paper)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-[11px] text-slate-300 transition-all">
                                    <PenTool className="w-3 h-3" /> Modifier
                                </button>
                                {paper.status !== 'archived' && (
                                    <button onClick={() => onLaunch(paper)}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-[11px] text-emerald-400 font-bold transition-all">
                                        <Play className="w-3 h-3" /> Lancer
                                    </button>
                                )}
                                {paper.status !== 'archived' && (
                                    <button onClick={() => onArchive(paper)}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 text-[11px] text-slate-500 transition-all">
                                        <Archive className="w-3 h-3" /> Archiver
                                    </button>
                                )}
                                <button onClick={() => onDelete(paper.id)}
                                    className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-[11px] text-red-500/70 hover:text-red-400 transition-all">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
