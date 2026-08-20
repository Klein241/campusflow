'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * SKY AGENT SUPERADMIN MANAGER — IziTeach Platform
 * ═══════════════════════════════════════════════════════════════
 * Permet au Superadmin de :
 *  - Créer des clés maîtres Sky Agent avec permissions globales
 *  - Gérer les agents IA pour le support, Sky Points, bugs, annonces
 *  - Consulter le journal d'activité global des agents
 *  - Approuver/rejeter les actions massives en attente
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
    Ban, ArrowRight, Sparkles, MessageSquare, Bug, Megaphone,
    Mail, Coins, Building2, Terminal, ShieldAlert
} from 'lucide-react';

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

interface Stats {
    total_keys: number;
    active_keys: number;
    total_actions: number;
    pending_count: number;
    today_actions: number;
}

const SUPERADMIN_PERMISSIONS = [
    { id: 'superadmin:all', label: '🌟 Contrôle Total Plateforme', desc: 'Accès sans restriction à tous les outils', risk: 'high' },
    { id: 'superadmin:support', label: '💬 Support & Messages', desc: 'Lire et répondre aux requêtes Sky Requests', risk: 'medium' },
    { id: 'superadmin:points', label: '⭐ Vente & Crédit Sky Points', desc: 'Valider et créditer les recharges', risk: 'high' },
    { id: 'superadmin:bugs', label: '🐛 Diagnostic & Rapports Bugs', desc: 'Analyser les bugs et mettre à jour les statuts', risk: 'low' },
    { id: 'superadmin:announcements', label: '📢 Annonces Globales', desc: 'Diffuser des annonces aux organisations', risk: 'high' },
    { id: 'superadmin:orgs', label: '🏫 Audit & Relance Écoles', desc: 'Détecter les orgs inactives et les relancer', risk: 'medium' },
    { id: 'superadmin:emails', label: '📧 Envoi d\'Emails', desc: 'Envoi d\'emails système ou de notifications', risk: 'medium' },
];

const TOOL_LABELS: Record<string, { label: string; icon: string }> = {
    list_support_messages:       { label: 'Consultation des messages support', icon: '💬' },
    reply_support_message:       { label: 'Réponse à un ticket support', icon: '✉️' },
    credit_sky_points:           { label: 'Crédit de Sky Points', icon: '⭐' },
    list_inactive_orgs:          { label: 'Détection écoles inactives', icon: '🏫' },
    list_bug_reports:            { label: 'Audit des rapports de bugs', icon: '🐛' },
    update_bug_status:           { label: 'Mise à jour statut bug', icon: '🔧' },
    send_superadmin_announcement:{ label: 'Diffusion annonce globale', icon: '📢' },
    get_platform_stats:          { label: 'Statistiques globales', icon: '📊' },
    ping:                        { label: 'Test de connexion', icon: '⚡' },
};

function formatInput(toolName: string, inputSummary: string | null): string {
    if (!inputSummary) return '';
    try {
        const match = inputSummary.match(/^\w+\((.*)\)$/s);
        const jsonStr = match ? match[1] : inputSummary;
        const args = JSON.parse(jsonStr);
        if (args.title) return `📌 "${args.title}"`;
        if (args.message) return `💬 "${args.message.slice(0, 80)}"`;
        if (args.points) return `⭐ ${args.points} points pour ${args.org_id || args.user_id || 'cible'}`;
        if (args.target) return `Cible : ${args.target}`;
        const keys = Object.keys(args);
        if (keys.length > 0) return keys.map(k => `${k}: ${String(args[k]).slice(0, 30)}`).join(' • ');
    } catch {}
    return inputSummary.slice(0, 100);
}

function formatOutput(toolName: string, outputSummary: string | null): string {
    if (!outputSummary) return '';
    try {
        const data = JSON.parse(outputSummary);
        if (data.message) return data.message.replace(/^[✅⚠️❌]\s*/, '');
        if (data.total !== undefined) return `${data.total} élément(s) traités`;
        if (data.success) return 'Opération exécutée avec succès';
    } catch {}
    return outputSummary.slice(0, 100);
}

