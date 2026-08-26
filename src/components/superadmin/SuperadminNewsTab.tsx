'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Newspaper, Megaphone, Plus, Trash2, Edit3, Globe,
    RefreshCw, Search, Send, Calendar, CheckCircle2,
    Flame, ExternalLink, X, Loader2, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface SuperNewsItem {
    id: string;
    title: string;
    body: string;
    ann_type?: string;
    target_type?: string;
    target_org_id?: string | null;
    created_at: string;
    source: 'superadmin' | 'org';
    target_org_name?: string;
}

export function SuperadminNewsTab() {
    const [news, setNews] = useState<SuperNewsItem[]>([]);
    const [orgs, setOrgs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');

    // Create / Edit modal
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [category, setCategory] = useState('official');
    const [targetOrgId, setTargetOrgId] = useState('all');
    const [saving, setSaving] = useState(false);

    const fetchAllNews = useCallback(async () => {
        setLoading(true);
        try {
            const [saRes, orgAnnRes, orgsRes] = await Promise.all([
                supabase
                    .from('superadmin_announcements')
                    .select('*')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('announcements')
                    .select('id, organization_id, title, content, type, created_at, organizations:organization_id(name)')
                    .order('created_at', { ascending: false })
                    .limit(50),
                supabase
                    .from('organizations')
                    .select('id, name, slug')
                    .order('name', { ascending: true })
            ]);

            const saList: SuperNewsItem[] = (saRes.data || []).map((n: any) => ({
                id: n.id,
                title: n.title?.replace(/^[📣📢🚨⚡💡]\s*/, '') || 'Communiqué',
                body: n.body || n.content || '',
                ann_type: n.ann_type || 'official',
                target_type: n.target_type || 'all',
                target_org_id: n.target_org_id || null,
                created_at: n.created_at,
                source: 'superadmin'
            }));

            const orgList: SuperNewsItem[] = (orgAnnRes.data || []).map((n: any) => ({
                id: n.id,
                title: n.title?.replace(/^[📣📢🚨⚡💡📧]\s*/, '') || 'Annonce',
                body: n.content || '',
                ann_type: n.type || 'pedagogy',
                target_type: 'org',
                target_org_id: n.organization_id,
                target_org_name: n.organizations?.name,
                created_at: n.created_at,
                source: 'org'
            }));

            setNews([...saList, ...orgList]);
            if (orgsRes.data) setOrgs(orgsRes.data);
        } catch (err) {
            console.error('Error fetching news in superadmin:', err);
            toast.error('Erreur de chargement des actualités');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllNews();
    }, [fetchAllNews]);

    const handleSave = async () => {
        if (!title.trim() || !body.trim()) {
            toast.error('Titre et contenu requis');
            return;
        }

        setSaving(true);
        try {
            const isAll = targetOrgId === 'all';
            const payload = {
                title: `📣 ${title.trim()}`,
                body: body.trim(),
                ann_type: category,
                target_type: isAll ? 'all' : 'org',
                target_org_id: isAll ? null : targetOrgId,
                sent_to_count: 1,
            };

            if (editingId) {
                const { error } = await supabase
                    .from('superadmin_announcements')
                    .update(payload)
                    .eq('id', editingId);
                if (error) throw error;
                toast.success('Actualité mise à jour');
            } else {
                const id = crypto.randomUUID();
                const { error } = await supabase
                    .from('superadmin_announcements')
                    .insert({ id, ...payload, created_at: new Date().toISOString() });
                if (error) throw error;
                toast.success('Article / Annonce publié sur iziteach.com/news');
            }

            setShowModal(false);
            setEditingId(null);
            setTitle('');
            setBody('');
            fetchAllNews();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la publication');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item: SuperNewsItem) => {
        if (!confirm(`Supprimer définitivement l'article "${item.title}" ?`)) return;
        try {
            const table = item.source === 'superadmin' ? 'superadmin_announcements' : 'announcements';
            const { error } = await supabase.from(table).delete().eq('id', item.id);
            if (error) throw error;
            setNews(prev => prev.filter(n => n.id !== item.id));
            toast.success('Article supprimé');
        } catch (err: any) {
            toast.error(err.message || 'Erreur de suppression');
        }
    };

    const startEdit = (item: SuperNewsItem) => {
        setEditingId(item.id);
        setTitle(item.title);
        setBody(item.body);
        setCategory(item.ann_type || 'official');
        setTargetOrgId(item.target_org_id || 'all');
        setShowModal(true);
    };

    const filtered = news.filter(n => {
        if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.body.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterCategory !== 'all' && n.ann_type !== filterCategory) return false;
        return true;
    });

    return (
        <div className="space-y-6">

            {/* ═════ HEADER & STATS ═════ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                        <Newspaper className="w-6 h-6 text-indigo-400" />
                        Gestion des Actualités & Communiqués Officiels
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400">
                        Diffusez les nouvelles officielles sur <strong>iziteach.com/news</strong> et dans les espaces des écoles.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        onClick={() => {
                            setEditingId(null);
                            setTitle('');
                            setBody('');
                            setCategory('official');
                            setTargetOrgId('all');
                            setShowModal(true);
                        }}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/25 gap-1.5"
                    >
                        <Plus className="w-4 h-4" /> Publier une Actualité
                    </Button>
                    <a href="/news" target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="border-white/10 text-slate-300 hover:text-white rounded-xl text-xs gap-1">
                            <ExternalLink className="w-3.5 h-3.5" /> Voir la page publique
                        </Button>
                    </a>
                    <Button size="sm" variant="ghost" onClick={fetchAllNews} className="text-slate-400 hover:text-white">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* STATS CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-slate-400">Total Actualités</span>
                    <p className="text-2xl font-black text-white mt-1">{news.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-indigo-400">Communiqués Globaux</span>
                    <p className="text-2xl font-black text-indigo-400 mt-1">{news.filter(n => n.target_type === 'all').length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-amber-400">Annonces Établissements</span>
                    <p className="text-2xl font-black text-amber-400 mt-1">{news.filter(n => n.target_type === 'org').length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-emerald-400">Canal MCP & IA</span>
                    <p className="text-2xl font-black text-emerald-400 mt-1">Actif ⚡</p>
                </div>
            </div>

            {/* ═════ FILTERS BAR ═════ */}
            <div className="flex flex-wrap gap-3 items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                <div className="flex-1 min-w-[240px] relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Rechercher une actualité ou une annonce..."
                        className="pl-9 bg-white/5 border-white/10 text-xs text-white h-9 rounded-xl"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        className="bg-[#121622] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
                    >
                        <option value="all">Toutes catégories</option>
                        <option value="official">🏛️ Communiqués Officiels</option>
                        <option value="pedagogy">🤖 Pédagogie & IA</option>
                        <option value="update">⚡ Mises à jour</option>
                        <option value="exam">📝 Examens & Concours</option>
                        <option value="info">ℹ️ Informations Générales</option>
                    </select>
                </div>
            </div>

            {/* ═════ LIST OF NEWS ═════ */}
            <div className="space-y-3">
                {loading ? (
                    <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" /> Chargement des actualités...
                    </div>
                ) : filtered.length > 0 ? (
                    filtered.map(item => (
                        <div
                            key={item.id}
                            className="p-5 rounded-2xl bg-[#0D111A] border border-white/10 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:border-indigo-500/30 transition-all"
                        >
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap text-[10px]">
                                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-extrabold uppercase border border-indigo-500/30">
                                        {item.ann_type || 'INFO'}
                                    </span>
                                    {item.target_type === 'all' ? (
                                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center gap-1">
                                            <Globe className="w-3 h-3" /> iziteach.com/news & Toutes écoles
                                        </span>
                                    ) : (
                                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                                            🏫 {item.target_org_name || 'Établissement ciblé'}
                                        </span>
                                    )}
                                    <span className="text-slate-500 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>

                                <h3 className="text-base font-bold text-white leading-snug">
                                    {item.title}
                                </h3>

                                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                                    {item.body}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                                {item.source === 'superadmin' && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => startEdit(item)}
                                        className="h-8 px-2 text-slate-400 hover:text-white"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(item)}
                                    className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-12 text-center text-slate-500 text-xs rounded-2xl bg-white/[0.02] border border-white/5">
                        Aucune actualité trouvée.
                    </div>
                )}
            </div>

            {/* ═════ MODAL : NOUVELLE / ÉDITER ACTUALITÉ ═════ */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#121624] border border-indigo-500/30 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
                        >
                            <button
                                onClick={() => setShowModal(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-white p-2"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                                    <Megaphone className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-white">
                                        {editingId ? 'Modifier l\'Actualité' : 'Publier une Actualité Officielle'}
                                    </h3>
                                    <p className="text-xs text-slate-400">Diffusée instantanément sur la page actualités et le réseau IziTeach.</p>
                                </div>
                            </div>

                            <div className="space-y-4 text-xs">
                                <div>
                                    <label className="block text-slate-400 font-bold mb-1.5">Titre de l'article *</label>
                                    <Input
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="Ex: Lancement des nouvelles certifications et diplômes numériques"
                                        className="bg-white/5 border-white/10 text-white text-xs rounded-xl h-10"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-slate-400 font-bold mb-1.5">Catégorie</label>
                                        <select
                                            value={category}
                                            onChange={e => setCategory(e.target.value)}
                                            className="w-full bg-[#1A2130] border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                                        >
                                            <option value="official">🏛️ Communiqué Officiel</option>
                                            <option value="pedagogy">🤖 Pédagogie & IA</option>
                                            <option value="update">⚡ Mise à jour Plateforme</option>
                                            <option value="exam">📝 Examens & Concours</option>
                                            <option value="info">ℹ️ Information Générale</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-slate-400 font-bold mb-1.5">Cible de diffusion</label>
                                        <select
                                            value={targetOrgId}
                                            onChange={e => setTargetOrgId(e.target.value)}
                                            className="w-full bg-[#1A2130] border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                                        >
                                            <option value="all">🌐 Global (iziteach.com/news & toutes écoles)</option>
                                            {orgs.map(o => <option key={o.id} value={o.id}>🏫 {o.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-slate-400 font-bold mb-1.5">Contenu détaillé *</label>
                                    <textarea
                                        value={body}
                                        onChange={e => setBody(e.target.value)}
                                        placeholder="Rédigez ici le corps de votre article ou communiqué officiel..."
                                        className="w-full rounded-xl bg-white/5 border border-white/10 text-white px-3.5 py-2.5 text-xs min-h-[140px] resize-none leading-relaxed"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <Button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold h-11 rounded-xl text-xs shadow-lg shadow-indigo-500/25"
                                >
                                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                                    <Send className="w-4 h-4 mr-1.5" />
                                    {editingId ? 'Mettre à jour' : 'Publier l\'article'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowModal(false)}
                                    className="text-slate-400 hover:text-white text-xs"
                                >
                                    Annuler
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
