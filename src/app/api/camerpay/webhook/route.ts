/**
 * POST /api/camerpay/webhook
 * Réceptionne les callbacks CamerPay, valide la signature HMAC-SHA256,
 * et déclenche les actions post-paiement (commission, school_payment, enrollment).
 *
 * ⚠️  Cette route NE doit PAS avoir de middleware d'auth Supabase.
 *     Elle est appelée directement par les serveurs CamerPay.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyCamerPayWebhookSignature, type CamerPayWebhookPayload } from '@/lib/camerpay';
import { processWebhook } from '@/lib/payment-service';

export const runtime = 'nodejs';

// Désactiver le body parsing automatique pour lire le raw body
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    // 1. Lire le raw body (nécessaire pour la vérification HMAC)
    const rawBody = await req.text();
    const signature = req.headers.get('x-camerpay-signature') ?? '';

    // 2. Parser le payload
    let payload: CamerPayWebhookPayload;
    try {
        payload = JSON.parse(rawBody) as CamerPayWebhookPayload;
    } catch {
        return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
    }

    // 3. Retrouver le webhook_secret de l'org concernée
    //    L'invoice_id contient le slug de l'org (format: CF-{SLUG}-{TYPE}-...)
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );

    // Chercher la transaction par UUID CamerPay ou invoice_id
    const { data: tx } = await supabase
        .from('payment_transactions')
        .select(`
            id,
            organization_id,
            org_payment_config:organization_id(webhook_secret)
        `)
        .or(
            `camerpay_uuid.eq.${payload.data?.uuid},invoice_id.eq.${payload.data?.merchant_invoice_id}`
        )
        .maybeSingle();

    // 4. Valider la signature HMAC-SHA256
    //    Si on a un secret pour cette org, on l'utilise.
    //    Sinon on utilise le secret global (variable d'env de fallback).
    const webhookSecret =
        (tx as any)?.org_payment_config?.webhook_secret ??
        process.env.CAMERPAY_WEBHOOK_SECRET_GLOBAL ?? '';

    if (webhookSecret) {
        const isValid = await verifyCamerPayWebhookSignature(rawBody, signature, webhookSecret);
        if (!isValid) {
            console.warn('[Webhook] Signature HMAC invalide — rejet');
            return NextResponse.json({ error: 'Signature invalide' }, { status: 401 });
        }
    } else {
        // Pas de secret configuré — on log mais on continue (mode dégradé)
        console.warn('[Webhook] Aucun webhook_secret configuré — validation signature ignorée');
    }

    // 5. Traiter l'événement
    const result = await processWebhook(payload);

    if (!result.success) {
        console.error('[Webhook] Traitement échoué:', result.message);
        // Retourner 200 quand même pour que CamerPay ne retente pas indéfiniment
        // sauf si c'est une erreur critique
        return NextResponse.json({ received: true, warning: result.message }, { status: 200 });
    }

    console.log('[Webhook] ✅ Traité:', result.message, '| TX:', result.transactionId);
    return NextResponse.json({ received: true, ...result }, { status: 200 });
}

// Répondre aussi aux GET (pour que CamerPay puisse vérifier que l'URL existe)
export async function GET() {
    return NextResponse.json(
        { status: 'CampusFlow CamerPay Webhook Endpoint — OK' },
        { status: 200 }
    );
}
