'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Calendar, Users, GraduationCap, ClipboardList, Trophy,
    Home, MessageSquare, Loader2, Clock, CheckCircle2,
    Save, X, BarChart3, FileText, PenSquare, LogOut, User, AlertCircle,
    Layers, Plus, ChevronDown, ChevronUp, Trash2, Eye, EyeOff, Lock, Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════
// CAMPUSFLOW — DASHBOARD PROFESSEUR (holographic-ring design)
// ═══════════════════════════════════════════════════════

type Tab = 'dashboard' | 'timetable' | 'cursus' | 'grades' | 'profile';
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

// ═══ BOTTOM NAV ═══
function BottomNav({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (t: Tab) => void }) {
    const navItems: { id: Tab; icon: any; label: string; color?: string }[] = [
        { id: 'dashboard', icon: Home, label: 'Accueil' },
        { id: 'timetable', icon: Calendar, label: 'Horaires', color: 'teal' },
        { id: 'cursus', icon: Layers, label: 'Cursus', color: 'indigo' },
        { id: 'grades', icon: ClipboardList, label: 'Notes', color: 'amber' },
        { id: 'profile', icon: User, label: 'Profil' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-[env(safe-area-inset-bottom,0px)] bg-linear-to-t from-[#0B0E14] via-[#0B0E14]/95 to-transparent pt-3">
            <div className="glass-card flex items-center p-1.5 gap-0.5 bg-[#0F172A]/95 backdrop-blur-xl border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.5)] rounded-2xl w-full max-w-sm mx-auto justify-between px-2">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    const colorMap: Record<string, { text: string; bg: string; ping: string }> = {
                        teal: { text: 'text-teal-400', bg: 'bg-teal-500/20', ping: 'bg-teal-400' },
                        indigo: { text: 'text-indigo-400', bg: 'bg-indigo-500/20', ping: 'bg-indigo-400' },
                        amber: { text: 'text-amber-400', bg: 'bg-amber-500/20', ping: 'bg-amber-400' },
                    };
                    const c = item.color ? colorMap[item.color] : null;

                    return (
                        <button key={item.id} onClick={() => onTabChange(item.id)}
                            className={cn(
                                "relative flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-300",
                                isActive ? "text-primary" : "text-slate-500 hover:text-slate-300",
                                c && !isActive && c.text,
                            )}>
                            {c && !isActive && (
                                <div className="absolute top-1 right-1.5">
                                    <span className="relative flex h-2 w-2">
                                        <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", c.ping)} />
                                        <span className={cn("relative inline-flex rounded-full h-2 w-2", c.ping)} />
                                    </span>
                                </div>
                            )}
                            <div className={cn("p-1.5 rounded-full transition-all duration-300", isActive && "translate-y-[-2px]", isActive && c && c.bg, isActive && !c && "bg-primary/10")}>
                                <item.icon className="w-5 h-5 transition-transform duration-300" strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={cn("text-[10px] font-medium transition-all duration-300 mt-1", isActive ? "opacity-100 font-semibold" : "opacity-70", c && !isActive && `${c.text} font-semibold opacity-100`)}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function TeacherDashboard() {
    const orgSlug = useOrgSlug();
    const router = useRouter();
    const [org, setOrg] = useState<any>(null);
    const [teacher, setTeacher] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>('dashboard');

    const [mySubjects, setMySubjects] = useState<any[]>([]);
    const [mySlots, setMySlots] = useState<any[]>([]);
    const [myClasses, setMyClasses] = useState<any[]>([]);
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);

    const [selEval, setSelEval] = useState<any>(null);
    const [grades, setGrades] = useState<Record<string, string>>({});
    const [savingGrades, setSavingGrades] = useState(false);
    const [showDeletedModal, setShowDeletedModal] = useState(false);
    const [showDeactivatedModal, setShowDeactivatedModal] = useState(false);

    // Cursus state
    const [chapters, setChapters] = useState<any[]>([]);
    const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
    const [showNewSubject, setShowNewSubject] = useState(false);
    const [newSubName, setNewSubName] = useState('');
    const [newSubCoef, setNewSubCoef] = useState('1');
    const [newSubClass, setNewSubClass] = useState('');
    const [savingSub, setSavingSub] = useState(false);
    const [showNewChapter, setShowNewChapter] = useState<string | null>(null);
    const [newChTitle, setNewChTitle] = useState('');
    const [newChDesc, setNewChDesc] = useState('');
    const [savingChapter, setSavingChapter] = useState(false);
    const [allClasses, setAllClasses] = useState<any[]>([]);

    // New eval form
    const [newEvTitle, setNewEvTitle] = useState('');
    const [newEvType, setNewEvType] = useState('devoir');
    const [newEvSub, setNewEvSub] = useState('');
    const [newEvDate, setNewEvDate] = useState('');
    const [newEvMax, setNewEvMax] = useState('20');
    const [showNewEval, setShowNewEval] = useState(false);

    // ═══ LOAD ═══
    useEffect(() => {
        (async () => {
            const raw = localStorage.getItem('campusflow_session');
            if (!raw) { router.push(`/${orgSlug}/login`); return; }
            const session = JSON.parse(raw);
            if (session.role !== 'teacher') { router.push(`/${orgSlug}/login`); return; }

            const { data: o } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single();
            if (!o) { setLoading(false); return; }
            setOrg(o);

            const { data: t, error: tErr } = await supabase.from('teacher_profiles').select('*').eq('id', session.id).single();
            if (tErr || !t) { localStorage.removeItem('campusflow_session'); setShowDeletedModal(true); setLoading(false); return; }
            if (t.is_active === false) { localStorage.removeItem('campusflow_session'); setShowDeactivatedModal(true); setLoading(false); return; }
            setTeacher(t);

            const { data: subs } = await supabase.from('subjects').select('*, classrooms:classroom_id(id,name)')
                .eq('organization_id', o.id).eq('teacher_id', t.id);
            setMySubjects(subs || []);

            const classIds = [...new Set((subs || []).map((s: any) => s.classroom_id).filter(Boolean))];
            if (classIds.length > 0) {
                const { data: clsData } = await supabase.from('classrooms').select('*').in('id', classIds);
                setMyClasses(clsData || []);
                const { data: studs } = await supabase.from('student_profiles').select('*').eq('organization_id', o.id).in('classroom_id', classIds);
                setStudents(studs || []);
            }

            const subjectIds = (subs || []).map((s: any) => s.id);
            if (subjectIds.length > 0) {
                const { data: slots } = await supabase.from('timetable_slots')
                    .select('*, classrooms:classroom_id(name), subjects:subject_id(name)')
                    .in('subject_id', subjectIds).order('start_time');
                setMySlots(slots || []);
                const { data: evs } = await supabase.from('evaluations')
                    .select('*, classrooms:classroom_id(name), subjects:subject_id(name)')
                    .in('subject_id', subjectIds).order('created_at', { ascending: false });
                setEvaluations(evs || []);

                // Load chapters for cursus
                const { data: chaps } = await supabase.from('chapters')
                    .select('*').in('subject_id', subjectIds).order('position');
                setChapters(chaps || []);
            }

            // Load all classes for subject creation
            const { data: allCls } = await supabase.from('classrooms').select('*').eq('organization_id', o.id).eq('is_active', true);
            setAllClasses(allCls || []);

            setLoading(false);
        })();
    }, [orgSlug]);

    const createEval = async () => {
        if (!newEvTitle || !newEvSub) { toast.error('Remplissez titre et matière'); return; }
        const sub = mySubjects.find((s: any) => s.id === newEvSub);
        const { error } = await supabase.from('evaluations').insert({
            organization_id: org.id, title: newEvTitle, type: newEvType,
            classroom_id: sub?.classroom_id, subject_id: newEvSub,
            date: newEvDate || null, max_score: parseFloat(newEvMax) || 20,
        });
        if (error) { toast.error(error.message); return; }
        toast.success('Évaluation créée !');
        setNewEvTitle(''); setShowNewEval(false);
        const subjectIds = mySubjects.map((s: any) => s.id);
        const { data: evs } = await supabase.from('evaluations')
            .select('*, classrooms:classroom_id(name), subjects:subject_id(name)')
            .in('subject_id', subjectIds).order('created_at', { ascending: false });
        setEvaluations(evs || []);
    };

    const loadGrades = async (ev: any) => {
        setSelEval(ev);
        const clsStudents = students.filter((s: any) => s.classroom_id === ev.classroom_id);
        const { data: existingGrades } = await supabase.from('grades').select('student_id, score').eq('evaluation_id', ev.id);
        const gMap: Record<string, string> = {};
        clsStudents.forEach((s: any) => {
            const g = (existingGrades || []).find((g: any) => g.student_id === s.id);
            gMap[s.id] = g ? String(g.score) : '';
        });
        setGrades(gMap);
    };

    const saveGrades = async () => {
        if (!selEval) return;
        setSavingGrades(true);
        try {
            const entries = Object.entries(grades).filter(([_, v]) => v !== '').map(([studentId, score]) => ({
                evaluation_id: selEval.id, student_id: studentId, score: parseFloat(score), graded_by: teacher.id,
            }));
            if (entries.length === 0) { toast.info('Aucune note à sauvegarder'); setSavingGrades(false); return; }
            const { error } = await supabase.from('grades').upsert(entries, { onConflict: 'evaluation_id,student_id' });
            if (error) throw error;
            toast.success(`${entries.length} notes sauvegardées ✅`);
        } catch (e: any) { toast.error(e.message); }
        setSavingGrades(false);
    };

    const signOut = () => { localStorage.removeItem('campusflow_session'); router.push(`/${orgSlug}/login`); };

    // ═══ CURSUS: CREATE SUBJECT ═══
    const createSubject = async () => {
        if (!newSubName.trim() || !newSubClass) { toast.error('Nom et classe requis'); return; }
        setSavingSub(true);
        const { data: sub, error } = await supabase.from('subjects').insert({
            name: newSubName.trim(),
            coefficient: parseFloat(newSubCoef) || 1,
            classroom_id: newSubClass,
            organization_id: org.id,
            teacher_id: teacher.id,
        }).select('*, classrooms:classroom_id(id,name)').single();
        if (error) { toast.error(error.message); setSavingSub(false); return; }
        setMySubjects([...mySubjects, sub]);
        toast.success(`Matière "${sub.name}" créée !`);
        setNewSubName(''); setNewSubCoef('1'); setNewSubClass(''); setShowNewSubject(false);
        setSavingSub(false);
    };

    // ═══ CURSUS: CREATE CHAPTER ═══
    const createChapter = async (subjectId: string) => {
        if (!newChTitle.trim()) { toast.error('Titre requis'); return; }
        setSavingChapter(true);
        const subChapters = chapters.filter(c => c.subject_id === subjectId);
        const { data: ch, error } = await supabase.from('chapters').insert({
            subject_id: subjectId,
            organization_id: org.id,
            teacher_id: teacher.id,
            title: newChTitle.trim(),
            description: newChDesc.trim(),
            position: subChapters.length + 1,
            status: 'draft',
        }).select().single();
        if (error) { toast.error(error.message); setSavingChapter(false); return; }
        setChapters([...chapters, ch]);
        toast.success(`Chapitre "${ch.title}" ajouté !`);
        setNewChTitle(''); setNewChDesc(''); setShowNewChapter(null);
        setSavingChapter(false);
    };

    // ═══ CURSUS: TOGGLE CHAPTER STATUS ═══
    const toggleChapterStatus = async (chapterId: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'draft' ? 'published' : currentStatus === 'published' ? 'completed' : 'draft';
        const { error } = await supabase.from('chapters').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', chapterId);
        if (error) { toast.error(error.message); return; }
        setChapters(chapters.map(c => c.id === chapterId ? { ...c, status: nextStatus } : c));
        const labels: Record<string, string> = { draft: 'Brouillon', published: 'Dispensé', completed: 'Terminé' };
        toast.success(`Statut → ${labels[nextStatus]}`);
    };

    // ═══ CURSUS: DELETE CHAPTER ═══
    const deleteChapter = async (chapterId: string) => {
        const { error } = await supabase.from('chapters').delete().eq('id', chapterId);
        if (error) { toast.error(error.message); return; }
        setChapters(chapters.filter(c => c.id !== chapterId));
        toast.success('Chapitre supprimé');
    };

    // ═══ PROFILE: UPLOAD PHOTO ═══
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast.error('Fichier image requis'); return; }
        if (file.size > 5 * 1024 * 1024) { toast.error('Image trop lourde (max 5 Mo)'); return; }
        setUploadingPhoto(true);
        try {
            const ext = file.name.split('.').pop();
            const path = `profile-photos/teachers/${teacher.id}_${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage.from('organization-assets').upload(path, file, { contentType: file.type, upsert: true });
            if (upErr) throw upErr;
            const { data: urlData } = supabase.storage.from('organization-assets').getPublicUrl(path);
            const { error: dbErr } = await supabase.from('teacher_profiles').update({ photo_url: urlData.publicUrl }).eq('id', teacher.id);
            if (dbErr) throw dbErr;
            setTeacher({ ...teacher, photo_url: urlData.publicUrl });
            toast.success('Photo mise à jour !');
        } catch (err: any) { toast.error(err.message || 'Erreur upload'); }
        setUploadingPhoto(false);
    };
    const today = new Date().getDay();
    const todaySlots = mySlots.filter((s: any) => s.day_of_week === (today === 0 ? 7 : today));

    // ═══ MODALS ═══
    if (showDeletedModal) return (
        <div className="min-h-screen bg-linear-to-b from-[#0B0E14] to-[#0F1219] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="max-w-sm w-full p-8 rounded-3xl bg-linear-to-b from-[#0F1219] to-[#1a1f2e] border border-red-500/20 text-center shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-8 h-8 text-red-400" /></div>
                <h2 className="text-xl font-black text-white mb-2">Compte supprimé</h2>
                <p className="text-sm text-slate-400 mb-6">Votre compte a été supprimé. Contactez l'administration.</p>
                <Button onClick={() => router.push(`/${orgSlug}`)} className="bg-linear-to-r from-red-600 to-pink-600 font-bold rounded-xl">Retour</Button>
            </motion.div>
        </div>
    );
    if (showDeactivatedModal) return (
        <div className="min-h-screen bg-linear-to-b from-[#0B0E14] to-[#0F1219] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="max-w-sm w-full p-8 rounded-3xl bg-linear-to-b from-[#0F1219] to-[#1a1f2e] border border-amber-500/20 text-center shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-amber-600/20 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-8 h-8 text-amber-400" /></div>
                <h2 className="text-xl font-black text-white mb-2">Compte désactivé</h2>
                <p className="text-sm text-slate-400 mb-6">Contactez votre établissement.</p>
                <Button onClick={() => router.push(`/${orgSlug}`)} className="bg-linear-to-r from-amber-600 to-orange-600 font-bold rounded-xl">Retour</Button>
            </motion.div>
        </div>
    );
    if (loading) return (
        <div className="min-h-screen bg-linear-to-b from-[#0B0E14] to-[#0F1219] flex items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Loader2 className="w-8 h-8 text-primary" /></motion.div>
        </div>
    );
    if (!org || !teacher) return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-white"><h1>Non autorisé</h1></div>;

    return (
        <main className="min-h-screen bg-linear-to-b from-[#0B0E14] to-[#0F1219] text-white pb-24 overflow-y-auto">
            {/* Ambient blobs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="ambient-blob-teal" style={{ top: '-20%', right: '-20%' }} />
                <div className="ambient-blob-purple" style={{ bottom: '-20%', left: '-20%' }} />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto w-full px-4">
                {/* Header */}
                <header className="flex items-center justify-between pt-8 pb-4">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11 border-2 border-emerald-500 shadow-lg">
                            <AvatarImage src={teacher.photo_url} />
                            <AvatarFallback className="bg-emerald-500/10 text-emerald-400 font-bold">
                                {teacher.first_name?.[0]}{teacher.last_name?.[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="text-sm font-black truncate max-w-[200px]">Prof. {teacher.first_name} {teacher.last_name}</h1>
                            <p className="text-[10px] text-muted-foreground">{org.name} • {teacher.speciality || 'Enseignant'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="text-slate-400 h-9 w-9 p-0 rounded-xl" onClick={() => router.push(`/${orgSlug}/messages`)}>
                            <MessageSquare className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-400 h-9 w-9 p-0 rounded-xl" onClick={signOut}>
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    {/* ═══ DASHBOARD ═══ */}
                    {tab === 'dashboard' && (
                        <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">
                            {/* Welcome */}
                            <Card className="bg-linear-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20 backdrop-blur-sm overflow-hidden">
                                <CardContent className="p-5">
                                    <h2 className="text-lg font-black">Bonjour, Prof. {teacher.first_name} 👋</h2>
                                    <p className="text-sm text-muted-foreground mt-1">{org.name}</p>
                                    {teacher.speciality && (
                                        <Badge className="mt-2 bg-linear-to-r from-emerald-600 to-green-600 border-none text-white text-[10px]">{teacher.speciality}</Badge>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { l: 'Matières', v: mySubjects.length, icon: BookOpen, color: 'emerald' },
                                    { l: 'Classes', v: myClasses.length, icon: Users, color: 'indigo' },
                                    { l: 'Évaluations', v: evaluations.length, icon: ClipboardList, color: 'amber' },
                                    { l: 'Étudiants', v: students.length, icon: GraduationCap, color: 'purple' },
                                ].map((s, i) => {
                                    const colorMap: Record<string, string> = { emerald: 'border-emerald-500/20', indigo: 'border-indigo-500/20', amber: 'border-amber-500/20', purple: 'border-purple-500/20' };
                                    const iconMap: Record<string, string> = { emerald: 'text-emerald-500', indigo: 'text-indigo-500', amber: 'text-amber-500', purple: 'text-purple-500' };
                                    const bgMap: Record<string, string> = { emerald: 'from-emerald-500/10', indigo: 'from-indigo-500/10', amber: 'from-amber-500/10', purple: 'from-purple-500/10' };
                                    return (
                                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                                            <Card className={cn("bg-card/50 backdrop-blur-sm shadow-sm relative overflow-hidden group", colorMap[s.color])}>
                                                <div className={cn("absolute inset-0 bg-linear-to-br to-transparent opacity-0 group-hover:opacity-100 transition-opacity", bgMap[s.color])} />
                                                <CardContent className="flex flex-col items-center justify-center p-4">
                                                    <s.icon className={cn("h-5 w-5 mb-2", iconMap[s.color])} />
                                                    <span className="text-xl font-black">{s.v}</span>
                                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">{s.l}</span>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Today's schedule */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                                <Card className="bg-linear-to-br from-teal-500/10 to-indigo-500/5 border-teal-500/20 backdrop-blur-sm overflow-hidden">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="bg-teal-500/20 p-2.5 rounded-xl"><Clock className="h-5 w-5 text-teal-400" /></div>
                                            <div>
                                                <h3 className="font-bold text-sm">Aujourd'hui — {DAYS[(today === 0 ? 6 : today - 1)] || 'Dimanche'}</h3>
                                                <p className="text-[10px] text-slate-400">{todaySlots.length} cours programmé(s)</p>
                                            </div>
                                        </div>
                                        {todaySlots.length === 0 ? (
                                            <p className="text-sm text-slate-500 text-center py-3">Pas de cours aujourd'hui 🎉</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {todaySlots.map((s: any) => (
                                                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-teal-500/20 transition-all">
                                                        <span className="text-teal-400 font-mono text-xs font-bold w-20">{s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)}</span>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium">{s.subjects?.name}</p>
                                                            <p className="text-[10px] text-slate-500">{s.classrooms?.name} {s.room ? `• ${s.room}` : ''}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Recent evaluations */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                                <Card className="bg-linear-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20 backdrop-blur-sm overflow-hidden">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="bg-amber-500/20 p-2.5 rounded-xl"><ClipboardList className="h-5 w-5 text-amber-400" /></div>
                                            <h3 className="font-bold text-sm">Évaluations récentes</h3>
                                        </div>
                                        {evaluations.slice(0, 5).map((ev: any) => (
                                            <div key={ev.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                                                onClick={() => { setTab('grades'); loadGrades(ev); }}>
                                                <div>
                                                    <p className="text-sm font-medium">{ev.title}</p>
                                                    <p className="text-[10px] text-slate-500">{ev.subjects?.name} • {ev.classrooms?.name} • /{ev.max_score}</p>
                                                </div>
                                                <Badge className="bg-indigo-500/20 text-indigo-400 border-none text-[10px]">{ev.type}</Badge>
                                            </div>
                                        ))}
                                        {evaluations.length === 0 && <p className="text-sm text-slate-500 text-center py-3">Aucune évaluation</p>}
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Quick links */}
                            <div className="grid grid-cols-2 gap-3">
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                                    <Card className="bg-card/50 backdrop-blur-sm border-emerald-500/20 cursor-pointer group hover:border-emerald-500/40 transition-all"
                                        onClick={() => router.push(`/${orgSlug}/library`)}>
                                        <div className="absolute inset-0 bg-linear-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                                        <CardContent className="p-4 relative">
                                            <BookOpen className="w-5 h-5 text-emerald-400 mb-2" />
                                            <p className="font-bold text-sm">Bibliothèque</p>
                                            <p className="text-[10px] text-muted-foreground">Documents et ressources</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                                    <Card className="bg-card/50 backdrop-blur-sm border-indigo-500/20 cursor-pointer group hover:border-indigo-500/40 transition-all"
                                        onClick={() => router.push(`/${orgSlug}/messages`)}>
                                        <div className="absolute inset-0 bg-linear-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                                        <CardContent className="p-4 relative">
                                            <MessageSquare className="w-5 h-5 text-indigo-400 mb-2" />
                                            <p className="font-bold text-sm">Messages</p>
                                            <p className="text-[10px] text-muted-foreground">Communiquer</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </div>
                        </motion.div>
                    )}

                    {/* ═══ TIMETABLE ═══ */}
                    {tab === 'timetable' && (
                        <motion.div key="timetable" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4 pt-4">
                            <h2 className="font-black text-lg text-gradient-primary">📅 Mon emploi du temps</h2>
                            {DAYS.map((day, di) => {
                                const slots = mySlots.filter((s: any) => s.day_of_week === di + 1);
                                const isToday = (today === 0 ? 7 : today) === di + 1;
                                return (
                                    <motion.div key={di} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * di }}>
                                        <Card className={cn("backdrop-blur-sm overflow-hidden", isToday ? "bg-linear-to-br from-teal-500/10 to-indigo-500/5 border-teal-500/20" : "bg-card/50 border-white/5")}>
                                            <CardContent className="p-4">
                                                <h3 className={cn("font-bold text-sm mb-2", isToday ? "text-teal-400" : "text-slate-400")}>
                                                    {day} {isToday && <Badge className="ml-2 bg-teal-500/20 text-teal-400 border-none text-[9px]">Aujourd'hui</Badge>}
                                                </h3>
                                                {slots.length === 0 ? <p className="text-xs text-slate-600">Pas de cours</p> : (
                                                    <div className="space-y-1.5">
                                                        {slots.map((s: any) => (
                                                            <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5">
                                                                <span className="text-teal-400 font-mono text-xs font-bold w-20">{s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)}</span>
                                                                <span className="text-sm flex-1">{s.subjects?.name}</span>
                                                                <span className="text-xs text-slate-500">{s.classrooms?.name} {s.room ? `• ${s.room}` : ''}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}

                    {/* ═══ CURSUS ═══ */}
                    {tab === 'cursus' && (
                        <motion.div key="cursus" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4 pt-4">
                            <div className="flex items-center justify-between">
                                <h2 className="font-black text-lg text-gradient-primary">📚 Mon Cursus</h2>
                                <Button size="sm" className="bg-linear-to-r from-indigo-600 to-purple-600 border-none font-bold rounded-xl" onClick={() => setShowNewSubject(!showNewSubject)}>
                                    <Plus className="w-4 h-4 mr-1" /> Matière
                                </Button>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { l: 'Matières', v: mySubjects.length, color: 'emerald' },
                                    { l: 'Chapitres', v: chapters.length, color: 'indigo' },
                                    { l: 'Dispensés', v: chapters.filter(c => c.status === 'published' || c.status === 'completed').length, color: 'teal' },
                                ].map((s, i) => {
                                    const cls: Record<string, string> = { emerald: 'border-emerald-500/20', indigo: 'border-indigo-500/20', teal: 'border-teal-500/20' };
                                    const txt: Record<string, string> = { emerald: 'text-emerald-400', indigo: 'text-indigo-400', teal: 'text-teal-400' };
                                    return (
                                        <Card key={i} className={cn("bg-card/50 backdrop-blur-sm shadow-sm", cls[s.color])}>
                                            <CardContent className="flex flex-col items-center justify-center p-3">
                                                <span className="text-xs text-muted-foreground">{s.l}</span>
                                                <span className={cn("text-lg font-black", txt[s.color])}>{s.v}</span>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>

                            {/* New Subject Form */}
                            {showNewSubject && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                    <Card className="bg-linear-to-br from-indigo-500/10 to-purple-500/5 border-indigo-500/20 backdrop-blur-sm overflow-hidden">
                                        <CardContent className="p-4 space-y-3">
                                            <h3 className="font-bold text-sm text-indigo-400">➕ Créer une matière</h3>
                                            <div className="grid sm:grid-cols-3 gap-3">
                                                <div><Label className="text-slate-400 text-xs">Nom de la matière</Label><Input value={newSubName} onChange={e => setNewSubName(e.target.value)} placeholder="Programmation Web" className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm" /></div>
                                                <div><Label className="text-slate-400 text-xs">Coefficient</Label><Input type="number" value={newSubCoef} onChange={e => setNewSubCoef(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm" /></div>
                                                <div><Label className="text-slate-400 text-xs">Classe</Label>
                                                    <select value={newSubClass} onChange={e => setNewSubClass(e.target.value)} className="w-full h-9 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm">
                                                        <option value="" className="bg-slate-900">Choisir...</option>
                                                        {allClasses.map((c: any) => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" className="bg-linear-to-r from-indigo-600 to-purple-600 font-bold rounded-xl" onClick={createSubject} disabled={savingSub}>
                                                    {savingSub ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}Créer
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => setShowNewSubject(false)}>Annuler</Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {/* Subject List with Chapters */}
                            {mySubjects.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <Layers className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">Aucune matière</p>
                                    <p className="text-xs text-slate-600 mt-1">Créez votre première matière pour commencer</p>
                                </div>
                            ) : mySubjects.map((sub: any) => {
                                const subChapters = chapters.filter(c => c.subject_id === sub.id).sort((a, b) => a.position - b.position);
                                const isExpanded = expandedSubject === sub.id;
                                const publishedCount = subChapters.filter(c => c.status !== 'draft').length;
                                const clsStudents = students.filter((s: any) => s.classroom_id === sub.classroom_id);

                                return (
                                    <motion.div key={sub.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                        <Card className={cn("backdrop-blur-sm overflow-hidden transition-all", isExpanded ? "bg-linear-to-br from-indigo-500/10 to-purple-500/5 border-indigo-500/20" : "bg-card/50 border-white/10 hover:border-indigo-500/20")}>
                                            <CardContent className="p-0">
                                                {/* Subject Header */}
                                                <div className="p-4 cursor-pointer flex items-center justify-between" onClick={() => setExpandedSubject(isExpanded ? null : sub.id)}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-indigo-500/20 p-2.5 rounded-xl"><BookOpen className="h-5 w-5 text-indigo-400" /></div>
                                                        <div>
                                                            <h3 className="font-bold text-sm">{sub.name}</h3>
                                                            <p className="text-[10px] text-slate-400">{sub.classrooms?.name || 'Classe'} • Coef. {sub.coefficient} • {subChapters.length} chapitre(s) • {publishedCount} dispensé(s)</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {subChapters.length > 0 && (
                                                            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                                <div className="h-full bg-linear-to-r from-emerald-500 to-teal-400 rounded-full transition-all" style={{ width: `${subChapters.length > 0 ? (publishedCount / subChapters.length) * 100 : 0}%` }} />
                                                            </div>
                                                        )}
                                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                                    </div>
                                                </div>

                                                {/* Expanded Content: Chapters */}
                                                {isExpanded && (
                                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t border-white/5 px-4 pb-4">
                                                        {/* Chapters List */}
                                                        <div className="space-y-2 mt-3">
                                                            {subChapters.map((ch, ci) => {
                                                                const statusConfig: Record<string, { bg: string; text: string; icon: any; label: string }> = {
                                                                    draft: { bg: 'bg-slate-500/20', text: 'text-slate-400', icon: EyeOff, label: 'Brouillon' },
                                                                    published: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: Eye, label: 'Dispensé' },
                                                                    completed: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: CheckCircle2, label: 'Terminé' },
                                                                };
                                                                const sc = statusConfig[ch.status] || statusConfig.draft;

                                                                return (
                                                                    <motion.div key={ch.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ci * 0.05 }}
                                                                        className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all group">
                                                                        <span className="text-xs font-mono text-slate-600 w-6 text-center">{ch.position}</span>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-medium truncate">{ch.title}</p>
                                                                            {ch.description && <p className="text-[10px] text-slate-500 truncate">{ch.description}</p>}
                                                                        </div>
                                                                        <button onClick={() => toggleChapterStatus(ch.id, ch.status)} className={cn("flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all hover:scale-105", sc.bg, sc.text)}>
                                                                            <sc.icon className="w-3 h-3" />{sc.label}
                                                                        </button>
                                                                        <button onClick={() => deleteChapter(ch.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-all">
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </motion.div>
                                                                );
                                                            })}

                                                            {subChapters.length === 0 && (
                                                                <p className="text-xs text-slate-600 text-center py-4">Aucun chapitre — ajoutez le premier !</p>
                                                            )}
                                                        </div>

                                                        {/* Add Chapter Form */}
                                                        {showNewChapter === sub.id ? (
                                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                                                                <Input value={newChTitle} onChange={e => setNewChTitle(e.target.value)} placeholder="Titre du chapitre" className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm" />
                                                                <Input value={newChDesc} onChange={e => setNewChDesc(e.target.value)} placeholder="Description courte (optionnel)" className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm" />
                                                                <div className="flex gap-2">
                                                                    <Button size="sm" className="bg-linear-to-r from-emerald-600 to-green-600 font-bold rounded-xl h-8" onClick={() => createChapter(sub.id)} disabled={savingChapter}>
                                                                        {savingChapter ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}Ajouter
                                                                    </Button>
                                                                    <Button size="sm" variant="ghost" className="h-8" onClick={() => { setShowNewChapter(null); setNewChTitle(''); setNewChDesc(''); }}>Annuler</Button>
                                                                </div>
                                                            </motion.div>
                                                        ) : (
                                                            <button onClick={() => setShowNewChapter(sub.id)} className="mt-3 w-full py-2.5 rounded-xl border border-dashed border-white/10 hover:border-indigo-500/30 text-xs text-slate-500 hover:text-indigo-400 transition-all flex items-center justify-center gap-1">
                                                                <Plus className="w-3.5 h-3.5" /> Ajouter un chapitre
                                                            </button>
                                                        )}

                                                        {/* Students in this class */}
                                                        {clsStudents.length > 0 && (
                                                            <div className="mt-3 pt-3 border-t border-white/5">
                                                                <p className="text-[10px] text-slate-500 mb-2">👥 {clsStudents.length} étudiant(s) dans {sub.classrooms?.name}</p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {clsStudents.slice(0, 8).map((s: any) => (
                                                                        <Badge key={s.id} className="bg-white/5 text-slate-400 border-none text-[9px]">{s.first_name} {s.last_name?.[0]}.</Badge>
                                                                    ))}
                                                                    {clsStudents.length > 8 && <Badge className="bg-white/5 text-slate-400 border-none text-[9px]">+{clsStudents.length - 8}</Badge>}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}

                    {/* ═══ GRADES ═══ */}
                    {tab === 'grades' && (
                        <motion.div key="grades" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4 pt-4">
                            <div className="flex items-center justify-between">
                                <h2 className="font-black text-lg text-gradient-primary">📝 Saisie des notes</h2>
                                <Button size="sm" className="bg-linear-to-r from-indigo-600 to-purple-600 border-none font-bold rounded-xl" onClick={() => setShowNewEval(!showNewEval)}>
                                    <PenSquare className="w-4 h-4 mr-1" /> Nouvelle éval.
                                </Button>
                            </div>

                            {/* New eval form */}
                            {showNewEval && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                    <Card className="bg-linear-to-br from-indigo-500/10 to-purple-500/5 border-indigo-500/20 backdrop-blur-sm overflow-hidden">
                                        <CardContent className="p-4 space-y-3">
                                            <h3 className="font-bold text-sm text-indigo-400">➕ Créer une évaluation</h3>
                                            <div className="grid sm:grid-cols-3 gap-3">
                                                <div><Label className="text-slate-400 text-xs">Titre</Label><Input value={newEvTitle} onChange={e => setNewEvTitle(e.target.value)} placeholder="Devoir n°1" className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm" /></div>
                                                <div><Label className="text-slate-400 text-xs">Type</Label>
                                                    <select value={newEvType} onChange={e => setNewEvType(e.target.value)} className="w-full h-9 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm">
                                                        {['devoir', 'examen', 'tp', 'oral', 'projet'].map(t => <option key={t} value={t} className="bg-slate-900">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                                    </select>
                                                </div>
                                                <div><Label className="text-slate-400 text-xs">Matière</Label>
                                                    <select value={newEvSub} onChange={e => setNewEvSub(e.target.value)} className="w-full h-9 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm">
                                                        <option value="" className="bg-slate-900">Choisir...</option>
                                                        {mySubjects.map((s: any) => <option key={s.id} value={s.id} className="bg-slate-900">{s.name} ({s.classrooms?.name})</option>)}
                                                    </select>
                                                </div>
                                                <div><Label className="text-slate-400 text-xs">Date</Label><Input type="date" value={newEvDate} onChange={e => setNewEvDate(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm" /></div>
                                                <div><Label className="text-slate-400 text-xs">Note max</Label><Input type="number" value={newEvMax} onChange={e => setNewEvMax(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm" /></div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" className="bg-linear-to-r from-indigo-600 to-purple-600 font-bold rounded-xl" onClick={createEval}>Créer</Button>
                                                <Button size="sm" variant="ghost" onClick={() => setShowNewEval(false)}>Annuler</Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {/* Evaluation selector or grade entry */}
                            {!selEval ? (
                                <div className="space-y-2">
                                    {evaluations.length === 0 ? (
                                        <div className="text-center py-12 text-slate-500"><ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="text-sm">Créez votre première évaluation</p></div>
                                    ) : evaluations.map((ev: any) => (
                                        <motion.div key={ev.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                                            <Card className="bg-card/50 backdrop-blur-sm border-white/10 cursor-pointer hover:border-indigo-500/20 transition-all" onClick={() => loadGrades(ev)}>
                                                <CardContent className="p-4 flex items-center justify-between">
                                                    <div>
                                                        <p className="font-bold text-sm">{ev.title}</p>
                                                        <p className="text-[10px] text-slate-500">{ev.subjects?.name} • {ev.classrooms?.name} • /{ev.max_score} {ev.date ? `• ${ev.date}` : ''}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge className="bg-indigo-500/20 text-indigo-400 border-none text-[10px]">{ev.type}</Badge>
                                                        <PenSquare className="w-4 h-4 text-slate-500" />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <Card className="bg-linear-to-br from-indigo-500/10 to-purple-500/5 border-indigo-500/20 backdrop-blur-sm overflow-hidden">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-sm">{selEval.title}</p>
                                                <p className="text-[10px] text-slate-400">{selEval.subjects?.name} • {selEval.classrooms?.name} • /{selEval.max_score}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" className="bg-linear-to-r from-emerald-600 to-green-600 font-bold rounded-xl h-8" onClick={saveGrades} disabled={savingGrades}>
                                                    {savingGrades ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}Sauvegarder
                                                </Button>
                                                <Button size="sm" variant="ghost" className="h-8" onClick={() => setSelEval(null)}><X className="w-4 h-4" /></Button>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Grade table */}
                                    <Card className="bg-card/50 backdrop-blur-sm border-white/10 overflow-hidden">
                                        <div className="grid grid-cols-[1fr_80px] px-4 py-2 bg-white/5 text-xs text-slate-400 font-medium">
                                            <span>Étudiant</span><span className="text-center">Note /{selEval.max_score}</span>
                                        </div>
                                        {students.filter((s: any) => s.classroom_id === selEval.classroom_id).map((s: any) => (
                                            <div key={s.id} className="grid grid-cols-[1fr_80px] items-center px-4 py-2 border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-7 w-7">
                                                        <AvatarFallback className="bg-blue-500/20 text-blue-400 text-[10px] font-bold">{s.first_name?.[0]}{s.last_name?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <span className="text-sm">{s.first_name} {s.last_name}</span>
                                                        <span className="text-[9px] text-slate-600 ml-2">{s.matricule || ''}</span>
                                                    </div>
                                                </div>
                                                <Input type="number" min="0" max={selEval.max_score} step="0.25"
                                                    value={grades[s.id] || ''} onChange={e => setGrades(g => ({ ...g, [s.id]: e.target.value }))}
                                                    className="bg-white/5 border-white/10 text-white h-8 text-center rounded-xl text-sm" placeholder="—" />
                                            </div>
                                        ))}
                                    </Card>

                                    {/* Quick stats */}
                                    {Object.values(grades).some(v => v !== '') && (() => {
                                        const vals = Object.values(grades).filter(v => v !== '').map(Number);
                                        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
                                        const min = Math.min(...vals); const max = Math.max(...vals);
                                        return (
                                            <div className="grid grid-cols-3 gap-3">
                                                {[
                                                    { l: 'Moyenne', v: avg.toFixed(2), color: 'teal' },
                                                    { l: 'Min', v: min.toFixed(2), color: 'red' },
                                                    { l: 'Max', v: max.toFixed(2), color: 'emerald' },
                                                ].map((s, i) => {
                                                    const cls: Record<string, string> = { teal: 'border-teal-500/20', red: 'border-red-500/20', emerald: 'border-emerald-500/20' };
                                                    const txt: Record<string, string> = { teal: 'text-teal-400', red: 'text-red-400', emerald: 'text-emerald-400' };
                                                    return (
                                                        <Card key={i} className={cn("bg-card/50 backdrop-blur-sm shadow-sm", cls[s.color])}>
                                                            <CardContent className="flex flex-col items-center justify-center p-3">
                                                                <span className="text-xs text-muted-foreground">{s.l}</span>
                                                                <span className={cn("text-lg font-black", txt[s.color])}>{s.v}</span>
                                                            </CardContent>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ═══ PROFILE ═══ */}
                    {tab === 'profile' && (
                        <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5 pt-4 max-w-md mx-auto">
                            <div className="flex flex-col items-center mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="relative mb-4">
                                    <Avatar className="h-24 w-24 border-4 border-emerald-500 shadow-xl">
                                        <AvatarImage src={teacher.photo_url} />
                                        <AvatarFallback className="text-3xl bg-emerald-500/10 text-emerald-400">{teacher.first_name?.[0]}{teacher.last_name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <label className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 cursor-pointer shadow-lg transition-colors">
                                        {uploadingPhoto ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
                                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                                    </label>
                                    <Badge className="absolute -bottom-2 -left-2 px-3 py-1 bg-linear-to-r from-emerald-500 to-green-600 border-none text-white shadow-lg text-[10px]">
                                        🎓 Professeur
                                    </Badge>
                                </div>
                                <h2 className="text-2xl font-black text-gradient-primary">{teacher.first_name} {teacher.last_name}</h2>
                                <p className="text-sm text-emerald-400 mt-1">{teacher.speciality || 'Enseignant'}</p>
                                <p className="text-xs text-muted-foreground mt-2 bg-muted/50 px-3 py-1 rounded-full">{org.name}</p>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { icon: BookOpen, value: mySubjects.length, label: 'Matières', color: 'emerald' },
                                    { icon: Users, value: myClasses.length, label: 'Classes', color: 'indigo' },
                                    { icon: GraduationCap, value: students.length, label: 'Étudiants', color: 'purple' },
                                ].map((s, i) => {
                                    const borderMap: Record<string, string> = { emerald: 'border-emerald-500/20', indigo: 'border-indigo-500/20', purple: 'border-purple-500/20' };
                                    const iconMap: Record<string, string> = { emerald: 'text-emerald-500', indigo: 'text-indigo-500', purple: 'text-purple-500' };
                                    return (
                                        <Card key={i} className={cn("bg-card/50 backdrop-blur-sm shadow-sm", borderMap[s.color])}>
                                            <CardContent className="flex flex-col items-center justify-center p-4">
                                                <s.icon className={cn("h-5 w-5 mb-2", iconMap[s.color])} />
                                                <span className="text-lg font-black">{s.value}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">{s.label}</span>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>

                            <Card className="bg-card/50 backdrop-blur-sm border-white/10 overflow-hidden">
                                <CardContent className="p-4 space-y-3">
                                    {[
                                        ['📧 Email', teacher.email],
                                        ['📱 Téléphone', teacher.phone],
                                        ['📖 Spécialité', teacher.speciality],
                                        ['🎓 Diplômes', teacher.diplomas],
                                        ['🔑 Code accès', teacher.access_code],
                                    ].map(([k, v], i) => (
                                        <div key={i} className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">{k}</span>
                                            <span className="text-white font-medium">{v || '—'}</span>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <BottomNav activeTab={tab} onTabChange={setTab} />
        </main>
    );
}
