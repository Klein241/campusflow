'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, Check, Lock, Eye, CheckCircle2,
    Coins, ArrowRight, X, ExternalLink, ShieldCheck,
    Layers, LayoutDashboard, Palette, RefreshCw, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
    HERO_BANNER_STYLES,
    LANDING_LAYOUT_TEMPLATES,
    getPremiumStylesPricing,
    isStyleUnlocked,
    purchaseAndUnlockStyle,
    type HeroBannerStyle,
    type LandingLayoutTemplate
} from '@/lib/premium-styles-config';
import { TemplateHubOnglets } from './landing-templates/template-hub-onglets';
import { TemplateSegmentedHub } from './landing-templates/template-segmented-hub';
import { TemplateGlassShowcase } from './landing-templates/template-glass-showcase';
import { TemplateBentoGrid } from './landing-templates/template-bento-grid';
import { TemplateBentoBox } from './landing-templates/template-bento-box';

interface AdminPremiumStylesProps {
    org: any;
    orgSlug: string;
    adminSkyPoints: number;
    onUpdateOrg: (updatedOrg: any) => void;
    onUpdatePoints: (newBalance: number) => void;
}

export function AdminPremiumStyles({
    org,
    orgSlug,
    adminSkyPoints,
    onUpdateOrg,
    onUpdatePoints
}: AdminPremiumStylesProps) {
    const [prices, setPrices] = useState<Record<string, number>>({});
    const [loadingPrices, setLoadingPrices] = useState(true);
    const [selectedBanner, setSelectedBanner] = useState<string>(org?.hero_template || 'minimal');
    const [selectedLayout, setSelectedLayout] = useState<string>(org?.landing_layout || 'classic');
    const [previewingStyle, setPreviewingStyle] = useState<{ type: 'banner' | 'layout'; id: string } | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Charger les prix
    useEffect(() => {
        getPremiumStylesPricing().then(p => {
            setPrices(p);
            setLoadingPrices(false);
        });
    }, []);

    // Helper to get effective price
    const getPrice = (id: string, def: number) => {
        if (prices[id] !== undefined) return prices[id];
        return def;
    };

    // Appliquer ou débloquer une bannière
    const handleApplyBanner = async (banner: HeroBannerStyle) => {
        const cost = getPrice(banner.id, banner.defaultPrice);
        const unlocked = isStyleUnlocked(org, banner.id);

        if (!unlocked && cost > 0) {
            if (adminSkyPoints < cost) {
                toast.error(`Solde insuffisant : ${new Intl.NumberFormat('fr-FR').format(cost)} Sky Points requis (Solde actuel : ${new Intl.NumberFormat('fr-FR').format(adminSkyPoints)} pts)`);
                return;
            }
            setProcessingId(banner.id);
            const success = await purchaseAndUnlockStyle({
                org,
                styleId: banner.id,
                cost,
                currentBalance: adminSkyPoints,
                onSuccess: (newBalance) => {
                    onUpdatePoints(newBalance);
                    toast.success(`✨ Modèle "${banner.name}" débloqué avec succès ! (-${cost} Sky Pts)`);
                },
                onError: (msg) => toast.error(msg)
            });
            setProcessingId(null);
            if (!success) return;
        }

        // Sauvegarder la bannière
        setSelectedBanner(banner.id);
        if (typeof window !== 'undefined') {
            localStorage.setItem(`campusflow_hero_template_${org.id}`, banner.id);
            localStorage.setItem(`campusflow_hero_template_${org.slug}`, banner.id);
        }
        try {
            await supabase.from('organizations').update({ hero_template: banner.id }).eq('id', org.id);
        } catch {}
        onUpdateOrg({ ...org, hero_template: banner.id });
        toast.success(`Bannière "${banner.name}" appliquée à votre page d'accueil !`);
    };

    // Appliquer ou débloquer un layout complet
    const handleApplyLayout = async (layout: LandingLayoutTemplate) => {
        const cost = getPrice(layout.id, layout.defaultPrice);
        const unlocked = isStyleUnlocked(org, layout.id);

        if (!unlocked && cost > 0) {
            if (adminSkyPoints < cost) {
                toast.error(`Solde insuffisant : ${new Intl.NumberFormat('fr-FR').format(cost)} Sky Points requis (Solde actuel : ${new Intl.NumberFormat('fr-FR').format(adminSkyPoints)} pts)`);
                return;
            }
            setProcessingId(layout.id);
            const success = await purchaseAndUnlockStyle({
                org,
                styleId: layout.id,
                cost,
                currentBalance: adminSkyPoints,
                onSuccess: (newBalance) => {
                    onUpdatePoints(newBalance);
                    toast.success(`✨ Layout "${layout.name}" débloqué avec succès ! (-${cost} Sky Pts)`);
                },
                onError: (msg) => toast.error(msg)
            });
            setProcessingId(null);
            if (!success) return;
        }

        // Sauvegarder le layout
        setSelectedLayout(layout.id);
        if (typeof window !== 'undefined') {
            localStorage.setItem(`campusflow_landing_layout_${org.id}`, layout.id);
            localStorage.setItem(`campusflow_landing_layout_${org.slug}`, layout.id);
        }
        try {
            await supabase.from('organizations').update({ landing_layout: layout.id }).eq('id', org.id);
        } catch {}
        onUpdateOrg({ ...org, landing_layout: layout.id });
        toast.success(`Layout "${layout.name}" activé pour votre établissement !`);
    };

    return (
        <div className="space-y-8 max-w-5xl">
            {/* ═══ Header de la Section ═══ */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-indigo-500/10 border border-amber-500/20 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-2">
                        <Sparkles className="w-3.5 h-3.5" /> BOUTIQUE DES STYLES PREMIUM
                    </div>
                    <h2 className="text-xl sm:text-3xl font-black text-white">Personnalisation & Templates de Prestige</h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                        Prévisualisez gratuitement chaque modèle. Utilisez vos Sky Points pour débloquer et appliquer des designs d&apos;exception sur votre portail public.
                    </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10 text-center sm:text-right shrink-0">
                    <span className="text-xs text-slate-400 block mb-1">Votre Solde Sky Points :</span>
                    <span className="text-2xl font-black text-amber-400 flex items-center justify-center sm:justify-end gap-1.5">
                        <Coins className="w-5 h-5" /> {new Intl.NumberFormat('fr-FR').format(adminSkyPoints)} <span className="text-xs font-medium text-slate-400">pts</span>
                    </span>
                </div>
            </div>

            {/* ═══ SECTION 1 : MODÈLES DE BANNIÈRE HERO ═══ */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                            <Palette className="w-5 h-5 text-cyan-400" /> 1. Modèles de Bannière Hero
                        </h3>
                        <p className="text-xs text-slate-400">Ajustez le rendu supérieur de votre page d&apos;accueil (mobile & PC).</p>
                    </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                    {HERO_BANNER_STYLES.map(b => {
                        const cost = getPrice(b.id, b.defaultPrice);
                        const unlocked = isStyleUnlocked(org, b.id);
                        const isActive = selectedBanner === b.id;

                        return (
                            <div
                                key={b.id}
                                className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between relative bg-white/[0.02] ${
                                    isActive
                                        ? 'border-cyan-400 bg-cyan-500/5 shadow-xl shadow-cyan-500/10'
                                        : 'border-white/10 hover:border-white/20'
                                }`}
                            >
                                {isActive && (
                                    <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-400 text-slate-900 flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Actif
                                    </span>
                                )}

                                <div>
                                    <div className="text-3xl mb-3">{b.icon}</div>
                                    <h4 className="font-bold text-white text-base">{b.name}</h4>
                                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{b.description}</p>

                                    <ul className="mt-3 space-y-1.5 text-[11px] text-slate-300">
                                        {b.features.map((f, i) => (
                                            <li key={i} className="flex items-center gap-1.5 text-slate-400">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="pt-5 mt-5 border-t border-white/10 flex items-center justify-between gap-2">
                                    <div className="text-xs font-black">
                                        {cost === 0 ? (
                                            <span className="text-emerald-400">Gratuit</span>
                                        ) : unlocked ? (
                                            <span className="text-teal-400">Débloqué ✅</span>
                                        ) : (
                                            <span className="text-amber-400 flex items-center gap-1">
                                                <Coins className="w-3.5 h-3.5" /> {cost} pts
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex gap-1.5">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setPreviewingStyle({ type: 'banner', id: b.id })}
                                            className="h-8 px-2.5 text-xs text-slate-400 hover:text-white"
                                            title="Prévisualiser"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleApplyBanner(b)}
                                            disabled={processingId === b.id}
                                            className={`h-8 px-3 text-xs font-bold rounded-xl ${
                                                isActive
                                                    ? 'bg-white/10 text-slate-400 hover:bg-white/15'
                                                    : unlocked
                                                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                                                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black'
                                            }`}
                                        >
                                            {processingId === b.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : isActive ? (
                                                'Appliqué'
                                            ) : unlocked ? (
                                                'Appliquer'
                                            ) : (
                                                `Débloquer (${cost} pts)`
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ═══ SECTION 2 : MODÈLES DE CONFIGURATION COMPLÈTE ═══ */}
            <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                            <Layers className="w-5 h-5 text-amber-400" /> 2. Modèles de Configuration Complète (Landing Page)
                        </h3>
                        <p className="text-xs text-slate-400">Éliminez le défilement long et offrez une ergonomie moderne à votre école.</p>
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {LANDING_LAYOUT_TEMPLATES.map(t => {
                        const cost = getPrice(t.id, t.defaultPrice);
                        const unlocked = isStyleUnlocked(org, t.id);
                        const isActive = selectedLayout === t.id;

                        return (
                            <div
                                key={t.id}
                                className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between relative bg-white/[0.02] ${
                                    isActive
                                        ? 'border-amber-400 bg-amber-500/5 shadow-xl shadow-amber-500/10'
                                        : 'border-white/10 hover:border-white/20'
                                }`}
                            >
                                {isActive && (
                                    <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-900 flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Actif
                                    </span>
                                )}

                                <div>
                                    <div className="text-3xl mb-3">{t.icon}</div>
                                    <h4 className="font-bold text-white text-base">{t.name}</h4>
                                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{t.description}</p>

                                    <ul className="mt-3 space-y-1.5 text-[11px] text-slate-300">
                                        {t.highlights.map((h, i) => (
                                            <li key={i} className="flex items-center gap-1.5 text-slate-400">
                                                <Sparkles className="w-3 h-3 text-amber-400 shrink-0" /> {h}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="pt-5 mt-5 border-t border-white/10 flex items-center justify-between gap-2">
                                    <div className="text-xs font-black">
                                        {cost === 0 ? (
                                            <span className="text-emerald-400">Inclus</span>
                                        ) : unlocked ? (
                                            <span className="text-teal-400">Débloqué ✅</span>
                                        ) : (
                                            <span className="text-amber-400 flex items-center gap-1">
                                                <Coins className="w-3.5 h-3.5" /> {new Intl.NumberFormat('fr-FR').format(cost)} pts
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex gap-1.5">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setPreviewingStyle({ type: 'layout', id: t.id })}
                                            className="h-8 px-2.5 text-xs text-slate-400 hover:text-white"
                                            title="Prévisualiser"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleApplyLayout(t)}
                                            disabled={processingId === t.id}
                                            className={`h-8 px-3 text-xs font-bold rounded-xl ${
                                                isActive
                                                    ? 'bg-white/10 text-slate-400 hover:bg-white/15'
                                                    : unlocked
                                                        ? 'bg-teal-600 hover:bg-teal-500 text-white'
                                                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black'
                                            }`}
                                        >
                                            {processingId === t.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : isActive ? (
                                                'Appliqué'
                                            ) : unlocked ? (
                                                'Appliquer'
                                            ) : (
                                                `Débloquer (${new Intl.NumberFormat('fr-FR').format(cost)} pts)`
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ═══ MODALE DE PRÉVISUALISATION DIRECTE ═══ */}
            <AnimatePresence>
                {previewingStyle && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-5xl h-[85vh] bg-[#0B0E14] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
                            {/* Header de la Prévisualisation */}
                            <div className="p-4 border-b border-white/10 bg-[#0F131D] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Eye className="w-4 h-4 text-cyan-400" />
                                    <span className="font-bold text-sm text-white">
                                        Prévisualisation en direct : {previewingStyle.type === 'banner' ? HERO_BANNER_STYLES.find(b => b.id === previewingStyle.id)?.name : LANDING_LAYOUT_TEMPLATES.find(l => l.id === previewingStyle.id)?.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPreviewingStyle(null)}
                                        className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Frame de rendu du template */}
                            <div className="flex-1 overflow-y-auto p-4 bg-[#08090E]">
                                {previewingStyle.id === 'hub_onglets' && (
                                    <TemplateHubOnglets
                                        org={org}
                                        orgSlug={orgSlug}
                                        classrooms={[{ id: '1', name: '6ème A' }, { id: '2', name: 'Terminale C' }]}
                                        filieres={[{ id: '1', nom: 'Informatique & Réseaux', duree_mois: 24, frais_scolarite: 350000, description: 'Formation pratique certifiée.' }]}
                                        teacherCount={12}
                                        studentCount={180}
                                        gallery={org.gallery_images || []}
                                        bc={org.brand_color || '#14b8a6'}
                                    />
                                )}

                                {previewingStyle.id === 'segmented_hub' && (
                                    <TemplateSegmentedHub
                                        org={org}
                                        orgSlug={orgSlug}
                                        classrooms={[{ id: '1', name: '6ème A' }, { id: '2', name: 'Terminale C' }]}
                                        filieres={[{ id: '1', nom: 'Génie Logiciel', duree_mois: 36, frais_scolarite: 450000, description: 'Développement web, mobile et IA.' }]}
                                        teacherCount={15}
                                        studentCount={250}
                                        gallery={org.gallery_images || []}
                                        bc={org.brand_color || '#14b8a6'}
                                    />
                                )}

                                {previewingStyle.id === 'glass_showcase' && (
                                    <TemplateGlassShowcase
                                        org={org}
                                        orgSlug={orgSlug}
                                        classrooms={[{ id: '1', name: 'Licence 1' }]}
                                        filieres={[{ id: '1', nom: 'Management & Finance', duree_mois: 36, frais_scolarite: 500000 }]}
                                        teacherCount={20}
                                        studentCount={320}
                                        gallery={org.gallery_images || []}
                                        bc={org.brand_color || '#14b8a6'}
                                    />
                                )}

                                {previewingStyle.id === 'bento_grid' && (
                                    <TemplateBentoGrid
                                        org={org}
                                        orgSlug={orgSlug}
                                        classrooms={[{ id: '1', name: 'Cycle Pro' }]}
                                        filieres={[{ id: '1', nom: 'Design Digital & UI/UX', duree_mois: 12, frais_scolarite: 300000 }]}
                                        teacherCount={8}
                                        studentCount={95}
                                        gallery={org.gallery_images || []}
                                        bc={org.brand_color || '#14b8a6'}
                                    />
                                )}

                                {previewingStyle.id === 'bento_box' && (
                                    <TemplateBentoBox
                                        org={org}
                                        orgSlug={orgSlug}
                                        classrooms={[{ id: '1', name: 'MBA Executive' }]}
                                        filieres={[{ id: '1', nom: 'Intelligence Artificielle & Data', duree_mois: 24, frais_scolarite: 650000 }]}
                                        teacherCount={25}
                                        studentCount={400}
                                        gallery={org.gallery_images || []}
                                        bc={org.brand_color || '#14b8a6'}
                                    />
                                )}

                                {previewingStyle.id === 'classic' && (
                                    <div className="p-8 text-center text-slate-400 space-y-3">
                                        <p className="text-base font-bold text-white">Modèle Défilement Classique Standard</p>
                                        <p className="text-xs">Toutes les sections (Hero, Stats, Formations, Galerie, À Propos, Contact) défilent les unes après les autres.</p>
                                    </div>
                                )}

                                {previewingStyle.type === 'banner' && (
                                    <div className="p-8 text-center text-slate-400 space-y-3">
                                        <p className="text-base font-bold text-white">Aperçu Bannière Hero : {previewingStyle.id}</p>
                                        <p className="text-xs">Le style sélectionné s&apos;affiche directement en tête de votre page d&apos;accueil.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
