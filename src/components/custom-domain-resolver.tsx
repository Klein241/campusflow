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

        const hostname = window.location.hostname.toLowerCase();

        // Not a custom domain — skip
        if (!isCustomDomain(hostname)) return;

        const cleanHost = hostname.replace(/^www\./, '');
        const withWww = 'www.' + cleanHost;

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
                // Match either gotam.fun, www.gotam.fun, or the exact hostname
                const { data: orgs, error } = await supabase
                    .from('organizations')
                    .select('slug, name, custom_domain')
                    .or(`custom_domain.eq.${cleanHost},custom_domain.eq.${withWww},custom_domain.eq.${hostname}`)
                    .limit(1);

                const org = orgs?.[0];

                if (error || !org?.slug) {
                    console.warn(
                        `[CampusFlow] Custom domain "${hostname}" (clean: "${cleanHost}") not found in organizations.`,
                        error?.message ?? ''
                    );
                    window.dispatchEvent(
                        new CustomEvent<DomainResolvedDetail>(DOMAIN_RESOLVED_EVENT, {
                            detail: { slug: '', hostname, found: false },
                        })
                    );
                    return;
                }

                // Cache for both variants
                setCachedDomainSlug(hostname, org.slug);
                setCachedDomainSlug(cleanHost, org.slug);

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
