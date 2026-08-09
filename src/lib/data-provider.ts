/**
 * ============================================================
 * CampusFlow — DataProvider v3
 * ============================================================
 * Corrections par rapport à v2 :
 *
 * [FIX-1] supabaseOp() maintenant enveloppé dans Promise.race()
 *         avec SUPABASE_TIMEOUT_MS — timeout réellement appliqué.
 *
 * [FIX-2] registerPendingSync : échec notifie l'admin au lieu
 *         d'être avalé silencieusement.
 *
 * [FIX-3] record_id tiré du payload AVANT writeToD1, pas après.
 *         ID généré côté client, injecté dans payload.id.
 *
 * [FIX-4] pending_supabase_sync idempotent : clé de déduplication
 *         = hash(table_name + record_id + operation).
 *
 * [FIX-5] read() à double échec retourne source:'both_failed'
 *         (distinguable de source:'not_found').
 *
 * [FIX-6] notifyAdmin avec log persistant D1 en fallback.
 * ============================================================
 */

import { supabase } from '@/lib/supabase';
import { notifyAdmin } from '@/lib/notify-admin';

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL
    || 'https://campusflow-worker.kleintaptue1.workers.dev';

// Timeout réel appliqué à supabaseOp() via Promise.race()
const SUPABASE_TIMEOUT_MS = 5000;

// ── [FIX-1] Race Supabase vs timeout ─────────────────────
function withSupabaseTimeout<T>(
    op: () => Promise<T>,
    timeoutMs = SUPABASE_TIMEOUT_MS
): Promise<T> {
    return Promise.race([
        op(),
        new Promise<never>((_, reject) =>
            setTimeout(
                () => reject(new Error(`Supabase timeout after ${timeoutMs}ms`)),
                timeoutMs
            )
        ),
    ]);
}

// ── fetch avec timeout (pour appels D1/Worker) ────────────
async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs = 5000
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

// ── [FIX-6] Log persistant D1 (fallback si notifyAdmin DOWN) ─
async function persistLog(
    event: string,
    table: string,
    error: string
): Promise<void> {
    try {
        await fetchWithTimeout(
            `${WORKER_URL}/api/d1/system_alerts`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: crypto.randomUUID(),
                    service: 'DataProvider',
                    event,
                    table_name: table,
                    error_msg: error,
                    created_at: new Date().toISOString(),
                }),
            },
            3000
        );
    } catch {
        // Si même D1 est down : on ne peut rien faire de plus
        // console.error est acceptable ici car c'est le dernier recours
        console.error(`[DataProvider] CRITICAL — Log persistant échoué: ${event} on ${table}`);
    }
}

// ── Notify + log persistant (double filet) ────────────────
async function alertWithFallback(params: {
    event: string;
    table: string;
    error: string;
    failover: string;
    elapsed_ms?: number;
}): Promise<void> {
    // Tenter la notification push/email admin
    const notifOk = await notifyAdmin({
        event: params.event,
        table: params.table,
        error: params.error,
        failover: params.failover,
        elapsed_ms: params.elapsed_ms,
    }).then(() => true).catch(() => false);

    // Si la notification échoue → log persistant D1
    if (!notifOk) {
        await persistLog(params.event, params.table, params.error);
    }
}

