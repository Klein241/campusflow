/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTONOMOUS AGENT ENGINE — IziTeach / CampusFlow (Event-Driven Autonomous AI)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Ce moteur transforme IziTeach en plateforme 100% autonome :
 * 1. Reçoit les événements de la BDD (INSERT/UPDATE sur devoirs, présences, cours, bugs, etc.)
 * 2. Récupère le contexte complet (étudiant, classe, matière, devoirs)
 * 3. Invoque le LLM (Claude, MANUS, GPT-4o ou LLaMA 3.3 70B Workers AI)
 * 4. Exécute automatiquement les outils MCP appropriés (notation, alertes, livres, etc.)
 * 5. Notifie l'administration et journalise chaque décision dans ai_agent_logs
 */

import { Env } from '../types';
import { executeMcpToolD1, fetchSupabaseRest } from '../mcp/tools';

export interface AutonomousEvent {
    type?: string;          // 'INSERT' | 'UPDATE' | 'DELETE'
    table?: string;         // 'submissions' | 'attendance' | 'chapters' | 'bug_reports' | 'sky_point_requests' | ...
    schema?: string;        // 'public'
    record?: Record<string, any>;
    old_record?: Record<string, any>;
    event?: string;
    data?: any;
    organization_id?: string;
}

export interface AutonomousExecutionResult {
    success: boolean;
    event_table: string;
    event_type: string;
    thought?: string;
    actions_executed: Array<{ tool: string; args: any; result: any }>;
    final_report: string;
    duration_ms: number;
    error?: string;
}

// ── Liste des Outils MCP Autonomes disponibles pour l'IA ─────────────────────
const AUTONOMOUS_TOOLS_DOCS = `
OUTILS MCP EXÉCUTABLES PAR L'IA AUTONOME :

1. create_grade : Enregistrer une note d'évaluation et un feedback pédagogique
   Args: { student_id, subject_id, score, max_score, evaluation_title, period, feedback, org_id }

2. compile_curriculum_to_book : Compiler tous les chapitres d'une matière en un livre structuré
   Args: { subject_id, title, description, include_exercises, publish_to_library, is_public, org_id }

3. publish_library_item : Publier un document, guide ou corrigé dans la Bibliothèque Numérique
   Args: { title, description, category, content, file_url, file_type, subject_id, classroom_id, org_id }

4. create_schedule_slot : Ajouter un créneau dans l'emploi du temps
   Args: { classroom_id, subject_id, day_of_week (1-7), start_time ("08:00"), end_time ("10:00"), room, teacher_id, org_id }

5. update_bug_status : Diagnostiquer et mettre à jour le statut d'un bug
   Args: { bug_id, status ("in_progress"|"resolved"), admin_note }

6. reply_support_message : Répondre automatiquement à une demande de support utilisateur
   Args: { request_id, reply_message }

7. credit_sky_points : Créditer des Sky Points après validation
   Args: { target_type ("org"|"user"), target_id, points, note }

8. create_lesson : Créer une leçon enrichie suite à une demande
   Args: { chapter_id, title, content, estimated_minutes, org_id }

9. create_exercise : Créer un exercice d'auto-évaluation
   Args: { chapter_id, lesson_id, title, type, questions, max_score, duration_minutes, org_id }
`;

/**
 * Traite un événement de base de données et prend des décisions autonomes via LLM + MCP
 */
