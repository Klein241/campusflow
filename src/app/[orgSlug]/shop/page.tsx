'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Heart, ShoppingBag, Star, MapPin, MessageCircle,
    Filter, ChevronRight, Loader2, X, Eye, ArrowLeft,
    Share2, Phone, Clock, Shield, TrendingUp, Sparkles,
    Package, Store, ChevronLeft, ShoppingCart, Truck, Check,
    Plus, Trash2, Upload, Edit, MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════
// CAMPUSFLOW — MARKETPLACE COMPLÈTE
// ═══════════════════════════════════════════════════════

const CATEGORIES = [
    { id: 'fourniture', label: 'Fournitures', icon: '✏️' },
    { id: 'uniforme', label: 'Uniformes', icon: '👔' },
    { id: 'livre', label: 'Livres', icon: '📖' },
    { id: 'cours_payant', label: 'Cours payants', icon: '🎓' },
    { id: 'materiel', label: 'Matériel', icon: '🛠️' },
    { id: 'alimentaire', label: 'Alimentaire', icon: '🍎' },
    { id: 'electronique', label: 'Electronique', icon: '💻' },
    { id: 'autre', label: 'Autre', icon: '📦' },
];

interface Product {
    id: string; organization_id: string; name: string; description: string | null;
    price: number; currency: string; category: string; image_url: string | null;
    stock: number; is_available: boolean; created_by: string | null; created_at: string; updated_at: string;
}

function ProductPlaceholder({ category }: { category: string }) {
    const gradients: Record<string, string> = {
        fourniture: 'from-blue-600 to-cyan-600', uniforme: 'from-pink-600 to-rose-600',
        livre: 'from-indigo-600 to-violet-600', cours_payant: 'from-emerald-600 to-teal-600',
        materiel: 'from-amber-600 to-orange-600', alimentaire: 'from-green-600 to-lime-600',
        electronique: 'from-sky-600 to-blue-600', autre: 'from-slate-600 to-gray-600',
    };
    return (
        <div className={`w-full h-full bg-gradient-to-br ${gradients[category] || gradients.autre} flex items-center justify-center`}>
            <Package className="h-8 w-8 text-white/40" />
        </div>
    );
}

const fmt = (n: number, c = 'XAF') => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);

