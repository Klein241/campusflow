'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, BookOpen, Layers, FileText, Dumbbell, X, Send, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ══════════════════════════════════════════════════════════
// DISCUSS BUTTON — Bouton contextuel qui tag le sujet/chapitre/leçon
// Crée ou ouvre un groupe de discussion tagué au contexte
// ══════════════════════════════════════════════════════════

export type DiscussContext = {
    type: 'subject' | 'chapter' | 'lesson' | 'exercise';
    id: string;
    title: string;
    parentTitle?: string;   // e.g. subject name when type=chapter
};

interface DiscussButtonProps {
    context: DiscussContext;
    orgId: string;
    userId: string;
    userName: string;
    /** Called with the group conversation ID so parent can open the chat */
    onOpenChat: (convId: string, convName: string) => void;
    size?: 'sm' | 'xs';
}

const typeConfig = {
    subject:  { icon: BookOpen,  color: 'text-orange-400 hover:bg-orange-500/10 border-orange-500/20', label: 'Discuter de la matière' },
    chapter:  { icon: Layers,    color: 'text-teal-400   hover:bg-teal-500/10   border-teal-500/20',   label: 'Discuter du chapitre' },
    lesson:   { icon: FileText,  color: 'text-indigo-400 hover:bg-indigo-500/10 border-indigo-500/20', label: 'Discuter de la leçon' },
    exercise: { icon: Dumbbell,  color: 'text-violet-400 hover:bg-violet-500/10 border-violet-500/20', label: 'Discuter de l\'exercice' },
};

export function DiscussButton({ context, orgId, userId, userName, onOpenChat, size = 'sm' }: DiscussButtonProps) {
    const [loading, setLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const cfg = typeConfig[context.type];
    const Icon = cfg.icon;

    const handleDiscuss = async () => {
        setLoading(true);
        try {
            // Context tag stored as a metadata field; search by name prefix
            const groupName = context.parentTitle
                ? `💬 ${context.parentTitle} › ${context.title}`
                : `💬 ${context.title}`;
            const tagKey = `[tag:${context.type}:${context.id}]`;

            // Check if a group already exists with this tag in name
            const { data: existingGroups } = await supabase
                .from('chat_conversations')
                .select('id, name')
                .eq('organization_id', orgId)
                .eq('type', 'group')
                .ilike('name', `%${tagKey}%`);

            let convId: string;
            let convName: string;

            if (existingGroups && existingGroups.length > 0) {
                const existing = existingGroups[0];
                convId = existing.id;
                convName = existing.name;
                // Ensure user is a participant
                await supabase.from('chat_participants').upsert(
                    { conversation_id: convId, user_id: userId, role: 'member' },
                    { onConflict: 'conversation_id,user_id' }
                );
            } else {
                // Create a new tagged group
                const fullName = `${groupName} ${tagKey}`;

                const { data: newGroup, error } = await supabase
                    .from('chat_conversations')
                    .insert({
                        organization_id: orgId,
                        type: 'group',
                        name: fullName,
                        created_by: userId,
                    })
                    .select('id, name')
                    .single();

                if (error || !newGroup) throw new Error(error?.message || 'Erreur création groupe');

                convId = newGroup.id;
                convName = groupName; // display name without tag

                // Add creator as participant
                await supabase.from('chat_participants').insert({
                    conversation_id: convId,
                    user_id: userId,
                    role: 'admin',
                });

                // System message
                await supabase.from('chat_messages').insert({
                    conversation_id: convId,
                    sender_id: userId,
                    content: `Groupe de discussion créé pour : ${context.title}`,
                    msg_type: 'system',
                });

                toast.success(`Groupe "${groupName}" créé ✅`);
            }

            onOpenChat(convId, convName);
        } catch (e: any) {
            console.error('DiscussButton error:', e);
            toast.error('Impossible d\'ouvrir la discussion: ' + (e.message || 'Erreur inconnue'));
        }
        setLoading(false);
        setShowPreview(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowPreview(v => !v)}
                disabled={loading}
                title={cfg.label}
                className={cn(
                    "flex items-center gap-1 rounded-lg border transition-all",
                    cfg.color,
                    size === 'xs'
                        ? 'p-1 text-[9px]'
                        : 'px-2 py-1 text-[10px]',
                    loading && 'opacity-50 cursor-wait'
                )}>
                <Icon className={size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
                {size === 'sm' && <span>Discussion</span>}
            </button>

            <AnimatePresence>
                {showPreview && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -4 }}
                        className="absolute right-0 top-full mt-1.5 z-50 w-64 bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl p-3"
                        onClick={e => e.stopPropagation()}>

                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <Icon className={cn('w-3.5 h-3.5', cfg.color.split(' ')[0])} />
                                <p className="text-[10px] font-bold text-white">Discussion taggée</p>
                            </div>
                            <button onClick={() => setShowPreview(false)} className="text-slate-500 hover:text-white">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] mb-3">
                            <p className="text-[9px] text-slate-500 capitalize">{context.type}</p>
                            <p className="text-xs font-semibold text-white truncate">{context.title}</p>
                            {context.parentTitle && (
                                <p className="text-[9px] text-slate-500 truncate">📚 {context.parentTitle}</p>
                            )}
                        </div>

                        <p className="text-[9px] text-slate-500 mb-2 leading-relaxed">
                            Ouvre un groupe de discussion dédié à ce sujet. Tous les membres peuvent rejoindre.
                        </p>

                        <button
                            onClick={handleDiscuss}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 text-white text-xs font-medium hover:opacity-90 transition disabled:opacity-50">
                            {loading ? (
                                <span className="animate-pulse">Ouverture...</span>
                            ) : (
                                <>
                                    <Users className="w-3 h-3" />
                                    Rejoindre / Créer le groupe
                                </>
                            )}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
