'use client';

/**
 * Compresses an image file client-side before upload.
 * Resizes to maxWidth/maxHeight and reduces JPEG quality.
 */
export async function compressImage(
    file: File,
    options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<File> {
    const { maxWidth = 1200, maxHeight = 1200, quality = 0.7 } = options;

    // Skip non-image files
    if (!file.type.startsWith('image/')) return file;

    // Skip SVGs and GIFs (can't compress meaningfully)
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;

    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            let { width, height } = img;

            // Calculate new dimensions maintaining aspect ratio
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            // Draw to canvas
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(file); return; }
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to blob
            canvas.toBlob(
                (blob) => {
                    if (!blob || blob.size >= file.size) {
                        // If compressed is larger, keep original
                        resolve(file);
                        return;
                    }
                    const compressed = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    console.log(`🗜️ Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB (${Math.round((1 - compressed.size / file.size) * 100)}% saved)`);
                    resolve(compressed);
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(file); // Fallback to original
        };

        img.src = url;
    });
}

/**
 * Compresses a file - images get resized, other files are passed through.
 */
export async function compressFile(file: File): Promise<File> {
    if (file.type.startsWith('image/')) {
        return compressImage(file);
    }
    // Non-image files: pass through (can't compress PDFs client-side meaningfully)
    return file;
}
