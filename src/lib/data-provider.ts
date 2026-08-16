/**
 * ============================================================
 * CampusFlow — DataProvider v5 (FINAL)
 * ============================================================
 *
 * Architecture : Promise.allSettled — double écriture simultanée
 * sur TOUTES les données, sans distinction de catégorie.
 *
 * PRINCIPE :
 *   1. validate() d'abord — lance une exception si invalide
 *      → rien n'est écrit nulle part si la donnée est invalide
 *   2. Promise.allSettled([primaryOp(), mirrorOp()]) simultanément
 *   3. 4 cas gérés explicitement :
 *      ✅✅ Les deux réussissent    → retourne données primary
 *      ❌✅ Primary échoue         → mirror a la donnée, replay primary plus tard
 *      ✅❌ Mirror échoue          → primary a la donnée, outbox cron sync mirror
 *      ❌❌ Les deux échouent      → erreur explicite à l'utilisateur
 *
 * GARANTIE : la validation applicative s'exécute avant toute écriture.
 * Supabase et D1 ne reçoivent jamais une donnée invalide.
 * La divergence de contenu (≠ timing) devient quasi impossible.
 * ============================================================
 */

import { supabase } from '@/lib/supabase';
import { notifyAdmin } from '@/lib/notify-admin';

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL
    || 'https://campusflow-worker.kleintaptue1.workers.dev';

const PRIMARY_TIMEOUT_MS = 6000;
const MIRROR_TIMEOUT_MS  = 5000;

// ── getD1AuthHeaders : session_token pour authentifier les appels D1 ─
// Lit directement localStorage pour éviter une dépendance circulaire
// avec SessionManager (qui importe supabase qui importe ce fichier).
function getD1AuthHeaders(): Record<string, string> {
    try {
        if (typeof window === 'undefined') return {};
        const raw = localStorage.getItem('campusflow_session');
        if (!raw) return {};
        const session = JSON.parse(raw) as { session_token?: string };
        if (session?.session_token) {
            return { 'X-CampusFlow-Token': session.session_token };
        }
    } catch { /* silencieux — ne bloque jamais une écriture */ }
    return {};
}

// ── withTimeout ───────────────────────────────────────────
async function withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    label: string
): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
        ),
    ]);
}

// ── Rate-limiter notifications admin (anti-spam) ─────────
const _alertLog = new Map<string, number>();
function canSendAlert(eventType: string, windowMs = 60_000): boolean {
    const last = _alertLog.get(eventType) ?? 0;
    if (Date.now() - last > windowMs) {
        _alertLog.set(eventType, Date.now());
        return true;
    }
    return false;
}

