/**
 * CampusFlow - Custom Domain Router (Netlify Edge Function)
 *
 * Problem: The app is a static export. When a school uses its own domain
 * (e.g., ecole.example.com), the URL has no /:orgSlug/ prefix.
 * Netlify's static redirects can't distinguish custom domains from the
 * platform domain (campusflow.netlify.app).
 *
 * Solution: This edge function runs before Netlify redirects. It detects
 * custom domains and internally rewrites paths to include /_/ prefix,
 * so the existing /:orgSlug/* redirect rules match.
 *
 * Example:
 *   ecole.example.com/campus/  =>  (internal rewrite)  /_/campus/
 *   Then Netlify redirect: /_/campus/  matches  /:orgSlug/campus/*
 */

// NOTE: No template literals used — Deno eszip bundler requires plain string concatenation.

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

export default async function handler(request, context) {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // Platform domain or localhost -> pass through to normal Netlify redirects
    if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        PLATFORM_DOMAINS.some(function(d) { return hostname.endsWith(d); })
    ) {
        return context.next();
    }

    // Custom domain detected
    const pathname = url.pathname;

    // Already rewritten (has /_/ prefix) - guard
    if (pathname.startsWith("/_/")) {
        return context.next();
    }

    const segments = pathname.split("/").filter(Boolean);
    const firstSegment = segments[0] || "";

    // Root path -> rewrite to /_/
    if (pathname === "/" || pathname === "") {
        const rewritten = new URL(request.url);
        rewritten.pathname = "/_/";
        return context.rewrite(rewritten.toString());
    }

    // Known org sub-path -> rewrite to /_/<path>
    // Use string concatenation instead of template literals (Deno eszip compat)
    if (ORG_SUB_PATHS.indexOf(firstSegment) !== -1) {
        const rewritten = new URL(request.url);
        rewritten.pathname = "/_" + pathname;
        return context.rewrite(rewritten.toString());
    }

    // Unknown path -> pass through (static assets, etc.)
    return context.next();
}

export const config = {
    path: "/*",
};
