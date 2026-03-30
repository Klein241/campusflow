'use client';

import { useState, useCallback } from 'react';
import type { R2Context, R2Purpose } from '@/lib/r2';

/**
 * ═══════════════════════════════════════════════════════════
 * useR2Upload — React hook for uploading files to R2
 * ═══════════════════════════════════════════════════════════
 *
 * Uploads go through the Next.js API route (/api/r2/upload)
 * which proxies to the Cloudflare Worker. The secret never
 * reaches the browser.
 *
 * Usage:
 *   const { upload, uploading, error } = useR2Upload({
 *       context: 'library',
 *       id: orgId,
 *       purpose: 'file',
 *       onSuccess: (result) => console.log(result.url),
 *   });
 *
 *   <input type="file" onChange={(e) => upload(e.target.files[0])} />
 */

interface UploadResult {
    url: string;
    key: string;
}

interface UseR2UploadOptions {
    context: R2Context;
    id: string;
    purpose: R2Purpose;
    maxSizeMB?: number;
    acceptedTypes?: string[];
    onSuccess?: (result: UploadResult) => void;
    onError?: (error: string) => void;
}

export function useR2Upload({
    context,
    id,
    purpose,
    maxSizeMB = 10,
    acceptedTypes,
    onSuccess,
    onError,
}: UseR2UploadOptions) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const upload = useCallback(async (file: File): Promise<UploadResult | null> => {
        setError(null);
        setProgress(0);

        // Validate file type
        if (acceptedTypes?.length && !acceptedTypes.includes(file.type)) {
            const msg = `Type non accepté. Formats autorisés : ${acceptedTypes.map(t => t.split('/')[1]).join(', ')}`;
            setError(msg);
            onError?.(msg);
            return null;
        }

        // Validate file size
        if (file.size > maxSizeMB * 1024 * 1024) {
            const msg = `Fichier trop grand (max ${maxSizeMB} MB)`;
            setError(msg);
            onError?.(msg);
            return null;
        }

        setUploading(true);
        setProgress(10);

        try {
            // Build structured path
            const { buildR2Path } = await import('@/lib/r2');
            const r2Path = buildR2Path(context, id, purpose, file.name);
            const folder = r2Path.substring(0, r2Path.lastIndexOf('/'));

            // Upload directly to Worker (no Next.js API proxy)
            const workerUrl = process.env.NEXT_PUBLIC_NOTIFICATION_WORKER_URL
                || process.env.NEXT_PUBLIC_WORKER_URL
                || '';

            if (!workerUrl) {
                throw new Error('Worker URL non configuré');
            }

            const form = new FormData();
            form.append('file', file);
            form.append('folder', folder || context);

            setProgress(30);

            const res = await fetch(`${workerUrl}/api/r2/upload`, {
                method: 'POST',
                body: form,
            });

            setProgress(80);

            if (!res.ok) {
                const e = await res.json() as { error: string };
                throw new Error(e.error || 'Upload échoué');
            }

            const result = await res.json() as UploadResult;
            setProgress(100);
            onSuccess?.(result);
            return result;
        } catch (e: any) {
            const msg = e.message || 'Upload échoué';
            setError(msg);
            onError?.(msg);
            return null;
        } finally {
            setUploading(false);
        }
    }, [context, id, purpose, maxSizeMB, acceptedTypes, onSuccess, onError]);

    // Upload multiple files sequentially
    const uploadMultiple = useCallback(async (files: File[]): Promise<UploadResult[]> => {
        const results: UploadResult[] = [];
        for (const file of files) {
            const result = await upload(file);
            if (result) results.push(result);
        }
        return results;
    }, [upload]);

    return { upload, uploadMultiple, uploading, progress, error };
}
