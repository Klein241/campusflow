'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight, Star, Award, Headphones,
    ShoppingCart, Palette, Sparkles, Layout,
    PenTool, CheckCircle2
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

export function TemplateCreativeStudio({
    org, orgSlug, classrooms, filieres, teacherCount, studentCount, gallery, bc, onOpenInscription
}: TemplateProps) {
    const cfg: TemplateCustomConfig = org.template_config || {};
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const trainerName = cfg.trainer_name || org.name || 'Mariana Studio';
    const trainerTitle = cfg.trainer_title || org.motto || 'Designer Créatif, Illustratrice & Formatrice';
    const trainerSubtitle = cfg.trainer_subtitle || org.hero_subtitle || 'Créez des visuels qui parlent à l\'âme de votre marque.';
    const trainerBio = cfg.trainer_bio || org.about_text || 'Atelier de formation d\'exception pour designers et directeurs artistiques de demain.';
    const trainerQuote = cfg.trainer_quote || '"La créativité n\'est pas un talent, c\'est une discipline qui s\'apprend."';

    const heroImage = cfg.trainer_photo_url || org.hero_image_url || org.about_image_url || (gallery && gallery[0]) || 'https://images.unsplash.com/photo-1611339555312-e607c8352fd7?w=1000&auto=format&fit=crop&q=80';
    const secondaryImage = cfg.trainer_photo_secondary_url || (gallery && gallery[1]) || 'https://images.unsplash.com/photo-1629904853893-c2c8981a1dc5?w=1000&auto=format&fit=crop&q=80';

    const pressLogos = (cfg.press_logos_text || 'Dribbble, Behance, Adobe, Notion, Figma').split(',').map(s => s.trim());

    // Programmes réels
    const allPrograms = (filieres && filieres.length > 0)
        ? filieres
        : (classrooms && classrooms.length > 0)
            ? classrooms.map((c, i) => ({
                id: c.id || `c_${i}`,
                nom: c.name,
                category: i % 2 === 0 ? 'design' : 'branding',
                description: `Formation pratique niveau ${c.level || 'Pro'}. Encadrement de studio et livrables réels.`,
                duree_mois: 3,
                frais_scolarite: 180000,
            }))
            : [
                { id: '1', nom: 'Design Web & Interfaces Modernes', category: 'design', description: 'Sites percutants, wireframes et UI kits prêts à livrer aux clients.', duree_mois: 3, frais_scolarite: 200000 },
                { id: '2', nom: 'Identité Visuelle & Direction Artistique', category: 'branding', description: 'Charte graphique complète et branding full-stack pour marques modernes.', duree_mois: 4, frais_scolarite: 250000 },
                { id: '3', nom: 'UI/UX & Prototypage Avancé sur Figma', category: 'uiux', description: 'Design systems, tests utilisateurs et parcours fluides haute fidélité.', duree_mois: 3, frais_scolarite: 220000 },
            ];

    const categories = [
        { id: 'all', label: 'Tous les Modules' },
        { id: 'design', label: '🖥 Web Design' },
        { id: 'branding', label: '🎨 Branding' },
        { id: 'uiux', label: '⚡ UI/UX' },
    ];

    const filteredPrograms = selectedCategory === 'all'
        ? allPrograms
        : allPrograms.filter((p: any) => p.category === selectedCategory);

    // Service badges « What I Do »
    const whatIDo = [
        { icon: PenTool, label: 'Illustration & Design Graphique' },
        { icon: Layout, label: 'Architecture UI & Design System' },
        { icon: Palette, label: 'Direction Artistique & Branding' },
        { icon: Sparkles, label: 'Formation & Coaching Créatif' },
    ];

    return (
        <div className="min-h-screen bg-[#1C1F0F] text-white overflow-x-hidden selection:bg-lime-400/30 font-sans antialiased">
            {/* Ambient Glow Layers */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-0 w-[80vw] h-[80vw] max-w-[700px] max-h-[700px] bg-[#4A5E20]/15 rounded-full blur-[160px]" />
                <div className="absolute bottom-0 right-0 w-[60vw] h-[60vw] max-w-[500px] max-h-[500px] bg-amber-700/10 rounded-full blur-[130px]" />
            </div>

            {/* ═══ Header Mariana Style ═══ */}
            <header className="relative z-20 max-w-6xl mx-auto px-4 sm:px-8 py-6">
                <div className="flex items-center justify-between p-3 px-6 rounded-full bg-white/[0.04] backdrop-blur-2xl border border-white/10 shadow-xl">
                    <div className="flex items-center gap-3">
                        {org.logo_url ? (
                            <img src={org.logo_url} alt={trainerName} className="h-9 w-auto object-contain" />
                        ) : (
                            <span className="font-black text-base tracking-tight text-white uppercase">
                                {trainerName}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href={orgPath(orgSlug, 'login')}>
                            <Button variant="ghost" className="text-xs text-slate-400 hover:text-white rounded-full px-4 hidden sm:flex">
                                Connexion
                            </Button>
                        </Link>
                        <Button
                            onClick={onOpenInscription}
                            className="bg-[#B5D152] hover:bg-lime-300 text-slate-900 font-black text-xs rounded-full px-5 h-9 shadow-lg"
                        >
                            Postuler au Cursus
                        </Button>
                    </div>
                </div>
            </header>

            {/* ═══ Hero Section Mariana Style ═══ */}
            <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pt-8 pb-20">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        {/* Badge Disponible Rotatif */}
                        <div className="relative inline-flex items-center gap-3">
                            <div className="w-16 h-16 rounded-full border-2 border-[#B5D152] flex items-center justify-center bg-[#B5D152]/10 animate-spin-slow">
                                <span className="text-[8px] font-black text-[#B5D152] uppercase tracking-widest text-center leading-tight">Inscriptions<br/>Ouvertes</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-[#B5D152] uppercase tracking-widest">{trainerTitle}</span>
                                <span className="text-[10px] text-slate-500">{org.city || 'Studio Connecté'} · {org.type || 'Académie Créative'}</span>
                            </div>
                        </div>

                        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.0] tracking-tighter text-white">
                            {trainerSubtitle.split(' ').slice(0, 4).join(' ')}&nbsp;
                            <span className="text-[#B5D152]">{trainerSubtitle.split(' ').slice(4).join(' ')}</span>
                        </h1>

                        <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-md">
                            {trainerBio}
                        </p>

                        {/* Stat Badges */}
                        <div className="flex flex-wrap items-center gap-4">
                            {cfg.show_student_count !== false && (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold">
                                    <span className="text-[#B5D152] text-base font-black">{cfg.student_count_override || studentCount || '500'}+</span>
                                    <span className="text-slate-400">Diplômés</span>
                                </div>
                            )}
                            {cfg.show_years_experience !== false && (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold">
                                    <span className="text-amber-400 text-base font-black">{cfg.years_experience_value || '8'}+</span>
                                    <span className="text-slate-400">Années de Studio</span>
                                </div>
                            )}
                            {cfg.show_rating_stars !== false && (
                                <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold">
                                    <span className="text-amber-400">★★★★★</span>
                                    <span className="text-slate-400">98% de satisfaction</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <Button
                                onClick={onOpenInscription}
                                className="bg-[#B5D152] hover:bg-lime-300 text-slate-900 font-black text-xs px-8 h-12 rounded-full shadow-xl shadow-lime-500/20 flex items-center gap-2"
                            >
                                Rejoindre l'Atelier
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                className="border-white/15 hover:bg-white/5 text-slate-300 text-xs h-12 rounded-full px-6"
                                onClick={() => document.getElementById('programs')?.scrollIntoView({ behavior: 'smooth' })}
                            >
                                Voir les Modules
                            </Button>
                        </div>
                    </div>

                    {/* Portrait Illustration Style */}
                    <div className="relative flex justify-center lg:justify-end">
                        <div className="relative w-full max-w-md">
                            {/* Organic blob shape */}
                            <div className="absolute inset-0 bg-[#B5D152]/15 rounded-[40% 60% 55% 45% / 50% 45% 55% 50%] blur-3xl" />
                            <div className="relative aspect-[3/4] rounded-[32px] overflow-hidden border-2 border-white/10 shadow-2xl">
                                <img
                                    src={heroImage}
                                    alt={trainerName}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1C1F0F]/70 via-transparent to-transparent" />
                                <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                                    <p className="text-white text-xs italic font-light">{trainerQuote}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ Press Logos / Partenaires ═══ */}
            {cfg.show_press_logos !== false && (
                <div className="relative z-10 border-t border-b border-white/5 py-6 bg-white/[0.02]">
                    <div className="max-w-6xl mx-auto px-4 sm:px-8 flex items-center justify-between gap-6 overflow-x-auto">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 shrink-0">VU SUR</span>
                        {pressLogos.map((logo, i) => (
                            <span key={i} className="text-sm sm:text-base font-black text-slate-500 hover:text-[#B5D152] transition tracking-wider uppercase shrink-0">
                                {logo}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ Ce que je fais / Services ═══ */}
            {cfg.show_services_grid !== false && (
                <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-20">
                    <div className="mb-10">
                        <h2 className="text-3xl sm:text-5xl font-black text-white">Mes Spécialisations</h2>
                        <p className="text-slate-400 text-sm mt-2">Compétences et expertises au service de votre développement créatif.</p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {whatIDo.map((item, idx) => (
                            <div key={idx} className="p-6 rounded-3xl bg-white/[0.04] border border-white/10 hover:border-[#B5D152]/40 hover:bg-[#B5D152]/5 transition group space-y-4">
                                <div className="w-12 h-12 rounded-2xl bg-[#B5D152]/10 border border-[#B5D152]/20 flex items-center justify-center text-[#B5D152]">
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-bold text-white group-hover:text-[#B5D152] transition">{item.label}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ═══ Programmes & Formations ═══ */}
            <section id="programs" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-12 pb-24">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                    <div>
                        <h2 className="text-3xl sm:text-5xl font-black text-white">Modules & Formations</h2>
                        <p className="text-slate-400 text-sm mt-1">Ateliers pratiques du studio pour créatifs en action.</p>
                    </div>
                    <Button
                        onClick={onOpenInscription}
                        className="bg-[#B5D152] hover:bg-lime-300 text-slate-900 font-black text-xs rounded-full px-6 h-10 shrink-0"
                    >
                        S'inscrire Maintenant
                    </Button>
                </div>

                {/* Filtres Catégorie */}
                {filieres.length === 0 && classrooms.length === 0 && (
                    <div className="flex items-center gap-2 flex-wrap mb-8">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                                    selectedCategory === cat.id
                                        ? 'bg-[#B5D152] text-slate-900'
                                        : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                )}

                <div className="grid md:grid-cols-3 gap-5">
                    {(filteredPrograms.length > 0 ? filteredPrograms : allPrograms).map((p: any, idx: number) => (
                        <div
                            key={p.id || idx}
                            className="p-7 rounded-3xl bg-[#252A13] border border-white/5 hover:border-[#B5D152]/30 transition group flex flex-col justify-between space-y-6"
                        >
                            <div className="space-y-3">
                                <span className="text-[10px] font-black text-[#B5D152] uppercase tracking-widest px-3 py-1 rounded-full bg-[#B5D152]/10 inline-block border border-[#B5D152]/20">
                                    {p.duree_mois ? `${p.duree_mois} mois` : 'Module'}
                                </span>
                                <h3 className="text-lg font-black text-white group-hover:text-[#B5D152] transition">
                                    {p.nom || p.name}
                                </h3>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    {p.description || 'Atelier pratique en studio, projets réels et retours experts.'}
                                </p>
                            </div>
                            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                <span className="text-xs font-black text-[#B5D152]">
                                    {p.frais_scolarite ? `${new Intl.NumberFormat('fr-FR').format(p.frais_scolarite)} XAF` : 'Sur dossier'}
                                </span>
                                <Button
                                    onClick={onOpenInscription}
                                    className="w-9 h-9 rounded-xl bg-[#B5D152] hover:bg-lime-300 text-slate-900 p-0 flex items-center justify-center shadow-lg"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══ Footer ═══ */}
            <footer className="border-t border-white/5 bg-[#14170A] py-12 relative z-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <p className="font-black text-white text-base tracking-tight uppercase">{trainerName}</p>
                    <p className="text-xs text-slate-500">© {new Date().getFullYear()} – Propulsé par IziTeach</p>
                    <Button
                        onClick={onOpenInscription}
                        className="bg-[#B5D152] hover:bg-lime-300 text-slate-900 font-black text-xs rounded-full px-7"
                    >
                        Postuler au Studio
                    </Button>
                </div>
            </footer>
        </div>
    );
}
