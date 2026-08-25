/**
 * POST /api/camerpay/payout/retry
 * Relancer les virements Mass Payout en échec ou en attente vers les écoles.
 * Réservé aux administrateurs de la plateforme (SuperAdmin).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { retryFailedPayouts } from '@/lib/payment-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: { headers: { Authorization: authHeader ?? '' } },
                auth: { persistSession: false },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        // Vérifier que l'utilisateur est SuperAdmin
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
            return NextResponse.json({ error: 'Accès réservé au SuperAdmin' }, { status: 403 });
        }

        const result = await retryFailedPayouts();

        return NextResponse.json({
            success: true,
            message: `${result.retried} virement(s) relancé(s) avec succès (${result.errors} ignorés/sans config).`,
            data: result,
        });

    } catch (err: unknown) {
        console.error('[/api/camerpay/payout/retry]', err);
        const message = err instanceof Error ? err.message : 'Erreur interne';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
