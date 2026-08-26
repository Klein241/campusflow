/**
 * Cloudflare D1 Failover, Outbox Processor & Sync Reconciliation
 */
import { Env } from '../types';
import { json, jsonResponse, errorResponse } from '../lib/cors';
import { SupabaseClient } from './supabase';

// ══════════════════════════════════════════════════════════
// D1 FAILOVER HANDLERS
// ══════════════════════════════════════════════════════════

// Tables autorisees pour l'API D1 (whitelist securite - miroir COMPLET 95 tables)
const D1_ALLOWED_TABLES = new Set([
    // Auth & Core
    'organizations', 'student_profiles', 'teacher_profiles', 'profiles',
    'session_tokens', 'pin_attempts', 'platform_admins',
    // University
    'filieres', 'promotions', 'enrollments', 'matieres', 'notes',
    'timetable', 'presences', 'paiements',
    // School
    'classrooms', 'subjects', 'disciplines', 'evaluations', 'grades',
    'school_payments', 'timetable_slots', 'attendance', 'rooms',
    'inscription_requests',
    // Social & Posts
    'school_posts', 'stories', 'post_comments', 'story_comments',
    'tutoring_requests', 'experience_feedbacks',
    // Chat & Messages
    'chat_conversations', 'chat_participants', 'chat_messages',
    'direct_messages', 'message_reactions', 'message_threads',
    // Study Groups
    'study_groups', 'study_group_members', 'study_group_join_requests',
    'study_group_messages',
    // Forum & Shop
    'forum_threads', 'forum_replies', 'shop_products', 'shop_orders',
    // Cursus & Learning
    'teacher_curricula', 'subject_programs', 'chapters', 'lessons',
    'exercises', 'exercise_submissions', 'lesson_progress', 'grade_disputes',
    'lesson_video_views', 'lesson_reader_notes',
    // Exams
    'exam_papers', 'exam_sessions', 'exam_participants',
    'exam_permission_requests',
    // Forms
    'forms', 'form_fields', 'form_responses', 'form_answers',
    // Sky & Gamification
    'sky_transactions', 'sky_points', 'sky_points_history',
    'sky_point_packs', 'sky_point_requests',
    // Library
    'library_items', 'library_favorites', 'library_reading_history',
    'library_ads',
    // Marketplace
    'marketplace_products', 'marketplace_orders', 'marketplace_favorites',
    // Notifications & Push
    'notifications', 'notification_preferences', 'notification_queue',
    'push_subscriptions', 'push_tokens',
    'admin_notifications', 'organization_announcements',
    // Livestream & Media
    'livestream_comments', 'livestream_reactions',
    'advertisements', 'ad_views',
    // Progress & Resources
    'student_progress', 'day_resources', 'day_views',
    // Queues & Logs
    'whatsapp_queue', 'cursus_push_log',
    // Settings
    'app_settings', 'platform_settings',
    // System
    'system_alerts', 'pending_supabase_sync',
    // AI Agents & MCP IziTeach
    'ai_agent_keys', 'ai_agent_logs', 'ai_pending_actions', 'ai_permission_catalog',
    'bug_reports', 'announcements', 'superadmin_announcements',
]);

function getTableFromPath(pathname: string): string | null {
    const parts = pathname.split('/');
    const table = parts[parts.length - 1];
    return D1_ALLOWED_TABLES.has(table) ? table : null;
}

/**
 * Vérifie que la requête contient un session_token CampusFlow valide.
 * Le token est lu depuis l'en-tête X-CampusFlow-Token et vérifié
 * contre la table D1 locale session_tokens (miroir de Supabase).
 * Fonctionne en mode failover (Supabase down) car D1 est local.
 * Retourne null si l'auth est OK, ou une Response HTTP 401 sinon.
 */
