'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, Award } from 'lucide-react';
import { useSkyAgent, type SkyAgentRole, type SkyAgentContext } from '@/hooks/use-sky-agent';
import { SkyAgentChat } from './SkyAgentChat';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
//  Dame SKY Floating Bubble
//  Bouton prestigieux d'accès rapide au mentorat de Dame SKY
//  (Aucune icône de tête de robot)
// ─────────────────────────────────────────────────────────────────────────────

interface SkyAgentBubbleProps {
    role: SkyAgentRole;
    context?: SkyAgentContext;
    bottomOffset?: string;
}

const roleTheme: Record<SkyAgentRole, { gradient: string; glow: string; badge: string }> = {
    admin: {
        gradient: 'from-amber-500 via-orange-500 to-rose-600',
        glow: 'shadow-[0_0_28px_rgba(245,158,11,0.55)]',
        badge: 'Admin',
    },
    prof: {
        gradient: 'from-teal-500 via-indigo-600 to-purple-600',
        glow: 'shadow-[0_0_28px_rgba(20,184,166,0.55)]',
        badge: 'Pédago',
    },
    student: {
        gradient: 'from-indigo-500 via-purple-600 to-rose-600',
        glow: 'shadow-[0_0_28px_rgba(139,92,246,0.55)]',
        badge: 'Mentor',
    },
};

export function SkyAgentBubble({ role, context, bottomOffset = 'bottom-6 md:bottom-8' }: SkyAgentBubbleProps) {
    const {
        messages, isLoading, isOpen,
        sendMessage, clearSession, toggleChat, closeChat,
    } = useSkyAgent(role, context);

    const theme = roleTheme[role] || roleTheme.student;
    const hasNewMessage = !isOpen && messages.length > 0 &&
        messages[messages.length - 1]?.role === 'assistant';

    return (
        <>
            {/* ── Chat Panel Dame SKY ── */}
            <SkyAgentChat
                role={role}
                context={context}
                isOpen={isOpen}
                onClose={closeChat}
                messages={messages}
                isLoading={isLoading}
                sendMessage={sendMessage}
                clearSession={clearSession}
            />

            {/* ── Bouton Flottant Prestigieux ── */}
            <div className={cn('fixed right-4 z-[9998] flex items-center gap-2 group', bottomOffset)}>
                {/* Infobulle élégante au survol */}
                {!isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        whileHover={{ opacity: 1, x: 0 }}
                        className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F1423]/90 border border-amber-500/30 text-amber-200 text-xs shadow-xl backdrop-blur-md pointer-events-none"
                    >
                        <Crown className="w-3.5 h-3.5 text-amber-300" />
                        <span className="font-semibold">Consulter Dame SKY</span>
                    </motion.div>
                )}

                <motion.button
                    id="dame-sky-bubble"
                    onClick={toggleChat}
                    className={cn(
                        'relative w-14 h-14 rounded-2xl flex items-center justify-center border border-amber-300/40 cursor-pointer',
                        `bg-gradient-to-br ${theme.gradient}`,
                        isOpen ? 'shadow-xl' : theme.glow,
                    )}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    aria-label="Ouvrir Dame SKY"
                >
                    {/* Anneau d'impulsion */}
                    <AnimatePresence>
                        {hasNewMessage && !isOpen && (
                            <motion.span
                                className={cn(
                                    'absolute inset-0 rounded-2xl bg-gradient-to-br',
                                    theme.gradient,
                                )}
                                initial={{ scale: 1, opacity: 0.6 }}
                                animate={{ scale: 1.5, opacity: 0 }}
                                exit={{ scale: 1, opacity: 0 }}
                                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                            />
                        )}
                    </AnimatePresence>

                    {/* Icône de Dame SKY (Crown & Sparkles - Pas de tête de robot) */}
                    <motion.div
                        animate={{ rotate: isOpen ? 180 : 0, scale: isOpen ? 0.85 : 1 }}
                        transition={{ duration: 0.3 }}
                        className="relative"
                    >
                        <Crown className="w-6 h-6 text-amber-100 drop-shadow-md" />
                        <Sparkles className="w-3 h-3 text-white absolute -top-1 -right-1" />
                    </motion.div>

                    {/* Badge de nouveau message */}
                    <AnimatePresence>
                        {hasNewMessage && !isOpen && (
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-[#0B0E17] rounded-full shadow"
                            />
                        )}
                    </AnimatePresence>
                </motion.button>
            </div>
        </>
    );
}
