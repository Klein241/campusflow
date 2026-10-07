import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, CreditCard, Check, Sparkles, ChevronDown, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import type { NormalizedProgram, ProgramSession } from './template-data-adapter';
import { useCurrency, convertFcfaTo } from '@/lib/currency-converter';
import { CurrencySelector } from '@/components/ui/currency-selector';

interface ProgramCardSessionSelectorProps {
    program: NormalizedProgram;
    brandColor?: string;
    onOpenInscription?: (program?: NormalizedProgram, session?: ProgramSession) => void;
    compact?: boolean;
    showPoster?: boolean;
    className?: string;
}

export const ProgramCardSessionSelector: React.FC<ProgramCardSessionSelectorProps> = ({
    program,
    brandColor = '#F59E0B',
    onOpenInscription,
    compact = false,
    showPoster = true,
    className = '',
}) => {
    const { currency, formatPrice, convertCycle } = useCurrency();
    const sessions = program.sessions && program.sessions.length > 0 ? program.sessions : [];
    const [selectedId, setSelectedId] = useState<string>(sessions[0]?.id || '');
    const [showInstallmentsDetails, setShowInstallmentsDetails] = useState(false);

    const activeSession: ProgramSession | undefined = sessions.find(s => s.id === selectedId) || sessions[0];
    const poster = program.poster_url || program.image;

    if (!activeSession) {
        return null;
    }

    const hasMultipleSessions = sessions.length > 1;
    const hasInstallments = activeSession.installments && activeSession.installments.length > 1;

    return (
        <div className={`space-y-3.5 ${className}`}>
            {/* ── 1. Affiche / Poster de la formation si disponible ── */}
            {showPoster && poster && (
                <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] rounded-2xl overflow-hidden bg-slate-900 border border-white/10 group-hover:border-amber-500/40 transition-all shadow-lg">
                    <img
                        src={poster}
                        alt={`Affiche ${program.nom}`}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                    
                    {/* Badge Catégorie / Statut flottant */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span
                            className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-md text-white border border-white/20"
                            style={{ backgroundColor: `${brandColor}cc` }}
                        >
                            {program.category || 'Formation'}
                        </span>
                        {activeSession.promo_badge && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/90 text-white backdrop-blur-md shadow">
                                {activeSession.promo_badge}
                            </span>
                        )}
                    </div>

                    {/* Rythme actif affiché sur l'affiche */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs text-white/90">
                        <span className="flex items-center gap-1 text-[11px] font-bold bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10">
                            <Clock className="w-3 h-3 text-amber-400" />
                            {activeSession.duration_label}
                        </span>
                        <span className="font-mono font-black text-xs text-amber-300 bg-black/70 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                            {activeSession.price ? formatPrice(activeSession.price) : convertCycle(activeSession.formatted_price)}
                        </span>
                    </div>
                </div>
            )}

            {/* ── 2. Sélecteur de Durée / Rythme de Session (Option 2) ── */}
            {hasMultipleSessions && (
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-300 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-400" />
                            Choisissez votre rythme :
                        </span>
                        <span className="text-[10px] text-slate-400">
                            {sessions.length} options disponibles
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                        {sessions.map(s => {
                            const isSelected = s.id === activeSession.id;
                            const pillPrice = s.price > 0 ? (
                                currency === 'XAF' ? `${Math.round(s.price / 1000)}k` :
                                currency === 'EUR' ? `${Math.round(convertFcfaTo(s.price, 'EUR'))} €` :
                                `$${Math.round(convertFcfaTo(s.price, 'USD'))}`
                            ) : 'Gratuit';

                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedId(s.id);
                                    }}
                                    className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer relative flex flex-col items-center justify-center ${
                                        isSelected
                                            ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/25 scale-[1.02]'
                                            : 'text-slate-300 hover:text-white hover:bg-white/5 font-semibold text-[11px]'
                                    }`}
                                >
                                    <span className="text-[11px] leading-tight line-clamp-1">
                                        {s.duration_label}
                                    </span>
                                    <span className={`text-[9px] font-mono leading-tight ${isSelected ? 'text-slate-900 font-extrabold' : 'text-slate-400'}`}>
                                        {pillPrice}
                                    </span>
                                    {isSelected && (
                                        <motion.div
                                            layoutId={`active-session-dot-${program.id}`}
                                            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-900 flex items-center justify-center"
                                        >
                                            <Check className="w-1.5 h-1.5 text-black stroke-[3]" />
                                        </motion.div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── 3. Affichage du Tarif de la Session Active ── */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] space-y-2">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <p className="text-[10px] text-slate-400 font-medium">
                                Tarif ({activeSession.label})
                            </p>
                            <CurrencySelector variant="compact" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            {activeSession.formatted_prix_barre && (
                                <span className="text-xs text-slate-500 line-through font-mono">
                                    {activeSession.prix_barre ? formatPrice(activeSession.prix_barre) : convertCycle(activeSession.formatted_prix_barre)}
                                </span>
                            )}
                            <span className="text-lg font-black text-white font-mono tracking-tight">
                                {activeSession.price ? formatPrice(activeSession.price) : convertCycle(activeSession.formatted_price)}
                            </span>
                        </div>
                    </div>

                    {activeSession.promo_badge && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black">
                            {activeSession.promo_badge}
                        </span>
                    )}
                </div>

                {activeSession.description && (
                    <p className="text-[11px] text-slate-400 leading-snug">
                        {activeSession.description}
                    </p>
                )}

                {/* ── 4. Option Paiement Échelonné par Tranches ── */}
                {hasInstallments && (
                    <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowInstallmentsDetails(!showInstallmentsDetails);
                            }}
                            className="w-full flex items-center justify-between text-[11px] text-amber-400 hover:text-amber-300 font-bold transition cursor-pointer py-0.5"
                        >
                            <span className="flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Paiement par tranches ({activeSession.installments.length} tranches)</span>
                            </span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${showInstallmentsDetails ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Aperçu compact des tranches */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {activeSession.installments.map((inst, i) => (
                                <div
                                    key={i}
                                    className="p-1.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center"
                                >
                                    <p className="text-[9px] text-slate-400 leading-tight truncate">
                                        {inst.label}
                                    </p>
                                    <p className="text-[11px] font-mono font-bold text-amber-300 leading-snug">
                                        {inst.amount ? formatPrice(inst.amount) : convertCycle(inst.formatted_amount)}
                                    </p>
                                    {inst.due_date_label && (
                                        <p className="text-[8px] text-slate-500 leading-tight">
                                            {inst.due_date_label}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Détails complémentaires déroulants */}
                        <AnimatePresence>
                            {showInstallmentsDetails && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden pt-1 text-[10px] text-slate-400 space-y-1"
                                >
                                    <p className="flex items-center gap-1 text-slate-300">
                                        <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                                        <span>Validation de votre place dès le règlement de la <strong>1ère Tranche</strong>.</span>
                                    </p>
                                    <p className="text-[9px] text-slate-500">
                                        Paiement sécurisé par Mobile Money (Orange Money, MTN MoMo, Wave) ou virement bancaire.
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Bouton CTA optionnel si fourni */}
            {onOpenInscription && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenInscription(program, activeSession);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                    <span>Postuler à cette session</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
};

export default ProgramCardSessionSelector;
