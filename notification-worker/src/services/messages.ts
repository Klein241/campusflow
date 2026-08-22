/**
 * Notification Message Builder, Deep-Links & Preferences
 */
import { NotificationActionType, Priority, Env, NotifyPayload } from '../types';
import { SupabaseClient } from './supabase';

const AGGREGATION_WINDOWS: Partial<Record<NotificationActionType, number>> = {
    prayer_prayed: 30 * 60,        // 30 min
    friend_prayed: 60 * 60,        // 1h
    prayer_comment: 15 * 60,       // 15 min
    // Aliases modernes
    support_received: 30 * 60,
    friend_supported: 60 * 60,
    support_comment: 15 * 60,
    // Stories — agrégation likes (30 min)
    story_liked: 30 * 60,
    story_commented: 15 * 60,
    // Actus
    actu_liked: 30 * 60,
    actu_commented: 15 * 60,
    group_access_request: 60 * 60, // 1h
    group_new_message: 5 * 60,     // 5 min
    dm_new_message: 3 * 60,        // 3 min
    group_invitation: 60 * 60,     // 1h
    // Cursus & School types — no aggregation (each event is unique)
};

const DEFAULT_PREFERENCES: Record<NotificationActionType, { in_app: boolean; push: boolean }> = {
    prayer_prayed: { in_app: true, push: true },
    friend_prayed: { in_app: true, push: false },
    new_prayer_published: { in_app: true, push: false },
    prayer_comment: { in_app: true, push: true },
    prayer_no_response: { in_app: false, push: true },
    // Aliases modernes
    support_received: { in_app: true, push: true },
    friend_supported: { in_app: true, push: false },
    new_support_published: { in_app: true, push: false },
    support_comment: { in_app: true, push: true },
    support_no_response: { in_app: false, push: true },
    // Stories
    story_published: { in_app: true, push: false },
    story_liked: { in_app: true, push: false },
    story_commented: { in_app: true, push: true },
    story_reposted: { in_app: true, push: true },
    // Actus
    actu_published: { in_app: true, push: false },
    actu_liked: { in_app: true, push: false },
    actu_commented: { in_app: true, push: true },
    // Cursus
    new_subject: { in_app: true, push: true },
    new_chapter: { in_app: true, push: true },
    new_lesson: { in_app: true, push: true },
    new_exercise: { in_app: true, push: true },
    group_access_request: { in_app: true, push: true },
    group_access_approved: { in_app: true, push: true },
    group_new_message: { in_app: true, push: true },
    admin_new_group: { in_app: true, push: true },
    group_invitation: { in_app: true, push: true },
    group_mention: { in_app: true, push: true },
    dm_new_message: { in_app: true, push: true },
    friend_request_received: { in_app: true, push: true },
    friend_request_accepted: { in_app: true, push: false },
    new_book_published: { in_app: true, push: true },
    // ── School-specific defaults ──
    grade_published: { in_app: true, push: true },
    evaluation_scheduled: { in_app: true, push: true },
    payment_confirmed: { in_app: true, push: true },
    discipline_sanction: { in_app: true, push: true },
    timetable_change: { in_app: true, push: true },
    admin_announcement: { in_app: true, push: true },
    evaluation_reminder: { in_app: true, push: true },
    exercise_reminder:   { in_app: true, push: true },
    // ── Admin-specific ──
    admin_new_inscription:   { in_app: true, push: true },
    admin_new_payment:       { in_app: true, push: true },
    admin_exam_submitted:    { in_app: true, push: true },
    admin_discipline_alert:  { in_app: true, push: true },
    // ── SuperAdmin-specific ──
    superadmin_new_org:      { in_app: true, push: true },
    superadmin_sky_request:  { in_app: true, push: true },
    superadmin_health_alert: { in_app: true, push: true },
    // ── Daily Engagement ──
    daily_engagement_morning: { in_app: false, push: true },
    daily_engagement_noon:    { in_app: false, push: true },
    daily_engagement_evening: { in_app: false, push: true },
    general: { in_app: true, push: false },
};

