'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    isCustomDomain,
    getCachedDomainSlug,
    setCachedDomainSlug,
    DOMAIN_RESOLVED_EVENT,
    type DomainResolvedDetail,
} from '@/lib/custom-domain';

// ═══════════════════════════════════════════════════════════════════════
// CUSTOM DOMAIN RESOLVER
// ═══════════════════════════════════════════════════════════════════════
// Invisible component — renders nothing.
// On mount, detects if we're on a custom domain, then:
//   1. Checks localStorage cache (expires 24h)
//   2. If not cached: queries Supabase organizations table
//   3. Caches the result and fires `campusflow:domain-resolved` event
//   4. `useOrgSlug` listens for this event and updates the slug
// ═══════════════════════════════════════════════════════════════════════

export function CustomDomainResolver() {
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const hostname = window.location.hostname;

        // Not a custom domain — skip
        if (!isCustomDomain(hostname)) return;

        // Already cached — fire event immediately so useOrgSlug picks it up
        const cached = getCachedDomainSlug();
        if (cached) {
            window.dispatchEvent(
                new CustomEvent<DomainResolvedDetail>(DOMAIN_RESOLVED_EVENT, {
                    detail: { slug: cached, hostname, found: true },
                })
            );
            return;
        }

        // Resolve hostname → orgSlug via Supabase
        (async () => {
            try {
                const { data: org, error } = await supabase
                    .from('organizations')
                    .select('slug, name')
                    .eq('custom_domain', hostname)
                    .eq('domain_verified', true)
                    .single();

                if (error || !org?.slug) {
                    console.warn(
                        `[CampusFlow] Custom domain "${hostname}" not found or not verified.`,
                        error?.message ?? ''
                    );
                    window.dispatchEvent(
                        new CustomEvent<DomainResolvedDetail>(DOMAIN_RESOLVED_EVENT, {
                            detail: { slug: '', hostname, found: false },
                        })
                    );
                    return;
                }

                // Cache and notify
                setCachedDomainSlug(hostname, org.slug);
                window.dispatchEvent(
                    new CustomEvent<DomainResolvedDetail>(DOMAIN_RESOLVED_EVENT, {
                        detail: { slug: org.slug, hostname, found: true },
                    })
                );
            } catch (err) {
                console.error('[CampusFlow] Domain resolution error:', err);
            }
        })();
    }, []);

    return null; // renders nothing
}
