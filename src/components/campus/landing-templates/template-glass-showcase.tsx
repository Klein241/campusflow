'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, BookOpen, Star, BookMarked,
    Users, Phone, Mail, MapPin, X, ArrowRight,
    FileText, GraduationCap, ShieldCheck, Heart,
    Play, Pause, SkipBack, SkipForward, Globe,
    ChevronRight, ExternalLink, MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { orgPath } from '@/lib/custom-domain';

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

type ShowcaseCard = 'vision' | 'programs' | 'gallery' | 'library' | 'testimonials' | null;

export function TemplateGlassShowcase({
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
    const [openCard, setOpenCard] = useState<ShowcaseCard>(null);
    const [activeDock, setActiveDock] = useState<string>('home');
    const [isPlaying, setIsPlaying] = useState(false);
    const [gallerySlide, setGallerySlide] = useState(0);

    const defaultImages = [
        'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&auto=format&fit=crop&q=80',
    ];

    const currentGallery = gallery && gallery.length > 0 ? gallery : defaultImages;

    const handleNextSlide = (e: React.MouseEvent) => {
        e.stopPropagation();
        setGallerySlide(prev => (prev + 1) % currentGallery.length);
    };

    const handlePrevSlide = (e: React.MouseEvent) => {
        e.stopPropagation();
        setGallerySlide(prev => (prev - 1 + currentGallery.length) % currentGallery.length);
    };

    return (
        <div className="relative min-h-screen bg-[#06090E] text-white overflow-x-hidden selection:bg-cyan-500/30">
            {/* ═══ Ambient Glows ═══ */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-cyan-600/10 blur-[180px] rounded-full" />
                <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-emerald-600/10 blur-[180px] rounded-full" />
                <div className="absolute bottom-10 left-1/3 w-[600px] h-[400px] bg-blue-600/10 blur-[200px] rounded-full" />
            </div>

            {/* ═══ Top Navbar Prestige Vitré ═══ */}
            <nav className="relative z-20 max-w-7xl mx-auto px-4 sm:px-8 py-5">
                <div className="flex items-center justify-between gap-4 p-3.5 px-6 rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl">
                    {/* Logo & Motto */}
                    <div className="flex items-center gap-3.5">
                        {org.logo_url ? (
                            <img src={org.logo_url} alt={org.name} className="w-10 h-10 rounded-xl object-contain bg-white/10 p-1 border border-white/15 shadow-md shrink-0" />
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-md shrink-0">
                                <GraduationCap className="w-5 h-5" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-sm sm:text-base font-black tracking-wide text-white uppercase">{org.name}</h2>
                            <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">{org.motto || 'Excellence • Intégrité • Innovation'}</p>
                        </div>
                    </div>

                    {/* Nav Links */}
                    <div className="hidden md:flex items-center gap-7 text-xs font-bold text-slate-300 tracking-wider uppercase">
                        <button onClick={() => setOpenCard('vision')} className="hover:text-cyan-400 transition-colors">Vision</button>
                        <button onClick={() => setOpenCard('programs')} className="hover:text-cyan-400 transition-colors">Académique</button>
                        <button onClick={() => setOpenCard('gallery')} className="hover:text-cyan-400 transition-colors">Vie Étudiante</button>
                        <a href="#inscription" onClick={onOpenInscription} className="hover:text-cyan-400 transition-colors">Admissions</a>
                        <button onClick={() => setOpenCard('library')} className="hover:text-cyan-400 transition-colors">Ressources</button>
                    </div>

                    {/* Espace élève CTA */}
                    <div className="flex items-center gap-2">
                        <Link href={orgPath(orgSlug, 'login')}>
                            <Button size="sm" className="bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl border border-white/15 h-9 px-4">
                                Espace élève
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ═══ Main Showcase Content ═══ */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-36">
                {/* ═══ Hero Centerpiece ═══ */}
                <div className="text-center max-w-4xl mx-auto mb-12 space-y-4">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl sm:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight leading-[1.1]"
                    >
                        Forger les Leaders de Demain.
                    </motion.h1>
                    <p className="text-sm sm:text-lg text-slate-300 font-light max-w-2xl mx-auto">
                        Une éducation d&apos;exception, un avenir sans limites à <span className="text-cyan-400 font-medium">{org.name}</span>.
                    </p>
                    <div className="pt-2">
                        <Button
                            onClick={() => setOpenCard('programs')}
                            className="h-11 px-8 rounded-full bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 font-bold text-xs uppercase tracking-wider border border-cyan-400/50 shadow-lg shadow-cyan-500/20 backdrop-blur-md transition-all hover:scale-105"
                        >
                            Découvrir nos programmes
                        </Button>
                    </div>
                </div>

                {/* ═══ 5 Frosted Glass Cards Row (Exact match to design) ═══ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* CARD 1: Vision & Histoire */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        onClick={() => setOpenCard('vision')}
                        className="group relative rounded-3xl p-5 bg-[#0B1019]/70 backdrop-blur-2xl border border-cyan-500/30 hover:border-cyan-400/70 shadow-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/10 blur-2xl rounded-full pointer-events-none" />
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold text-cyan-300">
                                <span>📜</span>
                                <span>[★ Vision & Histoire]</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors leading-snug">
                                    Notre Héritage & Ambition
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                                    Une tradition d&apos;excellence académique...
                                </p>
                            </div>
                        </div>

                        {/* Thumbnail */}
                        <div className="mt-4 rounded-2xl overflow-hidden border border-white/10 aspect-[4/3] bg-black/40 relative">
                            <img
                                src={org.about_image_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&auto=format&fit=crop&q=80'}
                                alt="Heritage"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                    </motion.div>

                    {/* CARD 2: Formations Phares */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        onClick={() => setOpenCard('programs')}
                        className="group relative rounded-3xl p-5 bg-[#0B1019]/70 backdrop-blur-2xl border border-teal-500/30 hover:border-teal-400/70 shadow-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-28 h-28 bg-teal-500/10 blur-2xl rounded-full pointer-events-none" />
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-[10px] font-bold text-teal-300">
                                <span>🎓</span>
                                <span>[🎓 Formations Phares]</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white group-hover:text-teal-300 transition-colors leading-snug">
                                    Cursus d&apos;Excellence
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                                    {filieres.length > 0 ? filieres.slice(0, 3).map((f: any) => f.nom).join(', ') : 'Bachelor, Master, MBA...'}
                                </p>
                            </div>
                        </div>

                        {/* Thumbnail */}
                        <div className="mt-4 rounded-2xl overflow-hidden border border-white/10 aspect-[4/3] bg-black/40 relative">
                            <img
                                src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop&q=80"
                                alt="Formations"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                    </motion.div>

                    {/* CARD 3: Galerie Interactive */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        onClick={() => setOpenCard('gallery')}
                        className="group relative rounded-3xl p-5 bg-[#0B1019]/70 backdrop-blur-2xl border border-cyan-500/30 hover:border-cyan-400/70 shadow-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/10 blur-2xl rounded-full pointer-events-none" />
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold text-cyan-300">
                                <span>📷</span>
                                <span>[📸 Galerie Interactive]</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors leading-snug">
                                    Immersion Visuelle
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    {currentGallery.length} photos du campus
                                </p>
                            </div>
                        </div>

                        {/* Thumbnail with playback controls */}
                        <div className="mt-4 rounded-2xl overflow-hidden border border-white/10 aspect-[4/3] bg-black/40 relative">
                            <img
                                src={currentGallery[gallerySlide]}
                                alt="Campus"
                                className="w-full h-full object-cover"
                            />
                            {/* Overlay Controls */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 flex items-center justify-center gap-3">
                                <button
                                    onClick={handlePrevSlide}
                                    className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-white transition"
                                >
                                    <SkipBack className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
                                    className="p-1.5 rounded-full bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition"
                                >
                                    {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                                </button>
                                <button
                                    onClick={handleNextSlide}
                                    className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-white transition"
                                >
                                    <SkipForward className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* CARD 4: Bibliothèque Numérique */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        onClick={() => setOpenCard('library')}
                        className="group relative rounded-3xl p-5 bg-[#0B1019]/70 backdrop-blur-2xl border border-emerald-500/30 hover:border-emerald-400/70 shadow-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 blur-2xl rounded-full pointer-events-none" />
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-300">
                                <span>📖</span>
                                <span>[📖 Bibliothèque Numérique]</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors leading-snug">
                                    Ressources Mondiales
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                                    Accès cours, annales & bibliothèque
                                </p>
                            </div>
                        </div>

                        {/* Thumbnail */}
                        <div className="mt-4 rounded-2xl overflow-hidden border border-white/10 aspect-[4/3] bg-black/40 relative flex flex-col justify-end p-2.5">
                            <img
                                src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&auto=format&fit=crop&q=80"
                                alt="Library"
                                className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="relative z-10 text-center">
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-cyan-300 bg-black/60 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                                    Accès Mondial <ArrowRight className="w-2.5 h-2.5" />
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    {/* CARD 5: Témoignages & Réussite */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        onClick={() => setOpenCard('testimonials')}
                        className="group relative rounded-3xl p-5 bg-[#0B1019]/70 backdrop-blur-2xl border border-cyan-500/30 hover:border-cyan-400/70 shadow-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/10 blur-2xl rounded-full pointer-events-none" />
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold text-cyan-300">
                                <span>💬</span>
                                <span>[💬 Témoignages & Réussite]</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors leading-snug">
                                    Alumni Inspiring
                                </h3>
                                <p className="text-[11px] text-slate-300 italic mt-1.5">
                                    &ldquo;L&apos;établissement a transformé mon avenir académique.&rdquo;
                                </p>
                            </div>
                        </div>

                        {/* Circular Portrait */}
                        <div className="mt-4 flex flex-col items-center text-center space-y-1.5">
                            <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-cyan-400 to-emerald-400 shadow-lg shadow-cyan-500/20">
                                <img
                                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"
                                    alt="Alumni"
                                    className="w-full h-full rounded-full object-cover"
                                />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-white">Sarah Ndombe</p>
                                <p className="text-[9px] text-cyan-400 font-medium">Diplômée Promotion 2025</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>

            {/* ═══ Floating Navigation Bottom Dock (Exact match to design) ═══ */}
            <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="pointer-events-auto flex items-center gap-2 sm:gap-4 p-2.5 px-4 rounded-full bg-[#0B1019]/90 backdrop-blur-2xl border border-cyan-500/30 shadow-2xl shadow-black/80"
                >
                    <div className="flex items-center gap-1 sm:gap-2">
                        {[
                            { id: 'home', label: 'Accueil', icon: Sparkles, action: () => setOpenCard(null) },
                            { id: 'vision', label: 'Vision', icon: Globe, action: () => setOpenCard('vision') },
                            { id: 'programs', label: 'Cursus', icon: BookOpen, action: () => setOpenCard('programs') },
                            { id: 'gallery', label: 'Galerie', icon: Star, action: () => setOpenCard('gallery') },
                            { id: 'library', label: 'Bibliothèque', icon: BookMarked, action: () => setOpenCard('library') },
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => { setActiveDock(item.id); item.action(); }}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all ${
                                    activeDock === item.id && !openCard
                                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-500/20'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <item.icon className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{item.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="h-6 w-px bg-white/10 mx-1" />

                    {/* S'INSCRIRE MAINTENANT CTA */}
                    <a href="#inscription" onClick={onOpenInscription}>
                        <Button
                            className="h-10 px-5 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 gap-1.5 transition-all hover:scale-105"
                        >
                            <span>S&apos;INSCRIRE MAINTENANT</span>
                            <span>⭐</span>
                        </Button>
                    </a>
                </motion.div>
            </div>

            {/* ═══ Modal Interactif pour chaque carte ═══ */}
            <AnimatePresence>
                {openCard && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-[#0F131D] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative"
                        >
                            <button
                                onClick={() => setOpenCard(null)}
                                className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {openCard === 'vision' && (
                                <div className="space-y-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white">Notre Histoire & Vision</h3>
                                            <p className="text-xs text-slate-400">{org.name} • {org.city || 'Cameroun'}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                                        {org.about_text || `${org.name} a été fondé avec l'ambition de fournir une éducation de très haut niveau alliant rigueur académique, innovation pédagogique et épanouissement personnel de chaque apprenant.`}
                                    </p>
                                    <div className="grid sm:grid-cols-3 gap-3 pt-2">
                                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-center">
                                            <span className="text-2xl font-black text-cyan-400">{teacherCount}+</span>
                                            <p className="text-[11px] text-slate-400 mt-0.5">Enseignants experts</p>
                                        </div>
                                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-center">
                                            <span className="text-2xl font-black text-teal-400">{studentCount}+</span>
                                            <p className="text-[11px] text-slate-400 mt-0.5">Étudiants actifs</p>
                                        </div>
                                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-center">
                                            <span className="text-2xl font-black text-emerald-400">{filieres.length}</span>
                                            <p className="text-[11px] text-slate-400 mt-0.5">Cursus diplômants</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {openCard === 'programs' && (
                                <div className="space-y-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                                                <BookOpen className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-white">Formations & Programmes</h3>
                                                <p className="text-xs text-slate-400">{filieres.length} cursus disponibles</p>
                                            </div>
                                        </div>
                                        <a href="#inscription" onClick={() => { setOpenCard(null); onOpenInscription?.(); }}>
                                            <Button size="sm" className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl">
                                                Postuler
                                            </Button>
                                        </a>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        {filieres.map((f: any) => (
                                            <div key={f.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-teal-500/40 transition">
                                                <h4 className="font-bold text-white text-sm">{f.nom}</h4>
                                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{f.description || 'Programme certifiant avec suivi individualisé.'}</p>
                                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 text-xs">
                                                    <span className="text-slate-500">{f.duree_mois || 12} mois</span>
                                                    <span className="font-black text-emerald-400">{new Intl.NumberFormat('fr-FR').format(f.frais_scolarite || 0)} XAF</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {openCard === 'gallery' && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                                            <Star className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white">Galerie Photos du Campus</h3>
                                            <p className="text-xs text-slate-400">Immersion complète dans nos locaux</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {currentGallery.map((img, i) => (
                                            <div key={i} className="rounded-2xl overflow-hidden aspect-[4/3] border border-white/10 bg-black/40">
                                                <img src={img} alt="Campus" className="w-full h-full object-cover hover:scale-105 transition duration-300" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {openCard === 'library' && (
                                <div className="space-y-5 text-center py-4">
                                    <BookMarked className="w-12 h-12 text-emerald-400 mx-auto" />
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Bibliothèque & Ressources Numériques</h3>
                                        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                                            Accédez aux supports de cours, polycopiés, annales d&apos;examens et manuels recommandés.
                                        </p>
                                    </div>
                                    <div className="flex gap-3 justify-center pt-2">
                                        <Link href={orgPath(orgSlug, 'library')}>
                                            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl">
                                                Bibliothèque de cours
                                            </Button>
                                        </Link>
                                        <Link href={orgPath(orgSlug, 'shop')}>
                                            <Button variant="outline" className="border-white/15 text-white hover:bg-white/5 font-bold text-xs rounded-xl">
                                                Boutique & Manuels
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {openCard === 'testimonials' && (
                                <div className="space-y-4">
                                    <h3 className="text-xl font-black text-white">Témoignages & Réussite de nos Alumni</h3>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        {[
                                            { name: 'Sarah Ndombe', role: 'Ingénieure Logiciel', text: 'Une formation exceptionnelle qui m\'a ouvert les portes des plus grandes entreprises.' },
                                            { name: 'David Manga', role: 'Major de Promotion', text: 'L\'accompagnement personnalisé des professeurs a fait toute la différence.' }
                                        ].map((t, idx) => (
                                            <div key={idx} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                                                <p className="text-xs text-slate-300 italic">&ldquo;{t.text}&rdquo;</p>
                                                <div>
                                                    <p className="text-xs font-black text-white">{t.name}</p>
                                                    <p className="text-[10px] text-cyan-400">{t.role}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
