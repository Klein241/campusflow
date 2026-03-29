'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Lock, BookOpen, BarChart3, Calendar, CreditCard, Loader2,
    Award, Clock, FileText, CircleDollarSign, Users,
    CheckCircle2, ChevronRight, Printer,
    Star, Trophy, ShieldCheck, Download, MessageSquare,
    User, Save, Plus, X, ChevronDown, Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════
// MY SPACE VIEW — PIN-protected academic data
// STUDENT: Cursus, Bulletin, EDT, Paiements
// TEACHER: Mes Élèves, Notes, Cursus (programme), EDT
// ═══════════════════════════════════════════════════════

type StudentTab = 'cursus' | 'bulletin' | 'edt' | 'paiements';
type TeacherTab = 'eleves' | 'notes' | 'cursus' | 'edt';
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

interface MySpaceViewProps {
    orgId: string; orgSlug: string; userId: string; userName: string; userRole: string;
    orgName: string; orgLogo?: string; orgPhone?: string; orgEmail?: string; orgCity?: string; orgCountry?: string;
}

export function MySpaceView({ orgId, orgSlug, userId, userName, userRole, orgName, orgLogo, orgPhone, orgEmail, orgCity, orgCountry }: MySpaceViewProps) {
    const isTeacher = userRole === 'teacher';
    const [pinVerified, setPinVerified] = useState(false);
    const [pin, setPin] = useState(['', '', '', '']);
    const [verifying, setVerifying] = useState(false);
    const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

    const [activeStudentTab, setActiveStudentTab] = useState<StudentTab>('cursus');
    const [activeTeacherTab, setActiveTeacherTab] = useState<TeacherTab>('eleves');
    const [loading, setLoading] = useState(true);

    // Shared state
    const [profile, setProfile] = useState<any>(null);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [timetableSlots, setTimetableSlots] = useState<any[]>([]);

    // Student state
    const [classroom, setClassroom] = useState<any>(null);
    const [filiere, setFiliere] = useState<any>(null);
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);

    // Teacher state
    const [teacherSubjects, setTeacherSubjects] = useState<any[]>([]);
    const [teacherClassrooms, setTeacherClassrooms] = useState<any[]>([]);
    const [studentsByClass, setStudentsByClass] = useState<Record<string, any[]>>({});
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [teacherEvals, setTeacherEvals] = useState<any[]>([]);
    const [selectedEval, setSelectedEval] = useState<any>(null);
    const [gradeEntries, setGradeEntries] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [curricula, setCurricula] = useState<any[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [newModuleTitle, setNewModuleTitle] = useState('');
    const [newModuleDesc, setNewModuleDesc] = useState('');

    const printRef = useRef<HTMLDivElement>(null);

    // ═══ PIN ═══
    const handlePinInput = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const digit = value.slice(-1);
        setPin(prev => { const n = [...prev]; n[index] = digit; return n; });
        if (digit && index < 3) pinRefs[index + 1].current?.focus();
    };
    const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) pinRefs[index - 1].current?.focus();
    };
    const verifyPin = async () => {
        const pinStr = pin.join('');
        if (pinStr.length !== 4) return;
        setVerifying(true);
        try {
            const { data: isValid, error } = await supabase.rpc('verify_pin', { p_profile_id: userId, p_role: userRole, p_pin: pinStr });
            if (error) throw error;
            if (isValid) { setPinVerified(true); toast.success('Accès autorisé ✅'); }
            else { toast.error('PIN incorrect'); setPin(['', '', '', '']); setTimeout(() => pinRefs[0].current?.focus(), 100); }
        } catch (e: any) { toast.error(e.message || 'Erreur de vérification'); }
        setVerifying(false);
    };
    useEffect(() => { if (pin.join('').length === 4 && !pinVerified) verifyPin(); }, [pin]);

    // ═══ LOAD DATA ═══
    useEffect(() => {
        if (!pinVerified) return;
        (async () => {
            setLoading(true);
            const table = isTeacher ? 'teacher_profiles' : 'student_profiles';
            const { data: prof } = await supabase.from(table).select('*').eq('id', userId).single();
            setProfile(prof);

            if (isTeacher) {
                // Load teacher's subjects with classroom info
                const { data: subs } = await supabase.from('subjects')
                    .select('*, classrooms:classroom_id(id, name, filiere_id, filieres:filiere_id(nom))')
                    .eq('teacher_id', userId).eq('organization_id', orgId).order('name');
                setTeacherSubjects(subs || []);

                // Extract unique classrooms
                const classMap = new Map<string, any>();
                (subs || []).forEach((s: any) => {
                    if (s.classrooms && !classMap.has(s.classrooms.id)) {
                        classMap.set(s.classrooms.id, s.classrooms);
                    }
                });
                const classes = Array.from(classMap.values());
                setTeacherClassrooms(classes);
                if (classes.length > 0) setSelectedClassId(classes[0].id);

                // Load students for each classroom
                const byClass: Record<string, any[]> = {};
                for (const cls of classes) {
                    const { data: studs } = await supabase.from('student_profiles')
                        .select('*').eq('classroom_id', cls.id).eq('is_active', true).order('last_name');
                    byClass[cls.id] = studs || [];
                }
                setStudentsByClass(byClass);

                // Load evaluations for teacher's subjects
                const subjectIds = (subs || []).map((s: any) => s.id);
                if (subjectIds.length > 0) {
                    const { data: evs } = await supabase.from('evaluations')
                        .select('*, subjects:subject_id(name), classrooms:classroom_id(name)')
                        .in('subject_id', subjectIds).order('created_at', { ascending: false });
                    setTeacherEvals(evs || []);
                }

                // Load curricula
                const { data: currs } = await supabase.from('teacher_curricula')
                    .select('*').eq('teacher_id', userId).order('order_index');
                setCurricula(currs || []);
                if ((subs || []).length > 0) setSelectedSubjectId((subs || [])[0].id);

                // Load timetable
                const classIds = classes.map(c => c.id);
                if (classIds.length > 0) {
                    const { data: slots } = await supabase.from('timetable_slots')
                        .select('*, subjects:subject_id(name), classrooms:classroom_id(name)')
                        .in('classroom_id', classIds).order('start_time');
                    setTimetableSlots(slots || []);
                }
            } else {
                // Student data loading (unchanged)
                if (prof?.classroom_id) {
                    const { data: cls } = await supabase.from('classrooms').select('*, filieres:filiere_id(*)').eq('id', prof.classroom_id).single();
                    setClassroom(cls); if (cls?.filieres) setFiliere(cls.filieres);
                    const { data: subs } = await supabase.from('subjects').select('*, teacher_profiles:teacher_id(first_name, last_name)')
                        .eq('classroom_id', prof.classroom_id).order('name');
                    setSubjects(subs || []);
                    const { data: slots } = await supabase.from('timetable_slots')
                        .select('*, subjects:subject_id(name), classrooms:classroom_id(name)')
                        .eq('classroom_id', prof.classroom_id).order('start_time');
                    setTimetableSlots(slots || []);
                    const { data: evs } = await supabase.from('evaluations').select('*, subjects:subject_id(name)')
                        .eq('classroom_id', prof.classroom_id).order('created_at', { ascending: false });
                    setEvaluations(evs || []);
                    const { data: grs } = await supabase.from('grades')
                        .select('*, evaluations:evaluation_id(title, max_score, type, subject_id, subjects:subject_id(name))')
                        .eq('student_id', userId);
                    setGrades(grs || []);
                }
                const { data: pays } = await supabase.from('school_payments').select('*')
                    .eq('student_id', userId).order('paid_at', { ascending: false });
                setPayments(pays || []);
            }
            setLoading(false);
        })();
    }, [pinVerified, userId, userRole, orgId]);

    // ═══ TEACHER: Load grade entries for evaluation ═══
    const loadGradeEntries = async (ev: any) => {
        setSelectedEval(ev);
        const studs = studentsByClass[ev.classroom_id] || [];
        const { data: existingGrades } = await supabase.from('grades')
            .select('*').eq('evaluation_id', ev.id);
        const entries: Record<string, string> = {};
        studs.forEach((s: any) => {
            const g = (existingGrades || []).find((g: any) => g.student_id === s.id);
            entries[s.id] = g?.score?.toString() || '';
        });
        setGradeEntries(entries);
    };

    // ═══ TEACHER: Save grades ═══
    const saveGrades = async () => {
        if (!selectedEval) return;
        setSaving(true);
        try {
            for (const [studentId, score] of Object.entries(gradeEntries)) {
                if (score === '') continue;
                const { data: existing } = await supabase.from('grades')
                    .select('id').eq('evaluation_id', selectedEval.id).eq('student_id', studentId).single();
                if (existing) {
                    await supabase.from('grades').update({ score: parseFloat(score) }).eq('id', existing.id);
                } else {
                    await supabase.from('grades').insert({
                        evaluation_id: selectedEval.id, student_id: studentId,
                        score: parseFloat(score), organization_id: orgId,
                    });
                }
            }
            toast.success('Notes sauvegardées ✅');
        } catch (e: any) { toast.error(e.message); }
        setSaving(false);
    };

    // ═══ TEACHER: Add curriculum module ═══
    const addModule = async () => {
        if (!newModuleTitle.trim() || !selectedSubjectId) return;
        setSaving(true);
        try {
            const maxOrder = curricula.filter(c => c.subject_id === selectedSubjectId).length;
            const { data, error } = await supabase.from('teacher_curricula').insert({
                organization_id: orgId, teacher_id: userId, subject_id: selectedSubjectId,
                title: newModuleTitle.trim(), description: newModuleDesc.trim(), order_index: maxOrder,
            }).select().single();
            if (error) throw error;
            setCurricula(prev => [...prev, data]);
            setNewModuleTitle(''); setNewModuleDesc('');
            toast.success('Module ajouté ✅');
        } catch (e: any) { toast.error(e.message); }
        setSaving(false);
    };

    // ═══ TEACHER: Toggle module completion ═══
    const toggleModule = async (mod: any) => {
        const done = !mod.is_completed;
        setCurricula(prev => prev.map(c => c.id === mod.id ? { ...c, is_completed: done, completed_at: done ? new Date().toISOString() : null } : c));
        await supabase.from('teacher_curricula').update({ is_completed: done, completed_at: done ? new Date().toISOString() : null }).eq('id', mod.id);
    };

    // ═══ STUDENT COMPUTED ═══
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
        gradesBySubject.filter(gs => gs.count > 0).reduce((sum, gs) => sum + (gs.subject.coefficient || 1), 0) : 0;
    const totalPaid = payments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
    const today = new Date().getDay();

    // ═══ PIN SCREEN ═══
    if (!pinVerified) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4">
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/25">
                        <Lock className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-xl font-black text-white mb-2">Espace sécurisé</h2>
                    <p className="text-sm text-slate-400 mb-8">Entrez votre PIN à 4 chiffres</p>
                    <div className="flex justify-center gap-4 mb-8">
                        {pin.map((digit, i) => (
                            <input key={i} ref={pinRefs[i]} type="password" inputMode="numeric" maxLength={1} value={digit}
                                onChange={e => handlePinInput(i, e.target.value)} onKeyDown={e => handlePinKeyDown(i, e)}
                                className={cn("w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-white/5 text-white outline-none transition-all duration-300",
                                    digit ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20" : "border-white/10 focus:border-indigo-500/50"
                                )} autoFocus={i === 0} />
                        ))}
                    </div>
                    {verifying && <div className="flex items-center justify-center gap-2 text-indigo-400"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Vérification...</span></div>}
                </motion.div>
            </div>
        );
    }

    if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>;

    // ═══════════════════════════════════════════
    // TEACHER VIEW
    // ═══════════════════════════════════════════
    if (isTeacher) {
        const currentStudents = studentsByClass[selectedClassId] || [];
        const currentClassSubjects = teacherSubjects.filter(s => s.classroom_id === selectedClassId);
        const filteredEvals = selectedClassId ? teacherEvals.filter(e => e.classroom_id === selectedClassId) : teacherEvals;
        const filteredCurricula = curricula.filter(c => c.subject_id === selectedSubjectId);
        const completedCount = filteredCurricula.filter(c => c.is_completed).length;
        const progressPct = filteredCurricula.length > 0 ? (completedCount / filteredCurricula.length) * 100 : 0;

        return (
            <div className="space-y-4">
                {/* Teacher tabs */}
                <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/5 overflow-x-auto scrollbar-thin">
                    {[
                        { id: 'eleves' as TeacherTab, label: 'Mes Élèves', icon: Users },
                        { id: 'notes' as TeacherTab, label: 'Notes', icon: BarChart3 },
                        { id: 'cursus' as TeacherTab, label: 'Cursus', icon: BookOpen },
                        { id: 'edt' as TeacherTab, label: 'Horaires', icon: Calendar },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTeacherTab(tab.id)}
                            className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap px-2",
                                activeTeacherTab === tab.id
                                    ? 'bg-gradient-to-r from-indigo-600/20 to-violet-600/20 text-indigo-300 border border-indigo-500/20 shadow-lg shadow-indigo-600/10'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            )}>
                            <tab.icon className="w-3.5 h-3.5" />{tab.label}
                        </button>
                    ))}
                </div>

                {/* Class selector (shared) */}
                {(activeTeacherTab === 'eleves' || activeTeacherTab === 'notes') && teacherClassrooms.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                        {teacherClassrooms.map(cls => (
                            <button key={cls.id} onClick={() => setSelectedClassId(cls.id)}
                                className={cn("px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap",
                                    selectedClassId === cls.id
                                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20'
                                        : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
                                )}>
                                {cls.name} {cls.filieres ? `• ${cls.filieres.nom}` : ''}
                            </button>
                        ))}
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {/* ═══ MES ÉLÈVES ═══ */}
                    {activeTeacherTab === 'eleves' && (
                        <motion.div key="eleves" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-sm text-slate-300">👨‍🎓 Élèves ({currentStudents.length})</h3>
                            </div>
                            {currentStudents.length === 0 ? (
                                <div className="text-center py-12 text-slate-500"><Users className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aucun élève dans cette classe</p></div>
                            ) : currentStudents.map((s: any, i: number) => (
                                <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                                    className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600/30 to-indigo-600/30 flex items-center justify-center text-xs font-bold text-blue-300 shrink-0">
                                        {s.first_name?.[0]}{s.last_name?.[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{s.first_name} {s.last_name}</p>
                                        <p className="text-[10px] text-slate-500">{s.matricule || 'N/A'}</p>
                                    </div>
                                    <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-600/15 border border-teal-500/20 text-teal-300 text-[10px] font-medium hover:border-teal-500/40 transition-all">
                                        <MessageSquare className="w-3 h-3" /> DM
                                    </button>
                                    <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-300 text-[10px] font-medium hover:border-indigo-500/40 transition-all">
                                        <User className="w-3 h-3" /> Profil
                                    </button>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}

                    {/* ═══ NOTES (saisie) ═══ */}
                    {activeTeacherTab === 'notes' && (
                        <motion.div key="notes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                            <h3 className="font-bold text-sm text-slate-300">📝 Saisie des notes</h3>
                            {!selectedEval ? (
                                filteredEvals.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500"><BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aucune évaluation pour cette classe</p><p className="text-xs text-slate-600 mt-1">Créez des évaluations depuis le backoffice admin</p></div>
                                ) : (
                                    <div className="space-y-2">
                                        {filteredEvals.map((ev: any) => (
                                            <button key={ev.id} onClick={() => loadGradeEntries(ev)}
                                                className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/5 transition text-left">
                                                <div><p className="font-medium text-sm">{ev.title}</p><p className="text-[10px] text-slate-500">{ev.subjects?.name} • /{ev.max_score} {ev.date ? `• ${ev.date}` : ''}</p></div>
                                                <span className="text-[10px] px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-300">{ev.type}</span>
                                            </button>
                                        ))}
                                    </div>
                                )
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-600/10 border border-indigo-500/20">
                                        <div><p className="font-bold text-sm">{selectedEval.title}</p><p className="text-[10px] text-slate-400">{selectedEval.subjects?.name} • /{selectedEval.max_score}</p></div>
                                        <div className="flex gap-2">
                                            <Button size="sm" className="bg-emerald-600 h-8" onClick={saveGrades} disabled={saving}>{saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}Sauver</Button>
                                            <Button size="sm" variant="ghost" className="h-8" onClick={() => setSelectedEval(null)}><X className="w-4 h-4" /></Button>
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-white/[0.02] border border-white/10 overflow-hidden">
                                        <div className="grid grid-cols-[1fr_80px] px-4 py-2 bg-white/5 text-xs text-slate-400 font-medium"><span>Étudiant</span><span className="text-center">Note /{selectedEval.max_score}</span></div>
                                        {(studentsByClass[selectedEval.classroom_id] || []).map((s: any) => (
                                            <div key={s.id} className="grid grid-cols-[1fr_80px] items-center px-4 py-2 border-t border-white/5 hover:bg-white/[0.02]">
                                                <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center text-[10px] font-bold text-blue-400">{s.first_name?.[0]}{s.last_name?.[0]}</div><span className="text-sm">{s.first_name} {s.last_name}</span></div>
                                                <Input type="number" min="0" max={selectedEval.max_score} step="0.25" value={gradeEntries[s.id] || ''} onChange={e => setGradeEntries(g => ({ ...g, [s.id]: e.target.value }))} className="bg-white/5 border-white/10 text-white h-8 text-center rounded-lg text-sm" placeholder="—" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ═══ CURSUS (programme par matière) ═══ */}
                    {activeTeacherTab === 'cursus' && (
                        <motion.div key="cursus-t" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                            <h3 className="font-bold text-sm text-slate-300">📚 Programme de cours</h3>
                            {/* Subject selector */}
                            {teacherSubjects.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                                    {teacherSubjects.map(sub => (
                                        <button key={sub.id} onClick={() => setSelectedSubjectId(sub.id)}
                                            className={cn("px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap",
                                                selectedSubjectId === sub.id ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20' : 'bg-white/5 text-slate-400 border border-white/5')}>
                                            {sub.name} • {sub.classrooms?.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {/* Progress */}
                            {filteredCurricula.length > 0 && (
                                <Card className="bg-gradient-to-br from-violet-500/10 to-indigo-500/5 border-violet-500/20 backdrop-blur-sm">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-2"><span className="text-xs text-slate-400">Progression</span><span className="text-sm font-bold text-violet-300">{completedCount}/{filteredCurricula.length}</span></div>
                                        <Progress value={progressPct} className="h-2" />
                                    </CardContent>
                                </Card>
                            )}
                            {/* Module list */}
                            {filteredCurricula.map((mod, i) => (
                                <motion.div key={mod.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                                    className={cn("flex items-start gap-3 p-3 rounded-xl border transition-all",
                                        mod.is_completed ? 'bg-emerald-600/5 border-emerald-500/15' : 'bg-white/[0.03] border-white/[0.06]')}>
                                    <button onClick={() => toggleModule(mod)} className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
                                        mod.is_completed ? 'bg-emerald-600 border-emerald-600' : 'border-white/20 hover:border-violet-500')}>
                                        {mod.is_completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <p className={cn("text-sm font-medium", mod.is_completed && "line-through text-slate-500")}>{mod.title}</p>
                                        {mod.description && <p className="text-xs text-slate-500 mt-0.5">{mod.description}</p>}
                                        <p className="text-[10px] text-slate-600 mt-1">Module {i + 1}</p>
                                    </div>
                                </motion.div>
                            ))}
                            {/* Add module */}
                            <div className="p-4 rounded-xl bg-white/[0.03] border border-dashed border-white/10 space-y-2">
                                <p className="text-xs font-medium text-slate-400">➕ Ajouter un module</p>
                                <Input value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)} placeholder="Titre du chapitre..." className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" />
                                <Input value={newModuleDesc} onChange={e => setNewModuleDesc(e.target.value)} placeholder="Description (optionnel)..." className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" />
                                <Button size="sm" onClick={addModule} disabled={saving || !newModuleTitle.trim()} className="bg-violet-600 text-xs">
                                    {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}Ajouter
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* ═══ EDT (teacher) ═══ */}
                    {activeTeacherTab === 'edt' && (
                        <motion.div key="edt-t" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                            <h3 className="font-bold text-sm text-slate-300">📅 Mon emploi du temps</h3>
                            {DAYS.map((day, di) => {
                                const slots = timetableSlots.filter((s: any) => s.day_of_week === di + 1);
                                const isToday = (today === 0 ? 7 : today) === di + 1;
                                return (
                                    <Card key={di} className={cn("backdrop-blur-sm overflow-hidden", isToday ? "bg-gradient-to-br from-indigo-500/10 to-violet-500/5 border-indigo-500/20" : "bg-card/50 border-white/5")}>
                                        <CardContent className="p-4">
                                            <h3 className={cn("font-bold text-sm mb-2", isToday ? "text-indigo-400" : "text-slate-400")}>
                                                {day} {isToday && <Badge className="ml-2 bg-indigo-500/20 text-indigo-400 border-none text-[9px]">Aujourd&apos;hui</Badge>}
                                            </h3>
                                            {slots.length === 0 ? <p className="text-xs text-slate-600">Pas de cours</p> : (
                                                <div className="space-y-1.5">{slots.map((s: any) => (
                                                    <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5">
                                                        <span className="text-indigo-400 font-mono text-xs font-bold w-20">{s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)}</span>
                                                        <span className="text-sm flex-1">{s.subjects?.name}</span>
                                                        <span className="text-xs text-slate-500">{s.classrooms?.name}</span>
                                                        {s.room && <span className="text-xs text-slate-600">{s.room}</span>}
                                                    </div>
                                                ))}</div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // ═══════════════════════════════════════════
    // STUDENT VIEW (kept mostly unchanged)
    // ═══════════════════════════════════════════
    return (
        <div className="space-y-4">
            <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/5 overflow-x-auto scrollbar-thin">
                {[
                    { id: 'cursus' as StudentTab, label: 'Cursus', icon: BookOpen },
                    { id: 'bulletin' as StudentTab, label: 'Bulletin', icon: BarChart3 },
                    { id: 'edt' as StudentTab, label: 'Horaires', icon: Calendar },
                    { id: 'paiements' as StudentTab, label: 'Paiements', icon: CreditCard },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveStudentTab(tab.id)}
                        className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap px-2",
                            activeStudentTab === tab.id
                                ? 'bg-gradient-to-r from-indigo-600/20 to-violet-600/20 text-indigo-300 border border-indigo-500/20 shadow-lg shadow-indigo-600/10'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        )}>
                        <tab.icon className="w-3.5 h-3.5" />{tab.label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {/* CURSUS */}
                {activeStudentTab === 'cursus' && (
                    <motion.div key="cursus" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                        <Card className="bg-gradient-to-br from-indigo-500/10 to-violet-500/5 border-indigo-500/20 backdrop-blur-sm overflow-hidden">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20"><Award className="w-6 h-6 text-white" /></div>
                                    <div><h2 className="text-lg font-black">{classroom?.name || '—'}</h2>{filiere && <Badge className="mt-1 bg-gradient-to-r from-indigo-600 to-violet-600 border-none text-white text-[10px]">{filiere.nom} • {filiere.duree_mois} mois</Badge>}</div>
                                </div>
                            </CardContent>
                        </Card>
                        <div className="grid grid-cols-3 gap-3">
                            {[{ l: 'Moyenne', v: overallAvg > 0 ? overallAvg.toFixed(1) : '—', unit: '/20', icon: BarChart3, color: 'indigo' },
                            { l: 'Matières', v: subjects.length, unit: '', icon: BookOpen, color: 'teal' },
                            { l: 'Total payé', v: fmt(totalPaid), unit: '', icon: CreditCard, color: 'emerald' }].map((s, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                                    <Card className={cn("bg-card/50 backdrop-blur-sm shadow-sm", s.color === 'indigo' ? 'border-indigo-500/20' : s.color === 'teal' ? 'border-teal-500/20' : 'border-emerald-500/20')}>
                                        <CardContent className="flex flex-col items-center justify-center p-4">
                                            <s.icon className={cn("h-5 w-5 mb-2", s.color === 'indigo' ? 'text-indigo-500' : s.color === 'teal' ? 'text-teal-500' : 'text-emerald-500')} />
                                            <span className="text-lg font-black">{s.v}<span className="text-xs font-normal text-muted-foreground">{s.unit}</span></span>
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">{s.l}</span>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                        <h3 className="font-bold text-sm text-slate-300">📚 Matières ({subjects.length})</h3>
                        <div className="space-y-2">{subjects.map((sub: any, i: number) => (
                            <motion.div key={sub.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                                <Card className="bg-white/[0.03] border-white/[0.06] hover:border-white/10 transition-all">
                                    <CardContent className="p-3 flex items-center justify-between">
                                        <div><p className="text-sm font-medium">{sub.name}</p><p className="text-[10px] text-slate-500">Coef. {sub.coefficient || 1}{sub.teacher_profiles ? ` • ${sub.teacher_profiles.first_name} ${sub.teacher_profiles.last_name}` : ''}</p></div>
                                        <span className={cn("text-sm font-bold", gradesBySubject.find(gs => gs.subject.id === sub.id)?.count ? (gradesBySubject.find(gs => gs.subject.id === sub.id)!.average >= 10 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-600')}>
                                            {gradesBySubject.find(gs => gs.subject.id === sub.id)?.count ? gradesBySubject.find(gs => gs.subject.id === sub.id)!.average.toFixed(1) + '/20' : '—'}
                                        </span>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}</div>
                    </motion.div>
                )}

                {/* BULLETIN */}
                {activeStudentTab === 'bulletin' && (
                    <motion.div key="bulletin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                        <h3 className="font-bold text-sm text-slate-300">📊 Bulletin de notes</h3>
                        <Card className={cn("backdrop-blur-sm overflow-hidden text-center", overallAvg >= 10 ? "bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20" : overallAvg > 0 ? "bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/20" : "bg-card/50 border-white/10")}>
                            <CardContent className="p-5">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Moyenne générale</p>
                                <p className={cn("text-4xl font-black mt-1", overallAvg >= 10 ? "text-emerald-400" : overallAvg > 0 ? "text-red-400" : "text-slate-500")}>{overallAvg > 0 ? overallAvg.toFixed(2) : '—'}</p>
                            </CardContent>
                        </Card>
                        {gradesBySubject.map((gs, i) => (
                            <motion.div key={gs.subject.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                                <Card className="bg-card/50 backdrop-blur-sm border-white/10 overflow-hidden">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div><h3 className="font-bold text-sm">{gs.subject.name}</h3><p className="text-[10px] text-muted-foreground">Coef. {gs.subject.coefficient || 1}</p></div>
                                            <span className={cn("text-lg font-black", gs.count > 0 ? (gs.average >= 10 ? "text-emerald-400" : "text-red-400") : "text-slate-600")}>{gs.count > 0 ? gs.average.toFixed(1) : '—'}</span>
                                        </div>
                                        {gs.count > 0 && <Progress value={(gs.average / 20) * 100} className="h-2 mb-2" />}
                                        {gs.grades.map((g: any) => (
                                            <div key={g.id} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-white/5">
                                                <span className="text-slate-400">{g.evaluations?.title} ({g.evaluations?.type})</span>
                                                <span className={cn("font-bold", g.score >= (g.evaluations?.max_score || 20) / 2 ? "text-emerald-400" : "text-red-400")}>{g.score}/{g.evaluations?.max_score || 20}</span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {/* EDT */}
                {activeStudentTab === 'edt' && (
                    <motion.div key="edt" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                        <h3 className="font-bold text-sm text-slate-300">📅 Emploi du temps — {classroom?.name}</h3>
                        {DAYS.map((day, di) => {
                            const slots = timetableSlots.filter((s: any) => s.day_of_week === di + 1);
                            const isToday = (today === 0 ? 7 : today) === di + 1;
                            return (
                                <Card key={di} className={cn("backdrop-blur-sm overflow-hidden", isToday ? "bg-gradient-to-br from-indigo-500/10 to-violet-500/5 border-indigo-500/20" : "bg-card/50 border-white/5")}>
                                    <CardContent className="p-4">
                                        <h3 className={cn("font-bold text-sm mb-2", isToday ? "text-indigo-400" : "text-slate-400")}>{day} {isToday && <Badge className="ml-2 bg-indigo-500/20 text-indigo-400 border-none text-[9px]">Aujourd&apos;hui</Badge>}</h3>
                                        {slots.length === 0 ? <p className="text-xs text-slate-600">Pas de cours</p> : (
                                            <div className="space-y-1.5">{slots.map((s: any) => (
                                                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5">
                                                    <span className="text-indigo-400 font-mono text-xs font-bold w-20">{s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)}</span>
                                                    <span className="text-sm flex-1">{s.subjects?.name}</span>
                                                    {s.room && <span className="text-xs text-slate-500">{s.room}</span>}
                                                </div>
                                            ))}</div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </motion.div>
                )}

                {/* PAIEMENTS */}
                {activeStudentTab === 'paiements' && (
                    <motion.div key="paiements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                        <h3 className="font-bold text-sm text-slate-300">💰 Historique des paiements</h3>
                        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20 backdrop-blur-sm overflow-hidden text-center">
                            <CardContent className="p-5">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total payé</p>
                                <p className="text-3xl font-black text-emerald-400 mt-1">{fmt(totalPaid)} XAF</p>
                                <p className="text-sm text-muted-foreground mt-1">{payments.length} paiement(s)</p>
                            </CardContent>
                        </Card>
                        {payments.length > 0 ? payments.map((p: any, i: number) => (
                            <motion.div key={p.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                                <Card className="bg-card/50 backdrop-blur-sm border-white/10 overflow-hidden">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", p.payment_method === 'momo' ? 'bg-yellow-500/20' : p.payment_method === 'orange_money' ? 'bg-orange-500/20' : 'bg-emerald-500/20')}>
                                                <CircleDollarSign className={cn("w-5 h-5", p.payment_method === 'momo' ? 'text-yellow-400' : p.payment_method === 'orange_money' ? 'text-orange-400' : 'text-emerald-400')} />
                                            </div>
                                            <div><p className="text-sm font-medium">{p.description || 'Scolarité'}</p><p className="text-[10px] text-muted-foreground">{p.payment_method === 'momo' ? 'MTN MoMo' : p.payment_method === 'orange_money' ? 'Orange Money' : 'Espèces'} • {new Date(p.paid_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
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
            </AnimatePresence>
        </div>
    );
}
