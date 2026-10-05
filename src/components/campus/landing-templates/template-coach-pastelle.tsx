'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight, ShoppingCart, Headphones, Menu, X,
    Star, MessageSquare, Mail, Phone, MapPin, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { orgPath } from '@/lib/custom-domain';
import type { TemplateCustomConfig } from '@/components/campus/template-customizer-modal';
import { cleanMotto } from '@/lib/clean-motto';
import { getNormalizedPrograms, getNormalizedStats, getNormalizedTestimonials } from './template-data-adapter';
import { ProgramCardSessionSelector } from './ProgramCardSessionSelector';

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

export function TemplateCoachPastelle({
    org, orgSlug, classrooms, filieres, teacherCount, studentCount, gallery, bc, onOpenInscription
}: TemplateProps) {
    const cfg: TemplateCustomConfig = org.template_config || {};
    const programs = getNormalizedPrograms(filieres, classrooms, org, cfg);
    const stats = getNormalizedStats(cfg, teacherCount, studentCount);
    const testimonials = getNormalizedTestimonials(cfg);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('hero');

    const trainerName     = cfg.trainer_name    || org.name       || 'Expert & Formateur';
    const trainerTitle    = cleanMotto(cfg.trainer_title || org.motto, 'Formateur, Conférencier & Coach Professionnel');
    const trainerSubtitle = cleanMotto(cfg.trainer_subtitle || org.hero_subtitle, 'Et si vous pouviez obtenir exactement ce que vous voulez ?');
    const trainerBio      = cfg.trainer_bio     || org.about_text || 'Vous le pouvez — et je vais vous montrer le chemin grâce à nos programmes. Passez de l\'Invisible à l\'Irrésistible.';
    const bookCta         = cfg.book_cta        || 'Rejoignez nos programmes certifiants aujourd\'hui !';
    const podcastTitle    = cfg.podcast_title   || 'Le Podcast Influenceur & Mentorat';
    const podcastDesc     = cfg.podcast_description || 'Des centaines d\'épisodes, des milliers d\'auditeurs et d\'avis 5 étoiles. Notre masterclass comble les lacunes dans la vie et les affaires pour mener une réussite iconique.';
    const podcastDesc2    = cfg.podcast_desc2   || 'Découvrez pourquoi des centaines de professionnels nous font confiance pour tout ce qui concerne l\'impact, la visibilité et l\'excellence.';

    const heroImage       = cfg.trainer_photo_url || org.hero_image_url || (gallery?.[0]) || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1400&auto=format&fit=crop&q=80';
    const secondaryImage  = cfg.trainer_photo_secondary_url || (gallery?.[1]) || 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=900&auto=format&fit=crop&q=80';
    const bookImage       = cfg.flagship_image_url || (gallery?.[2]) || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80';

    const pressLogos      = (cfg.press_logos_text || 'SUCCESS, People, Forbes, HUFFPOST, Yahoo!').split(',').map(s => s.trim());

    const navLinks = ['Accueil', 'Livre & Vision', 'Podcast', 'Programmes', 'Contact'];

    // Smooth Scroll Helper
    const scrollToSection = (linkName: string) => {
        setMobileMenuOpen(false);
        const l = linkName.toLowerCase();
        let targetId = 'hero';
        if (l.includes('livre') || l.includes('vision')) targetId = 'livre';
        else if (l.includes('podcast') || l.includes('media')) targetId = 'podcast';
        else if (l.includes('prog') || l.includes('format') || l.includes('cours')) targetId = 'programmes';
        else if (l.includes('contact')) targetId = 'contact';

        setActiveSection(targetId);
        const el = document.getElementById(targetId);
        if (el) {
            const yOffset = -70;
            const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    const cleanPhone = (org.phone || '').replace(/[^0-9]/g, '');
    const whatsappLink = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

    return (
        <div className="min-h-screen bg-white text-[#1E293B] font-sans antialiased overflow-x-hidden">

            {/* ══ NAVBAR ══ */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    {/* Logo/Nom */}
                    <div
                        onClick={() => scrollToSection('hero')}
                        className="cursor-pointer"
                    >
                        {org.logo_url
                            ? <img src={org.logo_url} alt={trainerName} className="h-8 w-auto object-contain" />
                            : <span className="font-serif font-black tracking-[0.25em] text-base text-[#1E293B] uppercase truncate max-w-[200px] sm:max-w-none">{trainerName}</span>
                        }
                    </div>

                    {/* Nav Desktop */}
                    <nav className="hidden md:flex items-center gap-7">
                        {navLinks.map((lnk, i) => {
                            const isLnkActive = (
                                (lnk === 'Accueil' && activeSection === 'hero') ||
                                (lnk.includes('Livre') && activeSection === 'livre') ||
                                (lnk === 'Podcast' && activeSection === 'podcast') ||
                                (lnk === 'Programmes' && activeSection === 'programmes') ||
                                (lnk === 'Contact' && activeSection === 'contact')
                            );
                            return (
                                <button
                                    key={i}
                                    onClick={() => scrollToSection(lnk)}
                                    className={`text-xs font-semibold cursor-pointer transition-colors ${
                                        isLnkActive ? 'text-[#1E293B] font-black border-b-2 border-[#1E293B]' : 'text-gray-500 hover:text-[#1E293B]'
                                    }`}
                                >
                                    {lnk}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Right CTA */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onOpenInscription || (() => scrollToSection('contact'))}
                            className="hidden sm:inline-flex items-center bg-[#1E293B] hover:bg-gray-800 text-white font-bold text-xs rounded-full px-5 h-9 transition-all hover:scale-105"
                        >
                            Travailler Avec Moi
                        </button>

                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-800"
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
                            className="md:hidden border-b border-gray-100 bg-white px-6 py-4 space-y-3"
                        >
                            {navLinks.map((lnk, i) => (
                                <button
                                    key={i}
                                    onClick={() => scrollToSection(lnk)}
                                    className="block w-full text-left py-2 text-sm font-semibold text-gray-700 hover:text-black"
                                >
                                    {lnk}
                                </button>
                            ))}
                            <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
                                <button
                                    onClick={() => { setMobileMenuOpen(false); onOpenInscription?.(); }}
                                    className="w-full text-center py-2.5 rounded-xl font-bold text-xs bg-[#1E293B] text-white"
                                >
                                    Travailler Avec Moi
                                </button>
                                <Link href={orgPath(orgSlug, 'login')}>
                                    <button className="w-full text-center py-2.5 rounded-xl font-bold text-xs bg-gray-100 text-gray-800">
                                        Espace Élève
                                    </button>
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* ══ HERO — Photo Plein Écran ══ */}
            <section id="hero" className="relative w-full" style={{ minHeight: 520 }}>
                <div className="w-full h-[520px] overflow-hidden relative">
                    <img
                        src={heroImage}
                        alt={trainerName}
                        className="w-full h-full object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/90" />
                    <div className="absolute right-12 bottom-0 text-[180px] font-serif font-black text-white/10 leading-none select-none pointer-events-none">
                        {trainerName.split(' ').pop()?.[0] || 'J'}
                    </div>
                </div>
            </section>

            {/* ══ BANDEAU TITRE + LOGOS PRESSE ══ */}
            <section className="bg-white py-8 border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-6">
                    <p data-editable-field="trainer_title" className="text-center font-serif italic text-lg text-[#1E293B] mb-6 font-bold cursor-pointer">
                        {trainerTitle}
                    </p>

                    <div data-editable-field="press_logos_text" className="flex items-center justify-center gap-8 flex-wrap cursor-pointer">
                        {pressLogos.map((logo, i) => (
                            <span key={i} className="font-black text-xs tracking-widest text-gray-400 uppercase">
                                {logo}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ SECTION LIVRE / PROGRAMME PHARE ══ */}
            <section id="livre" className="py-20">
                <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 text-xs italic text-gray-500">
                            <span>⭐ L'un des programmes les plus plébiscités de la saison</span>
                        </div>

                        <h2 data-editable-field="flagship_title" className="text-3xl sm:text-4xl font-serif font-black text-[#1E293B] leading-tight cursor-pointer">
                            {trainerSubtitle}
                        </h2>

                        <p data-editable-field="flagship_description" className="text-sm text-gray-600 leading-relaxed cursor-pointer">
                            {trainerBio}
                        </p>

                        <p data-editable-field="book_cta" className="font-bold text-sm text-[#1E293B] cursor-pointer">{bookCta}</p>

                        <div className="flex items-center gap-4 flex-wrap">
                            <button
                                data-editable-field="flagship_cta_text"
                                onClick={onOpenInscription}
                                className="inline-flex items-center gap-2 bg-[#1E293B] hover:bg-gray-800 text-white font-bold text-xs rounded-full px-7 h-12 transition-all shadow-lg hover:scale-105 cursor-pointer"
                            >
                                <ShoppingCart className="w-4 h-4" />
                                {cfg.flagship_cta_text || 'Commander Maintenant'}
                            </button>
                            {whatsappLink && (
                                <a
                                    href={whatsappLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 text-xs font-bold px-5 h-12 rounded-full border border-emerald-500/40 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    WhatsApp
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-center lg:justify-end">
                        <div className="relative">
                            <div className="absolute inset-0 -m-8 rounded-3xl bg-gradient-to-br from-blue-50 to-purple-50 pointer-events-none" />
                            <img
                                src={bookImage}
                                alt="Programme phare"
                                className="relative z-10 w-64 sm:w-80 shadow-2xl rounded-xl object-cover"
                                style={{ maxHeight: 400 }}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ SECTION PODCAST / PROGRAMME ══ */}
            <section id="podcast" className="py-20 bg-gray-50">
                <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
                    <div className="relative hidden lg:block">
                        <div
                            data-editable-field="trainer_photo_secondary_url"
                            className="w-full h-96 rounded-3xl overflow-hidden shadow-xl cursor-pointer"
                        >
                            <img
                                src={secondaryImage}
                                alt={trainerName + ' podcast'}
                                className="w-full h-full object-cover object-top"
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-[#1E293B] flex items-center justify-center">
                                <Headphones className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 italic font-serif">Le</p>
                                <h2 data-editable-field="podcast_title" className="font-serif font-black text-xl text-[#1E293B] cursor-pointer">{podcastTitle}</h2>
                            </div>
                        </div>

                        <p data-editable-field="podcast_description" className="text-sm text-gray-600 leading-relaxed cursor-pointer">{podcastDesc}</p>
                        <p data-editable-field="podcast_desc2" className="text-sm text-gray-600 leading-relaxed cursor-pointer">{podcastDesc2}</p>

                        <button
                            onClick={onOpenInscription}
                            className="inline-flex items-center gap-2 border-2 border-[#1E293B] text-[#1E293B] hover:bg-[#1E293B] hover:text-white font-bold text-xs rounded-full px-7 h-12 transition-all"
                        >
                            Écouter la Masterclass
                        </button>
                    </div>
                </div>
            </section>

            {/* ══ FORMATIONS / PROGRAMMES ══ */}
            <section id="programmes" className="py-20 bg-white">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center max-w-xl mx-auto mb-12">
                        <span data-editable-field="session_subtitle" className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1 cursor-pointer">
                            {cfg.session_subtitle || "Cursus d'Excellence & Prochaine Session"}
                        </span>
                        <h2 data-editable-field="session_title" className="font-serif font-black text-3xl text-[#1E293B] cursor-pointer">
                            {cfg.session_title || "Programmes & Formations"}
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {programs.map((item: any, i: number) => (
                            <motion.div
                                key={item.id || i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="p-7 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
                                onClick={onOpenInscription}
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <span
                                            data-editable-field={`program_${i}_duree`}
                                            className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100/60 px-2.5 py-1 rounded-full cursor-pointer"
                                        >
                                            ⏱️ {item.duree_texte}
                                        </span>
                                        {item.promo_badge && (
                                            <span
                                                data-editable-field={`program_${i}_promo`}
                                                className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full cursor-pointer"
                                            >
                                                {item.promo_badge}
                                            </span>
                                        )}
                                    </div>
                                    <h3
                                        data-editable-field={`program_${i}_nom`}
                                        className="font-bold text-base text-[#1E293B] group-hover:text-amber-800 transition-colors cursor-pointer"
                                    >
                                        {item.nom}
                                    </h3>
                                    <p
                                        data-editable-field={`program_${i}_description`}
                                        className="text-xs text-gray-600 leading-relaxed line-clamp-3 cursor-pointer"
                                    >
                                        {item.description}
                                    </p>
                                </div>
                                <div className="pt-4 mt-4 border-t border-gray-100">
                                    <ProgramCardSessionSelector
                                        program={item}
                                        brandColor="#B45309"
                                        onOpenInscription={onOpenInscription}
                                        showPoster={true}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ CONTACT SECTION ══ */}
            <section id="contact" className="py-20 bg-gray-50 border-t border-gray-100">
                <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Contact Privilégié</span>
                    <h2 className="font-serif font-black text-3xl sm:text-4xl text-[#1E293B]">
                        Prêt à débuter votre transformation ?
                    </h2>
                    <p className="text-sm text-gray-600 max-w-lg mx-auto">
                        Inscrivez-vous directement ou contactez-nous pour réserver votre accompagnement stratégique personnalisé.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                        <button
                            onClick={onOpenInscription}
                            className="bg-[#1E293B] hover:bg-gray-800 text-white font-bold text-xs rounded-full px-8 h-12 transition-all shadow-md hover:scale-105"
                        >
                            S'inscrire Maintenant
                        </button>
                        {whatsappLink && (
                            <a
                                href={whatsappLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-xs font-bold px-6 h-12 rounded-full border border-gray-300 text-gray-800 bg-white hover:bg-gray-100 transition-all"
                            >
                                <MessageSquare className="w-4 h-4 text-emerald-600" />
                                Contacter par WhatsApp
                            </a>
                        )}
                    </div>
                </div>
            </section>

            {/* ══ FOOTER ══ */}
            <footer className="bg-[#1E293B] text-white py-12">
                <div className="max-w-6xl mx-auto px-6 text-center space-y-4">
                    <p className="font-serif font-black text-2xl tracking-widest uppercase">{trainerName}</p>
                    <Link href={orgPath(orgSlug, 'login')}>
                        <button className="text-xs text-gray-400 hover:text-white transition-colors">
                            Espace Étudiant
                        </button>
                    </Link>
                    <p className="text-xs text-gray-600">© {new Date().getFullYear()} {trainerName} · Tous droits réservés</p>
                </div>
            </footer>
        </div>
    );
}
