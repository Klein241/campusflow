import type { Config, Context } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { checkPaymentStatus } from '../../src/lib/payment-service';

export default async (req: Request, context: Context) => {
    if (req.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const url = new URL(req.url);
        // context.params may have uuid or url query param uuid
        const uuid = (context.params as any)?.uuid || url.searchParams.get('uuid');

        if (!uuid) {
            return new Response(JSON.stringify({ error: 'UUID de transaction manquant' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        );

        const { data: tx, error } = await supabase
            .from('payment_transactions')
            .select(`
                id,
                camerpay_uuid,
                invoice_id,
                amount,
                status,
                payment_type,
                metadata,
                completed_at,
                organization_id
            `)
            .or(`camerpay_uuid.eq.${uuid},id.eq.${uuid}`)
            .maybeSingle();

        if (error || !tx) {
            return new Response(JSON.stringify({ error: 'Transaction non trouvée' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (tx.status === 'completed' || tx.status === 'failed') {
            return new Response(JSON.stringify({
                success: true,
                data: {
                    transactionId: tx.id,
                    camerpayUuid: tx.camerpay_uuid,
                    status: tx.status,
                    amount: tx.amount,
                    paidAt: tx.completed_at,
                    paymentType: tx.payment_type,
                    metadata: tx.metadata,
                }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const liveStatus = await checkPaymentStatus(tx.camerpay_uuid);

        return new Response(JSON.stringify({
            success: true,
            data: {
                transactionId: tx.id,
                camerpayUuid: tx.camerpay_uuid,
                status: liveStatus.status,
                amount: liveStatus.amount,
                paidAt: liveStatus.paidAt,
                paymentType: tx.payment_type,
                metadata: tx.metadata,
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err: unknown) {
        console.error('[netlify/camerpay-status]', err);
        const message = err instanceof Error ? err.message : 'Erreur interne';
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const config: Config = {
    path: '/api/camerpay/status/:uuid',
};
