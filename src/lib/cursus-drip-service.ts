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

/**
 * Détermine si un chapitre ou une leçon est déverrouillé(e) pour les étudiants.
 */
export function isContentUnlocked(item: DripItem, now: Date = new Date()): DripStatus {
    const isLockedManually = Boolean(item.is_drip_locked);
    const nowMs = now.getTime();

    let isLockedByDate = false;
    let isExpired = false;
    let formattedUnlockDate = '';
    let formattedLockDate = '';

    if (item.unlock_date) {
        const unlockMs = new Date(item.unlock_date).getTime();
        if (!isNaN(unlockMs) && unlockMs > nowMs) {
            isLockedByDate = true;
            formattedUnlockDate = formatDripDate(item.unlock_date);
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
