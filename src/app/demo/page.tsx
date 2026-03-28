'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    GraduationCap, ArrowRight, ArrowLeft, Users, BookOpen, CreditCard,
    Calendar, BarChart3, MessageSquare, ShieldCheck, Building2, Sparkles,
    CheckCircle2, Monitor, UserCircle, FileText, Loader2, Play, X,
    School, Globe, Star, ChevronRight, Eye, Layout
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════
// CAMPUSFLOW — INTERACTIVE DEMO PAGE
// ═══════════════════════════════════════════════

const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' as const }
    })
};

// Demo screens data
const DEMO_SCREENS = [
    {
        id: 'landing',
        title: 'Page d\'accueil personnalisée',
        description: 'Chaque établissement obtient une page publique professionnelle avec son branding, ses formations, sa galerie photo et ses coordonnées.',
        icon: Globe,
        color: 'from-teal-500 to-emerald-600',
        features: [
            'Logo et couleur de marque personnalisés',
            'Section héro avec image de couverture',
            'Liste des filières et classes',
            'Galerie photos de l\'établissement',
            'Coordonnées et réseaux sociaux',
            'SEO et domaine personnalisé',
        ],
    },
    {
        id: 'admin',
        title: 'Backoffice administrateur',
        description: 'Le directeur ou secrétaire gère toute l\'école depuis un tableau de bord puissant : professeurs, étudiants, classes, matières.',
        icon: Layout,
        color: 'from-indigo-500 to-violet-600',
        features: [
            'Création de classes et filières',
            'Gestion des matières et coefficients',
            'Inscription des professeurs et étudiants',
            'Codes d\'accès uniques à 12 caractères',
            'Saisie des notes et évaluations',
            'Gestion de l\'emploi du temps',
        ],
    },
    {
        id: 'student',
        title: 'Espace étudiant',
        description: 'Chaque étudiant accède à son espace personnel via un code d\'accès + PIN. Il peut consulter ses notes, son emploi du temps et ses paiements.',
        icon: UserCircle,
        color: 'from-blue-500 to-cyan-600',
        features: [
            'Connexion sécurisée par code + PIN',
            'Consultation des notes en temps réel',
            'Emploi du temps interactif',
            'Historique des paiements de scolarité',
            'Export PDF des bulletins',
            'Profil personnel éditable',
        ],
    },
    {
        id: 'teacher',
        title: 'Espace professeur',
        description: 'Les professeurs saisissent les notes, gèrent les présences et communiquent directement avec les étudiants de leurs classes.',
        icon: BookOpen,
        color: 'from-amber-500 to-orange-600',
        features: [
            'Saisie des notes par évaluation',
            'Gestion des présences et absences',
            'Vue globale de toutes ses classes',
            'Statistiques de performance par classe',
            'Communication avec les étudiants',
            'Export des relevés de notes',
        ],
    },
    {
        id: 'payments',
        title: 'Gestion financière',
        description: 'Suivi complet des paiements de scolarité, intégration Mobile Money (MTN MoMo, Orange Money), rapports et relances.',
        icon: CreditCard,
        color: 'from-emerald-500 to-green-600',
        features: [
            'Enregistrement des paiements',
            'Suivi des impayés en temps réel',
            'Reçus automatiques en PDF',
            'Intégration Mobile Money',
            'Rapports financiers par période',
            'Historique complet par étudiant',
        ],
    },
    {
        id: 'community',
        title: 'Forum & Communication',
        description: 'Messagerie intégrée, forum de discussions, groupes d\'étude et annonces officielles pour toute la communauté scolaire.',
        icon: MessageSquare,
        color: 'from-pink-500 to-rose-600',
        features: [
            'Messages privés entre membres',
            'Forum communautaire par sujet',
            'Groupes de discussion par classe',
            'Annonces officielles de l\'admin',
            'Partage de fichiers et médias',
            'Notifications en temps réel',
        ],
    },
];

