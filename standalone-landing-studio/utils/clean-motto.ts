/**
 * Nettoie le slogan ou titre pour éliminer les mentions parasites
 */
export function cleanMotto(text: string | null | undefined, fallback: string = ''): string {
    if (!text || typeof text !== 'string') return fallback;

    let cleaned = text
        .replace(/Établissement d['’]Élite piloté par Dame SKY\s*[·•-]?\s*/gi, '')
        .replace(/Établissement d['’]Élite\s*[·•-]?\s*/gi, '')
        .replace(/piloté par Dame SKY\s*[·•-]?\s*/gi, '')
        .replace(/Dame SKY\s*[·•-]?\s*/gi, '')
        .trim();

    cleaned = cleaned.replace(/^[·•\-\s|]+/, '').replace(/[·•\-\s|]+$/, '').trim();

    return cleaned || fallback;
}
