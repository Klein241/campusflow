'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    LayoutDashboard, ExternalLink, Upload, ImagePlus, Loader2, Save,
    Globe, Edit3, X, Sparkles, Smartphone, Monitor, Tablet, Check,
    Eye, ChevronRight, GraduationCap, ArrowRight, Phone, Mail,
    Facebook, Instagram, Twitter, Youtube, Linkedin, Layers, Palette,
    Sliders, BookOpen
} from 'lucide-react';
import { uploadToR2 } from '@/lib/r2';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { cleanMotto } from '@/lib/clean-motto';
import { saveOrgStyle } from '@/lib/api-org-style';

// Import des Templates pour le Rendu Réel
import { TemplateSegmentedHub } from '@/components/campus/landing-templates/template-segmented-hub';
import { TemplateProductMastery } from '@/components/campus/landing-templates/template-product-mastery';
import { TemplateBentoGrid } from '@/components/campus/landing-templates/template-bento-grid';
import { TemplateTechMentor } from '@/components/campus/landing-templates/template-tech-mentor';
import { TemplateCoachPastelle } from '@/components/campus/landing-templates/template-coach-pastelle';
import { TemplateCreativeStudio } from '@/components/campus/landing-templates/template-creative-studio';
import { TemplateGlassShowcase } from '@/components/campus/landing-templates/template-glass-showcase';
import { TemplateNexisStudio } from '@/components/campus/landing-templates/template-nexis-studio';
import { TemplateBentoBox } from '@/components/campus/landing-templates/template-bento-box';
import { TemplateHubOnglets } from '@/components/campus/landing-templates/template-hub-onglets';
import { TemplateCustomizerStudio } from '@/components/campus/template-customizer-studio';

interface AdminLandingTabProps {
    org: any;
    orgSlug: string;
    isCustom: boolean;
    onNavigateTab: (tab: any) => void;
    onUpdateOrg: (org: any) => void;
}

type StudioSection = 'hero' | 'about' | 'gallery' | 'buttons' | 'socials' | 'footer';

