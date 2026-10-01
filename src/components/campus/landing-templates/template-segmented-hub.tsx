'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Award, Star, ShoppingBag,
    MapPin, Sparkles, GraduationCap, ChevronRight,
    CheckCircle2, ArrowRight, FileText, Send,
    Shield, Briefcase, Globe, Cpu, Users, ChevronDown,
    ChevronUp, MessageCircle, Calendar, Phone, LogIn,
    Eye, X, Tag, Percent, Clock, Layers, Check, CheckCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { orgPath } from '@/lib/custom-domain';
import { cleanMotto } from '@/lib/clean-motto';
import type { TemplateCustomConfig } from '@/components/campus/template-customizer-studio';

interface TemplateProps {
    org: any;
    orgSlug: string;
    classrooms: any[];
    filieres: any[];
    teacherCount: number;
    studentCount: number;
    gallery: string[];
    bc: string;
    onOpenInscription?: () => void;
}

export function TemplateSegmentedHub({
    org,
    orgSlug,
    classrooms,
    filieres,
    teacherCount,
    studentCount,
    gallery,
    bc,
    onOpenInscription
}: TemplateProps) {
    const cfg: TemplateCustomConfig = org.template_config || {};
    const [selectedProgramIdx, setSelectedProgramIdx] = useState<number>(0);
    const [activeModalProgram, setActiveModalProgram] = useState<any | null>(null);
    const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
    const [openAccordion, setOpenAccordion] = useState<string>('mission');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Verrouiller le scroll lors de l'ouverture d'une modale
    useEffect(() => {
        if (activeModalProgram || lightboxIdx !== null) {
            const orig = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = orig;
            };
        }
    }, [activeModalProgram, lightboxIdx]);

    // Fermeture avec Échap
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setActiveModalProgram(null);
                setLightboxIdx(null);
            }
            if (lightboxIdx !== null) {
                if (e.key === 'ArrowRight') nextLightbox();
                if (e.key === 'ArrowLeft') prevLightbox();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    });

    // Textes dynamiques personnalisables
    const heroHeadline = cfg.trainer_title || org.motto || 'Révélez Votre Potentiel. Guidez l\'Avenir.';
    const heroSubtitle = cleanMotto(
        cfg.trainer_subtitle || org.hero_subtitle,
        `Bénéficiez d'une éducation de haut niveau, de parcours certifiés et d'un encadrement rigoureux à ${org.name}.`
    );
    const heroImage = cfg.trainer_photo_url || org.about_image_url || org.hero_image_url || (gallery && gallery[0]) || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1000&auto=format&fit=crop&q=80';
    const primaryCta = cfg.primary_cta_text || 'Demande d\'Admission';
    const primaryUrl = cfg.primary_cta_url || '#inscription';
    const secondaryCta = cfg.secondary_cta_text || 'Bibliothèque & Livres';
    const secondaryUrl = cfg.secondary_cta_url || orgPath(orgSlug, 'library');
    const statValue = cfg.stat1_value || '98%';
    const statLabel = cfg.stat1_label || 'Taux de Réussite';
    const flagshipTitle = cfg.flagship_title || 'Filières & Formations Disponibles';
    const aboutText = cfg.trainer_bio || org.about_text || `${org.name} forme les bâtisseurs de demain à travers des programmes rigoureux, dispensés par un corps professoral hautement qualifié.`;

    // Galerie d'images
    const galleryImages = (cfg.gallery_images && cfg.gallery_images.length > 0)
        ? cfg.gallery_images
        : (gallery && gallery.length > 0)
            ? gallery
            : [
                'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80',
            ];

    const nextLightbox = () => {
        setLightboxIdx(i => (i !== null && i < galleryImages.length - 1 ? i + 1 : 0));
    };

    const prevLightbox = () => {
        setLightboxIdx(i => (i !== null && i > 0 ? i - 1 : galleryImages.length - 1));
    };

    // Construction et enrichissement des cartes de formations / filières
    const programCards = (filieres && filieres.length > 0)
        ? filieres.map((f: any, i: number) => ({
            id: f.id,
            nom: f.nom || f.name,
            code: f.code || `F-${i + 1}`,
            duree_mois: f.duree_mois || f.duration || 6,
            description: f.description || `Programme d'excellence académique à ${org.name}.`,
            frais_scolarite: Number(f.frais_scolarite || 0),
            frais_inscription: Number(f.frais_inscription || 0),
            prix_barre: f.prix_barre || null,
            echeances: f.echeances || [],
            category: 'Filière Spécialisée',
            icon: Briefcase,
            rawItem: f,
        }))
        : (classrooms && classrooms.length > 0)
            ? classrooms.map((c: any, i: number) => {
                // 1. Description réelle de la formation
                const desc = c.description
                    || (c.schedule_config && typeof c.schedule_config === 'object' && c.schedule_config.description)
                    || (Array.isArray(c.competencies_list) && c.competencies_list.length > 0 ? c.competencies_list.join('\n') : '')
                    || (typeof c.competencies_list === 'string' && c.competencies_list)
                    || `Programme complet dispensé par ${org.name}. Apprentissage structuré avec ateliers pratiques et suivi personnalisé.`;

                // 2. Frais de scolarité / Tarif réel
                let priceNum = Number(c.frais_scolarite || c.tuition_fee || 0);
                if (!priceNum && c.cycle) {
                    const match = String(c.cycle).match(/(\d[\d\s]*)\s*(FCFA|XAF|EUR|USD|\$|€)/i);
                    if (match) {
                        priceNum = parseInt(match[1].replace(/\s/g, ''), 10);
                    }
                }

                // 3. Prix initial barré / Promotion
                const prixBarre = c.prix_barre
                    || (c.schedule_config && typeof c.schedule_config === 'object' && (c.schedule_config.prix_barre || c.schedule_config.original_price))
                    || null;

                // 4. Frais d'inscription
                const regFee = Number(c.frais_inscription || c.registration_fee || 0);

                // 5. Durée en mois
                let durationMonths: number | null = c.duree_mois || null;
                if (!durationMonths && c.training_duration) {
                    const m = String(c.training_duration).match(/(\d+)\s*mois/i);
                    if (m) durationMonths = parseInt(m[1], 10);
                }
                if (!durationMonths && c.cycle) {
                    const m = String(c.cycle).match(/(\d+)\s*mois/i);
                    if (m) durationMonths = parseInt(m[1], 10);
                    else if (String(c.cycle).toLowerCase().includes('semaine')) durationMonths = 1;
                    else if (String(c.cycle).toLowerCase().includes('an')) durationMonths = 12;
                }
                if (!durationMonths) durationMonths = c.academic_year ? 12 : 6;

                return {
                    id: c.id || `c_${i}`,
                    nom: c.name,
                    code: c.code || `PRO-${i + 1}`,
                    duree_mois: durationMonths,
                    description: desc,
                    frais_scolarite: priceNum,
                    frais_inscription: regFee,
                    prix_barre: prixBarre,
                    echeances: c.echeances || [],
                    category: c.cycle?.split('•')?.[0]?.trim() || (c.level ? `Niveau ${c.level}` : 'Formation Certifiante'),
                    icon: i % 2 === 0 ? Briefcase : Cpu,
                    rawItem: c,
                };
            })
            : [
                // Fallback 100% universel et neutre (non hardcodé pour un seul type d'école !)
                {
                    id: '1',
                    nom: `Niveau 1 — Fondamentaux & Pratique Professionnelle`,
                    code: 'NIV-1',
                    duree_mois: 6,
                    description: `Maîtriser les bases et compétences indispensables du métier.\nAteliers pratiques et mises en situation concrètes.\nAccompagnement par des formateurs certifiés.\nValidation des acquis et évaluations continues.\nPréparation active au passage au niveau supérieur.`,
                    frais_scolarite: 90000,
                    frais_inscription: 15000,
                    prix_barre: 150000,
                    echeances: [
                        { tranche: 1, nom: '1ère tranche (Acompte)', montant: 40000 },
                        { tranche: 2, nom: '2ème tranche', montant: 25000 },
                        { tranche: 3, nom: '3ème tranche', montant: 25000 }
                    ],
                    category: 'Formation Certifiante',
                    icon: Briefcase
                },
                {
                    id: '2',
                    nom: `Niveau 2 — Perfectionnement & Compétences Avancées`,
                    code: 'NIV-2',
                    duree_mois: 6,
                    description: `Approfondissement technique et méthodologique.\nÉtudes de cas réels et projets supervisés.\nPerfectionnement des outils professionnels.\nDéveloppement de l'autonomie et de la rigueur métier.\nCertification de compétences intermédiaire.`,
                    frais_scolarite: 120000,
                    frais_inscription: 15000,
                    prix_barre: 190000,
                    echeances: [],
                    category: 'Perfectionnement Pro',
                    icon: Cpu
                },
                {
                    id: '3',
                    nom: `Niveau 3 — Expertise, Leadership & Insertion Métier`,
                    code: 'NIV-3',
                    duree_mois: 6,
                    description: `Maîtrise complète et posture d'expert autonome.\nConduite de projets d'envergure et soutenance finale.\nStratégies de valorisation et positionnement sur le marché.\nRéseau d'anciens et opportunités professionnelles.\nDélivrance du diplôme / certificat d'excellence.`,
                    frais_scolarite: 150000,
                    frais_inscription: 20000,
                    prix_barre: 250000,
                    echeances: [],
                    category: 'Mastery & Carrière',
                    icon: Award
                },
            ];

    // Helper pour calculer les prix et badges marketing d'une formation
    const getProgramPricing = (p: any) => {
        const currentPriceNum = Number(p.frais_scolarite || 0);
        let originalPriceStr: string | null = null;
        let discountBadge: string | null = null;

        // Prix barré direct sur l'élément
        if (p.prix_barre) {
            const pb = Number(p.prix_barre);
            if (!isNaN(pb) && pb > 0) {
                originalPriceStr = `${new Intl.NumberFormat('fr-FR').format(pb)} FCFA`;
                if (currentPriceNum > 0 && pb > currentPriceNum) {
                    const pct = Math.round(((pb - currentPriceNum) / pb) * 100);
                    discountBadge = `-${pct}%`;
                }
            } else {
                originalPriceStr = String(p.prix_barre);
            }
        }
        // Sinon prix barré configuré globalement dans le Studio
        else if (cfg.filiere_original_price) {
            originalPriceStr = cfg.filiere_original_price;
            if (cfg.filiere_discount_pct) {
                discountBadge = cfg.filiere_discount_pct.startsWith('-') ? cfg.filiere_discount_pct : `-${cfg.filiere_discount_pct}`;
            }
        }
        // Sinon déduction via pourcentage de réduction dans le Studio
        else if (cfg.filiere_discount_pct && currentPriceNum > 0) {
            const pctVal = parseFloat(cfg.filiere_discount_pct.replace(/[^0-9.]/g, ''));
            if (pctVal > 0 && pctVal < 100) {
                const orig = Math.round(currentPriceNum / (1 - pctVal / 100));
                originalPriceStr = `${new Intl.NumberFormat('fr-FR').format(orig)} FCFA`;
                discountBadge = `-${Math.round(pctVal)}%`;
            }
        }

        const currentPriceStr = currentPriceNum > 0
            ? `${new Intl.NumberFormat('fr-FR').format(currentPriceNum)} FCFA`
            : (cfg.flagship_price || 'Tarif sur dossier');

        const promoBadge = discountBadge || (originalPriceStr ? (cfg.filiere_promo_badge || 'Offre Rentrée') : null);

        return {
            currentPriceNum,
            currentPriceStr,
            originalPriceStr,
            discountBadge,
            promoBadge
        };
    };

    // Helper pour parser les modules/leçons d'une formation à partir de sa description
    const parseCurriculum = (text: string) => {
        if (!text) return [];
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const items: { num: number; title: string }[] = [];

        for (const line of lines) {
            const matchNumbered = line.match(/^(\d+)[\.\-\)]\s*(.+)/);
            const matchBullet = line.match(/^[\•\*\-]\s*(.+)/);
            if (matchNumbered) {
                items.push({ num: parseInt(matchNumbered[1]), title: matchNumbered[2] });
            } else if (matchBullet) {
                items.push({ num: items.length + 1, title: matchBullet[1] });
            } else if (line.length > 5 && line.length < 140 && items.length < 12) {
                items.push({ num: items.length + 1, title: line });
            }
        }
        return items;
    };

    const accordionItems = [
        {
            id: 'mission',
            fieldKey: 'about_title',
            contentFieldKey: 'trainer_bio',
            title: cfg.about_title || '🎯 Notre Mission & Vision Académique',
            content: aboutText
        },
        {
            id: 'session',
            fieldKey: 'session_title',
            contentFieldKey: 'session_subtitle',
            title: cfg.session_title || '📅 Prochaine Rentrée & Sessions d\'Admissions',
            content: cfg.session_subtitle || 'Inscriptions ouvertes pour la prochaine session académique. Places limitées par promotion pour assurer un encadrement d\'élite.'
        },
        {
            id: 'faculty',
            fieldKey: 'stat2_label',
            contentFieldKey: 'stat2_value',
            title: '👨‍🏫 Corps Professoral & Encadrement d\'Excellence',
            content: `Plus de ${cfg.stat2_value || teacherCount || 30} enseignants certifiés et experts de l'industrie accompagnent chaque apprenant vers la réussite et l'insertion professionnelle.`
        },
        {
            id: 'research',
            fieldKey: 'stat3_label',
            contentFieldKey: 'stat3_value',
            title: '🔬 Infrastructures & Salles Spécialisées',
            content: cfg.stat3_label ? `${cfg.stat3_value || '100%'} ${cfg.stat3_label}` : 'Des salles modernes, une bibliothèque connectée et des équipements pratiques pour un apprentissage concret et orienté compétences.'
        },
        {
            id: 'legacy',
            fieldKey: 'testimonial_author',
            contentFieldKey: 'testimonial_text',
            title: '🌐 Réseau des Diplômés & Perspectives',
            content: cfg.testimonial_text ? cfg.testimonial_text.replace(/^"|"$/g, '') : 'Rejoignez un réseau dynamique d\'étudiants et diplômés insérés dans les secteurs clés d\'activité et les organisations internationales.'
        },
    ];

    // Chiffres clés du bandeau marketing horizontal (style flyer Image 2)
    const statsMetrics = [
        { icon: Calendar, val: cfg.stat1_value || '18 mois', label: cfg.stat1_label || 'de formation' },
        { icon: BookOpen, val: cfg.stat2_value || `${programCards.length * 6} modules`, label: cfg.stat2_label || 'programme complet' },
        { icon: Award, val: cfg.stat3_value || '100% suivi', label: cfg.stat3_label || 'ateliers pratiques' },
        { icon: Users, val: cfg.stat4_value || 'Individuel', label: cfg.stat4_label || 'accompagnement personnalisé' },
    ];

    // ═══ Modal Marketing & Pédagogique d'une Formation ═══
    const modalProgramContent = activeModalProgram && (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md overflow-y-auto p-3 sm:p-6 flex justify-center items-center"
                onClick={(e) => {
                    if (e.target === e.currentTarget) setActiveModalProgram(null);
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="w-full max-w-2xl bg-[#06180F] border border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-black/90 flex flex-col max-h-[90vh] my-auto relative z-[100000] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-amber-500/20 [&::-webkit-scrollbar-thumb]:rounded-full"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header Modale */}
                    <div className="flex items-start justify-between border-b border-white/10 pb-4 mb-4 gap-3 shrink-0">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                                    {activeModalProgram.category || 'Formation Certifiée'}
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                                    ⏱️ {activeModalProgram.duree_mois} mois
                                </span>
                                {getProgramPricing(activeModalProgram).promoBadge && (
                                    <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-red-500/20 to-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] font-black animate-pulse">
                                        ⚡ {getProgramPricing(activeModalProgram).promoBadge}
                                    </span>
                                )}
                            </div>
                            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase mt-1">
                                {activeModalProgram.nom}
                            </h3>
                        </div>

                        <button
                            onClick={() => setActiveModalProgram(null)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                            title="Fermer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Présentation Pédagogique & Description */}
                    <div className="space-y-5 flex-1">
                        <div>
                            <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5 mb-2">
                                <Sparkles className="w-4 h-4" /> Présentation & Objectifs de la Formation
                            </h4>
                            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-light whitespace-pre-line bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                                {activeModalProgram.description || `Cette formation complète dispensée par ${org.name} est conçue pour vous apporter toutes les clés pratiques, techniques et stratégiques de votre domaine.`}
                            </p>
                        </div>

                        {/* Programme des Modules / Ateliers (si détecté dans la description) */}
                        {(() => {
                            const curriculum = parseCurriculum(activeModalProgram.description);
                            if (curriculum.length > 0) {
                                return (
                                    <div>
                                        <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5 mb-2.5">
                                            <Layers className="w-4 h-4" /> Programme des Modules & Compétences
                                        </h4>
                                        <div className="grid sm:grid-cols-2 gap-2">
                                            {curriculum.map((m, idx) => (
                                                <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 transition">
                                                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center justify-center shrink-0">
                                                        {m.num}
                                                    </span>
                                                    <span className="text-xs font-semibold text-white leading-snug">
                                                        {m.title}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }
                            return (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center">
                                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                                        <div className="text-base font-black text-amber-300">100% Pratique</div>
                                        <div className="text-[11px] text-slate-400 mt-0.5">Ateliers & cas concrets</div>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                                        <div className="text-base font-black text-emerald-300">Certification</div>
                                        <div className="text-[11px] text-slate-400 mt-0.5">Attestation officielle</div>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                                        <div className="text-base font-black text-amber-300">Suivi Personnalisé</div>
                                        <div className="text-[11px] text-slate-400 mt-0.5">Mentorat direct</div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* 💎 Encadré Marketing : Tarifs & Conditions Spéciales */}
                        {(() => {
                            const pricing = getProgramPricing(activeModalProgram);
                            return (
                                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0D2418] via-[#091D13] to-[#04120B] border border-amber-400/40 shadow-xl space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                                        <div>
                                            <span className="text-[10px] text-amber-400 uppercase tracking-widest font-black block">
                                                Tarif Officiel & Modalités d'Admission
                                            </span>
                                            <div className="flex items-baseline gap-2.5 mt-1 flex-wrap">
                                                {pricing.originalPriceStr && (
                                                    <span className="text-sm sm:text-base text-slate-400 line-through decoration-red-500 decoration-2 font-mono">
                                                        {pricing.originalPriceStr}
                                                    </span>
                                                )}
                                                <span className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight font-mono">
                                                    {pricing.currentPriceStr}
                                                </span>
                                                {pricing.promoBadge && (
                                                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black uppercase">
                                                        {pricing.promoBadge}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-right sm:self-center">
                                            <span className="text-[11px] text-slate-300 block">
                                                Accompagnement complet de {activeModalProgram.duree_mois} mois
                                            </span>
                                            {activeModalProgram.frais_inscription > 0 && (
                                                <span className="text-[10px] text-amber-400/80 block mt-0.5">
                                                    + Frais d'inscription : {new Intl.NumberFormat('fr-FR').format(activeModalProgram.frais_inscription)} FCFA
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Modalité de paiement / tranches */}
                                    {activeModalProgram.echeances && activeModalProgram.echeances.length > 0 ? (
                                        <div className="space-y-1.5 pt-1">
                                            <span className="text-[10px] text-slate-300 uppercase tracking-wider font-bold block">
                                                Échéancier de paiement disponible :
                                            </span>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {activeModalProgram.echeances.map((ech: any, idx: number) => (
                                                    <div key={idx} className="p-2 rounded-xl bg-black/40 border border-white/5 text-[11px]">
                                                        <div className="text-slate-400 truncate">{ech.nom || `Tranche ${idx + 1}`}</div>
                                                        <div className="font-bold text-white mt-0.5">{new Intl.NumberFormat('fr-FR').format(ech.montant)} FCFA</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-[11px] text-slate-300 font-light flex items-center gap-1.5">
                                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                            <span>Facilité de règlement en plusieurs tranches sans frais disponible sur simple demande.</span>
                                        </p>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Actions de Conversion */}
                    <div className="pt-5 mt-4 border-t border-white/10 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <Button
                            onClick={() => {
                                setActiveModalProgram(null);
                                onOpenInscription?.();
                            }}
                            className="flex-1 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <FileText className="w-4 h-4" />
                            <span>Postuler & Réserver Ma Place</span>
                            <ArrowRight className="w-4 h-4" />
                        </Button>

                        <a
                            href={`https://wa.me/${org.phone?.replace(/[^0-9]/g, '') || org.whatsapp?.replace(/[^0-9]/g, '') || '237000000000'}?text=${encodeURIComponent(`Bonjour, je souhaite des informations sur la formation : ${activeModalProgram.nom}`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="h-12 px-5 rounded-xl bg-[#128C7E]/20 hover:bg-[#128C7E]/30 text-[#25D366] border border-[#128C7E]/40 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                            <MessageCircle className="w-4 h-4" />
                            <span>WhatsApp Direct</span>
                        </a>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );

    // ═══ Lightbox Plein Écran pour la Galerie Photo ═══
    const lightboxContent = lightboxIdx !== null && (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between p-4 sm:p-8"
                onClick={() => setLightboxIdx(null)}
            >
                {/* Header Lightbox */}
                <div className="w-full flex items-center justify-between z-10" onClick={e => e.stopPropagation()}>
                    <div className="text-white text-xs sm:text-sm font-bold tracking-wider">
                        Photo {lightboxIdx + 1} / {galleryImages.length}
                    </div>
                    <button
                        onClick={() => setLightboxIdx(null)}
                        className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                        title="Fermer (Échap)"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Image principale centrée */}
                <div className="relative max-w-5xl max-h-[78vh] w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                    <motion.img
                        key={lightboxIdx}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.2 }}
                        src={galleryImages[lightboxIdx]}
                        alt={`Photo ${lightboxIdx + 1}`}
                        className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
                    />

                    {/* Flèches Suivant / Précédent */}
                    {galleryImages.length > 1 && (
                        <>
                            <button
                                onClick={prevLightbox}
                                className="absolute left-2 sm:-left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white transition-all shadow-xl cursor-pointer"
                                title="Précédent"
                            >
                                <ChevronDown className="w-6 h-6 rotate-90" />
                            </button>
                            <button
                                onClick={nextLightbox}
                                className="absolute right-2 sm:-right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white transition-all shadow-xl cursor-pointer"
                                title="Suivant"
                            >
                                <ChevronDown className="w-6 h-6 -rotate-90" />
                            </button>
                        </>
                    )}
                </div>

                {/* Vignettes du bas */}
                <div className="w-full max-w-2xl overflow-x-auto flex items-center justify-center gap-2 py-2" onClick={e => e.stopPropagation()}>
                    {galleryImages.map((img, i) => (
                        <button
                            key={i}
                            onClick={() => setLightboxIdx(i)}
                            className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                                i === lightboxIdx ? 'border-amber-400 scale-110 shadow-lg shadow-amber-500/20' : 'border-white/20 opacity-50 hover:opacity-100'
                            }`}
                        >
                            <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            </div>
        </AnimatePresence>
    );

    return (
        <div className="relative min-h-screen bg-[#030E08] text-white overflow-x-hidden pb-28 selection:bg-amber-500/30">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-5%] left-1/4 w-[90vw] max-w-[600px] h-[300px] sm:h-[500px] bg-emerald-700/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-10 right-10 w-[90vw] max-w-[500px] h-[250px] sm:h-[400px] bg-amber-600/10 blur-[150px] rounded-full" />
            </div>

            {/* ═══ Top Navbar Luxury ═══ */}
            <nav className="relative z-20 max-w-7xl mx-auto px-4 sm:px-8 py-5">
                <div className="flex items-center justify-between gap-4 p-3.5 px-6 rounded-2xl bg-[#06180F]/90 backdrop-blur-2xl border border-amber-500/30 shadow-2xl">
                    {/* Logo & Crest */}
                    <div className="flex items-center gap-3.5">
                        {org.logo_url ? (
                            <img src={org.logo_url} alt={org.name} className="w-10 h-10 rounded-xl object-contain bg-white/10 p-1 border border-amber-400/30 shadow-md shrink-0" />
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-emerald-800/40 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md shrink-0">
                                <Award className="w-5 h-5" />
                            </div>
                        )}
                        <div>
                            <h2 data-editable-field="trainer_name" className="text-sm sm:text-base font-black tracking-wide text-white uppercase truncate max-w-[200px] sm:max-w-none">
                                {cfg.trainer_name || org.name}
                            </h2>
                            <p data-editable-field="trainer_title" className="text-[10px] text-amber-400/80 font-medium tracking-wider uppercase">
                                {cleanMotto(cfg.trainer_title || org.motto, 'Excellence • Rigueur • Réussite')}
                            </p>
                        </div>
                    </div>

                    {/* Nav Links */}
                    <div className="hidden md:flex items-center gap-7 text-xs font-bold text-slate-300 tracking-wider">
                        <button onClick={onOpenInscription} className="hover:text-amber-300 transition-colors cursor-pointer">Admissions</button>
                        <button onClick={() => { document.getElementById('programs')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-amber-300 transition-colors cursor-pointer">Formations & Tarifs</button>
                        <button onClick={() => { setOpenAccordion('research'); document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-amber-300 transition-colors cursor-pointer">Infrastructures</button>
                        <button onClick={() => { document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-amber-300 transition-colors cursor-pointer">Galerie Photos</button>
                    </div>

                    {/* Contact & Espace élève CTA */}
                    <div className="flex items-center gap-2.5">
                        <Link href={orgPath(orgSlug, 'login')}>
                            <Button size="sm" className="bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl border border-white/15 h-9 px-4 flex items-center gap-1.5 cursor-pointer">
                                <LogIn className="w-3.5 h-3.5" />
                                Connexion
                            </Button>
                        </Link>
                        <Button size="sm" onClick={onOpenInscription} data-editable-field="primary_cta_text" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/25 h-9 px-4 cursor-pointer">
                            {primaryCta}
                        </Button>
                    </div>
                </div>
            </nav>

            {/* ═══ Main Content ═══ */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-12">
                {/* ═══ Hero Headline & Split Showcase ═══ */}
                <div className="grid lg:grid-cols-12 gap-8 items-center">
                    {/* Left Column: Headline */}
                    <div className="lg:col-span-6 space-y-5">
                        <motion.h1
                            data-editable-field="trainer_title"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl sm:text-5xl lg:text-6xl font-black text-amber-400 uppercase tracking-tight leading-[1.08] cursor-pointer"
                        >
                            {heroHeadline}
                        </motion.h1>
                        <p
                            data-editable-field="trainer_subtitle"
                            className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg font-light cursor-pointer"
                        >
                            {heroSubtitle}
                        </p>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                            <Button
                                data-editable-field="primary_cta_text"
                                onClick={() => {
                                    if (primaryUrl === '#inscription') onOpenInscription?.();
                                    else window.location.href = primaryUrl;
                                }}
                                className="h-12 px-7 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/30 gap-2 w-full sm:w-auto cursor-pointer"
                            >
                                <FileText className="w-4 h-4" />
                                <span>{primaryCta}</span>
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                            <Link href={secondaryUrl}>
                                <Button
                                    data-editable-field="secondary_cta_text"
                                    variant="outline"
                                    className="h-12 px-6 rounded-xl border-amber-500/30 text-amber-300 hover:bg-amber-500/10 font-bold text-xs w-full sm:w-auto cursor-pointer"
                                >
                                    {secondaryCta}
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Right Column: Campus Image + Floating Stat Badge */}
                    <div className="lg:col-span-6 relative">
                        <div
                            data-editable-field="trainer_photo_url"
                            className="rounded-3xl overflow-hidden border border-amber-500/30 shadow-2xl aspect-[16/10] bg-[#07190F]"
                        >
                            <img
                                src={heroImage}
                                alt={org.name}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Floating SUCCESS RATE / STAT Badge */}
                        <div
                            data-editable-field="stat1_value"
                            className="absolute bottom-3 left-3 sm:top-1/2 sm:bottom-auto sm:left-6 sm:-translate-y-1/2 p-2.5 sm:p-3.5 px-4 sm:px-5 rounded-2xl bg-[#06180F]/90 backdrop-blur-2xl border border-amber-400/50 shadow-2xl flex items-center gap-3 cursor-pointer"
                        >
                            <div>
                                <span className="text-xl sm:text-2xl font-black text-white tracking-tight">{statValue}</span>
                                <span className="text-[9px] sm:text-[10px] text-amber-400 block font-bold uppercase tracking-wider">{statLabel}</span>
                            </div>
                            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                        </div>
                    </div>
                </div>

                {/* ═══ Bandeau Statistiques & Piliers d'Excellence (Style Flyer Image 2) ═══ */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 p-4 rounded-2xl bg-[#06180F]/90 border border-amber-500/20 shadow-xl">
                    {statsMetrics.map((sm, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                                <sm.icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-sm sm:text-base font-black text-white block tracking-tight truncate">
                                    {sm.val}
                                </span>
                                <span className="text-[10px] text-amber-400/80 font-medium block truncate">
                                    {sm.label}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ═══ Split Section: Programs & Campus (Left) | About Us Accordion (Right) ═══ */}
                <div id="programs" className="grid lg:grid-cols-12 gap-8 pt-4">
                    {/* LEFT (Col 7): PROGRAMS & CAMPUS WITH MARKETING PRICING */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 data-editable-field="flagship_title" className="text-xs font-black uppercase text-amber-400 tracking-widest flex items-center gap-2 cursor-pointer">
                                <BookOpen className="w-4 h-4" /> {flagshipTitle}
                            </h3>
                            <span className="text-xs text-slate-400 font-bold">{programCards.length} Cursus Actifs</span>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            {programCards.map((p: any, idx: number) => {
                                const pricing = getProgramPricing(p);
                                const isSelected = selectedProgramIdx === idx;

                                return (
                                    <motion.div
                                        key={p.id || idx}
                                        onClick={() => {
                                            setSelectedProgramIdx(idx);
                                            setActiveModalProgram(p);
                                        }}
                                        className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                                            isSelected
                                                ? 'bg-gradient-to-br from-[#0D2418] via-[#091D13] to-[#06180F] border-amber-400/60 shadow-xl shadow-amber-500/10'
                                                : 'bg-[#06180F]/90 border-white/10 hover:border-amber-500/40 hover:bg-[#071F13]'
                                        }`}
                                    >
                                        <div className="space-y-3">
                                            {/* Header carte : Icône + Badges */}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform">
                                                    <p.icon className="w-5 h-5" />
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                    <span className="text-[10px] font-bold text-amber-300/90 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                                                        {p.duree_mois ? `${p.duree_mois} mois` : 'Cursus complet'}
                                                    </span>
                                                    {pricing.promoBadge && (
                                                        <span className="text-[9px] font-black text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                                                            {pricing.promoBadge}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Titre & Description */}
                                            <div>
                                                <h4 className="font-black text-sm text-white group-hover:text-amber-300 transition-colors leading-snug">
                                                    {p.nom}
                                                </h4>
                                                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed font-light">
                                                    {p.description || 'Cursus certifié avec suivi pédagogique complet.'}
                                                </p>
                                            </div>

                                            {/* Section Tarifs Marketing sur la carte */}
                                            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-baseline justify-between gap-2">
                                                <div>
                                                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                                                        Investissement
                                                    </span>
                                                    <div className="flex items-baseline gap-1.5 mt-0.5">
                                                        {pricing.originalPriceStr && (
                                                            <span className="text-[11px] text-slate-500 line-through font-mono">
                                                                {pricing.originalPriceStr}
                                                            </span>
                                                        )}
                                                        <span className="text-sm font-black text-amber-300 font-mono">
                                                            {pricing.currentPriceStr}
                                                        </span>
                                                    </div>
                                                </div>

                                                <span className="text-[10px] text-amber-400 font-semibold underline underline-offset-2 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                                                    Détails <ChevronRight className="w-3 h-3" />
                                                </span>
                                            </div>
                                        </div>

                                        {/* Pied de carte avec action */}
                                        <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/5 text-xs">
                                            <span className="text-[11px] text-slate-400 font-medium">
                                                Certification PRO
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenInscription?.();
                                                }}
                                                className="text-[11px] font-bold text-amber-300 hover:text-white flex items-center gap-1 cursor-pointer"
                                            >
                                                Postuler <ArrowRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT (Col 5): ABOUT US ACCORDIONS */}
                    <div id="about" className="lg:col-span-5 space-y-4">
                        <h3 className="text-xs font-black uppercase text-amber-400 tracking-widest flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> Informations & Atouts
                        </h3>

                        <div className="space-y-2.5">
                            {accordionItems.map(item => (
                                <div key={item.id} className="rounded-2xl bg-[#06180F]/90 border border-white/10 overflow-hidden">
                                    <button
                                        onClick={() => setOpenAccordion(openAccordion === item.id ? '' : item.id)}
                                        className="w-full flex items-center justify-between p-4 text-left font-bold text-xs text-white hover:bg-white/5 transition cursor-pointer"
                                    >
                                        <span data-editable-field={item.fieldKey} className="cursor-pointer">{item.title}</span>
                                        {openAccordion === item.id ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                                    </button>
                                    <AnimatePresence>
                                        {openAccordion === item.id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                data-editable-field={item.contentFieldKey}
                                                className="px-4 pb-4 pt-1 text-[11px] text-slate-300 leading-relaxed border-t border-white/5 cursor-pointer"
                                            >
                                                {item.content}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ═══ Galerie Photos HD & Immersion Campus (Totalement Intégrée) ═══ */}
                {cfg.show_gallery_section !== false && galleryImages.length > 0 && (
                    <section id="gallery" className="pt-6 space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-t border-white/10 pt-8">
                            <div>
                                <h3 data-editable-field="gallery_title" className="text-xs font-black uppercase text-amber-400 tracking-widest flex items-center gap-2 cursor-pointer">
                                    <Sparkles className="w-4 h-4" /> {cfg.gallery_title || 'Galerie & Immersion Campus'}
                                </h3>
                                <p data-editable-field="gallery_subtitle" className="text-sm text-slate-300 mt-1 max-w-xl font-light cursor-pointer">
                                    {cfg.gallery_subtitle || 'Découvrez nos espaces de formation, nos promotions et nos ateliers pratiques en images.'}
                                </p>
                            </div>
                            <span className="text-xs text-amber-400/80 font-bold px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 w-fit">
                                {galleryImages.length} photo{galleryImages.length > 1 ? 's' : ''} HD
                            </span>
                        </div>

                        {/* Grille Photo Réactive avec Zoom Interactif */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                            {galleryImages.map((imgUrl: string, idx: number) => (
                                <div
                                    key={idx}
                                    onClick={() => setLightboxIdx(idx)}
                                    className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-black/40 border border-white/10 hover:border-amber-400/50 transition-all duration-300 shadow-lg cursor-pointer"
                                >
                                    <img
                                        src={imgUrl}
                                        alt={`Photo ${idx + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                        <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold">
                                            <Eye className="w-4 h-4" />
                                            <span>Agrandir</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            {/* ═══ Floating Bottom Action Bar (WhatsApp & Apply Now) ═══ */}
            <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-3 p-2 px-4 rounded-full bg-[#06180F]/95 backdrop-blur-2xl border border-amber-500/30 shadow-2xl shadow-black/80">
                    <a
                        href={`https://wa.me/${org.phone?.replace(/[^0-9]/g, '') || org.whatsapp?.replace(/[^0-9]/g, '') || '237000000000'}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#128C7E]/20 border border-[#128C7E]/40 text-[#25D366] text-xs font-bold hover:bg-[#128C7E]/30 transition cursor-pointer"
                    >
                        <MessageCircle className="w-4 h-4" />
                        <span>WhatsApp Direct</span>
                    </a>

                    <Button
                        onClick={onOpenInscription}
                        data-editable-field="primary_cta_text"
                        className="h-10 px-6 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 gap-1.5 cursor-pointer"
                    >
                        <span>{primaryCta.toUpperCase()}</span>
                        <span>⭐</span>
                    </Button>
                </div>
            </div>

            {/* Modale Marketing d'une Formation (Portalisée) */}
            {mounted && typeof document !== 'undefined' && modalProgramContent ? createPortal(modalProgramContent, document.body) : null}

            {/* Lightbox Plein Écran de la Galerie (Portalisée) */}
            {mounted && typeof document !== 'undefined' && lightboxContent ? createPortal(lightboxContent, document.body) : null}
        </div>
    );
}
