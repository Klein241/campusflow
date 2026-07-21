'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CampusBottomNav, type CampusTab } from '@/components/campus/campus-bottom-nav';
import { ActusView } from '@/components/campus/actus-view';
import { FormsView } from '@/components/campus/forms-view';
import { ContactsView } from '@/components/campus/contacts-view';
import { ChatDMView } from '@/components/campus/chat-dm-view';
import { GroupesView } from '@/components/campus/groupes-view';
import { MySpaceView } from '@/components/campus/myspace-view';
import { ProfileView } from '@/components/campus/profile-view';
import { NotificationCenter, NotificationBell } from '@/components/campus/notification-center';
import { SkyPoints } from '@/components/campus/sky-points';
import { SkyPointsStore } from '@/components/campus/sky-points-store';

// ═══════════════════════════════════════════════════════
// CAMPUS PAGE — 5 onglets séparés
// Actus | Contacts | Chat DM/Groupes | My Space | Profil
// + Centre de notifications unifié
// ═══════════════════════════════════════════════════════

interface SessionData {
    id: string;
    first_name: string;
    last_name: string;
    role: 'teacher' | 'student';
    organization_id: string;
    classroom_id?: string;
    logged_in_at: string;
    expires_at: string;
    sky_points?: number;
    avatar_url?: string;
}

function getSession(): SessionData | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem('campusflow_session');
        if (!raw) return null;
        const session = JSON.parse(raw);
        if (!session.logged_in_at || !session.expires_at) return null;
        if (new Date(session.expires_at).getTime() < Date.now()) {
            localStorage.removeItem('campusflow_session');
            return null;
        }
        return session;
    } catch {
        return null;
    }
}

