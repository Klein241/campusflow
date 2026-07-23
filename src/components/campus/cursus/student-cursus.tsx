'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Play, CheckCircle2, Award, Star, Timer, FileText,
    Send, X, Trophy, BarChart3, GraduationCap, MessageSquare,
    Clock, Zap, TrendingUp, Flag, Maximize2, ChevronRight,
    Lock, Target, Layers
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
import { LessonReader } from './lesson-reader';

// ─── Palette couleurs ──────────────────────────────────────────────────────
const SUBJECT_COLORS = [
    { bg: 'bg-violet-500/15', border: 'border-violet-500/30', text: 'text-violet-300', pill: 'bg-violet-500/20 text-violet-300', progress: '[&>div]:bg-violet-500' },
    { bg: 'bg-cyan-500/15',   border: 'border-cyan-500/30',   text: 'text-cyan-300',   pill: 'bg-cyan-500/20 text-cyan-300',   progress: '[&>div]:bg-cyan-500'   },
    { bg: 'bg-amber-500/15',  border: 'border-amber-500/30',  text: 'text-amber-300',  pill: 'bg-amber-500/20 text-amber-300',  progress: '[&>div]:bg-amber-500'  },
    { bg: 'bg-rose-500/15',   border: 'border-rose-500/30',   text: 'text-rose-300',   pill: 'bg-rose-500/20 text-rose-300',   progress: '[&>div]:bg-rose-500'   },
    { bg: 'bg-emerald-500/15',border: 'border-emerald-500/30',text: 'text-emerald-300',pill: 'bg-emerald-500/20 text-emerald-300',progress: '[&>div]:bg-emerald-500'},
    { bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-300', pill: 'bg-orange-500/20 text-orange-300', progress: '[&>div]:bg-orange-500' },
    { bg: 'bg-pink-500/15',   border: 'border-pink-500/30',   text: 'text-pink-300',   pill: 'bg-pink-500/20 text-pink-300',   progress: '[&>div]:bg-pink-500'   },
    { bg: 'bg-teal-500/15',   border: 'border-teal-500/30',   text: 'text-teal-300',   pill: 'bg-teal-500/20 text-teal-300',   progress: '[&>div]:bg-teal-500'   },
];

interface StudentCursusProps {
    orgId: string;
    userId: string;
    userName: string;
    classroomId: string | null;
    skyPoints: number;
    onSkyUpdate: (delta: number) => void;
    onOpenGroupChat?: (convId: string, convName: string) => void;
    onStartDM?: (targetId: string, targetName: string) => void;
}

export function StudentCursus({ orgId, userId, userName, classroomId, skyPoints, onSkyUpdate, onOpenGroupChat, onStartDM }: StudentCursusProps) {
    const [subjects,    setSubjects]    = useState<any[]>([]);
    const [chapters,    setChapters]    = useState<any[]>([]);
    const [lessons,     setLessons]     = useState<any[]>([]);
    const [exercises,   setExercises]   = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [progress,    setProgress]    = useState<any[]>([]);
    const [loading,     setLoading]     = useState(true);

    // ── Navigation Miller Columns ──
    const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
    const [selectedChId,  setSelectedChId]  = useState<string | null>(null);
    const [activeTab,     setActiveTab]     = useState<'lessons' | 'exercises'>('lessons');
    const [readerLesson,  setReaderLesson]  = useState<any | null>(null);
    const [activeExercise,setActiveExercise]= useState<any | null>(null);

    // ── Dispute ──
    const [disputeTarget, setDisputeTarget] = useState<any | null>(null);
    const [disputeMsg,    setDisputeMsg]    = useState('');
    const [sendingDispute,setSendingDispute]= useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            let subs: any[] = [];
            if (classroomId) {
                const { data } = await supabase.from('subjects')
                    .select('*, teacher_profiles:teacher_id(first_name, last_name, photo_url)')
                    .eq('classroom_id', classroomId).order('name');
                subs = data || [];
            }
            if (subs.length === 0) {
                const { data } = await supabase.from('subjects')
                    .select('*, teacher_profiles:teacher_id(first_name, last_name, photo_url)')
                    .eq('organization_id', orgId).order('name');
                subs = data || [];
            }
            setSubjects(subs);
            if (subs.length === 0) { setLoading(false); return; }

            const subjectIds = subs.map((s: any) => s.id);

            const { data: chaps } = await supabase.from('chapters')
                .select('*').in('subject_id', subjectIds)
                .in('status', ['published', 'completed']).order('position');
            const allChaps = chaps || [];
            setChapters(allChaps);

            const chapterIds = allChaps.map((c: any) => c.id);

            if (chapterIds.length > 0) {
                const { data: lsns } = await supabase.from('lessons')
                    .select('*').in('chapter_id', chapterIds)
                    .in('status', ['published', 'completed']).order('position');
                setLessons(lsns || []);
            }

            let exs: any[] = [];
            if (chapterIds.length > 0) {
                const { data: exData } = await supabase.from('exercises').select('*')
                    .or(`chapter_id.in.(${chapterIds.join(',')}),subject_id.in.(${subjectIds.join(',')})`);
                exs = exData || [];
            } else if (subjectIds.length > 0) {
                const { data: exData } = await supabase.from('exercises').select('*').in('subject_id', subjectIds);
                exs = exData || [];
            }
            setExercises(exs);

            const { data: subs2 } = await supabase.from('exercise_submissions').select('*').eq('student_id', userId);
            setSubmissions(subs2 || []);

            const { data: prog } = await supabase.from('lesson_progress').select('*').eq('student_id', userId);
            setProgress(prog || []);
        } catch (e: any) { console.error(e); toast.error('Erreur de chargement'); }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [orgId, userId, classroomId]);

    // ── Helpers ──
    const getColor = (idx: number) => SUBJECT_COLORS[idx % SUBJECT_COLORS.length];
    const getSubmission      = (exId: string) => submissions.find(s => s.exercise_id === exId);
    const getLessonProgress  = (lId: string)  => progress.find(p => p.lesson_id === lId);
    const isLessonCompleted  = (lId: string)  => getLessonProgress(lId)?.completed === true;

    const getChapterScore = (chId: string) => {
        const chExs = exercises.filter(e => e.chapter_id === chId);
        if (chExs.length === 0) return null;
        const done = chExs.filter(e => getSubmission(e.id));
        if (done.length === 0) return null;
        const total = done.reduce((acc, e) => acc + (getSubmission(e.id)?.score || 0), 0);
        const max   = done.reduce((acc, e) => acc + (e.max_score || 20), 0);
        return { score: total, max };
    };

    const getSubjectScore = (subId: string) => {
        const subChaps = chapters.filter(c => c.subject_id === subId);
        const scores = subChaps.map(c => getChapterScore(c.id)).filter(Boolean) as { score: number; max: number }[];
        if (scores.length === 0) return null;
        const total = scores.reduce((acc, s) => acc + s.score, 0);
        const max   = scores.reduce((acc, s) => acc + s.max, 0);
        return { score: total, max, avg: max > 0 ? (total / max) * 20 : 0 };
    };

    const getOverallAverage = () => {
        const scores = subjects.map(s => getSubjectScore(s.id)).filter(Boolean) as any[];
        if (scores.length === 0) return null;
        return scores.reduce((acc: number, s: any) => acc + s.avg, 0) / scores.length;
    };

    const markLessonDone = async (lessonId: string) => {
        const existing = getLessonProgress(lessonId);
        if (existing?.completed) return;
        await supabase.from('lesson_progress').upsert(
            { student_id: userId, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString(), organization_id: orgId },
            { onConflict: 'student_id,lesson_id' }
        );
        setProgress(prev => [...prev.filter(p => p.lesson_id !== lessonId), { student_id: userId, lesson_id: lessonId, completed: true }]);
        toast.success('Leçon marquée terminée ✅');
    };

    const sendDispute = async () => {
        if (!disputeMsg.trim() || !disputeTarget) return;
        setSendingDispute(true);
        const { error } = await supabase.from('grade_disputes').insert({
            student_id: userId, exercise_id: disputeTarget.exercise_id,
            submission_id: disputeTarget.submission_id, subject_id: disputeTarget.subject_id,
            message: disputeMsg.trim(), organization_id: orgId
        });
        if (error) toast.error(error.message);
        else { toast.success('Réclamation envoyée ✅'); setDisputeTarget(null); setDisputeMsg(''); }
        setSendingDispute(false);
    };

    // ── Derived ──
    const overall        = getOverallAverage();
    const totalLessons   = lessons.length;
    const completedLessons = lessons.filter(l => isLessonCompleted(l.id)).length;
    const totalExercises = exercises.length;
    const doneExercises  = exercises.filter(e => getSubmission(e.id)).length;

    const selectedSub  = subjects.find(s => s.id === selectedSubId);
    const selectedCh   = chapters.find(c => c.id === selectedChId);
    const subChapters  = selectedSubId ? chapters.filter(c => c.subject_id === selectedSubId) : [];
    const chLessons    = selectedChId  ? lessons.filter(l => l.chapter_id === selectedChId) : [];
    const chExercises  = selectedChId  ? exercises.filter(e => e.chapter_id === selectedChId) : [];

    if (loading) return (
        <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-4">

            {/* ── Lesson Reader fullscreen ── */}
            {readerLesson && (
                <LessonReader
                    isOpen={true}
                    lesson={readerLesson}
                    onClose={() => setReaderLesson(null)}
                    userId={userId}
                    orgId={orgId}
                />
            )}

            {/* ── Overview cards ── */}
            <div className="grid grid-cols-2 gap-2.5">
                {[
                    { label: 'Moyenne', value: overall !== null ? `${overall.toFixed(1)}/20` : '—', sub: 'toutes matières', color: 'indigo', icon: BarChart3 },
                    { label: 'Sky Points', value: skyPoints, sub: 'points accumulés', color: 'amber', icon: Star },
                    { label: 'Progression', value: `${completedLessons}/${totalLessons}`, sub: 'leçons terminées', color: 'teal', pct: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0, icon: TrendingUp },
                    { label: 'Exercices', value: `${doneExercises}/${totalExercises}`, sub: 'complétés', color: 'violet', pct: totalExercises > 0 ? (doneExercises / totalExercises) * 100 : 0, icon: Zap },
                ].map((card, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                        className={cn('rounded-2xl border p-4',
                            card.color === 'indigo' ? 'bg-gradient-to-br from-indigo-500/15 to-violet-500/10 border-indigo-500/20' :
                            card.color === 'amber'  ? 'bg-gradient-to-br from-amber-500/15 to-orange-500/10 border-amber-500/20' :
                            card.color === 'teal'   ? 'bg-gradient-to-br from-teal-500/15 to-emerald-500/10 border-teal-500/20' :
                            'bg-gradient-to-br from-violet-500/15 to-purple-500/10 border-violet-500/20')}>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className={cn('text-[10px] font-semibold uppercase tracking-wider',
                                card.color === 'indigo' ? 'text-indigo-400' :
                                card.color === 'amber'  ? 'text-amber-400' :
                                card.color === 'teal'   ? 'text-teal-400' : 'text-violet-400')}>
                                {card.label}
                            </span>
                            <card.icon className={cn('w-4 h-4',
                                card.color === 'indigo' ? 'text-indigo-400' :
                                card.color === 'amber'  ? 'text-amber-400' :
                                card.color === 'teal'   ? 'text-teal-400' : 'text-violet-400')} />
                        </div>
                        <div className={cn('text-2xl font-black',
                            card.color === 'indigo' ? 'text-indigo-400' :
                            card.color === 'amber'  ? 'text-amber-400' :
                            card.color === 'teal'   ? 'text-teal-400' : 'text-violet-400')}>
                            {card.value}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{card.sub}</p>
                        {'pct' in card && card.pct !== undefined && (
                            <Progress value={card.pct} className="mt-2 h-1" />
                        )}
                    </motion.div>
                ))}
            </div>

            {/* ══════════════ MILLER COLUMNS ══════════════ */}
            <div className="rounded-2xl overflow-hidden border border-white/[0.07] bg-[#0c0e16]">

                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
                    <button onClick={() => { setSelectedSubId(null); setSelectedChId(null); }}
                        className={cn('text-xs font-semibold transition-colors', !selectedSubId ? 'text-white' : 'text-slate-500 hover:text-slate-300')}>
                        📚 Mes Matières
                    </button>
                    {selectedSub && (
                        <>
                            <ChevronRight className="w-3 h-3 text-slate-600" />
                            <button onClick={() => setSelectedChId(null)}
                                className={cn('text-xs font-semibold transition-colors max-w-[120px] truncate', !selectedChId ? 'text-white' : 'text-slate-500 hover:text-slate-300')}>
                                {selectedSub.name}
                            </button>
                        </>
                    )}
                    {selectedCh && (
                        <>
                            <ChevronRight className="w-3 h-3 text-slate-600" />
                            <span className="text-xs font-semibold text-white max-w-[120px] truncate">{selectedCh.title}</span>
                        </>
                    )}
                </div>

                {/* ── COL 1: Matières ── */}
                {!selectedSubId && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 space-y-2">
                        <div className="px-1 mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Toutes les matières</span>
                        </div>

                        {subjects.length === 0 && (
                            <div className="text-center py-16">
                                <GraduationCap className="w-14 h-14 mx-auto mb-3 text-slate-700" />
                                <p className="text-slate-500 font-medium">Aucune matière disponible</p>
                                <p className="text-xs text-slate-600 mt-1">Ton professeur n&apos;a pas encore publié de contenu</p>
                            </div>
                        )}

                        {subjects.map((sub: any, si: number) => {
                            const col       = getColor(si);
                            const subChaps  = chapters.filter(c => c.subject_id === sub.id);
                            const subLessons= lessons.filter(l => subChaps.some(c => c.id === l.chapter_id));
                            const subComp   = subLessons.filter(l => isLessonCompleted(l.id)).length;
                            const subPct    = subLessons.length > 0 ? (subComp / subLessons.length) * 100 : 0;
                            const subScore  = getSubjectScore(sub.id);
                            const avg       = subScore?.avg ?? null;
                            const teacher   = sub.teacher_profiles;
                            const scoreColor = avg !== null ? (avg >= 14 ? 'text-emerald-400' : avg >= 10 ? 'text-amber-400' : 'text-red-400') : 'text-slate-600';

                            return (
                                <motion.button key={sub.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: si * 0.05 }}
                                    onClick={() => { setSelectedSubId(sub.id); setSelectedChId(null); }}
                                    className={cn('w-full text-left rounded-2xl border p-4 transition-all group hover:scale-[1.01] hover:shadow-lg', col.bg, col.border)}>
                                    <div className="flex items-center gap-3">
                                        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-xl font-black', col.bg, col.text)}>
                                            {sub.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn('text-sm font-black leading-tight', col.text)}>{sub.name}</p>
                                            <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                                                {teacher && <span className="text-[10px] text-slate-400">👨‍🏫 {teacher.first_name} {teacher.last_name}</span>}
                                                <span className="text-[10px] text-slate-500">Coef. {sub.coefficient || 1}</span>
                                                <span className="text-[10px] text-slate-500">{subChaps.length} chapitres</span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={cn('text-sm font-black', scoreColor)}>
                                                {avg !== null ? avg.toFixed(1) : '—'}
                                                {avg !== null && <span className="text-[10px] opacity-60">/20</span>}
                                            </p>
                                            <p className="text-[9px] text-slate-500 mt-0.5">{subComp}/{subLessons.length}</p>
                                        </div>
                                        <ChevronRight className={cn('w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1', col.text)} />
                                    </div>
                                    {subLessons.length > 0 && (
                                        <div className="mt-3">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-[9px] text-slate-500">{Math.round(subPct)}% terminé</span>
                                                <span className="text-[9px] text-slate-500">{subComp}/{subLessons.length} leçons</span>
                                            </div>
                                            <Progress value={subPct} className={cn('h-1.5', col.progress)} />
                                        </div>
                                    )}
                                    {/* Quick actions */}
                                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/[0.06]" onClick={e => e.stopPropagation()}>
                                        <DiscussButton context={{ type: 'subject', id: sub.id, title: sub.name }}
                                            orgId={orgId} userId={userId} userName={userName}
                                            onOpenChat={onOpenGroupChat || (() => {})} size="xs" />
                                        {teacher && sub.teacher_id && onStartDM && (
                                            <button onClick={() => onStartDM(sub.teacher_id, `${teacher.first_name} ${teacher.last_name}`)}
                                                title={`Message à ${teacher.first_name}`}
                                                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 transition-all text-[9px]">
                                                <MessageSquare className="w-2.5 h-2.5" />Prof
                                            </button>
                                        )}
                                    </div>
                                </motion.button>
                            );
                        })}
                    </motion.div>
                )}

                {/* ── COL 2: Chapitres ── */}
                {selectedSubId && !selectedChId && (
                    <motion.div key="chapters" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="p-3 space-y-2">
                        {(() => {
                            const si  = subjects.findIndex(s => s.id === selectedSubId);
                            const col = getColor(si);
                            return (
                                <>
                                    <div className="flex items-center gap-2 px-1 mb-2">
                                        <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0', col.bg, col.text)}>
                                            {selectedSub?.name?.charAt(0)}
                                        </div>
                                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Chapitres</span>
                                        <span className="text-[10px] text-slate-600">({subChapters.length})</span>
                                    </div>

                                    {subChapters.length === 0 && (
                                        <div className="text-center py-12">
                                            <Layers className="w-10 h-10 mx-auto mb-2 text-slate-700" />
                                            <p className="text-slate-500 text-sm">Aucun chapitre publié</p>
                                        </div>
                                    )}

                                    {subChapters.map((ch: any, ci: number) => {
                                        const chLsns  = lessons.filter(l => l.chapter_id === ch.id);
                                        const chExs   = exercises.filter(e => e.chapter_id === ch.id);
                                        const chComp  = chLsns.filter(l => isLessonCompleted(l.id)).length;
                                        const chPct   = chLsns.length > 0 ? (chComp / chLsns.length) * 100 : 0;
                                        const chScore = getChapterScore(ch.id);
                                        const chAvg   = chScore ? (chScore.score / chScore.max) * 20 : null;
                                        const chDoneExs = chExs.filter(e => getSubmission(e.id)).length;

                                        return (
                                            <motion.button key={ch.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ci * 0.04 }}
                                                onClick={() => { setSelectedChId(ch.id); setActiveTab('lessons'); }}
                                                className="w-full text-left rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 transition-all group hover:border-teal-500/30 hover:bg-teal-500/[0.05] hover:scale-[1.01]">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center shrink-0">
                                                        <span className="text-sm font-black text-teal-400">{ci + 1}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-white leading-tight">{ch.title}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] text-slate-400">{chLsns.length} leçon{chLsns.length > 1 ? 's' : ''}</span>
                                                            {chExs.length > 0 && (
                                                                <span className="text-[10px] text-violet-400">⚡ {chDoneExs}/{chExs.length} ex.</span>
                                                            )}
                                                            {chComp > 0 && (
                                                                <span className="text-[10px] text-teal-400">✓ {chComp}/{chLsns.length}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        {chAvg !== null && (
                                                            <p className={cn('text-xs font-black', chAvg >= 10 ? 'text-emerald-400' : 'text-red-400')}>
                                                                {chAvg.toFixed(0)}<span className="text-[9px] opacity-60">/20</span>
                                                            </p>
                                                        )}
                                                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-teal-400 transition-colors mt-1" />
                                                    </div>
                                                </div>
                                                {chLsns.length > 0 && chPct > 0 && (
                                                    <Progress value={chPct} className="mt-3 h-1" />
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </>
                            );
                        })()}
                    </motion.div>
                )}

                {/* ── COL 3: Leçons + Exercices ── */}
                {selectedSubId && selectedChId && (
                    <motion.div key="content" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="p-3 space-y-3">

                        {/* Tab switcher */}
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                            {(['lessons', 'exercises'] as const).map(t => (
                                <button key={t} onClick={() => setActiveTab(t)}
                                    className={cn('flex-1 py-2 rounded-lg text-xs font-semibold transition-all',
                                        activeTab === t ? 'bg-white/10 text-white shadow' : 'text-slate-500 hover:text-slate-300')}>
                                    {t === 'lessons' ? `📝 Leçons (${chLessons.length})` : `⚡ Exercices (${chExercises.length})`}
                                </button>
                            ))}
                        </div>

                        {/* ── Leçons ── */}
                        {activeTab === 'lessons' && (
                            <div className="space-y-2">
                                {chLessons.length === 0 && (
                                    <div className="text-center py-10">
                                        <FileText className="w-10 h-10 mx-auto mb-2 text-slate-700" />
                                        <p className="text-slate-500 text-sm">Aucune leçon publiée</p>
                                    </div>
                                )}
                                {chLessons.map((lesson: any, li: number) => {
                                    const done = isLessonCompleted(lesson.id);
                                    return (
                                        <motion.div key={lesson.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: li * 0.04 }}
                                            className={cn('rounded-xl border overflow-hidden transition-all',
                                                done ? 'border-emerald-500/25 bg-emerald-500/[0.05]' : 'border-white/[0.08] bg-white/[0.03]')}>
                                            <div className="flex items-center gap-2.5 px-3 py-3">
                                                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                                                    done ? 'bg-emerald-500/20' : 'bg-white/[0.06]')}>
                                                    {done
                                                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                        : <Play className="w-3.5 h-3.5 text-slate-400" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-white leading-tight">{lesson.title}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {lesson.estimated_minutes && (
                                                            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                                                <Clock className="w-2.5 h-2.5" />{lesson.estimated_minutes} min
                                                            </span>
                                                        )}
                                                        {done && <span className="text-[10px] text-emerald-400 font-medium">✓ Terminé</span>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <DiscussButton context={{ type: 'lesson', id: lesson.id, title: lesson.title, parentTitle: selectedCh?.title }}
                                                        orgId={orgId} userId={userId} userName={userName}
                                                        onOpenChat={onOpenGroupChat || (() => {})} size="xs" />
                                                    {lesson.content && (
                                                        <button onClick={() => setReaderLesson({ ...lesson, chapter_title: selectedCh?.title })}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-[10px] font-semibold hover:bg-indigo-500/25 transition-all">
                                                            <Maximize2 className="w-3 h-3" />Lire
                                                        </button>
                                                    )}
                                                    {!done && (
                                                        <button onClick={() => markLessonDone(lesson.id)}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[10px] font-semibold hover:bg-emerald-500/25 transition-all">
                                                            ✅ Fait
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── Exercices ── */}
                        {activeTab === 'exercises' && (
                            <div className="space-y-2">
                                {chExercises.length === 0 && (
                                    <div className="text-center py-10">
                                        <Zap className="w-10 h-10 mx-auto mb-2 text-slate-700" />
                                        <p className="text-slate-500 text-sm">Aucun exercice pour ce chapitre</p>
                                    </div>
                                )}
                                {chExercises.map((ex: any) => {
                                    const sub2   = getSubmission(ex.id);
                                    const scored = sub2?.score !== undefined && sub2?.score !== null;
                                    const pct    = scored ? (sub2.score / ex.max_score) * 100 : 0;
                                    const passed = scored && sub2.score >= ex.max_score * 0.5;
                                    return (
                                        <motion.div key={ex.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                            className={cn('rounded-xl border p-3.5 transition-all',
                                                scored ? (passed ? 'border-emerald-500/30 bg-emerald-500/[0.05]' : 'border-red-500/30 bg-red-500/[0.05]')
                                                       : 'border-violet-500/20 bg-violet-500/[0.05]')}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <Badge className="text-[9px] bg-violet-500/20 text-violet-400 border-violet-500/30">{ex.type?.toUpperCase()}</Badge>
                                                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Timer className="w-2.5 h-2.5" />{ex.duration_minutes} min</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-white">{ex.title}</p>
                                                    {scored && (
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className={cn('text-sm font-bold', passed ? 'text-emerald-400' : 'text-red-400')}>
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
                                                        <span className={cn('text-xs font-bold px-2 py-1 rounded-lg', passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>
                                                            {passed ? '✓ Réussi' : '✗ Raté'}
                                                        </span>
                                                    )}
                                                    <div className="flex gap-1">
                                                        <DiscussButton context={{ type: 'exercise', id: ex.id, title: ex.title, parentTitle: selectedCh?.title }}
                                                            orgId={orgId} userId={userId} userName={userName}
                                                            onOpenChat={onOpenGroupChat || (() => {})} size="xs" />
                                                        {scored && (
                                                            <button onClick={() => setDisputeTarget({ exercise_id: ex.id, submission_id: sub2.id, subject_id: selectedSubId, title: ex.title })}
                                                                className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-all" title="Réclamer">
                                                                <Flag className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </div>

            {/* ═══ EXERCISE MODAL ═══ */}
            <AnimatePresence>
                {activeExercise && (
                    <CursusExerciseModal
                        exercise={activeExercise}
                        studentId={userId}
                        onClose={() => setActiveExercise(null)}
                        onComplete={(score, max, skyGain) => {
                            setSubmissions(prev => [...prev, { exercise_id: activeExercise.id, student_id: userId, score, graded: true }]);
                            if (skyGain > 0) {
                                onSkyUpdate(skyGain);
                                toast.success(`Score: ${score}/${max} — +${skyGain} Sky ⭐`);
                            } else {
                                toast.info(`Score: ${score}/${max}`);
                            }
                            setActiveExercise(null);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ═══ DISPUTE MODAL ═══ */}
            <AnimatePresence>
                {disputeTarget && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
                        onClick={() => setDisputeTarget(null)}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#0f1117] border border-orange-500/20 rounded-2xl w-full max-w-md p-6"
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
                            <Textarea value={disputeMsg} onChange={e => setDisputeMsg(e.target.value)}
                                placeholder="Expliquez pourquoi vous contestez cette note..."
                                className="bg-white/[0.04] border-white/10 text-white placeholder:text-slate-600 resize-none rounded-xl mb-4" rows={4} />
                            <Button onClick={sendDispute} disabled={sendingDispute || !disputeMsg.trim()}
                                className="w-full bg-orange-600 hover:bg-orange-500 text-white rounded-xl">
                                {sendingDispute ? 'Envoi...' : <><Send className="w-4 h-4 mr-2" />Envoyer la réclamation</>}
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
