'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, Send, Loader2, Users, Paperclip,
    Mic, MicOff, X, StopCircle, Play, Pause, Volume2,
    Download, FileText, Image as ImageIcon, File
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════
// GROUP CHAT VIEW — Chat de groupe enrichi
// Texte, fichiers, images, vocaux
// ═══════════════════════════════════════════════════════

interface GroupChatViewProps {
    groupId: string;
    groupName: string;
    userId: string;
    userName: string;
    orgId: string;
    onBack: () => void;
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

// ═══ HELPERS ═══
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageType(type: string): boolean {
    return type.startsWith('image/');
}

const FILE_ICONS: Record<string, string> = {
    'application/pdf': '📄', 'application/msword': '📝',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
    'text/plain': '📃', 'text/html': '🌐',
};

function getFileIcon(mime: string): string {
    if (mime.startsWith('image/')) return '🖼️';
    if (mime.startsWith('audio/')) return '🎵';
    if (mime.startsWith('video/')) return '🎬';
    return FILE_ICONS[mime] || '📎';
}

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

export function GroupChatView({ groupId, groupName, userId, userName, orgId, onBack }: GroupChatViewProps) {
    const [messages, setMessages] = useState<MsgInfo[]>([]);
    const [memberNames, setMemberNames] = useState<Record<string, { name: string; initials: string }>>({});
    const [msgText, setMsgText] = useState('');
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [memberCount, setMemberCount] = useState(0);

    // Voice recording
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const msgEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load messages + members
    useEffect(() => {
        let channel: any;
        (async () => {
            // Load messages
            const { data: msgs } = await supabase.from('chat_messages').select('*')
                .eq('conversation_id', groupId)
                .order('created_at', { ascending: true }).limit(300);
            setMessages(msgs || []);

            // Load members
            const { data: parts, count } = await supabase.from('chat_participants')
                .select('user_id', { count: 'exact' }).eq('conversation_id', groupId);
            setMemberCount(count || 0);
            const memberIds = (parts || []).map((p: any) => p.user_id);

            // Get names
            const names: Record<string, { name: string; initials: string }> = {};
            if (memberIds.length > 0) {
                const [{ data: teachers }, { data: students }] = await Promise.all([
                    supabase.from('teacher_profiles').select('id, first_name, last_name').in('id', memberIds),
                    supabase.from('student_profiles').select('id, first_name, last_name').in('id', memberIds),
                ]);
                [...(teachers || []), ...(students || [])].forEach((u: any) => {
                    names[u.id] = {
                        name: `${u.first_name} ${u.last_name}`,
                        initials: `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`,
                    };
                });
            }
            setMemberNames(names);
            setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

            // Realtime
            channel = supabase.channel(`group-msgs-${groupId}`).on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'chat_messages',
                filter: `conversation_id=eq.${groupId}`,
            }, (payload: any) => {
                setMessages(prev => {
                    if (prev.find(m => m.id === payload.new.id)) return prev;
                    return [...prev, payload.new as MsgInfo];
                });
                setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
            }).subscribe();
        })();
        return () => { if (channel) supabase.removeChannel(channel); };
    }, [groupId]);

    const getSenderName = (id: string) => id === userId ? 'Vous' : memberNames[id]?.name || 'Membre';
    const getSenderInitials = (id: string) => {
        if (id === userId) return userName.split(' ').map(w => w[0]).join('').slice(0, 2);
        return memberNames[id]?.initials || '?';
    };

    const formatTime = (ts: string) => {
        const d = new Date(ts);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    };
    const formatRecTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    // ═══ SEND TEXT ═══
    const sendMessage = useCallback(async () => {
        if (!msgText.trim()) return;
        setSending(true);
        const text = msgText.trim();
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
        } catch (e) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setMsgText(text);
            toast.error("Erreur d'envoi");
        }
        setSending(false);
    }, [msgText, groupId, userId]);

    // ═══ FILE UPLOAD ═══
    const handleFileUpload = async (files: FileList | null) => {
        if (!files) return;
        setUploading(true);
        for (const file of Array.from(files)) {
            if (file.size > 25 * 1024 * 1024) { toast.error(`${file.name}: Max 25 Mo`); continue; }
            try {
                const path = `chat-files/${groupId}/${Date.now()}_${file.name}`;
                const { error: uploadError } = await supabase.storage
                    .from('organization-assets').upload(path, file, { contentType: file.type, upsert: false });
                if (uploadError) throw uploadError;
                const { data: urlData } = supabase.storage.from('organization-assets').getPublicUrl(path);
                const msgType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'voice' : 'file';
                const content = msgType === 'image' ? `📷 ${file.name}` : msgType === 'voice' ? '🎤 Message vocal' : `📎 ${file.name} (${formatFileSize(file.size)})`;
                await supabase.from('chat_messages').insert({
                    conversation_id: groupId, sender_id: userId, content, msg_type: msgType, media_url: urlData.publicUrl,
                });
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
                    const path = `voice-messages/${userId}/${Date.now()}.webm`;
                    const { error: uploadError } = await supabase.storage.from('organization-assets').upload(path, blob, { contentType: 'audio/webm', upsert: false });
                    if (uploadError) throw uploadError;
                    const { data: urlData } = supabase.storage.from('organization-assets').getPublicUrl(path);
                    await supabase.from('chat_messages').insert({
                        conversation_id: groupId, sender_id: userId, content: '🎤 Message vocal', msg_type: 'voice', media_url: urlData.publicUrl,
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
        return <span className="whitespace-pre-wrap break-words">{m.content}</span>;
    };

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
                    <p className="text-[10px] text-slate-500">{memberCount} membre{memberCount > 1 ? 's' : ''}</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-1.5 scrollbar-thin">
                {messages.map((m) => {
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
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mr-2 mt-auto mb-5">
                                    {getSenderInitials(m.sender_id)}
                                </div>
                            )}
                            <div className="max-w-[75%]">
                                {!isMe && <p className="text-[10px] text-teal-400 ml-1 mb-0.5 font-medium">{getSenderName(m.sender_id)}</p>}
                                <div className={cn("px-3 py-2 rounded-2xl text-sm leading-relaxed",
                                    isMe ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-md shadow-lg shadow-emerald-600/10'
                                        : 'bg-white/[0.06] text-white rounded-bl-md'
                                )}>
                                    {renderContent(m, isMe)}
                                </div>
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
                <div className="flex gap-2 items-center">
                    <button onClick={() => fileInputRef.current?.click()} disabled={isRecording || uploading}
                        className="p-2 hover:bg-white/5 rounded-full transition text-slate-400 hover:text-cyan-400 disabled:opacity-30">
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <Input value={msgText} onChange={e => setMsgText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder="Écrire un message..." disabled={isRecording}
                        className="bg-white/5 border-white/10 text-white h-10 rounded-full text-sm flex-1" />
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
