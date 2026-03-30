/**
 * ═══════════════════════════════════════════════════════════
 * R2 Storage Utility — CampusFlow
 * ═══════════════════════════════════════════════════════════
 *
 * Cloudflare R2 integration:
 * - buildR2Path: structured file paths by context
 * - uploadToR2Server: server-side upload via Worker
 * - r2Url: convert path to public CDN URL
 * - r2PathFromUrl: extract path from full URL
 *
 * Architecture:
 *   Client → /api/r2/upload (Next.js API route)
 *          → Worker /api/r2/upload (Cloudflare)
 *          → R2 bucket (campusflow-assets)
 *
 * CDN URLs served directly from Worker:
 *   https://WORKER_URL/r2/{path}
 */

const WORKER_URL = process.env.NEXT_PUBLIC_NOTIFICATION_WORKER_URL
    || process.env.NEXT_PUBLIC_WORKER_URL
    || '';

// ── Generate a structured R2 path ─────────────────────────

export type R2Context = 'org' | 'student' | 'teacher' | 'library' | 'forum' | 'marketplace';
export type R2Purpose = 'logo' | 'favicon' | 'hero' | 'about' | 'gallery' | 'photo' | 'file' | 'post' | 'product' | 'cover';

export function buildR2Path(
    context: R2Context,
    id: string,
    purpose: R2Purpose,
    fileName: string
): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || 'bin';
    const ts = Date.now();
    const clean = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50);

    const map: Record<string, string> = {
        'org-logo':            `orgs/${id}/logo_${ts}.${ext}`,
        'org-favicon':         `orgs/${id}/favicon_${ts}.${ext}`,
        'org-hero':            `orgs/${id}/landing/hero_${ts}.${ext}`,
        'org-about':           `orgs/${id}/landing/about_${ts}.${ext}`,
        'org-gallery':         `orgs/${id}/landing/gallery_${ts}.${ext}`,
        'student-photo':       `students/${id}/photo_${ts}.${ext}`,
        'teacher-photo':       `teachers/${id}/photo_${ts}.${ext}`,
        'library-file':        `library/${id}/${clean}`,
        'library-cover':       `library/${id}/cover_${ts}.${ext}`,
        'forum-post':          `forum/${id}/photo_${ts}.${ext}`,
        'marketplace-product': `marketplace/${id}/product_${ts}.${ext}`,
    };

    return map[`${context}-${purpose}`] || `misc/${id}/${clean}`;
}

// ── Upload via the Worker (server-side — called from API Route) ──

export async function uploadToR2Server(
    file: File | Blob,
    folder: string,
    adminKey: string,
    contentType?: string
): Promise<{ url: string; key: string }> {
    if (!WORKER_URL) throw new Error('R2 Worker URL non configuré');

    const mime = contentType || (file instanceof File ? file.type : 'application/octet-stream');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const res = await fetch(`${WORKER_URL}/api/r2/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${adminKey}`,
        },
        body: formData,
    });

    if (!res.ok) {
        const e = await res.json() as { error: string };
        throw new Error(e.error || 'Upload R2 échoué');
    }

    return res.json();
}

// ── Public URL from a R2 key/path ──────────────────────────

export function r2Url(keyOrPath: string | null | undefined): string {
    if (!keyOrPath) return '';
    // If it's already a full URL, return as-is
    if (keyOrPath.startsWith('http')) return keyOrPath;
    // Build URL via worker
    return `${WORKER_URL}/r2/${keyOrPath}`;
}

// ── Extract the R2 key from a full URL ─────────────────────

export function r2KeyFromUrl(url: string): string {
    if (!url || !WORKER_URL) return '';
    // Worker-served: https://worker.dev/r2/library/123/file.pdf
    const r2Prefix = `${WORKER_URL}/r2/`;
    if (url.startsWith(r2Prefix)) {
        return url.replace(r2Prefix, '');
    }
    return url;
}

// ── Delete a file from R2 ──────────────────────────────────

export async function deleteFromR2(key: string, adminKey: string): Promise<boolean> {
    if (!WORKER_URL) return false;

    try {
        const res = await fetch(`${WORKER_URL}/api/r2/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminKey}`,
            },
            body: JSON.stringify({ key }),
        });

        return res.ok;
    } catch {
        return false;
    }
}

// ── Allowed MIME types (matches Worker validation) ─────────

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
export const ALLOWED_DOC_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
export const ALLOWED_MEDIA_TYPES = ['video/mp4', 'video/webm', 'audio/mpeg', 'audio/ogg', 'audio/wav'];
export const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES, ...ALLOWED_MEDIA_TYPES];

export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
