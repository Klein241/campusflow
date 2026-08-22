'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Sparkles, Monitor, PenTool, Smile, Edit3 } from 'lucide-react';
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
   Référence exacte : fond crème/saumon pastel, vert forêt #1E6356,
   portrait en haut à droite, grille portefeuille, section "What I Do",
   stats + footer vert sombre
═══════════════════════════════════════════════════════════════════ */
export function TemplateCreativeStudio({
    org, orgSlug, classrooms, filieres, teacherCount, studentCount, gallery, bc, onOpenInscription
}: TemplateProps) {
    const cfg: TemplateCustomConfig = org.template_config || {};
    const [activeFilter, setActiveFilter] = useState<string>('all');

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
                { id: '1', nom: 'Freshbite', category: 'uiux', type: 'Design UI/UX', image: null },
                { id: '2', nom: 'Leaf & Co.', category: 'branding', type: 'Identité de Marque', image: null },
                { id: '3', nom: 'Wander', category: 'web', type: 'Web Design', image: null },
            ];

    const filtered = activeFilter === 'all' ? projects : projects.filter((p: any) => p.category === activeFilter);

    const whatIDo = [
        { icon: Monitor,  label: 'Web Design', desc: 'Sites beaux, réactifs et engageants qui convertissent.' },
        { icon: PenTool,  label: 'Identité de Marque', desc: 'Des marques mémorables qui racontent votre histoire.' },
        { icon: Smile,    label: 'Design UI/UX', desc: 'Interfaces intuitives créant des expériences fluides.' },
        { icon: Edit3,    label: 'Illustration', desc: 'Illustrations ludiques pour donner vie aux idées.' },
    ];

    const ACCENT  = '#1E6356'; // vert forêt
    const BG_HERO = '#F5EDE8'; // crème saumon

    return (
        <div className="min-h-screen font-sans antialiased overflow-x-hidden" style={{ background: BG_HERO }}>

            {/* ══ HERO ══ */}
            <section className="max-w-5xl mx-auto px-6 pt-12 pb-10 relative">

                {/* Top row: Logo + badge disponible */}
                <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-2">
                        {org.logo_url
                            ? <img src={org.logo_url} alt={trainerName} className="h-8 w-auto object-contain" />
                            : (
                                <div className="flex items-center gap-1.5">
                                    <div className="w-7 h-7 rounded-lg" style={{ background: ACCENT }} />
                                    <span className="font-black text-sm" style={{ color: ACCENT }}>Studio Créatif</span>
                                </div>
                            )
                        }
                    </div>

                    {/* Badge rotatif disponible */}
                    <div className="relative w-24 h-24 hidden sm:flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-2 flex items-center justify-center" style={{ borderColor: ACCENT }}>
                            <span className="text-center text-[8px] font-black uppercase tracking-widest leading-tight px-2" style={{ color: ACCENT }}>
                                {availableTag.split(' ').slice(0, 2).join(' ')}<br/>{availableTag.split(' ').slice(2).join(' ')}
                            </span>
                        </div>
                        <div className="absolute inset-0 rounded-full border border-dashed opacity-40" style={{ borderColor: ACCENT }} />
                    </div>
                </div>

                {/* Hero content: Texte gauche + Portrait droite */}
                <div className="grid lg:grid-cols-2 gap-8 items-start">
                    <div className="space-y-5">
                        <div>
                            <p className="text-sm font-semibold mb-1" style={{ color: ACCENT }}>Bonjour, Je suis</p>
                            <h1 className="text-5xl sm:text-7xl font-black leading-[1.0] tracking-tighter text-[#0D1C19]">
                                {trainerName.split(' ').map((word: string, i: number) => (
                                    <span key={i}>{word}<br /></span>
                                ))}
                            </h1>
                            <p className="text-base font-medium mt-2" style={{ color: ACCENT }}>{trainerTitle}</p>
                        </div>

                        <p className="text-sm text-gray-600 leading-relaxed max-w-xs">{trainerSubtitle}</p>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={onOpenInscription}
                                className="inline-flex items-center gap-2 text-white font-black text-xs rounded-full px-6 h-11 transition-all shadow-md"
                                style={{ background: ACCENT }}
                            >
                                Voir les Travaux <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                            <Link href={orgPath(orgSlug, 'login')}>
                                <button className="inline-flex items-center gap-2 text-xs rounded-full px-6 h-11 transition-all font-bold border"
                                    style={{ borderColor: ACCENT, color: ACCENT }}>
                                    À Propos <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                            </Link>
                        </div>
                    </div>

                    {/* Portrait */}
                    <div className="relative hidden lg:flex justify-end">
                        {/* Decorative sparkles */}
                        <Sparkles className="absolute top-4 left-4 w-5 h-5 text-yellow-400" />
                        <div className="absolute top-10 right-0 w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="absolute bottom-16 left-0 w-4 h-4 rounded-full" style={{ background: '#F4A261' }} />

                        <div className="relative">
                            <div className="w-72 h-80 rounded-3xl overflow-hidden shadow-2xl"
                                style={{ background: ACCENT }}>
                                <img
                                    src={heroImage}
                                    alt={trainerName}
                                    className="w-full h-full object-cover object-top"
                                />
                            </div>
                            {/* Turning ideas badge */}
                            <div className="absolute -bottom-4 -left-12 bg-white rounded-2xl px-4 py-3 shadow-xl max-w-[180px]">
                                <p className="text-xs font-bold italic leading-snug" style={{ color: ACCENT }}>
                                    {turningIdeas}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ TRAVAUX SÉLECTIONNÉS ══ */}
            <section className="bg-white py-16">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                        <h2 className="font-black text-2xl flex items-center gap-2 text-[#0D1C19]">
                            Travaux Sélectionnés <Sparkles className="w-5 h-5 text-yellow-400" />
                        </h2>
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
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="group rounded-3xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all"
                            >
                                <div className="aspect-[4/3] relative overflow-hidden"
                                    style={{ background: idx === 0 ? '#E8F5EE' : idx === 1 ? '#FFF3E8' : '#E8F0F5' }}>
                                    {proj.image
                                        ? <img src={proj.image} alt={proj.nom} className="w-full h-full object-cover" />
                                        : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <span className="text-5xl opacity-30">
                                                    {idx === 0 ? '🥗' : idx === 1 ? '🌿' : '✈️'}
                                                </span>
                                            </div>
                                        )
                                    }
                                    <button
                                        onClick={onOpenInscription}
                                        className="absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg"
                                        style={{ background: ACCENT }}
                                    >
                                        <ArrowUpRight className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-black text-sm text-[#0D1C19]">{proj.nom}</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">{proj.type}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ WHAT I DO ══ */}
            <section className="py-16" style={{ background: BG_HERO }}>
                <div className="max-w-5xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Illustration perso 2 */}
                        <div className="flex items-center justify-center">
                            <div className="relative w-64 h-64 rounded-full overflow-hidden shadow-xl"
                                style={{ background: '#F4A261' }}>
                                {gallery?.[1]
                                    ? <img src={gallery[1]} alt="" className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center text-7xl">🧑‍🎨</div>
                                }
                                {/* Crown emoji */}
                                <div className="absolute top-3 right-4 text-2xl">👑</div>
                            </div>
                        </div>

                        {/* Services grid */}
                        <div>
                            <h2 className="font-black text-2xl text-[#0D1C19] flex items-center gap-2 mb-8">
                                Ce Que Je Fais <Sparkles className="w-5 h-5 text-yellow-400" />
                            </h2>
                            <div className="grid grid-cols-2 gap-6">
                                {whatIDo.map((item, i) => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={i} className="space-y-2">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                                style={{ background: i % 2 === 0 ? '#E8F5EE' : '#E8F0F5' }}>
                                                <Icon className="w-5 h-5" style={{ color: ACCENT }} />
                                            </div>
                                            <h3 className="font-black text-sm text-[#0D1C19]">{item.label}</h3>
                                            <p className="text-xs text-gray-500 leading-snug">{item.desc}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ TÉMOIGNAGE + STATS ══ */}
            <section className="bg-white py-16">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Témoignage */}
                        <div className="space-y-4">
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
                                { value: clientsCount,  label: 'Clients Satisfaits' },
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

            {/* ══ FOOTER VERT SOMBRE ══ */}
            <footer className="py-16" style={{ background: '#0D1C19' }}>
                <div className="max-w-5xl mx-auto px-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-10">
                        <div>
                            <h3 className="font-black text-xl text-white leading-tight">
                                Créons quelque chose <span className="italic font-serif" style={{ color: '#F4A261' }}>d'incroyable !</span>
                            </h3>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Contactez-nous</p>
                            <div className="space-y-2">
                                <p className="text-xs text-gray-500 flex items-center gap-2">
                                    <span>✉</span> {cfg.contact_email || org.email || 'contact@studio.com'}
                                </p>
                                <p className="text-xs text-gray-500 flex items-center gap-2">
                                    <span>📍</span> {org.city || 'Partout dans le monde'}
                                </p>
                                <p className="text-xs text-gray-500 flex items-center gap-2">
                                    <span>🌐</span> {cfg.website_text || org.slug + '.iziteach.com'}
                                </p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Suivez-nous</p>
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
                        <p className="text-xs text-gray-600">© {new Date().getFullYear()} {trainerName}</p>
                        <Link href={orgPath(orgSlug, 'login')}>
                            <button className="text-xs text-gray-500 hover:text-white transition-colors">
                                Connexion Étudiant
                            </button>
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
