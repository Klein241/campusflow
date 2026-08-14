/**
 * PostRepository.ts
 * Wrappeur des RPCs securisees school_posts (migration 031).
 * Utilise DataProvider pour le dual-write automatique.
 */

import { supabase } from '@/lib/supabase';
import { SessionManager } from '@/lib/session';
import { DataProvider } from '@/lib/data-provider';

export interface SchoolPost {
    id: string;
    created_at: string;
    updated_at?: string;
    organization_id: string;
    user_id: string;
    user_type: 'student' | 'teacher';
    content: string;
    photos: string[];
    like_count: number;
    liked_by: string[];
}

export const PostRepository = {

    /** Lire les posts de l'organisation courante */
    async getAll(limit = 50, offset = 0): Promise<SchoolPost[]> {
        const session = SessionManager.get();
        if (!session) throw new Error('Session required');

        const { data, error } = await supabase.rpc('get_school_posts', {
            p_token: session.session_token,
            p_limit: limit,
            p_offset: offset,
        });
        if (error) throw error;
        return (data as SchoolPost[]) ?? [];
    },

    /** Creer un post */
    async create(content: string, photos: string[] = []): Promise<SchoolPost> {
        const session = SessionManager.get();
        if (!session) throw new Error('Session required');

        const { data, error } = await supabase.rpc('create_school_post', {
            p_token: session.session_token,
            p_content: content,
            p_photos: photos,
        });
        if (error) throw error;
        return data as SchoolPost;
    },

    /** Modifier un post (auteur seulement) */
    async update(postId: string, content: string, photos?: string[]): Promise<SchoolPost> {
        const session = SessionManager.get();
        if (!session) throw new Error('Session required');

        const { data, error } = await supabase.rpc('update_school_post', {
            p_token: session.session_token,
            p_post_id: postId,
            p_content: content,
            p_photos: photos ?? null,
        });
        if (error) throw error;
        return data as SchoolPost;
    },

    /** Supprimer un post (auteur seulement) */
    async delete(postId: string): Promise<boolean> {
        const session = SessionManager.get();
        if (!session) throw new Error('Session required');

        const { data, error } = await supabase.rpc('delete_school_post', {
            p_token: session.session_token,
            p_post_id: postId,
        });
        if (error) throw error;
        return !!data;
    },

    /** Toggle like sur un post */
    async toggleLike(postId: string): Promise<{ liked: boolean; like_count: number }> {
        const session = SessionManager.get();
        if (!session) throw new Error('Session required');

        const { data, error } = await supabase.rpc('toggle_like_post', {
            p_token: session.session_token,
            p_post_id: postId,
        });
        if (error) throw error;
        return data as { liked: boolean; like_count: number };
    },
};
