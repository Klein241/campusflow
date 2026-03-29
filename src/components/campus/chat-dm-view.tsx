'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare, Users, UserPlus, Plus, Loader2, Send,
    Search, ChevronLeft, X, Check, CheckCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════
// CHAT DM VIEW — Espace dédié aux messages directs
// Conversations privées one-to-one
// ═══════════════════════════════════════════════════════

interface ChatDMViewProps {
    orgId: string;
    orgSlug: string;
    userId: string;
    userName: string;
    userRole: string;
    initialTargetUserId?: string | null;
    initialTargetName?: string | null;
    onClearTarget?: () => void;
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

export function ChatDMView({ orgId, orgSlug, userId, userName, userRole, initialTargetUserId, initialTargetName, onClearTarget }: ChatDMViewProps) {
    const [convs, setConvs] = useState<ConvInfo[]>([]);
    const [activeConv, setActiveConv] = useState<ConvInfo | null>(null);
    const [messages, setMessages] = useState<MsgInfo[]>([]);
    const [participants, setParticipants] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<SchoolUser[]>([]);
    const [msgText, setMsgText] = useState('');
    const [sending, setSending] = useState(false);
    const [showNewConv, setShowNewConv] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [searchUser, setSearchUser] = useState('');
    const [loadingConvs, setLoadingConvs] = useState(true);

    const msgEndRef = useRef<HTMLDivElement>(null);

    // Load all school users
    useEffect(() => {
        (async () => {
            const [{ data: teachers }, { data: students }] = await Promise.all([
                supabase.from('teacher_profiles').select('id, first_name, last_name').eq('organization_id', orgId).eq('is_active', true),
                supabase.from('student_profiles').select('id, first_name, last_name').eq('organization_id', orgId).eq('is_active', true),
            ]);
            const users: SchoolUser[] = [
                ...(teachers || []).map((t: any) => ({
                    id: t.id, name: `${t.first_name} ${t.last_name}`, role: 'Professeur',
                    initials: `${t.first_name?.[0] || ''}${t.last_name?.[0] || ''}`,
                })),
                ...(students || []).map((s: any) => ({
                    id: s.id, name: `${s.first_name} ${s.last_name}`, role: 'Étudiant',
                    initials: `${s.first_name?.[0] || ''}${s.last_name?.[0] || ''}`,
                })),
            ].filter(u => u.id !== userId);
            setAllUsers(users);
        })();
    }, [orgId, userId]);

    // Handle initial DM target from contacts
    useEffect(() => {
        if (initialTargetUserId && initialTargetName) {
            handleStartDMFromContact(initialTargetUserId, initialTargetName);
            onClearTarget?.();
        }
    }, [initialTargetUserId, initialTargetName]);

    const handleStartDMFromContact = async (targetId: string, targetName: string) => {
        // Check if conversation already exists
        const { data: myParts } = await supabase.from('chat_participants').select('conversation_id').eq('user_id', userId);
        const { data: otherParts } = await supabase.from('chat_participants').select('conversation_id').eq('user_id', targetId);

        if (myParts && otherParts) {
            const otherConvIds = new Set(otherParts.map((p: any) => p.conversation_id));
            for (const mp of myParts) {
                if (otherConvIds.has(mp.conversation_id)) {
                    const { data: convCheck } = await supabase.from('chat_conversations')
                        .select('*').eq('id', mp.conversation_id).eq('type', 'direct').single();
                    if (convCheck) {
                        setActiveConv(convCheck);
                        return;
                    }
                }
            }
        }

        // Create new conversation
        const { data: conv, error } = await supabase.from('chat_conversations').insert({
            organization_id: orgId, type: 'direct', name: targetName, created_by: userId,
        }).select().single();
        if (error) { toast.error(error.message); return; }

        await supabase.from('chat_participants').insert([
            { conversation_id: conv.id, user_id: userId, role: 'admin' },
            { conversation_id: conv.id, user_id: targetId, role: 'member' },
        ]);
        await supabase.from('chat_messages').insert({
            conversation_id: conv.id, sender_id: userId,
            content: 'Conversation démarrée', msg_type: 'system',
        });

        setActiveConv(conv);
        loadConversations();
    };

    // Load conversations
    useEffect(() => {
        loadConversations();
    }, [orgId, userId]);

    const loadConversations = async () => {
        setLoadingConvs(true);
        try {
            const { data: parts } = await supabase.from('chat_participants')
                .select('conversation_id').eq('user_id', userId);
            const convIds = (parts || []).map((p: any) => p.conversation_id);
            if (convIds.length > 0) {
                const { data: c } = await supabase.from('chat_conversations').select('*')
                    .in('id', convIds).eq('organization_id', orgId).eq('type', 'direct')
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
            console.error('Error loading DM convs:', e);
        }
        setLoadingConvs(false);
    };

    // Load messages for active conversation
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

            channel = supabase.channel(`dm-msgs-${activeConv.id}`).on('postgres_changes', {
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

    // Send message
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

    // Create new DM
    const createDM = async () => {
        if (selectedUsers.length === 0) { toast.error('Sélectionnez un contact'); return; }
        const targetId = selectedUsers[0];
        const targetName = allUsers.find(u => u.id === targetId)?.name || 'Conversation';
        setShowNewConv(false);
        setSelectedUsers([]);
        await handleStartDMFromContact(targetId, targetName);
    };

    // Helpers
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

    const filteredUsers = allUsers.filter(u => !searchUser || u.name.toLowerCase().includes(searchUser.toLowerCase()));

    // ═══ ACTIVE CONVERSATION VIEW ═══
    if (activeConv) {
        return (
            <div className="flex flex-col h-[calc(100vh-140px)]">
                {/* Chat header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-white/[0.02] backdrop-blur-sm rounded-t-2xl">
                    <button onClick={() => { setActiveConv(null); setMessages([]); }} className="p-1.5 hover:bg-white/5 rounded-xl">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600/30 to-purple-600/30 flex items-center justify-center text-sm font-bold text-indigo-300 shrink-0">
                        {(activeConv.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{activeConv.name || 'Conversation'}</p>
                        <p className="text-[10px] text-slate-500">Message direct</p>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 scrollbar-thin">
                    {messages.map((m, idx) => {
                        const isMe = m.sender_id === userId;
                        const isSystem = m.msg_type === 'system';

                        if (isSystem) {
                            return (
                                <div key={m.id} className="text-center my-3">
                                    <span className="text-[10px] text-slate-500 bg-white/5 px-3 py-1 rounded-full">{m.content}</span>
                                </div>
                            );
                        }
                        return (
                            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                {!isMe && (
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-600 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mr-2 mt-auto mb-5">
                                        {getSenderInitials(m.sender_id)}
                                    </div>
                                )}
                                <div className="max-w-[75%]">
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

    // ═══ CONVERSATIONS LIST ═══
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                        💬 Chat DM
                    </h2>
                    <p className="text-[10px] text-slate-500">Messages directs</p>
                </div>
                <Button size="sm" onClick={() => setShowNewConv(!showNewConv)}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 text-xs rounded-xl shadow-lg shadow-cyan-600/20">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Nouveau
                </Button>
            </div>

            {/* New DM Form */}
            <AnimatePresence>
                {showNewConv && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border border-cyan-500/20 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-cyan-300">💬 Nouveau message</h3>
                                <button onClick={() => { setShowNewConv(false); setSelectedUsers([]); }}><X className="w-4 h-4 text-slate-400" /></button>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                                <Input value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="Chercher un contact..."
                                    className="bg-white/5 border-white/10 text-white h-9 pl-8 rounded-xl text-xs" />
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-0.5 scrollbar-thin">
                                {filteredUsers.map(u => (
                                    <button key={u.id} onClick={() => setSelectedUsers([u.id])}
                                        className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs transition",
                                            selectedUsers.includes(u.id) ? 'bg-cyan-600/20 text-cyan-300' : 'hover:bg-white/5 text-slate-400'
                                        )}>
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-600 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0">{u.initials}</div>
                                        <div className="text-left min-w-0">
                                            <span className="truncate block">{u.name}</span>
                                            <span className="text-[9px] text-slate-600 block">{u.role}</span>
                                        </div>
                                        {selectedUsers.includes(u.id) && <Check className="w-3 h-3 text-cyan-400 ml-auto shrink-0" />}
                                    </button>
                                ))}
                            </div>
                            <Button onClick={createDM} disabled={sending || selectedUsers.length === 0}
                                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-xs rounded-xl shadow-lg shadow-cyan-600/20">
                                {sending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                                Démarrer la conversation
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Conversation List */}
            {loadingConvs ? (
                <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400" /></div>
            ) : convs.length === 0 ? (
                <div className="text-center py-16">
                    <MessageSquare className="w-14 h-14 mx-auto mb-3 text-slate-700" />
                    <p className="text-sm text-slate-500">Aucune conversation</p>
                    <Button size="sm" variant="ghost" className="text-cyan-400 text-xs mt-3" onClick={() => setShowNewConv(true)}>
                        <Plus className="w-3 h-3 mr-1" /> Nouvelle conversation
                    </Button>
                </div>
            ) : convs.map(c => (
                <button key={c.id} onClick={() => setActiveConv(c)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/15 transition-all text-left group">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600/30 to-purple-600/30 flex items-center justify-center text-lg font-bold text-indigo-300 shrink-0">
                        {(c.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">{c.name || 'Conversation'}</p>
                            <span className="text-[10px] text-slate-500 shrink-0 ml-2">{c.lastMessageAt ? formatTime(c.lastMessageAt) : ''}</span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                            <p className="text-xs text-slate-500 truncate">{c.lastMessage || '...'}</p>
                            {(c.unreadCount || 0) > 0 && (
                                <span className="w-5 h-5 rounded-full bg-cyan-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 ml-2 shadow-lg shadow-cyan-600/30">{c.unreadCount}</span>
                            )}
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}
