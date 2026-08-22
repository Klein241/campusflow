'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PhoneCall, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Student {
    id: string;
    first_name: string;
    last_name: string;
    classroom_id?: string;
    guardian_phone?: string;
    phone?: string;
}

interface Cls {
    id?: string;
    name: string;
}

interface WhatsAppQueueItem {
    id: string;
    recipient_name: string;
    recipient_phone: string;
    message_type: string;
    message: string;
    status: 'en_attente' | 'envoye' | 'echec';
    error_log?: string;
    created_at: string;
}

interface AdminWhatsAppQueueTabProps {
    waQueue: WhatsAppQueueItem[];
    waLoading: boolean;
    loadWhatsAppQueue: () => Promise<void>;
    waFilter: 'all' | 'en_attente' | 'envoye' | 'echec';
    setWaFilter: (f: 'all' | 'en_attente' | 'envoye' | 'echec') => void;
    waTargetMode: 'single' | 'class' | 'all_school';
    setWaTargetMode: (m: 'single' | 'class' | 'all_school') => void;
    waTargetStudent: string;
    setWaTargetStudent: (s: string) => void;
    waTargetClass: string;
    setWaTargetClass: (c: string) => void;
    waCustomMessage: string;
    setWaCustomMessage: (msg: string) => void;
    sendCustomWhatsAppBroadcast: () => Promise<void>;
    waSending: boolean;
    students: Student[];
    cls: Cls[];
}

