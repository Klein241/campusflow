'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, Send, Loader2, Users, Paperclip,
    Mic, X, StopCircle, Play, Pause, Volume2,
    Download, Trash2, SmilePlus, ShieldCheck,
    UserMinus, Crown, MoreVertical, LogOut, Settings,
    Pin, PinOff, Reply, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/compress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ChatMessageRenderer } from './chat-message-renderer';
import { notifyGroupNewMessage } from '@/lib/notifications';
import { uploadToR2 } from '@/lib/r2';


// ═══════════════════════════════════════════════════════
// GROUP CHAT VIEW — Chat de groupe enrichi
// Texte, fichiers, images, vocaux, réactions, admin tools
// ═══════════════════════════════════════════════════════

interface GroupChatViewProps {
    groupId: string;
    groupName: string;
    userId: string;
    userName: string;
    orgId: string;
    onBack: () => void;
    onGroupDeleted?: () => void;
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
    deleted_at?: string | null;
}

interface Reaction {
    emoji: string;
    count: number;
    userReacted: boolean;
}

interface MemberInfo {
    userId: string;
    name: string;
    initials: string;
    role: 'admin' | 'member';
}

// ═══ HELPERS ═══
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '✅'];

// ═══ VOICE PLAYER ═══
function VoicePlayer({ url }: { url: string }) {
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.addEventListener('ended', () => { setPlaying(false); setProgress(0); });
        audio.addEventListener('timeupdate', () => {
            if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
        });
        return () => { audio.pause(); audio.remove(); };
    }, [url]);

    return (
        <div className="flex items-center gap-2 min-w-[140px]">
            <button onClick={() => {
                if (!audioRef.current) return;
                playing ? audioRef.current.pause() : audioRef.current.play();
                setPlaying(!playing);
            }} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 hover:bg-white/20 transition">
                {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <Volume2 className="w-3 h-3 text-slate-500 shrink-0" />
        </div>
    );
}

// ═══ EMOJI PICKER ═══
function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute bottom-full mb-2 left-0 bg-[#0F172A] border border-white/10 rounded-2xl p-2 shadow-2xl z-50 flex gap-1"
        >
            {QUICK_EMOJIS.map(e => (
                <button key={e} onClick={() => { onSelect(e); onClose(); }}
                    className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-xl transition active:scale-90">
                    {e}
                </button>
            ))}
        </motion.div>
    );
}

