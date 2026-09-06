'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot, Sparkles, Mail, Plus, Play, Pause, MessageSquare, Send,
    CheckCircle2, Building2, GraduationCap, Clock, ExternalLink,
    AlertCircle, RefreshCw, Loader2, ShieldCheck, Zap, X, Sliders,
    BookOpen, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const WORKER_URL =
    process.env.NEXT_PUBLIC_NOTIFICATION_WORKER_URL ||
    process.env.NEXT_PUBLIC_WORKER_URL ||
    'https://campusflow-worker.kleintaptue1.workers.dev';

export interface AutopilotSchool {
    id: string;
    name: string;
    slug: string;
    type: string;
    city: string;
    country: string;
    is_autopilot: boolean;
    autopilot_status: 'active' | 'paused';
    autopilot_filieres: string[];
    autopilot_last_pulse_at?: string;
    autopilot_pulse_count?: number;
    created_at: string;
}

export function SuperadminAutopilotManager() {
    const [schools, setSchools] = useState<AutopilotSchool[]>([]);
    const [loading, setLoading] = useState(true);

    // Rapport Email
    const [superadminEmail, setSuperadminEmail] = useState('kleintaptue1@gmail.com');
    const [autoReportEnabled, setAutoReportEnabled] = useState(true);
    const [lastReportSentAt, setLastReportSentAt] = useState<string | null>(null);
    const [sendingReport, setSendingReport] = useState(false);
    const [lastReportPreview, setLastReportPreview] = useState<string | null>(null);
    // Heure configurable par le Superadmin (UTC)
    const [reportHourUtc, setReportHourUtc] = useState(20);
    const [reportMinuteUtc, setReportMinuteUtc] = useState(0);

    // Modal Création d'École
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creatingSchool, setCreatingSchool] = useState(false);
    const [schoolName, setSchoolName] = useState('');
    const [schoolType, setSchoolType] = useState<'centre_formation' | 'universite'>('centre_formation');
    const [country, setCountry] = useState('Cameroun');
    const [city, setCity] = useState('Douala');
    const [filieresInput, setFilieresInput] = useState('Kinésithérapie, Massothérapie, Délégué Médical');

    // Modal Dialogue avec Admin Virtuel
    const [interactOrg, setInteractOrg] = useState<AutopilotSchool | null>(null);
    const [instruction, setInstruction] = useState('');
    const [dialogHistory, setDialogHistory] = useState<Array<{ sender: 'user' | 'admin'; text: string }>>([]);
    const [interacting, setInteracting] = useState(false);

    // Modal Cursus & Détails du Campus
    const [selectedSchoolDetails, setSelectedSchoolDetails] = useState<{
        school: AutopilotSchool;
        classrooms: any[];
        teachers: any[];
        subjects: any[];
        studentCount: number;
    } | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const handleViewSchoolDetails = async (school: AutopilotSchool) => {
        setLoadingDetails(true);
        setSelectedSchoolDetails({
            school,
            classrooms: [],
            teachers: [],
            subjects: [],
            studentCount: 0,
        });

        try {
            const [clsRes, tRes, subRes, stRes] = await Promise.all([
                supabase.from('classrooms').select('*').eq('organization_id', school.id),
                supabase.from('teacher_profiles').select('*').eq('organization_id', school.id),
                supabase.from('subjects').select('*').eq('organization_id', school.id),
                supabase.from('student_profiles').select('id', { count: 'exact', head: true }).eq('organization_id', school.id),
            ]);

            setSelectedSchoolDetails({
                school,
                classrooms: clsRes.data || [],
                teachers: tRes.data || [],
                subjects: subRes.data || [],
                studentCount: stRes.count || 0,
            });
        } catch (err) {
            console.error('Error fetching details:', err);
        } finally {
            setLoadingDetails(false);
        }
    };

    // Charger les écoles sous pilote automatique et la config de rapport
    const loadAutopilotData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Config Dame SKY
            const { data: cfg } = await supabase
                .from('dame_sky_config')
                .select('*')
                .limit(1)
                .maybeSingle();

            if (cfg) {
                if (cfg.superadmin_email) setSuperadminEmail(cfg.superadmin_email);
                if (cfg.auto_email_report_enabled !== undefined) setAutoReportEnabled(cfg.auto_email_report_enabled);
                if (cfg.last_email_report_sent_at) setLastReportSentAt(cfg.last_email_report_sent_at);
                if (typeof cfg.report_hour_utc === 'number') setReportHourUtc(cfg.report_hour_utc);
                if (typeof cfg.report_minute_utc === 'number') setReportMinuteUtc(cfg.report_minute_utc);
            }

            // 2. Écoles (avec is_autopilot ou fallback si migration en attente)
            let { data: orgsData, error: orgsError } = await supabase
                .from('organizations')
                .select('id, name, slug, type, city, country, is_autopilot, autopilot_status, autopilot_filieres, autopilot_last_pulse_at, autopilot_pulse_count, created_at, other_phone_label')
                .order('created_at', { ascending: false });

            if (orgsError) {
                // Fallback gracieux si les colonnes de la migration 075 ne sont pas encore créées
                const fallback = await supabase
                    .from('organizations')
                    .select('id, name, slug, type, city, country, created_at, other_phone_label')
                    .order('created_at', { ascending: false });
                orgsData = (fallback.data || []).map(o => ({
                    ...o,
                    is_autopilot: o.other_phone_label === 'AUTOPILOT_SCHOOL',
                    autopilot_status: 'active' as const,
                    autopilot_filieres: [],
                }));
            }

            if (orgsData) {
                // Filtrer les écoles sous pilote auto
                const autoOrgs = orgsData.filter(o => o.is_autopilot === true || o.other_phone_label === 'AUTOPILOT_SCHOOL');
                setSchools(autoOrgs as any);
            }
        } catch (e: any) {
            console.error('[AutopilotManager] Load error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAutopilotData();
    }, [loadAutopilotData]);

    // Déclencher le rapport quotidien maintenant
    const handleTriggerReportNow = async () => {
        setSendingReport(true);
        const toastId = toast.loading('Génération du rapport exécutif par DeepSeek V4 Flash & envoi email…');
        try {
            const res = await fetch(`${WORKER_URL}/api/sky-agent/trigger-report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: superadminEmail.trim() }),
            });

            const data = await res.json() as any;
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Échec de l\'envoi du rapport');
            }

            setLastReportSentAt(new Date().toISOString());
            setLastReportPreview(data.reportPreview || null);
            toast.success(`👑 Rapport envoyé avec succès à ${data.recipient} !`, { id: toastId });
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de l\'envoi du rapport', { id: toastId });
        } finally {
            setSendingReport(false);
        }
    };

    // Sauvegarder la config du rapport
    const handleSaveReportConfig = async () => {
        try {
            await supabase
                .from('dame_sky_config')
                .update({
                    superadmin_email: superadminEmail.trim(),
                    auto_email_report_enabled: autoReportEnabled,
                    report_hour_utc: reportHourUtc,
                    report_minute_utc: reportMinuteUtc,
                })
                .neq('id', '00000000-0000-0000-0000-000000000000');
            toast.success('Paramètres du rapport email sauvegardés');
        } catch {
            toast.error('Erreur de sauvegarde');
        }
    };

    // Créer une nouvelle école en pilote automatique
    const handleCreateSchool = async (e: React.FormEvent) => {
        e.preventDefault();
        const filieres = filieresInput.split(',').map(f => f.trim()).filter(Boolean);
        if (!schoolName.trim() || filieres.length === 0) {
            toast.error('Veuillez renseigner le nom de l\'école et au moins une filière');
            return;
        }

        setCreatingSchool(true);
        const toastId = toast.loading(`Création autonome de "${schoolName}" avec ${filieres.length} filières…`);

        try {
            const res = await fetch(`${WORKER_URL}/api/sky-agent/autopilot-create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: schoolName.trim(),
                    school_type: schoolType,
                    country,
                    city,
                    filieres,
                }),
            });

            const data = await res.json() as any;
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Échec lors de la création de l\'école');
            }

            toast.success(`🎉 ${data.summary}`, { id: toastId, duration: 6000 });
            setShowCreateModal(false);
            setSchoolName('');
            setFilieresInput('Kinésithérapie, Massothérapie, Délégué Médical');
            await loadAutopilotData();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la création autonome', { id: toastId });
        } finally {
            setCreatingSchool(false);
        }
    };

    // Activer / Mettre en pause le pilote auto
    const handleToggleAutopilot = async (school: AutopilotSchool) => {
        const nextActive = school.autopilot_status !== 'active';
        try {
            await fetch(`${WORKER_URL}/api/sky-agent/autopilot-toggle`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    org_id: school.id,
                    is_active: nextActive,
                }),
            });

            setSchools(prev => prev.map(s => s.id === school.id ? {
                ...s,
                autopilot_status: nextActive ? 'active' : 'paused',
                is_autopilot: nextActive,
            } : s));

            toast.success(`Pilote automatique ${nextActive ? 'activé 🟢' : 'mis en pause ⏸️'} pour ${school.name}`);
        } catch {
            toast.error('Échec du changement d\'état');
        }
    };

    // Envoyer un ordre ou discuter avec l'admin virtuel
    const handleSendInstruction = async () => {
        if (!interactOrg || !instruction.trim() || interacting) return;

        const userMsg = instruction.trim();
        setDialogHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
        setInstruction('');
        setInteracting(true);

        try {
            const res = await fetch(`${WORKER_URL}/api/sky-agent/autopilot-interact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    org_id: interactOrg.id,
                    instruction: userMsg,
                }),
            });

            const data = await res.json() as any;
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Erreur de communication avec l\'administrateur');
            }

            setDialogHistory(prev => [...prev, { sender: 'admin', text: data.reply }]);
        } catch (err: any) {
            setDialogHistory(prev => [...prev, { sender: 'admin', text: `⚠️ Impossible d'exécuter l'ordre : ${err.message}` }]);
        } finally {
            setInteracting(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* ══════════════════════════════════════════════════════════════
                SECTION 1 : RAPPORT AUTONOME QUOTIDIEN PAR EMAIL
            ══════════════════════════════════════════════════════════════ */}
            <Card className="border-amber-500/30 bg-gradient-to-br from-[#0F1424] via-[#11172A] to-[#0D111E] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                                <Mail className="w-6 h-6 text-black" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold flex items-center gap-2">
                                    Rapport Exécutif Autonome par Email (Dame SKY)
                                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] uppercase font-bold">
                                        IA Autonome
                                    </Badge>
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    Dame SKY synthétise les métriques de la journée et vous envoie un compte-rendu exécutif par email sans aucune intervention.
                                </CardDescription>
                            </div>
                        </div>
                        <Button
                            onClick={handleTriggerReportNow}
                            disabled={sendingReport}
                            className="bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-lg shadow-amber-500/25 transition-all"
                        >
                            {sendingReport ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Sparkles className="w-4 h-4 mr-2" />
                            )}
                            Recevoir le rapport par email maintenant
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-300">Adresse Email de Réception du Superadmin</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="email"
                                    value={superadminEmail}
                                    onChange={e => setSuperadminEmail(e.target.value)}
                                    placeholder="admin@iziteach.com"
                                    className="bg-black/30 border-white/10 text-white"
                                />
                            </div>
                        </div>

                        {/* Heure d'envoi configurable */}
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-300">Heure d&apos;envoi automatique (UTC)</Label>
                            <div className="flex items-center gap-2">
                                <select
                                    value={reportHourUtc}
                                    onChange={e => setReportHourUtc(Number(e.target.value))}
                                    className="h-10 px-3 rounded-md bg-black/30 border border-white/10 text-white text-sm"
                                >
                                    {Array.from({ length: 24 }, (_, i) => (
                                        <option key={i} value={i}>{String(i).padStart(2, '0')}h</option>
                                    ))}
                                </select>
                                <span className="text-slate-400 text-sm">:</span>
                                <select
                                    value={reportMinuteUtc}
                                    onChange={e => setReportMinuteUtc(Number(e.target.value))}
                                    className="h-10 px-3 rounded-md bg-black/30 border border-white/10 text-white text-sm"
                                >
                                    {[0, 15, 30, 45].map(m => (
                                        <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                                    ))}
                                </select>
                                <span className="text-xs text-slate-400">(UTC)</span>
                            </div>
                            <p className="text-[10px] text-slate-500">Ex: 20h00 UTC = 21h00 Paris, 21h00 Douala</p>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                            <div>
                                <p className="text-sm font-semibold text-white">Envoi Quotidien Automatique</p>
                                <p className="text-xs text-slate-400">Dame SKY compile et envoie le mémo chaque jour à l&apos;heure définie</p>
                            </div>
                            <Switch
                                checked={autoReportEnabled}
                                onCheckedChange={checked => {
                                    setAutoReportEnabled(checked);
                                    supabase
                                        .from('dame_sky_config')
                                        .update({ auto_email_report_enabled: checked })
                                        .neq('id', '00000000-0000-0000-0000-000000000000');
                                }}
                            />
                        </div>

                        <div className="flex items-end">
                            <Button onClick={handleSaveReportConfig} variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 w-full">
                                Enregistrer la configuration
                            </Button>
                        </div>
                    </div>

                    {lastReportSentAt && (
                        <div className="text-xs text-slate-400 flex items-center gap-2 pt-1">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            Dernier rapport exécutif transmis : <span className="text-slate-200 font-medium">{new Date(lastReportSentAt).toLocaleString('fr-FR')}</span>
                        </div>
                    )}

                    {lastReportPreview && (
                        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                            <p className="text-xs text-amber-300 font-bold mb-2 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Dernier mémo synthétisé par Dame SKY :
                            </p>
                            <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                                {lastReportPreview}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ══════════════════════════════════════════════════════════════
                SECTION 2 : ÉCOLES EN PILOTE AUTOMATIQUE (AUTO-ADMIN)
            ══════════════════════════════════════════════════════════════ */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Bot className="w-5 h-5 text-indigo-400" />
                            Écoles & Universités en Pilote Automatique (Auto-Admin)
                        </h3>
                        <p className="text-xs text-slate-400">
                            Établissements gérés en autonomie complète par l&apos;IA : cours structurés, professeurs virtuels, animation et surveillance.
                        </p>
                    </div>
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold shadow-lg shadow-indigo-500/20"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Créer une École Pilote Automatique
                    </Button>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                        <span>Chargement des campus autonomes…</span>
                    </div>
                ) : schools.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-3">
                        <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
                        <p className="text-sm text-slate-300 font-medium">Aucune école en pilote automatique pour l&apos;instant</p>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                            Cliquez sur &quot;Créer une École Pilote Automatique&quot; pour lancer un établissement autonome complet avec ses filières (kiné, massage, délégué médical…).
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {schools.map(school => (
                            <motion.div
                                key={school.id}
                                layout
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/40 transition-all space-y-4 relative overflow-hidden"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-white text-base">{school.name}</h4>
                                            <Badge className={school.autopilot_status === 'active'
                                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]'
                                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]'
                                            }>
                                                {school.autopilot_status === 'active' ? '🟢 Pilote Actif' : '⏸️ En Pause'}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-slate-400">
                                            {school.type === 'universite' ? '🏛️ Université' : '⚙️ Centre de formation'} · {school.city}, {school.country}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleToggleAutopilot(school)}
                                            title={school.autopilot_status === 'active' ? 'Mettre en pause' : 'Réactiver'}
                                            className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-white/10"
                                        >
                                            {school.autopilot_status === 'active' ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
                                        </Button>
                                        <a
                                            href={`/${school.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white"
                                            title="Ouvrir le campus"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    </div>
                                </div>

                                {/* Filières */}
                                <div className="space-y-1.5">
                                    <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Filières structurées</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(school.autopilot_filieres || []).map((f, idx) => (
                                            <span key={idx} className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300">
                                                {f}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions & Dialogue */}
                                <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {school.autopilot_pulse_count ? `${school.autopilot_pulse_count} cycles` : 'Actif'} · {school.autopilot_last_pulse_at ? new Date(school.autopilot_last_pulse_at).toLocaleDateString('fr-FR') : 'Aujourd\'hui'}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleViewSchoolDetails(school)}
                                            className="border-white/10 text-slate-300 hover:text-white text-xs h-7 px-2.5"
                                        >
                                            <BookOpen className="w-3 h-3 mr-1 text-amber-400" />
                                            Cursus
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setInteractOrg(school);
                                                setDialogHistory([
                                                    { sender: 'admin', text: `Bonjour Superviseur. Je gère l'établissement "${school.name}". Tout le cursus est opérationnel. Donnez-moi vos directives.` }
                                                ]);
                                            }}
                                            className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs border border-indigo-500/30 h-7 px-2.5"
                                        >
                                            <MessageSquare className="w-3 h-3 mr-1" />
                                            Admin Virtuel
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                MODAL 1 : CRÉATION D'ÉCOLE PILOTE AUTOMATIQUE
            ══════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => !creatingSchool && setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#0F1424] border border-indigo-500/30 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5 text-white"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                        <Sparkles className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">Créer une École Pilote Automatique</h3>
                                        <p className="text-xs text-slate-400">DeepSeek V4 Flash génère tout le programme en quelques secondes</p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowCreateModal(false)}
                                    disabled={creatingSchool}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <form onSubmit={handleCreateSchool} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-300">Nom de l&apos;établissement</Label>
                                    <Input
                                        value={schoolName}
                                        onChange={e => setSchoolName(e.target.value)}
                                        placeholder="ex: Centre de Formation Professionnelle Santé & Bien-Être"
                                        required
                                        className="bg-black/30 border-white/10 text-white"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-300">Type</Label>
                                        <select
                                            value={schoolType}
                                            onChange={e => setSchoolType(e.target.value as any)}
                                            className="w-full h-10 px-3 rounded-md bg-black/30 border border-white/10 text-xs text-white"
                                        >
                                            <option value="centre_formation">Centre de formation pro</option>
                                            <option value="universite">Université / Faculté</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-300">Ville & Pays</Label>
                                        <Input
                                            value={`${city}, ${country}`}
                                            onChange={e => {
                                                const parts = e.target.value.split(',');
                                                setCity(parts[0]?.trim() || '');
                                                if (parts[1]) setCountry(parts[1]?.trim() || '');
                                            }}
                                            placeholder="Douala, Cameroun"
                                            className="bg-black/30 border-white/10 text-white text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-300">
                                        Filières à structurer (séparées par des virgules)
                                    </Label>
                                    <Input
                                        value={filieresInput}
                                        onChange={e => setFilieresInput(e.target.value)}
                                        placeholder="Kinésithérapie, Massothérapie, Délégué Médical"
                                        required
                                        className="bg-black/30 border-white/10 text-white text-xs"
                                    />
                                    <p className="text-[11px] text-slate-400">
                                        Pour chaque filière, l&apos;IA créera automatiquement la classe, les matières clés, les leçons, les quiz d&apos;évaluation et assignera un professeur virtuel référent.
                                    </p>
                                </div>

                                <div className="pt-3 flex gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowCreateModal(false)}
                                        disabled={creatingSchool}
                                        className="flex-1 border-white/10 text-slate-300 hover:bg-white/5"
                                    >
                                        Annuler
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={creatingSchool}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 font-bold text-white shadow-lg shadow-indigo-600/30"
                                    >
                                        {creatingSchool ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Génération IA en cours…
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                Lancer en Pilote Auto
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════════════════════════
                MODAL 2 : DIALOGUE AVEC L'ADMIN VIRTUEL DE L'ÉCOLE
            ══════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {interactOrg && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setInteractOrg(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#0F1424] border border-indigo-500/30 rounded-2xl p-6 w-full max-w-xl shadow-2xl space-y-4 text-white flex flex-col h-[520px]"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                        <Bot className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm">Supervision : {interactOrg.name}</h3>
                                        <p className="text-[10px] text-slate-400">Administrateur Virtuel en Pilote Automatique</p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setInteractOrg(null)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Zone de discussion */}
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                {dialogHistory.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                                            msg.sender === 'user'
                                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                                : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-none whitespace-pre-line'
                                        }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {interacting && (
                                    <div className="flex justify-start">
                                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 text-xs flex items-center gap-2">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                                            L&apos;Admin Virtuel analyse votre consigne…
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Champ de saisie d'instruction */}
                            <div className="pt-2 flex gap-2">
                                <Input
                                    value={instruction}
                                    onChange={e => setInstruction(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSendInstruction(); }}
                                    placeholder="Donner un ordre (ex: Rajoute un cours sur le massage suédois, planifie un examen...)"
                                    disabled={interacting}
                                    className="bg-black/40 border-white/10 text-white text-xs"
                                />
                                <Button
                                    onClick={handleSendInstruction}
                                    disabled={!instruction.trim() || interacting}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white"
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════════════════════════
                MODAL 3 : DÉTAILS & CURSUS GÉNÉRÉ DU CAMPUS
            ══════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {selectedSchoolDetails && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setSelectedSchoolDetails(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#0F1424] border border-indigo-500/30 rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-4 text-white flex flex-col max-h-[85vh] overflow-hidden"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
                                        <BookOpen className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base">{selectedSchoolDetails.school.name}</h3>
                                        <p className="text-xs text-slate-400">
                                            {selectedSchoolDetails.school.city}, {selectedSchoolDetails.school.country} · Cursus & Corps Professoral Virtuel
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelectedSchoolDetails(null)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            {loadingDetails ? (
                                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                                    <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                                    <span className="text-xs">Chargement du cursus…</span>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-xs">
                                    {/* Compteurs KPIs */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                                            <div className="text-lg font-bold text-indigo-400">{selectedSchoolDetails.classrooms.length}</div>
                                            <div className="text-[10px] text-slate-400 uppercase font-semibold">Classes</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                                            <div className="text-lg font-bold text-emerald-400">{selectedSchoolDetails.teachers.length}</div>
                                            <div className="text-[10px] text-slate-400 uppercase font-semibold">Profs Virtuels</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                                            <div className="text-lg font-bold text-amber-400">{selectedSchoolDetails.subjects.length}</div>
                                            <div className="text-[10px] text-slate-400 uppercase font-semibold">Matières Clés</div>
                                        </div>
                                    </div>

                                    {/* Professeurs virtuels */}
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                                            <Users className="w-3.5 h-3.5 text-emerald-400" />
                                            Corps Professoral Virtuel
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {selectedSchoolDetails.teachers.map((t: any) => (
                                                <div key={t.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                                                    <div className="font-semibold text-white">{t.first_name} {t.last_name}</div>
                                                    <div className="text-[10px] text-indigo-300 font-medium">{t.specialty}</div>
                                                    <div className="text-[10px] text-slate-400 line-clamp-2">{t.bio}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Classes & Matières */}
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                                            <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                                            Classes & Matières Structurées
                                        </h4>
                                        <div className="space-y-2">
                                            {selectedSchoolDetails.classrooms.map((cls: any) => {
                                                const clsSubjects = selectedSchoolDetails.subjects.filter((s: any) => s.classroom_id === cls.id);
                                                return (
                                                    <div key={cls.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="font-bold text-white text-xs">{cls.name}</div>
                                                            <Badge className="bg-indigo-500/20 text-indigo-300 text-[9px]">{cls.level || 'Formation Pro'}</Badge>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {clsSubjects.map((sub: any) => (
                                                                <span key={sub.id} className="px-2 py-0.5 rounded bg-black/40 border border-white/5 text-[10px] text-slate-300">
                                                                    {sub.name} ({sub.code})
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-3 border-t border-white/10 flex justify-end">
                                <a
                                    href={`/${selectedSchoolDetails.school.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Visiter le campus en direct
                                </a>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
