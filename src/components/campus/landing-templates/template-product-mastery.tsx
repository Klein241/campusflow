'use client';

import { motion } from 'framer-motion';
import {
    ArrowRight, Layers, Award, Star, ChevronRight, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { orgPath } from '@/lib/custom-domain';
import type { TemplateCustomConfig } from '@/components/campus/template-customizer-modal';

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

export function TemplateProductMastery({
    org, orgSlug, classrooms, filieres, teacherCount, studentCount, gallery, bc, onOpenInscription
}: TemplateProps) {
    const cfg: TemplateCustomConfig = org.template_config || {};

    const trainerName = cfg.trainer_name || org.name || 'Vladislav Studio';
    const trainerTitle = cfg.trainer_title || org.motto || 'Product Designer & Mentor Senior';
    const trainerSubtitle = cfg.trainer_subtitle || org.hero_subtitle || 'Des produits numériques remarquables conçus avec intention et précision.';
    const trainerBio = cfg.trainer_bio || org.about_text || 'Accompagnement sur-mesure pour futurs designers produit à fort impact.';
    const trainerQuote = cfg.trainer_quote || '"Chaque pixel, chaque interaction — tout raconte une histoire."';

    const heroImage = cfg.trainer_photo_url || org.hero_image_url || org.about_image_url || (gallery && gallery[0]) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1000&auto=format&fit=crop&q=80';
    const pressLogos = (cfg.press_logos_text || 'Figma, Notion, Linear, Framer, Lottie').split(',').map(s => s.trim());

    const programs = (filieres && filieres.length > 0)
        ? filieres
        : (classrooms && classrooms.length > 0)
            ? classrooms.map((c, i) => ({
                id: c.id || `c_${i}`,
                nom: c.name,
                description: `Programme certifiant niveau ${c.level || 'Expert'}. Projets réels livrés en fin de cursus.`,
                duree_mois: 3,
                frais_scolarite: 250000,
            }))
            : [
                { id: '1', nom: 'Product Design & Ergonomie Avancée', description: 'Du concept initial au design system complet, end-to-end sur Figma.', duree_mois: 3, frais_scolarite: 250000 },
                { id: '2', nom: 'UI/UX & Stratégie Produit Numérique', description: 'Recherche utilisateur, prototypage interactif et tests de validation.', duree_mois: 4, frais_scolarite: 280000 },
                { id: '3', nom: 'Landing Pages à Forte Conversion', description: 'Structure narrative, copywriting percutant et micro-animations Web.', duree_mois: 2, frais_scolarite: 180000 },
            ];

    const services = [
        { emoji: '🖥', title: 'Design de Produits Numériques', desc: 'Applications web & mobile, fin-to-end design.' },
        { emoji: '🎯', title: 'Stratégie UX & Parcours Utilisateur', desc: 'Audit, tests et optimisation d\'expérience.' },
        { emoji: '📐', title: 'Design Systems & Composants', desc: 'Librairies scalables, tokens et documentation.' },
        { emoji: '🧑‍🏫', title: 'Mentorat & Coaching Design', desc: 'Sessions 1:1, revue de portfolio et orientation.' },
    ];

    return (
        <div className="min-h-screen bg-[#0C0D12] text-white selection:bg-orange-500/30 overflow-x-hidden font-sans antialiased">
            {/* Ambient glow */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-15%] right-[-8%] w-[70vw] h-[70vw] max-w-[700px] max-h-[700px] bg-orange-600/8 rounded-full blur-[200px]" />
                <div className="absolute bottom-[5%] left-[-5%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] bg-amber-500/6 rounded-full blur-[150px]" />
            </div>

            {/* ═══ Header Vladi Style ═══ */}
            <header className="relative z-30 max-w-6xl mx-auto px-4 sm:px-8 py-6">
                <div className="flex items-center justify-between p-3 px-6 rounded-full bg-[#151720] border border-white/10 shadow-2xl">
                    <div className="flex items-center gap-3">
                        {org.logo_url ? (
                            <img src={org.logo_url} alt={trainerName} className="h-9 w-auto object-contain" />
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center font-black text-xs text-white shadow-md shadow-orange-500/30">
                                    {trainerName.slice(0, 2).toUpperCase()}
                                </div>
                                <span className="font-black text-sm text-white tracking-wide">{trainerName}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href={orgPath(orgSlug, 'login')}>
                            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-slate-300 font-bold text-xs rounded-full px-4 h-9 hidden sm:flex">
                                Espace Étudiant
                            </Button>
                        </Link>
                        <Button
                            onClick={onOpenInscription}
                            className="bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs rounded-full px-5 h-9 shadow-lg shadow-orange-500/25"
                        >
                            Postuler
                        </Button>
                    </div>
                </div>
            </header>

            {/* ═══ Hero Section Vladi – Portrait sur Arche Orange ═══ */}
            <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pt-10 pb-32">
                {/* Top Headline */}
                <div className="text-center space-y-3 max-w-3xl mx-auto mb-14">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                        {trainerTitle}
                    </div>
                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.0] text-white">
                        Bonjour !{' '}
                        <span className="text-orange-400">Je suis {trainerName.split(' ')[0]}</span>
                    </h1>
                    <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
                        {trainerSubtitle}
                    </p>
                </div>

                {/* Central Arch Portrait Layout */}
                <div className="relative max-w-sm mx-auto flex flex-col items-center">
                    {/* Left Quote Card */}
                    <div className="absolute -top-2 -left-2 sm:-left-16 z-20 p-4 rounded-2xl bg-[#151720]/90 backdrop-blur-md border border-white/10 max-w-[200px] shadow-2xl hidden sm:block">
                        <p className="text-[11px] text-slate-300 italic leading-snug">{trainerQuote}</p>
                        <p className="text-[10px] text-orange-400 font-bold mt-2">— {trainerName.split(' ')[0]}</p>
                    </div>

                    {/* Right Experience Badge */}
                    <div className="absolute -top-2 -right-2 sm:-right-16 z-20 p-4 rounded-2xl bg-[#151720]/90 backdrop-blur-md border border-white/10 text-center shadow-2xl">
                        <div className="flex justify-center text-orange-400 text-xs mb-1">{'★'.repeat(5)}</div>
                        <p className="text-2xl font-black text-white">{cfg.years_experience_value || '14'}+</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Ans d'Expertise</p>
                    </div>

                    {/* Orange Arch Portrait */}
                    <div className="relative w-full max-w-[280px] sm:max-w-xs aspect-[4/5] rounded-t-full bg-gradient-to-b from-orange-500 to-amber-600 p-2.5 overflow-hidden shadow-2xl shadow-orange-500/20 mx-auto">
                        <img
                            src={heroImage}
                            alt={trainerName}
                            className="w-full h-full object-cover object-top rounded-t-full"
                        />
                    </div>

                    {/* Stat Badges Under Portrait */}
                    <div className="absolute -bottom-12 flex flex-wrap items-center justify-center gap-3 z-20 w-full">
                        {cfg.show_student_count !== false && (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#151720] border border-white/10 text-xs font-bold shadow-xl">
                                <span className="text-orange-400 font-black">{cfg.student_count_override || studentCount || '300'}+</span>
                                <span className="text-slate-400">Diplômés</span>
                            </div>
                        )}
                        {cfg.show_teacher_count !== false && (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#151720] border border-white/10 text-xs font-bold shadow-xl">
                                <span className="text-amber-400 font-black">{cfg.teacher_count_override || teacherCount || '5'}+</span>
                                <span className="text-slate-400">Mentors</span>
                            </div>
                        )}
                    </div>

                    {/* CTA Buttons Row */}
                    <div className="absolute -bottom-28 flex flex-wrap items-center justify-center gap-3 z-20 w-full">
                        <Button
                            onClick={onOpenInscription}
                            className="h-11 px-7 rounded-full bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs shadow-xl shadow-orange-500/25 flex items-center gap-2"
                        >
                            Rejoindre le Cursus
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                        <Link href={orgPath(orgSlug, 'library')}>
                            <Button variant="outline" className="h-11 px-5 rounded-full bg-[#151720] border-white/10 hover:bg-white/10 text-white font-bold text-xs">
                                Ressources Gratuites
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ═══ Partners / Outils ═══ */}
            {cfg.show_press_logos !== false && (
                <div className="relative z-10 border-t border-b border-white/5 py-6 bg-[#0F101A]">
                    <div className="max-w-6xl mx-auto px-4 sm:px-8 flex items-center gap-8 overflow-x-auto">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 shrink-0">OUTILS MAÎTRISÉS</span>
                        {pressLogos.map((tool, i) => (
                            <span key={i} className="text-sm font-black text-slate-500 hover:text-orange-400 transition uppercase tracking-wider shrink-0">
                                {tool}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ Services / Ce que je propose ═══ */}
            {cfg.show_services_grid !== false && (
                <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-20">
                    <div className="p-8 sm:p-14 rounded-[40px] bg-[#12141C] border border-white/5 space-y-10 shadow-2xl">
                        <div>
                            <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-2">MES EXPERTISES</p>
                            <h2 className="text-3xl sm:text-5xl font-black text-white">Ce que je propose</h2>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-5">
                            {services.map((s, idx) => (
                                <div key={idx} className="p-6 rounded-3xl bg-[#191B26] border border-white/5 hover:border-orange-500/30 transition group">
                                    <span className="text-3xl mb-3 block">{s.emoji}</span>
                                    <h3 className="font-black text-white text-base group-hover:text-orange-400 transition mb-2">{s.title}</h3>
                                    <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ═══ Programmes & Formations ═══ */}
            <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-10 pb-24">
                <div className="p-8 sm:p-14 rounded-[40px] bg-[#12141C] border border-white/5 space-y-10 shadow-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                            <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">FORMATIONS CERTIFIANTES</span>
                            <h2 className="text-3xl sm:text-5xl font-black mt-1 text-white">Modules & Spécialisations</h2>
                        </div>
                        <p className="text-xs text-slate-400 max-w-xs">Chaque module est conçu pour livrer un projet réel à l'issue du cursus.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-5">
                        {programs.map((p: any, idx: number) => (
                            <div
                                key={p.id || idx}
                                className="p-7 rounded-3xl bg-[#191B26] border border-white/5 hover:border-orange-500/40 transition-all flex flex-col justify-between space-y-6 group"
                            >
                                <div className="space-y-4">
                                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                                        <Layers className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-black text-white group-hover:text-orange-400 transition">
                                        {p.nom || p.name}
                                    </h3>
                                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                                        {p.description || 'Apprentissage concret et immersif avec suivi régulier par le mentor.'}
                                    </p>
                                </div>
                                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-bold text-orange-400 block">
                                            {p.duree_mois ? `${p.duree_mois} mois` : 'Accès illimité'}
                                        </span>
                                        {p.frais_scolarite && (
                                            <span className="text-[10px] text-slate-500">
                                                {new Intl.NumberFormat('fr-FR').format(p.frais_scolarite)} XAF
                                            </span>
                                        )}
                                    </div>
                                    <Button
                                        onClick={onOpenInscription}
                                        className="w-9 h-9 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 p-0 flex items-center justify-center shadow-lg"
                                    >
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ À propos ═══ */}
            <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pb-20">
                <div className="p-8 sm:p-12 rounded-[40px] bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20 space-y-5">
                    <h2 className="text-3xl sm:text-5xl font-black text-white">À propos de {trainerName.split(' ')[0]}</h2>
                    <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-3xl">
                        {trainerBio}
                    </p>
                    <Button
                        onClick={onOpenInscription}
                        className="bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs rounded-full px-7 h-11 shadow-xl"
                    >
                        Travailler avec {trainerName.split(' ')[0]}
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </section>

            {/* ═══ Footer ═══ */}
            <footer className="border-t border-white/10 bg-[#0A0B0F] py-12 relative z-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div>
                        <p className="font-black text-lg text-white">{trainerName}</p>
                        <p className="text-xs text-slate-500">{org.city || 'Studio'}, {org.country || 'Cameroun'}</p>
                    </div>
                    <p className="text-[10px] text-slate-600">© {new Date().getFullYear()} — Propulsé par IziTeach</p>
                    <Button
                        onClick={onOpenInscription}
                        className="bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs rounded-full px-7 h-10"
                    >
                        Formulaire d'Inscription
                    </Button>
                </div>
            </footer>
        </div>
    );
}
