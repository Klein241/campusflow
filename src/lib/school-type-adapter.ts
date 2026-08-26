/**
 * IZITEACH — ADAPTATEUR DE TYPE D'ÉTABLISSEMENT
 * 
 * Permet d'adapter dynamiquement le vocabulaire, les formulaires,
 * les onglets visibles et les flux de travail selon la nature de l'organisation :
 * - 🏢 Centre de Formation Professionnelle / Institut de Métiers
 * - 🧑‍🏫 Formateur Indépendant / Coach / Consultant Solo
 * - 🌐 Académie en Ligne / E-Learning
 * - 🎓 Lycée / Collège / Université / École Traditionnelle
 */

export type OrganizationCategory = 
    | 'training_center'       // Centre de formation pro, Institut technique
    | 'independent_trainer'   // Formateur solo, Coach, Expert indépendant
    | 'online_academy'        // Académie digitale, Bootcamp 100% en ligne
    | 'higher_education'      // Université, Faculté, Grande École
    | 'k12_school';           // École primaire, Collège, Lycée

export interface SchoolTypeConfig {
    category: OrganizationCategory;
    categoryLabel: string;
    badgeIcon: string;
    badgeColor: string;
    
    // Terminologie adaptée
    terms: {
        class: string;           // 'Session / Cohorte' vs 'Classe' vs 'Offre de Formation'
        classes: string;         // 'Sessions & Cohortes' vs 'Classes'
        subject: string;         // 'Module' vs 'Matière' vs 'Atelier'
        subjects: string;        // 'Modules de Compétences' vs 'Matières'
        student: string;         // 'Stagiaire' / 'Apprenant' vs 'Élève'
        students: string;        // 'Stagiaires & Apprenants' vs 'Élèves'
        teacher: string;         // 'Formateur' vs 'Professeur'
        teachers: string;        // 'Formateurs & Experts' vs 'Professeurs'
        grades: string;          // 'Validation des Modules' vs 'Notes'
        evaluations: string;     // 'Projets & Évaluations' vs 'Évaluations'
        timetable: string;       // 'Planning des Sessions' vs 'Emploi du temps'
        rooms: string;           // 'Salles & Ateliers' vs 'Salles'
        certificates: string;    // 'Attestations & Diplômes PRO' vs 'Certificats'
        cycle: string;           // 'Durée & Filière' vs 'Cycle'
    };

    // Onglets désactivés / masqués par défaut (ex: discipline pour des adultes)
    hiddenTabs: string[];

    // Options de durées types de formation
    durationOptions: Array<{ id: string; label: string; months?: number; isPopular?: boolean }>;

    // Rythmes de cours
    rhythms: string[];
}

/**
 * Détecte la catégorie d'établissement depuis le champ school_type
 */
export function getOrganizationCategory(schoolType?: string | null): OrganizationCategory {
    const raw = (schoolType || '').toLowerCase().trim();
    
    // 1. Formateur Indépendant / Coach
    if (
        raw.includes('formateur_independant') ||
        raw.includes('formateur') ||
        raw.includes('coach') ||
        raw.includes('consultant') ||
        raw.includes('solo') ||
        raw.includes('indépendant') ||
        raw.includes('independant')
    ) {
        return 'independent_trainer';
    }

    // 2. Centre de formation pro / Institut de métiers
    if (
        raw.includes('centre_formation') ||
        raw.includes('formation_pro') ||
        raw.includes('formation') ||
        raw.includes('professionnel') ||
        raw.includes('metier') ||
        raw.includes('métier') ||
        raw.includes('apprentissage') ||
        raw.includes('vocational') ||
        raw.includes('cqp') ||
        raw.includes('dqp')
    ) {
        return 'training_center';
    }

    // 3. Académie en ligne
    if (
        raw.includes('academie_en_ligne') ||
        raw.includes('online') ||
        raw.includes('elearning') ||
        raw.includes('e-learning') ||
        raw.includes('virtuelle')
    ) {
        return 'online_academy';
    }

    // 4. Enseignement Supérieur / Université
    if (
        raw.includes('universite') ||
        raw.includes('université') ||
        raw.includes('faculte') ||
        raw.includes('faculté') ||
        raw.includes('institut') ||
        raw.includes('supérieur') ||
        raw.includes('bachelor') ||
        raw.includes('master')
    ) {
        return 'higher_education';
    }

    // 5. Par défaut : Lycée / Collège / École
    return 'k12_school';
}

