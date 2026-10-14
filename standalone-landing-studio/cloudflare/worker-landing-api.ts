/**
 * ==============================================================================
 * CLOUDFLARE WORKER ROUTER (D1 Database + R2 Storage)
 * API Backend pour le Studio de Personnalisation & les Templates
 * ==============================================================================
 *
 * Ce module s'intègre directement dans votre Cloudflare Worker (index.ts ou router Hono / itty-router).
 *
 * Déclarations requises dans wrangler.toml :
 *
 * [[d1_databases]]
 * binding = "DB"
 * database_name = "votre_base_d1"
 * database_id = "votre-database-id"
 *
 * [[r2_buckets]]
 * binding = "R2_BUCKET"
 * bucket_name = "votre_bucket_r2"
 *
 * [vars]
 * R2_PUBLIC_DOMAIN = "https://cdn.votredomaine.com" (ou URL r2.dev)
 */

export interface Env {
    DB: D1Database;
    R2_BUCKET: R2Bucket;
    R2_PUBLIC_DOMAIN?: string;
}

export async function handleLandingStudioRequest(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Headers CORS permissifs pour les requêtes frontend
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Org-Id',
    };

    if (method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // ── 1. GET /api/landing/config?org_id=... ──
        if (method === 'GET' && path === '/api/landing/config') {
            const orgId = url.searchParams.get('org_id');
            const orgSlug = url.searchParams.get('org_slug');

            if (!orgId && !orgSlug) {
                return new Response(JSON.stringify({ error: 'org_id ou org_slug requis' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Récupérer la config dans D1
            const configQuery = orgId
                ? 'SELECT * FROM landing_configs WHERE org_id = ? LIMIT 1'
                : 'SELECT * FROM landing_configs WHERE org_slug = ? LIMIT 1';
            
            const configResult = await env.DB.prepare(configQuery)
                .bind(orgId || orgSlug)
                .first();

            // Récupérer les formations synchronisées dans D1
            const targetOrgId = configResult?.org_id || orgId;
            let programs: any[] = [];
            if (targetOrgId) {
                const programsResult = await env.DB.prepare(
                    'SELECT * FROM landing_programs WHERE org_id = ? AND is_active = 1 ORDER BY sort_order ASC, created_at ASC'
                ).bind(targetOrgId).all();
                
                programs = (programsResult.results || []).map((p: any) => ({
                    ...p,
                    schedule_config: p.schedule_config ? JSON.parse(p.schedule_config) : {}
                }));
            }

            return new Response(JSON.stringify({
                success: true,
                config: configResult ? {
                    ...configResult,
                    template_config: configResult.template_config ? JSON.parse(configResult.template_config as string) : {},
                    gallery_images: configResult.gallery_images ? JSON.parse(configResult.gallery_images as string) : []
                } : null,
                programs
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // ── 2. POST /api/landing/config ── Sauvegarde globale D1
        if (method === 'POST' && path === '/api/landing/config') {
            const body = await request.json() as any;
            const { org_id, org_slug, org_name, brand_color, landing_layout, hero_template, template_config, gallery_images, programs } = body;

            if (!org_id) {
                return new Response(JSON.stringify({ error: 'org_id manquant' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // 1. Upsert dans D1 landing_configs
            await env.DB.prepare(`
                INSERT INTO landing_configs (id, org_id, org_slug, org_name, brand_color, landing_layout, hero_template, template_config, gallery_images, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(id) DO UPDATE SET
                    org_slug = excluded.org_slug,
                    org_name = excluded.org_name,
                    brand_color = excluded.brand_color,
                    landing_layout = excluded.landing_layout,
                    hero_template = excluded.hero_template,
                    template_config = excluded.template_config,
                    gallery_images = excluded.gallery_images,
                    updated_at = CURRENT_TIMESTAMP
            `).bind(
                org_id,
                org_id,
                org_slug || '',
                org_name || '',
                brand_color || '#F59E0B',
                landing_layout || 'bento_grid',
                hero_template || 'split',
                JSON.stringify(template_config || {}),
                JSON.stringify(gallery_images || [])
            ).run();

            // 2. Synchronisation des programmes dans D1
            if (Array.isArray(programs)) {
                for (let i = 0; i < programs.length; i++) {
                    const p = programs[i];
                    const progId = p.id || `prog_${Date.now()}_${i}`;
                    const schedJson = JSON.stringify(p.schedule_config || {});

                    await env.DB.prepare(`
                        INSERT INTO landing_programs (id, org_id, name, category, duration_months, duration_text, price, original_price, promo_badge, certification_label, cta_text, description, poster_url, schedule_config, sort_order, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        ON CONFLICT(id) DO UPDATE SET
                            name = excluded.name,
                            category = excluded.category,
                            duration_months = excluded.duration_months,
                            duration_text = excluded.duration_text,
                            price = excluded.price,
                            original_price = excluded.original_price,
                            promo_badge = excluded.promo_badge,
                            certification_label = excluded.certification_label,
                            cta_text = excluded.cta_text,
                            description = excluded.description,
                            poster_url = excluded.poster_url,
                            schedule_config = excluded.schedule_config,
                            sort_order = excluded.sort_order,
                            updated_at = CURRENT_TIMESTAMP
                    `).bind(
                        progId,
                        org_id,
                        p.name || p.nom || 'Programme',
                        p.category || 'Formation',
                        Number(p.duration_months || p.duree_mois || 6),
                        p.duration_text || p.duree_texte || '6 mois',
                        Number(p.price || p.frais_scolarite || 0),
                        p.original_price || p.prix_barre || null,
                        p.promo_badge || null,
                        p.certification_label || 'Certification PRO',
                        p.cta_text || 'Postuler',
                        p.description || '',
                        p.poster_url || p.image || null,
                        schedJson,
                        i
                    ).run();
                }
            }

            return new Response(JSON.stringify({ success: true, message: 'Configuration sauvegardée dans Cloudflare D1 avec succès !' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // ── 3. POST /api/landing/upload ── Téléversement direct dans Cloudflare R2
        if (method === 'POST' && path === '/api/landing/upload') {
            const formData = await request.formData();
            const file = formData.get('file') as File | null;
            const folder = (formData.get('folder') as string) || 'templates';
            const orgId = (formData.get('org_id') as string) || 'default';

            if (!file) {
                return new Response(JSON.stringify({ error: 'Fichier absent' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Génération de la clé R2
            const ext = file.name ? file.name.split('.').pop() : 'jpg';
            const cleanName = file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_') : `img_${Date.now()}.${ext}`;
            const r2Key = `${folder}/${orgId}/${Date.now()}_${cleanName}`;

            // Écriture directe dans le bucket Cloudflare R2
            await env.R2_BUCKET.put(r2Key, file.stream(), {
                httpMetadata: {
                    contentType: file.type || 'application/octet-stream',
                    cacheControl: 'public, max-age=31536000, immutable',
                },
                customMetadata: {
                    uploadedAt: new Date().toISOString(),
                    orgId,
                }
            });

            // Construction de l'URL publique
            const publicDomain = env.R2_PUBLIC_DOMAIN || 'https://cdn.readsgreat.site';
            const publicUrl = `${publicDomain.replace(/\/$/, '')}/${r2Key}`;

            // Enregistrement optionnel dans D1 landing_media
            try {
                await env.DB.prepare(`
                    INSERT INTO landing_media (id, org_id, r2_key, public_url, file_name, content_type, file_size)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    `med_${Date.now()}`,
                    orgId,
                    r2Key,
                    publicUrl,
                    file.name,
                    file.type,
                    file.size
                ).run();
            } catch (d1Err) {
                console.warn('Trace D1 landing_media facultative non bloquante:', d1Err);
            }

            return new Response(JSON.stringify({
                success: true,
                url: publicUrl,
                key: r2Key
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ error: 'Route introuvable' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error('Erreur API Landing Cloudflare Worker:', err);
        return new Response(JSON.stringify({ error: err.message || 'Erreur interne Cloudflare' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
