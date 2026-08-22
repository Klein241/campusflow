'use client';

import { motion } from 'framer-motion';
import { ArrowRight, ShoppingCart, Headphones } from 'lucide-react';
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
   MODÈLE "JULIE SOLOMON" — Coach Pastel & Expert
   Référence exacte :
   - Hero plein écran avec photo couvrant toute la largeur en haut
   - Bandeau "Auteur, Conférencier, Expert..." + logos presse
   - Section "Et si vous pouviez obtenir exactement ce que vous voulez?"
     avec couverture de livre à droite
   - Section podcast avec photo secondaire à gauche
   - Fond blanc / gris très clair
═══════════════════════════════════════════════════════════════════ */
export function TemplateCoachPastelle({
    org, orgSlug, classrooms, filieres, teacherCount, studentCount, gallery, bc, onOpenInscription
}: TemplateProps) {
    const cfg: TemplateCustomConfig = org.template_config || {};

    const trainerName     = cfg.trainer_name    || org.name       || 'Julie Solomon';
    const trainerTitle    = cfg.trainer_title   || org.motto      || 'Auteur, Conférencier, Accélérateur de Marques & Coach';
    const trainerSubtitle = cfg.trainer_subtitle || org.hero_subtitle || 'Et si vous pouviez obtenir exactement ce que vous voulez ?';
    const trainerBio      = cfg.trainer_bio     || org.about_text || 'Vous le pouvez — et je vais vous montrer le chemin grâce à mon bestseller. Passez de l\'Invisible à l\'Irrésistible.';
    const bookCta         = cfg.book_cta        || 'Commandez mon bestseller aujourd\'hui !';
    const podcastTitle    = cfg.podcast_title   || 'Le Podcast Influenceur';
    const podcastDesc     = cfg.podcast_description || 'Des centaines d\'épisodes, plus de 10 millions de téléchargements, des milliers d\'avis 5 étoiles. Le Podcast Influenceur comble les lacunes dans la vie et les affaires que vous n\'arrivez pas à cerner pour mener une réussite iconique.';
    const podcastDesc2    = cfg.podcast_desc2   || 'Découvrez pourquoi des milliers de personnes appellent ce podcast leur ressource incontournable pour tout ce qui concerne l\'influence, l\'impact et les transformations de vie.';

    const heroImage       = cfg.trainer_photo_url || org.hero_image_url || (gallery?.[0]) || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1400&auto=format&fit=crop&q=80';
    const secondaryImage  = cfg.trainer_photo_secondary_url || (gallery?.[1]) || 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=900&auto=format&fit=crop&q=80';
    const bookImage       = cfg.flagship_image_url || (gallery?.[2]) || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80';

    const pressLogos      = (cfg.press_logos_text || 'SUCCESS, People, Forbes, HUFFPOST, Yahoo!').split(',').map(s => s.trim());

    const navLinks = ['À Propos', 'Podcast', 'Livre', 'Accélérateur de Marques', 'Contactez-Moi'];

    return (
        <div className="min-h-screen bg-white text-[#1E293B] font-sans antialiased overflow-x-hidden">

            {/* ══ NAVBAR ══ */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    {/* Logo/Nom */}
                    <div>
                        {org.logo_url
                            ? <img src={org.logo_url} alt={trainerName} className="h-8 w-auto object-contain" />
                            : <span className="font-serif font-black tracking-[0.3em] text-base text-[#1E293B] uppercase">{trainerName}</span>
                        }
                    </div>

                    {/* Nav */}
                    <nav className="hidden md:flex items-center gap-7">
                        {navLinks.map((lnk, i) => (
                            <span key={i} className="text-xs text-gray-500 hover:text-[#1E293B] cursor-pointer transition-colors font-medium">
                                {lnk}
                            </span>
                        ))}
                    </nav>

                    {/* CTA */}
                    <button
                        onClick={onOpenInscription}
                        className="bg-[#1E293B] hover:bg-gray-800 text-white font-bold text-xs rounded-full px-5 h-9 transition-colors"
                    >
                        Travailler Avec Moi
                    </button>
                </div>
            </header>

            {/* ══ HERO — Photo Plein Écran ══ */}
            <section className="relative w-full" style={{ minHeight: 520 }}>
                {/* Image héro plein largeur */}
                <div className="w-full h-[520px] overflow-hidden relative">
                    <img
                        src={heroImage}
                        alt={trainerName}
                        className="w-full h-full object-cover object-top"
                    />
                    {/* Dégradé doux vers le bas */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/90" />
                    {/* Overlay déco lettre initiale */}
                    <div className="absolute right-12 bottom-0 text-[180px] font-serif font-black text-white/10 leading-none select-none">
                        {trainerName.split(' ').pop()?.[0] || 'J'}
                    </div>
                </div>
            </section>

            {/* ══ BANDEAU TITRE + LOGOS PRESSE ══ */}
            <section className="bg-white py-8 border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-6">
                    {/* Titre formateur */}
                    <p className="text-center font-serif italic text-lg text-[#1E293B] mb-6 font-bold">
                        {trainerTitle}
                    </p>

                    {/* Logos presse — scrolling */}
                    <div className="flex items-center justify-center gap-8 flex-wrap">
                        {pressLogos.map((logo, i) => (
                            <span key={i} className="font-black text-xs tracking-widest text-gray-400 uppercase">
                                {logo}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ SECTION LIVRE / PROGRAMME PHARE ══ */}
            <section className="py-20">
                <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
                    {/* Texte gauche */}
                    <div className="space-y-6">
                        {/* Badge "À NE PAS MANQUER" */}
                        <div className="inline-flex items-center gap-2 text-xs italic text-gray-500">
                            <span>⭐ L'une des formations les plus attendues de la saison</span>
                        </div>

                        <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#1E293B] leading-tight">
                            {trainerSubtitle}
                        </h2>

                        <p className="text-sm text-gray-600 leading-relaxed">
                            {trainerBio}
                        </p>

                        <p className="font-bold text-sm text-[#1E293B]">{bookCta}</p>

                        <button
                            onClick={onOpenInscription}
                            className="inline-flex items-center gap-2 bg-[#1E293B] hover:bg-gray-800 text-white font-bold text-xs rounded-full px-7 h-12 transition-colors shadow-lg"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            Commander Maintenant
                        </button>
                    </div>

                    {/* Couverture de livre / Image phare */}
                    <div className="flex justify-center lg:justify-end">
                        <div className="relative">
                            {/* Fond dégradé pastel */}
                            <div className="absolute inset-0 -m-8 rounded-3xl bg-gradient-to-br from-blue-50 to-purple-50" />
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
            <section className="py-20 bg-gray-50">
                <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
                    {/* Photo secondaire */}
                    <div className="relative hidden lg:block">
                        <div className="w-full h-96 rounded-3xl overflow-hidden shadow-xl">
                            <img
                                src={secondaryImage}
                                alt={trainerName + ' podcast'}
                                className="w-full h-full object-cover object-top"
                            />
                        </div>
                    </div>

                    {/* Texte */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-[#1E293B] flex items-center justify-center">
                                <Headphones className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 italic font-serif">Le</p>
                                <h2 className="font-serif font-black text-xl text-[#1E293B]">{podcastTitle}</h2>
                            </div>
                        </div>

                        <p className="text-sm text-gray-600 leading-relaxed">{podcastDesc}</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{podcastDesc2}</p>

                        <button
                            onClick={onOpenInscription}
                            className="inline-flex items-center gap-2 border-2 border-[#1E293B] text-[#1E293B] hover:bg-[#1E293B] hover:text-white font-bold text-xs rounded-full px-7 h-12 transition-all"
                        >
                            Écouter le Podcast
                        </button>
                    </div>
                </div>
            </section>

            {/* ══ FORMATIONS / PROGRAMMES ══ */}
            {(filieres?.length > 0 || classrooms?.length > 0) && (
                <section className="py-16 bg-white">
                    <div className="max-w-6xl mx-auto px-6">
                        <h2 className="font-serif font-black text-2xl text-[#1E293B] text-center mb-10">
                            Programmes & Formations
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            {(filieres?.length > 0 ? filieres : classrooms)?.slice(0, 3).map((item: any, i: number) => (
                                <motion.div
                                    key={item.id || i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="p-6 rounded-2xl border border-gray-100 hover:shadow-lg transition-all"
                                >
                                    <h3 className="font-bold text-sm text-[#1E293B] mb-2">{item.nom || item.name}</h3>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        {item.description || `Programme certifiant d'excellence. Méthodes appliquées et suivi personnalisé.`}
                                    </p>
                                    <button
                                        onClick={onOpenInscription}
                                        className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#1E293B]"
                                    >
                                        Découvrir <ArrowRight className="w-3 h-3" />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

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
