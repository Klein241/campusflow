'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingBag, Star, X, Send, MessageCircle,
    Loader2, Check, ChevronRight, Gift, Users,
    Plus, Minus, Zap, Crown, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

// ══════════════════════════════════════════════════════════════════
// SKY POINTS STORE — Chat interne avec SKYs Klein
// Au lieu de WhatsApp : l'utilisateur envoie une demande via le chat
// SKYs Klein (superadmin) voit les demandes et crédite manuellement
// ══════════════════════════════════════════════════════════════════

const PACKS = [
    {
        id: 'starter', name: 'Starter', points: 100, price: 1.99,
        currency: 'EUR', popular: false, emoji: '⚡',
        color: 'from-slate-600 to-slate-500', savings: null,
        description: 'Idéal pour commencer',
    },
    {
        id: 'populaire', name: 'Populaire', points: 300, price: 4.99,
        currency: 'EUR', popular: true, emoji: '⭐',
        color: 'from-indigo-600 to-violet-600', savings: '-17%',
        description: 'Le plus choisi',
    },
    {
        id: 'pro', name: 'Pro', points: 700, price: 9.99,
        currency: 'EUR', popular: false, emoji: '🚀',
        color: 'from-teal-600 to-emerald-600', savings: '-29%',
        description: 'Pour les power users',
    },
    {
        id: 'premium', name: 'Premium', points: 2000, price: 24.99,
        currency: 'EUR', popular: false, emoji: '💎',
        color: 'from-amber-500 to-orange-500', savings: '-37%',
        description: 'La meilleure valeur',
    },
];

interface SkyPointsStoreProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userName: string;
    orgId: string;
    orgSlug: string;
    currentBalance?: number;
    userRole?: 'student' | 'teacher' | 'admin';
    onBalanceUpdate?: (newBalance: number) => void;
}

interface ChatMessage {
    id: string;
    sender: 'user' | 'skys';
    text: string;
    created_at: string;
    pack_id?: string;
}