export function AdminWhatsAppQueueTab({
    waQueue,
    waLoading,
    loadWhatsAppQueue,
    waFilter,
    setWaFilter,
    waTargetMode,
    setWaTargetMode,
    waTargetStudent,
    setWaTargetStudent,
    waTargetClass,
    setWaTargetClass,
    waCustomMessage,
    setWaCustomMessage,
    sendCustomWhatsAppBroadcast,
    waSending,
    students,
    cls
}: AdminWhatsAppQueueTabProps) {
    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="font-bold text-lg flex items-center gap-2 text-emerald-400">
                        <PhoneCall className="w-5 h-5" /> Suivi &amp; Diffusion WhatsApp
                    </h2>
                    <p className="text-xs text-slate-400">
                        Gérez la file d&apos;attente des notifications automatiques (notes, reçus, sanctions) et envoyez des messages personnalisés.
                    </p>
                </div>
                <Button
                    onClick={loadWhatsAppQueue}
                    disabled={waLoading}
                    size="sm"
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 rounded-xl"
                >
                    {waLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
                    Actualiser la file
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">⏳ En Attente</span>
                    <p className="text-2xl font-black text-amber-300 mt-1">{waQueue.filter(i => i.status === 'en_attente').length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">✅ Envoyés</span>
                    <p className="text-2xl font-black text-emerald-300 mt-1">{waQueue.filter(i => i.status === 'envoye').length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                    <span className="text-xs text-red-400 font-semibold uppercase tracking-wider">❌ Échecs</span>
                    <p className="text-2xl font-black text-red-300 mt-1">{waQueue.filter(i => i.status === 'echec').length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                    <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider">📱 Total</span>
                    <p className="text-2xl font-black text-blue-300 mt-1">{waQueue.length}</p>
                </div>
            </div>

            {/* Formulaire broadcast WhatsApp */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-emerald-500/20 space-y-4">
                <h3 className="font-bold text-sm text-emerald-300 flex items-center gap-2">
                    📢 Envoyer un Message WhatsApp Personnalisé
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs text-slate-400 mb-1.5 block">Cible du message</Label>
                        <select
                            value={waTargetMode}
                            onChange={e => setWaTargetMode(e.target.value as any)}
                            className="w-full h-10 px-3 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                        >
                            <option value="single">👤 Un élève / parent spécifique</option>
                            <option value="class">🏫 Toute une classe</option>
                            <option value="all_school">📢 Tous les étudiants de l&apos;établissement</option>
                        </select>
                    </div>

                    {waTargetMode === 'single' && (
                        <div>
                            <Label className="text-xs text-slate-400 mb-1.5 block">Sélectionner l&apos;élève</Label>
                            <select
                                value={waTargetStudent}
                                onChange={e => setWaTargetStudent(e.target.value)}
                                className="w-full h-10 px-3 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                            >
                                <option value="">-- Sélectionner l&apos;élève --</option>
                                {students.map((s: any) => (
                                    <option key={s.id} value={s.id}>
                                        {s.first_name} {s.last_name} ({cls.find(c => c.id === s.classroom_id)?.name || 'Sans classe'}) -{' '}
                                        {s.guardian_phone || s.phone || 'Pas de numéro'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {waTargetMode === 'class' && (
                        <div>
                            <Label className="text-xs text-slate-400 mb-1.5 block">Sélectionner la classe</Label>
                            <select
                                value={waTargetClass}
                                onChange={e => setWaTargetClass(e.target.value)}
                                className="w-full h-10 px-3 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                            >
                                <option value="">-- Sélectionner la classe --</option>
                                {cls.map((c: any) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} ({students.filter((s: any) => s.classroom_id === c.id).length} élèves)
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div>
                    <Label className="text-xs text-slate-400 mb-1.5 block">Message à diffuser</Label>
                    <textarea
                        rows={3}
                        value={waCustomMessage}
                        onChange={e => setWaCustomMessage(e.target.value)}
                        placeholder="Ex: Rappel : La réunion des parents d'élèves aura lieu ce vendredi à 15h00..."
                        className="w-full p-3 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500/50"
                    />
                </div>

                <Button
                    onClick={sendCustomWhatsAppBroadcast}
                    disabled={waSending || !waCustomMessage.trim()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl h-10"
                >
                    {waSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PhoneCall className="w-4 h-4 mr-2" />}
                    Mettre en file d&apos;attente WhatsApp 🚀
                </Button>
            </div>

            {/* Table File WhatsApp */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-300">📋 Historique &amp; File d&apos;attente (100 derniers)</h3>
                    <div className="flex gap-1.5">
                        {(['all', 'en_attente', 'envoye', 'echec'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setWaFilter(f)}
                                className={cn(
                                    'px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all',
                                    waFilter === f
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-slate-800 text-slate-400 hover:text-white'
                                )}
                            >
                                {f === 'all' ? 'Tous' : f === 'en_attente' ? 'En attente' : f === 'envoye' ? 'Envoyés' : 'Échecs'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-900/40">
                    {waQueue.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-xs">Aucun message dans la file WhatsApp</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-white/5 text-slate-400 uppercase text-[10px]">
                                    <tr>
                                        <th className="p-3">Destinataire</th>
                                        <th className="p-3">Type</th>
                                        <th className="p-3">Message</th>
                                        <th className="p-3">Statut</th>
                                        <th className="p-3">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-slate-300">
                                    {waQueue
                                        .filter(item => waFilter === 'all' || item.status === waFilter)
                                        .map(item => (
                                            <tr key={item.id} className="hover:bg-white/[0.02]">
                                                <td className="p-3 font-semibold text-white">
                                                    {item.recipient_name}
                                                    <span className="block text-[10px] text-slate-400 font-mono">{item.recipient_phone}</span>
                                                </td>
                                                <td className="p-3">
                                                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-white/10 text-slate-300">
                                                        {item.message_type}
                                                    </span>
                                                </td>
                                                <td className="p-3 max-w-xs truncate text-slate-400" title={item.message}>
                                                    {item.message}
                                                </td>
                                                <td className="p-3">
                                                    {item.status === 'en_attente' && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                            ⏳ En attente
                                                        </span>
                                                    )}
                                                    {item.status === 'envoye' && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                            ✅ Envoyé
                                                        </span>
                                                    )}
                                                    {item.status === 'echec' && (
                                                        <span
                                                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30"
                                                            title={item.error_log}
                                                        >
                                                            ❌ Échec
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-[10px] text-slate-400">
                                                    {new Date(item.created_at).toLocaleString('fr-FR')}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
