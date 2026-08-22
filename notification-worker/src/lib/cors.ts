/**
 * CORS and HTTP response utilities
 */

export const CORS_HEADERS: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Custom-Domain, X-Org-Slug, X-Admin-Key, X-User-Id, X-CampusFlow-Token, x-agent-key, x-superadmin-key',
    'Access-Control-Max-Age': '86400',
};

export function handleCors(): Response {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
    });
}

export function json(data: any, status = 200, extraHeaders: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS,
            ...extraHeaders,
        },
    });
}

export const jsonResponse = json;

export function errorResponse(message: string, status = 400): Response {
    return json({ error: message, success: false }, status);
}

export function getUserId(request: Request): string | null {
    return request.headers.get('X-User-Id') || null;
}