const PRIORITY_MAP: Record<NotificationActionType, Priority> = {
    prayer_prayed: 'high',
    friend_prayed: 'low',
    new_prayer_published: 'medium',
    prayer_comment: 'high',
    prayer_no_response: 'low',
    support_received: 'high',
    friend_supported: 'low',
    new_support_published: 'medium',
    support_comment: 'high',
    support_no_response: 'low',
    story_published: 'low',
    story_liked: 'low',
    story_commented: 'medium',
    story_reposted: 'medium',
    actu_published: 'low',
    actu_liked: 'low',
    actu_commented: 'medium',
    new_subject: 'high',
    new_chapter: 'medium',
    new_lesson: 'medium',
    new_exercise: 'high',
    group_access_request: 'high',
    group_access_approved: 'high',
    group_new_message: 'medium',
    admin_new_group: 'high',
    group_invitation: 'high',
    group_mention: 'high',
    dm_new_message: 'high',
    friend_request_received: 'high',
    friend_request_accepted: 'high',
    new_book_published: 'medium',
    grade_published: 'high',
    evaluation_scheduled: 'high',
    payment_confirmed: 'high',
    discipline_sanction: 'high',
    timetable_change: 'medium',
    admin_announcement: 'high',
    evaluation_reminder: 'high',
    exercise_reminder: 'high',
    // ── Admin ──
    admin_new_inscription:   'high',
    admin_new_payment:       'high',
    admin_exam_submitted:    'medium',
    admin_discipline_alert:  'high',
    // ── SuperAdmin ──
    superadmin_new_org:      'high',
    superadmin_sky_request:  'high',
    superadmin_health_alert: 'high',
    // ── Daily Engagement ──
    daily_engagement_morning: 'medium',
    daily_engagement_noon:    'medium',
    daily_engagement_evening: 'low',
    general: 'low',
};

// ══════════════════════════════════════════════════════════
// MESSAGE BUILDER
// ══════════════════════════════════════════════════════════

