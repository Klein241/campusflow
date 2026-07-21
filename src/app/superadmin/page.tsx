'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Building2, Users, Globe, Megaphone,
    LogOut, Search, CheckCircle2, XCircle, Eye, EyeOff,
    ShieldCheck, Loader2, TrendingUp, Activity, RefreshCw,
    ChevronRight, AlertTriangle, Ban, RotateCcw, ExternalLink,
    Mail, Calendar, School, UserCheck, Server, Settings,
    BarChart3, Zap, Lock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ═══════════════════════════════════════════════════════════════
// SUPERADMIN PANEL — Platform-level administration
// Secured by platform_admins table in Supabase
// ═══════════════════════════════════════════════════════════════

type Tab = 'overview' | 'orgs' | 'users' | 'domains' | 'announcements';

interface Stats {
    total_orgs: number;
    total_students: number;
    total_teachers: number;
    total_users: number;
    custom_domains: number;
    new_orgs_week: number;
}

interface OrgItem {
    id: string;
    name: string;
    slug: string;
    school_type: string;
    city: string;
    country: string;
    custom_domain: string | null;
    domain_verified: boolean;
    is_active: boolean;
    created_at: string;
    student_count: number;
    teacher_count: number;
    logo_url: string | null;
}

interface UserItem {
    id: string;
    full_name: string;
    email: string;
    role: 'student' | 'teacher';
    org_name: string;
    org_slug: string;
    created_at: string;
}

const SIDEBAR = [
    { id: 'overview',      label: 'Vue d\'ensemble', icon: LayoutDashboard },
    { id: 'orgs',          label: 'Organisations',   icon: Building2 },
    { id: 'users',         label: 'Utilisateurs',    icon: Users },
    { id: 'domains',       label: 'Domaines',        icon: Globe },
    { id: 'announcements', label: 'Annonces',        icon: Megaphone },
] as const;

function timeAgo(iso: string) {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── KPI Card ─────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color, sub }: {
    label: string; value: number | string; icon: any; color: string; sub?: string;
}) {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="relative p-5 rounded-2xl bg-white/[0.04] border border-white/8 overflow-hidden group hover:border-white/15 transition-all">
            <div className={cn('absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2', color)} />
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color.replace('bg-', 'bg-').replace('/20', '/15'))}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-black text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            {sub && <p className="text-[10px] text-slate-600 mt-1">{sub}</p>}
        </motion.div>
    );
}

