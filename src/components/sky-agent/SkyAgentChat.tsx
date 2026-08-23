'use client';

import { useEffect, useRef, useState, KeyboardEvent, ChangeEvent, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Send, Trash2, Sparkles, User, Loader2, Shield,
    Paperclip, FileText, Image as ImageIcon, Download, ExternalLink,
    GraduationCap, Award, Crown, CheckCircle2, AlertTriangle,
    Volume2, VolumeX, Mic, MicOff, Copy, Check, Share2, BookOpen,
    Sliders, Zap, ChevronRight, FileCheck, Brain, Target,
    Folder, FolderPlus, MessageSquare, Plus, Search, Calendar,
    ArrowLeft, MoreVertical, Star, Compass, BookMarked
} from 'lucide-react';
import { useSkyAgent, type SkyAgentRole, type SkyAgentContext, type SkyMessage, type SkyAttachment } from '@/hooks/use-sky-agent';
import { uploadToR2 } from '@/lib/r2';
import { compressImage } from '@/lib/compress';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
//  Types & Interfaces pour Projets & Historique
// ─────────────────────────────────────────────────────────────────────────────
export type DameSkyMode = 'general' | 'revision_quiz' | 'pedagogical_training' | 'correction' | 'exercise_gen' | 'strategy';

export interface DameSkyProject {
    id: string;
    name: string;
    description?: string;
    color?: string;
    updated_at: string;
    conversation_count?: number;
}

export interface DameSkySavedConversation {
    id: string;
    project_id?: string | null;
    title: string;
    mode: DameSkyMode;
    messages: SkyMessage[];
    updated_at: string;
}

interface ModeOption {
    id: DameSkyMode;
    label: string;
    icon: any;
    hint: string;
    badge?: string;
    roles: SkyAgentRole[];
}

const DAME_SKY_MODES: ModeOption[] = [
    {
        id: 'general',
        label: 'Mentorat & Conseil',
        icon: Brain,
        hint: 'Explications approfondies, méthodologie et réponses académiques.',
        roles: ['admin', 'prof', 'student'],
    },
    {
        id: 'revision_quiz',
        label: '🎯 Quiz Révision (+1 Sky Point)',
        icon: Star,
        badge: 'Gagner des pts',
        hint: 'Répondez correctement aux questions de Dame SKY sur vos cours pour gagner des Sky Points !',
        roles: ['student'],
    },
    {
        id: 'pedagogical_training',
        label: '🎓 Formation Pédagogique',
        icon: BookMarked,
        badge: 'Formation Continue',
        hint: 'Perfectionnement pédagogique : différenciation, gestion de classe, barèmes et évaluation.',
        roles: ['prof'],
    },
    {
        id: 'strategy',
        label: '🏛️ Gouvernance & Stratégie',
        icon: Award,
        badge: 'Direction',
        hint: 'Rapports, gestion des impayés, rentabilité, conformité et communications de direction.',
        roles: ['admin'],
    },
    {
        id: 'correction',
        label: 'Correction Critique',
        icon: FileCheck,
        hint: 'Analyse sans complaisance : forces, faiblesses, fautes et barème /20.',
        roles: ['prof', 'student'],
    },
    {
        id: 'exercise_gen',
        label: 'Générateur de QCM',
        icon: Target,
        hint: 'Création d\'exercices différenciés, QCM et corrigés types.',
        roles: ['prof', 'student'],
    },
];

