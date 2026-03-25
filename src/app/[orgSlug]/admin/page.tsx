'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GraduationCap, Plus, Trash2, ArrowRight, ArrowLeft, BookOpen, Users, Settings, Calendar, CreditCard, Home, School, CheckCircle2, Loader2, Link2, Bell, ShieldCheck, UserPlus, ClipboardList, Globe, BookMarked, ShoppingBag, MessageSquare, BarChart3, Search, Edit, Save, X, Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type Tab = 'general' | 'setup' | 'classes' | 'subjects' | 'teachers' | 'students' | 'timetable' | 'evaluations' | 'grades' | 'payments' | 'disciplines';
interface Cls { id?: string; name: string; cycle: string; filiere_id: string | null; level: number; capacity: number; }
interface Sub { id?: string; name: string; code: string; coefficient: number; classroom_id: string; teacher_id: string | null; }

const SIDES = [
    { id: 'general' as Tab, icon: Home, label: 'Général' }, { id: 'setup' as Tab, icon: Settings, label: 'Configuration' },
    { id: 'classes' as Tab, icon: School, label: 'Classes' }, { id: 'subjects' as Tab, icon: BookOpen, label: 'Matières' },
    { id: 'teachers' as Tab, icon: Users, label: 'Professeurs' }, { id: 'students' as Tab, icon: GraduationCap, label: 'Étudiants' },
    { id: 'timetable' as Tab, icon: Calendar, label: 'Emploi du temps' }, { id: 'evaluations' as Tab, icon: ClipboardList, label: 'Évaluations' },
    { id: 'grades' as Tab, icon: BarChart3, label: 'Notes' },
    { id: 'payments' as Tab, icon: CreditCard, label: 'Paiements' }, { id: 'disciplines' as Tab, icon: ShieldCheck, label: 'Discipline' },
];
const COLLEGE = ['6ème', '5ème', '4ème', '3ème'], LYCEE = ['Seconde', 'Première', 'Terminale'], SECS = ['A', 'B', 'C'];
const DEFS: Record<string, string[]> = { college: ['Mathématiques', 'Français', 'Anglais', 'SVT', 'Physique-Chimie', 'Histoire-Géo', 'Informatique', 'EPS'], lycee: ['Mathématiques', 'Français', 'Anglais', 'Physique', 'Chimie', 'SVT', 'Philosophie', 'Histoire-Géo', 'Informatique', 'EPS'], universite: ['Module 1', 'Module 2', 'Module 3', 'Projet tutoré', 'Stage'], centre_formation: ['Cours théorique', 'Travaux pratiques', 'Stage professionnel', 'Projet fin de formation'], institut: ['Cours fondamental', 'Spécialisation', 'Travaux pratiques', 'Stage'] };
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function AdminPage() {
    const { orgSlug } = useParams<{ orgSlug: string }>();
    const router = useRouter();
    const [org, setOrg] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>('general');
    const [step, setStep] = useState(0);
    const [cls, setCls] = useState<Cls[]>([]);
    const [subs, setSubs] = useState<Sub[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [newName, setNewName] = useState('');
    const [newSub, setNewSub] = useState('');
    const [selCls, setSelCls] = useState('');
    const [sidebar, setSidebar] = useState(false);
    // Timetable
    const [ttSlots, setTtSlots] = useState<any[]>([]);
    const [ttDay, setTtDay] = useState(1); const [ttCls2, setTtCls2] = useState(''); const [ttSub2, setTtSub2] = useState('');
    const [ttStart, setTtStart] = useState('08:00'); const [ttEnd, setTtEnd] = useState('10:00'); const [ttRoom, setTtRoom] = useState(''); const [ttLoaded, setTtLoaded] = useState(false);
    // Evaluations
    const [evals, setEvals] = useState<any[]>([]); const [evTitle, setEvTitle] = useState(''); const [evType, setEvType] = useState('devoir');
    const [evCls, setEvCls] = useState(''); const [evSub, setEvSub] = useState(''); const [evDate, setEvDate] = useState(''); const [evMax, setEvMax] = useState('20'); const [evLoaded, setEvLoaded] = useState(false);
    // Payments
    const [pays, setPays] = useState<any[]>([]); const [payStu, setPayStu] = useState(''); const [payAmt, setPayAmt] = useState('');
    const [payMeth, setPayMeth] = useState('cash'); const [payDesc, setPayDesc] = useState(''); const [payLoaded, setPayLoaded] = useState(false);
    // Discipline
    const [discs, setDiscs] = useState<any[]>([]); const [dStu, setDStu] = useState(''); const [dType, setDType] = useState('avertissement');
    const [dReason, setDReason] = useState(''); const [dLoaded, setDLoaded] = useState(false);
    // Grades admin
    const [grEvals, setGrEvals] = useState<any[]>([]); const [grSelEval, setGrSelEval] = useState<any>(null);
    const [grGrades, setGrGrades] = useState<Record<string, string>>({}); const [grLoaded, setGrLoaded] = useState(false);
    // Filters / search
    const [teacherSearch, setTeacherSearch] = useState(''); const [studentSearch, setStudentSearch] = useState(''); const [studentClsFilter, setStudentClsFilter] = useState('');

    useEffect(() => {
        (async () => {
            const { data: o } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single();
            if (!o) { setLoading(false); return; } setOrg(o);
            const { data: c } = await supabase.from('classrooms').select('*').eq('organization_id', o.id).order('name');
            setCls((c || []).map((x: any) => ({ id: x.id, name: x.name, cycle: x.cycle || '', filiere_id: x.filiere_id, level: x.level || 1, capacity: x.capacity || 50 })));
            const { data: s } = await supabase.from('subjects').select('*').eq('organization_id', o.id).order('name');
            setSubs((s || []).map((x: any) => ({ id: x.id, name: x.name, code: x.code || '', coefficient: x.coefficient || 1, classroom_id: x.classroom_id, teacher_id: x.teacher_id })));
            const { data: t } = await supabase.from('teacher_profiles').select('*').eq('organization_id', o.id); setTeachers(t || []);
            const { data: st } = await supabase.from('student_profiles').select('*').eq('organization_id', o.id); setStudents(st || []);
            if (!o.setup_completed && (c || []).length === 0) setTab('setup');
            setLoading(false);
        })();
    }, [orgSlug]);

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>;
    if (!org) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><h1 className="text-2xl font-bold">Introuvable</h1></div>;

    const isCL = ['college', 'lycee'].includes(org.type);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    // Setup helpers
    const addClass = () => { if (!newName.trim()) return; setCls(p => [...p, { name: newName.trim(), cycle: '', filiere_id: null, level: 1, capacity: 50 }]); setNewName(''); };
    const quickAdd = (lv: string) => { const nc = SECS.map(s => ({ name: `${lv} ${s}`, cycle: COLLEGE.includes(lv) ? '1er_cycle' : '2nd_cycle', filiere_id: null, level: 1, capacity: 50 })); setCls(p => [...p, ...nc.filter(x => !p.some(y => y.name === x.name))]); };
    const addSub = () => { if (!newSub.trim() || !selCls) return; setSubs(p => [...p, { name: newSub.trim(), code: newSub.slice(0, 4).toUpperCase(), coefficient: 1, classroom_id: selCls, teacher_id: null }]); setNewSub(''); };
    const addDefs = () => { if (!selCls) { toast.error('Sélectionnez une classe'); return; } const d = DEFS[org.type] || DEFS.centre_formation; setSubs(p => [...p, ...d.map(n => ({ name: n, code: n.slice(0, 4).toUpperCase(), coefficient: 1, classroom_id: selCls, teacher_id: null })).filter(x => !p.some(y => y.name === x.name && y.classroom_id === x.classroom_id))]); };
    const saveCls = async () => { setSaving(true); try { const u = cls.filter(c => !c.id); if (u.length > 0) { const { data, error } = await supabase.from('classrooms').insert(u.map(c => ({ organization_id: org.id, name: c.name, cycle: c.cycle || null, filiere_id: c.filiere_id, level: c.level, capacity: c.capacity }))).select(); if (error) throw error; if (data) setCls(p => [...p.filter(c => c.id), ...data.map((d: any) => ({ id: d.id, name: d.name, cycle: d.cycle || '', filiere_id: d.filiere_id, level: d.level, capacity: d.capacity }))]); } toast.success('Classes sauvegardées !'); } catch (e: any) { toast.error(e.message); } finally { setSaving(false); } };
    const saveSubs = async () => { setSaving(true); try { const u = subs.filter(s => !s.id); if (u.length > 0) { const { error } = await supabase.from('subjects').insert(u.map(s => ({ organization_id: org.id, name: s.name, code: s.code, coefficient: s.coefficient, classroom_id: s.classroom_id, teacher_id: s.teacher_id }))); if (error) throw error; } const { data } = await supabase.from('subjects').select('*').eq('organization_id', org.id); setSubs((data || []).map((x: any) => ({ id: x.id, name: x.name, code: x.code, coefficient: x.coefficient, classroom_id: x.classroom_id, teacher_id: x.teacher_id }))); toast.success('Matières sauvegardées !'); } catch (e: any) { toast.error(e.message); } finally { setSaving(false); } };
    const finishSetup = async () => { await saveCls(); await saveSubs(); await supabase.from('organizations').update({ setup_completed: true }).eq('id', org.id); setOrg({ ...org, setup_completed: true }); setTab('general'); toast.success('🎉 Configuration terminée !'); };

    // Module loaders
    const loadTT = async () => { const { data } = await supabase.from('timetable_slots').select('*,classrooms:classroom_id(name),subjects:subject_id(name)').eq('organization_id', org.id).order('start_time'); setTtSlots(data || []); setTtLoaded(true); };
    const loadEv = async () => { const { data } = await supabase.from('evaluations').select('*,classrooms:classroom_id(name),subjects:subject_id(name)').eq('organization_id', org.id).order('created_at', { ascending: false }); setEvals(data || []); setEvLoaded(true); };
    const loadPay = async () => { const { data } = await supabase.from('school_payments').select('*,student_profiles:student_id(first_name,last_name,matricule)').eq('organization_id', org.id).order('paid_at', { ascending: false }).limit(50); setPays(data || []); setPayLoaded(true); };
    const loadDisc = async () => { const { data } = await supabase.from('disciplines').select('*,student_profiles:student_id(first_name,last_name,matricule)').eq('organization_id', org.id).order('created_at', { ascending: false }).limit(50); setDiscs(data || []); setDLoaded(true); };
    const loadGrades = async () => { const { data } = await supabase.from('evaluations').select('*, classrooms:classroom_id(name), subjects:subject_id(name)').eq('organization_id', org.id).order('created_at', { ascending: false }); setGrEvals(data || []); setGrLoaded(true); };
    const loadGradeEntries = async (ev: any) => { setGrSelEval(ev); const clsStudents = students.filter((s: any) => s.classroom_id === ev.classroom_id); const { data: existing } = await supabase.from('grades').select('student_id, score').eq('evaluation_id', ev.id); const gMap: Record<string, string> = {}; clsStudents.forEach((s: any) => { const g = (existing || []).find((g: any) => g.student_id === s.id); gMap[s.id] = g ? String(g.score) : ''; }); setGrGrades(gMap); };
    const saveGradeEntries = async () => { if (!grSelEval) return; setSaving(true); try { const entries = Object.entries(grGrades).filter(([_, v]) => v !== '').map(([studentId, score]) => ({ evaluation_id: grSelEval.id, student_id: studentId, score: parseFloat(score), graded_by: null })); if (entries.length === 0) { toast.info('Aucune note'); setSaving(false); return; } const { error } = await supabase.from('grades').upsert(entries, { onConflict: 'evaluation_id,student_id' }); if (error) throw error; toast.success(`${entries.length} notes sauvegardées ✅`); } catch (e: any) { toast.error(e.message); } setSaving(false); };
    const assignTeacherToSubject = async (subId: string, teacherId: string | null) => { const { error } = await supabase.from('subjects').update({ teacher_id: teacherId }).eq('id', subId); if (error) { toast.error(error.message); return; } setSubs(p => p.map(s => s.id === subId ? { ...s, teacher_id: teacherId } : s)); toast.success('Professeur assigné ✅'); };
    const deleteTeacher = async (id: string) => { if (!confirm('Supprimer ce professeur ?')) return; await supabase.from('teacher_profiles').delete().eq('id', id); setTeachers(p => p.filter(t => t.id !== id)); toast.success('Professeur supprimé'); };
    const deleteStudent = async (id: string) => { if (!confirm('Supprimer cet étudiant ?')) return; await supabase.from('student_profiles').delete().eq('id', id); setStudents(p => p.filter(s => s.id !== id)); toast.success('Étudiant supprimé'); };
    const onTab = (t: Tab) => { setTab(t); setSidebar(false); if (t === 'timetable' && !ttLoaded) loadTT(); if (t === 'evaluations' && !evLoaded) loadEv(); if (t === 'payments' && !payLoaded) loadPay(); if (t === 'disciplines' && !dLoaded) loadDisc(); if (t === 'grades' && !grLoaded) loadGrades(); };

    // Module actions
    const addSlot = async () => { if (!ttCls2 || !ttSub2) { toast.error('Sélectionnez classe et matière'); return; } setSaving(true); const { error } = await supabase.from('timetable_slots').insert({ organization_id: org.id, classroom_id: ttCls2, subject_id: ttSub2, day_of_week: ttDay, start_time: ttStart, end_time: ttEnd, room: ttRoom || null }); if (error) toast.error(error.message); else { toast.success('Créneau ajouté !'); loadTT(); } setSaving(false); };
    const delSlot = async (id: string) => { await supabase.from('timetable_slots').delete().eq('id', id); setTtSlots(p => p.filter(s => s.id !== id)); toast.success('Supprimé'); };
    const addEval = async () => { if (!evTitle || !evCls || !evSub) { toast.error('Remplissez les champs'); return; } setSaving(true); const { error } = await supabase.from('evaluations').insert({ organization_id: org.id, title: evTitle, type: evType, classroom_id: evCls, subject_id: evSub, date: evDate || null, max_score: parseFloat(evMax) || 20 }); if (error) toast.error(error.message); else { toast.success('Évaluation créée !'); setEvTitle(''); loadEv(); } setSaving(false); };
    const addPay = async () => { if (!payStu || !payAmt) { toast.error('Sélectionnez un étudiant et un montant'); return; } setSaving(true); const { error } = await supabase.from('school_payments').insert({ organization_id: org.id, student_id: payStu, amount: parseFloat(payAmt), payment_method: payMeth, description: payDesc || 'Paiement scolarité', currency: 'XAF' }); if (error) toast.error(error.message); else { toast.success('Paiement enregistré !'); setPayAmt(''); setPayDesc(''); loadPay(); } setSaving(false); };
    const addDisc = async () => { if (!dStu || !dReason) { toast.error('Remplissez les champs'); return; } setSaving(true); const { data: { user } } = await supabase.auth.getUser(); const { error } = await supabase.from('disciplines').insert({ organization_id: org.id, student_id: dStu, type: dType, reason: dReason, created_by: user?.id }); if (error) toast.error(error.message); else { toast.success('Sanction enregistrée'); setDReason(''); loadDisc(); } setSaving(false); };

    const Sel = ({ v, onChange, opts, ph = '—' }: { v: string, onChange: (v: string) => void, opts: { id: string, label: string }[], ph?: string }) => (
        <select value={v} onChange={e => onChange(e.target.value)} className="w-full h-9 rounded-lg bg-white/5 border border-white/10 text-white px-3 text-sm">
            <option value="" className="bg-slate-900">{ph}</option>
            {opts.map(o => <option key={o.id} value={o.id} className="bg-slate-900">{o.label}</option>)}
        </select>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white flex">
            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-60 bg-slate-900 border-r border-white/5 transform transition-transform lg:transform-none ${sidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="p-4 border-b border-white/5">
                    <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center"><GraduationCap className="w-4 h-4" /></div><span className="font-semibold text-sm truncate">{org.name}</span></div>
                    <p className="text-xs text-slate-500 mt-1">Backoffice</p>
                </div>
                <nav className="p-2 space-y-0.5">{SIDES.map(i => (<button key={i.id} onClick={() => onTab(i.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${tab === i.id ? 'bg-indigo-600/20 text-indigo-300 font-medium' : 'text-slate-400 hover:bg-white/5'}`}><i.icon className="w-4 h-4" />{i.label}</button>))}
                    <div className="mt-3 pt-3 border-t border-white/5 space-y-0.5">
                        <button onClick={() => router.push(`/${orgSlug}/library`)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-emerald-400 hover:bg-emerald-600/10"><BookMarked className="w-4 h-4" />Bibliothèque</button>
                        <button onClick={() => router.push(`/${orgSlug}/shop`)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-teal-400 hover:bg-teal-600/10"><ShoppingBag className="w-4 h-4" />Marketplace</button>
                        <button onClick={() => router.push(`/${orgSlug}/messages`)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-indigo-400 hover:bg-indigo-600/10"><MessageSquare className="w-4 h-4" />Messages</button>
                    </div>
                </nav>
                <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/5"><Button variant="ghost" size="sm" className="w-full text-xs text-slate-500" onClick={() => router.push(`/${orgSlug}`)}><Globe className="w-3 h-3 mr-1" />Page publique</Button></div>
            </aside>
            {sidebar && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebar(false)} />}

            <main className="flex-1 min-h-screen">
                <header className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3"><button onClick={() => setSidebar(true)} className="lg:hidden p-2 hover:bg-white/5 rounded-lg"><Settings className="w-5 h-5" /></button><h1 className="text-lg font-semibold">{SIDES.find(i => i.id === tab)?.label}</h1></div>
                    <span className="text-xs text-slate-500">{students.length} étudiants • {teachers.length} profs</span>
                </header>

                <div className="p-4 sm:p-6 max-w-5xl">
                    {/* ═══ GENERAL ═══ */}
                    {tab === 'general' && <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10"><h2 className="text-xl font-bold mb-4">Informations</h2><div className="grid sm:grid-cols-2 gap-3 text-sm">{[['Nom', org.name], ['Type', org.type], ['Ville', `${org.city}, ${org.country}`], ['Tél', org.phone], ['Email', org.email], ['WhatsApp', org.whatsapp || '—']].map(([k, v], i) => <div key={i}><span className="text-slate-500">{k}:</span> <span className="ml-2">{v}</span></div>)}</div></div>
                        <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10"><h3 className="font-bold text-indigo-300 mb-3 flex items-center gap-2"><Link2 className="w-5 h-5" />Liens</h3><div className="space-y-2 text-sm">{[['Page publique', `${origin}/${orgSlug}`, 'text-indigo-300'], ['Inscription prof', `${origin}/${orgSlug}/prof`, 'text-emerald-300'], ['Inscription étudiant', `${origin}/${orgSlug}/student`, 'text-blue-300']].map(([l, u, c], i) => <div key={i} className="flex items-center gap-2"><span className="text-slate-400">{l}:</span><code className={`px-2 py-1 rounded bg-white/5 ${c}`}>{u}</code></div>)}</div></div>
                        <div className="grid sm:grid-cols-4 gap-4">{[{ l: 'Classes', v: cls.length, c: 'from-indigo-600 to-blue-600' }, { l: 'Matières', v: subs.length, c: 'from-emerald-600 to-green-600' }, { l: 'Profs', v: teachers.length, c: 'from-orange-600 to-amber-600' }, { l: 'Étudiants', v: students.length, c: 'from-purple-600 to-pink-600' }].map((s, i) => <div key={i} className={`p-4 rounded-xl bg-gradient-to-br ${s.c} text-center`}><div className="text-3xl font-bold">{s.v}</div><div className="text-sm text-white/80">{s.l}</div></div>)}</div>
                    </div>}

                    {/* ═══ SETUP ═══ */}
                    {tab === 'setup' && <div className="space-y-6">
                        <div className="flex items-center justify-center gap-2 mb-6">{['Classes', 'Matières', 'Professeurs'].map((s, i) => <div key={i} className="flex items-center gap-2"><button onClick={() => setStep(i)} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${step === i ? 'bg-indigo-600' : step > i ? 'bg-green-600' : 'bg-white/10 text-slate-500'}`}>{step > i ? <CheckCircle2 className="w-5 h-5" /> : i + 1}</button><span className={`text-sm hidden sm:inline ${step === i ? 'text-white font-medium' : 'text-slate-500'}`}>{s}</span>{i < 2 && <div className="w-8 h-0.5 bg-white/10" />}</div>)}</div>
                        {step === 0 && <div className="space-y-4"><div className="p-5 rounded-xl bg-white/[0.03] border border-white/10"><h3 className="font-bold text-lg mb-3">{isCL ? '🏫 Salles de classe' : '📚 Filières et niveaux'}</h3>{isCL && <div className="mb-4"><p className="text-sm text-slate-400 mb-2">Ajout rapide:</p><div className="flex flex-wrap gap-2">{(org.type === 'college' ? COLLEGE : [...COLLEGE, ...LYCEE]).map(l => <Button key={l} size="sm" variant="outline" className="text-xs border-white/10" onClick={() => quickAdd(l)}><Plus className="w-3 h-3 mr-1" />{l}</Button>)}</div></div>}<div className="flex gap-2"><Input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addClass()} placeholder={isCL ? '6ème A...' : 'Niveau 1...'} className="bg-white/5 border-white/10 text-white h-10 rounded-lg" /><Button onClick={addClass} disabled={!newName.trim()} className="bg-indigo-600 shrink-0"><Plus className="w-4 h-4" /></Button></div></div>
                            {cls.length > 0 && <div className="space-y-2">{cls.map((c, i) => <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white/5 border border-white/10"><div className="flex items-center gap-3"><School className="w-4 h-4 text-indigo-400" /><span className="text-sm font-medium">{c.name}</span>{!c.id && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300">nouveau</span>}</div><button onClick={() => setCls(p => p.filter((_, j) => j !== i))} className="text-red-400"><Trash2 className="w-4 h-4" /></button></div>)}</div>}
                            <div className="flex justify-end"><Button onClick={() => { saveCls(); setStep(1); }} disabled={cls.length === 0 || saving} className="bg-indigo-600">{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Suivant<ArrowRight className="w-4 h-4 ml-2" /></Button></div></div>}
                        {step === 1 && <div className="space-y-4"><div className="p-5 rounded-xl bg-white/[0.03] border border-white/10"><h3 className="font-bold text-lg mb-3">📖 Matières par classe</h3><Label className="text-slate-400 text-sm mb-1 block">Classe</Label><Sel v={selCls} onChange={setSelCls} opts={cls.filter(c => c.id).map(c => ({ id: c.id!, label: c.name }))} ph="Choisir..." />{selCls && <div className="mt-3"><Button size="sm" variant="outline" className="mb-3 text-xs border-white/10" onClick={addDefs}><Plus className="w-3 h-3 mr-1" />Par défaut</Button><div className="flex gap-2"><Input value={newSub} onChange={e => setNewSub(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSub()} placeholder="Nom matière" className="bg-white/5 border-white/10 text-white h-10 rounded-lg" /><Button onClick={addSub} disabled={!newSub.trim()} className="bg-emerald-600 shrink-0"><Plus className="w-4 h-4" /></Button></div></div>}</div>
                            {cls.filter(c => c.id).map(c => { const cs = subs.filter(s => s.classroom_id === c.id); if (!cs.length) return null; return <div key={c.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5"><h4 className="font-medium text-sm text-indigo-300 mb-2">{c.name}</h4><div className="flex flex-wrap gap-2">{cs.map((s, i) => <span key={i} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">{s.name}</span>)}</div></div>; })}
                            <div className="flex justify-between"><Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft className="w-4 h-4 mr-2" />Retour</Button><Button onClick={() => { saveSubs(); setStep(2); }} disabled={saving} className="bg-indigo-600">{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Suivant<ArrowRight className="w-4 h-4 ml-2" /></Button></div></div>}
                        {step === 2 && <div className="space-y-4"><div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 text-center"><UserPlus className="w-12 h-12 text-indigo-400 mx-auto mb-3" /><h3 className="font-bold text-lg mb-2">Invitez vos professeurs</h3><p className="text-sm text-slate-400 mb-4">Partagez ce lien:</p><code className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-emerald-300 text-sm">{origin}/{orgSlug}/prof</code><Button size="sm" variant="outline" className="ml-2 border-white/10" onClick={() => { navigator.clipboard.writeText(`${origin}/${orgSlug}/prof`); toast.success('Copié!'); }}>Copier</Button></div><div className="flex justify-between"><Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-2" />Retour</Button><Button onClick={finishSetup} disabled={saving} className="bg-gradient-to-r from-indigo-600 to-blue-600">{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}<CheckCircle2 className="w-4 h-4 mr-2" />Terminer</Button></div></div>}
                    </div>}

                    {/* ═══ CLASSES ═══ */}
                    {tab === 'classes' && <div className="space-y-4"><div className="flex items-center justify-between"><p className="text-slate-400 text-sm">{cls.length} classe(s)</p><Button size="sm" className="bg-indigo-600" onClick={() => onTab('setup')}><Plus className="w-4 h-4 mr-1" />Ajouter</Button></div>{cls.map((c, i) => <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10"><div className="flex items-center gap-3"><School className="w-5 h-5 text-indigo-400" /><div><p className="font-medium">{c.name}</p><p className="text-xs text-slate-500">{c.cycle || '—'} • {subs.filter(s => s.classroom_id === c.id).length} matières</p></div></div></div>)}</div>}

                    {/* ═══ SUBJECTS ═══ */}
                    {tab === 'subjects' && <div className="space-y-4"><div className="flex items-center justify-between"><p className="text-slate-400 text-sm">{subs.length} matière(s)</p><Button size="sm" className="bg-emerald-600" onClick={() => { onTab('setup'); setStep(1); }}><Plus className="w-4 h-4 mr-1" />Ajouter</Button></div>{cls.filter(c => c.id).map(c => { const cs = subs.filter(s => s.classroom_id === c.id); if (!cs.length) return null; return <div key={c.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/10"><h3 className="font-semibold text-indigo-300 mb-3">{c.name}</h3><div className="grid sm:grid-cols-2 gap-2">{cs.map((s, i) => <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5"><span className="text-sm">{s.name}</span><span className="text-xs text-slate-500">Coef.{s.coefficient}</span></div>)}</div></div>; })}</div>}

                    {/* ═══ TEACHERS ═══ */}
                    {tab === 'teachers' && <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between flex-wrap gap-3">
                            <p className="text-sm text-emerald-300">🔗 Lien prof: <code className="ml-2 px-2 py-1 rounded bg-white/5">{origin}/{orgSlug}/prof</code></p>
                            <Button size="sm" variant="outline" className="border-emerald-500/20 text-emerald-300" onClick={() => { navigator.clipboard.writeText(`${origin}/${orgSlug}/prof`); toast.success('Lien copié !'); }}>📋 Copier</Button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                            <Input value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} placeholder="Rechercher un professeur..." className="bg-white/5 border-white/10 text-white h-10 pl-10 rounded-lg" />
                        </div>
                        <p className="text-xs text-slate-500">{teachers.length} professeur(s) inscrits</p>
                        {teachers.filter((t: any) => !teacherSearch || `${t.first_name} ${t.last_name} ${t.speciality || ''}`.toLowerCase().includes(teacherSearch.toLowerCase())).length === 0 ? (
                            <div className="text-center py-12 text-slate-500"><Users className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Aucun professeur trouvé</p></div>
                        ) : teachers.filter((t: any) => !teacherSearch || `${t.first_name} ${t.last_name} ${t.speciality || ''}`.toLowerCase().includes(teacherSearch.toLowerCase())).map((t: any) => {
                            const assignedSubs = subs.filter(s => s.teacher_id === t.id);
                            return (
                                <div key={t.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center font-bold text-emerald-400 shrink-0">{t.first_name?.[0]}{t.last_name?.[0]}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium">{t.first_name} {t.last_name}</p>
                                            <p className="text-xs text-slate-500">{t.speciality || '—'} • {t.email || t.phone || '—'}</p>
                                        </div>
                                        <button onClick={() => deleteTeacher(t.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                    {/* Assigned subjects */}
                                    {assignedSubs.length > 0 && <div className="flex flex-wrap gap-1 mt-2">
                                        {assignedSubs.map(s => <span key={s.id} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600/10 text-emerald-300">📘 {s.name} ({cls.find(c => c.id === s.classroom_id)?.name || '—'})</span>)}
                                    </div>}
                                    {/* Assign to subject */}
                                    <div className="mt-2">
                                        <select onChange={e => { if (e.target.value) assignTeacherToSubject(e.target.value, t.id); e.target.value = ''; }} className="text-xs h-7 rounded bg-white/5 border border-white/10 text-slate-400 px-2 w-full">
                                            <option value="" className="bg-slate-900">+ Assigner une matière...</option>
                                            {subs.filter(s => !s.teacher_id).map(s => <option key={s.id} value={s.id} className="bg-slate-900">{s.name} ({cls.find(c => c.id === s.classroom_id)?.name})</option>)}
                                        </select>
                                    </div>
                                </div>
                            );
                        })}
                    </div>}

                    {/* ═══ STUDENTS ═══ */}
                    {tab === 'students' && <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-between flex-wrap gap-3">
                            <p className="text-sm text-blue-300">🔗 Lien étudiant: <code className="ml-2 px-2 py-1 rounded bg-white/5">{origin}/{orgSlug}/student</code></p>
                            <Button size="sm" variant="outline" className="border-blue-500/20 text-blue-300" onClick={() => { navigator.clipboard.writeText(`${origin}/${orgSlug}/student`); toast.success('Lien copié !'); }}>📋 Copier</Button>
                        </div>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                                <Input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Chercher par nom ou matricule..." className="bg-white/5 border-white/10 text-white h-10 pl-10 rounded-lg" />
                            </div>
                            <select value={studentClsFilter} onChange={e => setStudentClsFilter(e.target.value)} className="h-10 rounded-lg bg-white/5 border border-white/10 text-white px-3 text-sm">
                                <option value="" className="bg-slate-900">Toutes classes</option>
                                {cls.filter(c => c.id).map(c => <option key={c.id} value={c.id!} className="bg-slate-900">{c.name}</option>)}
                            </select>
                        </div>
                        <p className="text-xs text-slate-500">{students.length} étudiant(s) • {cls.filter(c => c.id).map(c => `${c.name}: ${students.filter((s: any) => s.classroom_id === c.id).length}`).join(' • ')}</p>
                        {(() => {
                            const filtered = students.filter((s: any) => {
                                const matchSearch = !studentSearch || `${s.first_name} ${s.last_name} ${s.matricule || ''}`.toLowerCase().includes(studentSearch.toLowerCase());
                                const matchCls = !studentClsFilter || s.classroom_id === studentClsFilter;
                                return matchSearch && matchCls;
                            });
                            return filtered.length === 0 ? (
                                <div className="text-center py-12 text-slate-500"><GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Aucun étudiant trouvé</p></div>
                            ) : (
                                <div className="space-y-2">
                                    {filtered.map((s: any) => (
                                        <div key={s.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/10">
                                            <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center font-bold text-blue-400 shrink-0">{s.first_name?.[0]}{s.last_name?.[0]}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium">{s.first_name} {s.last_name}</p>
                                                <p className="text-xs text-slate-500">
                                                    Mat: {s.matricule || '—'} • {cls.find(c => c.id === s.classroom_id)?.name || 'Non assigné'}
                                                    {s.phone && ` • ${s.phone}`} {s.birth_date && ` • ${s.birth_date}`}
                                                </p>
                                            </div>
                                            <button onClick={() => deleteStudent(s.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>}

                    {/* ═══ TIMETABLE ═══ */}
                    {tab === 'timetable' && <div className="space-y-4">
                        <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                            <h3 className="font-bold mb-3">➕ Ajouter un créneau</h3>
                            <div className="grid sm:grid-cols-3 gap-3">
                                <div><Label className="text-slate-400 text-xs">Jour</Label><Sel v={String(ttDay)} onChange={v => setTtDay(+v)} opts={DAYS.map((d, i) => ({ id: String(i + 1), label: d }))} /></div>
                                <div><Label className="text-slate-400 text-xs">Classe</Label><Sel v={ttCls2} onChange={setTtCls2} opts={cls.filter(c => c.id).map(c => ({ id: c.id!, label: c.name }))} /></div>
                                <div><Label className="text-slate-400 text-xs">Matière</Label><Sel v={ttSub2} onChange={setTtSub2} opts={subs.filter(s => !ttCls2 || s.classroom_id === ttCls2).map(s => ({ id: s.id!, label: s.name }))} /></div>
                                <div><Label className="text-slate-400 text-xs">Début</Label><Input type="time" value={ttStart} onChange={e => setTtStart(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                                <div><Label className="text-slate-400 text-xs">Fin</Label><Input type="time" value={ttEnd} onChange={e => setTtEnd(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                                <div><Label className="text-slate-400 text-xs">Salle</Label><Input value={ttRoom} onChange={e => setTtRoom(e.target.value)} placeholder="Salle A1" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                            </div>
                            <Button onClick={addSlot} disabled={saving} className="mt-3 bg-indigo-600" size="sm">{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}<Plus className="w-4 h-4 mr-1" />Ajouter</Button>
                        </div>
                        {DAYS.map((day, di) => { const slots = ttSlots.filter((s: any) => s.day_of_week === di + 1); if (!slots.length) return null; return <div key={di} className="p-4 rounded-xl bg-white/[0.02] border border-white/5"><h4 className="font-medium text-indigo-300 mb-2">{day}</h4><div className="space-y-2">{slots.map((s: any) => <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5"><div><span className="text-sm font-medium">{s.subjects?.name || '—'}</span><span className="text-xs text-slate-500 ml-2">{s.classrooms?.name} • {s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)}{s.room ? ` • ${s.room}` : ''}</span></div><button onClick={() => delSlot(s.id)} className="text-red-400"><Trash2 className="w-4 h-4" /></button></div>)}</div></div>; })}
                        {ttSlots.length === 0 && <div className="text-center py-8 text-slate-500"><Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aucun créneau</p></div>}
                    </div>}

                    {/* ═══ EVALUATIONS ═══ */}
                    {tab === 'evaluations' && <div className="space-y-4">
                        <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                            <h3 className="font-bold mb-3">📝 Nouvelle évaluation</h3>
                            <div className="grid sm:grid-cols-3 gap-3">
                                <div><Label className="text-slate-400 text-xs">Titre</Label><Input value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="Devoir n°1" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                                <div><Label className="text-slate-400 text-xs">Type</Label><Sel v={evType} onChange={setEvType} opts={['devoir', 'examen', 'tp', 'oral', 'projet'].map(t => ({ id: t, label: t[0].toUpperCase() + t.slice(1) }))} /></div>
                                <div><Label className="text-slate-400 text-xs">Classe</Label><Sel v={evCls} onChange={setEvCls} opts={cls.filter(c => c.id).map(c => ({ id: c.id!, label: c.name }))} /></div>
                                <div><Label className="text-slate-400 text-xs">Matière</Label><Sel v={evSub} onChange={setEvSub} opts={subs.filter(s => !evCls || s.classroom_id === evCls).map(s => ({ id: s.id!, label: s.name }))} /></div>
                                <div><Label className="text-slate-400 text-xs">Date</Label><Input type="date" value={evDate} onChange={e => setEvDate(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                                <div><Label className="text-slate-400 text-xs">Note max</Label><Input type="number" value={evMax} onChange={e => setEvMax(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                            </div>
                            <Button onClick={addEval} disabled={saving} className="mt-3 bg-indigo-600" size="sm">{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}<Plus className="w-4 h-4 mr-1" />Créer</Button>
                        </div>
                        {evals.length > 0 ? evals.map((ev: any) => <div key={ev.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10"><div><p className="font-medium text-sm">{ev.title}</p><p className="text-xs text-slate-500">{ev.subjects?.name} • {ev.classrooms?.name} • /{ev.max_score}{ev.date ? ` • ${ev.date}` : ''}</p></div><span className="text-xs px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-300">{ev.type}</span></div>) : <div className="text-center py-8 text-slate-500"><ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aucune évaluation</p></div>}
                    </div>}

                    {/* ═══ PAYMENTS ═══ */}
                    {tab === 'payments' && <div className="space-y-4">
                        <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                            <h3 className="font-bold mb-3">💰 Enregistrer un paiement</h3>
                            <div className="grid sm:grid-cols-2 gap-3">
                                <div><Label className="text-slate-400 text-xs">Étudiant</Label><Sel v={payStu} onChange={setPayStu} opts={students.map((s: any) => ({ id: s.id, label: `${s.first_name} ${s.last_name} (${s.matricule || '—'})` }))} ph="Sélectionner..." /></div>
                                <div><Label className="text-slate-400 text-xs">Montant (XAF)</Label><Input type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} placeholder="50000" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                                <div><Label className="text-slate-400 text-xs">Mode</Label><Sel v={payMeth} onChange={setPayMeth} opts={[{ id: 'cash', label: 'Espèces' }, { id: 'momo', label: 'MTN MoMo' }, { id: 'orange_money', label: 'Orange Money' }, { id: 'bank', label: 'Virement' }, { id: 'other', label: 'Autre' }]} /></div>
                                <div><Label className="text-slate-400 text-xs">Description</Label><Input value={payDesc} onChange={e => setPayDesc(e.target.value)} placeholder="1ère tranche" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                            </div>
                            <Button onClick={addPay} disabled={saving || !payStu || !payAmt} className="mt-3 bg-emerald-600" size="sm">{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}<CreditCard className="w-4 h-4 mr-1" />Enregistrer</Button>
                        </div>
                        {pays.length > 0 ? <div className="space-y-2">{pays.map((p: any) => <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center text-emerald-400 text-xs font-bold">{p.student_profiles?.first_name?.[0]}{p.student_profiles?.last_name?.[0]}</div><div><p className="text-sm font-medium">{p.student_profiles?.first_name} {p.student_profiles?.last_name}</p><p className="text-xs text-slate-500">{p.description} • {p.payment_method} • {new Date(p.paid_at).toLocaleDateString('fr-FR')}</p></div></div><span className="text-sm font-bold text-emerald-400">{new Intl.NumberFormat('fr-FR').format(p.amount)} XAF</span></div>)}</div> : <div className="text-center py-8 text-slate-500"><CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aucun paiement</p></div>}
                    </div>}

                    {/* ═══ DISCIPLINE ═══ */}
                    {tab === 'disciplines' && <div className="space-y-4">
                        <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                            <h3 className="font-bold mb-3">⚠️ Enregistrer une sanction</h3>
                            <div className="grid sm:grid-cols-2 gap-3">
                                <div><Label className="text-slate-400 text-xs">Étudiant</Label><Sel v={dStu} onChange={setDStu} opts={students.map((s: any) => ({ id: s.id, label: `${s.first_name} ${s.last_name}` }))} ph="Sélectionner..." /></div>
                                <div><Label className="text-slate-400 text-xs">Type</Label><Sel v={dType} onChange={setDType} opts={[{ id: 'avertissement', label: 'Avertissement' }, { id: 'blame', label: 'Blâme' }, { id: 'exclusion_temporaire', label: 'Exclusion temporaire' }, { id: 'retenue', label: 'Retenue' }, { id: 'convocation_parent', label: 'Convocation parent' }]} /></div>
                                <div className="sm:col-span-2"><Label className="text-slate-400 text-xs">Motif</Label><Input value={dReason} onChange={e => setDReason(e.target.value)} placeholder="Motif..." className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                            </div>
                            <Button onClick={addDisc} disabled={saving || !dStu || !dReason} className="mt-3 bg-red-600" size="sm">{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}<ShieldCheck className="w-4 h-4 mr-1" />Enregistrer</Button>
                        </div>
                        {discs.length > 0 ? <div className="space-y-2">{discs.map((d: any) => <div key={d.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${d.type === 'avertissement' ? 'bg-amber-600/20 text-amber-400' : d.type === 'blame' ? 'bg-orange-600/20 text-orange-400' : 'bg-red-600/20 text-red-400'}`}>{d.student_profiles?.first_name?.[0]}{d.student_profiles?.last_name?.[0]}</div><div><p className="text-sm font-medium">{d.student_profiles?.first_name} {d.student_profiles?.last_name}</p><p className="text-xs text-slate-500">{d.reason}</p></div></div><span className={`text-xs px-2 py-1 rounded-full ${d.type === 'avertissement' ? 'bg-amber-500/10 text-amber-300' : 'bg-red-500/10 text-red-300'}`}>{d.type.replace(/_/g, ' ')}</span></div>)}</div> : <div className="text-center py-8 text-slate-500"><ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aucune sanction</p></div>}
                    </div>}

                    {/* ═══ GRADES (Admin) ═══ */}
                    {tab === 'grades' && <div className="space-y-4">
                        <h2 className="font-bold text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-400" /> Notes par évaluation</h2>
                        {!grSelEval ? (
                            grEvals.length === 0 ? (
                                <div className="text-center py-12 text-slate-500"><ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Aucune évaluation. Créez-en via l'onglet Évaluations.</p></div>
                            ) : (
                                <div className="space-y-2">
                                    {grEvals.map((ev: any) => (
                                        <button key={ev.id} onClick={() => loadGradeEntries(ev)} className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/5 transition text-left">
                                            <div><p className="font-medium text-sm">{ev.title}</p><p className="text-[10px] text-slate-500">{ev.subjects?.name} • {ev.classrooms?.name} • /{ev.max_score} {ev.date ? `• ${ev.date}` : ''}</p></div>
                                            <span className="text-[10px] px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-300">{ev.type}</span>
                                        </button>
                                    ))}
                                </div>
                            )
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-600/10 border border-indigo-500/20">
                                    <div><p className="font-bold text-sm">{grSelEval.title}</p><p className="text-[10px] text-slate-400">{grSelEval.subjects?.name} • {grSelEval.classrooms?.name} • /{grSelEval.max_score}</p></div>
                                    <div className="flex gap-2">
                                        <Button size="sm" className="bg-emerald-600 h-8" onClick={saveGradeEntries} disabled={saving}>{saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}Sauver</Button>
                                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setGrSelEval(null)}><X className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                                <div className="rounded-xl bg-white/[0.02] border border-white/10 overflow-hidden">
                                    <div className="grid grid-cols-[1fr_80px] px-4 py-2 bg-white/5 text-xs text-slate-400 font-medium"><span>Étudiant</span><span className="text-center">Note /{grSelEval.max_score}</span></div>
                                    {students.filter((s: any) => s.classroom_id === grSelEval.classroom_id).map((s: any) => (
                                        <div key={s.id} className="grid grid-cols-[1fr_80px] items-center px-4 py-2 border-t border-white/5 hover:bg-white/[0.02]">
                                            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center text-[10px] font-bold text-blue-400">{s.first_name?.[0]}{s.last_name?.[0]}</div><span className="text-sm">{s.first_name} {s.last_name}</span></div>
                                            <Input type="number" min="0" max={grSelEval.max_score} step="0.25" value={grGrades[s.id] || ''} onChange={e => setGrGrades(g => ({ ...g, [s.id]: e.target.value }))} className="bg-white/5 border-white/10 text-white h-8 text-center rounded-lg text-sm" placeholder="—" />
                                        </div>
                                    ))}
                                </div>
                                {Object.values(grGrades).some(v => v !== '') && (() => {
                                    const vals = Object.values(grGrades).filter(v => v !== '').map(Number); const avg = vals.reduce((a, b) => a + b, 0) / vals.length; return (
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="p-3 rounded-xl bg-blue-600/10 text-center"><span className="text-xs text-blue-300">Moyenne</span><p className="text-lg font-bold text-blue-400">{avg.toFixed(2)}</p></div>
                                            <div className="p-3 rounded-xl bg-red-600/10 text-center"><span className="text-xs text-red-300">Min</span><p className="text-lg font-bold text-red-400">{Math.min(...vals).toFixed(2)}</p></div>
                                            <div className="p-3 rounded-xl bg-emerald-600/10 text-center"><span className="text-xs text-emerald-300">Max</span><p className="text-lg font-bold text-emerald-400">{Math.max(...vals).toFixed(2)}</p></div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>}
                </div>
            </main>
        </div>
    );
}