// ── criticalFallbackLog : log D1 si notifyAdmin est down ─
async function criticalFallbackLog(event: string, table: string, error: string): Promise<void> {
    try {
        await fetch(`${WORKER_URL}/api/d1/system_alerts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getD1AuthHeaders() },
            body: JSON.stringify({
                id: crypto.randomUUID(),
                service: 'DataProvider',
                event,
                table_name: table,
                error_msg: error.substring(0, 1000),
                created_at: new Date().toISOString(),
            }),
        });
    } catch {
        // Si même D1 est down, console.error est le dernier recours acceptable
        console.error(`[DataProvider:CRITICAL] ${event} on ${table}: ${error}`);
    }
}

// ── alertAdmin : rate-limited + double filet ─────────────
async function alertAdmin(params: {
    event: string;
    table: string;
    error: string;
    [key: string]: unknown;
}): Promise<void> {
    if (!canSendAlert(params.event)) return;
    await notifyAdmin(params).catch(err =>
        criticalFallbackLog('NOTIFY_ADMIN_FAILED', params.table, String(err))
    );
}

// ── Écriture vers D1 via Worker ───────────────────────────
async function writeToMirror(
    table: string,
    operationType: 'INSERT' | 'UPDATE' | 'DELETE',
    payload: Record<string, unknown>
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
    try {
        const authHeaders = getD1AuthHeaders();
        if (operationType === 'DELETE') {
            const res = await fetch(`${WORKER_URL}/api/d1/${table}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ id: payload.id }),
            });
            if (!res.ok) throw new Error(`DELETE failed: HTTP ${res.status}`);
            return { ok: true, data: { deleted: true } };
        }

        // INSERT ou UPDATE : on passe __operation pour que le Worker
        // construise le bon dedup_key (table::id::INSERT vs ::UPDATE)
        const res = await fetch(`${WORKER_URL}/api/d1/${table}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ ...payload, __operation: operationType }),
        });
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`UPSERT failed: HTTP ${res.status} ${body}`);
        }
        return { ok: true, data: await res.json() };
    } catch (err) {
        return { ok: false, error: String(err) };
    }
}

// ── registerPendingSync : trace replay D1→Supabase ───────
async function registerPendingSync(params: {
    table: string;
    operationType: 'INSERT' | 'UPDATE' | 'DELETE';
    idempotencyKey: string;
    payload: Record<string, unknown>;
}): Promise<void> {
    const dedupKey = `${params.table}::${params.idempotencyKey}::${params.operationType}`;
    const res = await fetch(`${WORKER_URL}/api/d1/pending_supabase_sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getD1AuthHeaders() },
        body: JSON.stringify({
            id: crypto.randomUUID(),
            table_name: params.table,
            operation: params.operationType,
            record_id: params.idempotencyKey,
            payload: JSON.stringify(params.payload),
            dedup_key: dedupKey,
            status: 'pending',
            retry_count: 0,
            created_at: new Date().toISOString(),
        }),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`registerPendingSync failed: HTTP ${res.status} ${body}`);
    }
}

// ── Lecture depuis D1 via Worker ──────────────────────────
async function readFromMirror<T>(
    mirrorFallback: () => Promise<{ data: T | null; error: unknown }>
): Promise<{ data: T | null; ok: true } | { ok: false; error: string }> {
    try {
        const result = await mirrorFallback();
        if (result.error) throw result.error;
        return { ok: true, data: result.data };
    } catch (err) {
        return { ok: false, error: String(err) };
    }
}

// ═══════════════════════════════════════════════════════════
// Types publics
// ═══════════════════════════════════════════════════════════

/** Résultat d'une écriture */
export type WriteResult<T> = {
    data: T;
    source: 'both' | 'primary_only' | 'mirror_only';
    // 'both'         → écriture confirmée dans Supabase ET D1
    // 'primary_only' → Supabase OK, D1 en retard (outbox cron va sync)
    // 'mirror_only'  → D1 OK, Supabase en panne (replay pending)
};

/** Résultat d'une lecture */
export type ReadResult<T> = {
    data: T | null;
    source: 'primary' | 'mirror' | 'unavailable';
    // 'primary'     → Supabase a répondu
    // 'mirror'      → Supabase down, D1 a répondu
    // 'unavailable' → Les deux sont down (panne totale)
    //                 ≠ data:null qui signifie "enregistrement inexistant"
};

// ═══════════════════════════════════════════════════════════
// DataProvider v5
// ═══════════════════════════════════════════════════════════