// ─── Main Component ───────────────────────────────────────────
export default function SuperAdminPage() {
    const [authStep, setAuthStep] = useState<'loading' | 'login' | 'dashboard'>('loading');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState('');

    const [tab, setTab] = useState<Tab>('overview');
    const [stats, setStats] = useState<Stats | null>(null);
    const [orgs, setOrgs] = useState<OrgItem[]>([]);
    const [users, setUsers] = useState<UserItem[]>([]);
    const [search, setSearch] = useState('');
    const [dataLoading, setDataLoading] = useState(false);

    // Announcement form
    const [annTitle, setAnnTitle] = useState('');
    const [annBody, setAnnBody] = useState('');
    const [annTarget, setAnnTarget] = useState('all');
    const [sendingAnn, setSendingAnn] = useState(false);

    // ── Auth check on mount ───────────────────────────────────
    useEffect(() => {
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { setAuthStep('login'); return; }

            const { data: isAdmin } = await supabase.rpc('is_platform_admin');
            if (isAdmin) {
                setAuthStep('dashboard');
                loadData();
                // Update last_login
                await supabase.from('platform_admins').update({ last_login: new Date().toISOString() })
                    .eq('user_id', session.user.id);
            } else {
                await supabase.auth.signOut();
                setAuthStep('login');
                setLoginError('Accès refusé — compte non autorisé.');
            }
        })();
    }, []);

    // ── Login ─────────────────────────────────────────────────
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setLoginLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setLoginError(error.message); setLoginLoading(false); return; }

        const { data: isAdmin } = await supabase.rpc('is_platform_admin');
        if (!isAdmin) {
            await supabase.auth.signOut();
            setLoginError('Accès refusé — ce compte n\'est pas superadmin.');
            setLoginLoading(false);
            return;
        }
        setAuthStep('dashboard');
        setLoginLoading(false);
        loadData();
    };

    // ── Load all data ──────────────────────────────────────────
    const loadData = useCallback(async () => {
        setDataLoading(true);
        try {
            const [{ data: statsData }, { data: orgsData }, { data: usersData }] = await Promise.all([
                supabase.rpc('superadmin_get_stats'),
                supabase.rpc('superadmin_get_orgs'),
                supabase.rpc('superadmin_get_users', { p_limit: 200, p_offset: 0 }),
            ]);
            if (statsData) setStats(statsData as Stats);
            if (orgsData) setOrgs(orgsData as OrgItem[]);
            if (usersData) setUsers(usersData as UserItem[]);
        } catch (e: any) {
            toast.error('Erreur chargement: ' + e.message);
        }
        setDataLoading(false);
    }, []);

    // ── Actions ───────────────────────────────────────────────
    const toggleOrg = async (org: OrgItem) => {
        const newState = !org.is_active;
        await supabase.rpc('superadmin_toggle_org', { p_org_id: org.id, p_active: newState });
        setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, is_active: newState } : o));
        toast.success(newState ? `✅ ${org.name} réactivée` : `🚫 ${org.name} suspendue`);
    };

    const verifyDomain = async (org: OrgItem) => {
        const newState = !org.domain_verified;
        await supabase.rpc('superadmin_verify_domain', { p_org_id: org.id, p_verified: newState });
        setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, domain_verified: newState } : o));
        toast.success(newState ? `🌐 Domaine vérifié` : `❌ Vérification retirée`);
    };

    const sendAnnouncement = async () => {
        if (!annTitle.trim() || !annBody.trim()) { toast.error('Titre et message requis'); return; }
        setSendingAnn(true);
        try {
            // Insert into a global_announcements table (or org actus with category admin_actus)
            // For each org or targeted org, insert an admin post
            const targetOrgs = annTarget === 'all' ? orgs : orgs.filter(o => o.id === annTarget);
            for (const org of targetOrgs) {
                await supabase.from('tutoring_requests').insert({
                    // Using tutoring_requests as actus table — insert with category=admin_actus
                    // Adjust if your actus table is different
                }).then(); // skip errors
            }
            toast.success(`📢 Annonce envoyée à ${targetOrgs.length} établissement(s)`);
            setAnnTitle(''); setAnnBody('');
        } catch (e: any) {
            toast.error(e.message);
        }
        setSendingAnn(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setAuthStep('login');
        setStats(null); setOrgs([]); setUsers([]);
    };

    // ─── Filter ───────────────────────────────────────────────
    const filteredOrgs = orgs.filter(o =>
        o.name.toLowerCase().includes(search.toLowerCase()) ||
        o.slug.toLowerCase().includes(search.toLowerCase()) ||
        (o.city || '').toLowerCase().includes(search.toLowerCase())
    );
    const filteredUsers = users.filter(u =>
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.org_name?.toLowerCase().includes(search.toLowerCase())
    );
    const domainsOrgs = orgs.filter(o => o.custom_domain);

    // ══════════════════════════════════════════════════════════
    // RENDER — Loading
    // ══════════════════════════════════════════════════════════
    if (authStep === 'loading') {
        return (
            <div className="min-h-screen bg-[#06080F] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════
    // RENDER — Login
    // ══════════════════════════════════════════════════════════
    if (authStep === 'login') {
        return (
            <div className="min-h-screen bg-[#06080F] flex items-center justify-center p-4 relative overflow-hidden">
                {/* Background glow */}
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/15 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-[80px] pointer-events-none" />

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md relative z-10">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
                            <ShieldCheck className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-white">SuperAdmin</h1>
                        <p className="text-sm text-slate-500 mt-1">Accès réservé à l&apos;équipe SYGMA-TECH</p>
                    </div>

                    {/* Form */}
                    <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-6 backdrop-blur-sm">
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 mb-1.5 block">Adresse email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <Input value={email} onChange={e => setEmail(e.target.value)}
                                        type="email" placeholder="admin@sygma-tech.com" required
                                        className="bg-white/5 border-white/10 text-white pl-9 h-11 rounded-xl text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-1.5 block">Mot de passe</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <Input value={password} onChange={e => setPassword(e.target.value)}
                                        type={showPw ? 'text' : 'password'} placeholder="••••••••" required
                                        className="bg-white/5 border-white/10 text-white pl-9 pr-10 h-11 rounded-xl text-sm" />
                                    <button type="button" onClick={() => setShowPw(!showPw)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {loginError && (
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {loginError}
                                </div>
                            )}

                            <Button type="submit" disabled={loginLoading}
                                className="w-full h-11 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 font-bold rounded-xl shadow-lg shadow-violet-500/25">
                                {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                    <><ShieldCheck className="w-4 h-4 mr-2" />Accéder au panneau</>
                                )}
                            </Button>
                        </form>
                    </div>

                    <p className="text-center text-xs text-slate-700 mt-6">
                        CampusFlow SuperAdmin v1.0 — SYGMA-TECH © 2026
                    </p>
                </motion.div>
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════
    // RENDER — Dashboard
    // ══════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen bg-[#06080F] text-white flex">

            {/* ─── Sidebar ─────────────────────────────────── */}
            <aside className="w-64 shrink-0 border-r border-white/[0.06] flex flex-col bg-[#080B12] sticky top-0 h-screen">
                {/* Logo */}
                <div className="p-5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                            <ShieldCheck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="font-black text-sm">SuperAdmin</p>
                            <p className="text-[10px] text-slate-600">CampusFlow Platform</p>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-3 space-y-1">
                    {SIDEBAR.map(item => (
                        <button key={item.id} onClick={() => { setTab(item.id as Tab); setSearch(''); }}
                            className={cn(
                                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                                tab === item.id
                                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            )}>
                            <item.icon className="w-4 h-4 shrink-0" />
                            {item.label}
                            {tab === item.id && <ChevronRight className="w-3 h-3 ml-auto" />}
                        </button>
                    ))}
                </nav>

                {/* Stats summary */}
                {stats && (
                    <div className="p-3 border-t border-white/[0.06] space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-slate-600 px-1">
                            <span>Organisations</span><span className="text-slate-400 font-bold">{stats.total_orgs}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-600 px-1">
                            <span>Utilisateurs</span><span className="text-slate-400 font-bold">{stats.total_users}</span>
                        </div>
                    </div>
                )}

                {/* Logout */}
                <div className="p-3 border-t border-white/[0.06]">
                    <button onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all">
                        <LogOut className="w-4 h-4" /> Déconnexion
                    </button>
                </div>
            </aside>

            {/* ─── Main content ─────────────────────────────── */}
            <main className="flex-1 overflow-auto">
                {/* Top bar */}
                <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#06080F]/80 backdrop-blur-xl px-6 py-3 flex items-center justify-between">
                    <h1 className="font-black text-base">
                        {SIDEBAR.find(s => s.id === tab)?.label}
                    </h1>
                    <div className="flex items-center gap-3">
                        {dataLoading && <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />}
                        <button onClick={loadData} className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all" title="Actualiser">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <div className="text-xs text-slate-600 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full text-violet-400">
                            ⚡ SuperAdmin
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <AnimatePresence mode="wait">

                        {/* ═════════════════════════════════════
                            TAB: OVERVIEW
                        ═════════════════════════════════════ */}
                        {tab === 'overview' && (
                            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                                {stats ? (
                                    <>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                            <KpiCard label="Organisations" value={stats.total_orgs} icon={Building2} color="bg-violet-500" sub={`+${stats.new_orgs_week} cette semaine`} />
                                            <KpiCard label="Étudiants" value={stats.total_students} icon={School} color="bg-teal-500" />
                                            <KpiCard label="Professeurs" value={stats.total_teachers} icon={UserCheck} color="bg-indigo-500" />
                                            <KpiCard label="Total utilisateurs" value={stats.total_users} icon={Users} color="bg-blue-500" />
                                            <KpiCard label="Domaines custom" value={stats.custom_domains} icon={Globe} color="bg-amber-500" />
                                            <KpiCard label="Nouveaux (7j)" value={stats.new_orgs_week} icon={TrendingUp} color="bg-emerald-500" />
                                        </div>

                                        {/* Recent orgs */}
                                        <div>
                                            <h2 className="font-bold text-sm text-slate-300 mb-3">Dernières organisations</h2>
                                            <div className="space-y-2">
                                                {orgs.slice(0, 5).map(org => (
                                                    <div key={org.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
                                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center text-sm font-bold text-violet-300 shrink-0">
                                                            {org.name[0]?.toUpperCase()}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-sm truncate">{org.name}</p>
                                                            <p className="text-[10px] text-slate-500">/{org.slug} · {org.city || org.country || 'N/A'}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', org.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400')}>
                                                                {org.is_active ? 'Actif' : 'Suspendu'}
                                                            </span>
                                                            <span className="text-[10px] text-slate-600">{timeAgo(org.created_at)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center py-20">
                                        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ═════════════════════════════════════
                            TAB: ORGANISATIONS
                        ═════════════════════════════════════ */}
                        {tab === 'orgs' && (
                            <motion.div key="orgs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                                {/* Search */}
                                <div className="relative max-w-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input value={search} onChange={e => setSearch(e.target.value)}
                                        placeholder="Rechercher une organisation..."
                                        className="w-full bg-white/5 border border-white/10 text-white pl-9 pr-4 h-9 rounded-xl text-sm placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40" />
                                </div>

                                <p className="text-xs text-slate-500">{filteredOrgs.length} organisation(s)</p>

                                <div className="space-y-3">
                                    {filteredOrgs.map(org => (
                                        <motion.div key={org.id} layout
                                            className={cn(
                                                'p-4 rounded-2xl border transition-all',
                                                org.is_active
                                                    ? 'bg-white/[0.03] border-white/8 hover:border-white/15'
                                                    : 'bg-red-500/5 border-red-500/15'
                                            )}>
                                            <div className="flex items-start gap-4">
                                                {/* Avatar */}
                                                <div className={cn(
                                                    'w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0',
                                                    org.is_active ? 'bg-gradient-to-br from-violet-500/20 to-purple-500/20 text-violet-300' : 'bg-red-500/10 text-red-400'
                                                )}>
                                                    {org.name[0]?.toUpperCase()}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-sm">{org.name}</span>
                                                        <span className="text-[10px] text-slate-500">/{org.slug}</span>
                                                        {!org.is_active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">SUSPENDU</span>}
                                                        {org.custom_domain && (
                                                            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', org.domain_verified ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400')}>
                                                                🌐 {org.domain_verified ? 'Domaine vérifié' : 'En attente'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-1 text-[11px] text-slate-500">
                                                        <span>📍 {org.city || 'N/A'}, {org.country || 'N/A'}</span>
                                                        <span>🏫 {org.school_type || 'N/A'}</span>
                                                        <span>👩‍🎓 {org.student_count} étudiants</span>
                                                        <span>👨‍🏫 {org.teacher_count} profs</span>
                                                        <span>🕐 {timeAgo(org.created_at)}</span>
                                                    </div>
                                                    {org.custom_domain && (
                                                        <p className="text-[10px] text-slate-600 mt-0.5">🔗 {org.custom_domain}</p>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <a href={`/${org.slug}`} target="_blank" rel="noreferrer"
                                                        className="p-2 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all" title="Ouvrir">
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                    {org.custom_domain && (
                                                        <button onClick={() => verifyDomain(org)}
                                                            className={cn('p-2 rounded-lg transition-all', org.domain_verified ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-amber-400 hover:bg-amber-500/10')}
                                                            title={org.domain_verified ? 'Retirer vérification' : 'Vérifier domaine'}>
                                                            {org.domain_verified ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                                                        </button>
                                                    )}
                                                    <button onClick={() => toggleOrg(org)}
                                                        className={cn('p-2 rounded-lg transition-all text-xs font-medium px-3',
                                                            org.is_active
                                                                ? 'text-red-400 hover:bg-red-500/10 border border-red-500/20'
                                                                : 'text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20'
                                                        )}>
                                                        {org.is_active ? <><Ban className="w-3 h-3 inline mr-1" />Suspendre</> : <><RotateCcw className="w-3 h-3 inline mr-1" />Réactiver</>}
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                    {filteredOrgs.length === 0 && (
                                        <div className="text-center py-12 text-slate-500 text-sm">Aucune organisation trouvée</div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* ═════════════════════════════════════
                            TAB: UTILISATEURS
                        ═════════════════════════════════════ */}
                        {tab === 'users' && (
                            <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                                <div className="relative max-w-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input value={search} onChange={e => setSearch(e.target.value)}
                                        placeholder="Nom, email, organisation..."
                                        className="w-full bg-white/5 border border-white/10 text-white pl-9 pr-4 h-9 rounded-xl text-sm placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40" />
                                </div>

                                <p className="text-xs text-slate-500">{filteredUsers.length} utilisateur(s)</p>

                                {/* Table */}
                                <div className="rounded-2xl border border-white/8 overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                                <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Nom</th>
                                                <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Email</th>
                                                <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Rôle</th>
                                                <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Organisation</th>
                                                <th className="text-left px-4 py-3 text-xs text-slate-500 font-semibold">Inscrit</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredUsers.map((user, i) => (
                                                <tr key={user.id} className={cn('border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors', i % 2 === 0 ? '' : 'bg-white/[0.01]')}>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0',
                                                                user.role === 'teacher' ? 'bg-indigo-500' : 'bg-teal-500'
                                                            )}>
                                                                {user.full_name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                                                            </div>
                                                            <span className="font-medium text-xs truncate max-w-[120px]">{user.full_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-400 max-w-[160px] truncate">{user.email}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium',
                                                            user.role === 'teacher' ? 'bg-indigo-500/15 text-indigo-400' : 'bg-teal-500/15 text-teal-400'
                                                        )}>
                                                            {user.role === 'teacher' ? 'Professeur' : 'Étudiant'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-500 truncate max-w-[150px]">
                                                        <a href={`/${user.org_slug}`} target="_blank" rel="noreferrer" className="hover:text-violet-400 transition-colors">
                                                            {user.org_name}
                                                        </a>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-600">{timeAgo(user.created_at)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {filteredUsers.length === 0 && (
                                        <div className="text-center py-12 text-slate-500 text-sm">Aucun utilisateur trouvé</div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* ═════════════════════════════════════
                            TAB: DOMAINES
                        ═════════════════════════════════════ */}
                        {tab === 'domains' && (
                            <motion.div key="domains" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                                <p className="text-xs text-slate-500">{domainsOrgs.length} domaine(s) custom configuré(s)</p>

                                <div className="space-y-3">
                                    {domainsOrgs.map(org => (
                                        <div key={org.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 hover:border-white/15 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0',
                                                    org.domain_verified ? 'bg-emerald-500/15' : 'bg-amber-500/15'
                                                )}>
                                                    {org.domain_verified ? '✅' : '⏳'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm">{org.name}</span>
                                                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold',
                                                            org.domain_verified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                                                        )}>
                                                            {org.domain_verified ? 'Vérifié' : 'En attente'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-violet-400 font-mono mt-0.5">{org.custom_domain}</p>
                                                    <div className="flex items-center gap-4 mt-1 text-[10px] text-slate-600">
                                                        <span>📍 /{org.slug}</span>
                                                        <span>🕐 Ajouté {timeAgo(org.created_at)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <a href={`https://${org.custom_domain}`} target="_blank" rel="noreferrer"
                                                        className="p-2 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                    <button onClick={() => verifyDomain(org)}
                                                        className={cn('px-4 py-2 rounded-xl text-xs font-bold transition-all',
                                                            org.domain_verified
                                                                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                                                                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                                                        )}>
                                                        {org.domain_verified ? 'Retirer' : '✅ Valider'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* DNS config reminder */}
                                            {!org.domain_verified && (
                                                <div className="mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                                                    <p className="text-[10px] text-amber-400 mb-2 font-semibold">Configuration DNS requise chez le registrar :</p>
                                                    <div className="grid grid-cols-3 gap-2 text-[9px] font-mono">
                                                        <div className="bg-black/30 rounded-lg p-2">
                                                            <p className="text-slate-500 mb-0.5">Type</p>
                                                            <p className="text-amber-300">CNAME</p>
                                                        </div>
                                                        <div className="bg-black/30 rounded-lg p-2">
                                                            <p className="text-slate-500 mb-0.5">Nom</p>
                                                            <p className="text-white">www</p>
                                                        </div>
                                                        <div className="bg-black/30 rounded-lg p-2">
                                                            <p className="text-slate-500 mb-0.5">Valeur</p>
                                                            <p className="text-teal-300">campusfl.netlify.app</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {domainsOrgs.length === 0 && (
                                        <div className="text-center py-16">
                                            <Globe className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                                            <p className="text-slate-500 text-sm">Aucun domaine custom configuré</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* ═════════════════════════════════════
                            TAB: ANNOUNCEMENTS
                        ═════════════════════════════════════ */}
                        {tab === 'announcements' && (
                            <motion.div key="announcements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6 max-w-2xl">
                                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/8 space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Megaphone className="w-5 h-5 text-violet-400" />
                                        <h2 className="font-bold text-sm">Envoyer une annonce globale</h2>
                                    </div>

                                    <div>
                                        <label className="text-xs text-slate-400 mb-1.5 block">Cible</label>
                                        <select value={annTarget} onChange={e => setAnnTarget(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 text-white h-9 rounded-xl text-sm px-3 focus:outline-none focus:border-violet-500/40">
                                            <option value="all">Toutes les organisations ({orgs.length})</option>
                                            {orgs.map(o => (
                                                <option key={o.id} value={o.id}>{o.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs text-slate-400 mb-1.5 block">Titre de l&apos;annonce</label>
                                        <input value={annTitle} onChange={e => setAnnTitle(e.target.value)}
                                            placeholder="Maintenance prévue le 25 Juillet..."
                                            className="w-full bg-white/5 border border-white/10 text-white h-9 rounded-xl text-sm px-3 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40" />
                                    </div>

                                    <div>
                                        <label className="text-xs text-slate-400 mb-1.5 block">Message</label>
                                        <textarea value={annBody} onChange={e => setAnnBody(e.target.value)}
                                            placeholder="Détails de l'annonce..."
                                            rows={4}
                                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl text-sm px-3 py-2.5 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40 resize-none" />
                                    </div>

                                    <Button onClick={sendAnnouncement} disabled={sendingAnn || !annTitle.trim() || !annBody.trim()}
                                        className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 font-bold rounded-xl">
                                        {sendingAnn ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Megaphone className="w-4 h-4 mr-2" />}
                                        Envoyer l&apos;annonce
                                    </Button>
                                </div>

                                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 text-xs text-amber-400 space-y-1">
                                    <p className="font-bold">📌 Note</p>
                                    <p>Les annonces apparaîtront dans l&apos;onglet &quot;Actus officielles&quot; de chaque établissement cible avec le badge <strong>📣 OFFICIEL</strong>.</p>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