export default function CampusPage() {
    const orgSlug = useOrgSlug();
    const router = useRouter();
    const [org, setOrg] = useState<any>(null);
    const [session, setSession] = useState<SessionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<CampusTab>('actus');

    // DM target from contacts
    const [dmTargetId, setDmTargetId] = useState<string | null>(null);
    const [dmTargetName, setDmTargetName] = useState<string | null>(null);

    // Chat sub-tab: 'dm' | 'groupes'
    const [chatSubTab, setChatSubTab] = useState<'dm' | 'groupes'>('dm');

    // Notification center
    const [notifOpen, setNotifOpen] = useState(false);

    // Sky Points store
    const [storeOpen, setStoreOpen] = useState(false);

    useEffect(() => {
        (async () => {
            const sess = getSession();
            if (!sess) { router.push(`/${orgSlug}/login`); return; }
            const { data: o } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single();
            if (!o) { setLoading(false); return; }
            if (sess.organization_id !== o.id) {
                localStorage.removeItem('campusflow_session');
                router.push(`/${orgSlug}/login`);
                return;
            }
            setOrg(o);
            setSession(sess);
            setLoading(false);
        })();
    }, [orgSlug, router]);

    const handleStartDM = (targetId: string, targetName: string) => {
        setDmTargetId(targetId);
        setDmTargetName(targetName);
        setChatSubTab('dm');
        setActiveTab('chatdm');
    };

    const handleOpenGroupChat = (convId: string, convName: string) => {
        setChatSubTab('groupes');
        setActiveTab('chatdm');
    };

    const handleDiscussContext = (convId: string, convName: string) => {
        setChatSubTab('groupes');
        setActiveTab('chatdm');
    };

    // Navigate from notification center
    const handleNotifNavigate = (tab: string) => {
        setActiveTab(tab as CampusTab);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#0B0E14] to-[#0F1219] flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <GraduationCap className="w-10 h-10 text-teal-400" />
                </motion.div>
            </div>
        );
    }

    if (!org || !session) {
        return (
            <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-white">
                <h1 className="text-xl font-black">Non autorisé</h1>
            </div>
        );
    }

    const userName = `${session.first_name} ${session.last_name}`;

    return (
        <main className="min-h-screen bg-gradient-to-b from-[#0B0E14] to-[#0F1219] text-white pb-28 overflow-y-auto">
            {/* Ambient background blobs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-20%] right-[-20%] w-[50%] h-[50%] bg-teal-600/[0.04] blur-[180px] rounded-full" />
                <div className="absolute bottom-[-20%] left-[-20%] w-[40%] h-[40%] bg-indigo-600/[0.04] blur-[180px] rounded-full" />
                <div className="absolute top-[30%] left-[60%] w-[25%] h-[25%] bg-amber-600/[0.03] blur-[140px] rounded-full" />
            </div>

            <div className="relative z-10 max-w-2xl mx-auto w-full px-4">
                {/* Header with notification bell */}
                <header className="flex items-center justify-between pt-6 pb-4">
                    <div className="flex items-center gap-3">
                        {org.logo_url ? (
                            <img src={org.logo_url} alt={org.name} className="w-10 h-10 rounded-xl object-contain bg-white/10 p-0.5 border border-white/10" />
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center shadow-lg">
                                <GraduationCap className="w-5 h-5 text-white" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-sm font-black truncate max-w-[200px]">{org.name}</h1>
                            <p className="text-[10px] text-slate-400">
                                Bonjour, <span className="text-teal-400 font-medium">{session.first_name}</span> 👋
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {/* Sky Points */}
                        <SkyPoints userId={session.id} orgId={org.id} compact onOpenStore={() => setStoreOpen(true)} />
                        {/* Notification Bell */}
                        <NotificationBell orgId={org.id} userId={session.id} onClick={() => setNotifOpen(true)} />
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${
                            session.role === 'teacher' ? 'bg-indigo-500/15 text-indigo-400' : 'bg-teal-500/15 text-teal-400'
                        }`}>
                            {session.role === 'teacher' ? '👨‍🏫 Prof' : '🎓 Étudiant'}
                        </span>
                    </div>
                </header>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                    {activeTab === 'actus' && (
                        <motion.div key="actus" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                            <ActusView orgId={org.id} orgSlug={orgSlug} userId={session.id} userName={userName} userRole={session.role} />
                        </motion.div>
                    )}

                    {activeTab === 'contacts' && (
                        <motion.div key="contacts" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                            <ContactsView orgId={org.id} orgSlug={orgSlug} userId={session.id} userName={userName} userRole={session.role}
                                onStartDM={handleStartDM} />
                        </motion.div>
                    )}

                    {activeTab === 'chatdm' && (
                        <motion.div key="chatdm" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                            {/* Sub-tab selector: DM / Groupes */}
                            <div className="flex items-center gap-1 mb-4 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                <button
                                    onClick={() => setChatSubTab('dm')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                                        chatSubTab === 'dm'
                                            ? 'bg-gradient-to-r from-cyan-600/20 to-blue-600/20 text-cyan-300 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                    }`}
                                >
                                    💬 Messages DM
                                </button>
                                <button
                                    onClick={() => setChatSubTab('groupes')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                                        chatSubTab === 'groupes'
                                            ? 'bg-gradient-to-r from-teal-600/20 to-emerald-600/20 text-teal-300 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                    }`}
                                >
                                    👥 Groupes
                                </button>
                            </div>

                            {chatSubTab === 'dm' ? (
                                <ChatDMView orgId={org.id} orgSlug={orgSlug} userId={session.id} userName={userName} userRole={session.role}
                                    initialTargetUserId={dmTargetId} initialTargetName={dmTargetName}
                                    onClearTarget={() => { setDmTargetId(null); setDmTargetName(null); }} />
                            ) : (
                                <GroupesView orgId={org.id} orgSlug={orgSlug} userId={session.id} userName={userName} userRole={session.role}
                                    onOpenGroupChat={handleOpenGroupChat} />
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'myspace' && (
                        <motion.div key="myspace" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                            <MySpaceView orgId={org.id} orgSlug={orgSlug} userId={session.id} userName={userName} userRole={session.role}
                                orgName={org.name} orgLogo={org.logo_url} orgPhone={org.phone} orgEmail={org.email}
                                orgCity={org.city} orgCountry={org.country} onStartDM={handleStartDM}
                                onOpenGroupChat={handleOpenGroupChat}
                                orgBulletinTemplate={org.bulletin_template} orgCurrentTerm={org.current_term} />
                        </motion.div>
                    )}

                    {activeTab === 'forms' && (
                        <motion.div key="forms" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                            <FormsView
                                orgId={org.id}
                                orgSlug={orgSlug}
                                userId={session.id}
                                userRole={session.role}
                                userName={userName}
                            />
                        </motion.div>
                    )}

                    {activeTab === 'profile' && (
                        <motion.div key="profile" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                            <ProfileView orgId={org.id} orgSlug={orgSlug} userId={session.id} userName={userName} userRole={session.role} orgName={org.name} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <CampusBottomNav activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Notification Center (slide-out panel) */}
            <NotificationCenter
                orgId={org.id}
                userId={session.id}
                orgSlug={orgSlug}
                isOpen={notifOpen}
                onClose={() => setNotifOpen(false)}
                onNavigate={handleNotifNavigate}
            />

            {/* Sky Points Store */}
            <SkyPointsStore
                isOpen={storeOpen}
                onClose={() => setStoreOpen(false)}
                userId={session.id}
                userName={session.first_name + ' ' + session.last_name}
                orgId={org.id}
                orgSlug={orgSlug}
                currentBalance={session.sky_points ?? 0}
                userRole={session.role as any}
            />
        </main>
    );
}
