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
    Building2, FileText, AlertCircle, Key, Copy, Check, ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { orgPath } from '@/lib/custom-domain';
import { AdsBanner } from '@/components/campus/ads-banner';
import { OfficialAnnouncements } from '@/components/campus/official-announcements';
import { TemplateHubOnglets } from '@/components/campus/landing-templates/template-hub-onglets';
import { TemplateSegmentedHub } from '@/components/campus/landing-templates/template-segmented-hub';
import { TemplateGlassShowcase } from '@/components/campus/landing-templates/template-glass-showcase';
import { TemplateBentoGrid } from '@/components/campus/landing-templates/template-bento-grid';
import { TemplateBentoBox } from '@/components/campus/landing-templates/template-bento-box';
import { SchoolReviewsSection } from '@/components/campus/school-reviews';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface Org {
    id: string; name: string; slug: string; type: string; motto: string;
    logo_url: string; city: string; country: string; quarter: string;
    phone: string; whatsapp: string; email: string; brand_color: string;
    hero_image_url?: string; hero_title?: string; hero_subtitle?: string;
    hero_template?: 'full' | 'split' | 'minimal';
    landing_layout?: string;
    about_text?: string; about_image_url?: string;
    gallery_images?: string[];
    social_facebook?: string; social_instagram?: string; social_twitter?: string;
    social_tiktok?: string; social_youtube?: string; social_linkedin?: string;
    footer_text?: string;
    is_active?: boolean;
    suspension_reason?: string;
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
    const [mobileMenu, setMobileMenu] = useState(false);
    const [scrolled, setScrolled]     = useState(false);

    // Inscription multi-step
    const [inscStep, setInscStep]                   = useState(0);
    const [selectedClassroom, setSelectedClassroom] = useState<any>(null);
    const [inscForm, setInscForm] = useState({ first_name: '', last_name: '', birth_date: '', gender: '', phone: '', email: '', address: '', nationality: 'Camerounaise', guardian_name: '', guardian_phone: '' });
    const [inscPin, setInscPin]           = useState(['', '', '', '']);
    const [inscPinConfirm, setInscPinConfirm] = useState(['', '', '', '']);
    const [inscSubmitting, setInscSubmitting] = useState(false);
    const [generatedCode, setGeneratedCode]   = useState('');
    const [showCredModal, setShowCredModal]   = useState(false);
    const [credSaved, setCredSaved]           = useState(false);
    const [codeCopied, setCodeCopied]         = useState(false);

    // Gallery lightbox with navigation
    const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

    // Scroll tracking
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 60);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const scrollToInscription = () => {
        const el = document.getElementById('inscription');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
        }
    };

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

    // Generate 12-char alphanumeric access code
    const generateAccessCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };

    const copyCode = () => {
        navigator.clipboard.writeText(generatedCode).then(() => {
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2500);
        });
    };

    // Inscription submit
    const handleInscription = async () => {
        if (!org) return;
        if (!inscForm.first_name || !inscForm.last_name) { toast.error('Prénom et nom sont obligatoires'); return; }
        if (!inscForm.phone) { toast.error('Le numéro de téléphone est obligatoire'); return; }
        const pinStr = inscPin.join('');
        const pinConfirmStr = inscPinConfirm.join('');
        if (pinStr.length !== 4) { toast.error('Créez un code PIN à 4 chiffres'); return; }
        if (pinStr !== pinConfirmStr) { toast.error('Les codes PIN ne correspondent pas'); return; }

        setInscSubmitting(true);

        // ── Vérification doublon d'identité (étudiant déjà existant dans l'école) ──
        const { data: existingStudent } = await supabase
            .from('student_profiles')
            .select('id')
            .eq('organization_id', org.id)
            .ilike('first_name', inscForm.first_name.trim())
            .ilike('last_name', inscForm.last_name.trim())
            .limit(1);

        if (existingStudent && existingStudent.length > 0) {
            toast.error(`Un étudiant nommé "${inscForm.first_name.trim()} ${inscForm.last_name.trim()}" existe déjà dans cet établissement.`);
            setInscSubmitting(false);
            return;
        }

        // ── Vérification doublon dans les demandes en attente ──
        const { data: existing } = await supabase
            .from('inscription_requests')
            .select('id, status')
            .eq('organization_id', org.id)
            .eq('first_name', inscForm.first_name.trim())
            .eq('last_name', inscForm.last_name.trim())
            .limit(1);

        if (existing && existing.length > 0) {
            const st = existing[0].status;
            const msg = st === 'pending'   ? 'Une demande avec ces informations est déjà en attente de validation.' :
                        st === 'accepted'  ? 'Ce profil est déjà inscrit. Utilisez votre code d\'accès pour vous connecter.' :
                        st === 'rejected'  ? 'Cette demande a déjà été refusée. Contactez l\'administration.' :
                        'Une demande avec ces informations existe déjà.';
            toast.error(msg);
            setInscSubmitting(false);
            return;
        }

        const code = generateAccessCode();
        const payload = {
            organization_id: org.id,
            first_name:  inscForm.first_name.trim(),
            last_name:   inscForm.last_name.trim(),
            phone:       inscForm.phone.trim(),
            access_code: code,
            pin_code:    pinStr,
            ...(inscForm.birth_date    && { birth_date:    inscForm.birth_date }),
            ...(inscForm.gender        && { gender:        inscForm.gender }),
            ...(inscForm.email         && { email:         inscForm.email }),
            ...(inscForm.address       && { address:       inscForm.address }),
            ...(inscForm.nationality   && { nationality:   inscForm.nationality }),
            ...(inscForm.guardian_name && { guardian_name: inscForm.guardian_name }),
            ...(inscForm.guardian_phone && { guardian_phone: inscForm.guardian_phone }),
            ...(selectedClassroom      && { classroom_id:  selectedClassroom.id }),
            ...(selectedClassroom?.filiere_id && { filiere_id: selectedClassroom.filiere_id }),
        };

        // ── Appel via Cloudflare Worker (bypass RLS, SPA statique) ───────
        const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL
            || 'https://campusflow-worker.kleintaptue1.workers.dev';
        try {
            const res = await fetch(`${workerUrl}/api/inscription`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error('Erreur : ' + (data.error || res.statusText));
                setInscSubmitting(false);
                return;
            }
        } catch (err: any) {
            toast.error('Erreur réseau : ' + err.message);
            setInscSubmitting(false);
            return;
        }

        setGeneratedCode(code);
        setShowCredModal(true);
        setInscSubmitting(false);
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

    // ── Suspension : Portail Indisponible ───────────────────────────────
    if (org.is_active === false) return (
        <div className="min-h-screen bg-[#08090E] flex flex-col items-center justify-center text-white p-8 text-center relative overflow-hidden">
            <div className="absolute w-[500px] h-[500px] rounded-full bg-red-600/10 blur-[150px] pointer-events-none -top-32" />
            <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mb-6 shadow-2xl shadow-red-500/10">
                <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <span className="px-3.5 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/25 mb-3">
                Portail Actuellement Indisponible
            </span>
            <h1 className="text-3xl font-black mb-3 text-white max-w-lg">
                {org.name} est temporairement indisponible
            </h1>
            <p className="text-slate-400 mb-8 max-w-md text-sm leading-relaxed">
                Ce portail d&apos;établissement est momentanément suspendu ou fait l&apos;objet d&apos;une vérification administrative. Si vous êtes l&apos;administrateur de cette école, veuillez vous connecter pour consulter les détails.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <Link href={orgPath(orgSlug, '/login')}>
                    <Button className="rounded-2xl px-6 bg-red-600 hover:bg-red-500 text-white font-bold h-11 shadow-lg shadow-red-600/20">
                        Espace Administration
                    </Button>
                </Link>
                <Link href="/">
                    <Button variant="outline" className="rounded-2xl px-6 border-white/10 text-slate-300 hover:text-white h-11">
                        Retour à IziTeach
                    </Button>
                </Link>
            </div>
        </div>
    );

    const bc   = org.brand_color || '#14b8a6';
    const hero = org.hero_title || org.name;
    const sub  = org.hero_subtitle || org.motto || `Bienvenue sur le portail officiel de ${org.name}`;
    const heroTemplate = org.hero_template || (typeof window !== 'undefined' ? (localStorage.getItem(`campusflow_hero_template_${org.id}`) || localStorage.getItem(`campusflow_hero_template_${org.slug}`)) : null) || 'full';
    const landingLayout = org.landing_layout || (typeof window !== 'undefined' ? (localStorage.getItem(`campusflow_landing_layout_${org.id}`) || localStorage.getItem(`campusflow_landing_layout_${org.slug}`)) : null) || 'classic';
    const gallery = org.gallery_images || [];
    const socials = [
        { url: org.social_facebook,  icon: Facebook,  label: 'Facebook' },
        { url: org.social_instagram, icon: Instagram, label: 'Instagram' },
        { url: org.social_twitter,   icon: Twitter,   label: 'Twitter' },
        { url: org.social_youtube,   icon: Youtube,   label: 'YouTube' },
        { url: org.social_linkedin,  icon: Linkedin,  label: 'LinkedIn' },
        { url: org.social_tiktok,    icon: Globe,     label: 'TikTok' },
    ].filter(s => s.url);

    // Helpers for gallery nav
    const openGallery = (idx: number) => { setGalleryIndex(idx); };
    const prevImg = () => setGalleryIndex(i => i !== null && i > 0 ? i - 1 : gallery.length - 1);
    const nextImg = () => setGalleryIndex(i => i !== null && i < gallery.length - 1 ? i + 1 : 0);

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

            {/* ═══ NAVBAR (Affichée en mode classique) ═════════════════ */}
            {landingLayout === 'classic' && (
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
                        <Link href={orgPath(orgSlug, 'login')}>
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
            )}

            {/* ═══ HERO : 3 MODÈLES PREMIUM (Affichés uniquement en mode classique) ═══ */}
            {landingLayout === 'classic' && (
                <>
                    {heroTemplate === 'split' ? (
                <section className="relative z-10 pt-24 pb-16 min-h-[90svh] flex flex-col justify-center overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[140px] opacity-25" style={{ background: bc }} />
                        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[160px] opacity-20 bg-teal-500" />
                    </div>

                    <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 w-full">
                        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                            {/* Left Column: Text & CTA */}
                            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}
                                className="lg:col-span-7 text-left order-2 lg:order-1">
                                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border mb-5"
                                    style={{ backgroundColor: `${bc}18`, borderColor: `${bc}40`, color: bc }}>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    {typeLabels[org.type] || org.type}
                                    {org.city && <><span className="w-1 h-1 rounded-full bg-current opacity-50 mx-0.5" /><span className="opacity-80">{org.city}</span></>}
                                </div>

                                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-[1.08] tracking-tight mb-5">
                                    <span className="block text-white">{hero}</span>
                                    {org.motto && hero !== org.motto && (
                                        <span className="block text-xl sm:text-2xl lg:text-3xl font-light text-slate-400 mt-2">{org.motto}</span>
                                    )}
                                </h1>

                                <p className="text-base sm:text-lg text-slate-300/90 max-w-xl leading-relaxed mb-8">
                                    {sub}
                                </p>

                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                    <a href="#inscription">
                                        <Button size="lg" className="w-full sm:w-auto text-base px-8 h-13 font-black rounded-2xl text-white shadow-2xl transition-all hover:scale-[1.02]"
                                            style={{ background: `linear-gradient(135deg,${bc},${bc}bb)`, boxShadow: `0 16px 40px ${bc}35` }}>
                                            <FileText className="w-5 h-5 mr-2" />
                                            Demande d&apos;inscription
                                            <ArrowRight className="w-5 h-5 ml-2" />
                                        </Button>
                                    </a>
                                    <Link href={orgPath(orgSlug, 'login')}>
                                        <Button variant="outline" size="lg"
                                            className="w-full sm:w-auto text-base px-8 h-13 border-white/15 text-white/80 hover:bg-white/5 rounded-2xl transition-all hover:scale-[1.02]">
                                            <GraduationCap className="w-5 h-5 mr-2" />
                                            Espace élève
                                        </Button>
                                    </Link>
                                </div>

                                <div className="mt-8 flex items-center gap-2 text-xs text-slate-500">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {[org.quarter, org.city, org.country].filter(Boolean).join(', ')}
                                </div>
                            </motion.div>

                            {/* Right Column: Image Card with Floating Badges */}
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.2 }}
                                className="lg:col-span-5 order-1 lg:order-2">
                                <div className="relative group">
                                    <div className="absolute inset-0 rounded-3xl blur-2xl scale-105 opacity-30 group-hover:opacity-40 transition-opacity" style={{ background: bc }} />
                                    <div className="relative rounded-3xl overflow-hidden border border-white/15 bg-white/[0.04] backdrop-blur-md shadow-2xl p-2.5">
                                        {org.hero_image_url ? (
                                            <img
                                                src={org.hero_image_url}
                                                alt={org.name}
                                                className="w-full aspect-[16/10] sm:aspect-[4/3] object-cover rounded-2xl border border-white/10"
                                            />
                                        ) : (
                                            <div className="w-full aspect-[16/10] rounded-2xl flex flex-col items-center justify-center p-6 text-center"
                                                style={{ background: `linear-gradient(135deg, ${bc}25, rgba(255,255,255,0.02))` }}>
                                                <GraduationCap className="w-16 h-16 mb-3" style={{ color: bc }} />
                                                <p className="font-bold text-white text-lg">{org.name}</p>
                                                <p className="text-xs text-slate-400 mt-1">Excellence & Réussite</p>
                                            </div>
                                        )}

                                        {/* Floating Badge */}
                                        <div className="absolute bottom-5 left-5 right-5 p-3 rounded-xl bg-[#0B0E14]/85 backdrop-blur-md border border-white/10 flex items-center justify-between shadow-xl">
                                            <div className="flex items-center gap-2.5">
                                                {org.logo_url ? (
                                                    <img src={org.logo_url} alt="" className="w-8 h-8 rounded-lg object-contain bg-white/10 p-1" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs" style={{ background: bc }}>🎓</div>
                                                )}
                                                <div>
                                                    <p className="text-xs font-bold text-white">{org.name}</p>
                                                    <p className="text-[10px] text-emerald-400 font-medium">Inscriptions ouvertes 2026</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-white/10 text-white">⭐ 100% Pro</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>
            ) : heroTemplate === 'minimal' ? (
                /* MODÈLE 3 : MINIMALISTE LUXE (Mesh Gradient, pur & prestige) */
                <section className="relative z-10 pt-20 pb-16 min-h-[85svh] flex flex-col justify-center overflow-hidden text-center">
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 opacity-40" style={{
                            backgroundImage: `radial-gradient(ellipse 70% 50% at 50% 40%, ${bc}30 0%, transparent 70%)`
                        }} />
                        <div className="absolute inset-0 opacity-[0.04]"
                            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
                    </div>

                    <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-16">
                        {/* Logo emblème */}
                        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
                            className="mb-8 flex justify-center">
                            {org.logo_url ? (
                                <div className="relative">
                                    <div className="absolute inset-0 rounded-full blur-2xl scale-125 opacity-40" style={{ background: bc }} />
                                    <img src={org.logo_url} alt={org.name}
                                        className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full object-contain bg-[#0F131D] p-3 border-2 border-white/15 shadow-2xl" />
                                </div>
                            ) : (
                                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl flex items-center justify-center border border-white/15 shadow-2xl"
                                    style={{ background: `linear-gradient(135deg,${bc}50,${bc}15)` }}>
                                    <GraduationCap className="w-12 h-12 sm:w-16 sm:h-16" style={{ color: bc }} />
                                </div>
                            )}
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border mb-6"
                            style={{ backgroundColor: `${bc}18`, borderColor: `${bc}40`, color: bc }}>
                            <Sparkles className="w-3.5 h-3.5" />
                            {typeLabels[org.type] || org.type}
                            {org.city && <><span className="w-1 h-1 rounded-full bg-current opacity-50 mx-0.5" /><span className="opacity-80">{org.city}</span></>}
                        </motion.div>

                        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }}
                            className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6">
                            <span className="block text-white">{hero}</span>
                            {org.motto && hero !== org.motto && (
                                <span className="block text-2xl sm:text-3xl lg:text-4xl font-light text-slate-400 mt-2">{org.motto}</span>
                            )}
                        </motion.h1>

                        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                            className="text-lg sm:text-xl text-slate-300/90 max-w-2xl mx-auto leading-relaxed mb-10">
                            {sub}
                        </motion.p>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                            className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
                            <a href="#inscription">
                                <Button size="lg" className="w-full sm:w-auto text-base px-8 h-14 font-black rounded-2xl text-white shadow-2xl transition-all hover:scale-[1.02]"
                                    style={{ background: `linear-gradient(135deg,${bc},${bc}bb)`, boxShadow: `0 20px 50px ${bc}40` }}>
                                    <FileText className="w-5 h-5 mr-2" />
                                    Demande d&apos;inscription
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </a>
                            <Link href={orgPath(orgSlug, 'login')}>
                                <Button variant="outline" size="lg"
                                    className="w-full sm:w-auto text-base px-8 h-14 border-white/15 text-white/80 hover:bg-white/5 rounded-2xl transition-all hover:scale-[1.02]">
                                    <GraduationCap className="w-5 h-5 mr-2" />
                                    Espace étudiant
                                </Button>
                            </Link>
                        </motion.div>
                    </div>
                </section>
            ) : (
                /* MODÈLE 1 : PLEIN ÉCRAN IMMERSIF (avec gradients protecteurs multi-écrans) */
                <section className="relative z-10 pt-20 pb-16 min-h-[95svh] flex flex-col justify-center overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden">
                        {org.hero_image_url ? (
                            <>
                                <img
                                    src={org.hero_image_url}
                                    alt={org.name}
                                    className="absolute inset-0 w-full h-full object-cover object-center"
                                    loading="eager"
                                    decoding="async"
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-[#08090E]/80 via-[#08090E]/70 to-[#08090E]" />
                                <div className="absolute inset-0 bg-gradient-to-r from-[#08090E]/60 via-transparent to-[#08090E]/40" />
                            </>
                        ) : (
                            <div className="absolute inset-0">
                                <div className="absolute inset-0" style={{
                                    backgroundImage: `radial-gradient(ellipse 80% 60% at 50% 30%, ${bc}25 0%, transparent 70%)`
                                }} />
                                <div className="absolute inset-0 opacity-[0.03]"
                                    style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
                            </div>
                        )}
                    </div>

                    <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center">
                        {/* Logo badge */}
                        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
                            className="mb-6 flex justify-center">
                            {org.logo_url ? (
                                <div className="relative">
                                    <div className="absolute inset-0 rounded-3xl blur-2xl scale-110 opacity-30" style={{ background: bc }} />
                                    <img src={org.logo_url} alt={org.name}
                                        className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-3xl object-contain bg-white/10 backdrop-blur-sm p-2 border border-white/10 shadow-2xl" />
                                </div>
                            ) : (
                                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl"
                                    style={{ background: `linear-gradient(135deg,${bc}40,${bc}15)` }}>
                                    <GraduationCap className="w-12 h-12 sm:w-16 sm:h-16" style={{ color: bc }} />
                                </div>
                            )}
                        </motion.div>

                        {/* Pill badge */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border mb-5"
                            style={{ backgroundColor: `${bc}18`, borderColor: `${bc}40`, color: bc }}>
                            <Sparkles className="w-3 h-3" />
                            {typeLabels[org.type] || org.type}
                            {org.city && <><span className="w-1 h-1 rounded-full bg-current opacity-50 mx-0.5" /><span className="opacity-70">{org.city}</span></>}
                        </motion.div>

                        {/* Title */}
                        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }}
                            className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-5">
                            <span className="block text-white">{hero}</span>
                            {org.motto && hero !== org.motto && (
                                <span className="block text-2xl sm:text-3xl lg:text-4xl font-light text-slate-300 mt-2">{org.motto}</span>
                            )}
                        </motion.h1>

                        {/* Subtitle */}
                        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                            className="text-lg sm:text-xl text-slate-200/90 max-w-2xl mx-auto leading-relaxed mb-8">
                            {sub}
                        </motion.p>

                        {/* CTA buttons */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                            className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <a href="#inscription" onClick={scrollToInscription}>
                                <Button size="lg" className="text-base px-8 h-14 font-black rounded-2xl text-white shadow-2xl transition-all hover:scale-[1.02]"
                                    style={{ background: `linear-gradient(135deg,${bc},${bc}bb)`, boxShadow: `0 20px 50px ${bc}40` }}>
                                    <FileText className="w-5 h-5 mr-2" />
                                    Demande d&apos;inscription
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </a>
                            <Link href={orgPath(orgSlug, 'login')}>
                                <Button variant="outline" size="lg"
                                    className="text-base px-8 h-14 border-white/15 text-white/80 hover:bg-white/5 rounded-2xl transition-all hover:scale-[1.02]">
                                    <GraduationCap className="w-5 h-5 mr-2" />
                                    Espace étudiant
                                </Button>
                            </Link>
                        </motion.div>

                        {/* Location */}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                            className="mt-8 inline-flex items-center gap-2 text-sm text-slate-400">
                            <MapPin className="w-3.5 h-3.5" />
                            {[org.quarter, org.city, org.country].filter(Boolean).join(', ')}
                        </motion.div>
                    </div>
                </section>
                )}
                </>
            )}

            {/* ═══ TEMPLATES COMPLETS MODERNES (ZERO SCROLL) ═══ */}
            {landingLayout === 'hub_onglets' ? (
                <TemplateHubOnglets
                    org={org}
                    orgSlug={orgSlug}
                    classrooms={classrooms}
                    filieres={filieres}
                    teacherCount={teacherCount}
                    studentCount={studentCount}
                    gallery={gallery}
                    bc={bc}
                    onOpenInscription={scrollToInscription}
                />
            ) : landingLayout === 'segmented_hub' ? (
                <TemplateSegmentedHub
                    org={org}
                    orgSlug={orgSlug}
                    classrooms={classrooms}
                    filieres={filieres}
                    teacherCount={teacherCount}
                    studentCount={studentCount}
                    gallery={gallery}
                    bc={bc}
                    onOpenInscription={scrollToInscription}
                />
            ) : landingLayout === 'glass_showcase' ? (
                <TemplateGlassShowcase
                    org={org}
                    orgSlug={orgSlug}
                    classrooms={classrooms}
                    filieres={filieres}
                    teacherCount={teacherCount}
                    studentCount={studentCount}
                    gallery={gallery}
                    bc={bc}
                    onOpenInscription={scrollToInscription}
                />
            ) : landingLayout === 'bento_grid' ? (
                <TemplateBentoGrid
                    org={org}
                    orgSlug={orgSlug}
                    classrooms={classrooms}
                    filieres={filieres}
                    teacherCount={teacherCount}
                    studentCount={studentCount}
                    gallery={gallery}
                    bc={bc}
                    onOpenInscription={scrollToInscription}
                />
            ) : landingLayout === 'bento_box' ? (
                <TemplateBentoBox
                    org={org}
                    orgSlug={orgSlug}
                    classrooms={classrooms}
                    filieres={filieres}
                    teacherCount={teacherCount}
                    studentCount={studentCount}
                    gallery={gallery}
                    bc={bc}
                    onOpenInscription={scrollToInscription}
                />
            ) : (
                <>
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {gallery.map((img: string, i: number) => (
                            <motion.div key={i}
                                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                                className="relative group overflow-hidden rounded-2xl border border-white/10 cursor-pointer aspect-square"
                                onClick={() => openGallery(i)}>
                                <img src={img} alt={`Photo ${i + 1}`}
                                    className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" loading="lazy" decoding="async" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-between p-3">
                                    <span className="text-[10px] text-white/70 font-medium">{i + 1}/{gallery.length}</span>
                                    <ArrowUpRight className="w-4 h-4 text-white" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Lightbox avec navigation ──────────────────────────── */}
            <AnimatePresence>
                {galleryIndex !== null && gallery[galleryIndex] && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
                        onClick={() => setGalleryIndex(null)}>
                        {/* Close */}
                        <button className="absolute top-5 right-5 p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-all z-10"
                            onClick={e => { e.stopPropagation(); setGalleryIndex(null); }}>
                            <X className="w-5 h-5" />
                        </button>
                        {/* Counter */}
                        <div className="absolute top-5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/10 text-xs font-semibold text-white z-10">
                            {galleryIndex + 1} / {gallery.length}
                        </div>
                        {/* Prev */}
                        {gallery.length > 1 && (
                            <button className="absolute left-3 sm:left-6 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all z-10"
                                onClick={e => { e.stopPropagation(); prevImg(); }}>
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                        )}
                        {/* Next */}
                        {gallery.length > 1 && (
                            <button className="absolute right-3 sm:right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all z-10"
                                onClick={e => { e.stopPropagation(); nextImg(); }}>
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        )}
                        {/* Image */}
                        <motion.img
                            key={galleryIndex}
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', damping: 22 }}
                            src={gallery[galleryIndex]} alt={`Photo ${galleryIndex + 1}`}
                            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                            onClick={e => e.stopPropagation()} />
                        {/* Thumbnails */}
                        {gallery.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-[90vw] overflow-x-auto pb-1">
                                {gallery.map((img: string, i: number) => (
                                    <button key={i} onClick={e => { e.stopPropagation(); setGalleryIndex(i); }}
                                        className={cn('shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all',
                                            i === galleryIndex ? 'border-white scale-110' : 'border-white/20 opacity-60 hover:opacity-100')}>
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
            </>
            )}

            {/* ═══ AVIS DES ÉLÈVES & ENSEIGNANTS ════════════════════ */}
            <div id="reviews">
                <SchoolReviewsSection org={org} orgSlug={orgSlug} brandColor={bc} />
            </div>

            {/* ═══ INSCRIPTION FORM ══════════════════════════════════ */}
            <section id="inscription" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-20">
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
                        Choisissez votre classe, renseignez vos informations et créez votre code d&apos;accès personnel en quelques étapes.
                    </motion.p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    className="max-w-2xl mx-auto">

                    {/* ── Step indicator ── */}
                    <div className="flex items-center mb-8 px-2">
                        {[
                            { label: 'Classe', icon: BookOpen },
                            { label: 'Informations', icon: User },
                            { label: 'Code PIN', icon: Key },
                        ].map((step, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <div className="flex items-center w-full">
                                    {i > 0 && <div className={cn('flex-1 h-0.5 transition-all', i <= inscStep ? 'opacity-100' : 'opacity-20')} style={{ background: bc }} />}
                                    <div className={cn(
                                        'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 shrink-0',
                                        inscStep === i ? 'text-white shadow-lg' :
                                        i < inscStep  ? 'bg-emerald-500 text-white' : 'bg-white/[0.06] text-slate-500'
                                    )} style={inscStep === i ? { background: `linear-gradient(135deg,${bc},${bc}bb)`, boxShadow: `0 6px 18px ${bc}40` } : {}}>
                                        {i < inscStep ? <CheckCircle2 className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                                    </div>
                                    {i < 2 && <div className={cn('flex-1 h-0.5 transition-all', i < inscStep ? 'opacity-100' : 'opacity-20')} style={{ background: bc }} />}
                                </div>
                                <span className={cn('text-[10px] font-semibold mt-1', inscStep === i ? 'text-white' : i < inscStep ? 'text-emerald-400' : 'text-slate-600')}>{step.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                        <AnimatePresence mode="wait">

                            {inscStep === 0 && (
                                <motion.div key="ins0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="p-6 sm:p-8 space-y-5">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <BookOpen className="w-4 h-4" style={{ color: bc }} />
                                            <span className="font-bold text-white">Choisissez votre classe</span>
                                        </div>
                                        <p className="text-xs text-slate-500">Sélectionnez la classe dans laquelle vous souhaitez vous inscrire. Elle sera automatiquement assignée à votre dossier.</p>
                                    </div>

                                    {classrooms.length === 0 ? (
                                        <div className="text-center py-10 text-slate-500 text-sm">
                                            Aucune classe disponible pour le moment.
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* ── Dropdown sélecteur ── */}
                                            <div>
                                                <label className="text-xs text-slate-400 mb-1.5 block font-medium">
                                                    Niveau / Classe souhaitée <span className="text-red-400">*</span>
                                                </label>
                                                <select
                                                    value={selectedClassroom?.id || ''}
                                                    onChange={e => {
                                                        const cls = classrooms.find((c: any) => c.id === e.target.value) || null;
                                                        setSelectedClassroom(cls);
                                                    }}
                                                    className="w-full h-12 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm focus:outline-none focus:border-white/25 transition-colors [color-scheme:dark] appearance-none cursor-pointer"
                                                    style={{ borderColor: selectedClassroom ? `${bc}50` : undefined }}
                                                >
                                                    <option value="" className="bg-[#111]">— Sélectionner une classe —</option>
                                                    {classrooms.map((c: any) => {
                                                        const fil = filieres.find((f: any) => f.id === c.filiere_id);
                                                        return (
                                                            <option key={c.id} value={c.id} className="bg-[#111]">
                                                                {c.name}{c.cycle ? ` (${c.cycle})` : ''}{fil ? ` — ${fil.nom}` : ''}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>

                                            {/* ── Pastilles rapides (si ≤ 12 classes) ── */}
                                            {classrooms.length <= 12 && (
                                                <div>
                                                    <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-2">Ou sélectionnez directement</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {classrooms.map((c: any) => {
                                                            const sel = selectedClassroom?.id === c.id;
                                                            return (
                                                                <button key={c.id}
                                                                    onClick={() => setSelectedClassroom(sel ? null : c)}
                                                                    className={cn(
                                                                        'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border',
                                                                        sel
                                                                            ? 'text-white border-transparent shadow-lg'
                                                                            : 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:bg-white/[0.08] hover:border-white/15'
                                                                    )}
                                                                    style={sel ? {
                                                                        background: `linear-gradient(135deg,${bc},${bc}bb)`,
                                                                        boxShadow: `0 4px 15px ${bc}35`
                                                                    } : {}}>
                                                                    {c.name}
                                                                    {c.cycle && <span className="ml-1.5 opacity-60 text-[10px]">({c.cycle})</span>}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {selectedClassroom && (
                                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                            className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl border"
                                            style={{ backgroundColor: `${bc}10`, borderColor: `${bc}30`, color: bc }}>
                                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                                            <span>Sélectionné : <strong>{selectedClassroom.name}</strong>
                                                {filieres.find((f: any) => f.id === selectedClassroom.filiere_id) && (
                                                    <span className="opacity-70"> — {filieres.find((f: any) => f.id === selectedClassroom.filiere_id)?.nom}</span>
                                                )}
                                            </span>
                                        </motion.div>
                                    )}

                                    <div className="pt-2 flex justify-end">
                                        <Button onClick={() => {
                                            if (!selectedClassroom) { toast.error('Veuillez sélectionner une classe'); return; }
                                            setInscStep(1);
                                        }} className="rounded-xl px-8 font-bold text-white"
                                            style={{ background: `linear-gradient(135deg,${bc},${bc}bb)` }}>
                                            Continuer <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}


                            {/* ── Étape 1 : Informations personnelles ── */}
                            {inscStep === 1 && (
                                <motion.div key="ins1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="p-6 sm:p-8 space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <User className="w-4 h-4" style={{ color: bc }} />
                                        <span className="font-bold text-white">Vos informations personnelles</span>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Prénom <span className="text-red-400">*</span></label>
                                            <input value={inscForm.first_name} onChange={e => setInscForm(f => ({ ...f, first_name: e.target.value }))}
                                                placeholder="Ex : Marie"
                                                className="w-full h-11 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Nom <span className="text-red-400">*</span></label>
                                            <input value={inscForm.last_name} onChange={e => setInscForm(f => ({ ...f, last_name: e.target.value }))}
                                                placeholder="Ex : Dupont"
                                                className="w-full h-11 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors" />
                                        </div>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Date de naissance</label>
                                            <input type="date" value={inscForm.birth_date} onChange={e => setInscForm(f => ({ ...f, birth_date: e.target.value }))}
                                                className="w-full h-11 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm focus:outline-none focus:border-white/25 transition-colors [color-scheme:dark]" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Genre</label>
                                            <select value={inscForm.gender} onChange={e => setInscForm(f => ({ ...f, gender: e.target.value }))}
                                                className="w-full h-11 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm focus:outline-none focus:border-white/25 transition-colors [color-scheme:dark]">
                                                <option value="" className="bg-[#111]">Sélectionner</option>
                                                <option value="male" className="bg-[#111]">Masculin</option>
                                                <option value="female" className="bg-[#111]">Féminin</option>
                                                <option value="other" className="bg-[#111]">Autre</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1.5 block font-medium">Téléphone <span className="text-red-400">*</span></label>
                                        <input value={inscForm.phone} onChange={e => setInscForm(f => ({ ...f, phone: e.target.value }))}
                                            placeholder="Ex : +237 6XX XXX XXX"
                                            className="w-full h-11 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors" />
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Email</label>
                                            <input type="email" value={inscForm.email} onChange={e => setInscForm(f => ({ ...f, email: e.target.value }))}
                                                placeholder="exemple@email.com"
                                                className="w-full h-11 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Quartier / Adresse</label>
                                            <input value={inscForm.address} onChange={e => setInscForm(f => ({ ...f, address: e.target.value }))}
                                                placeholder="Ex : Bastos, Yaoundé"
                                                className="w-full h-11 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors" />
                                        </div>
                                    </div>
                                    {/* Nationalité + Tuteur */}
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Nationalité</label>
                                            <input value={inscForm.nationality} onChange={e => setInscForm(f => ({ ...f, nationality: e.target.value }))}
                                                placeholder="Ex : Camerounaise"
                                                className="w-full h-11 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Nom du tuteur / parent</label>
                                            <input value={inscForm.guardian_name} onChange={e => setInscForm(f => ({ ...f, guardian_name: e.target.value }))}
                                                placeholder="Ex : Jean Dupont"
                                                className="w-full h-11 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1.5 block font-medium">Téléphone du tuteur / parent</label>
                                        <input value={inscForm.guardian_phone} onChange={e => setInscForm(f => ({ ...f, guardian_phone: e.target.value }))}
                                            placeholder="Ex : +237 6XX XXX XXX"
                                            className="w-full h-11 bg-white/[0.04] border border-white/10 text-white rounded-xl px-4 text-sm placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors" />
                                    </div>
                                    <div className="pt-4 flex justify-between">
                                        <Button variant="outline" onClick={() => setInscStep(0)}
                                            className="rounded-xl border-white/15 text-slate-300 hover:bg-white/5">← Retour</Button>
                                        <Button onClick={() => {
                                            if (!inscForm.first_name || !inscForm.last_name) { toast.error('Prénom et nom obligatoires'); return; }
                                            if (!inscForm.phone) { toast.error('Téléphone obligatoire'); return; }
                                            setInscStep(2);
                                        }} className="rounded-xl px-8 font-bold text-white"
                                            style={{ background: `linear-gradient(135deg,${bc},${bc}bb)` }}>
                                            Continuer <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── Étape 2 : Code PIN ── */}
                            {inscStep === 2 && (
                                <motion.div key="ins2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="p-6 sm:p-8 space-y-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Key className="w-4 h-4" style={{ color: bc }} />
                                            <span className="font-bold text-white">Créez votre code PIN</span>
                                        </div>
                                        <p className="text-xs text-slate-500">Ce code à 4 chiffres vous permettra de vous connecter à votre espace étudiant.</p>
                                    </div>

                                    {/* PIN créer */}
                                    <div className="space-y-3">
                                        <label className="text-xs text-slate-400 font-medium block">Votre code PIN <span className="text-red-400">*</span></label>
                                        <div className="flex gap-3 justify-center">
                                            {inscPin.map((d, i) => (
                                                <input key={i} id={`npin-${i}`} type="password" inputMode="numeric" maxLength={1}
                                                    value={d} onChange={e => {
                                                        const val = e.target.value.replace(/\D/, '');
                                                        const next = [...inscPin]; next[i] = val; setInscPin(next);
                                                        if (val && i < 3) (document.getElementById(`npin-${i+1}`) as HTMLInputElement)?.focus();
                                                    }}
                                                    onKeyDown={e => { if (e.key === 'Backspace' && !d && i > 0) (document.getElementById(`npin-${i-1}`) as HTMLInputElement)?.focus(); }}
                                                    className="w-14 h-14 text-center text-2xl font-black bg-white/[0.05] border-2 rounded-2xl text-white focus:outline-none transition-all"
                                                    style={{ borderColor: d ? bc : 'rgba(255,255,255,0.1)', boxShadow: d ? `0 0 0 3px ${bc}25` : 'none' }} />
                                            ))}
                                        </div>
                                    </div>

                                    {/* PIN confirmer */}
                                    <div className="space-y-3">
                                        <label className="text-xs text-slate-400 font-medium block">Confirmez votre code PIN <span className="text-red-400">*</span></label>
                                        <div className="flex gap-3 justify-center">
                                            {inscPinConfirm.map((d, i) => {
                                                const full = inscPinConfirm.join('').length === 4;
                                                const match = inscPin.join('') === inscPinConfirm.join('');
                                                return (
                                                    <input key={i} id={`npinc-${i}`} type="password" inputMode="numeric" maxLength={1}
                                                        value={d} onChange={e => {
                                                            const val = e.target.value.replace(/\D/, '');
                                                            const next = [...inscPinConfirm]; next[i] = val; setInscPinConfirm(next);
                                                            if (val && i < 3) (document.getElementById(`npinc-${i+1}`) as HTMLInputElement)?.focus();
                                                        }}
                                                        onKeyDown={e => { if (e.key === 'Backspace' && !d && i > 0) (document.getElementById(`npinc-${i-1}`) as HTMLInputElement)?.focus(); }}
                                                        className="w-14 h-14 text-center text-2xl font-black bg-white/[0.05] border-2 rounded-2xl text-white focus:outline-none transition-all"
                                                        style={{
                                                            borderColor: d ? (full && !match ? '#ef4444' : bc) : 'rgba(255,255,255,0.1)',
                                                            boxShadow: d ? `0 0 0 3px ${full && !match ? '#ef444425' : `${bc}25`}` : 'none'
                                                        }} />
                                                );
                                            })}
                                        </div>
                                        {inscPinConfirm.join('').length === 4 && inscPin.join('') !== inscPinConfirm.join('') && (
                                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs text-center">
                                                Les codes PIN ne correspondent pas
                                            </motion.p>
                                        )}
                                    </div>

                                    {/* Récap */}
                                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Récapitulatif</p>
                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex justify-between"><span className="text-slate-500">Nom :</span><span className="text-white font-medium">{inscForm.first_name} {inscForm.last_name}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-500">Téléphone :</span><span className="text-white font-medium">{inscForm.phone}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-500">Classe :</span><span className="font-bold" style={{ color: bc }}>{selectedClassroom?.name || '—'}</span></div>
                                        </div>
                                    </div>

                                    <div className="pt-2 flex justify-between">
                                        <Button variant="outline" onClick={() => setInscStep(1)}
                                            className="rounded-xl border-white/15 text-slate-300 hover:bg-white/5">← Retour</Button>
                                        <Button onClick={handleInscription} disabled={inscSubmitting}
                                            className="rounded-xl px-8 font-black text-white shadow-xl"
                                            style={{ background: `linear-gradient(135deg,${bc},${bc}bb)`, boxShadow: `0 12px 30px ${bc}35` }}>
                                            {inscSubmitting
                                                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Envoi...</>
                                                : <><Send className="w-4 h-4 mr-2" />Finaliser l&apos;inscription</>
                                            }
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </section>

            {/* ═══ MODAL CONSERVEZ VOS ACCÈS ═════════════════════════ */}
            <AnimatePresence>
                {showCredModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.85, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.85, opacity: 0 }}
                            transition={{ type: 'spring', damping: 20 }}
                            className="w-full max-w-md rounded-3xl border bg-[#0f1117] shadow-2xl overflow-hidden"
                            style={{ borderColor: `${bc}35` }}>

                            {/* Header */}
                            <div className="relative overflow-hidden px-8 pt-8 pb-5 text-center"
                                style={{ background: `linear-gradient(135deg,${bc}20,transparent 60%)` }}>
                                <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-25" style={{ background: bc }} />
                                <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl"
                                    style={{ background: `${bc}18`, border: `1px solid ${bc}40` }}>🔐</div>
                                <h3 className="text-xl font-black text-white mb-1">Conservez précieusement vos accès !</h3>
                                <p className="text-sm text-slate-400">Vous en aurez besoin pour vous connecter à votre espace.</p>
                            </div>

                            <div className="px-8 py-6 space-y-4">
                                {/* Code d'accès */}
                                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">Code d&apos;accès (12 caractères)</p>
                                    <div className="flex items-center justify-between gap-3">
                                        <code className="text-lg sm:text-xl font-black tracking-[0.15em] text-white font-mono select-all">{generatedCode}</code>
                                        <button onClick={copyCode}
                                            className="shrink-0 p-2.5 rounded-xl transition-all hover:bg-white/10 active:scale-95"
                                            style={{ color: codeCopied ? '#22c55e' : bc }}>
                                            {codeCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* PIN */}
                                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">Votre code PIN</p>
                                    <div className="flex gap-2">
                                        {[0,1,2,3].map(i => (
                                            <div key={i} className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-lg font-black text-white">•</div>
                                        ))}
                                    </div>
                                </div>

                                {/* Avertissement */}
                                <div className="flex gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
                                    <span className="text-base shrink-0">⚠️</span>
                                    <p className="text-xs text-amber-200/90 leading-relaxed">
                                        Notez ce code dans un endroit sûr. Il ne vous sera <strong>pas envoyé par SMS ou email</strong>. Sans lui, vous ne pourrez pas accéder à votre compte.
                                    </p>
                                </div>

                                {/* Checkbox */}
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <div className="relative mt-0.5 shrink-0">
                                        <input type="checkbox" className="sr-only" checked={credSaved} onChange={e => setCredSaved(e.target.checked)} />
                                        <div className={cn(
                                            'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                                            credSaved ? 'border-transparent' : 'border-white/25 bg-white/5'
                                        )} style={credSaved ? { background: bc, borderColor: bc } : {}}>
                                            {credSaved && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                    </div>
                                    <span className="text-sm text-slate-300 leading-relaxed">
                                        J&apos;ai bien noté mon code d&apos;accès et mon code PIN. Je les ai sauvegardés en lieu sûr.
                                    </span>
                                </label>

                                {/* CTA */}
                                <button disabled={!credSaved}
                                    onClick={() => { window.location.href = orgPath(orgSlug, 'student'); }}
                                    className={cn(
                                        'w-full py-4 rounded-2xl font-black text-white transition-all text-sm',
                                        credSaved ? 'hover:opacity-90 active:scale-[0.98]' : 'opacity-35 cursor-not-allowed'
                                    )}
                                    style={{ background: credSaved ? `linear-gradient(135deg,${bc},${bc}bb)` : 'rgba(255,255,255,0.08)' }}>
                                    Accéder à mon espace →
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                                <Link href="/" className="font-bold transition-colors hover:text-slate-400" style={{ color: bc }}>IziTeach</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
