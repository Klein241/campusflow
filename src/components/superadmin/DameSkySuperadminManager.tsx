'use client';

import { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadToR2 } from '@/lib/r2';
import { toast } from 'sonner';
import {
    Crown, Sparkles, Shield, AlertTriangle, CheckCircle2,
    Sliders, Settings, Save, RefreshCw, Eye, Ban, Check, X,
    MessageSquare, Bug, Award, Users, Search, Filter, ShieldAlert,
    BookOpen, Upload, Plus, Trash2, FileText, ExternalLink,
    GraduationCap, Briefcase, UserCheck, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface DameSkyConfig {
    id?: string;
    is_active: boolean;
    temperament: 'caring' | 'strict_pedagogue' | 'uncompromising' | 'strategic_mentor';
    custom_instructions: string;
    fraud_detection_sensitivity: 'low' | 'medium' | 'high';
    auto_bug_report_enabled: boolean;
    safety_moderation_enabled: boolean;
    allowed_roles: string[];
    llm_model: string;
}

interface SafetyAlert {
    id: string;
    organization_id: string | null;
    org_name: string | null;
    user_name: string | null;
    user_role: string | null;
    alert_type: string;
    severity: string;
    context_snippet: string | null;
    detected_reason: string;
    action_taken: string;
    status: string;
    created_at: string;
}

export interface DameSkySkill {
    id: string;
    title: string;
    description: string | null;
    target_role: 'all' | 'admin' | 'prof' | 'student';
    category: 'pedagogy' | 'governance' | 'student_revision' | 'methodology' | 'technical' | 'custom';
    content: string;
    file_url?: string | null;
    file_name?: string | null;
    file_size?: number | null;
    is_active: boolean;
    usage_count: number;
    created_at: string;
}

const TEMPERAMENT_OPTIONS = [
    {
        id: 'strict_pedagogue',
        label: 'Professeure d\'Élite (Par défaut)',
        desc: 'Bienveillante mais très exigeante, sans flatterie. Recadre fermement la paresse et l\'approximation.',
        color: 'border-amber-500/50 bg-amber-500/10 text-amber-200',
    },
    {
        id: 'caring',
        label: 'Bienveillante & Encourageante',
        desc: 'Ton doux, valorisation des efforts, patience accrue pour les apprenants débutants.',
        color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200',
    },
    {
        id: 'uncompromising',
        label: 'Discipline de Fer (Sans concession)',
        desc: 'Tolérance zéro pour les erreurs évitables, concision absolue et exigence de perfection.',
        color: 'border-rose-500/50 bg-rose-500/10 text-rose-200',
    },
    {
        id: 'strategic_mentor',
        label: 'Mentorat Stratégique & Leadership',
        desc: 'Posture de directrice d\'académie : efficacité, synthèse exécutive et orientation de carrière.',
        color: 'border-indigo-500/50 bg-indigo-500/10 text-indigo-200',
    },
];

export function DameSkySuperadminManager() {
    const [config, setConfig] = useState<DameSkyConfig>({
        is_active: true,
        temperament: 'strict_pedagogue',
        custom_instructions: '',
        fraud_detection_sensitivity: 'high',
        auto_bug_report_enabled: true,
        safety_moderation_enabled: true,
        allowed_roles: ['admin', 'prof', 'student'],
        llm_model: '@cf/meta/llama-3.1-8b-instruct',
    });

    const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
    const [skills, setSkills] = useState<DameSkySkill[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [filterType, setFilterType] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [skillRoleFilter, setSkillRoleFilter] = useState<string>('all');

    // Formulaire d'upload / création de Skill
    const [showSkillModal, setShowSkillModal] = useState(false);
    const [skillTitle, setSkillTitle] = useState('');
    const [skillDesc, setSkillDesc] = useState('');
    const [skillTargetRole, setSkillTargetRole] = useState<'all' | 'admin' | 'prof' | 'student'>('prof');
    const [skillCategory, setSkillCategory] = useState<'pedagogy' | 'governance' | 'student_revision' | 'methodology' | 'technical' | 'custom'>('pedagogy');
    const [skillContent, setSkillContent] = useState('');
    const [skillFile, setSkillFile] = useState<File | null>(null);
    const [isUploadingSkill, setIsUploadingSkill] = useState(false);
    const skillFileInputRef = useRef<HTMLInputElement>(null);

    // Charger la configuration, les alertes et les skills
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Config
            const { data: cfgData } = await supabase
                .from('dame_sky_config')
                .select('*')
                .limit(1)
                .maybeSingle();

            if (cfgData) setConfig(cfgData);

            // 2. Alertes de sécurité
            const { data: alertsData } = await supabase
                .from('dame_sky_safety_alerts')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (alertsData) setAlerts(alertsData);

            // 3. Skills IA
            const { data: skillsData } = await supabase
                .from('dame_sky_skills')
                .select('*')
                .order('created_at', { ascending: false });

            if (skillsData) setSkills(skillsData);
        } catch (e: any) {
            console.error('[DameSkySuperadmin] Load error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Basculer instantanément l'état actif/inactif de la bulle Dame SKY
    const handleToggleMasterActive = async (newActive: boolean) => {
        setConfig(prev => ({ ...prev, is_active: newActive }));
        try {
            const { data: existing } = await supabase
                .from('dame_sky_config')
                .select('id')
                .limit(1)
                .maybeSingle();

            if (existing?.id) {
                await supabase
                    .from('dame_sky_config')
                    .update({ is_active: newActive, updated_at: new Date().toISOString() })
                    .eq('id', existing.id);
            } else {
                await supabase
                    .from('dame_sky_config')
                    .insert([{ ...config, is_active: newActive }]);
            }

            if (newActive) {
                toast.success('🟢 Bulle Dame SKY activée sur toute la plateforme !');
            } else {
                toast.info('🔴 Bulle Dame SKY désactivée (masquée pour tous les utilisateurs).');
            }
        } catch (e: any) {
            toast.error('Erreur lors du changement d\'état de Dame SKY : ' + (e?.message || ''));
        }
    };

    // Sauvegarder la configuration globale
    const handleSaveConfig = async () => {
        setSaving(true);
        const toastId = toast.loading('Mise à jour du comportement de Dame SKY…');

        try {
            const { data: existing } = await supabase
                .from('dame_sky_config')
                .select('id')
                .limit(1)
                .maybeSingle();

            if (existing?.id) {
                const { error } = await supabase
                    .from('dame_sky_config')
                    .update({
                        is_active: config.is_active,
                        temperament: config.temperament,
                        custom_instructions: config.custom_instructions,
                        fraud_detection_sensitivity: config.fraud_detection_sensitivity,
                        auto_bug_report_enabled: config.auto_bug_report_enabled,
                        safety_moderation_enabled: config.safety_moderation_enabled,
                        allowed_roles: config.allowed_roles,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existing.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('dame_sky_config')
                    .insert([{ ...config }]);

                if (error) throw error;
            }

            toast.success('Comportement de Dame SKY actualisé avec succès !', { id: toastId });
        } catch (err: any) {
            toast.error(err?.message || 'Erreur lors de l\'enregistrement', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    // Uploader / Créer un nouveau Skill
    const handleCreateSkill = async () => {
        if (!skillTitle.trim() || (!skillContent.trim() && !skillFile)) {
            toast.error('Veuillez renseigner au minimum un titre et du contenu ou un fichier');
            return;
        }

        setIsUploadingSkill(true);
        const toastId = toast.loading('Création et injection du Skill pour Dame SKY…');

        try {
            let uploadedFileUrl: string | null = null;
            let finalContent = skillContent.trim();

            if (skillFile) {
                const r2Res = await uploadToR2(skillFile, 'skills', `skill_${Date.now()}_${skillFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
                uploadedFileUrl = r2Res?.url || null;

                if (!finalContent) {
                    finalContent = `Fichier de référence : ${skillFile.name}\nURL du référentiel : ${uploadedFileUrl}`;
                }
            }

            const { data, error } = await supabase
                .from('dame_sky_skills')
                .insert([{
                    title: skillTitle.trim(),
                    description: skillDesc.trim() || null,
                    target_role: skillTargetRole,
                    category: skillCategory,
                    content: finalContent,
                    file_url: uploadedFileUrl,
                    file_name: skillFile ? skillFile.name : null,
                    file_size: skillFile ? skillFile.size : null,
                    is_active: true,
                }])
                .select()
                .single();

            if (error) throw error;

            setSkills(prev => [data, ...prev]);
            setShowSkillModal(false);
            setSkillTitle('');
            setSkillDesc('');
            setSkillContent('');
            setSkillFile(null);
            toast.success(`Skill "${data.title}" activé avec succès pour Dame SKY !`, { id: toastId });
        } catch (err: any) {
            toast.error(err?.message || 'Erreur lors de la création du skill', { id: toastId });
        } finally {
            setIsUploadingSkill(false);
        }
    };

    // Toggle état d'un skill
    const handleToggleSkill = async (skillId: string, currentActive: boolean) => {
        try {
            const { error } = await supabase
                .from('dame_sky_skills')
                .update({ is_active: !currentActive, updated_at: new Date().toISOString() })
                .eq('id', skillId);

            if (error) throw error;
            setSkills(prev => prev.map(s => s.id === skillId ? { ...s, is_active: !currentActive } : s));
            toast.success(`Skill ${!currentActive ? 'activé' : 'désactivé'}`);
        } catch {
            toast.error('Échec de la modification');
        }
    };

    // Supprimer un skill
    const handleDeleteSkill = async (skillId: string) => {
        try {
            const { error } = await supabase.from('dame_sky_skills').delete().eq('id', skillId);
            if (error) throw error;
            setSkills(prev => prev.filter(s => s.id !== skillId));
            toast.success('Skill supprimé');
        } catch {
            toast.error('Échec de la suppression');
        }
    };

    // Mettre à jour le statut d'une alerte
    const handleUpdateAlertStatus = async (alertId: string, status: string) => {
        try {
            const { error } = await supabase
                .from('dame_sky_safety_alerts')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', alertId);

            if (error) throw error;
            setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status } : a));
            toast.success(`Alerte marquée comme ${status}`);
        } catch {
            toast.error('Échec de la mise à jour du statut');
        }
    };

    const filteredAlerts = alerts.filter(a => {
        const matchesFilter = filterType === 'all' || a.alert_type === filterType || (filterType === 'pending' && a.status === 'pending');
        const matchesSearch = !searchQuery ||
            (a.user_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (a.org_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (a.detected_reason?.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesFilter && matchesSearch;
    });

    const filteredSkills = skills.filter(s =>
        skillRoleFilter === 'all' || s.target_role === skillRoleFilter || s.target_role === 'all'
    );

    return (
        <div className="space-y-8">
            {/* ── Bannière Supérieure Dame SKY ── */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600/30 via-rose-600/20 to-indigo-900/40 border border-amber-500/30 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 via-rose-500 to-indigo-600 border border-amber-300/50 flex items-center justify-center shadow-[0_0_24px_rgba(245,158,11,0.4)]">
                            <Crown className="w-8 h-8 text-amber-100" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl md:text-3xl font-black text-white tracking-wide">Dame SKY</h2>
                                <Badge className="bg-amber-500/20 border-amber-400/40 text-amber-300">SuperAdmin Center</Badge>
                            </div>
                            <p className="text-slate-300 text-sm mt-1 max-w-xl">
                                Contrôlez le tempérament professoral, uploadez des compétences (Skills) spécialisées par rôle et gérez le journal de modération.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={loadData}
                            variant="outline"
                            className="bg-white/5 border-white/10 text-slate-300 hover:text-white"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Actualiser
                        </Button>
                        <Button
                            onClick={handleSaveConfig}
                            disabled={saving}
                            className="bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-bold shadow-lg shadow-amber-500/20"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? 'Enregistrement…' : 'Sauvegarder'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Interrupteur Général SuperAdmin pour la Bulle Dame SKY ── */}
            <div className={cn(
                "p-5 rounded-2xl border transition-all shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                config.is_active
                    ? "bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-emerald-950/30 border-emerald-500/40 shadow-emerald-500/10"
                    : "bg-gradient-to-r from-rose-950/40 via-slate-900/60 to-rose-950/30 border-rose-500/40 shadow-rose-500/10"
            )}>
                <div className="flex items-center gap-3.5">
                    <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border",
                        config.is_active
                            ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-400"
                            : "bg-rose-500/20 border-rose-400/40 text-rose-400"
                    )}>
                        <Crown className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-white">Bulle Flottante Dame SKY Chat</h3>
                            <Badge className={cn(
                                "text-xs font-semibold px-2.5 py-0.5",
                                config.is_active
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                    : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                            )}>
                                {config.is_active ? "🟢 Activée (Visible pour tous)" : "🔴 Désactivée (Masquée partout)"}
                            </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {config.is_active
                                ? "La bulle Dame SKY est disponible sur le Campus, les dashboards et la page d'accueil."
                                : "La bulle flottante est totalement masquée et inaccessible pour tous les étudiants, professeurs et administrateurs."}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="text-xs font-medium text-slate-300">
                        {config.is_active ? "Désactiver" : "Activer"}
                    </span>
                    <Switch
                        id="dame-sky-master-toggle"
                        checked={config.is_active}
                        onCheckedChange={handleToggleMasterActive}
                        className="data-[state=checked]:bg-emerald-500"
                    />
                </div>
            </div>

            {/* ── Section 1 : Configuration du Tempérament & Exigences ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tempérament */}
                <Card className="lg:col-span-2 bg-[#0F1423]/80 border-white/10 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-lg text-white flex items-center gap-2">
                            <Sliders className="w-5 h-5 text-amber-400" />
                            Tempérament & Posture Pédagogique
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Sélectionnez le niveau d'exigence et le style de réponse de Dame SKY
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {TEMPERAMENT_OPTIONS.map(opt => {
                                const isSelected = config.temperament === opt.id;
                                return (
                                    <div
                                        key={opt.id}
                                        onClick={() => setConfig(p => ({ ...p, temperament: opt.id as any }))}
                                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${isSelected ? `${opt.color} shadow-lg ring-2 ring-amber-400/30` : 'border-white/5 bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-sm text-white">{opt.label}</h4>
                                            {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                                        </div>
                                        <p className="text-xs mt-1 leading-relaxed opacity-80">{opt.desc}</p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Directives spécifiques personnalisées */}
                        <div className="pt-2">
                            <Label className="text-white text-xs font-semibold">Directives Globales de la Direction Générale (Prompt Système Ajouté)</Label>
                            <textarea
                                value={config.custom_instructions}
                                onChange={e => setConfig(p => ({ ...p, custom_instructions: e.target.value }))}
                                placeholder="Ex: Rappeler toujours aux étudiants de mentionner leurs sources. Insister sur la rigueur orthographique…"
                                rows={3}
                                className="w-full mt-1.5 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Modules & Sécurité */}
                <Card className="bg-[#0F1423]/80 border-white/10 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-lg text-white flex items-center gap-2">
                            <Shield className="w-5 h-5 text-emerald-400" />
                            Garde-fous & Sécurité
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Automatisations actives
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-white text-sm font-medium">Dame SKY Active</Label>
                                <p className="text-[11px] text-slate-400">Accessible par les utilisateurs</p>
                            </div>
                            <Switch
                                checked={config.is_active}
                                onCheckedChange={v => setConfig(p => ({ ...p, is_active: v }))}
                            />
                        </div>

                        <div className="flex items-center justify-between border-t border-white/5 pt-4">
                            <div>
                                <Label className="text-white text-sm font-medium">Sensibilité Anti-Triche</Label>
                                <p className="text-[11px] text-slate-400">Signalement des devoirs d'examens</p>
                            </div>
                            <select
                                value={config.fraud_detection_sensitivity}
                                onChange={e => setConfig(p => ({ ...p, fraud_detection_sensitivity: e.target.value as any }))}
                                className="bg-white/5 border border-white/10 text-white rounded-lg px-2.5 py-1 text-xs"
                            >
                                <option value="low" className="bg-slate-900">Basse</option>
                                <option value="medium" className="bg-slate-900">Moyenne</option>
                                <option value="high" className="bg-slate-900">Haute (Stricte)</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/5 pt-4">
                            <div>
                                <Label className="text-white text-sm font-medium">Auto-Création de Bugs</Label>
                                <p className="text-[11px] text-slate-400">Transférer les anomalies à l'équipe</p>
                            </div>
                            <Switch
                                checked={config.auto_bug_report_enabled}
                                onCheckedChange={v => setConfig(p => ({ ...p, auto_bug_report_enabled: v }))}
                            />
                        </div>

                        <div className="flex items-center justify-between border-t border-white/5 pt-4">
                            <div>
                                <Label className="text-white text-sm font-medium">Filtre Sécurité & Dérives</Label>
                                <p className="text-[11px] text-slate-400">Violence, sexe, comptes douteux</p>
                            </div>
                            <Switch
                                checked={config.safety_moderation_enabled}
                                onCheckedChange={v => setConfig(p => ({ ...p, safety_moderation_enabled: v }))}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Section 2 : Gestionnaire & Uploader de SKILLS (Prof / Admin / Étudiant) ── */}
            <Card className="bg-[#0F1423]/80 border-white/10 backdrop-blur-xl">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-amber-400" />
                                Gestionnaire de Skills & Connaissances Spécialisées
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Uploadez des fiches de compétences, référentiels ministériels ou guides pédagogiques pour enrichir Dame SKY selon les rôles
                            </CardDescription>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Filtre par Rôle */}
                            <select
                                value={skillRoleFilter}
                                onChange={e => setSkillRoleFilter(e.target.value)}
                                className="bg-white/5 border border-white/10 text-white rounded-lg px-2.5 py-1 text-xs h-9"
                            >
                                <option value="all" className="bg-slate-900">Tous les rôles</option>
                                <option value="prof" className="bg-slate-900">🎓 Professeurs</option>
                                <option value="admin" className="bg-slate-900">🏛️ Administrateurs</option>
                                <option value="student" className="bg-slate-900">🎒 Étudiants</option>
                            </select>

                            <Button
                                onClick={() => setShowSkillModal(true)}
                                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-9"
                            >
                                <Plus className="w-4 h-4 mr-1.5" />
                                Ajouter / Uploader un Skill
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredSkills.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-400" />
                            <p className="text-sm">Aucun skill configuré pour cette sélection.</p>
                            <p className="text-xs text-slate-600 mt-1">Uploadez des référentiels pour doter Dame SKY de savoirs sur-mesure.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            {filteredSkills.map(skill => {
                                const roleColors: Record<string, string> = {
                                    prof: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
                                    admin: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                                    student: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
                                    all: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
                                };
                                return (
                                    <div
                                        key={skill.id}
                                        className={cn(
                                            'p-4 rounded-2xl border transition-all flex flex-col justify-between',
                                            skill.is_active
                                                ? 'bg-white/[0.02] border-white/10 hover:border-amber-400/30'
                                                : 'bg-white/[0.01] border-white/5 opacity-60'
                                        )}
                                    >
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <Badge className={roleColors[skill.target_role] || roleColors.all}>
                                                    {skill.target_role === 'prof' ? '🎓 Professeurs' :
                                                     skill.target_role === 'admin' ? '🏛️ Direction' :
                                                     skill.target_role === 'student' ? '🎒 Étudiants' : '🌐 Tous'}
                                                </Badge>
                                                <button
                                                    onClick={() => handleToggleSkill(skill.id, skill.is_active)}
                                                    title={skill.is_active ? "Désactiver ce skill" : "Activer ce skill"}
                                                    className="text-xs text-slate-400 hover:text-white"
                                                >
                                                    {skill.is_active ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Ban className="w-4 h-4 text-slate-500" />}
                                                </button>
                                            </div>

                                            <h4 className="font-bold text-sm text-white">{skill.title}</h4>
                                            {skill.description && (
                                                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{skill.description}</p>
                                            )}

                                            {skill.file_name && (
                                                <div className="flex items-center gap-1.5 text-[11px] text-amber-300/80 bg-amber-500/10 p-1.5 rounded-lg">
                                                    <FileText className="w-3.5 h-3.5" />
                                                    <span className="truncate">{skill.file_name}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
                                            <span>{new Date(skill.created_at).toLocaleDateString('fr-FR')}</span>
                                            <button
                                                onClick={() => handleDeleteSkill(skill.id)}
                                                className="text-red-400/60 hover:text-red-300 p-1 transition-colors"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal de création / upload de Skill */}
            {showSkillModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-[#0f1520] border border-amber-500/30 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-amber-400" />
                                Ajouter un Skill pour Dame SKY
                            </h3>
                            <button onClick={() => setShowSkillModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <Label className="text-white text-xs">Titre de la compétence / référentiel :</Label>
                                <Input
                                    value={skillTitle}
                                    onChange={e => setSkillTitle(e.target.value)}
                                    placeholder="Ex: Grille d'Évaluation Baccalauréat 2026..."
                                    className="bg-white/5 border-white/10 text-white mt-1"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-white text-xs">Rôle Cible :</Label>
                                    <select
                                        value={skillTargetRole}
                                        onChange={e => setSkillTargetRole(e.target.value as any)}
                                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-2.5 py-2 mt-1 text-xs"
                                    >
                                        <option value="prof" className="bg-slate-900">🎓 Professeurs</option>
                                        <option value="admin" className="bg-slate-900">🏛️ Direction & Admin</option>
                                        <option value="student" className="bg-slate-900">🎒 Étudiants</option>
                                        <option value="all" className="bg-slate-900">🌐 Tous les rôles</option>
                                    </select>
                                </div>

                                <div>
                                    <Label className="text-white text-xs">Catégorie :</Label>
                                    <select
                                        value={skillCategory}
                                        onChange={e => setSkillCategory(e.target.value as any)}
                                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-2.5 py-2 mt-1 text-xs"
                                    >
                                        <option value="pedagogy" className="bg-slate-900">Pédagogie</option>
                                        <option value="governance" className="bg-slate-900">Gouvernance</option>
                                        <option value="student_revision" className="bg-slate-900">Révision Étudiant</option>
                                        <option value="methodology" className="bg-slate-900">Méthodologie</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <Label className="text-white text-xs">Fichier source (PDF, Markdown, Word, TXT) :</Label>
                                <div className="mt-1 flex items-center gap-2">
                                    <input
                                        ref={skillFileInputRef}
                                        type="file"
                                        onChange={e => setSkillFile(e.target.files?.[0] || null)}
                                        accept=".pdf,.md,.txt,.doc,.docx"
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => skillFileInputRef.current?.click()}
                                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs flex items-center gap-1.5"
                                    >
                                        <Upload className="w-3.5 h-3.5" />
                                        <span>{skillFile ? skillFile.name : 'Choisir un fichier…'}</span>
                                    </button>
                                    {skillFile && (
                                        <button onClick={() => setSkillFile(null)} className="text-red-400 text-xs hover:underline">
                                            Retirer
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label className="text-white text-xs">Contenu textuel / Directives précises :</Label>
                                <textarea
                                    value={skillContent}
                                    onChange={e => setSkillContent(e.target.value)}
                                    placeholder="Rédigez les règles, barèmes ou connaissances que Dame SKY doit appliquer…"
                                    rows={4}
                                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                            <Button variant="ghost" onClick={() => setShowSkillModal(false)} className="text-xs">
                                Annuler
                            </Button>
                            <Button
                                onClick={handleCreateSkill}
                                disabled={isUploadingSkill || !skillTitle.trim()}
                                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                            >
                                {isUploadingSkill ? 'Téléversement…' : 'Enregistrer le Skill'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Section 3 : Journal des Alertes de Sécurité & Fraudes ── */}
            <Card className="bg-[#0F1423]/80 border-white/10 backdrop-blur-xl">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-rose-400" />
                                Alertes de Fraude & Signalements Détectés par Dame SKY
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Tentatives de triche aux évaluations, propos inappropriés et comptes suspects
                            </CardDescription>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                                <Input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Rechercher…"
                                    className="pl-8 bg-white/5 border-white/10 text-xs h-8 w-44 text-white"
                                />
                            </div>
                            <select
                                value={filterType}
                                onChange={e => setFilterType(e.target.value)}
                                className="bg-white/5 border border-white/10 text-white rounded-lg px-2.5 py-1 text-xs h-8"
                            >
                                <option value="all" className="bg-slate-900">Toutes les alertes</option>
                                <option value="pending" className="bg-slate-900">En attente</option>
                                <option value="fraud_attempt" className="bg-slate-900">Fraude aux examens</option>
                                <option value="violence_threat" className="bg-slate-900">Violence / Menaces</option>
                                <option value="sexual_content" className="bg-slate-900">Contenu inapproprié</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredAlerts.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            <Shield className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-400" />
                            <p className="text-sm">Aucune alerte de sécurité ou de fraude signalée pour le moment.</p>
                            <p className="text-xs text-slate-600 mt-1">Dame SKY veille activement sur les interactions.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredAlerts.map(alert => {
                                const isFraud = alert.alert_type === 'fraud_attempt';
                                return (
                                    <div
                                        key={alert.id}
                                        className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge className={isFraud ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}>
                                                    {isFraud ? '🚨 Tentative de Fraude' : '⚠️ Sécurité / Dérive'}
                                                </Badge>
                                                <span className="text-xs font-semibold text-white">{alert.user_name || 'Utilisateur'}</span>
                                                <span className="text-[11px] text-slate-400">({alert.user_role} · {alert.org_name || 'Établissement'})</span>
                                                <span className="text-[10px] text-slate-500">{new Date(alert.created_at).toLocaleString('fr-FR')}</span>
                                            </div>
                                            <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                                Motif détecté : {alert.detected_reason}
                                            </p>
                                            {alert.context_snippet && (
                                                <p className="text-[11px] text-slate-500 italic bg-black/30 p-2 rounded-lg font-mono">
                                                    "{alert.context_snippet}"
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 self-end md:self-center">
                                            {alert.status === 'pending' ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleUpdateAlertStatus(alert.id, 'resolved')}
                                                        className="bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs h-7"
                                                    >
                                                        <Check className="w-3 h-3 mr-1" />
                                                        Traiter
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleUpdateAlertStatus(alert.id, 'dismissed')}
                                                        className="text-slate-400 hover:text-white text-xs h-7"
                                                    >
                                                        Classer
                                                    </Button>
                                                </>
                                            ) : (
                                                <Badge variant="outline" className="text-[11px] text-slate-400">
                                                    {alert.status === 'resolved' ? '✅ Traitée' : 'Archivée'}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
