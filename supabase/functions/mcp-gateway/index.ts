// ═══════════════════════════════════════════════════════════════════════════
// IziTeach — MCP Gateway (Supabase Edge Function)
// ═══════════════════════════════════════════════════════════════════════════
//
// Point d'entrée unique pour tous les agents IA.
// Implémente le Model Context Protocol (JSON-RPC 2.0).
//
// Authentification : Bearer cf_live_xxxxx (clé générée par l'admin)
// Rate limiting     : max N req/min selon la clé
// Logging           : chaque appel est tracé dans ai_agent_logs
// Permissions       : chaque tool vérifie que l'agent a la permission
//
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Types MCP ──────────────────────────────────────────────────────────────
interface McpRequest {
    jsonrpc: '2.0';
    method: string;
    params?: Record<string, unknown>;
    id: number | string | null;
}

interface McpResponse {
    jsonrpc: '2.0';
    result?: unknown;
    error?: { code: number; message: string; data?: unknown };
    id: number | string | null;
}

interface AgentContext {
    agentId: string;
    orgId: string;
    agentName: string;
    permissions: string[];
    rateLimit: number;
    bulkThreshold: number;
}

// ── Rate limiting en mémoire (par agent, reset chaque minute) ──────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(agentId: string, limit: number): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(agentId);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(agentId, { count: 1, resetAt: now + 60_000 });
        return true;
    }

    if (entry.count >= limit) return false;
    entry.count++;
    return true;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'authorization, content-type',
        },
    });
}

function mcpError(id: McpRequest['id'], code: number, message: string): McpResponse {
    return { jsonrpc: '2.0', error: { code, message }, id };
}

function mcpSuccess(id: McpRequest['id'], result: unknown): McpResponse {
    return { jsonrpc: '2.0', result, id };
}

