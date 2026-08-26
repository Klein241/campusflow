'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Star, X, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    startBackgroundTranslation,
    getActiveTaskForItem,
    getSavedTranslation,
    TranslatedItem,
    TranslationTask
} from '@/lib/course-translation-service';
import { toast } from 'sonner';

export interface LangCatalogEntry {
    code: string;
    name_fr: string;
    name_native: string;
    quality_stars: 1 | 2 | 3 | 4 | 5;
    quality_label: string;
    is_african: boolean;
    countries: string[];
}

const WORKER_URL = 'https://campusflow-worker.kleintaptue1.workers.dev';

export function QualityStars({ stars }: { stars: number }) {
    const colors = ['text-red-400', 'text-orange-400', 'text-yellow-400', 'text-lime-400', 'text-emerald-400'];
    const color = colors[Math.min(Math.max(stars - 1, 0), 4)];
    return (
        <span className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn('w-2.5 h-2.5', i < stars ? `${color} fill-current` : 'text-white/10 fill-current')} />
            ))}
        </span>
    );
}

interface TranslationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    itemId: string;
    type: 'lesson' | 'chapter';
    title: string;
    rawText: string;
    userId: string;
    chapterTitle?: string;
    subjectTitle?: string;
    onOpenReader?: (item: TranslatedItem) => void;
}

