/**
 * CampusFlow — Payment Service (Orchestrateur)
 * Architecture : 1 seul compte CamerPay (SuperAdmin)
 *
 * Flux complet :
 *  1. Élève paie → argent arrive sur compte CamerPay du SuperAdmin
 *  2. Webhook reçu → transaction marquée 'completed'
 *  3. Commission SuperAdmin calculée (ex: 0.5%)
 *  4. Mass Payout automatique → net viré vers le Mobile Money de l'école
 */

import { createClient } from '@supabase/supabase-js';
import {
    CamerPayClient,
    generateInvoiceId,
    type CamerPayInitiateRequest,
    type CamerPayMethod,
    type CamerPayWebhookPayload,
} from '@/lib/camerpay';

function getAdminSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !key) throw new Error('Variables Supabase manquantes');
    return createClient(url, key, { auth: { persistSession: false } });
}

/** Client CamerPay unique (token SuperAdmin depuis variable d'env) */
function getCamerPayClient() {
    return new CamerPayClient(); // lit CAMERPAY_BEARER_TOKEN depuis process.env
}

// ── Types ────────────────────────────────────────────────────────────────────

export type PaymentType = 'scolarite' | 'inscription' | 'shop' | 'cursus' | 'form';

export interface InitiatePaymentOptions {
    organizationId: string;
    organizationSlug: string;
    studentId?: string;
    paymentType: PaymentType;
    amount: number;
    method: CamerPayMethod;
    customerPhone?: string;
    customerName?: string;
    customerEmail?: string;
    description?: string;
    metadata?: Record<string, unknown>;
    schoolPaymentId?: string;
    enrollmentId?: string;
    returnUrl?: string;
}

export interface InitiatePaymentResult {
    transactionId: string;
    camerpayUuid: string;
    invoiceId: string;
    payUrl: string;
    amount: number;
    status: 'pending';
}

export interface WebhookProcessResult {
    success: boolean;
    transactionId?: string;
    commissionId?: string;
    payoutId?: string;
    message: string;
}

// ── 1. Initier un paiement ────────────────────────────────────────────────────

export async function initiatePayment(
    opts: InitiatePaymentOptions
): Promise<InitiatePaymentResult> {
    const supabase = getAdminSupabase();
    const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://campusflow.app';

    const invoiceId  = generateInvoiceId(opts.organizationSlug, opts.paymentType);
    const returnUrl  = opts.returnUrl ??
        `${appUrl}/${opts.organizationSlug}/student/paiement/succes?invoice=${invoiceId}`;
    const webhookUrl = `${appUrl}/api/camerpay/webhook`;

    const initiateReq: CamerPayInitiateRequest = {
        payment_method:        opts.method,
        amount:                Math.round(opts.amount),
        currency:              'XAF',
        customer_phone:        opts.customerPhone,
        customer_name:         opts.customerName,
        customer_email:        opts.customerEmail,
        merchant_invoice_id:   invoiceId,
        merchant_callback_url: webhookUrl,
        merchant_return_url:   returnUrl,
        description:           opts.description,
        idempotency_key:       invoiceId,
    };

    // Appel CamerPay (compte unique SuperAdmin)
    const client  = getCamerPayClient();
    const cprResp = await client.initiatePayment(initiateReq);

    if (!cprResp.success || !cprResp.data?.pay_url) {
        throw new Error(cprResp.message ?? 'Erreur CamerPay lors de l\'initiation');
    }

    // Enregistrer en DB
    const { data: tx, error: txErr } = await supabase
        .from('payment_transactions')
        .insert({
            organization_id:  opts.organizationId,
            student_id:       opts.studentId ?? null,
            camerpay_uuid:    cprResp.data.uuid,
            invoice_id:       invoiceId,
            pay_url:          cprResp.data.pay_url,
            amount:           Math.round(opts.amount),
            currency:         'XAF',
            payment_method:   opts.method,
            status:           'pending',
            payment_type:     opts.paymentType,
            metadata:         opts.metadata ?? {},
            camerpay_raw:     cprResp.data,
            school_payment_id: opts.schoolPaymentId ?? null,
            enrollment_id:    opts.enrollmentId ?? null,
            customer_phone:   opts.customerPhone ?? null,
            customer_name:    opts.customerName ?? null,
            customer_email:   opts.customerEmail ?? null,
        })
        .select()
        .single();

    if (txErr || !tx) throw new Error('Erreur lors de l\'enregistrement de la transaction');

    return {
        transactionId: tx.id,
        camerpayUuid:  cprResp.data.uuid,
        invoiceId,
        payUrl:        cprResp.data.pay_url,
        amount:        Math.round(opts.amount),
        status:        'pending',
    };
}

// ── 2. Traiter le webhook CamerPay ────────────────────────────────────────────

