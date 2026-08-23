'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowUpRight, Star, Sparkles, CheckCircle2, ChevronRight,
    GraduationCap, BookOpen, Users, Phone, Mail, MapPin,
    ArrowRight, Menu, X, Play, Shield, Award, Send, MessageSquare,
    ExternalLink, Layers, Palette, Laptop, Smartphone, Eye
} from 'lucide-react';
import Link from 'next/link';
import { orgPath } from '@/lib/custom-domain';
import type { TemplateCustomConfig } from '@/components/campus/template-customizer-modal';
import { cn } from '@/lib/utils';

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

/* ═══════════════════════════════════════════════════════════════════
   MODÈLE "VLADI" — Orange Studio & Product Design
   Design Ultra-Premium : Fond blanc immaculé & noir carbone sombre,
   accents orange intense (#FF6B00 / #F47C20), typographie audacieuse,
   navigation interactive fluide et finitions haute couture.
═══════════════════════════════════════════════════════════════════ */
export function TemplateProductMastery({
    org, orgSlug, classrooms, filieres, teacherCount, studentCount, gallery, bc, onOpenInscription
}: TemplateProps) {
    const cfg: TemplateCustomConfig = org.template_config || {};
    const [activeSlide, setActiveSlide] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('hero');

    const trainerName    = cfg.trainer_name    || org.name       || 'Vladi Studio';
    const trainerTitle   = cfg.trainer_title   || org.motto      || 'Product Designer & Formateur';
    const trainerBio     = cfg.trainer_bio     || org.about_text || 'Nous créons des expériences digitales mémorables et formons les leaders de la tech et du design de demain. Une pédagogie axée 100% sur la pratique et l\'excellence.';
    const trainerQuote   = cfg.trainer_quote   || '"L\'excellence du design et de la formation transforme les idées en réussites concrètes."';
    const yearsExp       = cfg.years_experience_value || '14';
    const availabilityBadge = cfg.availability_badge || 'DISPONIBLE POUR DES FORMATIONS & PROJETS';

    const heroImage = cfg.trainer_photo_url || org.hero_image_url || (gallery?.[0]) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80';

    const rawNavLinks = (cfg.nav_links_text || 'Accueil,À Propos,Services,Portfolio,Témoignages,Contact').split(',').map(s => s.trim());

    // Navigation Smooth Scroll Handler
    const scrollToSection = (linkName: string) => {
        setMobileMenuOpen(false);
        const l = linkName.toLowerCase();
        let targetId = 'hero';
        if (l.includes('propos') || l.includes('about')) targetId = 'about';
        else if (l.includes('service') || l.includes('formation') || l.includes('cours')) targetId = 'services';
        else if (l.includes('port') || l.includes('projet') || l.includes('realis')) targetId = 'portfolio';
        else if (l.includes('temoign') || l.includes('avis')) targetId = 'temoignages';
        else if (l.includes('contact') || l.includes('cv')) targetId = 'contact';

        setActiveSection(targetId);
        const el = document.getElementById(targetId);
        if (el) {
            const yOffset = -70;
            const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    const programs = filieres?.length > 0 ? filieres
        : classrooms?.length > 0 ? classrooms.map((c, i) => ({
            id: c.id || `c_${i}`,
            nom: c.name,
            category: i % 3 === 0 ? 'UI / UX Design' : i % 3 === 1 ? 'Web & Mobile' : 'Product Strategy',
            description: `Formation pratique d'élite niveau ${c.level || 'Expert'} avec projets réels et mentorat dédié.`,
            duree_mois: 3,
            frais_scolarite: 180000,
        }))
        : [
            { id: '1', nom: 'Design UI/UX & Systèmes', category: 'UI / UX Design', description: 'Conception d\'applications mobiles et web intuitives sur Figma avec Design Systems complets.', duree_mois: 3, frais_scolarite: 180000 },
            { id: '2', nom: 'Web Design & Prototypage', category: 'Web & Mobile', description: 'Création de sites interactifs percutants, animations avancées et intégration responsive.', duree_mois: 2, frais_scolarite: 150000 },
            { id: '3', nom: 'Product Design & Growth', category: 'Product Strategy', description: 'Du concept au lancement : stratégie produit, conversion UX et direction artistique.', duree_mois: 2, frais_scolarite: 120000 },
        ];

    const portfolioProjects = gallery?.length >= 2 ? gallery.slice(0, 4).map((img, i) => ({
        id: i,
        title: [`App Mobile Fintech`, `Refonte E-Commerce Luxe`, `Dashboard SaaS Analytics`, `Plateforme Éducative 3.0`][i] || `Projet Studio #${i + 1}`,
        cat: [`Mobile UI`, `Web Design`, `Design System`, `Product Design`][i] || `Design`,
        img
    })) : [
        { id: 1, title: 'App Mobile Fintech Next-Gen', cat: 'Mobile UI / UX', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80' },
        { id: 2, title: 'Design System & Architecture SaaS', cat: 'Design System', img: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80' },
        { id: 3, title: 'Plateforme E-Learning Interactive', cat: 'Web Platform', img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80' },
        { id: 4, title: 'Branding & Direction Artistique', cat: 'Brand Identity', img: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&auto=format&fit=crop&q=80' },
    ];

    const testimonials = [
        { name: 'Arnaud M.', role: 'Lead Product Manager', quote: 'Une formation exceptionnelle qui a complètement transformé notre approche du design et de l\'ergonomie.', stars: 5 },
        { name: 'Élodie K.', role: 'Designer UI/UX Indépendante', quote: 'Pédagogie ultra-concrète. En 3 mois, j\'ai décroché mes premiers contrats internationaux.', stars: 5 },
        { name: 'Serge T.', role: 'Fondateur de Startup', quote: 'Le meilleur investissement pour notre équipe. Des cours d\'une clarté et d\'un professionnalisme rares.', stars: 5 },
    ];

    return (
        <div className="min-h-screen bg-white text-[#0D0D0D] overflow-x-hidden font-sans antialiased selection:bg-[#FF6B00] selection:text-white">

            {/* ══ STICKY NAVBAR ══ */}
            <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100/80 transition-all">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
                    {/* Logo & Brand */}
                    <div
                        onClick={() => scrollToSection('hero')}
                        className="flex items-center gap-3 cursor-pointer group"
                    >
                        {org.logo_url ? (
                            <img src={org.logo_url} alt={trainerName} className="h-9 w-auto max-w-[140px] object-contain transition-transform group-hover:scale-105" />
                        ) : (
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#FF6B00] to-[#FF8C38] flex items-center justify-center shadow-lg shadow-orange-500/25">
                                    <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <span className="font-black text-sm sm:text-base tracking-tight text-[#0D0D0D] group-hover:text-[#FF6B00] transition-colors">
                                    {trainerName}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Nav Links Desktop */}
                    <nav className="hidden lg:flex items-center gap-7 bg-gray-50/80 px-5 py-2 rounded-full border border-gray-200/50">
                        {rawNavLinks.map((lnk, i) => (
                            <button
                                key={i}
                                onClick={() => scrollToSection(lnk)}
                                className={cn(
                                    'text-xs font-bold transition-all relative py-1 hover:text-[#FF6B00]',
                                    i === 0 ? 'text-[#0D0D0D]' : 'text-gray-500'
                                )}
                            >
                                {lnk}
                            </button>
                        ))}
                    </nav>

                    {/* Actions & Mobile toggle */}
                    <div className="flex items-center gap-2.5">
                        <Link href={orgPath(orgSlug, 'login')} className="hidden sm:inline-flex">
                            <button className="text-xs font-bold px-4 h-10 rounded-full text-gray-700 hover:text-black hover:bg-gray-100 transition-colors">
                                Espace Élève
                            </button>
                        </Link>

                        <button
                            onClick={onOpenInscription || (() => scrollToSection('contact'))}
                            className="inline-flex items-center gap-1.5 bg-[#FF6B00] hover:bg-[#E05E00] text-white font-extrabold text-xs rounded-full px-5 h-10 transition-all shadow-md shadow-orange-500/20 active:scale-95"
                        >
                            <span>Postuler / Contact</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                            onClick={() => setMobileMenuOpen(v => !v)}
                            className="lg:hidden p-2 rounded-xl text-gray-700 hover:bg-gray-100 transition"
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Drawer */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="lg:hidden border-b border-gray-100 bg-white/95 backdrop-blur-2xl px-6 py-5 space-y-3"
                        >
                            {rawNavLinks.map((lnk, i) => (
                                <button
                                    key={i}
                                    onClick={() => scrollToSection(lnk)}
                                    className="block w-full text-left font-bold text-sm text-gray-800 hover:text-[#FF6B00] py-2 border-b border-gray-50 transition"
                                >
                                    {lnk}
                                </button>
                            ))}
                            <div className="pt-2 flex flex-col gap-2">
                                <Link href={orgPath(orgSlug, 'login')} onClick={() => setMobileMenuOpen(false)}>
                                    <button className="w-full py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700">
                                        Espace Connexion
                                    </button>
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* ══ HERO SECTION (#hero) ══ */}
            <section id="hero" className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-20 overflow-hidden">
                {/* Subtle orange mesh bg */}
                <div className="absolute top-0 right-10 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl pointer-events-none -z-10" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">

                    {/* Left Column (7 cols) */}
                    <div className="lg:col-span-7 space-y-7 z-10">
                        {/* Status Badge */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-200/60 shadow-sm"
                        >
                            <span className="w-2 h-2 rounded-full bg-[#FF6B00] animate-pulse" />
                            <span className="text-[11px] font-extrabold tracking-wider text-[#FF6B00] uppercase">
                                {availabilityBadge}
                            </span>
                        </motion.div>

                        {/* Grand Titre Harmonieux */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-3"
                        >
                            <h1 className="text-4xl sm:text-6xl xl:text-7xl font-black leading-[1.05] tracking-tight text-[#0D0D0D]">
                                {trainerName.length > 22 ? (
                                    <>
                                        Bienvenue sur <span className="bg-gradient-to-r from-[#FF6B00] to-[#FFA149] bg-clip-text text-transparent">{trainerName}</span>
                                    </>
                                ) : (
                                    <>
                                        L&apos;Excellence de <span className="bg-gradient-to-r from-[#FF6B00] to-[#FFA149] bg-clip-text text-transparent">{trainerName}</span>
                                    </>
                                )}
                            </h1>
                            <p className="text-lg sm:text-xl font-bold text-gray-600 max-w-xl">
                                {trainerTitle}
                            </p>
                        </motion.div>

                        {/* Citation / Bio */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="p-5 rounded-2xl bg-gray-50/80 border border-gray-200/70 relative max-w-xl"
                        >
                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed italic">
                                {trainerBio}
                            </p>
                        </motion.div>

                        {/* KPIs & Avis */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg pt-1"
                        >
                            <div className="p-3.5 rounded-2xl border border-gray-100 bg-white shadow-sm">
                                <div className="flex items-center gap-0.5 text-amber-500 mb-1">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                                    ))}
                                </div>
                                <p className="text-xs font-black text-gray-900">5.0 / 5 Étoiles</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Avis certifiés</p>
                            </div>

                            <div className="p-3.5 rounded-2xl border border-gray-100 bg-white shadow-sm">
                                <p className="text-xl sm:text-2xl font-black text-[#FF6B00]">{yearsExp}+ Ans</p>
                                <p className="text-[10px] font-bold text-gray-400 mt-0.5">D&apos;Expertise & Succès</p>
                            </div>

                            <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl border border-gray-100 bg-white shadow-sm">
                                <p className="text-xl sm:text-2xl font-black text-gray-900">{studentCount > 0 ? `+${studentCount}` : '+500'}</p>
                                <p className="text-[10px] font-bold text-gray-400 mt-0.5">Étudiants Diplômés</p>
                            </div>
                        </motion.div>

                        {/* Hero CTAs */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="flex flex-wrap items-center gap-3.5 pt-2"
                        >
                            <button
                                onClick={() => scrollToSection('services')}
                                className="inline-flex items-center gap-2 bg-[#FF6B00] hover:bg-[#E05E00] text-white font-black text-sm rounded-full px-8 h-13 transition-all shadow-xl shadow-orange-500/25 active:scale-95"
                            >
                                <BookOpen className="w-4 h-4" />
                                <span>Explorer les Formations</span>
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </button>

                            <button
                                onClick={() => scrollToSection('portfolio')}
                                className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white font-bold text-sm rounded-full px-7 h-13 transition-all active:scale-95 shadow-md"
                            >
                                <Palette className="w-4 h-4" />
                                <span>Voir le Portfolio</span>
                            </button>
                        </motion.div>
                    </div>

                    {/* Right Column (5 cols) — Portrait Sculpté & Cercle Orange */}
                    <div className="lg:col-span-5 flex justify-center relative">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6 }}
                            className="relative w-full max-w-[360px] sm:max-w-[420px] aspect-[4/5] flex items-end justify-center"
                        >
                            {/* Grand Cercle Orange Vibrant */}
                            <div className="absolute inset-x-4 bottom-4 top-16 bg-gradient-to-tr from-[#FF6B00] to-[#FFA658] rounded-[3rem] shadow-2xl shadow-orange-500/30 transform rotate-1" />

                            {/* Halo lumineux */}
                            <div className="absolute inset-0 bg-orange-400/20 blur-2xl rounded-full pointer-events-none" />

                            {/* Photo Formateur / Établissement */}
                            <img
                                src={heroImage}
                                alt={trainerName}
                                className="relative z-10 w-full h-full object-cover object-top rounded-[2.8rem] transition-transform duration-500 hover:scale-[1.02]"
                            />

                            {/* Floating Tech Badges */}
                            <div className="absolute -top-3 -left-3 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-gray-200/80 shadow-xl flex items-center gap-2">
                                <span className="text-base">✨</span>
                                <div>
                                    <p className="text-[10px] font-black text-gray-900 leading-tight">100% Pratique</p>
                                    <p className="text-[9px] text-gray-500">Projets concrets</p>
                                </div>
                            </div>

                            <div className="absolute -bottom-3 -right-3 z-20 bg-gray-950/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-2 text-white">
                                <Award className="w-4 h-4 text-orange-400" />
                                <div>
                                    <p className="text-[10px] font-black leading-tight">Certificat Officiel</p>
                                    <p className="text-[9px] text-gray-400">Reconnu par les recruteurs</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                </div>
            </section>

            {/* ══ TICKER RIBBON (Compétences & Disciplines) ══ */}
            <div className="border-y border-gray-100 bg-[#0D0E12] text-white py-4 overflow-hidden">
                <div className="flex items-center gap-8 whitespace-nowrap animate-marquee font-black text-xs sm:text-sm tracking-wider uppercase">
                    {[
                        '🔥 UI / UX DESIGN D\'ÉLITE',
                        '⚡ DESIGN SYSTEMS & FIGMA',
                        '📱 APPLICATIONS MOBILES',
                        '🚀 PROTOTYPAGE & INTERACTIONS',
                        '🌐 WEB DESIGN RESPONSIVE',
                        '🎯 DIRECTION ARTISTIQUE',
                        '💼 INSERTION PROFESSIONNELLE'
                    ].map((item, i) => (
                        <span key={i} className="flex items-center gap-8 text-slate-300">
                            <span>{item}</span>
                            <span className="text-[#FF6B00]">✦</span>
                        </span>
                    ))}
                </div>
            </div>

            {/* ══ SECTION À PROPOS (#about) ══ */}
            <section id="about" className="py-24 max-w-7xl mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    <div className="lg:col-span-5 space-y-5">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                            <span>À Propos du Studio & Pédagogie</span>
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-950">
                            Former les talents qui conçoivent le <span className="text-[#FF6B00]">futur numérique</span>.
                        </h2>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Notre mission est de fournir des formations de standard international. Pas de théories superflues : vous concevez des produits réels, bâtissez un portfolio d&apos;exception et maîtrisez les standards de l&apos;industrie.
                        </p>
                        <div className="space-y-3 pt-2">
                            {[
                                'Accompagnement et mentorat personnalisé en direct',
                                'Accès à vie aux ressources et communautés d\'experts',
                                'Certification de fin d\'études avec validation de compétences'
                            ].map((feat, i) => (
                                <div key={i} className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-gray-800">
                                    <CheckCircle2 className="w-4 h-4 text-[#FF6B00] shrink-0" />
                                    <span>{feat}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-6 rounded-3xl bg-orange-500/10 border border-orange-500/20 space-y-2">
                            <Laptop className="w-8 h-8 text-[#FF6B00]" />
                            <h3 className="font-black text-lg text-gray-950">Ateliers & Live Design</h3>
                            <p className="text-xs text-gray-600 leading-relaxed">Pratique intensive sur des cas d&apos;entreprises réelles avec feedbacks en direct.</p>
                        </div>
                        <div className="p-6 rounded-3xl bg-gray-900 text-white space-y-2">
                            <Layers className="w-8 h-8 text-orange-400" />
                            <h3 className="font-black text-lg">Portfolio & CV Pro</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">Création de 3 à 5 projets majeurs prêts à présenter aux recruteurs et clients.</p>
                        </div>
                        <div className="p-6 rounded-3xl bg-gray-50 border border-gray-200/80 space-y-2">
                            <Users className="w-8 h-8 text-gray-800" />
                            <h3 className="font-black text-lg text-gray-950">Réseau & Communauté</h3>
                            <p className="text-xs text-gray-600 leading-relaxed">Échangez avec des centaines d&apos;anciens élèves en poste dans le monde entier.</p>
                        </div>
                        <div className="p-6 rounded-3xl bg-[#FF6B00] text-white space-y-2">
                            <Award className="w-8 h-8 text-white" />
                            <h3 className="font-black text-lg">Diplôme Sécurisé</h3>
                            <p className="text-xs text-orange-100 leading-relaxed">Attestation numérique vérifiable par code QR et signature officielle.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ SECTION SERVICES & FORMATIONS (#services) — MODE SOMBRE LUXURY ══ */}
            <section id="services" className="bg-[#0B0C10] text-white py-24 relative overflow-hidden">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[140px] pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-bold">
                                <span>📚 Programmes & Services d&apos;Excellence</span>
                            </div>
                            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
                                Nos <span className="text-[#FF6B00]">Formations & Filières</span>
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-400 max-w-lg">
                                Choisissez votre parcours et acquérez des compétences de haut niveau immédiatement valorisables.
                            </p>
                        </div>

                        <button
                            onClick={onOpenInscription || (() => scrollToSection('contact'))}
                            className="bg-[#FF6B00] hover:bg-[#E05E00] text-white font-extrabold text-xs rounded-full px-6 h-11 transition shadow-lg shadow-orange-500/20 self-start md:self-auto"
                        >
                            Postuler maintenant →
                        </button>
                    </div>

                    {/* Grille de Cartes Programmes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {programs.map((prog: any, idx: number) => (
                            <motion.div
                                key={prog.id || idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="group relative rounded-3xl overflow-hidden bg-white/[0.03] border border-white/10 hover:border-orange-500/50 transition-all duration-300 flex flex-col justify-between p-6 hover:shadow-2xl hover:shadow-orange-500/10"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-300 font-extrabold text-[10px] uppercase">
                                            {prog.category || 'Programme Pro'}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-400">
                                            ⏱️ {prog.duree_mois ? `${prog.duree_mois} mois` : 'Parcours Certifiant'}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-black text-white group-hover:text-orange-400 transition-colors">
                                        {prog.nom}
                                    </h3>

                                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                                        {prog.description}
                                    </p>
                                </div>

                                <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-medium">Frais de scolarité</p>
                                        <p className="text-base font-black text-white">
                                            {prog.frais_scolarite ? `${new Intl.NumberFormat('fr-FR').format(prog.frais_scolarite)} FCFA` : 'Sur dossier'}
                                        </p>
                                    </div>

                                    <button
                                        onClick={onOpenInscription || (() => scrollToSection('contact'))}
                                        className="w-10 h-10 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white flex items-center justify-center transition transform group-hover:scale-110 shadow-lg shadow-orange-500/30"
                                        title="S'inscrire à ce programme"
                                    >
                                        <ArrowUpRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ SECTION PORTFOLIO & RÉALISATIONS (#portfolio) ══ */}
            <section id="portfolio" className="py-24 max-w-7xl mx-auto px-4 sm:px-6">
                <div className="text-center space-y-3 max-w-2xl mx-auto mb-16">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                        <span>🎨 Portfolio & Travaux d&apos;Étudiants</span>
                    </div>
                    <h2 className="text-3xl sm:text-5xl font-black text-gray-950">
                        Des réalisations qui parlent d&apos;elles-mêmes.
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600">
                        Aperçu des interfaces et applications conçues durant les sessions de formation.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {portfolioProjects.map((item) => (
                        <div
                            key={item.id}
                            className="group rounded-3xl overflow-hidden border border-gray-200/80 bg-white shadow-sm hover:shadow-xl transition-all duration-300"
                        >
                            <div className="relative aspect-video overflow-hidden bg-gray-100">
                                <img
                                    src={item.img}
                                    alt={item.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                    <span className="text-white text-xs font-black">{item.cat}</span>
                                </div>
                            </div>
                            <div className="p-4">
                                <span className="text-[10px] font-bold text-[#FF6B00] uppercase tracking-wider">{item.cat}</span>
                                <h4 className="font-extrabold text-sm text-gray-900 mt-1 truncate">{item.title}</h4>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ══ SECTION TÉMOIGNAGES (#temoignages) ══ */}
            <section id="temoignages" className="bg-gray-50/80 border-y border-gray-100 py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="text-center space-y-3 max-w-2xl mx-auto mb-14">
                        <span className="px-3.5 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-bold">
                            ⭐ Retours d&apos;Expérience
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black text-gray-950">
                            Ce que disent nos apprenants
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {testimonials.map((t, idx) => (
                            <div key={idx} className="p-6 rounded-3xl bg-white border border-gray-200/80 shadow-sm space-y-4">
                                <div className="flex items-center gap-1 text-amber-500">
                                    {[...Array(t.stars)].map((_, i) => (
                                        <Star key={i} className="w-4 h-4 fill-current" />
                                    ))}
                                </div>
                                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed italic">
                                    &ldquo;{t.quote}&rdquo;
                                </p>
                                <div className="pt-2 border-t border-gray-100">
                                    <p className="font-extrabold text-xs text-gray-900">{t.name}</p>
                                    <p className="text-[11px] text-gray-400">{t.role}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ SECTION CONTACT & REJOINDRE (#contact) ══ */}
            <section id="contact" className="py-24 max-w-5xl mx-auto px-4 sm:px-6">
                <div className="rounded-[3rem] bg-gradient-to-br from-[#0D0E12] to-[#1A1C24] text-white p-8 sm:p-14 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                        <div className="space-y-6">
                            <span className="px-3.5 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-bold">
                                📩 Contact Direct
                            </span>
                            <h2 className="text-3xl sm:text-5xl font-black leading-tight">
                                Prêt à booster votre <span className="text-[#FF6B00]">carrière tech</span> ?
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                Déposez votre candidature ou contactez directement l&apos;équipe d&apos;admission pour un entretien d&apos;orientation.
                            </p>

                            <div className="space-y-3 pt-2">
                                {org.email && (
                                    <div className="flex items-center gap-3 text-xs text-slate-300">
                                        <Mail className="w-4 h-4 text-orange-400" />
                                        <span>{org.email}</span>
                                    </div>
                                )}
                                {org.phone && (
                                    <div className="flex items-center gap-3 text-xs text-slate-300">
                                        <Phone className="w-4 h-4 text-orange-400" />
                                        <span>{org.phone}</span>
                                    </div>
                                )}
                                {org.quarter && (
                                    <div className="flex items-center gap-3 text-xs text-slate-300">
                                        <MapPin className="w-4 h-4 text-orange-400" />
                                        <span>{org.quarter}, {org.city}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions Rapides */}
                        <div className="p-6 rounded-3xl bg-white/[0.05] border border-white/10 backdrop-blur-md space-y-4">
                            <h3 className="font-extrabold text-base text-white">Rejoindre la prochaine session</h3>
                            <p className="text-xs text-slate-400">Places limitées par promotion afin de garantir un encadrement d&apos;excellence.</p>

                            <button
                                onClick={onOpenInscription}
                                className="w-full bg-[#FF6B00] hover:bg-[#E05E00] text-white font-black text-sm rounded-2xl h-12 transition shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
                            >
                                <GraduationCap className="w-4 h-4" />
                                <span>Remplir le dossier d&apos;inscription</span>
                            </button>

                            {org.whatsapp && (
                                <a
                                    href={`https://wa.me/${org.whatsapp.replace(/\D/g, '')}?text=Bonjour%20je%20souhaite%20des%20renseignements%20sur%20les%20formations`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl h-11 transition flex items-center justify-center gap-2"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    <span>Échanger sur WhatsApp</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ FOOTER ══ */}
            <footer className="bg-white border-t border-gray-100 py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                    <div>
                        <span className="font-black text-sm text-gray-950">{trainerName}</span>
                        <p className="text-[11px] text-gray-400 mt-0.5">© {new Date().getFullYear()} Tous droits réservés.</p>
                    </div>

                    <div className="flex items-center gap-6 text-xs font-bold text-gray-500">
                        <button onClick={() => scrollToSection('hero')} className="hover:text-[#FF6B00] transition">Haut de page ↑</button>
                        <Link href={orgPath(orgSlug, 'login')} className="hover:text-[#FF6B00] transition">Portail Élève</Link>
                    </div>
                </div>
            </footer>

        </div>
    );
}
