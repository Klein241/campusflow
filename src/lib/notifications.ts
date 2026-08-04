import { supabase } from './supabase';

/**
 * ══════════════════════════════════════════════════════════
 * NOTIFICATION CLIENT — CampusFlow v5 (Clean)
 * ══════════════════════════════════════════════════════════
 *
 * All notification functions route through the Cloudflare
 * Notification Worker for aggregation, rate-limiting, and push.
 *
 * Fallback: If WORKER_URL is not set, inserts directly into
 * Supabase (legacy behavior).
 *
 * Legacy prayer_* action types have been renamed to support_*.
 */

// ── Types ────────────────────────────────────────────────

export type NotificationActionType =
    | 'support_received'
    | 'friend_supported'
    | 'new_support_published'
    | 'support_comment'
    | 'support_no_response'
    | 'group_access_request'
    | 'group_access_approved'
    | 'group_new_message'
    | 'admin_new_group'
    | 'group_invitation'
    | 'group_mention'
    | 'dm_new_message'
    | 'friend_request_received'
    | 'friend_request_accepted'
    | 'new_book_published'
    // ── Stories ──
    | 'story_published'
    | 'story_liked'
    | 'story_commented'
    | 'story_reposted'
    // ── Actus ──
    | 'actu_published'
    | 'actu_liked'
    | 'actu_commented'
    // ── Cursus ──
    | 'new_subject'
    | 'new_chapter'
    | 'new_lesson'
    | 'new_exercise'
    // ── School notification types ──
    | 'grade_published'
    | 'evaluation_scheduled'
    | 'payment_confirmed'
    | 'discipline_sanction'
    | 'timetable_change'
    | 'admin_announcement'
    | 'evaluation_reminder'
    | 'general';


export interface NotificationActionData {
    tab?: string;
    viewState?: string;
    groupId?: string;
    groupName?: string;
    requestId?: string;
    conversationId?: string;
    communityTab?: string;
    scrollToComments?: boolean;
    scrollToMessage?: string;
    bookId?: string;
    // School deep-link data
    subTab?: string;
    orgSlug?: string;
}

interface NotifyWorkerPayload {
    action_type: NotificationActionType;
    actor_id: string;
    actor_name: string;
    actor_avatar?: string;
    recipient_id?: string;
    recipient_ids?: string[];
    target_id?: string;
    target_name?: string;
    is_anonymous?: boolean;
    message_preview?: string;
    extra_data?: Record<string, any>;
}

// ── Worker URL ───────────────────────────────────────────

function getWorkerUrl(): string {
    return process.env.NEXT_PUBLIC_NOTIFICATION_WORKER_URL
        || process.env.NEXT_PUBLIC_WORKER_URL
        || '';
}

// ══════════════════════════════════════════════════════════
// CORE: Architecture Supabase-first + Worker en bonus
// ══════════════════════════════════════════════════════════
//
// 1. INSERT dans Supabase `notifications` GARANTI (toujours)
//    → Supabase Realtime (WebSocket) diffuse instantanément
//      aux clients connectés via postgres_changes
//
// 2. Worker Cloudflare appelé en fire-and-forget APRÈS
//    → Uniquement pour le Web Push (navigateur fermé)
//    → Si Worker indisponible : aucun impact sur l'affichage in-app
//
// ══════════════════════════════════════════════════════════

