'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Star, Download, Heart, Search, ArrowLeft, Upload,
    Clock, Eye, Loader2, BookMarked, History, X, Share2,
    Plus, Trash2, Filter, FileText, Video, Music, Image as ImageIcon,
    Link2, FolderOpen, ChevronDown, Edit, MoreVertical, ZoomIn
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════
// CAMPUSFLOW — BIBLIOTHÈQUE NUMÉRIQUE COMPLÈTE
// ═══════════════════════════════════════════════════════

const CATEGORIES = [
    { id: 'all', label: 'Tout', emoji: '📚' },
    { id: 'cours', label: 'Cours', emoji: '📖' },
    { id: 'exercice', label: 'Exercices', emoji: '✏️' },
    { id: 'corrige', label: 'Corrigés', emoji: '✅' },
    { id: 'annale', label: 'Annales', emoji: '📋' },
    { id: 'guide', label: 'Guides', emoji: '📘' },
    { id: 'memoire', label: 'Mémoires', emoji: '🎓' },
    { id: 'support', label: 'Supports', emoji: '💻' },
    { id: 'general', label: 'Général', emoji: '📁' },
];

const FILE_TYPE_META: Record<string, { icon: any; color: string; bg: string }> = {
    pdf: { icon: FileText, color: 'text-red-400', bg: 'bg-red-600/20' },
    doc: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-600/20' },
    video: { icon: Video, color: 'text-purple-400', bg: 'bg-purple-600/20' },
    audio: { icon: Music, color: 'text-amber-400', bg: 'bg-amber-600/20' },
    image: { icon: ImageIcon, color: 'text-pink-400', bg: 'bg-pink-600/20' },
    link: { icon: Link2, color: 'text-cyan-400', bg: 'bg-cyan-600/20' },
    other: { icon: FolderOpen, color: 'text-slate-400', bg: 'bg-slate-600/20' },
};

interface LibItem {
    id: string; organization_id: string; title: string; description: string | null;
    file_url: string | null; file_type: string; file_size: number; category: string;
    subject_id: string | null; classroom_id: string | null; uploaded_by: string | null;
    download_count: number; is_public: boolean; created_at: string;
    subjects?: { name: string } | null;
    classrooms?: { name: string } | null;
}

