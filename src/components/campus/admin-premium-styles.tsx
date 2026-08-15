'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, Check, Eye, X, Coins, Loader2, CheckCircle2,
    ZoomIn, Crown, Lock
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

interface AdminPremiumStylesProps {
    org: any;
    orgSlug: string;
    adminSkyPoints: number;
    onUpdateOrg: (updatedOrg: any) => void;
    onUpdatePoints: (newBalance: number) => void;
}

// ═══ Composant Carte Bannière ═══
function BannerCard({
    banner, cost, isActive, isUnlocked, processing,
    onPreview, onApply
}: {
    banner: HeroBannerStyle;
    cost: number;
    isActive: boolean;
    isUnlocked: boolean;
    processing: boolean;
    onPreview: () => void;
    onApply: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={`group relative rounded-2xl border-2 overflow-hidden cursor-pointer transition-all duration-300 ${
                isActive
                    ? 'border-cyan-400 shadow-2xl shadow-cyan-500/20'
                    : 'border-white/10 hover:border-white/25'
            }`}
        >
            {/* — Miniature image — */}
            <div className="relative aspect-video overflow-hidden bg-slate-900" onClick={onPreview}>
                <img
                    src={banner.previewImage}
                    alt={banner.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
                {/* Overlay dark */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#08090E] via-[#08090E]/20 to-transparent" />

                {/* Badges */}
                <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                    {isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-400 text-slate-900 flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Actif
                        </span>
                    )}
                    {isUnlocked && !isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/90 text-white">
                            Débloqué ✅
                        </span>
                    )}
                    {!isUnlocked && cost > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/90 text-slate-950 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> {new Intl.NumberFormat('fr-FR').format(cost)} pts
                        </span>
                    )}
                    {cost === 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/90 text-white">
                            Gratuit
                        </span>
                    )}
                </div>

                {/* Zoom hint */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                        <ZoomIn className="w-5 h-5 text-white" />
                    </div>
                </div>
            </div>

            {/* — Contenu texte — */}
            <div className="p-4 bg-[#0D1117]">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="font-black text-sm text-white leading-tight">{banner.icon} {banner.name}</h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{banner.description}</p>

                <ul className="space-y-1 mb-4">
                    {banner.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> {f}
                        </li>
                    ))}
                </ul>

                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onPreview}
                        className="flex-1 h-8 text-xs text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl"
                    >
                        <Eye className="w-3.5 h-3.5 mr-1" /> Voir
                    </Button>
                    <Button
                        size="sm"
                        onClick={onApply}
                        disabled={processing || isActive}
                        className={`flex-1 h-8 text-xs font-bold rounded-xl transition-all ${
                            isActive
                                ? 'bg-white/5 text-slate-500 cursor-default'
                                : isUnlocked
                                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                                    : cost === 0
                                        ? 'bg-teal-600 hover:bg-teal-500 text-white'
                                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black'
                        }`}
                    >
                        {processing
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : isActive ? 'Appliqué'
                            : isUnlocked ? 'Appliquer'
                            : cost === 0 ? 'Appliquer'
                            : `Débloquer`
                        }
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}

