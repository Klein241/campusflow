import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://iziteach.com';
    const now = new Date();

    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${baseUrl}/login`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/onboarding`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
    ];

    try {
        const { data: orgs } = await supabase
            .from('organizations')
            .select('slug, updated_at, is_active')
            .eq('is_active', true);

        if (!orgs || orgs.length === 0) {
            return staticRoutes;
        }

        const orgRoutes: MetadataRoute.Sitemap = orgs.map(org => ({
            url: `${baseUrl}/${org.slug}`,
            lastModified: org.updated_at ? new Date(org.updated_at) : now,
            changeFrequency: 'weekly',
            priority: 0.9,
        }));

        const loginRoutes: MetadataRoute.Sitemap = orgs.map(org => ({
            url: `${baseUrl}/${org.slug}/login`,
            lastModified: org.updated_at ? new Date(org.updated_at) : now,
            changeFrequency: 'monthly',
            priority: 0.7,
        }));

        return [...staticRoutes, ...orgRoutes, ...loginRoutes];
    } catch {
        return staticRoutes;
    }
}
