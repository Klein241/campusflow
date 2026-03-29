'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, Plus, Loader2, Heart, Send, X, Share2,
    ShieldCheck, Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════
// ACTUS VIEW — Espace dédié aux actualités de l'école
// Publications avec image + nom + badge admin
// ═══════════════════════════════════════════════════════

interface ActusViewProps {
    orgId: string;
    orgSlug: string;
    userId: string;
    userName: string;
    userRole: string;
}

interface PostItem {
    id: string;
    user_id: string;
    content: string;
    category: string;
    photos: string[];
    is_anonymous: boolean;
    prayer_count: number;
    prayed_by: string[];
    created_at: string;
    senderName?: string;
    senderRole?: string;
    isAdmin?: boolean;
    avatarUrl?: string;
}

export function ActusView({ orgId, orgSlug, userId, userName, userRole }: ActusViewProps) {
    const [posts, setPosts] = useState<PostItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewPost, setShowNewPost] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [publishing, setPublishing] = useState(false);

    // ═══ LOAD POSTS ═══
    useEffect(() => {
        loadPosts();
    }, [orgId]);

    const loadPosts = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('tutoring_requests')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (data) {
                // Get org owner for admin badge
                const { data: orgData } = await supabase
                    .from('organizations')
                    .select('owner_id')
                    .eq('id', orgId)
                    .single();
                const ownerId = orgData?.owner_id;

                const enriched = await Promise.all(data.map(async (p: any) => {
                    let senderName = 'Membre';
                    let senderRole = '';
                    let isAdmin = false;
                    let avatarUrl: string | undefined;

                    // Check if admin (org owner)
                    if (p.user_id === ownerId) {
                        isAdmin = true;
                        senderName = 'Administration';
                        senderRole = 'Admin';
                    } else {
                        // Check teacher
                        const { data: teacher } = await supabase.from('teacher_profiles')
                            .select('first_name, last_name, photo_url').eq('id', p.user_id).single();
                        if (teacher) {
                            senderName = `${teacher.first_name} ${teacher.last_name}`;
                            senderRole = 'Professeur';
                            avatarUrl = teacher.photo_url || undefined;
                        } else {
                            // Check student
                            const { data: student } = await supabase.from('student_profiles')
                                .select('first_name, last_name, photo_url').eq('id', p.user_id).single();
                            if (student) {
                                senderName = `${student.first_name} ${student.last_name}`;
                                senderRole = 'Étudiant';
                                avatarUrl = student.photo_url || undefined;
                            }
                        }
                    }
                    return { ...p, senderName, senderRole, isAdmin, avatarUrl } as PostItem;
                }));
                setPosts(enriched);
            }
        } catch (e) {
            console.error('Error loading posts:', e);
        }
        setLoading(false);
    };

    // ═══ PUBLISH POST ═══
    const publishPost = async () => {
        if (!newPostContent.trim()) return;
        setPublishing(true);
        try {
            const { error } = await supabase.from('tutoring_requests').insert({
                user_id: userId,
                content: newPostContent.trim(),
                category: 'post',
                is_anonymous: false,
                prayer_count: 0,
                prayed_by: [],
            });
            if (error) throw error;
            toast.success('Publication partagée ! 🎉');
            setNewPostContent('');
            setShowNewPost(false);
            loadPosts();
        } catch (e: any) {
            toast.error(e.message || 'Erreur de publication');
        }
        setPublishing(false);
    };

    // ═══ LIKE POST ═══
    const likePost = async (post: PostItem) => {
        const alreadyLiked = post.prayed_by?.includes(userId);
        const newCount = alreadyLiked ? Math.max(0, post.prayer_count - 1) : post.prayer_count + 1;
        const newBy = alreadyLiked ? post.prayed_by.filter(id => id !== userId) : [...(post.prayed_by || []), userId];

        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, prayer_count: newCount, prayed_by: newBy } : p));

        await supabase.from('tutoring_requests').update({
            prayer_count: newCount,
            prayed_by: newBy,
        }).eq('id', post.id);
    };

    const timeAgo = (ts: string) => {
        const diff = Date.now() - new Date(ts).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "à l'instant";
        if (mins < 60) return `il y a ${mins}min`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `il y a ${hours}h`;
        const days = Math.floor(hours / 24);
        return `il y a ${days}j`;
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-black bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                        📢 Actualités
                    </h2>
                    <p className="text-[10px] text-slate-500">{posts.length} publication(s)</p>
                </div>
                <Button size="sm" onClick={() => setShowNewPost(true)}
                    className="bg-gradient-to-r from-amber-600 to-orange-600 text-xs rounded-xl shadow-lg shadow-amber-600/20">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Publier
                </Button>
            </div>

            {/* New Post Dialog */}
            <AnimatePresence>
                {showNewPost && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden">
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-amber-300">📢 Nouvelle publication</h3>
                                <button onClick={() => setShowNewPost(false)}><X className="w-4 h-4 text-slate-400" /></button>
                            </div>
                            <textarea
                                value={newPostContent}
                                onChange={e => setNewPostContent(e.target.value)}
                                placeholder="Partagez une actualité avec l'école..."
                                rows={3}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-amber-500/30"
                                autoFocus
                            />
                            <div className="flex justify-end">
                                <Button onClick={publishPost} disabled={publishing || !newPostContent.trim()}
                                    className="bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs rounded-xl shadow-lg shadow-amber-600/20">
                                    {publishing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                                    Publier
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Posts Feed */}
            {loading ? (
                <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-400" /></div>
            ) : posts.length === 0 ? (
                <div className="text-center py-16">
                    <TrendingUp className="w-14 h-14 mx-auto mb-3 text-slate-700" />
                    <p className="text-sm text-slate-500">Pas encore de publications</p>
                    <p className="text-xs text-slate-600 mt-1">Soyez le premier à partager une actu !</p>
                </div>
            ) : posts.map((post, i) => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all group">
                    <div className="flex items-start gap-3">
                        {/* Avatar */}
                        {post.avatarUrl ? (
                            <img src={post.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/10" />
                        ) : (
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0",
                                post.isAdmin
                                    ? "bg-gradient-to-br from-yellow-500 to-amber-600"
                                    : "bg-gradient-to-br from-teal-600 to-indigo-600"
                            )}>
                                {post.is_anonymous ? '?' : (post.senderName || 'M').split(' ').map(w => w[0]).join('').slice(0, 2)}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">{post.is_anonymous ? 'Anonyme' : post.senderName}</span>
                                {/* Admin badge */}
                                {post.isAdmin && (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-300 border border-yellow-500/20">
                                        <ShieldCheck className="w-2.5 h-2.5" /> Admin
                                    </span>
                                )}
                                {/* Role badge */}
                                {post.senderRole && !post.isAdmin && (
                                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full",
                                        post.senderRole === 'Professeur' ? 'bg-indigo-500/15 text-indigo-400' : 'bg-teal-500/15 text-teal-400'
                                    )}>{post.senderRole}</span>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">{timeAgo(post.created_at)}</p>
                        </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-200 leading-relaxed whitespace-pre-line">{post.content}</p>
                    
                    {/* Photos */}
                    {post.photos && post.photos.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            {post.photos.map((photo, pi) => (
                                <img key={pi} src={photo} alt="" className="rounded-xl w-full h-32 object-cover border border-white/10" />
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
                        <button onClick={() => likePost(post)}
                            className={cn("flex items-center gap-1.5 text-xs transition-all",
                                post.prayed_by?.includes(userId) ? 'text-red-400' : 'text-slate-500 hover:text-red-400'
                            )}>
                            <Heart className={cn("w-4 h-4", post.prayed_by?.includes(userId) && 'fill-current')} />
                            <span>{post.prayer_count || 0}</span>
                        </button>
                        <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-teal-400 transition-colors">
                            <Share2 className="w-4 h-4" />
                            <span>Partager</span>
                        </button>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
