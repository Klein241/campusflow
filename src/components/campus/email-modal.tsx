'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Mail, Send, Loader2, CheckCircle2, Users, User, Search,
    Sparkles, ShieldCheck, AlertTriangle, Clock, ExternalLink,
    History, BookOpen, FileCheck, Megaphone, BellRing, BarChart3,
    Image as ImageIcon, RefreshCw, Copy, Check, ChevronRight, Layers,
    Flame, Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface StudentRecipient {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    classroom_id?: string | null;
    classroom_name?: string | null;
}

export interface EmailModalProps {
    open: boolean;
    onClose: () => void;
    subject?: string;
    body?: string;
    students: StudentRecipient[];
    orgName: string;
    orgLogo?: string;
    workerUrl?: string;
    senderId?: string;
    senderName?: string;
    senderRole?: 'teacher' | 'admin';
    defaultCategory?: 'course' | 'exam' | 'announcement' | 'reminder' | 'grade' | 'general';
}

type Mode = 'compose' | 'batching' | 'history' | 'resend_auto';

interface EmailHistoryItem {
    id: string;
    subject: string;
    category: string;
    recipient_count: number;
    batches_count: number;
    dispatch_method: string;
    created_at: string;
    classroom_name?: string;
}

const TEMPLATES: Record<string, { label: string; icon: any; emoji: string; subject: string; body: string }> = {
    course: {
        label: 'Cours & Support',
        icon: BookOpen,
        emoji: '📚',
        subject: 'Nouveau cours et ressources pédagogiques disponibles',
        body: `Bonjour chers étudiants,

Un nouveau support de cours / chapitre est désormais accessible sur votre espace CampusFlow.

👉 Veuillez vous connecter pour consulter les documents et le programme d'apprentissage.

Travaillez avec assiduité et bonne révision à tous !`
    },
    exam: {
        label: 'Évaluation & Devoir',
        icon: FileCheck,
        emoji: '📝',
        subject: 'Avis important : Évaluation & Devoir à rendre',
        body: `Chers apprenants,

Une évaluation / devoir a été programmé. 

📅 Détails et consignes disponibles sur votre espace étudiant CampusFlow.
⚠️ Assurez-vous de respecter les délais de soumission.

Bon courage à tous !`
    },
    announcement: {
        label: 'Annonce Officielle',
        icon: Megaphone,
        emoji: '📢',
        subject: 'Communication officielle importante',
        body: `Chers étudiants et parents,

Veuillez prendre connaissance de cette communication officielle concernant le déroulement des cours et activités de l'établissement.

Retrouvez toutes les annonces à jour sur votre tableau de bord CampusFlow.`
    },
    reminder: {
        label: 'Rappel de séance',
        icon: BellRing,
        emoji: '⏰',
        subject: 'Rappel : Prochaine séance de cours',
        body: `Bonjour à tous,

Rappel pour votre prochaine séance de cours. 
Merci d'arriver à l'heure avec tout le matériel requis.

À très bientôt !`
    },
    grade: {
        label: 'Notes & Bulletins',
        icon: BarChart3,
        emoji: '📊',
        subject: 'Publication des notes et évaluations récentes',
        body: `Chers étudiants,

Les notes de vos récentes évaluations ont été publiées sur votre espace CampusFlow.
Connectez-vous pour consulter vos résultats et votre progression.

Félicitations pour vos efforts !`
    },
};

