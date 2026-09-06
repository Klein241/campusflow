'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot, Sparkles, Mail, Plus, Play, Pause, MessageSquare, Send,
    CheckCircle2, Building2, GraduationCap, Clock, ExternalLink,
    AlertCircle, RefreshCw, Loader2, ShieldCheck, Zap, X, Sliders,
    BookOpen, Users, UserCheck, Calendar, Search, FileText, ChevronRight,
    BarChart3, Bell, Check, UserPlus, Eye, Filter, ArrowUpRight, Award,
    CheckCircle, AlertTriangle, Layers, Settings, HelpCircle
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
    other_phone_label?: string;
}

export interface SchoolAdminData {
    classrooms: any[];
    teachers: any[];
    subjects: any[];
    students: any[];
    inscriptions: any[];
    notifications: any[];
    logs: any[];
}

interface DialogMessage {
    sender: 'user' | 'admin';
    text: string;
    executed?: string[];
}

const QUICK_PROMPTS = [
    "Créer une classe 'Esthétique & Cosmétique'",
    "Ajouter une leçon sur la gestion du stress",
    "Publier une annonce de rentrée solennelle",
    "Accepter toutes les inscriptions en attente",
    "Corriger toutes les copies soumises",
    "Planifier un examen de mi-semestre",
];

