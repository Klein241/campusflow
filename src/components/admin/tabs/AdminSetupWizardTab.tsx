'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, School, Plus, Trash2, ArrowRight, ArrowLeft, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface Cls {
    id?: string;
    name: string;
    cycle: string;
    filiere_id: string | null;
    level: number;
    capacity: number;
}

interface Sub {
    id?: string;
    name: string;
    code: string;
    coefficient: number;
    classroom_id: string;
    teacher_id: string | null;
}

interface AdminSetupWizardTabProps {
    org: any;
    isCL: boolean;
    cls: any[];
    setCls: React.Dispatch<React.SetStateAction<any[]>>;
    subs: any[];
    setSubs: React.Dispatch<React.SetStateAction<any[]>>;
    publicBase: string;
    saveCls?: () => Promise<any[]>;
    saveSubs?: () => Promise<void>;
    finishSetup: () => Promise<void>;
    saving?: boolean;
}

const COLLEGE = ['6ème', '5ème', '4ème', '3ème'];
const LYCEE = ['Seconde', 'Première', 'Terminale'];
const DEFS: Record<string, string[]> = {
    college: ['Mathématiques', 'Français', 'Anglais', 'SVT', 'Physique-Chimie', 'Histoire-Géo', 'Informatique', 'EPS'],
    lycee: ['Mathématiques', 'Français', 'Anglais', 'Physique', 'Chimie', 'SVT', 'Philosophie', 'Histoire-Géo', 'Informatique', 'EPS'],
    universite: ['Module 1', 'Module 2', 'Module 3', 'Projet tutoré', 'Stage'],
    centre_formation: ['Cours théorique', 'Travaux pratiques', 'Stage professionnel', 'Projet fin de formation'],
    institut: ['Cours fondamental', 'Spécialisation', 'Travaux pratiques', 'Stage']
};