async function requireD1Auth(
    request: Request,
    env: Env
): Promise<Response | null> {
    const token = request.headers.get('X-CampusFlow-Token');
    if (!token || token.length < 32) {
        return json({ error: 'Unauthorized — missing or invalid session token' }, 401);
    }
    try {
        const row = await env.CAMPUSFLOW_DB
            .prepare('SELECT expires_at FROM session_tokens WHERE token = ?1 LIMIT 1')
            .bind(token)
            .first<{ expires_at: string }>();
        if (!row) return json({ error: 'Unauthorized — session not found' }, 401);
        if (new Date(row.expires_at).getTime() < Date.now()) {
            return json({ error: 'Unauthorized — session expired' }, 401);
        }
    } catch {
        // Si la table session_tokens n'existe pas encore dans D1
        // (premier déploiement ou base vide), on laisse passer
        // pour ne pas bloquer le failover. Ce cas est temporaire.
        return null;
    }
    return null; // Token valide → continuer
}

/** POST /api/d1/:table — Upsert idempotent dans D1 */
async function handleD1Write(request: Request, env: Env, pathname: string): Promise<Response> {
    const table = getTableFromPath(pathname);
    if (!table) return json({ error: 'Table not allowed' }, 403);

    const rawBody = await request.json() as Record<string, unknown>;
    if (!rawBody || !rawBody.id) return json({ error: 'Missing id field — generate ID client-side before calling write()' }, 400);

    const operation = (rawBody.__operation as string === 'UPDATE') ? 'UPDATE' : 'INSERT';
    const body: Record<string, unknown> = { ...rawBody };
    delete body.__operation;

    try {
        const cols = Object.keys(body);
        const placeholders = cols.map((_, i) => `?${i + 1}`).join(', ');
        const values = Object.values(body).map(v =>
            Array.isArray(v) || (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v
        );

        // INSERT OR REPLACE : idiome SQLite universel pour l'idempotence.
        // Fonctionne même si la table n'a pas de UNIQUE INDEX explicite —
        // contrairement à ON CONFLICT(id) qui exige une contrainte déclarée.
        await env.CAMPUSFLOW_DB.prepare(
            `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`
        ).bind(...values).run();

        // Trace pour replay D1 → Supabase
        const dedupKey = `${table}::${body.id}::${operation}`;
        try {
            await env.CAMPUSFLOW_DB.prepare(
                `INSERT INTO pending_supabase_sync
                   (id, table_name, operation, record_id, payload, dedup_key, status, retry_count, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', 0, ?7)
                 ON CONFLICT(dedup_key) DO UPDATE SET
                   payload = excluded.payload,
                   status = 'pending',
                   retry_count = 0,
                   last_error = NULL`
            ).bind(
                crypto.randomUUID(), table, operation,
                String(body.id), JSON.stringify(body), dedupKey,
                new Date().toISOString()
            ).run();
        } catch (syncErr: any) {
            // Si l'index dedup_key n'existe pas encore : fallback sans ON CONFLICT
            if (syncErr.message?.includes('no such index') || syncErr.message?.includes('does not match')) {
                await env.CAMPUSFLOW_DB.prepare(
                    `INSERT OR IGNORE INTO pending_supabase_sync
                       (id, table_name, operation, record_id, payload, status, retry_count, created_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, 'pending', 0, ?6)`
                ).bind(
                    crypto.randomUUID(), table, operation,
                    String(body.id), JSON.stringify(body),
                    new Date().toISOString()
                ).run();
            }
            // Écriture principale réussie : ne pas bloquer l'utilisateur pour un échec de trace
            console.warn('[handleD1Write] pending_supabase_sync trace failed:', syncErr.message);
        }

        return json({ ok: true, table, id: body.id });
    } catch (err: any) {
        return json({ error: err.message }, 500);
    }
}

/** GET /api/d1/:table — Lecture depuis D1 */
async function handleD1Read(request: Request, env: Env, pathname: string): Promise<Response> {
    const table = getTableFromPath(pathname);
    if (!table) return json({ error: 'Table not allowed' }, 403);

    const url = new URL(request.url);
    const orgId = url.searchParams.get('organization_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    try {
        let stmt;
        if (orgId) {
            stmt = env.CAMPUSFLOW_DB.prepare(
                `SELECT * FROM ${table} WHERE organization_id = ?1 ORDER BY created_at DESC LIMIT ?2 OFFSET ?3`
            ).bind(orgId, limit, offset);
        } else {
            stmt = env.CAMPUSFLOW_DB.prepare(
                `SELECT * FROM ${table} ORDER BY created_at DESC LIMIT ?1 OFFSET ?2`
            ).bind(limit, offset);
        }
        const { results } = await stmt.all();
        return json(results);
    } catch (err: any) {
        return json({ error: err.message }, 500);
    }
}

/** DELETE /api/d1/:table — Suppression + trace pour replay vers Supabase */
async function handleD1Delete(request: Request, env: Env, pathname: string): Promise<Response> {
    const table = getTableFromPath(pathname);
    if (!table) return json({ error: 'Table not allowed' }, 403);

    const body = await request.json() as { id: string };
    if (!body?.id) return json({ error: 'Missing id' }, 400);

    try {
        await env.CAMPUSFLOW_DB.prepare(
            `DELETE FROM ${table} WHERE id = ?1`
        ).bind(body.id).run();

        // Trace DELETE pour replay vers Supabase
        const dedupKey = `${table}::${body.id}::DELETE`;
        try {
            await env.CAMPUSFLOW_DB.prepare(
                `INSERT INTO pending_supabase_sync
                   (id, table_name, operation, record_id, payload, dedup_key, status, retry_count, created_at)
                 VALUES (?1, ?2, 'DELETE', ?3, ?4, ?5, 'pending', 0, ?6)
                 ON CONFLICT(dedup_key) DO UPDATE SET
                   status = 'pending',
                   retry_count = 0,
                   last_error = NULL`
            ).bind(
                crypto.randomUUID(), table, body.id,
                JSON.stringify({ id: body.id }), dedupKey,
                new Date().toISOString()
            ).run();
        } catch (syncErr: any) {
            if (syncErr.message?.includes('no such index') || syncErr.message?.includes('does not match')) {
                await env.CAMPUSFLOW_DB.prepare(
                    `INSERT OR IGNORE INTO pending_supabase_sync
                       (id, table_name, operation, record_id, payload, status, retry_count, created_at)
                     VALUES (?1, ?2, 'DELETE', ?3, ?4, 'pending', 0, ?5)`
                ).bind(
                    crypto.randomUUID(), table, body.id,
                    JSON.stringify({ id: body.id }),
                    new Date().toISOString()
                ).run();
            }
            console.warn('[handleD1Delete] pending trace failed:', syncErr.message);
        }

        return json({ ok: true });
    } catch (err: any) {
        return json({ error: err.message }, 500);
    }
}

/** GET /health — Health check etendu avec status D1 */
async function handleHealthWithD1(request: Request, env: Env): Promise<Response> {
    const start = Date.now();
    const results: Record<string, unknown> = {};

    // Test Supabase
    try {
        const res = await fetch(`${env.SUPABASE_URL}/rest/v1/organizations?select=id&limit=1`, {
            headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` },
            signal: AbortSignal.timeout(5000),
        });
        results.supabase = { status: res.ok ? 'up' : 'degraded', latency_ms: Date.now() - start };
    } catch {
        results.supabase = { status: 'down', latency_ms: Date.now() - start };
    }

    // Test D1
    const d1Start = Date.now();
    try {
        await env.CAMPUSFLOW_DB.prepare('SELECT 1').run();
        results.d1 = { status: 'up', latency_ms: Date.now() - d1Start };
    } catch {
        results.d1 = { status: 'down', latency_ms: Date.now() - d1Start };
    }

    // Pending syncs en attente
    try {
        const { results: pending } = await env.CAMPUSFLOW_DB.prepare(
            'SELECT COUNT(*) as count FROM pending_supabase_sync WHERE synced_at IS NULL'
        ).all();
        results.pending_syncs = (pending[0] as any)?.count ?? 0;
    } catch { results.pending_syncs = 'unknown'; }

    return json({ ok: true, timestamp: new Date().toISOString(), services: results });
}

// ══════════════════════════════════════════════════════════
// OUTBOX PROCESSOR (cron)
// Lit sync_outbox depuis Supabase et pousse vers D1
// ══════════════════════════════════════════════════════════

async function processOutbox(env: Env): Promise<void> {
    const supabaseUrl = env.SUPABASE_URL?.replace(/\/$/, '');
    if (!supabaseUrl || !env.SUPABASE_SERVICE_KEY) return;

    try {
        // 1. Lire les entrees non syncees (batch de 100 max)
        const res = await fetch(
            `${supabaseUrl}/rest/v1/sync_outbox?synced_at=is.null&order=created_at.asc&limit=100`,
            { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` } }
        );
        if (!res.ok) return;

        const entries = await res.json() as Array<{
            id: string; table_name: string; operation: string;
            record_id: string; payload: Record<string, unknown>; retry_count: number;
        }>;

        if (!entries.length) return;

        const successIds: string[] = [];
        const failedIds: { id: string; error: string }[] = [];

        // 2. Upsert chaque entree dans D1
        for (const entry of entries) {
            if (!D1_ALLOWED_TABLES.has(entry.table_name)) {
                successIds.push(entry.id); // ignorer les tables non mirrorees
                continue;
            }
            try {
                const payload = entry.payload;
                if (entry.operation === 'DELETE') {
                    await env.CAMPUSFLOW_DB.prepare(
                        `DELETE FROM ${entry.table_name} WHERE id = ?1`
                    ).bind(String(entry.record_id)).run();
                } else {
                    const cols = Object.keys(payload);
                    const placeholders = cols.map((_, i) => `?${i + 1}`).join(', ');
                    const values = cols.map(c => {
                        const v = payload[c];
                        return Array.isArray(v) || (typeof v === 'object' && v !== null)
                            ? JSON.stringify(v) : v;
                    });
                    // INSERT OR REPLACE : universel SQLite, pas besoin de UNIQUE INDEX explicite
                    await env.CAMPUSFLOW_DB.prepare(
                        `INSERT OR REPLACE INTO ${entry.table_name} (${cols.join(', ')}) VALUES (${placeholders})`
                    ).bind(...values).run();
                }
                successIds.push(entry.id);
            } catch (err: any) {
                failedIds.push({ id: entry.id, error: err.message });
            }
        }

        // 3. Marquer les entrees syncees dans Supabase
        if (successIds.length) {
            await fetch(`${supabaseUrl}/rest/v1/sync_outbox`, {
                method: 'PATCH',
                headers: {
                    apikey: env.SUPABASE_SERVICE_KEY,
                    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal',
                },
                body: JSON.stringify({ synced_at: new Date().toISOString() }),
                // Note: filtrage par IDs via query param
            });
            // Requete avec filtre
            const idList = successIds.map(id => `"${id}"`).join(',');
            await fetch(`${supabaseUrl}/rest/v1/sync_outbox?id=in.(${idList})`, {
                method: 'PATCH',
                headers: {
                    apikey: env.SUPABASE_SERVICE_KEY,
                    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ synced_at: new Date().toISOString() }),
            });
        }

        // 4. Incrementer retry_count pour les echecs
        for (const fail of failedIds) {
            await fetch(`${supabaseUrl}/rest/v1/sync_outbox?id=eq.${fail.id}`, {
                method: 'PATCH',
                headers: {
                    apikey: env.SUPABASE_SERVICE_KEY,
                    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    retry_count: entries.find(e => e.id === fail.id)!.retry_count + 1,
                    last_error: fail.error.substring(0, 500),
                }),
            });
        }

        // TODO: replay pending_supabase_sync entries when Supabase is back online

        console.log(`[Outbox] Processed: ${successIds.length} OK, ${failedIds.length} failed`);
    } catch (err: any) {
        console.error('[Outbox] processOutbox error:', err.message);
    }
}

