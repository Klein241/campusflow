/**
 * GET /api/camerpay/status/[uuid]
 * Vérifier le statut d'une transaction par son UUID CamerPay ou invoice_id.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkPaymentStatus } from '@/lib/payment-service';

export const runtime = 'nodejs';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ uuid: string }> }
) {
    try {
        const { uuid } = await params;

        // Auth
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

        // Retrouver la transaction
        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        );

        const { data: tx } = await adminSupabase
            .from('payment_transactions')
            .select('id, organization_id, camerpay_uuid, status, amount, completed_at, metadata, payment_type')
            .or(`camerpay_uuid.eq.${uuid},invoice_id.eq.${uuid},id.eq.${uuid}`)
            .maybeSingle();

        if (!tx) {
            return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 });
        }

        // Si déjà completed/failed, retourner depuis la DB (pas besoin d'appel CamerPay)
        if (tx.status === 'completed' || tx.status === 'failed' || tx.status === 'cancelled') {
            return NextResponse.json({
                success: true,
                data: {
                    transactionId: tx.id,
                    camerpayUuid:  tx.camerpay_uuid,
                    status:        tx.status,
                    amount:        tx.amount,
                    paidAt:        tx.completed_at,
                    paymentType:   tx.payment_type,
                    metadata:      tx.metadata,
                }
            });
        }

        // Sinon, interroger CamerPay en temps réel
        const liveStatus = await checkPaymentStatus(tx.camerpay_uuid);

        return NextResponse.json({
            success: true,
            data: {
                transactionId: tx.id,
                camerpayUuid:  tx.camerpay_uuid,
                status:        liveStatus.status,
                amount:        liveStatus.amount,
                paidAt:        liveStatus.paidAt,
                paymentType:   tx.payment_type,
                metadata:      tx.metadata,
            }
        });

    } catch (err: unknown) {
        console.error('[/api/camerpay/status]', err);
        const message = err instanceof Error ? err.message : 'Erreur interne';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