// Star rating component
function StarRating({ rating, onChange, size = 'sm' }: { rating: number; onChange?: (r: number) => void; size?: 'sm' | 'lg' }) {
    const stars = [1, 2, 3, 4, 5];
    const sizeClass = size === 'lg' ? 'h-6 w-6' : 'h-3.5 w-3.5';
    return (
        <div className="flex gap-0.5">
            {stars.map(s => (
                <button key={s} onClick={e => { e.stopPropagation(); onChange?.(s); }} disabled={!onChange}
                    className={`transition-colors ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}>
                    <Star className={`${sizeClass} ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                </button>
            ))}
        </div>
    );
}

// Doc cover placeholder
function DocCover({ title, category }: { title: string; category: string }) {
    const gradients: Record<string, string> = {
        cours: 'from-blue-600 to-indigo-800', exercice: 'from-emerald-600 to-teal-800',
        corrige: 'from-green-600 to-lime-800', annale: 'from-amber-600 to-orange-800',
        guide: 'from-cyan-600 to-blue-800', memoire: 'from-purple-600 to-violet-800',
        support: 'from-pink-600 to-rose-800', general: 'from-slate-600 to-gray-800',
    };
    return (
        <div className={`w-full h-full bg-gradient-to-br ${gradients[category] || gradients.general} flex flex-col items-center justify-center p-3 rounded-lg`}>
            <BookOpen className="h-8 w-8 text-white/50 mb-2" />
            <p className="text-[9px] text-white/70 text-center line-clamp-3 font-medium leading-tight">{title}</p>
        </div>
    );
}

export default function LibraryPage() {
    const orgSlug = useOrgSlug();
    const router = useRouter();
    const [org, setOrg] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [isOwner, setIsOwner] = useState(false);
    const [loading, setLoading] = useState(true);

    // Data
    const [items, setItems] = useState<LibItem[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [readHistory, setReadHistory] = useState<any[]>([]);

    // UI states
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('all');
    const [filterType, setFilterType] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [sortBy, setSortBy] = useState<'recent' | 'downloads' | 'alpha'>('recent');
    const [showFavorites, setShowFavorites] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [selectedItem, setSelectedItem] = useState<LibItem | null>(null);

    // Reader
    const [isReading, setIsReading] = useState(false);
    const [readingItem, setReadingItem] = useState<LibItem | null>(null);

    // Upload form
    const [uTitle, setUTitle] = useState('');
    const [uDesc, setUDesc] = useState('');
    const [uCat, setUCat] = useState('general');
    const [uFileType, setUFileType] = useState('pdf');
    const [uSubId, setUSubId] = useState('');
    const [uClsId, setUClsId] = useState('');
    const [uFile, setUFile] = useState<File | null>(null);
    const [uLinkUrl, setULinkUrl] = useState('');
    const [uIsPublic, setUIsPublic] = useState(false);
    const [saving, setSaving] = useState(false);

    // ═══ LOAD DATA ═══
    useEffect(() => {
        (async () => {
            const { data: o } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single();
            if (!o) { setLoading(false); return; }
            setOrg(o);

            // Session from localStorage (access code auth)
            const raw = localStorage.getItem('campusflow_session');
            let userId: string | null = null;
            if (raw) {
                const sess = JSON.parse(raw);
                setUser(sess);
                userId = sess.id;
                if (sess.role === 'admin' || sess.role === 'owner') setIsOwner(true);
            }
            // Also check supabase auth for admin/owner
            const { data: { user: u } } = await supabase.auth.getUser();
            if (u) {
                if (!userId) { setUser(u); userId = u.id; }
                if (u.id === o.owner_id) setIsOwner(true);
            }

            const [{ data: li }, { data: s }, { data: c }] = await Promise.all([
                supabase.from('library_items').select('*, subjects:subject_id(name), classrooms:classroom_id(name)')
                    .eq('organization_id', o.id).order('created_at', { ascending: false }),
                supabase.from('subjects').select('id,name').eq('organization_id', o.id).order('name'),
                supabase.from('classrooms').select('id,name').eq('organization_id', o.id).order('name'),
            ]);
            setItems(li || []);
            setSubjects(s || []);
            setClasses(c || []);

            // Load favorites & history (user-specific, try/catch for tables that may not exist)
            if (userId) {
                try {
                    const { data: favs } = await supabase.from('library_favorites')
                        .select('item_id').eq('user_id', userId).eq('organization_id', o.id);
                    if (favs) setFavorites(new Set(favs.map((f: any) => f.item_id)));
                } catch { /* table may not exist */ }
                try {
                    const { data: hist } = await supabase.from('library_reading_history')
                        .select('*').eq('user_id', userId).order('last_read_at', { ascending: false }).limit(30);
                    if (hist) setReadHistory(hist);
                } catch { /* table may not exist */ }
            }
            setLoading(false);
        })();
    }, [orgSlug]);

    // ═══ UPLOAD ═══
    const handleUpload = async () => {
        if (!uTitle.trim()) { toast.error('Titre requis'); return; }
        setSaving(true);
        try {
            let fileUrl = uLinkUrl || '';
            let fileSize = 0;

            if (uFile) {
                const ext = uFile.name.split('.').pop();
                const path = `orgs/${org.id}/library/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
                const { error: upErr } = await supabase.storage.from('organization-assets').upload(path, uFile);
                if (upErr) throw upErr;
                const { data: urlData } = supabase.storage.from('organization-assets').getPublicUrl(path);
                fileUrl = urlData.publicUrl;
                fileSize = uFile.size;
            }

            const { error } = await supabase.from('library_items').insert({
                organization_id: org.id,
                title: uTitle.trim(),
                description: uDesc || null,
                file_url: fileUrl || null,
                file_type: uFileType,
                file_size: fileSize,
                category: uCat,
                subject_id: uSubId || null,
                classroom_id: uClsId || null,
                uploaded_by: user?.id,
                is_public: uIsPublic,
            });
            if (error) throw error;

            toast.success('📚 Document ajouté avec succès !');
            resetUploadForm();

            // Reload
            const { data: li } = await supabase.from('library_items')
                .select('*, subjects:subject_id(name), classrooms:classroom_id(name)')
                .eq('organization_id', org.id).order('created_at', { ascending: false });
            setItems(li || []);
        } catch (e: any) { toast.error(e.message); }
        setSaving(false);
    };

    const resetUploadForm = () => {
        setUTitle(''); setUDesc(''); setUCat('general'); setUFileType('pdf');
        setUSubId(''); setUClsId(''); setUFile(null); setULinkUrl('');
        setUIsPublic(false); setShowUpload(false);
    };

    // ═══ DELETE ═══
    const deleteItem = async (id: string) => {
        if (!confirm('Supprimer ce document ?')) return;
        await supabase.from('library_items').delete().eq('id', id);
        setItems(p => p.filter(i => i.id !== id));
        if (selectedItem?.id === id) setSelectedItem(null);
        toast.success('Document supprimé');
    };

    // ═══ FAVORITES ═══
    const toggleFavorite = useCallback(async (itemId: string) => {
        if (!user?.id) { toast.info('Connectez-vous pour ajouter aux favoris'); return; }
        const isFav = favorites.has(itemId);
        // Optimistic update
        setFavorites(prev => {
            const next = new Set(prev); isFav ? next.delete(itemId) : next.add(itemId); return next;
        });
        try {
            if (isFav) {
                await supabase.from('library_favorites').delete().eq('item_id', itemId).eq('user_id', user.id);
            } else {
                await supabase.from('library_favorites').insert({ item_id: itemId, user_id: user.id, organization_id: org.id });
                toast.success('❤️ Ajouté aux favoris');
            }
        } catch {
            setFavorites(prev => { const next = new Set(prev); isFav ? next.add(itemId) : next.delete(itemId); return next; });
        }
    }, [user?.id, favorites, org?.id]);

    // ═══ OPEN/READ ═══
    const openItem = useCallback(async (item: LibItem) => {
        // Track reading history
        if (user?.id) {
            try {
                await supabase.from('library_reading_history').upsert({
                    item_id: item.id, user_id: user.id, last_read_at: new Date().toISOString(),
                }, { onConflict: 'item_id,user_id' });
            } catch { /* ignore */ }
        }

        if (item.file_url) {
            // Always use built-in reader — never open external tabs
            setReadingItem(item);
            setIsReading(true);
        } else {
            toast.info('Fichier non disponible');
        }
    }, [user?.id]);

    // ═══ DOWNLOAD ═══
    const downloadItem = useCallback(async (item: LibItem) => {
        if (!item.file_url) return;
        // Increment download count
        try {
            await supabase.from('library_items').update({ download_count: (item.download_count || 0) + 1 }).eq('id', item.id);
        } catch { /* ignore */ }

        try {
            toast.info('Téléchargement en cours...');
            const response = await fetch(item.file_url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${item.title}.${item.file_type || 'pdf'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success('Téléchargement terminé 📥');
        } catch {
            // Fallback: open in built-in reader
            setReadingItem(item);
            setIsReading(true);
            toast.success('Ouverture du fichier 📖');
        }
    }, []);

    // ═══ SHARE ═══
    const shareItem = useCallback(async (item: LibItem) => {
        const url = `${window.location.origin}/${orgSlug}/library`;
        const text = `📚 ${item.title}\n${item.description || ''}\n\nBibliothèque ${org?.name}`;
        if (navigator.share) {
            try { await navigator.share({ title: item.title, text, url }); } catch { }
        } else {
            await navigator.clipboard.writeText(text + '\n' + url);
            toast.success('Lien copié 📋');
        }
    }, [orgSlug, org?.name]);

    // ═══ FORMAT HELPERS ═══
    const formatSize = (b: number) => {
        if (!b) return '';
        if (b < 1024) return `${b} B`;
        if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
        return `${(b / 1048576).toFixed(1)} MB`;
    };

    const isNew = (d: string) => Date.now() - new Date(d).getTime() < 7 * 86400 * 1000;

    // ═══ FILTER & SORT ═══
    const filtered = items
        .filter(i => {
            if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !(i.description || '').toLowerCase().includes(search.toLowerCase())) return false;
            if (filterCat !== 'all' && i.category !== filterCat) return false;
            if (filterType && i.file_type !== filterType) return false;
            if (filterClass && i.classroom_id !== filterClass) return false;
            if (showFavorites && !favorites.has(i.id)) return false;
            return true;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'downloads': return (b.download_count || 0) - (a.download_count || 0);
                case 'alpha': return a.title.localeCompare(b.title);
                default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
        });

    if (loading) return (
        <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
        </div>
    );
    if (!org) return (
        <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-white">
            <h1 className="text-2xl font-black">Établissement introuvable</h1>
        </div>
    );

    // ═══════════════════════ IN-APP PDF READER ═══════════════════════
    if (isReading && readingItem) {
        return (
            <div className="fixed inset-0 z-50 bg-[#0B0E14] flex flex-col">
                <div className="flex items-center justify-between px-3 py-2 bg-[#161B26] border-b border-white/10 shrink-0">
                    <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 gap-1"
                        onClick={() => { setIsReading(false); setReadingItem(null); }}>
                        <ArrowLeft className="h-4 w-4" /> Retour
                    </Button>
                    <div className="text-center flex-1 min-w-0 px-2">
                        <p className="text-xs font-medium text-white truncate">{readingItem.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                            {readingItem.subjects?.name || readingItem.category} {readingItem.classrooms?.name ? `• ${readingItem.classrooms.name}` : ''}
                        </p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-white hover:bg-white/10"
                        onClick={() => downloadItem(readingItem)}>
                        <Download className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex-1 overflow-hidden">
                    {readingItem.file_type === 'pdf' ? (
                        <object
                            data={`${readingItem.file_url}#toolbar=1&navpanes=0&scrollbar=1`}
                            type="application/pdf"
                            className="w-full h-full">
                            <iframe
                                src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(readingItem.file_url!)}`}
                                className="w-full h-full border-none"
                                title={readingItem.title} />
                        </object>
                    ) : (
                        <iframe src={readingItem.file_url!} className="w-full h-full border-none" title={readingItem.title} />
                    )}
                </div>
            </div>
        );
    }

    // ═══════════════════════ DOCUMENT DETAIL ═══════════════════════
    if (selectedItem) {
        const isFav = favorites.has(selectedItem.id);
        const meta = FILE_TYPE_META[selectedItem.file_type] || FILE_TYPE_META.other;
        const Icon = meta.icon;
        const histEntry = readHistory.find((h: any) => h.item_id === selectedItem.id);

        // Suggestions: same category
        const suggestions = items.filter(i => i.id !== selectedItem.id && i.category === selectedItem.category).slice(0, 6);

        return (
            <div className="min-h-screen bg-[#0B0E14] text-white pb-24 overflow-y-auto">
                {/* Background blur */}
                <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                    <div className="ambient-blob-teal" style={{ top: '-20%', right: '-20%' }} />
                    <div className="ambient-blob-indigo" style={{ bottom: '-20%', left: '-20%' }} />
                </div>

                <div className="relative z-10 max-w-lg mx-auto w-full px-4 pt-4">
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white mb-4"
                        onClick={() => setSelectedItem(null)}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Bibliothèque
                    </Button>

                    {/* Header card */}
                    <div className="flex gap-4 mb-6">
                        <div className="w-28 h-36 rounded-xl overflow-hidden shadow-2xl shrink-0">
                            <DocCover title={selectedItem.title} category={selectedItem.category} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-white mb-1">{selectedItem.title}</h2>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                                    <Icon className="w-3 h-3" />{selectedItem.file_type.toUpperCase()}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
                                    {CATEGORIES.find(c => c.id === selectedItem.category)?.emoji} {CATEGORIES.find(c => c.id === selectedItem.category)?.label || selectedItem.category}
                                </span>
                                {isNew(selectedItem.created_at) && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">🆕 Nouveau</span>
                                )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                                {selectedItem.file_size > 0 && <span>{formatSize(selectedItem.file_size)}</span>}
                                {selectedItem.download_count > 0 && (
                                    <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {selectedItem.download_count}</span>
                                )}
                            </div>
                            {selectedItem.subjects?.name && (
                                <p className="text-xs text-indigo-400 mb-1">📗 {selectedItem.subjects.name}</p>
                            )}
                            {selectedItem.classrooms?.name && (
                                <p className="text-xs text-amber-400">🏫 {selectedItem.classrooms.name}</p>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    {selectedItem.description && (
                        <p className="text-sm text-slate-300 mb-4 leading-relaxed">{selectedItem.description}</p>
                    )}

                    {/* Reading history */}
                    {histEntry && (
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-4 flex items-center gap-3">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <div className="flex-1">
                                <p className="text-xs text-white">Dernière lecture</p>
                                <p className="text-[10px] text-slate-400">{new Date(histEntry.last_read_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3 mb-4">
                        <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 h-11 rounded-xl font-bold"
                            onClick={() => openItem(selectedItem)}>
                            <Eye className="h-4 w-4 mr-2" /> Lire
                        </Button>
                        <Button variant="outline" className="h-11 border-white/10 text-white hover:bg-white/5 rounded-xl"
                            onClick={() => downloadItem(selectedItem)}>
                            <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="outline"
                            className={`h-11 border-white/10 ${isFav ? 'text-red-400 border-red-400/30' : 'text-white'} hover:bg-white/5 rounded-xl`}
                            onClick={() => toggleFavorite(selectedItem.id)}>
                            <Heart className={`h-4 w-4 ${isFav ? 'fill-red-400' : ''}`} />
                        </Button>
                        <Button variant="outline" className="h-11 border-white/10 text-white hover:bg-white/5 rounded-xl"
                            onClick={() => shareItem(selectedItem)}>
                            <Share2 className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Admin delete */}
                    {isOwner && (
                        <Button variant="ghost" size="sm" className="text-red-400 mb-4 w-full" onClick={() => deleteItem(selectedItem.id)}>
                            <Trash2 className="h-4 w-4 mr-1" /> Supprimer ce document
                        </Button>
                    )}

                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                        <div className="mt-4 mb-6">
                            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-emerald-400" /> Voir aussi
                            </h3>
                            <div className="grid grid-cols-3 gap-2.5">
                                {suggestions.map(s => (
                                    <div key={s.id} className="rounded-xl bg-white/5 border border-white/10 overflow-hidden cursor-pointer hover:border-emerald-500/30 transition-all group"
                                        onClick={() => setSelectedItem(s)}>
                                        <div className="aspect-[3/4] overflow-hidden"><DocCover title={s.title} category={s.category} /></div>
                                        <div className="p-2">
                                            <p className="text-[10px] font-semibold text-white truncate">{s.title}</p>
                                            <p className="text-[9px] text-slate-400 truncate">{s.subjects?.name || s.category}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ═══════════════════════ MAIN LIBRARY VIEW ═══════════════════════
    return (
        <div className="min-h-screen bg-[#0B0E14] text-white pb-24 overflow-y-auto">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="ambient-blob-teal" style={{ top: '-20%', right: '-20%' }} />
                <div className="ambient-blob-indigo" style={{ bottom: '-20%', left: '-20%' }} />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto w-full px-4 pt-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push(`/${orgSlug}/admin`)} className="p-2 hover:bg-white/5 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent flex items-center gap-2">
                                <BookOpen className="h-6 w-6 text-emerald-400" /> Bibliothèque
                            </h1>
                            <p className="text-xs text-slate-400 mt-0.5">{org.name} • {items.length} documents</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {user && (
                            <Button size="sm" variant="ghost" className={`text-xs ${showHistory ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400'}`}
                                onClick={() => { setShowHistory(!showHistory); setShowFavorites(false); }}>
                                <History className="h-4 w-4 mr-1" /> Historique
                            </Button>
                        )}
                        {user && (
                            <Button size="sm" variant="ghost" className={`text-xs ${showFavorites ? 'text-red-400 bg-red-500/10' : 'text-slate-400'}`}
                                onClick={() => { setShowFavorites(!showFavorites); setShowHistory(false); }}>
                                <Heart className="h-4 w-4 mr-1" /> Favoris ({favorites.size})
                            </Button>
                        )}
                        {isOwner && (
                            <Button size="sm" onClick={() => setShowUpload(!showUpload)} className="bg-emerald-600 hover:bg-emerald-700">
                                <Plus className="h-4 w-4 mr-1" /> Ajouter
                            </Button>
                        )}
                    </div>
                </div>

                {/* Reading History Panel */}
                <AnimatePresence>
                    {showHistory && readHistory.length > 0 && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                <h3 className="text-sm font-bold text-amber-300 mb-3 flex items-center gap-2"><Clock className="h-4 w-4" /> Lectures récentes</h3>
                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                    {readHistory.slice(0, 10).map((h: any) => {
                                        const item = items.find(i => i.id === h.item_id);
                                        if (!item) return null;
                                        return (
                                            <div key={h.item_id} className="shrink-0 w-24 cursor-pointer group" onClick={() => setSelectedItem(item)}>
                                                <div className="w-24 h-32 rounded-lg overflow-hidden shadow-lg mb-1"><DocCover title={item.title} category={item.category} /></div>
                                                <p className="text-[10px] font-medium text-white truncate">{item.title}</p>
                                                <p className="text-[8px] text-slate-500">{new Date(h.last_read_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Upload Form */}
                <AnimatePresence>
                    {showUpload && isOwner && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                            <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                                <h3 className="font-bold text-lg flex items-center gap-2">📚 Nouveau document</h3>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <div><Label className="text-slate-400 text-xs">Titre *</Label><Input value={uTitle} onChange={e => setUTitle(e.target.value)} placeholder="Cours de Mathématiques — Chapitre 1" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                                    <div><Label className="text-slate-400 text-xs">Catégorie</Label>
                                        <select value={uCat} onChange={e => setUCat(e.target.value)} className="w-full h-9 rounded-lg bg-white/5 border border-white/10 text-white px-3 text-sm">
                                            {CATEGORIES.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.emoji} {c.label}</option>)}
                                        </select>
                                    </div>
                                    <div><Label className="text-slate-400 text-xs">Type de fichier</Label>
                                        <select value={uFileType} onChange={e => setUFileType(e.target.value)} className="w-full h-9 rounded-lg bg-white/5 border border-white/10 text-white px-3 text-sm">
                                            {['pdf', 'doc', 'video', 'audio', 'image', 'link', 'other'].map(t => <option key={t} value={t} className="bg-slate-900">{t.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                    <div><Label className="text-slate-400 text-xs">Classe</Label>
                                        <select value={uClsId} onChange={e => setUClsId(e.target.value)} className="w-full h-9 rounded-lg bg-white/5 border border-white/10 text-white px-3 text-sm">
                                            <option value="" className="bg-slate-900">Toutes les classes</option>
                                            {classes.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div><Label className="text-slate-400 text-xs">Matière</Label>
                                        <select value={uSubId} onChange={e => setUSubId(e.target.value)} className="w-full h-9 rounded-lg bg-white/5 border border-white/10 text-white px-3 text-sm">
                                            <option value="" className="bg-slate-900">Aucune</option>
                                            {subjects.map(s => <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={uIsPublic} onChange={e => setUIsPublic(e.target.checked)} className="rounded border-white/20" />
                                            <span className="text-xs text-slate-400">Visible publiquement</span>
                                        </label>
                                    </div>
                                    <div className="sm:col-span-2"><Label className="text-slate-400 text-xs">Description</Label>
                                        <textarea value={uDesc} onChange={e => setUDesc(e.target.value)} placeholder="Description du document..."
                                            className="w-full rounded-lg bg-white/5 border border-white/10 text-white px-3 py-2 text-sm min-h-[60px] resize-none" />
                                    </div>

                                    {uFileType === 'link' ? (
                                        <div className="sm:col-span-2"><Label className="text-slate-400 text-xs">URL du lien</Label><Input value={uLinkUrl} onChange={e => setULinkUrl(e.target.value)} placeholder="https://..." className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                                    ) : (
                                        <div className="sm:col-span-2">
                                            <Label className="text-slate-400 text-xs">Fichier</Label>
                                            <label className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-dashed border-white/20 cursor-pointer hover:bg-white/10 transition">
                                                <Upload className="w-6 h-6 text-emerald-400" />
                                                <div>
                                                    <span className="text-sm text-white">{uFile ? uFile.name : 'Cliquez pour sélectionner un fichier'}</span>
                                                    {uFile && <p className="text-[10px] text-slate-500">{formatSize(uFile.size)}</p>}
                                                </div>
                                                <input type="file" className="hidden" onChange={e => setUFile(e.target.files?.[0] || null)} />
                                            </label>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleUpload} disabled={saving || !uTitle.trim()} className="bg-emerald-600" size="sm">
                                        {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}<Upload className="w-4 h-4 mr-1" />Publier
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={resetUploadForm}>Annuler</Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Search & Filter bar */}
                <div className="space-y-3 mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input placeholder="Rechercher un document, un cours..." value={search} onChange={e => setSearch(e.target.value)}
                            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-11 rounded-xl" />
                        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-slate-500 hover:text-white" /></button>}
                    </div>

                    {/* Categories scroll */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {CATEGORIES.map(cat => (
                            <button key={cat.id} onClick={() => setFilterCat(cat.id)}
                                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterCat === cat.id
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                                {cat.emoji} {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Sub filters + sort */}
                    <div className="flex gap-2 flex-wrap">
                        <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="h-8 rounded-lg bg-white/5 border border-white/10 text-slate-400 px-2 text-xs">
                            <option value="" className="bg-slate-900">Toutes classes</option>
                            {classes.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                        </select>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="h-8 rounded-lg bg-white/5 border border-white/10 text-slate-400 px-2 text-xs">
                            <option value="" className="bg-slate-900">Tous types</option>
                            {['pdf', 'doc', 'video', 'audio', 'image', 'link'].map(t => <option key={t} value={t} className="bg-slate-900">{t.toUpperCase()}</option>)}
                        </select>
                        <div className="flex-1" />
                        {[
                            { id: 'recent' as const, label: '🆕 Récents' },
                            { id: 'downloads' as const, label: '🔥 Populaires' },
                            { id: 'alpha' as const, label: '🔤 A-Z' },
                        ].map(s => (
                            <button key={s.id} onClick={() => setSortBy(s.id)}
                                className={`text-[10px] px-2 py-1 rounded-lg ${sortBy === s.id ? 'bg-white/10 text-white font-semibold' : 'text-slate-500 hover:text-slate-300'}`}>
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                        { l: 'Total', v: items.length, gr: 'from-emerald-600/80 to-green-600/80' },
                        { l: 'PDFs', v: items.filter(i => i.file_type === 'pdf').length, gr: 'from-red-600/60 to-rose-600/60' },
                        { l: 'Vidéos', v: items.filter(i => i.file_type === 'video').length, gr: 'from-purple-600/60 to-violet-600/60' },
                        { l: 'Téléchargements', v: items.reduce((s, i) => s + (i.download_count || 0), 0), gr: 'from-blue-600/60 to-indigo-600/60' },
                    ].map((s, i) => (
                        <div key={i} className={`p-3 rounded-xl bg-gradient-to-br ${s.gr} text-center`}>
                            <div className="text-xl font-bold">{s.v}</div>
                            <div className="text-[10px] text-white/80">{s.l}</div>
                        </div>
                    ))}
                </div>

                {/* Documents grid */}
                {filtered.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filtered.map((item, idx) => {
                            const isFav = favorites.has(item.id);
                            const meta = FILE_TYPE_META[item.file_type] || FILE_TYPE_META.other;
                            const Icon = meta.icon;
                            return (
                                <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                                    whileTap={{ scale: 0.97 }} onClick={() => setSelectedItem(item)} className="cursor-pointer group">
                                    <div className="relative">
                                        <div className="w-full aspect-[3/4] rounded-xl overflow-hidden shadow-lg mb-2 bg-slate-800">
                                            <DocCover title={item.title} category={item.category} />
                                        </div>
                                        <button onClick={e => { e.stopPropagation(); toggleFavorite(item.id); }}
                                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                            <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                                        </button>
                                        <div className={`absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold ${meta.bg} ${meta.color}`}>
                                            <Icon className="w-2.5 h-2.5" />{item.file_type.toUpperCase()}
                                        </div>
                                        {isNew(item.created_at) && (
                                            <span className="absolute bottom-3 left-2 text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/80 text-white font-bold">🆕 Nouveau</span>
                                        )}
                                    </div>
                                    <p className="text-[11px] font-medium text-white truncate group-hover:text-emerald-300 transition-colors">{item.title}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        {item.subjects?.name && <span className="text-[9px] text-indigo-400 truncate">{item.subjects.name}</span>}
                                        {item.download_count > 0 && (
                                            <span className="text-[9px] text-slate-500 flex items-center gap-0.5 ml-auto"><Download className="h-2.5 w-2.5" />{item.download_count}</span>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16">
                        <BookOpen className="h-12 w-12 text-slate-600 mb-3" />
                        <p className="text-sm text-slate-400">{search || filterCat !== 'all' || showFavorites ? 'Aucun document trouvé' : 'Aucun document dans la bibliothèque'}</p>
                        {isOwner && !search && (
                            <Button className="mt-4 bg-emerald-600" onClick={() => setShowUpload(true)}><Plus className="h-4 w-4 mr-2" /> Ajouter un document</Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
