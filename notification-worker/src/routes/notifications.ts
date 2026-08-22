/**
 * Notification Routes (/notify, /read, /read-all, /count, /list, /preferences, /push-register)
 */
import { Env, NotifyPayload, AggregationEntry, NotificationActionType } from '../types';
import { json, jsonResponse, errorResponse, getUserId } from '../lib/cors';
import { SupabaseClient } from '../services/supabase';
import {
    buildNotificationMessage,
    buildActionData,
    buildAggregationKey,
    checkRateLimit,
    recordRateLimit,
    getUserPreferences,
    checkPushDedup,
    PRIORITY_MAP,
    AGGREGATION_WINDOWS,
    DEFAULT_PREFERENCES,
} from '../services/messages';
import { sendPushDirect } from '../services/vapid';

// ══════════════════════════════════════════════════════════
// HANDLER: POST /notify
// ══════════════════════════════════════════════════════════

async function handleNotify(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
        const payload: NotifyPayload = await request.json();
        const { action_type, actor_id, actor_name, actor_avatar, extra_data } = payload;

        if (!action_type || !actor_id || !actor_name) {
            return json({ error: 'action_type, actor_id, actor_name required' }, 400);
        }

        const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

    const recipientIds = payload.recipient_ids || (payload.recipient_id ? [payload.recipient_id] : []);

    if (recipientIds.length === 0) {
        return json({ error: 'recipient_id or recipient_ids required' }, 400);
    }

    const results: any[] = [];

    // Process each recipient
    for (const recipientId of recipientIds) {
        // Skip self-notifications
        if (recipientId === actor_id) continue;

        try {
            // 1. Check user preferences
            const prefs = await getUserPreferences(env.USER_PREFERENCES, db, recipientId, action_type);

            if (!prefs.in_app && !prefs.push) {
                results.push({ userId: recipientId, skipped: true, reason: 'preferences' });
                continue;
            }

            // 2. Check aggregation
            const aggKey = buildAggregationKey(recipientId, action_type, payload.target_id, actor_id);
            const window = AGGREGATION_WINDOWS[action_type];

            let isAggregated = false;
            let existingEntry: AggregationEntry | null = null;

            if (aggKey && window) {
                const cached = await env.NOTIFICATION_CACHE.get(aggKey, 'json') as AggregationEntry | null;
                if (cached && (Date.now() - cached.first_at) < window * 1000) {
                    existingEntry = cached;
                    isAggregated = true;
                }
            }

            // 3. Build message
            const actors = isAggregated && existingEntry
                ? [...existingEntry.actors, { id: actor_id, name: actor_name, avatar: actor_avatar }]
                : [{ id: actor_id, name: actor_name, avatar: actor_avatar }];

            // Deduplicate actors
            const uniqueActors = actors.filter((a, i, arr) => arr.findIndex(b => b.id === a.id) === i);
            const totalCount = isAggregated && existingEntry ? existingEntry.count + 1 : 1;

            const { title, message } = buildNotificationMessage(
                action_type,
                uniqueActors,
                payload.target_name,
                totalCount,
                payload.message_preview,
            );

            const actionData = buildActionData(action_type, payload);
            const priority = PRIORITY_MAP[action_type] || 'medium';

            // 4. Insert or update in Supabase
            // ⚠️ ANTI-DOUBLON : Le client (notifications.ts) a déjà inséré directement.
            // Le Worker fait un UPSERT : si la notif existe déjà (même user_id + action_type + fenêtre 30s),
            // on met à jour les actors/count au lieu de créer un doublon.
            if (prefs.in_app) {
                if (isAggregated && existingEntry?.notification_id) {
                    // Update existing aggregated notification
                    await db.update('notifications', {
                        title,
                        message,
                        body: message,
                        actors: JSON.stringify(uniqueActors.slice(0, 5)),
                        actor_count: totalCount,
                        aggregation_key: aggKey,
                        is_read: false,
                        updated_at: new Date().toISOString(),
                    }, `id=eq.${existingEntry.notification_id}`);
                } else {
                    const orgId = extra_data?.orgId || extra_data?.organization_id || extra_data?.organizationId || null;

                    // Vérifier si le client a déjà inséré cette notif dans les 30 dernières secondes
                    // (évite les doublons client-insert + worker-insert)
                    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
                    let inserted: any = null;
                    try {
                        const existing = await db.select('notifications', {
                            filters: `user_id=eq.${recipientId}&action_type=eq.${action_type}&created_at=gte.${thirtySecondsAgo}`,
                            limit: 1,
                        });
                        const existingNotif = Array.isArray(existing) ? existing[0] : null;

                        if (existingNotif) {
                            // La notif existe déjà (insérée par le client) → UPDATE uniquement
                            inserted = [existingNotif];
                            if (uniqueActors.length > 1 || totalCount > 1) {
                                await db.update('notifications', {
                                    actors: JSON.stringify(uniqueActors.slice(0, 5)),
                                    actor_count: totalCount,
                                    updated_at: new Date().toISOString(),
                                }, `id=eq.${existingNotif.id}`);
                            }
                        } else {
                            // Pas encore insérée → INSERT
                            inserted = await db.insert('notifications', {
                                user_id: recipientId,
                                organization_id: orgId,
                                title,
                                message,
                                body: message,
                                type: mapActionTypeToLegacyType(action_type),
                                action_type,
                                action_data: JSON.stringify(actionData),
                                actors: JSON.stringify(uniqueActors.slice(0, 5)),
                                actor_count: totalCount,
                                aggregation_key: aggKey,
                                priority,
                                is_read: false,
                            });
                        }
                    } catch (insertErr: any) {
                        console.warn('[Worker] INSERT/CHECK failed:', insertErr.message);
                        try {
                            inserted = await db.insert('notifications', {
                                user_id: recipientId,
                                organization_id: orgId,
                                title,
                                body: message,
                                is_read: false,
                            });
                        } catch (minimalErr: any) {
                            console.error('[Worker] Minimal INSERT also failed:', minimalErr.message);
                        }
                    }


                    // Update aggregation cache
                    if (aggKey && window) {
                        const newEntry: AggregationEntry = {
                            actors: uniqueActors.slice(0, 10),
                            count: totalCount,
                            first_at: existingEntry?.first_at || Date.now(),
                            notification_id: Array.isArray(inserted) ? inserted[0]?.id : undefined,
                        };
                        await env.NOTIFICATION_CACHE.put(aggKey, JSON.stringify(newEntry), { expirationTtl: window });
                    }

                    // 5. Increment unread counter
                    const unreadKey = `unread:${recipientId}`;
                    const current = parseInt(await env.UNREAD_COUNTERS.get(unreadKey) || '0');
                    await env.UNREAD_COUNTERS.put(unreadKey, String(current + 1));
                }
            }

            // 6. Enqueue push notification
            if (prefs.push) {
                const rateCheck = await checkRateLimit(env.NOTIFICATION_CACHE, recipientId, env);
                if (rateCheck.allowed) {
                    const dedupKey = aggKey || `${recipientId}:${action_type}:${payload.target_id}:${Date.now()}`;
                    const isDuplicate = await checkPushDedup(env.NOTIFICATION_CACHE, recipientId, dedupKey);

                    if (!isDuplicate) {
                        // Send push directly (no queue needed)
                        ctx.waitUntil(sendPushDirect(recipientId, title, message, actionData, priority, dedupKey, env));
                        await recordRateLimit(env.NOTIFICATION_CACHE, recipientId);
                    }
                }
            }

            results.push({ userId: recipientId, ok: true, aggregated: isAggregated });
        } catch (e: any) {
            results.push({ userId: recipientId, ok: false, error: e.message });
        }
    }

    return json({ success: true, results });
    } catch (e: any) {
        return json({ error: e?.message || String(e), stack: e?.stack }, 500);
    }
}


