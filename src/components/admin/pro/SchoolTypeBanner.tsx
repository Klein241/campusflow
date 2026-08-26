'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Building2, UserCheck, Globe, GraduationCap, School, Check, ChevronDown, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { SchoolTypeConfig, getSchoolTypeConfig } from '@/lib/school-type-adapter';
import { cn } from '@/lib/utils';

interface SchoolTypeBannerProps {
    org: any;
    config: SchoolTypeConfig;
    onTypeChanged: (newType: string) => void;
}

const SCHOOL_TYPES = [
    {
        id: 'centre_formation',
        label: 'Centre de Formation Professionnelle & Institut',
        desc: 'Formations courtes (1, 3, 6 mois, 1 an), sessions/cohortes, modules de compétences et attestations PRO.',
        icon: '🏢',
        color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300'
    },
    {
        id: 'formateur_independant',
        label: 'Formateur Indépendant, Coach & Consultant',
        desc: 'Interface simplifiée pour formateur solo : offres de formations, masterclasses, suivi apprenants.',
        icon: '🧑‍🏫',
        color: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300'
    },
    {
        id: 'academie_en_ligne',
        label: 'Académie en Ligne & E-Learning',
        desc: 'Bootcamps digitaux, cours vidéo/audio VOD, webinaires et certifications dématérialisées.',
        icon: '🌐',
        color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/40 text-blue-300'
    },
    {
        id: 'lycee',
        label: 'Lycée, Collège & École Primaire',
        desc: 'Système scolaire classique avec classes, matières, moyennes, bulletins trimestriels et discipline.',
        icon: '🏫',
        color: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/40 text-indigo-300'
    },
    {
        id: 'universite',
        label: 'Université & Enseignement Supérieur',
        desc: 'Facultés, départements, unités d\'enseignement (UE), crédits ECTS et cycles LMD.',
        icon: '🎓',
        color: 'from-purple-500/20 to-pink-500/20 border-purple-500/40 text-purple-300'
    }
];

export function SchoolTypeBanner({ org, config, onTypeChanged }: SchoolTypeBannerProps) {
    const [showModal, setShowModal] = useState(false);
    const [updating, setUpdating] = useState(false);

    const handleChangeType = async (typeId: string) => {
        setUpdating(true);
        try {
            const { error } = await supabase
                .from('organizations')
                .update({ school_type: typeId })
                .eq('id', org.id);

            if (error) throw error;

            toast.success(`Mode mis à jour : ${typeId}`);
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
            {/* Badge cliquable dans la barre supérieure ou les paramètres */}
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
                    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-xl bg-[#0E131F] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <div>
                                    <h3 className="text-base font-black text-white flex items-center gap-2">
                                        <span>Type & Structure de votre Établissement</span>
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Le backoffice adapte son vocabulaire, ses onglets et ses fonctionnalités à votre activité.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-2.5">
                                {SCHOOL_TYPES.map(st => {
                                    const isCurrent = (org.school_type || '').toLowerCase().includes(st.id);
                                    return (
                                        <button
                                            key={st.id}
                                            onClick={() => handleChangeType(st.id)}
                                            disabled={updating}
                                            className={cn(
                                                "w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 relative overflow-hidden group",
                                                isCurrent
                                                    ? "bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5"
                                                    : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/15"
                                            )}
                                        >
                                            <span className="text-2xl p-2 rounded-xl bg-white/5 border border-white/10 shrink-0">
                                                {st.icon}
                                            </span>
                                            <div className="space-y-1 flex-1">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-black text-sm text-white group-hover:text-emerald-300 transition-colors">
                                                        {st.label}
                                                    </h4>
                                                    {isCurrent && (
                                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase">
                                                            Actif
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400 leading-relaxed">
                                                    {st.desc}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
