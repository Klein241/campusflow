'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Sparkles, AlertCircle, CheckCircle2, ChevronRight, ShieldCheck } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { checkAndTriggerDailyEngagement } from '@/lib/daily-engagement';

// ──────────────────────────────────────────────────────────────
// CONSTANTS & CONFIG
// ──────────────────────────────────────────────────────────────

const WORKER_URL = process.env.NEXT_PUBLIC_NOTIFICATION_WORKER_URL
    || process.env.NEXT_PUBLIC_WORKER_URL
    || 'https://campusflow-worker.kleintaptue1.workers.dev';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

const PROMPT_DELAY_MS = 3500; // 3.5s après chargement (stratégie Pinterest)
const LS_KEY_DISMISSED = 'push_prompt_dismissed_at';
const LS_KEY_SUBSCRIBED = 'push_subscribed';
const RETRY_AFTER_DISMISSED_DAYS = 1; // 1 jour avant nouveau rappel doux (Alibaba)

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
    return 'Notification' in window && 'serviceWorker' in navigator;
}

function shouldShowPrompt(): boolean {
    if (!isBrowserSupported()) return false;
    if (Notification.permission === 'granted') return false;
    if (Notification.permission === 'denied') return false;

    const dismissedAt = localStorage.getItem(LS_KEY_DISMISSED);
    if (dismissedAt) {
        const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
        if (daysSince < RETRY_AFTER_DISMISSED_DAYS) return false;
    }
    return true;
}

// ──────────────────────────────────────────────────────────────
// CORE SUBSCRIBE — Multi-Tenant Aware
// ──────────────────────────────────────────────────────────────