function mapActionTypeToLegacyType(actionType: NotificationActionType): string {
    switch (actionType) {
        case 'prayer_prayed':
        case 'friend_prayed':
        case 'new_prayer_published':
        case 'prayer_comment':
        case 'prayer_no_response':
        case 'support_received':
        case 'friend_supported':
        case 'new_support_published':
        case 'support_comment':
        case 'support_no_response':
            return 'support';
        case 'dm_new_message':
        case 'group_new_message':
        case 'group_mention':
            return 'message';
        case 'group_access_approved':
        case 'payment_confirmed':
            return 'success';
        case 'friend_request_received':
        case 'friend_request_accepted':
            return 'friend_request';
        case 'grade_published':
        case 'evaluation_scheduled':
        case 'evaluation_reminder':
            return 'school';
        case 'discipline_sanction':
            return 'warning';
        case 'admin_announcement':
        case 'timetable_change':
            return 'announcement';
        case 'new_book_published':
            return 'info';
        default:
            return 'info';
    }
}

// ══════════════════════════════════════════════════════════
// HANDLER: GET /notify/count
// ══════════════════════════════════════════════════════════

async function handleGetCount(request: Request, env: Env): Promise<Response> {
    const userId = getUserId(request);
    if (!userId) return json({ error: 'X-User-Id header required' }, 401);

    const unreadKey = `unread:${userId}`;
    const count = parseInt(await env.UNREAD_COUNTERS.get(unreadKey) || '0');

    return json({ unread_count: count });
}

