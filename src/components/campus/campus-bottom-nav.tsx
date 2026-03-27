'use client';

import { motion } from 'framer-motion';
import { MessageSquare, Lock, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CampusTab = 'forum' | 'myspace' | 'profile';

interface CampusBottomNavProps {
    activeTab: CampusTab;
    onTabChange: (tab: CampusTab) => void;
    unreadCount?: number;
}

const navItems: { id: CampusTab; icon: any; label: string; gradient: string; activeGlow: string }[] = [
    {
        id: 'forum',
        icon: MessageSquare,
        label: 'Forum',
        gradient: 'from-teal-500 to-emerald-500',
        activeGlow: 'shadow-teal-500/30',
    },
    {
        id: 'myspace',
        icon: Lock,
        label: 'My Space',
        gradient: 'from-indigo-500 to-violet-500',
        activeGlow: 'shadow-indigo-500/30',
    },
    {
        id: 'profile',
        icon: User,
        label: 'Profil',
        gradient: 'from-amber-500 to-orange-500',
        activeGlow: 'shadow-amber-500/30',
    },
];

export function CampusBottomNav({ activeTab, onTabChange, unreadCount = 0 }: CampusBottomNavProps) {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[env(safe-area-inset-bottom,8px)]">
            {/* Glassmorphism backdrop */}
            <div className="relative max-w-md mx-auto">
                {/* Glow effect */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3/4 h-12 bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-amber-500/10 blur-2xl rounded-full" />
                
                <div className="relative flex items-center justify-around p-2 rounded-2xl bg-[#0F172A]/90 backdrop-blur-2xl border border-white/[0.08] shadow-[0_-8px_32px_rgba(0,0,0,0.6)]">
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={cn(
                                    "relative flex flex-col items-center justify-center w-20 h-16 rounded-xl transition-all duration-300",
                                    isActive ? "scale-[1.05]" : "hover:bg-white/[0.04]"
                                )}
                            >
                                {/* Active indicator bar */}
                                {isActive && (
                                    <motion.div
                                        layoutId="campus-tab-indicator"
                                        className={cn("absolute -top-1 w-8 h-1 rounded-full bg-gradient-to-r", item.gradient)}
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}

                                {/* Unread badge for Forum */}
                                {item.id === 'forum' && unreadCount > 0 && (
                                    <span className="absolute top-0.5 right-3 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}

                                {/* Icon */}
                                <div className={cn(
                                    "p-2 rounded-xl transition-all duration-300",
                                    isActive ? `bg-gradient-to-br ${item.gradient} shadow-lg ${item.activeGlow}` : ""
                                )}>
                                    <item.icon
                                        className={cn(
                                            "w-5 h-5 transition-all duration-300",
                                            isActive ? "text-white" : "text-slate-500"
                                        )}
                                        strokeWidth={isActive ? 2.5 : 1.8}
                                    />
                                </div>

                                {/* Label */}
                                <span className={cn(
                                    "text-[10px] mt-1 font-medium transition-all duration-300",
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
