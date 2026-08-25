'use client';

import { useState, useEffect, useRef, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, Send, Trash2, Mic, MicOff, Volume2, VolumeX,
    Paperclip, ArrowLeft, Download, ExternalLink, RefreshCw,
    Brain, ChevronDown, ChevronUp, Check, Copy, Share2,
    Calendar, BookOpen, User, GraduationCap, Shield, Crown,
    Folder, Plus, Search, HelpCircle, Layers, Award,
    CheckCircle2, Clock, Smartphone, Zap, Settings, BarChart2,
    FileText, MessageSquare, AlertCircle, X, ChevronRight
} from 'lucide-react';
import { useSkyAgent, type SkyAgentRole, type SkyMessage, type SkyAttachment } from '@/hooks/use-sky-agent';
import { supabase } from '@/lib/supabase';
import { uploadToR2 } from '@/lib/r2';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useOrgSlug } from '@/hooks/use-org-slug';
import Link from 'next/link';

export default function AgentDedicatedPage() {
    const orgSlug = useOrgSlug();

    // État Organisation & Utilisateur
    const [org, setOrg] = useState<{ id: string; name: string; slug: string; logo_url?: string } | null>(null);
    const [userProfile, setUserProfile] = useState<{ id: string; full_name: string; email: string; role: SkyAgentRole } | null>(null);
    const [role, setRole] = useState<SkyAgentRole>('admin');

    // UI & Navigation
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeProject, setActiveProject] = useState<string | null>(null);
    const [inputText, setInputText] = useState('');
    const [attachments, setAttachments] = useState<SkyAttachment[]>([]);
    const [uploading, setUploading] = useState(false);

    // Audio & PWA
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [ttsVoiceEnabled, setTtsVoiceEnabled] = useState(true);
    const [pwaPrompt, setPwaPrompt] = useState<any>(null);
    const [isPwaInstalled, setIsPwaInstalled] = useState(false);

    // Accordéons de thinking ouverts
    const [openThinkingMap, setOpenThinkingMap] = useState<Record<string, boolean>>({});

    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);

    // Hook Principal Dame SKY
    const {
        messages,
        isLoading,
        error,
        externalAgentActive,
        persona,
        isChatActive,
        isRoleAllowed,
        sendMessage,
        clearSession,
    } = useSkyAgent(role, {
        org_id: org?.id,
        org_name: org?.name,
        org_slug: orgSlug,
        user_id: userProfile?.id,
        user_name: userProfile?.full_name,
        user_email: userProfile?.email,
        current_page: `/${orgSlug}/agent`,
    });

    // 1. Charger l'organisation et l'utilisateur
    useEffect(() => {
        async function loadOrgAndUser() {
            try {
                // Charger l'organisation
                if (orgSlug && orgSlug !== '_') {
                    const { data: orgData } = await supabase
                        .from('organizations')
                        .select('id, name, slug, logo_url')
                        .eq('slug', orgSlug)
                        .maybeSingle();
                    if (orgData) setOrg(orgData);
                }

                // Charger le profil connecté
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: prof } = await supabase
                        .from('profiles')
                        .select('id, full_name, email, role')
                        .eq('id', user.id)
                        .maybeSingle();

                    if (prof) {
                        const userRole = (prof.role === 'director' || prof.role === 'superadmin')
                            ? 'admin'
                            : (prof.role === 'teacher' ? 'prof' : 'student');
                        setUserProfile({
                            id: prof.id,
                            full_name: prof.full_name || 'Utilisateur',
                            email: prof.email || user.email || '',
                            role: userRole,
                        });
                        setRole(userRole);
                    }
                }
            } catch (err) {
                console.warn('[AgentPage] Error loading init data:', err);
            }
        }
        loadOrgAndUser();
    }, [orgSlug]);

    // 2. Gestion de l'installation PWA
    useEffect(() => {
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setPwaPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsPwaInstalled(true);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    // 3. Scroll automatique vers le bas
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // 4. Reconnaissance Vocale (Web Speech API)
    useEffect(() => {
        if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const rec = new SpeechRecognition();
            rec.continuous = false;
            rec.interimResults = false;
            rec.lang = 'fr-FR';

            rec.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                if (transcript) {
                    setInputText(prev => (prev ? `${prev} ${transcript}` : transcript));
                }
                setIsListening(false);
            };

            rec.onerror = () => setIsListening(false);
            rec.onend = () => setIsListening(false);
            recognitionRef.current = rec;
        }
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            toast.error('Reconnaissance vocale non supportée sur ce navigateur');
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.start();
            setIsListening(true);
            toast.info('🎙️ Parlez maintenant...');
        }
    };

    // 5. Synthèse Vocale (TTS)
    const speakText = (text: string) => {
        if (!('speechSynthesis' in window) || !ttsVoiceEnabled) return;
        window.speechSynthesis.cancel();
        if (isSpeaking) {
            setIsSpeaking(false);
            return;
        }
        const cleanText = text.replace(/[*#_`>]/g, '').slice(0, 500);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'fr-FR';
        utterance.rate = 1.05;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    };

    // 6. Installation PWA
    const handleInstallPwa = async () => {
        if (pwaPrompt) {
            pwaPrompt.prompt();
            const { outcome } = await pwaPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsPwaInstalled(true);
                toast.success('🎉 Application Dame SKY installée avec succès !');
            }
            setPwaPrompt(null);
        } else {
            toast.info('Sur mobile : Menu Partager > "Sur l\'écran d\'accueil" pour installer.', { duration: 5000 });
        }
    };

    // 7. Envoi de Message
    const handleSend = async () => {
        if ((!inputText.trim() && attachments.length === 0) || isLoading) return;
        const text = inputText;
        const atts = [...attachments];
        setInputText('');
        setAttachments([]);
        await sendMessage(text, atts);
    };

    // 8. Upload de fichiers vers R2
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setUploading(true);
        const toastId = toast.loading('Téléversement du fichier...');

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const res = await uploadToR2(file, 'sky-agent-attachments');
                if (res && res.url) {
                    setAttachments(prev => [...prev, {
                        name: file.name,
                        url: res.url!,
                        type: file.type,
                        size: file.size,
                    }]);
                }
            }
            toast.success('Fichier joint avec succès', { id: toastId });
        } catch (err: any) {
            toast.error('Erreur upload : ' + (err?.message || ''), { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    const toggleThinking = (msgId: string) => {
        setOpenThinkingMap(prev => ({ ...prev, [msgId]: !prev[msgId] }));
    };

    // Prompts d'actions rapides Backoffice
    const QUICK_PROMPTS = [
        { label: '📊 Présences du jour', prompt: 'Fais-moi un rapport complet des présences et absences de toutes les classes aujourd\'hui.', icon: '👥' },
        { label: '⏰ Créer un cours', prompt: 'Ajoute un créneau d\'emploi du temps pour lundi de 08:00 à 10:00 dans la classe de 3ème.', icon: '🗓️' },
        { label: '📕 Compiler un livre', prompt: 'Compile l\'ensemble des chapitres et exercices de la matière principale en un livre pour la bibliothèque.', icon: '📚' },
        { label: '✍️ Devoir avec corrigé', prompt: 'Génère un devoir type de 5 questions à choix multiples avec barème et corrigé détaillé.', icon: '📝' },
        { label: '💰 Bilan Inscriptions', prompt: 'Donne-moi le bilan des inscriptions validées et des paiements récents de l\'école.', icon: '💳' },
    ];

    if (!isChatActive) {
        return (
            <div className="min-h-screen bg-[#07090e] text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
                    <Shield className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-black mb-2">Dame SKY est momentanément désactivée</h1>
                <p className="text-slate-400 text-sm max-w-md mb-6">
                    L'administrateur a suspendu l'accès à l'assistant IA. Revenez un peu plus tard ou contactez la direction.
                </p>
                <Link href={`/${orgSlug}`} className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-semibold transition-all">
                    Retour à l'accueil
                </Link>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen overflow-hidden bg-[#07090e] text-slate-100 flex font-sans antialiased">
            {/* ═════════════════════════════════════════════════════════════════════
                BARRE LATÉRALE / SIDEBAR (Projets, Historique & Outils)
               ═════════════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.aside
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 300, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="h-full bg-[#0b0e17] border-r border-white/10 flex flex-col shrink-0 z-30 overflow-hidden"
                    >
                        {/* En-tête Sidebar : Logo Établissement */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 via-rose-500 to-indigo-600 border border-amber-300/40 flex items-center justify-center text-white shadow-lg shrink-0">
                                    <Crown className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-sm font-black text-white truncate">{org?.name || 'IziTeach Campus'}</h2>
                                    <p className="text-[11px] text-amber-400 font-medium">Dame SKY Studio IA</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all md:flex hidden"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Bouton Nouvelle Session */}
                        <div className="p-3">
                            <button
                                onClick={clearSession}
                                className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/30 hover:border-amber-400/50 text-amber-200 text-xs font-bold flex items-center justify-between transition-all group shadow-md"
                            >
                                <span className="flex items-center gap-2">
                                    <Plus className="w-4 h-4 text-amber-400 group-hover:rotate-90 transition-transform" />
                                    Nouvelle Discussion
                                </span>
                                <span className="text-[10px] bg-amber-500/30 px-1.5 py-0.5 rounded text-amber-300">Clean</span>
                            </button>
                        </div>

                        {/* Sélecteur de Rôle (pour tester en mode Admin, Prof ou Étudiant) */}
                        <div className="px-3 pb-2">
                            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-1 mb-1 block">
                                Mode & Rôle Actif
                            </label>
                            <div className="grid grid-cols-3 gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5 text-xs">
                                <button
                                    onClick={() => setRole('admin')}
                                    className={cn('py-1.5 rounded-lg font-semibold text-center transition-all', role === 'admin' ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white')}
                                >
                                    🏛️ Admin
                                </button>
                                <button
                                    onClick={() => setRole('prof')}
                                    className={cn('py-1.5 rounded-lg font-semibold text-center transition-all', role === 'prof' ? 'bg-teal-500/30 text-teal-300 border border-teal-500/40' : 'text-slate-400 hover:text-white')}
                                >
                                    🎓 Prof
                                </button>
                                <button
                                    onClick={() => setRole('student')}
                                    className={cn('py-1.5 rounded-lg font-semibold text-center transition-all', role === 'student' ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/40' : 'text-slate-400 hover:text-white')}
                                >
                                    🎒 Élève
                                </button>
                            </div>
                        </div>

                        {/* Projets & Hub Thématique */}
                        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 custom-scrollbar">
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-1 mb-2">
                                    Dossiers de Gouvernance
                                </p>
                                <div className="space-y-1">
                                    {[
                                        { id: 'gov', name: 'Gouvernance & Décisions', icon: Crown, color: 'text-amber-400' },
                                        { id: 'pedagogy', name: 'Pédagogie & Cours', icon: BookOpen, color: 'text-teal-400' },
                                        { id: 'schedule', name: 'Emploi du Temps & Salles', icon: Calendar, color: 'text-indigo-400' },
                                        { id: 'exams', name: 'Examens & Évaluations', icon: Award, color: 'text-rose-400' },
                                        { id: 'finance', name: 'Inscriptions & Finances', icon: BarChart2, color: 'text-emerald-400' },
                                    ].map(proj => (
                                        <button
                                            key={proj.id}
                                            onClick={() => setActiveProject(proj.id === activeProject ? null : proj.id)}
                                            className={cn(
                                                'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left',
                                                activeProject === proj.id
                                                    ? 'bg-white/10 text-white border border-white/10 shadow-sm'
                                                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                                            )}
                                        >
                                            <proj.icon className={cn('w-4 h-4 shrink-0', proj.color)} />
                                            <span className="truncate">{proj.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Pied de Sidebar : Installation PWA & Retour Backoffice */}
                        <div className="p-3 border-t border-white/10 bg-[#090b12] space-y-2">
                            {/* Bouton PWA */}
                            {!isPwaInstalled && (
                                <button
                                    onClick={handleInstallPwa}
                                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
                                >
                                    <Smartphone className="w-3.5 h-3.5" />
                                    Installer Dame SKY en PWA
                                </button>
                            )}

                            <Link
                                href={`/${orgSlug}/admin`}
                                className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Retourner au Backoffice
                            </Link>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* ═════════════════════════════════════════════════════════════════════
                ZONE DE CHAT & WORKSTATION PRINCIPALE
               ═════════════════════════════════════════════════════════════════════ */}
            <main className="flex-1 h-full flex flex-col relative overflow-hidden bg-gradient-to-b from-[#0a0d16] via-[#07090e] to-[#05060a]">
                {/* ── Header Supérieur ── */}
                <header className="h-16 px-4 border-b border-white/10 flex items-center justify-between bg-[#0b0e17]/80 backdrop-blur-xl shrink-0 z-20">
                    <div className="flex items-center gap-3">
                        {!sidebarOpen && (
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-all"
                            >
                                <Layers className="w-4 h-4" />
                            </button>
                        )}
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-md">
                                <Crown className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-sm font-bold text-white tracking-wide">{persona || 'Dame SKY'}</h1>
                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        100% Autonome & MCP Connecté
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-400">
                                    Directrice Académique IA • Pilote tout le campus en direct
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Toggle Voice TTS */}
                        <button
                            onClick={() => setTtsVoiceEnabled(p => !p)}
                            className={cn(
                                'p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all',
                                ttsVoiceEnabled ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-white/5 text-slate-400 border-white/10'
                            )}
                            title={ttsVoiceEnabled ? 'Voix activée' : 'Voix muette'}
                        >
                            {ttsVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                            <span className="hidden md:inline">Voix</span>
                        </button>

                        {/* Bouton PWA Mobile Quick */}
                        {!isPwaInstalled && (
                            <button
                                onClick={handleInstallPwa}
                                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-white flex items-center gap-1.5 transition-all"
                            >
                                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="hidden sm:inline">Installer</span>
                            </button>
                        )}
                    </div>
                </header>

                {/* ── Fil de Conversation & Thinking ── */}
                <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar max-w-4xl mx-auto w-full">
                    {/* Message d'accueil si aucune discussion */}
                    {messages.length === 0 && (
                        <div className="py-8 text-center space-y-6">
                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-indigo-600/20 border border-amber-400/30 mx-auto flex items-center justify-center text-amber-300 shadow-[0_0_40px_rgba(245,158,11,0.2)]">
                                <Crown className="w-10 h-10" />
                            </div>

                            <div className="space-y-2 max-w-lg mx-auto">
                                <h2 className="text-2xl font-black bg-gradient-to-r from-amber-300 via-rose-300 to-indigo-300 bg-clip-text text-transparent">
                                    Bienvenue sur Dame SKY Studio
                                </h2>
                                <p className="text-sm text-slate-400">
                                    Pilotez l'intégralité de <strong className="text-white">{org?.name || 'votre école'}</strong> en langage naturel.
                                    Consultez la base, modifiez les plannings, notez des copies et publiez des cours en un clic.
                                </p>
                            </div>

                            {/* Suggestions d'actions rapides */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl mx-auto pt-2 text-left">
                                {QUICK_PROMPTS.map((qp, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setInputText(qp.prompt);
                                        }}
                                        className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-amber-500/30 transition-all text-left group"
                                    >
                                        <div className="flex items-center gap-2 font-bold text-xs text-white mb-1">
                                            <span>{qp.icon}</span>
                                            <span>{qp.label}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                            {qp.prompt}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Messages du Chat */}
                    {messages.map(msg => (
                        <div
                            key={msg.id}
                            className={cn(
                                'flex gap-3.5',
                                msg.role === 'user' ? 'justify-end' : 'justify-start'
                            )}
                        >
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-md">
                                    <Crown className="w-4 h-4" />
                                </div>
                            )}

                            <div className={cn('space-y-2 max-w-[85%] md:max-w-[75%]', msg.role === 'user' ? 'items-end' : 'items-start')}>
                                {/* ── ACCORDÉON THINKING (Raisonnement IA style Claude 3.7 / DeepSeek R1) ── */}
                                {msg.thinking && (
                                    <div className="rounded-2xl bg-indigo-950/30 border border-indigo-500/20 overflow-hidden shadow-sm">
                                        <button
                                            onClick={() => toggleThinking(msg.id)}
                                            className="w-full px-3.5 py-2 flex items-center justify-between text-xs font-semibold text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                                        >
                                            <span className="flex items-center gap-2">
                                                <Brain className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                                                Raisonnement & Outils MCP de Dame SKY
                                            </span>
                                            {openThinkingMap[msg.id] ? (
                                                <ChevronUp className="w-3.5 h-3.5" />
                                            ) : (
                                                <ChevronDown className="w-3.5 h-3.5" />
                                            )}
                                        </button>

                                        <AnimatePresence>
                                            {openThinkingMap[msg.id] && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="px-3.5 pb-3 text-xs text-indigo-200/80 font-mono whitespace-pre-wrap leading-relaxed border-t border-indigo-500/10 bg-black/20"
                                                >
                                                    {msg.thinking}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* Corps du Message */}
                                <div
                                    className={cn(
                                        'p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-lg',
                                        msg.role === 'user'
                                            ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white rounded-tr-sm'
                                            : 'bg-[#121624] border border-white/10 text-slate-200 rounded-tl-sm'
                                    )}
                                >
                                    {msg.content}
                                </div>

                                {/* Pièces jointes */}
                                {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {msg.attachments.map((att, idx) => (
                                            <a
                                                key={idx}
                                                href={att.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-amber-300 flex items-center gap-1.5 transition-all"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                                <span className="truncate max-w-[150px]">{att.name}</span>
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {/* Actions sur message assistant */}
                                {msg.role === 'assistant' && (
                                    <div className="flex items-center gap-2 pt-1 text-slate-500 text-xs">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(msg.content);
                                                toast.success('Texte copié !');
                                            }}
                                            className="hover:text-slate-300 transition-colors p-1"
                                            title="Copier"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => speakText(msg.content)}
                                            className="hover:text-slate-300 transition-colors p-1"
                                            title="Écouter"
                                        >
                                            <Volume2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Indicateur de réflexion / chargement */}
                    {isLoading && (
                        <div className="flex items-center gap-3 text-amber-400 text-xs py-2">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white animate-pulse">
                                <Crown className="w-4 h-4" />
                            </div>
                            <div className="flex items-center gap-2 bg-[#121624] px-4 py-2 rounded-2xl border border-amber-500/20 shadow-md">
                                <Brain className="w-4 h-4 animate-spin text-amber-400" />
                                <span>Dame SKY réfléchit et consulte les outils de votre école…</span>
                            </div>
                        </div>
                    )}

                    <div ref={chatEndRef} />
                </div>

                {/* ── Zone de Saisie Inférieure ── */}
                <div className="p-4 bg-[#0b0e17]/90 border-t border-white/10 backdrop-blur-xl shrink-0">
                    <div className="max-w-4xl mx-auto space-y-2">
                        {/* Prévisualisation des pièces jointes en attente */}
                        {attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 pb-1">
                                {attachments.map((att, i) => (
                                    <div key={i} className="px-2.5 py-1 rounded-xl bg-white/10 text-xs text-amber-200 flex items-center gap-2 border border-white/10">
                                        <span className="truncate max-w-[140px]">{att.name}</span>
                                        <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-end gap-2 bg-[#121624] border border-white/15 focus-within:border-amber-400/50 rounded-2xl p-2 transition-all shadow-xl">
                            {/* Bouton Fichier */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading || isLoading}
                                className="p-2.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all shrink-0"
                                title="Joindre un fichier"
                            >
                                <Paperclip className="w-4 h-4" />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                onChange={handleFileUpload}
                                multiple
                            />

                            {/* Bouton Microphone */}
                            <button
                                onClick={toggleListening}
                                className={cn(
                                    'p-2.5 rounded-xl transition-all shrink-0',
                                    isListening
                                        ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30'
                                        : 'hover:bg-white/10 text-slate-400 hover:text-white'
                                )}
                                title={isListening ? 'Arrêter écoute' : 'Parler au micro'}
                            >
                                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            </button>

                            {/* Zone de texte */}
                            <textarea
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Demandez n'importe quelle action ou information sur votre école..."
                                rows={1}
                                className="flex-1 bg-transparent border-0 text-sm text-white placeholder-slate-500 focus:outline-none resize-none max-h-32 py-2 px-1"
                            />

                            {/* Bouton Envoyer */}
                            <button
                                onClick={handleSend}
                                disabled={(!inputText.trim() && attachments.length === 0) || isLoading}
                                className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 disabled:opacity-40 text-white font-bold transition-all shrink-0 shadow-md shadow-amber-500/20"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-[10px] text-center text-slate-500">
                            Dame SKY peut exécuter des modifications réelles sur votre base de données selon vos permissions.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