// ══════════════════════════════════════════════════════════
// HANDLER: PATCH /notify/read
// ══════════════════════════════════════════════════════════

async function handleMarkRead(request: Request, env: Env): Promise<Response> {
    const userId = getUserId(request);
    if (!userId) return json({ error: 'X-User-Id header required' }, 401);

    // Accept both { notification_id } and { notificationId } and { all: true }
    const body = await request.json() as { notification_id?: string; notificationId?: string; all?: boolean };

    // Handle mark-all-as-read via this endpoint (frontend compatibility)
    if (body.all === true) {
        const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
        await db.update('notifications', { is_read: true }, `user_id=eq.${userId}&is_read=eq.false`);
        await env.UNREAD_COUNTERS.put(`unread:${userId}`, '0');
        return json({ success: true });
    }

    const notifId = body.notification_id || body.notificationId;
    if (!notifId) return json({ error: 'notification_id or notificationId required' }, 400);

    const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

    // Mark as read in Supabase
    await db.update('notifications', { is_read: true }, `id=eq.${notifId}&user_id=eq.${userId}`);

    // Decrement KV counter
    const unreadKey = `unread:${userId}`;
    const current = parseInt(await env.UNREAD_COUNTERS.get(unreadKey) || '0');
    await env.UNREAD_COUNTERS.put(unreadKey, String(Math.max(0, current - 1)));

    return json({ success: true });
}

// ══════════════════════════════════════════════════════════
// HANDLER: PATCH /notify/read-all
// ══════════════════════════════════════════════════════════

async function handleMarkAllRead(request: Request, env: Env): Promise<Response> {
    const userId = getUserId(request);
    if (!userId) return json({ error: 'X-User-Id header required' }, 401);

    const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

    // Mark all as read in Supabase
    await db.update('notifications', { is_read: true }, `user_id=eq.${userId}&is_read=eq.false`);

    // Reset KV counter
    await env.UNREAD_COUNTERS.put(`unread:${userId}`, '0');

    return json({ success: true });
}

// ══════════════════════════════════════════════════════════
// HANDLER: GET /notify/list
// ══════════════════════════════════════════════════════════

async function handleList(request: Request, env: Env): Promise<Response> {
    const userId = getUserId(request);
    if (!userId) return json({ error: 'X-User-Id header required' }, 401);

    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor'); // ISO timestamp
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
    const filter = url.searchParams.get('filter'); // 'unread' | 'all'

    const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

    let filters = `user_id=eq.${userId}`;
    if (cursor) {
        filters += `&created_at=lt.${cursor}`;
    }
    if (filter === 'unread') {
        filters += '&is_read=eq.false';
    }

    const notifications = await db.select('notifications', {
        select: 'id,title,message,type,action_type,action_data,actors,actor_count,is_read,created_at,priority,aggregation_key',
        filters,
        order: 'created_at.desc',
        limit: limit + 1, // Fetch one extra to check if there's more
    });

    const items = Array.isArray(notifications) ? notifications : [];
    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? page[page.length - 1]?.created_at : null;

    return json({
        notifications: page,
        next_cursor: nextCursor,
        has_more: hasMore,
    });
}

// ══════════════════════════════════════════════════════════
// HANDLER: User Preferences
// ══════════════════════════════════════════════════════════

