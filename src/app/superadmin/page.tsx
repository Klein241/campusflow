'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Building2, Users, Globe, Megaphone,
    LogOut, Search, CheckCircle2, Eye, EyeOff, Trash2,
    ShieldCheck, Loader2, TrendingUp, RefreshCw,
    ChevronRight, AlertTriangle, Ban, RotateCcw, ExternalLink,
    Mail, Lock, School, UserCheck, Activity,
    BarChart3, Zap, Clock, CheckSquare, Star, Plus, Minus, Menu, X,
    MessageSquare, Send, Crown, CreditCard,
    Image as ImageIcon, Video as VideoIcon, Link as LinkIcon, Target, Gift, Copy, Sparkles, Coins, Bug, Bot
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { uploadToR2 } from '@/lib/r2';
import { SuperadminStylesPricing } from '@/components/superadmin/superadmin-styles-pricing';
import { SuperadminOrgCards } from '@/components/superadmin/superadmin-org-cards';
import { SuperadminNotificationBell } from '@/components/superadmin/SuperadminNotificationBell';
import { IziTeachLogo } from '@/components/brand/iziteach-logo';
import { SkyAgentSuperadminManager } from '@/components/superadmin/SkyAgentSuperadminManager';
import { DameSkySuperadminManager } from '@/components/superadmin/DameSkySuperadminManager';
import { MarketingHub } from '@/components/superadmin/marketing/MarketingHub';

// ═══════════════════════════════════════════════════════════════════════
// IZITEACH — SUPERADMIN PANEL
// Platform-level administration dashboard
// Protected by platform_admins table (Supabase Auth + RLS)
// ═══════════════════════════════════════════════════════════════════════

type Tab = 'overview' | 'orgs' | 'users' | 'domains' | 'announcements' | 'points' | 'pricing' | 'requests' | 'ads' | 'marketing' | 'email' | 'bugs' | 'compte' | 'sky_agent';

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

interface ActivityItem {
    type: 'org' | 'student' | 'teacher';
    label: string;
    meta: string;
    created_at: string;
}

const SIDEBAR: { id: Tab; label: string; icon: any; emoji?: string }[] = [
    { id: 'overview',       label: 'Vue d\'ensemble',  icon: LayoutDashboard, emoji: '📊' },
    { id: 'orgs',           label: 'Organisations',    icon: Building2,       emoji: '🏫' },
    { id: 'users',          label: 'Utilisateurs',     icon: Users,           emoji: '👥' },
    { id: 'points',         label: 'Sky Points',       icon: Star,            emoji: '⭐' },
    { id: 'pricing',        label: 'Tarifs Styles',    icon: Sparkles,        emoji: '✨' },
    { id: 'requests',       label: 'Demandes',         icon: MessageSquare,   emoji: '💬' },
    { id: 'bugs',           label: 'Bugs & Rapports',  icon: Bug,             emoji: '🐛' },
    { id: 'ads',            label: 'Publicités',       icon: Target,          emoji: '📺' },
    { id: 'marketing',      label: 'Marketing & IA',   icon: Sparkles,        emoji: '🚀' },
    { id: 'email',          label: 'Email Providers',  icon: Mail,            emoji: '📧' },
    { id: 'domains',        label: 'Domaines',         icon: Globe,           emoji: '🌐' },
    { id: 'announcements',  label: 'Annonces',         icon: Megaphone,       emoji: '📢' },
    { id: 'sky_agent',      label: 'Dame SKY',         icon: Crown,           emoji: '👑' },
    { id: 'compte',         label: 'Mon Compte',        icon: Lock,            emoji: '🔑' },
];

