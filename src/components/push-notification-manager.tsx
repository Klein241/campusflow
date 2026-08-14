'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Sparkles } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

// ──────────────────────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────────────────────

const WORKER_URL = process.env.NEXT_PUBLIC_NOTIFICATION_WORKER_URL
    || process.env.NEXT_PUBLIC_WORKER_URL
    || '';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

const PROMPT_DELAY_MS          = 8000;  // 8s après connexion
const RETRY_AFTER_DENIED_DAYS  = 3;     // réessayer après 3j si refusé

const LS_KEY_DISMISSED = 'push_prompt_dismissed_at';
const LS_KEY_SUBSCRIBED = 'push_subscribed';

// ──────────────────────────────────────────────────────────────
// UTILS
// ──────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64: string): Uint8Array {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(b64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

function isBrowserSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

function shouldShowPrompt(): boolean {
    if (!isBrowserSupported()) return false;
    if (Notification.permission === 'granted') return false;
    if (Notification.permission === 'denied')  return false;

    const dismissedAt = localStorage.getItem(LS_KEY_DISMISSED);
    if (dismissedAt) {
        const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
        if (daysSince < RETRY_AFTER_DENIED_DAYS) return false;
    }
    return true;
}

// ──────────────────────────────────────────────────────────────
// CORE SUBSCRIBE — Chrome + Firefox + Safari iOS 16.4+ + Edge
// ──────────────────────────────────────────────────────────────

async function performSubscription(userId: string): Promise<boolean> {
    try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;

        let vapidKey = VAPID_PUBLIC_KEY;
        if (!vapidKey && WORKER_URL) {
            try {
                const res = await fetch(`${WORKER_URL}/api/push/vapid-key`);
                if (res.ok) { const j = await res.json(); vapidKey = j.publicKey || j.public_key || ''; }
            } catch { /* Worker indisponible */ }
        }

        if (!vapidKey) {
            console.warn('[Push] Pas de VAPID key — SW actif mais push distant désactivé');
            return true;
        }

        const keyBytes = urlBase64ToUint8Array(vapidKey);
        if (keyBytes.length !== 65) {
            console.warn(`[Push] Clé VAPID invalide (longueur ${keyBytes.length}, attendu 65)`);
            return false;
        }

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: keyBytes as unknown as BufferSource,
            });
        }

        const subJSON = sub.toJSON() as any;

        // Enregistrer sur le Worker Cloudflare (KV)
        if (WORKER_URL) {
            fetch(`${WORKER_URL}/api/push/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, subscription: { endpoint: subJSON.endpoint, keys: subJSON.keys } }),
            }).catch(() => {});
        }

        // Fallback Supabase push_tokens
        try {
            const { supabase } = await import('@/lib/supabase');
            await supabase.from('push_tokens').upsert({
                user_id: userId,
                subscription_json: JSON.stringify({ endpoint: subJSON.endpoint, keys: subJSON.keys }),
                platform: 'web',
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
        } catch { /* non-critique */ }

        localStorage.setItem(LS_KEY_SUBSCRIBED, '1');
        return true;
    } catch (err: any) {
        console.error('[Push] Erreur abonnement:', err.message);
        return false;
    }
}

// ──────────────────────────────────────────────────────────────
// PROMPT UI — style Pinterest / Facebook
// ──────────────────────────────────────────────────────────────

function PushPrompt({ onAllow, onDismiss, isLoading }: {
    onAllow: () => void; onDismiss: () => void; isLoading: boolean;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 80, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 80, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="fixed bottom-4 left-4 right-4 z-[200] max-w-sm mx-auto"
        >
            <div className="relative bg-[#141520] border border-white/[0.12] rounded-2xl shadow-2xl shadow-black/60 p-4 overflow-hidden">
                {/* Glow background */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-violet-600/5 to-transparent pointer-events-none rounded-2xl" />

                {/* Bouton fermer */}
                <button onClick={onDismiss}
                    className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                    <X className="w-3.5 h-3.5" />
                </button>

                <div className="flex gap-3 items-start pr-6">
                    {/* Icône cloche avec badge pulsant */}
                    <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <Bell className="w-5 h-5 text-white" />
                        </div>
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-[#141520]">
                            <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-60" />
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white leading-snug">Activer les notifications</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                            Reçois les alertes en temps réel — leçons, exercices, évaluations et messages.
                        </p>
                    </div>
                </div>

                <div className="flex gap-2 mt-3">
                    <button onClick={onDismiss}
                        className="flex-1 py-2 rounded-xl text-xs text-slate-400 hover:text-white border border-white/[0.08] hover:border-white/20 transition-all">
                        Plus tard
                    </button>
                    <button onClick={onAllow} disabled={isLoading}
                        className="flex-[2] py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/25">
                        {isLoading
                            ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            : <Sparkles className="w-3.5 h-3.5" />}
                        {isLoading ? 'Activation...' : 'Activer'}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ──────────────────────────────────────────────────────────────
// MAIN MANAGER
// ──────────────────────────────────────────────────────────────

export function PushNotificationManager() {
    const user      = useAppStore(s => s.user);
    const [show, setShow]         = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const initialized = useRef(false);
    const timerRef    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
        if (!user?.id || initialized.current) return;
        initialized.current = true;

        // Déjà abonné ? Renouveler silencieusement
        if (localStorage.getItem(LS_KEY_SUBSCRIBED) === '1' && Notification.permission === 'granted') {
            performSubscription(user.id).catch(() => {});
            return;
        }

        // Sinon afficher le prompt après le délai
        if (shouldShowPrompt()) {
            timerRef.current = setTimeout(() => setShow(true), PROMPT_DELAY_MS);
        }
        return () => clearTimeout(timerRef.current);
    }, [user?.id]);

    const handleAllow = useCallback(async () => {
        if (!user?.id) return;
        setIsLoading(true);
        try {
            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
                const ok = await performSubscription(user.id);
                setShow(false);
                if (ok) {
                    toast.success('🔔 Notifications activées !', {
                        description: "Tu seras alerté même quand l'app est fermée.",
                        duration: 4000,
                    });
                } else {
                    toast.error('Impossible d\'activer les notifications push.');
                }
            } else if (perm === 'denied') {
                setShow(false);
                localStorage.setItem(LS_KEY_DISMISSED, String(Date.now()));
                toast.error('Notifications bloquées par le navigateur', {
                    description: 'Paramètres → Confidentialité → Notifications pour les activer.',
                    duration: 6000,
                });
            }
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    const handleDismiss = useCallback(() => {
        setShow(false);
        localStorage.setItem(LS_KEY_DISMISSED, String(Date.now()));
    }, []);

    return (
        <AnimatePresence>
            {show && <PushPrompt onAllow={handleAllow} onDismiss={handleDismiss} isLoading={isLoading} />}
        </AnimatePresence>
    );
}

export default PushNotificationManager;
