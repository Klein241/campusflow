'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    GraduationCap, Users, BookOpen, Calendar, MapPin, Phone, Mail,
    Globe, ArrowRight, Sparkles, ShoppingBag, MessageSquare, ExternalLink,
    Clock, ChevronRight, Star, Heart, Facebook, Instagram, Twitter, Youtube, Linkedin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Org {
    id: string; name: string; slug: string; type: string; motto: string;
    logo_url: string; city: string; country: string; quarter: string;
    phone: string; whatsapp: string; email: string; brand_color: string;
    hero_image_url?: string; hero_title?: string; hero_subtitle?: string;
    about_text?: string; about_image_url?: string;
    gallery_images?: string[];
    social_facebook?: string; social_instagram?: string; social_twitter?: string;
    social_tiktok?: string; social_youtube?: string; social_linkedin?: string;
    footer_text?: string;
}

const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.08, duration: 0.6, ease: 'easeOut' as const }
    })
};

const typeLabels: Record<string, string> = {
    college: 'Collège', lycee: 'Lycée', universite: 'Université',
    centre_formation: 'Centre de Formation', institut: 'Institut', autre: 'Établissement',
};

export default function SchoolLandingPage() {
    const { orgSlug } = useParams<{ orgSlug: string }>();
    const [org, setOrg] = useState<Org | null>(null);
    const [loading, setLoading] = useState(true);
    const [classrooms, setClassrooms] = useState<any[]>([]);
    const [filieres, setFilieres] = useState<any[]>([]);
    const [teacherCount, setTeacherCount] = useState(0);
    const [studentCount, setStudentCount] = useState(0);

    useEffect(() => {
        async function load() {
            const { data } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single();
            if (data) {
                setOrg(data);
                const [clsRes, filRes, tRes, sRes] = await Promise.all([
                    supabase.from('classrooms').select('*').eq('organization_id', data.id).eq('is_active', true),
                    supabase.from('filieres').select('*').eq('organization_id', data.id).eq('is_active', true),
                    supabase.from('teacher_profiles').select('id', { count: 'exact', head: true }).eq('organization_id', data.id),
                    supabase.from('student_profiles').select('id', { count: 'exact', head: true }).eq('organization_id', data.id),
                ]);
                setClassrooms(clsRes.data || []);
                setFilieres(filRes.data || []);
                setTeacherCount(tRes.count || 0);
                setStudentCount(sRes.count || 0);
            }
            setLoading(false);
        }
        load();
    }, [orgSlug]);

    if (loading) return (
        <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <GraduationCap className="w-10 h-10 text-teal-400" />
            </motion.div>
        </div>
    );

    if (!org) return (
        <div className="min-h-screen bg-[#0B0E14] flex flex-col items-center justify-center text-white p-8">
            <h1 className="text-3xl font-black mb-4">Établissement introuvable</h1>
            <p className="text-slate-400 mb-6">L&apos;URL <code className="text-teal-400">/{orgSlug}</code> ne correspond à aucun établissement.</p>
            <Link href="/"><Button className="rounded-xl">Retour à l&apos;accueil</Button></Link>
        </div>
    );

    const brandColor = org.brand_color || '#14b8a6';
    const heroTitle = org.hero_title || org.name;
    const heroSubtitle = org.hero_subtitle || org.motto || `Bienvenue sur le portail de ${org.name}`;
    const gallery = org.gallery_images || [];
    const socials = [
        { url: org.social_facebook, icon: Facebook, label: 'Facebook' },
        { url: org.social_instagram, icon: Instagram, label: 'Instagram' },
        { url: org.social_twitter, icon: Twitter, label: 'Twitter' },
        { url: org.social_youtube, icon: Youtube, label: 'YouTube' },
        { url: org.social_linkedin, icon: Linkedin, label: 'LinkedIn' },
        { url: org.social_tiktok, icon: Globe, label: 'TikTok' },
    ].filter(s => s.url);

    return (
        <div className="min-h-screen bg-[#0B0E14] text-white">
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-25%] right-[-15%] w-[55%] h-[55%] blur-[180px] rounded-full" style={{ backgroundColor: `${brandColor}10` }} />
                <div className="absolute bottom-[-25%] left-[-15%] w-[45%] h-[45%] bg-indigo-600/5 blur-[180px] rounded-full" />
                <div className="absolute top-[40%] left-[50%] w-[30%] h-[30%] bg-purple-600/3 blur-[150px] rounded-full" />
            </div>

            {/* ═════ NAVBAR ═════ */}
            <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl bg-[#0B0E14]/70 border-b border-white/5">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {org.logo_url ? (
                            <img src={org.logo_url} alt={org.name} className="w-9 h-9 rounded-xl object-contain bg-white/10 p-0.5" />
                        ) : (
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}90)` }}>
                                <GraduationCap className="w-5 h-5 text-white" />
                            </div>
                        )}
                        <span className="font-bold text-sm sm:text-base truncate max-w-[180px]">{org.name}</span>
                    </div>
                    <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
                        <a href="#about" className="hover:text-white transition-colors">À propos</a>
                        {filieres.length > 0 && <a href="#programs" className="hover:text-white transition-colors">Formations</a>}
                        {gallery.length > 0 && <a href="#gallery" className="hover:text-white transition-colors">Galerie</a>}
                        <a href="#contact" className="hover:text-white transition-colors">Contact</a>
                    </div>
                    <Link href={`/${orgSlug}/login`}>
                        <Button size="sm" className="text-white font-bold rounded-xl shadow-lg" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` }}>
                            Se connecter <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </Link>
                </div>
            </nav>

            {/* ═════ HERO ═════ */}
            <section className="relative z-10 pt-16 overflow-hidden">
                <div className="relative min-h-[70vh] sm:min-h-[80vh] flex items-center justify-center">
                    {/* Hero background image */}
                    {org.hero_image_url ? (
                        <div className="absolute inset-0">
                            <img src={org.hero_image_url} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-b from-[#0B0E14]/80 via-[#0B0E14]/60 to-[#0B0E14]" />
                        </div>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0B0E14] via-[#111827] to-[#0B0E14]">
                            <div className="absolute inset-0 opacity-20" style={{
                                backgroundImage: `radial-gradient(circle at 30% 40%, ${brandColor}30 0%, transparent 50%), radial-gradient(circle at 70% 60%, #6366f130 0%, transparent 50%)`
                            }} />
                        </div>
                    )}

                    <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center py-20">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
                            {org.logo_url ? (
                                <img src={org.logo_url} alt={org.name} className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl mx-auto mb-6 object-contain bg-white/10 backdrop-blur-sm p-2 border border-white/10 shadow-2xl" />
                            ) : (
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl mx-auto mb-6 flex items-center justify-center border border-white/10 shadow-2xl" style={{ background: `linear-gradient(135deg, ${brandColor}30, ${brandColor}10)` }}>
                                    <GraduationCap className="w-12 h-12 sm:w-14 sm:h-14" style={{ color: brandColor }} />
                                </div>
                            )}
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm mb-6" style={{ backgroundColor: `${brandColor}15`, borderColor: `${brandColor}30`, color: brandColor }}>
                            <Sparkles className="w-3.5 h-3.5" />
                            {typeLabels[org.type] || org.type}
                        </motion.div>

                        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}
                            className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight">
                            {heroTitle}
                        </motion.h1>

                        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                            className="mt-5 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
                            {heroSubtitle}
                        </motion.p>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link href={`/${orgSlug}/login`}>
                                <Button size="lg" className="text-lg px-8 py-6 font-bold rounded-2xl shadow-2xl text-white" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}bb)`, boxShadow: `0 20px 40px ${brandColor}30` }}>
                                    Se connecter <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </Link>
                            <a href="#contact">
                                <Button variant="outline" size="lg" className="text-lg px-8 py-6 border-white/10 text-slate-300 hover:bg-white/5 rounded-2xl">
                                    <Phone className="w-5 h-5 mr-2" /> Nous contacter
                                </Button>
                            </a>
                        </motion.div>

                        {/* Location badge */}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                            className="mt-8 inline-flex items-center gap-2 text-sm text-slate-400">
                            <MapPin className="w-4 h-4" />
                            {org.quarter ? `${org.quarter}, ` : ''}{org.city}, {org.country}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═════ STATS ═════ */}
            <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 -mt-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {[
                        { label: 'Filières', value: filieres.length, icon: BookOpen },
                        { label: 'Classes', value: classrooms.length, icon: Users },
                        { label: 'Professeurs', value: teacherCount, icon: Star },
                        { label: 'Étudiants', value: studentCount, icon: GraduationCap },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.1 }}
                            className="p-4 sm:p-5 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 text-center hover:border-white/20 transition-all group">
                            <s.icon className="w-5 h-5 mx-auto mb-2 text-slate-400 group-hover:scale-110 transition-transform" style={{ color: brandColor }} />
                            <div className="text-2xl sm:text-3xl font-black">{s.value}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ═════ ABOUT ═════ */}
            {(org.about_text || org.about_image_url) && (
                <section id="about" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-20">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid sm:grid-cols-2 gap-8 items-center">
                        <motion.div variants={fadeUp} custom={0}>
                            <h2 className="text-3xl sm:text-4xl font-black mb-4">
                                À propos de <span style={{ color: brandColor }}>{org.name}</span>
                            </h2>
                            <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                                {org.about_text || `${org.name} est un établissement scolaire situé à ${org.city}, ${org.country}. Nous offrons un enseignement de qualité adapté aux besoins de chaque étudiant.`}
                            </p>
                        </motion.div>
                        {org.about_image_url && (
                            <motion.div variants={fadeUp} custom={1}>
                                <img src={org.about_image_url} alt="À propos" className="w-full h-64 sm:h-80 rounded-2xl object-cover border border-white/10 shadow-2xl" />
                            </motion.div>
                        )}
                    </motion.div>
                </section>
            )}

            {/* ═════ FILIÈRES ═════ */}
            {filieres.length > 0 && (
                <section id="programs" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
                        <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-black mb-2">Nos formations</motion.h2>
                        <motion.p variants={fadeUp} custom={1} className="text-slate-400 mb-8">Découvrez nos filières et programmes d&apos;enseignement.</motion.p>
                    </motion.div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filieres.map((f: any, i: number) => (
                            <motion.div key={f.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                                className="group p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all hover:bg-white/[0.05]">
                                <div className="flex items-start gap-3">
                                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                                        style={{ backgroundColor: `${f.couleur || brandColor}20` }}>
                                        <BookOpen className="w-5 h-5" style={{ color: f.couleur || brandColor }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold group-hover:text-white transition-colors">{f.nom}</h3>
                                        <p className="text-xs text-slate-400 mt-1">{f.duree_mois} mois • {new Intl.NumberFormat('fr-FR').format(f.frais_scolarite)} XAF</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* ═════ CLASSES ═════ */}
            {classrooms.length > 0 && (
                <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pb-16">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
                        <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-black mb-6">Nos classes</motion.h2>
                    </motion.div>
                    <div className="flex flex-wrap gap-3">
                        {classrooms.map((c: any, i: number) => (
                            <motion.div key={c.id} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}
                                className="px-5 py-2.5 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/10 text-sm hover:border-white/20 transition-all hover:bg-white/[0.06]">
                                {c.name} {c.cycle && <span className="text-xs ml-1" style={{ color: brandColor }}>({c.cycle})</span>}
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* ═════ GALLERY ═════ */}
            {gallery.length > 0 && (
                <section id="gallery" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
                        <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-black mb-8">Galerie photos</motion.h2>
                    </motion.div>
                    <div className={`grid gap-3 ${gallery.length === 1 ? 'grid-cols-1' : gallery.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                        {gallery.map((img: string, i: number) => (
                            <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                                className="relative group overflow-hidden rounded-2xl border border-white/10">
                                <img src={img} alt={`Photo ${i + 1}`} className="w-full h-48 sm:h-56 object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* ═════ QUICK LINKS ═════ */}
            <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12">
                <div className="grid sm:grid-cols-3 gap-4">
                    {[
                        { href: `/${orgSlug}/login`, icon: ArrowRight, title: 'Espace étudiant', desc: 'Accédez à vos cours et notes', gradient: `linear-gradient(135deg, ${brandColor}20, ${brandColor}05)`, borderColor: `${brandColor}30` },
                        { href: `/${orgSlug}/library`, icon: BookOpen, title: 'Bibliothèque', desc: 'Ressources pédagogiques', gradient: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.03))', borderColor: 'rgba(99,102,241,0.2)' },
                        { href: `/${orgSlug}/shop`, icon: ShoppingBag, title: 'Marketplace', desc: 'Fournitures et matériels', gradient: 'linear-gradient(135deg, rgba(236,72,153,0.1), rgba(236,72,153,0.03))', borderColor: 'rgba(236,72,153,0.2)' },
                    ].map((link, i) => (
                        <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
                            <Link href={link.href} className="block p-5 rounded-2xl border transition-all hover:scale-[1.02] group" style={{ background: link.gradient, borderColor: link.borderColor }}>
                                <link.icon className="w-6 h-6 mb-3 group-hover:scale-110 transition-transform" style={{ color: brandColor }} />
                                <h3 className="font-bold text-white mb-1">{link.title}</h3>
                                <p className="text-xs text-slate-400">{link.desc}</p>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ═════ CONTACT ═════ */}
            <section id="contact" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16">
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
                    <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-black mb-8">Nous contacter</motion.h2>
                </motion.div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { icon: Phone, label: 'Téléphone', value: org.phone, href: `tel:${org.phone}` },
                        { icon: MessageSquare, label: 'WhatsApp', value: org.whatsapp, href: `https://wa.me/${org.whatsapp?.replace(/\D/g, '')}` },
                        { icon: Mail, label: 'Email', value: org.email, href: `mailto:${org.email}` },
                        { icon: MapPin, label: 'Adresse', value: `${org.quarter || ''} ${org.city}, ${org.country}`, href: null },
                    ].filter(c => c.value).map((c, i) => (
                        <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
                            {c.href ? (
                                <a href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                                    className="block p-5 rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all group">
                                    <c.icon className="w-5 h-5 mb-3 group-hover:scale-110 transition-transform" style={{ color: brandColor }} />
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{c.label}</p>
                                    <p className="text-sm font-medium">{c.value}</p>
                                </a>
                            ) : (
                                <div className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/10">
                                    <c.icon className="w-5 h-5 mb-3" style={{ color: brandColor }} />
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{c.label}</p>
                                    <p className="text-sm font-medium">{c.value}</p>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ═════ FOOTER ═════ */}
            <footer className="relative z-10 border-t border-white/5">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                        {/* Logo & name */}
                        <div className="flex items-center gap-3">
                            {org.logo_url ? (
                                <img src={org.logo_url} alt={org.name} className="w-10 h-10 rounded-xl object-contain bg-white/10 p-0.5" />
                            ) : (
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}90)` }}>
                                    <GraduationCap className="w-5 h-5 text-white" />
                                </div>
                            )}
                            <div>
                                <p className="font-bold text-sm">{org.name}</p>
                                <p className="text-[10px] text-slate-500">{typeLabels[org.type] || org.type}</p>
                            </div>
                        </div>

                        {/* Social links */}
                        {socials.length > 0 && (
                            <div className="flex items-center gap-3">
                                {socials.map((s, i) => (
                                    <a key={i} href={s.url!} target="_blank" rel="noreferrer"
                                        className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all hover:scale-110" title={s.label}>
                                        <s.icon className="w-4 h-4 text-slate-400" />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer text + credits */}
                    <div className="mt-6 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                        <p>{org.footer_text || `© ${new Date().getFullYear()} ${org.name}. Tous droits réservés.`}</p>
                        <p>
                            Propulsé par{' '}
                            <Link href="/" className="font-bold hover:underline" style={{ color: brandColor }}>CampusFlow</Link>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
