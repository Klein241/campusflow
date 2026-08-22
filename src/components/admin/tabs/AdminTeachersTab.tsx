'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Plus, Search, Users, Trash2, X, Copy, RefreshCw,
    UserPlus, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface Cls {
    id?: string;
    name: string;
}

interface Sub {
    id?: string;
    name: string;
    coefficient?: number;
    classroom_id?: string;
    teacher_id?: string | null;
}

interface AdminTeachersTabProps {
    teachers: any[];
    setTeachers?: React.Dispatch<React.SetStateAction<any[]>>;
    subs: any[];
    setSubs?: React.Dispatch<React.SetStateAction<any[]>>;
    cls: any[];
    saving: boolean;
    createTeacher: (formData: any) => Promise<string | undefined>;
    deleteTeacher: (id: string) => Promise<void>;
    assignTeacherToSubject: (subjectId: string, teacherId: string | null) => Promise<void>;
    resetTeacherPin: (id: string, name: string) => Promise<void>;
    setSuspendModal: (modal: { id: string; name: string; type: 'teacher' | 'student'; isSuspended: boolean } | null) => void;
    setEmailModalOpen?: (open: boolean) => void;
    publicBase?: string;
}

export function AdminTeachersTab({
    teachers,
    setTeachers,
    subs,
    setSubs,
    cls,
    saving,
    createTeacher,
    deleteTeacher,
    assignTeacherToSubject,
    resetTeacherPin,
    setSuspendModal,
    setEmailModalOpen,
    publicBase
}: AdminTeachersTabProps) {
    const [showAddTeacher, setShowAddTeacher] = useState(false);
    const [teacherSearch, setTeacherSearch] = useState('');
    const [tFN, setTFN] = useState('');
    const [tLN, setTLN] = useState('');
    const [tSpec, setTSpec] = useState('');
    const [tEmail, setTEmail] = useState('');
    const [tPhone, setTPhone] = useState('');
    const [tNat, setTNat] = useState('');
    const [tMarital, setTMarital] = useState('celibataire');
    const [tChildren, setTChildren] = useState('0');
    const [tRes, setTRes] = useState('');
    const [tShowCode, setTShowCode] = useState('');

    const handleCreateTeacher = async () => {
        if (!tFN.trim() || !tLN.trim()) return;
        const code = await createTeacher({
            first_name: tFN.trim(),
            last_name: tLN.trim(),
            speciality: tSpec.trim(),
            email: tEmail.trim(),
            phone: tPhone.trim(),
            nationality: tNat.trim(),
            marital_status: tMarital,
            children_count: parseInt(tChildren) || 0,
            residence: tRes.trim()
        });
        if (code) {
            setTShowCode(code);
            setTFN('');
            setTLN('');
            setTSpec('');
            setTEmail('');
            setTPhone('');
            setTNat('');
            setTRes('');
        }
    };

    const filteredTeachers = teachers.filter((t: any) =>
        !teacherSearch ||
        `${t.first_name} ${t.last_name} ${t.speciality || ''} ${t.access_code || ''}`.toLowerCase().includes(teacherSearch.toLowerCase())
    );

    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{teachers.length} professeur(s)</p>
                <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold"
                    onClick={() => {
                        setShowAddTeacher(!showAddTeacher);
                        setTShowCode('');
                    }}
                >
                    <Plus className="w-4 h-4 mr-1" />
                    {showAddTeacher ? 'Fermer' : 'Ajouter un professeur'}
                </Button>
            </div>

            {/* Formulaire ajout */}
            {showAddTeacher && (
                <div className="p-5 rounded-2xl bg-emerald-600/5 border border-emerald-500/20 space-y-3">
                    <h3 className="font-bold text-emerald-300">👨‍🏫 Nouveau professeur</h3>
                    <div className="grid sm:grid-cols-3 gap-3">
                        <div>
                            <Label className="text-slate-400 text-xs">Prénom *</Label>
                            <Input value={tFN} onChange={e => setTFN(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1" />
                        </div>
                        <div>
                            <Label className="text-slate-400 text-xs">Nom *</Label>
                            <Input value={tLN} onChange={e => setTLN(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1" />
                        </div>
                        <div>
                            <Label className="text-slate-400 text-xs">Spécialité</Label>
                            <Input value={tSpec} onChange={e => setTSpec(e.target.value)} placeholder="Mathématiques" className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1" />
                        </div>
                        <div>
                            <Label className="text-slate-400 text-xs">Email</Label>
                            <Input type="email" value={tEmail} onChange={e => setTEmail(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1" />
                        </div>
                        <div>
                            <Label className="text-slate-400 text-xs">Téléphone</Label>
                            <Input value={tPhone} onChange={e => setTPhone(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1" />
                        </div>
                        <div>
                            <Label className="text-slate-400 text-xs">Nationalité</Label>
                            <Input value={tNat} onChange={e => setTNat(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1" />
                        </div>
                        <div>
                            <Label className="text-slate-400 text-xs">Situation matrimoniale</Label>
                            <select
                                value={tMarital}
                                onChange={e => setTMarital(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 text-white text-xs h-9 rounded-xl px-3 mt-1 focus:outline-none focus:border-emerald-500"
                            >
                                <option value="celibataire" className="bg-slate-900">Célibataire</option>
                                <option value="marie" className="bg-slate-900">Marié(e)</option>
                                <option value="divorce" className="bg-slate-900">Divorcé(e)</option>
                                <option value="veuf" className="bg-slate-900">Veuf/Veuve</option>
                            </select>
                        </div>
                        <div>
                            <Label className="text-slate-400 text-xs">Nombre d&apos;enfants</Label>
                            <Input type="number" value={tChildren} onChange={e => setTChildren(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1" />
                        </div>
                        <div>
                            <Label className="text-slate-400 text-xs">Lieu de résidence</Label>
                            <Input value={tRes} onChange={e => setTRes(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1" />
                        </div>
                    </div>
                    <Button
                        onClick={handleCreateTeacher}
                        disabled={saving || !tFN.trim() || !tLN.trim()}
                        className="bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold"
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                        <UserPlus className="w-4 h-4 mr-1" /> Créer le professeur
                    </Button>
                    {tShowCode && (
                        <div className="p-4 rounded-xl bg-emerald-600/10 border border-emerald-500/30 mt-2">
                            <p className="text-sm font-bold text-emerald-300">✅ Professeur créé ! Code d&apos;accès :</p>
                            <div className="flex items-center gap-3 mt-2">
                                <code className="text-2xl font-mono font-bold tracking-widest text-white bg-white/10 px-4 py-2 rounded-lg">{tShowCode}</code>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-emerald-500/20"
                                    onClick={() => {
                                        navigator.clipboard.writeText(tShowCode);
                                        toast.success('Code copié !');
                                    }}
                                >
                                    📋 Copier
                                </Button>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2">⚠️ Ce code unique permet au professeur de se connecter. Transmettez-le de manière sécurisée.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Barre de recherche */}
            <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <Input
                    value={teacherSearch}
                    onChange={e => setTeacherSearch(e.target.value)}
                    placeholder="Rechercher un professeur..."
                    className="bg-white/5 border-white/10 text-white h-10 pl-10 rounded-xl"
                />
            </div>

            {filteredTeachers.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Aucun professeur trouvé</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTeachers.map((t: any) => {
                        const assignedSubs = subs.filter(s => s.teacher_id === t.id);
                        return (
                            <div
                                key={t.id}
                                className="relative group p-5 rounded-2xl bg-gradient-to-br from-[#131927] via-[#111622] to-[#0E121B] border border-white/10 hover:border-emerald-500/40 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/5 flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-300 text-base shadow-inner shrink-0">
                                                {t.first_name?.[0]}{t.last_name?.[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors truncate">
                                                    {t.first_name} {t.last_name}
                                                </h4>
                                                <p className="text-xs text-emerald-400 font-medium truncate">{t.speciality || 'Enseignant'}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => deleteTeacher(t.id)}
                                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                                            title="Supprimer"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-1 text-xs text-slate-400 mb-4 bg-black/30 p-2.5 rounded-xl border border-white/5">
                                        {t.email && (
                                            <div className="truncate flex items-center gap-1.5">
                                                <span className="text-slate-500">✉️</span>
                                                <span className="text-slate-300 truncate">{t.email}</span>
                                            </div>
                                        )}
                                        {t.phone && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-slate-500">📞</span>
                                                <span className="text-slate-300">{t.phone}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1 border-t border-white/5 mt-1">
                                            <span>{t.nationality || 'Nationalité —'}</span>
                                            <span>•</span>
                                            <span>{t.marital_status || 'Situation —'}</span>
                                        </div>
                                    </div>

                                    <div className="mb-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                Classes &amp; Matières ({assignedSubs.length})
                                            </p>
                                            <span className="text-[10px] text-emerald-400 font-medium">
                                                {[...new Set(assignedSubs.map(s => s.classroom_id).filter(Boolean))].length} classe(s)
                                            </span>
                                        </div>

                                        {assignedSubs.length > 0 ? (
                                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                                {(() => {
                                                    const classMap: Record<string, any[]> = {};
                                                    assignedSubs.forEach(s => {
                                                        const cId = s.classroom_id || 'unassigned';
                                                        if (!classMap[cId]) classMap[cId] = [];
                                                        classMap[cId].push(s);
                                                    });

                                                    return Object.entries(classMap).map(([cId, cSubs]) => {
                                                        const classObj = cls.find(c => c.id === cId);
                                                        const className = classObj ? classObj.name : 'Sans classe spécifique';
                                                        return (
                                                            <div key={cId} className="p-2 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[11px] font-bold text-teal-300 flex items-center gap-1">
                                                                        🏛️ {className}
                                                                    </span>
                                                                    <span className="text-[9px] text-slate-500 font-mono">{cSubs.length} matière(s)</span>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {cSubs.map(s => (
                                                                        <span
                                                                            key={s.id}
                                                                            className="text-[11px] px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium flex items-center gap-1.5"
                                                                        >
                                                                            <span>
                                                                                📘 {s.name} <span className="text-emerald-400/60 text-[9px]">(Coef.{s.coefficient || 1})</span>
                                                                            </span>
                                                                            <button
                                                                                onClick={() => assignTeacherToSubject(s.id!, null)}
                                                                                className="text-slate-400 hover:text-red-400 p-0.5 rounded transition"
                                                                                title={`Retirer ${s.name} de ${className}`}
                                                                            >
                                                                                <X className="w-3 h-3" />
                                                                            </button>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        ) : (
                                            <div className="p-2.5 rounded-xl bg-black/20 border border-dashed border-white/10 text-center">
                                                <p className="text-xs text-slate-500 italic">Aucune classe ni matière assignée</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-white/5 space-y-2">
                                    <select
                                        onChange={e => {
                                            if (e.target.value) assignTeacherToSubject(e.target.value, t.id);
                                            e.target.value = '';
                                        }}
                                        className="text-xs h-9 rounded-xl bg-white/5 border border-white/10 text-slate-300 px-2.5 w-full hover:bg-white/10 transition cursor-pointer font-medium"
                                    >
                                        <option value="" className="bg-slate-900">+ Assigner une matière par classe...</option>
                                        {cls.map(c => {
                                            const unassignedInClass = subs.filter(s => s.classroom_id === c.id && !s.teacher_id);
                                            if (unassignedInClass.length === 0) return null;
                                            return (
                                                <optgroup key={c.id} label={`🏛️ Classe de ${c.name}`} className="bg-slate-900 font-bold text-teal-300">
                                                    {unassignedInClass.map(s => (
                                                        <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200 font-normal">
                                                            📘 {s.name} (Coef. {s.coefficient || 1})
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            );
                                        })}
                                        {subs.filter(s => !s.classroom_id && !s.teacher_id).length > 0 && (
                                            <optgroup label="🌐 Autres matières" className="bg-slate-900 font-bold text-slate-400">
                                                {subs.filter(s => !s.classroom_id && !s.teacher_id).map(s => (
                                                    <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">
                                                        📘 {s.name} (Coef. {s.coefficient || 1})
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>

                                    <div className="flex items-center gap-2">
                                        {t.access_code && (
                                            <div className="flex-1 flex items-center justify-between bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                                                <span className="text-[10px] text-slate-500 uppercase font-semibold">Code</span>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(t.access_code);
                                                        toast.success('Code copié !');
                                                    }}
                                                    className="text-xs font-mono font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                                                >
                                                    {t.access_code} <Copy className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => resetTeacherPin(t.id, `${t.first_name} ${t.last_name}`)}
                                            className="text-[11px] px-2.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 font-medium flex items-center gap-1 transition"
                                            title="Réinitialiser le PIN"
                                        >
                                            <RefreshCw className="w-3 h-3" /> Reset PIN
                                        </button>
                                        <button
                                            onClick={() =>
                                                setSuspendModal({
                                                    id: t.id,
                                                    name: `${t.first_name} ${t.last_name}`,
                                                    type: 'teacher',
                                                    isSuspended: t.is_active === false
                                                })
                                            }
                                            className={`text-[11px] px-2.5 py-2 rounded-xl border font-medium flex items-center gap-1 transition ${
                                                t.is_active === false
                                                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20'
                                                    : 'bg-red-600/10 hover:bg-red-600/20 text-red-400 border-red-500/20'
                                            }`}
                                            title={t.is_active === false ? 'Réactiver le compte' : 'Suspendre le compte'}
                                        >
                                            {t.is_active === false ? '✅ Réactiver' : '🚫 Suspendre'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
