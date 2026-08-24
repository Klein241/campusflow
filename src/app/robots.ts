import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://iziteach.com';

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/superadmin/',
                    '/*/admin/',
                    '/*/student/',
                    '/*/teacher/',
                    '/api/',
                ],
            },
            {
                userAgent: 'Googlebot',
                allow: '/',
                disallow: ['/superadmin/', '/*/admin/'],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
