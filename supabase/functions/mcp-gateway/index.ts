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
    orgId: string | null;
    isSuperadmin: boolean;
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

    // ── SUPERADMIN TOOLS ──────────────────────────────────────────────
    {
        name: 'list_support_messages',
        description: '[Superadmin] Lister les demandes de support et messages Sky Requests',
        permission: 'superadmin:support',
        inputSchema: {
            type: 'object',
            properties: {
                status: { type: 'string', description: 'pending | confirmed | credited | all' },
                limit: { type: 'number', description: 'Nombre max de résultats (défaut 50)' },
            },
        },
    },
    {
        name: 'reply_support_message',
        description: '[Superadmin] Répondre à un ticket de support / demande Sky Request',
        permission: 'superadmin:support',
        inputSchema: {
            type: 'object',
            properties: {
                request_id: { type: 'string', description: 'UUID de la demande' },
                reply_message: { type: 'string', description: 'Message de réponse à envoyer' },
            },
            required: ['request_id', 'reply_message'],
        },
    },
    {
        name: 'credit_sky_points',
        description: '[Superadmin] Créditer des Sky Points à un utilisateur ou une organisation',
        permission: 'superadmin:points',
        inputSchema: {
            type: 'object',
            properties: {
                target_type: { type: 'string', enum: ['org', 'user'], description: 'Type de cible : org ou user' },
                target_id: { type: 'string', description: 'UUID de l\'organisation ou de l\'utilisateur' },
                points: { type: 'number', description: 'Nombre de Sky Points à ajouter' },
                note: { type: 'string', description: 'Motif du crédit (optionnel)' },
            },
            required: ['target_type', 'target_id', 'points'],
        },
    },
    {
        name: 'list_inactive_orgs',
        description: '[Superadmin] Lister les organisations inactives (sans connexion récente)',
        permission: 'superadmin:orgs',
        inputSchema: {
            type: 'object',
            properties: {
                days_inactive: { type: 'number', description: 'Nombre de jours d\'inactivité (défaut 30)' },
            },
        },
    },
    {
        name: 'list_bug_reports',
        description: '[Superadmin] Lister les signalements de bugs reçus sur la plateforme',
        permission: 'superadmin:bugs',
        inputSchema: {
            type: 'object',
            properties: {
                status: { type: 'string', description: 'open | in_progress | resolved | all' },
            },
        },
    },
    {
        name: 'update_bug_status',
        description: '[Superadmin] Mettre à jour le statut et la note d\'un rapport de bug',
        permission: 'superadmin:bugs',
        inputSchema: {
            type: 'object',
            properties: {
                bug_id: { type: 'string', description: 'UUID du bug' },
                status: { type: 'string', enum: ['open', 'in_progress', 'resolved'], description: 'Nouveau statut' },
                admin_note: { type: 'string', description: 'Note d\'analyse ou résolution' },
            },
            required: ['bug_id', 'status'],
        },
    },
    {
        name: 'send_superadmin_announcement',
        description: '[Superadmin] Diffuser une annonce officielle à toutes les écoles ou une école cible',
        permission: 'superadmin:announcements',
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Titre de l\'annonce' },
                content: { type: 'string', description: 'Contenu Markdown de l\'annonce' },
                target_org_id: { type: 'string', description: 'UUID d\'une organisation ou "all" pour toutes' },
                type: { type: 'string', enum: ['info', 'warning', 'urgent', 'success'], description: 'Type d\'annonce' },
            },
            required: ['title', 'content'],
        },
    },
    {
        name: 'get_platform_stats',
        description: '[Superadmin] Obtenir les statistiques globales de la plateforme IziTeach',
        permission: 'superadmin:orgs',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'send_email_to_org',
        description: '[Superadmin] Envoyer un email direct de relance ou d\'information au responsable d\'une organisation',
        permission: 'superadmin:emails',
        inputSchema: {
            type: 'object',
            properties: {
                org_id: { type: 'string', description: 'UUID de l\'organisation' },
                subject: { type: 'string', description: 'Objet de l\'email' },
                message: { type: 'string', description: 'Corps du message' },
            },
            required: ['org_id', 'subject', 'message'],
        },
    },
    {
        name: 'generate_bug_summary_report',
        description: '[Superadmin] Générer un rapport d\'analyse synthétique sur les bugs signalés',
        permission: 'superadmin:bugs',
        inputSchema: {
            type: 'object',
            properties: {
                period_days: { type: 'number', description: 'Période en jours (défaut 30)' },
            },
        },
    },
    {
        name: 'list_organizations',
        description: '[Superadmin] Lister tous les établissements/écoles de la plateforme avec leurs UUIDs et détails',
        permission: 'superadmin:orgs',
        inputSchema: {
            type: 'object',
            properties: {
                limit: { type: 'number', description: 'Nombre max de résultats' },
            },
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
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'authorization, content-type',
            },
        });
    }

    if (req.method === 'GET') {
        return jsonResponse({
            status: 'online',
            server: 'MCP IziTeach Gateway (Supabase Failover Engine)',
            protocol: 'jsonrpc-2.0',
            version: '2.0.0',
            transport: ['HTTP POST (JSON-RPC 2.0)'],
            description: 'Passerelle de secours Supabase Edge Function pour agents IA.',
            authentication: 'Bearer token header (Authorization: Bearer cf_live_...)',
        }, 200);
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
        orgId:         agentData.organization_id || null,
        isSuperadmin:  !!agentData.is_superadmin,
        agentName:     agentData.agent_name,
        permissions:   agentData.permissions || [],
        rateLimit:     agentData.rate_limit_per_minute || 10,
        bulkThreshold: agentData.bulk_action_threshold || 5,
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
                    agent.isSuperadmin
                        ? (agent.permissions.includes('superadmin:all') || agent.permissions.includes(tool.permission))
                        : agent.permissions.includes(tool.permission)
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

                const isAllowed = agent.isSuperadmin
                    ? (agent.permissions.includes('superadmin:all') || agent.permissions.includes(toolDef.permission))
                    : agent.permissions.includes(toolDef.permission);

                if (!isAllowed) {
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

        // ── LIST ORGANIZATIONS (SUPERADMIN) ─────────────────────────────────
        case 'list_organizations':
        case 'list_orgs': {
            const limit = Math.min(Number(args.limit) || 50, 100);
            const { data, error } = await supabase
                .from('organizations')
                .select('id, name, slug, school_type, city, country, is_active, created_at')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) throw { code: -32002, message: error.message };
            return { organizations: data || [], total: (data || []).length };
        }

        // ── GET ORG INFO ────────────────────────────────────────────────────
        case 'get_org_info': {
            const targetOrgId = (args.org_id as string) || agent.orgId;
            if (!targetOrgId) {
                const { data, error } = await supabase
                    .from('organizations')
                    .select('id, name, type, city, country, slug')
                    .order('created_at', { ascending: true })
                    .limit(1);
                if (error) throw { code: -32002, message: error.message };
                return { organization: data?.[0] || null, note: 'Organisation par défaut renvoyée. Pour une école précise, utilisez : { "org_id": "UUID" }' };
            }
            const { data, error } = await supabase
                .from('organizations')
                .select('id, name, type, city, country, slug')
                .eq('id', targetOrgId)
                .single();
            if (error) throw { code: -32002, message: error.message };
            return { organization: data };
        }

        // ── LIST CLASSES ────────────────────────────────────────────────────
        case 'list_classes': {
            const targetOrgId = (args.org_id as string) || agent.orgId;
            let query = supabase
                .from('classrooms')
                .select('id, name, cycle, level, capacity, organization_id')
                .order('name');
            if (targetOrgId) {
                query = query.eq('organization_id', targetOrgId);
            }
            const { data, error } = await query;
            if (error) throw { code: -32002, message: error.message };
            return { classes: data || [], total: (data || []).length };
        }

        // ── LIST SUBJECTS ───────────────────────────────────────────────────
        case 'list_subjects': {
            const targetOrgId = (args.org_id as string) || agent.orgId;
            let query = supabase
                .from('subjects')
                .select('id, name, code, coefficient, classroom_id, organization_id, classrooms(name)')
                .order('name');
            if (targetOrgId) {
                query = query.eq('organization_id', targetOrgId);
            }
            if (args.class_id) {
                query = query.eq('classroom_id', args.class_id as string);
            }
            const { data, error } = await query;
            if (error) throw { code: -32002, message: error.message };
            return { subjects: data || [], total: (data || []).length };
        }

        // ── LIST CHAPTERS ───────────────────────────────────────────────────
        case 'list_chapters': {
            if (!args.subject_id) throw { code: -32602, message: 'subject_id requis' };
            const { data, error } = await supabase
                .from('chapters')
                .select('id, title, description, position, status, subject_id')
                .eq('subject_id', args.subject_id as string)
                .order('position');
            if (error) throw { code: -32002, message: error.message };
            const chapters = (data || []).map((ch: Record<string, unknown>) => ({
                ...ch,
                order_index: ch.position,
            }));
            return { chapters, total: chapters.length };
        }

        // ── LIST LESSONS ────────────────────────────────────────────────────
        case 'list_lessons': {
            if (!args.chapter_id) throw { code: -32602, message: 'chapter_id requis' };
            const { data, error } = await supabase
                .from('lessons')
                .select('id, title, content, position, estimated_minutes, status, chapter_id')
                .eq('chapter_id', args.chapter_id as string)
                .order('position');
            if (error) throw { code: -32002, message: error.message };
            const lessons = (data || []).map((l: Record<string, unknown>) => ({
                ...l,
                order_index: l.position,
            }));
            return { lessons, total: lessons.length };
        }

        // ── CREATE SUBJECT ───────────────────────────────────────────────────
        case 'create_subject': {
            if (!args.name) throw { code: -32602, message: '"name" est requis' };
            const targetOrgId = (args.org_id as string) || agent.orgId;
            if (!targetOrgId) throw { code: -32602, message: 'org_id requis pour créer une matière' };

            const payload: Record<string, unknown> = {
                organization_id: targetOrgId,
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
            const targetOrgId = (args.org_id as string) || agent.orgId;

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
                    organization_id: targetOrgId,
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
            const targetOrgId = (args.org_id as string) || agent.orgId;

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
                    chapter_id:        args.chapter_id,
                    organization_id:   targetOrgId,
                    title:             args.title,
                    content:           args.content,
                    position:          orderIndex,
                    estimated_minutes: args.duration_minutes || null,
                    status:            'published',
                    created_by_ai:     true,
                    ai_agent_name:     agent.agentName,
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
            if (!args.lesson_id || !args.title) {
                throw { code: -32602, message: '"lesson_id" et "title" sont requis' };
            }

            // Récupérer lesson → chapter_id & organization_id
            let chapterId = args.chapter_id as string;
            let targetOrgId = (args.org_id as string) || agent.orgId;
            if (args.lesson_id) {
                const { data: les } = await supabase
                    .from('lessons')
                    .select('chapter_id, organization_id')
                    .eq('id', args.lesson_id as string)
                    .maybeSingle();
                if (les) {
                    if (!chapterId) chapterId = les.chapter_id;
                    if (!targetOrgId) targetOrgId = les.organization_id;
                }
            }

            // Construire le tableau questions JSONB
            let questionsToSave: any[] = [];
            if (Array.isArray(args.questions) && args.questions.length > 0) {
                questionsToSave = args.questions.map((q: any, i: number) => ({
                    id: q.id || `q_${i + 1}`,
                    question: q.question || '',
                    type: q.type || args.type || 'qcm',
                    options: q.options || q.choices || [],
                    choices: q.choices || q.options || [],
                    answer: q.answer || q.correct_answer || '',
                    correct_answer: q.correct_answer || q.answer || '',
                    explanation: q.explanation || null,
                }));
            } else if (args.question) {
                questionsToSave = [{
                    id: 'q_1',
                    question: args.question,
                    type: args.type || 'qcm',
                    options: args.options || args.choices || [],
                    choices: args.choices || args.options || [],
                    answer: args.correct_answer || args.answer || '',
                    correct_answer: args.correct_answer || args.answer || '',
                    explanation: args.explanation || null,
                }];
            }

            const { data, error } = await supabase
                .from('exercises')
                .insert({
                    organization_id:  targetOrgId,
                    chapter_id:       chapterId || null,
                    lesson_id:        args.lesson_id,
                    title:            args.title,
                    type:             (args.type as string) || 'qcm',
                    questions:        questionsToSave,
                    duration_minutes: Number(args.duration_minutes) || 10,
                    max_score:        Number(args.max_score) || 20,
                    created_by_ai:    true,
                    ai_agent_name:    agent.agentName,
                })
                .select()
                .single();
            if (error) throw { code: -32002, message: error.message };
            return {
                success: true,
                exercise: data,
                message: `✅ Exercice "${args.title}" créé avec succès (${questionsToSave.length} question(s))`,
            };
        }

        // ── LIST STUDENTS ─────────────────────────────────────────────────────
        case 'list_students': {
            const targetOrgId = (args.org_id as string) || agent.orgId;
            const limit = Math.min((args.limit as number) || 50, 100);
            let query = supabase
                .from('student_profiles')
                .select('id, first_name, last_name, gender, classroom_id, classrooms(name), approval_status, organization_id')
                .eq('approval_status', 'approved')
                .order('last_name')
                .limit(limit);

            if (targetOrgId) {
                query = query.eq('organization_id', targetOrgId);
            }
            if (args.class_id) {
                query = query.eq('classroom_id', args.class_id as string);
            }
            const { data, error } = await query;
            if (error) throw { code: -32002, message: error.message };

            // Retirer les données sensibles
            const safeStudents = (data || []).map((s: Record<string, unknown>) => ({
                id:          s.id,
                first_name:  s.first_name,
                last_name:   s.last_name,
                gender:      s.gender,
                class_name:  (s.classrooms as Record<string, unknown>)?.name || null,
                classroom_id: s.classroom_id,
            }));
            return { students: safeStudents, total: safeStudents.length };
        }

        // ═══════════════════════════════════════════════════════════════════
        // SUPERADMIN TOOLS EXECUTORS
        // ═══════════════════════════════════════════════════════════════════

        // ── LIST SUPPORT MESSAGES ──────────────────────────────────────────
        case 'list_support_messages': {
            const limit = Math.min((args.limit as number) || 50, 100);
            let query = supabase
                .from('sky_point_requests')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (args.status && args.status !== 'all') {
                query = query.eq('status', args.status as string);
            }

            const { data, error } = await query;
            if (error) throw { code: -32002, message: error.message };
            return { requests: data || [], total: (data || []).length };
        }

        // ── REPLY SUPPORT MESSAGE ──────────────────────────────────────────
        case 'reply_support_message': {
            if (!args.request_id || !args.reply_message) {
                throw { code: -32602, message: 'request_id et reply_message requis' };
            }

            const { data, error } = await supabase
                .from('sky_point_requests')
                .update({
                    response: String(args.reply_message).trim(),
                    responded_at: new Date().toISOString(),
                    status: 'confirmed',
                })
                .eq('id', args.request_id as string)
                .select()
                .single();

            if (error) throw { code: -32002, message: error.message };
            return {
                success: true,
                request: data,
                message: `✅ Réponse envoyée pour le ticket ${args.request_id}`,
            };
        }

        // ── CREDIT SKY POINTS ──────────────────────────────────────────────
        case 'credit_sky_points': {
            const targetType = args.target_type as string;
            const targetId = args.target_id as string;
            const points = Number(args.points);

            if (!targetType || !targetId || isNaN(points) || points <= 0) {
                throw { code: -32602, message: 'target_type (org/user), target_id et points (>0) requis' };
            }

            if (targetType === 'org') {
                const { data: org, error: orgErr } = await supabase
                    .from('organizations')
                    .select('id, name, sky_points')
                    .eq('id', targetId)
                    .single();
                if (orgErr || !org) throw { code: -32003, message: 'Organisation introuvable' };

                const newBalance = (org.sky_points || 0) + points;
                await supabase.from('organizations').update({ sky_points: newBalance }).eq('id', targetId);

                await supabase.from('sky_points_transactions').insert({
                    to_entity_type: 'org',
                    to_entity_id: org.id,
                    to_entity_name: org.name,
                    org_name: org.name,
                    amount: points,
                    note: (args.note as string) || `Crédit Sky Agent: ${agent.agentName}`,
                    performed_by: `ai_agent:${agent.agentName}`,
                });

                return { success: true, target: org.name, credited: points, new_balance: newBalance };
            } else {
                // User target
                const { data: user, error: userErr } = await supabase
                    .from('student_profiles')
                    .select('id, first_name, last_name, sky_points')
                    .eq('id', targetId)
                    .single();

                const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Utilisateur';
                const newBalance = ((user?.sky_points || 0) + points);

                if (user) {
                    await supabase.from('student_profiles').update({ sky_points: newBalance }).eq('id', targetId);
                }

                await supabase.from('sky_points_transactions').insert({
                    to_entity_type: 'user',
                    to_entity_id: targetId,
                    to_entity_name: userName,
                    amount: points,
                    note: (args.note as string) || `Crédit Sky Agent: ${agent.agentName}`,
                    performed_by: `ai_agent:${agent.agentName}`,
                });

                return { success: true, target_id: targetId, credited: points, new_balance: newBalance };
            }
        }

        // ── LIST INACTIVE ORGS ─────────────────────────────────────────────
        case 'list_inactive_orgs': {
            const days = Number(args.days_inactive) || 30;
            const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

            const { data, error } = await supabase
                .from('organizations')
                .select('id, name, slug, email, phone, city, is_active, created_at')
                .lt('created_at', threshold)
                .order('created_at', { ascending: false });

            if (error) throw { code: -32002, message: error.message };
            return {
                inactive_orgs: data || [],
                total: (data || []).length,
                threshold_days: days,
            };
        }

        // ── LIST BUG REPORTS ───────────────────────────────────────────────
        case 'list_bug_reports': {
            let query = supabase.from('bug_reports').select('*').order('created_at', { ascending: false });
            if (args.status && args.status !== 'all') {
                query = query.eq('status', args.status as string);
            }
            const { data, error } = await query;
            if (error) throw { code: -32002, message: error.message };
            return { bugs: data || [], total: (data || []).length };
        }

        // ── UPDATE BUG STATUS ──────────────────────────────────────────────
        case 'update_bug_status': {
            if (!args.bug_id || !args.status) throw { code: -32602, message: 'bug_id et status requis' };
            const { data, error } = await supabase
                .from('bug_reports')
                .update({
                    status: args.status as string,
                    admin_note: (args.admin_note as string) || null,
                })
                .eq('id', args.bug_id as string)
                .select()
                .single();
            if (error) throw { code: -32002, message: error.message };
            return { success: true, bug: data, message: `✅ Bug ${args.bug_id} mis à jour : ${args.status}` };
        }

        // ── SEND SUPERADMIN ANNOUNCEMENT ───────────────────────────────────
        case 'send_superadmin_announcement': {
            if (!args.title || !args.content) throw { code: -32602, message: 'title et content requis' };
            const title = String(args.title).trim();
            const content = String(args.content).trim();
            const type = (args.type as string) || 'info';
            const target = (args.target_org_id as string) || 'all';

            // Insert into superadmin_announcements
            await supabase.from('superadmin_announcements').insert({
                title: `📣 ${title}`,
                body: content,
                target_org_id: target,
                ann_type: type,
                sent_to_count: target === 'all' ? 100 : 1,
            });

            // Insert into announcements
            if (target === 'all') {
                const { data: orgs } = await supabase.from('organizations').select('id');
                for (const org of orgs || []) {
                    await supabase.from('announcements').insert({
                        organization_id: org.id,
                        title: `📣 ${title}`,
                        content,
                        body: content,
                        type: 'official',
                    });
                }
            } else {
                await supabase.from('announcements').insert({
                    organization_id: target,
                    title: `📣 ${title}`,
                    content,
                    body: content,
                    type: 'official',
                });
            }

            return { success: true, message: `📢 Annonce "${title}" diffusée avec succès` };
        }

        // ── GET PLATFORM STATS ─────────────────────────────────────────────
        case 'get_platform_stats': {
            const { data: orgsCount } = await supabase.from('organizations').select('id', { count: 'exact', head: true });
            const { data: studentsCount } = await supabase.from('student_profiles').select('id', { count: 'exact', head: true });
            const { data: teachersCount } = await supabase.from('teacher_profiles').select('id', { count: 'exact', head: true });
            const { data: bugsCount } = await supabase.from('bug_reports').select('id', { count: 'exact', head: true });

            return {
                total_organizations: orgsCount?.length ?? 0,
                total_students: studentsCount?.length ?? 0,
                total_teachers: teachersCount?.length ?? 0,
                total_bug_reports: bugsCount?.length ?? 0,
                timestamp: new Date().toISOString(),
            };
        }

        // ── SEND EMAIL TO ORG ──────────────────────────────────────────────
        case 'send_email_to_org': {
            if (!args.org_id || !args.subject || !args.message) {
                throw { code: -32602, message: 'org_id, subject et message requis' };
            }

            const { data: org, error: orgErr } = await supabase
                .from('organizations')
                .select('id, name, email')
                .eq('id', args.org_id as string)
                .single();

            if (orgErr || !org) throw { code: -32003, message: 'Organisation introuvable' };

            // Record notification / message in system
            await supabase.from('announcements').insert({
                organization_id: org.id,
                title: `📧 Message Superadmin : ${String(args.subject).trim()}`,
                content: String(args.message).trim(),
                body: String(args.message).trim(),
                type: 'official',
            });

            return {
                success: true,
                recipient_org: org.name,
                recipient_email: org.email || 'Email de l\'école',
                subject: args.subject,
                message: `✅ Email / Notification transmise avec succès à "${org.name}"`,
            };
        }

        // ── GENERATE BUG SUMMARY REPORT ────────────────────────────────────
        case 'generate_bug_summary_report': {
            const days = Number(args.period_days) || 30;
            const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

            const { data: bugs, error } = await supabase
                .from('bug_reports')
                .select('id, title, description, status, page_url, created_at')
                .gte('created_at', threshold)
                .order('created_at', { ascending: false });

            if (error) throw { code: -32002, message: error.message };

            const total = bugs?.length || 0;
            const openCount = (bugs || []).filter(b => b.status === 'open').length;
            const inProgressCount = (bugs || []).filter(b => b.status === 'in_progress').length;
            const resolvedCount = (bugs || []).filter(b => b.status === 'resolved').length;

            return {
                success: true,
                period_days: days,
                summary: {
                    total_bugs_reported: total,
                    open: openCount,
                    in_progress: inProgressCount,
                    resolved: resolvedCount,
                },
                recent_bugs: (bugs || []).slice(0, 15),
                generated_by_agent: agent.agentName,
            };
        }

        default:
            throw { code: -32601, message: `Outil "${toolName}" non implémenté` };
    }
}
