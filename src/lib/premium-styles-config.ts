'use client';

import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════════════
// TYPES & CATALOGUE DES STYLES PREMIUM
// ═══════════════════════════════════════════════════════════════════════

export interface HeroBannerStyle {
    id: 'minimal' | 'full' | 'split';
    name: string;
    description: string;
    defaultPrice: number;
    icon: string;
    badgeText?: string;
    isDefault?: boolean;
    features: string[];
    previewImage: string; // chemin public
}

export interface LandingLayoutTemplate {
    id: 'classic' | 'hub_onglets' | 'segmented_hub' | 'glass_showcase' | 'bento_grid' | 'bento_box' | 'coach_pastelle' | 'creative_studio' | 'tech_mentor' | 'product_mastery' | 'nexis_studio';
    name: string;
    description: string;
    category?: 'general' | 'formateur' | 'prestige' | 'entreprise';
    defaultPrice: number;
    icon: string;
    badgeText?: string;
    highlights: string[];
    isDefault?: boolean;
    previewImage: string; // chemin public
}

/** Bannières Hero */
export const HERO_BANNER_STYLES: HeroBannerStyle[] = [
    {
        id: 'split',
        name: 'Deux Colonnes Studio (Par Défaut)',
        description: 'Texte à gauche et carte photo 3D à droite. Sur mobile, l\'image s\'affiche en cadre 16:9 non étirée.',
        defaultPrice: 0,
        icon: '⬛',
        badgeText: 'Par Défaut',
        isDefault: true,
        features: ['Zéro déformation sur smartphone', 'Badge 3D flottant avec logo', 'Structure 2 colonnes ergonomique'],
        previewImage: '/templates/segmented_hub.jpg',
    },
    {
        id: 'minimal',
        name: 'Minimaliste & Épuré',
        description: 'Dégradé de couleur Mesh Gradient d\'ambiance aux couleurs de l\'école. Idéal sans image de fond.',
        defaultPrice: 0,
        icon: '✨',
        badgeText: 'Gratuit',
        features: ['Zéro image requise', 'Typographie royale centrée', 'Temps de chargement ultra-rapide'],
        previewImage: '/templates/classic.jpg',
    },
    {
        id: 'full',
        name: 'Plein Écran Immersif',
        description: 'Image en fond d\'écran complet avec filtres dégradés protecteurs pour une lisibilité parfaite.',
        defaultPrice: 500,
        icon: '🖼️',
        badgeText: '500 Sky Pts',
        features: ['Image plein écran responsive', 'Dégradé sombre contrasté', 'Boutons d\'action néon'],
        previewImage: '/templates/glass_showcase.jpg',
    },
];

