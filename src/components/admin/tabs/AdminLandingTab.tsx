'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LayoutDashboard, ExternalLink, Upload, ImagePlus, Loader2, Save, Globe, Edit, X } from 'lucide-react';
import { uploadToR2 } from '@/lib/r2';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AdminLandingTabProps {
    org: any;
    orgSlug: string;
    isCustom: boolean;
    onNavigateTab: (tab: any) => void;
    onUpdateOrg: (org: any) => void;
}

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

    const [lHeroTemplate, setLHeroTemplate] = useState<'full' | 'split' | 'minimal'>(org.hero_template || 'full');
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
    const [uploadingImage, setUploadingImage] = useState(false);
    const [lSaving, setLSaving] = useState(false);

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
                footer_text: lFooterText || null
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
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-teal-500/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">✨</span>
                    <div>
                        <h3 className="font-extrabold text-sm text-white">Envie d&apos;une page d&apos;accueil plus moderne et compacte ?</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Explorez nos 10 modèles de landing page interactifs (Hub Onglets, Bento Grid, Glassmorphism).</p>
                    </div>
                </div>
                <Button onClick={() => onNavigateTab('premium_styles')} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs h-9 px-4 rounded-xl shrink-0 shadow-md">
                    Découvrir les Styles Premium →
                </Button>
            </div>

            <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-white flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-cyan-400" /> Personnaliser votre page d&apos;accueil
                </h2>
                <a
                    href={isCustom ? '/' : `/${orgSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs px-3 py-1.5 rounded-lg bg-teal-600/10 text-teal-300 hover:bg-teal-600/20 flex items-center gap-1 transition"
                >
                    <ExternalLink className="w-3 h-3" /> Voir la page
                </a>
            </div>
            <p className="text-xs text-slate-500 -mt-3">Les coordonnées (téléphone, email, adresse) s&apos;affichent automatiquement depuis vos informations d&apos;inscription.</p>

            {/* Hero */}
            <div className="p-5 rounded-2xl bg-cyan-600/5 border border-cyan-500/20 space-y-4">
                <h3 className="font-bold text-cyan-300 flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Hero / Bannière
                </h3>

                <div>
                    <Label className="text-slate-400 text-xs mb-2 block">Modèle de bannière</Label>
                    <div className="grid grid-cols-3 gap-2">
                        {([
                            { id: 'full', label: 'Plein écran', desc: 'Image en fond, texte centré', icon: '🖼️' },
                            { id: 'split', label: 'Deux colonnes', desc: 'Texte à gauche, image à droite', icon: '⬛' },
                            { id: 'minimal', label: 'Minimaliste', desc: 'Dégradé de couleur, pas d\'image', icon: '✨' },
                        ] as const).map(t => (
                            <button
                                key={t.id}
                                onClick={() => setLHeroTemplate(t.id)}
                                className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                                    lHeroTemplate === t.id
                                        ? 'border-cyan-400 bg-cyan-500/10'
                                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                                }`}
                            >
                                <span className="text-xl block mb-1">{t.icon}</span>
                                <p className="text-xs font-semibold text-white">{t.label}</p>
                                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{t.desc}</p>
                                {lHeroTemplate === t.id && (
                                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center">
                                        <span className="text-black text-[8px] font-black">✓</span>
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-slate-400 text-xs">Image bannière {lHeroTemplate === 'minimal' ? '(non utilisée sur ce modèle)' : ''}</Label>
                        <div
                            onClick={() => heroImgRef.current?.click()}
                            className={`mt-1 w-full p-4 border-2 border-dashed rounded-xl bg-white/[0.02] transition-colors cursor-pointer text-center ${
                                lHeroTemplate === 'minimal' ? 'border-white/5 opacity-40 pointer-events-none' : 'border-white/10 hover:border-cyan-500/30'
                            }`}
                        >
                            {lHeroImage ? (
                                <div className="flex flex-col items-center">
                                    <img src={lHeroImage} alt="" className="w-full h-28 rounded-lg object-cover mb-2 border border-white/10" />
                                    <p className="text-xs text-slate-400">Cliquer pour changer</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-slate-500">
                                    <ImagePlus className="w-8 h-8 mb-2" />
                                    <p className="font-medium text-sm text-white">Cliquer pour uploader</p>
                                    <p className="text-xs mt-1 text-slate-500">PNG, JPG (max 5 Mo)</p>
                                </div>
                            )}
                        </div>
                        <input ref={heroImgRef} type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} />
                        {uploadingImage && (
                            <p className="text-xs text-cyan-400 mt-1 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> Upload en cours...
                            </p>
                        )}
                    </div>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-slate-400 text-xs">Titre hero (défaut: nom de l&apos;école)</Label>
                            <Input
                                value={lHeroTitle}
                                onChange={e => setLHeroTitle(e.target.value)}
                                placeholder={org.name}
                                className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                            />
                        </div>
                        <div>
                            <Label className="text-slate-400 text-xs">Sous-titre / Slogan</Label>
                            <Input
                                value={lHeroSubtitle}
                                onChange={e => setLHeroSubtitle(e.target.value)}
                                placeholder={org.motto || 'Bienvenue sur notre portail'}
                                className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* About */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                <h3 className="font-bold mb-3 flex items-center gap-2 text-white">
                    <Edit className="w-4 h-4 text-indigo-400" /> À propos de l&apos;établissement
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-slate-400 text-xs">Description</Label>
                        <textarea
                            value={lAboutText}
                            onChange={e => setLAboutText(e.target.value)}
                            placeholder="Décrivez votre établissement, son histoire, ses valeurs..."
                            rows={5}
                            className="w-full mt-1 p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm resize-none focus:outline-none focus:border-indigo-500/50 transition"
                        />
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">Image section À propos</Label>
                        <div
                            onClick={() => aboutImgRef.current?.click()}
                            className="mt-1 w-full p-4 border-2 border-dashed border-white/10 rounded-xl bg-white/[0.02] hover:border-indigo-500/30 transition-colors cursor-pointer text-center"
                        >
                            {lAboutImage ? (
                                <div className="flex flex-col items-center">
                                    <img src={lAboutImage} alt="" className="w-full h-36 rounded-lg object-cover mb-2 border border-white/10" />
                                    <p className="text-xs text-slate-400">Cliquer pour changer</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-slate-500">
                                    <ImagePlus className="w-8 h-8 mb-2" />
                                    <p className="font-medium text-sm text-white">Cliquer pour uploader</p>
                                </div>
                            )}
                        </div>
                        <input ref={aboutImgRef} type="file" accept="image/*" className="hidden" onChange={handleAboutUpload} />
                    </div>
                </div>
            </div>

            {/* Gallery */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                <h3 className="font-bold mb-3 flex items-center gap-2 text-white">
                    <Upload className="w-4 h-4 text-amber-400" /> Galerie photos
                </h3>
                <div className="mb-3">
                    <div
                        onClick={() => galleryImgRef.current?.click()}
                        className="w-full p-4 border-2 border-dashed border-white/10 rounded-xl bg-white/[0.02] hover:border-amber-500/30 transition-colors cursor-pointer text-center"
                    >
                        <div className="flex flex-col items-center text-slate-500">
                            <ImagePlus className="w-8 h-8 mb-2" />
                            <p className="font-medium text-sm text-white">Cliquer pour uploader des photos</p>
                            <p className="text-xs mt-1 text-slate-500">PNG, JPG — plusieurs fichiers possibles</p>
                        </div>
                    </div>
                    <input ref={galleryImgRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
                    {uploadingImage && (
                        <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Upload en cours...
                        </p>
                    )}
                </div>
                {lGalleryImages.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {lGalleryImages.map((img, i) => (
                            <div key={i} className="relative group rounded-xl overflow-hidden border border-white/10 aspect-video">
                                <img src={img} alt="" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => setLGalleryImages(p => p.filter((_, j) => j !== i))}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-slate-500 text-center py-4">Ajoutez des photos de votre établissement (bâtiment, salles, événements...)</p>
                )}
            </div>

            {/* Social links */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                <h3 className="font-bold mb-3 flex items-center gap-2 text-white">
                    <Globe className="w-4 h-4 text-pink-400" /> Réseaux sociaux
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                        <Label className="text-slate-400 text-xs">📘 Facebook</Label>
                        <Input
                            value={lSocialFb}
                            onChange={e => setLSocialFb(e.target.value)}
                            placeholder="https://facebook.com/votre-page"
                            className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">📸 Instagram</Label>
                        <Input
                            value={lSocialIg}
                            onChange={e => setLSocialIg(e.target.value)}
                            placeholder="https://instagram.com/votre-compte"
                            className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">🐦 Twitter / X</Label>
                        <Input
                            value={lSocialTw}
                            onChange={e => setLSocialTw(e.target.value)}
                            placeholder="https://x.com/votre-compte"
                            className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">🎵 TikTok</Label>
                        <Input
                            value={lSocialTt}
                            onChange={e => setLSocialTt(e.target.value)}
                            placeholder="https://tiktok.com/@votre-compte"
                            className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">🎬 YouTube</Label>
                        <Input
                            value={lSocialYt}
                            onChange={e => setLSocialYt(e.target.value)}
                            placeholder="https://youtube.com/@votre-chaine"
                            className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">💼 LinkedIn</Label>
                        <Input
                            value={lSocialLi}
                            onChange={e => setLSocialLi(e.target.value)}
                            placeholder="https://linkedin.com/company/..."
                            className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                        />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                <h3 className="font-bold mb-3 flex items-center gap-2 text-white">
                    <Edit className="w-4 h-4 text-slate-400" /> Pied de page
                </h3>
                <Label className="text-slate-400 text-xs">Texte personnalisé (optionnel — par défaut: © année + nom)</Label>
                <Input
                    value={lFooterText}
                    onChange={e => setLFooterText(e.target.value)}
                    placeholder={`© ${new Date().getFullYear()} ${org.name}. Tous droits réservés.`}
                    className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                />
            </div>

            {/* Save */}
            <div className="flex justify-end">
                <Button
                    onClick={saveLanding}
                    disabled={lSaving}
                    className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 px-8 font-bold rounded-xl shadow-lg shadow-cyan-600/25 h-10"
                >
                    {lSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Sauvegarder la page d&apos;accueil
                </Button>
            </div>
        </div>
    );
}
