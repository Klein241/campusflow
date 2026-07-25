'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell, BellOff, X, Check, CheckCheck, Loader2,
    BookOpen, GraduationCap, Calendar, CreditCard,
    MessageSquare, Users, ShoppingBag, BookMarked,
    Megaphone, Shield, FileText, Star, ClipboardList,
    ChevronRight, Trash2, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════
// NOTIFICATION CENTER — Centre de notifications unifié
// Notes, Bulletin, Marketplace, Bibliothèque, EDT,
// Évaluations, Actualités, Chat DM/Groupe, Administration
// ═══════════════════════════════════════════════════════

export type NotifCategory =
    | 'grade'          // Notes
    | 'bulletin'       // Bulletins de notes
    | 'marketplace'    // Marketplace
    | 'library'        // Bibliothèque
    | 'schedule'       // Emploi du temps
    | 'evaluation'     // Évaluations
    | 'news'           // Actualités / Posts
    | 'chat_dm'        // Messages directs
    | 'chat_group'     // Messages de groupe
    | 'admin'          // Administration
    | 'payment'        // Paiements
    | 'discipline'     // Discipline
    | 'system';        // Système

interface Notification {
    id: string;
    organization_id: string;
    user_id: string;
    category: NotifCategory;
    title: string;
    body: string;
    icon?: string;
    is_read: boolean;
    action_url?: string;
    metadata?: Record<string, any>;
    created_at: string;
}

interface NotificationCenterProps {
    orgId: string;
    userId: string;
    orgSlug: string;
    isOpen: boolean;
    onClose: () => void;
    onNavigate?: (tab: string, params?: any) => void;
}

// ═══ CATEGORY CONFIG ═══
const CATEGORY_CONFIG: Record<NotifCategory, {
    icon: any;
    label: string;
    color: string;
    bgColor: string;
    emoji: string;
}> = {
    grade: {
        icon: Star,
        label: 'Notes',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/15',
        emoji: '📊',
    },
    bulletin: {
        icon: FileText,
        label: 'Bulletins',
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/15',
        emoji: '📋',
    },
    marketplace: {
        icon: ShoppingBag,
        label: 'Marketplace',
        color: 'text-teal-400',
        bgColor: 'bg-teal-500/15',
        emoji: '🛒',
    },
    library: {
        icon: BookMarked,
        label: 'Bibliothèque',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/15',
        emoji: '📚',
    },
    schedule: {
        icon: Calendar,
        label: 'Emploi du temps',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/15',
        emoji: '📅',
    },
    evaluation: {
        icon: ClipboardList,
        label: 'Évaluations',
        color: 'text-indigo-400',
        bgColor: 'bg-indigo-500/15',
        emoji: '📝',
    },
    news: {
        icon: Megaphone,
        label: 'Actualités',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/15',
        emoji: '📰',
    },
    chat_dm: {
        icon: MessageSquare,
        label: 'Messages DM',
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/15',
        emoji: '💬',
    },
    chat_group: {
        icon: Users,
        label: 'Groupes',
        color: 'text-teal-400',
        bgColor: 'bg-teal-500/15',
        emoji: '👥',
    },
    admin: {
        icon: Shield,
        label: 'Administration',
        color: 'text-red-400',
        bgColor: 'bg-red-500/15',
        emoji: '🏫',
    },
    payment: {
        icon: CreditCard,
        label: 'Paiements',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/15',
        emoji: '💰',
    },
    discipline: {
        icon: Shield,
        label: 'Discipline',
        color: 'text-red-400',
        bgColor: 'bg-red-500/15',
        emoji: '⚠️',
    },
    system: {
        icon: Settings,
        label: 'Système',
        color: 'text-slate-400',
        bgColor: 'bg-slate-500/15',
        emoji: '⚙️',
    },
};

const FILTER_TABS: { id: string; label: string; categories: NotifCategory[] }[] = [
    { id: 'all', label: 'Tout', categories: [] },
    { id: 'academic', label: '📊 Académique', categories: ['grade', 'bulletin', 'evaluation', 'schedule'] },
    { id: 'social', label: '💬 Social', categories: ['chat_dm', 'chat_group', 'news'] },
    { id: 'services', label: '🛒 Services', categories: ['marketplace', 'library', 'payment'] },
    { id: 'admin', label: '🏫 Admin', categories: ['admin', 'discipline', 'system'] },
];

// ── Category Mapper ─────────────────────────────────────────
function mapActionTypeToCategory(actionType?: string, type?: string): NotifCategory {
    if (!actionType && !type) return 'system';
    const at = (actionType || type || '').toLowerCase();

    if (at.startsWith('story_') || at.startsWith('actu_') || at === 'news') return 'news';
    if (at.startsWith('new_subject') || at.startsWith('new_chapter') || at.startsWith('new_lesson') || at.startsWith('new_exercise')) return 'evaluation';
    if (at.startsWith('dm_') || at === 'message') return 'chat_dm';
    if (at.startsWith('group_')) return 'chat_group';
    if (at.startsWith('grade_') || at === 'grade') return 'grade';
    if (at.startsWith('evaluation_')) return 'evaluation';
    if (at.startsWith('payment_')) return 'payment';
    if (at.startsWith('discipline_')) return 'discipline';
    if (at.startsWith('admin_') || at === 'admin_announcement') return 'admin';
    if (at.startsWith('timetable_') || at === 'schedule') return 'schedule';
    return 'system';
}

