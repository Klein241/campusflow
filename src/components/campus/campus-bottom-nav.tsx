'use client';

import { motion } from 'framer-motion';
import { Newspaper, Users, MessageSquare, Lock, User, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════
// CAMPUS BOTTOM NAV — 5 onglets séparés
// Actus, Contacts, Chat DM, My Space, Profil
// Chaque onglet a son propre espace dédié
// ═══════════════════════════════════════════════════════

export type CampusTab = 'actus' | 'contacts' | 'chatdm' | 'myspace' | 'forms' | 'profile';

interface CampusBottomNavProps {
    activeTab: CampusTab;
    onTabChange: (tab: CampusTab) => void;
    unreadCount?: number;
}

const navItems: { id: CampusTab; icon: any; label: string; gradient: string; activeGlow: string }[] = [
    {
        id: 'actus',
        icon: Newspaper,
        label: 'Actus',
        gradient: 'from-amber-500 to-orange-500',
        activeGlow: 'shadow-amber-500/30',
    },
    {
        id: 'contacts',
        icon: Users,
        label: 'Contacts',
        gradient: 'from-indigo-500 to-violet-500',
        activeGlow: 'shadow-indigo-500/30',
    },
    {
        id: 'chatdm',
        icon: MessageSquare,
        label: 'Messages',
        gradient: 'from-cyan-500 to-blue-500',
        activeGlow: 'shadow-cyan-500/30',
    },
    {
        id: 'myspace',
        icon: Lock,
        label: 'My Space',
        gradient: 'from-teal-500 to-emerald-500',
        activeGlow: 'shadow-teal-500/30',
    },
    {
        id: 'forms',
        icon: ClipboardList,
        label: 'Forms',
        gradient: 'from-indigo-500 to-violet-500',
        activeGlow: 'shadow-indigo-500/30',
    },
    {
        id: 'profile',
        icon: User,
        label: 'Profil',
        gradient: 'from-rose-500 to-pink-500',
        activeGlow: 'shadow-rose-500/30',
    },
];

export function CampusBottomNav({ activeTab, onTabChange, unreadCount = 0 }: CampusBottomNavProps) {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-[env(safe-area-inset-bottom,6px)]">
            {/* Glassmorphism backdrop */}
            <div className="relative max-w-lg mx-auto">
                {/* Glow effect */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4/5 h-10 bg-gradient-to-r from-amber-500/8 via-teal-500/8 to-rose-500/8 blur-2xl rounded-full" />
                
                <div className="relative flex items-center justify-around p-1.5 rounded-2xl bg-[#0F172A]/90 backdrop-blur-2xl border border-white/[0.08] shadow-[0_-8px_32px_rgba(0,0,0,0.6)]">
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={cn(
                                    "relative flex flex-col items-center justify-center flex-1 h-14 rounded-xl transition-all duration-300",
                                    isActive ? "scale-[1.02]" : "hover:bg-white/[0.04]"
                                )}
                            >
                                {/* Active indicator bar */}
                                {isActive && (
                                    <motion.div
                                        layoutId="campus-tab-indicator"
                                        className={cn("absolute -top-0.5 w-6 h-0.5 rounded-full bg-gradient-to-r", item.gradient)}
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}

                                {/* Unread badge for Chat DM */}
                                {item.id === 'chatdm' && unreadCount > 0 && (
                                    <span className="absolute top-0 right-1 w-4 h-4 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}

                                {/* Icon */}
                                <div className={cn(
                                    "p-1.5 rounded-xl transition-all duration-300",
                                    isActive ? `bg-gradient-to-br ${item.gradient} shadow-lg ${item.activeGlow}` : ""
                                )}>
                                    <item.icon
                                        className={cn(
                                            "w-[18px] h-[18px] transition-all duration-300",
                                            isActive ? "text-white" : "text-slate-500"
                                        )}
                                        strokeWidth={isActive ? 2.5 : 1.8}
                                    />
                                </div>

                                {/* Label */}
                                <span className={cn(
                                    "text-[9px] mt-0.5 font-medium transition-all duration-300",
                                    isActive ? "text-white font-semibold" : "text-slate-500"
                                )}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
