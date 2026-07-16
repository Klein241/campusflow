'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Lock, BookOpen, BarChart3, Calendar, CreditCard, Loader2,
    Award, TrendingUp, Clock, FileText, CircleDollarSign,
    CheckCircle2, AlertCircle, ChevronRight, Printer, ArrowLeft,
    Star, Trophy, ShieldCheck, Download, Users, MessageSquare,
    User, PenSquare, Save, X, ClipboardList, LockKeyhole, Unlock,
    ChevronDown, ChevronUp, GraduationCap, Plus, Trash2, Eye, EyeOff, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/compress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { generateBulletinPDF, type BulletinData, computeSubjectAverage, computeOverallAverage } from '@/lib/bulletin-pdf';

// ═══════════════════════════════════════════════════════
// MY SPACE VIEW — PIN-protected, role-aware
// STUDENT: Cursus, Bulletin, EDT, Paiements
// TEACHER: Notes, Cursus, EDT, Mes Élèves
// ═══════════════════════════════════════════════════════

type StudentTab = 'cursus' | 'bulletin' | 'edt' | 'paiements';
type TeacherTab = 'notes' | 'cursus' | 'edt' | 'mes-eleves';
type MySpaceTab = StudentTab | TeacherTab;
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

interface MySpaceViewProps {
    orgId: string;
    orgSlug: string;
    userId: string;
    userName: string;
    userRole: string;
    orgName: string;
    orgLogo?: string;
    orgPhone?: string;
    orgEmail?: string;
    orgCity?: string;
    orgCountry?: string;
    onStartDM?: (targetId: string, targetName: string) => void;
    orgBulletinTemplate?: number;
    orgCurrentTerm?: string;
}

