'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, Plus, Loader2, Heart, Send, X, Share2,
    ShieldCheck, Image as ImageIcon, MessageCircle, ChevronLeft,
    ChevronRight, Globe, Users, UserCheck, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/compress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════
// ACTUS VIEW — Actualités + Stories + Comments + Partage
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

interface StoryItem {
    id: string;
    user_id: string;
    content: string;
    image_url: string | null;
    visibility: string;
    created_at: string;
    expires_at: string;
    senderName?: string;
    avatarUrl?: string;
}

interface CommentItem {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    created_at: string;
    senderName?: string;
    avatarUrl?: string;
}

export function ActusView({ orgId, orgSlug, userId, userName, userRole }: ActusViewProps) {
    const [posts, setPosts] = useState<PostItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewPost, setShowNewPost] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [publishing, setPublishing] = useState(false);

    // Stories
    const [stories, setStories] = useState<StoryItem[]>([]);
    const [showNewStory, setShowNewStory] = useState(false);
    const [storyText, setStoryText] = useState('');
    const [storyImage, setStoryImage] = useState<File | null>(null);
    const [storyImagePreview, setStoryImagePreview] = useState('');
    const [storyVisibility, setStoryVisibility] = useState<'public' | 'friends' | 'selected'>('public');
    const [publishingStory, setPublishingStory] = useState(false);
    const [viewingStory, setViewingStory] = useState<StoryItem | null>(null);
    const [storyIndex, setStoryIndex] = useState(0);
    const storyScrollRef = useRef<HTMLDivElement>(null);

    // Comments
    const [comments, setComments] = useState<Record<string, CommentItem[]>>({});
    const [expandedComments, setExpandedComments] = useState<string | null>(null);
    const [newComment, setNewComment] = useState('');
    const [postingComment, setPostingComment] = useState(false);

    // Contacts for "selected" visibility
    const [contacts, setContacts] = useState<any[]>([]);
    const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
    const [contactSearch, setContactSearch] = useState('');

    // ═══ LOAD POSTS ═══
    useEffect(() => { loadPosts(); loadStories(); }, [orgId]);

    const resolveUser = async (uid: string, ownerId?: string) => {
        let senderName = 'Membre';
        let senderRole = '';
        let isAdmin = false;
        let avatarUrl: string | undefined;

        if (uid === ownerId) {
            isAdmin = true; senderName = 'Administration'; senderRole = 'Admin';
        } else {
            const { data: teacher } = await supabase.from('teacher_profiles')
                .select('first_name, last_name, photo_url').eq('id', uid).single();
            if (teacher) {
                senderName = `${teacher.first_name} ${teacher.last_name}`;
                senderRole = 'Professeur'; avatarUrl = teacher.photo_url || undefined;
            } else {
                const { data: student } = await supabase.from('student_profiles')
                    .select('first_name, last_name, photo_url').eq('id', uid).single();
                if (student) {
                    senderName = `${student.first_name} ${student.last_name}`;
                    senderRole = 'Étudiant'; avatarUrl = student.photo_url || undefined;
                }
            }
        }
        return { senderName, senderRole, isAdmin, avatarUrl };
    };

    const loadPosts = async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from('tutoring_requests').select('*')
                .order('created_at', { ascending: false }).limit(50);
            if (data) {
                const { data: orgData } = await supabase.from('organizations')
                    .select('owner_id').eq('id', orgId).single();
                const ownerId = orgData?.owner_id;
                const enriched = await Promise.all(data.map(async (p: any) => {
                    const user = await resolveUser(p.user_id, ownerId);
                    return { ...p, ...user } as PostItem;
                }));
                setPosts(enriched);
            }
        } catch (e) { console.error('Error loading posts:', e); }
        setLoading(false);
    };

    const loadStories = async () => {
        try {
            const { data } = await supabase.from('stories').select('*')
                .eq('organization_id', orgId)
                .gte('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false });
            if (data) {
                const enriched = await Promise.all(data.map(async (s: any) => {
                    const user = await resolveUser(s.user_id);
                    return { ...s, senderName: user.senderName, avatarUrl: user.avatarUrl } as StoryItem;
                }));
                // Filter by visibility
                const visible = enriched.filter(s => {
                    if (s.visibility === 'public') return true;
                    if (s.user_id === userId) return true;
                    if (s.visibility === 'selected') {
                        const raw = (s as any).visible_to;
                        return Array.isArray(raw) && raw.includes(userId);
                    }
                    return true; // 'friends' = everyone for now
                });
                setStories(visible);
            }
        } catch (e) { console.error('Error loading stories:', e); }
    };

    const loadContacts = async () => {
        const { data: teachers } = await supabase.from('teacher_profiles')
            .select('id, first_name, last_name, photo_url').eq('organization_id', orgId);
        const { data: students } = await supabase.from('student_profiles')
            .select('id, first_name, last_name, photo_url').eq('organization_id', orgId).eq('is_active', true);
        setContacts([...(teachers || []).map(t => ({ ...t, role: 'Prof' })), ...(students || []).map(s => ({ ...s, role: 'Étudiant' }))].filter(c => c.id !== userId));
    };

    // ═══ PUBLISH POST ═══
    const publishPost = async () => {
        if (!newPostContent.trim()) return;
        setPublishing(true);
        try {
            const { error } = await supabase.from('tutoring_requests').insert({
                user_id: userId, content: newPostContent.trim(),
                category: 'post', is_anonymous: false, prayer_count: 0, prayed_by: [],
            });
            if (error) throw error;
            toast.success('Publication partagée ! 🎉');
            setNewPostContent(''); setShowNewPost(false); loadPosts();
        } catch (e: any) { toast.error(e.message || 'Erreur'); }
        setPublishing(false);
    };

    // ═══ PUBLISH STORY ═══
    const publishStory = async () => {
        if (!storyText.trim() && !storyImage) { toast.error('Ajoutez du texte ou une image'); return; }
        setPublishingStory(true);
        try {
            let imageUrl: string | null = null;
            if (storyImage) {
                const compressed = await compressImage(storyImage, { maxWidth: 1080, quality: 0.7 });
                const path = `stories/${userId}/${Date.now()}_${storyImage.name}`;
                await supabase.storage.from('organization-assets').upload(path, compressed, { contentType: compressed.type });
                const { data: u } = supabase.storage.from('organization-assets').getPublicUrl(path);
                imageUrl = u.publicUrl;
            }
            const { error } = await supabase.from('stories').insert({
                user_id: userId, organization_id: orgId, content: storyText.trim(),
                image_url: imageUrl, visibility: storyVisibility,
                visible_to: storyVisibility === 'selected' ? selectedContacts : [],
            });
            if (error) throw error;
            toast.success('Story publiée ! ✨');
            setStoryText(''); setStoryImage(null); setStoryImagePreview('');
            setShowNewStory(false); setSelectedContacts([]); loadStories();
        } catch (e: any) { toast.error(e.message); }
        setPublishingStory(false);
    };

    // ═══ LIKE POST ═══
    const likePost = async (post: PostItem) => {
        const alreadyLiked = post.prayed_by?.includes(userId);
        const newCount = alreadyLiked ? Math.max(0, post.prayer_count - 1) : post.prayer_count + 1;
        const newBy = alreadyLiked ? post.prayed_by.filter(id => id !== userId) : [...(post.prayed_by || []), userId];
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, prayer_count: newCount, prayed_by: newBy } : p));
        await supabase.from('tutoring_requests').update({ prayer_count: newCount, prayed_by: newBy }).eq('id', post.id);
    };

    // ═══ SHARE POST ═══
    const sharePost = async (post: PostItem) => {
        const url = `${window.location.origin}/${orgSlug}/campus`;
        const text = `${post.senderName}: ${post.content.slice(0, 100)}...`;
        if (navigator.share) {
            try { await navigator.share({ title: 'CampusFlow', text, url }); } catch { }
        } else {
            await navigator.clipboard.writeText(`${text}\n${url}`);
            toast.success('Lien copié ! 📋');
        }
    };

    // ═══ COMMENTS ═══
    const loadComments = async (postId: string) => {
        const { data } = await supabase.from('post_comments').select('*')
            .eq('post_id', postId).order('created_at', { ascending: true });
        if (data) {
            const enriched = await Promise.all(data.map(async (c: any) => {
                const user = await resolveUser(c.user_id);
                return { ...c, senderName: user.senderName, avatarUrl: user.avatarUrl } as CommentItem;
            }));
            setComments(prev => ({ ...prev, [postId]: enriched }));
        }
    };

    const postComment = async (postId: string) => {
        if (!newComment.trim()) return;
        setPostingComment(true);
        try {
            const { error } = await supabase.from('post_comments').insert({
                post_id: postId, user_id: userId, content: newComment.trim(),
            });
            if (error) throw error;
            setNewComment(''); loadComments(postId);
        } catch (e: any) { toast.error(e.message); }
        setPostingComment(false);
    };

    const toggleComments = (postId: string) => {
        if (expandedComments === postId) { setExpandedComments(null); return; }
        setExpandedComments(postId);
        if (!comments[postId]) loadComments(postId);
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

    // Group stories by user
    const storyGroups = stories.reduce((acc, s) => {
        if (!acc[s.user_id]) acc[s.user_id] = [];
        acc[s.user_id].push(s);
        return acc;
    }, {} as Record<string, StoryItem[]>);
    const storyUsers = Object.keys(storyGroups);

    const filteredContacts = contacts.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(contactSearch.toLowerCase())
    );

    return (
        <div className="space-y-4">
            {/* ═══ STORIES BAR ═══ */}
            <div className="relative">
                <div ref={storyScrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {/* Add Story Button */}
                    <button onClick={() => { setShowNewStory(true); loadContacts(); }}
                        className="flex-shrink-0 flex flex-col items-center gap-1">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-dashed border-amber-500/30 flex items-center justify-center hover:scale-105 transition-transform">
                            <Plus className="w-6 h-6 text-amber-400" />
                        </div>
                        <span className="text-[9px] text-slate-400 w-16 text-center truncate">Ma story</span>
                    </button>
                    {/* Story bubbles */}
                    {storyUsers.map(uid => {
                        const userStories = storyGroups[uid];
                        const first = userStories[0];
                        const isMine = uid === userId;
                        return (
                            <button key={uid} onClick={() => { setViewingStory(first); setStoryIndex(0); }}
                                className="flex-shrink-0 flex flex-col items-center gap-1 group">
                                <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-br from-amber-500 via-orange-500 to-pink-500">
                                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#0B0E14]">
                                        {first.avatarUrl ? (
                                            <img src={first.avatarUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-teal-600 flex items-center justify-center text-xs font-bold text-white">
                                                {(first.senderName || '?').split(' ').map(w => w[0]).join('').slice(0, 2)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <span className="text-[9px] text-slate-400 w-16 text-center truncate">
                                    {isMine ? 'Moi' : first.senderName?.split(' ')[0]}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ═══ STORY VIEWER MODAL ═══ */}
            <AnimatePresence>
                {viewingStory && (() => {
                    const userStories = storyGroups[viewingStory.user_id] || [viewingStory];
                    const current = userStories[storyIndex] || userStories[0];
                    const userKeys = storyUsers;
                    const currentUserIdx = userKeys.indexOf(viewingStory.user_id);
                    return (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
                            onClick={() => setViewingStory(null)}>
                            <div className="relative max-w-sm w-full max-h-[85vh] mx-4" onClick={e => e.stopPropagation()}>
                                {/* Progress bars */}
                                <div className="flex gap-1 mb-3">
                                    {userStories.map((_, si) => (
                                        <div key={si} className="flex-1 h-0.5 rounded-full overflow-hidden bg-white/20">
                                            <div className={cn("h-full rounded-full transition-all", si <= storyIndex ? "bg-white w-full" : "w-0")} />
                                        </div>
                                    ))}
                                </div>
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-3">
                                    {current.avatarUrl ? (
                                        <img src={current.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-white/20" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-teal-600 flex items-center justify-center text-[10px] font-bold text-white">
                                            {(current.senderName || '?').split(' ').map(w => w[0]).join('').slice(0, 2)}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-white">{current.senderName}</p>
                                        <p className="text-[10px] text-white/50">{timeAgo(current.created_at)}</p>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-white/40">
                                        {current.visibility === 'public' ? <Globe className="w-3 h-3" /> : current.visibility === 'friends' ? <Users className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                                        {current.visibility === 'public' ? 'Public' : current.visibility === 'friends' ? 'Amis' : 'Sélection'}
                                    </div>
                                    <button onClick={() => setViewingStory(null)} className="p-1 rounded-full hover:bg-white/10"><X className="w-5 h-5 text-white" /></button>
                                </div>
                                {/* Content */}
                                <div className="rounded-2xl overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 min-h-[300px] flex flex-col items-center justify-center">
                                    {current.image_url && (
                                        <img src={current.image_url} alt="" className="w-full max-h-[50vh] object-contain" />
                                    )}
                                    {current.content && (
                                        <p className={cn("text-white text-center leading-relaxed px-6 py-8", current.image_url ? "text-sm bg-black/50 w-full" : "text-lg font-medium")}>{current.content}</p>
                                    )}
                                </div>
                                {/* Navigation */}
                                <div className="absolute inset-y-0 left-0 w-1/3 cursor-pointer" onClick={(e) => {
                                    e.stopPropagation();
                                    if (storyIndex > 0) setStoryIndex(storyIndex - 1);
                                    else if (currentUserIdx > 0) {
                                        const prevUid = userKeys[currentUserIdx - 1];
                                        const prevStories = storyGroups[prevUid];
                                        setViewingStory(prevStories[0]); setStoryIndex(prevStories.length - 1);
                                    } else setViewingStory(null);
                                }} />
                                <div className="absolute inset-y-0 right-0 w-1/3 cursor-pointer" onClick={(e) => {
                                    e.stopPropagation();
                                    if (storyIndex < userStories.length - 1) setStoryIndex(storyIndex + 1);
                                    else if (currentUserIdx < userKeys.length - 1) {
                                        const nextUid = userKeys[currentUserIdx + 1];
                                        setViewingStory(storyGroups[nextUid][0]); setStoryIndex(0);
                                    } else setViewingStory(null);
                                }} />
                            </div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

            {/* ═══ NEW STORY MODAL ═══ */}
            <AnimatePresence>
                {showNewStory && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                        onClick={() => setShowNewStory(false)}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#1a1d27] rounded-2xl border border-white/10 max-w-md w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-amber-300">✨ Nouvelle Story</h3>
                                <button onClick={() => setShowNewStory(false)}><X className="w-4 h-4 text-slate-400" /></button>
                            </div>
                            {/* Image */}
                            {storyImagePreview ? (
                                <div className="relative rounded-xl overflow-hidden">
                                    <img src={storyImagePreview} alt="" className="w-full max-h-48 object-cover" />
                                    <button onClick={() => { setStoryImage(null); setStoryImagePreview(''); }}
                                        className="absolute top-2 right-2 p-1 rounded-full bg-black/60"><X className="w-3 h-3 text-white" /></button>
                                </div>
                            ) : (
                                <label className="block w-full py-8 rounded-xl border-2 border-dashed border-white/10 text-center cursor-pointer hover:border-amber-500/30 transition-colors">
                                    <ImageIcon className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                                    <span className="text-xs text-slate-500">Ajouter une image</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                                        const f = e.target.files?.[0];
                                        if (f) { setStoryImage(f); setStoryImagePreview(URL.createObjectURL(f)); }
                                    }} />
                                </label>
                            )}
                            <textarea value={storyText} onChange={e => setStoryText(e.target.value)}
                                placeholder="Écrivez quelque chose..." rows={3}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-amber-500/30" />
                            {/* Visibility */}
                            <div>
                                <p className="text-[10px] text-slate-400 mb-2">👁️ Visibilité</p>
                                <div className="flex gap-2">
                                    {[
                                        { v: 'public' as const, icon: Globe, label: 'Public' },
                                        { v: 'friends' as const, icon: Users, label: 'Amis' },
                                        { v: 'selected' as const, icon: UserCheck, label: 'Sélection' },
                                    ].map(opt => (
                                        <button key={opt.v} onClick={() => setStoryVisibility(opt.v)}
                                            className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all border",
                                                storyVisibility === opt.v ? "bg-amber-500/20 border-amber-500/30 text-amber-300" : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20")}>
                                            <opt.icon className="w-3.5 h-3.5" />{opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Selected contacts */}
                            {storyVisibility === 'selected' && (
                                <div className="space-y-2">
                                    <Input value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                                        placeholder="Rechercher..." className="bg-white/5 border-white/10 text-white h-8 rounded-lg text-xs" />
                                    <div className="max-h-32 overflow-y-auto space-y-1">
                                        {filteredContacts.map(c => (
                                            <button key={c.id} onClick={() => setSelectedContacts(prev =>
                                                prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id]
                                            )}
                                                className={cn("w-full flex items-center gap-2 p-2 rounded-lg text-xs transition-all",
                                                    selectedContacts.includes(c.id) ? "bg-amber-500/10 border border-amber-500/20" : "bg-white/[0.02] border border-white/5 hover:bg-white/[0.04]")}>
                                                <div className={cn("w-2 h-2 rounded-full", selectedContacts.includes(c.id) ? "bg-amber-400" : "bg-slate-600")} />
                                                <span className="text-slate-300">{c.first_name} {c.last_name}</span>
                                                <span className="text-[9px] text-slate-500 ml-auto">{c.role}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[9px] text-slate-500">{selectedContacts.length} personne(s) sélectionnée(s)</p>
                                </div>
                            )}
                            <Button onClick={publishStory} disabled={publishingStory || (!storyText.trim() && !storyImage)}
                                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl shadow-lg shadow-amber-600/20">
                                {publishingStory ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-3.5 h-3.5 mr-2" />}
                                Publier la story
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header + Publish */}
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
                            <textarea value={newPostContent} onChange={e => setNewPostContent(e.target.value)}
                                placeholder="Partagez une actualité avec l'école..."
                                rows={3}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-amber-500/30"
                                autoFocus />
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
                                post.isAdmin ? "bg-gradient-to-br from-yellow-500 to-amber-600" : "bg-gradient-to-br from-teal-600 to-indigo-600"
                            )}>
                                {post.is_anonymous ? '?' : (post.senderName || 'M').split(' ').map(w => w[0]).join('').slice(0, 2)}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">{post.is_anonymous ? 'Anonyme' : post.senderName}</span>
                                {post.isAdmin && (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-300 border border-yellow-500/20">
                                        <ShieldCheck className="w-2.5 h-2.5" /> Admin
                                    </span>
                                )}
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
                                post.prayed_by?.includes(userId) ? 'text-red-400' : 'text-slate-500 hover:text-red-400')}>
                            <Heart className={cn("w-4 h-4", post.prayed_by?.includes(userId) && 'fill-current')} />
                            <span>{post.prayer_count || 0}</span>
                        </button>
                        <button onClick={() => toggleComments(post.id)}
                            className={cn("flex items-center gap-1.5 text-xs transition-colors",
                                expandedComments === post.id ? 'text-blue-400' : 'text-slate-500 hover:text-blue-400')}>
                            <MessageCircle className="w-4 h-4" />
                            <span>{comments[post.id]?.length || 0}</span>
                        </button>
                        <button onClick={() => sharePost(post)}
                            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-teal-400 transition-colors">
                            <Share2 className="w-4 h-4" />
                            <span>Partager</span>
                        </button>
                    </div>

                    {/* Comments Section */}
                    <AnimatePresence>
                        {expandedComments === post.id && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden">
                                <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                                    {(comments[post.id] || []).map(c => (
                                        <div key={c.id} className="flex items-start gap-2">
                                            {c.avatarUrl ? (
                                                <img src={c.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/10" />
                                            ) : (
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                                                    {(c.senderName || '?').split(' ').map(w => w[0]).join('').slice(0, 2)}
                                                </div>
                                            )}
                                            <div className="flex-1 bg-white/[0.03] rounded-xl px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold">{c.senderName}</span>
                                                    <span className="text-[9px] text-slate-500">{timeAgo(c.created_at)}</span>
                                                </div>
                                                <p className="text-xs text-slate-300 mt-0.5">{c.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {/* New comment input */}
                                    <div className="flex items-center gap-2 mt-2">
                                        <input value={newComment} onChange={e => setNewComment(e.target.value)}
                                            placeholder="Écrire un commentaire..."
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/30"
                                            onKeyDown={e => e.key === 'Enter' && postComment(post.id)} />
                                        <button onClick={() => postComment(post.id)} disabled={postingComment || !newComment.trim()}
                                            className="p-2 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-30">
                                            {postingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            ))}
        </div>
    );
}