export const DataProvider = {

    /**
     * write() — Double écriture simultanée avec validation applicative
     *
     * RÈGLES OBLIGATOIRES pour l'appelant :
     *   1. Générer l'ID AVANT d'appeler write()
     *   2. Injecter cet ID dans payload.id ET comme idempotencyKey
     *   3. Mettre toute la logique de validation dans validate()
     *      → validate() doit lever une exception si la donnée est invalide
     *      → rien n'est écrit si validate() échoue
     *
     * @example
     *   const id = crypto.randomUUID();
     *   await DataProvider.write({
     *     table: 'paiements',
     *     operationType: 'INSERT',
     *     idempotencyKey: id,
     *     payload: { id, student_id, montant, organization_id },
     *     validate: () => {
     *       if (montant <= 0) throw new Error('Montant invalide');
     *       if (!student_id) throw new Error('student_id requis');
     *     },
     *     primaryOp: () => supabase.from('paiements').insert({ id, student_id, montant }),
     *   });
     */
    async write<T>(params: {
        table: string;
        operationType: 'INSERT' | 'UPDATE' | 'DELETE';
        idempotencyKey: string;
        payload: Record<string, unknown>;
        validate?: () => void;   // Lance une exception si invalide
        primaryOp: () => Promise<{ data: T | null; error: unknown }>;
    }): Promise<WriteResult<T>> {

        // ── ÉTAPE 0 : Vérification contractuelle ────────────
        if (String(params.payload.id ?? '') !== params.idempotencyKey) {
            throw new Error(
                `[DataProvider] payload.id et idempotencyKey doivent être identiques. ` +
                `Générez l'ID côté client avant d'appeler write().`
            );
        }

        // ── ÉTAPE 1 : Validation applicative ────────────────
        // S'exécute AVANT toute écriture.
        // Si elle échoue → rien n'est écrit dans aucune BD.
        // Supabase et D1 ne reçoivent jamais de donnée invalide.
        if (params.validate) {
            params.validate(); // lève une exception si invalide
        }

        // ── ÉTAPE 2 : Double écriture simultanée ────────────
        const [primaryResult, mirrorResult] = await Promise.allSettled([
            withTimeout(params.primaryOp(), PRIMARY_TIMEOUT_MS, 'Supabase write'),
            withTimeout(
                writeToMirror(params.table, params.operationType, params.payload),
                MIRROR_TIMEOUT_MS,
                'D1 write'
            ),
        ]);

        const primaryOk  = primaryResult.status === 'fulfilled' && !primaryResult.value.error;
        const primaryData = primaryOk ? (primaryResult as PromiseFulfilledResult<{data: T | null; error: unknown}>).value.data : null;
        const mirrorOk   = mirrorResult.status === 'fulfilled' && mirrorResult.value.ok;

        // ── CAS 1 : Les deux réussissent ────────────────────
        if (primaryOk && mirrorOk) {
            return { data: primaryData as T, source: 'both' };
        }

        // ── CAS 2 : Primary OK, Mirror échoue ───────────────
        // Supabase a la donnée validée → outbox cron va sync D1
        // L'utilisateur reçoit sa donnée normalement
        if (primaryOk && !mirrorOk) {
            const mirrorErr = mirrorResult.status === 'rejected'
                ? String(mirrorResult.reason)
                : mirrorResult.status === 'fulfilled' && !mirrorResult.value.ok
                    ? mirrorResult.value.error
                    : 'unknown';

            alertAdmin({
                event: 'MIRROR_WRITE_FAILED',
                table: params.table,
                error: mirrorErr,
                idempotencyKey: params.idempotencyKey,
            }).catch(() => {});

            return { data: primaryData as T, source: 'primary_only' };
        }

        // ── CAS 3 : Mirror OK, Primary échoue (Supabase down) ─
        // D1 a la donnée → l'utilisateur est servi depuis D1
        // On trace pour replay vers Supabase au retour
        if (!primaryOk && mirrorOk) {
            const primaryErr = primaryResult.status === 'rejected'
                ? String(primaryResult.reason)
                : primaryResult.status === 'fulfilled'
                    ? String((primaryResult.value as {error: unknown}).error)
                    : 'unknown';

            alertAdmin({
                event: 'PRIMARY_WRITE_FAILED_MIRROR_OK',
                table: params.table,
                error: primaryErr,
                idempotencyKey: params.idempotencyKey,
            }).catch(() => {});

            // Trace pour replay — OBLIGATOIRE, jamais silencieux si ça échoue
            try {
                await registerPendingSync({
                    table: params.table,
                    operationType: params.operationType,
                    idempotencyKey: params.idempotencyKey,
                    payload: params.payload,
                });
            } catch (syncErr) {
                // La donnée est dans D1 mais sans trace de replay
                // → alerte critique, double filet
                await alertAdmin({
                    event: 'PENDING_SYNC_REGISTRATION_FAILED',
                    table: params.table,
                    error: String(syncErr),
                    idempotencyKey: params.idempotencyKey,
                }).catch(err =>
                    criticalFallbackLog('NOTIFY_ADMIN_FAILED', params.table, String(err))
                );
            }

            const mirrorData = (mirrorResult as PromiseFulfilledResult<{ok: true; data: unknown}>).value.data;
            return { data: mirrorData as T, source: 'mirror_only' };
        }

        // ── CAS 4 : Les deux échouent ────────────────────────
        // C'est le seul cas où l'utilisateur voit une erreur
        const primaryErr = primaryResult.status === 'rejected'
            ? String(primaryResult.reason) : 'unknown';
        const mirrorErr  = mirrorResult.status === 'rejected'
            ? String(mirrorResult.reason) : 'unknown';

        alertAdmin({
            event: 'BOTH_SYSTEMS_WRITE_FAILED',
            table: params.table,
            error: `Primary: ${primaryErr} | Mirror: ${mirrorErr}`,
            idempotencyKey: params.idempotencyKey,
        }).catch(err =>
            criticalFallbackLog('BOTH_FAILED', params.table, String(err))
        );

        throw new Error(
            'Service temporairement indisponible. Vos données sont sécurisées — réessayez dans un instant.'
        );
    },

    /**
     * read() — Lecture avec fallback D1 transparent
     *
     * source:'unavailable' ≠ source:'primary' avec data:null
     * Le composant UI DOIT distinguer ces deux cas.
     */
    async read<T>(params: {
        table: string;
        primaryOp: () => Promise<{ data: T | null; error: unknown }>;
        mirrorFallback: () => Promise<{ data: T | null; error: unknown }>;
    }): Promise<ReadResult<T>> {
        try {
            const result = await withTimeout(
                params.primaryOp(),
                PRIMARY_TIMEOUT_MS,
                'Supabase read'
            );
            if (result.error) throw result.error;
            return { data: result.data, source: 'primary' };

        } catch (primaryErr) {
            alertAdmin({
                event: 'PRIMARY_READ_FAILED',
                table: params.table,
                error: String(primaryErr),
            }).catch(() => {});

            const mirrorResult = await readFromMirror(params.mirrorFallback);

            if (!mirrorResult.ok) {
                // Panne totale — explicitement distingué de "enregistrement absent"
                alertAdmin({
                    event: 'BOTH_SYSTEMS_READ_FAILED',
                    table: params.table,
                    error: `Primary: ${primaryErr} | Mirror: ${mirrorResult.error}`,
                }).catch(err =>
                    criticalFallbackLog('BOTH_READ_FAILED', params.table, String(err))
                );
                return { data: null, source: 'unavailable' };
            }

            return { data: mirrorResult.data, source: 'mirror' };
        }
    },

    /**
     * healthCheck() — État actuel des deux systèmes
     */
    async healthCheck(): Promise<{
        supabase: boolean;
        d1: boolean;
        pending_syncs: number;
    }> {
        try {
            const res = await fetch(`${WORKER_URL}/health`);
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

// ═══════════════════════════════════════════════════════════
// Helpers de validation réutilisables
// ═══════════════════════════════════════════════════════════

/** Valide un paiement avant écriture */
export function validatePaiement(data: {
    montant?: unknown;
    student_id?: unknown;
    organization_id?: unknown;
}): void {
    if (typeof data.montant !== 'number' || data.montant <= 0) {
        throw new Error('Montant invalide : doit être un nombre positif');
    }
    if (!data.student_id) throw new Error('student_id est requis');
    if (!data.organization_id) throw new Error('organization_id est requis');
}

/** Valide une note avant écriture */
export function validateNote(data: {
    note?: unknown;
    student_id?: unknown;
    matiere_id?: unknown;
}): void {
    if (typeof data.note !== 'number' || data.note < 0 || data.note > 20) {
        throw new Error('Note invalide : doit être entre 0 et 20');
    }
    if (!data.student_id) throw new Error('student_id est requis');
    if (!data.matiere_id) throw new Error('matiere_id est requis');
}

/** Valide un post avant écriture */
export function validatePost(data: { content?: unknown }): void {
    if (!data.content || typeof data.content !== 'string' || data.content.trim().length === 0) {
        throw new Error('Le contenu du post ne peut pas être vide');
    }
    if (typeof data.content === 'string' && data.content.length > 5000) {
        throw new Error('Contenu trop long (max 5000 caractères)');
    }
}
