'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Globe, X, BookOpen, Trash2, Search,
    Maximize2, Copy, Check, Clock, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    getSavedTranslations,
    deleteSavedTranslation,
    TranslatedItem
} from '@/lib/course-translation-service';
import { QualityStars } from './translation-dialog';
import { toast } from 'sonner';

interface TranslatedCoursesModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    onOpenLessonReader?: (lesson: any) => void;
}

export function TranslatedCoursesModal({
    isOpen,
    onClose,
    userId,
    onOpenLessonReader
}: TranslatedCoursesModalProps) {
    const [items, setItems] = useState<TranslatedItem[]>([]);
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState<TranslatedItem | null>(null);
    const [copied, setCopied] = useState(false);

    const loadItems = () => {
        setItems(getSavedTranslations(userId));
    };

    useEffect(() => {
        if (isOpen) {
            loadItems();
        }
        const handler = () => loadItems();
        window.addEventListener('iziteach_translations_changed', handler);
        return () => window.removeEventListener('iziteach_translations_changed', handler);
    }, [isOpen, userId]);

    if (!isOpen) return null;

    const filtered = items.filter(it => {
        const q = search.toLowerCase();
        return (
            it.title.toLowerCase().includes(q) ||
            it.target_lang_name.toLowerCase().includes(q) ||
            it.target_lang_native.toLowerCase().includes(q) ||
            (it.chapter_title && it.chapter_title.toLowerCase().includes(q)) ||
            (it.subject_title && it.subject_title.toLowerCase().includes(q))
        );
    });

    const handleDelete = (item: TranslatedItem, e: React.MouseEvent) => {
        e.stopPropagation();
        deleteSavedTranslation(userId, item.id, item.target_lang);
        if (selectedItem?.id === item.id && selectedItem?.target_lang === item.target_lang) {
            setSelectedItem(null);
        }
        toast.success(`Traduction en ${item.target_lang_native} supprimée de votre historique local.`);
    };

    const handleCopy = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Texte traduit copié dans le presse-papier !');
        setTimeout(() => setCopied(false), 1800);
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 20 }}
                    transition={{ duration: 0.2 }}
                    onClick={e => e.stopPropagation()}
                    className="w-full max-w-4xl max-h-[88vh] bg-[#0c101d] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl flex flex-col overflow-hidden space-y-4"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                <Globe className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <span>Mes cours traduits</span>
                                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                                        {items.length} contenu{items.length > 1 ? 's' : ''}
                                    </span>
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Historique de vos leçons et chapitres traduits par IziTeach IA (accès rapide hors-ligne)
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-400 hover:text-white transition">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Barre de recherche */}
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Rechercher par titre, matière, langue (ex: Lingála, Swahili, Marketing...)"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/40"
                        />
                    </div>

                    {/* Contenu principal divisé en deux panneaux si un élément est sélectionné */}
                    <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Liste des cours traduits */}
                        <div className={cn(
                            "overflow-y-auto space-y-2 pr-1",
                            selectedItem ? "md:col-span-5" : "md:col-span-12"
                        )}>
                            {filtered.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                                    <Globe className="w-12 h-12 text-slate-700" />
                                    <p className="text-sm font-semibold text-slate-400">
                                        {search ? 'Aucun cours traduit ne correspond à votre recherche' : 'Vous n\'avez pas encore traduit de cours'}
                                    </p>
                                    <p className="text-xs text-slate-600 max-w-sm">
                                        Cliquez sur le bouton "Traduire" sur une leçon ou un chapitre pour générer une traduction automatique avec IziTeach IA.
                                    </p>
                                </div>
                            ) : (
                                filtered.map(item => {
                                    const isSelected = selectedItem?.id === item.id && selectedItem?.target_lang === item.target_lang;
                                    return (
                                        <div
                                            key={`${item.id}_${item.target_lang}`}
                                            onClick={() => setSelectedItem(item)}
                                            className={cn(
                                                "p-3.5 rounded-2xl border transition-all cursor-pointer relative group",
                                                isSelected
                                                    ? "bg-emerald-500/20 border-emerald-500/50 shadow-lg shadow-emerald-950/40"
                                                    : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-emerald-500/30"
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                            {item.target_lang_native} ({item.target_lang_name})
                                                        </span>
                                                        <QualityStars stars={item.quality_stars} />
                                                        <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
                                                            <Clock className="w-2.5 h-2.5" />
                                                            {new Date(item.translated_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                                                    {(item.subject_title || item.chapter_title) && (
                                                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                                            {item.subject_title}{item.chapter_title ? ` › ${item.chapter_title}` : ''}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => handleDelete(item, e)}
                                                    title="Supprimer du stockage local"
                                                    className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition shrink-0 opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Panneau de lecture de la traduction sélectionnée */}
                        {selectedItem && (
                            <div className="md:col-span-7 bg-[#090d18] border border-white/[0.08] rounded-2xl p-4 flex flex-col overflow-hidden">
                                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3 shrink-0">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                {selectedItem.target_lang_native}
                                            </span>
                                            <QualityStars stars={selectedItem.quality_stars} />
                                        </div>
                                        <h4 className="text-xs font-bold text-white truncate mt-1">{selectedItem.title}</h4>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            onClick={() => handleCopy(selectedItem.translated_text)}
                                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 hover:text-white text-[10px] font-semibold transition"
                                        >
                                            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                            {copied ? 'Copié' : 'Copier'}
                                        </button>
                                        {onOpenLessonReader && selectedItem.type === 'lesson' && (
                                            <button
                                                onClick={() => {
                                                    onOpenLessonReader({
                                                        id: selectedItem.id,
                                                        title: selectedItem.title,
                                                        content: selectedItem.translated_text,
                                                        content_original: selectedItem.original_text,
                                                        language: selectedItem.target_lang,
                                                        chapter_title: selectedItem.chapter_title,
                                                        subject_title: selectedItem.subject_title
                                                    });
                                                    onClose();
                                                }}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition shadow-md shadow-emerald-950"
                                            >
                                                <Maximize2 className="w-3 h-3" />
                                                Lire en plein écran
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Texte traduit */}
                                <div className="flex-1 overflow-y-auto pr-2 space-y-3 select-text text-slate-200 text-xs leading-relaxed whitespace-pre-line font-sans">
                                    {selectedItem.translated_text}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                            Propulsé par <strong>IziTeach IA</strong> — Vos cours traduits restent toujours disponibles
                        </span>
                        <button
                            onClick={onClose}
                            className="px-4 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-white text-xs font-semibold transition"
                        >
                            Fermer
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
