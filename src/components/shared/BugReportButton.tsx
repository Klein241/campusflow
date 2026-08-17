'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, X, Upload, Send, Loader2, CheckCircle2, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { uploadToR2 } from '@/lib/r2';

interface BugReportModalProps {
    userId: string;
    userName: string;
    userRole: 'student' | 'teacher' | 'admin';
    orgId: string;
    orgName: string;
    orgSlug: string;
}

export function BugReportButton({ userId, userName, userRole, orgId, orgName, orgSlug }: BugReportModalProps) {
    const [open, setOpen] = useState(false);
    const [sent, setSent] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (f.size > 5 * 1024 * 1024) { toast.error('Image trop lourde (max 5 Mo)'); return; }
        setScreenshot(f);
        setPreviewUrl(URL.createObjectURL(f));
    };

    const handleSubmit = async () => {
        if (!title.trim() || !description.trim()) {
            toast.error('Titre et description requis');
            return;
        }
        setSending(true);
        try {
            let screenshot_url: string | null = null;

            if (screenshot) {
                const uploaded = await uploadToR2(screenshot, `bug-reports/${orgSlug || 'global'}`);
                screenshot_url = uploaded?.url || null;
            }

            const { error } = await supabase.from('bug_reports').insert({
                user_id: userId,
                user_name: userName,
                user_role: userRole,
                org_id: orgId,
                org_name: orgName,
                org_slug: orgSlug,
                title: title.trim(),
                description: description.trim(),
                screenshot_url,
                status: 'open',
            });

            if (error) throw error;

            setSent(true);
            setTimeout(() => {
                setSent(false);
                setOpen(false);
                setTitle('');
                setDescription('');
                setScreenshot(null);
                setPreviewUrl(null);
            }, 2500);
        } catch (e: any) {
            toast.error('Erreur : ' + e.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            {/* Floating bug button */}
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/25 text-orange-400 text-xs font-bold transition-all group"
            >
                <Bug className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                Signaler un Bug
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="w-full max-w-lg bg-[#0D0F1A] border border-orange-500/20 rounded-3xl shadow-2xl shadow-orange-500/5 overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
                                        <Bug className="w-4 h-4 text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="font-black text-sm text-white">Signaler un Bug</p>
                                        <p className="text-[10px] text-slate-500">Envoyé directement à l'équipe technique</p>
                                    </div>
                                </div>
                                <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {sent ? (
                                <div className="p-10 flex flex-col items-center gap-4 text-center">
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                                    </motion.div>
                                    <div>
                                        <p className="font-black text-white text-base">Rapport envoyé !</p>
                                        <p className="text-xs text-slate-400 mt-1">Merci pour votre signalement. Notre équipe va examiner le problème.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-5 space-y-4">
                                    {/* Title */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 block mb-1.5">Titre du problème <span className="text-red-400">*</span></label>
                                        <input
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            placeholder="Ex: Le bouton S'inscrire ne répond pas..."
                                            className="w-full bg-white/5 border border-white/10 text-white h-10 rounded-xl text-sm px-3 placeholder:text-slate-600 focus:outline-none focus:border-orange-500/40"
                                        />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 block mb-1.5">Description détaillée <span className="text-red-400">*</span></label>
                                        <textarea
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            placeholder="Décrivez le bug : que s'est-il passé ? Quelles étapes pour le reproduire ? Sur quel appareil ?"
                                            rows={4}
                                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl text-sm px-3 py-2.5 placeholder:text-slate-600 focus:outline-none focus:border-orange-500/40 resize-none"
                                        />
                                    </div>

                                    {/* Screenshot */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 block mb-1.5">Capture d&apos;écran (optionnel)</label>
                                        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

                                        {previewUrl ? (
                                            <div className="relative rounded-xl overflow-hidden border border-white/10">
                                                <img src={previewUrl} alt="Screenshot" className="w-full max-h-40 object-cover" />
                                                <button
                                                    onClick={() => { setScreenshot(null); setPreviewUrl(null); }}
                                                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-red-500/80 transition-all"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => fileRef.current?.click()}
                                                className="w-full h-24 rounded-xl border border-dashed border-white/15 hover:border-orange-500/40 hover:bg-orange-500/5 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-orange-400 transition-all"
                                            >
                                                <ImageIcon className="w-6 h-6" />
                                                <span className="text-xs font-medium">Cliquer pour joindre une image</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 text-xs text-blue-300">
                                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>Ce rapport sera envoyé à l&apos;équipe technique IziTeach pour analyse et résolution rapide.</span>
                                    </div>

                                    {/* Submit */}
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={sending || !title.trim() || !description.trim()}
                                        className="w-full h-11 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 font-black rounded-xl shadow-lg shadow-orange-500/20 text-sm"
                                    >
                                        {sending ? (
                                            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Envoi en cours...</>
                                        ) : (
                                            <><Send className="w-4 h-4 mr-2" />Envoyer le rapport</>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
