/**
 * POST /api/camerpay/initiate
 * Initie un paiement CamerPay pour une organisation.
 * Nécessite une session Supabase valide (l'utilisateur doit être connecté).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { initiatePayment, type PaymentType } from '@/lib/payment-service';
import type { CamerPayMethod } from '@/lib/camerpay';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        // 1. Authentification — vérifier la session Supabase
        const authHeader = req.headers.get('Authorization');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: { headers: { Authorization: authHeader ?? '' } },
                auth: { persistSession: false },
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Non authentifié' },
                { status: 401 }
            );
        }

        // 2. Valider le body
        const body = await req.json();
        const {
            organizationId,
            organizationSlug,
            paymentType,
            amount,
            method,
            customerPhone,
            customerName,
            customerEmail,
            description,
            metadata,
            schoolPaymentId,
            enrollmentId,
            returnUrl,
        } = body;

        if (!organizationId || !organizationSlug || !paymentType || !amount || !method) {
            return NextResponse.json(
                { error: 'Champs requis manquants: organizationId, organizationSlug, paymentType, amount, method' },
                { status: 400 }
            );
        }

        if (amount <= 0 || !Number.isFinite(amount)) {
            return NextResponse.json(
                { error: 'Montant invalide' },
                { status: 400 }
            );
        }

        const validTypes: PaymentType[] = ['scolarite', 'inscription', 'shop', 'cursus', 'form'];
        if (!validTypes.includes(paymentType)) {
            return NextResponse.json(
                { error: `paymentType invalide. Valeurs: ${validTypes.join(', ')}` },
                { status: 400 }
            );
        }

        const validMethods: CamerPayMethod[] = ['orange_money', 'mtn_momo', 'stripe', 'paypal'];
        if (!validMethods.includes(method)) {
            return NextResponse.json(
                { error: `Méthode invalide. Valeurs: ${validMethods.join(', ')}` },
                { status: 400 }
            );
        }

        // Phone requis pour Orange Money et MTN MoMo
        if ((method === 'orange_money' || method === 'mtn_momo') && !customerPhone) {
            return NextResponse.json(
                { error: 'customerPhone requis pour Orange Money et MTN MoMo' },
                { status: 400 }
            );
        }

        // 3. Vérifier que l'utilisateur appartient à l'organisation
        const { data: membership } = await supabase
            .from('organizations')
            .select('id')
            .eq('id', organizationId)
            .or(`owner_id.eq.${user.id}`)
            .maybeSingle();

        // Si pas owner, vérifier student ou teacher dans l'org
        if (!membership) {
            const { data: studentProfile } = await supabase
                .from('student_profiles')
                .select('id')
                .eq('organization_id', organizationId)
                .eq('user_id', user.id)
                .maybeSingle();

            if (!studentProfile) {
                return NextResponse.json(
                    { error: 'Accès refusé à cette organisation' },
                    { status: 403 }
                );
            }
        }

        // 4. Initier le paiement
        const result = await initiatePayment({
            organizationId,
            organizationSlug,
            studentId: user.id,
            paymentType,
            amount: Math.round(amount),
            method,
            customerPhone,
            customerName: customerName ?? user.email,
            customerEmail: customerEmail ?? user.email,
            description,
            metadata: metadata ?? {},
            schoolPaymentId,
            enrollmentId,
            returnUrl,
        });

        return NextResponse.json({ success: true, data: result }, { status: 201 });

    } catch (err: unknown) {
        console.error('[/api/camerpay/initiate]', err);
        const message = err instanceof Error ? err.message : 'Erreur interne';
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