// ═══ Composant Carte Layout ═══
function LayoutCard({
    layout, cost, isActive, isUnlocked, processing,
    onPreview, onApply
}: {
    layout: LandingLayoutTemplate;
    cost: number;
    isActive: boolean;
    isUnlocked: boolean;
    processing: boolean;
    onPreview: () => void;
    onApply: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={`group relative rounded-2xl border-2 overflow-hidden transition-all duration-300 ${
                isActive
                    ? 'border-amber-400 shadow-2xl shadow-amber-500/20'
                    : 'border-white/10 hover:border-white/25'
            }`}
        >
            {/* — Miniature — */}
            <div className="relative aspect-video overflow-hidden bg-slate-900 cursor-pointer" onClick={onPreview}>
                <img
                    src={layout.previewImage}
                    alt={layout.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#08090E] via-[#08090E]/20 to-transparent" />

                {/* Badges */}
                <div className="absolute top-2.5 left-2.5 flex gap-1.5 flex-wrap">
                    {isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-900 flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Actif
                        </span>
                    )}
                    {cost === 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/90 text-white">
                            Inclus
                        </span>
                    )}
                    {!isUnlocked && cost > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/90 text-slate-950 flex items-center gap-0.5">
                            <Crown className="w-2.5 h-2.5" /> {new Intl.NumberFormat('fr-FR').format(cost)} pts
                        </span>
                    )}
                    {isUnlocked && !isActive && cost > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/90 text-white">
                            Débloqué ✅
                        </span>
                    )}
                </div>

                {/* Zoom */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                        <ZoomIn className="w-5 h-5 text-white" />
                    </div>
                </div>
            </div>

            {/* — Texte — */}
            <div className="p-4 bg-[#0D1117]">
                <h4 className="font-black text-sm text-white mb-1">{layout.icon} {layout.name}</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{layout.description}</p>

                <ul className="space-y-1 mb-4">
                    {layout.highlights.map((h, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" /> {h}
                        </li>
                    ))}
                </ul>

                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onPreview}
                        className="flex-1 h-8 text-xs text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl"
                    >
                        <Eye className="w-3.5 h-3.5 mr-1" /> Voir
                    </Button>
                    <Button
                        size="sm"
                        onClick={onApply}
                        disabled={processing || isActive}
                        className={`flex-1 h-8 text-xs font-bold rounded-xl ${
                            isActive
                                ? 'bg-white/5 text-slate-500 cursor-default'
                                : isUnlocked
                                    ? 'bg-teal-600 hover:bg-teal-500 text-white'
                                    : cost === 0
                                        ? 'bg-teal-600 hover:bg-teal-500 text-white'
                                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black'
                        }`}
                    >
                        {processing
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : isActive ? 'Appliqué'
                            : isUnlocked ? 'Appliquer'
                            : cost === 0 ? 'Appliquer'
                            : `Débloquer`
                        }
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}

