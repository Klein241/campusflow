'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Award, Star, ShoppingBag,
    MapPin, Sparkles, GraduationCap, ChevronRight,
    CheckCircle2, ArrowRight, FileText, Send,
    Shield, Briefcase, Globe, Cpu, Users, ChevronDown,
    ChevronUp, MessageCircle, Calendar, Phone, LogIn
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

export function TemplateSegmentedHub({
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
    const [selectedProgramIdx, setSelectedProgramIdx] = useState<number>(0);
    const [openAccordion, setOpenAccordion] = useState<string>('mission');

    const programCards = filieres && filieres.length > 0 ? filieres : [
        { id: '1', nom: 'Excellence & Management', duree_mois: 24, description: 'Programme intensif pour leaders stratégiques et cadres dirigeants.', icon: Briefcase },
        { id: '2', nom: 'Santé & Sciences Biomédicales', duree_mois: 36, description: 'Santé publique, soins infirmiers et technologies médicales.', icon: Globe },
        { id: '3', nom: 'Ingénierie, Numérique & IA', duree_mois: 24, description: 'Développement logiciel, cybersécurité et intelligence artificielle.', icon: Cpu },
        { id: '4', nom: 'Lettres, Droit & Sciences Humaines', duree_mois: 12, description: 'Communication, relations publiques, droit et gouvernance.', icon: Users },
    ];

    const accordionItems = [
        {
            id: 'mission',
            title: '🎯 Notre Mission & Vision Académique',
            content: org.about_text || `${org.name} forme les bâtisseurs de demain à travers des programmes rigoureux, dispensés par un corps professoral hautement qualifié.`
        },
        {
            id: 'faculty',
            title: '👨‍🏫 Corps Professoral & Encadrement d\'Excellence',
            content: `Plus de ${teacherCount || 30} enseignants certifiés et experts de l'industrie accompagnent chaque étudiant vers la réussite et l'insertion professionnelle.`
        },
        {
            id: 'research',
            title: '🔬 Infrastructures & Salles Spécialisées',
            content: 'Des salles modernes, une bibliothèque connectée et des équipements pratiques pour un apprentissage concret et orienté compétences.'
        },
        {
            id: 'legacy',
            title: '🌐 Réseau des Diplômés & Perspectives',
            content: 'Rejoignez un réseau dynamique d\'étudiants et diplômés insérés dans les secteurs clés d\'activité et les organisations internationales.'
        },
    ];

    return (
        <div className="relative min-h-screen bg-[#030E08] text-white overflow-x-hidden pb-28 selection:bg-amber-500/30">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-5%] left-1/4 w-[700px] h-[500px] bg-emerald-700/10 blur-[200px] rounded-full" />
                <div className="absolute bottom-10 right-10 w-[600px] h-[400px] bg-amber-600/10 blur-[180px] rounded-full" />
            </div>

            {/* ═══ Top Navbar Luxury ═══ */}
            <nav className="relative z-20 max-w-7xl mx-auto px-4 sm:px-8 py-5">
                <div className="flex items-center justify-between gap-4 p-3.5 px-6 rounded-2xl bg-[#06180F]/90 backdrop-blur-2xl border border-amber-500/30 shadow-2xl">
                    {/* Logo & Crest */}
                    <div className="flex items-center gap-3.5">
                        {org.logo_url ? (
                            <img src={org.logo_url} alt={org.name} className="w-10 h-10 rounded-xl object-contain bg-white/10 p-1 border border-amber-400/30 shadow-md shrink-0" />
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-emerald-800/40 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md shrink-0">
                                <Award className="w-5 h-5" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-sm sm:text-base font-black tracking-wide text-white uppercase truncate max-w-[200px] sm:max-w-none">{org.name}</h2>
                            <p className="text-[10px] text-amber-400/80 font-medium tracking-wider uppercase">{org.motto || 'Excellence • Rigueur • Réussite'}</p>
                        </div>
                    </div>

                    {/* Nav Links */}
                    <div className="hidden md:flex items-center gap-7 text-xs font-bold text-slate-300 tracking-wider">
                        <button onClick={onOpenInscription} className="hover:text-amber-300 transition-colors">Admissions</button>
                        <a href="#programs" className="hover:text-amber-300 transition-colors">Formations</a>
                        <a href="#about" onClick={() => setOpenAccordion('research')} className="hover:text-amber-300 transition-colors">Infrastructures</a>
                        <a href="#campus" onClick={() => setOpenAccordion('faculty')} className="hover:text-amber-300 transition-colors">Campus</a>
                    </div>

                    {/* Contact & Espace élève CTA */}
                    <div className="flex items-center gap-2.5">
                        <Link href={orgPath(orgSlug, 'login')}>
                            <Button size="sm" className="bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl border border-white/15 h-9 px-4 flex items-center gap-1.5">
                                <LogIn className="w-3.5 h-3.5" />
                                Connexion
                            </Button>
                        </Link>
                        <Button size="sm" onClick={onOpenInscription} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/25 h-9 px-4">
                            S'inscrire
                        </Button>
                    </div>
                </div>
            </nav>

            {/* ═══ Main Content ═══ */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-12">
                {/* ═══ Hero Headline & Split Showcase ═══ */}
                <div className="grid lg:grid-cols-12 gap-8 items-center">
                    {/* Left Column: Headline */}
                    <div className="lg:col-span-6 space-y-5">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl sm:text-5xl lg:text-6xl font-black text-amber-400 uppercase tracking-tight leading-[1.08]"
                        >
                            Révélez Votre Potentiel. <br />
                            <span className="text-white">Guidez l'Avenir.</span>
                        </motion.h1>
                        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg font-light">
                            Bénéficiez d'une éducation de haut niveau, de parcours certifiés et d'un encadrement rigoureux à <strong className="text-amber-300">{org.name}</strong>.
                        </p>
                        <div className="flex items-center gap-3 pt-2">
                            <Button onClick={onOpenInscription} className="h-12 px-7 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/30 gap-2">
                                <FileText className="w-4 h-4" />
                                <span>Demande d'Admission</span>
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                            <Link href={orgPath(orgSlug, 'library')}>
                                <Button variant="outline" className="h-12 px-6 rounded-xl border-amber-500/30 text-amber-300 hover:bg-amber-500/10 font-bold text-xs">
                                    Bibliothèque & Livres
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Right Column: Campus Image + 98% Success Rate Badge */}
                    <div className="lg:col-span-6 relative">
                        <div className="rounded-3xl overflow-hidden border border-amber-500/30 shadow-2xl aspect-[16/10] bg-[#07190F]">
                            <img
                                src={org.about_image_url || (gallery && gallery[0]) || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1000&auto=format&fit=crop&q=80'}
                                alt="Campus"
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Floating 98% SUCCESS RATE Badge */}
                        <div className="absolute top-1/2 left-6 -translate-y-1/2 p-3.5 px-5 rounded-2xl bg-[#06180F]/90 backdrop-blur-2xl border border-amber-400/50 shadow-2xl flex items-center gap-3">
                            <div>
                                <span className="text-2xl font-black text-white tracking-tight">98%</span>
                                <span className="text-[10px] text-amber-400 block font-bold uppercase tracking-wider">Taux de Réussite</span>
                            </div>
                            <Shield className="w-6 h-6 text-amber-400" />
                        </div>
                    </div>
                </div>

                {/* ═══ Split Section: Programs & Campus (Left) | About Us Accordion (Right) ═══ */}
                <div id="programs" className="grid lg:grid-cols-12 gap-8 pt-4">
                    {/* LEFT (Col 7): PROGRAMS & CAMPUS */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase text-amber-400 tracking-widest flex items-center gap-2">
                                <BookOpen className="w-4 h-4" /> Filières & Formations Disponibles
                            </h3>
                            <span className="text-xs text-slate-400 font-bold">{programCards.length} Cursus Actifs</span>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            {programCards.map((p: any, idx: number) => (
                                <motion.div
                                    key={p.id || idx}
                                    onClick={() => setSelectedProgramIdx(idx)}
                                    className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between h-52 group ${
                                        selectedProgramIdx === idx
                                            ? 'bg-gradient-to-br from-[#0D2418] to-[#06180F] border-amber-400/60 shadow-xl shadow-amber-500/10'
                                            : 'bg-[#06180F]/80 border-white/10 hover:border-amber-500/30'
                                    }`}
                                >
                                    <div>
                                        <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-300 mb-3">
                                            <Briefcase className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-black text-sm text-white group-hover:text-amber-300 transition-colors">{p.nom}</h4>
                                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">{p.description || 'Cursus certifié avec suivi pédagogique complet.'}</p>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 text-xs border-t border-white/5">
                                        <span className="text-amber-400/80 font-bold">{p.duree_mois ? `${p.duree_mois} mois` : 'Cursus complet'}</span>
                                        <button onClick={(e) => { e.stopPropagation(); onOpenInscription?.(); }} className="text-[11px] font-bold text-amber-300 hover:text-white flex items-center gap-1">
                                            Postuler <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT (Col 5): ABOUT US ACCORDIONS */}
                    <div id="about" className="lg:col-span-5 space-y-4">
                        <h3 className="text-xs font-black uppercase text-amber-400 tracking-widest flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> Informations & Atouts
                        </h3>

                        <div className="space-y-2.5">
                            {accordionItems.map(item => (
                                <div key={item.id} className="rounded-2xl bg-[#06180F]/90 border border-white/10 overflow-hidden">
                                    <button
                                        onClick={() => setOpenAccordion(openAccordion === item.id ? '' : item.id)}
                                        className="w-full flex items-center justify-between p-4 text-left font-bold text-xs text-white hover:bg-white/5 transition"
                                    >
                                        <span>{item.title}</span>
                                        {openAccordion === item.id ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                                    </button>
                                    <AnimatePresence>
                                        {openAccordion === item.id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="px-4 pb-4 pt-1 text-[11px] text-slate-300 leading-relaxed border-t border-white/5"
                                            >
                                                {item.content}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* ═══ Floating Bottom Action Bar (WhatsApp & Apply Now) ═══ */}
            <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-3 p-2 px-4 rounded-full bg-[#06180F]/95 backdrop-blur-2xl border border-amber-500/30 shadow-2xl shadow-black/80">
                    <a
                        href={`https://wa.me/${org.phone?.replace(/[^0-9]/g, '') || org.whatsapp?.replace(/[^0-9]/g, '') || '237000000000'}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#128C7E]/20 border border-[#128C7E]/40 text-[#25D366] text-xs font-bold hover:bg-[#128C7E]/30 transition"
                    >
                        <MessageCircle className="w-4 h-4" />
                        <span>WhatsApp Direct</span>
                    </a>

                    <Button onClick={onOpenInscription} className="h-10 px-6 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 gap-1.5">
                        <span>INSCRIPTION EN LIGNE</span>
                        <span>⭐</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
