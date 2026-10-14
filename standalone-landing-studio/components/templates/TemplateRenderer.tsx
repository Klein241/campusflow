import React from 'react';
import { TemplateBentoGrid } from './template-bento-grid';
import { TemplateBentoBox } from './template-bento-box';
import { TemplateGlassShowcase } from './template-glass-showcase';
import { TemplateSegmentedHub } from './template-segmented-hub';
import { TemplateHubOnglets } from './template-hub-onglets';
import { TemplateCoachPastelle } from './template-coach-pastelle';
import { TemplateCreativeStudio } from './template-creative-studio';
import { TemplateTechMentor } from './template-tech-mentor';
import { TemplateProductMastery } from './template-product-mastery';
import { TemplateNexisStudio } from './template-nexis-studio';

export interface TemplateRendererProps {
    templateId?: string;
    org: any;
    orgSlug?: string;
    classrooms?: any[];
    filieres?: any[];
    teacherCount?: number;
    studentCount?: number;
    gallery?: string[];
    bc?: string;
    onOpenInscription?: () => void;
}

/**
 * Composant switch universel : Affiche instantanément le bon template selon son identifiant
 */
export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
    templateId = 'bento_grid',
    org,
    orgSlug = '',
    classrooms = [],
    filieres = [],
    teacherCount = 12,
    studentCount = 280,
    gallery = [],
    bc,
    onOpenInscription,
}) => {
    const brandColor = bc || org.brand_color || '#F59E0B';
    const effectiveGallery = gallery.length > 0 ? gallery : (org.gallery_images || org.template_config?.gallery_images || []);

    const props = {
        org,
        orgSlug,
        classrooms,
        filieres,
        teacherCount,
        studentCount,
        gallery: effectiveGallery,
        bc: brandColor,
        onOpenInscription: onOpenInscription || (() => {
            if (typeof window !== 'undefined') {
                const el = document.getElementById('inscription') || document.querySelector('form');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            }
        }),
    };

    switch (templateId) {
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

export default TemplateRenderer;
