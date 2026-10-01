'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { SchoolTypeConfig } from '@/lib/school-type-adapter';
import { cn } from '@/lib/utils';

interface SchoolTypeBannerProps {
    org: any;
    config: SchoolTypeConfig;
    onTypeChanged: (newType: string) => void;
}

const SCHOOL_TYPES = [
    {
        id: 'centre_formation',
        category: 'training_center',
        label: 'Centre de Formation Professionnelle & Institut',
        desc: 'Formations courtes (1, 3, 6 mois, 1 an), sessions/cohortes, modules de compétences et attestations PRO.',
        icon: '🏢',
        color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300'
    },
    {
        id: 'formateur_independant',
        category: 'independent_trainer',
        label: 'Formateur Indépendant, Coach & Consultant',
        desc: 'Interface simplifiée pour formateur solo : offres de formations, masterclasses, suivi apprenants.',
        icon: '🧑‍🏫',
        color: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300'
    },
    {
        id: 'academie_en_ligne',
        category: 'online_academy',
        label: 'Académie en Ligne & E-Learning',
        desc: 'Bootcamps digitaux, cours vidéo/audio VOD, webinaires et certifications dématérialisées.',
        icon: '🌐',
        color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/40 text-blue-300'
    },
    {
        id: 'lycee',
        category: 'k12_school',
        label: 'Lycée, Collège & École Primaire',
        desc: 'Système scolaire classique avec classes, matières, moyennes, bulletins trimestriels et discipline.',
        icon: '🏫',
        color: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/40 text-indigo-300'
    },
    {
        id: 'universite',
        category: 'higher_education',
        label: 'Université & Enseignement Supérieur',
        desc: 'Facultés, départements, unités d\'enseignement (UE), crédits ECTS et cycles LMD.',
        icon: '🎓',
        color: 'from-purple-500/20 to-pink-500/20 border-purple-500/40 text-purple-300'
    }
];

export function SchoolTypeBanner({ org, config, onTypeChanged }: SchoolTypeBannerProps) {
    const [showModal, setShowModal] = useState(false);
    const [updating, setUpdating] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

    // Réinitialiser le scroll tout en haut dès que la modale s'ouvre
    useEffect(() => {
        if (showModal) {
            const timer = setTimeout(() => {
                if (listRef.current) {
                    listRef.current.scrollTop = 0;
                }
            }, 30);
            return () => clearTimeout(timer);
        }
    }, [showModal]);

    // Fermeture avec la touche Échap
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowModal(false);
        };
        if (showModal) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [showModal]);

    const handleChangeType = async (typeId: string) => {
        setUpdating(true);
        try {
            const DB_TYPE_MAP: Record<string, string> = {
                centre_formation: 'centre_formation',
                formateur_independant: 'centre_formation',
                academie_en_ligne: 'centre_formation',
                lycee: 'lycee',
                college: 'college',
                universite: 'universite',
            };
            const mappedType = DB_TYPE_MAP[typeId] || 'autre';

            const { error } = await supabase
                .from('organizations')
                .update({ school_type: typeId, type: mappedType })
                .eq('id', org.id);

            if (error) throw error;

            toast.success(`Mode mis à jour avec succès !`);
            onTypeChanged(typeId);
            setShowModal(false);
        } catch (e: any) {
            toast.error('Erreur : ' + e.message);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <>
            {/* Badge cliquable dans la barre supérieure */}
            <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-slate-300 hover:text-white transition-all shadow-sm group"
                title="Cliquez pour changer le mode d'établissement (Centre Pro, Formateur Indépendant, Lycée, etc.)"
            >
                <span className="text-sm">{config.badgeIcon}</span>
                <span className="font-bold text-white text-[11px]">{config.categoryLabel}</span>
                <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-transform" />
            </button>

            {/* Modal de sélection de type d'établissement */}
            <AnimatePresence>
                {showModal && (
                    <div
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm overflow-y-auto p-3 sm:p-4 flex justify-center items-start sm:items-center"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setShowModal(false);
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: -8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: -8 }}
                            transition={{ duration: 0.15 }}
                            className="w-full max-w-xl bg-[#0E131F] border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto relative"
                        >
                            {/* Header fixe — ne scrolle jamais */}
                            <div className="flex items-center justify-between border-b border-white/10 pb-3.5 mb-3 shrink-0">
                                <div>
                                    <h3 className="text-base font-black text-white flex items-center gap-2">
                                        <span>Type & Structure de votre Établissement</span>
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Sélectionnez la structure adaptée pour ajuster instantanément vos onglets et vos fonctionnalités.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                    title="Fermer"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Liste défilante scrollable avec barre de défilement propre */}
                            <div
                                ref={listRef}
                                className="flex-1 overflow-y-auto pr-1 space-y-2 sm:space-y-2.5 max-h-[58vh] sm:max-h-[64vh] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/30"
                            >
                                {SCHOOL_TYPES.map(st => {
                                    const isCurrent =
                                        config.category === st.category ||
                                        (org.school_type || org.type || '').toLowerCase().includes(st.id);

                                    return (
                                        <button
                                            key={st.id}
                                            onClick={() => handleChangeType(st.id)}
                                            disabled={updating}
                                            className={cn(
                                                "w-full text-left p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center gap-3.5 relative overflow-hidden group",
                                                isCurrent
                                                    ? "bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border-emerald-500/60 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30"
                                                    : "bg-white/[0.02] border-white/[0.07] hover:bg-white/[0.05] hover:border-white/20"
                                            )}
                                        >
                                            <span className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                                                {st.icon}
                                            </span>
                                            <div className="space-y-0.5 flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4 className={cn(
                                                        "font-black text-sm transition-colors truncate",
                                                        isCurrent ? "text-emerald-300" : "text-white group-hover:text-emerald-300"
                                                    )}>
                                                        {st.label}
                                                    </h4>
                                                    {isCurrent && (
                                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase shrink-0 flex items-center gap-1">
                                                            <Check className="w-3 h-3 stroke-[3]" />
                                                            Actif
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400 leading-snug line-clamp-2">
                                                    {st.desc}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Footer fixe */}
                            <div className="pt-3 mt-2 border-t border-white/10 shrink-0 flex items-center justify-between text-[11px] text-slate-400">
                                <span>{SCHOOL_TYPES.length} modes d'établissement disponibles</span>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-slate-300 hover:text-white font-bold transition-colors"
                                >
                                    Fermer
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
