'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    KeyRound, Lock, Copy, Check, Send, Phone,
    Sparkles, ExternalLink, Download, UserCheck, ShieldCheck, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface StudentAccessCredentialsModalProps {
    open: boolean;
    onClose: () => void;
    studentName: string;
    courseName: string;
    accessCode: string;
    pin: string;
    phone?: string;
    orgName: string;
    orgSlug: string;
}

export function StudentAccessCredentialsModal({
    open,
    onClose,
    studentName,
    courseName,
    accessCode,
    pin,
    phone,
    orgName,
    orgSlug
}: StudentAccessCredentialsModalProps) {
    const [copied, setCopied] = useState(false);

    if (!open) return null;

    const loginUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/${orgSlug}/login`
        : `https://iziteach.app/${orgSlug}/login`;

    const formattedMessage = `🎓 *Bienvenue chez ${orgName} !*\n\nVotre inscription à la formation *"${courseName}"* a été validée avec succès.\n\nVoici vos identifiants sécurisés pour accéder à vos cours, exercices et attestations :\n\n🔑 *Code d'accès :* \`${accessCode}\`\n🔒 *Code PIN :* \`${pin}\`\n\n👉 *Lien de connexion :* ${loginUrl}\n\n_Conservez précieusement ces identifiants._`;

    const handleCopy = () => {
        navigator.clipboard.writeText(formattedMessage);
        setCopied(true);
        toast.success('Fiche d\'accès copiée dans le presse-papier !');
        setTimeout(() => setCopied(false), 2500);
    };

    const handleSendWhatsApp = () => {
        if (!phone) {
            handleCopy();
            return;
        }
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const fullPhone = cleanPhone.length === 9 ? `237${cleanPhone}` : cleanPhone;
        const encoded = encodeURIComponent(formattedMessage);
        window.open(`https://wa.me/${fullPhone}?text=${encoded}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative space-y-6 overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                Inscription Réussie
                            </span>
                            <h3 className="text-base font-black text-white mt-0.5">Identifiants d'Accès Créés</h3>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Card Identifiants */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4">
                    <div>
                        <span className="text-[11px] text-slate-400 font-semibold block">Apprenant / Stagiaire</span>
                        <p className="text-base font-black text-white">{studentName}</p>
                        <p className="text-xs text-emerald-400">{courseName}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.06]">
                        <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08]">
                            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                <KeyRound className="w-3 h-3 text-emerald-400" /> Code d'Accès (12 car.)
                            </span>
                            <p className="font-mono text-sm font-black text-emerald-300 mt-1 tracking-wider select-all">
                                {accessCode}
                            </p>
                        </div>

                        <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08]">
                            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                <Lock className="w-3 h-3 text-amber-400" /> Code PIN Initial
                            </span>
                            <p className="font-mono text-sm font-black text-amber-300 mt-1 tracking-wider select-all">
                                {pin}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions WhatsApp & Copie */}
                <div className="space-y-2">
                    <Button
                        onClick={handleSendWhatsApp}
                        className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                        <Send className="w-4 h-4" />
                        <span>Envoyer directement par WhatsApp {phone ? `(${phone})` : ''}</span>
                    </Button>

                    <Button
                        variant="outline"
                        onClick={handleCopy}
                        className="w-full h-10 rounded-xl bg-white/[0.04] border-white/10 hover:bg-white/[0.08] text-white font-bold text-xs flex items-center justify-center gap-2"
                    >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                        <span>{copied ? 'Message Copié !' : 'Copier le message complet'}</span>
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
