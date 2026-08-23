'use client';

import { useEffect } from 'react';

interface SchoolJsonLdProps {
    org: {
        id?: string;
        name: string;
        slug: string;
        type?: string;
        motto?: string;
        logo_url?: string;
        city?: string;
        country?: string;
        phone?: string;
        email?: string;
        hero_title?: string;
        hero_subtitle?: string;
        about_text?: string;
        custom_domain?: string | null;
    };
}

export function SchoolJsonLd({ org }: SchoolJsonLdProps) {
    useEffect(() => {
        if (!org || typeof window === 'undefined') return;

        const siteUrl = org.custom_domain
            ? `https://${org.custom_domain}`
            : `${window.location.origin}/${org.slug}`;

        const pageTitle = `${org.name} — Portail Officiel & Formations | IziTeach`;
        const pageDesc = org.hero_subtitle || org.motto || org.about_text?.slice(0, 160) || `Découvrez ${org.name}, les programmes de cours, les inscriptions et l'espace numérique éducatif.`;
        const pageImage = org.logo_url || `${window.location.origin}/og-image.png`;

        // Update document metadata for browser tab and SEO crawlers
        document.title = pageTitle;

        const updateMeta = (name: string, content: string, isProperty = false) => {
            const attr = isProperty ? 'property' : 'name';
            let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
            if (!el) {
                el = document.createElement('meta');
                el.setAttribute(attr, name);
                document.head.appendChild(el);
            }
            el.content = content;
        };

        // Standard Meta
        updateMeta('description', pageDesc);

        // OpenGraph (WhatsApp, Facebook, LinkedIn)
        updateMeta('og:title', pageTitle, true);
        updateMeta('og:description', pageDesc, true);
        updateMeta('og:image', pageImage, true);
        updateMeta('og:url', siteUrl, true);
        updateMeta('og:type', 'website', true);
        updateMeta('og:site_name', org.name, true);

        // Twitter Card
        updateMeta('twitter:card', 'summary_large_image');
        updateMeta('twitter:title', pageTitle);
        updateMeta('twitter:description', pageDesc);
        updateMeta('twitter:image', pageImage);

    }, [org]);

    if (!org) return null;

    const orgUrl = typeof window !== 'undefined'
        ? (org.custom_domain ? `https://${org.custom_domain}` : `${window.location.origin}/${org.slug}`)
        : `https://iziteach.com/${org.slug}`;

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'EducationalOrganization',
        name: org.name,
        description: org.about_text || org.hero_subtitle || org.motto || `Portail éducatif officiel de ${org.name}`,
        url: orgUrl,
        logo: org.logo_url || undefined,
        image: org.logo_url || undefined,
        telephone: org.phone || undefined,
        email: org.email || undefined,
        address: {
            '@type': 'PostalAddress',
            addressLocality: org.city || 'Libreville',
            addressCountry: org.country || 'Gabon',
        },
        offers: {
            '@type': 'Offer',
            category: org.type || 'Formation',
            availability: 'https://schema.org/InStock',
        },
        potentialAction: {
            '@type': 'RegisterAction',
            target: `${orgUrl}/login?mode=register`,
            name: 'Inscription en ligne',
        },
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}