// ── Écriture D1 via Worker ────────────────────────────────
async function writeToD1(
    table: string,
    payload: Record<string, unknown>
): Promise<{ data: unknown; error: null } | { data: null; error: Error }> {
    try {
        const res = await fetchWithTimeout(
            `${WORKER_URL}/api/d1/${table}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            },
            5000
        );
        if (!res.ok) throw new Error(`D1 write failed: ${res.status}`);
        return { data: await res.json(), error: null };
    } catch (err) {
        return { data: null, error: err as Error };
    }
}

// ── [FIX-3+4] Enregistrement pending sync idempotent ─────
async function registerPendingSync(
    table: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    recordId: string,  // [FIX-3] toujours issu de payload.id, jamais regeneré
    payload: Record<string, unknown>
): Promise<void> {
    // [FIX-4] Clé de déduplication déterministe
    // Même appel deux fois = même dedup_key = UPSERT pas de doublon
    const dedupKey = `${table}::${recordId}::${operation}`;

    const entry = {
        id: crypto.randomUUID(),
        dedup_key: dedupKey,     // colonne UNIQUE dans pending_supabase_sync
        table_name: table,
        operation,
        record_id: recordId,
        payload: JSON.stringify(payload),
        retry_count: 0,
        created_at: new Date().toISOString(),
    };

    try {
        const res = await fetchWithTimeout(
            `${WORKER_URL}/api/d1/pending_supabase_sync`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry),
            },
            5000
        );
        if (!res.ok) throw new Error(`pending_supabase_sync write failed: ${res.status}`);
    } catch (err) {
        // [FIX-2] Ne plus avaler silencieusement — alerter l'admin
        await alertWithFallback({
            event: 'PENDING_SYNC_REGISTRATION_FAILED',
            table,
            error: String(err),
            failover: 'data_in_d1_but_no_replay_trace',
        });
        // Propager pour que write() sache que la trace de replay est absente
        throw err;
    }
}

// ── Lecture D1 ────────────────────────────────────────────
async function readFromD1(
    table: string,
    params: Record<string, string>
): Promise<{ data: unknown; error: null } | { data: null; error: Error }> {
    try {
        const qs = new URLSearchParams(params).toString();
        const res = await fetchWithTimeout(
            `${WORKER_URL}/api/d1/${table}?${qs}`,
            { method: 'GET' },
            5000
        );
        if (!res.ok) throw new Error(`D1 read failed: ${res.status}`);
        return { data: await res.json(), error: null };
    } catch (err) {
        return { data: null, error: err as Error };
    }
}

// ═══════════════════════════════════════════════════════════
// Types publics
// ═══════════════════════════════════════════════════════════

export type WriteResult<T> = {
    data: T;
    source: 'supabase' | 'd1';
    replay_pending: boolean;
};

export type ReadResult<T> = {
    data: T | null;
    source: 'supabase' | 'd1' | 'not_found' | 'both_failed'; // [FIX-5]
};

// ═══════════════════════════════════════════════════════════
// DataProvider
// ═══════════════════════════════════════════════════════════

export const DataProvider = {

    /**
     * write() — Dual-write avec détection de panne réelle
     *
     * IMPORTANT : l'appelant DOIT injecter l'id dans payload avant d'appeler :
     *   const id = crypto.randomUUID();
     *   await DataProvider.write(
     *     () => supabase.from('posts').insert({ id, ...data }),
     *     { table: 'school_posts', payload: { id, ...data } }
     *   );
     */
    async write<T>(
        supabaseOp: () => Promise<{ data: T | null; error: unknown }>,
        d1Fallback: {
            table: string;
            payload: Record<string, unknown>; // DOIT contenir .id
            operation?: 'INSERT' | 'UPDATE' | 'DELETE';
        }
    ): Promise<WriteResult<T>> {
        const startMs = Date.now();

        // [FIX-3] Extraire recordId AVANT toute écriture
        const recordId = String(d1Fallback.payload.id ?? (() => {
            throw new Error(
                `[DataProvider] payload.id manquant pour table '${d1Fallback.table}'. ` +
                `Générez l'ID côté client avant d'appeler write().`
            );
        })());

        try {
            // [FIX-1] supabaseOp() soumis à un vrai timeout
            const result = await withSupabaseTimeout(
                () => supabaseOp(),
                SUPABASE_TIMEOUT_MS
            );

            if (result.error) throw result.error;
            if (result.data === null) throw new Error('Supabase returned null data');

            return { data: result.data, source: 'supabase', replay_pending: false };

        } catch (primaryError) {
            const elapsed = Date.now() - startMs;
            console.warn(`[DataProvider] Supabase DOWN (${elapsed}ms):`, primaryError);

            // Alerte admin avec double filet
            alertWithFallback({
                event: 'SUPABASE_WRITE_FAILED',
                table: d1Fallback.table,
                error: String(primaryError),
                failover: 'd1_active',
                elapsed_ms: elapsed,
            }).catch(() => {});

            // Écrire dans D1
            const d1Result = await writeToD1(d1Fallback.table, d1Fallback.payload);

            if (d1Result.error) {
                alertWithFallback({
                    event: 'BOTH_SERVICES_WRITE_FAILED',
                    table: d1Fallback.table,
                    error: `Supabase: ${primaryError} | D1: ${d1Result.error}`,
                    failover: 'none',
                }).catch(() => {});
                throw new Error('Service indisponible. Réessayez dans un instant.');
            }

            // [FIX-2+4] Enregistrer trace de replay (idempotent, avec alerte si échec)
            let replayPending = false;
            try {
                await registerPendingSync(
                    d1Fallback.table,
                    d1Fallback.operation ?? 'INSERT',
                    recordId,
                    d1Fallback.payload
                );
                replayPending = true;
            } catch {
                // registerPendingSync a déjà alerté l'admin
                // La donnée est dans D1 mais sans garantie de replay
                replayPending = false;
            }

            return {
                data: d1Result.data as T,
                source: 'd1',
                replay_pending: replayPending,
            };
        }
    },

    /**
     * read() — Lecture avec fallback D1 et distinction d1 sources
     */
    async read<T>(
        supabaseOp: () => Promise<{ data: T | null; error: unknown }>,
        d1Fallback: { table: string; params: Record<string, string> }
    ): Promise<ReadResult<T>> {
        try {
            const result = await withSupabaseTimeout(
                () => supabaseOp(),
                SUPABASE_TIMEOUT_MS
            );
            if (result.error) throw result.error;

            // data null = enregistrement inexistant (pas une panne)
            if (result.data === null) return { data: null, source: 'not_found' };
            return { data: result.data, source: 'supabase' };

        } catch (supabaseErr) {
            console.warn('[DataProvider] Supabase read failed, basculement D1:', supabaseErr);

            alertWithFallback({
                event: 'SUPABASE_READ_FAILED',
                table: d1Fallback.table,
                error: String(supabaseErr),
                failover: 'd1_active',
            }).catch(() => {});

            const d1Result = await readFromD1(d1Fallback.table, d1Fallback.params);

            if (d1Result.error) {
                // [FIX-5] Double échec explicitement distingué
                alertWithFallback({
                    event: 'BOTH_SERVICES_READ_FAILED',
                    table: d1Fallback.table,
                    error: `Supabase: ${supabaseErr} | D1: ${d1Result.error}`,
                    failover: 'none',
                }).catch(() => {});

                return { data: null, source: 'both_failed' };
            }

            return { data: d1Result.data as T, source: 'd1' };
        }
    },

    /**
     * healthCheck() — État réel des services
     */
    async healthCheck(): Promise<{
        supabase: boolean;
        d1: boolean;
        pending_syncs: number;
    }> {
        try {
            const res = await fetchWithTimeout(`${WORKER_URL}/health`, { method: 'GET' }, 5000);
            const json = await res.json() as {
                services: {
                    supabase: { status: string };
                    d1: { status: string };
                    pending_syncs: number;
                };
            };
            return {
                supabase: json.services.supabase.status === 'up',
                d1: json.services.d1.status === 'up',
                pending_syncs: json.services.pending_syncs ?? 0,
            };
        } catch {
            return { supabase: false, d1: false, pending_syncs: -1 };
        }
    },
};
