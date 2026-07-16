'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Home, Calendar, BookOpen, CreditCard, GraduationCap, Loader2,
    Clock, Trophy, TrendingUp, BarChart3, MessageSquare, LogOut,
    FileText, Target, Star, CircleDollarSign, CheckCircle2, AlertCircle,
    ShoppingBag, BookMarked, Settings, ChevronRight, ArrowLeft,
    Users, Flame, Award, User, Layers, Lock, Eye, EyeOff, Camera,
    ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/compress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════
// CAMPUSFLOW — DASHBOARD ÉTUDIANT (holographic-ring design)
// ═══════════════════════════════════════════════════════

type Tab = 'dashboard' | 'timetable' | 'cursus' | 'grades' | 'payments' | 'profile';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

// ═══ BOTTOM NAV (holographic-ring style) ═══
function BottomNav({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (t: Tab) => void }) {
    const navItems: { id: Tab; icon: any; label: string; color?: string }[] = [
        { id: 'dashboard', icon: Home, label: 'Accueil' },
        { id: 'timetable', icon: Calendar, label: 'Horaires', color: 'indigo' },
        { id: 'cursus', icon: Layers, label: 'Cursus', color: 'teal' },
        { id: 'grades', icon: BarChart3, label: 'Notes', color: 'emerald' },
        { id: 'payments', icon: CreditCard, label: 'Paiements', color: 'amber' },
        { id: 'profile', icon: User, label: 'Profil' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-[env(safe-area-inset-bottom,0px)] bg-linear-to-t from-[#0B0E14] via-[#0B0E14]/95 to-transparent pt-3">
            <div className="glass-card flex items-center p-1.5 gap-0.5 bg-[#0F172A]/95 backdrop-blur-xl border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.5)] rounded-2xl w-full max-w-sm mx-auto justify-between px-2">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    const colorMap: Record<string, { text: string; bg: string; ping: string }> = {
                        indigo: { text: 'text-indigo-400', bg: 'bg-indigo-500/20', ping: 'bg-indigo-400' },
                        emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/20', ping: 'bg-emerald-400' },
                        amber: { text: 'text-amber-400', bg: 'bg-amber-500/20', ping: 'bg-amber-400' },
                        teal: { text: 'text-teal-400', bg: 'bg-teal-500/20', ping: 'bg-teal-400' },
                    };
                    const c = item.color ? colorMap[item.color] : null;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={cn(
                                "relative flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-300",
                                isActive ? "text-primary" : "text-slate-500 hover:text-slate-300",
                                c && !isActive && c.text,
                            )}
                        >
                            {c && !isActive && (
                                <div className="absolute top-1 right-1.5">
                                    <span className="relative flex h-2 w-2">
                                        <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", c.ping)} />
                                        <span className={cn("relative inline-flex rounded-full h-2 w-2", c.ping)} />
                                    </span>
                                </div>
                            )}
                            <div className={cn(
                                "p-1.5 rounded-full transition-all duration-300",
                                isActive && "translate-y-[-2px]",
                                isActive && c && c.bg,
                                isActive && !c && "bg-primary/10",
                            )}>
                                <item.icon className="w-5 h-5 transition-transform duration-300" strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={cn(
                                "text-[10px] font-medium transition-all duration-300 mt-1",
                                isActive ? "opacity-100 font-semibold" : "opacity-70",
                                c && !isActive && `${c.text} font-semibold opacity-100`,
                            )}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function StudentDashboard() {
    const orgSlug = useOrgSlug();
    const router = useRouter();
    const [org, setOrg] = useState<any>(null);
    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>('dashboard');

    const [classroom, setClassroom] = useState<any>(null);
    const [filiere, setFiliere] = useState<any>(null);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [timetableSlots, setTimetableSlots] = useState<any[]>([]);
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [disciplines, setDisciplines] = useState<any[]>([]);
    const [showDeletedModal, setShowDeletedModal] = useState(false);
    const [showDeactivatedModal, setShowDeactivatedModal] = useState(false);
    const [chapters, setChapters] = useState<any[]>([]);
    const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    useEffect(() => {
        (async () => {
            const raw = localStorage.getItem('campusflow_session');
            if (!raw) { router.push(`/${orgSlug}/login`); return; }
            const session = JSON.parse(raw);
            if (session.role !== 'student') { router.push(`/${orgSlug}/login`); return; }

            const { data: o } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single();
            if (!o) { setLoading(false); return; }
            setOrg(o);

            const { data: s, error: sErr } = await supabase.from('student_profiles').select('*')
                .eq('id', session.id).single();

            if (sErr || !s) {
                localStorage.removeItem('campusflow_session');
                setShowDeletedModal(true);
                setLoading(false);
                return;
            }
            if (s.is_active === false) {
                localStorage.removeItem('campusflow_session');
                setShowDeactivatedModal(true);
                setLoading(false);
                return;
            }
            setStudent(s);

            if (s.classroom_id) {
                const { data: cls } = await supabase.from('classrooms').select('*, filieres:filiere_id(*)').eq('id', s.classroom_id).single();
                setClassroom(cls);
                if (cls?.filieres) setFiliere(cls.filieres);

                const { data: subs } = await supabase.from('subjects').select('*, teacher_profiles:teacher_id(first_name, last_name)')
                    .eq('classroom_id', s.classroom_id).order('name');
                setSubjects(subs || []);

                const { data: slots } = await supabase.from('timetable_slots')
                    .select('*, subjects:subject_id(name), classrooms:classroom_id(name)')
                    .eq('classroom_id', s.classroom_id).order('start_time');
                setTimetableSlots(slots || []);

                const { data: evs } = await supabase.from('evaluations')
                    .select('*, subjects:subject_id(name)')
                    .eq('classroom_id', s.classroom_id).order('created_at', { ascending: false });
                setEvaluations(evs || []);

                const { data: grs } = await supabase.from('grades')
                    .select('*, evaluations:evaluation_id(title, max_score, type, subject_id, subjects:subject_id(name))')
                    .eq('student_id', s.id);
                setGrades(grs || []);

                // Load chapters for cursus
                const subjectIds = (subs || []).map((sub: any) => sub.id);
                if (subjectIds.length > 0) {
                    const { data: chaps } = await supabase.from('chapters').select('*').in('subject_id', subjectIds).order('position');
                    setChapters(chaps || []);
                }
            }

            const { data: pays } = await supabase.from('school_payments').select('*')
                .eq('student_id', s.id).order('paid_at', { ascending: false });
            setPayments(pays || []);

            const { data: disc } = await supabase.from('disciplines').select('*')
                .eq('student_id', s.id).order('created_at', { ascending: false });
            setDisciplines(disc || []);

            setLoading(false);
        })();
    }, [orgSlug]);

    // ═══ COMPUTED ═══
    const gradesBySubject = subjects.map(sub => {
        const subGrades = grades.filter((g: any) => g.evaluations?.subject_id === sub.id || g.evaluations?.subjects?.name === sub.name);
        const scored = subGrades.filter((g: any) => g.score !== null && g.score !== undefined);
        let avg = 0;
        if (scored.length > 0) {
            const total = scored.reduce((sum: number, g: any) => sum + (g.score / (g.evaluations?.max_score || 20)) * 20, 0);
            avg = total / scored.length;
        }
        return { subject: sub, grades: subGrades, average: avg, count: scored.length };
    });

    const overallAvg = gradesBySubject.filter(gs => gs.count > 0).length > 0
        ? gradesBySubject.filter(gs => gs.count > 0).reduce((sum, gs) => sum + gs.average * (gs.subject.coefficient || 1), 0) /
        gradesBySubject.filter(gs => gs.count > 0).reduce((sum, gs) => sum + (gs.subject.coefficient || 1), 0)
        : 0;

    const totalPaid = payments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
    const today = new Date().getDay();
    const todaySlots = timetableSlots.filter((s: any) => s.day_of_week === (today === 0 ? 7 : today));

    const signOut = () => {
        localStorage.removeItem('campusflow_session');
        router.push(`/${orgSlug}/login`);
    };

    // ═══ MODALS ═══
    if (showDeletedModal) return (
        <div className="min-h-screen bg-linear-to-b from-[#0B0E14] to-[#0F1219] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="max-w-sm w-full p-8 rounded-3xl bg-linear-to-b from-[#0F1219] to-[#1a1f2e] border border-red-500/20 text-center shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-xl font-black text-white mb-2">Compte supprimé</h2>
                <p className="text-sm text-slate-400 mb-6">Votre compte a été supprimé de la plateforme. Contactez l'administration de votre établissement.</p>
                <Button onClick={() => router.push(`/${orgSlug}`)} className="bg-linear-to-r from-red-600 to-pink-600 font-bold rounded-xl">Retour à l'accueil</Button>
            </motion.div>
        </div>
    );

    if (showDeactivatedModal) return (
        <div className="min-h-screen bg-linear-to-b from-[#0B0E14] to-[#0F1219] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="max-w-sm w-full p-8 rounded-3xl bg-linear-to-b from-[#0F1219] to-[#1a1f2e] border border-amber-500/20 text-center shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-amber-600/20 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-amber-400" />
                </div>
                <h2 className="text-xl font-black text-white mb-2">Compte désactivé</h2>
                <p className="text-sm text-slate-400 mb-6">Votre compte a été temporairement désactivé. Contactez votre établissement.</p>
                <Button onClick={() => router.push(`/${orgSlug}`)} className="bg-linear-to-r from-amber-600 to-orange-600 font-bold rounded-xl">Retour</Button>
            </motion.div>
        </div>
    );

    if (loading) return (
        <div className="min-h-screen bg-linear-to-b from-[#0B0E14] to-[#0F1219] flex items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <Loader2 className="w-8 h-8 text-primary" />
            </motion.div>
        </div>
    );
    if (!org || !student) return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-white"><h1>Non autorisé</h1></div>;

    return (
        <main className="min-h-screen bg-linear-to-b from-[#0B0E14] to-[#0F1219] text-white pb-24 overflow-y-auto">
            {/* Ambient blobs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="ambient-blob-teal" style={{ top: '-20%', right: '-20%' }} />
                <div className="ambient-blob-indigo" style={{ bottom: '-20%', left: '-20%' }} />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto w-full px-4">
                {/* Header */}
                <header className="flex items-center justify-between pt-8 pb-4">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11 border-2 border-primary shadow-lg">
                            <AvatarImage src={student.photo_url} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {student.first_name?.[0]}{student.last_name?.[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="text-sm font-black truncate max-w-[200px]">{student.first_name} {student.last_name}</h1>
                            <p className="text-[10px] text-muted-foreground">{classroom?.name || '—'} • {student.matricule || '—'}</p>
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
                            {/* Welcome card */}
                            <Card className="bg-linear-to-br from-teal-500/10 to-indigo-500/5 border-teal-500/20 backdrop-blur-sm overflow-hidden">
                                <CardContent className="p-5">
                                    <h2 className="text-lg font-black">Bonjour, {student.first_name} 👋</h2>
                                    <p className="text-sm text-muted-foreground mt-1">{org.name}</p>
                                    {filiere && (
                                        <Badge className="mt-2 bg-linear-to-r from-teal-600 to-emerald-600 border-none text-white text-[10px]">
                                            {filiere.nom} • {filiere.duree_mois} mois
                                        </Badge>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Stats Grid (holographic-ring style) */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { l: 'Moyenne', v: overallAvg > 0 ? overallAvg.toFixed(1) : '—', unit: '/20', icon: BarChart3, color: 'teal' },
                                    { l: 'Matières', v: subjects.length, unit: '', icon: BookOpen, color: 'indigo' },
                                    { l: 'Évaluations', v: evaluations.length, unit: '', icon: FileText, color: 'amber' },
                                ].map((s, i) => {
                                    const colorMap: Record<string, string> = {
                                        teal: 'border-teal-500/20',
                                        indigo: 'border-indigo-500/20',
                                        amber: 'border-amber-500/20',
                                    };
                                    const iconColorMap: Record<string, string> = {
                                        teal: 'text-teal-500',
                                        indigo: 'text-indigo-500',
                                        amber: 'text-amber-500',
                                    };
                                    const bgMap: Record<string, string> = {
                                        teal: 'from-teal-500/10',
                                        indigo: 'from-indigo-500/10',
                                        amber: 'from-amber-500/10',
                                    };
                                    return (
                                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                                            <Card className={cn("bg-card/50 backdrop-blur-sm shadow-sm relative overflow-hidden group", colorMap[s.color])}>
                                                <div className={cn("absolute inset-0 bg-linear-to-br to-transparent opacity-0 group-hover:opacity-100 transition-opacity", bgMap[s.color])} />
                                                <CardContent className="flex flex-col items-center justify-center p-4">
                                                    <s.icon className={cn("h-5 w-5 mb-2", iconColorMap[s.color])} />
                                                    <span className="text-xl font-black">{s.v}<span className="text-xs font-normal text-muted-foreground">{s.unit}</span></span>
                                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">{s.l}</span>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Payment summary */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                                <Card className="bg-linear-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20 backdrop-blur-sm overflow-hidden">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-emerald-500/20 p-2.5 rounded-xl">
                                                <CircleDollarSign className="h-5 w-5 text-emerald-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm">Total payé</h3>
                                                <p className="text-[10px] text-slate-400">{payments.length} paiement(s)</p>
                                            </div>
                                        </div>
                                        <span className="text-lg font-black text-emerald-400">{fmt(totalPaid)} XAF</span>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Today's schedule */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                                <Card className="bg-linear-to-br from-indigo-500/10 to-purple-500/5 border-indigo-500/20 backdrop-blur-sm overflow-hidden">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="bg-indigo-500/20 p-2.5 rounded-xl">
                                                <Clock className="h-5 w-5 text-indigo-400" />
                                            </div>
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
                                                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/20 transition-all">
                                                        <span className="text-indigo-400 font-mono text-xs font-bold w-20">{s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)}</span>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium">{s.subjects?.name}</p>
                                                            {s.room && <p className="text-[10px] text-slate-500">{s.room}</p>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Recent grades */}
                            {grades.length > 0 && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                                    <Card className="bg-linear-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20 backdrop-blur-sm overflow-hidden">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="bg-amber-500/20 p-2.5 rounded-xl">
                                                    <Trophy className="h-5 w-5 text-amber-400" />
                                                </div>
                                                <h3 className="font-bold text-sm">Dernières notes</h3>
                                            </div>
                                            {grades.slice(0, 5).map((g: any) => (
                                                <div key={g.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                                                    <div>
                                                        <p className="text-sm">{g.evaluations?.title || 'Évaluation'}</p>
                                                        <p className="text-[10px] text-slate-500">{g.evaluations?.subjects?.name || '—'} • {g.evaluations?.type}</p>
                                                    </div>
                                                    <Badge className={cn(
                                                        "font-black border-none",
                                                        g.score >= (g.evaluations?.max_score || 20) * 0.5
                                                            ? "bg-emerald-500/20 text-emerald-400"
                                                            : "bg-red-500/20 text-red-400"
                                                    )}>
                                                        {g.score}/{g.evaluations?.max_score || 20}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {/* Disciplines */}
                            {disciplines.length > 0 && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                                    <Card className="bg-linear-to-br from-red-500/10 to-rose-500/5 border-red-500/20 backdrop-blur-sm overflow-hidden">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="bg-red-500/20 p-2.5 rounded-xl">
                                                    <AlertCircle className="h-5 w-5 text-red-400" />
                                                </div>
                                                <h3 className="font-bold text-sm text-red-400">Sanctions ({disciplines.length})</h3>
                                            </div>
                                            {disciplines.slice(0, 3).map((d: any) => (
                                                <div key={d.id} className="flex items-center justify-between p-2 rounded-xl text-sm">
                                                    <span className="text-slate-300">{d.reason}</span>
                                                    <Badge className="bg-red-500/10 text-red-300 border-none text-[10px]">{d.type?.replace(/_/g, ' ')}</Badge>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {/* Quick links */}
                            <div className="grid grid-cols-2 gap-3">
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                                    <Card className="bg-card/50 backdrop-blur-sm border-emerald-500/20 cursor-pointer group hover:border-emerald-500/40 transition-all"
                                        onClick={() => router.push(`/${orgSlug}/library`)}>
                                        <div className="absolute inset-0 bg-linear-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                                        <CardContent className="p-4 relative">
                                            <BookMarked className="w-5 h-5 text-emerald-400 mb-2" />
                                            <p className="font-bold text-sm">Bibliothèque</p>
                                            <p className="text-[10px] text-muted-foreground">Documents & ressources</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
                                    <Card className="bg-card/50 backdrop-blur-sm border-teal-500/20 cursor-pointer group hover:border-teal-500/40 transition-all"
                                        onClick={() => router.push(`/${orgSlug}/shop`)}>
                                        <div className="absolute inset-0 bg-linear-to-br from-teal-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                                        <CardContent className="p-4 relative">
                                            <ShoppingBag className="w-5 h-5 text-teal-400 mb-2" />
                                            <p className="font-bold text-sm">Marketplace</p>
                                            <p className="text-[10px] text-muted-foreground">Fournitures & uniformes</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </div>
                        </motion.div>
                    )}

                    {/* ═══ TIMETABLE ═══ */}
                    {tab === 'timetable' && (
                        <motion.div key="timetable" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4 pt-4">
                            <h2 className="font-black text-lg text-gradient-primary">📅 Emploi du temps — {classroom?.name}</h2>
                            {DAYS.map((day, di) => {
                                const slots = timetableSlots.filter((s: any) => s.day_of_week === di + 1);
                                const isToday = (today === 0 ? 7 : today) === di + 1;
                                return (
                                    <motion.div key={di} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * di }}>
                                        <Card className={cn(
                                            "backdrop-blur-sm overflow-hidden",
                                            isToday ? "bg-linear-to-br from-teal-500/10 to-indigo-500/5 border-teal-500/20" : "bg-card/50 border-white/5"
                                        )}>
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
                                                                {s.room && <span className="text-xs text-slate-500">{s.room}</span>}
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

                    {/* ═══ GRADES ═══ */}
                    {tab === 'grades' && (
                        <motion.div key="grades" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4 pt-4">
                            <h2 className="font-black text-lg text-gradient-primary">📊 Notes & Moyennes</h2>
                            {/* Overall */}
                            <Card className={cn(
                                "backdrop-blur-sm overflow-hidden text-center",
                                overallAvg >= 10 ? "bg-linear-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20" :
                                    overallAvg > 0 ? "bg-linear-to-br from-red-500/10 to-rose-500/5 border-red-500/20" :
                                        "bg-card/50 border-white/10"
                            )}>
                                <CardContent className="p-5">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Moyenne générale</p>
                                    <p className={cn("text-4xl font-black mt-1", overallAvg >= 10 ? "text-emerald-400" : overallAvg > 0 ? "text-red-400" : "text-slate-500")}>
                                        {overallAvg > 0 ? overallAvg.toFixed(2) : '—'}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">/20 • {gradesBySubject.filter(gs => gs.count > 0).length} matière(s)</p>
                                </CardContent>
                            </Card>
                            {/* Per subject */}
                            {gradesBySubject.map((gs, i) => (
                                <motion.div key={gs.subject.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                                    <Card className="bg-card/50 backdrop-blur-sm border-white/10 overflow-hidden">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <h3 className="font-bold text-sm">{gs.subject.name}</h3>
                                                    <p className="text-[10px] text-muted-foreground">Coef. {gs.subject.coefficient || 1}
                                                        {gs.subject.teacher_profiles ? ` • ${gs.subject.teacher_profiles.first_name} ${gs.subject.teacher_profiles.last_name}` : ''}
                                                    </p>
                                                </div>
                                                <span className={cn("text-lg font-black", gs.count > 0 ? (gs.average >= 10 ? "text-emerald-400" : "text-red-400") : "text-slate-600")}>
                                                    {gs.count > 0 ? gs.average.toFixed(1) : '—'}
                                                </span>
                                            </div>
                                            {gs.count > 0 && <Progress value={(gs.average / 20) * 100} className="h-2 mb-2" />}
                                            {gs.grades.map((g: any) => (
                                                <div key={g.id} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-white/5">
                                                    <span className="text-slate-400">{g.evaluations?.title} ({g.evaluations?.type})</span>
                                                    <span className={cn("font-bold", g.score >= (g.evaluations?.max_score || 20) / 2 ? "text-emerald-400" : "text-red-400")}>
                                                        {g.score}/{g.evaluations?.max_score || 20}
                                                    </span>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                            {gradesBySubject.length === 0 && (
                                <div className="text-center py-12 text-slate-500"><BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="text-sm">Pas encore de notes</p></div>
                            )}
                        </motion.div>
                    )}

                    {/* ═══ PAYMENTS ═══ */}
                    {tab === 'payments' && (
                        <motion.div key="payments" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4 pt-4">
                            <h2 className="font-black text-lg text-gradient-primary">💰 Paiements</h2>
                            <Card className="bg-linear-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20 backdrop-blur-sm overflow-hidden text-center">
                                <CardContent className="p-5">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total payé</p>
                                    <p className="text-3xl font-black text-emerald-400 mt-1">{fmt(totalPaid)} XAF</p>
                                    <p className="text-sm text-muted-foreground mt-1">{payments.length} paiement(s)</p>
                                </CardContent>
                            </Card>
                            {payments.length > 0 ? payments.map((p: any) => (
                                <motion.div key={p.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                                    <Card className="bg-card/50 backdrop-blur-sm border-white/10 overflow-hidden">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
                                                    p.payment_method === 'momo' ? 'bg-yellow-500/20' : p.payment_method === 'orange_money' ? 'bg-orange-500/20' : 'bg-emerald-500/20')}>
                                                    <CircleDollarSign className={cn("w-5 h-5",
                                                        p.payment_method === 'momo' ? 'text-yellow-400' : p.payment_method === 'orange_money' ? 'text-orange-400' : 'text-emerald-400')} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{p.description || 'Scolarité'}</p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {p.payment_method === 'momo' ? 'MTN MoMo' : p.payment_method === 'orange_money' ? 'Orange Money' : 'Espèces'}
                                                        {' • '}{new Date(p.paid_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-sm font-black text-emerald-400">{fmt(p.amount)}</span>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )) : (
                                <div className="text-center py-12 text-slate-500"><CreditCard className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="text-sm">Aucun paiement</p></div>
                            )}
                        </motion.div>
                    )}

                    {/* ═══ CURSUS ═══ */}
                    {tab === 'cursus' && (
                        <motion.div key="cursus" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4 pt-4">
                            <h2 className="font-black text-lg text-gradient-primary">📚 Mon parcours</h2>

                            {subjects.length === 0 ? (
                                <div className="text-center py-12 text-slate-500"><Layers className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="text-sm">Aucune matière dans votre classe</p></div>
                            ) : subjects.map((sub: any) => {
                                const subChapters = chapters.filter(c => c.subject_id === sub.id).sort((a, b) => a.position - b.position);
                                const isExpanded = expandedSubject === sub.id;
                                const publishedCount = subChapters.filter(c => c.status === 'published' || c.status === 'completed').length;

                                return (
                                    <motion.div key={sub.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                        <Card className={cn("backdrop-blur-sm overflow-hidden transition-all cursor-pointer", isExpanded ? "bg-linear-to-br from-teal-500/10 to-indigo-500/5 border-teal-500/20" : "bg-card/50 border-white/10 hover:border-teal-500/20")}
                                            onClick={() => setExpandedSubject(isExpanded ? null : sub.id)}>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-teal-500/20 p-2.5 rounded-xl"><BookOpen className="h-5 w-5 text-teal-400" /></div>
                                                        <div>
                                                            <h3 className="font-bold text-sm">{sub.name}</h3>
                                                            <p className="text-[10px] text-slate-400">Coef. {sub.coefficient} • {sub.teacher_profiles ? `Prof. ${sub.teacher_profiles.first_name} ${sub.teacher_profiles.last_name}` : ''} • {publishedCount}/{subChapters.length} chapitres</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {subChapters.length > 0 && (
                                                            <div className="w-14 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                                <div className="h-full bg-linear-to-r from-teal-500 to-emerald-400 rounded-full transition-all" style={{ width: `${subChapters.length > 0 ? (publishedCount / subChapters.length) * 100 : 0}%` }} />
                                                            </div>
                                                        )}
                                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 space-y-2 border-t border-white/5 pt-3" onClick={e => e.stopPropagation()}>
                                                        {subChapters.length === 0 ? (
                                                            <p className="text-xs text-slate-600 text-center py-3">Programme pas encore disponible</p>
                                                        ) : subChapters.map((ch, ci) => {
                                                            const isLocked = ch.status === 'draft';
                                                            const isCompleted = ch.status === 'completed';
                                                            const chImages = (ch.resources || []).filter((r: any) => r.type === 'image');
                                                            const chFiles = (ch.resources || []).filter((r: any) => r.type === 'resource');
                                                            const hasContent = !isLocked && (ch.content || chImages.length > 0 || chFiles.length > 0);
                                                            return (
                                                                <div key={ch.id}>
                                                                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ci * 0.05 }}
                                                                        className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all",
                                                                            isLocked ? "bg-white/[0.02] border-white/5 opacity-50" :
                                                                            isCompleted ? "bg-blue-500/5 border-blue-500/10 cursor-pointer" :
                                                                            "bg-teal-500/5 border-teal-500/10 cursor-pointer"
                                                                        )}
                                                                        onClick={() => !isLocked && setExpandedSubject(expandedSubject === `ch_${ch.id}` ? sub.id : `ch_${ch.id}`)}>
                                                                        <span className="text-xs font-mono text-slate-600 w-6 text-center">{ch.position}</span>
                                                                        {isLocked ? <Lock className="w-4 h-4 text-slate-600 shrink-0" /> :
                                                                         isCompleted ? <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" /> :
                                                                         <Eye className="w-4 h-4 text-teal-400 shrink-0" />}
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className={cn("text-sm font-medium truncate", isLocked && "text-slate-600")}>{ch.title}</p>
                                                                            {!isLocked && ch.description && <p className="text-[10px] text-slate-500 truncate">{ch.description}</p>}
                                                                            {isLocked && <p className="text-[10px] text-slate-700">🔒 Pas encore dispensé</p>}
                                                                        </div>
                                                                        {isCompleted && <Badge className="bg-blue-500/20 text-blue-400 border-none text-[9px]">Terminé</Badge>}
                                                                        {!isLocked && !isCompleted && <Badge className="bg-teal-500/20 text-teal-400 border-none text-[9px]">En cours</Badge>}
                                                                    </motion.div>

                                                                    {/* Chapter Content (read-only for students) */}
                                                                    {!isLocked && expandedSubject === `ch_${ch.id}` && hasContent && (
                                                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                                            className="mt-1 ml-8 p-4 rounded-xl bg-teal-500/5 border border-teal-500/10 space-y-3">
                                                                            {ch.content && (
                                                                                <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{ch.content}</div>
                                                                            )}
                                                                            {chImages.length > 0 && (
                                                                                <div>
                                                                                    <p className="text-[10px] text-slate-400 mb-2">🖼️ Supports visuels</p>
                                                                                    <div className="grid grid-cols-2 gap-2">
                                                                                        {chImages.map((r: any, ri: number) => (
                                                                                            <img key={ri} src={r.url} alt={r.name} className="w-full rounded-lg border border-white/10 object-cover" />
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {chFiles.length > 0 && (
                                                                                <div>
                                                                                    <p className="text-[10px] text-slate-400 mb-2">📎 Ressources à télécharger</p>
                                                                                    <div className="space-y-1">
                                                                                        {chFiles.map((r: any, ri: number) => (
                                                                                            <a key={ri} href={r.url} target="_blank" rel="noopener"
                                                                                                className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/5 hover:border-teal-500/20 transition-all">
                                                                                                <FileText className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                                                                                                <span className="text-xs text-slate-300 truncate">{r.name}</span>
                                                                                                <ChevronRight className="w-3 h-3 text-slate-600 ml-auto" />
                                                                                            </a>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </motion.div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </motion.div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}

                    {/* ═══ PROFILE ═══ */}
                    {tab === 'profile' && (
                        <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5 pt-4">
                            {/* Profile header (holographic-ring style) */}
                            <div className="flex flex-col items-center mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="relative mb-4">
                                    <Avatar className="h-24 w-24 border-4 border-primary shadow-xl">
                                        <AvatarImage src={student.photo_url} />
                                        <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                                            {student.first_name?.[0]}{student.last_name?.[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <label className="absolute bottom-0 right-0 p-1.5 rounded-full bg-teal-500 hover:bg-teal-400 cursor-pointer shadow-lg transition-colors">
                                        {uploadingPhoto ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
                                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            if (!file.type.startsWith('image/')) { toast.error('Fichier image requis'); return; }
                                            if (file.size > 5 * 1024 * 1024) { toast.error('Max 5 Mo'); return; }
                                            setUploadingPhoto(true);
                                            try {
                                                const compressed = await compressImage(file, { maxWidth: 500, quality: 0.7 });
                                                const ext = file.name.split('.').pop();
                                                const path = `profile-photos/students/${student.id}_${Date.now()}.${ext}`;
                                                const { error: upErr } = await supabase.storage.from('organization-assets').upload(path, compressed, { contentType: compressed.type, upsert: true });
                                                if (upErr) throw upErr;
                                                const { data: urlData } = supabase.storage.from('organization-assets').getPublicUrl(path);
                                                const { error: dbErr } = await supabase.from('student_profiles').update({ photo_url: urlData.publicUrl }).eq('id', student.id);
                                                if (dbErr) throw dbErr;
                                                setStudent({ ...student, photo_url: urlData.publicUrl });
                                                toast.success('Photo mise à jour !');
                                            } catch (err: any) { toast.error(err.message || 'Erreur upload'); }
                                            setUploadingPhoto(false);
                                        }} disabled={uploadingPhoto} />
                                    </label>
                                    {overallAvg > 0 && (
                                        <Badge className="absolute -bottom-2 -left-2 px-3 py-1 bg-linear-to-r from-yellow-500 to-amber-600 border-none text-white shadow-lg text-[10px]">
                                            {overallAvg >= 16 ? '🏆 Excellent' : overallAvg >= 14 ? '⭐ Très bien' : overallAvg >= 12 ? '👍 Bien' : overallAvg >= 10 ? '💪 Passable' : '📚 En progrès'}
                                        </Badge>
                                    )}
                                </div>
                                <h2 className="text-2xl font-black text-gradient-primary">{student.first_name} {student.last_name}</h2>
                                <p className="text-sm text-teal-400 mt-1">{classroom?.name || '—'}</p>
                                <p className="text-xs text-muted-foreground mt-2 bg-muted/50 px-3 py-1 rounded-full">{org.name}</p>
                            </div>

                            {/* Stats like holographic-ring */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { icon: BarChart3, value: overallAvg > 0 ? overallAvg.toFixed(1) : '—', label: 'Moyenne', color: 'teal' },
                                    { icon: BookOpen, value: subjects.length, label: 'Matières', color: 'indigo' },
                                    { icon: CircleDollarSign, value: fmt(totalPaid), label: 'XAF payés', color: 'emerald' },
                                ].map((s, i) => {
                                    const borderMap: Record<string, string> = { teal: 'border-teal-500/20', indigo: 'border-indigo-500/20', emerald: 'border-emerald-500/20' };
                                    const iconMap: Record<string, string> = { teal: 'text-teal-500', indigo: 'text-indigo-500', emerald: 'text-emerald-500' };
                                    return (
                                        <Card key={i} className={cn("bg-card/50 backdrop-blur-sm shadow-sm relative overflow-hidden group", borderMap[s.color])}>
                                            <CardContent className="flex flex-col items-center justify-center p-4">
                                                <s.icon className={cn("h-5 w-5 mb-2", iconMap[s.color])} />
                                                <span className="text-lg font-black">{s.value}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">{s.label}</span>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>

                            {/* Info card */}
                            <Card className="bg-card/50 backdrop-blur-sm border-white/10 overflow-hidden">
                                <CardContent className="p-4 space-y-3">
                                    {[
                                        ['🆔 Matricule', student.matricule],
                                        ['📧 Email', student.email],
                                        ['📱 Téléphone', student.phone],
                                        ['🎂 Naissance', student.birth_date || student.date_of_birth],
                                        ['👤 Sexe', student.sex === 'M' ? 'Masculin' : student.sex === 'F' ? 'Féminin' : student.sex],
                                        ['🎓 Filière', filiere?.nom || '—'],
                                        ['⚠️ Sanctions', disciplines.length > 0 ? `${disciplines.length}` : 'Aucune'],
                                    ].map(([k, v], i) => (
                                        <div key={i} className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">{k}</span>
                                            <span className={cn("font-medium", String(k).includes('Sanctions') && disciplines.length > 0 ? 'text-red-400' : '')}>{v || '—'}</span>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Level progress */}
                            {overallAvg > 0 && (
                                <Card className={cn(
                                    "backdrop-blur-sm overflow-hidden",
                                    overallAvg >= 14 ? "bg-linear-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20" :
                                        overallAvg >= 10 ? "bg-linear-to-br from-teal-500/10 to-indigo-500/5 border-teal-500/20" :
                                            "bg-linear-to-br from-red-500/10 to-rose-500/5 border-red-500/20"
                                )}>
                                    <CardContent className="p-4">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-muted-foreground">Progression académique</span>
                                            <span className="font-bold">{overallAvg.toFixed(1)}/20</span>
                                        </div>
                                        <Progress value={(overallAvg / 20) * 100} className="h-2" />
                                    </CardContent>
                                </Card>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Nav (holographic-ring style) */}
            <BottomNav activeTab={tab} onTabChange={setTab} />
        </main>
    );
}
