import type { Filiere, Enrollment } from '@/lib/filieres/types'
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase';
import type { SupportRequest, ExperienceFeedback, SupportCategory } from './types';

// ══════════════════════════════════════════════════════════
// CampusFlow Zustand Store — Clean v5
// Auth, Organisation, UI, Notifications, DM, Support
// ══════════════════════════════════════════════════════════

// ── Types ────────────────────────────────────────────────

export interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    joinedAt: string;
    whatsapp?: string;
    city?: string;
    country?: string;
    role?: string;
}

export type { ExperienceFeedback };

// ── Store Interface ──────────────────────────────────────

interface AppState {
    // User & Auth
    user: User | null;
    isLoading: boolean;
    authError: string | null;
    setUser: (user: User | null) => void;

    // Centre de Formation
    currentFiliere: Filiere | null;
    currentEnrollment: Enrollment | null;
    userRole: 'student' | 'teacher' | 'secretary' | 'director' | 'superadmin';
    setCurrentFiliere: (f: Filiere | null) => void;
    setCurrentEnrollment: (e: Enrollment | null) => void;
    setUserRole: (r: 'student' | 'teacher' | 'secretary' | 'director' | 'superadmin') => void;

    // Auth actions
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (formData: Record<string, string>) => Promise<void>;
    signOut: () => Promise<void>;
    clearAuthError: () => void;
    loadInitialData: () => Promise<void>;

    // Support Requests
    supportRequests: SupportRequest[];
    addSupportRequest: (content: string, isAnonymous?: boolean, category?: SupportCategory, photos?: string[]) => Promise<string | null>;
    supportRequest: (requestId: string) => void;
    removeSupportRequest: (requestId: string) => void;

    // Experience Feedbacks
    experienceFeedbacks: ExperienceFeedback[];
    addExperienceFeedback: (content: string, photos?: string[]) => void;
    likeExperienceFeedback: (feedbackId: string) => void;

    // Theme
    theme: 'light' | 'dark' | 'system';
    setTheme: (theme: 'light' | 'dark' | 'system') => void;

    // App state
    isHydrated: boolean;
    setHydrated: (state: boolean) => void;

    // UI State
    activeTab: 'home' | 'marketplace' | 'community' | 'profile' | 'library';
    setActiveTab: (tab: 'home' | 'marketplace' | 'community' | 'profile' | 'library') => void;

    // Navigation from notifications (deep-link)
    pendingNavigation: {
        viewState?: string;
        groupId?: string;
        groupName?: string;
        conversationId?: string;
        communityTab?: string;
    } | null;
    setPendingNavigation: (nav: AppState['pendingNavigation']) => void;

    // DM refresh signal
    dmRefreshSignal: { conversationId: string; timestamp: number } | null;
    triggerDMRefresh: (conversationId: string) => void;

    // Global App Settings (Admin Controlled)
    appSettings: Record<string, string>;
    loadAppSettings: () => Promise<void>;
}

