'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Award, Users, Star, GraduationCap,
    Phone, Mail, MapPin, CheckCircle2, ArrowRight,
    ShoppingBag, BookMarked, Sparkles, FileText, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { orgPath } from '@/lib/custom-domain';
import { cleanMotto } from '@/lib/clean-motto';
import type { TemplateCustomConfig } from '@/components/campus/template-customizer-studio';
import { getNormalizedPrograms, getNormalizedStats, getNormalizedTestimonials } from './template-data-adapter';
import { ProgramCardSessionSelector } from './ProgramCardSessionSelector';

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

type HubTab = 'about' | 'programs' | 'gallery' | 'resources' | 'contact';

export function TemplateHubOnglets({
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
    const [activeTab, setActiveTab] = useState<HubTab>('programs');

    const cfg: TemplateCustomConfig = org.template_config || {};
    const programs = getNormalizedPrograms(filieres, classrooms, org, cfg);
    const stats = getNormalizedStats(cfg, teacherCount, studentCount);
    const testimonials = getNormalizedTestimonials(cfg);

    const brandName = cfg.trainer_name || org.name;
    const heroTitle = cfg.trainer_title || org.name;
    const heroSubtitle = cleanMotto(cfg.trainer_subtitle || org.hero_subtitle || org.motto, 'Portail officiel d\'admission et de vie académique.');
    const primaryCta = cfg.primary_cta_text || 'Inscription';
    const secondaryCta = cfg.secondary_cta_text || 'Espace élève';
    const avatarUrl = cfg.hero_image_url || org.logo_url;

    const stat1Val = cfg.stat1_value || String(filieres.length || 0);
    const stat1Lbl = cfg.stat1_label || 'Filières';
    const stat2Val = cfg.stat2_value || String(classrooms.length || 0);
    const stat2Lbl = cfg.stat2_label || 'Classes';
    const stat3Val = cfg.stat3_value || `${teacherCount}+`;
    const stat3Lbl = cfg.stat3_label || 'Enseignants';
    const stat4Val = cfg.stat4_value || `${studentCount}+`;
    const stat4Lbl = cfg.stat4_label || 'Étudiants';

    const tabs = [
        { id: 'programs' as HubTab, label: 'Formations & Classes', icon: BookOpen, count: filieres.length || classrooms.length },
        { id: 'about' as HubTab, label: 'À Propos', icon: Award },
        { id: 'gallery' as HubTab, label: 'Galerie Photos', icon: Star, count: gallery.length },
        { id: 'resources' as HubTab, label: 'Boutique & Livres', icon: ShoppingBag },
        { id: 'contact' as HubTab, label: 'Contact & Accès', icon: MapPin },
    ];

    return (
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8">
            {/* ═══ Header de l'école ═══ */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-2xl mb-8">
                <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={brandName}
                            data-editable-field="hero_image_url"
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover bg-white/10 p-1 border border-white/15 shrink-0"
                        />
                    ) : (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center border border-white/15 shrink-0" style={{ background: `linear-gradient(135deg, ${bc}50, ${bc}20)` }}>
                            <GraduationCap className="w-10 h-10" style={{ color: bc }} />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border mb-2" style={{ backgroundColor: `${bc}15`, borderColor: `${bc}30`, color: bc }}>
                            <Sparkles className="w-3.5 h-3.5" />
                            {org.type?.toUpperCase() || 'ÉTABLISSEMENT'} • {org.city || 'Cameroun'}
                        </div>
                        <h1 data-editable-field="trainer_title" className="text-2xl sm:text-4xl font-black text-white truncate">{heroTitle}</h1>
                        <p data-editable-field="trainer_subtitle" className="text-sm text-slate-400 mt-1 max-w-xl">{heroSubtitle}</p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                        <a href="#inscription" onClick={onOpenInscription}>
                            <Button data-editable-field="primary_cta_text" className="w-full sm:w-auto font-black rounded-xl text-white shadow-lg text-xs h-11 px-6" style={{ background: `linear-gradient(135deg, ${bc}, ${bc}cc)` }}>
                                <FileText className="w-4 h-4 mr-2" />
                                {primaryCta}
                            </Button>
                        </a>
                        <Link href={orgPath(orgSlug, 'login')}>
                            <Button data-editable-field="secondary_cta_text" variant="outline" className="w-full sm:w-auto border-white/15 text-white/80 hover:bg-white/5 rounded-xl text-xs h-11 px-6">
                                {secondaryCta}
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Mini bar de statistiques rapides */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6 pt-6 border-t border-white/10">
                    <div data-editable-field="stat1_value" className="p-3 rounded-xl bg-white/[0.02] text-center"><p className="text-xl font-black text-white">{stat1Val}</p><p className="text-[11px] text-slate-500">{stat1Lbl}</p></div>
                    <div data-editable-field="stat2_value" className="p-3 rounded-xl bg-white/[0.02] text-center"><p className="text-xl font-black text-white">{stat2Val}</p><p className="text-[11px] text-slate-500">{stat2Lbl}</p></div>
                    <div data-editable-field="stat3_value" className="p-3 rounded-xl bg-white/[0.02] text-center"><p className="text-xl font-black text-white">{stat3Val}</p><p className="text-[11px] text-slate-500">{stat3Lbl}</p></div>
                    <div data-editable-field="stat4_value" className="p-3 rounded-xl bg-white/[0.02] text-center"><p className="text-xl font-black text-white">{stat4Val}</p><p className="text-[11px] text-slate-500">{stat4Lbl}</p></div>
                </div>
            </div>

            {/* ═══ Onglets de Navigation Compacts (Zero scroll) ═══ */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 mb-6 overflow-x-auto scrollbar-none">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                            activeTab === t.id
                                ? 'bg-white text-slate-900 shadow-md font-extrabold'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <t.icon className="w-3.5 h-3.5" />
                        {t.label}
                        {t.count !== undefined && (
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === t.id ? 'bg-slate-900/10 text-slate-900' : 'bg-white/10 text-slate-400'}`}>
                                {t.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ═══ Conteneur de Contenu Actif ═══ */}
            <AnimatePresence mode="wait">
                {activeTab === 'programs' && (
                    <motion.div key="programs" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {programs.map((f: any, idx: number) => (
                                <div key={f.id || idx} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition group flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-3 gap-2">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${f.couleur || bc}20` }}>
                                                <BookOpen className="w-5 h-5" style={{ color: f.couleur || bc }} />
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                {f.promo_badge && (
                                                    <span
                                                        data-editable-field={`program_${idx}_promo`}
                                                        className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-pointer"
                                                    >
                                                        {f.promo_badge}
                                                    </span>
                                                )}
                                                <span
                                                    data-editable-field={`program_${idx}_duree`}
                                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 cursor-pointer"
                                                >
                                                    ⏱️ {f.duree_texte}
                                                </span>
                                            </div>
                                        </div>
                                        <h3
                                            data-editable-field={`program_${idx}_nom`}
                                            className="font-bold text-white text-base mb-1 cursor-pointer hover:text-cyan-300 transition-colors"
                                        >
                                            {f.nom}
                                        </h3>
                                        <p
                                            data-editable-field={`program_${idx}_description`}
                                            className="text-xs text-slate-400 line-clamp-2 mb-4 cursor-pointer"
                                        >
                                            {f.description}
                                        </p>
                                    </div>

                                    <div className="pt-3 border-t border-white/10">
                                        <ProgramCardSessionSelector
                                            program={f}
                                            brandColor={f.couleur || bc || '#06B6D4'}
                                            onOpenInscription={onOpenInscription}
                                            showPoster={true}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {classrooms.length > 0 && (
                            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10">
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Classes ouvertes :</h4>
                                <div className="flex flex-wrap gap-2">
                                    {classrooms.map((c: any) => (
                                        <span key={c.id} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-slate-300">
                                            {c.name} {c.cycle && <span className="opacity-50">({c.cycle})</span>}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'about' && (
                    <motion.div key="about" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Award className="w-5 h-5 text-amber-400" />
                                <span data-editable-field="about_title">{cfg.about_title || 'Notre Histoire & Vision'}</span>
                            </h3>
                            <p data-editable-field="about_text" className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                                {cfg.about_text || org.about_text || `${brandName} forme les leaders de demain dans un cadre d'excellence pédagogique avec un corps professoral hautement qualifié.`}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs text-slate-300">
                                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Suivi personnalisé</div>
                                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Corps qualifié</div>
                                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Diplômes reconnus</div>
                                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Campus connecté</div>
                            </div>
                        </div>
                        {(cfg.about_image_url || org.about_image_url) ? (
                            <img
                                src={cfg.about_image_url || org.about_image_url}
                                alt="À propos"
                                data-editable-field="about_image_url"
                                className="w-full h-48 sm:h-72 rounded-2xl object-cover border border-white/10 shadow-xl"
                            />
                        ) : (
                            <div data-editable-field="about_image_url" className="w-full h-48 sm:h-72 rounded-2xl border border-white/10 bg-white/[0.02] flex flex-col items-center justify-center p-6 text-center">
                                <GraduationCap className="w-12 h-12 text-slate-600 mb-2" />
                                <p className="text-sm font-semibold text-slate-400">Excellence & Discipline</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'gallery' && (
                    <motion.div key="gallery" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                        {gallery.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {gallery.map((img: string, i: number) => (
                                    <img key={i} src={img} alt="Campus" className="w-full aspect-[4/3] rounded-xl object-cover border border-white/10 hover:scale-[1.02] transition" />
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-slate-500 text-sm">
                                Aucune photo ajoutée à la galerie pour le moment.
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'resources' && (
                    <motion.div key="resources" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="grid sm:grid-cols-2 gap-4">
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-teal-950/20 border border-emerald-500/20 space-y-3">
                            <BookMarked className="w-8 h-8 text-emerald-400" />
                            <h3 data-editable-field="book_title" className="font-bold text-white text-base">{cfg.book_title || 'Bibliothèque Numérique'}</h3>
                            <p data-editable-field="book_desc" className="text-xs text-slate-400">{cfg.book_desc || 'Accédez aux manuels scolaires, annales et documents de cours partagés par l\'établissement.'}</p>
                            <Link href={orgPath(orgSlug, 'library')}>
                                <Button size="sm" variant="outline" className="text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10">
                                    Explorer les livres <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                </Button>
                            </Link>
                        </div>
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-teal-950/30 to-cyan-950/20 border border-teal-500/20 space-y-3">
                            <ShoppingBag className="w-8 h-8 text-teal-400" />
                            <h3 data-editable-field="podcast_title" className="font-bold text-white text-base">{cfg.podcast_title || 'Marketplace Scolaire'}</h3>
                            <p data-editable-field="podcast_desc" className="text-xs text-slate-400">{cfg.podcast_desc || 'Achetez et échangez vos fournitures, uniformes et matériels pédagogiques certifiés.'}</p>
                            <Link href={orgPath(orgSlug, 'shop')}>
                                <Button size="sm" variant="outline" className="text-xs border-teal-500/30 text-teal-300 hover:bg-teal-500/10">
                                    Visiter la boutique <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'contact' && (
                    <motion.div key="contact" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                        <h3 className="text-base font-bold text-white flex items-center gap-2"><Phone className="w-4 h-4 text-indigo-400" /> Nous Contacter</h3>
                        <div className="grid sm:grid-cols-3 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5"><span className="text-slate-500 block mb-1">Téléphone</span><span className="font-bold text-white">{org.phone || 'Non renseigné'}</span></div>
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5"><span className="text-slate-500 block mb-1">Email</span><span className="font-bold text-white">{org.email || 'Non renseigné'}</span></div>
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5"><span className="text-slate-500 block mb-1">Localisation</span><span className="font-bold text-white">{[org.quarter, org.city, org.country].filter(Boolean).join(', ')}</span></div>
                        </div>
                        {org.whatsapp && (
                            <a href={`https://wa.me/${org.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-600/30 transition">
                                <Send className="w-3.5 h-3.5" /> Discuter directement sur WhatsApp
                            </a>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
