'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Search, Download, Eye, Globe, Lock, Trash2, Plus,
    RefreshCw, Filter, Sparkles, School, CheckCircle2, AlertTriangle,
    FileText, ArrowLeft, Edit3, X, Loader2, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface SuperLibItem {
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
    organizations?: { name: string; slug: string; logo_url: string | null } | null;
    subjects?: { name: string } | null;
    classrooms?: { name: string } | null;
}

export function SuperadminLibraryTab() {
    const [items, setItems] = useState<SuperLibItem[]>([]);
    const [orgs, setOrgs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterOrg, setFilterOrg] = useState('all');
    const [filterCat, setFilterCat] = useState('all');
    const [filterPublic, setFilterPublic] = useState<'all' | 'public' | 'private'>('all');

    // Modals
    const [readingItem, setReadingItem] = useState<SuperLibItem | null>(null);
    const [showCompileModal, setShowCompileModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);

    // Compile modal state
    const [compOrgId, setCompOrgId] = useState('');
    const [compSubjects, setCompSubjects] = useState<any[]>([]);
    const [compSubjectId, setCompSubjectId] = useState('');
    const [compTitle, setCompTitle] = useState('');
    const [compIncludeExercises, setCompIncludeExercises] = useState(true);
    const [compiling, setCompiling] = useState(false);

    // Upload modal state
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newOrgId, setNewOrgId] = useState('');
    const [newCat, setNewCat] = useState('cours');
    const [newFileType, setNewFileType] = useState('pdf');
    const [newFileUrl, setNewFileUrl] = useState('');
    const [newIsPublic, setNewIsPublic] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            const [itemsRes, orgsRes] = await Promise.all([
                supabase
                    .from('library_items')
                    .select('*, organizations:organization_id(name, slug, logo_url), subjects:subject_id(name), classrooms:classroom_id(name)')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('organizations')
                    .select('id, name, slug')
                    .order('name', { ascending: true })
            ]);

            if (itemsRes.data) setItems(itemsRes.data);
            if (orgsRes.data) setOrgs(orgsRes.data);
        } catch (err) {
            console.error('Error loading library items:', err);
            toast.error('Erreur de chargement des documents');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // When org changes in compile modal, load its subjects
    useEffect(() => {
        if (!compOrgId) {
            setCompSubjects([]);
            return;
        }
        async function loadSubjects() {
            const { data } = await supabase
                .from('subjects')
                .select('id, name, code')
                .eq('organization_id', compOrgId)
                .order('name', { ascending: true });
            setCompSubjects(data || []);
        }
        loadSubjects();
    }, [compOrgId]);

    const togglePublic = async (item: SuperLibItem) => {
        const nextState = !item.is_public;
        try {
            const { error } = await supabase
                .from('library_items')
                .update({ is_public: nextState })
                .eq('id', item.id);

            if (error) throw error;
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_public: nextState } : i));
            toast.success(nextState ? 'Document rendu public sur iziteach.com/library' : 'Document passé en privé');
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la modification');
        }
    };

    const deleteItem = async (id: string, title: string) => {
        if (!confirm(`Confirmez-vous la suppression définitive du document "${title}" ?`)) return;
        try {
            const { error } = await supabase.from('library_items').delete().eq('id', id);
            if (error) throw error;
            setItems(prev => prev.filter(i => i.id !== id));
            toast.success('Document supprimé avec succès');
        } catch (err: any) {
            toast.error(err.message || 'Erreur de suppression');
        }
    };

    const handleCompile = async () => {
        if (!compOrgId) {
            toast.error('Veuillez sélectionner une organisation');
            return;
        }
        if (!compSubjectId && !compTitle) {
            toast.error('Veuillez sélectionner une matière ou saisir un titre');
            return;
        }

        setCompiling(true);
        try {
            const selectedSubject = compSubjects.find(s => s.id === compSubjectId);
            const response = await fetch('https://campusflow-worker.kleintaptue1.workers.dev/mcp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer cf_live_58acf315b6d2288385fc9db96d44a179bdd68ad145da85f5ec6ee146a50015ab',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: crypto.randomUUID(),
                    method: 'tools/call',
                    params: {
                        name: 'compile_curriculum_to_book',
                        arguments: {
                            org_id: compOrgId,
                            subject_id: compSubjectId || undefined,
                            subject: selectedSubject?.name || undefined,
                            title: compTitle || (selectedSubject ? `Manuel : ${selectedSubject.name}` : undefined),
                            include_exercises: compIncludeExercises,
                            publish_to_library: true,
                            is_public: true,
                        }
                    }
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message || 'Erreur MCP');

            toast.success(data.result?.message || 'Manuel compilé et publié avec succès !');
            setShowCompileModal(false);
            setCompOrgId('');
            setCompSubjectId('');
            setCompTitle('');
            fetchAllData();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la compilation');
        } finally {
            setCompiling(false);
        }
    };

    const handleCreateDirect = async () => {
        if (!newTitle.trim() || !newOrgId) {
            toast.error('Titre et organisation requis');
            return;
        }

        setSaving(true);
        try {
            const id = crypto.randomUUID();
            const { error } = await supabase.from('library_items').insert({
                id,
                organization_id: newOrgId,
                title: newTitle.trim(),
                description: newDesc.trim() || null,
                category: newCat,
                file_type: newFileType,
                file_url: newFileUrl.trim() || null,
                is_public: newIsPublic,
                download_count: 0,
                created_at: new Date().toISOString()
            });

            if (error) throw error;
            toast.success('Document ajouté à la bibliothèque');
            setShowUploadModal(false);
            setNewTitle('');
            setNewDesc('');
            setNewFileUrl('');
            fetchAllData();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la création');
        } finally {
            setSaving(false);
        }
    };

    const filtered = items.filter(i => {
        if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !(i.description || '').toLowerCase().includes(search.toLowerCase()) && !(i.organizations?.name || '').toLowerCase().includes(search.toLowerCase())) return false;
        if (filterOrg !== 'all' && i.organization_id !== filterOrg) return false;
        if (filterCat !== 'all' && i.category !== filterCat) return false;
        if (filterPublic === 'public' && !i.is_public) return false;
        if (filterPublic === 'private' && i.is_public) return false;
        return true;
    });

    const totalPublic = items.filter(i => i.is_public).length;
    const totalDownloads = items.reduce((sum, i) => sum + (i.download_count || 0), 0);

    return (
        <div className="space-y-6">

            {/* ═════ HEADER & STATS ═════ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-emerald-400" />
                        Gestion de la Bibliothèque Globale
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400">
                        Supervisez, publiez et compilez les manuels numériques et ressources de tous les établissements.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        size="sm"
                        onClick={() => setShowCompileModal(true)}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 gap-1.5"
                    >
                        <Sparkles className="w-4 h-4 text-amber-300" /> Compiler un Cursus en Livre
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => setShowUploadModal(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl gap-1.5"
                    >
                        <Plus className="w-4 h-4" /> Ajouter un Document
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={fetchAllData}
                        className="text-slate-400 hover:text-white"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* STAT CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-slate-400">Total Ouvrages</span>
                    <p className="text-2xl font-black text-white mt-1">{items.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-emerald-400">Publics sur iziteach.com</span>
                    <p className="text-2xl font-black text-emerald-400 mt-1">{totalPublic}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-amber-400">Privés (Établissement)</span>
                    <p className="text-2xl font-black text-amber-400 mt-1">{items.length - totalPublic}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-indigo-400">Téléchargements & Lectures</span>
                    <p className="text-2xl font-black text-indigo-400 mt-1">{totalDownloads}</p>
                </div>
            </div>

            {/* ═════ FILTERS BAR ═════ */}
            <div className="flex flex-wrap gap-3 items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                <div className="flex-1 min-w-[240px] relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Rechercher un document, un auteur, une école..."
                        className="pl-9 bg-white/5 border-white/10 text-xs text-white h-9 rounded-xl"
                    />
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                    <select
                        value={filterOrg}
                        onChange={e => setFilterOrg(e.target.value)}
                        className="bg-[#121622] border border-white/10 rounded-xl px-3 py-1.5 text-slate-300 focus:outline-none"
                    >
                        <option value="all">Toutes les organisations</option>
                        {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>

                    <select
                        value={filterCat}
                        onChange={e => setFilterCat(e.target.value)}
                        className="bg-[#121622] border border-white/10 rounded-xl px-3 py-1.5 text-slate-300 focus:outline-none"
                    >
                        <option value="all">Toutes catégories</option>
                        <option value="cours">Manuels & Cours</option>
                        <option value="exercice">Exercices & TD</option>
                        <option value="corrige">Corrigés types</option>
                        <option value="annale">Annales d'examens</option>
                        <option value="guide">Guides</option>
                        <option value="general">Général</option>
                    </select>

                    <select
                        value={filterPublic}
                        onChange={(e: any) => setFilterPublic(e.target.value)}
                        className="bg-[#121622] border border-white/10 rounded-xl px-3 py-1.5 text-slate-300 focus:outline-none"
                    >
                        <option value="all">Tous statuts</option>
                        <option value="public">🌐 Publics uniquement</option>
                        <option value="private">🔒 Privés uniquement</option>
                    </select>
                </div>
            </div>

            {/* ═════ TABLE OF ITEMS ═════ */}
            <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#0D111A]">
                {loading ? (
                    <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-400" /> Chargement des documents...
                    </div>
                ) : filtered.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-300">
                            <thead className="bg-white/5 uppercase text-[10px] font-bold text-slate-400 border-b border-white/10">
                                <tr>
                                    <th className="p-3.5">Document & Matière</th>
                                    <th className="p-3.5">Établissement</th>
                                    <th className="p-3.5">Catégorie</th>
                                    <th className="p-3.5">Visibilité</th>
                                    <th className="p-3.5">Lectures</th>
                                    <th className="p-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filtered.map(item => (
                                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-3.5">
                                            <div className="font-bold text-white max-w-xs truncate">{item.title}</div>
                                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                                {item.subjects?.name && <span className="text-indigo-400">📗 {item.subjects.name}</span>}
                                                {item.classrooms?.name && <span className="text-amber-400">🏫 {item.classrooms.name}</span>}
                                            </div>
                                        </td>
                                        <td className="p-3.5 text-slate-300 font-medium">
                                            {item.organizations?.name || 'IziTeach Global'}
                                        </td>
                                        <td className="p-3.5">
                                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] uppercase font-bold text-slate-300">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="p-3.5">
                                            <button
                                                onClick={() => togglePublic(item)}
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                                                    item.is_public
                                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                                                        : 'bg-slate-700/50 text-slate-400 border border-white/10 hover:bg-slate-700'
                                                }`}
                                            >
                                                {item.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                                {item.is_public ? 'Public' : 'Privé'}
                                            </button>
                                        </td>
                                        <td className="p-3.5 font-mono text-slate-400">
                                            {item.download_count || 0}
                                        </td>
                                        <td className="p-3.5 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setReadingItem(item)}
                                                    className="h-8 px-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                                                    title="Lire en plein écran"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => deleteItem(item.id, item.title)}
                                                    className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-12 text-center text-slate-500 text-xs">
                        Aucun document ne correspond à vos filtres.
                    </div>
                )}
            </div>

            {/* ═════ MODAL : COMPILER UN CURSUS EN MANUEL ═════ */}
            <AnimatePresence>
                {showCompileModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#121624] border border-indigo-500/30 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative"
                        >
                            <button
                                onClick={() => setShowCompileModal(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-white p-2"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                                    <Sparkles className="w-5 h-5 text-amber-300" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-white">Compiler un Cursus en Livre</h3>
                                    <p className="text-xs text-slate-400">Générez un manuel interactif complet depuis les chapitres & leçons d'une matière.</p>
                                </div>
                            </div>

                            <div className="space-y-4 text-xs">
                                <div>
                                    <label className="block text-slate-400 font-bold mb-1.5">1. Établissement *</label>
                                    <select
                                        value={compOrgId}
                                        onChange={e => setCompOrgId(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none"
                                    >
                                        <option value="">Sélectionnez un établissement</option>
                                        {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-400 font-bold mb-1.5">2. Matière à compiler *</label>
                                    <select
                                        value={compSubjectId}
                                        onChange={e => setCompSubjectId(e.target.value)}
                                        disabled={!compOrgId || compSubjects.length === 0}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none disabled:opacity-50"
                                    >
                                        <option value="">{compOrgId ? (compSubjects.length > 0 ? 'Sélectionnez la matière' : 'Aucune matière trouvée') : 'Sélectionnez d\'abord une école'}</option>
                                        {compSubjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code || 'MAT'})</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-400 font-bold mb-1.5">Titre personnalisé du Manuel (Optionnel)</label>
                                    <Input
                                        value={compTitle}
                                        onChange={e => setCompTitle(e.target.value)}
                                        placeholder="Ex: Manuel de Stratégie Marketing Digital 2026"
                                        className="bg-white/5 border-white/10 text-white text-xs rounded-xl h-9"
                                    />
                                </div>

                                <label className="flex items-center gap-2 cursor-pointer pt-2">
                                    <input
                                        type="checkbox"
                                        checked={compIncludeExercises}
                                        onChange={e => setCompIncludeExercises(e.target.checked)}
                                        className="rounded border-white/20 bg-white/5"
                                    />
                                    <span className="text-slate-300">Inclure les exercices et quiz dans les chapitres</span>
                                </label>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <Button
                                    onClick={handleCompile}
                                    disabled={compiling || !compOrgId}
                                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold h-11 rounded-xl text-xs shadow-lg shadow-indigo-600/25"
                                >
                                    {compiling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                    {compiling ? 'Compilation des leçons...' : 'Compiler & Publier le Manuel'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowCompileModal(false)}
                                    className="text-slate-400 hover:text-white text-xs"
                                >
                                    Annuler
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═════ MODAL : AJOUTER UN DOCUMENT ═════ */}
            <AnimatePresence>
                {showUploadModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#121624] border border-white/15 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative"
                        >
                            <button onClick={() => setShowUploadModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-2">
                                <X className="w-5 h-5" />
                            </button>

                            <h3 className="text-base font-black text-white mb-4 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-emerald-400" /> Ajouter un Document
                            </h3>

                            <div className="space-y-3.5 text-xs">
                                <div>
                                    <label className="block text-slate-400 font-bold mb-1">Titre du document *</label>
                                    <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Titre complet..." className="bg-white/5 border-white/10 text-white text-xs rounded-xl h-9" />
                                </div>
                                <div>
                                    <label className="block text-slate-400 font-bold mb-1">Établissement *</label>
                                    <select value={newOrgId} onChange={e => setNewOrgId(e.target.value)} className="w-full bg-[#1A2130] border border-white/10 rounded-xl px-3 py-2 text-white text-xs">
                                        <option value="">Sélectionnez l'établissement</option>
                                        {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-slate-400 font-bold mb-1">Catégorie</label>
                                        <select value={newCat} onChange={e => setNewCat(e.target.value)} className="w-full bg-[#1A2130] border border-white/10 rounded-xl px-3 py-2 text-white text-xs">
                                            <option value="cours">Manuels & Cours</option>
                                            <option value="exercice">Exercices & TD</option>
                                            <option value="corrige">Corrigés</option>
                                            <option value="annale">Annales</option>
                                            <option value="guide">Guide</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 font-bold mb-1">Type de fichier</label>
                                        <select value={newFileType} onChange={e => setNewFileType(e.target.value)} className="w-full bg-[#1A2130] border border-white/10 rounded-xl px-3 py-2 text-white text-xs">
                                            <option value="pdf">PDF</option>
                                            <option value="doc">Document Web / HTML</option>
                                            <option value="video">Vidéo</option>
                                            <option value="audio">Audio</option>
                                            <option value="image">Image</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-slate-400 font-bold mb-1">URL du fichier / Document</label>
                                    <Input value={newFileUrl} onChange={e => setNewFileUrl(e.target.value)} placeholder="https://... ou laissez vide pour e-book généré" className="bg-white/5 border-white/10 text-white text-xs rounded-xl h-9" />
                                </div>
                                <div>
                                    <label className="block text-slate-400 font-bold mb-1">Description</label>
                                    <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Résumé du document..." className="w-full rounded-xl bg-white/5 border border-white/10 text-white px-3 py-2 text-xs min-h-[60px] resize-none" />
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer pt-1">
                                    <input type="checkbox" checked={newIsPublic} onChange={e => setNewIsPublic(e.target.checked)} className="rounded border-white/20 bg-white/5" />
                                    <span className="text-slate-300">Rendre visible publiquement sur iziteach.com/library</span>
                                </label>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <Button onClick={handleCreateDirect} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 rounded-xl text-xs">
                                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Enregistrer le document
                                </Button>
                                <Button variant="ghost" onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white text-xs">Annuler</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═════ FULL SCREEN IN-APP READER ═════ */}
            {readingItem && (
                <div className="fixed inset-0 z-50 bg-[#0B0E14] flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 bg-[#161B26] border-b border-white/10 shrink-0">
                        <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 gap-1.5" onClick={() => setReadingItem(null)}>
                            <ArrowLeft className="h-4 w-4" /> Fermer
                        </Button>
                        <div className="text-center flex-1 min-w-0 px-3">
                            <p className="text-sm font-bold text-white truncate">{readingItem.title}</p>
                            <p className="text-xs text-slate-400 truncate">
                                {readingItem.subjects?.name || readingItem.category} • {readingItem.organizations?.name || 'IziTeach'}
                            </p>
                        </div>
                        <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => window.print()}>
                            <span className="text-xs">🖨️ Imprimer</span>
                        </Button>
                    </div>
                    <div className="flex-1 overflow-hidden bg-[#0B0E14]">
                        {readingItem.file_type === 'pdf' && !readingItem.file_url?.startsWith('data:text/html') ? (
                            <object data={`${readingItem.file_url}#toolbar=1&navpanes=0&scrollbar=1`} type="application/pdf" className="w-full h-full">
                                <iframe src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(readingItem.file_url!)}`} className="w-full h-full border-none" title={readingItem.title} />
                            </object>
                        ) : (
                            <iframe src={readingItem.file_url!} className="w-full h-full border-none bg-transparent" title={readingItem.title} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
