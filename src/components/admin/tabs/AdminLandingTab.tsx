'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    LayoutDashboard, ExternalLink, Upload, ImagePlus, Loader2, Save,
    Globe, Edit3, X, Sparkles, Smartphone, Monitor, Tablet, Check,
    Eye, ChevronRight, GraduationCap, ArrowRight, Phone, Mail,
    Facebook, Instagram, Twitter, Youtube, Linkedin, Layers, Palette
} from 'lucide-react';
import { uploadToR2 } from '@/lib/r2';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface AdminLandingTabProps {
    org: any;
    orgSlug: string;
    isCustom: boolean;
    onNavigateTab: (tab: any) => void;
    onUpdateOrg: (org: any) => void;
}

type StudioSection = 'hero' | 'about' | 'gallery' | 'buttons' | 'socials' | 'footer' | 'layout';

export function AdminLandingTab({
    org,
    orgSlug,
    isCustom,
    onNavigateTab,
    onUpdateOrg
}: AdminLandingTabProps) {
    const heroImgRef = useRef<HTMLInputElement>(null);
    const aboutImgRef = useRef<HTMLInputElement>(null);
    const galleryImgRef = useRef<HTMLInputElement>(null);

    // Section active dans le Studio
    const [activeSection, setActiveSection] = useState<StudioSection>('hero');
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    const [viewMode, setViewMode] = useState<'studio' | 'form'>('studio');

    // States
    const [lHeroTemplate, setLHeroTemplate] = useState<'full' | 'split' | 'minimal'>(org.hero_template || 'split');
    const [lHeroTitle, setLHeroTitle] = useState(org.hero_title || '');
    const [lHeroSubtitle, setLHeroSubtitle] = useState(org.hero_subtitle || '');
    const [lHeroImage, setLHeroImage] = useState(org.hero_image_url || '');
    const [lAboutText, setLAboutText] = useState(org.about_text || '');
    const [lAboutImage, setLAboutImage] = useState(org.about_image_url || '');
    const [lGalleryImages, setLGalleryImages] = useState<string[]>(org.gallery_images || []);
    const [lSocialFb, setLSocialFb] = useState(org.social_links?.facebook || '');
    const [lSocialIg, setLSocialIg] = useState(org.social_links?.instagram || '');
    const [lSocialTw, setLSocialTw] = useState(org.social_links?.twitter || '');
    const [lSocialTt, setLSocialTt] = useState(org.social_links?.tiktok || '');
    const [lSocialYt, setLSocialYt] = useState(org.social_links?.youtube || '');
    const [lSocialLi, setLSocialLi] = useState(org.social_links?.linkedin || '');
    const [lFooterText, setLFooterText] = useState(org.footer_text || '');

    // Boutons CTA personnalisés
    const [lBtnLoginText, setLBtnLoginText] = useState(org.cta_login_text || 'Espace Élève');
    const [lBtnRegisterText, setLBtnRegisterText] = useState(org.cta_register_text || 'S\'inscrire');
    const [lShowRegisterBtn, setLShowRegisterBtn] = useState(org.show_register_btn !== false);

    const [uploadingImage, setUploadingImage] = useState(false);
    const [lSaving, setLSaving] = useState(false);

    const brandColor = org.brand_color || '#14b8a6';

    const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingImage(true);
        try {
            const res = await uploadToR2(file, `hero/${org.id}`, file.name);
            setLHeroImage(res.url);
            toast.success('Image de bannière téléversée !');
        } catch (err: any) {
            toast.error('Erreur upload : ' + err.message);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleAboutUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingImage(true);
        try {
            const res = await uploadToR2(file, `about/${org.id}`, file.name);
            setLAboutImage(res.url);
            toast.success('Image section À propos téléversée !');
        } catch (err: any) {
            toast.error('Erreur upload : ' + err.message);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setUploadingImage(true);
        try {
            const newUrls: string[] = [];
            for (const file of files) {
                const res = await uploadToR2(file, `gallery/${org.id}`, file.name);
                newUrls.push(res.url);
            }
            setLGalleryImages(p => [...p, ...newUrls]);
            toast.success(`${newUrls.length} photo(s) ajoutée(s) à la galerie !`);
        } catch (err: any) {
            toast.error('Erreur upload : ' + err.message);
        } finally {
            setUploadingImage(false);
        }
    };

    const saveLanding = async () => {
        setLSaving(true);
        try {
            const payload = {
                hero_template: lHeroTemplate,
                hero_title: lHeroTitle || null,
                hero_subtitle: lHeroSubtitle || null,
                hero_image_url: lHeroImage || null,
                about_text: lAboutText || null,
                about_image_url: lAboutImage || null,
                gallery_images: lGalleryImages,
                social_links: {
                    facebook: lSocialFb,
                    instagram: lSocialIg,
                    twitter: lSocialTw,
                    tiktok: lSocialTt,
                    youtube: lSocialYt,
                    linkedin: lSocialLi
                },
                footer_text: lFooterText || null,
                cta_login_text: lBtnLoginText || null,
                cta_register_text: lBtnRegisterText || null,
                show_register_btn: lShowRegisterBtn
            };

            const { error } = await supabase.from('organizations').update(payload).eq('id', org.id);
            if (error) throw error;

            const updatedOrg = { ...org, ...payload };
            onUpdateOrg(updatedOrg);
            toast.success('Page d\'accueil mise à jour avec succès ! 🎉');
        } catch (err: any) {
            toast.error('Erreur sauvegarde : ' + err.message);
        } finally {
            setLSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Banner vers Styles Premium */}
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-teal-500/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">✨</span>
                    <div>
                        <h3 className="font-extrabold text-sm text-white">Studio de Personnalisation Visuelle</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Cliquez directement sur n&apos;importe quelle zone dans l&apos;Aperçu en direct pour la modifier.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewMode(v => v === 'studio' ? 'form' : 'studio')}
                        className="border-white/10 text-white text-xs h-9 rounded-xl"
                    >
                        {viewMode === 'studio' ? '📝 Mode Formulaire' : '🎨 Mode Studio Visuel'}
                    </Button>
                    <Button
                        onClick={() => onNavigateTab('premium_styles')}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs h-9 px-4 rounded-xl shadow-md"
                    >
                        Styles Premium →
                    </Button>
                </div>
            </div>

            {/* Studio Navigation Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
                    {([
                        { id: 'hero', label: '🖼️ Hero & Bannière' },
                        { id: 'buttons', label: '🔘 Boutons & Inscription' },
                        { id: 'about', label: '📖 À propos' },
                        { id: 'gallery', label: '📸 Galerie' },
                        { id: 'socials', label: '🌐 Réseaux' },
                        { id: 'footer', label: '📄 Pied de page' },
                    ] as const).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSection(tab.id)}
                            className={cn(
                                'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all',
                                activeSection === tab.id
                                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    {/* Device switch (only in studio mode) */}
                    {viewMode === 'studio' && (
                        <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1">
                            <button
                                onClick={() => setPreviewDevice('desktop')}
                                className={cn('p-1.5 rounded-lg text-xs transition', previewDevice === 'desktop' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white')}
                                title="Aperçu Ordinateur"
                            >
                                <Monitor className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setPreviewDevice('tablet')}
                                className={cn('p-1.5 rounded-lg text-xs transition', previewDevice === 'tablet' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white')}
                                title="Aperçu Tablette"
                            >
                                <Tablet className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setPreviewDevice('mobile')}
                                className={cn('p-1.5 rounded-lg text-xs transition', previewDevice === 'mobile' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white')}
                                title="Aperçu Mobile"
                            >
                                <Smartphone className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    <a
                        href={isCustom ? '/' : `/${orgSlug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs px-3 py-1.5 rounded-xl bg-teal-600/15 border border-teal-500/30 text-teal-300 hover:bg-teal-600/25 flex items-center gap-1.5 transition font-semibold"
                    >
                        <ExternalLink className="w-3.5 h-3.5" /> Voir le site
                    </a>

                    <Button
                        onClick={saveLanding}
                        disabled={lSaving}
                        size="sm"
                        className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs h-8 px-3.5 shadow-md shadow-cyan-600/20"
                    >
                        {lSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                        Enregistrer
                    </Button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                STUDIO DUAL VIEW (Éditeur à Gauche + Aperçu Direct à Droite)
            ══════════════════════════════════════════════════════════ */}
            <div className={cn(
                'grid gap-6',
                viewMode === 'studio' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1 max-w-4xl mx-auto'
            )}>
                {/* ── PANNEAU ÉDITEUR (Gauche) ── */}
                <div className={cn(
                    'space-y-4',
                    viewMode === 'studio' ? 'lg:col-span-5' : 'w-full'
                )}>
                    {/* SECTION 1 : HERO */}
                    {activeSection === 'hero' && (
                        <div className="p-5 rounded-3xl bg-white/[0.03] border border-cyan-500/30 space-y-4">
                            <h3 className="font-bold text-cyan-300 flex items-center gap-2 text-sm">
                                <Upload className="w-4 h-4" /> Bannière & Titres Principaux
                            </h3>

                            <div>
                                <Label className="text-slate-400 text-xs mb-1.5 block">Modèle de bannière</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {([
                                        { id: 'full', label: 'Plein écran', icon: '🖼️' },
                                        { id: 'split', label: 'Deux colonnes', icon: '⬛' },
                                        { id: 'minimal', label: 'Minimaliste', icon: '✨' },
                                    ] as const).map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setLHeroTemplate(t.id)}
                                            className={cn(
                                                'p-2.5 rounded-xl border-2 text-center transition-all',
                                                lHeroTemplate === t.id
                                                    ? 'border-cyan-400 bg-cyan-500/10'
                                                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                                            )}
                                        >
                                            <span className="text-lg block mb-0.5">{t.icon}</span>
                                            <p className="text-[11px] font-semibold text-white">{t.label}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label className="text-slate-400 text-xs">Titre principal</Label>
                                <Input
                                    value={lHeroTitle}
                                    onChange={e => setLHeroTitle(e.target.value)}
                                    placeholder={org.name}
                                    className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-xs mt-1"
                                />
                            </div>

                            <div>
                                <Label className="text-slate-400 text-xs">Sous-titre / Slogan</Label>
                                <Input
                                    value={lHeroSubtitle}
                                    onChange={e => setLHeroSubtitle(e.target.value)}
                                    placeholder={org.motto || 'Bienvenue sur notre portail officiel'}
                                    className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-xs mt-1"
                                />
                            </div>

                            <div>
                                <Label className="text-slate-400 text-xs">Image de bannière</Label>
                                <div
                                    onClick={() => heroImgRef.current?.click()}
                                    className={cn(
                                        'mt-1 w-full p-4 border-2 border-dashed rounded-2xl bg-white/[0.02] transition-colors cursor-pointer text-center',
                                        lHeroTemplate === 'minimal' ? 'border-white/5 opacity-40 pointer-events-none' : 'border-white/10 hover:border-cyan-500/30'
                                    )}
                                >
                                    {lHeroImage ? (
                                        <div className="flex flex-col items-center">
                                            <img src={lHeroImage} alt="" className="w-full h-24 rounded-xl object-cover mb-2 border border-white/10" />
                                            <p className="text-[11px] text-slate-400">Cliquer pour changer l&apos;image</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-500">
                                            <ImagePlus className="w-6 h-6 mb-1 text-cyan-400" />
                                            <p className="font-semibold text-xs text-white">Téléverser une image</p>
                                            <p className="text-[10px] text-slate-500">PNG, JPG (max 5 Mo)</p>
                                        </div>
                                    )}
                                </div>
                                <input ref={heroImgRef} type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} />
                            </div>
                        </div>
                    )}

                    {/* SECTION 2 : BOUTONS CTA & INSCRIPTION */}
                    {activeSection === 'buttons' && (
                        <div className="p-5 rounded-3xl bg-white/[0.03] border border-cyan-500/30 space-y-4">
                            <h3 className="font-bold text-cyan-300 flex items-center gap-2 text-sm">
                                <GraduationCap className="w-4 h-4" /> Boutons d&apos;Action & Inscription
                            </h3>

                            <div>
                                <Label className="text-slate-400 text-xs">Texte du bouton Connexion (Espace Élève)</Label>
                                <Input
                                    value={lBtnLoginText}
                                    onChange={e => setLBtnLoginText(e.target.value)}
                                    placeholder="Espace Élève"
                                    className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-xs mt-1"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">Redirige vers <code>/{orgSlug}/login</code></p>
                            </div>

                            <div className="pt-2 border-t border-white/10">
                                <label className="flex items-center gap-2.5 cursor-pointer mb-2">
                                    <input
                                        type="checkbox"
                                        checked={lShowRegisterBtn}
                                        onChange={e => setLShowRegisterBtn(e.target.checked)}
                                        className="accent-cyan-500 w-4 h-4"
                                    />
                                    <span className="text-xs font-bold text-white">Afficher le bouton S&apos;inscrire / Postuler</span>
                                </label>

                                {lShowRegisterBtn && (
                                    <div>
                                        <Label className="text-slate-400 text-xs">Texte du bouton Inscription</Label>
                                        <Input
                                            value={lBtnRegisterText}
                                            onChange={e => setLBtnRegisterText(e.target.value)}
                                            placeholder="S'inscrire"
                                            className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-xs mt-1"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SECTION 3 : ABOUT */}
                    {activeSection === 'about' && (
                        <div className="p-5 rounded-3xl bg-white/[0.03] border border-indigo-500/30 space-y-4">
                            <h3 className="font-bold text-indigo-300 flex items-center gap-2 text-sm">
                                <Edit3 className="w-4 h-4" /> À propos de l&apos;établissement
                            </h3>

                            <div>
                                <Label className="text-slate-400 text-xs">Description & Valeurs</Label>
                                <textarea
                                    value={lAboutText}
                                    onChange={e => setLAboutText(e.target.value)}
                                    placeholder="Décrivez votre école, vos filières d'excellence..."
                                    rows={5}
                                    className="w-full mt-1 p-3 rounded-2xl bg-white/5 border border-white/10 text-white text-xs resize-none focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <Label className="text-slate-400 text-xs">Photo de présentation</Label>
                                <div
                                    onClick={() => aboutImgRef.current?.click()}
                                    className="mt-1 w-full p-4 border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.02] hover:border-indigo-500/30 transition-colors cursor-pointer text-center"
                                >
                                    {lAboutImage ? (
                                        <div className="flex flex-col items-center">
                                            <img src={lAboutImage} alt="" className="w-full h-28 rounded-xl object-cover mb-2 border border-white/10" />
                                            <p className="text-[11px] text-slate-400">Cliquer pour changer la photo</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-500">
                                            <ImagePlus className="w-6 h-6 mb-1 text-indigo-400" />
                                            <p className="font-semibold text-xs text-white">Ajouter une photo</p>
                                        </div>
                                    )}
                                </div>
                                <input ref={aboutImgRef} type="file" accept="image/*" className="hidden" onChange={handleAboutUpload} />
                            </div>
                        </div>
                    )}

                    {/* SECTION 4 : GALLERY */}
                    {activeSection === 'gallery' && (
                        <div className="p-5 rounded-3xl bg-white/[0.03] border border-amber-500/30 space-y-4">
                            <h3 className="font-bold text-amber-300 flex items-center gap-2 text-sm">
                                <Upload className="w-4 h-4" /> Galerie photos
                            </h3>

                            <div
                                onClick={() => galleryImgRef.current?.click()}
                                className="w-full p-4 border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.02] hover:border-amber-500/30 transition-colors cursor-pointer text-center"
                            >
                                <ImagePlus className="w-6 h-6 mx-auto mb-1 text-amber-400" />
                                <p className="font-semibold text-xs text-white">Ajouter des photos</p>
                                <p className="text-[10px] text-slate-500">Plusieurs fichiers simultanés</p>
                            </div>
                            <input ref={galleryImgRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />

                            {lGalleryImages.length > 0 && (
                                <div className="grid grid-cols-3 gap-2">
                                    {lGalleryImages.map((img, i) => (
                                        <div key={i} className="relative group rounded-xl overflow-hidden border border-white/10 aspect-video">
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => setLGalleryImages(p => p.filter((_, j) => j !== i))}
                                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* SECTION 5 : SOCIALS */}
                    {activeSection === 'socials' && (
                        <div className="p-5 rounded-3xl bg-white/[0.03] border border-pink-500/30 space-y-3">
                            <h3 className="font-bold text-pink-300 flex items-center gap-2 text-sm">
                                <Globe className="w-4 h-4" /> Liens Réseaux Sociaux
                            </h3>
                            <div>
                                <Label className="text-slate-400 text-xs">Facebook</Label>
                                <Input value={lSocialFb} onChange={e => setLSocialFb(e.target.value)} placeholder="https://facebook.com/..." className="bg-white/5 border-white/10 text-white h-8 rounded-xl text-xs mt-0.5" />
                            </div>
                            <div>
                                <Label className="text-slate-400 text-xs">Instagram</Label>
                                <Input value={lSocialIg} onChange={e => setLSocialIg(e.target.value)} placeholder="https://instagram.com/..." className="bg-white/5 border-white/10 text-white h-8 rounded-xl text-xs mt-0.5" />
                            </div>
                            <div>
                                <Label className="text-slate-400 text-xs">TikTok</Label>
                                <Input value={lSocialTt} onChange={e => setLSocialTt(e.target.value)} placeholder="https://tiktok.com/@..." className="bg-white/5 border-white/10 text-white h-8 rounded-xl text-xs mt-0.5" />
                            </div>
                            <div>
                                <Label className="text-slate-400 text-xs">YouTube</Label>
                                <Input value={lSocialYt} onChange={e => setLSocialYt(e.target.value)} placeholder="https://youtube.com/@..." className="bg-white/5 border-white/10 text-white h-8 rounded-xl text-xs mt-0.5" />
                            </div>
                        </div>
                    )}

                    {/* SECTION 6 : FOOTER */}
                    {activeSection === 'footer' && (
                        <div className="p-5 rounded-3xl bg-white/[0.03] border border-slate-500/30 space-y-3">
                            <h3 className="font-bold text-slate-300 flex items-center gap-2 text-sm">
                                <Edit3 className="w-4 h-4" /> Pied de page & Copyright
                            </h3>
                            <Input
                                value={lFooterText}
                                onChange={e => setLFooterText(e.target.value)}
                                placeholder={`© ${new Date().getFullYear()} ${org.name}. Tous droits réservés.`}
                                className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-xs"
                            />
                        </div>
                    )}
                </div>

                {/* ── PANNEAU APERÇU DIRECT INTERACTIF (Droite) ── */}
                {viewMode === 'studio' && (
                    <div className="lg:col-span-7 flex flex-col items-center">
                        <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-2 px-2">
                            <span className="flex items-center gap-1.5 font-semibold text-white">
                                <Eye className="w-3.5 h-3.5 text-cyan-400" /> Aperçu en temps réel (Cliquez pour éditer)
                            </span>
                            <span className="text-[11px] text-cyan-300/80 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                                Mode Interactif WYSIWYG
                            </span>
                        </div>

                        {/* Device Frame */}
                        <div className={cn(
                            'transition-all duration-300 rounded-[2.5rem] p-3 border-4 border-slate-800 bg-[#08090E] shadow-2xl overflow-hidden w-full max-h-[750px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10',
                            previewDevice === 'mobile' ? 'max-w-[340px]' : previewDevice === 'tablet' ? 'max-w-[560px]' : 'max-w-full'
                        )}>
                            {/* Navbar Mockup avec Click-to-Edit */}
                            <div
                                onClick={() => setActiveSection('buttons')}
                                className={cn(
                                    'p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 mb-4 group',
                                    activeSection === 'buttons' ? 'border-cyan-400 bg-cyan-500/10 ring-2 ring-cyan-500/30' : 'border-white/5 bg-white/[0.02] hover:border-cyan-500/40'
                                )}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    {org.logo_url ? (
                                        <img src={org.logo_url} alt="" className="w-7 h-7 rounded-lg object-contain" />
                                    ) : (
                                        <div className="w-7 h-7 rounded-lg bg-cyan-500/30 flex items-center justify-center text-xs font-black">
                                            {org.name[0]}
                                        </div>
                                    )}
                                    <span className="font-bold text-xs truncate text-white">{org.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {lShowRegisterBtn && (
                                        <span className="px-2 py-1 rounded-lg bg-white/10 text-[10px] font-semibold text-white/80">
                                            {lBtnRegisterText}
                                        </span>
                                    )}
                                    <span
                                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shadow"
                                        style={{ background: brandColor }}
                                    >
                                        {lBtnLoginText}
                                    </span>
                                </div>
                            </div>

                            {/* Hero Mockup avec Click-to-Edit */}
                            <div
                                onClick={() => setActiveSection('hero')}
                                className={cn(
                                    'p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden mb-4 group',
                                    activeSection === 'hero' ? 'border-cyan-400 bg-cyan-500/10 ring-2 ring-cyan-500/30' : 'border-white/5 bg-white/[0.02] hover:border-cyan-500/40'
                                )}
                            >
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition bg-cyan-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                                    <Edit3 className="w-2.5 h-2.5" /> Modifier Hero
                                </div>

                                <div className={cn('gap-4 items-center', lHeroTemplate === 'split' ? 'grid grid-cols-2' : 'flex flex-col text-center')}>
                                    <div>
                                        <h2 className="font-black text-sm sm:text-base text-white leading-tight">
                                            {lHeroTitle || org.name}
                                        </h2>
                                        <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">
                                            {lHeroSubtitle || org.motto || 'Excellence académique et insertion professionnelle'}
                                        </p>
                                        <div className="flex gap-2 mt-3 justify-center sm:justify-start">
                                            <span className="px-3 py-1 rounded-xl text-white text-[10px] font-bold shadow" style={{ background: brandColor }}>
                                                {lBtnLoginText}
                                            </span>
                                            {lShowRegisterBtn && (
                                                <span className="px-3 py-1 rounded-xl bg-white/10 text-[10px] font-semibold text-white">
                                                    {lBtnRegisterText}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {lHeroTemplate !== 'minimal' && (
                                        <div className="w-full h-24 rounded-2xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center">
                                            {lHeroImage ? (
                                                <img src={lHeroImage} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-[10px] text-slate-500">Image Hero</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* About Mockup avec Click-to-Edit */}
                            <div
                                onClick={() => setActiveSection('about')}
                                className={cn(
                                    'p-4 rounded-3xl border transition-all cursor-pointer relative mb-4 group',
                                    activeSection === 'about' ? 'border-indigo-400 bg-indigo-500/10 ring-2 ring-indigo-500/30' : 'border-white/5 bg-white/[0.02] hover:border-indigo-500/40'
                                )}
                            >
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                                    <Edit3 className="w-2.5 h-2.5" /> Modifier À propos
                                </div>
                                <h3 className="text-xs font-bold text-white mb-1">📖 Présentation de l&apos;école</h3>
                                <p className="text-[10px] text-slate-400 line-clamp-3">
                                    {lAboutText || 'Présentation de l\'établissement, des infrastructures, corps professoral et filières certifiées.'}
                                </p>
                            </div>

                            {/* Gallery Mockup avec Click-to-Edit */}
                            <div
                                onClick={() => setActiveSection('gallery')}
                                className={cn(
                                    'p-4 rounded-3xl border transition-all cursor-pointer relative mb-4 group',
                                    activeSection === 'gallery' ? 'border-amber-400 bg-amber-500/10 ring-2 ring-amber-500/30' : 'border-white/5 bg-white/[0.02] hover:border-amber-500/40'
                                )}
                            >
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition bg-amber-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                                    <Edit3 className="w-2.5 h-2.5" /> Modifier Galerie ({lGalleryImages.length})
                                </div>
                                <h3 className="text-xs font-bold text-white mb-2">📸 Galerie Photos</h3>
                                {lGalleryImages.length > 0 ? (
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {lGalleryImages.slice(0, 4).map((img, i) => (
                                            <img key={i} src={img} alt="" className="w-full h-12 rounded-lg object-cover" />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-3 border border-dashed border-white/10 rounded-xl text-center text-[10px] text-slate-500">
                                        Cliquez pour ajouter des photos à la galerie
                                    </div>
                                )}
                            </div>

                            {/* Footer Mockup avec Click-to-Edit */}
                            <div
                                onClick={() => setActiveSection('footer')}
                                className={cn(
                                    'p-3 rounded-2xl border transition-all cursor-pointer text-center group',
                                    activeSection === 'footer' ? 'border-slate-400 bg-white/10 ring-2 ring-white/20' : 'border-white/5 bg-white/[0.02] hover:border-white/20'
                                )}
                            >
                                <p className="text-[9px] text-slate-500">
                                    {lFooterText || `© ${new Date().getFullYear()} ${org.name}. Tous droits réservés.`}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