export function NotificationCenter({ orgId, userId, orgSlug, isOpen, onClose, onNavigate }: NotificationCenterProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');
    const [markingAll, setMarkingAll] = useState(false);

    // Load notifications
    const loadNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) {
                console.warn('Notifications query warning:', error.message);
                setNotifications([]);
            } else if (data) {
                const mapped: Notification[] = data.map((n: any) => ({
                    id: n.id,
                    organization_id: n.organization_id || orgId,
                    user_id: n.user_id,
                    category: (n.category as NotifCategory) || mapActionTypeToCategory(n.action_type, n.type),
                    title: n.title || 'Notification',
                    body: n.body || n.message || '',
                    is_read: n.is_read ?? false,
                    created_at: n.created_at,
                    metadata: typeof n.action_data === 'string' ? JSON.parse(n.action_data || '{}') : (n.action_data || {}),
                }));
                setNotifications(mapped);
            }
        } catch (e) {
            console.error('Error loading notifications:', e);
            setNotifications([]);
        }
        setLoading(false);
    }, [orgId, userId]);

    useEffect(() => {
        if (isOpen) loadNotifications();
    }, [isOpen, loadNotifications]);

    // Realtime subscription
    useEffect(() => {
        if (!isOpen) return;
        const channel = supabase.channel(`notifs-${userId}`).on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'notifications',
            filter: `user_id=eq.${userId}`,
        }, (payload: any) => {
            const n = payload.new as any;
            const item: Notification = {
                id: n.id,
                organization_id: n.organization_id || orgId,
                user_id: n.user_id,
                category: (n.category as NotifCategory) || mapActionTypeToCategory(n.action_type, n.type),
                title: n.title || 'Notification',
                body: n.body || n.message || '',
                is_read: n.is_read ?? false,
                created_at: n.created_at,
                metadata: typeof n.action_data === 'string' ? JSON.parse(n.action_data || '{}') : (n.action_data || {}),
            };
            setNotifications(prev => [item, ...prev]);
        }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [isOpen, userId, orgId]);


    // Mark single as read
    const markAsRead = async (id: string) => {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    // Mark all as read
    const markAllAsRead = async () => {
        setMarkingAll(true);
        await supabase.from('notifications').update({ is_read: true })
            .eq('user_id', userId).eq('is_read', false);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setMarkingAll(false);
        toast.success('Tout marqué comme lu ✅');
    };

    // Delete notification
    const deleteNotif = async (id: string) => {
        await supabase.from('notifications').delete().eq('id', id);
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    // Handle notification click
    const handleNotifClick = (n: Notification) => {
        markAsRead(n.id);

        // Navigate based on category
        switch (n.category) {
            case 'grade':
            case 'bulletin':
            case 'evaluation':
            case 'schedule':
                onNavigate?.('myspace');
                break;
            case 'chat_dm':
                onNavigate?.('chatdm');
                break;
            case 'chat_group':
                onNavigate?.('chatdm'); // Groups are in chatdm tab
                break;
            case 'news':
                onNavigate?.('actus');
                break;
            case 'marketplace':
            case 'library':
                // These navigate to separate pages
                break;
            case 'payment':
                onNavigate?.('myspace');
                break;
            default:
                break;
        }
        onClose();
    };

    // Filter
    const filteredNotifs = activeFilter === 'all'
        ? notifications
        : notifications.filter(n => {
            const tab = FILTER_TABS.find(t => t.id === activeFilter);
            return tab?.categories.includes(n.category);
        });

    const unreadCount = notifications.filter(n => !n.is_read).length;

    // Time formatting
    const formatTime = (ts: string) => {
        const d = new Date(ts);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return "À l'instant";
        if (diffMin < 60) return `il y a ${diffMin}min`;
        if (diffHr < 24) return `il y a ${diffHr}h`;
        if (diffDay < 7) return `il y a ${diffDay}j`;
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed top-0 right-0 bottom-0 w-full max-w-md z-[70] bg-[#0B0E14] border-l border-white/5 flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-4 py-4 border-b border-white/5 bg-[#0F1219]/80 backdrop-blur-xl">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                                        <Bell className="w-4.5 h-4.5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black">Notifications</h2>
                                        <p className="text-[10px] text-slate-500">
                                            {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est lu ✅'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {unreadCount > 0 && (
                                        <Button size="sm" variant="ghost" onClick={markAllAsRead} disabled={markingAll}
                                            className="text-[10px] text-teal-400 h-7 px-2 hover:bg-teal-600/10">
                                            {markingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3 mr-1" />}
                                            Tout lire
                                        </Button>
                                    )}
                                    <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-xl transition">
                                        <X className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Filter tabs */}
                            <div className="flex gap-1 overflow-x-auto scrollbar-none pb-0.5">
                                {FILTER_TABS.map(tab => {
                                    const count = tab.id === 'all'
                                        ? notifications.filter(n => !n.is_read).length
                                        : notifications.filter(n => !n.is_read && tab.categories.includes(n.category)).length;
                                    return (
                                        <button key={tab.id} onClick={() => setActiveFilter(tab.id)}
                                            className={cn(
                                                "px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all flex items-center gap-1",
                                                activeFilter === tab.id
                                                    ? 'bg-white/10 text-white'
                                                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                                            )}>
                                            {tab.label}
                                            {count > 0 && (
                                                <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-bold flex items-center justify-center">
                                                    {count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Notifications list */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                                </div>
                            ) : filteredNotifs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                                    <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                                        <BellOff className="w-7 h-7 text-slate-600" />
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium">Aucune notification</p>
                                    <p className="text-[10px] text-slate-600 mt-1">
                                        {activeFilter === 'all'
                                            ? 'Vous êtes à jour !'
                                            : 'Aucune notification dans cette catégorie'}
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/[0.03]">
                                    {filteredNotifs.map((n, i) => {
                                        const config = CATEGORY_CONFIG[n.category] || CATEGORY_CONFIG.system;
                                        const IconComp = config.icon;

                                        return (
                                            <motion.div
                                                key={n.id}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.02 }}
                                                onClick={() => handleNotifClick(n)}
                                                className={cn(
                                                    "flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-all group",
                                                    n.is_read
                                                        ? 'hover:bg-white/[0.02]'
                                                        : 'bg-white/[0.02] hover:bg-white/[0.04]'
                                                )}
                                            >
                                                {/* Category icon */}
                                                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", config.bgColor)}>
                                                    <IconComp className={cn("w-4 h-4", config.color)} />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                {!n.is_read && (
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 animate-pulse" />
                                                                )}
                                                                <p className={cn("text-sm truncate", n.is_read ? 'text-slate-400' : 'text-white font-medium')}>
                                                                    {n.title}
                                                                </p>
                                                            </div>
                                                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                                                                {n.body}
                                                            </p>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <span className="text-[9px] text-slate-600">{formatTime(n.created_at)}</span>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }}
                                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 rounded-lg transition"
                                                            >
                                                                <Trash2 className="w-3 h-3 text-red-400" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Category badge */}
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <span className={cn("text-[9px] px-1.5 py-0.5 rounded-md font-medium", config.bgColor, config.color)}>
                                                            {config.emoji} {config.label}
                                                        </span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ═══ NOTIFICATION BELL BUTTON ═══
// Use this in headers/navbars to show notification count

interface NotifBellProps {
    orgId: string;
    userId: string;
    onClick: () => void;
}

export function NotificationBell({ orgId, userId, onClick }: NotifBellProps) {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        (async () => {
            const { count } = await supabase
                .from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_read', false);
            setUnreadCount(count || 0);
        })();

        // Realtime
        const channel = supabase.channel(`notif-count-${userId}`).on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'notifications',
            filter: `user_id=eq.${userId}`,
        }, () => {
            setUnreadCount(prev => prev + 1);
        }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [userId]);

    return (
        <button onClick={onClick} className="relative p-2 hover:bg-white/5 rounded-xl transition group">
            <Bell className="w-5 h-5 text-slate-400 group-hover:text-amber-400 transition" />
            {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-red-500 text-[9px] font-bold text-white flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
                    {unreadCount > 99 ? '99' : unreadCount}
                </span>
            )}
        </button>
    );
}

// ═══ NOTIFICATION HELPER — Create notifications server-side ═══
// Use these in your API routes / server actions to create notifications

export async function createNotification(params: {
    organizationId: string;
    userId: string;
    category: NotifCategory;
    title: string;
    body: string;
    icon?: string;
    actionUrl?: string;
    metadata?: Record<string, any>;
}) {
    const { error } = await supabase.from('notifications').insert({
        organization_id: params.organizationId,
        user_id: params.userId,
        category: params.category,
        title: params.title,
        body: params.body,
        icon: params.icon,
        action_url: params.actionUrl,
        metadata: params.metadata,
        is_read: false,
    });
    if (error) console.error('Error creating notification:', error);
    return !error;
}

// Batch create (for sending to multiple users)
export async function createBulkNotifications(params: {
    organizationId: string;
    userIds: string[];
    category: NotifCategory;
    title: string;
    body: string;
    icon?: string;
    actionUrl?: string;
    metadata?: Record<string, any>;
}) {
    const rows = params.userIds.map(uid => ({
        organization_id: params.organizationId,
        user_id: uid,
        category: params.category,
        title: params.title,
        body: params.body,
        icon: params.icon,
        action_url: params.actionUrl,
        metadata: params.metadata,
        is_read: false,
    }));
    const { error } = await supabase.from('notifications').insert(rows);
    if (error) console.error('Error creating bulk notifications:', error);
    return !error;
}
