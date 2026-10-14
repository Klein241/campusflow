import { TemplateCustomConfig } from '../types';

export interface CloudflareSavePayload {
    org_id: string;
    org_slug?: string;
    org_name?: string;
    brand_color?: string;
    landing_layout?: string;
    hero_template?: string;
    template_config?: TemplateCustomConfig;
    gallery_images?: string[];
    programs?: any[];
}

/**
 * Sauvegarde la configuration et les programmes dans Cloudflare D1 via le Worker
 */
export async function saveLandingToCloudflare(
    workerUrl: string,
    payload: CloudflareSavePayload
): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
        const res = await fetch(`${workerUrl.replace(/\/$/, '')}/api/landing/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Erreur serveur (${res.status})`);
        }

        const data = await res.json();
        return { success: true, message: data.message };
    } catch (err: any) {
        console.error('Erreur sauvegarde Cloudflare D1:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Récupère la configuration et les programmes depuis Cloudflare D1
 */
export async function fetchLandingFromCloudflare(
    workerUrl: string,
    orgId: string,
    orgSlug?: string
): Promise<{ success: boolean; config?: any; programs?: any[]; error?: string }> {
    try {
        const params = new URLSearchParams();
        if (orgId) params.set('org_id', orgId);
        if (orgSlug) params.set('org_slug', orgSlug);

        const res = await fetch(`${workerUrl.replace(/\/$/, '')}/api/landing/config?${params.toString()}`);
        if (!res.ok) {
            throw new Error(`Erreur récupération (${res.status})`);
        }

        const data = await res.json();
        return {
            success: true,
            config: data.config,
            programs: data.programs || [],
        };
    } catch (err: any) {
        console.error('Erreur fetch Cloudflare D1:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Téléverse un fichier (photo de profil, bannière, affiche, galerie) vers Cloudflare R2
 */
export async function uploadToCloudflareR2(
    workerUrl: string,
    file: File | Blob,
    folder: string = 'templates',
    orgId: string = 'default'
): Promise<{ url: string; key: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    formData.append('org_id', orgId);

    const res = await fetch(`${workerUrl.replace(/\/$/, '')}/api/landing/upload`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Échec téléversement R2 (${res.status})`);
    }

    const data = await res.json();
    return {
        url: data.url,
        key: data.key,
    };
}
