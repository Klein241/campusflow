/**
 * Nettoie toute mention indésirable de "Dame SKY" ou "Établissement d'Élite piloté par Dame SKY"
 * pour garantir une vitrine publique 100% propre, académique et professionnelle.
 */
export function cleanMotto(text: string | null | undefined, fallback: string = ''): string {
    if (!text || typeof text !== 'string') return fallback;

    let cleaned = text
        .replace(/Établissement d['’]Élite piloté par Dame SKY\s*[·•-]?\s*/gi, '')
        .replace(/Établissement d['’]Élite\s*[·•-]?\s*/gi, '')
        .replace(/piloté par Dame SKY\s*[·•-]?\s*/gi, '')
        .replace(/Dame SKY\s*[·•-]?\s*/gi, '')
        .trim();

    // Supprimer les puces, tirets ou séparateurs orphelins au début ou à la fin
    cleaned = cleaned.replace(/^[·•\-\s|]+/, '').replace(/[·•\-\s|]+$/, '').trim();

    return cleaned || fallback;
}
