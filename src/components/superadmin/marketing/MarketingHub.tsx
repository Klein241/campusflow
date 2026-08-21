'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, Search, Mail, Wand2, BarChart3,
    Zap, Users, Send, Target, LayoutDashboard,
    GitBranch, Inbox, Calendar, MessageSquare
} from 'lucide-react';
import { LeadScraperView } from './LeadScraperView';
import { CampaignManagerView } from './CampaignManagerView';
import { AdCreativeStudioView } from './AdCreativeStudioView';
import { LeadAnalyticsView } from './LeadAnalyticsView';
import { EmailSequenceBuilder } from './EmailSequenceBuilder';
import { ProspectInboxView } from './ProspectInboxView';
import { MarketingCalendarView } from './MarketingCalendarView';
import { MarketingLead } from './marketing-types';

type MarketingSubTab = 'scraper' | 'campaigns' | 'sequences' | 'studio' | 'inbox' | 'analytics' | 'calendar';

export function MarketingHub() {
    const [subTab, setSubTab] = useState<MarketingSubTab>('scraper');
    const [selectedLeadsForCampaign, setSelectedLeadsForCampaign] = useState<MarketingLead[]>([]);

    const handleLaunchCampaignWithLeads = (leads: MarketingLead[]) => {
        setSelectedLeadsForCampaign(leads);
        setSubTab('campaigns');
    };

    const handleOpenCampaignComposerForSingleLead = (lead: MarketingLead) => {
        setSelectedLeadsForCampaign([lead]);
        setSubTab('campaigns');
    };

    const SUB_TABS: { id: MarketingSubTab; label: string; icon: any; emoji: string; description: string }[] = [
        { id: 'scraper',   label: 'Deep Research & Scraping',       icon: Search,      emoji: '🔍', description: 'Extraction IA de prospects et décideurs' },
        { id: 'campaigns', label: 'Campagnes & Envois Ciblés',      icon: Mail,        emoji: '✉️', description: 'Emails avec variables et tracking pixel' },
        { id: 'sequences', label: 'Séquences Automatisées (Drip)',  icon: GitBranch,   emoji: '⚡', description: 'Relances intelligentes J+0 à J+14' },
        { id: 'studio',    label: 'Studio Publicitaire & Remix IA', icon: Wand2,       emoji: '🎨', description: 'Générateur de visuels et copywriting' },
        { id: 'inbox',     label: 'Boîte de Réception & IA Closer', icon: Inbox,       emoji: '💬', description: 'Smart Reply & Prise de RDV démo' },
        { id: 'analytics', label: 'CRM & Tracking en Direct',       icon: BarChart3,   emoji: '📊', description: 'Taux d\'ouverture 👁️ et clics en direct' },
        { id: 'calendar',  label: 'Calendrier & Planning',          icon: Calendar,    emoji: '📅', description: 'Vue d\'ensemble des envois programmés' },
    ];

    return (
        <div className="space-y-6">
            {/* Top Navigation Switcher */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {SUB_TABS.map((tabItem) => {
                    const active = subTab === tabItem.id;
                    const Icon = tabItem.icon;
                    return (
                        <button
                            key={tabItem.id}
                            type="button"
                            onClick={() => setSubTab(tabItem.id)}
                            className={`p-3.5 rounded-2xl border text-left transition relative overflow-hidden flex flex-col justify-between group ${active
                                ? 'bg-gradient-to-br from-violet-600/20 via-indigo-600/10 to-fuchsia-600/10 border-violet-500/50 shadow-lg shadow-violet-500/10'
                                : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]'}`}
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-lg">{tabItem.emoji}</span>
                                {active && (
                                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                                )}
                            </div>
                            <div>
                                <p className={`text-[11px] font-bold leading-snug ${active ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                    {tabItem.label}
                                </p>
                                <p className="text-[9px] text-slate-500 mt-0.5 truncate hidden sm:block">
                                    {tabItem.description}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Sub-tab view container */}
            <AnimatePresence mode="wait">
                {subTab === 'scraper' && (
                    <motion.div
                        key="scraper"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                    >
                        <LeadScraperView
                            onLaunchCampaignWithLeads={handleLaunchCampaignWithLeads}
                        />
                    </motion.div>
                )}

                {subTab === 'campaigns' && (
                    <motion.div
                        key="campaigns"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                    >
                        <CampaignManagerView
                            preselectedLeads={selectedLeadsForCampaign}
                            onCampaignCreated={() => setSubTab('analytics')}
                        />
                    </motion.div>
                )}

                {subTab === 'sequences' && (
                    <motion.div
                        key="sequences"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                    >
                        <EmailSequenceBuilder />
                    </motion.div>
                )}

                {subTab === 'studio' && (
                    <motion.div
                        key="studio"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                    >
                        <AdCreativeStudioView />
                    </motion.div>
                )}

                {subTab === 'inbox' && (
                    <motion.div
                        key="inbox"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                    >
                        <ProspectInboxView />
                    </motion.div>
                )}

                {subTab === 'analytics' && (
                    <motion.div
                        key="analytics"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                    >
                        <LeadAnalyticsView
                            onOpenCampaignComposer={handleOpenCampaignComposerForSingleLead}
                        />
                    </motion.div>
                )}

                {subTab === 'calendar' && (
                    <motion.div
                        key="calendar"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                    >
                        <MarketingCalendarView />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
