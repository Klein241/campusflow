/**
 * CampusFlow — Service CamerPay
 * Un seul compte CamerPay appartenant au SuperAdmin CampusFlow.
 * Gère : initiation paiement, statut, remboursement, Mass Payout (virement automatique vers les écoles).
 * Doc: https://camerpay.biz/docs/api
 */

const CAMERPAY_BASE_URL = 'https://camerpay.biz';

// ── Types ────────────────────────────────────────────────────────────────────

export type CamerPayMethod = 'orange_money' | 'mtn_momo' | 'stripe' | 'paypal';
export type CamerPayPayoutMethod = 'orange_money' | 'mtn_momo' | 'bank_transfer';

export type CamerPayStatus =
    | 'pending'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'refunded'
    | 'cancelled';

// ── Paiement entrant ──────────────────────────────────────────────────────────

export interface CamerPayInitiateRequest {
    payment_method: CamerPayMethod;
    amount: number;                   // Entier XAF
    currency: 'XAF';
    customer_phone?: string;          // Requis pour Orange Money / MTN MoMo
    customer_name?: string;
    customer_email?: string;
    merchant_invoice_id: string;      // Clé idempotente
    merchant_callback_url: string;    // URL webhook POST
    merchant_return_url: string;      // Redirection après paiement
    idempotency_key?: string;
    description?: string;
}

export interface CamerPayInitiateResponse {
    success: boolean;
    data: {
        uuid: string;
        pay_url: string;
        status: CamerPayStatus;
        amount: string;
        currency: string;
        merchant_invoice_id: string;
        created_at: string;
    };
    message?: string;
}

export interface CamerPayStatusResponse {
    success: boolean;
    data: {
        uuid: string;
        status: CamerPayStatus;
        amount: string;
        currency: string;
        payment_method: string;
        merchant_invoice_id: string;
        customer_phone?: string;
        customer_name?: string;
        customer_email?: string;
        paid_at?: string;
        created_at: string;
        updated_at: string;
    };
}

// ── Mass Payout (virement vers les écoles) ────────────────────────────────────

export interface MassPayoutBeneficiary {
    phone: string;           // Numéro Mobile Money du bénéficiaire
    name: string;            // Nom exact du bénéficiaire
    amount: number;          // Montant en XAF
    reference?: string;      // Référence interne (ex: "ORG-SLUG-CF-INV-XXX")
    note?: string;           // Description (ex: "Reversement scolarité Trimestre 1")
}

export interface MassPayoutRequest {
    payout_method: CamerPayPayoutMethod;
    currency: 'XAF';
    beneficiaries: MassPayoutBeneficiary[];
    description?: string;
    idempotency_key?: string;
}

export interface MassPayoutResponse {
    success: boolean;
    data: {
        payout_id: string;        // ID unique du Mass Payout chez CamerPay
        status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
        total_amount: string;
        beneficiaries_count: number;
        created_at: string;
    };
    message?: string;
}

// ── Webhook ───────────────────────────────────────────────────────────────────

export interface CamerPayWebhookPayload {
    event: 'payment.completed' | 'payment.failed' | 'payment.refunded';
    data: {
        uuid: string;
        status: CamerPayStatus;
        amount: string;
        currency: string;
        payment_method: string;
        merchant_invoice_id: string;
        customer_phone?: string;
        customer_name?: string;
        customer_email?: string;
        paid_at?: string;
        metadata?: Record<string, unknown>;
    };
    timestamp: string;
    signature?: string;
}

// ── Client CamerPay ───────────────────────────────────────────────────────────

export class CamerPayClient {
    private readonly bearerToken: string;
    private readonly baseUrl: string;

    constructor(bearerToken?: string, baseUrl = CAMERPAY_BASE_URL) {
        const token = bearerToken ?? process.env.CAMERPAY_BEARER_TOKEN ?? '';
        if (!token) throw new Error('CamerPay: Bearer token manquant (CAMERPAY_BEARER_TOKEN)');
        this.bearerToken = token;
        this.baseUrl = baseUrl;
    }

