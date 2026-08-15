'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, BookOpen, Award, Star, ShoppingBag,
    MapPin, Sparkles, GraduationCap, ChevronRight,
    CheckCircle2, ArrowRight, FileText, Send,
    Shield, Briefcase, Globe, Cpu, Users, ChevronDown,
    ChevronUp, MessageCircle, Calendar, Phone
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
        { id: '1', nom: 'MBA Excellence & Management', duree_mois: 24, description: 'Programme intensif pour leaders stratégiques et cadres dirigeants.', icon: Briefcase },
        { id: '2', nom: 'Global Health & Sciences', duree_mois: 36, description: 'Santé publique, épidémiologie et biotechnologies avancées.', icon: Globe },
        { id: '3', nom: 'Tech Innovation & IA', duree_mois: 24, description: 'Ingénierie logicielle, cybersécurité et intelligence artificielle.', icon: Cpu },
        { id: '4', nom: 'Humanities & Leadership', duree_mois: 12, description: 'Communication politique, relations internationales et éthique.', icon: Users },
    ];

    const accordionItems = [
        {
            id: 'mission',
            title: 'Our Mission & Academic Vision',
            content: org.about_text || `${org.name} forme les bâtisseurs de demain à travers des programmes rigoureux, dispensés par un corps professoral international de premier plan.`
        },
        {
            id: 'faculty',
            title: 'Prestigious Faculty & Mentors',
            content: `Plus de ${teacherCount || 50} enseignants-chercheurs et experts de l'industrie accompagnent chaque étudiant vers l'excellence professionnelle.`
        },
        {
            id: 'research',
            title: 'Research Focus & Innovation Labs',
            content: 'Des infrastructures de pointe et des partenariats avec les plus grandes institutions pour développer des projets à fort impact.'
        },
        {
            id: 'legacy',
            title: 'Campus Legacy & Global Network',
            content: 'Rejoignez un réseau de milliers d\'alumni actifs dans les entreprises majeures et organisations internationales.'
        },
    ];

    return (
        <div className="relative min-h-screen bg-[#030E08] text-white overflow-x-hidden pb-28 selection:bg-amber-500/30">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-5%] left-1/4 w-[700px] h-[500px] bg-emerald-700/10 blur-[200px] rounded-full" />
                <div className="absolute bottom-10 right-10 w-[600px] h-[400px] bg-amber-600/10 blur-[180px] rounded-full" />
            </div>

            {/* ═══ Top Navbar Ivy Luxury ═══ */}
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
                            <h2 className="text-sm sm:text-base font-black tracking-wide text-white uppercase">{org.name}</h2>
                            <p className="text-[10px] text-amber-400/80 font-medium tracking-wider uppercase">{org.motto || 'Excellence • Tradition • Avenir'}</p>
                        </div>
                    </div>

                    {/* Nav Links */}
                    <div className="hidden md:flex items-center gap-7 text-xs font-bold text-slate-300 tracking-wider">
                        <a href="#admissions" onClick={onOpenInscription} className="hover:text-amber-300 transition-colors">Admissions</a>
                        <a href="#programs" className="hover:text-amber-300 transition-colors">Programs</a>
                        <a href="#research" className="hover:text-amber-300 transition-colors">Research</a>
                        <a href="#campus" className="hover:text-amber-300 transition-colors">Campus</a>
                    </div>

                    {/* Contact & Espace élève CTA */}
                    <div className="flex items-center gap-2.5">
                        <Link href={orgPath(orgSlug, 'login')}>
                            <Button size="sm" className="bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl border border-white/15 h-9 px-4">
                                Connexion
                            </Button>
                        </Link>
                        <a href="#inscription" onClick={onOpenInscription}>
                            <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/25 h-9 px-4">
                                Contact
                            </Button>
                        </a>
                    </div>
                </div>
            </nav>

            {/* ═══ Main Ivy Content ═══ */}
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
                            Ignite Your Potential. <br />
                            <span className="text-white">Lead the Future.</span>
                        </motion.h1>
                        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg font-light">
                            Experience World-Class Education, certified international curriculums, and prestigious leadership training at <strong className="text-amber-300">{org.name}</strong>.
                        </p>
                        <div className="flex items-center gap-3 pt-2">
                            <a href="#inscription" onClick={onOpenInscription}>
                                <Button className="h-12 px-7 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/30 gap-2">
                                    <span>Explore Programs</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </a>
                            <a href="#contact">
                                <Button variant="outline" className="h-12 px-6 rounded-xl border-amber-500/30 text-amber-300 hover:bg-amber-500/10 font-bold text-xs">
                                    Schedule Tour
                                </Button>
                            </a>
                        </div>
                    </div>

                    {/* Right Column: Campus Image + 98% Success Rate Badge */}
                    <div className="lg:col-span-6 relative">
                        <div className="rounded-3xl overflow-hidden border border-amber-500/30 shadow-2xl aspect-[16/10] bg-[#07190F]">
                            <img
                                src={org.about_image_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1000&auto=format&fit=crop&q=80'}
                                alt="Ivy Campus"
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Floating 98% SUCCESS RATE Badge */}
                        <div className="absolute top-1/2 left-6 -translate-y-1/2 p-3.5 px-5 rounded-2xl bg-[#06180F]/90 backdrop-blur-2xl border border-amber-400/50 shadow-2xl flex items-center gap-3">
                            <div>
                                <span className="text-2xl font-black text-white tracking-tight">98%</span>
                                <span className="text-[10px] text-amber-400 block font-bold uppercase tracking-wider">Success Rate</span>
                            </div>
                            <Shield className="w-6 h-6 text-amber-400" />
                        </div>
                    </div>
                </div>

                {/* ═══ Split Section: Programs & Campus (Left) | About Us Accordion (Right) ═══ */}
                <div className="grid lg:grid-cols-12 gap-8 pt-4">
                    {/* LEFT (Col 7): PROGRAMS & CAMPUS CAROUSEL */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase text-amber-400 tracking-widest flex items-center gap-2">
                                <BookOpen className="w-4 h-4" /> Programs & Campus
                            </h3>
                            <span className="text-xs text-slate-400">{programCards.length} Curriculums</span>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            {programCards.map((p: any, idx: number) => (
                                <motion.div
                                    key={p.id || idx}
                                    onClick={() => setSelectedProgramIdx(idx)}
                                    className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between h-48 group ${
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
                                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">{p.description || 'Cursus d\'excellence certifié.'}</p>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 text-xs">
                                        <span className="text-amber-400/80 font-bold">{p.duree_mois || 24} mois</span>
                                        <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT (Col 5): ABOUT US ACCORDIONS */}
                    <div className="lg:col-span-5 space-y-4">
                        <h3 className="text-xs font-black uppercase text-amber-400 tracking-widest flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> About Us
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
                        href={`https://wa.me/${org.phone?.replace(/[^0-9]/g, '') || '237000000000'}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#128C7E]/20 border border-[#128C7E]/40 text-[#25D366] text-xs font-bold hover:bg-[#128C7E]/30 transition"
                    >
                        <MessageCircle className="w-4 h-4" />
                        <span>WhatsApp Chat</span>
                    </a>

                    <a href="#inscription" onClick={onOpenInscription}>
                        <Button className="h-10 px-6 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 gap-1.5">
                            <span>APPLY NOW / INSCRIPTION</span>
                            <span>⭐</span>
                        </Button>
                    </a>
                </div>
            </div>
        </div>
    );
}