export function MySpaceView({ orgId, orgSlug, userId, userName, userRole, orgName, orgLogo, orgPhone, orgEmail, orgCity, orgCountry, onStartDM, orgBulletinTemplate, orgCurrentTerm }: MySpaceViewProps) {
    const isTeacher = userRole === 'teacher';

    const [pinVerified, setPinVerified] = useState(false);
    const [pin, setPin] = useState(['', '', '', '']);
    const [verifying, setVerifying] = useState(false);
    const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

    const [activeTab, setActiveTab] = useState<MySpaceTab>(isTeacher ? 'notes' : 'cursus');
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [classroom, setClassroom] = useState<any>(null);
    const [filiere, setFiliere] = useState<any>(null);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [timetableSlots, setTimetableSlots] = useState<any[]>([]);
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);

    // Teacher-specific state
    const [mySubjects, setMySubjects] = useState<any[]>([]);
    const [myClasses, setMyClasses] = useState<any[]>([]);
    const [myStudents, setMyStudents] = useState<any[]>([]);
    const [myFilieres, setMyFilieres] = useState<any[]>([]);
    const [selEval, setSelEval] = useState<any>(null);
    const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
    const [savingGrades, setSavingGrades] = useState(false);
    const [showNewEval, setShowNewEval] = useState(false);
    const [newEvTitle, setNewEvTitle] = useState('');
    const [newEvType, setNewEvType] = useState('devoir');
    const [newEvSub, setNewEvSub] = useState('');
    const [newEvMax, setNewEvMax] = useState('20');
    const [selectedClass, setSelectedClass] = useState<string | null>(null);

    // Teacher cursus state
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
    const [editingChapter, setEditingChapter] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [uploadingChapterFile, setUploadingChapterFile] = useState(false);
    const [allClasses, setAllClasses] = useState<any[]>([]);

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
            const { data: isValid, error } = await supabase.rpc('verify_pin', {
                p_profile_id: userId, p_role: userRole, p_pin: pinStr,
            });
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
            if (isTeacher) {
                // Teacher data
                const { data: t } = await supabase.from('teacher_profiles').select('*').eq('id', userId).single();
                setProfile(t);

                const { data: subs } = await supabase.from('subjects').select('*, classrooms:classroom_id(id,name,filiere_id)')
                    .eq('organization_id', orgId).eq('teacher_id', userId);
                setMySubjects(subs || []);

                const classIds = [...new Set((subs || []).map((s: any) => s.classroom_id).filter(Boolean))];
                if (classIds.length > 0) {
                    const { data: cls } = await supabase.from('classrooms').select('*, filieres:filiere_id(*)').in('id', classIds);
                    setMyClasses(cls || []);
                    const filIds = [...new Set((cls || []).map((c: any) => c.filiere_id).filter(Boolean))];
                    if (filIds.length > 0) {
                        const { data: fils } = await supabase.from('filieres').select('*').in('id', filIds);
                        setMyFilieres(fils || []);
                    }
                    const { data: studs } = await supabase.from('student_profiles')
                        .select('*, classrooms:classroom_id(name, filiere_id)').eq('organization_id', orgId).in('classroom_id', classIds).eq('is_active', true);
                    setMyStudents(studs || []);
                    if (!selectedClass && classIds.length > 0) setSelectedClass(classIds[0]);
                }

                // Load all classes for subject creation
                const { data: allCls } = await supabase.from('classrooms').select('id, name').eq('organization_id', orgId).order('name');
                setAllClasses(allCls || []);

                const subjectIds = (subs || []).map((s: any) => s.id);
                if (subjectIds.length > 0) {
                    const { data: slots } = await supabase.from('timetable_slots')
                        .select('*, classrooms:classroom_id(name), subjects:subject_id(name)')
                        .in('subject_id', subjectIds).order('start_time');
                    setTimetableSlots(slots || []);
                    const { data: evs } = await supabase.from('evaluations')
                        .select('*, classrooms:classroom_id(name), subjects:subject_id(name)')
                        .in('subject_id', subjectIds).order('created_at', { ascending: false });
                    setEvaluations(evs || []);
                    // Load chapters
                    const { data: chaps } = await supabase.from('chapters').select('*').in('subject_id', subjectIds).order('position');
                    setChapters(chaps || []);
                }
            } else {
                // Student data
                const { data: s } = await supabase.from('student_profiles').select('*').eq('id', userId).single();
                setProfile(s);
                if (s?.classroom_id) {
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
                    const { data: evs } = await supabase.from('evaluations').select('*, subjects:subject_id(name)')
                        .eq('classroom_id', s.classroom_id).order('created_at', { ascending: false });
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
    }, [pinVerified, userId, userRole]);

    // ═══ TEACHER: Create eval ═══
    const createEval = async () => {
        if (!newEvTitle || !newEvSub) { toast.error('Remplissez titre et matière'); return; }
        const sub = mySubjects.find((s: any) => s.id === newEvSub);
        const { error } = await supabase.from('evaluations').insert({
            organization_id: orgId, title: newEvTitle, type: newEvType,
            classroom_id: sub?.classroom_id, subject_id: newEvSub, max_score: parseFloat(newEvMax) || 20,
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

    // ═══ TEACHER: Load & Save grades ═══
    const loadGrades = async (ev: any) => {
        setSelEval(ev);
        const clsStudents = myStudents.filter((s: any) => s.classroom_id === ev.classroom_id);
        const { data: existing } = await supabase.from('grades').select('student_id, score').eq('evaluation_id', ev.id);
        const gMap: Record<string, string> = {};
        clsStudents.forEach((s: any) => {
            const g = (existing || []).find((g: any) => g.student_id === s.id);
            gMap[s.id] = g ? String(g.score) : '';
        });
        setGradeInputs(gMap);
    };

    const saveGrades = async () => {
        if (!selEval) return;
        setSavingGrades(true);
        try {
            const entries = Object.entries(gradeInputs).filter(([_, v]) => v !== '').map(([studentId, score]) => ({
                evaluation_id: selEval.id, student_id: studentId, score: parseFloat(score), graded_by: userId,
            }));
            if (entries.length === 0) { toast.info('Aucune note'); setSavingGrades(false); return; }
            const { error } = await supabase.from('grades').upsert(entries, { onConflict: 'evaluation_id,student_id' });
            if (error) throw error;
            toast.success(`${entries.length} notes sauvegardées ✅`);
        } catch (e: any) { toast.error(e.message); }
        setSavingGrades(false);
    };

    // ═══ STUDENT: Computed grades ═══
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

    // ═══ PDF helpers ═══
    const printTimetable = () => {
        const pw = window.open('', '_blank');
        if (!pw) { toast.error('Activez les pop-ups'); return; }
        let rows = '';
        DAYS.forEach((day, di) => {
            const slots = timetableSlots.filter((s: any) => s.day_of_week === di + 1);
            if (slots.length === 0) return;
            rows += `<tr style="background:#f0fdfa"><td colspan="3" style="font-weight:bold;color:#0d9488;padding:10px">${day}</td></tr>`;
            slots.forEach((s: any) => { rows += `<tr><td>${s.start_time?.slice(0, 5)} - ${s.end_time?.slice(0, 5)}</td><td>${s.subjects?.name || '—'}</td><td>${s.room || '—'}</td></tr>`; });
        });
        pw.document.write(`<!DOCTYPE html><html><head><title>EDT — ${orgName}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;color:#1a1a1a;padding:20mm;font-size:11pt}table{width:100%;border-collapse:collapse;margin:12px 0}th{background:#0d9488;color:white;padding:10px 8px;text-align:left}td{padding:8px;border-bottom:1px solid #e2e8f0}@media print{body{padding:15mm}}</style></head><body><h1 style="color:#0d9488;margin-bottom:20px">${orgName} — Emploi du temps</h1><table><thead><tr><th>Horaire</th><th>Matière</th><th>Salle</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
        pw.document.close();
        setTimeout(() => pw.print(), 500);
    };

    // ═══ STUDENT: Export Bulletin PDF ═══
    const exportBulletinPDF = () => {
        if (!profile || !classroom) { toast.error('Données de profil manquantes'); return; }
        const bulletinSubjects = gradesBySubject.map(gs => ({
            name: gs.subject.name,
            coefficient: gs.subject.coefficient || 1,
            teacher_name: gs.subject.teacher_profiles ? `${gs.subject.teacher_profiles.first_name} ${gs.subject.teacher_profiles.last_name}` : undefined,
            grades: gs.grades.map((g: any) => ({
                title: g.evaluations?.title || 'Évaluation',
                type: g.evaluations?.type || 'devoir',
                score: g.score,
                max_score: g.evaluations?.max_score || 20,
                weight: g.evaluations?.weight || 1,
                remark: g.teacher_remark,
            })),
            average: gs.average,
        }));
        const data: BulletinData = {
            org: { name: orgName, logo_url: orgLogo, phone: orgPhone, email: orgEmail, city: orgCity, country: orgCountry, current_term: orgCurrentTerm },
            student: { first_name: profile.first_name, last_name: profile.last_name, matricule: profile.matricule, sex: profile.sex, birth_date: profile.birth_date, classroom_name: classroom.name, filiere_name: filiere?.nom },
            subjects: bulletinSubjects,
            overallAverage: overallAvg,
            term: orgCurrentTerm || 'Trimestre 1',
            year: `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`,
        };
        generateBulletinPDF(data, orgBulletinTemplate || 1);
    };

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
                    {verifying && (<div className="flex items-center justify-center gap-2 text-indigo-400"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Vérification...</span></div>)}
                </motion.div>
            </div>
        );
    }

    if (loading) {
        return (<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>);
    }

    // ═══ TAB DEFINITIONS ═══
    const teacherTabs = [
        { id: 'notes' as MySpaceTab, label: 'Notes', icon: ClipboardList },
        { id: 'cursus' as MySpaceTab, label: 'Cursus', icon: BookOpen },
        { id: 'edt' as MySpaceTab, label: 'Horaires', icon: Calendar },
        { id: 'mes-eleves' as MySpaceTab, label: 'Mes Élèves', icon: Users },
    ];
    const studentTabs = [
        { id: 'cursus' as MySpaceTab, label: 'Cursus', icon: BookOpen },
        { id: 'bulletin' as MySpaceTab, label: 'Bulletin', icon: BarChart3 },
        { id: 'edt' as MySpaceTab, label: 'Horaires', icon: Calendar },
        { id: 'paiements' as MySpaceTab, label: 'Paiements', icon: CreditCard },
    ];
    const tabs = isTeacher ? teacherTabs : studentTabs;

    return (
        <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/5 overflow-x-auto scrollbar-thin">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap px-2",
                            activeTab === tab.id
                                ? 'bg-gradient-to-r from-indigo-600/20 to-violet-600/20 text-indigo-300 border border-indigo-500/20 shadow-lg shadow-indigo-600/10'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        )}>
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {/* ═══ TEACHER: NOTES TAB ═══ */}
                {activeTab === 'notes' && isTeacher && (
                    <motion.div key="notes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm text-slate-300">📝 Saisie des notes</h3>
                            <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-violet-600 text-xs rounded-xl" onClick={() => setShowNewEval(!showNewEval)}>
                                <PenSquare className="w-3.5 h-3.5 mr-1" /> Nouvelle éval.
                            </Button>
                        </div>

                        {showNewEval && (
                            <Card className="bg-gradient-to-br from-indigo-500/10 to-violet-500/5 border-indigo-500/20">
                                <CardContent className="p-4 space-y-3">
                                    <h3 className="font-bold text-sm text-indigo-400">➕ Créer une évaluation</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><Label className="text-slate-400 text-xs">Titre</Label><Input value={newEvTitle} onChange={e => setNewEvTitle(e.target.value)} placeholder="Devoir n°1" className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm" /></div>
                                        <div><Label className="text-slate-400 text-xs">Type</Label>
                                            <select value={newEvType} onChange={e => setNewEvType(e.target.value)} className="w-full h-9 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm">
                                                {['devoir', 'examen', 'tp', 'oral', 'projet'].map(t => <option key={t} value={t} className="bg-slate-900">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                            </select></div>
                                        <div><Label className="text-slate-400 text-xs">Matière</Label>
                                            <select value={newEvSub} onChange={e => setNewEvSub(e.target.value)} className="w-full h-9 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm">
                                                <option value="" className="bg-slate-900">Choisir...</option>
                                                {mySubjects.map((s: any) => <option key={s.id} value={s.id} className="bg-slate-900">{s.name} ({s.classrooms?.name})</option>)}
                                            </select></div>
                                        <div><Label className="text-slate-400 text-xs">Note max</Label><Input type="number" value={newEvMax} onChange={e => setNewEvMax(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm" /></div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl" onClick={createEval}>Créer</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setShowNewEval(false)}>Annuler</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {!selEval ? (
                            <div className="space-y-2">
                                {evaluations.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500"><ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="text-sm">Créez votre première évaluation</p></div>
                                ) : evaluations.map((ev: any) => (
                                    <Card key={ev.id} className="bg-card/50 border-white/10 cursor-pointer hover:border-indigo-500/20 transition-all" onClick={() => loadGrades(ev)}>
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-sm">{ev.title}</p>
                                                <p className="text-[10px] text-slate-500">{ev.subjects?.name} • {ev.classrooms?.name} • /{ev.max_score}</p>
                                            </div>
                                            <Badge className="bg-indigo-500/20 text-indigo-400 border-none text-[10px]">{ev.type}</Badge>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <Card className="bg-gradient-to-br from-indigo-500/10 to-violet-500/5 border-indigo-500/20">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-sm">{selEval.title}</p>
                                            <p className="text-[10px] text-slate-400">{selEval.subjects?.name} • {selEval.classrooms?.name} • /{selEval.max_score}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl h-8" onClick={saveGrades} disabled={savingGrades}>
                                                {savingGrades ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}Sauvegarder
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-8" onClick={() => setSelEval(null)}><X className="w-4 h-4" /></Button>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-card/50 border-white/10 overflow-hidden">
                                    <div className="grid grid-cols-[1fr_80px] px-4 py-2 bg-white/5 text-xs text-slate-400 font-medium">
                                        <span>Étudiant</span><span className="text-center">Note /{selEval.max_score}</span>
                                    </div>
                                    {myStudents.filter((s: any) => s.classroom_id === selEval.classroom_id).map((s: any) => (
                                        <div key={s.id} className="grid grid-cols-[1fr_80px] items-center px-4 py-2 border-t border-white/5 hover:bg-white/[0.02]">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400">{s.first_name?.[0]}{s.last_name?.[0]}</div>
                                                <span className="text-sm">{s.first_name} {s.last_name}</span>
                                            </div>
                                            <Input type="number" min="0" max={selEval.max_score} step="0.25" value={gradeInputs[s.id] || ''} onChange={e => setGradeInputs(g => ({ ...g, [s.id]: e.target.value }))}
                                                className="bg-white/5 border-white/10 text-white h-8 text-center rounded-xl text-sm" placeholder="—" />
                                        </div>
                                    ))}
                                </Card>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ═══ TEACHER: MES ÉLÈVES TAB ═══ */}
                {activeTab === 'mes-eleves' && isTeacher && (
                    <motion.div key="mes-eleves" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                        <h3 className="font-bold text-sm text-slate-300">👨‍🎓 Mes élèves ({myStudents.length})</h3>

                        {/* Class filter */}
                        <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/5 overflow-x-auto scrollbar-thin">
                            {myClasses.map((cls: any) => {
                                const count = myStudents.filter((s: any) => s.classroom_id === cls.id).length;
                                return (
                                    <button key={cls.id} onClick={() => setSelectedClass(cls.id)}
                                        className={cn("flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap px-2",
                                            selectedClass === cls.id
                                                ? 'bg-gradient-to-r from-teal-600/20 to-emerald-600/20 text-teal-300 border border-teal-500/20'
                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        )}>
                                        {cls.name} <span className="text-[9px] text-slate-500">({count})</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Filiere info */}
                        {selectedClass && (() => {
                            const cls = myClasses.find((c: any) => c.id === selectedClass);
                            const fil = cls?.filieres;
                            return fil ? (
                                <Badge className="bg-gradient-to-r from-indigo-600 to-violet-600 border-none text-white text-[10px]">
                                    📂 {fil.nom} • {fil.duree_mois} mois
                                </Badge>
                            ) : null;
                        })()}

                        {/* Student list */}
                        {myStudents.filter((s: any) => s.classroom_id === selectedClass).map((s: any, i: number) => (
                            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                                className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all">
                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-600 to-emerald-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                                    {s.first_name?.[0]}{s.last_name?.[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{s.first_name} {s.last_name}</p>
                                    <p className="text-[10px] text-slate-500">{s.matricule || '—'} • {s.classrooms?.name || ''}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition"><User className="w-4 h-4" /></button>
                                    {onStartDM && (
                                        <button onClick={() => onStartDM(s.id, `${s.first_name} ${s.last_name}`)}
                                            className="p-2 rounded-xl bg-gradient-to-r from-teal-600/20 to-emerald-600/20 text-teal-400 hover:text-teal-300 transition">
                                            <MessageSquare className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                        {myStudents.filter((s: any) => s.classroom_id === selectedClass).length === 0 && (
                            <div className="text-center py-12 text-slate-500"><GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="text-sm">Aucun élève dans cette classe</p></div>
                        )}
                    </motion.div>
                )}

                {/* ═══ CURSUS (both roles) ═══ */}
                {activeTab === 'cursus' && (
                    <motion.div key="cursus" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                        {isTeacher ? (
                            /* Teacher cursus: full CRUD */
                            <>
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-sm text-slate-300">📚 Mon Cursus</h3>
                                    <Button size="sm" className="bg-linear-to-r from-indigo-600 to-purple-600 border-none font-bold rounded-xl text-xs" onClick={() => setShowNewSubject(!showNewSubject)}>
                                        <Plus className="w-3 h-3 mr-1" /> Matière
                                    </Button>
                                </div>

                                {/* New Subject Form */}
                                {showNewSubject && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                        <Card className="bg-linear-to-br from-indigo-500/10 to-purple-500/5 border-indigo-500/20 backdrop-blur-sm overflow-hidden">
                                            <CardContent className="p-4 space-y-3">
                                                <h4 className="text-xs font-bold text-indigo-400">➕ Nouvelle matière</h4>
                                                <Input value={newSubName} onChange={e => setNewSubName(e.target.value)} placeholder="Nom de la matière" className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm" />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <Label className="text-[10px] text-slate-400">Coefficient</Label>
                                                        <Input type="number" value={newSubCoef} onChange={e => setNewSubCoef(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm" />
                                                    </div>
                                                    <div>
                                                        <Label className="text-[10px] text-slate-400">Classe</Label>
                                                        <select value={newSubClass} onChange={e => setNewSubClass(e.target.value)} className="w-full h-9 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm">
                                                            <option value="" className="bg-slate-900">Choisir...</option>
                                                            {allClasses.map((c: any) => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" className="bg-linear-to-r from-indigo-600 to-purple-600 font-bold rounded-xl" disabled={savingSub || !newSubName.trim() || !newSubClass}
                                                        onClick={async () => {
                                                            setSavingSub(true);
                                                            const { data: sub, error } = await supabase.from('subjects').insert({ name: newSubName.trim(), coefficient: parseFloat(newSubCoef) || 1, classroom_id: newSubClass, organization_id: orgId, teacher_id: userId }).select('*, classrooms:classroom_id(id,name)').single();
                                                            if (error) { toast.error(error.message); } else { setMySubjects([...mySubjects, sub]); toast.success(`Matière "${sub.name}" créée !`); setNewSubName(''); setNewSubCoef('1'); setNewSubClass(''); setShowNewSubject(false); }
                                                            setSavingSub(false);
                                                        }}>
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
                                    <div className="text-center py-12 text-slate-500"><Layers className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="text-sm">Aucune matière</p><p className="text-xs text-slate-600 mt-1">Créez votre première matière</p></div>
                                ) : mySubjects.map((sub: any) => {
                                    const subChapters = chapters.filter(c => c.subject_id === sub.id).sort((a, b) => a.position - b.position);
                                    const isExpanded = expandedSubject === sub.id;
                                    const publishedCount = subChapters.filter(c => c.status !== 'draft').length;
                                    return (
                                        <Card key={sub.id} className={cn("backdrop-blur-sm overflow-hidden transition-all", isExpanded ? "bg-linear-to-br from-indigo-500/10 to-purple-500/5 border-indigo-500/20" : "bg-card/50 border-white/10 hover:border-indigo-500/20")}>
                                            <CardContent className="p-0">
                                                <div className="p-4 cursor-pointer flex items-center justify-between" onClick={() => setExpandedSubject(isExpanded ? null : sub.id)}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-indigo-500/20 p-2 rounded-xl"><BookOpen className="h-4 w-4 text-indigo-400" /></div>
                                                        <div>
                                                            <p className="text-sm font-bold">{sub.name}</p>
                                                            <p className="text-[10px] text-slate-400">{sub.classrooms?.name} • Coef. {sub.coefficient} • {subChapters.length} ch. • {publishedCount} dispensé(s)</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {subChapters.length > 0 && <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-linear-to-r from-emerald-500 to-teal-400 rounded-full transition-all" style={{ width: `${(publishedCount / subChapters.length) * 100}%` }} /></div>}
                                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                                    </div>
                                                </div>
                                                {isExpanded && (
                                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t border-white/5 px-4 pb-4">
                                                        <div className="space-y-2 mt-3">
                                                            {subChapters.map((ch, ci) => {
                                                                const statusConfig: Record<string, { bg: string; text: string; icon: any; label: string }> = {
                                                                    draft: { bg: 'bg-slate-500/20', text: 'text-slate-400', icon: EyeOff, label: 'Brouillon' },
                                                                    published: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: Eye, label: 'Dispensé' },
                                                                    completed: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: CheckCircle2, label: 'Terminé' },
                                                                };
                                                                const sc = statusConfig[ch.status] || statusConfig.draft;
                                                                return (
                                                                    <div key={ch.id}>
                                                                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ci * 0.05 }}
                                                                            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all group cursor-pointer"
                                                                            onClick={() => { if (editingChapter === ch.id) { setEditingChapter(null); } else { setEditingChapter(ch.id); setEditContent(ch.content || ''); } }}>
                                                                            <span className="text-xs font-mono text-slate-600 w-5 text-center">{ch.position}</span>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-sm font-medium truncate">{ch.title}</p>
                                                                                {ch.description && <p className="text-[10px] text-slate-500 truncate">{ch.description}</p>}
                                                                            </div>
                                                                            <button onClick={(e) => { e.stopPropagation(); const next = ch.status === 'draft' ? 'published' : ch.status === 'published' ? 'completed' : 'draft'; supabase.from('chapters').update({ status: next }).eq('id', ch.id).then(({ error }) => { if (!error) { setChapters(chapters.map(c => c.id === ch.id ? { ...c, status: next } : c)); toast.success(`→ ${next === 'draft' ? 'Brouillon' : next === 'published' ? 'Dispensé' : 'Terminé'}`); } }); }}
                                                                                className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all hover:scale-105", sc.bg, sc.text)}>
                                                                                <sc.icon className="w-3 h-3" />{sc.label}
                                                                            </button>
                                                                            <button onClick={(e) => { e.stopPropagation(); supabase.from('chapters').delete().eq('id', ch.id).then(({ error }) => { if (!error) { setChapters(chapters.filter(c => c.id !== ch.id)); toast.success('Supprimé'); } }); }}
                                                                                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-all">
                                                                                <Trash2 className="w-3 h-3" />
                                                                            </button>
                                                                        </motion.div>
                                                                        {editingChapter === ch.id && (
                                                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 ml-7 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 space-y-3">
                                                                                <h4 className="text-xs font-bold text-indigo-400">✏️ Contenu du chapitre</h4>
                                                                                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} placeholder="Rédigez le contenu du cours..." className="w-full min-h-[100px] p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm resize-y placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/30" />
                                                                                <Button size="sm" className="bg-linear-to-r from-indigo-600 to-purple-600 font-bold rounded-xl h-8" onClick={async () => {
                                                                                    const { error } = await supabase.from('chapters').update({ content: editContent }).eq('id', ch.id);
                                                                                    if (!error) { setChapters(chapters.map(c => c.id === ch.id ? { ...c, content: editContent } : c)); toast.success('Contenu sauvegardé ✅'); }
                                                                                }}><Save className="w-3 h-3 mr-1" /> Sauvegarder</Button>
                                                                                <div>
                                                                                    <p className="text-[10px] text-slate-400 mb-2">🖼️ Images</p>
                                                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                                                        {(ch.resources || []).filter((r: any) => r.type === 'image').map((r: any, ri: number) => (
                                                                                            <div key={ri} className="relative group/img w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                                                                                                <img src={r.url} alt={r.name} className="w-full h-full object-cover" />
                                                                                                <button onClick={async () => { const upd = (ch.resources || []).filter((x: any) => x.url !== r.url); await supabase.from('chapters').update({ resources: upd }).eq('id', ch.id); setChapters(chapters.map(c => c.id === ch.id ? { ...c, resources: upd } : c)); toast.success('Supprimée'); }}
                                                                                                    className="absolute top-0 right-0 p-0.5 rounded-full bg-red-600/80 opacity-0 group-hover/img:opacity-100 transition-opacity"><X className="w-3 h-3 text-white" /></button>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                    <label className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-dashed border-white/10 text-xs text-slate-400 cursor-pointer">
                                                                                        {uploadingChapterFile ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Image
                                                                                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                                                                            const f = e.target.files?.[0]; if (!f) return; setUploadingChapterFile(true);
                                                                                            try { const compressed = await compressImage(f, { maxWidth: 1200, quality: 0.7 }); const path = `chapters/${ch.id}/images/${Date.now()}_${f.name}`; await supabase.storage.from('organization-assets').upload(path, compressed, { contentType: compressed.type }); const { data: u } = supabase.storage.from('organization-assets').getPublicUrl(path); const res = [...(ch.resources || []), { name: f.name, url: u.publicUrl, type: 'image' }]; await supabase.from('chapters').update({ resources: res }).eq('id', ch.id); setChapters(chapters.map(c => c.id === ch.id ? { ...c, resources: res } : c)); toast.success('Image ajoutée !'); } catch (err: any) { toast.error(err.message); }
                                                                                            setUploadingChapterFile(false); e.target.value = '';
                                                                                        }} disabled={uploadingChapterFile} />
                                                                                    </label>
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-[10px] text-slate-400 mb-2">📎 Ressources</p>
                                                                                    <div className="space-y-1 mb-2">
                                                                                        {(ch.resources || []).filter((r: any) => r.type === 'resource').map((r: any, ri: number) => (
                                                                                            <div key={ri} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/5 group/res">
                                                                                                <FileText className="w-3 h-3 text-indigo-400 shrink-0" />
                                                                                                <a href={r.url} target="_blank" rel="noopener" className="text-xs text-slate-300 hover:text-indigo-400 truncate flex-1">{r.name}</a>
                                                                                                <button onClick={async () => { const upd = (ch.resources || []).filter((x: any) => x.url !== r.url); await supabase.from('chapters').update({ resources: upd }).eq('id', ch.id); setChapters(chapters.map(c => c.id === ch.id ? { ...c, resources: upd } : c)); toast.success('Supprimée'); }}
                                                                                                    className="opacity-0 group-hover/res:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400"><X className="w-3 h-3" /></button>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                    <label className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-dashed border-white/10 text-xs text-slate-400 cursor-pointer">
                                                                                        {uploadingChapterFile ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Fichier
                                                                                        <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip" className="hidden" onChange={async (e) => {
                                                                                            const f = e.target.files?.[0]; if (!f) return; setUploadingChapterFile(true);
                                                                                            try { const path = `chapters/${ch.id}/resources/${Date.now()}_${f.name}`; await supabase.storage.from('organization-assets').upload(path, f, { contentType: f.type }); const { data: u } = supabase.storage.from('organization-assets').getPublicUrl(path); const res = [...(ch.resources || []), { name: f.name, url: u.publicUrl, type: 'resource' }]; await supabase.from('chapters').update({ resources: res }).eq('id', ch.id); setChapters(chapters.map(c => c.id === ch.id ? { ...c, resources: res } : c)); toast.success('Fichier ajouté !'); } catch (err: any) { toast.error(err.message); }
                                                                                            setUploadingChapterFile(false); e.target.value = '';
                                                                                        }} disabled={uploadingChapterFile} />
                                                                                    </label>
                                                                                </div>
                                                                            </motion.div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                            {subChapters.length === 0 && <p className="text-xs text-slate-600 text-center py-3">Aucun chapitre — ajoutez le premier !</p>}
                                                        </div>
                                                        {showNewChapter === sub.id ? (
                                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                                                                <Input value={newChTitle} onChange={e => setNewChTitle(e.target.value)} placeholder="Titre du chapitre" className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm" />
                                                                <Input value={newChDesc} onChange={e => setNewChDesc(e.target.value)} placeholder="Description courte (optionnel)" className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm" />
                                                                <div className="flex gap-2">
                                                                    <Button size="sm" className="bg-linear-to-r from-emerald-600 to-green-600 font-bold rounded-xl h-8" disabled={savingChapter || !newChTitle.trim()}
                                                                        onClick={async () => {
                                                                            setSavingChapter(true);
                                                                            const pos = subChapters.length + 1;
                                                                            const { data: ch, error } = await supabase.from('chapters').insert({ subject_id: sub.id, organization_id: orgId, teacher_id: userId, title: newChTitle.trim(), description: newChDesc.trim(), position: pos, status: 'draft' }).select().single();
                                                                            if (error) { toast.error(error.message); } else { setChapters([...chapters, ch]); toast.success(`Chapitre "${ch.title}" ajouté !`); setNewChTitle(''); setNewChDesc(''); setShowNewChapter(null); }
                                                                            setSavingChapter(false);
                                                                        }}>
                                                                        {savingChapter ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}Ajouter
                                                                    </Button>
                                                                    <Button size="sm" variant="ghost" className="h-8" onClick={() => { setShowNewChapter(null); setNewChTitle(''); setNewChDesc(''); }}>Annuler</Button>
                                                                </div>
                                                            </motion.div>
                                                        ) : (
                                                            <button onClick={() => setShowNewChapter(sub.id)} className="mt-3 w-full py-2 rounded-xl border border-dashed border-white/10 hover:border-indigo-500/30 text-xs text-slate-500 hover:text-indigo-400 transition-all flex items-center justify-center gap-1">
                                                                <Plus className="w-3 h-3" /> Ajouter un chapitre
                                                            </button>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </>
                        ) : (
                            /* Student cursus: view progress */
                            <>
                                <Card className="bg-gradient-to-br from-indigo-500/10 to-violet-500/5 border-indigo-500/20 backdrop-blur-sm overflow-hidden">
                                    <CardContent className="p-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                                <Award className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-black">{classroom?.name || '—'}</h2>
                                                {filiere && (<Badge className="mt-1 bg-gradient-to-r from-indigo-600 to-violet-600 border-none text-white text-[10px]">{filiere.nom} • {filiere.duree_mois} mois</Badge>)}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { l: 'Moyenne', v: overallAvg > 0 ? overallAvg.toFixed(1) : '—', unit: '/20', icon: BarChart3, color: 'indigo' },
                                        { l: 'Matières', v: subjects.length, unit: '', icon: BookOpen, color: 'teal' },
                                        { l: 'Total payé', v: fmt(totalPaid), unit: '', icon: CreditCard, color: 'emerald' },
                                    ].map((s, i) => (
                                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                                            <Card className={cn("bg-card/50 backdrop-blur-sm shadow-sm relative overflow-hidden group",
                                                s.color === 'indigo' ? 'border-indigo-500/20' : s.color === 'teal' ? 'border-teal-500/20' : 'border-emerald-500/20')}>
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
                                <div className="space-y-2">
                                    {subjects.map((sub: any, i: number) => (
                                        <motion.div key={sub.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                                            <Card className="bg-white/[0.03] border-white/[0.06] hover:border-white/10 transition-all">
                                                <CardContent className="p-3 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-medium">{sub.name}</p>
                                                        <p className="text-[10px] text-slate-500">Coef. {sub.coefficient || 1}{sub.teacher_profiles ? ` • ${sub.teacher_profiles.first_name} ${sub.teacher_profiles.last_name}` : ''}</p>
                                                    </div>
                                                    <span className={cn("text-sm font-bold",
                                                        gradesBySubject.find(gs => gs.subject.id === sub.id)?.count
                                                            ? (gradesBySubject.find(gs => gs.subject.id === sub.id)!.average >= 10 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-600')}>
                                                        {gradesBySubject.find(gs => gs.subject.id === sub.id)?.count ? gradesBySubject.find(gs => gs.subject.id === sub.id)!.average.toFixed(1) + '/20' : '—'}
                                                    </span>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            </>
                        )}
                    </motion.div>
                )}

                {/* ═══ STUDENT: BULLETIN ═══ */}
                {activeTab === 'bulletin' && !isTeacher && (
                    <motion.div key="bulletin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm text-slate-300">📊 Bulletin de notes</h3>
                            <Button size="sm" onClick={exportBulletinPDF} disabled={overallAvg === 0}
                                className="bg-gradient-to-r from-violet-600 to-indigo-600 text-xs rounded-xl shadow-lg shadow-violet-600/20">
                                <Printer className="w-3.5 h-3.5 mr-1" />Exporter PDF
                            </Button>
                        </div>
                        <Card className={cn("backdrop-blur-sm overflow-hidden text-center",
                            overallAvg >= 10 ? "bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20" :
                            overallAvg > 0 ? "bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/20" : "bg-card/50 border-white/10")}>
                            <CardContent className="p-5">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Moyenne générale</p>
                                <p className={cn("text-4xl font-black mt-1", overallAvg >= 10 ? "text-emerald-400" : overallAvg > 0 ? "text-red-400" : "text-slate-500")}>
                                    {overallAvg > 0 ? overallAvg.toFixed(2) : '—'}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">/20 • {gradesBySubject.filter(gs => gs.count > 0).length} matière(s)</p>
                            </CardContent>
                        </Card>
                        {gradesBySubject.map((gs, i) => (
                            <motion.div key={gs.subject.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                                <Card className="bg-card/50 backdrop-blur-sm border-white/10 overflow-hidden">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div><h3 className="font-bold text-sm">{gs.subject.name}</h3><p className="text-[10px] text-muted-foreground">Coef. {gs.subject.coefficient || 1}</p></div>
                                            <span className={cn("text-lg font-black", gs.count > 0 ? (gs.average >= 10 ? "text-emerald-400" : "text-red-400") : "text-slate-600")}>
                                                {gs.count > 0 ? gs.average.toFixed(1) : '—'}
                                            </span>
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

                {/* ═══ EDT (both roles) ═══ */}
                {activeTab === 'edt' && (
                    <motion.div key="edt" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm text-slate-300">📅 Emploi du temps</h3>
                            {timetableSlots.length > 0 && (
                                <Button size="sm" onClick={printTimetable} className="bg-gradient-to-r from-indigo-600 to-violet-600 text-xs rounded-xl">
                                    <Printer className="w-3.5 h-3.5 mr-1" /> PDF
                                </Button>
                            )}
                        </div>
                        {DAYS.map((day, di) => {
                            const slots = timetableSlots.filter((s: any) => s.day_of_week === di + 1);
                            const isToday = (today === 0 ? 7 : today) === di + 1;
                            return (
                                <motion.div key={di} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * di }}>
                                    <Card className={cn("backdrop-blur-sm overflow-hidden", isToday ? "bg-gradient-to-br from-indigo-500/10 to-violet-500/5 border-indigo-500/20" : "bg-card/50 border-white/5")}>
                                        <CardContent className="p-4">
                                            <h3 className={cn("font-bold text-sm mb-2", isToday ? "text-indigo-400" : "text-slate-400")}>
                                                {day} {isToday && <Badge className="ml-2 bg-indigo-500/20 text-indigo-400 border-none text-[9px]">Aujourd&apos;hui</Badge>}
                                            </h3>
                                            {slots.length === 0 ? <p className="text-xs text-slate-600">Pas de cours</p> : (
                                                <div className="space-y-1.5">
                                                    {slots.map((s: any) => (
                                                        <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5">
                                                            <span className="text-indigo-400 font-mono text-xs font-bold w-20">{s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)}</span>
                                                            <span className="text-sm flex-1">{s.subjects?.name}</span>
                                                            {s.room && <span className="text-xs text-slate-500">{s.room}</span>}
                                                            {isTeacher && s.classrooms?.name && <span className="text-xs text-slate-500">{s.classrooms.name}</span>}
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

                {/* ═══ STUDENT: PAIEMENTS ═══ */}
                {activeTab === 'paiements' && !isTeacher && (
                    <motion.div key="paiements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                        <h3 className="font-bold text-sm text-slate-300">💰 Historique des paiements</h3>
                        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20 text-center">
                            <CardContent className="p-5">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total payé</p>
                                <p className="text-3xl font-black text-emerald-400 mt-1">{fmt(totalPaid)} XAF</p>
                                <p className="text-sm text-muted-foreground mt-1">{payments.length} paiement(s)</p>
                            </CardContent>
                        </Card>
                        {payments.length > 0 ? payments.map((p: any, i: number) => (
                            <motion.div key={p.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                                <Card className="bg-card/50 border-white/10">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
                                                p.payment_method === 'momo' ? 'bg-yellow-500/20' : p.payment_method === 'orange_money' ? 'bg-orange-500/20' : 'bg-emerald-500/20')}>
                                                <CircleDollarSign className={cn("w-5 h-5", p.payment_method === 'momo' ? 'text-yellow-400' : p.payment_method === 'orange_money' ? 'text-orange-400' : 'text-emerald-400')} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{p.description || 'Scolarité'}</p>
                                                <p className="text-[10px] text-muted-foreground">{p.payment_method === 'momo' ? 'MTN MoMo' : p.payment_method === 'orange_money' ? 'Orange Money' : 'Espèces'} • {new Date(p.paid_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
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
            </AnimatePresence>
        </div>
    );
}
