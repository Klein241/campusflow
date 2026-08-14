'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isCustomDomain } from '@/lib/custom-domain';

interface OrgBranding {
    isWhiteLabel: boolean;
    customDomain: string | null;
    brandColor: string;
    logoUrl: string | null;
    faviconUrl: string | null;
    metaTitle: string | null;
    metaDescription: string | null;
    orgName: string;
    orgSlug: string;
}

/**
 * Hook to detect white-label mode and provide branding info.
 * When accessed via a custom domain (e.g. institutformation.com),
 * isWhiteLabel=true and all URLs/links should use the custom domain.
 */
export function useWhiteLabel(orgSlug: string) {
    const [branding, setBranding] = useState<OrgBranding>({
        isWhiteLabel: false,
        customDomain: null,
        brandColor: '#4f46e5',
        logoUrl: null,
        faviconUrl: null,
        metaTitle: null,
        metaDescription: null,
        orgName: '',
        orgSlug: orgSlug,
    });

    useEffect(() => {
        const hostname = window.location.hostname;
        const isCustom = isCustomDomain(hostname);

        (async () => {
            const { data: org } = await supabase
                .from('organizations')
                .select('name, slug, custom_domain, domain_verified, brand_color, logo_url, favicon_url, meta_title, meta_description')
                .eq('slug', orgSlug)
                .single();

            if (org) {
                const whiteLabel = isCustom && !!org.custom_domain && org.domain_verified;
                setBranding({
                    isWhiteLabel: whiteLabel,
                    customDomain: org.custom_domain,
                    brandColor: org.brand_color || '#4f46e5',
                    logoUrl: org.logo_url,
                    faviconUrl: org.favicon_url,
                    metaTitle: org.meta_title,
                    metaDescription: org.meta_description,
                    orgName: org.name,
                    orgSlug: org.slug,
                });

                // Apply branding dynamically
                if (whiteLabel || org.brand_color) {
                    document.documentElement.style.setProperty('--brand-color', org.brand_color || '#4f46e5');
                }
                if (whiteLabel && org.favicon_url) {
                    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement || document.createElement('link');
                    link.rel = 'icon';
                    link.href = org.favicon_url;
                    document.head.appendChild(link);
                }
                if (whiteLabel) {
                    document.title = org.meta_title || org.name;
                }
            }
        })();
    }, [orgSlug]);

    /**
     * Generate a URL that uses the custom domain when in white-label mode.
     * Instead of campusflow.app/mon-ecole/library → institutformation.com/library
     */
    const buildUrl = (path: string = '') => {
        if (branding.isWhiteLabel && branding.customDomain) {
            // Remove orgSlug prefix from path since custom domain already resolves to org
            const cleanPath = path.startsWith(`/${orgSlug}`) ? path.replace(`/${orgSlug}`, '') : path;
            return `https://${branding.customDomain}${cleanPath}`;
        }
        return path.startsWith('/') ? path : `/${orgSlug}${path ? '/' + path : ''}`;
    };

    /**
     * Get the internal route path (for Next.js router.push).
     * In white-label mode: /library, /admin, /prof/dashboard
     * In platform mode: /mon-ecole/library, /mon-ecole/admin
     */
    const routePath = (subPath: string) => {
        if (branding.isWhiteLabel) {
            return subPath.startsWith('/') ? subPath : `/${subPath}`;
        }
        return `/${orgSlug}${subPath.startsWith('/') ? subPath : '/' + subPath}`;
    };

    /**
     * Generate a shareable URL for content (books, products, etc.)
     * Uses custom domain when available so shared links show the school's brand.
     */
    const shareUrl = (subPath: string = '') => {
        if (branding.customDomain && branding.isWhiteLabel) {
            return `https://${branding.customDomain}${subPath.startsWith('/') ? subPath : '/' + subPath}`;
        }
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        return `${origin}/${orgSlug}${subPath.startsWith('/') ? subPath : '/' + subPath}`;
    };

    /** Whether to show "Powered by CampusFlow" footer */
    const showPlatformBranding = !branding.isWhiteLabel;

    return {
        ...branding,
        buildUrl,
        routePath,
        shareUrl,
        showPlatformBranding,
    };
}
