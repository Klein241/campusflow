'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GraduationCap, Plus, Trash2, ArrowRight, ArrowLeft, BookOpen, Users, Settings, Calendar, CreditCard, Home, School, CheckCircle2, Loader2, Link2, Bell, ShieldCheck, UserPlus, ClipboardList, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type Tab = 'general' | 'setup' | 'classes' | 'subjects' | 'teachers' | 'students' | 'timetable' | 'evaluations' | 'payments' | 'disciplines';
interface Cls { id?: string; name: string; cycle: string; filiere_id: string | null; level: number; capacity: number; }
interface Sub { id?: string; name: string; code: string; coefficient: number; classroom_id: string; teacher_id: string | null; }

const SIDES = [
    { id: 'general' as Tab, icon: Home, label: 'Général' },
    { id: 'setup' as Tab, icon: Settings, label: 'Configuration' },
    { id: 'classes' as Tab, icon: School, label: 'Classes' },
    { id: 'subjects' as Tab, icon: BookOpen, label: 'Matières' },
    { id: 'teachers' as Tab, icon: Users, label: 'Professeurs' },
    { id: 'students' as Tab, icon: GraduationCap, label: 'Étudiants' },
    { id: 'timetable' as Tab, icon: Calendar, label: 'Emploi du temps' },
    { id: 'evaluations' as Tab, icon: ClipboardList, label: 'Évaluations' },
    { id: 'payments' as Tab, icon: CreditCard, label: 'Paiements' },
    { id: 'disciplines' as Tab, icon: ShieldCheck, label: 'Discipline' },
];

