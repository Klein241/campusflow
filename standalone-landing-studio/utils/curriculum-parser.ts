/**
 * curriculum-parser.ts
 * Utilitaire pour extraire et structurer la Présentation & les Modules d'une offre / formation
 */

export interface ParsedModuleItem {
    num: number;
    title: string;
}

export interface ParsedCurriculum {
    intro: string;
    modules: ParsedModuleItem[];
}

export const SAMPLE_CURRICULUM_TEMPLATE = `NIVEAU 1 — FONDAMENTAUX ET PRATIQUE PROFESSIONNELLE

Développez les compétences clés et maîtrisez les bases indispensables pour réussir dans votre domaine d'activité.
À travers ce parcours complet, vous apprendrez à :
- Maîtriser les concepts fondamentaux et les méthodologies professionnelles.
- Appliquer les bonnes pratiques et les outils de référence du secteur.
- Conduire un projet pratique étape par étape avec rigueur et autonomie.
- Valider vos acquis à travers des mises en situation concrètes.

Programme des modules :
Module 1 — Introduction et fondamentaux du domaine
Module 2 — Méthodes, outils et environnement de travail
Module 3 — Pratique guidée et cas d'usage concrets
Module 4 — Approfondissement et techniques avancées
Module 5 — Projet pratique et mise en application
Module 6 — Évaluation finale et certification professionnelle
Module complémentaire — Innovation, méthodologie et perspectives d'avenir`;

/**
 * Analyse le texte brut d'une offre pour séparer :
 * 1. L'introduction et les objectifs pédagogiques
 * 2. La liste structurée des modules (numéro + titre)
 */
export function extractContentAndCurriculum(text: string): ParsedCurriculum {
    if (!text || !text.trim()) {
        return { intro: '', modules: [] };
    }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const introLines: string[] = [];
    const modules: ParsedModuleItem[] = [];

    const headerRegex = /^(programme|programme des modules|programme de formation|modules|ateliers|étapes|cursus|sommaire|au programme|contenu des modules)\s*[:\-—]?/i;
    
    const moduleHeaderIndex = lines.findIndex(l => headerRegex.test(l) || l === '---');
    const firstModuleIndex = lines.findIndex(l => /^(?:[-•*]\s*)?(?:module|atelier|étape|semaine)\s*1\b/i.test(l));

    const splitIndex = moduleHeaderIndex !== -1 
        ? moduleHeaderIndex 
        : (firstModuleIndex !== -1 ? firstModuleIndex : -1);

    if (splitIndex !== -1) {
        for (let i = 0; i < splitIndex; i++) {
            introLines.push(lines[i]);
        }
        const moduleLines = lines.slice(splitIndex);
        let currentNum = 1;

        for (const line of moduleLines) {
            if (headerRegex.test(line) || line === '---') continue;

            const mMatch = line.match(/^(?:[-•*]\s*)?(?:module|atelier|étape|semaine)\s*(\d+)\s*[:\-—]?\s*(.*)$/i);
            if (mMatch) {
                const num = parseInt(mMatch[1], 10);
                const title = mMatch[2]?.trim() || `Module ${num}`;
                modules.push({ num, title });
                currentNum = num + 1;
            } else if (line.match(/^[-•*]\s*(.+)$/)) {
                const bulletTitle = line.replace(/^[-•*]\s*/, '').trim();
                modules.push({ num: currentNum++, title: bulletTitle });
            } else if (line.length > 3) {
                modules.push({ num: currentNum++, title: line });
            }
        }
    } else {
        introLines.push(...lines);
    }

    return {
        intro: introLines.join('\n\n'),
        modules
    };
}
