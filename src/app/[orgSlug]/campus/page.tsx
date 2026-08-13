'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, BookOpen, X, Clock, AlertTriangle, CheckCircle, FileText, Upload, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { SessionManager, type CampusSession } from '@/lib/session';
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
import { PwaInstall } from '@/components/campus/pwa-install';
import { ExamRoomView } from '@/components/campus/exam-room/exam-room-view';
import { usePushNotifications } from '@/hooks/usePushNotifications';

// ═══════════════════════════════════════════════════════
// CAMPUS PAGE
// Actus | Contacts | Chat | My Space | Shop | Profil
// + FAB : Bibliothèque | Marketplace | Formulaires
// ═══════════════════════════════════════════════════════


export default function CampusPage() {
    const orgSlug = useOrgSlug();
    const router = useRouter();
    const [org, setOrg] = useState<any>(null);
    const [session, setSession] = useState<CampusSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<CampusTab>('actus');
    // Photo URL — synced from session and updated on profile change
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);

    // DM target from contacts
    const [dmTargetId, setDmTargetId] = useState<string | null>(null);
    const [dmTargetName, setDmTargetName] = useState<string | null>(null);

    // Chat sub-tab: 'dm' | 'groupes'
    const [chatSubTab, setChatSubTab] = useState<'dm' | 'groupes'>('dm');

    // Notification center
    const [notifOpen, setNotifOpen] = useState(false);

    // Sky Points store
    const [storeOpen, setStoreOpen] = useState(false);
    const [skyPoints, setSkyPoints] = useState<number>(100);

    // Exam session alert (persistent popup for students)
    const [examAlertSession, setExamAlertSession] = useState<{ id: string; title: string; sessionId: string } | null>(null);

    // Approbation en attente
    const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
    const [adminMessage, setAdminMessage] = useState<string>('');
    const [docFile, setDocFile] = useState<File | null>(null);
    const [studentTextResponse, setStudentTextResponse] = useState<string>('');
    const [userAccessCode, setUserAccessCode] = useState<string>('');
    const [sendingDoc, setSendingDoc] = useState(false);

    // Push notifications — auto-subscribe after login
    const [showPushBanner, setShowPushBanner] = useState(false);
    const pushAutoTriggered = useRef(false);
    const { permission, isSubscribed, isSupported, subscribe } = usePushNotifications({
        userId: session?.profile_id || '',
        userRole: session?.role,
        organizationId: session?.org_id,
        orgSlug,
    });

    useEffect(() => {
        (async () => {
            const sess = SessionManager.get();
            if (!sess) { router.push(`/${orgSlug}/login`); return; }
            const { data: o } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single();
            if (!o) { setLoading(false); return; }
            if (sess.org_id !== o.id) {
                SessionManager.clear();
                router.push(`/${orgSlug}/login`);
                return;
            }
            setOrg(o);
            setSession(sess);
            if (sess.sky_points !== undefined) setSkyPoints(sess.sky_points);
            // Approbation & profil étudiant
            if (sess.role === 'student') {
                // 1. Chercher student_profiles par profile_id ou access_code
                let { data: sprof } = await supabase.from('student_profiles')
                    .select('id, approval_status, access_code, photo_url, sky_points')
                    .eq('id', sess.profile_id)
                    .maybeSingle();

                if (!sprof && sess.access_code) {
                    const { data: spByCode } = await supabase.from('student_profiles')
                        .select('id, approval_status, access_code, photo_url, sky_points')
                        .eq('access_code', sess.access_code)
                        .maybeSingle();
                    if (spByCode) {
                        sprof = spByCode;
                        SessionManager.patch({ profile_id: spByCode.id });
                    }
                }

                let currentStatus: string | null = sprof?.approval_status || null;
                let accessCode = sprof?.access_code || sess.access_code || '';

                // 2. Vérifier aussi dans inscription_requests
                const { data: ir } = await supabase.from('inscription_requests')
                    .select('status, admin_message, access_code')
                    .or(accessCode ? `access_code.eq.${accessCode},id.eq.${sess.profile_id}` : `id.eq.${sess.profile_id}`)
                    .maybeSingle();

                if (ir) {
                    if (!accessCode && ir.access_code) accessCode = ir.access_code;
                    if (ir.status === 'approved') {
                        currentStatus = 'approved';
                        if (sprof && sprof.approval_status !== 'approved') {
                            await supabase.from('student_profiles').update({ approval_status: 'approved' }).eq('id', sprof.id);
                        }
                    } else if (ir.status) {
                        currentStatus = ir.status;
                        if (ir.admin_message) setAdminMessage(ir.admin_message);
                    }
                }

                if (accessCode) setUserAccessCode(accessCode);

                if (currentStatus && currentStatus !== 'approved') {
                    setApprovalStatus(currentStatus);
                } else if (currentStatus === 'approved') {
                    setApprovalStatus(null);
                    SessionManager.patch({ approval_status: 'approved' });
                } else {
                    // Si le profil existe et n'a pas d'approval_status explicite (ex: créés par admin), il est approved par défaut
                    if (sprof && (!ir || !ir.status)) {
                        setApprovalStatus(null);
                        SessionManager.patch({ approval_status: 'approved' });
                    } else {
                        // Étudiant auto-inscrit non trouvé en DB -> verrouiller en pending
                        setApprovalStatus('pending');
                    }
                }

                if (sprof) {
                    if (sprof.photo_url) setPhotoUrl(sprof.photo_url);
                    setSkyPoints(sprof.sky_points ?? 100);
                    try {
                        SessionManager.patch({
                            photo_url:  sprof.photo_url  || sess.photo_url,
                            sky_points: sprof.sky_points ?? sess.sky_points ?? 100,
                        });
                    } catch {}
                }
            } else {
                // Professeur / Admin
                if (sess.photo_url) setPhotoUrl(sess.photo_url);
                const { data: prof } = await supabase.from('teacher_profiles')
                    .select('photo_url, sky_points').eq('id', sess.profile_id).maybeSingle();
                if (prof) {
                    if (prof.photo_url) setPhotoUrl(prof.photo_url);
                    if (prof.sky_points !== undefined) setSkyPoints(prof.sky_points ?? 100);
                    try {
                        SessionManager.patch({
                            photo_url:  prof.photo_url  || sess.photo_url,
                            sky_points: prof.sky_points ?? sess.sky_points ?? 100,
                        });
                    } catch {}
                }
            }
            setLoading(false);
        })();
    }, [orgSlug, router]);

    // ── SUPABASE REALTIME : Écoute instantanée des messages admin pour l'étudiant ──
    useEffect(() => {
        if (!session || session.role !== 'student' || !userAccessCode) return;

        // On filtre directement sur access_code pour ne recevoir que les events de CET étudiant
        const channel = supabase.channel(`realtime_student_approval_${userAccessCode}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'inscription_requests',
                filter: `access_code=eq.${userAccessCode}`,
            }, (payload) => {
                const updatedReq = payload.new as any;
                if (!updatedReq) return;
                if (updatedReq.status === 'approved') {
                    setApprovalStatus(null);
                    SessionManager.patch({ approval_status: 'approved' });
                    toast.success('🎉 Votre inscription a été approuvée ! Bienvenue sur CampusFlow !');
                } else if (updatedReq.status === 'info_needed' || updatedReq.status === 'pending') {
                    setApprovalStatus(updatedReq.status);
                    if (updatedReq.admin_message) {
                        setAdminMessage(updatedReq.admin_message);
                        toast.info(`📋 Message de l'administration : "${updatedReq.admin_message}"`, { duration: 8000 });
                    }
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [session, userAccessCode]);

    // Auto-subscribe push : si permission déjà accordée → subscribe silencieusement
    // Si permission 'default' → montrer le banner après 5s
    useEffect(() => {
        if (!session || !isSupported || isSubscribed || pushAutoTriggered.current) return;
        if (permission === 'denied') return;
        pushAutoTriggered.current = true;

        if (permission === 'granted') {
            // Permission déjà accordée → subscribe silencieusement
            setTimeout(() => subscribe(), 2000);
        } else {
            // Permission pas encore demandée → banner après 5s
            const t = setTimeout(() => setShowPushBanner(true), 5000);
            return () => clearTimeout(t);
        }
    }, [session, isSupported, isSubscribed, permission, subscribe]);

    // Sky Points — listen for deduction events from actus-view
    useEffect(() => {
        const handler = (e: Event) => {
            const ev = e as CustomEvent<{ newBalance: number }>;
            if (typeof ev.detail?.newBalance === 'number') {
                setSkyPoints(ev.detail.newBalance);
            }
        };
        window.addEventListener('sky_points_updated', handler);
        return () => window.removeEventListener('sky_points_updated', handler);
    }, []);

    // Exam session alert — realtime: student gets persistent popup when exam is launched
    useEffect(() => {
        if (!session || !org) return;
        const userId = session.profile_id;
        const isStudent = session.role === 'student';
        if (!isStudent) return;

        const ch = supabase.channel(`exam_alert_${userId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'exam_sessions',
                filter: `org_id=eq.${org.id}`,
            }, async (payload) => {
                const s = payload.new as any;
                if (s.status === 'waiting' || s.status === 'active') {
                    // Check if this student is in participant_ids
                    if (!s.participant_ids || s.participant_ids.includes(userId) || s.participant_ids.length === 0) {
                        // Fetch paper title — correct column name is exam_paper_id
                        const { data: paper } = await supabase
                            .from('exam_papers').select('title').eq('id', s.exam_paper_id).single();
                        setExamAlertSession({
                            id: s.exam_paper_id,
                            title: paper?.title || 'Épreuve',
                            sessionId: s.id,
                        });
                    }
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'exam_sessions',
                filter: `org_id=eq.${org.id}`,
            }, (payload) => {
                const s = payload.new as any;
                if (s.status === 'active' && examAlertSession?.sessionId === s.id) {
                    // Keep alert active
                } else if (s.status === 'ended' || s.status === 'cancelled') {
                    setExamAlertSession(null);
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [session, org]);


    // Called by ProfileView when user changes their photo
    const handlePhotoUpdate = (newUrl: string) => {
        setPhotoUrl(newUrl);
        // Sync dans la session
        try { SessionManager.patch({ photo_url: newUrl }); } catch {}
    };

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
        if (tab === 'shop') { setStoreOpen(true); return; }
        setActiveTab(tab as CampusTab);
    };

    // Navigation handlers
    const handleTabChange = (tab: CampusTab) => {
        if (tab === 'shop') {
            setStoreOpen(true);
            return;
        }
        if (tab === 'marketplace') {
            router.push(`/${orgSlug}/shop`);
            return;
        }
        if (tab === 'library') {
            router.push(`/${orgSlug}/library`);
            return;
        }
        setActiveTab(tab);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#0B0E14] to-[#0F1219] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <img
                        src="/logo-campusflow.png"
                        alt="CampusFlow"
                        className="w-16 h-16 object-contain drop-shadow-[0_0_20px_rgba(20,184,166,0.5)] animate-pulse"
                    />
                    <div className="w-5 h-5 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
                </div>
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

    // ── Modal approbation en attente ──────────────────────────────────────
    const sendDocument = async () => {
        if ((!docFile && !studentTextResponse.trim()) || !session) {
            toast.error('Veuillez joindre un document ou écrire un message de réponse.');
            return;
        }
        setSendingDoc(true);
        try {
            let uploadedUrl: string | null = null;
            if (docFile) {
                const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL || 'https://campusflow-worker.kleintaptue1.workers.dev';
                const fd = new FormData();
                fd.append('file', docFile);
                fd.append('folder', 'inscriptions');
                const up = await fetch(`${workerUrl}/api/r2/upload`, { method: 'POST', body: fd });
                const resData = await up.json();
                uploadedUrl = resData.url || null;
            }

            const updateData: any = {
                status: 'pending', // Repasser en pending pour re-traitement par l'admin
                updated_at: new Date().toISOString(),
            };
            if (uploadedUrl) updateData.document_url = uploadedUrl;
            if (studentTextResponse.trim()) updateData.student_response = studentTextResponse.trim();

            // Mettre à jour inscription_requests par id OU access_code
            await supabase.from('inscription_requests')
                .update(updateData)
                .or(`id.eq.${session.profile_id},access_code.eq.${userAccessCode || ''}`);

            // Synchro status dans student_profiles
            await supabase.from('student_profiles')
                .update({ approval_status: 'pending' })
                .eq('id', session.profile_id);

            setDocFile(null);
            setStudentTextResponse('');
            setApprovalStatus('pending');
            toast.success('✅ Pièce justificative et réponse envoyées ! Votre dossier a été ré-examine par l\'admin.');
        } catch (e: any) {
            toast.error('Erreur lors de l\'envoi : ' + e.message);
        }
        setSendingDoc(false);
    };

    const pendingConfig = {
        pending: {
            icon: <Clock className="w-12 h-12 text-amber-400" />,
            bg: 'from-amber-500/20 to-orange-600/10',
            border: 'border-amber-500/30',
            title: 'Dossier en cours de traitement',
            subtitle: 'L\'administration examine votre demande d\'inscription. Vous serez notifié dès qu\'une décision sera prise.',
            color: 'text-amber-400',
        },
        rejected: {
            icon: <AlertTriangle className="w-12 h-12 text-red-400" />,
            bg: 'from-red-500/20 to-rose-600/10',
            border: 'border-red-500/30',
            title: 'Inscription non acceptée',
            subtitle: 'Votre demande d\'inscription n\'a pas été acceptée. Contactez l\'administration pour plus d\'informations.',
            color: 'text-red-400',
        },
        info_needed: {
            icon: <FileText className="w-12 h-12 text-blue-400" />,
            bg: 'from-blue-500/20 to-indigo-600/10',
            border: 'border-blue-500/30',
            title: 'Informations complémentaires requises',
            subtitle: 'L\'administration vous demande des informations ou documents supplémentaires.',
            color: 'text-blue-400',
        },
    };

    if (approvalStatus && approvalStatus !== 'approved') {
        const cfg = pendingConfig[approvalStatus as keyof typeof pendingConfig] || pendingConfig.pending;
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#0B0E14] to-[#0F1219] text-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
                {/* Background blobs */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-600/5 blur-[120px] rounded-full" />
                    <div className="absolute bottom-[-20%] left-[-20%] w-[50%] h-[50%] bg-teal-600/5 blur-[120px] rounded-full" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="relative z-10 w-full max-w-sm"
                >
                    {/* Card */}
                    <div className={`rounded-3xl bg-gradient-to-b ${cfg.bg} border ${cfg.border} backdrop-blur-xl p-8 shadow-2xl`}>
                        {/* Icon */}
                        <div className="flex justify-center mb-6">
                            <motion.div
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className={`w-24 h-24 rounded-full bg-gradient-to-br ${cfg.bg} border ${cfg.border} flex items-center justify-center`}
                            >
                                {cfg.icon}
                            </motion.div>
                        </div>

                        {/* Title */}
                        <h1 className={`text-xl font-black text-center mb-2 ${cfg.color}`}>{cfg.title}</h1>
                        <p className="text-sm text-slate-400 text-center leading-relaxed mb-6">{cfg.subtitle}</p>

                        {/* Admin message */}
                        {adminMessage && (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5">
                                <p className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Message de l'administration</p>
                                <p className="text-sm text-white font-medium">{adminMessage}</p>
                            </div>
                        )}

                        {/* Infos étudiant */}
                        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 mb-5 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Nom</span>
                                <span className="font-semibold">{session.first_name} {session.last_name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Établissement</span>
                                <span className="font-semibold">{org?.name || orgSlug}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Statut</span>
                                <span className={`font-bold ${cfg.color}`}>
                                    {approvalStatus === 'pending' ? '⏳ En attente' : approvalStatus === 'rejected' ? '❌ Refusé' : '📋 Infos requises'}
                                </span>
                            </div>
                        </div>

                        {/* Zone réponse & document si info_needed */}
                        {approvalStatus === 'info_needed' && (
                            <div className="space-y-4 mb-5 pt-3 border-t border-white/10">
                                <div>
                                    <label className="block text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1">
                                        💬 Votre message de réponse / correction :
                                    </label>
                                    <textarea
                                        value={studentTextResponse}
                                        onChange={e => setStudentTextResponse(e.target.value)}
                                        placeholder="Ex: J'ai corrigé mon âge (15/03/2004) et joint mon acte de naissance en pièce..."
                                        rows={3}
                                        className="w-full bg-black/40 border border-white/15 rounded-xl p-3 text-xs text-white resize-none focus:border-blue-400 outline-none"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 text-xs text-blue-300 font-semibold uppercase tracking-wider mb-2">
                                        <Upload className="w-3.5 h-3.5" /> Joindre une pièce justificative (CNI, Permis, Acte) :
                                    </div>
                                    <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={e => setDocFile(e.target.files?.[0] || null)}
                                        className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-blue-600/30 file:text-blue-200 file:font-semibold hover:file:bg-blue-600/40 cursor-pointer" />
                                    {docFile && <p className="text-xs text-blue-400 mt-1 truncate">📎 {docFile.name}</p>}
                                </div>

                                <button onClick={sendDocument} disabled={(!docFile && !studentTextResponse.trim()) || sendingDoc}
                                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-sm font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/25">
                                    {sendingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    {sendingDoc ? 'Transmission en cours...' : 'Envoyer ma réponse à l\'administration'}
                                </button>
                            </div>
                        )}

                        {/* Logout */}
                        <button
                            onClick={() => { SessionManager.clear(); router.push(`/${orgSlug}/login`); }}
                            className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-slate-400 transition-all"
                        >
                            Se déconnecter
                        </button>
                    </div>

                    {/* Note de bas */}
                    <p className="text-center text-xs text-slate-500 mt-6">
                        Revenir plus tard · L'administration traitera votre dossier dans les meilleurs délais
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-[#0B0E14] to-[#0F1219] text-white pb-28 overflow-y-auto">
            {/* Ambient background blobs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-20%] right-[-20%] w-[50%] h-[50%] bg-teal-600/[0.04] blur-[180px] rounded-full" />
                <div className="absolute bottom-[-20%] left-[-20%] w-[40%] h-[40%] bg-indigo-600/[0.04] blur-[180px] rounded-full" />
                <div className="absolute top-[30%] left-[60%] w-[25%] h-[25%] bg-amber-600/[0.03] blur-[140px] rounded-full" />
            </div>

            <div className="relative z-10 max-w-2xl mx-auto w-full px-4">

            {/* ── Exam Alert Popup (persistent) ───────────────────── */}
            <AnimatePresence>
                {examAlertSession && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
                    >
                        <motion.div
                            animate={{ y: [0, -6, 0] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="w-full max-w-sm bg-gradient-to-b from-violet-900/90 to-purple-950/90 border border-violet-500/40 rounded-3xl p-7 shadow-2xl shadow-violet-900/50 text-center"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center mx-auto mb-4">
                                <BookOpen className="w-8 h-8 text-violet-300" />
                            </div>
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                                </span>
                                <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Épreuve en cours</span>
                            </div>
                            <h2 className="text-xl font-black text-white mb-1">{examAlertSession.title}</h2>
                            <p className="text-slate-400 text-sm mb-6">Votre professeur a lancé une épreuve. Rejoignez la salle maintenant.</p>
                            <button
                                onClick={() => {
                                    setExamAlertSession(null);
                                    setActiveTab('exam_room');
                                }}
                                className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 rounded-2xl text-white font-bold text-base transition-all shadow-lg shadow-violet-900/40"
                            >
                                🏛️ Rejoindre la salle
                            </button>
                            <button
                                onClick={() => setExamAlertSession(null)}
                                className="mt-3 text-xs text-slate-500 hover:text-slate-400 transition-colors"
                            >
                                Ignorer (non recommandé)
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

                {/* Header with notification bell */}
                <header className="flex items-center justify-between pt-6 pb-4">
                    <div className="flex items-center gap-3">
                        {org.logo_url ? (
                            <img src={org.logo_url} alt={org.name} className="w-10 h-10 rounded-xl object-contain bg-white/10 p-0.5 border border-white/10" />
                        ) : (
                            <img
                                src="/logo-campusflow.png"
                                alt="CampusFlow"
                                className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(20,184,166,0.4)]"
                            />
                        )}
                        <div className="flex items-center gap-2.5">
                            {/* Avatar utilisateur dans le header */}
                            <button onClick={() => setActiveTab('profile')} className="shrink-0">
                                {photoUrl ? (
                                    <img src={photoUrl} alt="Mon profil"
                                        className="w-9 h-9 rounded-full object-cover border-2 border-teal-400/40 shadow-md hover:border-teal-400 transition-all"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500/30 to-indigo-500/30 border-2 border-white/10 flex items-center justify-center">
                                        <span className="text-xs font-black text-white">{session.first_name?.[0]}{session.last_name?.[0]}</span>
                                    </div>
                                )}
                            </button>
                            <div>
                                <h1 className="text-sm font-black truncate max-w-[160px]">{org.name}</h1>
                                <p className="text-[10px] text-slate-400">
                                    Bonjour, <span className="text-teal-400 font-medium">{session.first_name}</span> 👋
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {/* PWA Install — compact */}
                        <PwaInstall orgSlug={orgSlug} orgName={org.name} orgLogo={org.logo_url} compact />
                        {/* Sky Points */}
                        <SkyPoints userId={session.profile_id} userRole={session.role} orgId={org.id} compact onOpenStore={() => setStoreOpen(true)} />

                        {/* Notification Bell */}
                        <NotificationBell orgId={org.id} userId={session.profile_id} onClick={() => setNotifOpen(true)} />
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
                            <ActusView orgId={org.id} orgSlug={orgSlug} userId={session.profile_id} userName={userName} userRole={session.role}
                                onSkyUpdate={(delta) => setSkyPoints((p: number) => p + delta)} />
                        </motion.div>
                    )}

                    {activeTab === 'contacts' && (
                        <motion.div key="contacts" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                            <ContactsView orgId={org.id} orgSlug={orgSlug} userId={session.profile_id} userName={userName} userRole={session.role}
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
                                <ChatDMView orgId={org.id} orgSlug={orgSlug} userId={session.profile_id} userName={userName} userRole={session.role}
                                    initialTargetUserId={dmTargetId} initialTargetName={dmTargetName}
                                    onClearTarget={() => { setDmTargetId(null); setDmTargetName(null); }} />
                            ) : (
                                <GroupesView orgId={org.id} orgSlug={orgSlug} userId={session.profile_id} userName={userName} userRole={session.role}
                                    onOpenGroupChat={handleOpenGroupChat} />
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'myspace' && (
                        <motion.div key="myspace" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                            <MySpaceView orgId={org.id} orgSlug={orgSlug} userId={session.profile_id} userName={userName} userRole={session.role}
                                orgName={org.name} orgLogo={org.logo_url} orgPhone={org.phone} orgEmail={org.email}
                                orgCity={org.city} orgCountry={org.country} onStartDM={handleStartDM}
                                onOpenGroupChat={handleOpenGroupChat} userPhotoUrl={photoUrl}
                                orgBulletinTemplate={org.bulletin_template} orgCurrentTerm={org.current_term} />
                        </motion.div>
                    )}

                    {activeTab === 'forms' && (
                        <motion.div key="forms" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                            <FormsView
                                orgId={org.id}
                                orgSlug={orgSlug}
                                userId={session.profile_id}
                                userRole={session.role as 'teacher' | 'student'}
                                userName={userName}
                            />
                        </motion.div>
                    )}



                    {activeTab === 'profile' && (
                        <motion.div key="profile" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                            <ProfileView orgId={org.id} orgSlug={orgSlug} userId={session.profile_id} userName={userName} userRole={session.role} orgName={org.name} orgLogo={org.logo_url} userSkyPoints={skyPoints} onPhotoUpdate={handlePhotoUpdate} />
                        </motion.div>
                    )}

                    {activeTab === 'exam_room' && (
                        <ExamRoomView
                            orgId={org.id}
                            orgSlug={orgSlug}
                            userId={session.profile_id}
                            userName={userName}
                            userRole={session.role}
                        />
                    )}

                </AnimatePresence>
            </div>

            <CampusBottomNav
                activeTab={activeTab}
                onTabChange={handleTabChange}
                userPhotoUrl={photoUrl}
                userRole={session.role}
            />

            {/* Notification Center (slide-out panel) */}
            <NotificationCenter
                orgId={org.id}
                userId={session.profile_id}
                orgSlug={orgSlug}
                isOpen={notifOpen}
                onClose={() => setNotifOpen(false)}
                onNavigate={handleNotifNavigate}
            />

            {/* Sky Points Store */}
            <SkyPointsStore
                isOpen={storeOpen}
                onClose={() => setStoreOpen(false)}
                userId={session.profile_id}
                userName={session.first_name + ' ' + session.last_name}
                orgId={org.id}
                orgSlug={orgSlug}
                currentBalance={skyPoints}
                userRole={session.role as any}
                onBalanceUpdate={setSkyPoints}
            />

            {/* Push Notification Banner — s'affiche si permission pas encore accordée */}
            {showPushBanner && !isSubscribed && permission !== 'denied' && (
                <div className="fixed bottom-20 left-4 right-4 z-50 bg-slate-800/95 backdrop-blur-md border border-amber-500/30 rounded-2xl p-4 shadow-xl shadow-black/40 animate-fade-in">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                            <span className="text-xl">🔔</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">Activer les notifications</p>
                            <p className="text-xs text-slate-400 mt-0.5">Reçois les alertes même quand l'appli est fermée</p>
                        </div>
                        <button
                            onClick={() => setShowPushBanner(false)}
                            className="text-slate-500 hover:text-slate-300 shrink-0 p-1"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={async () => {
                                setShowPushBanner(false);
                                await subscribe();
                            }}
                            className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition"
                        >
                            Activer
                        </button>
                        <button
                            onClick={() => setShowPushBanner(false)}
                            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition"
                        >
                            Plus tard
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}

