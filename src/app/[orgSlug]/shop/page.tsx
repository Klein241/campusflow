'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Heart, ShoppingBag, Star, MessageCircle,
    Loader2, X, ArrowLeft, Share2, Clock, Shield,
    Package, ShoppingCart, Check, Plus, Trash2, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/compress';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════
// CAMPUSFLOW — MARKETPLACE (holographic-ring design)
// Uses shop_products / shop_orders (DB schema)
// Uses localStorage session (not supabase auth)
// ═══════════════════════════════════════════════════════

const CATEGORIES = [
    { id: 'fourniture', label: 'Fournitures', icon: '✏️' },
    { id: 'uniforme', label: 'Uniformes', icon: '👔' },
    { id: 'cours_payant', label: 'Cours payants', icon: '🎓' },
    { id: 'materiel', label: 'Matériel', icon: '🛠️' },
    { id: 'autre', label: 'Autre', icon: '📦' },
];

interface Product {
    id: string; nom: string; description: string | null;
    prix: number; devise: string; categorie: string; image_url: string | null;
    stock: number; is_visible: boolean; created_by: string | null;
    created_at: string; updated_at: string; filiere_id: string | null;
}

function ProductPlaceholder({ category }: { category: string }) {
    const gradients: Record<string, string> = {
        fourniture: 'from-blue-600 to-cyan-600', uniforme: 'from-pink-600 to-rose-600',
        cours_payant: 'from-emerald-600 to-teal-600', materiel: 'from-amber-600 to-orange-600',
        autre: 'from-slate-600 to-gray-600',
    };
    return (
        <div className={`w-full h-full bg-linear-to-br ${gradients[category] || gradients.autre} flex items-center justify-center`}>
            <Package className="h-8 w-8 text-white/40" />
        </div>
    );
}

const fmt = (n: number, c = 'XAF') => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);