export function AdminLandingTab({
    org,
    orgSlug,
    isCustom,
    onNavigateTab,
    onUpdateOrg
}: AdminLandingTabProps) {
    const rawCfg = org.template_config || {};

    const heroImgRef = useRef<HTMLInputElement>(null);
    const aboutImgRef = useRef<HTMLInputElement>(null);
    const galleryImgRef = useRef<HTMLInputElement>(null);

    // Section active dans l'éditeur rapide
    const [activeSection, setActiveSection] = useState<StudioSection>('hero');
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    const [viewMode, setViewMode] = useState<'studio' | 'form'>('studio');
    const [isStudioOpen, setIsStudioOpen] = useState(false);

    // Données réelles des formations et filières pour le rendu en direct
    const [localClassrooms, setLocalClassrooms] = useState<any[]>([]);
    const [localFilieres, setLocalFilieres] = useState<any[]>([]);

    useEffect(() => {
        async function fetchOrgData() {
            if (!org?.id) return;
            try {
                const [clsRes, filRes] = await Promise.all([
                    supabase.from('classrooms').select('*').eq('organization_id', org.id).order('created_at', { ascending: true }),
                    supabase.from('filieres').select('*').eq('organization_id', org.id).order('created_at', { ascending: true })
                ]);
                if (clsRes.data) setLocalClassrooms(clsRes.data);
                if (filRes.data) setLocalFilieres(filRes.data);
            } catch (err) {
                console.error('Erreur chargement données landing tab:', err);
            }
        }
        fetchOrgData();
    }, [org?.id]);

    // Initialisation synchronisée avec template_config ET les colonnes org
    const [lHeroTemplate, setLHeroTemplate] = useState<'full' | 'split' | 'minimal'>(org.hero_template || 'split');
    const [lHeroTitle, setLHeroTitle] = useState(rawCfg.trainer_name || org.hero_title || org.name || '');
    const [lHeroSubtitle, setLHeroSubtitle] = useState(rawCfg.trainer_subtitle || rawCfg.trainer_title || org.hero_subtitle || org.motto || '');
    const [lHeroImage, setLHeroImage] = useState(rawCfg.trainer_photo_url || org.hero_image_url || '');
    const [lAboutText, setLAboutText] = useState(rawCfg.trainer_bio || rawCfg.about_text || org.about_text || '');
    const [lAboutImage, setLAboutImage] = useState(rawCfg.about_image_url || org.about_image_url || '');
    const [lGalleryImages, setLGalleryImages] = useState<string[]>(rawCfg.gallery_images || org.gallery_images || []);
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

    // Sauvegarde avec double synchronisation : Base de données + template_config
    const saveLanding = async () => {
        setLSaving(true);
        try {
            const updatedConfig = {
                ...(org.template_config || {}),
                trainer_name: lHeroTitle,
                trainer_title: lHeroSubtitle,
                trainer_subtitle: lHeroSubtitle,
                trainer_photo_url: lHeroImage,
                trainer_bio: lAboutText,
                about_text: lAboutText,
                gallery_images: lGalleryImages,
            };

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
                show_register_btn: lShowRegisterBtn,
                template_config: updatedConfig
            };

            const saveRes = await saveOrgStyle(org.id, org.slug || orgSlug, payload);
            const updatedOrg = saveRes.org || { ...org, ...payload };
            onUpdateOrg(updatedOrg);
            toast.success('Page d\'accueil et templates synchronisés avec succès ! 🎉');
        } catch (err: any) {
            toast.error('Erreur sauvegarde : ' + err.message);
        } finally {
            setLSaving(false);
        }
    };

    // Live Org synthétique pour réactivité instantanée dans l'Aperçu
    const liveOrg = {
        ...org,
        name: lHeroTitle || org.name,
        hero_title: lHeroTitle || org.hero_title,
        motto: cleanMotto(lHeroSubtitle || org.motto),
        hero_subtitle: cleanMotto(lHeroSubtitle || org.hero_subtitle),
        about_text: lAboutText || org.about_text,
        hero_image_url: lHeroImage || org.hero_image_url,
        about_image_url: lAboutImage || org.about_image_url,
        gallery_images: lGalleryImages,
        template_config: {
            ...(org.template_config || {}),
            trainer_name: lHeroTitle || org.name,
            trainer_title: lHeroSubtitle || org.motto,
            trainer_subtitle: lHeroSubtitle || org.hero_subtitle,
            trainer_photo_url: lHeroImage || org.hero_image_url,
            trainer_bio: lAboutText || org.about_text,
            about_text: lAboutText || org.about_text,
            gallery_images: lGalleryImages,
            custom_programs: undefined,
        }
    };

    // Rendu en direct du template actif réel
    const renderActiveTemplate = () => {
        const props = {
            org: liveOrg,
            orgSlug,
            classrooms: localClassrooms,
            filieres: localFilieres,
            teacherCount: 15,
            studentCount: 350,
            gallery: lGalleryImages.length > 0 ? lGalleryImages : (org.gallery_images || []),
            bc: brandColor,
            onOpenInscription: () => toast.info('Aperçu interactif : inscription réelle sur le site public.'),
        };

        switch (org.landing_layout || 'segmented_hub') {
            case 'product_mastery':
                return <TemplateProductMastery {...props} />;
            case 'creative_studio':
                return <TemplateCreativeStudio {...props} />;
            case 'coach_pastelle':
                return <TemplateCoachPastelle {...props} />;
            case 'tech_mentor':
                return <TemplateTechMentor {...props} />;
            case 'nexis_studio':
                return <TemplateNexisStudio {...props} />;
            case 'bento_box':
                return <TemplateBentoBox {...props} />;
            case 'glass_showcase':
                return <TemplateGlassShowcase {...props} />;
            case 'segmented_hub':
                return <TemplateSegmentedHub {...props} />;
            case 'hub_onglets':
                return <TemplateHubOnglets {...props} />;
            case 'bento_grid':
            default:
                return <TemplateBentoGrid {...props} />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Banner d'Unification vers le Studio Plein Écran */}
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-emerald-500/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl shrink-0">
                        ✨
                    </div>
                    <div>
                        <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                            <span>Gestion de la Page d'accueil</span>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Template actif : {org.landing_layout || 'segmented_hub'}
                            </span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Modifiez les informations essentielles ci-dessous ou ouvrez le Studio interactif pour tout éditer au clic.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewMode(v => v === 'studio' ? 'form' : 'studio')}
                        className="border-white/10 text-white text-xs h-9 rounded-xl hover:bg-white/10"
                    >
                        {viewMode === 'studio' ? '📝 Mode Formulaire Seul' : '🎨 Mode Split Studio'}
                    </Button>
                    <Button
                        onClick={() => setIsStudioOpen(true)}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs h-9 px-4 rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
                    >
                        <Sliders className="w-3.5 h-3.5" />
                        Ouvrir le Studio Plein Écran
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
                        { id: 'gallery', label: '📸 Galerie Photos' },
                        { id: 'socials', label: '🌐 Réseaux Sociaux' },
                        { id: 'footer', label: '📄 Pied de page' },
                    ] as const).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSection(tab.id)}
                            className={cn(
                                'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer',
                                activeSection === tab.id
                                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    {/* Device switch */}
                    {viewMode === 'studio' && (
                        <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1">
                            <button
                                onClick={() => setPreviewDevice('desktop')}
                                className={cn('p-1.5 rounded-lg text-xs transition cursor-pointer', previewDevice === 'desktop' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white')}
                                title="Aperçu Ordinateur"
                            >
                                <Monitor className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setPreviewDevice('tablet')}
                                className={cn('p-1.5 rounded-lg text-xs transition cursor-pointer', previewDevice === 'tablet' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white')}
                                title="Aperçu Tablette"
                            >
                                <Tablet className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setPreviewDevice('mobile')}
                                className={cn('p-1.5 rounded-lg text-xs transition cursor-pointer', previewDevice === 'mobile' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white')}
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
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs h-8 px-4 shadow-md shadow-amber-500/20 cursor-pointer"
                    >
                        {lSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                        Enregistrer
                    </Button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                STUDIO DUAL VIEW (Éditeur à Gauche + Aperçu Réel à Droite)
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
                        <div className="p-5 rounded-3xl bg-white/[0.03] border border-amber-500/30 space-y-4">
                            <h3 className="font-bold text-amber-300 flex items-center gap-2 text-sm">
                                <Upload className="w-4 h-4" /> Bannière & Titres Principaux
                            </h3>

                            <div>
                                <Label className="text-slate-400 text-xs mb-1.5 block">Titre principal / Nom affiché</Label>
                                <Input
                                    value={lHeroTitle}
                                    onChange={e => setLHeroTitle(e.target.value)}
                                    placeholder={org.name}
                                    className="bg-white/5 border-white/10 text-white h-10 rounded-xl text-xs font-bold"
                                />
                            </div>

                            <div>
                                <Label className="text-slate-400 text-xs mb-1.5 block">Sous-titre / Slogan Hero</Label>
                                <Textarea
                                    value={lHeroSubtitle}
                                    onChange={e => setLHeroSubtitle(e.target.value)}
                                    rows={3}
                                    placeholder="Décrivez votre vision ou promesse de formation..."
                                    className="bg-white/5 border-white/10 text-white rounded-xl text-xs resize-none"
                                />
                            </div>

                            <div>
                                <Label className="text-slate-400 text-xs mb-1.5 block">Image de bannière Hero HD</Label>
                                {lHeroImage && (
                                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 mb-2 group">
                                        <img src={lHeroImage} alt="Hero" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => setLHeroImage('')}
                                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-red-600 text-white transition opacity-0 group-hover:opacity-100"
                                            title="Retirer l'image"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                                <input ref={heroImgRef} type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={uploadingImage}
                                    onClick={() => heroImgRef.current?.click()}
                                    className="w-full border-dashed border-amber-500/40 text-amber-300 hover:bg-amber-500/10 h-9 rounded-xl text-xs cursor-pointer"
                                >
                                    {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <ImagePlus className="w-3.5 h-3.5 mr-1.5" />}
                                    {lHeroImage ? 'Changer l\'image Hero' : 'Téléverser une image Hero HD'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* SECTION 2 : BOUTONS */}
                    {activeSection === 'buttons' && (
                        <div className="p-5 rounded-3xl bg-white/[0.03] border border-cyan-500/30 space-y-4">
                            <h3 className="font-bold text-cyan-300 flex items-center gap-2 text-sm">
                                <Sparkles className="w-4 h-4" /> Boutons d'Action & En-tête
                            </h3>

                            <div>
                                <Label className="text-slate-400 text-xs mb-1 block">Texte Bouton Connexion</Label>
                                <Input
                                    value={lBtnLoginText}
                                    onChange={e => setLBtnLoginText(e.target.value)}
                                    placeholder="Espace Élève"
                                    className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-xs"
                                />
                            </div>

                            <div>
                                <Label className="text-slate-400 text-xs mb-1 block">Texte Bouton Inscription</Label>
                                <Input
                                    value={lBtnRegisterText}
                                    onChange={e => setLBtnRegisterText(e.target.value)}
                                    placeholder="S'inscrire"
                                    className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-xs"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                                <div>
                                    <span className="text-xs font-bold text-white block">Afficher le bouton d'inscription</span>
                                    <span className="text-[10px] text-slate-400">Permet aux nouveaux apprenants de postuler directement</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={lShowRegisterBtn}
                                    onChange={e => setLShowRegisterBtn(e.target.checked)}
                                    className="w-4 h-4 rounded text-amber-500 focus:ring-0 cursor-pointer"
                                />
                            </div>
                        </div>
                    )}

                    {/* SECTION 3 : À PROPOS */}
                    {activeSection === 'about' && (
                        <div className="p-5 rounded-3xl bg-white/[0.03] border border-indigo-500/30 space-y-4">
                            <h3 className="font-bold text-indigo-300 flex items-center gap-2 text-sm">
                                <GraduationCap className="w-4 h-4" /> Section Présentation & Histoire
                            </h3>

                            <div>
                                <Label className="text-slate-400 text-xs mb-1.5 block">Texte de présentation</Label>
                                <Textarea
                                    value={lAboutText}
                                    onChange={e => setLAboutText(e.target.value)}
                                    rows={5}
                                    placeholder="Présentez l'histoire de l'établissement, vos valeurs et votre pédagogie..."
                                    className="bg-white/5 border-white/10 text-white rounded-xl text-xs resize-none"
                                />
                            </div>

                            <div>
                                <Label className="text-slate-400 text-xs mb-1.5 block">Photo de la section À Propos</Label>
                                {lAboutImage && (
                                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 mb-2 group">
                                        <img src={lAboutImage} alt="About" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => setLAboutImage('')}
                                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-red-600 text-white transition opacity-0 group-hover:opacity-100"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                                <input ref={aboutImgRef} type="file" accept="image/*" className="hidden" onChange={handleAboutUpload} />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={uploadingImage}
                                    onClick={() => aboutImgRef.current?.click()}
                                    className="w-full border-dashed border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 h-9 rounded-xl text-xs cursor-pointer"
                                >
                                    {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <ImagePlus className="w-3.5 h-3.5 mr-1.5" />}
                                    {lAboutImage ? 'Remplacer la photo À Propos' : 'Ajouter une photo À Propos'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* SECTION 4 : GALERIE */}
                    {activeSection === 'gallery' && (
                        <div className="p-5 rounded-3xl bg-white/[0.03] border border-amber-500/30 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-amber-300 flex items-center gap-2 text-sm">
                                    <ImagePlus className="w-4 h-4" /> Galerie de Photos ({lGalleryImages.length})
                                </h3>
                                <input ref={galleryImgRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
                                <Button
                                    size="sm"
                                    disabled={uploadingImage}
                                    onClick={() => galleryImgRef.current?.click()}
                                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl h-8 px-3 cursor-pointer"
                                >
                                    {uploadingImage ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                                    Ajouter des photos
                                </Button>
                            </div>

                            {lGalleryImages.length === 0 ? (
                                <div className="p-6 border border-dashed border-white/10 rounded-2xl text-center text-xs text-slate-400">
                                    Aucune photo dans la galerie pour le moment. Cliquez sur "Ajouter des photos".
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-2">
                                    {lGalleryImages.map((url, i) => (
                                        <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-white/10 group">
                                            <img src={url} alt={`Galerie ${i}`} className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => setLGalleryImages(p => p.filter((_, idx) => idx !== i))}
                                                className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-red-600 text-white transition opacity-0 group-hover:opacity-100"
                                                title="Supprimer"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* SECTION 5 : RÉSEAUX SOCIAUX */}
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
                            <div>
                                <Label className="text-slate-400 text-xs">LinkedIn</Label>
                                <Input value={lSocialLi} onChange={e => setLSocialLi(e.target.value)} placeholder="https://linkedin.com/in/..." className="bg-white/5 border-white/10 text-white h-8 rounded-xl text-xs mt-0.5" />
                            </div>
                        </div>
                    )}

                    {/* SECTION 6 : PIED DE PAGE */}
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

                {/* ── PANNEAU APERÇU DIRECT RÉEL (Droite) ── */}
                {viewMode === 'studio' && (
                    <div className="lg:col-span-7 flex flex-col items-center">
                        <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-2 px-2">
                            <span className="flex items-center gap-1.5 font-semibold text-white">
                                <Eye className="w-3.5 h-3.5 text-amber-400" /> Rendu Réel en Direct ({org.landing_layout || 'Hub Segmenté'})
                            </span>
                            <button
                                onClick={() => setIsStudioOpen(true)}
                                className="text-[11px] font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1 cursor-pointer transition"
                            >
                                <Sparkles className="w-3 h-3" /> Personnaliser en direct →
                            </button>
                        </div>

                        {/* Device Frame avec vrai Template */}
                        <div className={cn(
                            'transition-all duration-300 rounded-[2.5rem] p-3 border-4 border-slate-800 bg-[#08090E] shadow-2xl overflow-hidden w-full max-h-[800px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 relative',
                            previewDevice === 'mobile' ? 'max-w-[340px]' : previewDevice === 'tablet' ? 'max-w-[560px]' : 'max-w-full'
                        )}>
                            <div className="relative group/frame cursor-pointer" onClick={() => setIsStudioOpen(true)}>
                                {/* Bouton flottant pour ouvrir le studio en plein écran */}
                                <div className="absolute top-4 right-4 z-40 bg-black/80 hover:bg-amber-500 hover:text-slate-950 text-white text-[11px] font-bold px-3 py-1.5 rounded-full border border-amber-500/40 backdrop-blur-md shadow-2xl transition flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Éditer chaque section au clic</span>
                                </div>

                                <div className="pointer-events-none select-none">
                                    {renderActiveTemplate()}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── MODALE DU STUDIO DE PERSONNALISATION PLEIN ÉCRAN ── */}
            {isStudioOpen && (
                <TemplateCustomizerStudio
                    org={liveOrg}
                    orgSlug={orgSlug}
                    currentTemplateId={org.landing_layout || 'segmented_hub'}
                    classrooms={localClassrooms}
                    filieres={localFilieres}
                    onClose={() => setIsStudioOpen(false)}
                    onSaveSuccess={(updatedOrg) => {
                        onUpdateOrg(updatedOrg);
                        setIsStudioOpen(false);
                    }}
                />
            )}
        </div>
    );
}
