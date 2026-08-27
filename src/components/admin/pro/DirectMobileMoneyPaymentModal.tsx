'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard, Smartphone, Check, Copy, ExternalLink,
    Send, Sparkles, X, DollarSign, ShieldCheck, RefreshCw, QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DirectMobileMoneyPaymentModalProps {
    open: boolean;
    onClose: () => void;
    courseName: string;
    coursePrice?: number | string;
    orgName: string;
    orgSlug: string;
    studentPhone?: string;
    studentName?: string;
}

export function DirectMobileMoneyPaymentModal({
    open,
    onClose,
    courseName,
    coursePrice = 50000,
    orgName,
    orgSlug,
    studentPhone = '',
    studentName = ''
}: DirectMobileMoneyPaymentModalProps) {
    const rawPrice = typeof coursePrice === 'number'
        ? coursePrice
        : parseInt(String(coursePrice).replace(/[^0-9]/g, '')) || 50000;

    const [amountType, setAmountType] = useState<'total' | 'deposit' | 'custom'>('total');
    const [customAmount, setCustomAmount] = useState<number>(Math.round(rawPrice * 0.4));
    const [provider, setProvider] = useState<'mtn' | 'orange'>('mtn');
    const [payerPhone, setPayerPhone] = useState(studentPhone);
    const [copied, setCopied] = useState(false);

    if (!open) return null;

    const finalAmount = amountType === 'total'
        ? rawPrice
        : amountType === 'deposit'
        ? Math.round(rawPrice * 0.4)
        : customAmount;

    // Lien de paiement direct
    const paymentLink = typeof window !== 'undefined'
        ? `${window.location.origin}/${orgSlug}/payer?formation=${encodeURIComponent(courseName)}&montant=${finalAmount}&nom=${encodeURIComponent(studentName)}`
        : `https://iziteach.app/${orgSlug}/payer?montant=${finalAmount}`;

    const whatsappMessage = `💳 *Lien de règlement Mobile Money — ${orgName}*\n\nBonjour ${studentName || ''},\nVoici votre lien sécurisé pour régler les frais de formation *"${courseName}"* :\n\n💰 *Montant :* ${new Intl.NumberFormat('fr-FR').format(finalAmount)} FCFA (${amountType === 'deposit' ? 'Acompte' : 'Totalité'})\n📲 *Opérateurs acceptés :* MTN Mobile Money & Orange Money\n\n👉 *Cliquez ici pour payer :* ${paymentLink}\n\nUne fois le paiement effectué, votre place est automatiquement validée !`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(paymentLink);
        setCopied(true);
        toast.success('Lien de paiement copié !');
        setTimeout(() => setCopied(false), 2500);
    };

    const handleSendWhatsApp = () => {
        const cleanPhone = payerPhone.replace(/[^0-9]/g, '');
        const fullPhone = cleanPhone.length === 9 ? `237${cleanPhone}` : cleanPhone;
        const encoded = encodeURIComponent(whatsappMessage);
        window.open(`https://wa.me/${fullPhone || ''}?text=${encoded}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative space-y-5 overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-full">
                                Mobile Money Direct
                            </span>
                            <h3 className="text-base font-black text-white mt-0.5">Paiement MTN / Orange</h3>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Formation & Choix du montant */}
                <div className="space-y-3">
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                        <span className="text-[11px] text-slate-400 font-semibold block">Formation concernée</span>
                        <p className="text-sm font-black text-white">{courseName}</p>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-300 block mb-1.5">Montant à encaisser :</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => setAmountType('total')}
                                className={cn(
                                    "p-2.5 rounded-xl border text-left transition flex flex-col justify-between",
                                    amountType === 'total'
                                        ? "bg-emerald-500/20 border-emerald-500/40 text-white"
                                        : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
                                )}
                            >
                                <span className="text-[10px] font-bold uppercase">Totalité</span>
                                <span className="text-xs font-black text-emerald-400 mt-1">
                                    {new Intl.NumberFormat('fr-FR').format(rawPrice)} F
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setAmountType('deposit')}
                                className={cn(
                                    "p-2.5 rounded-xl border text-left transition flex flex-col justify-between",
                                    amountType === 'deposit'
                                        ? "bg-amber-500/20 border-amber-500/40 text-white"
                                        : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
                                )}
                            >
                                <span className="text-[10px] font-bold uppercase">Acompte (40%)</span>
                                <span className="text-xs font-black text-amber-400 mt-1">
                                    {new Intl.NumberFormat('fr-FR').format(Math.round(rawPrice * 0.4))} F
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setAmountType('custom')}
                                className={cn(
                                    "p-2.5 rounded-xl border text-left transition flex flex-col justify-between",
                                    amountType === 'custom'
                                        ? "bg-blue-500/20 border-blue-500/40 text-white"
                                        : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
                                )}
                            >
                                <span className="text-[10px] font-bold uppercase">Personnalisé</span>
                                <span className="text-xs font-black text-blue-400 mt-1">Libre</span>
                            </button>
                        </div>

                        {amountType === 'custom' && (
                            <div className="mt-2">
                                <Input
                                    type="number"
                                    placeholder="Montant en FCFA"
                                    value={customAmount}
                                    onChange={e => setCustomAmount(Math.max(500, parseInt(e.target.value) || 0))}
                                    className="bg-white/5 border-white/10 text-white font-bold"
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-300 block mb-1">Téléphone de l'apprenant (WhatsApp / MoMo)</label>
                        <Input
                            type="text"
                            placeholder="Ex: 6XXXXXXXX"
                            value={payerPhone}
                            onChange={e => setPayerPhone(e.target.value)}
                            className="bg-white/5 border-white/10 text-white font-mono"
                        />
                    </div>
                </div>

                {/* Résumé & Boutons */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Montant du Lien</span>
                        <span className="text-xl font-black text-white">
                            {new Intl.NumberFormat('fr-FR').format(finalAmount)} FCFA
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <span className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[10px]">MTN</span>
                        <span className="px-2 py-1 rounded-md bg-orange-500/20 text-orange-300 font-bold text-[10px]">Orange</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                    <Button
                        onClick={handleSendWhatsApp}
                        className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                        <Send className="w-4 h-4" />
                        <span>Envoyer le Lien par WhatsApp</span>
                    </Button>

                    <Button
                        variant="outline"
                        onClick={handleCopyLink}
                        className="w-full h-10 rounded-xl bg-white/[0.04] border-white/10 hover:bg-white/[0.08] text-white font-bold text-xs flex items-center justify-center gap-2"
                    >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                        <span>{copied ? 'Lien Copié !' : 'Copier le Lien Direct de Paiement'}</span>
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
