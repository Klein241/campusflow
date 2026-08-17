// Social Features Service — CampusFlow v5 (Clean)
// =================================================
// Handles likes, favorites, sharing, support requests, and messaging
// All legacy prayer/bible references have been removed.

import { supabase } from './supabase';

export interface SocialAction {
    success: boolean;
    liked?: boolean;
    favorited?: boolean;
    count?: number;
    error?: string;
}

export const socialService = {
    // ========================
    // ExperienceFeedback LIKES
    // ========================

    async toggleExperienceFeedbackLike(ExperienceFeedbackId: string, userId: string): Promise<SocialAction> {
        try {
            const { data, error } = await supabase
                .rpc('toggle_ExperienceFeedback_like', {
                    ExperienceFeedback_id: ExperienceFeedbackId,
                    liking_user_id: userId
                });

            if (error) {
                // Fallback: manual update
                const { data: ExperienceFeedback } = await supabase
                    .from('experience_feedbacks')
                    .select('likes, liked_by')
                    .eq('id', ExperienceFeedbackId)
                    .single();

                if (!ExperienceFeedback) throw new Error('ExperienceFeedback not found');

                const likedBy = ExperienceFeedback.liked_by || [];
                const alreadyLiked = likedBy.includes(userId);

                if (alreadyLiked) {
                    await supabase
                        .from('experience_feedbacks')
                        .update({
                            likes: Math.max(0, (ExperienceFeedback.likes || 0) - 1),
                            liked_by: likedBy.filter((id: string) => id !== userId)
                        })
                        .eq('id', ExperienceFeedbackId);

                    return { success: true, liked: false, count: Math.max(0, (ExperienceFeedback.likes || 0) - 1) };
                } else {
                    await supabase
                        .from('experience_feedbacks')
                        .update({
                            likes: (ExperienceFeedback.likes || 0) + 1,
                            liked_by: [...likedBy, userId]
                        })
                        .eq('id', ExperienceFeedbackId);

                    return { success: true, liked: true, count: (ExperienceFeedback.likes || 0) + 1 };
                }
            }

            return { success: true, liked: data === true };
        } catch (e: any) {
            console.error('Error toggling like:', e);
            return { success: false, error: e.message };
        }
    },

    async isExperienceFeedbackLiked(ExperienceFeedbackId: string, userId: string): Promise<boolean> {
        try {
            const { data } = await supabase
                .from('experience_feedbacks')
                .select('liked_by')
                .eq('id', ExperienceFeedbackId)
                .single();

            return data?.liked_by?.includes(userId) || false;
        } catch {
            return false;
        }
    },

    // ========================
    // SUPPORT REQUEST LIKES
    // ========================

    async toggleSupportLike(requestId: string, userId: string): Promise<SocialAction> {
        try {
            // Note: DB columns are still prayer_count/prayed_by — mapped here to support terminology
            const { data: request } = await supabase
                .from('tutoring_requests')
                .select('prayer_count, prayed_by')
                .eq('id', requestId)
                .single();

            if (!request) throw new Error('Support request not found');

            const supportedBy: string[] = request.prayed_by || [];
            const alreadySupported = supportedBy.includes(userId);

            if (alreadySupported) {
                await supabase
                    .from('tutoring_requests')
                    .update({
                        prayer_count: Math.max(0, (request.prayer_count || 0) - 1),
                        prayed_by: supportedBy.filter((id: string) => id !== userId)
                    })
                    .eq('id', requestId);

                return { success: true, liked: false, count: Math.max(0, (request.prayer_count || 0) - 1) };
            } else {
                await supabase
                    .from('tutoring_requests')
                    .update({
                        prayer_count: (request.prayer_count || 0) + 1,
                        prayed_by: [...supportedBy, userId]
                    })
                    .eq('id', requestId);

                return { success: true, liked: true, count: (request.prayer_count || 0) + 1 };
            }
        } catch (e: any) {
            console.error('Error toggling support:', e);
            return { success: false, error: e.message };
        }
    },

    /** @deprecated Use toggleSupportLike */
    togglePrayerLike(requestId: string, userId: string) {
        return this.toggleSupportLike(requestId, userId);
    },

    // ========================
    // FAVORITES
    // ========================

    async addFavorite(userId: string, itemType: string, itemId: string, itemData?: any): Promise<SocialAction> {
        try {
            const { error } = await supabase
                .from('favorites')
                .insert({
                    user_id: userId,
                    item_type: itemType,
                    item_id: itemId,
                    item_data: itemData || null
                });

            if (error) {
                if (error.message.includes('duplicate')) {
                    return { success: true, favorited: true };
                }
                throw error;
            }

            return { success: true, favorited: true };
        } catch (e: any) {
            console.error('Error adding favorite:', e);
            return { success: false, error: e.message };
        }
    },

    async removeFavorite(userId: string, itemType: string, itemId: string): Promise<SocialAction> {
        try {
            const { error } = await supabase
                .from('favorites')
                .delete()
                .eq('user_id', userId)
                .eq('item_type', itemType)
                .eq('item_id', itemId);

            if (error) throw error;
            return { success: true, favorited: false };
        } catch (e: any) {
            console.error('Error removing favorite:', e);
            return { success: false, error: e.message };
        }
    },

    async toggleFavorite(userId: string, itemType: string, itemId: string, itemData?: any): Promise<SocialAction> {
        const isFav = await this.isFavorited(userId, itemType, itemId);

        if (isFav) {
            return this.removeFavorite(userId, itemType, itemId);
        } else {
            return this.addFavorite(userId, itemType, itemId, itemData);
        }
    },

    async isFavorited(userId: string, itemType: string, itemId: string): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('favorites')
                .select('id')
                .eq('user_id', userId)
                .eq('item_type', itemType)
                .eq('item_id', itemId)
                .maybeSingle();

            return !error && !!data;
        } catch {
            return false;
        }
    },

    async getFavorites(userId: string, itemType?: string) {
        try {
            let query = supabase
                .from('favorites')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (itemType) {
                query = query.eq('item_type', itemType);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Error fetching favorites:', e);
            return [];
        }
    },

    // ========================
    // EXPERIENCE FEEDBACKS
    // ========================

    async createExperienceFeedback(userId: string, content: string, photoUrl?: string, photos?: string[]): Promise<SocialAction> {
        try {
            const { error } = await supabase
                .from('experience_feedbacks')
                .insert({
                    user_id: userId,
                    content: content,
                    photo_url: photoUrl || null,
                    photos: photos || [],
                    is_approved: false,
                    likes: 0,
                    liked_by: []
                });

            if (error) throw error;
            return { success: true };
        } catch (e: any) {
            console.error('Error creating ExperienceFeedback:', e);
            return { success: false, error: e.message };
        }
    },

    async getexperience_feedbacks(approvedOnly: boolean = true) {
        try {
            let query = supabase
                .from('experience_feedbacks')
                .select(`
                    *,
                    profiles:user_id (full_name, avatar_url)
                `)
                .order('created_at', { ascending: false });

            if (approvedOnly) {
                query = query.eq('is_approved', true);
            }

            const { data, error } = await query;
            if (error) throw error;

            return data?.map(t => ({
                id: t.id,
                userId: t.user_id,
                userName: t.profiles?.full_name || 'Anonyme',
                userAvatar: t.profiles?.avatar_url,
                content: t.content,
                photoUrl: t.photo_url,
                photos: t.photos || [],
                likes: t.likes || 0,
                likedBy: t.liked_by || [],
                isApproved: t.is_approved,
                createdAt: t.created_at
            })) || [];
        } catch (e) {
            console.error('Error fetching experience_feedbacks:', e);
            return [];
        }
    },

    // ========================
    // SUPPORT REQUESTS
    // ========================

    async createSupportRequest(
        userId: string,
        content: string,
        category: string = 'other',
        isAnonymous: boolean = false,
        photos?: string[]
    ): Promise<SocialAction> {
        try {
            const { error } = await supabase
                .from('tutoring_requests')
                .insert({
                    user_id: userId,
                    content: content,
                    category: category,
                    is_anonymous: isAnonymous,
                    photos: photos || [],
                    prayer_count: 0,
                    prayed_by: []
                });

            if (error) throw error;
            return { success: true };
        } catch (e: any) {
            console.error('Error creating support request:', e);
            return { success: false, error: e.message };
        }
    },

    /** @deprecated Use createSupportRequest */
    createTutoringRequest(userId: string, content: string, category?: string, isAnonymous?: boolean, photos?: string[]) {
        return this.createSupportRequest(userId, content, category, isAnonymous, photos);
    },

    async getSupportRequests(category?: string) {
        try {
            let query = supabase
                .from('tutoring_requests')
                .select(`
                    *,
                    profiles:user_id (full_name, avatar_url)
                `)
                .order('created_at', { ascending: false });

            if (category && category !== 'all') {
                query = query.eq('category', category);
            }

            const { data, error } = await query;
            if (error) throw error;

            return data?.map(p => ({
                id: p.id,
                userId: p.user_id,
                userName: p.is_anonymous ? 'Anonyme' : (p.profiles?.full_name || 'Utilisateur'),
                userAvatar: p.is_anonymous ? null : p.profiles?.avatar_url,
                content: p.content,
                category: p.category,
                isAnonymous: p.is_anonymous,
                photos: p.photos || [],
                supportCount: p.prayer_count || 0,
                supportedBy: p.prayed_by || [],
                isResolved: p.is_answered,
                resolvedAt: p.answered_at,
                createdAt: p.created_at
            })) || [];
        } catch (e) {
            console.error('Error fetching support requests:', e);
            return [];
        }
    },

    /** @deprecated Use getSupportRequests */
    getTutoringRequests(category?: string) {
        return this.getSupportRequests(category);
    },

    async markRequestResolved(requestId: string): Promise<SocialAction> {
        try {
            const { error } = await supabase
                .from('tutoring_requests')
                .update({
                    is_answered: true,
                    answered_at: new Date().toISOString()
                })
                .eq('id', requestId);

            if (error) throw error;
            return { success: true };
        } catch (e: any) {
            console.error('Error marking request resolved:', e);
            return { success: false, error: e.message };
        }
    },

    /** @deprecated Use markRequestResolved */
    markPrayerAnswered(requestId: string) {
        return this.markRequestResolved(requestId);
    },

    // ========================
    // SHARE FUNCTIONALITY
    // ========================

    async shareContent(type: 'feedback' | 'support' | 'post', content: string, title?: string) {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title || 'Partagé depuis IziTeach',
                    text: content,
                    url: window.location.href
                });
                return { success: true };
            } catch (e) {
                return { success: false };
            }
        } else {
            try {
                await navigator.clipboard.writeText(content);
                return { success: true };
            } catch (e) {
                return { success: false };
            }
        }
    },

    // ========================
    // CHAT MESSAGES
    // ========================

    async sendChatMessage(groupId: string | null, userId: string, content: string) {
        try {
            const { error } = await supabase
                .from('group_messages')
                .insert({
                    group_id: groupId,
                    user_id: userId,
                    content: content,
                });
            if (error) throw error;
            return { success: true };
        } catch (e: any) {
            console.error('Error sending message:', e);
            return { success: false, error: e.message };
        }
    },

    async getGroupMessages(groupId: string, limit: number = 50) {
        try {
            const { data: rawMsgs, error } = await supabase
                .from('group_messages')
                .select('id, group_id, user_id, content, type, voice_url, voice_duration, created_at, is_pinned')
                .eq('group_id', groupId)
                .order('created_at', { ascending: true })
                .limit(limit);

            if (error) throw error;
            const msgs = rawMsgs || [];
            if (msgs.length === 0) return [];

            const uids = [...new Set(msgs.map(m => m.user_id))];
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('id', uids);

            const profileMap = new Map((profiles || []).map(p => [p.id, p]));
            return msgs.map(m => ({
                ...m,
                profiles: profileMap.get(m.user_id) || { full_name: 'Utilisateur', avatar_url: null }
            }));
        } catch (e) {
            console.error('Error fetching messages:', e);
            return [];
        }
    },

    // ========================
    // DIRECT MESSAGES
    // ========================

    async sendDirectMessage(senderId: string, receiverId: string, content: string) {
        try {
            const { error } = await supabase
                .from('direct_messages')
                .insert({
                    sender_id: senderId,
                    receiver_id: receiverId,
                    content: content,
                    is_read: false
                });

            if (error) throw error;
            return { success: true };
        } catch (e: any) {
            console.error('Error sending DM:', e);
            return { success: false, error: e.message };
        }
    },

    async getDirectMessages(userId: string, otherUserId: string, limit: number = 50) {
        try {
            const { data, error } = await supabase
                .from('direct_messages')
                .select(`
                    *,
                    sender:sender_id (full_name, avatar_url)
                `)
                .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
                .order('created_at', { ascending: true })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Error fetching DMs:', e);
            return [];
        }
    },

    async markMessagesAsRead(userId: string, senderId: string) {
        try {
            const { error } = await supabase
                .from('direct_messages')
                .update({ is_read: true })
                .eq('sender_id', senderId)
                .eq('receiver_id', userId)
                .eq('is_read', false);

            if (error) throw error;
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },

    async getConversations(userId: string) {
        try {
            const { data: sent } = await supabase
                .from('direct_messages')
                .select('receiver_id')
                .eq('sender_id', userId);

            const { data: received } = await supabase
                .from('direct_messages')
                .select('sender_id')
                .eq('receiver_id', userId);

            const userIds = new Set([
                ...(sent?.map(m => m.receiver_id) || []),
                ...(received?.map(m => m.sender_id) || [])
            ]);

            if (userIds.size === 0) return [];

            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('id', Array.from(userIds));

            return profiles || [];
        } catch (e) {
            console.error('Error fetching conversations:', e);
            return [];
        }
    }
};

export default socialService;