// ═══ Composant Principal ═══
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
    const [previewImg, setPreviewImg] = useState<{ src: string; title: string } | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Toujours charger les prix depuis Supabase (jamais depuis le cache)
    const loadPrices = useCallback(async () => {
        setLoadingPrices(true);
        const p = await getPremiumStylesPricing();
        setPrices(p);
        setLoadingPrices(false);
    }, []);

    useEffect(() => { loadPrices(); }, [loadPrices]);

    const getPrice = (id: string, def: number) => prices[id] !== undefined ? prices[id] : def;

    // — Appliquer/Débloquer bannière —
    const handleApplyBanner = async (banner: HeroBannerStyle) => {
        const cost = getPrice(banner.id, banner.defaultPrice);
        const unlocked = isStyleUnlocked(org, banner.id);

        if (!unlocked && cost > 0) {
            if (adminSkyPoints < cost) {
                toast.error(`Solde insuffisant — ${new Intl.NumberFormat('fr-FR').format(cost)} pts requis`);
                return;
            }
            setProcessingId(banner.id);
            const ok = await purchaseAndUnlockStyle({
                org, styleId: banner.id, cost, currentBalance: adminSkyPoints,
                onSuccess: (nb) => { onUpdatePoints(nb); toast.success(`✨ "${banner.name}" débloqué !`); },
                onError: (msg) => toast.error(msg),
            });
            setProcessingId(null);
            if (!ok) return;
        }

        setSelectedBanner(banner.id);
        if (typeof window !== 'undefined') {
            localStorage.setItem(`campusflow_hero_template_${org.id}`, banner.id);
            localStorage.setItem(`campusflow_hero_template_${org.slug}`, banner.id);
        }
        try { await supabase.from('organizations').update({ hero_template: banner.id }).eq('id', org.id); } catch {}
        onUpdateOrg({ ...org, hero_template: banner.id });
        toast.success(`Bannière "${banner.name}" appliquée !`);
    };

    // — Appliquer/Débloquer layout —
    const handleApplyLayout = async (layout: LandingLayoutTemplate) => {
        const cost = getPrice(layout.id, layout.defaultPrice);
        const unlocked = isStyleUnlocked(org, layout.id);

        if (!unlocked && cost > 0) {
            if (adminSkyPoints < cost) {
                toast.error(`Solde insuffisant — ${new Intl.NumberFormat('fr-FR').format(cost)} pts requis`);
                return;
            }
            setProcessingId(layout.id);
            const ok = await purchaseAndUnlockStyle({
                org, styleId: layout.id, cost, currentBalance: adminSkyPoints,
                onSuccess: (nb) => { onUpdatePoints(nb); toast.success(`✨ "${layout.name}" débloqué !`); },
                onError: (msg) => toast.error(msg),
            });
            setProcessingId(null);
            if (!ok) return;
        }

        setSelectedLayout(layout.id);
        if (typeof window !== 'undefined') {
            localStorage.setItem(`campusflow_landing_layout_${org.id}`, layout.id);
            localStorage.setItem(`campusflow_landing_layout_${org.slug}`, layout.id);
        }
        try { await supabase.from('organizations').update({ landing_layout: layout.id }).eq('id', org.id); } catch {}
        onUpdateOrg({ ...org, landing_layout: layout.id });
        toast.success(`Layout "${layout.name}" activé !`);
    };

    return (
        <div className="space-y-10 max-w-5xl">

            {/* ── En-tête ──────────────────────────────────────────── */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-indigo-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-2">
                        <Sparkles className="w-3.5 h-3.5" /> BOUTIQUE STYLES PREMIUM
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white">Templates & Personnalisation</h2>
                    <p className="text-xs text-slate-400 mt-1">Cliquez sur une miniature pour la voir en plein écran. Débloquée avec vos Sky Points, elle s&apos;applique instantanément sur votre portail public.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10 text-center shrink-0">
                    <span className="text-xs text-slate-400 block mb-1">Solde</span>
                    <span className="text-2xl font-black text-amber-400 flex items-center gap-1.5">
                        <Coins className="w-5 h-5" />
                        {new Intl.NumberFormat('fr-FR').format(adminSkyPoints)}
                        <span className="text-xs font-medium text-slate-400">pts</span>
                    </span>
                    <button onClick={loadPrices} className="mt-1 text-[10px] text-slate-600 hover:text-slate-400 underline transition-colors">
                        {loadingPrices ? 'Actualisation…' : 'Actualiser les prix'}
                    </button>
                </div>
            </div>

            {/* ── SECTION 1 : Bannières Hero ────────────────────────── */}
            <div className="space-y-5">
                <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                        🎨 Bannières Hero
                        <span className="text-xs font-normal text-slate-500">— Rendu supérieur de votre page d&apos;accueil</span>
                    </h3>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                    {HERO_BANNER_STYLES.map(b => (
                        <BannerCard
                            key={b.id}
                            banner={b}
                            cost={getPrice(b.id, b.defaultPrice)}
                            isActive={selectedBanner === b.id}
                            isUnlocked={isStyleUnlocked(org, b.id)}
                            processing={processingId === b.id}
                            onPreview={() => setPreviewImg({ src: b.previewImage, title: b.name })}
                            onApply={() => handleApplyBanner(b)}
                        />
                    ))}
                </div>
            </div>

            {/* ── SECTION 2 : Modèles Landing Page ─────────────────── */}
            <div className="space-y-5 pt-4 border-t border-white/[0.06]">
                <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                        🏗️ Modèles de Landing Page Complète
                        <span className="text-xs font-normal text-slate-500">— Remplace la page longue par une expérience moderne</span>
                    </h3>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {LANDING_LAYOUT_TEMPLATES.map(t => (
                        <LayoutCard
                            key={t.id}
                            layout={t}
                            cost={getPrice(t.id, t.defaultPrice)}
                            isActive={selectedLayout === t.id}
                            isUnlocked={isStyleUnlocked(org, t.id)}
                            processing={processingId === t.id}
                            onPreview={() => setPreviewImg({ src: t.previewImage, title: t.name })}
                            onApply={() => handleApplyLayout(t)}
                        />
                    ))}
                </div>
            </div>

            {/* ── MODALE PLEIN ÉCRAN ────────────────────────────────── */}
            <AnimatePresence>
                {previewImg && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col"
                        onClick={() => setPreviewImg(null)}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0F131D]/90 backdrop-blur-sm shrink-0" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-3">
                                <Eye className="w-4 h-4 text-cyan-400" />
                                <span className="font-black text-sm text-white">{previewImg.title}</span>
                                <span className="text-[10px] text-slate-500 hidden sm:block">— Prévisualisation du design</span>
                            </div>
                            <button
                                onClick={() => setPreviewImg(null)}
                                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Image plein écran avec scroll */}
                        <div className="flex-1 overflow-auto flex items-start justify-center p-4" onClick={() => setPreviewImg(null)}>
                            <motion.img
                                initial={{ scale: 0.92, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.92, opacity: 0 }}
                                transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                                src={previewImg.src}
                                alt={previewImg.title}
                                className="max-w-4xl w-full rounded-2xl shadow-2xl border border-white/10"
                                onClick={e => e.stopPropagation()}
                            />
                        </div>

                        {/* Footer */}
                        <div className="shrink-0 py-3 text-center text-[11px] text-slate-600">
                            Cliquez en dehors de l&apos;image pour fermer
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