export async function processAutonomousEvent(
    eventPayload: any,
    env: Env
): Promise<AutonomousExecutionResult> {
    const startTime = Date.now();

    // Normaliser l'événement
    const eventType = (eventPayload.type || eventPayload.event || 'INSERT').toUpperCase();
    const eventTable = eventPayload.table || (eventPayload.schema ? eventPayload.table : 'unknown');
    const record = eventPayload.record || eventPayload.new || eventPayload.data || eventPayload;
    const orgId = record?.organization_id || eventPayload.organization_id || null;

    console.log(`[AutonomousAgent] ⚡ Début du traitement événement : ${eventType} sur ${eventTable}`);

    // ── 1. Enrichir le contexte selon la table ────────────────────────────────
    let enrichedContext = '';
    try {
        if (eventTable === 'submissions' || eventTable === 'exam_submissions') {
            const exerciseId = record.exercise_id || record.exam_id;
            if (exerciseId) {
                const exData = await fetchSupabaseRest(env, `exercises?id=eq.${encodeURIComponent(exerciseId)}&select=title,questions,max_score,lesson_id,chapters(title,subjects(name))`);
                if (exData && exData.length > 0) {
                    enrichedContext += `\nDÉTAILS DE L'EXERCICE : ${JSON.stringify(exData[0])}`;
                }
            }
            if (record.student_id) {
                const studentData = await fetchSupabaseRest(env, `profiles?id=eq.${encodeURIComponent(record.student_id)}&select=id,first_name,last_name,email`);
                if (studentData && studentData.length > 0) {
                    enrichedContext += `\nÉLÈVE CONCERNÉ : ${studentData[0].first_name} ${studentData[0].last_name} (${studentData[0].email})`;
                }
            }
        } else if (eventTable === 'attendance' && (record.status === 'absent' || record.state === 'absent')) {
            if (record.student_id) {
                const pastAbsences = await fetchSupabaseRest(env, `attendance?student_id=eq.${encodeURIComponent(record.student_id)}&status=eq.absent&select=id,date,created_at`);
                enrichedContext += `\nHISTORIQUE ABSENCES DE L'ÉLÈVE : ${pastAbsences?.length || 1} absence(s) enregistrée(s).`;
            }
        } else if (eventTable === 'chapters' || eventTable === 'subjects') {
            const subjectId = record.subject_id || record.id;
            if (subjectId) {
                const allChapters = await fetchSupabaseRest(env, `chapters?subject_id=eq.${encodeURIComponent(subjectId)}&select=id,title,position`);
                enrichedContext += `\nCHAPITRES ACTUELS DU COURS : ${JSON.stringify(allChapters || [])}`;
            }
        }
    } catch (err) {
        console.warn('[AutonomousAgent] Erreur enrichissement contexte:', err);
    }

    // ── 2. Construire le Prompt Système Autonome ──────────────────────────────
    const systemPrompt = `Tu es l'Agent IA Autonome Universel d'IziTeach / CampusFlow (Dame SKY Autonomous Engine).
Un événement vient de se produire en direct dans la plateforme éducative.

MISSION :
1. Analyser l'événement et son contexte.
2. Si une action pédagogique, administrative ou corrective est requise, choisis et configure le ou les outils MCP à exécuter.
   - Si un devoir/examen est soumis : évalue la réponse, calcule une note juste et appelle "create_grade".
   - Si une matière a plusieurs chapitres et nécessite un livre : appelle "compile_curriculum_to_book".
   - Si un bug est rapporté : analyse-le et appelle "update_bug_status".
   - Si un créneau doit être planifié : appelle "create_schedule_slot".
   - Si aucune action concrète n'est nécessaire (simple log informatif) : n'invoque aucun outil.
3. Rédige un compte-rendu clair et professionnel pour le Directeur de l'établissement.

${AUTONOMOUS_TOOLS_DOCS}

FORMAT DE RÉPONSE OBLIGATOIRE (STRICT JSON) :
Tu dois répondre UNIQUEMENT avec un objet JSON valide suivant exactement cette structure :
{
  "thought": "Analyse de la situation et justification des décisions...",
  "actions": [
    {
      "tool": "nom_du_tool",
      "args": { ... arguments du tool ... }
    }
  ],
  "report": "Rapport clair résumant les actions prises pour l'administration."
}`;

    const userPrompt = `ÉVÉNEMENT DÉCLENCHEUR :
- Type : ${eventType}
- Table : ${eventTable}
- Données de l'événement : ${JSON.stringify(record, null, 2)}
- Contexte additionnel : ${enrichedContext || 'Aucun'}
- Organisation ID : ${orgId || 'Non spécifié'}

Décide des actions MCP autonomes à exécuter et renvoie le JSON.`;

    // ── 3. Appeler le LLM ───────────────────────────────────────────────────
    let llmResponseText = '';
    try {
        // A. Vérifier si un agent externe Superadmin est configuré
        const superadminAgent = await fetchSupabaseRest(env, 'dame_sky_config?select=external_api_url,external_api_key_enc,external_provider,external_model&limit=1');
        const config = superadminAgent?.[0];

        if (config?.external_api_url && config?.external_api_key_enc) {
            console.log(`[AutonomousAgent] Appel LLM Externe (${config.external_provider || 'OpenAI'})...`);
            llmResponseText = await callExternalAgentRaw(config, [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ]);
        } else {
            // B. Fallback sur Cloudflare Workers AI (LLaMA 3.3 70B / DeepSeek R1)
            console.log('[AutonomousAgent] Appel Cloudflare Workers AI (LLaMA 3.3 70B)...');
            llmResponseText = await callWorkersAiAutonomous(env, systemPrompt, userPrompt);
        }
    } catch (llmErr: any) {
        console.error('[AutonomousAgent] Erreur LLM:', llmErr);
        return {
            success: false,
            event_table: eventTable,
            event_type: eventType,
            actions_executed: [],
            final_report: 'Erreur lors de la consultation du modèle IA : ' + llmErr.message,
            duration_ms: Date.now() - startTime,
            error: llmErr.message,
        };
    }

    // ── 4. Parser la Décision JSON ──────────────────────────────────────────
    let parsedDecision: { thought?: string; actions?: Array<{ tool: string; args: any }>; report?: string } = {};
    try {
        let cleanJson = llmResponseText.trim();
        if (cleanJson.startsWith('```json')) cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
        else if (cleanJson.startsWith('```')) cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '').trim();

        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            parsedDecision = JSON.parse(jsonMatch[0]);
        } else {
            parsedDecision = { report: llmResponseText, actions: [] };
        }
    } catch (parseErr) {
        console.warn('[AutonomousAgent] JSON parse fallback:', parseErr);
        parsedDecision = { report: llmResponseText, actions: [] };
    }

    // ── 5. Exécuter les Actions MCP Décidées ────────────────────────────────
    const actionsExecuted: Array<{ tool: string; args: any; result: any }> = [];
    const agentCtx = {
        agentKey: null,
        isSuperadmin: true,
        orgId,
        agentName: 'Dame SKY Autonomous',
        agentId: 'autonomous_engine',
    };

    if (Array.isArray(parsedDecision.actions) && parsedDecision.actions.length > 0) {
        for (const action of parsedDecision.actions) {
            if (!action.tool) continue;
            try {
                console.log(`[AutonomousAgent] 🚀 Exécution MCP Tool : ${action.tool}`, JSON.stringify(action.args).slice(0, 150));
                const res = await executeMcpToolD1(action.tool, action.args || {}, agentCtx, env);
                actionsExecuted.push({
                    tool: action.tool,
                    args: action.args,
                    result: res,
                });
            } catch (toolExecErr: any) {
                console.error(`[AutonomousAgent] Erreur exécution outil ${action.tool}:`, toolExecErr);
                actionsExecuted.push({
                    tool: action.tool,
                    args: action.args,
                    result: { error: toolExecErr?.message || 'Échec de l\'outil' },
                });
            }
        }
    }

    const durationMs = Date.now() - startTime;
    const finalReport = parsedDecision.report || (actionsExecuted.length > 0 ? `⚡ ${actionsExecuted.length} action(s) MCP exécutée(s) avec succès.` : 'Événement analysé, aucune intervention requise.');

    // ── 6. Journaliser dans ai_agent_logs & Notifier l'Admin ─────────────────
    const nowIso = new Date().toISOString();
    try {
        await fetchSupabaseRest(env, 'ai_agent_logs', {
            method: 'POST',
            body: {
                organization_id: orgId,
                tool_name: `autonomous:${eventTable}:${eventType}`,
                input_summary: JSON.stringify({ record, enrichedContext }).slice(0, 500),
                output_summary: finalReport.slice(0, 500),
                status: 'success',
                duration_ms: durationMs,
                executed_at: nowIso,
            }
        });

        // Envoyer une notification in-app au dashboard de l'école
        if (orgId && actionsExecuted.length > 0) {
            const notifId = crypto.randomUUID();
            await fetchSupabaseRest(env, 'admin_notifications', {
                method: 'POST',
                body: {
                    id: notifId,
                    organization_id: orgId,
                    title: `🤖 Action IA Autonome (${eventTable})`,
                    message: finalReport,
                    icon: '⚡',
                    created_at: nowIso,
                }
            });
        }
    } catch (logErr) {
        console.warn('[AutonomousAgent] Erreur enregistrement logs/notifs:', logErr);
    }

    return {
        success: true,
        event_table: eventTable,
        event_type: eventType,
        thought: parsedDecision.thought,
        actions_executed: actionsExecuted,
        final_report: finalReport,
        duration_ms: durationMs,
    };
}