// SKYs Klein avatar
function SkysBotAvatar({ size = 8 }: { size?: number }) {
    return (
        <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0`}>
            <Crown className="w-4 h-4 text-white" />
        </div>
    );
}

export function SkyPointsStore({
    isOpen, onClose, userId, userName, orgId, orgSlug,
    currentBalance = 0, userRole = 'student', onBalanceUpdate
}: SkyPointsStoreProps) {
    const [view, setView] = useState<'store' | 'chat'>('store');
    const [selectedPack, setSelectedPack] = useState<typeof PACKS[0] | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Load chat messages from Supabase + poll every 4s for SuperAdmin replies
    useEffect(() => {
        if (!isOpen || view !== 'chat') return;
        loadMessages();
        const interval = setInterval(loadMessages, 4000);
        return () => clearInterval(interval);
    }, [isOpen, view, userId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadMessages = async () => {
        setLoadingMessages(true);
        const { data } = await supabase
            .from('sky_point_requests')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        // Also fetch fresh balance
        const table = userRole === 'teacher' ? 'teacher_profiles' : 'student_profiles';
        const { data: p } = await supabase.from(table).select('sky_points').eq('id', userId).single();
        if (p && p.sky_points !== undefined && p.sky_points !== currentBalance) {
            onBalanceUpdate?.(p.sky_points);
            window.dispatchEvent(new CustomEvent('sky_points_updated', { detail: { newBalance: p.sky_points } }));
        }

        if (data) {
            const msgs: ChatMessage[] = [];
            if (data.length === 0) {
                msgs.push({
                    id: 'welcome',
                    sender: 'skys',
                    text: `Bonjour ${userName} ! 👋 Je suis **SKYs Klein**, votre gestionnaire de Sky Points.\n\nChoisissez un pack dans le store et envoyez votre demande. Je créditerai vos points après confirmation du paiement. ⭐`,
                    created_at: new Date().toISOString(),
                });
            }
            data.forEach(r => {
                msgs.push({
                    id: r.id + '_req',
                    sender: 'user',
                    text: r.message,
                    created_at: r.created_at,
                    pack_id: r.pack_id,
                });
                if (r.response) {
                    msgs.push({
                        id: r.id + '_res',
                        sender: 'skys',
                        text: r.response,
                        created_at: r.responded_at || r.created_at,
                    });
                }
                if (r.status === 'credited') {
                    msgs.push({
                        id: r.id + '_credit',
                        sender: 'skys',
                        text: `✅ **${r.points_credited} Sky Points** ont été crédités sur votre compte ! Profitez-en bien 🎉`,
                        created_at: r.credited_at || r.created_at,
                    });
                }
            });
            setMessages(msgs);
        }
        setLoadingMessages(false);
    };

    const handleSelectPack = (pack: typeof PACKS[0]) => {
        setSelectedPack(pack);
        setView('chat');
        // Pre-fill message
        setInputText(
            `Bonjour SKYs Klein ! Je souhaite acheter le pack ${pack.name} — ${pack.points} pts pour ${pack.price}€. Comment procéder au paiement ?`
        );
    };

    const sendMessage = async () => {
        if (!inputText.trim()) return;
        setSending(true);
        const text = inputText.trim();
        setInputText('');

        // Optimistic UI
        const tempMsg: ChatMessage = {
            id: 'temp-' + Date.now(),
            sender: 'user',
            text,
            created_at: new Date().toISOString(),
            pack_id: selectedPack?.id,
        };
        setMessages(prev => [...prev, tempMsg]);

        const { error } = await supabase.from('sky_point_requests').insert({
            user_id: userId,
            user_name: userName,
            org_id: orgId,
            org_slug: orgSlug,
            pack_id: selectedPack?.id || null,
            pack_name: selectedPack?.name || null,
            points_requested: selectedPack?.points || null,
            amount: selectedPack?.price || null,
            currency: selectedPack?.currency || 'EUR',
            message: text,
            status: 'pending',
        });

        if (error) {
            toast.error('Erreur envoi: ' + error.message);
        } else {
            // Auto reply from SKYs Klein
            const autoReply: ChatMessage = {
                id: 'auto-' + Date.now(),
                sender: 'skys',
                text: selectedPack
                    ? `Merci pour votre demande ! 📋\n\nPack sélectionné : **${selectedPack.name}** (${selectedPack.points} pts · ${selectedPack.price}€)\n\nJe vais vérifier votre demande et vous envoyer les instructions de paiement. Temps de traitement : quelques minutes. ⏳`
                    : `Message reçu ! Je vous réponds dès que possible. 👍`,
                created_at: new Date().toISOString(),
            };
            setTimeout(() => {
                setMessages(prev => [
                    ...prev.filter(m => m.id !== tempMsg.id),
                    { ...tempMsg, id: 'sent-' + Date.now() },
                    autoReply,
                ]);
            }, 800);
            setSelectedPack(null);
            toast.success('Message envoyé à SKYs Klein ✉️');
        }
        setSending(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
                    onClick={onClose}>
                    <motion.div
                        initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }} transition={{ type: 'spring', damping: 25 }}
                        className="bg-[#0a0c12] border border-white/10 rounded-3xl w-full max-w-md h-[600px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="p-4 border-b border-white/[0.07] flex items-center gap-3 shrink-0">
                            <SkysBotAvatar />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-black text-sm text-white">SKYs Klein</p>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-[10px] text-emerald-400">En ligne</span>
                                </div>
                                <p className="text-[10px] text-slate-500">Gestionnaire Sky Points · CampusFlow</p>
                            </div>
                            <div className="flex items-center gap-1">
                                {/* Tabs */}
                                <button onClick={() => setView('store')}
                                    className={cn('px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                                        view === 'store' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-500 hover:text-slate-300'
                                    )}>
                                    <ShoppingBag className="w-3.5 h-3.5 inline mr-1" />Store
                                </button>
                                <button onClick={() => setView('chat')}
                                    className={cn('px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                                        view === 'chat' ? 'bg-violet-500/20 text-violet-300' : 'text-slate-500 hover:text-slate-300'
                                    )}>
                                    <MessageCircle className="w-3.5 h-3.5 inline mr-1" />Chat
                                </button>
                                <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/5 text-slate-500 transition ml-1">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Balance banner */}
                        <div className="flex items-center justify-between px-4 py-2 bg-amber-500/[0.06] border-b border-amber-500/10 shrink-0">
                            <div className="flex items-center gap-2">
                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                <span className="text-xs text-slate-400">Votre solde</span>
                            </div>
                            <span className="text-sm font-black text-amber-300">{currentBalance.toLocaleString()} pts</span>
                        </div>

                        {/* ── STORE VIEW ──────────────────────────────── */}
                        <AnimatePresence mode="wait">
                            {view === 'store' && (
                                <motion.div key="store"
                                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="flex-1 overflow-y-auto p-4 space-y-3">

                                    {/* Info */}
                                    <div className="flex items-start gap-3 bg-violet-500/10 border border-violet-500/15 rounded-2xl p-3">
                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                                            <Crown className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-violet-300">Chat direct avec SKYs Klein</p>
                                            <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                                                Choisissez un pack → envoyez votre demande → recevez vos points après confirmation.
                                            </p>
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-slate-500 text-center">
                                        🎁 Chaque jour vous recevez 1 point gratuit. Pour plus, achetez un pack !
                                    </p>

                                    {/* Packs */}
                                    {PACKS.map((pack, i) => (
                                        <motion.button key={pack.id}
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.06 }}
                                            onClick={() => handleSelectPack(pack)}
                                            className={cn(
                                                'w-full text-left p-4 rounded-2xl border transition-all group relative overflow-hidden hover:scale-[1.01] active:scale-[0.99]',
                                                pack.popular
                                                    ? 'border-indigo-500/40 bg-indigo-500/10'
                                                    : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
                                            )}>
                                            <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-gradient-to-br ${pack.color}`} />
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${pack.color} flex items-center justify-center shadow-lg shrink-0 text-xl`}>
                                                    {pack.emoji}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-white text-sm">{pack.name}</span>
                                                        {pack.popular && (
                                                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                                                                ⭐ POPULAIRE
                                                            </span>
                                                        )}
                                                        {pack.savings && (
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                                                                {pack.savings}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-slate-400">{pack.description}</p>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                                        <span className="text-xs font-bold text-amber-300">{pack.points.toLocaleString()} pts</span>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-lg font-black text-white">{pack.price}€</p>
                                                    <ChevronRight className="w-4 h-4 text-slate-600 ml-auto mt-0.5 group-hover:text-slate-300 transition-colors" />
                                                </div>
                                            </div>
                                        </motion.button>
                                    ))}

                                    <p className="text-[9px] text-slate-700 text-center pb-2 leading-relaxed">
                                        Les Sky Points permettent d'accéder à du contenu premium, des publications et fonctionnalités exclusives.
                                    </p>
                                </motion.div>
                            )}

                            {/* ── CHAT VIEW ─────────────────────────────── */}
                            {view === 'chat' && (
                                <motion.div key="chat"
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex-1 flex flex-col min-h-0">

                                    {/* Messages */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                        {loadingMessages && (
                                            <div className="flex justify-center py-8">
                                                <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                                            </div>
                                        )}
                                        {messages.map(msg => (
                                            <div key={msg.id} className={cn('flex gap-2', msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                                                {msg.sender === 'skys' && <SkysBotAvatar size={7} />}
                                                <div className={cn(
                                                    'max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed',
                                                    msg.sender === 'user'
                                                        ? 'bg-violet-600 text-white rounded-tr-none'
                                                        : 'bg-white/[0.06] border border-white/8 text-slate-200 rounded-tl-none'
                                                )}>
                                                    {/* Render bold markdown */}
                                                    {msg.text.split('\n').map((line, i) => (
                                                        <p key={i} className={i > 0 ? 'mt-1' : ''}>
                                                            {line.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                                                                part.startsWith('**') && part.endsWith('**')
                                                                    ? <strong key={j} className="text-white font-bold">{part.slice(2, -2)}</strong>
                                                                    : part
                                                            )}
                                                        </p>
                                                    ))}
                                                    <p className={cn('text-[9px] mt-1 opacity-50', msg.sender === 'user' ? 'text-right' : 'text-left')}>
                                                        {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={chatEndRef} />
                                    </div>

                                    {/* Selected pack preview */}
                                    <AnimatePresence>
                                        {selectedPack && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="px-4 py-2 border-t border-white/5 overflow-hidden">
                                                <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{selectedPack.emoji}</span>
                                                        <div>
                                                            <p className="text-xs font-bold text-amber-300">{selectedPack.name}</p>
                                                            <p className="text-[10px] text-slate-400">{selectedPack.points} pts · {selectedPack.price}€</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setSelectedPack(null)} className="text-slate-600 hover:text-slate-300">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Input */}
                                    <div className="p-3 border-t border-white/[0.06] flex gap-2 shrink-0">
                                        <input
                                            value={inputText}
                                            onChange={e => setInputText(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                            placeholder="Écrire un message à SKYs Klein..."
                                            className="flex-1 bg-white/5 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40"
                                        />
                                        <button
                                            onClick={sendMessage}
                                            disabled={sending || !inputText.trim()}
                                            className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                                            {sending
                                                ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                                                : <Send className="w-4 h-4 text-white" />
                                            }
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
