'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
    isCustomDomain,
    getCachedDomainSlug,
    DOMAIN_RESOLVED_EVENT,
    type DomainResolvedDetail,
} from '@/lib/custom-domain';

/**
 * useOrgSlug — Returns the real orgSlug for the current page.
 *
 * Two modes:
 *
 * 1. PLATFORM DOMAIN (campusflow.netlify.app):
 *    URL structure: /the-great-academy/campus/
 *    → Extract first path segment from window.location.pathname
 *
 * 2. CUSTOM DOMAIN (ecole.example.com):
 *    URL structure: /campus/  (no orgSlug in path)
 *    → Resolved asynchronously via CustomDomainResolver (Supabase lookup)
 *    → Cached in localStorage for 24h
 *    → Delivered via `campusflow:domain-resolved` custom event
 *
 * Falls back to `_` (the static placeholder slug) during initial hydration.
 */
export function useOrgSlug(): string {
    const params = useParams<{ orgSlug: string }>();

    // For custom domains: holds the resolved slug once available
    const [resolvedSlug, setResolvedSlug] = useState<string | null>(() => {
        // Synchronous init: try localStorage cache immediately
        if (typeof window !== 'undefined' && isCustomDomain()) {
            return getCachedDomainSlug();
        }
        return null;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!isCustomDomain()) return;

        // Already have it from cache
        if (resolvedSlug) return;

        // Listen for async resolution from CustomDomainResolver
        const handler = (e: Event) => {
            const { slug, found } = (e as CustomEvent<DomainResolvedDetail>).detail;
            if (found && slug) {
                setResolvedSlug(slug);
            }
        };

        window.addEventListener(DOMAIN_RESOLVED_EVENT, handler);

        // Also check cache again (may have been populated between renders)
        const cached = getCachedDomainSlug();
        if (cached) setResolvedSlug(cached);

        return () => window.removeEventListener(DOMAIN_RESOLVED_EVENT, handler);
    }, [resolvedSlug]);

    const slug = useMemo(() => {
        if (typeof window === 'undefined') {
            return params.orgSlug || '_';
        }

        // ─── Custom domain ───────────────────────────────────────────────
        if (isCustomDomain()) {
            // Return resolved slug or '_' placeholder while resolving
            return resolvedSlug || '_';
        }

        // ─── Platform domain ─────────────────────────────────────────────
        // URL: /the-great-academy/campus/ → orgSlug = "the-great-academy"
        const segments = window.location.pathname.split('/').filter(Boolean);
        const urlSlug = segments[0] || '_';

        // If URL shows '_' (the placeholder), fall back to useParams
        return urlSlug === '_' ? (params.orgSlug || '_') : urlSlug;
    }, [params.orgSlug, resolvedSlug]);

    return slug;
}