function buildNotificationMessage(
    actionType: NotificationActionType,
    actors: { name: string }[],
    targetName?: string,
    count?: number,
    preview?: string,
): { title: string; message: string } {
    const actorCount = count || actors.length;
    const first = actors[0]?.name || 'Quelqu\'un';
    const second = actors[1]?.name;

    function formatActors(): string {
        if (actorCount === 1) return first;
        if (actorCount === 2) return `${first} et ${second}`;
        return `${first}, ${second} et ${actorCount - 2} autre${actorCount - 2 > 1 ? 's' : ''}`;
    }

    const short = (s?: string, len = 60) => s ? (s.length > len ? s.substring(0, len) + '…' : s) : '';

    switch (actionType) {
        case 'prayer_prayed':
        case 'support_received':
            if (actorCount === 1) {
                return {
                    title: '🤝 Quelqu\'un vous soutient',
                    message: `${first} a soutenu votre demande : "${short(targetName)}"`,
                };
            }
            return {
                title: '🤝 Plusieurs personnes vous soutiennent',
                message: `${formatActors()} ont soutenu votre demande`,
            };

        case 'friend_prayed':
        case 'friend_supported':
            return {
                title: '🤝 Votre ami vous soutient',
                message: `Votre ami ${first} a aussi soutenu ce sujet`,
            };

        case 'new_prayer_published':
        case 'new_support_published':
            return {
                title: '📢 Nouvelle demande de soutien',
                message: `${first} a publié : "${short(targetName)}"`,
            };

        case 'prayer_comment':
        case 'support_comment':
            if (actorCount === 1) {
                return {
                    title: '💬 Nouveau commentaire',
                    message: `${first} a commenté votre demande de soutien`,
                };
            }
            return {
                title: '💬 Nouveaux commentaires',
                message: `${formatActors()} ont commenté votre demande de soutien`,
            };

        case 'prayer_no_response':
        case 'support_no_response':
            return {
                title: '🔔 Votre demande attend',
                message: 'Votre demande n\'a pas encore reçu de soutien. Le forum est là.',
            };

        case 'group_access_request':
            if (actorCount === 1) {
                return {
                    title: '👥 Nouvelle demande d\'accès',
                    message: `${first} souhaite rejoindre votre groupe ${targetName}`,
                };
            }
            return {
                title: '👥 Demandes d\'accès',
                message: `${formatActors()} souhaitent rejoindre ${targetName}`,
            };

        case 'group_access_approved':
            return {
                title: '✅ Demande approuvée',
                message: `Votre demande d'accès au groupe ${targetName} a été approuvée !`,
            };

        case 'group_new_message':
            if (actorCount === 1) {
                return {
                    title: `💬 ${targetName}`,
                    message: `${first}: ${short(preview, 80)}`,
                };
            }
            return {
                title: `💬 ${targetName}`,
                message: `${first} a envoyé ${actorCount} messages dans ${targetName}`,
            };

        case 'admin_new_group':
            return {
                title: '🌟 Nouveau groupe officiel',
                message: `Nouveau groupe officiel : ${targetName}`,
            };

        case 'group_invitation':
            if (actorCount === 1) {
                return {
                    title: '👥 Invitation à un groupe',
                    message: `${first} vous invite à rejoindre ${targetName}`,
                };
            }
            return {
                title: '👥 Invitations à un groupe',
                message: `${formatActors()} vous invitent à rejoindre ${targetName}`,
            };

        case 'group_mention':
            return {
                title: '🔔 Mention dans un groupe',
                message: `${first} vous a mentionné dans ${targetName} : ${short(preview, 60)}`,
            };

        case 'dm_new_message':
            if (actorCount === 1) {
                return {
                    title: `💬 ${first}`,
                    message: short(preview, 80),
                };
            }
            return {
                title: `💬 ${first}`,
                message: `${first} vous a envoyé ${actorCount} messages`,
            };

        case 'friend_request_received':
            return {
                title: '👋 Demande d\'ami',
                message: `${first} vous a envoyé une demande d'ami`,
            };

        case 'friend_request_accepted':
            return {
                title: '👋 Ami ajouté !',
                message: `${first} a accepté votre demande d'ami`,
            };

        case 'new_book_published':
            return {
                title: '📚 Nouveau livre disponible',
                message: `"${targetName}" vient d'être ajouté aux ressources`,
            };

        // ══════════════════════════════════════════
        // STORY NOTIFICATIONS
        // ══════════════════════════════════════════

        case 'story_published':
            return {
                title: '📸 Nouvelle story',
                message: `${first} a publié une nouvelle story`,
            };

        case 'story_liked':
            if (actorCount === 1) {
                return {
                    title: '❤️ Story aimée',
                    message: `${first} a aimé votre story`,
                };
            }
            return {
                title: '❤️ Stories aimées',
                message: `${formatActors()} ont aimé votre story`,
            };

        case 'story_commented':
            if (actorCount === 1) {
                return {
                    title: '💬 Commentaire sur votre story',
                    message: `${first} : ${short(preview, 70)}`,
                };
            }
            return {
                title: '💬 Commentaires sur votre story',
                message: `${formatActors()} ont commenté votre story`,
            };

        case 'story_reposted':
            return {
                title: '🔁 Story repostée',
                message: `${first} a reposté votre story`,
            };

        // ══════════════════════════════════════════
        // ACTUS NOTIFICATIONS
        // ══════════════════════════════════════════

        case 'actu_published':
            return {
                title: '📰 Nouvelle publication',
                message: `${first} : ${short(preview, 80)}`,
            };

        case 'actu_liked':
            if (actorCount === 1) {
                return {
                    title: '❤️ Publication aimée',
                    message: `${first} a aimé votre publication`,
                };
            }
            return {
                title: '❤️ Publications aimées',
                message: `${formatActors()} ont aimé votre publication`,
            };

        case 'actu_commented':
            if (actorCount === 1) {
                return {
                    title: '💬 Commentaire sur votre publication',
                    message: `${first} : ${short(preview, 70)}`,
                };
            }
            return {
                title: '💬 Commentaires sur votre publication',
                message: `${formatActors()} ont commenté votre publication`,
            };

        // ══════════════════════════════════════════
        // CURSUS NOTIFICATIONS
        // ══════════════════════════════════════════

        case 'new_subject':
            return {
                title: '📚 Nouvelle matière',
                message: `Nouvelle matière disponible : "${targetName}"`,
            };

        case 'new_chapter':
            return {
                title: '📖 Nouveau chapitre',
                message: `${first} a ajouté un chapitre : "${targetName}"`,
            };

        case 'new_lesson':
            return {
                title: '📝 Nouvelle leçon',
                message: `Nouvelle leçon disponible : "${targetName}"`,
            };

        case 'new_exercise':
            return {
                title: '🎯 Nouvel exercice',
                message: `Nouvel exercice disponible : "${targetName}"`,
            };

        // ══════════════════════════════════════════
        // SCHOOL-SPECIFIC NOTIFICATION MESSAGES
        // ══════════════════════════════════════════

        case 'grade_published':
            return {
                title: '📊 Note publiée',
                message: `${first} : ${short(targetName)} — ${short(preview)}`,
            };

        case 'evaluation_scheduled':
            return {
                title: '📝 Nouvelle évaluation',
                message: `${short(targetName)} — ${short(preview)}`,
            };

        case 'evaluation_reminder':
            return {
                title: '⏰ Rappel — Évaluation demain',
                message: `Évaluation prévue demain : "${short(targetName)}" — prépare-toi !`,
            };

        case 'exercise_reminder':
            return {
                title: '⚠️ Exercice non terminé',
                message: `Tu n'as pas encore complété l'exercice "${short(targetName)}" — à faire !`,
            };

        case 'payment_confirmed':
            return {
                title: '💳 Paiement enregistré',
                message: short(preview) || `Paiement confirmé : ${short(targetName)}`,
            };

        case 'discipline_sanction':
            return {
                title: '⚠️ Sanction disciplinaire',
                message: short(preview) || short(targetName),
            };

        case 'timetable_change':
            return {
                title: '📅 Emploi du temps modifié',
                message: short(preview) || `Modification pour ${short(targetName)}`,
            };

        case 'admin_announcement':
            return {
                title: '📢 Annonce de l\'établissement',
                message: short(preview, 100),
            };

        case 'admin_new_inscription':
            return {
                title: '👤 Nouvelle Inscription',
                message: short(preview) || `${first} a soumis un dossier d'inscription.`,
            };

        case 'admin_new_payment':
            return {
                title: '💰 Paiement Reçu',
                message: short(preview) || `Paiement reçu de ${first}.`,
            };

        case 'admin_exam_submitted':
            return {
                title: '📝 Copie soumise',
                message: short(preview) || `${first} a rendu son évaluation "${short(targetName)}".`,
            };

        case 'admin_discipline_alert':
            return {
                title: '⚠️ Alerte disciplinaire',
                message: short(preview) || `Incident signalé pour ${first}.`,
            };

        case 'superadmin_new_org':
            return {
                title: '🏫 Nouvel Établissement',
                message: short(preview) || `"${short(targetName)}" vient de rejoindre CampusFlow.`,
            };

        case 'superadmin_sky_request':
            return {
                title: '⭐ Demande de Sky Points',
                message: short(preview) || `${first} demande une recharge de Sky Points.`,
            };

        case 'superadmin_health_alert':
            return {
                title: '🚨 Alerte Système',
                message: short(preview) || `Incident détecté sur la plateforme.`,
            };

        case 'daily_engagement_morning':
            return {
                title: `📅 Ton emploi du temps — ${short(targetName)}`,
                message: short(preview) || 'Consulte tes cours et salles d\'aujourd\'hui.',
            };

        case 'daily_engagement_noon':
            return {
                title: `📚 Continue ton apprentissage !`,
                message: short(preview) || 'De nouvelles leçons et exercices t\'attendent.',
            };

        case 'daily_engagement_evening':
            return {
                title: `⭐ Collecte tes Sky Points`,
                message: short(preview) || 'Termine ta journée et regarde les actus de l\'école.',
            };

        default:
            return {
                title: 'Notification',
                message: preview || 'Nouvelle notification',
            };
    }
}

