/**
 * MCP Gateway & JSON-RPC Protocol Dispatcher
 */
import { Env } from '../types';
import { json, jsonResponse, errorResponse, CORS_HEADERS } from '../lib/cors';
import { executeMcpToolD1, logMcpAction } from './tools';

// ══════════════════════════════════════════════════════════
// MCP IZITEACH — CLOUDFLARE D1 PRIMARY ENGINE
// ══════════════════════════════════════════════════════════

const WORKER_MCP_TOOLS = [
    {
        name: 'list_subjects',
        description: 'Lister toutes les matières de l\'organisation',
        permission: 'read:curriculum',
        inputSchema: { type: 'object', properties: { class_id: { type: 'string' } } },
    },
    {
        name: 'list_chapters',
        description: 'Lister les chapitres d\'une matière',
        permission: 'read:curriculum',
        inputSchema: { type: 'object', properties: { subject_id: { type: 'string' } }, required: ['subject_id'] },
    },
    {
        name: 'list_lessons',
        description: 'Lister les leçons d\'un chapitre avec le nombre et détails des exercices associés',
        permission: 'read:curriculum',
        inputSchema: { type: 'object', properties: { chapter_id: { type: 'string' } }, required: ['chapter_id'] },
    },
    {
        name: 'get_lesson',
        description: 'Obtenir le contenu textuel complet, le résumé et les notions d\'une leçon publiée dans l\'école pour expliquer aux élèves dans le chat',
        permission: 'read:curriculum',
        inputSchema: { type: 'object', properties: { lesson_id: { type: 'string' } }, required: ['lesson_id'] },
    },
    {
        name: 'search_published_lessons',
        description: 'Rechercher des leçons et chapitres publiés par mot-clé ou matière pour répondre précisément aux questions des élèves et professeurs dans le chat',
        permission: 'read:curriculum',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Mot-clé ou thème du cours recherché (ex: Dérivées, Guerre Froide, Photosynthèse)' },
                subject_id: { type: 'string', description: 'ID de la matière (optionnel)' },
                class_id: { type: 'string', description: 'ID de la classe (optionnel)' },
                limit: { type: 'number', description: 'Nombre de leçons retournées (défaut: 10)' },
            },
            required: ['query'],
        },
    },
    {
        name: 'list_exercises',
        description: 'Lister les exercices d\'une leçon ou d\'un chapitre',
        permission: 'read:curriculum',
        inputSchema: { type: 'object', properties: { lesson_id: { type: 'string' }, chapter_id: { type: 'string' } } },
    },
    {
        name: 'create_subject',
        description: 'Créer une nouvelle matière',
        permission: 'write:curriculum',
        inputSchema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, class_id: { type: 'string' } }, required: ['name'] },
    },
    {
        name: 'update_subject',
        description: 'Modifier une matière existante',
        permission: 'write:curriculum',
        inputSchema: { type: 'object', properties: { subject_id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' } }, required: ['subject_id'] },
    },
    {
        name: 'delete_subject',
        description: 'Supprimer une matière (et ses chapitres/leçons)',
        permission: 'write:curriculum',
        inputSchema: { type: 'object', properties: { subject_id: { type: 'string' } }, required: ['subject_id'] },
    },
    {
        name: 'create_chapter',
        description: 'Créer un chapitre dans une matière',
        permission: 'write:curriculum',
        inputSchema: { type: 'object', properties: { subject_id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, order_index: { type: 'number' }, position: { type: 'number' } }, required: ['subject_id', 'title'] },
    },
    {
        name: 'update_chapter',
        description: 'Modifier un chapitre existant',
        permission: 'write:curriculum',
        inputSchema: { type: 'object', properties: { chapter_id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, position: { type: 'number' } }, required: ['chapter_id'] },
    },
    {
        name: 'delete_chapter',
        description: 'Supprimer un chapitre',
        permission: 'write:curriculum',
        inputSchema: { type: 'object', properties: { chapter_id: { type: 'string' } }, required: ['chapter_id'] },
    },
    {
        name: 'create_lesson',
        description: 'Créer une leçon dans un chapitre (supporte le français, anglais, arabe et 20+ langues locales africaines)',
        permission: 'write:curriculum',
        inputSchema: { type: 'object', properties: { chapter_id: { type: 'string' }, title: { type: 'string' }, content: { type: 'string' }, duration_minutes: { type: 'number' }, position: { type: 'number' }, language: { type: 'string', description: 'Code de langue (ex: fr, en, sw, ha, yo, ig, lin, ful, ewo, dua, bam, kin, etc. Défaut: fr)' } }, required: ['chapter_id', 'title', 'content'] },
    },
    {
        name: 'update_lesson',
        description: 'Modifier une leçon existante (titre, contenu markdown, durée, langue)',
        permission: 'write:curriculum',
        inputSchema: { type: 'object', properties: { lesson_id: { type: 'string' }, title: { type: 'string' }, content: { type: 'string' }, duration_minutes: { type: 'number' }, position: { type: 'number' }, language: { type: 'string' } }, required: ['lesson_id'] },
    },
    {
        name: 'delete_lesson',
        description: 'Supprimer une leçon',
        permission: 'write:curriculum',
        inputSchema: { type: 'object', properties: { lesson_id: { type: 'string' } }, required: ['lesson_id'] },
    },
    {
        name: 'create_exercise',
        description: 'Créer un exercice dans une leçon (QCM, Vrai/Faux ou rédaction, support multilingue)',
        permission: 'write:exercises',
        inputSchema: { type: 'object', properties: { lesson_id: { type: 'string' }, title: { type: 'string' }, question: { type: 'string' }, type: { type: 'string', enum: ['qcm', 'text', 'true_false'] }, choices: { type: 'array', items: { type: 'string' } }, options: { type: 'array', items: { type: 'string' } }, correct_answer: { type: 'string' }, explanation: { type: 'string' }, questions: { type: 'array' }, max_score: { type: 'number' }, language: { type: 'string', description: 'Code langue (défaut: fr)' } }, required: ['lesson_id', 'title'] },
    },
    {
        name: 'update_exercise',
        description: 'Modifier un exercice existant',
        permission: 'write:exercises',
        inputSchema: { type: 'object', properties: { exercise_id: { type: 'string' }, title: { type: 'string' }, question: { type: 'string' }, type: { type: 'string' }, choices: { type: 'array' }, correct_answer: { type: 'string' }, explanation: { type: 'string' }, questions: { type: 'array' }, max_score: { type: 'number' }, language: { type: 'string' } }, required: ['exercise_id'] },
    },
    {
        name: 'delete_exercise',
        description: 'Supprimer un exercice',
        permission: 'write:exercises',
        inputSchema: { type: 'object', properties: { exercise_id: { type: 'string' } }, required: ['exercise_id'] },
    },
    {
        name: 'bulk_create',
        description: 'Création en masse ultra-rapide (créer toute une arborescence matière/chapitres/leçons/exercices en 1 seul appel avec support multilingue)',
        permission: 'write:curriculum',
        inputSchema: {
            type: 'object',
            properties: {
                subject_name: { type: 'string', description: 'Nom de la matière (optionnel si subject_id fourni)' },
                subject_id: { type: 'string', description: 'ID de la matière parente existante' },
                class_id: { type: 'string', description: 'ID de la classe cible' },
                language: { type: 'string', description: 'Code langue global pour toutes les leçons (ex: sw, ha, lin, ful, ewo, etc. Défaut: fr)' },
                chapters: {
                    type: 'array',
                    description: 'Liste des chapitres avec leçons et exercices imbriqués',
                    items: {
                        type: 'object',
                        properties: {
                            title: { type: 'string' },
                            description: { type: 'string' },
                            language: { type: 'string' },
                            lessons: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        title: { type: 'string' },
                                        content: { type: 'string' },
                                        duration_minutes: { type: 'number' },
                                        language: { type: 'string' },
                                        exercises: { type: 'array' },
                                    },
                                    required: ['title', 'content'],
                                },
                            },
                        },
                        required: ['title'],
                    },
                },
                items: {
                    type: 'array',
                    description: 'Liste plate d\'éléments à créer (chapitres, leçons ou exercices)',
                },
            },
        },
    },
    // ── OUTILS LANGUES AFRICAINES & MULTILINGUISME IZITEACH ──
    {
        name: 'list_supported_languages',
        description: 'Lister toutes les langues supportées par IziTeach pour la création et traduction de cours (5 langues internationales + 20 langues locales africaines avec locuteurs et pays)',
        permission: 'read:curriculum',
        inputSchema: {
            type: 'object',
            properties: {
                only_african: { type: 'boolean', description: 'Filtrer uniquement les langues africaines locales' },
            },
        },
    },
    {
        name: 'translate_content',
        description: 'Traduire un texte pédagogique vers une langue locale africaine ou internationale via Meta LLaMA 3.1 Instruct ou injecter une traduction manuelle contrôlée avec mise à jour automatique bilingue d\'une leçon (content + content_original) ou d\'un exercice',
        permission: 'write:curriculum',
        inputSchema: {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'Texte pédagogique original à traduire' },
                target_language: { type: 'string', description: 'Code de la langue cible (ex: sw, ha, yo, ig, lin, ful, ewo, dua, bam, kin, mlg, etc.)' },
                source_language: { type: 'string', description: 'Code langue source (défaut: fr)' },
                custom_translated_text: { type: 'string', description: 'Traduction manuelle ou contrôlée fournie directement par l\'agent pour enregistrement immédiat sans passer par le modèle' },
                lesson_id: { type: 'string', description: 'ID optionnel d\'une leçon existante à mettre à jour avec cette traduction (active le lecteur bilingue synchronisé)' },
                exercise_id: { type: 'string', description: 'ID optionnel d\'un exercice existant à mettre à jour' },
            },
            required: ['target_language'],
        },
    },
    {
        name: 'list_students',
        description: 'Lister les étudiants inscrits dans l\'établissement avec classe, matricule et contacts',
        permission: 'read:students',
        inputSchema: { type: 'object', properties: { class_id: { type: 'string' }, search: { type: 'string' }, limit: { type: 'number' } } },
    },
    {
        name: 'create_student',
        description: 'Inscrire un nouvel élève/étudiant dans une classe avec matricule automatique et contacts parents',
        permission: 'admin:students',
        inputSchema: {
            type: 'object',
            properties: {
                first_name: { type: 'string', description: 'Prénom de l\'élève' },
                last_name: { type: 'string', description: 'Nom de famille' },
                classroom_id: { type: 'string', description: 'ID de la classe cible' },
                matricule: { type: 'string', description: 'Matricule personnalisé (optionnel, auto-généré si omis)' },
                phone: { type: 'string' },
                email: { type: 'string' },
                parent_name: { type: 'string' },
                parent_phone: { type: 'string' },
                date_of_birth: { type: 'string' },
            },
            required: ['first_name', 'last_name'],
        },
    },
    {
        name: 'update_student',
        description: 'Mettre à jour le profil d\'un élève (classe, téléphone, statut, etc.)',
        permission: 'admin:students',
        inputSchema: {
            type: 'object',
            properties: {
                student_id: { type: 'string' },
                first_name: { type: 'string' },
                last_name: { type: 'string' },
                classroom_id: { type: 'string' },
                matricule: { type: 'string' },
                phone: { type: 'string' },
                email: { type: 'string' },
                parent_name: { type: 'string' },
                parent_phone: { type: 'string' },
                is_active: { type: 'boolean' },
            },
            required: ['student_id'],
        },
    },
    {
        name: 'delete_student',
        description: 'Désinscrire ou supprimer un profil élève de l\'établissement',
        permission: 'admin:students',
        inputSchema: { type: 'object', properties: { student_id: { type: 'string' } }, required: ['student_id'] },
    },
    {
        name: 'list_teachers',
        description: 'Lister les enseignants et professeurs de l\'établissement avec leurs matières et codes d\'accès',
        permission: 'read:students',
        inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
    },
    {
        name: 'create_teacher',
        description: 'Ajouter un nouveau professeur ou enseignant avec spécialité et code d\'accès automatique',
        permission: 'admin:students',
        inputSchema: {
            type: 'object',
            properties: {
                first_name: { type: 'string' },
                last_name: { type: 'string' },
                speciality: { type: 'string' },
                phone: { type: 'string' },
                email: { type: 'string' },
                diplomas: { type: 'string' },
            },
            required: ['first_name', 'last_name'],
        },
    },
    {
        name: 'record_payment',
        description: 'Enregistrer un paiement de scolarité ou frais de scolarité pour un élève (Cash, MTN MoMo, Orange Money, etc.)',
        permission: 'admin:payments',
        inputSchema: {
            type: 'object',
            properties: {
                student_id: { type: 'string', description: 'ID de l\'élève' },
                amount: { type: 'number', description: 'Montant versé' },
                currency: { type: 'string', description: 'Devise (défaut: XAF)' },
                payment_method: { type: 'string', enum: ['cash', 'momo', 'orange_money', 'bank', 'other'] },
                term: { type: 'string', description: 'Trimestre ou motif (ex: Trimestre 1, Inscription)' },
                academic_year: { type: 'string', description: 'Année scolaire (ex: 2025-2026)' },
                reference: { type: 'string', description: 'Numéro de reçu ou référence externe' },
                description: { type: 'string' },
            },
            required: ['student_id', 'amount'],
        },
    },
    {
        name: 'list_payments',
        description: 'Consulter l\'historique des paiements de scolarité avec total encaissé',
        permission: 'admin:payments',
        inputSchema: {
            type: 'object',
            properties: {
                student_id: { type: 'string' },
                academic_year: { type: 'string' },
                term: { type: 'string' },
                limit: { type: 'number' },
            },
        },
    },
    {
        name: 'get_school_stats',
        description: 'Obtenir les statistiques complètes de l\'établissement (effectifs élèves, profs, cours, revenus scolarité, examens)',
        permission: 'read:curriculum',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'list_chat_messages',
        description: 'Lire les messages récents d\'une conversation ou salle de discussion dans l\'application (DM, groupe ou support)',
        permission: 'read:students',
        inputSchema: {
            type: 'object',
            properties: {
                conversation_id: { type: 'string', description: 'ID de la conversation ou salon de chat' },
                limit: { type: 'number', description: 'Nombre max de messages récents (défaut: 20)' },
            },
            required: ['conversation_id'],
        },
    },
    {
        name: 'send_chat_message',
        description: 'Envoyer une réponse ou un message directement dans un salon de discussion ou chat de l\'application (l\'utilisateur dans l\'app reçoit la réponse en temps réel)',
        permission: 'write:curriculum',
        inputSchema: {
            type: 'object',
            properties: {
                conversation_id: { type: 'string', description: 'ID de la conversation ou salon de chat cible' },
                content: { type: 'string', description: 'Texte du message ou de la réponse IA' },
                sender_name: { type: 'string', description: 'Nom affiché (ex: MANUS IA, Assistant Pédagogique)' },
            },
            required: ['conversation_id', 'content'],
        },
    },
    {
        name: 'list_classes',
        description: 'Lister les classes de l\'organisation',
        permission: 'read:curriculum',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'get_org_info',
        description: 'Obtenir les informations générales de l\'organisation',
        permission: 'read:curriculum',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'list_grades',
        description: 'Consulter les notes et évaluations des étudiants',
        permission: 'read:grades',
        inputSchema: { type: 'object', properties: { student_id: { type: 'string' }, class_id: { type: 'string' }, subject_id: { type: 'string' }, limit: { type: 'number' } } },
    },
    {
        name: 'create_grade',
        description: 'Enregistrer une note d\'évaluation pour un étudiant',
        permission: 'write:grades',
        inputSchema: { type: 'object', properties: { student_id: { type: 'string' }, subject_id: { type: 'string' }, score: { type: 'number' }, max_score: { type: 'number' }, evaluation_title: { type: 'string' }, period: { type: 'string' } }, required: ['student_id', 'subject_id', 'score'] },
    },
    {
        name: 'list_attendance',
        description: 'Consulter le registre des présences',
        permission: 'read:attendance',
        inputSchema: { type: 'object', properties: { class_id: { type: 'string' }, date: { type: 'string' }, limit: { type: 'number' } } },
    },
    {
        name: 'list_schedule',
        description: 'Consulter l\'emploi du temps d\'une classe ou d\'un professeur',
        permission: 'read:schedule',
        inputSchema: { type: 'object', properties: { classroom_id: { type: 'string' }, class_id: { type: 'string' }, day_of_week: { type: 'string' }, subject_id: { type: 'string' } } },
    },
    {
        name: 'create_schedule_slot',
        description: 'Créer un nouveau créneau dans l\'emploi du temps d\'une classe',
        permission: 'write:schedule',
        inputSchema: {
            type: 'object',
            properties: {
                classroom_id: { type: 'string' },
                class_id: { type: 'string' },
                subject_id: { type: 'string' },
                day_of_week: { type: 'string' },
                start_time: { type: 'string' },
                end_time: { type: 'string' },
                room: { type: 'string' },
                teacher_id: { type: 'string' },
            },
            required: ['subject_id', 'day_of_week', 'start_time', 'end_time'],
        },
    },
    {
        name: 'update_schedule',
        description: 'Ajouter ou modifier un créneau d\'emploi du temps',
        permission: 'write:schedule',
        inputSchema: { type: 'object', properties: { slot_id: { type: 'string' }, classroom_id: { type: 'string' }, subject_id: { type: 'string' }, day_of_week: { type: 'string' }, start_time: { type: 'string' }, end_time: { type: 'string' }, room: { type: 'string' }, room_name: { type: 'string' }, teacher_id: { type: 'string' } }, required: ['subject_id', 'day_of_week', 'start_time', 'end_time'] },
    },
    {
        name: 'update_schedule_slot',
        description: 'Modifier un créneau existant de l\'emploi du temps',
        permission: 'write:schedule',
        inputSchema: { type: 'object', properties: { slot_id: { type: 'string' }, classroom_id: { type: 'string' }, subject_id: { type: 'string' }, day_of_week: { type: 'string' }, start_time: { type: 'string' }, end_time: { type: 'string' }, room: { type: 'string' }, teacher_id: { type: 'string' } }, required: ['slot_id'] },
    },
    {
        name: 'delete_schedule_slot',
        description: 'Supprimer un créneau de l\'emploi du temps',
        permission: 'write:schedule',
        inputSchema: { type: 'object', properties: { slot_id: { type: 'string' } }, required: ['slot_id'] },
    },
    {
        name: 'bulk_create_schedule',
        description: 'Créer en masse plusieurs créneaux d\'emploi du temps pour une classe en un seul appel',
        permission: 'write:schedule',
        inputSchema: { type: 'object', properties: { classroom_id: { type: 'string' }, slots: { type: 'array' } }, required: ['slots'] },
    },
    // ── BIBLIOTHÈQUE NUMÉRIQUE & LIVRES ──
    {
        name: 'publish_library_item',
        description: 'Publier un livre, cours, document ou ressource pédagogique dans la Bibliothèque Numérique de l\'établissement',
        permission: 'write:curriculum',
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                category: { type: 'string', enum: ['cours', 'exercice', 'corrige', 'annale', 'guide', 'memoire', 'support', 'general'] },
                content: { type: 'string' },
                file_url: { type: 'string' },
                file_type: { type: 'string' },
                subject_id: { type: 'string' },
                classroom_id: { type: 'string' },
                is_public: { type: 'boolean' },
            },
            required: ['title'],
        },
    },
    {
        name: 'compile_curriculum_to_book',
        description: 'Compiler tous les chapitres, leçons et exercices d\'une matière en un livre complet structuré et le publier automatiquement dans la Bibliothèque Numérique de l\'école',
        permission: 'write:curriculum',
        inputSchema: {
            type: 'object',
            properties: {
                subject_id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                include_exercises: { type: 'boolean' },
                category: { type: 'string' },
                publish_to_library: { type: 'boolean' },
                is_public: { type: 'boolean' },
            },
            required: ['subject_id'],
        },
    },
    {
        name: 'list_library_items',
        description: 'Consulter et rechercher les livres et documents dans la Bibliothèque Numérique de l\'établissement',
        permission: 'read:curriculum',
        inputSchema: {
            type: 'object',
            properties: {
                category: { type: 'string' },
                subject_id: { type: 'string' },
                classroom_id: { type: 'string' },
                search: { type: 'string' },
                limit: { type: 'number' },
            },
        },
    },
    {
        name: 'delete_library_item',
        description: 'Supprimer un livre ou document de la Bibliothèque Numérique',
        permission: 'write:curriculum',
        inputSchema: { type: 'object', properties: { item_id: { type: 'string' } }, required: ['item_id'] },
    },
    // ── SALLE D'ÉVALUATION & EXAMENS ──
    {
        name: 'list_exam_papers',
        description: 'Lister les épreuves d\'examen et devoirs de la Salle d\'Évaluation',
        permission: 'read:curriculum',
        inputSchema: { type: 'object', properties: { subject: { type: 'string' }, status: { type: 'string' } } },
    },
    {
        name: 'create_exam_paper',
        description: 'Créer une épreuve d\'examen dans la Salle d\'Évaluation (avec barème, questions QCM/rédaction, durée, coefficient)',
        permission: 'write:curriculum',
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                subject: { type: 'string' },
                coefficient: { type: 'number' },
                duration_minutes: { type: 'number' },
                instructions: { type: 'string' },
                questions: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            text: { type: 'string' },
                            type: { type: 'string', enum: ['qcm', 'vrai_faux', 'redaction', 'texte_a_trou'] },
                            points: { type: 'number' },
                            options: { type: 'array', items: { type: 'string' } },
                            correct: {},
                        },
                        required: ['text', 'type', 'points'],
                    },
                },
                status: { type: 'string', enum: ['draft', 'published', 'archived'] },
            },
            required: ['title'],
        },
    },
    {
        name: 'update_exam_paper',
        description: 'Modifier une épreuve d\'examen dans la Salle d\'Évaluation',
        permission: 'write:curriculum',
        inputSchema: {
            type: 'object',
            properties: {
                paper_id: { type: 'string' },
                title: { type: 'string' },
                subject: { type: 'string' },
                coefficient: { type: 'number' },
                duration_minutes: { type: 'number' },
                instructions: { type: 'string' },
                questions: { type: 'array' },
                status: { type: 'string' },
            },
            required: ['paper_id'],
        },
    },
    {
        name: 'delete_exam_paper',
        description: 'Supprimer une épreuve d\'examen',
        permission: 'write:curriculum',
        inputSchema: { type: 'object', properties: { paper_id: { type: 'string' } }, required: ['paper_id'] },
    },
    {
        name: 'launch_exam_session',
        description: 'Lancer une session d\'examen en direct dans la Salle d\'Évaluation pour les étudiants',
        permission: 'write:curriculum',
        inputSchema: { type: 'object', properties: { paper_id: { type: 'string' }, participant_ids: { type: 'array', items: { type: 'string' } } }, required: ['paper_id'] },
    },
    // ── FORMULAIRES, SONDAGES & ENQUÊTES ──
    {
        name: 'list_forms',
        description: 'Lister les formulaires, sondages et enquêtes de l\'établissement',
        permission: 'read:curriculum',
        inputSchema: { type: 'object', properties: { form_type: { type: 'string', enum: ['survey', 'quiz', 'registration'] }, is_published: { type: 'boolean' } } },
    },
    {
        name: 'create_form',
        description: 'Créer un formulaire, sondage ou enquête avec questions et lien public direct pour les étudiants',
        permission: 'write:curriculum',
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                form_type: { type: 'string', enum: ['survey', 'quiz', 'registration'] },
                is_published: { type: 'boolean' },
                fields: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            label: { type: 'string' },
                            field_type: { type: 'string', enum: ['short_text', 'long_text', 'multiple_choice', 'checkbox', 'dropdown', 'date', 'time', 'rating', 'number', 'section_header'] },
                            description: { type: 'string' },
                            options: { type: 'array', items: { type: 'string' } },
                            required: { type: 'boolean' },
                            points: { type: 'number' },
                            correct_answer: { type: 'string' },
                        },
                        required: ['label', 'field_type'],
                    },
                },
            },
            required: ['title'],
        },
    },
    {
        name: 'get_form_results',
        description: 'Consulter les résultats, réponses et statistiques d\'un formulaire ou sondage',
        permission: 'read:curriculum',
        inputSchema: { type: 'object', properties: { form_id: { type: 'string' } }, required: ['form_id'] },
    },
    // ── SUPERADMIN TOOLS ──
    {
        name: 'list_support_messages',
        description: '[Superadmin] Lister les demandes de support et messages Sky Requests',
        permission: 'superadmin:support',
        inputSchema: { type: 'object', properties: { status: { type: 'string' }, limit: { type: 'number' } } },
    },
    {
        name: 'reply_support_message',
        description: '[Superadmin] Répondre à un ticket de support / demande Sky Request',
        permission: 'superadmin:support',
        inputSchema: { type: 'object', properties: { request_id: { type: 'string' }, reply_message: { type: 'string' } }, required: ['request_id', 'reply_message'] },
    },
    {
        name: 'credit_sky_points',
        description: '[Superadmin] Créditer des Sky Points à un utilisateur ou une organisation',
        permission: 'superadmin:points',
        inputSchema: { type: 'object', properties: { target_type: { type: 'string', enum: ['org', 'user'] }, target_id: { type: 'string' }, points: { type: 'number' }, note: { type: 'string' } }, required: ['target_type', 'target_id', 'points'] },
    },
    {
        name: 'list_inactive_orgs',
        description: '[Superadmin] Lister les organisations inactives (sans connexion récente)',
        permission: 'superadmin:orgs',
        inputSchema: { type: 'object', properties: { days_inactive: { type: 'number' } } },
    },
    {
        name: 'list_bug_reports',
        description: '[Superadmin] Lister les signalements de bugs reçus sur la plateforme',
        permission: 'superadmin:bugs',
        inputSchema: { type: 'object', properties: { status: { type: 'string' } } },
    },
    {
        name: 'update_bug_status',
        description: '[Superadmin] Mettre à jour le statut et la note d\'un rapport de bug',
        permission: 'superadmin:bugs',
        inputSchema: { type: 'object', properties: { bug_id: { type: 'string' }, status: { type: 'string', enum: ['open', 'in_progress', 'resolved'] }, admin_note: { type: 'string' } }, required: ['bug_id', 'status'] },
    },
    {
        name: 'send_superadmin_announcement',
        description: '[Superadmin] Diffuser une annonce officielle à toutes les écoles ou une école cible',
        permission: 'superadmin:announcements',
        inputSchema: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' }, target_org_id: { type: 'string' }, type: { type: 'string', enum: ['info', 'warning', 'urgent', 'success'] } }, required: ['title', 'content'] },
    },
    {
        name: 'send_email_to_org',
        description: '[Superadmin] Envoyer un email direct de relance ou d\'information au responsable d\'une organisation',
        permission: 'superadmin:emails',
        inputSchema: { type: 'object', properties: { org_id: { type: 'string' }, subject: { type: 'string' }, message: { type: 'string' } }, required: ['org_id', 'subject', 'message'] },
    },
    {
        name: 'generate_bug_summary_report',
        description: '[Superadmin] Générer un rapport d\'analyse synthétique sur les bugs signalés',
        permission: 'superadmin:bugs',
        inputSchema: { type: 'object', properties: { period_days: { type: 'number' } } },
    },
    {
        name: 'get_platform_stats',
        description: '[Superadmin] Obtenir les statistiques globales de la plateforme IziTeach',
        permission: 'superadmin:orgs',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'list_organizations',
        description: '[Superadmin] Lister tous les établissements/écoles de la plateforme avec leurs UUIDs et détails',
        permission: 'superadmin:orgs',
        inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
    },

    // ── SUPERADMIN MARKETING & CROISSANCE IA ──
    {
        name: 'marketing_deep_research',
        description: '[Superadmin] Lancer un Deep Research IA pour scraper et extraire des prospects qualifiés (écoles, universités, centres de formation, décideurs)',
        permission: 'superadmin:marketing',
        inputSchema: {
            type: 'object',
            properties: {
                target_type: { type: 'string', enum: ['ecoles_privees', 'universites', 'centres_formation', 'instituts_langue', 'lycees_colleges', 'entreprises_edtech'] },
                country: { type: 'string' },
                city: { type: 'string' },
                keywords: { type: 'string' },
                sources: { type: 'array', items: { type: 'string' } },
            },
            required: ['country'],
        },
    },
    {
        name: 'marketing_create_campaign',
        description: '[Superadmin] Créer une campagne d\'emailing marketing ciblée avec variables dynamiques et tracking d\'ouverture',
        permission: 'superadmin:marketing',
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                subject: { type: 'string' },
                html_content: { type: 'string' },
                target_segment: { type: 'string' },
                scheduled_at: { type: 'string' },
                follow_up_enabled: { type: 'boolean' },
            },
            required: ['title', 'subject', 'html_content'],
        },
    },
    {
        name: 'marketing_send_campaign',
        description: '[Superadmin] Expédier ou programmer l\'envoi d\'une campagne email avec pixel de détection de lecture',
        permission: 'superadmin:marketing',
        inputSchema: {
            type: 'object',
            properties: {
                campaign_id: { type: 'string' },
                lead_ids: { type: 'array', items: { type: 'string' } },
            },
            required: ['campaign_id'],
        },
    },
    {
        name: 'marketing_generate_ad_creative',
        description: '[Superadmin] Générer du contenu publicitaire IA, copywriting captivant et visuels/bannières (avec support de remix d\'image)',
        permission: 'superadmin:marketing',
        inputSchema: {
            type: 'object',
            properties: {
                product: { type: 'string' },
                target_audience: { type: 'string' },
                tone: { type: 'string' },
                format: { type: 'string', enum: ['email_banner', 'social_post', 'story_ad', 'pitch_deck'] },
                reference_image_url: { type: 'string' },
            },
            required: ['format'],
        },
    },
    {
        name: 'marketing_list_leads',
        description: '[Superadmin] Lister et filtrer les prospects collectés avec leur statut de lecture/ouverture',
        permission: 'superadmin:marketing',
        inputSchema: {
            type: 'object',
            properties: {
                status: { type: 'string', enum: ['all', 'new', 'contacted', 'opened', 'clicked', 'converted', 'bounced'] },
                country: { type: 'string' },
                limit: { type: 'number' },
            },
        },
    },
    {
        name: 'marketing_get_stats',
        description: '[Superadmin] Obtenir les statistiques et KPIs de conversion marketing et d\'ouverture en direct',
        permission: 'superadmin:marketing',
        inputSchema: { type: 'object', properties: {} },
    },
];

