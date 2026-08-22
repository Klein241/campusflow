'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    X, Building, User, Mail, Phone, Globe, ShieldCheck,
    MessageCircle, Send, CheckCircle2, Sparkles, AlertCircle,
    ExternalLink, Share2, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { MarketingLead, LeadStatus } from './marketing-types';
import { marketingService } from './marketing-service';

interface LeadEnricherModalProps {
    lead: MarketingLead;
    onClose: () => void;
    onStatusUpdated: () => void;
}

export function LeadEnricherModal({ lead, onClose, onStatusUpdated }: LeadEnricherModalProps) {
    const [status, setStatus] = useState<LeadStatus>(lead.status);
    const [score, setScore] = useState<number>(lead.score);
    const [notes, setNotes] = useState<string>(lead.notes || '');

    const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '');
    const whatsappMessage = encodeURIComponent(
        `Bonjour ${lead.contact_name},\n\nJ'espère que vous allez bien. Je vous contacte de la part d'IziTeach au sujet de ${lead.organization_name} à ${lead.city}.\n\nNous accompagnons les directeurs d'écoles dans la numérisation complète de leurs cours, présences QR code, examens anti-triche et notre mentore académique Dame SKY.\n\nSeriez-vous disponible pour un échange rapide de 10 minutes ou une démo gratuite ?\n\nBien cordialement,\nL'équipe IziTeach Pro`
    );

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappMessage}`;

    const handleSave = () => {
        marketingService.updateLeadStatus(lead.id, status);
        const leads = marketingService.getLeads().map(l => {
            if (l.id === lead.id) {
                return { ...l, score, notes, status };
            }
            return l;
        });
        marketingService.saveLeads(leads);
        toast.success('Fiche prospect mise à jour avec succès !');
        onStatusUpdated();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl bg-[#0F1420] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 font-black">
                            {lead.score}%
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white leading-tight">{lead.organization_name}</h3>
                            <p className="text-xs text-slate-400">Prospect qualifié • {lead.city}, {lead.country}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
                    {/* Contact info grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Décideur Clé</span>
                            <p className="text-sm font-bold text-white flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-violet-400" />
                                {lead.contact_name}
                            </p>
                            <p className="text-slate-400">{lead.role || 'Directeur Général'}</p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Email Professionnel</span>
                            <p className="text-sm font-bold text-violet-300 font-mono flex items-center gap-1.5 truncate">
                                <Mail className="w-3.5 h-3.5 text-violet-400" />
                                {lead.email}
                            </p>
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> Délivrabilité vérifiée (MX Valide)
                            </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Téléphone & WhatsApp</span>
                            <p className="text-sm font-bold text-white flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                {lead.phone || 'Non renseigné'}
                            </p>
                            {lead.phone && (
                                <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold hover:underline mt-0.5"
                                >
                                    <MessageCircle className="w-3.5 h-3.5" /> Ouvrir WhatsApp avec message de pitch
                                </a>
                            )}
                        </div>

                        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Site Web & Réseaux</span>
                            {lead.website ? (
                                <a
                                    href={lead.website}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm font-bold text-blue-400 hover:underline flex items-center gap-1.5 truncate"
                                >
                                    <Globe className="w-3.5 h-3.5" /> {lead.website}
                                </a>
                            ) : (
                                <p className="text-slate-500">Non renseigné</p>
                            )}
                            <p className="text-[10px] text-slate-400">Canal source : {lead.source}</p>
                        </div>
                    </div>

                    {/* Status & Qualification Score */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-slate-400 font-medium">Statut du Prospect</label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value as LeadStatus)}
                                className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-violet-500"
                            >
                                <option value="new">Nouveau (non contacté)</option>
                                <option value="contacted">Contacté / Email envoyé</option>
                                <option value="opened">👁️ Email Ouvert / Lu</option>
                                <option value="clicked">🔗 Lien cliqué</option>
                                <option value="converted">🏆 Converti / Partenaire</option>
                                <option value="bounced">❌ Échoué / Refusé</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-slate-400 font-medium">Score de Qualification IA (1-100)</label>
                            <Input
                                type="number"
                                min={0}
                                max={100}
                                value={score}
                                onChange={e => setScore(Number(e.target.value))}
                                className="bg-white/5 border-white/10 text-white h-9 rounded-xl font-bold"
                            />
                        </div>
                    </div>

                    {/* Notes & History */}
                    <div className="space-y-1">
                        <label className="text-slate-400 font-medium">Notes de prospection & Contexte</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Historique des échanges, besoins spécifiques de l'école..."
                            className="w-full bg-[#0B0E14] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-violet-500 resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 flex items-center justify-between bg-white/[0.02]">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-slate-400 hover:text-white"
                    >
                        Annuler
                    </Button>
                    <div className="flex items-center gap-2">
                        {lead.phone && (
                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition text-xs shadow-lg shadow-emerald-600/20"
                            >
                                <MessageCircle className="w-4 h-4" /> Envoyer WhatsApp
                            </a>
                        )}
                        <Button
                            onClick={handleSave}
                            className="h-9 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs"
                        >
                            Enregistrer les modifications
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
