/**
 * Service de gestion du déverrouillage progressif (Drip Content) et des périodes de Cursus.
 */

export interface DripItem {
    id?: string;
    unlock_date?: string | null;
    lock_date?: string | null;
    period_name?: string | null;
    is_drip_locked?: boolean | null;
    [key: string]: any;
}

export interface DripStatus {
    isUnlocked: boolean;
    isLockedManually: boolean;
    isLockedByDate: boolean;
    isExpired: boolean;
    formattedUnlockDate?: string;
    formattedLockDate?: string;
    periodName?: string;
    statusBadgeLabel: string;
    statusBadgeColor: 'emerald' | 'amber' | 'rose' | 'slate';
    reason?: string;
}

/**
 * Formate une date ISO en chaîne conviviale en français
 */
export function formatDripDate(isoDate?: string | null): string {
    if (!isoDate) return '';
    try {
        const d = new Date(isoDate);
        if (isNaN(d.getTime())) return '';
        return new Intl.DateTimeFormat('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(d);
    } catch {
        return '';
    }
}

export interface DripContext {
    enrolledAt?: string | Date | null;
    durationMonths?: number | null;
    chapterIndex?: number;
    totalChapters?: number;
}

/**
 * Détermine si un chapitre ou une leçon est déverrouillé(e) pour les étudiants.
 * Prend en compte le contexte de session de l'étudiant (ex: session intensive 1 mois ou 3 mois)
 * pour éviter qu'une planification sur 6 mois ne bloque un étudiant ayant souscrit pour 1 ou 3 mois.
 */
export function isContentUnlocked(
    item: DripItem,
    now: Date = new Date(),
    context?: DripContext
): DripStatus {
    const isLockedManually = Boolean(item.is_drip_locked);
    const nowMs = now.getTime();

    let isLockedByDate = false;
    let isExpired = false;
    let formattedUnlockDate = '';
    let formattedLockDate = '';

    // Détection d'un déverrouillage accéléré pour les sessions courtes (1 mois ou 3 mois)
    const isShortSession = Boolean(
        context?.durationMonths && context.durationMonths < 6
    );

    if (item.unlock_date) {
        const unlockMs = new Date(item.unlock_date).getTime();
        if (!isNaN(unlockMs) && unlockMs > nowMs) {
            // Si l'étudiant est dans une session courte (ex: 1 mois ou 3 mois) avec une date d'inscription
            let adaptedByShortSession = false;
            if (isShortSession && context?.enrolledAt) {
                const enrolledMs = new Date(context.enrolledAt).getTime();
                if (!isNaN(enrolledMs)) {
                    const elapsedDays = Math.max(0, (nowMs - enrolledMs) / (1000 * 60 * 60 * 24));
                    const totalDays = (context.durationMonths || 1) * 30;
                    const totalCh = Math.max(1, context.totalChapters || 6);
                    const chIdx = Math.max(0, context.chapterIndex || 0);

                    // Cadence adaptée : les chapitres se débloquent tous les (totalDays / totalCh) jours
                    const daysPerChapter = totalDays / totalCh;
                    const requiredDays = chIdx * daysPerChapter;

                    if (elapsedDays >= requiredDays) {
                        adaptedByShortSession = true;
                    }
                }
            }

            if (!adaptedByShortSession) {
                isLockedByDate = true;
                formattedUnlockDate = formatDripDate(item.unlock_date);
            }
        }
    }

    if (item.lock_date) {
        const lockMs = new Date(item.lock_date).getTime();
        if (!isNaN(lockMs) && lockMs <= nowMs) {
            isExpired = true;
            formattedLockDate = formatDripDate(item.lock_date);
        }
    }

    const isUnlocked = !isLockedManually && !isLockedByDate && !isExpired;
    const periodName = item.period_name?.trim() || undefined;

    let reason = '';
    let statusBadgeLabel = '🔓 Déverrouillé';
    let statusBadgeColor: 'emerald' | 'amber' | 'rose' | 'slate' = 'emerald';

    if (isLockedManually) {
        reason = 'Contenu verrouillé par le formateur';
        statusBadgeLabel = '🔒 Verrouillé';
        statusBadgeColor = 'rose';
    } else if (isLockedByDate) {
        reason = `Disponible le ${formattedUnlockDate}${periodName ? ` (${periodName})` : ''}`;
        statusBadgeLabel = `⏳ Débloque le ${formattedUnlockDate}`;
        statusBadgeColor = 'amber';
    } else if (isExpired) {
        reason = `Période terminée depuis le ${formattedLockDate}`;
        statusBadgeLabel = `⌛ Expiré`;
        statusBadgeColor = 'slate';
    } else if (periodName) {
        statusBadgeLabel = `🔓 ${periodName}`;
        statusBadgeColor = 'emerald';
    }

    return {
        isUnlocked,
        isLockedManually,
        isLockedByDate,
        isExpired,
        formattedUnlockDate,
        formattedLockDate,
        periodName,
        statusBadgeLabel,
        statusBadgeColor,
        reason,
    };
}

/**
 * Récupère l'ensemble des IDs de classes associées à un profil étudiant (classe principale + classes secondaires)
 */
export function getStudentClassroomIds(student: {
    classroom_id?: string | null;
    additional_classroom_ids?: string[] | null;
} | null): string[] {
    if (!student) return [];
    const ids = new Set<string>();
    if (student.classroom_id) ids.add(student.classroom_id);
    if (Array.isArray(student.additional_classroom_ids)) {
        student.additional_classroom_ids.forEach(id => {
            if (id && typeof id === 'string') ids.add(id);
        });
    }
    return Array.from(ids);
}