export default function ShopPage() {
    const orgSlug = useOrgSlug();
    const router = useRouter();
    const [org, setOrg] = useState<any>(null);
    const [session, setSession] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    const [products, setProducts] = useState<Product[]>([]);
    const [myOrders, setMyOrders] = useState<any[]>([]);

    // UI
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState<'recent' | 'price_asc' | 'price_desc'>('recent');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showMyOrders, setShowMyOrders] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showOrderForm, setShowOrderForm] = useState(false);
    const [saving, setSaving] = useState(false);

    // Order form
    const [orderQty, setOrderQty] = useState(1);

    // Add product form
    const [pName, setPName] = useState('');
    const [pDesc, setPDesc] = useState('');
    const [pPrice, setPPrice] = useState('');
    const [pCat, setPCat] = useState('fourniture');
    const [pStock, setPStock] = useState('10');
    const [pImg, setPImg] = useState<File | null>(null);

    // ═══ LOAD ═══
    useEffect(() => {
        (async () => {
            const { data: o } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single();
            if (!o) { setLoading(false); return; }
            setOrg(o);

            // Session from localStorage
            const raw = localStorage.getItem('campusflow_session');
            if (raw) {
                const s = JSON.parse(raw);
                setSession(s);
                setIsAdmin(s.role === 'admin' || s.role === 'owner');
            }

            // Also check supabase auth for admin/owner
            const { data: { user: u } } = await supabase.auth.getUser();
            if (u && u.id === o.owner_id) setIsAdmin(true);

            // Load products
            const { data: p } = await supabase.from('shop_products').select('*')
                .eq('tenant_id', o.id).order('created_at', { ascending: false });
            setProducts(p || []);

            // Load orders for the current session user
            if (raw) {
                const s = JSON.parse(raw);
                const { data: ord } = await supabase.from('shop_orders').select('*, shop_products:product_id(nom, prix, image_url, devise)')
                    .eq('student_id', s.id).order('created_at', { ascending: false }).limit(50);
                setMyOrders(ord || []);
            }

            setLoading(false);
        })();
    }, [orgSlug]);

    // ═══ ADD PRODUCT ═══
    const addProduct = async () => {
        if (!pName.trim() || !pPrice) { toast.error('Nom et prix requis'); return; }
        setSaving(true);
        try {
            let imageUrl = '';
            if (pImg) {
                const compressed = await compressImage(pImg, { maxWidth: 800, quality: 0.7 });
                const ext = pImg.name.split('.').pop();
                const path = `orgs/${org.id}/shop/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
                await supabase.storage.from('organization-assets').upload(path, compressed);
                const { data: urlData } = supabase.storage.from('organization-assets').getPublicUrl(path);
                imageUrl = urlData.publicUrl;
            }
            const { error } = await supabase.from('shop_products').insert({
                tenant_id: org.id, nom: pName.trim(), description: pDesc || null,
                prix: parseFloat(pPrice), categorie: pCat, stock: parseInt(pStock) || 0,
                image_url: imageUrl || null, created_by: session?.id || null,
            });
            if (error) throw error;
            toast.success('🎉 Produit ajouté !');
            setPName(''); setPDesc(''); setPPrice(''); setPImg(null); setShowAddForm(false);
            const { data: p } = await supabase.from('shop_products').select('*')
                .eq('tenant_id', org.id).order('created_at', { ascending: false });
            setProducts(p || []);
        } catch (e: any) { toast.error(e.message); }
        setSaving(false);
    };

    // ═══ PLACE ORDER ═══
    const placeOrder = async () => {
        if (!session?.id || !selectedProduct) { toast.info('Connectez-vous pour commander'); return; }
        setSaving(true);
        try {
            const total = selectedProduct.prix * orderQty;
            const { error } = await supabase.from('shop_orders').insert({
                student_id: session.id, product_id: selectedProduct.id,
                quantite: orderQty, montant_total: total,
            });
            if (error) throw error;
            toast.success('🎉 Commande passée ! L\'administration vous contactera.');
            setShowOrderForm(false); setOrderQty(1);
            const { data: ord } = await supabase.from('shop_orders').select('*, shop_products:product_id(nom, prix, image_url, devise)')
                .eq('student_id', session.id).order('created_at', { ascending: false }).limit(50);
            setMyOrders(ord || []);
        } catch (e: any) { toast.error(e.message); }
        setSaving(false);
    };

    // ═══ ADMIN ACTIONS ═══
    const toggleAvail = async (id: string, current: boolean) => {
        await supabase.from('shop_products').update({ is_visible: !current }).eq('id', id);
        setProducts(p => p.map(pr => pr.id === id ? { ...pr, is_visible: !current } : pr));
        toast.success(!current ? 'Produit activé' : 'Produit désactivé');
    };

    const deleteProduct = async (id: string) => {
        if (!confirm('Supprimer ce produit ?')) return;
        await supabase.from('shop_products').delete().eq('id', id);
        setProducts(p => p.filter(pr => pr.id !== id));
        if (selectedProduct?.id === id) setSelectedProduct(null);
        toast.success('Produit supprimé');
    };

    const updateOrderStatus = async (id: string, statut: string) => {
        await supabase.from('shop_orders').update({ statut }).eq('id', id);
        setMyOrders(o => o.map(or => or.id === id ? { ...or, statut } : or));
        toast.success(`Commande ${statut === 'confirmee' ? 'confirmée' : statut === 'livree' ? 'livrée' : 'annulée'}`);
    };

    const getStatusLabel = (s: string) => {
        switch (s) {
            case 'en_attente': return '⏳ En attente';
            case 'confirmee': return '✅ Confirmée';
            case 'livree': return '✓ Livrée';
            case 'annulee': return '✗ Annulée';
            default: return s;
        }
    };

    const shareProduct = useCallback(async (product: Product) => {
        const url = `${window.location.origin}/${orgSlug}/shop`;
        const text = `🛒 ${product.nom}\n💰 ${fmt(product.prix, product.devise)}\n\nDisponible sur ${org?.name}`;
        if (navigator.share) {
            try { await navigator.share({ title: product.nom, text, url }); } catch { }
        } else {
            await navigator.clipboard.writeText(text + '\n' + url);
            toast.success('Lien copié 📋');
        }
    }, [orgSlug, org?.name]);

    // ═══ FILTER & SORT ═══
    const filtered = products
        .filter(p => {
            if (!isAdmin && !p.is_visible) return false;
            const matchSearch = !search || p.nom.toLowerCase().includes(search.toLowerCase()) || (p.description || '').toLowerCase().includes(search.toLowerCase());
            const matchCat = selectedCategory === 'all' || p.categorie === selectedCategory;
            return matchSearch && matchCat;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'price_asc': return a.prix - b.prix;
                case 'price_desc': return b.prix - a.prix;
                default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
        });

    if (loading) return (
        <div className="min-h-screen bg-linear-to-b from-[#0B0E14] to-[#0F1219] flex items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Loader2 className="w-8 h-8 text-primary" /></motion.div>
        </div>
    );
    if (!org) return <div className="min-h-screen bg-linear-to-b from-[#0B0E14] to-[#0F1219] flex items-center justify-center text-white"><h1 className="text-2xl font-black">Introuvable</h1></div>;

    // ═══════════════ MY ORDERS ═══════════════
    if (showMyOrders) {
        return (
            <div className="min-h-screen bg-linear-to-b from-[#0B0E14] to-[#0F1219] text-white pb-24 overflow-y-auto">
                <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                    <div className="ambient-blob-teal" style={{ top: '-20%', right: '-20%' }} />
                </div>
                <div className="relative z-10 max-w-lg mx-auto w-full px-4 pt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Button variant="ghost" size="icon" className="text-white rounded-xl" onClick={() => setShowMyOrders(false)}><ArrowLeft className="h-5 w-5" /></Button>
                        <h2 className="text-lg font-black text-gradient-primary">Mes commandes ({myOrders.length})</h2>
                    </div>
                    {myOrders.length === 0 ? (
                        <div className="text-center py-16"><ShoppingBag className="h-12 w-12 text-slate-600 mx-auto mb-3" /><p className="text-sm text-slate-400">Aucune commande</p></div>
                    ) : (
                        <div className="space-y-3">
                            {myOrders.map(order => (
                                <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                    <Card className="bg-card/50 backdrop-blur-sm border-white/10 overflow-hidden">
                                        <CardContent className="p-4">
                                            <div className="flex gap-3">
                                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 shrink-0">
                                                    {order.shop_products?.image_url ? (
                                                        <img src={order.shop_products.image_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center"><Package className="h-5 w-5 text-slate-600" /></div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-sm truncate">{order.shop_products?.nom || 'Produit'}</h3>
                                                    <p className="text-xs text-teal-400 font-bold">
                                                        {fmt(order.montant_total, order.shop_products?.devise || 'XAF')} · Qté: {order.quantite}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                                        {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                </div>
                                                <div className="shrink-0 text-right space-y-1">
                                                    <Badge className={cn("text-[10px] border-none",
                                                        order.statut === 'livree' ? 'bg-green-500/20 text-green-400' :
                                                            order.statut === 'annulee' ? 'bg-red-500/20 text-red-400' :
                                                                order.statut === 'confirmee' ? 'bg-blue-500/20 text-blue-400' :
                                                                    'bg-amber-500/20 text-amber-400'
                                                    )}>{getStatusLabel(order.statut)}</Badge>

                                                    {isAdmin && order.statut === 'en_attente' && (
                                                        <div className="flex gap-1 mt-1">
                                                            <button className="text-[9px] px-2 py-0.5 rounded-lg bg-emerald-600 text-white" onClick={() => updateOrderStatus(order.id, 'confirmee')}>Confirmer</button>
                                                            <button className="text-[9px] px-2 py-0.5 rounded-lg bg-red-600/50 text-red-200" onClick={() => updateOrderStatus(order.id, 'annulee')}>Annuler</button>
                                                        </div>
                                                    )}
                                                    {isAdmin && order.statut === 'confirmee' && (
                                                        <button className="text-[9px] px-2 py-0.5 rounded-lg bg-blue-600 text-white mt-1" onClick={() => updateOrderStatus(order.id, 'livree')}>Livré</button>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ═══════════════ PRODUCT DETAIL ═══════════════
    if (selectedProduct) {
        return (
            <div className="min-h-screen bg-linear-to-b from-[#0B0E14] to-[#0F1219] text-white pb-24 overflow-y-auto">
                <div className="relative z-10 max-w-lg mx-auto w-full">
                    {/* Product image */}
                    <div className="relative">
                        <div className="w-full aspect-square overflow-hidden bg-slate-800">
                            {selectedProduct.image_url ? (
                                <img src={selectedProduct.image_url} alt={selectedProduct.nom} className="w-full h-full object-cover" />
                            ) : (
                                <ProductPlaceholder category={selectedProduct.categorie} />
                            )}
                        </div>
                        <Button variant="ghost" size="icon" className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm text-white rounded-full"
                            onClick={() => { setSelectedProduct(null); setShowOrderForm(false); }}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        {!selectedProduct.is_visible && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Badge className="bg-red-600 text-white text-sm px-4 py-2 border-none">Indisponible</Badge>
                            </div>
                        )}
                    </div>

                    <div className="px-4 pt-4">
                        <p className="text-2xl font-black text-teal-400">{fmt(selectedProduct.prix, selectedProduct.devise)}</p>
                        <h2 className="text-lg font-black text-white mt-1">{selectedProduct.nom}</h2>
                        <Badge className="mt-2 bg-white/5 text-slate-400 border-none text-[10px]">
                            {CATEGORIES.find(c => c.id === selectedProduct.categorie)?.icon} {CATEGORIES.find(c => c.id === selectedProduct.categorie)?.label}
                        </Badge>

                        <div className="flex items-center gap-4 text-xs text-slate-400 my-4">
                            <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {selectedProduct.stock > 0 ? `${selectedProduct.stock} en stock` : 'Épuisé'}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(selectedProduct.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>

                        {selectedProduct.description && (
                            <div className="mb-6">
                                <h3 className="text-sm font-bold text-white mb-2">Description</h3>
                                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedProduct.description}</p>
                            </div>
                        )}

                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <Card className="bg-card/50 backdrop-blur-sm border-white/10"><CardContent className="p-3">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Catégorie</p>
                                <p className="text-xs text-white mt-0.5">{CATEGORIES.find(c => c.id === selectedProduct.categorie)?.icon} {CATEGORIES.find(c => c.id === selectedProduct.categorie)?.label}</p>
                            </CardContent></Card>
                            <Card className={cn("bg-card/50 backdrop-blur-sm", selectedProduct.stock > 0 ? 'border-emerald-500/20' : 'border-red-500/20')}><CardContent className="p-3">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Stock</p>
                                <p className={cn("text-xs mt-0.5", selectedProduct.stock > 0 ? 'text-emerald-400' : 'text-red-400')}>
                                    {selectedProduct.stock > 0 ? `${selectedProduct.stock} disponible(s)` : '❌ Épuisé'}
                                </p>
                            </CardContent></Card>
                            <Card className="bg-card/50 backdrop-blur-sm border-white/10 col-span-2"><CardContent className="p-3">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Établissement</p>
                                <p className="text-xs text-white mt-0.5 flex items-center gap-1"><Shield className="h-3 w-3 text-blue-400" />{org.name}</p>
                            </CardContent></Card>
                        </div>

                        {/* Order Form */}
                        <AnimatePresence>
                            {showOrderForm && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                                    <Card className="bg-linear-to-br from-teal-500/10 to-emerald-500/5 border-teal-500/20 backdrop-blur-sm overflow-hidden">
                                        <CardContent className="p-4 space-y-3">
                                            <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Passer commande</h3>
                                            <div className="flex items-center gap-3">
                                                <label className="text-xs text-slate-400">Quantité:</label>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => setOrderQty(q => Math.max(1, q - 1))} className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center">−</button>
                                                    <span className="text-white font-bold w-8 text-center">{orderQty}</span>
                                                    <button onClick={() => setOrderQty(q => Math.min(selectedProduct.stock, q + 1))} className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center">+</button>
                                                </div>
                                                <p className="text-teal-400 font-black text-sm ml-auto">{fmt(selectedProduct.prix * orderQty, selectedProduct.devise)}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => setShowOrderForm(false)} className="flex-1 text-xs border-white/10 rounded-xl">Annuler</Button>
                                                <Button size="sm" onClick={placeOrder} disabled={saving} className="flex-1 text-xs bg-linear-to-r from-teal-600 to-emerald-600 font-bold rounded-xl">
                                                    {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                                                    Confirmer ({fmt(selectedProduct.prix * orderQty, selectedProduct.devise)})
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Action buttons */}
                        <div className="flex gap-3 mb-8">
                            {!isAdmin && selectedProduct.is_visible && selectedProduct.stock > 0 && (
                                <Button className="flex-1 h-12 bg-linear-to-r from-teal-600 to-emerald-600 text-white font-black rounded-xl shadow-lg shadow-teal-600/30"
                                    onClick={() => {
                                        if (!session?.id) { toast.info('Connectez-vous pour commander'); return; }
                                        setShowOrderForm(!showOrderForm);
                                    }}>
                                    <ShoppingCart className="h-5 w-5 mr-2" /> Commander
                                </Button>
                            )}
                            {isAdmin && (
                                <>
                                    <Button variant="outline" className="flex-1 h-12 border-white/10 text-white rounded-xl"
                                        onClick={() => toggleAvail(selectedProduct.id, selectedProduct.is_visible)}>
                                        {selectedProduct.is_visible ? '⏸️ Désactiver' : '▶️ Activer'}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-12 w-12 text-red-400 rounded-xl"
                                        onClick={() => deleteProduct(selectedProduct.id)}>
                                        <Trash2 className="h-5 w-5" />
                                    </Button>
                                </>
                            )}
                            <Button variant="outline" size="icon" className="h-12 w-12 border-white/10 text-white hover:bg-white/5 rounded-xl"
                                onClick={() => shareProduct(selectedProduct)}>
                                <Share2 className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════ MAIN MARKETPLACE ═══════════════
    return (
        <div className="min-h-screen bg-linear-to-b from-[#0B0E14] to-[#0F1219] text-white pb-24 overflow-y-auto">
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="ambient-blob-teal" style={{ top: '-20%', right: '-20%' }} />
                <div className="ambient-blob-indigo" style={{ bottom: '-20%', left: '-20%' }} />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto w-full px-4 pt-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="p-2 hover:bg-white/5 rounded-xl transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                        <div>
                            <h1 className="text-2xl font-black text-gradient-primary flex items-center gap-2">
                                <ShoppingBag className="h-6 w-6 text-teal-400" /> Marketplace
                            </h1>
                            <p className="text-xs text-slate-400 mt-0.5">{org.name} • {products.filter(p => p.is_visible).length} produits</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {session && myOrders.length > 0 && (
                            <Button size="sm" variant="ghost" className="text-amber-400 hover:bg-amber-500/10 text-xs rounded-xl"
                                onClick={() => setShowMyOrders(true)}>
                                <ShoppingCart className="h-4 w-4 mr-1" /> Commandes ({myOrders.length})
                            </Button>
                        )}
                        {isAdmin && (
                            <Button size="sm" onClick={() => setShowAddForm(!showAddForm)} className="bg-linear-to-r from-teal-600 to-emerald-600 font-bold rounded-xl border-none">
                                <Plus className="h-4 w-4 mr-1" /> Ajouter
                            </Button>
                        )}
                    </div>
                </div>

                {/* Add Product Form */}
                <AnimatePresence>
                    {showAddForm && isAdmin && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                            <Card className="bg-linear-to-br from-teal-500/10 to-emerald-500/5 border-teal-500/20 backdrop-blur-sm overflow-hidden">
                                <CardContent className="p-5 space-y-3">
                                    <h3 className="font-black text-lg">🛍️ Nouveau produit</h3>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <div><Label className="text-slate-400 text-xs">Nom *</Label><Input value={pName} onChange={e => setPName(e.target.value)} placeholder="Uniforme scolaire" className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm" /></div>
                                        <div><Label className="text-slate-400 text-xs">Prix (XAF) *</Label><Input type="number" value={pPrice} onChange={e => setPPrice(e.target.value)} placeholder="15000" className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm" /></div>
                                        <div><Label className="text-slate-400 text-xs">Catégorie</Label>
                                            <select value={pCat} onChange={e => setPCat(e.target.value)} className="w-full h-9 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm">
                                                {CATEGORIES.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.icon} {c.label}</option>)}
                                            </select>
                                        </div>
                                        <div><Label className="text-slate-400 text-xs">Stock</Label><Input type="number" value={pStock} onChange={e => setPStock(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm" /></div>
                                        <div className="sm:col-span-2"><Label className="text-slate-400 text-xs">Description</Label>
                                            <textarea value={pDesc} onChange={e => setPDesc(e.target.value)} placeholder="Description détaillée..."
                                                className="w-full rounded-xl bg-white/5 border border-white/10 text-white px-3 py-2 text-sm min-h-[60px] resize-none" />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <Label className="text-slate-400 text-xs">Image</Label>
                                            <label className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-dashed border-white/20 cursor-pointer hover:bg-white/10 transition">
                                                <Upload className="w-6 h-6 text-teal-400" />
                                                <div>
                                                    <span className="text-sm text-white">{pImg ? pImg.name : 'Photo du produit'}</span>
                                                    {pImg && <p className="text-[10px] text-slate-500">{(pImg.size / 1024).toFixed(1)} KB</p>}
                                                </div>
                                                <input type="file" accept="image/*" className="hidden" onChange={e => setPImg(e.target.files?.[0] || null)} />
                                            </label>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button onClick={addProduct} disabled={saving} className="bg-linear-to-r from-teal-600 to-emerald-600 font-bold rounded-xl" size="sm">
                                            {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}<Plus className="w-4 h-4 mr-1" />Publier
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Annuler</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input placeholder="Rechercher un produit..." value={search} onChange={e => setSearch(e.target.value)}
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-11 rounded-xl" />
                    {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-slate-500 hover:text-white" /></button>}
                </div>

                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
                    <button onClick={() => setSelectedCategory('all')}
                        className={cn("shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                            selectedCategory === 'all' ? 'bg-linear-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10')}>
                        🏪 Tout
                    </button>
                    {CATEGORIES.map(cat => (
                        <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                            className={cn("shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                                selectedCategory === cat.id ? 'bg-linear-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10')}>
                            {cat.icon} {cat.label}
                        </button>
                    ))}
                </div>

                {/* Sort */}
                <div className="flex gap-2 mb-4">
                    {[
                        { id: 'recent' as const, label: '🆕 Récents' },
                        { id: 'price_asc' as const, label: '💰 Prix ↑' },
                        { id: 'price_desc' as const, label: '💸 Prix ↓' },
                    ].map(s => (
                        <button key={s.id} onClick={() => setSortBy(s.id)}
                            className={cn("text-[10px] px-2 py-1 rounded-lg transition-all",
                                sortBy === s.id ? 'bg-white/10 text-white font-semibold' : 'text-slate-500 hover:text-slate-300')}>
                            {s.label}
                        </button>
                    ))}
                </div>

                {/* Products Grid */}
                {filtered.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {filtered.map((product, idx) => (
                            <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.04 }} whileTap={{ scale: 0.97 }}
                                onClick={() => setSelectedProduct(product)} className="cursor-pointer group">
                                <div className="relative">
                                    <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-lg mb-2 bg-slate-800">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.nom} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                            <ProductPlaceholder category={product.categorie} />
                                        )}
                                    </div>
                                    {!product.is_visible && (
                                        <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                                            <Badge className="bg-red-600 text-white text-xs border-none">Indisponible</Badge>
                                        </div>
                                    )}
                                    {product.stock === 0 && product.is_visible && (
                                        <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                                            <Badge className="bg-red-600 text-white text-xs border-none">Épuisé</Badge>
                                        </div>
                                    )}
                                </div>
                                <p className="text-teal-400 font-black text-sm">{fmt(product.prix, product.devise)}</p>
                                <p className="text-[11px] font-medium text-white truncate">{product.nom}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-[9px] text-slate-500">{CATEGORIES.find(c => c.id === product.categorie)?.icon} {CATEGORIES.find(c => c.id === product.categorie)?.label}</span>
                                    {product.stock > 0 && <span className="text-[9px] text-emerald-500 ml-auto">{product.stock} en stock</span>}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16">
                        <ShoppingBag className="h-12 w-12 text-slate-600 mb-3" />
                        <p className="text-sm text-slate-400">Aucun produit trouvé</p>
                        {isAdmin && (
                            <Button className="mt-4 bg-linear-to-r from-teal-600 to-emerald-600 font-bold rounded-xl" onClick={() => setShowAddForm(true)}>
                                <Plus className="h-4 w-4 mr-2" /> Ajouter un produit
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