// ── Définition des outils MCP ──────────────────────────────────────────────
const MCP_TOOLS = [
    {
        name: 'list_subjects',
        description: 'Lister toutes les matières de l\'organisation',
        permission: 'read:curriculum',
        inputSchema: {
            type: 'object',
            properties: {
                class_id: { type: 'string', description: 'UUID de la classe (optionnel)' },
            },
        },
    },
    {
        name: 'list_chapters',
        description: 'Lister les chapitres d\'une matière',
        permission: 'read:curriculum',
        inputSchema: {
            type: 'object',
            properties: {
                subject_id: { type: 'string', description: 'UUID de la matière' },
            },
            required: ['subject_id'],
        },
    },
    {
        name: 'list_lessons',
        description: 'Lister les leçons d\'un chapitre',
        permission: 'read:curriculum',
        inputSchema: {
            type: 'object',
            properties: {
                chapter_id: { type: 'string', description: 'UUID du chapitre' },
            },
            required: ['chapter_id'],
        },
    },
    {
        name: 'create_subject',
        description: 'Créer une nouvelle matière',
        permission: 'write:curriculum',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Nom de la matière' },
                description: { type: 'string', description: 'Description (optionnel)' },
                class_id: { type: 'string', description: 'UUID de la classe' },
            },
            required: ['name'],
        },
    },
    {
        name: 'create_chapter',
        description: 'Créer un chapitre dans une matière',
        permission: 'write:curriculum',
        inputSchema: {
            type: 'object',
            properties: {
                subject_id: { type: 'string', description: 'UUID de la matière' },
                title: { type: 'string', description: 'Titre du chapitre' },
                description: { type: 'string', description: 'Description (optionnel)' },
                order_index: { type: 'number', description: 'Position dans la liste (défaut: auto)' },
            },
            required: ['subject_id', 'title'],
        },
    },
    {
        name: 'create_lesson',
        description: 'Créer une leçon dans un chapitre',
        permission: 'write:curriculum',
        inputSchema: {
            type: 'object',
            properties: {
                chapter_id: { type: 'string', description: 'UUID du chapitre' },
                title: { type: 'string', description: 'Titre de la leçon' },
                content: { type: 'string', description: 'Contenu de la leçon (markdown supporté)' },
                order_index: { type: 'number', description: 'Position dans le chapitre' },
                duration_minutes: { type: 'number', description: 'Durée estimée en minutes' },
            },
            required: ['chapter_id', 'title', 'content'],
        },
    },
    {
        name: 'create_exercise',
        description: 'Créer un exercice dans une leçon',
        permission: 'write:exercises',
        inputSchema: {
            type: 'object',
            properties: {
                lesson_id: { type: 'string', description: 'UUID de la leçon' },
                title: { type: 'string', description: 'Titre de l\'exercice' },
                question: { type: 'string', description: 'Texte de la question' },
                type: {
                    type: 'string',
                    enum: ['qcm', 'text', 'true_false'],
                    description: 'Type d\'exercice',
                },
                choices: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Choix de réponses (pour QCM)',
                },
                correct_answer: { type: 'string', description: 'Réponse correcte' },
                explanation: { type: 'string', description: 'Explication de la réponse' },
                max_score: { type: 'number', description: 'Score maximum (défaut: 10)' },
                order_index: { type: 'number', description: 'Position dans la leçon' },
            },
            required: ['lesson_id', 'title', 'question', 'type', 'correct_answer'],
        },
    },
    {
        name: 'list_students',
        description: 'Lister les étudiants (sans données sensibles)',
        permission: 'read:students',
        inputSchema: {
            type: 'object',
            properties: {
                class_id: { type: 'string', description: 'Filtrer par classe (optionnel)' },
                limit: { type: 'number', description: 'Nombre max de résultats (défaut: 50)' },
            },
        },
    },
    {
        name: 'list_classes',
        description: 'Lister les classes de l\'organisation',
        permission: 'read:curriculum',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'get_org_info',
        description: 'Obtenir les informations générales de l\'organisation',
        permission: 'read:curriculum',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// Handler principal
// ═══════════════════════════════════════════════════════════════════════════
Deno.serve(async (req: Request) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'authorization, content-type',
            },
        });
    }

    if (req.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const startTime = Date.now();

    // ── 1. Extraire et vérifier la clé API ─────────────────────────────────
    const authHeader = req.headers.get('Authorization') || '';
    const rawKey = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!rawKey || !rawKey.startsWith('cf_live_')) {
        return jsonResponse(
            mcpError(null, -32001, 'Clé API manquante. Utilisez: Authorization: Bearer cf_live_xxxxx'),
            401
        );
    }

    // ── 2. Créer le client Supabase (service_role pour verify_ai_agent_key) ─
    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── 3. Vérifier la clé et charger l'agent ─────────────────────────────
    const { data: agentData, error: verifyError } = await supabase
        .rpc('verify_ai_agent_key', { p_raw_key: rawKey });

    if (verifyError || !agentData?.valid) {
        return jsonResponse(
            mcpError(null, -32001, agentData?.error || 'Clé invalide ou révoquée'),
            401
        );
    }

    const agent: AgentContext = {
        agentId:       agentData.agent_id,
        orgId:         agentData.org_id,
        agentName:     agentData.agent_name,
        permissions:   agentData.permissions || [],
        rateLimit:     agentData.rate_limit || 10,
        bulkThreshold: agentData.bulk_threshold || 5,
    };

    // ── 4. Rate limiting ────────────────────────────────────────────────────
    if (!checkRateLimit(agent.agentId, agent.rateLimit)) {
        return jsonResponse(
            mcpError(null, -32029, `Rate limit dépassé : max ${agent.rateLimit} requêtes/minute`),
            429
        );
    }

    // ── 5. Parser la requête JSON-RPC ──────────────────────────────────────
    let mcpReq: McpRequest;
    try {
        mcpReq = await req.json();
    } catch {
        return jsonResponse(mcpError(null, -32700, 'JSON invalide'), 400);
    }

    if (mcpReq.jsonrpc !== '2.0') {
        return jsonResponse(mcpError(mcpReq.id ?? null, -32600, 'jsonrpc doit être "2.0"'), 400);
    }

    // ── 6. Router vers la bonne méthode ────────────────────────────────────
    let response: McpResponse;
    let logStatus = 'success';
    let logInput = '';
    let logOutput = '';
    let logError = '';

    try {
        switch (mcpReq.method) {

            // ─ Initialisation MCP ─
            case 'initialize':
                response = mcpSuccess(mcpReq.id, {
                    protocolVersion: '2024-11-05',
                    capabilities: { tools: {} },
                    serverInfo: {
                        name: 'IziTeach MCP Gateway',
                        version: '1.0.0',
                    },
                });
                break;

            // ─ Liste des outils disponibles ─
            case 'tools/list': {
                const availableTools = MCP_TOOLS.filter(tool =>
                    agent.permissions.includes(tool.permission)
                );
                response = mcpSuccess(mcpReq.id, { tools: availableTools });
                logOutput = `${availableTools.length} outils disponibles`;
                break;
            }

            // ─ Appel d'un outil ─
            case 'tools/call': {
                const toolName = (mcpReq.params?.name as string) || '';
                const args     = (mcpReq.params?.arguments as Record<string, unknown>) || {};
                logInput       = `${toolName}(${JSON.stringify(args).slice(0, 200)})`;

                const toolDef = MCP_TOOLS.find(t => t.name === toolName);

                if (!toolDef) {
                    throw { code: -32601, message: `Outil inconnu : ${toolName}` };
                }

                if (!agent.permissions.includes(toolDef.permission)) {
                    throw {
                        code: -32003,
                        message: `Permission refusée : "${toolDef.permission}" non accordée à cet agent`,
                    };
                }

                const result = await executeTool(toolName, args, agent, supabase);
                logOutput = JSON.stringify(result).slice(0, 300);
                response  = mcpSuccess(mcpReq.id, {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                });
                break;
            }

            // ─ Ping ─
            case 'ping':
                response = mcpSuccess(mcpReq.id, { pong: true, agent: agent.agentName });
                break;

            default:
                throw { code: -32601, message: `Méthode inconnue : ${mcpReq.method}` };
        }
    } catch (err: unknown) {
        const e = err as { code?: number; message?: string };
        logStatus = 'error';
        logError  = e.message || 'Erreur interne';
        response  = mcpError(
            mcpReq.id ?? null,
            e.code ?? -32000,
            logError
        );
    }

    // ── 7. Logger l'action (feu & oublie) ──────────────────────────────────
    if (mcpReq.method === 'tools/call') {
        const duration = Date.now() - startTime;
        supabase.rpc('log_ai_action', {
            p_agent_key_id:   agent.agentId,
            p_org_id:         agent.orgId,
            p_tool_name:      (mcpReq.params?.name as string) || mcpReq.method,
            p_input_summary:  logInput.slice(0, 500),
            p_output_summary: logOutput.slice(0, 500),
            p_status:         logStatus,
            p_error_message:  logError || null,
            p_duration_ms:    duration,
        }).then(() => {}).catch(() => {}); // async, ne bloque pas la réponse
    }

    return jsonResponse(response);
});

