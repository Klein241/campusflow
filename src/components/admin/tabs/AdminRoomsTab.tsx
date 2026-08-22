'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Room {
    id?: string;
    name: string;
}

interface AdminRoomsTabProps {
    rooms: Room[];
    setRooms?: React.Dispatch<React.SetStateAction<Room[]>>;
    orgId?: string;
    addRoomDirect?: (name: string) => Promise<void>;
    updateRoom?: (id: string, name: string) => Promise<void>;
    deleteRoom?: (id: string) => Promise<void>;
    saving?: boolean;
}

export function AdminRoomsTab({
    rooms,
    setRooms,
    orgId,
    addRoomDirect,
    updateRoom,
    deleteRoom,
    saving = false
}: AdminRoomsTabProps) {
    const [directNewRoom, setDirectNewRoom] = useState('');
    const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
    const [editRoomName, setEditRoomName] = useState('');

    const handleAdd = async () => {
        if (!directNewRoom.trim()) return;
        if (addRoomDirect) {
            await addRoomDirect(directNewRoom.trim());
        } else if (orgId && setRooms) {
            const { data, error } = await supabase.from('rooms').insert({ name: directNewRoom.trim(), organization_id: orgId }).select().single();
            if (error) { toast.error(error.message); }
            else if (data) { setRooms(p => [...p, data]); toast.success('Salle ajoutée !'); }
        }
        setDirectNewRoom('');
    };

    const handleUpdate = async (id: string) => {
        if (!editRoomName.trim()) return;
        if (updateRoom) {
            await updateRoom(id, editRoomName.trim());
        } else if (setRooms) {
            const { error } = await supabase.from('rooms').update({ name: editRoomName.trim() }).eq('id', id);
            if (error) { toast.error(error.message); }
            else { setRooms(p => p.map(r => r.id === id ? { ...r, name: editRoomName.trim() } : r)); toast.success('Salle modifiée !'); }
        }
        setEditingRoomId(null);
    };

    const handleDelete = async (id: string) => {
        if (deleteRoom) {
            await deleteRoom(id);
        } else if (setRooms) {
            const { error } = await supabase.from('rooms').delete().eq('id', id);
            if (error) { toast.error(error.message); }
            else { setRooms(p => p.filter(r => r.id !== id)); toast.success('Salle supprimée !'); }
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
                <p className="text-slate-400 text-sm">{rooms.length} salle(s) physique(s)</p>
            </div>

            <div className="p-3 rounded-xl bg-amber-600/5 border border-amber-500/10 text-xs text-slate-400">
                🏢 <strong>Salle</strong> = lieu physique où se déroulent les cours (ex: Salle 101, Amphi A, Lab chimie). Différent des <strong>classes</strong> (groupes d'étudiants).
            </div>

            {/* Formulaire d'ajout */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                <h3 className="font-bold text-sm mb-3 text-white">➕ Ajouter une salle de cours</h3>
                <div className="flex gap-2">
                    <Input
                        value={directNewRoom}
                        onChange={e => setDirectNewRoom(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        placeholder="Ex: Salle 101, Amphi A, Lab chimie..."
                        className="bg-white/5 border-white/10 text-white h-10 rounded-lg"
                    />
                    <Button
                        onClick={handleAdd}
                        disabled={!directNewRoom.trim() || saving}
                        className="bg-amber-600 hover:bg-amber-500 font-bold shrink-0"
                    >
                        <Plus className="w-4 h-4 mr-1" /> Ajouter
                    </Button>
                </div>
            </div>

            {/* Cartes des Salles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map(r => (
                    <div
                        key={r.id}
                        className="p-5 rounded-2xl bg-gradient-to-br from-[#1c1813] via-[#16130e] to-[#0E0C09] border border-white/10 hover:border-amber-500/40 transition-all duration-300 shadow-xl flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold shrink-0">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        {editingRoomId === r.id ? (
                                            <div className="flex gap-2">
                                                <Input
                                                    value={editRoomName}
                                                    onChange={e => setEditRoomName(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleUpdate(r.id!)}
                                                    className="bg-white/5 border-white/10 text-white h-8 rounded-lg text-sm"
                                                    autoFocus
                                                />
                                                <Button size="sm" className="bg-emerald-600 h-8 px-2" onClick={() => handleUpdate(r.id!)}>
                                                    <Save className="w-3 h-3" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingRoomId(null)}>
                                                    <X className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <h4 className="font-bold text-white text-base truncate">{r.name}</h4>
                                                <span className="inline-block text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/20 font-semibold">
                                                    Salle de cours
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {r.id && editingRoomId !== r.id && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => {
                                                setEditingRoomId(r.id!);
                                                setEditRoomName(r.name);
                                            }}
                                            className="text-slate-400 hover:text-amber-300 p-1.5 rounded-lg hover:bg-white/5 transition"
                                            title="Modifier le nom"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(r.id!)}
                                            className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition"
                                            title="Supprimer la salle"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {rooms.length === 0 && (
                <div className="text-center py-12 text-slate-500 bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                    <Building2 className="w-12 h-12 mx-auto mb-2 opacity-30 text-amber-400" />
                    <p className="text-sm">Aucune salle physique enregistrée</p>
                </div>
            )}
        </div>
    );
}
