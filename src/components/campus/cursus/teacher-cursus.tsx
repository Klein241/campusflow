'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, X, Save, Trash2, Eye, EyeOff,
    BookOpen, FileText, Upload, Layers,
    Timer, GraduationCap, BarChart3, CheckCircle2,
    AlertCircle, Edit2, Send, Flag, MessageSquare, Star, Loader2,
    ChevronRight, ChevronLeft, Zap, Target, Users, TrendingUp,
    PenLine, Play, Lock, Unlock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/compress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RichContentEditor, parseContent, serializeContent, type ContentBlock } from './rich-content-editor';
import { DiscussButton } from '../discuss-button';

// ─── Helper: envoyer une notification push via le Worker ────────────────────
const WORKER_URL = process.env.NEXT_PUBLIC_NOTIFICATION_WORKER_URL || process.env.NEXT_PUBLIC_WORKER_URL || '';

async function sendCursusNotification(params: {
    actorId: string; actorName: string; orgId: string;
    actionType: 'new_subject' | 'new_chapter' | 'new_lesson';
    targetId: string; targetName: string; recipientIds?: string[];
}) {
    if (!WORKER_URL) return;
    const { actorId, actorName, orgId, actionType, targetId, targetName, recipientIds } = params;
    if (!recipientIds || recipientIds.length === 0) return;
    const titles: Record<string, string> = {
        new_subject: '📚 Nouvelle matière ajoutée',
        new_chapter: '📖 Nouveau chapitre disponible',
        new_lesson:  '📝 Nouvelle leçon disponible',
    };
    const bodies: Record<string, string> = {
        new_subject: `La matière "${targetName}" est maintenant disponible`,
        new_chapter: `Nouveau chapitre : "${targetName}"`,
        new_lesson:  `Nouvelle leçon : "${targetName}"`,
    };
    try {
        await fetch(`${WORKER_URL}/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action_type: 'admin_announcement', actor_id: actorId, actor_name: actorName,
                recipient_ids: recipientIds, target_id: targetId, target_name: targetName,
                extra_data: { push_title: titles[actionType], push_body: bodies[actionType], org_id: orgId, tab: 'cursus' },
            }),
        });
    } catch {}
}

// ─── Palette de couleurs par index de matière ──────────────────────────────
const SUBJECT_COLORS = [
    { bg: 'bg-violet-500/15', border: 'border-violet-500/30', text: 'text-violet-300', dot: 'bg-violet-400', glow: 'shadow-violet-500/20', ring: 'ring-violet-500/40' },
    { bg: 'bg-cyan-500/15',   border: 'border-cyan-500/30',   text: 'text-cyan-300',   dot: 'bg-cyan-400',   glow: 'shadow-cyan-500/20',   ring: 'ring-cyan-500/40'   },
    { bg: 'bg-amber-500/15',  border: 'border-amber-500/30',  text: 'text-amber-300',  dot: 'bg-amber-400',  glow: 'shadow-amber-500/20',  ring: 'ring-amber-500/40'  },
    { bg: 'bg-rose-500/15',   border: 'border-rose-500/30',   text: 'text-rose-300',   dot: 'bg-rose-400',   glow: 'shadow-rose-500/20',   ring: 'ring-rose-500/40'   },
    { bg: 'bg-emerald-500/15',border: 'border-emerald-500/30',text: 'text-emerald-300',dot: 'bg-emerald-400',glow: 'shadow-emerald-500/20',ring: 'ring-emerald-500/40'},
    { bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-300', dot: 'bg-orange-400', glow: 'shadow-orange-500/20', ring: 'ring-orange-500/40' },
    { bg: 'bg-pink-500/15',   border: 'border-pink-500/30',   text: 'text-pink-300',   dot: 'bg-pink-400',   glow: 'shadow-pink-500/20',   ring: 'ring-pink-500/40'   },
    { bg: 'bg-teal-500/15',   border: 'border-teal-500/30',   text: 'text-teal-300',   dot: 'bg-teal-400',   glow: 'shadow-teal-500/20',   ring: 'ring-teal-500/40'   },
];

interface TeacherCursusProps {
    orgId: string; userId: string; userName: string;
    allClasses: any[];
    onStartDM?: (targetId: string, name: string) => void;
    onOpenGroupChat?: (convId: string, convName: string) => void;
}

export function TeacherCursus({ orgId, userId, userName, allClasses, onStartDM, onOpenGroupChat }: TeacherCursusProps) {
    const [subjects,    setSubjects]    = useState<any[]>([]);
    const [chapters,    setChapters]    = useState<any[]>([]);
    const [lessons,     setLessons]     = useState<any[]>([]);
    const [exercises,   setExercises]   = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [disputes,    setDisputes]    = useState<any[]>([]);
    const [loading,     setLoading]     = useState(true);

    // ── Navigation 3 colonnes ──
    const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
    const [selectedChId,  setSelectedChId]  = useState<string | null>(null);
    const [activeTab,     setActiveTab]     = useState<'lessons' | 'exercises'>('lessons');

    // ── Modales d'ajout ──
    const [showNewSub,    setShowNewSub]    = useState(false);
    const [subForm,       setSubForm]       = useState({ name: '', coefficient: '1', classroom_id: '' });
    const [savingSub,     setSavingSub]     = useState(false);
    const [showNewCh,     setShowNewCh]     = useState(false);
    const [chForm,        setChForm]        = useState<{ title: string; description: string; contentBlocks: ContentBlock[] }>({ title: '', description: '', contentBlocks: [] });
    const [savingCh,      setSavingCh]      = useState(false);
    const [showNewLesson, setShowNewLesson] = useState(false);
    const [lessonForm,    setLessonForm]    = useState<{ title: string; contentBlocks: ContentBlock[]; estimated_minutes: string }>({ title: '', contentBlocks: [], estimated_minutes: '15' });
    const [savingLesson,  setSavingLesson]  = useState(false);
    const [showNewEx,     setShowNewEx]     = useState(false);
    const [exForm,        setExForm]        = useState({ title: '', type: 'qcm', duration_minutes: 10, max_score: 20, questions: [] as any[] });
    const [newQ,          setNewQ]          = useState({ question: '', answer: '', options: ['', '', '', ''] });
    const [savingEx,      setSavingEx]      = useState(false);

    // ── Édition inline ──
    const [editCh,        setEditCh]        = useState<string | null>(null);
    const [editChBlocks,  setEditChBlocks]  = useState<ContentBlock[]>([]);
    const [editLesson,    setEditLesson]    = useState<string | null>(null);
    const [editLessonBlocks, setEditLessonBlocks] = useState<ContentBlock[]>([]);
    const [editEx,        setEditEx]        = useState<any | null>(null);
    const [editExForm,    setEditExForm]    = useState({ title: '', type: 'qcm', duration_minutes: 10, max_score: 20, questions: [] as any[] });
    const [editNewQ,      setEditNewQ]      = useState({ question: '', answer: '', options: ['', '', '', ''] });
    const [savingEditEx,  setSavingEditEx]  = useState(false);

    const loadData = async () => {
        setLoading(true);
        const { data: subs } = await supabase.from('subjects')
            .select('*, classrooms:classroom_id(id, name)').eq('organization_id', orgId).eq('teacher_id', userId);
        const allSubs = subs || [];
        setSubjects(allSubs);
        const subjectIds = allSubs.map((s: any) => s.id);
        if (subjectIds.length > 0) {
            const { data: chaps } = await supabase.from('chapters').select('*').in('subject_id', subjectIds).order('position');
            setChapters(chaps || []);
            const chapterIds = (chaps || []).map((c: any) => c.id);
            if (chapterIds.length > 0) {
                const { data: lsns } = await supabase.from('lessons').select('*').in('chapter_id', chapterIds).order('position');
                setLessons(lsns || []);
            }
            let allExs: any[] = [];
            if (chapterIds.length > 0 && subjectIds.length > 0) {
                const { data: exsByChap } = await supabase.from('exercises').select('*').or(`chapter_id.in.(${chapterIds.join(',')}),subject_id.in.(${subjectIds.join(',')})`);
                allExs = exsByChap || [];
            } else if (subjectIds.length > 0) {
                const { data: exsBySub } = await supabase.from('exercises').select('*').in('subject_id', subjectIds);
                allExs = exsBySub || [];
            }
            setExercises(allExs);
            const exIds = allExs.map((e: any) => e.id);
            if (exIds.length > 0) {
                const { data: s2 } = await supabase.from('exercise_submissions').select('*, student_profiles:student_id(first_name, last_name)').in('exercise_id', exIds);
                setSubmissions(s2 || []);
            }
            const { data: disp } = await supabase.from('grade_disputes').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
            setDisputes(disp || []);
        }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [orgId, userId]);

    // ── Derived data ──
    const selectedSub  = subjects.find(s => s.id === selectedSubId);
    const selectedCh   = chapters.find(c => c.id === selectedChId);
    const subChapters  = selectedSubId ? chapters.filter(c => c.subject_id === selectedSubId) : [];
    const chLessons    = selectedChId  ? lessons.filter(l => l.chapter_id === selectedChId) : [];
    const chExercises  = selectedChId  ? exercises.filter(e => e.chapter_id === selectedChId) : [];
    const pendingDisputes = disputes.filter(d => d.status === 'pending');

    // ── Colour helper ──
    const getColor = (idx: number) => SUBJECT_COLORS[idx % SUBJECT_COLORS.length];

    // ═══════════════════════════════ CRUD ═══════════════════════════════════

    const createSubject = async () => {
        if (!subForm.name || !subForm.classroom_id) return toast.error('Remplissez le nom et la classe');
        setSavingSub(true);
        const { data, error } = await supabase.from('subjects').insert({
            name: subForm.name.trim(), coefficient: parseFloat(subForm.coefficient) || 1,
            classroom_id: subForm.classroom_id, organization_id: orgId, teacher_id: userId
        }).select('*, classrooms:classroom_id(id,name)').single();
        if (error) toast.error(error.message);
        else {
            setSubjects(prev => [...prev, data]); setShowNewSub(false);
            setSubForm({ name: '', coefficient: '1', classroom_id: '' }); toast.success('Matière créée ✅');
            const { data: students } = await supabase.from('student_profiles').select('id').eq('classroom_id', subForm.classroom_id).eq('organization_id', orgId);
            if (students?.length) await sendCursusNotification({ actorId: userId, actorName: userName, orgId, actionType: 'new_subject', targetId: data.id, targetName: data.name, recipientIds: students.map((s: any) => s.id) });
        }
        setSavingSub(false);
    };

    const createChapter = async () => {
        if (!chForm.title || !selectedSubId) return;
        setSavingCh(true);
        const pos = subChapters.length;
        const { data, error } = await supabase.from('chapters').insert({
            organization_id: orgId, teacher_id: userId,
            subject_id: selectedSubId, title: chForm.title.trim(), description: chForm.description,
            content: serializeContent(chForm.contentBlocks), status: 'published', position: pos
        }).select().single();
        if (error) toast.error(error.message);
        else {
            setChapters(prev => [...prev, data]); setShowNewCh(false);
            setChForm({ title: '', description: '', contentBlocks: [] }); toast.success('Chapitre ajouté ✅');
            if (selectedSub?.classroom_id) {
                const { data: students } = await supabase.from('student_profiles').select('id').eq('classroom_id', selectedSub.classroom_id).eq('organization_id', orgId);
                if (students?.length) await sendCursusNotification({ actorId: userId, actorName: userName, orgId, actionType: 'new_chapter', targetId: data.id, targetName: data.title, recipientIds: students.map((s: any) => s.id) });
            }
        }
        setSavingCh(false);
    };

    const toggleChapterStatus = async (ch: any) => {
        const newStatus = ch.status === 'published' ? 'draft' : 'published';
        await supabase.from('chapters').update({ status: newStatus }).eq('id', ch.id);
        setChapters(prev => prev.map(c => c.id === ch.id ? { ...c, status: newStatus } : c));
        toast.success(newStatus === 'published' ? '📢 Chapitre publié' : '🔒 Chapitre masqué');
    };

    const saveChapterContent = async (chId: string) => {
        const serialized = serializeContent(editChBlocks);
        const { error } = await supabase.from('chapters').update({ content: serialized }).eq('id', chId);
        if (error) toast.error(error.message);
        else { setChapters(prev => prev.map(c => c.id === chId ? { ...c, content: serialized } : c)); setEditCh(null); toast.success('Contenu mis à jour ✅'); }
    };

    const deleteChapter = async (chId: string) => {
        if (!confirm('Supprimer ce chapitre ?')) return;
        await supabase.from('chapters').delete().eq('id', chId);
        setChapters(prev => prev.filter(c => c.id !== chId));
        setLessons(prev => prev.filter(l => l.chapter_id !== chId));
        if (selectedChId === chId) setSelectedChId(null);
        toast.success('Chapitre supprimé');
    };

    const createLesson = async () => {
        if (!lessonForm.title || !selectedChId) return;
        setSavingLesson(true);
        const pos = chLessons.length;
        const { data, error } = await supabase.from('lessons').insert({
            organization_id: orgId, chapter_id: selectedChId,
            title: lessonForm.title.trim(), content: serializeContent(lessonForm.contentBlocks),
            status: 'published', position: pos, estimated_minutes: parseInt(lessonForm.estimated_minutes) || 15
        }).select().single();
        if (error) toast.error(error.message);
        else {
            setLessons(prev => [...prev, data]); setShowNewLesson(false);
            setLessonForm({ title: '', contentBlocks: [], estimated_minutes: '15' }); toast.success('Leçon ajoutée ✅');
            const chapter = chapters.find((c: any) => c.id === selectedChId);
            const subject = chapter ? subjects.find((s: any) => s.id === chapter.subject_id) : null;
            if (subject?.classroom_id) {
                const { data: students } = await supabase.from('student_profiles').select('id').eq('classroom_id', subject.classroom_id).eq('organization_id', orgId);
                if (students?.length) await sendCursusNotification({ actorId: userId, actorName: userName, orgId, actionType: 'new_lesson', targetId: data.id, targetName: data.title, recipientIds: students.map((s: any) => s.id) });
            }
        }
        setSavingLesson(false);
    };

    const saveLessonContent = async (lId: string) => {
        const serialized = serializeContent(editLessonBlocks);
        const { error } = await supabase.from('lessons').update({ content: serialized }).eq('id', lId);
        if (error) toast.error(error.message);
        else { setLessons(prev => prev.map(l => l.id === lId ? { ...l, content: serialized } : l)); setEditLesson(null); toast.success('Leçon mise à jour ✅'); }
    };

    const deleteLesson = async (lId: string) => {
        if (!confirm('Supprimer cette leçon ?')) return;
        await supabase.from('lessons').delete().eq('id', lId);
        setLessons(prev => prev.filter(l => l.id !== lId));
    };

    const addQuestion = (form: any, setForm: any) => {
        const q = form === exForm ? newQ : editNewQ;
        const setQ = form === exForm ? setNewQ : setEditNewQ;
        if (!q.question) return;
        setForm((p: any) => ({ ...p, questions: [...p.questions, { ...q, options: q.options.filter((o: string) => o.trim()) }] }));
        setQ({ question: '', answer: '', options: ['', '', '', ''] });
    };

    const createExercise = async () => {
        if (!exForm.title || exForm.questions.length === 0 || !selectedChId) return;
        setSavingEx(true);
        const { data, error } = await supabase.from('exercises').insert({
            organization_id: orgId, title: exForm.title, type: exForm.type,
            duration_minutes: exForm.duration_minutes, max_score: exForm.max_score,
            questions: exForm.questions, chapter_id: selectedChId,
        }).select().single();
        if (error) toast.error(error.message);
        else { setExercises(prev => [...prev, data]); setShowNewEx(false); setExForm({ title: '', type: 'qcm', duration_minutes: 10, max_score: 20, questions: [] }); toast.success('Exercice créé ✅'); }
        setSavingEx(false);
    };

    const saveEditExercise = async () => {
        if (!editEx) return;
        setSavingEditEx(true);
        try {
            const { error } = await supabase.from('exercises').update({ title: editExForm.title, type: editExForm.type, duration_minutes: editExForm.duration_minutes, max_score: editExForm.max_score, questions: editExForm.questions }).eq('id', editEx.id);
            if (error) throw error;
            setExercises(prev => prev.map(e => e.id === editEx.id ? { ...e, ...editExForm } : e));
            setEditEx(null); toast.success('Exercice mis à jour ✅');
        } catch (e: any) { toast.error(e.message); }
        setSavingEditEx(false);
    };

    const deleteExercise = async (exId: string) => {
        if (!confirm('Supprimer cet exercice ?')) return;
        await supabase.from('exercises').delete().eq('id', exId);
        setExercises(prev => prev.filter(e => e.id !== exId));
        toast.success('Exercice supprimé');
    };

    const resolveDispute = async (dId: string, status: 'accepted' | 'rejected') => {
        await supabase.from('grade_disputes').update({ status, response: status === 'accepted' ? 'Note révisée' : 'Note maintenue' }).eq('id', dId);
        setDisputes(prev => prev.map(d => d.id === dId ? { ...d, status } : d));
        toast.success(`Réclamation ${status === 'accepted' ? 'acceptée' : 'rejetée'}`);
    };

    if (loading) return (
        <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    // ══════════════════════════════ RENDER ════════════════════════════════

    return (
        <div className="space-y-4">

            {/* ── Stats mini ── */}
            <div className="grid grid-cols-4 gap-2">
                {[
                    { label: 'Matières',  value: subjects.length,    icon: BookOpen,  color: 'violet' },
                    { label: 'Chapitres', value: chapters.length,    icon: Layers,    color: 'cyan'   },
                    { label: 'Leçons',    value: lessons.length,     icon: FileText,  color: 'teal'   },
                    { label: 'Réclamations', value: pendingDisputes.length, icon: Flag, color: pendingDisputes.length > 0 ? 'rose' : 'slate' },
                ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className={cn('rounded-2xl p-3 text-center border',
                            s.color === 'violet' ? 'bg-violet-500/10 border-violet-500/20' :
                            s.color === 'cyan'   ? 'bg-cyan-500/10 border-cyan-500/20' :
                            s.color === 'teal'   ? 'bg-teal-500/10 border-teal-500/20' :
                            s.color === 'rose'   ? 'bg-rose-500/10 border-rose-500/20' :
                            'bg-white/[0.03] border-white/[0.06]')}>
                        <p className="text-xl font-black text-white">{s.value}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">{s.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* ── Disputes alert ── */}
            {pendingDisputes.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-rose-400" />
                        <span className="text-sm font-bold text-rose-300">{pendingDisputes.length} réclamation(s) en attente</span>
                    </div>
                    {pendingDisputes.slice(0, 2).map((d: any) => (
                        <div key={d.id} className="bg-white/[0.04] rounded-xl p-2.5 flex items-center gap-2">
                            <p className="flex-1 text-xs text-white truncate">{d.message}</p>
                            <button onClick={() => resolveDispute(d.id, 'accepted')} className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px]">✓</button>
                            <button onClick={() => resolveDispute(d.id, 'rejected')} className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-[10px]">✗</button>
                        </div>
                    ))}
                </motion.div>
            )}

            {/* ══════════════ MILLER COLUMNS ══════════════ */}
            <div className="rounded-2xl overflow-hidden border border-white/[0.07] bg-[#0c0e16]">

                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
                    <button onClick={() => { setSelectedSubId(null); setSelectedChId(null); }}
                        className={cn('text-xs font-semibold transition-colors', !selectedSubId ? 'text-white' : 'text-slate-500 hover:text-slate-300')}>
                        📚 Cursus
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
                        <div className="flex items-center justify-between mb-1 px-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mes Matières</span>
                            <button onClick={() => setShowNewSub(true)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-600/80 hover:bg-violet-500 text-white text-xs font-semibold transition-all">
                                <Plus className="w-3.5 h-3.5" /> Matière
                            </button>
                        </div>

                        {subjects.length === 0 && !showNewSub && (
                            <div className="text-center py-14">
                                <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                                <p className="text-slate-500 text-sm">Aucune matière</p>
                                <p className="text-xs text-slate-600 mt-1">Créez votre première matière</p>
                            </div>
                        )}

                        {subjects.map((sub: any, si: number) => {
                            const col = getColor(si);
                            const subChaps = chapters.filter(c => c.subject_id === sub.id);
                            const pubChaps = subChaps.filter(c => c.status === 'published').length;
                            const subLessons = lessons.filter(l => subChaps.some(c => c.id === l.chapter_id)).length;
                            return (
                                <motion.button key={sub.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: si * 0.04 }}
                                    onClick={() => { setSelectedSubId(sub.id); setSelectedChId(null); }}
                                    className={cn('w-full text-left rounded-2xl border p-4 transition-all group hover:scale-[1.01]', col.bg, col.border, 'hover:shadow-lg', col.glow)}>
                                    <div className="flex items-center gap-3">
                                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg font-black', col.bg, col.text)}>
                                            {sub.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn('text-sm font-black leading-tight', col.text)}>{sub.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {sub.classrooms && <span className="text-[10px] text-slate-400">{sub.classrooms.name}</span>}
                                                <span className="text-[10px] text-slate-500">Coef. {sub.coefficient || 1}</span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs font-bold text-white">{pubChaps}/{subChaps.length}</p>
                                            <p className="text-[9px] text-slate-500">chapitres</p>
                                            <p className="text-[9px] text-slate-600 mt-0.5">{subLessons} leçons</p>
                                        </div>
                                        <ChevronRight className={cn('w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1', col.text)} />
                                    </div>
                                    {subChaps.length > 0 && (
                                        <div className="mt-3">
                                            <Progress value={(pubChaps / subChaps.length) * 100} className="h-1" />
                                        </div>
                                    )}
                                </motion.button>
                            );
                        })}

                        {/* New Subject form */}
                        <AnimatePresence>
                            {showNewSub && (
                                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                                    className="bg-white/[0.04] border border-violet-500/20 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-sm text-white">Nouvelle matière</h4>
                                        <button onClick={() => setShowNewSub(false)}><X className="w-4 h-4 text-slate-400" /></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label className="text-xs text-slate-400">Nom *</Label>
                                            <Input value={subForm.name} onChange={e => setSubForm(p => ({ ...p, name: e.target.value }))}
                                                placeholder="Mathématiques..." className="mt-1 bg-white/[0.05] border-white/10 text-white h-9 rounded-xl" />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-slate-400">Coefficient</Label>
                                            <Input type="number" value={subForm.coefficient} onChange={e => setSubForm(p => ({ ...p, coefficient: e.target.value }))}
                                                className="mt-1 bg-white/[0.05] border-white/10 text-white h-9 rounded-xl" />
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-400">Classe *</Label>
                                        <select value={subForm.classroom_id} onChange={e => setSubForm(p => ({ ...p, classroom_id: e.target.value }))}
                                            className="mt-1 w-full bg-[#1a1d2e] border border-white/10 text-white text-sm rounded-xl px-3 h-9">
                                            <option value="">Sélectionner une classe...</option>
                                            {allClasses.map((cls: any) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                                        </select>
                                    </div>
                                    <Button onClick={createSubject} disabled={savingSub || !subForm.name || !subForm.classroom_id}
                                        className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-9 text-sm">
                                        {savingSub ? 'Création...' : 'Créer la matière'}
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* ── COL 2: Chapitres ── */}
                {selectedSubId && !selectedChId && (
                    <motion.div key="chapters" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="p-3 space-y-2">
                        {(() => {
                            const si = subjects.findIndex(s => s.id === selectedSubId);
                            const col = getColor(si);
                            return (
                                <>
                                    <div className="flex items-center justify-between mb-1 px-1">
                                        <div className="flex items-center gap-2">
                                            <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black', col.bg, col.text)}>
                                                {selectedSub?.name?.charAt(0)}
                                            </div>
                                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Chapitres</span>
                                        </div>
                                        <button onClick={() => setShowNewCh(true)}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-600/80 hover:bg-cyan-500 text-white text-xs font-semibold transition-all">
                                            <Plus className="w-3.5 h-3.5" /> Chapitre
                                        </button>
                                    </div>

                                    {/* Subject-level exercises */}
                                    <DiscussButton context={{ type: 'subject', id: selectedSubId, title: selectedSub?.name }}
                                        orgId={orgId} userId={userId} userName={userName}
                                        onOpenChat={onOpenGroupChat || (() => {})} size="xs" />

                                    {subChapters.length === 0 && !showNewCh && (
                                        <div className="text-center py-12">
                                            <Layers className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                                            <p className="text-slate-500 text-sm">Aucun chapitre</p>
                                        </div>
                                    )}

                                    {subChapters.map((ch: any, ci: number) => {
                                        const chLsns = lessons.filter(l => l.chapter_id === ch.id).length;
                                        const chExs  = exercises.filter(e => e.chapter_id === ch.id).length;
                                        const pub    = ch.status === 'published';
                                        return (
                                            <motion.div key={ch.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ci * 0.04 }}
                                                className={cn('rounded-2xl border transition-all group overflow-hidden',
                                                    pub ? 'border-cyan-500/25 bg-cyan-500/[0.05]' : 'border-slate-700/40 bg-white/[0.02] opacity-75')}>
                                                <button className="w-full text-left p-3.5 flex items-center gap-3"
                                                    onClick={() => { setSelectedChId(ch.id); setActiveTab('lessons'); }}>
                                                    <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                                                        <span className="text-sm font-black text-cyan-400">{ci + 1}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-white leading-tight">{ch.title}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] text-slate-400">{chLsns} leçon{chLsns > 1 ? 's' : ''}</span>
                                                            {chExs > 0 && <span className="text-[10px] text-violet-400">⚡ {chExs} ex.</span>}
                                                            {!pub && <span className="text-[10px] text-slate-500">🔒 Brouillon</span>}
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0" />
                                                </button>
                                                {/* Toolbar */}
                                                <div className="flex items-center gap-1.5 px-3 pb-3">
                                                    <button onClick={() => toggleChapterStatus(ch)}
                                                        className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all',
                                                            pub ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : 'bg-slate-700/40 text-slate-400 hover:bg-slate-700/60')}>
                                                        {pub ? <><Eye className="w-3 h-3" />Publié</> : <><EyeOff className="w-3 h-3" />Brouillon</>}
                                                    </button>
                                                    <div className="flex-1" />
                                                    <DiscussButton context={{ type: 'chapter', id: ch.id, title: ch.title, parentTitle: selectedSub?.name }}
                                                        orgId={orgId} userId={userId} userName={userName}
                                                        onOpenChat={onOpenGroupChat || (() => {})} size="xs" />
                                                    <button onClick={() => { setEditCh(ch.id); setEditChBlocks(parseContent(ch.content)); }}
                                                        className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 transition-all">
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => deleteChapter(ch.id)}
                                                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/70 hover:text-red-400 transition-all">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                {editCh === ch.id && (
                                                    <div className="px-3 pb-3 space-y-2 border-t border-white/[0.05] pt-2">
                                                        <RichContentEditor blocks={editChBlocks} onChange={setEditChBlocks} placeholder="Contenu du chapitre..." userId={userId} />
                                                        <div className="flex gap-2">
                                                            <Button size="sm" onClick={() => saveChapterContent(ch.id)} className="bg-teal-600 text-white rounded-xl text-xs flex-1"><Save className="w-3 h-3 mr-1" />Sauvegarder</Button>
                                                            <Button size="sm" variant="ghost" onClick={() => setEditCh(null)} className="text-slate-400 text-xs">Annuler</Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}

                                    {/* New Chapter form */}
                                    <AnimatePresence>
                                        {showNewCh && (
                                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                className="bg-white/[0.04] border border-cyan-500/20 rounded-2xl p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-semibold text-sm text-white">Nouveau chapitre</h4>
                                                    <button onClick={() => setShowNewCh(false)}><X className="w-4 h-4 text-slate-400" /></button>
                                                </div>
                                                <Input value={chForm.title} onChange={e => setChForm(p => ({ ...p, title: e.target.value }))}
                                                    placeholder="Titre du chapitre..." className="bg-white/[0.05] border-white/10 text-white rounded-xl" />
                                                <RichContentEditor blocks={chForm.contentBlocks} onChange={blocks => setChForm(p => ({ ...p, contentBlocks: blocks }))} placeholder="Contenu du chapitre..." userId={userId} />
                                                <div className="flex gap-2">
                                                    <Button onClick={createChapter} disabled={savingCh || !chForm.title} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm">
                                                        {savingCh ? 'Ajout...' : 'Ajouter le chapitre'}
                                                    </Button>
                                                    <Button variant="ghost" onClick={() => setShowNewCh(false)} className="text-slate-400">Annuler</Button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
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
                                <div className="flex justify-end">
                                    <button onClick={() => setShowNewLesson(true)}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600/80 hover:bg-teal-500 text-white text-xs font-semibold transition-all">
                                        <Plus className="w-3.5 h-3.5" /> Leçon
                                    </button>
                                </div>
                                {chLessons.length === 0 && !showNewLesson && (
                                    <div className="text-center py-10">
                                        <FileText className="w-10 h-10 mx-auto mb-2 text-slate-700" />
                                        <p className="text-slate-500 text-sm">Aucune leçon</p>
                                    </div>
                                )}
                                {chLessons.map((lesson: any, li: number) => (
                                    <motion.div key={lesson.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: li * 0.04 }}
                                        className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
                                        <div className="flex items-center gap-2.5 px-3 py-3">
                                            <div className="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center shrink-0">
                                                <FileText className="w-4 h-4 text-teal-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-white">{lesson.title}</p>
                                                {lesson.estimated_minutes && <p className="text-[10px] text-slate-400 mt-0.5">⏱ {lesson.estimated_minutes} min</p>}
                                            </div>
                                            <button onClick={() => { setEditLesson(lesson.id); setEditLessonBlocks(parseContent(lesson.content)); }}
                                                className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 transition-all">
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => deleteLesson(lesson.id)}
                                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/70 hover:text-red-400 transition-all">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        {editLesson === lesson.id && (
                                            <div className="border-t border-white/[0.06] px-3 pb-3 pt-2.5 space-y-2">
                                                <RichContentEditor blocks={editLessonBlocks} onChange={setEditLessonBlocks} placeholder="Contenu de la leçon..." userId={userId} />
                                                <div className="flex gap-2">
                                                    <Button size="sm" onClick={() => saveLessonContent(lesson.id)} className="bg-teal-600 text-white rounded-xl text-xs flex-1"><Save className="w-3 h-3 mr-1" />Sauvegarder</Button>
                                                    <Button size="sm" variant="ghost" onClick={() => setEditLesson(null)} className="text-slate-400 text-xs">Annuler</Button>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}

                                <AnimatePresence>
                                    {showNewLesson && (
                                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                            className="bg-white/[0.04] border border-teal-500/20 rounded-2xl p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-semibold text-sm text-white">Nouvelle leçon</h4>
                                                <button onClick={() => setShowNewLesson(false)}><X className="w-4 h-4 text-slate-400" /></button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="col-span-2">
                                                    <Input value={lessonForm.title} onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))}
                                                        placeholder="Titre de la leçon..." className="bg-white/[0.05] border-white/10 text-white rounded-xl" />
                                                </div>
                                                <Input type="number" value={lessonForm.estimated_minutes} onChange={e => setLessonForm(p => ({ ...p, estimated_minutes: e.target.value }))}
                                                    placeholder="min" className="bg-white/[0.05] border-white/10 text-white rounded-xl" />
                                            </div>
                                            <RichContentEditor blocks={lessonForm.contentBlocks} onChange={blocks => setLessonForm(p => ({ ...p, contentBlocks: blocks }))} placeholder="Contenu..." userId={userId} />
                                            <div className="flex gap-2">
                                                <Button onClick={createLesson} disabled={savingLesson || !lessonForm.title} className="flex-1 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm">
                                                    {savingLesson ? 'Ajout...' : 'Ajouter la leçon'}
                                                </Button>
                                                <Button variant="ghost" onClick={() => setShowNewLesson(false)} className="text-slate-400">Annuler</Button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* ── Exercices ── */}
                        {activeTab === 'exercises' && (
                            <div className="space-y-2">
                                <div className="flex justify-end">
                                    <button onClick={() => setShowNewEx(true)}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-600/80 hover:bg-violet-500 text-white text-xs font-semibold transition-all">
                                        <Plus className="w-3.5 h-3.5" /> Exercice
                                    </button>
                                </div>
                                {chExercises.length === 0 && !showNewEx && (
                                    <div className="text-center py-10">
                                        <Zap className="w-10 h-10 mx-auto mb-2 text-slate-700" />
                                        <p className="text-slate-500 text-sm">Aucun exercice</p>
                                    </div>
                                )}
                                {chExercises.map((ex: any) => {
                                    const exSubs = submissions.filter(s => s.exercise_id === ex.id);
                                    const avgScore = exSubs.length > 0 ? exSubs.reduce((a: number, s: any) => a + (s.score || 0), 0) / exSubs.length : null;
                                    return (
                                        <div key={ex.id} className="rounded-xl border border-violet-500/20 bg-violet-500/[0.05] p-3 flex items-center gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <Badge className="text-[9px] bg-violet-500/20 text-violet-400 border-none">{ex.type?.toUpperCase()}</Badge>
                                                    <span className="text-xs font-semibold text-white truncate">{ex.title}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500">{ex.duration_minutes}min · max {ex.max_score}pts · {exSubs.length} soumission{exSubs.length > 1 ? 's' : ''}{avgScore !== null ? ` · moy. ${avgScore.toFixed(1)}` : ''}</p>
                                            </div>
                                            <button onClick={() => { setEditEx(ex); setEditExForm({ title: ex.title, type: ex.type || 'qcm', duration_minutes: ex.duration_minutes || 10, max_score: ex.max_score || 20, questions: ex.questions || [] }); }}
                                                className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-violet-500/20 text-slate-400 hover:text-violet-400 transition-all shrink-0">
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => deleteExercise(ex.id)}
                                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/70 hover:text-red-400 transition-all shrink-0">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </div>

            {/* ═══ MODALS: Créer exercice ═══ */}
            <AnimatePresence>
                {showNewEx && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4"
                        onClick={() => setShowNewEx(false)}>
                        <motion.div initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }}
                            className="bg-[#0f1117] border border-violet-500/20 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-white">Créer un exercice</h3>
                                <button onClick={() => setShowNewEx(false)}><X className="w-4 h-4 text-slate-400" /></button>
                            </div>
                            <div className="space-y-3">
                                <Input value={exForm.title} onChange={e => setExForm(p => ({ ...p, title: e.target.value }))}
                                    placeholder="Titre de l'exercice..." className="bg-white/[0.05] border-white/10 text-white rounded-xl" />
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <Label className="text-xs text-slate-400">Type</Label>
                                        <select value={exForm.type} onChange={e => setExForm(p => ({ ...p, type: e.target.value }))} className="mt-1 w-full bg-[#1a1d2e] border border-white/10 text-white text-sm rounded-xl px-2 h-9">
                                            <option value="qcm">QCM</option><option value="quiz">Quiz</option><option value="qa">Q/R</option><option value="open">Ouvert</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-400">Durée (min)</Label>
                                        <Input type="number" value={exForm.duration_minutes} onChange={e => setExForm(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 10 }))} className="mt-1 bg-white/[0.05] border-white/10 text-white h-9 rounded-xl" />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-400">Note max</Label>
                                        <Input type="number" value={exForm.max_score} onChange={e => setExForm(p => ({ ...p, max_score: parseInt(e.target.value) || 20 }))} className="mt-1 bg-white/[0.05] border-white/10 text-white h-9 rounded-xl" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Questions ({exForm.questions.length})</Label>
                                    {exForm.questions.map((q: any, qi: number) => (
                                        <div key={qi} className="bg-white/[0.03] rounded-xl p-2.5 flex items-start gap-2">
                                            <span className="text-[10px] text-slate-500 shrink-0">{qi + 1}.</span>
                                            <div className="flex-1"><p className="text-xs text-white">{q.question}</p>{q.answer && <p className="text-[10px] text-emerald-400">→ {q.answer}</p>}</div>
                                            <button onClick={() => setExForm(p => ({ ...p, questions: p.questions.filter((_, i) => i !== qi)}))}>
                                                <X className="w-3 h-3 text-red-400" />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="bg-white/[0.03] rounded-xl p-3 space-y-2 border border-white/[0.05]">
                                        <Textarea value={newQ.question} onChange={e => setNewQ(p => ({ ...p, question: e.target.value }))} placeholder="Question..." rows={2} className="bg-white/[0.05] border-white/10 text-white text-xs resize-none rounded-xl" />
                                        {exForm.type === 'qcm' && newQ.options.map((opt, oi) => (
                                            <Input key={oi} value={opt} onChange={e => setNewQ(p => ({ ...p, options: p.options.map((o, i) => i === oi ? e.target.value : o) }))} placeholder={`Option ${String.fromCharCode(65+oi)}`} className="bg-white/[0.05] border-white/10 text-white h-8 text-xs rounded-xl" />
                                        ))}
                                        <Input value={newQ.answer} onChange={e => setNewQ(p => ({ ...p, answer: e.target.value }))} placeholder="Réponse..." className="bg-white/[0.05] border-white/10 text-white h-8 text-xs rounded-xl" />
                                        <button onClick={() => addQuestion(exForm, setExForm)} disabled={!newQ.question} className="w-full py-1.5 rounded-xl bg-violet-500/15 border border-violet-500/25 text-violet-400 text-xs">
                                            <Plus className="w-3 h-3 inline mr-1" />Ajouter la question
                                        </button>
                                    </div>
                                </div>
                                <Button onClick={createExercise} disabled={savingEx || !exForm.title || exForm.questions.length === 0}
                                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl h-10">
                                    {savingEx ? 'Création...' : "Créer l'exercice"}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ MODAL: Éditer exercice ═══ */}
            <AnimatePresence>
                {editEx && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4"
                        onClick={() => setEditEx(null)}>
                        <motion.div initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }}
                            className="bg-[#0f1117] border border-violet-500/30 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-white flex items-center gap-2"><Edit2 className="w-4 h-4 text-violet-400" />Modifier l&apos;exercice</h3>
                                <button onClick={() => setEditEx(null)}><X className="w-4 h-4 text-slate-400" /></button>
                            </div>
                            <div className="space-y-3">
                                <Input value={editExForm.title} onChange={e => setEditExForm(p => ({ ...p, title: e.target.value }))} placeholder="Titre..." className="bg-white/[0.05] border-white/10 text-white rounded-xl" />
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <Label className="text-xs text-slate-400">Type</Label>
                                        <select value={editExForm.type} onChange={e => setEditExForm(p => ({ ...p, type: e.target.value }))} className="mt-1 w-full bg-[#1a1d2e] border border-white/10 text-white text-sm rounded-xl px-2 h-9">
                                            <option value="qcm">QCM</option><option value="quiz">Quiz</option><option value="qa">Q/R</option><option value="open">Ouvert</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-400">Durée</Label>
                                        <Input type="number" value={editExForm.duration_minutes} onChange={e => setEditExForm(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 10 }))} className="mt-1 bg-white/[0.05] border-white/10 text-white h-9 rounded-xl" />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-400">Note max</Label>
                                        <Input type="number" value={editExForm.max_score} onChange={e => setEditExForm(p => ({ ...p, max_score: parseInt(e.target.value) || 20 }))} className="mt-1 bg-white/[0.05] border-white/10 text-white h-9 rounded-xl" />
                                    </div>
                                </div>
                                {editExForm.questions.map((q: any, qi: number) => (
                                    <div key={qi} className="bg-white/[0.03] rounded-xl p-2.5 flex items-start gap-2 border border-white/[0.04]">
                                        <span className="text-[10px] text-slate-500 shrink-0">{qi + 1}.</span>
                                        <div className="flex-1"><p className="text-xs text-white">{q.question}</p>{q.answer && <p className="text-[10px] text-emerald-400">→ {q.answer}</p>}</div>
                                        <button onClick={() => setEditExForm(p => ({ ...p, questions: p.questions.filter((_, i) => i !== qi)}))}>
                                            <X className="w-3 h-3 text-red-400" />
                                        </button>
                                    </div>
                                ))}
                                <div className="bg-white/[0.03] rounded-xl p-3 space-y-2 border border-violet-500/10">
                                    <p className="text-[10px] text-violet-400 font-semibold">+ Nouvelle question</p>
                                    <Textarea value={editNewQ.question} onChange={e => setEditNewQ(p => ({ ...p, question: e.target.value }))} placeholder="Question..." rows={2} className="bg-white/[0.05] border-white/10 text-white text-xs resize-none rounded-xl" />
                                    {editExForm.type === 'qcm' && editNewQ.options.map((opt, oi) => (
                                        <Input key={oi} value={opt} onChange={e => setEditNewQ(p => ({ ...p, options: p.options.map((o, i) => i === oi ? e.target.value : o) }))} placeholder={`Option ${String.fromCharCode(65+oi)}`} className="bg-white/[0.05] border-white/10 text-white h-8 text-xs rounded-xl" />
                                    ))}
                                    <Input value={editNewQ.answer} onChange={e => setEditNewQ(p => ({ ...p, answer: e.target.value }))} placeholder="Réponse..." className="bg-white/[0.05] border-white/10 text-white h-8 text-xs rounded-xl" />
                                    <button onClick={() => addQuestion(editExForm, setEditExForm)} className="w-full py-1.5 rounded-xl bg-violet-500/15 border border-violet-500/25 text-violet-400 text-xs">
                                        <Plus className="w-3 h-3 inline mr-1" />Ajouter
                                    </button>
                                </div>
                                <Button onClick={saveEditExercise} disabled={savingEditEx} className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-10">
                                    {savingEditEx ? 'Sauvegarde...' : 'Sauvegarder'}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