// ── Helpers d'Appel LLM ───────────────────────────────────────────────────────

async function callExternalAgentRaw(config: any, messages: { role: string; content: string }[]): Promise<string> {
    const provider = config.external_provider?.toLowerCase() || 'openai';
    const model = config.external_model || (provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-4o');

    if (provider === 'anthropic') {
        const systemMsg = messages.find(m => m.role === 'system');
        const userMessages = messages.filter(m => m.role !== 'system');
        const res = await fetch(config.external_api_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.external_api_key_enc,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model,
                max_tokens: 2000,
                system: systemMsg?.content || '',
                messages: userMessages.map(m => ({ role: m.role, content: m.content })),
            }),
        });
        const data = await res.json() as any;
        return data?.content?.[0]?.text || '';
    }

    // OpenAI / MANUS / Groq / Mistral
    const res = await fetch(config.external_api_url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.external_api_key_enc}`,
        },
        body: JSON.stringify({
            model,
            max_tokens: 2000,
            temperature: 0.3,
            messages,
        }),
    });
    const data = await res.json() as any;
    return data?.choices?.[0]?.message?.content || '';
}

async function callWorkersAiAutonomous(env: Env, systemPrompt: string, userPrompt: string): Promise<string> {
    const ai = (env as any).AI;
    if (!ai) {
        throw new Error('Cloudflare Workers AI Binding (env.AI) non disponible.');
    }
    const response = await ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.2,
    });
    return response?.response || '';
}
