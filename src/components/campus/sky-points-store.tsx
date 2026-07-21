'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ══════════════════════════════════════════════════════════
// SKY POINTS STORE — Packs à prix dégressif
// Gestion des packs définie par le superadmin
// Paiement via lien externe (Stripe ou PayPal)
// ══════════════════════════════════════════════════════════

const PACKS = [
    { id: 'starter', name: 'Starter', points: 100, price: 1.99, currency: 'EUR', popular: false, emoji: '⚡', color: 'from-slate-600 to-slate-500', savings: null },
    { id: 'populaire', name: 'Populaire', points: 300, price: 4.99, currency: 'EUR', popular: true, emoji: '⭐', color: 'from-indigo-600 to-violet-600', savings: '-17%' },
    { id: 'pro', name: 'Pro', points: 700, price: 9.99, currency: 'EUR', popular: false, emoji: '🚀', color: 'from-teal-600 to-emerald-600', savings: '-29%' },
    { id: 'premium', name: 'Premium', points: 2000, price: 24.99, currency: 'EUR', popular: false, emoji: '💎', color: 'from-amber-500 to-orange-500', savings: '-37%' },
];

interface SkyPointsStoreProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    orgId: string;
    currentBalance?: number;
}

export function SkyPointsStore({ isOpen, onClose, userId, orgId, currentBalance = 0 }: SkyPointsStoreProps) {
    const handleBuy = (pack: typeof PACKS[0]) => {
        const msg = encodeURIComponent(
            `Bonjour ! Je souhaite acheter le pack Sky Points *${pack.name}* — ${pack.points} points pour ${pack.price}€.\n` +
            `Mon ID utilisateur : ${userId}\n` +
            `Organisation : ${orgId}\n` +
            `Merci de confirmer ma commande.`
        );
        window.open(`https://wa.me/24165701140?text=${msg}`, '_blank');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
                    onClick={onClose}>
                    <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
                        className="bg-[#0a0c12] border border-white/10 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
                        onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="sticky top-0 bg-[#0a0c12]/95 backdrop-blur-sm p-5 border-b border-white/[0.07] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-500/20 flex items-center justify-center border border-amber-500/20">
                                    <ShoppingBag className="w-5 h-5 text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="font-black text-white text-base">Sky Points Store</h2>
                                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                        Solde actuel: <span className="text-amber-300 font-bold ml-1">{currentBalance} pts</span>
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-slate-400 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-3">
                            <div className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-xl p-3 mb-4">
                                <span className="text-2xl">📱</span>
                                <div>
                                    <p className="text-xs font-semibold text-teal-300">Paiement via WhatsApp</p>
                                    <p className="text-[10px] text-slate-400">Cliquez sur un pack pour contacter l'administration. Vos points seront crédités après confirmation.</p>
                                </div>
                            </div>

                            <p className="text-xs text-slate-400 text-center pb-1">
                                Chaque jour vous recevez 1 point gratuit. Pour plus, achetez un pack !
                            </p>

                            {PACKS.map((pack, i) => (
                                <div key={pack.id}>
                                    <motion.button
                                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.06 }}
                                        onClick={() => handleBuy(pack)}
                                        className={cn(
                                            "w-full text-left p-4 rounded-2xl border transition-all group relative overflow-hidden",
                                            pack.popular
                                                ? 'border-indigo-500/40 bg-indigo-500/10'
                                                : 'border-white/[0.07] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]'
                                        )}>
                                        {/* Gradient accent */}
                                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-gradient-to-br ${pack.color}`} />

                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${pack.color} flex items-center justify-center shadow-lg shrink-0 text-xl`}>
                                                {pack.emoji}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-white">{pack.name}</span>
                                                    {pack.popular && (
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                                                            POPULAIRE
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-400">{pack.points} Sky Points</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-lg font-black text-white">{pack.price} €</p>
                                                <p className="flex items-center gap-0.5 text-xs font-bold text-amber-300">
                                                    <Star className="w-3 h-3 fill-current" />
                                                    {pack.points.toLocaleString()}
                                                </p>
                                                {pack.savings && (
                                                    <span className="text-[9px] text-emerald-400 font-bold">{pack.savings}</span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.button>
                                    <p className="text-[9px] text-slate-500 text-center mt-1">Via WhatsApp 📱</p>
                                </div>
                            ))}

                            <p className="text-[9px] text-slate-600 text-center pt-2 leading-relaxed">
                                Les Sky Points permettent d'accéder à du contenu premium, des ressources supplémentaires et des fonctionnalités exclusives sur la plateforme.
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
