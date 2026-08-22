export type LeadStatus = 'new' | 'contacted' | 'opened' | 'clicked' | 'converted' | 'bounced';

export interface MarketingLead {
    id: string;
    organization_name: string;
    contact_name: string;
    role?: string;
    email: string;
    phone?: string;
    website?: string;
    source: 'google' | 'linkedin' | 'facebook' | 'directory' | 'manual' | 'ai_deep_research' | 'yellow_pages';
    country: string;
    city: string;
    score: number; // 1-100 (Qualification Score)
    status: LeadStatus;
    notes?: string;
    campaign_id?: string;
    last_contacted_at?: string;
    opened_at?: string;
    clicked_at?: string;
    created_at: string;
}

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused';

export interface MarketingCampaign {
    id: string;
    title: string;
    subject: string;
    preview_text?: string;
    html_content: string;
    target_segment: string;
    sender_name: string;
    sender_email: string;
    status: CampaignStatus;
    scheduled_at?: string;
    sent_count: number;
    delivered_count: number;
    opened_count: number;
    clicked_count: number;
    converted_count: number;
    follow_up_enabled?: boolean;
    follow_up_days?: number;
    follow_up_subject?: string;
    follow_up_content?: string;
    created_at: string;
    updated_at: string;
}

export interface MarketingCreative {
    id: string;
    title: string;
    format: 'email_banner' | 'social_post' | 'story_ad' | 'pitch_deck';
    headline: string;
    body_copy: string;
    cta_text: string;
    image_url?: string;
    reference_image_url?: string;
    style_theme: string;
    tags: string[];
    created_at: string;
}

export interface DeepResearchQuery {
    target_type: 'ecoles_privees' | 'universites' | 'centres_formation' | 'instituts_langue' | 'lycees_colleges' | 'entreprises_edtech';
    country: string;
    city?: string;
    keywords?: string;
    sources: ('google' | 'linkedin' | 'facebook' | 'yellow_pages')[];
    min_score?: number;
    max_results?: number;
}

export interface MarketingStats {
    total_leads: number;
    qualified_leads: number;
    total_campaigns: number;
    emails_sent: number;
    emails_opened: number;
    open_rate: number;
    clicks_count: number;
    click_rate: number;
    conversions_count: number;
    conversion_rate: number;
}
