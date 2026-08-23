'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Sparkles, Globe, MapPin, Building, Users,
    CheckCircle2, Download, Send, Plus, Filter, Loader2,
    ExternalLink, Mail, Phone, ShieldCheck, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { marketingService } from './marketing-service';
import { MarketingLead, DeepResearchQuery } from './marketing-types';

interface LeadScraperViewProps {
    onLeadAdded?: () => void;
    onLaunchCampaignWithLeads?: (leads: MarketingLead[]) => void;
}

export function LeadScraperView({ onLeadAdded, onLaunchCampaignWithLeads }: LeadScraperViewProps) {
    const [targetType, setTargetType] = useState<DeepResearchQuery['target_type']>('ecoles_privees');
    const [country, setCountry] = useState('Gabon');
    const [city, setCity] = useState('Libreville');
    const [keywords, setKeywords] = useState('Directeur, Proviseur, Formation Bilingue');
    const [sources, setSources] = useState<('google' | 'linkedin' | 'facebook' | 'yellow_pages')[]>(['google', 'linkedin', 'yellow_pages']);
    const [isResearching, setIsResearching] = useState(false);
    const [researchLogs, setResearchLogs] = useState<string[]>([]);
    const [scrapedResults, setScrapedResults] = useState<MarketingLead[]>([]);
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

    const toggleSource = (s: 'google' | 'linkedin' | 'facebook' | 'yellow_pages') => {
        setSources(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
    };

    const handleStartDeepResearch = async () => {
        if (!country.trim()) {
            toast.error('Veuillez préciser au moins un pays ou une région cible');
            return;
        }

        setIsResearching(true);
        setResearchLogs([]);
        setScrapedResults([]);

        const logs = [
            `📡 Initialisation de l'Agent Deep Research IA...`,
            `🔍 Crawling sémantique : ${sources.join(', ')}...`,
            `🎯 Ciblage : [${targetType}] à ${city}, ${country}...`,
            `🧠 Analyse des organigrammes et extraction des décideurs...`,
            `✉️ Vérification de la délivrabilité des adresses emails...`,
            `⭐ Calcul des scores de qualification des prospects...`,
        ];

        for (let i = 0; i < logs.length; i++) {
            await new Promise(r => setTimeout(r, 600));
            setResearchLogs(prev => [...prev, logs[i]]);
        }

        try {
            const results = await marketingService.runDeepResearch({
                target_type: targetType,
                country,
                city,
                keywords,
                sources,
            });

            setScrapedResults(results);
            setSelectedLeadIds(results.map(r => r.id));
            toast.success(`🎉 Deep Research terminé : ${results.length} prospects qualifiés extraits !`);
            if (onLeadAdded) onLeadAdded();
        } catch {
            toast.error('Erreur lors du scraping de prospects');
        } finally {
            setIsResearching(false);
        }
    };

    const toggleSelectLead = (id: string) => {
        setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleExportCSV = () => {
        const leadsToExport = scrapedResults.length > 0 ? scrapedResults : marketingService.getLeads();
        if (leadsToExport.length === 0) {
            toast.error('Aucun prospect à exporter');
            return;
        }

        const headers = ['Organisation', 'Contact', 'Rôle', 'Email', 'Téléphone', 'Site Web', 'Pays', 'Ville', 'Score', 'Statut'];
        const rows = leadsToExport.map(l => [
            `"${l.organization_name}"`,
            `"${l.contact_name}"`,
            `"${l.role || ''}"`,
            `"${l.email}"`,
            `"${l.phone || ''}"`,
            `"${l.website || ''}"`,
            `"${l.country}"`,
            `"${l.city}"`,
            l.score,
            l.status
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `leads_iziteach_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('📥 Fichier CSV téléchargé avec succès !');
    };

    return (
        <div className="space-y-6">
            {/* Header banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-violet-600/10 via-indigo-600/10 to-fuchsia-600/10 border border-violet-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 text-white flex-shrink-0">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white flex items-center gap-2">
                            Deep Research & Web / Social Scraping IA
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                Superagent MCP
                            </span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Scrapez le web, réseaux sociaux et annuaires pour extraire automatiquement les décideurs, emails et téléphones d'écoles cibles.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={handleExportCSV}
                        variant="outline"
                        className="bg-white/5 border-white/10 text-white hover:bg-white/10 text-xs h-9 rounded-xl flex items-center gap-1.5"
                    >
                        <Download className="w-3.5 h-3.5" /> Exporter CSV
                    </Button>
                </div>
            </div>

            {/* Scraping Configuration Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Parameters Card */}
                <div className="lg:col-span-1 p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Filter className="w-4 h-4 text-violet-400" />
                        Critères de Prospection
                    </h3>

                    {/* Target Type */}
                    <div className="space-y-1.5">
                        <label className="text-xs text-slate-400 font-medium">Secteur / Type d'Établissement</label>
                        <select
                            value={targetType}
                            onChange={e => setTargetType(e.target.value as any)}
                            className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
                        >
                            <option value="ecoles_privees">🏫 Écoles Privées & Complexes Scolaires</option>
                            <option value="universites">🎓 Universités & Grandes Écoles</option>
                            <option value="centres_formation">💼 Centres de Formation Professionnelle</option>
                            <option value="instituts_langue">🌐 Instituts de Langues & Bilinguisme</option>
                            <option value="lycees_colleges">📚 Lycées & Collèges Modernes</option>
                            <option value="entreprises_edtech">💡 Entreprises & Hubs EdTech</option>
                        </select>
                    </div>

                    {/* Country & City */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-[11px] text-slate-400">Pays</label>
                            <Input
                                value={country}
                                onChange={e => setCountry(e.target.value)}
                                placeholder="Cameroun, Sénégal..."
                                className="bg-white/5 border-white/10 text-white text-xs h-8 rounded-xl"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] text-slate-400">Ville</label>
                            <Input
                                value={city}
                                onChange={e => setCity(e.target.value)}
                                placeholder="Douala, Abidjan..."
                                className="bg-white/5 border-white/10 text-white text-xs h-8 rounded-xl"
                            />
                        </div>
                    </div>

                    {/* Keywords */}
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-medium">Mots-clés & Décideurs Ciblés</label>
                        <Input
                            value={keywords}
                            onChange={e => setKeywords(e.target.value)}
                            placeholder="Directeur, Proviseur, Responsable Pédagogique..."
                            className="bg-white/5 border-white/10 text-white text-xs h-8 rounded-xl"
                        />
                    </div>

                    {/* Sources Selection */}
                    <div className="space-y-1.5 pt-1">
                        <label className="text-xs text-slate-400 font-medium">Canaux de Scraping IA</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'google', label: 'Google Search & Maps' },
                                { id: 'linkedin', label: 'LinkedIn Pro' },
                                { id: 'facebook', label: 'Facebook Pages' },
                                { id: 'yellow_pages', label: 'Annuaires Officiels' },
                            ].map(src => {
                                const active = sources.includes(src.id as any);
                                return (
                                    <button
                                        key={src.id}
                                        type="button"
                                        onClick={() => toggleSource(src.id as any)}
                                        className={`p-2 rounded-xl border text-[11px] font-medium text-left transition flex items-center gap-1.5 ${active
                                            ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
                                            : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/5'}`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${active ? 'bg-violet-400' : 'bg-slate-600'}`} />
                                        {src.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Start Action */}
                    <Button
                        onClick={handleStartDeepResearch}
                        disabled={isResearching}
                        className="w-full h-11 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2"
                    >
                        {isResearching ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Scraping & Deep Research en cours...
                            </>
                        ) : (
                            <>
                                <Zap className="w-4 h-4" />
                                Lancer le Deep Research IA
                            </>
                        )}
                    </Button>
                </div>

                {/* Scraping Terminal & Live Results */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Live Terminal Log */}
                    {isResearching && (
                        <div className="p-4 rounded-2xl bg-black/60 border border-violet-500/30 font-mono text-xs text-violet-300 space-y-1.5 shadow-inner">
                            <div className="flex items-center justify-between pb-2 border-b border-white/10">
                                <span className="flex items-center gap-2 text-white font-bold">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    Terminal Agent Marketing IA (MCP)
                                </span>
                                <span className="text-[10px] text-slate-500">Mode Deep Research</span>
                            </div>
                            <div className="space-y-1 max-h-40 overflow-y-auto pt-2">
                                {researchLogs.map((log, index) => (
                                    <p key={index} className="flex items-center gap-1.5">
                                        <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span>
                                        {log}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Results Table / Cards */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-white">
                                    Prospects Récemment Découverts
                                    {scrapedResults.length > 0 && ` (${scrapedResults.length})`}
                                </h3>
                                <p className="text-[11px] text-slate-400">Prêts pour l'envoi de campagnes ou export direct</p>
                            </div>
                            {selectedLeadIds.length > 0 && onLaunchCampaignWithLeads && (
                                <Button
                                    onClick={() => {
                                        const selected = (scrapedResults.length > 0 ? scrapedResults : marketingService.getLeads())
                                            .filter(l => selectedLeadIds.includes(l.id));
                                        onLaunchCampaignWithLeads(selected);
                                    }}
                                    className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
                                >
                                    <Send className="w-3.5 h-3.5" /> Créer Campagne ({selectedLeadIds.length})
                                </Button>
                            )}
                        </div>

                        {/* List */}
                        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                            {(scrapedResults.length > 0 ? scrapedResults : marketingService.getLeads()).map((lead) => {
                                const isSelected = selectedLeadIds.includes(lead.id);
                                return (
                                    <div
                                        key={lead.id}
                                        onClick={() => toggleSelectLead(lead.id)}
                                        className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${isSelected
                                            ? 'bg-violet-950/20 border-violet-500/40'
                                            : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {}}
                                                className="mt-1 rounded border-white/20 bg-white/5 text-violet-500"
                                            />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs font-bold text-white">{lead.organization_name}</p>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 font-mono">
                                                        {lead.city}, {lead.country}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-300 mt-0.5">
                                                    👤 <strong>{lead.contact_name}</strong> {lead.role ? `• ${lead.role}` : ''}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1">
                                                    <span className="flex items-center gap-1 text-violet-300">
                                                        <Mail className="w-3 h-3" /> {lead.email}
                                                    </span>
                                                    {lead.phone && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone className="w-3 h-3" /> {lead.phone}
                                                        </span>
                                                    )}
                                                    {lead.website && (
                                                        <a
                                                            href={lead.website}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="flex items-center gap-1 text-blue-400 hover:underline"
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            <Globe className="w-3 h-3" /> Site web
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-500">Score IA</p>
                                                <p className="text-xs font-black text-emerald-400">{lead.score}%</p>
                                            </div>
                                            <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${lead.status === 'opened' || lead.status === 'clicked' || lead.status === 'converted'
                                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                                : lead.status === 'contacted'
                                                    ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                                                    : 'bg-slate-500/10 text-slate-300 border border-white/10'}`}>
                                                {lead.status === 'opened' ? '👁️ Email Lu' : lead.status === 'clicked' ? '🔗 Cliqué' : lead.status === 'converted' ? '🏆 Converti' : lead.status === 'contacted' ? 'Envoyé' : 'Nouveau'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
