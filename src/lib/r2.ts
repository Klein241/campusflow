/**
 * ══════════════════════════════════════════════════════════
 * Cloudflare R2 Asset Storage Helper (avec Repli Supabase Infaillible)
 * ══════════════════════════════════════════════════════════
 * Stockage haute vitesse sur Cloudflare R2 avec repli automatique sur
 * Supabase Storage ('organization-assets' / 'campus_assets') en cas d'indisponibilité.
 */

import { SessionManager } from '@/lib/session';
import { supabase } from '@/lib/supabase';

function getWorkerUrl(): string {
    return process.env.NEXT_PUBLIC_NOTIFICATION_WORKER_URL
        || process.env.NEXT_PUBLIC_WORKER_URL
        || 'https://campusflow-worker.kleintaptue1.workers.dev';
}

export interface R2UploadResult {
    url: string;
    key: string;
}

/**
 * Upload any File or Blob to Cloudflare R2 bucket with automated Supabase fallback.
 * @param file - File or Blob object to upload
 * @param folder - Destination folder (e.g., 'stories', 'chat-files', 'profiles', 'actus', 'posters')
 * @param fileName - Optional explicit file name
 */
export async function uploadToR2(
    file: File | Blob,
    folder: string = 'uploads',
    fileName?: string
): Promise<R2UploadResult> {
    const workerUrl = getWorkerUrl();

    // Normaliser l'objet File
    let fileToUpload: File;
    if (file instanceof File) {
        fileToUpload = fileName ? new File([file], fileName, { type: file.type }) : file;
    } else {
        const ext = file.type.split('/')[1] || 'bin';
        const name = fileName || `file_${Date.now()}.${ext}`;
        fileToUpload = new File([file], name, { type: file.type || 'application/octet-stream' });
    }

    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('folder', folder);

    // En-têtes strictement compatibles CORS (whitelistés côté worker)
    const headers: Record<string, string> = {};
    try {
        const session = SessionManager.get();
        if (session?.session_token) {
            headers['Authorization'] = `Bearer ${session.session_token}`;
        }
        if (session?.profile_id) {
            headers['X-User-Id'] = session.profile_id;
        }
    } catch { /* silencieux */ }

    // ── 1. Tentative prioritaire sur Cloudflare R2 Worker ──
    try {
        const response = await fetch(`${workerUrl}/api/r2/upload`, {
            method: 'POST',
            headers,
            body: formData,
            signal: AbortSignal.timeout(15000), // 15 secondes max
        });

        if (response.ok) {
            const data = await response.json();
            if (data?.url) {
                return {
                    url: data.url,
                    key: data.key || `${folder}/${fileToUpload.name}`,
                };
            }
        } else {
            console.warn(`[uploadToR2] R2 a retourné le code ${response.status}, déclenchement du repli Supabase`);
        }
    } catch (r2Err) {
        console.warn('[uploadToR2] Tentative R2 indisponible, déclenchement du repli Supabase:', r2Err);
    }

    // ── 2. Repli automatique et silencieux sur Supabase Storage ──
    try {
        const cleanName = fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const supaPath = `${folder}/${Date.now()}_${cleanName}`;

        // Tentative sur le bucket 'organization-assets'
        let { data: supaData, error: supaErr } = await supabase.storage
            .from('organization-assets')
            .upload(supaPath, fileToUpload, {
                cacheControl: '3600',
                upsert: true
            });

        if (!supaErr) {
            const { data: pubData } = supabase.storage.from('organization-assets').getPublicUrl(supaPath);
            if (pubData?.publicUrl) {
                return { url: pubData.publicUrl, key: supaPath };
            }
        }

        // Tentative alternative sur 'campus_assets'
        const { error: campusErr } = await supabase.storage
            .from('campus_assets')
            .upload(supaPath, fileToUpload, {
                cacheControl: '3600',
                upsert: true
            });

        if (!campusErr) {
            const { data: pubCampus } = supabase.storage.from('campus_assets').getPublicUrl(supaPath);
            if (pubCampus?.publicUrl) {
                return { url: pubCampus.publicUrl, key: supaPath };
            }
        }
    } catch (supaCatch) {
        console.warn('[uploadToR2] Repli Supabase indisponible:', supaCatch);
    }

    // ── 3. Dernier repli : Data URL Base64 pour images < 3 Mo (évite de bloquer l'utilisateur) ──
    if (fileToUpload.size < 3 * 1024 * 1024 && fileToUpload.type.startsWith('image/')) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Url = reader.result as string;
                resolve({
                    url: base64Url,
                    key: `data/${Date.now()}_${fileToUpload.name}`,
                });
            };
            reader.readAsDataURL(fileToUpload);
        });
    }

    throw new Error("Impossible de téléverser l'image sur le stockage distant. Vérifiez votre connexion.");
}
