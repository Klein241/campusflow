'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowUpRight, Sparkles, Monitor, PenTool, Smile, Edit3,
    Menu, X, MessageSquare, Phone, Mail, MapPin, Send
} from 'lucide-react';
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
   MODÈLE "MARIANA NAPOLITANI" — Creative Studio
   - Fond crème/saumon pastel, vert forêt #1E6356
   - Sticky navbar avec smooth scrolling
   - Portrait en haut à droite avec badge disponible
   - Grille portefeuille avec filtres interactifs
   - Section "What I Do" (Services)
   - Témoignages & Stats
   - Footer vert sombre avec hub contact
═══════════════════════════════════════════════════════════════════ */
export function TemplateCreativeStudio({
    org, orgSlug, classrooms, filieres, teacherCount, studentCount, gallery, bc, onOpenInscription
}: TemplateProps) {
    const cfg: TemplateCustomConfig = org.template_config || {};
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [activeSection, setActiveSection] = useState('hero');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const trainerName     = cfg.trainer_name    || org.name       || 'Mariana Napolitani';
    const trainerTitle    = cfg.trainer_title   || org.motto      || 'Designer & Créatrice Visuelle';
    const trainerSubtitle = cfg.trainer_subtitle || org.hero_subtitle || 'Je crée des expériences numériques ludiques, premium et intentionnelles qui connectent les marques aux personnes.';
    const trainerBio      = cfg.trainer_bio     || org.about_text || 'Je crée des expériences premium qui connectent les marques aux personnes.';
    const heroImage       = cfg.trainer_photo_url || org.hero_image_url || (gallery?.[0]) || 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&auto=format&fit=crop&q=80';
    const availableTag    = cfg.available_text   || 'DISPONIBLE POUR DES PROJETS';
    const turningIdeas    = cfg.turning_ideas_text || 'Transformer les idées en expériences délicieuses ♡';
    const testimonialText = cfg.testimonial_text || '"Mariana est un mélange rare de créativité, de précision et de joie de travailler. Les résultats parlent d\'eux-mêmes !"';
    const testimonialAuthor = cfg.testimonial_author || 'Daniel James';
    const testimonialRole   = cfg.testimonial_role   || 'Fondateur, Freshbite';
    const projectsCount   = cfg.projects_count   || '30+';
    const clientsCount    = cfg.clients_count    || '12+';
    const yearsExp        = cfg.years_experience_value || '5+';
    const pressLogos      = (cfg.press_logos_text || 'Dribbble, Behance, Figma, Adobe, Notion').split(',').map(s => s.trim());

    const navLinks = ['Accueil', 'Travaux', 'Services', 'Témoignages', 'Contact'];

    // Smooth Scroll Helper
    const scrollToSection = (linkName: string) => {
        setMobileMenuOpen(false);
        const l = linkName.toLowerCase();
        let targetId = 'hero';
        if (l.includes('trav') || l.includes('port') || l.includes('projet')) targetId = 'travaux';
        else if (l.includes('serv') || l.includes('que je fais')) targetId = 'services';
        else if (l.includes('temoign') || l.includes('avis')) targetId = 'temoignages';
        else if (l.includes('contact')) targetId = 'contact';

        setActiveSection(targetId);
        const el = document.getElementById(targetId);
        if (el) {
            const yOffset = -70;
            const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    const filters = [
        { id: 'all',      label: 'Tous' },
        { id: 'web',      label: 'Web Design' },
        { id: 'branding', label: 'Branding' },
        { id: 'uiux',     label: 'UI/UX' },
    ];

    const projects = filieres?.length > 0
        ? filieres.slice(0, 3).map((f: any, i) => ({
            id: f.id || `f_${i}`,
            nom: f.nom || f.name,
            category: i % 3 === 0 ? 'web' : i % 3 === 1 ? 'branding' : 'uiux',
            image: gallery?.[i] || null,
            type: ['Web Design', 'Identité de Marque', 'Design UI/UX'][i % 3],
        }))
        : classrooms?.length > 0
            ? classrooms.slice(0, 3).map((c: any, i) => ({
                id: c.id || `c_${i}`,
                nom: c.name,
                category: i % 3 === 0 ? 'web' : i % 3 === 1 ? 'branding' : 'uiux',
                image: gallery?.[i] || null,
                type: ['Web Design', 'Identité de Marque', 'Design UI/UX'][i % 3],
            }))
            : [
                { id: '1', nom: 'Freshbite - Healthy Food Delivery', category: 'uiux', type: 'Design UI/UX', image: null },
                { id: '2', nom: 'Leaf & Co. - Éco Cosmétiques', category: 'branding', type: 'Identité de Marque', image: null },
                { id: '3', nom: 'Wander - Agence de Voyage', category: 'web', type: 'Web Design', image: null },
            ];

    const filtered = activeFilter === 'all' ? projects : projects.filter((p: any) => p.category === activeFilter);

    const whatIDo = [
        { icon: Monitor,  label: 'Web Design', desc: 'Sites beaux, réactifs et engageants qui convertissent.' },
        { icon: PenTool,  label: 'Identité de Marque', desc: 'Des marques mémorables qui racontent votre histoire.' },
        { icon: Smile,    label: 'Design UI/UX', desc: 'Interfaces intuitives créant des expériences fluides.' },
        { icon: Edit3,    label: 'Illustration & Iconographie', desc: 'Illustrations ludiques pour donner vie aux idées.' },
    ];

    const ACCENT  = '#1E6356'; // vert forêt
    const BG_HERO = '#F5EDE8'; // crème saumon

    const cleanPhone = (org.phone || '').replace(/[^0-9]/g, '');
    const whatsappLink = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

    return (
        <div className="min-h-screen font-sans antialiased overflow-x-hidden" style={{ background: BG_HERO }}>

            {/* ══ NAVBAR ══ */}
            <header className="sticky top-0 z-50 bg-[#F5EDE8]/90 backdrop-blur-md border-b border-[#1E6356]/10">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <div
                        onClick={() => scrollToSection('hero')}
                        className="flex items-center gap-2 cursor-pointer"
                    >
                        {org.logo_url
                            ? <img src={org.logo_url} alt={trainerName} className="h-8 w-auto object-contain" />
                            : (
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg shadow-sm" style={{ background: ACCENT }} />
                                    <span className="font-black text-sm uppercase tracking-wide" style={{ color: ACCENT }}>{trainerName}</span>
                                </div>
                            )
                        }
                    </div>

                    {/* Nav Desktop */}
                    <nav className="hidden md:flex items-center gap-7">
                        {navLinks.map((lnk, i) => {
                            const isLnkActive = (
                                (lnk === 'Accueil' && activeSection === 'hero') ||
                                (lnk === 'Travaux' && activeSection === 'travaux') ||
                                (lnk === 'Services' && activeSection === 'services') ||
                                (lnk === 'Témoignages' && activeSection === 'temoignages') ||
                                (lnk === 'Contact' && activeSection === 'contact')
                            );
                            return (
                                <button
                                    key={i}
                                    onClick={() => scrollToSection(lnk)}
                                    className={`text-xs font-bold transition-colors ${
                                        isLnkActive ? 'text-[#1E6356] border-b-2 border-[#1E6356]' : 'text-gray-600 hover:text-[#1E6356]'
                                    }`}
                                >
                                    {lnk}
                                </button>
                            );
                        })}
                    </nav>

                    {/* CTA */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onOpenInscription || (() => scrollToSection('contact'))}
                            className="hidden sm:inline-flex items-center text-white font-bold text-xs rounded-full px-5 h-9 transition-all hover:scale-105 shadow-sm"
                            style={{ background: ACCENT }}
                        >
                            Prendre Contact
                        </button>

                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden w-9 h-9 rounded-xl border border-[#1E6356]/20 flex items-center justify-center text-[#1E6356]"
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
                            className="md:hidden border-b border-[#1E6356]/10 bg-[#F5EDE8] px-6 py-4 space-y-3"
                        >
                            {navLinks.map((lnk, i) => (
                                <button
                                    key={i}
                                    onClick={() => scrollToSection(lnk)}
                                    className="block w-full text-left py-2 text-sm font-bold text-gray-700 hover:text-[#1E6356]"
                                >
                                    {lnk}
                                </button>
                            ))}
                            <div className="pt-2 border-t border-[#1E6356]/10 flex flex-col gap-2">
                                <button
                                    onClick={() => { setMobileMenuOpen(false); onOpenInscription?.(); }}
                                    className="w-full text-center py-2.5 rounded-xl font-bold text-xs text-white"
                                    style={{ background: ACCENT }}
                                >
                                    Prendre Contact
                                </button>
                                <Link href={orgPath(orgSlug, 'login')}>
                                    <button className="w-full text-center py-2.5 rounded-xl font-bold text-xs border border-[#1E6356]/20 text-[#1E6356]">
                                        Espace Élève
                                    </button>
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* ══ HERO ══ */}
            <section id="hero" className="max-w-5xl mx-auto px-6 pt-12 pb-16 relative">
                <div className="grid lg:grid-cols-2 gap-8 items-start">
                    <div className="space-y-6">
                        <div>
                            <p className="text-sm font-bold mb-1" style={{ color: ACCENT }}>Bonjour, Je suis</p>
                            <h1 className="text-4xl sm:text-6xl font-black leading-[1.05] tracking-tighter text-[#0D1C19]">
                                {trainerName.split(' ').map((word: string, i: number) => (
                                    <span key={i}>{word} </span>
                                ))}
                            </h1>
                            <p className="text-base font-bold mt-2" style={{ color: ACCENT }}>{trainerTitle}</p>
                        </div>

                        <p className="text-sm text-gray-700 leading-relaxed max-w-sm">{trainerSubtitle}</p>

                        <div className="flex items-center gap-3 pt-2 flex-wrap">
                            <button
                                onClick={() => scrollToSection('travaux')}
                                className="inline-flex items-center gap-2 text-white font-bold text-xs rounded-full px-6 h-12 transition-all shadow-md hover:scale-105"
                                style={{ background: ACCENT }}
                            >
                                Voir les Travaux <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => scrollToSection('services')}
                                className="inline-flex items-center gap-2 text-xs rounded-full px-6 h-12 transition-all font-bold border hover:bg-white/40"
                                style={{ borderColor: ACCENT, color: ACCENT }}
                            >
                                À Propos & Services <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                            {whatsappLink && (
                                <a
                                    href={whatsappLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 text-xs font-bold px-5 h-12 rounded-full border border-emerald-600 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    WhatsApp
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Portrait */}
                    <div className="relative flex justify-center lg:justify-end">
                        <Sparkles className="absolute top-4 left-4 w-5 h-5 text-yellow-500 pointer-events-none" />
                        <div className="absolute top-10 right-0 w-3 h-3 rounded-full bg-yellow-400 pointer-events-none" />
                        <div className="absolute bottom-16 left-0 w-4 h-4 rounded-full pointer-events-none" style={{ background: '#F4A261' }} />

                        <div className="relative">
                            <div className="w-72 h-84 rounded-3xl overflow-hidden shadow-2xl"
                                style={{ background: ACCENT }}>
                                <img
                                    src={heroImage}
                                    alt={trainerName}
                                    className="w-full h-full object-cover object-top"
                                />
                            </div>
                            {/* Turning ideas badge */}
                            <div className="absolute -bottom-4 -left-8 bg-white rounded-2xl px-4 py-3 shadow-xl max-w-[200px] border border-gray-100">
                                <p className="text-xs font-bold italic leading-snug" style={{ color: ACCENT }}>
                                    {turningIdeas}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ TRAVAUX SÉLECTIONNÉS ══ */}
            <section id="travaux" className="bg-white py-16">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                        <div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Portfolio</span>
                            <h2 className="font-black text-2xl flex items-center gap-2 text-[#0D1C19]">
                                Travaux Sélectionnés <Sparkles className="w-5 h-5 text-yellow-400" />
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            {filters.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setActiveFilter(f.id)}
                                    className="text-xs font-bold px-3 h-8 rounded-full transition-all"
                                    style={activeFilter === f.id
                                        ? { background: ACCENT, color: 'white' }
                                        : { background: '#F5F5F5', color: '#555' }}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {filtered.slice(0, 3).map((proj: any, idx) => (
                            <motion.div
                                key={proj.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="group rounded-3xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all cursor-pointer"
                                onClick={onOpenInscription}
                            >
                                <div className="aspect-[4/3] relative overflow-hidden"
                                    style={{ background: idx === 0 ? '#E8F5EE' : idx === 1 ? '#FFF3E8' : '#E8F0F5' }}>
                                    {proj.image
                                        ? <img src={proj.image} alt={proj.nom} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <span className="text-5xl opacity-30">
                                                    {idx === 0 ? '🥗' : idx === 1 ? '🌿' : '✈️'}
                                                </span>
                                            </div>
                                        )
                                    }
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onOpenInscription?.(); }}
                                        className="absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform"
                                        style={{ background: ACCENT }}
                                    >
                                        <ArrowUpRight className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-black text-sm text-[#0D1C19] group-hover:text-[#1E6356] transition-colors">{proj.nom}</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">{proj.type}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ WHAT I DO (SERVICES) ══ */}
            <section id="services" className="py-16" style={{ background: BG_HERO }}>
                <div className="max-w-5xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Illustration */}
                        <div className="flex items-center justify-center">
                            <div className="relative w-64 h-64 rounded-full overflow-hidden shadow-xl"
                                style={{ background: '#F4A261' }}>
                                {gallery?.[1]
                                    ? <img src={gallery[1]} alt="" className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center text-7xl">🧑‍🎨</div>
                                }
                                <div className="absolute top-3 right-4 text-2xl">👑</div>
                            </div>
                        </div>

                        {/* Services grid */}
                        <div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Services Proposés</span>
                            <h2 className="font-black text-2xl text-[#0D1C19] flex items-center gap-2 mb-8">
                                Ce Que Je Fais <Sparkles className="w-5 h-5 text-yellow-500" />
                            </h2>
                            <div className="grid grid-cols-2 gap-6">
                                {whatIDo.map((item, i) => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={i} className="space-y-2">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                                                style={{ background: i % 2 === 0 ? '#E8F5EE' : '#E8F0F5' }}>
                                                <Icon className="w-5 h-5" style={{ color: ACCENT }} />
                                            </div>
                                            <h3 className="font-black text-sm text-[#0D1C19]">{item.label}</h3>
                                            <p className="text-xs text-gray-600 leading-snug">{item.desc}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ TÉMOIGNAGE + STATS ══ */}
            <section id="temoignages" className="bg-white py-16">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Témoignage */}
                        <div className="space-y-4">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Confiance & Rigueur</span>
                            <p className="text-base italic text-gray-700 leading-relaxed">
                                {testimonialText}
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100">
                                    {gallery?.[2]
                                        ? <img src={gallery[2]} alt={testimonialAuthor} className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
                                    }
                                </div>
                                <div>
                                    <p className="font-black text-xs text-[#0D1C19]">{testimonialAuthor}</p>
                                    <p className="text-xs text-gray-500">{testimonialRole}</p>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-8 justify-center lg:justify-end">
                            {[
                                { value: projectsCount, label: 'Projets Réalisés' },
                                { value: clientsCount,  label: 'Clients Heureux' },
                                { value: yearsExp,      label: "Ans d'Expérience" },
                            ].map((stat, i) => (
                                <div key={i} className="text-center">
                                    <p className="text-4xl font-black" style={{ color: ACCENT }}>{stat.value}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ FOOTER VERT SOMBRE / CONTACT ══ */}
            <footer id="contact" className="py-16" style={{ background: '#0D1C19' }}>
                <div className="max-w-5xl mx-auto px-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-10">
                        <div>
                            <h3 className="font-black text-2xl text-white leading-tight">
                                Créons quelque chose <span className="italic font-serif" style={{ color: '#F4A261' }}>d'incroyable !</span>
                            </h3>
                            <button
                                onClick={onOpenInscription}
                                className="mt-4 px-6 h-11 rounded-full text-xs font-black text-white transition-transform hover:scale-105"
                                style={{ background: ACCENT }}
                            >
                                Démarrer un Projet →
                            </button>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Contactez-nous</p>
                            <div className="space-y-2">
                                <p className="text-xs text-gray-400 flex items-center gap-2">
                                    <Mail className="w-3.5 h-3.5 text-[#F4A261]" /> {cfg.contact_email || org.email || 'contact@studio.com'}
                                </p>
                                {org.phone && (
                                    <p className="text-xs text-gray-400 flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5 text-[#F4A261]" /> {org.phone}
                                    </p>
                                )}
                                <p className="text-xs text-gray-400 flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 text-[#F4A261]" /> {org.city || 'Partout dans le monde'}
                                </p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Réseaux & Plateformes</p>
                            <div className="flex items-center gap-3">
                                {['Bé', '⊕', '📷', 'in'].map((icon, i) => (
                                    <button key={i} className="w-9 h-9 rounded-full border border-gray-700 flex items-center justify-center text-xs text-gray-400 hover:border-gray-500 transition-colors">
                                        {icon}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 pt-6 flex items-center justify-between">
                        <p className="text-xs text-gray-500">© {new Date().getFullYear()} {trainerName} · Tous droits réservés</p>
                        <Link href={orgPath(orgSlug, 'login')}>
                            <button className="text-xs text-gray-400 hover:text-white transition-colors">
                                Connexion Étudiant
                            </button>
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
