/**
 * Cloudflare R2 Storage Handlers
 */
import { Env } from '../types';
import { json, jsonResponse, errorResponse, CORS_HEADERS } from '../lib/cors';

// ══════════════════════════════════════════════════════════
// R2 FILE STORAGE HANDLERS (Enhanced)
// ══════════════════════════════════════════════════════════

const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    'application/pdf',
    'video/mp4', 'video/webm',
    'audio/mpeg', 'audio/ogg', 'audio/wav',
    'audio/webm',   // ← Notes vocales enregistrées avec MediaRecorder (Chrome/Firefox)
    'audio/mp4',    // ← Notes vocales Safari / iOS
    'audio/aac',    // ← Format AAC alternatif
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream', // fallback for unknown types
];

const MAX_R2_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

function checkAdminAuth(request: Request, env: Env): boolean {
    const auth = request.headers.get('Authorization') || '';
    const token = auth.replace('Bearer ', '').trim();
    // Seule vérification valide : token secret comparé à env.ADMIN_KEY
    // Le header X-User-Id retiré : non vérifiable, falsifiable par n'importe qui
    if (token && env.ADMIN_KEY && token === env.ADMIN_KEY) return true;
    return false;
}

async function handleR2Upload(request: Request, env: Env): Promise<Response> {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'uploads';

    if (!file) {
        return json({ error: 'No file provided' }, 400);
    }

    // Validate file size
    if (file.size > MAX_R2_FILE_SIZE) {
        return json({ error: 'Fichier trop grand (max 50 MB)' }, 413);
    }

    // Validate MIME type
    const mimeBase = (file.type || 'application/octet-stream').split(';')[0].trim();
    if (!ALLOWED_MIME_TYPES.includes(mimeBase)) {
        return json({ error: `Type non autorisé: ${mimeBase}` }, 415);
    }

    // Sanitize path to prevent traversal
    if (folder.includes('..') || folder.startsWith('/')) {
        return json({ error: 'Invalid folder path' }, 400);
    }

    // Generate unique key with structured path
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const key = `${folder}/${timestamp}_${safeName}`;

    // Upload to R2
    await env.LIBRARY_BUCKET.put(key, file.stream(), {
        httpMetadata: {
            contentType: mimeBase,
            cacheControl: 'public, max-age=31536000', // 1 year CDN cache
        },
        customMetadata: {
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
            size: String(file.size),
        },
    });

    // Build public URL
    const workerUrl = new URL(request.url);
    const url = `${workerUrl.protocol}//${workerUrl.host}/r2/${key}`;

    return json({ url, key });
}

async function handleR2Delete(request: Request, env: Env): Promise<Response> {
    if (!checkAdminAuth(request, env)) {
        return json({ error: 'Unauthorized' }, 401);
    }

    const { key } = await request.json() as { key: string };
    if (!key || key.includes('..')) {
        return json({ error: 'Invalid key' }, 400);
    }

    await env.LIBRARY_BUCKET.delete(key);
    return json({ ok: true, deleted: key });
}

async function handleR2Serve(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const key = url.pathname.replace('/r2/', '');

    if (!key || key.includes('..')) {
        return json({ error: 'Invalid path' }, 400);
    }

    const object = await env.LIBRARY_BUCKET.get(key);
    if (!object) {
        return json({ error: 'Not found' }, 404);
    }

    const headers = new Headers({
        ...CORS_HEADERS,
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'ETag': object.httpEtag,
    });

    return new Response(object.body, { headers });
}

async function handleR2List(request: Request, env: Env): Promise<Response> {
    if (!checkAdminAuth(request, env)) {
        return json({ error: 'Unauthorized' }, 401);
    }

    const url = new URL(request.url);
    const prefix = url.searchParams.get('prefix') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    const listed = await env.LIBRARY_BUCKET.list({ prefix, limit });

    const files = listed.objects.map(obj => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded?.toISOString(),
        contentType: obj.httpMetadata?.contentType,
    }));

    return json({ files, truncated: listed.truncated });
}


export {
    checkAdminAuth,
    handleR2Upload,
    handleR2Delete,
    handleR2Serve,
    handleR2List,
};