export function AdminSetupWizardTab({
    org,
    isCL,
    cls,
    setCls,
    subs,
    setSubs,
    publicBase,
    saveCls,
    saveSubs,
    finishSetup
}: AdminSetupWizardTabProps) {
    const [step, setStep] = useState(0);
    const [newName, setNewName] = useState('');
    const [newSub, setNewSub] = useState('');
    const [selCls, setSelCls] = useState('');
    const [saving, setSaving] = useState(false);

    const addClass = () => {
        if (!newName.trim()) return;
        setCls(prev => [...prev, { name: newName.trim(), cycle: 'general', filiere_id: null, level: 1, capacity: 40 }]);
        setNewName('');
    };

    const quickAdd = (level: string) => {
        setCls(prev => [...prev, { name: `${level} A`, cycle: 'general', filiere_id: null, level: 1, capacity: 40 }]);
    };

    const addSub = () => {
        if (!newSub.trim() || !selCls) return;
        setSubs(prev => [...prev, { name: newSub.trim(), code: newSub.slice(0, 4).toUpperCase(), coefficient: 1, classroom_id: selCls, teacher_id: null }]);
        setNewSub('');
    };

    const addDefs = () => {
        if (!selCls) return;
        const list = DEFS[org.type] || DEFS.college;
        const toAdd = list.map(name => ({
            name,
            code: name.slice(0, 4).toUpperCase(),
            coefficient: 1,
            classroom_id: selCls,
            teacher_id: null
        }));
        setSubs(prev => [...prev, ...toAdd]);
        toast.success('Matières par défaut ajoutées !');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Étapes du Wizard */}
            <div className="flex items-center justify-center gap-2 mb-6">
                {['Classes', 'Matières', 'Professeurs'].map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <button
                            onClick={() => setStep(i)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                                step === i
                                    ? 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-600/25 text-white'
                                    : step > i
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-white/10 text-slate-500'
                            }`}
                        >
                            {step > i ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                        </button>
                        <span className={`text-sm hidden sm:inline ${step === i ? 'text-white font-medium' : 'text-slate-500'}`}>{s}</span>
                        {i < 2 && <div className="w-8 h-0.5 bg-white/10" />}
                    </div>
                ))}
            </div>

            {/* Étape 1 : Classes */}
            {step === 0 && (
                <div className="space-y-4">
                    <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                        <h3 className="font-bold text-lg mb-3">{isCL ? '🏫 Salles de classe' : '📚 Filières et niveaux'}</h3>
                        {isCL && (
                            <div className="mb-4">
                                <p className="text-sm text-slate-400 mb-2">Ajout rapide:</p>
                                <div className="flex flex-wrap gap-2">
                                    {(org.type === 'college' ? COLLEGE : [...COLLEGE, ...LYCEE]).map(l => (
                                        <Button key={l} size="sm" variant="outline" className="text-xs border-white/10" onClick={() => quickAdd(l)}>
                                            <Plus className="w-3 h-3 mr-1" />{l}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addClass()}
                                placeholder={isCL ? '6ème A...' : 'Niveau 1...'}
                                className="bg-white/5 border-white/10 text-white h-10 rounded-lg"
                            />
                            <Button onClick={addClass} disabled={!newName.trim()} className="bg-indigo-600 shrink-0">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {cls.length > 0 && (
                        <div className="space-y-2">
                            {cls.map((c, i) => (
                                <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <School className="w-4 h-4 text-indigo-400" />
                                        <span className="text-sm font-medium">{c.name}</span>
                                        {!c.id && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300">nouveau</span>}
                                    </div>
                                    <button onClick={() => setCls(p => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 p-1">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button
                            onClick={async () => {
                                setSaving(true);
                                try {
                                    const saved = saveCls ? await saveCls() : cls;
                                    if (saved) setCls(saved);
                                    setStep(1);
                                } finally {
                                    setSaving(false);
                                }
                            }}
                            disabled={cls.length === 0 || saving}
                            className="bg-indigo-600 hover:bg-indigo-500 font-bold"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Suivant <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Étape 2 : Matières */}
            {step === 1 && (
                <div className="space-y-4">
                    <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                        <h3 className="font-bold text-lg mb-3">📖 Matières par classe</h3>
                        <Label className="text-slate-400 text-sm mb-1 block">Classe</Label>
                        <select
                            value={selCls}
                            onChange={e => setSelCls(e.target.value)}
                            className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm mb-3 focus:outline-none focus:border-indigo-500"
                        >
                            <option value="" className="bg-[#0b0e14]">Choisir une classe...</option>
                            {cls.filter(c => c.id).map(c => (
                                <option key={c.id} value={c.id} className="bg-[#0b0e14]">{c.name}</option>
                            ))}
                        </select>

                        {selCls && (
                            <div className="mt-3">
                                <Button size="sm" variant="outline" className="mb-3 text-xs border-white/10 text-slate-300" onClick={addDefs}>
                                    <Plus className="w-3 h-3 mr-1" /> Matières standards par défaut
                                </Button>
                                <div className="flex gap-2">
                                    <Input
                                        value={newSub}
                                        onChange={e => setNewSub(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addSub()}
                                        placeholder="Nom matière (ex: Mathématiques...)"
                                        className="bg-white/5 border-white/10 text-white h-10 rounded-lg"
                                    />
                                    <Button onClick={addSub} disabled={!newSub.trim()} className="bg-emerald-600 hover:bg-emerald-500 shrink-0">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {cls.filter(c => c.id).map(c => {
                        const cs = subs.filter(s => s.classroom_id === c.id);
                        if (!cs.length) return null;
                        return (
                            <div key={c.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                <h4 className="font-medium text-sm text-indigo-300 mb-2">{c.name}</h4>
                                <div className="flex flex-wrap gap-2">
                                    {cs.map((s, i) => (
                                        <span key={i} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white">
                                            {s.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    <div className="flex justify-between">
                        <Button variant="ghost" onClick={() => setStep(0)} className="text-slate-400 hover:text-white">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
                        </Button>
                        <Button
                            onClick={async () => {
                                setSaving(true);
                                try {
                                    if (saveSubs) await saveSubs();
                                    setStep(2);
                                } finally {
                                    setSaving(false);
                                }
                            }}
                            disabled={saving}
                            className="bg-indigo-600 hover:bg-indigo-500 font-bold"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Suivant <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Étape 3 : Invitation Enseignants */}
            {step === 2 && (
                <div className="space-y-4">
                    <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                        <UserPlus className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
                        <h3 className="font-bold text-lg mb-2 text-white">Invitez vos professeurs</h3>
                        <p className="text-sm text-slate-400 mb-4">Partagez ce lien direct avec votre corps professoral :</p>
                        <div className="flex items-center justify-center gap-2">
                            <code className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-emerald-300 text-sm font-mono">
                                {publicBase}/prof
                            </code>
                            <Button
                                size="sm"
                                variant="outline"
                                className="border-white/10 text-slate-300"
                                onClick={() => {
                                    navigator.clipboard.writeText(`${publicBase}/prof`);
                                    toast.success('Lien copié dans le presse-papier !');
                                }}
                            >
                                Copier
                            </Button>
                        </div>
                    </div>
                    <div className="flex justify-between">
                        <Button variant="ghost" onClick={() => setStep(1)} className="text-slate-400 hover:text-white">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
                        </Button>
                        <Button
                            onClick={async () => {
                                setSaving(true);
                                try {
                                    await finishSetup();
                                } finally {
                                    setSaving(false);
                                }
                            }}
                            disabled={saving}
                            className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 font-bold shadow-lg"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Terminer la configuration
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
