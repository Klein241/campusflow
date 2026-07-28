/**
 * ⚠️ CE FICHIER EST INACTIF EN PRODUCTION
 *
 * CampusFlow utilise `output: "export"` dans next.config.ts (SPA statique).
 * Next.js n'exécute PAS le middleware en mode export statique.
 *
 * Le routage des domaines custom est géré par :
 *   netlify/edge-functions/domain-router.ts
 *
 * Ce fichier est conservé à titre de référence uniquement.
 * Ne pas y ajouter de logique d'accès — elle serait silencieusement ignorée.
 *
 * Référence : https://nextjs.org/docs/app/building-your-application/deploying/static-exports
 */

// Middleware inactif — voir netlify/edge-functions/domain-router.ts
export function middleware() {
    // No-op: not executed in static export mode
}

export const config = {
    matcher: [],
};
