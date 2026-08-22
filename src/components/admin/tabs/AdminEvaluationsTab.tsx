'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClipboardList, Plus, Pencil, Trash2, Save, X, Loader2 } from 'lucide-react';

interface Cls {
    id?: string;
    name: string;
}

interface Sub {
    id?: string;
    name: string;
}

interface AdminEvaluationsTabProps {
    evals: any[];
    cls: Cls[];
    subs: Sub[];
    saving: boolean;
    addEval: (evalData: any) => Promise<void>;
    updateEval: (id: string, evalData: any) => Promise<void>;
    deleteEval: (id: string) => Promise<void>;
    onNavigateToGrades: (ev: any) => void;
}

export function AdminEvaluationsTab({
    evals,
    cls,
    subs,
    saving,
    addEval,
    updateEval,
    deleteEval,
    onNavigateToGrades
}: AdminEvaluationsTabProps) {
    const [evTitle, setEvTitle] = useState('');
    const [evType, setEvType] = useState('devoir');
    const [evCls, setEvCls] = useState('');
    const [evSub, setEvSub] = useState('');
    const [evDate, setEvDate] = useState('');
    const [evMax, setEvMax] = useState('20');

    const [editEvalId, setEditEvalId] = useState<string | null>(null);
    const [editEvTitle, setEditEvTitle] = useState('');
    const [editEvType, setEditEvType] = useState('devoir');
    const [editEvMax, setEditEvMax] = useState('20');

    const handleCreateEval = async () => {
        if (!evTitle.trim() || !evCls || !evSub) return;
        await addEval({
            title: evTitle.trim(),
            type: evType,
            classroom_id: evCls,
            subject_id: evSub,
            date: evDate || null,
            max_score: Number(evMax) || 20
        });
        setEvTitle('');
        setEvDate('');
    };

    const handleUpdateEval = async (id: string) => {
        if (!editEvTitle.trim()) return;
        await updateEval(id, {
            title: editEvTitle.trim(),
            type: editEvType,
            max_score: Number(editEvMax) || 20
        });
        setEditEvalId(null);
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            {/* Formulaire ajout évaluation */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <h3 className="font-bold text-white text-sm">📝 Nouvelle évaluation</h3>
                <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                        <Label className="text-slate-400 text-xs">Titre</Label>
                        <Input
                            value={evTitle}
                            onChange={e => setEvTitle(e.target.value)}
                            placeholder="Devoir n°1"
                            className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">Type</Label>
                        <select
                            value={evType}
                            onChange={e => setEvType(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white text-xs h-9 rounded-xl px-3 mt-1 focus:outline-none focus:border-indigo-500"
                        >
                            {['devoir', 'examen', 'tp', 'oral', 'projet'].map(t => (
                                <option key={t} value={t} className="bg-slate-900">
                                    {t[0].toUpperCase() + t.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">Classe</Label>
                        <select
                            value={evCls}
                            onChange={e => setEvCls(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white text-xs h-9 rounded-xl px-3 mt-1 focus:outline-none focus:border-indigo-500"
                        >
                            <option value="" className="bg-slate-900">-- Choisir classe --</option>
                            {cls
                                .filter(c => c.id)
                                .map(c => (
                                    <option key={c.id} value={c.id!} className="bg-slate-900">
                                        {c.name}
                                    </option>
                                ))}
                        </select>
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">Matière</Label>
                        <select
                            value={evSub}
                            onChange={e => setEvSub(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white text-xs h-9 rounded-xl px-3 mt-1 focus:outline-none focus:border-indigo-500"
                        >
                            <option value="" className="bg-slate-900">-- Choisir matière --</option>
                            {subs.map(s => (
                                <option key={s.id} value={s.id!} className="bg-slate-900">
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">Date</Label>
                        <Input
                            type="date"
                            value={evDate}
                            onChange={e => setEvDate(e.target.value)}
                            className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">Note max</Label>
                        <Input
                            type="number"
                            value={evMax}
                            onChange={e => setEvMax(e.target.value)}
                            className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                        />
                    </div>
                </div>
                <Button
                    onClick={handleCreateEval}
                    disabled={saving || !evTitle.trim() || !evCls || !evSub}
                    className="mt-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold"
                    size="sm"
                >
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                    <Plus className="w-4 h-4 mr-1" /> Créer
                </Button>
            </div>

            {/* Liste évaluations */}
            {evals.length > 0 ? (
                <div className="space-y-3">
                    {evals.map((ev: any) => (
                        <div key={ev.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                            {editEvalId === ev.id ? (
                                <div className="space-y-2">
                                    <div className="grid sm:grid-cols-3 gap-2">
                                        <Input
                                            value={editEvTitle}
                                            onChange={e => setEditEvTitle(e.target.value)}
                                            className="bg-white/5 border-white/10 text-white h-8 rounded-lg text-sm"
                                            placeholder="Titre"
                                        />
                                        <select
                                            value={editEvType}
                                            onChange={e => setEditEvType(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 text-white text-xs h-8 rounded-lg px-2"
                                        >
                                            {['devoir', 'examen', 'tp', 'oral', 'projet'].map(t => (
                                                <option key={t} value={t} className="bg-slate-900">
                                                    {t[0].toUpperCase() + t.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                        <Input
                                            type="number"
                                            value={editEvMax}
                                            onChange={e => setEditEvMax(e.target.value)}
                                            className="bg-white/5 border-white/10 text-white h-8 rounded-lg text-sm"
                                            placeholder="Note max"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" className="bg-emerald-600" onClick={() => handleUpdateEval(ev.id)}>
                                            <Save className="w-3 h-3 mr-1" /> Sauvegarder
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditEvalId(null)}>
                                            <X className="w-3 h-3 mr-1" /> Annuler
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-sm text-white">{ev.title}</p>
                                        <p className="text-xs text-slate-400">
                                            {ev.subjects?.name} • {ev.classrooms?.name} • /{ev.max_score}
                                            {ev.date ? ` • ${ev.date}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                                            {ev.type}
                                        </span>
                                        <button
                                            onClick={() => onNavigateToGrades(ev)}
                                            className="text-xs px-2.5 py-1 rounded-lg bg-emerald-600/10 text-emerald-300 hover:bg-emerald-600/20 border border-emerald-500/20 font-bold transition"
                                        >
                                            📝 Notes
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditEvalId(ev.id);
                                                setEditEvTitle(ev.title);
                                                setEditEvType(ev.type);
                                                setEditEvMax(String(ev.max_score));
                                            }}
                                            className="text-indigo-400 hover:text-indigo-300 p-1"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => deleteEval(ev.id)}
                                            className="text-red-400 hover:text-red-300 p-1"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-slate-500 bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                    <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucune évaluation enregistrée</p>
                </div>
            )}
        </div>
    );
}
