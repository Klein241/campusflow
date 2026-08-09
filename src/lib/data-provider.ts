/**
 * ============================================================
 * CampusFlow - DataProvider
 * ============================================================
 * Orchestrateur dual-write avec Outbox Transactionnel.
 *
 * ECRITURE NORMALE (Supabase UP):
 *   1. Ecrit dans Supabase (les triggers fn_sync_outbox inserent
 *      automatiquement dans sync_outbox - meme transaction)
 *   2. Retourne le resultat a l utilisateur immediatement
 *   3. Worker Cloudflare (cron 1 min) lit outbox → sync D1
 *
 * ECRITURE (Supabase DOWN):
 *   1. Ecrit directement dans D1 via Worker REST API
 *   2. Insere dans pending_supabase_sync (D1)
 *   3. Superadmin alerte par push notification
 *   4. Worker health-check detecte retour Supabase → replay
 *
 * LECTURE (Supabase DOWN):
 *   1. Tente Supabase (primaire)
 *   2. Si timeout/erreur → fallback D1 (transparent pour user)
 * ============================================================
 */

import { supabase } from '@/lib/supabase';
import { notifyAdmin } from '@/lib/notify-admin';

// URL du Worker Cloudflare
const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL
    || 'https://campusflow-worker.kleintaptue1.workers.dev';

// Timeout pour detecter Supabase DOWN (ms)
const SUPABASE_TIMEOUT_MS = 8000;

// ── Helper : fetch avec timeout ───────────────────────────
async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs = SUPABASE_TIMEOUT_MS
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

// ── Ecriture vers D1 via Worker (fallback Supabase DOWN) ──
async function writeToD1(
    table: string,
    operation: 'upsert' | 'delete',
    payload: Record<string, unknown>
): Promise<{ data: unknown; error: null } | { data: null; error: Error }> {
    try {
        const res = await fetch(`${WORKER_URL}/api/d1/${table}`, {
            method: operation === 'delete' ? 'DELETE' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`D1 write failed: ${res.status}`);
        return { data: await res.json(), error: null };
    } catch (err) {
        return { data: null, error: err as Error };
    }
}

// ── Lecture depuis D1 via Worker ──────────────────────────
async function readFromD1(
    table: string,
    params: Record<string, string>
): Promise<{ data: unknown; error: null } | { data: null; error: Error }> {
    try {
        const qs = new URLSearchParams(params).toString();
        const res = await fetch(`${WORKER_URL}/api/d1/${table}?${qs}`);
        if (!res.ok) throw new Error(`D1 read failed: ${res.status}`);
        return { data: await res.json(), error: null };
    } catch (err) {
        return { data: null, error: err as Error };
    }
}

// ═══════════════════════════════════════════════════════════
// DataProvider public API
// ═══════════════════════════════════════════════════════════

export const DataProvider = {

    /**
     * write() - Ecriture avec outbox transactionnel
     *
     * Appelle supabaseOp() en priorite.
     * Les triggers Postgres inserent automatiquement dans sync_outbox.
     * Si Supabase est DOWN → fallback D1 direct + alerte superadmin.
     */
    async write<T>(
        supabaseOp: () => Promise<{ data: T | null; error: unknown }>,
        d1Fallback: { table: string; payload: Record<string, unknown> }
    ): Promise<T> {
        try {
            const result = await supabaseOp();
            if (result.error) throw result.error;
            if (result.data === null) throw new Error('No data returned');
            return result.data;
        } catch (primaryError) {
            // Supabase est DOWN ou erreur critique
            console.warn('[DataProvider] Supabase write failed, falling back to D1:', primaryError);

            // Alert superadmin
            notifyAdmin({
                event: 'SUPABASE_WRITE_FAILED',
                table: d1Fallback.table,
                error: String(primaryError),
                failover: 'd1_active',
            }).catch(() => {}); // fire and forget

            // Ecriture directe D1
            const d1Result = await writeToD1(d1Fallback.table, 'upsert', d1Fallback.payload);
            if (d1Result.error) {
                // Les deux ont echoue
                notifyAdmin({
                    event: 'BOTH_SERVICES_FAILED',
                    table: d1Fallback.table,
                    error: `Supabase: ${primaryError} | D1: ${d1Result.error}`,
                    failover: 'none',
                }).catch(() => {});
                throw new Error('Service temporarily unavailable. Please retry in a moment.');
            }

            return d1Result.data as T;
        }
    },

    /**
     * read() - Lecture avec fallback D1 transparent
     *
     * Lit depuis Supabase en priorite.
     * Si timeout ou erreur reseau → fallback D1 (user ne sait pas).
     */
    async read<T>(
        supabaseOp: () => Promise<{ data: T | null; error: unknown }>,
        d1Fallback: { table: string; params: Record<string, string> }
    ): Promise<T | null> {
        try {
            const result = await supabaseOp();
            if (result.error) throw result.error;
            return result.data;
        } catch (err) {
            console.warn('[DataProvider] Supabase read failed, falling back to D1:', err);

            notifyAdmin({
                event: 'SUPABASE_READ_FAILED',
                table: d1Fallback.table,
                error: String(err),
                failover: 'd1_active',
            }).catch(() => {});

            const d1Result = await readFromD1(d1Fallback.table, d1Fallback.params);
            if (d1Result.error) return null;
            return d1Result.data as T;
        }
    },

    /**
     * healthCheck() - Verifie si Supabase repond
     * Utilise par le Worker pour detecter le retour de Supabase
     */
    async healthCheck(): Promise<{ supabase: boolean; d1: boolean }> {
        const [supabaseOk, d1Ok] = await Promise.allSettled([
            supabase.from('organizations').select('id').limit(1),
            fetch(`${WORKER_URL}/api/health`).then(r => r.ok),
        ]);

        return {
            supabase: supabaseOk.status === 'fulfilled' && !supabaseOk.value.error,
            d1: d1Ok.status === 'fulfilled' && d1Ok.value === true,
        };
    },
};