/** Modèles de Landing Page Complète */
export const LANDING_LAYOUT_TEMPLATES: LandingLayoutTemplate[] = [
    {
        id: 'bento_grid',
        name: '⚡ Bento Grid Moderne & Espaces Dédiés',
        description: 'Mosaïque asymétrique moderne organisant les statistiques, programmes phares et témoignages.',
        category: 'prestige',
        defaultPrice: 0,
        icon: '⚡',
        badgeText: 'Par Défaut',
        isDefault: true,
        highlights: ['Disposition Bento Grid moderne', 'Cartes interactives modulaires', 'Expérience immersive haut de gamme'],
        previewImage: '/templates/bento_grid.jpg',
    },
    {
        id: 'bento_box',
        name: '👑 Bento Box Studio Prestige',
        description: 'Le summum du design interactif avec widgets vivants, fil d\'actualités et simulateur de formation.',
        category: 'prestige',
        defaultPrice: 15000,
        icon: '👑',
        badgeText: 'Prestige',
        highlights: ['Widgets interactifs animés', 'Simulateur de cursus en temps réel', 'Conversion maximale pour admissions'],
        previewImage: '/templates/bento_box.jpg',
    },
    {
        id: 'glass_showcase',
        name: '💎 Glassmorphism Showcase & Dock Flottant',
        description: 'Cartes en verre dépoli translucide avec halo néon et dock de navigation flottant au bas de l\'écran.',
        category: 'prestige',
        defaultPrice: 7000,
        icon: '💎',
        badgeText: '7 000 Sky Pts',
        highlights: ['Dock flottant au bas de l\'écran', 'Effet verre dépoli luxe Apple-style', 'Inscription rapide en 1 clic'],
        previewImage: '/templates/glass_showcase.jpg',
    },
    {
        id: 'segmented_hub',
        name: '🔍 Le Hub Segmenté Interactif',
        description: 'Barre de recherche rapide + barre de pastilles flottantes pour explorer les formations et la galerie.',
        category: 'general',
        defaultPrice: 6000,
        icon: '🔍',
        badgeText: '6 000 Sky Pts',
        highlights: ['Moteur de recherche de cours intégré', 'Pastilles tactiles interactives', 'Transitions micro-animées'],
        previewImage: '/templates/segmented_hub.jpg',
    },
    {
        id: 'hub_onglets',
        name: '🏛️ Modèle Hub Onglets',
        description: 'Design ultra-compact sans défilement infini : chaque rubrique s\'affiche dans son onglet dédié.',
        category: 'general',
        defaultPrice: 5000,
        icon: '🏛️',
        badgeText: '5 000 Sky Pts',
        highlights: ['0 défilement lourd sur mobile', 'Navigation instantanée fluide', 'Conteneur moderne vitré'],
        previewImage: '/templates/hub_onglets.jpg',
    },
    {
        id: 'classic',
        name: '📜 Modèle Défilement Classique',
        description: 'Disposition traditionnelle avec toutes les sections empilées de haut en bas.',
        category: 'general',
        defaultPrice: 0,
        icon: '📜',
        badgeText: 'Classique',
        highlights: ['Page longue classique', 'Toutes rubriques visibles en continu', 'Standard universel'],
        previewImage: '/templates/classic.jpg',
    },

    // ═══════════════════════════════════════════════════════════════════
    // 4 NOUVEAUX MODÈLES FORMATEUR / COACH / EXPERT INDÉPENDANT
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'coach_pastelle',
        name: '🌸 Modèle Julie — Élégance Pastel & Masterclass',
        description: 'Style épuré haute couture pour coachs, auteurs et formateurs certifiés. Mise en avant des livres, podcasts et programmes.',
        category: 'formateur',
        defaultPrice: 12000,
        icon: '🌸',
        badgeText: 'Coach & Expert',
        highlights: ['Design épuré ciel pastel & typographie Serif', 'Showcase livre & formation 3D', 'Section presse et apparitions médias'],
        previewImage: '/templates/coach_pastelle.jpg',
    },
    {
        id: 'creative_studio',
        name: '🎨 Modèle Mariana — Studio Créatif & Illustré',
        description: 'Ambiance vert forêt et tons chauds pour designers, formateurs créatifs et créateurs de contenu. Badge animé et portfolio interactif.',
        category: 'formateur',
        defaultPrice: 12000,
        icon: '🎨',
        badgeText: 'Studio Créatif',
        highlights: ['Palette vert forêt & crème chaleureuse', 'Grille de formations avec filtres par pastilles', 'Cartes de services illustrées & badges stats'],
        previewImage: '/templates/creative_studio.jpg',
    },
    {
        id: 'tech_mentor',
        name: '⚡ Modèle Jenna — Dark Cyber Néon & Tech Trainer',
        description: 'Thème sombre électrisant pour formateurs tech, développeurs, ingénieurs et experts UI/UX. Sphères 3D et cartes glowing.',
        category: 'formateur',
        defaultPrice: 12000,
        icon: '⚡',
        badgeText: 'Tech & Dev',
        highlights: ['Thème sombre profond avec halos bleu néon', 'Bandeau logos partenaires en défilement', 'Cartes de projets avec stats 5 étoiles'],
        previewImage: '/templates/tech_mentor.jpg',
    },
    {
        id: 'product_mastery',
        name: '🔥 Modèle Vladi — Orange Studio & Product Design',
        description: 'Contraste saisissant orange & carbone pour mentors produit, consultants et formateurs d\'élite. Éléments 3D et carrousel immersif.',
        category: 'formateur',
        defaultPrice: 12000,
        icon: '🔥',
        badgeText: 'Mentor & Design',
        highlights: ['Design audacieux orange & carbone 3D', 'Badge d\'expérience 5 étoiles', 'Carrousel de modules avec maquettes mobiles'],
        previewImage: '/templates/product_mastery.jpg',
    },
    {
        id: 'nexis_studio',
        name: '🏢 Modèle Nexis — Studio Noir & Jaune Corporate',
        description: 'Design d\'agence corporate audacieux noir & jaune avec bandeau de stats, section services en cartes bicolores, galerie de projets et formulaire de contact intégré.',
        category: 'entreprise',
        defaultPrice: 14000,
        icon: '🏢',
        badgeText: 'Corporate',
        highlights: ['Palette noir & jaune premium corporate', 'Bandeau stats & section services bicolores', 'Galerie de projets filtrée + formulaire contact'],
        previewImage: '/templates/nexis_studio.jpg',
    },
];

