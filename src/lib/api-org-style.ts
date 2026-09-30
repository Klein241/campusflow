import { supabase } from '@/lib/supabase';
import { cleanMotto } from '@/lib/clean-motto';

const WORKER_URL =
    process.env.NEXT_PUBLIC_NOTIFICATION_WORKER_URL ||
    process.env.NEXT_PUBLIC_WORKER_URL ||
    'https://campusflow-worker.kleintaptue1.workers.dev';

export interface OrgStyleUpdatePayload {
    hero_template?: string;
    landing_layout?: string;
    template_config?: any;
    unlocked_styles?: string[];
    sky_points?: number;
    gallery_images?: string[];
    motto?: string;
    hero_title?: string;
    hero_subtitle?: string;
    brand_color?: string;
    about_text?: string;
    footer_text?: string;
}

/**
 * Sauvegarde garantie des styles et personnalisations de l'établissement.
 * Tente d'abord la mise à jour Supabase directe, puis bascule automatiquement
 * sur l'endpoint Cloudflare Worker (clé Service Role, contourne les verrous RLS).
 */
export async function saveOrgStyle(
    orgId: string,
    orgSlug: string,
    updates: OrgStyleUpdatePayload
): Promise<{ success: boolean; org?: any; error?: string }> {
    if (!orgId) return { success: false, error: 'orgId manquant' };

    // Nettoyage systématique de Dame SKY sur les champs texte
    const sanitizedUpdates: Record<string, any> = { ...updates };
    if (sanitizedUpdates.motto !== undefined) {
        sanitizedUpdates.motto = cleanMotto(sanitizedUpdates.motto);
    }
    if (sanitizedUpdates.hero_subtitle !== undefined) {
        sanitizedUpdates.hero_subtitle = cleanMotto(sanitizedUpdates.hero_subtitle);
    }

    // 1. Mise à jour instantanée du cache LocalStorage (expérience utilisateur fluide)
    if (typeof window !== 'undefined') {
        try {
            if (sanitizedUpdates.hero_template) {
                localStorage.setItem(`campusflow_hero_template_${orgId}`, sanitizedUpdates.hero_template);
                localStorage.setItem(`campusflow_hero_template_${orgSlug}`, sanitizedUpdates.hero_template);
            }
            if (sanitizedUpdates.landing_layout) {
                localStorage.setItem(`campusflow_landing_layout_${orgId}`, sanitizedUpdates.landing_layout);
                localStorage.setItem(`campusflow_landing_layout_${orgSlug}`, sanitizedUpdates.landing_layout);
            }
            if (sanitizedUpdates.template_config) {
                localStorage.setItem(`campusflow_template_config_${orgId}`, JSON.stringify(sanitizedUpdates.template_config));
                localStorage.setItem(`campusflow_template_config_${orgSlug}`, JSON.stringify(sanitizedUpdates.template_config));
            }
            if (sanitizedUpdates.unlocked_styles) {
                localStorage.setItem(`campusflow_unlocked_styles_${orgId}`, JSON.stringify(sanitizedUpdates.unlocked_styles));
                localStorage.setItem(`campusflow_unlocked_styles_${orgSlug}`, JSON.stringify(sanitizedUpdates.unlocked_styles));
            }
        } catch (e) {
            console.warn('[saveOrgStyle] Erreur cache local:', e);
        }
    }

    // 2. Tentative 1 : Direct Supabase Client
    let supabaseSuccess = false;
    let returnedData: any = null;
    try {
        const { data, error } = await supabase
            .from('organizations')
            .update(sanitizedUpdates)
            .eq('id', orgId)
            .select();

        if (!error && data && data.length > 0) {
            supabaseSuccess = true;
            returnedData = data[0];
            return { success: true, org: returnedData };
        } else if (error) {
            console.warn('[saveOrgStyle] Échec direct Supabase (RLS ou contrainte), bascule sur Worker:', error.message);
        }
    } catch (e: any) {
        console.warn('[saveOrgStyle] Exception direct Supabase, bascule sur Worker:', e?.message);
    }

    // 3. Tentative 2 : Endpoint Cloudflare Worker (Bypass RLS garanti avec Service Role)
    try {
        const res = await fetch(`${WORKER_URL}/api/org/update-style`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                org_id: orgId,
                ...sanitizedUpdates,
            }),
        });

        const json = await res.json();
        if (json.success || json.ok) {
            return { success: true, org: json.org };
        } else {
            console.error('[saveOrgStyle] Erreur retournée par Worker:', json.error);
            return { success: false, error: json.error || 'Erreur mise à jour serveur' };
        }
    } catch (workerErr: any) {
        console.error('[saveOrgStyle] Exception appel Worker:', workerErr);
        return { success: false, error: workerErr?.message || 'Erreur réseau de synchronisation' };
    }
}
