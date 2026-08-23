'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, ArrowLeft, Save, Eye, Smartphone, Monitor, Tablet,
    Sliders, User, BookOpen, Headphones, BarChart3, MessageSquare,
    Layers, Palette, UploadCloud, RefreshCw, CheckCircle2, Loader2,
    ExternalLink, ZoomIn, ZoomOut, Maximize2, Wand2, Trash2, X,
    ChevronRight, Globe, Mail, MapPin, Award, Star, ShieldCheck,
    Check, Phone, CheckSquare, MousePointerClick, Image as ImageIcon,
    AlignLeft, AlignCenter, AlignRight, LayoutGrid, Info, Plus, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { uploadToR2 } from '@/lib/r2';
import { orgPath } from '@/lib/custom-domain';
import {
    LANDING_LAYOUT_TEMPLATES,
    type LandingLayoutTemplate
} from '@/lib/premium-styles-config';

// Import all landing templates for instant live canvas rendering
import { TemplateProductMastery } from '@/components/campus/landing-templates/template-product-mastery';
import { TemplateCreativeStudio } from '@/components/campus/landing-templates/template-creative-studio';
import { TemplateCoachPastelle } from '@/components/campus/landing-templates/template-coach-pastelle';
import { TemplateTechMentor } from '@/components/campus/landing-templates/template-tech-mentor';
import { TemplateNexisStudio } from '@/components/campus/landing-templates/template-nexis-studio';
import { TemplateBentoGrid } from '@/components/campus/landing-templates/template-bento-grid';
import { TemplateBentoBox } from '@/components/campus/landing-templates/template-bento-box';
import { TemplateGlassShowcase } from '@/components/campus/landing-templates/template-glass-showcase';
import { TemplateSegmentedHub } from '@/components/campus/landing-templates/template-segmented-hub';
import { TemplateHubOnglets } from '@/components/campus/landing-templates/template-hub-onglets';

export interface TemplateCustomConfig {
    // 👤 Profil & Hero Formateur
    trainer_name?: string;
    trainer_title?: string;
    trainer_subtitle?: string;
    trainer_bio?: string;
    trainer_quote?: string;
    trainer_photo_url?: string;
    trainer_photo_secondary_url?: string;
    hero_banner_url?: string;
    hero_image_layout?: 'right' | 'left' | 'center' | 'split';

    // 🔘 Boutons CTA & Actions
    primary_cta_text?: string;
    primary_cta_url?: string;
    primary_cta_position?: 'left' | 'center' | 'right';
    secondary_cta_text?: string;
    secondary_cta_url?: string;
    cta_style?: 'gradient' | 'pill' | 'solid' | 'glass';
    show_cta_buttons?: boolean;
    show_secondary_cta?: boolean;

    // 🖼️ Galerie & Visuels
    show_gallery_section?: boolean;
    gallery_layout?: 'grid' | 'masonry' | 'carousel';
    gallery_title?: string;
    gallery_subtitle?: string;
    gallery_images?: string[];

    // 🏆 Produit Phare / Livre / Masterclass Signature
    flagship_title?: string;
    flagship_subtitle?: string;
    flagship_description?: string;
    flagship_image_url?: string;
    flagship_cta_text?: string;
    flagship_price?: string;
    book_cta?: string;

    // 🎙️ Podcast, Médias & Presse
    podcast_title?: string;
    podcast_description?: string;
    podcast_desc2?: string;
    podcast_cta_text?: string;
    podcast_episodes_count?: string;
    press_logos_text?: string;

    // 📊 Chiffres Clés & Statistiques
    years_experience_value?: string;
    student_count_override?: string;
    rating_score_value?: string;
    review_count?: string;
    awards_count?: string;
    projects_count?: string;
    clients_count?: string;
    stat1_value?: string;
    stat1_label?: string;
    stat2_value?: string;
    stat2_label?: string;
    stat3_value?: string;
    stat3_label?: string;
    stat4_value?: string;
    stat4_label?: string;

    // 💬 Témoignages & Avis Clients
    testimonial_text?: string;
    testimonial_author?: string;
    testimonial_role?: string;
    testimonial1_text?: string;
    testimonial1_author?: string;
    testimonial1_role?: string;
    testimonial2_text?: string;
    testimonial2_author?: string;
    testimonial2_role?: string;

    // 🎨 Textes décoratifs & Navigation
    available_text?: string;
    availability_badge?: string;
    turning_ideas_text?: string;
    nav_links_text?: string;
    contact_email?: string;
    website_text?: string;
    about_title?: string;

    // 🎛️ Commutateurs d'Affichage & Visibilité (Toggles)
    show_student_count?: boolean;
    show_teacher_count?: boolean;
    show_years_experience?: boolean;
    show_rating_stars?: boolean;
    show_press_logos?: boolean;
    show_flagship_product?: boolean;
    show_podcast_section?: boolean;
    show_services_grid?: boolean;
    show_social_links?: boolean;
    truncate_long_descriptions?: boolean;
}

interface TemplateCustomizerStudioProps {
    org: any;
    orgSlug: string;
    currentTemplateId: string;
    onClose: () => void;
    onSaveSuccess: (updatedOrg: any) => void;
    classrooms?: any[];
    filieres?: any[];
    teacherCount?: number;
    studentCount?: number;
}

