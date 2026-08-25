/**
 * GET  /api/camerpay/config   — Lire les coordonnées de paiement de l'org
 * POST /api/camerpay/config   — Sauvegarder numéro Mobile Money de l'école
 * DELETE /api/camerpay/config — Désactiver le paiement vers l'org
 *
 * Note: Il n'y a PAS de token CamerPay par école.
 *       L'admin d'école saisit uniquement son numéro Mobile Money
 *       pour recevoir les virements automatiques.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

async function verifyOrgOwnership(req: NextRequest, organizationId: string) {
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: authHeader ?? '' } }, auth: { persistSession: false } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Non authentifié', status: 401 };

    const { data: org } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('id', organizationId)
        .eq('owner_id', user.id)
        .maybeSingle();

    if (!org) return { error: 'Accès refusé ou organisation introuvable', status: 403 };
    return { user, org };
}

// ── GET : Lire la config de paiement ─────────────────────────────────────────

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
        return NextResponse.json({ error: 'organizationId requis' }, { status: 400 });
    }

    const result = await verifyOrgOwnership(req, organizationId);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

    const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );

    const { data: config } = await adminSupabase
        .from('org_payout_config')
        .select('id, payout_method, payout_phone, payout_name, bank_name, is_active, verified_at, payout_threshold, created_at, updated_at')
        .eq('organization_id', organizationId)
        .maybeSingle();

    return NextResponse.json({
        success: true,
        data: config ?? null,
        hasConfig: !!config,
        info: 'Saisissez votre numéro Mobile Money pour recevoir les paiements des élèves automatiquement.'
    });
}

// ── POST : Sauvegarder les coordonnées de paiement ────────────────────────────

export async function POST(req: NextRequest) {
    const body = await req.json();
    const {
        organizationId,
        payoutMethod,
        payoutPhone,
        payoutName,
        bankAccount,
        bankName,
        payoutThreshold,
    } = body;

    if (!organizationId || !payoutMethod) {
        return NextResponse.json(
            { error: 'organizationId et payoutMethod requis' },
            { status: 400 }
        );
    }

    const validMethods = ['orange_money', 'mtn_momo', 'bank_transfer'];
    if (!validMethods.includes(payoutMethod)) {
        return NextResponse.json(
            { error: `payoutMethod invalide. Valeurs: ${validMethods.join(', ')}` },
            { status: 400 }
        );
    }

    if ((payoutMethod === 'orange_money' || payoutMethod === 'mtn_momo') && !payoutPhone) {
        return NextResponse.json(
            { error: 'payoutPhone requis pour Orange Money et MTN MoMo' },
            { status: 400 }
        );
    }

    if (payoutMethod === 'bank_transfer' && !bankAccount) {
        return NextResponse.json(
            { error: 'bankAccount requis pour virement bancaire' },
            { status: 400 }
        );
    }

    const result = await verifyOrgOwnership(req, organizationId);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

    const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );

    const upsertData = {
        organization_id:  organizationId,
        payout_method:    payoutMethod,
        payout_phone:     payoutPhone ?? null,
        payout_name:      payoutName ?? null,
        bank_account:     bankAccount ?? null,
        bank_name:        bankName ?? null,
        payout_threshold: payoutThreshold ?? null,
        is_active:        true,
    };

    const { data, error } = await adminSupabase
        .from('org_payout_config')
        .upsert(upsertData, { onConflict: 'organization_id' })
        .select('id, payout_method, payout_phone, payout_name, is_active')
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
        success: true,
        message: '✅ Coordonnées de paiement sauvegardées. Vous recevrez automatiquement les fonds après chaque paiement élève.',
        data,
    });
}

// ── DELETE : Désactiver ───────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    if (!organizationId) return NextResponse.json({ error: 'organizationId requis' }, { status: 400 });

    const result = await verifyOrgOwnership(req, organizationId);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

    const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );

    await adminSupabase
        .from('org_payout_config')
        .update({ is_active: false })
        .eq('organization_id', organizationId);

    return NextResponse.json({ success: true, message: 'Paiement automatique désactivé' });
}