const COLLEGE = ['6ème', '5ème', '4ème', '3ème'];
const LYCEE = ['Seconde', 'Première', 'Terminale'];
const SECS = ['A', 'B', 'C'];
const DEFS: Record<string, string[]> = {
    college: ['Mathématiques', 'Français', 'Anglais', 'SVT', 'Physique-Chimie', 'Histoire-Géo', 'Informatique', 'EPS'],
    lycee: ['Mathématiques', 'Français', 'Anglais', 'Physique', 'Chimie', 'SVT', 'Philosophie', 'Histoire-Géo', 'Informatique', 'EPS'],
    universite: ['Module 1', 'Module 2', 'Module 3', 'Projet tutoré', 'Stage'],
    centre_formation: ['Cours théorique', 'Travaux pratiques', 'Stage professionnel', 'Projet fin de formation'],
    institut: ['Cours fondamental', 'Spécialisation', 'Travaux pratiques', 'Stage'],
};

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

    useEffect(() => {
        (async () => {
            const { data: o } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single();
            if (!o) { setLoading(false); return; }
            setOrg(o);
            const { data: c } = await supabase.from('classrooms').select('*').eq('organization_id', o.id).order('name');
            setCls((c || []).map((x: any) => ({ id: x.id, name: x.name, cycle: x.cycle || '', filiere_id: x.filiere_id, level: x.level || 1, capacity: x.capacity || 50 })));
            const { data: s } = await supabase.from('subjects').select('*').eq('organization_id', o.id).order('name');
            setSubs((s || []).map((x: any) => ({ id: x.id, name: x.name, code: x.code || '', coefficient: x.coefficient || 1, classroom_id: x.classroom_id, teacher_id: x.teacher_id })));
            const { data: t } = await supabase.from('teacher_profiles').select('*').eq('organization_id', o.id);
            setTeachers(t || []);
            const { data: st } = await supabase.from('student_profiles').select('*').eq('organization_id', o.id);
            setStudents(st || []);
            if (!o.setup_completed && (c || []).length === 0) setTab('setup');
            setLoading(false);
        })();
    }, [orgSlug]);

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>;
    if (!org) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><h1 className="text-2xl font-bold">Introuvable</h1></div>;

    const isCL = ['college', 'lycee'].includes(org.type);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    const addClass = () => { if (!newName.trim()) return; setCls(p => [...p, { name: newName.trim(), cycle: '', filiere_id: null, level: 1, capacity: 50 }]); setNewName(''); };
    const quickAdd = (lv: string) => { const nc = SECS.map(s => ({ name: `${lv} ${s}`, cycle: COLLEGE.includes(lv) ? '1er_cycle' : '2nd_cycle', filiere_id: null, level: 1, capacity: 50 })); setCls(p => [...p, ...nc.filter(x => !p.some(y => y.name === x.name))]); };
    const addSub = () => { if (!newSub.trim() || !selCls) return; setSubs(p => [...p, { name: newSub.trim(), code: newSub.slice(0, 4).toUpperCase(), coefficient: 1, classroom_id: selCls, teacher_id: null }]); setNewSub(''); };
    const addDefs = () => { if (!selCls) { toast.error('Sélectionnez une classe'); return; } const d = DEFS[org.type] || DEFS.centre_formation; setSubs(p => [...p, ...d.map(n => ({ name: n, code: n.slice(0, 4).toUpperCase(), coefficient: 1, classroom_id: selCls, teacher_id: null })).filter(x => !p.some(y => y.name === x.name && y.classroom_id === x.classroom_id))]); };

    const saveCls = async () => { setSaving(true); try { const u = cls.filter(c => !c.id); if (u.length > 0) { const { data, error } = await supabase.from('classrooms').insert(u.map(c => ({ organization_id: org.id, name: c.name, cycle: c.cycle || null, filiere_id: c.filiere_id, level: c.level, capacity: c.capacity }))).select(); if (error) throw error; if (data) setCls(p => [...p.filter(c => c.id), ...data.map((d: any) => ({ id: d.id, name: d.name, cycle: d.cycle || '', filiere_id: d.filiere_id, level: d.level, capacity: d.capacity }))]); } toast.success('Classes sauvegardées !'); } catch (e: any) { toast.error(e.message); } finally { setSaving(false); } };
    const saveSubs = async () => { setSaving(true); try { const u = subs.filter(s => !s.id); if (u.length > 0) { const { error } = await supabase.from('subjects').insert(u.map(s => ({ organization_id: org.id, name: s.name, code: s.code, coefficient: s.coefficient, classroom_id: s.classroom_id, teacher_id: s.teacher_id }))); if (error) throw error; } const { data } = await supabase.from('subjects').select('*').eq('organization_id', org.id); setSubs((data || []).map((x: any) => ({ id: x.id, name: x.name, code: x.code, coefficient: x.coefficient, classroom_id: x.classroom_id, teacher_id: x.teacher_id }))); toast.success('Matières sauvegardées !'); } catch (e: any) { toast.error(e.message); } finally { setSaving(false); } };
    const finishSetup = async () => { await saveCls(); await saveSubs(); await supabase.from('organizations').update({ setup_completed: true }).eq('id', org.id); setOrg({ ...org, setup_completed: true }); setTab('general'); toast.success('🎉 Configuration terminée !'); };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex">
            <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-60 bg-slate-900 border-r border-white/5 transform transition-transform lg:transform-none ${sidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="p-4 border-b border-white/5">
                    <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center"><GraduationCap className="w-4 h-4" /></div><span className="font-semibold text-sm truncate">{org.name}</span></div>
                    <p className="text-xs text-slate-500 mt-1">Backoffice</p>
                </div>
                <nav className="p-2 space-y-0.5">{SIDES.map(i => (
                    <button key={i.id} onClick={() => { setTab(i.id); setSidebar(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${tab === i.id ? 'bg-indigo-600/20 text-indigo-300 font-medium' : 'text-slate-400 hover:bg-white/5'}`}>
                        <i.icon className="w-4 h-4" />{i.label}
                    </button>
                ))}</nav>
                <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/5"><Button variant="ghost" size="sm" className="w-full text-xs text-slate-500" onClick={() => router.push(`/${orgSlug}`)}><Globe className="w-3 h-3 mr-1" />Page publique</Button></div>
            </aside>
            {sidebar && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebar(false)} />}

            <main className="flex-1 min-h-screen">
                <header className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3"><button onClick={() => setSidebar(true)} className="lg:hidden p-2 hover:bg-white/5 rounded-lg"><Settings className="w-5 h-5" /></button><h1 className="text-lg font-semibold">{SIDES.find(i => i.id === tab)?.label}</h1></div>
                    <span className="text-xs text-slate-500">{students.length} étudiants • {teachers.length} profs</span>
                </header>

                <div className="p-4 sm:p-6 max-w-5xl">
                    {tab === 'general' && (
                        <div className="space-y-6">
                            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10"><h2 className="text-xl font-bold mb-4">Informations</h2><div className="grid sm:grid-cols-2 gap-3 text-sm">{[['Nom', org.name], ['Type', org.type], ['Ville', `${org.city}, ${org.country}`], ['Tél', org.phone], ['Email', org.email], ['WhatsApp', org.whatsapp || '—']].map(([k, v], i) => <div key={i}><span className="text-slate-500">{k}:</span> <span className="ml-2">{v}</span></div>)}</div></div>
                            <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10"><h3 className="font-bold text-indigo-300 mb-3 flex items-center gap-2"><Link2 className="w-5 h-5" />Liens</h3><div className="space-y-2 text-sm">{[['Page publique', `${origin}/${orgSlug}`, 'indigo'], ['Inscription prof', `${origin}/${orgSlug}/prof`, 'emerald'], ['Inscription étudiant', `${origin}/${orgSlug}/student`, 'blue']].map(([l, u, c], i) => <div key={i} className="flex items-center gap-2"><span className="text-slate-400">{l}:</span><code className={`px-2 py-1 rounded bg-white/5 text-${c}-300`}>{u}</code></div>)}</div></div>
                            <div className="grid sm:grid-cols-4 gap-4">{[{ l: 'Classes', v: cls.length, c: 'from-indigo-600 to-blue-600' }, { l: 'Matières', v: subs.length, c: 'from-emerald-600 to-green-600' }, { l: 'Profs', v: teachers.length, c: 'from-orange-600 to-amber-600' }, { l: 'Étudiants', v: students.length, c: 'from-purple-600 to-pink-600' }].map((s, i) => <div key={i} className={`p-4 rounded-xl bg-gradient-to-br ${s.c} text-center`}><div className="text-3xl font-bold">{s.v}</div><div className="text-sm text-white/80">{s.l}</div></div>)}</div>
                        </div>
                    )}

                    {tab === 'setup' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-center gap-2 mb-6">{['Classes', 'Matières', 'Professeurs'].map((s, i) => <div key={i} className="flex items-center gap-2"><button onClick={() => setStep(i)} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${step === i ? 'bg-indigo-600' : step > i ? 'bg-green-600' : 'bg-white/10 text-slate-500'}`}>{step > i ? <CheckCircle2 className="w-5 h-5" /> : i + 1}</button><span className={`text-sm hidden sm:inline ${step === i ? 'text-white font-medium' : 'text-slate-500'}`}>{s}</span>{i < 2 && <div className="w-8 h-0.5 bg-white/10" />}</div>)}</div>

                            {step === 0 && <div className="space-y-4">
                                <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                                    <h3 className="font-bold text-lg mb-3">{isCL ? '🏫 Salles de classe' : '📚 Filières et niveaux'}</h3>
                                    {isCL && <div className="mb-4"><p className="text-sm text-slate-400 mb-2">Ajout rapide:</p><div className="flex flex-wrap gap-2">{(org.type === 'college' ? COLLEGE : [...COLLEGE, ...LYCEE]).map(l => <Button key={l} size="sm" variant="outline" className="text-xs border-white/10" onClick={() => quickAdd(l)}><Plus className="w-3 h-3 mr-1" />{l}</Button>)}</div></div>}
                                    <div className="flex gap-2"><Input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addClass()} placeholder={isCL ? '6ème A...' : 'Massothérapie Niveau 1...'} className="bg-white/5 border-white/10 text-white h-10 rounded-lg" /><Button onClick={addClass} disabled={!newName.trim()} className="bg-indigo-600 shrink-0"><Plus className="w-4 h-4" /></Button></div>
                                </div>
                                {cls.length > 0 && <div className="space-y-2">{cls.map((c, i) => <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white/5 border border-white/10"><div className="flex items-center gap-3"><School className="w-4 h-4 text-indigo-400" /><span className="text-sm font-medium">{c.name}</span>{c.cycle && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300">{c.cycle}</span>}{!c.id && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300">nouveau</span>}</div><button onClick={() => setCls(p => p.filter((_, j) => j !== i))} className="text-red-400"><Trash2 className="w-4 h-4" /></button></div>)}</div>}
                                <div className="flex justify-end"><Button onClick={() => { saveCls(); setStep(1); }} disabled={cls.length === 0 || saving} className="bg-indigo-600">{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Suivant<ArrowRight className="w-4 h-4 ml-2" /></Button></div>
                            </div>}

                            {step === 1 && <div className="space-y-4">
                                <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                                    <h3 className="font-bold text-lg mb-3">📖 Matières par classe</h3>
                                    <Label className="text-slate-400 text-sm mb-1 block">Classe</Label>
                                    <select value={selCls} onChange={e => setSelCls(e.target.value)} className="w-full h-10 rounded-lg bg-white/5 border border-white/10 text-white px-3 text-sm mb-3"><option value="" className="bg-slate-900">Choisir...</option>{cls.filter(c => c.id).map(c => <option key={c.id} value={c.id!} className="bg-slate-900">{c.name}</option>)}</select>
                                    {selCls && <><Button size="sm" variant="outline" className="mb-3 text-xs border-white/10" onClick={addDefs}><Plus className="w-3 h-3 mr-1" />Matières par défaut</Button><div className="flex gap-2"><Input value={newSub} onChange={e => setNewSub(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSub()} placeholder="Nom matière" className="bg-white/5 border-white/10 text-white h-10 rounded-lg" /><Button onClick={addSub} disabled={!newSub.trim()} className="bg-emerald-600 shrink-0"><Plus className="w-4 h-4" /></Button></div></>}
                                </div>
                                {cls.filter(c => c.id).map(c => { const cs = subs.filter(s => s.classroom_id === c.id); if (!cs.length) return null; return <div key={c.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5"><h4 className="font-medium text-sm text-indigo-300 mb-2">{c.name}</h4><div className="flex flex-wrap gap-2">{cs.map((s, i) => <span key={i} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">{s.name}</span>)}</div></div>; })}
                                <div className="flex justify-between"><Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft className="w-4 h-4 mr-2" />Retour</Button><Button onClick={() => { saveSubs(); setStep(2); }} disabled={saving} className="bg-indigo-600">{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Suivant<ArrowRight className="w-4 h-4 ml-2" /></Button></div>
                            </div>}

                            {step === 2 && <div className="space-y-4">
                                <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 text-center"><UserPlus className="w-12 h-12 text-indigo-400 mx-auto mb-3" /><h3 className="font-bold text-lg mb-2">Invitez vos professeurs</h3><p className="text-sm text-slate-400 mb-4">Partagez ce lien:</p><code className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-emerald-300 text-sm">{origin}/{orgSlug}/prof</code><Button size="sm" variant="outline" className="ml-2 border-white/10" onClick={() => { navigator.clipboard.writeText(`${origin}/${orgSlug}/prof`); toast.success('Copié!'); }}>Copier</Button></div>
                                <div className="flex justify-between"><Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-2" />Retour</Button><Button onClick={finishSetup} disabled={saving} className="bg-gradient-to-r from-indigo-600 to-blue-600">{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}<CheckCircle2 className="w-4 h-4 mr-2" />Terminer</Button></div>
                            </div>}
                        </div>
                    )}

                    {tab === 'classes' && <div className="space-y-4"><div className="flex items-center justify-between"><p className="text-slate-400 text-sm">{cls.length} classe(s)</p><Button size="sm" className="bg-indigo-600" onClick={() => setTab('setup')}><Plus className="w-4 h-4 mr-1" />Ajouter</Button></div>{cls.map((c, i) => <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10"><div className="flex items-center gap-3"><School className="w-5 h-5 text-indigo-400" /><div><p className="font-medium">{c.name}</p><p className="text-xs text-slate-500">{c.cycle || '—'} • {subs.filter(s => s.classroom_id === c.id).length} matières</p></div></div></div>)}</div>}

                    {tab === 'subjects' && <div className="space-y-4"><div className="flex items-center justify-between"><p className="text-slate-400 text-sm">{subs.length} matière(s)</p><Button size="sm" className="bg-emerald-600" onClick={() => { setTab('setup'); setStep(1); }}><Plus className="w-4 h-4 mr-1" />Ajouter</Button></div>{cls.filter(c => c.id).map(c => { const cs = subs.filter(s => s.classroom_id === c.id); if (!cs.length) return null; return <div key={c.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/10"><h3 className="font-semibold text-indigo-300 mb-3">{c.name}</h3><div className="grid sm:grid-cols-2 gap-2">{cs.map((s, i) => <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5"><span className="text-sm">{s.name}</span><span className="text-xs text-slate-500">Coef.{s.coefficient}</span></div>)}</div></div>; })}</div>}

                    {tab === 'teachers' && <div className="space-y-4"><div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10"><p className="text-sm text-emerald-300">🔗 Lien prof: <code className="ml-2 px-2 py-1 rounded bg-white/5">{origin}/{orgSlug}/prof</code></p></div>{teachers.length === 0 ? <div className="text-center py-12 text-slate-500"><Users className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Aucun professeur</p></div> : teachers.map((t: any) => <div key={t.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/10"><div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center font-bold text-emerald-400">{t.first_name?.[0]}{t.last_name?.[0]}</div><div><p className="font-medium">{t.first_name} {t.last_name}</p><p className="text-xs text-slate-500">{t.speciality || '—'} • {t.email || t.phone}</p></div></div>)}</div>}

                    {tab === 'students' && <div className="space-y-4"><div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10"><p className="text-sm text-blue-300">🔗 Lien étudiant: <code className="ml-2 px-2 py-1 rounded bg-white/5">{origin}/{orgSlug}/student</code></p></div>{students.length === 0 ? <div className="text-center py-12 text-slate-500"><GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Aucun étudiant</p></div> : students.map((s: any) => <div key={s.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/10"><div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center font-bold text-blue-400">{s.first_name?.[0]}{s.last_name?.[0]}</div><div><p className="font-medium">{s.first_name} {s.last_name}</p><p className="text-xs text-slate-500">Mat: {s.matricule || '—'}</p></div></div>)}</div>}

                    {['timetable', 'evaluations', 'payments', 'disciplines'].includes(tab) && <div className="text-center py-16"><div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">{tab === 'timetable' && <Calendar className="w-8 h-8 text-slate-500" />}{tab === 'evaluations' && <ClipboardList className="w-8 h-8 text-slate-500" />}{tab === 'payments' && <CreditCard className="w-8 h-8 text-slate-500" />}{tab === 'disciplines' && <ShieldCheck className="w-8 h-8 text-slate-500" />}</div><h3 className="text-xl font-bold mb-2">{SIDES.find(i => i.id === tab)?.label}</h3><p className="text-slate-500 text-sm">Disponible prochainement</p></div>}
                </div>
            </main>
        </div>
    );
}
