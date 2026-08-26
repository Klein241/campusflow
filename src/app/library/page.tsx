'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
    BookOpen, Search, Download, Eye, Heart, ArrowLeft, Filter,
    Sparkles, GraduationCap, School, ShieldCheck, Share2, Clock,
    FileText, Video, Music, Image as ImageIcon, Link2, FolderOpen,
    CheckCircle2, Star, ExternalLink, X, ChevronRight, BookMarked, Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { IziTeachLogo } from '@/components/brand/iziteach-logo';
import { toast } from 'sonner';

interface PublicLibItem {
    id: string;
    organization_id: string;
    title: string;
    description: string | null;
    file_url: string | null;
    file_type: string;
    file_size: number;
    category: string;
    subject_id: string | null;
    classroom_id: string | null;
    download_count: number;
    is_public: boolean;
    created_at: string;
    organizations?: { name: string; slug: string; logo_url: string | null; city: string | null; country: string | null; badge_title: string | null } | null;
    subjects?: { name: string } | null;
}

const CATEGORIES = [
    { id: 'all', label: 'Tous les documents', emoji: '📚' },
    { id: 'cours', label: 'Manuels & Cours', emoji: '📖' },
    { id: 'exercice', label: 'Exercices & TD', emoji: '✏️' },
    { id: 'corrige', label: 'Corrigés types', emoji: '✅' },
    { id: 'annale', label: 'Annales & Épreuves', emoji: '📋' },
    { id: 'guide', label: 'Guides & Méthodes', emoji: '🧭' },
    { id: 'general', label: 'Ressources Générales', emoji: '📁' },
];

