'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, BookOpen, Star, BookMarked,
    Users, Phone, Mail, MapPin, X, ArrowRight,
    FileText, GraduationCap, ShieldCheck, Heart
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

type ShowcaseCard = 'vision' | 'programs' | 'gallery' | 'library' | 'contact' | null;

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

    return (
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 pb-28">
            {/* ═══ Top Intro ═══ */}
            <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black border" style={{ backgroundColor: `${bc}18`, borderColor: `${bc}40`, color: bc }}>
                    <Sparkles className="w-3.5 h-3.5" />
                    PORTAIL PRESTIGE VITRÉ
                </div>
                <h1 className="text-3xl sm:text-6xl font-black text-white leading-tight tracking-tight">
                    Forger les Leaders de Demain à <span style={{ color: bc }}>{org.name}</span>
                </h1>
                <p className="text-sm sm:text-base text-slate-300">
                    Une éducation d&apos;exception, un avenir sans limites.
                </p>
            </div>

            {/* ═══ 5 Cartes Vitrées Interactives en Rangée Fluide ═══ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {/* 1. Vision */}
                <div
                    onClick={() => setOpenCard('vision')}
                    className="p-5 rounded-3xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-cyan-400/40 backdrop-blur-xl transition-all cursor-pointer flex flex-col justify-between group h-64 shadow-xl"
                >
                    <div>
                        <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 flex items-center justify-center mb-3 text-cyan-300">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-wider block mb-1">Vision & Histoire</span>
                        <h3 className="text-base font-black text-white leading-snug group-hover:text-cyan-300 transition">Notre Ambition d&apos;Excellence</h3>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1.5">Tradition académique et méthodes pédagogiques modernes.</p>
                    </div>
                    <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1">En savoir plus <ArrowRight className="w-3 h-3" /></span>
                </div>

                {/* 2. Formations */}
                <div
                    onClick={() => setOpenCard('programs')}
                    className="p-5 rounded-3xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-emerald-400/40 backdrop-blur-xl transition-all cursor-pointer flex flex-col justify-between group h-64 shadow-xl"
                >
                    <div>
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center mb-3 text-emerald-300">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block mb-1">{filieres.length} Formations</span>
                        <h3 className="text-base font-black text-white leading-snug group-hover:text-emerald-300 transition">Cursus Phares</h3>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1.5">Des filières adaptées aux exigences du marché de l&apos;emploi.</p>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">Explorer <ArrowRight className="w-3 h-3" /></span>
                </div>

                {/* 3. Galerie */}
                <div
                    onClick={() => setOpenCard('gallery')}
                    className="p-5 rounded-3xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-amber-400/40 backdrop-blur-xl transition-all cursor-pointer flex flex-col justify-between group h-64 shadow-xl"
                >
                    <div>
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center mb-3 text-amber-300">
                            <Star className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block mb-1">Visite Virtuelle</span>
                        <h3 className="text-base font-black text-white leading-snug group-hover:text-amber-300 transition">Immersion Visuelle</h3>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1.5">Découvrez les infrastructures et la vie de campus.</p>
                    </div>
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">Voir les photos <ArrowRight className="w-3 h-3" /></span>
                </div>

                {/* 4. Bibliothèque */}
                <div
                    onClick={() => setOpenCard('library')}
                    className="p-5 rounded-3xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-indigo-400/40 backdrop-blur-xl transition-all cursor-pointer flex flex-col justify-between group h-64 shadow-xl"
                >
                    <div>
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 flex items-center justify-center mb-3 text-indigo-300">
                            <BookMarked className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider block mb-1">Ressources</span>
                        <h3 className="text-base font-black text-white leading-snug group-hover:text-indigo-300 transition">Bibliothèque & Shop</h3>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1.5">Manuels scolaires, boutique uniforme et annales.</p>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-400 flex items-center gap-1">Accéder <ArrowRight className="w-3 h-3" /></span>
                </div>

                {/* 5. Contact */}
                <div
                    onClick={() => setOpenCard('contact')}
                    className="p-5 rounded-3xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-rose-400/40 backdrop-blur-xl transition-all cursor-pointer flex flex-col justify-between group h-64 shadow-xl"
                >
                    <div>
                        <div className="w-10 h-10 rounded-2xl bg-rose-500/15 flex items-center justify-center mb-3 text-rose-300">
                            <Phone className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-wider block mb-1">Support</span>
                        <h3 className="text-base font-black text-white leading-snug group-hover:text-rose-300 transition">Contact & Accès</h3>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1.5">{org.city || 'Cameroun'} • Direct WhatsApp</p>
                    </div>
                    <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">Contacter <ArrowRight className="w-3 h-3" /></span>
                </div>
            </div>

            {/* ═══ Dock Flottant de Navigation (Sticky Bottom) ═══ */}
            <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-2 p-2 rounded-2xl bg-[#0F131D]/90 backdrop-blur-2xl border border-white/15 shadow-2xl">
                    <button
                        onClick={() => setOpenCard('programs')}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition"
                    >
                        📚 Formations
                    </button>
                    <button
                        onClick={() => setOpenCard('gallery')}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition hidden sm:inline-flex"
                    >
                        📸 Galerie
                    </button>
                    <a href="#inscription" onClick={onOpenInscription}>
                        <Button className="h-10 px-5 rounded-xl font-black text-white text-xs shadow-lg shadow-teal-500/25" style={{ background: `linear-gradient(135deg, ${bc}, ${bc}cc)` }}>
                            <FileText className="w-4 h-4 mr-1.5" /> S&apos;inscrire maintenant ⭐
                        </Button>
                    </a>
                </div>
            </div>

            {/* ═══ Modale Interactive Flottante ═══ */}
            <AnimatePresence>
                {openCard && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#0F131D] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
                            <button onClick={() => setOpenCard(null)} className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>

                            {openCard === 'vision' && (
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-black text-white">Notre Histoire & Vision</h3>
                                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                                        {org.about_text || `${org.name} s'engage à offrir un cadre d'apprentissage rigoureux et bienveillant à ${org.city}, ${org.country}.`}
                                    </p>
                                    {org.about_image_url && <img src={org.about_image_url} alt="" className="w-full h-56 rounded-2xl object-cover border border-white/10" />}
                                </div>
                            )}

                            {openCard === 'programs' && (
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-black text-white">Nos Formations & Programmes</h3>
                                    <div className="grid gap-3">
                                        {filieres.map((f: any) => (
                                            <div key={f.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-bold text-white text-sm">{f.nom}</h4>
                                                    <p className="text-xs text-slate-400">{f.duree_mois} mois • {f.description || 'Formation certifiée'}</p>
                                                </div>
                                                <span className="font-black text-emerald-400 text-sm">{new Intl.NumberFormat('fr-FR').format(f.frais_scolarite)} XAF</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {openCard === 'gallery' && (
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-black text-white">Galerie Photos du Campus</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {gallery.map((img, i) => (
                                            <img key={i} src={img} alt="" className="w-full aspect-[4/3] rounded-2xl object-cover border border-white/10" />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {openCard === 'library' && (
                                <div className="space-y-4 text-center py-4">
                                    <BookMarked className="w-12 h-12 text-indigo-400 mx-auto" />
                                    <h3 className="text-xl font-bold text-white">Espaces Numériques & Boutique</h3>
                                    <p className="text-xs text-slate-400 max-w-md mx-auto">Explorez notre bibliothèque de cours numériques et notre boutique officielle pour uniformes et manuels.</p>
                                    <div className="flex gap-3 justify-center pt-2">
                                        <Link href={orgPath(orgSlug, 'library')}><Button size="sm">Bibliothèque</Button></Link>
                                        <Link href={orgPath(orgSlug, 'shop')}><Button size="sm" variant="outline">Marketplace</Button></Link>
                                    </div>
                                </div>
                            )}

                            {openCard === 'contact' && (
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-black text-white">Contact Direct</h3>
                                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                                        <div className="p-4 rounded-xl bg-white/5"><span className="text-slate-500 block mb-1">Téléphone</span><span className="font-bold text-white">{org.phone}</span></div>
                                        <div className="p-4 rounded-xl bg-white/5"><span className="text-slate-500 block mb-1">Email</span><span className="font-bold text-white">{org.email}</span></div>
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
