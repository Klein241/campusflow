'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Search, Globe, CheckCircle2, AlertTriangle,
    Ban, RotateCcw, ExternalLink, Trash2, Edit3, ShieldCheck,
    Coins, Users, GraduationCap, School, Clock, Activity,
    Sparkles, ArrowRight, Eye, Phone, Mail, MapPin, X,
    Plus, Minus, Save, Loader2, Link2, Check
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
    sky_points?: number;
    phone?: string;
    email?: string;
    brand_color?: string;
    hero_template?: string;
    landing_layout?: string;
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
            const { error } = await supabase
                .from('organizations')
                .update({
                    name: editName.trim(),
                    slug: editSlug.trim().toLowerCase(),
                    type: editType,
                    school_type: editType,
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
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {Array.from({ length: 6 }).map((_, i) => (
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
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                                    {/* Primary links */}
                                    <div className="grid grid-cols-3 gap-1.5">
                                        <a
                                            href={`/${org.slug}/admin`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="h-8 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-all shadow-lg shadow-violet-600/20"
                                            title="Accéder au backoffice de l'école"
                                        >
                                            <ShieldCheck className="w-3 h-3" /> Admin
                                        </a>
                                        <a
                                            href={`/${org.slug}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-all border border-white/10"
                                            title="Voir le portail public"
                                        >
                                            <Eye className="w-3 h-3" /> Portail
                                        </a>
                                        <a
                                            href={`/${org.slug}/campus`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-all border border-white/10"
                                            title="Voir l'espace campus"
                                        >
                                            <School className="w-3 h-3" /> Campus
                                        </a>
                                    </div>

                                    {/* Secondary tools */}
                                    <div className="flex items-center justify-between gap-1.5 pt-1">
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
                                            onClick={() => onToggleActive(org)}
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
        </div>
    );
}
