'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, Plus, Loader2, Heart, Send, X, Share2, Gift, Star,
    ShieldCheck, Image as ImageIcon, MessageCircle, ChevronLeft,
    ChevronRight, Globe, Users, UserCheck, Eye, Clock, Repeat, Trash2, Reply,
    Edit2, MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmailModal } from '@/components/campus/email-modal';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/compress';
import { uploadToR2 } from '@/lib/r2';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    notifyStoryPublished, notifyStoryLiked, notifyStoryCommented, notifyStoryReposted,
    notifyActuPublished, notifyActuLiked, notifyActuCommented,
} from '@/lib/notifications';


import { updateSkyPoints, fetchSkyPoints, deductSkyPoints } from '@/lib/sky-points-service';

// ── Rewarded Ad Button (🎁 près des stories) ─────────────────────────────
function RewardedAdButton({ userId, orgId, onSkyUpdate }: {
    userId: string; orgId: string; onSkyUpdate?: (d: number) => void;
}) {
    const [ads, setAds] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState(0);
    const [watched, setWatched] = useState(0);
    const [claimed, setClaimed] = useState<Record<string, boolean>>({});
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        supabase.from('advertisements')
            .select('*')
            .eq('is_active', true)
            .eq('placement_zone', 'rewarded')
            .then(({ data }) => setAds(data || []));
    }, []);

    useEffect(() => {
        if (!open) { if (timerRef.current) clearInterval(timerRef.current); setWatched(0); return; }
        const ad = ads[current];
        if (!ad) return;
        setWatched(0);
        timerRef.current = setInterval(() => {
            setWatched(s => {
                const next = s + 1;
                if (next >= ad.min_watch_seconds && !claimed[ad.id] && userId) {
                    creditPoints(ad);
                }
                return next;
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [open, current]);

    const creditPoints = async (ad: any) => {
        if (claimed[ad.id]) return;
        setClaimed(p => ({ ...p, [ad.id]: true }));
        const pts = ad.sky_points_reward || 1;
        // Met à jour réellement en DB
        for (const table of ['student_profiles', 'teacher_profiles']) {
            const { data: prof } = await supabase.from(table).select('id, sky_points').eq('id', userId).maybeSingle();
            if (prof) {
                await supabase.from(table).update({ sky_points: (prof.sky_points || 0) + pts }).eq('id', userId);
                break;
            }
        }
        await supabase.from('ad_views').upsert({
            ad_id: ad.id, user_id: userId, organization_id: orgId,
            watched_seconds: ad.min_watch_seconds, completed: true, points_awarded: true,
        }, { onConflict: 'ad_id,user_id' });
        onSkyUpdate?.(pts);
        toast.success(`+${pts} Sky Point${pts > 1 ? 's' : ''} gagné ! 🌟`, { description: ad.title, duration: 3000 });
    };

    if (ads.length === 0) return null;
    const ad = ads[current];

    return (
        <>
            {/* Bouton rond près des stories */}
            <button onClick={() => setOpen(true)}
                className="flex-shrink-0 flex flex-col items-center gap-1">
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/30 to-yellow-600/20 border-2 border-amber-500/50 flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-amber-500/20">
                    <Gift className="w-6 h-6 text-amber-400" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-[9px] font-black text-black flex items-center justify-center">
                        {ads.length}
                    </span>
                </div>
                <span className="text-[9px] text-amber-400 w-16 text-center font-semibold">Gagner pts</span>
            </button>

            {/* Modal plein écran */}
            <AnimatePresence>
                {open && ad && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-3 shrink-0">
                            <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-amber-400" />
                                <span className="text-sm font-bold text-white">Pub récompensée</span>
                                <span className="text-[10px] text-slate-400">{current + 1}/{ads.length}</span>
                            </div>
                            <button onClick={() => setOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>

                        {/* Contenu pub */}
                        <div className="flex-1 overflow-hidden relative">
                            {ad.media_type === 'video' ? (
                                <video src={ad.media_url} className="w-full h-full object-cover" autoPlay muted playsInline />
                            ) : (
                                <img src={ad.media_url} alt={ad.title} className="w-full h-full object-cover" />
                            )}
                            {/* Progression */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                                <div className="h-full bg-amber-500 transition-all duration-1000"
                                    style={{ width: `${Math.min(100, (watched / (ad.min_watch_seconds || 5)) * 100)}%` }} />
                            </div>
                            {/* Info overlay */}
                            <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-sm rounded-2xl px-4 py-3">
                                <p className="font-bold text-white text-sm">{ad.title}</p>
                                {ad.description && <p className="text-xs text-slate-300 mt-0.5">{ad.description}</p>}
                                <div className="flex items-center justify-between mt-2">
                                    {claimed[ad.id] ? (
                                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                                            <Star className="w-3 h-3" />+{ad.sky_points_reward} pts gagnés !
                                        </span>
                                    ) : (
                                        <span className="text-xs text-slate-400">
                                            Regardez encore {Math.max(0, ad.min_watch_seconds - watched)}s pour gagner{' '}
                                            <strong className="text-amber-400">+{ad.sky_points_reward} pts</strong>
                                        </span>
                                    )}
                                    {current < ads.length - 1 && claimed[ad.id] && (
                                        <button onClick={() => { setCurrent(c => c + 1); setWatched(0); }}
                                            className="text-xs text-amber-400 font-bold">
                                            Suivante →
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// ═══════════════════════════════════════════════════════
// ACTUS VIEW — Actualités + Stories + Comments + Partage
// ═══════════════════════════════════════════════════════

interface ActusViewProps {
    orgId: string;
    orgSlug: string;
    userId: string;
    userName: string;
    userRole: string;
    onSkyUpdate?: (delta: number) => void;
    allStudents?: any[];  // pour l'email modal
    orgName?: string;
    orgLogo?: string;
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
    viewed_by?: string[];
    created_at: string;
    isAdmin?: boolean;
    avatarUrl?: string;
    image_url?: string;
    senderName?: string;
    senderRole?: string;
}

interface StoryItem {
    id: string;
    user_id: string;
    content: string;
    image_url: string | null;
    caption: string | null;
    visibility: string;
    visible_to?: string[];
    likes: string[];
    viewed_by: string[];
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

interface StoryCommentItem {
    id: string;
    story_id: string;
    user_id: string;
    content: string;
    parent_id: string | null;
    created_at: string;
    senderName?: string;
    avatarUrl?: string;
}

export function ActusView({ orgId, orgSlug, userId, userName, userRole, onSkyUpdate, allStudents = [], orgName = 'IziTeach', orgLogo }: ActusViewProps) {
    const [posts, setPosts] = useState<PostItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewPost, setShowNewPost] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [publishing, setPublishing] = useState(false);
    
    // New Actus States
    const [postImage, setPostImage] = useState<File | null>(null);
    const [uploadingPost, setUploadingPost] = useState(false);
    const [activePostTab, setActivePostTab] = useState<'general' | 'officiel'>('general');

    // Stories
    const [storyTab, setStoryTab] = useState<'active' | 'history'>('active');
    const [stories, setStories] = useState<StoryItem[]>([]);
    const [showNewStory, setShowNewStory] = useState(false);
    const [storyText, setStoryText] = useState('');
    const [caption, setCaption] = useState('');
    const [storyImage, setStoryImage] = useState<File | null>(null);
    const [storyImagePreview, setStoryImagePreview] = useState('');
    const [storyVisibility, setStoryVisibility] = useState<'public' | 'friends' | 'selected'>('public');
    const [publishingStory, setPublishingStory] = useState(false);
    const [viewingStory, setViewingStory] = useState<StoryItem | null>(null);
    const [storyIndex, setStoryIndex] = useState(0);
    const storyScrollRef = useRef<HTMLDivElement>(null);
    
    // Story viewer
    const [rightTab, setRightTab] = useState<'comments' | 'views'>('comments');
    const [storyComments, setStoryComments] = useState<Record<string, StoryCommentItem[]>>({});
    const [newStoryComment, setNewStoryComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<StoryCommentItem | null>(null);
    const [viewerDetails, setViewerDetails] = useState<any[]>([]);
    const [showComments, setShowComments] = useState(false); // slide-up drawer
    const touchStartX = useRef<number>(0);
    const storyTimerRef = useRef<NodeJS.Timeout | null>(null);
    // Story image display mode — reset each time a new story is opened
    const [imgCover, setImgCover] = useState(false);
    const [imgRatio, setImgRatio] = useState<number | null>(null);

    // Post Comments
    const [comments, setComments] = useState<Record<string, CommentItem[]>>({});
    const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
    const [expandedComments, setExpandedComments] = useState<string | null>(null);
    const [newComment, setNewComment] = useState('');
    const [postingComment, setPostingComment] = useState(false);

    // Post editing
    const [editingPost, setEditingPost] = useState<PostItem | null>(null);
    const [editContent, setEditContent] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [postMenuOpen, setPostMenuOpen] = useState<string | null>(null);

    // Post expansion & views
    const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});

    const recordPostView = async (post: PostItem) => {
        if ((post.viewed_by || []).includes(userId)) return;
        const newViewedBy = [...(post.viewed_by || []), userId];
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, viewed_by: newViewedBy } : p));
        try {
            await supabase.from('tutoring_requests').update({ viewed_by: newViewedBy }).eq('id', post.id);
        } catch { /* silent */ }
    };

    // Contacts for "selected" visibility
    const [contacts, setContacts] = useState<any[]>([]);
    const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
    const [contactSearch, setContactSearch] = useState('');

    // ── Email Modal (post-publication actu) ──
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');

    const batchResolveUsers = async (userIds: string[], ownerId?: string) => {
        const uniqueIds = [...new Set(userIds.filter(Boolean))];
        if (uniqueIds.length === 0) return {};

        const userMap: Record<string, { senderName: string; senderRole: string; isAdmin: boolean; avatarUrl?: string }> = {};

        // 1. Fetch teachers
        const { data: teachers } = await supabase.from('teacher_profiles')
            .select('id, first_name, last_name, photo_url')
            .in('id', uniqueIds);

        (teachers || []).forEach((t: any) => {
            userMap[t.id] = {
                senderName: `${t.first_name} ${t.last_name}`,
                senderRole: 'Professeur',
                isAdmin: false,
                avatarUrl: t.photo_url || undefined
            };
        });

        // 2. Fetch missing students
        const missingIds = uniqueIds.filter(id => !userMap[id] && id !== ownerId);
        if (missingIds.length > 0) {
            const { data: students } = await supabase.from('student_profiles')
                .select('id, first_name, last_name, photo_url')
                .in('id', missingIds);

            (students || []).forEach((s: any) => {
                userMap[s.id] = {
                    senderName: `${s.first_name} ${s.last_name}`,
                    senderRole: 'Étudiant',
                    isAdmin: false,
                    avatarUrl: s.photo_url || undefined
                };
            });
        }

        // 3. Handle owner/admin
        if (ownerId && uniqueIds.includes(ownerId)) {
            userMap[ownerId] = {
                senderName: 'Administration',
                senderRole: 'Admin',
                isAdmin: true,
                avatarUrl: undefined
            };
        }

        return userMap;
    };

    const resolveUser = async (uid: string, ownerId?: string) => {
        const res = await batchResolveUsers([uid], ownerId);
        return res[uid] || { senderName: 'Membre', senderRole: '', isAdmin: false, avatarUrl: undefined };
    };

    // ═══ LOAD ═══
    useEffect(() => { loadPosts(); loadStories(); }, [orgId]);

    const loadPosts = async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from('tutoring_requests').select('*')
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false }).limit(50);
            if (data && data.length > 0) {
                const { data: orgData } = await supabase.from('organizations')
                    .select('owner_id').eq('id', orgId).single();
                const ownerId = orgData?.owner_id;
                const uids = data.map((p: any) => p.user_id);
                const userMap = await batchResolveUsers(uids, ownerId);
                const enriched = data.map((p: any) => {
                    const user = userMap[p.user_id] || { senderName: 'Membre', senderRole: '', isAdmin: false, avatarUrl: undefined };
                    return { ...p, ...user } as PostItem;
                });
                setPosts(enriched);
                // Pre-load comment counts for all posts
                const postIds = data.map((p: any) => p.id);
                if (postIds.length > 0) {
                    const { data: commentData } = await supabase.from('post_comments')
                        .select('post_id').in('post_id', postIds);
                    if (commentData) {
                        const counts: Record<string, number> = {};
                        commentData.forEach((c: any) => { counts[c.post_id] = (counts[c.post_id] || 0) + 1; });
                        setCommentCounts(counts);
                    }
                }
            } else {
                setPosts([]);
            }
        } catch (e) { console.error('Error loading posts:', e); }
        setLoading(false);
    };

    const loadStories = async () => {
        try {
            // Load all stories, filter them client-side for active vs history
            const { data } = await supabase.from('stories').select('*')
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false });
            if (data && data.length > 0) {
                const uids = data.map((s: any) => s.user_id);
                const userMap = await batchResolveUsers(uids);
                const enriched = data.map((s: any) => {
                    const user = userMap[s.user_id] || { senderName: 'Membre', avatarUrl: undefined };
                    return { 
                        ...s, 
                        senderName: user.senderName, 
                        avatarUrl: user.avatarUrl,
                        likes: s.likes || [],
                        viewed_by: s.viewed_by || []
                    } as StoryItem;
                });
                setStories(enriched);
            } else {
                setStories([]);
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

    // ═══ POSTS LOGIC ═══
    const publishPost = async () => {
        if (!newPostContent.trim() && !postImage) return;

        // ── Sky Points : 1 pt pour texte, 2 pts pour image, 3 pts pour les deux ──
        const hasText = !!newPostContent.trim();
        const hasImage = !!postImage;
        const requiredPoints = (hasText ? 1 : 0) + (hasImage ? 2 : 0);

        const isAdminOrOwner = userRole === 'admin' || userRole === 'owner';
        const table = (userRole === 'teacher') ? 'teacher_profiles' : 'student_profiles';

        let currentPts = 100;
        if (!isAdminOrOwner) {
            currentPts = await fetchSkyPoints(userId, userRole as any);
            if (currentPts < requiredPoints) {
                toast.error(`Solde insuffisant — ${requiredPoints} Sky Point${requiredPoints > 1 ? 's' : ''} requis pour cette publication`);
                return;
            }
        }

        setPublishing(true);
        setUploadingPost(true);
        try {
            let finalImageUrl: string | null = null;
            if (postImage) {
                const compressed = await compressImage(postImage, { maxWidth: 1080, quality: 0.7 });
                const r2Res = await uploadToR2(compressed, `actus/${userId}`, postImage.name);
                finalImageUrl = r2Res.url;
            }

            const payload: any = {
                user_id: userId,
                content: newPostContent.trim(),
                category: activePostTab === 'officiel' ? 'officiel' : 'general',
                photos: finalImageUrl ? [finalImageUrl] : [],
                is_anonymous: false
            };

            // Essayer avec organization_id, fallback sans si la colonne n'existe pas encore dans la DB
            let insertResult = await supabase.from('tutoring_requests').insert({ ...payload, organization_id: orgId }).select('id').single();
            if (insertResult.error && (insertResult.error.message?.includes('organization_id') || insertResult.error.code === 'PGRST204')) {
                insertResult = await supabase.from('tutoring_requests').insert(payload).select('id').single();
            }
            if (insertResult.error) throw insertResult.error;
            const newPostId = insertResult.data?.id || '';

            // Déduire les Sky Points après succès de la publication via le service unifié
            if (!isAdminOrOwner && requiredPoints > 0) {
                await deductSkyPoints(
                    userId,
                    requiredPoints,
                    'actus_post',
                    `Publication d'une actus (${hasText ? 'texte' : ''}${hasText && hasImage ? ' + ' : ''}${hasImage ? 'image' : ''})`,
                    userRole as any,
                    orgId
                );
            }


            toast.success(`Publication ajoutée ! ${isAdminOrOwner ? '(Admin)' : `(-${requiredPoints} Sky Points)`} 🚀`);
            setNewPostContent('');
            setPostImage(null);
            setShowNewPost(false);
            // 🔔 Notifier les membres de l'org
            const { data: members } = await supabase
                .from('student_profiles').select('id').eq('organization_id', orgId)
                .neq('id', userId);
            const { data: teachers } = await supabase
                .from('teacher_profiles').select('id').eq('organization_id', orgId)
                .neq('id', userId);
            const recipientIds = [
                ...(members || []).map((m: any) => m.id),
                ...(teachers || []).map((t: any) => t.id),
            ];
            try {
                await notifyActuPublished({
                    authorId: userId, authorName: userName,
                    postId: newPostId, postContent: newPostContent.trim(),
                    recipientIds, orgSlug, orgId,
                });
            } catch (e) { console.warn('[Notif] actu_published:', e); }
            // 📧 Proposer l'email si admin ou prof
            if (isAdminOrOwner || userRole === 'teacher') {
                const preview = newPostContent.trim().slice(0, 150);
                setEmailSubject(`Nouvelle annonce de ${userName}`);
                setEmailBody(`${preview}${newPostContent.length > 150 ? '...' : ''}\n\nConnectez-vous à IziTeach pour lire la suite et réagir.`);
                setEmailModalOpen(true);
            }
            loadPosts();

        } catch (e: any) { toast.error(e.message); }
        setPublishing(false);
        setUploadingPost(false);
    };

    const deletePost = async (postId: string) => {
        if (!confirm('Supprimer ce post ?')) return;
        await supabase.from('tutoring_requests').delete().eq('id', postId);
        setPosts(prev => prev.filter(p => p.id !== postId));
        toast.success('Post supprimé');
    };

    const editPost = (post: PostItem) => {
        setEditingPost(post);
        setEditContent(post.content);
        setPostMenuOpen(null);
    };

    const saveEditPost = async () => {
        if (!editingPost || !editContent.trim()) return;
        setSavingEdit(true);
        try {
            const { error } = await supabase.from('tutoring_requests')
                .update({ content: editContent.trim() }).eq('id', editingPost.id);
            if (error) throw error;
            setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, content: editContent.trim() } : p));
            setEditingPost(null);
            toast.success('Post modifié !');
        } catch (e: any) { toast.error(e.message); }
        setSavingEdit(false);
    };

    const likePost = async (post: PostItem) => {
        const prayed = (post.prayed_by || []).includes(userId);
        const newPrayedBy = prayed ? (post.prayed_by || []).filter(id => id !== userId) : [...(post.prayed_by || []), userId];
        const newCount = prayed ? Math.max(0, post.prayer_count - 1) : post.prayer_count + 1;
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, prayer_count: newCount, prayed_by: newPrayedBy } : p));
        await supabase.from('tutoring_requests').update({ prayer_count: newCount, prayed_by: newPrayedBy }).eq('id', post.id);
        // 🔔 Notifier l'auteur (seulement au like, pas au unlike)
        if (!prayed && post.user_id && post.user_id !== userId) {
            notifyActuLiked({
                likerId: userId, likerName: userName,
                postAuthorId: post.user_id, postId: post.id,
                postContent: post.content, orgSlug,
            }).catch(e => console.warn('[Notif] actu_liked:', e));
        }
    };

    const togglePrayer = likePost;

    const sharePost = async (post: PostItem) => {
        const url = `${window.location.origin}/${orgSlug}/campus`;
        const text = `${post.senderName || 'Utilisateur'}: ${post.content.slice(0, 100)}...`;
        if (navigator.share) {
            try { await navigator.share({ title: 'IziTeach', text, url }); } catch { }
        } else {
            await navigator.clipboard.writeText(`${text}\n${url}`);
            toast.success('Lien copié ! 📋');
        }
    };

    const loadComments = async (postId: string) => {
        const { data } = await supabase.from('post_comments').select('*')
            .eq('post_id', postId).order('created_at', { ascending: true });
        if (data && data.length > 0) {
            const uids = data.map((c: any) => c.user_id);
            const userMap = await batchResolveUsers(uids);
            const enriched = data.map((c: any) => ({
                ...c,
                senderName: userMap[c.user_id]?.senderName || 'Membre',
                avatarUrl: userMap[c.user_id]?.avatarUrl
            })) as CommentItem[];
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
            // 🔔 Notifier l'auteur du post
            const post = posts.find(p => p.id === postId);
            if (post && post.user_id !== userId) {
                try {
                    await notifyActuCommented({
                        commenterId: userId, commenterName: userName,
                        postAuthorId: post.user_id, postId,
                        postContent: post.content, commentText: newComment.trim(), orgSlug,
                    });
                } catch (e) { console.warn('[Notif] actu_commented:', e); }
            }
            setNewComment(''); loadComments(postId);
        } catch (e: any) { toast.error(e.message); }
        setPostingComment(false);
    };


    const toggleComments = (postId: string) => {
        if (expandedComments === postId) { setExpandedComments(null); return; }
        setExpandedComments(postId);
        if (!comments[postId]) loadComments(postId);
    };

    // ═══ STORY LOGIC ═══
    const publishStory = async (isRepost = false, repostData?: StoryItem) => {
        if (!isRepost && !storyText.trim() && !storyImage) { toast.error('Ajoutez du texte ou une image'); return; }
        if (isRepost && !repostData) return;

        const isAdminOrOwner = userRole === 'admin' || userRole === 'owner';
        const table = (userRole === 'teacher') ? 'teacher_profiles' : 'student_profiles';

        const hasText = !isRepost && !!storyText.trim();
        const hasImage = !!storyImage || !!repostData?.image_url;
        const requiredPoints = isRepost ? 1 : ((hasText ? 1 : 0) + (hasImage ? 2 : 0));

        let currentPoints = 100;
        if (!isAdminOrOwner) {
            currentPoints = await fetchSkyPoints(userId, userRole as any);
            if (currentPoints < requiredPoints) {
                toast.error(`Solde insuffisant — ${requiredPoints} Sky Point${requiredPoints > 1 ? 's' : ''} requis pour publier cette story`);
                return;
            }
        }


        setPublishingStory(true);
        try {
            let imageUrl: string | null = null;
            let captionToSave: string | null = null;

            if (isRepost && repostData) {
                imageUrl = repostData.image_url;
                captionToSave = `Repost de @${repostData.senderName}: ${repostData.caption || repostData.content || ''}`;
            } else if (storyImage) {
                const compressed = await compressImage(storyImage, { maxWidth: 1080, quality: 0.7 });
                const r2Res = await uploadToR2(compressed, `stories/${userId}`, storyImage.name);
                imageUrl = r2Res.url;
                captionToSave = caption.trim() || null;
            }

            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);

            const storyInsertResult = await supabase.from('stories').insert({
                organization_id: orgId,
                user_id: userId,
                content: isRepost ? (repostData?.content || 'Repost') : (storyImage ? '' : storyText.trim()),
                caption: captionToSave,
                image_url: imageUrl, 
                visibility: isRepost ? 'public' : storyVisibility,
                visible_to: (!isRepost && storyVisibility === 'selected') ? selectedContacts : [],
                expires_at: expiresAt.toISOString(),
                likes: [],
                viewed_by: []
            }).select('id').single();
            if (storyInsertResult.error) throw storyInsertResult.error;
            const newStoryId = storyInsertResult.data?.id || '';

            // 🔔 Notifications story
            if (isRepost && repostData && repostData.user_id !== userId) {
                try {
                    await notifyStoryReposted({
                        reposterId: userId, reposterName: userName,
                        originalAuthorId: repostData.user_id,
                        storyId: repostData.id, orgSlug, orgId,
                    });
                } catch (e) { console.warn('[Notif] story_reposted:', e); }
            } else if (!isRepost) {
                // Notifier tous les membres de l'org
                const { data: members } = await supabase
                    .from('student_profiles').select('id').eq('organization_id', orgId).neq('id', userId);
                const { data: teachers } = await supabase
                    .from('teacher_profiles').select('id').eq('organization_id', orgId).neq('id', userId);
                const recipientIds = [
                    ...(members || []).map((m: any) => m.id),
                    ...(teachers || []).map((t: any) => t.id),
                ];
                try {
                    await notifyStoryPublished({
                        authorId: userId, authorName: userName,
                        storyId: newStoryId, storyPreview: storyText.trim() || 'Story photo',
                        recipientIds, orgSlug, orgId,
                    });
                } catch (e) { console.warn('[Notif] story_published:', e); }
            }

            // Déduire les Sky Points via le service unifié
            if (!isAdminOrOwner && requiredPoints > 0) {
                await deductSkyPoints(
                    userId,
                    requiredPoints,
                    'story_post',
                    isRepost ? 'Repost d\'une story' : `Publication story (${hasText ? 'texte' : ''}${hasText && hasImage ? ' + ' : ''}${hasImage ? 'image' : ''})`,
                    userRole as any,
                    orgId
                );
            }

            
            toast.success(isRepost ? 'Story repostée ! ✨' : 'Story publiée ! ✨');
            if (!isRepost) {
                setStoryText(''); setCaption(''); setStoryImage(null); setStoryImagePreview('');
                setShowNewStory(false); setSelectedContacts([]);
            }
            loadStories();
        } catch (e: any) { toast.error(e.message); }
        setPublishingStory(false);
    };

    const markStoryViewed = async (story: StoryItem) => {
        if ((story.viewed_by || []).includes(userId)) return;
        const newViewedBy = [...(story.viewed_by || []), userId];
        setStories(prev => prev.map(s => s.id === story.id ? { ...s, viewed_by: newViewedBy } : s));
        if (viewingStory?.id === story.id) {
            setViewingStory(prev => prev ? { ...prev, viewed_by: newViewedBy } : prev);
        }
        await supabase.from('stories').update({ viewed_by: newViewedBy }).eq('id', story.id);
    };

    useEffect(() => {
        // Reset image display state for each new story
        setImgCover(false);
        setImgRatio(null);
        if (viewingStory) {
            if (viewingStory.user_id !== userId && !(viewingStory.viewed_by || []).includes(userId)) {
                markStoryViewed(viewingStory);
            }
            loadStoryComments(viewingStory.id);
            if (viewingStory.user_id === userId) {
                fetchViewers(viewingStory.viewed_by || []);
            }
        }
    }, [viewingStory?.id]);

    const fetchViewers = async (viewedByList: string[]) => {
        if (!viewedByList || viewedByList.length === 0) { setViewerDetails([]); return; }
        const uniqueList = [...new Set(viewedByList)];
        const userMap = await batchResolveUsers(uniqueList);
        const details = uniqueList.map(uid => ({
            id: uid,
            name: userMap[uid]?.senderName || 'Membre',
            role: userMap[uid]?.senderRole || 'Membre',
            photo_url: userMap[uid]?.avatarUrl
        }));
        setViewerDetails(details);
    };

    // Likes
    const likeStory = async (story: StoryItem) => {
        const isLiked = (story.likes || []).includes(userId);
        const newLikes = isLiked ? (story.likes || []).filter(id => id !== userId) : [...(story.likes || []), userId];
        setStories(prev => prev.map(s => s.id === story.id ? { ...s, likes: newLikes } : s));
        if (viewingStory?.id === story.id) {
            setViewingStory(prev => prev ? { ...prev, likes: newLikes } : prev);
        }
        await supabase.from('stories').update({ likes: newLikes }).eq('id', story.id);
        // 🔔 Notifier l'auteur (seulement au like)
        if (!isLiked && story.user_id !== userId) {
            try {
                await notifyStoryLiked({
                    likerId: userId, likerName: userName,
                    storyAuthorId: story.user_id, storyId: story.id, orgSlug,
                });
            } catch (e) { console.warn('[Notif] story_liked:', e); }
        }
    };


    // Delete Story
    const deleteStory = async (storyId: string) => {
        if (!confirm('Voulez-vous vraiment supprimer cette story ?')) return;
        try {
            await supabase.from('stories').delete().eq('id', storyId);
            setStories(prev => prev.filter(s => s.id !== storyId));
            if (viewingStory?.id === storyId) setViewingStory(null);
            toast.success('Story supprimée');
        } catch(e:any) {
            toast.error(e.message);
        }
    };

    // Story Comments
    const loadStoryComments = async (storyId: string) => {
        const { data } = await supabase.from('story_comments').select('*')
            .eq('story_id', storyId).order('created_at', { ascending: true });
        if (data && data.length > 0) {
            const uids = data.map((c: any) => c.user_id);
            const userMap = await batchResolveUsers(uids);
            const enriched = data.map((c: any) => ({
                ...c,
                senderName: userMap[c.user_id]?.senderName || 'Membre',
                avatarUrl: userMap[c.user_id]?.avatarUrl
            })) as StoryCommentItem[];
            setStoryComments(prev => ({ ...prev, [storyId]: enriched }));
        } else {
            setStoryComments(prev => ({ ...prev, [storyId]: [] }));
        }
    };

    const postStoryComment = async (storyId: string) => {
        if (!newStoryComment.trim()) return;
        try {
            const { error } = await supabase.from('story_comments').insert({
                story_id: storyId, user_id: userId, content: newStoryComment.trim(),
                parent_id: replyingTo?.id || null
            });
            if (error) throw error;
            // 🔔 Notifier l'auteur de la story
            const story = stories.find(s => s.id === storyId);
            if (story && story.user_id !== userId) {
                try {
                    await notifyStoryCommented({
                        commenterId: userId, commenterName: userName,
                        storyAuthorId: story.user_id, storyId,
                        commentText: newStoryComment.trim(), orgSlug,
                    });
                } catch (e) { console.warn('[Notif] story_commented:', e); }
            }
            setNewStoryComment('');
            setReplyingTo(null);
            loadStoryComments(storyId);
        } catch (e: any) { toast.error(e.message); }
    };


    // Utils
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

    // ── Hide bottom nav while story is open ─────────────────────
    useEffect(() => {
        if (viewingStory) {
            document.body.setAttribute('data-story-open', 'true');
        } else {
            document.body.removeAttribute('data-story-open');
        }
        return () => document.body.removeAttribute('data-story-open');
    }, [!!viewingStory]);

    // 7. Filter stories based on tab (active vs history)
    const now = new Date().toISOString();
    const filteredStories = storyTab === 'active' 
        ? stories.filter(s => {
            if (s.expires_at <= now) return false;
            if (s.visibility === 'public') return true;
            if (s.user_id === userId) return true;
            if (s.visibility === 'selected') return (s.visible_to || []).includes(userId);
            return true; // 'friends'
        })
        : stories.filter(s => s.user_id === userId);

    const storyGroups = filteredStories.reduce((acc, s) => {
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
            {/* ── Email Modal post-publication actu ── */}
            <EmailModal
                open={emailModalOpen}
                onClose={() => setEmailModalOpen(false)}
                subject={emailSubject}
                body={emailBody}
                students={allStudents}
                orgName={orgName}
                orgLogo={orgLogo}
            />
            {/* ═══ STORIES SECTION ═══ */}
            <div className="relative">
                <div className="flex gap-4 mb-4 items-center">
                    <button onClick={() => setStoryTab('active')} className={cn("text-sm font-bold transition-colors", storyTab === 'active' ? "text-amber-400" : "text-slate-500 hover:text-slate-300")}>
                        Stories
                    </button>
                    <button onClick={() => setStoryTab('history')} className={cn("text-sm font-bold transition-colors flex items-center gap-1", storyTab === 'history' ? "text-amber-400" : "text-slate-500 hover:text-slate-300")}>
                        <Clock className="w-4 h-4" /> Historique
                    </button>
                </div>
                
                <div ref={storyScrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {/* Add Story Button */}
                    {storyTab === 'active' && (
                        <button onClick={() => { setShowNewStory(true); loadContacts(); }}
                            className="flex-shrink-0 flex flex-col items-center gap-1">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-dashed border-amber-500/30 flex items-center justify-center hover:scale-105 transition-transform">
                                <Plus className="w-6 h-6 text-amber-400" />
                            </div>
                            <span className="text-[9px] text-slate-400 w-16 text-center truncate">Ma story</span>
                        </button>
                    )}

                    {/* 🎁 Rewarded Ads Button */}
                    {storyTab === 'active' && (
                        <RewardedAdButton
                            userId={userId}
                            orgId={orgId}
                            onSkyUpdate={onSkyUpdate}
                        />
                    )}
                    
                    {/* Story bubbles */}
                    {storyUsers.map(uid => {
                        const userStories = storyGroups[uid];
                        const first = userStories[0];
                        const isMine = uid === userId;
                        return (
                            <button key={uid} onClick={() => { setViewingStory(first); setStoryIndex(0); }}
                                className="flex-shrink-0 flex flex-col items-center gap-1 group">
                                <div className={cn("w-16 h-16 rounded-full p-[2px] transition-transform group-hover:scale-105", 
                                    (first.viewed_by || []).includes(userId) && !isMine 
                                    ? "bg-slate-700" 
                                    : "bg-gradient-to-br from-amber-500 via-orange-500 to-pink-500"
                                )}>
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
                    const isMyStory = current.user_id === userId;

                    const navigateStory = (dir: number) => {
                        setShowComments(false);
                        if (dir === -1) {
                            if (storyIndex > 0) setStoryIndex(storyIndex - 1);
                            else if (currentUserIdx > 0) {
                                const prevUid = userKeys[currentUserIdx - 1];
                                const prevStories = storyGroups[prevUid];
                                setViewingStory(prevStories[0]); setStoryIndex(prevStories.length - 1);
                            } else setViewingStory(null);
                        } else {
                            if (storyIndex < userStories.length - 1) setStoryIndex(storyIndex + 1);
                            else if (currentUserIdx < userKeys.length - 1) {
                                const nextUid = userKeys[currentUserIdx + 1];
                                setViewingStory(storyGroups[nextUid][0]); setStoryIndex(0);
                            } else setViewingStory(null);
                        }
                    };


                    // Container style adapts to the image native ratio (set via onLoad)
                    const containerStyle: React.CSSProperties = imgRatio
                        ? imgRatio < 1
                            // Portrait (9:16, 3:4, etc.): fill full height, cap width to ratio
                            ? { height: 'min(100dvh, calc(430px * 16 / 9))', width: 'auto', aspectRatio: `${imgRatio}` }
                            // Landscape / square: full width, height auto, cap to screen
                            : { width: '100%', aspectRatio: `${imgRatio}`, maxHeight: '100dvh' }
                        : { height: 'min(100dvh, calc(430px * 16 / 9))' }; // default: 9:16

                    return (
                        <motion.div key={current.id}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
                            onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
                            onTouchEnd={e => {
                                const delta = e.changedTouches[0].clientX - touchStartX.current;
                                if (Math.abs(delta) > 50) navigateStory(delta < 0 ? 1 : -1);
                            }}>

                            {/* ── Adaptive Story Container — all aspect ratios supported ── */}
                            <div
                                className="relative max-w-[430px] w-full flex flex-col overflow-hidden bg-black sm:rounded-[28px] shadow-2xl"
                                style={containerStyle}>

                            {/* ── Progress bars ── */}
                            <div className="absolute top-0 left-0 right-0 px-3 pt-3 pb-2 flex gap-1 z-30 pointer-events-none">
                                {userStories.map((_, si) => (
                                    <div key={si} className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/30">
                                        <motion.div
                                            className="h-full bg-white rounded-full"
                                            initial={{ width: si < storyIndex ? '100%' : '0%' }}
                                            animate={{ width: si < storyIndex ? '100%' : si === storyIndex ? '100%' : '0%' }}
                                            transition={si === storyIndex ? { duration: 7, ease: 'linear' } : { duration: 0 }}
                                            onAnimationComplete={() => { if (si === storyIndex) navigateStory(1); }}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* ── Header overlay ── */}
                            <div className="absolute top-0 left-0 right-0 pt-10 px-4 pb-6 bg-gradient-to-b from-black/70 to-transparent z-30 pointer-events-none">
                                <div className="flex items-center gap-3">
                                    {current.avatarUrl ? (
                                        <img src={current.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-white/40" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-sm font-bold text-white border-2 border-white/30">
                                            {(current.senderName || '?').split(' ').map(w => w[0]).join('').slice(0, 2)}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-white drop-shadow">{current.senderName}</p>
                                        <p className="text-[11px] text-white/60">{timeAgo(current.created_at)}</p>
                                    </div>
                                    {/* Close button — pointer-events re-enabled */}
                                    <button
                                        className="pointer-events-auto p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition"
                                        onClick={() => setViewingStory(null)}>
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* ── Tap left / right zones (restricted to middle 60% of screen) ── */}
                            <div className="absolute top-20 bottom-24 inset-x-0 z-10 flex pointer-events-auto">
                                <div className="flex-1 cursor-pointer" onClick={() => navigateStory(-1)} />
                                <div className="flex-1 cursor-pointer" onClick={() => navigateStory(1)} />
                            </div>

                            {/* ── Media or text content ── */}
                            <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                                {current.image_url ? (
                                    <>
                                        <img
                                            key={current.image_url}
                                            src={current.image_url}
                                            alt={current.caption || ''}
                                            className={`w-full h-full transition-all duration-300 ${imgCover ? 'object-cover' : 'object-contain'}`}
                                            draggable={false}
                                            onLoad={e => {
                                                const img = e.currentTarget;
                                                if (img.naturalWidth && img.naturalHeight) {
                                                    setImgRatio(img.naturalWidth / img.naturalHeight);
                                                }
                                            }}
                                        />
                                        {/* Cover/Contain toggle — only shown when image is not portrait-native */}
                                        {imgRatio !== null && (
                                            <button
                                                className="absolute top-12 right-3 z-40 bg-black/50 hover:bg-black/70 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm transition pointer-events-auto border border-white/20"
                                                onClick={() => setImgCover(v => !v)}
                                                title={imgCover ? 'Afficher sans zoom' : 'Afficher en plein écran'}
                                            >
                                                {imgCover ? '⊡ Ajuster' : '⊞ Plein'}
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-8">
                                        <p className="text-white text-2xl font-bold text-center leading-relaxed drop-shadow-lg">
                                            {current.content}
                                        </p>
                                    </div>
                                )}

                                {/* Caption overlay */}
                                {current.caption && current.image_url && (
                                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent pointer-events-none z-20">
                                        <p className="text-white text-sm text-center font-medium drop-shadow">{current.caption}</p>
                                    </div>
                                )}
                            </div>

                            {/* ── Bottom actions bar (Pill buttons style) ── */}
                            <div className="relative z-40 bg-gradient-to-t from-black via-black/90 to-transparent px-4 pb-6 pt-4 pointer-events-auto">
                                <div className="flex items-center gap-2">
                                    {/* Like button */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); likeStory(current); }}
                                        className={cn("px-3.5 py-2 rounded-full border backdrop-blur-md flex items-center gap-1.5 text-xs font-bold transition-all shadow-lg pointer-events-auto cursor-pointer",
                                            (current.likes || []).includes(userId)
                                                ? "bg-red-500/20 border-red-500/40 text-red-400"
                                                : "bg-black/60 border-white/20 text-white hover:bg-black/80"
                                        )}>
                                        <Heart className={cn("w-4 h-4", (current.likes || []).includes(userId) ? "fill-red-500 text-red-500" : "text-white")} />
                                        <span>{(current.likes || []).length || 0}</span>
                                    </button>

                                    {/* Comment button */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setRightTab('comments'); setShowComments(true); }}
                                        className="px-3.5 py-2 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 backdrop-blur-md flex items-center gap-1.5 text-xs font-bold text-white transition-all shadow-lg pointer-events-auto cursor-pointer">
                                        <MessageCircle className="w-4 h-4 text-amber-400" />
                                        <span>{(storyComments[current.id] || []).length || 0}</span>
                                    </button>

                                    {/* Views button (for Author) */}
                                    {isMyStory && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setRightTab('views'); setShowComments(true); fetchViewers(current.viewed_by || []); }}
                                            className="px-3.5 py-2 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 backdrop-blur-md flex items-center gap-1.5 text-xs font-bold text-teal-300 transition-all shadow-lg pointer-events-auto cursor-pointer">
                                            <Eye className="w-4 h-4 text-teal-400" />
                                            <span>{(current.viewed_by || []).length || 0} vue{(current.viewed_by || []).length > 1 ? 's' : ''}</span>
                                        </button>
                                    )}

                                    <div className="flex-1" />

                                    {/* Delete (Author) or Repost (Non-Author) */}
                                    {isMyStory ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteStory(current.id); }}
                                            className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 backdrop-blur-md transition shadow-lg pointer-events-auto cursor-pointer"
                                            title="Supprimer la story">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); publishStory(true, current); }}
                                            className="px-3 py-2 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 backdrop-blur-md text-xs font-semibold flex items-center gap-1 transition shadow-lg pointer-events-auto cursor-pointer"
                                            title="Reposter cette story">
                                            <Repeat className="w-4 h-4" /> Reposter
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* ── Slide-up Drawer (Dual-tab: Comments & Views) ── */}
                            <AnimatePresence>
                                {showComments && (
                                    <motion.div
                                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                                        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                                        className="absolute bottom-0 left-0 right-0 z-50 bg-[#111827] rounded-t-3xl max-h-[75vh] flex flex-col shadow-2xl border-t border-white/10 pointer-events-auto">

                                        {/* Drawer handle */}
                                        <div className="flex justify-center py-3">
                                            <div className="w-12 h-1 rounded-full bg-white/20" />
                                        </div>

                                        {/* Drawer header & Tabs */}
                                        <div className="flex items-center justify-between px-4 pb-3 border-b border-white/[0.07]">
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => setRightTab('comments')}
                                                    className={cn("text-sm font-bold transition-colors pb-1 border-b-2",
                                                        rightTab === 'comments' ? "text-amber-400 border-amber-400" : "text-slate-400 border-transparent hover:text-white"
                                                    )}>
                                                    💬 Commentaires ({(storyComments[current.id] || []).length})
                                                </button>
                                                {isMyStory && (
                                                    <button
                                                        onClick={() => { setRightTab('views'); fetchViewers(current.viewed_by || []); }}
                                                        className={cn("text-sm font-bold transition-colors pb-1 border-b-2 flex items-center gap-1",
                                                            rightTab === 'views' ? "text-teal-400 border-teal-400" : "text-slate-400 border-transparent hover:text-white"
                                                        )}>
                                                        <Eye className="w-4 h-4" /> Vus par ({(current.viewed_by || []).length})
                                                    </button>
                                                )}
                                            </div>
                                            <button onClick={() => setShowComments(false)} className="p-1.5 rounded-full hover:bg-white/10 text-slate-400">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Tab Content: COMMENTS */}
                                        {rightTab === 'comments' && (
                                            <>
                                                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[160px]">
                                                    {(storyComments[current.id] || []).length === 0 ? (
                                                        <div className="text-center py-8 text-slate-500">
                                                            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                            <p className="text-xs">Soyez le premier à commenter</p>
                                                        </div>
                                                    ) : (
                                                        (storyComments[current.id] || []).map(c => (
                                                            <div key={c.id} className="flex gap-2.5 items-start">
                                                                {c.avatarUrl ? (
                                                                    <img src={c.avatarUrl} className="w-7 h-7 rounded-full object-cover shrink-0" />
                                                                ) : (
                                                                    <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                                                                        {(c.senderName || '?').slice(0, 2).toUpperCase()}
                                                                    </div>
                                                                )}
                                                                <div className="flex-1 bg-white/[0.04] px-3 py-2 rounded-2xl rounded-tl-sm border border-white/[0.05]">
                                                                    <p className="text-[11px] font-bold text-amber-300 mb-0.5">{c.senderName}</p>
                                                                    <p className="text-xs text-slate-200 leading-relaxed">{c.content}</p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>

                                                {/* Comment input */}
                                                <div className="px-4 py-3 border-t border-white/[0.07] flex gap-2 items-center">
                                                    <input
                                                        value={newStoryComment}
                                                        onChange={e => setNewStoryComment(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && postStoryComment(current.id)}
                                                        placeholder="Écrire un commentaire..."
                                                        className="flex-1 h-10 px-4 text-sm bg-white/[0.06] border border-white/10 rounded-full text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
                                                    />
                                                    <button
                                                        onClick={() => postStoryComment(current.id)}
                                                        disabled={!newStoryComment.trim()}
                                                        className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center disabled:opacity-40 transition shrink-0 shadow-lg">
                                                        <Send className="w-4 h-4 text-white" />
                                                    </button>
                                                </div>
                                            </>
                                        )}

                                        {/* Tab Content: VIEWS (Who viewed the story) */}
                                        {rightTab === 'views' && isMyStory && (
                                            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-[200px]">
                                                {viewerDetails.length === 0 ? (
                                                    <div className="text-center py-10 text-slate-500">
                                                        <Eye className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                                        <p className="text-xs">Aucune vue enregistrée pour le moment</p>
                                                    </div>
                                                ) : (
                                                    viewerDetails.map((v: any, idx: number) => (
                                                        <div key={v.id || idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                                            {v.photo_url ? (
                                                                <img src={v.photo_url} className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                                                    {(v.name || '?').slice(0, 2).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-white truncate">{v.name}</p>
                                                                <p className="text-[10px] text-slate-400">{v.role}</p>
                                                            </div>
                                                            <Eye className="w-3.5 h-3.5 text-teal-400 opacity-60" />
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                    </div>{/* /9:16 container */}
                </motion.div>
            );
        })()}

    </AnimatePresence>


    {/* ═══ NEW STORY MODAL ═══ */}
    <AnimatePresence>
        {showNewStory && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 pb-28 sm:pb-4"
                onClick={() => setShowNewStory(false)}>
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                    className="bg-[#1a1d27] rounded-2xl border border-white/10 max-w-md w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto"
                    onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-amber-300">✨ Nouvelle Story</h3>
                        <button onClick={() => setShowNewStory(false)}><X className="w-4 h-4 text-slate-400" /></button>
                    </div>
                    
                    {userRole === 'student' && (
                        <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                            </div>
                            <p className="text-xs text-amber-200/80">Coût de publication : <strong className="text-amber-400">1 Sky Point</strong></p>
                        </div>
                    )}

                    {/* Image & Text */}
                    {storyImagePreview ? (
                        <div className="space-y-3">
                            <div className="relative rounded-xl overflow-hidden bg-black/40 flex items-center justify-center">
                                <img src={storyImagePreview} alt="" className="w-full max-h-48 object-contain" />
                                <button onClick={() => { setStoryImage(null); setStoryImagePreview(''); }}
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-red-500 transition-colors">
                                    <X className="w-4 h-4 text-white" />
                                </button>
                            </div>
                            <div>
                                <label className="block text-[10px] text-slate-400 mb-1">Légende (optionnelle)</label>
                                <Input value={caption} onChange={e => setCaption(e.target.value)} 
                                    placeholder="Ajouter une légende..." 
                                    className="bg-white/5 border-white/10 text-white h-10" 
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <textarea value={storyText} onChange={e => setStoryText(e.target.value)}
                                placeholder="Que voulez-vous raconter ?" rows={3}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-amber-500/30" 
                            />
                            <div className="relative">
                                <label className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-white/10 border border-dashed border-white/10 hover:border-amber-500/30 rounded-xl cursor-pointer transition">
                                    <ImageIcon className="w-4 h-4 text-slate-400" />
                                    <span className="text-xs text-slate-400">Ajouter une image (optionnel)</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleStoryImageSelect} />
                                </label>
                            </div>
                        </div>
                    )}

                    {storyImagePreview && (
                        <div className="relative">
                            <label className="flex items-center justify-center gap-2 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer transition">
                                <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs text-slate-400">Changer l&apos;image</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleStoryImageSelect} />
                            </label>
                        </div>
                    )}

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
                        <div className="space-y-2 bg-black/20 p-3 rounded-xl border border-white/5">
                            <Input value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                                placeholder="Rechercher..." className="bg-white/5 border-white/10 text-white h-8 rounded-lg text-xs" />
                            <div className="max-h-32 overflow-y-auto space-y-1 scrollbar-hide">
                                {filteredContacts.map(c => (
                                    <button key={c.id} onClick={() => setSelectedContacts(prev =>
                                        prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id]
                                    )}
                                        className={cn("w-full flex items-center gap-2 p-2 rounded-lg text-xs transition-all",
                                            selectedContacts.includes(c.id) ? "bg-amber-500/10 border border-amber-500/20" : "bg-white/[0.02] border border-white/5 hover:bg-white/[0.04]")}>
                                        <div className={cn("w-3 h-3 rounded-full flex items-center justify-center", selectedContacts.includes(c.id) ? "bg-amber-500" : "bg-slate-700")}>
                                            {selectedContacts.includes(c.id) && <div className="w-1.5 h-1.5 bg-[#1a1d27] rounded-full" />}
                                        </div>
                                        <span className="text-slate-300">{c.first_name} {c.last_name}</span>
                                        <span className="text-[9px] text-slate-500 ml-auto">{c.role}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-[9px] text-slate-500 text-right">{selectedContacts.length} personne(s) sélectionnée(s)</p>
                        </div>
                    )}

                    <Button onClick={() => publishStory(false)} disabled={publishingStory || (!storyText.trim() && !storyImage)}
                        className="w-full h-11 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl shadow-lg shadow-amber-600/20">
                        {publishingStory ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                        Publier la story
                    </Button>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>

    {/* ═══ POSTS SECTION ═══ */}
    <div className="pt-4 border-t border-white/5 pb-32">
        <div className="flex items-center justify-between mb-4">
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
        
        <div className="flex gap-2 mb-3">
            <button onClick={() => setActivePostTab('general')} className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all", activePostTab === 'general' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5')}>📝 Fil général</button>
            {(userRole === 'admin' || posts.some(p => p.category === 'admin_actus')) && (
                <button onClick={() => setActivePostTab('officiel')} className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all", activePostTab === 'officiel' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5')}>📣 Annonces officielles</button>
            )}
        </div>

        {/* New Post — Bottom Sheet Modal (mobile-safe) */}
        <AnimatePresence>
            {showNewPost && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[140] bg-black/70 backdrop-blur-sm"
                        onClick={() => setShowNewPost(false)}
                    />
                    {/* Sheet */}
                    <motion.div
                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        className="fixed left-0 right-0 bottom-0 z-[150] rounded-t-3xl bg-[#0f1117] border-t border-amber-500/20 shadow-2xl"
                        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 6.5rem)' }}
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-white/20" />
                        </div>

                        <div className="px-4 pt-2 pb-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-amber-300">
                                            {activePostTab === 'officiel' && userRole === 'admin' ? "📣 Annonce officielle" : "📢 Nouvelle publication"}
                                        </h3>
                                        <button onClick={() => setShowNewPost(false)} className="p-1.5 rounded-xl hover:bg-white/10 transition-all">
                                            <X className="w-4 h-4 text-slate-400" />
                                        </button>
                                    </div>

                                    {postImage && (
                                        <div className="relative">
                                            <img src={URL.createObjectURL(postImage)} alt="preview" className="w-full max-h-40 object-cover rounded-xl border border-white/10" />
                                            <button onClick={() => setPostImage(null)} className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
                                                <X className="w-3 h-3 text-white" />
                                            </button>
                                        </div>
                                    )}

                                    <textarea value={newPostContent} onChange={e => setNewPostContent(e.target.value)}
                                        placeholder="Partagez une actualité avec l'école..."
                                        rows={4}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-amber-500/30"
                                        autoFocus />

                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-1.5 cursor-pointer px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-dashed border-white/10 hover:border-amber-500/30 transition-all">
                                            {postImage ? (
                                                <span className="text-[11px] text-amber-400 flex items-center gap-1">
                                                    <ImageIcon className="w-3.5 h-3.5" />{postImage.name.slice(0, 18)}
                                                    <button type="button" onClick={e => { e.preventDefault(); setPostImage(null); }} className="text-red-400 hover:text-red-300"><X className="w-3 h-3" /></button>
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-slate-500 flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" />Photo</span>
                                            )}
                                            <input type="file" accept="image/*" className="hidden" onChange={e => setPostImage(e.target.files?.[0] || null)} />
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] text-amber-400">⭐ 1 Sky</span>
                                            <Button onClick={publishPost} disabled={publishing || uploadingPost || (!newPostContent.trim() && !postImage)}
                                                className="bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs rounded-xl shadow-lg shadow-amber-600/20 h-10 px-5">
                                                {(publishing || uploadingPost) ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                                                Publier
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Posts Feed */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-400" /></div>
                    ) : posts.filter(p => activePostTab === 'officiel' ? p.category === 'admin_actus' : p.category !== 'admin_actus').length === 0 ? (
                        <div className="text-center py-16 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
                            <TrendingUp className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                            <p className="text-sm text-slate-400">Pas encore de publications</p>
                            <p className="text-xs text-slate-500 mt-1">Soyez le premier à partager une actu !</p>
                        </div>
                    ) : posts.filter(p => activePostTab === 'officiel' ? p.category === 'admin_actus' : p.category !== 'admin_actus').map((post, i) => (
                        <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                            className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all group relative">

                            <div className="flex items-start gap-3">
                                {/* Avatar */}
                                {post.avatarUrl ? (
                                    <img src={post.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/10" />
                                ) : (
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0",
                                        post.isAdmin ? "bg-gradient-to-br from-yellow-500 to-amber-600" : "bg-gradient-to-br from-teal-600 to-indigo-600"
                                    )}>
                                        {post.is_anonymous ? '?' : (post.senderName || 'M').split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-sm text-slate-100">{post.is_anonymous ? 'Anonyme' : post.senderName}</span>
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
                                        {post.category === 'admin_actus' && (
                                            <span className="text-[9px] px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full font-bold">📣 OFFICIEL</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{timeAgo(post.created_at)}</p>
                                </div>

                                {/* ── Menu ⋮ (auteur ou admin) ── */}
                                {(post.user_id === userId || userRole === 'admin') && (
                                    <div className="relative shrink-0">
                                        <button
                                            onClick={() => setPostMenuOpen(postMenuOpen === post.id ? null : post.id)}
                                            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                        <AnimatePresence>
                                            {postMenuOpen === post.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                                    className="absolute right-0 top-8 z-50 bg-[#1a1d2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[130px]"
                                                    onClick={e => e.stopPropagation()}>
                                                    {post.user_id === userId && (
                                                        <button
                                                            onClick={() => { setEditingPost(post); setEditContent(post.content); setPostMenuOpen(null); }}
                                                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-300 hover:bg-white/[0.06] transition-colors">
                                                            <Edit2 className="w-3.5 h-3.5 text-indigo-400" /> Modifier
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => { deletePost(post.id); setPostMenuOpen(null); }}
                                                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                                                        <Trash2 className="w-3.5 h-3.5" /> Supprimer
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>

                            {(() => {
                                const isExpanded = expandedPosts[post.id];
                                const isLong = post.content && post.content.length > 180;
                                const displayText = isLong && !isExpanded ? post.content.slice(0, 180) + '…' : post.content;
                                return (
                                    <p className="mt-3 text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                                        {displayText}
                                        {isLong && (
                                            <button
                                                onClick={() => {
                                                    setExpandedPosts(prev => ({ ...prev, [post.id]: !prev[post.id] }));
                                                    recordPostView(post);
                                                }}
                                                className="text-amber-400 font-bold text-xs ml-1.5 hover:underline focus:outline-none"
                                            >
                                                {isExpanded ? 'Voir moins' : 'Lire plus'}
                                            </button>
                                        )}
                                    </p>
                                );
                            })()}

                            {/* Photos */}
                            {post.photos && post.photos.length > 0 && (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    {post.photos.map((photo, pi) => (
                                        <img key={pi} src={photo} alt="" className="rounded-xl w-full h-40 object-cover border border-white/10" />
                                    ))}
                                </div>
                            )}

                            {post.image_url && (
                                <img src={post.image_url} alt="" className="w-full max-h-64 object-cover rounded-xl mt-2 border border-white/10" />
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
                                    <span>{comments[post.id]?.length || commentCounts[post.id] || 0}</span>
                                </button>
                                <button onClick={() => recordPostView(post)}
                                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-teal-300 transition-colors"
                                    title="Nombre de vues">
                                    <Eye className="w-4 h-4 text-teal-400" />
                                    <span>{(post.viewed_by || []).length || 0} vue{(post.viewed_by || []).length > 1 ? 's' : ''}</span>
                                </button>
                                <button onClick={() => sharePost(post)}
                                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-teal-400 transition-colors ml-auto">
                                    <Share2 className="w-4 h-4" />
                                    <span className="hidden sm:inline">Partager</span>
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
                                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 h-9 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/30"
                                                    onKeyDown={e => e.key === 'Enter' && postComment(post.id)} />
                                                <button onClick={() => postComment(post.id)} disabled={postingComment || !newComment.trim()}
                                                    className="h-9 w-9 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 flex items-center justify-center transition-colors disabled:opacity-30 shrink-0">
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
            </div>

            {/* ═══ EDIT POST MODAL ═══ */}
            <AnimatePresence>
                {editingPost && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-28 sm:pb-4"
                        onClick={() => setEditingPost(null)}>
                        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
                            className="bg-[#0f1117] border border-indigo-500/30 rounded-2xl w-full max-w-lg p-5 shadow-2xl relative z-10"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Edit2 className="w-4 h-4 text-indigo-400" /> Modifier la publication
                                </h3>
                                <button onClick={() => setEditingPost(null)}><X className="w-4 h-4 text-slate-400" /></button>
                            </div>
                            <textarea
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                rows={5}
                                autoFocus
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-indigo-500/40"
                            />
                            <div className="flex gap-3 mt-4">
                                <button onClick={() => setEditingPost(null)}
                                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm hover:bg-white/5 transition">
                                    Annuler
                                </button>
                                <button onClick={saveEditPost} disabled={savingEdit || !editContent.trim()}
                                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg shadow-indigo-600/30">
                                    {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Edit2 className="w-4 h-4" /> Enregistrer</>}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
