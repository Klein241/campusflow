'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Plus, Search, Loader2, X, Check, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════
// GROUPES VIEW — Espace dédié aux groupes de l'école
// Rejoindre des groupes, voir tous les groupes
// ═══════════════════════════════════════════════════════

interface GroupesViewProps {
    orgId: string;
    orgSlug: string;
    userId: string;
    userName: string;
    userRole: string;
    onOpenGroupChat?: (convId: string, convName: string) => void;
}

interface GroupInfo {
    id: string;
    name: string;
    created_by: string;
    memberCount: number;
    isMember: boolean;
    lastMessage?: string;
    lastMessageAt?: string;
}

interface SchoolUser {
    id: string;
    name: string;
    role: string;
    initials: string;
}

export function GroupesView({ orgId, orgSlug, userId, userName, userRole, onOpenGroupChat }: GroupesViewProps) {
    const [groups, setGroups] = useState<GroupInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [creating, setCreating] = useState(false);
    const [search, setSearch] = useState('');

    // For member selection
    const [allUsers, setAllUsers] = useState<SchoolUser[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [searchUser, setSearchUser] = useState('');
    const [joining, setJoining] = useState<string | null>(null);

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

    // Load all groups in this org
    useEffect(() => {
        loadGroups();
    }, [orgId, userId]);

    const loadGroups = async () => {
        setLoading(true);
        try {
            // Get ALL groups in this org
            const { data: allGroups } = await supabase.from('chat_conversations')
                .select('*')
                .eq('organization_id', orgId)
                .eq('type', 'group')
                .order('created_at', { ascending: false });

            // Get user's memberships
            const { data: myParts } = await supabase.from('chat_participants')
                .select('conversation_id').eq('user_id', userId);
            const myConvIds = new Set((myParts || []).map((p: any) => p.conversation_id));

            const enriched = await Promise.all((allGroups || []).map(async (g: any) => {
                const { count } = await supabase.from('chat_participants')
                    .select('id', { count: 'exact', head: true })
                    .eq('conversation_id', g.id);

                const { data: lastMsg } = await supabase.from('chat_messages')
                    .select('content, created_at')
                    .eq('conversation_id', g.id)
                    .order('created_at', { ascending: false })
                    .limit(1).single();

                return {
                    id: g.id,
                    name: g.name || 'Groupe sans nom',
                    created_by: g.created_by,
                    memberCount: count || 0,
                    isMember: myConvIds.has(g.id),
                    lastMessage: lastMsg?.content || null,
                    lastMessageAt: lastMsg?.created_at || g.created_at,
                } as GroupInfo;
            }));

            setGroups(enriched);
        } catch (e) {
            console.error('Error loading groups:', e);
        }
        setLoading(false);
    };

    // Join a group
    const joinGroup = async (groupId: string) => {
        setJoining(groupId);
        try {
            const { error } = await supabase.from('chat_participants').insert({
                conversation_id: groupId, user_id: userId, role: 'member',
            });
            if (error) throw error;

            // Send system message
            await supabase.from('chat_messages').insert({
                conversation_id: groupId, sender_id: userId,
                content: `${userName} a rejoint le groupe`, msg_type: 'system',
            });

            setGroups(prev => prev.map(g => g.id === groupId ? { ...g, isMember: true, memberCount: g.memberCount + 1 } : g));
            toast.success('Vous avez rejoint le groupe ! 🎉');
        } catch (e: any) {
            toast.error(e.message || 'Erreur');
        }
        setJoining(null);
    };

    // Create a new group
    const createGroup = async () => {
        if (!newGroupName.trim()) { toast.error('Nom du groupe requis'); return; }
        setCreating(true);
        try {
            const { data: conv, error } = await supabase.from('chat_conversations').insert({
                organization_id: orgId, type: 'group', name: newGroupName.trim(), created_by: userId,
            }).select().single();
            if (error) throw error;

            const allParts = [userId, ...selectedUsers].map(uid => ({
                conversation_id: conv.id, user_id: uid, role: uid === userId ? 'admin' : 'member',
            }));
            await supabase.from('chat_participants').insert(allParts);
            await supabase.from('chat_messages').insert({
                conversation_id: conv.id, sender_id: userId,
                content: `Groupe "${newGroupName.trim()}" créé`, msg_type: 'system',
            });

            toast.success('Groupe créé ! 🎉');
            setShowCreate(false);
            setNewGroupName('');
            setSelectedUsers([]);
            loadGroups();
        } catch (e: any) {
            toast.error(e.message);
        }
        setCreating(false);
    };

    const filteredGroups = groups.filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()));
    const filteredUsers = allUsers.filter(u => !searchUser || u.name.toLowerCase().includes(searchUser.toLowerCase()));

    const formatTime = (ts: string) => {
        const d = new Date(ts);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        if (diff < 60000) return "à l'instant";
        if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-black bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                        👥 Groupes
                    </h2>
                    <p className="text-[10px] text-slate-500">Rejoignez des groupes de l'école</p>
                </div>
                <Button size="sm" onClick={() => setShowCreate(!showCreate)}
                    className="bg-gradient-to-r from-teal-600 to-emerald-600 text-xs rounded-xl shadow-lg shadow-teal-600/20">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Créer
                </Button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <Input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher un groupe..."
                    className="bg-white/5 border-white/10 text-white h-10 pl-10 rounded-xl text-sm" />
            </div>

            {/* Create Group Form */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-500/5 to-emerald-500/5 border border-teal-500/20 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-teal-300">👥 Nouveau groupe</h3>
                                <button onClick={() => { setShowCreate(false); setSelectedUsers([]); }}><X className="w-4 h-4 text-slate-400" /></button>
                            </div>
                            <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                                placeholder="Nom du groupe..."
                                className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-xs" />

                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                                <Input value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="Ajouter des membres..."
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
                                        setSelectedUsers(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]);
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

                            <Button onClick={createGroup} disabled={creating || !newGroupName.trim()}
                                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-xs rounded-xl shadow-lg shadow-teal-600/20">
                                {creating && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                                Créer le groupe
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Groups List */}
            {loading ? (
                <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-400" /></div>
            ) : filteredGroups.length === 0 ? (
                <div className="text-center py-16">
                    <Users className="w-14 h-14 mx-auto mb-3 text-slate-700" />
                    <p className="text-sm text-slate-500">Aucun groupe trouvé</p>
                    <p className="text-xs text-slate-600 mt-1">Créez le premier groupe de l'école !</p>
                </div>
            ) : filteredGroups.map((group, i) => (
                <motion.div key={group.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all">

                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-600/30 to-emerald-600/30 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-teal-300" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">{group.name}</p>
                            {group.lastMessageAt && (
                                <span className="text-[10px] text-slate-500 shrink-0 ml-2">{formatTime(group.lastMessageAt)}</span>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-500">
                            {group.memberCount} membre{group.memberCount > 1 ? 's' : ''}
                            {group.lastMessage && ` • ${group.lastMessage.slice(0, 40)}${group.lastMessage.length > 40 ? '...' : ''}`}
                        </p>
                    </div>

                    {group.isMember ? (
                        <button onClick={() => onOpenGroupChat?.(group.id, group.name)}
                            className="px-3 py-1.5 rounded-xl bg-teal-600/15 text-teal-400 text-xs font-medium hover:bg-teal-600/25 transition">
                            Ouvrir
                        </button>
                    ) : (
                        <Button size="sm" onClick={() => joinGroup(group.id)} disabled={joining === group.id}
                            className="bg-gradient-to-r from-teal-600 to-emerald-600 text-xs rounded-xl h-8">
                            {joining === group.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Rejoindre'}
                        </Button>
                    )}
                </motion.div>
            ))}
        </div>
    );
}
