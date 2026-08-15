'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Sparkles, BookOpen, Star, BookMarked,
    Users, Phone, Mail, MapPin, Award, CheckCircle2,
    ArrowRight, FileText, GraduationCap, ShieldCheck,
    TrendingUp, Zap, Clock, Send, ShoppingBag
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
    const [selectedTrack, setSelectedTrack] = useState<number>(0);

    return (
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-4">
            {/* ═══ Bento Box Studio Prestige Layout ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* 1. Main Master Widget (Col 7) */}
                <div className="md:col-span-7 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent border border-white/15 backdrop-blur-2xl shadow-2xl flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[100px] opacity-30" style={{ background: bc }} />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="px-3 py-1 rounded-full text-xs font-black border bg-amber-500/10 text-amber-300 border-amber-500/30 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" /> BENTO BOX STUDIO
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">• Session 2026/2027</span>
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight tracking-tight">
                            L&apos;Excellence Académique Réinventée à <span style={{ color: bc }}>{org.name}</span>
                        </h1>
                        <p className="text-sm text-slate-300 mt-3 leading-relaxed max-w-lg">
                            {org.hero_subtitle || org.about_text || 'Une formation certifiante et un accompagnement individualisé pour propulser votre carrière.'}
                        </p>
                    </div>

                    <div className="relative z-10 pt-6 flex flex-wrap items-center gap-3">
                        <a href="#inscription" onClick={onOpenInscription}>
                            <Button className="h-12 px-7 font-black rounded-2xl text-white text-xs shadow-xl" style={{ background: `linear-gradient(135deg, ${bc}, ${bc}cc)` }}>
                                <FileText className="w-4 h-4 mr-2" /> Postuler en 1 Clic
                            </Button>
                        </a>
                        <Link href={orgPath(orgSlug, 'login')}>
                            <Button variant="outline" className="h-12 px-7 border-white/15 text-white/80 hover:bg-white/5 rounded-2xl text-xs font-bold">
                                Connexion Campus
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* 2. Interactive Tracks Simulator Widget (Col 5) */}
                <div className="md:col-span-5 p-6 rounded-3xl bg-[#0F131D]/90 border border-white/15 shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                <BookOpen className="w-4 h-4 text-emerald-400" /> Filières Disponibles
                            </h3>
                            <span className="text-xs font-bold text-emerald-400">{filieres.length} filières</span>
                        </div>

                        {filieres.length > 0 ? (
                            <div className="space-y-2">
                                {filieres.slice(0, 3).map((f: any, idx: number) => (
                                    <div
                                        key={f.id}
                                        onClick={() => setSelectedTrack(idx)}
                                        className={`p-3.5 rounded-2xl border transition cursor-pointer flex justify-between items-center ${
                                            selectedTrack === idx
                                                ? 'bg-white/10 border-white/30 text-white'
                                                : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/5'
                                        }`}
                                    >
                                        <div>
                                            <p className="font-bold text-xs">{f.nom}</p>
                                            <p className="text-[10px] opacity-70">{f.duree_mois} mois de formation</p>
                                        </div>
                                        <span className="text-xs font-black text-emerald-400">
                                            {new Intl.NumberFormat('fr-FR').format(f.frais_scolarite)} XAF
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 rounded-2xl bg-white/5 text-center text-xs text-slate-500">Aucune filière configurée</div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                        <span>🎓 Taux d&apos;insertion : <strong className="text-white">96%</strong></span>
                        <a href="#programs" className="text-cyan-400 font-bold hover:underline">Voir tout →</a>
                    </div>
                </div>

                {/* 3. Live Stats & Campus Community Widget (Col 4) */}
                <div className="md:col-span-4 p-5 rounded-3xl bg-white/[0.03] border border-white/10 shadow-xl flex flex-col justify-between">
                    <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-3">Communauté</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-2xl bg-white/5 text-center">
                            <p className="text-xl font-black text-white">{studentCount}+</p>
                            <p className="text-[10px] text-slate-400">Étudiants Actifs</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/5 text-center">
                            <p className="text-xl font-black text-teal-400">{teacherCount}+</p>
                            <p className="text-[10px] text-slate-400">Professeurs</p>
                        </div>
                    </div>
                    <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" /> Diplômes nationaux & internationaux
                    </div>
                </div>

                {/* 4. Digital Campus Tour (Col 4) */}
                <div className="md:col-span-4 p-5 rounded-3xl bg-white/[0.03] border border-white/10 shadow-xl flex flex-col justify-between">
                    <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-2">Visite & Infrastructures</h3>
                    {gallery.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                            {gallery.slice(0, 2).map((img, i) => (
                                <img key={i} src={img} alt="" className="w-full aspect-[4/3] rounded-xl object-cover border border-white/10" />
                            ))}
                        </div>
                    ) : org.about_image_url ? (
                        <img src={org.about_image_url} alt="" className="w-full h-28 rounded-xl object-cover border border-white/10" />
                    ) : (
                        <div className="h-28 rounded-xl bg-white/5 flex items-center justify-center text-xs text-slate-500">Laboratoires & Salles climatisées</div>
                    )}
                    <p className="text-[11px] text-slate-400 mt-2">Campus moderne situé à {org.city || 'Cameroun'}.</p>
                </div>

                {/* 5. Direct Connect & Digital Shop Widget (Col 4) */}
                <div className="md:col-span-4 p-5 rounded-3xl bg-gradient-to-br from-indigo-950/40 to-purple-950/20 border border-indigo-500/20 shadow-xl flex flex-col justify-between space-y-3">
                    <div>
                        <span className="text-[10px] font-bold text-indigo-400 uppercase">Espaces Virtuels</span>
                        <h3 className="text-base font-bold text-white mt-1">Bibliothèque & Shop</h3>
                        <p className="text-xs text-slate-400 mt-1">Téléchargez vos cours, annales et procurez-vous les fournitures officielles.</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href={orgPath(orgSlug, 'library')} className="flex-1">
                            <Button size="sm" className="w-full text-xs h-9 bg-indigo-600 hover:bg-indigo-500 rounded-xl">Bibliothèque</Button>
                        </Link>
                        <Link href={orgPath(orgSlug, 'shop')} className="flex-1">
                            <Button size="sm" variant="outline" className="w-full text-xs h-9 border-indigo-500/30 text-indigo-300 rounded-xl">Boutique</Button>
                        </Link>
                    </div>
                </div>

            </div>
        </div>
    );
}
