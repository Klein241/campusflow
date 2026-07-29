'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, AlertTriangle, Clock, Send,
    CheckCircle2, Loader2, MessageSquare, Users, Timer,
    Lock, ShieldAlert, BookOpen, Circle, CheckSquare, Type,
    Maximize2, Minimize2, ZoomIn, ZoomOut
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ExamSession, ExamQuestion } from './exam-room-view';
import { PdfStudentViewer } from './pdf-exam-builder';
import { ExamReviewView } from './exam-review-view';

// ════════════════════════════════════════════════════════════
// EXAM STUDENT VIEW — Interface étudiant style Calameo
// Anti-quitter · Temps réel · Auto-save · Demande permission
// ════════════════════════════════════════════════════════════

interface ExamStudentViewProps {
    session: ExamSession;
    orgId: string;
    userId: string;
    userName: string;
    onEnd: () => void;
}

export function ExamStudentView({ session, orgId, userId, userName, onEnd }: ExamStudentViewProps) {
    const paper = session.paper!;
    const questions = paper.questions || [];

    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [currentPage, setCurrentPage] = useState(0); // page index
    const [elapsed, setElapsed] = useState(0);
    const [sessionStatus, setSessionStatus] = useState<'waiting' | 'active' | 'ended'>(session.status);
    const [participantStatus, setParticipantStatus] = useState<string>('waiting');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [showPermDialog, setShowPermDialog] = useState(false);
    const [showLeaveAlert, setShowLeaveAlert] = useState(false);
    const [permReason, setPermReason] = useState('');
    const [permPending, setPermPending] = useState(false);
    const [permGranted, setPermGranted] = useState(false);
    const [autoSaving, setAutoSaving] = useState(false);
    const [participantCount, setParticipantCount] = useState(0);
    const [hasFailed, setHasFailed] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const examContainerRef = useRef<HTMLDivElement>(null);

    const duration = paper.duration_minutes * 60; // total seconds
    const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const autoSaveRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const lastAutoSave = useRef<number>(Date.now());

    // ── Pages A4: 3 questions par page ────────────────────
    const QUESTIONS_PER_PAGE = 3;
    const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
    const pageQuestions = questions.slice(
        currentPage * QUESTIONS_PER_PAGE,
        (currentPage + 1) * QUESTIONS_PER_PAGE
    );

    const remaining = Math.max(0, duration - elapsed);
    const remainingMin = Math.floor(remaining / 60);
    const remainingSec = remaining % 60;
    const progress = Math.min(100, (elapsed / duration) * 100);

    // ── Load initial state ─────────────────────────────────
    useEffect(() => {
        const loadState = async () => {
            const { data: part } = await supabase.from('exam_participants')
                .select('answers, status, submitted_at')
                .eq('session_id', session.id).eq('student_id', userId).maybeSingle();
            if (part) {
                if (part.answers) setAnswers(part.answers);
                if (part.status === 'failed') { setHasFailed(true); return; }
                if (part.status === 'submitted') { setSubmitted(true); return; }
                setParticipantStatus(part.status);
            }
            // Count participants
            const { count } = await supabase.from('exam_participants')
                .select('*', { count: 'exact', head: true }).eq('session_id', session.id);
            setParticipantCount(count || 0);
        };
        loadState();
    }, [session.id, userId]);

    // ── Realtime: monitor session status & permission grants ─
    useEffect(() => {
        const ch = supabase.channel(`student_${session.id}_${userId}`)
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'exam_sessions',
                filter: `id=eq.${session.id}`
            }, (payload) => {
                const s = payload.new as any;
                setSessionStatus(s.status);
                if (s.status === 'ended') {
                    toast('⏱️ L\'épreuve est terminée. Vos réponses ont été sauvegardées.');
                    setTimeout(() => onEnd(), 3000);
                }
                if (s.status === 'active' && sessionStatus === 'waiting') {
                    toast.success('🚀 L\'épreuve commence !');
                    // Update participant to active
                    supabase.from('exam_participants')
                        .update({ status: 'active' })
                        .eq('session_id', session.id).eq('student_id', userId).then(() => {});
                    setParticipantStatus('active');
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'exam_permission_requests',
                filter: `session_id=eq.${session.id}`
            }, (payload) => {
                const req = payload.new as any;
                if (req.student_id === userId && req.status === 'granted') {
                    setPermGranted(true);
                    setPermPending(false);
                    toast.success(`✅ Permission accordée ! +${req.extra_time_minutes} minutes`);
                } else if (req.student_id === userId && req.status === 'denied') {
                    setPermPending(false);
                    toast.error('❌ Permission refusée par le surveillant.');
                }
            })
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'exam_participants',
                filter: `session_id=eq.${session.id}`
            }, async () => {
                const { count } = await supabase.from('exam_participants')
                    .select('*', { count: 'exact', head: true }).eq('session_id', session.id);
                setParticipantCount(count || 0);
            })
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [session.id, userId, sessionStatus, onEnd]);

    // ── Timer (starts when session is active) ─────────────
    useEffect(() => {
        if (sessionStatus !== 'active' || submitted || hasFailed) return;
        const startTime = session.started_at
            ? new Date(session.started_at).getTime()
            : Date.now();

        timerRef.current = setInterval(() => {
            const secs = Math.floor((Date.now() - startTime) / 1000);
            setElapsed(secs);
            if (secs >= duration) {
                clearInterval(timerRef.current);
                handleTimeUp();
            }
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [sessionStatus, submitted, hasFailed, duration, session.started_at]);

    // ── Auto-save every 30s ────────────────────────────────
    useEffect(() => {
        if (submitted || hasFailed || sessionStatus !== 'active') return;
        autoSaveRef.current = setInterval(async () => {
            if (Date.now() - lastAutoSave.current < 25000) return;
            setAutoSaving(true);
            await supabase.from('exam_participants')
                .update({ answers })
                .eq('session_id', session.id).eq('student_id', userId);
            lastAutoSave.current = Date.now();
            setAutoSaving(false);
        }, 30000);
        return () => clearInterval(autoSaveRef.current);
    }, [answers, submitted, hasFailed, sessionStatus, session.id, userId]);

    // ── Anti-leave: intercept page unload & visibility ────
    useEffect(() => {
        if (submitted || hasFailed || sessionStatus !== 'active') return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = 'Attention : quitter la page entraîne votre élimination de l\'épreuve !';
            return e.returnValue;
        };

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'hidden' && !permGranted) {
                // Mark as failed immediately
                await supabase.from('exam_participants').update({
                    status: 'failed',
                    left_at: new Date().toISOString(),
                }).eq('session_id', session.id).eq('student_id', userId);
                setHasFailed(true);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [submitted, hasFailed, sessionStatus, permGranted, session.id, userId]);

    // ── Handlers ───────────────────────────────────────────
    const setAnswer = (qId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [qId]: value }));
    };

    const handleTimeUp = async () => {
        toast('⏱️ Temps écoulé ! Votre copie est soumise automatiquement.');
        await submitExam(true);
    };

    const submitExam = async (auto = false) => {
        if (submitting || submitted) return;
        if (!auto && !confirm('Êtes-vous sûr de vouloir soumettre votre copie ? Vous ne pourrez plus modifier vos réponses.')) return;
        setSubmitting(true);

        // ── Auto-calculate score for QCM & Vrai/Faux ──────────
        let score = 0;
        let total = 0;
        const hasManualQuestions = questions.some(q => q.type === 'redaction' || q.type === 'texte_a_trou');
        questions.forEach(q => {
            total += q.points;
            const a = answers[q.id];
            if (q.type === 'qcm' && a === q.correct) score += q.points;
            else if (q.type === 'vrai_faux' && a === q.correct) score += q.points;
            // redaction & texte_a_trou need manual grading — excluded from auto-score
        });

        const autoScore = total > 0 ? Math.round((score / total) * 20 * 100) / 100 : null;

        await supabase.from('exam_participants').update({
            answers,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            score: hasManualQuestions ? null : autoScore, // null if manual grading needed
        }).eq('session_id', session.id).eq('student_id', userId);

        // ── Sky Points reward for exam participation ───────────
        try {
            const { data: prof } = await supabase
                .from('student_profiles')
                .select('sky_points')
                .eq('id', userId)
                .maybeSingle();

            if (prof !== null) {
                // Points: 10 if ≥15/20, 5 if ≥10/20, 2 for participation
                let skyGain = 2; // participation reward
                if (!hasManualQuestions && autoScore !== null) {
                    if (autoScore >= 15) skyGain = 10;
                    else if (autoScore >= 10) skyGain = 5;
                }

                const newBalance = (prof?.sky_points || 0) + skyGain;
                await supabase.from('student_profiles')
                    .update({ sky_points: newBalance })
                    .eq('id', userId);
                await supabase.from('sky_transactions').insert({
                    user_id: userId,           // required – original column
                    student_id: userId,        // extended column
                    amount: skyGain,
                    type: 'exam_submit',       // required – original column
                    transaction_type: 'exam_submit', // extended column
                    description: `Épreuve soumise : ${paper.title} (+${skyGain} Sky ⭐)`,
                });
                // Notify sky-points badge
                window.dispatchEvent(new CustomEvent('sky_points_updated', { detail: { newBalance } }));

                if (!hasManualQuestions && autoScore !== null) {
                    toast.success(
                        `✅ Copie soumise ! Score auto : ${autoScore}/20 — +${skyGain} Sky ⭐`,
                        { duration: 4000 }
                    );
                } else {
                    toast.success(`✅ Copie soumise ! +${skyGain} Sky ⭐ (correction manuelle en attente)`, { duration: 4000 });
                }
            } else {
                toast.success('✅ Copie soumise avec succès !');
            }
        } catch {
            toast.success('✅ Copie soumise avec succès !');
        }

        setSubmitted(true);
        setSubmitting(false);
    };


    const requestPermission = async () => {
        if (permPending) return;
        setPermPending(true);
        await supabase.from('exam_permission_requests').insert({
            session_id: session.id,
            student_id: userId,
            student_name: userName,
            reason: permReason.trim() || 'Sortie temporaire',
            status: 'pending',
        });
        setShowPermDialog(false);
        setPermReason('');
        toast('📤 Demande envoyée au surveillant. Attendez sa réponse.');
    };

    const answeredCount = Object.keys(answers).length;
    const answeredPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

    // ── FAILED STATE ───────────────────────────────────────
    if (hasFailed) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-[#0B0E14] text-white px-6 text-center gap-5">
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                    <ShieldAlert className="w-10 h-10 text-red-400" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-red-400 mb-2">Épreuve invalidée</h2>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Vous avez quitté la salle d'évaluation sans autorisation.<br />
                        Votre épreuve a été invalidée automatiquement.
                    </p>
                </div>
                <button onClick={onEnd} className="px-6 py-3 bg-white/10 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/20 transition-all">
                    Retour à l'accueil
                </button>
            </div>
        );
    }

    // ── SUBMITTED STATE ── Show full review with PDF download
    if (submitted) {
        const totalPoints = questions.reduce((s, q) => s + (q.points || 0), 0);
        return (
            <ExamReviewView
                paper={paper}
                answers={answers}
                totalPoints={totalPoints}
                studentName={userName}
                onClose={onEnd}
            />
        );
    }

    // ── WAITING STATE ──────────────────────────────────────
    if (sessionStatus === 'waiting') {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-[#0B0E14] text-white px-6 text-center gap-5">
                <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <Clock className="w-10 h-10 text-amber-400 animate-pulse" />
                    </div>
                </div>
                <div>
                    <h2 className="text-xl font-black text-amber-400 mb-1">Salle ouverte</h2>
                    <p className="text-white font-bold text-base">{paper.title}</p>
                    <p className="text-slate-400 text-sm mt-1">{paper.subject}</p>
                    <p className="text-slate-500 text-xs mt-3">
                        En attente du démarrage par le surveillant…
                    </p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                        <p className="text-2xl font-black text-white">{paper.duration_minutes}</p>
                        <p className="text-[10px] text-slate-500">minutes</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-black text-white">{questions.length}</p>
                        <p className="text-[10px] text-slate-500">questions</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-black text-white">{participantCount}</p>
                        <p className="text-[10px] text-slate-500">participants</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-white/5 px-4 py-2 rounded-xl">
                    <Lock className="w-3 h-3" />
                    Une fois l'épreuve lancée, vous ne pouvez plus quitter
                </div>
            </div>
        );
    }

    // ── PDF INTERACTIVE MODE ─────────────────────────────
    if (paper.exam_mode === 'pdf' && paper.pdf_url) {
        return (
            <div className="flex flex-col h-full bg-[#1a1a2e] text-white overflow-hidden select-none">
                {/* Top bar */}
                <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-[#0d0d1a] border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-violet-400" />
                        <span className="text-xs font-semibold text-white truncate max-w-[140px]">{paper.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {autoSaving && <span className="text-[10px] text-slate-500 italic">Sauvegarde…</span>}
                        <div className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold",
                            remaining < 300 ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-slate-300'
                        )}>
                            <Timer className="w-3 h-3" />
                            {String(remainingMin).padStart(2, '0')}:{String(remainingSec).padStart(2, '0')}
                        </div>
                        <button onClick={() => submitExam(false)} disabled={submitted}
                            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded-xl text-xs font-bold text-white transition-all">
                            {submitted ? 'Soumis ✅' : 'Soumettre'}
                        </button>
                    </div>
                </div>
                {/* PDF Viewer with interactive annotations */}
                <div className="flex-1 overflow-hidden">
                    <PdfStudentViewer
                        pdfUrl={paper.pdf_url}
                        annotations={paper.pdf_annotations || []}
                        answers={answers}
                        onChange={(id, val) => setAnswers(prev => ({ ...prev, [id]: val }))}
                        readOnly={submitted || remaining <= 0}
                    />
                </div>
            </div>
        );
    }

    // ── ACTIVE EXAM VIEW (Calameo-like) ────────────────────
    return (
        <div ref={examContainerRef} className="flex flex-col h-full bg-[#1a1a2e] text-white overflow-hidden select-none">
            {/* Top bar */}
            <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-[#0d0d1a] border-b border-white/10">
                <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-xs font-semibold text-white truncate max-w-[140px]">{paper.title}</span>
                </div>
                <div className="flex items-center gap-2">
                    {autoSaving && <span className="text-[10px] text-slate-500 italic">Sauvegarde…</span>}
                    <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span className="text-[11px] text-slate-400">{participantCount}</span>
                    </div>
                    {/* Timer */}
                    <div className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs font-bold transition-all",
                        remaining < 300 ? 'bg-red-500/30 text-red-300 animate-pulse' :
                            remaining < 600 ? 'bg-amber-500/20 text-amber-300' :
                                'bg-white/5 text-white'
                    )}>
                        <Timer className="w-3 h-3" />
                        {String(remainingMin).padStart(2, '0')}:{String(remainingSec).padStart(2, '0')}
                    </div>
                    {/* Zoom controls */}
                    <button onClick={() => setZoom(z => Math.max(0.7, z - 0.1))}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all" title="Zoom -">
                        <ZoomOut className="w-3 h-3 text-slate-400" />
                    </button>
                    <button onClick={() => setZoom(z => Math.min(1.8, z + 0.1))}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all" title="Zoom +">
                        <ZoomIn className="w-3 h-3 text-slate-400" />
                    </button>
                    {/* Fullscreen */}
                    <button onClick={async () => {
                        if (!document.fullscreenElement) {
                            await examContainerRef.current?.requestFullscreen?.();
                            setIsFullscreen(true);
                        } else {
                            await document.exitFullscreen?.();
                            setIsFullscreen(false);
                        }
                    }} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all" title="Plein écran">
                        {isFullscreen ? <Minimize2 className="w-3 h-3 text-slate-400" /> : <Maximize2 className="w-3 h-3 text-slate-400" />}
                    </button>
                </div>
            </div>

            {/* Progress bar */}
            <div className="shrink-0 h-1 bg-white/5">
                <div
                    className={cn("h-full transition-all duration-1000",
                        progress > 80 ? 'bg-red-500' : progress > 60 ? 'bg-amber-500' : 'bg-violet-500')}
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Page indicator */}
            <div className="shrink-0 flex items-center justify-center gap-3 py-2 bg-[#0d0d1a] border-b border-white/5">
                <button
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-white/10 text-slate-400 transition-all">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }).map((_, i) => (
                        <button key={i} onClick={() => setCurrentPage(i)}
                            className={cn("w-6 h-6 rounded-lg text-[10px] font-bold transition-all",
                                i === currentPage ? 'bg-violet-600 text-white' : 'bg-white/5 text-slate-500 hover:bg-white/10')}>
                            {i + 1}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage === totalPages - 1}
                    className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-white/10 text-slate-400 transition-all">
                    <ChevronRight className="w-4 h-4" />
                </button>
                <span className="text-[10px] text-slate-500 ml-2">{answeredCount}/{questions.length} répondus</span>
            </div>

            {/* A4 Paper area */}
            <div className="flex-1 overflow-y-auto bg-gray-300 p-4 flex justify-center"
                style={{ fontSize: `${zoom}em` }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPage}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] shadow-2xl p-[15mm] font-serif">

                        {/* Page header */}
                        {currentPage === 0 && (
                            <>
                                <div className="text-center border-b-2 border-black pb-3 mb-4">
                                    <p className="text-[8pt] font-semibold tracking-widest uppercase text-gray-600">DOCUMENT DU CANDIDAT — ÉPREUVES COLLECTIVES</p>
                                    <h1 className="text-[15pt] font-bold uppercase mt-2">{paper.subject || ''}</h1>
                                    <h2 className="text-[12pt] font-bold mt-1">{paper.title}</h2>
                                    <p className="text-[9pt] mt-1 text-gray-600">
                                        Durée : {paper.duration_minutes} min · Coeff. {paper.coefficient}
                                    </p>
                                </div>
                                {paper.instructions && (
                                    <div className="border-l-4 border-gray-500 pl-3 italic text-[9pt] mb-5 text-gray-700 leading-relaxed">
                                        <strong>■ Consignes</strong><br />
                                        {paper.instructions}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Questions */}
                        <div className="space-y-6">
                            {pageQuestions.map((q, qi) => {
                                const globalIndex = currentPage * QUESTIONS_PER_PAGE + qi;
                                const answered = answers[q.id] !== undefined && answers[q.id] !== '';
                                return (
                                    <div key={q.id} className={cn(
                                        "border-b border-gray-200 pb-5",
                                        answered ? 'opacity-100' : 'opacity-90'
                                    )}>
                                        <div className="flex justify-between items-baseline mb-2 border-b border-gray-300 pb-1">
                                            <span className="font-bold text-[11pt]">
                                                ■ Exercice {globalIndex + 1}
                                                {answered && <span className="ml-2 text-emerald-600 text-[9pt]">✓</span>}
                                            </span>
                                            <span className="text-[9pt] text-gray-600">{q.points} pt{q.points > 1 ? 's' : ''}</span>
                                        </div>
                                        <p className="text-[11pt] mb-3 leading-relaxed">{q.text}</p>

                                        {/* QCM */}
                                        {q.type === 'qcm' && (
                                            <div className="space-y-2">
                                                {(q.options || []).map((opt, oi) => (
                                                    <label key={oi} className="flex items-center gap-2.5 cursor-pointer group">
                                                        <div onClick={() => setAnswer(q.id, oi)}
                                                            className={cn("w-4 h-4 border-2 flex items-center justify-center transition-all cursor-pointer shrink-0",
                                                                answers[q.id] === oi
                                                                    ? 'border-blue-600 bg-blue-600' : 'border-gray-500 group-hover:border-blue-400')}>
                                                            {answers[q.id] === oi && <div className="w-2 h-2 bg-white rounded-sm" />}
                                                        </div>
                                                        <span className="text-[10pt] leading-tight">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}

                                        {/* Vrai/Faux */}
                                        {q.type === 'vrai_faux' && (
                                            <div className="flex gap-8">
                                                {[{ label: 'Vrai', val: true }, { label: 'Faux', val: false }].map(({ label, val }) => (
                                                    <label key={label} className="flex items-center gap-2 cursor-pointer group">
                                                        <div onClick={() => setAnswer(q.id, val)}
                                                            className={cn("w-4 h-4 border-2 flex items-center justify-center transition-all cursor-pointer shrink-0",
                                                                answers[q.id] === val
                                                                    ? (val ? 'border-emerald-600 bg-emerald-600' : 'border-red-600 bg-red-600')
                                                                    : 'border-gray-500 group-hover:border-blue-400')}>
                                                            {answers[q.id] === val && <div className="w-2 h-2 bg-white rounded-sm" />}
                                                        </div>
                                                        <span className="text-[10pt]">{label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}

                                        {/* Rédaction */}
                                        {q.type === 'redaction' && (
                                            <div className="mt-2">
                                                <textarea
                                                    value={answers[q.id] || ''}
                                                    onChange={e => setAnswer(q.id, e.target.value)}
                                                    rows={q.lines || 4}
                                                    placeholder="Votre réponse ici..."
                                                    style={{ lineHeight: '32px', backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #ccc 31px, #ccc 32px)' }}
                                                    className="w-full resize-none text-[11pt] font-serif bg-transparent border-none focus:outline-none text-black placeholder:text-gray-300"
                                                />
                                            </div>
                                        )}

                                        {/* Texte à trou */}
                                        {q.type === 'texte_a_trou' && (
                                            <div className="mt-2 leading-loose text-[11pt]">
                                                <TextATrouInput
                                                    text={q.text}
                                                    value={answers[q.id] || []}
                                                    onChange={val => setAnswer(q.id, val)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Bottom action bar */}
            <div className="shrink-0 flex items-center gap-2 px-4 py-3 bg-[#0d0d1a] border-t border-white/10">
                <button
                    onClick={() => setShowPermDialog(true)}
                    disabled={permPending}
                    className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                        permPending ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white')}>
                    {permPending ? <><Clock className="w-3.5 h-3.5 animate-spin" /> En attente…</> : <><MessageSquare className="w-3.5 h-3.5" /> Permission</>}
                </button>
                <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${answeredPercent}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-500">{answeredPercent}%</span>
                </div>
                <button
                    onClick={() => submitExam()}
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-violet-900/30">
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Soumettre
                </button>
            </div>

            {/* Permission Dialog */}
            <AnimatePresence>
                {showPermDialog && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-20 sm:pb-4">
                        <motion.div
                            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
                            className="w-full max-w-sm bg-[#1a1d2e] border border-white/10 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">Demande de sortie temporaire</h3>
                                    <p className="text-[11px] text-slate-400">Le surveillant devra approuver votre demande</p>
                                </div>
                            </div>
                            <textarea
                                value={permReason}
                                onChange={e => setPermReason(e.target.value)}
                                placeholder="Motif (ex: urgence médicale, WC...)"
                                rows={3}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-amber-500/40"
                            />
                            <div className="flex gap-2">
                                <button onClick={() => setShowPermDialog(false)}
                                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-slate-400 transition-all">
                                    Annuler
                                </button>
                                <button onClick={requestPermission}
                                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 rounded-xl text-sm font-bold text-white transition-all">
                                    Envoyer
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Texte à trou input helper ──────────────────────────────
function TextATrouInput({ text, value, onChange }: {
    text: string; value: string[]; onChange: (v: string[]) => void;
}) {
    // Split text on sequences of 3+ dots
    const parts = text.split(/(\.{3,})/g);
    let blankIndex = 0;
    const vals = [...(value || [])];

    return (
        <span className="leading-loose">
            {parts.map((part, i) => {
                if (/\.{3,}/.test(part)) {
                    const idx = blankIndex++;
                    return (
                        <input
                            key={i}
                            type="text"
                            value={vals[idx] || ''}
                            onChange={e => {
                                const newVals = [...vals];
                                newVals[idx] = e.target.value;
                                onChange(newVals);
                            }}
                            className="border-b-2 border-gray-400 focus:border-blue-500 outline-none bg-transparent text-[11pt] font-serif text-blue-700 min-w-[80px] px-1 mx-1 text-center transition-colors"
                            style={{ width: `${Math.max(80, part.length * 7)}px` }}
                            placeholder="..."
                        />
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
}
