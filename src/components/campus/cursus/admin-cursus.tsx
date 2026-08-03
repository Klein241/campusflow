'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, X, Save, Trash2, Eye, EyeOff,
    BookOpen, Layers, Users, BarChart3, GraduationCap, Edit2,
    Flag, Search, Timer, FileText, Star,
    ChevronRight, ChevronLeft, CheckCircle2, Filter
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
import { RichContentEditor, parseContent, serializeContent, type ContentBlock } from './rich-content-editor';

// ─── Palette couleurs (même palette que teacher/student) ─────────────────────
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
const getColor = (i: number) => SUBJECT_COLORS[i % SUBJECT_COLORS.length];

interface AdminCursusProps {
    orgId: string;
    allClasses: any[];
    allTeachers: any[];
}

export function AdminCursus({ orgId, allClasses, allTeachers }: AdminCursusProps) {
    const [subjects,    setSubjects]    = useState<any[]>([]);
    const [chapters,    setChapters]    = useState<any[]>([]);
    const [lessons,     setLessons]     = useState<any[]>([]);
    const [exercises,   setExercises]   = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [disputes,    setDisputes]    = useState<any[]>([]);
    const [loading,     setLoading]     = useState(true);

    // ── Filtres ──
    const [filterClass,   setFilterClass]   = useState<string>('all');
    const [filterTeacher, setFilterTeacher] = useState<string>('all');
    const [searchQ,       setSearchQ]       = useState('');
    const [showFilters,   setShowFilters]   = useState(false);

    // ── Navigation Miller Columns ──
    const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
    const [selectedChId,  setSelectedChId]  = useState<string | null>(null);
    const [activeTab,     setActiveTab]     = useState<'lessons' | 'exercises'>('lessons');

    // ── Forms matière ──
    const [showNewSub, setShowNewSub] = useState(false);
    const [subForm,    setSubForm]    = useState({ name: '', coefficient: '1', classroom_id: '', teacher_id: '' });
    const [savingSub,  setSavingSub]  = useState(false);

    // ── Forms chapitre ──
    const [showNewCh, setShowNewCh] = useState(false);
    const [chForm,    setChForm]    = useState<{ title: string; contentBlocks: ContentBlock[] }>({ title: '', contentBlocks: [] });
    const [savingCh,  setSavingCh]  = useState(false);
    const [editCh,    setEditCh]    = useState<string | null>(null);
    const [editChBlocks, setEditChBlocks] = useState<ContentBlock[]>([]);

    // ── Forms leçon ──
    const [showNewLesson, setShowNewLesson] = useState(false);
    const [lessonForm,    setLessonForm]    = useState<{ title: string; contentBlocks: ContentBlock[]; estimated_minutes: string }>({ title: '', contentBlocks: [], estimated_minutes: '15' });
    const [savingLesson,  setSavingLesson]  = useState(false);
    const [editLesson,    setEditLesson]    = useState<string | null>(null);
    const [editLessonBlocks, setEditLessonBlocks] = useState<ContentBlock[]>([]);

    // ── Forms exercice ──
    const [showNewEx, setShowNewEx] = useState(false);
    const [exForm,    setExForm]    = useState({ title: '', type: 'qcm', duration_minutes: 10, max_score: 20, questions: [] as any[] });
    const [newQ,      setNewQ]      = useState({ question: '', answer: '', options: ['', '', '', ''] });
    const [savingEx,  setSavingEx]  = useState(false);

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

            // Charger les réclamations avec les infos de base
            const { data: disp } = await supabase.from('grade_disputes')
                .select('*')
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false });
            const rawDisp = disp || [];

            // Enrichir avec student_profiles, subjects, exercises
            const enrichedDisp = await Promise.all(rawDisp.map(async (d: any) => {
                const [{ data: stu }, { data: subj }, { data: exo }] = await Promise.all([
                    d.student_id
                        ? supabase.from('student_profiles').select('first_name,last_name').eq('id', d.student_id).single()
                        : Promise.resolve({ data: null }),
                    d.subject_id
                        ? supabase.from('subjects').select('name').eq('id', d.subject_id).single()
                        : Promise.resolve({ data: null }),
                    d.exercise_id
                        ? supabase.from('exercises').select('title').eq('id', d.exercise_id).single()
                        : Promise.resolve({ data: null }),
                ]);
                return { ...d, student: stu, subject: subj, exercise: exo };
            }));
            setDisputes(enrichedDisp);
        } catch (e: any) { console.error(e); toast.error('Erreur de chargement'); }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [orgId]);

    // ── Dérivés ──
    const filteredSubjects = subjects.filter(s => {
        if (filterClass !== 'all' && s.classroom_id !== filterClass) return false;
        if (filterTeacher !== 'all' && s.teacher_id !== filterTeacher) return false;
        if (searchQ && !s.name.toLowerCase().includes(searchQ.toLowerCase())) return false;
        return true;
    });
    const selectedSub  = subjects.find(s => s.id === selectedSubId);
    const selectedCh   = chapters.find(c => c.id === selectedChId);
    const subChapters  = chapters.filter(c => c.subject_id === selectedSubId);
    const chLessons    = lessons.filter(l => l.chapter_id === selectedChId);
    const chExercises  = exercises.filter(e => e.chapter_id === selectedChId);
    const pendingDisputes = disputes.filter(d => d.status === 'pending');
    const selectedSubIndex = subjects.findIndex(s => s.id === selectedSubId);

    // ── CRUD ──
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
        if (selectedSubId === id) { setSelectedSubId(null); setSelectedChId(null); }
        toast.success('Matière supprimée');
    };

    const createChapter = async () => {
        if (!chForm.title || !selectedSubId) return;
        setSavingCh(true);
        const pos = subChapters.length;
        const parentSub = subjects.find(s => s.id === selectedSubId);
        const { data, error } = await supabase.from('chapters').insert({
            organization_id: orgId, teacher_id: parentSub?.teacher_id || null,
            subject_id: selectedSubId, title: chForm.title.trim(),
            content: serializeContent(chForm.contentBlocks), status: 'published', position: pos
        }).select().single();
        if (error) toast.error(error.message);
        else { setChapters(p => [...p, data]); setShowNewCh(false); setChForm({ title: '', contentBlocks: [] }); toast.success('Chapitre ajouté ✅'); }
        setSavingCh(false);
    };

    const toggleChapterStatus = async (ch: any) => {
        const newStatus = ch.status === 'published' ? 'draft' : 'published';
        await supabase.from('chapters').update({ status: newStatus }).eq('id', ch.id);
        setChapters(p => p.map(c => c.id === ch.id ? { ...c, status: newStatus } : c));
        toast.success(newStatus === 'published' ? '📢 Publié' : '🔒 Masqué');
    };

    const saveChapterContent = async (chId: string) => {
        const serialized = serializeContent(editChBlocks);
        await supabase.from('chapters').update({ content: serialized }).eq('id', chId);
        setChapters(p => p.map(c => c.id === chId ? { ...c, content: serialized } : c));
        setEditCh(null); toast.success('Chapitre mis à jour');
    };

    const deleteChapter = async (chId: string) => {
        if (!confirm('Supprimer ce chapitre ?')) return;
        await supabase.from('chapters').delete().eq('id', chId);
        setChapters(p => p.filter(c => c.id !== chId));
        if (selectedChId === chId) setSelectedChId(null);
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
        else { setLessons(p => [...p, data]); setShowNewLesson(false); setLessonForm({ title: '', contentBlocks: [], estimated_minutes: '15' }); toast.success('Leçon ajoutée ✅'); }
        setSavingLesson(false);
    };

    const saveLessonContent = async (lId: string) => {
        const serialized = serializeContent(editLessonBlocks);
        await supabase.from('lessons').update({ content: serialized }).eq('id', lId);
        setLessons(p => p.map(l => l.id === lId ? { ...l, content: serialized } : l));
        setEditLesson(null); toast.success('Leçon mise à jour');
    };

    const addQuestion = () => {
        if (!newQ.question) return;
        setExForm(p => ({ ...p, questions: [...p.questions, { ...newQ, options: newQ.options.filter(o => o.trim()) }] }));
        setNewQ({ question: '', answer: '', options: ['', '', '', ''] });
    };

    const createExercise = async () => {
        if (!exForm.title || exForm.questions.length === 0 || !selectedChId) return;
        setSavingEx(true);
        const { data, error } = await supabase.from('exercises').insert({
            organization_id: orgId, title: exForm.title, type: exForm.type,
            duration_minutes: exForm.duration_minutes, max_score: exForm.max_score,
            questions: exForm.questions, chapter_id: selectedChId
        }).select().single();
        if (error) toast.error(error.message);
        else { setExercises(p => [...p, data]); setShowNewEx(false); setExForm({ title: '', type: 'qcm', duration_minutes: 10, max_score: 20, questions: [] }); toast.success('Exercice créé ✅'); }
        setSavingEx(false);
    };

    const resolveDispute = async (dId: string, status: 'accepted' | 'rejected') => {
        const { error } = await supabase.from('grade_disputes').update({
            status,
            response: status === 'accepted' ? 'Note révisée par l\'administration' : 'Note maintenue',
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }).eq('id', dId);
        if (error) { toast.error('Erreur lors de la résolution'); return; }
        setDisputes(p => p.map(d => d.id === dId ? { ...d, status } : d));
        toast.success(`Réclamation ${status === 'accepted' ? '✅ acceptée' : '❌ rejetée'}`);
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    // ══════════════════════════ RENDER ══════════════════════════

    return (
        <div className="space-y-4">

            {/* ── Stats ── */}
            <div className="grid grid-cols-4 gap-2">
                {[
                    { label: 'Matières',     value: subjects.length,           color: 'from-indigo-500/20 to-violet-500/10 border-indigo-500/20 text-indigo-400' },
                    { label: 'Chapitres',    value: chapters.length,           color: 'from-teal-500/20 to-emerald-500/10 border-teal-500/20 text-teal-400' },
                    { label: 'Exercices',    value: exercises.length,          color: 'from-violet-500/20 to-purple-500/10 border-violet-500/20 text-violet-400' },
                    { label: 'Réclamations', value: pendingDisputes.length,    color: pendingDisputes.length > 0 ? 'from-orange-500/20 to-red-500/10 border-orange-500/20 text-orange-400' : 'from-white/5 to-white/3 border-white/10 text-slate-500' },
                ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className={cn('rounded-2xl p-3 border bg-gradient-to-br text-center', s.color)}>
                        <p className="text-xl font-black text-white">{s.value}</p>
                        <p className="text-[10px] text-slate-500">{s.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* ── Disputes ── */}
            {pendingDisputes.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Flag className="w-4 h-4 text-orange-400" />
                        <span className="font-bold text-sm text-orange-300">{pendingDisputes.length} réclamation(s) en attente</span>
                    </div>
                    <div className="space-y-2">
                        {pendingDisputes.map((d: any) => {
                            const studentName = d.student ? `${d.student.first_name} ${d.student.last_name}` : 'Étudiant inconnu';
                            const subjectName = d.subject?.name || '';
                            const exerciseTitle = d.exercise?.title || '';
                            return (
                                <div key={d.id} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 space-y-2">
                                    {/* En-tête : qui + quoi */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-[11px] font-bold text-orange-300">{studentName}</span>
                                                {subjectName && (
                                                    <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full">{subjectName}</span>
                                                )}
                                                {exerciseTitle && (
                                                    <span className="text-[9px] bg-white/10 text-slate-400 px-1.5 py-0.5 rounded-full truncate max-w-[120px]">{exerciseTitle}</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-white mt-1 leading-relaxed">{d.message}</p>
                                            <p className="text-[10px] text-slate-500 mt-1">
                                                {new Date(d.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                        {/* Boutons */}
                                        <div className="flex gap-1.5 shrink-0">
                                            <button
                                                onClick={() => resolveDispute(d.id, 'accepted')}
                                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold hover:bg-emerald-500/30 transition"
                                            >
                                                <CheckCircle2 className="w-3 h-3" /> Accepter
                                            </button>
                                            <button
                                                onClick={() => resolveDispute(d.id, 'rejected')}
                                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-semibold hover:bg-red-500/30 transition"
                                            >
                                                <X className="w-3 h-3" /> Rejeter
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            )}

            {/* ══════════════ MILLER COLUMNS ══════════════ */}
            <div className="rounded-2xl overflow-hidden border border-white/[0.07] bg-[#0c0e16]">

                {/* Breadcrumb + Search bar */}
                <div className="border-b border-white/[0.06] bg-white/[0.02]">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1.5 px-4 py-2.5">
                        <button onClick={() => { setSelectedSubId(null); setSelectedChId(null); }}
                            className={cn('text-xs font-semibold transition-colors', !selectedSubId ? 'text-white' : 'text-slate-500 hover:text-slate-300')}>
                            🎓 Admin Cursus
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
                        <div className="flex-1" />
                        {/* Filter toggle (only on subject list) */}
                        {!selectedSubId && (
                            <button onClick={() => setShowFilters(f => !f)}
                                className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all',
                                    showFilters ? 'bg-orange-500/20 text-orange-300' : 'text-slate-500 hover:text-slate-300 bg-white/[0.04]')}>
                                <Filter className="w-3 h-3" />
                                Filtres
                            </button>
                        )}
                    </div>

                    {/* Filters panel (col 1 only) */}
                    <AnimatePresence>
                        {!selectedSubId && showFilters && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                className="px-4 pb-3 space-y-2 overflow-hidden">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                    <Input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                                        placeholder="Rechercher..." className="pl-9 bg-white/[0.04] border-white/10 text-white h-8 rounded-xl text-xs" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
                                        className="bg-[#1a1d2e] border border-white/10 text-white text-xs rounded-xl px-3 h-8">
                                        <option value="all">Toutes classes</option>
                                        {allClasses.map((cls: any) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                                    </select>
                                    <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}
                                        className="bg-[#1a1d2e] border border-white/10 text-white text-xs rounded-xl px-3 h-8">
                                        <option value="all">Tous profs</option>
                                        {allTeachers.map((t: any) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                                    </select>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── COL 1 : Matières ── */}
                {!selectedSubId && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 space-y-2">
                        <div className="flex items-center justify-between mb-1 px-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Toutes les matières</span>
                            <button onClick={() => setShowNewSub(true)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-600/80 hover:bg-orange-500 text-white text-xs font-semibold transition-all">
                                <Plus className="w-3.5 h-3.5" /> Matière
                            </button>
                        </div>

                        {filteredSubjects.length === 0 && !showNewSub && (
                            <div className="text-center py-14">
                                <GraduationCap className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                                <p className="text-slate-500 text-sm">Aucune matière trouvée</p>
                            </div>
                        )}

                        {filteredSubjects.map((sub: any, si: number) => {
                            const col = getColor(si);
                            const subChaps   = chapters.filter(c => c.subject_id === sub.id);
                            const pubChaps   = subChaps.filter(c => c.status === 'published').length;
                            const subLessons = lessons.filter(l => subChaps.some(c => c.id === l.chapter_id)).length;
                            const subExs     = exercises.filter(e => subChaps.some(c => c.id === e.chapter_id)).length;
                            return (
                                <motion.button key={sub.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: si * 0.04 }}
                                    onClick={() => { setSelectedSubId(sub.id); setSelectedChId(null); }}
                                    className={cn('w-full text-left rounded-2xl border p-4 transition-all group hover:scale-[1.01] hover:shadow-lg', col.bg, col.border, col.glow)}>
                                    <div className="flex items-center gap-3">
                                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg font-black', col.bg, col.text)}>
                                            {sub.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn('text-sm font-black leading-tight', col.text)}>{sub.name}</p>
                                            <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                                                {sub.classrooms && <span className="text-[10px] text-slate-400">{sub.classrooms.name}</span>}
                                                {sub.teacher_profiles && (
                                                    <span className="text-[10px] text-slate-500">
                                                        👨‍🏫 {sub.teacher_profiles.first_name} {sub.teacher_profiles.last_name}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-slate-600">Coef. {sub.coefficient || 1}</span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs font-bold text-white">{pubChaps}/{subChaps.length}</p>
                                            <p className="text-[9px] text-slate-500">chapitres</p>
                                            <p className="text-[9px] text-slate-600 mt-0.5">{subLessons} leç. · {subExs} ex.</p>
                                        </div>
                                        <ChevronRight className={cn('w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1', col.text)} />
                                    </div>
                                    {subChaps.length > 0 && (
                                        <div className="mt-3">
                                            <Progress value={(pubChaps / subChaps.length) * 100} className="h-1" />
                                        </div>
                                    )}
                                    {/* Delete btn */}
                                    <div className="flex items-center justify-end mt-3 pt-2 border-t border-white/[0.06]" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => deleteSub(sub.id)}
                                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 transition-all">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </motion.button>
                            );
                        })}

                        {/* New subject form */}
                        <AnimatePresence>
                            {showNewSub && (
                                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
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
                                    <Button onClick={createSubject} disabled={savingSub || !subForm.name || !subForm.classroom_id}
                                        className="w-full bg-orange-600 hover:bg-orange-500 text-white rounded-xl h-9 text-sm">
                                        {savingSub ? 'Création...' : 'Créer la matière'}
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* ── COL 2 : Chapitres ── */}
                {selectedSubId && !selectedChId && (
                    <motion.div key="chapters" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="p-3 space-y-2">
                        {(() => {
                            const col = getColor(selectedSubIndex);
                            return (
                                <>
                                    <div className="flex items-center justify-between mb-1 px-1">
                                        <div className="flex items-center gap-2">
                                            <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black', col.bg, col.text)}>
                                                {selectedSub?.name?.charAt(0)}
                                            </div>
                                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Chapitres</span>
                                            <span className="text-[10px] text-slate-600">({subChapters.length})</span>
                                        </div>
                                        <button onClick={() => setShowNewCh(true)}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600/80 hover:bg-teal-500 text-white text-xs font-semibold transition-all">
                                            <Plus className="w-3.5 h-3.5" /> Chapitre
                                        </button>
                                    </div>

                                    {/* Infos matière sélectionnée */}
                                    {selectedSub?.teacher_profiles && (
                                        <div className="flex items-center gap-2 px-1 mb-2">
                                            <Badge className="text-[9px] bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                                                👨‍🏫 {selectedSub.teacher_profiles.first_name} {selectedSub.teacher_profiles.last_name}
                                            </Badge>
                                            {selectedSub.classrooms && (
                                                <Badge className="text-[9px] bg-white/[0.08] text-slate-400 border-none">
                                                    {selectedSub.classrooms.name}
                                                </Badge>
                                            )}
                                        </div>
                                    )}

                                    {subChapters.length === 0 && !showNewCh && (
                                        <div className="text-center py-12">
                                            <Layers className="w-10 h-10 mx-auto mb-2 text-slate-700" />
                                            <p className="text-slate-500 text-sm">Aucun chapitre</p>
                                        </div>
                                    )}

                                    {subChapters.map((ch: any, ci: number) => {
                                        const chLsns  = lessons.filter(l => l.chapter_id === ch.id).length;
                                        const chExs   = exercises.filter(e => e.chapter_id === ch.id).length;
                                        const pub     = ch.status === 'published';
                                        return (
                                            <motion.div key={ch.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ci * 0.04 }}
                                                className={cn('rounded-2xl border transition-all group overflow-hidden',
                                                    pub ? 'border-teal-500/25 bg-teal-500/[0.04]' : 'border-slate-700/40 bg-white/[0.02] opacity-75')}>
                                                <button className="w-full text-left p-3.5 flex items-center gap-3"
                                                    onClick={() => { setSelectedChId(ch.id); setActiveTab('lessons'); }}>
                                                    <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                                                        <span className="text-sm font-black text-teal-400">{ci + 1}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-white leading-tight">{ch.title}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] text-slate-400">{chLsns} leçon{chLsns > 1 ? 's' : ''}</span>
                                                            {chExs > 0 && <span className="text-[10px] text-violet-400">⚡ {chExs} ex.</span>}
                                                            {!pub && <span className="text-[10px] text-slate-500">🔒 Brouillon</span>}
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-teal-400 transition-colors shrink-0" />
                                                </button>
                                                {/* Toolbar */}
                                                <div className="flex items-center gap-1.5 px-3 pb-3">
                                                    <button onClick={() => toggleChapterStatus(ch)}
                                                        className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all',
                                                            pub ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : 'bg-slate-700/40 text-slate-400 hover:bg-slate-700/60')}>
                                                        {pub ? <><Eye className="w-3 h-3" />Publié</> : <><EyeOff className="w-3 h-3" />Brouillon</>}
                                                    </button>
                                                    <div className="flex-1" />
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
                                                        <RichContentEditor blocks={editChBlocks} onChange={setEditChBlocks} placeholder="Contenu du chapitre..." userId={orgId} />
                                                        <div className="flex gap-2">
                                                            <Button size="sm" onClick={() => saveChapterContent(ch.id)} className="bg-teal-600 text-white rounded-xl text-xs flex-1"><Save className="w-3 h-3 mr-1" />Sauvegarder</Button>
                                                            <Button size="sm" variant="ghost" onClick={() => setEditCh(null)} className="text-slate-400 text-xs">Annuler</Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}

                                    {/* New chapter form */}
                                    <AnimatePresence>
                                        {showNewCh && (
                                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                className="bg-white/[0.04] border border-teal-500/20 rounded-2xl p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-semibold text-sm text-white">Nouveau chapitre</h4>
                                                    <button onClick={() => setShowNewCh(false)}><X className="w-4 h-4 text-slate-400" /></button>
                                                </div>
                                                <Input value={chForm.title} onChange={e => setChForm(p => ({ ...p, title: e.target.value }))}
                                                    placeholder="Titre du chapitre..." className="bg-white/[0.05] border-white/10 text-white rounded-xl" />
                                                <RichContentEditor blocks={chForm.contentBlocks} onChange={blocks => setChForm(p => ({ ...p, contentBlocks: blocks }))} placeholder="Contenu..." userId={orgId} />
                                                <div className="flex gap-2">
                                                    <Button onClick={createChapter} disabled={savingCh || !chForm.title} className="flex-1 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm">
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

                {/* ── COL 3 : Leçons + Exercices ── */}
                {selectedSubId && selectedChId && (
                    <motion.div key="content" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="p-3 space-y-3">

                        {/* Chapter info + publish toggle */}
                        <div className="flex items-center justify-between px-1">
                            <div>
                                <p className="text-xs font-bold text-white">{selectedCh?.title}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    {chLessons.length} leçon{chLessons.length > 1 ? 's' : ''} · {chExercises.length} exercice{chExercises.length > 1 ? 's' : ''}
                                </p>
                            </div>
                            {selectedCh && (
                                <button onClick={() => toggleChapterStatus(selectedCh)}
                                    className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all',
                                        selectedCh.status === 'published' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-slate-700/40 text-slate-400 border border-slate-700/40')}>
                                    {selectedCh.status === 'published' ? <><Eye className="w-3 h-3" />Publié</> : <><EyeOff className="w-3 h-3" />Brouillon</>}
                                </button>
                            )}
                        </div>

                        {/* Tab switcher */}
                        <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl">
                            <button onClick={() => setActiveTab('lessons')}
                                className={cn('flex-1 py-2 rounded-lg text-xs font-bold transition-all', activeTab === 'lessons' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white')}>
                                📝 Leçons ({chLessons.length})
                            </button>
                            <button onClick={() => setActiveTab('exercises')}
                                className={cn('flex-1 py-2 rounded-lg text-xs font-bold transition-all', activeTab === 'exercises' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white')}>
                                🧩 Exercices ({chExercises.length})
                            </button>
                        </div>

                        {/* Leçons */}
                        {activeTab === 'lessons' && (
                            <div className="space-y-2">
                                {chLessons.length === 0 && !showNewLesson && (
                                    <div className="text-center py-8">
                                        <FileText className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                                        <p className="text-slate-500 text-xs">Aucune leçon</p>
                                    </div>
                                )}
                                {chLessons.map((l: any) => (
                                    <div key={l.id} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                                            <span className="text-xs font-semibold text-white flex-1 truncate">{l.title}</span>
                                            <span className="text-[10px] text-slate-500 shrink-0">{l.estimated_minutes}min</span>
                                            <button onClick={() => { setEditLesson(l.id); setEditLessonBlocks(parseContent(l.content)); }}
                                                className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 transition-all">
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                            <button onClick={async () => { await supabase.from('lessons').delete().eq('id', l.id); setLessons(p => p.filter(x => x.id !== l.id)); }}
                                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/70 hover:text-red-400 transition-all">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                        {editLesson === l.id && (
                                            <div className="mt-3 space-y-2 pt-3 border-t border-white/[0.06]">
                                                <RichContentEditor blocks={editLessonBlocks} onChange={setEditLessonBlocks} placeholder="Contenu de la leçon..." userId={orgId} />
                                                <div className="flex gap-2">
                                                    <Button size="sm" onClick={() => saveLessonContent(l.id)} className="bg-teal-600 text-white rounded-xl text-xs flex-1 h-8"><Save className="w-3 h-3 mr-1" />OK</Button>
                                                    <Button size="sm" variant="ghost" onClick={() => setEditLesson(null)} className="text-slate-400 text-xs h-8">Annuler</Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* New lesson form */}
                                <AnimatePresence>
                                    {showNewLesson && (
                                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                            className="bg-white/[0.04] border border-teal-500/20 rounded-2xl p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-semibold text-sm text-white">Nouvelle leçon</h4>
                                                <button onClick={() => setShowNewLesson(false)}><X className="w-4 h-4 text-slate-400" /></button>
                                            </div>
                                            <div className="flex gap-2">
                                                <Input value={lessonForm.title} onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))}
                                                    placeholder="Titre de la leçon..." className="flex-1 bg-white/[0.05] border-white/10 text-white h-9 rounded-xl text-sm" />
                                                <Input type="number" value={lessonForm.estimated_minutes} onChange={e => setLessonForm(p => ({ ...p, estimated_minutes: e.target.value }))}
                                                    className="w-20 bg-white/[0.05] border-white/10 text-white h-9 rounded-xl text-sm text-center" placeholder="min" />
                                            </div>
                                            <RichContentEditor blocks={lessonForm.contentBlocks} onChange={blocks => setLessonForm(p => ({ ...p, contentBlocks: blocks }))} placeholder="Contenu de la leçon..." userId={orgId} />
                                            <div className="flex gap-2">
                                                <Button onClick={createLesson} disabled={savingLesson || !lessonForm.title} className="flex-1 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm">
                                                    {savingLesson ? 'Ajout...' : 'Ajouter la leçon'}
                                                </Button>
                                                <Button variant="ghost" onClick={() => setShowNewLesson(false)} className="text-slate-400">Annuler</Button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {!showNewLesson && (
                                    <button onClick={() => setShowNewLesson(true)}
                                        className="w-full py-2.5 rounded-xl border border-dashed border-teal-500/20 text-teal-500/60 hover:text-teal-400 hover:border-teal-500/40 text-xs transition-all flex items-center justify-center gap-1.5">
                                        <Plus className="w-3.5 h-3.5" /> Ajouter une leçon
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Exercices */}
                        {activeTab === 'exercises' && (
                            <div className="space-y-2">
                                {chExercises.length === 0 && !showNewEx && (
                                    <div className="text-center py-8">
                                        <Star className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                                        <p className="text-slate-500 text-xs">Aucun exercice</p>
                                    </div>
                                )}
                                {chExercises.map((ex: any) => {
                                    const exSubs  = submissions.filter(s => s.exercise_id === ex.id);
                                    const avgScore = exSubs.length > 0 ? exSubs.reduce((a: number, s: any) => a + (s.score || 0), 0) / exSubs.length : null;
                                    return (
                                        <div key={ex.id} className="rounded-xl border border-violet-500/20 bg-violet-500/[0.05] p-3 flex items-center gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <Badge className="text-[9px] bg-violet-500/20 text-violet-400 border-none">{ex.type?.toUpperCase()}</Badge>
                                                    <span className="text-xs font-semibold text-white truncate">{ex.title}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500">
                                                    {ex.duration_minutes}min · max {ex.max_score}pts · {exSubs.length} soumission{exSubs.length > 1 ? 's' : ''}
                                                    {avgScore !== null ? ` · moy. ${avgScore.toFixed(1)}` : ''}
                                                </p>
                                            </div>
                                            <button onClick={async () => { await supabase.from('exercises').delete().eq('id', ex.id); setExercises(p => p.filter(e => e.id !== ex.id)); }}
                                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/70 hover:text-red-400 transition-all shrink-0">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })}

                                {!showNewEx && (
                                    <button onClick={() => setShowNewEx(true)}
                                        className="w-full py-2.5 rounded-xl border border-dashed border-violet-500/20 text-violet-500/60 hover:text-violet-400 hover:border-violet-500/40 text-xs transition-all flex items-center justify-center gap-1.5">
                                        <Plus className="w-3.5 h-3.5" /> Ajouter un exercice
                                    </button>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </div>

            {/* ═══ MODAL: Créer exercice ═══ */}
            <AnimatePresence>
                {showNewEx && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4"
                        onClick={() => setShowNewEx(false)}>
                        <motion.div initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }}
                            className="bg-[#0f1117] border border-violet-500/20 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 shadow-2xl"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-white">Créer un exercice</h3>
                                <button onClick={() => setShowNewEx(false)}><X className="w-4 h-4 text-slate-400" /></button>
                            </div>
                            <div className="space-y-3">
                                <Input value={exForm.title} onChange={e => setExForm(p => ({ ...p, title: e.target.value }))}
                                    placeholder="Titre..." className="bg-white/[0.05] border-white/10 text-white rounded-xl" />
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
                                            <div className="flex-1 min-w-0"><p className="text-white">{q.question}</p>{q.answer && <p className="text-emerald-400 mt-0.5">→ {q.answer}</p>}</div>
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
                                            <Plus className="w-3 h-3" /> Ajouter la question
                                        </button>
                                    </div>
                                </div>
                                <Button onClick={createExercise} disabled={savingEx || !exForm.title || exForm.questions.length === 0}
                                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl h-10">
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
