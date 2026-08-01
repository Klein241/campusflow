'use client';

import { useEffect, useCallback } from 'react';

// ─── Config ──────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_VAPID_KEY ||
    '';

const WORKER_URL =
    process.env.NEXT_PUBLIC_NOTIFICATION_WORKER_URL ||
    process.env.NEXT_PUBLIC_WORKER_URL ||
    '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
}

interface UsePushNotificationsOptions {
    userId?: string;
    orgId?: string;
    enabled?: boolean;
}

export function usePushNotifications({ userId, orgId, enabled = true }: UsePushNotificationsOptions = {}) {

    const registerServiceWorker = useCallback(async () => {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator)) return;
        if (!('PushManager' in window)) return;

        try {
            // 1. Enregistrer le Service Worker
            const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            await navigator.serviceWorker.ready;

            // 2. Demander la permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.log('[Push] Permission refusée');
                return;
            }

            // 3. S'abonner aux push (si VAPID key disponible)
            if (!VAPID_PUBLIC_KEY) {
                console.warn('[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY non définie — push web désactivé, notifications locales actives');
                return;
            }

            const existingSub = await registration.pushManager.getSubscription();
            let subscription = existingSub;

            if (!subscription) {
                const keyArray = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: keyArray.buffer as ArrayBuffer,
                });
            }

            if (!subscription) return;
            const subJson = subscription.toJSON();

            // 4a. Envoyer au Worker Cloudflare KV (source principale de vérité)
            if (WORKER_URL && userId) {
                try {
                    const res = await fetch(`${WORKER_URL}/api/push/register`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId,
                            subscription: { endpoint: subJson.endpoint, keys: subJson.keys },
                            organizationId: orgId,
                        }),
                    });
                    if (!res.ok) console.warn('[Push] Worker register failed:', res.status);
                } catch (e) {
                    console.warn('[Push] Worker register error:', e);
                }
            }

            // 4b. Fallback persistant — Supabase push_tokens (même table que le Worker lit)
            if (userId) {
                try {
                    const { supabase } = await import('@/lib/supabase');
                    await supabase.from('push_tokens').upsert({
                        user_id: userId,
                        subscription_json: JSON.stringify({ endpoint: subJson.endpoint, keys: subJson.keys }),
                        platform: 'web',
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'user_id' });
                } catch {
                    // Non-critique — le Worker KV reste la source principale
                }
            }

            console.log('[Push] ✅ Service Worker + push enregistrés (Worker KV + Supabase)');
        } catch (err) {
            console.warn('[Push] Erreur enregistrement:', err);
        }
    }, [userId, orgId]);

    useEffect(() => {
        if (!enabled) return;
        // Délai court pour laisser le temps au DOM de se charger
        const timer = setTimeout(registerServiceWorker, 2000);
        return () => clearTimeout(timer);
    }, [enabled, registerServiceWorker]);

    // Envoi de notification locale (sans serveur, via SW)
    const sendLocalNotification = useCallback((title: string, options?: NotificationOptions) => {
        if (!('serviceWorker' in navigator)) {
            if (Notification.permission === 'granted') {
                new Notification(title, { icon: '/icon-192.png', ...options });
            }
            return;
        }
        navigator.serviceWorker.ready.then(reg => {
            reg.active?.postMessage({
                type: 'SHOW_NOTIFICATION',
                title,
                body: options?.body || '',
                tag: options?.tag || `local_${Date.now()}`,
                url: (options?.data as any)?.url || '/',
            });
        });
    }, []);

    return { sendLocalNotification };
}