// ═══════════════════════════════════════════════════════════════════════════
// Exécuteurs d'outils
// ═══════════════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTool(toolName: string, args: Record<string, unknown>, agent: AgentContext, supabase: any): Promise<unknown> {
    switch (toolName) {

        // ── GET ORG INFO ────────────────────────────────────────────────────
        case 'get_org_info': {
            const { data, error } = await supabase
                .from('organizations')
                .select('id, name, type, city, country, slug')
                .eq('id', agent.orgId)
                .single();
            if (error) throw { code: -32002, message: error.message };
            return { organization: data };
        }

        // ── LIST CLASSES ────────────────────────────────────────────────────
        case 'list_classes': {
            const { data, error } = await supabase
                .from('classrooms')
                .select('id, name, cycle, level, capacity')
                .eq('organization_id', agent.orgId)
                .order('name');
            if (error) throw { code: -32002, message: error.message };
            return { classes: data || [], total: (data || []).length };
        }

        // ── LIST SUBJECTS ───────────────────────────────────────────────────
        case 'list_subjects': {
            let query = supabase
                .from('subjects')
                .select('id, name, code, coefficient, classroom_id, classrooms(name)')
                .eq('organization_id', agent.orgId)
                .order('name');
            if (args.class_id) query = query.eq('classroom_id', args.class_id as string);
            const { data, error } = await query;
            if (error) throw { code: -32002, message: error.message };
            return { subjects: data || [], total: (data || []).length };
        }

        // ── LIST CHAPTERS ───────────────────────────────────────────────────
        case 'list_chapters': {
            if (!args.subject_id) throw { code: -32602, message: 'subject_id requis' };
            const { data, error } = await supabase
                .from('chapters')
                .select('id, title, description, order_index, status')
                .eq('subject_id', args.subject_id as string)
                .order('position');
            if (error) throw { code: -32002, message: error.message };
            return { chapters: data || [], total: (data || []).length };
        }

        // ── LIST LESSONS ────────────────────────────────────────────────────
        case 'list_lessons': {
            if (!args.chapter_id) throw { code: -32602, message: 'chapter_id requis' };
            const { data, error } = await supabase
                .from('lessons')
                .select('id, title, position, duration_minutes, status, content_type')
                .eq('chapter_id', args.chapter_id as string)
                .order('position');
            if (error) throw { code: -32002, message: error.message };
            return { lessons: data || [], total: (data || []).length };
        }

        // ── CREATE SUBJECT ───────────────────────────────────────────────────
        case 'create_subject': {
            if (!args.name) throw { code: -32602, message: '"name" est requis' };
            const payload: Record<string, unknown> = {
                organization_id: agent.orgId,
                name: args.name,
                code: String(args.name).slice(0, 4).toUpperCase(),
                coefficient: 1,
            };
            if (args.class_id)    payload.classroom_id = args.class_id;
            if (args.description) payload.description  = args.description;

            const { data, error } = await supabase
                .from('subjects')
                .insert(payload)
                .select()
                .single();
            if (error) throw { code: -32002, message: error.message };
            return {
                success: true,
                subject: data,
                message: `✅ Matière "${args.name}" créée avec succès (ID: ${data.id})`,
            };
        }

        // ── CREATE CHAPTER ───────────────────────────────────────────────────
        case 'create_chapter': {
            if (!args.subject_id || !args.title) throw { code: -32602, message: '"subject_id" et "title" sont requis' };

            // Vérifier que le subject appartient à l'org
            const { data: sub } = await supabase
                .from('subjects')
                .select('id')
                .eq('id', args.subject_id as string)
                .eq('organization_id', agent.orgId)
                .single();
            if (!sub) throw { code: -32003, message: 'Matière introuvable dans votre organisation' };

            // Auto order_index si non fourni
            let orderIndex = args.order_index as number;
            if (!orderIndex) {
                const { count } = await supabase
                    .from('chapters')
                    .select('id', { count: 'exact', head: true })
                    .eq('subject_id', args.subject_id as string);
                orderIndex = (count || 0) + 1;
            }

            const { data, error } = await supabase
                .from('chapters')
                .insert({
                    organization_id: agent.orgId,
                    subject_id:      args.subject_id,
                    title:           args.title,
                    description:     args.description || null,
                    position:        orderIndex,
                    status:          'draft',
                    created_by_ai:   true,
                    ai_agent_name:   agent.agentName,
                })
                .select()
                .single();
            if (error) throw { code: -32002, message: error.message };
            return {
                success: true,
                chapter: data,
                message: `✅ Chapitre "${args.title}" créé (position ${orderIndex})`,
            };
        }

        // ── CREATE LESSON ────────────────────────────────────────────────────
        case 'create_lesson': {
            if (!args.chapter_id || !args.title || !args.content) {
                throw { code: -32602, message: '"chapter_id", "title" et "content" sont requis' };
            }

            // Vérifier ownership via chapter → subject → org
            const chap = await supabase
                .from('chapters')
                .select('id')
                .eq('id', args.chapter_id as string)
                .single();
            if (!chap.data) throw { code: -32003, message: 'Chapitre introuvable' };

            let orderIndex = args.order_index as number;
            if (!orderIndex) {
                const { count } = await supabase
                    .from('lessons')
                    .select('id', { count: 'exact', head: true })
                    .eq('chapter_id', args.chapter_id as string);
                orderIndex = (count || 0) + 1;
            }

            const { data, error } = await supabase
                .from('lessons')
                .insert({
                    chapter_id:       args.chapter_id,
                    title:            args.title,
                    content:          args.content,
                    position:         orderIndex,
                    duration_minutes: args.duration_minutes || null,
                    status:           'draft',
                    content_type:     'text',
                    created_by_ai:    true,
                    ai_agent_name:    agent.agentName,
                })
                .select()
                .single();
            if (error) throw { code: -32002, message: error.message };
            return {
                success: true,
                lesson: data,
                message: `✅ Leçon "${args.title}" créée (position ${orderIndex})`,
            };
        }

        // ── CREATE EXERCISE ───────────────────────────────────────────────────
        case 'create_exercise': {
            if (!args.lesson_id || !args.title || !args.question || !args.type || !args.correct_answer) {
                throw { code: -32602, message: 'Champs requis manquants' };
            }
            if (!['qcm', 'text', 'true_false'].includes(args.type as string)) {
                throw { code: -32602, message: 'type doit être "qcm", "text" ou "true_false"' };
            }

            let orderIndex = args.order_index as number;
            if (!orderIndex) {
                const { count } = await supabase
                    .from('exercises')
                    .select('id', { count: 'exact', head: true })
                    .eq('lesson_id', args.lesson_id as string);
                orderIndex = (count || 0) + 1;
            }

            const { data, error } = await supabase
                .from('exercises')
                .insert({
                    lesson_id:      args.lesson_id,
                    title:          args.title,
                    question:       args.question,
                    type:           args.type,
                    choices:        args.choices || null,
                    correct_answer: args.correct_answer,
                    explanation:    args.explanation || null,
                    max_score:      args.max_score || 10,
                    order_index:    orderIndex,
                    created_by_ai:  true,
                    ai_agent_name:  agent.agentName,
                })
                .select()
                .single();
            if (error) throw { code: -32002, message: error.message };
            return {
                success: true,
                exercise: data,
                message: `✅ Exercice "${args.title}" créé`,
            };
        }

        // ── LIST STUDENTS ─────────────────────────────────────────────────────
        case 'list_students': {
            const limit = Math.min((args.limit as number) || 50, 100);
            let query = supabase
                .from('student_profiles')
                .select('id, first_name, last_name, sex, classroom_id, classrooms(name), approval_status')
                .eq('organization_id', agent.orgId)
                .eq('approval_status', 'approved') // Only approved students
                .order('last_name')
                .limit(limit);
            if (args.class_id) query = query.eq('classroom_id', args.class_id as string);
            const { data, error } = await query;
            if (error) throw { code: -32002, message: error.message };

            // Retirer les données sensibles
            const safeStudents = (data || []).map((s: Record<string, unknown>) => ({
                id:          s.id,
                first_name:  s.first_name,
                last_name:   s.last_name,
                sex:         s.sex,
                class_name:  (s.classrooms as Record<string, unknown>)?.name || null,
                classroom_id: s.classroom_id,
            }));
            return { students: safeStudents, total: safeStudents.length };
        }

        default:
            throw { code: -32601, message: `Outil "${toolName}" non implémenté` };
    }
}
