'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Eye, Lock, Loader2, Volume2, FileDown, Download, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';

interface AdminMonitoringTabProps {
    org: any;
    students: any[];
    teachers: any[];
    adminSkyPoints: number;
    unlockMonitoring: () => Promise<void>;
}

export function AdminMonitoringTab({
    org,
    students,
    teachers,
    adminSkyPoints,
    unlockMonitoring
}: AdminMonitoringTabProps) {
    const isUnlocked = !!org?.monitoring_unlocked;

    const [monitoringLoaded, setMonitoringLoaded] = useState(false);
    const [monitoringConvs, setMonitoringConvs] = useState<any[]>([]);
    const [monitoringActiveConv, setMonitoringActiveConv] = useState<any>(null);
    const [monitoringMessages, setMonitoringMessages] = useState<any[]>([]);
    const [monitoringLoadingMsgs, setMonitoringLoadingMsgs] = useState(false);
    const [monitoringSearch, setMonitoringSearch] = useState('');
    const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);

    const loadConversations = async () => {
        setMonitoringLoaded(false);
        try {
            const { data: convs } = await supabase
                .from('chat_conversations')
                .select('*, chat_participants(user_id)')
                .eq('organization_id', org.id)
                .order('created_at', { ascending: false });

            // Enrichir avec le dernier message
            const enriched = await Promise.all(
                (convs || []).map(async (c: any) => {
                    const { data: lastMsg } = await supabase
                        .from('chat_messages')
                        .select('content, created_at, sender_id, msg_type, media_url')
                        .eq('conversation_id', c.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    const { count } = await supabase
                        .from('chat_messages')
                        .select('id', { count: 'exact', head: true })
                        .eq('conversation_id', c.id);

                    return {
                        ...c,
                        lastMessage: lastMsg?.content,
                        lastMsgType: lastMsg?.msg_type,
                        lastMessageAt: lastMsg?.created_at || c.created_at,
                        totalMessages: count || 0
                    };
                })
            );

            enriched.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
            setMonitoringConvs(enriched);
            setMonitoringLoaded(true);
            toast.success('Conversations chargées !');
        } catch (e: any) {
            toast.error('Erreur chargement monitoring : ' + e.message);
        }
    };

    const handleSelectConv = async (conv: any) => {
        setMonitoringActiveConv(conv);
        setMonitoringLoadingMsgs(true);
        try {
            const { data: msgs } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: true })
                .limit(100);

            setMonitoringMessages(msgs || []);
        } catch (err: any) {
            toast.error('Erreur messages : ' + err.message);
        } finally {
            setMonitoringLoadingMsgs(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {!isUnlocked ? (
                <div className="max-w-md mx-auto my-12 text-center p-8 rounded-3xl bg-[#0F1420] border border-white/10 shadow-2xl">
                    <div className="w-16 h-16 rounded-2xl bg-violet-600/20 text-violet-400 mx-auto flex items-center justify-center text-2xl mb-4">
                        👁️
                    </div>
                    <h3 className="text-lg font-black text-white mb-2">Surveillance &amp; Audit des Conversations</h3>
                    <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                        Cette fonctionnalité permet au responsable d'établissement de consulter l'ensemble des échanges (DMs et groupes) pour des raisons de modération et de sécurité des élèves.
                    </p>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-6 text-left space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Coût de déblocage</span>
                            <span className="text-amber-400 font-bold">⭐ 10 Sky Points</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Votre solde actuel</span>
                            <span className="text-white font-semibold">⭐ {new Intl.NumberFormat('fr-FR').format(adminSkyPoints)} pts</span>
                        </div>
                        {adminSkyPoints < 10 && (
                            <p className="text-xs text-red-400 mt-3 text-center">
                                Solde insuffisant. Revenez chaque jour pour gagner +1 Sky Point.
                            </p>
                        )}
                    </div>
                    <button
                        onClick={unlockMonitoring}
                        disabled={adminSkyPoints < 10}
                        className="px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-900/40 flex items-center justify-center gap-2 w-full"
                    >
                        <Lock className="w-4 h-4" /> Débloquer le Monitoring (−10 Sky Points)
                    </button>
                    <p className="text-xs text-slate-600 mt-4">Déblocage permanent • Ne sera plus demandé par la suite</p>
                </div>
            ) : (
                <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-xl font-black text-white flex items-center gap-2">
                                <Eye className="w-5 h-5 text-violet-400" /> Monitoring &amp; Surveillance des Conversations
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">Audit et surveillance en temps réel de tous les DMs et groupes de l'établissement.</p>
                        </div>
                        <button
                            onClick={loadConversations}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition shadow-lg shadow-violet-600/20"
                        >
                            Charger toutes les conversations
                        </button>
                    </div>

                    {!monitoringLoaded ? (
                        <div className="text-center py-16 text-slate-500 bg-white/[0.01] rounded-3xl border border-dashed border-white/5">
                            <p className="text-4xl mb-3">👁️</p>
                            <p className="font-medium text-white">Cliquez sur &quot;Charger toutes les conversations&quot; pour commencer la surveillance</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
                            {/* Liste conversations */}
                            <div className="lg:col-span-1 bg-black/30 rounded-2xl border border-white/10 overflow-hidden flex flex-col">
                                <div className="p-3 border-b border-white/5">
                                    <input
                                        value={monitoringSearch}
                                        onChange={e => setMonitoringSearch(e.target.value)}
                                        placeholder="Rechercher une conversation..."
                                        className="w-full h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white placeholder:text-slate-600 outline-none focus:border-violet-500/50"
                                    />
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {monitoringConvs
                                        .filter(c => !monitoringSearch || (c.name || '').toLowerCase().includes(monitoringSearch.toLowerCase()))
                                        .map((conv: any) => (
                                            <button
                                                key={conv.id}
                                                onClick={() => handleSelectConv(conv)}
                                                className={`w-full text-left p-3 border-b border-white/5 hover:bg-white/5 transition ${
                                                    monitoringActiveConv?.id === conv.id ? 'bg-violet-500/10 border-l-2 border-l-violet-500' : ''
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-white truncate">{conv.name || 'Conversation sans nom'}</p>
                                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                                            {conv.type === 'direct' ? '💬 DM' : '👥 Groupe'} · {conv.totalMessages} msgs
                                                        </p>
                                                        {conv.lastMessage && (
                                                            <p className={`text-[10px] truncate mt-1 ${
                                                                conv.lastMsgType === 'image' ? 'text-teal-400' : conv.lastMsgType === 'voice' ? 'text-amber-400' : conv.lastMsgType === 'file' ? 'text-blue-400' : 'text-slate-400'
                                                            }`}>
                                                                {conv.lastMessage}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        <span className="text-[9px] text-slate-600 block">
                                                            {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : ''}
                                                        </span>
                                                        {conv.totalMessages > 0 && (
                                                            <span className="text-[8px] bg-violet-500/30 text-violet-300 rounded-full px-1.5 py-0.5 mt-0.5 inline-block font-mono">
                                                                {conv.totalMessages}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    {monitoringConvs.length === 0 && (
                                        <div className="text-center py-10 text-slate-600 text-xs">Aucune conversation trouvée</div>
                                    )}
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="lg:col-span-2 bg-black/30 rounded-2xl border border-white/10 overflow-hidden flex flex-col">
                                {!monitoringActiveConv ? (
                                    <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
                                        Sélectionnez une conversation pour voir les messages
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-white text-sm">{monitoringActiveConv.name || 'Conversation'}</h3>
                                                <p className="text-[10px] text-slate-500">
                                                    {monitoringActiveConv.type === 'direct' ? 'Message Direct' : 'Groupe'} · {monitoringMessages.length} messages
                                                </p>
                                            </div>
                                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold">
                                                🔴 MODE SURVEILLANCE
                                            </span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                            {monitoringLoadingMsgs ? (
                                                <div className="flex items-center justify-center py-10">
                                                    <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                                                </div>
                                            ) : monitoringMessages.length === 0 ? (
                                                <div className="text-center py-10 text-slate-600 text-xs">Aucun message dans cette conversation</div>
                                            ) : (
                                                monitoringMessages.map((msg: any) => {
                                                    const senderStu = students.find((s: any) => s.id === msg.sender_id);
                                                    const senderProf = teachers.find((t: any) => t.id === msg.sender_id);
                                                    const senderName = senderStu
                                                        ? `${senderStu.first_name} ${senderStu.last_name}`
                                                        : senderProf
                                                        ? `${senderProf.first_name} ${senderProf.last_name}`
                                                        : 'Admin';
                                                    const senderRole = senderStu ? 'Étudiant' : senderProf ? 'Professeur' : 'Admin';
                                                    const roleColor = senderStu ? 'text-teal-300' : senderProf ? 'text-amber-300' : 'text-violet-300';
                                                    return (
                                                        <div key={msg.id} className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black bg-white/10 ${roleColor}`}>
                                                                        {senderName[0]}{senderName.split(' ')[1]?.[0] || ''}
                                                                    </div>
                                                                    <div>
                                                                        <span className={`text-[11px] font-bold ${roleColor}`}>{senderName}</span>
                                                                        <span className="ml-1.5 text-[10px] text-slate-600 font-normal">({senderRole})</span>
                                                                    </div>
                                                                </div>
                                                                <span className="text-[9px] text-slate-600">
                                                                    {new Date(msg.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            {/* Contenu média */}
                                                            {msg.msg_type === 'image' && msg.media_url ? (
                                                                <div className="relative group">
                                                                    <img
                                                                        src={msg.media_url}
                                                                        alt="Image envoyée"
                                                                        className="w-full max-h-48 object-cover rounded-xl border border-white/10 cursor-pointer hover:opacity-90 transition"
                                                                        onClick={() => setSelectedImageModal(msg.media_url)}
                                                                    />
                                                                    <button
                                                                        onClick={() => setSelectedImageModal(msg.media_url)}
                                                                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                                                                    >
                                                                        <Maximize2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    {msg.content && <p className="text-xs text-slate-400 mt-1.5 leading-relaxed italic">{msg.content}</p>}
                                                                </div>
                                                            ) : msg.msg_type === 'voice' && msg.media_url ? (
                                                                <div className="flex items-center gap-3 bg-teal-600/10 border border-teal-500/20 rounded-xl p-2.5">
                                                                    <Volume2 className="w-4 h-4 text-teal-400 shrink-0" />
                                                                    <audio
                                                                        src={msg.media_url}
                                                                        controls
                                                                        className="flex-1 h-8"
                                                                        style={{ filter: 'invert(0.8) hue-rotate(150deg) brightness(0.9)' }}
                                                                    />
                                                                </div>
                                                            ) : msg.msg_type === 'file' && msg.media_url ? (
                                                                <a
                                                                    href={msg.media_url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600/20 transition"
                                                                >
                                                                    <FileDown className="w-4 h-4 text-blue-400 shrink-0" />
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-xs font-medium text-blue-300 truncate">{msg.content || 'Fichier joint'}</p>
                                                                        <p className="text-[10px] text-slate-500">Cliquer pour télécharger</p>
                                                                    </div>
                                                                    <Download className="w-3.5 h-3.5 text-slate-500" />
                                                                </a>
                                                            ) : msg.msg_type === 'system' ? (
                                                                <p className="text-xs text-slate-500 italic text-center">{msg.content}</p>
                                                            ) : (
                                                                <p className="text-xs text-white leading-relaxed">{msg.content}</p>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                        <div className="p-3 border-t border-white/5 text-center">
                                            <p className="text-[10px] text-slate-600">Mode lecture seule — L&apos;administrateur supervise les échanges en toute discrétion.</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal Image Zoom */}
            {selectedImageModal && (
                <div
                    className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
                    onClick={() => setSelectedImageModal(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
                        <img src={selectedImageModal} alt="Image zoomée" className="w-full h-full object-contain" />
                    </div>
                </div>
            )}
        </div>
    );
}
