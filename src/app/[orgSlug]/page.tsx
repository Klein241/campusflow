'use client';

import { useEffect, useState, useRef } from 'react';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
    GraduationCap, Users, BookOpen, Calendar, MapPin, Phone, Mail,
    Globe, ArrowRight, Sparkles, ShoppingBag, MessageSquare, ExternalLink,
    Clock, ChevronRight, Star, Heart, Facebook, Instagram, Twitter, Youtube,
    Linkedin, X, CheckCircle2, Send, Loader2, ChevronDown, Menu, Award,
    Zap, Shield, TrendingUp, Play, ArrowUpRight, User, UserCheck, Baby,
    Building2, FileText, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AdsBanner } from '@/components/campus/ads-banner';
import { OfficialAnnouncements } from '@/components/campus/official-announcements';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

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

const typeLabels: Record<string, string> = {
    college: 'Collège', lycee: 'Lycée', universite: 'Université',
    centre_formation: 'Centre de Formation', institut: 'Institut', autre: 'Établissement',
};

const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.1, duration: 0.65, ease: [0.25, 0.4, 0.25, 1] as any }
    })
};

// ═══════════════════════════════════════════════════════════════════════
// ANIMATED COUNTER
// ═══════════════════════════════════════════════════════════════════════
function AnimatedCounter({ value, duration = 1.5 }: { value: number; duration?: number }) {
    const [count, setCount] = useState(0);
    const ref = useRef(false);
    useEffect(() => {
        if (ref.current || value === 0) { setCount(value); return; }
        ref.current = true;
        const start = performance.now();
        const step = (ts: number) => {
            const progress = Math.min((ts - start) / (duration * 1000), 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * value));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [value, duration]);
    return <>{count}</>;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════
export default function SchoolLandingPage() {
    const orgSlug = useOrgSlug();
    const [org, setOrg]               = useState<Org | null>(null);
    const [loading, setLoading]       = useState(true);
    const [classrooms, setClassrooms] = useState<any[]>([]);
    const [filieres, setFilieres]     = useState<any[]>([]);
    const [teacherCount, setTeacherCount] = useState(0);
    const [studentCount, setStudentCount] = useState(0);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [mobileMenu, setMobileMenu] = useState(false);
    const [scrolled, setScrolled]     = useState(false);
    const [showForm, setShowForm]     = useState(false);

    // Form state
    const [form, setForm] = useState({
        first_name: '', last_name: '', birth_date: '', gender: '',
        phone: '', parent_phone: '', email: '', address: '',
        filiere_id: '', classe_souhaitee: '', previous_school: '', previous_level: '',
    });
    const [formStep, setFormStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted]   = useState(false);

    // Scroll tracking
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 60);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Data fetch
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

    // Form submit
    const handleSubmit = async () => {
        if (!org || !form.first_name || !form.last_name || !form.phone) {
            toast.error('Veuillez remplir les champs obligatoires (prénom, nom, téléphone)');
            return;
        }
        setSubmitting(true);
        const payload: any = { organization_id: org.id, ...form };
        if (!form.filiere_id) delete payload.filiere_id;
        if (!form.birth_date) delete payload.birth_date;

        const { error } = await supabase.from('inscription_requests').insert(payload);
        if (error) {
            toast.error('Erreur lors de l\'envoi : ' + error.message);
        } else {
            setSubmitted(true);
        }
        setSubmitting(false);
    };

    // ── Loading ───────────────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-screen bg-[#08090E] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-teal-500/30">
                    <GraduationCap className="w-6 h-6 text-white" />
                </motion.div>
                <p className="text-slate-500 text-sm animate-pulse">Chargement du portail...</p>
            </div>
        </div>
    );

    if (!org) return (
        <div className="min-h-screen bg-[#08090E] flex flex-col items-center justify-center text-white p-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6">
                <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-3xl font-black mb-3">Établissement introuvable</h1>
            <p className="text-slate-400 mb-8 max-w-sm">L&apos;URL <code className="text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded-lg">/{orgSlug}</code> ne correspond à aucun établissement.</p>
            <Link href="/"><Button className="rounded-2xl px-8">Retour à l&apos;accueil</Button></Link>
        </div>
    );

    const bc   = org.brand_color || '#14b8a6';
    const hero = org.hero_title || org.name;
    const sub  = org.hero_subtitle || org.motto || `Bienvenue sur le portail officiel de ${org.name}`;
    const gallery = org.gallery_images || [];
    const socials = [
        { url: org.social_facebook,  icon: Facebook,  label: 'Facebook' },
        { url: org.social_instagram, icon: Instagram, label: 'Instagram' },
        { url: org.social_twitter,   icon: Twitter,   label: 'Twitter' },
        { url: org.social_youtube,   icon: Youtube,   label: 'YouTube' },
        { url: org.social_linkedin,  icon: Linkedin,  label: 'LinkedIn' },
        { url: org.social_tiktok,    icon: Globe,     label: 'TikTok' },
    ].filter(s => s.url);

    const FORM_STEPS = [
        { title: 'Identité', icon: User,      fields: ['first_name', 'last_name', 'birth_date', 'gender'] },
        { title: 'Contact',  icon: Phone,     fields: ['phone', 'parent_phone', 'email', 'address'] },
        { title: 'Scolarité',icon: BookOpen,  fields: ['filiere_id', 'classe_souhaitee', 'previous_school', 'previous_level'] },
    ];

    return (
        <div className="min-h-screen bg-[#08090E] text-white overflow-x-hidden">

            {/* ── Publicités & Annonces officielles ────────────────── */}
            <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto md:max-w-md">
                <AdsBanner role="public" />
            </div>

            {/* ── Ambient BG ───────────────────────────────────────── */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] blur-[200px] rounded-full opacity-40"
                    style={{ backgroundColor: `${bc}18` }} />
                <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 blur-[200px] rounded-full" />
                <div className="absolute top-[45%] left-[45%] w-[35%] h-[35%] bg-purple-900/10 blur-[180px] rounded-full" />
            </div>

            {/* ═══ NAVBAR ════════════════════════════════════════════ */}
            <nav className={cn(
                'fixed top-0 inset-x-0 z-50 transition-all duration-300',
                scrolled
                    ? 'bg-[#08090E]/90 backdrop-blur-2xl border-b border-white/[0.06] shadow-xl shadow-black/20'
                    : 'bg-transparent'
            )}>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                    {/* Logo */}
                    <div className="flex items-center gap-3 shrink-0">
                        {org.logo_url
                            ? <img src={org.logo_url} alt={org.name} className="w-9 h-9 rounded-xl object-contain bg-white/10 p-0.5" />
                            : <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg,${bc},${bc}99)` }}>
                                <GraduationCap className="w-5 h-5 text-white" />
                              </div>
                        }
                        <span className="font-black text-sm sm:text-base truncate max-w-[150px] sm:max-w-[200px]">{org.name}</span>
                    </div>

                    {/* Desktop nav */}
                    <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
                        <a href="#about"   className="hover:text-white transition-colors">À propos</a>
                        {filieres.length > 0 && <a href="#programs" className="hover:text-white transition-colors">Formations</a>}
                        {gallery.length > 0  && <a href="#gallery"  className="hover:text-white transition-colors">Galerie</a>}
                        <a href="#inscription" className="hover:text-white transition-colors">Inscription</a>
                        <a href="#contact"  className="hover:text-white transition-colors">Contact</a>
                    </div>

                    {/* CTA */}
                    <div className="flex items-center gap-2">
                        <a href="#inscription" className="hidden sm:flex">
                            <Button variant="outline" size="sm" className="rounded-xl border-white/15 text-white/80 hover:bg-white/5 text-xs">
                                S&apos;inscrire
                            </Button>
                        </a>
                        <Link href={`/${orgSlug}/login`}>
                            <Button size="sm" className="font-bold rounded-xl text-white text-xs shadow-lg"
                                style={{ background: `linear-gradient(135deg,${bc},${bc}bb)`, boxShadow: `0 8px 24px ${bc}35` }}>
                                <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
                                Espace élève
                                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                            </Button>
                        </Link>
                        <button onClick={() => setMobileMenu(v => !v)}
                            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                            {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                <AnimatePresence>
                    {mobileMenu && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="md:hidden overflow-hidden bg-[#0D0F17]/98 border-t border-white/[0.05]">
                            <div className="px-4 py-4 space-y-1">
                                {[
                                    ['#about', 'À propos'],
                                    ...(filieres.length > 0 ? [['#programs', 'Formations']] : []),
                                    ...(gallery.length > 0  ? [['#gallery', 'Galerie']] : []),
                                    ['#inscription', 'Inscription'],
                                    ['#contact', 'Contact'],
                                ].map(([href, label]) => (
                                    <a key={href} href={href} onClick={() => setMobileMenu(false)}
                                        className="flex items-center justify-between px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all">
                                        {label} <ChevronRight className="w-4 h-4 text-slate-600" />
                                    </a>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* ═══ HERO ══════════════════════════════════════════════ */}
            <section className="relative z-10 pt-16 min-h-[100svh] flex flex-col justify-center overflow-hidden">
                {/* Hero image */}
                <div className="absolute inset-0">
                    {org.hero_image_url
                        ? <>
                            <img src={org.hero_image_url} alt="" className="w-full h-full object-cover" loading="eager" decoding="async" />
                            <div className="absolute inset-0 bg-gradient-to-b from-[#08090E]/70 via-[#08090E]/60 to-[#08090E]" />
                          </>
                        : <div className="absolute inset-0">
                            <div className="absolute inset-0" style={{
                                backgroundImage: `radial-gradient(ellipse 80% 60% at 50% 30%, ${bc}22 0%, transparent 70%)`
                            }} />
                            {/* Grid pattern */}
                            <div className="absolute inset-0 opacity-[0.03]"
                                style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
                          </div>
                    }
                </div>

                <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-24 text-center">
                    {/* Logo badge */}
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
                        className="mb-8 flex justify-center">
                        {org.logo_url
                            ? <div className="relative">
                                <div className="absolute inset-0 rounded-3xl blur-2xl scale-110 opacity-30" style={{ background: bc }} />
                                <img src={org.logo_url} alt={org.name}
                                    className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-3xl object-contain bg-white/10 backdrop-blur-sm p-2 border border-white/10 shadow-2xl" />
                              </div>
                            : <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl"
                                style={{ background: `linear-gradient(135deg,${bc}40,${bc}15)` }}>
                                <GraduationCap className="w-12 h-12 sm:w-16 sm:h-16" style={{ color: bc }} />
                              </div>
                        }
                    </motion.div>

                    {/* Pill badge */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border mb-6"
                        style={{ backgroundColor: `${bc}18`, borderColor: `${bc}40`, color: bc }}>
                        <Sparkles className="w-3 h-3" />
                        {typeLabels[org.type] || org.type}
                        {org.city && <><span className="w-1 h-1 rounded-full bg-current opacity-50 mx-0.5" /><span className="opacity-70">{org.city}</span></>}
                    </motion.div>

                    {/* Title */}
                    <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }}
                        className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6">
                        <span className="block">{hero}</span>
                        {org.motto && hero !== org.motto && (
                            <span className="block text-2xl sm:text-3xl lg:text-4xl font-light text-slate-400 mt-2">{org.motto}</span>
                        )}
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                        className="text-lg sm:text-xl text-slate-300/90 max-w-2xl mx-auto leading-relaxed mb-10">
                        {sub}
                    </motion.p>

                    {/* CTA buttons */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <a href="#inscription">
                            <Button size="lg" className="text-base px-8 h-14 font-black rounded-2xl text-white shadow-2xl transition-all hover:scale-[1.02]"
                                style={{ background: `linear-gradient(135deg,${bc},${bc}bb)`, boxShadow: `0 20px 50px ${bc}40` }}>
                                <FileText className="w-5 h-5 mr-2" />
                                Demande d&apos;inscription
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </a>
                        <Link href={`/${orgSlug}/login`}>
                            <Button variant="outline" size="lg"
                                className="text-base px-8 h-14 border-white/15 text-white/80 hover:bg-white/5 rounded-2xl transition-all hover:scale-[1.02]">
                                <GraduationCap className="w-5 h-5 mr-2" />
                                Espace étudiant
                            </Button>
                        </Link>
                    </motion.div>

                    {/* Location */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                        className="mt-10 inline-flex items-center gap-2 text-sm text-slate-500">
                        <MapPin className="w-3.5 h-3.5" />
                        {[org.quarter, org.city, org.country].filter(Boolean).join(', ')}
                    </motion.div>
                </div>

                {/* Scroll cue */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
                    <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }}
                        className="w-8 h-12 rounded-full border border-white/15 flex items-start justify-center pt-2">
                        <div className="w-1 h-3 rounded-full" style={{ background: bc }} />
                    </motion.div>
                </motion.div>
            </section>

            {/* ═══ STATS ═════════════════════════════════════════════ */}
            <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 -mt-2 pb-8">
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Filières',    value: filieres.length,  icon: BookOpen,     suffix: '' },
                        { label: 'Classes',     value: classrooms.length,icon: Users,        suffix: '' },
                        { label: 'Professeurs', value: teacherCount,     icon: UserCheck,    suffix: '+' },
                        { label: 'Étudiants',   value: studentCount,     icon: GraduationCap,suffix: '+' },
                    ].map((s, i) => (
                        <motion.div key={i}
                            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="relative overflow-hidden p-5 rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl text-center group hover:border-white/15 transition-all hover:bg-white/[0.05]">
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ background: `radial-gradient(circle at 50% 100%,${bc}10,transparent 70%)` }} />
                            <s.icon className="w-5 h-5 mx-auto mb-3 transition-transform group-hover:scale-110" style={{ color: bc }} />
                            <div className="text-3xl font-black">
                                <AnimatedCounter value={s.value} />{s.suffix}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1 font-medium">{s.label}</div>
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            {/* ═══ FEATURES STRIP ════════════════════════════════════ */}
            <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12">
                <div className="grid sm:grid-cols-3 gap-4">
                    {[
                        { icon: Zap,      title: 'Suivi en temps réel',  desc: 'Notes, présences et devoirs consultables à tout moment depuis l\'application.', color: 'from-amber-500 to-orange-500' },
                        { icon: Shield,   title: 'Sécurisé & fiable',   desc: 'Vos données scolaires sont protégées et accessibles uniquement aux personnes autorisées.', color: 'from-teal-500 to-cyan-500' },
                        { icon: TrendingUp,title: 'Excellence académique', desc: 'Un cursus rigoureux conçu pour révéler le potentiel de chaque étudiant.', color: 'from-violet-500 to-purple-500' },
                    ].map((f, i) => (
                        <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                            className="group relative overflow-hidden p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all">
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                                <f.icon className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="font-bold text-white mb-2">{f.title}</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ═══ ABOUT ═════════════════════════════════════════════ */}
            <section id="about" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
                        <motion.div variants={fadeUp} custom={0}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border mb-6"
                            style={{ backgroundColor: `${bc}15`, borderColor: `${bc}30`, color: bc }}>
                            <Award className="w-3 h-3" /> Notre histoire
                        </motion.div>
                        <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-black mb-5 leading-tight">
                            À propos de{' '}
                            <span className="relative">
                                <span style={{ color: bc }}>{org.name}</span>
                                <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full" style={{ background: `linear-gradient(90deg,${bc},transparent)` }} />
                            </span>
                        </motion.h2>
                        <motion.p variants={fadeUp} custom={2} className="text-slate-300/90 leading-relaxed whitespace-pre-line text-base">
                            {org.about_text || `${org.name} est un établissement scolaire de référence situé à ${org.city}, ${org.country}. Notre mission est d'offrir un enseignement de qualité adapté aux besoins de chaque étudiant, dans un cadre propice à l'épanouissement personnel et académique.`}
                        </motion.p>

                        {/* Mini features */}
                        <motion.div variants={fadeUp} custom={3} className="mt-8 grid grid-cols-2 gap-3">
                            {[
                                'Enseignement certifié', 'Équipe pédagogique qualifiée',
                                'Suivi personnalisé',   'Infrastructures modernes',
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: bc }} />
                                    {item}
                                </div>
                            ))}
                        </motion.div>
                    </motion.div>

                    {org.about_image_url
                        ? <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                            className="relative group">
                            <div className="absolute inset-0 rounded-3xl blur-3xl scale-105 opacity-20 group-hover:opacity-30 transition-opacity" style={{ background: bc }} />
                            <img src={org.about_image_url} alt="À propos"
                                className="relative w-full h-72 sm:h-96 rounded-3xl object-cover border border-white/10 shadow-2xl" loading="lazy" />
                          </motion.div>
                        : <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                            className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Années d\'expérience', val: '5+', icon: Calendar },
                                { label: 'Taux de réussite',     val: '92%', icon: TrendingUp },
                                { label: 'Corps enseignant',     val: `${teacherCount}+`, icon: UserCheck },
                                { label: 'Diplômés',             val: `${Math.round(studentCount * 0.8)}+`, icon: Award },
                            ].map((s, i) => (
                                <div key={i} className="p-5 rounded-2xl border border-white/[0.07] bg-white/[0.03] text-center">
                                    <s.icon className="w-6 h-6 mx-auto mb-2" style={{ color: bc }} />
                                    <p className="text-2xl font-black">{s.val}</p>
                                    <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                                </div>
                            ))}
                          </motion.div>
                    }
                </div>
            </section>

            {/* ═══ FILIÈRES ══════════════════════════════════════════ */}
            {filieres.length > 0 && (
                <section id="programs" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
                        <motion.div variants={fadeUp} custom={0}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border mb-6"
                            style={{ backgroundColor: `${bc}15`, borderColor: `${bc}30`, color: bc }}>
                            <BookOpen className="w-3 h-3" /> Nos programmes
                        </motion.div>
                        <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-black mb-3">Nos formations</motion.h2>
                        <motion.p variants={fadeUp} custom={2} className="text-slate-400 mb-10 max-w-xl">
                            Découvrez nos filières et programmes d&apos;enseignement conçus pour votre réussite.
                        </motion.p>
                    </motion.div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filieres.map((f: any, i: number) => (
                            <motion.div key={f.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                                className="group relative overflow-hidden p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05] transition-all cursor-default">
                                <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ background: f.couleur || bc }} />
                                <div className="relative z-10">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: `${f.couleur || bc}20` }}>
                                            <BookOpen className="w-6 h-6" style={{ color: f.couleur || bc }} />
                                        </div>
                                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
                                            style={{ color: f.couleur || bc, borderColor: `${f.couleur || bc}40`, backgroundColor: `${f.couleur || bc}15` }}>
                                            {f.duree_mois} mois
                                        </span>
                                    </div>
                                    <h3 className="font-black text-white mb-1.5 text-base leading-tight">{f.nom}</h3>
                                    {f.description && <p className="text-xs text-slate-400 leading-relaxed mb-3 line-clamp-2">{f.description}</p>}
                                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                                        <span className="text-xs text-slate-500">Frais de scolarité</span>
                                        <span className="text-sm font-black" style={{ color: f.couleur || bc }}>
                                            {new Intl.NumberFormat('fr-FR').format(f.frais_scolarite)} XAF
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* ═══ CLASSES ═══════════════════════════════════════════ */}
            {classrooms.length > 0 && (
                <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pb-16">
                    <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
                        className="text-2xl font-black mb-6">Nos classes</motion.h2>
                    <div className="flex flex-wrap gap-2.5">
                        {classrooms.map((c: any, i: number) => (
                            <motion.div key={c.id}
                                initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }} transition={{ delay: i * 0.03 }}
                                className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm font-medium hover:bg-white/[0.07] hover:border-white/15 transition-all">
                                {c.name}
                                {c.cycle && <span className="text-xs ml-1.5 opacity-60" style={{ color: bc }}>({c.cycle})</span>}
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* ═══ GALLERY ═══════════════════════════════════════════ */}
            {gallery.length > 0 && (
                <section id="gallery" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
                        <motion.div variants={fadeUp} custom={0}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border mb-6"
                            style={{ backgroundColor: `${bc}15`, borderColor: `${bc}30`, color: bc }}>
                            <Star className="w-3 h-3" /> Notre établissement
                        </motion.div>
                        <motion.h2 variants={fadeUp} custom={1} className="text-3xl font-black mb-10">Galerie photos</motion.h2>
                    </motion.div>
                    <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
                        {gallery.map((img: string, i: number) => (
                            <motion.div key={i}
                                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                                className="break-inside-avoid relative group overflow-hidden rounded-2xl border border-white/10 cursor-pointer"
                                onClick={() => setSelectedImage(img)}>
                                <img src={img} alt={`Photo ${i + 1}`}
                                    className="w-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" decoding="async" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-3">
                                    <ArrowUpRight className="w-4 h-4 text-white" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Lightbox ─────────────────────────────────────────── */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
                        onClick={() => setSelectedImage(null)}>
                        <button className="absolute top-5 right-5 p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-all"
                            onClick={e => { e.stopPropagation(); setSelectedImage(null); }}>
                            <X className="w-5 h-5" />
                        </button>
                        <motion.img
                            initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.85, opacity: 0 }} transition={{ type: 'spring', damping: 25 }}
                            src={selectedImage} alt="" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
                            onClick={e => e.stopPropagation()} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ INSCRIPTION FORM ══════════════════════════════════ */}
            <section id="inscription" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-20">
                {/* Section header */}
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
                    <motion.div variants={fadeUp} custom={0}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border mb-6"
                        style={{ backgroundColor: `${bc}15`, borderColor: `${bc}30`, color: bc }}>
                        <FileText className="w-3 h-3" /> Rejoignez-nous
                    </motion.div>
                    <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-black mb-4">
                        Demande d&apos;inscription
                    </motion.h2>
                    <motion.p variants={fadeUp} custom={2} className="text-slate-400 max-w-xl mx-auto">
                        Remplissez ce formulaire pour soumettre votre demande d&apos;inscription. Notre équipe vous contactera dans les plus brefs délais.
                    </motion.p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    className="max-w-2xl mx-auto">

                    {submitted ? (
                        /* ── Success state ───────────────────────── */
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-16 px-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.06]">
                            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-3">Demande envoyée !</h3>
                            <p className="text-slate-400 mb-8 leading-relaxed">
                                Votre demande d&apos;inscription a bien été reçue par <strong className="text-white">{org.name}</strong>.
                                Vous serez contacté(e) sur le numéro <strong className="text-white">{form.phone}</strong> très prochainement.
                            </p>
                            <Button onClick={() => { setSubmitted(false); setForm({ first_name: '', last_name: '', birth_date: '', gender: '', phone: '', parent_phone: '', email: '', address: '', filiere_id: '', classe_souhaitee: '', previous_school: '', previous_level: '' }); setFormStep(0); }}
                                className="rounded-2xl px-8 border border-white/10 bg-white/5 hover:bg-white/10 text-white">
                                Nouvelle demande
                            </Button>
                        </motion.div>

                    ) : (
                        /* ── Form ────────────────────────────────── */
                        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                            {/* Steps header */}
                            <div className="flex border-b border-white/[0.06]">
                                {FORM_STEPS.map((step, i) => (
                                    <button key={i} onClick={() => i < formStep && setFormStep(i)}
                                        className={cn(
                                            'flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold transition-all',
                                            formStep === i
                                                ? 'text-white border-b-2'
                                                : i < formStep
                                                    ? 'text-slate-400 hover:text-slate-200'
                                                    : 'text-slate-600 cursor-default'
                                        )}
                                        style={formStep === i ? { borderColor: bc } : {}}>
                                        <div className={cn(
                                            'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all',
                                            formStep === i ? 'text-white' : i < formStep ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-500'
                                        )} style={formStep === i ? { background: bc } : {}}>
                                            {i < formStep ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                                        </div>
                                        <span className="hidden sm:inline">{step.title}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Step content */}
                            <div className="p-6 sm:p-8">
                                <AnimatePresence mode="wait">
                                    {/* ── Étape 1 : Identité ─── */}
                                    {formStep === 0 && (
                                        <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                            className="space-y-4">
                                            <div className="flex items-center gap-2 mb-6">
                                                <User className="w-4 h-4" style={{ color: bc }} />
                                                <span className="font-bold text-white">Informations personnelles</span>
                                            </div>
                                            <div className="grid sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Prénom <span className="text-red-400">*</span></label>
                                                    <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                                                        placeholder="Ex : Marie"
                                                        className="w-full h-11 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Nom <span className="text-red-400">*</span></label>
                                                    <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                                                        placeholder="Ex : Dupont"
                                                        className="w-full h-11 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors" />
                                                </div>
                                            </div>
                                            <div className="grid sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Date de naissance</label>
                                                    <input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))}
                                                        className="w-full h-11 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm focus:outline-none focus:border-white/25 transition-colors [color-scheme:dark]" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Genre</label>
                                                    <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                                                        className="w-full h-11 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm focus:outline-none focus:border-white/25 transition-colors [color-scheme:dark]">
                                                        <option value="" className="bg-[#111]">Sélectionner</option>
                                                        <option value="male" className="bg-[#111]">Masculin</option>
                                                        <option value="female" className="bg-[#111]">Féminin</option>
                                                        <option value="other" className="bg-[#111]">Autre</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="pt-4 flex justify-end">
                                                <Button onClick={() => {
                                                    if (!form.first_name || !form.last_name) { toast.error('Prénom et nom sont obligatoires'); return; }
                                                    setFormStep(1);
                                                }} className="rounded-xl px-8 font-bold text-white"
                                                    style={{ background: `linear-gradient(135deg,${bc},${bc}bb)` }}>
                                                    Suivant <ArrowRight className="w-4 h-4 ml-2" />
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* ── Étape 2 : Contact ─── */}
                                    {formStep === 1 && (
                                        <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                            className="space-y-4">
                                            <div className="flex items-center gap-2 mb-6">
                                                <Phone className="w-4 h-4" style={{ color: bc }} />
                                                <span className="font-bold text-white">Coordonnées</span>
                                            </div>
                                            <div className="grid sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Téléphone <span className="text-red-400">*</span></label>
                                                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                                        placeholder="Ex : +237 6XX XXX XXX"
                                                        className="w-full h-11 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Tél. parent / tuteur</label>
                                                    <input value={form.parent_phone} onChange={e => setForm(f => ({ ...f, parent_phone: e.target.value }))}
                                                        placeholder="Ex : +237 6XX XXX XXX"
                                                        className="w-full h-11 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Email</label>
                                                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                                    placeholder="exemple@email.com"
                                                    className="w-full h-11 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors" />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Adresse / Quartier</label>
                                                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                                                    placeholder="Ex : Quartier Bastos, Yaoundé"
                                                    className="w-full h-11 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors" />
                                            </div>
                                            <div className="pt-4 flex justify-between">
                                                <Button variant="outline" onClick={() => setFormStep(0)}
                                                    className="rounded-xl border-white/15 text-slate-300 hover:bg-white/5">
                                                    ← Retour
                                                </Button>
                                                <Button onClick={() => {
                                                    if (!form.phone) { toast.error('Le numéro de téléphone est obligatoire'); return; }
                                                    setFormStep(2);
                                                }} className="rounded-xl px-8 font-bold text-white"
                                                    style={{ background: `linear-gradient(135deg,${bc},${bc}bb)` }}>
                                                    Suivant <ArrowRight className="w-4 h-4 ml-2" />
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* ── Étape 3 : Scolarité ─── */}
                                    {formStep === 2 && (
                                        <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                            className="space-y-4">
                                            <div className="flex items-center gap-2 mb-6">
                                                <BookOpen className="w-4 h-4" style={{ color: bc }} />
                                                <span className="font-bold text-white">Informations scolaires</span>
                                            </div>
                                            {filieres.length > 0 && (
                                                <div>
                                                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Filière souhaitée</label>
                                                    <select value={form.filiere_id} onChange={e => setForm(f => ({ ...f, filiere_id: e.target.value }))}
                                                        className="w-full h-11 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm focus:outline-none focus:border-white/25 transition-colors [color-scheme:dark]">
                                                        <option value="" className="bg-[#111]">Sélectionner une filière</option>
                                                        {filieres.map((f: any) => (
                                                            <option key={f.id} value={f.id} className="bg-[#111]">{f.nom}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <div>
                                                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Niveau / Classe souhaité(e)</label>
                                                <input value={form.classe_souhaitee} onChange={e => setForm(f => ({ ...f, classe_souhaitee: e.target.value }))}
                                                    placeholder="Ex : Terminale, L2, Master 1..."
                                                    className="w-full h-11 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors" />
                                            </div>
                                            <div className="grid sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Dernier établissement fréquenté</label>
                                                    <input value={form.previous_school} onChange={e => setForm(f => ({ ...f, previous_school: e.target.value }))}
                                                        placeholder="Nom de l'école précédente"
                                                        className="w-full h-11 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Dernier niveau validé</label>
                                                    <input value={form.previous_level} onChange={e => setForm(f => ({ ...f, previous_level: e.target.value }))}
                                                        placeholder="Ex : 3ème, L1, BTS..."
                                                        className="w-full h-11 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors" />
                                                </div>
                                            </div>

                                            {/* Récapitulatif */}
                                            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] mt-2">
                                                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">Récapitulatif</p>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div><span className="text-slate-500">Nom :</span> <span className="text-white font-medium">{form.first_name} {form.last_name}</span></div>
                                                    <div><span className="text-slate-500">Téléphone :</span> <span className="text-white font-medium">{form.phone}</span></div>
                                                </div>
                                            </div>

                                            <div className="pt-4 flex justify-between">
                                                <Button variant="outline" onClick={() => setFormStep(1)}
                                                    className="rounded-xl border-white/15 text-slate-300 hover:bg-white/5">
                                                    ← Retour
                                                </Button>
                                                <Button onClick={handleSubmit} disabled={submitting}
                                                    className="rounded-xl px-8 font-black text-white shadow-xl"
                                                    style={{ background: `linear-gradient(135deg,${bc},${bc}bb)`, boxShadow: `0 12px 30px ${bc}35` }}>
                                                    {submitting
                                                        ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Envoi...</>
                                                        : <><Send className="w-4 h-4 mr-2" />Envoyer la demande</>
                                                    }
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </motion.div>
            </section>

            {/* ═══ CONTACT ═══════════════════════════════════════════ */}
            <section id="contact" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16">
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
                    <motion.div variants={fadeUp} custom={0}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border mb-6"
                        style={{ backgroundColor: `${bc}15`, borderColor: `${bc}30`, color: bc }}>
                        <Mail className="w-3 h-3" /> Nous joindre
                    </motion.div>
                    <motion.h2 variants={fadeUp} custom={1} className="text-3xl font-black mb-3">Nous contacter</motion.h2>
                    <motion.p variants={fadeUp} custom={2} className="text-slate-400 mb-10 max-w-xl">
                        Notre équipe est disponible pour répondre à toutes vos questions.
                    </motion.p>
                </motion.div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { icon: Phone,       label: 'Téléphone', value: org.phone,    href: `tel:${org.phone}` },
                        { icon: MessageSquare,label: 'WhatsApp', value: org.whatsapp, href: `https://wa.me/${org.whatsapp?.replace(/\D/g, '')}` },
                        { icon: Mail,         label: 'Email',    value: org.email,    href: `mailto:${org.email}` },
                        { icon: MapPin,        label: 'Adresse', value: [org.quarter, org.city, org.country].filter(Boolean).join(', '), href: null },
                    ].filter(c => c.value).map((c, i) => (
                        <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
                            {c.href
                                ? <a href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                                    className="group block p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05] transition-all">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                                        style={{ background: `${bc}20` }}>
                                        <c.icon className="w-5 h-5" style={{ color: bc }} />
                                    </div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-semibold">{c.label}</p>
                                    <p className="text-sm font-semibold text-white leading-snug">{c.value}</p>
                                  </a>
                                : <div className="p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02]">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${bc}20` }}>
                                        <c.icon className="w-5 h-5" style={{ color: bc }} />
                                    </div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-semibold">{c.label}</p>
                                    <p className="text-sm font-semibold text-white leading-snug">{c.value}</p>
                                  </div>
                            }
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ═══ FOOTER ════════════════════════════════════════════ */}
            <footer className="relative z-10 border-t border-white/[0.05] mt-8">
                {/* CTA band */}
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
                    <div className="relative overflow-hidden rounded-3xl p-8 sm:p-12 text-center"
                        style={{ background: `linear-gradient(135deg,${bc}25,${bc}10,transparent)`, border: `1px solid ${bc}25` }}>
                        <div className="absolute inset-0 rounded-3xl" style={{ background: `radial-gradient(ellipse 70% 70% at 50% 50%,${bc}10,transparent)` }} />
                        <div className="relative z-10">
                            <h3 className="text-2xl sm:text-3xl font-black mb-3">Prêt à nous rejoindre ?</h3>
                            <p className="text-slate-400 mb-8 max-w-md mx-auto">
                                Soumettez votre demande d&apos;inscription dès maintenant et faites partie de notre communauté académique.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                <a href="#inscription">
                                    <Button className="font-bold rounded-2xl px-8 h-12 text-white shadow-2xl"
                                        style={{ background: `linear-gradient(135deg,${bc},${bc}bb)`, boxShadow: `0 16px 40px ${bc}40` }}>
                                        <FileText className="w-4 h-4 mr-2" />
                                        Demande d&apos;inscription
                                    </Button>
                                </a>
                                {org.phone && (
                                    <a href={`tel:${org.phone}`}>
                                        <Button variant="outline" className="rounded-2xl px-8 h-12 border-white/15 text-slate-300 hover:bg-white/5">
                                            <Phone className="w-4 h-4 mr-2" />
                                            Appeler maintenant
                                        </Button>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer bottom */}
                <div className="border-t border-white/[0.04]">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-3">
                                {org.logo_url
                                    ? <img src={org.logo_url} alt={org.name} className="w-9 h-9 rounded-xl object-contain bg-white/10 p-0.5" />
                                    : <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg,${bc},${bc}90)` }}>
                                        <GraduationCap className="w-5 h-5 text-white" />
                                      </div>
                                }
                                <div>
                                    <p className="font-bold text-sm">{org.name}</p>
                                    <p className="text-[10px] text-slate-600">{typeLabels[org.type] || org.type}</p>
                                </div>
                            </div>

                            {socials.length > 0 && (
                                <div className="flex items-center gap-2">
                                    {socials.map((s, i) => (
                                        <a key={i} href={s.url!} target="_blank" rel="noreferrer"
                                            className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center hover:bg-white/[0.08] hover:border-white/15 transition-all hover:scale-110"
                                            title={s.label}>
                                            <s.icon className="w-4 h-4 text-slate-400" />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-600">
                            <p>{org.footer_text || `© ${new Date().getFullYear()} ${org.name}. Tous droits réservés.`}</p>
                            <p>
                                Propulsé par{' '}
                                <Link href="/" className="font-bold transition-colors hover:text-slate-400" style={{ color: bc }}>CampusFlow</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
