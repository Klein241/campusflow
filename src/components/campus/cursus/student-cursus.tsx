'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, ChevronDown, ChevronUp, Play, CheckCircle2,
    Award, Star, Timer, FileText,
    Send, X, Trophy, BarChart3, GraduationCap,
    MessageSquare, Clock, Zap, TrendingUp, Flag, Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CursusExerciseModal } from './cursus-exercise-modal';
import { RichContentRenderer } from './rich-content-renderer';
import { DiscussButton } from '../discuss-button';

interface StudentCursusProps {
    orgId: string;
    userId: string;
    userName: string;
    classroomId: string | null;
    skyPoints: number;
    onSkyUpdate: (delta: number) => void;
    onOpenGroupChat?: (convId: string, convName: string) => void;
    /** Opens a direct message with the subject teacher */
    onStartDM?: (targetId: string, targetName: string) => void;
}

export function StudentCursus({ orgId, userId, userName, classroomId, skyPoints, onSkyUpdate, onOpenGroupChat, onStartDM }: StudentCursusProps) {
    const [subjects, setSubjects] = useState<any[]>([]);
    const [chapters, setChapters] = useState<any[]>([]);
    const [lessons, setLessons] = useState<any[]>([]);
    const [exercises, setExercises] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [progress, setProgress] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [expandedSub, setExpandedSub] = useState<string | null>(null);
    const [expandedCh, setExpandedCh] = useState<string | null>(null);
    const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
    const [activeExercise, setActiveExercise] = useState<any | null>(null);

    // Dispute state
    const [disputeTarget, setDisputeTarget] = useState<any | null>(null);
    const [disputeMsg, setDisputeMsg] = useState('');
    const [sendingDispute, setSendingDispute] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load subjects — try with classroom first, fallback to org
            let subs: any[] = [];
            if (classroomId) {
                const { data } = await supabase.from('subjects')
                    .select('*, teacher_profiles:teacher_id(first_name, last_name, photo_url)')
                    .eq('classroom_id', classroomId)
                    .order('name');
                subs = data || [];
            }
            // If still empty, try by org only
            if (subs.length === 0) {
                const { data } = await supabase.from('subjects')
                    .select('*, teacher_profiles:teacher_id(first_name, last_name, photo_url)')
                    .eq('organization_id', orgId)
                    .order('name');
                subs = data || [];
            }
            setSubjects(subs);

            if (subs.length === 0) { setLoading(false); return; }

            const subjectIds = subs.map((s: any) => s.id);

            // Chapters (published only)
            const { data: chaps } = await supabase.from('chapters')
                .select('*')
                .in('subject_id', subjectIds)
                .in('status', ['published', 'completed'])
                .order('position');
            const allChaps = chaps || [];
            setChapters(allChaps);

            const chapterIds = allChaps.map((c: any) => c.id);

            // Lessons
            if (chapterIds.length > 0) {
                const { data: lsns } = await supabase.from('lessons')
                    .select('*')
                    .in('chapter_id', chapterIds)
                    .in('status', ['published', 'completed'])
                    .order('position');
                setLessons(lsns || []);
            }

            // Exercises (by chapter or subject) — guard empty arrays
            let exs: any[] = [];
            if (chapterIds.length > 0) {
                const { data: exData } = await supabase.from('exercises')
                    .select('*')
                    .or(`chapter_id.in.(${chapterIds.join(',')}),subject_id.in.(${subjectIds.join(',')})`);
                exs = exData || [];
            } else if (subjectIds.length > 0) {
                const { data: exData } = await supabase.from('exercises')
                    .select('*')
                    .in('subject_id', subjectIds);
                exs = exData || [];
            }
            setExercises(exs);

            // My submissions
            const { data: subs2 } = await supabase.from('exercise_submissions')
                .select('*').eq('student_id', userId);
            setSubmissions(subs2 || []);

            // Lesson progress
            const { data: prog } = await supabase.from('lesson_progress')
                .select('*').eq('student_id', userId);
            setProgress(prog || []);

        } catch (e: any) { console.error(e); toast.error('Erreur de chargement'); }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [orgId, userId, classroomId]);

    // ── Helpers ──
    const getSubmission = (exId: string) => submissions.find(s => s.exercise_id === exId);
    const getLessonProgress = (lessonId: string) => progress.find(p => p.lesson_id === lessonId);
    const isLessonCompleted = (lessonId: string) => getLessonProgress(lessonId)?.completed === true;

    const getChapterScore = (chId: string) => {
        const chExs = exercises.filter(e => e.chapter_id === chId);
        if (chExs.length === 0) return null;
        const done = chExs.filter(e => getSubmission(e.id));
        if (done.length === 0) return null;
        const total = done.reduce((acc, e) => acc + (getSubmission(e.id)?.score || 0), 0);
        const max = done.reduce((acc, e) => acc + (e.max_score || 20), 0);
        return { score: total, max };
    };

    const getSubjectScore = (subId: string) => {
        const subChaps = chapters.filter(c => c.subject_id === subId);
        const scores = subChaps.map(c => getChapterScore(c.id)).filter(Boolean) as { score: number; max: number }[];
        if (scores.length === 0) return null;
        const total = scores.reduce((acc, s) => acc + s.score, 0);
        const max = scores.reduce((acc, s) => acc + s.max, 0);
        return { score: total, max, avg: (total / max) * 20 };
    };

    const getOverallAverage = () => {
        const scores = subjects.map(s => getSubjectScore(s.id)).filter(Boolean) as any[];
        if (scores.length === 0) return null;
        const totalAvg = scores.reduce((acc: number, s: any) => acc + s.avg, 0) / scores.length;
        return totalAvg;
    };

    const markLessonDone = async (lessonId: string) => {
        const existing = getLessonProgress(lessonId);
        if (existing?.completed) return;
        await supabase.from('lesson_progress').upsert({
            student_id: userId, lesson_id: lessonId, completed: true,
            completed_at: new Date().toISOString(), organization_id: orgId
        }, { onConflict: 'student_id,lesson_id' });
        setProgress(prev => [...prev.filter(p => p.lesson_id !== lessonId), { student_id: userId, lesson_id: lessonId, completed: true }]);
        toast.success('Leçon marquée terminée ✅');
    };

    const sendDispute = async () => {
        if (!disputeMsg.trim() || !disputeTarget) return;
        setSendingDispute(true);
        const { error } = await supabase.from('grade_disputes').insert({
            student_id: userId,
            exercise_id: disputeTarget.exercise_id,
            submission_id: disputeTarget.submission_id,
            subject_id: disputeTarget.subject_id,
            message: disputeMsg.trim(),
            organization_id: orgId
        });
        if (error) toast.error(error.message);
        else { toast.success('Réclamation envoyée ✅'); setDisputeTarget(null); setDisputeMsg(''); }
        setSendingDispute(false);
    };

    const overall = getOverallAverage();
    const totalLessons = lessons.length;
    const completedLessons = lessons.filter(l => isLessonCompleted(l.id)).length;
    const totalExercises = exercises.length;
    const doneExercises = exercises.filter(e => getSubmission(e.id)).length;

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-4">
            {/* ── OVERVIEW CARDS ── */}
            <div className="grid grid-cols-2 gap-3">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-indigo-500/15 to-violet-500/10 border border-indigo-500/20 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">Moyenne</span>
                        <BarChart3 className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="text-3xl font-black text-white">
                        {overall !== null ? <><span className="text-indigo-400">{overall.toFixed(1)}</span><span className="text-slate-500 text-lg">/20</span></> : <span className="text-slate-600">—</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Générale toutes matières</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    className="bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/20 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Sky Points</span>
                        <Star className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-3xl font-black text-amber-400">{skyPoints}</div>
                    <p className="text-[10px] text-slate-500 mt-1">Points accumulés</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-teal-500/15 to-emerald-500/10 border border-teal-500/20 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-teal-400 font-semibold uppercase tracking-wider">Progression</span>
                        <TrendingUp className="w-4 h-4 text-teal-400" />
                    </div>
                    <div className="text-3xl font-black text-white">
                        <span className="text-teal-400">{completedLessons}</span>
                        <span className="text-slate-500 text-lg">/{totalLessons}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Leçons terminées</p>
                    {totalLessons > 0 && <Progress value={(completedLessons / totalLessons) * 100} className="mt-2 h-1" />}
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="bg-gradient-to-br from-violet-500/15 to-purple-500/10 border border-violet-500/20 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider">Exercices</span>
                        <Zap className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="text-3xl font-black text-white">
                        <span className="text-violet-400">{doneExercises}</span>
                        <span className="text-slate-500 text-lg">/{totalExercises}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Complétés</p>
                    {totalExercises > 0 && <Progress value={(doneExercises / totalExercises) * 100} className="mt-2 h-1" />}
                </motion.div>
            </div>

            {/* ── SUBJECTS ── */}
            <div className="flex items-center justify-between mt-2">
                <h3 className="font-bold text-sm text-slate-300">📚 Mes Matières</h3>
                <span className="text-xs text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded-full">{subjects.length}</span>
            </div>

            {subjects.length === 0 && (
                <div className="text-center py-16 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
                    <GraduationCap className="w-14 h-14 mx-auto mb-3 text-slate-700" />
                    <p className="text-slate-500 font-medium">Aucune matière disponible</p>
                    <p className="text-xs text-slate-600 mt-1">Ton professeur n'a pas encore publié de contenu</p>
                </div>
            )}

            <div className="space-y-3">
                {subjects.map((sub: any, si: number) => {
                    const subChaps = chapters.filter(c => c.subject_id === sub.id);
                    const subScore = getSubjectScore(sub.id);
                    const isOpen = expandedSub === sub.id;
                    const teacher = sub.teacher_profiles;
                    const subLessons = lessons.filter(l => subChaps.some(c => c.id === l.chapter_id));
                    const subCompleted = subLessons.filter(l => isLessonCompleted(l.id)).length;
                    const subPct = subLessons.length > 0 ? (subCompleted / subLessons.length) * 100 : 0;
                    const avg = subScore?.avg ?? null;
                    const scoreColor = avg !== null ? (avg >= 14 ? 'bg-emerald-500/20 text-emerald-400' : avg >= 10 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400') : 'bg-slate-700/40 text-slate-500';

                    return (
                        <motion.div key={sub.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.05 }}>
                            <div className={cn("rounded-2xl border transition-all duration-300 overflow-hidden",
                                isOpen ? 'border-indigo-500/30 bg-gradient-to-br from-indigo-500/[0.07] to-transparent' : 'border-white/[0.07] bg-white/[0.03]')}>

                                {/* ── Subject header ── */}
                                <button
                                    className="w-full text-left"
                                    onClick={() => setExpandedSub(isOpen ? null : sub.id)}>
                                    <div className="px-4 pt-4 pb-3">
                                        {/* Row 1: Icon + Name + Score badge */}
                                        <div className="flex items-start gap-3">
                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg mt-0.5",
                                                isOpen ? 'bg-indigo-500/20' : 'bg-white/[0.06]')}>
                                                📖
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[15px] font-bold text-white leading-tight">{sub.name}</p>
                                                {/* Row 2: Meta info */}
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                                                    {teacher && (
                                                        <span className="text-xs text-slate-400">👨🏫 {teacher.first_name} {teacher.last_name}</span>
                                                    )}
                                                    <span className="text-xs text-slate-500">Coef. {sub.coefficient || 1}</span>
                                                    <span className="text-xs text-slate-500">{subChaps.length} chapitre{subChaps.length > 1 ? 's' : ''}</span>
                                                </div>
                                            </div>
                                            {/* Score badge */}
                                            <div className={cn("shrink-0 px-2.5 py-1 rounded-xl text-sm font-black", scoreColor)}>
                                                {avg !== null ? `${avg.toFixed(1)}` : '—'}
                                                {avg !== null && <span className="text-[10px] font-normal opacity-70">/20</span>}
                                            </div>
                                        </div>
                                        {/* Progress bar full-width */}
                                        {subLessons.length > 0 && (
                                            <div className="mt-3">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[10px] text-slate-500">{subCompleted}/{subLessons.length} leçons</span>
                                                    <span className="text-[10px] text-slate-500">{Math.round(subPct)}%</span>
                                                </div>
                                                <Progress value={subPct} className="h-1.5" />
                                            </div>
                                        )}
                                    </div>
                                    {/* Expand indicator */}
                                    <div className="flex items-center justify-between px-4 pb-3 pt-0">
                                        <div className="flex gap-1.5">
                                            <DiscussButton
                                                context={{ type: 'subject', id: sub.id, title: sub.name }}
                                                orgId={orgId} userId={userId} userName={userName}
                                                onOpenChat={onOpenGroupChat || (() => {})}
                                                size="xs"
                                            />
                                            {/* DM with teacher button */}
                                            {teacher && sub.teacher_id && onStartDM && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onStartDM(sub.teacher_id, `${teacher.first_name} ${teacher.last_name}`); }}
                                                    title={`Message à ${teacher.first_name} ${teacher.last_name}`}
                                                    className="flex items-center gap-1 p-1 rounded-lg border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 transition-all text-[9px]"
                                                >
                                                    <MessageSquare className="w-2.5 h-2.5" />
                                                    <span>Prof</span>
                                                </button>
                                            )}
                                        </div>
                                        <span className={cn("flex items-center gap-1 text-xs transition-colors", isOpen ? 'text-indigo-400' : 'text-slate-500')}>
                                            {isOpen ? 'Réduire' : 'Voir les chapitres'}
                                            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                        </span>
                                    </div>
                                </button>

                                {/* ── Chapters ── */}
                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                            className="border-t border-white/[0.06] bg-black/10 px-3 pb-3 pt-3 space-y-2.5">

                                            {subChaps.length === 0 && (
                                                <p className="text-xs text-slate-500 text-center py-6">📚 Aucun chapitre publié pour l'instant</p>
                                            )}

                                            {subChaps.map((ch: any, ci: number) => {
                                                const chLessons = lessons.filter(l => l.chapter_id === ch.id);
                                                const chExs = exercises.filter(e => e.chapter_id === ch.id);
                                                const chScore = getChapterScore(ch.id);
                                                const isChOpen = expandedCh === ch.id;
                                                const chCompleted = chLessons.filter(l => isLessonCompleted(l.id)).length;
                                                const chPct = chLessons.length > 0 ? (chCompleted / chLessons.length) * 100 : 0;
                                                const chAvg = chScore ? ((chScore.score / chScore.max) * 20) : null;
                                                const chScoreColor = chAvg !== null ? (chAvg >= 10 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-600';

                                                return (
                                                    <motion.div key={ch.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ci * 0.04 }}>
                                                        <div className={cn("rounded-xl border transition-all overflow-hidden",
                                                            isChOpen ? 'border-teal-500/30 bg-teal-500/[0.06]' : 'border-white/[0.06] bg-white/[0.03]')}>

                                                            {/* Chapter header */}
                                                            <button className="w-full text-left" onClick={() => setExpandedCh(isChOpen ? null : ch.id)}>
                                                                <div className="px-3 py-3 flex items-center gap-3">
                                                                    {/* Chapter number */}
                                                                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 flex items-center justify-center shrink-0 text-xs font-black text-teal-400">
                                                                        {ci + 1}
                                                                    </div>
                                                                    {/* Title + meta */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-bold text-white leading-tight">{ch.title}</p>
                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                            <span className="text-[11px] text-slate-400">{chLessons.length} leçon{chLessons.length > 1 ? 's' : ''}</span>
                                                                            {chExs.length > 0 && <span className="text-[11px] text-violet-400">⚡ {chExs.length} ex.</span>}
                                                                            {chCompleted > 0 && <span className="text-[11px] text-teal-400">✓ {chCompleted}/{chLessons.length}</span>}
                                                                        </div>
                                                                    </div>
                                                                    {/* Score + chevron */}
                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                        {chAvg !== null && (
                                                                            <span className={cn("text-xs font-black", chScoreColor)}>{chAvg.toFixed(0)}<span className="text-[10px] opacity-60">/20</span></span>
                                                                        )}
                                                                        <DiscussButton
                                                                            context={{ type: 'chapter', id: ch.id, title: ch.title, parentTitle: sub.name }}
                                                                            orgId={orgId} userId={userId} userName={userName}
                                                                            onOpenChat={onOpenGroupChat || (() => {})}
                                                                            size="xs"
                                                                        />
                                                                        {isChOpen ? <ChevronUp className="w-4 h-4 text-teal-400" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                                                                    </div>
                                                                </div>
                                                                {/* Progress bar */}
                                                                {chLessons.length > 0 && chPct > 0 && (
                                                                    <div className="px-3 pb-2">
                                                                        <Progress value={chPct} className="h-1" />
                                                                    </div>
                                                                )}
                                                            </button>

                                                            {/* Chapter content */}
                                                            <AnimatePresence>
                                                                {isChOpen && (
                                                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                                        className="border-t border-white/[0.06] bg-black/10 px-3 pb-3 pt-2.5 space-y-2">

                                                                        {ch.content && (
                                                                            <div className="bg-white/[0.03] rounded-xl p-3 mb-2">
                                                                                <RichContentRenderer content={ch.content} />
                                                                            </div>
                                                                        )}

                                                                        {/* ── Lessons ── */}
                                                                        {chLessons.length > 0 && (
                                                                            <div className="space-y-1.5">
                                                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold px-1 mb-2">Leçons</p>
                                                                                {chLessons.map((lesson: any) => {
                                                                                    const done = isLessonCompleted(lesson.id);
                                                                                    const isLOpen = expandedLesson === lesson.id;
                                                                                    return (
                                                                                        <div key={lesson.id} className={cn("rounded-xl border transition-all",
                                                                                            done ? 'border-emerald-500/20 bg-emerald-500/[0.04]' : 'border-white/[0.06] bg-white/[0.02]')}>
                                                                                            {/* Lesson row */}
                                                                                            <div className="flex items-center gap-2.5 px-3 py-2.5">
                                                                                                {/* Status icon */}
                                                                                                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                                                                                                    done ? 'bg-emerald-500/20' : 'bg-white/[0.05]')}>
                                                                                                    {done
                                                                                                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                                                                        : <Play className="w-3.5 h-3.5 text-slate-400" />}
                                                                                                </div>
                                                                                                {/* Title + duration */}
                                                                                                <button className="flex-1 min-w-0 text-left"
                                                                                                    onClick={() => setExpandedLesson(isLOpen ? null : lesson.id)}>
                                                                                                    <p className="text-sm font-semibold text-white leading-tight">{lesson.title}</p>
                                                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                                                        {lesson.estimated_minutes && (
                                                                                                            <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                                                                                                                <Clock className="w-2.5 h-2.5" />{lesson.estimated_minutes} min
                                                                                                            </span>
                                                                                                        )}
                                                                                                        {done && <span className="text-[11px] text-emerald-400 font-medium">✓ Terminé</span>}
                                                                                                    </div>
                                                                                                </button>
                                                                                                <div className="flex items-center gap-1 shrink-0">
                                                                                                    <DiscussButton
                                                                                                        context={{ type: 'lesson', id: lesson.id, title: lesson.title, parentTitle: ch.title }}
                                                                                                        orgId={orgId} userId={userId} userName={userName}
                                                                                                        onOpenChat={onOpenGroupChat || (() => {})}
                                                                                                        size="xs"
                                                                                                    />
                                                                                                    <button onClick={() => setExpandedLesson(isLOpen ? null : lesson.id)}
                                                                                                        className="p-1 text-slate-500 hover:text-white transition shrink-0">
                                                                                                        {isLOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                            {/* Lesson expanded content */}
                                                                                            <AnimatePresence>
                                                                                                {isLOpen && (
                                                                                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                                                                        className="border-t border-white/[0.06] px-3 pb-3 pt-2.5 space-y-2.5 overflow-hidden">
                                                                                                        {lesson.content && (
                                                                                                            <div className="bg-white/[0.02] rounded-xl p-3">
                                                                                                                <RichContentRenderer content={lesson.content} />
                                                                                                            </div>
                                                                                                        )}
                                                                                                        {!done && (
                                                                                                            <button onClick={() => markLessonDone(lesson.id)}
                                                                                                                className="w-full py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/25 transition-all">
                                                                                                                ✅ Marquer comme terminé
                                                                                                            </button>
                                                                                                        )}
                                                                                                    </motion.div>
                                                                                                )}
                                                                                            </AnimatePresence>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}

                                                                        {/* ── Exercises ── */}
                                                                        {chExs.length > 0 && (
                                                                            <div className="mt-3 space-y-2">
                                                                                <p className="text-[10px] text-violet-400 uppercase tracking-wider font-semibold px-1">⚡ Exercices ({chExs.length})</p>
                                                                                {chExs.map((ex: any) => {
                                                                                    const sub2 = getSubmission(ex.id);
                                                                                    const scored = sub2?.score !== undefined && sub2?.score !== null;
                                                                                    const pct = scored ? (sub2.score / ex.max_score) * 100 : 0;
                                                                                    const passed = scored && sub2.score >= ex.max_score * 0.5;

                                                                                    return (
                                                                                        <div key={ex.id} className={cn("rounded-xl border p-3 transition-all",
                                                                                            scored ? (passed ? 'border-emerald-500/30 bg-emerald-500/[0.05]' : 'border-red-500/30 bg-red-500/[0.05]') : 'border-violet-500/20 bg-violet-500/[0.04]')}>
                                                                                            <div className="flex items-start justify-between gap-2">
                                                                                                <div className="flex-1 min-w-0">
                                                                                                    <div className="flex items-center gap-1.5 mb-1">
                                                                                                        <Badge className="text-[9px] bg-violet-500/20 text-violet-400 border-violet-500/30">{ex.type?.toUpperCase()}</Badge>
                                                                                                        <span className="text-[11px] text-slate-400 flex items-center gap-0.5"><Timer className="w-2.5 h-2.5" />{ex.duration_minutes} min</span>
                                                                                                    </div>
                                                                                                    <p className="text-sm font-bold text-white">{ex.title}</p>
                                                                                                    {scored && (
                                                                                                        <div className="flex items-center gap-2 mt-1.5">
                                                                                                            <span className={cn("text-sm font-bold", passed ? 'text-emerald-400' : 'text-red-400')}>
                                                                                                                {sub2.score}/{ex.max_score}
                                                                                                            </span>
                                                                                                            <Progress value={pct} className="flex-1 h-1.5" />
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                                                                    {!scored ? (
                                                                                                        <button onClick={() => setActiveExercise(ex)}
                                                                                                            className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all flex items-center gap-1">
                                                                                                            <Play className="w-3 h-3" /> Commencer
                                                                                                        </button>
                                                                                                    ) : (
                                                                                                        <span className={cn("text-xs font-bold px-2 py-1 rounded-lg", passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>
                                                                                                            {passed ? '✓ Réussi' : '✗ Raté'}
                                                                                                        </span>
                                                                                                    )}
                                                                                                    <div className="flex gap-1">
                                                                                                        <DiscussButton
                                                                                                            context={{ type: 'exercise', id: ex.id, title: ex.title, parentTitle: ch.title }}
                                                                                                            orgId={orgId} userId={userId} userName={userName}
                                                                                                            onOpenChat={onOpenGroupChat || (() => {})}
                                                                                                            size="xs"
                                                                                                        />
                                                                                                        {scored && (
                                                                                                            <button onClick={() => setDisputeTarget({ exercise_id: ex.id, submission_id: sub2.id, subject_id: sub.id, title: ex.title })}
                                                                                                                className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-all" title="Réclamer">
                                                                                                                <Flag className="w-3 h-3" />
                                                                                                            </button>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    );
                })}
            </div>



            {/* ── EXERCISE MODAL ── */}
            <AnimatePresence>
                {activeExercise && (
                    <CursusExerciseModal
                        exercise={activeExercise}
                        studentId={userId}
                        onClose={() => setActiveExercise(null)}
                        onComplete={(score, max) => {
                            setSubmissions(prev => [...prev, { exercise_id: activeExercise.id, student_id: userId, score, graded: true }]);
                            onSkyUpdate(Math.round(score));
                            setActiveExercise(null);
                            toast.success(`Score: ${score}/${max} — +${Math.round(score)} Sky ⭐`);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ── DISPUTE MODAL ── */}
            <AnimatePresence>
                {disputeTarget && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
                        onClick={() => setDisputeTarget(null)}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#0f1117] border border-orange-500/20 rounded-2xl w-full max-w-md p-6 shadow-2xl"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                                    <Flag className="w-5 h-5 text-orange-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Réclamation de note</h3>
                                    <p className="text-xs text-slate-500">{disputeTarget.title}</p>
                                </div>
                                <button onClick={() => setDisputeTarget(null)} className="ml-auto text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                            </div>
                            <Textarea
                                value={disputeMsg}
                                onChange={e => setDisputeMsg(e.target.value)}
                                placeholder="Expliquez pourquoi vous contestez cette note..."
                                className="bg-white/[0.04] border-white/10 text-white placeholder:text-slate-600 resize-none rounded-xl mb-4"
                                rows={4}
                            />
                            <Button onClick={sendDispute} disabled={sendingDispute || !disputeMsg.trim()}
                                className="w-full bg-orange-600 hover:bg-orange-500 text-white rounded-xl">
                                {sendingDispute ? 'Envoi...' : 'Envoyer la réclamation'} <Send className="w-4 h-4 ml-2" />
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