/**
 * Fournit la configuration complète et les termes adaptés pour un établissement
 */
export function getSchoolTypeConfig(schoolType?: string | null): SchoolTypeConfig {
    const cat = getOrganizationCategory(schoolType);

    switch (cat) {
        case 'independent_trainer':
            return {
                category: 'independent_trainer',
                categoryLabel: 'Formateur Indépendant & Coach',
                badgeIcon: '🧑‍🏫',
                badgeColor: 'from-amber-500 to-orange-500',
                terms: {
                    class: 'Offre / Formation',
                    classes: 'Mes Formations & Bootcamps',
                    subject: 'Module d\'apprentissage',
                    subjects: 'Modules & Ateliers',
                    student: 'Apprenant / Client',
                    students: 'Mes Apprenants',
                    teacher: 'Formateur (Moi)',
                    teachers: 'Mon Profil Formateur',
                    grades: 'Suivi de Compétences',
                    evaluations: 'Mises en situation',
                    timetable: 'Planning de Formation',
                    rooms: 'Lieux & Liens Visio',
                    certificates: 'Attestations délivrées',
                    cycle: 'Format de formation',
                },
                hiddenTabs: ['disciplines', 'teachers', 'modeles'],
                durationOptions: [
                    { id: '1_week', label: '1 Semaine (Intensif)', isPopular: true },
                    { id: '2_weeks', label: '2 Semaines (Atelier)' },
                    { id: '1_month', label: '1 Mois (Bootcamp)', isPopular: true },
                    { id: '3_months', label: '3 Mois (Accompagnement)', isPopular: true },
                    { id: '6_months', label: '6 Mois (Masterclass)' },
                    { id: 'custom', label: 'À la demande / Continu' }
                ],
                rhythms: ['En Ligne (Visio)', 'Présentiel', 'Hybride (Vidéo + Suivi)', 'Coaching Individuel 1-on-1', 'Cours du Soir / Week-end']
            };

        case 'training_center':
            return {
                category: 'training_center',
                categoryLabel: 'Centre de Formation Professionnelle',
                badgeIcon: '🏢',
                badgeColor: 'from-emerald-500 to-teal-500',
                terms: {
                    class: 'Session / Cohorte',
                    classes: 'Sessions & Cohortes',
                    subject: 'Module Métier',
                    subjects: 'Modules de Compétences',
                    student: 'Stagiaire / Apprenant',
                    students: 'Stagiaires & Apprenants',
                    teacher: 'Formateur Expert',
                    teachers: 'Formateurs & Consultants',
                    grades: 'Bilan de Compétences',
                    evaluations: 'Projets & Soutenances',
                    timetable: 'Planning des Sessions',
                    rooms: 'Salles & Ateliers Pratiques',
                    certificates: 'Diplômes & Certificats PRO',
                    cycle: 'Filière & Durée',
                },
                hiddenTabs: ['disciplines'],
                durationOptions: [
                    { id: '1_month', label: '1 Mois (Accéléré / Initiation)' },
                    { id: '3_months', label: '3 Mois (Spécialisation Rapide)', isPopular: true },
                    { id: '6_months', label: '6 Mois (Certification Métier)', isPopular: true },
                    { id: '9_months', label: '9 Mois (CQP / DQP Professionnel)', isPopular: true },
                    { id: '1_year', label: '1 An (Diplôme Professionnel)' },
                    { id: '2_years', label: '2 Ans (Brevet Professionnel / BTS)' },
                    { id: 'continuing', label: 'Formation Continue / Entreprise' }
                ],
                rhythms: ['Cours du Jour (Plein temps)', 'Cours du Soir (Travailleurs)', 'Samedi / Week-end', 'Alternance (Cours + Stage)', 'En Ligne + Ateliers']
            };

        case 'online_academy':
            return {
                category: 'online_academy',
                categoryLabel: 'Académie en Ligne & E-Learning',
                badgeIcon: '🌐',
                badgeColor: 'from-blue-500 to-indigo-500',
                terms: {
                    class: 'Programme / Cohorte',
                    classes: 'Programmes & Cohortes',
                    subject: 'Module Vidéo/Audio',
                    subjects: 'Modules de Cours',
                    student: 'Étudiant en Ligne',
                    students: 'Étudiants en Ligne',
                    teacher: 'Instructeur / Mentor',
                    teachers: 'Instructeurs & Mentors',
                    grades: 'Quiz & Exercices validés',
                    evaluations: 'Évaluations en ligne',
                    timetable: 'Calendrier des Lives',
                    rooms: 'Salons Virtuels & Webinaire',
                    certificates: 'Certificats Numériques',
                    cycle: 'Niveau du Programme',
                },
                hiddenTabs: ['disciplines', 'rooms'],
                durationOptions: [
                    { id: 'self_paced', label: 'À son propre rythme (Accès à vie)', isPopular: true },
                    { id: '1_month', label: '1 Mois (Bootcamp Live)', isPopular: true },
                    { id: '3_months', label: '3 Mois (Programme Complet)' },
                    { id: '6_months', label: '6 Mois (Certification Avancée)' }
                ],
                rhythms: ['100% Autonome (VOD)', 'Cohorte Live (Webinaires réguliers)', 'Hybride Mentoré']
            };

        case 'higher_education':
            return {
                category: 'higher_education',
                categoryLabel: 'Université & Enseignement Supérieur',
                badgeIcon: '🎓',
                badgeColor: 'from-purple-500 to-pink-500',
                terms: {
                    class: 'Filière / Niveau',
                    classes: 'Filières & Niveaux',
                    subject: 'Unité d\'Enseignement (UE)',
                    subjects: 'Unités d\'Enseignement (UE/ECUE)',
                    student: 'Étudiant',
                    students: 'Étudiants',
                    teacher: 'Enseignant-Chercheur',
                    teachers: 'Corps Enseignant',
                    grades: 'Relevés de Notes & Crédits',
                    evaluations: 'Examens & Partiels',
                    timetable: 'Emploi du Temps Universitaire',
                    rooms: 'Amphithéâtres & Salles TD',
                    certificates: 'Diplômes & Relevés',
                    cycle: 'Cycle LMD',
                },
                hiddenTabs: ['disciplines'],
                durationOptions: [
                    { id: 'semestre', label: 'Semestre (6 mois)' },
                    { id: 'licence', label: 'Licence / Bachelor (3 ans)', isPopular: true },
                    { id: 'master', label: 'Master (2 ans)' },
                    { id: 'doctorat', label: 'Doctorat (3 ans)' }
                ],
                rhythms: ['Cours Magistraux (CM)', 'Travaux Dirigés (TD)', 'Travaux Pratiques (TP)', 'Cours du Soir']
            };

        case 'k12_school':
        default:
            return {
                category: 'k12_school',
                categoryLabel: 'Lycée / Collège / École',
                badgeIcon: '🏫',
                badgeColor: 'from-indigo-500 to-blue-500',
                terms: {
                    class: 'Classe',
                    classes: 'Classes',
                    subject: 'Matière',
                    subjects: 'Matières',
                    student: 'Élève',
                    students: 'Élèves',
                    teacher: 'Professeur',
                    teachers: 'Professeurs',
                    grades: 'Notes & Bulletins',
                    evaluations: 'Évaluations & Devoirs',
                    timetable: 'Emploi du temps',
                    rooms: 'Salles de classe',
                    certificates: 'Certificats de Scolarité',
                    cycle: 'Cycle scolaire',
                },
                hiddenTabs: [],
                durationOptions: [
                    { id: 'trimestre_1', label: '1er Trimestre' },
                    { id: 'trimestre_2', label: '2ème Trimestre' },
                    { id: 'trimestre_3', label: '3ème Trimestre' },
                    { id: 'annee_complete', label: 'Année Scolaire Complète (9 mois)', isPopular: true }
                ],
                rhythms: ['Temps Plein (Lundi - Vendredi)', 'Mi-temps / Mi-journée']
            };
    }
}
