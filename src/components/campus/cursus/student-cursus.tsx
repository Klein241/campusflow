'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Play, CheckCircle2, Award, Star, Timer, FileText,
    Send, X, Trophy, BarChart3, GraduationCap, MessageSquare,
    Clock, Zap, TrendingUp, Flag, Maximize2, ChevronRight,
    Lock, Target, Layers, StickyNote, Save, RotateCcw,
    Globe, Sparkles, Loader2
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
import { deductSkyPoints } from '@/lib/sky-points-service';
import { isContentUnlocked } from '@/lib/cursus-drip-service';
import { ClassSelectorCards } from './class-selector-cards';
import type { ContentBlock } from './rich-content-editor';
import { TranslationDialog } from './translation-dialog';
import { TranslatedCoursesModal } from './translated-courses-modal';
import {
    getSavedTranslations,
    subscribeToTranslationTasks,
    TranslatedItem,
    TranslationTask
} from '@/lib/course-translation-service';

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
    filiereId?: string | null;
    skyPoints: number;
    onSkyUpdate: (delta: number) => void;
    onOpenGroupChat?: (convId: string, convName: string) => void;
    onStartDM?: (targetId: string, targetName: string) => void;
}

export function StudentCursus({ orgId, userId, userName, classroomId, filiereId, skyPoints, onSkyUpdate, onOpenGroupChat, onStartDM }: StudentCursusProps) {
    const [subjects,    setSubjects]    = useState<any[]>([]);
    const [chapters,    setChapters]    = useState<any[]>([]);
    const [lessons,     setLessons]     = useState<any[]>([]);
    const [exercises,   setExercises]   = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [progress,    setProgress]    = useState<any[]>([]);
    const [loading,     setLoading]     = useState(true);

    // ── Multi-classes & Filières ──
    const [studentClasses,  setStudentClasses]  = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

    // ── Navigation Miller Columns ──
    const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
    const [selectedChId,  setSelectedChId]  = useState<string | null>(null);
    const [activeTab,     setActiveTab]     = useState<'lessons' | 'exercises'>('lessons');
    const [readerLesson,    setReaderLesson]    = useState<any | null>(null);
    const [blocNotesLesson, setBlocNotesLesson] = useState<any | null>(null);
    const [activeExercise,setActiveExercise]= useState<any | null>(null);

    // ── Dispute ──
    const [disputeTarget, setDisputeTarget] = useState<any | null>(null);
    const [disputeMsg,    setDisputeMsg]    = useState('');
    const [sendingDispute,setSendingDispute]= useState(false);
    const [myDisputes,    setMyDisputes]    = useState<any[]>([]); // réclamations envoyées par cet étudiant

    // ── Bloc Notes ──
    const [notedLessonIds, setNotedLessonIds] = useState<string[]>([]);
    // ── Video popup (Feature 3) ──
    const [videoPopup, setVideoPopup] = useState<{ url: string; title: string; contentId: string; contentType: 'chapter' | 'lesson' } | null>(null);
    const [videoNote, setVideoNote] = useState('');
    const [videoStartTime, setVideoStartTime] = useState<number>(0);
    // ── Vues dédiées (Feature 4 shortcuts) ──
    const [showProgressionView, setShowProgressionView] = useState(false);
    const [showExercisesView,   setShowExercisesView]   = useState(false);

    // ── Traduction IziTeach IA & Mes cours traduits ──
    const [showTranslatedCoursesModal, setShowTranslatedCoursesModal] = useState(false);
    const [translationDialog, setTranslationDialog] = useState<{
        isOpen: boolean;
        itemId: string;
        type: 'lesson' | 'chapter';
        title: string;
        rawText: string;
        chapterTitle?: string;
        subjectTitle?: string;
    }>({
        isOpen: false,
        itemId: '',
        type: 'lesson',
        title: '',
        rawText: '',
    });
    const [savedTranslations, setSavedTranslations] = useState<TranslatedItem[]>([]);
    const [activeTranslationTasks, setActiveTranslationTasks] = useState<TranslationTask[]>([]);

    useEffect(() => {
        if (!userId) return;
        setSavedTranslations(getSavedTranslations(userId));
        const unsub = subscribeToTranslationTasks((tasks) => {
            setActiveTranslationTasks(tasks.filter(t => t.status === 'translating'));
        });
        const handleTranslationsChanged = () => {
            setSavedTranslations(getSavedTranslations(userId));
        };
        window.addEventListener('iziteach_translations_changed', handleTranslationsChanged);
        return () => {
            unsub();
            window.removeEventListener('iziteach_translations_changed', handleTranslationsChanged);
        };
    }, [userId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Récupérer les classes & filières de l'étudiant (principale + additionnelles)
            const { data: profile } = await supabase.from('student_profiles')
                .select('classroom_id, additional_classroom_ids, filiere_ids')
                .eq('id', userId)
                .maybeSingle();

            const allClassIds = Array.from(new Set([
                classroomId,
                profile?.classroom_id,
                ...(profile?.additional_classroom_ids || [])
            ].filter(Boolean) as string[]));

            let stuClasses: any[] = [];
            if (allClassIds.length > 0) {
                const { data: clsData } = await supabase.from('classrooms')
                    .select('id, name, level, filiere_id')
                    .in('id', allClassIds);
                stuClasses = clsData || [];
            }
            setStudentClasses(stuClasses);

            const activeClassId = selectedClassId || (stuClasses.length > 0 ? stuClasses[0].id : classroomId);

            let subs: any[] = [];
            // Priorité 1 : par activeClassId
            if (activeClassId) {
                const { data } = await supabase.from('subjects')
                    .select('*, teacher_profiles:teacher_id(first_name, last_name, photo_url)')
                    .eq('classroom_id', activeClassId).order('name');
                subs = data || [];
            } else if (allClassIds.length > 0) {
                const { data } = await supabase.from('subjects')
                    .select('*, teacher_profiles:teacher_id(first_name, last_name, photo_url)')
                    .in('classroom_id', allClassIds).order('name');
                subs = data || [];
            } else if (filiereId) {
                const { data: filCls } = await supabase.from('classrooms')
                    .select('id').eq('filiere_id', filiereId).eq('organization_id', orgId);
                const filClsIds = (filCls || []).map((c: any) => c.id);
                if (filClsIds.length > 0) {
                    const { data } = await supabase.from('subjects')
                        .select('*, teacher_profiles:teacher_id(first_name, last_name, photo_url)')
                        .in('classroom_id', filClsIds).order('name');
                    subs = data || [];
                }
            }

            setSubjects(subs);
            if (subs.length === 0) {
                setChapters([]);
                setLessons([]);
                setExercises([]);
                setLoading(false);
                return;
            }

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
            } else {
                setLessons([]);
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

            // Charger les réclamations de l'étudiant + réponses
            const { data: myDisp } = await supabase.from('grade_disputes')
                .select('id, exercise_id, submission_id, message, status, response, resolved_at, created_at')
                .eq('student_id', userId)
                .order('created_at', { ascending: false });
            setMyDisputes(myDisp || []);
        } catch (e: any) { console.error(e); toast.error('Erreur de chargement'); }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [orgId, userId, classroomId, selectedClassId]);

    // ── Load lesson IDs that have notes ───────────────────────────────────────
    useEffect(() => {
        if (!userId) return;
        supabase
            .from('lesson_reader_notes')
            .select('lesson_id')
            .eq('user_id', userId)
            .then(({ data }) => {
                if (data) {
                    const ids = [...new Set(data.map(n => n.lesson_id))] as string[];
                    setNotedLessonIds(ids);
                }
            });
    }, [userId]);

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
        // Vérifier si une réclamation est déjà en cours pour cet exercice
        const existing = myDisputes.find(d => d.exercise_id === disputeTarget.exercise_id && d.status === 'pending');
        if (existing) {
            toast.info('Une réclamation est déjà en attente pour cet exercice');
            return;
        }
        setSendingDispute(true);
        const { data: inserted, error } = await supabase.from('grade_disputes').insert({
            student_id: userId, exercise_id: disputeTarget.exercise_id,
            submission_id: disputeTarget.submission_id, subject_id: disputeTarget.subject_id,
            message: disputeMsg.trim(), organization_id: orgId,
            status: 'pending',
        }).select('id, exercise_id, submission_id, message, status, response, resolved_at, created_at').single();
        if (error) toast.error(error.message);
        else {
            toast.success('Réclamation envoyée ✅');
            if (inserted) setMyDisputes(prev => [inserted, ...prev]);
            setDisputeTarget(null);
            setDisputeMsg('');
        }
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
                    initialShowNotes={false}
                />
            )}
            {/* ── Lesson Reader en mode Bloc Notes ── */}
            {blocNotesLesson && (
                <LessonReader
                    isOpen={true}
                    lesson={blocNotesLesson}
                    onClose={() => setBlocNotesLesson(null)}
                    userId={userId}
                    orgId={orgId}
                    initialShowNotes={true}
                />
            )}

            {/* ── Translation Dialog ── */}
            <TranslationDialog
                isOpen={translationDialog.isOpen}
                onClose={() => setTranslationDialog(prev => ({ ...prev, isOpen: false }))}
                itemId={translationDialog.itemId}
                type={translationDialog.type}
                title={translationDialog.title}
                rawText={translationDialog.rawText}
                userId={userId}
                chapterTitle={translationDialog.chapterTitle}
                subjectTitle={translationDialog.subjectTitle}
                onOpenReader={(item) => {
                    setReaderLesson({
                        id: item.id,
                        title: item.title,
                        content: item.translated_text,
                        content_original: item.original_text,
                        language: item.target_lang,
                        chapter_title: item.chapter_title,
                        subject_title: item.subject_title
                    });
                }}
            />

            {/* ── Modal Mes cours traduits ── */}
            <TranslatedCoursesModal
                isOpen={showTranslatedCoursesModal}
                onClose={() => setShowTranslatedCoursesModal(false)}
                userId={userId}
                onOpenLessonReader={(lessonData) => {
                    setReaderLesson(lessonData);
                }}
            />

            {/* ══════════════════════════════════════════════════════
                VUE PROGRESSION — Toutes les leçons de toutes matières
            ══════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {showProgressionView && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-[#08090f]/95 backdrop-blur-sm flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.08] shrink-0">
                            <button onClick={() => setShowProgressionView(false)}
                                className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                            <div className="flex-1">
                                <h2 className="font-black text-white text-base flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-teal-400" />
                                    Ma Progression
                                </h2>
                                <p className="text-[10px] text-slate-500">
                                    {completedLessons}/{totalLessons} leçons terminées
                                </p>
                            </div>
                            {/* Progress bar global */}
                            <div className="flex items-center gap-2">
                                <div className="w-20 h-2 rounded-full bg-white/[0.08] overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all"
                                        style={{ width: `${totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0}%` }}
                                    />
                                </div>
                                <span className="text-xs font-bold text-teal-400">
                                    {totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0}%
                                </span>
                            </div>
                        </div>

                        {/* Content — groupé par matière */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
                            {subjects.map((sub, subIdx) => {
                                const color = getColor(subIdx);
                                const subChaps = chapters.filter(c => c.subject_id === sub.id);
                                const subLessons = lessons.filter(l => subChaps.some(c => c.id === l.chapter_id));
                                const subDone = subLessons.filter(l => isLessonCompleted(l.id)).length;
                                const subPct = subLessons.length > 0 ? (subDone / subLessons.length) * 100 : 0;
                                if (subLessons.length === 0) return null;
                                return (
                                    <div key={sub.id} className={`rounded-2xl border ${color.border} ${color.bg} overflow-hidden`}>
                                        {/* Matière header */}
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-black ${color.text}`}>{sub.name}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${color.pill}`}>
                                                    {subDone}/{subLessons.length}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                                                    <div className="h-full rounded-full bg-current transition-all" style={{ width: `${subPct}%`, color: color.text.replace('text-', '') }} />
                                                </div>
                                                <span className={`text-[10px] font-bold ${color.text}`}>{Math.round(subPct)}%</span>
                                            </div>
                                        </div>
                                        {/* Leçons groupées par chapitre */}
                                        {subChaps.map(ch => {
                                            const chLsns = lessons.filter(l => l.chapter_id === ch.id);
                                            if (chLsns.length === 0) return null;
                                            return (
                                                <div key={ch.id} className="px-3 py-2">
                                                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1.5 pl-1">
                                                        📂 {ch.title}
                                                    </p>
                                                    <div className="space-y-1">
                                                        {chLsns.map(lesson => {
                                                            const done = isLessonCompleted(lesson.id);
                                                            return (
                                                                <div key={lesson.id}
                                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                                                                    {/* Icône statut */}
                                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-emerald-500/20' : 'bg-white/[0.06]'}`}>
                                                                        {done
                                                                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                                                            : <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                                                                        }
                                                                    </div>
                                                                    {/* Titre */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className={`text-xs font-semibold truncate ${done ? 'text-emerald-300' : 'text-slate-300'}`}>
                                                                            {lesson.title}
                                                                        </p>
                                                                        {done && (
                                                                            <p className="text-[9px] text-emerald-500">✓ Terminée</p>
                                                                        )}
                                                                    </div>
                                                                    {/* Actions */}
                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                        {!done && (
                                                                            <button
                                                                                onClick={() => markLessonDone(lesson.id)}
                                                                                className="text-[9px] px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition-all">
                                                                                Marquer ✓
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            onClick={() => { setShowProgressionView(false); setReaderLesson(lesson); }}
                                                                            className="text-[9px] px-2 py-1 rounded-lg bg-white/[0.06] text-slate-400 hover:text-white border border-white/[0.08] transition-all">
                                                                            Lire
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                            {totalLessons === 0 && (
                                <div className="text-center py-16 text-slate-500">
                                    <span className="text-4xl mb-2 block">📚</span>
                                    <p>Aucune leçon disponible</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════════════════
                VUE EXERCICES — Tous les exercices + rattrapage
            ══════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {showExercisesView && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-[#08090f]/95 backdrop-blur-sm flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.08] shrink-0">
                            <button onClick={() => setShowExercisesView(false)}
                                className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                            <div className="flex-1">
                                <h2 className="font-black text-white text-base flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-violet-400" />
                                    Mes Exercices
                                </h2>
                                <p className="text-[10px] text-slate-500">
                                    {doneExercises}/{totalExercises} exercices complétés
                                </p>
                            </div>
                            {/* Légende rattrapage */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                <RotateCcw className="w-3 h-3 text-orange-400" />
                                <span className="text-[10px] text-orange-300 font-semibold">Rattrapage disponible</span>
                            </div>
                        </div>

                        {/* Content — groupé par matière */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
                            {subjects.map((sub, subIdx) => {
                                const color = getColor(subIdx);
                                const subChaps = chapters.filter(c => c.subject_id === sub.id);
                                const subExs = exercises.filter(e =>
                                    e.subject_id === sub.id ||
                                    subChaps.some(c => c.id === e.chapter_id)
                                );
                                if (subExs.length === 0) return null;
                                const subDone  = subExs.filter(e => getSubmission(e.id)).length;
                                const hasRattrapage = subExs.some(e => e.rattrapage_enabled || e.allow_retry);
                                return (
                                    <div key={sub.id} className={`rounded-2xl border ${color.border} ${color.bg} overflow-hidden`}>
                                        {/* Matière header */}
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-black ${color.text}`}>{sub.name}</span>
                                                {hasRattrapage && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold">
                                                        🔄 Rattrapage
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${color.pill}`}>
                                                {subDone}/{subExs.length}
                                            </span>
                                        </div>

                                        {/* Liste exercices */}
                                        <div className="px-3 py-2 space-y-1.5">
                                            {subExs.map(ex => {
                                                const sub2 = getSubmission(ex.id);
                                                const isRattrapage = ex.rattrapage_enabled || ex.allow_retry;
                                                const score20 = sub2 && ex.max_score
                                                    ? ((sub2.score / ex.max_score) * 20).toFixed(1)
                                                    : null;
                                                const dispute = myDisputes.find(d => d.exercise_id === ex.id);
                                                return (
                                                    <div key={ex.id}
                                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                                                            isRattrapage
                                                                ? 'bg-orange-500/[0.06] border-orange-500/20'
                                                                : 'bg-white/[0.04] border-white/[0.05]'
                                                        }`}>
                                                        {/* Statut */}
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                                            sub2 ? 'bg-emerald-500/20' : isRattrapage ? 'bg-orange-500/20' : 'bg-white/[0.06]'
                                                        }`}>
                                                            {sub2
                                                                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                                                : isRattrapage
                                                                    ? <RotateCcw className="w-3.5 h-3.5 text-orange-400" />
                                                                    : <FileText className="w-3.5 h-3.5 text-slate-500" />
                                                            }
                                                        </div>

                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <p className="text-xs font-semibold text-slate-200 truncate">{ex.title}</p>
                                                                {isRattrapage && (
                                                                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-orange-500/25 text-orange-300 font-bold shrink-0">
                                                                        🔄 Rattrapage
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                {sub2 ? (
                                                                    <span className="text-[10px] text-emerald-400 font-semibold">
                                                                        ✓ {score20 ? `${score20}/20` : 'Soumis'}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] text-slate-500">Non soumis</span>
                                                                )}
                                                                {dispute && (
                                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                                                                        dispute.status === 'pending'  ? 'bg-yellow-500/20 text-yellow-400' :
                                                                        dispute.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                        'bg-red-500/20 text-red-400'
                                                                    }`}>
                                                                        {dispute.status === 'pending' ? '⏳ Réclamation' :
                                                                         dispute.status === 'accepted' ? '✅ Acceptée' : '❌ Rejetée'}
                                                                    </span>
                                                                )}
                                                                {ex.max_score && (
                                                                    <span className="text-[9px] text-slate-600">/{ex.max_score} pts</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Action */}
                                                        {(!sub2 || isRattrapage) && (
                                                            <button
                                                                onClick={() => { setShowExercisesView(false); setActiveExercise(ex); }}
                                                                className={`shrink-0 text-[9px] px-2.5 py-1.5 rounded-lg border transition-all font-semibold ${
                                                                    isRattrapage
                                                                        ? 'bg-orange-500/20 border-orange-500/30 text-orange-300 hover:bg-orange-500/30'
                                                                        : 'bg-violet-500/20 border-violet-500/30 text-violet-300 hover:bg-violet-500/30'
                                                                }`}>
                                                                {sub2 ? '🔄 Refaire' : '▶ Commencer'}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                            {totalExercises === 0 && (
                                <div className="text-center py-16 text-slate-500">
                                    <span className="text-4xl mb-2 block">📝</span>
                                    <p>Aucun exercice disponible</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Overview cards ── */}
            <div className="grid grid-cols-2 gap-2.5">
                {[
                    { label: 'Moyenne',    value: overall !== null ? `${overall.toFixed(1)}/20` : '—', sub: 'toutes matières',   color: 'indigo', icon: BarChart3,  action: () => { const ev = new CustomEvent('campus-navigate', { detail: 'bulletin' }); window.dispatchEvent(ev); } },
                    { label: 'Sky Points', value: skyPoints,                                             sub: 'points accumulés',  color: 'amber',  icon: Star,      action: undefined },
                    { label: 'Progression',value: `${completedLessons}/${totalLessons}`,                sub: 'leçons terminées',  color: 'teal',   pct: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0, icon: TrendingUp, action: () => setShowProgressionView(true) },
                    { label: 'Exercices',  value: `${doneExercises}/${totalExercises}`,                 sub: 'complétés',         color: 'violet', pct: totalExercises > 0 ? (doneExercises / totalExercises) * 100 : 0, icon: Zap,        action: () => setShowExercisesView(true) },
                ].map((card, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                        onClick={card.action}
                        className={cn('rounded-2xl border p-4',
                            card.action ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform' : '',
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

            {/* ── Active Background Translation Tasks Banner ── */}
            {activeTranslationTasks.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-teal-950/60 to-emerald-950/70 border border-emerald-500/40 shadow-xl space-y-2.5"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                            <span>Traductions IziTeach IA en cours ({activeTranslationTasks.length} tâche{activeTranslationTasks.length > 1 ? 's' : ''} active{activeTranslationTasks.length > 1 ? 's' : ''})</span>
                        </div>
                        <button
                            onClick={() => setShowTranslatedCoursesModal(true)}
                            className="text-[11px] text-emerald-300 hover:text-white underline font-semibold flex items-center gap-1"
                        >
                            <span>Mes cours traduits</span>
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeTranslationTasks.map(task => (
                            <div key={task.id} className="space-y-1 bg-black/40 p-2.5 rounded-xl border border-emerald-500/20">
                                <div className="flex items-center justify-between text-[11px] text-slate-200">
                                    <span className="truncate max-w-[200px] font-medium">{task.title} → <strong className="text-emerald-300">{task.targetLangNative}</strong></span>
                                    <span className="font-mono text-emerald-400 font-bold">{task.progress}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300" style={{ width: `${task.progress}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-[11px] text-slate-400 italic text-center">
                        ⏳ Veuillez patienter ! Vous pouvez continuer à naviguer dans l'application, les traductions ne seront pas interrompues.
                    </p>
                </motion.div>
            )}

            {/* ═══ DUAL CARDS: BLOC NOTES & MES COURS TRADUITS ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ── CARD 1: BLOC NOTES ── */}
                {(() => {
                    const notedLessons = lessons.filter(l => notedLessonIds.includes(l.id));
                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 p-4 flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                            <StickyNote className="w-4 h-4 text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white">Bloc Notes</p>
                                            <p className="text-[10px] text-slate-500">
                                                {notedLessons.length > 0
                                                    ? `${notedLessons.length} leçon${notedLessons.length > 1 ? 's' : ''} avec notes`
                                                    : 'Aucune note encore'}
                                            </p>
                                        </div>
                                    </div>
                                    {notedLessons.length > 0 && (
                                        <span className="text-[10px] text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-full font-semibold">
                                            {notedLessons.length}
                                        </span>
                                    )}
                                </div>

                                {notedLessons.length === 0 ? (
                                    <div className="flex items-center gap-2 py-2">
                                        <p className="text-[11px] text-slate-600">
                                            Cliquez sur 📝 dans une leçon pour prendre des notes. Elles apparaissent ici.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {notedLessons.slice(0, 4).map(l => {
                                            const ch = chapters.find(c => c.id === l.chapter_id);
                                            const sub = ch ? subjects.find(s => s.id === ch.subject_id) : null;
                                            return (
                                                <motion.button
                                                    key={l.id}
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={() => setBlocNotesLesson({ ...l, chapter_title: ch?.title, subject_title: sub?.name })}
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all group"
                                                >
                                                    <StickyNote className="w-3 h-3 text-indigo-400 group-hover:scale-110 transition-transform" />
                                                    <span className="text-[11px] font-semibold text-indigo-300 max-w-[120px] truncate">{l.title}</span>
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })()}

                {/* ── CARD 2: MES COURS TRADUITS ── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                    className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-emerald-500/5 p-4 flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                    <Globe className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-white flex items-center gap-1.5">
                                        <span>Mes cours traduits</span>
                                        <Sparkles className="w-3 h-3 text-emerald-400" />
                                    </p>
                                    <p className="text-[10px] text-slate-500">
                                        {savedTranslations.length > 0
                                            ? `${savedTranslations.length} contenu${savedTranslations.length > 1 ? 's' : ''} hors-ligne`
                                            : 'Aucune traduction encore'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowTranslatedCoursesModal(true)}
                                className="text-[10px] text-emerald-300 hover:text-white bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold transition flex items-center gap-1"
                            >
                                <span>Ouvrir</span>
                                <span>({savedTranslations.length})</span>
                            </button>
                        </div>

                        {savedTranslations.length === 0 ? (
                            <div className="flex items-center gap-2 py-2">
                                <p className="text-[11px] text-slate-600">
                                    Cliquez sur 🌍 Traduire sur une leçon ou un chapitre pour générer une traduction avec IziTeach IA.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {savedTranslations.slice(0, 4).map(item => (
                                    <button
                                        key={`${item.id}_${item.target_lang}`}
                                        onClick={() => setShowTranslatedCoursesModal(true)}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-left group"
                                    >
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                            {item.target_lang_native}
                                        </span>
                                        <span className="text-[11px] font-semibold text-slate-200 max-w-[110px] truncate group-hover:text-emerald-300">
                                            {item.title}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* ── Sélecteur de Filières / Classes (si étudiant multi-filières ou multi-classes) ── */}
            {studentClasses.length > 1 && (
                <ClassSelectorCards
                    classes={studentClasses}
                    subjects={subjects}
                    chapters={chapters}
                    lessons={lessons}
                    selectedClassId={selectedClassId || studentClasses[0]?.id}
                    onSelectClass={(clsId) => {
                        setSelectedClassId(clsId);
                        setSelectedSubId(null);
                        setSelectedChId(null);
                    }}
                    role="student"
                    title="Mes Filières & Classes"
                    subtitle="Basculez entre vos filières pour consulter leurs matières respectives"
                />
            )}

            {/* ══════════════ MILLER COLUMNS ══════════════ */}
            <div className="rounded-2xl overflow-hidden border border-white/[0.07] bg-[#0c0e16]">

                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
                    <button onClick={() => { setSelectedSubId(null); setSelectedChId(null); }}
                        className={cn('text-xs font-semibold transition-colors', !selectedSubId ? 'text-white' : 'text-slate-500 hover:text-slate-300')}>
                        📚 {selectedClassId ? (studentClasses.find(c => c.id === selectedClassId)?.name || 'Mes Matières') : 'Mes Matières'}
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
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                {selectedClassId ? `Matières — ${studentClasses.find(c => c.id === selectedClassId)?.name || 'Filière'}` : 'Toutes les matières'}
                            </span>
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
                                        const chDrip  = isContentUnlocked(ch);

                                        return (
                                            <motion.button key={ch.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ci * 0.04 }}
                                                onClick={() => {
                                                    if (!chDrip.isUnlocked) {
                                                        toast.info(chDrip.reason || 'Ce chapitre n\'est pas encore disponible');
                                                        return;
                                                    }
                                                    setSelectedChId(ch.id);
                                                    setActiveTab('lessons');
                                                }}
                                                className={cn('w-full text-left rounded-2xl border p-4 transition-all group',
                                                    !chDrip.isUnlocked
                                                        ? 'border-amber-500/20 bg-amber-500/[0.03] opacity-80 cursor-pointer'
                                                        : 'border-white/[0.08] bg-white/[0.03] hover:border-teal-500/30 hover:bg-teal-500/[0.05] hover:scale-[1.01]')}>
                                                <div className="flex items-center gap-3">
                                                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                                                        !chDrip.isUnlocked ? 'bg-amber-500/15 text-amber-400' : 'bg-teal-500/15 text-teal-400')}>
                                                        {!chDrip.isUnlocked ? <Lock className="w-4 h-4" /> : <span className="text-sm font-black">{ci + 1}</span>}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="text-sm font-bold text-white leading-tight">{ch.title}</p>
                                                            {!chDrip.isUnlocked && chDrip.statusBadgeLabel && (
                                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                                                    🔒 {chDrip.statusBadgeLabel}
                                                                </span>
                                                            )}
                                                        </div>
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

                        {/* ── Contenu du chapitre (si le prof a ajouté du texte/média directement) ── */}
                        {selectedCh?.content && (
                            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-indigo-400" />
                                        <span className="text-xs font-semibold text-white">Contenu du chapitre</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            let rawText = '';
                                            try {
                                                const blocks = JSON.parse(selectedCh.content || '[]');
                                                if (Array.isArray(blocks)) {
                                                    rawText = blocks.map((b: any) => b.value || '').join('\n\n');
                                                } else {
                                                    rawText = selectedCh.content || '';
                                                }
                                            } catch {
                                                rawText = selectedCh.content || '';
                                            }
                                            setTranslationDialog({
                                                isOpen: true,
                                                itemId: selectedCh.id,
                                                type: 'chapter',
                                                title: selectedCh.title,
                                                rawText,
                                                chapterTitle: selectedCh.title,
                                                subjectTitle: selectedSub?.name
                                            });
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 text-xs font-semibold transition-all shadow-sm"
                                        title="Traduire le contenu et l'introduction du chapitre avec IziTeach IA"
                                    >
                                        <Globe className="w-3.5 h-3.5" />
                                        <span>Traduire le chapitre</span>
                                    </button>
                                </div>
                                <div className="px-4 py-4">
                                    <RichContentRenderer
                                        content={selectedCh.content}
                                        onAudioDownload={async (block) => {
                                            const ok = await deductSkyPoints(
                                                userId, block.sky_cost ?? 2,
                                                'telechargement_audio',
                                                'Téléchargement note vocale',
                                                'student'
                                            );
                                            if (!ok) { toast.error('Sky Points insuffisants'); return false; }
                                            toast.success('-2 Sky Points déduits');
                                            onSkyUpdate(-2);
                                            return true;
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── Vidéo du chapitre (si présente) ── */}
                        {selectedCh?.video_url && (
                            <button
                                onClick={async () => {
                                    setVideoPopup({ url: selectedCh.video_url, title: selectedCh.title, contentId: selectedCh.id, contentType: 'chapter' });
                                    setVideoNote('');
                                    setVideoStartTime(Date.now());
                                    await supabase.from('lesson_video_views').upsert(
                                        { user_id: userId, content_type: 'chapter', content_id: selectedCh.id, organization_id: orgId, opened_at: new Date().toISOString() },
                                        { onConflict: 'user_id,content_type,content_id', ignoreDuplicates: false }
                                    );
                                }}
                                className="w-full flex items-center gap-3 p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] hover:bg-indigo-500/10 transition-all group">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/30 transition-all">
                                    <Play className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-semibold text-white">Vidéo du chapitre</p>
                                    <p className="text-[11px] text-slate-500">Cliquer pour regarder</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                            </button>
                        )}

                        {/* Tab switcher (leçons / exercices) */}
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
                                    <div className="text-center py-8">
                                        <FileText className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                                        <p className="text-slate-500 text-sm">
                                            {selectedCh?.content ? 'Consultez le contenu ci-dessus' : 'Aucune leçon publiée'}
                                        </p>
                                    </div>
                                )}

                                {chLessons.map((lesson: any, li: number) => {
                                    const done = isLessonCompleted(lesson.id);
                                    const lessonDrip = isContentUnlocked(lesson);
                                    const isTranslated = savedTranslations.some(t => t.id === lesson.id);

                                    return (
                                        <motion.div
                                            key={lesson.id}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: li * 0.04 }}
                                            className={cn(
                                                'rounded-2xl border p-3.5 transition-all space-y-3',
                                                !lessonDrip.isUnlocked
                                                    ? 'border-amber-500/20 bg-amber-500/[0.03]'
                                                    : done
                                                        ? 'border-emerald-500/25 bg-emerald-500/[0.04]'
                                                        : 'border-white/[0.08] bg-white/[0.03] hover:border-white/15'
                                            )}
                                        >
                                            {/* ── En-tête : Icône + Titre complet + Badges ── */}
                                            <div className="flex items-start gap-3">
                                                <div className={cn(
                                                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                                                    !lessonDrip.isUnlocked
                                                        ? 'bg-amber-500/15 text-amber-400'
                                                        : done
                                                            ? 'bg-emerald-500/20 text-emerald-400'
                                                            : 'bg-indigo-500/15 text-indigo-400'
                                                )}>
                                                    {!lessonDrip.isUnlocked ? (
                                                        <Lock className="w-4 h-4" />
                                                    ) : done ? (
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    ) : (
                                                        <BookOpen className="w-4 h-4" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h4 className="text-sm font-bold text-white leading-snug break-words">
                                                            {lesson.title}
                                                        </h4>
                                                        <div className="shrink-0">
                                                            <DiscussButton
                                                                context={{ type: 'lesson', id: lesson.id, title: lesson.title, parentTitle: selectedCh?.title }}
                                                                orgId={orgId}
                                                                userId={userId}
                                                                userName={userName}
                                                                onOpenChat={onOpenGroupChat || (() => {})}
                                                                size="xs"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Badges d'informations */}
                                                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                        {!lessonDrip.isUnlocked && lessonDrip.statusBadgeLabel ? (
                                                            <span className="text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                                                                🔒 {lessonDrip.statusBadgeLabel}
                                                            </span>
                                                        ) : null}
                                                        {lesson.estimated_minutes && (
                                                            <span className="text-[10px] text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-md flex items-center gap-1">
                                                                <Clock className="w-2.5 h-2.5 text-slate-500" />
                                                                {lesson.estimated_minutes} min
                                                            </span>
                                                        )}
                                                        {lesson.language && lesson.language !== 'fr' && (
                                                            <span className="text-[9px] font-bold text-violet-300 bg-violet-500/15 border border-violet-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                                🌍 {lesson.language.toUpperCase()}
                                                            </span>
                                                        )}
                                                        {isTranslated && (
                                                            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                                ✨ Traduit
                                                            </span>
                                                        )}
                                                        {done && (
                                                            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                                                ✓ Terminé
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ── Barre d'actions épurée et espacée ── */}
                                            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
                                                {!lessonDrip.isUnlocked ? (
                                                    <div className="w-full text-center text-xs text-amber-400 font-medium py-1.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                                        🔒 Leçon Verrouillée selon le calendrier pédagogique
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* Actions Secondaires : Traduire & Notes */}
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            {lesson.content && (
                                                                <button
                                                                    onClick={() => {
                                                                        let rawText = '';
                                                                        try {
                                                                            const blocks = JSON.parse(lesson.content || '[]');
                                                                            if (Array.isArray(blocks)) {
                                                                                rawText = blocks.map((b: any) => b.value || '').join('\n\n');
                                                                            } else {
                                                                                rawText = lesson.content || '';
                                                                            }
                                                                        } catch {
                                                                            rawText = lesson.content || '';
                                                                        }
                                                                        setTranslationDialog({
                                                                            isOpen: true,
                                                                            itemId: lesson.id,
                                                                            type: 'lesson',
                                                                            title: lesson.title,
                                                                            rawText,
                                                                            chapterTitle: selectedCh?.title,
                                                                            subjectTitle: selectedSub?.name
                                                                        });
                                                                    }}
                                                                    title="Traduire cette leçon avec IziTeach IA"
                                                                    className={cn(
                                                                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-sm",
                                                                        isTranslated
                                                                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30"
                                                                            : "bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20"
                                                                    )}
                                                                >
                                                                    <Globe className="w-3.5 h-3.5" />
                                                                    <span>Traduire</span>
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={() => setBlocNotesLesson({ ...lesson, chapter_title: selectedCh?.title, subject_title: selectedSub?.name })}
                                                                title="Prendre des notes sur cette leçon"
                                                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 text-xs font-semibold transition-all"
                                                            >
                                                                <StickyNote className="w-3.5 h-3.5" />
                                                                <span>Notes</span>
                                                            </button>
                                                        </div>

                                                        {/* Actions Principales : Vidéo, Lire, Fait */}
                                                        <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                                                            {lesson.video_url && (
                                                                <button
                                                                    onClick={async () => {
                                                                        setVideoPopup({ url: lesson.video_url, title: lesson.title, contentId: lesson.id, contentType: 'lesson' });
                                                                        setVideoNote('');
                                                                        setVideoStartTime(Date.now());
                                                                        await supabase.from('lesson_video_views').upsert({
                                                                            user_id: userId, content_type: 'lesson', content_id: lesson.id, organization_id: orgId, opened_at: new Date().toISOString()
                                                                        }, { onConflict: 'user_id,content_type,content_id', ignoreDuplicates: false });
                                                                    }}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-bold hover:bg-violet-500/25 transition-all"
                                                                >
                                                                    <Play className="w-3.5 h-3.5" />
                                                                    <span>Vidéo</span>
                                                                </button>
                                                            )}

                                                            {lesson.content && (
                                                                <button
                                                                    onClick={() => setReaderLesson({ ...lesson, chapter_title: selectedCh?.title, subject_title: selectedSub?.name })}
                                                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-950/40"
                                                                >
                                                                    <Maximize2 className="w-3.5 h-3.5" />
                                                                    <span>Lire</span>
                                                                </button>
                                                            )}

                                                            {!done && (
                                                                <button
                                                                    onClick={() => markLessonDone(lesson.id)}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold hover:bg-emerald-500/25 transition-all"
                                                                >
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                    <span>Fait</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
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
                                                    {scored && (
                                                    <div className="flex gap-1">
                                                        <DiscussButton context={{ type: 'exercise', id: ex.id, title: ex.title, parentTitle: selectedCh?.title }}
                                                            orgId={orgId} userId={userId} userName={userName}
                                                            onOpenChat={onOpenGroupChat || (() => {})} size="xs" />
                                                        {(() => {
                                                            const existingDisp = myDisputes.find(d => d.exercise_id === ex.id);
                                                            if (existingDisp) {
                                                                const badgeStyle = existingDisp.status === 'pending'
                                                                    ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                                                                    : existingDisp.status === 'accepted'
                                                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                                                    : 'bg-red-500/20 text-red-300 border-red-500/30';
                                                                const badgeLabel = existingDisp.status === 'pending' ? '🕐 En attente'
                                                                    : existingDisp.status === 'accepted' ? '✅ Acceptée'
                                                                    : '❌ Rejetée';
                                                                return (
                                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold ${badgeStyle}`}>
                                                                        {badgeLabel}
                                                                    </span>
                                                                );
                                                            }
                                                            return (
                                                                <button
                                                                    onClick={() => setDisputeTarget({ exercise_id: ex.id, submission_id: sub2.id, subject_id: selectedSubId, title: ex.title })}
                                                                    className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-all"
                                                                    title="Contester la note"
                                                                >
                                                                    <Flag className="w-3 h-3" />
                                                                </button>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
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
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-white">Réclamation de note</h3>
                                    <p className="text-xs text-slate-500 truncate">{disputeTarget.title}</p>
                                </div>
                                <button onClick={() => setDisputeTarget(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                            </div>

                            {/* Historique des réclamations pour cet exercice */}
                            {(() => {
                                const existing = myDisputes.filter(d => d.exercise_id === disputeTarget.exercise_id);
                                if (existing.length > 0) {
                                    return (
                                        <div className="space-y-2 mb-4">
                                            {existing.map((d: any) => (
                                                <div key={d.id} className={cn('rounded-xl p-3 border text-xs',
                                                    d.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20' :
                                                    d.status === 'accepted' ? 'bg-emerald-500/10 border-emerald-500/20' :
                                                    'bg-red-500/10 border-red-500/20')}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-semibold text-white">Votre message :</span>
                                                        <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-bold',
                                                            d.status === 'pending' ? 'bg-amber-500/20 text-amber-300' :
                                                            d.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300')}>
                                                            {d.status === 'pending' ? '⏳ En attente' : d.status === 'accepted' ? '✅ Acceptée' : '❌ Rejetée'}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-300 italic">« {d.message} »</p>
                                                    {d.response && (
                                                        <div className="mt-2 pt-2 border-t border-white/10">
                                                            <p className="text-slate-400">Réponse de l'admin : <span className="text-white">{d.response}</span></p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            {/* Nouvelle réclamation si pas encore pending */}
                            {!myDisputes.find(d => d.exercise_id === disputeTarget.exercise_id && d.status === 'pending') && (
                                <>
                                    <Textarea value={disputeMsg} onChange={e => setDisputeMsg(e.target.value)}
                                        placeholder="Expliquez pourquoi vous contestez cette note..."
                                        className="bg-white/[0.04] border-white/10 text-white placeholder:text-slate-600 resize-none rounded-xl mb-4" rows={4} />
                                    <Button onClick={sendDispute} disabled={sendingDispute || !disputeMsg.trim()}
                                        className="w-full bg-orange-600 hover:bg-orange-500 text-white rounded-xl">
                                        {sendingDispute ? 'Envoi...' : <><Send className="w-4 h-4 mr-2" />Envoyer la réclamation</>}
                                    </Button>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ VIDEO POPUP MODAL (Feature 3) ═══ */}
            <AnimatePresence>
                {videoPopup && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] bg-black/90 flex flex-col"
                        onClick={() => {
                            // Save duration when closing
                            const duration = Math.floor((Date.now() - videoStartTime) / 1000);
                            if (duration > 2) {
                                supabase.from('lesson_video_views').upsert({
                                    user_id: userId,
                                    content_type: videoPopup.contentType,
                                    content_id: videoPopup.contentId,
                                    organization_id: orgId,
                                    duration_seconds: duration,
                                    last_position_seconds: duration,
                                    updated_at: new Date().toISOString(),
                                }, { onConflict: 'user_id,content_type,content_id' });
                            }
                            setVideoPopup(null);
                        }}>
                        {/* Header */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#0B0E14]"
                            onClick={e => e.stopPropagation()}>
                            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                                <span className="text-base">🎦</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{videoPopup.title}</p>
                                <p className="text-[10px] text-slate-500">Vidéo de cours</p>
                            </div>
                            <button onClick={() => {
                                const duration = Math.floor((Date.now() - videoStartTime) / 1000);
                                if (duration > 2) {
                                    supabase.from('lesson_video_views').upsert({
                                        user_id: userId, content_type: videoPopup.contentType, content_id: videoPopup.contentId,
                                        organization_id: orgId, duration_seconds: duration, updated_at: new Date().toISOString(),
                                    }, { onConflict: 'user_id,content_type,content_id' });
                                }
                                setVideoPopup(null);
                            }} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Video Player */}
                        <div className="flex-1 overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="relative w-full bg-black" style={{ paddingBottom: '56.25%' }}>
                                <iframe
                                    className="absolute inset-0 w-full h-full"
                                    src={(() => {
                                        const url = videoPopup.url;
                                        // Convert YouTube watch?v= to embed
                                        const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
                                        if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
                                        // Convert Vimeo
                                        const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
                                        if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
                                        return url;
                                    })()}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    title={videoPopup.title}
                                />
                            </div>

                            {/* Notes Section */}
                            <div className="p-4 space-y-3 bg-[#0B0E14]">
                                <div className="flex items-center gap-2">
                                    <StickyNote className="w-4 h-4 text-indigo-400" />
                                    <span className="text-sm font-semibold text-white">Prendre des notes</span>
                                </div>
                                <Textarea
                                    value={videoNote}
                                    onChange={e => setVideoNote(e.target.value)}
                                    placeholder="Écris tes notes sur cette vidéo..."
                                    className="bg-white/[0.04] border-white/10 text-white placeholder:text-slate-600 resize-none rounded-xl min-h-[120px]"
                                    rows={5}
                                />
                                <Button
                                    onClick={async () => {
                                        if (!videoNote.trim()) return;
                                        await supabase.from('lesson_notes').upsert({
                                            user_id: userId,
                                            lesson_id: videoPopup.contentId,
                                            organization_id: orgId,
                                            note_text: `[Vidéo] ${videoNote.trim()}`,
                                            updated_at: new Date().toISOString(),
                                        }, { onConflict: 'user_id,lesson_id' });
                                        toast.success('Notes sauvegardées ✅');
                                        setVideoNote('');
                                    }}
                                    disabled={!videoNote.trim()}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl"
                                >
                                    <Save className="w-4 h-4 mr-2" /> Sauvegarder les notes
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
