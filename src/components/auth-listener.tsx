'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { ensureUserProfile } from '@/lib/api-client';

// Ensure the user has a row in the profiles table via API (bypasses RLS)
async function ensureProfile(user: {
    id: string;
    email?: string;
    user_metadata: { full_name?: string; avatar_url?: string; first_name?: string };
}) {
    try {
        const fullName = user.user_metadata.full_name
            || user.user_metadata.first_name
            || user.email?.split('@')[0]
            || 'Utilisateur';

        await ensureUserProfile({
            id: user.id,
            email: user.email || '',
            full_name: fullName,
            avatar_url: user.user_metadata.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
            first_name: user.user_metadata.first_name || fullName.split(' ')[0] || undefined,
        });
    } catch (e) {
        console.warn('[Auth] ensureProfile error (non-blocking):', e);
    }
}

// Check if user profile is active — NEVER sign out on error (prevents infinite loop)
async function checkProfileActive(userId: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('is_active')
            .eq('id', userId)
            .single();

        // Network error or RLS error — ASSUME active (don't block login)
        if (error) {
            console.warn('[Auth] checkProfileActive query error (assuming active):', error.message);
            return true; // ← KEY FIX: never block login on network/RLS errors
        }

        // Only block if explicitly deactivated by admin
        if (data && data.is_active === false) {
            console.warn('[Auth] User account is deactivated by admin');
            await supabase.auth.signOut();
            alert('Votre compte a été désactivé par un administrateur.');
            return false;
        }

        return true;
    } catch (e) {
        // Catch-all: NEVER sign out on unexpected errors — prevents infinite login loop
        console.warn('[Auth] checkProfileActive exception (assuming active):', e);
        return true; // ← KEY FIX: assume active on any exception
    }
}

export function AuthListener() {
    const { setUser } = useAppStore();
    const isProcessingRef = useRef(false); // Prevent re-entrant calls

    useEffect(() => {
        // Initial session check
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    const isActive = await checkProfileActive(session.user.id);
                    if (!isActive) {
                        setUser(null);
                        return;
                    }

                    setUser({
                        id: session.user.id,
                        email: session.user.email || '',
                        name: session.user.user_metadata.full_name || 'Utilisateur',
                        avatar: session.user.user_metadata.avatar_url,
                        joinedAt: session.user.created_at,
                    });
                    useAppStore.getState().loadInitialData();
                    ensureProfile(session.user as any);
                } else {
                    setUser(null);
                    // Still load public data for guests
                    useAppStore.getState().loadInitialData();
                }
            } catch (e) {
                console.warn('[Auth] checkSession error:', e);
                setUser(null);
                useAppStore.getState().loadInitialData();
            }
        };

        checkSession();

        // Listen for auth changes — with re-entrancy guard
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                // Prevent re-entrant processing (signOut inside callback → new event → infinite loop)
                if (isProcessingRef.current) return;
                isProcessingRef.current = true;

                try {
                    if (session?.user) {
                        const isActive = await checkProfileActive(session.user.id);
                        if (!isActive) {
                            setUser(null);
                            isProcessingRef.current = false;
                            return;
                        }

                        setUser({
                            id: session.user.id,
                            email: session.user.email || '',
                            name: session.user.user_metadata.full_name || 'Utilisateur',
                            avatar: session.user.user_metadata.avatar_url,
                            joinedAt: session.user.created_at,
                        });
                        useAppStore.getState().loadInitialData();
                        ensureProfile(session.user as any);
                    } else {
                        setUser(null);
                    }
                } finally {
                    isProcessingRef.current = false;
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [setUser]);

    return null;
}
