'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, BookOpen, Star, BookMarked,
    Users, Phone, Mail, MapPin, Award, CheckCircle2,
    ArrowRight, FileText, GraduationCap, ShieldCheck,
    Bell, Calendar, Clock, ChevronRight, Globe,
    Search, FlaskConical, Trophy, Palette, CheckSquare,
    UserCheck, MessageSquare, LogIn, ExternalLink, School
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

export function TemplateBentoGrid({
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
    const [activeTab, setActiveTab] = useState<'bento' | 'programs' | 'about' | 'gallery' | 'portal'>('bento');

    const defaultPhotos = [
        'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80',
    ];

    const currentPhotos = gallery && gallery.length > 0 ? gallery : defaultPhotos;

    return (
        <div className="relative min-h-screen bg-[#070A0F] text-white overflow-x-hidden selection:bg-emerald-500/30">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[90vw] max-w-[600px] h-[300px] sm:h-[600px] bg-emerald-500/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-[10%] left-[-10%] w-[90vw] max-w-[500px] h-[250px] sm:h-[500px] bg-teal-500/10 blur-[140px] rounded-full" />
            </div>

            {/* ═══ Header Navbar Bento ═══ */}
            <nav className="relative z-20 max-w-7xl mx-auto px-4 sm:px-8 py-5">
                <div className="flex items-center justify-between gap-4 p-3 px-6 rounded-2xl bg-[#0F141E]/80 backdrop-blur-2xl border border-white/10 shadow-xl">
                    <div className="flex items-center gap-3">
                        {org.logo_url ? (
                            <img src={org.logo_url} alt={org.name} className="w-9 h-9 rounded-xl object-contain bg-white/10 p-1 border border-white/10 shrink-0" />
                        ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shrink-0">
                                <Sparkles className="w-5 h-5 font-black" />
                            </div>
                        )}
                        <span className="font-black text-sm tracking-wide text-white uppercase truncate max-w-[200px] sm:max-w-none">{org.name}</span>
                    </div>

                    <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
                        <button onClick={() => setActiveTab('bento')} className={`transition hover:text-emerald-400 ${activeTab === 'bento' ? 'text-emerald-400 font-bold' : ''}`}>Accueil</button>
                        <button onClick={() => setActiveTab('programs')} className={`transition hover:text-emerald-400 ${activeTab === 'programs' ? 'text-emerald-400 font-bold' : ''}`}>Formations</button>
                        <button onClick={onOpenInscription} className="hover:text-emerald-400 transition">Admissions</button>
                        <button onClick={() => setActiveTab('about')} className={`transition hover:text-emerald-400 ${activeTab === 'about' ? 'text-emerald-400 font-bold' : ''}`}>À Propos</button>
                        <button onClick={() => setActiveTab('gallery')} className={`transition hover:text-emerald-400 ${activeTab === 'gallery' ? 'text-emerald-400 font-bold' : ''}`}>Galerie</button>
                        <button onClick={() => setActiveTab('portal')} className={`transition hover:text-emerald-400 ${activeTab === 'portal' ? 'text-emerald-400 font-bold' : ''}`}>Espaces</button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href={orgPath(orgSlug, 'login')}>
                            <Button size="sm" className="h-9 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-full shadow-lg shadow-emerald-500/20 flex items-center gap-1.5">
                                <LogIn className="w-3.5 h-3.5" />
                                Connexion
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ═══ Main Bento Layout ═══ */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-28 space-y-8">
                {/* ═══ Hero Title Area ═══ */}
                <div className="text-center max-w-3xl mx-auto space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                        {org.type ? `${org.type.toUpperCase()} D'EXCELLENCE` : 'ÉTABLISSEMENT D\'EXCELLENCE'} • {org.city || 'CAMPUS CONNECTÉ'}
                    </p>
                    <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">
                        Une Éducation d'Excellence <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                            avec une Vision d'Avenir
                        </span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
                        {org.motto || org.hero_subtitle || 'Portail officiel d\'admission, de formation et de suivi académique pour les étudiants et enseignants.'}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                        <Button onClick={onOpenInscription} className="h-11 px-7 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 w-full sm:w-auto">
                            <FileText className="w-4 h-4" />
                            S'inscrire Maintenant
                        </Button>
                        <Button onClick={() => setActiveTab('programs')} variant="outline" className="h-11 px-7 rounded-full border-white/15 text-white hover:bg-white/5 font-bold text-xs w-full sm:w-auto">
                            Découvrir les Formations
                        </Button>
                    </div>
                </div>

                {/* ═══ Capsule Navigation Pill Bar ═══ */}
                <div className="flex justify-center">
                    <div className="flex items-center gap-2 p-1.5 rounded-full bg-[#111723]/90 border border-white/10 backdrop-blur-xl shadow-xl overflow-x-auto scrollbar-none max-w-full">
                        {[
                            { id: 'bento', label: '⚡ Vue Synthèse' },
                            { id: 'programs', label: `🎓 Formations (${filieres.length || classrooms.length})` },
                            { id: 'about', label: '🏛️ À Propos & Campus' },
                            { id: 'gallery', label: `📸 Galerie Photos (${currentPhotos.length})` },
                            { id: 'portal', label: '🔐 Espaces Dédiés' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-4 sm:px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* VUE 1 : MOSAÏQUE BENTO GRID (SYNTHÈSE COMPLÈTE)                */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                {activeTab === 'bento' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* LEFT COLUMN: Student Hub Widget (Col 5) */}
                        <div className="lg:col-span-5 space-y-5">
                            {/* 1. Student Portal Card */}
                            <div className="p-6 rounded-3xl bg-[#0D121D]/90 border border-emerald-500/30 shadow-2xl backdrop-blur-xl space-y-5">
                                {/* Profile Bar */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/30 to-teal-500/20 border-2 border-emerald-400/50 flex items-center justify-center text-emerald-300 font-bold">
                                            <GraduationCap className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-white">Espace Académique</h3>
                                            <p className="text-[11px] text-slate-400">Portail officiel des apprenants</p>
                                        </div>
                                    </div>
                                    <div className="relative p-2 rounded-xl bg-white/5 text-slate-300">
                                        <Bell className="w-4 h-4 text-emerald-400" />
                                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                    </div>
                                </div>

                                {/* 3 Stats Chips */}
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                                        <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black mb-1">
                                            {filieres.length > 0 ? filieres.length : 1}
                                        </span>
                                        <p className="text-[11px] font-bold text-slate-300">Filières</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                                        <span className="inline-block px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-black mb-1">
                                            {classrooms.length > 0 ? classrooms.length : 1}
                                        </span>
                                        <p className="text-[11px] font-bold text-slate-300">Classes</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                                        <span className="inline-block px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-black mb-1">
                                            {studentCount > 0 ? `${studentCount}+` : '100%'}
                                        </span>
                                        <p className="text-[11px] font-bold text-slate-300">En Ligne</p>
                                    </div>
                                </div>

                                {/* Quick Access Buttons */}
                                <div className="grid grid-cols-2 gap-2">
                                    <Link href={orgPath(orgSlug, 'login')}>
                                        <Button className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20">
                                            Espace Élève
                                        </Button>
                                    </Link>
                                    <Link href={orgPath(orgSlug, 'prof')}>
                                        <Button variant="outline" className="w-full h-10 rounded-xl border-white/10 text-white hover:bg-white/5 text-xs font-bold">
                                            Espace Prof
                                        </Button>
                                    </Link>
                                </div>

                                {/* Mini Feed */}
                                <div className="space-y-2 pt-2 border-t border-white/5">
                                    <Link href={orgPath(orgSlug, 'login')}>
                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 border border-white/5 text-xs transition cursor-pointer">
                                            <div className="flex items-center gap-2.5">
                                                <Calendar className="w-4 h-4 text-amber-400" />
                                                <div>
                                                    <p className="font-bold text-white text-[11px]">Emploi du Temps & Cours</p>
                                                    <p className="text-[9px] text-slate-400">Consulter les plannings de classe</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                                        </div>
                                    </Link>
                                    <Link href={orgPath(orgSlug, 'library')}>
                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 border border-white/5 text-xs transition cursor-pointer">
                                            <div className="flex items-center gap-2.5">
                                                <BookMarked className="w-4 h-4 text-teal-400" />
                                                <div>
                                                    <p className="font-bold text-white text-[11px]">Bibliothèque Numérique</p>
                                                    <p className="text-[9px] text-slate-400">Livres, manuels et e-documents</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Bento Tiles (Col 7) */}
                        <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
                            {/* 1. Quick Links Card */}
                            <div className="p-5 rounded-3xl bg-[#0D121D]/90 border border-white/10 shadow-xl space-y-3">
                                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> Accès Rapides
                                </h4>
                                <div className="space-y-1.5">
                                    {[
                                        { label: 'Mes Notes & Bulletins', icon: Trophy, href: orgPath(orgSlug, 'login') },
                                        { label: 'Horaires & Emploi du temps', icon: Calendar, href: orgPath(orgSlug, 'login') },
                                        { label: 'Formulaire d\'Admission', icon: FileText, action: onOpenInscription },
                                        { label: 'Bibliothèque & E-Books', icon: BookOpen, href: orgPath(orgSlug, 'library') },
                                    ].map((item, i) => (
                                        item.action ? (
                                            <button key={i} onClick={item.action} className="w-full text-left">
                                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 border border-transparent hover:border-white/10 text-xs transition cursor-pointer">
                                                    <div className="flex items-center gap-2 text-slate-300">
                                                        <item.icon className="w-3.5 h-3.5 text-emerald-400" />
                                                        <span>{item.label}</span>
                                                    </div>
                                                    <ChevronRight className="w-3 h-3 text-slate-600" />
                                                </div>
                                            </button>
                                        ) : (
                                            <Link key={i} href={item.href || '#'}>
                                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 border border-transparent hover:border-white/10 text-xs transition cursor-pointer">
                                                    <div className="flex items-center gap-2 text-slate-300">
                                                        <item.icon className="w-3.5 h-3.5 text-emerald-400" />
                                                        <span>{item.label}</span>
                                                    </div>
                                                    <ChevronRight className="w-3 h-3 text-slate-600" />
                                                </div>
                                            </Link>
                                        )
                                    ))}
                                </div>
                            </div>

                            {/* 2. Resources Card */}
                            <div className="p-5 rounded-3xl bg-[#0D121D]/90 border border-white/10 shadow-xl space-y-3">
                                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                                    <BookMarked className="w-3.5 h-3.5 text-teal-400" /> Ressources & Services
                                </h4>
                                <div className="space-y-1.5">
                                    {[
                                        { label: 'Bibliothèque en ligne', icon: BookMarked, href: orgPath(orgSlug, 'library') },
                                        { label: 'Espace Enseignants', icon: Users, href: orgPath(orgSlug, 'prof') },
                                        { label: 'Actualités & Vie Scolaire', icon: Bell, action: () => setActiveTab('about') },
                                        { label: 'Présentation & Contact', icon: MapPin, action: () => setActiveTab('about') },
                                    ].map((item, i) => (
                                        item.action ? (
                                            <button key={i} onClick={item.action} className="w-full text-left">
                                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 border border-transparent hover:border-white/10 text-xs transition cursor-pointer">
                                                    <div className="flex items-center gap-2 text-slate-300">
                                                        <item.icon className="w-3.5 h-3.5 text-teal-400" />
                                                        <span>{item.label}</span>
                                                    </div>
                                                    <ChevronRight className="w-3 h-3 text-slate-600" />
                                                </div>
                                            </button>
                                        ) : (
                                            <Link key={i} href={item.href || '#'}>
                                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 border border-transparent hover:border-white/10 text-xs transition cursor-pointer">
                                                    <div className="flex items-center gap-2 text-slate-300">
                                                        <item.icon className="w-3.5 h-3.5 text-teal-400" />
                                                        <span>{item.label}</span>
                                                    </div>
                                                    <ChevronRight className="w-3 h-3 text-slate-600" />
                                                </div>
                                            </Link>
                                        )
                                    ))}
                                </div>
                            </div>

                            {/* 3. Our Campus Stats Card */}
                            <div className="p-5 rounded-3xl bg-[#0D121D]/90 border border-white/10 shadow-xl space-y-3">
                                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Notre Campus</h4>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <p className="text-lg font-black text-emerald-400">{studentCount > 0 ? `${studentCount}+` : '500+'}</p>
                                        <p className="text-[10px] text-slate-400">Étudiants</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-black text-teal-400">{filieres.length > 0 ? filieres.length : classrooms.length || '1'}</p>
                                        <p className="text-[10px] text-slate-400">Filières</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-black text-cyan-400">{teacherCount > 0 ? `${teacherCount}+` : '15+'}</p>
                                        <p className="text-[10px] text-slate-400">Enseignants</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap justify-center gap-1.5 pt-2 border-t border-white/5">
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-white/5 px-2.5 py-1 rounded-full text-slate-300">
                                        <FlaskConical className="w-3 h-3 text-emerald-400" /> Salles modernes
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-white/5 px-2.5 py-1 rounded-full text-slate-300">
                                        <Trophy className="w-3 h-3 text-amber-400" /> Excellence
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-white/5 px-2.5 py-1 rounded-full text-slate-300">
                                        <Palette className="w-3 h-3 text-pink-400" /> Activités
                                    </span>
                                </div>
                            </div>

                            {/* 4. Upcoming Events Card */}
                            <div className="p-5 rounded-3xl bg-[#0D121D]/90 border border-white/10 shadow-xl space-y-3">
                                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5 text-amber-400" /> Agenda Académique
                                </h4>
                                <div className="space-y-2">
                                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                                        <div>
                                            <p className="font-bold text-white text-[11px]">Sessions d'Admissions 2025/2026</p>
                                            <p className="text-[9px] text-slate-400">Inscriptions ouvertes en ligne</p>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">En cours</span>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                                        <div>
                                            <p className="font-bold text-white text-[11px]">Évaluations & Examens</p>
                                            <p className="text-[9px] text-slate-400">Calendrier des devoirs et partiels</p>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 text-[10px] font-bold">Plannings</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* VUE 2 : FORMATIONS & FILIÈRES                                 */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                {activeTab === 'programs' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">🎓 Nos Formations & Filières</h2>
                                <p className="text-xs text-slate-400 mt-1">Découvrez l'ensemble de nos parcours de formation accrédités.</p>
                            </div>
                            <Button onClick={onOpenInscription} size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl">
                                <FileText className="w-3.5 h-3.5 mr-1.5" />
                                S'inscrire
                            </Button>
                        </div>

                        {filieres && filieres.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filieres.map((f: any) => (
                                    <div key={f.id} className="p-5 rounded-2xl bg-[#0D121D]/90 border border-white/10 hover:border-emerald-500/40 transition-all duration-300 shadow-xl flex flex-col justify-between space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold">
                                                    {f.duree_mois ? `${f.duree_mois} mois` : 'Cursus complet'}
                                                </span>
                                                {f.frais_scolarite && (
                                                    <span className="text-xs font-mono font-bold text-teal-300">
                                                        {Number(f.frais_scolarite).toLocaleString('fr-FR')} FCFA
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-base text-white">{f.nom}</h3>
                                            <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                                                {f.description || 'Formation complète préparant aux métiers d\'avenir avec encadrement personnalisé.'}
                                            </p>
                                        </div>
                                        <Button onClick={onOpenInscription} size="sm" className="w-full bg-white/5 hover:bg-emerald-500 hover:text-slate-950 text-white font-bold text-xs rounded-xl border border-white/10 transition">
                                            Postuler à cette filière <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : classrooms.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {classrooms.map((c: any) => (
                                    <div key={c.id} className="p-5 rounded-2xl bg-[#0D121D]/90 border border-white/10 space-y-3">
                                        <h3 className="font-bold text-base text-white">{c.name}</h3>
                                        <p className="text-xs text-slate-400">Programme complet de cours, devoirs et évaluations régulières.</p>
                                        <Button onClick={onOpenInscription} size="sm" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl">
                                            Rejoindre cette classe <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 rounded-2xl bg-[#0D121D]/90 border border-white/10 text-center space-y-3">
                                <h3 className="font-bold text-lg text-white">Inscriptions et admissions ouvertes à {org.name}</h3>
                                <p className="text-xs text-slate-400 max-w-md mx-auto">
                                    Déposez dès maintenant votre dossier pour rejoindre nos prochaines promotions d'étudiants.
                                </p>
                                <Button onClick={onOpenInscription} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl px-6">
                                    Formulaire d'Admission
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* VUE 3 : À PROPOS & CAMPUS                                     */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                {activeTab === 'about' && (
                    <div className="space-y-6">
                        <div className="p-6 sm:p-8 rounded-3xl bg-[#0D121D]/90 border border-white/10 shadow-2xl space-y-6">
                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                {org.logo_url ? (
                                    <img src={org.logo_url} alt={org.name} className="w-20 h-20 rounded-2xl object-contain bg-white/10 p-2 border border-white/10 shrink-0" />
                                ) : (
                                    <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-black text-2xl shrink-0">
                                        <School className="w-10 h-10" />
                                    </div>
                                )}
                                <div className="space-y-1 text-center sm:text-left">
                                    <h2 className="text-2xl font-black text-white">{org.name}</h2>
                                    <p className="text-xs text-emerald-400 font-bold uppercase">{org.type || 'Établissement'} • {org.city || 'Cameroun'}</p>
                                    <p className="text-xs text-slate-400 max-w-xl">{org.motto || 'Un cadre propice à l\'apprentissage et au développement des compétences.'}</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 space-y-3">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Présentation</h3>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    {org.about_text || `${org.name} est un établissement moderne dédié à l'enseignement de haute qualité. Notre plateforme numérique intégrée permet un suivi rigoureux des élèves, des cours en direct et des évaluations régulières pour garantir l'excellence.`}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/5">
                                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
                                    <Phone className="w-5 h-5 text-emerald-400 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Téléphone</p>
                                        <p className="text-xs font-bold text-white truncate">{org.phone || 'Non renseigné'}</p>
                                    </div>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
                                    <Mail className="w-5 h-5 text-teal-400 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Email officiel</p>
                                        <p className="text-xs font-bold text-white truncate">{org.email || 'Non renseigné'}</p>
                                    </div>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
                                    <MapPin className="w-5 h-5 text-cyan-400 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Localisation</p>
                                        <p className="text-xs font-bold text-white truncate">{org.quarter ? `${org.quarter}, ${org.city}` : org.city || 'Cameroun'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* VUE 4 : GALERIE PHOTOS DU CAMPUS                              */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                {activeTab === 'gallery' && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-white">📸 Galerie & Vie de Campus</h2>
                            <p className="text-xs text-slate-400 mt-1">Visite immersive de nos infrastructures, laboratoires et événements.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {currentPhotos.map((photo, i) => (
                                <div key={i} className="group relative h-56 rounded-2xl overflow-hidden border border-white/10 shadow-xl bg-black/40">
                                    <img src={photo} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex items-end">
                                        <p className="text-xs font-bold text-white">{org.name} — Campus</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* VUE 5 : ESPACES DÉDIÉS                                        */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                {activeTab === 'portal' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-[#0D121D] to-[#0D121D] border border-emerald-500/30 shadow-2xl space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black">
                                <GraduationCap className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white">Espace Étudiant</h3>
                                <p className="text-xs text-slate-400 mt-1">Accédez à vos cours, relevés de notes, bulletins officiels et devoirs Cursus.</p>
                            </div>
                            <Link href={orgPath(orgSlug, 'login')}>
                                <Button className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20">
                                    Se connecter (Élève) <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                </Button>
                            </Link>
                        </div>

                        <div className="p-6 rounded-3xl bg-gradient-to-br from-teal-500/10 via-[#0D121D] to-[#0D121D] border border-teal-500/30 shadow-2xl space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-black">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white">Espace Enseignant</h3>
                                <p className="text-xs text-slate-400 mt-1">Gérez vos matières, publiez vos notes, créez des devoirs et suivez vos classes.</p>
                            </div>
                            <Link href={orgPath(orgSlug, 'prof')}>
                                <Button className="w-full bg-teal-600 hover:bg-teal-500 text-white font-black text-xs rounded-xl shadow-lg shadow-teal-600/20">
                                    Accès Enseignant <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                </Button>
                            </Link>
                        </div>

                        <div className="p-6 rounded-3xl bg-gradient-to-br from-cyan-500/10 via-[#0D121D] to-[#0D121D] border border-cyan-500/30 shadow-2xl space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-black">
                                <BookMarked className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white">Bibliothèque Numérique</h3>
                                <p className="text-xs text-slate-400 mt-1">Consultez et commandez les livres, manuels scolaires et polycopiés de l'école.</p>
                            </div>
                            <Link href={orgPath(orgSlug, 'library')}>
                                <Button className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs rounded-xl shadow-lg shadow-cyan-600/20">
                                    Ouvrir la Bibliothèque <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
