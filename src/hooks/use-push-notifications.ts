'use client';

import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ─── VAPID Public Key ───────────────────────────────────────────
// Remplace ci-dessous par ta vraie clé VAPID publique (depuis Cloudflare Worker ou web-push-keygen)
// Pour générer: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || '';

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
                console.warn('[Push] NEXT_PUBLIC_VAPID_KEY non définie — push désactivé');
                // Même sans VAPID, le SW est enregistré pour les notifications locales
                return;
            }

            const existingSub = await registration.pushManager.getSubscription();
            let subscription = existingSub;

            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
                });
            }

            // 4. Sauvegarder la subscription dans Supabase
            if (userId && orgId && subscription) {
                const subJson = subscription.toJSON();
                await supabase.from('push_subscriptions').upsert({
                    user_id: userId,
                    organization_id: orgId,
                    endpoint: subJson.endpoint,
                    auth: (subJson.keys as any)?.auth || '',
                    p256dh: (subJson.keys as any)?.p256dh || '',
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id,organization_id' });
            }

            console.log('[Push] ✅ Service Worker + push enregistrés');
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

    // Envoi de notification locale (sans serveur)
    const sendLocalNotification = useCallback((title: string, options?: NotificationOptions) => {
        if (!('serviceWorker' in navigator)) {
            // Fallback simple
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
