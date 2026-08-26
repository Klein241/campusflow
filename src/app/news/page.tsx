'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
    Newspaper, Bell, Calendar, Clock, Share2, ArrowLeft, Tag,
    Sparkles, ShieldCheck, CheckCircle2, ChevronRight, X, Eye,
    Send, Award, Flame, ExternalLink, Bookmark, Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { IziTeachLogo } from '@/components/brand/iziteach-logo';
import { toast } from 'sonner';

interface NewsItem {
    id: string;
    title: string;
    body: string;
    content?: string;
    ann_type?: string;
    target_type?: string;
    target_org_name?: string;
    created_at: string;
    author_name?: string;
}

const CATEGORIES = [
    { id: 'all', label: 'Toutes les actualités', emoji: '📰' },
    { id: 'official', label: 'Communiqués Officiels', emoji: '🏛️' },
    { id: 'pedagogy', label: 'Pédagogie & IA', emoji: '🤖' },
    { id: 'update', label: 'Mises à jour Plateforme', emoji: '⚡' },
    { id: 'exam', label: 'Examens & Concours', emoji: '📝' },
];

export default function GlobalNewsPage() {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);

    useEffect(() => {
        async function fetchNews() {
            try {
                // Fetch from superadmin_announcements
                const { data: saNews } = await supabase
                    .from('superadmin_announcements')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(30);

                // Fetch from announcements
                const { data: orgAnn } = await supabase
                    .from('announcements')
                    .select('id, title, content, type, created_at, organizations:organization_id(name)')
                    .order('created_at', { ascending: false })
                    .limit(20);

                const formattedSaNews = (saNews || []).map((n: any) => ({
                    id: n.id,
                    title: n.title?.replace(/^[📣📢🚨⚡💡]\s*/, '') || 'Communiqué Officiel',
                    body: n.body || n.content || '',
                    ann_type: n.ann_type || 'official',
                    created_at: n.created_at,
                    author_name: 'Direction Générale IziTeach'
                }));

                const formattedOrgAnn = (orgAnn || []).map((n: any) => ({
                    id: n.id,
                    title: n.title?.replace(/^[📣📢🚨⚡💡📧]\s*/, '') || 'Annonce Établissement',
                    body: n.content || '',
                    ann_type: n.type || 'pedagogy',
                    created_at: n.created_at,
                    author_name: n.organizations?.name || 'Établissement Agréé'
                }));

                // Fallback news if DB has few items
                const defaultNews: NewsItem[] = [
                    {
                        id: 'default-1',
                        title: 'Lancement Officiel de la Bibliothèque Numérique & des Manuels Intelligents',
                        body: 'IziTeach déploie son système de bibliothèque numérique intégrée. Tous les établissements scolaires et formateurs indépendants peuvent désormais compiler leurs cursus pédagogiques en manuels complets, interactifs et consultables gratuitement en ligne.',
                        ann_type: 'official',
                        created_at: new Date().toISOString(),
                        author_name: 'Direction Générale IziTeach'
                    },
                    {
                        id: 'default-2',
                        title: 'Intégration du Protocole MCP : Automatisation Intelligente pour les Écoles',
                        body: 'Grâce au nouveau connecteur MCP Gateway, les directeurs d\'écoles et professeurs peuvent synchroniser leurs emplois du temps, publier des manuels et gérer leurs classes en langage naturel via des assistants IA sécurisés.',
                        ann_type: 'pedagogy',
                        created_at: new Date(Date.now() - 86400000).toISOString(),
                        author_name: 'Équipe R&D IziTeach'
                    },
                    {
                        id: 'default-3',
                        title: 'Certification & Badges Vérifiés pour Établissements et Formateurs Experts',
                        body: 'Obtenez votre badge officiel d\'établissement agréé par le ministère ou de formateur expert vérifié afin de renforcer la confiance des apprenants et de leurs tuteurs sur la plateforme.',
                        ann_type: 'update',
                        created_at: new Date(Date.now() - 172800000).toISOString(),
                        author_name: 'Service de Conformité Pédagogique'
                    }
                ];

                const combined = [...formattedSaNews, ...formattedOrgAnn];
                setNews(combined.length > 0 ? combined : defaultNews);
            } catch (err) {
                console.error('Error fetching news:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchNews();
    }, []);

    // Deep link: open article from ?id= query param
    useEffect(() => {
        if (typeof window !== 'undefined' && news.length > 0) {
            const params = new URLSearchParams(window.location.search);
            const targetId = params.get('id');
            if (targetId) {
                const found = news.find(n => n.id === targetId);
                if (found) setSelectedArticle(found);
            }
        }
    }, [news]);

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const shareArticle = (item: NewsItem) => {
        const articleUrl = `${window.location.origin}/news?id=${encodeURIComponent(item.id)}`;
        const shareText = `📰 ${item.title}\n\n${item.body.slice(0, 160)}...`;
        if (navigator.share) {
            // Note: pass text WITHOUT url inside it so WhatsApp/Telegram don't duplicate the link
            navigator.share({
                title: item.title,
                text: shareText,
                url: articleUrl,
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(`${shareText}\n\n👉 Lire sur IziTeach : ${articleUrl}`);
            toast.success('Lien de l\'article copié 📋');
        }
    };

    const filtered = news.filter(n => {
        if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.body.toLowerCase().includes(search.toLowerCase())) return false;
        if (selectedCategory !== 'all' && n.ann_type !== selectedCategory) return false;
        return true;
    });

    const featuredArticle = filtered[0];
    const otherArticles = filtered.slice(1);

    return (
        <div className="min-h-screen bg-[#060911] text-white overflow-x-hidden font-sans selection:bg-indigo-500/30 pb-24">

            {/* ═════ NAVBAR ═════ */}
            <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl bg-[#060911]/85 border-b border-white/[0.08]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center">
                        <IziTeachLogo variant="full" size="lg" className="hidden sm:flex" />
                        <IziTeachLogo variant="compact" size="md" className="flex sm:hidden" />
                    </Link>

                    <div className="hidden md:flex items-center gap-7 text-xs font-bold text-slate-300">
                        <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
                        <Link href="/library" className="hover:text-white transition-colors flex items-center gap-1">
                            <span>📚 Bibliothèque</span>
                        </Link>
                        <Link href="/news" className="text-indigo-400 font-extrabold flex items-center gap-1.5">
                            <span>📰 Actualités</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px]">{news.length}</span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link href="/login" className="hidden sm:block">
                            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/5 text-xs font-bold">
                                Espace Membre
                            </Button>
                        </Link>
                        <Link href="/onboarding" className="hidden sm:block">
                            <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs px-4 rounded-xl shadow-lg shadow-indigo-500/20">
                                Inscrire un Établissement
                            </Button>
                        </Link>
                        {/* Mobile Hamburger Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white"
                            aria-label="Menu"
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden border-b border-white/10 bg-[#0A0E18] px-4 py-5 space-y-3 overflow-hidden shadow-2xl"
                        >
                            <div className="grid grid-cols-2 gap-2">
                                <Link
                                    href="/library"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold text-xs"
                                >
                                    <span className="text-base">📚</span> Bibliothèque
                                </Link>
                                <Link
                                    href="/news"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold text-xs"
                                >
                                    <span className="text-base">📰</span> Actualités
                                </Link>
                            </div>
                            <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
                                <Link
                                    href="/login"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="w-full text-center py-2.5 rounded-xl bg-white/5 text-white font-bold text-xs"
                                >
                                    👤 Espace Membres & Connexion
                                </Link>
                                <Link
                                    href="/onboarding"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xs"
                                >
                                    ✨ Créer mon Établissement
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* ═════ HEADER HERO ═════ */}
            <section className="pt-28 sm:pt-36 pb-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-extrabold uppercase tracking-wider mb-6">
                    <Newspaper className="w-3.5 h-3.5" /> Journal Officiel & Nouvelles Éducatives
                </div>
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
                    Actualités, Annonces & Mises à Jour IziTeach
                </h1>
                <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base mb-8">
                    Suivez en direct les communiqués officiels, les réformes pédagogiques, les sessions d'examens et les nouveautés technologiques déployées sur la plateforme.
                </p>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto relative mb-6">
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Rechercher une annonce, un communiqué, une mise à jour..."
                        className="h-13 bg-white/[0.04] border-white/10 rounded-2xl text-white placeholder:text-slate-500 text-sm focus:border-indigo-500 transition-all shadow-xl px-5"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Categories */}
                <div className="flex gap-2 justify-center flex-wrap max-w-3xl mx-auto">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                selectedCategory === cat.id
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                            }`}
                        >
                            {cat.emoji} {cat.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* ═════ NEWS CONTENT ═════ */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {loading ? (
                    <div className="space-y-6">
                        <div className="h-64 rounded-3xl bg-white/5 animate-pulse" />
                        <div className="grid md:grid-cols-3 gap-6">
                            {[1, 2, 3].map(n => <div key={n} className="h-48 rounded-2xl bg-white/5 animate-pulse" />)}
                        </div>
                    </div>
                ) : filtered.length > 0 ? (
                    <div className="space-y-8">
                        {/* FEATURED STORY */}
                        {featuredArticle && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-950/80 via-[#121624] to-[#0B0E14] border border-indigo-500/20 p-6 sm:p-10 shadow-2xl group cursor-pointer"
                                onClick={() => setSelectedArticle(featuredArticle)}
                            >
                                <div className="flex flex-wrap items-center gap-3 mb-4">
                                    <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                        <Flame className="w-3 h-3 text-amber-400" /> À la une
                                    </span>
                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {new Date(featuredArticle.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                    <span className="text-xs text-indigo-300 font-semibold ml-auto">
                                        {featuredArticle.author_name}
                                    </span>
                                </div>

                                <h2 className="text-2xl sm:text-4xl font-black text-white group-hover:text-indigo-300 transition-colors mb-4 leading-tight">
                                    {featuredArticle.title}
                                </h2>

                                <p className="text-slate-300 text-sm sm:text-base line-clamp-3 leading-relaxed mb-6 max-w-4xl">
                                    {featuredArticle.body}
                                </p>

                                <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                                    <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs px-5 h-10 shadow-lg shadow-indigo-600/30">
                                        <Eye className="w-4 h-4 mr-2" /> Lire l'annonce complète
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-slate-400 hover:text-white"
                                        onClick={(e) => { e.stopPropagation(); shareArticle(featuredArticle); }}
                                    >
                                        <Share2 className="w-4 h-4 mr-1.5" /> Partager
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* OTHER ARTICLES GRID */}
                        {otherArticles.length > 0 && (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {otherArticles.map((item, idx) => (
                                    <motion.article
                                        key={item.id}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.04 }}
                                        onClick={() => setSelectedArticle(item)}
                                        className="rounded-2xl bg-[#0F131D] border border-white/10 p-6 flex flex-col hover:border-indigo-500/40 hover:bg-[#131927] transition-all cursor-pointer group shadow-lg"
                                    >
                                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3">
                                            <span className="px-2 py-0.5 rounded bg-white/5 font-semibold text-indigo-300">
                                                {item.ann_type?.toUpperCase() || 'INFO'}
                                            </span>
                                            <span>
                                                {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>

                                        <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors mb-2 line-clamp-2 leading-snug">
                                            {item.title}
                                        </h3>

                                        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4 flex-1">
                                            {item.body}
                                        </p>

                                        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                                            <span className="text-[10px] text-slate-500 truncate max-w-[150px]">
                                                {item.author_name}
                                            </span>
                                            <span className="text-indigo-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                Consulter <ChevronRight className="w-3.5 h-3.5" />
                                            </span>
                                        </div>
                                    </motion.article>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl p-8">
                        <Newspaper className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-base font-bold text-white mb-1">Aucune actualité trouvée</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            Essayez une autre recherche ou filtrez par une autre catégorie.
                        </p>
                    </div>
                )}
            </main>

            {/* ═════ ARTICLE DETAIL MODAL ═════ */}
            <AnimatePresence>
                {selectedArticle && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#121622] border border-white/15 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
                        >
                            <button
                                onClick={() => setSelectedArticle(null)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full bg-white/5"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-2 mb-3">
                                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-extrabold uppercase border border-indigo-500/30">
                                    {selectedArticle.ann_type || 'COMMUNIQUÉ'}
                                </span>
                                <span className="text-xs text-slate-400">
                                    {new Date(selectedArticle.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                            </div>

                            <h2 className="text-xl sm:text-3xl font-black text-white mb-4 leading-tight">
                                {selectedArticle.title}
                            </h2>

                            <div className="flex items-center gap-3 pb-4 mb-6 border-b border-white/10 text-xs text-slate-400">
                                <span>✍️ Publié par : <strong className="text-slate-200">{selectedArticle.author_name}</strong></span>
                            </div>

                            <div className="text-slate-200 text-sm sm:text-base leading-relaxed space-y-4 whitespace-pre-line mb-8">
                                {selectedArticle.body}
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                <Button
                                    variant="outline"
                                    onClick={() => shareArticle(selectedArticle)}
                                    className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl text-xs h-10"
                                >
                                    <Share2 className="w-4 h-4 mr-2" /> Partager l'annonce
                                </Button>
                                <Button
                                    onClick={() => setSelectedArticle(null)}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs h-10 px-5"
                                >
                                    Fermer
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