export async function processWebhook(
    payload: CamerPayWebhookPayload
): Promise<WebhookProcessResult> {
    const supabase = getAdminSupabase();
    const { event, data } = payload;
    const { uuid, status, merchant_invoice_id } = data;

    // Retrouver la transaction
    const { data: tx } = await supabase
        .from('payment_transactions')
        .select('*')
        .or(`camerpay_uuid.eq.${uuid},invoice_id.eq.${merchant_invoice_id}`)
        .maybeSingle();

    if (!tx) {
        console.warn('[Webhook] Transaction introuvable:', uuid);
        return { success: false, message: 'Transaction introuvable' };
    }

    // Mettre à jour le statut
    const isCompleted = event === 'payment.completed' || status === 'completed';
    const newStatus   = isCompleted ? 'completed'
                      : status === 'failed' ? 'failed'
                      : status === 'refunded' ? 'refunded'
                      : status;

    await supabase
        .from('payment_transactions')
        .update({
            status:       newStatus,
            camerpay_raw: data,
            completed_at: isCompleted ? (data.paid_at ?? new Date().toISOString()) : null,
        })
        .eq('id', tx.id);

    if (!isCompleted) {
        return { success: true, transactionId: tx.id, message: `Statut: ${newStatus}` };
    }

    // ── Paiement complété : calcul commission + Mass Payout automatique ──

    // 1. Calculer commission via RPC DB (retourne les données de payout)
    const { data: commissionData, error: commErr } = await supabase
        .rpc('create_commission_and_queue_payout', { p_transaction_id: tx.id });

    if (commErr || !commissionData) {
        console.error('[Webhook] Erreur création commission:', commErr);
        return { success: true, transactionId: tx.id, message: 'Commission échouée' };
    }

    const {
        commission_id,
        net_to_org,
        has_payout_config,
        payout_phone,
        payout_name,
        payout_method,
    } = commissionData as {
        commission_id: string;
        net_to_org: number;
        commission_amount: number;
        has_payout_config: boolean;
        payout_phone: string | null;
        payout_name: string | null;
        payout_method: string | null;
    };

    // 2. Mettre à jour school_payments si lié
    if (tx.school_payment_id) {
        await supabase
            .from('school_payments')
            .update({
                status: 'paid',
                paid_online: true,
                payment_transaction_id: tx.id,
            })
            .eq('id', tx.school_payment_id);
    }

    // 3. Mettre à jour enrollment si lié (inscription/scolarité)
    if (tx.enrollment_id && ['scolarite', 'inscription'].includes(tx.payment_type)) {
        await supabase
            .from('enrollments')
            .update({ statut: 'confirmee' })
            .eq('id', tx.enrollment_id)
            .eq('statut', 'en_attente');
    }

    // 4. Mass Payout automatique vers l'école (si configuré)
    let payoutId: string | undefined;

    if (has_payout_config && payout_phone && payout_name && payout_method && net_to_org > 0) {
        payoutId = await triggerMassPayout({
            organizationId: tx.organization_id,
            commissionId:   commission_id,
            transactionId:  tx.id,
            netAmount:      net_to_org,
            invoiceRef:     tx.invoice_id,
            payoutPhone:    payout_phone,
            payoutName:     payout_name,
            payoutMethod:   payout_method as 'orange_money' | 'mtn_momo' | 'bank_transfer',
            paymentType:    tx.payment_type,
        });
    } else {
        console.warn(
            `[Webhook] Virement vers ${tx.organization_id} skippé — config payout manquante`
        );
    }

    return {
        success: true,
        transactionId: tx.id,
        commissionId:  commission_id,
        payoutId,
        message: `Paiement complété, commission créée${payoutId ? ', virement lancé' : ', virement en attente de config'}`,
    };
}

// ── 3. Lancer un Mass Payout vers l'école ────────────────────────────────────

interface TriggerMassPayoutOptions {
    organizationId: string;
    commissionId: string;
    transactionId: string;
    netAmount: number;
    invoiceRef: string;
    payoutPhone: string;
    payoutName: string;
    payoutMethod: 'orange_money' | 'mtn_momo' | 'bank_transfer';
    paymentType: string;
}

