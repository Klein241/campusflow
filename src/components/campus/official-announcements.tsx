'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, X, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface OfficialAnnouncementsProps {
    orgId: string;
}

export function OfficialAnnouncements({ orgId }: OfficialAnnouncementsProps) {
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [dismissed, setDismissed]         = useState<Set<string>>(new Set());
    const [expanded, setExpanded]           = useState<string | null>(null);

    useEffect(() => {
        if (!orgId) return;
        (async () => {
            const { data } = await supabase
                .from('organization_announcements')
                .select('*')
                .eq('organization_id', orgId)
                .order('sent_at', { ascending: false })
                .limit(5);
            if (data) setAnnouncements(data);
        })();
    }, [orgId]);

    const visible = announcements.filter(a => !dismissed.has(a.id));
    if (visible.length === 0) return null;

    return (
        <div className="space-y-2 mb-4">
            <AnimatePresence>
                {visible.map(ann => (
                    <motion.div key={ann.id}
                        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                        className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] overflow-hidden">
                        <div className="flex items-start gap-3 p-3">
                            {/* Icon */}
                            <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                <Megaphone className="w-4 h-4 text-violet-400" />
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/30 text-violet-300 border border-violet-500/30 font-bold uppercase tracking-wider">
                                        🔥 OFFICIEL
                                    </span>
                                    <p className="text-sm font-bold text-white truncate">{ann.title}</p>
                                </div>
                                <AnimatePresence>
                                    {expanded === ann.id ? (
                                        <motion.p key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                            className="text-xs text-slate-300 mt-1 leading-relaxed overflow-hidden">
                                            {ann.body}
                                        </motion.p>
                                    ) : (
                                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{ann.body}</p>
                                    )}
                                </AnimatePresence>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <button onClick={() => setExpanded(expanded === ann.id ? null : ann.id)}
                                        className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-0.5">
                                        {expanded === ann.id ? <><ChevronUp className="w-3 h-3" />Réduire</> : <><ChevronDown className="w-3 h-3" />Lire</>}
                                    </button>
                                    <span className="text-[10px] text-slate-600">
                                        {new Date(ann.sent_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                            </div>
                            {/* Dismiss */}
                            <button onClick={() => setDismissed(prev => new Set([...prev, ann.id]))}
                                className="w-6 h-6 rounded-full bg-white/[0.05] flex items-center justify-center text-slate-500 hover:text-white shrink-0">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
