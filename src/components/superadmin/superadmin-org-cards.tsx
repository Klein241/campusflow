'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Search, Globe, CheckCircle2, AlertTriangle,
    Ban, RotateCcw, ExternalLink, Trash2, Edit3, ShieldCheck,
    Coins, Users, GraduationCap, School, Clock, Activity,
    Sparkles, ArrowRight, Eye, Phone, Mail, MapPin, X,
    Plus, Minus, Save, Loader2, Link2, Check, KeyRound,
    ShieldAlert, FileText, AlertCircle, RefreshCw, Lock,
    CheckCircle, UserCheck, EyeOff, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export interface OrgCardItem {
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
    owner_id?: string;
    sky_points?: number;
    phone?: string;
    email?: string;
    brand_color?: string;
    hero_template?: string;
    landing_layout?: string;
    // Certification badge system
    certification_badge?: 'none' | 'verified_physical' | 'verified_online' | null;
    badge_title?: string | null;
    is_online_academy?: boolean;
    verification_docs?: any[] | null;
}

interface SuperadminOrgCardsProps {
    orgs: OrgCardItem[];
    loading: boolean;
    onRefresh: () => void;
    onToggleActive: (org: OrgCardItem) => Promise<void>;
    onVerifyDomain: (org: OrgCardItem) => Promise<void>;
    onDeleteOrg: (org: OrgCardItem) => void;
}

