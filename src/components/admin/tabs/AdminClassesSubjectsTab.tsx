'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    School, Plus, Pencil, Trash2, Save, X, BookOpen,
    GraduationCap, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const COLLEGE = ['6ème', '5ème', '4ème', '3ème'];
const LYCEE = ['2nde', '1ère', 'Tle'];

interface Cls {
    id?: string;
    name: string;
    cycle?: string;
    capacity?: number;
    hourly_rate?: number;
    monthly_fee?: number;
}

interface Sub {
    id?: string;
    name: string;
    coefficient?: number;
    classroom_id?: string;
    teacher_id?: string | null;
}

interface AdminClassesSubjectsTabProps {
    org: any;
    isCL?: boolean;
    cls: any[];
    setCls: React.Dispatch<React.SetStateAction<any[]>>;
    subs: any[];
    setSubs: React.Dispatch<React.SetStateAction<any[]>>;
    teachers: any[];
    students?: any[];
    filieres?: any[];
    saving?: boolean;
    saveSubs?: () => Promise<void>;
    saveCls?: () => Promise<any[]>;
    addClassDirect?: (name?: string) => Promise<void>;
    updateClass?: (id: string, name: string) => Promise<void>;
    deleteClass?: (id: string) => Promise<void>;
    addSubjectToClass?: (classroomId: string, nameOverride?: string, coefOverride?: number) => Promise<void>;
    updateSubject?: (id: string, name: string, coef: number) => Promise<void>;
    deleteSubject?: (id: string) => Promise<void>;
    assignTeacherToSubject?: (subjectId: string, teacherId: string | null) => Promise<void>;
}

