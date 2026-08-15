'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, Trash2, GraduationCap, CreditCard, ShieldAlert, ClipboardCheck, Sparkles, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface AdminNotifItem {
    id: string;
    title: string;
    message: string;
    type: 'inscription' | 'payment' | 'exam' | 'discipline' | 'system';
    tab: string;
    subTab?: string;
    created_at: string;
    read: boolean;
    data?: any;
}

interface AdminNotificationBellProps {
    orgId: string;
    orgSlug: string;
    onNavigateTab: (tab: string, params?: any) => void;
}

export function AdminNotificationBell({
    orgId,
    orgSlug,
    onNavigateTab,
}: AdminNotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<AdminNotifItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const panelRef = useRef<HTMLDivElement>(null);

    const storageKey = `admin_notifs_${orgId}`;
    const readStorageKey = `admin_notifs_read_${orgId}`;

    // ── Play sound notification (Web Audio API) ──
    const playSound = useCallback(() => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const playTone = (freq: number, startTime: number, duration: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.25, startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                osc.start(startTime);
                osc.stop(startTime + duration);
            };
            playTone(880, ctx.currentTime, 0.12);
            playTone(1174, ctx.currentTime + 0.14, 0.18);
        } catch {
            // AudioContext not allowed before user interaction
        }
    }, []);

    // ── Load stored notifications ──
    useEffect(() => {
        if (!orgId) return;
        try {
            const stored = localStorage.getItem(storageKey);
            const readIds: string[] = JSON.parse(localStorage.getItem(readStorageKey) || '[]');
            if (stored) {
                const parsed: AdminNotifItem[] = JSON.parse(stored);
                const updated = parsed.map(n => ({ ...n, read: readIds.includes(n.id) }));
                setNotifications(updated);
                setUnreadCount(updated.filter(n => !n.read).length);
            }
        } catch (e) {
            // ignore
        }
    }, [orgId, storageKey, readStorageKey]);

    // ── Add notification helper ──
    const addNotification = useCallback((item: Omit<AdminNotifItem, 'read'>) => {
        const fullItem: AdminNotifItem = { ...item, read: false };
        setNotifications(prev => {
            const updated = [fullItem, ...prev.filter(p => p.id !== fullItem.id)].slice(0, 50);
            try {
                localStorage.setItem(storageKey, JSON.stringify(updated));
            } catch (e) {}
            return updated;
        });
        setUnreadCount(prev => prev + 1);
        playSound();

        // Toast in-app
        toast(fullItem.title, {
            description: fullItem.message,
            action: {
                label: 'Voir',
                onClick: () => {
                    onNavigateTab(fullItem.tab, { sub: fullItem.subTab });
                },
            },
        });
    }, [storageKey, playSound, onNavigateTab]);

    // ── Supabase Realtime Subscriptions ──
    useEffect(() => {
        if (!orgId) return;

        // 1. Inscriptions
        const inscChan = supabase
            .channel(`admin_insc_${orgId}_${Date.now()}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'inscription_requests',
                filter: `organization_id=eq.${orgId}`,
            }, (payload) => {
                const req = payload.new;
                addNotification({
                    id: `insc_${req.id || Date.now()}`,
                    title: '👥 Nouvelle Inscription',
                    message: `${req.first_name || ''} ${req.last_name || ''} a soumis un dossier d'inscription.`,
                    type: 'inscription',
                    tab: 'students',
                    subTab: 'pending',
                    created_at: new Date().toISOString(),
                    data: req,
                });
            })
            .subscribe();

        // 2. Payments
        const payChan = supabase
            .channel(`admin_pay_${orgId}_${Date.now()}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'payments',
                filter: `organization_id=eq.${orgId}`,
            }, (payload) => {
                const pay = payload.new;
                addNotification({
                    id: `pay_${pay.id || Date.now()}`,
                    title: '💰 Nouveau Paiement Reçu',
                    message: `Paiement de ${pay.amount || ''} FCFA enregistré (${pay.description || pay.label || 'Scolarité'}).`,
                    type: 'payment',
                    tab: 'payments',
                    created_at: new Date().toISOString(),
                    data: pay,
                });
            })
            .subscribe();

        // 3. Exam Submissions
        const examChan = supabase
            .channel(`admin_exam_${orgId}_${Date.now()}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'exam_submissions',
            }, (payload) => {
                const sub = payload.new;
                addNotification({
                    id: `exam_${sub.id || Date.now()}`,
                    title: '📝 Copie d\'Examen Soumise',
                    message: `Un étudiant a soumis sa copie d'évaluation.`,
                    type: 'exam',
                    tab: 'evaluations',
                    created_at: new Date().toISOString(),
                    data: sub,
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(inscChan);
            supabase.removeChannel(payChan);
            supabase.removeChannel(examChan);
        };
    }, [orgId, addNotification]);

    // ── Click outside to close ──
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

    // ── Mark single as read ──
    const markAsRead = (id: string) => {
        setNotifications(prev => {
            const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
            const readIds = updated.filter(n => n.read).map(n => n.id);
            localStorage.setItem(readStorageKey, JSON.stringify(readIds));
            setUnreadCount(updated.filter(n => !n.read).length);
            return updated;
        });
    };

    // ── Mark all as read ──
    const markAllAsRead = () => {
        setNotifications(prev => {
            const updated = prev.map(n => ({ ...n, read: true }));
            const readIds = updated.map(n => n.id);
            localStorage.setItem(readStorageKey, JSON.stringify(readIds));
            setUnreadCount(0);
            return updated;
        });
    };

    // ── Clear all ──
    const clearAll = () => {
        setNotifications([]);
        setUnreadCount(0);
        localStorage.removeItem(storageKey);
        localStorage.removeItem(readStorageKey);
    };

    const getIcon = (type: AdminNotifItem['type']) => {
        switch (type) {
            case 'inscription':
                return <GraduationCap className="w-4 h-4 text-violet-400" />;
            case 'payment':
                return <CreditCard className="w-4 h-4 text-emerald-400" />;
            case 'exam':
                return <ClipboardCheck className="w-4 h-4 text-amber-400" />;
            case 'discipline':
                return <ShieldAlert className="w-4 h-4 text-rose-400" />;
            default:
                return <Bell className="w-4 h-4 text-teal-400" />;
        }
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition flex items-center justify-center cursor-pointer group"
                title="Notifications Administrateur"
            >
                <Bell className="w-4 h-4 transition-transform group-hover:scale-110" />

                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white shadow-lg animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0F1219] border border-white/10 shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-white">Alertes Admin</span>
                                {unreadCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                                        {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-1">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-[11px] text-teal-400 hover:text-teal-300 font-medium px-2 py-1 rounded-lg hover:bg-teal-500/10 transition"
                                    >
                                        Tout lire
                                    </button>
                                )}
                                {notifications.length > 0 && (
                                    <button
                                        onClick={clearAll}
                                        className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition"
                                        title="Effacer l'historique"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-[380px] overflow-y-auto divide-y divide-white/5">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3 text-slate-500">
                                        <Bell className="w-6 h-6" />
                                    </div>
                                    <p className="text-xs font-semibold text-slate-300">Aucune alerte pour l'instant</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Les nouvelles inscriptions et paiements apparaîtront ici.</p>
                                </div>
                            ) : (
                                notifications.map(notif => (
                                    <div
                                        key={notif.id}
                                        onClick={() => {
                                            markAsRead(notif.id);
                                            setIsOpen(false);
                                            onNavigateTab(notif.tab, { sub: notif.subTab });
                                        }}
                                        className={cn(
                                            "p-3.5 hover:bg-white/[0.04] transition cursor-pointer flex gap-3 items-start",
                                            !notif.read && "bg-teal-500/[0.04]"
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
                                                    <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                                                {notif.message}
                                            </p>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-[10px] text-slate-500">
                                                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="text-[10px] text-teal-400 font-medium flex items-center gap-0.5">
                                                    Ouvrir <ChevronRight className="w-3 h-3" />
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

export default AdminNotificationBell;