function timeAgo(iso: string) {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60)    return 'À l\'instant';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}j`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── KPI Card ──────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, gradient, sub }: {
    label: string; value: number | string; icon: any;
    gradient: string; sub?: string;
}) {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="relative p-5 rounded-2xl bg-white/[0.04] border border-white/8 overflow-hidden group hover:border-white/20 transition-all duration-300 cursor-default">
            <div className={cn('absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300', gradient)} style={{ opacity: 0.04 }} />
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br', gradient)}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-black text-white">{typeof value === 'number' ? value.toLocaleString('fr-FR') : value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            {sub && <p className="text-[10px] text-emerald-500 mt-1 font-medium">{sub}</p>}
        </motion.div>
    );
}

// ─── Badge ─────────────────────────────────────────────────────────
function Badge({ active, label, activeClass, inactiveClass }: {
    active: boolean; label: [string, string];
    activeClass: string; inactiveClass: string;
}) {
    return (
        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', active ? activeClass : inactiveClass)}>
            {active ? label[0] : label[1]}
        </span>
    );
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════
export default function SuperAdminPage() {
    // ── Auth state ────────────────────────────────────────────────
    const [authStep, setAuthStep] = useState<'loading' | 'login' | 'dashboard'>('loading');
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw]     = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError]     = useState('');

    // ── Navigation ────────────────────────────────────────────────
    const [tab, setTab]         = useState<Tab>('overview');
    const [search, setSearch]   = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // ── Data ──────────────────────────────────────────────────────
    const [stats, setStats]         = useState<Stats | null>(null);
    const [orgs, setOrgs]           = useState<OrgItem[]>([]);
    const [users, setUsers]         = useState<UserItem[]>([]);
    const [activity, setActivity]   = useState<ActivityItem[]>([]);
    const [dataLoading, setDataLoading] = useState(false);

    // ── Announcement form ─────────────────────────────────────────
    const [annTitle, setAnnTitle]   = useState('');
    const [annBody, setAnnBody]     = useState('');
    const [annTarget, setAnnTarget] = useState<'all' | string>('all');
    const [annType, setAnnType]     = useState<'info' | 'warning' | 'success' | 'urgent'>('info');
    const [annList, setAnnList]     = useState<any[]>([]);
    const [annListLoading, setAnnListLoading] = useState(false);
    const [sendingAnn, setSendingAnn] = useState(false);

    // ── Confirm delete dialog ─────────────────────────────────────
    const [deleteConfirm, setDeleteConfirm] = useState<OrgItem | null>(null);
    const [deleting, setDeleting] = useState(false);

    // ── Points management ─────────────────────────────────────────
    const [pointsTabMode, setPointsTabMode] = useState<'orgs' | 'users' | 'history'>('orgs');
    const [pointsSearch, setPointsSearch]   = useState('');
    const [pointsResults, setPointsResults] = useState<any[]>([]);
    const [pointsLoading, setPointsLoading] = useState(false);
    const [pointsTarget, setPointsTarget]   = useState<any | null>(null);
    const [pointsDelta, setPointsDelta]     = useState(0);
    const [pointsNote, setPointsNote]       = useState('');
    const [pointsOrgTarget, setPointsOrgTarget] = useState<OrgItem | null>(null);
    const [pointsOrgDelta, setPointsOrgDelta]   = useState<number>(500);
    const [pointsOrgNote, setPointsOrgNote]     = useState<string>('');
    const [pointsHistory, setPointsHistory] = useState<any[]>([]);
    const [pointsHistoryLoading, setPointsHistoryLoading] = useState(false);
    const [sendingPoints, setSendingPoints] = useState(false);

    // ── Sky Requests (chat) ───────────────────────────────────────
    const [skyRequests, setSkyRequests]       = useState<any[]>([]);
    const [reqLoading, setReqLoading]         = useState(false);
    const [activeReqId, setActiveReqId]       = useState<string | null>(null);
    const [adminReply, setAdminReply]         = useState('');
    const [sendingReply, setSendingReply]     = useState(false);
    const [creditingId, setCreditingId]       = useState<string | null>(null);
    const [creditPoints, setCreditPoints]     = useState(0);
    const [reqStatusFilter, setReqStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'credited' | 'rejected'>('all');

    // ── Bug Reports ───────────────────────────────────────────────
    const [bugReports, setBugReports]         = useState<any[]>([]);
    const [bugsLoading, setBugsLoading]       = useState(false);
    const [bugStatusFilter, setBugStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
    const [selectedBug, setSelectedBug]       = useState<any | null>(null);

    // ─── Mount: check auth ───────────────────────────────────────
    useEffect(() => {
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { setAuthStep('login'); return; }

            const { data: isAdmin } = await supabase.rpc('is_platform_admin');
            if (isAdmin) {
                setAuthStep('dashboard');
                await supabase.from('platform_admins')
                    .update({ last_login: new Date().toISOString() })
                    .eq('user_id', session.user.id);
                loadAllData();
            } else {
                await supabase.auth.signOut();
                setAuthStep('login');
                setLoginError('Accès refusé — compte non autorisé.');
            }
        })();
    }, []);

    // ─── Login ───────────────────────────────────────────────────
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setLoginLoading(true);

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setLoginError(error.message);
            setLoginLoading(false);
            return;
        }

        const { data: isAdmin } = await supabase.rpc('is_platform_admin');
        if (!isAdmin) {
            await supabase.auth.signOut();
            setLoginError('Accès refusé — ce compte n\'est pas superadmin.');
            setLoginLoading(false);
            return;
        }

        setAuthStep('dashboard');
        setLoginLoading(false);
        loadAllData();
    };

    // ─── Load all data (with robust table fallback) ───────────────
    const loadAllData = useCallback(async () => {
        setDataLoading(true);
        try {
            let statsRes: any = { data: null };
            let orgsRes: any = { data: null };
            let usersRes: any = { data: null };
            let activityRes: any = { data: null };

            const settled = await Promise.allSettled([
                supabase.rpc('superadmin_get_stats'),
                supabase.rpc('superadmin_get_orgs'),
                supabase.rpc('superadmin_get_users', { p_limit: 300, p_offset: 0 }),
                supabase.rpc('superadmin_get_recent_activity'),
            ]);

            if (settled[0].status === 'fulfilled') statsRes = settled[0].value;
            if (settled[1].status === 'fulfilled') orgsRes = settled[1].value;
            if (settled[2].status === 'fulfilled') usersRes = settled[2].value;
            if (settled[3].status === 'fulfilled') activityRes = settled[3].value;

            // 1. Process or Fallback Organizations
            let finalOrgs: OrgItem[] = (orgsRes?.data as OrgItem[]) || [];
            if (!finalOrgs || finalOrgs.length === 0) {
                const { data: directOrgs } = await supabase
                    .from('organizations')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (directOrgs && directOrgs.length > 0) {
                    const { data: allStudents } = await supabase.from('student_profiles').select('id, organization_id');
                    const { data: allTeachers } = await supabase.from('teacher_profiles').select('id, organization_id');

                    finalOrgs = directOrgs.map(o => ({
                        id: o.id,
                        name: o.name,
                        slug: o.slug,
                        school_type: o.school_type || o.type || 'École',
                        city: o.city || '',
                        country: o.country || 'Cameroun',
                        custom_domain: o.custom_domain,
                        domain_verified: !!o.domain_verified,
                        is_active: o.is_active !== false,
                        created_at: o.created_at,
                        logo_url: o.logo_url,
                        student_count: (allStudents || []).filter(s => s.organization_id === o.id).length,
                        teacher_count: (allTeachers || []).filter(t => t.organization_id === o.id).length,
                        sky_points: o.sky_points || 0,
                        phone: o.phone || '',
                        email: o.email || '',
                        brand_color: o.brand_color || '',
                        // Badge certification
                        certification_badge: o.certification_badge || 'none',
                        badge_title: o.badge_title || null,
                        is_online_academy: !!o.is_online_academy,
                        verification_docs: o.verification_docs || [],
                    }));
                }
            }
            setOrgs(finalOrgs);

            // 2. Process or Fallback Users
            let finalUsers: UserItem[] = (usersRes?.data as UserItem[]) || [];
            if (!finalUsers || finalUsers.length === 0) {
                const { data: stuList } = await supabase.from('student_profiles').select('id, first_name, last_name, email, created_at, organization_id');
                const { data: profList } = await supabase.from('teacher_profiles').select('id, first_name, last_name, email, created_at, organization_id');
                const orgMap = new Map((finalOrgs || []).map(o => [o.id, o]));

                const mappedStudents: UserItem[] = (stuList || []).map(s => ({
                    id: s.id,
                    full_name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Étudiant',
                    email: s.email || '',
                    role: 'student',
                    org_name: orgMap.get(s.organization_id)?.name || 'Organisation',
                    org_slug: orgMap.get(s.organization_id)?.slug || '',
                    created_at: s.created_at || new Date().toISOString(),
                }));

                const mappedTeachers: UserItem[] = (profList || []).map(t => ({
                    id: t.id,
                    full_name: `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Professeur',
                    email: t.email || '',
                    role: 'teacher',
                    org_name: orgMap.get(t.organization_id)?.name || 'Organisation',
                    org_slug: orgMap.get(t.organization_id)?.slug || '',
                    created_at: t.created_at || new Date().toISOString(),
                }));

                finalUsers = [...mappedStudents, ...mappedTeachers];
            }
            setUsers(finalUsers);

            // 3. Process or Fallback Stats
            if (statsRes?.data) {
                setStats(statsRes.data as Stats);
            } else {
                setStats({
                    total_orgs: finalOrgs.length,
                    total_students: finalUsers.filter(u => u.role === 'student').length,
                    total_teachers: finalUsers.filter(u => u.role === 'teacher').length,
                    total_users: finalUsers.length,
                    custom_domains: finalOrgs.filter(o => o.custom_domain).length,
                    new_orgs_week: finalOrgs.filter(o => (Date.now() - new Date(o.created_at).getTime()) < 7 * 86400000).length,
                });
            }

            if (activityRes?.data) setActivity(activityRes.data as ActivityItem[]);
        } catch (e: any) {
            toast.error('Erreur chargement: ' + (e.message ?? 'inconnue'));
        }
        setDataLoading(false);
    }, []);

    // ─── Actions ─────────────────────────────────────────────────
    const toggleOrg = async (org: OrgItem) => {
        const next = !org.is_active;
        const { error } = await supabase.rpc('superadmin_toggle_org', { p_org_id: org.id, p_active: next });
        if (error) { toast.error(error.message); return; }
        setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, is_active: next } : o));
        toast.success(next ? `✅ ${org.name} réactivée` : `🚫 ${org.name} suspendue`);
    };

    const verifyDomain = async (org: OrgItem) => {
        const next = !org.domain_verified;
        const { error } = await supabase.rpc('superadmin_verify_domain', { p_org_id: org.id, p_verified: next });
        if (error) { toast.error(error.message); return; }
        setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, domain_verified: next } : o));
        toast.success(next ? `🌐 Domaine "${org.custom_domain}" vérifié ✅` : `❌ Vérification retirée`);
    };

    const handleDeleteOrg = async () => {
        if (!deleteConfirm) return;
        setDeleting(true);
        const { error } = await supabase.rpc('superadmin_delete_org', { p_org_id: deleteConfirm.id });
        if (error) { toast.error(error.message); setDeleting(false); return; }
        setOrgs(prev => prev.filter(o => o.id !== deleteConfirm.id));
        toast.success(`🗑️ Organisation "${deleteConfirm.name}" supprimée`);
        setDeleteConfirm(null);
        setDeleting(false);
        loadAllData(); // refresh stats
    };

    // ─── Announcements Handlers ──────────────────────────────────
    const loadAnnouncementsHistory = useCallback(async () => {
        setAnnListLoading(true);
        try {
            const { data } = await supabase
                .from('superadmin_announcements')
                .select('*')
                .order('created_at', { ascending: false });
            if (data && data.length > 0) {
                setAnnList(data);
            } else {
                const { data: directAnn } = await supabase
                    .from('announcements')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(50);
                if (directAnn) {
                    setAnnList(directAnn.map(a => ({
                        id: a.id,
                        title: a.title,
                        body: a.content || a.body || '',
                        target_type: a.organization_id ? 'org' : 'all',
                        target_org_id: a.organization_id,
                        target_org_name: orgs.find(o => o.id === a.organization_id)?.name || 'Établissement',
                        ann_type: 'info',
                        sent_to_count: 1,
                        created_at: a.created_at,
                    })));
                }
            }
        } catch {}
        setAnnListLoading(false);
    }, [orgs]);

    const sendAnnouncement = async () => {
        if (!annTitle.trim() || !annBody.trim()) {
            toast.error('Titre et message requis');
            return;
        }
        setSendingAnn(true);
        try {
            const targetOrg = orgs.find(o => o.id === annTarget);
            const targetName = annTarget === 'all' ? 'Tous les établissements' : targetOrg?.name || 'Établissement';

            // 1. Try RPC
            try {
                await supabase.rpc('superadmin_send_announcement', {
                    p_title:  annTitle.trim(),
                    p_body:   annBody.trim(),
                    p_org_id: annTarget === 'all' ? null : annTarget,
                });
            } catch {}

            // 2. Insert into superadmin_announcements history table
            try {
                await supabase.from('superadmin_announcements').insert({
                    title: annTitle.trim(),
                    body: annBody.trim(),
                    target_type: annTarget === 'all' ? 'all' : 'org',
                    target_org_id: annTarget === 'all' ? null : annTarget,
                    target_org_name: targetName,
                    ann_type: annType,
                    sent_to_count: annTarget === 'all' ? orgs.length : 1,
                });
            } catch {}

            // 3. Insert into announcements for target orgs
            if (annTarget === 'all') {
                for (const org of orgs) {
                    try {
                        await supabase.from('announcements').insert({
                            organization_id: org.id,
                            title: `📣 ${annTitle.trim()}`,
                            content: annBody.trim(),
                            body: annBody.trim(),
                            type: 'official',
                        });
                    } catch {}
                }
            } else {
                try {
                    await supabase.from('announcements').insert({
                        organization_id: annTarget,
                        title: `📣 ${annTitle.trim()}`,
                        content: annBody.trim(),
                        body: annBody.trim(),
                        type: 'official',
                    });
                } catch {}
            }

            toast.success(`📢 Annonce envoyée avec succès à ${annTarget === 'all' ? orgs.length + ' établissement(s)' : targetName} !`);
            setAnnTitle('');
            setAnnBody('');
            setAnnTarget('all');
            loadAnnouncementsHistory();
        } catch (err: any) {
            toast.error('Erreur envoi: ' + err.message);
        } finally {
            setSendingAnn(false);
        }
    };

    const deleteAnnouncement = async (id: string) => {
        try {
            await supabase.from('superadmin_announcements').delete().eq('id', id);
            await supabase.from('announcements').delete().eq('id', id);
            setAnnList(prev => prev.filter(a => a.id !== id));
            toast.success('Annonce supprimée');
        } catch (e: any) {
            toast.error('Erreur: ' + e.message);
        }
    };

    // ─── Points History ───────────────────────────────────────────
    const loadPointsHistory = useCallback(async () => {
        setPointsHistoryLoading(true);
        try {
            const { data } = await supabase
                .from('sky_points_transactions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200);
            if (data) setPointsHistory(data);
        } catch {}
        setPointsHistoryLoading(false);
    }, []);

    // ─── Bug Reports Handlers ─────────────────────────────────────
    const loadBugReports = useCallback(async () => {
        setBugsLoading(true);
        try {
            const { data } = await supabase
                .from('bug_reports')
                .select('*')
                .order('created_at', { ascending: false });
            if (data) setBugReports(data);
        } catch {}
        setBugsLoading(false);
    }, []);

    const updateBugStatus = async (bugId: string, nextStatus: string, adminNote?: string) => {
        try {
            const { error } = await supabase
                .from('bug_reports')
                .update({ status: nextStatus, admin_note: adminNote || null })
                .eq('id', bugId);
            if (error) throw error;
            setBugReports(prev => prev.map(b => b.id === bugId ? { ...b, status: nextStatus, admin_note: adminNote } : b));
            toast.success(`Statut du bug mis à jour : ${nextStatus}`);
        } catch (e: any) {
            toast.error('Erreur : ' + e.message);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setAuthStep('login');
        setStats(null); setOrgs([]); setUsers([]); setActivity([]);
        setEmail(''); setPassword('');
    };

    // ─── Sky Requests loader (poll) ────────────────────────────────
    const loadSkyRequests = async () => {
        setReqLoading(true);
        const { data, error } = await supabase
            .from('sky_point_requests')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        if (!error && data) setSkyRequests(data);
        setReqLoading(false);
    };

    useEffect(() => {
        if (authStep !== 'dashboard') return;
        if (tab === 'requests') {
            loadSkyRequests();
            const interval = setInterval(loadSkyRequests, 5000);
            return () => clearInterval(interval);
        }
        if (tab === 'announcements') loadAnnouncementsHistory();
        if (tab === 'points') loadPointsHistory();
        if (tab === 'bugs') loadBugReports();
    }, [tab, authStep, loadAnnouncementsHistory, loadPointsHistory, loadBugReports]);

    const adminReplyRequest = async (reqId: string) => {
        if (!adminReply.trim()) return;
        setSendingReply(true);
        const { error } = await supabase
            .from('sky_point_requests')
            .update({
                response: adminReply.trim(),
                responded_at: new Date().toISOString(),
                status: 'confirmed',
            })
            .eq('id', reqId);
        if (error) {
            toast.error('Erreur: ' + error.message);
        } else {
            toast.success('✅ Réponse envoyée');
            setAdminReply('');
            setActiveReqId(null);
            await loadSkyRequests();
        }
        setSendingReply(false);
    };

    const adminCreditRequest = async (req: any) => {
        if (!creditPoints || creditPoints <= 0) return;
        setCreditingId(req.id);
        const { error } = await supabase.rpc('superadmin_credit_sky_request', {
            p_request_id: req.id,
            p_user_id: req.user_id,
            p_role: req.user_role || 'student',
            p_points: creditPoints,
            p_response: `✅ ${creditPoints} Sky Points crédités sur votre compte ! Merci 🎉`,
        });

        // Record in transactions history
        try {
            await supabase.from('sky_points_transactions').insert({
                to_entity_type: 'user',
                to_entity_id: req.user_id,
                to_entity_name: req.user_name,
                org_name: req.org_slug || 'Utilisateur',
                amount: creditPoints,
                note: `Achat Pack ${req.pack_name || 'Sky Points'}`,
                performed_by: 'superadmin',
            });
        } catch {}

        if (error) {
            toast.error('Erreur crédit: ' + error.message);
        } else {
            toast.success(`⭐ ${creditPoints} pts crédités à ${req.user_name}`);
            setCreditPoints(0);
            setCreditingId(null);
            setActiveReqId(null);
            await loadSkyRequests();
            loadPointsHistory();
        }
        setCreditingId(null);
    };

    // ─── Points search ────────────────────────────────────────────
    const searchForPoints = async () => {
        if (!pointsSearch.trim()) return;
        setPointsLoading(true);
        const { data, error } = await supabase.rpc('superadmin_search_users', {
            p_query: pointsSearch.trim()
        });
        if (error) {
            toast.error('Erreur recherche: ' + error.message);
            setPointsResults([]);
        } else {
            setPointsResults(data as any[] || []);
        }
        setPointsLoading(false);
    };

    const applyPoints = async () => {
        if (!pointsTarget || pointsDelta === 0) return;
        setSendingPoints(true);
        const newBalance = Math.max(0, (pointsTarget.sky_points || 0) + pointsDelta);
        const { data, error } = await supabase.rpc('superadmin_update_sky_points', {
            p_user_id:    pointsTarget.id,
            p_role:       pointsTarget.role,
            p_new_balance: newBalance,
            p_delta:      pointsDelta,
            p_note:       pointsNote || null
        });

        // Record in transactions history
        try {
            await supabase.from('sky_points_transactions').insert({
                to_entity_type: 'user',
                to_entity_id: pointsTarget.id,
                to_entity_name: `${pointsTarget.first_name || ''} ${pointsTarget.last_name || ''}`.trim(),
                org_name: pointsTarget.org_name || 'Utilisateur',
                amount: pointsDelta,
                note: pointsNote || 'Ajustement manuel Superadmin',
                performed_by: 'superadmin',
            });
        } catch {}

        if (error || (data && data.success === false)) {
            toast.error('Erreur: ' + (error?.message || data?.error || 'Inconnue'));
        } else {
            const sign = pointsDelta > 0 ? '+' : '';
            toast.success(`⭐ ${sign}${pointsDelta} pts → ${pointsTarget.first_name} ${pointsTarget.last_name} (solde: ${newBalance})`);
            setPointsTarget({ ...pointsTarget, sky_points: newBalance });
            setPointsResults(prev => prev.map(u => u.id === pointsTarget.id ? { ...u, sky_points: newBalance } : u));
            setPointsDelta(0);
            setPointsNote('');
            loadPointsHistory();
        }
        setSendingPoints(false);
    };

    const applyOrgPoints = async () => {
        if (!pointsOrgTarget || pointsOrgDelta === 0) return;
        setSendingPoints(true);
        try {
            const current = (pointsOrgTarget as any).sky_points || 0;
            const newBalance = Math.max(0, current + pointsOrgDelta);
            const { error } = await supabase
                .from('organizations')
                .update({ sky_points: newBalance })
                .eq('id', pointsOrgTarget.id);

            // Record in transactions history
            try {
                await supabase.from('sky_points_transactions').insert({
                    to_entity_type: 'org',
                    to_entity_id: pointsOrgTarget.id,
                    to_entity_name: pointsOrgTarget.name,
                    org_name: pointsOrgTarget.name,
                    amount: pointsOrgDelta,
                    note: pointsOrgNote || 'Recharge Superadmin Établissement',
                    performed_by: 'superadmin',
                });
            } catch {}

            if (error) {
                toast.error('Erreur Supabase: ' + error.message);
            } else {
                const sign = pointsOrgDelta > 0 ? '+' : '';
                toast.success(`⭐ ${sign}${pointsOrgDelta.toLocaleString('fr-FR')} Sky Points envoyés à ${pointsOrgTarget.name} (Solde: ${newBalance.toLocaleString('fr-FR')} pts)`);
                setOrgs(prev => prev.map(o => o.id === pointsOrgTarget.id ? { ...o, sky_points: newBalance } : o));
                setPointsOrgTarget({ ...pointsOrgTarget, sky_points: newBalance } as any);
                setPointsOrgNote('');
                loadPointsHistory();
            }
        } catch (e: any) {
            toast.error('Erreur: ' + e.message);
        } finally {
            setSendingPoints(false);
        }
    };

    // ─── Filtered lists (null-safe to prevent TypeError crashes) ─────
    const q = (search || '').toLowerCase().trim();
    const filteredOrgs = (orgs || []).filter(o => {
        if (!o) return false;
        return (
            (o.name || '').toLowerCase().includes(q) ||
            (o.slug || '').toLowerCase().includes(q) ||
            (o.city || '').toLowerCase().includes(q) ||
            (o.school_type || '').toLowerCase().includes(q) ||
            (o.custom_domain || '').toLowerCase().includes(q)
        );
    });
    const filteredUsers = (users || []).filter(u => {
        if (!u) return false;
        return (
            (u.full_name || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q) ||
            (u.org_name || '').toLowerCase().includes(q)
        );
    });
    const domainsOrgs = (orgs || []).filter(o => o && o.custom_domain);
    const pendingDomains = domainsOrgs.filter(o => !o.domain_verified);

    // ══════════════════════════════════════════════════════════════
    // RENDER — Loading
    // ══════════════════════════════════════════════════════════════
    if (authStep === 'loading') {
        return (
            <div className="min-h-screen bg-[#06080F] flex items-center justify-center">
                <div className="text-center">
                    <IziTeachLogo variant="symbol" size="xl" className="mx-auto mb-4 animate-pulse" />
                    <Loader2 className="w-5 h-5 text-violet-400 animate-spin mx-auto" />
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════
    // RENDER — Login
    // ══════════════════════════════════════════════════════════════
    if (authStep === 'login') {
        return (
            <div className="min-h-screen bg-[#06080F] flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-violet-600/12 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-purple-700/8 rounded-full blur-[80px] pointer-events-none" />

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md relative z-10">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="mx-auto mb-5 flex justify-center"
                        >
                            <IziTeachLogo variant="symbol" size="xl" />
                        </motion.div>
                        <h1 className="text-3xl font-black bg-gradient-to-r from-violet-400 via-cyan-400 to-fuchsia-400 bg-clip-text text-transparent tracking-tight">IziTeach</h1>
                        <p className="text-sm text-slate-400 mt-1 font-medium">SuperAdmin Panel</p>
                        <p className="text-xs text-slate-600 mt-1">R&apos;eserv&apos; à l&apos;&eacute;quipe SYGMA-TECH</p>
                    </div>

                    {/* Form card */}
                    <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Adresse email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <Input value={email} onChange={e => setEmail(e.target.value)}
                                        type="email" placeholder="admin@sygma-tech.com" required autoComplete="email"
                                        className="bg-white/5 border-white/10 text-white pl-9 h-11 rounded-xl text-sm focus-visible:border-violet-500/50" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Mot de passe</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <Input value={password} onChange={e => setPassword(e.target.value)}
                                        type={showPw ? 'text' : 'password'} placeholder="••••••••" required autoComplete="current-password"
                                        className="bg-white/5 border-white/10 text-white pl-9 pr-10 h-11 rounded-xl text-sm focus-visible:border-violet-500/50" />
                                    <button type="button" onClick={() => setShowPw(!showPw)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <AnimatePresence>
                                {loginError && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                        className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {loginError}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <Button type="submit" disabled={loginLoading}
                                className="w-full h-11 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 font-bold rounded-xl shadow-lg shadow-violet-500/30 transition-all">
                                {loginLoading
                                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Vérification...</>
                                    : <><ShieldCheck className="w-4 h-4 mr-2" />Accéder au panneau</>
                                }
                            </Button>
                        </form>
                    </div>

                    <p className="text-center text-xs text-slate-700 mt-6">
                        IziTeach SuperAdmin · SYGMA-TECH © 2026
                    </p>
                </motion.div>
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════
    // RENDER — Dashboard
    // ══════════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen bg-[#06080F] text-white flex">

            {/* ─── Sidebar (desktop only) ──────────────────────── */}
            <aside className="hidden md:flex w-60 shrink-0 border-r border-white/[0.06] flex-col bg-[#080B12] sticky top-0 h-screen">
                {/* Brand */}
                <div className="p-4 border-b border-white/[0.06]">
                    <IziTeachLogo variant="compact" size="sm" />
                    <p className="text-[9px] text-slate-600 leading-tight mt-0.5 pl-1">SuperAdmin Platform</p>
                </div>

                {/* Nav links */}
                <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
                    {SIDEBAR.map(item => (
                        <button key={item.id}
                            onClick={() => { setTab(item.id); setSearch(''); }}
                            className={cn(
                                'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                                tab === item.id
                                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/25 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                            )}>
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span className="flex-1 text-left text-xs">{item.label}</span>
                            {tab === item.id && <ChevronRight className="w-3 h-3 text-violet-400" />}
                            {item.id === 'domains' && pendingDomains.length > 0 && (
                                <span className="w-4 h-4 rounded-full bg-amber-500 text-[9px] font-black text-black flex items-center justify-center">
                                    {pendingDomains.length}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Quick stats */}
                {stats && (
                    <div className="p-3 border-t border-white/[0.05] space-y-1.5">
                        {[
                            { label: 'Organisations', value: stats.total_orgs, color: 'text-violet-400' },
                            { label: 'Utilisateurs',  value: stats.total_users, color: 'text-teal-400' },
                            { label: 'Domaines',      value: stats.custom_domains, color: 'text-amber-400' },
                        ].map(s => (
                            <div key={s.label} className="flex items-center justify-between px-1">
                                <span className="text-[10px] text-slate-600">{s.label}</span>
                                <span className={cn('text-[10px] font-black', s.color)}>{s.value}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Logout */}
                <div className="p-2 border-t border-white/[0.05]">
                    <button onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all">
                        <LogOut className="w-3.5 h-3.5" /> Déconnexion
                    </button>
                </div>
            </aside>

            {/* ─── Mobile slide-out sidebar ─────────────────────── */}
            <AnimatePresence>
                {sidebarOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 z-40 md:hidden"
                            onClick={() => setSidebarOpen(false)} />
                        <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="fixed left-0 top-0 bottom-0 w-72 bg-[#080B12] border-r border-white/[0.08] z-50 flex flex-col md:hidden">
                            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <IziTeachLogo variant="compact" size="sm" />
                                    <p className="text-[9px] text-slate-500">SuperAdmin</p>
                                </div>
                                <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                                {SIDEBAR.map(item => (
                                    <button key={item.id}
                                        onClick={() => { setTab(item.id); setSearch(''); setSidebarOpen(false); }}
                                        className={cn(
                                            'w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all',
                                            tab === item.id
                                                ? 'bg-violet-600/20 text-violet-300 border border-violet-500/25'
                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        )}>
                                        <span className="text-lg">{item.emoji}</span>
                                        <span className="text-sm">{item.label}</span>
                                        {item.id === 'domains' && pendingDomains.length > 0 && (
                                            <span className="ml-auto w-5 h-5 rounded-full bg-amber-500 text-[9px] font-black text-black flex items-center justify-center">
                                                {pendingDomains.length}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </nav>
                            <div className="p-3 border-t border-white/[0.05]">
                                <button onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all">
                                    <LogOut className="w-4 h-4" /> Déconnexion
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* ─── Main ─────────────────────────────────────────── */}
            <main className="flex-1 overflow-auto min-w-0 pb-20 md:pb-0">

                {/* Topbar */}
                <div className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06080F]/90 backdrop-blur-xl px-4 md:px-6 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        {/* Hamburger — mobile only */}
                        <button onClick={() => setSidebarOpen(true)}
                            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="text-xl">{SIDEBAR.find(s => s.id === tab)?.emoji}</span>
                            <h1 className="font-black text-sm">
                                {SIDEBAR.find(s => s.id === tab)?.label}
                            </h1>
                        </div>
                        {pendingDomains.length > 0 && tab === 'domains' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 font-bold">
                                {pendingDomains.length} en attente
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {/* SuperAdmin Realtime Notification Bell */}
                        <SuperadminNotificationBell onNavigateTab={(targetTab) => setTab(targetTab as Tab)} />

                        {dataLoading && <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />}
                        <button onClick={loadAllData} title="Actualiser"
                            className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <span className="hidden sm:flex text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full font-bold">
                            ⚡ SuperAdmin
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <AnimatePresence mode="wait">

                        {/* ══════════════════════════════════════════
                            OVERVIEW
                        ══════════════════════════════════════════ */}
                        {tab === 'overview' && (
                            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                                {/* KPI Grid */}
                                {stats ? (
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                        <KpiCard label="Organisations" value={stats.total_orgs}    icon={Building2}  gradient="from-violet-500 to-purple-600"   sub={stats.new_orgs_week > 0 ? `+${stats.new_orgs_week} cette semaine` : undefined} />
                                        <KpiCard label="Étudiants"     value={stats.total_students} icon={School}     gradient="from-teal-500 to-emerald-600" />
                                        <KpiCard label="Professeurs"   value={stats.total_teachers} icon={UserCheck}  gradient="from-indigo-500 to-blue-600" />
                                        <KpiCard label="Total users"   value={stats.total_users}    icon={Users}      gradient="from-blue-500 to-cyan-600" />
                                        <KpiCard label="Domaines custom" value={stats.custom_domains} icon={Globe}   gradient="from-amber-500 to-orange-600" />
                                        <KpiCard label="Nouveaux (7j)" value={stats.new_orgs_week}  icon={TrendingUp} gradient="from-rose-500 to-pink-600" />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                        {Array.from({length: 6}).map((_, i) => (
                                            <div key={i} className="h-28 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse" />
                                        ))}
                                    </div>
                                )}

                                {/* Recent orgs + Activity side by side */}
                                <div className="grid lg:grid-cols-2 gap-6">
                                    {/* Recent orgs */}
                                    <div>
                                        <h2 className="font-bold text-sm text-slate-300 mb-3 flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-violet-400" /> Dernières organisations
                                        </h2>
                                        <div className="space-y-2">
                                            {orgs.slice(0, 8).map(org => (
                                                <div key={org.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/10 transition-all group">
                                                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0',
                                                        org.is_active ? 'bg-violet-500/20 text-violet-300' : 'bg-red-500/15 text-red-400'
                                                    )}>
                                                        {org.name[0]?.toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-xs truncate">{org.name}</p>
                                                        <p className="text-[10px] text-slate-600">/{org.slug}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <Badge active={org.is_active}
                                                            label={['Actif', 'Suspendu']}
                                                            activeClass="bg-emerald-500/15 text-emerald-400"
                                                            inactiveClass="bg-red-500/15 text-red-400" />
                                                        <span className="text-[10px] text-slate-700">{timeAgo(org.created_at)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Activity feed */}
                                    <div>
                                        <h2 className="font-bold text-sm text-slate-300 mb-3 flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-teal-400" /> Activité récente
                                        </h2>
                                        <div className="space-y-1.5">
                                            {activity.slice(0, 12).map((a, i) => (
                                                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] transition-all">
                                                    <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-[9px] shrink-0',
                                                        a.type === 'org'     ? 'bg-violet-500/20 text-violet-400' :
                                                        a.type === 'teacher' ? 'bg-indigo-500/20 text-indigo-400' :
                                                                               'bg-teal-500/20 text-teal-400'
                                                    )}>
                                                        {a.type === 'org' ? '🏫' : a.type === 'teacher' ? '👨‍🏫' : '👩‍🎓'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-slate-300 truncate font-medium">{a.label}</p>
                                                        <p className="text-[10px] text-slate-600 truncate">{a.meta}</p>
                                                    </div>
                                                    <span className="text-[9px] text-slate-700 shrink-0">{timeAgo(a.created_at)}</span>
                                                </div>
                                            ))}
                                            {activity.length === 0 && !dataLoading && (
                                                <p className="text-center text-xs text-slate-600 py-8">Aucune activité</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ══════════════════════════════════════════
                            ORGANISATIONS
                        ══════════════════════════════════════════ */}
                        {tab === 'orgs' && (
                            <motion.div key="orgs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                <SuperadminOrgCards
                                    orgs={orgs as any}
                                    loading={dataLoading}
                                    onRefresh={loadAllData}
                                    onToggleActive={toggleOrg as any}
                                    onVerifyDomain={verifyDomain as any}
                                    onDeleteOrg={setDeleteConfirm as any}
                                />
                            </motion.div>
                        )}

                        {/* ══════════════════════════════════════════
                            UTILISATEURS & ANALYTIQUE TRAFIC (Feature 4)
                        ══════════════════════════════════════════ */}
                        {tab === 'users' && (
                            <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                                {/* ── Top Traffic KPIs ── */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8">
                                        <p className="text-[10px] uppercase font-bold text-slate-400">Total Utilisateurs</p>
                                        <p className="text-2xl font-black text-white mt-1">{users.length}</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">Sur l&apos;ensemble du réseau</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                                        <p className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Actifs Récents
                                        </p>
                                        <p className="text-2xl font-black text-emerald-300 mt-1">
                                            {users.filter(u => (Date.now() - new Date(u.created_at).getTime()) < 14 * 86400000).length}
                                        </p>
                                        <p className="text-[10px] text-emerald-400/70 mt-0.5">Connexions &lt; 14 jours</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/20">
                                        <p className="text-[10px] uppercase font-bold text-teal-400">🎓 Étudiants</p>
                                        <p className="text-2xl font-black text-teal-300 mt-1">
                                            {users.filter(u => u.role === 'student').length}
                                        </p>
                                        <p className="text-[10px] text-teal-400/70 mt-0.5">Apprenants inscrits</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
                                        <p className="text-[10px] uppercase font-bold text-indigo-400">👨‍🏫 Enseignants</p>
                                        <p className="text-2xl font-black text-indigo-300 mt-1">
                                            {users.filter(u => u.role === 'teacher').length}
                                        </p>
                                        <p className="text-[10px] text-indigo-400/70 mt-0.5">Corps professoral</p>
                                    </div>
                                </div>

                                {/* ── Filters & Search ── */}
                                <div className="flex items-center justify-between gap-4 flex-wrap p-4 rounded-2xl bg-white/[0.02] border border-white/8">
                                    <div className="relative flex-1 max-w-sm">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input value={search} onChange={e => setSearch(e.target.value)}
                                            placeholder="Nom, email, organisation..." autoFocus
                                            className="w-full bg-white/5 border border-white/10 text-white pl-9 pr-4 h-10 rounded-xl text-xs placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40" />
                                    </div>
                                    <span className="text-xs text-slate-400 font-bold">{filteredUsers.length} / {users.length} membres</span>
                                    <div className="flex gap-2">
                                        <span className="text-xs px-3 py-1 rounded-xl bg-teal-500/15 text-teal-300 border border-teal-500/25 font-bold">
                                            {users.filter(u => u.role === 'student').length} étudiants
                                        </span>
                                        <span className="text-xs px-3 py-1 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 font-bold">
                                            {users.filter(u => u.role === 'teacher').length} professeurs
                                        </span>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="rounded-2xl border border-white/8 overflow-hidden bg-white/[0.01]">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm min-w-[750px]">
                                            <thead>
                                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                                    {['Utilisateur', 'Email', 'Rôle', 'Organisation', 'Trafic / Statut', 'Date Inscription'].map(h => (
                                                        <th key={h} className="text-left px-4 py-3 text-[10px] text-slate-500 font-bold uppercase tracking-wide">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredUsers.map((user, i) => {
                                                    const isRecent = (Date.now() - new Date(user.created_at).getTime()) < 14 * 86400000;
                                                    return (
                                                        <tr key={user.id}
                                                            className={cn('border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors',
                                                                i % 2 !== 0 ? 'bg-white/[0.01]' : ''
                                                            )}>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-md',
                                                                        user.role === 'teacher' ? 'bg-indigo-600' : 'bg-teal-600'
                                                                    )}>
                                                                        {user.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-bold text-xs text-white block">{user.full_name}</span>
                                                                        <span className="text-[10px] text-slate-500 font-mono">ID: {user.id.slice(0, 8)}...</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-xs text-slate-400 font-mono max-w-[180px] truncate">{user.email || 'Non renseigné'}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={cn('text-[10px] px-2.5 py-1 rounded-full font-bold',
                                                                    user.role === 'teacher'
                                                                        ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25'
                                                                        : 'bg-teal-500/15 text-teal-300 border border-teal-500/25'
                                                                )}>
                                                                    {user.role === 'teacher' ? '👨‍🏫 Professeur' : '🎓 Étudiant'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-xs text-slate-400 max-w-[160px] truncate">
                                                                {user.org_slug ? (
                                                                    <a href={`/${user.org_slug}/campus`} target="_blank" rel="noreferrer"
                                                                        className="hover:text-violet-300 transition-colors flex items-center gap-1 group font-medium">
                                                                        {user.org_name}
                                                                        <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-slate-600">{user.org_name || 'N/A'}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit',
                                                                    isRecent
                                                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                                                        : 'bg-slate-500/15 text-slate-400 border border-slate-500/25'
                                                                )}>
                                                                    <span className={cn('w-1.5 h-1.5 rounded-full', isRecent ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500')} />
                                                                    {isRecent ? '🟢 En ligne récent' : '⚪ Standard'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-[11px] text-slate-400">
                                                                {new Date(user.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    {filteredUsers.length === 0 && !dataLoading && (
                                        <div className="text-center py-12 text-slate-500 text-sm">
                                            {search ? 'Aucun résultat correspondant' : 'Aucun utilisateur'}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* ══════════════════════════════════════════
                            DOMAINES
                        ══════════════════════════════════════════ */}
                        {tab === 'domains' && (
                            <motion.div key="domains" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-slate-500">{domainsOrgs.length} domaine(s) configuré(s)</span>
                                    {pendingDomains.length > 0 && (
                                        <span className="text-xs text-amber-400 font-semibold">⚠️ {pendingDomains.length} en attente de validation</span>
                                    )}
                                </div>

                                {/* DNS Config card — domain is read from platform_settings */}
                                <PlatformDomainCard supabase={supabase} />

                                {/* Domain list */}
                                <div className="space-y-3">
                                    {domainsOrgs.map(org => (
                                        <div key={org.id} className={cn('p-4 rounded-2xl border transition-all',
                                            org.domain_verified
                                                ? 'bg-emerald-500/[0.03] border-emerald-500/15'
                                                : 'bg-amber-500/[0.03] border-amber-500/15'
                                        )}>
                                            <div className="flex items-center gap-4">
                                                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0',
                                                    org.domain_verified ? 'bg-emerald-500/15' : 'bg-amber-500/15'
                                                )}>
                                                    {org.domain_verified ? '✅' : '⏳'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-sm">{org.name}</span>
                                                        <Badge active={org.domain_verified}
                                                            label={['Domaine vérifié', 'En attente']}
                                                            activeClass="bg-emerald-500/20 text-emerald-400"
                                                            inactiveClass="bg-amber-500/20 text-amber-400" />
                                                    </div>
                                                    <p className="text-sm text-violet-300 font-mono mt-0.5">{org.custom_domain}</p>
                                                    <p className="text-[10px] text-slate-600 mt-0.5">/{org.slug} · {timeAgo(org.created_at)}</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <a href={`https://${org.custom_domain}`} target="_blank" rel="noreferrer"
                                                        className="p-2 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                    <button onClick={() => verifyDomain(org)}
                                                        className={cn('px-4 py-2 rounded-xl text-xs font-bold border transition-all',
                                                            org.domain_verified
                                                                ? 'border-red-500/20 text-red-400 hover:bg-red-500/10'
                                                                : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                                                        )}>
                                                        {org.domain_verified
                                                            ? <><Ban className="w-3 h-3 inline mr-1" />Retirer</>
                                                            : <><CheckSquare className="w-3 h-3 inline mr-1" />Valider</>
                                                        }
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {domainsOrgs.length === 0 && (
                                        <div className="text-center py-16">
                                            <Globe className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                                            <p className="text-slate-500 text-sm">Aucun domaine custom configuré</p>
                                            <p className="text-slate-700 text-xs mt-1">Les organisations peuvent ajouter leur domaine dans les paramètres admin.</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* ══════════════════════════════════════════
                            PUBLICITÉS (Feature 6)
                        ══════════════════════════════════════════ */}
                        {tab === 'ads' && (
                            <AdsTab supabase={supabase} />
                        )}

                        {/* ══════════════════════════════════════════
                            EMAIL PROVIDERS — Dual provider dashboard
                        ══════════════════════════════════════════ */}
                        {tab === 'email' && (
                            <EmailProvidersPanel
                                workerUrl="https://campusflow-worker.kleintaptue1.workers.dev"
                            />
                        )}

                        {/* ══════════════════════════════════════════
                            MON COMPTE — Changement de mot de passe
                        ══════════════════════════════════════════ */}
                        {tab === 'compte' && (
                            <motion.div key="compte" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="max-w-lg space-y-6">
                                <div>
                                    <h2 className="text-lg font-black text-white flex items-center gap-2">🔑 Mon Compte</h2>
                                    <p className="text-sm text-slate-500 mt-0.5">Sécurité et configuration globale de la plateforme</p>
                                </div>

                                {/* ── Domaine principal de la plateforme ── */}
                                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-3">
                                    <div>
                                        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">🌐 Domaine principal IziTeach</p>
                                        <p className="text-xs text-slate-600 mt-1">
                                            Ce domaine est affiché à tous vos clients comme cible CNAME. Changez-le une fois et tous vos clients voient automatiquement le bon enregistrement DNS.
                                        </p>
                                    </div>
                                    <PlatformDomainForm supabase={supabase} />
                                </div>

                                {/* ── Changement de mot de passe ── */}
                                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
                                    <div>
                                        <label className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Email</label>
                                        <div className="mt-1 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-slate-400">
                                            <CompteEmail supabase={supabase} />
                                        </div>
                                    </div>
                                    <ComptePasswordForm supabase={supabase} />
                                </div>
                            </motion.div>
                        )}
                        {/* ══════════════════════════════════════════
                            ANNONCES GLOBALES & HISTORIQUE (Feature 7)
                        ══════════════════════════════════════════ */}
                        {tab === 'announcements' && (
                            <motion.div key="announcements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

                                {/* Top Info */}
                                <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/15 text-xs text-violet-300 flex items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <p className="font-bold flex items-center gap-2"><Megaphone className="w-4 h-4 text-violet-400" /> Gestion & Diffusion des Annonces Officielles</p>
                                        <p className="text-slate-400 leading-relaxed">
                                            Les annonces publiées apparaissent instantanément dans l&apos;onglet <strong className="text-white">Actus officielles</strong> des élèves, professeurs et administrateurs avec le badge officiel.
                                        </p>
                                    </div>
                                    <button onClick={loadAnnouncementsHistory} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white shrink-0 border border-white/10">
                                        <RefreshCw className={cn('w-4 h-4', annListLoading && 'animate-spin')} />
                                    </button>
                                </div>

                                <div className="grid lg:grid-cols-12 gap-6 items-start">
                                    {/* ── Formulaire (Gauche) ── */}
                                    <div className="lg:col-span-5 p-5 rounded-3xl bg-white/[0.03] border border-white/8 space-y-4 shadow-xl">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Megaphone className="w-5 h-5 text-violet-400" />
                                            <h2 className="font-black text-sm text-white">Nouvelle annonce</h2>
                                        </div>

                                        {/* Type d'annonce */}
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1.5 block font-bold">Type / Priorité</label>
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {([
                                                    { id: 'info', label: '📢 Info', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
                                                    { id: 'warning', label: '⚠️ Alerte', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
                                                    { id: 'success', label: '🎉 Fête', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
                                                    { id: 'urgent', label: '🚨 Urgent', color: 'bg-red-500/20 text-red-300 border-red-500/40' },
                                                ] as const).map(t => (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        onClick={() => setAnnType(t.id)}
                                                        className={cn(
                                                            'py-2 px-1 rounded-xl text-[11px] font-bold border transition-all',
                                                            annType === t.id
                                                                ? `${t.color} shadow-sm`
                                                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                                                        )}
                                                    >
                                                        {t.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Cible */}
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1.5 block font-bold">Établissement cible</label>
                                            <select value={annTarget} onChange={e => setAnnTarget(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 text-white h-10 rounded-xl text-xs px-3 focus:outline-none focus:border-violet-500/40 cursor-pointer">
                                                <option value="all">📢 Tous les établissements ({orgs.filter(o => o.is_active).length})</option>
                                                <optgroup label="Organisation spécifique">
                                                    {orgs.map(o => (
                                                        <option key={o.id} value={o.id}>{o.name} ({o.student_count + o.teacher_count} membres)</option>
                                                    ))}
                                                </optgroup>
                                            </select>
                                        </div>

                                        {/* Titre */}
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1.5 block font-bold">Titre de l&apos;annonce <span className="text-red-400">*</span></label>
                                            <input value={annTitle} onChange={e => setAnnTitle(e.target.value)}
                                                placeholder="Ex: Mise à jour système ou fête de l'école..."
                                                className="w-full bg-white/5 border border-white/10 text-white h-10 rounded-xl text-sm px-3 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40" />
                                        </div>

                                        {/* Message */}
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1.5 block font-bold">Message complet <span className="text-red-400">*</span></label>
                                            <textarea value={annBody} onChange={e => setAnnBody(e.target.value)}
                                                placeholder="Détails complets de l'annonce..."
                                                rows={4}
                                                className="w-full bg-white/5 border border-white/10 text-white rounded-xl text-sm px-3 py-2.5 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40 resize-none" />
                                            <p className="text-[10px] text-slate-600 mt-1">{annBody.length} caractères</p>
                                        </div>

                                        {/* Preview */}
                                        {(annTitle || annBody) && (
                                            <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Aperçu en direct</p>
                                                <div className="flex items-start gap-2 pt-1">
                                                    <span className="text-lg">
                                                        {annType === 'urgent' ? '🚨' : annType === 'warning' ? '⚠️' : annType === 'success' ? '🎉' : '📣'}
                                                    </span>
                                                    <div>
                                                        <p className="text-xs font-bold text-white">{annTitle || 'Titre...'}</p>
                                                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed whitespace-pre-line">{annBody || 'Message...'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <Button onClick={sendAnnouncement}
                                            disabled={sendingAnn || !annTitle.trim() || !annBody.trim()}
                                            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 font-black rounded-xl h-11 shadow-lg shadow-violet-500/20 text-sm">
                                            {sendingAnn
                                                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Diffusion en cours...</>
                                                : <><Megaphone className="w-4 h-4 mr-2" />Publier l&apos;annonce officielle</>
                                            }
                                        </Button>
                                    </div>

                                    {/* ── Liste des annonces envoyées (Droite) ── */}
                                    <div className="lg:col-span-7 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-bold text-sm text-white flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-violet-400" /> Annonces publiées ({annList.length})
                                            </h3>
                                        </div>

                                        {annListLoading ? (
                                            <div className="p-12 text-center">
                                                <Loader2 className="w-6 h-6 animate-spin text-slate-500 mx-auto" />
                                            </div>
                                        ) : annList.length === 0 ? (
                                            <div className="p-12 rounded-3xl bg-white/[0.02] border border-white/5 text-center space-y-2">
                                                <Megaphone className="w-8 h-8 text-slate-600 mx-auto" />
                                                <p className="text-sm font-bold text-slate-400">Aucune annonce publiée pour l&apos;instant</p>
                                                <p className="text-xs text-slate-600">Remplissez le formulaire de gauche pour envoyer votre première annonce officielle.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                                                {annList.map(a => (
                                                    <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                                        className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 hover:border-white/15 transition-all space-y-2">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex items-start gap-2.5 min-w-0">
                                                                <span className="text-lg shrink-0 mt-0.5">
                                                                    {a.ann_type === 'urgent' ? '🚨' : a.ann_type === 'warning' ? '⚠️' : a.ann_type === 'success' ? '🎉' : '📣'}
                                                                </span>
                                                                <div className="min-w-0">
                                                                    <p className="font-black text-sm text-white truncate">{a.title}</p>
                                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 font-bold">
                                                                            {a.target_type === 'all' ? '📢 Tous les établissements' : `🏫 ${a.target_org_name || 'Établissement'}`}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-500">
                                                                            {new Date(a.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => deleteAnnouncement(a.id)}
                                                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                                                                title="Supprimer cette annonce"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line pl-7">
                                                            {a.body}
                                                        </p>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ══════════════════════════════════════════
                            SKY POINTS & HISTORIQUE DES TRANSACTIONS (Feature 5)
                        ══════════════════════════════════════════ */}
                        {tab === 'points' && (
                            <motion.div key="points" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

                                {/* Top Switch: Écoles vs Utilisateurs vs Historique */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.03] border border-white/8 rounded-2xl p-4">
                                    <div>
                                        <h3 className="text-base font-black text-white flex items-center gap-2">
                                            <Star className="w-5 h-5 text-amber-400" /> Gestion & Envoi des Sky Points
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Transférez des Sky Points directement aux administrateurs d&apos;écoles, aux utilisateurs et suivez l&apos;historique complet.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 shrink-0">
                                        <button
                                            onClick={() => setPointsTabMode('orgs')}
                                            className={cn(
                                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all',
                                                pointsTabMode === 'orgs'
                                                    ? 'bg-amber-500 text-slate-950 shadow-md'
                                                    : 'text-slate-400 hover:text-white'
                                            )}
                                        >
                                            <Building2 className="w-3.5 h-3.5" /> Écoles ({orgs.length})
                                        </button>
                                        <button
                                            onClick={() => setPointsTabMode('users')}
                                            className={cn(
                                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all',
                                                pointsTabMode === 'users'
                                                    ? 'bg-amber-500 text-slate-950 shadow-md'
                                                    : 'text-slate-400 hover:text-white'
                                            )}
                                        >
                                            <Users className="w-3.5 h-3.5" /> Utilisateurs
                                        </button>
                                        <button
                                            onClick={() => { setPointsTabMode('history'); loadPointsHistory(); }}
                                            className={cn(
                                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all',
                                                pointsTabMode === 'history'
                                                    ? 'bg-amber-500 text-slate-950 shadow-md'
                                                    : 'text-slate-400 hover:text-white'
                                            )}
                                        >
                                            <Clock className="w-3.5 h-3.5" /> Historique ({pointsHistory.length})
                                        </button>
                                    </div>
                                </div>

                                {/* SECTION 1: ÉCOLES & ADMINISTRATEURS */}
                                {pointsTabMode === 'orgs' && (
                                    <div className="space-y-4">
                                        <div className="grid lg:grid-cols-12 gap-5">
                                            {/* Liste des Écoles */}
                                            <div className="lg:col-span-6 space-y-2.5">
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                                    Sélectionnez une école pour lui créditer des Sky Points :
                                                </p>
                                                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                                                    {orgs.map(org => {
                                                        const isSelected = pointsOrgTarget?.id === org.id;
                                                        const pts = (org as any).sky_points || 0;
                                                        return (
                                                            <motion.button
                                                                key={org.id}
                                                                onClick={() => {
                                                                    setPointsOrgTarget(org);
                                                                    setPointsOrgDelta(500);
                                                                    setPointsOrgNote('');
                                                                }}
                                                                className={cn(
                                                                    'w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all',
                                                                    isSelected
                                                                        ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-500/10'
                                                                        : 'bg-white/[0.02] border-white/8 hover:bg-white/[0.05] hover:border-white/15'
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    {org.logo_url ? (
                                                                        <img src={org.logo_url} alt={org.name} className="w-10 h-10 rounded-xl object-contain bg-white/10 p-1 border border-white/10 shrink-0" />
                                                                    ) : (
                                                                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                                                                            <Building2 className="w-5 h-5" />
                                                                        </div>
                                                                    )}
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-black text-white truncate">{org.name}</p>
                                                                        <p className="text-[10px] text-slate-500 truncate">/{org.slug} • {org.city || 'Cameroun'}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right shrink-0 pl-3">
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25 text-xs font-black">
                                                                        <Coins className="w-3 h-3" /> {new Intl.NumberFormat('fr-FR').format(pts)} pts
                                                                    </span>
                                                                </div>
                                                            </motion.button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Panneau d'envoi de points à l'école */}
                                            <div className="lg:col-span-6">
                                                {pointsOrgTarget ? (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.98 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        className="p-5 rounded-3xl bg-gradient-to-br from-[#121722] to-[#0A0D14] border border-amber-500/30 shadow-2xl space-y-4 sticky top-4"
                                                    >
                                                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                                            <div className="flex items-center gap-3">
                                                                {pointsOrgTarget.logo_url ? (
                                                                    <img src={pointsOrgTarget.logo_url} alt={pointsOrgTarget.name} className="w-11 h-11 rounded-xl object-contain bg-white/10 p-1 shrink-0" />
                                                                ) : (
                                                                    <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                                                                        <Building2 className="w-5 h-5" />
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <h4 className="text-sm font-black text-white">{pointsOrgTarget.name}</h4>
                                                                    <p className="text-[10px] text-slate-400">/{pointsOrgTarget.slug}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-[10px] text-slate-400 block">Solde actuel</span>
                                                                <span className="text-lg font-black text-amber-400">
                                                                    {new Intl.NumberFormat('fr-FR').format((pointsOrgTarget as any).sky_points || 0)} pts
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Presets rapides pour l'école */}
                                                        <div>
                                                            <label className="text-[11px] font-bold text-slate-300 block mb-2">Montants rapides (pts)</label>
                                                            <div className="grid grid-cols-4 gap-1.5">
                                                                {[+500, +1000, +2500, +5000, +10000, +25000, +50000, -1000].map(val => (
                                                                    <button
                                                                        key={val}
                                                                        onClick={() => setPointsOrgDelta(val)}
                                                                        className={cn(
                                                                            'py-2 px-1 rounded-xl text-xs font-black border transition-all',
                                                                            pointsOrgDelta === val
                                                                                ? val > 0
                                                                                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-500/10'
                                                                                    : 'bg-red-500/20 border-red-500/50 text-red-300'
                                                                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                                                                        )}
                                                                    >
                                                                        {val > 0 ? `+${val.toLocaleString('fr-FR')}` : val.toLocaleString('fr-FR')}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Ajustement précis */}
                                                        <div>
                                                            <label className="text-[11px] font-bold text-slate-300 block mb-1.5">Montant personnalisé</label>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => setPointsOrgDelta(d => d - 500)}
                                                                    className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 flex items-center justify-center hover:bg-red-500/20"
                                                                >
                                                                    <Minus className="w-4 h-4" />
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    value={pointsOrgDelta}
                                                                    onChange={e => setPointsOrgDelta(parseInt(e.target.value) || 0)}
                                                                    className="flex-1 bg-white/5 border border-white/10 text-white h-10 rounded-xl text-center text-sm font-black focus:outline-none focus:border-amber-500/50"
                                                                />
                                                                <button
                                                                    onClick={() => setPointsOrgDelta(d => d + 500)}
                                                                    className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20"
                                                                >
                                                                    <Plus className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Prévisualisation nouveau solde */}
                                                        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                                                            <span className="text-slate-400">Nouveau solde prévu :</span>
                                                            <span className="text-base font-black text-amber-300">
                                                                {new Intl.NumberFormat('fr-FR').format(Math.max(0, ((pointsOrgTarget as any).sky_points || 0) + pointsOrgDelta))} pts
                                                            </span>
                                                        </div>

                                                        {/* Note */}
                                                        <div>
                                                            <label className="text-[11px] font-bold text-slate-300 block mb-1">Motif / Note de transfert</label>
                                                            <input
                                                                value={pointsOrgNote}
                                                                onChange={e => setPointsOrgNote(e.target.value)}
                                                                placeholder="Ex: Dotation rentrée scolaire, Pack Pro..."
                                                                className="w-full bg-white/5 border border-white/10 text-white h-9 rounded-xl text-xs px-3 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/40"
                                                            />
                                                        </div>

                                                        {/* Bouton d'action */}
                                                        <Button
                                                            onClick={applyOrgPoints}
                                                            disabled={sendingPoints || pointsOrgDelta === 0}
                                                            className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 gap-2"
                                                        >
                                                            {sendingPoints ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                                                            {pointsOrgDelta >= 0 ? `Envoyer +${pointsOrgDelta.toLocaleString('fr-FR')} Sky Points` : `Déduire ${Math.abs(pointsOrgDelta).toLocaleString('fr-FR')} Sky Points`}
                                                        </Button>
                                                    </motion.div>
                                                ) : (
                                                    <div className="h-full flex flex-col items-center justify-center p-8 rounded-3xl bg-white/[0.02] border border-dashed border-white/10 text-center text-slate-500 space-y-2 min-h-[300px]">
                                                        <Building2 className="w-8 h-8 text-slate-600" />
                                                        <p className="text-xs font-bold text-slate-400">Aucune école sélectionnée</p>
                                                        <p className="text-[11px] text-slate-600 max-w-xs">Cliquez sur une école dans la liste de gauche pour ajuster son solde Sky Points.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* SECTION 2: ÉTUDIANTS & PROFESSEURS */}
                                {pointsTabMode === 'users' && (
                                    <div className="space-y-4">
                                        {/* Search bar */}
                                        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4 space-y-3">
                                            <div>
                                                <p className="text-sm font-black text-white mb-1">⭐ Recherche d&apos;utilisateurs</p>
                                                <p className="text-xs text-slate-500">Recherchez un étudiant ou professeur par nom, prénom ou code d&apos;accès.</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                    <input
                                                        value={pointsSearch}
                                                        onChange={e => setPointsSearch(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && searchForPoints()}
                                                        placeholder="Nom, prénom ou code accès..."
                                                        className="w-full bg-white/5 border border-white/10 text-white h-10 rounded-xl text-sm pl-9 pr-3 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40" />
                                                </div>
                                                <Button onClick={searchForPoints} disabled={pointsLoading}
                                                    className="bg-violet-600 hover:bg-violet-500 rounded-xl px-4 shrink-0">
                                                    {pointsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Results */}
                                        {pointsResults.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs text-slate-500 font-semibold">{pointsResults.length} résultat(s)</p>
                                                {pointsResults.map(u => (
                                                    <motion.button key={u.id}
                                                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                                        onClick={() => { setPointsTarget(u); setPointsDelta(0); setPointsNote(''); }}
                                                        className={cn(
                                                            'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                                                            pointsTarget?.id === u.id
                                                                ? 'bg-amber-500/10 border-amber-500/30 shadow-sm shadow-amber-500/10'
                                                                : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
                                                        )}>
                                                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0',
                                                            u.role === 'student' ? 'bg-teal-500/20 text-teal-300' : 'bg-indigo-500/20 text-indigo-300')}>
                                                            {u.first_name?.[0]}{u.last_name?.[0]}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-white truncate">{u.first_name} {u.last_name}</p>
                                                            <p className="text-[10px] text-slate-500">
                                                                {u.role === 'student' ? '🎓 Étudiant' : '👨‍🏫 Prof'} · {u.org_name || u.organization_id}
                                                            </p>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-sm font-black text-amber-400">{u.sky_points ?? 0}</p>
                                                            <p className="text-[9px] text-slate-600">pts</p>
                                                        </div>
                                                    </motion.button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Points editor */}
                                        {pointsTarget && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                                className="bg-gradient-to-br from-amber-500/[0.07] to-orange-500/[0.04] border border-amber-500/20 rounded-2xl p-5 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-black text-white">{pointsTarget.first_name} {pointsTarget.last_name}</p>
                                                        <p className="text-[10px] text-slate-500">{pointsTarget.role === 'student' ? '🎓 Étudiant' : '👨‍🏫 Professeur'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-slate-400">Solde actuel</p>
                                                        <p className="text-2xl font-black text-amber-400">{pointsTarget.sky_points ?? 0} <span className="text-sm font-normal text-slate-500">pts</span></p>
                                                    </div>
                                                </div>

                                                {/* Quick presets */}
                                                <div>
                                                    <p className="text-xs text-slate-400 mb-2">Montants rapides</p>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {[-50, -10, +10, +25, +50, +100, +200, +500].map(v => (
                                                            <button key={v} onClick={() => setPointsDelta(v)}
                                                                className={cn(
                                                                    'py-2 rounded-xl text-xs font-black border transition-all',
                                                                    pointsDelta === v
                                                                        ? v > 0 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-red-500/20 border-red-500/40 text-red-300'
                                                                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                                                                )}>
                                                                {v > 0 ? '+' : ''}{v}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Custom amount */}
                                                <div>
                                                    <p className="text-xs text-slate-400 mb-1.5">Montant personnalisé</p>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => setPointsDelta(d => d - 10)}
                                                            className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-all">
                                                            <Minus className="w-4 h-4" />
                                                        </button>
                                                        <input type="number" value={pointsDelta}
                                                            onChange={e => setPointsDelta(parseInt(e.target.value) || 0)}
                                                            className="flex-1 bg-white/5 border border-white/10 text-white h-10 rounded-xl text-center text-sm font-black focus:outline-none focus:border-amber-500/40" />
                                                        <button onClick={() => setPointsDelta(d => d + 10)}
                                                            className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 transition-all">
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    {pointsDelta !== 0 && (
                                                        <p className="text-xs text-center mt-1.5">
                                                            <span className="text-slate-400">Nouveau solde :</span>{' '}
                                                            <span className="font-black text-amber-300">{Math.max(0, (pointsTarget.sky_points || 0) + pointsDelta)} pts</span>
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Note optionnelle */}
                                                <div>
                                                    <p className="text-xs text-slate-400 mb-1.5">Note (optionnelle)</p>
                                                    <input value={pointsNote} onChange={e => setPointsNote(e.target.value)}
                                                        placeholder="Ex: Récompense pour..."
                                                        className="w-full bg-white/5 border border-white/10 text-white h-9 rounded-xl text-sm px-3 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40" />
                                                </div>

                                                <Button onClick={applyPoints}
                                                    disabled={sendingPoints || pointsDelta === 0}
                                                    className={cn('w-full h-11 font-black rounded-xl shadow-lg transition-all',
                                                        pointsDelta > 0
                                                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-amber-500/25'
                                                            : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-500/25'
                                                    )}>
                                                    {sendingPoints
                                                        ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Application...</>
                                                        : <>⭐ {pointsDelta > 0 ? `Ajouter +${pointsDelta} pts` : `Retirer ${pointsDelta} pts`}</>
                                                    }
                                                </Button>
                                            </motion.div>
                                        )}

                                        {pointsResults.length === 0 && !pointsLoading && (
                                            <div className="text-center py-12 text-slate-600">
                                                <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                                <p className="text-sm">Recherchez un utilisateur pour gérer ses Sky Points</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* SECTION 3: HISTORIQUE DES TRANSACTIONS */}
                                {pointsTabMode === 'history' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                Historique des transferts et crédits de Sky Points :
                                            </p>
                                            <button onClick={loadPointsHistory} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white shrink-0 border border-white/10">
                                                <RefreshCw className={cn('w-4 h-4', pointsHistoryLoading && 'animate-spin')} />
                                            </button>
                                        </div>

                                        {pointsHistoryLoading ? (
                                            <div className="p-12 text-center">
                                                <Loader2 className="w-6 h-6 animate-spin text-slate-500 mx-auto" />
                                            </div>
                                        ) : pointsHistory.length === 0 ? (
                                            <div className="p-12 rounded-3xl bg-white/[0.02] border border-white/5 text-center space-y-2">
                                                <Coins className="w-8 h-8 text-slate-600 mx-auto" />
                                                <p className="text-sm font-bold text-slate-400">Aucune transaction enregistrée</p>
                                                <p className="text-xs text-slate-600">Les transferts de points vers des écoles ou utilisateurs apparaîtront ici.</p>
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl border border-white/8 overflow-hidden bg-white/[0.01]">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm min-w-[700px]">
                                                        <thead>
                                                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                                                {['Date', 'Type', 'Bénéficiaire', 'Organisation', 'Montant', 'Motif / Note', 'Par'].map(h => (
                                                                    <th key={h} className="text-left px-4 py-3 text-[10px] text-slate-500 font-bold uppercase tracking-wide">{h}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {pointsHistory.map((tx, idx) => (
                                                                <tr key={tx.id || idx} className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors">
                                                                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                                                                        {new Date(tx.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <span className={cn(
                                                                            'text-[10px] px-2 py-0.5 rounded-full font-bold',
                                                                            tx.to_entity_type === 'org'
                                                                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                                                                                : 'bg-teal-500/15 text-teal-300 border border-teal-500/25'
                                                                        )}>
                                                                            {tx.to_entity_type === 'org' ? '🏫 École' : '👤 Utilisateur'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 font-bold text-xs text-white">
                                                                        {tx.to_entity_name || '—'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-xs text-slate-400">
                                                                        {tx.org_name || '—'}
                                                                    </td>
                                                                    <td className="px-4 py-3 font-black text-xs">
                                                                        <span className={tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}>
                                                                            {tx.amount > 0 ? `+${tx.amount.toLocaleString('fr-FR')}` : tx.amount.toLocaleString('fr-FR')} pts
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-xs text-slate-300 max-w-[200px] truncate">
                                                                        {tx.note || 'Transfert direct'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-[10px] text-slate-500 font-mono">
                                                                        {tx.performed_by || 'superadmin'}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ══════════════════════════════════════════
                            TARIFS DES STYLES & TEMPLATES (SUPERADMIN)
                        ══════════════════════════════════════════ */}
                        {tab === 'pricing' && (
                            <motion.div key="pricing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                <SuperadminStylesPricing />
                            </motion.div>
                        )}

                        {/* ══════════════════════════════════════════
                            DEMANDES SKY POINTS (Chat & Crédit — Clean Design)
                        ══════════════════════════════════════════ */}
                        {tab === 'requests' && (() => {
                            const pendingReqs = skyRequests.filter(r => r.status === 'pending');
                            const confirmedReqs = skyRequests.filter(r => r.status === 'confirmed');
                            const creditedReqs = skyRequests.filter(r => r.status === 'credited');
                            const rejectedReqs = skyRequests.filter(r => r.status === 'rejected');

                            const filteredSkyReqs = skyRequests.filter(r => {
                                if (reqStatusFilter === 'pending') return r.status === 'pending';
                                if (reqStatusFilter === 'confirmed') return r.status === 'confirmed';
                                if (reqStatusFilter === 'credited') return r.status === 'credited';
                                if (reqStatusFilter === 'rejected') return r.status === 'rejected';
                                return true;
                            });

                            const selectedReq = skyRequests.find(r => r.id === activeReqId) || filteredSkyReqs[0] || null;

                            return (
                                <motion.div key="requests" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                                    {/* ── Top Filter Bar ── */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/8">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
                                                <Crown className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-white">Centre des Demandes Sky Points</h3>
                                                <p className="text-[11px] text-slate-400">Gérez et répondez aux requêtes d&apos;achat et de crédits.</p>
                                            </div>
                                        </div>

                                        {/* Status Filter Buttons */}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {([
                                                { id: 'all', label: `Toutes (${skyRequests.length})` },
                                                { id: 'pending', label: `⏳ En attente (${pendingReqs.length})` },
                                                { id: 'confirmed', label: `✉️ Répondu (${confirmedReqs.length})` },
                                                { id: 'credited', label: `⭐ Crédité (${creditedReqs.length})` },
                                                { id: 'rejected', label: `❌ Refusé (${rejectedReqs.length})` },
                                            ] as const).map(f => (
                                                <button
                                                    key={f.id}
                                                    onClick={() => setReqStatusFilter(f.id)}
                                                    className={cn(
                                                        'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                                                        reqStatusFilter === f.id
                                                            ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                                                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                                    )}
                                                >
                                                    {f.label}
                                                </button>
                                            ))}
                                            <button onClick={loadSkyRequests} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white shrink-0 border border-white/10 ml-1">
                                                <RefreshCw className={cn('w-4 h-4', reqLoading && 'animate-spin')} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* ── Main 2-Column Conversational Layout ── */}
                                    {filteredSkyReqs.length === 0 ? (
                                        <div className="p-16 rounded-3xl bg-white/[0.02] border border-white/5 text-center space-y-2">
                                            <MessageSquare className="w-10 h-10 text-slate-600 mx-auto" />
                                            <p className="text-sm font-bold text-slate-400">Aucune demande dans cette catégorie</p>
                                            <p className="text-xs text-slate-600">Sélectionnez un autre filtre pour voir les demandes.</p>
                                        </div>
                                    ) : (
                                        <div className="grid lg:grid-cols-12 gap-5 items-start">
                                            {/* Left Column: Requests List */}
                                            <div className="lg:col-span-5 space-y-2 max-h-[620px] overflow-y-auto pr-1">
                                                {filteredSkyReqs.map(req => {
                                                    const isSelected = selectedReq?.id === req.id;
                                                    const statusColors: Record<string, string> = {
                                                        pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                                                        confirmed: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
                                                        credited: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                                                        rejected: 'bg-red-500/15 text-red-300 border-red-500/30',
                                                    };
                                                    return (
                                                        <button
                                                            key={req.id}
                                                            onClick={() => setActiveReqId(req.id)}
                                                            className={cn(
                                                                'w-full text-left p-3.5 rounded-2xl border transition-all space-y-2',
                                                                isSelected
                                                                    ? 'bg-gradient-to-r from-amber-500/15 to-transparent border-amber-500/40 shadow-lg shadow-amber-500/5'
                                                                    : 'bg-white/[0.02] border-white/8 hover:bg-white/[0.05]'
                                                            )}
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <div className={cn(
                                                                        'w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0',
                                                                        req.user_role === 'teacher' ? 'bg-indigo-600/30 text-indigo-300' : 'bg-teal-600/30 text-teal-300'
                                                                    )}>
                                                                        {req.user_name?.[0]?.toUpperCase() || 'U'}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="font-bold text-xs text-white truncate">{req.user_name}</p>
                                                                        <p className="text-[10px] text-slate-500 truncate">/{req.org_slug || 'école'}</p>
                                                                    </div>
                                                                </div>
                                                                <span className={cn('text-[9px] px-2 py-0.5 rounded-full font-bold border shrink-0', statusColors[req.status])}>
                                                                    {req.status === 'pending' ? '⏳ En attente' :
                                                                     req.status === 'confirmed' ? '✉️ Répondu' :
                                                                     req.status === 'credited' ? '⭐ Crédité' : '❌ Refusé'}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-300 line-clamp-1 pl-10">{req.message}</p>
                                                            <div className="flex items-center justify-between text-[10px] text-slate-500 pl-10">
                                                                <span>{req.pack_name ? `📦 ${req.pack_name}` : 'Demande générale'}</span>
                                                                <span>{new Date(req.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Right Column: Active Thread & Actions */}
                                            <div className="lg:col-span-7">
                                                {selectedReq ? (
                                                    <div className="p-5 rounded-3xl bg-[#0E131F] border border-white/10 shadow-2xl space-y-4">
                                                        {/* Header */}
                                                        <div className="flex items-center justify-between pb-3 border-b border-white/8">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center font-black text-amber-400">
                                                                    {selectedReq.user_name?.[0]?.toUpperCase() || 'U'}
                                                                </div>
                                                                <div>
                                                                    <p className="font-black text-sm text-white">{selectedReq.user_name}</p>
                                                                    <p className="text-[11px] text-slate-400">
                                                                        {selectedReq.user_role === 'teacher' ? '👨‍🏫 Professeur' : '🎓 Étudiant'} • /{selectedReq.org_slug || 'école'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-[10px] text-slate-500 block">Date demande</span>
                                                                <span className="text-xs text-slate-300 font-mono">
                                                                    {new Date(selectedReq.created_at).toLocaleString('fr-FR')}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Pack badge info */}
                                                        {selectedReq.pack_name && (
                                                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                                                                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                                                                    <Crown className="w-3.5 h-3.5" /> Pack souhaité : {selectedReq.pack_name}
                                                                </span>
                                                                {selectedReq.pack_price && (
                                                                    <span className="font-mono text-amber-400 font-bold">{selectedReq.pack_price}</span>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Conversation Chat Bubbles */}
                                                        <div className="space-y-3 p-4 rounded-2xl bg-black/40 border border-white/5 min-h-[160px]">
                                                            {/* User bubble */}
                                                            <div className="flex items-start gap-2.5 max-w-[85%]">
                                                                <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                                                    {selectedReq.user_name?.[0] || 'U'}
                                                                </div>
                                                                <div className="p-3 rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                                                                    {selectedReq.message}
                                                                </div>
                                                            </div>

                                                            {/* Admin reply bubble */}
                                                            {selectedReq.response && (
                                                                <div className="flex items-start gap-2.5 max-w-[85%] ml-auto flex-row-reverse">
                                                                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                                                        👑
                                                                    </div>
                                                                    <div className="p-3 rounded-2xl rounded-tr-sm bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 leading-relaxed whitespace-pre-wrap text-right">
                                                                        {selectedReq.response}
                                                                        {selectedReq.responded_at && (
                                                                            <span className="block text-[9px] text-amber-400/60 mt-1">
                                                                                {new Date(selectedReq.responded_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Quick Credit Tool */}
                                                        {selectedReq.status !== 'credited' && (
                                                            <div className="p-4 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 space-y-3">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                                                        <Coins className="w-3.5 h-3.5" /> Créditer instantanément :
                                                                    </span>
                                                                </div>
                                                                <div className="grid grid-cols-5 gap-1.5">
                                                                    {[50, 100, 250, 500, 1000].map(val => (
                                                                        <button
                                                                            key={val}
                                                                            onClick={() => setCreditPoints(val)}
                                                                            className={cn(
                                                                                'py-2 rounded-xl text-xs font-black border transition-all',
                                                                                creditPoints === val
                                                                                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                                                                                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                                                                            )}
                                                                        >
                                                                            +{val}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <input
                                                                        type="number"
                                                                        value={creditPoints || ''}
                                                                        onChange={e => setCreditPoints(parseInt(e.target.value) || 0)}
                                                                        placeholder="Montant libre (ex: 750)"
                                                                        className="flex-1 bg-white/5 border border-white/10 text-white h-10 rounded-xl px-3 text-xs focus:outline-none focus:border-amber-500/40"
                                                                    />
                                                                    <Button
                                                                        onClick={() => adminCreditRequest(selectedReq)}
                                                                        disabled={!creditPoints || creditPoints <= 0 || creditingId === selectedReq.id}
                                                                        className="h-10 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs px-5 shadow-lg shadow-amber-500/20"
                                                                    >
                                                                        {creditingId === selectedReq.id ? <Loader2 className="w-4 h-4 animate-spin" /> : `⭐ Créditer ${creditPoints > 0 ? creditPoints + ' pts' : ''}`}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Fast Reply Box */}
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-slate-300 block">Envoyer un message de réponse</label>
                                                            <div className="flex gap-2">
                                                                <input
                                                                    value={adminReply}
                                                                    onChange={e => setAdminReply(e.target.value)}
                                                                    onKeyDown={e => e.key === 'Enter' && adminReplyRequest(selectedReq.id)}
                                                                    placeholder="Tapez un message personnalisé..."
                                                                    className="flex-1 bg-white/5 border border-white/10 text-white h-10 rounded-xl px-3 text-xs placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40"
                                                                />
                                                                <Button
                                                                    onClick={() => adminReplyRequest(selectedReq.id)}
                                                                    disabled={!adminReply.trim() || sendingReply}
                                                                    className="bg-violet-600 hover:bg-violet-500 h-10 rounded-xl text-xs font-bold px-4"
                                                                >
                                                                    {sendingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })()}

                        {/* ══════════════════════════════════════════
                            BUGS & RAPPORTS AVEC CAPTURES (Feature 2)
                        ══════════════════════════════════════════ */}
                        {tab === 'bugs' && (() => {
                            const openBugs = bugReports.filter(b => b.status === 'open');
                            const inProgBugs = bugReports.filter(b => b.status === 'in_progress');
                            const resolvedBugs = bugReports.filter(b => b.status === 'resolved');

                            const filteredBugs = bugReports.filter(b => {
                                if (bugStatusFilter === 'open') return b.status === 'open';
                                if (bugStatusFilter === 'in_progress') return b.status === 'in_progress';
                                if (bugStatusFilter === 'resolved') return b.status === 'resolved';
                                return true;
                            });

                            return (
                                <motion.div key="bugs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                                    {/* ── Top Header & Filter Bar ── */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/8">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center text-red-400">
                                                <Bug className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-white">Signalements de Bugs & Retours</h3>
                                                <p className="text-[11px] text-slate-400">Rapports envoyés par les élèves, enseignants et administrateurs avec capture d&apos;écran.</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {([
                                                { id: 'all', label: `Tous (${bugReports.length})` },
                                                { id: 'open', label: `🔴 Ouverts (${openBugs.length})` },
                                                { id: 'in_progress', label: `🟡 En cours (${inProgBugs.length})` },
                                                { id: 'resolved', label: `🟢 Résolus (${resolvedBugs.length})` },
                                            ] as const).map(f => (
                                                <button
                                                    key={f.id}
                                                    onClick={() => setBugStatusFilter(f.id)}
                                                    className={cn(
                                                        'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                                                        bugStatusFilter === f.id
                                                            ? 'bg-red-500 text-white font-black shadow-md shadow-red-500/20'
                                                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                                    )}
                                                >
                                                    {f.label}
                                                </button>
                                            ))}
                                            <button onClick={loadBugReports} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white shrink-0 border border-white/10 ml-1">
                                                <RefreshCw className={cn('w-4 h-4', bugsLoading && 'animate-spin')} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* ── Bug Reports Grid ── */}
                                    {bugsLoading ? (
                                        <div className="p-16 text-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-slate-500 mx-auto" />
                                        </div>
                                    ) : filteredBugs.length === 0 ? (
                                        <div className="p-16 rounded-3xl bg-white/[0.02] border border-white/5 text-center space-y-2">
                                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                                            <p className="text-sm font-bold text-slate-300">Aucun bug signalé dans cette section</p>
                                            <p className="text-xs text-slate-500">Tous les dysfonctionnements signalés avec capture s&apos;afficheront ici.</p>
                                        </div>
                                    ) : (
                                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {filteredBugs.map(bug => (
                                                <div key={bug.id} className="p-4 rounded-3xl bg-[#0F1420] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-3">
                                                    <div className="space-y-2.5">
                                                        {/* Header reporter */}
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <p className="font-bold text-xs text-white">{bug.user_name || 'Utilisateur'}</p>
                                                                <p className="text-[10px] text-slate-400">
                                                                    {bug.user_role === 'student' ? '🎓 Étudiant' : bug.user_role === 'teacher' ? '👨‍🏫 Professeur' : '🛡️ Admin'} • {bug.org_name || bug.org_slug || 'école'}
                                                                </p>
                                                            </div>
                                                            <span className={cn(
                                                                'text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0',
                                                                bug.status === 'resolved' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                                                                bug.status === 'in_progress' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                                                                'bg-red-500/15 text-red-300 border border-red-500/30'
                                                            )}>
                                                                {bug.status === 'resolved' ? '🟢 Résolu' : bug.status === 'in_progress' ? '🟡 En cours' : '🔴 Ouvert'}
                                                            </span>
                                                        </div>

                                                        {/* Title & Desc */}
                                                        <div>
                                                            <h4 className="font-black text-xs text-slate-200">{bug.title}</h4>
                                                            <p className="text-xs text-slate-400 mt-1 leading-relaxed whitespace-pre-wrap">{bug.description}</p>
                                                        </div>

                                                        {/* Screenshot Thumbnail */}
                                                        {bug.screenshot_url && (
                                                            <div className="relative rounded-xl overflow-hidden border border-white/10 group cursor-pointer" onClick={() => setSelectedBug(bug)}>
                                                                <img src={bug.screenshot_url} alt="Capture d'écran du bug" className="w-full h-36 object-cover bg-black/40 group-hover:scale-105 transition-transform" />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs text-white font-bold">
                                                                    <Eye className="w-4 h-4" /> Agrandir la capture
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Status Action Bar */}
                                                    <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                                                        <span className="text-[10px] text-slate-500">
                                                            {new Date(bug.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                                        </span>
                                                        <div className="flex gap-1">
                                                            {bug.status !== 'in_progress' && bug.status !== 'resolved' && (
                                                                <button
                                                                    onClick={() => updateBugStatus(bug.id, 'in_progress')}
                                                                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-[10px] font-bold border border-amber-500/30 transition-all"
                                                                >
                                                                    Traiter
                                                                </button>
                                                            )}
                                                            {bug.status !== 'resolved' && (
                                                                <button
                                                                    onClick={() => updateBugStatus(bug.id, 'resolved')}
                                                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 transition-all"
                                                                >
                                                                    Résoudre
                                                                </button>
                                                            )}
                                                            {bug.status === 'resolved' && (
                                                                <button
                                                                    onClick={() => updateBugStatus(bug.id, 'open')}
                                                                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-[10px] font-bold transition-all"
                                                                >
                                                                    Rouvrir
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* ── Screenshot Lightbox Modal ── */}
                                    {selectedBug && (
                                        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedBug(null)}>
                                            <div className="relative max-w-4xl max-h-[90vh] bg-[#0E131F] border border-white/15 rounded-3xl p-5 overflow-hidden shadow-2xl space-y-3" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h3 className="font-bold text-sm text-white">{selectedBug.title}</h3>
                                                        <p className="text-[11px] text-slate-400">Capture fournie par {selectedBug.user_name}</p>
                                                    </div>
                                                    <button onClick={() => setSelectedBug(null)} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="max-h-[70vh] overflow-auto rounded-2xl border border-white/10">
                                                    <img src={selectedBug.screenshot_url} alt="Capture" className="w-full object-contain" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })()}

                        {/* ══════════════════════════════════════════
                            MARKETING & CROISSANCE IA
                        ══════════════════════════════════════════ */}
                        {tab === 'marketing' && (
                            <motion.div key="marketing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                <MarketingHub />
                            </motion.div>
                        )}

                        {/* ══════════════════════════════════════════
                            DAME SKY SUPERADMIN CENTER
                        ══════════════════════════════════════════ */}
                        {tab === 'sky_agent' && (
                            <motion.div key="sky_agent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-10">
                                <DameSkySuperadminManager />
                                <div className="pt-6 border-t border-white/10">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <Crown className="w-5 h-5 text-amber-400" />
                                        Clés d'Accès d'Agents IA & Outils Autonomes de la Plateforme
                                    </h3>
                                    <SkyAgentSuperadminManager />
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>

                </div>
            </main>

            {/* ─── Mobile bottom nav ──────────────────────────────── */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#080B12]/95 backdrop-blur-xl border-t border-white/[0.06] flex items-stretch">
                {SIDEBAR.slice(0, 5).map(item => (
                    <button key={item.id}
                        onClick={() => { setTab(item.id); setSearch(''); }}
                        className={cn(
                            'flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-all',
                            tab === item.id ? 'text-violet-300' : 'text-slate-600 hover:text-slate-400'
                        )}>
                        <span className="text-lg leading-none">{item.emoji}</span>
                        <span className="text-[9px] font-semibold leading-none mt-0.5 truncate max-w-[52px]">{item.label.split(' ')[0]}</span>
                        {tab === item.id && (
                            <span className="absolute bottom-0 w-6 h-0.5 rounded-full bg-violet-400" />
                        )}
                    </button>
                ))}
            </nav>

            {/* ─── Delete Confirm Modal ─────────────────────────────── */}
            <AnimatePresence>
                {deleteConfirm && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => !deleting && setDeleteConfirm(null)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#0F1117] border border-red-500/25 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                            <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="font-black text-lg text-center">Supprimer l&apos;organisation ?</h3>
                            <p className="text-sm text-slate-400 text-center mt-2">
                                <strong className="text-white">{deleteConfirm.name}</strong> et toutes ses données
                                (étudiants, cours, notes...) seront <span className="text-red-400 font-bold">définitivement supprimés</span>.
                            </p>
                            <p className="text-xs text-slate-600 text-center mt-2">Cette action est irréversible.</p>
                            <div className="flex gap-3 mt-5">
                                <Button onClick={() => setDeleteConfirm(null)} disabled={deleting} variant="outline"
                                    className="flex-1 border-white/10 text-slate-300 hover:bg-white/5 rounded-xl">
                                    Annuler
                                </Button>
                                <Button onClick={handleDeleteOrg} disabled={deleting}
                                    className="flex-1 bg-red-600 hover:bg-red-500 font-bold rounded-xl">
                                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : '🗑️ Supprimer'}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// ADS TAB COMPONENT — Gestion des publicités
// ═══════════════════════════════════════════════════════════════
function AdsTab({ supabase }: { supabase: any }) {
    const [ads, setAds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedAd, setSelectedAd] = useState<any>(null);
    const [adViews, setAdViews] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        title: '',
        description: '',
        media_url: '',
        media_type: 'image' as 'image' | 'video' | 'story',
        placement_zone: 'feed' as 'feed' | 'banner' | 'story' | 'popup' | 'rewarded',
        link_url: '',
        sky_points_reward: 1,
        min_watch_seconds: 5,
        is_active: true,
        ends_at: '',
    });

    const loadAds = async () => {
        setLoading(true);
        const { data } = await supabase.from('advertisements').select('*').order('created_at', { ascending: false });
        setAds(data || []);
        setLoading(false);
    };

    useEffect(() => { loadAds(); }, []);

    // Upload file to Cloudflare R2 (no RLS, no Supabase Storage limits)
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const isVideo = file.type.startsWith('video/');
        setUploading(true);
        try {
            const result = await uploadToR2(file, 'ads-media', file.name);
            setForm(p => ({ ...p, media_url: result.url, media_type: isVideo ? 'video' : 'image' }));
            toast.success('✅ Fichier uploadé sur Cloudflare R2 !');
        } catch (err: any) {
            toast.error('Erreur upload: ' + err.message);
        }
        setUploading(false);
    };

    const createAd = async () => {
        if (!form.title || !form.media_url) { toast.error('Titre et média requis'); return; }
        setSaving(true);
        const { error } = await supabase.from('advertisements').insert({
            title: form.title.trim(),
            description: form.description.trim() || null,
            media_url: form.media_url.trim(),
            media_type: form.media_type,
            placement_zone: form.placement_zone,
            link_url: form.link_url.trim() || null,
            sky_points_reward: form.sky_points_reward,
            min_watch_seconds: form.min_watch_seconds,
            is_active: form.is_active,
            ends_at: form.ends_at || null,
            created_by: 'superadmin',
        });
        if (!error) {
            toast.success('📺 Publicité créée !');
            setShowForm(false);
            setForm({ title: '', description: '', media_url: '', media_type: 'image', placement_zone: 'feed', link_url: '', sky_points_reward: 1, min_watch_seconds: 5, is_active: true, ends_at: '' });
            loadAds();
        } else toast.error('Erreur: ' + error.message);
        setSaving(false);
    };

    const toggleActive = async (id: string, current: boolean) => {
        await supabase.from('advertisements').update({ is_active: !current }).eq('id', id);
        setAds(prev => prev.map(a => a.id === id ? { ...a, is_active: !current } : a));
        toast.success(current ? 'Publicité désactivée' : 'Publicité activée ✅');
    };

    const deleteAd = async (id: string) => {
        await supabase.from('advertisements').delete().eq('id', id);
        setAds(prev => prev.filter(a => a.id !== id));
        toast.success('Publicité supprimée');
    };

    const openStats = async (ad: any) => {
        setSelectedAd(ad);
        const { data } = await supabase.from('ad_views').select('*').eq('ad_id', ad.id).order('viewed_at', { ascending: false });
        setAdViews(data || []);
    };

    const MEDIA_TYPES = [
        { id: 'image', label: 'Image',  icon: '🖼️' },
        { id: 'video', label: 'Vidéo',  icon: '🎬' },
        { id: 'story', label: 'Story',  icon: '📱' },
    ];

    const PLACEMENT_ZONES = [
        {
            id: 'feed',
            label: 'Feed',
            icon: '📰',
            color: 'blue',
            desc: 'Dans le fil d\'actualité des étudiants',
            size: '1200×628 px',
            format: 'Image / Vidéo'
        },
        {
            id: 'banner',
            label: 'Bannière',
            icon: '📏',
            color: 'teal',
            desc: 'Bande horizontale en haut de page',
            size: '728×90 px',
            format: 'Image'
        },
        {
            id: 'story',
            label: 'Story',
            icon: '📱',
            color: 'pink',
            desc: 'Format plein écran vertical (stories)',
            size: '1080×1920 px',
            format: 'Image / Vidéo'
        },
        {
            id: 'popup',
            label: 'Pop-up',
            icon: '💬',
            color: 'orange',
            desc: 'Fenêtre modale au centre de l\'écran',
            size: '600×400 px',
            format: 'Image'
        },
        {
            id: 'rewarded',
            label: 'Récompensée',
            icon: '🎁',
            color: 'amber',
            desc: 'Pub optionnelle près du bouton Story — gains Sky Points',
            size: 'Plein écran',
            format: 'Image / Vidéo'
        },
    ];

    const zoneColorMap: Record<string, string> = {
        blue:   'bg-blue-500/20 border-blue-500/40 text-blue-300',
        teal:   'bg-teal-500/20 border-teal-500/40 text-teal-300',
        pink:   'bg-pink-500/20 border-pink-500/40 text-pink-300',
        orange: 'bg-orange-500/20 border-orange-500/40 text-orange-300',
        amber:  'bg-amber-500/20 border-amber-500/40 text-amber-300',
    };

    return (
        <motion.div key="ads" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        📺 Gestion des Publicités
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Les étudiants gagnent <span className="text-amber-400 font-bold">1 Sky Point</span> après 5s de visionnage minimum.
                    </p>
                </div>
                <Button onClick={() => setShowForm(v => !v)}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl gap-2">
                    <Plus className="w-4 h-4" />Nouvelle pub
                </Button>
            </div>

            {/* Infos */}
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 text-xs text-amber-200 space-y-1">
                <p className="font-bold flex items-center gap-2"><Gift className="w-3.5 h-3.5" /> Fonctionnement</p>
                <p className="text-slate-400 leading-relaxed">
                    Les publicités s'affichent dans le feed des étudiants. Après avoir regardé au moins <strong className="text-white">5 secondes</strong>,
                    l'étudiant reçoit automatiquement <strong className="text-amber-400">1 Sky Point</strong> (configurable). 
                    Maximum 1 récompense par publicité par utilisateur.
                </p>
            </div>

            {/* Create Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="p-5 rounded-2xl bg-white/[0.03] border border-violet-500/20 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm text-white flex items-center gap-2">
                                <Target className="w-4 h-4 text-violet-400" />Créer une publicité
                            </h3>
                            <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                        </div>

                        {/* Zone de placement */}
                        <div>
                            <label className="text-xs text-slate-400 mb-2 block font-semibold uppercase tracking-wide">📍 Zone de placement</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {PLACEMENT_ZONES.map(z => {
                                    const isActive = form.placement_zone === z.id;
                                    const colorClass = isActive ? zoneColorMap[z.color] : 'bg-white/[0.03] border-white/10 text-slate-400';
                                    return (
                                        <button key={z.id} onClick={() => setForm(p => ({ ...p, placement_zone: z.id as any }))}
                                            className={cn('flex items-start gap-3 p-3 rounded-xl border text-left transition-all', colorClass)}>
                                            <span className="text-xl mt-0.5">{z.icon}</span>
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold leading-none">{z.label}</div>
                                                <div className="text-[10px] mt-1 opacity-70 leading-snug">{z.desc}</div>
                                                <div className="flex gap-2 mt-1.5">
                                                    <span className="text-[9px] bg-black/30 px-1.5 py-0.5 rounded-full">{z.size}</span>
                                                    <span className="text-[9px] bg-black/30 px-1.5 py-0.5 rounded-full">{z.format}</span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Type de média */}
                        <div>
                            <label className="text-xs text-slate-400 mb-2 block">Type de média</label>
                            <div className="flex gap-2">
                                {MEDIA_TYPES.map(t => (
                                    <button key={t.id} onClick={() => setForm(p => ({ ...p, media_type: t.id as any }))}
                                        className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all',
                                            form.media_type === t.id ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white')}>
                                        {t.icon} {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Title & Description */}
                        <div className="grid grid-cols-1 gap-3">
                            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                placeholder="Titre de la publicité *" className="bg-white/[0.05] border-white/10 text-white rounded-xl" />
                            <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                placeholder="Description (optionnel)" className="bg-white/[0.05] border-white/10 text-white rounded-xl" />
                        </div>

                        {/* Upload Media */}
                        <div>
                            <label className="text-xs text-slate-400 mb-2 block">Média (image ou vidéo) *</label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,video/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            {form.media_url ? (
                                <div className="relative rounded-xl overflow-hidden border border-emerald-500/30 bg-emerald-500/5">
                                    {form.media_type === 'video' ? (
                                        <video src={form.media_url} className="w-full max-h-40 object-contain" muted playsInline />
                                    ) : (
                                        <img src={form.media_url} alt="preview" className="w-full max-h-40 object-contain" />
                                    )}
                                    <button onClick={() => setForm(p => ({ ...p, media_url: '' }))}
                                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white">
                                        <X className="w-3 h-3" />
                                    </button>
                                    <div className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 bg-black/60 text-emerald-300 rounded-full">✓ Uploadé</div>
                                </div>
                            ) : (
                                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                                    className="w-full h-24 rounded-xl border-2 border-dashed border-white/15 hover:border-violet-500/40 transition-all flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-violet-300 disabled:opacity-50">
                                    {uploading ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /><span className="text-xs">Upload en cours…</span></>
                                    ) : (
                                        <><ImageIcon className="w-6 h-6" /><span className="text-xs font-medium">Cliquer pour uploader image ou vidéo</span><span className="text-[10px] text-slate-600">JPG, PNG, GIF, MP4, MOV…</span></>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Lien de clic optionnel */}
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                            <Input value={form.link_url} onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))}
                                placeholder="Lien de redirection au clic (optionnel)" className="bg-white/[0.05] border-white/10 text-white rounded-xl pl-9" />
                        </div>

                        {/* Sky Points & Duration */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" /> Sky Points offerts</label>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setForm(p => ({ ...p, sky_points_reward: Math.max(0, p.sky_points_reward - 1) }))} className="w-8 h-8 rounded-lg bg-white/[0.05] text-slate-300 hover:bg-white/10"><Minus className="w-3 h-3 mx-auto" /></button>
                                    <span className="flex-1 text-center font-bold text-amber-400 text-lg">{form.sky_points_reward}</span>
                                    <button onClick={() => setForm(p => ({ ...p, sky_points_reward: p.sky_points_reward + 1 }))} className="w-8 h-8 rounded-lg bg-white/[0.05] text-slate-300 hover:bg-white/10"><Plus className="w-3 h-3 mx-auto" /></button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1"><Clock className="w-3 h-3" /> Durée min. (secondes)</label>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setForm(p => ({ ...p, min_watch_seconds: Math.max(1, p.min_watch_seconds - 1) }))} className="w-8 h-8 rounded-lg bg-white/[0.05] text-slate-300 hover:bg-white/10"><Minus className="w-3 h-3 mx-auto" /></button>
                                    <span className="flex-1 text-center font-bold text-white text-lg">{form.min_watch_seconds}s</span>
                                    <button onClick={() => setForm(p => ({ ...p, min_watch_seconds: p.min_watch_seconds + 1 }))} className="w-8 h-8 rounded-lg bg-white/[0.05] text-slate-300 hover:bg-white/10"><Plus className="w-3 h-3 mx-auto" /></button>
                                </div>
                            </div>
                        </div>

                        {/* Expire date */}
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Date d'expiration (optionnel)</label>
                            <Input type="datetime-local" value={form.ends_at} onChange={e => setForm(p => ({ ...p, ends_at: e.target.value }))}
                                className="bg-white/[0.05] border-white/10 text-white rounded-xl" />
                        </div>

                        <Button onClick={createAd} disabled={saving || !form.title || !form.media_url}
                            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl h-11">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            {saving ? 'Création...' : 'Créer la publicité'}
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ads List */}
            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
            ) : ads.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                    <span className="text-4xl mb-3 block">📺</span>
                    <p className="font-medium">Aucune publicité créée</p>
                    <p className="text-xs mt-1">Créez votre première publicité pour commencer</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {ads.map(ad => (
                        <motion.div key={ad.id} layout className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden">
                            <div className="flex gap-4 p-4">
                                {/* Media preview */}
                                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-white/[0.06] flex items-center justify-center">
                                    {ad.media_url ? (
                                        <img src={ad.media_url} alt={ad.title} className="w-full h-full object-cover" onError={e => { (e.target as any).style.display = 'none'; }} />
                                    ) : (
                                        <span className="text-2xl">{ad.media_type === 'video' ? '🎬' : ad.media_type === 'story' ? '📱' : '🖼️'}</span>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-bold text-white text-sm truncate">{ad.title}</h3>
                                                <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-bold',
                                                    ad.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>
                                                    {ad.is_active ? '● Actif' : '● Inactif'}
                                                </span>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-medium">
                                                    {ad.media_type}
                                                </span>
                                                {ad.placement_zone && (
                                                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                                                        ad.placement_zone === 'rewarded' ? 'bg-amber-500/20 text-amber-400' :
                                                        ad.placement_zone === 'banner'   ? 'bg-teal-500/20 text-teal-400' :
                                                        ad.placement_zone === 'story'    ? 'bg-pink-500/20 text-pink-400' :
                                                        ad.placement_zone === 'popup'    ? 'bg-orange-500/20 text-orange-400' :
                                                        'bg-blue-500/20 text-blue-400')}>
                                                        📍 {ad.placement_zone}
                                                    </span>
                                                )}
                                            </div>
                                            {ad.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{ad.description}</p>}
                                        </div>
                                    </div>

                                    {/* Stats row */}
                                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <Eye className="w-3 h-3" />{ad.total_views || 0} vues
                                        </span>
                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <ExternalLink className="w-3 h-3" />{ad.total_clicks || 0} clics
                                        </span>
                                        <span className="text-[10px] text-amber-400 flex items-center gap-1">
                                            <Star className="w-3 h-3" />{ad.sky_points_reward} pts après {ad.min_watch_seconds}s
                                        </span>
                                        {ad.ends_at && (
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />expire {new Date(ad.ends_at).toLocaleDateString('fr-FR')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 px-4 py-2 border-t border-white/[0.05] bg-white/[0.02]">
                                <button onClick={() => openStats(ad)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 text-[11px] transition-all">
                                    <BarChart3 className="w-3 h-3" />Stats
                                </button>
                                <button onClick={() => toggleActive(ad.id, ad.is_active)}
                                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] transition-all',
                                        ad.is_active ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400')}>
                                    {ad.is_active ? <><EyeOff className="w-3 h-3" />Désactiver</> : <><Eye className="w-3 h-3" />Activer</>}
                                </button>
                                <button onClick={() => deleteAd(ad.id)}
                                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] transition-all">
                                    <Trash2 className="w-3 h-3" />Supprimer
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Stats Modal */}
            <AnimatePresence>
                {selectedAd && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4"
                        onClick={() => setSelectedAd(null)}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#0f1117] border border-indigo-500/20 rounded-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-indigo-400" /></div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-white">Statistiques</h3>
                                    <p className="text-xs text-slate-400 truncate">{selectedAd.title}</p>
                                </div>
                                <button onClick={() => setSelectedAd(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                            </div>

                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-3 mb-5">
                                {[
                                    { label: 'Vues totales', value: adViews.length, color: 'indigo' },
                                    { label: 'Complétées', value: adViews.filter(v => v.completed).length, color: 'emerald' },
                                    { label: 'Points donnés', value: adViews.filter(v => v.points_awarded).length, color: 'amber' },
                                ].map(s => (
                                    <div key={s.label} className={cn('rounded-xl p-3 text-center border',
                                        s.color === 'indigo' ? 'bg-indigo-500/10 border-indigo-500/20' :
                                        s.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20' :
                                        'bg-amber-500/10 border-amber-500/20')}>
                                        <p className="text-xl font-bold text-white">{s.value}</p>
                                        <p className="text-[10px] text-slate-400">{s.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Views list */}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-slate-300 mb-2">Détail des vues</p>
                                {adViews.length === 0 ? (
                                    <p className="text-center text-slate-500 text-xs py-6">Aucune vue enregistrée</p>
                                ) : adViews.map(v => (
                                    <div key={v.id} className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
                                        <div>
                                            <p className="text-xs text-white font-medium">{v.user_id.slice(0, 12)}...</p>
                                            <p className="text-[10px] text-slate-500">{new Date(v.viewed_at).toLocaleString('fr-FR')}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-400">{v.watched_seconds}s</span>
                                            {v.completed && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">✓ Vu</span>}
                                            {v.points_awarded && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">⭐ +{selectedAd.sky_points_reward}</span>}
                                            {v.clicked && <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full">↗ Cliqué</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─── EmailProvidersPanel ──────────────────────────────────────────────────────
function EmailProvidersPanel({ workerUrl }: { workerUrl: string }) {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true); setError(null);
        try {
            const { data: { session: authSession } } = await supabase.auth.getSession();
            const token = authSession?.access_token || '';
            const res = await fetch(`${workerUrl}/api/email/status`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setStatus(await res.json());
        } catch (e: any) { setError(e.message); }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const pct = (val: number, max: number) => Math.min(100, Math.round((val / max) * 100));

    return (
        <motion.div key="email" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-black text-xl text-white flex items-center gap-2">
                        📧 Email Providers
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Dual-provider automatique · Invisible pour les utilisateurs</p>
                </div>
                <button onClick={load} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition">
                    <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1,2].map(i => <div key={i} className="h-48 rounded-2xl bg-white/[0.03] animate-pulse border border-white/5" />)}
                </div>
            )}

            {error && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    ⚠️ {error} — Vérifiez que le Worker est déployé et que ADMIN_KEY est configuré.
                </div>
            )}

            {status && (
                <>
                    {/* Active provider banner */}
                    <div className={`p-4 rounded-2xl border flex items-center gap-4 ${
                        status.active_provider === 'resend'
                            ? 'bg-indigo-500/10 border-indigo-500/25'
                            : status.active_provider === 'brevo'
                            ? 'bg-amber-500/10 border-amber-500/25'
                            : 'bg-red-500/10 border-red-500/20'
                    }`}>
                        <div className="text-2xl">
                            {status.active_provider === 'resend' ? '🟢' : status.active_provider === 'brevo' ? '🟡' : '🔴'}
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-white text-sm">
                                Provider actif : <span className="uppercase">{status.active_provider}</span>
                                {status.failover_triggered && (
                                    <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">⚡ Failover déclenché</span>
                                )}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {status.total_sent_today} / {status.total_capacity_today} emails envoyés aujourd'hui
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-black text-white">{status.total_capacity_today - status.total_sent_today}</p>
                            <p className="text-[10px] text-slate-500">restants ce jour</p>
                        </div>
                    </div>

                    {/* Provider cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Resend */}
                        {(() => {
                            const r = status.providers?.resend;
                            if (!r) return null;
                            const used_pct = pct(r.sent_today, r.daily_limit);
                            return (
                                <div className={`p-5 rounded-2xl border space-y-4 ${r.status === 'active' ? 'bg-white/[0.03] border-white/10' : 'bg-red-500/5 border-red-500/15'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-sm">📨</div>
                                            <div>
                                                <p className="font-bold text-white text-sm">Resend</p>
                                                <p className="text-[10px] text-slate-500">resend.com</p>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                                            !r.configured ? 'bg-slate-500/20 text-slate-400' :
                                            r.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                            {!r.configured ? '⚙ Non configuré' : r.status === 'active' ? '● Actif' : '⚠ Quota dépassé'}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                                            <span>{r.sent_today} envoyés</span>
                                            <span>{r.daily_limit}/j</span>
                                        </div>
                                        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-700 ${used_pct >= 100 ? 'bg-red-500' : used_pct >= 75 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                                                style={{ width: `${used_pct}%` }} />
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1">{r.remaining} emails restants · {used_pct}% utilisé</p>
                                    </div>
                                    {!r.configured && (
                                        <p className="text-[11px] text-indigo-300 bg-indigo-500/10 rounded-xl px-3 py-2">
                                            👉 Ajoutez <code className="bg-white/10 px-1 rounded">RESEND_API_KEY</code> dans Cloudflare Worker secrets
                                        </p>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Brevo */}
                        {(() => {
                            const b = status.providers?.brevo;
                            if (!b) return null;
                            const used_pct = pct(b.sent_today, b.daily_limit);
                            return (
                                <div className={`p-5 rounded-2xl border space-y-4 ${b.status === 'active' ? 'bg-white/[0.03] border-white/10' : 'bg-red-500/5 border-red-500/15'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-sm">✉️</div>
                                            <div>
                                                <p className="font-bold text-white text-sm">Brevo</p>
                                                <p className="text-[10px] text-slate-500">brevo.com (ex-Sendinblue)</p>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                                            !b.configured ? 'bg-slate-500/20 text-slate-400' :
                                            b.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                            {!b.configured ? '⚙ Non configuré' : b.status === 'active' ? '● Backup prêt' : '⚠ Quota dépassé'}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                                            <span>{b.sent_today} envoyés</span>
                                            <span>{b.daily_limit}/j</span>
                                        </div>
                                        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-700 ${used_pct >= 100 ? 'bg-red-500' : used_pct >= 75 ? 'bg-amber-500' : 'bg-amber-500'}`}
                                                style={{ width: `${used_pct}%` }} />
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1">{b.remaining} emails restants · {used_pct}% utilisé</p>
                                    </div>
                                    {!b.configured && (
                                        <p className="text-[11px] text-amber-300 bg-amber-500/10 rounded-xl px-3 py-2">
                                            👉 Ajoutez <code className="bg-white/10 px-1 rounded">BREVO_API_KEY</code> dans Cloudflare Worker secrets pour activer le failover
                                        </p>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Info box */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                        <p className="text-xs font-semibold text-slate-300">ℹ️ Fonctionnement du failover</p>
                        <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                            <li>Resend est le provider principal (100 emails/jour gratuits)</li>
                            <li>Si Resend retourne une erreur de quota → basculement automatique vers Brevo</li>
                            <li>Brevo offre 300 emails/jour gratuits en backup</li>
                            <li>Total combiné : <strong className="text-white">400 emails/jour</strong> gratuitement</li>
                            <li>Les utilisateurs ne voient jamais quel provider est utilisé</li>
                            <li>Les compteurs se réinitialisent automatiquement chaque jour à minuit</li>
                        </ul>
                    </div>

                    {/* How to add Brevo key */}
                    <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/15 text-xs text-slate-400 space-y-2">
                        <p className="text-violet-300 font-semibold">⚙️ Ajouter la clé Brevo</p>
                        <p>1. Créez un compte sur <a href="https://brevo.com" target="_blank" rel="noreferrer" className="text-violet-400 underline">brevo.com</a> → Gratuit, 300 mails/j</p>
                        <p>2. Dashboard Brevo → SMTP & API → API Keys → Créer une clé</p>
                        <p>3. Dashboard Cloudflare Workers → campusflow-worker → Settings → Variables & Secrets</p>
                        <p>4. Ajoutez le secret : <code className="bg-white/10 px-1 rounded">BREVO_API_KEY</code> = votre clé API Brevo</p>
                        <p>5. Le failover s'active automatiquement — aucun redéploiement requis</p>
                    </div>
                </>
            )}
        </motion.div>
    );
}

// ─── CompteEmail ─────────────────────────────────────────────────────────────
function CompteEmail({ supabase }: { supabase: any }) {
    const [email, setEmail] = useState('');
    useEffect(() => {
        supabase.auth.getUser().then(({ data }: any) => {
            if (data?.user?.email) setEmail(data.user.email);
        });
    }, []);
    return <span>{email || '…'}</span>;
}

// ─── ComptePasswordForm ───────────────────────────────────────────────────────
function ComptePasswordForm({ supabase }: { supabase: any }) {
    const [newPwd,     setNewPwd]     = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [loading,    setLoading]    = useState(false);
    const [showNew,    setShowNew]    = useState(false);
    const [showConf,   setShowConf]   = useState(false);

    const strength = newPwd.length === 0 ? 0 : newPwd.length < 6 ? 1 : newPwd.length < 10 ? 2 : /[A-Z]/.test(newPwd) && /[0-9]/.test(newPwd) ? 4 : 3;
    const strengthLabel = ['', 'Trop court', 'Faible', 'Moyen', 'Fort'][strength];
    const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'][strength];

    const handleChange = async () => {
        if (newPwd.length < 6) { toast.error('Mot de passe trop court (min. 6 caractères)'); return; }
        if (newPwd !== confirmPwd) { toast.error('Les mots de passe ne correspondent pas'); return; }
        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password: newPwd });
        if (error) toast.error(error.message);
        else { toast.success('✅ Mot de passe modifié avec succès !'); setNewPwd(''); setConfirmPwd(''); }
        setLoading(false);
    };

    return (
        <div className="space-y-4">
            <div className="border-t border-white/[0.06] pt-4">
                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-3">Nouveau mot de passe</p>
                <div className="space-y-3">
                    <div className="relative">
                        <input type={showNew ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)}
                            placeholder="Nouveau mot de passe"
                            className="w-full px-3 py-2.5 pr-10 rounded-xl bg-white/[0.05] border border-white/[0.10] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-all" />
                        <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">{showNew ? '🙈' : '👁️'}</button>
                    </div>
                    {newPwd.length > 0 && (
                        <div className="space-y-1">
                            <div className="flex gap-1">
                                {[1,2,3,4].map(lvl => <div key={lvl} className="flex-1 h-1.5 rounded-full transition-all" style={{ background: strength >= lvl ? strengthColor : '#1e293b' }} />)}
                            </div>
                            <p className="text-[10px] font-semibold" style={{ color: strengthColor }}>{strengthLabel}</p>
                        </div>
                    )}
                    <div className="relative">
                        <input type={showConf ? 'text' : 'password'} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                            placeholder="Confirmer le mot de passe"
                            className={`w-full px-3 py-2.5 pr-10 rounded-xl bg-white/[0.05] border text-sm text-white placeholder-slate-600 focus:outline-none transition-all ${confirmPwd && confirmPwd !== newPwd ? 'border-red-500/50' : confirmPwd && confirmPwd === newPwd ? 'border-emerald-500/50' : 'border-white/[0.10] focus:border-violet-500/50'}`} />
                        <button type="button" onClick={() => setShowConf(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">{showConf ? '🙈' : '👁️'}</button>
                    </div>
                    {confirmPwd && confirmPwd !== newPwd && <p className="text-[10px] text-red-400">❌ Les mots de passe ne correspondent pas</p>}
                    {confirmPwd && confirmPwd === newPwd && <p className="text-[10px] text-emerald-400">✅ Correspondent</p>}
                </div>
                <button onClick={handleChange} disabled={loading || newPwd.length < 6 || newPwd !== confirmPwd}
                    className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Modification...</> : '🔑 Modifier le mot de passe'}
                </button>
            </div>
        </div>
    );
}

// ─── PlatformDomainForm ───────────────────────────────────────────────────────
// Superadmin configure son domaine principal UNE SEULE FOIS.
// Tous les admins d'école voient automatiquement le bon CNAME à pointer.
// Fonctionne avec n'importe quel TLD (.com, .site, .shop...) et n'importe
// quel registrar (Hostinger, OVH, GoDaddy, Namecheap, Cloudflare...).
function PlatformDomainForm({ supabase }: { supabase: any }) {
    const [domain,  setDomain]  = useState('');
    const [saved,   setSaved]   = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('platform_settings').select('value').eq('key', 'main_domain').single();
            if (data?.value) { setDomain(data.value); setSaved(data.value); }
        })();
    }, []);

    const save = async () => {
        const val = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
        if (!val) { toast.error('Entrez un domaine'); return; }
        setLoading(true);
        const { error } = await supabase.from('platform_settings')
            .upsert({ key: 'main_domain', value: val, description: 'Domaine principal CampusFlow', updated_at: new Date().toISOString() });
        if (error) toast.error(error.message);
        else { setSaved(val); setDomain(val); toast.success(`✅ Domaine principal mis à jour : ${val}`); }
        setLoading(false);
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                    placeholder="campusflw.site ou monapp.com"
                    className="flex-1 px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.10] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-all"
                />
                <button onClick={save} disabled={loading || !domain.trim() || domain.trim() === saved}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shrink-0">
                    {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '💾'} Sauvegarder
                </button>
            </div>
            {saved && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg">
                    <span className="text-emerald-500">✓</span>
                    Domaine actif : <strong className="font-mono">{saved}</strong>
                    <span className="text-slate-500 ml-1">— Les clients pointent leur CNAME vers cette valeur</span>
                </div>
            )}
            <p className="text-[10px] text-slate-600">
                Exemples valides : <code className="text-slate-500">campusflw.site</code>, <code className="text-slate-500">monapp.com</code>, <code className="text-slate-500">campus.mongroupe.fr</code>
            </p>
        </div>
    );
}

// ─── PlatformDomainCard ──────────────────────────────────────────────────────
// Carte DNS dans l'onglet Domaines — affichage + modification inline du domaine
function PlatformDomainCard({ supabase }: { supabase: any }) {
    const [domain,   setDomain]   = useState('');
    const [editing,  setEditing]  = useState(false);
    const [input,    setInput]    = useState('');
    const [loading,  setLoading]  = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('platform_settings').select('value').eq('key', 'main_domain').single();
            const val = data?.value || 'iziteach.com';
            setDomain(val); setInput(val); setFetching(false);
        })();
    }, []);

    const save = async () => {
        const val = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
        if (!val) return;
        setLoading(true);
        const { error } = await supabase.from('platform_settings')
            .upsert({ key: 'main_domain', value: val, description: 'Domaine principal IziTeach', updated_at: new Date().toISOString() });
        if (error) { toast.error(error.message); }
        else { setDomain(val); setEditing(false); toast.success('\u2705 Domaine mis \u00e0 jour : ' + val); }
        setLoading(false);
    };

    const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copi\u00e9 !'); };

    return (
        <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/15 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs font-bold text-violet-400 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" /> Configuration DNS — domaine principal de la plateforme
                </p>
                {!editing ? (
                    <button onClick={() => { setInput(domain); setEditing(true); }}
                        className="text-[11px] px-3 py-1.5 rounded-lg bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 transition-all flex items-center gap-1.5 font-medium">
                        ✏️ Modifier le domaine
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={() => setEditing(false)} className="text-[11px] px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 transition-all">Annuler</button>
                        <button onClick={save} disabled={loading || !input.trim()}
                            className="text-[11px] px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-all flex items-center gap-1.5 disabled:opacity-50 font-medium">
                            {loading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null} 💾 Sauvegarder
                        </button>
                    </div>
                )}
            </div>

            {/* Edit input */}
            {editing && (
                <input type="text" value={input} onChange={e => setInput(e.target.value)}
                    placeholder="ex: campusflw.site ou monapp.com"
                    className="w-full px-3 py-2.5 rounded-xl bg-black/30 border border-violet-500/30 text-sm text-white font-mono focus:outline-none focus:border-violet-400 transition-all" />
            )}

            {/* Column headers */}
            <div className="grid grid-cols-[60px_80px_1fr] gap-2 text-[10px] text-slate-500 font-semibold uppercase tracking-wider px-1">
                <span>Type</span><span>Host</span><span>Valeur cible</span>
            </div>

            {fetching ? (
                <div className="h-8 flex items-center gap-2 text-xs text-slate-500">
                    <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /> Chargement…
                </div>
            ) : (
                <>
                    {/* A record — root domain */}
                    <div className="grid grid-cols-[60px_80px_1fr] gap-2 items-center text-[11px] font-mono bg-black/30 rounded-xl p-2.5 border border-white/5">
                        <span className="text-amber-300 font-bold">A</span>
                        <span className="text-white">@</span>
                        <div className="flex items-center gap-2">
                            <span className="text-teal-300">75.2.60.5</span>
                            <button onClick={() => copy('75.2.60.5')} className="text-slate-600 hover:text-white transition-colors"><Copy className="w-3 h-3" /></button>
                        </div>
                    </div>
                    {/* CNAME — www */}
                    <div className="grid grid-cols-[60px_80px_1fr] gap-2 items-center text-[11px] font-mono bg-black/30 rounded-xl p-2.5 border border-white/5">
                        <span className="text-amber-300 font-bold">CNAME</span>
                        <span className="text-white">www</span>
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-teal-300 truncate">{domain}</span>
                            <button onClick={() => copy(domain)} className="text-slate-600 hover:text-white transition-colors shrink-0"><Copy className="w-3 h-3" /></button>
                        </div>
                    </div>
                </>
            )}

            <p className="text-[10px] text-slate-600">⏱ Propagation DNS : 10 min – 48h · Fonctionne avec Hostinger, OVH, GoDaddy, Namecheap, Cloudflare…</p>
        </div>
    );
}
