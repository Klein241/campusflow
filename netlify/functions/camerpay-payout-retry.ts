import type { Config, Context } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { retryFailedPayouts } from '../../src/lib/payment-service';

export default async (req: Request, _context: Context) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const authHeader = req.headers.get('Authorization') || '';
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: { headers: { Authorization: authHeader } },
                auth: { persistSession: false },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Non authentifié' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        );

        const { data: isPlatformAdmin } = await adminSupabase
            .from('platform_admins')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (!isPlatformAdmin) {
            return new Response(JSON.stringify({ error: 'Accès réservé au SuperAdmin' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const result = await retryFailedPayouts();

        return new Response(JSON.stringify({
            success: true,
            message: `${result.retried} virement(s) relancé(s) avec succès (${result.errors} ignorés/sans config).`,
            data: result,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err: unknown) {
        console.error('[netlify/camerpay-payout-retry]', err);
        const message = err instanceof Error ? err.message : 'Erreur interne';
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const config: Config = {
    path: '/api/camerpay/payout/retry',
};