function PublicDocCover({ title, category, subject, orgName }: { title: string; category: string; subject?: string; orgName?: string }) {
    const gradients: Record<string, { bg: string; accent: string; badge: string; spine: string }> = {
        cours: { bg: 'from-[#1E1B4B] via-[#1E293B] to-[#0F172A]', accent: 'text-indigo-400', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', spine: 'bg-indigo-500/40' },
        exercice: { bg: 'from-[#064E3B] via-[#0F2922] to-[#0B1512]', accent: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', spine: 'bg-emerald-500/40' },
        corrige: { bg: 'from-[#14532D] via-[#0F291E] to-[#0B1510]', accent: 'text-lime-400', badge: 'bg-lime-500/20 text-lime-300 border-lime-500/30', spine: 'bg-lime-500/40' },
        annale: { bg: 'from-[#78350F] via-[#2E180A] to-[#140A04]', accent: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', spine: 'bg-amber-500/40' },
        guide: { bg: 'from-[#164E63] via-[#0E2A36] to-[#08151B]', accent: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', spine: 'bg-cyan-500/40' },
        general: { bg: 'from-[#1E293B] via-[#0F172A] to-[#060911]', accent: 'text-slate-300', badge: 'bg-white/10 text-slate-300 border-white/10', spine: 'bg-slate-500/30' },
    };
    const style = gradients[category] || gradients.general;

    return (
        <div className={`relative w-full h-full bg-gradient-to-br ${style.bg} rounded-xl overflow-hidden flex flex-col justify-between p-3.5 border border-white/10 shadow-[4px_6px_20px_rgba(0,0,0,0.6)] select-none group`}>
            {/* Spine 3D */}
            <div className={`absolute left-0 top-0 bottom-0 w-2 ${style.spine} border-r border-white/20 shadow-inner`} />
            <div className="absolute left-2.5 top-0 bottom-0 w-[1px] bg-white/10" />

            <div className="pl-2 flex items-center justify-between z-10">
                <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${style.badge}`}>
                    {category}
                </span>
                <span className="text-xs text-amber-400" title="Édition Certifiée IziTeach">⭐</span>
            </div>

            <div className="pl-2 my-auto text-center z-10 py-2">
                <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/90 shadow-md">
                    <BookOpen className="h-4 w-4" />
                </div>
                <h4 className="text-[11px] font-extrabold text-white leading-snug line-clamp-3 drop-shadow-md">
                    {title}
                </h4>
                {subject && (
                    <p className={`text-[9px] font-semibold ${style.accent} mt-1 truncate`}>
                        {subject}
                    </p>
                )}
            </div>

            <div className="pl-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[8px] text-slate-400 z-10">
                <span className="font-bold tracking-wider text-slate-300 truncate max-w-[90px]">{orgName || 'IZITEACH'}</span>
                <span className="text-white/40 font-mono">CERTIFIÉ</span>
            </div>

            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.08] pointer-events-none" />
        </div>
    );
}

export default function GlobalLibraryPage() {
    const [items, setItems] = useState<PublicLibItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('all');
    const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'alpha'>('recent');

    // Reader & Detail Modal
    const [selectedItem, setSelectedItem] = useState<PublicLibItem | null>(null);
    const [readingItem, setReadingItem] = useState<PublicLibItem | null>(null);

    useEffect(() => {
        async function fetchLibrary() {
            try {
                const { data, error } = await supabase
                    .from('library_items')
                    .select('*, organizations:organization_id(name, slug, logo_url, city, country, badge_title), subjects:subject_id(name)')
                    .eq('is_public', true)
                    .order('created_at', { ascending: false })
                    .limit(100);

                if (!error && data) {
                    setItems(data);
                }
            } catch (err) {
                console.error('Error loading public library:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchLibrary();
    }, []);

    const openItem = useCallback((item: PublicLibItem) => {
        let effective = { ...item };
        if (!effective.file_url) {
            const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${item.title}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0B0E14;color:#F8FAFC;line-height:1.7;padding:40px 20px}.hero{text-align:center;padding:40px 20px;background:radial-gradient(circle at top,#1E1B4B,#0B0E14);border-radius:16px;border:1px solid rgba(255,255,255,0.1);margin-bottom:30px}.badge{background:rgba(245,158,11,0.2);color:#F59E0B;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700}.title{font-size:26px;font-weight:900;margin:16px 0 8px;color:#fff}.card{background:#161B26;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;margin-bottom:20px}h2{color:#818CF8;font-size:18px;margin-bottom:12px}p{color:#CBD5E1}</style></head><body><div class="hero"><span class="badge">⭐ Manuel Officiel IziTeach</span><h1 class="title">${item.title}</h1><p style="color:#94A3B8">${item.description || 'Document pédagogique certifié'}</p></div><div class="card"><h2>📖 Description & Contenu</h2><p>${item.description || 'Ce manuel est certifié par la plateforme éducative IziTeach.'}</p></div></body></html>`;
            effective.file_url = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
            effective.file_type = 'doc';
        }
        setReadingItem(effective);
    }, []);

    const downloadItem = useCallback(async (item: PublicLibItem) => {
        if (!item.file_url) return;
        try {
            toast.info('Téléchargement en cours...');
            const response = await fetch(item.file_url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${item.title}.${item.file_type || 'html'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success('Document téléchargé 📥');
        } catch {
            openItem(item);
        }
    }, [openItem]);

    const filtered = items
        .filter(i => {
            if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !(i.description || '').toLowerCase().includes(search.toLowerCase()) && !(i.organizations?.name || '').toLowerCase().includes(search.toLowerCase())) return false;
            if (filterCat !== 'all' && i.category !== filterCat) return false;
            return true;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'popular': return (b.download_count || 0) - (a.download_count || 0);
                case 'alpha': return a.title.localeCompare(b.title);
                default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
        });

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#060911] text-white overflow-x-hidden font-sans selection:bg-indigo-500/30 pb-20">

            {/* ═════ NAVBAR ═════ */}
            <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl bg-[#060911]/85 border-b border-white/[0.08]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center">
                        <IziTeachLogo variant="full" size="lg" className="hidden sm:flex" />
                        <IziTeachLogo variant="compact" size="md" className="flex sm:hidden" />
                    </Link>

                    <div className="hidden md:flex items-center gap-7 text-xs font-bold text-slate-300">
                        <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
                        <Link href="/library" className="text-emerald-400 font-extrabold flex items-center gap-1.5">
                            <span>📚 Bibliothèque</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">{items.length}</span>
                        </Link>
                        <Link href="/news" className="hover:text-white transition-colors flex items-center gap-1">
                            <span>📰 Actualités</span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link href="/login" className="hidden sm:block">
                            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/5 text-xs font-bold">
                                Espace Membre
                            </Button>
                        </Link>
                        <Link href="/onboarding" className="hidden sm:block">
                            <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs px-4 rounded-xl shadow-lg shadow-emerald-500/20">
                                Inscrire un Établissement
                            </Button>
                        </Link>
                        {/* Mobile Menu Toggle Button */}
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
                                    className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs"
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
                                    className="w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs"
                                >
                                    ✨ Inscrire un Établissement
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* ═════ HEADER HERO ═════ */}
            <section className="pt-28 sm:pt-36 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-extrabold uppercase tracking-wider mb-6">
                    <Sparkles className="w-3.5 h-3.5" /> Bibliothèque Numérique Universelle
                </div>
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
                    Manuels, Livres de Cours & Ressources Pédagogiques
                </h1>
                <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base mb-8">
                    Accédez gratuitement et en illimité aux ouvrages, compilations de cours et annales certifiés par les établissements scolaires et générés par nos agents éducatifs IziTeach.
                </p>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Rechercher un manuel, une matière, une académie..."
                        className="pl-12 pr-10 h-14 bg-white/[0.04] border-white/10 rounded-2xl text-white placeholder:text-slate-500 text-sm sm:text-base focus:border-emerald-500 transition-all shadow-xl"
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
                            onClick={() => setFilterCat(cat.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                filterCat === cat.id
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                            }`}
                        >
                            {cat.emoji} {cat.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* ═════ GRID OF BOOKS ═════ */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/10">
                    <span className="text-xs font-bold text-slate-400">
                        {filtered.length} ouvrage(s) disponible(s)
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Trier par :</span>
                        <select
                            value={sortBy}
                            onChange={(e: any) => setSortBy(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg text-xs text-slate-300 px-3 py-1.5 focus:outline-none"
                        >
                            <option value="recent" className="bg-[#0B0E14]">🆕 Plus récents</option>
                            <option value="popular" className="bg-[#0B0E14]">🔥 Les plus lus</option>
                            <option value="alpha" className="bg-[#0B0E14]">🔤 Ordre alphabétique</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {[1, 2, 3, 4, 5].map(n => (
                            <div key={n} className="aspect-[3/4] rounded-xl bg-white/5 animate-pulse border border-white/5" />
                        ))}
                    </div>
                ) : filtered.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                        {filtered.map((item, idx) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                whileHover={{ y: -4 }}
                                onClick={() => setSelectedItem(item)}
                                className="cursor-pointer group flex flex-col"
                            >
                                <div className="aspect-[3/4] w-full rounded-xl overflow-hidden mb-3 group-hover:shadow-2xl transition-all">
                                    <PublicDocCover
                                        title={item.title}
                                        category={item.category}
                                        subject={item.subjects?.name}
                                        orgName={item.organizations?.name}
                                    />
                                </div>
                                <h3 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-2 mb-1">
                                    {item.title}
                                </h3>
                                <p className="text-[10px] text-slate-400 line-clamp-1 mb-2">
                                    {item.organizations?.name ? `🏫 ${item.organizations.name}` : '🎓 IziTeach Édition'}
                                </p>
                                <div className="mt-auto flex items-center justify-between pt-2 border-t border-white/5">
                                    <span className="text-[9px] font-semibold text-emerald-400">📖 Lire en ligne</span>
                                    <span className="text-[9px] text-slate-500">{new Date(item.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl p-8">
                        <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-base font-bold text-white mb-1">Aucun document trouvé</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            Essayez de modifier vos critères de recherche ou explorez une autre catégorie.
                        </p>
                    </div>
                )}
            </main>

            {/* ═════ DETAIL MODAL ═════ */}
            <AnimatePresence>
                {selectedItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#121622] border border-white/15 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden"
                        >
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full bg-white/5"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex gap-5 mb-6">
                                <div className="w-28 h-40 rounded-xl overflow-hidden shrink-0 shadow-2xl">
                                    <PublicDocCover
                                        title={selectedItem.title}
                                        category={selectedItem.category}
                                        subject={selectedItem.subjects?.name}
                                        orgName={selectedItem.organizations?.name}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                            {selectedItem.category}
                                        </span>
                                        <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-slate-400">
                                            ⭐ Certifié
                                        </span>
                                    </div>
                                    <h2 className="text-base font-bold text-white mb-2 leading-snug">
                                        {selectedItem.title}
                                    </h2>
                                    {selectedItem.organizations?.name && (
                                        <p className="text-xs text-slate-400 mb-1">
                                            🏫 <strong>Établissement :</strong> {selectedItem.organizations.name}
                                        </p>
                                    )}
                                    {selectedItem.subjects?.name && (
                                        <p className="text-xs text-indigo-400">
                                            📗 <strong>Matière :</strong> {selectedItem.subjects.name}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {selectedItem.description && (
                                <p className="text-xs text-slate-300 mb-6 bg-white/[0.02] border border-white/5 p-3.5 rounded-xl leading-relaxed">
                                    {selectedItem.description}
                                </p>
                            )}

                            <div className="flex gap-3">
                                <Button
                                    onClick={() => {
                                        const it = selectedItem;
                                        setSelectedItem(null);
                                        openItem(it);
                                    }}
                                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold h-12 rounded-xl shadow-lg shadow-emerald-500/20"
                                >
                                    <Eye className="w-4 h-4 mr-2" /> Ouvrir & Lire
                                </Button>
                                <Button
                                    onClick={() => downloadItem(selectedItem)}
                                    variant="outline"
                                    className="h-12 px-4 border-white/10 hover:bg-white/5 rounded-xl text-white"
                                >
                                    <Download className="w-4 h-4" />
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═════ FULL SCREEN READER ═════ */}
            {readingItem && (
                <div className="fixed inset-0 z-50 bg-[#0B0E14] flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 bg-[#161B26] border-b border-white/10 shrink-0">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-white hover:bg-white/10 gap-1.5"
                            onClick={() => setReadingItem(null)}
                        >
                            <ArrowLeft className="h-4 w-4" /> Quitter le lecteur
                        </Button>
                        <div className="text-center flex-1 min-w-0 px-3">
                            <p className="text-sm font-bold text-white truncate">{readingItem.title}</p>
                            <p className="text-xs text-slate-400 truncate">
                                {readingItem.subjects?.name || readingItem.category} • {readingItem.organizations?.name || 'IziTeach'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-white hover:bg-white/10"
                                onClick={() => window.print()}
                                title="Imprimer ou Exporter en PDF"
                            >
                                <span className="text-xs">🖨️ Imprimer</span>
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-white hover:bg-white/10"
                                onClick={() => downloadItem(readingItem)}
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden bg-[#0B0E14]">
                        {readingItem.file_type === 'pdf' && !readingItem.file_url?.startsWith('data:text/html') ? (
                            <object
                                data={`${readingItem.file_url}#toolbar=1&navpanes=0&scrollbar=1`}
                                type="application/pdf"
                                className="w-full h-full"
                            >
                                <iframe
                                    src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(readingItem.file_url!)}`}
                                    className="w-full h-full border-none"
                                    title={readingItem.title}
                                />
                            </object>
                        ) : (
                            <iframe
                                src={readingItem.file_url!}
                                className="w-full h-full border-none bg-transparent"
                                title={readingItem.title}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
