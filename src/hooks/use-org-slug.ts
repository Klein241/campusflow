'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';

/**
 * Returns the real orgSlug from the URL pathname.
 *
 * Problem: In static export mode, `generateStaticParams` returns `[{ orgSlug: '_' }]`.
 * Next.js bakes `_` into the generated HTML. When Netlify rewrites
 * `/the-greatsoft-academy/admin` → `/_/admin/index.html`, `useParams()` still
 * returns `{ orgSlug: '_' }` instead of the real slug from the URL.
 *
 * Solution: Parse `window.location.pathname` to extract the first path segment,
 * which is always the real orgSlug.
 */
export function useOrgSlug(): string {
    const params = useParams<{ orgSlug: string }>();

    const slug = useMemo(() => {
        // On the server (SSR/SSG) or during initial hydration, window may not exist
        if (typeof window === 'undefined') {
            return params.orgSlug || '_';
        }

        // Extract the first non-empty path segment from the actual URL
        // e.g. "/the-greatsoft-academy/admin/" → "the-greatsoft-academy"
        const segments = window.location.pathname.split('/').filter(Boolean);
        const urlSlug = segments[0] || '_';

        // If the URL slug is '_', fall back to useParams (dev mode / direct access)
        // Otherwise, always prefer the real URL slug
        return urlSlug === '_' ? (params.orgSlug || '_') : urlSlug;
    }, [params.orgSlug]);

    return slug;
}
