'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Star } from 'lucide-react';
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

/* ═══════════════════════════════════════════════════════════════════
   MODÈLE "VLADI" — Product Designer Studio
   Référence exacte : Jcrea Design (Fond blanc, accent orange, 
   portrait sur cercle orange, section services sombre)
═══════════════════════════════════════════════════════════════════ */
export function TemplateProductMastery({
    org, orgSlug, classrooms, filieres, teacherCount, studentCount, gallery, bc, onOpenInscription
}: TemplateProps) {
    const cfg: TemplateCustomConfig = org.template_config || {};
    const [activeSlide, setActiveSlide] = useState(0);

    const trainerName    = cfg.trainer_name    || org.name       || 'Vladi';
    const trainerTitle   = cfg.trainer_title   || org.motto      || 'Product Designer';
    const trainerBio     = cfg.trainer_bio     || org.about_text || 'Une conception de produit exceptionnelle qui assure le succès de votre projet. Hautement recommandé.';
    const trainerQuote   = cfg.trainer_quote   || '"Une conception exceptionnelle garantit le succès de votre site."';
    const yearsExp       = cfg.years_experience_value || '14';

    const heroImage      = cfg.trainer_photo_url || org.hero_image_url || (gallery?.[0]) || 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&auto=format&fit=crop&q=80';

    const navLinks = (cfg.nav_links_text || 'Accueil,À Propos,Services,Portfolio,CV,Contact').split(',').map(s => s.trim());

    const programs = filieres?.length > 0 ? filieres
        : classrooms?.length > 0 ? classrooms.map((c, i) => ({
            id: c.id || `c_${i}`,
            nom: c.name,
            category: i % 3 === 0 ? 'ui' : i % 3 === 1 ? 'web' : 'landing',
            description: `Formation pratique niveau ${c.level || 'Pro'}.`,
            duree_mois: 3,
            frais_scolarite: 180000,
            mockupImages: [],
        }))
        : [
            { id: '1', nom: 'Design UI/UX', category: 'ui', description: 'Applications intuitives et modernes.', duree_mois: 3, frais_scolarite: 180000 },
            { id: '2', nom: 'Web Design', category: 'web', description: 'Sites performants & percutants.', duree_mois: 2, frais_scolarite: 150000 },
            { id: '3', nom: 'Landing Page', category: 'landing', description: 'Conversion maximale, copywriting percutant.', duree_mois: 2, frais_scolarite: 120000 },
        ];

    const slides = programs.slice(0, 3);

    useEffect(() => {
        const t = setInterval(() => setActiveSlide(p => (p + 1) % slides.length), 4000);
        return () => clearInterval(t);
    }, [slides.length]);

    return (
        <div className="min-h-screen bg-white text-[#0D0D0D] overflow-x-hidden font-sans antialiased">

            {/* ══ NAVBAR ══ */}
            <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        {org.logo_url
                            ? <img src={org.logo_url} alt={trainerName} className="h-8 w-auto object-contain" />
                            : (
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-[#F47C20] flex items-center justify-center">
                                        <span className="text-white font-black text-xs">{trainerName.slice(0, 2).toUpperCase()}</span>
                                    </div>
                                    <span className="font-black text-sm tracking-wide">{trainerName.toUpperCase()}</span>
                                </div>
                            )
                        }
                    </div>

                    {/* Nav Links */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navLinks.map((lnk, i) => (
                            <span key={i} className={`text-xs font-semibold cursor-pointer transition-colors ${i === 0 ? 'text-[#0D0D0D]' : 'text-gray-400 hover:text-[#F47C20]'}`}>
                                {lnk}
                            </span>
                        ))}
                    </nav>

                    <button
                        onClick={onOpenInscription}
                        className="bg-[#F47C20] hover:bg-orange-500 text-white font-black text-xs rounded-full px-5 h-9 transition-colors shadow-md shadow-orange-200"
                    >
                        Nous Contacter
                    </button>
                </div>
            </header>

            {/* ══ HERO ══ */}
            <section className="max-w-7xl mx-auto px-6 pt-12 pb-20">
                <div className="flex flex-col lg:flex-row items-center gap-12">

                    {/* Left — Texte */}
                    <div className="flex-1 space-y-6 z-10">
                        {/* Badge Pill */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 text-xs text-gray-500">
                            <span>Bonjour !</span>
                        </div>

                        <h1 className="text-5xl sm:text-7xl font-black leading-[1.0] tracking-tighter">
                            Je suis <span className="text-[#F47C20]">{trainerName.split(' ')[0]}</span>,<br/>
                            {trainerTitle}
                        </h1>

                        {/* Testimonial quote gauche */}
                        <div className="flex items-start gap-3 max-w-xs">
                            <span className="text-4xl text-gray-200 font-serif leading-none mt-1">"</span>
                            <div>
                                <p className="text-xs text-gray-500 leading-relaxed">{trainerBio}</p>
                            </div>
                        </div>

                        {/* Étoiles rating droite */}
                        <div className="flex items-center justify-between max-w-sm">
                            <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-5 h-5 fill-[#F47C20] text-[#F47C20]" />
                                ))}
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-black leading-none">{yearsExp} Ans</p>
                                <p className="text-xs text-gray-400">d'Expérience</p>
                            </div>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={onOpenInscription}
                                className="inline-flex items-center gap-2 bg-[#F47C20] hover:bg-orange-500 text-white font-black text-sm rounded-full px-7 h-12 transition-colors shadow-lg shadow-orange-200"
                            >
                                Portfolio <ArrowUpRight className="w-4 h-4" />
                            </button>
                            <Link href={orgPath(orgSlug, 'login')}>
                                <button className="inline-flex items-center gap-2 border border-gray-200 hover:border-gray-400 text-gray-700 font-semibold text-sm rounded-full px-7 h-12 transition-colors">
                                    Me Contacter
                                </button>
                            </Link>
                        </div>
                    </div>

                    {/* Right — Portrait sur cercle orange */}
                    <div className="flex-shrink-0 relative flex items-end justify-center" style={{ width: 380, height: 420 }}>
                        {/* Cercle orange de fond */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#F47C20] rounded-full" />
                        {/* Photo du formateur */}
                        <img
                            src={heroImage}
                            alt={trainerName}
                            className="relative z-10 w-72 h-96 object-cover object-top"
                            style={{ borderRadius: '48% 48% 0 0' }}
                        />
                    </div>
                </div>
            </section>

            {/* ══ SECTION SERVICES — Fond sombre ══ */}
            <section className="bg-[#1A1A1A] text-white py-20">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col lg:flex-row items-start gap-12 mb-14">
                        <div className="lg:w-1/3">
                            <h2 className="text-3xl font-black">
                                Mes <span className="text-[#F47C20]">Services</span>
                            </h2>
                        </div>
                        <div className="lg:w-2/3">
                            <p className="text-gray-400 text-sm leading-relaxed max-w-lg">
                                {trainerBio}
                            </p>
                        </div>
                    </div>

                    {/* Carrousel de services / programmes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {slides.map((prog: any, idx) => (
                            <motion.div
                                key={prog.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className={`relative rounded-3xl overflow-hidden cursor-pointer transition-all border ${activeSlide === idx ? 'border-[#F47C20]/50' : 'border-white/10'} bg-[#242424]`}
                                onClick={() => setActiveSlide(idx)}
                            >
                                {/* Mockup placeholder */}
                                <div className="h-44 bg-gradient-to-br from-[#2E2E2E] to-[#1A1A1A] flex items-center justify-center overflow-hidden relative">
                                    {gallery?.[idx] ? (
                                        <img src={gallery[idx]} alt={prog.nom} className="w-full h-full object-cover opacity-60" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-orange-900/30 to-amber-900/10 flex items-center justify-center">
                                            <span className="text-4xl">
                                                {idx === 0 ? '📱' : idx === 1 ? '🌐' : '🚀'}
                                            </span>
                                        </div>
                                    )}
                                    <div className="absolute bottom-3 right-3">
                                        <button
                                            onClick={onOpenInscription}
                                            className="w-10 h-10 rounded-full bg-[#F47C20] flex items-center justify-center shadow-lg"
                                        >
                                            <ArrowUpRight className="w-4 h-4 text-white" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <p className="text-xs text-gray-500 mb-1">{prog.category?.toUpperCase() || 'FORMATION'}</p>
                                    <h3 className="font-black text-white text-base">{prog.nom}</h3>
                                    <p className="text-gray-400 text-xs mt-1.5 line-clamp-2">{prog.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Dots */}
                    <div className="flex justify-center gap-2 mt-8">
                        {slides.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveSlide(i)}
                                className={`h-2 rounded-full transition-all ${i === activeSlide ? 'w-8 bg-[#F47C20]' : 'w-2 bg-gray-600'}`}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ FOOTER ══ */}
            <footer className="bg-white border-t border-gray-100 py-8">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span className="font-black text-sm">{trainerName.toUpperCase()}</span>
                    <p className="text-xs text-gray-400">© {new Date().getFullYear()} {trainerName} · Tous droits réservés</p>
                    <div className="flex items-center gap-4">
                        <Link href={orgPath(orgSlug, 'login')}>
                            <button className="text-xs text-gray-500 hover:text-[#F47C20] transition-colors font-semibold">
                                Connexion Étudiant
                            </button>
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
