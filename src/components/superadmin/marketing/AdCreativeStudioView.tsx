'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, Image as ImageIcon, Upload, RefreshCw,
    Download, Copy, CheckCircle2, Wand2, Layers,
    Eye, Share2, Tag, LayoutTemplate, Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { marketingService } from './marketing-service';
import { MarketingCreative } from './marketing-types';

export function AdCreativeStudioView() {
    const [creatives, setCreatives] = useState<MarketingCreative[]>(() => marketingService.getCreatives());
    const [product, setProduct] = useState('IziTeach School Suite');
    const [targetAudience, setTargetAudience] = useState('Directeurs d\'écoles et centres de formation');
    const [tone, setTone] = useState('Professionnel, Séduisant & Visionnaire');
    const [format, setFormat] = useState<MarketingCreative['format']>('email_banner');
    const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedCreative, setSelectedCreative] = useState<MarketingCreative | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Create local object URL for preview / remix
        const url = URL.createObjectURL(file);
        setReferenceImageUrl(url);
        toast.success('📷 Image de référence importée pour le remixage IA !');
    };

    const handleGenerateCreative = async () => {
        setIsGenerating(true);
        try {
            await new Promise(r => setTimeout(r, 1200)); // AI Generation simulation

            const newCrea = marketingService.generateAdCreative({
                product,
                target_audience: targetAudience,
                tone,
                format,
                reference_image_url: referenceImageUrl || undefined,
            });

            setCreatives(marketingService.getCreatives());
            setSelectedCreative(newCrea);
            toast.success('✨ Visuel & Texte publicitaire générés avec succès !');
        } catch {
            toast.error('Erreur lors de la génération de la créa');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyText = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('📋 Texte copié dans le presse-papier !');
    };

    return (
        <div className="space-y-6">
            {/* Header banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-fuchsia-600/10 via-pink-600/10 to-violet-600/10 border border-fuchsia-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/20 text-white flex-shrink-0">
                        <Wand2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white flex items-center gap-2">
                            Studio Créatif Publicitaire & Remix d'Images IA
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                                Image Remix & Copywriting
                            </span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Générez des visuels publicitaires percutants, uploadez vos flyers de référence pour les régénérer et concevez des textes captivants.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left: Creative Controls */}
                <div className="lg:col-span-1 p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Palette className="w-4 h-4 text-fuchsia-400" />
                        Paramètres de Création
                    </h3>

                    {/* Product */}
                    <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 font-medium">Offre / Produit à promouvoir</label>
                        <Input
                            value={product}
                            onChange={e => setProduct(e.target.value)}
                            placeholder="IziTeach, Module Examens..."
                            className="bg-white/5 border-white/10 text-white text-xs h-8 rounded-xl"
                        />
                    </div>

                    {/* Target Audience */}
                    <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 font-medium">Audience cible</label>
                        <Input
                            value={targetAudience}
                            onChange={e => setTargetAudience(e.target.value)}
                            placeholder="Directeurs d'écoles, Universités..."
                            className="bg-white/5 border-white/10 text-white text-xs h-8 rounded-xl"
                        />
                    </div>

                    {/* Format */}
                    <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 font-medium">Format Publicitaire</label>
                        <select
                            value={format}
                            onChange={e => setFormat(e.target.value as any)}
                            className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-fuchsia-500"
                        >
                            <option value="email_banner">✉️ Bannière Email & Newsletter (1200x630)</option>
                            <option value="social_post">📱 Post Réseaux Sociaux (1080x1080)</option>
                            <option value="story_ad">✨ Format Story & Reel (1080x1920)</option>
                            <option value="pitch_deck">📑 Visuel Pitch & Plaquette B2B</option>
                        </select>
                    </div>

                    {/* Image Upload for Remix */}
                    <div className="space-y-1.5 pt-1">
                        <label className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                            <span>Image / Flyer de Référence à Remixer</span>
                            {referenceImageUrl && (
                                <button
                                    type="button"
                                    onClick={() => setReferenceImageUrl(null)}
                                    className="text-[10px] text-red-400 hover:underline"
                                >
                                    Supprimer
                                </button>
                            )}
                        </label>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                        />

                        {referenceImageUrl ? (
                            <div className="relative rounded-xl border border-fuchsia-500/30 overflow-hidden h-32 bg-black/40 group">
                                <img src={referenceImageUrl} alt="Référence" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                    <Button
                                        onClick={() => fileInputRef.current?.click()}
                                        variant="outline"
                                        className="text-[10px] h-7 bg-white/10 text-white border-white/20"
                                    >
                                        Changer l'image
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-white/10 hover:border-fuchsia-500/50 rounded-xl p-4 text-center cursor-pointer transition bg-white/[0.01] hover:bg-white/[0.03]"
                            >
                                <Upload className="w-6 h-6 text-slate-500 mx-auto mb-1.5" />
                                <p className="text-xs text-white font-semibold">Uploader une image ou flyer</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">L'IA s'en inspirera pour remixer le visuel</p>
                            </div>
                        )}
                    </div>

                    {/* Generate Action */}
                    <Button
                        onClick={handleGenerateCreative}
                        disabled={isGenerating}
                        className="w-full h-11 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-fuchsia-600/25 flex items-center justify-center gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Génération et remixage IA en cours...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Générer le Visuel & Copywriting
                            </>
                        )}
                    </Button>
                </div>

                {/* Right: Creative Gallery & Mockup Preview */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Active Preview */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                        <h3 className="text-sm font-bold text-white flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <LayoutTemplate className="w-4 h-4 text-fuchsia-400" />
                                Création Publicitaire Générée
                            </span>
                            {selectedCreative && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 font-mono">
                                    {selectedCreative.format}
                                </span>
                            )}
                        </h3>

                        {selectedCreative || creatives[0] ? (
                            (() => {
                                const current = selectedCreative || creatives[0];
                                return (
                                    <div className="space-y-4">
                                        {/* Mockup Card */}
                                        <div className="rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 shadow-2xl relative">
                                            {current.image_url && (
                                                <div className="relative h-64 sm:h-80 w-full overflow-hidden">
                                                    <img
                                                        src={current.image_url}
                                                        alt={current.headline}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                                                    
                                                    {/* Text overlay on image */}
                                                    <div className="absolute bottom-4 left-4 right-4 space-y-2">
                                                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-fuchsia-600 text-white inline-block">
                                                            IziTeach Pro
                                                        </span>
                                                        <h4 className="text-xl sm:text-2xl font-black text-white leading-tight">
                                                            {current.headline}
                                                        </h4>
                                                        <p className="text-xs text-slate-300 line-clamp-2">
                                                            {current.body_copy}
                                                        </p>
                                                        <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-bold text-xs shadow-lg mt-1 inline-block">
                                                            {current.cta_text} →
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Copy Text Blocks with 1-click copy */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Titre Accrocheur</span>
                                                    <button
                                                        onClick={() => copyText(current.headline)}
                                                        className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
                                                    >
                                                        <Copy className="w-3 h-3" /> Copier
                                                    </button>
                                                </div>
                                                <p className="text-xs text-white font-medium">{current.headline}</p>
                                            </div>

                                            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Appel à l'Action (CTA)</span>
                                                    <button
                                                        onClick={() => copyText(current.cta_text)}
                                                        className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
                                                    >
                                                        <Copy className="w-3 h-3" /> Copier
                                                    </button>
                                                </div>
                                                <p className="text-xs text-emerald-400 font-bold">{current.cta_text}</p>
                                            </div>
                                        </div>

                                        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-slate-500 font-bold uppercase">Texte du Message Publicitaire</span>
                                                <button
                                                    onClick={() => copyText(current.body_copy)}
                                                    className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
                                                >
                                                    <Copy className="w-3 h-3" /> Copier
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-300 leading-relaxed">{current.body_copy}</p>
                                        </div>
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="py-16 text-center text-slate-500 text-xs">
                                Aucun visuel généré pour le moment.
                            </div>
                        )}
                    </div>

                    {/* Historical Creatives */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Layers className="w-4 h-4 text-violet-400" />
                            Historique des Visuels & Bannières
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {creatives.map((c) => (
                                <div
                                    key={c.id}
                                    onClick={() => setSelectedCreative(c)}
                                    className="rounded-xl border border-white/10 overflow-hidden bg-white/5 cursor-pointer hover:border-fuchsia-500/50 transition group"
                                >
                                    {c.image_url && (
                                        <div className="h-24 w-full overflow-hidden">
                                            <img src={c.image_url} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                                        </div>
                                    )}
                                    <div className="p-2 text-left">
                                        <p className="text-[11px] font-bold text-white truncate">{c.title}</p>
                                        <p className="text-[9px] text-slate-400 font-mono">{c.format}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
