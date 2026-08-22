'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface Student {
    id: string;
    first_name: string;
    last_name: string;
}

interface Discipline {
    id: string;
    type: string;
    reason: string;
    student_profiles?: {
        first_name: string;
        last_name: string;
    };
}

interface AdminDisciplineTabProps {
    discs: Discipline[];
    students: Student[];
    saving: boolean;
    addDisc: (discData: any) => Promise<void>;
}

export function AdminDisciplineTab({
    discs,
    students,
    saving,
    addDisc
}: AdminDisciplineTabProps) {
    const [dStu, setDStu] = useState('');
    const [dType, setDType] = useState('avertissement');
    const [dReason, setDReason] = useState('');

    const handleAddDisc = async () => {
        if (!dStu || !dReason.trim()) return;
        await addDisc({
            student_id: dStu,
            type: dType,
            reason: dReason.trim()
        });
        setDReason('');
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            {/* Formulaire ajout sanction */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <h3 className="font-bold text-white text-sm">⚠️ Enregistrer une sanction ou incident</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                        <Label className="text-slate-400 text-xs">Étudiant</Label>
                        <select
                            value={dStu}
                            onChange={e => setDStu(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white text-xs h-9 rounded-xl px-3 mt-1 focus:outline-none focus:border-red-500"
                        >
                            <option value="" className="bg-slate-900">-- Sélectionner un étudiant --</option>
                            {students.map(s => (
                                <option key={s.id} value={s.id} className="bg-slate-900">
                                    {s.first_name} {s.last_name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">Type de sanction</Label>
                        <select
                            value={dType}
                            onChange={e => setDType(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white text-xs h-9 rounded-xl px-3 mt-1 focus:outline-none focus:border-red-500"
                        >
                            {[
                                { id: 'avertissement', label: 'Avertissement' },
                                { id: 'blame', label: 'Blâme' },
                                { id: 'exclusion_temporaire', label: 'Exclusion temporaire' },
                                { id: 'retenue', label: 'Retenue' },
                                { id: 'convocation_parent', label: 'Convocation parent' }
                            ].map(t => (
                                <option key={t.id} value={t.id} className="bg-slate-900">
                                    {t.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="sm:col-span-2">
                        <Label className="text-slate-400 text-xs">Motif de la sanction</Label>
                        <Input
                            value={dReason}
                            onChange={e => setDReason(e.target.value)}
                            placeholder="Motif..."
                            className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                        />
                    </div>
                </div>
                <Button
                    onClick={handleAddDisc}
                    disabled={saving || !dStu || !dReason.trim()}
                    className="mt-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold"
                    size="sm"
                >
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                    <ShieldCheck className="w-4 h-4 mr-1" /> Enregistrer la sanction
                </Button>
            </div>

            {/* Liste sanctions */}
            {discs.length > 0 ? (
                <div className="space-y-2">
                    {discs.map(d => (
                        <div
                            key={d.id}
                            className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10"
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black border ${
                                        d.type === 'avertissement'
                                            ? 'bg-amber-600/20 text-amber-400 border-amber-500/30'
                                            : d.type === 'blame'
                                            ? 'bg-orange-600/20 text-orange-400 border-orange-500/30'
                                            : 'bg-red-600/20 text-red-400 border-red-500/30'
                                    }`}
                                >
                                    {d.student_profiles?.first_name?.[0]}
                                    {d.student_profiles?.last_name?.[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">
                                        {d.student_profiles?.first_name} {d.student_profiles?.last_name}
                                    </p>
                                    <p className="text-xs text-slate-400">{d.reason}</p>
                                </div>
                            </div>
                            <span
                                className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                                    d.type === 'avertissement'
                                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                        : 'bg-red-500/10 text-red-300 border-red-500/20'
                                }`}
                            >
                                {d.type.replace(/_/g, ' ')}
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-slate-500 bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                    <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucune sanction enregistrée</p>
                </div>
            )}
        </div>
    );
}
