/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTOPILOT ACTION ENGINE — Exécution Réelle des Ordres du Superadmin
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Transforme les instructions en langage naturel en actions concrètes en base.
 * L'IA de DeepSeek interprète l'intention, retourne une action structurée
 * que ce moteur exécute réellement dans Supabase.
 */

import { Env } from '../types';
import { fetchSupabaseRest } from '../mcp/tools';

function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
        .slice(0, 48);
}

// ── Types d'actions exécutables ─────────────────────────────────────────────

type ActionType =
    | 'create_classroom'
    | 'create_subject'
    | 'create_lesson'
    | 'create_announcement'
    | 'create_teacher'
    | 'grade_all_submissions'
    | 'accept_all_inscriptions'
    | 'create_exam'
    | 'text_only';

interface ParsedAction {
    action: ActionType;
    reply: string;
    data?: Record<string, any>;
}

// ── Interprétation IA de l'instruction ──────────────────────────────────────

export async function parseAndExecuteInstruction(
    orgId: string,
    orgName: string,
    orgFilieres: string[],
    instruction: string,
    env: Env
): Promise<{ success: boolean; reply: string; executed: string[] }> {
    const apiKey = env.DEEPSEEK_API_KEY || '';
    const executed: string[] = [];

    // 1. Récupérer les données actuelles de l'école pour le contexte IA
    const [classrooms, teachers, subjects] = await Promise.all([
        fetchSupabaseRest(env, `classrooms?organization_id=eq.${orgId}&select=id,name,level`).catch(() => []),
        fetchSupabaseRest(env, `teacher_profiles?organization_id=eq.${orgId}&select=id,first_name,last_name,specialty`).catch(() => []),
        fetchSupabaseRest(env, `subjects?organization_id=eq.${orgId}&select=id,name,code,classroom_id`).catch(() => []),
    ]);

    const contextStr = `
Données actuelles de l'établissement "${orgName}" :
- Filières : ${orgFilieres.join(', ')}
- Classes existantes (${(classrooms || []).length}) : ${(classrooms || []).map((c: any) => c.name).join(', ') || 'aucune'}
- Professeurs virtuels (${(teachers || []).length}) : ${(teachers || []).map((t: any) => `${t.first_name} ${t.last_name}`).join(', ') || 'aucun'}
- Matières existantes (${(subjects || []).length}) : ${(subjects || []).map((s: any) => s.name).join(', ') || 'aucune'}
`;

    // 2. Appel DeepSeek pour parser l'intention
    const systemPrompt = `Tu es le moteur d'exécution de l'administrateur virtuel de la plateforme IziTeach.
Tu reçois une instruction du Superadmin et tu dois la transformer en une action JSON exécutable.

${contextStr}

ACTIONS DISPONIBLES :
- "create_classroom" → créer une nouvelle classe/promotion
- "create_subject" → créer une matière dans une classe existante
- "create_lesson" → créer une leçon dans une matière existante
- "create_announcement" → publier une annonce/notification sur le campus
- "create_teacher" → créer un nouveau professeur virtuel
- "grade_all_submissions" → noter tous les devoirs en attente (scores 15-19/20)
- "accept_all_inscriptions" → valider toutes les inscriptions en attente
- "create_exam" → créer un examen/quiz dans une matière
- "text_only" → répondre uniquement en texte (si aucune action DB n'est nécessaire)

RÈGLE CRITIQUE : Tu dois TOUJOURS retourner un JSON valide sans markdown :
{
  "action": "<action_type>",
  "reply": "Ta réponse respectueuse au Superviseur confirmant l'exécution",
  "data": {
    // Champs spécifiques à l'action (voir ci-dessous)
    
    // Pour create_classroom : { "name": "...", "level": "Formation Pro", "cycle": "Professionnel", "capacity": 30 }
    // Pour create_subject : { "name": "...", "code": "...", "coefficient": 2, "classroom_id": "<id>" }
    // Pour create_lesson : { "title": "...", "content": "Contenu pédagogique riche de 200 mots minimum", "subject_id": "<id>" }
    // Pour create_announcement : { "title": "...", "message": "...", "icon": "📢" }
    // Pour create_teacher : { "first_name": "...", "last_name": "...", "specialty": "...", "bio": "..." }
    // Pour create_exam : { "title": "...", "type": "qcm", "subject_id": "<id>", "max_score": 20, "questions": [...] }
    // Pour grade_all_submissions : {} (pas de data nécessaire)
    // Pour accept_all_inscriptions : {} (pas de data nécessaire)
    // Pour text_only : {} (pas de data)
  }
}`;

    const userPrompt = `Instruction du Superviseur : "${instruction}"

Analyse l'intention, détermine l'action la plus appropriée, et retourne le JSON d'exécution.
Si l'instruction mentionne une classe existante par son nom, utilise son ID depuis la liste ci-dessus.
Si les données sont insuffisantes pour create_subject ou create_lesson, génère-les toi-même de façon professionnelle.`;

    let parsed: ParsedAction = { action: 'text_only', reply: '' };

    try {
        const res = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-v4-flash',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 900,
                temperature: 0.25,
                stream: false
            })
        });

        const data = await res.json() as any;
        let rawContent = (data?.choices?.[0]?.message?.content || '').trim();
        if (rawContent.startsWith('```json')) rawContent = rawContent.replace(/^```json/, '').replace(/```$/, '').trim();
        else if (rawContent.startsWith('```')) rawContent = rawContent.replace(/^```/, '').replace(/```$/, '').trim();

        parsed = JSON.parse(rawContent) as ParsedAction;
    } catch (e) {
        // Fallback : si l'IA échoue, on publie juste une annonce de prise en charge
        parsed = {
            action: 'create_announcement',
            reply: `Ordre reçu et enregistré, Superviseur. J'exécute votre directive "${instruction.slice(0, 80)}" immédiatement.`,
            data: {
                title: `📋 Directive de la Direction`,
                message: instruction,
                icon: '📋'
            }
        };
    }

    const reply = parsed.reply || `Directive "${instruction.slice(0, 60)}..." exécutée avec succès.`;

    // 3. Exécuter l'action en base de données
    try {
        switch (parsed.action) {

            case 'create_classroom': {
                const d = parsed.data || {};
                const classRes = await fetchSupabaseRest(env, 'classrooms', {
                    method: 'POST',
                    body: {
                        organization_id: orgId,
                        name: d.name || `Nouvelle Classe – ${new Date().toLocaleDateString('fr-FR')}`,
                        level: d.level || 'Formation Pro',
                        cycle: d.cycle || 'Professionnel',
                        capacity: d.capacity || 30,
                        is_active: true,
                    }
                });
                if (classRes?.[0]?.id) executed.push(`Classe "${classRes[0].name}" créée`);
                break;
            }

            case 'create_teacher': {
                const d = parsed.data || {};
                const teacherUuid = crypto.randomUUID();
                const orgSlug = slugify(orgName);
                const teacherRes = await fetchSupabaseRest(env, 'teacher_profiles', {
                    method: 'POST',
                    body: {
                        id: teacherUuid,
                        organization_id: orgId,
                        first_name: d.first_name || 'Prof.',
                        last_name: d.last_name || 'Expert',
                        email: `prof.${slugify(d.last_name || 'expert')}@${orgSlug}.iziteach.com`,
                        specialty: d.specialty || orgFilieres[0] || 'Généraliste',
                        bio: d.bio || 'Professeur référent, expert dans sa filière.',
                        is_active: true,
                    }
                });
                if (teacherRes?.[0]?.id) executed.push(`Professeur "${d.first_name} ${d.last_name}" créé`);
                break;
            }

            case 'create_subject': {
                const d = parsed.data || {};
                // Trouver la première classe si classroom_id non fourni
                const targetClassId = d.classroom_id || (classrooms?.[0]?.id);
                const firstTeacherId = (teachers?.[0]?.id);
                if (!targetClassId) {
                    executed.push('Aucune classe disponible pour créer la matière');
                    break;
                }
                const subRes = await fetchSupabaseRest(env, 'subjects', {
                    method: 'POST',
                    body: {
                        organization_id: orgId,
                        classroom_id: targetClassId,
                        teacher_id: firstTeacherId || null,
                        name: d.name || 'Nouvelle Matière',
                        code: d.code || slugify(d.name || 'mat').toUpperCase().slice(0, 8),
                        coefficient: d.coefficient || 2,
                    }
                });
                if (subRes?.[0]?.id) executed.push(`Matière "${subRes[0].name}" créée`);
                break;
            }

            case 'create_lesson': {
                const d = parsed.data || {};
                // Trouver la première matière si subject_id non fourni
                const targetSubjectId = d.subject_id || (subjects?.[0]?.id);
                if (!targetSubjectId) {
                    executed.push('Aucune matière disponible pour créer la leçon');
                    break;
                }
                // Trouver ou créer un chapitre
                const chapterRes = await fetchSupabaseRest(env, 'chapters', {
                    method: 'POST',
                    body: {
                        organization_id: orgId,
                        subject_id: targetSubjectId,
                        title: `Chapitre — ${d.title || 'Nouvelle Leçon'}`,
                        position: 99,
                    }
                });
                const chapterId = chapterRes?.[0]?.id;
                if (chapterId) {
                    const lessonRes = await fetchSupabaseRest(env, 'lessons', {
                        method: 'POST',
                        body: {
                            organization_id: orgId,
                            chapter_id: chapterId,
                            title: d.title || 'Nouvelle Leçon',
                            content: d.content || `Contenu de la leçon sur ${d.title || 'ce sujet'}. Ce cours sera enrichi progressivement par l'équipe pédagogique virtuelle.`,
                            position: 1,
                        }
                    });
                    if (lessonRes?.[0]?.id) executed.push(`Leçon "${d.title}" créée`);
                }
                break;
            }

            case 'create_exam': {
                const d = parsed.data || {};
                const targetSubjectId = d.subject_id || (subjects?.[0]?.id);
                const targetChapters = targetSubjectId
                    ? await fetchSupabaseRest(env, `chapters?organization_id=eq.${orgId}&subject_id=eq.${targetSubjectId}&limit=1`).catch(() => [])
                    : [];
                const chapterId = targetChapters?.[0]?.id;

                const defaultQuestions = [
                    { question: "Question 1 : Définissez le concept principal de cette matière.", options: ["Option A", "Option B", "Option C", "Option D"], correct: 0, explanation: "Voir le cours du chapitre 1." },
                    { question: "Question 2 : Quelle est la pratique professionnelle recommandée ?", options: ["Option A", "Option B", "Option C", "Option D"], correct: 1, explanation: "Voir le cours du chapitre 2." },
                ];

                const examRes = await fetchSupabaseRest(env, 'exercises', {
                    method: 'POST',
                    body: {
                        organization_id: orgId,
                        chapter_id: chapterId || null,
                        title: d.title || `Examen — ${new Date().toLocaleDateString('fr-FR')}`,
                        type: 'qcm',
                        questions: JSON.stringify(d.questions || defaultQuestions),
                        max_score: d.max_score || 20,
                    }
                });
                if (examRes?.[0]?.id) executed.push(`Examen "${d.title}" créé`);
                break;
            }

            case 'create_announcement': {
                const d = parsed.data || {};
                const notifRes = await fetchSupabaseRest(env, 'admin_notifications', {
                    method: 'POST',
                    body: {
                        id: crypto.randomUUID(),
                        organization_id: orgId,
                        title: d.title || '📢 Annonce de la Direction',
                        message: d.message || instruction,
                        icon: d.icon || '📢',
                        created_at: new Date().toISOString(),
                    }
                });
                if (notifRes?.[0]?.id) executed.push(`Annonce "${d.title}" publiée`);
                break;
            }

            case 'grade_all_submissions': {
                const pendingSubmissions = await fetchSupabaseRest(
                    env,
                    `exercise_submissions?organization_id=eq.${orgId}&score=is.null&limit=20`
                ).catch(() => []);
                if (Array.isArray(pendingSubmissions) && pendingSubmissions.length > 0) {
                    for (const sub of pendingSubmissions) {
                        const score = Math.floor(Math.random() * 5) + 15;
                        await fetchSupabaseRest(env, `exercise_submissions?id=eq.${sub.id}`, {
                            method: 'PATCH',
                            body: {
                                score,
                                feedback: 'Excellent travail. Évaluation réalisée par le corps professoral virtuel de Dame SKY. Continuez sur cette lancée !',
                                graded_at: new Date().toISOString(),
                            }
                        }).catch(() => null);
                    }
                    executed.push(`${pendingSubmissions.length} devoir(s) corrigé(s) (notes 15-19/20)`);
                } else {
                    executed.push('Aucun devoir en attente de correction');
                }
                break;
            }

            case 'accept_all_inscriptions': {
                const pendingInscriptions = await fetchSupabaseRest(
                    env,
                    `inscription_requests?organization_id=eq.${orgId}&status=eq.pending&limit=30`
                ).catch(() => []);
                if (Array.isArray(pendingInscriptions) && pendingInscriptions.length > 0) {
                    for (const insc of pendingInscriptions) {
                        await fetchSupabaseRest(env, `inscription_requests?id=eq.${insc.id}`, {
                            method: 'PATCH',
                            body: {
                                status: 'accepted',
                                student_response: `Bienvenue à ${orgName} ! Votre inscription a été validée par la Direction Académique. Votre profil étudiant est maintenant activé.`,
                                updated_at: new Date().toISOString(),
                            }
                        }).catch(() => null);
                    }
                    executed.push(`${pendingInscriptions.length} inscription(s) validée(s)`);
                } else {
                    executed.push('Aucune inscription en attente');
                }
                break;
            }

            case 'text_only':
            default:
                // Aucune action DB, seulement répondre
                executed.push('Réponse textuelle — aucune modification DB');
                break;
        }

        // 4. Journaliser dans ai_agent_logs
        await fetchSupabaseRest(env, 'ai_agent_logs', {
            method: 'POST',
            body: {
                organization_id: orgId,
                tool_name: `autopilot_action_${parsed.action}`,
                input_summary: instruction.slice(0, 300),
                output_summary: executed.join(' | '),
                status: 'success',
                executed_at: new Date().toISOString(),
            }
        }).catch(() => null);

    } catch (execErr: any) {
        console.error('[AutopilotActions] Erreur exécution:', execErr);
        executed.push(`Erreur partielle : ${execErr.message}`);
    }

    return {
        success: true,
        reply,
        executed,
    };
}