// ══════════════════════════════════════════════════════════
// Store Implementation
// ══════════════════════════════════════════════════════════

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            // ── User & Auth ──────────────────────────────
            user: null,
            isLoading: false,
            authError: null,
            setUser: (user) => set({ user }),

            // ── Centre de Formation defaults ─────────────
            currentFiliere: null,
            currentEnrollment: null,
            userRole: 'student' as const,
            setCurrentFiliere: (f) => set({ currentFiliere: f }),
            setCurrentEnrollment: (e) => set({ currentEnrollment: e }),
            setUserRole: (r) => set({ userRole: r }),

            // ── Auth: Sign In ────────────────────────────
            signIn: async (email, password) => {
                set({ isLoading: true, authError: null });

                const safetyTimeout = setTimeout(() => {
                    set({ isLoading: false, authError: 'Délai de connexion dépassé. Veuillez réessayer.' });
                }, 10000);

                try {
                    const { error } = await supabase.auth.signInWithPassword({ email, password });
                    if (error) throw error;
                } catch (error: unknown) {
                    const msg = error instanceof Error ? error.message : 'Erreur de connexion';
                    set({ authError: msg });
                } finally {
                    clearTimeout(safetyTimeout);
                    set({ isLoading: false });
                }
            },

            // ── Auth: Sign Up ────────────────────────────
            signUp: async (formData) => {
                set({ isLoading: true, authError: null });
                try {
                    const cleanPhone = formData.whatsapp.replace(/\D/g, '');
                    const email = `${cleanPhone}@campusflow.local`;
                    const password = formData.password;
                    const fullName = `${formData.firstName} ${formData.lastName}`;

                    const { error } = await supabase.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                full_name: fullName,
                                first_name: formData.firstName,
                                last_name: formData.lastName,
                                country: formData.country,
                                city: formData.city,
                                whatsapp: formData.whatsapp,
                                avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`,
                            },
                        },
                    });
                    if (error) throw error;
                } catch (error: unknown) {
                    const msg = error instanceof Error ? error.message : "Erreur d'inscription";
                    set({ authError: msg });
                } finally {
                    set({ isLoading: false });
                }
            },

            // ── Auth: Sign Out ───────────────────────────
            signOut: async () => {
                set({ isLoading: true });
                try {
                    await supabase.auth.signOut();
                    set({ user: null });
                } catch {
                    // Silent — user is already logged out locally
                } finally {
                    set({ isLoading: false });
                }
            },

            clearAuthError: () => set({ authError: null }),

            // ── App Settings ─────────────────────────────
            loadAppSettings: async () => {
                const { data } = await supabase.from('app_settings').select('key, value');
                if (data) {
                    const settingsMap = data.reduce(
                        (acc: Record<string, string>, s: { key: string; value: string }) => ({ ...acc, [s.key]: s.value }),
                        {}
                    );
                    set({ appSettings: settingsMap });
                }
            },

            // ── Load Initial Data ────────────────────────
            loadInitialData: async () => {
                get().loadAppSettings();
                const { user } = get();

                try {
                    // Load Support Requests (public)
                    const { data: requests } = await supabase
                        .from('tutoring_requests')
                        .select('*, profiles(full_name, avatar_url)')
                        .order('created_at', { ascending: false })
                        .limit(20);

                    if (requests) {
                        const formatted: SupportRequest[] = requests.map((p: Record<string, unknown>) => ({
                            id: p.id as string,
                            userId: p.user_id as string,
                            userName: (p.profiles as Record<string, unknown>)?.full_name as string || 'Anonyme',
                            userAvatar: (p.profiles as Record<string, unknown>)?.avatar_url as string | undefined,
                            content: p.content as string,
                            isAnonymous: p.is_anonymous as boolean,
                            category: (p.category as SupportCategory) || 'other',
                            photos: p.photos as string[] | undefined,
                            isResolved: p.is_answered as boolean,
                            resolvedAt: p.answered_at as string | undefined,
                            createdAt: p.created_at as string,
                            supportCount: (p.prayer_count as number) || 0,
                            supportedBy: (p.prayed_by as string[]) || [],
                        }));
                        set({ supportRequests: formatted });
                    }

                    // Load Experience Feedbacks (public)
                    const { data: feedbacks } = await supabase
                        .from('experience_feedbacks')
                        .select('*, profiles(full_name, avatar_url)')
                        .eq('is_approved', true)
                        .order('created_at', { ascending: false })
                        .limit(20);

                    if (feedbacks) {
                        const formatted: ExperienceFeedback[] = feedbacks.map((t: Record<string, unknown>) => ({
                            id: t.id as string,
                            userId: t.user_id as string,
                            userName: (t.profiles as Record<string, unknown>)?.full_name as string || 'Utilisateur',
                            userAvatar: (t.profiles as Record<string, unknown>)?.avatar_url as string | undefined,
                            content: t.content as string,
                            photos: (t.photos as string[]) || [],
                            createdAt: t.created_at as string,
                            likes: (t.likes as number) || 0,
                            likedBy: (t.liked_by as string[]) || [],
                        }));
                        set({ experienceFeedbacks: formatted });
                    }

                    if (!user) return;
                    // User-specific data could go here (enrollment, progress, etc.)
                } catch {
                    // Silent error — data will be loaded on next attempt
                }
            },

            // ── Support Requests ─────────────────────────
            supportRequests: [],
            addSupportRequest: async (content, isAnonymous = false, category = 'other', photos = []) => {
                const { user } = get();
                if (!user) return null;

                try {
                    const { data, error } = await supabase
                        .from('tutoring_requests')
                        .insert([{
                            user_id: user.id,
                            content,
                            is_anonymous: isAnonymous,
                            category: category || 'other',
                            photos: photos && photos.length > 0 ? photos : null,
                        }])
                        .select();

                    if (error) throw error;

                    if (data?.[0]) {
                        const newRequest: SupportRequest = {
                            id: data[0].id,
                            userId: user.id,
                            userName: user.name,
                            userAvatar: user.avatar,
                            content,
                            isAnonymous,
                            category: (category as SupportCategory) || 'other',
                            photos,
                            createdAt: data[0].created_at,
                            supportCount: 0,
                            supportedBy: [],
                        };
                        set((state) => ({
                            supportRequests: [newRequest, ...state.supportRequests],
                        }));
                        return data[0].id;
                    }
                    return null;
                } catch (e) {
                    throw e;
                }
            },

            supportRequest: async (requestId: string) => {
                const { user } = get();
                if (!user) return;

                try {
                    // Note: DB columns are still prayer_count/prayed_by
                    const { data: current, error: fetchError } = await supabase
                        .from('tutoring_requests')
                        .select('prayer_count, prayed_by')
                        .eq('id', requestId)
                        .single();

                    if (fetchError || !current) return;

                    const currentSupportedBy: string[] = current.prayed_by || [];
                    if (currentSupportedBy.includes(user.id)) return;

                    const { error: updateError } = await supabase
                        .from('tutoring_requests')
                        .update({
                            prayer_count: (current.prayer_count || 0) + 1,
                            prayed_by: [...currentSupportedBy, user.id],
                        })
                        .eq('id', requestId);

                    if (updateError) return;

                    set((state) => {
                        const updated = state.supportRequests.map((req) =>
                            req.id === requestId && !req.supportedBy.includes(user.id)
                                ? { ...req, supportCount: req.supportCount + 1, supportedBy: [...req.supportedBy, user.id] }
                                : req
                        );
                        return { supportRequests: updated };
                    });
                } catch {
                    // Silent
                }
            },

            removeSupportRequest: (requestId) => {
                set((state) => {
                    const filtered = state.supportRequests.filter((r) => r.id !== requestId);
                    return { supportRequests: filtered };
                });
            },

            // ── Experience Feedbacks ─────────────────────
            experienceFeedbacks: [],
            addExperienceFeedback: async (content, photos = []) => {
                const { user } = get();
                if (!user) return;

                try {
                    const { data, error } = await supabase.from('experience_feedbacks').insert([{
                        user_id: user.id,
                        content,
                    }]).select();

                    if (error) throw error;

                    if (data) {
                        const newFeedback: ExperienceFeedback = {
                            id: data[0].id,
                            userId: user.id,
                            userName: user.name,
                            userAvatar: user.avatar,
                            content,
                            photos,
                            createdAt: data[0].created_at,
                            likes: 0,
                            likedBy: [],
                        };
                        set((state) => ({
                            experienceFeedbacks: [newFeedback, ...state.experienceFeedbacks],
                        }));
                    }
                } catch {
                    // Silent
                }
            },

            likeExperienceFeedback: async (feedbackId) => {
                const { user } = get();
                if (!user) return;

                const { error } = await supabase.rpc('like_ExperienceFeedback', { ExperienceFeedback_id: feedbackId });

                if (!error) {
                    set((state) => {
                        const updated = state.experienceFeedbacks.map((t) =>
                            t.id === feedbackId && !t.likedBy.includes(user.id)
                                ? { ...t, likes: t.likes + 1, likedBy: [...t.likedBy, user.id] }
                                : t
                        );
                        return { experienceFeedbacks: updated };
                    });
                }
            },

            // ── Theme ────────────────────────────────────
            theme: 'system',
            setTheme: (theme) => set({ theme }),

            // ── Hydration ────────────────────────────────
            isHydrated: false,
            setHydrated: (state) => set({ isHydrated: state }),

            // ── UI State ─────────────────────────────────
            activeTab: 'home',
            setActiveTab: (tab) => set({ activeTab: tab }),
            pendingNavigation: null,
            setPendingNavigation: (nav) => set({ pendingNavigation: nav }),
            dmRefreshSignal: null,
            triggerDMRefresh: (conversationId) => set({ dmRefreshSignal: { conversationId, timestamp: Date.now() } }),

            // ── Global App Settings ──────────────────────
            appSettings: {},
        }),
        {
            name: 'iziteach-storage',
            partialize: (state) => ({
                theme: state.theme,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHydrated(true);
            },
        }
    )
);
