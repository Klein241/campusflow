'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/use-org-slug';
import {
    Newspaper, Users, MessageSquare, Lock, User,
    ShoppingBag, Plus, BookOpen, Store, ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════
// CAMPUS BOTTOM NAV — 5 onglets + FAB (+) central
// FAB ouvre : Bibliothèque | Marketplace | Formulaires
// Se cache automatiquement quand une story est ouverte
// ═══════════════════════════════════════════════════════

export type CampusTab = 'actus' | 'contacts' | 'chatdm' | 'myspace' | 'shop' | 'profile' | 'library' | 'marketplace' | 'forms';

interface CampusBottomNavProps {
    activeTab: CampusTab;
    onTabChange: (tab: CampusTab) => void;
    unreadCount?: number;
    userPhotoUrl?: string | null;
    userRole?: string;
}

// Nav items de base (sans FAB — il est injecté au centre)
const navItems: { id: CampusTab; icon: any; label: string; gradient: string; activeGlow: string }[] = [
    { id: 'actus',    icon: Newspaper,    label: 'Actus',    gradient: 'from-amber-500 to-orange-500',  activeGlow: 'shadow-amber-500/30'  },
    { id: 'contacts', icon: Users,         label: 'Contacts', gradient: 'from-indigo-500 to-violet-500', activeGlow: 'shadow-indigo-500/30' },
    // FAB (+) est ici au centre — voir JSX
    { id: 'myspace',  icon: Lock,          label: 'My Space', gradient: 'from-teal-500 to-emerald-500',  activeGlow: 'shadow-teal-500/30'   },
    { id: 'shop',     icon: ShoppingBag,   label: 'Shop',     gradient: 'from-sky-500 to-blue-600',      activeGlow: 'shadow-sky-500/30'    },
    { id: 'profile',  icon: User,          label: 'Profil',   gradient: 'from-rose-500 to-pink-500',     activeGlow: 'shadow-rose-500/30'   },
];

// Items du menu FAB
const fabItems: { id: CampusTab; icon: any; label: string; gradient: string; emoji: string }[] = [
    { id: 'library',     icon: BookOpen,      label: 'Bibliothèque', gradient: 'from-amber-500 to-yellow-500',  emoji: '📚' },
    { id: 'marketplace', icon: Store,         label: 'Marketplace',  gradient: 'from-emerald-500 to-teal-600',  emoji: '🛍️' },
    { id: 'forms',       icon: ClipboardList, label: 'Formulaires',  gradient: 'from-violet-500 to-indigo-600', emoji: '📋' },
];

function NavButton({
    item, isActive, onClick, unreadCount, userPhotoUrl,
}: {
    item: typeof navItems[0];
    isActive: boolean;
    onClick: () => void;
    unreadCount?: number;
    userPhotoUrl?: string | null;
}) {
    const isProfileTab = item.id === 'profile';
    return (
        <button
            onClick={onClick}
            className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-14 rounded-xl transition-all duration-300",
                isActive ? "scale-[1.02]" : "hover:bg-white/[0.04]"
            )}
        >
            {isActive && (
                <motion.div
                    layoutId="campus-tab-indicator"
                    className={cn("absolute -top-0.5 w-6 h-0.5 rounded-full bg-gradient-to-r", item.gradient)}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
            )}
            {item.id === 'chatdm' && (unreadCount ?? 0) > 0 && (
                <span className="absolute top-0 right-1 w-4 h-4 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
                    {(unreadCount ?? 0) > 9 ? '9+' : unreadCount}
                </span>
            )}
            {isProfileTab && userPhotoUrl ? (
                <div className={cn(
                    "w-7 h-7 rounded-full overflow-hidden border-2 transition-all duration-300",
                    isActive ? "border-rose-400 shadow-lg shadow-rose-500/40 scale-110" : "border-white/20"
                )}>
                    <img
                        src={userPhotoUrl}
                        alt="Mon profil"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                </div>
            ) : (
                <div className={cn(
                    "p-1.5 rounded-xl transition-all duration-300",
                    isActive ? `bg-gradient-to-br ${item.gradient} shadow-lg ${item.activeGlow}` : ""
                )}>
                    <item.icon
                        className={cn("w-[18px] h-[18px] transition-all duration-300", isActive ? "text-white" : "text-slate-500")}
                        strokeWidth={isActive ? 2.5 : 1.8}
                    />
                </div>
            )}
            <span className={cn(
                "text-[9px] mt-0.5 font-medium transition-all duration-300",
                isActive ? "text-white font-semibold" : "text-slate-500"
            )}>
                {item.label}
            </span>
        </button>
    );
}

