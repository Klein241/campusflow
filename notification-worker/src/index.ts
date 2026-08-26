/**
 * IZITEACH — UNIFIED NOTIFICATION & MCP WORKER
 * Modular architecture:
 *  - routes/notifications.ts  → Notification gateway & preferences
 *  - routes/domains.ts        → Custom domain automation (Netlify API)
 *  - services/ai.ts           → Cloudflare Workers AI (Meta M2M100 translations)
 *  - services/email.ts        → Dual email provider (Resend + Brevo) & Inscriptions
 *  - services/r2.ts           → Cloudflare R2 file storage
 *  - services/vapid.ts        → Web Push RFC 8291 encryption & direct push
 *  - services/d1.ts           → Cloudflare D1 failover & sync reconciliation
 *  - mcp/gateway.ts           → MCP Protocol gateway & RPC
 *  - mcp/tools.ts             → MCP D1 school management tools
 *  - cron.ts                  → Scheduled background tasks & heartbeats
 */

import { Env } from './types';
import { CORS_HEADERS, jsonResponse, handleCors } from './lib/cors';
import {
    handleNotify,
    handleGetCount,
    handleMarkRead,
    handleMarkAllRead,
    handleList,
    handleGetPreferences,
    handleUpdatePreferences,
    handlePushRegister,
    handlePushUnregister,
} from './routes/notifications';
import { handleVapidKey, handlePushSend } from './services/vapid';
import { handleDomainRegister, handleDomainRemove } from './routes/domains';
import {
    handleHealthWithD1,
    requireD1Auth,
    handleD1Write,
    handleD1Read,
    handleD1Delete,
    processOutbox,
    reconcilePendingSyncs,
    purgeSyncResolved,
} from './services/d1';
import { handleEmailSend, handleEmailStatus, handleInscription } from './services/email';
import { handleR2Upload, handleR2Delete, handleR2List, handleR2Serve } from './services/r2';
import { handleMcpGateway } from './mcp/gateway';
import { syncToSupabase } from './mcp/tools';
import { handleSkyAgentChat, handleSkyAgentClearSession } from './services/sky-agent';
import { handleCron, handleAgentWebhook } from './cron';

