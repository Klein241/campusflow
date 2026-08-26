'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * AI AGENTS MANAGER — IziTeach Admin Panel
 * ═══════════════════════════════════════════════════════════════
 * Permet à l'admin de :
 *  - Créer des clés d'API pour agents IA avec permissions granulaires
 *  - Révoquer des clés à tout moment
 *  - Voir le journal d'activité de chaque agent
 *  - Approuver/rejeter les actions en attente (bulk operations)
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
    Bot, Plus, Key, Shield, Eye, EyeOff, Copy, Trash2, Check,
    Activity, Clock, AlertTriangle, CheckCircle, XCircle,
    ChevronRight, ChevronDown, RefreshCw, Loader2, Info,
    Zap, Lock, BookOpen, Users, BarChart3, Calendar, ListChecks,
    Ban, ArrowRight, Terminal, Crown, Sparkles
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────
interface AgentKey {
    id: string;
    name: string;
    description: string | null;
    key_prefix: string;
    permissions: string[];
    rate_limit_per_minute: number;
    bulk_action_threshold: number;
    is_active: boolean;
    last_used_at: string | null;
    expires_at: string | null;
    created_at: string;
}

interface AgentLog {
    id: string;
    agent_key_id: string;
    tool_name: string;
    input_summary: string | null;
    output_summary: string | null;
    status: 'success' | 'error' | 'pending_approval' | 'rejected';
    error_message: string | null;
    duration_ms: number | null;
    executed_at: string;
}

