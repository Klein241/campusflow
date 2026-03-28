'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Lock, BookOpen, BarChart3, Calendar, CreditCard, Loader2,
    Award, TrendingUp, Clock, FileText, CircleDollarSign,
    CheckCircle2, AlertCircle, ChevronRight, Printer, ArrowLeft,
    Star, Trophy, ShieldCheck, Download
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
// Cursus, Bulletin, EDT, Paiements + PDF export
// ═══════════════════════════════════════════════════════

type MySpaceTab = 'cursus' | 'bulletin' | 'edt' | 'paiements';
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
}

export function MySpaceView({ orgId, orgSlug, userId, userName, userRole, orgName, orgLogo, orgPhone, orgEmail, orgCity, orgCountry }: MySpaceViewProps) {
    const [pinVerified, setPinVerified] = useState(false);
    const [pin, setPin] = useState(['', '', '', '']);
    const [verifying, setVerifying] = useState(false);
    const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

    const [activeTab, setActiveTab] = useState<MySpaceTab>('cursus');
    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState<any>(null);
    const [classroom, setClassroom] = useState<any>(null);
    const [filiere, setFiliere] = useState<any>(null);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [timetableSlots, setTimetableSlots] = useState<any[]>([]);
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);

    const printRef = useRef<HTMLDivElement>(null);

    // ═══ PIN INPUT HANDLER ═══
    const handlePinInput = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const digit = value.slice(-1);
        setPin(prev => { const n = [...prev]; n[index] = digit; return n; });
        if (digit && index < 3) pinRefs[index + 1].current?.focus();
    };
    const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) pinRefs[index - 1].current?.focus();
    };

    // ═══ VERIFY PIN ═══
    const verifyPin = async () => {
        const pinStr = pin.join('');
        if (pinStr.length !== 4) return;
        setVerifying(true);
        try {
            const { data: isValid, error } = await supabase.rpc('verify_pin', {
                p_profile_id: userId,
                p_role: userRole,
                p_pin: pinStr,
            });
            if (error) throw error;
            if (isValid) {
                setPinVerified(true);
                toast.success('Accès autorisé ✅');
            } else {
                toast.error('PIN incorrect');
                setPin(['', '', '', '']);
                setTimeout(() => pinRefs[0].current?.focus(), 100);
            }
        } catch (e: any) {
            toast.error(e.message || 'Erreur de vérification');
        }
        setVerifying(false);
    };

    // Auto-verify when 4 digits are entered
    useEffect(() => {
        if (pin.join('').length === 4 && !pinVerified) verifyPin();
    }, [pin]);

    // ═══ LOAD DATA (after PIN verified) ═══
    useEffect(() => {
        if (!pinVerified) return;
        (async () => {
            setLoading(true);
            const table = userRole === 'teacher' ? 'teacher_profiles' : 'student_profiles';
            const { data: profile } = await supabase.from(table).select('*').eq('id', userId).single();
            setStudent(profile);

            if (profile?.classroom_id) {
                const { data: cls } = await supabase.from('classrooms').select('*, filieres:filiere_id(*)').eq('id', profile.classroom_id).single();
                setClassroom(cls);
                if (cls?.filieres) setFiliere(cls.filieres);

                const { data: subs } = await supabase.from('subjects').select('*, teacher_profiles:teacher_id(first_name, last_name)')
                    .eq('classroom_id', profile.classroom_id).order('name');
                setSubjects(subs || []);

                const { data: slots } = await supabase.from('timetable_slots')
                    .select('*, subjects:subject_id(name), classrooms:classroom_id(name)')
                    .eq('classroom_id', profile.classroom_id).order('start_time');
                setTimetableSlots(slots || []);

                const { data: evs } = await supabase.from('evaluations').select('*, subjects:subject_id(name)')
                    .eq('classroom_id', profile.classroom_id).order('created_at', { ascending: false });
                setEvaluations(evs || []);

                const { data: grs } = await supabase.from('grades')
                    .select('*, evaluations:evaluation_id(title, max_score, type, subject_id, subjects:subject_id(name))')
                    .eq('student_id', userId);
                setGrades(grs || []);
            }

            const { data: pays } = await supabase.from('school_payments').select('*')
                .eq('student_id', userId).order('paid_at', { ascending: false });
            setPayments(pays || []);

            setLoading(false);
        })();
    }, [pinVerified, userId, userRole]);

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

    // ═══ TIMETABLE PDF ═══
    const printTimetable = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) { toast.error('Activez les pop-ups'); return; }

        let rows = '';
        DAYS.forEach((day, di) => {
            const slots = timetableSlots.filter((s: any) => s.day_of_week === di + 1);
            if (slots.length === 0) return;
            rows += `<tr style="background:#f0fdfa"><td colspan="3" style="font-weight:bold;color:#0d9488;padding:10px">${day}</td></tr>`;
            slots.forEach((s: any) => {
                rows += `<tr><td>${s.start_time?.slice(0, 5)} - ${s.end_time?.slice(0, 5)}</td><td>${s.subjects?.name || '—'}</td><td>${s.room || '—'}</td></tr>`;
            });
        });

        printWindow.document.write(`
            <!DOCTYPE html><html><head><title>Emploi du temps — ${orgName}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; padding: 20mm; font-size: 11pt; }
                .header { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #14b8a6; padding-bottom: 16px; margin-bottom: 20px; }
                .header img { width: 60px; height: 60px; object-fit: contain; border-radius: 8px; }
                .header-text h1 { font-size: 18pt; color: #0d9488; margin-bottom: 4px; }
                .header-text p { font-size: 9pt; color: #64748b; }
                .title { font-size: 16pt; font-weight: bold; color: #0f172a; margin: 20px 0 15px; text-align: center; text-transform: uppercase; }
                .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; padding: 12px; background: #f1f5f9; border-radius: 8px; font-size: 10pt; }
                .student-info .label { color: #64748b; } .student-info .value { font-weight: 600; }
                table { width: 100%; border-collapse: collapse; margin: 12px 0; }
                th { background: #0d9488; color: white; padding: 10px 8px; text-align: left; font-size: 10pt; }
                td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 10pt; }
                tr:nth-child(even) { background: #f8fafc; }
                .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 8pt; color: #94a3b8; }
                @media print { body { padding: 15mm; } }
            </style></head><body>
            <div class="header">
                ${orgLogo ? `<img src="${orgLogo}" alt="${orgName}" />` : ''}
                <div class="header-text"><h1>${orgName}</h1><p>${orgCity || ''}${orgCity && orgCountry ? ', ' : ''}${orgCountry || ''}</p>
                ${orgPhone ? `<p>Tél: ${orgPhone}</p>` : ''}${orgEmail ? `<p>Email: ${orgEmail}</p>` : ''}</div>
            </div>
            <div class="title">EMPLOI DU TEMPS</div>
            <div class="student-info">
                <div><span class="label">Nom : </span><span class="value">${student?.first_name} ${student?.last_name}</span></div>
                <div><span class="label">Classe : </span><span class="value">${classroom?.name || '—'}</span></div>
            </div>
            <table><thead><tr><th>Horaire</th><th>Matière</th><th>Salle</th></tr></thead><tbody>${rows}</tbody></table>
            <div class="footer"><p>Document généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} — ${orgName} — CampusFlow</p></div>
            </body></html>`);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    };

    // ═══ PRINT PDF FUNCTION (bulletin + paiements) ═══
    const printDocument = (title: string) => {
        const printContent = printRef.current;
        if (!printContent) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) { toast.error('Activez les pop-ups pour imprimer'); return; }
        printWindow.document.write(`<!DOCTYPE html><html><head><title>${title} — ${orgName}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; padding: 20mm; font-size: 11pt; }
                .header { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #14b8a6; padding-bottom: 16px; margin-bottom: 20px; }
                .header img { width: 60px; height: 60px; object-fit: contain; border-radius: 8px; }
                .header-text h1 { font-size: 18pt; color: #0d9488; margin-bottom: 4px; }
                .header-text p { font-size: 9pt; color: #64748b; }
                .title { font-size: 16pt; font-weight: bold; color: #0f172a; margin: 20px 0 10px; text-align: center; }
                .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; padding: 12px; background: #f1f5f9; border-radius: 8px; font-size: 10pt; }
                .student-info .label { color: #64748b; } .student-info .value { font-weight: 600; }
                table { width: 100%; border-collapse: collapse; margin: 12px 0; }
                th { background: #0d9488; color: white; padding: 10px 8px; text-align: left; font-size: 10pt; }
                td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 10pt; }
                tr:nth-child(even) { background: #f8fafc; }
                .avg-cell { font-weight: bold; } .avg-good { color: #059669; } .avg-bad { color: #dc2626; }
                .total-row { background: #0d9488 !important; color: white; font-weight: bold; }
                .total-row td { border: none; }
                .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 8pt; color: #94a3b8; }
                .stamp-area { margin-top: 40px; display: flex; justify-content: space-between; }
                .stamp-area div { text-align: center; width: 45%; }
                .stamp-area .line { border-top: 1px solid #94a3b8; margin-top: 50px; padding-top: 4px; font-size: 9pt; color: #64748b; }
                @media print { body { padding: 15mm; } }
            </style></head><body>
            <div class="header">
                ${orgLogo ? `<img src="${orgLogo}" alt="${orgName}" />` : ''}
                <div class="header-text"><h1>${orgName}</h1>
                <p>${orgCity || ''}${orgCity && orgCountry ? ', ' : ''}${orgCountry || ''}</p>
                ${orgPhone ? `<p>Tél: ${orgPhone}</p>` : ''}${orgEmail ? `<p>Email: ${orgEmail}</p>` : ''}
                </div>
            </div>
            ${printContent.innerHTML}
            <div class="stamp-area"><div><p style="font-size:9pt;color:#64748b">L'étudiant(e)</p><div class="line">Signature</div></div><div><p style="font-size:9pt;color:#64748b">Le Directeur</p><div class="line">Cachet & Signature</div></div></div>
            <div class="footer"><p>Document généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} — ${orgName} — CampusFlow</p></div>
            </body></html>`);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
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
                    <p className="text-sm text-slate-400 mb-8">Entrez votre PIN à 4 chiffres pour accéder à vos données académiques</p>

                    <div className="flex justify-center gap-4 mb-8">
                        {pin.map((digit, i) => (
                            <input
                                key={i}
                                ref={pinRefs[i]}
                                type="password"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={e => handlePinInput(i, e.target.value)}
                                onKeyDown={e => handlePinKeyDown(i, e)}
                                className={cn(
                                    "w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-white/5 text-white outline-none transition-all duration-300",
                                    digit ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20" : "border-white/10 focus:border-indigo-500/50"
                                )}
                                autoFocus={i === 0}
                            />
                        ))}
                    </div>

                    {verifying && (
                        <div className="flex items-center justify-center gap-2 text-indigo-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Vérification...</span>
                        </div>
                    )}
                </motion.div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    // ═══ MY SPACE CONTENT ═══
    return (
        <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/5 overflow-x-auto scrollbar-thin">
                {[
                    { id: 'cursus' as MySpaceTab, label: 'Cursus', icon: BookOpen },
                    { id: 'bulletin' as MySpaceTab, label: 'Bulletin', icon: BarChart3 },
                    { id: 'edt' as MySpaceTab, label: 'Horaires', icon: Calendar },
                    { id: 'paiements' as MySpaceTab, label: 'Paiements', icon: CreditCard },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap px-2",
                            activeTab === tab.id
                                ? 'bg-gradient-to-r from-indigo-600/20 to-violet-600/20 text-indigo-300 border border-indigo-500/20 shadow-lg shadow-indigo-600/10'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        )}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {/* ═══ CURSUS ═══ */}
                {activeTab === 'cursus' && (
                    <motion.div key="cursus" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="space-y-4">
                        {/* Welcome card */}
                        <Card className="bg-gradient-to-br from-indigo-500/10 to-violet-500/5 border-indigo-500/20 backdrop-blur-sm overflow-hidden">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                        <Award className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black">{classroom?.name || '—'}</h2>
                                        {filiere && (
                                            <Badge className="mt-1 bg-gradient-to-r from-indigo-600 to-violet-600 border-none text-white text-[10px]">
                                                {filiere.nom} • {filiere.duree_mois} mois
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { l: 'Moyenne', v: overallAvg > 0 ? overallAvg.toFixed(1) : '—', unit: '/20', icon: BarChart3, color: 'indigo' },
                                { l: 'Matières', v: subjects.length, unit: '', icon: BookOpen, color: 'teal' },
                                { l: 'Total payé', v: fmt(totalPaid), unit: '', icon: CreditCard, color: 'emerald' },
                            ].map((s, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                                    <Card className={cn("bg-card/50 backdrop-blur-sm shadow-sm relative overflow-hidden group",
                                        s.color === 'indigo' ? 'border-indigo-500/20' : s.color === 'teal' ? 'border-teal-500/20' : 'border-emerald-500/20'
                                    )}>
                                        <CardContent className="flex flex-col items-center justify-center p-4">
                                            <s.icon className={cn("h-5 w-5 mb-2",
                                                s.color === 'indigo' ? 'text-indigo-500' : s.color === 'teal' ? 'text-teal-500' : 'text-emerald-500'
                                            )} />
                                            <span className="text-lg font-black">{s.v}<span className="text-xs font-normal text-muted-foreground">{s.unit}</span></span>
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">{s.l}</span>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>

                        {/* Subjects list */}
                        <h3 className="font-bold text-sm text-slate-300">📚 Matières ({subjects.length})</h3>
                        <div className="space-y-2">
                            {subjects.map((sub: any, i: number) => (
                                <motion.div key={sub.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                                    <Card className="bg-white/[0.03] border-white/[0.06] hover:border-white/10 transition-all">
                                        <CardContent className="p-3 flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium">{sub.name}</p>
                                                <p className="text-[10px] text-slate-500">
                                                    Coef. {sub.coefficient || 1}
                                                    {sub.teacher_profiles ? ` • ${sub.teacher_profiles.first_name} ${sub.teacher_profiles.last_name}` : ''}
                                                </p>
                                            </div>
                                            <span className={cn("text-sm font-bold",
                                                gradesBySubject.find(gs => gs.subject.id === sub.id)?.count
                                                    ? (gradesBySubject.find(gs => gs.subject.id === sub.id)!.average >= 10 ? 'text-emerald-400' : 'text-red-400')
                                                    : 'text-slate-600'
                                            )}>
                                                {gradesBySubject.find(gs => gs.subject.id === sub.id)?.count
                                                    ? gradesBySubject.find(gs => gs.subject.id === sub.id)!.average.toFixed(1) + '/20'
                                                    : '—'}
                                            </span>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* ═══ BULLETIN ═══ */}
                {activeTab === 'bulletin' && (
                    <motion.div key="bulletin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="space-y-4">
                        {/* Print Button */}
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm text-slate-300">📊 Bulletin de notes</h3>
                            <Button size="sm" onClick={() => printDocument('Bulletin de notes')}
                                className="bg-gradient-to-r from-indigo-600 to-violet-600 text-xs rounded-xl shadow-lg shadow-indigo-600/20">
                                <Printer className="w-3.5 h-3.5 mr-1" /> Exporter PDF
                            </Button>
                        </div>

                        {/* Overall average */}
                        <Card className={cn("backdrop-blur-sm overflow-hidden text-center",
                            overallAvg >= 10 ? "bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20" :
                                overallAvg > 0 ? "bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/20" :
                                    "bg-card/50 border-white/10"
                        )}>
                            <CardContent className="p-5">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Moyenne générale</p>
                                <p className={cn("text-4xl font-black mt-1",
                                    overallAvg >= 10 ? "text-emerald-400" : overallAvg > 0 ? "text-red-400" : "text-slate-500"
                                )}>
                                    {overallAvg > 0 ? overallAvg.toFixed(2) : '—'}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">/20 • {gradesBySubject.filter(gs => gs.count > 0).length} matière(s)</p>
                            </CardContent>
                        </Card>

                        {/* Per subject grades */}
                        {gradesBySubject.map((gs, i) => (
                            <motion.div key={gs.subject.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                                <Card className="bg-card/50 backdrop-blur-sm border-white/10 overflow-hidden">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <h3 className="font-bold text-sm">{gs.subject.name}</h3>
                                                <p className="text-[10px] text-muted-foreground">
                                                    Coef. {gs.subject.coefficient || 1}
                                                    {gs.subject.teacher_profiles ? ` • ${gs.subject.teacher_profiles.first_name} ${gs.subject.teacher_profiles.last_name}` : ''}
                                                </p>
                                            </div>
                                            <span className={cn("text-lg font-black",
                                                gs.count > 0 ? (gs.average >= 10 ? "text-emerald-400" : "text-red-400") : "text-slate-600"
                                            )}>
                                                {gs.count > 0 ? gs.average.toFixed(1) : '—'}
                                            </span>
                                        </div>
                                        {gs.count > 0 && <Progress value={(gs.average / 20) * 100} className="h-2 mb-2" />}
                                        {gs.grades.map((g: any) => (
                                            <div key={g.id} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-white/5">
                                                <span className="text-slate-400">{g.evaluations?.title} ({g.evaluations?.type})</span>
                                                <span className={cn("font-bold",
                                                    g.score >= (g.evaluations?.max_score || 20) / 2 ? "text-emerald-400" : "text-red-400"
                                                )}>
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

                        {/* Hidden printable content */}
                        <div ref={printRef} className="hidden">
                            <div className="title">BULLETIN DE NOTES</div>
                            <div className="student-info">
                                <div><span className="label">Nom : </span><span className="value">{student?.first_name} {student?.last_name}</span></div>
                                <div><span className="label">Matricule : </span><span className="value">{student?.matricule || '—'}</span></div>
                                <div><span className="label">Classe : </span><span className="value">{classroom?.name || '—'}</span></div>
                                <div><span className="label">Filière : </span><span className="value">{filiere?.nom || '—'}</span></div>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Matière</th>
                                        <th>Coef.</th>
                                        <th>Professeur</th>
                                        <th>Moy./20</th>
                                        <th>Appréciation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gradesBySubject.map(gs => (
                                        <tr key={gs.subject.id}>
                                            <td>{gs.subject.name}</td>
                                            <td>{gs.subject.coefficient || 1}</td>
                                            <td>{gs.subject.teacher_profiles ? `${gs.subject.teacher_profiles.first_name} ${gs.subject.teacher_profiles.last_name}` : '—'}</td>
                                            <td className={`avg-cell ${gs.count > 0 ? (gs.average >= 10 ? 'avg-good' : 'avg-bad') : ''}`}>
                                                {gs.count > 0 ? gs.average.toFixed(2) : '—'}
                                            </td>
                                            <td>{gs.count > 0 ? (gs.average >= 16 ? 'Excellent' : gs.average >= 14 ? 'Très bien' : gs.average >= 12 ? 'Bien' : gs.average >= 10 ? 'Passable' : 'Insuffisant') : '—'}</td>
                                        </tr>
                                    ))}
                                    <tr className="total-row">
                                        <td colSpan={3}>MOYENNE GÉNÉRALE</td>
                                        <td>{overallAvg > 0 ? overallAvg.toFixed(2) : '—'}</td>
                                        <td>{overallAvg >= 16 ? 'Excellent' : overallAvg >= 14 ? 'Très bien' : overallAvg >= 12 ? 'Bien' : overallAvg >= 10 ? 'Passable' : overallAvg > 0 ? 'Insuffisant' : '—'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {/* ═══ EMPLOI DU TEMPS ═══ */}
                {activeTab === 'edt' && (
                    <motion.div key="edt" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="space-y-4">
                    <h3 className="font-bold text-sm text-slate-300">📅 Emploi du temps — {classroom?.name}</h3>
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm text-slate-300">📅 Emploi du temps</h3>
                            {timetableSlots.length > 0 && (
                                <Button size="sm" onClick={printTimetable}
                                    className="bg-gradient-to-r from-indigo-600 to-violet-600 text-xs rounded-xl shadow-lg shadow-indigo-600/20">
                                    <Printer className="w-3.5 h-3.5 mr-1" /> Exporter PDF
                                </Button>
                            )}
                        </div>
                        {DAYS.map((day, di) => {
                            const slots = timetableSlots.filter((s: any) => s.day_of_week === di + 1);
                            const isToday = (today === 0 ? 7 : today) === di + 1;
                            return (
                                <motion.div key={di} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * di }}>
                                    <Card className={cn("backdrop-blur-sm overflow-hidden",
                                        isToday ? "bg-gradient-to-br from-indigo-500/10 to-violet-500/5 border-indigo-500/20" : "bg-card/50 border-white/5"
                                    )}>
                                        <CardContent className="p-4">
                                            <h3 className={cn("font-bold text-sm mb-2", isToday ? "text-indigo-400" : "text-slate-400")}>
                                                {day} {isToday && <Badge className="ml-2 bg-indigo-500/20 text-indigo-400 border-none text-[9px]">Aujourd'hui</Badge>}
                                            </h3>
                                            {slots.length === 0 ? <p className="text-xs text-slate-600">Pas de cours</p> : (
                                                <div className="space-y-1.5">
                                                    {slots.map((s: any) => (
                                                        <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5">
                                                            <span className="text-indigo-400 font-mono text-xs font-bold w-20">{s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)}</span>
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

                {/* ═══ PAIEMENTS ═══ */}
                {activeTab === 'paiements' && (
                    <motion.div key="paiements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm text-slate-300">💰 Historique des paiements</h3>
                            {payments.length > 0 && (
                                <Button size="sm" onClick={() => printDocument('Reçu de paiement')}
                                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-xs rounded-xl shadow-lg shadow-emerald-600/20">
                                    <Printer className="w-3.5 h-3.5 mr-1" /> Exporter PDF
                                </Button>
                            )}
                        </div>

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
                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
                                                p.payment_method === 'momo' ? 'bg-yellow-500/20' : p.payment_method === 'orange_money' ? 'bg-orange-500/20' : 'bg-emerald-500/20')}>
                                                <CircleDollarSign className={cn("w-5 h-5",
                                                    p.payment_method === 'momo' ? 'text-yellow-400' : p.payment_method === 'orange_money' ? 'text-orange-400' : 'text-emerald-400')} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{p.description || 'Scolarité'}</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {p.payment_method === 'momo' ? 'MTN MoMo' : p.payment_method === 'orange_money' ? 'Orange Money' : 'Espèces'}
                                                    {' • '}{new Date(p.paid_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-black text-emerald-400">{fmt(p.amount)}</span>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )) : (
                            <div className="text-center py-12 text-slate-500">
                                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p className="text-sm">Aucun paiement</p>
                            </div>
                        )}

                        {/* Hidden printable payment receipt */}
                        <div ref={printRef} className="hidden">
                            <div className="title">REÇU DE PAIEMENT</div>
                            <div className="student-info">
                                <div><span className="label">Nom : </span><span className="value">{student?.first_name} {student?.last_name}</span></div>
                                <div><span className="label">Matricule : </span><span className="value">{student?.matricule || '—'}</span></div>
                                <div><span className="label">Classe : </span><span className="value">{classroom?.name || '—'}</span></div>
                                <div><span className="label">Filière : </span><span className="value">{filiere?.nom || '—'}</span></div>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Description</th>
                                        <th>Mode</th>
                                        <th>Montant (XAF)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map((p: any) => (
                                        <tr key={p.id}>
                                            <td>{new Date(p.paid_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                                            <td>{p.description || 'Scolarité'}</td>
                                            <td>{p.payment_method === 'momo' ? 'MTN MoMo' : p.payment_method === 'orange_money' ? 'Orange Money' : 'Espèces'}</td>
                                            <td style={{ fontWeight: 'bold' }}>{fmt(p.amount)}</td>
                                        </tr>
                                    ))}
                                    <tr className="total-row">
                                        <td colSpan={3}>TOTAL</td>
                                        <td>{fmt(totalPaid)} XAF</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