async function sendToWorker(payload: NotifyWorkerPayload): Promise<boolean> {
    // ── Étape 1 : INSERT dans Supabase (canal principal garanti) ──
    const supabaseOk = await insertToSupabase(payload);

    // ── Étape 2 : Worker en arrière-plan pour Web Push (bonus) ──
    const workerUrl = getWorkerUrl();
    if (workerUrl) {
        // fire-and-forget : ne bloque pas, n'affecte pas le résultat
        fetch(`${workerUrl}/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }).catch(() => {
            // Worker indisponible = pas de push web, mais Supabase a déjà inséré
        });
    }

    return supabaseOk;
}

// INSERT dans la table `notifications` via Supabase (canal primaire)
async function insertToSupabase(payload: NotifyWorkerPayload): Promise<boolean> {
    const recipientIds = payload.recipient_ids || (payload.recipient_id ? [payload.recipient_id] : []);
    if (recipientIds.length === 0) return false;

    const actionData = buildFallbackActionData(payload);
    const { title, message } = buildFallbackMessage(payload);
    const orgId = payload.extra_data?.orgId || payload.extra_data?.organization_id || null;

    const notifications = recipientIds
        .filter(id => id !== payload.actor_id)
        .map(userId => ({
            user_id: userId,
            organization_id: orgId,
            title,
            message,
            body: message,
            type: mapActionTypeToLegacyType(payload.action_type),
            action_type: payload.action_type,
            action_data: JSON.stringify(actionData),
            category: mapActionTypeToCategory(payload.action_type),
            is_read: false,
        }));

    if (notifications.length === 0) return true;

    // Insérer par batch de 50 pour éviter les timeouts
    for (let i = 0; i < notifications.length; i += 50) {
        const batch = notifications.slice(i, i + 50);
        const { error } = await supabase.from('notifications').insert(batch);
        if (error) {
            console.error('[Notification] Supabase insert error:', error.message, error.details);
            return false;
        }
    }
    return true;
}

// sendFallback conservé pour rétrocompatibilité (alias de insertToSupabase)
async function sendFallback(payload: NotifyWorkerPayload): Promise<boolean> {
    return insertToSupabase(payload);
}

function mapActionTypeToLegacyType(actionType: NotificationActionType): string {
    switch (actionType) {
        case 'support_received':
        case 'friend_supported':
        case 'new_support_published':
        case 'support_comment':
        case 'support_no_response':
            return 'support';
        case 'dm_new_message':
        case 'group_new_message':
        case 'group_mention':
            return 'message';
        case 'group_access_approved':
            return 'success';
        case 'grade_published':
        case 'evaluation_scheduled':
        case 'evaluation_reminder':
            return 'info';
        case 'payment_confirmed':
            return 'success';
        case 'discipline_sanction':
            return 'warning';
        case 'actu_published':
        case 'actu_liked':
        case 'actu_commented':
        case 'story_published':
        case 'story_liked':
        case 'story_commented':
        case 'story_reposted':
            return 'info';
        case 'admin_announcement':
        case 'timetable_change':
            return 'system';
        case 'friend_request_received':
        case 'friend_request_accepted':
        case 'new_book_published':
            return 'info';
        default:
            return 'info';
    }
}

// Map action_type → NotificationCenter category
function mapActionTypeToCategory(actionType: NotificationActionType): string {
    const at = actionType.toLowerCase();
    if (at.startsWith('story_') || at.startsWith('actu_')) return 'news';
    if (at === 'new_book_published') return 'library';
    if (at.startsWith('dm_') || at === 'message') return 'chat_dm';
    if (at.startsWith('group_')) return 'chat_group';
    if (at.startsWith('grade_')) return 'grade';
    if (at.startsWith('evaluation_')) return 'evaluation';
    if (at.startsWith('payment_')) return 'payment';
    if (at.startsWith('discipline_')) return 'discipline';
    if (at.startsWith('admin_') || at === 'admin_announcement') return 'admin';
    if (at.startsWith('timetable_')) return 'schedule';
    if (at.startsWith('support_') || at === 'friend_supported' || at === 'new_support_published') return 'system';
    return 'system';
}

function buildFallbackActionData(payload: NotifyWorkerPayload): NotificationActionData {
    const actionType = payload.action_type;
    const orgSlug = payload.extra_data?.orgSlug || '';
    switch (actionType) {
        case 'support_received':
        case 'friend_supported':
        case 'new_support_published':
        case 'support_comment':
        case 'support_no_response':
            return { tab: 'community', communityTab: 'support', requestId: payload.target_id };
        case 'group_access_request':
            return { tab: 'community', viewState: 'group-detail', groupId: payload.target_id, groupName: payload.target_name };
        case 'group_access_approved':
        case 'group_new_message':
            return { tab: 'chatdm', viewState: 'group-detail', groupId: payload.target_id, groupName: payload.target_name };
        case 'admin_new_group':
            return { tab: 'chatdm', viewState: 'groups' };
        case 'group_invitation':
            return { tab: 'chatdm', viewState: 'group-detail', groupId: payload.target_id, groupName: payload.target_name };
        case 'group_mention':
            return { tab: 'chatdm', viewState: 'group-detail', groupId: payload.target_id };
        case 'dm_new_message':
            return { tab: 'chatdm', viewState: 'conversation', conversationId: payload.target_id };
        case 'friend_request_received':
            return { tab: 'contacts', viewState: 'friend-requests' };
        case 'friend_request_accepted':
            return { tab: 'chatdm', viewState: 'conversation', conversationId: payload.extra_data?.conversationId };
        case 'new_book_published':
            return { tab: 'library', bookId: payload.target_id };
        // ── Actus & Stories ──
        case 'actu_published':
        case 'actu_liked':
        case 'actu_commented':
        case 'story_published':
        case 'story_liked':
        case 'story_commented':
        case 'story_reposted':
            return { tab: 'actus', orgSlug };
        // ── Academic ──
        case 'grade_published':
            return { tab: 'myspace', subTab: 'bulletin', orgSlug };
        case 'evaluation_scheduled':
        case 'evaluation_reminder':
            return { tab: 'exam_room', orgSlug };
        case 'payment_confirmed':
            return { tab: 'myspace', subTab: 'paiement', orgSlug };
        case 'discipline_sanction':
            return { tab: 'myspace', orgSlug };
        case 'timetable_change':
            return { tab: 'myspace', subTab: 'edt', orgSlug };
        case 'admin_announcement':
            return { tab: 'actus', orgSlug };
        default:
            return { tab: 'actus', orgSlug };
    }
}

function buildFallbackMessage(payload: NotifyWorkerPayload): { title: string; message: string } {
    const name = payload.is_anonymous ? 'Anonyme' : payload.actor_name;
    const short = (s?: string, len = 60) => s ? (s.length > len ? s.substring(0, len) + '…' : s) : '';

    switch (payload.action_type) {
        // ── Soutien ──
        case 'support_received':
            return { title: '🤝 Quelqu\'un vous soutient', message: `${name} a soutenu votre demande : "${short(payload.target_name)}"` };
        case 'friend_supported':
            return { title: '🤝 Votre ami vous soutient', message: `Votre ami ${name} a aussi soutenu ce sujet` };
        case 'new_support_published':
            return { title: '📢 Nouvelle demande de soutien', message: `${name} a publié : "${short(payload.target_name)}"` };
        case 'support_comment':
            return { title: '💬 Nouveau commentaire', message: `${name} a commenté votre demande de soutien` };
        case 'support_no_response':
            return { title: '📋 Votre demande attend', message: 'Votre demande n\'a pas encore reçu de soutien. Le forum est là.' };
        // ── Groupes ──
        case 'group_access_request':
            return { title: '👥 Nouvelle demande d\'accès', message: `${name} souhaite rejoindre votre groupe "${payload.target_name}"` };
        case 'group_access_approved':
            return { title: '✅ Demande approuvée', message: `Votre demande d'accès au groupe "${payload.target_name}" a été approuvée !` };
        case 'group_new_message':
            return { title: `💬 ${payload.target_name}`, message: `${name}: ${short(payload.message_preview, 80)}` };
        case 'admin_new_group':
            return { title: '🌟 Nouveau groupe officiel', message: `Nouveau groupe officiel : ${payload.target_name}` };
        case 'group_invitation':
            return { title: '👥 Invitation à un groupe', message: `${name} vous invite à rejoindre "${payload.target_name}"` };
        case 'group_mention':
            return { title: '🔔 Mention dans un groupe', message: `${name} vous a mentionné dans ${payload.target_name}` };
        // ── Messages ──
        case 'dm_new_message':
            return { title: `💬 ${name}`, message: short(payload.message_preview, 80) };
        // ── Amis ──
        case 'friend_request_received':
            return { title: '👋 Demande d\'ami', message: `${name} vous a envoyé une demande d'ami` };
        case 'friend_request_accepted':
            return { title: '👋 Ami ajouté !', message: `${name} a accepté votre demande d'ami` };
        // ── Bibliothèque ──
        case 'new_book_published':
            return { title: '📚 Nouveau livre disponible', message: `"${payload.target_name}" vient d'être ajouté aux ressources` };
        // ── Actus ──
        case 'actu_published':
            return { title: '📰 Nouvelle actualité', message: `${name} a publié : "${short(payload.target_name || payload.message_preview, 70)}"` };
        case 'actu_liked':
            return { title: '❤️ Réaction sur votre actus', message: `${name} a réagi à votre publication` };
        case 'actu_commented':
            return { title: '💬 Commentaire sur votre actus', message: `${name} : ${short(payload.message_preview, 70)}` };
        // ── Stories ──
        case 'story_published':
            return { title: '✨ Nouvelle story', message: `${name} a partagé une story` };
        case 'story_liked':
            return { title: '❤️ Votre story a été aimée', message: `${name} a aimé votre story` };
        case 'story_commented':
            return { title: '💬 Commentaire sur votre story', message: `${name} : ${short(payload.message_preview, 70)}` };
        case 'story_reposted':
            return { title: '🔁 Votre story repartagée', message: `${name} a repartagé votre story` };
        // ── Académique ──
        case 'grade_published':
            return { title: '📊 Nouvelle note publiée', message: `${name} a publié une note en ${payload.target_name} — ${payload.message_preview || ''}` };
        case 'evaluation_scheduled':
            return { title: '📝 Évaluation programmée', message: `${name} a programmé une évaluation en ${payload.target_name} — ${payload.message_preview || ''}` };
        case 'evaluation_reminder':
            return { title: '⏰ Rappel : évaluation bientôt', message: `Évaluation en ${payload.target_name} ${payload.message_preview || 'demain'}` };
        case 'payment_confirmed':
            return { title: '✅ Paiement confirmé', message: `Votre paiement a été enregistré — ${payload.message_preview || ''}` };
        case 'discipline_sanction':
            return { title: '⚠️ Sanction disciplinaire', message: payload.message_preview || 'Une sanction a été enregistrée à votre dossier' };
        case 'timetable_change':
            return { title: '📅 Changement d\'emploi du temps', message: payload.message_preview || 'Votre emploi du temps a été modifié' };
        case 'admin_announcement':
            return { title: `📢 ${payload.target_name || 'Annonce'}`, message: payload.message_preview || 'Nouvelle annonce de l\'administration' };
        case 'general':
            return { title: payload.target_name || 'Notification', message: payload.message_preview || 'Nouvelle notification' };
        default:
            return { title: payload.target_name || 'Notification', message: payload.message_preview || 'Nouvelle notification' };
    }
}

// ══════════════════════════════════════════════════════════
// 🤝 SUPPORT NOTIFICATIONS
// ══════════════════════════════════════════════════════════

/** Someone supported your request */
export async function notifySupportReceived({
    requestOwnerId,
    requestContent,
    supporterName,
    requestId,
    actorId,
    actorAvatar,
}: {
    requestOwnerId: string;
    requestContent: string;
    supporterName: string;
    requestId: string;
    actorId: string;
    actorAvatar?: string;
}) {
    await sendToWorker({
        action_type: 'support_received',
        actor_id: actorId,
        actor_name: supporterName,
        actor_avatar: actorAvatar,
        recipient_id: requestOwnerId,
        target_id: requestId,
        target_name: requestContent.substring(0, 60),
    });
}

/** @deprecated Use notifySupportReceived */
export const notifyPrayerPrayed = notifySupportReceived;

/** Your friend supported a request */
export async function notifyFriendSupported({
    userId,
    userName,
    requestContent,
    requestId,
    actorAvatar,
}: {
    userId: string;
    userName: string;
    requestContent: string;
    requestId: string;
    actorAvatar?: string;
}) {
    try {
        const { data: friendships } = await supabase
            .from('friendships')
            .select('sender_id, receiver_id')
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .eq('status', 'accepted');

        if (!friendships || friendships.length === 0) return;

        const friendIds = friendships.map(f =>
            f.sender_id === userId ? f.receiver_id : f.sender_id
        );

        await sendToWorker({
            action_type: 'friend_supported',
            actor_id: userId,
            actor_name: userName,
            actor_avatar: actorAvatar,
            recipient_ids: friendIds,
            target_id: requestId,
            target_name: requestContent.substring(0, 50),
        });
    } catch (e) {
        console.error('[Notification] Friend supported error:', e);
    }
}

/** @deprecated Use notifyFriendSupported */
export const notifyFriendPrayed = notifyFriendSupported;

/** New support request broadcast */
export async function notifyNewSupportRequest({
    excludeUserId,
    requestContent,
    userName,
    requestId,
    isAnonymous,
}: {
    excludeUserId: string;
    requestContent: string;
    userName: string;
    requestId: string;
    isAnonymous: boolean;
}) {
    try {
        const { data: users } = await supabase
            .from('profiles')
            .select('id')
            .neq('id', excludeUserId)
            .limit(200);

        if (users && users.length > 0) {
            const recipientIds = users.map((u: any) => u.id);

            await sendToWorker({
                action_type: 'new_support_published',
                actor_id: excludeUserId,
                actor_name: isAnonymous ? 'Anonyme' : userName,
                is_anonymous: isAnonymous,
                recipient_ids: recipientIds,
                target_id: requestId,
                target_name: requestContent.substring(0, 60),
            });
        }
    } catch (e) {
        console.error('[Notification] New support request error:', e);
    }
}

/** @deprecated Use notifyNewSupportRequest */
export const notifyNewPrayer = notifyNewSupportRequest;

/** Someone commented on your support request */
export async function notifySupportComment({
    requestId,
    requestOwnerId,
    commenterId,
    commenterName,
    commenterAvatar,
    commentPreview,
}: {
    requestId: string;
    requestOwnerId: string;
    commenterId: string;
    commenterName: string;
    commenterAvatar?: string;
    commentPreview?: string;
}) {
    try {
        const { data: commenters } = await supabase
            .from('prayer_comments')
            .select('user_id')
            .eq('prayer_id', requestId)
            .neq('user_id', commenterId);

        const recipientIds = new Set<string>();
        recipientIds.add(requestOwnerId);
        if (commenters) {
            commenters.forEach((c: any) => recipientIds.add(c.user_id));
        }
        recipientIds.delete(commenterId);

        if (recipientIds.size === 0) return;

        await sendToWorker({
            action_type: 'support_comment',
            actor_id: commenterId,
            actor_name: commenterName,
            actor_avatar: commenterAvatar,
            recipient_ids: Array.from(recipientIds),
            target_id: requestId,
            message_preview: commentPreview,
        });
    } catch (e) {
        console.error('[Notification] Support comment error:', e);
    }
}

/** @deprecated Use notifySupportComment */
export const notifyPrayerComment = notifySupportComment;

// ══════════════════════════════════════════════════════════
// 👥 GROUP NOTIFICATIONS
// ══════════════════════════════════════════════════════════

/** User requests to join group */
export async function notifyGroupAccessRequest({
    groupOwnerId,
    groupId,
    groupName,
    requesterName,
    requesterId,
    requesterAvatar,
}: {
    groupOwnerId: string;
    groupId: string;
    groupName: string;
    requesterName: string;
    requesterId: string;
    requesterAvatar?: string;
}) {
    await sendToWorker({
        action_type: 'group_access_request',
        actor_id: requesterId,
        actor_name: requesterName,
        actor_avatar: requesterAvatar,
        recipient_id: groupOwnerId,
        target_id: groupId,
        target_name: groupName,
    });
}

/** Join request approved */
export async function notifyGroupAccessApproved({
    userId,
    groupId,
    groupName,
}: {
    userId: string;
    groupId: string;
    groupName: string;
}) {
    await sendToWorker({
        action_type: 'group_access_approved',
        actor_id: 'system',
        actor_name: 'Système',
        recipient_id: userId,
        target_id: groupId,
        target_name: groupName,
    });
}

/** New message in group */
export async function notifyGroupNewMessage({
    groupId,
    groupName,
    senderId,
    senderName,
    senderAvatar,
    messagePreview,
    memberIds,
}: {
    groupId: string;
    groupName: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    messagePreview: string;
    memberIds?: string[]; // Optionnel — si déjà chargés, évite la requête DB
}) {
    try {
        let recipientIds = memberIds?.filter(id => id !== senderId);

        // Fallback: charger depuis group_members si non fournis
        if (!recipientIds) {
            const { data: members } = await supabase
                .from('group_members')
                .select('user_id')
                .eq('group_id', groupId)
                .neq('user_id', senderId);
            recipientIds = (members || []).map((m: any) => m.user_id);
        }

        if (!recipientIds || recipientIds.length === 0) return;

        await sendToWorker({
            action_type: 'group_new_message',
            actor_id: senderId,
            actor_name: senderName,
            actor_avatar: senderAvatar,
            recipient_ids: recipientIds,
            target_id: groupId,
            target_name: groupName,
            message_preview: messagePreview.substring(0, 80),
        });
    } catch (e) {
        console.error('[Notification] Group message error:', e);
    }

}

/** Admin created official group */
export async function notifyAdminNewGroup({
    groupId,
    groupName,
    excludeUserId,
}: {
    groupId: string;
    groupName: string;
    excludeUserId: string;
}) {
    try {
        const { data: users } = await supabase
            .from('profiles')
            .select('id')
            .neq('id', excludeUserId)
            .limit(200);

        if (users && users.length > 0) {
            await sendToWorker({
                action_type: 'admin_new_group',
                actor_id: excludeUserId,
                actor_name: 'Administrateur',
                recipient_ids: users.map((u: any) => u.id),
                target_id: groupId,
                target_name: groupName,
            });
        }
    } catch (e) {
        console.error('[Notification] Admin group error:', e);
    }
}

/** User invited to a group */
export async function notifyGroupInvitation({
    userId,
    inviterName,
    inviterId,
    inviterAvatar,
    groupId,
    groupName,
}: {
    userId: string;
    inviterName: string;
    inviterId: string;
    inviterAvatar?: string;
    groupId: string;
    groupName: string;
}) {
    await sendToWorker({
        action_type: 'group_invitation',
        actor_id: inviterId,
        actor_name: inviterName,
        actor_avatar: inviterAvatar,
        recipient_id: userId,
        target_id: groupId,
        target_name: groupName,
    });
}

/** @mention in group chat */
export async function notifyGroupMention({
    mentionedUserId,
    mentionerName,
    mentionerId,
    mentionerAvatar,
    groupId,
    groupName,
    messagePreview,
    messageId,
}: {
    mentionedUserId: string;
    mentionerName: string;
    mentionerId: string;
    mentionerAvatar?: string;
    groupId: string;
    groupName: string;
    messagePreview: string;
    messageId?: string;
}) {
    await sendToWorker({
        action_type: 'group_mention',
        actor_id: mentionerId,
        actor_name: mentionerName,
        actor_avatar: mentionerAvatar,
        recipient_id: mentionedUserId,
        target_id: groupId,
        target_name: groupName,
        message_preview: messagePreview,
        extra_data: { messageId },
    });
}

// ══════════════════════════════════════════════════════════
// 💬 SOCIAL & MESSAGING NOTIFICATIONS
// ══════════════════════════════════════════════════════════

/** New direct message */
export async function notifyDirectMessage({
    recipientId,
    senderId,
    senderName,
    senderAvatar,
    messagePreview,
    conversationId,
    orgSlug,
}: {
    recipientId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    messagePreview: string;
    conversationId: string;
    orgSlug?: string;
}) {
    if (recipientId === senderId) return;

    await sendToWorker({
        action_type: 'dm_new_message',
        actor_id: senderId,
        actor_name: senderName,
        actor_avatar: senderAvatar,
        recipient_id: recipientId,
        target_id: conversationId,
        message_preview: messagePreview,
        extra_data: orgSlug ? { orgSlug } : undefined,
    });
}


/** Friend request received */
export async function notifyFriendRequestReceived({
    recipientId,
    senderId,
    senderName,
    senderAvatar,
}: {
    recipientId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
}) {
    await sendToWorker({
        action_type: 'friend_request_received',
        actor_id: senderId,
        actor_name: senderName,
        actor_avatar: senderAvatar,
        recipient_id: recipientId,
    });
}

/** Friend request accepted */
export async function notifyFriendRequestAccepted({
    userId,
    accepterId,
    accepterName,
    accepterAvatar,
}: {
    userId: string;
    accepterId: string;
    accepterName: string;
    accepterAvatar?: string;
}) {
    let conversationId: string | undefined;
    try {
        const { data: conv } = await supabase
            .from('conversations')
            .select('id')
            .or(`and(participant1_id.eq.${userId},participant2_id.eq.${accepterId}),and(participant1_id.eq.${accepterId},participant2_id.eq.${userId})`)
            .maybeSingle();
        if (conv) conversationId = conv.id;
    } catch (e) { /* ignore */ }

    await sendToWorker({
        action_type: 'friend_request_accepted',
        actor_id: accepterId,
        actor_name: accepterName,
        actor_avatar: accepterAvatar,
        recipient_id: userId,
        extra_data: { conversationId },
    });
}

// ══════════════════════════════════════════════════════════
// 📚 LIBRARY NOTIFICATIONS
// ══════════════════════════════════════════════════════════

/** Admin published a new book */
export async function notifyNewBook({
    bookId,
    bookTitle,
    bookAuthor,
    publisherId,
    publisherName,
}: {
    bookId: string;
    bookTitle: string;
    bookAuthor: string;
    publisherId: string;
    publisherName: string;
}) {
    try {
        const { data: users } = await supabase
            .from('profiles')
            .select('id')
            .neq('id', publisherId)
            .limit(500);

        if (users && users.length > 0) {
            await sendToWorker({
                action_type: 'new_book_published',
                actor_id: publisherId,
                actor_name: publisherName,
                recipient_ids: users.map((u: any) => u.id),
                target_id: bookId,
                target_name: bookTitle,
                message_preview: `par ${bookAuthor}`,
            });
        }
    } catch (e) {
        console.error('[Notification] New book error:', e);
    }
}

// ══════════════════════════════════════════════════════════
// LEGACY: sendNotification (backward-compatible wrapper)
// ══════════════════════════════════════════════════════════

/**
 * @deprecated Use specific notification functions instead.
 */
export async function sendNotification({
    userId,
    title,
    message,
    type = 'info',
    actionType = 'general',
    actionData,
}: {
    userId: string;
    title: string;
    message: string;
    type?: string;
    actionType?: NotificationActionType;
    actionData?: NotificationActionData;
}) {
    try {
        const { error } = await supabase.from('notifications').insert({
            user_id: userId,
            title,
            message,
            type,
            action_type: actionType,
            action_data: actionData ? JSON.stringify(actionData) : null,
            is_read: false,
        });
        if (error) console.error('[Notification] Insert error:', error);
    } catch (e) {
        console.error('[Notification] Send error:', e);
    }
}

/**
 * @deprecated Use notifyGroupNewMessage instead.
 */
export async function notifyGroupMembers({
    groupId,
    groupName,
    excludeUserId,
    title,
    message,
    type = 'message',
    actionType,
    actionData,
}: {
    groupId: string;
    groupName: string;
    excludeUserId: string;
    title: string;
    message: string;
    type?: string;
    actionType: NotificationActionType;
    actionData?: NotificationActionData;
}) {
    try {
        const { data: members } = await supabase
            .from('group_members')
            .select('user_id')
            .eq('group_id', groupId)
            .neq('user_id', excludeUserId);

        if (members && members.length > 0) {
            const notifications = members.map((m: any) => ({
                user_id: m.user_id,
                title,
                message,
                type,
                action_type: actionType,
                action_data: JSON.stringify(actionData || {
                    tab: 'community',
                    viewState: 'group-detail',
                    groupId,
                    groupName,
                }),
                is_read: false,
            }));
            await supabase.from('notifications').insert(notifications);
        }
    } catch (e) {
        console.error('[Notification] Group notify error:', e);
    }
}

// ══════════════════════════════════════════════════════════
// SCHOOL-SPECIFIC NOTIFICATION HELPERS
// ══════════════════════════════════════════════════════════

/**
 * Notify a student that a new grade has been published.
 */
export async function notifyGradePublished({
    teacherName,
    teacherId,
    studentId,
    subjectName,
    gradeValue,
    orgSlug,
}: {
    teacherName: string;
    teacherId: string;
    studentId: string;
    subjectName: string;
    gradeValue: string;
    orgSlug: string;
}) {
    await sendToWorker({
        action_type: 'grade_published',
        actor_id: teacherId,
        actor_name: teacherName,
        recipient_id: studentId,
        target_name: subjectName,
        message_preview: `Note: ${gradeValue}/20`,
        extra_data: { orgSlug },
    });
}

/**
 * Notify students that an evaluation is scheduled.
 */
export async function notifyEvaluationScheduled({
    teacherName,
    teacherId,
    studentIds,
    subjectName,
    evalDate,
    orgSlug,
}: {
    teacherName: string;
    teacherId: string;
    studentIds: string[];
    subjectName: string;
    evalDate: string;
    orgSlug: string;
}) {
    await sendToWorker({
        action_type: 'evaluation_scheduled',
        actor_id: teacherId,
        actor_name: teacherName,
        recipient_ids: studentIds,
        target_name: subjectName,
        message_preview: `Le ${evalDate}`,
        extra_data: { orgSlug },
    });
}

/**
 * Notify student/parent of a payment confirmation.
 */
export async function notifyPaymentConfirmed({
    adminName,
    adminId,
    studentId,
    amount,
    label,
    orgSlug,
}: {
    adminName: string;
    adminId: string;
    studentId: string;
    amount: string;
    label: string;
    orgSlug: string;
}) {
    await sendToWorker({
        action_type: 'payment_confirmed',
        actor_id: adminId,
        actor_name: adminName,
        recipient_id: studentId,
        target_name: label,
        message_preview: `${amount} FCFA reçu — ${label}`,
        extra_data: { orgSlug },
    });
}

/**
 * Broadcast a school-wide admin announcement.
 */
export async function notifyAdminAnnouncement({
    adminName,
    adminId,
    recipientIds,
    message,
    orgSlug,
}: {
    adminName: string;
    adminId: string;
    recipientIds: string[];
    message: string;
    orgSlug: string;
}) {
    await sendToWorker({
        action_type: 'admin_announcement',
        actor_id: adminId,
        actor_name: adminName,
        recipient_ids: recipientIds,
        message_preview: message,
        extra_data: { orgSlug },
    });
}

// ══════════════════════════════════════════════════════════
// STORY NOTIFICATIONS
// ══════════════════════════════════════════════════════════

/**
 * Notify org members when someone publishes a new story.
 */
export async function notifyStoryPublished({
    authorId, authorName, storyId, storyPreview, recipientIds, orgSlug, orgId,
}: {
    authorId: string; authorName: string; storyId: string;
    storyPreview?: string; recipientIds: string[]; orgSlug: string; orgId?: string;
}) {
    if (!recipientIds.length) return;
    await sendToWorker({
        action_type: 'story_published',
        actor_id: authorId,
        actor_name: authorName,
        recipient_ids: recipientIds,
        target_id: storyId,
        target_name: storyPreview || 'Story',
        message_preview: `${authorName} a publié une nouvelle story`,
        extra_data: { orgSlug, orgId, tab: 'actus' },
    });
}

/**
 * Notify story author when someone likes their story.
 */
export async function notifyStoryLiked({
    likerId, likerName, storyAuthorId, storyId, orgSlug, orgId,
}: {
    likerId: string; likerName: string; storyAuthorId: string;
    storyId: string; orgSlug: string; orgId?: string;
}) {
    if (likerId === storyAuthorId) return; // pas d'auto-notif
    await sendToWorker({
        action_type: 'story_liked',
        actor_id: likerId,
        actor_name: likerName,
        recipient_id: storyAuthorId,
        target_id: storyId,
        message_preview: `${likerName} a aimé votre story`,
        extra_data: { orgSlug, orgId, tab: 'actus' },
    });
}

/**
 * Notify story author when someone comments on their story.
 */
export async function notifyStoryCommented({
    commenterId, commenterName, storyAuthorId, storyId, commentText, orgSlug, orgId,
}: {
    commenterId: string; commenterName: string; storyAuthorId: string;
    storyId: string; commentText: string; orgSlug: string; orgId?: string;
}) {
    if (commenterId === storyAuthorId) return;
    await sendToWorker({
        action_type: 'story_commented',
        actor_id: commenterId,
        actor_name: commenterName,
        recipient_id: storyAuthorId,
        target_id: storyId,
        message_preview: commentText.slice(0, 80),
        extra_data: { orgSlug, orgId, tab: 'actus', scrollToComments: true },
    });
}

/**
 * Notify original story author when someone reposts their story.
 */
export async function notifyStoryReposted({
    reposterId, reposterName, originalAuthorId, storyId, orgSlug, orgId,
}: {
    reposterId: string; reposterName: string; originalAuthorId: string;
    storyId: string; orgSlug: string; orgId?: string;
}) {
    if (reposterId === originalAuthorId) return;
    await sendToWorker({
        action_type: 'story_reposted',
        actor_id: reposterId,
        actor_name: reposterName,
        recipient_id: originalAuthorId,
        target_id: storyId,
        message_preview: `${reposterName} a reposté votre story`,
        extra_data: { orgSlug, orgId, tab: 'actus' },
    });
}

// ══════════════════════════════════════════════════════════
// ACTUS NOTIFICATIONS
// ══════════════════════════════════════════════════════════

/**
 * Notify org members when someone publishes an actus post.
 */
export async function notifyActuPublished({
    authorId, authorName, postId, postContent, recipientIds, orgSlug, orgId,
}: {
    authorId: string; authorName: string; postId: string;
    postContent: string; recipientIds: string[]; orgSlug: string; orgId?: string;
}) {
    if (!recipientIds.length) return;
    await sendToWorker({
        action_type: 'actu_published',
        actor_id: authorId,
        actor_name: authorName,
        recipient_ids: recipientIds,
        target_id: postId,
        target_name: postContent.slice(0, 60),
        message_preview: postContent.slice(0, 100),
        extra_data: { orgSlug, orgId, tab: 'actus' },
    });
}

/**
 * Notify post author when someone likes their actus post.
 */
export async function notifyActuLiked({
    likerId, likerName, postAuthorId, postId, postContent, orgSlug, orgId,
}: {
    likerId: string; likerName: string; postAuthorId: string;
    postId: string; postContent: string; orgSlug: string; orgId?: string;
}) {
    if (likerId === postAuthorId) return;
    await sendToWorker({
        action_type: 'actu_liked',
        actor_id: likerId,
        actor_name: likerName,
        recipient_id: postAuthorId,
        target_id: postId,
        target_name: postContent.slice(0, 50),
        message_preview: `${likerName} a aimé votre publication`,
        extra_data: { orgSlug, orgId, tab: 'actus' },
    });
}

/**
 * Notify post author when someone comments on their actus post.
 */
export async function notifyActuCommented({
    commenterId, commenterName, postAuthorId, postId, postContent, commentText, orgSlug, orgId,
}: {
    commenterId: string; commenterName: string; postAuthorId: string;
    postId: string; postContent: string; commentText: string; orgSlug: string; orgId?: string;
}) {
    if (commenterId === postAuthorId) return;
    await sendToWorker({
        action_type: 'actu_commented',
        actor_id: commenterId,
        actor_name: commenterName,
        recipient_id: postAuthorId,
        target_id: postId,
        target_name: postContent.slice(0, 50),
        message_preview: commentText.slice(0, 80),
        extra_data: { orgSlug, orgId, tab: 'actus', scrollToComments: true },
    });
}

// ══════════════════════════════════════════════════════════
// CURSUS NOTIFICATIONS
// ══════════════════════════════════════════════════════════

/**
 * Notify students when a new subject is created.
 */
export async function notifyNewSubject({
    teacherId, teacherName, subjectId, subjectName, studentIds, orgSlug,
}: {
    teacherId: string; teacherName: string; subjectId: string;
    subjectName: string; studentIds: string[]; orgSlug: string;
}) {
    if (!studentIds.length) return;
    await sendToWorker({
        action_type: 'new_subject',
        actor_id: teacherId,
        actor_name: teacherName,
        recipient_ids: studentIds,
        target_id: subjectId,
        target_name: subjectName,
        message_preview: `Nouvelle matière disponible : "${subjectName}"`,
        extra_data: { orgSlug, tab: 'myspace', subTab: 'cursus' },
    });
}

/**
 * Notify students when a new chapter is published.
 */
export async function notifyNewChapter({
    teacherId, teacherName, chapterId, chapterTitle, subjectName, studentIds, orgSlug,
}: {
    teacherId: string; teacherName: string; chapterId: string;
    chapterTitle: string; subjectName: string; studentIds: string[]; orgSlug: string;
}) {
    if (!studentIds.length) return;
    await sendToWorker({
        action_type: 'new_chapter',
        actor_id: teacherId,
        actor_name: teacherName,
        recipient_ids: studentIds,
        target_id: chapterId,
        target_name: chapterTitle,
        message_preview: `Nouveau chapitre dans ${subjectName} : "${chapterTitle}"`,
        extra_data: { orgSlug, tab: 'myspace', subTab: 'cursus' },
    });
}

/**
 * Notify students when a new lesson is published.
 */
export async function notifyNewLesson({
    teacherId, teacherName, lessonId, lessonTitle, chapterTitle, studentIds, orgSlug,
}: {
    teacherId: string; teacherName: string; lessonId: string;
    lessonTitle: string; chapterTitle: string; studentIds: string[]; orgSlug: string;
}) {
    if (!studentIds.length) return;
    await sendToWorker({
        action_type: 'new_lesson',
        actor_id: teacherId,
        actor_name: teacherName,
        recipient_ids: studentIds,
        target_id: lessonId,
        target_name: lessonTitle,
        message_preview: `Nouvelle leçon dans "${chapterTitle}" : ${lessonTitle}`,
        extra_data: { orgSlug, tab: 'myspace', subTab: 'cursus' },
    });
}

/**
 * Notify students when a new exercise is available.
 */
export async function notifyNewExercise({
    teacherId, teacherName, exerciseId, exerciseTitle, chapterTitle, studentIds, orgSlug,
}: {
    teacherId: string; teacherName: string; exerciseId: string;
    exerciseTitle: string; chapterTitle: string; studentIds: string[]; orgSlug: string;
}) {
    if (!studentIds.length) return;
    await sendToWorker({
        action_type: 'new_exercise',
        actor_id: teacherId,
        actor_name: teacherName,
        recipient_ids: studentIds,
        target_id: exerciseId,
        target_name: exerciseTitle,
        message_preview: `Nouvel exercice disponible : "${exerciseTitle}" (${chapterTitle})`,
        extra_data: { orgSlug, tab: 'myspace', subTab: 'cursus' },
    });
}