interface PendingAction {
    id: string;
    agent_key_id: string;
    tool_name: string;
    description: string | null;
    item_count: number;
    action_data: Record<string, unknown>;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

interface PermissionCatalog {
    id: string;
    category: string;
    label: string;
    description: string;
    risk_level: 'low' | 'medium' | 'high';
    sort_order: number;
}

interface Stats {
    total_keys: number;
    active_keys: number;
    total_actions: number;
    pending_count: number;
    today_actions: number;
}

// ── Permission helpers ────────────────────────────────────────────
const RISK_COLORS = {
    low:    { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
    medium: { bg: 'bg-amber-500/15',   text: 'text-amber-400',   border: 'border-amber-500/30',   dot: 'bg-amber-400' },
    high:   { bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/30',     dot: 'bg-red-400' },
};

const RISK_LABELS = { low: 'Faible', medium: 'Moyen', high: 'Élevé' };

const TOOL_ICONS: Record<string, string> = {
    'create_lesson':            '📖',
    'create_chapter':           '📂',
    'create_subject':           '📚',
    'create_exercise':          '✏️',
    'list_students':            '👥',
    'list_subjects':            '📋',
    'list_chapters':            '📋',
    'get_grades':               '📊',
    'bulk_create':              '⚡',
    'list_supported_languages': '🌍',
    'translate_content':        '🌐',
    'create_exam_paper':        '📝',
    'launch_exam_session':      '🎯',
    'publish_library_item':     '📚',
    'compile_curriculum_to_book':'📕',
    'list_library_items':       '📖',
    'list_schedule':            '🗓️',
    'create_schedule_slot':     '⏰',
    'update_schedule_slot':     '✏️',
    'bulk_create_schedule':     '⚡',
};

const STATUS_CONFIG = {
    success:          { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Succès' },
    error:            { icon: XCircle,     color: 'text-red-400',     bg: 'bg-red-500/10',     label: 'Erreur' },
    pending_approval: { icon: Clock,       color: 'text-amber-400',   bg: 'bg-amber-500/10',   label: 'En attente' },
    rejected:         { icon: Ban,         color: 'text-slate-400',   bg: 'bg-slate-500/10',   label: 'Rejeté' },
};

// ── Helpers lisibilité journal ────────────────────────────────────
const TOOL_LABELS: Record<string, string> = {
    create_lesson:            'Création de leçon',
    create_chapter:           'Création de chapitre',
    create_subject:           'Création de matière',
    create_exercise:          'Création d\'exercice',
    list_students:            'Consultation des étudiants',
    list_subjects:            'Consultation des matières',
    list_chapters:            'Consultation des chapitres',
    list_lessons:             'Consultation des leçons',
    list_classes:             'Consultation des classes',
    get_org_info:             'Informations organisation',
    get_grades:               'Consultation des notes',
    bulk_create:              'Création en masse',
    list_supported_languages: 'Catalogue des langues',
    translate_content:        'Traduction de contenu',
    create_exam_paper:        'Création d\'examen',
    launch_exam_session:      'Lancement d\'examen',
    publish_library_item:     'Publication dans la bibliothèque',
    compile_curriculum_to_book:'Compilation de cours en livre',
    list_library_items:       'Consultation bibliothèque',
    delete_library_item:      'Suppression livre/document',
    list_schedule:            'Consultation emploi du temps',
    create_schedule_slot:     'Création créneau horaire',
    update_schedule:          'Mise à jour emploi du temps',
    update_schedule_slot:     'Modification créneau horaire',
    delete_schedule_slot:     'Suppression créneau horaire',
    bulk_create_schedule:     'Création emploi du temps en masse',
    ping:                     'Test de connexion',
};

function extractInputInfo(toolName: string, inputSummary: string | null): string {
    if (!inputSummary) return '';
    try {
        // Format: "toolName({...json...})"
        const match = inputSummary.match(/^\w+\(([\s\S]*)\)$/);
        const jsonStr = match ? match[1] : inputSummary;
        const args = JSON.parse(jsonStr);
        if (args.title)   return `📌 "${args.title}"`;
        if (args.name)    return `📌 "${args.name}"`;
        if (args.message) return args.message;
        const keys = Object.keys(args).filter(k => !k.endsWith('_id') && !k.endsWith('content'));
        if (keys.length > 0) return keys.map(k => `${k}: ${String(args[k]).slice(0, 40)}`).join(' • ');
    } catch {}
    // Fallback : tronquer lisiblement
    return inputSummary.replace(/"[0-9a-f-]{36}"/g, '"..."').slice(0, 120);
}

function extractOutputInfo(toolName: string, outputSummary: string | null, status: string): string {
    if (!outputSummary) return '';
    try {
        const data = JSON.parse(outputSummary);
        if (data.message)                return data.message.replace(/^[✅⚠️❌]\s*/, '');
        if (data.lesson?.title)          return `Leçon créée : "${data.lesson.title}"`;
        if (data.chapter?.title)         return `Chapitre créé : "${data.chapter.title}"`;
        if (data.subject?.name)          return `Matière créée : "${data.subject.name}"`;
        if (data.exercise?.title)        return `Exercice créé : "${data.exercise.title}"`;
        if (data.students !== undefined) return `${data.total ?? data.students?.length ?? 0} étudiant(s) récupéré(s)`;
        if (data.subjects !== undefined) return `${data.total ?? 0} matière(s) récupérée(s)`;
        if (data.chapters !== undefined) return `${data.total ?? 0} chapitre(s) récupéré(s)`;
        if (data.lessons  !== undefined) return `${data.total ?? 0} leçon(s) récupérée(s)`;
        if (data.organization?.name)     return `Organisation : ${data.organization.name}`;
        if (data.pong)                   return 'Connexion vérifiée ✓';
    } catch {}
    if (status === 'error') return outputSummary.slice(0, 120);
    return '';
}

// ── Main Component ────────────────────────────────────────────────
export function AiAgentsManager({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
    const [subTab, setSubTab] = useState<'keys' | 'logs' | 'pending' | 'docs'>('keys');
    const [agentKeys, setAgentKeys] = useState<AgentKey[]>([]);
    const [logs, setLogs] = useState<AgentLog[]>([]);
    const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
    const [permissionCatalog, setPermissionCatalog] = useState<PermissionCatalog[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
    const [reviewingId, setReviewingId] = useState<string | null>(null);

    // Create form state
    const [newKeyName, setNewKeyName]         = useState('');
    const [newKeyDesc, setNewKeyDesc]         = useState('');
    const [newKeyLanguage, setNewKeyLanguage] = useState('fr');
    const [newKeyPerms, setNewKeyPerms]       = useState<string[]>([]);
    const [newKeyRate, setNewKeyRate]         = useState(10);
    const [newKeyBulk, setNewKeyBulk]         = useState(5);
    const [newKeyExpires, setNewKeyExpires]   = useState('');
    const [creating, setCreating]             = useState(false);
    const [createdKey, setCreatedKey]         = useState<string | null>(null);
    const [keyCopied, setKeyCopied]           = useState(false);

    // Load all data
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [keysRes, logsRes, pendingRes, catalogRes, statsRes] = await Promise.all([
                supabase.from('ai_agent_keys')
                    .select('*')
                    .eq('organization_id', orgId)
                    .order('created_at', { ascending: false }),

                supabase.from('ai_agent_logs')
                    .select('*')
                    .eq('organization_id', orgId)
                    .order('executed_at', { ascending: false })
                    .limit(100),

                supabase.from('ai_pending_actions')
                    .select('*')
                    .eq('organization_id', orgId)
                    .order('created_at', { ascending: false })
                    .limit(50),

                supabase.from('ai_permission_catalog')
                    .select('*')
                    .neq('category', 'Superadmin')
                    .neq('category', 'superadmin')
                    .order('sort_order'),

                supabase.rpc('get_ai_agent_stats', { p_org_id: orgId }),
            ]);

            if (keysRes.data)    setAgentKeys(keysRes.data);
            if (logsRes.data)    setLogs(logsRes.data);
            if (pendingRes.data) setPendingActions(pendingRes.data);
            if (catalogRes.data) {
                // Double filtre de sécurité : exclure toute permission superadmin
                const schoolOnlyPerms = catalogRes.data.filter(
                    (p: any) => p.category?.toLowerCase() !== 'superadmin' && !p.id.startsWith('superadmin:')
                );
                setPermissionCatalog(schoolOnlyPerms);
            }
            if (statsRes.data)   setStats(statsRes.data);
        } catch (e) {
            console.error('[AiAgentsManager] Load error:', e);
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => { loadData(); }, [loadData]);

    // Reset create form
    const resetCreateForm = () => {
        setNewKeyName('');
        setNewKeyDesc('');
        setNewKeyLanguage('fr');
        setNewKeyPerms([]);
        setNewKeyRate(10);
        setNewKeyBulk(5);
        setNewKeyExpires('');
    };

    // Create agent key
    const handleCreateKey = async () => {
        if (!newKeyName.trim()) { toast.error('Donnez un nom à cet agent IA'); return; }
        if (newKeyPerms.length === 0) { toast.error('Sélectionnez au moins une permission'); return; }

        setCreating(true);
        try {
            const { data, error } = await supabase.rpc('create_ai_agent_key', {
                p_org_id:         orgId,
                p_name:           newKeyName.trim(),
                p_description:    newKeyDesc.trim() || null,
                p_permissions:    newKeyPerms,
                p_rate_limit:     newKeyRate,
                p_bulk_threshold: newKeyBulk,
                p_expires_at:     newKeyExpires || null,
            });

            if (error) throw error;
            if (!data?.full_key) throw new Error('La clé générée est invalide. Réessayez.');

            // Sauvegarder la langue par défaut si disponible
            if (data?.id && newKeyLanguage) {
                try {
                    await supabase.from('ai_agent_keys').update({ default_language: newKeyLanguage }).eq('id', data.id);
                } catch {}
            }

            // Fermer le formulaire EN PREMIER pour éviter le conflit DOM React
            setShowCreateForm(false);
            resetCreateForm();
            // Afficher la clé et recharger la liste
            setCreatedKey(data.full_key);
            toast.success('Clé agent créée — copiez-la maintenant !');
            await loadData();
        } catch (e: any) {
            toast.error(e.message || 'Erreur lors de la création');
        } finally {
            setCreating(false);
        }
    };

    // Revoke key
    const handleRevokeKey = async (keyId: string, keyName: string) => {
        if (!confirm(`Révoquer la clé "${keyName}" ? L'agent ne pourra plus se connecter immédiatement.`)) return;
        try {
            // Try RPC first
            const { error: rpcError } = await supabase.rpc('revoke_ai_agent_key', { p_key_id: keyId });
            if (rpcError) {
                // Fallback: direct update (works for admin dashboard since service_role bypass RLS)
                const { error: updateError } = await supabase
                    .from('ai_agent_keys')
                    .update({ is_active: false, updated_at: new Date().toISOString() })
                    .eq('id', keyId);
                if (updateError) throw updateError;
            }
            toast.success('🔒 Clé révoquée — l\'agent ne peut plus se connecter.');
            await loadData();
        } catch (e: any) {
            toast.error(e.message || 'Erreur lors de la révocation');
        }
    };

    // Review pending action
    const handleReview = async (actionId: string, decision: 'approved' | 'rejected', comment?: string) => {
        setReviewingId(actionId);
        try {
            const { error } = await supabase.rpc('review_ai_pending_action', {
                p_action_id: actionId,
                p_decision:  decision,
                p_comment:   comment || null,
            });
            if (error) throw error;
            toast.success(decision === 'approved' ? '✅ Action approuvée' : '❌ Action rejetée');
            await loadData();
        } catch (e: any) {
            toast.error(e.message || 'Erreur');
        } finally {
            setReviewingId(null);
        }
    };

    // Copy key to clipboard
    const handleCopyKey = () => {
        if (!createdKey) return;
        navigator.clipboard.writeText(createdKey);
        setKeyCopied(true);
        setTimeout(() => setKeyCopied(false), 2000);
        toast.success('Clé copiée !');
    };

    // Toggle permission
    const togglePerm = (permId: string) => {
        setNewKeyPerms(prev =>
            prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
        );
    };

    // Group permissions by category
    const permsByCategory = permissionCatalog.reduce<Record<string, PermissionCatalog[]>>((acc, p) => {
        if (!acc[p.category]) acc[p.category] = [];
        acc[p.category].push(p);
        return acc;
    }, {});

    const pendingCount = pendingActions.filter(a => a.status === 'pending').length;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center shadow-lg">
                        <Crown className="w-5 h-5 text-amber-100" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span>Dame SKY</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">Console API</span>
                        </h2>
                        <p className="text-xs text-slate-400">Gérez les clés d'accès et les autorisations de votre école</p>
                    </div>
                </div>
                <button
                    onClick={loadData}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-slate-400 hover:text-white"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                        { icon: Key,       label: 'Clés totales',   value: stats.total_keys,    color: 'text-violet-400' },
                        { icon: Shield,    label: 'Clés actives',   value: stats.active_keys,   color: 'text-emerald-400' },
                        { icon: Activity,  label: 'Actions totales', value: stats.total_actions, color: 'text-blue-400' },
                        { icon: Zap,       label: 'Aujourd\'hui',   value: stats.today_actions, color: 'text-cyan-400' },
                        { icon: Clock,     label: 'En attente',     value: stats.pending_count, color: stats.pending_count > 0 ? 'text-amber-400' : 'text-slate-500' },
                    ].map(({ icon: Icon, label, value, color }) => (
                        <div key={label} className="bg-white/5 border border-white/8 rounded-xl p-3 text-center">
                            <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
                            <div className={`text-xl font-black ${color}`}>{value}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Alert : pending actions */}
            {pendingCount > 0 && (
                <div
                    onClick={() => setSubTab('pending')}
                    className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 cursor-pointer hover:bg-amber-500/15 transition"
                >
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-300">
                            {pendingCount} action{pendingCount > 1 ? 's' : ''} en attente d'approbation
                        </p>
                        <p className="text-xs text-amber-400/70">Un agent IA a soumis des opérations massives</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-amber-400" />
                </div>
            )}

            {/* Sub-tabs */}
            <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                {[
                    { id: 'keys',    label: 'Clés API',          icon: Key,       count: agentKeys.filter(k => k.is_active).length },
                    { id: 'logs',    label: 'Journal d\'activité', icon: Activity,  count: logs.length },
                    { id: 'pending', label: 'Approbations',       icon: Clock,     count: pendingCount },
                    { id: 'docs',    label: 'Guide & Connexion',  icon: Terminal,  count: 0 },
                ].map(({ id, label, icon: Icon, count }) => (
                    <button
                        key={id}
                        onClick={() => setSubTab(id as typeof subTab)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition ${
                            subTab === id
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{label}</span>
                        {count > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                                subTab === id ? 'bg-white/20 text-white' :
                                id === 'pending' && count > 0 ? 'bg-amber-500 text-black' : 'bg-white/10 text-slate-300'
                            }`}>
                                {count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── TAB : KEYS ─────────────────────────────────────────── */}
            {subTab === 'keys' && (
                <div className="space-y-4">
                    {/* Create button */}
                    {!showCreateForm && !createdKey && (
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-indigo-500/40 rounded-xl text-indigo-400 hover:border-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/5 transition font-medium text-sm"
                        >
                            <Plus className="w-5 h-5" />
                            Autoriser un nouveau Sky Agent
                        </button>
                    )}

                    {/* ── Created key display (one-time) ── */}
                    {createdKey && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                                <p className="text-sm font-bold text-emerald-300">Clé créée avec succès !</p>
                            </div>
                            <div className="bg-black/40 rounded-lg p-3 font-mono text-xs text-emerald-300 break-all">
                                {createdKey}
                            </div>
                            <p className="text-xs text-amber-400 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Cette clé ne sera plus affichée. Copiez-la maintenant et donnez-la à votre Sky Agent (Claude, Manus, ChatGPT...).
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopyKey}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition"
                                >
                                    {keyCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {keyCopied ? 'Copié !' : 'Copier la clé'}
                                </button>
                                <button
                                    onClick={() => { setCreatedKey(null); setShowCreateForm(false); resetCreateForm(); }}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm font-medium transition"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Create form ── */}
                    {showCreateForm && !createdKey && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-5">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Bot className="w-5 h-5 text-violet-400" />
                                Configurer un nouveau Sky Agent
                            </h3>

                            {/* Name & Description */}
                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
                                        Nom de l'agent <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        value={newKeyName}
                                        onChange={e => setNewKeyName(e.target.value)}
                                        placeholder="Ex: MANUS Créateur de Cursus"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
                                        Description (optionnel)
                                    </label>
                                    <input
                                        value={newKeyDesc}
                                        onChange={e => setNewKeyDesc(e.target.value)}
                                        placeholder="Ex: Crée automatiquement les leçons du cursus de mathématiques"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block flex items-center gap-1.5">
                                        <span>🌍</span>
                                        Langue principale de l'agent IA
                                    </label>
                                    <select
                                        value={newKeyLanguage}
                                        onChange={e => setNewKeyLanguage(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                                    >
                                        <optgroup label="Langues Internationales" className="bg-slate-900 font-semibold text-indigo-400">
                                            <option value="fr" className="bg-slate-900 text-white">Français (Standard)</option>
                                            <option value="en" className="bg-slate-900 text-white">Anglais (English)</option>
                                            <option value="ar" className="bg-slate-900 text-white">Arabe (العربية)</option>
                                            <option value="es" className="bg-slate-900 text-white">Espagnol (Español)</option>
                                            <option value="pt" className="bg-slate-900 text-white">Portugais (Português)</option>
                                        </optgroup>
                                        <optgroup label="Langues Locales Africaines (Natif & IA M2M100)" className="bg-slate-900 font-semibold text-emerald-400">
                                            <option value="sw" className="bg-slate-900 text-white">🌍 Swahili (Kiswahili — Kenya, Tanzanie, RDC, Ouganda)</option>
                                            <option value="ha" className="bg-slate-900 text-white">🌍 Haoussa (Hausa — Nigeria, Niger, Cameroun)</option>
                                            <option value="yo" className="bg-slate-900 text-white">🌍 Yoruba (Yorùbá — Nigeria, Bénin, Togo)</option>
                                            <option value="ig" className="bg-slate-900 text-white">🌍 Igbo (Igbo — Nigeria)</option>
                                            <option value="lin" className="bg-slate-900 text-white">🌍 Lingala (Lingála — RDC, Congo)</option>
                                            <option value="ful" className="bg-slate-900 text-white">🌍 Fulfulde / Peul (Cameroun, Guinée, Mali, Sénégal)</option>
                                            <option value="bam" className="bg-slate-900 text-white">🌍 Bambara (Mali)</option>
                                            <option value="kin" className="bg-slate-900 text-white">🌍 Kinyarwanda (Rwanda)</option>
                                            <option value="mlg" className="bg-slate-900 text-white">🌍 Malgache (Madagascar)</option>
                                            <option value="dyu" className="bg-slate-900 text-white">🌍 Dioula (Burkina Faso, Côte d'Ivoire)</option>
                                            <option value="bci" className="bg-slate-900 text-white">🌍 Baoulé (Côte d'Ivoire)</option>
                                            <option value="ewo" className="bg-slate-900 text-white">🌍 Ewondo (Cameroun)</option>
                                            <option value="dua" className="bg-slate-900 text-white">🌍 Duala (Cameroun)</option>
                                            <option value="fan" className="bg-slate-900 text-white">🌍 Beti-Fang (Cameroun, Gabon, Guinée Éq.)</option>
                                            <option value="am" className="bg-slate-900 text-white">🌍 Amharique (Éthiopie)</option>
                                            <option value="zu" className="bg-slate-900 text-white">🌍 Zoulou (isiZulu — Afrique du Sud)</option>
                                            <option value="wo" className="bg-slate-900 text-white">🌍 Wolof (Sénégal)</option>
                                            <option value="tw" className="bg-slate-900 text-white">🌍 Twi / Akan (Ghana)</option>
                                            <option value="so" className="bg-slate-900 text-white">🌍 Somali (Somalie, Djibouti)</option>
                                            <option value="dje" className="bg-slate-900 text-white">🌍 Zarma (Niger)</option>
                                        </optgroup>
                                    </select>
                                    <p className="text-xs text-slate-500 mt-1">Les leçons et contenus créés par cet agent adopteront cette langue par défaut.</p>
                                </div>
                            </div>

                            {/* Permissions */}
                            <div>
                                <label className="text-xs font-semibold text-slate-400 mb-2 block flex items-center gap-1.5">
                                    <Lock className="w-3.5 h-3.5" />
                                    Fonctionnalités autorisées <span className="text-red-400">*</span>
                                </label>
                                <p className="text-xs text-slate-500 mb-3">
                                    Cochez uniquement ce que cet agent a besoin de faire. Moins de permissions = plus de sécurité.
                                </p>
                                <div className="space-y-4">
                                    {Object.entries(permsByCategory).map(([category, perms]) => (
                                        <div key={category}>
                                            <p className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">{category}</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {perms.map(perm => {
                                                    const colors = RISK_COLORS[perm.risk_level];
                                                    const isSelected = newKeyPerms.includes(perm.id);
                                                    return (
                                                        <button
                                                            key={perm.id}
                                                            onClick={() => togglePerm(perm.id)}
                                                            className={`relative flex items-start gap-3 p-3 rounded-xl border text-left transition ${
                                                                isSelected
                                                                    ? 'bg-indigo-600/20 border-indigo-500/50'
                                                                    : 'bg-white/3 border-white/8 hover:bg-white/8'
                                                            }`}
                                                        >
                                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                                                isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'
                                                            }`}>
                                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <p className="text-sm font-medium text-white">{perm.label}</p>
                                                                    <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${colors.bg} ${colors.text} ${colors.border}`}>
                                                                        {RISK_LABELS[perm.risk_level]}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{perm.description}</p>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Limits */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
                                        Limite requêtes / minute
                                    </label>
                                    <select
                                        value={newKeyRate}
                                        onChange={e => setNewKeyRate(Number(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                                    >
                                        {[5, 10, 20, 30, 60].map(v => (
                                            <option key={v} value={v} className="bg-slate-900">{v} req/min</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
                                        Seuil d'approbation (bulk)
                                    </label>
                                    <select
                                        value={newKeyBulk}
                                        onChange={e => setNewKeyBulk(Number(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                                    >
                                        {[3, 5, 10, 20, 50].map(v => (
                                            <option key={v} value={v} className="bg-slate-900">Au-delà de {v} → approbation</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-500 mt-1">Actions en masse au-delà de ce seuil nécessitent votre accord</p>
                                </div>
                            </div>

                            {/* Expiry */}
                            <div>
                                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
                                    Date d'expiration (optionnel)
                                </label>
                                <input
                                    type="date"
                                    value={newKeyExpires}
                                    onChange={e => setNewKeyExpires(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                                />
                                <p className="text-xs text-slate-500 mt-1">Laisser vide pour une clé sans expiration</p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCreateKey}
                                    disabled={creating || !newKeyName.trim() || newKeyPerms.length === 0}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition"
                                >
                                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                                    {creating ? 'Création...' : 'Générer la clé'}
                                </button>
                                <button
                                    onClick={() => { setShowCreateForm(false); resetCreateForm(); }}
                                    className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-medium transition"
                                >
                                    Annuler
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Keys list */}
                    {agentKeys.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Aucun agent IA configuré</p>
                            <p className="text-xs mt-1">Créez votre première clé pour autoriser un agent IA</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {agentKeys.map(key => (
                                <AgentKeyCard
                                    key={key.id}
                                    agentKey={key}
                                    logs={logs.filter(l => l.agent_key_id === key.id)}
                                    isExpanded={selectedKeyId === key.id}
                                    onToggle={() => setSelectedKeyId(selectedKeyId === key.id ? null : key.id)}
                                    onRevoke={() => handleRevokeKey(key.id, key.name)}
                                    permissionCatalog={permissionCatalog}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB : LOGS ─────────────────────────────────────────── */}
            {subTab === 'logs' && (
                <div className="space-y-3">
                    {logs.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Aucune activité enregistrée</p>
                        </div>
                    ) : (
                        logs.map(log => {
                            const cfg        = STATUS_CONFIG[log.status];
                            const StatusIcon = cfg.icon;
                            const agentKey   = agentKeys.find(k => k.id === log.agent_key_id);
                            const toolLabel  = TOOL_LABELS[log.tool_name] || log.tool_name;
                            const toolIcon   = TOOL_ICONS[log.tool_name]  || '🤖';
                            const inputInfo  = extractInputInfo(log.tool_name, log.input_summary);
                            const outputInfo = extractOutputInfo(log.tool_name, log.output_summary, log.status);
                            const timeStr    = new Date(log.executed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                            const dateStr    = new Date(log.executed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                            return (
                                <div key={log.id} className={`rounded-2xl border p-4 space-y-2 ${
                                    log.status === 'success'
                                        ? 'bg-emerald-500/5 border-emerald-500/20'
                                        : log.status === 'error'
                                        ? 'bg-red-500/5 border-red-500/20'
                                        : 'bg-amber-500/5 border-amber-500/20'
                                }`}>
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-xl">{toolIcon}</span>
                                            <div>
                                                <p className="text-sm font-bold text-white leading-tight">{toolLabel}</p>
                                                {agentKey && (
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        Agent : <span className="text-violet-400">{agentKey.name}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.bg} ${cfg.color}`}>
                                                {cfg.label}
                                            </span>
                                            <p className="text-xs text-slate-500 mt-1">{dateStr} à {timeStr}</p>
                                            {log.duration_ms && (
                                                <p className="text-xs text-slate-600">{log.duration_ms}ms</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Ce que l'agent a fait */}
                                    {inputInfo && (
                                        <div className="flex items-start gap-2 bg-black/20 rounded-xl px-3 py-2">
                                            <span className="text-slate-500 text-xs mt-0.5 shrink-0">Action :</span>
                                            <p className="text-sm text-slate-200">{inputInfo}</p>
                                        </div>
                                    )}

                                    {/* Résultat */}
                                    {outputInfo && (
                                        <div className={`flex items-start gap-2 rounded-xl px-3 py-2 ${
                                            log.status === 'success'
                                                ? 'bg-emerald-500/10'
                                                : 'bg-red-500/10'
                                        }`}>
                                            <span className="text-slate-500 text-xs mt-0.5 shrink-0">Résultat :</span>
                                            <p className={`text-sm font-medium ${
                                                log.status === 'success' ? 'text-emerald-300' : 'text-red-300'
                                            }`}>{outputInfo}</p>
                                        </div>
                                    )}

                                    {/* Message d'erreur */}
                                    {log.error_message && (
                                        <div className="flex items-start gap-2 bg-red-500/10 rounded-xl px-3 py-2">
                                            <span className="text-red-400 text-xs mt-0.5 shrink-0">⚠️ Erreur :</span>
                                            <p className="text-sm text-red-300">{log.error_message}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* ── TAB : PENDING ──────────────────────────────────────── */}
            {subTab === 'pending' && (
                <div className="space-y-3">
                    {pendingActions.filter(a => a.status === 'pending').length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Aucune action en attente</p>
                            <p className="text-xs mt-1">Toutes les opérations des agents IA ont été traitées</p>
                        </div>
                    ) : (
                        pendingActions.filter(a => a.status === 'pending').map(action => {
                            const agentKey = agentKeys.find(k => k.id === action.agent_key_id);
                            return (
                                <div key={action.id} className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">{TOOL_ICONS[action.tool_name] || '🤖'}</span>
                                                <p className="text-sm font-bold text-white">{action.tool_name}</p>
                                                <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                                                    {action.item_count} éléments
                                                </span>
                                            </div>
                                            {agentKey && (
                                                <p className="text-xs text-slate-400 mt-1">Par : {agentKey.name}</p>
                                            )}
                                            {action.description && (
                                                <p className="text-sm text-slate-300 mt-2">{action.description}</p>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 shrink-0">
                                            {new Date(action.created_at).toLocaleDateString('fr-FR')}
                                        </p>
                                    </div>

                                    {/* Action data preview */}
                                    <div className="bg-black/30 rounded-lg p-3">
                                        <p className="text-xs text-slate-500 mb-1">Données de l'action :</p>
                                        <pre className="text-xs text-slate-300 overflow-x-auto">
                                            {JSON.stringify(action.action_data, null, 2).slice(0, 300)}
                                            {JSON.stringify(action.action_data).length > 300 ? '...' : ''}
                                        </pre>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleReview(action.id, 'approved')}
                                            disabled={reviewingId === action.id}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                                        >
                                            {reviewingId === action.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                            Approuver
                                        </button>
                                        <button
                                            onClick={() => handleReview(action.id, 'rejected', 'Rejeté par l\'administrateur')}
                                            disabled={reviewingId === action.id}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Rejeter
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Traités récemment */}
                    {pendingActions.filter(a => a.status !== 'pending').length > 0 && (
                        <div>
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Traités récemment</p>
                            {pendingActions.filter(a => a.status !== 'pending').slice(0, 5).map(action => (
                                <div key={action.id} className="flex items-center gap-3 p-3 bg-white/3 rounded-xl border border-white/6 mb-2">
                                    {action.status === 'approved'
                                        ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                        : <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                                    }
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-300">{action.tool_name} — {action.item_count} éléments</p>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        action.status === 'approved'
                                            ? 'bg-emerald-500/15 text-emerald-400'
                                            : 'bg-red-500/15 text-red-400'
                                    }`}>
                                        {action.status === 'approved' ? 'Approuvé' : 'Rejeté'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB : DOCS & GUIDE ──────────────────────────────────── */}
            {subTab === 'docs' && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 text-sm text-slate-300 leading-relaxed">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-indigo-400" />
                        Connexion MCP IziTeach (Sky Agent)
                    </h3>
                    <p>
                        Configurez votre agent IA préféré (Manus, Claude Desktop, ChatGPT, Antigravity) avec les coordonnées suivantes :
                    </p>
                    <div className="space-y-2">
                        <div className="bg-black/60 p-3.5 rounded-xl font-mono text-xs border border-indigo-500/30 space-y-1">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-400">⚡ Endpoint Principal (Cloudflare D1 Edge) :</span>
                            <p className="text-indigo-300 font-semibold">POST https://campusflow-worker.kleintaptue1.workers.dev/mcp-gateway</p>
                        </div>
                        <div className="bg-black/40 p-3 rounded-xl font-mono text-[11px] border border-white/5 space-y-1">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">🛡️ Endpoint Secours (Supabase Edge) :</span>
                            <p className="text-slate-400">POST https://nuisijvopyudmbcqpaua.supabase.co/functions/v1/mcp-gateway</p>
                        </div>
                    </div>
                    <div className="bg-black/60 p-3.5 rounded-xl font-mono text-xs text-slate-300 border border-white/10 space-y-1">
                        <p>Authorization: Bearer cf_live_VOTRE_CLE</p>
                        <p>Content-Type: application/json</p>
                    </div>
                </div>
            )}
        </div>
    );

    function resetCreateForm() {
        setNewKeyName('');
        setNewKeyDesc('');
        setNewKeyPerms([]);
        setNewKeyRate(10);
        setNewKeyBulk(5);
        setNewKeyExpires('');
    }
}

// ── Agent Key Card ────────────────────────────────────────────────
function AgentKeyCard({
    agentKey,
    logs,
    isExpanded,
    onToggle,
    onRevoke,
    permissionCatalog,
}: {
    agentKey: AgentKey;
    logs: AgentLog[];
    isExpanded: boolean;
    onToggle: () => void;
    onRevoke: () => void;
    permissionCatalog: PermissionCatalog[];
}) {
    const successCount = logs.filter(l => l.status === 'success').length;
    const errorCount   = logs.filter(l => l.status === 'error').length;
    const lastUsed = agentKey.last_used_at
        ? new Date(agentKey.last_used_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Jamais utilisé';

    return (
        <div className={`border rounded-2xl transition ${
            agentKey.is_active
                ? 'bg-white/4 border-white/10 hover:border-white/15'
                : 'bg-white/2 border-white/6 opacity-60'
        }`}>
            <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left">
                {/* Status dot */}
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${agentKey.is_active ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-slate-600'}`} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white text-sm">{agentKey.name}</p>
                        {!agentKey.is_active && (
                            <span className="text-xs bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full">Révoqué</span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{agentKey.key_prefix}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {lastUsed}
                        </span>
                        <span className="text-xs text-emerald-400">{successCount} succès</span>
                        {errorCount > 0 && <span className="text-xs text-red-400">{errorCount} erreurs</span>}
                        <span className="text-xs text-slate-500">{agentKey.permissions.length} permission{agentKey.permissions.length > 1 ? 's' : ''}</span>
                    </div>
                </div>

                {/* Expand icon */}
                {isExpanded
                    ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                }
            </button>

            {/* Expanded content */}
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/8 pt-4 space-y-4">
                    {agentKey.description && (
                        <p className="text-sm text-slate-400">{agentKey.description}</p>
                    )}

                    {/* Permissions */}
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Permissions accordées</p>
                        <div className="flex flex-wrap gap-1.5">
                            {agentKey.permissions.map(permId => {
                                const perm = permissionCatalog.find(p => p.id === permId);
                                const colors = perm ? RISK_COLORS[perm.risk_level] : RISK_COLORS.low;
                                return (
                                    <span key={permId} className={`text-xs px-2 py-1 rounded-lg border font-medium ${colors.bg} ${colors.text} ${colors.border}`}>
                                        {perm?.label || permId}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* Limits */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/4 rounded-xl p-3 text-center">
                            <p className="text-lg font-black text-white">{agentKey.rate_limit_per_minute}</p>
                            <p className="text-xs text-slate-500">req/min max</p>
                        </div>
                        <div className="bg-white/4 rounded-xl p-3 text-center">
                            <p className="text-lg font-black text-amber-400">{agentKey.bulk_action_threshold}</p>
                            <p className="text-xs text-slate-500">items → approbation</p>
                        </div>
                    </div>

                    {/* Expiry */}
                    {agentKey.expires_at && (
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Expire le {new Date(agentKey.expires_at).toLocaleDateString('fr-FR')}
                        </p>
                    )}

                    {/* Revoke */}
                    {agentKey.is_active && (
                        <button
                            onClick={onRevoke}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-red-400 rounded-xl text-sm font-medium transition"
                        >
                            <Trash2 className="w-4 h-4" />
                            Révoquer cette clé
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
