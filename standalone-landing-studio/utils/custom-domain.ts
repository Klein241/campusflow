/**
 * Utilitaire de gestion des routes et domaines
 */

export function orgPath(orgSlug: string, path: string = ''): string {
    const clean = path.replace(/^\/+/, '');
    if (!orgSlug) return clean ? `/${clean}` : '/';
    return clean ? `/${orgSlug}/${clean}` : `/${orgSlug}`;
}

export function isCustomDomain(): boolean {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname.toLowerCase();
    return !['localhost', '127.0.0.1'].includes(h);
}
