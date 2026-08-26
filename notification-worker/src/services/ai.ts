/**
 * Cloudflare Workers AI - Meta M2M100 + Llama + Qwen Translations
 */
import { Env } from '../types';

// ══════════════════════════════════════════════════════════
// IZITEACH — MULTILINGUISME & LANGUES AFRICAINES LOCALES
// ══════════════════════════════════════════════════════════

export interface SupportedLanguage {
    code: string;
    name_fr: string;
    name_native: string;
    tier: 1 | 2; // 1 = LLM direct / 2 = M2M100 AI
    m2m_code?: string;
    countries: string[];
    is_african: boolean;
    quality_stars: 1 | 2 | 3 | 4 | 5; // qualité de traduction (1=faible, 5=excellent)
    quality_label: string; // description courte de la qualité
}

export const IZITEACH_SUPPORTED_LANGUAGES: Record<string, SupportedLanguage> = {
    // ── 5 Langues Internationales ── (★★★★★ couverture excellente M2M100)
    fr:  { code: 'fr',  name_fr: 'Français',       name_native: 'Français',     tier: 1, m2m_code: 'fr', countries: ['FR', 'SN', 'CI', 'CM', 'CD', 'MG'], is_african: false, quality_stars: 5, quality_label: 'Excellente' },
    en:  { code: 'en',  name_fr: 'Anglais',         name_native: 'English',      tier: 1, m2m_code: 'en', countries: ['GB', 'US', 'NG', 'GH', 'KE', 'ZA'], is_african: false, quality_stars: 5, quality_label: 'Excellente' },
    ar:  { code: 'ar',  name_fr: 'Arabe',           name_native: 'العربية',      tier: 1, m2m_code: 'ar', countries: ['EG', 'DZ', 'MA', 'TN', 'SD', 'TD'], is_african: false, quality_stars: 5, quality_label: 'Excellente' },
    es:  { code: 'es',  name_fr: 'Espagnol',        name_native: 'Español',      tier: 1, m2m_code: 'es', countries: ['ES', 'GQ'],                          is_african: false, quality_stars: 5, quality_label: 'Excellente' },
    pt:  { code: 'pt',  name_fr: 'Portugais',       name_native: 'Português',    tier: 1, m2m_code: 'pt', countries: ['PT', 'AO', 'MZ', 'GW', 'CV'],        is_african: false, quality_stars: 5, quality_label: 'Excellente' },
    zh:  { code: 'zh',  name_fr: 'Chinois',         name_native: '中文',          tier: 1, m2m_code: 'zh', countries: ['CN', 'TW'],                          is_african: false, quality_stars: 5, quality_label: 'Excellente' },
    ru:  { code: 'ru',  name_fr: 'Russe',           name_native: 'Русский',      tier: 1, m2m_code: 'ru', countries: ['RU'],                                is_african: false, quality_stars: 5, quality_label: 'Excellente' },
    de:  { code: 'de',  name_fr: 'Allemand',        name_native: 'Deutsch',      tier: 1, m2m_code: 'de', countries: ['DE'],                                is_african: false, quality_stars: 5, quality_label: 'Excellente' },
    it:  { code: 'it',  name_fr: 'Italien',         name_native: 'Italiano',     tier: 1, m2m_code: 'it', countries: ['IT'],                                is_african: false, quality_stars: 5, quality_label: 'Excellente' },

    // ── Langues Africaines — Tier 1 (★★★★ bonne couverture M2M100) ──
    sw:  { code: 'sw',  name_fr: 'Swahili',         name_native: 'Kiswahili',    tier: 1, m2m_code: 'sw', countries: ['KE', 'TZ', 'CD', 'UG', 'RW'],        is_african: true,  quality_stars: 4, quality_label: 'Bonne' },
    ha:  { code: 'ha',  name_fr: 'Haoussa',         name_native: 'Hausa',        tier: 1, m2m_code: 'ha', countries: ['NG', 'NE', 'CM'],                    is_african: true,  quality_stars: 4, quality_label: 'Bonne' },
    yo:  { code: 'yo',  name_fr: 'Yoruba',          name_native: 'Yorùbá',       tier: 1, m2m_code: 'yo', countries: ['NG', 'BJ', 'TG'],                    is_african: true,  quality_stars: 4, quality_label: 'Bonne' },
    ig:  { code: 'ig',  name_fr: 'Igbo',            name_native: 'Igbo',         tier: 1, m2m_code: 'ig', countries: ['NG'],                                is_african: true,  quality_stars: 3, quality_label: 'Correcte' },
    am:  { code: 'am',  name_fr: 'Amharique',       name_native: 'አማርኛ',        tier: 1, m2m_code: 'am', countries: ['ET'],                                is_african: true,  quality_stars: 4, quality_label: 'Bonne' },
    zu:  { code: 'zu',  name_fr: 'Zoulou',          name_native: 'isiZulu',      tier: 1, m2m_code: 'zu', countries: ['ZA'],                                is_african: true,  quality_stars: 3, quality_label: 'Correcte' },
    wo:  { code: 'wo',  name_fr: 'Wolof',           name_native: 'Wolof',        tier: 1, m2m_code: 'wo', countries: ['SN', 'GM'],                          is_african: true,  quality_stars: 3, quality_label: 'Correcte' },
    so:  { code: 'so',  name_fr: 'Somali',          name_native: 'Soomaali',     tier: 1, m2m_code: 'so', countries: ['SO', 'DJ', 'ET'],                    is_african: true,  quality_stars: 3, quality_label: 'Correcte' },
    tw:  { code: 'tw',  name_fr: 'Twi (Akan)',      name_native: 'Twi',          tier: 1, m2m_code: 'ak', countries: ['GH'],                                is_african: true,  quality_stars: 3, quality_label: 'Correcte' },

    // ── Langues Africaines — Tier 2 (★★ couverture limitée) ──
    lin: { code: 'lin', name_fr: 'Lingala',          name_native: 'Lingála',      tier: 2, m2m_code: 'ln', countries: ['CD', 'CG'],                          is_african: true,  quality_stars: 2, quality_label: 'Limitée' },
    ful: { code: 'ful', name_fr: 'Fulfulde/Peul',    name_native: 'Fulfulde',     tier: 2, m2m_code: 'ff', countries: ['CM', 'GN', 'ML', 'SN', 'BF', 'NE'], is_african: true,  quality_stars: 2, quality_label: 'Limitée' },
    bam: { code: 'bam', name_fr: 'Bambara',          name_native: 'Bamanankan',   tier: 2, m2m_code: 'bm', countries: ['ML'],                                is_african: true,  quality_stars: 2, quality_label: 'Limitée' },
    kin: { code: 'kin', name_fr: 'Kinyarwanda',      name_native: 'Kinyarwanda',  tier: 2, m2m_code: 'rw', countries: ['RW', 'UG', 'CD'],                   is_african: true,  quality_stars: 3, quality_label: 'Correcte' },
    mlg: { code: 'mlg', name_fr: 'Malgache',         name_native: 'Malagasy',     tier: 2, m2m_code: 'mg', countries: ['MG'],                                is_african: true,  quality_stars: 3, quality_label: 'Correcte' },
    dyu: { code: 'dyu', name_fr: 'Dioula',           name_native: 'Dioula',       tier: 2, m2m_code: 'bm', countries: ['BF', 'CI'],                         is_african: true,  quality_stars: 2, quality_label: 'Limitée' },
    bci: { code: 'bci', name_fr: 'Baoulé',           name_native: 'Baoulé',       tier: 2, m2m_code: 'ak', countries: ['CI'],                                is_african: true,  quality_stars: 2, quality_label: 'Limitée' },
    dje: { code: 'dje', name_fr: 'Zarma',            name_native: 'Zarma',        tier: 2, m2m_code: 'ha', countries: ['NE'],                                is_african: true,  quality_stars: 2, quality_label: 'Limitée' },
    ewo: { code: 'ewo', name_fr: 'Ewondo',           name_native: 'Ewondo',       tier: 2, m2m_code: 'ln', countries: ['CM'],                                is_african: true,  quality_stars: 1, quality_label: 'Expérimentale' },
    dua: { code: 'dua', name_fr: 'Duala',            name_native: 'Duala',        tier: 2, m2m_code: 'ln', countries: ['CM'],                                is_african: true,  quality_stars: 1, quality_label: 'Expérimentale' },
    fan: { code: 'fan', name_fr: 'Beti-Fang',        name_native: 'Fang',         tier: 2, m2m_code: 'ln', countries: ['CM', 'GA', 'GQ'],                   is_african: true,  quality_stars: 1, quality_label: 'Expérimentale' },
    nya: { code: 'nya', name_fr: 'Chichewa',         name_native: 'ChiCheŵa',     tier: 2, m2m_code: 'ny', countries: ['MW', 'ZM', 'MZ'],                   is_african: true,  quality_stars: 3, quality_label: 'Correcte' },
    sna: { code: 'sna', name_fr: 'Shona',            name_native: 'chiShona',     tier: 2, m2m_code: 'sn', countries: ['ZW', 'MZ'],                         is_african: true,  quality_stars: 3, quality_label: 'Correcte' },
    xho: { code: 'xho', name_fr: 'Xhosa',            name_native: 'isiXhosa',     tier: 2, m2m_code: 'xh', countries: ['ZA'],                               is_african: true,  quality_stars: 3, quality_label: 'Correcte' },
    orm: { code: 'orm', name_fr: 'Oromo',            name_native: 'Afaan Oromoo', tier: 2, m2m_code: 'om', countries: ['ET', 'KE'],                         is_african: true,  quality_stars: 2, quality_label: 'Limitée' },
    tir: { code: 'tir', name_fr: 'Tigrigna',         name_native: 'ትግርኛ',        tier: 2, m2m_code: 'ti', countries: ['ER', 'ET'],                         is_african: true,  quality_stars: 2, quality_label: 'Limitée' },
    lug: { code: 'lug', name_fr: 'Luganda',          name_native: 'Oluganda',     tier: 2, m2m_code: 'lg', countries: ['UG'],                               is_african: true,  quality_stars: 2, quality_label: 'Limitée' },
    run: { code: 'run', name_fr: 'Kirundi',          name_native: 'Ikirundi',     tier: 2, m2m_code: 'rw', countries: ['BI'],                               is_african: true,  quality_stars: 3, quality_label: 'Correcte' },
};