// ══════════════════════════════════════════════════════════
// DEEP-LINK BUILDER
// ══════════════════════════════════════════════════════════

function buildActionData(actionType: NotificationActionType, payload: NotifyPayload): Record<string, any> {
    const orgSlug = payload.extra_data?.orgSlug || payload.extra_data?.slug || '';
    const base: Record<string, any> = {
        orgSlug,
        organizationId: payload.extra_data?.organizationId || payload.extra_data?.orgId,
    };

    switch (actionType) {
        case 'prayer_prayed':
        case 'friend_prayed':
        case 'new_prayer_published':
        case 'prayer_comment':
        case 'prayer_no_response':
        case 'support_received':
        case 'friend_supported':
        case 'new_support_published':
        case 'support_comment':
        case 'support_no_response':
            return {
                ...base,
                tab: 'community',
                communityTab: 'support',
                requestId: payload.target_id,
                ...(actionType === 'prayer_comment' || actionType === 'support_comment' ? { scrollToComments: true } : {}),
            };

        case 'group_access_request':
            return {
                ...base,
                tab: 'chat',
                viewState: 'group-detail',
                groupId: payload.target_id,
                groupName: payload.target_name,
                communityTab: 'demandes',
            };

        case 'group_access_approved':
        case 'group_new_message':
            return {
                ...base,
                tab: 'chat',
                viewState: 'group-detail',
                groupId: payload.target_id,
                groupName: payload.target_name,
                communityTab: actionType === 'group_new_message' ? 'chat' : undefined,
            };

        case 'admin_new_group':
            return {
                ...base,
                tab: 'chat',
                viewState: 'groups',
            };

        case 'group_invitation':
            return {
                ...base,
                tab: 'chat',
                viewState: 'group-detail',
                groupId: payload.target_id,
                groupName: payload.target_name,
            };

        case 'group_mention':
            return {
                ...base,
                tab: 'chat',
                viewState: 'group-detail',
                groupId: payload.target_id,
                groupName: payload.target_name,
                communityTab: 'chat',
                scrollToMessage: payload.extra_data?.messageId,
            };

        case 'dm_new_message':
            return {
                ...base,
                tab: 'chat',
                viewState: 'conversation',
                conversationId: payload.target_id,
            };

        case 'friend_request_received':
            return {
                ...base,
                tab: 'contacts',
                viewState: 'friend-requests',
            };

        case 'friend_request_accepted':
            return {
                ...base,
                tab: 'chat',
                viewState: 'conversation',
                conversationId: payload.extra_data?.conversationId,
            };

        case 'new_book_published':
            return {
                ...base,
                tab: 'library',
                bookId: payload.target_id,
            };

        // ── School notes deep-link ──
        case 'grade_published':
            return {
                ...base,
                tab: 'myspace',
                subTab: 'bulletin',
                orgSlug: payload.extra_data?.orgSlug,
            };

        // ── Évaluations → cursus ──
        case 'evaluation_scheduled':
        case 'evaluation_reminder':
            return {
                ...base,
                tab: 'myspace',
                subTab: 'cursus',
                orgSlug: payload.extra_data?.orgSlug,
                targetId: payload.target_id,
            };

        case 'payment_confirmed':
            return {
                ...base,
                tab: 'myspace',
                subTab: 'paiement',
                orgSlug: payload.extra_data?.orgSlug,
            };

        case 'discipline_sanction':
            return {
                ...base,
                tab: 'myspace',
                subTab: 'cursus',
                orgSlug: payload.extra_data?.orgSlug,
            };

        case 'timetable_change':
            return {
                ...base,
                tab: 'myspace',
                subTab: 'schedule',
                orgSlug: payload.extra_data?.orgSlug,
            };

        case 'admin_announcement':
            return {
                ...base,
                tab: 'actus',
                orgSlug: payload.extra_data?.orgSlug,
            };

        // ── Story deep-links ──
        case 'story_published':
        case 'story_liked':
        case 'story_commented':
        case 'story_reposted':
            return {
                ...base,
                tab: 'actus',
                viewState: 'stories',
                storyId: payload.target_id,
            };

        // ── Actus deep-links ──
        case 'actu_published':
        case 'actu_liked':
        case 'actu_commented':
            return {
                ...base,
                tab: 'actus',
                postId: payload.target_id,
                ...(actionType === 'actu_commented' ? { scrollToComments: true } : {}),
            };

        // ── Cursus deep-links ──
        case 'new_subject':
        case 'new_chapter':
        case 'new_lesson':
        case 'new_exercise':
        case 'exercise_reminder':
            return {
                ...base,
                tab: 'myspace',
                subTab: 'cursus',
                targetId: payload.target_id,
            };

        // ── Admin école deep-links ──
        case 'admin_new_inscription':
            return {
                ...base,
                adminRoute: true,
                tab: 'students',
                subTab: 'pending',
                url: orgSlug ? `/${orgSlug}/admin?tab=students&sub=pending` : undefined,
            };

        case 'admin_new_payment':
            return {
                ...base,
                adminRoute: true,
                tab: 'payments',
                url: orgSlug ? `/${orgSlug}/admin?tab=payments` : undefined,
            };

        case 'admin_exam_submitted':
            return {
                ...base,
                adminRoute: true,
                tab: 'evaluations',
                url: orgSlug ? `/${orgSlug}/admin?tab=evaluations` : undefined,
            };

        case 'admin_discipline_alert':
            return {
                ...base,
                adminRoute: true,
                tab: 'discipline',
                url: orgSlug ? `/${orgSlug}/admin?tab=discipline` : undefined,
            };

        // ── SuperAdmin deep-links ──
        case 'superadmin_new_org':
            return {
                ...base,
                superadminRoute: true,
                tab: 'orgs',
                url: '/superadmin?tab=orgs',
            };

        case 'superadmin_sky_request':
            return {
                ...base,
                superadminRoute: true,
                tab: 'requests',
                url: '/superadmin?tab=requests',
            };

        case 'superadmin_health_alert':
            return {
                ...base,
                superadminRoute: true,
                tab: 'overview',
                url: '/superadmin?tab=overview',
            };

        // ── Daily Engagement deep-links ──
        case 'daily_engagement_morning':
            return {
                ...base,
                tab: 'myspace',
                subTab: 'edt',
                url: orgSlug ? `/${orgSlug}/campus?tab=myspace&subTab=edt` : undefined,
            };

        case 'daily_engagement_noon':
            return {
                ...base,
                tab: 'myspace',
                subTab: 'cursus',
                url: orgSlug ? `/${orgSlug}/campus?tab=myspace&subTab=cursus` : undefined,
            };

        case 'daily_engagement_evening':
            return {
                ...base,
                tab: 'actus',
                url: orgSlug ? `/${orgSlug}/campus?tab=actus` : undefined,
            };

        default:
            return { ...base, tab: 'actus' };
    }
}

