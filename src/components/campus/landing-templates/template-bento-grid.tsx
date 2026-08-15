'use client';

import { motion } from 'framer-motion';
import {
    Sparkles, BookOpen, Star, BookMarked,
    Users, Phone, Mail, MapPin, Award, CheckCircle2,
    ArrowRight, FileText, GraduationCap, ShieldCheck
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
    return (
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-4">
            {/* ═══ Bento Grid Mosaïque Moderne ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* 1. Hero Block (Col 8) */}
                <div className="md:col-span-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black border mb-4" style={{ backgroundColor: `${bc}18`, borderColor: `${bc}35`, color: bc }}>
                            <Sparkles className="w-3.5 h-3.5" /> BENTO GRID PRESTIGE
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                            Excellence & Vision Mondiale à <span style={{ color: bc }}>{org.name}</span>
                        </h1>
                        <p className="text-sm text-slate-300 mt-2 max-w-lg leading-relaxed">
                            {org.about_text || 'Une formation académique certifiée orientée vers l\'innovation et l\'insertion professionnelle.'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-6">
                        <a href="#inscription" onClick={onOpenInscription}>
                            <Button className="h-11 px-6 font-bold rounded-xl text-white text-xs shadow-lg" style={{ background: `linear-gradient(135deg, ${bc}, ${bc}cc)` }}>
                                <FileText className="w-4 h-4 mr-2" /> Demande d&apos;admission
                            </Button>
                        </a>
                        <Link href={orgPath(orgSlug, 'login')}>
                            <Button variant="outline" className="h-11 px-6 border-white/15 text-white/80 hover:bg-white/5 rounded-xl text-xs">
                                Espace élève
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* 2. Stats Block (Col 4) */}
                <div className="md:col-span-4 p-6 rounded-3xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-3 shadow-xl">
                    <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Chiffres Clés</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-2xl bg-white/5"><p className="text-2xl font-black text-white">{filieres.length}</p><p className="text-[10px] text-slate-400">Filières</p></div>
                        <div className="p-3 rounded-2xl bg-white/5"><p className="text-2xl font-black text-emerald-400">{studentCount}+</p><p className="text-[10px] text-slate-400">Étudiants</p></div>
                        <div className="p-3 rounded-2xl bg-white/5"><p className="text-2xl font-black text-teal-400">{teacherCount}+</p><p className="text-[10px] text-slate-400">Enseignants</p></div>
                        <div className="p-3 rounded-2xl bg-white/5"><p className="text-2xl font-black text-amber-400">98%</p><p className="text-[10px] text-slate-400">Réussite</p></div>
                    </div>
                </div>

                {/* 3. Formations Showcase (Col 6) */}
                <div className="md:col-span-6 p-6 rounded-3xl bg-white/[0.03] border border-white/10 shadow-xl space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-base font-bold text-white flex items-center gap-2"><BookOpen className="w-4 h-4 text-emerald-400" /> Formations Phares</h3>
                        <span className="text-xs text-slate-500">{filieres.length} disponibles</span>
                    </div>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {filieres.slice(0, 4).map((f: any) => (
                            <div key={f.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-white text-xs">{f.nom}</p>
                                    <p className="text-[10px] text-slate-400">{f.duree_mois} mois</p>
                                </div>
                                <span className="text-xs font-black text-emerald-400">{new Intl.NumberFormat('fr-FR').format(f.frais_scolarite)} XAF</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. Photo Reel Card (Col 6) */}
                <div className="md:col-span-6 p-6 rounded-3xl bg-white/[0.03] border border-white/10 shadow-xl space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-base font-bold text-white flex items-center gap-2"><Star className="w-4 h-4 text-amber-400" /> Vie de Campus</h3>
                    </div>
                    {gallery.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                            {gallery.slice(0, 3).map((img, i) => (
                                <img key={i} src={img} alt="" className="w-full aspect-square rounded-xl object-cover border border-white/10" />
                            ))}
                        </div>
                    ) : org.about_image_url ? (
                        <img src={org.about_image_url} alt="" className="w-full h-36 rounded-xl object-cover border border-white/10" />
                    ) : (
                        <div className="h-36 rounded-xl bg-white/5 flex items-center justify-center text-xs text-slate-500">Campus moderne et connecté</div>
                    )}
                </div>
            </div>
        </div>
    );
}