export function TranslationDialog({
    isOpen,
    onClose,
    itemId,
    type,
    title,
    rawText,
    userId,
    chapterTitle,
    subjectTitle,
    onOpenReader
}: TranslationDialogProps) {
    const [languages, setLanguages] = useState<LangCatalogEntry[]>([]);
    const [loadingLangs, setLoadingLangs] = useState(false);
    const [activeTask, setActiveTask] = useState<TranslationTask | undefined>(undefined);
    const [selectedLangCode, setSelectedLangCode] = useState<string | null>(null);

    // Charger les langues
    useEffect(() => {
        if (isOpen && languages.length === 0) {
            setLoadingLangs(true);
            fetch(`${WORKER_URL}/api/translate/languages`)
                .then(r => r.json())
                .then((data: any) => {
                    if (data.languages) {
                        const list: LangCatalogEntry[] = Object.values(data.languages);
                        setLanguages(list.sort((a, b) => b.quality_stars - a.quality_stars));
                    }
                })
                .catch(() => {})
                .finally(() => setLoadingLangs(false));
        }
    }, [isOpen, languages.length]);

    // Écouter l'état de la tâche active
    useEffect(() => {
        if (!isOpen) return;
        const task = getActiveTaskForItem(itemId);
        setActiveTask(task);

        const handleUpdate = () => {
            const t = getActiveTaskForItem(itemId);
            setActiveTask(t);
        };

        window.addEventListener('iziteach_translation_tasks_updated', handleUpdate);
        return () => window.removeEventListener('iziteach_translation_tasks_updated', handleUpdate);
    }, [isOpen, itemId]);

    if (!isOpen) return null;

    const handleSelectLanguage = async (lang: LangCatalogEntry) => {
        setSelectedLangCode(lang.code);

        // Si déjà en cache, ouvrir directement
        const cached = getSavedTranslation(userId, itemId, lang.code);
        if (cached) {
            toast.success(`Traduction en ${lang.name_native} chargée depuis vos cours traduits !`);
            if (onOpenReader) onOpenReader(cached);
            onClose();
            return;
        }

        if (!rawText || !rawText.trim()) {
            toast.error('Aucun contenu textuel à traduire.');
            return;
        }

        try {
            toast.info(`🚀 Traduction en ${lang.name_native} démarrée en arrière-plan avec IziTeach IA...`);
            startBackgroundTranslation({
                itemId,
                type,
                title,
                rawText,
                targetLang: lang.code,
                targetLangName: lang.name_fr,
                targetLangNative: lang.name_native,
                qualityStars: lang.quality_stars,
                userId,
                chapterTitle,
                subjectTitle,
                onCompleted: (item) => {
                    toast.success(`🎉 Traduction en ${item.target_lang_native} terminée !`);
                },
                onError: (err) => {
                    toast.error(`Erreur de traduction : ${err}`);
                }
            });
        } catch {
            // handled
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ duration: 0.2 }}
                    onClick={e => e.stopPropagation()}
                    className="w-full max-w-xl max-h-[85vh] bg-[#0c101d] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl flex flex-col overflow-hidden space-y-4"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                <Globe className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <span>Traduire avec IziTeach IA</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                                        Multi-langues
                                    </span>
                                </h3>
                                <p className="text-xs text-slate-400 truncate max-w-sm mt-0.5">
                                    {type === 'chapter' ? 'Chapitre : ' : 'Leçon : '} {title}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-400 hover:text-white transition">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Tâche active en cours avec barre de pourcentage */}
                    {activeTask && (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-emerald-950/40 border border-emerald-500/40 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Traduction en {activeTask.targetLangNative} ({activeTask.targetLangName})</span>
                                </div>
                                <span className="font-mono font-bold text-emerald-400">{activeTask.progress}%</span>
                            </div>
                            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-emerald-500/20">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                                    style={{ width: `${activeTask.progress}%` }}
                                    transition={{ ease: 'easeOut', duration: 0.3 }}
                                />
                            </div>
                            <p className="text-[11px] text-slate-400 italic text-center">
                                ⏳ Veuillez patienter ! Vous pouvez refermer cette fenêtre, la traduction continue en arrière-plan.
                            </p>
                        </div>
                    )}

                    {/* Liste des langues */}
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                        {loadingLangs ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs gap-2">
                                <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                                <span>Chargement des langues et niveaux de qualité...</span>
                            </div>
                        ) : (
                            <>
                                {/* Langues Internationales */}
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <span>🌐 Langues Internationales</span>
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {languages.filter(l => !l.is_african && l.code !== 'fr').map(lang => {
                                            const isSaved = Boolean(getSavedTranslation(userId, itemId, lang.code));
                                            return (
                                                <button
                                                    key={lang.code}
                                                    onClick={() => handleSelectLanguage(lang)}
                                                    className={cn(
                                                        "flex flex-col items-start p-2.5 rounded-2xl border text-left transition-all relative overflow-hidden group",
                                                        isSaved
                                                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25"
                                                            : "bg-white/[0.03] border-white/[0.06] text-slate-300 hover:border-emerald-500/30 hover:bg-white/[0.06]"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <span className="font-bold text-xs text-white">{lang.name_native}</span>
                                                        {isSaved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400">{lang.name_fr}</span>
                                                    <div className="mt-1.5 flex items-center justify-between w-full">
                                                        <QualityStars stars={lang.quality_stars} />
                                                        <span className="text-[9px] text-slate-500 font-medium">{lang.quality_label}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Langues Africaines */}
                                <div>
                                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <span>🌍 Langues Africaines Locales & Régionales</span>
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {languages.filter(l => l.is_african).map(lang => {
                                            const isSaved = Boolean(getSavedTranslation(userId, itemId, lang.code));
                                            return (
                                                <button
                                                    key={lang.code}
                                                    onClick={() => handleSelectLanguage(lang)}
                                                    className={cn(
                                                        "flex flex-col items-start p-2.5 rounded-2xl border text-left transition-all relative overflow-hidden group",
                                                        isSaved
                                                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25"
                                                            : lang.quality_stars >= 3
                                                                ? "bg-white/[0.03] border-white/[0.06] text-slate-300 hover:border-emerald-500/30 hover:bg-white/[0.06]"
                                                                : "bg-white/[0.015] border-white/[0.04] text-slate-400 hover:border-white/10 hover:bg-white/[0.04]"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <span className="font-bold text-xs text-white">{lang.name_native}</span>
                                                        {isSaved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400">{lang.name_fr}</span>
                                                    <div className="mt-1.5 flex items-center justify-between w-full">
                                                        <QualityStars stars={lang.quality_stars} />
                                                        <span className={cn(
                                                            "text-[9px] font-medium",
                                                            lang.quality_stars <= 2 ? "text-orange-400" : "text-slate-500"
                                                        )}>
                                                            {lang.quality_label}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                            Généré instantanément par <strong>IziTeach IA</strong>
                        </span>
                        <span>Sauvegardé hors-ligne sur votre appareil</span>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
