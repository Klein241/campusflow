/**
 * daily-engagement.ts — Daily Retention & Growth Engine (Pinterest & Alibaba Strategy)
 * 
 * Drives daily active usage by delivering high-impact, contextual notifications:
 * - 07:30 Morning Alert: Timetable, today's classes & rooms
 * - 13:00 Noon Alert: New exercises, coursework progress & pending evaluations
 * - 19:00 Evening Alert: Sky Points claim reminder, daily news & achievements
 * 
 * Infallible Multi-Tenant routing: All alerts direct exclusively to the user's school (orgSlug).
 */

interface DailyEngagementOptions {
    userId: string;
    userName: string;
    orgSlug: string;
    orgName: string;
    userRole?: 'student' | 'teacher' | 'admin';
}

const STORAGE_PREFIX = 'cf_daily_engagement_';

function getTodayDateString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function checkAndTriggerDailyEngagement({
    userId,
    userName,
    orgSlug,
    orgName,
    userRole = 'student',
}: DailyEngagementOptions): void {
    if (typeof window === 'undefined' || !userId || !orgSlug) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const today = getTodayDateString();
    const currentHour = new Date().getHours();

    // ── 1. MATIN (07h00 - 11h00) : Emploi du temps & Cours du jour ──
    if (currentHour >= 7 && currentHour < 12) {
        const key = `${STORAGE_PREFIX}morning_${today}_${userId}`;
        if (!localStorage.getItem(key)) {
            localStorage.setItem(key, '1');
            sendLocalEngagementNotification({
                title: `📅 Emploi du temps du jour — ${orgName}`,
                body: `Bonjour ${userName || 'à toi'} ! Tes cours et salles d'aujourd'hui sont prêts sur ton espace.`,
                action_type: 'daily_engagement_morning',
                url: `/${orgSlug}/campus?tab=myspace&subTab=edt`,
                orgSlug,
            });
        }
    }

    // ── 2. MIDI / APRÈS-MIDI (12h00 - 17h00) : Exercices & Cursus ──
    else if (currentHour >= 12 && currentHour < 18) {
        const key = `${STORAGE_PREFIX}noon_${today}_${userId}`;
        if (!localStorage.getItem(key)) {
            localStorage.setItem(key, '1');
            sendLocalEngagementNotification({
                title: `📚 Progression & Exercices — ${orgName}`,
                body: `Continue ton apprentissage ! De nouvelles leçons et exercices t'attendent dans ton cursus.`,
                action_type: 'daily_engagement_noon',
                url: `/${orgSlug}/campus?tab=myspace&subTab=cursus`,
                orgSlug,
            });
        }
    }

    // ── 3. SOIR (18h00 - 22h00) : Sky Points & Actus ──
    else if (currentHour >= 18 && currentHour <= 23) {
        const key = `${STORAGE_PREFIX}evening_${today}_${userId}`;
        if (!localStorage.getItem(key)) {
            localStorage.setItem(key, '1');
            sendLocalEngagementNotification({
                title: `⭐ N'oublie pas tes Sky Points — ${orgName}`,
                body: `Valide ton activité du jour, découvre les dernières annonces et booste ton classement !`,
                action_type: 'daily_engagement_evening',
                url: `/${orgSlug}/campus?tab=actus`,
                orgSlug,
            });
        }
    }
}

/**
 * Dispatch notification through the active Service Worker
 */
function sendLocalEngagementNotification({
    title,
    body,
    action_type,
    url,
    orgSlug,
}: {
    title: string;
    body: string;
    action_type: string;
    url: string;
    orgSlug: string;
}) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            title,
            body,
            url,
            orgSlug,
            action_type,
            tag: `engagement_${action_type}_${Date.now()}`,
        });
    } else if ('Notification' in window && Notification.permission === 'granted') {
        try {
            const notif = new Notification(title, {
                body,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: `engagement_${action_type}_${Date.now()}`,
            });
            notif.onclick = () => {
                window.focus();
                window.location.href = url;
                notif.close();
            };
        } catch (e) {
            // ignore
        }
    }
}
