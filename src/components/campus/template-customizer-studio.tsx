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
    AlignLeft, AlignCenter, AlignRight, LayoutGrid, Info, Plus, ChevronDown, ChevronUp, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { uploadToR2 } from '@/lib/r2';
import { orgPath } from '@/lib/custom-domain';
import { cleanMotto } from '@/lib/clean-motto';
import { saveOrgStyle } from '@/lib/api-org-style';
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

    // 🎓 Offres & Formations Personnalisables section par section
    programs_section_title?: string;
    programs_section_badge?: string;
    custom_programs?: Array<{
        id?: string;
        nom: string;
        duree_mois?: number | string;
        description: string;
        frais_scolarite: number | string;
        prix_barre?: number | string | null;
        promo_badge?: string;
        frais_inscription?: number | string;
        category?: string;
        certification_label?: string;
        cta_text?: string;
    }>;

    // 🏷️ Tarifs, Réductions & Formations Marketing
    filiere_discount_pct?: string;
    filiere_original_price?: string;
    filiere_promo_badge?: string;
    show_filiere_pricing?: boolean;

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

    // 🔗 Propriétés Étendues & Aliases Compatibilité Multi-Templates
    hero_image_url?: string;
    about_text?: string;
    about_image_url?: string;
    book_title?: string;
    book_desc?: string;
    podcast_desc?: string;
    review1_text?: string;
    review1_author?: string;
    review2_text?: string;
    review2_author?: string;
    session_title?: string;
    session_subtitle?: string;
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
        'profile' | 'courses' | 'buttons' | 'media_gallery' | 'flagship' | 'media' | 'stats' | 'testimonials' | 'toggles' | 'navigation'
    >('profile');

    const [saving, setSaving] = useState(false);
    const [uploadingField, setUploadingField] = useState<string | null>(null);

    // ── État des Formations Synchronisées avec la table classrooms ──
    const [liveClassrooms, setLiveClassrooms] = useState<any[]>(classrooms || []);
    const [deletedClassroomIds, setDeletedClassroomIds] = useState<string[]>([]);
    const [loadingClassrooms, setLoadingClassrooms] = useState(false);

    useEffect(() => {
        async function fetchRealClassrooms() {
            if (!org?.id) return;
            setLoadingClassrooms(true);
            try {
                const { data, error } = await supabase
                    .from('classrooms')
                    .select('*')
                    .eq('organization_id', org.id)
                    .order('created_at', { ascending: true });
                if (!error && data) {
                    setLiveClassrooms(data);
                }
            } catch (e) {
                console.error('Erreur chargement classrooms:', e);
            } finally {
                setLoadingClassrooms(false);
            }
        }
        fetchRealClassrooms();
    }, [org?.id]);

    // ── État d'Édition Directe Interactive depuis le Canevas Live ──
    const [directEditField, setDirectEditField] = useState<{
        key: string;
        label: string;
        tab: string;
        isMultiline: boolean;
    } | null>(null);
    const [activeHighlightedField, setActiveHighlightedField] = useState<string | null>(null);

    // Initialisation du formulaire complet avec nouveaux champs CTA et Médias
    const [form, setForm] = useState<TemplateCustomConfig>({
        // Profil & Hero
        trainer_name: rawConfig.trainer_name || org.name || '',
        trainer_title: rawConfig.trainer_title || cleanMotto(org.motto) || 'Product Designer & Mentor Senior',
        trainer_subtitle: rawConfig.trainer_subtitle || cleanMotto(org.hero_subtitle) || 'Des produits numériques remarquables conçus avec intention et précision.',
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

        // 📅 Sessions d'Admission & Inscriptions
        session_title: rawConfig.session_title || "Sessions d'Admissions 2025/2026",
        session_subtitle: rawConfig.session_subtitle || "Inscriptions ouvertes pour la prochaine promotion académique. Places limitées.",

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

        // 🎓 Formations & Cursus section par section
        programs_section_title: rawConfig.programs_section_title || rawConfig.flagship_title || 'GET WHAT YOU WANT — LE BESTSELLER',
        programs_section_badge: rawConfig.programs_section_badge || 'Cursus Actifs',

        // 🏷️ Tarifs & Réductions des Filières
        filiere_discount_pct: rawConfig.filiere_discount_pct || '',
        filiere_original_price: rawConfig.filiere_original_price || '',
        filiere_promo_badge: rawConfig.filiere_promo_badge || 'Offre Rentrée',
        show_filiere_pricing: rawConfig.show_filiere_pricing !== false,

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

    // Helper pour modifier une classe en direct dans le state local
    const updateLiveClassroom = (idx: number, patch: Record<string, any>) => {
        setLiveClassrooms(prev => {
            const next = [...prev];
            const current = next[idx] || {};
            const sched = (current.schedule_config && typeof current.schedule_config === 'object') ? current.schedule_config : {};
            const updatedSched = {
                ...sched,
                ...(patch.promo_badge !== undefined ? { promo_badge: patch.promo_badge } : {}),
                ...(patch.certification_label !== undefined ? { certification_label: patch.certification_label } : {}),
                ...(patch.cta_text !== undefined ? { cta_text: patch.cta_text } : {}),
                ...(patch.description !== undefined ? { description: patch.description } : {}),
                ...(patch.prix_barre !== undefined ? { prix_barre: patch.prix_barre } : {}),
            };
            next[idx] = { ...current, ...patch, schedule_config: updatedSched };
            return next;
        });
    };

    const handleAddClassroom = () => {
        const newIdx = liveClassrooms.length + 1;
        const newCls = {
            id: `temp_${Date.now()}`,
            organization_id: org.id,
            name: `Nouvelle Formation ${newIdx}`,
            training_duration: '6 mois',
            duree_mois: 6,
            frais_scolarite: 90000,
            tuition_fee: 90000,
            prix_barre: 140000,
            description: 'Programme pratique complet avec ateliers et suivi personnalisé.',
            schedule_config: {
                promo_badge: '-35%',
                certification_label: 'Certification PRO',
                cta_text: 'Postuler',
                description: 'Programme pratique complet avec ateliers et suivi personnalisé.',
                prix_barre: 140000
            },
            is_active: true
        };
        setLiveClassrooms(prev => [...prev, newCls]);
        toast.success('✨ Nouvelle formation ajoutée ! Elle sera synchronisée à la publication.');
    };

    const handleDeleteClassroom = (idx: number) => {
        const target = liveClassrooms[idx];
        if (!target) return;
        if (!confirm(`Supprimer la formation "${target.name || 'cette formation'}" ? Elle sera également supprimée de la base de données après enregistrement.`)) return;
        if (target.id && !String(target.id).startsWith('temp_')) {
            setDeletedClassroomIds(prev => [...prev, String(target.id)]);
        }
        setLiveClassrooms(prev => prev.filter((_, i) => i !== idx));
        toast.info('Formation retirée');
    };

    // Accès universel aux champs pour l'édition rapide et les cartes
    const getFieldValue = (key: string): string => {
        if (key.startsWith('program_')) {
            const parts = key.split('_');
            const idx = parseInt(parts[1], 10);
            const prop = parts.slice(2).join('_');
            const cls = liveClassrooms[idx];
            if (!cls) return '';
            const sched = (cls.schedule_config && typeof cls.schedule_config === 'object') ? cls.schedule_config : {};
            if (prop === 'nom') return cls.name || '';
            if (prop === 'duree') return cls.training_duration || (cls.duree_mois ? `${cls.duree_mois} mois` : '');
            if (prop === 'frais_scolarite') return cls.frais_scolarite !== undefined ? String(cls.frais_scolarite) : (cls.tuition_fee !== undefined ? String(cls.tuition_fee) : '');
            if (prop === 'prix_barre') return cls.prix_barre !== undefined ? String(cls.prix_barre) : (sched.prix_barre !== undefined ? String(sched.prix_barre) : '');
            if (prop === 'promo') return sched.promo_badge || '';
            if (prop === 'description') return cls.description || '';
            if (prop === 'certification') return sched.certification_label || 'Certification PRO';
            if (prop === 'cta') return sched.cta_text || 'Postuler';
            return '';
        }
        return (form as any)[key] || '';
    };

    const setFieldValue = (key: string, value: string) => {
        if (key.startsWith('program_')) {
            const parts = key.split('_');
            const idx = parseInt(parts[1], 10);
            const prop = parts.slice(2).join('_');
            if (prop === 'nom') updateLiveClassroom(idx, { name: value });
            else if (prop === 'duree') updateLiveClassroom(idx, { training_duration: value });
            else if (prop === 'frais_scolarite') updateLiveClassroom(idx, { frais_scolarite: value });
            else if (prop === 'prix_barre') updateLiveClassroom(idx, { prix_barre: value });
            else if (prop === 'promo') updateLiveClassroom(idx, { promo_badge: value });
            else if (prop === 'description') updateLiveClassroom(idx, { description: value });
            else if (prop === 'certification') updateLiveClassroom(idx, { certification_label: value });
            else if (prop === 'cta') updateLiveClassroom(idx, { cta_text: value });
            return;
        }
        setForm(prev => ({ ...prev, [key]: value }));
    };

    // Live Org synthétique pour réactivité instantanée dans le Canvas
    const liveOrg = {
        ...org,
        name: form.trainer_name || org.name,
        motto: cleanMotto(form.trainer_title || org.motto),
        hero_subtitle: cleanMotto(form.trainer_subtitle || org.hero_subtitle),
        about_text: form.trainer_bio || org.about_text,
        hero_image_url: form.trainer_photo_url || org.hero_image_url,
        template_config: { ...form, custom_programs: undefined },
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

    // ── Table de Correspondance Complète pour l'Inspection Directe ──
    const FIELD_METADATA: Record<string, { label: string; tab: string; isMultiline?: boolean }> = {
        trainer_name: { label: "Nom de l'Établissement / Formateur", tab: 'profile' },
        trainer_title: { label: "Titre / Titulature Principale", tab: 'profile' },
        trainer_subtitle: { label: "Sous-titre / Slogan Hero", tab: 'profile', isMultiline: true },
        trainer_bio: { label: "Présentation / Histoire", tab: 'profile', isMultiline: true },
        trainer_quote: { label: "Citation Inspirante", tab: 'profile', isMultiline: true },
        trainer_photo_url: { label: "Photo de Profil / Campus HD", tab: 'profile' },
        trainer_photo_secondary_url: { label: "Photo Secondaire HD", tab: 'profile' },
        hero_banner_url: { label: "Bannière d'Arrière-Plan Hero", tab: 'profile' },
        hero_image_url: { label: "Photo Principale Hero HD", tab: 'profile' },
        about_text: { label: "Texte Présentation / Histoire", tab: 'profile', isMultiline: true },
        about_image_url: { label: "Photo Section À Propos", tab: 'profile' },
        years_experience_value: { label: "Années d'Expérience", tab: 'profile' },
        availability_badge: { label: "Badge Disponibilité", tab: 'profile' },

        // Boutons & Sessions
        primary_cta_text: { label: "Bouton d'Action Principal", tab: 'buttons' },
        primary_cta_url: { label: "Lien Bouton Principal", tab: 'buttons' },
        secondary_cta_text: { label: "Bouton d'Action Secondaire", tab: 'buttons' },
        secondary_cta_url: { label: "Lien Bouton Secondaire", tab: 'buttons' },
        session_title: { label: "Titre de la Session / Rentrée", tab: 'buttons' },
        session_subtitle: { label: "Détails / Modalités Session", tab: 'buttons', isMultiline: true },

        // Galerie
        gallery_title: { label: "Titre de la Galerie", tab: 'media_gallery' },
        gallery_subtitle: { label: "Sous-titre de la Galerie", tab: 'media_gallery' },

        // 🎓 Formations & Cursus
        programs_section_title: { label: "Titre de la Section Formations", tab: 'courses' },
        programs_section_badge: { label: "Badge / Sous-titre Section Formations", tab: 'courses' },

        // Offres, Diplômes & Livres
        flagship_title: { label: "Titre Offre Phare / Filière / Manuel", tab: 'flagship' },
        flagship_subtitle: { label: "Sous-titre Offre Phare / Filière", tab: 'flagship' },
        flagship_description: { label: "Description Offre Phare / Filière", tab: 'flagship', isMultiline: true },
        flagship_price: { label: "Tarif Offre Phare / Cursus", tab: 'flagship' },
        flagship_cta_text: { label: "Bouton Candidature / Achat", tab: 'flagship' },
        flagship_image_url: { label: "Image Visuel Offre Phare", tab: 'flagship' },
        book_title: { label: "Titre Livre / Manuel / E-Book", tab: 'flagship' },
        book_desc: { label: "Description Livre / E-Book", tab: 'flagship', isMultiline: true },
        book_cta: { label: "Bouton Commande Livre", tab: 'flagship' },
        filiere_discount_pct: { label: "Taux de Réduction Promotionnelle (ex: -40%)", tab: 'flagship' },
        filiere_original_price: { label: "Prix Initial Barré de Référence", tab: 'flagship' },
        filiere_promo_badge: { label: "Badge Promotionnel (ex: Offre Rentrée)", tab: 'flagship' },

        // Médias
        podcast_title: { label: "Titre Podcast / Médias", tab: 'media' },
        podcast_description: { label: "Description Podcast", tab: 'media', isMultiline: true },
        podcast_desc: { label: "Description Podcast", tab: 'media', isMultiline: true },
        podcast_desc2: { label: "Description Détaillée Podcast", tab: 'media', isMultiline: true },
        podcast_cta_text: { label: "Bouton Écoute Podcast", tab: 'media' },
        podcast_episodes_count: { label: "Nombre d'Épisodes Podcast", tab: 'media' },
        press_logos_text: { label: "Logos Partenaires & Presse", tab: 'media' },

        // Chiffres & Stats
        stat1_value: { label: "Statistique 1 (Chiffre)", tab: 'stats' },
        stat1_label: { label: "Statistique 1 (Libellé)", tab: 'stats' },
        stat2_value: { label: "Statistique 2 (Chiffre)", tab: 'stats' },
        stat2_label: { label: "Statistique 2 (Libellé)", tab: 'stats' },
        stat3_value: { label: "Statistique 3 (Chiffre)", tab: 'stats' },
        stat3_label: { label: "Statistique 3 (Libellé)", tab: 'stats' },
        stat4_value: { label: "Statistique 4 (Chiffre)", tab: 'stats' },
        stat4_label: { label: "Statistique 4 (Libellé)", tab: 'stats' },
        rating_score_value: { label: "Note & Satisfaction", tab: 'stats' },
        review_count: { label: "Nombre d'Avis", tab: 'stats' },

        // Témoignages
        testimonial_text: { label: "Témoignage Étudiant / Alumni", tab: 'testimonials', isMultiline: true },
        testimonial_author: { label: "Auteur Témoignage 1", tab: 'testimonials' },
        testimonial_role: { label: "Rôle Témoignage 1", tab: 'testimonials' },
        review1_text: { label: "Témoignage Étudiant / Alumni", tab: 'testimonials', isMultiline: true },
        review1_author: { label: "Auteur Témoignage 1", tab: 'testimonials' },
        review2_text: { label: "Témoignage Parent / Partenaire", tab: 'testimonials', isMultiline: true },
        review2_author: { label: "Auteur Témoignage 2", tab: 'testimonials' },
        testimonial1_text: { label: "Témoignage Parent / Partenaire", tab: 'testimonials', isMultiline: true },
        testimonial1_author: { label: "Auteur Témoignage 2", tab: 'testimonials' },
        testimonial1_role: { label: "Rôle Témoignage 2", tab: 'testimonials' },
        testimonial2_text: { label: "Témoignage 3", tab: 'testimonials', isMultiline: true },
        testimonial2_author: { label: "Auteur Témoignage 3", tab: 'testimonials' },
        testimonial2_role: { label: "Rôle Témoignage 3", tab: 'testimonials' },

        // Navigation
        available_text: { label: "Badge Disponibilité / Projets", tab: 'navigation' },
        turning_ideas_text: { label: "Accroche Idées Créatives", tab: 'navigation' },
        nav_links_text: { label: "Liens du Menu (séparés par virgules)", tab: 'navigation' },
        contact_email: { label: "Email Public de Contact", tab: 'navigation' },
        website_text: { label: "Site Web Public", tab: 'navigation' },
        about_title: { label: "Titre Section À Propos", tab: 'navigation' },
    };

    // Détection intelligente du champ cliqué sur le Canvas
    const detectFieldFromElement = (target: HTMLElement, text: string): string | null => {
        if (!target) return null;
        const lower = (text || target.innerText || target.textContent || '').toLowerCase().trim();

        // 1. Si clic direct sur une image
        if (target.tagName.toLowerCase() === 'img') {
            const parent = target.closest('[data-editable-field]');
            if (parent) return parent.getAttribute('data-editable-field');
            if (target.closest('#about') || target.closest('.about-section')) return 'about_image_url';
            if (target.closest('#livre') || target.closest('#flagship')) return 'flagship_image_url';
            return 'trainer_photo_url';
        }

        // 2. Détection prioritaire par mots-clés "session / admission / inscription / rentrée"
        if (lower.includes('session') || lower.includes('admission') || lower.includes('rentrée') || lower.includes('candidat') || lower.includes('inscri')) {
            const tag = target.tagName.toLowerCase();
            const isHeading = tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'strong' || tag === 'b';
            const isBtn = tag === 'button' || tag === 'a' || !!target.closest('button') || !!target.closest('a');
            if (isBtn) return 'primary_cta_text';
            if (isHeading) return 'session_title';
            return 'session_subtitle';
        }

        // 3. Correspondance avec une valeur courante du formulaire
        for (const [k, v] of Object.entries(form)) {
            if (typeof v === 'string' && v.trim().length > 2) {
                if (lower === v.toLowerCase().trim() || lower.includes(v.toLowerCase().trim()) || v.toLowerCase().trim().includes(lower)) {
                    return k;
                }
            }
        }

        // 4. Nom d'organisation
        if (org.name && (lower.includes(org.name.toLowerCase()) || org.name.toLowerCase().includes(lower))) {
            return 'trainer_name';
        }

        // 5. Détection par type de balise HTML et contexte
        const tag = target.tagName.toLowerCase();
        const isBtn = tag === 'button' || tag === 'a' || !!target.closest('button') || !!target.closest('a');

        if (isBtn) {
            if (lower.includes('inscri') || lower.includes('commen') || lower.includes('contact') || lower.includes('projet') || lower.includes('admission')) {
                return 'primary_cta_text';
            }
            return 'secondary_cta_text';
        }

        if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
            if (target.closest('header') || target.closest('nav')) return 'trainer_name';
            if (lower.includes('propos') || lower.includes('présentation') || lower.includes('histoire') || lower.includes('vision')) return 'about_title';
            if (lower.includes('podcast') || lower.includes('média') || lower.includes('interview')) return 'podcast_title';
            if (lower.includes('livre') || lower.includes('manuel') || lower.includes('bibliothèque') || lower.includes('ressource') || lower.includes('bestseller')) return 'book_title';
            if (lower.includes('filière') || lower.includes('formation') || lower.includes('programme') || lower.includes('cursus') || lower.includes('offre') || lower.includes('diplôme')) return 'flagship_title';
            if (lower.includes('avis') || lower.includes('témoignage') || lower.includes('alumni') || lower.includes('étudiant')) return 'testimonial_author';
            return 'trainer_title';
        }

        if (tag === 'p' || tag === 'span' || tag === 'div') {
            if (lower.includes('livre') || lower.includes('manuel') || lower.includes('ouvrage') || lower.includes('bibliothèque')) return 'book_desc';
            if (lower.includes('podcast') || lower.includes('épisode')) return 'podcast_description';
            if (lower.includes('avis') || lower.includes('témoignage') || lower.includes('"') || lower.includes('«') || lower.includes('élève') || lower.includes('recommande')) return 'testimonial_text';
            if (target.closest('#about') || lower.includes('méthodologie') || lower.includes('fondé') || lower.includes('excellence')) return 'trainer_bio';
            if (lower.match(/^\+?\d+[%★kkm+]?$/)) return 'stat1_value';
            return 'trainer_subtitle';
        }

        return 'trainer_subtitle';
    };

    // Gestion du clic direct sur n'importe quel élément du Canvas
    const handleCanvasClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.studio-quick-edit-popover')) return;

        // Empêcher la navigation de liens réels dans l'aperçu du studio
        e.preventDefault();
        e.stopPropagation();

        // 1. Détection via data-editable-field (sur l'élément ou un enfant/parent direct)
        const explicitEl = target.closest('[data-editable-field]') || target.querySelector('[data-editable-field]');
        let fieldKey = explicitEl?.getAttribute('data-editable-field');

        // 2. Détection intelligente automatique
        if (!fieldKey) {
            const text = (target.innerText || target.textContent || '').trim();
            fieldKey = detectFieldFromElement(target, text);
        }

        if (fieldKey) {
            const meta = FIELD_METADATA[fieldKey] || {
                label: fieldKey.startsWith('program_')
                    ? (fieldKey.includes('nom') ? "Intitulé de la formation" :
                       fieldKey.includes('duree') ? "Durée de la formation" :
                       fieldKey.includes('prix_barre') ? "Prix initial barré" :
                       fieldKey.includes('frais_scolarite') ? "Tarif officiel" :
                       fieldKey.includes('description') ? "Résumé de la formation" :
                       fieldKey.includes('certification') ? "Label de certification" :
                       fieldKey.includes('promo') ? "Badge réduction" : "Bouton d'action")
                    : fieldKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                tab: fieldKey.includes('program') ? 'courses' :
                     fieldKey.includes('session') || fieldKey.includes('cta') ? 'buttons' :
                     fieldKey.includes('stat') || fieldKey.includes('score') ? 'stats' :
                     fieldKey.includes('testim') || fieldKey.includes('review') ? 'testimonials' :
                     fieldKey.includes('book') || fieldKey.includes('flagship') ? 'flagship' :
                     fieldKey.includes('podcast') ? 'media' :
                     fieldKey.includes('gallery') ? 'media_gallery' :
                     fieldKey.includes('nav') || fieldKey.includes('contact') ? 'navigation' : 'profile',
                isMultiline: fieldKey.includes('text') || fieldKey.includes('bio') || fieldKey.includes('desc') || fieldKey.includes('subtitle')
            };

            setDirectEditField({
                key: fieldKey,
                label: meta.label,
                tab: meta.tab,
                isMultiline: meta.isMultiline || false,
            });

            // Basculer l'onglet latéral et cibler le champ
            setActiveSidebarTab(meta.tab as any);
            setActiveHighlightedField(fieldKey);
            setTimeout(() => {
                const el = document.getElementById(`studio_field_${fieldKey}`);
                if (el) {
                    el.focus();
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 120);

            toast.info(`✏️ "${meta.label}" sélectionné. Modifiez directement ci-dessous ou sur le côté.`, { duration: 2500 });
        }
    };

    const handleSaveAndPublish = async () => {
        setSaving(true);
        try {
            // 1. Sauvegarde et synchronisation réelle de chaque classe dans public.classrooms
            for (const cls of liveClassrooms) {
                const priceNum = typeof cls.frais_scolarite === 'number'
                    ? cls.frais_scolarite
                    : (parseInt(String(cls.frais_scolarite || cls.tuition_fee || '').replace(/[^0-9]/g, ''), 10) || 0);

                const origPriceNum = cls.prix_barre
                    ? (typeof cls.prix_barre === 'number' ? cls.prix_barre : (parseInt(String(cls.prix_barre).replace(/[^0-9]/g, ''), 10) || null))
                    : null;

                const durNum = typeof cls.duree_mois === 'number'
                    ? cls.duree_mois
                    : (parseInt(String(cls.duree_mois || cls.training_duration || '').replace(/[^0-9]/g, ''), 10) || 6);

                const durText = cls.training_duration || `${durNum} mois`;
                const cycleText = `${durText} • ${priceNum ? `${new Intl.NumberFormat('fr-FR').format(priceNum)} FCFA` : 'Tarif sur demande'}`;

                const sched = (cls.schedule_config && typeof cls.schedule_config === 'object') ? cls.schedule_config : {};
                const finalSched = {
                    ...sched,
                    description: cls.description || '',
                    prix_barre: origPriceNum,
                    original_price: origPriceNum ? `${origPriceNum} FCFA` : null,
                    duration_text: durText,
                    promo_badge: sched.promo_badge || null,
                    certification_label: sched.certification_label || 'Certification PRO',
                    cta_text: sched.cta_text || 'Postuler'
                };

                const classNameStr = (cls.name || 'Nouvelle Formation').trim();
                const levelMatch = classNameStr.match(/(?:niveau|level|nv)\s*(\d+)/i);
                const detectedLevel = cls.level ? Number(cls.level) : (levelMatch ? parseInt(levelMatch[1], 10) : 1);

                // Si c'est une nouvelle classe créée dans le Studio
                if (String(cls.id).startsWith('temp_')) {
                    const { data: insData, error: insErr } = await supabase.from('classrooms').insert({
                        organization_id: org.id,
                        name: classNameStr,
                        cycle: cycleText,
                        level: detectedLevel,
                        capacity: 100,
                        tuition_fee: priceNum,
                        frais_scolarite: priceNum,
                        training_duration: durText,
                        duree_mois: durNum,
                        description: cls.description || null,
                        prix_barre: origPriceNum,
                        schedule_config: finalSched,
                        competencies_list: cls.description ? cls.description.split(/\r?\n/).filter(Boolean) : []
                    }).select().single();

                    if (insErr) {
                        console.warn('Tentative RPC create_classroom_secure pour:', cls.name);
                        await (supabase.rpc as any)('create_classroom_secure', {
                            p_org_id: org.id,
                            p_name: (cls.name || 'Nouvelle Formation').trim(),
                            p_cycle: cycleText,
                            p_level: detectedLevel,
                            p_capacity: 100,
                            p_tuition_fee: priceNum,
                            p_training_duration: durText,
                            p_description: cls.description || null,
                            p_prix_barre: origPriceNum,
                            p_schedule_config: finalSched,
                            p_competencies_list: cls.description ? cls.description.split(/\r?\n/).filter(Boolean) : []
                        });
                    }
                } else {
                    // C'est une classe existante dans classrooms -> UPDATE
                    await supabase.from('classrooms').update({
                        name: (cls.name || 'Formation').trim(),
                        cycle: cycleText,
                        level: detectedLevel,
                        tuition_fee: priceNum,
                        frais_scolarite: priceNum,
                        training_duration: durText,
                        duree_mois: durNum,
                        description: cls.description || null,
                        prix_barre: origPriceNum,
                        schedule_config: finalSched,
                        competencies_list: cls.description ? cls.description.split(/\r?\n/).filter(Boolean) : []
                    }).eq('id', cls.id);
                }
            }

            // Supprimer les classes supprimées dans le Studio
            if (deletedClassroomIds.length > 0) {
                await supabase.from('classrooms').delete().in('id', deletedClassroomIds);
            }

            // 2. Nettoyer template_config : supprimer custom_programs déconnecté
            const cleanConfig = { ...form };
            delete (cleanConfig as any).custom_programs;

            // 3. Sauvegarde infaillible (Supabase direct + fallback Cloudflare Worker Service Role)
            const res = await saveOrgStyle(org.id, org.slug || orgSlug, {
                template_config: cleanConfig,
                landing_layout: selectedLayoutId,
                gallery_images: form.gallery_images || org.gallery_images,
                motto: form.trainer_title || org.motto,
                hero_subtitle: form.trainer_subtitle || org.hero_subtitle,
                hero_title: form.trainer_name || org.hero_title,
                about_text: form.trainer_bio || org.about_text,
            });

            const updatedOrg = res.org || {
                ...org,
                template_config: cleanConfig,
                landing_layout: selectedLayoutId,
                gallery_images: form.gallery_images || org.gallery_images,
                motto: cleanMotto(form.trainer_title || org.motto),
                hero_subtitle: cleanMotto(form.trainer_subtitle || org.hero_subtitle),
                hero_title: form.trainer_name || org.hero_title,
                about_text: form.trainer_bio || org.about_text,
            };

            onSaveSuccess(updatedOrg);
            toast.success('🚀 Page d\'accueil et Formations synchronisées et enregistrées avec succès !');
        } catch (e: any) {
            toast.error(e.message || 'Erreur lors de l\'enregistrement');
        } finally {
            setSaving(false);
        }
    };

    // Remplissage automatique avec des exemples stylés et réalistes selon le profil d'établissement
    const handleApplyPreset = (type: 'training_center' | 'university' | 'tech' | 'coach' | 'corporate' | 'design') => {
        if (type === 'training_center') {
            setForm(prev => ({
                ...prev,
                trainer_name: org.name || 'Centre de Formation Professionnelle & Métiers',
                trainer_title: 'Former aux Compétences d\'Avenir & Métiers Certifiants',
                trainer_subtitle: 'Inscriptions ouvertes • Diplômes d\'État, certificats professionnels et suivi personnalisé.',
                trainer_bio: 'Notre mission : accompagner chaque apprenant vers l\'excellence opérationnelle et l\'insertion rapide sur le marché de l\'emploi grâce à des équipements modernes et des ateliers pratiques.',
                trainer_quote: '"La pratique et la rigueur sont les piliers de la réussite professionnelle."',
                flagship_title: 'Programme Signature : Ingénierie & Métiers Pratiques',
                flagship_subtitle: 'Cursus Certifié & Reconnu par les Entreprises',
                flagship_description: 'Une formation complète combinant cours magistraux, projets en atelier et stages garantis en entreprise avec délivrance de diplôme officiel.',
                flagship_price: 'Frais subventionnés',
                flagship_cta_text: 'Déposer ma Candidature',
                book_title: 'Bibliothèque des Manuels & Polycopiés',
                book_desc: 'Accédez à toutes les ressources pédagogiques, fiches de révision et exercices pratiques.',
                podcast_title: 'Le Podcast des Métiers & de l\'Insertion',
                podcast_desc: 'Retours d\'expérience d\'anciens diplômés et conseils d\'experts pour réussir sa carrière.',
                stat1_value: String(filieres.length || 8),
                stat1_label: 'Filières Agréées',
                stat2_value: '98%',
                stat2_label: 'Taux de Réussite',
                stat3_value: `${teacherCount || 15}+`,
                stat3_label: 'Formateurs Experts',
                stat4_value: `${studentCount || 450}+`,
                stat4_label: 'Diplômés Actifs',
                primary_cta_text: 'S\'inscrire Maintenant',
                secondary_cta_text: 'Nos Filières',
                available_text: 'INSCRIPTIONS OUVERTES POUR LA NOUVELLE SESSION',
                turning_ideas_text: 'Accompagner chaque projet d\'apprentissage vers la maîtrise complète ♡',
                hero_image_layout: 'right',
            }));
            setSelectedLayoutId('segmented_hub');
        } else if (type === 'university') {
            setForm(prev => ({
                ...prev,
                trainer_name: org.name || 'Institut Universitaire & Pédagogique',
                trainer_title: 'Excellence Académique, Rigueur & Innovation',
                trainer_subtitle: 'Portail officiel d\'admission et de vie académique pour l\'année universitaire.',
                trainer_bio: 'Un campus d\'excellence doté d\'infrastructures connectées, de laboratoires d\'expérimentation et d\'un corps professoral hautement qualifié.',
                trainer_quote: '"La connaissance libère le potentiel et éclaire l\'avenir."',
                flagship_title: 'Licence & Master Professionnels',
                flagship_subtitle: 'Accréditation Officielle & Équivalence Internationale',
                flagship_description: 'Cursus complets d\'enseignement supérieur préparant aux concours et aux carrières internationales à haute responsabilité.',
                flagship_price: 'Admission sur dossier',
                flagship_cta_text: 'Candidater au Cursus',
                book_title: 'Bibliothèque Universitaire Numérique',
                book_desc: 'Consultez des milliers d\'ouvrages, thèses et publications scientifiques en libre accès.',
                podcast_title: 'Conférences Magistrales & Débats',
                podcast_desc: 'Enregistrements exclusifs des colloques et cours donnés par nos professeurs émérites.',
                stat1_value: String(filieres.length || 12),
                stat1_label: 'Facultés & Cursus',
                stat2_value: '100%',
                stat2_label: 'Conformité Nationale',
                stat3_value: `${teacherCount || 25}+`,
                stat3_label: 'Professeurs & Docteurs',
                stat4_value: `${studentCount || 1200}+`,
                stat4_label: 'Étudiants Inscrits',
                primary_cta_text: 'Demande d\'Admission',
                secondary_cta_text: 'Espace Étudiant',
                available_text: 'CAMPUS OUVERT — CONCOURS D\'ENTRÉE EN COURS',
                turning_ideas_text: 'Forger les leaders et scientifiques de demain ♡',
                hero_image_layout: 'center',
            }));
            setSelectedLayoutId('glass_showcase');
        } else if (type === 'design') {
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
            classrooms: liveClassrooms,
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
        { id: 'courses', label: 'Formations & Cursus', icon: BookOpen },
        { id: 'buttons', label: 'Boutons CTA & Action', icon: MousePointerClick },
        { id: 'media_gallery', label: 'Galerie & Visuels', icon: ImageIcon },
        { id: 'flagship', label: 'Offre Signature / Livre', icon: Award },
        { id: 'media', label: 'Podcasts & Médias', icon: Headphones },
        { id: 'stats', label: 'Chiffres & Indicateurs', icon: BarChart3 },
        { id: 'testimonials', label: 'Avis & Témoignages', icon: MessageSquare },
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
            <div className="flex-1 min-h-0 flex overflow-hidden">

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

                    {/* Bannière explicative universelle */}
                    <div className="px-4 py-3 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border-b border-amber-500/20 text-xs">
                        <p className="font-black text-amber-300 text-[11px] flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            Personnalisez le contenu de votre landing page en direct
                        </p>
                        <p className="text-[10px] text-slate-300 mt-0.5 leading-relaxed">
                            Modifiez les textes, photos de profil HD, livres, podcasts, filières, avis clients et indicateurs de statistiques avec un aperçu interactif réactif (Bureau, Tablette, Mobile).
                        </p>
                    </div>

                    {/* Presets rapides de remplissage selon le type d'établissement */}
                    <div className="px-4 py-2 bg-white/[0.02] border-b border-white/5 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
                            <Wand2 className="w-3 h-3 text-amber-400" />
                            Exemples :
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                onClick={() => handleApplyPreset('training_center')}
                                className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold"
                            >
                                Centre Pro
                            </button>
                            <button
                                onClick={() => handleApplyPreset('university')}
                                className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 font-semibold"
                            >
                                Université
                            </button>
                            <button
                                onClick={() => handleApplyPreset('tech')}
                                className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 font-semibold"
                            >
                                Tech
                            </button>
                            <button
                                onClick={() => handleApplyPreset('coach')}
                                className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 font-semibold"
                            >
                                Formateur
                            </button>
                            <button
                                onClick={() => handleApplyPreset('corporate')}
                                className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 font-semibold"
                            >
                                Entreprise
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
                                            id="studio_field_trainer_name"
                                            value={form.trainer_name || ''}
                                            onChange={e => setForm({ ...form, trainer_name: e.target.value })}
                                            placeholder="Ex: Vladi, Mariana Napolitani, Julie Solomon..."
                                            className={`bg-white/5 border-white/10 text-white rounded-xl h-10 transition-all duration-300 ${activeHighlightedField === 'trainer_name' ? 'ring-2 ring-amber-400 bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/20' : ''}`}
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">
                                            Titre Professionnel / Rôle
                                        </label>
                                        <Input
                                            id="studio_field_trainer_title"
                                            value={form.trainer_title || ''}
                                            onChange={e => setForm({ ...form, trainer_title: e.target.value })}
                                            placeholder="Ex: Product Designer & Mentor Senior, Auteur & Coach..."
                                            className={`bg-white/5 border-white/10 text-white rounded-xl h-10 transition-all duration-300 ${activeHighlightedField === 'trainer_title' ? 'ring-2 ring-amber-400 bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/20' : ''}`}
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">
                                            Sous-titre / Accroche Principale (Hero Headline)
                                        </label>
                                        <Textarea
                                            id="studio_field_trainer_subtitle"
                                            value={form.trainer_subtitle || ''}
                                            onChange={e => setForm({ ...form, trainer_subtitle: e.target.value })}
                                            placeholder="Ex: Des produits numériques remarquables conçus avec intention et précision."
                                            className={`bg-white/5 border-white/10 text-white rounded-xl min-h-[70px] transition-all duration-300 ${activeHighlightedField === 'trainer_subtitle' ? 'ring-2 ring-amber-400 bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/20' : ''}`}
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">
                                            Biographie / Présentation Pédagogique
                                        </label>
                                        <Textarea
                                            id="studio_field_trainer_bio"
                                            value={form.trainer_bio || ''}
                                            onChange={e => setForm({ ...form, trainer_bio: e.target.value })}
                                            placeholder="Ex: Accompagnement sur-mesure pour futurs créateurs à fort impact..."
                                            className={`bg-white/5 border-white/10 text-white rounded-xl min-h-[85px] transition-all duration-300 ${activeHighlightedField === 'trainer_bio' ? 'ring-2 ring-amber-400 bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/20' : ''}`}
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">
                                            Citation Inspirante / Motto
                                        </label>
                                        <Input
                                            id="studio_field_trainer_quote"
                                            value={form.trainer_quote || ''}
                                            onChange={e => setForm({ ...form, trainer_quote: e.target.value })}
                                            placeholder='Ex: "Chaque pixel, chaque interaction — tout raconte une histoire."'
                                            className={`bg-white/5 border-white/10 text-white rounded-xl h-10 transition-all duration-300 ${activeHighlightedField === 'trainer_quote' ? 'ring-2 ring-amber-400 bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/20' : ''}`}
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

                        {/* ═══ TAB 2 : FORMATIONS & CURSUS MODIFIABLES SECTION PAR SECTION ═══ */}
                        {activeSidebarTab === 'courses' && (
                            <div className="space-y-5">
                                <div>
                                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-amber-400" />
                                        Formations, Cursus & Tarifs Promotionnels
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Modifiez chaque carte de formation section par section : intitulé, durée, prix officiel, prix barré promotionnel, résumé et badge de certification.
                                    </p>
                                </div>

                                {/* En-tête de la section */}
                                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                                    <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <span>📌</span> En-tête de la section des formations
                                    </h4>
                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Titre de la section</label>
                                        <Input
                                            id="studio_field_programs_section_title"
                                            value={form.programs_section_title || ''}
                                            onChange={e => setForm({ ...form, programs_section_title: e.target.value })}
                                            placeholder="Ex: GET WHAT YOU WANT — LE BESTSELLER ou Nos Formations Certifiantes"
                                            className={`bg-white/5 border-white/10 text-white rounded-xl h-10 ${activeHighlightedField === 'programs_section_title' ? 'ring-2 ring-amber-400 bg-amber-500/15' : ''}`}
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Sous-titre / Badge d'en-tête</label>
                                        <Input
                                            id="studio_field_programs_section_badge"
                                            value={form.programs_section_badge || ''}
                                            onChange={e => setForm({ ...form, programs_section_badge: e.target.value })}
                                            placeholder="Ex: 3 Cursus Actifs ou Promotions en cours"
                                            className={`bg-white/5 border-white/10 text-white rounded-xl h-10 ${activeHighlightedField === 'programs_section_badge' ? 'ring-2 ring-amber-400 bg-amber-500/15' : ''}`}
                                        />
                                    </div>
                                </div>

                                {/* Liste des Cartes de Formation Synchronisées */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                            <span>Cartes de Formations ({liveClassrooms.length})</span>
                                            {loadingClassrooms && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                                        </h4>
                                        <Button
                                            size="sm"
                                            onClick={handleAddClassroom}
                                            className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl h-8 px-3 cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5 mr-1" />
                                            Ajouter une formation
                                        </Button>
                                    </div>

                                    {liveClassrooms.length === 0 ? (
                                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-3">
                                            <BookOpen className="w-8 h-8 text-amber-400/60 mx-auto" />
                                            <p className="text-xs text-slate-300 font-bold">Aucune formation enregistrée pour le moment</p>
                                            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                                                Ajoutez votre première formation ici. Elle sera créée et synchronisée directement dans la base de données à l'enregistrement.
                                            </p>
                                            <Button
                                                size="sm"
                                                onClick={handleAddClassroom}
                                                className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl h-8 px-4 cursor-pointer"
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1" />
                                                Ajouter ma première formation
                                            </Button>
                                        </div>
                                    ) : (
                                        liveClassrooms.map((cls: any, idx: number) => {
                                            const sched = (cls.schedule_config && typeof cls.schedule_config === 'object') ? cls.schedule_config : {};
                                            const promoBadge = sched.promo_badge || '';
                                            const certLabel = sched.certification_label || 'Certification PRO';
                                            const ctaText = sched.cta_text || 'Postuler';
                                            const priceVal = cls.frais_scolarite ?? cls.tuition_fee ?? '';
                                            const origPriceVal = cls.prix_barre ?? sched.prix_barre ?? '';
                                            const durationVal = cls.training_duration || (cls.duree_mois ? `${cls.duree_mois} mois` : '');

                                            return (
                                                <div
                                                    key={cls.id || idx}
                                                    id={`studio_card_program_${idx}`}
                                                    className="p-4 rounded-2xl bg-[#0E131F] border border-white/10 hover:border-amber-500/30 transition space-y-3"
                                                >
                                                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                                        <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                                                            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">
                                                                {idx + 1}
                                                            </span>
                                                            Carte {idx + 1} : {cls.name || 'Formation'}
                                                        </span>
                                                        <button
                                                            onClick={() => handleDeleteClassroom(idx)}
                                                            className="text-red-400 hover:text-red-300 text-xs p-1 cursor-pointer transition-colors"
                                                            title="Supprimer cette formation"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    <div>
                                                        <label className="text-[11px] font-bold text-slate-300 block mb-1">Intitulé / Nom de la formation</label>
                                                        <Input
                                                            id={`studio_field_program_${idx}_nom`}
                                                            value={cls.name || ''}
                                                            onChange={e => updateLiveClassroom(idx, { name: e.target.value })}
                                                            placeholder="Ex: Niveau 1 — Fondamentaux & Pratique"
                                                            className={`bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs ${activeHighlightedField === `program_${idx}_nom` ? 'ring-2 ring-amber-400 bg-amber-500/15' : ''}`}
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-[11px] font-bold text-slate-300 block mb-1">Durée / Format affiché</label>
                                                            <Input
                                                                id={`studio_field_program_${idx}_duree`}
                                                                value={durationVal}
                                                                onChange={e => updateLiveClassroom(idx, { training_duration: e.target.value })}
                                                                placeholder="Ex: 6 mois, 12 semaines"
                                                                className={`bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs ${activeHighlightedField === `program_${idx}_duree` ? 'ring-2 ring-amber-400 bg-amber-500/15' : ''}`}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[11px] font-bold text-slate-300 block mb-1">Badge Réduction (Optionnel)</label>
                                                            <Input
                                                                id={`studio_field_program_${idx}_promo`}
                                                                value={promoBadge}
                                                                onChange={e => updateLiveClassroom(idx, { promo_badge: e.target.value })}
                                                                placeholder="Ex: -40%, Spécial"
                                                                className={`bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs ${activeHighlightedField === `program_${idx}_promo` ? 'ring-2 ring-amber-400 bg-amber-500/15' : ''}`}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-[11px] font-bold text-slate-300 block mb-1">Prix Officiel (Vente)</label>
                                                            <Input
                                                                id={`studio_field_program_${idx}_frais_scolarite`}
                                                                value={priceVal}
                                                                onChange={e => updateLiveClassroom(idx, { frais_scolarite: e.target.value })}
                                                                placeholder="Ex: 90 000 FCFA"
                                                                className={`bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs font-mono ${activeHighlightedField === `program_${idx}_frais_scolarite` ? 'ring-2 ring-amber-400 bg-amber-500/15' : ''}`}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[11px] font-bold text-slate-300 block mb-1">Prix Initial Barré</label>
                                                            <Input
                                                                id={`studio_field_program_${idx}_prix_barre`}
                                                                value={origPriceVal}
                                                                onChange={e => updateLiveClassroom(idx, { prix_barre: e.target.value })}
                                                                placeholder="Ex: 150 000 FCFA"
                                                                className={`bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs font-mono ${activeHighlightedField === `program_${idx}_prix_barre` ? 'ring-2 ring-amber-400 bg-amber-500/15' : ''}`}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-[11px] font-bold text-slate-300 block mb-1">Résumé / Description de la formation</label>
                                                        <Textarea
                                                            id={`studio_field_program_${idx}_description`}
                                                            value={cls.description || ''}
                                                            onChange={e => updateLiveClassroom(idx, { description: e.target.value })}
                                                            rows={3}
                                                            placeholder="Décrivez les objectifs et compétences clés..."
                                                            className={`bg-white/5 border-white/10 text-white rounded-xl text-xs resize-none ${activeHighlightedField === `program_${idx}_description` ? 'ring-2 ring-amber-400 bg-amber-500/15' : ''}`}
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-[11px] font-bold text-slate-300 block mb-1">Mention Bas de Carte</label>
                                                            <Input
                                                                id={`studio_field_program_${idx}_certification`}
                                                                value={certLabel}
                                                                onChange={e => updateLiveClassroom(idx, { certification_label: e.target.value })}
                                                                placeholder="Ex: Certification PRO"
                                                                className={`bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs ${activeHighlightedField === `program_${idx}_certification` ? 'ring-2 ring-amber-400 bg-amber-500/15' : ''}`}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[11px] font-bold text-slate-300 block mb-1">Bouton d'Action</label>
                                                            <Input
                                                                id={`studio_field_program_${idx}_cta`}
                                                                value={ctaText}
                                                                onChange={e => updateLiveClassroom(idx, { cta_text: e.target.value })}
                                                                placeholder="Ex: Postuler"
                                                                className={`bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs ${activeHighlightedField === `program_${idx}_cta` ? 'ring-2 ring-amber-400 bg-amber-500/15' : ''}`}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ═══ TAB 3 : BOUTONS CTA & ACTIONS ═══ */}
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
                                            id="studio_field_primary_cta_text"
                                            value={form.primary_cta_text || ''}
                                            onChange={e => setForm({ ...form, primary_cta_text: e.target.value })}
                                            placeholder="Ex: S'inscrire / Commencer la formation, Travailler Avec Moi..."
                                            className={`bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs transition-all duration-300 ${activeHighlightedField === 'primary_cta_text' ? 'ring-2 ring-amber-400 bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/20' : ''}`}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-slate-400 block mb-1">Action ou Lien de Destination</label>
                                        <Input
                                            id="studio_field_primary_cta_url"
                                            value={form.primary_cta_url || ''}
                                            onChange={e => setForm({ ...form, primary_cta_url: e.target.value })}
                                            placeholder="Ex: #inscription, https://wa.me/237..., /campus/cursus"
                                            className={`bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs transition-all duration-300 ${activeHighlightedField === 'primary_cta_url' ? 'ring-2 ring-amber-400 bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/20' : ''}`}
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
                                            id="studio_field_secondary_cta_text"
                                            value={form.secondary_cta_text || ''}
                                            onChange={e => setForm({ ...form, secondary_cta_text: e.target.value })}
                                            placeholder="Ex: Découvrir le Portfolio, Voir les Formations..."
                                            className={`bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs transition-all duration-300 ${activeHighlightedField === 'secondary_cta_text' ? 'ring-2 ring-amber-400 bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/20' : ''}`}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-slate-400 block mb-1">Lien de Destination</label>
                                        <Input
                                            id="studio_field_secondary_cta_url"
                                            value={form.secondary_cta_url || ''}
                                            onChange={e => setForm({ ...form, secondary_cta_url: e.target.value })}
                                            placeholder="Ex: #programmes, /login, #temoignages"
                                            className={`bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs transition-all duration-300 ${activeHighlightedField === 'secondary_cta_url' ? 'ring-2 ring-amber-400 bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/20' : ''}`}
                                        />
                                    </div>
                                </div>

                                {/* Sessions & Périodes d'Admissions */}
                                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            Sessions d'Admissions & Prochaine Rentrée
                                        </span>
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-slate-400 block mb-1">Titre de la Session</label>
                                        <Input
                                            id="studio_field_session_title"
                                            value={form.session_title || ''}
                                            onChange={e => setForm({ ...form, session_title: e.target.value })}
                                            placeholder="Ex: Sessions d'Admissions 2025/2026, Rejoindre la prochaine session..."
                                            className={`bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs transition-all duration-300 ${activeHighlightedField === 'session_title' ? 'ring-2 ring-amber-400 bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/20' : ''}`}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-slate-400 block mb-1">Détails / Places / Date de rentrée</label>
                                        <Textarea
                                            id="studio_field_session_subtitle"
                                            value={form.session_subtitle || ''}
                                            onChange={e => setForm({ ...form, session_subtitle: e.target.value })}
                                            placeholder="Ex: Inscriptions ouvertes en ligne • Places limitées par promotion afin de garantir un encadrement d'excellence."
                                            className={`bg-white/5 border-white/10 text-white rounded-xl min-h-[60px] text-xs transition-all duration-300 ${activeHighlightedField === 'session_subtitle' ? 'ring-2 ring-amber-400 bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/20' : ''}`}
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

                        {/* ═══ TAB 4 : OFFRE PHARE, FILIÈRE & LIVRE ═══ */}
                        {activeSidebarTab === 'flagship' && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                                        🎓 Offre Signature, Filière Phare ou Livre
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Mettez en avant votre filière d'excellence, formation certifiante, diplôme phare ou publication (livre/manuel) avec son visuel dédié.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Titre de l'Offre / Filière Phare / Livre</label>
                                        <Input
                                            id="studio_field_flagship_title"
                                            value={form.flagship_title || ''}
                                            onChange={e => setForm({ ...form, flagship_title: e.target.value })}
                                            placeholder="Ex: Cursus Ingénierie & Métiers, Licence Pro, ou Livre Bestseller"
                                            className={`bg-white/5 border-white/10 text-white rounded-xl h-10 transition-all duration-300 ${activeHighlightedField === 'flagship_title' ? 'ring-2 ring-amber-400 bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/20' : ''}`}
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Sous-titre / Badge d'Excellence</label>
                                        <Input
                                            id="studio_field_flagship_subtitle"
                                            value={form.flagship_subtitle || ''}
                                            onChange={e => setForm({ ...form, flagship_subtitle: e.target.value })}
                                            placeholder="Ex: Formation Certifiée & Reconnue • Session 2026"
                                            className={`bg-white/5 border-white/10 text-white rounded-xl h-10 transition-all duration-300 ${activeHighlightedField === 'flagship_subtitle' ? 'ring-2 ring-amber-400 bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/20' : ''}`}
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Description Détaillée</label>
                                        <Textarea
                                            id="studio_field_flagship_description"
                                            value={form.flagship_description || ''}
                                            onChange={e => setForm({ ...form, flagship_description: e.target.value })}
                                            placeholder="Ex: Un accompagnement structuré, des ateliers pratiques et un accès direct aux équipements de pointe..."
                                            className={`bg-white/5 border-white/10 text-white rounded-xl min-h-[80px] transition-all duration-300 ${activeHighlightedField === 'flagship_description' ? 'ring-2 ring-amber-400 bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/20' : ''}`}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="font-bold text-slate-200 block mb-1">Tarif / Frais de Scolarité</label>
                                            <Input
                                                id="studio_field_flagship_price"
                                                value={form.flagship_price || ''}
                                                onChange={e => setForm({ ...form, flagship_price: e.target.value })}
                                                placeholder="Ex: 250 000 FCFA / an ou Gratuit"
                                                className={`bg-white/5 border-white/10 text-white rounded-xl h-10 transition-all duration-300 ${activeHighlightedField === 'flagship_price' ? 'ring-2 ring-amber-400 bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/20' : ''}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="font-bold text-slate-200 block mb-1">Texte du Bouton CTA</label>
                                            <Input
                                                id="studio_field_flagship_cta_text"
                                                value={form.flagship_cta_text || ''}
                                                onChange={e => setForm({ ...form, flagship_cta_text: e.target.value })}
                                                placeholder="Ex: S'inscrire / Postuler / Commander"
                                                className={`bg-white/5 border-white/10 text-white rounded-xl h-10 transition-all duration-300 ${activeHighlightedField === 'flagship_cta_text' ? 'ring-2 ring-amber-400 bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/20' : ''}`}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Accroche Secondaire / Mention Spéciale</label>
                                        <Input
                                            id="studio_field_book_cta"
                                            value={form.book_cta || ''}
                                            onChange={e => setForm({ ...form, book_cta: e.target.value })}
                                            placeholder="Ex: Places limitées pour la prochaine promotion !"
                                            className={`bg-white/5 border-white/10 text-white rounded-xl h-10 transition-all duration-300 ${activeHighlightedField === 'book_cta' ? 'ring-2 ring-amber-400 bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/20' : ''}`}
                                        />
                                    </div>

                                    {/* 🏷️ Tarifs, Réductions & Présentation Marketing des Formations */}
                                    <div className="pt-4 border-t border-white/10 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">🏷️ Tarifs & Réductions Marketing</h4>
                                                <p className="text-[10px] text-slate-400">Affichez un prix initial barré et un badge promotionnel sur vos filières.</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={form.show_filiere_pricing !== false}
                                                onChange={e => setForm({ ...form, show_filiere_pricing: e.target.checked })}
                                                className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                                                title="Activer l'affichage des tarifs"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="font-bold text-slate-200 block mb-1 text-xs">Taux de Réduction (ex: -40%)</label>
                                                <Input
                                                    id="studio_field_filiere_discount_pct"
                                                    value={form.filiere_discount_pct || ''}
                                                    onChange={e => setForm({ ...form, filiere_discount_pct: e.target.value })}
                                                    placeholder="Ex: -40% ou 30%"
                                                    className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="font-bold text-slate-200 block mb-1 text-xs">Prix Initial Barré</label>
                                                <Input
                                                    id="studio_field_filiere_original_price"
                                                    value={form.filiere_original_price || ''}
                                                    onChange={e => setForm({ ...form, filiere_original_price: e.target.value })}
                                                    placeholder="Ex: 150 000 FCFA"
                                                    className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="font-bold text-slate-200 block mb-1 text-xs">Badge Promotionnel</label>
                                            <Input
                                                id="studio_field_filiere_promo_badge"
                                                value={form.filiere_promo_badge || ''}
                                                onChange={e => setForm({ ...form, filiere_promo_badge: e.target.value })}
                                                placeholder="Ex: Offre Rentrée • Places Limitées"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Upload Image Livre / Mockup */}
                                <div className="pt-3 border-t border-white/10 space-y-3">
                                    <label className="font-bold text-slate-200 block">
                                        Image de l'Offre / Filière Phare / Couverture
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-20 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0 relative flex items-center justify-center">
                                            {form.flagship_image_url ? (
                                                <img src={form.flagship_image_url} alt="Offre" className="w-full h-full object-cover" />
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
                                                <span>Téléverser une image</span>
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

                        {/* ═══ TAB 3 : MÉDIAS, PODCASTS & RESSOURCES ═══ */}
                        {activeSidebarTab === 'media' && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                                        🎙️ Podcasts, Bibliothèque & Médias
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Présentez vos supports d'apprentissage : podcasts audio, bibliothèque numérique, chaîne vidéo et logos de partenaires.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Titre de la Bibliothèque / Podcast / Médias</label>
                                        <Input
                                            value={form.podcast_title || ''}
                                            onChange={e => setForm({ ...form, podcast_title: e.target.value })}
                                            placeholder="Ex: La Bibliothèque Numérique ou Le Podcast de l'École"
                                            className="bg-white/5 border-white/10 text-white rounded-xl h-10"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Description (Paragraphe 1)</label>
                                        <Textarea
                                            value={form.podcast_description || ''}
                                            onChange={e => setForm({ ...form, podcast_description: e.target.value })}
                                            placeholder="Ex: Des centaines de ressources pédagogiques, annales et documents téléchargeables..."
                                            className="bg-white/5 border-white/10 text-white rounded-xl min-h-[70px]"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">Description (Paragraphe 2)</label>
                                        <Textarea
                                            value={form.podcast_desc2 || ''}
                                            onChange={e => setForm({ ...form, podcast_desc2: e.target.value })}
                                            placeholder="Ex: Découvrez pourquoi nos étudiants plébiscitent nos supports de cours..."
                                            className="bg-white/5 border-white/10 text-white rounded-xl min-h-[70px]"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-200 block mb-1">
                                            Logos Partenaires, Entreprises & Médias (séparés par des virgules)
                                        </label>
                                        <Input
                                            value={form.press_logos_text || ''}
                                            onChange={e => setForm({ ...form, press_logos_text: e.target.value })}
                                            placeholder="MINESEC, CAMTEL, TOTAL, ORANGE, ECOBANK"
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
                                    <div>
                                        <h4 className="font-bold text-slate-200">Indicateurs Principaux (Tous Modèles de Landing Page)</h4>
                                        <p className="text-[10px] text-slate-400">Ces 4 statistiques s'affichent sur les bannières, hubs, glass showcase et bento grids.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
                                            <label className="text-[10px] font-bold text-amber-400 block">Indicateur 1</label>
                                            <Input
                                                id="studio_field_stat1_value"
                                                value={form.stat1_value || ''}
                                                onChange={e => setForm({ ...form, stat1_value: e.target.value })}
                                                placeholder="Ex: 8 ou 98%"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-8 text-[11px]"
                                            />
                                            <Input
                                                id="studio_field_stat1_label"
                                                value={form.stat1_label || ''}
                                                onChange={e => setForm({ ...form, stat1_label: e.target.value })}
                                                placeholder="Ex: Filières Agréées"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-8 text-[11px]"
                                            />
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
                                            <label className="text-[10px] font-bold text-cyan-400 block">Indicateur 2</label>
                                            <Input
                                                id="studio_field_stat2_value"
                                                value={form.stat2_value || ''}
                                                onChange={e => setForm({ ...form, stat2_value: e.target.value })}
                                                placeholder="Ex: 500+ ou 10+"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-8 text-[11px]"
                                            />
                                            <Input
                                                id="studio_field_stat2_label"
                                                value={form.stat2_label || ''}
                                                onChange={e => setForm({ ...form, stat2_label: e.target.value })}
                                                placeholder="Ex: Diplômés / Classes"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-8 text-[11px]"
                                            />
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
                                            <label className="text-[10px] font-bold text-emerald-400 block">Indicateur 3</label>
                                            <Input
                                                id="studio_field_stat3_value"
                                                value={form.stat3_value || ''}
                                                onChange={e => setForm({ ...form, stat3_value: e.target.value })}
                                                placeholder="Ex: 25+ ou 15+"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-8 text-[11px]"
                                            />
                                            <Input
                                                id="studio_field_stat3_label"
                                                value={form.stat3_label || ''}
                                                onChange={e => setForm({ ...form, stat3_label: e.target.value })}
                                                placeholder="Ex: Enseignants / Formateurs"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-8 text-[11px]"
                                            />
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
                                            <label className="text-[10px] font-bold text-teal-400 block">Indicateur 4</label>
                                            <Input
                                                id="studio_field_stat4_value"
                                                value={form.stat4_value || ''}
                                                onChange={e => setForm({ ...form, stat4_value: e.target.value })}
                                                placeholder="Ex: 98% ou 1200+"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-8 text-[11px]"
                                            />
                                            <Input
                                                id="studio_field_stat4_label"
                                                value={form.stat4_label || ''}
                                                onChange={e => setForm({ ...form, stat4_label: e.target.value })}
                                                placeholder="Ex: Taux de Réussite / Étudiants"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-8 text-[11px]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══ TAB 5 : TÉMOIGNAGES & AVIS ═══ */}
                        {activeSidebarTab === 'testimonials' && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                                        💬 Avis Étudiants, Parents & Partenaires
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Personnalisez les avis authentiques de votre communauté d'apprenants et partenaires.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                                        <h4 className="font-bold text-amber-400 text-xs">Témoignage 1 (Étudiant / Alumni)</h4>
                                        <Textarea
                                            id="studio_field_testimonial_text"
                                            value={form.testimonial_text || ''}
                                            onChange={e => setForm({ ...form, testimonial_text: e.target.value, review1_text: e.target.value })}
                                            placeholder="Ex: Une pédagogie exceptionnelle, alliant rigueur et créativité..."
                                            className="bg-white/5 border-white/10 text-white rounded-xl min-h-[70px]"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input
                                                id="studio_field_testimonial_author"
                                                value={form.testimonial_author || ''}
                                                onChange={e => setForm({ ...form, testimonial_author: e.target.value, review1_author: e.target.value })}
                                                placeholder="Nom de l'élève ou diplômé"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-9"
                                            />
                                            <Input
                                                id="studio_field_testimonial_role"
                                                value={form.testimonial_role || ''}
                                                onChange={e => setForm({ ...form, testimonial_role: e.target.value })}
                                                placeholder="Promotion / Rôle"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-9"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                                        <h4 className="font-bold text-cyan-400 text-xs">Témoignage 2 (Parent / Entreprise Partenaire)</h4>
                                        <Textarea
                                            id="studio_field_testimonial1_text"
                                            value={form.testimonial1_text || ''}
                                            onChange={e => setForm({ ...form, testimonial1_text: e.target.value, review2_text: e.target.value })}
                                            placeholder="Ex: Encadrement rigoureux et professeurs très disponibles..."
                                            className="bg-white/5 border-white/10 text-white rounded-xl min-h-[70px]"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input
                                                id="studio_field_testimonial1_author"
                                                value={form.testimonial1_author || ''}
                                                onChange={e => setForm({ ...form, testimonial1_author: e.target.value, review2_author: e.target.value })}
                                                placeholder="Nom du parent / Entreprise"
                                                className="bg-white/5 border-white/10 text-white rounded-xl h-9"
                                            />
                                            <Input
                                                id="studio_field_testimonial1_role"
                                                value={form.testimonial1_role || ''}
                                                onChange={e => setForm({ ...form, testimonial1_role: e.target.value })}
                                                placeholder="Titre / Organisation"
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
                <main className="flex-1 min-h-0 min-w-0 bg-[#06080D] flex flex-col items-center justify-start overflow-hidden relative">

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
                    <div
                        id="studio-live-preview-scroll-container"
                        className="flex-1 min-h-0 w-full h-full overflow-y-auto overflow-x-hidden p-4 sm:p-8 flex items-start justify-center relative overscroll-contain [scrollbar-width:thin] [scrollbar-color:rgba(245,158,11,0.5)_transparent] [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:bg-amber-500/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-white/[0.02]"
                        style={{ scrollBehavior: 'smooth' }}
                    >
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

                            {/* Render Template with Interactive Direct Click-to-Edit */}
                            <div
                                className="w-full relative cursor-pointer group/canvas"
                                onClickCapture={handleCanvasClick}
                            >
                                {renderLiveTemplate()}
                            </div>
                        </div>
                    </div>

                    {/* ─── POP-UP D'ÉDITION DIRECTE FLOTTANTE (DOCKÉE EN BAS DU CANEVAS) ─── */}
                    <AnimatePresence>
                        {directEditField && (
                            <motion.div
                                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="studio-quick-edit-popover absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 bg-[#0D121D]/95 backdrop-blur-2xl border border-amber-500/50 rounded-2xl shadow-2xl shadow-amber-500/20 p-4 text-white"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                                            <Sparkles className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block leading-none">
                                                Édition Directe Rapide
                                            </span>
                                            <span className="text-xs font-black text-white">
                                                {directEditField.label}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveSidebarTab(directEditField.tab as any);
                                                setActiveHighlightedField(directEditField.key);
                                                const el = document.getElementById(`studio_field_${directEditField.key}`);
                                                if (el) {
                                                    el.focus();
                                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }
                                            }}
                                            className="text-[10px] font-bold text-slate-400 hover:text-amber-300 transition flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg"
                                        >
                                            Voir sur le côté →
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDirectEditField(null);
                                                setActiveHighlightedField(null);
                                            }}
                                            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
                                            title="Fermer l'édition rapide"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-1">
                                    {directEditField.key.includes('photo') || directEditField.key.includes('image') || directEditField.key.includes('banner') ? (
                                        <div className="space-y-2">
                                            {(form as any)[directEditField.key] && (
                                                <div className="w-full h-24 rounded-xl overflow-hidden bg-black/50 border border-white/10 relative">
                                                    <img src={(form as any)[directEditField.key]} alt="Preview" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <label className="flex items-center justify-center gap-2 w-full p-2.5 rounded-xl border border-dashed border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold cursor-pointer text-xs transition">
                                                <UploadCloud className="w-4 h-4" />
                                                <span>Choisir une photo HD sur mon appareil</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        try {
                                                            const res = await uploadToR2(file, `templates/${org.id}/${directEditField.key}`, file.name);
                                                            setForm(prev => ({ ...prev, [directEditField.key]: res.url }));
                                                            toast.success('✨ Photo appliquée en direct !');
                                                        } catch (err: any) {
                                                            toast.error(err.message);
                                                        }
                                                    }}
                                                />
                                            </label>
                                            <Input
                                                value={(form as any)[directEditField.key] || ''}
                                                onChange={e => setForm(prev => ({ ...prev, [directEditField.key]: e.target.value }))}
                                                className="bg-black/70 border-amber-500/40 text-white rounded-xl h-9 text-xs"
                                                placeholder="Ou collez l'URL d'une image..."
                                            />
                                        </div>
                                    ) : directEditField.isMultiline ? (
                                        <Textarea
                                            value={getFieldValue(directEditField.key)}
                                            onChange={e => setFieldValue(directEditField.key, e.target.value)}
                                            className="bg-black/70 border-amber-500/40 text-white rounded-xl min-h-[75px] text-xs focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                                            placeholder={`Modifier ${directEditField.label}...`}
                                            autoFocus
                                        />
                                    ) : (
                                        <Input
                                            value={getFieldValue(directEditField.key)}
                                            onChange={e => setFieldValue(directEditField.key, e.target.value)}
                                            className="bg-black/70 border-amber-500/40 text-white rounded-xl h-10 text-xs focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                                            placeholder={`Modifier ${directEditField.label}...`}
                                            autoFocus
                                        />
                                    )}

                                    <div className="flex items-center justify-between pt-1">
                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            Aperçu instantané en direct
                                        </span>
                                        <Button
                                            size="sm"
                                            onClick={handleSaveAndPublish}
                                            disabled={saving}
                                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs h-8 px-4 rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
                                        >
                                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                            <span>Enregistrer</span>
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Styles pour le hover dynamique des zones éditables */}
                    <style jsx global>{`
                        [data-editable-field] {
                            transition: outline 0.15s ease-in-out, background-color 0.15s ease-in-out !important;
                        }
                        [data-editable-field]:hover {
                            outline: 2px dashed #f59e0b !important;
                            outline-offset: 4px !important;
                            cursor: pointer !important;
                        }
                    `}</style>
                </main>
            </div>
        </div>
    );

    if (!mounted) return null;
    return typeof document !== 'undefined' ? createPortal(studioContent, document.body) : studioContent;
}