export function TemplateCustomizerStudio({
    org,
    orgSlug,
    currentTemplateId,
    onClose,
    onSaveSuccess,
    classrooms = [],
    filieres = [],
    teacherCount = 12,
    studentCount = 280
}: TemplateCustomizerStudioProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const rawConfig = org.template_config || {};

    const [selectedLayoutId, setSelectedLayoutId] = useState<string>(currentTemplateId || org.landing_layout || 'product_mastery');
    const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    const [zoomLevel, setZoomLevel] = useState<number>(100);
    const [activeSidebarTab, setActiveSidebarTab] = useState<
        'profile' | 'buttons' | 'media_gallery' | 'flagship' | 'media' | 'stats' | 'testimonials' | 'toggles' | 'navigation'
    >('profile');

    const [saving, setSaving] = useState(false);
    const [uploadingField, setUploadingField] = useState<string | null>(null);

    // Initialisation du formulaire complet avec nouveaux champs CTA et Médias
    const [form, setForm] = useState<TemplateCustomConfig>({
        // Profil & Hero
        trainer_name: rawConfig.trainer_name || org.name || '',
        trainer_title: rawConfig.trainer_title || org.motto || 'Product Designer & Mentor Senior',
        trainer_subtitle: rawConfig.trainer_subtitle || org.hero_subtitle || 'Des produits numériques remarquables conçus avec intention et précision.',
        trainer_bio: rawConfig.trainer_bio || org.about_text || 'Accompagnement d\'élite pour futurs créateurs et professionnels à fort impact.',
        trainer_quote: rawConfig.trainer_quote || '"Chaque pixel, chaque interaction — tout raconte une histoire."',
        trainer_photo_url: rawConfig.trainer_photo_url || org.hero_image_url || '',
        trainer_photo_secondary_url: rawConfig.trainer_photo_secondary_url || '',
        hero_banner_url: rawConfig.hero_banner_url || org.hero_image_url || '',
        hero_image_layout: rawConfig.hero_image_layout || 'right',

        // 🔘 Boutons CTA & Action
        primary_cta_text: rawConfig.primary_cta_text || 'S\'inscrire / Commencer',
        primary_cta_url: rawConfig.primary_cta_url || '#inscription',
        primary_cta_position: rawConfig.primary_cta_position || 'left',
        secondary_cta_text: rawConfig.secondary_cta_text || 'Découvrir le Programme',
        secondary_cta_url: rawConfig.secondary_cta_url || '#programmes',
        cta_style: rawConfig.cta_style || 'gradient',
        show_cta_buttons: rawConfig.show_cta_buttons !== false,
        show_secondary_cta: rawConfig.show_secondary_cta !== false,

        // 🖼️ Galerie & Visuels
        show_gallery_section: rawConfig.show_gallery_section !== false,
        gallery_layout: rawConfig.gallery_layout || 'grid',
        gallery_title: rawConfig.gallery_title || 'Nos Réalisations & Événements',
        gallery_subtitle: rawConfig.gallery_subtitle || 'Découvrez en images la vie de notre communauté et nos ateliers.',
        gallery_images: Array.isArray(rawConfig.gallery_images) ? rawConfig.gallery_images : (org.gallery_images || []),

        // Flagship / Livre
        flagship_title: rawConfig.flagship_title || 'Et si vous pouviez obtenir exactement ce que vous voulez ?',
        flagship_subtitle: rawConfig.flagship_subtitle || 'Formation & Méthodologie N°1 Recommandée',
        flagship_description: rawConfig.flagship_description || 'Un accompagnement structuré, des ateliers pratiques et un accès direct aux ressources et aux mentors.',
        flagship_image_url: rawConfig.flagship_image_url || '',
        flagship_cta_text: rawConfig.flagship_cta_text || 'Commander / Réserver mon accès',
        flagship_price: rawConfig.flagship_price || '250 000 FCFA',
        book_cta: rawConfig.book_cta || 'Commandez mon bestseller aujourd\'hui !',

        // Podcast & Médias
        podcast_title: rawConfig.podcast_title || 'Le Podcast Influenceur & Masterclass',
        podcast_description: rawConfig.podcast_description || 'Des centaines d\'épisodes et d\'ateliers en direct pour comprendre les rouages du succès et de la transformation.',
        podcast_desc2: rawConfig.podcast_desc2 || 'Découvrez pourquoi des milliers de professionnels appellent ce programme leur ressource incontournable pour propulser leur carrière.',
        podcast_cta_text: rawConfig.podcast_cta_text || 'Écouter le Podcast',
        podcast_episodes_count: rawConfig.podcast_episodes_count || '100+',
        press_logos_text: rawConfig.press_logos_text || 'FORBES, SUCCESS, PEOPLE, HUFFPOST, YAHOO',

        // Stats
        years_experience_value: rawConfig.years_experience_value || '14',
        student_count_override: rawConfig.student_count_override || '500+',
        rating_score_value: rawConfig.rating_score_value || '5.0★ (98% Satisfaction)',
        review_count: rawConfig.review_count || '280+',
        awards_count: rawConfig.awards_count || '49+',
        projects_count: rawConfig.projects_count || '30+',
        clients_count: rawConfig.clients_count || '12+',
        stat1_value: rawConfig.stat1_value || '2000+',
        stat1_label: rawConfig.stat1_label || 'Partenaires & Diplômés',
        stat2_value: rawConfig.stat2_value || '10+',
        stat2_label: rawConfig.stat2_label || 'Ans d\'Expérience',
        stat3_value: rawConfig.stat3_value || '800+',
        stat3_label: rawConfig.stat3_label || 'Heures de Formation',
        stat4_value: rawConfig.stat4_value || '150M+',
        stat4_label: rawConfig.stat4_label || 'En Revenus Générés',

        // Témoignages
        testimonial_text: rawConfig.testimonial_text || '"Une pédagogie exceptionnelle, alliant rigueur technique et créativité. Les résultats sont immédiats et concrets."',
        testimonial_author: rawConfig.testimonial_author || 'Daniel James',
        testimonial_role: rawConfig.testimonial_role || 'Fondateur & Alumni',
        testimonial1_text: rawConfig.testimonial1_text || 'Travailler avec cette équipe a été une expérience transformative. Ils comprennent nos besoins réels.',
        testimonial1_author: rawConfig.testimonial1_author || 'Alan Solar',
        testimonial1_role: rawConfig.testimonial1_role || 'PDG, SolarTech',
        testimonial2_text: rawConfig.testimonial2_text || 'La qualité des enseignements et le suivi personnalisé sont tout simplement hors du commun.',
        testimonial2_author: rawConfig.testimonial2_author || 'Emma Laurent',
        testimonial2_role: rawConfig.testimonial2_role || 'Directrice de Création',

        // Déco & Nav
        available_text: rawConfig.available_text || 'DISPONIBLE POUR DES PROJETS & FORMATIONS',
        turning_ideas_text: rawConfig.turning_ideas_text || 'Transformer les idées en expériences mémorables et utiles ♡',
        nav_links_text: rawConfig.nav_links_text || 'Accueil, À Propos, Services, Portfolio, Contact',
        contact_email: rawConfig.contact_email || org.email || '',
        website_text: rawConfig.website_text || `${orgSlug}.iziteach.com`,
        about_title: rawConfig.about_title || 'JE SUIS DISPONIBLE POUR VOTRE FORMATION ET PROJET',

        // Toggles
        show_student_count: rawConfig.show_student_count !== false,
        show_teacher_count: rawConfig.show_teacher_count !== false,
        show_years_experience: rawConfig.show_years_experience !== false,
        show_rating_stars: rawConfig.show_rating_stars !== false,
        show_press_logos: rawConfig.show_press_logos !== false,
        show_flagship_product: rawConfig.show_flagship_product !== false,
        show_podcast_section: rawConfig.show_podcast_section !== false,
        show_services_grid: rawConfig.show_services_grid !== false,
        show_social_links: rawConfig.show_social_links !== false,
        truncate_long_descriptions: rawConfig.truncate_long_descriptions !== false,
    });

    // Live Org synthétique pour réactivité instantanée dans le Canvas
    const liveOrg = {
        ...org,
        name: form.trainer_name || org.name,
        motto: form.trainer_title || org.motto,
        hero_subtitle: form.trainer_subtitle || org.hero_subtitle,
        about_text: form.trainer_bio || org.about_text,
        hero_image_url: form.trainer_photo_url || org.hero_image_url,
        template_config: form,
        landing_layout: selectedLayoutId,
    };

    const handleFileUpload = async (
        e: React.ChangeEvent<HTMLInputElement>,
        fieldName: 'trainer_photo_url' | 'trainer_photo_secondary_url' | 'flagship_image_url' | 'hero_banner_url'
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingField(fieldName);
        try {
            const res = await uploadToR2(file, `templates/${org.id}/${fieldName}`, file.name);
            setForm(prev => ({ ...prev, [fieldName]: res.url }));
            toast.success('✨ Image téléversée et appliquée en direct !');
        } catch (err: any) {
            toast.error('Erreur téléversement : ' + err.message);
        } finally {
            setUploadingField(null);
        }
    };

    // Gestion de la galerie multiple
    const handleGalleryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setUploadingField('gallery_images');
        try {
            const newUrls: string[] = [];
            for (const file of files) {
                const res = await uploadToR2(file, `templates/${org.id}/gallery`, file.name);
                newUrls.push(res.url);
            }
            setForm(prev => ({
                ...prev,
                gallery_images: [...(prev.gallery_images || []), ...newUrls]
            }));
            toast.success(`✨ ${newUrls.length} image(s) ajoutée(s) à la galerie !`);
        } catch (err: any) {
            toast.error('Erreur upload galerie : ' + err.message);
        } finally {
            setUploadingField(null);
        }
    };

    const handleRemoveGalleryImage = (idxToRemove: number) => {
        setForm(prev => ({
            ...prev,
            gallery_images: (prev.gallery_images || []).filter((_, i) => i !== idxToRemove)
        }));
        toast.info('Image retirée de la galerie');
    };

    const handleSaveAndPublish = async () => {
        setSaving(true);
        try {
            // Sauvegarde dans Supabase
            const { error } = await supabase
                .from('organizations')
                .update({
                    template_config: form,
                    landing_layout: selectedLayoutId,
                    gallery_images: form.gallery_images || org.gallery_images,
                    updated_at: new Date().toISOString()
                })
                .eq('id', org.id);

            if (error) {
                console.warn('[Studio] Supabase update warning:', error);
            }

            // Sauvegarde locale instantanée
            if (typeof window !== 'undefined') {
                localStorage.setItem(`campusflow_template_config_${org.id}`, JSON.stringify(form));
                localStorage.setItem(`campusflow_template_config_${org.slug}`, JSON.stringify(form));
                localStorage.setItem(`campusflow_landing_layout_${org.id}`, selectedLayoutId);
                localStorage.setItem(`campusflow_landing_layout_${org.slug}`, selectedLayoutId);
            }

            const updatedOrg = {
                ...org,
                template_config: form,
                landing_layout: selectedLayoutId,
                gallery_images: form.gallery_images || org.gallery_images,
            };

            onSaveSuccess(updatedOrg);
            toast.success('🚀 Page d\'accueil personnalisée et publiée avec succès !');
        } catch (e: any) {
            toast.error(e.message || 'Erreur lors de l\'enregistrement');
        } finally {
            setSaving(false);
        }
    };

    // Remplissage automatique avec des exemples stylés
    const handleApplyPreset = (type: 'design' | 'coach' | 'tech' | 'corporate') => {
        if (type === 'design') {
            setForm(prev => ({
                ...prev,
                trainer_name: 'Vladi Studio',
                trainer_title: 'Lead Product Designer & Mentor',
                trainer_subtitle: 'Des produits numériques remarquables conçus avec intention et précision.',
                trainer_bio: 'Une méthodologie rigoureuse centrée sur l\'impact utilisateur et l\'excellence visuelle.',
                years_experience_value: '14',
                rating_score_value: '5.0★ (98% Satisfaction)',
                available_text: 'DISPONIBLE POUR FORMATIONS & PROJETS',
                turning_ideas_text: 'Transformer chaque concept en produit iconique ♡',
                primary_cta_text: 'Découvrir le Portfolio',
                secondary_cta_text: 'Prendre Rendez-vous',
                hero_image_layout: 'right',
            }));
            setSelectedLayoutId('product_mastery');
        } else if (type === 'coach') {
            setForm(prev => ({
                ...prev,
                trainer_name: 'Julie Solomon',
                trainer_title: 'Auteur, Conférencière, Accélérateur de Marques & Coach',
                trainer_subtitle: 'Et si vous pouviez obtenir exactement ce que vous voulez ?',
                trainer_bio: 'Passez de l\'invisible à l\'irrésistible grâce à une méthode éprouvée et reconnue.',
                flagship_title: 'Get What You Want — Le Bestseller',
                book_cta: 'Commandez le bestseller aujourd\'hui !',
                podcast_title: 'Le Podcast Influenceur & Impact',
                primary_cta_text: 'Travailler Avec Moi',
                secondary_cta_text: 'Écouter le Podcast',
                hero_image_layout: 'left',
            }));
            setSelectedLayoutId('coach_pastelle');
        } else if (type === 'tech') {
            setForm(prev => ({
                ...prev,
                trainer_name: 'Jenna Ortega',
                trainer_title: 'FORMATRICE TECH & LEAD DEV',
                trainer_subtitle: 'Experte en architecture logicielle, UI/UX avancée et systèmes cloud de pointe.',
                about_title: 'DISPONIBLE POUR FORMATION ACCÉLÉRÉE & AUDIT',
                review_count: '280+',
                years_experience_value: '15+',
                awards_count: '49+',
                primary_cta_text: 'Rejoindre le Cursus',
                secondary_cta_text: 'Voir les Projets',
                hero_image_layout: 'right',
            }));
            setSelectedLayoutId('tech_mentor');
        } else if (type === 'corporate') {
            setForm(prev => ({
                ...prev,
                trainer_name: org.name || 'Nexis Solutions',
                trainer_title: 'Construire des Solutions Logicielles de Classe Mondiale.',
                trainer_bio: 'Notre équipe d\'experts combine la technologie de pointe avec des solutions innovantes pour propulser votre entreprise.',
                stat1_value: '2000+',
                stat1_label: 'Partenaires & Diplômés',
                stat2_value: '10+',
                stat2_label: 'Ans d\'Expérience',
                stat3_value: '800+',
                stat3_label: 'Heures de Formation',
                stat4_value: '150M+',
                stat4_label: 'En Revenus Générés',
                primary_cta_text: 'Commencer un Projet',
                secondary_cta_text: 'Nos Études de Cas',
                hero_image_layout: 'center',
            }));
            setSelectedLayoutId('nexis_studio');
        }
        toast.success('✨ Modèle pré-rempli appliqué avec succès !');
    };

    // Rendu du Template Live dans le Canvas
    const renderLiveTemplate = () => {
        const props = {
            org: liveOrg,
            orgSlug,
            classrooms,
            filieres,
            teacherCount,
            studentCount,
            gallery: form.gallery_images || org.gallery_images || [],
            bc: org.brand_color || '#14b8a6',
            onOpenInscription: () => toast.info('Aperçu interactif : ce bouton ouvrira le formulaire d\'inscription sur le site public.'),
        };

        switch (selectedLayoutId) {
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

    const sidebarTabs = [
        { id: 'profile', label: 'Identité & Hero', icon: User },
        { id: 'buttons', label: 'Boutons CTA & Action', icon: MousePointerClick },
        { id: 'media_gallery', label: 'Galerie & Visuels', icon: ImageIcon },
        { id: 'flagship', label: 'Offre Phare / Livre', icon: BookOpen },
        { id: 'media', label: 'Médias & Presse', icon: Headphones },
        { id: 'stats', label: 'Chiffres & Stats', icon: BarChart3 },
        { id: 'testimonials', label: 'Témoignages', icon: MessageSquare },
        { id: 'toggles', label: 'Visibilité Blocs', icon: Layers },
        { id: 'navigation', label: 'Menu & Contact', icon: Globe },
    ];

    const studioContent = (
        <div className="fixed inset-0 z-[99999] bg-[#08090E] text-white flex flex-col font-sans antialiased overflow-hidden select-none">

            {/* ═══════════════════════════════════════════════════════════════
               TOP STUDIO TOOLBAR
            ═══════════════════════════════════════════════════════════════ */}
            <header className="h-16 border-b border-white/10 bg-[#0D111A]/95 backdrop-blur-2xl px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-30">
                {/* Left: Back & Title */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="rounded-xl text-slate-400 hover:text-white hover:bg-white/10 px-2.5 h-9 flex items-center gap-1.5"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden sm:inline text-xs font-bold">Retour</span>
                    </Button>

                    <div className="h-5 w-px bg-white/10 hidden sm:block" />

                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-orange-500/20">
                            <Sliders className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xs sm:text-sm font-black text-white tracking-wide">
                                    Studio de Personnalisation
                                </h1>
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Temps Réel
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 hidden sm:block truncate max-w-xs">
                                Modèle actif : <span className="text-amber-400 font-bold">{LANDING_LAYOUT_TEMPLATES.find(t => t.id === selectedLayoutId)?.name || selectedLayoutId}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Center: Responsive Viewport Switcher */}
                <div className="flex items-center bg-[#07090F] p-1 rounded-xl border border-white/10">
                    <button
                        onClick={() => setViewportMode('desktop')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                            viewportMode === 'desktop'
                                ? 'bg-white/15 text-white shadow-sm font-black'
                                : 'text-slate-400 hover:text-white'
                        }`}
                        title="Vue Ordinateur (Plein Écran)"
                    >
                        <Monitor className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Bureau</span>
                    </button>
                    <button
                        onClick={() => setViewportMode('tablet')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                            viewportMode === 'tablet'
                                ? 'bg-white/15 text-white shadow-sm font-black'
                                : 'text-slate-400 hover:text-white'
                        }`}
                        title="Vue Tablette (1024px)"
                    >
                        <Tablet className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Tablette</span>
                    </button>
                    <button
                        onClick={() => setViewportMode('mobile')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                            viewportMode === 'mobile'
                                ? 'bg-white/15 text-white shadow-sm font-black'
                                : 'text-slate-400 hover:text-white'
                        }`}
                        title="Vue Smartphone (390px)"
                    >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Mobile</span>
                    </button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {/* Sélecteur rapide de modèle */}
                    <div className="hidden lg:block">
                        <select
                            value={selectedLayoutId}
                            onChange={(e) => setSelectedLayoutId(e.target.value)}
                            className="bg-white/5 border border-white/15 text-xs text-slate-200 rounded-xl px-3 h-9 focus:outline-none focus:border-amber-400"
                        >
                            {LANDING_LAYOUT_TEMPLATES.map(t => (
                                <option key={t.id} value={t.id} className="bg-[#0D111A] text-white">
                                    {t.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <a
                        href={orgPath(orgSlug, '')}
                        target="_blank"
                        rel="noreferrer"
                        className="hidden sm:flex"
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-white/15 text-slate-300 hover:text-white hover:bg-white/5 text-xs h-9 px-3 flex items-center gap-1.5"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Voir le site</span>
                        </Button>
                    </a>

                    <Button
                        onClick={handleSaveAndPublish}
                        disabled={saving}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs h-9 px-5 rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Publication...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-3.5 h-3.5" />
                                <span>Enregistrer & Publier</span>
                            </>
                        )}
                    </Button>
                </div>
            </header>

            {/* ═══════════════════════════════════════════════════════════════
               SPLIT WORKSPACE LAYOUT : SIDEBAR + LIVE CANVAS
            ═══════════════════════════════════════════════════════════════ */}
            <div className="flex-1 flex overflow-hidden">

                {/* ─── GAUCHE : PANNEAU DE CONTRÔLE STUDIO (440px) ───────── */}
                <aside className="w-full sm:w-[440px] lg:w-[480px] border-r border-white/10 bg-[#0B0E17] flex flex-col shrink-0 z-20 overflow-hidden">
                    
                    {/* Navigation par Onglets */}
                    <div className="p-2 border-b border-white/10 bg-[#080B12] overflow-x-auto flex items-center gap-1.5 scrollbar-none">
                        {sidebarTabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeSidebarTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveSidebarTab(tab.id as any)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                                        isActive
                                            ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Presets rapides de remplissage */}
                    <div className="px-4 py-2.5 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border-b border-white/5 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                            <Wand2 className="w-3 h-3" />
                            Générer un exemple :
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handleApplyPreset('design')}
                                className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 font-semibold"
                            >
                                Vladi
                            </button>
                            <button
                                onClick={() => handleApplyPreset('coach')}
                                className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 font-semibold"
                            >
                                Julie
                            </button>
                            <button
                                onClick={() => handleApplyPreset('tech')}
                                className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 font-semibold"
                            >
                                Jenna
                            </button>
                            <button
                                onClick={() => handleApplyPreset('corporate')}
                                className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 font-semibold"
                            >
                                Nexis
                            </button>
                        </div>
                    </div>

                    {/* Contenu Défilant des Paramètres */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-slate-300 select-text">

                        {/* ═══ TAB 1 : IDENTITÉ & HERO ═══ */}
                        {activeSidebarTab === 'profile' && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                                        👤 Profil, Titre & Accroche
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Définissez les informations visibles en haut de votre page d'accueil.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">
                                            Nom du Formateur / Nom de l'Établissement
                                        </label>
                                        <Input
                                            value={form.trainer_name || ''}
                                            onChange={e => setForm({ ...form, trainer_name: e.target.value })}
                                            placeholder="Ex: Vladi, Mariana Napolitani, Julie Solomon..."
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">
                                            Titre Professionnel / Rôle
                                        </label>
                                        <Input
                                            value={form.trainer_title || ''}
                                            onChange={e => setForm({ ...form, trainer_title: e.target.value })}
                                            placeholder="Ex: Product Designer & Mentor Senior, Auteur & Coach..."
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">
                                            Sous-titre / Accroche Principale (Hero Headline)
                                        </label>
                                        <Textarea
                                            value={form.trainer_subtitle || ''}
                                            onChange={e => setForm({ ...form, trainer_subtitle: e.target.value })}
                                            placeholder="Ex: Des produits numériques remarquables conçus avec intention et précision."
                                            className="bg-white/5 border-white/10 text-white rounded-xl min-h-[70px]"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">
                                            Biographie / Présentation Pédagogique
                                        </label>
                                        <Textarea
                                            value={form.trainer_bio || ''}
                                            onChange={e => setForm({ ...form, trainer_bio: e.target.value })}
                                            placeholder="Ex: Accompagnement sur-mesure pour futurs créateurs à fort impact..."
                                            className="bg-white/5 border-white/10 text-white rounded-xl min-h-[85px]"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">
                                            Citation Inspirante / Motto
                                        </label>
                                        <Input
                                            value={form.trainer_quote || ''}
                                            onChange={e => setForm({ ...form, trainer_quote: e.target.value })}
                                            placeholder='Ex: "Chaque pixel, chaque interaction — tout raconte une histoire."'
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                        />
                                    </div>
                                </div>

                                {/* Upload Photo Principale */}
                                <div className="pt-3 border-t border-white/10 space-y-3">
                                    <label className="font-bold text-slate-200 block">
                                        Photo Principale Formateur / Emblème HD
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-20 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0 relative flex items-center justify-center">
                                            {form.trainer_photo_url ? (
                                                <img src={form.trainer_photo_url} alt="Photo" className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-6 h-6 text-slate-600" />
                                            )}
                                            {uploadingField === 'trainer_photo_url' && (
                                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            <Input
                                                value={form.trainer_photo_url || ''}
                                                onChange={e => setForm({ ...form, trainer_photo_url: e.target.value })}
                                                placeholder="https://... ou téléverser ci-dessous"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-[11px]"
                                            />
                                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold cursor-pointer transition text-[11px]">
                                                <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
                                                <span>Téléverser une photo</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={e => handleFileUpload(e, 'trainer_photo_url')}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Upload Photo Secondaire */}
                                <div className="pt-3 border-t border-white/10 space-y-3">
                                    <label className="font-bold text-slate-200 block">
                                        Photo Secondaire (Portrait / Podcast / About)
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-20 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0 relative flex items-center justify-center">
                                            {form.trainer_photo_secondary_url ? (
                                                <img src={form.trainer_photo_secondary_url} alt="Photo secondaire" className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-6 h-6 text-slate-600" />
                                            )}
                                            {uploadingField === 'trainer_photo_secondary_url' && (
                                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            <Input
                                                value={form.trainer_photo_secondary_url || ''}
                                                onChange={e => setForm({ ...form, trainer_photo_secondary_url: e.target.value })}
                                                placeholder="URL photo secondaire..."
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-[11px]"
                                            />
                                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold cursor-pointer transition text-[11px]">
                                                <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
                                                <span>Téléverser une photo</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={e => handleFileUpload(e, 'trainer_photo_secondary_url')}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                {/* Disposition de l'Image & Bannière Hero */}
                                <div className="pt-3 border-t border-white/10 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="font-bold text-slate-200 block">
                                            Disposition de l'Image Hero
                                        </label>
                                        <span className="text-[10px] text-amber-400 font-medium">Position visuelle</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
                                        {[
                                            { id: 'right', label: 'Droite', desc: 'Défaut' },
                                            { id: 'left', label: 'Gauche', desc: 'Inversé' },
                                            { id: 'center', label: 'Centré', desc: 'Focus' },
                                            { id: 'split', label: 'Split', desc: '50/50' }
                                        ].map(pos => (
                                            <button
                                                key={pos.id}
                                                type="button"
                                                onClick={() => setForm({ ...form, hero_image_layout: pos.id as any })}
                                                className={`py-2 px-1 rounded-lg text-center transition flex flex-col items-center gap-0.5 ${
                                                    (form.hero_image_layout || 'right') === pos.id
                                                        ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                <span className="text-[11px] font-bold">{pos.label}</span>
                                                <span className="text-[8px] opacity-75">{pos.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 📐 GUIDE OFFICIEL DES DIMENSIONS D'IMAGES & BANNIÈRES */}
                                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/25 space-y-2">
                                    <div className="flex items-center gap-2 text-amber-400 font-bold text-[11px]">
                                        <Info className="w-4 h-4 shrink-0" />
                                        <span>Guide des Dimensions Idéales d'Affichage</span>
                                    </div>
                                    <p className="text-[10px] text-slate-300 leading-relaxed">
                                        Pour un rendu ultra net sans déformation sur tous les écrans (Desktop 4K & Mobile) :
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                                        <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                                            <p className="font-bold text-amber-300">🖼️ Bannière Paysage</p>
                                            <p className="font-mono text-white text-[11px] font-black mt-0.5">1920 × 1080 px</p>
                                            <p className="text-slate-400 text-[9px]">Ratio 16:9 • Hero & Fond</p>
                                        </div>
                                        <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                                            <p className="font-bold text-amber-300">👤 Portrait Formateur</p>
                                            <p className="font-mono text-white text-[11px] font-black mt-0.5">800 × 1000 px</p>
                                            <p className="text-slate-400 text-[9px]">Ratio 4:5 • Vladi / Julie</p>
                                        </div>
                                        <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                                            <p className="font-bold text-amber-300">📦 Produit / Livre</p>
                                            <p className="font-mono text-white text-[11px] font-black mt-0.5">800 × 800 px</p>
                                            <p className="text-slate-400 text-[9px]">Ratio 1:1 • Mockup 3D</p>
                                        </div>
                                        <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                                            <p className="font-bold text-amber-300">🎨 Galerie Ateliers</p>
                                            <p className="font-mono text-white text-[11px] font-black mt-0.5">1200 × 800 px</p>
                                            <p className="text-slate-400 text-[9px]">Ratio 3:2 • HD Clarté</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══ TAB 2 : BOUTONS CTA & ACTIONS ═══ */}
                        {activeSidebarTab === 'buttons' && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                                        <MousePointerClick className="w-4 h-4 text-amber-400" />
                                        Boutons d'Action & Call-to-Action (CTA)
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Positionnez, créez et personnalisez les boutons d'inscription, contact ou portfolio.
                                    </p>
                                </div>

                                {/* Alignement des Boutons */}
                                <div className="space-y-2">
                                    <label className="font-bold text-slate-200 block">
                                        Positionnement des Boutons
                                    </label>
                                    <div className="grid grid-cols-3 gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                                        {[
                                            { id: 'left', label: 'Gauche', icon: AlignLeft },
                                            { id: 'center', label: 'Centré', icon: AlignCenter },
                                            { id: 'right', label: 'Droite', icon: AlignRight },
                                        ].map(align => {
                                            const Icon = align.icon;
                                            const isSelected = (form.primary_cta_position || 'left') === align.id;
                                            return (
                                                <button
                                                    key={align.id}
                                                    type="button"
                                                    onClick={() => setForm({ ...form, primary_cta_position: align.id as any })}
                                                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                                                        isSelected
                                                            ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                    }`}
                                                >
                                                    <Icon className="w-3.5 h-3.5" />
                                                    <span>{align.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Style Visuel des Boutons */}
                                <div className="space-y-2">
                                    <label className="font-bold text-slate-200 block">
                                        Style Graphique des Boutons
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: 'gradient', label: '🔥 Gradient Lumineux', desc: 'Orange & Ambre Vibrant' },
                                            { id: 'pill', label: '💊 Pilule Arrondie', desc: 'Design Moderne Épuré' },
                                            { id: 'solid', label: '⬛ Solide Minimaliste', desc: 'Noir & Blanc Précis' },
                                            { id: 'glass', label: '✨ Glassmorphism', desc: 'Verre Flouté & Reflet' },
                                        ].map(st => (
                                            <button
                                                key={st.id}
                                                type="button"
                                                onClick={() => setForm({ ...form, cta_style: st.id as any })}
                                                className={`p-2.5 rounded-xl border text-left transition ${
                                                    (form.cta_style || 'gradient') === st.id
                                                        ? 'border-amber-400 bg-amber-500/15 text-white'
                                                        : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20'
                                                }`}
                                            >
                                                <p className="font-bold text-xs text-white">{st.label}</p>
                                                <p className="text-[9px] text-slate-400 mt-0.5">{st.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Bouton Principal CTA 1 */}
                                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                                            Bouton Principal (Action Majeure)
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={form.show_cta_buttons !== false}
                                            onChange={e => setForm({ ...form, show_cta_buttons: e.target.checked })}
                                            className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-slate-400 block mb-1">Texte du Bouton Principal</label>
                                        <Input
                                            value={form.primary_cta_text || ''}
                                            onChange={e => setForm({ ...form, primary_cta_text: e.target.value })}
                                            placeholder="Ex: S'inscrire / Commencer la formation, Travailler Avec Moi..."
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-slate-400 block mb-1">Action ou Lien de Destination</label>
                                        <Input
                                            value={form.primary_cta_url || ''}
                                            onChange={e => setForm({ ...form, primary_cta_url: e.target.value })}
                                            placeholder="Ex: #inscription, https://wa.me/237..., /campus/cursus"
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs"
                                        />
                                        <p className="text-[9px] text-slate-500 mt-1">Laissez #inscription pour ouvrir le formulaire officiel d'inscription du campus.</p>
                                    </div>
                                </div>

                                {/* Bouton Secondaire CTA 2 */}
                                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                                            Bouton Secondaire (Découverte / Portfolio)
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={form.show_secondary_cta !== false}
                                            onChange={e => setForm({ ...form, show_secondary_cta: e.target.checked })}
                                            className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-slate-400 block mb-1">Texte du Bouton Secondaire</label>
                                        <Input
                                            value={form.secondary_cta_text || ''}
                                            onChange={e => setForm({ ...form, secondary_cta_text: e.target.value })}
                                            placeholder="Ex: Découvrir le Portfolio, Voir les Formations..."
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-slate-400 block mb-1">Lien de Destination</label>
                                        <Input
                                            value={form.secondary_cta_url || ''}
                                            onChange={e => setForm({ ...form, secondary_cta_url: e.target.value })}
                                            placeholder="Ex: #programmes, /login, #temoignages"
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══ TAB 3 : GALERIE & VISUELS ═══ */}
                        {activeSidebarTab === 'media_gallery' && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4 text-amber-400" />
                                        Galerie d'Images & Ateliers
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Ajoutez, ordonnez ou supprimez les photos affichées sur votre portail public.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer">
                                        <span className="font-bold text-slate-200 text-xs">Afficher la Section Galerie</span>
                                        <input
                                            type="checkbox"
                                            checked={form.show_gallery_section !== false}
                                            onChange={e => setForm({ ...form, show_gallery_section: e.target.checked })}
                                            className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                                        />
                                    </label>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Titre de la Galerie</label>
                                        <Input
                                            value={form.gallery_title || ''}
                                            onChange={e => setForm({ ...form, gallery_title: e.target.value })}
                                            placeholder="Ex: Nos Réalisations, Ateliers & Événements"
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Sous-titre / Description de Galerie</label>
                                        <Input
                                            value={form.gallery_subtitle || ''}
                                            onChange={e => setForm({ ...form, gallery_subtitle: e.target.value })}
                                            placeholder="Ex: Découvrez en images la vie de notre communauté..."
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                        />
                                    </div>

                                    {/* Sélecteur de Layout Galerie */}
                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1.5">Disposition de la Galerie</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'grid', label: 'Grille 3x3' },
                                                { id: 'masonry', label: 'Bento Box' },
                                                { id: 'carousel', label: 'Carrousel' }
                                            ].map(lay => (
                                                <button
                                                    key={lay.id}
                                                    type="button"
                                                    onClick={() => setForm({ ...form, gallery_layout: lay.id as any })}
                                                    className={`py-2 rounded-xl text-xs font-bold transition border ${
                                                        (form.gallery_layout || 'grid') === lay.id
                                                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                                                            : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'
                                                    }`}
                                                >
                                                    {lay.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Upload Multiple d'Images */}
                                    <div className="pt-2">
                                        <label className="flex items-center justify-center gap-2 w-full p-4 rounded-2xl border-2 border-dashed border-white/15 hover:border-amber-500/50 bg-white/[0.02] hover:bg-amber-500/5 text-slate-300 hover:text-white font-bold cursor-pointer transition text-xs">
                                            <UploadCloud className="w-5 h-5 text-amber-400" />
                                            <span>Ajouter des photos à la galerie (Sélection multiple)</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={handleGalleryImageUpload}
                                            />
                                        </label>
                                        {uploadingField === 'gallery_images' && (
                                            <div className="flex items-center justify-center gap-2 p-2 mt-2 rounded-xl bg-amber-500/10 text-amber-300 text-xs font-bold animate-pulse">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Téléversement des photos vers Cloudflare R2...
                                            </div>
                                        )}
                                    </div>

                                    {/* Liste des images de galerie avec suppression */}
                                    <div className="space-y-2 pt-2">
                                        <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                                            <span>Photos dans la galerie ({(form.gallery_images || []).length})</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(form.gallery_images || []).map((imgUrl, i) => (
                                                <div key={i} className="group relative aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10">
                                                    <img src={imgUrl} alt={`Galerie ${i}`} className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveGalleryImage(i)}
                                                        className="absolute top-1 right-1 p-1 rounded-lg bg-red-600 text-white opacity-0 group-hover:opacity-100 transition shadow-lg"
                                                        title="Supprimer cette photo"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            {(form.gallery_images || []).length === 0 && (
                                                <div className="col-span-3 py-6 text-center text-slate-500 text-xs">
                                                    Aucune image dans la galerie. Cliquez ci-dessus pour en ajouter !
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══ TAB 4 : OFFRE PHARE & LIVRE ═══ */}
                        {activeSidebarTab === 'flagship' && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                                        🏆 Offre Signature, Livre ou Masterclass
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Mettez en avant un programme d'élite ou un produit phare avec mockup 3D.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Titre de l'Offre / du Livre</label>
                                        <Input
                                            value={form.flagship_title || ''}
                                            onChange={e => setForm({ ...form, flagship_title: e.target.value })}
                                            placeholder="Ex: Et si vous pouviez obtenir exactement ce que vous voulez ?"
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Sous-titre / Badge d'Excellence</label>
                                        <Input
                                            value={form.flagship_subtitle || ''}
                                            onChange={e => setForm({ ...form, flagship_subtitle: e.target.value })}
                                            placeholder="Ex: Formation & Méthodologie N°1 Recommandée"
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Description Détaillée</label>
                                        <Textarea
                                            value={form.flagship_description || ''}
                                            onChange={e => setForm({ ...form, flagship_description: e.target.value })}
                                            placeholder="Ex: Un accompagnement structuré, des ateliers pratiques et un accès direct..."
                                            className="bg-white/5 border-white/10 text-white rounded-xl min-h-[80px]"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="font-bold text-slate-200 block mb-1">Tarif Affiché</label>
                                            <Input
                                                value={form.flagship_price || ''}
                                                onChange={e => setForm({ ...form, flagship_price: e.target.value })}
                                                placeholder="Ex: 250 000 FCFA"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                            />
                                        </div>
                                        <div>
                                            <label className="font-bold text-slate-200 block mb-1">Texte du Bouton CTA</label>
                                            <Input
                                                value={form.flagship_cta_text || ''}
                                                onChange={e => setForm({ ...form, flagship_cta_text: e.target.value })}
                                                placeholder="Ex: Commander / Réserver"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Accroche Finale du Livre</label>
                                        <Input
                                            value={form.book_cta || ''}
                                            onChange={e => setForm({ ...form, book_cta: e.target.value })}
                                            placeholder="Ex: Commandez mon bestseller aujourd'hui !"
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                        />
                                    </div>
                                </div>

                                {/* Upload Image Livre / Mockup */}
                                <div className="pt-3 border-t border-white/10 space-y-3">
                                    <label className="font-bold text-slate-200 block">
                                        Image du Livre / Mockup 3D du Produit
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-20 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0 relative flex items-center justify-center">
                                            {form.flagship_image_url ? (
                                                <img src={form.flagship_image_url} alt="Livre" className="w-full h-full object-cover" />
                                            ) : (
                                                <BookOpen className="w-6 h-6 text-slate-600" />
                                            )}
                                            {uploadingField === 'flagship_image_url' && (
                                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            <Input
                                                value={form.flagship_image_url || ''}
                                                onChange={e => setForm({ ...form, flagship_image_url: e.target.value })}
                                                placeholder="URL de l'image..."
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-[11px]"
                                            />
                                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold cursor-pointer transition text-[11px]">
                                                <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
                                                <span>Téléverser la couverture</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={e => handleFileUpload(e, 'flagship_image_url')}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══ TAB 3 : MÉDIAS & PRESSE ═══ */}
                        {activeSidebarTab === 'media' && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                                        🎙️ Podcast, Masterclass & Logos Presse
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Configurez la section podcast audio/vidéo et les logos des médias partenaires.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Titre de la Masterclass / du Podcast</label>
                                        <Input
                                            value={form.podcast_title || ''}
                                            onChange={e => setForm({ ...form, podcast_title: e.target.value })}
                                            placeholder="Ex: Le Podcast Influenceur, Masterclass Studio..."
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Description (Paragraphe 1)</label>
                                        <Textarea
                                            value={form.podcast_description || ''}
                                            onChange={e => setForm({ ...form, podcast_description: e.target.value })}
                                            placeholder="Ex: Des centaines d'épisodes et d'ateliers en direct..."
                                            className="bg-white/5 border-white/10 text-white rounded-xl min-h-[70px]"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Description (Paragraphe 2)</label>
                                        <Textarea
                                            value={form.podcast_desc2 || ''}
                                            onChange={e => setForm({ ...form, podcast_desc2: e.target.value })}
                                            placeholder="Ex: Découvrez pourquoi des milliers de personnes..."
                                            className="bg-white/5 border-white/10 text-white rounded-xl min-h-[70px]"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">
                                            Logos Presse & Partenaires (séparés par des virgules)
                                        </label>
                                        <Input
                                            value={form.press_logos_text || ''}
                                            onChange={e => setForm({ ...form, press_logos_text: e.target.value })}
                                            placeholder="FORBES, SUCCESS, PEOPLE, HUFFPOST, YAHOO"
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                        />
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            Astuce : Saisissez les noms en majuscules séparés par des virgules.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══ TAB 4 : STATS & RÉPUTATION ═══ */}
                        {activeSidebarTab === 'stats' && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                                        📊 Chiffres Clés & Badges de Crédibilité
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Ajustez les indicateurs de succès affichés sur votre page d'accueil.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Années d'Expérience</label>
                                        <Input
                                            value={form.years_experience_value || ''}
                                            onChange={e => setForm({ ...form, years_experience_value: e.target.value })}
                                            placeholder="14"
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Élèves / Diplômés</label>
                                        <Input
                                            value={form.student_count_override || ''}
                                            onChange={e => setForm({ ...form, student_count_override: e.target.value })}
                                            placeholder="500+"
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Avis / Note Étoiles</label>
                                        <Input
                                            value={form.rating_score_value || ''}
                                            onChange={e => setForm({ ...form, rating_score_value: e.target.value })}
                                            placeholder="5.0★ (98% Satisfaction)"
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Nombre d'Avis</label>
                                        <Input
                                            value={form.review_count || ''}
                                            onChange={e => setForm({ ...form, review_count: e.target.value })}
                                            placeholder="280+"
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Projets Réalisés</label>
                                        <Input
                                            value={form.projects_count || ''}
                                            onChange={e => setForm({ ...form, projects_count: e.target.value })}
                                            placeholder="30+"
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Prix & Distinctions</label>
                                        <Input
                                            value={form.awards_count || ''}
                                            onChange={e => setForm({ ...form, awards_count: e.target.value })}
                                            placeholder="49+"
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                        />
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-white/10 space-y-3">
                                    <h4 className="font-bold text-slate-200">Stats Modèle Corporate (Nexis)</h4>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div>
                                            <label className="text-[10px] text-slate-400 block mb-1">Stat 1 : Valeur & Label</label>
                                            <Input
                                                value={form.stat1_value || ''}
                                                onChange={e => setForm({ ...form, stat1_value: e.target.value })}
                                                placeholder="2000+"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-8 text-[11px] mb-1"
                                            />
                                            <Input
                                                value={form.stat1_label || ''}
                                                onChange={e => setForm({ ...form, stat1_label: e.target.value })}
                                                placeholder="Partenaires"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-8 text-[11px]"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-400 block mb-1">Stat 2 : Valeur & Label</label>
                                            <Input
                                                value={form.stat2_value || ''}
                                                onChange={e => setForm({ ...form, stat2_value: e.target.value })}
                                                placeholder="10+"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-8 text-[11px] mb-1"
                                            />
                                            <Input
                                                value={form.stat2_label || ''}
                                                onChange={e => setForm({ ...form, stat2_label: e.target.value })}
                                                placeholder="Ans d'Expérience"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-8 text-[11px]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══ TAB 5 : TÉMOIGNAGES ═══ */}
                        {activeSidebarTab === 'testimonials' && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                                        💬 Témoignages & Avis Clients
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Personnalisez les avis authentiques de vos diplômés et clients.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                                        <h4 className="font-bold text-amber-400 text-xs">Témoignage Principal</h4>
                                        <Textarea
                                            value={form.testimonial_text || ''}
                                            onChange={e => setForm({ ...form, testimonial_text: e.target.value })}
                                            placeholder="Texte du témoignage..."
                                            className="bg-white/5 border-white/10 text-white rounded-xl min-h-[70px]"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input
                                                value={form.testimonial_author || ''}
                                                onChange={e => setForm({ ...form, testimonial_author: e.target.value })}
                                                placeholder="Nom de l'auteur"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-9"
                                            />
                                            <Input
                                                value={form.testimonial_role || ''}
                                                onChange={e => setForm({ ...form, testimonial_role: e.target.value })}
                                                placeholder="Rôle / Entreprise"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-9"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                                        <h4 className="font-bold text-cyan-400 text-xs">Témoignage 2 (Corporate)</h4>
                                        <Textarea
                                            value={form.testimonial1_text || ''}
                                            onChange={e => setForm({ ...form, testimonial1_text: e.target.value })}
                                            placeholder="Texte du témoignage..."
                                            className="bg-white/5 border-white/10 text-white rounded-xl min-h-[70px]"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input
                                                value={form.testimonial1_author || ''}
                                                onChange={e => setForm({ ...form, testimonial1_author: e.target.value })}
                                                placeholder="Nom de l'auteur"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-9"
                                            />
                                            <Input
                                                value={form.testimonial1_role || ''}
                                                onChange={e => setForm({ ...form, testimonial1_role: e.target.value })}
                                                placeholder="Rôle / Entreprise"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-9"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══ TAB 6 : COMMUTATEURS DE VISIBILITÉ ═══ */}
                        {activeSidebarTab === 'toggles' && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                                        🎛️ Visibilité & Affichage des Blocs
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Activez ou désactivez les blocs de contenu selon vos besoins.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    {[
                                        { key: 'show_years_experience', label: 'Badge Années d\'Expérience' },
                                        { key: 'show_student_count', label: 'Compteur d\'Élèves / Diplômés' },
                                        { key: 'show_rating_stars', label: 'Badge Avis & Satisfaction 5★' },
                                        { key: 'show_press_logos', label: 'Bandeau Logos Presse & Partenaires' },
                                        { key: 'show_flagship_product', label: 'Section Offre Phare / Livre 3D' },
                                        { key: 'show_podcast_section', label: 'Section Podcast & Masterclass' },
                                        { key: 'show_services_grid', label: 'Grille de Services & Travaux' },
                                        { key: 'show_social_links', label: 'Boutons Réseaux Sociaux' },
                                        { key: 'truncate_long_descriptions', label: 'Réduire les longues descriptions (Bouton "Lire plus / Voir moins")' },
                                    ].map(item => {
                                        const isChecked = (form as any)[item.key] !== false;
                                        return (
                                            <label
                                                key={item.key}
                                                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition cursor-pointer"
                                            >
                                                <span className="font-bold text-slate-200 text-xs">{item.label}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={e => setForm({ ...form, [item.key]: e.target.checked })}
                                                    className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                                                />
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ═══ TAB 7 : MENU & CONTACT ═══ */}
                        {activeSidebarTab === 'navigation' && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                                        🎨 Navigation & Coordonnées Publiques
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Configurez les liens du menu et les coordonnées de contact du portail.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">
                                            Liens du Menu de Navigation (séparés par virgules)
                                        </label>
                                        <Input
                                            value={form.nav_links_text || ''}
                                            onChange={e => setForm({ ...form, nav_links_text: e.target.value })}
                                            placeholder="Accueil, À Propos, Services, Portfolio, Contact"
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">
                                            Badge Disponibilité (Mariana / Vladi)
                                        </label>
                                        <Input
                                            value={form.available_text || ''}
                                            onChange={e => setForm({ ...form, available_text: e.target.value })}
                                            placeholder="DISPONIBLE POUR DES PROJETS & FORMATIONS"
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">
                                            Badge Idées Créatives
                                        </label>
                                        <Input
                                            value={form.turning_ideas_text || ''}
                                            onChange={e => setForm({ ...form, turning_ideas_text: e.target.value })}
                                            placeholder="Transformer les idées en expériences délicieuses ♡"
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Email Public de Contact</label>
                                        <Input
                                            value={form.contact_email || ''}
                                            onChange={e => setForm({ ...form, contact_email: e.target.value })}
                                            placeholder="contact@votre-domaine.com"
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Footer du panneau : Bouton Enregistrer */}
                    <div className="p-4 border-t border-white/10 bg-[#080B12] flex items-center justify-between gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="rounded-xl text-slate-400 hover:text-white"
                        >
                            Fermer
                        </Button>
                        <Button
                            onClick={handleSaveAndPublish}
                            disabled={saving}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs h-10 px-6 rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Enregistrer & Publier
                        </Button>
                    </div>
                </aside>

                {/* ─── DROITE : CANEVAS DE RENDU LIVE (CANVAS INTERACTIF) ─── */}
                <main className="flex-1 bg-[#06080D] flex flex-col items-center justify-start overflow-hidden relative">

                    {/* Canvas Background Grid */}
                    <div className="absolute inset-0 pointer-events-none opacity-20"
                        style={{
                            backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)',
                            backgroundSize: '24px 24px'
                        }}
                    />

                    {/* Viewport Control Bar */}
                    <div className="w-full py-2 px-6 bg-black/40 border-b border-white/5 flex items-center justify-between text-xs text-slate-500 shrink-0 z-10">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="font-bold text-slate-300">Aperçu Réactif en Direct</span>
                            <span className="text-slate-600 hidden sm:inline">
                                ({viewportMode === 'desktop' ? 'Plein Écran' : viewportMode === 'tablet' ? '1024px' : '390px Mobile'})
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setZoomLevel(z => Math.max(z - 10, 50))}
                                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                                title="Zoom arrière"
                            >
                                <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[11px] font-mono text-slate-400">{zoomLevel}%</span>
                            <button
                                onClick={() => setZoomLevel(z => Math.min(z + 10, 120))}
                                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                                title="Zoom avant"
                            >
                                <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setZoomLevel(100)}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-400"
                            >
                                100%
                            </button>
                        </div>
                    </div>

                    {/* Live Preview Container Frame */}
                    <div className="flex-1 w-full overflow-y-auto p-4 sm:p-8 flex items-start justify-center">
                        <div
                            style={{
                                transform: `scale(${zoomLevel / 100})`,
                                transformOrigin: 'top center',
                                transition: 'transform 0.2s ease-out, width 0.3s ease-out'
                            }}
                            className={`transition-all duration-300 ${
                                viewportMode === 'desktop'
                                    ? 'w-full max-w-6xl rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-[#08090E]'
                                    : viewportMode === 'tablet'
                                        ? 'w-[1024px] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-[#08090E]'
                                        : 'w-[390px] min-h-[844px] rounded-[48px] overflow-hidden shadow-2xl border-[10px] border-slate-900 bg-[#08090E] relative'
                            }`}
                        >
                            {/* Smartphone Header / Notch Simulator if Mobile */}
                            {viewportMode === 'mobile' && (
                                <div className="sticky top-0 z-50 bg-black text-white h-7 flex items-center justify-between px-6 select-none shrink-0">
                                    <span className="text-[10px] font-bold">9:41</span>
                                    <div className="w-20 h-4 bg-slate-900 rounded-full" />
                                    <div className="flex items-center gap-1 text-[10px]">
                                        <span>5G</span>
                                        <span>100%</span>
                                    </div>
                                </div>
                            )}

                            {/* Render Template */}
                            <div className="w-full">
                                {renderLiveTemplate()}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );

    if (!mounted) return null;
    return typeof document !== 'undefined' ? createPortal(studioContent, document.body) : studioContent;
}
