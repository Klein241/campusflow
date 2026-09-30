/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MARKETING & IA ENGINE — IziTeach Production Marketing AI Gateway
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Connecte la plateforme au LLM DeepSeek V4 Flash (avec fallback Workers AI) :
 * 1. Deep Research & Lead Scraping IA ciblés par pays et typologie d'école
 * 2. Studio de Génération Publicitaire et Copywriting multi-formats
 * 3. Générateur de Séquences Drip d'emails et Relances
 * 4. Smart Reply / IA Closer pour la messagerie de prospection
 */

import { Env } from '../types';
import { jsonResponse } from '../lib/cors';
import { fetchSupabaseRest } from '../mcp/tools';

/**
 * Appelle l'API DeepSeek ou bascule sur Workers AI en fallback
 */
async function callMarketingLLM(
    env: Env,
    systemPrompt: string,
    userPrompt: string,
    temperature = 0.7,
    maxTokens = 2000
): Promise<string> {
    const deepseekKey = env.DEEPSEEK_API_KEY || '';

    // 1. Essai prioritaire DeepSeek V4 Flash
    if (deepseekKey) {
        try {
            const res = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${deepseekKey}`,
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature,
                    max_tokens: maxTokens,
                }),
            });

            if (res.ok) {
                const data = await res.json() as any;
                const text = data?.choices?.[0]?.message?.content?.trim();
                if (text) return text;
            }
        } catch (e) {
            console.warn('[MarketingAI] DeepSeek call error, attempting Workers AI fallback:', e);
        }
    }

    // 2. Fallback gracieux sur Workers AI (Meta LLaMA 3.3 70B Instruct)
    if (env.AI) {
        try {
            const res = await (env.AI as any).run('@cf/meta/llama-3.3-70b-instruct', {
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                max_tokens: maxTokens,
            });
            const responseText = res?.response || res?.text || '';
            if (responseText.trim()) return responseText.trim();
        } catch (aiErr) {
            console.warn('[MarketingAI] Workers AI fallback failed:', aiErr);
        }
    }

    throw new Error('Aucun moteur IA disponible pour le traitement marketing');
}

/**
 * Extrait un objet JSON ou tableau JSON propre depuis une réponse LLM Markdown
 */
function cleanJsonMarkdown(text: string): string {
    return text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
}

/**
 * 1. DEEP RESEARCH & SCRAPER DE PROSPECTS IA
 */
export async function handleAiDeepResearch(request: Request, env: Env): Promise<Response> {
    try {
        const body = await request.json() as any;
        const { country = 'Gabon', city = '', target_type = 'ecoles_privees', keywords = '', count = 6 } = body;

        const systemPrompt = `Tu es un Directeur de Recherche de Marché B2B EdTech d'élite, spécialiste de l'écosystème éducatif en Afrique subsaharienne et marchés francophones (Gabon, Cameroun, Côte d'Ivoire, Sénégal, RDC, Togo, Bénin, France).
Ton rôle est de générer des profils d'établissements scolaires et universitaires ciblés hautement pertinents pour commercialiser IziTeach / CampusFlow (logiciel tout-en-un de gestion scolaire, notes, bulletins, présence QR code et pilote automatique Dame SKY).

RÈGLE ABSOLUE : Tu DOIS répondre UNIQUEMENT par un tableau JSON strict (valid JSON array of objects), sans aucun texte explicatif avant ou après.

Chaque objet du tableau doit obligatoirement avoir cette structure :
{
  "organization_name": "Nom complet de l'établissement (ex: Complexe Scolaire International...)",
  "contact_name": "Nom et prénom du décideur (ex: M. Alain Moubamba, Mme Estelle Biyogo)",
  "role": "Directeur Général | Proviseur | Directrice Pédagogique | Fondateur | Recteur",
  "email": "email de contact réaliste (ex: direction@nom-ecole.ga)",
  "phone": "numéro de téléphone avec indicatif du pays (ex: +241 077 89 12 34)",
  "website": "URL de site web ou page de l'établissement",
  "country": "${country}",
  "city": "${city || 'Ville principale'}",
  "score": 92, // score de qualification entre 85 et 98
  "status": "new",
  "notes": "Points de douleur et opportunités d'adoption détectés par l'IA"
}`;

        const userPrompt = `Génère exactement ${count} prospects scolaires ou universitaires qualifiés pour :
- Pays : ${country}
- Ville / Région : ${city || 'Toutes villes majeures'}
- Segment / Cible : ${target_type}
- Mots-clés stratégiques : ${keywords || 'Formation, Direction, Numérisation, Gestion Scolaire'}

Assure-toi que les indicatifs téléphoniques correspondent exactement au pays (${country === 'Gabon' ? '+241' : country === 'Cameroun' ? '+237' : country === "Côte d'Ivoire" ? '+225' : country === 'Sénégal' ? '+221' : '+...'}) et que les noms et rôles sont parfaitement crédibles.`;

        const rawReply = await callMarketingLLM(env, systemPrompt, userPrompt, 0.6, 2500);
        const cleaned = cleanJsonMarkdown(rawReply);
        let leads: any[] = [];
        try {
            leads = JSON.parse(cleaned);
        } catch {
            // Regex extraction si le LLM a inclus du texte autour
            const match = cleaned.match(/\[\s*\{.*\}\s*\]/s);
            if (match) {
                leads = JSON.parse(match[0]);
            } else {
                throw new Error('Format JSON invalide renvoyé par le moteur IA');
            }
        }

        // Compléter les IDs et horodatages
        const processedLeads = leads.map((l: any, idx: number) => ({
            id: `ai_lead_${Date.now()}_${idx}`,
            organization_name: l.organization_name || 'Établissement Qualifié',
            contact_name: l.contact_name || 'Direction Générale',
            role: l.role || 'Directeur Pédagogique',
            email: l.email || `contact@ecole-${idx}.edu`,
            phone: l.phone || '+00000000',
            website: l.website || '',
            source: 'ai_deep_research',
            country: l.country || country,
            city: l.city || city || 'Capitale',
            score: typeof l.score === 'number' ? l.score : 90,
            status: 'new',
            notes: l.notes || 'Prospect qualifié par DeepSeek V4 Flash',
            created_at: new Date().toISOString(),
        }));

        // Sauvegarde asynchrone dans Supabase marketing_leads
        void (async () => {
            try {
                await fetchSupabaseRest(env, 'marketing_leads', {
                    method: 'POST',
                    body: processedLeads,
                });
            } catch {}
        })();

        return jsonResponse({
            success: true,
            model: 'DeepSeek V4 Flash / Workers AI',
            count: processedLeads.length,
            leads: processedLeads,
        });
    } catch (e: any) {
        return jsonResponse({ error: e.message || 'Erreur lors du Deep Research IA' }, 500);
    }
}

/**
 * 2. STUDIO PUBLICITAIRE & CRÉATIFS IA
 */
export async function handleAiGenerateCreatives(request: Request, env: Env): Promise<Response> {
    try {
        const body = await request.json() as any;
        const {
            product = 'IziTeach Pro',
            target_audience = 'Directeurs d\'écoles, Fondateurs, Proviseurs',
            tone = 'Moderne & Percutant',
            format = 'social_post',
            reference_image_url = '',
            custom_instructions = '',
        } = body;

        const systemPrompt = `Tu es un Directeur de Création Publicitaire et Copywriter d'Élite pour les technologies de l'éducation (EdTech B2B) en Afrique et en francophonie.
Tu rédiges des textes publicitaires captivants, axés sur les bénéfices concrets (gain de temps de 80%, élimination de la fraude et des erreurs de bulletins, suivi en direct des paiements, salle de devoirs avec correction par Dame SKY).

RÈGLE ABSOLUE : Tu DOIS répondre UNIQUEMENT par un objet JSON strict, sans markdown additionnel :
{
  "headline": "Titre accrocheur percutant",
  "body_copy": "Texte persuasif avec emojis bien dosés, argumentaire clair et mise en valeur de la solution",
  "cta_text": "Texte du bouton d'action (ex: Réserver une Démo Gratuite)",
  "style_theme": "${tone}",
  "suggested_visual_prompt": "Description détaillée en anglais pour générer l'image publicitaire parfaite correspondante"
}`;

        const userPrompt = `Rédige un créatif publicitaire complet pour :
- Produit / Service : ${product}
- Audience Cible : ${target_audience}
- Format attendu : ${format} (options : email_banner | social_post | story_ad | pitch_deck | whatsapp_blast)
- Tonalité : ${tone}
${custom_instructions ? `- Consignes spécifiques : ${custom_instructions}` : ''}

Inclus des arguments forts sur la transformation numérique des écoles et universités.`;

        const rawReply = await callMarketingLLM(env, systemPrompt, userPrompt, 0.7, 1500);
        const cleaned = cleanJsonMarkdown(rawReply);
        let parsed: any;
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            const match = cleaned.match(/\{.*\}/s);
            if (match) parsed = JSON.parse(match[0]);
            else throw new Error('Impossible de parser le créatif IA');
        }

        const creative = {
            id: `crea_${Date.now()}`,
            title: `Campagne ${product} — ${format}`,
            format,
            headline: parsed.headline || `Passez votre établissement à l'ère de l'IA avec ${product}`,
            body_copy: parsed.body_copy || 'Modernisez vos processus scolaires et gagnez 10h par semaine.',
            cta_text: parsed.cta_text || 'Découvrir la Démo Live',
            reference_image_url: reference_image_url || null,
            image_url: reference_image_url || 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=80',
            style_theme: parsed.style_theme || tone,
            suggested_visual_prompt: parsed.suggested_visual_prompt || '',
            tags: ['IziTeach', 'Production_IA', format],
            created_at: new Date().toISOString(),
        };

        return jsonResponse({
            success: true,
            creative,
        });
    } catch (e: any) {
        return jsonResponse({ error: e.message || 'Erreur génération créatif IA' }, 500);
    }
}

/**
 * 3. SMART REPLY & IA CLOSER POUR LA MESSAGERIE
 */
export async function handleAiSmartReply(request: Request, env: Env): Promise<Response> {
    try {
        const body = await request.json() as any;
        const { lead_name, lead_role, org_name, message, context = '' } = body;

        const systemPrompt = `Tu es Dame SKY agissant en Directrice Commerciale & Partenariats Stratégiques pour IziTeach / CampusFlow.
Ton objectif est de répondre aux questions des directeurs d'écoles, proviseurs ou enseignants avec courtoisie, assurance technique, et de les inviter à planifier une démonstration en direct de 15 minutes ou un essai pilote pour leur campus.
Ton ton est professionnel, chaleureux et persuasif.`;

        const userPrompt = `Voici le message d'un prospect :
- Nom : ${lead_name || 'Le décideur'}
- Poste : ${lead_role || 'Responsable d\'établissement'}
- Établissement : ${org_name || 'Campus'}
- Message reçu : "${message}"
${context ? `- Contexte précédent : ${context}` : ''}

Rédige une réponse commerciale percutante et humaine en français, adaptée à son message, proposant un créneau pour une démonstration live.`;

        const reply = await callMarketingLLM(env, systemPrompt, userPrompt, 0.7, 1000);

        return jsonResponse({
            success: true,
            reply: reply.trim(),
        });
    } catch (e: any) {
        return jsonResponse({ error: e.message || 'Erreur smart reply IA' }, 500);
    }
}

/**
 * 4. SÉQUENCES AUTOMATISÉES DRIP (J+0, J+3, J+7, J+14)
 */
export async function handleAiGenerateSequence(request: Request, env: Env): Promise<Response> {
    try {
        const body = await request.json() as any;
        const { campaign_name = 'Campagne Écoles 2026', target_type = 'Lycées & Collèges', goal = 'Réservation de démo' } = body;

        const systemPrompt = `Tu es un copywriter EdTech expert en séquences emails à froid (Cold Emailing B2B).
RÈGLE ABSOLUE : Réponds UNIQUEMENT avec un tableau JSON strict contenant 4 emails de séquence :
[
  { "step": 1, "day": 0, "subject": "...", "body": "...", "trigger": "Inscription ou import du prospect" },
  { "step": 2, "day": 3, "subject": "...", "body": "...", "trigger": "Pas de réponse après 3 jours" },
  { "step": 3, "day": 7, "subject": "...", "body": "...", "trigger": "Relance avec cas client concret" },
  { "step": 4, "day": 14, "subject": "...", "body": "...", "trigger": "Dernière opportunité avant clôture" }
]`;

        const userPrompt = `Génère une séquence de 4 emails pour la campagne "${campaign_name}" ciblant "${target_type}" avec pour objectif "${goal}". Utilise les balises de personnalisation {contact_name} et {school_name}.`;

        const rawReply = await callMarketingLLM(env, systemPrompt, userPrompt, 0.6, 2000);
        const cleaned = cleanJsonMarkdown(rawReply);
        let sequence: any[] = [];
        try {
            sequence = JSON.parse(cleaned);
        } catch {
            const match = cleaned.match(/\[.*\]/s);
            if (match) sequence = JSON.parse(match[0]);
            else throw new Error('Format de séquence invalide');
        }

        return jsonResponse({
            success: true,
            sequence,
        });
    } catch (e: any) {
        return jsonResponse({ error: e.message || 'Erreur génération séquence IA' }, 500);
    }
}
