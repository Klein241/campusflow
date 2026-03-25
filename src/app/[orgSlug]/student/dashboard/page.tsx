'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Home, Calendar, BookOpen, CreditCard, GraduationCap, Loader2,
    Clock, Trophy, TrendingUp, BarChart3, MessageSquare, LogOut,
    FileText, Target, Star, CircleDollarSign, CheckCircle2, AlertCircle,
    ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════
// CAMPUSFLOW — DASHBOARD ÉTUDIANT COMPLET
// ═══════════════════════════════════════════════════════

type Tab = 'dashboard' | 'timetable' | 'grades' | 'payments' | 'profile';
const TABS: { id: Tab; icon: any; label: string }[] = [
    { id: 'dashboard', icon: Home, label: 'Accueil' },
    { id: 'timetable', icon: Calendar, label: 'Horaires' },
    { id: 'grades', icon: BarChart3, label: 'Notes' },
    { id: 'payments', icon: CreditCard, label: 'Paiements' },
    { id: 'profile', icon: GraduationCap, label: 'Profil' },
];
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

export default function StudentDashboard() {
    const { orgSlug } = useParams<{ orgSlug: string }>();
    const router = useRouter();
    const [org, setOrg] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>('dashboard');

    // Data
    const [classroom, setClassroom] = useState<any>(null);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [timetableSlots, setTimetableSlots] = useState<any[]>([]);
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [disciplines, setDisciplines] = useState<any[]>([]);

    // ═══ LOAD ═══
    useEffect(() => {
        (async () => {
            const { data: o } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single();
            if (!o) { setLoading(false); return; }
            setOrg(o);

            const { data: { user: u } } = await supabase.auth.getUser();
            if (!u) { router.push(`/${orgSlug}/login`); return; }
            setUser(u);

            // Get student profile
            const { data: s } = await supabase.from('student_profiles').select('*')
                .eq('organization_id', o.id).eq('user_id', u.id).single();
            if (!s) { router.push(`/${orgSlug}/login`); return; }
            setStudent(s);

            // Get classroom
            if (s.classroom_id) {
                const { data: cls } = await supabase.from('classrooms').select('*').eq('id', s.classroom_id).single();
                setClassroom(cls);

                // Subjects for my class
                const { data: subs } = await supabase.from('subjects').select('*, teacher_profiles:teacher_id(first_name, last_name)')
                    .eq('classroom_id', s.classroom_id).order('name');
                setSubjects(subs || []);

                // Timetable
                const { data: slots } = await supabase.from('timetable_slots')
                    .select('*, subjects:subject_id(name), classrooms:classroom_id(name)')
                    .eq('classroom_id', s.classroom_id).order('start_time');
                setTimetableSlots(slots || []);

                // Evaluations for my class
                const { data: evs } = await supabase.from('evaluations')
                    .select('*, subjects:subject_id(name)')
                    .eq('classroom_id', s.classroom_id).order('created_at', { ascending: false });
                setEvaluations(evs || []);

                // My grades
                const { data: grs } = await supabase.from('grades')
                    .select('*, evaluations:evaluation_id(title, max_score, type, subject_id, subjects:subject_id(name))')
                    .eq('student_id', s.id);
                setGrades(grs || []);
            }

            // Payments
            const { data: pays } = await supabase.from('school_payments').select('*')
                .eq('student_id', s.id).order('paid_at', { ascending: false });
            setPayments(pays || []);

            // Disciplines
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
            // Weighted average out of 20
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

    const signOut = async () => { await supabase.auth.signOut(); router.push(`/${orgSlug}/login`); };

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-400 animate-spin" /></div>;
    if (!org || !student) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><h1>Non autorisé</h1></div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">
            {/* Top bar */}
            <header className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600/20 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold truncate max-w-[200px]">{student.first_name} {student.last_name}</h1>
                        <p className="text-[10px] text-slate-500">{classroom?.name || '—'} • {student.matricule || '—'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-slate-400 h-8 w-8 p-0" onClick={() => router.push(`/${orgSlug}/messages`)}>
                        <MessageSquare className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-400 h-8 w-8 p-0" onClick={signOut}>
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pb-20">
                <div className="max-w-4xl mx-auto px-4 pt-4">
                    {/* ═══ DASHBOARD ═══ */}
                    {tab === 'dashboard' && (
                        <div className="space-y-4">
                            {/* Welcome card */}
                            <div className="p-5 rounded-xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/20">
                                <h2 className="text-lg font-bold">Bonjour, {student.first_name} 👋</h2>
                                <p className="text-sm text-slate-400 mt-1">{org.name} — {classroom?.name || 'Classe non assignée'}</p>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600/60 to-indigo-600/60 relative overflow-hidden">
                                    <BarChart3 className="w-7 h-7 text-white/15 absolute -right-1 -bottom-1" />
                                    <p className="text-xl font-bold">{overallAvg > 0 ? overallAvg.toFixed(2) : '—'}</p>
                                    <p className="text-[10px] text-white/80">Moyenne /20</p>
                                </div>
                                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-600/60 to-green-600/60 relative overflow-hidden">
                                    <BookOpen className="w-7 h-7 text-white/15 absolute -right-1 -bottom-1" />
                                    <p className="text-xl font-bold">{subjects.length}</p>
                                    <p className="text-[10px] text-white/80">Matières</p>
                                </div>
                                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-600/60 to-orange-600/60 relative overflow-hidden">
                                    <FileText className="w-7 h-7 text-white/15 absolute -right-1 -bottom-1" />
                                    <p className="text-xl font-bold">{evaluations.length}</p>
                                    <p className="text-[10px] text-white/80">Évaluations</p>
                                </div>
                                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-600/60 to-pink-600/60 relative overflow-hidden">
                                    <CircleDollarSign className="w-7 h-7 text-white/15 absolute -right-1 -bottom-1" />
                                    <p className="text-xl font-bold">{fmt(totalPaid)}</p>
                                    <p className="text-[10px] text-white/80">XAF payés</p>
                                </div>
                            </div>

                            {/* Today schedule */}
                            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-blue-400" />
                                    Aujourd'hui — {DAYS[(today === 0 ? 6 : today - 1)] || 'Dimanche'}
                                </h3>
                                {todaySlots.length === 0 ? (
                                    <p className="text-sm text-slate-500">Pas de cours aujourd'hui 🎉</p>
                                ) : (
                                    <div className="space-y-2">
                                        {todaySlots.map((s: any) => (
                                            <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                                                <span className="text-blue-400 font-mono text-sm font-bold w-24">{s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}</span>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">{s.subjects?.name}</p>
                                                    <p className="text-[10px] text-slate-500">{s.room || ''}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Recent grades */}
                            {grades.length > 0 && (
                                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                                    <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-400" /> Dernières notes</h3>
                                    {grades.slice(0, 5).map((g: any) => (
                                        <div key={g.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
                                            <div>
                                                <p className="text-sm">{g.evaluations?.title || 'Évaluation'}</p>
                                                <p className="text-[10px] text-slate-500">{g.evaluations?.subjects?.name || '—'} • {g.evaluations?.type}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-sm font-bold ${g.score >= (g.evaluations?.max_score || 20) * 0.5 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {g.score}/{g.evaluations?.max_score || 20}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Disciplines */}
                            {disciplines.length > 0 && (
                                <div className="p-4 rounded-xl bg-red-600/5 border border-red-500/20">
                                    <h3 className="font-bold text-sm mb-2 text-red-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Sanctions ({disciplines.length})</h3>
                                    {disciplines.slice(0, 3).map((d: any) => (
                                        <div key={d.id} className="flex items-center justify-between p-2 rounded-lg text-sm">
                                            <span className="text-slate-300">{d.reason}</span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-300">{d.type?.replace(/_/g, ' ')}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Quick links */}
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => router.push(`/${orgSlug}/library`)} className="p-4 rounded-xl bg-emerald-600/10 border border-emerald-600/20 text-left hover:bg-emerald-600/15 transition">
                                    <BookOpen className="w-5 h-5 text-emerald-400 mb-2" />
                                    <p className="font-medium text-sm">Bibliothèque</p>
                                    <p className="text-[10px] text-slate-500">Documents & ressources</p>
                                </button>
                                <button onClick={() => router.push(`/${orgSlug}/shop`)} className="p-4 rounded-xl bg-teal-600/10 border border-teal-600/20 text-left hover:bg-teal-600/15 transition">
                                    <Target className="w-5 h-5 text-teal-400 mb-2" />
                                    <p className="font-medium text-sm">Marketplace</p>
                                    <p className="text-[10px] text-slate-500">Fournitures & uniformes</p>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ═══ TIMETABLE ═══ */}
                    {tab === 'timetable' && (
                        <div className="space-y-4">
                            <h2 className="font-bold text-lg">📅 Mon emploi du temps — {classroom?.name}</h2>
                            {DAYS.map((day, di) => {
                                const slots = timetableSlots.filter((s: any) => s.day_of_week === di + 1);
                                const isToday = (today === 0 ? 7 : today) === di + 1;
                                return (
                                    <div key={di} className={`p-4 rounded-xl border ${isToday ? 'bg-blue-600/5 border-blue-600/20' : 'bg-white/[0.02] border-white/5'}`}>
                                        <h3 className={`font-medium text-sm mb-2 ${isToday ? 'text-blue-400' : 'text-slate-400'}`}>
                                            {day} {isToday && '• Aujourd\'hui'}
                                        </h3>
                                        {slots.length === 0 ? <p className="text-xs text-slate-600">Pas de cours</p> : (
                                            <div className="space-y-1.5">
                                                {slots.map((s: any) => (
                                                    <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5">
                                                        <span className="text-blue-400 font-mono text-xs font-bold w-20">{s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)}</span>
                                                        <span className="text-sm flex-1">{s.subjects?.name}</span>
                                                        {s.room && <span className="text-xs text-slate-500">{s.room}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ═══ GRADES ═══ */}
                    {tab === 'grades' && (
                        <div className="space-y-4">
                            <h2 className="font-bold text-lg">📊 Mes notes & moyennes</h2>

                            {/* Overall average */}
                            <div className={`p-5 rounded-xl text-center ${overallAvg >= 10 ? 'bg-emerald-600/10 border border-emerald-500/20' : overallAvg > 0 ? 'bg-red-600/10 border border-red-500/20' : 'bg-white/[0.03] border border-white/10'}`}>
                                <p className="text-xs text-slate-400 uppercase tracking-wider">Moyenne générale</p>
                                <p className={`text-4xl font-black mt-1 ${overallAvg >= 10 ? 'text-emerald-400' : overallAvg > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                    {overallAvg > 0 ? overallAvg.toFixed(2) : '—'}
                                </p>
                                <p className="text-sm text-slate-500 mt-1">/20 • {gradesBySubject.filter(gs => gs.count > 0).length} matière(s) notée(s)</p>
                            </div>

                            {/* Per-subject */}
                            {gradesBySubject.map(gs => (
                                <div key={gs.subject.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h3 className="font-medium text-sm">{gs.subject.name}</h3>
                                            <p className="text-[10px] text-slate-500">
                                                Coef. {gs.subject.coefficient || 1} •
                                                {gs.subject.teacher_profiles ? ` Prof. ${gs.subject.teacher_profiles.first_name} ${gs.subject.teacher_profiles.last_name}` : ' Prof. non assigné'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-lg font-bold ${gs.count > 0 ? (gs.average >= 10 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-600'}`}>
                                                {gs.count > 0 ? gs.average.toFixed(2) : '—'}
                                            </span>
                                            <p className="text-[9px] text-slate-600">{gs.count} note(s)</p>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    {gs.count > 0 && (
                                        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden mb-2">
                                            <div className={`h-full rounded-full transition-all ${gs.average >= 14 ? 'bg-emerald-500' : gs.average >= 10 ? 'bg-blue-500' : gs.average >= 7 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                style={{ width: `${Math.min(100, (gs.average / 20) * 100)}%` }} />
                                        </div>
                                    )}

                                    {/* Individual grades */}
                                    {gs.grades.length > 0 && (
                                        <div className="space-y-1 mt-2">
                                            {gs.grades.map((g: any) => (
                                                <div key={g.id} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-white/5">
                                                    <span className="text-slate-400">{g.evaluations?.title} ({g.evaluations?.type})</span>
                                                    <span className={`font-bold ${g.score >= (g.evaluations?.max_score || 20) / 2 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {g.score}/{g.evaluations?.max_score || 20}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {gradesBySubject.length === 0 && (
                                <div className="text-center py-12 text-slate-500"><BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Pas encore de notes</p></div>
                            )}
                        </div>
                    )}

                    {/* ═══ PAYMENTS ═══ */}
                    {tab === 'payments' && (
                        <div className="space-y-4">
                            <h2 className="font-bold text-lg">💰 Mes paiements</h2>

                            {/* Total */}
                            <div className="p-5 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-center">
                                <p className="text-xs text-slate-400 uppercase tracking-wider">Total payé</p>
                                <p className="text-3xl font-black text-emerald-400 mt-1">{fmt(totalPaid)} XAF</p>
                                <p className="text-sm text-slate-500 mt-1">{payments.length} paiement(s)</p>
                            </div>

                            {/* Payment list */}
                            {payments.length > 0 ? (
                                <div className="space-y-2">
                                    {payments.map((p: any) => (
                                        <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${p.payment_method === 'momo' ? 'bg-yellow-600/20 text-yellow-400' :
                                                        p.payment_method === 'orange_money' ? 'bg-orange-600/20 text-orange-400' :
                                                            'bg-emerald-600/20 text-emerald-400'
                                                    }`}>
                                                    <CircleDollarSign className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{p.description || 'Paiement scolarité'}</p>
                                                    <p className="text-[10px] text-slate-500">
                                                        {p.payment_method === 'momo' ? 'MTN MoMo' : p.payment_method === 'orange_money' ? 'Orange Money' : p.payment_method === 'bank' ? 'Virement' : 'Espèces'}
                                                        {' • '}{new Date(p.paid_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-sm font-bold text-emerald-400">{fmt(p.amount)} XAF</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-500"><CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Aucun paiement enregistré</p></div>
                            )}
                        </div>
                    )}

                    {/* ═══ PROFILE ═══ */}
                    {tab === 'profile' && (
                        <div className="space-y-4 max-w-md mx-auto">
                            <div className="text-center">
                                <div className="w-20 h-20 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-3">
                                    <span className="text-2xl font-bold text-blue-400">{student.first_name?.[0]}{student.last_name?.[0]}</span>
                                </div>
                                <h2 className="text-xl font-bold">{student.first_name} {student.last_name}</h2>
                                <p className="text-sm text-blue-400">{classroom?.name || '—'}</p>
                                <p className="text-xs text-slate-500 mt-1">{org.name}</p>
                            </div>

                            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                                {[
                                    ['🆔 Matricule', student.matricule],
                                    ['📧 Email', student.email],
                                    ['📱 Téléphone', student.phone],
                                    ['🎂 Date naissance', student.birth_date],
                                    ['👤 Sexe', student.gender === 'M' ? 'Masculin' : student.gender === 'F' ? 'Féminin' : student.gender],
                                    ['📊 Moyenne', overallAvg > 0 ? `${overallAvg.toFixed(2)} /20` : '—'],
                                    ['💰 Total payé', `${fmt(totalPaid)} XAF`],
                                    ['⚠️ Sanctions', disciplines.length > 0 ? `${disciplines.length} sanction(s)` : 'Aucune'],
                                ].map(([k, v], i) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400">{k}</span>
                                        <span className={`font-medium ${String(k).includes('Sanctions') && disciplines.length > 0 ? 'text-red-400' : 'text-white'}`}>{v || '—'}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Performance insight */}
                            {overallAvg > 0 && (
                                <div className={`p-4 rounded-xl border ${overallAvg >= 14 ? 'bg-emerald-600/10 border-emerald-500/20' : overallAvg >= 10 ? 'bg-blue-600/10 border-blue-500/20' : 'bg-red-600/10 border-red-500/20'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        {overallAvg >= 14 ? <Star className="w-5 h-5 text-emerald-400" /> : overallAvg >= 10 ? <TrendingUp className="w-5 h-5 text-blue-400" /> : <Target className="w-5 h-5 text-red-400" />}
                                        <span className="font-bold text-sm">
                                            {overallAvg >= 16 ? 'Excellent ! 🏆' : overallAvg >= 14 ? 'Très bien ! ⭐' : overallAvg >= 12 ? 'Bien, continuez ! 👍' : overallAvg >= 10 ? 'Passable, aux efforts ! 💪' : 'En difficulté, consultez vos profs 📚'}
                                        </span>
                                    </div>
                                    <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
                                        <div className={`h-full rounded-full ${overallAvg >= 14 ? 'bg-emerald-500' : overallAvg >= 10 ? 'bg-blue-500' : 'bg-red-500'}`}
                                            style={{ width: `${Math.min(100, (overallAvg / 20) * 100)}%` }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Bottom nav */}
            <nav className="fixed bottom-0 inset-x-0 bg-slate-900/90 backdrop-blur-xl border-t border-white/5 z-30">
                <div className="flex items-center justify-around max-w-lg mx-auto py-2">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${tab === t.id ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>
                            <t.icon className="w-5 h-5" />
                            <span className="text-[10px]">{t.label}</span>
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
}
