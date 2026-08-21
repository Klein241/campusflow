'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail, Send, Clock, Calendar, CheckCircle2, Eye,
    Sparkles, RefreshCw, BarChart3, Users, Play, Plus,
    Copy, ExternalLink, AlertCircle, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { marketingService } from './marketing-service';
import { MarketingCampaign, MarketingLead } from './marketing-types';

interface CampaignManagerViewProps {
    preselectedLeads?: MarketingLead[];
    onCampaignCreated?: () => void;
}

export function CampaignManagerView({ preselectedLeads, onCampaignCreated }: CampaignManagerViewProps) {
    const [campaigns, setCampaigns] = useState<MarketingCampaign[]>(() => marketingService.getCampaigns());
    const [leads] = useState<MarketingLead[]>(() => marketingService.getLeads());

    // Composer state
    const [title, setTitle] = useState('Campagne Partenariat IziTeach 2026');
    const [subject, setSubject] = useState('Proposition de partenariat pour {{ecole}} 🎓');
    const [previewText, setPreviewText] = useState('Découvrez la plateforme de gestion scolaire tout-en-un avec IA intégrée.');
    const [senderName, setSenderName] = useState('IziTeach Pro Relations');
    const [senderEmail, setSenderEmail] = useState('partenariats@iziteach.com');
    const [targetSegment, setTargetSegment] = useState('Tous les prospects qualifiés');
    const [scheduleMode, setScheduleMode] = useState<'immediate' | 'scheduled'>('immediate');
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('09:00');
    const [followUpEnabled, setFollowUpEnabled] = useState(true);
    const [followUpDays, setFollowUpDays] = useState(3);
    const [htmlContent, setHtmlContent] = useState(`
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; color: #1e293b;">
    <h2 style="color: #4f46e5; margin-bottom: 12px; font-size: 20px;">Bonjour {{nom}},</h2>
    <p style="font-size: 15px; line-height: 1.6; color: #334155;">
        Nous avons repéré l'excellence académique de <strong>{{ecole}}</strong> à {{ville}}. 
        Dans le cadre de notre programme de rentrée numérique, nous accompagnons les établissements d'excellence avec notre solution <strong>IziTeach School Suite</strong>.
    </p>
    <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; font-weight: bold; color: #1e293b;">Pourquoi les directeurs choisissent IziTeach ?</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
            <li>Bulletins et relevés de notes en 1 clic</li>
            <li>Salle d'évaluation anti-triche & Examens interactifs</li>
            <li>Sky Agent IA dédié pour le soutien scolaire des élèves</li>
            <li>Suivi des présences et SMS/Push directs aux parents</li>
        </ul>
    </div>
    <div style="text-align: center; margin: 28px 0;">
        <a href="https://iziteach.com/demo" style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px; display: inline-block;">
            👉 Réserver une Démonstration Gratuite
        </a>
    </div>
    <p style="font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        Bien à vous,<br>
        <strong>${senderName}</strong><br>
        ${senderEmail}
    </p>
</div>
    `.trim());

    const [isSending, setIsSending] = useState(false);

    const handleCreateAndSendCampaign = async () => {
        if (!title.trim() || !subject.trim() || !htmlContent.trim()) {
            toast.error('Veuillez remplir le titre, l\'objet et le contenu de l\'email');
            return;
        }

        setIsSending(true);
        try {
            const targetLeads = preselectedLeads && preselectedLeads.length > 0
                ? preselectedLeads
                : leads;

            if (targetLeads.length === 0) {
                toast.error('Aucun prospect trouvé. Veuillez d\'abord extraire des prospects via le Deep Research.');
                setIsSending(false);
                return;
            }

            const newCamp = marketingService.createCampaign({
                title,
                subject,
                preview_text: previewText,
                html_content: htmlContent,
                target_segment: targetSegment,
                sender_name: senderName,
                sender_email: senderEmail,
                status: scheduleMode === 'scheduled' ? 'scheduled' : 'sending',
                scheduled_at: scheduleMode === 'scheduled' ? `${scheduledDate}T${scheduledTime}:00Z` : undefined,
                follow_up_enabled: followUpEnabled,
                follow_up_days: followUpDays,
            });

            if (scheduleMode === 'immediate') {
                // Envoi réel immédiat vers les prospects
                const leadIds = targetLeads.map(l => l.id);
                const res = marketingService.dispatchCampaign(newCamp.id, leadIds);
                toast.success(res.message);
            } else {
                toast.success(`📅 Campagne programmée avec succès pour le ${scheduledDate} à ${scheduledTime} !`);
            }

            setCampaigns(marketingService.getCampaigns());
            if (onCampaignCreated) onCampaignCreated();
        } catch {
            toast.error('Erreur lors de la création de la campagne');
        } finally {
            setIsSending(false);
        }
    };

    const insertVariable = (variable: string) => {
        setHtmlContent(prev => prev + ` ${variable}`);
        toast.info(`Variable ${variable} insérée !`);
    };

    return (
        <div className="space-y-6">
            {/* Header banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-600/10 via-blue-600/10 to-violet-600/10 border border-indigo-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white flex-shrink-0">
                        <Mail className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white flex items-center gap-2">
                            Campagnes d'Emails & Programmation Intelligente
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Tracking de Lecture Intégré 👁️
                            </span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Concevez des emails ultra-personnalisés avec variables dynamiques, programmation d'envoi et détection d'ouverture en temps réel.
                        </p>
                    </div>
                </div>
            </div>

            {/* Campaign Creator & Live Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Left: Composer */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Mail className="w-4 h-4 text-indigo-400" />
                        Éditeur de Campagne
                    </h3>

                    {/* Campaign Title & Target */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[11px] text-slate-400 font-medium">Nom interne de la campagne</label>
                            <Input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="bg-white/5 border-white/10 text-white text-xs h-8 rounded-xl"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] text-slate-400 font-medium">Segment cible</label>
                            <Input
                                value={targetSegment}
                                onChange={e => setTargetSegment(e.target.value)}
                                className="bg-white/5 border-white/10 text-white text-xs h-8 rounded-xl"
                            />
                        </div>
                    </div>

                    {/* Sender config */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[11px] text-slate-400 font-medium">Nom de l'expéditeur</label>
                            <Input
                                value={senderName}
                                onChange={e => setSenderName(e.target.value)}
                                className="bg-white/5 border-white/10 text-white text-xs h-8 rounded-xl"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] text-slate-400 font-medium">Email d'expédition</label>
                            <Input
                                value={senderEmail}
                                onChange={e => setSenderEmail(e.target.value)}
                                className="bg-white/5 border-white/10 text-white text-xs h-8 rounded-xl"
                            />
                        </div>
                    </div>

                    {/* Subject line */}
                    <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 font-medium">Objet de l'Email (Accroche)</label>
                        <Input
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            placeholder="Objet accrocheur avec variable..."
                            className="bg-white/5 border-white/10 text-white text-xs h-8 rounded-xl"
                        />
                    </div>

                    {/* Dynamic Variables toolbar */}
                    <div className="space-y-1.5 pt-1">
                        <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            Insérer des Variables Dynamiques :
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                { tag: '{{nom}}', label: 'Nom du Contact' },
                                { tag: '{{ecole}}', label: 'Nom de l\'École' },
                                { tag: '{{ville}}', label: 'Ville' },
                                { tag: '{{pays}}', label: 'Pays' },
                                { tag: '{{lead_id}}', label: 'ID Tracking' },
                            ].map(v => (
                                <button
                                    key={v.tag}
                                    type="button"
                                    onClick={() => insertVariable(v.tag)}
                                    className="px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-[10px] font-mono transition"
                                >
                                    + {v.tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* HTML Content Body */}
                    <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 font-medium">Contenu HTML de l'Email</label>
                        <textarea
                            value={htmlContent}
                            onChange={e => setHtmlContent(e.target.value)}
                            rows={8}
                            className="w-full bg-[#0B0E14] border border-white/10 rounded-xl p-3 text-xs text-slate-300 font-mono outline-none focus:border-indigo-500 resize-none leading-relaxed"
                        />
                    </div>

                    {/* Scheduling Options */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                        <label className="text-xs text-white font-bold flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            Mode d'Expédition
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setScheduleMode('immediate')}
                                className={`p-2.5 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-2 ${scheduleMode === 'immediate'
                                    ? 'bg-indigo-600 text-white border-indigo-500'
                                    : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}
                            >
                                <Send className="w-3.5 h-3.5" /> Envoi Immédiat
                            </button>
                            <button
                                type="button"
                                onClick={() => setScheduleMode('scheduled')}
                                className={`p-2.5 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-2 ${scheduleMode === 'scheduled'
                                    ? 'bg-indigo-600 text-white border-indigo-500'
                                    : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}
                            >
                                <Calendar className="w-3.5 h-3.5" /> Programmer
                            </button>
                        </div>

                        {scheduleMode === 'scheduled' && (
                            <div className="grid grid-cols-2 gap-2 pt-2">
                                <Input
                                    type="date"
                                    value={scheduledDate}
                                    onChange={e => setScheduledDate(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white text-xs h-8 rounded-xl [color-scheme:dark]"
                                />
                                <Input
                                    type="time"
                                    value={scheduledTime}
                                    onChange={e => setScheduledTime(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white text-xs h-8 rounded-xl [color-scheme:dark]"
                                />
                            </div>
                        )}

                        {/* Follow up toggle */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-300">
                            <span>Séquence de relance automatique (si non ouvert) :</span>
                            <button
                                type="button"
                                onClick={() => setFollowUpEnabled(!followUpEnabled)}
                                className={`w-9 h-5 rounded-full transition-colors relative ${followUpEnabled ? 'bg-indigo-600' : 'bg-slate-700'}`}
                            >
                                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${followUpEnabled ? 'right-1' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Launch Button */}
                    <Button
                        onClick={handleCreateAndSendCampaign}
                        disabled={isSending}
                        className="w-full h-12 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
                    >
                        {isSending ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Traitement et expédition en cours...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                {scheduleMode === 'immediate' ? 'Envoyer la Campagne Maintenant' : 'Enregistrer et Programmer la Campagne'}
                            </>
                        )}
                    </Button>
                </div>

                {/* Right: Live Preview & Campaigns History */}
                <div className="space-y-4">
                    {/* Live Preview Card */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Eye className="w-4 h-4 text-emerald-400" />
                                Aperçu en Temps Réel du Rendu Email
                            </h3>
                            <span className="text-[10px] text-slate-500">Pixel de tracking inclus</span>
                        </div>

                        {/* Email Client Mockup */}
                        <div className="rounded-xl border border-white/10 overflow-hidden bg-white text-slate-900 shadow-xl">
                            {/* Email headers mockup */}
                            <div className="bg-slate-100 p-3 border-b border-slate-200 text-xs text-slate-700 space-y-1">
                                <p><strong>De :</strong> {senderName} &lt;{senderEmail}&gt;</p>
                                <p><strong>À :</strong> Dr. Marc Essono &lt;direction@ise-campus.edu&gt;</p>
                                <p><strong>Objet :</strong> {subject.replace('{{ecole}}', 'Institut Supérieur d\'Excellence')}</p>
                            </div>
                            {/* Email body preview */}
                            <div
                                className="p-4 max-h-80 overflow-y-auto"
                                dangerouslySetInnerHTML={{
                                    __html: htmlContent
                                        .replace(/{{nom}}/g, 'Dr. Marc Essono')
                                        .replace(/{{ecole}}/g, 'Institut Supérieur d\'Excellence')
                                        .replace(/{{ville}}/g, 'Douala')
                                        .replace(/{{pays}}/g, 'Cameroun')
                                        .replace(/{{lead_id}}/g, 'demo_lead_123')
                                }}
                            />
                        </div>
                    </div>

                    {/* Campaigns List */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-violet-400" />
                            Campagnes Récentes & Statistiques en Direct
                        </h3>

                        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                            {campaigns.map((c) => {
                                const openRate = c.sent_count > 0 ? Math.round((c.opened_count / c.sent_count) * 100) : 0;
                                return (
                                    <div
                                        key={c.id}
                                        className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold text-white truncate max-w-[240px]">{c.title}</p>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.status === 'completed'
                                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                                : c.status === 'scheduled'
                                                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                                    : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'}`}>
                                                {c.status === 'completed' ? '✅ Envoyé' : c.status === 'scheduled' ? '📅 Programmé' : 'En cours'}
                                            </span>
                                        </div>

                                        <p className="text-[11px] text-slate-400 truncate">
                                            Objet : {c.subject}
                                        </p>

                                        {/* Stats Bar */}
                                        <div className="grid grid-cols-4 gap-2 pt-1 border-t border-white/5 text-center text-[10px]">
                                            <div>
                                                <p className="text-slate-500">Envoyés</p>
                                                <p className="font-bold text-white">{c.sent_count}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500">Ouverts 👁️</p>
                                                <p className="font-bold text-indigo-400">{c.opened_count} ({openRate}%)</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500">Clics 🔗</p>
                                                <p className="font-bold text-emerald-400">{c.clicked_count}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500">Convertis 🏆</p>
                                                <p className="font-bold text-amber-400">{c.converted_count}</p>
                                            </div>
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
