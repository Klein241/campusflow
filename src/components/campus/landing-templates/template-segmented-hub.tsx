'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, BookOpen, Award, Star, ShoppingBag,
    MapPin, Sparkles, GraduationCap, ChevronRight,
    CheckCircle2, ArrowRight, FileText, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

type Segment = 'all' | 'about' | 'programs' | 'gallery' | 'contact';

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
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSegment, setActiveSegment] = useState<Segment>('programs');

    // Filter filieres based on search
    const filteredFilieres = useMemo(() => {
        if (!searchQuery.trim()) return filieres;
        const q = searchQuery.toLowerCase();
        return filieres.filter(f => f.nom?.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q));
    }, [filieres, searchQuery]);

    const segments = [
        { id: 'programs' as Segment, label: '📚 Formations & Filières', count: filieres.length },
        { id: 'about' as Segment, label: '✨ À Propos' },
        { id: 'gallery' as Segment, label: '📸 Galerie 3D', count: gallery.length },
        { id: 'contact' as Segment, label: '📞 Contact & WhatsApp' },
    ];

    return (
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8">
            {/* ═══ Top Search & Hero Segment ═══ */}
            <div className="text-center py-6 max-w-2xl mx-auto space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border" style={{ backgroundColor: `${bc}15`, borderColor: `${bc}30`, color: bc }}>
                    <Sparkles className="w-3.5 h-3.5" />
                    Hub Académique Interactif
                </div>
                <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">
                    Explorez le Futur de l&apos;Éducation à <span style={{ color: bc }}>{org.name}</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                    Trouvez instantanément votre chemin vers l&apos;excellence académique et professionnelle.
                </p>

                {/* Live Search Bar */}
                <div className="relative max-w-lg mx-auto">
                    <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <Input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Rechercher une formation, classe, matière..."
                        className="h-12 pl-11 pr-4 rounded-2xl bg-white/[0.05] border-white/15 text-white text-xs sm:text-sm focus:border-cyan-400 shadow-xl"
                    />
                </div>
            </div>

            {/* ═══ Segmented Pill Navigation ═══ */}
            <div className="sticky top-20 z-30 flex items-center justify-center gap-2 py-3 backdrop-blur-md mb-6 overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#0F131D]/90 border border-white/15 shadow-2xl">
                    {segments.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setActiveSegment(s.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                activeSegment === s.id
                                    ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-teal-500/25'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {s.label}
                            {s.count !== undefined && (
                                <span className="ml-1.5 text-[10px] opacity-75">({s.count})</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ═══ Conteneur Principal Segmenté ═══ */}
            <AnimatePresence mode="wait">
                {activeSegment === 'programs' && (
                    <motion.div key="programs" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-4">
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredFilieres.map((f: any) => (
                                <div key={f.id} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/30 transition group flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${f.couleur || bc}20` }}>
                                                <BookOpen className="w-5 h-5" style={{ color: f.couleur || bc }} />
                                            </div>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10 text-slate-300">{f.duree_mois} mois</span>
                                        </div>
                                        <h3 className="font-bold text-white text-base mb-1">{f.nom}</h3>
                                        <p className="text-xs text-slate-400 line-clamp-3 mb-4">{f.description || 'Formation complète axée sur la pratique et l\'insertion professionnelle.'}</p>
                                    </div>
                                    <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                                        <span className="text-xs font-black text-emerald-400">{new Intl.NumberFormat('fr-FR').format(f.frais_scolarite)} XAF</span>
                                        <a href="#inscription" onClick={onOpenInscription} className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1">
                                            Postuler <ChevronRight className="w-3.5 h-3.5" />
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredFilieres.length === 0 && (
                            <div className="p-10 rounded-2xl bg-white/[0.02] border border-white/10 text-center text-slate-400 text-sm">
                                Aucun programme trouvé pour &quot;{searchQuery}&quot;.
                            </div>
                        )}
                    </motion.div>
                )}

                {activeSegment === 'about' && (
                    <motion.div key="about" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/10 space-y-6">
                        <div className="grid lg:grid-cols-2 gap-8 items-center">
                            <div className="space-y-4">
                                <h3 className="text-2xl font-black text-white">Qui sommes-nous ?</h3>
                                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                                    {org.about_text || `${org.name} est un centre d'excellence dédié à l'enseignement de haute qualité à ${org.city}, ${org.country}.`}
                                </p>
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div className="p-3 rounded-xl bg-white/5"><p className="text-lg font-black text-white">{studentCount}+</p><p className="text-[11px] text-slate-400">Étudiants formés</p></div>
                                    <div className="p-3 rounded-xl bg-white/5"><p className="text-lg font-black text-white">{teacherCount}+</p><p className="text-[11px] text-slate-400">Professeurs experts</p></div>
                                </div>
                            </div>
                            {org.about_image_url && (
                                <img src={org.about_image_url} alt="À propos" className="w-full h-64 rounded-2xl object-cover border border-white/10" />
                            )}
                        </div>
                    </motion.div>
                )}

                {activeSegment === 'gallery' && (
                    <motion.div key="gallery" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
                        {gallery.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {gallery.map((img: string, i: number) => (
                                    <img key={i} src={img} alt="Campus" className="w-full aspect-square rounded-2xl object-cover border border-white/10 hover:border-cyan-400 transition" />
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 text-center text-slate-500 text-sm">
                                Galerie en cours de mise à jour.
                            </div>
                        )}
                    </motion.div>
                )}

                {activeSegment === 'contact' && (
                    <motion.div key="contact" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
                        <h3 className="text-lg font-bold text-white">Coordonnées officielles</h3>
                        <div className="grid sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-4 rounded-xl bg-white/5"><span className="text-slate-500 block mb-1">Téléphone</span><span className="font-bold text-white text-sm">{org.phone || 'Non renseigné'}</span></div>
                            <div className="p-4 rounded-xl bg-white/5"><span className="text-slate-500 block mb-1">Email</span><span className="font-bold text-white text-sm">{org.email || 'Non renseigné'}</span></div>
                        </div>
                        {org.whatsapp && (
                            <a href={`https://wa.me/${org.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-600/30 transition">
                                <Send className="w-4 h-4" /> Poser vos questions sur WhatsApp
                            </a>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
