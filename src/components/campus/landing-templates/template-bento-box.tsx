'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, BookOpen, Star, BookMarked,
    Users, Phone, Mail, MapPin, Award, CheckCircle2,
    ArrowRight, FileText, GraduationCap, ShieldCheck,
    ChevronDown, ChevronUp, ShoppingBag, School,
    Check, DollarSign, LogIn, ExternalLink, MessageCircle
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
    // Interactive Hub switcher: campus | diplomas | filieres | shop | reviews
    const [activeHub, setActiveHub] = useState<string>('campus');

    // Accordions
    const [openAbout, setOpenAbout] = useState<boolean>(true);
    const [openContact, setOpenContact] = useState<boolean>(false);

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
                                <School className="w-5 h-5" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-sm font-black tracking-wider text-white uppercase truncate max-w-[200px] sm:max-w-none">{org.name}</h2>
                            <p className="text-[10px] text-cyan-400 font-bold uppercase">{org.city || 'Campus Connecté'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href={orgPath(orgSlug, 'login')}>
                            <Button size="sm" className="h-9 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 flex items-center gap-1.5">
                                <LogIn className="w-3.5 h-3.5" />
                                Espace élève
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* ═══ Main Studio Content ═══ */}
            <main className="relative z-10 max-w-4xl mx-auto px-4 space-y-6 pt-2">
                {/* ═══ 5 Circular Glowing Hubs ═══ */}
                <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-[#0B101A]/80 border border-white/10 backdrop-blur-xl overflow-x-auto scrollbar-none">
                    {[
                        { id: 'campus', label: 'Galerie', icon: Star },
                        { id: 'diplomas', label: 'Diplômes', icon: Award },
                        { id: 'filieres', label: 'Filières', icon: BookOpen },
                        { id: 'shop', label: 'Bibliothèque', icon: BookMarked },
                        { id: 'reviews', label: 'Avis', icon: CheckCircle2 },
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
                    <p className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">Bienvenue sur le portail officiel</p>
                    <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">{org.name}</h1>
                </div>

                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* WIDGET CENTRAL INTERACTIF DYNAMIQUE                            */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                <motion.div
                    key={activeHub}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-6 sm:p-7 rounded-3xl bg-[#0D131F]/95 border border-cyan-500/40 shadow-2xl backdrop-blur-2xl space-y-5"
                >
                    {/* ── 1. VUE GALERIE CAMPUS ── */}
                    {activeHub === 'campus' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <Star className="w-5 h-5 text-amber-400" />
                                    <h3 className="text-sm font-black uppercase text-cyan-300 tracking-wider">
                                        Galerie Photos & Vie du Campus
                                    </h3>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                                    {currentPhotos.length} Photos
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {currentPhotos.slice(0, 6).map((img, i) => (
                                    <div key={i} className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-black/40 group relative shadow-lg">
                                        <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex items-end">
                                            <p className="text-[10px] font-bold text-white truncate">{org.name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-white/10">
                                <span className="text-xs text-slate-400">Infrastructures modernes & laboratoires</span>
                                <Button onClick={onOpenInscription} size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-md">
                                    Rejoindre l'école <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ── 2. VUE DIPLÔMES & CERTIFICATIONS ── */}
                    {activeHub === 'diplomas' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <Award className="w-5 h-5 text-cyan-400" />
                                    <h3 className="text-sm font-black uppercase text-cyan-300 tracking-wider">
                                        Diplômes & Titres Délivrés
                                    </h3>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    Certifié & Reconnu
                                </span>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-3">
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold">
                                        🎓
                                    </div>
                                    <h4 className="font-bold text-sm text-white">Certificat & Diplôme de Fin de Cycle</h4>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Délivré avec relevé de notes officiel, validant l'acquisition des compétences pratiques et théoriques.
                                    </p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                                        ⭐
                                    </div>
                                    <h4 className="font-bold text-sm text-white">Attestations Spécialisées</h4>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Certifications modulaires reconnues par les entreprises partenaires et organisations professionnelles.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-white/10">
                                <span className="text-xs text-slate-400">Suivi rigoureux & encadrement personnalisé</span>
                                <Button onClick={onOpenInscription} size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-md">
                                    Postuler à un diplôme <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ── 3. VUE FILIÈRES & FORMATIONS ── */}
                    {activeHub === 'filieres' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-cyan-400" />
                                    <h3 className="text-sm font-black uppercase text-cyan-300 tracking-wider">
                                        Nos Filières de Formation
                                    </h3>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                                    {filieres.length || classrooms.length} Programmes
                                </span>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                                {(filieres.length > 0 ? filieres : classrooms).map((f: any, idx: number) => (
                                    <div key={f.id || idx} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="font-bold text-xs text-white">{f.nom || f.name}</h4>
                                                {f.duree_mois && (
                                                    <span className="text-[10px] text-cyan-400 font-bold">{f.duree_mois} mois</span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-400 line-clamp-2">{f.description || 'Formation complète avec cours pratiques et examens réguliers.'}</p>
                                        </div>
                                        <button onClick={onOpenInscription} className="text-[11px] text-cyan-300 hover:text-white font-bold flex items-center gap-1 pt-1">
                                            S'inscrire à cette filière <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── 4. VUE BOUTIQUE & BIBLIOTHÈQUE ── */}
                    {activeHub === 'shop' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <BookMarked className="w-5 h-5 text-teal-400" />
                                    <h3 className="text-sm font-black uppercase text-cyan-300 tracking-wider">
                                        Bibliothèque Numérique & Fournitures
                                    </h3>
                                </div>
                                <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                                    En Ligne
                                </span>
                            </div>

                            <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-950/40 to-cyan-950/30 border border-teal-500/30 space-y-3">
                                <h4 className="font-bold text-sm text-white">Livres, Manuels Scolaires & Polycopiés</h4>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    Accédez aux ouvrages recommandés par les professeurs, achetez des manuels officiels ou consultez des e-books directement sur la plateforme.
                                </p>
                                <div className="flex items-center gap-3 pt-2">
                                    <Link href={orgPath(orgSlug, 'library')}>
                                        <Button className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-teal-500/20 flex items-center gap-1.5">
                                            <BookMarked className="w-4 h-4" />
                                            Ouvrir la Bibliothèque
                                        </Button>
                                    </Link>
                                    <Link href={orgPath(orgSlug, 'login')}>
                                        <Button variant="outline" className="border-white/15 text-white hover:bg-white/5 font-bold text-xs rounded-xl">
                                            Espace Élève
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── 5. VUE AVIS & TÉMOIGNAGES ── */}
                    {activeHub === 'reviews' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                    <h3 className="text-sm font-black uppercase text-cyan-300 tracking-wider">
                                        Avis & Satisfaction de la Communauté
                                    </h3>
                                </div>
                                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                    ⭐⭐⭐⭐⭐ 4.9/5
                                </span>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-3">
                                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-xs text-white">Élève en Terminale</p>
                                        <span className="text-amber-400 text-xs">⭐⭐⭐⭐⭐</span>
                                    </div>
                                    <p className="text-[11px] text-slate-300 leading-relaxed">
                                        "L'accès direct aux bulletins, relevés et cours en ligne a grandement facilité mon suivi scolaire."
                                    </p>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-xs text-white">Parent d'élève</p>
                                        <span className="text-amber-400 text-xs">⭐⭐⭐⭐⭐</span>
                                    </div>
                                    <p className="text-[11px] text-slate-300 leading-relaxed">
                                        "Encadrement rigoureux et professeurs très disponibles. Très satisfait de l'institution."
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* ═══ Accordion Card 1: À Propos de l'Établissement ═══ */}
                <div className="rounded-3xl bg-[#0D131F]/90 border border-white/10 shadow-xl overflow-hidden">
                    <button
                        onClick={() => setOpenAbout(!openAbout)}
                        className="w-full flex items-center justify-between p-5 text-left font-black text-sm text-white hover:bg-white/5 transition"
                    >
                        <span className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-cyan-400" /> À PROPOS DE L'ÉTABLISSEMENT
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
                                    {org.about_text || `${org.name} s'engage à offrir une formation de référence basée sur l'excellence académique, la rigueur et la préparation aux métiers d'avenir.`}
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center">
                                    <div className="p-2.5 rounded-xl bg-white/5"><p className="text-base font-black text-white">{filieres.length || classrooms.length}</p><p className="text-[10px] text-slate-400">Filières</p></div>
                                    <div className="p-2.5 rounded-xl bg-white/5"><p className="text-base font-black text-cyan-400">{teacherCount > 0 ? `${teacherCount}+` : '15+'}</p><p className="text-[10px] text-slate-400">Professeurs</p></div>
                                    <div className="p-2.5 rounded-xl bg-white/5"><p className="text-base font-black text-teal-400">{studentCount > 0 ? `${studentCount}+` : '500+'}</p><p className="text-[10px] text-slate-400">Étudiants</p></div>
                                    <div className="p-2.5 rounded-xl bg-white/5"><p className="text-base font-black text-amber-400">98%</p><p className="text-[10px] text-slate-400">Réussite</p></div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ═══ Accordion Card 2: Contact & Accès ═══ */}
                <div className="rounded-3xl bg-[#0D131F]/90 border border-white/10 shadow-xl overflow-hidden">
                    <button
                        onClick={() => setOpenContact(!openContact)}
                        className="w-full flex items-center justify-between p-5 text-left font-black text-sm text-white hover:bg-white/5 transition"
                    >
                        <span className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-cyan-400" /> CONTACT & COORDONNÉES DU CAMPUS
                        </span>
                        {openContact ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    <AnimatePresence>
                        {openContact && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-5 pb-5 pt-1 border-t border-white/5 space-y-3 text-xs"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                                    <div className="p-3 rounded-xl bg-white/5 flex items-center gap-2.5">
                                        <Phone className="w-4 h-4 text-cyan-400 shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-slate-400">Téléphone</p>
                                            <p className="font-bold text-white">{org.phone || 'Non renseigné'}</p>
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/5 flex items-center gap-2.5">
                                        <Mail className="w-4 h-4 text-teal-400 shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-slate-400">Email officiel</p>
                                            <p className="font-bold text-white truncate">{org.email || 'Non renseigné'}</p>
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/5 flex items-center gap-2.5">
                                        <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-slate-400">Ville / Quartier</p>
                                            <p className="font-bold text-white">{org.city || 'Cameroun'}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* ═══ Bottom Sticky Action Bar ═══ */}
            <div className="fixed bottom-0 inset-x-0 z-40 bg-[#0A0E17]/95 backdrop-blur-2xl border-t border-cyan-500/25 p-3.5 px-6 shadow-2xl">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-black text-white uppercase tracking-wide">Commencez votre avenir</p>
                        <p className="text-[10px] text-slate-400">Inscriptions ouvertes pour l'année académique 2025/2026</p>
                    </div>
                    <Button onClick={onOpenInscription} className="h-11 px-6 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 gap-2">
                        <FileText className="w-4 h-4" />
                        <span>S'INSCRIRE MAINTENANT</span>
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
