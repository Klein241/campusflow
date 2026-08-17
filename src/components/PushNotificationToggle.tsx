'use client';

import { Bell, BellOff, Loader2, Smartphone } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * ═══════════════════════════════════════════════════════════
 * PushNotificationToggle — UI component for push subscription
 * ═══════════════════════════════════════════════════════════
 *
 * Displays a toggle button to enable/disable push notifications.
 * Shows contextual messages for denied permissions, unsupported
 * browsers, and Safari iOS PWA requirements.
 *
 * Usage:
 *   <PushNotificationToggle
 *       userId={session.id}
 *       userRole="student"
 *       organizationId={org.id}
 *       orgSlug={orgSlug}
 *   />
 */

interface PushNotificationToggleProps {
    userId: string;
    userRole: 'admin' | 'teacher' | 'student';
    organizationId: string;
    orgSlug: string;
    /** Compact mode for sidebar/settings */
    compact?: boolean;
}

export function PushNotificationToggle({
    userId,
    userRole,
    organizationId,
    orgSlug,
    compact = false,
}: PushNotificationToggleProps) {
    const {
        permission,
        isSubscribed,
        isLoading,
        error,
        isSupported,
        subscribe,
        unsubscribe,
    } = usePushNotifications({ userId, userRole, organizationId, orgSlug });

    // Don't render on unsupported browsers (SSR safe)
    if (typeof window !== 'undefined' && !isSupported) {
        return null;
    }

    const handleToggle = async () => {
        if (isSubscribed) {
            await unsubscribe();
        } else {
            await subscribe();
        }
    };

    // Detect if iOS Safari (needs PWA install prompt)
    const isIOSSafari = typeof navigator !== 'undefined'
        && /iPad|iPhone|iPod/.test(navigator.userAgent)
        && !(window as any).navigator.standalone;

    if (compact) {
        return (
            <button
                onClick={handleToggle}
                disabled={isLoading || permission === 'denied'}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                    isSubscribed
                        ? 'bg-teal-500/20 text-teal-400'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isSubscribed ? 'Désactiver les notifications' : 'Activer les notifications'}
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : isSubscribed ? (
                    <Bell className="w-4 h-4 text-teal-400" />
                ) : (
                    <BellOff className="w-4 h-4" />
                )}
            </button>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {/* Main toggle button */}
            <button
                onClick={handleToggle}
                disabled={isLoading || permission === 'denied'}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isSubscribed
                        ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:bg-teal-500/30'
                        : 'bg-white/4 text-slate-400 border border-white/10 hover:bg-white/8'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : isSubscribed ? (
                    <Bell className="w-5 h-5 text-teal-400" />
                ) : (
                    <BellOff className="w-5 h-5" />
                )}

                <div className="flex flex-col items-start">
                    <span>
                        {isSubscribed ? 'Notifications activées' : 'Activer les notifications'}
                    </span>
                    <span className="text-[10px] opacity-60">
                        {isSubscribed
                            ? 'Vous recevrez des alertes même hors de l\'app'
                            : 'Notes, évaluations, messages en temps réel'
                        }
                    </span>
                </div>
            </button>

            {/* Permission denied message */}
            {permission === 'denied' && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <BellOff className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-400">
                        Notifications bloquées dans votre navigateur.
                        Allez dans les paramètres de votre navigateur pour les débloquer.
                    </p>
                </div>
            )}

            {/* iOS Safari PWA prompt */}
            {isIOSSafari && !isSubscribed && permission !== 'denied' && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Smartphone className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-400">
                        <strong>iPhone/iPad :</strong> Pour recevoir les notifications,
                        ajoutez d&apos;abord IziTeach à votre écran d&apos;accueil
                        (Safari → <em>Partager</em> → <em>Sur l&apos;écran d&apos;accueil</em>).
                    </p>
                </div>
            )}

            {/* Error message */}
            {error && (
                <p className="text-xs text-red-400 px-1">{error}</p>
            )}
        </div>
    );
}
