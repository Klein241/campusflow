import type { Config, Context } from '@netlify/functions';
import { initiatePayment, type PaymentType } from '../../src/lib/payment-service';
import type { CamerPayMethod } from '../../src/lib/camerpay';

export default async (req: Request, _context: Context) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await req.json();
        const {
            organizationId,
            organizationSlug,
            studentId,
            paymentType,
            amount,
            method,
            customerPhone,
            customerName,
            customerEmail,
            description,
            schoolPaymentId,
            enrollmentId,
            metadata,
            returnUrl,
        } = body;

        if (!organizationId || !organizationSlug || !paymentType || !amount || !method) {
            return new Response(JSON.stringify({ error: 'Champs obligatoires manquants' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (amount < 100) {
            return new Response(JSON.stringify({ error: 'Montant minimum : 100 XAF' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const validMethods = ['orange_money', 'mtn_momo', 'stripe', 'paypal'];
        if (!validMethods.includes(method)) {
            return new Response(JSON.stringify({ error: `Méthode invalide: ${method}` }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const result = await initiatePayment({
            organizationId,
            organizationSlug,
            studentId,
            paymentType: paymentType as PaymentType,
            amount: Number(amount),
            method: method as CamerPayMethod,
            customerPhone,
            customerName,
            customerEmail,
            description,
            schoolPaymentId,
            enrollmentId,
            metadata,
            returnUrl,
        });

        return new Response(JSON.stringify({ success: true, data: result }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err: unknown) {
        console.error('[netlify/camerpay-initiate]', err);
        const message = err instanceof Error ? err.message : 'Erreur interne du serveur';
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const config: Config = {
    path: '/api/camerpay/initiate',
};
