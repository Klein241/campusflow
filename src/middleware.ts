import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Middleware to handle custom domain resolution + org slug validation
export async function middleware(request: NextRequest) {
    const hostname = request.headers.get('host') || '';
    const pathname = request.nextUrl.pathname;

    // Skip static files, API routes, and Next.js internals
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.includes('.') ||
        pathname === '/favicon.ico'
    ) {
        return NextResponse.next();
    }

    // Known platform paths — never rewrite these
    const platformPaths = ['/onboarding', '/login'];
    if (platformPaths.some(p => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Landing page — only on platform domain
    if (pathname === '/') {
        // Check if this is a custom domain (not the platform domain)
        const platformDomains = [
            'localhost',
            '127.0.0.1',
            'campusflow.netlify.app',
            'campusfl.netlify.app',
            'campusflow.app',
        ];
        const isCustomDomain = !platformDomains.some(d => hostname.includes(d));

        if (isCustomDomain) {
            // Custom domain → resolve to org
            try {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                if (!supabaseUrl || !supabaseKey) return NextResponse.next();

                const supabase = createClient(supabaseUrl, supabaseKey);
                const cleanHost = hostname.replace(/:\d+$/, ''); // Remove port
                const { data: org } = await supabase
                    .from('organizations')
                    .select('slug')
                    .eq('custom_domain', cleanHost)
                    .eq('domain_verified', true)
                    .single();

                if (org?.slug) {
                    // Rewrite / to /[orgSlug] — user sees their domain, server renders the org page
                    const url = request.nextUrl.clone();
                    url.pathname = `/${org.slug}`;
                    return NextResponse.rewrite(url);
                }
            } catch {
                // Domain not found — show landing page
            }
        }
        return NextResponse.next();
    }

    // Custom domain + subpaths — rewrite /admin → /[orgSlug]/admin etc.
    const platformDomains = [
        'localhost',
        '127.0.0.1',
        'campusflow.netlify.app',
        'campusfl.netlify.app',
        'campusflow.app',
    ];
    const isCustomDomain = !platformDomains.some(d => hostname.includes(d));

    if (isCustomDomain) {
        // Check if the first segment is already an orgSlug (avoid double rewrite)
        const segments = pathname.split('/').filter(Boolean);
        const firstSegment = segments[0] || '';

        // Known sub-paths that should be rewritten under the org
        const orgSubPaths = ['admin', 'prof', 'student', 'login', 'library', 'shop', 'messages'];

        if (orgSubPaths.includes(firstSegment) || firstSegment === '') {
            try {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                if (!supabaseUrl || !supabaseKey) return NextResponse.next();

                const supabase = createClient(supabaseUrl, supabaseKey);
                const cleanHost = hostname.replace(/:\d+$/, '');
                const { data: org } = await supabase
                    .from('organizations')
                    .select('slug')
                    .eq('custom_domain', cleanHost)
                    .eq('domain_verified', true)
                    .single();

                if (org?.slug) {
                    const url = request.nextUrl.clone();
                    url.pathname = `/${org.slug}${pathname}`;
                    return NextResponse.rewrite(url);
                }
            } catch {
                // Fallback
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (public folder)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
    ],
};