// ═══════════════════════════════════════════════════════════════════════
// GESTION DES PRIX — TOUJOURS DEPUIS SUPABASE (sans cache localStorage)
// ═══════════════════════════════════════════════════════════════════════

/** Récupère la grille tarifaire FRAÎCHE depuis Supabase à chaque appel (avec fallback localStorage) */
export async function getPremiumStylesPricing(): Promise<Record<string, number>> {
    const defaultPrices: Record<string, number> = {};
    HERO_BANNER_STYLES.forEach(b => { defaultPrices[b.id] = b.defaultPrice; });
    LANDING_LAYOUT_TEMPLATES.forEach(t => { defaultPrices[t.id] = t.defaultPrice; });

    try {
        const { data, error } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('key', 'premium_styles_pricing')
            .maybeSingle();

        if (!error && data?.value) {
            let parsedValue: any = data.value;
            if (typeof parsedValue === 'string') {
                try {
                    parsedValue = JSON.parse(parsedValue);
                } catch {}
            }

            if (parsedValue && typeof parsedValue === 'object') {
                const cleaned: Record<string, number> = {};
                for (const [k, v] of Object.entries(parsedValue)) {
                    cleaned[k] = typeof v === 'number' ? v : (parseInt(String(v), 10) || 0);
                }
                return { ...defaultPrices, ...cleaned };
            }
        }
    } catch (e) {
        console.warn('[PremiumStyles] Impossible de charger les prix depuis Supabase, utilisation des prix par défaut:', e);
    }

    return defaultPrices;
}

/** Met à jour la grille tarifaire dans Supabase (Superadmin uniquement) */
export async function updatePremiumStylesPricing(newPrices: Record<string, number>): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('platform_settings')
            .upsert({
                key: 'premium_styles_pricing',
                value: newPrices,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'key' });

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        console.error('[PremiumStyles] Erreur sauvegarde prix:', e);
        return { success: false, error: e.message || 'Erreur inconnue' };
    }
}

/** Alias pour la sauvegarde des prix */
export async function savePremiumStylesPricing(newPrices: Record<string, number>): Promise<boolean> {
    const res = await updatePremiumStylesPricing(newPrices);
    return res.success;
}

/** Vérifie si un style ou template est débloqué pour une école */
export function isStyleUnlocked(org: any, styleId: string): boolean {
    if (!org) return false;
    // Les styles par défaut ou gratuits sont toujours débloqués
    if (styleId === 'classic' || styleId === 'minimal' || styleId === 'bento_grid' || styleId === 'split') return true;
    
    let unlocked: string[] = [];
    if (Array.isArray(org.unlocked_styles)) {
        unlocked = org.unlocked_styles;
    } else if (typeof window !== 'undefined') {
        try {
            unlocked = JSON.parse(localStorage.getItem(`campusflow_unlocked_styles_${org.id}`) || localStorage.getItem(`campusflow_unlocked_styles_${org.slug}`) || '[]');
        } catch {}
    }
    return unlocked.includes(styleId);
}

/** Achète et débloque un style premium avec des Sky Points */
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
    if (currentBalance < cost) {
        onError(`Solde insuffisant : ${new Intl.NumberFormat('fr-FR').format(cost)} Sky Points requis.`);
        return false;
    }

    try {
        const newBalance = currentBalance - cost;
        const currentUnlocked: string[] = Array.isArray(org.unlocked_styles) ? org.unlocked_styles : [];
        const nextUnlocked = Array.from(new Set([...currentUnlocked, styleId]));

        if (typeof window !== 'undefined') {
            localStorage.setItem(`campusflow_unlocked_styles_${org.id}`, JSON.stringify(nextUnlocked));
            localStorage.setItem(`campusflow_unlocked_styles_${org.slug}`, JSON.stringify(nextUnlocked));
        }

        // Mettre à jour l'organisation dans Supabase
        await supabase
            .from('organizations')
            .update({
                sky_points: newBalance,
                unlocked_styles: nextUnlocked
            })
            .eq('id', org.id);

        onSuccess(newBalance);
        return true;
    } catch (e: any) {
        onError(e.message || 'Erreur lors du déblocage du style.');
        return false;
    }
}
