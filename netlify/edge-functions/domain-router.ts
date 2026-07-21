/**
 * CampusFlow — Custom Domain Router (Netlify Edge Function)
 *
 * Problem: The app is a static export. When a school uses its own domain
 * (e.g., ecole.example.com), the URL has no /:orgSlug/ prefix.
 * Netlify's static redirects can't distinguish custom domains from the
 * platform domain (campusflow.netlify.app).
 *
 * Solution: This edge function runs before Netlify redirects. It detects
 * custom domains and internally rewrites paths to include `/_/` prefix,
 * so the existing `/:orgSlug/*` → `/_/*/index.html` redirect rules match.
 *
 * Example:
 *   ecole.example.com/campus/  →  (internal rewrite)  /_/campus/
 *   Then Netlify redirect:  /_/campus/  matches  /:orgSlug/campus/*  ✓
 */

import type { Config, Context } from "@netlify/edge-functions";

const PLATFORM_DOMAINS = [
    "campusflow.netlify.app",
    "campusfl.netlify.app",
    "campusflow.app",
];

// Sub-paths that exist inside an org context
const ORG_SUB_PATHS = [
    "campus",
    "admin",
    "login",
    "library",
    "shop",
    "messages",
    "student",
    "prof",
    "f",
];

export default async function handler(request: Request, context: Context) {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // ─── Platform domain or localhost → pass through to normal Netlify redirects ───
    if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        PLATFORM_DOMAINS.some((d) => hostname.endsWith(d))
    ) {
        return context.next();
    }

    // ─── Custom domain detected ───────────────────────────────────────────────────
    const pathname = url.pathname;

    // Already rewritten (has /_/ prefix) — shouldn't happen but guard anyway
    if (pathname.startsWith("/_/")) {
        return context.next();
    }

    const segments = pathname.split("/").filter(Boolean);
    const firstSegment = segments[0] || "";

    // Root path → rewrite to /_/
    if (pathname === "/" || pathname === "") {
        const rewritten = new URL(request.url);
        rewritten.pathname = "/_/";
        return context.rewrite(rewritten.toString());
    }

    // Known org sub-path → rewrite to /_/<path>
    if (ORG_SUB_PATHS.includes(firstSegment)) {
        const rewritten = new URL(request.url);
        rewritten.pathname = `/_${pathname}`;
        return context.rewrite(rewritten.toString());
    }

    // Unknown path → pass through (may be /_next/static, etc.)
    return context.next();
}

export const config: Config = {
    path: "/*",
};
