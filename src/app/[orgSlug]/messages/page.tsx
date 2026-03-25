'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare, Send, Plus, ArrowLeft, Loader2, Users, Hash, Megaphone,
    Search, MoreVertical, Trash2, UserPlus, Image as ImageIcon, Paperclip,
    GraduationCap, ChevronLeft, X, Phone, Video, Settings, Bell, BellOff,
    Check, CheckCheck, Smile, Clock, Upload, FileText, Mic
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════
// CAMPUSFLOW — MESSAGERIE COMPLÈTE
// Inspiré du forum-chat WhatsApp de l'ancienne app
// ═══════════════════════════════════════════════════════

type ConvType = 'direct' | 'group' | 'class' | 'announcement';

interface ConvInfo {
    id: string;
    organization_id: string;
    type: ConvType;
    name: string | null;
    classroom_id: string | null;
    created_by: string | null;
    created_at: string;
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

export default function MessagesPage() {
    const { orgSlug } = useParams<{ orgSlug: string }>();
    const router = useRouter();
    const [org, setOrg] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Conversations
    const [convs, setConvs] = useState<ConvInfo[]>([]);
    const [activeConv, setActiveConv] = useState<ConvInfo | null>(null);
    const [messages, setMessages] = useState<MsgInfo[]>([]);
    const [participants, setParticipants] = useState<any[]>([]);

    // Message input
    const [msgText, setMsgText] = useState('');
    const [sending, setSending] = useState(false);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // New conversation
    const [showNewConv, setShowNewConv] = useState(false);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [newConvName, setNewConvName] = useState('');
    const [newConvType, setNewConvType] = useState<ConvType>('group');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [searchUser, setSearchUser] = useState('');
    const [searchConv, setSearchConv] = useState('');

    // Group settings
    const [showGroupSettings, setShowGroupSettings] = useState(false);

    const msgEnd = useRef<HTMLDivElement>(null);

    // ═══ LOAD DATA ═══
    useEffect(() => {
        (async () => {
            const { data: o } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single();
            if (!o) { setLoading(false); return; }
            setOrg(o);

            const { data: { user: u } } = await supabase.auth.getUser();
            setUser(u);
            if (!u) { setLoading(false); return; }

            // Get conversations where user is participant
            const { data: parts } = await supabase.from('chat_participants').select('conversation_id').eq('user_id', u.id);
            const convIds = (parts || []).map((p: any) => p.conversation_id);

            if (convIds.length > 0) {
                const { data: c } = await supabase.from('chat_conversations').select('*')
                    .in('id', convIds).eq('organization_id', o.id).order('created_at', { ascending: false });

                // Enrich with last message
                const enriched = await Promise.all((c || []).map(async (conv: any) => {
                    const { data: lastMsg } = await supabase.from('chat_messages')
                        .select('content, created_at, sender_id').eq('conversation_id', conv.id)
                        .order('created_at', { ascending: false }).limit(1).single();

                    // Unread count
                    const { count } = await supabase.from('chat_messages')
                        .select('id', { count: 'exact', head: true })
                        .eq('conversation_id', conv.id)
                        .eq('is_read', false)
                        .neq('sender_id', u.id);

                    return {
                        ...conv,
                        lastMessage: lastMsg?.content || null,
                        lastMessageAt: lastMsg?.created_at || conv.created_at,
                        unreadCount: count || 0,
                    } as ConvInfo;
                }));

                // Sort by most recent message
                enriched.sort((a: any, b: any) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
                setConvs(enriched);
            }

            // Load all school members for creating conversations
            const [{ data: teachers }, { data: students }] = await Promise.all([
                supabase.from('teacher_profiles').select('user_id, first_name, last_name').eq('organization_id', o.id),
                supabase.from('student_profiles').select('user_id, first_name, last_name, matricule').eq('organization_id', o.id),
            ]);
            const users = [
                ...(teachers || []).map((t: any) => ({
                    id: t.user_id, name: `${t.first_name} ${t.last_name}`,
                    role: 'Professeur', initials: `${t.first_name?.charAt(0) || ''}${t.last_name?.charAt(0) || ''}`,
                })),
                ...(students || []).map((s: any) => ({
                    id: s.user_id, name: `${s.first_name} ${s.last_name}`,
                    role: s.matricule ? `Étudiant — ${s.matricule}` : 'Étudiant',
                    initials: `${s.first_name?.charAt(0) || ''}${s.last_name?.charAt(0) || ''}`,
                })),
            ].filter(u2 => u2.id && u2.id !== u.id);
            setAllUsers(users);
            setLoading(false);
        })();
    }, [orgSlug]);

    // ═══ LOAD MESSAGES (active conversation) ═══
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

            // Mark messages as read
            if (user?.id) {
                await supabase.from('chat_messages').update({ is_read: true })
                    .eq('conversation_id', activeConv.id).neq('sender_id', user.id).eq('is_read', false);
                // Update unread count in sidebar
                setConvs(prev => prev.map(c => c.id === activeConv.id ? { ...c, unreadCount: 0 } : c));
            }

            setTimeout(() => msgEnd.current?.scrollIntoView({ behavior: 'smooth' }), 100);

            // Realtime subscription
            channel = supabase.channel(`msgs-${activeConv.id}`).on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `conversation_id=eq.${activeConv.id}`,
            }, (payload: any) => {
                setMessages(prev => {
                    // Avoid duplicates (from optimistic update)
                    if (prev.find(m => m.id === payload.new.id)) return prev;
                    return [...prev, payload.new as MsgInfo];
                });
                // Mark as read if it's from someone else
                if (payload.new.sender_id !== user?.id) {
                    supabase.from('chat_messages').update({ is_read: true }).eq('id', payload.new.id).then(() => { });
                }
                setTimeout(() => msgEnd.current?.scrollIntoView({ behavior: 'smooth' }), 50);
            }).subscribe();
        })();

        return () => { if (channel) supabase.removeChannel(channel); };
    }, [activeConv?.id, user?.id]);

    // ═══ SEND MESSAGE ═══
    const sendMessage = useCallback(async () => {
        if ((!msgText.trim() && !mediaFile) || !activeConv || !user) return;
        setSending(true);
        const text = msgText.trim();
        const tempId = `temp_${Date.now()}`;

        // Optimistic update
        const optimisticMsg: MsgInfo = {
            id: tempId,
            conversation_id: activeConv.id,
            sender_id: user.id,
            content: text,
            msg_type: mediaFile ? 'file' : 'text',
            media_url: null,
            is_read: false,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setMsgText('');
        setTimeout(() => msgEnd.current?.scrollIntoView({ behavior: 'smooth' }), 50);

        try {
            let mediaUrl = null;
            if (mediaFile) {
                const ext = mediaFile.name.split('.').pop();
                const path = `orgs/${org.id}/chat/${activeConv.id}/${Date.now()}.${ext}`;
                await supabase.storage.from('organization-assets').upload(path, mediaFile);
                const { data: urlData } = supabase.storage.from('organization-assets').getPublicUrl(path);
                mediaUrl = urlData.publicUrl;
                setMediaFile(null);
            }

            const { data, error } = await supabase.from('chat_messages').insert({
                conversation_id: activeConv.id,
                sender_id: user.id,
                content: text || mediaFile?.name || '',
                msg_type: mediaUrl ? (mediaFile?.type?.startsWith('image') ? 'image' : 'file') : 'text',
                media_url: mediaUrl,
            }).select().single();

            if (error) throw error;

            // Replace optimistic message with real one
            if (data) {
                setMessages(prev => prev.map(m => m.id === tempId ? { ...data } as MsgInfo : m));
            }

            // Update conversation last message in sidebar
            setConvs(prev => prev.map(c =>
                c.id === activeConv.id ? { ...c, lastMessage: text, lastMessageAt: new Date().toISOString() } : c
            ).sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()));

        } catch (e) {
            console.error('Send error:', e);
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setMsgText(text);
            toast.error("Erreur d'envoi");
        }
        setSending(false);
    }, [msgText, mediaFile, activeConv, user, org]);

    // ═══ CREATE CONVERSATION ═══
    const createConversation = async () => {
        if (selectedUsers.length === 0) { toast.error('Sélectionnez au moins un membre'); return; }
        if (newConvType !== 'direct' && !newConvName.trim()) { toast.error('Nom du groupe requis'); return; }
        setSending(true);
        try {
            const name = newConvType === 'direct'
                ? allUsers.find(u => u.id === selectedUsers[0])?.name || 'Conversation'
                : newConvName.trim();

            // For direct: check if conversation already exists
            if (newConvType === 'direct') {
                const otherId = selectedUsers[0];
                const existing = convs.find(c => {
                    if (c.type !== 'direct') return false;
                    // Check participants
                    return true; // We'll check properly below
                });
                // Simplified: just check by fetching
                const { data: existingParts } = await supabase.from('chat_participants')
                    .select('conversation_id').eq('user_id', otherId);
                const { data: myParts } = await supabase.from('chat_participants')
                    .select('conversation_id').eq('user_id', user.id);
                if (existingParts && myParts) {
                    const otherConvIds = new Set(existingParts.map((p: any) => p.conversation_id));
                    const myConvIds = myParts.map((p: any) => p.conversation_id);
                    for (const cid of myConvIds) {
                        if (otherConvIds.has(cid)) {
                            const { data: convCheck } = await supabase.from('chat_conversations')
                                .select('*').eq('id', cid).eq('type', 'direct').single();
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
                organization_id: org.id, type: newConvType, name, created_by: user.id,
            }).select().single();
            if (convErr) throw convErr;

            // Add participants
            const allParts = [user.id, ...selectedUsers].map(uid => ({
                conversation_id: conv.id,
                user_id: uid,
                role: uid === user.id ? 'admin' : 'member',
            }));
            const { error: partErr } = await supabase.from('chat_participants').insert(allParts);
            if (partErr) throw partErr;

            // System message
            await supabase.from('chat_messages').insert({
                conversation_id: conv.id, sender_id: user.id,
                content: `${newConvType === 'direct' ? 'Conversation démarrée' : `Groupe "${name}" créé`}`,
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

    // ═══ DELETE CONVERSATION (admin only) ═══
    const deleteConversation = async (convId: string) => {
        if (!confirm('Supprimer cette conversation ? Tous les messages seront perdus.')) return;
        await supabase.from('chat_messages').delete().eq('conversation_id', convId);
        await supabase.from('chat_participants').delete().eq('conversation_id', convId);
        await supabase.from('chat_conversations').delete().eq('id', convId);
        setConvs(prev => prev.filter(c => c.id !== convId));
        if (activeConv?.id === convId) { setActiveConv(null); setMessages([]); }
        toast.success('Conversation supprimée');
    };

    // ═══ ADD MEMBER TO GROUP ═══
    const addMemberToGroup = async (userId: string) => {
        if (!activeConv) return;
        const { error } = await supabase.from('chat_participants').insert({
            conversation_id: activeConv.id, user_id: userId, role: 'member',
        });
        if (error) { toast.error('Déjà membre ou erreur'); return; }
        setParticipants(prev => [...prev, { user_id: userId, role: 'member' }]);
        await supabase.from('chat_messages').insert({
            conversation_id: activeConv.id, sender_id: user.id,
            content: `${allUsers.find(u => u.id === userId)?.name || 'Membre'} a été ajouté au groupe`, msg_type: 'system',
        });
        toast.success('Membre ajouté');
    };

    // ═══ HELPERS ═══
    const getSenderName = (senderId: string) => {
        if (senderId === user?.id) return 'Vous';
        const u = allUsers.find(u => u.id === senderId);
        return u?.name || 'Membre';
    };

    const getSenderInitials = (senderId: string) => {
        if (senderId === user?.id) return 'V';
        const u = allUsers.find(u => u.id === senderId);
        return u?.initials || '?';
    };

    const formatTime = (ts: string) => {
        const d = new Date(ts);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        if (diff < 60000) return 'à l\'instant';
        if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'Hier ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    const filteredConvs = convs.filter(c => !searchConv || (c.name || '').toLowerCase().includes(searchConv.toLowerCase()));
    const filteredUsers = allUsers.filter(u => !searchUser || u.name.toLowerCase().includes(searchUser.toLowerCase()));
    const convTypeIcon = (type: ConvType) => {
        if (type === 'group') return <Users className="w-5 h-5" />;
        if (type === 'announcement') return <Megaphone className="w-5 h-5" />;
        if (type === 'class') return <GraduationCap className="w-5 h-5" />;
        return null;
    };

    if (loading) return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>;
    if (!org) return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-white"><h1 className="text-2xl font-bold">Introuvable</h1></div>;
    if (!user) return (
        <div className="min-h-screen bg-[#0B0E14] flex flex-col items-center justify-center text-white gap-4">
            <MessageSquare className="w-16 h-16 text-indigo-400/30" />
            <h1 className="text-xl font-bold">Messages</h1>
            <p className="text-slate-400">Connectez-vous pour accéder à vos messages</p>
            <Button className="bg-indigo-600" onClick={() => router.push(`/${orgSlug}/login`)}>Se connecter</Button>
        </div>
    );

    return (
        <div className="h-screen bg-[#0B0E14] text-white flex flex-col sm:flex-row overflow-hidden">
            {/* ═══════════════════════ SIDEBAR ═══════════════════════ */}
            <div className={`${activeConv ? 'hidden sm:flex' : 'flex'} flex-col w-full sm:w-80 lg:w-96 border-r border-white/5 bg-[#0F1219] h-screen shrink-0`}>
                {/* Sidebar header */}
                <div className="p-3 border-b border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button onClick={() => router.push(`/${orgSlug}/admin`)} className="p-1.5 hover:bg-white/5 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
                            <MessageSquare className="w-5 h-5 text-indigo-400" />
                            <span className="font-semibold text-sm">Messages</span>
                            <span className="text-[10px] text-slate-500 ml-1">{org.name}</span>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => setShowNewConv(!showNewConv)} className="text-indigo-400 hover:bg-indigo-500/10"><Plus className="w-4 h-4" /></Button>
                    </div>

                    {/* Search conversations */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                        <Input value={searchConv} onChange={e => setSearchConv(e.target.value)} placeholder="Rechercher..." className="bg-white/5 border-white/10 text-white h-8 pl-8 rounded-lg text-xs" />
                    </div>
                </div>

                {/* New conversation form */}
                <AnimatePresence>
                    {showNewConv && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-b border-white/5">
                            <div className="p-3 space-y-2 bg-slate-950/50">
                                <div className="flex gap-1.5">
                                    {(['direct', 'group', 'class', 'announcement'] as ConvType[]).map(t => (
                                        <button key={t} onClick={() => { setNewConvType(t); setSelectedUsers([]); }}
                                            className={`px-2 py-1 rounded-lg text-[10px] font-medium ${newConvType === t ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                                            {t === 'direct' ? '💬 Direct' : t === 'group' ? '👥 Groupe' : t === 'class' ? '🏫 Classe' : '📢 Annonce'}
                                        </button>
                                    ))}
                                </div>
                                {newConvType !== 'direct' && (
                                    <Input value={newConvName} onChange={e => setNewConvName(e.target.value)}
                                        placeholder={newConvType === 'class' ? 'Nom de la classe...' : 'Nom du groupe...'}
                                        className="bg-white/5 border-white/10 text-white h-8 rounded-lg text-xs" />
                                )}
                                <div className="relative">
                                    <Search className="absolute left-2 top-2 w-3 h-3 text-slate-500" />
                                    <Input value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="Chercher un membre..."
                                        className="bg-white/5 border-white/10 text-white h-8 pl-7 rounded-lg text-xs" />
                                </div>
                                {selectedUsers.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {selectedUsers.map(uid => {
                                            const u = allUsers.find(u => u.id === uid);
                                            return (
                                                <span key={uid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-300 text-[10px]">
                                                    {u?.name || 'Membre'}
                                                    <button onClick={() => setSelectedUsers(prev => prev.filter(id => id !== uid))}><X className="w-2.5 h-2.5" /></button>
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                                <div className="max-h-36 overflow-y-auto space-y-0.5">
                                    {filteredUsers.map(u => (
                                        <button key={u.id} onClick={() => {
                                            if (newConvType === 'direct') setSelectedUsers([u.id]);
                                            else setSelectedUsers(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]);
                                        }} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition ${selectedUsers.includes(u.id) ? 'bg-indigo-600/20 text-indigo-300' : 'hover:bg-white/5 text-slate-400'}`}>
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0">{u.initials}</div>
                                            <div className="text-left min-w-0">
                                                <span className="truncate block">{u.name}</span>
                                                <span className="text-[9px] text-slate-600 block">{u.role}</span>
                                            </div>
                                            {selectedUsers.includes(u.id) && <Check className="w-3 h-3 text-indigo-400 ml-auto shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" className="bg-indigo-600 text-xs h-7 flex-1 rounded-lg" onClick={createConversation} disabled={sending}>
                                        {sending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}Créer
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-xs h-7 rounded-lg" onClick={() => { setShowNewConv(false); setSelectedUsers([]); }}>Annuler</Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Conversation list */}
                <div className="flex-1 overflow-y-auto">
                    {filteredConvs.length > 0 ? filteredConvs.map(c => (
                        <button key={c.id} onClick={() => setActiveConv(c)}
                            className={`w-full flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] text-left transition ${activeConv?.id === c.id ? 'bg-indigo-600/10' : 'hover:bg-white/[0.03]'}`}>
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${c.type === 'group' ? 'bg-indigo-600/20 text-indigo-400' :
                                    c.type === 'announcement' ? 'bg-amber-600/20 text-amber-400' :
                                        c.type === 'class' ? 'bg-emerald-600/20 text-emerald-400' :
                                            'bg-gradient-to-br from-purple-600/30 to-indigo-600/30 text-purple-300'
                                }`}>
                                {c.type !== 'direct' ? convTypeIcon(c.type) : <span className="text-base">{(c.name || '?').charAt(0).toUpperCase()}</span>}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm truncate">{c.name || 'Conversation'}</p>
                                    <span className="text-[10px] text-slate-500 shrink-0 ml-2">{c.lastMessageAt ? formatTime(c.lastMessageAt) : ''}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-slate-500 truncate">{c.lastMessage || (c.type === 'direct' ? 'Message direct' : c.type === 'group' ? 'Groupe' : c.type === 'class' ? 'Classe' : 'Annonce')}</p>
                                    {(c.unreadCount || 0) > 0 && (
                                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 ml-2">{c.unreadCount}</span>
                                    )}
                                </div>
                            </div>
                        </button>
                    )) : (
                        <div className="text-center py-16 text-slate-500">
                            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-xs mb-2">Aucune conversation</p>
                            <Button size="sm" variant="ghost" className="text-indigo-400 text-xs" onClick={() => setShowNewConv(true)}>
                                <Plus className="w-3 h-3 mr-1" /> Nouvelle conversation
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════════ CHAT AREA ═══════════════════════ */}
            <div className={`${!activeConv ? 'hidden sm:flex' : 'flex'} flex-col flex-1 h-screen`}>
                {activeConv ? (
                    <>
                        {/* Chat header */}
                        <div className="px-4 py-3 border-b border-white/5 bg-[#0F1219]/80 backdrop-blur-xl flex items-center gap-3 shrink-0">
                            <button onClick={() => setActiveConv(null)} className="sm:hidden p-1.5 hover:bg-white/5 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${activeConv.type === 'group' ? 'bg-indigo-600/20 text-indigo-400' :
                                    activeConv.type === 'announcement' ? 'bg-amber-600/20 text-amber-400' :
                                        'bg-gradient-to-br from-purple-600/30 to-indigo-600/30 text-purple-300'
                                }`}>
                                {activeConv.type !== 'direct' ? convTypeIcon(activeConv.type) : (activeConv.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{activeConv.name || 'Conversation'}</p>
                                <p className="text-[10px] text-slate-500">{participants.length} membres</p>
                            </div>
                            <div className="flex items-center gap-1">
                                {activeConv.type !== 'direct' && (
                                    <Button size="sm" variant="ghost" className="text-slate-400 h-8 w-8 p-0" onClick={() => setShowGroupSettings(!showGroupSettings)}>
                                        <Settings className="w-4 h-4" />
                                    </Button>
                                )}
                                {(activeConv.created_by === user.id || org.owner_id === user.id) && (
                                    <Button size="sm" variant="ghost" className="text-red-400 h-8 w-8 p-0" onClick={() => deleteConversation(activeConv.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Group settings panel */}
                        <AnimatePresence>
                            {showGroupSettings && activeConv.type !== 'direct' && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-b border-white/5">
                                    <div className="p-3 bg-slate-950/50">
                                        <h4 className="text-xs font-semibold text-slate-400 mb-2">Membres ({participants.length})</h4>
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {participants.map((p: any) => {
                                                const u = allUsers.find(u => u.id === p.user_id);
                                                return (
                                                    <span key={p.user_id} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-300">
                                                        {p.user_id === user.id ? 'Vous' : u?.name || 'Membre'}
                                                        {p.role === 'admin' && ' 👑'}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        {/* Add member */}
                                        <div className="relative mb-2">
                                            <Input placeholder="Ajouter un membre..." className="bg-white/5 border-white/10 text-white h-7 text-xs rounded-lg"
                                                list="add-member-list" onChange={e => {
                                                    const u = allUsers.find(u => u.name === e.target.value);
                                                    if (u && !participants.find((p: any) => p.user_id === u.id)) {
                                                        addMemberToGroup(u.id);
                                                        e.target.value = '';
                                                    }
                                                }} />
                                            <datalist id="add-member-list">
                                                {allUsers.filter(u => !participants.find((p: any) => p.user_id === u.id)).map(u => (
                                                    <option key={u.id} value={u.name} />
                                                ))}
                                            </datalist>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
                            {messages.map((m, idx) => {
                                const isMe = m.sender_id === user.id;
                                const isSystem = m.msg_type === 'system';
                                const showSenderName = !isMe && !isSystem && activeConv.type !== 'direct' &&
                                    (idx === 0 || messages[idx - 1]?.sender_id !== m.sender_id || messages[idx - 1]?.msg_type === 'system');
                                const showAvatar = !isMe && !isSystem &&
                                    (idx === messages.length - 1 || messages[idx + 1]?.sender_id !== m.sender_id || messages[idx + 1]?.msg_type === 'system');

                                if (isSystem) {
                                    return (
                                        <div key={m.id} className="text-center my-3">
                                            <span className="text-[10px] text-slate-500 bg-white/5 px-3 py-1 rounded-full">{m.content}</span>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${showSenderName ? 'mt-3' : ''}`}>
                                        {/* Avatar for others */}
                                        {!isMe && showAvatar ? (
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mr-2 mt-auto mb-5">
                                                {getSenderInitials(m.sender_id)}
                                            </div>
                                        ) : !isMe ? <div className="w-7 shrink-0 mr-2" /> : null}

                                        <div className={`max-w-[75%]`}>
                                            {showSenderName && <p className="text-[10px] text-indigo-400 font-medium mb-0.5 ml-1">{getSenderName(m.sender_id)}</p>}

                                            {/* Media message */}
                                            {m.msg_type === 'image' && m.media_url && (
                                                <div className={`rounded-2xl overflow-hidden mb-1 ${isMe ? 'rounded-br-md' : 'rounded-bl-md'}`}>
                                                    <img src={m.media_url} alt="" className="max-w-full max-h-60 object-cover rounded-2xl" />
                                                </div>
                                            )}
                                            {m.msg_type === 'file' && m.media_url && (
                                                <a href={m.media_url} target="_blank" rel="noopener noreferrer"
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-2xl mb-1 ${isMe ? 'bg-indigo-700 rounded-br-md' : 'bg-white/10 rounded-bl-md'}`}>
                                                    <FileText className="w-4 h-4 shrink-0" />
                                                    <span className="text-sm truncate">{m.content || 'Fichier'}</span>
                                                </a>
                                            )}

                                            {/* Text message */}
                                            {(m.msg_type === 'text' || (m.content && m.msg_type !== 'file')) && (
                                                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-white/[0.06] text-white rounded-bl-md'
                                                    }`}>
                                                    {m.content}
                                                </div>
                                            )}

                                            <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end mr-1' : 'ml-1'}`}>
                                                <span className="text-[10px] text-slate-600">{formatTime(m.created_at)}</span>
                                                {isMe && <CheckCheck className={`w-3 h-3 ${m.is_read ? 'text-blue-400' : 'text-slate-600'}`} />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={msgEnd} />
                        </div>

                        {/* Media preview */}
                        {mediaFile && (
                            <div className="px-4 py-2 border-t border-white/5 bg-slate-900/50 flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 shrink-0">
                                    {mediaFile.type.startsWith('image') ? (
                                        <img src={URL.createObjectURL(mediaFile)} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center"><FileText className="w-5 h-5 text-slate-400" /></div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white truncate">{mediaFile.name}</p>
                                    <p className="text-[10px] text-slate-500">{(mediaFile.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <button onClick={() => setMediaFile(null)} className="text-slate-400 hover:text-white p-1"><X className="w-4 h-4" /></button>
                            </div>
                        )}

                        {/* Input bar */}
                        <div className="p-3 border-t border-white/5 bg-[#0F1219]/80 shrink-0">
                            <div className="flex gap-2 items-center max-w-3xl mx-auto">
                                <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white shrink-0">
                                    <Paperclip className="w-5 h-5" />
                                </button>
                                <input ref={fileInputRef} type="file" className="hidden" onChange={e => { if (e.target.files?.[0]) setMediaFile(e.target.files[0]); e.target.value = ''; }} />

                                <Input
                                    value={msgText}
                                    onChange={e => setMsgText(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                                    placeholder="Écrire un message..."
                                    className="bg-white/5 border-white/10 text-white h-10 rounded-full text-sm flex-1"
                                />

                                <Button onClick={sendMessage} disabled={sending || (!msgText.trim() && !mediaFile)}
                                    className="bg-indigo-600 hover:bg-indigo-700 rounded-full w-10 h-10 p-0 shrink-0">
                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500">
                        <div className="text-center">
                            <MessageSquare className="w-20 h-20 mx-auto mb-4 opacity-10" />
                            <p className="text-lg font-medium text-slate-400 mb-1">Messages</p>
                            <p className="text-sm text-slate-600">Sélectionnez une conversation ou créez-en une nouvelle</p>
                            <Button size="sm" className="mt-4 bg-indigo-600" onClick={() => setShowNewConv(true)}>
                                <Plus className="w-4 h-4 mr-1" /> Nouvelle conversation
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