// ══════════════════════════════════════════════════════════
// [SPEC 3] RÉCONCILIATION D1 → SUPABASE avec Circuit Breaker
// ══════════════════════════════════════════════════════════

// Circuit breaker : N health-checks positifs consécutifs requis avant replay massif
const CIRCUIT_BREAKER_THRESHOLD = 3;
const MAX_RETRY_COUNT = 5;
const RECONCILE_BATCH = 50;

// Rate-limiter admin notifications (anti-spam) : 1 alerte/type/minute max
const adminAlertTimestamps: Map<string, number> = new Map();
function shouldSendAdminAlert(eventType: string, windowMs = 60_000): boolean {
    const last = adminAlertTimestamps.get(eventType) ?? 0;
    if (Date.now() - last > windowMs) {
        adminAlertTimestamps.set(eventType, Date.now());
        return true;
    }
    return false;
}

/** [SPEC 3] Worker de réconciliation : rejoue D1→Supabase avec circuit breaker */
async function reconcilePendingSyncs(env: Env): Promise<void> {
    const supabaseUrl = env.SUPABASE_URL?.replace(/\/$/, '');
    if (!supabaseUrl || !env.SUPABASE_SERVICE_KEY) return;

    try {
        // [SPEC 3 circuit breaker] : compter les health-checks positifs consécutifs en KV
        const cbKey = 'circuit_breaker_ok_count';
        const cbRaw = await env.NOTIFICATION_CACHE.get(cbKey);
        const cbCount = parseInt(cbRaw ?? '0');

        // Vérifier si Supabase est UP maintenant
        let supabaseUp = false;
        try {
            const hc = await fetch(
                `${supabaseUrl}/rest/v1/organizations?select=id&limit=1`,
                { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` },
                  signal: AbortSignal.timeout(4000) }
            );
            supabaseUp = hc.ok;
        } catch { supabaseUp = false; }

        if (!supabaseUp) {
            // Reset circuit breaker
            await env.NOTIFICATION_CACHE.put(cbKey, '0', { expirationTtl: 3600 });
            return;
        }

        // Incrémenter le compteur de succès consécutifs
        const newCount = cbCount + 1;
        await env.NOTIFICATION_CACHE.put(cbKey, String(newCount), { expirationTtl: 3600 });

        // Attendre N succès consécutifs avant de déclencher le replay (anti-flapping)
        if (newCount < CIRCUIT_BREAKER_THRESHOLD) {
            console.log(`[CircuitBreaker] Supabase UP ${newCount}/${CIRCUIT_BREAKER_THRESHOLD} — replay en attente`);
            return;
        }

        // [SPEC 3] Lire le batch de pending à rejouer
        const { results: pending } = await env.CAMPUSFLOW_DB.prepare(
            `SELECT * FROM pending_supabase_sync
             WHERE synced_at IS NULL AND retry_count < ?1 AND status != 'abandoned'
             ORDER BY created_at ASC LIMIT ?2`
        ).bind(MAX_RETRY_COUNT, RECONCILE_BATCH).all() as {
            results: Array<{
                id: string; table_name: string; operation: string;
                record_id: string; payload: string; retry_count: number;
            }>
        };

        if (!pending.length) {
            // Tout est synced — reset circuit breaker
            await env.NOTIFICATION_CACHE.put(cbKey, '0', { expirationTtl: 3600 });
            return;
        }

        console.log(`[Reconcile] Replay ${pending.length} entrées vers Supabase`);
        let successCount = 0;

        for (const row of pending) {
            try {
                const payload = JSON.parse(row.payload);

                // [SPEC 3 + SPEC 2.3] UPSERT vers Supabase — jamais INSERT brut
                const method = row.operation === 'DELETE' ? 'DELETE' : 'POST';
                const prefer = row.operation === 'DELETE'
                    ? 'return=minimal'
                    : 'resolution=merge-duplicates,return=minimal';

                const url = row.operation === 'DELETE'
                    ? `${supabaseUrl}/rest/v1/${row.table_name}?id=eq.${row.record_id}`
                    : `${supabaseUrl}/rest/v1/${row.table_name}`;

                const res = await fetch(url, {
                    method,
                    headers: {
                        apikey: env.SUPABASE_SERVICE_KEY,
                        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': prefer,
                    },
                    body: method !== 'DELETE' ? JSON.stringify(payload) : undefined,
                    signal: AbortSignal.timeout(5000),
                });

                if (res.ok || res.status === 409) {
                    await env.CAMPUSFLOW_DB.prepare(
                        `UPDATE pending_supabase_sync
                         SET synced_at = ?1, status = 'resolved'
                         WHERE id = ?2`
                    ).bind(new Date().toISOString(), row.id).run();
                    successCount++;
                } else {
                    const errText = await res.text().catch(() => `HTTP ${res.status}`);
                    const newRetry = row.retry_count + 1;
                    const status = newRetry >= MAX_RETRY_COUNT ? 'abandoned' : 'retrying';
                    await env.CAMPUSFLOW_DB.prepare(
                        `UPDATE pending_supabase_sync
                         SET retry_count = ?1, last_tried = ?2, status = ?3, last_error = ?4
                         WHERE id = ?5`
                    ).bind(newRetry, new Date().toISOString(), status, errText.substring(0, 500), row.id).run();

                    // [SPEC 3] Alerte abandon après max retries (rate-limited)
                    if (status === 'abandoned' && shouldSendAdminAlert(`SYNC_ABANDONED_${row.table_name}`)) {
                        await fetch(`${supabaseUrl}/functions/v1/admin-alert`, {
                            method: 'POST',
                            headers: {
                                Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                event: 'SYNC_ABANDONED',
                                table: row.table_name,
                                record_id: row.record_id,
                                error: errText,
                                retry_count: newRetry,
                            }),
                        }).catch(() => {
                            // Log persistant D1 si l'alerte échoue
                            env.CAMPUSFLOW_DB.prepare(
                                `INSERT INTO system_alerts(id, service, event, table_name, error_msg, created_at)
                                 VALUES(?1,'Worker','SYNC_ABANDONED',?2,?3,?4)`
                            ).bind(crypto.randomUUID(), row.table_name, errText, new Date().toISOString()).run();
                        });
                    }
                }
            } catch (err: any) {
                const newRetry = row.retry_count + 1;
                await env.CAMPUSFLOW_DB.prepare(
                    `UPDATE pending_supabase_sync
                     SET retry_count = ?1, last_tried = ?2, status = ?3, last_error = ?4
                     WHERE id = ?5`
                ).bind(newRetry, new Date().toISOString(),
                    newRetry >= MAX_RETRY_COUNT ? 'abandoned' : 'retrying',
                    err.message.substring(0, 500), row.id).run();
            }
        }

        console.log(`[Reconcile] ${successCount}/${pending.length} synced vers Supabase`);

    } catch (err: any) {
        console.error('[reconcilePendingSyncs] Erreur critique:', err.message);
    }
}

/** [SPEC 3] Purge des entrées resolved de plus de 7 jours */
async function purgeSyncResolved(env: Env): Promise<void> {
    try {
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const result = await env.CAMPUSFLOW_DB.prepare(
            `DELETE FROM pending_supabase_sync
             WHERE status = 'resolved' AND synced_at < ?1`
        ).bind(cutoff).run();
        if ((result.meta?.changes ?? 0) > 0) {
            console.log(`[Purge] ${result.meta?.changes} entrées resolved supprimées`);
        }
    } catch (err: any) {
        console.error('[purgeSyncResolved] Erreur:', err.message);
    }
}


export {
    getTableFromPath,
    requireD1Auth,
    handleD1Write,
    handleD1Read,
    handleD1Delete,
    handleHealthWithD1,
    processOutbox,
    reconcilePendingSyncs,
    purgeSyncResolved,
    shouldSendAdminAlert,
};