export function SkyAgentSuperadminManager() {
    const [subTab, setSubTab] = useState<'keys' | 'logs' | 'pending' | 'docs'>('keys');
    const [agentKeys, setAgentKeys] = useState<AgentKey[]>([]);
    const [logs, setLogs] = useState<AgentLog[]>([]);
    const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    // Form creation
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyDesc, setNewKeyDesc] = useState('');
    const [newKeyPerms, setNewKeyPerms] = useState<string[]>(['superadmin:all']);
    const [newKeyRate, setNewKeyRate] = useState(30);
    const [newKeyBulk, setNewKeyBulk] = useState(10);
    const [creating, setCreating] = useState(false);
    const [createdKey, setCreatedKey] = useState<string | null>(null);
    const [keyCopied, setKeyCopied] = useState(false);

    // Load data
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [keysRes, logsRes, pendingRes, statsRes] = await Promise.all([
                supabase.from('ai_agent_keys')
                    .select('*')
                    .eq('is_superadmin', true)
                    .order('created_at', { ascending: false }),

                supabase.from('ai_agent_logs')
                    .select('*')
                    .eq('is_superadmin', true)
                    .order('executed_at', { ascending: false })
                    .limit(100),

                supabase.from('ai_pending_actions')
                    .select('*, ai_agent_keys!inner(is_superadmin)')
                    .eq('ai_agent_keys.is_superadmin', true)
                    .order('created_at', { ascending: false })
                    .limit(50),

                supabase.rpc('get_superadmin_sky_agent_stats'),
            ]);

            if (keysRes.data) setAgentKeys(keysRes.data);
            if (logsRes.data) setLogs(logsRes.data);
            if (pendingRes.data) setPendingActions(pendingRes.data);
            if (statsRes.data) setStats(statsRes.data);
        } catch (e) {
            console.error('[SkyAgentSuperadminManager] Load error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCreateKey = async () => {
        if (!newKeyName.trim()) {
            toast.error('Donnez un nom au Sky Agent');
            return;
        }
        setCreating(true);
        try {
            const { data, error } = await supabase.rpc('create_superadmin_sky_agent_key', {
                p_name: newKeyName.trim(),
                p_description: newKeyDesc.trim() || null,
                p_permissions: newKeyPerms,
                p_rate_limit: newKeyRate,
                p_bulk_threshold: newKeyBulk,
            });

            if (error) throw error;

            setCreatedKey(data.full_key);
            toast.success('Clé Superadmin Sky Agent générée !');
            loadData();
        } catch (e: any) {
            toast.error(e.message || 'Erreur lors de la création de la clé');
        } finally {
            setCreating(false);
        }
    };

    const handleRevokeKey = async (keyId: string, keyName: string) => {
        if (!confirm(`Révoquer l'accès pour "${keyName}" ? Cette action est irréversible.`)) return;
        try {
            const { error } = await supabase
                .from('ai_agent_keys')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', keyId);

            if (error) throw error;
            toast.success(`Accès révoqué pour "${keyName}"`);
            loadData();
        } catch (e: any) {
            toast.error(e.message || 'Erreur lors de la révocation');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-extrabold text-white">Sky Agent — Superadmin Hub</h2>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Master Gateway
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Déléguez la gestion globale de la plateforme à vos agents IA (Manus, Claude, ChatGPT...)
                        </p>
                    </div>
                </div>
                <button
                    onClick={loadData}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition text-slate-400 hover:text-white border border-white/10"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-white/5 border border-white/8 rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-400">
                        <Key className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-white leading-tight">{stats?.total_keys || 0}</p>
                        <p className="text-[11px] text-slate-400">Clés Master</p>
                    </div>
                </div>
                <div className="bg-white/5 border border-white/8 rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                        <Shield className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-emerald-300 leading-tight">{stats?.active_keys || 0}</p>
                        <p className="text-[11px] text-slate-400">Clés actives</p>
                    </div>
                </div>
                <div className="bg-white/5 border border-white/8 rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400">
                        <Activity className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-white leading-tight">{stats?.total_actions || 0}</p>
                        <p className="text-[11px] text-slate-400">Actions totales</p>
                    </div>
                </div>
                <div className="bg-white/5 border border-white/8 rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
                        <Zap className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-amber-300 leading-tight">{stats?.today_actions || 0}</p>
                        <p className="text-[11px] text-slate-400">Dernières 24h</p>
                    </div>
                </div>
                <div className="bg-white/5 border border-white/8 rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-400">
                        <Clock className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-rose-300 leading-tight">{stats?.pending_count || 0}</p>
                        <p className="text-[11px] text-slate-400">En attente</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-3">
                {[
                    { id: 'keys', label: 'Clés Superadmin', icon: Key, count: agentKeys.length },
                    { id: 'logs', label: 'Journal d\'activité', icon: Activity, count: logs.length },
                    { id: 'pending', label: 'Approbations', icon: ShieldAlert, count: pendingActions.length },
                    { id: 'docs', label: 'Guide & Configuration', icon: BookOpen },
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setSubTab(t.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                            subTab === t.id
                                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <t.icon className="w-4 h-4" />
                        <span>{t.label}</span>
                        {t.count !== undefined && t.count > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-xs bg-white/20 text-white font-bold">
                                {t.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── TAB 1 : CLÉS SUPERADMIN ────────────────────────────── */}
            {subTab === 'keys' && (
                <div className="space-y-4">
                    {!showCreateForm && !createdKey && (
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="w-full py-4 border-2 border-dashed border-violet-500/30 hover:border-violet-400/60 rounded-2xl flex items-center justify-center gap-2 text-violet-300 hover:text-violet-200 hover:bg-violet-500/5 transition font-semibold text-sm"
                        >
                            <Plus className="w-5 h-5" />
                            Générer une nouvelle clé Master Sky Agent (Superadmin)
                        </button>
                    )}

                    {/* Clé créée avec succès */}
                    {createdKey && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center gap-2 text-emerald-300 font-bold">
                                <CheckCircle className="w-5 h-5" />
                                Clé Master Sky Agent générée avec succès !
                            </div>
                            <p className="text-xs text-amber-300 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                Copiez cette clé immédiatement. Pour des raisons de sécurité, elle ne sera plus jamais affichée.
                            </p>
                            <div className="bg-black/60 border border-emerald-500/30 rounded-xl p-3.5 font-mono text-xs text-emerald-300 break-all select-all flex items-center justify-between gap-3">
                                <span>{createdKey}</span>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(createdKey);
                                        setKeyCopied(true);
                                        toast.success('Clé copiée !');
                                        setTimeout(() => setKeyCopied(false), 2000);
                                    }}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
                                >
                                    {keyCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    {keyCopied ? 'Copié !' : 'Copier'}
                                </button>
                            </div>
                            <button
                                onClick={() => { setCreatedKey(null); setShowCreateForm(false); }}
                                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold transition"
                            >
                                Fermer
                            </button>
                        </div>
                    )}

                    {/* Formulaire de création */}
                    {showCreateForm && !createdKey && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-violet-400" />
                                Configurer un Sky Agent Superadmin
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 mb-1 block">Nom de l'Agent</label>
                                    <input
                                        value={newKeyName}
                                        onChange={e => setNewKeyName(e.target.value)}
                                        placeholder="Ex: MANUS Superadmin Master"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 mb-1 block">Description (optionnel)</label>
                                    <input
                                        value={newKeyDesc}
                                        onChange={e => setNewKeyDesc(e.target.value)}
                                        placeholder="Ex: Gestion support, Sky Points et relance écoles"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                                    />
                                </div>
                            </div>

                            {/* Permissions selection */}
                            <div>
                                <label className="text-xs font-semibold text-slate-400 mb-2 block">Permissions autorisées :</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {SUPERADMIN_PERMISSIONS.map(p => {
                                        const checked = newKeyPerms.includes(p.id);
                                        return (
                                            <label
                                                key={p.id}
                                                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                                                    checked ? 'bg-violet-600/15 border-violet-500/40 text-white' : 'bg-white/3 border-white/5 text-slate-400 hover:bg-white/5'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={e => {
                                                        if (e.target.checked) setNewKeyPerms([...newKeyPerms, p.id]);
                                                        else setNewKeyPerms(newKeyPerms.filter(x => x !== p.id));
                                                    }}
                                                    className="mt-1 accent-violet-500"
                                                />
                                                <div>
                                                    <p className="text-xs font-bold text-white">{p.label}</p>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">{p.desc}</p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex gap-2 justify-end pt-2">
                                <button
                                    onClick={() => setShowCreateForm(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-white/5"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleCreateKey}
                                    disabled={creating}
                                    className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 transition flex items-center gap-1.5 shadow-lg shadow-violet-600/20 disabled:opacity-50"
                                >
                                    {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                                    Générer la clé Master
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Liste des clés existantes */}
                    <div className="space-y-3">
                        {agentKeys.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 bg-white/3 rounded-2xl border border-white/5">
                                <Key className="w-10 h-10 mx-auto mb-2 opacity-30 text-violet-400" />
                                <p className="text-sm font-semibold">Aucune clé Superadmin configurée</p>
                                <p className="text-xs mt-1">Créez votre première clé Master pour connecter un Sky Agent.</p>
                            </div>
                        ) : (
                            agentKeys.map(k => (
                                <div key={k.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white text-sm">{k.name}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                k.is_active ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/15 text-slate-400'
                                            }`}>
                                                {k.is_active ? 'Actif' : 'Révoqué'}
                                            </span>
                                            <span className="font-mono text-xs text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded-md">
                                                {k.key_prefix}
                                            </span>
                                        </div>
                                        {k.description && <p className="text-xs text-slate-400">{k.description}</p>}
                                        <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                                            <span>Permissions : {k.permissions.length}</span>
                                            <span>•</span>
                                            <span>Dernier usage : {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString('fr-FR') : 'Jamais'}</span>
                                        </div>
                                    </div>
                                    {k.is_active && (
                                        <button
                                            onClick={() => handleRevokeKey(k.id, k.name)}
                                            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                                        >
                                            <Ban className="w-3.5 h-3.5" />
                                            Révoquer
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ── TAB 2 : JOURNAL D'ACTIVITÉ LISIBLE ──────────────────── */}
            {subTab === 'logs' && (
                <div className="space-y-3">
                    {logs.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 bg-white/3 rounded-2xl border border-white/5">
                            <Activity className="w-10 h-10 mx-auto mb-2 opacity-30 text-violet-400" />
                            <p className="text-sm font-semibold">Aucune action superadmin enregistrée</p>
                            <p className="text-xs mt-1">Dès que vos Sky Agents exécuteront des requêtes, elles apparaîtront ici.</p>
                        </div>
                    ) : (
                        logs.map(log => {
                            const meta = TOOL_LABELS[log.tool_name] || { label: log.tool_name, icon: '🤖' };
                            const timeStr = new Date(log.executed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                            const dateStr = new Date(log.executed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                            return (
                                <div key={log.id} className={`rounded-2xl border p-4 space-y-2.5 ${
                                    log.status === 'success' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'
                                }`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-xl">{meta.icon}</span>
                                            <div>
                                                <p className="text-sm font-bold text-white leading-tight">{meta.label}</p>
                                                <p className="text-xs text-slate-500 font-mono mt-0.5">{log.tool_name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                                log.status === 'success' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                                            }`}>
                                                {log.status === 'success' ? 'Succès' : 'Erreur'}
                                            </span>
                                            <p className="text-[11px] text-slate-500 mt-1">{dateStr} à {timeStr}</p>
                                        </div>
                                    </div>

                                    {log.input_summary && (
                                        <div className="bg-black/20 rounded-xl px-3 py-2 text-xs text-slate-300 flex items-start gap-2">
                                            <span className="text-slate-500 shrink-0">Paramètres :</span>
                                            <span>{formatInput(log.tool_name, log.input_summary)}</span>
                                        </div>
                                    )}

                                    {log.output_summary && (
                                        <div className="bg-emerald-500/10 rounded-xl px-3 py-2 text-xs text-emerald-300 flex items-start gap-2">
                                            <span className="text-slate-500 shrink-0">Résultat :</span>
                                            <span>{formatOutput(log.tool_name, log.output_summary)}</span>
                                        </div>
                                    )}

                                    {log.error_message && (
                                        <div className="bg-rose-500/10 rounded-xl px-3 py-2 text-xs text-rose-300">
                                            ⚠️ {log.error_message}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* ── TAB 3 : APPROBATIONS EN ATTENTE ────────────────────── */}
            {subTab === 'pending' && (
                <div className="text-center py-12 text-slate-500 bg-white/3 rounded-2xl border border-white/5">
                    <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-400" />
                    <p className="text-sm font-semibold">Toutes les opérations ont été traitées</p>
                    <p className="text-xs mt-1">Aucune action massive en attente d'approbation superadmin.</p>
                </div>
            )}

            {/* ── TAB 4 : GUIDE & CONFIGURATION ──────────────────────── */}
            {subTab === 'docs' && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 text-sm text-slate-300 leading-relaxed">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-violet-400" />
                        Connexion d'un Sky Agent Master (MCP IziTeach)
                    </h3>
                    <p>
                        Donnez l'URL Cloudflare principale et votre clé Master à votre agent IA (Claude, Manus, ChatGPT) :
                    </p>
                    <div className="space-y-2">
                        <div className="bg-black/60 p-3.5 rounded-xl font-mono text-xs border border-violet-500/30 space-y-1">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-violet-400">⚡ Endpoint Principal (Cloudflare D1 Edge) :</span>
                            <p className="text-violet-300 font-semibold">POST https://campusflow-worker.kleintaptue1.workers.dev/mcp-gateway</p>
                        </div>
                        <div className="bg-black/40 p-3 rounded-xl font-mono text-[11px] border border-white/5 space-y-1">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">🛡️ Endpoint Secours (Supabase Edge) :</span>
                            <p className="text-slate-400">POST https://nuisijvopyudmbcqpaua.supabase.co/functions/v1/mcp-gateway</p>
                        </div>
                    </div>
                    <div className="bg-black/60 p-3.5 rounded-xl font-mono text-xs text-slate-300 border border-white/10 space-y-1">
                        <p>Authorization: Bearer cf_live_sa_VOTRE_CLE</p>
                        <p>Content-Type: application/json</p>
                    </div>
                </div>
            )}
        </div>
    );
}
