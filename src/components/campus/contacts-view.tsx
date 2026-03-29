'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search, Users, MessageSquare, User, Loader2, ShieldCheck,
    GraduationCap, BookOpen
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════
// CONTACTS VIEW — Répertoire complet de l'école
// Tous les élèves, profs et administration
// Avec bouton DM et profil
// ═══════════════════════════════════════════════════════

interface ContactsViewProps {
    orgId: string;
    orgSlug: string;
    userId: string;
    userName: string;
    userRole: string;
    onStartDM: (targetUserId: string, targetName: string) => void;
    onViewProfile?: (targetUserId: string, targetRole: string) => void;
}

interface ContactUser {
    id: string;
    name: string;
    role: 'teacher' | 'student' | 'admin';
    roleLabel: string;
    initials: string;
    speciality?: string;
    classroom?: string;
    matricule?: string;
    phone?: string;
    avatarUrl?: string;
}

type FilterType = 'all' | 'teachers' | 'students' | 'admin';

export function ContactsView({ orgId, orgSlug, userId, userName, userRole, onStartDM, onViewProfile }: ContactsViewProps) {
    const [contacts, setContacts] = useState<ContactUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<FilterType>('all');
    const [selectedProfile, setSelectedProfile] = useState<ContactUser | null>(null);

    useEffect(() => {
        loadContacts();
    }, [orgId]);

    const loadContacts = async () => {
        setLoading(true);
        try {
            // Load org for admin info
            const { data: orgData } = await supabase.from('organizations').select('owner_id, owner_first_name, owner_last_name').eq('id', orgId).single();

            // Load teachers
            const { data: teachers } = await supabase.from('teacher_profiles')
                .select('id, first_name, last_name, speciality, phone, photo_url')
                .eq('organization_id', orgId).eq('is_active', true);

            // Load students with classroom
            const { data: students } = await supabase.from('student_profiles')
                .select('id, first_name, last_name, matricule, phone, photo_url, classroom_id')
                .eq('organization_id', orgId).eq('is_active', true);

            // Load classrooms for mapping
            const { data: classrooms } = await supabase.from('classrooms')
                .select('id, name').eq('organization_id', orgId);
            const clsMap = new Map((classrooms || []).map((c: any) => [c.id, c.name]));

            const allContacts: ContactUser[] = [];

            // Admin
            if (orgData?.owner_id) {
                allContacts.push({
                    id: orgData.owner_id,
                    name: orgData.owner_first_name && orgData.owner_last_name
                        ? `${orgData.owner_first_name} ${orgData.owner_last_name}`
                        : 'Administration',
                    role: 'admin',
                    roleLabel: '🏫 Administration',
                    initials: orgData.owner_first_name?.[0]?.toUpperCase() + (orgData.owner_last_name?.[0]?.toUpperCase() || ''),
                });
            }

            // Teachers
            (teachers || []).forEach((t: any) => {
                allContacts.push({
                    id: t.id,
                    name: `${t.first_name} ${t.last_name}`,
                    role: 'teacher',
                    roleLabel: '👨‍🏫 Professeur',
                    initials: `${t.first_name?.[0] || ''}${t.last_name?.[0] || ''}`,
                    speciality: t.speciality,
                    phone: t.phone,
                    avatarUrl: t.photo_url || undefined,
                });
            });

            // Students
            (students || []).forEach((s: any) => {
                allContacts.push({
                    id: s.id,
                    name: `${s.first_name} ${s.last_name}`,
                    role: 'student',
                    roleLabel: '🎓 Étudiant',
                    initials: `${s.first_name?.[0] || ''}${s.last_name?.[0] || ''}`,
                    classroom: clsMap.get(s.classroom_id) || undefined,
                    matricule: s.matricule,
                    phone: s.phone,
                    avatarUrl: s.photo_url || undefined,
                });
            });

            // Remove self
            setContacts(allContacts.filter(c => c.id !== userId));
        } catch (e) {
            console.error('Error loading contacts:', e);
        }
        setLoading(false);
    };

    const filtered = contacts.filter(c => {
        const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.speciality?.toLowerCase().includes(search.toLowerCase()) ||
            c.classroom?.toLowerCase().includes(search.toLowerCase()) ||
            c.matricule?.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'all' ||
            (filter === 'teachers' && c.role === 'teacher') ||
            (filter === 'students' && c.role === 'student') ||
            (filter === 'admin' && c.role === 'admin');
        return matchSearch && matchFilter;
    });

    const counts = {
        all: contacts.length,
        teachers: contacts.filter(c => c.role === 'teacher').length,
        students: contacts.filter(c => c.role === 'student').length,
        admin: contacts.filter(c => c.role === 'admin').length,
    };

    // ═══ PROFILE DETAIL VIEW ═══
    if (selectedProfile) {
        return (
            <div className="space-y-4">
                <button onClick={() => setSelectedProfile(null)}
                    className="text-sm text-slate-400 hover:text-white transition flex items-center gap-1">
                    ← Retour aux contacts
                </button>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center">
                    {selectedProfile.avatarUrl ? (
                        <img src={selectedProfile.avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover mx-auto border-4 border-white/10 shadow-xl mb-4" />
                    ) : (
                        <div className={cn(
                            "w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black mx-auto mb-4",
                            selectedProfile.role === 'admin' ? 'bg-gradient-to-br from-yellow-500 to-amber-600 text-white' :
                            selectedProfile.role === 'teacher' ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white' :
                            'bg-gradient-to-br from-teal-600 to-emerald-600 text-white'
                        )}>
                            {selectedProfile.initials}
                        </div>
                    )}
                    <h3 className="text-xl font-black">{selectedProfile.name}</h3>
                    <span className={cn("inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full mt-2",
                        selectedProfile.role === 'admin' ? 'bg-yellow-500/15 text-yellow-300' :
                        selectedProfile.role === 'teacher' ? 'bg-indigo-500/15 text-indigo-400' :
                        'bg-teal-500/15 text-teal-400'
                    )}>
                        {selectedProfile.role === 'admin' && <ShieldCheck className="w-3 h-3" />}
                        {selectedProfile.roleLabel}
                    </span>

                    <div className="mt-4 space-y-2 text-sm text-left">
                        {selectedProfile.speciality && (
                            <div className="flex justify-between px-3 py-2 rounded-xl bg-white/5">
                                <span className="text-slate-400">Spécialité</span>
                                <span>{selectedProfile.speciality}</span>
                            </div>
                        )}
                        {selectedProfile.classroom && (
                            <div className="flex justify-between px-3 py-2 rounded-xl bg-white/5">
                                <span className="text-slate-400">Classe</span>
                                <span>{selectedProfile.classroom}</span>
                            </div>
                        )}
                        {selectedProfile.matricule && (
                            <div className="flex justify-between px-3 py-2 rounded-xl bg-white/5">
                                <span className="text-slate-400">Matricule</span>
                                <span className="font-mono">{selectedProfile.matricule}</span>
                            </div>
                        )}
                        {selectedProfile.phone && (
                            <div className="flex justify-between px-3 py-2 rounded-xl bg-white/5">
                                <span className="text-slate-400">Téléphone</span>
                                <span>{selectedProfile.phone}</span>
                            </div>
                        )}
                    </div>

                    <Button onClick={() => { onStartDM(selectedProfile.id, selectedProfile.name); setSelectedProfile(null); }}
                        className="w-full mt-5 bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl shadow-lg shadow-teal-600/20">
                        <MessageSquare className="w-4 h-4 mr-2" /> Envoyer un message
                    </Button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h2 className="text-lg font-black bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                    👥 Contacts
                </h2>
                <p className="text-[10px] text-slate-500">Retrouvez tout le monde dans l'école</p>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <Input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher par nom, matricule, classe..."
                    className="bg-white/5 border-white/10 text-white h-10 pl-10 rounded-xl text-sm" />
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/5 overflow-x-auto scrollbar-thin">
                {([
                    { id: 'all' as FilterType, label: 'Tous', icon: Users, count: counts.all },
                    { id: 'teachers' as FilterType, label: 'Profs', icon: BookOpen, count: counts.teachers },
                    { id: 'students' as FilterType, label: 'Élèves', icon: GraduationCap, count: counts.students },
                    { id: 'admin' as FilterType, label: 'Admin', icon: ShieldCheck, count: counts.admin },
                ]).map(tab => (
                    <button key={tab.id} onClick={() => setFilter(tab.id)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap px-2",
                            filter === tab.id
                                ? 'bg-gradient-to-r from-indigo-600/20 to-violet-600/20 text-indigo-300 border border-indigo-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        )}>
                        <tab.icon className="w-3 h-3" />
                        {tab.label}
                        <span className="text-[9px] text-slate-500">({tab.count})</span>
                    </button>
                ))}
            </div>

            {/* Contact List */}
            {loading ? (
                <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-400" /></div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                    <Users className="w-14 h-14 mx-auto mb-3 text-slate-700" />
                    <p className="text-sm text-slate-500">Aucun contact trouvé</p>
                </div>
            ) : filtered.map((contact, i) => (
                <motion.div key={contact.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all group">
                    {/* Avatar */}
                    {contact.avatarUrl ? (
                        <img src={contact.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover shrink-0 border border-white/10" />
                    ) : (
                        <div className={cn(
                            "w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0",
                            contact.role === 'admin' ? 'bg-gradient-to-br from-yellow-500 to-amber-600' :
                            contact.role === 'teacher' ? 'bg-gradient-to-br from-indigo-600 to-violet-600' :
                            'bg-gradient-to-br from-teal-600 to-emerald-600'
                        )}>
                            {contact.initials}
                        </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0" onClick={() => setSelectedProfile(contact)} role="button">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{contact.name}</span>
                            {contact.role === 'admin' && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">
                                    <ShieldCheck className="w-2.5 h-2.5" /> Admin
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">
                            {contact.roleLabel}
                            {contact.speciality && ` • ${contact.speciality}`}
                            {contact.classroom && ` • ${contact.classroom}`}
                            {contact.matricule && ` • ${contact.matricule}`}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => setSelectedProfile(contact)}
                            className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition">
                            <User className="w-4 h-4" />
                        </button>
                        <button onClick={() => onStartDM(contact.id, contact.name)}
                            className="p-2 rounded-xl bg-gradient-to-r from-teal-600/20 to-emerald-600/20 text-teal-400 hover:text-teal-300 transition">
                            <MessageSquare className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