export function SuperadminAutopilotManager() {
    const [schools, setSchools] = useState<AutopilotSchool[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchSchool, setSearchSchool] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

    // Rapport Email
    const [superadminEmail, setSuperadminEmail] = useState('kleintaptue1@gmail.com');
    const [autoReportEnabled, setAutoReportEnabled] = useState(true);
    const [lastReportSentAt, setLastReportSentAt] = useState<string | null>(null);
    const [sendingReport, setSendingReport] = useState(false);
    const [lastReportPreview, setLastReportPreview] = useState<string | null>(null);
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

    // Modal Dialogue Admin Virtuel
    const [interactOrg, setInteractOrg] = useState<AutopilotSchool | null>(null);
    const [instruction, setInstruction] = useState('');
    const [interacting, setInteracting] = useState(false);
    const [dialogHistory, setDialogHistory] = useState<DialogMessage[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Modal Cursus Rapide
    const [selectedSchoolDetails, setSelectedSchoolDetails] = useState<{
        school: AutopilotSchool;
        classrooms: any[];
        teachers: any[];
        subjects: any[];
    } | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Modal Grand Espace Admin École
    const [selectedAdminSchool, setSelectedAdminSchool] = useState<AutopilotSchool | null>(null);
    const [adminData, setAdminData] = useState<SchoolAdminData | null>(null);
    const [adminLoading, setAdminLoading] = useState(false);
    const [adminActiveTab, setAdminActiveTab] = useState<'overview' | 'students' | 'inscriptions' | 'curriculum' | 'teachers' | 'announcements' | 'logs'>('overview');
    const [studentSearch, setStudentSearch] = useState('');
    const [inscriptionFilter, setInscriptionFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
    const [pulsingSchool, setPulsingSchool] = useState(false);
    const [approvingId, setApprovingId] = useState<string | null>(null);

    // Nouvelle Annonce Form
    const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
    const [newAnnouncementMessage, setNewAnnouncementMessage] = useState('');
    const [publishingAnnouncement, setPublishingAnnouncement] = useState(false);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [dialogHistory, interacting]);

    // Charger les écoles sous pilote auto
    const loadAutopilotData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: cfg } = await supabase
                .from('dame_sky_config')
                .select('*')
                .limit(1)
                .maybeSingle();

            if (cfg) {
                if (cfg.superadmin_email) setSuperadminEmail(cfg.superadmin_email);
                if (typeof cfg.auto_email_report_enabled === 'boolean') setAutoReportEnabled(cfg.auto_email_report_enabled);
                if (cfg.last_report_sent_at) setLastReportSentAt(cfg.last_report_sent_at);
                if (cfg.report_hour_utc !== undefined) setReportHourUtc(cfg.report_hour_utc);
                if (cfg.report_minute_utc !== undefined) setReportMinuteUtc(cfg.report_minute_utc);
            }

            const { data: orgsData } = await supabase
                .from('organizations')
                .select('id, name, slug, type, city, country, is_autopilot, autopilot_status, autopilot_filieres, autopilot_last_pulse_at, autopilot_pulse_count, created_at, other_phone_label')
                .order('created_at', { ascending: false });

            if (orgsData) {
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

            if (selectedAdminSchool && selectedAdminSchool.id === school.id) {
                setSelectedAdminSchool(prev => prev ? {
                    ...prev,
                    autopilot_status: nextActive ? 'active' : 'paused',
                    is_autopilot: nextActive,
                } : null);
            }

            toast.success(`Pilote automatique ${nextActive ? 'activé 🟢' : 'mis en pause ⏸️'} pour ${school.name}`);
        } catch {
            toast.error('Échec du changement d\'état');
        }
    };

    // Charger les données de l'espace admin d'une école
    const handleOpenAdminDashboard = async (school: AutopilotSchool) => {
        setSelectedAdminSchool(school);
        setAdminActiveTab('overview');
        setAdminLoading(true);

        try {
            // 1. Essayer d'abord la route Worker dédiée
            const res = await fetch(`${WORKER_URL}/api/sky-agent/autopilot-school-data?org_id=${school.id}`);
            const data = await res.json() as any;

            if (res.ok && data.ok) {
                setAdminData({
                    classrooms: data.classrooms || [],
                    teachers: data.teachers || [],
                    subjects: data.subjects || [],
                    students: data.students || [],
                    inscriptions: data.inscriptions || [],
                    notifications: data.notifications || [],
                    logs: data.logs || [],
                });
            } else {
                // 2. Fallback Supabase direct
                await loadSchoolDataFromSupabase(school.id);
            }
        } catch {
            await loadSchoolDataFromSupabase(school.id);
        } finally {
            setAdminLoading(false);
        }
    };

    const loadSchoolDataFromSupabase = async (orgId: string) => {
        const [
            { data: classrooms },
            { data: teachers },
            { data: subjects },
            { data: students },
            { data: inscriptions },
            { data: notifications },
            { data: logs }
        ] = await Promise.all([
            supabase.from('classrooms').select('*').eq('organization_id', orgId),
            supabase.from('teacher_profiles').select('*').eq('organization_id', orgId),
            supabase.from('subjects').select('*').eq('organization_id', orgId),
            supabase.from('student_profiles').select('id, first_name, last_name, email, is_active, created_at').eq('organization_id', orgId).limit(100),
            supabase.from('inscription_requests').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(50),
            supabase.from('admin_notifications').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(30),
            supabase.from('ai_agent_logs').select('*').eq('organization_id', orgId).order('executed_at', { ascending: false }).limit(30),
        ]);

        setAdminData({
            classrooms: classrooms || [],
            teachers: teachers || [],
            subjects: subjects || [],
            students: students || [],
            inscriptions: inscriptions || [],
            notifications: notifications || [],
            logs: logs || [],
        });
    };

    // Valider une demande d'inscription
    const handleApproveInscription = async (inscId: string) => {
        setApprovingId(inscId);
        try {
            const { error } = await supabase
                .from('inscription_requests')
                .update({
                    status: 'accepted',
                    student_response: 'Inscription validée par la Direction Académique de Dame SKY. Profil étudiant activé.',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', inscId);

            if (error) throw error;

            toast.success("Demande d'inscription validée avec succès !");

            setAdminData(prev => prev ? {
                ...prev,
                inscriptions: prev.inscriptions.map(i => i.id === inscId ? { ...i, status: 'accepted' } : i)
            } : null);
        } catch (e: any) {
            toast.error("Erreur lors de la validation : " + (e.message || 'Inconnue'));
        } finally {
            setApprovingId(null);
        }
    };

    // Déclencher un cycle autopilot immédiat pour l'école
    const handleTriggerPulseNow = async () => {
        if (!selectedAdminSchool || pulsingSchool) return;
        setPulsingSchool(true);
        const toastId = toast.loading("Exécution d'un cycle d'autopilote (corrections, inscriptions, animation)…");
        try {
            const res = await fetch(`${WORKER_URL}/api/sky-agent/autopilot-pulse`, { method: 'POST' });
            const data = await res.json() as any;
            if (!res.ok) throw new Error(data.error || 'Erreur lors du cycle');

            toast.success(`⚡ Cycle exécuté ! ${data.actionsCount || 0} action(s) traitée(s)`, { id: toastId });
            await handleOpenAdminDashboard(selectedAdminSchool);
            await loadAutopilotData();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors du cycle', { id: toastId });
        } finally {
            setPulsingSchool(false);
        }
    };

    // Publier une nouvelle annonce
    const handlePublishAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAdminSchool || !newAnnouncementTitle.trim() || !newAnnouncementMessage.trim()) return;

        setPublishingAnnouncement(true);
        try {
            const { data, error } = await supabase
                .from('admin_notifications')
                .insert({
                    organization_id: selectedAdminSchool.id,
                    title: newAnnouncementTitle.trim(),
                    message: newAnnouncementMessage.trim(),
                    icon: '📢',
                    created_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;

            toast.success('Annonce publiée aux étudiants du campus !');
            setNewAnnouncementTitle('');
            setNewAnnouncementMessage('');

            if (data) {
                setAdminData(prev => prev ? {
                    ...prev,
                    notifications: [data, ...prev.notifications]
                } : null);
            }
        } catch (err: any) {
            toast.error('Erreur lors de la publication : ' + (err.message || 'Inconnue'));
        } finally {
            setPublishingAnnouncement(false);
        }
    };

    // Envoyer un ordre à l'admin virtuel (avec exécution réelle en base)
    const handleSendInstruction = async (overrideText?: string) => {
        const textToSend = (overrideText || instruction).trim();
        if (!interactOrg || !textToSend || interacting) return;

        setDialogHistory(prev => [...prev, { sender: 'user', text: textToSend }]);
        setInstruction('');
        setInteracting(true);

        try {
            const res = await fetch(`${WORKER_URL}/api/sky-agent/autopilot-interact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    org_id: interactOrg.id,
                    instruction: textToSend,
                }),
            });

            const data = await res.json() as any;
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Erreur de communication avec l\'administrateur');
            }

            setDialogHistory(prev => [
                ...prev,
                {
                    sender: 'admin',
                    text: data.reply,
                    executed: Array.isArray(data.executed) && data.executed.length > 0 ? data.executed : undefined,
                }
            ]);

            // Rafraîchir les données de l'espace admin si ouvert
            if (selectedAdminSchool && selectedAdminSchool.id === interactOrg.id) {
                handleOpenAdminDashboard(selectedAdminSchool);
            }
        } catch (err: any) {
            setDialogHistory(prev => [
                ...prev,
                { sender: 'admin', text: `⚠️ Impossible d'exécuter l'ordre : ${err.message}` }
            ]);
        } finally {
            setInteracting(false);
        }
    };

    // Modal Cursus rapide
    const handleViewSchoolDetails = async (school: AutopilotSchool) => {
        setSelectedSchoolDetails({
            school,
            classrooms: [],
            teachers: [],
            subjects: [],
        });
        setLoadingDetails(true);

        try {
            const [
                { data: classrooms },
                { data: teachers },
                { data: subjects },
            ] = await Promise.all([
                supabase.from('classrooms').select('*').eq('organization_id', school.id),
                supabase.from('teacher_profiles').select('*').eq('organization_id', school.id),
                supabase.from('subjects').select('*').eq('organization_id', school.id),
            ]);

            setSelectedSchoolDetails({
                school,
                classrooms: classrooms || [],
                teachers: teachers || [],
                subjects: subjects || [],
            });
        } catch (e: any) {
            toast.error('Erreur chargement détails du cursus');
        } finally {
            setLoadingDetails(false);
        }
    };

    // Filtrage des écoles
    const filteredSchools = schools.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchSchool.toLowerCase()) ||
            (s.autopilot_filieres || []).some(f => f.toLowerCase().includes(searchSchool.toLowerCase())) ||
            (s.city || '').toLowerCase().includes(searchSchool.toLowerCase());

        if (statusFilter === 'active') return matchesSearch && s.autopilot_status === 'active';
        if (statusFilter === 'paused') return matchesSearch && s.autopilot_status === 'paused';
        return matchesSearch;
    });

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
                                <CardTitle className="text-xl flex items-center gap-2">
                                    Dame SKY — Rapport Exécutif Quotidien
                                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">DeepSeek V4 Flash</Badge>
                                </CardTitle>
                                <CardDescription className="text-slate-400 text-xs">
                                    Chaque jour à {String(reportHourUtc).padStart(2, '0')}:{String(reportMinuteUtc).padStart(2, '0')} UTC, Dame SKY synthétise les KPI, inscriptions et alertes de toutes vos écoles et vous envoie un e-mail exécutif.
                                </CardDescription>
                            </div>
                        </div>
                        <Button
                            onClick={handleTriggerReportNow}
                            disabled={sendingReport}
                            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold shadow-lg shadow-amber-500/20 text-xs h-9"
                        >
                            {sendingReport ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                    Génération IA…
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                    Déclencher le rapport maintenant
                                </>
                            )}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-white/5">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-300">Email de destination du rapport</Label>
                            <Input
                                type="email"
                                value={superadminEmail}
                                onChange={e => setSuperadminEmail(e.target.value)}
                                placeholder="kleintaptue1@gmail.com"
                                className="bg-black/30 border-white/10 text-white text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-300">Heure d'envoi quotidien (UTC)</Label>
                            <div className="flex gap-2 items-center">
                                <Input
                                    type="number"
                                    min={0}
                                    max={23}
                                    value={reportHourUtc}
                                    onChange={e => setReportHourUtc(parseInt(e.target.value) || 0)}
                                    className="bg-black/30 border-white/10 text-white text-xs w-20 text-center"
                                />
                                <span className="text-slate-400 text-xs font-bold">:</span>
                                <Input
                                    type="number"
                                    min={0}
                                    max={59}
                                    value={reportMinuteUtc}
                                    onChange={e => setReportMinuteUtc(parseInt(e.target.value) || 0)}
                                    className="bg-black/30 border-white/10 text-white text-xs w-20 text-center"
                                />
                                <span className="text-slate-400 text-[11px]">UTC</span>
                            </div>
                        </div>

                        <div className="flex items-end justify-between gap-4">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="auto-report"
                                    checked={autoReportEnabled}
                                    onCheckedChange={setAutoReportEnabled}
                                />
                                <Label htmlFor="auto-report" className="text-xs text-slate-300 cursor-pointer">
                                    Envoi automatique activé
                                </Label>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleSaveReportConfig}
                                className="border-white/10 text-slate-200 hover:text-white hover:bg-white/5 text-xs"
                            >
                                Enregistrer
                            </Button>
                        </div>
                    </div>

                    {lastReportSentAt && (
                        <div className="flex items-center gap-2 text-xs text-emerald-400/90 pt-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Dernier rapport exécutif expédié le {new Date(lastReportSentAt).toLocaleString('fr-FR')}</span>
                        </div>
                    )}

                    {lastReportPreview && (
                        <div className="mt-3 p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5" /> Aperçu du dernier rapport exécutif généré
                            </p>
                            <div className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto pr-2">
                                {lastReportPreview}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ══════════════════════════════════════════════════════════════
                SECTION 2 : GESTION DES ÉCOLES EN PILOTE AUTOMATIQUE
            ══════════════════════════════════════════════════════════════ */}
            <div className="space-y-4">
                {/* En-tête & Barre d'outils */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <ShieldCheck className="w-6 h-6 text-indigo-400" />
                            Établissements sous Pilote Automatique ({schools.length})
                        </h2>
                        <p className="text-xs text-slate-400">
                            Campus 100% autonomes animés par DeepSeek V4 Flash : admission, cours, devoirs et examens
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20"
                        >
                            <Plus className="w-4 h-4 mr-1.5" />
                            Créer une École Pilote Auto
                        </Button>
                    </div>
                </div>

                {/* Filtres & Recherche */}
                <div className="flex flex-col sm:flex-row items-center gap-3 bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                    <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Rechercher un établissement, une ville ou une filière…"
                            value={searchSchool}
                            onChange={e => setSearchSchool(e.target.value)}
                            className="pl-9 bg-black/30 border-white/10 text-white text-xs h-9"
                        />
                    </div>
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <Button
                            size="sm"
                            variant={statusFilter === 'all' ? 'default' : 'ghost'}
                            onClick={() => setStatusFilter('all')}
                            className={`text-xs h-8 ${statusFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Toutes ({schools.length})
                        </Button>
                        <Button
                            size="sm"
                            variant={statusFilter === 'active' ? 'default' : 'ghost'}
                            onClick={() => setStatusFilter('active')}
                            className={`text-xs h-8 ${statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Actives ({schools.filter(s => s.autopilot_status === 'active').length})
                        </Button>
                        <Button
                            size="sm"
                            variant={statusFilter === 'paused' ? 'default' : 'ghost'}
                            onClick={() => setStatusFilter('paused')}
                            className={`text-xs h-8 ${statusFilter === 'paused' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            En Pause ({schools.filter(s => s.autopilot_status === 'paused').length})
                        </Button>
                    </div>
                </div>

                {/* Grille des établissements */}
                {loading ? (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                        <span className="text-xs">Chargement des établissements autonomes…</span>
                    </div>
                ) : filteredSchools.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 border border-white/5 rounded-2xl bg-white/[0.01] space-y-3">
                        <Building2 className="w-10 h-10 mx-auto text-slate-500 opacity-60" />
                        <p className="text-sm font-semibold text-slate-300">Aucun établissement sous pilote automatique trouvé</p>
                        <p className="text-xs text-slate-500">Créez votre première école en 1 clic pour activer l'autonomie complète.</p>
                        <Button
                            size="sm"
                            onClick={() => setShowCreateModal(true)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Créer une école maintenant
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredSchools.map(school => (
                            <motion.div
                                key={school.id}
                                layout
                                className="p-5 rounded-2xl bg-[#0F1424] border border-white/5 hover:border-indigo-500/40 transition-all shadow-xl space-y-4 flex flex-col justify-between group"
                            >
                                <div className="space-y-3">
                                    {/* Entête de carte */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors">
                                                    {school.name}
                                                </h3>
                                            </div>
                                            <p className="text-xs text-slate-400 flex items-center gap-1.5">
                                                <span>{school.city}, {school.country}</span>
                                                <span>•</span>
                                                <span className="text-indigo-400 font-mono">/{school.slug}</span>
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <Badge
                                                className={`text-[10px] font-semibold border ${
                                                    school.autopilot_status === 'active'
                                                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                                }`}
                                            >
                                                {school.autopilot_status === 'active' ? '🟢 Actif' : '⏸️ En pause'}
                                            </Badge>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleToggleAutopilot(school)}
                                                title={school.autopilot_status === 'active' ? 'Mettre en pause' : 'Réactiver'}
                                                className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-white/10"
                                            >
                                                {school.autopilot_status === 'active' ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                                            </Button>
                                            <a
                                                href={`/${school.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white"
                                                title="Visiter la landing page du campus"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>

                                    {/* Filières */}
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Filières structurées</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(school.autopilot_filieres || []).map((f, idx) => (
                                                <span key={idx} className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300">
                                                    {f}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions & Administration */}
                                <div className="pt-3 border-t border-white/5 space-y-3">
                                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {school.autopilot_pulse_count ? `${school.autopilot_pulse_count} cycles` : 'Nouveau'}
                                        </span>
                                        <span>
                                            {school.autopilot_last_pulse_at ? new Date(school.autopilot_last_pulse_at).toLocaleDateString('fr-FR') : 'Aujourd\'hui'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* BOUTON CLÉ : TABLEAU DE BORD ADMIN */}
                                        <Button
                                            size="sm"
                                            onClick={() => handleOpenAdminDashboard(school)}
                                            className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs h-8 font-semibold shadow-md shadow-indigo-600/20"
                                        >
                                            <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-indigo-300" />
                                            Espace Admin
                                        </Button>

                                        {/* BOUTON ADMIN VIRTUEL (DIRECTIVES IA) */}
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setInteractOrg(school);
                                                setDialogHistory([
                                                    { sender: 'admin', text: `Bonjour Superviseur. Je suis l'administrateur virtuel de "${school.name}". Toutes mes actions sont directement exécutées dans la base de données. Donnez-moi vos directives.` }
                                                ]);
                                            }}
                                            className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs border border-purple-500/30 h-8 px-2.5"
                                            title="Donner des instructions à l'admin virtuel"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                        </Button>

                                        {/* BOUTON CURSUS */}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleViewSchoolDetails(school)}
                                            className="border-white/10 text-slate-300 hover:text-white text-xs h-8 px-2.5"
                                            title="Aperçu rapide du cursus"
                                        >
                                            <BookOpen className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                MODAL MAJEUR : TABLEAU DE BORD ADMIN COMPLET DE L'ÉCOLE
            ══════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {selectedAdminSchool && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
                        onClick={() => setSelectedAdminSchool(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#0B0F1C] border border-indigo-500/40 rounded-2xl w-full max-w-5xl shadow-2xl text-white flex flex-col h-[90vh] overflow-hidden"
                        >
                            {/* En-tête du Dashboard */}
                            <div className="p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-indigo-950/40 via-[#0E1426] to-[#0B0F1C] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shadow-lg">
                                        <ShieldCheck className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h2 className="font-bold text-lg text-white">{selectedAdminSchool.name}</h2>
                                            <Badge className={selectedAdminSchool.autopilot_status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}>
                                                {selectedAdminSchool.autopilot_status === 'active' ? '🟢 Autopilote Actif' : '⏸️ En Pause'}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-slate-400 flex items-center gap-2">
                                            <span>{selectedAdminSchool.city}, {selectedAdminSchool.country}</span>
                                            <span>•</span>
                                            <a
                                                href={`/${selectedAdminSchool.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono"
                                            >
                                                iziteach.com/{selectedAdminSchool.slug}
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <Button
                                        size="sm"
                                        onClick={handleTriggerPulseNow}
                                        disabled={pulsingSchool}
                                        className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs h-8 font-semibold"
                                        title="Exécuter immédiatement les tâches autonomes de Dame SKY"
                                    >
                                        {pulsingSchool ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                                Cycle en cours…
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                                                Lancer un Cycle IA
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setInteractOrg(selectedAdminSchool);
                                            setDialogHistory([
                                                { sender: 'admin', text: `Directives pour "${selectedAdminSchool.name}" : je suis prêt. Que souhaitez-vous modifier ou créer ?` }
                                            ]);
                                        }}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 font-semibold"
                                    >
                                        <Bot className="w-3.5 h-3.5 mr-1.5" />
                                        Directives Admin
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setSelectedAdminSchool(null)}
                                        className="text-slate-400 hover:text-white h-8 w-8 p-0"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Barre des Onglets du Dashboard */}
                            <div className="px-4 border-b border-white/10 bg-[#0E1322] flex items-center gap-2 overflow-x-auto py-2 no-scrollbar">
                                <button
                                    onClick={() => setAdminActiveTab('overview')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                                        adminActiveTab === 'overview'
                                            ? 'bg-indigo-600 text-white shadow'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <BarChart3 className="w-3.5 h-3.5" />
                                    Vue d'ensemble
                                </button>

                                <button
                                    onClick={() => setAdminActiveTab('students')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                                        adminActiveTab === 'students'
                                            ? 'bg-indigo-600 text-white shadow'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <Users className="w-3.5 h-3.5" />
                                    Étudiants ({adminData?.students?.length || 0})
                                </button>

                                <button
                                    onClick={() => setAdminActiveTab('inscriptions')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                                        adminActiveTab === 'inscriptions'
                                            ? 'bg-indigo-600 text-white shadow'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    Inscriptions ({adminData?.inscriptions?.length || 0})
                                    {adminData?.inscriptions?.some(i => i.status === 'pending') && (
                                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                    )}
                                </button>

                                <button
                                    onClick={() => setAdminActiveTab('curriculum')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                                        adminActiveTab === 'curriculum'
                                            ? 'bg-indigo-600 text-white shadow'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <GraduationCap className="w-3.5 h-3.5" />
                                    Cursus & Matières ({adminData?.subjects?.length || 0})
                                </button>

                                <button
                                    onClick={() => setAdminActiveTab('teachers')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                                        adminActiveTab === 'teachers'
                                            ? 'bg-indigo-600 text-white shadow'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <UserCheck className="w-3.5 h-3.5" />
                                    Corps Enseignant ({adminData?.teachers?.length || 0})
                                </button>

                                <button
                                    onClick={() => setAdminActiveTab('announcements')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                                        adminActiveTab === 'announcements'
                                            ? 'bg-indigo-600 text-white shadow'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <Bell className="w-3.5 h-3.5" />
                                    Annonces ({adminData?.notifications?.length || 0})
                                </button>

                                <button
                                    onClick={() => setAdminActiveTab('logs')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                                        adminActiveTab === 'logs'
                                            ? 'bg-indigo-600 text-white shadow'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <Clock className="w-3.5 h-3.5" />
                                    Journal IA ({adminData?.logs?.length || 0})
                                </button>
                            </div>

                            {/* Contenu principal de l'Espace Admin */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                                {adminLoading ? (
                                    <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                                        <span className="text-xs font-medium">Synchronisation des données du campus en direct…</span>
                                    </div>
                                ) : (
                                    <>
                                        {/* ── ONGLET 1 : VUE D'ENSEMBLE ──────────────────────── */}
                                        {adminActiveTab === 'overview' && (
                                            <div className="space-y-6">
                                                {/* 6 Cartes KPI */}
                                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
                                                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Étudiants</span>
                                                        <div className="text-2xl font-bold text-white">{adminData?.students?.length || 0}</div>
                                                        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                                                            <CheckCircle className="w-3 h-3" /> Actifs
                                                        </span>
                                                    </div>

                                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
                                                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Inscriptions</span>
                                                        <div className="text-2xl font-bold text-amber-400">
                                                            {adminData?.inscriptions?.filter(i => i.status === 'pending').length || 0}
                                                        </div>
                                                        <span className="text-[10px] text-slate-400">En attente</span>
                                                    </div>

                                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
                                                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Classes</span>
                                                        <div className="text-2xl font-bold text-indigo-400">{adminData?.classrooms?.length || 0}</div>
                                                        <span className="text-[10px] text-slate-400">Filières</span>
                                                    </div>

                                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
                                                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Matières</span>
                                                        <div className="text-2xl font-bold text-purple-400">{adminData?.subjects?.length || 0}</div>
                                                        <span className="text-[10px] text-slate-400">Unités d'ens.</span>
                                                    </div>

                                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
                                                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Profs Virtuels</span>
                                                        <div className="text-2xl font-bold text-emerald-400">{adminData?.teachers?.length || 0}</div>
                                                        <span className="text-[10px] text-slate-400">Corps enseignant</span>
                                                    </div>

                                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
                                                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Cycles Autopilot</span>
                                                        <div className="text-2xl font-bold text-cyan-400">{selectedAdminSchool.autopilot_pulse_count || 0}</div>
                                                        <span className="text-[10px] text-slate-400">Exécutés</span>
                                                    </div>
                                                </div>

                                                {/* Split: Inscriptions récentes vs Activité IA récente */}
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                    {/* Inscriptions en attente */}
                                                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <h3 className="font-bold text-sm text-white flex items-center gap-2">
                                                                <UserPlus className="w-4 h-4 text-amber-400" />
                                                                Demandes d'inscription récentes
                                                            </h3>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => setAdminActiveTab('inscriptions')}
                                                                className="text-[11px] text-indigo-400 hover:text-indigo-300 p-0 h-auto"
                                                            >
                                                                Voir tout ({adminData?.inscriptions?.length || 0})
                                                            </Button>
                                                        </div>

                                                        {(!adminData?.inscriptions || adminData.inscriptions.length === 0) ? (
                                                            <p className="text-xs text-slate-500 py-4 text-center">Aucune demande d'inscription pour l'instant.</p>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {adminData.inscriptions.slice(0, 4).map(insc => (
                                                                    <div key={insc.id} className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between gap-3">
                                                                        <div className="space-y-0.5 min-w-0">
                                                                            <p className="text-xs font-semibold text-white truncate">
                                                                                {insc.first_name} {insc.last_name}
                                                                            </p>
                                                                            <p className="text-[10px] text-slate-400 truncate">
                                                                                {insc.phone || insc.email || 'Candidat'} • {insc.desired_class || 'Cursus'}
                                                                            </p>
                                                                        </div>
                                                                        {insc.status === 'pending' ? (
                                                                            <Button
                                                                                size="sm"
                                                                                disabled={approvingId === insc.id}
                                                                                onClick={() => handleApproveInscription(insc.id)}
                                                                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] h-7 px-2 font-semibold"
                                                                            >
                                                                                {approvingId === insc.id ? (
                                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                                ) : (
                                                                                    <>
                                                                                        <Check className="w-3 h-3 mr-1" />
                                                                                        Valider
                                                                                    </>
                                                                                )}
                                                                            </Button>
                                                                        ) : (
                                                                            <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px]">Validé</Badge>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Dernières actions de l'IA (Audit) */}
                                                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <h3 className="font-bold text-sm text-white flex items-center gap-2">
                                                                <Clock className="w-4 h-4 text-indigo-400" />
                                                                Journal d'autonomie de Dame SKY
                                                            </h3>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => setAdminActiveTab('logs')}
                                                                className="text-[11px] text-indigo-400 hover:text-indigo-300 p-0 h-auto"
                                                            >
                                                                Détails ({adminData?.logs?.length || 0})
                                                            </Button>
                                                        </div>

                                                        {(!adminData?.logs || adminData.logs.length === 0) ? (
                                                            <p className="text-xs text-slate-500 py-4 text-center">Aucun log enregistré pour le moment.</p>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {adminData.logs.slice(0, 4).map(log => (
                                                                    <div key={log.id} className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1 text-xs">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="font-semibold text-indigo-300 font-mono text-[11px]">{log.tool_name}</span>
                                                                            <span className="text-[10px] text-slate-500">
                                                                                {new Date(log.executed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[11px] text-slate-300 line-clamp-1">{log.output_summary || log.input_summary}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* ── ONGLET 2 : ÉTUDIANTS ───────────────────────────── */}
                                        {adminActiveTab === 'students' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="relative flex-1 max-w-sm">
                                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <Input
                                                            placeholder="Rechercher un étudiant par nom ou email…"
                                                            value={studentSearch}
                                                            onChange={e => setStudentSearch(e.target.value)}
                                                            className="pl-9 bg-black/30 border-white/10 text-white text-xs h-9"
                                                        />
                                                    </div>
                                                    <span className="text-xs text-slate-400">
                                                        Total : {adminData?.students?.length || 0} étudiant(s)
                                                    </span>
                                                </div>

                                                {(!adminData?.students || adminData.students.length === 0) ? (
                                                    <div className="p-12 text-center text-slate-400 border border-white/5 rounded-2xl space-y-2">
                                                        <Users className="w-8 h-8 mx-auto text-slate-600" />
                                                        <p className="text-xs font-semibold text-slate-300">Aucun étudiant inscrit pour le moment</p>
                                                        <p className="text-[11px] text-slate-500">
                                                            Les étudiants qui s'inscrivent via la landing page de l'établissement apparaîtront automatiquement ici.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="border border-white/10 rounded-xl overflow-hidden">
                                                        <table className="w-full text-left text-xs">
                                                            <thead className="bg-white/[0.03] text-slate-400 uppercase text-[10px] border-b border-white/10">
                                                                <tr>
                                                                    <th className="p-3">Étudiant</th>
                                                                    <th className="p-3">Email</th>
                                                                    <th className="p-3">Statut</th>
                                                                    <th className="p-3">Date d'inscription</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-white/5 text-slate-200">
                                                                {adminData.students
                                                                    .filter(s =>
                                                                        `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
                                                                        (s.email || '').toLowerCase().includes(studentSearch.toLowerCase())
                                                                    )
                                                                    .map(student => (
                                                                        <tr key={student.id} className="hover:bg-white/[0.02]">
                                                                            <td className="p-3 font-semibold text-white">
                                                                                {student.first_name} {student.last_name}
                                                                            </td>
                                                                            <td className="p-3 text-slate-400 font-mono text-[11px]">{student.email || '—'}</td>
                                                                            <td className="p-3">
                                                                                <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px]">Actif</Badge>
                                                                            </td>
                                                                            <td className="p-3 text-slate-400 text-[11px]">
                                                                                {new Date(student.created_at).toLocaleDateString('fr-FR')}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* ── ONGLET 3 : INSCRIPTIONS ────────────────────────── */}
                                        {adminActiveTab === 'inscriptions' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            variant={inscriptionFilter === 'all' ? 'default' : 'ghost'}
                                                            onClick={() => setInscriptionFilter('all')}
                                                            className={`text-xs h-8 ${inscriptionFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                                                        >
                                                            Toutes ({adminData?.inscriptions?.length || 0})
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant={inscriptionFilter === 'pending' ? 'default' : 'ghost'}
                                                            onClick={() => setInscriptionFilter('pending')}
                                                            className={`text-xs h-8 ${inscriptionFilter === 'pending' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
                                                        >
                                                            En attente ({adminData?.inscriptions?.filter(i => i.status === 'pending').length || 0})
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant={inscriptionFilter === 'accepted' ? 'default' : 'ghost'}
                                                            onClick={() => setInscriptionFilter('accepted')}
                                                            className={`text-xs h-8 ${inscriptionFilter === 'accepted' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                                                        >
                                                            Validées ({adminData?.inscriptions?.filter(i => i.status === 'accepted').length || 0})
                                                        </Button>
                                                    </div>

                                                    <span className="text-xs text-slate-400">
                                                        Les demandes peuvent être validées en 1 clic ou auto-validées par le pilote auto.
                                                    </span>
                                                </div>

                                                {(!adminData?.inscriptions || adminData.inscriptions.length === 0) ? (
                                                    <div className="p-12 text-center text-slate-400 border border-white/5 rounded-2xl space-y-2">
                                                        <UserPlus className="w-8 h-8 mx-auto text-slate-600" />
                                                        <p className="text-xs font-semibold text-slate-300">Aucune demande d'inscription</p>
                                                        <p className="text-[11px] text-slate-500">
                                                            Partagez le lien du campus <span className="text-indigo-400 font-mono">/{selectedAdminSchool.slug}</span> pour collecter des candidatures.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {adminData.inscriptions
                                                            .filter(i => inscriptionFilter === 'all' ? true : i.status === inscriptionFilter)
                                                            .map(insc => (
                                                                <div key={insc.id} className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-3 flex flex-col justify-between">
                                                                    <div className="space-y-1.5">
                                                                        <div className="flex items-center justify-between">
                                                                            <h4 className="font-bold text-white text-xs">{insc.first_name} {insc.last_name}</h4>
                                                                            <Badge className={insc.status === 'pending' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}>
                                                                                {insc.status === 'pending' ? '⏳ En attente' : '🟢 Validé'}
                                                                            </Badge>
                                                                        </div>
                                                                        <div className="text-[11px] text-slate-400 space-y-0.5">
                                                                            <p>📞 {insc.phone || 'Non renseigné'} • ✉️ {insc.email || 'Non renseigné'}</p>
                                                                            <p>🎓 Filière souhaitée : <span className="text-indigo-300 font-semibold">{insc.desired_class || 'Générale'}</span></p>
                                                                            {insc.access_code && (
                                                                                <p>🔑 Code étudiant : <span className="font-mono text-amber-400">{insc.access_code}</span></p>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                                                                        <span className="text-[10px] text-slate-500">
                                                                            {new Date(insc.created_at).toLocaleDateString('fr-FR')}
                                                                        </span>
                                                                        {insc.status === 'pending' && (
                                                                            <Button
                                                                                size="sm"
                                                                                disabled={approvingId === insc.id}
                                                                                onClick={() => handleApproveInscription(insc.id)}
                                                                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7 px-3 font-semibold"
                                                                            >
                                                                                {approvingId === insc.id ? (
                                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                                ) : (
                                                                                    <>
                                                                                        <Check className="w-3.5 h-3.5 mr-1" />
                                                                                        Valider l'inscription
                                                                                    </>
                                                                                )}
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* ── ONGLET 4 : CURSUS & MATIÈRES ───────────────────── */}
                                        {adminActiveTab === 'curriculum' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                        <GraduationCap className="w-4 h-4 text-indigo-400" />
                                                        Classes et Cursus Structurés
                                                    </h3>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            setInteractOrg(selectedAdminSchool);
                                                            setDialogHistory([
                                                                { sender: 'admin', text: 'Pour ajouter une classe ou une matière, vous pouvez me l\'ordonner ici. Exemple : "Ajoute une classe en Cybersécurité avec 3 matières clés".' }
                                                            ]);
                                                        }}
                                                        className="bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-xs h-7"
                                                    >
                                                        <Plus className="w-3 h-3 mr-1" />
                                                        Ajouter via Admin Virtuel
                                                    </Button>
                                                </div>

                                                {(!adminData?.classrooms || adminData.classrooms.length === 0) ? (
                                                    <p className="text-xs text-slate-500 py-8 text-center">Aucune classe générée.</p>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {adminData.classrooms.map(cls => {
                                                            const clsSubjects = (adminData.subjects || []).filter(s => s.classroom_id === cls.id);
                                                            return (
                                                                <div key={cls.id} className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <div>
                                                                            <h4 className="font-bold text-white text-xs">{cls.name}</h4>
                                                                            <p className="text-[10px] text-slate-400">Filière structurée</p>
                                                                        </div>
                                                                        <Badge className="bg-indigo-500/20 text-indigo-300 text-[10px]">
                                                                            {cls.level || 'Formation Pro'}
                                                                        </Badge>
                                                                    </div>

                                                                    <div className="space-y-1.5">
                                                                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Matières enseignées ({clsSubjects.length})</p>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                                                            {clsSubjects.map(sub => (
                                                                                <div key={sub.id} className="p-2 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] space-y-0.5">
                                                                                    <div className="font-semibold text-slate-200 truncate">{sub.name}</div>
                                                                                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                                                                                        <span className="font-mono text-indigo-300">{sub.code}</span>
                                                                                        <span>Coeff {sub.coefficient || 2}</span>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* ── ONGLET 5 : CORPS ENSEIGNANT ────────────────────── */}
                                        {adminActiveTab === 'teachers' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                        <UserCheck className="w-4 h-4 text-emerald-400" />
                                                        Corps Professoral Virtuel
                                                    </h3>
                                                    <span className="text-xs text-slate-400">{adminData?.teachers?.length || 0} enseignant(s) généré(s)</span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {(adminData?.teachers || []).map(t => (
                                                        <div key={t.id} className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-2">
                                                            <div className="flex items-start justify-between">
                                                                <div>
                                                                    <h4 className="font-bold text-white text-xs">{t.first_name} {t.last_name}</h4>
                                                                    <p className="text-[10px] text-indigo-300 font-medium">{t.specialty}</p>
                                                                </div>
                                                                <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px]">Enseignant IA</Badge>
                                                            </div>
                                                            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{t.bio}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* ── ONGLET 6 : ANNONCES DU CAMPUS ─────────────────── */}
                                        {adminActiveTab === 'announcements' && (
                                            <div className="space-y-5">
                                                {/* Formulaire nouvelle annonce */}
                                                <form onSubmit={handlePublishAnnouncement} className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                                                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                                                        <Bell className="w-3.5 h-3.5 text-indigo-400" />
                                                        Diffuser une nouvelle annonce aux étudiants
                                                    </h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <Input
                                                            placeholder="Titre de l'annonce (ex: Rentrée des classes)..."
                                                            value={newAnnouncementTitle}
                                                            onChange={e => setNewAnnouncementTitle(e.target.value)}
                                                            className="bg-black/30 border-white/10 text-white text-xs h-8"
                                                            required
                                                        />
                                                        <Input
                                                            placeholder="Message de l'annonce..."
                                                            value={newAnnouncementMessage}
                                                            onChange={e => setNewAnnouncementMessage(e.target.value)}
                                                            className="bg-black/30 border-white/10 text-white text-xs h-8"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="flex justify-end">
                                                        <Button
                                                            type="submit"
                                                            disabled={publishingAnnouncement}
                                                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-7 px-3"
                                                        >
                                                            {publishingAnnouncement ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Publier'}
                                                        </Button>
                                                    </div>
                                                </form>

                                                {/* Liste des annonces */}
                                                <div className="space-y-2">
                                                    {(!adminData?.notifications || adminData.notifications.length === 0) ? (
                                                        <p className="text-xs text-slate-500 py-6 text-center">Aucune annonce publiée pour l'instant.</p>
                                                    ) : (
                                                        adminData.notifications.map(n => (
                                                            <div key={n.id} className="p-3.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
                                                                <div className="flex items-center justify-between">
                                                                    <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                                                                        <span>{n.icon || '📢'}</span>
                                                                        {n.title}
                                                                    </h5>
                                                                    <span className="text-[10px] text-slate-500">
                                                                        {new Date(n.created_at).toLocaleDateString('fr-FR')}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* ── ONGLET 7 : JOURNAL IA & AUDIT ─────────────────── */}
                                        {adminActiveTab === 'logs' && (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-indigo-400" />
                                                        Historique des actions autonomes
                                                    </h3>
                                                    <span className="text-xs text-slate-400">{adminData?.logs?.length || 0} opération(s) enregistrée(s)</span>
                                                </div>

                                                {(!adminData?.logs || adminData.logs.length === 0) ? (
                                                    <p className="text-xs text-slate-500 py-8 text-center">Aucun journal pour le moment.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {adminData.logs.map(log => (
                                                            <div key={log.id} className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1 text-xs">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-mono font-bold text-indigo-300 text-[11px]">{log.tool_name}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge className="bg-emerald-500/10 text-emerald-400 text-[9px]">
                                                                            {log.status || 'success'}
                                                                        </Badge>
                                                                        <span className="text-[10px] text-slate-500">
                                                                            {new Date(log.executed_at).toLocaleString('fr-FR')}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <p className="text-slate-300 text-[11px]">{log.output_summary || log.input_summary}</p>
                                                                {log.duration_ms && (
                                                                    <p className="text-[10px] text-slate-500">Durée : {log.duration_ms} ms</p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                                    <Label className="text-xs text-slate-300">Nom de l'établissement</Label>
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
                                        Pour chaque filière, l'IA créera automatiquement la classe, les matières clés, les leçons, les quiz d'évaluation et assignera un professeur virtuel référent.
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
                MODAL 2 : DIALOGUE AVEC L'ADMIN VIRTUEL (AVEC EXÉCUTION RÉELLE)
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
                            className="bg-[#0F1424] border border-indigo-500/30 rounded-2xl p-5 sm:p-6 w-full max-w-xl shadow-2xl space-y-4 text-white flex flex-col h-[560px]"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                        <Bot className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm">Supervision : {interactOrg.name}</h3>
                                        <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            Exécution directe en base de données
                                        </p>
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

                                            {/* Badges d'actions réellement exécutées */}
                                            {msg.executed && msg.executed.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-emerald-500/20 space-y-1">
                                                    <div className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                                        Actions exécutées en base :
                                                    </div>
                                                    {msg.executed.map((act, idx) => (
                                                        <div key={idx} className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded flex items-center gap-1.5 border border-emerald-500/20">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                            {act}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {interacting && (
                                    <div className="flex justify-start">
                                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 text-xs flex items-center gap-2">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                                            L'Admin Virtuel analyse et exécute votre consigne en base…
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Suggestions d'ordres rapides */}
                            <div className="space-y-1.5 pt-1 border-t border-white/5">
                                <p className="text-[10px] text-slate-400 font-semibold">Directives rapides :</p>
                                <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto no-scrollbar">
                                    {QUICK_PROMPTS.map((q, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleSendInstruction(q)}
                                            disabled={interacting}
                                            className="text-[10px] bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-2 py-0.5 rounded border border-white/5 transition-colors disabled:opacity-50"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Champ de saisie d'instruction */}
                            <div className="pt-1 flex gap-2">
                                <Input
                                    value={instruction}
                                    onChange={e => setInstruction(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSendInstruction(); }}
                                    placeholder="Donner un ordre (ex: Rajoute un cours de massage, valide les inscriptions...)"
                                    disabled={interacting}
                                    className="bg-black/40 border-white/10 text-white text-xs"
                                />
                                <Button
                                    onClick={() => handleSendInstruction()}
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
                MODAL 3 : DÉTAILS & CURSUS GÉNÉRÉ DU CAMPUS (APERÇU)
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

                            <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        const school = selectedSchoolDetails.school;
                                        setSelectedSchoolDetails(null);
                                        handleOpenAdminDashboard(school);
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                                >
                                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                                    Ouvrir l'Espace Admin Complet
                                </Button>
                                <a
                                    href={`/${selectedSchoolDetails.school.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1.5"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Visiter le campus
                                </a>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
