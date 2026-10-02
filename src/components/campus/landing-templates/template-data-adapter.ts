import type { TemplateCustomConfig } from '@/components/campus/template-customizer-modal';

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

/**
 * Normalise et harmonise les formations / filières pour TOUS les templates
 * Synchronisation bidirectionnelle :
 * 1. Base de données réelle (filieres ou classrooms)
 * 2. Overrides éventuels enregistrés dans cfg (program_0_nom, program_0_frais_scolarite, etc.)
 * 3. Fallback élégant si l'établissement débute sans aucune formation créée
 */
export function getNormalizedPrograms(
    filieres: any[] = [],
    classrooms: any[] = [],
    org: any = {},
    cfg: TemplateCustomConfig = {}
): NormalizedProgram[] {
    const rawList: any[] = (filieres && filieres.length > 0)
        ? filieres
        : (classrooms && classrooms.length > 0)
            ? classrooms
            : [];

    // Si aucune filière ni classe n'existe encore
    if (rawList.length === 0) {
        // Regarder si l'admin a défini des formations dans le customizer studio
        const customCount = [0, 1, 2, 3].filter(i => (cfg as any)[`program_${i}_nom`] || (cfg as any)[`course_${i + 1}_nom`]).length;
        const count = customCount > 0 ? customCount : 3;

        return Array.from({ length: count }).map((_, idx) => {
            const nom = (cfg as any)[`program_${idx}_nom`]
                || (cfg as any)[`course_${idx + 1}_nom`]
                || (idx === 0 ? 'Formation Certifiante Principale' : idx === 1 ? 'Parcours d\'Excellence Professionnelle' : 'Spécialisation Avancée & Pratique');
            
            const dureeStr = (cfg as any)[`program_${idx}_duree`] || (idx === 0 ? '6 mois' : idx === 1 ? '3 mois' : '1 an');
            const dureeNum = parseInt(dureeStr.replace(/\D/g, ''), 10) || 6;

            const feeRaw = (cfg as any)[`program_${idx}_frais_scolarite`] || (idx === 0 ? '180 000' : idx === 1 ? '120 000' : '250 000');
            const feeNum = parseInt(String(feeRaw).replace(/\s/g, '').replace(/[^0-9]/g, ''), 10) || 150000;

            const prixBarreRaw = (cfg as any)[`program_${idx}_prix_barre`] || (idx === 0 ? '220 000' : null);
            const prixBarreNum = prixBarreRaw ? parseInt(String(prixBarreRaw).replace(/\s/g, '').replace(/[^0-9]/g, ''), 10) : null;

            const promoBadge = (cfg as any)[`program_${idx}_promo`] || (prixBarreNum && prixBarreNum > feeNum ? `-${Math.round(((prixBarreNum - feeNum) / prixBarreNum) * 100)}%` : null);

            return {
                id: `demo_${idx}`,
                index: idx,
                nom,
                category: idx % 3 === 0 ? 'Cursus d\'Élite' : idx % 3 === 1 ? 'Certification Métier' : 'Atelier Pratique',
                description: (cfg as any)[`program_${idx}_description`] || `Programme complet dispensé par ${org.name || 'notre établissement'}. Apprentissage structuré avec ateliers pratiques et suivi personnalisé.`,
                duree_mois: dureeNum,
                duree_texte: dureeStr.includes('mois') || dureeStr.includes('an') ? dureeStr : `${dureeNum} mois`,
                frais_scolarite: feeNum,
                formatted_price: `${new Intl.NumberFormat('fr-FR').format(feeNum)} FCFA`,
                prix_barre: prixBarreNum,
                formatted_prix_barre: prixBarreNum ? `${new Intl.NumberFormat('fr-FR').format(prixBarreNum)} FCFA` : null,
                promo_badge: promoBadge,
                certification_label: (cfg as any)[`program_${idx}_certification`] || 'Certification Reconnue',
                cta_text: (cfg as any)[`program_${idx}_cta`] || 'Postuler',
                rawItem: null,
            };
        });
    }

    return rawList.map((item: any, idx: number) => {
        const sched = (item.schedule_config && typeof item.schedule_config === 'object') ? item.schedule_config : {};

        // 1. Nom
        const nom = (cfg as any)[`program_${idx}_nom`]
            || (cfg as any)[`course_${idx + 1}_nom`]
            || item.nom
            || item.name
            || `Programme #${idx + 1}`;

        // 2. Durée
        let durationMonths: number = item.duree_mois || null;
        let durationText = (cfg as any)[`program_${idx}_duree`] || item.training_duration || sched.duration_text || '';
        if (!durationText && item.cycle) {
            durationText = item.cycle.split('•')?.[0]?.trim() || '';
        }
        if (!durationMonths && durationText) {
            const m = String(durationText).match(/(\d+)\s*mois/i);
            if (m) durationMonths = parseInt(m[1], 10);
        }
        if (!durationMonths) durationMonths = 6;
        if (!durationText) durationText = `${durationMonths} mois`;

        // 3. Frais de scolarité
        let priceNum = 0;
        const cfgFee = (cfg as any)[`program_${idx}_frais_scolarite`];
        if (cfgFee !== undefined && cfgFee !== null && cfgFee !== '') {
            priceNum = parseInt(String(cfgFee).replace(/\s/g, '').replace(/[^0-9]/g, ''), 10) || 0;
        } else {
            priceNum = Number(item.frais_scolarite || item.tuition_fee || 0);
            if (!priceNum && item.cycle) {
                const match = String(item.cycle).match(/(\d[\d\s]*)\s*(FCFA|XAF|EUR|USD|\$|€)/i);
                if (match) priceNum = parseInt(match[1].replace(/\s/g, ''), 10);
            }
        }

        // 4. Prix barré
        let prixBarreNum: number | null = null;
        const cfgPrixBarre = (cfg as any)[`program_${idx}_prix_barre`];
        if (cfgPrixBarre !== undefined && cfgPrixBarre !== null && cfgPrixBarre !== '') {
            prixBarreNum = parseInt(String(cfgPrixBarre).replace(/\s/g, '').replace(/[^0-9]/g, ''), 10) || null;
        } else {
            const pb = item.prix_barre || sched.prix_barre || sched.original_price;
            if (pb) {
                prixBarreNum = parseInt(String(pb).replace(/\s/g, '').replace(/[^0-9]/g, ''), 10) || null;
            }
        }

        // 5. Badge Promo
        let promoBadge = (cfg as any)[`program_${idx}_promo`] || sched.promo_badge || null;
        if (!promoBadge && prixBarreNum && priceNum && prixBarreNum > priceNum) {
            promoBadge = `-${Math.round(((prixBarreNum - priceNum) / prixBarreNum) * 100)}%`;
        }

        // 6. Description
        const desc = (cfg as any)[`program_${idx}_description`]
            || item.description
            || sched.description
            || (Array.isArray(item.competencies_list) && item.competencies_list.length > 0 ? item.competencies_list.join('\n') : '')
            || (typeof item.competencies_list === 'string' && item.competencies_list)
            || `Programme complet dispensé par ${org.name || 'notre établissement'}. Apprentissage structuré avec ateliers pratiques et suivi personnalisé.`;

        // 7. Catégorie
        const cat = item.cycle?.split('•')?.[0]?.trim()
            || (item.level ? `Niveau ${item.level}` : idx % 3 === 0 ? 'Formation Certifiante' : idx % 3 === 1 ? 'Parcours Pro' : 'Atelier Spécialisé');

        const certLabel = (cfg as any)[`program_${idx}_certification`] || sched.certification_label || 'Certification PRO';
        const ctaText = (cfg as any)[`program_${idx}_cta`] || sched.cta_text || 'Postuler';

        return {
            id: item.id || `p_${idx}`,
            index: idx,
            nom,
            code: item.code || `PRO-${idx + 1}`,
            category: cat,
            description: desc,
            duree_mois: durationMonths,
            duree_texte: durationText,
            frais_scolarite: priceNum,
            formatted_price: priceNum > 0 ? `${new Intl.NumberFormat('fr-FR').format(priceNum)} FCFA` : (cfg.flagship_price || 'Tarif sur dossier'),
            prix_barre: prixBarreNum,
            formatted_prix_barre: prixBarreNum ? `${new Intl.NumberFormat('fr-FR').format(prixBarreNum)} FCFA` : null,
            promo_badge: promoBadge,
            certification_label: certLabel,
            cta_text: ctaText,
            rawItem: item,
        };
    });
}

