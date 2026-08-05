'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Lock, BookOpen, BarChart3, Calendar, CreditCard, Loader2,
    Award, TrendingUp, Clock, FileText, CircleDollarSign,
    CheckCircle2, AlertCircle, ChevronRight, Printer, ArrowLeft,
    Star, Trophy, ShieldCheck, Download, Users, MessageSquare,
    User, PenSquare, Save, X, ClipboardList, LockKeyhole, Unlock,
    ChevronDown, ChevronUp, GraduationCap, Plus, Trash2, Eye, EyeOff, Layers, Timer, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/compress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { generateBulletinPDF, type BulletinData, computeSubjectAverage, computeOverallAverage } from '@/lib/bulletin-pdf';
import { TeacherCursus } from './cursus/teacher-cursus';
import { StudentCursus } from './cursus/student-cursus';
import { AdminCursus } from './cursus/admin-cursus';
import { calculateSkyPoints } from './cursus/cursus-exercise-modal';
import { AdsBanner } from './ads-banner';
import { queueGradeNotification } from '@/lib/whatsapp-queue';

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
    onOpenGroupChat?: (convId: string, convName: string) => void;
    orgBulletinTemplate?: number;
    orgCurrentTerm?: string;
    userPhotoUrl?: string | null;
}

export function MySpaceView({ orgId, orgSlug, userId, userName, userRole, orgName, orgLogo, orgPhone, orgEmail, orgCity, orgCountry, onStartDM, onOpenGroupChat, orgBulletinTemplate, orgCurrentTerm, userPhotoUrl }: MySpaceViewProps) {
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
    const [exerciseSubmissions, setExerciseSubmissions] = useState<any[]>([]);
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
    const [lessons, setLessons] = useState<any[]>([]);
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
    // Cursus State
    const [allTeachers, setAllTeachers] = useState<any[]>([]);
    const [skyPoints, setSkyPoints] = useState(0);

    
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
                    // Load lessons
                    const chapterIds = (chaps || []).map((c: any) => c.id);
                    if (chapterIds.length > 0) {
                        const { data: lsns } = await supabase.from('lessons').select('*').in('chapter_id', chapterIds).order('position');
                        setLessons(lsns || []);
                    }
                }
            } else {
                // Student data
                const { data: s } = await supabase.from('student_profiles').select('*').eq('id', userId).single();
                setProfile(s);
                if (s?.classroom_id) {
                    const { data: cls } = await supabase.from('classrooms').select('*, filieres:filiere_id(*)').eq('id', s.classroom_id).single();
                    setClassroom(cls);
                    if (cls?.filieres) setFiliere(cls.filieres);
                    const { data: subs } = await supabase.from('subjects')
                        .select('*, teacher_profiles:teacher_id(first_name, last_name)')
                        .eq('classroom_id', s.classroom_id)
                        .eq('organization_id', orgId)
                        .order('name');
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

                    const { data: exSubs } = await supabase.from('exercise_submissions')
                        .select('*, exercises:exercise_id(id, title, max_score, type, chapter_id, subject_id)')
                        .eq('student_id', userId);
                    setExerciseSubmissions(exSubs || []);

                    const subIds = (subs || []).map((sb: any) => sb.id);
                    if (subIds.length > 0) {
                        const { data: chaps } = await supabase.from('chapters').select('id, subject_id').in('subject_id', subIds);
                        setChapters(chaps || []);
                    }
                }
                const { data: pays } = await supabase.from('school_payments').select('*')
                    .eq('student_id', userId).order('paid_at', { ascending: false });
                setPayments(pays || []);
            }
            
            // Load teachers for admin
            if (userRole === 'admin' || userRole === 'owner') {
                const { data: teachers } = await supabase.from('teacher_profiles').select('id,first_name,last_name').eq('organization_id', orgId);
                setAllTeachers(teachers || []);
            }
            
            // Load sky points for all user roles
            const skyTable = (userRole === 'teacher' || userRole === 'admin' || userRole === 'owner') ? 'teacher_profiles' : 'student_profiles';
            const { data: sp } = await supabase.from(skyTable).select('sky_points').eq('id', userId).maybeSingle();
            setSkyPoints(sp?.sky_points ?? 100);
            
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

            // Credit Sky Points & Queue WhatsApp notification
            for (const entry of entries) {
                const studentObj = myStudents.find((s: any) => s.id === entry.student_id);
                const parentPhone = studentObj?.guardian_phone || studentObj?.phone;
                const studentName = studentObj ? `${studentObj.first_name} ${studentObj.last_name}` : 'Élève';

                const skyGain = calculateSkyPoints(entry.score, selEval.max_score || 20);
                if (skyGain > 0) {
                    const { data: prof } = await supabase.from('student_profiles').select('sky_points').eq('id', entry.student_id).single();
                    if (prof) {
                        await supabase.from('student_profiles').update({ sky_points: (prof.sky_points || 0) + skyGain }).eq('id', entry.student_id);
                        await supabase.from('sky_transactions').insert({
                            user_id: entry.student_id,        // required – original column
                            student_id: entry.student_id,     // extended column
                            amount: skyGain,
                            type: 'evaluation_grade',          // required – original column
                            transaction_type: 'evaluation_grade', // extended column
                            description: `Note éval: ${entry.score}/${selEval.max_score || 20} (+${skyGain} Sky) — ${selEval.title}`
                        });
                    }
                }

                if (parentPhone) {
                    await queueGradeNotification(
                        orgId,
                        orgName,
                        parentPhone,
                        studentName,
                        selEval.subjects?.name || 'Matière',
                        selEval.title,
                        entry.score,
                        selEval.max_score || 20
                    );
                }
            }

            toast.success(`${entries.length} notes sauvegardées ✅ (Notifications WhatsApp en file)`);
        } catch (e: any) { toast.error(e.message); }
        setSavingGrades(false);
    };

    // ═══ STUDENT: Computed grades ═══
    const gradesBySubject = subjects.map(sub => {
        const subGrades = grades.filter((g: any) => g.evaluations?.subject_id === sub.id || g.evaluations?.subjects?.name === sub.name);
        const subExSubs = exerciseSubmissions.filter((es: any) => {
            const ex = es.exercises;
            if (!ex) return false;
            if (ex.subject_id === sub.id) return true;
            if (ex.chapter_id) return chapters.some((c: any) => c.id === ex.chapter_id && c.subject_id === sub.id);
            return false;
        });

        const evalScored = subGrades.filter((g: any) => g.score !== null && g.score !== undefined);
        const exScored = subExSubs.filter((es: any) => es.score !== null && es.score !== undefined);

        let totalPoints = 0;
        let totalCount = 0;

        evalScored.forEach((g: any) => {
            const max = g.evaluations?.max_score || 20;
            totalPoints += (g.score / max) * 20;
            totalCount += 1;
        });

        exScored.forEach((es: any) => {
            const max = es.exercises?.max_score || 20;
            totalPoints += (es.score / max) * 20;
            totalCount += 1;
        });

        const avg = totalCount > 0 ? totalPoints / totalCount : 0;

        return {
            subject: sub,
            grades: subGrades,
            exerciseSubmissions: subExSubs,
            average: avg,
            count: totalCount,
            evalCount: evalScored.length,
            exCount: exScored.length
        };
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
        const bulletinSubjects = gradesBySubject.map(gs => {
            const evalItems = gs.grades.map((g: any) => ({
                title: g.evaluations?.title || 'Évaluation',
                type: g.evaluations?.type || 'devoir',
                score: g.score,
                max_score: g.evaluations?.max_score || 20,
                weight: g.evaluations?.weight || 1,
                remark: g.teacher_remark,
            }));

            const exItems = gs.exerciseSubmissions.map((es: any) => ({
                title: es.exercises?.title || 'Exercice Cursus',
                type: `cursus (${es.exercises?.type || 'qcm'})`,
                score: es.score,
                max_score: es.exercises?.max_score || 20,
                weight: 1,
                remark: 'Auto-corrigé Cursus',
            }));

            return {
                name: gs.subject.name,
                coefficient: gs.subject.coefficient || 1,
                teacher_name: gs.subject.teacher_profiles ? `${gs.subject.teacher_profiles.first_name} ${gs.subject.teacher_profiles.last_name}` : undefined,
                grades: [...evalItems, ...exItems],
                average: gs.average,
            };
        });
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
                                {s.photo_url ? (
                                    <img src={s.photo_url} alt={s.first_name} className="w-11 h-11 rounded-full object-cover shrink-0 border-2 border-teal-500/30" />
                                ) : (
                                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-600 to-emerald-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                                        {s.first_name?.[0]}{s.last_name?.[0]}
                                    </div>
                                )}
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

                {/* ═══ CURSUS — Premium Card UI ═══ */}
                {activeTab === 'cursus' && (
                    <motion.div key="cursus" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        {(userRole === 'admin' || userRole === 'owner') ? (
                            <AdminCursus
                                orgId={orgId}
                                allClasses={allClasses}
                                allTeachers={allTeachers}
                            />
                        ) : isTeacher ? (
                            <TeacherCursus
                                orgId={orgId}
                                userId={userId}
                                userName={userName}
                                allClasses={allClasses}
                                onOpenGroupChat={onOpenGroupChat}
                            />
                        ) : (
                            <>
                                {/* ── Publicités étudiants (Feature 6) ── */}
                                <AdsBanner
                                    userId={userId}
                                    orgId={orgId}
                                    onSkyUpdate={(delta) => setSkyPoints(p => p + delta)}
                                />
                                <StudentCursus
                                    orgId={orgId}
                                    userId={userId}
                                    userName={userName}
                                    classroomId={classroom?.id || null}
                                    skyPoints={skyPoints}
                                    onSkyUpdate={(delta) => setSkyPoints(p => p + delta)}
                                    onOpenGroupChat={onOpenGroupChat}
                                    onStartDM={onStartDM}
                                />
                            </>
                        )}
                    </motion.div>
                )}

                {/* ═══ STUDENT: BULLETIN ═══ */}
                {activeTab === 'bulletin' && !isTeacher && (
                    <motion.div key="bulletin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-sm text-slate-300">📊 Bulletin de notes</h3>
                                <p className="text-[10px] text-slate-500">Synthèse des évaluations prof & exercices Cursus</p>
                            </div>
                            <Button size="sm" onClick={exportBulletinPDF} disabled={overallAvg === 0}
                                className="bg-gradient-to-r from-violet-600 to-indigo-600 text-xs rounded-xl shadow-lg shadow-violet-600/20">
                                <Printer className="w-3.5 h-3.5 mr-1" />Exporter PDF
                            </Button>
                        </div>

                        {/* Overall Average Card */}
                        <Card className={cn("backdrop-blur-sm overflow-hidden text-center border",
                            overallAvg >= 14 ? "bg-gradient-to-br from-emerald-500/15 to-teal-500/5 border-emerald-500/30" :
                            overallAvg >= 10 ? "bg-gradient-to-br from-indigo-500/15 to-violet-500/5 border-indigo-500/30" :
                            overallAvg > 0 ? "bg-gradient-to-br from-red-500/15 to-rose-500/5 border-red-500/30" : "bg-card/50 border-white/10")}>
                            <CardContent className="p-5">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Moyenne générale calculée</p>
                                <div className="flex items-center justify-center gap-2 mt-1">
                                    <p className={cn("text-4xl font-black", overallAvg >= 10 ? "text-emerald-400" : overallAvg > 0 ? "text-red-400" : "text-slate-500")}>
                                        {overallAvg > 0 ? overallAvg.toFixed(2) : '—'}
                                    </p>
                                    <span className="text-slate-500 text-lg font-bold">/20</span>
                                </div>

                                {overallAvg > 0 && (
                                    <div className="mt-2 flex items-center justify-center gap-2">
                                        <Badge className={cn("text-xs font-bold px-2.5 py-0.5 border-none",
                                            overallAvg >= 16 ? "bg-emerald-500/20 text-emerald-300" :
                                            overallAvg >= 14 ? "bg-teal-500/20 text-teal-300" :
                                            overallAvg >= 12 ? "bg-indigo-500/20 text-indigo-300" :
                                            overallAvg >= 10 ? "bg-amber-500/20 text-amber-300" : "bg-red-500/20 text-red-300"
                                        )}>
                                            {overallAvg >= 16 ? "Mention Très Bien 🎉" :
                                             overallAvg >= 14 ? "Mention Bien 👏" :
                                             overallAvg >= 12 ? "Mention Assez Bien 👍" :
                                             overallAvg >= 10 ? "Passable ✅" : "Insuffisant ⚠️"}
                                        </Badge>
                                    </div>
                                )}

                                <p className="text-xs text-muted-foreground mt-2">
                                    {gradesBySubject.filter(gs => gs.count > 0).length} matière(s) évaluée(s)
                                </p>
                            </CardContent>
                        </Card>

                        {/* Subject detail cards */}
                        {gradesBySubject.map((gs, i) => (
                            <motion.div key={gs.subject.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                                <Card className="bg-card/50 backdrop-blur-sm border-white/10 overflow-hidden">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <h3 className="font-bold text-sm text-white">{gs.subject.name}</h3>
                                                <p className="text-[10px] text-muted-foreground">
                                                    Coef. {gs.subject.coefficient || 1} • {gs.evalCount} éval(s) prof • {gs.exCount} ex. Cursus
                                                </p>
                                            </div>
                                            <span className={cn("text-lg font-black", gs.count > 0 ? (gs.average >= 10 ? "text-emerald-400" : "text-red-400") : "text-slate-600")}>
                                                {gs.count > 0 ? gs.average.toFixed(1) : '—'}<span className="text-[10px] text-slate-500">/20</span>
                                            </span>
                                        </div>

                                        {gs.count > 0 && <Progress value={(gs.average / 20) * 100} className="h-1.5 mb-3" />}

                                        <div className="space-y-1.5">
                                            {/* Teacher evaluations */}
                                            {gs.grades.map((g: any) => (
                                                <div key={g.id} className="flex items-center justify-between text-xs p-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold uppercase">Prof</span>
                                                        <span className="text-slate-300 truncate">{g.evaluations?.title}</span>
                                                    </div>
                                                    <span className={cn("font-bold shrink-0 ml-2", g.score >= (g.evaluations?.max_score || 20) / 2 ? "text-emerald-400" : "text-red-400")}>
                                                        {g.score}/{g.evaluations?.max_score || 20}
                                                    </span>
                                                </div>
                                            ))}

                                            {/* Cursus auto-corrected exercises */}
                                            {gs.exerciseSubmissions.map((es: any) => (
                                                <div key={es.id} className="flex items-center justify-between text-xs p-2 rounded-xl bg-violet-500/[0.05] border border-violet-500/20">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-semibold uppercase">Cursus</span>
                                                        <span className="text-slate-300 truncate">{es.exercises?.title || 'Exercice auto-corrigé'}</span>
                                                    </div>
                                                    <span className={cn("font-bold shrink-0 ml-2", es.score >= (es.exercises?.max_score || 20) / 2 ? "text-emerald-400" : "text-red-400")}>
                                                        {es.score}/{es.exercises?.max_score || 20}
                                                    </span>
                                                </div>
                                            ))}

                                            {gs.count === 0 && (
                                                <p className="text-xs text-slate-600 italic text-center py-2">Aucune note enregistrée</p>
                                            )}
                                        </div>
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
