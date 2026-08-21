'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Sparkles, BookOpen, Headphones, ShoppingCart,
    CheckCircle2, ArrowRight, Star, Heart,
    Award, ShieldCheck, Mail, Phone, MapPin, Search
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

export function TemplateCoachPastelle({
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

    const trainerName = cfg.trainer_name || org.name || 'Julie Solomon';
    const trainerTitle = cfg.trainer_title || 'Auteur, Conférencier, Formateur Expert & Coach';
    const trainerSubtitle = cfg.trainer_subtitle || org.hero_subtitle || 'Développez votre plein potentiel, maîtrisez votre communication et propulsez vos projets.';
    const trainerBio = cfg.trainer_bio || org.about_text || 'Accompagnement d\'élite pour professionnels, entrepreneurs et passionnés d\'excellence.';
    const trainerQuote = cfg.trainer_quote || '"Le succès ne s\'attend pas, il se bâtit avec méthode et détermination."';

    const heroImage = cfg.trainer_photo_url || org.hero_image_url || org.about_image_url || (gallery && gallery[0]) || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1000&auto=format&fit=crop&q=80';
    const secondaryImage = cfg.trainer_photo_secondary_url || (gallery && gallery[1]) || 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=1000&auto=format&fit=crop&q=80';
    const flagshipImage = cfg.flagship_image_url || (gallery && gallery[2]) || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80';

    const pressLogos = (cfg.press_logos_text || 'SUCCESS, People, Forbes, HUFFPOST, yahoo!').split(',').map(s => s.trim());

    // Formations réelles
    const programs = (filieres && filieres.length > 0)
        ? filieres
        : (classrooms && classrooms.length > 0)
            ? classrooms.map((c, i) => ({
                id: c.id || `c_${i}`,
                nom: c.name,
                description: `Programme officiel niveau ${c.level || 'Mastery'}. Méthodes appliquées, exercices pratiques et suivi régulier.`,
                duree_mois: 3,
                frais_scolarite: 250000,
            }))
            : [
                { id: '1', nom: 'Masterclass Éloquence & Prise de Parole', description: 'Maîtrisez votre présence scénique et captivez votre auditoire.', duree_mois: 3, frais_scolarite: 250000 },
                { id: '2', nom: 'Accélérateur de Visibilité & Marque Personnelle', description: 'Devenez la référence incontournable de votre secteur.', duree_mois: 6, frais_scolarite: 450000 },
                { id: '3', nom: 'Leadership & Stratégie d\'Influence', description: 'Développez un charisme authentique et négociez avec assurance.', duree_mois: 4, frais_scolarite: 320000 },
            ];

    return (
        <div className="min-h-screen bg-[#F0F5F8] text-[#1E293B] font-sans antialiased overflow-x-hidden selection:bg-slate-900 selection:text-white">
            {/* ═══ Header Supérieur Julie Solomon ═══ */}
            <header className="sticky top-0 z-50 bg-[#F0F5F8]/90 backdrop-blur-md border-b border-slate-200/70">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {org.logo_url ? (
                            <img src={org.logo_url} alt={trainerName} className="h-10 w-auto object-contain" />
                        ) : (
                            <span className="font-serif text-2xl sm:text-3xl font-black tracking-widest text-[#152331] uppercase">
                                {trainerName}
                            </span>
                        )}
                    </div>

                    <nav className="hidden lg:flex items-center gap-8 text-xs font-semibold tracking-wider uppercase text-slate-700">
                        <a href="#about" className="hover:text-black transition">À Propos</a>
                        {cfg.show_podcast_section !== false && <a href="#podcast" className="hover:text-black transition">Podcast / Audio</a>}
                        {cfg.show_flagship_product !== false && <a href="#book" className="hover:text-black transition">Livre & Formations</a>}
                        <a href="#programs" className="hover:text-black transition">Cursus</a>
                    </nav>

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={onOpenInscription}
                            className="bg-[#152331] hover:bg-black text-white text-xs font-bold tracking-wider uppercase px-6 h-10 rounded-full shadow-lg transition"
                        >
                            Postuler au Cursus
                        </Button>
                        <Link href={orgPath(orgSlug, 'login')}>
                            <Button variant="ghost" className="text-xs font-bold text-slate-700 hover:text-black hidden sm:flex">
                                Connexion
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* ═══ Hero Section Julie Style ═══ */}
            <section className="relative pt-12 pb-20 px-4 sm:px-8 max-w-6xl mx-auto">
                <div className="text-center max-w-3xl mx-auto space-y-4 mb-10">
                    <p className="text-xs font-bold tracking-[0.25em] uppercase text-slate-600">
                        {trainerTitle}
                    </p>
                    <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-light text-[#152331] leading-[1.1] tracking-tight">
                        {trainerSubtitle}
                    </h1>
                </div>

                {/* Central High-Fashion Portrait */}
                <div className="relative max-w-xl mx-auto">
                    <div className="relative aspect-[4/5] rounded-[36px] overflow-hidden shadow-2xl border-4 border-white">
                        <img
                            src={heroImage}
                            alt={trainerName}
                            className="w-full h-full object-cover object-top"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                        
                        <div className="absolute bottom-6 left-6 right-6 text-white text-center">
                            <p className="font-serif text-xl sm:text-2xl font-light italic">
                                {trainerQuote}
                            </p>
                        </div>
                    </div>

                    {/* Stats Pill Toggles */}
                    {cfg.show_years_experience !== false && (
                        <div className="absolute -bottom-5 -left-4 sm:-left-8 bg-white p-4 px-6 rounded-2xl shadow-xl border border-slate-100 hidden sm:flex items-center gap-3">
                            <Award className="w-8 h-8 text-amber-500" />
                            <div>
                                <p className="text-2xl font-black text-slate-900">{cfg.years_experience_value || '14'}+</p>
                                <p className="text-[10px] font-bold uppercase text-slate-500">Années d'Excellence</p>
                            </div>
                        </div>
                    )}

                    {cfg.show_rating_stars !== false && (
                        <div className="absolute -bottom-5 -right-4 sm:-right-8 bg-white p-4 px-6 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3">
                            <div className="flex text-amber-400">
                                {'★'.repeat(5)}
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-900">{cfg.rating_score_value || '5.0★'}</p>
                                <p className="text-[10px] font-bold uppercase text-slate-500">Satisfaction Certifiée</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Press & Media Logos Strip */}
                {cfg.show_press_logos !== false && (
                    <div className="mt-20 pt-8 border-t border-slate-300/60 text-center space-y-4">
                        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-slate-500">
                            VU & RECOMMANDÉ DANS LES MÉDIAS
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-70">
                            {pressLogos.map((logo, idx) => (
                                <span key={idx} className="font-serif text-lg sm:text-2xl font-bold tracking-wider text-slate-800 uppercase">
                                    {logo}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* ═══ The Book / Flagship Product Section ═══ */}
            {cfg.show_flagship_product !== false && (
                <section id="book" className="py-20 bg-[#E5EEF3] border-y border-slate-300/60">
                    <div className="max-w-6xl mx-auto px-4 sm:px-8 grid lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <span className="inline-block px-3.5 py-1 rounded-full bg-white text-[#152331] text-xs font-bold tracking-wider uppercase shadow-sm">
                                {cfg.flagship_subtitle || "Formation N°1 Recommandée"}
                            </span>
                            <h2 className="font-serif text-3xl sm:text-5xl font-light text-[#152331] leading-tight">
                                {cfg.flagship_title || "Et si vous pouviez obtenir exactement ce que vous voulez ?"}
                            </h2>
                            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                                {cfg.flagship_description || "Une méthode étape par étape pour transformer votre savoir-faire en autorité reconnue, attirer les opportunités et bâtir un empire professionnel solide."}
                            </p>
                            <div className="flex items-center gap-4 pt-2">
                                <Button
                                    onClick={onOpenInscription}
                                    className="bg-[#152331] hover:bg-black text-white text-xs font-bold tracking-wider uppercase px-8 h-12 rounded-full shadow-xl flex items-center gap-2"
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    <span>{cfg.flagship_cta_text || "Commander / Réserver mon accès"}</span>
                                </Button>
                                {cfg.flagship_price && (
                                    <span className="text-sm font-black text-slate-900">
                                        {cfg.flagship_price}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 3D Floating Book Showcase */}
                        <div className="relative flex justify-center">
                            <div className="relative w-72 sm:w-80 aspect-[3/4] rounded-2xl bg-white p-3 shadow-2xl transform rotate-2 hover:rotate-0 transition duration-500">
                                <img
                                    src={flagshipImage}
                                    alt="Livre / Masterclass"
                                    className="w-full h-full object-cover rounded-xl"
                                />
                                <div className="absolute -top-3 -right-3 bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg">
                                    ★ Best-Seller
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* ═══ Podcast / Masterclass Section ═══ */}
            {cfg.show_podcast_section !== false && (
                <section id="podcast" className="py-24 max-w-6xl mx-auto px-4 sm:px-8">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="order-2 lg:order-1 relative aspect-[4/5] rounded-[32px] overflow-hidden shadow-2xl">
                            <img
                                src={secondaryImage}
                                alt={trainerName}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        <div className="order-1 lg:order-2 space-y-6">
                            <p className="font-serif italic text-xl text-slate-600">L'Émission Officielle</p>
                            <h2 className="font-serif text-3xl sm:text-5xl font-light text-[#152331] uppercase tracking-wide leading-tight">
                                {cfg.podcast_title || "LE PODCAST / MASTERCLASS"}
                            </h2>
                            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                                {cfg.podcast_description || "Des dizaines d'entretiens exclusifs, de leçons concrètes et d'enseignements stratégiques pour vous aider à franchir chaque palier de votre réussite."}
                            </p>
                            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#152331] text-white flex items-center justify-center">
                                        <Headphones className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-xs text-slate-900">Épisodes disponibles</p>
                                        <p className="text-[11px] text-slate-500">{cfg.podcast_episodes_count || '100+'} sessions d'écoute</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={onOpenInscription}
                                    variant="outline"
                                    className="border-slate-300 text-xs font-bold rounded-full"
                                >
                                    {cfg.podcast_cta_text || "Écouter / Voir"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* ═══ Programmes & Cursus Disponibles ═══ */}
            <section id="programs" className="py-20 bg-white border-t border-slate-200">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 space-y-12">
                    <div className="text-center space-y-2 max-w-2xl mx-auto">
                        <p className="text-xs font-bold tracking-[0.2em] uppercase text-slate-500">PROGRAMMES ACADÉMIQUES</p>
                        <h2 className="font-serif text-3xl sm:text-5xl font-light text-[#152331]">
                            Cursus & Formations Certifiantes
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {programs.map((p: any, idx: number) => (
                            <div
                                key={p.id || idx}
                                className="p-8 rounded-3xl bg-[#F8FAFC] border border-slate-200 hover:border-slate-400 transition-all flex flex-col justify-between space-y-6 shadow-sm hover:shadow-md"
                            >
                                <div className="space-y-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-200 text-slate-700 inline-block">
                                        {p.duree_mois ? `${p.duree_mois} mois` : 'Cursus'}
                                    </span>
                                    <h3 className="font-serif text-xl font-bold text-[#152331]">
                                        {p.nom || p.name}
                                    </h3>
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        {p.description || 'Formation immersive avec accompagnement pédagogique de haut niveau.'}
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-900">
                                        {p.frais_scolarite ? `${new Intl.NumberFormat('fr-FR').format(p.frais_scolarite)} XAF` : 'Sur dossier'}
                                    </span>
                                    <Button
                                        onClick={onOpenInscription}
                                        className="bg-[#152331] hover:bg-black text-white text-xs font-bold rounded-full px-4 h-9"
                                    >
                                        Postuler
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ Footer Julie Style ═══ */}
            <footer className="bg-[#152331] text-white py-12 border-t border-slate-800">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <p className="font-serif text-lg font-light tracking-widest uppercase">{trainerName}</p>
                    <p className="text-xs text-slate-400">© {new Date().getFullYear()} Tous droits réservés. Portail propulsé par IziTeach.</p>
                    <Button
                        onClick={onOpenInscription}
                        className="bg-white text-slate-950 hover:bg-slate-200 text-xs font-black rounded-full px-6"
                    >
                        Rejoindre le Cursus
                    </Button>
                </div>
            </footer>
        </div>
    );
}