export function EmailModal({
    open,
    onClose,
    subject: defaultSubject = '',
    body: defaultBody = '',
    students = [],
    orgName = 'CampusFlow',
    orgLogo,
    workerUrl,
    senderId,
    senderName = 'Enseignant',
    senderRole = 'teacher',
    defaultCategory = 'general'
}: EmailModalProps) {
    const [mode, setMode] = useState<Mode>('compose');
    const [category, setCategory] = useState<string>(defaultCategory in TEMPLATES ? defaultCategory : 'course');
    const [subject, setSubject] = useState(defaultSubject || TEMPLATES.course.subject);
    const [body, setBody] = useState(defaultBody || TEMPLATES.course.body);
    const [imageUrl, setImageUrl] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');
    const [selectedClassroom, setSelectedClassroom] = useState<string>('all');
    
    // Batching options
    const [batchSize, setBatchSize] = useState<number>(100); // 50, 75, 100
    const [sentBatches, setSentBatches] = useState<Set<number>>(new Set());
    
    // Resend Auto State
    const [sendingResend, setSendingResend] = useState(false);
    const [resendResult, setResendResult] = useState<{ sent: number; error?: string } | null>(null);
    
    // History
    const [history, setHistory] = useState<EmailHistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [copiedBatch, setCopiedBatch] = useState<number | null>(null);

    const WORKER = workerUrl || process.env.NEXT_PUBLIC_WORKER_URL || 'https://campusflow-worker.kleintaptue1.workers.dev';

    // Filter students with valid emails
    const studentsWithEmail = useMemo(() => {
        return (students || []).filter(s => s.email && s.email.includes('@') && s.email.includes('.'));
    }, [students]);

    // Unique classrooms
    const classrooms = useMemo(() => {
        const set = new Set<string>();
        studentsWithEmail.forEach(s => {
            if (s.classroom_name) set.add(s.classroom_name);
        });
        return Array.from(set);
    }, [studentsWithEmail]);

    // Filtered by search and classroom
    const filteredStudents = useMemo(() => {
        return studentsWithEmail.filter(s => {
            const matchesClass = selectedClassroom === 'all' || s.classroom_name === selectedClassroom;
            const text = `${s.first_name || ''} ${s.last_name || ''} ${s.email || ''} ${s.classroom_name || ''}`.toLowerCase();
            const matchesSearch = !search || text.includes(search.toLowerCase());
            return matchesClass && matchesSearch;
        });
    }, [studentsWithEmail, selectedClassroom, search]);

    // Active selected students
    const targetStudents = useMemo(() => {
        return studentsWithEmail.filter(s => selectedIds.has(s.id));
    }, [studentsWithEmail, selectedIds]);

    // Split target emails into batches
    const emailBatches = useMemo(() => {
        const emails = targetStudents.map(s => s.email!).filter(Boolean);
        const batches: string[][] = [];
        for (let i = 0; i < emails.length; i += batchSize) {
            batches.push(emails.slice(i, i + batchSize));
        }
        return batches;
    }, [targetStudents, batchSize]);

    // Reset state on open
    useEffect(() => {
        if (open) {
            setMode('compose');
            if (defaultSubject) setSubject(defaultSubject);
            else if (TEMPLATES[category]) setSubject(TEMPLATES[category].subject);
            
            if (defaultBody) setBody(defaultBody);
            else if (TEMPLATES[category]) setBody(TEMPLATES[category].body);
            
            // Select all students with email by default
            setSelectedIds(new Set(studentsWithEmail.map(s => s.id)));
            setSentBatches(new Set());
            setResendResult(null);
            loadHistory();
        }
    }, [open, defaultSubject, defaultBody, studentsWithEmail]);

    // Load History
    const loadHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            // Try from Supabase
            const { data } = await supabase
                .from('email_dispatch_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (data && data.length > 0) {
                setHistory(data);
            } else {
                // Fallback to localStorage
                const local = localStorage.getItem('cf_email_dispatch_history');
                if (local) setHistory(JSON.parse(local));
            }
        } catch {
            const local = localStorage.getItem('cf_email_dispatch_history');
            if (local) setHistory(JSON.parse(local));
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    // Save history log
    const recordHistory = async (method: string, recipientCount: number, batchCount: number) => {
        const item: EmailHistoryItem = {
            id: 'log_' + Date.now(),
            subject: subject.trim(),
            category,
            recipient_count: recipientCount,
            batches_count: batchCount,
            dispatch_method: method,
            created_at: new Date().toISOString(),
            classroom_name: selectedClassroom !== 'all' ? selectedClassroom : undefined
        };

        // Save local
        try {
            const existing = JSON.parse(localStorage.getItem('cf_email_dispatch_history') || '[]');
            const updated = [item, ...existing].slice(0, 50);
            localStorage.setItem('cf_email_dispatch_history', JSON.stringify(updated));
            setHistory(updated);
        } catch {}

        // Save Supabase
        try {
            await supabase.from('email_dispatch_logs').insert({
                sender_id: senderId || null,
                sender_name: senderName,
                sender_role: senderRole,
                subject: subject.trim(),
                category,
                recipient_count: recipientCount,
                batches_count: batchCount,
                batch_size: batchSize,
                dispatch_method: method,
                image_url: imageUrl.trim() || null,
                preview_body: body.slice(0, 300),
                classroom_name: selectedClassroom !== 'all' ? selectedClassroom : null
            });
        } catch {}
    };

    // Apply template
    const handleSelectTemplate = (key: string) => {
        setCategory(key);
        if (TEMPLATES[key]) {
            setSubject(TEMPLATES[key].subject);
            setBody(TEMPLATES[key].body);
        }
    };

    // Toggle selection
    const toggleAll = () => {
        if (selectedIds.size === filteredStudents.length && filteredStudents.length > 0) {
            setSelectedIds(new Set());
        } else {
            const next = new Set(selectedIds);
            filteredStudents.forEach(s => next.add(s.id));
            setSelectedIds(next);
        }
    };

    const toggleStudent = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    // Build final full email content with footer and attachments
    const buildFullEmailBody = () => {
        let text = `${body.trim()}\n\n`;
        if (imageUrl.trim()) {
            text += `📷 Document / Image jointe :\n${imageUrl.trim()}\n\n`;
        }
        text += `────────────────────────────\n`;
        text += `🏫 ${orgName} · Envoyé par ${senderName}\n`;
        text += `🌐 Connectez-vous sur votre espace CampusFlow pour plus de détails.`;
        return text;
    };

    // Open Webmail Provider
    const openProvider = (provider: 'gmail' | 'yahoo' | 'outlook' | 'mailto', batchIndex: number) => {
        const batchEmails = emailBatches[batchIndex];
        if (!batchEmails || batchEmails.length === 0) return;

        const bcc = batchEmails.join(',');
        const fullBody = buildFullEmailBody();
        const encSubject = encodeURIComponent(subject.trim());
        const encBody = encodeURIComponent(fullBody);
        const encBcc = encodeURIComponent(bcc);

        let url = '';
        if (provider === 'gmail') {
            url = `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encBcc}&su=${encSubject}&body=${encBody}`;
        } else if (provider === 'yahoo') {
            url = `https://compose.mail.yahoo.com/?bcc=${encBcc}&subject=${encSubject}&body=${encBody}`;
        } else if (provider === 'outlook') {
            url = `https://outlook.live.com/mail/0/deeplink/compose?bcc=${encBcc}&subject=${encSubject}&body=${encBody}`;
        } else {
            // Standard mailto
            url = `mailto:?bcc=${encBcc}&subject=${encSubject}&body=${encBody}`;
        }

        // Open in new tab or trigger mailto
        if (provider === 'mailto') {
            window.location.href = url;
        } else {
            window.open(url, '_blank', 'noopener,noreferrer');
        }

        // Mark batch sent
        const updatedBatches = new Set(sentBatches);
        updatedBatches.add(batchIndex);
        setSentBatches(updatedBatches);

        // Record history
        recordHistory(provider, targetStudents.length, emailBatches.length);
        toast.success(`📨 Vague ${batchIndex + 1} ouverte dans ${provider.toUpperCase()} (${batchEmails.length} destinataires en Cci) !`);
    };

    // Copy all BCC emails in a batch
    const copyBatchBcc = (batchIndex: number) => {
        const batchEmails = emailBatches[batchIndex];
        if (!batchEmails) return;
        navigator.clipboard.writeText(batchEmails.join(', '));
        setCopiedBatch(batchIndex);
        setTimeout(() => setCopiedBatch(null), 2000);
        toast.success(`${batchEmails.length} adresses email copiées dans le presse-papier !`);
    };

    // Send via Resend (Worker API)
    const sendResendDirect = async () => {
        if (targetStudents.length === 0) return;
        setSendingResend(true);
        try {
            const recipients = targetStudents.map(s => s.email!).filter(Boolean);
            const html = `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0F172A;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:20px;">
    <div style="text-align:center;padding:30px 0 16px;">
      ${orgLogo ? `<img src="${orgLogo}" alt="${orgName}" style="height:54px;border-radius:12px;margin-bottom:12px;object-fit:contain;" />` : ''}
      <h1 style="color:#fff;font-size:20px;margin:0 0 4px;font-weight:800;">${orgName}</h1>
      <p style="color:#64748B;font-size:12px;margin:0;">Notification envoyée par ${senderName}</p>
    </div>
    <div style="background:#1E293B;border-radius:20px;padding:28px 30px;border:1px solid #334155;">
      <h2 style="color:#38BDF8;font-size:16px;font-weight:700;margin:0 0 14px;">${subject}</h2>
      <div style="color:#CBD5E1;font-size:14px;line-height:1.75;white-space:pre-line;">${body}</div>
      ${imageUrl ? `<div style="margin-top:20px;padding:12px;background:#0F172A;border-radius:12px;text-align:center;"><a href="${imageUrl}" target="_blank" style="color:#38BDF8;font-size:13px;text-decoration:none;font-weight:bold;">🔗 Voir la pièce jointe / image</a></div>` : ''}
    </div>
    <div style="text-align:center;padding:16px 0 8px;">
      <p style="color:#475569;font-size:11px;margin:0;">CampusFlow · ${orgName} · Tous droits réservés</p>
    </div>
  </div>
</body></html>`;

            const res = await fetch(`${WORKER}/api/email/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: recipients, subject, html, org_name: orgName, org_logo: orgLogo }),
            });
            const data = await res.json() as any;
            if (res.ok) {
                setResendResult({ sent: recipients.length });
                recordHistory('resend_auto', recipients.length, 1);
                toast.success(`✅ ${recipients.length} emails envoyés avec succès via Resend !`);
            } else {
                setResendResult({ sent: 0, error: data.error || 'Erreur d\'envoi serveur' });
            }
        } catch (e: any) {
            setResendResult({ sent: 0, error: e.message });
        } finally {
            setSendingResend(false);
        }
    };

    if (!open) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    onClick={onClose}
                />

                {/* Main Dialog */}
                <motion.div
                    initial={{ opacity: 0, y: 40, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 40 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative z-10 w-full sm:max-w-2xl bg-[#0C101A] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02] shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Mail className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="font-black text-white text-sm sm:text-base flex items-center gap-2">
                                    Envoi d&apos;Emails aux Étudiants
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                        Anti-Spam & Quotas
                                    </span>
                                </h2>
                                <p className="text-xs text-slate-400">
                                    {studentsWithEmail.length} étudiant(s) avec email valide · {orgName}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Mode Navigation Tabs */}
                    <div className="flex items-center border-b border-white/10 px-5 bg-white/[0.01] gap-2 overflow-x-auto shrink-0 py-2">
                        <button
                            onClick={() => setMode('compose')}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0',
                                mode === 'compose'
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            )}
                        >
                            <Sparkles className="w-3.5 h-3.5" /> 1. Composer & Destinataires ({selectedIds.size})
                        </button>
                        <button
                            onClick={() => {
                                if (selectedIds.size === 0) {
                                    toast.error('Veuillez sélectionner au moins un destinataire');
                                    return;
                                }
                                setMode('batching');
                            }}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0',
                                mode === 'batching'
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            )}
                        >
                            <Send className="w-3.5 h-3.5" /> 2. Vagues Anti-Spam (Gmail/Yahoo)
                        </button>
                        <button
                            onClick={() => setMode('history')}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ml-auto',
                                mode === 'history'
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            )}
                        >
                            <History className="w-3.5 h-3.5" /> Historique ({history.length})
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5">
                        
                        {/* ── MODE 1: COMPOSE & SELECT ── */}
                        {mode === 'compose' && (
                            <div className="space-y-4">
                                {/* Quick Templates */}
                                <div>
                                    <label className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-2">
                                        Modèles rapides de notification :
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                        {Object.entries(TEMPLATES).map(([key, t]) => {
                                            const isSelected = category === key;
                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => handleSelectTemplate(key)}
                                                    className={cn(
                                                        'flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all',
                                                        isSelected
                                                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-600/10'
                                                            : 'bg-white/[0.02] border-white/8 hover:bg-white/5 text-slate-400 hover:text-white'
                                                    )}
                                                >
                                                    <span className="text-lg mb-1">{t.emoji}</span>
                                                    <span className="text-[11px] font-black truncate w-full">{t.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Subject */}
                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                                        Objet de l&apos;email <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        value={subject}
                                        onChange={e => setSubject(e.target.value)}
                                        placeholder="Ex: Nouveau cours de Mathématiques - Chapitre 3"
                                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3.5 py-2.5 text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                {/* Body */}
                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                                        Message <span className="text-red-400">*</span>
                                    </label>
                                    <textarea
                                        value={body}
                                        onChange={e => setBody(e.target.value)}
                                        rows={5}
                                        placeholder="Rédigez votre message ici..."
                                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3.5 py-2.5 text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                                    />
                                </div>

                                {/* Image / Document Link */}
                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                                        <ImageIcon className="w-3.5 h-3.5 text-indigo-400" /> Lien d&apos;image ou document joint (optionnel)
                                    </label>
                                    <input
                                        value={imageUrl}
                                        onChange={e => setImageUrl(e.target.value)}
                                        placeholder="https://... (ex: lien Google Drive, support PDF ou image)"
                                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3.5 py-2 text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                {/* Recipients Selection Section */}
                                <div className="pt-2 border-t border-white/10 space-y-3">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div>
                                            <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                                                <Users className="w-4 h-4 text-indigo-400" /> Choix des Destinataires ({selectedIds.size} / {studentsWithEmail.length})
                                            </h4>
                                            <p className="text-[10px] text-slate-400">Seuls les élèves ayant un email renseigné sont affichés.</p>
                                        </div>
                                        <button
                                            onClick={toggleAll}
                                            className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 border border-white/10 transition"
                                        >
                                            {selectedIds.size === filteredStudents.length && filteredStudents.length > 0 ? 'Tout désélectionner' : 'Tout sélectionner'}
                                        </button>
                                    </div>

                                    {/* Classrooms filter & Search */}
                                    <div className="flex gap-2 flex-wrap">
                                        {classrooms.length > 0 && (
                                            <select
                                                value={selectedClassroom}
                                                onChange={e => setSelectedClassroom(e.target.value)}
                                                className="bg-white/5 border border-white/10 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                                            >
                                                <option value="all" className="bg-slate-900">Toutes les classes ({studentsWithEmail.length})</option>
                                                {classrooms.map(c => (
                                                    <option key={c} value={c} className="bg-slate-900">{c}</option>
                                                ))}
                                            </select>
                                        )}
                                        <div className="relative flex-1 min-w-[160px]">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                            <input
                                                value={search}
                                                onChange={e => setSearch(e.target.value)}
                                                placeholder="Filtrer par nom ou email..."
                                                className="w-full bg-white/5 border border-white/10 text-white rounded-xl pl-8 pr-3 py-1.5 text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Student List */}
                                    {filteredStudents.length === 0 ? (
                                        <div className="text-center py-6 bg-white/[0.01] border border-white/5 rounded-2xl">
                                            <p className="text-xs text-slate-400">Aucun étudiant trouvé avec une adresse email.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                            {filteredStudents.map(s => {
                                                const isChecked = selectedIds.has(s.id);
                                                return (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => toggleStudent(s.id)}
                                                        className={cn(
                                                            'w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all border',
                                                            isChecked
                                                                ? 'bg-indigo-600/15 border-indigo-500/40 text-white'
                                                                : 'bg-white/[0.02] border-white/5 hover:bg-white/5 text-slate-400'
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className={cn(
                                                                'w-4 h-4 rounded-md flex items-center justify-center border transition-all shrink-0',
                                                                isChecked ? 'bg-indigo-600 border-indigo-400' : 'border-slate-600'
                                                            )}>
                                                                {isChecked && <Check className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-white truncate">{s.first_name} {s.last_name}</p>
                                                                <p className="text-[10px] text-slate-400 truncate">{s.email}</p>
                                                            </div>
                                                        </div>
                                                        {s.classroom_name && (
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 shrink-0 ml-2">
                                                                {s.classroom_name}
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── MODE 2: BATCHING & DIRECT EMAIL SENDING (GMAIL / YAHOO / OUTLOOK) ── */}
                        {mode === 'batching' && (
                            <div className="space-y-5">
                                {/* Anti-Spam & Quota Info Banner */}
                                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                                        Protection Anti-Spam & Quotas Journaliers
                                    </div>
                                    <p className="text-xs text-amber-200/80 leading-relaxed">
                                        Les messageries classiques (<strong>Gmail, Yahoo, Outlook</strong>) limitent les comptes gratuits à <strong>500 envois / jour</strong> et max <strong>100 destinataires par message</strong>.
                                    </p>
                                    <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-slate-300">
                                        <span className="flex items-center gap-1 font-bold text-white">
                                            👥 {targetStudents.length} destinataires sélectionnés
                                        </span>
                                        <span className="flex items-center gap-1 font-bold text-emerald-400">
                                            📦 Découpés en {emailBatches.length} vague(s) de {batchSize} max
                                        </span>
                                        <span className="flex items-center gap-1 text-slate-400">
                                            🔒 Tous placés en <strong>Cci (Copie Cachée)</strong>
                                        </span>
                                    </div>
                                </div>

                                {/* Batch size selector */}
                                <div className="flex items-center justify-between bg-white/[0.02] border border-white/8 rounded-2xl p-3">
                                    <span className="text-xs font-bold text-slate-300">Taille de chaque vague :</span>
                                    <div className="flex items-center gap-1.5">
                                        {[50, 75, 100].map(sz => (
                                            <button
                                                key={sz}
                                                onClick={() => { setBatchSize(sz); setSentBatches(new Set()); }}
                                                className={cn(
                                                    'px-3 py-1 rounded-xl text-xs font-bold transition-all',
                                                    batchSize === sz
                                                        ? 'bg-indigo-600 text-white shadow-md'
                                                        : 'bg-white/5 text-slate-400 hover:text-white'
                                                )}
                                            >
                                                {sz} / vague {sz === 100 ? '(Max)' : ''}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* List of Batches */}
                                <div className="space-y-3">
                                    {emailBatches.map((batch, index) => {
                                        const isSent = sentBatches.has(index);
                                        const isFirst = index === 0;
                                        return (
                                            <div
                                                key={index}
                                                className={cn(
                                                    'p-4 rounded-2xl border transition-all space-y-3',
                                                    isSent
                                                        ? 'bg-emerald-500/5 border-emerald-500/30'
                                                        : 'bg-white/[0.02] border-white/10'
                                                )}
                                            >
                                                <div className="flex items-center justify-between flex-wrap gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(
                                                            'w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black',
                                                            isSent ? 'bg-emerald-500 text-slate-950' : 'bg-indigo-600 text-white'
                                                        )}>
                                                            {isSent ? <Check className="w-4 h-4" /> : index + 1}
                                                        </span>
                                                        <div>
                                                            <h5 className="text-xs font-black text-white">
                                                                Vague {index + 1} · {batch.length} étudiant(s)
                                                            </h5>
                                                            <p className="text-[10px] text-slate-400">
                                                                Étudiants #{index * batchSize + 1} à #{index * batchSize + batch.length}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => copyBatchBcc(index)}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-bold text-slate-300 border border-white/10 transition"
                                                            title="Copier les emails"
                                                        >
                                                            {copiedBatch === index ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                            {copiedBatch === index ? 'Copié !' : 'Copier'}
                                                        </button>
                                                        {isSent && (
                                                            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                                                                ✓ Ouvert
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Interval advice if multiple batches */}
                                                {!isFirst && !isSent && (
                                                    <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2">
                                                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                                        <span>Conseil anti-spam : Patientez <strong>15 à 30 minutes</strong> après la vague précédente avant d&apos;envoyer celle-ci.</span>
                                                    </div>
                                                )}

                                                {/* Buttons to open Webmail */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                                    {/* GMAIL */}
                                                    <button
                                                        onClick={() => openProvider('gmail', index)}
                                                        className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#EA4335]/15 hover:bg-[#EA4335]/25 border border-[#EA4335]/30 text-white text-xs font-bold transition-all shadow-sm"
                                                    >
                                                        <span className="font-black text-[#EA4335]">G</span> Gmail Web
                                                    </button>

                                                    {/* YAHOO */}
                                                    <button
                                                        onClick={() => openProvider('yahoo', index)}
                                                        className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#6001D2]/15 hover:bg-[#6001D2]/25 border border-[#6001D2]/30 text-white text-xs font-bold transition-all shadow-sm"
                                                    >
                                                        <span className="font-black text-[#872bf0]">Y!</span> Yahoo Mail
                                                    </button>

                                                    {/* OUTLOOK */}
                                                    <button
                                                        onClick={() => openProvider('outlook', index)}
                                                        className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#0078D4]/15 hover:bg-[#0078D4]/25 border border-[#0078D4]/30 text-white text-xs font-bold transition-all shadow-sm"
                                                    >
                                                        <span className="font-black text-[#0078D4]">O</span> Outlook Web
                                                    </button>

                                                    {/* DEFAULT CLIENT (MAILTO) */}
                                                    <button
                                                        onClick={() => openProvider('mailto', index)}
                                                        className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all shadow-sm"
                                                    >
                                                        <Mail className="w-3.5 h-3.5 text-indigo-400" /> Mailto Local
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Option: Resend Worker Alternative */}
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/8 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-slate-300">Envoi direct via API Cloudflare / Resend ?</p>
                                            <p className="text-[10px] text-slate-500">Pour envoyer automatiquement sans ouvrir votre boîte mail personnelle.</p>
                                        </div>
                                        <button
                                            onClick={sendResendDirect}
                                            disabled={sendingResend || targetStudents.length === 0}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold transition shadow-md"
                                        >
                                            {sendingResend ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                                            Envoi Direct Resend
                                        </button>
                                    </div>
                                    {resendResult?.error && (
                                        <p className="text-xs text-red-400 font-medium">⚠️ {resendResult.error}</p>
                                    )}
                                    {resendResult?.sent ? (
                                        <p className="text-xs text-emerald-400 font-medium">✅ {resendResult.sent} emails envoyés avec succès !</p>
                                    ) : null}
                                </div>
                            </div>
                        )}

                        {/* ── MODE 3: HISTORY ── */}
                        {mode === 'history' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                                            <History className="w-4 h-4 text-indigo-400" /> Historique des Notifications Email
                                        </h4>
                                        <p className="text-[10px] text-slate-400">Retrouvez les messages déjà envoyés et réutilisez leurs modèles.</p>
                                    </div>
                                    <button
                                        onClick={loadHistory}
                                        className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                                    >
                                        <RefreshCw className={cn('w-3.5 h-3.5', loadingHistory && 'animate-spin')} />
                                    </button>
                                </div>

                                {history.length === 0 ? (
                                    <div className="text-center py-12 bg-white/[0.01] border border-white/5 rounded-2xl">
                                        <Mail className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                                        <p className="text-xs font-bold text-slate-400">Aucun envoi enregistré pour le moment.</p>
                                        <p className="text-[10px] text-slate-500 mt-1">Vos prochains envois apparaîtront ici automatiquement.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {history.map((item, i) => (
                                            <div
                                                key={item.id || i}
                                                className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/8 hover:border-white/15 transition-all space-y-2"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <h5 className="text-xs font-black text-white truncate flex-1">{item.subject}</h5>
                                                    <span className="text-[10px] text-slate-500 font-mono">
                                                        {new Date(item.created_at).toLocaleDateString('fr-FR', {
                                                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold">
                                                            👥 {item.recipient_count} destinataire(s)
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                                                            {item.dispatch_method ? item.dispatch_method.toUpperCase() : 'DIRECT'}
                                                        </span>
                                                        {item.classroom_name && (
                                                            <span className="text-slate-500">{item.classroom_name}</span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setSubject(item.subject);
                                                            if (item.category) setCategory(item.category);
                                                            setMode('compose');
                                                            toast.success('Modèle rechargé dans le formulaire !');
                                                        }}
                                                        className="text-indigo-400 hover:text-indigo-300 font-bold text-[11px] flex items-center gap-1"
                                                    >
                                                        Réutiliser ce message <ChevronRight className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between shrink-0">
                        {mode === 'compose' ? (
                            <>
                                <p className="text-[11px] text-slate-400">
                                    <strong className="text-white">{selectedIds.size}</strong> étudiant(s) sélectionné(s)
                                </p>
                                <button
                                    onClick={() => {
                                        if (selectedIds.size === 0) {
                                            toast.error('Sélectionnez au moins un étudiant');
                                            return;
                                        }
                                        if (!subject.trim()) {
                                            toast.error('L\'objet de l\'email est obligatoire');
                                            return;
                                        }
                                        if (!body.trim()) {
                                            toast.error('Le contenu du message est obligatoire');
                                            return;
                                        }
                                        setMode('batching');
                                    }}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-600/20 transition-all"
                                >
                                    Suivant : Configurer les Vagues <ChevronRight className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => setMode('compose')}
                                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition"
                                >
                                    ← Modifier le message / Destinataires
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-bold transition"
                                >
                                    Fermer
                                </button>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
