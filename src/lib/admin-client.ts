/**
 * ADMIN CLIENT HELPERS — Direct Supabase calls (replaces /api/admin/* routes)
 * ============================================================================
 * These functions replace the serverless API routes for admin operations.
 * They use the standard Supabase client (with user auth) instead of service role.
 * Make sure RLS policies allow admins to perform these operations.
 */

import { supabase } from './supabase';

/**
 * Delete content (replaces POST /api/admin/delete-content)
 */
export async function adminDeleteContent({
    table,
    id,
}: {
    table: string;
    id: string;
}): Promise<{ success: boolean; error?: string }> {
    // Security: only allow deletion from known content tables
    const ALLOWED_TABLES = [
        'experience_feedbacks',
        'tutoring_requests',
        'group_messages',
        'direct_messages',
        'notifications',
        'favorites',
        'timetable_slots',
        'evaluations',
        'grades',
        'school_payments',
        'disciplines',
    ];

    if (!ALLOWED_TABLES.includes(table)) {
        return { success: false, error: `Table "${table}" is not allowed for deletion` };
    }

    try {
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[admin] Delete error:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Create user profile (replaces POST /api/admin/create-user)
 */
export async function adminCreateUser({
    email,
    full_name,
    role = 'user',
}: {
    email: string;
    full_name: string;
    role?: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        // Note: Creating auth users requires service role key.
        // For static export, admin user creation should be done via Supabase Dashboard
        // or a separate admin tool. Here we just create the profile.
        const id = crypto.randomUUID();
        const { error } = await supabase
            .from('profiles')
            .insert({
                id,
                email,
                full_name,
                role,
                avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(full_name)}`,
            });

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Delete user profile (replaces POST /api/admin/delete-user)
 */
export async function adminDeleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