export function GroupChatView({ groupId, groupName, userId, userName, orgId, onBack, onGroupDeleted }: GroupChatViewProps) {
    const [messages, setMessages] = useState<MsgInfo[]>([]);
    const [members, setMembers] = useState<MemberInfo[]>([]);
    const [memberCount, setMemberCount] = useState(0);
    const [msgText, setMsgText] = useState('');
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Current user's role in this group
    const [myRole, setMyRole] = useState<'admin' | 'member'>('member');
    const isAdmin = myRole === 'admin';

    // Réactions: { messageId: Reaction[] }
    const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
    const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);

    // Admin panel
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [deletingGroup, setDeletingGroup] = useState(false);

    // Message context menu
    const [contextMsg, setContextMsg] = useState<string | null>(null);

    // Sky Points chat credits
    const [freeRemaining, setFreeRemaining] = useState<number | null>(null);
    const [skyBalance, setSkyBalance] = useState<number | null>(null);
    const [showSkyAlert, setShowSkyAlert] = useState(false);

    // Voice recording
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const msgEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ═══ LOAD MESSAGES + MEMBERS + ROLES ═══
    useEffect(() => {
        let channel: any;
        let reactChannel: any;
        (async () => {
            // Messages
            const { data: msgs } = await supabase.from('chat_messages').select('*')
                .eq('conversation_id', groupId)
                .is('deleted_at', null)
                .order('created_at', { ascending: true }).limit(300);
            setMessages(msgs || []);

            // Members + roles
            const { data: parts, count } = await supabase.from('chat_participants')
                .select('user_id, role', { count: 'exact' }).eq('conversation_id', groupId);
            setMemberCount(count || 0);
            const memberIds = (parts || []).map((p: any) => p.user_id);

            // My role
            const myPart = (parts || []).find((p: any) => p.user_id === userId);
            setMyRole(myPart?.role === 'admin' ? 'admin' : 'member');

            // Resolve names
            if (memberIds.length > 0) {
                const [{ data: teachers }, { data: students }] = await Promise.all([
                    supabase.from('teacher_profiles').select('id, first_name, last_name').in('id', memberIds),
                    supabase.from('student_profiles').select('id, first_name, last_name').in('id', memberIds),
                ]);
                const nameMap: Record<string, string> = {};
                [...(teachers || []), ...(students || [])].forEach((u: any) => {
                    nameMap[u.id] = `${u.first_name} ${u.last_name}`;
                });
                const membersData: MemberInfo[] = (parts || []).map((p: any) => {
                    const name = nameMap[p.user_id] || 'Membre';
                    return {
                        userId: p.user_id,
                        name,
                        initials: name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
                        role: p.role === 'admin' ? 'admin' : 'member',
                    };
                });
                setMembers(membersData);
            }

            // Load reactions for visible messages
            if (msgs && msgs.length > 0) {
                const msgIds = msgs.map((m: any) => m.id);
                const { data: reacts } = await supabase.from('message_reactions')
                    .select('*').in('message_id', msgIds);
                buildReactions(reacts || [], msgIds);
            }

            setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

            // Realtime: messages
            channel = supabase.channel(`group-msgs-${groupId}`)
                .on('postgres_changes', {
                    event: 'INSERT', schema: 'public', table: 'chat_messages',
                    filter: `conversation_id=eq.${groupId}`,
                }, (payload: any) => {
                    if (payload.new.deleted_at) return;
                    setMessages(prev => {
                        if (prev.find(m => m.id === payload.new.id)) return prev;
                        return [...prev, payload.new as MsgInfo];
                    });
                    setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                })
                .on('postgres_changes', {
                    event: 'UPDATE', schema: 'public', table: 'chat_messages',
                    filter: `conversation_id=eq.${groupId}`,
                }, (payload: any) => {
                    if (payload.new.deleted_at) {
                        setMessages(prev => prev.filter(m => m.id !== payload.new.id));
                    }
                })
                .subscribe();

            // Realtime: reactions
            reactChannel = supabase.channel(`group-reactions-${groupId}`)
                .on('postgres_changes', {
                    event: '*', schema: 'public', table: 'message_reactions',
                }, async () => {
                    // Reload reactions
                    const { data: msgs2 } = await supabase.from('chat_messages')
                        .select('id').eq('conversation_id', groupId).is('deleted_at', null);
                    const ids = (msgs2 || []).map((m: any) => m.id);
                    if (ids.length > 0) {
                        const { data: r } = await supabase.from('message_reactions').select('*').in('message_id', ids);
                        buildReactions(r || [], ids);
                    }
                })
                .subscribe();
        })();
        return () => {
            if (channel) supabase.removeChannel(channel);
            if (reactChannel) supabase.removeChannel(reactChannel);
        };
    }, [groupId, userId]);

    const buildReactions = (reacts: any[], msgIds: string[]) => {
        const map: Record<string, Reaction[]> = {};
        for (const id of msgIds) {
            const msgReacts = reacts.filter(r => r.message_id === id);
            const emojiMap: Record<string, { count: number; userReacted: boolean }> = {};
            for (const r of msgReacts) {
                if (!emojiMap[r.emoji]) emojiMap[r.emoji] = { count: 0, userReacted: false };
                emojiMap[r.emoji].count++;
                if (r.user_id === userId) emojiMap[r.emoji].userReacted = true;
            }
            map[id] = Object.entries(emojiMap).map(([emoji, data]) => ({ emoji, ...data }));
        }
        setReactions(map);
    };

    const getSenderInfo = (id: string) => {
        if (id === userId) return { name: 'Vous', initials: userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() };
        const m = members.find(m => m.userId === id);
        return { name: m?.name || 'Membre', initials: m?.initials || '?' };
    };

    const formatTime = (ts: string) => {
        const d = new Date(ts);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    };
    const formatRecTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    // ═══ RÉACTION EMOJI ═══
    const toggleReaction = async (messageId: string, emoji: string) => {
        const msgReacts = reactions[messageId] || [];
        const existing = msgReacts.find(r => r.emoji === emoji);
        if (existing?.userReacted) {
            // Remove reaction
            await supabase.from('message_reactions')
                .delete().eq('message_id', messageId).eq('user_id', userId).eq('emoji', emoji);
        } else {
            // Add reaction
            await supabase.from('message_reactions').upsert({
                message_id: messageId, user_id: userId, emoji,
            }, { onConflict: 'message_id,user_id,emoji' });
        }
        // Optimistic update
        setReactions(prev => {
            const msgR = prev[messageId] || [];
            const idx = msgR.findIndex(r => r.emoji === emoji);
            if (idx >= 0) {
                const updated = [...msgR];
                if (updated[idx].userReacted) {
                    updated[idx] = { ...updated[idx], count: updated[idx].count - 1, userReacted: false };
                    if (updated[idx].count === 0) updated.splice(idx, 1);
                } else {
                    updated[idx] = { ...updated[idx], count: updated[idx].count + 1, userReacted: true };
                }
                return { ...prev, [messageId]: updated };
            } else {
                return { ...prev, [messageId]: [...msgR, { emoji, count: 1, userReacted: true }] };
            }
        });
    };

    // ═══ SUPPRIMER MESSAGE ═══
    const deleteMessage = async (msgId: string, senderId: string) => {
        if (senderId !== userId && !isAdmin) return;
        const { error } = await supabase.from('chat_messages')
            .update({ deleted_at: new Date().toISOString() }).eq('id', msgId);
        if (error) { toast.error('Erreur'); return; }
        setMessages(prev => prev.filter(m => m.id !== msgId));
        setContextMsg(null);
        toast.success('Message supprimé');
    };

    // ═══ ADMIN: RETIRER UN MEMBRE ═══
    const removeMember = async (targetUserId: string) => {
        if (!isAdmin || targetUserId === userId) return;
        const { error } = await supabase.from('chat_participants')
            .delete().eq('conversation_id', groupId).eq('user_id', targetUserId);
        if (error) { toast.error('Erreur'); return; }
        await supabase.from('chat_messages').insert({
            conversation_id: groupId, sender_id: userId,
            content: `${members.find(m => m.userId === targetUserId)?.name || 'Membre'} a été retiré du groupe`,
            msg_type: 'system',
        });
        setMembers(prev => prev.filter(m => m.userId !== targetUserId));
        setMemberCount(c => c - 1);
        toast.success('Membre retiré');
    };

    // ═══ ADMIN: PROMOUVOIR UN MEMBRE ═══
    const promoteMember = async (targetUserId: string) => {
        if (!isAdmin || targetUserId === userId) return;
        const { error } = await supabase.from('chat_participants')
            .update({ role: 'admin' }).eq('conversation_id', groupId).eq('user_id', targetUserId);
        if (error) { toast.error('Erreur'); return; }
        setMembers(prev => prev.map(m => m.userId === targetUserId ? { ...m, role: 'admin' } : m));
        toast.success(`${members.find(m => m.userId === targetUserId)?.name} est maintenant admin 👑`);
    };

    // ═══ ADMIN: SUPPRIMER LE GROUPE ═══
    const deleteGroup = async () => {
        if (!isAdmin) return;
        if (!confirm(`Supprimer définitivement le groupe "${groupName}" ?`)) return;
        setDeletingGroup(true);
        await supabase.from('chat_messages').delete().eq('conversation_id', groupId);
        await supabase.from('chat_participants').delete().eq('conversation_id', groupId);
        const { error } = await supabase.from('chat_conversations').delete().eq('id', groupId);
        if (error) { toast.error('Erreur'); setDeletingGroup(false); return; }
        toast.success('Groupe supprimé');
        onGroupDeleted?.();
        onBack();
    };

    // ═══ QUITTER LE GROUPE ═══
    const leaveGroup = async () => {
        if (!confirm('Quitter ce groupe ?')) return;
        await supabase.from('chat_messages').insert({
            conversation_id: groupId, sender_id: userId,
            content: `${userName} a quitté le groupe`, msg_type: 'system',
        });
        await supabase.from('chat_participants').delete()
            .eq('conversation_id', groupId).eq('user_id', userId);
        toast.success('Vous avez quitté le groupe');
        onBack();
    };

    // ═══ SEND TEXT ═══
    const sendMessage = useCallback(async () => {
        if (!msgText.trim()) return;
        setSending(true);
        const text = msgText.trim();

        const { data: creditResult } = await supabase.rpc('use_chat_credit', {
            p_user_id: userId,
            p_org_id: orgId,
        });
        if (creditResult) {
            setFreeRemaining(creditResult.free_remaining ?? 0);
            setSkyBalance(creditResult.balance ?? 0);
            if (!creditResult.success) {
                setShowSkyAlert(true);
                setSending(false);
                return;
            }
        }

        const tempId = `temp_${Date.now()}`;
        const optimistic: MsgInfo = {
            id: tempId, conversation_id: groupId, sender_id: userId,
            content: text, msg_type: 'text', media_url: null, is_read: false,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimistic]);
        setMsgText('');
        setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        try {
            const { data, error } = await supabase.from('chat_messages').insert({
                conversation_id: groupId, sender_id: userId,
                content: text, msg_type: 'text',
            }).select().single();
            if (error) throw error;
            if (data) setMessages(prev => prev.map(m => m.id === tempId ? data as MsgInfo : m));
            try {
                const { data: participants } = await supabase
                    .from('chat_participants').select('user_id')
                    .eq('conversation_id', groupId).neq('user_id', userId);
                if (participants?.length) {
                    const memberIds = participants.map((p: any) => p.user_id);
                    notifyGroupNewMessage({
                        senderId: userId,
                        senderName: userName,
                        groupId,
                        groupName,
                        messagePreview: text.slice(0, 80),
                        memberIds,
                    }).catch(e => console.warn('[Notif] group_new_message:', e));
                }
            } catch (e) { console.warn('[Notif] group participants fetch:', e); }
        } catch (e) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setMsgText(text);
            toast.error("Erreur d'envoi");
        }
        setSending(false);
    }, [msgText, groupId, userId, orgId, userName, groupName]);


    // ═══ FILE UPLOAD ═══
    const handleFileUpload = async (files: FileList | null) => {
        if (!files) return;
        setUploading(true);
        for (const file of Array.from(files)) {
            if (file.size > 25 * 1024 * 1024) { toast.error(`${file.name}: Max 25 Mo`); continue; }
            try {
                let fileToUpload = file;
                if (file.type.startsWith('image/')) {
                    fileToUpload = await compressImage(file, { maxWidth: 1200, quality: 0.6 });
                }
                const r2Res = await uploadToR2(fileToUpload, `chat-files/${groupId}`, file.name);
                const msgType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'voice' : 'file';
                const content = msgType === 'image' ? `📷 ${file.name}` : msgType === 'voice' ? '🎤 Message vocal' : `📎 ${file.name} (${formatFileSize(file.size)})`;
                await supabase.from('chat_messages').insert({
                    conversation_id: groupId, sender_id: userId, content, msg_type: msgType, media_url: r2Res.url,
                });
                try {
                    const { data: participants } = await supabase
                        .from('chat_participants').select('user_id')
                        .eq('conversation_id', groupId).neq('user_id', userId);
                    if (participants?.length) {
                        const memberIds = participants.map((p: any) => p.user_id);
                        notifyGroupNewMessage({
                            senderId: userId, senderName: userName,
                            groupId, groupName,
                            messagePreview: content,
                            memberIds,
                        }).catch(e => console.warn('[Notif] group file:', e));
                    }
                } catch (e) { console.warn('[Notif] group file participants:', e); }
                toast.success(`${file.name} envoyé ✅`);
            } catch (e: any) { toast.error(e.message || file.name); }
        }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ═══ VOICE RECORDING ═══
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' });
            mediaRecorderRef.current = rec;
            audioChunksRef.current = [];
            rec.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            rec.start(100);
            setIsRecording(true); setRecordingTime(0);
            recordingIntervalRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        } catch { toast.error("Impossible d'accéder au microphone"); }
    };

    const stopRecording = async () => {
        if (!mediaRecorderRef.current || !isRecording) return;
        return new Promise<void>((resolve) => {
            mediaRecorderRef.current!.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
                setIsRecording(false); setRecordingTime(0);
                setUploading(true);
                try {
                    const r2Res = await uploadToR2(blob, `voice-messages/${userId}`, `voice_${Date.now()}.webm`);
                    await supabase.from('chat_messages').insert({
                        conversation_id: groupId, sender_id: userId, content: '🎤 Message vocal', msg_type: 'voice', media_url: r2Res.url,
                    });
                    toast.success('Message vocal envoyé 🎤');
                } catch (e: any) { toast.error(e.message); }
                setUploading(false);
                mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
                resolve();
            };
            mediaRecorderRef.current!.stop();
        });
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop()); }
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        setIsRecording(false); setRecordingTime(0); audioChunksRef.current = [];
    };

    // ═══ RENDER MSG CONTENT ═══
    const renderContent = (m: MsgInfo, isMe: boolean) => {
        if (m.msg_type === 'voice' && m.media_url) return <VoicePlayer url={m.media_url} />;
        if (m.msg_type === 'image' && m.media_url) {
            return (
                <div className="space-y-1">
                    <img src={m.media_url} alt="" className="max-w-[240px] rounded-xl border border-white/10 cursor-pointer hover:opacity-90 transition"
                        onClick={() => window.open(m.media_url!, '_blank')} />
                    <p className="text-[10px] text-slate-500">{m.content.replace('📷 ', '')}</p>
                </div>
            );
        }
        if (m.msg_type === 'file' && m.media_url) {
            const match = m.content.match(/📎 (.+?) \((.+?)\)/);
            return (
                <a href={m.media_url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/10 hover:border-white/20 transition">
                    <span className="text-xl">📎</span>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{match?.[1] || 'Fichier'}</p>
                        <p className="text-[10px] text-slate-500">{match?.[2] || ''}</p>
                    </div>
                    <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </a>
            );
        }
        return <ChatMessageRenderer content={m.content} isMe={isMe} />;
    };

    // ═══ ADMIN PANEL ═══
    if (showAdminPanel) {
        return (
            <div className="flex flex-col h-[calc(100vh-140px)]">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-white/[0.02] backdrop-blur-sm rounded-t-2xl">
                    <button onClick={() => setShowAdminPanel(false)} className="p-1.5 hover:bg-white/5 rounded-xl">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <p className="font-bold text-sm">⚙️ Gestion du groupe</p>
                        <p className="text-[10px] text-slate-500">{groupName} • {memberCount} membres</p>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Membres</p>
                    {members.map(m => (
                        <div key={m.userId} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-600/30 to-emerald-600/30 flex items-center justify-center text-xs font-bold text-teal-300 shrink-0">
                                {m.initials}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{m.name} {m.userId === userId ? '(vous)' : ''}</p>
                                <p className="text-[10px] text-slate-500">{m.role === 'admin' ? '👑 Admin' : 'Membre'}</p>
                            </div>
                            {m.userId !== userId && isAdmin && (
                                <div className="flex gap-1">
                                    {m.role !== 'admin' && (
                                        <button onClick={() => promoteMember(m.userId)}
                                            className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition" title="Promouvoir admin">
                                            <Crown className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button onClick={() => removeMember(m.userId)}
                                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition" title="Retirer du groupe">
                                        <UserMinus className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Danger zone */}
                    <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Zone dangereuse</p>
                        <button onClick={leaveGroup}
                            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition text-sm">
                            <LogOut className="w-4 h-4" />
                            Quitter le groupe
                        </button>
                        {isAdmin && (
                            <button onClick={deleteGroup} disabled={deletingGroup}
                                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-red-600/10 border border-red-500/30 text-red-400 hover:bg-red-600/20 transition text-sm font-medium">
                                {deletingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Supprimer le groupe
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-140px)]">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-white/[0.02] backdrop-blur-sm rounded-t-2xl">
                <button onClick={onBack} className="p-1.5 hover:bg-white/5 rounded-xl">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-600/30 to-emerald-600/30 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-teal-300" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{groupName}</p>
                    <p className="text-[10px] text-slate-500">{memberCount} membre{memberCount > 1 ? 's' : ''}{isAdmin ? ' • 👑 Admin' : ''}</p>
                </div>
                <button onClick={() => setShowAdminPanel(true)}
                    className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition">
                    <Settings className="w-5 h-5" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-1.5 scrollbar-thin"
                onClick={() => { setContextMsg(null); setShowEmojiFor(null); }}>
                {messages.map((m) => {
                    const isMe = m.sender_id === userId;
                    const isSystem = m.msg_type === 'system';
                    const sender = getSenderInfo(m.sender_id);
                    const msgReactions = reactions[m.id] || [];
                    const canDelete = isMe || isAdmin;

                    if (isSystem) {
                        return (
                            <div key={m.id} className="text-center my-3">
                                <span className="text-[10px] text-slate-500 bg-white/5 px-3 py-1 rounded-full">{m.content}</span>
                            </div>
                        );
                    }
                    return (
                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                            {!isMe && (
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mr-2 mt-auto mb-5">
                                    {sender.initials}
                                </div>
                            )}
                            <div className="max-w-[75%]">
                                {!isMe && <p className="text-[10px] text-teal-400 ml-1 mb-0.5 font-medium">{sender.name}</p>}
                                {/* Message bubble */}
                                <div className="relative">
                                    <div
                                        className={cn("px-3 py-2 rounded-2xl text-sm leading-relaxed cursor-pointer",
                                            isMe ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-md shadow-lg shadow-emerald-600/10'
                                                : 'bg-white/[0.06] text-white rounded-bl-md'
                                        )}
                                        onContextMenu={e => { e.preventDefault(); setContextMsg(m.id); setShowEmojiFor(null); }}
                                        onClick={e => { e.stopPropagation(); setContextMsg(contextMsg === m.id ? null : m.id); setShowEmojiFor(null); }}
                                    >
                                        {renderContent(m, isMe)}
                                    </div>

                                    {/* Context menu */}
                                    <AnimatePresence>
                                        {contextMsg === m.id && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.85 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.85 }}
                                                className={cn(
                                                    "absolute z-40 bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl p-1 flex gap-1 min-w-[120px]",
                                                    isMe ? 'right-0 bottom-full mb-2' : 'left-0 bottom-full mb-2'
                                                )}
                                                onClick={e => e.stopPropagation()}
                                            >
                                                {/* Quick emoji */}
                                                {QUICK_EMOJIS.slice(0, 5).map(emoji => (
                                                    <button key={emoji}
                                                        onClick={() => { toggleReaction(m.id, emoji); setContextMsg(null); }}
                                                        className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-base transition">
                                                        {emoji}
                                                    </button>
                                                ))}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => deleteMessage(m.id, m.sender_id)}
                                                        className="w-8 h-8 rounded-xl hover:bg-red-500/10 flex items-center justify-center text-red-400 transition ml-auto">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Réactions */}
                                {msgReactions.length > 0 && (
                                    <div className={cn("flex flex-wrap gap-1 mt-1", isMe ? 'justify-end' : 'justify-start')}>
                                        {msgReactions.map(r => (
                                            <button key={r.emoji}
                                                onClick={e => { e.stopPropagation(); toggleReaction(m.id, r.emoji); }}
                                                className={cn(
                                                    "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] border transition",
                                                    r.userReacted
                                                        ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                                                        : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                                                )}>
                                                {r.emoji} <span>{r.count}</span>
                                            </button>
                                        ))}
                                        <button
                                            onClick={e => { e.stopPropagation(); setShowEmojiFor(showEmojiFor === m.id ? null : m.id); setContextMsg(null); }}
                                            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] border border-white/10 bg-white/5 text-slate-500 hover:text-slate-300 transition">
                                            <SmilePlus className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}

                                <span className={`text-[10px] text-slate-600 mt-0.5 block ${isMe ? 'text-right mr-1' : 'ml-1'}`}>{formatTime(m.created_at)}</span>
                            </div>
                        </div>
                    );
                })}
                <div ref={msgEndRef} />
            </div>

            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" multiple className="hidden"
                accept="image/*,application/pdf,.doc,.docx,.txt,.html,.xls,.xlsx,.ppt,.pptx,.zip,.rar,audio/*,video/*"
                onChange={e => handleFileUpload(e.target.files)} />

            {/* Input bar */}
            <div className="p-3 border-t border-white/5 bg-[#0F1219]/50">
                {isRecording && (
                    <div className="flex items-center gap-3 mb-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-sm text-red-400 font-mono">{formatRecTime(recordingTime)}</span>
                        <span className="text-xs text-red-400/70 flex-1">Enregistrement...</span>
                        <button onClick={cancelRecording} className="text-slate-400 hover:text-red-400 p-1"><X className="w-4 h-4" /></button>
                        <button onClick={stopRecording} className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-400 transition flex items-center gap-1">
                            <StopCircle className="w-3 h-3" /> Envoyer
                        </button>
                    </div>
                )}
                {uploading && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-cyan-400">
                        <Loader2 className="w-3 h-3 animate-spin" /> Envoi en cours...
                    </div>
                )}
                {/* Sky Points alert */}
                {showSkyAlert && (
                    <div className="mb-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                        <span className="text-xl">⭐</span>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-amber-300">Crédits épuisés</p>
                            <p className="text-[10px] text-slate-400">Solde: {skyBalance ?? 0} pts — 1 Sky Point par message</p>
                        </div>
                        <button onClick={() => setShowSkyAlert(false)} className="text-slate-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                    </div>
                )}
                <div className="flex gap-2 items-center">
                    <button onClick={() => fileInputRef.current?.click()} disabled={isRecording || uploading}
                        className="p-2 hover:bg-white/5 rounded-full transition text-slate-400 hover:text-cyan-400 disabled:opacity-30">
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <div className="relative flex-1">
                        <Input value={msgText} onChange={e => setMsgText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                            placeholder="Écrire un message..." disabled={isRecording}
                            className="bg-white/5 border-white/10 text-white h-10 rounded-full text-sm w-full pr-20" />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px]">
                            {freeRemaining !== null && freeRemaining > 0 ? (
                                <span className="text-teal-500">{freeRemaining} gratuits</span>
                            ) : skyBalance !== null ? (
                                <span className="text-amber-500">⭐ {skyBalance}</span>
                            ) : null}
                        </div>
                    </div>
                    {msgText.trim() ? (
                        <Button onClick={sendMessage} disabled={sending || uploading}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full w-10 h-10 p-0 shrink-0 shadow-lg shadow-emerald-600/20">
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                    ) : (
                        <button onClick={isRecording ? stopRecording : startRecording} disabled={uploading}
                            className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition",
                                isRecording ? "bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse"
                                    : "bg-white/5 text-slate-400 hover:text-teal-400 hover:bg-white/10"
                            )}>
                            {isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
