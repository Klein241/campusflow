'use client';

import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════════════
// TYPES & CATALOGUE DES STYLES PREMIUM
// ═══════════════════════════════════════════════════════════════════════

export interface HeroBannerStyle {
    id: 'minimal' | 'full' | 'split';
    name: string;
    description: string;
    defaultPrice: number; // in Sky Points
    icon: string;
    badgeText?: string;
    features: string[];
}

export interface LandingLayoutTemplate {
    id: 'classic' | 'hub_onglets' | 'segmented_hub' | 'glass_showcase' | 'bento_grid' | 'bento_box';
    name: string;
    description: string;
    defaultPrice: number; // in Sky Points
    icon: string;
    badgeText?: string;
    highlights: string[];
    isDefault?: boolean;
}

/** Bannières Hero */
export const HERO_BANNER_STYLES: HeroBannerStyle[] = [
    {
        id: 'minimal',
        name: 'Minimaliste & Épuré',
        description: 'Dégradé de couleur Mesh Gradient d\'ambiance aux couleurs de l\'école. Idéal sans image de fond.',
        defaultPrice: 0, // Gratuit par défaut
        icon: '✨',
        badgeText: 'Gratuit',
        features: ['Zéro image requise', 'Typographie royale centrée', 'Temps de chargement ultra-rapide']
    },
    {
        id: 'full',
        name: 'Plein Écran Immersif',
        description: 'Image en fond d\'écran complet avec filtres dégradés protecteurs pour une lisibilité parfaite.',
        defaultPrice: 500,
        icon: '🖼️',
        badgeText: '500 Sky Pts',
        features: ['Image plein écran responsive', 'Dégradé sombre contrasté', 'Boutons d\'action néon']
    },
    {
        id: 'split',
        name: 'Deux Colonnes Studio',
        description: 'Texte à gauche et carte photo 3D à droite. Sur mobile, l\'image s\'affiche en cadre 16:9 non étirée.',
        defaultPrice: 750,
        icon: '⬛',
        badgeText: '750 Sky Pts',
        features: ['Zéro déformation sur smartphone', 'Badge 3D flottant avec logo', 'Structure 2 colonnes ergonomique']
    }
];

/** Modèles de Landing Page Complète */
export const LANDING_LAYOUT_TEMPLATES: LandingLayoutTemplate[] = [
    {
        id: 'classic',
        name: 'Modèle Défilement Classique',
        description: 'Disposition traditionnelle avec toutes les sections empilées de haut en bas.',
        defaultPrice: 0,
        icon: '📜',
        badgeText: 'Inclus',
        isDefault: true,
        highlights: ['Page longue classique', 'Toutes rubriques visibles en continu', 'Standard universel']
    },
    {
        id: 'hub_onglets',
        name: 'Modèle Hub Onglets',
        description: 'Design ultra-compact sans défilement infini : chaque rubrique s\'affiche dans son onglet dédié.',
        defaultPrice: 5000,
        icon: '🏛️',
        badgeText: '5 000 Sky Pts',
        highlights: ['0 défilement lourd sur mobile', 'Navigation instantanée fluide', 'Conteneur moderne vitré']
    },
    {
        id: 'segmented_hub',
        name: 'Le Hub Segmenté Interactif',
        description: 'Barre de recherche rapide + barre de pastilles flottantes pour explorer les formations et la galerie.',
        defaultPrice: 6000,
        icon: '🔍',
        badgeText: '6 000 Sky Pts',
        highlights: ['Moteur de recherche de cours intégré', 'Pastilles tactiles interactives', 'Transitions micro-animées']
    },
    {
        id: 'glass_showcase',
        name: 'Glassmorphism Showcase & Dock Flottant',
        description: 'Cartes en verre dépoli translucide avec halo néon et dock de navigation flottant au bas de l\'écran.',
        defaultPrice: 7000,
        icon: '💎',
        badgeText: '7 000 Sky Pts',
        highlights: ['Dock flottant au bas de l\'écran', 'Effet verre dépoli luxe Apple-style', 'Inscription rapide en 1 clic']
    },
    {
        id: 'bento_grid',
        name: 'Bento Grid Moderne & Espaces Dédiés',
        description: 'Mosaïque asymétrique moderne organisant les statistiques, programmes phares et témoignages.',
        defaultPrice: 75000,
        icon: '🍱',
        badgeText: '75 000 Sky Pts',
        highlights: ['Disposition Bento Grid moderne', 'Cartes interactives modulaires', 'Expérience immersive haut de gamme']
    },
    {
        id: 'bento_box',
        name: 'Modèle Bento Box Studio Prestige',
        description: 'Le summum du design interactif avec widgets vivants, fil d\'actualités et simulateur de formation.',
        defaultPrice: 85000,
        icon: '👑',
        badgeText: '85 000 Sky Pts',
        highlights: ['Widgets interactifs animés', 'Simulateur de cursus en temps réel', 'Conversion maximale pour admissions']
    }
];

// ═══════════════════════════════════════════════════════════════════════
// GESTION DES PRIX PERSONNALISÉS PAR LE SUPER ADMIN
// ═══════════════════════════════════════════════════════════════════════

