/**
 * curriculum-parser.ts
 * Utilitaire pour extraire et structurer la Présentation & les Modules d'une offre
 * Utilisé à la fois sur la Landing Page (Template Segmenté Hub) et dans le Backoffice Formateur.
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

    // Détection d'un en-tête explicite marquant le début du programme
    const headerRegex = /^(programme|programme des modules|programme de formation|modules|ateliers|étapes|cursus|sommaire|au programme|contenu des modules)\s*[:\-—]?/i;
    
    const moduleHeaderIndex = lines.findIndex(l => headerRegex.test(l) || l === '---');
    const firstModuleIndex = lines.findIndex(l => /^(?:[-•*]\s*)?(?:module|atelier|étape|semaine)\s*1\b/i.test(l));

    const splitIndex = moduleHeaderIndex !== -1 
        ? moduleHeaderIndex 
        : (firstModuleIndex !== -1 ? firstModuleIndex : -1);

    if (splitIndex !== -1) {
        // Toutes les lignes avant le séparateur font partie de la présentation / objectifs
        introLines.push(...lines.slice(0, splitIndex));

        // Toutes les lignes après le séparateur sont des modules
        const moduleLines = lines.slice(splitIndex);
        for (const line of moduleLines) {
            // Ignorer la ligne d'en-tête elle-même (ex: "Programme des modules :")
            if (headerRegex.test(line) || line === '---') {
                continue;
            }

            // Nettoyer la puce éventuelle ou le numéro initial
            const cleanLine = line
                .replace(/^[-•*]\s*/, '')
                .replace(/^\d+[\.\-\)]\s*/, '')
                .trim();

            if (!cleanLine) continue;

            // Détection du numéro de module si spécifié
            const numMatch = cleanLine.match(/^(?:module|atelier|étape|semaine)\s*(\d+)/i) || line.match(/^(\d+)[\.\-\)]/);
            const num = numMatch ? parseInt(numMatch[1], 10) : (modules.length + 1);

            modules.push({
                num,
                title: cleanLine
            });
        }
    } else {
        // Aucune séparation explicite trouvée : recherche ligne par ligne
        let inModuleSection = false;

        for (const line of lines) {
            const matchNumbered = line.match(/^(\d+)[\.\-\)]\s*(.+)/);
            const matchModule = line.match(/^(?:module|atelier|partie|étape|semaine)\s*(\d+)?\s*[:\-—]?\s*(.+)/i);

            if (matchModule || matchNumbered) {
                inModuleSection = true;
                const num = matchModule?.[1]
                    ? parseInt(matchModule[1], 10)
                    : (matchNumbered ? parseInt(matchNumbered[1], 10) : modules.length + 1);

                const clean = line.replace(/^[-•*]\s*/, '').trim();
                modules.push({ num, title: clean });
            } else if (inModuleSection) {
                const clean = line.replace(/^[-•*]\s*/, '').trim();
                modules.push({ num: modules.length + 1, title: clean });
            } else {
                introLines.push(line);
            }
        }
    }

    const intro = introLines.length > 0 ? introLines.join('\n') : (modules.length === 0 ? text : '');
    return { intro, modules };
}