export default function DemoPage() {
    const router = useRouter();
    const [activeScreen, setActiveScreen] = useState(0);
    const [demoOrg, setDemoOrg] = useState<any>(null);
    const [loadingOrg, setLoadingOrg] = useState(true);
    const [autoPlay, setAutoPlay] = useState(true);

    // Try to load a real demo org
    useEffect(() => {
        (async () => {
            // Try to find an existing org to showcase as demo
            const { data } = await supabase
                .from('organizations')
                .select('slug, name, logo_url, type, city, country')
                .limit(1)
                .single();
            setDemoOrg(data);
            setLoadingOrg(false);
        })();
    }, []);

    // Auto-rotate screens
    useEffect(() => {
        if (!autoPlay) return;
        const interval = setInterval(() => {
            setActiveScreen(prev => (prev + 1) % DEMO_SCREENS.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [autoPlay]);

    const screen = DEMO_SCREENS[activeScreen];

    return (
        <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-20%] right-[-15%] w-[50%] h-[50%] bg-indigo-600/8 blur-[180px] rounded-full" />
                <div className="absolute bottom-[-20%] left-[-15%] w-[40%] h-[40%] bg-blue-600/6 blur-[180px] rounded-full" />
                <div className="absolute top-[40%] left-[30%] w-[25%] h-[25%] bg-purple-600/5 blur-[150px] rounded-full" />
            </div>

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
                            CampusFlow
                        </span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link href="/">
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                                <ArrowLeft className="w-4 h-4 mr-1" /> Retour
                            </Button>
                        </Link>
                        <Link href="/onboarding">
                            <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-500/25">
                                Commencer <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative z-10 pt-28 pb-10 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm mb-6"
                    >
                        <Play className="w-3.5 h-3.5" /> Visite interactive
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight"
                    >
                        Découvrez{' '}
                        <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                            CampusFlow
                        </span>
                        {' '}en action
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-4 text-slate-400 max-w-2xl mx-auto"
                    >
                        Explorez chaque fonctionnalité de la plateforme. Cliquez sur les modules ci-dessous pour voir comment CampusFlow transforme la gestion scolaire.
                    </motion.p>
                </div>
            </section>

            {/* Screen navigation tabs */}
            <section className="relative z-10 px-4 sm:px-6 lg:px-8 pb-6">
                <div className="max-w-5xl mx-auto">
                    <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                        {DEMO_SCREENS.map((s, i) => (
                            <button
                                key={s.id}
                                onClick={() => { setActiveScreen(i); setAutoPlay(false); }}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                                    activeScreen === i
                                        ? 'bg-white/10 border border-white/20 text-white shadow-lg'
                                        : 'bg-white/[0.03] border border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.06]'
                                }`}
                            >
                                <s.icon className="w-4 h-4" />
                                {s.title.split(' ').slice(0, 2).join(' ')}
                            </button>
                        ))}
                    </div>
                    {/* Progress bar */}
                    <div className="flex gap-1 mt-3">
                        {DEMO_SCREENS.map((_, i) => (
                            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-white/5">
                                <motion.div
                                    className={`h-full rounded-full bg-gradient-to-r ${DEMO_SCREENS[i].color}`}
                                    initial={{ width: '0%' }}
                                    animate={{ width: activeScreen === i ? '100%' : activeScreen > i ? '100%' : '0%' }}
                                    transition={{ duration: activeScreen === i && autoPlay ? 5 : 0.3 }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Main demo content */}
            <section className="relative z-10 px-4 sm:px-6 lg:px-8 pb-16">
                <div className="max-w-5xl mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={screen.id}
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -40 }}
                            transition={{ duration: 0.4 }}
                            className="grid lg:grid-cols-2 gap-8 items-start"
                        >
                            {/* Left: Info */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${screen.color} flex items-center justify-center shadow-2xl`}>
                                        <screen.icon className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl sm:text-3xl font-bold">{screen.title}</h2>
                                        <p className="text-sm text-slate-400 mt-1">Module {activeScreen + 1}/{DEMO_SCREENS.length}</p>
                                    </div>
                                </div>

                                <p className="text-slate-300 text-lg leading-relaxed">
                                    {screen.description}
                                </p>

                                <div className="space-y-3">
                                    {screen.features.map((feature, i) => (
                                        <motion.div
                                            key={feature}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 + i * 0.08 }}
                                            className="flex items-center gap-3"
                                        >
                                            <CheckCircle2 className={`w-5 h-5 shrink-0 text-${screen.id === 'landing' ? 'teal' : screen.id === 'admin' ? 'indigo' : screen.id === 'student' ? 'blue' : screen.id === 'teacher' ? 'amber' : screen.id === 'payments' ? 'emerald' : 'pink'}-400`} />
                                            <span className="text-slate-300">{feature}</span>
                                        </motion.div>
                                    ))}
                                </div>

                                <div className="flex flex-wrap gap-3 pt-4">
                                    {demoOrg && screen.id === 'landing' && (
                                        <Link href={`/${demoOrg.slug}`}>
                                            <Button className={`bg-gradient-to-r ${screen.color} text-white font-bold rounded-xl shadow-lg px-6`}>
                                                <Eye className="w-4 h-4 mr-2" /> Voir un exemple live
                                            </Button>
                                        </Link>
                                    )}
                                    {demoOrg && screen.id === 'admin' && (
                                        <Link href={`/${demoOrg.slug}/login`}>
                                            <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-lg px-6">
                                                <ShieldCheck className="w-4 h-4 mr-2" /> Tester le login
                                            </Button>
                                        </Link>
                                    )}
                                    {(screen.id === 'student' || screen.id === 'teacher') && demoOrg && (
                                        <Link href={`/${demoOrg.slug}/login`}>
                                            <Button className={`bg-gradient-to-r ${screen.color} text-white font-bold rounded-xl shadow-lg px-6`}>
                                                <UserCircle className="w-4 h-4 mr-2" /> Tester la connexion
                                            </Button>
                                        </Link>
                                    )}
                                    <Link href="/onboarding">
                                        <Button variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5 rounded-xl px-6">
                                            <Building2 className="w-4 h-4 mr-2" /> Créer mon établissement
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            {/* Right: Visual mockup */}
                            <div className="relative">
                                <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm overflow-hidden shadow-2xl">
                                    {/* Browser bar */}
                                    <div className="h-10 bg-white/[0.05] border-b border-white/5 flex items-center px-4 gap-2">
                                        <div className="flex gap-1.5">
                                            <div className="w-3 h-3 rounded-full bg-red-500/40" />
                                            <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
                                            <div className="w-3 h-3 rounded-full bg-green-500/40" />
                                        </div>
                                        <div className="flex-1 ml-4">
                                            <div className="h-6 rounded-md bg-white/5 flex items-center px-3 text-xs text-slate-500 max-w-xs">
                                                🔒 campusflow.app/{demoOrg?.slug || 'votre-ecole'}/{screen.id === 'landing' ? '' : screen.id}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Screen content mockup */}
                                    <div className="p-6 min-h-[400px]">
                                        {screen.id === 'landing' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${screen.color} flex items-center justify-center`}>
                                                        <GraduationCap className="w-6 h-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold">{demoOrg?.name || 'Votre École'}</div>
                                                        <div className="text-xs text-slate-500">{demoOrg?.city || 'Votre ville'}, {demoOrg?.country || 'Cameroun'}</div>
                                                    </div>
                                                </div>
                                                <div className="h-32 rounded-xl bg-gradient-to-br from-teal-600/20 to-emerald-600/10 border border-teal-500/20 flex items-center justify-center">
                                                    <div className="text-center">
                                                        <h3 className="text-xl font-bold">Bienvenue sur notre portail</h3>
                                                        <p className="text-sm text-slate-400 mt-1">Votre slogan ici</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {['3 Filières', '12 Classes', '8 Profs', '156 Étudiants'].map((s, i) => (
                                                        <div key={i} className="p-3 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                                                            <div className="text-sm font-bold">{s.split(' ')[0]}</div>
                                                            <div className="text-[10px] text-slate-500">{s.split(' ')[1]}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="h-16 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-xs text-slate-400">📚 Galerie photos</div>
                                                    <div className="h-16 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-xs text-slate-400">📍 Contact & Info</div>
                                                </div>
                                            </div>
                                        )}

                                        {screen.id === 'admin' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="font-bold flex items-center gap-2"><Layout className="w-4 h-4 text-indigo-400" /> Tableau de bord</h3>
                                                    <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-300">Admin</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[
                                                        { label: 'Étudiants', val: '156', color: 'text-blue-400' },
                                                        { label: 'Professeurs', val: '8', color: 'text-emerald-400' },
                                                        { label: 'Classes', val: '12', color: 'text-amber-400' },
                                                    ].map((k, i) => (
                                                        <div key={i} className="p-3 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                                                            <div className={`text-lg font-bold ${k.color}`}>{k.val}</div>
                                                            <div className="text-[10px] text-slate-500">{k.label}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex gap-1 overflow-x-auto">
                                                    {['Classes', 'Matières', 'Profs', 'Étudiants', 'Notes', 'Planning'].map((tab, i) => (
                                                        <div key={i} className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${i === 0 ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400'}`}>{tab}</div>
                                                    ))}
                                                </div>
                                                <div className="space-y-2">
                                                    {['6ème A — 32 élèves', '5ème B — 28 élèves', '4ème A — 35 élèves', '3ème C — 30 élèves'].map((cls, i) => (
                                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
                                                            <span className="text-sm">{cls}</span>
                                                            <div className="flex gap-1">
                                                                <div className="w-6 h-6 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-300 text-xs">✏️</div>
                                                                <div className="w-6 h-6 rounded bg-red-500/10 flex items-center justify-center text-red-300 text-xs">🗑️</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {screen.id === 'student' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-lg">👩‍🎓</div>
                                                    <div>
                                                        <div className="font-bold text-sm">Marie Nguema</div>
                                                        <div className="text-xs text-slate-500">3ème A — STU8KLM2N4</div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    {['📊 Notes', '📅 EDT', '💰 Paiements'].map((tab, i) => (
                                                        <div key={i} className={`flex-1 px-2 py-2 rounded-lg text-xs text-center ${i === 0 ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'}`}>{tab}</div>
                                                    ))}
                                                </div>
                                                <div className="space-y-2">
                                                    {[
                                                        { mat: 'Mathématiques', note: '16/20', color: 'text-emerald-400' },
                                                        { mat: 'Français', note: '14/20', color: 'text-emerald-400' },
                                                        { mat: 'Anglais', note: '12/20', color: 'text-amber-400' },
                                                        { mat: 'Physique-Chimie', note: '15/20', color: 'text-emerald-400' },
                                                        { mat: 'SVT', note: '13/20', color: 'text-amber-400' },
                                                    ].map((n, i) => (
                                                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                                                            <span className="text-sm">{n.mat}</span>
                                                            <span className={`font-bold text-sm ${n.color}`}>{n.note}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="p-3 rounded-lg bg-blue-600/10 border border-blue-500/20 text-center">
                                                    <span className="text-xs text-slate-400">Moyenne générale</span>
                                                    <div className="text-2xl font-bold text-blue-400">14.00/20</div>
                                                </div>
                                            </div>
                                        )}

                                        {screen.id === 'teacher' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-lg">👨‍🏫</div>
                                                    <div>
                                                        <div className="font-bold text-sm">Prof. Kamga</div>
                                                        <div className="text-xs text-slate-500">Mathématiques — 4 classes</div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    {['📝 Notes', '📊 Stats', '✅ Présences'].map((tab, i) => (
                                                        <div key={i} className={`flex-1 px-2 py-2 rounded-lg text-xs text-center ${i === 0 ? 'bg-amber-600 text-white' : 'bg-white/5 text-slate-400'}`}>{tab}</div>
                                                    ))}
                                                </div>
                                                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                                                    <div className="text-xs text-slate-400 mb-2">Saisie des notes — Devoir 3 — 3ème A</div>
                                                    <div className="space-y-1.5">
                                                        {['Nguema M. — 16', 'Atangana P. — 14', 'Biya J. — 12', 'Fouda E. — 18'].map((s, i) => (
                                                            <div key={i} className="flex items-center justify-between p-2 rounded bg-white/[0.02]">
                                                                <span className="text-xs">{s.split(' — ')[0]}</span>
                                                                <span className="text-xs font-bold text-amber-400">{s.split(' — ')[1]}/20</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="p-3 rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-center">
                                                        <div className="text-xs text-slate-400">Moyenne classe</div>
                                                        <div className="text-lg font-bold text-emerald-400">15.0</div>
                                                    </div>
                                                    <div className="p-3 rounded-lg bg-amber-600/10 border border-amber-500/20 text-center">
                                                        <div className="text-xs text-slate-400">Taux réussite</div>
                                                        <div className="text-lg font-bold text-amber-400">87%</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {screen.id === 'payments' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="font-bold flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-400" /> Paiements</h3>
                                                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300">Trésorerie</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[
                                                        { label: 'Encaissé', val: '4.2M', color: 'text-emerald-400' },
                                                        { label: 'En attente', val: '1.8M', color: 'text-amber-400' },
                                                        { label: 'Impayés', val: '560K', color: 'text-red-400' },
                                                    ].map((k, i) => (
                                                        <div key={i} className="p-3 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                                                            <div className={`text-lg font-bold ${k.color}`}>{k.val}</div>
                                                            <div className="text-[10px] text-slate-500">{k.label} XAF</div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="space-y-2">
                                                    {[
                                                        { name: 'Nguema M.', amount: '150,000', status: '✅ Payé', color: 'text-emerald-400' },
                                                        { name: 'Atangana P.', amount: '75,000', status: '⏳ Partiel', color: 'text-amber-400' },
                                                        { name: 'Fouda E.', amount: '0', status: '❌ Impayé', color: 'text-red-400' },
                                                        { name: 'Biya J.', amount: '150,000', status: '✅ Payé', color: 'text-emerald-400' },
                                                    ].map((p, i) => (
                                                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                                                            <span className="text-sm">{p.name}</span>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs text-slate-400">{p.amount} XAF</span>
                                                                <span className={`text-xs font-medium ${p.color}`}>{p.status}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {screen.id === 'community' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="font-bold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-pink-400" /> Forum</h3>
                                                    <span className="text-xs px-2 py-1 rounded-full bg-pink-500/10 text-pink-300">12 en ligne</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {[
                                                        { user: '👨‍🏫 Prof. Kamga', msg: 'Les résultats du devoir de mathématiques sont disponibles !', time: '2min' },
                                                        { user: '👩‍🎓 Marie N.', msg: 'Merci professeur ! J\'ai eu 16/20 🎉', time: '1min' },
                                                        { user: '🎓 Paul A.', msg: 'Est-ce qu\'on peut avoir le corrigé svp ?', time: '30s' },
                                                        { user: '👨‍🏫 Prof. Kamga', msg: 'Je le posterai demain dans la bibliothèque.', time: '10s' },
                                                    ].map((m, i) => (
                                                        <div key={i} className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-xs font-medium">{m.user}</span>
                                                                <span className="text-[10px] text-slate-500">il y a {m.time}</span>
                                                            </div>
                                                            <p className="text-sm text-slate-300">{m.msg}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="flex-1 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center px-3 text-xs text-slate-500">Écrire un message...</div>
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white">→</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Decorative glow */}
                                <div className={`absolute -inset-4 bg-gradient-to-r ${screen.color} opacity-5 blur-3xl rounded-3xl -z-10`} />
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </section>

            {/* Navigation arrows */}
            <section className="relative z-10 px-4 sm:px-6 lg:px-8 pb-8">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <Button
                        variant="ghost"
                        onClick={() => { setActiveScreen(prev => prev > 0 ? prev - 1 : DEMO_SCREENS.length - 1); setAutoPlay(false); }}
                        className="text-slate-400 hover:text-white"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Précédent
                    </Button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setAutoPlay(!autoPlay)}
                            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${autoPlay ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                        >
                            {autoPlay ? '⏸ Auto-play' : '▶ Auto-play'}
                        </button>
                    </div>

                    <Button
                        variant="ghost"
                        onClick={() => { setActiveScreen(prev => (prev + 1) % DEMO_SCREENS.length); setAutoPlay(false); }}
                        className="text-slate-400 hover:text-white"
                    >
                        Suivant <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </section>

            {/* CTA */}
            <section className="relative z-10 px-4 sm:px-6 lg:px-8 pb-20">
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        initial="hidden" whileInView="visible" viewport={{ once: true }}
                        variants={fadeUp} custom={0}
                        className="text-center p-10 rounded-3xl bg-gradient-to-br from-indigo-600/20 via-blue-600/10 to-purple-600/20 border border-indigo-500/20"
                    >
                        <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                            Convaincu ? Lancez-vous !
                        </h2>
                        <p className="text-slate-300 mb-6 max-w-lg mx-auto">
                            Créez votre établissement en 5 minutes. C&apos;est gratuit et sans engagement.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link href="/onboarding">
                                <Button
                                    size="lg"
                                    className="text-lg px-8 py-6 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-2xl shadow-indigo-500/30 rounded-xl"
                                >
                                    <Building2 className="w-5 h-5 mr-2" />
                                    Créer mon établissement
                                </Button>
                            </Link>
                            {demoOrg && (
                                <Link href={`/${demoOrg.slug}`}>
                                    <Button variant="outline" size="lg" className="text-lg px-8 py-6 border-white/10 text-slate-300 hover:bg-white/5 rounded-xl">
                                        <Eye className="w-5 h-5 mr-2" /> Voir un établissement réel
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-8 px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                            <GraduationCap className="w-3 h-3 text-white" />
                        </div>
                        <span>CampusFlow</span>
                    </div>
                    <p>© 2026 SYGMA-TECH</p>
                </div>
            </footer>
        </div>
    );
}
