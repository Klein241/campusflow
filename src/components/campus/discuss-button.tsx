'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, BookOpen, Layers, FileText, Dumbbell, X, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ══════════════════════════════════════════════════════════
// DISCUSS BUTTON — Ouvre le groupe de discussion unique par sujet
// Utilise le RPC join_or_create_topic_group (SECURITY DEFINER)
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
    exercise: { icon: Dumbbell,  color: 'text-violet-400 hover:bg-violet-500/10 border-violet-500/20', label: "Discuter de l'exercice" },
};

export function DiscussButton({ context, orgId, userId, userName, onOpenChat, size = 'sm' }: DiscussButtonProps) {
    const [loading, setLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const cfg = typeConfig[context.type];
    const Icon = cfg.icon;

    // For exercises we fall back to the old tag-based approach since they don't
    // need the unique-group constraint (multiple groups per exercise OK).
    const handleDiscuss = async () => {
        setLoading(true);
        try {
            if (context.type === 'exercise') {
                // Legacy: tag-based group for exercises
                await handleExerciseDiscuss();
            } else {
                // New: RPC for subject/chapter/lesson — guarantees uniqueness
                await handleTopicGroupRpc();
            }
        } catch (e: any) {
            console.error('DiscussButton error:', e);
            toast.error("Impossible d'ouvrir la discussion: " + (e.message || 'Erreur inconnue'));
        }
        setLoading(false);
        setShowPreview(false);
    };

    const handleTopicGroupRpc = async () => {
        const topicName = context.parentTitle
            ? `${context.parentTitle} › ${context.title}`
            : context.title;

        const { data, error } = await supabase.rpc('join_or_create_topic_group', {
            p_org_id:     orgId,
            p_user_id:    userId,
            p_user_role:  'student', // overridden by teacher components that pass a prop
            p_topic_type: context.type,
            p_topic_id:   context.id,
            p_topic_name: topicName,
        });

        if (error) throw new Error(error.message);

        const result = data as { conversation_id: string; conversation_name: string; created: boolean; member_count: number };
        const convName = result.conversation_name || `💬 ${topicName}`;

        if (result.created) {
            toast.success(`Groupe "${convName}" créé ✅`);
        } else {
            toast.success(`Groupe rejoint (${result.member_count} membres) 👥`);
        }
        onOpenChat(result.conversation_id, convName);
    };

    const handleExerciseDiscuss = async () => {
        const groupName = context.parentTitle
            ? `💬 ${context.parentTitle} › ${context.title}`
            : `💬 ${context.title}`;
        const tagKey = `[tag:${context.type}:${context.id}]`;

        const { data: existingGroups } = await supabase
            .from('chat_conversations')
            .select('id, name')
            .eq('organization_id', orgId)
            .eq('type', 'group')
            .ilike('name', `%${tagKey}%`);

        let convId: string;
        let convName: string;

        if (existingGroups && existingGroups.length > 0) {
            convId = existingGroups[0].id;
            convName = existingGroups[0].name;
            await supabase.from('chat_participants').upsert(
                { conversation_id: convId, user_id: userId, role: 'member' },
                { onConflict: 'conversation_id,user_id' }
            );
        } else {
            const fullName = `${groupName} ${tagKey}`;
            const { data: newGroup, error } = await supabase
                .from('chat_conversations')
                .insert({ organization_id: orgId, type: 'group', name: fullName, created_by: userId })
                .select('id, name')
                .single();
            if (error || !newGroup) throw new Error(error?.message || 'Erreur création groupe');
            convId = newGroup.id;
            convName = groupName;
            await supabase.from('chat_participants').insert({ conversation_id: convId, user_id: userId, role: 'admin' });
            await supabase.from('chat_messages').insert({
                conversation_id: convId, sender_id: userId,
                content: `Groupe de discussion créé pour : ${context.title}`, msg_type: 'system',
            });
            toast.success(`Groupe "${groupName}" créé ✅`);
        }
        onOpenChat(convId, convName);
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
                {loading
                    ? <Loader2 className={cn('animate-spin', size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
                    : <Icon className={size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />}
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
                                <p className="text-[10px] font-bold text-white">{cfg.label}</p>
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

                        <p className="text-[9px] text-slate-500 mb-3 leading-relaxed">
                            {context.type === 'exercise'
                                ? "Ouvre un groupe de discussion pour cet exercice."
                                : "Un seul groupe par sujet — rejoignez ou créez automatiquement."}
                        </p>

                        <button
                            onClick={handleDiscuss}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 text-white text-xs font-medium hover:opacity-90 transition disabled:opacity-50">
                            {loading ? (
                                <><Loader2 className="w-3 h-3 animate-spin" />Ouverture...</>
                            ) : (
                                <><Users className="w-3 h-3" />Rejoindre / Créer le groupe</>
                            )}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