async function handleMcpGateway(request: Request, env: Env): Promise<Response> {
    const startTime = Date.now();
    const { pathname } = new URL(request.url);

    // ── GESTION DES REQUÊTES GET (Navigateur & Flux SSE Claude) ──
    if (request.method === 'GET') {
        const accept = request.headers.get('Accept') || '';
        if (accept.includes('text/event-stream')) {
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode(`event: endpoint\ndata: ${pathname}\n\n`));
                }
            });
            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    ...CORS_HEADERS,
                },
            });
        }

        return json({
            status: 'online',
            server: 'MCP IziTeach Gateway',
            engine: 'Cloudflare D1 SQLite (Edge Engine)',
            protocol: 'jsonrpc-2.0',
            version: '2.0.0',
            transport: ['HTTP POST (JSON-RPC 2.0)', 'Server-Sent Events (SSE)'],
            description: 'Passerelle MCP IziTeach haute performance pour Claude Desktop, Manus IA, Cursor, ChatGPT et agents IA autonomes.',
            authentication: 'Bearer token header (Authorization: Bearer cf_live_...)',
            endpoints: {
                jsonrpc: `POST https://campusflow-worker.kleintaptue1.workers.dev/mcp-gateway`,
                sse: `GET https://campusflow-worker.kleintaptue1.workers.dev/mcp-gateway`,
            },
            supported_methods: ['tools/list', 'tools/call', 'initialize', 'ping'],
            tools_count: WORKER_MCP_TOOLS.length,
        });
    }

    const url = new URL(request.url);
    const authHeader = request.headers.get('Authorization') || request.headers.get('x-api-key') || request.headers.get('x-mcp-token') || '';
    const queryKey = url.searchParams.get('token') || url.searchParams.get('key') || url.searchParams.get('apiKey') || '';
    const rawKey = (authHeader.replace(/^Bearer\s+/i, '').trim()) || queryKey.trim();

    if (!rawKey || !rawKey.startsWith('cf_live_')) {
        return json({ jsonrpc: '2.0', error: { code: -32001, message: 'Clé API manquante. Utilisez: Authorization: Bearer cf_live_xxxxx ou le paramètre ?key=' }, id: null }, 401, {
            'WWW-Authenticate': 'Bearer realm="IziTeach MCP", error="invalid_token", error_description="Missing or invalid cf_live_ token"'
        });
    }

    // 1. SHA-256 de la clé API
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey));
    const keyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // 2. Vérification sur D1 (avec fallback Supabase si absent dans D1)
    let agentKey: any = null;
    try {
        agentKey = await env.CAMPUSFLOW_DB.prepare(
            `SELECT * FROM ai_agent_keys WHERE key_hash = ?1 AND is_active = 1`
        ).bind(keyHash).first();
    } catch {}

    if (!agentKey && env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
        try {
            const supRes = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/verify_ai_agent_key`, {
                method: 'POST',
                headers: {
                    'apikey': env.SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ p_raw_key: rawKey }),
            });
            if (supRes.ok) {
                const verified = await supRes.json() as any;
                if (verified && verified.valid) {
                    // ── DÉFENSE EN PROFONDEUR (WORKER SIDE) ──
                    // La RPC Supabase retourne déjà is_superadmin=false pour les clés compromises,
                    // mais on ajoute une 2ème couche : on filtre les permissions superadmin:*
                    // si le serveur ne confirme pas explicitement is_superadmin=true.
                    const verifiedPerms: string[] = verified.permissions || [];
                    const isSuperFromServer = Boolean(verified.is_superadmin);
                    // Si le serveur dit is_superadmin=false, on supprime toute permission superadmin:*
                    // par sécurité (en cas de bug futur côté RPC)
                    const sanitizedPerms = isSuperFromServer
                        ? verifiedPerms
                        : verifiedPerms.filter((p: string) => !p.startsWith('superadmin:'));
                    agentKey = {
                        id: verified.agent_id,
                        name: verified.agent_name,
                        organization_id: verified.organization_id,
                        is_superadmin: isSuperFromServer ? 1 : 0,
                        permissions: JSON.stringify(sanitizedPerms),
                        rate_limit_per_minute: verified.rate_limit_per_minute || 30,
                        bulk_action_threshold: verified.bulk_action_threshold || 10,
                    };
                }
            }
        } catch {}
    }

    if (!agentKey) {
        return json({ jsonrpc: '2.0', error: { code: -32001, message: 'Clé API invalide, inactive ou révoquée' }, id: null }, 401, {
            'WWW-Authenticate': 'Bearer realm="IziTeach MCP", error="invalid_token", error_description="The API key is invalid, inactive, or revoked"'
        });
    }

    const rawPermissions: string[] = typeof agentKey.permissions === 'string'
        ? JSON.parse(agentKey.permissions || '[]')
        : (agentKey.permissions || []);

    const isSuperadmin = Boolean(agentKey.is_superadmin);

    // ── TRIPLE VÉRIFICATION SÉCURITÉ ──
    // Si isSuperadmin=false, filtrer les permissions superadmin:* résiduelles
    // (3ème couche de protection après DB constraint + RPC fix)
    const permissions: string[] = isSuperadmin
        ? rawPermissions
        : rawPermissions.filter(p => !p.startsWith('superadmin:'));

    const orgId = agentKey.organization_id;
    const agentName = agentKey.name || 'Sky Agent';

    // 3. Parser la requête JSON-RPC
    let mcpReq: any;
    try {
        mcpReq = await request.json();
    } catch {
        return json({ jsonrpc: '2.0', error: { code: -32700, message: 'JSON invalide' }, id: null }, 400);
    }

    const reqId = mcpReq.id ?? null;

    if (mcpReq.method === 'ping') {
        return json({ jsonrpc: '2.0', result: { pong: true, engine: 'Cloudflare D1 Primary Edge (SQLite)', agent: agentName }, id: reqId });
    }

    // ── GESTION DES NOTIFICATIONS MCP (COMPATIBILITÉ PROTOCOLE CLIENT MANUS IA / CLAUDE) ──
    if (
        mcpReq.method === 'notifications/initialized' ||
        mcpReq.method === 'initialized' ||
        mcpReq.method === 'notifications/cancelled' ||
        mcpReq.method?.startsWith('notifications/')
    ) {
        if (reqId !== null && reqId !== undefined) {
            return json({ jsonrpc: '2.0', result: {}, id: reqId });
        }
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (mcpReq.method === 'initialize') {
        return json({
            jsonrpc: '2.0',
            result: {
                protocolVersion: '2024-11-05',
                capabilities: { tools: {} },
                serverInfo: { name: 'MCP IziTeach Cloudflare Edge Engine', version: '2.0.0' },
            },
            id: reqId,
        });
    }

    if (mcpReq.method === 'tools/list') {
        const tools = WORKER_MCP_TOOLS.filter(t => {
            if (isSuperadmin) return true;
            // Outils toujours publics / découverte (langues, infos de base)
            if (t.name === 'list_supported_languages' || t.name === 'get_org_info' || t.name === 'list_classes') return true;
            // Traduction : accessible si translate:content OU write:curriculum
            if (t.name === 'translate_content' && (permissions.includes('translate:content') || permissions.includes('write:curriculum'))) return true;
            // Délégation Chat Dame SKY (Claude / MANUS) : accès aux cours publiés et au chat
            if (permissions.includes('chat:dame_sky')) {
                if (['list_subjects', 'list_chapters', 'list_lessons', 'get_lesson', 'search_published_lessons', 'list_exercises', 'list_chat_messages', 'send_chat_message', 'list_forms', 'list_supported_languages', 'get_org_info', 'list_classes'].includes(t.name)) {
                    return true;
                }
            }
            // Étudiants admin : accessible si admin:students OU read:students / write:students
            if (['list_students'].includes(t.name) && (permissions.includes('read:students') || permissions.includes('admin:students'))) return true;
            if (['create_student', 'update_student', 'delete_student', 'create_teacher', 'list_teachers'].includes(t.name) && (permissions.includes('admin:students') || permissions.includes('write:students'))) return true;
            // Paiements : accessible si admin:payments OU write:grades / superadmin
            if (['record_payment', 'list_payments'].includes(t.name) && (permissions.includes('admin:payments') || permissions.includes('write:grades'))) return true;
            // Stats : accessible si read:curriculum OU read:students OU admin:students
            if (t.name === 'get_school_stats' && (permissions.includes('read:curriculum') || permissions.includes('read:students') || permissions.includes('admin:students'))) return true;
            return permissions.includes(t.permission);
        });
        return json({ jsonrpc: '2.0', result: { tools }, id: reqId });
    }

    if (mcpReq.method === 'tools/call') {
        const toolName = mcpReq.params?.name;
        const args = mcpReq.params?.arguments || {};
        const toolDef = WORKER_MCP_TOOLS.find(t => t.name === toolName);

        if (!toolDef) {
            return json({ jsonrpc: '2.0', error: { code: -32601, message: `Outil inconnu : ${toolName}` }, id: reqId }, 404);
        }

        let isAllowed = isSuperadmin;
        if (!isAllowed) {
            if (toolName === 'list_supported_languages' || toolName === 'get_org_info' || toolName === 'list_classes') {
                isAllowed = true;
            } else if (permissions.includes('chat:dame_sky') && ['list_subjects', 'list_chapters', 'list_lessons', 'get_lesson', 'search_published_lessons', 'list_exercises', 'list_chat_messages', 'send_chat_message', 'list_forms'].includes(toolName)) {
                isAllowed = true;
            } else if (toolName === 'translate_content') {
                isAllowed = permissions.includes('translate:content') || permissions.includes('write:curriculum') || permissions.includes('write:exercises');
            } else if (toolName === 'list_students') {
                isAllowed = permissions.includes('read:students') || permissions.includes('admin:students');
            } else if (['create_student', 'update_student', 'delete_student', 'create_teacher', 'list_teachers'].includes(toolName)) {
                isAllowed = permissions.includes('admin:students') || permissions.includes('write:students');
            } else if (['record_payment', 'list_payments'].includes(toolName)) {
                isAllowed = permissions.includes('admin:payments') || permissions.includes('write:grades');
            } else if (toolName === 'get_school_stats') {
                isAllowed = permissions.includes('read:curriculum') || permissions.includes('read:students') || permissions.includes('admin:students');
            } else {
                isAllowed = permissions.includes(toolDef.permission);
            }
        }

        if (!isAllowed) {
            return json({ jsonrpc: '2.0', error: { code: -32003, message: `Permission "${toolDef.permission}" non accordée` }, id: reqId }, 403);
        }

        try {
            const result = await executeMcpToolD1(toolName, args, { agentKey, isSuperadmin, orgId, agentName, agentId: agentKey.id }, env);
            const duration = Date.now() - startTime;

            logMcpAction(env, {
                agentKeyId: agentKey.id,
                orgId,
                isSuperadmin,
                toolName,
                inputSummary: JSON.stringify(args).slice(0, 300),
                outputSummary: JSON.stringify(result).slice(0, 300),
                status: 'success',
                durationMs: duration,
            });

            return json({
                jsonrpc: '2.0',
                result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
                id: reqId,
            });
        } catch (err: any) {
            const duration = Date.now() - startTime;
            logMcpAction(env, {
                agentKeyId: agentKey.id,
                orgId,
                isSuperadmin,
                toolName,
                inputSummary: JSON.stringify(args).slice(0, 300),
                outputSummary: null,
                status: 'error',
                errorMessage: err.message || 'Erreur execution',
                durationMs: duration,
            });
            return json({ jsonrpc: '2.0', error: { code: err.code || -32000, message: err.message || 'Erreur interne' }, id: reqId }, 500);
        }
    }

    return json({ jsonrpc: '2.0', error: { code: -32601, message: `Méthode non supportée : ${mcpReq.method}` }, id: reqId }, 400);
}

// ── BROADCAST PUSH NOTIFICATION HELPER ─────────────────────────────

export { handleMcpGateway };
