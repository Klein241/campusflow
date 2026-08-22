'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Inbox, MessageSquare, Send, Sparkles, User,
    CheckCircle2, Clock, Phone, Mail, ArrowRight,
    RefreshCw, Bot, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ProspectMessage {
    id: string;
    organization_name: string;
    contact_name: string;
    email: string;
    phone?: string;
    message_text: string;
    received_at: string;
    status: 'unread' | 'replied' | 'converted';
    suggested_reply?: string;
}

const DEFAULT_INBOX_MESSAGES: ProspectMessage[] = [
    {
        id: 'msg_1',
        organization_name: 'Complexe Scolaire Bilingue La Renaissance',
        contact_name: 'Dr. Joseph Ndongo',
        email: 'direction@renaissance-edu.cm',
        phone: '+237 699 44 22 11',
        message_text: 'Bonjour, nous avons reçu votre email concernant la suite IziTeach. Pouvez-vous nous préciser si le système fonctionne sans connexion internet continue pour les salles de classe ?',
        received_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        status: 'unread',
        suggested_reply: 'Bonjour Dr. Joseph Ndongo,\n\nAbsolument ! IziTeach intègre un mode Offline-First Edge qui permet aux professeurs de saisir les notes et vérifier les présences même sans internet. Tout se synchronise automatiquement dès que la connexion est rétablie.\n\nSeriez-vous disponible demain à 14h pour une démonstration en direct de 15 minutes ?\n\nBien à vous,\nL\'équipe IziTeach Pro',
    },
    {
        id: 'msg_2',
        organization_name: 'Institut Universitaire Panafricain',
        contact_name: 'Mme Aminata Traoré',
        email: 'fondation@iup-dakar.sn',
        phone: '+221 77 555 12 34',
        message_text: 'Nous souhaiterions tester la Salle d\'Évaluation interactive pour nos 800 étudiants. Quels sont vos tarifs annuels pour l\'enseignement supérieur ?',
        received_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        status: 'unread',
        suggested_reply: 'Bonjour Mme Aminata Traoré,\n\nMerci pour votre intérêt ! Pour 800 étudiants, notre formule Campus Pro Universitaire inclut la Salle d\'Évaluation illimitée, le mentorat d\'excellence Dame SKY et la formation complète de votre équipe pour un tarif dégressif très avantageux.\n\nJe vous propose de vous envoyer notre plaquette tarifaire personnalisée dès aujourd\'hui. Quel créneau vous conviendrait le mieux pour un rapide échange ?\n\nBien cordialement,\nL\'équipe IziTeach Pro',
    }
];

export function ProspectInboxView() {
    const [messages, setMessages] = useState<ProspectMessage[]>(DEFAULT_INBOX_MESSAGES);
    const [selectedMessage, setSelectedMessage] = useState<ProspectMessage | null>(messages[0]);
    const [replyText, setReplyText] = useState(messages[0]?.suggested_reply || '');
    const [isSending, setIsSending] = useState(false);

    const handleSelectMessage = (msg: ProspectMessage) => {
        setSelectedMessage(msg);
        setReplyText(msg.suggested_reply || '');
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedMessage) return;
        setIsSending(true);
        try {
            await new Promise(r => setTimeout(r, 800));
            setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, status: 'replied' } : m));
            toast.success(`✉️ Réponse expédiée avec succès à ${selectedMessage.contact_name} !`);
        } catch {
            toast.error('Erreur lors de l\'envoi de la réponse');
        } finally {
            setIsSending(false);
        }
    };

    const handleGenerateAiReply = () => {
        if (!selectedMessage) return;
        setReplyText(
            `Bonjour ${selectedMessage.contact_name},\n\nMerci beaucoup pour votre retour d'intérêt pour IziTeach School Suite au sein de ${selectedMessage.organization_name}.\n\nNotre solution répond parfaitement à votre besoin : déploiement en 24h, formation incluse et support prioritaire 7j/7.\n\nJe reste à votre entière disposition pour planifier un créneau de démo selon vos disponibilités.\n\nExcellente journée,\nL'équipe IziTeach Pro`
        );
        toast.success('✨ Réponse IA optimisée générée !');
    };

    return (
        <div className="space-y-6">
            {/* Header banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-violet-600/10 border border-emerald-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white flex-shrink-0">
                        <Inbox className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white flex items-center gap-2">
                            Boîte de Réception des Prospects & Réponses IA
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                AI Closer & Prise de RDV
                            </span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Gérez les retours et questions des directeurs d'école et répondez en 1 clic avec l'IA pour convertir en démo.
                        </p>
                    </div>
                </div>
            </div>

            {/* Inbox Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Messages List */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center justify-between">
                        <span>Messages Reçus ({messages.length})</span>
                    </h3>

                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                        {messages.map(msg => {
                            const isSelected = selectedMessage?.id === msg.id;
                            return (
                                <div
                                    key={msg.id}
                                    onClick={() => handleSelectMessage(msg)}
                                    className={`p-3.5 rounded-xl border transition cursor-pointer space-y-1.5 ${isSelected
                                        ? 'bg-emerald-950/20 border-emerald-500/40'
                                        : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-white truncate max-w-[180px]">{msg.organization_name}</p>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${msg.status === 'unread'
                                            ? 'bg-emerald-500/20 text-emerald-300'
                                            : 'bg-slate-700 text-slate-300'}`}>
                                            {msg.status === 'unread' ? 'Nouveau' : 'Répondu'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-300">👤 {msg.contact_name}</p>
                                    <p className="text-[11px] text-slate-400 line-clamp-2 italic">"{msg.message_text}"</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Conversation & Smart Reply Panel */}
                <div className="lg:col-span-2 p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                    {selectedMessage ? (
                        <div className="space-y-4">
                            {/* Message Detail Card */}
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="text-sm font-bold text-white">{selectedMessage.organization_name}</h4>
                                        <p className="text-xs text-slate-400">
                                            {selectedMessage.contact_name} • {selectedMessage.email} {selectedMessage.phone ? `• ${selectedMessage.phone}` : ''}
                                        </p>
                                    </div>
                                    <span className="text-[10px] text-slate-500">
                                        {new Date(selectedMessage.received_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-200 leading-relaxed">
                                    {selectedMessage.message_text}
                                </div>
                            </div>

                            {/* Smart Reply Box */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-white font-bold flex items-center gap-1.5">
                                        <Bot className="w-4 h-4 text-emerald-400" />
                                        Réponse IA Recommandée (Smart Reply)
                                    </label>
                                    <button
                                        onClick={handleGenerateAiReply}
                                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" /> Régénérer la réponse
                                    </button>
                                </div>

                                <textarea
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    rows={7}
                                    className="w-full bg-[#0B0E14] border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-emerald-500 resize-none leading-relaxed"
                                />

                                <div className="flex items-center justify-between pt-1">
                                    <p className="text-[10px] text-slate-500">
                                        💡 Conseil : Inclut automatiquement le lien de prise de rendez-vous démo.
                                    </p>
                                    <Button
                                        onClick={handleSendReply}
                                        disabled={isSending}
                                        className="h-10 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/25 flex items-center gap-2"
                                    >
                                        {isSending ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" /> Envoi en cours...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" /> Envoyer la Réponse au Prospect
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-20 text-center text-slate-500 text-xs">
                            Sélectionnez un message pour voir la discussion et répondre.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