// ══════════════════════════════════════════════════════════
// AGGREGATION KEY
// ══════════════════════════════════════════════════════════

function buildAggregationKey(
    recipientId: string,
    actionType: NotificationActionType,
    targetId?: string,
    actorId?: string,
): string | null {
    const window = AGGREGATION_WINDOWS[actionType];
    if (!window) return null; // No aggregation for this type

    // For certain types, include actor in the key
    const includeActor = ['friend_prayed', 'group_new_message', 'dm_new_message'].includes(actionType);

    const parts = [recipientId, actionType, targetId || 'none'];
    if (includeActor && actorId) parts.push(actorId);

    return `agg:${parts.join(':')}`;
}

// ══════════════════════════════════════════════════════════
// RATE LIMITING
// ══════════════════════════════════════════════════════════

async function checkRateLimit(
    kv: KVNamespace,
    userId: string,
    env: Env,
): Promise<{ allowed: boolean; reason?: string }> {
    const pushIntervalMs = parseInt(env.RATE_LIMIT_PUSH_INTERVAL_MS || '10000');
    const hourlyMax = parseInt(env.RATE_LIMIT_HOURLY_MAX || '50');

    // Check push interval (sliding window)
    const lastPushKey = `rate:push:${userId}`;
    const lastPush = await kv.get(lastPushKey);
    if (lastPush) {
        const elapsed = Date.now() - parseInt(lastPush);
        if (elapsed < pushIntervalMs) {
            return { allowed: false, reason: `Rate limit: wait ${pushIntervalMs - elapsed}ms` };
        }
    }

    // Check hourly count
    const hourKey = `rate:hour:${userId}:${Math.floor(Date.now() / 3600000)}`;
    const hourCount = parseInt(await kv.get(hourKey) || '0');
    if (hourCount >= hourlyMax) {
        return { allowed: false, reason: `Hourly limit reached (${hourlyMax})` };
    }

    return { allowed: true };
}

