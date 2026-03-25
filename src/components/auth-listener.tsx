'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * CampusFlow AuthListener — lightweight version.
 * Only listens for Supabase Auth state changes (admin login via email/password).
 * Does NOT query legacy tables. CampusFlow teachers/students use access_code auth.
 */
export function AuthListener() {
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (session?.user) {
                    console.log('[Auth] User signed in:', session.user.id);
                } else {
                    console.log('[Auth] No active session');
                }
            }
        );
        return () => { subscription.unsubscribe(); };
    }, []);

    return null;
}
