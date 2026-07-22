'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, Plus, Loader2, Heart, Send, X, Share2,
    ShieldCheck, Image as ImageIcon, MessageCircle, ChevronLeft,
    ChevronRight, Globe, Users, UserCheck, Eye, Clock, Repeat, Trash2, Reply
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

export function ActusView({ orgId, orgSlug, userId, userName, userRole }: ActusViewProps) {
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

    // Post Comments
    const [comments, setComments] = useState<Record<string, CommentItem[]>>({});
    const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
    const [expandedComments, setExpandedComments] = useState<string | null>(null);
    const [newComment, setNewComment] = useState('');
    const [postingComment, setPostingComment] = useState(false);

    // Contacts for "selected" visibility
    const [contacts, setContacts] = useState<any[]>([]);
    const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
    const [contactSearch, setContactSearch] = useState('');

    // ═══ LOAD ═══
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
            if (data) {
                const enriched = await Promise.all(data.map(async (s: any) => {
                    const user = await resolveUser(s.user_id);
                    return { 
                        ...s, 
                        senderName: user.senderName, 
                        avatarUrl: user.avatarUrl,
                        likes: s.likes || [],
                        viewed_by: s.viewed_by || []
                    } as StoryItem;
                }));
                setStories(enriched);
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
        
        // Sky Points check
        const { data: spendResult } = await supabase.rpc('spend_sky_point', {
            p_user_id: userId,
            p_org_id: orgId,
            p_amount: 1,
            p_reason: 'actus_post',
            p_description: 'Publication d\'une actus'
        });
        if (spendResult && !spendResult.success) {
            toast.error('Solde Sky Points insuffisant \u2014 1 point requis pour poster');
            return;
        }

        setPublishing(true);
        setUploadingPost(true);
        try {
            let finalImageUrl = null;
            if (postImage) {
                const compressed = await compressImage(postImage, { maxWidth: 1200, quality: 0.8 });
                const ext = postImage.name.split('.').pop();
                const path = `posts/${orgId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('organization-assets')
                    .upload(path, compressed);
                
                if (uploadError) throw uploadError;
                
                const { data: publicUrlData } = supabase.storage
                    .from('organization-assets')
                    .getPublicUrl(path);
                    
                finalImageUrl = publicUrlData.publicUrl;
            }

            const { error } = await supabase.from('tutoring_requests').insert({
                user_id: userId, 
                content: newPostContent.trim(),
                category: activePostTab === 'officiel' && userRole === 'admin' ? 'admin_actus' : 'post', 
                is_anonymous: false, 
                prayer_count: 0, 
                prayed_by: [],
                ...(finalImageUrl ? { image_url: finalImageUrl } : {})
            });
            if (error) throw error;
            toast.success('Publication partagée ! 🎉');
            setNewPostContent('');
            setPostImage(null); 
            setShowNewPost(false); 
            loadPosts();
        } catch (e: any) { toast.error(e.message || 'Erreur'); }
        setPublishing(false);
        setUploadingPost(false);
    };

    const likePost = async (post: PostItem) => {
        const alreadyLiked = post.prayed_by?.includes(userId);
        const newCount = alreadyLiked ? Math.max(0, post.prayer_count - 1) : post.prayer_count + 1;
        const newBy = alreadyLiked ? post.prayed_by.filter(id => id !== userId) : [...(post.prayed_by || []), userId];
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, prayer_count: newCount, prayed_by: newBy } : p));
        await supabase.from('tutoring_requests').update({ prayer_count: newCount, prayed_by: newBy }).eq('id', post.id);
    };

    const sharePost = async (post: PostItem) => {
        const url = `${window.location.origin}/${orgSlug}/campus`;
        const text = `${post.senderName || 'Utilisateur'}: ${post.content.slice(0, 100)}...`;
        if (navigator.share) {
            try { await navigator.share({ title: 'CampusFlow', text, url }); } catch { }
        } else {
            await navigator.clipboard.writeText(`${text}\n${url}`);
            toast.success('Lien copié ! 📋');
        }
    };

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

    // ═══ STORY LOGIC ═══
    const publishStory = async (isRepost = false, repostData?: StoryItem) => {
        if (!isRepost && !storyText.trim() && !storyImage) { toast.error('Ajoutez du texte ou une image'); return; }
        
        // 9. Coût Sky Points
        if (userRole === 'student') {
            const { data: profile } = await supabase.from('student_profiles').select('sky_points').eq('id', userId).single();
            if (!profile || (profile.sky_points || 0) < 1) {
                toast.error("Tu n'as pas assez de Sky Points (1 requis)");
                return;
            }
        }
        
        setPublishingStory(true);
        try {
            let imageUrl: string | null = isRepost && repostData ? repostData.image_url : null;
            
            // 1. Fix image upload
            if (!isRepost && storyImage) {
                const compressed = await compressImage(storyImage, { maxWidth: 1080, quality: 0.7 });
                const path = `stories/${userId}/${Date.now()}_${storyImage.name}`;
                await supabase.storage.from('organization-assets').upload(path, compressed, { 
                    contentType: compressed.type,
                    upsert: true
                });
                const { data: u } = supabase.storage.from('organization-assets').getPublicUrl(path);
                imageUrl = u.publicUrl;
            }

            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);

            const contentToSave = isRepost && repostData ? repostData.content : storyText.trim();
            // 2. Caption
            const captionToSave = isRepost && repostData ? (repostData.caption || '') : caption.trim();

            const { error } = await supabase.from('stories').insert({
                user_id: userId, 
                organization_id: orgId, 
                content: contentToSave,
                caption: captionToSave,
                image_url: imageUrl, 
                visibility: isRepost ? 'public' : storyVisibility,
                visible_to: (!isRepost && storyVisibility === 'selected') ? selectedContacts : [],
                expires_at: expiresAt.toISOString(),
                likes: [],
                viewed_by: []
            });
            if (error) throw error;
            
            // Deduct point
            if (userRole === 'student') {
                const { data: profile } = await supabase.from('student_profiles').select('sky_points').eq('id', userId).single();
                if (profile) {
                    await supabase.from('student_profiles').update({ sky_points: profile.sky_points - 1 }).eq('id', userId);
                    await supabase.from('sky_transactions').insert({
                        student_id: userId,
                        amount: -1,
                        transaction_type: 'story_post',
                        description: isRepost ? 'Repost d\'une story' : 'Publication d\'une story',
                        organization_id: orgId
                    });
                }
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

    // 5. Vu par
    const markStoryViewed = async (story: StoryItem) => {
        const newViewedBy = [...(story.viewed_by || []), userId];
        setStories(prev => prev.map(s => s.id === story.id ? { ...s, viewed_by: newViewedBy } : s));
        if (viewingStory?.id === story.id) {
            setViewingStory(prev => prev ? { ...prev, viewed_by: newViewedBy } : prev);
        }
        await supabase.from('stories').update({ viewed_by: newViewedBy }).eq('id', story.id);
    };

    useEffect(() => {
        if (viewingStory && viewingStory.user_id !== userId && !(viewingStory.viewed_by || []).includes(userId)) {
            markStoryViewed(viewingStory);
        }
        if (viewingStory) {
            loadStoryComments(viewingStory.id);
            if (viewingStory.user_id === userId && rightTab === 'views') {
                fetchViewers(viewingStory.viewed_by || []);
            }
        }
    }, [viewingStory?.id, rightTab]);

    const fetchViewers = async (viewedByList: string[]) => {
        if (!viewedByList.length) { setViewerDetails([]); return; }
        const { data: students } = await supabase.from('student_profiles').select('id, first_name, last_name, photo_url').in('id', viewedByList);
        const { data: teachers } = await supabase.from('teacher_profiles').select('id, first_name, last_name, photo_url').in('id', viewedByList);
        setViewerDetails([...(students || []), ...(teachers || [])]);
    };

    // 3. Likes
    const likeStory = async (story: StoryItem) => {
        const isLiked = (story.likes || []).includes(userId);
        const newLikes = isLiked ? (story.likes || []).filter(id => id !== userId) : [...(story.likes || []), userId];
        setStories(prev => prev.map(s => s.id === story.id ? { ...s, likes: newLikes } : s));
        if (viewingStory?.id === story.id) {
            setViewingStory(prev => prev ? { ...prev, likes: newLikes } : prev);
        }
        await supabase.from('stories').update({ likes: newLikes }).eq('id', story.id);
    };

    // 8. Delete Story
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

    // 4. Story Comments
    const loadStoryComments = async (storyId: string) => {
        const { data } = await supabase.from('story_comments').select('*')
            .eq('story_id', storyId).order('created_at', { ascending: true });
        if (data) {
            const enriched = await Promise.all(data.map(async (c: any) => {
                const user = await resolveUser(c.user_id);
                return { ...c, senderName: user.senderName, avatarUrl: user.avatarUrl } as StoryCommentItem;
            }));
            setStoryComments(prev => ({ ...prev, [storyId]: enriched }));
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


                    return (
                        <motion.div key={current.id}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] bg-black flex flex-col"
                            onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
                            onTouchEnd={e => {
                                const delta = e.changedTouches[0].clientX - touchStartX.current;
                                if (Math.abs(delta) > 50) navigateStory(delta < 0 ? 1 : -1);
                            }}>

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

                            {/* ── Tap left / right zones ── */}
                            <div className="absolute inset-0 z-20 flex">
                                <div className="flex-1" onClick={() => navigateStory(-1)} />
                                <div className="flex-1" onClick={() => navigateStory(1)} />
                            </div>

                            {/* ── Media or text content ── */}
                            <div className="flex-1 relative overflow-hidden">
                                {current.image_url ? (
                                    <img
                                        src={current.image_url}
                                        alt={current.caption || ''}
                                        className="w-full h-full object-cover"
                                        draggable={false}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-8">
                                        <p className="text-white text-2xl font-bold text-center leading-relaxed drop-shadow-lg">
                                            {current.content}
                                        </p>
                                    </div>
                                )}

                                {/* Caption overlay */}
                                {current.caption && current.image_url && (
                                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
                                        <p className="text-white text-sm text-center font-medium drop-shadow">{current.caption}</p>
                                    </div>
                                )}
                            </div>

                            {/* ── Bottom actions bar ── */}
                            <div className="relative z-30 bg-gradient-to-t from-black via-black/80 to-transparent px-4 py-3">
                                <div className="flex items-center gap-3">
                                    {/* Comment input inline (Instagram style) */}
                                    <button
                                        onClick={() => setShowComments(prev => !prev)}
                                        className="flex items-center gap-1.5 text-white/80 hover:text-white transition">
                                        <MessageCircle className="w-6 h-6" />
                                        <span className="text-sm">{(storyComments[current.id] || []).length || ''}</span>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); likeStory(current); }}
                                        className="flex items-center gap-1.5 transition">
                                        <Heart className={cn("w-6 h-6", (current.likes || []).includes(userId) ? "fill-red-500 text-red-500" : "text-white/80 hover:text-red-400")} />
                                        <span className="text-sm text-white/80">{(current.likes || []).length || ''}</span>
                                    </button>
                                    {isMyStory && (
                                        <>
                                            <button onClick={() => setRightTab(rightTab === 'views' ? 'comments' : 'views')} className="flex items-center gap-1 text-white/70 hover:text-white transition">
                                                <Eye className="w-5 h-5" />
                                                <span className="text-xs">{current.viewed_by?.length || 0}</span>
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); deleteStory(current.id); }} className="ml-auto p-2 text-white/60 hover:text-red-400 transition">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                    {!isMyStory && (
                                        <button onClick={(e) => { e.stopPropagation(); publishStory(true, current); }} className="ml-auto flex items-center gap-1.5 text-white/70 hover:text-green-400 transition">
                                            <Repeat className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* ── Comments slide-up drawer ── */}
                            <AnimatePresence>
                                {showComments && (
                                    <motion.div
                                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                                        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                                        className="absolute bottom-0 left-0 right-0 z-50 bg-[#111827] rounded-t-3xl max-h-[70vh] flex flex-col shadow-2xl border-t border-white/10">

                                        {/* Drawer handle */}
                                        <div className="flex justify-center py-3">
                                            <div className="w-12 h-1 rounded-full bg-white/20" />
                                        </div>

                                        {/* Drawer header */}
                                        <div className="flex items-center justify-between px-4 pb-3 border-b border-white/[0.07]">
                                            <p className="text-sm font-bold text-white">Commentaires</p>
                                            <button onClick={() => setShowComments(false)} className="p-1.5 rounded-full hover:bg-white/10 text-slate-400">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Comments list */}
                                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                                            {(storyComments[current.id] || []).length === 0 ? (
                                                <div className="text-center py-6 text-slate-500">
                                                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                    <p className="text-xs">Soyez le premier à commenter</p>
                                                </div>
                                            ) : (
                                                (storyComments[current.id] || []).map(c => (
                                                    <div key={c.id} className="flex gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                                                            {(c.senderName || '?').slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="flex-1 bg-white/[0.04] px-3 py-2 rounded-2xl rounded-tl-sm">
                                                            <p className="text-[11px] font-bold text-slate-200 mb-0.5">{c.senderName}</p>
                                                            <p className="text-xs text-slate-300 leading-relaxed">{c.content}</p>
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
                                                className="flex-1 h-10 px-3 text-sm bg-white/[0.06] border border-white/10 rounded-full text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
                                            />
                                            <button
                                                onClick={() => postStoryComment(current.id)}
                                                disabled={!newStoryComment.trim()}
                                                className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center disabled:opacity-40 transition shrink-0">
                                                <Send className="w-4 h-4 text-white" />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
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
                                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                                        <div className="relative flex justify-center text-[10px]"><span className="px-2 bg-[#1a1d27] text-slate-500">OU</span></div>
                                    </div>
                                    <label className="block w-full py-6 rounded-xl border-2 border-dashed border-white/10 text-center cursor-pointer hover:border-amber-500/30 hover:bg-white/[0.02] transition-colors">
                                        <ImageIcon className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                                        <span className="text-xs text-slate-500">Ajouter une image</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                                            const f = e.target.files?.[0];
                                            if (f) { setStoryImage(f); setStoryImagePreview(URL.createObjectURL(f)); }
                                        }} />
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
            <div className="pt-4 border-t border-white/5">
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
                        <button onClick={() => setActivePostTab('officiel')} className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all", activePostTab === 'officiel' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5')}>📣 Annonces officelles</button>
                    )}
                </div>

                {/* New Post Dialog */}
                <AnimatePresence>
                    {showNewPost && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden mb-4">
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-amber-300">
                                        {activePostTab === 'officiel' && userRole === 'admin' ? "📣 Annonce officielle" : "📢 Nouvelle publication"}
                                    </h3>
                                    <button onClick={() => setShowNewPost(false)}><X className="w-4 h-4 text-slate-400" /></button>
                                </div>
                                {postImage && (
                                    <div className="relative">
                                        <img src={URL.createObjectURL(postImage)} alt="preview" className="w-full max-h-48 object-cover rounded-xl border border-white/10" />
                                        <button onClick={() => setPostImage(null)} className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
                                            <X className="w-3 h-3 text-white" />
                                        </button>
                                    </div>
                                )}
                                <textarea value={newPostContent} onChange={e => setNewPostContent(e.target.value)}
                                    placeholder="Partagez une actualité avec l'école..."
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-amber-500/30"
                                    autoFocus />
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-dashed border-white/10 hover:border-amber-500/30 transition-all">
                                        {postImage ? (
                                            <span className="text-[11px] text-amber-400 flex items-center gap-1">
                                                <ImageIcon className="w-3.5 h-3.5" />{postImage.name.slice(0, 20)}
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
                                            className="bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs rounded-xl shadow-lg shadow-amber-600/20">
                                            {(publishing || uploadingPost) ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                                            Publier
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
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
                            </div>
                            <p className="mt-3 text-sm text-slate-200 leading-relaxed whitespace-pre-line">{post.content}</p>

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
        </div>
    );
}
