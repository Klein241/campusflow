import type { Config, Context } from '@netlify/functions';
import { verifyCamerPayWebhookSignature } from '../../src/lib/camerpay';
import { processWebhook } from '../../src/lib/payment-service';

export default async (req: Request, _context: Context) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const rawBody = await req.text();
        const signature = req.headers.get('x-camerpay-signature')
            || req.headers.get('x-signature')
            || req.headers.get('camerpay-signature')
            || '';

        const secret = process.env.CAMERPAY_WEBHOOK_SECRET;
        if (secret) {
            const isValid = await verifyCamerPayWebhookSignature(rawBody, signature, secret);
            if (!isValid) {
                console.error('[camerpay-webhook] Signature HMAC invalide');
                return new Response(JSON.stringify({ error: 'Signature invalide' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        } else {
            console.warn('[camerpay-webhook] CAMERPAY_WEBHOOK_SECRET non configuré — validation de signature ignorée');
        }

        let eventPayload: any;
        try {
            eventPayload = JSON.parse(rawBody);
        } catch {
            return new Response(JSON.stringify({ error: 'Payload JSON invalide' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const result = await processWebhook(eventPayload);

        return new Response(JSON.stringify({
            received: true,
            status: result.status,
            payoutTriggered: result.payoutTriggered,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err: unknown) {
        console.error('[netlify/camerpay-webhook] Erreur:', err);
        const message = err instanceof Error ? err.message : 'Erreur interne';
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const config: Config = {
    path: '/api/camerpay/webhook',
};
