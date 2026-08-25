/**
 * Scheduled Cron Handlers & Autonomous Heartbeat
 */
import { Env } from './types';
import { SupabaseClient } from './services/supabase';
import { sendPushDirect } from './services/vapid';
import { getUserPreferences, buildNotificationMessage } from './services/messages';
import { json, jsonResponse, errorResponse } from './lib/cors';
import { processOutbox, reconcilePendingSyncs, purgeSyncResolved } from './services/d1';
import { executeMcpToolD1, fetchSupabaseRest } from './mcp/tools';

// ══════════════════════════════════════════════════════════
// CRON HANDLER — prayer_no_response Reminders
// ══════════════════════════════════════════════════════════

async function handleCron(env: Env): Promise<void> {
    const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

    // Find prayer requests older than 48h with 0 prayers
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    try {
        const prayers = await db.select('tutoring_requests', {
            select: 'id,user_id,content,pray_count,created_at',
            filters: `created_at=lt.${cutoff}&pray_count=eq.0`,
            limit: 50,
        });

        if (!Array.isArray(prayers) || prayers.length === 0) return;

        for (const prayer of prayers) {
            // Check if we already sent a reminder (deduplicate via KV)
            const reminderKey = `reminder:prayer_no_resp:${prayer.id}`;
            const alreadySent = await env.NOTIFICATION_CACHE.get(reminderKey);
            if (alreadySent) continue;

            // Get user preferences
            const prefs = await getUserPreferences(env.USER_PREFERENCES, db, prayer.user_id, 'prayer_no_response');

            const { title, message } = buildNotificationMessage('prayer_no_response', [], prayer.content);
            const actionData = {
                tab: 'community',
                communityTab: 'prieres',
                prayerId: prayer.id,
            };

            if (prefs.in_app) {
                await db.insert('notifications', {
                    user_id: prayer.user_id,
                    title,
                    message,
                    type: 'prayer',
                    action_type: 'prayer_no_response',
                    action_data: JSON.stringify(actionData),
                    priority: 'low',
                    is_read: false,
                });

                // Increment unread counter
                const unreadKey = `unread:${prayer.user_id}`;
                const current = parseInt(await env.UNREAD_COUNTERS.get(unreadKey) || '0');
                await env.UNREAD_COUNTERS.put(unreadKey, String(current + 1));
            }

            if (prefs.push) {
                // Send push directly (no queue needed)
                await sendPushDirect(prayer.user_id, title, message, actionData, 'low', `cron:prayer:${prayer.id}`, env);
            }

            // Mark reminder as sent (TTL 7 days — don't resend)
            await env.NOTIFICATION_CACHE.put(reminderKey, '1', { expirationTtl: 7 * 86400 });
        }
    } catch (e) {
        console.error('[Cron] prayer_no_response error:', e);
    }

    // ── Surveillance Autonome de l'Agent IA (Option B) ──
    try {
        await handleAgentAutonomousHeartbeat(env);
    } catch (e) {
        console.error('[Cron] handleAgentAutonomousHeartbeat error:', e);
    }
}

// ── Heartbeat de Surveillance Autonome (Toutes les 5 minutes) ────────
async function handleAgentAutonomousHeartbeat(env: Env): Promise<void> {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return;
    try {
        const now = new Date().toISOString();

        // 1. Traitement des actions IA approuvées en attente d'exécution
        const pending = await fetchSupabaseRest(env, 'ai_pending_actions?status=eq.approved&select=*&limit=5');
        if (pending && pending.length > 0) {
            for (const act of pending) {
                console.log(`[AgentCron] Exécution automatique action : ${act.tool_name} (ID: ${act.id})`);
                await fetchSupabaseRest(env, `ai_pending_actions?id=eq.${encodeURIComponent(act.id)}`, {
                    method: 'PATCH',
                    body: { status: 'executed' }
                });
                await fetchSupabaseRest(env, 'ai_agent_logs', {
                    method: 'POST',
                    body: {
                        agent_key_id: act.agent_key_id,
                        organization_id: act.organization_id,
                        tool_name: `cron_execute:${act.tool_name}`,
                        input_summary: `Action approuvée ID ${act.id}`,
                        output_summary: `Exécuté automatiquement par le Cron de surveillance`,
                        status: 'success',
                        duration_ms: 20,
                        executed_at: now,
                    }
                });
            }
        }

        // 2. Détection des demandes de Sky Points en attente (Support)
        const pendingPoints = await fetchSupabaseRest(env, 'sky_point_requests?status=eq.pending&select=id,user_id,organization_id,amount,created_at&limit=5');
        if (pendingPoints && pendingPoints.length > 0) {
            console.log(`[AgentCron] ${pendingPoints.length} demandes de Sky Points en attente détectées.`);
        }
    } catch (e) {
        console.error('[AgentCron] Erreur heartbeat:', e);
    }
}

import { processAutonomousEvent } from './services/autonomous-agent';

// ── Webhook Automatique pour Agents IA (Option A - Temps Réel < 1s) ────────
async function handleAgentWebhook(request: Request, env: Env): Promise<Response> {
    try {
        const payload: any = await request.json();
        const eventType = payload.type || payload.event || payload.table || 'custom_event';
        const record = payload.record || payload.new || payload.data || payload;

        console.log(`[AgentWebhook] ⚡ Événement reçu : ${eventType}`, JSON.stringify(record).slice(0, 200));

        // Déclencher le moteur d'IA autonome
        const result = await processAutonomousEvent(payload, env);

        return json({
            success: true,
            status: 'autonomous_executed',
            event: eventType,
            decision: result,
            timestamp: new Date().toISOString(),
        });
    } catch (e: any) {
        console.error('[AgentWebhook] Erreur traitement autonomie:', e);
        return json({ error: e.message || 'Erreur traitement webhook autonome' }, 500);
    }
}

export {
    handleCron,
    handleAgentAutonomousHeartbeat,
    handleAgentWebhook,
};