function hasRepetitiveLoop(text: string): boolean {
    if (!text || text.length < 30) return false;
    // Détecte répétition d'un même mot 4x d'affilée ("masoko ya masoko ya masoko ya masoko")
    if (/\b(\w{3,})\b(?:\s+\b\1\b){3,}/i.test(text)) return true;
    // Détecte répétition de segment identique 3x
    if (/(.{8,30}?)\1{3,}/i.test(text)) return true;
    return false;
}

export async function translateTextWithAi(
    env: Env,
    text: string,
    targetLangCode: string,
    sourceLangCode = 'fr'
): Promise<{ translated_text: string; method: string; note?: string; language_info?: SupportedLanguage }> {
    const rawTarget = (targetLangCode || 'fr').toLowerCase().trim();
    const langInfo = IZITEACH_SUPPORTED_LANGUAGES[rawTarget] || {
        code: rawTarget,
        name_fr: rawTarget.toUpperCase(),
        name_native: rawTarget.toUpperCase(),
        tier: 2,
        countries: [],
        is_african: true,
    };

    if (rawTarget === sourceLangCode || (rawTarget === 'fr' && sourceLangCode === 'fr')) {
        return { translated_text: text, method: 'original', language_info: langInfo };
    }

    if (env.AI && typeof env.AI.run === 'function') {
        const langName = langInfo.name_fr;
        const nativeName = langInfo.name_native || rawTarget;
        const promptInstruction = `Translate the following educational course text accurately from ${sourceLangCode.toUpperCase()} into ${langName} (${nativeName}).
Strict rules:
1. Output ONLY the translated text in fluent ${nativeName} (${langName}).
2. Do not repeat words or hallucinate.
3. Keep code and markdown formatting intact.

Text:
${text.slice(0, 3000)}`;

        // 1️⃣ Essai Meta LLaMA 3.1 8B Instruct (avec prompt direct et messages)
        try {
            const aiRes: any = await env.AI.run('@cf/meta/llama-3.1-8b-instruct' as any, {
                prompt: promptInstruction,
                max_tokens: 2048,
            });
            const out = aiRes?.response?.trim() || aiRes?.translated_text?.trim() || '';
            if (out && out.length > 10 && !hasRepetitiveLoop(out)) {
                return {
                    translated_text: out,
                    method: 'cloudflare_llama3_1',
                    language_info: langInfo,
                    note: `Traduit avec succès en ${langName} (${nativeName}) via Meta LLaMA 3.1.`,
                };
            }
        } catch (e: any) {
            console.warn('[Translate LLaMA 3.1]', e?.message || e);
        }

        // 2️⃣ Essai Meta LLaMA 3 8B Instruct
        try {
            const aiRes: any = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
                prompt: promptInstruction,
                max_tokens: 2048,
            });
            const out = aiRes?.response?.trim() || '';
            if (out && out.length > 10 && !hasRepetitiveLoop(out)) {
                return {
                    translated_text: out,
                    method: 'cloudflare_llama3',
                    language_info: langInfo,
                    note: `Traduit en ${langName} via Meta LLaMA 3.`,
                };
            }
        } catch (e: any) {
            console.warn('[Translate LLaMA 3]', e?.message || e);
        }

        // 3️⃣ Essai Qwen 1.5 7B Chat
        try {
            const aiRes: any = await env.AI.run('@cf/qwen/qwen1.5-7b-chat' as any, {
                prompt: promptInstruction,
                max_tokens: 2048,
            });
            const out = aiRes?.response?.trim() || '';
            if (out && out.length > 10 && !hasRepetitiveLoop(out)) {
                return {
                    translated_text: out,
                    method: 'cloudflare_qwen',
                    language_info: langInfo,
                    note: `Traduit en ${langName} via Qwen.`,
                };
            }
        } catch (e: any) {
            console.warn('[Translate Qwen]', e?.message || e);
        }

        // 4️⃣ Essai M2M100 sécurisé paragraphe par paragraphe (évite les boucles de répétition)
        try {
            const m2mTarget = langInfo.m2m_code || rawTarget;
            const m2mSource = IZITEACH_SUPPORTED_LANGUAGES[sourceLangCode]?.m2m_code || sourceLangCode;
            const paragraphs = text.split('\n\n');
            const translated: string[] = [];

            for (const p of paragraphs) {
                const trimmed = p.trim();
                if (!trimmed) {
                    translated.push('');
                    continue;
                }
                if (trimmed.startsWith('#') || trimmed.startsWith('```') || trimmed.length < 5) {
                    translated.push(p);
                    continue;
                }
                const res: any = await env.AI.run('@cf/meta/m2m100-1.2b', {
                    text: trimmed.slice(0, 600),
                    source_lang: m2mSource,
                    target_lang: m2mTarget,
                });
                const outP = res?.translated_text?.trim() || '';
                if (outP && !hasRepetitiveLoop(outP)) {
                    translated.push(outP);
                } else {
                    translated.push(p);
                }
            }

            const fullText = translated.join('\n\n');
            if (fullText && fullText.length > 10 && fullText !== text) {
                return {
                    translated_text: fullText,
                    method: 'cloudflare_m2m100_segmented',
                    language_info: langInfo,
                    note: `Traduit en ${langName} (${nativeName}) via M2M100 segmenté.`,
                };
            }
        } catch (e: any) {
            console.warn('[Translate M2M100 segmenté]', e?.message || e);
        }
    }

    return {
        translated_text: text,
        method: 'original_preserved',
        language_info: langInfo,
        note: `Traduction automatique indisponible pour ${langInfo.name_fr}. Vous pouvez injecter une traduction manuelle contrôlée via custom_translated_text.`
    };
}