export function AdminClassesSubjectsTab({
    org,
    isCL: propIsCL,
    cls,
    setCls,
    subs,
    setSubs,
    teachers,
    students = [],
    filieres = [],
    saving = false,
    saveSubs,
    saveCls,
    addClassDirect: propAddClassDirect,
    updateClass: propUpdateClass,
    deleteClass: propDeleteClass,
    addSubjectToClass: propAddSubjectToClass,
    updateSubject: propUpdateSubject,
    deleteSubject: propDeleteSubject,
    assignTeacherToSubject: propAssignTeacherToSubject
}: AdminClassesSubjectsTabProps) {
    const isCL = propIsCL ?? (org?.type === 'college' || org?.type === 'lycee');

    const [classSearch, setClassSearch] = useState('');
    const [directNewCls, setDirectNewCls] = useState('');
    const [editingClsId, setEditingClsId] = useState<string | null>(null);
    const [editClsName, setEditClsName] = useState('');

    // Adding/Editing subjects inside a class
    const [addingSubForClassId, setAddingSubForClassId] = useState<string | null>(null);
    const [classSubName, setClassSubName] = useState('');
    const [classSubCoef, setClassSubCoef] = useState('1');
    const [classSubTeacher, setClassSubTeacher] = useState('');

    const [editingSubId, setEditingSubId] = useState<string | null>(null);
    const [editSubName, setEditSubName] = useState('');
    const [editSubCoef, setEditSubCoef] = useState('1');

    const handleAddClass = async (name?: string) => {
        const clsName = name || directNewCls.trim();
        if (!clsName) return;
        if (propAddClassDirect) {
            await propAddClassDirect(clsName);
        }
        if (!name) setDirectNewCls('');
    };

    const handleUpdateClass = async (id: string) => {
        if (!editClsName.trim()) return;
        if (propUpdateClass) {
            await propUpdateClass(id, editClsName.trim());
        }
        setEditingClsId(null);
    };

    const handleDeleteClass = async (id: string) => {
        if (propDeleteClass) {
            await propDeleteClass(id);
        }
    };

    const handleUpdateSubject = async (id: string) => {
        if (!editSubName.trim()) return;
        if (propUpdateSubject) {
            await propUpdateSubject(id, editSubName.trim(), Number(editSubCoef) || 1);
        }
        setEditingSubId(null);
    };

    const handleAddSubject = async (classroomId: string, name?: string, coef?: number) => {
        const subName = name || classSubName.trim();
        const subCoef = coef || Number(classSubCoef) || 1;
        if (!subName) return;
        if (propAddSubjectToClass) {
            await propAddSubjectToClass(classroomId, subName, subCoef);
        }
        setAddingSubForClassId(null);
        setClassSubName('');
        setClassSubCoef('1');
        setClassSubTeacher('');
    };

    const handleDeleteSubject = async (id: string) => {
        if (propDeleteSubject) {
            await propDeleteSubject(id);
        }
    };

    const handleAssignTeacher = async (subjectId: string, teacherId: string | null) => {
        if (propAssignTeacherToSubject) {
            await propAssignTeacherToSubject(subjectId, teacherId);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <School className="w-5 h-5 text-indigo-400" /> Classes &amp; Matières Enseignées
                    </h2>
                    <p className="text-slate-400 text-xs mt-0.5">
                        {cls.length} classe(s) configurée(s) · {subs.length} matière(s) réparties · {teachers.length} professeur(s)
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        value={classSearch}
                        onChange={e => setClassSearch(e.target.value)}
                        placeholder="🔍 Filtrer classe ou matière..."
                        className="bg-white/5 border-white/10 text-white text-xs h-9 w-48 sm:w-60 rounded-xl"
                    />
                </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-teal-500/10 to-transparent border border-indigo-500/20 text-xs text-slate-300 flex items-center gap-2.5">
                <span className="text-base">💡</span>
                <div>
                    <strong className="text-indigo-300">Organisation globale :</strong> Définissez les matières qui composent chaque classe ainsi que le ou les professeurs assignés. Ces informations sont <strong>automatiquement relayées</strong> dans les cartes des professeurs et dans leur tableau de bord.
                </div>
            </div>

            {/* ➕ Formulaire d'ajout d'une nouvelle classe */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <h3 className="font-bold text-sm text-indigo-300 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Ajouter une nouvelle {isCL ? 'classe' : 'filière / niveau'}
                </h3>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                        value={directNewCls}
                        onChange={e => setDirectNewCls(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddClass()}
                        placeholder={isCL ? 'Ex: 6ème A, 4ème B, Terminale D...' : 'Ex: L1 Droit, Licence 2 Gestion...'}
                        className="bg-white/5 border-white/10 text-white h-10 rounded-xl text-sm flex-1"
                    />
                    <Button
                        onClick={() => handleAddClass()}
                        disabled={!directNewCls.trim() || saving}
                        className="bg-indigo-600 hover:bg-indigo-500 h-10 px-5 shrink-0 rounded-xl font-bold"
                    >
                        <Plus className="w-4 h-4 mr-1" /> Créer la classe
                    </Button>
                </div>
                {isCL && (
                    <div className="pt-2 border-t border-white/5">
                        <p className="text-[11px] text-slate-400 mb-1.5 font-medium">Ajout rapide de niveaux scolaires :</p>
                        <div className="flex flex-wrap gap-1.5">
                            {(org.type === 'college' ? COLLEGE : [...COLLEGE, ...LYCEE]).map(l => (
                                <Button
                                    key={l}
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 px-2.5 bg-white/5 border-white/10 hover:border-indigo-500/40 text-slate-300 hover:text-white rounded-lg"
                                    onClick={() => handleAddClass(l)}
                                >
                                    <Plus className="w-3 h-3 mr-1 text-indigo-400" /> {l}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ CARTES DES CLASSES & LEURS MATIÈRES ═══ */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {cls
                    .filter(c => {
                        if (!classSearch.trim()) return true;
                        const q = classSearch.toLowerCase();
                        const matchCls = (c.name || '').toLowerCase().includes(q) || (c.cycle || '').toLowerCase().includes(q);
                        const matchSub = subs.some(s => s.classroom_id === c.id && (s.name || '').toLowerCase().includes(q));
                        return matchCls || matchSub;
                    })
                    .map((c, i) => {
                        const classStudents = students.filter((s: any) => s.classroom_id === c.id);
                        const classSubs = subs.filter(s => s.classroom_id === c.id);
                        const totalCoef = classSubs.reduce((sum, s) => sum + (s.coefficient || 1), 0);
                        const isAddingSub = addingSubForClassId === c.id;

                        return (
                            <div
                                key={c.id || i}
                                className="rounded-3xl bg-gradient-to-br from-[#121726] via-[#0F1420] to-[#0B0E17] border border-white/10 hover:border-indigo-500/30 transition-all duration-300 shadow-2xl p-5 flex flex-col justify-between space-y-4"
                            >
                                {/* Header de la classe */}
                                <div className="space-y-3 pb-3 border-b border-white/5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-lg shrink-0 shadow-inner">
                                                🏛️
                                            </div>
                                            <div className="min-w-0">
                                                {editingClsId === c.id ? (
                                                    <div className="flex gap-2 items-center">
                                                        <Input
                                                            value={editClsName}
                                                            onChange={e => setEditClsName(e.target.value)}
                                                            onKeyDown={e => e.key === 'Enter' && handleUpdateClass(c.id!)}
                                                            className="bg-white/5 border-white/10 text-white h-8 rounded-lg text-sm"
                                                            autoFocus
                                                        />
                                                        <Button size="sm" className="bg-emerald-600 h-8 px-2" onClick={() => handleUpdateClass(c.id!)}>
                                                            <Save className="w-3 h-3" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingClsId(null)}>
                                                            <X className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="font-black text-white text-base tracking-tight">{c.name}</h4>
                                                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold uppercase tracking-wider">
                                                            {c.cycle || 'Général'}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                                                        <strong>{classStudents.length}</strong> élève(s)
                                                    </span>
                                                    <span>•</span>
                                                    <span>Capacité : {c.capacity || 50}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {c.id && editingClsId !== c.id && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        setEditingClsId(c.id!);
                                                        setEditClsName(c.name);
                                                    }}
                                                    className="text-slate-400 hover:text-indigo-300 p-1.5 rounded-lg hover:bg-white/5 transition"
                                                    title="Modifier le nom de la classe"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClass(c.id!)}
                                                    className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition"
                                                    title="Supprimer la classe"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Section Matières constitutives de cette classe */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                            <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                                            Matières de cette classe ({classSubs.length})
                                        </h5>
                                        <span className="text-[11px] font-mono text-teal-400 font-semibold bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20">
                                            Total Coef : {totalCoef}
                                        </span>
                                    </div>

                                    {/* Liste des matières */}
                                    <div className="space-y-2">
                                        {classSubs.map(s => {
                                            const isEditing = editingSubId === s.id;

                                            return (
                                                <div
                                                    key={s.id}
                                                    className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                                                >
                                                    {isEditing ? (
                                                        <div className="flex gap-2 flex-1 items-center">
                                                            <Input
                                                                value={editSubName}
                                                                onChange={e => setEditSubName(e.target.value)}
                                                                onKeyDown={e => e.key === 'Enter' && handleUpdateSubject(s.id!)}
                                                                className="bg-white/5 border-white/10 text-white h-8 rounded-lg text-xs flex-1"
                                                                placeholder="Nom matière"
                                                                autoFocus
                                                            />
                                                            <Input
                                                                type="number"
                                                                value={editSubCoef}
                                                                onChange={e => setEditSubCoef(e.target.value)}
                                                                className="bg-white/5 border-white/10 text-white h-8 rounded-lg text-xs w-16"
                                                                placeholder="Coef"
                                                            />
                                                            <Button size="sm" className="bg-emerald-600 h-8 px-2.5" onClick={() => handleUpdateSubject(s.id!)}>
                                                                <Save className="w-3 h-3" />
                                                            </Button>
                                                            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingSubId(null)}>
                                                                <X className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 w-full">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="text-sm">📘</span>
                                                                <span className="text-xs font-bold text-white truncate">{s.name}</span>
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-teal-500/15 text-teal-300 border border-teal-500/25 font-mono font-bold">
                                                                    Coef. {s.coefficient || 1}
                                                                </span>
                                                            </div>

                                                            {/* Sélecteur de professeur pour cette matière */}
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <select
                                                                    value={s.teacher_id || ''}
                                                                    onChange={e => handleAssignTeacher(s.id!, e.target.value || null)}
                                                                    className="bg-[#0b0e14] border border-teal-500/30 hover:border-teal-500/60 focus:border-teal-400 text-[11px] text-teal-300 rounded-xl px-2.5 py-1 font-medium cursor-pointer transition focus:outline-none focus:ring-1 focus:ring-teal-500 max-w-[200px] truncate"
                                                                >
                                                                    <option value="" className="text-slate-400">⚠️ Aucun professeur</option>
                                                                    {teachers.map((t: any) => (
                                                                        <option key={t.id} value={t.id} className="text-white bg-[#0f1420]">
                                                                            👨‍🏫 {t.first_name} {t.last_name} {t.speciality ? `(${t.speciality})` : ''}
                                                                        </option>
                                                                    ))}
                                                                </select>

                                                                <div className="flex items-center gap-0.5">
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingSubId(s.id!);
                                                                            setEditSubName(s.name);
                                                                            setEditSubCoef(String(s.coefficient || 1));
                                                                        }}
                                                                        className="text-slate-400 hover:text-teal-300 p-1.5 rounded-lg hover:bg-white/5 transition"
                                                                        title="Modifier nom et coefficient"
                                                                    >
                                                                        <Pencil className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteSubject(s.id!)}
                                                                        className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition"
                                                                        title="Supprimer la matière de cette classe"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {classSubs.length === 0 && (
                                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-1">
                                                <p className="text-xs text-slate-400">Aucune matière n&apos;est encore assignée à cette classe.</p>
                                                <p className="text-[11px] text-slate-500">Ajoutez une matière ci-dessous ou cliquez sur une suggestion rapide.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Formulaire d'ajout d'une matière à cette classe */}
                                    {isAddingSub ? (
                                        <div className="p-3.5 rounded-2xl bg-[#0b0e14] border border-teal-500/30 space-y-3 animate-in fade-in">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-teal-300">➕ Nouvelle matière pour {c.name}</span>
                                                <button onClick={() => setAddingSubForClassId(null)} className="text-slate-400 hover:text-white p-1">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <div className="grid sm:grid-cols-3 gap-2">
                                                <div className="sm:col-span-2">
                                                    <Input
                                                        value={classSubName}
                                                        onChange={e => setClassSubName(e.target.value)}
                                                        placeholder="Nom de la matière (ex: Français, Mathématiques...)"
                                                        className="bg-white/5 border-white/10 text-white text-xs h-9 rounded-xl"
                                                        autoFocus
                                                    />
                                                </div>
                                                <div>
                                                    <Input
                                                        type="number"
                                                        value={classSubCoef}
                                                        onChange={e => setClassSubCoef(e.target.value)}
                                                        placeholder="Coef (ex: 3)"
                                                        className="bg-white/5 border-white/10 text-white text-xs h-9 rounded-xl"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <select
                                                    value={classSubTeacher}
                                                    onChange={e => setClassSubTeacher(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
                                                >
                                                    <option value="" className="bg-[#0f1420] text-slate-400">👨‍🏫 Assigner un professeur (optionnel)</option>
                                                    {teachers.map((t: any) => (
                                                        <option key={t.id} value={t.id} className="bg-[#0f1420] text-white">
                                                            👨‍🏫 {t.first_name} {t.last_name} {t.speciality ? `(${t.speciality})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setAddingSubForClassId(null)}
                                                    className="text-xs h-8"
                                                >
                                                    Annuler
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleAddSubject(c.id!)}
                                                    disabled={!classSubName.trim() || saving}
                                                    className="bg-teal-600 hover:bg-teal-500 text-xs h-8 px-4 font-bold rounded-xl"
                                                >
                                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                                                    Ajouter la matière
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 pt-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setAddingSubForClassId(c.id!);
                                                        setClassSubName('');
                                                        setClassSubCoef('1');
                                                        setClassSubTeacher('');
                                                    }}
                                                    className="w-full bg-white/5 hover:bg-teal-600/20 text-teal-300 border border-teal-500/20 hover:border-teal-500/40 text-xs h-8 rounded-xl font-bold transition"
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Ajouter une matière à cette classe
                                                </Button>
                                            </div>

                                            {/* Suggestions rapides en 1-clic */}
                                            <div className="flex flex-wrap gap-1 items-center">
                                                <span className="text-[10px] text-slate-500 mr-1">Suggestions :</span>
                                                {(org.type === 'college'
                                                    ? ['Mathématiques', 'Français', 'Anglais', 'SVT', 'Physique-Chimie', 'Histoire-Géo', 'EPS']
                                                    : ['Mathématiques', 'Français', 'Anglais', 'Physique-Chimie', 'SVT', 'Philosophie', 'Histoire-Géo', 'Informatique']
                                                ).map(subTitle => {
                                                    const alreadyExists = classSubs.some(s => s.name.toLowerCase() === subTitle.toLowerCase());
                                                    if (alreadyExists) return null;
                                                    return (
                                                        <button
                                                            key={subTitle}
                                                            onClick={() => handleAddSubject(c.id!, subTitle, 2)}
                                                            className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 hover:bg-teal-500/15 border border-white/10 hover:border-teal-500/30 text-slate-300 hover:text-teal-300 transition"
                                                            title={`Ajouter ${subTitle} (Coef. 2) à cette classe`}
                                                        >
                                                            + {subTitle}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
            </div>

            {cls.length === 0 && (
                <div className="text-center py-16 text-slate-500 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                    <School className="w-12 h-12 mx-auto mb-2 opacity-30 text-indigo-400" />
                    <p className="text-base font-bold text-white">Aucune classe configurée</p>
                    <p className="text-xs text-slate-400 mt-1">Créez votre première classe ci-dessus pour y associer des matières et des professeurs.</p>
                </div>
            )}

            {/* Matières générales non rattachées */}
            {subs.some(s => !s.classroom_id) && (
                <div className="mt-8 p-5 rounded-3xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                            ⚠️ Matières non rattachées à une classe ({subs.filter(s => !s.classroom_id).length})
                        </h4>
                        <span className="text-[11px] text-slate-400">Rattachez-les à une classe existante</span>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {subs.filter(s => !s.classroom_id).map(s => (
                            <div key={s.id} className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-white truncate">{s.name}</p>
                                    <p className="text-[10px] text-slate-400">Coef. {s.coefficient || 1}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <select
                                        onChange={async (e) => {
                                            const targetClsId = e.target.value;
                                            if (!targetClsId) return;
                                            const { error } = await supabase.from('subjects').update({ classroom_id: targetClsId }).eq('id', s.id);
                                            if (error) toast.error(error.message);
                                            else {
                                                setSubs(p => p.map(item => item.id === s.id ? { ...item, classroom_id: targetClsId } : item));
                                                toast.success('Matière rattachée à la classe ! ✅');
                                            }
                                        }}
                                        className="bg-[#0b0e14] border border-white/10 text-[11px] text-slate-200 rounded-lg px-2 py-1"
                                    >
                                        <option value="">Rattacher à...</option>
                                        {cls.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <button onClick={() => handleDeleteSubject(s.id!)} className="text-red-400 p-1 hover:bg-red-500/10 rounded-lg">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