// ─────────────────────────────────────────────────────────────────────────────
//  Suggestions rapides académiques et stratégiques
// ─────────────────────────────────────────────────────────────────────────────
const QUICK_SUGGESTIONS: Record<SkyAgentRole, Partial<Record<DameSkyMode, string[]>>> = {
    admin: {
        general: [
            '📊 Bilan de performance académique et taux de présence global',
            '📢 Rédiger une note officielle de rentrée pour les enseignants et parents',
        ],
        strategy: [
            '💰 Stratégie graduée de relance des impayés de scolarité (J-7, J+0, J+15)',
            '📋 Optimisation du planning des salles et audit de rentabilité des filières',
            '📑 Modèle de rapport d\'accréditation pour les autorités éducatives',
        ],
    },
    prof: {
        general: [
            '📚 Plan de séquence pédagogique modulaire conforme aux programmes officiels',
            '💡 Comment susciter la participation active des apprenants timides ?',
        ],
        pedagogical_training: [
            '🎓 Guide de la différenciation pédagogique pour élèves à besoins particuliers',
            '⚖️ Comment concevoir une évaluation formative avec critères observables ?',
            '📈 Méthodes de remédiation rapide après un devoir surveillé',
        ],
        exercise_gen: [
            '✏️ Générer un devoir surveillé de 4 exercices progressifs avec barème /20',
            '🎯 Créer un QCM de 10 questions avec distracteurs réalistes et justifications',
        ],
        correction: [
            '🔍 Évaluer cette proposition de sujet d\'examen et perfectionner les critères',
        ],
    },
    student: {
        general: [
            '📖 Explique-moi ce concept avec rigueur et des exemples concrets',
            '📅 Établis mon planning de révisions intensives pour la semaine',
        ],
        revision_quiz: [
            '⭐ Teste mes connaissances sur la dernière leçon publiée (Gagner 1 Sky Point)',
            '🧮 Pose-moi une question piège sur mon programme pour tester ma maîtrise',
            '🎯 Lance un défi de 3 questions de révision pour cumuler des points',
        ],
        correction: [
            '🔍 Corrige mon devoir ci-joint : signale les fautes et donne une note /20',
            '📝 Analyse la structure de mon paragraphe et propose des reformulations',
        ],
        exercise_gen: [
            '🧮 Entraîne-moi avec 3 exercices progressifs sur ma dernière leçon',
        ],
    },
};