/**
 * Normalise les avis / témoignages personnalisables point par point
 */
export function getNormalizedTestimonials(
    cfg: TemplateCustomConfig = {},
    defaults?: Partial<NormalizedTestimonial>[]
): NormalizedTestimonial[] {
    const defaultList: Partial<NormalizedTestimonial>[] = defaults && defaults.length > 0 ? defaults : [
        {
            author: 'Marcelle A.',
            role: 'Ancienne Étudiante • Promo Récente',
            quote: 'Une formation rigoureuse et professionnalisante. Les formateurs sont à l\'écoute et les projets préparent directement aux exigences du marché.',
            stars: 5
        },
        {
            author: 'David O.',
            role: 'Diplômé en Reconversion',
            quote: 'L\'encadrement et la qualité des modules m\'ont permis de valider ma certification et de décrocher mon premier contrat dans le secteur en moins de 3 mois.',
            stars: 5
        },
        {
            author: 'Sarah M.',
            role: 'Professionnelle en Perfectionnement',
            quote: 'Les cours du soir et les ateliers pratiques sont parfaitement organisés. C\'est un investissement rentable pour faire décoller ses compétences.',
            stars: 5
        }
    ];

    return [1, 2, 3].map((num, i) => {
        const fallback = defaultList[i] || defaultList[0];
        const author = (cfg as any)[`testimonial_${num}_author`] || fallback.author || `Apprenant #${num}`;
        const role = (cfg as any)[`testimonial_${num}_role`] || fallback.role || 'Diplômé Certifié';
        const quote = (cfg as any)[`testimonial_${num}_quote`] || fallback.quote || 'Une expérience académique enrichissante et un corps professoral d\'élite.';
        const stars = Number((cfg as any)[`testimonial_${num}_stars`] || fallback.stars || 5);

        return {
            id: num,
            author,
            role,
            quote,
            stars: isNaN(stars) ? 5 : stars,
            avatar: (cfg as any)[`testimonial_${num}_avatar`] || fallback.avatar,
            authorFieldKey: `testimonial_${num}_author`,
            roleFieldKey: `testimonial_${num}_role`,
            quoteFieldKey: `testimonial_${num}_quote`,
        };
    });
}

/**
 * Normalise les statistiques de l'établissement
 */
export function getNormalizedStats(
    cfg: TemplateCustomConfig = {},
    teacherCount = 0,
    studentCount = 0
): NormalizedStats {
    return {
        stat1: {
            value: cfg.stat1_value || '98%',
            label: cfg.stat1_label || 'Taux d\'Insertion Professionnelle',
            valueKey: 'stat1_value',
            labelKey: 'stat1_label',
        },
        stat2: {
            value: cfg.stat2_value || (studentCount > 0 ? `+${studentCount}` : '+500'),
            label: cfg.stat2_label || 'Étudiants Formés & Certifiés',
            valueKey: 'stat2_value',
            labelKey: 'stat2_label',
        },
        stat3: {
            value: cfg.stat3_value || (teacherCount > 0 ? `${teacherCount}` : '15+'),
            label: cfg.stat3_label || 'Mentors & Formateurs Experts',
            valueKey: 'stat3_value',
            labelKey: 'stat3_label',
        },
        stat4: {
            value: cfg.stat4_value || '100%',
            label: cfg.stat4_label || 'Projets Réels & Pratiques',
            valueKey: 'stat4_value',
            labelKey: 'stat4_label',
        },
    };
}
