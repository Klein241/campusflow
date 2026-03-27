'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare, Users, UserPlus, Plus, Loader2, Heart, Send,
    Search, ArrowLeft, ChevronLeft, X, Image as ImageIcon,
    Check, CheckCheck, Trash2, Settings, Paperclip, FileText,
    TrendingUp, Clock, Share2, MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════
// FORUM VIEW — Actus, Groupes, Chat DM
// Inspiré du community-view de Maison de Prière
// ═══════════════════════════════════════════════════════

type ForumTab = 'actus' | 'groupes' | 'dm';

interface ForumViewProps {
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
}

interface ConvInfo {
    id: string;
    type: 'direct' | 'group';
    name: string | null;
    created_by: string | null;
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount?: number;
}

interface MsgInfo {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    msg_type: string;
    media_url: string | null;
    is_read: boolean;
    created_at: string;
}

interface SchoolUser {
    id: string;
    name: string;
    role: string;
    initials: string;
}

export function ForumView({ orgId, orgSlug, userId, userName, userRole }: ForumViewProps) {
    const [forumTab, setForumTab] = useState<ForumTab>('actus');

    // ═══ ACTUS STATE ═══
    const [posts, setPosts] = useState<PostItem[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [showNewPost, setShowNewPost] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [publishing, setPublishing] = useState(false);

    // ═══ MESSAGES STATE ═══
    const [convs, setConvs] = useState<ConvInfo[]>([]);
    const [activeConv, setActiveConv] = useState<ConvInfo | null>(null);
    const [messages, setMessages] = useState<MsgInfo[]>([]);
    const [participants, setParticipants] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<SchoolUser[]>([]);
    const [msgText, setMsgText] = useState('');
    const [sending, setSending] = useState(false);
    const [showNewConv, setShowNewConv] = useState(false);
    const [newConvName, setNewConvName] = useState('');
    const [newConvType, setNewConvType] = useState<'direct' | 'group'>('direct');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [searchUser, setSearchUser] = useState('');
    const [loadingConvs, setLoadingConvs] = useState(true);

    const msgEndRef = useRef<HTMLDivElement>(null);

    // ═══ LOAD ALL SCHOOL USERS ═══
    useEffect(() => {
        (async () => {
            const [{ data: teachers }, { data: students }] = await Promise.all([
                supabase.from('teacher_profiles').select('id, first_name, last_name').eq('organization_id', orgId).eq('is_active', true),
                supabase.from('student_profiles').select('id, first_name, last_name, matricule').eq('organization_id', orgId).eq('is_active', true),
            ]);
            const users: SchoolUser[] = [
                ...(teachers || []).map((t: any) => ({
                    id: t.id,
                    name: `${t.first_name} ${t.last_name}`,
                    role: 'Professeur',
                    initials: `${t.first_name?.[0] || ''}${t.last_name?.[0] || ''}`,
                })),
                ...(students || []).map((s: any) => ({
                    id: s.id,
                    name: `${s.first_name} ${s.last_name}`,
                    role: s.matricule ? `Étudiant — ${s.matricule}` : 'Étudiant',
                    initials: `${s.first_name?.[0] || ''}${s.last_name?.[0] || ''}`,
                })),
            ].filter(u => u.id !== userId);
            setAllUsers(users);
        })();
    }, [orgId, userId]);

    // ═══ LOAD ACTUS (posts) ═══
    useEffect(() => {
        if (forumTab !== 'actus') return;
        loadPosts();
    }, [forumTab, orgId]);

    const loadPosts = async () => {
        setLoadingPosts(true);
        try {
            // Load posts from tutoring_requests scoped to org
            const { data } = await supabase
                .from('tutoring_requests')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (data) {
                // Enrich with sender names from teacher/student profiles
                const enriched = await Promise.all(data.map(async (p: any) => {
                    let senderName = 'Membre';
                    let senderRole = '';
                    const { data: teacher } = await supabase.from('teacher_profiles')
                        .select('first_name, last_name').eq('id', p.user_id).single();
                    if (teacher) {
                        senderName = `${teacher.first_name} ${teacher.last_name}`;
                        senderRole = 'Professeur';
                    } else {
                        const { data: student } = await supabase.from('student_profiles')
                            .select('first_name, last_name').eq('id', p.user_id).single();
                        if (student) {
                            senderName = `${student.first_name} ${student.last_name}`;
                            senderRole = 'Étudiant';
                        }
                    }
                    return { ...p, senderName, senderRole } as PostItem;
                }));
                setPosts(enriched);
            }
        } catch (e) {
            console.error('Error loading posts:', e);
        }
        setLoadingPosts(false);
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

    // ═══ LOAD CONVERSATIONS ═══
    useEffect(() => {
        if (forumTab !== 'groupes' && forumTab !== 'dm') return;
        loadConversations();
    }, [forumTab, orgId, userId]);

    const loadConversations = async () => {
        setLoadingConvs(true);
        try {
            const { data: parts } = await supabase.from('chat_participants')
                .select('conversation_id').eq('user_id', userId);
            const convIds = (parts || []).map((p: any) => p.conversation_id);
            if (convIds.length > 0) {
                const filterType = forumTab === 'groupes' ? 'group' : 'direct';
                const { data: c } = await supabase.from('chat_conversations').select('*')
                    .in('id', convIds).eq('organization_id', orgId).eq('type', filterType)
                    .order('created_at', { ascending: false });

                const enriched = await Promise.all((c || []).map(async (conv: any) => {
                    const { data: lastMsg } = await supabase.from('chat_messages')
                        .select('content, created_at').eq('conversation_id', conv.id)
                        .order('created_at', { ascending: false }).limit(1).single();
                    const { count } = await supabase.from('chat_messages')
                        .select('id', { count: 'exact', head: true })
                        .eq('conversation_id', conv.id).eq('is_read', false).neq('sender_id', userId);
                    return {
                        ...conv,
                        lastMessage: lastMsg?.content || null,
                        lastMessageAt: lastMsg?.created_at || conv.created_at,
                        unreadCount: count || 0,
                    } as ConvInfo;
                }));
                enriched.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
                setConvs(enriched);
            } else {
                setConvs([]);
            }
        } catch (e) {
            console.error('Error loading convs:', e);
        }
        setLoadingConvs(false);
    };

    // ═══ LOAD MESSAGES ═══
    useEffect(() => {
        if (!activeConv) return;
        let channel: any;
        (async () => {
            const { data: msgs } = await supabase.from('chat_messages').select('*')
                .eq('conversation_id', activeConv.id)
                .order('created_at', { ascending: true }).limit(200);
            setMessages(msgs || []);
            const { data: parts } = await supabase.from('chat_participants')
                .select('user_id, role').eq('conversation_id', activeConv.id);
            setParticipants(parts || []);
            await supabase.from('chat_messages').update({ is_read: true })
                .eq('conversation_id', activeConv.id).neq('sender_id', userId).eq('is_read', false);
            setConvs(prev => prev.map(c => c.id === activeConv.id ? { ...c, unreadCount: 0 } : c));
            setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

            channel = supabase.channel(`forum-msgs-${activeConv.id}`).on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'chat_messages',
                filter: `conversation_id=eq.${activeConv.id}`,
            }, (payload: any) => {
                setMessages(prev => {
                    if (prev.find(m => m.id === payload.new.id)) return prev;
                    return [...prev, payload.new as MsgInfo];
                });
                if (payload.new.sender_id !== userId) {
                    supabase.from('chat_messages').update({ is_read: true }).eq('id', payload.new.id).then(() => { });
                }
                setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
            }).subscribe();
        })();
        return () => { if (channel) supabase.removeChannel(channel); };
    }, [activeConv?.id, userId]);

    // ═══ SEND MESSAGE ═══
    const sendMessage = useCallback(async () => {
        if (!msgText.trim() || !activeConv) return;
        setSending(true);
        const text = msgText.trim();
        const tempId = `temp_${Date.now()}`;
        const optimistic: MsgInfo = {
            id: tempId, conversation_id: activeConv.id, sender_id: userId,
            content: text, msg_type: 'text', media_url: null, is_read: false,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimistic]);
        setMsgText('');
        setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        try {
            const { data, error } = await supabase.from('chat_messages').insert({
                conversation_id: activeConv.id, sender_id: userId,
                content: text, msg_type: 'text',
            }).select().single();
            if (error) throw error;
            if (data) setMessages(prev => prev.map(m => m.id === tempId ? data as MsgInfo : m));
            setConvs(prev => prev.map(c =>
                c.id === activeConv.id ? { ...c, lastMessage: text, lastMessageAt: new Date().toISOString() } : c
            ).sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()));
        } catch (e) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setMsgText(text);
            toast.error("Erreur d'envoi");
        }
        setSending(false);
    }, [msgText, activeConv, userId]);

    // ═══ CREATE CONVERSATION ═══
    const createConversation = async () => {
        if (selectedUsers.length === 0) { toast.error('Sélectionnez au moins un membre'); return; }
        if (newConvType === 'group' && !newConvName.trim()) { toast.error('Nom du groupe requis'); return; }
        setSending(true);
        try {
            const name = newConvType === 'direct'
                ? allUsers.find(u => u.id === selectedUsers[0])?.name || 'Conversation'
                : newConvName.trim();

            if (newConvType === 'direct') {
                const otherId = selectedUsers[0];
                const { data: otherParts } = await supabase.from('chat_participants').select('conversation_id').eq('user_id', otherId);
                const { data: myParts } = await supabase.from('chat_participants').select('conversation_id').eq('user_id', userId);
                if (otherParts && myParts) {
                    const otherConvIds = new Set(otherParts.map((p: any) => p.conversation_id));
                    for (const mp of myParts) {
                        if (otherConvIds.has(mp.conversation_id)) {
                            const { data: convCheck } = await supabase.from('chat_conversations')
                                .select('*').eq('id', mp.conversation_id).eq('type', 'direct').single();
                            if (convCheck) {
                                setActiveConv(convCheck);
                                setShowNewConv(false); setSelectedUsers([]);
                                setSending(false);
                                toast.info('Conversation existante ouverte');
                                return;
                            }
                        }
                    }
                }
            }

            const { data: conv, error: convErr } = await supabase.from('chat_conversations').insert({
                organization_id: orgId, type: newConvType, name, created_by: userId,
            }).select().single();
            if (convErr) throw convErr;

            const allParts = [userId, ...selectedUsers].map(uid => ({
                conversation_id: conv.id, user_id: uid, role: uid === userId ? 'admin' : 'member',
            }));
            await supabase.from('chat_participants').insert(allParts);
            await supabase.from('chat_messages').insert({
                conversation_id: conv.id, sender_id: userId,
                content: newConvType === 'direct' ? 'Conversation démarrée' : `Groupe "${name}" créé`,
                msg_type: 'system',
            });

            const newConvInfo: ConvInfo = { ...conv, lastMessage: 'Conversation créée', lastMessageAt: new Date().toISOString(), unreadCount: 0 };
            setConvs(prev => [newConvInfo, ...prev]);
            setActiveConv(newConvInfo);
            setShowNewConv(false); setNewConvName(''); setSelectedUsers([]);
            toast.success('Conversation créée !');
        } catch (e: any) { toast.error(e.message); }
        setSending(false);
    };

    // ═══ HELPERS ═══
    const getSenderName = (id: string) => {
        if (id === userId) return 'Vous';
        return allUsers.find(u => u.id === id)?.name || 'Membre';
    };
    const getSenderInitials = (id: string) => {
        if (id === userId) return userName.split(' ').map(w => w[0]).join('').slice(0, 2);
        return allUsers.find(u => u.id === id)?.initials || '?';
    };
    const formatTime = (ts: string) => {
        const d = new Date(ts);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        if (diff < 60000) return "à l'instant";
        if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'Hier ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
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

    const filteredUsers = allUsers.filter(u => !searchUser || u.name.toLowerCase().includes(searchUser.toLowerCase()));

    // ═══ IF VIEWING A CONVERSATION ═══
    if (activeConv) {
        return (
            <div className="flex flex-col h-[calc(100vh-140px)]">
                {/* Chat header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-white/[0.02] backdrop-blur-sm rounded-t-2xl">
                    <button onClick={() => { setActiveConv(null); setMessages([]); }} className="p-1.5 hover:bg-white/5 rounded-xl">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                        activeConv.type === 'group'
                            ? 'bg-gradient-to-br from-teal-600/30 to-emerald-600/30 text-teal-300'
                            : 'bg-gradient-to-br from-indigo-600/30 to-purple-600/30 text-indigo-300'
                    )}>
                        {activeConv.type === 'group' ? <Users className="w-5 h-5" /> : (activeConv.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{activeConv.name || 'Conversation'}</p>
                        <p className="text-[10px] text-slate-500">{participants.length} membre{participants.length > 1 ? 's' : ''}</p>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 scrollbar-thin">
                    {messages.map((m, idx) => {
                        const isMe = m.sender_id === userId;
                        const isSystem = m.msg_type === 'system';
                        const showSenderName = !isMe && !isSystem && activeConv.type !== 'direct' &&
                            (idx === 0 || messages[idx - 1]?.sender_id !== m.sender_id);
                        const showAvatar = !isMe && !isSystem &&
                            (idx === messages.length - 1 || messages[idx + 1]?.sender_id !== m.sender_id);

                        if (isSystem) {
                            return (
                                <div key={m.id} className="text-center my-3">
                                    <span className="text-[10px] text-slate-500 bg-white/5 px-3 py-1 rounded-full">{m.content}</span>
                                </div>
                            );
                        }
                        return (
                            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${showSenderName ? 'mt-3' : ''}`}>
                                {!isMe && showAvatar ? (
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-600 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mr-2 mt-auto mb-5">
                                        {getSenderInitials(m.sender_id)}
                                    </div>
                                ) : !isMe ? <div className="w-7 shrink-0 mr-2" /> : null}
                                <div className="max-w-[75%]">
                                    {showSenderName && <p className="text-[10px] text-teal-400 font-medium mb-0.5 ml-1">{getSenderName(m.sender_id)}</p>}
                                    <div className={cn("px-3 py-2 rounded-2xl text-sm leading-relaxed",
                                        isMe ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-br-md shadow-lg shadow-teal-600/10'
                                            : 'bg-white/[0.06] text-white rounded-bl-md'
                                    )}>
                                        {m.content}
                                    </div>
                                    <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end mr-1' : 'ml-1'}`}>
                                        <span className="text-[10px] text-slate-600">{formatTime(m.created_at)}</span>
                                        {isMe && <CheckCheck className={`w-3 h-3 ${m.is_read ? 'text-teal-400' : 'text-slate-600'}`} />}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={msgEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-white/5 bg-[#0F1219]/50">
                    <div className="flex gap-2 items-center">
                        <Input
                            value={msgText}
                            onChange={e => setMsgText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                            placeholder="Écrire un message..."
                            className="bg-white/5 border-white/10 text-white h-10 rounded-full text-sm flex-1"
                        />
                        <Button onClick={sendMessage} disabled={sending || !msgText.trim()}
                            className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-full w-10 h-10 p-0 shrink-0 shadow-lg shadow-teal-600/20">
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // ═══ MAIN FORUM VIEW ═══
    return (
        <div className="space-y-4">
            {/* Quick action buttons (Maison de Prière style) */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                <button
                    onClick={() => { setForumTab('dm'); setShowNewConv(true); setNewConvType('direct'); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600/15 to-violet-600/15 border border-indigo-500/20 hover:border-indigo-500/40 transition-all whitespace-nowrap group"
                >
                    <UserPlus className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium text-indigo-300">Retrouver vos contacts</span>
                </button>
                <button
                    onClick={() => { setForumTab('groupes'); setShowNewConv(true); setNewConvType('group'); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600/15 to-emerald-600/15 border border-teal-500/20 hover:border-teal-500/40 transition-all whitespace-nowrap group"
                >
                    <Users className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium text-teal-300">Rejoindre des groupes</span>
                </button>
                <button
                    onClick={() => setShowNewPost(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600/15 to-orange-600/15 border border-amber-500/20 hover:border-amber-500/40 transition-all whitespace-nowrap group"
                >
                    <Plus className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium text-amber-300">Publier une actu</span>
                </button>
            </div>

            {/* Forum sub-tabs */}
            <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/5">
                {[
                    { id: 'actus' as ForumTab, label: 'Actus', icon: TrendingUp, count: posts.length },
                    { id: 'groupes' as ForumTab, label: 'Groupes', icon: Users },
                    { id: 'dm' as ForumTab, label: 'Chat DM', icon: MessageSquare },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setForumTab(tab.id); setActiveConv(null); }}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all",
                            forumTab === tab.id
                                ? 'bg-gradient-to-r from-teal-600/20 to-emerald-600/20 text-teal-300 border border-teal-500/20 shadow-lg shadow-teal-600/10'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        )}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ═══ NEW POST DIALOG ═══ */}
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

            {/* ═══ TAB CONTENT ═══ */}
            <AnimatePresence mode="wait">
                {/* ACTUS TAB */}
                {forumTab === 'actus' && (
                    <motion.div key="actus" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="space-y-3">
                        {loadingPosts ? (
                            <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-400" /></div>
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
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                        {post.is_anonymous ? '?' : (post.senderName || 'M').split(' ').map(w => w[0]).join('').slice(0, 2)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm">{post.is_anonymous ? 'Anonyme' : post.senderName}</span>
                                            {post.senderRole && (
                                                <span className={cn("text-[10px] px-2 py-0.5 rounded-full",
                                                    post.senderRole === 'Professeur' ? 'bg-indigo-500/15 text-indigo-400' : 'bg-teal-500/15 text-teal-400'
                                                )}>{post.senderRole}</span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-0.5">{timeAgo(post.created_at)}</p>
                                    </div>
                                </div>
                                <p className="mt-3 text-sm text-slate-200 leading-relaxed whitespace-pre-line">{post.content}</p>
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
                    </motion.div>
                )}

                {/* GROUPES & DM TAB */}
                {(forumTab === 'groupes' || forumTab === 'dm') && (
                    <motion.div key={forumTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="space-y-3">
                        {/* New conversation form */}
                        <AnimatePresence>
                            {showNewConv && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden">
                                    <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-500/5 to-indigo-500/5 border border-teal-500/20 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-teal-300">
                                                {newConvType === 'direct' ? '💬 Nouveau message' : '👥 Nouveau groupe'}
                                            </h3>
                                            <button onClick={() => { setShowNewConv(false); setSelectedUsers([]); }}>
                                                <X className="w-4 h-4 text-slate-400" />
                                            </button>
                                        </div>
                                        {newConvType === 'group' && (
                                            <Input value={newConvName} onChange={e => setNewConvName(e.target.value)}
                                                placeholder="Nom du groupe..."
                                                className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-xs" />
                                        )}
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                                            <Input value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="Chercher un membre..."
                                                className="bg-white/5 border-white/10 text-white h-9 pl-8 rounded-xl text-xs" />
                                        </div>
                                        {selectedUsers.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {selectedUsers.map(uid => {
                                                    const u = allUsers.find(u => u.id === uid);
                                                    return (
                                                        <span key={uid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-600/20 text-teal-300 text-[10px]">
                                                            {u?.name || 'Membre'}
                                                            <button onClick={() => setSelectedUsers(prev => prev.filter(id => id !== uid))}><X className="w-2.5 h-2.5" /></button>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        <div className="max-h-40 overflow-y-auto space-y-0.5 scrollbar-thin">
                                            {filteredUsers.map(u => (
                                                <button key={u.id} onClick={() => {
                                                    if (newConvType === 'direct') setSelectedUsers([u.id]);
                                                    else setSelectedUsers(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]);
                                                }} className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs transition",
                                                    selectedUsers.includes(u.id) ? 'bg-teal-600/20 text-teal-300' : 'hover:bg-white/5 text-slate-400'
                                                )}>
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-600 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0">{u.initials}</div>
                                                    <div className="text-left min-w-0">
                                                        <span className="truncate block">{u.name}</span>
                                                        <span className="text-[9px] text-slate-600 block">{u.role}</span>
                                                    </div>
                                                    {selectedUsers.includes(u.id) && <Check className="w-3 h-3 text-teal-400 ml-auto shrink-0" />}
                                                </button>
                                            ))}
                                        </div>
                                        <Button onClick={createConversation} disabled={sending}
                                            className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-xs rounded-xl shadow-lg shadow-teal-600/20">
                                            {sending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                                            Créer la conversation
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Conversation list */}
                        {loadingConvs ? (
                            <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-400" /></div>
                        ) : convs.length === 0 ? (
                            <div className="text-center py-16">
                                {forumTab === 'groupes' ? <Users className="w-14 h-14 mx-auto mb-3 text-slate-700" /> : <MessageSquare className="w-14 h-14 mx-auto mb-3 text-slate-700" />}
                                <p className="text-sm text-slate-500">{forumTab === 'groupes' ? 'Aucun groupe' : 'Aucune conversation'}</p>
                                <Button size="sm" variant="ghost" className="text-teal-400 text-xs mt-3" onClick={() => setShowNewConv(true)}>
                                    <Plus className="w-3 h-3 mr-1" /> {forumTab === 'groupes' ? 'Créer un groupe' : 'Nouvelle conversation'}
                                </Button>
                            </div>
                        ) : convs.map(c => (
                            <button key={c.id} onClick={() => setActiveConv(c)}
                                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/15 transition-all text-left group">
                                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                                    c.type === 'group'
                                        ? 'bg-gradient-to-br from-teal-600/30 to-emerald-600/30 text-teal-300'
                                        : 'bg-gradient-to-br from-indigo-600/30 to-purple-600/30 text-indigo-300'
                                )}>
                                    {c.type === 'group' ? <Users className="w-5 h-5" /> : <span className="text-lg">{(c.name || '?').charAt(0).toUpperCase()}</span>}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="font-medium text-sm truncate">{c.name || 'Conversation'}</p>
                                        <span className="text-[10px] text-slate-500 shrink-0 ml-2">{c.lastMessageAt ? formatTime(c.lastMessageAt) : ''}</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                        <p className="text-xs text-slate-500 truncate">{c.lastMessage || '...'}</p>
                                        {(c.unreadCount || 0) > 0 && (
                                            <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 ml-2 shadow-lg shadow-teal-600/30">{c.unreadCount}</span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
