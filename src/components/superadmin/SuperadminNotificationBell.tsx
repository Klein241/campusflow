'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Trash2, Building2, Star, AlertTriangle, Globe, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface SuperadminNotifItem {
    id: string;
    title: string;
    message: string;
    type: 'org' | 'points' | 'health' | 'domain';
    tab: string;
    created_at: string;
    read: boolean;
    data?: any;
}

interface SuperadminNotificationBellProps {
    onNavigateTab: (tab: string) => void;
}

export function SuperadminNotificationBell({
    onNavigateTab,
}: SuperadminNotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<SuperadminNotifItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const panelRef = useRef<HTMLDivElement>(null);

    const storageKey = 'superadmin_platform_notifs';
    const readStorageKey = 'superadmin_platform_notifs_read';

    // ── Sound notification ──
    const playSound = useCallback(() => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const playTone = (freq: number, startTime: number, duration: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = 'triangle';
                gain.gain.setValueAtTime(0.2, startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                osc.start(startTime);
                osc.stop(startTime + duration);
            };
            playTone(784, ctx.currentTime, 0.15);
            playTone(1046, ctx.currentTime + 0.15, 0.2);
        } catch {}
    }, []);

    // ── Load stored notifications ──
    useEffect(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            const readIds: string[] = JSON.parse(localStorage.getItem(readStorageKey) || '[]');
            if (stored) {
                const parsed: SuperadminNotifItem[] = JSON.parse(stored);
                const updated = parsed.map(n => ({ ...n, read: readIds.includes(n.id) }));
                setNotifications(updated);
                setUnreadCount(updated.filter(n => !n.read).length);
            }
        } catch {}
    }, []);

    // ── Add notification helper ──
    const addNotification = useCallback((item: Omit<SuperadminNotifItem, 'read'>) => {
        const fullItem: SuperadminNotifItem = { ...item, read: false };
        setNotifications(prev => {
            const updated = [fullItem, ...prev.filter(p => p.id !== fullItem.id)].slice(0, 50);
            try {
                localStorage.setItem(storageKey, JSON.stringify(updated));
            } catch {}
            return updated;
        });
        setUnreadCount(prev => prev + 1);
        playSound();

        toast(fullItem.title, {
            description: fullItem.message,
            action: {
                label: 'Ouvrir',
                onClick: () => onNavigateTab(fullItem.tab),
            },
        });
    }, [playSound, onNavigateTab]);

    // ── Supabase Realtime Platform Subscriptions ──
    useEffect(() => {
        // 1. New Organizations
        const orgChan = supabase
            .channel(`sa_orgs_${Date.now()}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'organizations',
            }, (payload) => {
                const org = payload.new;
                addNotification({
                    id: `sa_org_${org.id || Date.now()}`,
                    title: '🏫 Nouvelle Organisation Créée',
                    message: `L'établissement "${org.name}" (${org.slug}) a été enregistré.`,
                    type: 'org',
                    tab: 'orgs',
                    created_at: new Date().toISOString(),
                    data: org,
                });
            })
            .subscribe();

        // 2. Sky Points Requests
        const reqChan = supabase
            .channel(`sa_reqs_${Date.now()}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'sky_point_requests',
            }, (payload) => {
                const req = payload.new;
                addNotification({
                    id: `sa_req_${req.id || Date.now()}`,
                    title: '⭐ Demande de Sky Points',
                    message: `Demande de recharge pour ${req.points_requested || req.amount || 'des'} points reçue.`,
                    type: 'points',
                    tab: 'requests',
                    created_at: new Date().toISOString(),
                    data: req,
                });
            })
            .subscribe();

        // 3. System Health Alerts
        const healthChan = supabase
            .channel(`sa_health_${Date.now()}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'system_health',
            }, (payload) => {
                const h = payload.new;
                if (h.status === 'down' || h.status === 'error') {
                    addNotification({
                        id: `sa_health_${h.id || Date.now()}`,
                        title: '⚠️ Incident Système',
                        message: `Service ${h.service || 'Base de données'} : ${h.error_msg || 'Alerte failover'}.`,
                        type: 'health',
                        tab: 'overview',
                        created_at: new Date().toISOString(),
                        data: h,
                    });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(orgChan);
            supabase.removeChannel(reqChan);
            supabase.removeChannel(healthChan);
        };
    }, [addNotification]);

    // ── Click outside ──
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const markAsRead = (id: string) => {
        setNotifications(prev => {
            const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
            const readIds = updated.filter(n => n.read).map(n => n.id);
            localStorage.setItem(readStorageKey, JSON.stringify(readIds));
            setUnreadCount(updated.filter(n => !n.read).length);
            return updated;
        });
    };

    const markAllAsRead = () => {
        setNotifications(prev => {
            const updated = prev.map(n => ({ ...n, read: true }));
            const readIds = updated.map(n => n.id);
            localStorage.setItem(readStorageKey, JSON.stringify(readIds));
            setUnreadCount(0);
            return updated;
        });
    };

    const clearAll = () => {
        setNotifications([]);
        setUnreadCount(0);
        localStorage.removeItem(storageKey);
        localStorage.removeItem(readStorageKey);
    };

    const getIcon = (type: SuperadminNotifItem['type']) => {
        switch (type) {
            case 'org':
                return <Building2 className="w-4 h-4 text-violet-400" />;
            case 'points':
                return <Star className="w-4 h-4 text-amber-400" />;
            case 'health':
                return <AlertTriangle className="w-4 h-4 text-rose-400" />;
            case 'domain':
                return <Globe className="w-4 h-4 text-teal-400" />;
            default:
                return <Bell className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <div className="relative" ref={panelRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white transition flex items-center justify-center cursor-pointer group"
                title="Notifications SuperAdmin Platform"
            >
                <Bell className="w-4 h-4 transition-transform group-hover:scale-110" />

                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-black text-white shadow-lg animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#080B12] border border-white/[0.1] shadow-2xl z-50 overflow-hidden backdrop-blur-2xl"
                    >
                        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-white">Platform Alerts</span>
                                {unreadCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-bold">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-1">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-[11px] text-violet-400 hover:text-violet-300 font-medium px-2 py-1 rounded-lg hover:bg-violet-500/10 transition"
                                    >
                                        Tout lire
                                    </button>
                                )}
                                {notifications.length > 0 && (
                                    <button
                                        onClick={clearAll}
                                        className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition"
                                        title="Effacer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="max-h-[380px] overflow-y-auto divide-y divide-white/[0.04]">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3 text-slate-500">
                                        <Bell className="w-6 h-6" />
                                    </div>
                                    <p className="text-xs font-semibold text-slate-300">Aucune alerte plateforme</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Les créations d'écoles et requêtes apparaîtront ici.</p>
                                </div>
                            ) : (
                                notifications.map(notif => (
                                    <div
                                        key={notif.id}
                                        onClick={() => {
                                            markAsRead(notif.id);
                                            setIsOpen(false);
                                            onNavigateTab(notif.tab);
                                        }}
                                        className={cn(
                                            "p-3.5 hover:bg-white/[0.04] transition cursor-pointer flex gap-3 items-start",
                                            !notif.read && "bg-violet-500/[0.04]"
                                        )}
                                    >
                                        <div className="p-2 rounded-xl bg-white/5 shrink-0 mt-0.5">
                                            {getIcon(notif.type)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1">
                                                <p className={cn("text-xs font-bold truncate", notif.read ? "text-slate-300" : "text-white")}>
                                                    {notif.title}
                                                </p>
                                                {!notif.read && (
                                                    <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                                                {notif.message}
                                            </p>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-[10px] text-slate-500">
                                                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="text-[10px] text-violet-400 font-medium flex items-center gap-0.5">
                                                    Voir <ChevronRight className="w-3 h-3" />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default SuperadminNotificationBell;