export * from './types';
export * from './lib/cors';
export * from './services/ai';
export * from './services/supabase';
export * from './services/messages';
export * from './services/vapid';
export * from './services/r2';
export * from './services/email';
export * from './services/d1';
export * from './mcp/tools';
export * from './mcp/gateway';
export * from './routes/notifications';
export * from './routes/domains';
export * from './cron';
export * from './services/sky-agent';

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        // CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        const { pathname } = new URL(request.url);
        const method = request.method;

        try {
            // ── Notification Gateway ──
            if (pathname === '/notify' && method === 'POST') return handleNotify(request, env, ctx);
            if (pathname === '/notify/count' && method === 'GET') return handleGetCount(request, env);
            if (pathname === '/notify/read' && method === 'PATCH') return handleMarkRead(request, env);
            if (pathname === '/notify/read-all' && method === 'PATCH') return handleMarkAllRead(request, env);
            if (pathname === '/notify/list' && method === 'GET') return handleList(request, env);

            // ── Preferences ──
            if (pathname === '/notify/preferences' && method === 'GET') return handleGetPreferences(request, env);
            if (pathname === '/notify/preferences' && method === 'PATCH') return handleUpdatePreferences(request, env);

            // ── Push Registration ──
            if (pathname === '/api/push/register' && method === 'POST') return handlePushRegister(request, env);
            if (pathname === '/api/push/unregister' && method === 'POST') return handlePushUnregister(request, env);
            if (pathname === '/api/push/vapid-key' && method === 'GET') return handleVapidKey(env);
            if (pathname === '/api/push/send' && method === 'POST') return handlePushSend(request, env);

            // ── Custom Domain Automation (Netlify) ──
            if (pathname === '/api/domain/register' && method === 'POST') return handleDomainRegister(request, env);
            if (pathname === '/api/domain/remove' && method === 'POST') return handleDomainRemove(request, env);

            // ── Health (inclut status D1) ──
            if (pathname === '/health' || pathname === '/api/status') return handleHealthWithD1(request, env);

            // ── D1 Failover API ──
            if (pathname.startsWith('/api/d1/')) {
                const authError = await requireD1Auth(request, env);
                if (authError) return authError;
                if (method === 'POST')   return handleD1Write(request, env, pathname);
                if (method === 'GET')    return handleD1Read(request, env, pathname);
                if (method === 'DELETE') return handleD1Delete(request, env, pathname);
            }

            // ── Email (Resend API) ──
            if (pathname === '/api/email/send'   && method === 'POST') return handleEmailSend(request, env);
            if (pathname === '/api/email/status'  && method === 'GET')  return handleEmailStatus(request, env);

            // ── MCP IziTeach — Cloudflare D1 Primary Edge Gateway ──
            if (pathname === '/mcp-gateway' || pathname === '/api/mcp' || pathname === '/api/mcp-gateway' || pathname === '/mcp' || pathname === '/sse') {
                return handleMcpGateway(request, env);
            }

            // ── Sky Agent — Assistant IA contextuel (admin / prof / student) ──
            if (pathname === '/api/sky-agent/chat' && method === 'POST') return handleSkyAgentChat(request, env);
            if (pathname === '/api/sky-agent/session' && method === 'DELETE') return handleSkyAgentClearSession(request, env);

            // ── Agent IA Webhook Trigger (Option A - Temps Réel < 1s) ──
            if ((pathname === '/api/agent/webhook' || pathname === '/agent-webhook' || pathname === '/api/agent-events') && method === 'POST') {
                return handleAgentWebhook(request, env);
            }

            // ── Inscription (bypass RLS) ──
            if (pathname === '/api/inscription' && method === 'POST') return handleInscription(request, env);

            // ── Marketing Email Tracking (Pixel 1x1 & Click Redirect) ──
            if (pathname.startsWith('/api/marketing/track-open/') || pathname.startsWith('/track-open/')) {
                const leadId = pathname.split('/').pop() || '';
                const now = new Date().toISOString();
                if (leadId) {
                    syncToSupabase(env, 'marketing_leads', 'UPDATE', { id: leadId, status: 'opened', opened_at: now });
                }
                const gifBuffer = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), c => c.charCodeAt(0));
                return new Response(gifBuffer, {
                    status: 200,
                    headers: {
                        'Content-Type': 'image/gif',
                        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                        ...CORS_HEADERS,
                    },
                });
            }

            if (pathname.startsWith('/api/marketing/track-click/') || pathname.startsWith('/track-click/')) {
                const leadId = pathname.split('/').pop() || '';
                const targetUrl = new URL(request.url).searchParams.get('url') || 'https://iziteach.com';
                const now = new Date().toISOString();
                if (leadId) {
                    syncToSupabase(env, 'marketing_leads', 'UPDATE', { id: leadId, status: 'clicked', clicked_at: now });
                }
                return Response.redirect(targetUrl, 302);
            }

            // ── R2 File Storage ──
            if (pathname === '/api/r2/upload' && method === 'POST') return handleR2Upload(request, env);
            if (pathname === '/api/r2/delete' && method === 'POST') return handleR2Delete(request, env);
            if (pathname === '/api/r2/list' && method === 'GET') return handleR2List(request, env);
            if (pathname.startsWith('/r2/') && method === 'GET') return handleR2Serve(request, env);

            return jsonResponse({
                error: 'Not found',
                routes: [
                    'POST   /notify                → send notification event',
                    'GET    /notify/count           → unread count (KV)',
                    'PATCH  /notify/read            → mark one read',
                    'PATCH  /notify/read-all        → mark all read',
                    'GET    /notify/list            → cursor-based list',
                    'GET    /notify/preferences     → get user preferences',
                    'PATCH  /notify/preferences     → update preferences',
                    'POST   /api/push/register      → register push token',
                    'GET    /api/push/vapid-key     → VAPID public key',
                    'POST   /api/push/send          → direct push',
                    'POST   /api/r2/upload          → upload file to R2',
                    'POST   /api/r2/delete          → delete file from R2',
                    'GET    /r2/*                   → serve R2 file',
                    'GET    /health                 → health check (+ D1 status)',
                    'POST   /api/d1/:table          → D1 upsert (failover write)',
                    'GET    /api/d1/:table          → D1 read (failover read)',
                    'DELETE /api/d1/:table          → D1 delete (failover delete)',
                ],
            }, 404);
        } catch (e: any) {
            return jsonResponse({ error: 'Internal server error' }, 500);
        }
    },

    // Cron trigger (toutes les heures : notifications + outbox sync)
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
        ctx.waitUntil(Promise.all([
            handleCron(env),
            processOutbox(env),
            reconcilePendingSyncs(env),   // [SPEC 3] replay D1→Supabase avec circuit breaker
            purgeSyncResolved(env),        // [SPEC 3] purge des resolved > 7 jours
        ]));
    },
};
