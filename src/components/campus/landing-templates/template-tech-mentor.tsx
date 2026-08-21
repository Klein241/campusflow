'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowRight, Zap, Shield, Cpu, Star,
    Code2, Globe, BrainCircuit, Layers3, ChevronRight, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { orgPath } from '@/lib/custom-domain';
import type { TemplateCustomConfig } from '@/components/campus/template-customizer-modal';

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

export function TemplateTechMentor({
    org, orgSlug, classrooms, filieres, teacherCount, studentCount, gallery, bc, onOpenInscription
}: TemplateProps) {
    const cfg: TemplateCustomConfig = org.template_config || {};

    const trainerName = cfg.trainer_name || org.name || 'Jenna Dev';
    const trainerTitle = cfg.trainer_title || org.motto || 'Développeuse Full-Stack, Architecte Cloud & Tech Mentor';
    const trainerSubtitle = cfg.trainer_subtitle || org.hero_subtitle || 'Maîtrisez le code, construisez des systèmes à l\'échelle mondiale.';
    const trainerBio = cfg.trainer_bio || org.about_text || 'Académie tech de haut niveau dédiée aux développeurs, ingénieurs et architectes de demain.';

    const heroImage = cfg.trainer_photo_url || org.hero_image_url || org.about_image_url || (gallery && gallery[0]) || 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1000&auto=format&fit=crop&q=80';
    const pressLogos = (cfg.press_logos_text || 'GitHub, Cloudflare, Vercel, Supabase, Google Cloud').split(',').map(s => s.trim());

    const programs = (filieres && filieres.length > 0)
        ? filieres
        : (classrooms && classrooms.length > 0)
            ? classrooms.map((c, i) => ({
                id: c.id || `c_${i}`,
                nom: c.name,
                description: `Cursus intensif niveau ${c.level || 'Senior'}. Projets réels en production, mentorat live.`,
                duree_mois: 6,
                frais_scolarite: 300000,
                icon: i % 3 === 0 ? Code2 : i % 3 === 1 ? BrainCircuit : Globe,
            }))
            : [
                { id: '1', nom: 'Fullstack Web & Cloud Engineering', description: 'Next.js, React, Node.js, Cloudflare Workers & bases de données en temps réel.', duree_mois: 6, frais_scolarite: 300000, icon: Code2 },
                { id: '2', nom: 'Architecture Microservices & DevOps', description: 'CI/CD, conteneurs Docker, pipelines automatisés et déploiements en continu.', duree_mois: 4, frais_scolarite: 280000, icon: Layers3 },
                { id: '3', nom: 'IA Générative & Agents LLM Autonomes', description: 'Protocole MCP, intégration d\'agents IA, fine-tuning et automatisation de workflows.', duree_mois: 5, frais_scolarite: 380000, icon: BrainCircuit },
            ];

    const techStack = ['React', 'Next.js', 'TypeScript', 'Node.js', 'Supabase', 'Cloudflare', 'Docker', 'Python', 'TailwindCSS', 'OpenAI', 'PostgreSQL', 'Git'];

    return (
        <div className="min-h-screen bg-[#050912] text-white font-mono antialiased overflow-x-hidden selection:bg-blue-500/30">
            {/* Animated Grid Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0" style={{
                    backgroundImage: 'linear-gradient(rgba(30,64,175,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(30,64,175,0.08) 1px, transparent 1px)',
                    backgroundSize: '60px 60px'
                }} />
                <div className="absolute top-[-20%] right-[-10%] w-[70vw] h-[70vw] max-w-[800px] max-h-[800px] bg-blue-600/8 rounded-full blur-[200px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-cyan-500/6 rounded-full blur-[160px]" />
            </div>

            {/* ═══ Header Cyber Style ═══ */}
            <header className="relative z-30 max-w-7xl mx-auto px-4 sm:px-8 py-6">
                <div className="flex items-center justify-between p-3 px-6 rounded-xl bg-white/[0.03] backdrop-blur-2xl border border-blue-500/20 shadow-xl shadow-blue-500/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-black text-sm tracking-tight text-white font-sans uppercase">
                            {trainerName}
                        </span>
                        <span className="hidden sm:inline-flex text-[10px] text-blue-400 font-bold border border-blue-400/30 px-2 py-0.5 rounded font-mono">
                            {org.type || 'TECH ACADEMY'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href={orgPath(orgSlug, 'login')}>
                            <Button variant="ghost" className="text-xs text-slate-400 hover:text-white rounded-lg hidden sm:flex font-mono">
                                <Lock className="w-3 h-3 mr-1.5" />
                                Espace Étudiant
                            </Button>
                        </Link>
                        <Button
                            onClick={onOpenInscription}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-lg px-5 h-9 shadow-lg shadow-blue-500/30"
                        >
                            Rejoindre la Formation
                        </Button>
                    </div>
                </div>
            </header>

            {/* ═══ Hero Section Cyber ═══ */}
            <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pt-12 pb-24">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8">
                        {/* Status Badge */}
                        <div className="flex items-center gap-3 text-xs font-mono">
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                INSCRIPTIONS OUVERTES
                            </span>
                            <span className="text-slate-500 hidden sm:block">{org.city || 'Campus Connecté'} · {org.country || 'Cameroun'}</span>
                        </div>

                        <div className="space-y-4">
                            <p className="text-blue-400 text-sm font-bold tracking-widest uppercase font-mono">
                                {'>'} {trainerTitle}
                            </p>
                            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-sans leading-[1.0] tracking-tighter">
                                {trainerSubtitle.split(',')[0]}&nbsp;
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                                    {trainerSubtitle.split(',').slice(1).join(',') || 'à l\'échelle.'}
                                </span>
                            </h1>
                        </div>

                        <p className="text-slate-400 text-sm leading-relaxed max-w-lg font-sans">
                            {trainerBio}
                        </p>

                        {/* Stat Grid */}
                        <div className="grid grid-cols-3 gap-3">
                            {cfg.show_student_count !== false && (
                                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                                    <p className="text-2xl font-black text-blue-400">{cfg.student_count_override || studentCount || '1K'}+</p>
                                    <p className="text-[10px] text-slate-500 font-mono mt-1">DIPLÔMÉS</p>
                                </div>
                            )}
                            {cfg.show_years_experience !== false && (
                                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                                    <p className="text-2xl font-black text-cyan-400">{cfg.years_experience_value || '8'}+</p>
                                    <p className="text-[10px] text-slate-500 font-mono mt-1">ANNÉES EXP.</p>
                                </div>
                            )}
                            {cfg.show_rating_stars !== false && (
                                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                                    <p className="text-2xl font-black text-amber-400">5.0★</p>
                                    <p className="text-[10px] text-slate-500 font-mono mt-1">NOTE MÈNTORS</p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                onClick={onOpenInscription}
                                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-xs px-8 h-12 rounded-xl shadow-2xl shadow-blue-500/25 flex items-center gap-2 font-sans"
                            >
                                Accéder à la Formation
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Photo Hero Cyber with Sphere Rings */}
                    <div className="relative flex justify-center lg:justify-end">
                        <div className="relative">
                            {/* Concentric rings */}
                            <div className="absolute inset-[-20%] rounded-full border border-blue-500/15 animate-spin" style={{ animationDuration: '20s' }} />
                            <div className="absolute inset-[-35%] rounded-full border border-cyan-500/10" style={{ animation: 'spin 35s linear infinite reverse' }} />

                            <div className="relative w-72 sm:w-96 aspect-square rounded-full overflow-hidden border-2 border-blue-500/30 shadow-2xl shadow-blue-500/20">
                                <img
                                    src={heroImage}
                                    alt={trainerName}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#050912]/60 via-transparent to-transparent" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ Tech Stack Scrolling Bar ═══ */}
            {cfg.show_press_logos !== false && (
                <div className="relative z-10 border-t border-b border-white/5 py-5 bg-white/[0.01] overflow-hidden">
                    <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center gap-3 overflow-x-auto scrollbar-none">
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest shrink-0 font-mono">STACK TECH</span>
                        <div className="flex items-center gap-6 overflow-x-auto">
                            {pressLogos.map((tech, i) => (
                                <span key={i} className="text-sm font-black text-slate-600 hover:text-blue-400 transition font-mono shrink-0 uppercase tracking-widest">
                                    {tech}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Programmes & Certifications ═══ */}
            <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-24">
                <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <p className="text-blue-400 text-xs font-mono mb-2 uppercase tracking-widest">{'>'} PARCOURS CERTIFIANTS</p>
                        <h2 className="text-3xl sm:text-5xl font-black font-sans">
                            Spécialisations & Bootcamps
                        </h2>
                    </div>
                    <Button
                        onClick={onOpenInscription}
                        variant="outline"
                        className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs font-mono rounded-lg shrink-0"
                    >
                        Voir tous les cursus →
                    </Button>
                </div>

                <div className="grid md:grid-cols-3 gap-5">
                    {programs.map((p: any, idx: number) => {
                        const IconComp = p.icon || Code2;
                        return (
                            <div
                                key={p.id || idx}
                                className="p-7 rounded-2xl bg-[#0C1120] border border-white/5 hover:border-blue-500/30 transition group flex flex-col justify-between space-y-6"
                            >
                                <div className="space-y-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                        <IconComp className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold font-mono text-blue-400 uppercase tracking-wider">
                                            {p.duree_mois ? `${p.duree_mois} MOIS` : 'BOOTCAMP'}
                                        </span>
                                        <h3 className="text-base font-black font-sans text-white mt-1 group-hover:text-blue-400 transition">
                                            {p.nom || p.name}
                                        </h3>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                                        {p.description || 'Apprentissage intensif orienté projets en production réelle.'}
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                    <span className="text-xs font-black text-cyan-400 font-mono">
                                        {p.frais_scolarite ? `${new Intl.NumberFormat('fr-FR').format(p.frais_scolarite)} XAF` : 'SUR DOSSIER'}
                                    </span>
                                    <Button
                                        onClick={onOpenInscription}
                                        className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white p-0 flex items-center justify-center shadow-lg"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ═══ Footer Cyber ═══ */}
            <footer className="border-t border-white/5 bg-[#030609] py-10 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <p className="font-black text-white font-sans text-sm tracking-tight uppercase">{trainerName}</p>
                    <p className="text-[10px] text-slate-600 font-mono">© {new Date().getFullYear()} — PROPULSÉ PAR IZITEACH PLATFORM</p>
                    <Button
                        onClick={onOpenInscription}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-lg px-6 h-9 shadow-lg shadow-blue-500/20"
                    >
                        Rejoindre la Formation →
                    </Button>
                </div>
            </footer>
        </div>
    );
}
