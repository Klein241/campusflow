/**
 * notify-admin.ts
 * Envoie une alerte au superadmin quand un service tombe.
 * Utilise le Worker existant (push notifications) + log Supabase.
 */

import { supabase } from '@/lib/supabase';

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL
    || 'https://campusflow-worker.kleintaptue1.workers.dev';

// Profile ID du superadmin (a setter dans .env)
const SUPERADMIN_ID = process.env.NEXT_PUBLIC_SUPERADMIN_ID || '';

export type AlertEventType =
    | 'SUPABASE_WRITE_FAILED'
    | 'SUPABASE_READ_FAILED'
    | 'BOTH_SERVICES_FAILED'
    | 'D1_SYNC_FAILED'
    | 'SUPABASE_RESTORED'
    | 'MIRROR_WRITE_FAILED'
    | 'PRIMARY_WRITE_FAILED_MIRROR_OK'
    | 'PENDING_SYNC_REGISTRATION_FAILED'
    | 'BOTH_SYSTEMS_WRITE_FAILED'
    | 'PRIMARY_READ_FAILED'
    | 'BOTH_SYSTEMS_READ_FAILED'
    | string;

export interface AlertPayload {
    event: AlertEventType;
    table?: string;
    error?: string;
    failover?: 'd1_active' | 'supabase_active' | 'none';
    idempotencyKey?: string;
    [key: string]: unknown;
}

const EVENT_MESSAGES: Record<string, { title: string; body: (p: AlertPayload) => string }> = {
    SUPABASE_WRITE_FAILED: {
        title: '🔴 Supabase inaccessible',
        body: (p) => `Ecriture echouee (${p.table}). Cloudflare D1 a pris le relais automatiquement.`,
    },
    MIRROR_WRITE_FAILED: {
        title: '🟠 Ecriture miroir D1 echouee',
        body: (p) => `Ecriture D1 echouee (${p.table}). Supabase a la donnee. Synchronisation outbox prevue.`,
    },
    PRIMARY_WRITE_FAILED_MIRROR_OK: {
        title: '🟡 Supabase en echec, D1 securise',
        body: (p) => `Ecriture Supabase echouee (${p.table}). Cloudflare D1 a enregistre la donnee. Rejeu planifie.`,
    },
    PENDING_SYNC_REGISTRATION_FAILED: {
        title: '🟠 Enregistrement sync echoue',
        body: (p) => `Impossible d enregistrer la synchronisation pending (${p.table}).`,
    },
    BOTH_SYSTEMS_WRITE_FAILED: {
        title: '🆘 CRITIQUE - Ecriture echouee sur les 2 systemes',
        body: (p) => `Supabase ET Cloudflare D1 ont echoue (${p.table}). Erreur: ${p.error}`,
    },
    PRIMARY_READ_FAILED: {
        title: '🟡 Lecture Supabase echouee, bascule D1',
        body: (p) => `Lecture primaire echouee (${p.table}). Lecture D1 activee avec succes.`,
    },
    BOTH_SYSTEMS_READ_FAILED: {
        title: '🆘 CRITIQUE - Lecture echouee partout',
        body: (p) => `Impossible de lire les donnees (${p.table}) sur Supabase et D1.`,
    },
    SUPABASE_READ_FAILED: {
        title: '🟡 Lecture Supabase echouee',
        body: (p) => `Lecture echouee (${p.table}). Fallback D1 actif.`,
    },
    BOTH_SERVICES_FAILED: {
        title: '🆘 CRITIQUE - Les deux services sont DOWN',
        body: (p) => `Supabase ET Cloudflare D1 sont inaccessibles (${p.table}).`,
    },
    D1_SYNC_FAILED: {
        title: '🟠 Sync D1 echouee',
        body: (p) => `La synchronisation outbox vers D1 a echoue (${p.table}).`,
    },
    SUPABASE_RESTORED: {
        title: '✅ Supabase retabli',
        body: () => 'Supabase est de nouveau accessible.',
    },
};

// Deduplication simple : ne pas envoyer 2 alertes identiques en moins de 5 min
const alertCache = new Map<string, number>();
const DEDUP_MS = 5 * 60 * 1000;

export async function notifyAdmin(payload: AlertPayload): Promise<void> {
    const cacheKey = `${payload.event}:${payload.table || ''}`;
    const now = Date.now();
    const lastSent = alertCache.get(cacheKey) || 0;
    if (now - lastSent < DEDUP_MS) return; // dedup
    alertCache.set(cacheKey, now);

    const msg = EVENT_MESSAGES[payload.event] || {
        title: `⚠️ Alerte systeme: ${payload.event}`,
        body: (p: AlertPayload) => `Evenement sur table ${p.table || 'inconnue'}: ${p.error || ''}`,
    };
    const title = msg.title;
    const body = msg.body(payload);

    // 1. Push notification au superadmin
    if (SUPERADMIN_ID) {
        try {
            await fetch(`${WORKER_URL}/notify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action_type: 'general',
                    actor_id: 'system',
                    actor_name: 'CampusFlow System',
                    recipient_id: SUPERADMIN_ID,
                    target_name: title,
                    message_preview: body,
                    extra_data: { event: payload.event, table: payload.table, error: payload.error },
                }),
            });
        } catch { /* silencieux - on ne bloque pas pour une alerte */ }
    }

    // 2. Log dans system_health (best effort - peut echouer si Supabase est down)
    try {
        await supabase.from('system_health').insert({
            service: payload.failover === 'd1_active' ? 'supabase' : 'd1',
            status: payload.event === 'SUPABASE_RESTORED' ? 'up' : 'down',
            error_msg: payload.error?.substring(0, 500),
            notified: true,
        });
    } catch { /* Supabase peut etre down - c est ok */ }

    // 3. Log console (visible dans Netlify functions logs)
    console.error(`[SYSTEM ALERT] ${title} | ${body}`, {
        event: payload.event,
        table: payload.table,
        error: payload.error,
        failover: payload.failover,
        timestamp: new Date().toISOString(),
    });
}
