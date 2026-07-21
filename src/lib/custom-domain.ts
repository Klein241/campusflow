'use client';

// ═══════════════════════════════════════════════════════════════
// CUSTOM DOMAIN UTILITIES
// ═══════════════════════════════════════════════════════════════

/** Suffixes that identify the CampusFlow platform — NOT school custom domains */
const PLATFORM_SUFFIXES = [
    'netlify.app',    // catches campusflw.netlify.app, campusflow.netlify.app, any preview URL
    'netlify.live',   // Netlify preview links
    'campusflow.app', // production domain (if/when set)
    'localhost',
    '127.0.0.1',
];

/** Returns true if running on a school's custom domain (not the platform) */
export function isCustomDomain(hostname?: string): boolean {
    const h = hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
    if (!h) return false;
    // Not a custom domain if hostname IS or ENDS WITH any platform suffix
    return !PLATFORM_SUFFIXES.some(suffix =>
        h === suffix || h.endsWith('.' + suffix) || h.endsWith(suffix)
    );
}

const CACHE_KEY = 'campusflow_custom_domain_v2';

interface DomainCache {
    slug: string;
    hostname: string;
    expires: number; // timestamp ms
}

/** Returns cached orgSlug for the current hostname (null if not resolved or expired) */
export function getCachedDomainSlug(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const cache: DomainCache = JSON.parse(raw);
        if (cache.hostname !== window.location.hostname) return null;
        if (Date.now() > cache.expires) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return cache.slug;
    } catch {
        return null;
    }
}

/** Caches an orgSlug ↔ hostname mapping for 24 hours */
export function setCachedDomainSlug(hostname: string, slug: string): void {
    if (typeof window === 'undefined') return;
    try {
        const cache: DomainCache = {
            slug,
            hostname,
            expires: Date.now() + 1000 * 60 * 60 * 24, // 24h
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {}
}

/** Custom event name fired when domain → slug resolution completes */
export const DOMAIN_RESOLVED_EVENT = 'campusflow:domain-resolved';

export interface DomainResolvedDetail {
    slug: string;
    hostname: string;
    found: boolean;
}