export function SuperadminOrgCards({
    orgs,
    loading,
    onRefresh,
    onToggleActive,
    onVerifyDomain,
    onDeleteOrg
}: SuperadminOrgCardsProps) {
    const [search, setSearch] = useState('');
    const [filterTab, setFilterTab] = useState<'all' | 'active' | 'suspended' | 'domain' | 'traffic'>('all');

    // Modals
    const [editOrg, setEditOrg] = useState<OrgCardItem | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const [pointsModalOrg, setPointsModalOrg] = useState<OrgCardItem | null>(null);
    const [pointsDelta, setPointsDelta] = useState(1000);
    const [savingPoints, setSavingPoints] = useState(false);

    // Badge modal
    const [badgeModalOrg, setBadgeModalOrg] = useState<OrgCardItem | null>(null);
    const [savingBadge, setSavingBadge] = useState(false);
    const [badgeType, setBadgeType] = useState<'none' | 'verified_physical' | 'verified_online'>('none');
    const [badgeTitle, setBadgeTitle] = useState('');

    // Detail Modal (Feature 3: Full school roster & management)
    const [detailOrg, setDetailOrg] = useState<OrgCardItem | null>(null);
    const [detailStudents, setDetailStudents] = useState<any[]>([]);
    const [detailTeachers, setDetailTeachers] = useState<any[]>([]);
    const [detailPrograms, setDetailPrograms] = useState<any[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailTab, setDetailTab] = useState<'overview' | 'students' | 'teachers' | 'programs'>('overview');

    // Open detail modal & load rosters
    const openDetailModal = async (org: OrgCardItem) => {
        setDetailOrg(org);
        setDetailTab('overview');
        setDetailLoading(true);
        try {
            // Load students
            const { data: stData } = await supabase
                .from('student_profiles')
                .select('*')
                .or(`organization_id.eq.${org.id},org_slug.eq.${org.slug}`)
                .order('created_at', { ascending: false });
            setDetailStudents(stData || []);

            // Load teachers
            const { data: tcData } = await supabase
                .from('teacher_profiles')
                .select('*')
                .or(`organization_id.eq.${org.id},org_slug.eq.${org.slug}`)
                .order('created_at', { ascending: false });
            setDetailTeachers(tcData || []);

            // Load programs
            const { data: prData } = await supabase
                .from('programs')
                .select('*')
                .or(`organization_id.eq.${org.id},org_slug.eq.${org.slug}`)
                .order('created_at', { ascending: false });
            setDetailPrograms(prData || []);
        } catch (err: any) {
            console.error('Error loading org details:', err);
        } finally {
            setDetailLoading(false);
        }
    };

    // Badge modal handlers
    const openBadgeModal = (org: OrgCardItem) => {
        setBadgeModalOrg(org);
        setBadgeType((org.certification_badge as any) || 'none');
        setBadgeTitle(org.badge_title || '');
    };

    const handleAssignBadge = async () => {
        if (!badgeModalOrg) return;
        setSavingBadge(true);
        try {
            const { error } = await supabase
                .from('organizations')
                .update({
                    certification_badge: badgeType,
                    badge_title: badgeTitle.trim() || null,
                    badge_issued_at: badgeType !== 'none' ? new Date().toISOString() : null,
                })
                .eq('id', badgeModalOrg.id);
            if (error) throw error;
            toast.success(badgeType === 'none' ? 'Badge retiré.' : `Badge ${badgeType === 'verified_physical' ? '🏛️ Établissement Agréé' : '🎓 Académie Certifiée'} attribué !`);
            setBadgeModalOrg(null);
            onRefresh();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de l\'attribution du badge');
        } finally {
            setSavingBadge(false);
        }
    };

    // Edit form fields
    const [editName, setEditName] = useState('');
    const [editSlug, setEditSlug] = useState('');
    const [editType, setEditType] = useState('');
    const [editCity, setEditCity] = useState('');
    const [editCountry, setEditCountry] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editCustomDomain, setEditCustomDomain] = useState('');

    // Open edit modal
    const openEditModal = (org: OrgCardItem) => {
        setEditOrg(org);
        setEditName(org.name || '');
        setEditSlug(org.slug || '');
        setEditType(org.school_type || 'Lycée');
        setEditCity(org.city || '');
        setEditCountry(org.country || '');
        setEditPhone(org.phone || '');
        setEditEmail(org.email || '');
        setEditCustomDomain(org.custom_domain || '');
    };

    // Save edited org
    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editOrg) return;
        setSavingEdit(true);
        try {
            // Check uniqueness of name if changed
            if (editName.trim().toLowerCase() !== (editOrg.name || '').toLowerCase()) {
                const { data: dup } = await supabase
                    .from('organizations')
                    .select('id')
                    .ilike('name', editName.trim())
                    .neq('id', editOrg.id)
                    .limit(1);
                if (dup && dup.length > 0) {
                    toast.error(`Un établissement portant le nom "${editName.trim()}" existe déjà.`);
                    setSavingEdit(false);
                    return;
                }
            }

            const { error } = await supabase
                .from('organizations')
                .update({
                    name: editName.trim(),
                    slug: editSlug.trim().toLowerCase(),
                    type: editType,
                    city: editCity.trim(),
                    country: editCountry.trim(),
                    phone: editPhone.trim(),
                    email: editEmail.trim(),
                    custom_domain: editCustomDomain.trim() || null
                })
                .eq('id', editOrg.id);

            if (error) {
                toast.error('Erreur lors de la mise à jour : ' + error.message);
            } else {
                toast.success(`Établissement "${editName}" mis à jour avec succès !`);
                setEditOrg(null);
                onRefresh();
            }
        } catch (err: any) {
            toast.error('Erreur: ' + err.message);
        } finally {
            setSavingEdit(false);
        }
    };

    // ═══ RECOVERY REQUESTS STATE & HANDLERS ═══
    const [recoveryRequests, setRecoveryRequests] = useState<any[]>([]);
    const [recoveryModalOrg, setRecoveryModalOrg] = useState<OrgCardItem | null>(null);
    const [activeRecoveryReq, setActiveRecoveryReq] = useState<any | null>(null);
    const [recoveryPhotoUrl, setRecoveryPhotoUrl] = useState<string | null>(null);
    const [singleViewDestroyed, setSingleViewDestroyed] = useState(false);
    const [replacingEmail, setReplacingEmail] = useState('');
    const [processingRecovery, setProcessingRecovery] = useState(false);

    // ═══ SUSPENSION MODAL STATE ═══
    const [suspendModalOrg, setSuspendModalOrg] = useState<OrgCardItem | null>(null);
    const [suspendReason, setSuspendReason] = useState('');
    const [savingSuspend, setSavingSuspend] = useState(false);

    // Load pending recovery requests
    useEffect(() => {
        const loadRecovery = async () => {
            try {
                const { data } = await supabase
                    .from('admin_recovery_requests')
                    .select('*')
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false });
                setRecoveryRequests(data || []);
            } catch (e) {
                console.error('Error loading recovery requests:', e);
            }
        };
        loadRecovery();
        const ch = supabase
            .channel('admin_rec_watch')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_recovery_requests' }, () => {
                loadRecovery();
            })
            .subscribe();
        return () => {
            supabase.removeChannel(ch);
        };
    }, []);

    // Open recovery modal for an org
    const openRecoveryModal = async (org: OrgCardItem) => {
        setRecoveryModalOrg(org);
        setSingleViewDestroyed(false);
        setProcessingRecovery(true);
        try {
            const { data: reqs } = await supabase
                .from('admin_recovery_requests')
                .select('*')
                .eq('org_id', org.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1);

            const active = reqs?.[0] || null;
            setActiveRecoveryReq(active);
            setReplacingEmail(active?.new_email || org.email || '');

            // Single-view photo: check local storage keys
            const keyById = active ? `campusflow_recovery_id_photo_${active.id}` : null;
            const keyByOrg = `campusflow_recovery_id_photo_${org.id}`;
            const keyBySlug = `campusflow_recovery_id_photo_${org.slug}`;

            const photo = (typeof window !== 'undefined')
                ? ((keyById && localStorage.getItem(keyById)) || localStorage.getItem(keyByOrg) || localStorage.getItem(keyBySlug))
                : null;
            setRecoveryPhotoUrl(photo);
        } catch (err: any) {
            console.error('Error fetching recovery data:', err);
        } finally {
            setProcessingRecovery(false);
        }
    };

    // Single-view photo destruction
    const handleDestroyPhoto = () => {
        if (typeof window !== 'undefined') {
            if (activeRecoveryReq) {
                localStorage.removeItem(`campusflow_recovery_id_photo_${activeRecoveryReq.id}`);
            }
            if (recoveryModalOrg) {
                localStorage.removeItem(`campusflow_recovery_id_photo_${recoveryModalOrg.id}`);
                localStorage.removeItem(`campusflow_recovery_id_photo_${recoveryModalOrg.slug}`);
            }
        }
        setRecoveryPhotoUrl(null);
        setSingleViewDestroyed(true);
        toast.info('🔒 Photo de la pièce d\'identité détruite définitivement sans trace');
    };

    // Apply new email from recovery request
    const handleApplyRecoveryEmail = async () => {
        if (!recoveryModalOrg || !replacingEmail.trim()) {
            toast.error('Veuillez spécifier une adresse email valide.');
            return;
        }
        setProcessingRecovery(true);
        try {
            const { error: orgErr } = await supabase
                .from('organizations')
                .update({ email: replacingEmail.trim() })
                .eq('id', recoveryModalOrg.id);

            if (orgErr) throw orgErr;

            if (activeRecoveryReq) {
                await supabase
                    .from('admin_recovery_requests')
                    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
                    .eq('id', activeRecoveryReq.id);
            }

            handleDestroyPhoto();
            toast.success(`✅ E-mail administrateur mis à jour : ${replacingEmail.trim()}`);
            setRecoveryModalOrg(null);
            onRefresh();
        } catch (err: any) {
            toast.error('Erreur: ' + err.message);
        } finally {
            setProcessingRecovery(false);
        }
    };

    // Trigger password reset email
    const handleResetPasswordEmail = async () => {
        if (!recoveryModalOrg) return;
        setProcessingRecovery(true);
        try {
            const targetEmail = replacingEmail.trim() || recoveryModalOrg.email;
            if (!targetEmail) {
                toast.error("Aucune adresse e-mail trouvée.");
                setProcessingRecovery(false);
                return;
            }

            const { error: resetErr } = await supabase.auth.resetPasswordForEmail(targetEmail, {
                redirectTo: `${window.location.origin}/${recoveryModalOrg.slug}/login?mode=reset_password`,
            });

            if (resetErr) {
                toast.warning(`Note : ${resetErr.message}. Le mot de passe devra être changé à la prochaine connexion.`);
            } else {
                toast.success(`📧 Lien de réinitialisation envoyé à ${targetEmail}`);
            }

            if (activeRecoveryReq) {
                await supabase
                    .from('admin_recovery_requests')
                    .update({
                        status: 'resolved',
                        resolved_at: new Date().toISOString(),
                        superadmin_note: 'Lien de réinitialisation envoyé par Superadmin'
                    })
                    .eq('id', activeRecoveryReq.id);
            }

            handleDestroyPhoto();
            setRecoveryModalOrg(null);
            onRefresh();
        } catch (err: any) {
            toast.error('Erreur: ' + err.message);
        } finally {
            setProcessingRecovery(false);
        }
    };

    // Reject recovery request
    const handleRejectRecovery = async () => {
        if (!activeRecoveryReq) {
            setRecoveryModalOrg(null);
            return;
        }
        setProcessingRecovery(true);
        try {
            await supabase
                .from('admin_recovery_requests')
                .update({ status: 'rejected', resolved_at: new Date().toISOString() })
                .eq('id', activeRecoveryReq.id);

            handleDestroyPhoto();
            toast.info('Demande de récupération rejetée.');
            setRecoveryModalOrg(null);
            onRefresh();
        } catch (err: any) {
            toast.error('Erreur: ' + err.message);
        } finally {
            setProcessingRecovery(false);
        }
    };

    // ═══ SUSPENSION HANDLERS ═══
    const handleConfirmSuspend = async () => {
        if (!suspendModalOrg) return;
        setSavingSuspend(true);
        try {
            const reason = suspendReason.trim() || 'Vérification administrative et conformité requise';
            const { error } = await supabase
                .from('organizations')
                .update({
                    is_active: false,
                    suspension_reason: reason
                })
                .eq('id', suspendModalOrg.id);

            if (error) throw error;

            toast.error(`🚫 "${suspendModalOrg.name}" suspendue (${reason})`);
            setSuspendModalOrg(null);
            setSuspendReason('');
            onRefresh();
        } catch (err: any) {
            toast.error('Erreur: ' + err.message);
        } finally {
            setSavingSuspend(false);
        }
    };

    const handleReactivateOrg = async (org: OrgCardItem) => {
        try {
            const { error } = await supabase
                .from('organizations')
                .update({
                    is_active: true,
                    suspension_reason: null
                })
                .eq('id', org.id);

            if (error) throw error;

            toast.success(`✅ "${org.name}" réactivée avec succès !`);
            onRefresh();
        } catch (err: any) {
            toast.error('Erreur: ' + err.message);
        }
    };

    // Adjust Sky Points for org
    const handleAdjustPoints = async (action: 'add' | 'remove') => {
        if (!pointsModalOrg) return;
        setSavingPoints(true);
        try {
            const current = pointsModalOrg.sky_points || 0;
            const delta = action === 'add' ? Math.abs(pointsDelta) : -Math.abs(pointsDelta);
            const newBal = Math.max(0, current + delta);

            const { error } = await supabase
                .from('organizations')
                .update({ sky_points: newBal })
                .eq('id', pointsModalOrg.id);

            if (error) {
                toast.error('Erreur Supabase : ' + error.message);
            } else {
                toast.success(`⭐ Solde de ${pointsModalOrg.name} mis à jour : ${new Intl.NumberFormat('fr-FR').format(newBal)} pts`);

                // 1. Sync points to owner profile (teacher_profiles) if available
                if (pointsModalOrg.owner_id) {
                    try {
                        await supabase
                            .from('teacher_profiles')
                            .update({ sky_points: newBal })
                            .eq('id', pointsModalOrg.owner_id);
                    } catch {}
                }

                // 2. Sync localStorage cache for instant local reflection
                if (typeof window !== 'undefined') {
                    try {
                        localStorage.setItem(`campusflow_admin_points_${pointsModalOrg.id}`, newBal.toString());
                        localStorage.setItem(`campusflow_admin_points_${pointsModalOrg.slug}`, newBal.toString());
                        window.dispatchEvent(new CustomEvent('sky_points_updated', {
                            detail: { newBalance: newBal, orgId: pointsModalOrg.id }
                        }));
                        window.dispatchEvent(new Event('storage'));
                    } catch {}
                }

                // 3. Insert transaction record for audit
                try {
                    await supabase.from('sky_points_transactions').insert({
                        target_type: 'organization',
                        target_id: pointsModalOrg.id,
                        target_name: pointsModalOrg.name,
                        amount: delta,
                        balance_after: newBal,
                        reason: `Ajustement Superadmin (${action === 'add' ? '+' : '-'}${Math.abs(pointsDelta)} pts)`,
                    });
                } catch {}

                setPointsModalOrg(null);
                onRefresh();
            }
        } catch (err: any) {
            toast.error('Erreur: ' + err.message);
        } finally {
            setSavingPoints(false);
        }
    };

    // Filter logic 100% safe against null values
    const q = (search || '').toLowerCase().trim();
    const filteredOrgs = (orgs || []).filter(o => {
        if (!o) return false;
        const name = (o.name || '').toLowerCase();
        const slug = (o.slug || '').toLowerCase();
        const city = (o.city || '').toLowerCase();
        const type = (o.school_type || '').toLowerCase();
        const domain = (o.custom_domain || '').toLowerCase();
        const matchesQuery = name.includes(q) || slug.includes(q) || city.includes(q) || type.includes(q) || domain.includes(q);

        if (!matchesQuery) return false;

        if (filterTab === 'active') return o.is_active;
        if (filterTab === 'suspended') return !o.is_active;
        if (filterTab === 'domain') return !!o.custom_domain;
        if (filterTab === 'traffic') return (o.student_count || 0) > 0 || (o.teacher_count || 0) > 0;
        return true;
    });

    // Time helper
    const timeAgo = (iso: string) => {
        if (!iso) return 'Récemment';
        const diff = (Date.now() - new Date(iso).getTime()) / 1000;
        if (diff < 60) return 'À l\'instant';
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        return `${Math.floor(diff / 86400)}j`;
    };

    // Traffic indicator helper
    const getTrafficBadge = (org: OrgCardItem) => {
        const totalUsers = (org.student_count || 0) + (org.teacher_count || 0);
        if (totalUsers > 50) {
            return { label: '⚡ Très fort trafic', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
        }
        if (totalUsers > 10) {
            return { label: '🟢 Trafic régulier', color: 'bg-teal-500/15 text-teal-400 border-teal-500/30' };
        }
        if (totalUsers > 0) {
            return { label: '🟡 En croissance', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
        }
        return { label: '⚪ Nouveau portail', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' };
    };

    return (
        <div className="space-y-6">
            {/* ═══ BARRE D'OUTILS ET FILTRES ═══ */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/8">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Rechercher par nom, slug, ville, domaine..."
                        className="w-full bg-white/5 border border-white/10 text-white pl-10 pr-4 h-11 rounded-xl text-xs placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 transition-all"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    {([
                        { id: 'all', label: `Toutes (${orgs.length})` },
                        { id: 'active', label: `🟢 Actives (${orgs.filter(o => o.is_active).length})` },
                        { id: 'suspended', label: `🔴 Suspendues (${orgs.filter(o => !o.is_active).length})` },
                        { id: 'domain', label: `🌐 Avec Domaine (${orgs.filter(o => o.custom_domain).length})` },
                        { id: 'traffic', label: '⚡ Avec Trafic' },
                    ] as const).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterTab(tab.id)}
                            className={cn(
                                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                                filterTab === tab.id
                                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ═══ GRILLE DE CARTES D'ÉTABLISSEMENTS ═══ */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 min-[2000px]:grid-cols-5 gap-4 md:gap-5">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-72 rounded-3xl bg-white/[0.02] border border-white/5 animate-pulse" />
                    ))}
                </div>
            ) : filteredOrgs.length === 0 ? (
                <div className="text-center py-20 p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
                    <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
                    <p className="text-sm font-bold text-white">Aucun établissement trouvé</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">Modifiez votre recherche ou réinitialisez les filtres.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 min-[2000px]:grid-cols-5 gap-4 md:gap-5">
                    {filteredOrgs.map(org => {
                        const traffic = getTrafficBadge(org);
                        const bc = org.brand_color || '#8b5cf6';

                        return (
                            <motion.div
                                key={org.id}
                                layout
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                    'p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between relative group hover:shadow-2xl',
                                    org.is_active
                                        ? 'bg-[#0E121B] border-white/10 hover:border-violet-500/40 hover:shadow-violet-500/10'
                                        : 'bg-[#150D11] border-red-500/20 hover:border-red-500/40'
                                )}
                            >
                                <div>
                                    {/* ── Header de la carte ── */}
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {org.logo_url ? (
                                                <img
                                                    src={org.logo_url}
                                                    alt={org.name}
                                                    className="w-12 h-12 rounded-2xl object-cover bg-white/10 p-0.5 shrink-0 border border-white/10"
                                                />
                                            ) : (
                                                <div
                                                    className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shrink-0 shadow-lg"
                                                    style={{ background: `linear-gradient(135deg, ${bc}, ${bc}88)` }}
                                                >
                                                    {(org.name || 'E')[0]?.toUpperCase()}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <h4 className="font-extrabold text-sm text-white truncate group-hover:text-violet-300 transition-colors">
                                                    {org.name}
                                                </h4>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[11px] text-slate-400 font-mono">
                                                        /{org.slug}
                                                    </span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-300 font-medium">
                                                        {org.school_type || 'Lycée'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status badge */}
                                        <span className={cn(
                                            'px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 flex items-center gap-1',
                                            org.is_active
                                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                        )}>
                                            <span className={cn('w-1.5 h-1.5 rounded-full', org.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-red-400')} />
                                            {org.is_active ? 'Actif' : 'Suspendu'}
                                        </span>
                                    </div>

                                    {/* ── Certification Badge Display ── */}
                                    {org.certification_badge && org.certification_badge !== 'none' && (
                                        <div className={`mb-3 px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-2 border ${
                                            org.certification_badge === 'verified_physical'
                                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                                                : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25'
                                        }`}>
                                            <span className="text-base">{org.certification_badge === 'verified_physical' ? '🏛️' : '🎓'}</span>
                                            <span>{org.badge_title || (org.certification_badge === 'verified_physical' ? 'Établissement Agréé' : 'Académie Certifiée')}</span>
                                        </div>
                                    )}

                                    {/* ── Trafic & Domaine Info ── */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center justify-between gap-2 text-xs">
                                            <span className={cn('px-2.5 py-0.5 rounded-lg border text-[10px] font-bold flex items-center gap-1', traffic.color)}>
                                                <Activity className="w-3 h-3" /> {traffic.label}
                                            </span>
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> Créé {timeAgo(org.created_at)}
                                            </span>
                                        </div>

                                        {/* Custom Domain Bar */}
                                        {org.custom_domain && (
                                            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-1.5 font-mono text-[11px] text-violet-300 truncate">
                                                    <Globe className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                                                    <span className="truncate">{org.custom_domain}</span>
                                                </div>
                                                <button
                                                    onClick={() => onVerifyDomain(org)}
                                                    className={cn(
                                                        'px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 transition-all',
                                                        org.domain_verified
                                                            ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                                                            : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                                                    )}
                                                >
                                                    {org.domain_verified ? '✅ Vérifié' : '⏳ Valider'}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* ── Métriques Chiffrées ── */}
                                    <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center mb-4">
                                        <div>
                                            <span className="text-[10px] text-slate-500 block">Étudiants</span>
                                            <span className="text-sm font-black text-white flex items-center justify-center gap-1 mt-0.5">
                                                <GraduationCap className="w-3.5 h-3.5 text-teal-400" />
                                                {org.student_count || 0}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-500 block">Profs</span>
                                            <span className="text-sm font-black text-white flex items-center justify-center gap-1 mt-0.5">
                                                <Users className="w-3.5 h-3.5 text-indigo-400" />
                                                {org.teacher_count || 0}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-500 block">Sky Points</span>
                                            <span className="text-sm font-black text-amber-400 flex items-center justify-center gap-1 mt-0.5">
                                                <Coins className="w-3.5 h-3.5" />
                                                {org.sky_points || 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                 {/* ── GESTION COMPLÈTE & ACTIONS RAPIDES ── */}
                                <div className="space-y-2 pt-3 border-t border-white/10">
                                    {/* Primary button: Fiche Complète & Roster */}
                                    <Button
                                        onClick={() => openDetailModal(org)}
                                        className="w-full h-8 rounded-xl bg-violet-600/30 hover:bg-violet-600 text-violet-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-violet-500/30"
                                    >
                                        <Users className="w-3.5 h-3.5" /> Fiche & Roster ({org.student_count || 0} élèves)
                                    </Button>

                                    {/* Primary links */}
                                    <div className="grid grid-cols-3 gap-1.5">
                                        <div className="relative">
                                            <a
                                                href={`/${org.slug}/admin`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-full h-7 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-all border border-white/10"
                                                title="Accéder au backoffice de l'école"
                                            >
                                                <ShieldCheck className="w-3 h-3 text-violet-400" /> Admin
                                            </a>
                                            {/* Recovery request indicator button */}
                                            {recoveryRequests.some(r => r.org_id === org.id) && (
                                                <button
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openRecoveryModal(org); }}
                                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-black font-black text-[9px] flex items-center justify-center animate-bounce shadow-md shadow-amber-500/50"
                                                    title="Demande de récupération d'accès en attente !"
                                                >
                                                    !
                                                </button>
                                            )}
                                        </div>
                                        <a
                                            href={`/${org.slug}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="h-7 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-all border border-white/10"
                                            title="Voir le portail public"
                                        >
                                            <Eye className="w-3 h-3 text-teal-400" /> Portail
                                        </a>
                                        <a
                                            href={`/${org.slug}/campus`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="h-7 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-all border border-white/10"
                                            title="Voir l'espace campus"
                                        >
                                            <School className="w-3 h-3 text-amber-400" /> Campus
                                        </a>
                                    </div>

                                    {/* Secondary tools */}
                                    <div className="flex items-center justify-between gap-1.5 pt-1">
                                        {/* Recovery direct button */}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => openRecoveryModal(org)}
                                            className={cn(
                                                "h-7 px-2 text-[10px] rounded-lg gap-1",
                                                recoveryRequests.some(r => r.org_id === org.id)
                                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                                                    : "text-slate-400 hover:text-white hover:bg-white/10"
                                            )}
                                            title="Gestion des identifiants & récupération admin"
                                        >
                                            <KeyRound className="w-3 h-3 text-amber-400" /> Récup
                                        </Button>

                                        {/* Sky Points button */}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setPointsModalOrg(org)}
                                            className="h-7 px-2 text-[10px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg gap-1"
                                            title="Ajuster les Sky Points"
                                        >
                                            <Coins className="w-3 h-3" /> Points
                                        </Button>

                                        {/* Badge Certification button */}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => openBadgeModal(org)}
                                            className={cn(
                                                'h-7 px-2 text-[10px] rounded-lg gap-1 font-bold',
                                                org.certification_badge === 'verified_physical'
                                                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                                                    : org.certification_badge === 'verified_online'
                                                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25'
                                                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                                            )}
                                            title="Attribuer un badge de certification"
                                        >
                                            <Award className="w-3 h-3" /> Badge
                                        </Button>

                                        {/* Edit org button */}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => openEditModal(org)}
                                            className="h-7 px-2 text-[10px] text-slate-400 hover:text-white hover:bg-white/10 rounded-lg gap-1"
                                            title="Modifier les infos"
                                        >
                                            <Edit3 className="w-3 h-3" /> Éditer
                                        </Button>

                                        {/* Toggle status button */}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => org.is_active ? setSuspendModalOrg(org) : handleReactivateOrg(org)}
                                            className={cn(
                                                'h-7 px-2 text-[10px] font-bold rounded-lg gap-1',
                                                org.is_active
                                                    ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                                                    : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                                            )}
                                            title={org.is_active ? 'Suspendre l\'école' : 'Réactiver l\'école'}
                                        >
                                            {org.is_active ? <Ban className="w-3 h-3" /> : <RotateCcw className="w-3 h-3" />}
                                            {org.is_active ? 'Suspendre' : 'Activer'}
                                        </Button>

                                        {/* Delete button */}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => onDeleteOrg(org)}
                                            className="h-7 px-2 text-[10px] text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                                            title="Supprimer définitivement"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* ═══ MODALE ATTRIBUTION BADGE CERTIFICATION ═══ */}
            <AnimatePresence>
                {badgeModalOrg && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.92 }}
                            className="w-full max-w-md bg-[#0E121B] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-black text-white text-base">🏅 Attribuer un Badge</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">{badgeModalOrg.name}</p>
                                </div>
                                <button onClick={() => setBadgeModalOrg(null)} className="text-slate-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Sélectionnez la catégorie :</p>

                                {/* Option 1: Établissement Physique Agréé */}
                                <button
                                    onClick={() => { setBadgeType('verified_physical'); setBadgeTitle(badgeTitle || 'Établissement Agréé'); }}
                                    className={cn(
                                        'w-full p-4 rounded-xl border text-left transition-all',
                                        badgeType === 'verified_physical'
                                            ? 'bg-amber-500/15 border-amber-500/50 text-amber-200'
                                            : 'bg-white/[0.02] border-white/10 text-slate-300 hover:border-amber-500/30'
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">🏛️</span>
                                        <div>
                                            <div className="font-bold text-sm">Établissement Physique Agréé</div>
                                            <div className="text-[11px] opacity-70 mt-0.5">A fourni un arrêté ministériel, récépissé ou agrément officiel. Campus géographiquement implanté.</div>
                                        </div>
                                        {badgeType === 'verified_physical' && <Check className="w-5 h-5 text-amber-400 ml-auto shrink-0" />}
                                    </div>
                                </button>

                                {/* Option 2: Académie en Ligne Certifiée */}
                                <button
                                    onClick={() => { setBadgeType('verified_online'); setBadgeTitle(badgeTitle || 'Académie Certifiée'); }}
                                    className={cn(
                                        'w-full p-4 rounded-xl border text-left transition-all',
                                        badgeType === 'verified_online'
                                            ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-200'
                                            : 'bg-white/[0.02] border-white/10 text-slate-300 hover:border-cyan-500/30'
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">🎓</span>
                                        <div>
                                            <div className="font-bold text-sm">Académie en Ligne / Formateur Expert</div>
                                            <div className="text-[11px] opacity-70 mt-0.5">A fourni un doctorat, diplôme ou certificat d'expertise. Pas de bâtiment physique requis.</div>
                                        </div>
                                        {badgeType === 'verified_online' && <Check className="w-5 h-5 text-cyan-400 ml-auto shrink-0" />}
                                    </div>
                                </button>

                                {/* Option 3: Aucun badge */}
                                <button
                                    onClick={() => { setBadgeType('none'); setBadgeTitle(''); }}
                                    className={cn(
                                        'w-full p-3 rounded-xl border text-left transition-all',
                                        badgeType === 'none'
                                            ? 'bg-white/10 border-white/30 text-white'
                                            : 'bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20'
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">⚪</span>
                                        <div>
                                            <div className="font-bold text-xs">Aucun badge / Compte Standard</div>
                                            <div className="text-[11px] opacity-60">Aucune pièce justificative soumise ou validée.</div>
                                        </div>
                                        {badgeType === 'none' && <Check className="w-4 h-4 text-slate-300 ml-auto shrink-0" />}
                                    </div>
                                </button>

                                {/* Badge title override */}
                                {badgeType !== 'none' && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-slate-400 font-semibold">Libellé personnalisé du badge (optionnel)</label>
                                        <input
                                            type="text"
                                            value={badgeTitle}
                                            onChange={e => setBadgeTitle(e.target.value)}
                                            placeholder={badgeType === 'verified_physical' ? 'Ex: Agréé Ministère de l\'Éducation' : 'Ex: Dr. Expert en Intelligence Artificielle'}
                                            className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs px-3 focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3 pt-1">
                                <Button
                                    onClick={handleAssignBadge}
                                    disabled={savingBadge}
                                    className={cn(
                                        'flex-1 h-11 rounded-xl font-black text-xs gap-2',
                                        badgeType === 'verified_physical'
                                            ? 'bg-amber-500 hover:bg-amber-400 text-black'
                                            : badgeType === 'verified_online'
                                                ? 'bg-cyan-500 hover:bg-cyan-400 text-black'
                                                : 'bg-white/10 hover:bg-white/15 text-white'
                                    )}
                                >
                                    {savingBadge ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                    {badgeType === 'none' ? 'Retirer le Badge' : 'Attribuer ce Badge'}
                                </Button>
                                <Button variant="ghost" onClick={() => setBadgeModalOrg(null)} className="h-11 px-4 rounded-xl text-slate-400 hover:text-white text-xs">
                                    Annuler
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══ MODALE FICHE COMPLÈTE & ROSTER DE L'ÉCOLE (Feature 3) ═══ */}
            <AnimatePresence>
                {detailOrg && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-4xl bg-[#0E121B] border border-white/15 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-5"
                        >
                            {/* Modal Header */}
                            <div className="flex items-start justify-between pb-4 border-b border-white/10">
                                <div className="flex items-center gap-3.5">
                                    {detailOrg.logo_url ? (
                                        <img src={detailOrg.logo_url} alt={detailOrg.name} className="w-14 h-14 rounded-2xl object-cover bg-white/10 p-1 border border-white/10 shrink-0" />
                                    ) : (
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center font-black text-xl text-white shrink-0">
                                            {(detailOrg.name || 'E')[0]}
                                        </div>
                                    )}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-black text-white">{detailOrg.name}</h3>
                                            <span className={cn(
                                                'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                                                detailOrg.is_active ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'
                                            )}>
                                                {detailOrg.is_active ? '🟢 Établissement Actif' : '🔴 Suspendu'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                            <span className="font-mono text-violet-300">/{detailOrg.slug}</span>
                                            <span>•</span>
                                            <span>{detailOrg.school_type || 'Lycée'}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {detailOrg.city || 'Cameroun'}, {detailOrg.country || 'Cameroun'}</span>
                                            {detailOrg.email && <span>• ✉️ {detailOrg.email}</span>}
                                            {detailOrg.phone && <span>• 📞 {detailOrg.phone}</span>}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDetailOrg(null)}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Stat Counter Strip */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/8 text-center">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Étudiants</p>
                                    <p className="text-xl font-black text-teal-400 mt-0.5">{detailStudents.length}</p>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/8 text-center">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Professeurs</p>
                                    <p className="text-xl font-black text-indigo-400 mt-0.5">{detailTeachers.length}</p>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/8 text-center">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Filières / Offres</p>
                                    <p className="text-xl font-black text-violet-400 mt-0.5">{detailPrograms.length}</p>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/8 text-center">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Sky Points</p>
                                    <p className="text-xl font-black text-amber-400 mt-0.5">{new Intl.NumberFormat('fr-FR').format(detailOrg.sky_points || 0)} pts</p>
                                </div>
                            </div>

                            {/* Navigation Tabs inside Detail Modal */}
                            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10">
                                <button
                                    onClick={() => setDetailTab('overview')}
                                    className={cn('flex-1 py-2 rounded-xl text-xs font-bold transition-all',
                                        detailTab === 'overview' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                                    )}
                                >
                                    📊 Vue Générale & Actions
                                </button>
                                <button
                                    onClick={() => setDetailTab('students')}
                                    className={cn('flex-1 py-2 rounded-xl text-xs font-bold transition-all',
                                        detailTab === 'students' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                                    )}
                                >
                                    🎓 Étudiants ({detailStudents.length})
                                </button>
                                <button
                                    onClick={() => setDetailTab('teachers')}
                                    className={cn('flex-1 py-2 rounded-xl text-xs font-bold transition-all',
                                        detailTab === 'teachers' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                                    )}
                                >
                                    👨‍🏫 Professeurs ({detailTeachers.length})
                                </button>
                                <button
                                    onClick={() => setDetailTab('programs')}
                                    className={cn('flex-1 py-2 rounded-xl text-xs font-bold transition-all',
                                        detailTab === 'programs' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                                    )}
                                >
                                    📚 Filières ({detailPrograms.length})
                                </button>
                            </div>

                            {/* Tab Content */}
                            {detailLoading ? (
                                <div className="p-12 text-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-slate-500 mx-auto" />
                                </div>
                            ) : (
                                <>
                                    {/* ── 1. Vue Générale & Quick Tools ── */}
                                    {detailTab === 'overview' && (
                                        <div className="space-y-4">
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/8 space-y-3">
                                                    <h4 className="text-xs font-black uppercase text-slate-400">Liens directs d&apos;accès</h4>
                                                    <div className="space-y-2">
                                                        <a href={`/${detailOrg.slug}/admin`} target="_blank" rel="noreferrer"
                                                            className="flex items-center justify-between p-3 rounded-xl bg-violet-600/10 border border-violet-500/20 hover:bg-violet-600/20 transition-all text-xs font-bold text-violet-300">
                                                            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Panneau Administration École</span>
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </a>
                                                        <a href={`/${detailOrg.slug}`} target="_blank" rel="noreferrer"
                                                            className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-bold text-slate-300">
                                                            <span className="flex items-center gap-2"><Eye className="w-4 h-4 text-teal-400" /> Portail Public (Landing)</span>
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </a>
                                                        <a href={`/${detailOrg.slug}/campus`} target="_blank" rel="noreferrer"
                                                            className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-bold text-slate-300">
                                                            <span className="flex items-center gap-2"><School className="w-4 h-4 text-amber-400" /> Espace Campus / Cours</span>
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </a>
                                                    </div>
                                                </div>

                                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/8 space-y-3">
                                                    <h4 className="text-xs font-black uppercase text-slate-400">Actions Superadmin rapides</h4>
                                                    <div className="space-y-2">
                                                        <Button
                                                            onClick={() => { setPointsModalOrg(detailOrg); setDetailOrg(null); }}
                                                            className="w-full h-10 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs gap-2"
                                                        >
                                                            <Coins className="w-4 h-4" /> Créditer / Débiter des Sky Points
                                                        </Button>
                                                        <Button
                                                            onClick={async () => {
                                                                await onToggleActive(detailOrg);
                                                                setDetailOrg(d => d ? { ...d, is_active: !d.is_active } : null);
                                                            }}
                                                            className={cn(
                                                                'w-full h-10 font-bold rounded-xl text-xs gap-2',
                                                                detailOrg.is_active ? 'bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30' : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                                                            )}
                                                        >
                                                            {detailOrg.is_active ? <><Ban className="w-4 h-4" /> Suspendre cet établissement</> : <><RotateCcw className="w-4 h-4" /> Réactiver cet établissement</>}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── 2. Liste des Étudiants ── */}
                                    {detailTab === 'students' && (
                                        <div className="space-y-2">
                                            {detailStudents.length === 0 ? (
                                                <p className="text-center py-10 text-xs text-slate-500">Aucun étudiant inscrit pour le moment.</p>
                                            ) : (
                                                <div className="rounded-2xl border border-white/8 overflow-hidden bg-white/[0.01]">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                                                <th className="text-left px-4 py-2.5 text-slate-500 font-bold">Étudiant</th>
                                                                <th className="text-left px-4 py-2.5 text-slate-500 font-bold">Matricule / Contact</th>
                                                                <th className="text-left px-4 py-2.5 text-slate-500 font-bold">Points</th>
                                                                <th className="text-left px-4 py-2.5 text-slate-500 font-bold">Statut</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {detailStudents.map((st, idx) => (
                                                                <tr key={st.id || idx} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                                                                    <td className="px-4 py-2.5 font-bold text-white">
                                                                        {st.first_name} {st.last_name}
                                                                        <span className="block text-[10px] text-slate-400 font-normal">{st.email || '—'}</span>
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-slate-400 font-mono text-[11px]">
                                                                        {st.matricule || st.access_code || '—'}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 font-bold text-amber-400">
                                                                        {st.sky_points || 0} pts
                                                                    </td>
                                                                    <td className="px-4 py-2.5">
                                                                        <span className={cn('text-[9px] px-2 py-0.5 rounded-full font-bold',
                                                                            st.is_active !== false ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300')}>
                                                                            {st.is_active !== false ? 'Actif' : 'Inactif'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ── 3. Liste des Professeurs ── */}
                                    {detailTab === 'teachers' && (
                                        <div className="space-y-2">
                                            {detailTeachers.length === 0 ? (
                                                <p className="text-center py-10 text-xs text-slate-500">Aucun enseignant configuré pour le moment.</p>
                                            ) : (
                                                <div className="rounded-2xl border border-white/8 overflow-hidden bg-white/[0.01]">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                                                <th className="text-left px-4 py-2.5 text-slate-500 font-bold">Enseignant</th>
                                                                <th className="text-left px-4 py-2.5 text-slate-500 font-bold">Matière / Rôle</th>
                                                                <th className="text-left px-4 py-2.5 text-slate-500 font-bold">Contact</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {detailTeachers.map((tc, idx) => (
                                                                <tr key={tc.id || idx} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                                                                    <td className="px-4 py-2.5 font-bold text-white">
                                                                        {tc.first_name} {tc.last_name}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-indigo-300">
                                                                        {tc.subject || tc.specialty || 'Professeur'}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-slate-400">
                                                                        {tc.email || tc.phone || '—'}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ── 4. Liste des Filières / Offres ── */}
                                    {detailTab === 'programs' && (
                                        <div className="space-y-2">
                                            {detailPrograms.length === 0 ? (
                                                <p className="text-center py-10 text-xs text-slate-500">Aucune filière déclarée pour le moment.</p>
                                            ) : (
                                                <div className="grid sm:grid-cols-2 gap-3">
                                                    {detailPrograms.map((pr, idx) => (
                                                        <div key={pr.id || idx} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/8 space-y-1">
                                                            <h5 className="font-bold text-white text-xs">{pr.name || pr.title}</h5>
                                                            <p className="text-[11px] text-slate-400 line-clamp-2">{pr.description || 'Filière d\'études'}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══ MODALE D'ÉDITION DE L'ÉTABLISSEMENT ═══ */}
            <AnimatePresence>
                {editOrg && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-lg bg-[#0F131D] border border-white/15 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                                <div>
                                    <h3 className="text-base font-black text-white flex items-center gap-2">
                                        <Edit3 className="w-4 h-4 text-violet-400" /> Modifier l&apos;établissement
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">{editOrg.name} (/{editOrg.slug})</p>
                                </div>
                                <button
                                    onClick={() => setEditOrg(null)}
                                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                                <div>
                                    <Label className="text-slate-300 text-xs mb-1 block">Nom de l&apos;école</Label>
                                    <Input value={editName} onChange={e => setEditName(e.target.value)} required className="h-10 bg-white/5 border-white/10 rounded-xl text-white text-xs" />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-slate-300 text-xs mb-1 block">Slug unique</Label>
                                        <Input value={editSlug} onChange={e => setEditSlug(e.target.value)} required className="h-10 bg-white/5 border-white/10 rounded-xl text-white text-xs font-mono" />
                                    </div>
                                    <div>
                                        <Label className="text-slate-300 text-xs mb-1 block">Type d&apos;établissement</Label>
                                        <select
                                            value={editType}
                                            onChange={e => setEditType(e.target.value)}
                                            className="w-full h-10 bg-white/5 border border-white/10 rounded-xl text-white text-xs px-3 focus:outline-none"
                                        >
                                            <option value="Lycée" className="bg-[#111]">Lycée</option>
                                            <option value="Collège" className="bg-[#111]">Collège</option>
                                            <option value="Université" className="bg-[#111]">Université</option>
                                            <option value="Centre de formation" className="bg-[#111]">Centre de formation</option>
                                            <option value="Institut" className="bg-[#111]">Institut</option>
                                            <option value="Autre" className="bg-[#111]">Autre</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-slate-300 text-xs mb-1 block">Ville</Label>
                                        <Input value={editCity} onChange={e => setEditCity(e.target.value)} className="h-10 bg-white/5 border-white/10 rounded-xl text-white text-xs" />
                                    </div>
                                    <div>
                                        <Label className="text-slate-300 text-xs mb-1 block">Pays</Label>
                                        <Input value={editCountry} onChange={e => setEditCountry(e.target.value)} className="h-10 bg-white/5 border-white/10 rounded-xl text-white text-xs" />
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-slate-300 text-xs mb-1 block">Domaine personnalisé</Label>
                                    <Input value={editCustomDomain} onChange={e => setEditCustomDomain(e.target.value)} placeholder="Ex: mon-ecole.com" className="h-10 bg-white/5 border-white/10 rounded-xl text-white text-xs font-mono" />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-slate-300 text-xs mb-1 block">Téléphone</Label>
                                        <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="h-10 bg-white/5 border-white/10 rounded-xl text-white text-xs" />
                                    </div>
                                    <div>
                                        <Label className="text-slate-300 text-xs mb-1 block">Email</Label>
                                        <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} type="email" className="h-10 bg-white/5 border-white/10 rounded-xl text-white text-xs" />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="w-full h-11 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-xs mt-3 shadow-lg shadow-violet-600/30"
                                >
                                    {savingEdit ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                    Enregistrer les modifications
                                </Button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══ MODALE D'AJUSTEMENT DES SKY POINTS ═══ */}
            <AnimatePresence>
                {pointsModalOrg && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-sm bg-[#0F131D] border border-white/15 rounded-3xl p-6 shadow-2xl relative"
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                                <div className="flex items-center gap-2">
                                    <Coins className="w-5 h-5 text-amber-400" />
                                    <div>
                                        <h3 className="text-sm font-black text-white">Gérer les Sky Points</h3>
                                        <p className="text-[11px] text-slate-400">{pointsModalOrg.name}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setPointsModalOrg(null)}
                                    className="p-1.5 rounded-xl bg-white/5 text-slate-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center mb-4">
                                <span className="text-[11px] text-slate-400 block">Solde actuel :</span>
                                <span className="text-xl font-black text-amber-400">
                                    {new Intl.NumberFormat('fr-FR').format(pointsModalOrg.sky_points || 0)} pts
                                </span>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-xs text-slate-300 block">Montant à ajouter ou déduire</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={pointsDelta}
                                    onChange={e => setPointsDelta(parseInt(e.target.value) || 0)}
                                    className="h-10 text-xs bg-white/5 border-white/10 text-white rounded-xl font-bold"
                                />

                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    <Button
                                        onClick={() => handleAdjustPoints('add')}
                                        disabled={savingPoints}
                                        className="h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl gap-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Ajouter (+{pointsDelta})
                                    </Button>
                                    <Button
                                        onClick={() => handleAdjustPoints('remove')}
                                        disabled={savingPoints}
                                        className="h-10 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl gap-1"
                                    >
                                        <Minus className="w-3.5 h-3.5" /> Retirer (-{pointsDelta})
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══ MODALE DE SUSPENSION AVEC MOTIF ═══ */}
            <AnimatePresence>
                {suspendModalOrg && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-[#150D11] border border-red-500/30 rounded-3xl p-6 shadow-2xl relative"
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-red-500/20 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-400">
                                        <Ban className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-white">Suspendre l'établissement</h3>
                                        <p className="text-[11px] text-red-400/80 font-mono">{suspendModalOrg.name}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSuspendModalOrg(null)}
                                    className="p-1.5 rounded-xl bg-white/5 text-slate-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                                    ⚠️ La suspension bloque immédiatement l'accès au portail public (landing page) et redirige l'administration vers la page rouge de contestation.
                                </div>

                                <div>
                                    <Label className="text-xs text-slate-300 block mb-1.5 font-bold">
                                        Motif de la suspension (notifié à l'école) :
                                    </Label>
                                    <textarea
                                        value={suspendReason}
                                        onChange={e => setSuspendReason(e.target.value)}
                                        placeholder="Ex: Non-conformité des justificatifs, défaut de paiement, vérification d'identité..."
                                        rows={3}
                                        className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-red-500/50"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setSuspendModalOrg(null)}
                                        className="h-10 rounded-xl text-slate-400 hover:text-white border border-white/5"
                                    >
                                        Annuler
                                    </Button>
                                    <Button
                                        onClick={handleConfirmSuspend}
                                        disabled={savingSuspend}
                                        className="h-10 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 gap-1"
                                    >
                                        {savingSuspend ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                                        Confirmer la suspension
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══ MODALE DE RÉCUPÉRATION D'IDENTIFIANTS ADMIN (Feature 2) ═══ */}
            <AnimatePresence>
                {recoveryModalOrg && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-xl bg-[#0F131D] border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-5"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between pb-4 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
                                        <KeyRound className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-white flex items-center gap-2">
                                            Récupération d'Accès Admin
                                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono">
                                                Superadmin
                                            </span>
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {recoveryModalOrg.name} (/{recoveryModalOrg.slug})
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setRecoveryModalOrg(null); handleDestroyPhoto(); }}
                                    className="p-1.5 rounded-xl bg-white/5 text-slate-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Details of Request */}
                            {activeRecoveryReq ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-xs">
                                        <div>
                                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Demandeur déclaré</span>
                                            <span className="text-sm font-black text-white mt-0.5 block">
                                                {activeRecoveryReq.owner_first_name} {activeRecoveryReq.owner_last_name}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Élément perdu</span>
                                            <span className="text-xs font-bold text-amber-400 mt-0.5 block">
                                                {activeRecoveryReq.what_lost === 'email' && '✉️ Adresse E-mail'}
                                                {activeRecoveryReq.what_lost === 'password' && '🔒 Mot de passe'}
                                                {activeRecoveryReq.what_lost === 'both' && '⚡ E-mail & Mot de passe'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* PIÈCE D'IDENTIFICATION — VUE UNIQUE & AUTO-SUPPRESSION */}
                                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                                <ShieldAlert className="w-4 h-4 text-amber-400" /> Pièce d'identification officielle
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                                                🔒 Vue Unique Éphémère
                                            </span>
                                        </div>

                                        {recoveryPhotoUrl ? (
                                            <div className="space-y-3">
                                                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 max-h-60 flex items-center justify-center">
                                                    <img
                                                        src={recoveryPhotoUrl}
                                                        alt="Pièce d'identité"
                                                        className="max-h-60 w-auto object-contain rounded-xl"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-[11px] text-slate-400">
                                                        Vérifiez la concordance avec les noms fournis lors de la création.
                                                    </p>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={handleDestroyPhoto}
                                                        className="h-7 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg gap-1 shrink-0"
                                                    >
                                                        <Trash2 className="w-3 h-3" /> Détruire la pièce
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : singleViewDestroyed ? (
                                            <div className="p-4 text-center rounded-xl bg-white/[0.02] border border-white/5 text-xs text-emerald-400 flex items-center justify-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                                Photo détruite définitivement sans trace sur cet appareil.
                                            </div>
                                        ) : (
                                            <div className="p-4 text-center rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-400">
                                                🔒 La pièce d'identité a été vérifiée de façon éphémère sur l'appareil du demandeur. Aucun fichier n'est conservé dans la base de données.
                                            </div>
                                        )}
                                    </div>

                                    {/* Action forms according to what_lost */}
                                    {(activeRecoveryReq.what_lost === 'email' || activeRecoveryReq.what_lost === 'both') && (
                                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                                            <Label className="text-xs text-slate-300 block font-bold">
                                                Nouvelle adresse e-mail de remplacement :
                                            </Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="email"
                                                    value={replacingEmail}
                                                    onChange={e => setReplacingEmail(e.target.value)}
                                                    placeholder="nouvel-email@ecole.com"
                                                    className="h-10 bg-white/5 border-white/10 rounded-xl text-white text-xs font-mono"
                                                />
                                                <Button
                                                    onClick={handleApplyRecoveryEmail}
                                                    disabled={processingRecovery || !replacingEmail.trim()}
                                                    className="h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/25 shrink-0"
                                                >
                                                    <Save className="w-3.5 h-3.5 mr-1" /> Mettre à jour l'e-mail
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {(activeRecoveryReq.what_lost === 'password' || activeRecoveryReq.what_lost === 'both') && (
                                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                                            <p className="text-xs text-slate-300 font-bold">Réinitialisation du mot de passe :</p>
                                            <p className="text-[11px] text-slate-400">
                                                Un lien sécurisé de réinitialisation sera transmis à l'adresse e-mail de l'administrateur afin qu'il définisse lui-même son nouveau mot de passe.
                                            </p>
                                            <Button
                                                onClick={handleResetPasswordEmail}
                                                disabled={processingRecovery}
                                                className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/25 gap-1.5"
                                            >
                                                <KeyRound className="w-3.5 h-3.5" /> Envoyer le lien de réinitialisation
                                            </Button>
                                        </div>
                                    )}

                                    {/* Resolution Controls */}
                                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
                                        <Button
                                            variant="ghost"
                                            onClick={handleRejectRecovery}
                                            disabled={processingRecovery}
                                            className="h-9 px-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
                                        >
                                            <X className="w-3.5 h-3.5 mr-1" /> Rejeter la demande
                                        </Button>
                                        <Button
                                            onClick={() => { handleApplyRecoveryEmail(); }}
                                            disabled={processingRecovery}
                                            className="h-9 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold"
                                        >
                                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Clôturer la demande
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-2">
                                        <ShieldCheck className="w-8 h-8 text-slate-500 mx-auto" />
                                        <p className="text-sm font-bold text-white">Aucune demande en attente</p>
                                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                            L'administrateur de cet établissement n'a pas soumis de requête de récupération récente. Vous pouvez néanmoins modifier ses accès manuellement ci-dessous.
                                        </p>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                                        <Label className="text-xs text-slate-300 block font-bold">
                                            Adresse e-mail actuelle de l'établissement :
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="email"
                                                value={replacingEmail}
                                                onChange={e => setReplacingEmail(e.target.value)}
                                                placeholder="email@ecole.com"
                                                className="h-10 bg-white/5 border-white/10 rounded-xl text-white text-xs font-mono"
                                            />
                                            <Button
                                                onClick={handleApplyRecoveryEmail}
                                                disabled={processingRecovery || !replacingEmail.trim()}
                                                className="h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/25 shrink-0"
                                            >
                                                Mettre à jour
                                            </Button>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleResetPasswordEmail}
                                        disabled={processingRecovery}
                                        className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/25 gap-1.5"
                                    >
                                        <KeyRound className="w-3.5 h-3.5" /> Envoyer un lien de réinitialisation du mot de passe
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
