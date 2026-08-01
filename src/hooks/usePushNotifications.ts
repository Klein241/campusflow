'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * ═══════════════════════════════════════════════════════════
 * usePushNotifications — Manage push subscription state
 * ═══════════════════════════════════════════════════════════
 *
 * Handles:
 * - Checking browser support & permission status
 * - Registering the Service Worker
 * - Subscribing/unsubscribing to Web Push (VAPID)
 * - Registering the subscription with the Cloudflare Worker
 *
 * Unlike use-notifications.ts (which handles in-app notification
 * list/count), this hook manages the PUSH SUBSCRIPTION itself.
 */

const WORKER_URL = process.env.NEXT_PUBLIC_NOTIFICATION_WORKER_URL
    || process.env.NEXT_PUBLIC_WORKER_URL
    || '';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

// Convert VAPID base64 key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

interface UsePushOptions {
    userId: string;
    userRole?: 'admin' | 'teacher' | 'student';
    organizationId?: string;
    orgSlug?: string;
}

interface UsePushReturn {
    /** Browser Notification.permission state */
    permission: NotificationPermission | 'unsupported';
    /** Whether the user has an active push subscription */
    isSubscribed: boolean;
    /** Loading state for subscribe/unsubscribe operations */
    isLoading: boolean;
    /** Error message if any */
    error: string | null;
    /** Whether push is supported on this browser */
    isSupported: boolean;
    /** Subscribe to push notifications */
    subscribe: () => Promise<boolean>;
    /** Unsubscribe from push notifications */
    unsubscribe: () => Promise<boolean>;
}

export function usePushNotifications({
    userId,
    userRole,
    organizationId,
    orgSlug,
}: UsePushOptions): UsePushReturn {
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(false);

    // Check initial state
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const supported = 'Notification' in window
            && 'serviceWorker' in navigator
            && 'PushManager' in window;

        setIsSupported(supported);

        if (!supported) {
            setPermission('unsupported');
            return;
        }

        setPermission(Notification.permission);

        // Check if already subscribed
        navigator.serviceWorker.ready.then((reg) => {
            reg.pushManager.getSubscription().then((sub) => {
                setIsSubscribed(!!sub);
            });
        }).catch(() => {
            // Service worker not ready yet
        });
    }, []);

    // Subscribe to push notifications
    const subscribe = useCallback(async (): Promise<boolean> => {
        if (!isSupported) {
            setError('Notifications push non supportées sur ce navigateur');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            // 1. Request permission
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm !== 'granted') {
                setError('Permission de notification refusée');
                setIsLoading(false);
                return false;
            }

            // 2. Register/get Service Worker
            const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            await navigator.serviceWorker.ready;

            // 3. Si pas de VAPID key, on s'arrête ici — les notifications locales fonctionnent quand même
            if (!VAPID_PUBLIC_KEY) {
                console.warn('[Push] Pas de VAPID key — notifications locales (SW) activées, push web désactivé');
                setIsSubscribed(false); // pas de push distant
                setIsLoading(false);
                return true; // SW enregistré, permission accordée
            }

            // 4. Create push subscription
            const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
            const existingSub = await reg.pushManager.getSubscription();
            const subscription = existingSub || await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
            });

            const subJSON = subscription.toJSON();

            // 5a. Send to Cloudflare Worker KV (primary store — fast push delivery)
            if (WORKER_URL) {
                try {
                    await fetch(`${WORKER_URL}/api/push/register`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId,
                            subscription: { endpoint: subJSON.endpoint, keys: subJSON.keys },
                            userRole,
                            organizationId,
                            orgSlug,
                        }),
                    });
                } catch {
                    // Non-critical — fallback to Supabase below
                }
            }

            // 5b. Save to Supabase push_tokens as persistent fallback
            // Note: table must be 'push_tokens' (same as Worker reads from Supabase)
            if (userId) {
                try {
                    const { supabase } = await import('@/lib/supabase');
                    await supabase.from('push_tokens').upsert({
                        user_id: userId,
                        subscription_json: JSON.stringify({ endpoint: subJSON.endpoint, keys: subJSON.keys }),
                        platform: 'web',
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'user_id' });
                } catch {
                    // Non-critical — Worker KV is the primary store
                }
            }

            setIsSubscribed(true);
            return true;
        } catch (err: any) {
            setError(err.message || "Erreur lors de l'abonnement push");
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [userId, userRole, organizationId, orgSlug, isSupported]);

    // Unsubscribe from push notifications
    const unsubscribe = useCallback(async (): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();

            if (sub) {
                await sub.unsubscribe();

                // Notify the worker
                if (WORKER_URL && userId) {
                    try {
                        await fetch(`${WORKER_URL}/api/push/unregister`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId,
                                endpoint: sub.endpoint,
                            }),
                        });
                    } catch {
                        // Non-critical — subscription already unsubscribed locally
                    }
                }
            }

            setIsSubscribed(false);
            return true;
        } catch (err: any) {
            setError(err.message || 'Erreur lors du désabonnement');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    return {
        permission,
        isSubscribed,
        isLoading,
        error,
        isSupported,
        subscribe,
        unsubscribe,
    };
}
