/**
 * IZITEACH NOTIFICATION WORKER - TYPE DEFINITIONS
 */

export interface Env {
    // KV
    NOTIFICATION_CACHE: KVNamespace;
    PUSH_TOKEN_CACHE: KVNamespace;
    UNREAD_COUNTERS: KVNamespace;
    USER_PREFERENCES: KVNamespace;
    // R2 Storage (10GB free)
    LIBRARY_BUCKET: R2Bucket;
    // D1 — Miroir failover Supabase
    IZITEACH_DB: D1Database;
    // Cloudflare AI — Traduction langues africaines (M2M100 Meta, gratuit)
    AI: Ai;
    // Queue (optional — only if on Workers Paid plan)
    PUSH_QUEUE?: Queue;
    // Secrets
    SUPABASE_URL: string;
    SUPABASE_SERVICE_KEY: string;
    VAPID_PUBLIC_KEY: string;
    VAPID_PRIVATE_KEY: string;
    VAPID_EMAIL: string;
    ADMIN_KEY: string;
    SUPERADMIN_PROFILE_ID: string;
    NETLIFY_AUTH_TOKEN?: string;
    NETLIFY_SITE_ID?: string;
    // Vars
    RATE_LIMIT_PUSH_INTERVAL_MS: string;
    RATE_LIMIT_HOURLY_MAX: string;
    BROADCAST_RATE_LIMIT_MS: string;
}

export type NotificationActionType =
    | 'prayer_prayed'
    | 'friend_prayed'
    | 'new_prayer_published'
    | 'prayer_comment'
    | 'prayer_no_response'
    // ── Aliases modernes (support_* = anciens prayer_*) ──
    | 'support_received'
    | 'friend_supported'
    | 'new_support_published'
    | 'support_comment'
    | 'support_no_response'
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
    // ── School-specific types ──
    | 'grade_published'
    | 'evaluation_scheduled'
    | 'payment_confirmed'
    | 'discipline_sanction'
    | 'timetable_change'
    | 'admin_announcement'
    | 'evaluation_reminder'
    | 'exercise_reminder'
    // ── Admin-specific notification types ──
    | 'admin_new_inscription'
    | 'admin_new_payment'
    | 'admin_exam_submitted'
    | 'admin_discipline_alert'
    // ── SuperAdmin notification types ──
    | 'superadmin_new_org'
    | 'superadmin_sky_request'
    | 'superadmin_health_alert'
    // ── Daily Engagement Retention Types (Pinterest/Alibaba) ──
    | 'daily_engagement_morning'
    | 'daily_engagement_noon'
    | 'daily_engagement_evening'
    | 'general';

export type Priority = 'high' | 'medium' | 'low';

export interface NotifyPayload {
    action_type: NotificationActionType;
    actor_id: string;
    actor_name: string;
    actor_avatar?: string;
    recipient_id?: string;       // single recipient
    recipient_ids?: string[];    // broadcast
    target_id?: string;          // prayerId, groupId, conversationId
    target_name?: string;        // group name, prayer preview, etc.
    is_anonymous?: boolean;
    message_preview?: string;
    extra_data?: Record<string, any>;
}

export interface AggregationEntry {
    actors: { id: string; name: string; avatar?: string }[];
    count: number;
    first_at: number;
    notification_id?: string;  // Supabase notification ID to update
}

export interface PushTokenRecord {
    token: string;
    user_id: string;
    role: string;
    device_info?: string;
    updated_at: string;
}

export interface PushSubscriptionRecord {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    user_id?: string;
    updated_at: string;
}

export interface McpToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, any>;
        required?: string[];
    };
}
