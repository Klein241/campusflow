'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart3, Users, Eye, Mail, CheckCircle2,
    Search, Filter, Trash2, Globe, Phone, ExternalLink,
    Send, AlertCircle, TrendingUp, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { marketingService } from './marketing-service';
import { MarketingLead, LeadStatus } from './marketing-types';
import { LeadEnricherModal } from './LeadEnricherModal';

interface LeadAnalyticsViewProps {
    onOpenCampaignComposer?: (lead: MarketingLead) => void;
}

export function LeadAnalyticsView({ onOpenCampaignComposer }: LeadAnalyticsViewProps) {
    const [leads, setLeads] = useState<MarketingLead[]>(() => marketingService.getLeads());
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | LeadStatus>('all');
    const [countryFilter, setCountryFilter] = useState('all');
    const [inspectingLead, setInspectingLead] = useState<MarketingLead | null>(null);

    const stats = marketingService.getStats();

    const filteredLeads = leads.filter(l => {
        const matchSearch = l.organization_name.toLowerCase().includes(search.toLowerCase()) ||
            l.contact_name.toLowerCase().includes(search.toLowerCase()) ||
            l.email.toLowerCase().includes(search.toLowerCase()) ||
            l.city.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || l.status === statusFilter;
        const matchCountry = countryFilter === 'all' || l.country === countryFilter;
        return matchSearch && matchStatus && matchCountry;
    });

    const countries = Array.from(new Set(leads.map(l => l.country)));

    const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
        marketingService.updateLeadStatus(leadId, newStatus);
        setLeads(marketingService.getLeads());
        toast.success(`Statut du prospect mis à jour : ${newStatus}`);
    };

    const handleDeleteLead = (leadId: string) => {
        if (!confirm('Supprimer ce prospect ?')) return;
        marketingService.deleteLead(leadId);
        setLeads(marketingService.getLeads());
        toast.success('Prospect supprimé');
    };

    return (
        <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                    <p className="text-xs text-slate-400 font-medium">Total Prospects Scrapés</p>
                    <p className="text-2xl font-black text-white">{stats.total_leads}</p>
                    <p className="text-[10px] text-emerald-400">{stats.qualified_leads} qualifiés (score &gt; 80%)</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                    <p className="text-xs text-slate-400 font-medium">Taux d'Ouverture Détecté</p>
                    <p className="text-2xl font-black text-indigo-400">{stats.open_rate}%</p>
                    <p className="text-[10px] text-slate-400">{stats.emails_opened} emails lus / {stats.emails_sent} envoyés</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                    <p className="text-xs text-slate-400 font-medium">Taux de Clics sur Liens</p>
                    <p className="text-2xl font-black text-fuchsia-400">{stats.click_rate}%</p>
                    <p className="text-[10px] text-slate-400">{stats.clicks_count} clics enregistrés</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                    <p className="text-xs text-slate-400 font-medium">Conversions & Déploiements</p>
                    <p className="text-2xl font-black text-amber-400">{stats.conversions_count}</p>
                    <p className="text-[10px] text-amber-400/80">Taux de conversion : {stats.conversion_rate}%</p>
                </div>
            </div>

            {/* CRM & Tracking Table */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Users className="w-4 h-4 text-indigo-400" />
                            Répertoire des Prospects & Détection de Lecture en Direct
                        </h3>
                        <p className="text-[11px] text-slate-400">Statuts d'ouverture d'email mis à jour en temps réel par pixel de tracking</p>
                    </div>

                    {/* Filter controls */}
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-56">
                            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Rechercher une école, contact..."
                                className="bg-white/5 border-white/10 text-white text-xs h-8 pl-8 rounded-xl"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as any)}
                            className="bg-[#0B0E14] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none"
                        >
                            <option value="all">Tous les statuts</option>
                            <option value="new">Nouveaux</option>
                            <option value="contacted">Contactés</option>
                            <option value="opened">Email Ouvert 👁️</option>
                            <option value="clicked">Cliqué 🔗</option>
                            <option value="converted">Converti 🏆</option>
                        </select>

                        <select
                            value={countryFilter}
                            onChange={e => setCountryFilter(e.target.value)}
                            className="bg-[#0B0E14] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none"
                        >
                            <option value="all">Tous les pays</option>
                            {countries.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-white/10 text-slate-400 font-semibold">
                                <th className="pb-3 px-2">Établissement & Décideur</th>
                                <th className="pb-3 px-2">Coordonnées</th>
                                <th className="pb-3 px-2">Localisation</th>
                                <th className="pb-3 px-2 text-center">Score IA</th>
                                <th className="pb-3 px-2">Tracking & Statut</th>
                                <th className="pb-3 px-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredLeads.map(lead => (
                                <tr key={lead.id} className="hover:bg-white/[0.02] transition">
                                    <td className="py-3 px-2">
                                        <p className="font-bold text-white">{lead.organization_name}</p>
                                        <p className="text-[11px] text-slate-400">{lead.contact_name} {lead.role ? `(${lead.role})` : ''}</p>
                                    </td>

                                    <td className="py-3 px-2 cursor-pointer" onClick={() => setInspectingLead(lead)}>
                                        <p className="font-bold text-white hover:text-violet-300 transition flex items-center gap-1.5">
                                            {lead.organization_name}
                                            <ExternalLink className="w-3 h-3 text-slate-500" />
                                        </p>
                                        <p className="text-[11px] text-slate-400">{lead.contact_name} {lead.role ? `(${lead.role})` : ''}</p>
                                    </td>

                                    <td className="py-3 px-2 cursor-pointer" onClick={() => setInspectingLead(lead)}>
                                        <p className="text-violet-300 font-mono">{lead.email}</p>
                                        <p className="text-[11px] text-slate-400">{lead.phone || 'Non renseigné'}</p>
                                    </td>

                                    <td className="py-3 px-2">
                                        <p className="text-white">{lead.city}</p>
                                        <p className="text-[11px] text-slate-400">{lead.country}</p>
                                    </td>

                                    <td className="py-3 px-2 text-center">
                                        <span className="font-black text-emerald-400">{lead.score}%</span>
                                    </td>

                                    <td className="py-3 px-2">
                                        <div className="space-y-1">
                                            <select
                                                value={lead.status}
                                                onChange={e => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                                                className={`text-[11px] rounded-lg px-2 py-0.5 font-medium border outline-none bg-black/40 ${lead.status === 'opened' || lead.status === 'clicked' || lead.status === 'converted'
                                                    ? 'text-emerald-300 border-emerald-500/30'
                                                    : lead.status === 'contacted'
                                                        ? 'text-blue-300 border-blue-500/30'
                                                        : 'text-slate-300 border-white/10'}`}
                                            >
                                                <option value="new">Nouveau</option>
                                                <option value="contacted">Envoyé</option>
                                                <option value="opened">👁️ Lu / Ouvert</option>
                                                <option value="clicked">🔗 Cliqué</option>
                                                <option value="converted">🏆 Converti</option>
                                                <option value="bounced">❌ Échoué</option>
                                            </select>

                                            {lead.opened_at && (
                                                <p className="text-[9px] text-emerald-400/80">
                                                    Lu le {new Date(lead.opened_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            )}
                                        </div>
                                    </td>

                                    <td className="py-3 px-2 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                onClick={() => setInspectingLead(lead)}
                                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition"
                                                title="Inspecter la fiche complète"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </button>
                                            {onOpenCampaignComposer && (
                                                <button
                                                    onClick={() => onOpenCampaignComposer(lead)}
                                                    className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition"
                                                    title="Envoyer un email personnalisé"
                                                >
                                                    <Send className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteLead(lead.id)}
                                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Lead Enricher Modal */}
            {inspectingLead && (
                <LeadEnricherModal
                    lead={inspectingLead}
                    onClose={() => setInspectingLead(null)}
                    onStatusUpdated={() => setLeads(marketingService.getLeads())}
                />
            )}
        </div>
    );
}
