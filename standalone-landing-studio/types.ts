export interface TemplateCustomConfig {
    // 👤 Profil & Hero Formateur / Établissement
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

    // 📅 Sessions d'Admission & Inscriptions
    session_title?: string;
    session_subtitle?: string;

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
    book_title?: string;
    book_desc?: string;
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
    podcast_desc?: string;
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
    review1_text?: string;
    review1_author?: string;
    review2_text?: string;
    review2_author?: string;

    // 🎨 Textes décoratifs & Navigation
    available_text?: string;
    availability_badge?: string;
    turning_ideas_text?: string;
    nav_links_text?: string;
    contact_email?: string;
    website_text?: string;
    about_title?: string;
    about_text?: string;
    about_image_url?: string;
    hero_image_url?: string;

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

export interface LandingLayoutTemplate {
    id: 'classic' | 'hub_onglets' | 'segmented_hub' | 'glass_showcase' | 'bento_grid' | 'bento_box' | 'coach_pastelle' | 'creative_studio' | 'tech_mentor' | 'product_mastery' | 'nexis_studio';
    name: string;
    description: string;
    category?: 'general' | 'formateur' | 'prestige' | 'entreprise';
    defaultPrice: number;
    icon: string;
    badgeText?: string;
    highlights: string[];
    isDefault?: boolean;
    previewImage: string;
}

export interface HeroBannerStyle {
    id: 'minimal' | 'full' | 'split';
    name: string;
    description: string;
    defaultPrice: number;
    icon: string;
    badgeText?: string;
    isDefault?: boolean;
    features: string[];
    previewImage: string;
}

export interface ProgramInstallment {
    number: number;
    label: string;
    amount: number;
    formatted_amount: string;
    due_date_label?: string;
}

export interface ProgramSession {
    id: string;
    label: string;
    duration_months: number;
    duration_label: string;
    price: number;
    formatted_price: string;
    prix_barre?: number | null;
    formatted_prix_barre?: string | null;
    promo_badge?: string | null;
    description?: string;
    payment_mode?: 'single' | 'installments' | 'flexible';
    installments: ProgramInstallment[];
}

export interface NormalizedProgram {
    id: string;
    index: number;
    nom: string;
    code?: string;
    category: string;
    description: string;
    duree_mois: number;
    duree_texte: string;
    frais_scolarite: number;
    formatted_price: string;
    prix_barre: number | null;
    formatted_prix_barre: string | null;
    promo_badge: string | null;
    certification_label: string;
    cta_text: string;
    image?: string | null;
    poster_url?: string | null;
    sessions: ProgramSession[];
    rawItem?: any;
}

export interface NormalizedTestimonial {
    id: number;
    author: string;
    role: string;
    quote: string;
    stars: number;
    avatar?: string;
    authorFieldKey: string;
    roleFieldKey: string;
    quoteFieldKey: string;
}

export interface NormalizedStats {
    stat1: { value: string; label: string; valueKey: string; labelKey: string };
    stat2: { value: string; label: string; valueKey: string; labelKey: string };
    stat3: { value: string; label: string; valueKey: string; labelKey: string };
    stat4: { value: string; label: string; valueKey: string; labelKey: string };
}

export interface BaseEntity {
    id: string;
    name: string;
    slug?: string;
    motto?: string;
    hero_title?: string;
    hero_subtitle?: string;
    about_text?: string;
    about_image_url?: string;
    hero_image_url?: string;
    logo_url?: string;
    brand_color?: string;
    gallery_images?: string[];
    landing_layout?: string;
    template_config?: TemplateCustomConfig;
    [key: string]: any;
}
