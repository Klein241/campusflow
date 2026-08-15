'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, BookOpen, Star, BookMarked,
    Users, Phone, Mail, MapPin, Award, CheckCircle2,
    ArrowRight, FileText, GraduationCap, ShieldCheck,
    Calculator, ChevronDown, ChevronUp, ShoppingBag,
    HelpCircle, Check, DollarSign, School
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

export function TemplateBentoBox({
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
    // Calculateur de frais state
    const [selectedFiliereId, setSelectedFiliereId] = useState<string>(filieres[0]?.id || '');
    const [selectedYear, setSelectedYear] = useState<number>(1);
    const [hasScholarship, setHasScholarship] = useState<boolean>(false);

    // Accordion state
    const [openAbout, setOpenAbout] = useState<boolean>(true);
    const [openGallery, setOpenGallery] = useState<boolean>(false);
    const [activeHub, setActiveHub] = useState<string>('campus');

    // Calculate estimated fees
    const selectedFiliere = filieres.find((f: any) => f.id === selectedFiliereId) || filieres[0];
    const basePrice = selectedFiliere ? (selectedFiliere.frais_scolarite || 450000) : 450000;
    const yearMultiplier = selectedYear === 1 ? 1 : selectedYear === 2 ? 1.05 : 1.1;
    const scholarshipDiscount = hasScholarship ? 0.25 : 0;
    const finalPrice = Math.round(basePrice * yearMultiplier * (1 - scholarshipDiscount));

    const defaultPhotos = [
        'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=600&auto=format&fit=crop&q=80',
    ];

    const currentPhotos = gallery && gallery.length > 0 ? gallery : defaultPhotos;

    return (
        <div className="relative min-h-screen bg-[#070B12] text-white overflow-x-hidden pb-28 selection:bg-cyan-500/30">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-cyan-600/10 blur-[180px] rounded-full" />
                <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-teal-600/10 blur-[200px] rounded-full" />
            </div>

            {/* ═══ Header Bar ═══ */}
            <header className="relative z-20 max-w-4xl mx-auto px-4 pt-6 pb-4">
                <div className="flex items-center justify-between p-3.5 px-5 rounded-2xl bg-[#0D131F]/90 backdrop-blur-2xl border border-cyan-500/25 shadow-xl">
                    <div className="flex items-center gap-3">
                        {org.logo_url ? (
                            <img src={org.logo_url} alt={org.name} className="w-10 h-10 rounded-xl object-contain bg-white/10 p-1 border border-cyan-400/30 shrink-0" />
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-black shadow-md shrink-0">
                                S&A
                            </div>
                        )}
                        <div>
                            <h2 className="text-sm font-black tracking-wider text-white uppercase">{org.name}</h2>
                            <p className="text-[10px] text-cyan-400 font-bold uppercase">{org.city || 'Campus Connecté'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href={orgPath(orgSlug, 'login')}>
                            <Button size="sm" className="h-9 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15">
                                Espace élève
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* ═══ Main Studio Content ═══ */}
            <main className="relative z-10 max-w-4xl mx-auto px-4 space-y-6 pt-2">
                {/* ═══ 5 Circular Glowing Hubs (Exact match to design) ═══ */}
                <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-[#0B101A]/80 border border-white/10 backdrop-blur-xl overflow-x-auto scrollbar-none">
                    {[
                        { id: 'campus', label: 'Campus', icon: School },
                        { id: 'diplomas', label: 'Diplômes', icon: Award },
                        { id: 'filieres', label: 'Filières', icon: BookOpen },
                        { id: 'shop', label: 'Boutique', icon: ShoppingBag },
                        { id: 'reviews', label: 'Avis', icon: Star },
                    ].map(hub => (
                        <button
                            key={hub.id}
                            onClick={() => setActiveHub(hub.id)}
                            className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all group shrink-0"
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                activeHub === hub.id
                                    ? 'bg-cyan-500/20 text-cyan-300 border-2 border-cyan-400 shadow-lg shadow-cyan-500/30 scale-105'
                                    : 'bg-white/5 text-slate-400 border border-white/10 group-hover:border-cyan-500/40 group-hover:text-white'
                            }`}>
                                <hub.icon className="w-5 h-5" />
                            </div>
                            <span className={`text-[11px] font-bold ${activeHub === hub.id ? 'text-cyan-300' : 'text-slate-400'}`}>
                                {hub.label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* ═══ Banner Text ═══ */}
                <div className="text-center space-y-1">
                    <p className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">Bienvenue sur le portail</p>
                    <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">{org.name}</h1>
                </div>

                {/* ═══ CALCULATEUR DE FRAIS (Interactive Centerpiece Widget) ═══ */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 sm:p-7 rounded-3xl bg-[#0D131F]/95 border border-cyan-500/40 shadow-2xl backdrop-blur-2xl space-y-5"
                >
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-cyan-400" />
                            <h3 className="text-sm font-black uppercase text-cyan-300 tracking-wider">
                                Calculateur de Frais Scolaires
                            </h3>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                            Simulation instantanée
                        </span>
                    </div>

                    <div className="space-y-4">
                        {/* 1. Filière Dropdown */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-300 block">Filière d&apos;études :</label>
                            <select
                                value={selectedFiliereId}
                                onChange={e => setSelectedFiliereId(e.target.value)}
                                className="w-full h-11 bg-[#141C2B] border border-cyan-500/30 text-white rounded-xl px-4 text-xs font-bold focus:outline-none focus:border-cyan-400"
                            >
                                {filieres.map((f: any) => (
                                    <option key={f.id} value={f.id} className="bg-[#141C2B] text-white">
                                        {f.nom} ({f.duree_mois || 12} mois)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 2. Année Selection Pills */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-300 block">Année du cycle :</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[1, 2, 3].map(y => (
                                    <button
                                        key={y}
                                        onClick={() => setSelectedYear(y)}
                                        className={`h-10 rounded-xl text-xs font-black transition-all ${
                                            selectedYear === y
                                                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25'
                                                : 'bg-[#141C2B] text-slate-400 border border-white/10 hover:text-white'
                                        }`}
                                    >
                                        Année {y}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 3. Bourse Toggle */}
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#141C2B] border border-white/10">
                            <div>
                                <p className="text-xs font-bold text-white">Candidature à une bourse d&apos;études</p>
                                <p className="text-[10px] text-slate-400">Réduction estimée jusqu&apos;à 25% sur les frais</p>
                            </div>
                            <button
                                onClick={() => setHasScholarship(!hasScholarship)}
                                className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                                    hasScholarship ? 'bg-cyan-500' : 'bg-slate-700'
                                }`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                    hasScholarship ? 'translate-x-6' : 'translate-x-0'
                                }`} />
                            </button>
                        </div>

                        {/* 4. Display Estimated Tuition */}
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 to-[#0F1726] border border-cyan-500/30 flex items-center justify-between">
                            <div>
                                <span className="text-[11px] text-slate-400 block font-medium">Frais Estimés :</span>
                                <span className="text-2xl font-black text-cyan-300">
                                    {new Intl.NumberFormat('fr-FR').format(finalPrice)} XAF <span className="text-xs font-normal text-slate-400">/ an</span>
                                </span>
                            </div>
                            <a href="#inscription" onClick={onOpenInscription}>
                                <Button className="h-10 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-md shadow-cyan-500/20">
                                    Détails du paiement
                                </Button>
                            </a>
                        </div>
                    </div>
                </motion.div>

                {/* ═══ Accordion Card 1: À Propos de l'Institut ═══ */}
                <div className="rounded-3xl bg-[#0D131F]/90 border border-white/10 shadow-xl overflow-hidden">
                    <button
                        onClick={() => setOpenAbout(!openAbout)}
                        className="w-full flex items-center justify-between p-5 text-left font-black text-sm text-white hover:bg-white/5 transition"
                    >
                        <span className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-cyan-400" /> À PROPOS DE L&apos;ÉTABLISSEMENT
                        </span>
                        {openAbout ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    <AnimatePresence>
                        {openAbout && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-5 pb-5 pt-1 text-xs text-slate-300 leading-relaxed border-t border-white/5 space-y-3"
                            >
                                <p className="whitespace-pre-line">
                                    {org.about_text || `${org.name} s'engage à offrir une formation de référence basée sur l'excellence académique, l'éthique et la préparation active aux carrières internationales.`}
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center">
                                    <div className="p-2.5 rounded-xl bg-white/5"><p className="text-base font-black text-white">{filieres.length}</p><p className="text-[10px] text-slate-400">Filières</p></div>
                                    <div className="p-2.5 rounded-xl bg-white/5"><p className="text-base font-black text-cyan-400">{teacherCount}+</p><p className="text-[10px] text-slate-400">Professeurs</p></div>
                                    <div className="p-2.5 rounded-xl bg-white/5"><p className="text-base font-black text-teal-400">{studentCount}+</p><p className="text-[10px] text-slate-400">Étudiants</p></div>
                                    <div className="p-2.5 rounded-xl bg-white/5"><p className="text-base font-black text-amber-400">98%</p><p className="text-[10px] text-slate-400">Succès</p></div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ═══ Accordion Card 2: Galerie Campus ═══ */}
                <div className="rounded-3xl bg-[#0D131F]/90 border border-white/10 shadow-xl overflow-hidden">
                    <button
                        onClick={() => setOpenGallery(!openGallery)}
                        className="w-full flex items-center justify-between p-5 text-left font-black text-sm text-white hover:bg-white/5 transition"
                    >
                        <span className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-400" /> GALERIE DU CAMPUS
                        </span>
                        {openGallery ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    <AnimatePresence>
                        {openGallery && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-5 pb-5 pt-1 border-t border-white/5"
                            >
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                    {currentPhotos.map((img, i) => (
                                        <div key={i} className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                                            <img src={img} alt="Campus" className="w-full h-full object-cover hover:scale-105 transition duration-300" />
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* ═══ Bottom Sticky Action Bar (Exact match to design) ═══ */}
            <div className="fixed bottom-0 inset-x-0 z-40 bg-[#0A0E17]/95 backdrop-blur-2xl border-t border-cyan-500/25 p-3.5 px-6 shadow-2xl">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-black text-white uppercase tracking-wide">Commencez votre avenir</p>
                        <p className="text-[10px] text-slate-400">Inscriptions ouvertes pour l&apos;année 2026/2027</p>
                    </div>
                    <a href="#inscription" onClick={onOpenInscription}>
                        <Button className="h-11 px-6 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 gap-2">
                            <span>S&apos;INSCRIRE MAINTENANT</span>
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </a>
                </div>
            </div>
        </div>
    );
}
