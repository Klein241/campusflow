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
    if (typeof window !== 'undefined') {
        const envUrl = process.env.NEXT_PUBLIC_NOTIFICATION_WORKER_URL
            || process.env.NEXT_PUBLIC_WORKER_URL;
        if (envUrl) return envUrl;
    }
    return '';
}

// ── Core: Send to Worker or Supabase Fallback ────────────

async function sendToWorker(payload: NotifyWorkerPayload): Promise<boolean> {
    const workerUrl = getWorkerUrl();

    if (workerUrl) {
        try {
            const res = await fetch(`${workerUrl}/notify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) return true;
            console.warn('[Notification] Worker returned error, falling back to Supabase');
        } catch (e) {
            console.warn('[Notification] Worker unreachable, falling back to Supabase:', e);
        }
    }

    return sendFallback(payload);
}

async function sendFallback(payload: NotifyWorkerPayload): Promise<boolean> {
    const recipientIds = payload.recipient_ids || (payload.recipient_id ? [payload.recipient_id] : []);
    if (recipientIds.length === 0) return false;

    const actionData = buildFallbackActionData(payload);
    const { title, message } = buildFallbackMessage(payload);

    const notifications = recipientIds
        .filter(id => id !== payload.actor_id)
        .map(userId => ({
            user_id: userId,
            title,
            message,
            type: mapActionTypeToLegacyType(payload.action_type),
            action_type: payload.action_type,
            action_data: JSON.stringify(actionData),
            is_read: false,
        }));

    if (notifications.length === 0) return true;

    for (let i = 0; i < notifications.length; i += 50) {
        const batch = notifications.slice(i, i + 50);
        const { error } = await supabase.from('notifications').insert(batch);
        if (error) {
            console.error('[Notification] Supabase fallback insert error:', error);
            return false;
        }
    }
    return true;
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
        case 'friend_request_received':
        case 'friend_request_accepted':
        case 'new_book_published':
            return 'info';
        default:
            return 'info';
    }
}

function buildFallbackActionData(payload: NotifyWorkerPayload): NotificationActionData {
    const actionType = payload.action_type;
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
            return { tab: 'community', viewState: 'group-detail', groupId: payload.target_id, groupName: payload.target_name, communityTab: 'chat' };
        case 'admin_new_group':
            return { tab: 'community', viewState: 'groups' };
        case 'group_invitation':
            return { tab: 'community', viewState: 'group-detail', groupId: payload.target_id, groupName: payload.target_name };
        case 'group_mention':
            return { tab: 'community', viewState: 'group-detail', groupId: payload.target_id, communityTab: 'chat' };
        case 'dm_new_message':
            return { tab: 'community', communityTab: 'chat', viewState: 'conversation', conversationId: payload.target_id };
        case 'friend_request_received':
            return { tab: 'profil', viewState: 'friend-requests' };
        case 'friend_request_accepted':
            return { tab: 'community', communityTab: 'chat', viewState: 'conversation', conversationId: payload.extra_data?.conversationId };
        case 'new_book_published':
            return { tab: 'library', bookId: payload.target_id };
        default:
            return { tab: 'community' };
    }
}

function buildFallbackMessage(payload: NotifyWorkerPayload): { title: string; message: string } {
    const name = payload.is_anonymous ? 'Anonyme' : payload.actor_name;
    const short = (s?: string, len = 60) => s ? (s.length > len ? s.substring(0, len) + '…' : s) : '';

    switch (payload.action_type) {
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
        case 'dm_new_message':
            return { title: `💬 ${name}`, message: short(payload.message_preview, 80) };
        case 'friend_request_received':
            return { title: '👋 Demande d\'ami', message: `${name} vous a envoyé une demande d'ami` };
        case 'friend_request_accepted':
            return { title: '👋 Ami ajouté !', message: `${name} a accepté votre demande d'ami` };
        case 'new_book_published':
            return { title: '📚 Nouveau livre disponible', message: `"${payload.target_name}" vient d'être ajouté aux ressources` };
        default:
            return { title: 'Notification', message: payload.message_preview || 'Nouvelle notification' };
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
}: {
    groupId: string;
    groupName: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    messagePreview: string;
}) {
    try {
        const { data: members } = await supabase
            .from('group_members')
            .select('user_id')
            .eq('group_id', groupId)
            .neq('user_id', senderId);

        if (!members || members.length === 0) return;

        const recipientIds = members.map((m: any) => m.user_id);

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
}: {
    recipientId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    messagePreview: string;
    conversationId: string;
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
