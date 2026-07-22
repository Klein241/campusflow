// netlify/edge-functions/org-manifest.ts
// ─────────────────────────────────────────────────────────────────────
// Generates a per-tenant PWA Web App Manifest on the fly.
// URL: /<orgSlug>/manifest.webmanifest
//
// The browser reads this manifest to name the installed PWA, set the
// start_url to the org's campus and display the org's logo as the icon.
// ─────────────────────────────────────────────────────────────────────

import type { Context } from "@netlify/edge-functions";

const SUPABASE_URL  = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")!;

export default async function handler(req: Request, context: Context) {
    const url = new URL(req.url);

    // Extract orgSlug from path: /<orgSlug>/manifest.webmanifest
    const parts = url.pathname.split("/").filter(Boolean);
    const orgSlug = parts[0];

    if (!orgSlug || orgSlug === "_") {
        return new Response(defaultManifest("/"), {
            headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=300" },
        });
    }

    // Fetch org info from Supabase
    let orgName  = "CampusFlow";
    let orgLogo  = null as string | null;

    try {
        const apiUrl = `${SUPABASE_URL}/rest/v1/organizations?slug=eq.${encodeURIComponent(orgSlug)}&select=name,logo_url&limit=1`;
        const resp = await fetch(apiUrl, {
            headers: {
                "apikey": SUPABASE_ANON,
                "Authorization": `Bearer ${SUPABASE_ANON}`,
            },
        });
        if (resp.ok) {
            const rows = await resp.json() as Array<{ name: string; logo_url: string | null }>;
            if (rows.length > 0) {
                orgName = rows[0].name;
                orgLogo = rows[0].logo_url;
            }
        }
    } catch (e) {
        console.error("[org-manifest] Supabase fetch error:", e);
    }

    const startUrl  = `/${orgSlug}/campus`;
    const shortName = orgName.length > 12 ? orgName.slice(0, 12) + "…" : orgName;

    const icons = orgLogo
        ? [
            { src: orgLogo,      sizes: "any",    type: "image/png", purpose: "any" },
            { src: orgLogo,      sizes: "any",    type: "image/png", purpose: "maskable" },
            { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          ]
        : [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ];

    const manifest = {
        name: orgName,
        short_name: shortName,
        description: `${orgName} — Application scolaire CampusFlow. Accédez à vos cours, notes, paiements et messagerie.`,
        start_url: startUrl,
        id: startUrl,
        scope: `/${orgSlug}/`,
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        orientation: "portrait",
        background_color: "#0B0E14",
        theme_color: "#14B8A6",
        lang: "fr",
        dir: "ltr",
        categories: ["education", "productivity"],
        icons,
        shortcuts: [
            {
                name: "Campus",
                short_name: "Campus",
                description: `Accéder au campus ${orgName}`,
                url: startUrl,
                icons: [{ src: orgLogo || "/icon-192.png", sizes: "192x192" }],
            },
        ],
        prefer_related_applications: false,
        related_applications: [],
    };

    return new Response(JSON.stringify(manifest, null, 2), {
        headers: {
            "Content-Type": "application/manifest+json",
            "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
            "Vary": "Accept-Language",
        },
    });
}

function defaultManifest(startUrl: string) {
    return JSON.stringify({
        name: "CampusFlow",
        short_name: "CampusFlow",
        description: "CampusFlow — Plateforme SaaS de gestion scolaire multi-tenant.",
        start_url: startUrl,
        id: startUrl,
        display: "standalone",
        background_color: "#0B0E14",
        theme_color: "#14B8A6",
        lang: "fr",
        icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        ],
        prefer_related_applications: false,
        related_applications: [],
    }, null, 2);
}

export const config = { path: "/:orgSlug/manifest.webmanifest" };
