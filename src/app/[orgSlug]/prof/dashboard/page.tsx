'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    BookOpen, Calendar, Users, GraduationCap, ClipboardList, Trophy,
    ArrowLeft, Home, MessageSquare, Loader2, Clock, CheckCircle2,
    Edit, Save, X, ChevronDown, BarChart3, FileText,
    Target, Award, PenSquare, LogOut, Bell, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════
// CAMPUSFLOW — DASHBOARD PROFESSEUR COMPLET
// ═══════════════════════════════════════════════════════

type Tab = 'dashboard' | 'timetable' | 'classes' | 'grades' | 'profile';
const TABS: { id: Tab; icon: any; label: string }[] = [
    { id: 'dashboard', icon: Home, label: 'Accueil' },
    { id: 'timetable', icon: Calendar, label: 'Emploi du temps' },
    { id: 'classes', icon: Users, label: 'Mes classes' },
    { id: 'grades', icon: ClipboardList, label: 'Notes' },
    { id: 'profile', icon: GraduationCap, label: 'Profil' },
];
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function TeacherDashboard() {
    const { orgSlug } = useParams<{ orgSlug: string }>();
    const router = useRouter();
    const [org, setOrg] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [teacher, setTeacher] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>('dashboard');

    // Data
    const [mySubjects, setMySubjects] = useState<any[]>([]);
    const [mySlots, setMySlots] = useState<any[]>([]);
    const [myClasses, setMyClasses] = useState<any[]>([]);
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);

    // Grades
    const [selEval, setSelEval] = useState<any>(null);
    const [grades, setGrades] = useState<Record<string, string>>({});
    const [savingGrades, setSavingGrades] = useState(false);

    // ═══ LOAD ═══
    useEffect(() => {
        (async () => {
            const { data: o } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single();
            if (!o) { setLoading(false); return; }
            setOrg(o);

            const { data: { user: u } } = await supabase.auth.getUser();
            if (!u) { router.push(`/${orgSlug}/login`); return; }
            setUser(u);

            // Get teacher profile
            const { data: t } = await supabase.from('teacher_profiles').select('*')
                .eq('organization_id', o.id).eq('user_id', u.id).single();
            if (!t) { router.push(`/${orgSlug}/login`); return; }
            setTeacher(t);

            // Subjects assigned to this teacher
            const { data: subs } = await supabase.from('subjects').select('*, classrooms:classroom_id(id,name)')
                .eq('organization_id', o.id).eq('teacher_id', t.id);
            setMySubjects(subs || []);

            // Extract unique classrooms
            const classIds = [...new Set((subs || []).map((s: any) => s.classroom_id).filter(Boolean))];

            // All classes (for timetable lookup by subject)
            if (classIds.length > 0) {
                const { data: clsData } = await supabase.from('classrooms').select('*').in('id', classIds);
                setMyClasses(clsData || []);
            }

            // Load all students for my classes
            if (classIds.length > 0) {
                const { data: studs } = await supabase.from('student_profiles').select('*')
                    .eq('organization_id', o.id).in('classroom_id', classIds);
                setStudents(studs || []);
            }

            // Timetable slots for my subjects
            const subjectIds = (subs || []).map((s: any) => s.id);
            if (subjectIds.length > 0) {
                const { data: slots } = await supabase.from('timetable_slots')
                    .select('*, classrooms:classroom_id(name), subjects:subject_id(name)')
                    .in('subject_id', subjectIds).order('start_time');
                setMySlots(slots || []);
            }

            // Evaluations for my subjects
            if (subjectIds.length > 0) {
                const { data: evs } = await supabase.from('evaluations')
                    .select('*, classrooms:classroom_id(name), subjects:subject_id(name)')
                    .in('subject_id', subjectIds).order('created_at', { ascending: false });
                setEvaluations(evs || []);
            }

            setLoading(false);
        })();
    }, [orgSlug]);

    // ═══ CREATE EVALUATION ═══
    const [newEvTitle, setNewEvTitle] = useState('');
    const [newEvType, setNewEvType] = useState('devoir');
    const [newEvSub, setNewEvSub] = useState('');
    const [newEvDate, setNewEvDate] = useState('');
    const [newEvMax, setNewEvMax] = useState('20');
    const [showNewEval, setShowNewEval] = useState(false);

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
        // Reload
        const subjectIds = mySubjects.map((s: any) => s.id);
        const { data: evs } = await supabase.from('evaluations')
            .select('*, classrooms:classroom_id(name), subjects:subject_id(name)')
            .in('subject_id', subjectIds).order('created_at', { ascending: false });
        setEvaluations(evs || []);
    };

    // ═══ LOAD GRADES FOR EVAL ═══
    const loadGrades = async (ev: any) => {
        setSelEval(ev);
        const clsStudents = students.filter((s: any) => s.classroom_id === ev.classroom_id);
        const { data: existingGrades } = await supabase.from('grades')
            .select('student_id, score').eq('evaluation_id', ev.id);
        const gMap: Record<string, string> = {};
        clsStudents.forEach((s: any) => {
            const g = (existingGrades || []).find((g: any) => g.student_id === s.id);
            gMap[s.id] = g ? String(g.score) : '';
        });
        setGrades(gMap);
    };

    // ═══ SAVE GRADES ═══
    const saveGrades = async () => {
        if (!selEval) return;
        setSavingGrades(true);
        try {
            const entries = Object.entries(grades).filter(([_, v]) => v !== '').map(([studentId, score]) => ({
                evaluation_id: selEval.id,
                student_id: studentId,
                score: parseFloat(score),
                graded_by: teacher.id,
            }));
            if (entries.length === 0) { toast.info('Aucune note à sauvegarder'); setSavingGrades(false); return; }

            // Upsert grades
            const { error } = await supabase.from('grades').upsert(entries, { onConflict: 'evaluation_id,student_id' });
            if (error) throw error;
            toast.success(`${entries.length} notes sauvegardées ✅`);
        } catch (e: any) { toast.error(e.message); }
        setSavingGrades(false);
    };

    // ═══ SIGN OUT ═══
    const signOut = async () => {
        await supabase.auth.signOut();
        router.push(`/${orgSlug}/login`);
    };

    const today = new Date().getDay(); // 0=Sun, 1=Mon...
    const todaySlots = mySlots.filter((s: any) => s.day_of_week === (today === 0 ? 7 : today));

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /></div>;
    if (!org || !teacher) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><h1>Non autorisé</h1></div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">
            {/* Top bar */}
            <header className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-600/20 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold truncate max-w-[200px]">Prof. {teacher.first_name} {teacher.last_name}</h1>
                        <p className="text-[10px] text-slate-500">{org.name} • {teacher.speciality || 'Enseignant'}</p>
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

            {/* Main content */}
            <main className="flex-1 overflow-y-auto pb-20">
                <div className="max-w-4xl mx-auto px-4 pt-4">
                    {/* ═══ DASHBOARD ═══ */}
                    {tab === 'dashboard' && (
                        <div className="space-y-4">
                            {/* Stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { l: 'Mes matières', v: mySubjects.length, g: 'from-emerald-600/80 to-green-600/80', i: BookOpen },
                                    { l: 'Mes classes', v: myClasses.length, g: 'from-indigo-600/80 to-blue-600/80', i: Users },
                                    { l: 'Évaluations', v: evaluations.length, g: 'from-amber-600/80 to-orange-600/80', i: ClipboardList },
                                    { l: 'Étudiants', v: students.length, g: 'from-purple-600/80 to-pink-600/80', i: GraduationCap },
                                ].map((s, i) => (
                                    <div key={i} className={`p-4 rounded-xl bg-gradient-to-br ${s.g} relative overflow-hidden`}>
                                        <s.i className="w-8 h-8 text-white/20 absolute -right-1 -bottom-1" />
                                        <div className="text-2xl font-bold">{s.v}</div>
                                        <div className="text-xs text-white/80">{s.l}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Today's schedule */}
                            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-emerald-400" />
                                    Aujourd'hui — {DAYS[(today === 0 ? 6 : today - 1)] || 'Dimanche'}
                                </h3>
                                {todaySlots.length === 0 ? (
                                    <p className="text-sm text-slate-500">Aucun cours aujourd'hui 🎉</p>
                                ) : (
                                    <div className="space-y-2">
                                        {todaySlots.map((s: any) => (
                                            <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                                                <div className="text-emerald-400 font-mono text-sm font-bold w-24">{s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}</div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">{s.subjects?.name}</p>
                                                    <p className="text-[10px] text-slate-500">{s.classrooms?.name} {s.room ? `• ${s.room}` : ''}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Recent evaluations */}
                            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                                <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-amber-400" /> Évaluations récentes</h3>
                                {evaluations.slice(0, 5).map((ev: any) => (
                                    <div key={ev.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 cursor-pointer" onClick={() => { setTab('grades'); loadGrades(ev); }}>
                                        <div>
                                            <p className="text-sm font-medium">{ev.title}</p>
                                            <p className="text-[10px] text-slate-500">{ev.subjects?.name} • {ev.classrooms?.name} • /{ev.max_score}</p>
                                        </div>
                                        <span className="text-[10px] px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-300">{ev.type}</span>
                                    </div>
                                ))}
                                {evaluations.length === 0 && <p className="text-sm text-slate-500">Aucune évaluation</p>}
                            </div>

                            {/* Quick links */}
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => router.push(`/${orgSlug}/library`)} className="p-4 rounded-xl bg-emerald-600/10 border border-emerald-600/20 text-left hover:bg-emerald-600/15 transition">
                                    <BookOpen className="w-5 h-5 text-emerald-400 mb-2" />
                                    <p className="font-medium text-sm">Bibliothèque</p>
                                    <p className="text-[10px] text-slate-500">Documents et ressources</p>
                                </button>
                                <button onClick={() => router.push(`/${orgSlug}/messages`)} className="p-4 rounded-xl bg-indigo-600/10 border border-indigo-600/20 text-left hover:bg-indigo-600/15 transition">
                                    <MessageSquare className="w-5 h-5 text-indigo-400 mb-2" />
                                    <p className="font-medium text-sm">Messages</p>
                                    <p className="text-[10px] text-slate-500">Communiquer</p>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ═══ TIMETABLE ═══ */}
                    {tab === 'timetable' && (
                        <div className="space-y-4">
                            <h2 className="font-bold text-lg">📅 Mon emploi du temps</h2>
                            {DAYS.map((day, di) => {
                                const slots = mySlots.filter((s: any) => s.day_of_week === di + 1);
                                const isToday = (today === 0 ? 7 : today) === di + 1;
                                return (
                                    <div key={di} className={`p-4 rounded-xl border ${isToday ? 'bg-emerald-600/5 border-emerald-600/20' : 'bg-white/[0.02] border-white/5'}`}>
                                        <h3 className={`font-medium text-sm mb-2 ${isToday ? 'text-emerald-400' : 'text-slate-400'}`}>
                                            {day} {isToday && '• Aujourd\'hui'}
                                        </h3>
                                        {slots.length === 0 ? (
                                            <p className="text-xs text-slate-600">Pas de cours</p>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {slots.map((s: any) => (
                                                    <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5">
                                                        <span className="text-emerald-400 font-mono text-xs font-bold w-20">{s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)}</span>
                                                        <span className="text-sm">{s.subjects?.name}</span>
                                                        <span className="text-xs text-slate-500 ml-auto">{s.classrooms?.name} {s.room ? `• ${s.room}` : ''}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ═══ MES CLASSES ═══ */}
                    {tab === 'classes' && (
                        <div className="space-y-4">
                            <h2 className="font-bold text-lg">🏫 Mes classes & matières</h2>
                            {myClasses.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>Aucune classe assignée. Contactez l'administration.</p>
                                </div>
                            ) : myClasses.map((cls: any) => {
                                const clsSubjects = mySubjects.filter((s: any) => s.classroom_id === cls.id);
                                const clsStudents = students.filter((s: any) => s.classroom_id === cls.id);
                                return (
                                    <div key={cls.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center"><Users className="w-5 h-5 text-indigo-400" /></div>
                                                <div>
                                                    <h3 className="font-semibold">{cls.name}</h3>
                                                    <p className="text-[10px] text-slate-500">{clsStudents.length} étudiants • {clsSubjects.length} matière(s)</p>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Subjects */}
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {clsSubjects.map((s: any) => (
                                                <span key={s.id} className="text-xs px-3 py-1 rounded-lg bg-emerald-600/10 text-emerald-300 border border-emerald-600/20">📘 {s.name} (coef. {s.coefficient})</span>
                                            ))}
                                        </div>
                                        {/* Student list */}
                                        <div className="space-y-1">
                                            {clsStudents.slice(0, 10).map((s: any) => (
                                                <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 text-sm">
                                                    <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center text-[10px] font-bold text-blue-400">{s.first_name?.[0]}{s.last_name?.[0]}</div>
                                                    <span>{s.first_name} {s.last_name}</span>
                                                    <span className="text-[10px] text-slate-500 ml-auto">{s.matricule || '—'}</span>
                                                </div>
                                            ))}
                                            {clsStudents.length > 10 && <p className="text-xs text-slate-500 text-center">+{clsStudents.length - 10} autres étudiants</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ═══ GRADES ═══ */}
                    {tab === 'grades' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="font-bold text-lg">📝 Saisie des notes</h2>
                                <Button size="sm" className="bg-indigo-600" onClick={() => setShowNewEval(!showNewEval)}>
                                    <PenSquare className="w-4 h-4 mr-1" /> Nouvelle évaluation
                                </Button>
                            </div>

                            {/* New evaluation form */}
                            {showNewEval && (
                                <div className="p-4 rounded-xl bg-indigo-600/5 border border-indigo-500/20 space-y-3">
                                    <h3 className="font-bold text-sm text-indigo-300">➕ Créer une évaluation</h3>
                                    <div className="grid sm:grid-cols-3 gap-3">
                                        <div><Label className="text-slate-400 text-xs">Titre</Label><Input value={newEvTitle} onChange={e => setNewEvTitle(e.target.value)} placeholder="Devoir n°1" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                                        <div><Label className="text-slate-400 text-xs">Type</Label>
                                            <select value={newEvType} onChange={e => setNewEvType(e.target.value)} className="w-full h-9 rounded-lg bg-white/5 border border-white/10 text-white px-3 text-sm">
                                                {['devoir', 'examen', 'tp', 'oral', 'projet'].map(t => <option key={t} value={t} className="bg-slate-900">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                            </select>
                                        </div>
                                        <div><Label className="text-slate-400 text-xs">Matière</Label>
                                            <select value={newEvSub} onChange={e => setNewEvSub(e.target.value)} className="w-full h-9 rounded-lg bg-white/5 border border-white/10 text-white px-3 text-sm">
                                                <option value="" className="bg-slate-900">Choisir...</option>
                                                {mySubjects.map((s: any) => <option key={s.id} value={s.id} className="bg-slate-900">{s.name} ({s.classrooms?.name})</option>)}
                                            </select>
                                        </div>
                                        <div><Label className="text-slate-400 text-xs">Date</Label><Input type="date" value={newEvDate} onChange={e => setNewEvDate(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                                        <div><Label className="text-slate-400 text-xs">Note max</Label><Input type="number" value={newEvMax} onChange={e => setNewEvMax(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" className="bg-indigo-600" onClick={createEval}>Créer</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setShowNewEval(false)}>Annuler</Button>
                                    </div>
                                </div>
                            )}

                            {/* Evaluation selector */}
                            {!selEval ? (
                                <div className="space-y-2">
                                    {evaluations.length === 0 ? (
                                        <div className="text-center py-12 text-slate-500"><ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Créez votre première évaluation</p></div>
                                    ) : evaluations.map((ev: any) => (
                                        <button key={ev.id} onClick={() => loadGrades(ev)}
                                            className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/5 transition text-left">
                                            <div>
                                                <p className="font-medium text-sm">{ev.title}</p>
                                                <p className="text-[10px] text-slate-500">{ev.subjects?.name} • {ev.classrooms?.name} • /{ev.max_score} {ev.date ? `• ${ev.date}` : ''}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-300">{ev.type}</span>
                                                <PenSquare className="w-4 h-4 text-slate-500" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                /* Grade entry form */
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-600/10 border border-indigo-500/20">
                                        <div>
                                            <p className="font-bold text-sm">{selEval.title}</p>
                                            <p className="text-[10px] text-slate-400">{selEval.subjects?.name} • {selEval.classrooms?.name} • /{selEval.max_score}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" className="bg-emerald-600 h-8" onClick={saveGrades} disabled={savingGrades}>
                                                {savingGrades ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}Sauvegarder
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-8" onClick={() => setSelEval(null)}><X className="w-4 h-4" /></Button>
                                        </div>
                                    </div>

                                    {/* Grade table */}
                                    <div className="rounded-xl bg-white/[0.02] border border-white/10 overflow-hidden">
                                        <div className="grid grid-cols-[1fr_80px] px-4 py-2 bg-white/5 text-xs text-slate-400 font-medium">
                                            <span>Étudiant</span><span className="text-center">Note /{selEval.max_score}</span>
                                        </div>
                                        {students.filter((s: any) => s.classroom_id === selEval.classroom_id).map((s: any) => (
                                            <div key={s.id} className="grid grid-cols-[1fr_80px] items-center px-4 py-2 border-t border-white/5 hover:bg-white/[0.02]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center text-[10px] font-bold text-blue-400">{s.first_name?.[0]}{s.last_name?.[0]}</div>
                                                    <div>
                                                        <span className="text-sm">{s.first_name} {s.last_name}</span>
                                                        <span className="text-[9px] text-slate-600 ml-2">{s.matricule || ''}</span>
                                                    </div>
                                                </div>
                                                <Input type="number" min="0" max={selEval.max_score} step="0.25"
                                                    value={grades[s.id] || ''} onChange={e => setGrades(g => ({ ...g, [s.id]: e.target.value }))}
                                                    className="bg-white/5 border-white/10 text-white h-8 text-center rounded-lg text-sm" placeholder="—" />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Quick stats */}
                                    {Object.values(grades).some(v => v !== '') && (() => {
                                        const vals = Object.values(grades).filter(v => v !== '').map(Number);
                                        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
                                        const min = Math.min(...vals);
                                        const max = Math.max(...vals);
                                        return (
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="p-3 rounded-xl bg-blue-600/10 text-center"><span className="text-xs text-blue-300">Moyenne</span><p className="text-lg font-bold text-blue-400">{avg.toFixed(2)}</p></div>
                                                <div className="p-3 rounded-xl bg-red-600/10 text-center"><span className="text-xs text-red-300">Min</span><p className="text-lg font-bold text-red-400">{min.toFixed(2)}</p></div>
                                                <div className="p-3 rounded-xl bg-emerald-600/10 text-center"><span className="text-xs text-emerald-300">Max</span><p className="text-lg font-bold text-emerald-400">{max.toFixed(2)}</p></div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ PROFILE ═══ */}
                    {tab === 'profile' && (
                        <div className="space-y-4 max-w-md mx-auto">
                            <div className="text-center">
                                <div className="w-20 h-20 rounded-full bg-emerald-600/20 flex items-center justify-center mx-auto mb-3">
                                    <span className="text-2xl font-bold text-emerald-400">{teacher.first_name?.[0]}{teacher.last_name?.[0]}</span>
                                </div>
                                <h2 className="text-xl font-bold">{teacher.first_name} {teacher.last_name}</h2>
                                <p className="text-sm text-emerald-400">{teacher.speciality || 'Professeur'}</p>
                                <p className="text-xs text-slate-500 mt-1">{org.name}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                                {[
                                    ['📧 Email', teacher.email],
                                    ['📱 Téléphone', teacher.phone],
                                    ['📖 Spécialité', teacher.speciality],
                                    ['🎓 Diplômes', teacher.diplomas],
                                    ['🔑 Code accès', teacher.access_code],
                                ].map(([k, v], i) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400">{k}</span>
                                        <span className="text-white font-medium">{v || '—'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Bottom nav */}
            <nav className="fixed bottom-0 inset-x-0 bg-slate-900/90 backdrop-blur-xl border-t border-white/5 z-30">
                <div className="flex items-center justify-around max-w-lg mx-auto py-2">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${tab === t.id ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                            <t.icon className="w-5 h-5" />
                            <span className="text-[10px]">{t.label}</span>
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
}
