'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, X, Save, Trash2, ChevronDown, ChevronUp, Eye, EyeOff,
    BookOpen, FileText, Image as ImageIcon, Upload, Layers,
    Timer, GraduationCap, Users, BarChart3, CheckCircle2,
    AlertCircle, Edit2, Send, Flag, MessageSquare, Star
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

interface TeacherCursusProps {
    orgId: string;
    userId: string;
    allClasses: any[];
    onStartDM?: (targetId: string, name: string) => void;
}

export function TeacherCursus({ orgId, userId, allClasses, onStartDM }: TeacherCursusProps) {
    const [subjects, setSubjects] = useState<any[]>([]);
    const [chapters, setChapters] = useState<any[]>([]);
    const [lessons, setLessons] = useState<any[]>([]);
    const [exercises, setExercises] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [disputes, setDisputes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Expand/Edit
    const [expandedSub, setExpandedSub] = useState<string | null>(null);
    const [expandedCh, setExpandedCh] = useState<string | null>(null);

    // Subject form
    const [showNewSub, setShowNewSub] = useState(false);
    const [subForm, setSubForm] = useState({ name: '', coefficient: '1', classroom_id: '' });
    const [savingSub, setSavingSub] = useState(false);

    // Chapter form
    const [showNewCh, setShowNewCh] = useState<string | null>(null);
    const [chForm, setChForm] = useState({ title: '', description: '', content: '' });
    const [editCh, setEditCh] = useState<string | null>(null);
    const [editChContent, setEditChContent] = useState('');
    const [savingCh, setSavingCh] = useState(false);

    // Lesson form
    const [showNewLesson, setShowNewLesson] = useState<string | null>(null);
    const [lessonForm, setLessonForm] = useState({ title: '', content: '', estimated_minutes: '15' });
    const [editLesson, setEditLesson] = useState<string | null>(null);
    const [editLessonContent, setEditLessonContent] = useState('');
    const [savingLesson, setSavingLesson] = useState(false);

    // Exercise form
    const [showNewEx, setShowNewEx] = useState<{ type: 'chapter' | 'subject'; id: string } | null>(null);
    const [exForm, setExForm] = useState({ title: '', type: 'qcm', duration_minutes: 10, max_score: 20, questions: [] as any[] });
    const [newQ, setNewQ] = useState({ question: '', answer: '', options: ['', '', '', ''] });
    const [savingEx, setSavingEx] = useState(false);

    const loadData = async () => {
        setLoading(true);
        const { data: subs } = await supabase.from('subjects')
            .select('*, classrooms:classroom_id(id, name)')
            .eq('organization_id', orgId).eq('teacher_id', userId);
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

            const { data: exs } = await supabase.from('exercises').select('*')
                .or(subjectIds.length > 0 ? `subject_id.in.(${subjectIds.join(',')})` : 'id.eq.00000000-0000-0000-0000-000000000000');
            setExercises(exs || []);

            const exIds = (exs || []).map((e: any) => e.id);
            if (exIds.length > 0) {
                const { data: s2 } = await supabase.from('exercise_submissions').select('*, student_profiles:student_id(first_name, last_name)').in('exercise_id', exIds);
                setSubmissions(s2 || []);
            }

            // Disputes
            const { data: disp } = await supabase.from('grade_disputes').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
            setDisputes(disp || []);
        }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [orgId, userId]);

    const createSubject = async () => {
        if (!subForm.name || !subForm.classroom_id) return toast.error('Remplissez le nom et la classe');
        setSavingSub(true);
        const { data, error } = await supabase.from('subjects').insert({
            name: subForm.name.trim(), coefficient: parseFloat(subForm.coefficient) || 1,
            classroom_id: subForm.classroom_id, organization_id: orgId, teacher_id: userId
        }).select('*, classrooms:classroom_id(id,name)').single();
        if (error) toast.error(error.message);
        else { setSubjects(prev => [...prev, data]); setShowNewSub(false); setSubForm({ name: '', coefficient: '1', classroom_id: '' }); toast.success('Matière créée ✅'); }
        setSavingSub(false);
    };

    const createChapter = async (subjectId: string) => {
        if (!chForm.title) return;
        setSavingCh(true);
        const pos = chapters.filter(c => c.subject_id === subjectId).length;
        const { data, error } = await supabase.from('chapters').insert({
            subject_id: subjectId, title: chForm.title.trim(), description: chForm.description,
            content: chForm.content, status: 'published', position: pos
        }).select().single();
        if (error) toast.error(error.message);
        else { setChapters(prev => [...prev, data]); setShowNewCh(null); setChForm({ title: '', description: '', content: '' }); toast.success('Chapitre ajouté ✅'); }
        setSavingCh(false);
    };

    const saveChapterContent = async (chId: string) => {
        const { error } = await supabase.from('chapters').update({ content: editChContent }).eq('id', chId);
        if (error) toast.error(error.message);
        else { setChapters(prev => prev.map(c => c.id === chId ? { ...c, content: editChContent } : c)); setEditCh(null); toast.success('Contenu mis à jour ✅'); }
    };

    const toggleChapterStatus = async (ch: any) => {
        const newStatus = ch.status === 'published' ? 'draft' : 'published';
        await supabase.from('chapters').update({ status: newStatus }).eq('id', ch.id);
        setChapters(prev => prev.map(c => c.id === ch.id ? { ...c, status: newStatus } : c));
        toast.success(newStatus === 'published' ? '📢 Chapitre publié' : '🔒 Chapitre masqué');
    };

    const deleteChapter = async (chId: string) => {
        if (!confirm('Supprimer ce chapitre et tout son contenu ?')) return;
        await supabase.from('chapters').delete().eq('id', chId);
        setChapters(prev => prev.filter(c => c.id !== chId));
        setLessons(prev => prev.filter(l => l.chapter_id !== chId));
        toast.success('Chapitre supprimé');
    };

    const createLesson = async (chapterId: string) => {
        if (!lessonForm.title) return;
        setSavingLesson(true);
        const pos = lessons.filter(l => l.chapter_id === chapterId).length;
        const { data, error } = await supabase.from('lessons').insert({
            chapter_id: chapterId, title: lessonForm.title.trim(), content: lessonForm.content,
            status: 'published', position: pos, estimated_minutes: parseInt(lessonForm.estimated_minutes) || 15
        }).select().single();
        if (error) toast.error(error.message);
        else { setLessons(prev => [...prev, data]); setShowNewLesson(null); setLessonForm({ title: '', content: '', estimated_minutes: '15' }); toast.success('Leçon ajoutée ✅'); }
        setSavingLesson(false);
    };

    const saveLessonContent = async (lId: string) => {
        const { error } = await supabase.from('lessons').update({ content: editLessonContent }).eq('id', lId);
        if (error) toast.error(error.message);
        else { setLessons(prev => prev.map(l => l.id === lId ? { ...l, content: editLessonContent } : l)); setEditLesson(null); toast.success('Leçon mise à jour ✅'); }
    };

    const deleteLesson = async (lId: string) => {
        if (!confirm('Supprimer cette leçon ?')) return;
        await supabase.from('lessons').delete().eq('id', lId);
        setLessons(prev => prev.filter(l => l.id !== lId));
    };

    const addQuestion = () => {
        if (!newQ.question) return;
        setExForm(prev => ({ ...prev, questions: [...prev.questions, { ...newQ, options: newQ.options.filter(o => o.trim()) }] }));
        setNewQ({ question: '', answer: '', options: ['', '', '', ''] });
    };

    const createExercise = async () => {
        if (!showNewEx || !exForm.title || exForm.questions.length === 0) return;
        setSavingEx(true);
        const payload: any = {
            organization_id: orgId, title: exForm.title, type: exForm.type,
            duration_minutes: exForm.duration_minutes, max_score: exForm.max_score, questions: exForm.questions,
        };
        if (showNewEx.type === 'chapter') payload.chapter_id = showNewEx.id;
        else payload.subject_id = showNewEx.id;

        const { data, error } = await supabase.from('exercises').insert(payload).select().single();
        if (error) toast.error(error.message);
        else { setExercises(prev => [...prev, data]); setShowNewEx(null); setExForm({ title: '', type: 'qcm', duration_minutes: 10, max_score: 20, questions: [] }); toast.success('Exercice créé ✅'); }
        setSavingEx(false);
    };

    const resolveDispute = async (dId: string, status: 'accepted' | 'rejected', response: string) => {
        await supabase.from('grade_disputes').update({ status, response }).eq('id', dId);
        setDisputes(prev => prev.map(d => d.id === dId ? { ...d, status, response } : d));
        toast.success(`Réclamation ${status === 'accepted' ? 'acceptée' : 'rejetée'}`);
    };

    if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;

    const pendingDisputes = disputes.filter(d => d.status === 'pending');

    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
                {[
                    { label: 'Matières', value: subjects.length, color: 'indigo', icon: BookOpen },
                    { label: 'Chapitres', value: chapters.length, color: 'teal', icon: Layers },
                    { label: 'Réclamations', value: pendingDisputes.length, color: pendingDisputes.length > 0 ? 'orange' : 'slate', icon: Flag },
                ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className={cn("rounded-2xl p-3 border text-center",
                            s.color === 'indigo' ? 'bg-indigo-500/10 border-indigo-500/20' :
                            s.color === 'teal' ? 'bg-teal-500/10 border-teal-500/20' :
                            s.color === 'orange' ? 'bg-orange-500/10 border-orange-500/20' :
                            'bg-white/[0.03] border-white/[0.06]')}>
                        <p className="text-xl font-black text-white">{s.value}</p>
                        <p className="text-[10px] text-slate-500">{s.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Disputes alert */}
            {pendingDisputes.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Flag className="w-4 h-4 text-orange-400" />
                        <span className="text-sm font-bold text-orange-300">{pendingDisputes.length} réclamation(s) en attente</span>
                    </div>
                    <div className="space-y-2">
                        {pendingDisputes.slice(0, 3).map((d: any) => (
                            <div key={d.id} className="bg-white/[0.04] rounded-xl p-3 flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white font-medium">{d.message}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{new Date(d.created_at).toLocaleDateString('fr-FR')}</p>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <button onClick={() => resolveDispute(d.id, 'accepted', 'Note révisée')}
                                        className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] hover:bg-emerald-500/30">✓ Accepter</button>
                                    <button onClick={() => resolveDispute(d.id, 'rejected', 'Note maintenue')}
                                        className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-[10px] hover:bg-red-500/30">✗ Rejeter</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-300">📚 Mon Cursus</h3>
                <Button size="sm" onClick={() => setShowNewSub(true)} className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl h-8 text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Matière
                </Button>
            </div>

            {/* New Subject form */}
            <AnimatePresence>
                {showNewSub && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="bg-white/[0.04] border border-indigo-500/20 rounded-2xl p-4 space-y-3">
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
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-9 text-sm">
                            {savingSub ? 'Création...' : 'Créer la matière'}
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Subjects list */}
            <div className="space-y-3">
                {subjects.length === 0 && !showNewSub && (
                    <div className="text-center py-12 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
                        <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                        <p className="text-slate-500 text-sm font-medium">Aucune matière créée</p>
                        <p className="text-xs text-slate-600 mt-1">Cliquez sur "+ Matière" pour commencer</p>
                    </div>
                )}

                {subjects.map((sub: any, si: number) => {
                    const subChaps = chapters.filter(c => c.subject_id === sub.id);
                    const isOpen = expandedSub === sub.id;
                    const publishedChaps = subChaps.filter(c => c.status === 'published');
                    const subSubs = submissions.filter(s => exercises.some(e => e.subject_id === sub.id && e.id === s.exercise_id));

                    return (
                        <motion.div key={sub.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.04 }}>
                            <div className={cn("rounded-2xl overflow-hidden border transition-all",
                                isOpen ? 'border-indigo-500/30 bg-gradient-to-br from-indigo-500/[0.08] to-violet-500/[0.04]' : 'border-white/[0.06] bg-white/[0.03]')}>

                                {/* Subject header */}
                                <button className="w-full p-4 flex items-center gap-3 text-left" onClick={() => setExpandedSub(isOpen ? null : sub.id)}>
                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                                        isOpen ? 'bg-indigo-500/20' : 'bg-white/[0.05]')}>
                                        <BookOpen className={cn("w-5 h-5", isOpen ? 'text-indigo-400' : 'text-slate-500')} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm text-white">{sub.name}</h4>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            <span className="text-[10px] text-slate-500">Coef. {sub.coefficient || 1}</span>
                                            {sub.classrooms && <span className="text-[10px] text-slate-500">• {sub.classrooms.name}</span>}
                                            <Badge className="text-[9px] bg-teal-500/15 text-teal-400 border-teal-500/25">{publishedChaps.length}/{subChaps.length} ch. publiés</Badge>
                                        </div>
                                    </div>
                                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                                </button>

                                {/* Chapters */}
                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                            className="border-t border-white/[0.05] px-4 pb-4 pt-3 space-y-3">

                                            {subChaps.map((ch: any, ci: number) => {
                                                const chLessons = lessons.filter(l => l.chapter_id === ch.id);
                                                const chExs = exercises.filter(e => e.chapter_id === ch.id);
                                                const isChOpen = expandedCh === ch.id;
                                                const published = ch.status === 'published';

                                                return (
                                                    <div key={ch.id} className={cn("rounded-xl border overflow-hidden transition-all",
                                                        published ? 'border-teal-500/20' : 'border-slate-700/50 opacity-75',
                                                        isChOpen ? 'bg-teal-500/[0.04]' : 'bg-white/[0.02]')}>

                                                        <div className="flex items-center p-3 gap-2">
                                                            <div className="w-7 h-7 rounded-lg bg-teal-500/15 flex items-center justify-center text-xs font-bold text-teal-400 shrink-0">{ci + 1}</div>
                                                            <button className="flex-1 text-left min-w-0" onClick={() => setExpandedCh(isChOpen ? null : ch.id)}>
                                                                <p className="text-sm font-semibold text-white truncate">{ch.title}</p>
                                                                <p className="text-[10px] text-slate-500">{chLessons.length} leçons • {chExs.length} exercices</p>
                                                            </button>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <button onClick={() => toggleChapterStatus(ch)}
                                                                    className={cn("p-1.5 rounded-lg transition-all text-[10px] flex items-center gap-1",
                                                                        published ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700')}>
                                                                    {published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                                                </button>
                                                                <button onClick={() => { setEditCh(ch.id); setEditChContent(ch.content || ''); }}
                                                                    className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 text-slate-400 transition-all">
                                                                    <Edit2 className="w-3 h-3" />
                                                                </button>
                                                                <button onClick={() => deleteChapter(ch.id)}
                                                                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all">
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Edit chapter content */}
                                                        {editCh === ch.id && (
                                                            <div className="px-3 pb-3 space-y-2 border-t border-white/[0.05] pt-2">
                                                                <Textarea value={editChContent} onChange={e => setEditChContent(e.target.value)}
                                                                    placeholder="Contenu du chapitre..." rows={6}
                                                                    className="bg-white/[0.04] border-white/10 text-white text-sm resize-none rounded-xl" />
                                                                <div className="flex gap-2">
                                                                    <Button size="sm" onClick={() => saveChapterContent(ch.id)} className="bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs flex-1"><Save className="w-3 h-3 mr-1" />Sauvegarder</Button>
                                                                    <Button size="sm" variant="ghost" onClick={() => setEditCh(null)} className="text-slate-400 rounded-xl text-xs">Annuler</Button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <AnimatePresence>
                                                            {isChOpen && (
                                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                                    className="border-t border-white/[0.05] px-3 pb-3 pt-2 space-y-2">

                                                                    {/* Lessons */}
                                                                    {chLessons.map((lesson: any) => (
                                                                        <div key={lesson.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                                                                            <div className="flex items-center gap-2">
                                                                                <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                                                                <span className="text-xs font-medium text-white flex-1 truncate">{lesson.title}</span>
                                                                                <span className="text-[10px] text-slate-600">{lesson.estimated_minutes}min</span>
                                                                                <button onClick={() => { setEditLesson(lesson.id); setEditLessonContent(lesson.content || ''); }}
                                                                                    className="p-1 rounded text-slate-500 hover:text-white"><Edit2 className="w-2.5 h-2.5" /></button>
                                                                                <button onClick={() => deleteLesson(lesson.id)}
                                                                                    className="p-1 rounded text-red-500/60 hover:text-red-400"><Trash2 className="w-2.5 h-2.5" /></button>
                                                                            </div>
                                                                            {editLesson === lesson.id && (
                                                                                <div className="mt-2 space-y-1.5">
                                                                                    <Textarea value={editLessonContent} onChange={e => setEditLessonContent(e.target.value)}
                                                                                        placeholder="Contenu de la leçon..." rows={5}
                                                                                        className="bg-white/[0.04] border-white/10 text-white text-xs resize-none rounded-xl" />
                                                                                    <div className="flex gap-1.5">
                                                                                        <Button size="sm" onClick={() => saveLessonContent(lesson.id)} className="bg-teal-600 text-white rounded-xl text-[10px] h-7 px-3"><Save className="w-2.5 h-2.5 mr-1" />OK</Button>
                                                                                        <Button size="sm" variant="ghost" onClick={() => setEditLesson(null)} className="text-slate-400 text-[10px] h-7 px-2">Annuler</Button>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}

                                                                    {/* Add lesson */}
                                                                    {showNewLesson === ch.id ? (
                                                                        <div className="space-y-2 bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                                                                            <Input value={lessonForm.title} onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))}
                                                                                placeholder="Titre de la leçon..." className="bg-white/[0.05] border-white/10 text-white h-8 text-xs rounded-xl" />
                                                                            <Input type="number" value={lessonForm.estimated_minutes} onChange={e => setLessonForm(p => ({ ...p, estimated_minutes: e.target.value }))}
                                                                                placeholder="Durée (min)" className="bg-white/[0.05] border-white/10 text-white h-8 text-xs rounded-xl" />
                                                                            <Textarea value={lessonForm.content} onChange={e => setLessonForm(p => ({ ...p, content: e.target.value }))}
                                                                                placeholder="Contenu..." rows={4} className="bg-white/[0.05] border-white/10 text-white text-xs resize-none rounded-xl" />
                                                                            <div className="flex gap-2">
                                                                                <Button size="sm" onClick={() => createLesson(ch.id)} disabled={savingLesson} className="bg-teal-600 text-white rounded-xl text-xs flex-1 h-8">Ajouter</Button>
                                                                                <Button size="sm" variant="ghost" onClick={() => setShowNewLesson(null)} className="text-slate-400 text-xs h-8">Annuler</Button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <button onClick={() => setShowNewLesson(ch.id)}
                                                                            className="w-full py-2 rounded-xl border border-dashed border-white/10 text-slate-500 hover:text-white hover:border-white/20 text-xs transition-all flex items-center justify-center gap-1">
                                                                            <Plus className="w-3 h-3" /> Ajouter une leçon
                                                                        </button>
                                                                    )}

                                                                    {/* Exercises of chapter */}
                                                                    {chExs.map((ex: any) => {
                                                                        const exSubs = submissions.filter(s => s.exercise_id === ex.id);
                                                                        const avgScore = exSubs.length > 0 ? exSubs.reduce((a: number, s: any) => a + (s.score || 0), 0) / exSubs.length : null;
                                                                        return (
                                                                            <div key={ex.id} className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-2.5 flex items-center gap-2">
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <Badge className="text-[9px] bg-violet-500/20 text-violet-400 border-none">{ex.type?.toUpperCase()}</Badge>
                                                                                        <span className="text-xs font-medium text-white truncate">{ex.title}</span>
                                                                                    </div>
                                                                                    <p className="text-[10px] text-slate-500">{ex.duration_minutes}min • max {ex.max_score}pts • {exSubs.length} soumission(s){avgScore !== null ? ` • moy. ${avgScore.toFixed(1)}` : ''}</p>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}

                                                                    {/* Add exercise */}
                                                                    <button onClick={() => setShowNewEx({ type: 'chapter', id: ch.id })}
                                                                        className="w-full py-2 rounded-xl border border-dashed border-violet-500/20 text-violet-500/60 hover:text-violet-400 hover:border-violet-500/40 text-xs transition-all flex items-center justify-center gap-1">
                                                                        <Plus className="w-3 h-3" /> Ajouter un exercice
                                                                    </button>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })}

                                            {/* Add chapter */}
                                            {showNewCh === sub.id ? (
                                                <div className="space-y-2 bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                                                    <Input value={chForm.title} onChange={e => setChForm(p => ({ ...p, title: e.target.value }))}
                                                        placeholder="Titre du chapitre..." className="bg-white/[0.05] border-white/10 text-white h-9 text-sm rounded-xl" />
                                                    <Textarea value={chForm.content} onChange={e => setChForm(p => ({ ...p, content: e.target.value }))}
                                                        placeholder="Contenu du chapitre..." rows={5} className="bg-white/[0.05] border-white/10 text-white text-sm resize-none rounded-xl" />
                                                    <div className="flex gap-2">
                                                        <Button size="sm" onClick={() => createChapter(sub.id)} disabled={savingCh || !chForm.title} className="bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs flex-1">Ajouter</Button>
                                                        <Button size="sm" variant="ghost" onClick={() => setShowNewCh(null)} className="text-slate-400 text-xs">Annuler</Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={() => setShowNewCh(sub.id)}
                                                    className="w-full py-3 rounded-xl border border-dashed border-teal-500/20 text-teal-500/60 hover:text-teal-400 hover:border-teal-500/40 text-xs transition-all flex items-center justify-center gap-1.5">
                                                    <Plus className="w-3.5 h-3.5" /> Ajouter un chapitre
                                                </button>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Exercise creation modal */}
            <AnimatePresence>
                {showNewEx && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4"
                        onClick={() => setShowNewEx(null)}>
                        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
                            className="bg-[#0f1117] border border-violet-500/20 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 shadow-2xl"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-white">Créer un exercice</h3>
                                <button onClick={() => setShowNewEx(null)}><X className="w-4 h-4 text-slate-400" /></button>
                            </div>

                            <div className="space-y-3">
                                <Input value={exForm.title} onChange={e => setExForm(p => ({ ...p, title: e.target.value }))}
                                    placeholder="Titre de l'exercice..." className="bg-white/[0.05] border-white/10 text-white rounded-xl" />
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <Label className="text-xs text-slate-400">Type</Label>
                                        <select value={exForm.type} onChange={e => setExForm(p => ({ ...p, type: e.target.value }))}
                                            className="mt-1 w-full bg-[#1a1d2e] border border-white/10 text-white text-sm rounded-xl px-2 h-9">
                                            <option value="qcm">QCM</option>
                                            <option value="quiz">Quiz</option>
                                            <option value="qa">Q/R</option>
                                            <option value="open">Ouvert</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-400">Durée (min)</Label>
                                        <Input type="number" value={exForm.duration_minutes} onChange={e => setExForm(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 10 }))}
                                            className="mt-1 bg-white/[0.05] border-white/10 text-white h-9 rounded-xl" />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-400">Note max</Label>
                                        <Input type="number" value={exForm.max_score} onChange={e => setExForm(p => ({ ...p, max_score: parseInt(e.target.value) || 20 }))}
                                            className="mt-1 bg-white/[0.05] border-white/10 text-white h-9 rounded-xl" />
                                    </div>
                                </div>

                                {/* Questions */}
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Questions ({exForm.questions.length})</Label>
                                    {exForm.questions.map((q: any, qi: number) => (
                                        <div key={qi} className="bg-white/[0.03] rounded-xl p-2.5 flex items-start gap-2">
                                            <span className="text-[10px] text-slate-500 shrink-0 mt-0.5">{qi + 1}.</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-white">{q.question}</p>
                                                {q.answer && <p className="text-[10px] text-emerald-400 mt-0.5">→ {q.answer}</p>}
                                            </div>
                                            <button onClick={() => setExForm(p => ({ ...p, questions: p.questions.filter((_, i) => i !== qi) }))}
                                                className="text-red-400/60 hover:text-red-400 shrink-0"><X className="w-3 h-3" /></button>
                                        </div>
                                    ))}

                                    <div className="bg-white/[0.03] rounded-xl p-3 space-y-2 border border-white/[0.05]">
                                        <Textarea value={newQ.question} onChange={e => setNewQ(p => ({ ...p, question: e.target.value }))}
                                            placeholder="Question..." rows={2} className="bg-white/[0.05] border-white/10 text-white text-xs resize-none rounded-xl" />
                                        {(exForm.type === 'qcm') && (
                                            <div className="space-y-1.5">
                                                {newQ.options.map((opt, oi) => (
                                                    <Input key={oi} value={opt} onChange={e => setNewQ(p => ({ ...p, options: p.options.map((o, i) => i === oi ? e.target.value : o) }))}
                                                        placeholder={`Option ${String.fromCharCode(65 + oi)}`} className="bg-white/[0.05] border-white/10 text-white h-8 text-xs rounded-xl" />
                                                ))}
                                            </div>
                                        )}
                                        <Input value={newQ.answer} onChange={e => setNewQ(p => ({ ...p, answer: e.target.value }))}
                                            placeholder={exForm.type === 'qcm' ? 'Bonne réponse (exacte)...' : 'Réponse attendue...'} className="bg-white/[0.05] border-white/10 text-white h-8 text-xs rounded-xl" />
                                        <button onClick={addQuestion} disabled={!newQ.question}
                                            className="w-full py-1.5 rounded-xl bg-violet-500/15 border border-violet-500/25 text-violet-400 text-xs hover:bg-violet-500/25 transition-all flex items-center justify-center gap-1">
                                            <Plus className="w-3 h-3" /> Ajouter cette question
                                        </button>
                                    </div>
                                </div>

                                <Button onClick={createExercise} disabled={savingEx || !exForm.title || exForm.questions.length === 0}
                                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl h-10">
                                    {savingEx ? 'Création...' : 'Créer l\'exercice'}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
