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
    const [editingChapter, setEditingChapter] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [uploadingChapterFile, setUploadingChapterFile] = useState(false);
    const [allClasses, setAllClasses] = useState<any[]>([]);
    // Lesson state
    const [showNewLesson, setShowNewLesson] = useState<string | null>(null);
    const [newLessonTitle, setNewLessonTitle] = useState('');
    const [newLessonDesc, setNewLessonDesc] = useState('');
    const [savingLesson, setSavingLesson] = useState(false);
    const [editingLesson, setEditingLesson] = useState<string | null>(null);
    const [editLessonContent, setEditLessonContent] = useState('');
    const [uploadingLessonFile, setUploadingLessonFile] = useState(false);
    // Student cursus state
    const [studentChapters, setStudentChapters] = useState<any[]>([]);
    const [studentLessons, setStudentLessons] = useState<any[]>([]);
    const [expandedStudentSub, setExpandedStudentSub] = useState<string | null>(null);
    const [expandedStudentCh, setExpandedStudentCh] = useState<string | null>(null);
    
    // Exercises & Sky Points
    const [exercises, setExercises] = useState<any[]>([]);
    const [showNewExercise, setShowNewExercise] = useState<{ type: 'chapter' | 'lesson', id: string } | null>(null);
    const [exForm, setExForm] = useState({ title: '', type: 'qcm', duration_minutes: 10, max_score: 20, questions: [] as any[] });
    const [savingEx, setSavingEx] = useState(false);
    
    const [activeExercise, setActiveExercise] = useState<any>(null);
    const [exAnswers, setExAnswers] = useState<Record<number, any>>({});
    const [exTimeLeft, setExTimeLeft] = useState(0);
    const [exSubmitting, setExSubmitting] = useState(false);
    const [exResult, setExResult] = useState<any>(null);
    
    useEffect(() => {
        let timer: any;
        if (activeExercise && exTimeLeft > 0 && !exSubmitting && !exResult) {
            timer = setInterval(() => setExTimeLeft(t => t - 1), 1000);
        } else if (exTimeLeft === 0 && activeExercise && !exSubmitting && !exResult) {
            submitExercise();
        }
        return () => clearInterval(timer);
    }, [activeExercise, exTimeLeft, exSubmitting, exResult]);
    
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
                    // Load chapters + lessons for student cursus
                    const subjectIds = (subs || []).map((s: any) => s.id);
                    if (subjectIds.length > 0) {
                        const { data: chaps } = await supabase.from('chapters')
                            .select('*, resources:chapter_resources(*)')
                            .in('subject_id', subjectIds)
                            .order('position');
                        setStudentChapters(chaps || []);
                        const chapterIds = (chaps || []).map((c: any) => c.id);
                        if (chapterIds.length > 0) {
                            const { data: lsns } = await supabase.from('lessons')
                                .select('*, resources:lesson_resources(*)')
                                .in('chapter_id', chapterIds)
                                .order('position');
                            setStudentLessons(lsns || []);
                        }
                    }
                }
                const { data: pays } = await supabase.from('school_payments').select('*')
                    .eq('student_id', userId).order('paid_at', { ascending: false });
                setPayments(pays || []);
            }
            
            // Load exercises for both
            const { data: exs } = await supabase.from('exercises').select('*').eq('organization_id', orgId);
            setExercises(exs || []);
            
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

    // ═══ EXERCISES LOGIC ═══
    const createExercise = async () => {
        if (!showNewExercise || !exForm.title) return;
        setSavingEx(true);
        const payload = {
            organization_id: orgId,
            title: exForm.title,
            type: exForm.type,
            duration_minutes: exForm.duration_minutes,
            max_score: exForm.max_score,
            questions: exForm.questions,
            ...(showNewExercise.type === 'chapter' ? { chapter_id: showNewExercise.id } : { lesson_id: showNewExercise.id })
        };
        const { data, error } = await supabase.from('exercises').insert(payload).select().single();
        if (error) toast.error(error.message);
        else {
            setExercises([...exercises, data]);
            toast.success('Exercice ajouté !');
            setShowNewExercise(null);
            setExForm({ title: '', type: 'qcm', duration_minutes: 10, max_score: 20, questions: [] });
        }
        setSavingEx(false);
    };

    const submitExercise = async () => {
        if (!activeExercise || exSubmitting) return;
        setExSubmitting(true);
        
        let score = 0;
        const qCount = activeExercise.questions.length || 1;
        const ptsPerQ = activeExercise.max_score / qCount;
        
        if (activeExercise.type === 'qcm' || activeExercise.type === 'quiz') {
            activeExercise.questions.forEach((q: any, i: number) => {
                if (activeExercise.type === 'qcm' && exAnswers[i] === q.answer) score += ptsPerQ;
                if (activeExercise.type === 'quiz' && exAnswers[i]?.trim().toLowerCase() === q.answer?.trim().toLowerCase()) score += ptsPerQ;
            });
        }
        score = Math.min(score, activeExercise.max_score);
        
        const { error } = await supabase.from('exercise_submissions').insert({
            exercise_id: activeExercise.id,
            student_id: userId,
            answers: exAnswers,
            score: score,
            graded: activeExercise.type === 'qcm' || activeExercise.type === 'quiz'
        });
        
        if (!error && (activeExercise.type === 'qcm' || activeExercise.type === 'quiz')) {
            const earnedSky = Math.round(score);
            if (earnedSky > 0) {
                await supabase.from('sky_transactions').insert({
                    student_id: userId, amount: earnedSky, reason: `Exercice: ${activeExercise.title}`, reference_id: activeExercise.id
                });
                await supabase.rpc('increment_sky_points', { user_id: userId, amount: earnedSky });
                setProfile((prev: any) => ({ ...prev, sky_points: (prev?.sky_points || 0) + earnedSky }));
                toast.success(`+${earnedSky} Sky Points !`);
            }
        }
        
        setExResult({ score });
        setExSubmitting(false);
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
                                                                            
                                                                            {ch.status === 'draft' && (
                                                                                <button onClick={(e) => { e.stopPropagation(); supabase.from('chapters').update({ status: 'published' }).eq('id', ch.id).then(({ error }) => { if (!error) { setChapters(chapters.map(c => c.id === ch.id ? { ...c, status: 'published' } : c)); toast.success('Chapitre publié !'); } }); }}
                                                                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all">
                                                                                    Publier
                                                                                </button>
                                                                            )}
                                                                            {ch.status === 'published' && (
                                                                                <button onClick={(e) => { e.stopPropagation(); supabase.from('chapters').update({ status: 'completed' }).eq('id', ch.id).then(({ error }) => { if (!error) { setChapters(chapters.map(c => c.id === ch.id ? { ...c, status: 'completed' } : c)); toast.success('Chapitre terminé !'); } }); }}
                                                                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all">
                                                                                    Marquer terminé
                                                                                </button>
                                                                            )}
                                                                            {ch.status === 'completed' && (
                                                                                <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-500/20 text-slate-400">
                                                                                    <CheckCircle2 className="w-3 h-3" /> Terminé
                                                                                </span>
                                                                            )}
                                                                            
                                                                            <button onClick={(e) => { e.stopPropagation(); supabase.from('chapters').delete().eq('id', ch.id).then(({ error }) => { if (!error) { setChapters(chapters.filter(c => c.id !== ch.id)); toast.success('Supprimé'); } }); }}
                                                                                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-all">
                                                                                <Trash2 className="w-3 h-3" />
                                                                            </button>
                                                                        </motion.div>
                                                                        {editingChapter === ch.id && (
                                                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 ml-7 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 space-y-3">
                                                                                <h4 className="text-xs font-bold text-indigo-400">✏️ Contenu du chapitre</h4>
                                                                                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} placeholder="Rédigez le contenu du cours ici...
Vous pouvez écrire autant que nécessaire." className="w-full min-h-[300px] p-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm leading-relaxed resize-y placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/30" />
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
                                                                                {/* EXERCISES (Chapter level) */}
                                                                                <div className="border-t border-white/5 pt-3 mt-2">
                                                                                    <div className="flex items-center justify-between mb-2">
                                                                                        <p className="text-[10px] text-orange-400 font-bold">📝 Exercices</p>
                                                                                        <button onClick={() => setShowNewExercise({ type: 'chapter', id: ch.id })} className="text-[10px] text-orange-400 hover:text-orange-300 flex items-center gap-1 bg-orange-500/10 px-2 py-0.5 rounded">
                                                                                            <Plus className="w-3 h-3" /> Ajouter
                                                                                        </button>
                                                                                    </div>
                                                                                    {exercises.filter(ex => ex.chapter_id === ch.id).map(ex => (
                                                                                        <div key={ex.id} className="text-xs p-2 rounded bg-orange-500/5 border border-orange-500/10 mb-1 flex items-center justify-between">
                                                                                            <span>{ex.title} ({ex.type.toUpperCase()})</span>
                                                                                            <span className="text-[10px] text-slate-500">{ex.duration_minutes} min • /{ex.max_score}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                                {/* ═══ LESSONS ═══ */}
                                                                                <div className="border-t border-white/5 pt-3 mt-2">
                                                                                    <p className="text-[10px] text-indigo-400 font-bold mb-2">📖 Leçons du chapitre</p>
                                                                                    {lessons.filter(l => l.chapter_id === ch.id).sort((a, b) => a.position - b.position).map((lesson: any, li: number) => {
                                                                                        const lImages = (lesson.resources || []).filter((r: any) => r.type === 'image');
                                                                                        const lFiles = (lesson.resources || []).filter((r: any) => r.type === 'resource');
                                                                                        return (
                                                                                            <div key={lesson.id} className="mb-2">
                                                                                                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/5 hover:border-indigo-500/20 transition-all group/lesson cursor-pointer"
                                                                                                    onClick={() => { if (editingLesson === lesson.id) { setEditingLesson(null); } else { setEditingLesson(lesson.id); setEditLessonContent(lesson.content || ''); } }}>
                                                                                                    <span className="text-[10px] font-mono text-slate-600 w-4">{lesson.position}</span>
                                                                                                    <div className="flex-1 min-w-0">
                                                                                                        <p className="text-xs font-medium truncate">{lesson.title}</p>
                                                                                                        {lesson.description && <p className="text-[9px] text-slate-500 truncate">{lesson.description}</p>}
                                                                                                    </div>
                                                                                                    <button onClick={(e) => { e.stopPropagation(); supabase.from('lessons').delete().eq('id', lesson.id).then(({ error }) => { if (!error) { setLessons(lessons.filter(l => l.id !== lesson.id)); toast.success('Leçon supprimée'); } }); }}
                                                                                                        className="opacity-0 group-hover/lesson:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400"><Trash2 className="w-2.5 h-2.5" /></button>
                                                                                                </div>
                                                                                                {editingLesson === lesson.id && (
                                                                                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 ml-5 p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/10 space-y-2">
                                                                                                        <textarea value={editLessonContent} onChange={e => setEditLessonContent(e.target.value)} placeholder="Contenu de la leçon...
Écrivez le contenu complet ici." className="w-full min-h-[250px] p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm leading-relaxed resize-y placeholder:text-slate-600 focus:outline-none focus:border-purple-500/30" />
                                                                                                        <Button size="sm" className="bg-linear-to-r from-purple-600 to-indigo-600 font-bold rounded-lg h-7 text-[10px]" onClick={async () => {
                                                                                                            const { error } = await supabase.from('lessons').update({ content: editLessonContent }).eq('id', lesson.id);
                                                                                                            if (!error) { setLessons(lessons.map(l => l.id === lesson.id ? { ...l, content: editLessonContent } : l)); toast.success('Leçon sauvegardée ✅'); }
                                                                                                        }}><Save className="w-2.5 h-2.5 mr-1" />Sauvegarder</Button>
                                                                                                        <div className="flex flex-wrap gap-2">
                                                                                                            {lImages.map((r: any, ri: number) => (
                                                                                                                <div key={ri} className="relative group/limg w-12 h-12 rounded overflow-hidden border border-white/10">
                                                                                                                    <img src={r.url} alt={r.name} className="w-full h-full object-cover" />
                                                                                                                    <button onClick={async () => { const upd = (lesson.resources || []).filter((x: any) => x.url !== r.url); await supabase.from('lessons').update({ resources: upd }).eq('id', lesson.id); setLessons(lessons.map(l => l.id === lesson.id ? { ...l, resources: upd } : l)); }}
                                                                                                                        className="absolute top-0 right-0 p-0.5 rounded-full bg-red-600/80 opacity-0 group-hover/limg:opacity-100"><X className="w-2 h-2 text-white" /></button>
                                                                                                                </div>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                        {lFiles.map((r: any, ri: number) => (
                                                                                                            <div key={ri} className="flex items-center gap-2 p-1.5 rounded bg-white/[0.03] border border-white/5 group/lres">
                                                                                                                <FileText className="w-3 h-3 text-purple-400 shrink-0" />
                                                                                                                <a href={r.url} target="_blank" rel="noopener" className="text-[10px] text-slate-300 truncate flex-1">{r.name}</a>
                                                                                                                <button onClick={async () => { const upd = (lesson.resources || []).filter((x: any) => x.url !== r.url); await supabase.from('lessons').update({ resources: upd }).eq('id', lesson.id); setLessons(lessons.map(l => l.id === lesson.id ? { ...l, resources: upd } : l)); }}
                                                                                                                    className="opacity-0 group-hover/lres:opacity-100 p-0.5 rounded hover:bg-red-500/20 text-red-400"><X className="w-2.5 h-2.5" /></button>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                        <div className="flex gap-2">
                                                                                                            <label className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-dashed border-white/10 text-[10px] text-slate-400 cursor-pointer">
                                                                                                                {uploadingLessonFile ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Plus className="w-2.5 h-2.5" />} Image
                                                                                                                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                                                                                                    const f = e.target.files?.[0]; if (!f) return; setUploadingLessonFile(true);
                                                                                                                    try { const compressed = await compressImage(f, { maxWidth: 1200, quality: 0.7 }); const path = `lessons/${lesson.id}/images/${Date.now()}_${f.name}`; await supabase.storage.from('organization-assets').upload(path, compressed, { contentType: compressed.type }); const { data: u } = supabase.storage.from('organization-assets').getPublicUrl(path); const res = [...(lesson.resources || []), { name: f.name, url: u.publicUrl, type: 'image' }]; await supabase.from('lessons').update({ resources: res }).eq('id', lesson.id); setLessons(lessons.map(l => l.id === lesson.id ? { ...l, resources: res } : l)); toast.success('Image ajoutée !'); } catch (err: any) { toast.error(err.message); }
                                                                                                                    setUploadingLessonFile(false); e.target.value = '';
                                                                                                                }} disabled={uploadingLessonFile} />
                                                                                                            </label>
                                                                                                            <label className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-dashed border-white/10 text-[10px] text-slate-400 cursor-pointer">
                                                                                                                {uploadingLessonFile ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Plus className="w-2.5 h-2.5" />} Fichier
                                                                                                                <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip" className="hidden" onChange={async (e) => {
                                                                                                                    const f = e.target.files?.[0]; if (!f) return; setUploadingLessonFile(true);
                                                                                                                    try { const path = `lessons/${lesson.id}/resources/${Date.now()}_${f.name}`; await supabase.storage.from('organization-assets').upload(path, f, { contentType: f.type }); const { data: u } = supabase.storage.from('organization-assets').getPublicUrl(path); const res = [...(lesson.resources || []), { name: f.name, url: u.publicUrl, type: 'resource' }]; await supabase.from('lessons').update({ resources: res }).eq('id', lesson.id); setLessons(lessons.map(l => l.id === lesson.id ? { ...l, resources: res } : l)); toast.success('Fichier ajouté !'); } catch (err: any) { toast.error(err.message); }
                                                                                                                    setUploadingLessonFile(false); e.target.value = '';
                                                                                                                }} disabled={uploadingLessonFile} />
                                                                                                            </label>
                                                                                                        </div>
                                                                                                        <div className="border-t border-white/5 pt-2 mt-2">
                                                                                                            <div className="flex items-center justify-between mb-1">
                                                                                                                <p className="text-[10px] text-orange-400 font-bold">📝 Exercices de leçon</p>
                                                                                                                <button onClick={() => setShowNewExercise({ type: 'lesson', id: lesson.id })} className="text-[9px] text-orange-400 flex items-center gap-1">
                                                                                                                    <Plus className="w-2.5 h-2.5" /> Ajouter
                                                                                                                </button>
                                                                                                            </div>
                                                                                                            {exercises.filter(ex => ex.lesson_id === lesson.id).map(ex => (
                                                                                                                <div key={ex.id} className="text-[10px] p-1.5 rounded bg-orange-500/5 border border-orange-500/10 mb-1 flex items-center justify-between">
                                                                                                                    <span>{ex.title}</span>
                                                                                                                    <span className="text-slate-500">/{ex.max_score}</span>
                                                                                                                </div>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    </motion.div>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                    {showNewLesson === ch.id ? (
                                                                                        <div className="p-2 rounded-lg bg-white/5 border border-white/10 space-y-2 mt-1">
                                                                                            <Input value={newLessonTitle} onChange={e => setNewLessonTitle(e.target.value)} placeholder="Titre de la leçon" className="bg-white/5 border-white/10 text-white h-8 rounded-lg text-xs" />
                                                                                            <Input value={newLessonDesc} onChange={e => setNewLessonDesc(e.target.value)} placeholder="Description (optionnel)" className="bg-white/5 border-white/10 text-white h-8 rounded-lg text-xs" />
                                                                                            <div className="flex gap-2">
                                                                                                <Button size="sm" className="bg-linear-to-r from-purple-600 to-pink-600 font-bold rounded-lg h-7 text-[10px]" disabled={savingLesson || !newLessonTitle.trim()}
                                                                                                    onClick={async () => {
                                                                                                        setSavingLesson(true);
                                                                                                        const pos = lessons.filter(l => l.chapter_id === ch.id).length + 1;
                                                                                                        const { data: lesson, error } = await supabase.from('lessons').insert({ chapter_id: ch.id, organization_id: orgId, title: newLessonTitle.trim(), description: newLessonDesc.trim(), position: pos, status: 'draft' }).select().single();
                                                                                                        if (error) { toast.error(error.message); } else { setLessons([...lessons, lesson]); toast.success(`Leçon "${lesson.title}" ajoutée !`); setNewLessonTitle(''); setNewLessonDesc(''); setShowNewLesson(null); }
                                                                                                        setSavingLesson(false);
                                                                                                    }}>
                                                                                                    {savingLesson ? <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" /> : <Plus className="w-2.5 h-2.5 mr-1" />}Créer
                                                                                                </Button>
                                                                                                <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => { setShowNewLesson(null); setNewLessonTitle(''); setNewLessonDesc(''); }}>Annuler</Button>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <button onClick={() => setShowNewLesson(ch.id)} className="mt-1 w-full py-1.5 rounded-lg border border-dashed border-purple-500/20 hover:border-purple-500/30 text-[10px] text-slate-500 hover:text-purple-400 transition-all flex items-center justify-center gap-1">
                                                                                            <Plus className="w-2.5 h-2.5" /> Ajouter une leçon
                                                                                        </button>
                                                                                    )}
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
                                    <CardContent className="p-5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                                <Award className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-black">{classroom?.name || '—'}</h2>
                                                {filiere && (<Badge className="mt-1 bg-gradient-to-r from-indigo-600 to-violet-600 border-none text-white text-[10px]">{filiere.nom} • {filiere.duree_mois} mois</Badge>)}
                                            </div>
                                        </div>
                                        {/* Sky Points Display */}
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Sky Points</span>
                                            <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                                                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                                <span className="font-black text-amber-400 text-lg">{fmt(profile?.sky_points || 0)}</span>
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
                                <h3 className="font-bold text-sm text-slate-300">📚 Matières & Programme ({subjects.length})</h3>
                                <div className="space-y-2">
                                    {subjects.map((sub: any, i: number) => {
                                        // Show published + completed chapters (not draft). If null status, show anyway.
                                        const subChapters = studentChapters.filter(c => c.subject_id === sub.id && (c.status === 'published' || c.status === 'completed' || !c.status)).sort((a, b) => a.position - b.position);
                                        const isExpSub = expandedStudentSub === sub.id;
                                        return (
                                            <motion.div key={sub.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                                                <Card className={cn("backdrop-blur-sm overflow-hidden transition-all", isExpSub ? "bg-linear-to-br from-indigo-500/10 to-violet-500/5 border-indigo-500/20" : "bg-white/[0.03] border-white/[0.06] hover:border-white/10")}>
                                                    <CardContent className="p-0">
                                                        <div className="p-3 flex items-center justify-between cursor-pointer" onClick={() => setExpandedStudentSub(isExpSub ? null : sub.id)}>
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="bg-indigo-500/20 p-1.5 rounded-lg"><BookOpen className="h-3.5 w-3.5 text-indigo-400" /></div>
                                                                <div>
                                                                    <p className="text-sm font-medium">{sub.name}</p>
                                                                    <p className="text-[10px] text-slate-500">Coef. {sub.coefficient || 1}{sub.teacher_profiles ? ` • ${sub.teacher_profiles.first_name} ${sub.teacher_profiles.last_name}` : ''} • {subChapters.length} ch.</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={cn("text-sm font-bold", gradesBySubject.find(gs => gs.subject.id === sub.id)?.count ? (gradesBySubject.find(gs => gs.subject.id === sub.id)!.average >= 10 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-600')}>
                                                                    {gradesBySubject.find(gs => gs.subject.id === sub.id)?.count ? gradesBySubject.find(gs => gs.subject.id === sub.id)!.average.toFixed(1) + '/20' : '—'}
                                                                </span>
                                                                {isExpSub ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                                                            </div>
                                                        </div>
                                                        {isExpSub && (
                                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t border-white/5 px-3 pb-3 space-y-2">
                                                                {subChapters.length === 0 && (
                                                                    <p className="text-xs text-slate-500 text-center py-4">📚 Aucun chapitre publié pour l&apos;instant</p>
                                                                )}
                                                                {subChapters.map((ch, ci) => {
                                                                    const chLessons = studentLessons.filter(l => l.chapter_id === ch.id).sort((a, b) => a.position - b.position);
                                                                    const hasLessons = chLessons.length > 0;
                                                                    const chImages = (ch.resources || []).filter((r: any) => r.type === 'image');
                                                                    const chFiles = (ch.resources || []).filter((r: any) => r.type === 'resource');
                                                                    const hasContent = ch.content || chImages.length > 0 || chFiles.length > 0 || hasLessons;
                                                                    const isExpCh = expandedStudentCh === ch.id;
                                                                    return (
                                                                        <div key={ch.id} className="mt-2">
                                                                            <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ci * 0.05 }}
                                                                                className={cn("flex items-center gap-2 p-2.5 rounded-xl transition-all", hasContent ? "cursor-pointer hover:bg-white/[0.03]" : "", isExpCh ? "bg-teal-500/5 border border-teal-500/10" : "bg-white/[0.02] border border-white/5")}
                                                                                onClick={() => hasContent && setExpandedStudentCh(isExpCh ? null : ch.id)}>
                                                                                <span className="text-xs font-mono text-slate-600 w-5 text-center">{ch.position}</span>
                                                                                {ch.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" /> : <Eye className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="text-xs font-medium truncate">{ch.title}</p>
                                                                                    {ch.description && <p className="text-[9px] text-slate-500 truncate">{ch.description}</p>}
                                                                                </div>
                                                                                {hasLessons && <Badge className="bg-purple-500/20 text-purple-400 border-none text-[8px]">{chLessons.length} leçon(s)</Badge>}
                                                                                {hasContent && (isExpCh ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />)}
                                                                            </motion.div>
                                                                            {isExpCh && hasContent && (
                                                                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 ml-7 space-y-3">
                                                                                    {/* Chapter content (only if no lessons) */}
                                                                                    {!hasLessons && ch.content && <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed p-3 rounded-xl bg-white/[0.02] border border-white/5">{ch.content}</div>}
                                                                                    {!hasLessons && chImages.length > 0 && (
                                                                                        <div><p className="text-[10px] text-slate-400 mb-1">🖼️ Supports</p><div className="grid grid-cols-2 gap-2">{chImages.map((r: any, ri: number) => <img key={ri} src={r.url} alt={r.name} className="w-full rounded-lg border border-white/10 object-cover" />)}</div></div>
                                                                                    )}
                                                                                    {!hasLessons && chFiles.length > 0 && (
                                                                                        <div><p className="text-[10px] text-slate-400 mb-1">📎 Ressources</p>{chFiles.map((r: any, ri: number) => (
                                                                                            <a key={ri} href={r.url} target="_blank" rel="noopener" className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/5 hover:border-teal-500/20 transition-all mb-1">
                                                                                                <FileText className="w-3 h-3 text-teal-400 shrink-0" /><span className="text-xs text-slate-300 truncate">{r.name}</span><Download className="w-3 h-3 text-slate-600 ml-auto" />
                                                                                            </a>
                                                                                        ))}</div>
                                                                                    )}
                                                                                    {/* Chapter Exercises */}
                                                                                    {exercises.filter(ex => ex.chapter_id === ch.id).length > 0 && (
                                                                                        <div className="mt-4 border-t border-white/5 pt-3">
                                                                                            <p className="text-[10px] text-orange-400 font-bold mb-2">📝 Exercices du chapitre</p>
                                                                                            {exercises.filter(ex => ex.chapter_id === ch.id).map(ex => (
                                                                                                <div key={ex.id} className="flex items-center justify-between p-2.5 rounded-lg bg-orange-500/5 border border-orange-500/10 mb-2">
                                                                                                    <div>
                                                                                                        <p className="text-xs font-bold text-orange-300">{ex.title}</p>
                                                                                                        <p className="text-[10px] text-slate-400">{ex.duration_minutes} min • {ex.questions?.length || 0} questions</p>
                                                                                                    </div>
                                                                                                    <Button size="sm" onClick={() => { setActiveExercise(ex); setExAnswers({}); setExTimeLeft(ex.duration_minutes * 60); setExResult(null); }} className="bg-orange-600 hover:bg-orange-700 text-[10px] h-7 rounded-lg">Commencer</Button>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                    {/* Lessons */}
                                                                                    {hasLessons && chLessons.map((lesson: any, li: number) => {
                                                                                        const lImages = (lesson.resources || []).filter((r: any) => r.type === 'image');
                                                                                        const lFiles = (lesson.resources || []).filter((r: any) => r.type === 'resource');
                                                                                        return (
                                                                                            <Card key={lesson.id} className="bg-purple-500/5 border-purple-500/10 overflow-hidden">
                                                                                                <CardContent className="p-3 space-y-2">
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <span className="text-[10px] font-mono text-slate-600">{lesson.position}</span>
                                                                                                        <p className="text-xs font-bold text-purple-300">{lesson.title}</p>
                                                                                                    </div>
                                                                                                    {lesson.content && <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{lesson.content}</div>}
                                                                                                    {lImages.length > 0 && <div className="grid grid-cols-2 gap-2">{lImages.map((r: any, ri: number) => <img key={ri} src={r.url} alt={r.name} className="w-full rounded-lg border border-white/10 object-cover" />)}</div>}
                                                                                                    {lFiles.length > 0 && lFiles.map((r: any, ri: number) => (
                                                                                                        <a key={ri} href={r.url} target="_blank" rel="noopener" className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/5 hover:border-purple-500/20 transition-all">
                                                                                                            <FileText className="w-3 h-3 text-purple-400 shrink-0" /><span className="text-[10px] text-slate-300 truncate">{r.name}</span><Download className="w-3 h-3 text-slate-600 ml-auto" />
                                                                                                        </a>
                                                                                                    ))}
                                                                                                    {/* Lesson Exercises */}
                                                                                                    {exercises.filter(ex => ex.lesson_id === lesson.id).length > 0 && (
                                                                                                        <div className="mt-3 border-t border-purple-500/10 pt-2">
                                                                                                            {exercises.filter(ex => ex.lesson_id === lesson.id).map(ex => (
                                                                                                                <div key={ex.id} className="flex items-center justify-between p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                                                                                                    <span className="text-xs font-bold text-orange-300">{ex.title}</span>
<Button size="sm" onClick={() => { setActiveExercise(ex); setExAnswers({}); setExTimeLeft(ex.duration_minutes * 60); setExResult(null); }} className="bg-orange-600 hover:bg-orange-700 text-[9px] h-6 px-2 rounded">Commencer</Button>
                                                                                                                </div>
                                                                                                            ))}
                                                                                                            <Button size="sm" variant="ghost" className="h-6 w-full text-[10px] text-orange-400 hover:text-orange-300 border border-orange-500/20" onClick={() => { setShowNewExercise({ type: 'lesson', id: lesson.id }); setExForm({ title: '', type: 'qcm', duration_minutes: 10, max_score: 20, questions: [] }); }}>
                                                                                                                <Plus className="w-3 h-3 mr-1" /> Ajouter exercice
                                                                                                            </Button>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </CardContent>
                                                                                            </Card>
                                                                                        );
                                                                                    })}
                                                                                    
                                                                                    {/* Teacher Exercise Form Modal */}
                                                                                    <AnimatePresence>
                                                                                        {showNewExercise && (
                                                                                            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                                                                                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg bg-slate-900 rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
                                                                                                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-orange-500/10 rounded-t-2xl">
                                                                                                        <h3 className="font-bold text-orange-400 flex items-center gap-2"><PenSquare className="w-4 h-4" /> Créer un exercice</h3>
                                                                                                        <button onClick={() => setShowNewExercise(null)} className="p-1 rounded-lg hover:bg-white/10 text-slate-400"><X className="w-4 h-4" /></button>
                                                                                                    </div>
                                                                                                    <div className="p-4 overflow-y-auto space-y-4">
                                                                                                        <div className="grid grid-cols-2 gap-3">
                                                                                                            <div className="col-span-2">
                                                                                                                <Label className="text-xs text-slate-400">Titre de l'exercice</Label>
                                                                                                                <Input value={exForm.title} onChange={e => setExForm({ ...exForm, title: e.target.value })} className="bg-white/5 border-white/10 mt-1" />
                                                                                                            </div>
                                                                                                            <div>
                                                                                                                <Label className="text-xs text-slate-400">Type</Label>
                                                                                                                <select value={exForm.type} onChange={e => setExForm({ ...exForm, type: e.target.value, questions: [] })} className="w-full mt-1 bg-slate-800 border-white/10 rounded-md h-10 px-3 text-sm text-white">
                                                                                                                    <option value="qcm">QCM</option>
                                                                                                                    <option value="quiz">Quiz (Réponse courte)</option>
                                                                                                                    <option value="qa">Question / Réponse</option>
                                                                                                                    <option value="open">Question Ouverte</option>
                                                                                                                </select>
                                                                                                            </div>
                                                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                                                <div>
                                                                                                                    <Label className="text-xs text-slate-400">Durée (min)</Label>
                                                                                                                    <Input type="number" value={exForm.duration_minutes} onChange={e => setExForm({ ...exForm, duration_minutes: parseInt(e.target.value) || 10 })} className="bg-white/5 border-white/10 mt-1" />
                                                                                                                </div>
                                                                                                                <div>
                                                                                                                    <Label className="text-xs text-slate-400">Note Max</Label>
                                                                                                                    <Input type="number" value={exForm.max_score} onChange={e => setExForm({ ...exForm, max_score: parseFloat(e.target.value) || 20 })} className="bg-white/5 border-white/10 mt-1" />
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                        <div className="border-t border-white/10 pt-4">
                                                                                                            <div className="flex items-center justify-between mb-2">
                                                                                                                <Label className="text-sm font-bold text-slate-300">Questions</Label>
                                                                                                                <Button size="sm" variant="outline" className="h-7 text-xs border-white/10" onClick={() => {
                                                                                                                    const emptyQ = exForm.type === 'qcm' ? { q: '', options: ['', ''], answer: 0 } : { q: '', answer: '' };
                                                                                                                    setExForm({ ...exForm, questions: [...exForm.questions, emptyQ] });
                                                                                                                }}><Plus className="w-3 h-3 mr-1" /> Ajouter question</Button>
                                                                                                            </div>
                                                                                                            <div className="space-y-3">
                                                                                                                {exForm.questions.map((q, i) => (
                                                                                                                    <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/10">
                                                                                                                        <div className="flex justify-between items-start mb-2">
                                                                                                                            <span className="text-xs font-bold text-orange-400">Question {i + 1}</span>
                                                                                                                            <button onClick={() => setExForm({ ...exForm, questions: exForm.questions.filter((_, idx) => idx !== i) })} className="text-red-400"><Trash2 className="w-3 h-3" /></button>
                                                                                                                        </div>
                                                                                                                        <Input placeholder="Votre question..." value={q.q} onChange={e => { const nq = [...exForm.questions]; nq[i].q = e.target.value; setExForm({ ...exForm, questions: nq }); }} className="bg-slate-900 border-white/10 mb-2 h-8 text-xs" />
                                                                                                                        {exForm.type === 'qcm' && (
                                                                                                                            <div className="space-y-2 pl-4 border-l-2 border-white/10">
                                                                                                                                {q.options.map((opt: string, oi: number) => (
                                                                                                                                    <div key={oi} className="flex items-center gap-2">
                                                                                                                                        <input type="radio" checked={q.answer === oi} onChange={() => { const nq = [...exForm.questions]; nq[i].answer = oi; setExForm({ ...exForm, questions: nq }); }} name={`q-${i}`} />
                                                                                                                                        <Input placeholder={`Option ${oi + 1}`} value={opt} onChange={e => { const nq = [...exForm.questions]; nq[i].options[oi] = e.target.value; setExForm({ ...exForm, questions: nq }); }} className="bg-slate-900 border-white/10 h-7 text-xs flex-1" />
                                                                                                                                        <button onClick={() => { const nq = [...exForm.questions]; nq[i].options = nq[i].options.filter((_:any, oidx:number) => oidx !== oi); setExForm({ ...exForm, questions: nq }); }} className="text-red-400"><X className="w-3 h-3" /></button>
                                                                                                                                    </div>
                                                                                                                                ))}
                                                                                                                                <button onClick={() => { const nq = [...exForm.questions]; nq[i].options.push(''); setExForm({ ...exForm, questions: nq }); }} className="text-[10px] text-slate-400 hover:text-white">+ Ajouter option</button>
                                                                                                                            </div>
                                                                                                                        )}
                                                                                                                        {(exForm.type === 'quiz' || exForm.type === 'qa') && (
                                                                                                                            <Input placeholder="Réponse attendue" value={q.answer} onChange={e => { const nq = [...exForm.questions]; nq[i].answer = e.target.value; setExForm({ ...exForm, questions: nq }); }} className="bg-slate-900 border-emerald-500/30 text-emerald-400 h-8 text-xs" />
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                ))}
                                                                                                                {exForm.questions.length === 0 && <p className="text-xs text-slate-500 text-center py-4">Aucune question ajoutée.</p>}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="p-4 border-t border-white/10 bg-white/5 flex gap-2 justify-end rounded-b-2xl">
                                                                                                        <Button variant="ghost" onClick={() => setShowNewExercise(null)}>Annuler</Button>
                                                                                                        <Button onClick={createExercise} disabled={savingEx || !exForm.title || exForm.questions.length === 0} className="bg-orange-600 hover:bg-orange-700 text-white">
                                                                                                            {savingEx ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Enregistrer
                                                                                                        </Button>
                                                                                                    </div>
                                                                                                </motion.div>
                                                                                            </div>
                                                                                        )}
                                                                                    </AnimatePresence>
                                                                                </motion.div>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                })}
                                                                {subChapters.length === 0 && <p className="text-xs text-slate-600 text-center py-3 mt-2">Programme pas encore disponible</p>}
                                                            </motion.div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        );
                                    })}
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
                
                {/* ═══ STUDENT EXERCISE MODAL ═══ */}
                <AnimatePresence>
                    {activeExercise && !isTeacher && (
                        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col">
                            <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-slate-900/50">
                                <div>
                                    <h2 className="font-bold text-lg text-white">{activeExercise.title}</h2>
                                    <p className="text-xs text-slate-400">/{activeExercise.max_score} points</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    {!exResult && (
                                        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                                            <Timer className={cn("w-4 h-4", exTimeLeft < 60 ? "text-red-400 animate-pulse" : "text-slate-400")} />
                                            <span className={cn("font-mono font-bold", exTimeLeft < 60 ? "text-red-400" : "text-white")}>
                                                {Math.floor(exTimeLeft / 60).toString().padStart(2, '0')}:{(exTimeLeft % 60).toString().padStart(2, '0')}
                                            </span>
                                        </div>
                                    )}
                                    {exResult ? (
                                        <Button variant="outline" onClick={() => setActiveExercise(null)}>Fermer</Button>
                                    ) : (
                                        <Button onClick={submitExercise} disabled={exSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                            {exSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Terminer
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="max-w-3xl mx-auto space-y-6">
                                    {exResult && (
                                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-indigo-900/40 to-purple-900/20 border border-indigo-500/30 rounded-2xl p-8 text-center shadow-2xl">
                                            <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                                            <h2 className="text-3xl font-black text-white mb-2">Exercice terminé !</h2>
                                            {activeExercise.type === 'qcm' || activeExercise.type === 'quiz' ? (
                                                <>
                                                    <p className="text-slate-300 mb-6">Votre score est de :</p>
                                                    <div className="inline-flex items-end gap-2 text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                                                        {exResult.score} <span className="text-2xl text-slate-500">/ {activeExercise.max_score}</span>
                                                    </div>
                                                    {exResult.score > 0 && (
                                                        <div className="mt-6 flex items-center justify-center gap-2 text-amber-400 font-bold bg-amber-500/10 px-4 py-2 rounded-full w-max mx-auto">
                                                            <Star className="w-5 h-5 fill-amber-400" /> +{Math.round(exResult.score)} Sky Points
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-slate-300">Vos réponses ont été soumises et seront corrigées par votre professeur.</p>
                                            )}
                                        </motion.div>
                                    )}
                                    
                                    {!exResult && activeExercise.questions?.map((q: any, i: number) => (
                                        <Card key={i} className="bg-slate-900/50 border-white/10">
                                            <CardContent className="p-6">
                                                <h3 className="font-bold text-lg mb-4 text-white"><span className="text-indigo-400 mr-2">{i + 1}.</span> {q.q}</h3>
                                                {activeExercise.type === 'qcm' && (
                                                    <div className="space-y-3">
                                                        {q.options?.map((opt: string, oi: number) => (
                                                            <label key={oi} className={cn("flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all", exAnswers[i] === oi ? "bg-indigo-500/20 border-indigo-500/50" : "bg-white/5 border-white/10 hover:bg-white/10")}>
                                                                <input type="radio" name={`q-${i}`} checked={exAnswers[i] === oi} onChange={() => setExAnswers(prev => ({ ...prev, [i]: oi }))} className="w-4 h-4 text-indigo-500 bg-slate-900 border-white/20 focus:ring-indigo-500" />
                                                                <span className="text-sm">{opt}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                                {activeExercise.type === 'quiz' && (
                                                    <Input placeholder="Votre réponse courte..." value={exAnswers[i] || ''} onChange={e => setExAnswers(prev => ({ ...prev, [i]: e.target.value }))} className="bg-white/5 border-white/10 h-12 text-base" />
                                                )}
                                                {(activeExercise.type === 'open' || activeExercise.type === 'qa') && (
                                                    <Textarea placeholder="Rédigez votre réponse détaillée..." value={exAnswers[i] || ''} onChange={e => setExAnswers(prev => ({ ...prev, [i]: e.target.value }))} className="bg-white/5 border-white/10 min-h-[150px] resize-y text-base p-4" />
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </AnimatePresence>
        </div>
    );
}