async function handleGetPreferences(request: Request, env: Env): Promise<Response> {
    const userId = getUserId(request);
    if (!userId) return json({ error: 'X-User-Id header required' }, 401);

    const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

    const prefs = await db.select('notification_preferences', {
        select: 'action_type,in_app,push_enabled',
        filters: `user_id=eq.${userId}`,
    });

    // Merge with defaults
    const merged: Record<string, any> = {};
    for (const [key, defaults] of Object.entries(DEFAULT_PREFERENCES)) {
        merged[key] = { in_app: defaults.in_app, push: defaults.push };
    }

    if (Array.isArray(prefs)) {
        for (const p of prefs) {
            merged[p.action_type] = { in_app: p.in_app, push: p.push_enabled };
        }
    }

    return json({ preferences: merged });
}

async function handleUpdatePreferences(request: Request, env: Env): Promise<Response> {
    const userId = getUserId(request);
    if (!userId) return json({ error: 'X-User-Id header required' }, 401);

    const { preferences } = await request.json() as {
        preferences: Record<string, { in_app?: boolean; push?: boolean }>;
    };

    const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

    for (const [actionType, pref] of Object.entries(preferences)) {
        // Upsert each preference
        await db.query('notification_preferences', {
            method: 'POST',
            body: {
                user_id: userId,
                action_type: actionType,
                in_app: pref.in_app ?? true,
                push_enabled: pref.push ?? true,
            },
            prefer: 'resolution=merge-duplicates,return=minimal',
        });
    }

    // Invalidate KV cache
    await env.USER_PREFERENCES.delete(`prefs:${userId}`);

    return json({ success: true });
}

// ══════════════════════════════════════════════════════════
// HANDLER: Push token registration
// ══════════════════════════════════════════════════════════

async function handlePushRegister(request: Request, env: Env): Promise<Response> {
    const { userId, subscription, userRole, organizationId, orgSlug } = await request.json() as {
        userId: string;
        subscription: any;
        userRole?: string;
        organizationId?: string;
        orgSlug?: string;
    };
    if (!userId || !subscription) return json({ error: 'userId and subscription required' }, 400);

    const fullPayload = {
        subscription,
        userRole,
        organizationId,
        orgSlug,
        updated_at: Date.now(),
    };

    // Store in KV with 30 days TTL (2592000s) — Never lose push subscriptions!
    await env.PUSH_TOKEN_CACHE.put(`push:${userId}`, JSON.stringify(fullPayload), {
        expirationTtl: 30 * 86400,
    });

    // Also store in Supabase for persistence
    const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
    try {
        await db.query('push_tokens', {
            method: 'POST',
            body: {
                user_id: userId,
                subscription_json: JSON.stringify(subscription),
                platform: 'web',
                updated_at: new Date().toISOString(),
            },
            prefer: 'resolution=merge-duplicates,return=minimal',
        });
    } catch (e) {
        // Non-critical: KV is the primary store
    }

    return json({ success: true });
}


// ══════════════════════════════════════════════════════════
// HEALTH & ANALYTICS
// ══════════════════════════════════════════════════════════

function handleHealth(env: Env): Response {
    return json({
        status: 'ok',
        service: 'campusflow-notification-worker',
        version: '3.0.0',
        vapid_configured: !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
        supabase_configured: !!env.SUPABASE_URL,
        r2_configured: !!env.LIBRARY_BUCKET,
        features: [
            'aggregation',
            'kv-counters',
            'direct-push',
            'cron-reminders',
            'cursor-pagination',
            'user-preferences',
            'rate-limiting',
            'r2-storage',
            'school-notifications',
        ],
    });
}


// ══════════════════════════════════════════════════════════
// PUSH UNREGISTER HANDLER
// ══════════════════════════════════════════════════════════

async function handlePushUnregister(request: Request, env: Env): Promise<Response> {
    const { userId, endpoint } = await request.json() as { userId: string; endpoint?: string };
    if (!userId) return json({ error: 'userId required' }, 400);

    // Remove from KV
    await env.PUSH_TOKEN_CACHE.delete(`push:${userId}`);

    // Remove from Supabase
    const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
    try {
        await db.query('push_tokens', { method: 'DELETE', filters: `user_id=eq.${userId}` });
    } catch (e) { /* non-critical */ }

    return json({ success: true });
}

// ══════════════════════════════════════════════════════════

export {
    handleNotify,
    handleGetCount,
    handleMarkRead,
    handleMarkAllRead,
    handleList,
    handleGetPreferences,
    handleUpdatePreferences,
    handlePushRegister,
    handlePushUnregister,
    handleHealth,
};