async function triggerMassPayout(opts: TriggerMassPayoutOptions): Promise<string | undefined> {
    const supabase = getAdminSupabase();
    const client   = getCamerPayClient();

    // Créer l'entrée mass_payout (statut pending)
    const { data: mp, error: mpErr } = await supabase
        .from('mass_payouts')
        .insert({
            organization_id:  opts.organizationId,
            total_amount:     opts.netAmount,
            currency:         'XAF',
            beneficiary_phone: opts.payoutPhone,
            beneficiary_name: opts.payoutName,
            payout_method:    opts.payoutMethod,
            status:           'pending',
        })
        .select()
        .single();

    if (mpErr || !mp) {
        console.error('[MassPayout] Erreur création mass_payout:', mpErr);
        return undefined;
    }

    try {
        const resp = await client.massPayout({
            payout_method: opts.payoutMethod,
            currency: 'XAF',
            beneficiaries: [{
                phone:     opts.payoutPhone,
                name:      opts.payoutName,
                amount:    Math.round(opts.netAmount),
                reference: opts.invoiceRef,
                note:      `CampusFlow - Reversement ${opts.paymentType} - ${opts.invoiceRef}`,
            }],
            description: `Reversement automatique CampusFlow — ${opts.paymentType}`,
            idempotency_key: `PAYOUT-${opts.transactionId}`,
        });

        const payoutStatus = resp.success ? 'processing' : 'failed';
        const camerpayPayoutId = resp.data?.payout_id ?? null;

        // Mettre à jour mass_payout
        await supabase
            .from('mass_payouts')
            .update({
                status:            payoutStatus,
                camerpay_payout_id: camerpayPayoutId,
                camerpay_raw:      resp.data,
            })
            .eq('id', mp.id);

        // Mettre à jour la commission
        await supabase
            .from('platform_commissions')
            .update({
                payout_status:        payoutStatus,
                camerpay_payout_id:   camerpayPayoutId,
                payout_initiated_at:  new Date().toISOString(),
            })
            .eq('id', opts.commissionId);

        // Lier mass_payout à la transaction
        await supabase
            .from('payment_transactions')
            .update({ mass_payout_id: mp.id })
            .eq('id', opts.transactionId);

        console.log(`[MassPayout] ✅ Lancé vers ${opts.payoutPhone} — ${opts.netAmount} XAF`);
        return mp.id;

    } catch (err) {
        console.error('[MassPayout] Erreur appel CamerPay:', err);

        // Marquer l'échec
        await supabase
            .from('mass_payouts')
            .update({
                status:        'failed',
                error_message: err instanceof Error ? err.message : 'Erreur inconnue',
            })
            .eq('id', mp.id);

        await supabase
            .from('platform_commissions')
            .update({
                payout_status: 'failed',
                payout_error:  err instanceof Error ? err.message : 'Erreur inconnue',
            })
            .eq('id', opts.commissionId);

        return mp.id;
    }
}

// ── 4. Vérifier le statut d'une transaction ───────────────────────────────────

export async function checkPaymentStatus(camerpayUuid: string) {
    const supabase = getAdminSupabase();
    const client   = getCamerPayClient();
    const resp = await client.getPaymentStatus(camerpayUuid);
    if (!resp.success) throw new Error('Impossible de récupérer le statut');

    await supabase
        .from('payment_transactions')
        .update({
            status:       resp.data.status,
            completed_at: resp.data.paid_at ?? null,
            camerpay_raw: resp.data,
        })
        .eq('camerpay_uuid', camerpayUuid);

    return {
        status:  resp.data.status,
        amount:  parseFloat(resp.data.amount),
        paidAt:  resp.data.paid_at,
    };
}

// ── 5. Relancer les virements en échec (cron SuperAdmin) ─────────────────────

export async function retryFailedPayouts(): Promise<{ retried: number; errors: number }> {
    const supabase = getAdminSupabase();

    // Récupérer les commissions avec payout échoué (max 50 à la fois)
    const { data: failedCommissions } = await supabase
        .from('platform_commissions')
        .select(`
            id, transaction_id, organization_id, net_to_org, payment_type,
            transaction:transaction_id(invoice_id),
            payout_config:organization_id(payout_phone, payout_name, payout_method, is_active)
        `)
        .eq('payout_status', 'failed')
        .limit(50);

    if (!failedCommissions?.length) return { retried: 0, errors: 0 };

    let retried = 0, errors = 0;

    for (const c of failedCommissions) {
        const cfg = (c as any).payout_config;
        if (!cfg?.is_active || !cfg?.payout_phone) { errors++; continue; }

        try {
            await triggerMassPayout({
                organizationId: c.organization_id,
                commissionId:   c.id,
                transactionId:  c.transaction_id,
                netAmount:      c.net_to_org,
                invoiceRef:     (c as any).transaction?.invoice_id ?? c.id,
                payoutPhone:    cfg.payout_phone,
                payoutName:     cfg.payout_name,
                payoutMethod:   cfg.payout_method,
                paymentType:    c.payment_type,
            });
            retried++;
        } catch { errors++; }
    }

    return { retried, errors };
}

// ── 6. Stats ──────────────────────────────────────────────────────────────────

export async function getPlatformPaymentStats(from?: Date, to?: Date) {
    const supabase = getAdminSupabase();
    const { data } = await supabase.rpc('get_platform_payment_stats', {
        p_from: (from ?? new Date(Date.now() - 30 * 86400_000)).toISOString(),
        p_to:   (to   ?? new Date()).toISOString(),
    });
    return data;
}

export async function getOrgTransactions(organizationId: string, limit = 50, offset = 0) {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
            *,
            student:student_id(first_name, last_name, photo_url),
            commission:platform_commission_id(
                commission_amount, commission_rate, net_to_org, payout_status
            ),
            payout:mass_payout_id(status, camerpay_payout_id, beneficiary_phone)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) throw error;
    return data ?? [];
}

export async function getAllTransactions(limit = 100, offset = 0) {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
            *,
            org:organization_id(name, slug, logo_url),
            commission:platform_commission_id(
                commission_amount, net_to_org, payout_status, camerpay_payout_id
            )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) throw error;
    return data ?? [];
}
