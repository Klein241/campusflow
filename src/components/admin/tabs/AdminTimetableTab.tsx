'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Plus, Printer, Trash2, Loader2 } from 'lucide-react';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

interface Cls {
    id?: string;
    name: string;
}

interface Sub {
    id?: string;
    name: string;
}

interface Room {
    id?: string;
    name: string;
}

interface AdminTimetableTabProps {
    ttSlots: any[];
    cls: Cls[];
    subs: Sub[];
    rooms: Room[];
    saving: boolean;
    addSlot: (slotData: any) => Promise<void>;
    delSlot: (id: string) => Promise<void>;
    exportTimetablePdf: () => void;
}

export function AdminTimetableTab({
    ttSlots,
    cls,
    subs,
    rooms,
    saving,
    addSlot,
    delSlot,
    exportTimetablePdf
}: AdminTimetableTabProps) {
    const [ttDay, setTtDay] = useState(1);
    const [ttCls2, setTtCls2] = useState('');
    const [ttSub2, setTtSub2] = useState('');
    const [ttStart, setTtStart] = useState('08:00');
    const [ttEnd, setTtEnd] = useState('10:00');
    const [ttRoom, setTtRoom] = useState('');

    const handleAddSlot = async () => {
        if (!ttCls2 || !ttSub2) return;
        await addSlot({
            day_of_week: ttDay,
            classroom_id: ttCls2,
            subject_id: ttSub2,
            start_time: ttStart,
            end_time: ttEnd,
            room: ttRoom || null
        });
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-end">
                <Button
                    size="sm"
                    onClick={exportTimetablePdf}
                    className="bg-gradient-to-r from-indigo-600 to-violet-600 text-xs rounded-xl font-bold"
                    disabled={ttSlots.length === 0}
                >
                    <Printer className="w-3.5 h-3.5 mr-1" /> Exporter PDF
                </Button>
            </div>

            {/* Formulaire ajout créneau */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <h3 className="font-bold text-white text-sm">➕ Ajouter un créneau</h3>
                <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                        <Label className="text-slate-400 text-xs">Jour</Label>
                        <select
                            value={String(ttDay)}
                            onChange={e => setTtDay(Number(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 text-white text-xs h-9 rounded-xl px-3 mt-1 focus:outline-none focus:border-indigo-500"
                        >
                            {DAYS.map((d, i) => (
                                <option key={i} value={String(i + 1)} className="bg-slate-900">
                                    {d}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">Classe</Label>
                        <select
                            value={ttCls2}
                            onChange={e => setTtCls2(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white text-xs h-9 rounded-xl px-3 mt-1 focus:outline-none focus:border-indigo-500"
                        >
                            <option value="" className="bg-slate-900">-- Choisir --</option>
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
                            value={ttSub2}
                            onChange={e => setTtSub2(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white text-xs h-9 rounded-xl px-3 mt-1 focus:outline-none focus:border-indigo-500"
                        >
                            <option value="" className="bg-slate-900">-- Choisir --</option>
                            {subs.map(s => (
                                <option key={s.id} value={s.id!} className="bg-slate-900">
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">Début</Label>
                        <Input
                            type="time"
                            value={ttStart}
                            onChange={e => setTtStart(e.target.value)}
                            className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">Fin</Label>
                        <Input
                            type="time"
                            value={ttEnd}
                            onChange={e => setTtEnd(e.target.value)}
                            className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">Salle</Label>
                        <select
                            value={ttRoom}
                            onChange={e => setTtRoom(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white text-xs h-9 rounded-xl px-3 mt-1 focus:outline-none focus:border-indigo-500"
                        >
                            <option value="" className="bg-slate-900">Sélectionner une salle...</option>
                            {rooms.map(r => (
                                <option key={r.name} value={r.name} className="bg-slate-900">
                                    {r.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <Button
                    onClick={handleAddSlot}
                    disabled={saving || !ttCls2 || !ttSub2}
                    className="mt-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold"
                    size="sm"
                >
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                    <Plus className="w-4 h-4 mr-1" /> Ajouter
                </Button>
            </div>

            {/* Affichage par jour */}
            {DAYS.map((day, di) => {
                const slots = ttSlots.filter((s: any) => s.day_of_week === di + 1);
                if (!slots.length) return null;
                return (
                    <div key={di} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                        <h4 className="font-bold text-indigo-300 mb-2">{day}</h4>
                        <div className="space-y-2">
                            {slots.map((s: any) => (
                                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                    <div>
                                        <span className="text-sm font-medium text-white">{s.subjects?.name || '—'}</span>
                                        <span className="text-xs text-slate-400 ml-2">
                                            {s.classrooms?.name} • {s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)}
                                            {s.room ? ` • ${s.room}` : ''}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => delSlot(s.id)}
                                        className="text-red-400 hover:text-red-300 p-1 rounded-lg hover:bg-red-500/10 transition"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            {ttSlots.length === 0 && (
                <div className="text-center py-8 text-slate-500 bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                    <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucun créneau enregistré</p>
                </div>
            )}
        </div>
    );
}
