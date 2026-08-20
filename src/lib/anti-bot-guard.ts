/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ANTI-BOT & HUMAN ACTION RATE-LIMIT GUARD
 * ═══════════════════════════════════════════════════════════════════════════
 * Protège les formulaires de l'application (création leçons, exercices, etc.)
 * contre les scripts et agents automatisés se faisant passer pour un humain.
 *
 * Règle :
 * - Les humains créent du contenu à un rythme naturel (max 1 création toutes les 3s,
 *   et max 8 créations par minute).
 * - Si un script/bot envoie des requêtes en boucle rapide avec des identifiants prof,
 *   il est bloqué immédiatement avec invitation à utiliser la passerelle MCP officielle.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const actionTimestamps: number[] = [];
const MIN_INTERVAL_MS = 2500; // Au moins 2.5 secondes entre 2 créations
const MAX_ACTIONS_PER_MINUTE = 8; // Max 8 créations / minute par session web

export function checkHumanActionRateLimit(actionName = 'création'): { allowed: boolean; reason?: string } {
    const now = Date.now();

    // 1. Nettoyer les timestamps de plus d'une minute
    while (actionTimestamps.length > 0 && now - actionTimestamps[0] > 60000) {
        actionTimestamps.shift();
    }

    // 2. Vérifier l'intervalle minimal avec la dernière action
    const lastAction = actionTimestamps[actionTimestamps.length - 1];
    if (lastAction && (now - lastAction) < MIN_INTERVAL_MS) {
        const waitSec = Math.ceil((MIN_INTERVAL_MS - (now - lastAction)) / 1000);
        return {
            allowed: false,
            reason: `🛑 Vitesse surhumaine détectée (${actionName}). Veuillez patienter ${waitSec}s. Les agents automatisés doivent impérativement utiliser une clé API Sky Agent / MCP.`,
        };
    }

    // 3. Vérifier le quota par minute
    if (actionTimestamps.length >= MAX_ACTIONS_PER_MINUTE) {
        return {
            allowed: false,
            reason: `🛑 Limite de sécurité atteinte (${MAX_ACTIONS_PER_MINUTE} ${actionName}s/min). Pour l'automatisation en masse, utilisez l'API Sky Agent dans le panneau d'administration.`,
        };
    }

    // Autorisé
    actionTimestamps.push(now);
    return { allowed: true };
}
