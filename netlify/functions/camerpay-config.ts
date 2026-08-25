import type { Config, Context } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

export default async (req: Request, _context: Context) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    try {
        const authHeader = req.headers.get('Authorization') || '';
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: { headers: { Authorization: authHeader } },
                auth: { persistSession: false },
            }
        );

        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) {
            return new Response(JSON.stringify({ error: 'Non authentifié' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        );

        // GET: Récupérer la config de reversement
        if (req.method === 'GET') {
            const url = new URL(req.url);
            const orgId = url.searchParams.get('organizationId');

            if (!orgId) {
                return new Response(JSON.stringify({ error: 'organizationId manquant' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            const { data: config, error } = await adminSupabase
                .from('org_payout_config')
                .select('*')
                .eq('organization_id', orgId)
                .maybeSingle();

            if (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            return new Response(JSON.stringify({
                success: true,
                data: config || {
                    organization_id: orgId,
                    payout_method: 'orange_money',
                    payout_phone: null,
                    payout_name: null,
                    is_active: false,
                },
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // POST: Sauvegarder la config
        if (req.method === 'POST') {
            const body = await req.json();
            const {
                organizationId,
                payoutMethod = 'orange_money',
                payoutPhone,
                payoutName,
                bankAccount,
                bankName,
                isActive = true,
                payoutThreshold = null,
            } = body;

            if (!organizationId) {
                return new Response(JSON.stringify({ error: 'organizationId manquant' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            if (payoutMethod !== 'bank_transfer' && !payoutPhone) {
                return new Response(JSON.stringify({ error: 'Le numéro Mobile Money est requis' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            if (!payoutName) {
                return new Response(JSON.stringify({ error: 'Le nom du bénéficiaire est requis' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            const payload: Record<string, unknown> = {
                organization_id: organizationId,
                payout_method:   payoutMethod,
                payout_phone:    payoutPhone ? payoutPhone.replace(/\s+/g, '') : null,
                payout_name:     payoutName.trim(),
                bank_account:    bankAccount ? bankAccount.trim() : null,
                bank_name:       bankName    ? bankName.trim()    : null,
                is_active:       isActive,
                payout_threshold: payoutThreshold ? Number(payoutThreshold) : null,
                updated_at:      new Date().toISOString(),
            };

            const { data: saved, error: saveErr } = await adminSupabase
                .from('org_payout_config')
                .upsert(payload, { onConflict: 'organization_id' })
                .select('*')
                .single();

            if (saveErr) {
                return new Response(JSON.stringify({ error: saveErr.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            return new Response(JSON.stringify({
                success: true,
                message: 'Coordonnées de paiement enregistrées avec succès',
                data: saved,
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err: unknown) {
        console.error('[netlify/camerpay-config]', err);
        const message = err instanceof Error ? err.message : 'Erreur interne';
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const config: Config = {
    path: '/api/camerpay/config',
};
