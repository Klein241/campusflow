'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Star, Send } from 'lucide-react';
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
   MODÈLE "NEXIS" — Software Solutions Studio
   Référence exacte :
   - Hero : blanc avec titre noir géant + photo formateur cercle à droite
   - Bandeau stats : 2000+ Entreprises, 10+ Ans, 800+ Heures, 150M+ Revenus
   - Section "Nos Plans Complets" : 4 cartes services jaune & blanc
   - Section "Nos Travaux" : galerie de projets filtrée
   - Témoignages : 2 cartes côte à côte
   - Formulaire de contact + photo formateur
   - Footer : noir avec logo Nexis
═══════════════════════════════════════════════════════════════════ */
export function TemplateNexisStudio({
    org, orgSlug, classrooms, filieres, teacherCount, studentCount, gallery, bc, onOpenInscription
}: TemplateProps) {
    const cfg: TemplateCustomConfig = org.template_config || {};
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [formEmail, setFormEmail] = useState('');
    const [formMsg, setFormMsg] = useState('');

    const orgName      = cfg.trainer_name    || org.name   || 'Nexis';
    const tagline      = cfg.trainer_title   || org.motto  || 'Construire des Solutions Logicielles de Classe Mondiale.';
    const heroDesc     = cfg.trainer_bio     || org.about_text || 'Notre équipe d\'experts combine la technologie de pointe avec des solutions innovantes pour vous aider à rationaliser vos opérations, améliorer l\'engagement client et stimuler une croissance durable.';
    const heroImage    = cfg.trainer_photo_url || org.hero_image_url || (gallery?.[0]) || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80';
    const stat1Val     = cfg.stat1_value || '2000+'; const stat1Lab = cfg.stat1_label || 'Partenaires';
    const stat2Val     = cfg.stat2_value || '10+';   const stat2Lab = cfg.stat2_label || "Ans d'Expérience";
    const stat3Val     = cfg.stat3_value || '800+';  const stat3Lab = cfg.stat3_label || 'Heures de Formation';
    const stat4Val     = cfg.stat4_value || '150M+'; const stat4Lab = cfg.stat4_label || 'En Revenus Générés';

    const YELLOW = '#F5D000';
    const BLACK  = '#0A0A0A';

    const navLinks = ['À Propos', 'Services', 'Projets', 'Témoignages'];

    const services = filieres?.length > 0
        ? filieres.slice(0, 4).map((f: any, i) => ({
            id: f.id || i, nom: f.nom || f.name,
            desc: f.description || 'Formation d\'excellence et accompagnement sur mesure.',
            icon: ['💻', '🌐', '📱', '☁️'][i % 4],
            isYellow: i % 2 === 1,
        }))
        : classrooms?.length > 0
            ? classrooms.slice(0, 4).map((c: any, i) => ({
                id: c.id || i, nom: c.name,
                desc: `Programme niveau ${c.level || 'Expert'}. Projets réels et certification.`,
                icon: ['💻', '🌐', '📱', '☁️'][i % 4],
                isYellow: i % 2 === 1,
            }))
            : [
                { id: '1', nom: 'Développement Logiciel Sur Mesure', desc: 'Solutions innovantes adaptées à vos processus métier spécifiques.', icon: '💻', isYellow: false },
                { id: '2', nom: 'Service de Développement Web', desc: 'Sites performants qui génèrent leads et conversions.', icon: '🌐', isYellow: true },
                { id: '3', nom: 'Développement d\'Application Mobile', desc: 'Apps iOS & Android intuitives pour vos utilisateurs.', icon: '📱', isYellow: false },
                { id: '4', nom: 'Solutions Cloud', desc: 'Infrastructure cloud sécurisée et évolutive.', icon: '☁️', isYellow: true },
            ];

    const projects = filieres?.length > 0
        ? filieres.slice(0, 3).map((f: any, i) => ({
            id: f.id || i, nom: f.nom || f.name,
            cat: ['Application Fitness', 'Prix Crypto', 'Interface Gestion'][i % 3],
            filter: ['mobile', 'web', 'design'][i % 3],
            image: gallery?.[i] || null,
            technologies: ['Mobile App', 'React, Node.js', 'Figma, Tailwind'][i % 3],
            duration: [`${3 + i} mois`],
        }))
        : [
            { id: '1', nom: '8 Digital Graphic Apps Under One', cat: 'Application Fitness', filter: 'mobile', image: null, technologies: 'Mobile App', duration: '3 mois' },
            { id: '2', nom: "Prix Crypto Quotidiens", cat: 'Finance', filter: 'web', image: null, technologies: 'React, Node.js', duration: '4 mois' },
            { id: '3', nom: 'Interface de Gestion', cat: 'Dashboard', filter: 'design', image: null, technologies: 'Figma, Tailwind', duration: '2 mois' },
        ];

    const filters = [
        { id: 'all', label: 'Tous' },
        { id: 'web', label: 'Web' },
        { id: 'mobile', label: 'Mobile' },
        { id: 'design', label: 'Design' },
    ];

    const filteredProjects = activeFilter === 'all' ? projects : projects.filter((p: any) => p.filter === activeFilter);

    const testimonials = [
        {
            name: cfg.testimonial1_author || 'Alan Solar',
            role: cfg.testimonial1_role   || 'PDG, SolarTech',
            text: cfg.testimonial1_text   || 'Travailler avec cette équipe a été une expérience incroyable. Ils comprennent vraiment nos besoins et livrent des solutions innovantes qui dépassent nos attentes.',
        },
        {
            name: cfg.testimonial2_author || 'Emma Laurent',
            role: cfg.testimonial2_role   || 'Directrice, StratégieCo',
            text: cfg.testimonial2_text   || 'La qualité du travail et la réactivité de l\'équipe sont exceptionnelles. Je les recommande vivement pour tout projet digital ambitieux.',
        },
    ];

    return (
        <div className="min-h-screen bg-white text-black font-sans antialiased overflow-x-hidden">

            {/* ══ NAVBAR ══ */}
            <header className="sticky top-0 z-50 bg-black text-white">
                <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {org.logo_url
                            ? <img src={org.logo_url} alt={orgName} className="h-7 w-auto object-contain invert" />
                            : (
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-black font-black text-xs"
                                        style={{ background: YELLOW }}>N</div>
                                    <span className="font-black text-sm tracking-wide">{orgName}</span>
                                </div>
                            )
                        }
                    </div>
                    <nav className="hidden md:flex items-center gap-8">
                        {navLinks.map((lnk, i) => (
                            <span key={i} className="text-xs text-gray-400 hover:text-white cursor-pointer transition-colors font-medium">{lnk}</span>
                        ))}
                    </nav>
                    <button
                        onClick={onOpenInscription}
                        className="text-black text-xs font-black rounded-full px-5 h-8 transition-colors"
                        style={{ background: YELLOW }}
                    >
                        Obtenir un Devis Gratuit
                    </button>
                </div>
            </header>

            {/* ══ HERO ══ */}
            <section className="max-w-7xl mx-auto px-6 pt-16 pb-12">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <p className="text-xs text-gray-500 font-medium">Livraison de services de développement logiciel de premier plan</p>
                        <h1 className="text-4xl sm:text-6xl font-black leading-[1.0] tracking-tighter text-black">
                            {tagline}
                        </h1>
                        <p className="text-sm text-gray-500 leading-relaxed max-w-md">{heroDesc}</p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onOpenInscription}
                                className="inline-flex items-center gap-2 text-black font-black text-xs rounded-full px-7 h-11 transition-all shadow-md"
                                style={{ background: YELLOW }}
                            >
                                Commencer <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={onOpenInscription}
                                className="inline-flex items-center gap-2 border border-gray-200 hover:border-gray-400 text-gray-700 font-semibold text-xs rounded-full px-7 h-11 transition-colors"
                            >
                                Voir Nos Travaux
                            </button>
                        </div>
                    </div>

                    {/* Photo formateur sur fond jaune */}
                    <div className="relative flex justify-center lg:justify-end">
                        <div className="relative w-80 h-96 rounded-3xl overflow-hidden shadow-xl"
                            style={{ background: YELLOW }}>
                            <img
                                src={heroImage}
                                alt={orgName}
                                className="w-full h-full object-cover object-top mix-blend-multiply"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ BANDEAU STATS — Fond noir ══ */}
            <section className="bg-black py-10">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
                    {[
                        { val: stat1Val, label: stat1Lab },
                        { val: stat2Val, label: stat2Lab },
                        { val: stat3Val, label: stat3Lab },
                        { val: stat4Val, label: stat4Lab },
                    ].map((stat, i) => (
                        <div key={i}>
                            <p className="text-3xl sm:text-4xl font-black text-white">{stat.val}</p>
                            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ══ SERVICES ══ */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-12 items-center mb-14">
                        <h2 className="text-3xl font-black leading-tight">Nos Plans Complets</h2>
                        <p className="text-sm text-gray-500 leading-relaxed">{heroDesc}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {services.map((svc: any, i: number) => (
                            <motion.div
                                key={svc.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="p-8 rounded-3xl cursor-pointer group hover:shadow-xl transition-all"
                                style={{ background: svc.isYellow ? YELLOW : '#F5F5F5' }}
                                onClick={onOpenInscription}
                            >
                                <span className="text-3xl mb-4 block">{svc.icon}</span>
                                <h3 className="font-black text-base text-black mb-2">{svc.nom}</h3>
                                <p className="text-xs text-gray-600 leading-relaxed mb-4">{svc.desc}</p>
                                <button className="inline-flex items-center gap-1 text-xs font-bold text-black">
                                    En Savoir Plus <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ PROJETS ══ */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
                        <h2 className="text-3xl font-black">NOS TRAVAUX</h2>
                        <div className="flex items-center gap-2">
                            {filters.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setActiveFilter(f.id)}
                                    className="text-xs font-bold px-4 h-8 rounded-full transition-all"
                                    style={activeFilter === f.id
                                        ? { background: BLACK, color: 'white' }
                                        : { background: 'white', color: '#555', border: '1px solid #e5e7eb' }}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {filteredProjects.map((proj: any, idx: number) => (
                            <motion.div
                                key={proj.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group cursor-pointer"
                                onClick={onOpenInscription}
                            >
                                <div className="aspect-[4/3] overflow-hidden relative"
                                    style={{ background: idx === 0 ? '#F0F0FF' : idx === 1 ? '#FFF8E0' : '#F0FFF8' }}>
                                    {proj.image
                                        ? <img src={proj.image} alt={proj.nom} className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">
                                            {idx === 0 ? '📱' : idx === 1 ? '💰' : '📊'}
                                          </div>
                                    }
                                </div>
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="font-black text-sm text-black">{proj.nom}</h3>
                                        <button className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white"
                                            style={{ background: YELLOW }}>
                                            <ArrowUpRight className="w-3.5 h-3.5 text-black" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500">{proj.cat}</p>
                                    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-medium">Catégorie</p>
                                            <p className="text-xs text-gray-700 font-bold">{proj.filter}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-medium">Technologies</p>
                                            <p className="text-xs text-gray-700 font-bold">{proj.technologies}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ TÉMOIGNAGES ══ */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <h2 className="text-3xl font-black mb-10 text-center">Ce Que Disent Nos Clients</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {testimonials.map((t, i) => (
                            <div key={i} className="p-8 rounded-2xl border border-gray-100">
                                <div className="flex items-center gap-1 mb-4">
                                    {[...Array(5)].map((_, j) => (
                                        <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    ))}
                                </div>
                                <p className="text-sm text-gray-600 italic leading-relaxed mb-6">"{t.text}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black"
                                        style={{ background: YELLOW, color: BLACK }}>
                                        {t.name[0]}
                                    </div>
                                    <div>
                                        <p className="font-black text-xs text-black">{t.name}</p>
                                        <p className="text-xs text-gray-500">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ CONTACT / FORMULAIRE ══ */}
            <section className="py-20" style={{ background: '#F9F9F9' }}>
                <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
                    {/* Formulaire */}
                    <div className="space-y-5">
                        <h2 className="text-3xl font-black">Contactez-Nous</h2>
                        <p className="text-sm text-gray-500">Remplissez le formulaire et notre équipe vous répondra sous 24h.</p>
                        <div className="space-y-4">
                            <input type="text" placeholder="Votre nom"
                                className="w-full border border-gray-200 rounded-xl px-4 h-12 text-sm focus:outline-none focus:border-yellow-400 bg-white" />
                            <input type="email" placeholder="Votre email" value={formEmail}
                                onChange={e => setFormEmail(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 h-12 text-sm focus:outline-none focus:border-yellow-400 bg-white" />
                            <textarea placeholder="Votre message" rows={4} value={formMsg}
                                onChange={e => setFormMsg(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400 bg-white resize-none" />
                            <button
                                onClick={onOpenInscription}
                                className="inline-flex items-center gap-2 font-black text-xs rounded-full px-7 h-12 transition-all w-full justify-center"
                                style={{ background: YELLOW, color: BLACK }}
                            >
                                <Send className="w-4 h-4" /> Envoyer le Message
                            </button>
                        </div>
                    </div>

                    {/* Photo */}
                    <div className="hidden lg:flex justify-center">
                        <div className="relative w-80 h-96 rounded-3xl overflow-hidden shadow-xl"
                            style={{ background: YELLOW }}>
                            <img
                                src={heroImage}
                                alt={orgName}
                                className="w-full h-full object-cover object-top mix-blend-multiply"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ FOOTER ══ */}
            <footer className="bg-black text-white py-10">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        {org.logo_url
                            ? <img src={org.logo_url} alt={orgName} className="h-7 w-auto object-contain invert" />
                            : (
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs text-black"
                                        style={{ background: YELLOW }}>N</div>
                                    <span className="font-black text-sm">{orgName}</span>
                                </div>
                            )
                        }
                    </div>
                    <p className="text-xs text-gray-600">© {new Date().getFullYear()} {orgName} · Tous droits réservés</p>
                    <Link href={orgPath(orgSlug, 'login')}>
                        <button className="text-xs text-gray-400 hover:text-white transition-colors">Connexion Étudiant</button>
                    </Link>
                </div>
            </footer>
        </div>
    );
}
