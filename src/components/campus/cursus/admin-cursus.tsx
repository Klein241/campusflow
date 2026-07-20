'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, X, Save, Trash2, ChevronDown, ChevronUp, Eye, EyeOff,
    BookOpen, Layers, Users, BarChart3, GraduationCap, Edit2,
    CheckCircle2, Flag, Filter, Search, Timer, FileText, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AdminCursusProps {
    orgId: string;
    allClasses: any[];
    allTeachers: any[];
}

export function AdminCursus({ orgId, allClasses, allTeachers }: AdminCursusProps) {
    const [subjects, setSubjects] = useState<any[]>([]);
    const [chapters, setChapters] = useState<any[]>([]);
    const [lessons, setLessons] = useState<any[]>([]);
    const [exercises, setExercises] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [disputes, setDisputes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [filterClass, setFilterClass] = useState<string>('all');
    const [filterTeacher, setFilterTeacher] = useState<string>('all');
    const [searchQ, setSearchQ] = useState('');

    const [expandedSub, setExpandedSub] = useState<string | null>(null);
    const [expandedCh, setExpandedCh] = useState<string | null>(null);

    // Forms
    const [showNewSub, setShowNewSub] = useState(false);
    const [subForm, setSubForm] = useState({ name: '', coefficient: '1', classroom_id: '', teacher_id: '' });
    const [savingSub, setSavingSub] = useState(false);
    const [showNewCh, setShowNewCh] = useState<string | null>(null);
    const [chForm, setChForm] = useState({ title: '', content: '' });
    const [savingCh, setSavingCh] = useState(false);
    const [showNewLesson, setShowNewLesson] = useState<string | null>(null);
    const [lessonForm, setLessonForm] = useState({ title: '', content: '', estimated_minutes: '15' });
    const [savingLesson, setSavingLesson] = useState(false);
    const [editCh, setEditCh] = useState<string | null>(null);
    const [editChContent, setEditChContent] = useState('');
    const [editLesson, setEditLesson] = useState<string | null>(null);
    const [editLessonContent, setEditLessonContent] = useState('');

    // Exercise form
    const [showNewEx, setShowNewEx] = useState<{ type: 'chapter'; id: string } | null>(null);
    const [exForm, setExForm] = useState({ title: '', type: 'qcm', duration_minutes: 10, max_score: 20, questions: [] as any[] });
    const [newQ, setNewQ] = useState({ question: '', answer: '', options: ['', '', '', ''] });
    const [savingEx, setSavingEx] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const { data: subs } = await supabase.from('subjects')
                .select('*, classrooms:classroom_id(id,name), teacher_profiles:teacher_id(id,first_name,last_name)')
                .eq('organization_id', orgId).order('name');
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
                    .or(`subject_id.in.(${subjectIds.join(',')})${chapterIds.length > 0 ? `,chapter_id.in.(${chapterIds.join(',')})` : ''}`);
                setExercises(exs || []);

                const exIds = (exs || []).map((e: any) => e.id);
                if (exIds.length > 0) {
                    const { data: s2 } = await supabase.from('exercise_submissions').select('*').in('exercise_id', exIds);
                    setSubmissions(s2 || []);
                }
            }

            const { data: disp } = await supabase.from('grade_disputes')
                .select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
            setDisputes(disp || []);
        } catch (e: any) { console.error(e); toast.error('Erreur de chargement'); }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [orgId]);

    const filteredSubjects = subjects.filter(s => {
        if (filterClass !== 'all' && s.classroom_id !== filterClass) return false;
        if (filterTeacher !== 'all' && s.teacher_id !== filterTeacher) return false;
        if (searchQ && !s.name.toLowerCase().includes(searchQ.toLowerCase())) return false;
        return true;
    });

    const createSubject = async () => {
        if (!subForm.name || !subForm.classroom_id) return toast.error('Nom et classe requis');
        setSavingSub(true);
        const { data, error } = await supabase.from('subjects').insert({
            name: subForm.name.trim(), coefficient: parseFloat(subForm.coefficient) || 1,
            classroom_id: subForm.classroom_id, organization_id: orgId,
            teacher_id: subForm.teacher_id || null
        }).select('*, classrooms:classroom_id(id,name), teacher_profiles:teacher_id(id,first_name,last_name)').single();
        if (error) toast.error(error.message);
        else { setSubjects(p => [...p, data]); setShowNewSub(false); setSubForm({ name: '', coefficient: '1', classroom_id: '', teacher_id: '' }); toast.success('Matière créée ✅'); }
        setSavingSub(false);
    };

    const deleteSub = async (id: string) => {
        if (!confirm('Supprimer cette matière et tout son contenu ?')) return;
        await supabase.from('subjects').delete().eq('id', id);
        setSubjects(p => p.filter(s => s.id !== id));
        toast.success('Matière supprimée');
    };

    const createChapter = async (subjectId: string) => {
        if (!chForm.title) return;
        setSavingCh(true);
        const pos = chapters.filter(c => c.subject_id === subjectId).length;
        const { data, error } = await supabase.from('chapters').insert({
            subject_id: subjectId, title: chForm.title.trim(), content: chForm.content,
            status: 'published', position: pos
        }).select().single();
        if (error) toast.error(error.message);
        else { setChapters(p => [...p, data]); setShowNewCh(null); setChForm({ title: '', content: '' }); toast.success('Chapitre ajouté ✅'); }
        setSavingCh(false);
    };

    const toggleChapterStatus = async (ch: any) => {
        const newStatus = ch.status === 'published' ? 'draft' : 'published';
        await supabase.from('chapters').update({ status: newStatus }).eq('id', ch.id);
        setChapters(p => p.map(c => c.id === ch.id ? { ...c, status: newStatus } : c));
        toast.success(newStatus === 'published' ? '📢 Publié' : '🔒 Masqué');
    };

    const saveChapterContent = async (chId: string) => {
        await supabase.from('chapters').update({ content: editChContent }).eq('id', chId);
        setChapters(p => p.map(c => c.id === chId ? { ...c, content: editChContent } : c));
        setEditCh(null); toast.success('Contenu mis à jour');
    };

    const deleteChapter = async (chId: string) => {
        if (!confirm('Supprimer ce chapitre ?')) return;
        await supabase.from('chapters').delete().eq('id', chId);
        setChapters(p => p.filter(c => c.id !== chId));
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
        else { setLessons(p => [...p, data]); setShowNewLesson(null); setLessonForm({ title: '', content: '', estimated_minutes: '15' }); toast.success('Leçon ajoutée ✅'); }
        setSavingLesson(false);
    };

    const saveLessonContent = async (lId: string) => {
        await supabase.from('lessons').update({ content: editLessonContent }).eq('id', lId);
        setLessons(p => p.map(l => l.id === lId ? { ...l, content: editLessonContent } : l));
        setEditLesson(null); toast.success('Leçon mise à jour');
    };

    const addQuestion = () => {
        if (!newQ.question) return;
        setExForm(p => ({ ...p, questions: [...p.questions, { ...newQ, options: newQ.options.filter(o => o.trim()) }] }));
        setNewQ({ question: '', answer: '', options: ['', '', '', ''] });
    };

    const createExercise = async () => {
        if (!showNewEx || !exForm.title || exForm.questions.length === 0) return;
        setSavingEx(true);
        const { data, error } = await supabase.from('exercises').insert({
            organization_id: orgId, title: exForm.title, type: exForm.type,
            duration_minutes: exForm.duration_minutes, max_score: exForm.max_score,
            questions: exForm.questions, chapter_id: showNewEx.id
        }).select().single();
        if (error) toast.error(error.message);
        else { setExercises(p => [...p, data]); setShowNewEx(null); setExForm({ title: '', type: 'qcm', duration_minutes: 10, max_score: 20, questions: [] }); toast.success('Exercice créé ✅'); }
        setSavingEx(false);
    };

    const resolveDispute = async (dId: string, status: 'accepted' | 'rejected') => {
        await supabase.from('grade_disputes').update({ status, response: status === 'accepted' ? 'Note révisée par l\'administration' : 'Note maintenue' }).eq('id', dId);
        setDisputes(p => p.map(d => d.id === dId ? { ...d, status } : d));
        toast.success(`Réclamation ${status === 'accepted' ? 'acceptée' : 'rejetée'}`);
    };

    if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

    const pendingDisputes = disputes.filter(d => d.status === 'pending');

    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
                {[
                    { label: 'Matières', value: subjects.length, color: 'from-indigo-500/20 to-violet-500/10 border-indigo-500/20 text-indigo-400' },
                    { label: 'Chapitres', value: chapters.length, color: 'from-teal-500/20 to-emerald-500/10 border-teal-500/20 text-teal-400' },
                    { label: 'Exercices', value: exercises.length, color: 'from-violet-500/20 to-purple-500/10 border-violet-500/20 text-violet-400' },
                    { label: 'Réclamations', value: pendingDisputes.length, color: pendingDisputes.length > 0 ? 'from-orange-500/20 to-red-500/10 border-orange-500/20 text-orange-400' : 'from-white/5 to-white/3 border-white/10 text-slate-500' },
                ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className={cn("rounded-2xl p-3 border bg-gradient-to-br text-center", s.color)}>
                        <p className="text-xl font-black text-white">{s.value}</p>
                        <p className="text-[10px] text-slate-500">{s.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Disputes */}
            {pendingDisputes.length > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Flag className="w-4 h-4 text-orange-400" />
                        <span className="font-bold text-sm text-orange-300">{pendingDisputes.length} réclamation(s) en attente</span>
                    </div>
                    <div className="space-y-2">
                        {pendingDisputes.map((d: any) => (
                            <div key={d.id} className="bg-white/[0.04] rounded-xl p-3 flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white">{d.message}</p>
                                    <p className="text-[10px] text-slate-500">{new Date(d.created_at).toLocaleDateString('fr-FR')}</p>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <button onClick={() => resolveDispute(d.id, 'accepted')} className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] hover:bg-emerald-500/30">✓</button>
                                    <button onClick={() => resolveDispute(d.id, 'rejected')} className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-[10px] hover:bg-red-500/30">✗</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters + Add */}
            <div className="space-y-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <Input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                        placeholder="Rechercher une matière..." className="pl-9 bg-white/[0.04] border-white/10 text-white h-9 rounded-xl text-sm" />
                </div>
                <div className="flex gap-2">
                    <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
                        className="flex-1 bg-[#1a1d2e] border border-white/10 text-white text-xs rounded-xl px-3 h-9">
                        <option value="all">Toutes classes</option>
                        {allClasses.map((cls: any) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                    </select>
                    <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}
                        className="flex-1 bg-[#1a1d2e] border border-white/10 text-white text-xs rounded-xl px-3 h-9">
                        <option value="all">Tous profs</option>
                        {allTeachers.map((t: any) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                    </select>
                    <Button size="sm" onClick={() => setShowNewSub(true)} className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl h-9 px-3 shrink-0">
                        <Plus className="w-3.5 h-3.5 mr-1" /> Matière
                    </Button>
                </div>
            </div>

            {/* New Subject form */}
            <AnimatePresence>
                {showNewSub && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="bg-white/[0.04] border border-orange-500/20 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm text-white">Nouvelle matière</h4>
                            <button onClick={() => setShowNewSub(false)}><X className="w-4 h-4 text-slate-400" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label className="text-xs text-slate-400">Nom *</Label>
                                <Input value={subForm.name} onChange={e => setSubForm(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Mathématiques..." className="mt-1 bg-white/[0.05] border-white/10 text-white h-9 rounded-xl text-sm" />
                            </div>
                            <div>
                                <Label className="text-xs text-slate-400">Coefficient</Label>
                                <Input type="number" value={subForm.coefficient} onChange={e => setSubForm(p => ({ ...p, coefficient: e.target.value }))}
                                    className="mt-1 bg-white/[0.05] border-white/10 text-white h-9 rounded-xl text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label className="text-xs text-slate-400">Classe *</Label>
                                <select value={subForm.classroom_id} onChange={e => setSubForm(p => ({ ...p, classroom_id: e.target.value }))}
                                    className="mt-1 w-full bg-[#1a1d2e] border border-white/10 text-white text-sm rounded-xl px-3 h-9">
                                    <option value="">Choisir...</option>
                                    {allClasses.map((cls: any) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label className="text-xs text-slate-400">Professeur</Label>
                                <select value={subForm.teacher_id} onChange={e => setSubForm(p => ({ ...p, teacher_id: e.target.value }))}
                                    className="mt-1 w-full bg-[#1a1d2e] border border-white/10 text-white text-sm rounded-xl px-3 h-9">
                                    <option value="">Aucun</option>
                                    {allTeachers.map((t: any) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                                </select>
                            </div>
                        </div>
                        <Button onClick={createSubject} disabled={savingSub} className="w-full bg-orange-600 hover:bg-orange-500 text-white rounded-xl h-9 text-sm">
                            {savingSub ? 'Création...' : 'Créer la matière'}
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Subjects */}
            <div className="space-y-3">
                {filteredSubjects.length === 0 && (
                    <div className="text-center py-12 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
                        <GraduationCap className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                        <p className="text-slate-500 text-sm">Aucune matière trouvée</p>
                    </div>
                )}

                {filteredSubjects.map((sub: any, si: number) => {
                    const subChaps = chapters.filter(c => c.subject_id === sub.id);
                    const subLessons = lessons.filter(l => subChaps.some(c => c.id === l.chapter_id));
                    const subExs = exercises.filter(e => e.subject_id === sub.id || subChaps.some(c => c.id === e.chapter_id));
                    const subSubs2 = submissions.filter(s => subExs.some(e => e.id === s.exercise_id));
                    const isOpen = expandedSub === sub.id;
                    const publishedChaps = subChaps.filter(c => c.status === 'published').length;

                    return (
                        <motion.div key={sub.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.03 }}>
                            <div className={cn("rounded-2xl overflow-hidden border transition-all",
                                isOpen ? 'border-orange-500/25 bg-gradient-to-br from-orange-500/[0.06] to-amber-500/[0.03]' : 'border-white/[0.06] bg-white/[0.03]')}>

                                <div className="flex items-center p-4 gap-3">
                                    <button className="flex-1 flex items-center gap-3 text-left min-w-0" onClick={() => setExpandedSub(isOpen ? null : sub.id)}>
                                        <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shrink-0",
                                            isOpen ? 'bg-orange-500/20' : 'bg-white/[0.05]')}>
                                            <BookOpen className={cn("w-5 h-5", isOpen ? 'text-orange-400' : 'text-slate-500')} />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-sm text-white truncate">{sub.name}</h4>
                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                {sub.classrooms && <Badge className="text-[9px] bg-white/[0.08] text-slate-400 border-none">{sub.classrooms.name}</Badge>}
                                                {sub.teacher_profiles && <Badge className="text-[9px] bg-indigo-500/10 text-indigo-400 border-indigo-500/20">{sub.teacher_profiles.first_name} {sub.teacher_profiles.last_name}</Badge>}
                                                <span className="text-[10px] text-slate-600">{publishedChaps}/{subChaps.length} ch. • {subLessons.length} leçons • {subExs.length} exs</span>
                                            </div>
                                        </div>
                                    </button>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                        <button onClick={() => deleteSub(sub.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                            className="border-t border-white/[0.05] px-4 pb-4 pt-3 space-y-2">

                                            {subChaps.map((ch: any, ci: number) => {
                                                const chLessons = lessons.filter(l => l.chapter_id === ch.id);
                                                const chExs = exercises.filter(e => e.chapter_id === ch.id);
                                                const isChOpen = expandedCh === ch.id;
                                                const published = ch.status === 'published';

                                                return (
                                                    <div key={ch.id} className={cn("rounded-xl border overflow-hidden transition-all",
                                                        published ? 'border-teal-500/20' : 'border-slate-700/40 opacity-70',
                                                        isChOpen ? 'bg-white/[0.03]' : 'bg-white/[0.01]')}>

                                                        <div className="flex items-center p-3 gap-2">
                                                            <div className="w-7 h-7 rounded-lg bg-teal-500/15 flex items-center justify-center text-xs font-bold text-teal-400 shrink-0">{ci + 1}</div>
                                                            <button className="flex-1 text-left min-w-0" onClick={() => setExpandedCh(isChOpen ? null : ch.id)}>
                                                                <p className="text-sm font-semibold text-white truncate">{ch.title}</p>
                                                                <p className="text-[10px] text-slate-500">{chLessons.length} leçons • {chExs.length} exercices</p>
                                                            </button>
                                                            <div className="flex gap-1 shrink-0">
                                                                <button onClick={() => toggleChapterStatus(ch)} title={published ? 'Masquer' : 'Publier'}
                                                                    className={cn("p-1.5 rounded-lg transition-all", published ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/50 text-slate-500')}>
                                                                    {published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                                                </button>
                                                                <button onClick={() => { setEditCh(ch.id); setEditChContent(ch.content || ''); }}
                                                                    className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 text-slate-400">
                                                                    <Edit2 className="w-3 h-3" />
                                                                </button>
                                                                <button onClick={() => deleteChapter(ch.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400">
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {editCh === ch.id && (
                                                            <div className="px-3 pb-3 border-t border-white/[0.05] pt-2 space-y-2">
                                                                <Textarea value={editChContent} onChange={e => setEditChContent(e.target.value)}
                                                                    rows={5} placeholder="Contenu..." className="bg-white/[0.05] border-white/10 text-white text-sm resize-none rounded-xl" />
                                                                <div className="flex gap-2">
                                                                    <Button size="sm" onClick={() => saveChapterContent(ch.id)} className="bg-teal-600 text-white rounded-xl text-xs flex-1 h-8"><Save className="w-3 h-3 mr-1" />OK</Button>
                                                                    <Button size="sm" variant="ghost" onClick={() => setEditCh(null)} className="text-slate-400 text-xs h-8">Annuler</Button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <AnimatePresence>
                                                            {isChOpen && (
                                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                                    className="border-t border-white/[0.05] px-3 pb-3 pt-2 space-y-2">

                                                                    {chLessons.map((l: any) => (
                                                                        <div key={l.id} className="bg-white/[0.02] rounded-xl p-2.5 border border-white/[0.05]">
                                                                            <div className="flex items-center gap-2">
                                                                                <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                                                                <span className="text-xs font-medium text-white flex-1 truncate">{l.title}</span>
                                                                                <span className="text-[10px] text-slate-600">{l.estimated_minutes}min</span>
                                                                                <button onClick={() => { setEditLesson(l.id); setEditLessonContent(l.content || ''); }} className="p-1 text-slate-500 hover:text-white"><Edit2 className="w-2.5 h-2.5" /></button>
                                                                                <button onClick={async () => { await supabase.from('lessons').delete().eq('id', l.id); setLessons(p => p.filter(x => x.id !== l.id)); }} className="p-1 text-red-500/60 hover:text-red-400"><Trash2 className="w-2.5 h-2.5" /></button>
                                                                            </div>
                                                                            {editLesson === l.id && (
                                                                                <div className="mt-2 space-y-1.5">
                                                                                    <Textarea value={editLessonContent} onChange={e => setEditLessonContent(e.target.value)} rows={4} className="bg-white/[0.05] border-white/10 text-white text-xs resize-none rounded-xl" />
                                                                                    <div className="flex gap-1.5">
                                                                                        <Button size="sm" onClick={() => saveLessonContent(l.id)} className="bg-teal-600 text-white rounded-xl text-[10px] h-7 px-3"><Save className="w-2.5 h-2.5 mr-1" />OK</Button>
                                                                                        <Button size="sm" variant="ghost" onClick={() => setEditLesson(null)} className="text-slate-400 text-[10px] h-7 px-2">Annuler</Button>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}

                                                                    {showNewLesson === ch.id ? (
                                                                        <div className="space-y-2 bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                                                                            <Input value={lessonForm.title} onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))} placeholder="Titre..." className="bg-white/[0.05] border-white/10 text-white h-8 text-xs rounded-xl" />
                                                                            <Textarea value={lessonForm.content} onChange={e => setLessonForm(p => ({ ...p, content: e.target.value }))} rows={3} placeholder="Contenu..." className="bg-white/[0.05] border-white/10 text-white text-xs resize-none rounded-xl" />
                                                                            <div className="flex gap-2">
                                                                                <Button size="sm" onClick={() => createLesson(ch.id)} disabled={savingLesson} className="bg-teal-600 text-white rounded-xl text-xs flex-1 h-8">Ajouter</Button>
                                                                                <Button size="sm" variant="ghost" onClick={() => setShowNewLesson(null)} className="text-slate-400 text-xs h-8">Annuler</Button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <button onClick={() => setShowNewLesson(ch.id)} className="w-full py-1.5 rounded-xl border border-dashed border-white/10 text-slate-500 hover:text-white text-xs transition-all flex items-center justify-center gap-1">
                                                                            <Plus className="w-3 h-3" /> Leçon
                                                                        </button>
                                                                    )}

                                                                    {chExs.map((ex: any) => (
                                                                        <div key={ex.id} className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-2.5 flex items-center gap-2">
                                                                            <Badge className="text-[9px] bg-violet-500/20 text-violet-400 border-none shrink-0">{ex.type?.toUpperCase()}</Badge>
                                                                            <span className="text-xs text-white flex-1 truncate">{ex.title}</span>
                                                                            <span className="text-[10px] text-slate-500">{ex.duration_minutes}min/{ex.max_score}pts</span>
                                                                        </div>
                                                                    ))}

                                                                    <button onClick={() => setShowNewEx({ type: 'chapter', id: ch.id })} className="w-full py-1.5 rounded-xl border border-dashed border-violet-500/20 text-violet-500/60 hover:text-violet-400 text-xs transition-all flex items-center justify-center gap-1">
                                                                        <Plus className="w-3 h-3" /> Exercice
                                                                    </button>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })}

                                            {showNewCh === sub.id ? (
                                                <div className="space-y-2 bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                                                    <Input value={chForm.title} onChange={e => setChForm(p => ({ ...p, title: e.target.value }))} placeholder="Titre du chapitre..." className="bg-white/[0.05] border-white/10 text-white h-9 text-sm rounded-xl" />
                                                    <Textarea value={chForm.content} onChange={e => setChForm(p => ({ ...p, content: e.target.value }))} placeholder="Contenu..." rows={4} className="bg-white/[0.05] border-white/10 text-white text-sm resize-none rounded-xl" />
                                                    <div className="flex gap-2">
                                                        <Button size="sm" onClick={() => createChapter(sub.id)} disabled={savingCh || !chForm.title} className="bg-teal-600 text-white rounded-xl text-xs flex-1 h-9">Ajouter</Button>
                                                        <Button size="sm" variant="ghost" onClick={() => setShowNewCh(null)} className="text-slate-400 text-xs h-9">Annuler</Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={() => setShowNewCh(sub.id)} className="w-full py-3 rounded-xl border border-dashed border-teal-500/20 text-teal-500/60 hover:text-teal-400 hover:border-teal-500/40 text-xs transition-all flex items-center justify-center gap-1.5">
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

            {/* Exercise Modal */}
            <AnimatePresence>
                {showNewEx && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4"
                        onClick={() => setShowNewEx(null)}>
                        <motion.div initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }}
                            className="bg-[#0f1117] border border-violet-500/20 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 shadow-2xl"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-white">Créer un exercice</h3>
                                <button onClick={() => setShowNewEx(null)}><X className="w-4 h-4 text-slate-400" /></button>
                            </div>
                            <div className="space-y-3">
                                <Input value={exForm.title} onChange={e => setExForm(p => ({ ...p, title: e.target.value }))} placeholder="Titre..." className="bg-white/[0.05] border-white/10 text-white rounded-xl" />
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
                                        <div key={qi} className="bg-white/[0.03] rounded-xl p-2.5 flex gap-2 text-xs">
                                            <span className="text-slate-500 shrink-0">{qi + 1}.</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white">{q.question}</p>
                                                {q.answer && <p className="text-emerald-400 mt-0.5">→ {q.answer}</p>}
                                            </div>
                                            <button onClick={() => setExForm(p => ({ ...p, questions: p.questions.filter((_, i) => i !== qi) }))} className="text-red-400/60 hover:text-red-400"><X className="w-3 h-3" /></button>
                                        </div>
                                    ))}
                                    <div className="bg-white/[0.03] rounded-xl p-3 space-y-2 border border-white/[0.05]">
                                        <Textarea value={newQ.question} onChange={e => setNewQ(p => ({ ...p, question: e.target.value }))} placeholder="Question..." rows={2} className="bg-white/[0.05] border-white/10 text-white text-xs resize-none rounded-xl" />
                                        {exForm.type === 'qcm' && newQ.options.map((opt, oi) => (
                                            <Input key={oi} value={opt} onChange={e => setNewQ(p => ({ ...p, options: p.options.map((o, i) => i === oi ? e.target.value : o) }))} placeholder={`Option ${String.fromCharCode(65 + oi)}`} className="bg-white/[0.05] border-white/10 text-white h-8 text-xs rounded-xl" />
                                        ))}
                                        <Input value={newQ.answer} onChange={e => setNewQ(p => ({ ...p, answer: e.target.value }))} placeholder="Réponse attendue..." className="bg-white/[0.05] border-white/10 text-white h-8 text-xs rounded-xl" />
                                        <button onClick={addQuestion} disabled={!newQ.question} className="w-full py-1.5 rounded-xl bg-violet-500/15 border border-violet-500/25 text-violet-400 text-xs hover:bg-violet-500/25 transition-all flex items-center justify-center gap-1">
                                            <Plus className="w-3 h-3" /> Ajouter
                                        </button>
                                    </div>
                                </div>
                                <Button onClick={createExercise} disabled={savingEx || !exForm.title || exForm.questions.length === 0} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl h-10">
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