export default function ShopPage() {
    const { orgSlug } = useParams<{ orgSlug: string }>();
    const router = useRouter();
    const [org, setOrg] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [isOwner, setIsOwner] = useState(false);
    const [loading, setLoading] = useState(true);

    // Data
    const [products, setProducts] = useState<Product[]>([]);
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [myOrders, setMyOrders] = useState<any[]>([]);

    // UI
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'recent' | 'price_asc' | 'price_desc' | 'popular'>('recent');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showMyOrders, setShowMyOrders] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showOrderForm, setShowOrderForm] = useState(false);
    const [saving, setSaving] = useState(false);

    // Order form
    const [orderQty, setOrderQty] = useState(1);
    const [orderAddr, setOrderAddr] = useState('');
    const [orderNotes, setOrderNotes] = useState('');

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

            const { data: { user: u } } = await supabase.auth.getUser();
            setUser(u);
            setIsOwner(u?.id === o.owner_id);

            const { data: p } = await supabase.from('marketplace_products').select('*')
                .eq('organization_id', o.id).order('created_at', { ascending: false });
            setProducts(p || []);

            if (u?.id) {
                // Load favorites
                try {
                    const { data: favs } = await supabase.from('marketplace_favorites')
                        .select('product_id').eq('user_id', u.id);
                    if (favs) setFavorites(new Set(favs.map((f: any) => f.product_id)));
                } catch { /* table may not exist */ }
                // Load orders
                const { data: ord } = await supabase.from('marketplace_orders')
                    .select('*, marketplace_products:product_id(name, price, image_url, currency)')
                    .or(`buyer_id.eq.${u.id},organization_id.eq.${o.id}`)
                    .order('created_at', { ascending: false }).limit(50);
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
                const ext = pImg.name.split('.').pop();
                const path = `orgs/${org.id}/shop/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
                await supabase.storage.from('organization-assets').upload(path, pImg);
                const { data: urlData } = supabase.storage.from('organization-assets').getPublicUrl(path);
                imageUrl = urlData.publicUrl;
            }
            const { error } = await supabase.from('marketplace_products').insert({
                organization_id: org.id, name: pName.trim(), description: pDesc || null,
                price: parseFloat(pPrice), category: pCat, stock: parseInt(pStock) || 0,
                image_url: imageUrl || null, created_by: user?.id,
            });
            if (error) throw error;
            toast.success('🎉 Produit ajouté !');
            setPName(''); setPDesc(''); setPPrice(''); setPImg(null); setShowAddForm(false);
            const { data: p } = await supabase.from('marketplace_products').select('*')
                .eq('organization_id', org.id).order('created_at', { ascending: false });
            setProducts(p || []);
        } catch (e: any) { toast.error(e.message); }
        setSaving(false);
    };

    // ═══ PLACE ORDER ═══
    const placeOrder = async () => {
        if (!user?.id || !selectedProduct) return;
        setSaving(true);
        try {
            const total = selectedProduct.price * orderQty;
            const { error } = await supabase.from('marketplace_orders').insert({
                organization_id: org.id, product_id: selectedProduct.id, buyer_id: user.id,
                quantity: orderQty, total_amount: total, payment_method: 'cash',
            });
            if (error) throw error;
            toast.success('🎉 Commande passée ! L\'administration vous contactera.');
            setShowOrderForm(false); setOrderQty(1); setOrderAddr(''); setOrderNotes('');
            // Reload orders
            const { data: ord } = await supabase.from('marketplace_orders')
                .select('*, marketplace_products:product_id(name, price, image_url, currency)')
                .or(`buyer_id.eq.${user.id},organization_id.eq.${org.id}`)
                .order('created_at', { ascending: false }).limit(50);
            setMyOrders(ord || []);
        } catch (e: any) { toast.error(e.message); }
        setSaving(false);
    };

    // ═══ TOGGLE FAV ═══
    const toggleFavorite = useCallback(async (productId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user?.id) { toast.info('Connectez-vous d\'abord'); return; }
        const isFav = favorites.has(productId);
        setFavorites(prev => { const n = new Set(prev); isFav ? n.delete(productId) : n.add(productId); return n; });
        try {
            if (isFav) {
                await supabase.from('marketplace_favorites').delete().eq('product_id', productId).eq('user_id', user.id);
            } else {
                await supabase.from('marketplace_favorites').insert({ product_id: productId, user_id: user.id });
                toast.success('❤️ Ajouté aux favoris');
            }
        } catch {
            setFavorites(prev => { const n = new Set(prev); isFav ? n.add(productId) : n.delete(productId); return n; });
        }
    }, [user?.id, favorites]);

    // ═══ ADMIN ACTIONS ═══
    const toggleAvail = async (id: string, current: boolean) => {
        await supabase.from('marketplace_products').update({ is_available: !current }).eq('id', id);
        setProducts(p => p.map(pr => pr.id === id ? { ...pr, is_available: !current } : pr));
        toast.success(!current ? 'Produit activé' : 'Produit désactivé');
    };

    const deleteProduct = async (id: string) => {
        if (!confirm('Supprimer ce produit ?')) return;
        await supabase.from('marketplace_products').delete().eq('id', id);
        setProducts(p => p.filter(pr => pr.id !== id));
        if (selectedProduct?.id === id) setSelectedProduct(null);
        toast.success('Produit supprimé');
    };

    const updateOrderStatus = async (id: string, status: string) => {
        await supabase.from('marketplace_orders').update({ status }).eq('id', id);
        setMyOrders(o => o.map(or => or.id === id ? { ...or, status } : or));
        toast.success(`Commande ${status === 'confirmed' ? 'confirmée' : status === 'delivered' ? 'livrée' : 'annulée'}`);
    };

    // ═══ SHARE ═══
    const shareProduct = useCallback(async (product: Product) => {
        const url = `${window.location.origin}/${orgSlug}/shop`;
        const text = `🛒 ${product.name}\n💰 ${fmt(product.price, product.currency)}\n\nDisponible sur ${org?.name}`;
        if (navigator.share) {
            try { await navigator.share({ title: product.name, text, url }); } catch { }
        } else {
            await navigator.clipboard.writeText(text + '\n' + url);
            toast.success('Lien copié 📋');
        }
    }, [orgSlug, org?.name]);

    const getStatusLabel = (s: string) => {
        switch (s) {
            case 'pending': return '⏳ En attente';
            case 'confirmed': return '✅ Confirmée';
            case 'delivered': return '✓ Livrée';
            case 'cancelled': return '✗ Annulée';
            default: return s;
        }
    };

    // ═══ FILTER & SORT ═══
    const filtered = products
        .filter(p => {
            if (!isOwner && !p.is_available) return false;
            const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.description || '').toLowerCase().includes(search.toLowerCase());
            const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
            return matchSearch && matchCat;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'price_asc': return a.price - b.price;
                case 'price_desc': return b.price - a.price;
                default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
        });

    if (loading) return <div className="min-h-screen bg-gradient-to-b from-[#0B0E14] to-[#0F1219] flex items-center justify-center"><Loader2 className="w-8 h-8 text-teal-400 animate-spin" /></div>;
    if (!org) return <div className="min-h-screen bg-gradient-to-b from-[#0B0E14] to-[#0F1219] flex items-center justify-center text-white"><h1 className="text-2xl font-bold">Introuvable</h1></div>;

    // ═══════════════════════ MY ORDERS ═══════════════════════
    if (showMyOrders) {
        const userOrders = isOwner ? myOrders : myOrders.filter(o => o.buyer_id === user?.id);
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#0B0E14] to-[#0F1219] text-white pb-24 overflow-y-auto">
                <div className="relative z-10 max-w-lg mx-auto w-full px-4 pt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Button variant="ghost" size="icon" className="text-white" onClick={() => setShowMyOrders(false)}><ArrowLeft className="h-5 w-5" /></Button>
                        <h2 className="text-lg font-bold">{isOwner ? 'Toutes commandes' : 'Mes commandes'} ({userOrders.length})</h2>
                    </div>

                    {userOrders.length === 0 ? (
                        <div className="text-center py-16"><ShoppingBag className="h-12 w-12 text-slate-600 mx-auto mb-3" /><p className="text-sm text-slate-400">Aucune commande</p></div>
                    ) : (
                        <div className="space-y-3">
                            {userOrders.map(order => (
                                <div key={order.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex gap-3">
                                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/5 shrink-0">
                                            {order.marketplace_products?.image_url ? (
                                                <img src={order.marketplace_products.image_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center"><Package className="h-5 w-5 text-slate-600" /></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-sm truncate">{order.marketplace_products?.name || 'Produit'}</h3>
                                            <p className="text-xs text-teal-400 font-bold">
                                                {fmt(order.total_amount, order.marketplace_products?.currency || 'XAF')} · Qté: {order.quantity}
                                            </p>
                                            <p className="text-[10px] text-slate-500 mt-0.5">
                                                {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-right space-y-1">
                                            <span className={`text-[10px] px-2 py-1 rounded-full inline-block ${order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                                                    order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                                                        order.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                                                            'bg-amber-500/20 text-amber-400'
                                                }`}>{getStatusLabel(order.status)}</span>

                                            {isOwner && order.status === 'pending' && (
                                                <div className="flex gap-1 mt-1">
                                                    <button className="text-[9px] px-2 py-0.5 rounded bg-emerald-600 text-white" onClick={() => updateOrderStatus(order.id, 'confirmed')}>Confirmer</button>
                                                    <button className="text-[9px] px-2 py-0.5 rounded bg-red-600/50 text-red-200" onClick={() => updateOrderStatus(order.id, 'cancelled')}>Annuler</button>
                                                </div>
                                            )}
                                            {isOwner && order.status === 'confirmed' && (
                                                <button className="text-[9px] px-2 py-0.5 rounded bg-blue-600 text-white mt-1" onClick={() => updateOrderStatus(order.id, 'delivered')}>Livré</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ═══════════════════════ PRODUCT DETAIL ═══════════════════════
    if (selectedProduct) {
        const isFav = favorites.has(selectedProduct.id);

        return (
            <div className="min-h-screen bg-gradient-to-b from-[#0B0E14] to-[#0F1219] text-white pb-24 overflow-y-auto">
                <div className="relative z-10 max-w-lg mx-auto w-full">
                    {/* Product image */}
                    <div className="relative">
                        <div className="w-full aspect-square overflow-hidden bg-slate-800">
                            {selectedProduct.image_url ? (
                                <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                            ) : (
                                <ProductPlaceholder category={selectedProduct.category} />
                            )}
                        </div>
                        <Button variant="ghost" size="icon" className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm text-white rounded-full"
                            onClick={() => { setSelectedProduct(null); setShowOrderForm(false); }}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm text-white rounded-full"
                            onClick={e => toggleFavorite(selectedProduct.id, e)}>
                            <Heart className={`h-5 w-5 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
                        </Button>
                        {!selectedProduct.is_available && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <span className="bg-red-600 text-white text-sm px-4 py-2 rounded-full font-bold">Indisponible</span>
                            </div>
                        )}
                    </div>

                    <div className="px-4 pt-4">
                        {/* Price + Title */}
                        <div className="mb-4">
                            <p className="text-2xl font-black text-teal-400">{fmt(selectedProduct.price, selectedProduct.currency)}</p>
                            <h2 className="text-lg font-bold text-white mt-1">{selectedProduct.name}</h2>
                            <div className="flex gap-2 mt-1 flex-wrap">
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
                                    {CATEGORIES.find(c => c.id === selectedProduct.category)?.icon} {CATEGORIES.find(c => c.id === selectedProduct.category)?.label}
                                </span>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                            <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {selectedProduct.stock > 0 ? `${selectedProduct.stock} en stock` : 'Épuisé'}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(selectedProduct.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>

                        {/* Description */}
                        {selectedProduct.description && (
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-white mb-2">Description</h3>
                                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedProduct.description}</p>
                            </div>
                        )}

                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Catégorie</p>
                                <p className="text-xs text-white mt-0.5">{CATEGORIES.find(c => c.id === selectedProduct.category)?.icon} {CATEGORIES.find(c => c.id === selectedProduct.category)?.label}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Stock</p>
                                <p className={`text-xs mt-0.5 ${selectedProduct.stock > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {selectedProduct.stock > 0 ? `${selectedProduct.stock} disponible(s)` : '❌ Épuisé'}
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 col-span-2">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Établissement</p>
                                <p className="text-xs text-white mt-0.5 flex items-center gap-1"><Shield className="h-3 w-3 text-blue-400" />{org.name}</p>
                            </div>
                        </div>

                        {/* Order Form */}
                        <AnimatePresence>
                            {showOrderForm && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                                    <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/20 space-y-3">
                                        <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Passer commande</h3>
                                        <div className="flex items-center gap-3">
                                            <label className="text-xs text-slate-400">Quantité:</label>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setOrderQty(q => Math.max(1, q - 1))} className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center">−</button>
                                                <span className="text-white font-bold w-8 text-center">{orderQty}</span>
                                                <button onClick={() => setOrderQty(q => Math.min(selectedProduct.stock, q + 1))} className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center">+</button>
                                            </div>
                                            <p className="text-teal-400 font-bold text-sm ml-auto">{fmt(selectedProduct.price * orderQty, selectedProduct.currency)}</p>
                                        </div>
                                        <Input placeholder="Adresse de livraison (optionnel)" value={orderAddr} onChange={e => setOrderAddr(e.target.value)} className="bg-white/5 border-white/10 text-white text-sm h-9 rounded-lg" />
                                        <Input placeholder="Notes pour l'administration (optionnel)" value={orderNotes} onChange={e => setOrderNotes(e.target.value)} className="bg-white/5 border-white/10 text-white text-sm h-9 rounded-lg" />
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setShowOrderForm(false)} className="flex-1 text-xs border-white/10 rounded-lg">Annuler</Button>
                                            <Button size="sm" onClick={placeOrder} disabled={saving} className="flex-1 text-xs bg-teal-600 hover:bg-teal-700 rounded-lg">
                                                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                                                Confirmer ({fmt(selectedProduct.price * orderQty, selectedProduct.currency)})
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Action buttons */}
                        <div className="flex gap-3 mb-8">
                            {!isOwner && selectedProduct.is_available && selectedProduct.stock > 0 && (
                                <Button className="flex-1 h-12 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-teal-600/30"
                                    onClick={() => {
                                        if (!user?.id) { toast.info('Connectez-vous pour commander'); return; }
                                        setShowOrderForm(!showOrderForm);
                                    }}>
                                    <ShoppingCart className="h-5 w-5 mr-2" /> Commander
                                </Button>
                            )}
                            {isOwner && (
                                <>
                                    <Button variant="outline" className="flex-1 h-12 border-white/10 text-white rounded-xl"
                                        onClick={() => toggleAvail(selectedProduct.id, selectedProduct.is_available)}>
                                        {selectedProduct.is_available ? '⏸️ Désactiver' : '▶️ Activer'}
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

    // ═══════════════════════ MAIN MARKETPLACE ═══════════════════════
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0B0E14] to-[#0F1219] text-white pb-24 overflow-y-auto">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-teal-600/5 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-20%] left-[-20%] w-[50%] h-[50%] bg-emerald-600/5 blur-[150px] rounded-full" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto w-full px-4 pt-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push(`/${orgSlug}/admin`)} className="p-2 hover:bg-white/5 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-teal-400 to-emerald-300 bg-clip-text text-transparent flex items-center gap-2">
                                <ShoppingBag className="h-6 w-6 text-teal-400" /> Marketplace
                            </h1>
                            <p className="text-xs text-slate-400 mt-0.5">{org.name} • {products.filter(p => p.is_available).length} produits</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {user && myOrders.length > 0 && (
                            <Button size="sm" variant="ghost" className="text-amber-400 hover:bg-amber-500/10 text-xs"
                                onClick={() => setShowMyOrders(true)}>
                                <ShoppingCart className="h-4 w-4 mr-1" /> Commandes ({myOrders.length})
                            </Button>
                        )}
                        {isOwner && (
                            <Button size="sm" onClick={() => setShowAddForm(!showAddForm)} className="bg-teal-600 hover:bg-teal-700">
                                <Plus className="h-4 w-4 mr-1" /> Ajouter
                            </Button>
                        )}
                    </div>
                </div>

                {/* Add Product Form (admin only) */}
                <AnimatePresence>
                    {showAddForm && isOwner && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                            <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                                <h3 className="font-bold text-lg">🛍️ Nouveau produit</h3>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <div><Label className="text-slate-400 text-xs">Nom *</Label><Input value={pName} onChange={e => setPName(e.target.value)} placeholder="Uniforme scolaire" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                                    <div><Label className="text-slate-400 text-xs">Prix (XAF) *</Label><Input type="number" value={pPrice} onChange={e => setPPrice(e.target.value)} placeholder="15000" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                                    <div><Label className="text-slate-400 text-xs">Catégorie</Label>
                                        <select value={pCat} onChange={e => setPCat(e.target.value)} className="w-full h-9 rounded-lg bg-white/5 border border-white/10 text-white px-3 text-sm">
                                            {CATEGORIES.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.icon} {c.label}</option>)}
                                        </select>
                                    </div>
                                    <div><Label className="text-slate-400 text-xs">Stock</Label><Input type="number" value={pStock} onChange={e => setPStock(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                                    <div className="sm:col-span-2"><Label className="text-slate-400 text-xs">Description</Label>
                                        <textarea value={pDesc} onChange={e => setPDesc(e.target.value)} placeholder="Description détaillée du produit..."
                                            className="w-full rounded-lg bg-white/5 border border-white/10 text-white px-3 py-2 text-sm min-h-[60px] resize-none" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <Label className="text-slate-400 text-xs">Image</Label>
                                        <label className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-dashed border-white/20 cursor-pointer hover:bg-white/10 transition">
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
                                    <Button onClick={addProduct} disabled={saving} className="bg-teal-600" size="sm">
                                        {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}<Plus className="w-4 h-4 mr-1" />Publier
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Annuler</Button>
                                </div>
                            </div>
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
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCategory === 'all' ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                        🏪 Tout
                    </button>
                    {CATEGORIES.map(cat => (
                        <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCategory === cat.id ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
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
                            className={`text-[10px] px-2 py-1 rounded-lg transition-all ${sortBy === s.id ? 'bg-white/10 text-white font-semibold' : 'text-slate-500 hover:text-slate-300'}`}>
                            {s.label}
                        </button>
                    ))}
                </div>

                {/* Products Grid */}
                {filtered.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {filtered.map((product, idx) => {
                            const isFav = favorites.has(product.id);
                            return (
                                <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }} whileTap={{ scale: 0.97 }}
                                    onClick={() => setSelectedProduct(product)} className="cursor-pointer group">
                                    <div className="relative">
                                        <div className="w-full aspect-square rounded-xl overflow-hidden shadow-lg mb-2 bg-slate-800">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            ) : (
                                                <ProductPlaceholder category={product.category} />
                                            )}
                                        </div>
                                        <button onClick={e => toggleFavorite(product.id, e)}
                                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                            <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                                        </button>
                                        {!product.is_available && (
                                            <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                                                <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">Indisponible</span>
                                            </div>
                                        )}
                                        {product.stock === 0 && product.is_available && (
                                            <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                                                <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">Épuisé</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-teal-400 font-bold text-sm">{fmt(product.price, product.currency)}</p>
                                    <p className="text-[11px] font-medium text-white truncate">{product.name}</p>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <span className="text-[9px] text-slate-500">{CATEGORIES.find(c => c.id === product.category)?.icon} {CATEGORIES.find(c => c.id === product.category)?.label}</span>
                                        {product.stock > 0 && <span className="text-[9px] text-emerald-500 ml-auto">{product.stock} en stock</span>}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16">
                        <ShoppingBag className="h-12 w-12 text-slate-600 mb-3" />
                        <p className="text-sm text-slate-400">Aucun produit trouvé</p>
                        {isOwner && (
                            <Button className="mt-4 bg-teal-600 hover:bg-teal-700" onClick={() => setShowAddForm(true)}>
                                <Plus className="h-4 w-4 mr-2" /> Ajouter un produit
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
