'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard, DollarSign, CheckCircle2, Sparkles,
    Calendar, ShieldCheck, TrendingUp, Users, Award,
    Zap, ArrowRight, Check, HelpCircle, Building2,
    Briefcase, GraduationCap, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { SchoolTypeConfig, OrganizationCategory } from '@/lib/school-type-adapter';
import { cn } from '@/lib/utils';

interface AdminProPricingGridProps {
    org: any;
    config: SchoolTypeConfig;
    onSaved?: () => void;
}

export function AdminProPricingGrid({
    org,
    config,
    onSaved
}: AdminProPricingGridProps) {
    // Simulateur d'échéancier pour les stagiaires
    const [simTuition, setSimTuition] = useState<number>(150000);
    const [simRegFee, setSimRegFee] = useState<number>(25000);
    const [simDuration, setSimDuration] = useState<string>('3_months');

    // Grille de plans selon la catégorie d'établissement
    const plans = [
        {
            id: 'solo_pro',
            name: 'Formateur Solo & Coach',
            target: 'independent_trainer',
            icon: '🧑‍🏫',
            tagline: 'Pour coachs, consultants et formateurs indépendants',
            price: '15 000 FCFA',
            period: '/ mois ou 120k / an',
            color: 'from-amber-500 to-orange-500',
            border: 'border-amber-500/30',
            features: [
                'Jusqu\'à 50 apprenants actifs / an',
                'Attestations certifiées illimitées (PDF)',
                'Page profil formateur & Liens d\'inscription',
                'Tableau de suivi des compétences',
                '0% de commission sur vos encaissements',
                'Support WhatsApp prioritaire'
            ],
            isPopular: config.category === 'independent_trainer'
        },
        {
            id: 'pro_center',
            name: 'Centre de Formation PRO',
            target: 'training_center',
            icon: '🏢',
            tagline: 'Pour instituts de métiers, centres agréés et bootcamps',
            price: '35 000 FCFA',
            period: '/ mois ou 320k / an',
            color: 'from-emerald-500 to-teal-500',
            border: 'border-emerald-500/30',
            features: [
                'Multi-sessions & cohortes simultanées (1 à 36 mois)',
                'Diplômes & Attestations PRO avec grille de modules',
                'Échéanciers & suivi des paiements par tranche',
                'Émargement & planning des ateliers pratiques',
                'Gestion de plusieurs formateurs & consultants',
                'Vérification en ligne des attestations par QR Code',
                '1 000 Sky Points IA inclus / mois'
            ],
            isPopular: config.category === 'training_center'
        },
        {
            id: 'digital_campus',
            name: 'Académie en Ligne & E-Learning',
            target: 'online_academy',
            icon: '🌐',
            tagline: 'Pour bootcamps 100% digitaux et créateurs de cours',
            price: '45 000 FCFA',
            period: '/ mois ou 400k / an',
            color: 'from-blue-500 to-indigo-500',
            border: 'border-blue-500/30',
            features: [
                'Cohortes en ligne & programmes illimités',
                'Lecteur de cours interactif (VOD / Audio / Quiz)',
                'Traductions automatiques multilingues (M2M100)',
                'Dame SKY — Agent IA de révision & modération 24/7',
                'Certificats numériques téléchargeables',
                '2 500 Sky Points IA inclus / mois'
            ],
            isPopular: config.category === 'online_academy'
        },
        {
            id: 'k12_institution',
            name: 'Lycée / Collège / Université',
            target: 'k12_school',
            icon: '🏫',
            tagline: 'Pour écoles primaires, collèges, lycées et facultés',
            price: 'Sur Devis',
            period: '/ an selon effectif',
            color: 'from-purple-500 to-pink-500',
            border: 'border-purple-500/30',
            features: [
                'Gestion des classes, matières & coefficients',
                'Génération des bulletins scolaires trimestriels',
                'Emploi du temps par semaine & gestion des salles',
                'Discipline, sanctions & alertes WhatsApp parents',
                'Relevés de notes & attestations de scolarité',
                'Comptabilité scolaire & gestion de la trésorerie'
            ],
            isPopular: config.category === 'k12_school' || config.category === 'higher_education'
        }
    ];

    // Calcul des tranches automatiques selon la durée sélectionnée
    const calculateInstallments = () => {
        const total = simTuition;
        switch (simDuration) {
            case '1_month':
                return [
                    { name: 'Acompte à l\'inscription', amount: Math.round(total * 0.6), percent: '60%' },
                    { name: 'Solde mi-parcours (J+15)', amount: Math.round(total * 0.4), percent: '40%' }
                ];
            case '3_months':
                return [
                    { name: '1ère mensualité (Inscription)', amount: Math.round(total * 0.4), percent: '40%' },
                    { name: '2ème mensualité (Mois 2)', amount: Math.round(total * 0.3), percent: '30%' },
                    { name: '3ème mensualité (Mois 3 - Solde)', amount: Math.round(total * 0.3), percent: '30%' }
                ];
            case '6_months':
                return [
                    { name: 'Tranche 1 (Mois 1)', amount: Math.round(total * 0.3), percent: '30%' },
                    { name: 'Tranche 2 (Mois 2)', amount: Math.round(total * 0.25), percent: '25%' },
                    { name: 'Tranche 3 (Mois 4)', amount: Math.round(total * 0.25), percent: '25%' },
                    { name: 'Tranche 4 (Mois 5 - Solde)', amount: Math.round(total * 0.2), percent: '20%' }
                ];
            case '1_year':
            default:
                return [
                    { name: '1ère Tranche (Rentrée)', amount: Math.round(total * 0.4), percent: '40%' },
                    { name: '2ème Tranche (Trimestre 2)', amount: Math.round(total * 0.3), percent: '30%' },
                    { name: '3ème Tranche (Trimestre 3 - Solde)', amount: Math.round(total * 0.3), percent: '30%' }
                ];
        }
    };

    const installments = calculateInstallments();

    return (
        <div className="space-y-8">
            {/* Header Tarifs IziTeach */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-white/[0.08] shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black uppercase tracking-wider mb-2">
                            <span>💰 Modèle Économique & Tarification</span>
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight">
                            Grille Tarifaire & Plans IziTeach
                        </h2>
                        <p className="text-sm text-slate-400 mt-1 max-w-xl">
                            Une tarification transparente et calibrée sur votre type d'activité : formateur solo, centre de formation professionnelle agréé, académie en ligne ou établissement scolaire.
                        </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-right">
                        <span className="text-[11px] text-slate-400 font-semibold block">Votre Profil Actuel</span>
                        <span className="text-sm font-black text-emerald-400 flex items-center justify-end gap-1.5 mt-0.5">
                            <span>{config.badgeIcon}</span>
                            <span>{config.categoryLabel}</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Cartes des Plans */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {plans.map(p => (
                    <motion.div
                        key={p.id}
                        whileHover={{ y: -4 }}
                        className={cn(
                            "p-5 rounded-3xl border transition flex flex-col justify-between relative overflow-hidden",
                            p.isPopular
                                ? "bg-slate-900 border-2 shadow-xl shadow-emerald-500/10"
                                : "bg-slate-900/60 border-white/[0.08] opacity-85 hover:opacity-100",
                            p.isPopular ? p.border : ""
                        )}
                    >
                        {p.isPopular && (
                            <div className="absolute top-3 right-3 bg-gradient-to-r from-emerald-500 to-teal-400 text-black text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                Recommandé
                            </div>
                        )}

                        <div>
                            <div className="text-3xl mb-2">{p.icon}</div>
                            <h3 className="text-base font-black text-white">{p.name}</h3>
                            <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{p.tagline}</p>

                            <div className="my-4 pt-4 border-t border-white/[0.08]">
                                <span className="text-2xl font-black text-white">{p.price}</span>
                                <span className="text-xs text-slate-400 block mt-0.5">{p.period}</span>
                            </div>

                            <ul className="space-y-2 mt-4">
                                {p.features.map((f, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                                        <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0 stroke-[3]" />
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/[0.06]">
                            <button
                                onClick={() => {
                                    toast.success(`Plan ${p.name} sélectionné ! Notre équipe vous contacte.`);
                                }}
                                className={cn(
                                    "w-full py-2.5 rounded-xl font-black text-xs transition",
                                    p.isPopular
                                        ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-black hover:opacity-90 shadow-md shadow-emerald-500/20"
                                        : "bg-white/[0.06] text-white hover:bg-white/[0.12]"
                                )}
                            >
                                {p.isPopular ? 'Activer ce Plan' : 'Choisir ce Plan'}
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Simulateur d'Échéanciers Stagiaires */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/[0.08] shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                            <span>🧮</span> Simulateur d'Échéancier & Tranches de Formation
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Calculez automatiquement les modalités de paiement à proposer à vos stagiaires selon la durée de la formation.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {['1_month', '3_months', '6_months', '1_year'].map(d => (
                            <button
                                key={d}
                                onClick={() => setSimDuration(d)}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition",
                                    simDuration === d
                                        ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                                        : "bg-white/[0.05] text-slate-400 hover:text-white"
                                )}
                            >
                                {d === '1_month' ? '1 Mois' : d === '3_months' ? '3 Mois' : d === '6_months' ? '6 Mois' : '1 An'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                        <label className="text-xs font-bold text-slate-300 block">Frais de Scolarité Totaux (FCFA)</label>
                        <Input
                            type="number"
                            value={simTuition}
                            onChange={e => setSimTuition(Math.max(0, parseInt(e.target.value) || 0))}
                            className="bg-white/5 border-white/10 text-white font-black text-lg"
                        />
                        <span className="text-[10px] text-slate-500">Coût pédagogique total du programme</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                        <label className="text-xs font-bold text-slate-300 block">Frais d'Inscription / Dossier (FCFA)</label>
                        <Input
                            type="number"
                            value={simRegFee}
                            onChange={e => setSimRegFee(Math.max(0, parseInt(e.target.value) || 0))}
                            className="bg-white/5 border-white/10 text-white font-black text-lg"
                        />
                        <span className="text-[10px] text-slate-500">Payable immédiatement à l'entrée</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                        <span className="text-xs font-bold text-emerald-300 block">Total Package Stagiaire</span>
                        <span className="text-2xl font-black text-emerald-400 block mt-1">
                            {new Intl.NumberFormat('fr-FR').format(simTuition + simRegFee)} FCFA
                        </span>
                        <span className="text-[11px] text-emerald-300/80">
                            Inscription : {new Intl.NumberFormat('fr-FR').format(simRegFee)} + Scolarité : {new Intl.NumberFormat('fr-FR').format(simTuition)}
                        </span>
                    </div>
                </div>

                {/* Ventilation en Tranches */}
                <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Échéancier Recommandé ({installments.length} versements) :
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {installments.map((inst, idx) => (
                            <div
                                key={idx}
                                className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between"
                            >
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                        Tranche {idx + 1} ({inst.percent})
                                    </span>
                                    <span className="text-xs font-bold text-white mt-0.5 block">{inst.name}</span>
                                </div>
                                <div className="mt-3 pt-2 border-t border-white/[0.06]">
                                    <span className="text-base font-black text-emerald-400">
                                        {new Intl.NumberFormat('fr-FR').format(inst.amount)} FCFA
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