// ─────────────────────────────────────────────────────────────────────────────
//  Rendu des pièces jointes
// ─────────────────────────────────────────────────────────────────────────────
function AttachmentItem({ att }: { att: SkyAttachment }) {
    const isImage = att.type.startsWith('image/');
    return (
        <a
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 p-2 rounded-xl bg-black/40 border border-white/10 hover:border-amber-400/40 transition-all text-xs text-slate-200 mt-2 group max-w-full overflow-hidden"
        >
            {isImage ? (
                <div className="w-9 h-9 rounded-lg bg-cover bg-center border border-white/10 flex-shrink-0" style={{ backgroundImage: `url(${att.url})` }} />
            ) : (
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-400/30 flex items-center justify-center flex-shrink-0 text-amber-300">
                    <FileText className="w-4 h-4" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="font-medium truncate group-hover:text-amber-200 transition-colors">{att.name}</p>
                <p className="text-[10px] text-slate-400">{att.size ? `${(att.size / 1024).toFixed(0)} KB · ` : ''}Document joint</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-300 flex-shrink-0" />
        </a>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Rendu Typographique Élégant (Sans Marquage Markdown Brut)
// ─────────────────────────────────────────────────────────────────────────────
function renderInlineText(text: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = /(\*\*|__)(.*?)\1|`([^`]+)`/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        if (match[2]) {
            parts.push(
                <strong key={match.index} className="font-semibold text-amber-200">
                    {match[2]}
                </strong>
            );
        } else if (match[3]) {
            parts.push(
                <code key={match.index} className="px-1.5 py-0.5 rounded bg-black/40 text-amber-300 font-mono text-xs border border-white/10">
                    {match[3]}
                </code>
            );
        }

        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
}

function renderCleanMessageText(rawText: string) {
    if (!rawText) return null;
    const lines = rawText.split('\n');

    return (
        <div className="space-y-1 text-sm leading-relaxed">
            {lines.map((line, idx) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={idx} className="h-1" />;

                // Titres (#, ##, ###)
                const headingMatch = trimmed.match(/^#{1,4}\s+(.+)$/);
                if (headingMatch) {
                    return (
                        <div key={idx} className="font-bold text-amber-300 text-sm mt-2 mb-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                            {renderInlineText(headingMatch[1])}
                        </div>
                    );
                }

                // Puces (- ou *)
                const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
                if (bulletMatch) {
                    return (
                        <div key={idx} className="flex items-start gap-2 pl-1 my-0.5">
                            <span className="text-amber-400 font-bold leading-tight select-none">•</span>
                            <div className="flex-1">{renderInlineText(bulletMatch[1])}</div>
                        </div>
                    );
                }

                // Listes numérotées (1., 2., etc.)
                const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.+)$/);
                if (numMatch) {
                    return (
                        <div key={idx} className="flex items-start gap-2 pl-1 my-0.5">
                            <span className="text-amber-300 font-semibold text-xs min-w-4">{numMatch[1]}.</span>
                            <div className="flex-1">{renderInlineText(numMatch[2])}</div>
                        </div>
                    );
                }

                return (
                    <p key={idx} className="my-0.5">
                        {renderInlineText(line)}
                    </p>
                );
            })}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Bulle de message Dame SKY
// ─────────────────────────────────────────────────────────────────────────────
function MessageBubble({
    msg,
    onSpeak,
    isSpeaking,
}: {
    msg: SkyMessage;
    onSpeak: (text: string) => void;
    isSpeaking: boolean;
}) {
    const isUser = msg.role === 'user';
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(msg.content);
        setCopied(true);
        toast.success('Texte copié dans le presse-papier');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExportFiche = () => {
        const title = `Fiche d'Étude & Mentorat — Dame SKY`;
        const content = `${title}\n${'='.repeat(title.length)}\nDate : ${new Date(msg.timestamp).toLocaleString('fr-FR')}\n\n${msg.content}\n\n---\nPlateforme IziTeach / CampusFlow · Certifié par Dame SKY`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Fiche_Dame_SKY_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Fiche de révision téléchargée avec succès');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn('flex gap-2.5 items-end group', isUser ? 'flex-row-reverse' : 'flex-row')}
        >
            {/* Avatar */}
            <div className={cn(
                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md',
                isUser
                    ? 'bg-gradient-to-tr from-slate-700 to-slate-600 border border-white/20 text-slate-200'
                    : 'bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 border border-amber-300/40 shadow-[0_0_14px_rgba(245,158,11,0.35)]'
            )}>
                {isUser ? (
                    <User className="w-4 h-4 text-slate-200" />
                ) : (
                    <Crown className="w-4 h-4 text-amber-100" />
                )}
            </div>

            {/* Bulle */}
            <div className={cn(
                'max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-lg relative',
                isUser
                    ? 'bg-gradient-to-r from-violet-600/40 to-indigo-600/40 border border-violet-500/40 text-violet-50 rounded-br-xs'
                    : 'bg-[#151928]/95 border border-white/10 text-slate-100 rounded-bl-xs'
            )}>
                {renderCleanMessageText(msg.content)}

                {/* Pièces jointes */}
                {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2">
                        {msg.attachments.map((att, idx) => (
                            <AttachmentItem key={idx} att={att} />
                        ))}
                    </div>
                )}

                {/* Actions sous la réponse */}
                {!isUser && (
                    <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => onSpeak(msg.content)}
                                title={isSpeaking ? "Arrêter la lecture" : "Écouter la voix de Dame SKY"}
                                className={cn(
                                    'p-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1',
                                    isSpeaking ? 'text-amber-300 bg-amber-500/20' : 'text-slate-400 hover:text-white'
                                )}
                            >
                                {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                                <span>{isSpeaking ? 'Arrêter' : 'Écouter'}</span>
                            </button>

                            <button
                                onClick={handleCopy}
                                title="Copier le texte"
                                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copied ? 'Copié' : 'Copier'}</span>
                            </button>
                        </div>

                        <button
                            onClick={handleExportFiche}
                            title="Télécharger comme fiche de synthèse"
                            className="p-1.5 rounded-lg hover:bg-white/10 text-amber-300/80 hover:text-amber-200 transition-colors flex items-center gap-1"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Exporter fiche</span>
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Indicateur de réflexion
// ─────────────────────────────────────────────────────────────────────────────
function TypingIndicator() {
    return (
        <div className="flex gap-2.5 items-end">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 border border-amber-300/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_14px_rgba(245,158,11,0.35)]">
                <Crown className="w-4 h-4 text-amber-100" />
            </div>
            <div className="bg-[#151928]/95 border border-white/10 rounded-2xl rounded-bl-xs px-4 py-3 shadow-lg">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-300/90 font-medium">Dame SKY réfléchit</span>
                    <div className="flex gap-1.5 items-center">
                        {[0, 1, 2].map(i => (
                            <motion.div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-amber-400"
                                animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Composant principal SkyAgentChat avec Vue Projets / Dossiers
// ─────────────────────────────────────────────────────────────────────────────
interface SkyAgentChatProps {
    role: SkyAgentRole;
    context?: SkyAgentContext;
    isOpen: boolean;
    onClose: () => void;
    messages: SkyMessage[];
    isLoading: boolean;
    externalAgentActive?: boolean;
    persona?: string;
    sendMessage: (text: string, attachments?: SkyAttachment[]) => Promise<void>;
    clearSession: () => Promise<void>;
}

export function SkyAgentChat({
    role,
    context,
    isOpen,
    onClose,
    messages,
    isLoading,
    externalAgentActive = false,
    persona,
    sendMessage,
    clearSession,
}: SkyAgentChatProps) {
    const [view, setView] = useState<'chat' | 'projects'>('chat');
    const [input, setInput] = useState('');
    const [selectedMode, setSelectedMode] = useState<DameSkyMode>('general');
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [attachments, setAttachments] = useState<SkyAttachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    // Audio & Dictée vocale
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);

    // Projets & Historique
    const [projects, setProjects] = useState<DameSkyProject[]>([]);
    const [savedConvs, setSavedConvs] = useState<DameSkySavedConversation[]>([]);
    const [activeProject, setActiveProject] = useState<DameSkyProject | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [newProjectName, setNewProjectName] = useState('');
    const [isCreatingProject, setIsCreatingProject] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);

    const roleInfo: Record<SkyAgentRole, { title: string; subtitle: string; gradient: string }> = {
        admin: {
            title: 'Dame SKY',
            subtitle: 'Directrice Académique & Stratégique',
            gradient: 'from-amber-600 via-rose-600 to-indigo-700',
        },
        prof: {
            title: 'Dame SKY',
            subtitle: 'Conseillère Pédagogique & Méthodes',
            gradient: 'from-teal-600 via-indigo-600 to-purple-700',
        },
        student: {
            title: 'Dame SKY',
            subtitle: 'Mentore Académique & Réussite',
            gradient: 'from-indigo-600 via-purple-600 to-rose-600',
        },
    };

    const currentRole = roleInfo[role] || roleInfo.student;
    const availableModes = DAME_SKY_MODES.filter(m => m.roles.includes(role));

    // Charger les projets et conversations sauvegardées
    const loadProjectsAndHistory = useCallback(async () => {
        try {
            // 1. Projets
            const { data: pData } = await supabase
                .from('dame_sky_projects')
                .select('*')
                .eq('user_id', context?.user_id || '00000000-0000-0000-0000-000000000000')
                .order('updated_at', { ascending: false });

            if (pData) setProjects(pData);

            // 2. Conversations
            const { data: cData } = await supabase
                .from('dame_sky_conversations')
                .select('*')
                .eq('user_id', context?.user_id || '00000000-0000-0000-0000-000000000000')
                .order('updated_at', { ascending: false })
                .limit(20);

            if (cData) setSavedConvs(cData);
        } catch {
            // Fallback localStorage
            const localProj = localStorage.getItem(`damesky_projects_${role}`);
            if (localProj) setProjects(JSON.parse(localProj));
        }
    }, [context?.user_id, role]);

    useEffect(() => {
        if (isOpen) {
            loadProjectsAndHistory();
        }
    }, [isOpen, loadProjectsAndHistory]);

    // Créer un nouveau projet / dossier
    const handleCreateProject = async () => {
        if (!newProjectName.trim()) return;
        const newProj: DameSkyProject = {
            id: `proj_${Date.now()}`,
            name: newProjectName.trim(),
            updated_at: new Date().toISOString(),
        };

        try {
            await supabase.from('dame_sky_projects').insert([{
                name: newProjectName.trim(),
                user_id: context?.user_id || null,
                organization_id: context?.org_id || null,
                user_role: role,
            }]);
        } catch {
            // silent fallback
        }

        setProjects(prev => [newProj, ...prev]);
        setNewProjectName('');
        setIsCreatingProject(false);
        toast.success(`Dossier "${newProj.name}" créé avec succès ! 📁`);
    };

    // Scroll au dernier message
    useEffect(() => {
        if (isOpen && view === 'chat') {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isLoading, isOpen, view]);

    // Focus input
    useEffect(() => {
        if (isOpen && view === 'chat') {
            setTimeout(() => inputRef.current?.focus(), 250);
        }
    }, [isOpen, view]);

    // Préchargement des Voix Naturelles HD
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        const updateVoices = () => {
            const v = window.speechSynthesis.getVoices();
            if (v && v.length > 0) setAvailableVoices(v);
        };
        updateVoices();
        window.speechSynthesis.onvoiceschanged = updateVoices;
        return () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.onvoiceschanged = null;
            }
        };
    }, []);

    // Nettoyage de la voix à la fermeture
    useEffect(() => {
        if (!isOpen && typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    }, [isOpen]);

    // Lecture à voix haute avec Voix Naturelle HD / IA Réaliste
    const handleSpeak = (text: string) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            toast.error('La synthèse vocale n\'est pas supportée par votre navigateur');
            return;
        }

        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        window.speechSynthesis.cancel();

        // Nettoyage poussé pour une élocution fluide et humaine
        const cleanText = text
            .replace(/[*#_`~[\]]/g, ' ')
            .replace(/\(https?:\/\/[^\)]+\)/g, '')
            .replace(/https?:\/\/\S+/g, '')
            .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // suppression des émojis pour éviter la diction robotique
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.94; // Débit posé, digne et naturel
        utterance.pitch = 1.0;

        const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();

        // 1. Voix Neurales Haute Définition prioritaires (Microsoft Natural, Google Neural, Siri)
        const naturalVoice = voices.find(v =>
            (v.lang.startsWith('fr') || v.lang.includes('FR')) && (
                v.name.toLowerCase().includes('natural') ||
                v.name.toLowerCase().includes('neural') ||
                v.name.toLowerCase().includes('denise') ||
                v.name.toLowerCase().includes('henri') ||
                v.name.toLowerCase().includes('vivienne') ||
                v.name.toLowerCase().includes('google français') ||
                v.name.toLowerCase().includes('siri') ||
                v.name.toLowerCase().includes('audrey') ||
                v.name.toLowerCase().includes('thomas') ||
                v.name.toLowerCase().includes('amelie')
            )
        );

        // 2. N'importe quelle voix française
        const frVoice = naturalVoice || voices.find(v => v.lang.startsWith('fr') || v.lang.includes('FR'));

        if (frVoice) {
            utterance.voice = frVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    // Dictée vocale
    const toggleSpeechRecognition = () => {
        if (typeof window === 'undefined') return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.info('💡 La dictée vocale instantanée est optimisée sur Google Chrome ou Edge. Vous pouvez taper votre message directement.');
            inputRef.current?.focus();
            return;
        }

        if (isListening) {
            try {
                recognitionRef.current?.stop();
            } catch {}
            setIsListening(false);
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.lang = 'fr-FR';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onstart = () => {
                setIsListening(true);
                toast.info('🎙️ Écoute en cours… Parlez distinctement à Dame SKY');
            };

            recognition.onresult = (event: any) => {
                const transcript = event.results[0]?.[0]?.transcript;
                if (transcript) {
                    setInput(prev => prev ? `${prev} ${transcript}` : transcript);
                    toast.success('Voix transcrite avec succès !');
                }
            };

            recognition.onerror = (e: any) => {
                setIsListening(false);
                if (e?.error !== 'no-speech') {
                    console.warn('[DameSKY] Speech recognition notice:', e?.error);
                }
            };
            recognition.onend = () => setIsListening(false);

            recognitionRef.current = recognition;
            recognition.start();
        } catch {
            setIsListening(false);
        }
    };

    // Upload de fichier
    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            toast.error('Le fichier ne doit pas dépasser 10 Mo');
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading(`Téléversement de ${file.name}…`);

        try {
            let uploadFile = file;
            if (file.type.startsWith('image/')) {
                uploadFile = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.82 });
            }

            const r2Res = await uploadToR2(uploadFile, 'damesky', `damesky_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
            const url = r2Res?.url;
            if (!url) throw new Error('Échec de l\'envoi du fichier');

            const newAtt: SkyAttachment = {
                name: file.name,
                url,
                type: file.type || 'application/octet-stream',
                size: file.size,
            };

            setAttachments(prev => [...prev, newAtt]);
            toast.success('Pièce jointe ajoutée avec succès', { id: toastId });
        } catch (err: any) {
            toast.error(err?.message || 'Erreur lors du téléversement', { id: toastId });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        const text = input.trim();
        if ((!text && attachments.length === 0) || isLoading || isUploading) return;

        let finalPrompt = text;
        if (selectedMode === 'revision_quiz') {
            finalPrompt = `[MODE: QUIZ RÉVISION COURS & GAIN SKY POINTS] ${text}`;
        } else if (selectedMode === 'pedagogical_training') {
            finalPrompt = `[MODE: FORMATION PÉDAGOGIQUE ENSEIGNANT] ${text}`;
        } else if (selectedMode === 'correction') {
            finalPrompt = `[MODE: CORRECTION CRITIQUE & BARÈME] ${text}`;
        } else if (selectedMode === 'exercise_gen') {
            finalPrompt = `[MODE: GÉNÉRATEUR D'EXERCICES & QCM] ${text}`;
        } else if (selectedMode === 'strategy') {
            finalPrompt = `[MODE: GESTION & STRATÉGIE ACADÉMIQUE] ${text}`;
        }

        const currentAtts = [...attachments];
        setInput('');
        setAttachments([]);
        setShowSuggestions(false);

        await sendMessage(finalPrompt, currentAtts.length > 0 ? currentAtts : undefined);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSuggestion = async (text: string) => {
        setShowSuggestions(false);
        await sendMessage(text);
    };

    const currentSuggestions = QUICK_SUGGESTIONS[role]?.[selectedMode] || QUICK_SUGGESTIONS[role]?.general || [];

    const filteredProjects = projects.filter(p =>
        !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: 24 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: 24 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed bottom-24 right-4 z-[9999] w-[440px] max-w-[calc(100vw-1.5rem)] flex flex-col"
                    style={{ height: '640px' }}
                >
                    <div className="flex flex-col h-full rounded-3xl overflow-hidden border border-amber-500/25 shadow-[0_32px_80px_rgba(0,0,0,0.95)] backdrop-blur-2xl bg-[#0B0E17]/95">

                        {/* ── En-tête Prestigieux Dame SKY ── */}
                        <div className={`flex-shrink-0 bg-gradient-to-r ${currentRole.gradient} p-4 flex items-center justify-between shadow-md border-b border-white/10`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center shadow-lg">
                                    <Crown className="w-5 h-5 text-amber-200" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <p className="font-bold text-white text-base leading-tight tracking-wide">{currentRole.title}</p>
                                        <span className="text-[10px] uppercase font-bold bg-amber-400/20 border border-amber-300/40 text-amber-200 px-1.5 py-0.5 rounded-md">
                                            {activeProject ? activeProject.name : 'Mentor Suprême'}
                                        </span>
                                    </div>
                                    <p className="text-white/85 text-xs mt-0.5">{currentRole.subtitle}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {/* Basculer vers Vue Projets / Dossiers */}
                                <button
                                    onClick={() => setView(v => v === 'chat' ? 'projects' : 'chat')}
                                    title={view === 'chat' ? "Ouvrir les Projets & Dossiers" : "Retour au chat"}
                                    className={cn(
                                        'p-2 rounded-xl transition-all text-white/80 hover:text-white flex items-center gap-1',
                                        view === 'projects' ? 'bg-white/20 text-white font-bold' : 'hover:bg-white/10'
                                    )}
                                >
                                    <Folder className="w-4 h-4" />
                                    <span className="text-xs hidden sm:inline">{view === 'chat' ? 'Dossiers' : 'Discussion'}</span>
                                </button>
                                <button
                                    onClick={clearSession}
                                    title="Réinitialiser la session de travail"
                                    className="p-2 rounded-xl hover:bg-white/20 transition-colors text-white/80 hover:text-white"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={onClose}
                                    title="Fermer"
                                    className="p-2 rounded-xl hover:bg-white/20 transition-colors text-white/80 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* ── VUE 1 : PROJETS & HISTORIQUE THÉMATIQUE (Style Claude Projects) ── */}
                        {view === 'projects' ? (
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                                        <Folder className="w-4 h-4 text-amber-400" />
                                        <span>Projets & Dossiers thématiques</span>
                                    </h3>
                                    <button
                                        onClick={() => setIsCreatingProject(true)}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-semibold hover:bg-amber-500/30 transition"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Nouveau projet</span>
                                    </button>
                                </div>

                                {/* Formulaire de création de projet */}
                                {isCreatingProject && (
                                    <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-amber-400/30 space-y-2">
                                        <p className="text-xs text-white font-medium">Nom du dossier / projet :</p>
                                        <input
                                            type="text"
                                            value={newProjectName}
                                            onChange={e => setNewProjectName(e.target.value)}
                                            placeholder="Ex: Révision Mathématiques, Préparation Examen..."
                                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-400"
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2 pt-1">
                                            <button
                                                onClick={() => setIsCreatingProject(false)}
                                                className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                                            >
                                                Annuler
                                            </button>
                                            <button
                                                onClick={handleCreateProject}
                                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg"
                                            >
                                                Créer
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Grille des Cartes Projets (Style Claude) */}
                                <div className="grid grid-cols-2 gap-2.5">
                                    {filteredProjects.map(proj => {
                                        const isSelected = activeProject?.id === proj.id;
                                        return (
                                            <div
                                                key={proj.id}
                                                onClick={() => {
                                                    setActiveProject(proj);
                                                    setView('chat');
                                                    toast.info(`Dossier "${proj.name}" activé`);
                                                }}
                                                className={cn(
                                                    'p-3.5 rounded-2xl border cursor-pointer transition-all text-left flex flex-col justify-between h-24 hover:scale-[1.02]',
                                                    isSelected
                                                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg'
                                                        : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.07] hover:border-white/20'
                                                )}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <p className="font-bold text-xs text-white line-clamp-2 leading-snug">{proj.name}</p>
                                                    <Folder className="w-3.5 h-3.5 text-amber-400/80 flex-shrink-0" />
                                                </div>
                                                <p className="text-[10px] text-slate-400">
                                                    {new Date(proj.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>

                                {projects.length === 0 && !isCreatingProject && (
                                    <div className="text-center py-8 text-slate-500">
                                        <Folder className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-400" />
                                        <p className="text-xs">Aucun projet créé pour l'instant.</p>
                                        <p className="text-[10px] text-slate-600 mt-0.5">Créez des dossiers pour regrouper vos révisions et recherches.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* ── VUE 2 : CHAT PRINCIPAL DAME SKY ── */
                            <>
                                {/* Sélecteur de Modes Pédagogiques */}
                                {availableModes.length > 1 && (
                                    <div className="flex-shrink-0 bg-black/40 border-b border-white/5 px-3 py-2 flex gap-1.5 overflow-x-auto scrollbar-none">
                                        {availableModes.map(mode => {
                                            const Icon = mode.icon;
                                            const isSelected = selectedMode === mode.id;
                                            return (
                                                <button
                                                    key={mode.id}
                                                    onClick={() => {
                                                        setSelectedMode(mode.id);
                                                        setShowSuggestions(true);
                                                    }}
                                                    className={cn(
                                                        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                                                        isSelected
                                                            ? 'bg-amber-500/20 border border-amber-400/40 text-amber-200 shadow-sm'
                                                            : 'bg-white/[0.04] border border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/[0.08]'
                                                    )}
                                                >
                                                    <Icon className="w-3 h-3" />
                                                    <span>{mode.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Bannière de Confidentialité */}
                                <div className="flex-shrink-0 bg-black/50 border-b border-white/5 px-3 py-1.5 flex items-center justify-between gap-2 text-[10px]">
                                    <div className="flex items-center gap-1.5 text-slate-300">
                                        <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                        <span>
                                            {externalAgentActive
                                                ? 'Assistant IA externe connecté. Ne partagez pas de données sensibles (mots de passe, bancaire).'
                                                : 'Session confidentielle et sécurisée. Ne partagez pas de mots de passe.'}
                                        </span>
                                    </div>
                                    {externalAgentActive && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded shrink-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            Live AI
                                        </span>
                                    )}
                                </div>

                                {/* Zone de Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                    {messages.length === 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-center py-4 px-2"
                                        >
                                            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-[0_0_24px_rgba(245,158,11,0.35)] border border-amber-300/30">
                                                <Sparkles className="w-8 h-8 text-amber-100" />
                                            </div>
                                            <h3 className="text-white font-bold text-base tracking-wide">
                                                Bonjour{context?.user_name ? ` ${context.user_name.split(' ')[0]}` : ''}. Je suis Dame SKY.
                                            </h3>
                                            <p className="text-slate-300 text-xs mt-1.5 leading-relaxed max-w-[310px] mx-auto">
                                                Ici, nous cultivons la rigueur et l'excellence académique. Soumettez-moi votre devoir, votre document ou commencez une révision notée.
                                            </p>
                                            <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                                                <Award className="w-3.5 h-3.5 text-amber-300" />
                                                <span>Correction exigeante · Quiz avec gains de Sky Points</span>
                                            </div>
                                        </motion.div>
                                    )}

                                    {messages.map(msg => (
                                        <MessageBubble
                                            key={msg.id}
                                            msg={msg}
                                            onSpeak={handleSpeak}
                                            isSpeaking={isSpeaking}
                                        />
                                    ))}

                                    {isLoading && <TypingIndicator />}

                                    <div ref={bottomRef} />
                                </div>

                                {/* Suggestions rapides */}
                                <AnimatePresence>
                                    {showSuggestions && messages.length === 0 && currentSuggestions.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="flex-shrink-0 px-4 pb-3 overflow-hidden"
                                        >
                                            <p className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                                                <Zap className="w-3 h-3 text-amber-400" />
                                                Suggestions d'orientation :
                                            </p>
                                            <div className="flex flex-col gap-1.5">
                                                {currentSuggestions.map((s, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => handleSuggestion(s)}
                                                        className="text-left text-xs px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-slate-200 hover:bg-amber-500/15 hover:border-amber-400/40 hover:text-amber-100 transition-all leading-snug"
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Pièces jointes en attente */}
                                {attachments.length > 0 && (
                                    <div className="px-4 py-2 bg-black/40 border-t border-white/10 flex flex-wrap gap-2">
                                        {attachments.map((att, index) => (
                                            <div key={index} className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-400/30 px-2.5 py-1 rounded-lg text-xs text-amber-200">
                                                <FileText className="w-3.5 h-3.5 text-amber-300" />
                                                <span className="max-w-[140px] truncate">{att.name}</span>
                                                <button onClick={() => removeAttachment(index)} className="hover:text-red-400 transition-colors ml-1">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Zone de Saisie */}
                                <div className="flex-shrink-0 p-3.5 border-t border-white/10 bg-white/[0.02]">
                                    <div className="flex gap-2 items-end">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            onChange={handleFileChange}
                                            accept="image/*,application/pdf,.doc,.docx,.txt"
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading || isLoading}
                                            title="Joindre un devoir, une capture ou un document"
                                            className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-300 hover:text-amber-200 hover:bg-white/10 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                        >
                                            {isUploading ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                                            ) : (
                                                <Paperclip className="w-4 h-4" />
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={toggleSpeechRecognition}
                                            title={isListening ? "Arrêter l'enregistrement" : "Dicter à la voix"}
                                            className={cn(
                                                'flex-shrink-0 w-10 h-10 rounded-xl border transition-all flex items-center justify-center',
                                                isListening
                                                    ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                                                    : 'bg-white/[0.06] border border-white/10 text-slate-300 hover:text-amber-200 hover:bg-white/10'
                                            )}
                                        >
                                            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                        </button>

                                        <textarea
                                            ref={inputRef}
                                            value={input}
                                            onChange={e => setInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder={selectedMode === 'revision_quiz' ? "Demandez un quiz de révision ou répondez à Dame SKY…" : "Posez votre question ou soumettez un devoir…"}
                                            rows={1}
                                            disabled={isLoading || isUploading}
                                            className="flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-400/50 resize-none max-h-24 transition-colors disabled:opacity-50"
                                            style={{ minHeight: '40px' }}
                                        />

                                        <button
                                            onClick={handleSend}
                                            disabled={(!input.trim() && attachments.length === 0) || isLoading || isUploading}
                                            className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg disabled:opacity-40 hover:shadow-amber-500/30 transition-all hover:scale-105 active:scale-95"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="w-4 h-4 text-white animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4 text-white" />
                                            )}
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between mt-2.5 px-1">
                                        <div className="flex items-center gap-1">
                                            <Shield className="w-3 h-3 text-emerald-400/70" />
                                            <p className="text-[10px] text-slate-400">
                                                Espace protégé · Détection anti-triche
                                            </p>
                                        </div>
                                        <span className="text-[10px] text-amber-400/70 font-bold tracking-wider uppercase">Dame SKY</span>
                                    </div>
                                </div>
                            </>
                        )}

                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
