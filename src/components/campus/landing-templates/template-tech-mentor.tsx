'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight, ChevronRight, Menu, X, Mail,
    Phone, MapPin, MessageSquare, Send, ExternalLink,
    Sparkles, Award, Star, CheckCircle2
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
   MODÈLE "JENNA ORTEGA" — Dark Cyber Néon & Tech Trainer
   - Fond bleu marine très sombre (#0A0F1E), accent bleu néon (#00B4D8)
   - Sticky NavBar avec scroll interactif fluide vers chaque section
   - Hero : "HAY! JE SUIS [NOM] / [TITRE]", portrait sculpté avec sphères 3D
   - Bandeau logos partenaires défilant
   - Section "À PROPOS" : stats & bio
   - Section "MON TRAVAIL" : Grille projets récents
   - Section "SERVICES" : Formations et accompagnements
   - Section "CONTACT" : Hub de contact instantané & WhatsApp
═══════════════════════════════════════════════════════════════════ */
export function TemplateTechMentor({
    org, orgSlug, classrooms, filieres, teacherCount, studentCount, gallery, bc, onOpenInscription
}: TemplateProps) {
    const cfg: TemplateCustomConfig = org.template_config || {};
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('hero');
    const [formMsg, setFormMsg] = useState('');
    const [formName, setFormName] = useState('');
    const [formEmail, setFormEmail] = useState('');

    const trainerName     = cfg.trainer_name    || org.name       || 'Jenna Ortega';
    const trainerTitle1   = cfg.trainer_title   || org.motto      || 'FORMATRICE TECH';
    const trainerSubtitle = cfg.trainer_subtitle || org.hero_subtitle || 'Experte en développement web, design UI/UX et accompagnement digital pour les professionnels de demain.';
    const aboutTitle      = cfg.about_title     || 'JE SUIS DISPONIBLE POUR UN PROJET UI/UX DESIGN & FORMATIONS';
    const aboutText       = cfg.trainer_bio     || org.about_text || 'Chaque projet est une opportunité unique de créer une expérience exceptionnelle. Mon approche combine expertise technique et sensibilité créative pour des résultats qui dépassent les attentes.';
    const pressLogos      = (cfg.press_logos_text || 'logoipsum, LOGOIPSUM, logoipsum, LOGO IPSUM, logoipsum').split(',').map(s => s.trim());
    const reviewCount     = cfg.review_count     || '280+';
    const yearsExp        = cfg.years_experience_value || '15+';
    const awardsCount     = cfg.awards_count     || '49+';

    const heroImage       = cfg.trainer_photo_url || org.hero_image_url || (gallery?.[0]) || 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&auto=format&fit=crop&q=80';
    const aboutImage      = cfg.trainer_photo_secondary_url || (gallery?.[1]) || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=700&auto=format&fit=crop&q=80';

    const navLinks = ['Accueil', 'À Propos', 'Projets', 'Services', 'Contact'];

    // Smooth Scroll Helper
    const scrollToSection = (linkName: string) => {
        setMobileMenuOpen(false);
        const l = linkName.toLowerCase();
        let targetId = 'hero';
        if (l.includes('propos') || l.includes('about')) targetId = 'about';
        else if (l.includes('projet') || l.includes('travail') || l.includes('port')) targetId = 'projets';
        else if (l.includes('service') || l.includes('formation')) targetId = 'services';
        else if (l.includes('contact')) targetId = 'contact';

        setActiveSection(targetId);
        const el = document.getElementById(targetId);
        if (el) {
            const yOffset = -70;
            const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    const projects = filieres?.length > 0
        ? filieres.slice(0, 3).map((f: any, i) => ({
            id: f.id || `f_${i}`, nom: f.nom || f.name,
            cat: ['Web Design', 'App Design', 'UI/UX Design'][i % 3],
            image: gallery?.[i + 1] || null,
        }))
        : classrooms?.length > 0
            ? classrooms.slice(0, 3).map((c: any, i) => ({
                id: c.id || `c_${i}`, nom: c.name,
                cat: ['Web Design', 'App Design', 'UI/UX Design'][i % 3],
                image: gallery?.[i + 1] || null,
            }))
            : [
                { id: '1', nom: 'Apps Graphiques Numériques', cat: 'Web Design, App Design', image: null },
                { id: '2', nom: 'Prix Crypto Quotidiens', cat: 'Web Design', image: null },
                { id: '3', nom: 'Interface de Gestion', cat: 'Web Design, App Design', image: null },
            ];

    const services = filieres?.length > 0
        ? filieres.map((f: any, i) => ({ id: f.id || i, nom: f.nom || f.name, cat: 'Formation', image: gallery?.[i] || null }))
        : classrooms?.length > 0
            ? classrooms.map((c: any, i) => ({ id: c.id || i, nom: c.name, cat: 'Formation', image: gallery?.[i] || null }))
            : [
                { id: 'a', nom: 'Design Web & Applications', cat: 'UI/UX & Frontend', image: null },
                { id: 'b', nom: 'Stratégie Business Digitale', cat: 'STRATÉGIE', image: null },
                { id: 'c', nom: 'Développement Full-Stack', cat: 'DEV', image: null },
                { id: 'd', nom: 'Coaching & Mentorat Design', cat: 'COACHING', image: null },
            ];

    const ACCENT = '#00B4D8';    // bleu néon
    const BG     = '#0A0F1E';    // bleu marine très sombre
    const CARD   = '#0F1628';    // card légèrement plus clair

    const cleanPhone = (org.phone || '').replace(/[^0-9]/g, '');
    const whatsappLink = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

    return (
        <div className="min-h-screen text-white font-sans antialiased overflow-x-hidden" style={{ background: BG }}>

            {/* ══ NAVBAR ══ */}
            <header className="sticky top-0 z-50 border-b border-white/5" style={{ background: BG + 'E6', backdropFilter: 'blur(12px)' }}>
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <div
                        onClick={() => scrollToSection('hero')}
                        className="flex items-center gap-2 cursor-pointer"
                    >
                        {org.logo_url
                            ? <img src={org.logo_url} alt={trainerName} className="h-8 w-auto object-contain" />
                            : (
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded border flex items-center justify-center text-xs font-black" style={{ borderColor: ACCENT, color: ACCENT }}>
                                        {trainerName.slice(0, 1)}
                                    </div>
                                    <span className="font-black text-xs tracking-widest text-white uppercase truncate max-w-[180px] sm:max-w-none">
                                        {trainerName}
                                    </span>
                                </div>
                            )
                        }
                    </div>

                    {/* Nav Desktop */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navLinks.map((lnk, i) => {
                            const isLnkActive = (
                                (lnk === 'Accueil' && activeSection === 'hero') ||
                                (lnk === 'À Propos' && activeSection === 'about') ||
                                (lnk === 'Projets' && activeSection === 'projets') ||
                                (lnk === 'Services' && activeSection === 'services') ||
                                (lnk === 'Contact' && activeSection === 'contact')
                            );
                            return (
                                <button
                                    key={i}
                                    onClick={() => scrollToSection(lnk)}
                                    className="text-xs font-medium cursor-pointer transition-colors hover:text-white"
                                    style={{ color: isLnkActive ? ACCENT : '#9CA3AF' }}
                                >
                                    {lnk}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Right actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onOpenInscription || (() => scrollToSection('contact'))}
                            className="hidden sm:inline-flex items-center text-xs font-black rounded-full px-5 h-9 transition-all hover:opacity-90 hover:scale-105 active:scale-95"
                            style={{ background: ACCENT, color: '#000' }}
                        >
                            Prendre Contact →
                        </button>

                        {/* Hamburger button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-white"
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
                            className="md:hidden border-b border-white/10 bg-[#0A0F1E]/95 backdrop-blur-xl px-6 py-4 space-y-3"
                        >
                            {navLinks.map((lnk, i) => (
                                <button
                                    key={i}
                                    onClick={() => scrollToSection(lnk)}
                                    className="block w-full text-left py-2 text-sm font-semibold text-gray-300 hover:text-cyan-400"
                                >
                                    {lnk}
                                </button>
                            ))}
                            <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
                                <button
                                    onClick={() => { setMobileMenuOpen(false); onOpenInscription?.(); }}
                                    className="w-full text-center py-2.5 rounded-xl font-bold text-xs"
                                    style={{ background: ACCENT, color: '#000' }}
                                >
                                    Prendre Contact →
                                </button>
                                <Link href={orgPath(orgSlug, 'login')}>
                                    <button className="w-full text-center py-2.5 rounded-xl font-bold text-xs bg-white/5 border border-white/10 text-white">
                                        Espace Élève
                                    </button>
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* ══ HERO ══ */}
            <section id="hero" className="max-w-7xl mx-auto px-6 pt-16 pb-20">
                <div className="grid lg:grid-cols-2 gap-12 items-center">

                    {/* Texte gauche */}
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: ACCENT }}>
                                {trainerName}
                            </p>
                            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.0] tracking-tighter">
                                HAY! JE SUIS<br />
                                <span style={{ color: ACCENT }}>{trainerName.split(' ')[0].toUpperCase()}</span><br />
                                <span className="text-white">{trainerTitle1} |</span>
                            </h1>
                        </div>

                        <p className="text-sm text-gray-400 leading-relaxed max-w-md">{trainerSubtitle}</p>

                        <div className="flex items-center gap-4 flex-wrap">
                            <button
                                onClick={onOpenInscription || (() => scrollToSection('contact'))}
                                className="inline-flex items-center gap-2 font-black text-xs rounded-full px-7 h-12 transition-all shadow-lg hover:scale-105"
                                style={{ background: ACCENT, color: '#000', boxShadow: `0 8px 30px ${ACCENT}30` }}
                            >
                                PRENDRE CONTACT →
                            </button>
                            {whatsappLink && (
                                <a
                                    href={whatsappLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 text-xs font-bold px-5 h-12 rounded-full border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    WhatsApp
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Portrait + sphères 3D */}
                    <div className="relative flex justify-center lg:justify-end">
                        {/* Sphères décoratives */}
                        <div className="absolute top-4 left-4 w-12 h-12 rounded-full blur-sm opacity-60 pointer-events-none"
                            style={{ background: `radial-gradient(circle, ${ACCENT}, #1a1a4e)` }} />
                        <div className="absolute bottom-8 right-8 w-8 h-8 rounded-full blur-sm opacity-40 pointer-events-none"
                            style={{ background: `radial-gradient(circle, ${ACCENT}, transparent)` }} />
                        <div className="absolute top-1/2 right-0 w-16 h-16 rounded-full blur-md opacity-30 pointer-events-none"
                            style={{ background: ACCENT }} />

                        {/* Photo */}
                        <div className="relative w-72 sm:w-80 h-96 rounded-3xl overflow-hidden shadow-2xl"
                            style={{ border: `1px solid ${ACCENT}30` }}>
                            <img
                                src={heroImage}
                                alt={trainerName}
                                className="w-full h-full object-cover object-top"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1E]/50 to-transparent" />
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ BANDEAU LOGOS PARTENAIRES ══ */}
            <div className="border-y py-5 overflow-hidden" style={{ borderColor: '#ffffff10', background: CARD }}>
                <div className="flex items-center gap-16 whitespace-nowrap px-8 flex-wrap justify-center">
                    {[...pressLogos, ...pressLogos].map((logo, i) => (
                        <span key={i} className="text-xs font-bold tracking-widest text-gray-500 uppercase shrink-0">
                            {logo}
                        </span>
                    ))}
                </div>
            </div>

            {/* ══ À PROPOS ══ */}
            <section id="about" className="py-20" style={{ background: CARD }}>
                <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
                    {/* Portrait */}
                    <div className="relative hidden lg:flex justify-center">
                        <div className="w-80 h-96 rounded-3xl overflow-hidden shadow-2xl">
                            <img
                                src={aboutImage}
                                alt={trainerName + ' profil'}
                                className="w-full h-full object-cover object-top"
                            />
                        </div>
                        {/* Demi-cercle déco */}
                        <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-4 opacity-30 pointer-events-none"
                            style={{ borderColor: ACCENT }} />
                    </div>

                    {/* Texte */}
                    <div className="space-y-6">
                        <div>
                            <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: ACCENT }}>
                                À PROPOS
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-black leading-tight">
                                {aboutTitle}
                            </h2>
                        </div>

                        <p className="text-sm text-gray-400 leading-relaxed">{aboutText}</p>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { val: reviewCount, label: 'Avis Reçus' },
                                { val: yearsExp,    label: "Ans d'Expérience" },
                                { val: awardsCount, label: 'Projets Menés' },
                            ].map((stat, i) => (
                                <div key={i} className="text-center p-4 rounded-2xl" style={{ background: BG }}>
                                    <p className="text-2xl font-black" style={{ color: ACCENT }}>{stat.val}</p>
                                    <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={onOpenInscription || (() => scrollToSection('contact'))}
                            className="inline-flex items-center gap-2 font-black text-xs rounded-full px-7 h-11 transition-all hover:scale-105"
                            style={{ background: ACCENT, color: '#000' }}
                        >
                            PRENDRE CONTACT →
                        </button>
                    </div>
                </div>
            </section>

            {/* ══ MON TRAVAIL (Projets) ══ */}
            <section id="projets" className="py-20" style={{ background: BG }}>
                <div className="max-w-7xl mx-auto px-6">
                    <div className="mb-10">
                        <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: ACCENT }}>
                            MON TRAVAIL
                        </p>
                        <h2 className="text-3xl font-black">PROJETS RÉCENTS</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {projects.map((proj: any, idx: number) => (
                            <motion.div
                                key={proj.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="rounded-2xl overflow-hidden group cursor-pointer"
                                style={{ background: CARD, border: '1px solid #ffffff08' }}
                                onClick={onOpenInscription}
                            >
                                <div className="aspect-video relative overflow-hidden"
                                    style={{ background: idx === 0 ? '#1a0f3e' : idx === 1 ? '#0f1e2e' : '#1e1a0f' }}>
                                    {proj.image
                                        ? <img src={proj.image} alt={proj.nom} className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500" />
                                        : (
                                            <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">
                                                {idx === 0 ? '💜' : idx === 1 ? '💰' : '📊'}
                                            </div>
                                        )
                                    }
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onOpenInscription?.(); }}
                                        className="absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center text-black font-black text-xs shadow-xl transition-transform group-hover:scale-110"
                                        style={{ background: ACCENT }}
                                    >
                                        →
                                    </button>
                                </div>
                                <div className="p-5">
                                    <h3 className="font-black text-sm text-white group-hover:text-cyan-300 transition-colors">{proj.nom}</h3>
                                    <p className="text-xs text-gray-500 mt-1">{proj.cat}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ SERVICES ══ */}
            <section id="services" className="py-20" style={{ background: CARD }}>
                <div className="max-w-7xl mx-auto px-6">
                    <div className="mb-10">
                        <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: ACCENT }}>SERVICES</p>
                        <h2 className="text-3xl font-black">
                            SERVICES <span style={{ color: ACCENT }}>QUE JE PROPOSE</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {services.map((svc: any, i: number) => (
                            <div key={svc.id}
                                className="rounded-2xl overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
                                style={{ background: BG, border: '1px solid #ffffff08' }}
                                onClick={onOpenInscription}
                            >
                                <div className="aspect-video overflow-hidden relative"
                                    style={{ background: ['#1a0a2e', '#0a1e1a', '#1e1a0a', '#0a0f1e'][i % 4] }}>
                                    {svc.image
                                        ? <img src={svc.image} alt={svc.nom} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" />
                                        : <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">
                                            {['🖥', '📊', '⚙️', '🧑‍🏫'][i % 4]}
                                          </div>
                                    }
                                </div>
                                <div className="p-4">
                                    <p className="text-xs text-gray-500 mb-1">{svc.cat}</p>
                                    <h3 className="font-black text-sm text-white group-hover:text-cyan-300 transition-colors">{svc.nom}</h3>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ CONTACT / INITIATION ══ */}
            <section id="contact" className="py-20" style={{ background: BG }}>
                <div className="max-w-7xl mx-auto px-6">
                    <div className="p-8 sm:p-12 rounded-3xl border border-white/10" style={{ background: CARD }}>
                        <div className="grid lg:grid-cols-2 gap-10 items-center">
                            <div className="space-y-5">
                                <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full" style={{ background: `${ACCENT}20`, color: ACCENT }}>
                                    Contact & Candidature
                                </span>
                                <h2 className="text-3xl sm:text-4xl font-black">
                                    Prêt à propulser vos <span style={{ color: ACCENT }}>compétences</span> ?
                                </h2>
                                <p className="text-sm text-gray-400 leading-relaxed max-w-md">
                                    Prenez contact directement pour vous inscrire à une formation ou réserver un créneau de mentorat d'excellence.
                                </p>

                                <div className="space-y-3 pt-2">
                                    {org.email && (
                                        <div className="flex items-center gap-3 text-sm text-gray-300">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10">
                                                <Mail className="w-4 h-4 text-cyan-400" />
                                            </div>
                                            <span>{org.email}</span>
                                        </div>
                                    )}
                                    {org.phone && (
                                        <div className="flex items-center gap-3 text-sm text-gray-300">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10">
                                                <Phone className="w-4 h-4 text-cyan-400" />
                                            </div>
                                            <span>{org.phone}</span>
                                        </div>
                                    )}
                                    {org.city && (
                                        <div className="flex items-center gap-3 text-sm text-gray-300">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10">
                                                <MapPin className="w-4 h-4 text-cyan-400" />
                                            </div>
                                            <span>{org.city}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-[#0A0F1E] p-6 sm:p-8 rounded-2xl border border-white/10 space-y-4">
                                <h3 className="font-black text-base text-white">Envoyer une demande rapide</h3>
                                <input
                                    type="text"
                                    placeholder="Votre nom complet"
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    className="w-full px-4 h-11 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-400"
                                />
                                <input
                                    type="email"
                                    placeholder="Votre adresse email"
                                    value={formEmail}
                                    onChange={e => setFormEmail(e.target.value)}
                                    className="w-full px-4 h-11 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-400"
                                />
                                <textarea
                                    placeholder="Votre message ou objectif de formation..."
                                    rows={3}
                                    value={formMsg}
                                    onChange={e => setFormMsg(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-400 resize-none"
                                />
                                <button
                                    onClick={onOpenInscription}
                                    className="w-full h-11 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all hover:opacity-90"
                                    style={{ background: ACCENT, color: '#000' }}
                                >
                                    <Send className="w-4 h-4" />
                                    Soumettre ma Candidature
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ FOOTER ══ */}
            <footer className="border-t py-8" style={{ background: BG, borderColor: '#ffffff10' }}>
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span className="font-black text-xs uppercase tracking-widest" style={{ color: ACCENT }}>
                        {trainerName}
                    </span>
                    <p className="text-xs text-gray-600">© {new Date().getFullYear()} {trainerName} · Tous droits réservés</p>
                    <Link href={orgPath(orgSlug, 'login')}>
                        <button className="text-xs text-gray-500 hover:text-white transition-colors">
                            Espace Étudiant
                        </button>
                    </Link>
                </div>
            </footer>
        </div>
    );
}
