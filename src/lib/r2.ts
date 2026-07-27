/**
 * ══════════════════════════════════════════════════════════
 * Cloudflare R2 Asset Storage Helper
 * ══════════════════════════════════════════════════════════
 * Replaces Supabase Storage (500MB limit) with Cloudflare R2 (10GB free limit)
 */

function getWorkerUrl(): string {
    return process.env.NEXT_PUBLIC_NOTIFICATION_WORKER_URL
        || process.env.NEXT_PUBLIC_WORKER_URL
        || 'https://campusflow-worker.kleintaptue1.workers.dev';
}

function getAdminKey(): string {
    return process.env.ADMIN_KEY || 'cf-admin-k3y-campusflow-2026-s3cur3';
}

export interface R2UploadResult {
    url: string;
    key: string;
}

/**
 * Upload any File or Blob to Cloudflare R2 bucket (`campusflow-actifs`)
 * @param file - File or Blob object to upload
 * @param folder - Destination folder (e.g., 'stories', 'chat-files', 'profiles', 'actus')
 * @param fileName - Optional explicit file name
 */
export async function uploadToR2(
    file: File | Blob,
    folder: string = 'uploads',
    fileName?: string
): Promise<R2UploadResult> {
    const workerUrl = getWorkerUrl();
    const adminKey = getAdminKey();

    const formData = new FormData();
    
    // Ensure File object has a name
    let fileToUpload: File;
    if (file instanceof File) {
        fileToUpload = fileName ? new File([file], fileName, { type: file.type }) : file;
    } else {
        const ext = file.type.split('/')[1] || 'bin';
        const name = fileName || `file_${Date.now()}.${ext}`;
        fileToUpload = new File([file], name, { type: file.type || 'application/octet-stream' });
    }

    formData.append('file', fileToUpload);
    formData.append('folder', folder);

    const headers: Record<string, string> = {
        'Authorization': `Bearer ${adminKey}`,
    };

    // Include logged-in user session ID if available
    try {
        if (typeof window !== 'undefined') {
            const rawSession = localStorage.getItem('campusflow_session');
            if (rawSession) {
                const session = JSON.parse(rawSession);
                if (session?.id) {
                    headers['X-User-Id'] = session.id;
                }
            }
        }
    } catch {}

    const response = await fetch(`${workerUrl}/api/r2/upload`, {
        method: 'POST',
        headers,
        body: formData,
    });

    if (!response.ok) {
        let errText = 'Erreur de téléchargement R2';
        try {
            const errJson = await response.json();
            errText = errJson.error || errText;
        } catch {
            errText = await response.text();
        }
        throw new Error(`R2 Upload Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return {
        url: data.url,
        key: data.key,
    };
}
