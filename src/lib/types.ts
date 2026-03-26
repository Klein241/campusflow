// Types for the CampusFlow SaaS App — Clean v4
// ================================================
// Legacy religious types have been removed.
// Only SaaS-relevant types remain.

// ── User & Auth ──────────────────────────────────────

export interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    role?: 'user' | 'admin' | 'moderator';
    joinedAt: string;
    phone?: string;
    city?: string;
    country?: string;
}

// ── Support Requests (formerly TutoringRequest) ──────

export type SupportCategory =
    | 'academic'
    | 'administrative'
    | 'technical'
    | 'guidance'
    | 'financial'
    | 'other';

export interface SupportCategoryInfo {
    id: SupportCategory;
    nameFr: string;
    nameEn: string;
    icon: string;
    color: string;
}

export const SUPPORT_CATEGORIES: SupportCategoryInfo[] = [
    { id: 'academic', nameFr: 'Académique', nameEn: 'Academic', icon: '📚', color: '#3b82f6' },
    { id: 'administrative', nameFr: 'Administratif', nameEn: 'Administrative', icon: '📋', color: '#f97316' },
    { id: 'technical', nameFr: 'Technique', nameEn: 'Technical', icon: '🔧', color: '#22c55e' },
    { id: 'guidance', nameFr: 'Orientation', nameEn: 'Guidance', icon: '🧭', color: '#8b5cf6' },
    { id: 'financial', nameFr: 'Financier', nameEn: 'Financial', icon: '💰', color: '#eab308' },
    { id: 'other', nameFr: 'Autre', nameEn: 'Other', icon: '✨', color: '#6b7280' },
];

export interface SupportRequest {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    content: string;
    createdAt: string;
    supportCount: number;
    supportedBy: string[];
    isAnonymous?: boolean;
    category: SupportCategory;
    photos?: string[];
    isResolved?: boolean;
    resolvedAt?: string;
    isLocked?: boolean;
    groupId?: string;
}

// ── Experience Feedbacks ─────────────────────────────

export interface ExperienceFeedback {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    content: string;
    createdAt: string;
    likes: number;
    likedBy: string[];
    photos?: string[];
}

// ── Notifications ────────────────────────────────────

export interface Notification {
    id: string;
    type: 'reminder' | 'achievement' | 'community' | 'encouragement' | 'support_resolved' | 'new_message';
    title: string;
    message: string;
    createdAt: string;
    read: boolean;
    actionUrl?: string;
}

// ── Day Resources (Admin media per day) ──────────────

export type ResourceType = 'image' | 'video' | 'pdf' | 'text' | 'audio';

export interface DayResource {
    id: string;
    dayNumber: number;
    resourceType: ResourceType;
    title: string;
    description?: string;
    url?: string;
    content?: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
}

// ── Study Groups ─────────────────────────────────────

export interface StudyGroup {
    id: string;
    name: string;
    description?: string;
    createdBy: string;
    created_by?: string;
    isOpen: boolean;
    is_open?: boolean;
    maxMembers: number;
    memberCount?: number;
    createdAt: string;
    created_at?: string;
    requiresApproval?: boolean;
    requires_approval?: boolean;
    isClosed?: boolean;
    is_closed?: boolean;
    closedReason?: string;
    closedAt?: string;
    pendingRequests?: number;
    creator?: {
        fullName: string;
        avatarUrl?: string;
    };
    profiles?: {
        full_name: string;
        avatar_url?: string;
    };
}

export interface StudyGroupMember {
    id: string;
    groupId: string;
    userId: string;
    role: 'admin' | 'moderator' | 'member';
    joinedAt: string;
    user?: {
        fullName: string;
        avatarUrl?: string;
    };
}

export interface StudyGroupJoinRequest {
    id: string;
    group_id: string;
    user_id: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    reviewed_at?: string;
    reviewed_by?: string;
    profiles?: {
        full_name: string;
        avatar_url?: string;
    };
}

export interface StudyGroupMessage {
    id: string;
    groupId: string;
    userId: string;
    content: string;
    createdAt: string;
    user?: {
        fullName: string;
        avatarUrl?: string;
    };
}

// ── Direct Messages ──────────────────────────────────

export interface DirectMessage {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    isRead: boolean;
    createdAt: string;
    sender?: {
        fullName: string;
        avatarUrl?: string;
    };
}

export interface Conversation {
    id: string;
    recipientId: string;
    recipientName: string;
    recipientAvatar?: string;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
}

// ── UI Types ─────────────────────────────────────────

export type TabType = 'home' | 'marketplace' | 'community' | 'profile' | 'library';

export interface AppSettings {
    notifications: {
        dailyReminder: boolean;
        reminderTime: string;
        supportUpdates: boolean;
        achievementAlerts: boolean;
        newMessageAlerts: boolean;
    };
    privacy: {
        showProfilePublicly: boolean;
        showProgressPublicly: boolean;
        allowDirectMessages: boolean;
    };
    accessibility: {
        fontSize: 'small' | 'medium' | 'large';
        highContrast: boolean;
    };
}

// ── Admin Stats ──────────────────────────────────────

export interface AdminStats {
    totalUsers: number;
    activeUsers: number;
    totalSupportRequests: number;
    resolvedRequests: number;
    totalExperienceFeedbacks: number;
    averageProgress: number;
    dailyActiveUsers: number[];
    requestsByCategory: Record<SupportCategory, number>;
}