export function CampusBottomNav({
    activeTab,
    onTabChange,
    unreadCount = 0,
    userPhotoUrl,
    userRole,
}: CampusBottomNavProps) {
    const router = useRouter();
    const orgSlug = useOrgSlug();
    const [storyOpen, setStoryOpen] = useState(false);
    const [fabOpen, setFabOpen] = useState(false);

    useEffect(() => {
        const check = () => setStoryOpen(document.body.hasAttribute('data-story-open'));
        check();
        const observer = new MutationObserver(check);
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-story-open'] });
        return () => observer.disconnect();
    }, []);

    // Ferme le FAB quand on clique ailleurs
    useEffect(() => {
        if (!fabOpen) return;
        const close = () => setFabOpen(false);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [fabOpen]);

    const handleFabItemClick = (tabId: CampusTab) => {
        setFabOpen(false);
        if (tabId === 'marketplace') {
            router.push(`/${orgSlug}/shop`);
            return;
        }
        if (tabId === 'library') {
            router.push(`/${orgSlug}/library`);
            return;
        }
        // 'forms' → onglet campus inline
        onTabChange(tabId);
    };

    const leftItems  = navItems.slice(0, 2);
    const rightItems = navItems.slice(2);

    return (
        <AnimatePresence>
            {!storyOpen && (
                <motion.div
                    key="bottom-nav"
                    initial={{ y: 0, opacity: 1 }}
                    exit={{ y: 80, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-[env(safe-area-inset-bottom,6px)]"
                >
                    <div className="relative max-w-lg mx-auto">
                        {/* Ambient glow */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4/5 h-10 bg-gradient-to-r from-amber-500/8 via-teal-500/8 to-rose-500/8 blur-2xl rounded-full" />

                        {/* ─── FAB Sub-menu (apparaît AU-DESSUS du nav) ─── */}
                        <AnimatePresence>
                            {fabOpen && (
                                <>
                                    {/* Backdrop teinté */}
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                                        onClick={() => setFabOpen(false)}
                                    />

                                    {/* Boutons FAB items */}
                                    <div className="absolute bottom-[72px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-50 pb-2">
                                        {fabItems.map((item, i) => (
                                            <motion.button
                                                key={item.id}
                                                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.85 }}
                                                transition={{
                                                    type: 'spring',
                                                    stiffness: 400,
                                                    damping: 28,
                                                    delay: i * 0.06,
                                                }}
                                                onClick={(e) => { e.stopPropagation(); handleFabItemClick(item.id); }}
                                                className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#0F172A]/95 backdrop-blur-xl border border-white/10 shadow-2xl hover:border-white/20 transition-all group active:scale-95"
                                            >
                                                <div className={cn(
                                                    "w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg shrink-0 group-hover:scale-110 transition-transform",
                                                    item.gradient
                                                )}>
                                                    <item.icon className="w-4.5 h-4.5 text-white" strokeWidth={2} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-semibold text-white leading-tight">{item.label}</p>
                                                    <p className="text-[10px] text-slate-400 leading-tight">
                                                        {item.id === 'library'     && 'Cours & documents'}
                                                        {item.id === 'marketplace' && 'Achats & offres'}
                                                        {item.id === 'forms'       && 'Sondages, quiz & inscriptions'}
                                                    </p>
                                                </div>
                                                <span className="text-lg ml-1">{item.emoji}</span>
                                            </motion.button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </AnimatePresence>

                        {/* ─── Bottom Nav Bar ─── */}
                        <div className="relative flex items-center justify-around p-1.5 rounded-2xl bg-[#0F172A]/90 backdrop-blur-2xl border border-white/[0.08] shadow-[0_-8px_32px_rgba(0,0,0,0.6)]">

                            {/* Left nav items */}
                            {leftItems.map((item) => (
                                <NavButton
                                    key={item.id}
                                    item={item}
                                    isActive={activeTab === item.id}
                                    onClick={() => onTabChange(item.id)}
                                    unreadCount={unreadCount}
                                    userPhotoUrl={userPhotoUrl}
                                />
                            ))}

                            {/* ─── FAB Central (+) ─── */}
                            <div className="relative flex-1 flex items-center justify-center h-14">
                                <motion.button
                                    onClick={(e) => { e.stopPropagation(); setFabOpen((v) => !v); }}
                                    whileTap={{ scale: 0.9 }}
                                    className="relative w-13 h-13 z-50"
                                    style={{ width: 52, height: 52 }}
                                    aria-label="Menu rapide"
                                >
                                    {/* Glow ring animé */}
                                    <motion.div
                                        animate={fabOpen
                                            ? { scale: 1.4, opacity: 0.3 }
                                            : { scale: [1, 1.15, 1], opacity: [0.2, 0.35, 0.2] }
                                        }
                                        transition={fabOpen
                                            ? { duration: 0.2 }
                                            : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
                                        }
                                        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 blur-md"
                                    />
                                    {/* Bouton principal */}
                                    <div className={cn(
                                        "relative w-full h-full rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300",
                                        "bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600",
                                        "shadow-blue-500/40 shadow-lg"
                                    )}>
                                        <motion.div
                                            animate={{ rotate: fabOpen ? 45 : 0 }}
                                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                        >
                                            <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
                                        </motion.div>
                                    </div>
                                </motion.button>
                            </div>

                            {/* Right nav items */}
                            {rightItems.map((item) => (
                                <NavButton
                                    key={item.id}
                                    item={item}
                                    isActive={activeTab === item.id}
                                    onClick={() => onTabChange(item.id)}
                                    unreadCount={unreadCount}
                                    userPhotoUrl={userPhotoUrl}
                                />
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
