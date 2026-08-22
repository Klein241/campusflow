/**
 * Custom Domain Automation (Netlify API)
 */
import { Env } from '../types';
import { json, jsonResponse, errorResponse } from '../lib/cors';

// ══════════════════════════════════════════════════════════
// CUSTOM DOMAIN AUTOMATION (Netlify API integration)
// ══════════════════════════════════════════════════════════

/** POST /api/domain/register — Ajout automatique d'alias de domaine sur Netlify */
async function handleDomainRegister(request: Request, env: Env): Promise<Response> {
    const authHeader = request.headers.get('Authorization') || '';
    if (!authHeader || !env.ADMIN_KEY || !authHeader.includes(env.ADMIN_KEY)) {
        return json({ error: 'Non autorisé' }, 401);
    }

    try {
        const body = await request.json() as { domain: string; orgId?: string };
        const rawDomain = (body.domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
        if (!rawDomain) return json({ error: 'Domaine invalide' }, 400);

        const cleanDomain = rawDomain.replace(/^www\./, '');
        const withWww = `www.${cleanDomain}`;

        let netlifySuccess = false;
        let netlifyMsg = '';
        const netlifyToken = env.NETLIFY_AUTH_TOKEN;
        const siteId = env.NETLIFY_SITE_ID || 'mycampusfl';

        if (netlifyToken && siteId) {
            try {
                // 1. Lire les alias existants
                const siteRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
                    headers: { 'Authorization': `Bearer ${netlifyToken}` }
                });
                if (siteRes.ok) {
                    const siteData = await siteRes.json() as { domain_aliases?: string[] };
                    const currentAliases = siteData.domain_aliases || [];
                    const newAliasesSet = new Set(currentAliases);
                    newAliasesSet.add(cleanDomain);
                    newAliasesSet.add(withWww);
                    const updatedAliases = Array.from(newAliasesSet);

                    // 2. Mettre à jour la liste des alias
                    const updateRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${netlifyToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ domain_aliases: updatedAliases })
                    });
                    if (updateRes.ok) {
                        netlifySuccess = true;
                        netlifyMsg = 'Alias de domaine et certificat SSL Netlify configurés automatiquement';
                    }
                }
            } catch (netErr: any) {
                console.warn('[Domain] Netlify API call failed:', netErr.message);
            }
        }

        return json({
            success: true,
            domain: cleanDomain,
            netlifyAutomated: netlifySuccess,
            message: netlifySuccess ? netlifyMsg : 'Domaine enregistré avec succès'
        });
    } catch (e: any) {
        return json({ error: e.message }, 500);
    }
}

/** POST /api/domain/remove — Retrait automatique d'alias de domaine sur Netlify */
async function handleDomainRemove(request: Request, env: Env): Promise<Response> {
    const authHeader = request.headers.get('Authorization') || '';
    if (!authHeader || !env.ADMIN_KEY || !authHeader.includes(env.ADMIN_KEY)) {
        return json({ error: 'Non autorisé' }, 401);
    }

    try {
        const body = await request.json() as { domain: string; orgId?: string };
        const rawDomain = (body.domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
        if (!rawDomain) return json({ error: 'Domaine invalide' }, 400);

        const cleanDomain = rawDomain.replace(/^www\./, '');
        const withWww = `www.${cleanDomain}`;

        const netlifyToken = env.NETLIFY_AUTH_TOKEN;
        const siteId = env.NETLIFY_SITE_ID || 'mycampusfl';

        if (netlifyToken && siteId) {
            try {
                const siteRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
                    headers: { 'Authorization': `Bearer ${netlifyToken}` }
                });
                if (siteRes.ok) {
                    const siteData = await siteRes.json() as { domain_aliases?: string[] };
                    const currentAliases = siteData.domain_aliases || [];
                    const updatedAliases = currentAliases.filter(d => d !== cleanDomain && d !== withWww);

                    await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${netlifyToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ domain_aliases: updatedAliases })
                    });
                }
            } catch (netErr: any) {
                console.warn('[Domain] Netlify API remove failed:', netErr.message);
            }
        }

        return json({ success: true, domain: cleanDomain });
    } catch (e: any) {
        return json({ error: e.message }, 500);
    }
}

// MAIN ROUTER
// ══════════════════════════════════════════════════════════

export {
    handleDomainRegister,
    handleDomainRemove,
};