    private async request<T>(
        method: 'GET' | 'POST',
        path: string,
        body?: unknown
    ): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        const res = await fetch(url, {
            method,
            headers: {
                Authorization: `Bearer ${this.bearerToken}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(15_000),
        });

        if (!res.ok) {
            let errBody: unknown;
            try { errBody = await res.json(); } catch { errBody = await res.text(); }
            throw new CamerPayError(`CamerPay API ${res.status}`, res.status, errBody);
        }
        return res.json() as Promise<T>;
    }

    /** Initier une transaction de paiement */
    async initiatePayment(req: CamerPayInitiateRequest): Promise<CamerPayInitiateResponse> {
        return this.request<CamerPayInitiateResponse>('POST', '/api/payment/initiate', req);
    }

    /** Statut d'une transaction */
    async getPaymentStatus(uuid: string): Promise<CamerPayStatusResponse> {
        return this.request<CamerPayStatusResponse>('GET', `/api/payment/${encodeURIComponent(uuid)}/status`);
    }

    /** Rembourser une transaction */
    async refundPayment(uuid: string, reason?: string) {
        return this.request<{ success: boolean; message?: string }>(
            'POST', `/api/payment/${encodeURIComponent(uuid)}/refund`,
            reason ? { reason } : undefined
        );
    }

    /**
     * Mass Payout — virement automatique vers l'école.
     * CampusFlow collecte le paiement, puis redirige le net vers le Mobile Money de l'école.
     * 1 appel = 1 bénéficiaire dans notre cas (1 transaction = 1 école).
     */
    async massPayout(req: MassPayoutRequest): Promise<MassPayoutResponse> {
        return this.request<MassPayoutResponse>('POST', '/api/mass-payout', req);
    }
}

// ── Erreur typée ──────────────────────────────────────────────────────────────

export class CamerPayError extends Error {
    readonly statusCode: number;
    readonly body: unknown;
    constructor(message: string, statusCode: number, body?: unknown) {
        super(message);
        this.name = 'CamerPayError';
        this.statusCode = statusCode;
        this.body = body;
    }
}

// ── Validation webhook HMAC-SHA256 (Edge compatible) ─────────────────────────

export async function verifyCamerPayWebhookSignature(
    rawBody: string | ArrayBuffer,
    signature: string,
    secret: string
): Promise<boolean> {
    if (!signature || !secret) return false;
    try {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const body = typeof rawBody === 'string' ? encoder.encode(rawBody) : rawBody;
        const sigBuffer = await crypto.subtle.sign('HMAC', key, body);
        const computed = Array.from(new Uint8Array(sigBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        return timingSafeEqual(computed, signature.replace('sha256=', ''));
    } catch { return false; }
}

function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let r = 0;
    for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return r === 0;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Génère un merchant_invoice_id unique.
 * Format: CF-{ORG_SLUG}-{TYPE}-{TIMESTAMP}-{RANDOM}
 */
export function generateInvoiceId(orgSlug: string, paymentType: string): string {
    const ts   = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `CF-${orgSlug.toUpperCase().substring(0, 8)}-${paymentType.toUpperCase().substring(0, 4)}-${ts}-${rand}`;
}

/** Formate un montant XAF */
export function formatXAF(amount: number | string): string {
    const n = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('fr-CM', {
        style: 'currency', currency: 'XAF',
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n);
}

/** Méthodes de paiement disponibles */
export const CAMERPAY_METHODS: Record<CamerPayMethod, {
    label: string; icon: string; color: string; requiresPhone: boolean;
}> = {
    orange_money: { label: 'Orange Money', icon: '🟠', color: '#FF6B00', requiresPhone: true },
    mtn_momo:     { label: 'MTN MoMo',     icon: '🟡', color: '#FFCC00', requiresPhone: true },
    stripe:       { label: 'Carte Bancaire',icon: '💳', color: '#635BFF', requiresPhone: false },
    paypal:       { label: 'PayPal',        icon: '🔵', color: '#003087', requiresPhone: false },
};

/** Méthodes de virement disponibles pour les écoles */
export const PAYOUT_METHODS: Record<CamerPayPayoutMethod, {
    label: string; icon: string; requiresPhone: boolean;
}> = {
    orange_money:  { label: 'Orange Money',  icon: '🟠', requiresPhone: true },
    mtn_momo:      { label: 'MTN MoMo',      icon: '🟡', requiresPhone: true },
    bank_transfer: { label: 'Virement bancaire', icon: '🏦', requiresPhone: false },
};
