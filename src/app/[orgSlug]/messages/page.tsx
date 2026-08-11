'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare, Send, Plus, ArrowLeft, Loader2, Users,
    Search, Trash2, UserPlus, Paperclip,
    ChevronLeft, X, Settings,
    Check, CheckCheck, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { SessionManager } from '@/lib/session';
import { compressImage } from '@/lib/compress';
import { uploadToR2 } from '@/lib/r2';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════
// CAMPUSFLOW — MESSAGERIE DM + GROUPES
// Utilise les profile.id (pas auth.users) car auth = access_code
// ═══════════════════════════════════════════════════════

type ConvType = 'direct' | 'group';

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

interface UserInfo {
    id: string;
    name: string;
    role: string;
    initials: string;
}

// ═══ Session helper ═══
function getSession(): { id: string; first_name: string; last_name: string; role: string; organization_id: string } | null {
    if (typeof window === 'undefined') return null;
    // Session via SessionManager
    const s = SessionManager.get();
    if (!s) return null;
    return { id: s.profile_id, first_name: s.first_name || '', last_name: s.last_name || '', role: s.role, organization_id: s.org_id };
}


export default function MessagesPage() {
    const orgSlug = useOrgSlug();
    const router = useRouter();
    const [org, setOrg] = useState<any>(null);
    const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null);
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
    const [allUsers, setAllUsers] = useState<UserInfo[]>([]);
    const [newConvName, setNewConvName] = useState('');
    const [newConvType, setNewConvType] = useState<ConvType>('direct');
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

            // Get current user from localStorage session (access-code auth)
            const sess = getSession();
            let userId: string | null = null;
            let userName = '';
            let userRole = '';

            if (sess && sess.organization_id === o.id) {
                userId = sess.id;
                userName = `${sess.first_name} ${sess.last_name}`;
                userRole = sess.role;
            }

            // Fallback: try supabase auth (for admin)
            if (!userId) {
                const { data: { user: u } } = await supabase.auth.getUser();
                if (u && u.id === o.owner_id) {
                    userId = u.id;
                    userName = 'Administrateur';
                    userRole = 'admin';
                }
            }

            if (!userId) { setLoading(false); return; }
            setCurrentUser({ id: userId, name: userName, role: userRole });

            // Load conversations where this user is a participant
            const { data: parts } = await supabase.from('chat_participants')
                .select('conversation_id').eq('user_id', userId);
            const convIds = (parts || []).map((p: any) => p.conversation_id);

            if (convIds.length > 0) {
                const { data: c } = await supabase.from('chat_conversations').select('*')
                    .in('id', convIds).eq('organization_id', o.id)
                    .order('created_at', { ascending: false });

                // Enrich with last message + unread count
                const enriched = await Promise.all((c || []).map(async (conv: any) => {
                    const { data: lastMsg } = await supabase.from('chat_messages')
                        .select('content, created_at').eq('conversation_id', conv.id)
                        .order('created_at', { ascending: false }).limit(1).single();

                    const { count } = await supabase.from('chat_messages')
                        .select('id', { count: 'exact', head: true })
                        .eq('conversation_id', conv.id)
                        .eq('is_read', false)
                        .neq('sender_id', userId!);

                    return {
                        ...conv,
                        lastMessage: lastMsg?.content || null,
                        lastMessageAt: lastMsg?.created_at || conv.created_at,
                        unreadCount: count || 0,
                    } as ConvInfo;
                }));

                enriched.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
                setConvs(enriched);
            }

            // Load all school members (using profile.id, NOT user_id)
            const [{ data: teachers }, { data: students }] = await Promise.all([
                supabase.from('teacher_profiles').select('id, first_name, last_name').eq('organization_id', o.id).eq('is_active', true),
                supabase.from('student_profiles').select('id, first_name, last_name, matricule').eq('organization_id', o.id).eq('is_active', true),
            ]);
            const users: UserInfo[] = [
                ...(teachers || []).map((t: any) => ({
                    id: t.id, // profile.id
                    name: `${t.first_name} ${t.last_name}`,
                    role: 'Professeur',
                    initials: `${t.first_name?.charAt(0) || ''}${t.last_name?.charAt(0) || ''}`,
                })),
                ...(students || []).map((s: any) => ({
                    id: s.id, // profile.id
                    name: `${s.first_name} ${s.last_name}`,
                    role: s.matricule ? `Étudiant — ${s.matricule}` : 'Étudiant',
                    initials: `${s.first_name?.charAt(0) || ''}${s.last_name?.charAt(0) || ''}`,
                })),
            ].filter(u => u.id !== userId); // exclude self

            // If logged in as admin (supabase.auth), also add admin to the user list mapping
            setAllUsers(users);
            setLoading(false);
        })();
    }, [orgSlug]);

    // ═══ LOAD MESSAGES (active conversation) ═══
    useEffect(() => {
        if (!activeConv || !currentUser) return;
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
            await supabase.from('chat_messages').update({ is_read: true })
                .eq('conversation_id', activeConv.id)
                .neq('sender_id', currentUser.id)
                .eq('is_read', false);
            setConvs(prev => prev.map(c => c.id === activeConv.id ? { ...c, unreadCount: 0 } : c));

            setTimeout(() => msgEnd.current?.scrollIntoView({ behavior: 'smooth' }), 100);

            // Realtime subscription
            channel = supabase.channel(`msgs-${activeConv.id}`).on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'chat_messages',
                filter: `conversation_id=eq.${activeConv.id}`,
            }, (payload: any) => {
                setMessages(prev => {
                    if (prev.find(m => m.id === payload.new.id)) return prev;
                    return [...prev, payload.new as MsgInfo];
                });
                if (payload.new.sender_id !== currentUser.id) {
                    supabase.from('chat_messages').update({ is_read: true }).eq('id', payload.new.id).then(() => { });
                }
                setTimeout(() => msgEnd.current?.scrollIntoView({ behavior: 'smooth' }), 50);
            }).subscribe();
        })();

        return () => { if (channel) supabase.removeChannel(channel); };
    }, [activeConv?.id, currentUser?.id]);

    // ═══ SEND MESSAGE ═══
    const sendMessage = useCallback(async () => {
        if ((!msgText.trim() && !mediaFile) || !activeConv || !currentUser) return;
        setSending(true);
        const text = msgText.trim();
        const tempId = `temp_${Date.now()}`;

        // Optimistic update
        const optimisticMsg: MsgInfo = {
            id: tempId, conversation_id: activeConv.id, sender_id: currentUser.id,
            content: text, msg_type: mediaFile ? 'file' : 'text',
            media_url: null, is_read: false, created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setMsgText('');
        setTimeout(() => msgEnd.current?.scrollIntoView({ behavior: 'smooth' }), 50);

        try {
            let mediaUrl = null;
            if (mediaFile) {
                let fileToUpload = mediaFile;
                if (mediaFile.type.startsWith('image/')) {
                    fileToUpload = await compressImage(mediaFile, { maxWidth: 1200, quality: 0.6 });
                }
                const r2Res = await uploadToR2(fileToUpload, `orgs/${org.id}/chat/${activeConv.id}`, mediaFile.name);
                mediaUrl = r2Res.url;
                setMediaFile(null);
            }

            const { data, error } = await supabase.from('chat_messages').insert({
                conversation_id: activeConv.id,
                sender_id: currentUser.id,
                content: text || mediaFile?.name || '',
                msg_type: mediaUrl ? (mediaFile?.type?.startsWith('image') ? 'image' : 'file') : 'text',
                media_url: mediaUrl,
            }).select().single();

            if (error) throw error;
            if (data) setMessages(prev => prev.map(m => m.id === tempId ? { ...data } as MsgInfo : m));

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
    }, [msgText, mediaFile, activeConv, currentUser, org]);

    // ═══ CREATE CONVERSATION ═══
    const createConversation = async () => {
        if (!currentUser) return;
        if (selectedUsers.length === 0) { toast.error('Sélectionnez au moins un membre'); return; }
        if (newConvType === 'group' && !newConvName.trim()) { toast.error('Nom du groupe requis'); return; }
        setSending(true);
        try {
            const name = newConvType === 'direct'
                ? allUsers.find(u => u.id === selectedUsers[0])?.name || 'Conversation'
                : newConvName.trim();

            // For DM: check if conversations already exists
            if (newConvType === 'direct') {
                const otherId = selectedUsers[0];
                // Check if both users share a direct conversation
                const { data: otherParts } = await supabase.from('chat_participants')
                    .select('conversation_id').eq('user_id', otherId);
                const { data: myParts } = await supabase.from('chat_participants')
                    .select('conversation_id').eq('user_id', currentUser.id);
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
                organization_id: org.id, type: newConvType, name, created_by: currentUser.id,
            }).select().single();
            if (convErr) throw convErr;

            // Add all participants (self + selected)
            const allParts = [currentUser.id, ...selectedUsers].map(uid => ({
                conversation_id: conv.id,
                user_id: uid,
                role: uid === currentUser.id ? 'admin' : 'member',
            }));
            const { error: partErr } = await supabase.from('chat_participants').insert(allParts);
            if (partErr) throw partErr;

            // System message
            await supabase.from('chat_messages').insert({
                conversation_id: conv.id, sender_id: currentUser.id,
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

    // ═══ DELETE CONVERSATION ═══
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
        if (!activeConv || !currentUser) return;
        const { error } = await supabase.from('chat_participants').insert({
            conversation_id: activeConv.id, user_id: userId, role: 'member',
        });
        if (error) { toast.error('Déjà membre ou erreur'); return; }
        setParticipants(prev => [...prev, { user_id: userId, role: 'member' }]);
        await supabase.from('chat_messages').insert({
            conversation_id: activeConv.id, sender_id: currentUser.id,
            content: `${allUsers.find(u => u.id === userId)?.name || 'Membre'} a été ajouté au groupe`,
            msg_type: 'system',
        });
        toast.success('Membre ajouté');
    };

    // ═══ HELPERS ═══
    const getSenderName = (senderId: string) => {
        if (senderId === currentUser?.id) return 'Vous';
        return allUsers.find(u => u.id === senderId)?.name || 'Membre';
    };
    const getSenderInitials = (senderId: string) => {
        if (senderId === currentUser?.id) return currentUser.name.split(' ').map(w => w[0]).join('').slice(0, 2);
        return allUsers.find(u => u.id === senderId)?.initials || '?';
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

    // ═══ LOADING/ERROR STATES ═══
    if (loading) return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center"><Loader2 className="w-8 h-8 text-teal-400 animate-spin" /></div>;
    if (!org) return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-white"><h1 className="text-2xl font-black">Introuvable</h1></div>;
    if (!currentUser) return (
        <div className="min-h-screen bg-[#0B0E14] flex flex-col items-center justify-center text-white gap-4">
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="ambient-blob-teal" style={{ top: '-25%', right: '-15%' }} />
                <div className="ambient-blob-indigo" style={{ bottom: '-25%', left: '-15%' }} />
            </div>
            <MessageSquare className="w-16 h-16 text-teal-400/30 relative z-10" />
            <h1 className="text-xl font-black relative z-10">Messages</h1>
            <p className="text-slate-400 relative z-10">Connectez-vous pour accéder à vos messages</p>
            <Button className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl relative z-10"
                onClick={() => router.push(`/${orgSlug}/login`)}>Se connecter</Button>
        </div>
    );

    // ═══════════════════════ RENDER ═══════════════════════
    return (
        <div className="h-screen bg-[#0B0E14] text-white flex flex-col sm:flex-row overflow-hidden">

            {/* ═══ SIDEBAR ═══ */}
            <div className={`${activeConv ? 'hidden sm:flex' : 'flex'} flex-col w-full sm:w-80 lg:w-96 border-r border-white/5 bg-[#0F1219]/90 backdrop-blur-xl h-screen shrink-0`}>
                {/* Header */}
                <div className="p-3 border-b border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button onClick={() => router.back()} className="p-1.5 hover:bg-white/5 rounded-xl"><ArrowLeft className="w-4 h-4" /></button>
                            <MessageSquare className="w-5 h-5 text-teal-400" />
                            <span className="font-bold text-sm">Messages</span>
                            <span className="text-[10px] text-slate-500 ml-1">{org.name}</span>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => setShowNewConv(!showNewConv)} className="text-teal-400 hover:bg-teal-500/10">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                        <Input value={searchConv} onChange={e => setSearchConv(e.target.value)} placeholder="Rechercher..."
                            className="bg-white/5 border-white/10 text-white h-8 pl-8 rounded-xl text-xs" />
                    </div>
                </div>

                {/* New conversation form */}
                <AnimatePresence>
                    {showNewConv && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-b border-white/5">
                            <div className="p-3 space-y-2 bg-[#0B0E14]/50">
                                <div className="flex gap-1.5">
                                    {(['direct', 'group'] as ConvType[]).map(t => (
                                        <button key={t} onClick={() => { setNewConvType(t); setSelectedUsers([]); }}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${newConvType === t
                                                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-600/20'
                                                : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                                            {t === 'direct' ? '💬 DM' : '👥 Groupe'}
                                        </button>
                                    ))}
                                </div>
                                {newConvType === 'group' && (
                                    <Input value={newConvName} onChange={e => setNewConvName(e.target.value)}
                                        placeholder="Nom du groupe..."
                                        className="bg-white/5 border-white/10 text-white h-8 rounded-xl text-xs" />
                                )}
                                <div className="relative">
                                    <Search className="absolute left-2 top-2 w-3 h-3 text-slate-500" />
                                    <Input value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="Chercher un membre..."
                                        className="bg-white/5 border-white/10 text-white h-8 pl-7 rounded-xl text-xs" />
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
                                <div className="max-h-36 overflow-y-auto space-y-0.5 scrollbar-thin">
                                    {filteredUsers.map(u => (
                                        <button key={u.id} onClick={() => {
                                            if (newConvType === 'direct') setSelectedUsers([u.id]);
                                            else setSelectedUsers(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]);
                                        }} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs transition ${selectedUsers.includes(u.id) ? 'bg-teal-600/20 text-teal-300' : 'hover:bg-white/5 text-slate-400'}`}>
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-600 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0">{u.initials}</div>
                                            <div className="text-left min-w-0">
                                                <span className="truncate block">{u.name}</span>
                                                <span className="text-[9px] text-slate-600 block">{u.role}</span>
                                            </div>
                                            {selectedUsers.includes(u.id) && <Check className="w-3 h-3 text-teal-400 ml-auto shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" className="bg-gradient-to-r from-teal-600 to-emerald-600 text-xs h-7 flex-1 rounded-xl shadow-lg shadow-teal-600/20"
                                        onClick={createConversation} disabled={sending}>
                                        {sending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}Créer
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-xs h-7 rounded-xl"
                                        onClick={() => { setShowNewConv(false); setSelectedUsers([]); }}>Annuler</Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Conversation list */}
                <div className="flex-1 overflow-y-auto scrollbar-thin">
                    {filteredConvs.length > 0 ? filteredConvs.map(c => (
                        <button key={c.id} onClick={() => setActiveConv(c)}
                            className={`w-full flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] text-left transition-all ${activeConv?.id === c.id ? 'bg-teal-600/10' : 'hover:bg-white/[0.03]'}`}>
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${c.type === 'group'
                                ? 'bg-gradient-to-br from-teal-600/30 to-emerald-600/30 text-teal-300'
                                : 'bg-gradient-to-br from-indigo-600/30 to-purple-600/30 text-indigo-300'
                                }`}>
                                {c.type === 'group' ? <Users className="w-5 h-5" /> : <span className="text-base">{(c.name || '?').charAt(0).toUpperCase()}</span>}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm truncate">{c.name || 'Conversation'}</p>
                                    <span className="text-[10px] text-slate-500 shrink-0 ml-2">{c.lastMessageAt ? formatTime(c.lastMessageAt) : ''}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-slate-500 truncate">{c.lastMessage || (c.type === 'direct' ? 'Message direct' : 'Groupe')}</p>
                                    {(c.unreadCount || 0) > 0 && (
                                        <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 ml-2">{c.unreadCount}</span>
                                    )}
                                </div>
                            </div>
                        </button>
                    )) : (
                        <div className="text-center py-16 text-slate-500">
                            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-xs mb-2">Aucune conversation</p>
                            <Button size="sm" variant="ghost" className="text-teal-400 text-xs" onClick={() => setShowNewConv(true)}>
                                <Plus className="w-3 h-3 mr-1" /> Nouvelle conversation
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ CHAT AREA ═══ */}
            <div className={`${!activeConv ? 'hidden sm:flex' : 'flex'} flex-col flex-1 h-screen relative`}>
                {/* Ambient background for chat */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                    <div className="absolute top-[-30%] right-[-20%] w-[50%] h-[50%] bg-teal-600/3 blur-[150px] rounded-full" />
                </div>

                {activeConv ? (
                    <>
                        {/* Chat header */}
                        <div className="px-4 py-3 border-b border-white/5 bg-[#0F1219]/80 backdrop-blur-xl flex items-center gap-3 shrink-0 relative z-10">
                            <button onClick={() => setActiveConv(null)} className="sm:hidden p-1.5 hover:bg-white/5 rounded-xl"><ChevronLeft className="w-5 h-5" /></button>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${activeConv.type === 'group'
                                ? 'bg-gradient-to-br from-teal-600/30 to-emerald-600/30 text-teal-300'
                                : 'bg-gradient-to-br from-indigo-600/30 to-purple-600/30 text-indigo-300'
                                }`}>
                                {activeConv.type === 'group' ? <Users className="w-5 h-5" /> : (activeConv.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm truncate">{activeConv.name || 'Conversation'}</p>
                                <p className="text-[10px] text-slate-500">{participants.length} membre{participants.length > 1 ? 's' : ''}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                {activeConv.type === 'group' && (
                                    <Button size="sm" variant="ghost" className="text-slate-400 h-8 w-8 p-0 hover:bg-white/5"
                                        onClick={() => setShowGroupSettings(!showGroupSettings)}>
                                        <Settings className="w-4 h-4" />
                                    </Button>
                                )}
                                {activeConv.created_by === currentUser.id && (
                                    <Button size="sm" variant="ghost" className="text-red-400 h-8 w-8 p-0 hover:bg-red-500/10"
                                        onClick={() => deleteConversation(activeConv.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Group settings panel */}
                        <AnimatePresence>
                            {showGroupSettings && activeConv.type === 'group' && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden border-b border-white/5 relative z-10">
                                    <div className="p-3 bg-[#0B0E14]/50 backdrop-blur-sm">
                                        <h4 className="text-xs font-bold text-teal-400 mb-2">Membres ({participants.length})</h4>
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {participants.map((p: any) => {
                                                const u = allUsers.find(u => u.id === p.user_id);
                                                return (
                                                    <span key={p.user_id} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-300">
                                                        {p.user_id === currentUser.id ? 'Vous' : u?.name || 'Membre'}
                                                        {p.role === 'admin' && ' 👑'}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        <div className="relative mb-2">
                                            <Input placeholder="Ajouter un membre..." className="bg-white/5 border-white/10 text-white h-7 text-xs rounded-xl"
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
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 relative z-10 scrollbar-thin">
                            {messages.map((m, idx) => {
                                const isMe = m.sender_id === currentUser.id;
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
                                        {!isMe && showAvatar ? (
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-600 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mr-2 mt-auto mb-5">
                                                {getSenderInitials(m.sender_id)}
                                            </div>
                                        ) : !isMe ? <div className="w-7 shrink-0 mr-2" /> : null}

                                        <div className="max-w-[75%]">
                                            {showSenderName && <p className="text-[10px] text-teal-400 font-medium mb-0.5 ml-1">{getSenderName(m.sender_id)}</p>}

                                            {/* Image message */}
                                            {m.msg_type === 'image' && m.media_url && (
                                                <div className={`rounded-2xl overflow-hidden mb-1 ${isMe ? 'rounded-br-md' : 'rounded-bl-md'}`}>
                                                    <img src={m.media_url} alt="" className="max-w-full max-h-60 object-cover rounded-2xl" />
                                                </div>
                                            )}
                                            {/* File message */}
                                            {m.msg_type === 'file' && m.media_url && (
                                                <a href={m.media_url} target="_blank" rel="noopener noreferrer"
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-2xl mb-1 ${isMe ? 'bg-teal-700 rounded-br-md' : 'bg-white/10 rounded-bl-md'}`}>
                                                    <FileText className="w-4 h-4 shrink-0" />
                                                    <span className="text-sm truncate">{m.content || 'Fichier'}</span>
                                                </a>
                                            )}

                                            {/* Text message */}
                                            {(m.msg_type === 'text' || (m.content && m.msg_type !== 'file')) && (
                                                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${isMe
                                                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-br-md shadow-lg shadow-teal-600/10'
                                                    : 'bg-white/[0.06] text-white rounded-bl-md'
                                                    }`}>
                                                    {m.content}
                                                </div>
                                            )}

                                            <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end mr-1' : 'ml-1'}`}>
                                                <span className="text-[10px] text-slate-600">{formatTime(m.created_at)}</span>
                                                {isMe && <CheckCheck className={`w-3 h-3 ${m.is_read ? 'text-teal-400' : 'text-slate-600'}`} />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={msgEnd} />
                        </div>

                        {/* Media preview */}
                        {mediaFile && (
                            <div className="px-4 py-2 border-t border-white/5 bg-[#0F1219]/50 flex items-center gap-3 relative z-10">
                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 shrink-0">
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
                        <div className="p-3 border-t border-white/5 bg-[#0F1219]/80 backdrop-blur-xl shrink-0 relative z-10">
                            <div className="flex gap-2 items-center max-w-3xl mx-auto">
                                <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-teal-400 shrink-0 transition-colors">
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
                                    className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 rounded-full w-10 h-10 p-0 shrink-0 shadow-lg shadow-teal-600/20">
                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500 relative z-10">
                        <div className="text-center">
                            <MessageSquare className="w-20 h-20 mx-auto mb-4 opacity-10" />
                            <p className="text-lg font-bold text-slate-400 mb-1">Messages</p>
                            <p className="text-sm text-slate-600">Sélectionnez une conversation ou créez-en une nouvelle</p>
                            <Button size="sm" className="mt-4 bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl shadow-lg shadow-teal-600/20"
                                onClick={() => setShowNewConv(true)}>
                                <Plus className="w-4 h-4 mr-1" /> Nouvelle conversation
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