async function performSubscription(userId: string, orgSlug?: string, orgName?: string): Promise<boolean> {
    try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;

        // Synchronize Active Org with Service Worker
        if (orgSlug && reg.active) {
            reg.active.postMessage({
                type: 'SET_ACTIVE_ORG',
                orgSlug,
                orgName,
            });
        }

        let vapidKey = VAPID_PUBLIC_KEY;
        if (!vapidKey && WORKER_URL) {
            try {
                const res = await fetch(`${WORKER_URL}/api/push/vapid-key`);
                if (res.ok) {
                    const j = await res.json();
                    vapidKey = j.publicKey || j.public_key || '';
                }
            } catch {
                // Worker indisponible
            }
        }

        if (!vapidKey) {
            console.warn('[Push] Pas de VAPID key — SW actif, notifications locales garanties');
            return true;
        }

        const keyBytes = urlBase64ToUint8Array(vapidKey);
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: keyBytes as unknown as BufferSource,
            });
        }

        const subJSON = sub.toJSON() as any;

        // Enregistrer sur le Worker Cloudflare avec métadonnées d'école
        if (WORKER_URL) {
            fetch(`${WORKER_URL}/api/push/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    subscription: { endpoint: subJSON.endpoint, keys: subJSON.keys },
                    orgSlug: orgSlug || '',
                }),
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
        } catch {
            // non-critique
        }

        localStorage.setItem(LS_KEY_SUBSCRIBED, '1');
        return true;
    } catch (err: any) {
        console.error('[Push] Erreur abonnement:', err.message);
        return false;
    }
}

// ──────────────────────────────────────────────────────────────
// SOFT PROMPT UI — Style Pinterest / Alibaba (Growth & Retention)
// ──────────────────────────────────────────────────────────────

interface PushPromptProps {
    orgName?: string;
    onAllow: () => void;
    onDismiss: () => void;
    isLoading: boolean;
}

function PushPrompt({ orgName, onAllow, onDismiss, isLoading }: PushPromptProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 70, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 70, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-5 left-4 right-4 z-[300] max-w-md mx-auto"
        >
            <div className="relative bg-[#0F121C] border border-violet-500/30 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-5 overflow-hidden backdrop-blur-2xl">
                {/* Glowing ambient aura */}
                <div className="absolute -top-12 -right-12 w-36 h-36 bg-violet-600/25 blur-3xl rounded-full pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-teal-600/20 blur-3xl rounded-full pointer-events-none" />

                {/* Close Button */}
                <button
                    onClick={onDismiss}
                    className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex gap-4 items-start pr-6">
                    <div className="relative shrink-0 mt-0.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                            <Bell className="w-6 h-6 text-white animate-pulse" />
                        </div>
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0F121C] flex items-center justify-center">
                            <span className="w-1.5 h-1.5 bg-white rounded-full" />
                        </span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/25 text-[10px] font-bold text-violet-300 mb-1.5">
                            <Sparkles className="w-3 h-3 text-violet-400" />
                            {orgName ? `Espace officiel ${orgName}` : 'Espace Établissement'}
                        </div>
                        <h4 className="text-base font-extrabold text-white leading-tight">
                            Ne manque aucune alerte importante !
                        </h4>
                        <p className="text-xs text-slate-300/90 mt-1 leading-relaxed">
                            Reçois instantanément tes <span className="text-white font-semibold">notes d'examen</span>, changements d'emploi du temps, devoirs et messages.
                        </p>
                    </div>
                </div>

                <div className="flex gap-2.5 mt-4">
                    <button
                        onClick={onDismiss}
                        className="flex-1 py-2.5 rounded-2xl text-xs font-semibold text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
                    >
                        Plus tard
                    </button>
                    <button
                        onClick={onAllow}
                        disabled={isLoading}
                        className="flex-[2] py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-indigo-500 via-violet-600 to-fuchsia-600 hover:from-indigo-400 hover:to-fuchsia-500 shadow-lg shadow-violet-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Activer maintenant</span>
                                <ChevronRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ──────────────────────────────────────────────────────────────
// UNBLOCK INSTRUCTIONS MODAL (If browser denied permission)
// ──────────────────────────────────────────────────────────────

function UnblockGuideModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#121624] border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-white relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-white/5"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400">
                    <AlertCircle className="w-6 h-6" />
                </div>

                <h3 className="text-lg font-bold">Notifications bloquées</h3>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                    Ton navigateur bloque actuellement les alertes. Voici comment les autoriser en 2 secondes :
                </p>

                <div className="space-y-3 text-xs bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                    <div className="flex gap-3 items-start">
                        <span className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 font-bold flex items-center justify-center shrink-0">1</span>
                        <p className="text-slate-300">Clique sur l'icône <span className="font-semibold text-white">Cadenas 🔒</span> ou <span className="font-semibold text-white">Paramètres</span> dans la barre d'adresse de ton navigateur.</p>
                    </div>
                    <div className="flex gap-3 items-start">
                        <span className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 font-bold flex items-center justify-center shrink-0">2</span>
                        <p className="text-slate-300">Cherche la section <span className="font-semibold text-white">« Notifications »</span>.</p>
                    </div>
                    <div className="flex gap-3 items-start">
                        <span className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 font-bold flex items-center justify-center shrink-0">3</span>
                        <p className="text-slate-300">Sélectionne <span className="font-semibold text-emerald-400">« Autoriser »</span> puis recharge la page.</p>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-xs transition"
                >
                    J'ai compris
                </button>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────
// MAIN PUSH NOTIFICATION MANAGER
// ──────────────────────────────────────────────────────────────

export function PushNotificationManager({
    orgSlug,
    orgName,
}: {
    orgSlug?: string;
    orgName?: string;
}) {
    const user = useAppStore(s => s.user);
    const [showPrompt, setShowPrompt] = useState(false);
    const [showUnblockGuide, setShowUnblockGuide] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const initialized = useRef(false);

    useEffect(() => {
        if (!user?.id || initialized.current) return;
        initialized.current = true;

        // Auto-subscribe if already granted
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
                performSubscription(user.id, orgSlug, orgName).catch(() => {});
                // Trigger Daily Engagement Check
                checkAndTriggerDailyEngagement({
                    userId: user.id,
                    userName: user.name || 'Étudiant',
                    orgSlug: orgSlug || '',
                    orgName: orgName || 'Mon Établissement',
                });
                return;
            }
        }

        // Otherwise show Soft Prompt after delay
        if (shouldShowPrompt()) {
            const timer = setTimeout(() => setShowPrompt(true), PROMPT_DELAY_MS);
            return () => clearTimeout(timer);
        }
    }, [user?.id, orgSlug, orgName]);

    const handleAllow = useCallback(async () => {
        if (!user?.id) return;
        setIsLoading(true);

        try {
            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
                setShowPrompt(false);
                const ok = await performSubscription(user.id, orgSlug, orgName);
                if (ok) {
                    toast.success('🔔 Notifications de l\'école activées !', {
                        description: 'Tu seras alerté en direct des notes, cours et messages.',
                        duration: 5000,
                    });
                }
            } else if (perm === 'denied') {
                setShowPrompt(false);
                localStorage.setItem(LS_KEY_DISMISSED, String(Date.now()));
                setShowUnblockGuide(true);
            }
        } catch (e: any) {
            console.error('[PushManager] Error:', e);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, orgSlug, orgName]);

    const handleDismiss = useCallback(() => {
        setShowPrompt(false);
        localStorage.setItem(LS_KEY_DISMISSED, String(Date.now()));
    }, []);

    return (
        <>
            <AnimatePresence>
                {showPrompt && (
                    <PushPrompt
                        orgName={orgName}
                        onAllow={handleAllow}
                        onDismiss={handleDismiss}
                        isLoading={isLoading}
                    />
                )}
            </AnimatePresence>

            {showUnblockGuide && (
                <UnblockGuideModal onClose={() => setShowUnblockGuide(false)} />
            )}
        </>
    );
}

export default PushNotificationManager;