async function recordRateLimit(kv: KVNamespace, userId: string): Promise<void> {
    const lastPushKey = `rate:push:${userId}`;
    await kv.put(lastPushKey, String(Date.now()), { expirationTtl: 60 }); // Cloudflare min TTL = 60s

    const hourKey = `rate:hour:${userId}:${Math.floor(Date.now() / 3600000)}`;
    const current = parseInt(await kv.get(hourKey) || '0');
    await kv.put(hourKey, String(current + 1), { expirationTtl: 3600 });
}

// ══════════════════════════════════════════════════════════
// USER PREFERENCES
// ══════════════════════════════════════════════════════════

async function getUserPreferences(
    kv: KVNamespace,
    db: SupabaseClient,
    userId: string,
    actionType: NotificationActionType,
): Promise<{ in_app: boolean; push: boolean }> {
    const cacheKey = `prefs:${userId}`;

    // Check KV cache first
    const cached = await kv.get(cacheKey, 'json') as Record<string, any> | null;
    if (cached && cached[actionType]) {
        return cached[actionType];
    }

    // Fetch from Supabase
    try {
        const prefs = await db.select('notification_preferences', {
            select: 'action_type,in_app,push_enabled',
            filters: `user_id=eq.${userId}`,
        });

        if (prefs && Array.isArray(prefs) && prefs.length > 0) {
            const prefsMap: Record<string, any> = {};
            for (const p of prefs) {
                prefsMap[p.action_type] = { in_app: p.in_app, push: p.push_enabled };
            }
            // Cache for 10 min
            await kv.put(cacheKey, JSON.stringify(prefsMap), { expirationTtl: 600 });
            return prefsMap[actionType] || DEFAULT_PREFERENCES[actionType] || DEFAULT_PREFERENCES.general;
        }
    } catch (e) {
        // Fallback to defaults
    }

    return DEFAULT_PREFERENCES[actionType] || DEFAULT_PREFERENCES.general;
}

// ══════════════════════════════════════════════════════════
// PUSH DEDUPLICATION
// ══════════════════════════════════════════════════════════

async function checkPushDedup(kv: KVNamespace, userId: string, aggKey: string): Promise<boolean> {
    const dedupKey = `push_sent:${userId}:${aggKey}`;
    const existing = await kv.get(dedupKey);
    if (existing) return true; // Already sent
    await kv.put(dedupKey, '1', { expirationTtl: 60 }); // Cloudflare min TTL = 60s (prevents duplicate push within 1 minute)
    return false;
}


export {
    AGGREGATION_WINDOWS,
    DEFAULT_PREFERENCES,
    PRIORITY_MAP,
    buildNotificationMessage,
    buildActionData,
    buildAggregationKey,
    checkRateLimit,
    recordRateLimit,
    getUserPreferences,
    checkPushDedup,
};