const PRICING_STORAGE_KEY = 'campusflow_premium_styles_pricing_v1';

/** Récupère la grille tarifaire (avec override Super Admin si défini) */
export async function getPremiumStylesPricing(): Promise<Record<string, number>> {
    const defaultPrices: Record<string, number> = {};
    HERO_BANNER_STYLES.forEach(b => { defaultPrices[b.id] = b.defaultPrice; });
    LANDING_LAYOUT_TEMPLATES.forEach(t => { defaultPrices[t.id] = t.defaultPrice; });

    // 1. Check local cache
    if (typeof window !== 'undefined') {
        try {
            const cached = localStorage.getItem(PRICING_STORAGE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                return { ...defaultPrices, ...parsed };
            }
        } catch {}
    }

    // 2. Fetch from Supabase platform_settings if exists
    try {
        const { data } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('key', 'premium_styles_pricing')
            .maybeSingle();

        if (data?.value && typeof data.value === 'object') {
            if (typeof window !== 'undefined') {
                localStorage.setItem(PRICING_STORAGE_KEY, JSON.stringify(data.value));
            }
            return { ...defaultPrices, ...data.value };
        }
    } catch {}

    return defaultPrices;
}

/** Met à jour la grille tarifaire par le Super Admin */
export async function savePremiumStylesPricing(prices: Record<string, number>): Promise<boolean> {
    if (typeof window !== 'undefined') {
        localStorage.setItem(PRICING_STORAGE_KEY, JSON.stringify(prices));
    }
    try {
        await supabase.from('platform_settings').upsert({
            key: 'premium_styles_pricing',
            value: prices,
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
        return true;
    } catch {
        return true; // local fallback works
    }
}

// ═══════════════════════════════════════════════════════════════════════
// VÉRIFICATION & ACHAT DE STYLES
// ═══════════════════════════════════════════════════════════════════════

/** Vérifie si un style (bannière ou layout) est débloqué pour une école */
export function isStyleUnlocked(org: any, styleId: string): boolean {
    if (!org) return false;
    // Les styles gratuits sont toujours débloqués
    if (styleId === 'minimal' || styleId === 'classic' || styleId === '') return true;

    // Vérifier dans les styles débloqués stockés dans l'org
    const unlocked: string[] = Array.isArray(org.unlocked_styles)
        ? org.unlocked_styles
        : typeof org.unlocked_styles === 'string'
            ? (() => { try { return JSON.parse(org.unlocked_styles); } catch { return []; } })()
            : [];

    if (unlocked.includes(styleId)) return true;

    // Fallback localStorage
    if (typeof window !== 'undefined' && org.id) {
        try {
            const local = localStorage.getItem(`campusflow_unlocked_${org.id}`);
            if (local) {
                const list: string[] = JSON.parse(local);
                if (list.includes(styleId)) return true;
            }
        } catch {}
    }

    return false;
}

/** Enregistre l'achat d'un style avec déduction des Sky Points */
export async function purchaseAndUnlockStyle({
    org,
    styleId,
    cost,
    currentBalance,
    onSuccess,
    onError
}: {
    org: any;
    styleId: string;
    cost: number;
    currentBalance: number;
    onSuccess: (newBalance: number) => void;
    onError: (msg: string) => void;
}): Promise<boolean> {
    if (cost > 0 && currentBalance < cost) {
        onError(`Solde insuffisant : ${new Intl.NumberFormat('fr-FR').format(cost)} Sky Points requis (Solde actuel : ${new Intl.NumberFormat('fr-FR').format(currentBalance)} pts)`);
        return false;
    }

    const newBalance = Math.max(0, currentBalance - cost);

    // Mettre à jour la liste des styles débloqués
    const currentUnlocked: string[] = Array.isArray(org.unlocked_styles)
        ? org.unlocked_styles
        : typeof org.unlocked_styles === 'string'
            ? (() => { try { return JSON.parse(org.unlocked_styles); } catch { return []; } })()
            : [];

    const updatedUnlocked = Array.from(new Set([...currentUnlocked, styleId, 'minimal', 'classic']));

    // 1. Sauvegarder en local
    if (typeof window !== 'undefined') {
        localStorage.setItem(`campusflow_unlocked_${org.id}`, JSON.stringify(updatedUnlocked));
        localStorage.setItem(`campusflow_admin_points_${org.id}`, newBalance.toString());
    }

    // 2. Persister dans Supabase
    try {
        const updatePayload: any = {
            sky_points: newBalance,
            unlocked_styles: updatedUnlocked
        };

        let { error } = await supabase
            .from('organizations')
            .update(updatePayload)
            .eq('id', org.id);

        // Si la colonne unlocked_styles n'existe pas encore dans Supabase, sauvegarder sky_points seul
        if (error && error.message?.includes('unlocked_styles')) {
            await supabase.from('organizations').update({ sky_points: newBalance }).eq('id', org.id);
        }
    } catch (e: any) {
        console.warn('[PremiumStyles] Purchase DB sync warning:', e);
    }

    onSuccess(newBalance);
    return true;
}
