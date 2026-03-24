import type { Filiere, Enrollment } from '@/lib/filieres/types'
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase';
import type { TutoringRequest as TutoringRequestType, ExperienceFeedback as ExperienceFeedbackType } from './types';

// Types
export interface DayProgress {
    dayNumber: number;
    completed: boolean;
    completedAt?: string;
    prayerCompleted: boolean;
    coursesReadingCompleted: boolean;
    fastingCompleted: boolean;
    journalEntry?: string;
}

export interface coursesHighlight {
    id: string; // coursesId + verseId
    color: string;
}

export interface coursesFavorite {
    id: string; // verseId (which includes book/chapter context)
    coursesId: string;
    reference: string;
    text: string;
}

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

// Re-export types from types.ts to avoid duplication or use aliases
// But for now, we will just use the imported types in the AppState interface
// and remove the local definitions if they clash, or rename them.

export type TutoringRequest = TutoringRequestType;
export type ExperienceFeedback = ExperienceFeedbackType;

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    unlockedAt?: string;
    requirement: {
        type: 'streak' | 'days_completed' | 'prayers' | 'journal_entries';
        count: number;
    };
}

// Store interface
interface AppState {
    // User & Auth
    user: User | null;
    isLoading: boolean;
    authError: string | null;
    setUser: (user: User | null) => void;

    // ── CHAMPS CENTRE DE FORMATION ──
    currentFiliere: Filiere | null
    currentEnrollment: Enrollment | null
    userRole: 'student' | 'teacher' | 'secretary' | 'director' | 'superadmin'
    setCurrentFiliere: (f: Filiere | null) => void
    setCurrentEnrollment: (e: Enrollment | null) => void
    setUserRole: (r: 'student' | 'teacher' | 'secretary' | 'director' | 'superadmin') => void
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (formData: any) => Promise<void>;
    signOut: () => Promise<void>;
    clearAuthError: () => void;
    loadInitialData: () => Promise<void>;

    // Progress
    currentDay: number;
    startDate: string | null;
    dayProgress: DayProgress[];
    setStartDate: (date: string) => void;
    updateDayProgress: (dayNumber: number, progress: Partial<DayProgress>) => void;
    completeDay: (dayNumber: number) => void;

    // Stats
    streak: number;
    totalDaysCompleted: number;
    calculateStreak: () => number;

    // Achievements
    achievements: Achievement[];
    unlockedAchievements: string[];
    unlockAchievement: (achievementId: string) => void;

    // Prayer Wall
    TutoringRequests: TutoringRequest[];
    addTutoringRequest: (content: string, isAnonymous?: boolean, category?: PrayerCategory, photos?: string[]) => Promise<string | null>;
    prayForRequest: (requestId: string) => void;
    removeTutoringRequest: (requestId: string) => void;

    // experience_feedbacks
    experience_feedbacks: ExperienceFeedback[];
    addExperienceFeedback: (content: string, photos?: string[]) => void;
    likeExperienceFeedback: (ExperienceFeedbackId: string) => void;

    // Journal
    journalEntries: { date: string; content: string; mood?: string }[];
    addJournalEntry: (content: string, mood?: string) => void;

    // Theme
    theme: 'light' | 'dark' | 'system';
    setTheme: (theme: 'light' | 'dark' | 'system') => void;

    // App state
    isHydrated: boolean;
    setHydrated: (state: boolean) => void;

    // Navigation Context
    coursesNavigation: { bookId: string; chapterId: string } | null;
    CoursesViewTarget: 'home' | 'read' | 'study' | 'search' | 'favorites' | 'games' | null;
    setcoursesNavigation: (nav: { bookId: string; chapterId: string } | null) => void;
    setCoursesViewTarget: (target: 'home' | 'read' | 'study' | 'search' | 'favorites' | 'games' | null) => void;

    // UI State
    activeTab: 'home' | 'marketplace' | 'program' | 'courses' | 'journal' | 'community' | 'profile' | 'games' | 'library';
    selectedDay: number | null;
    setActiveTab: (tab: 'home' | 'marketplace' | 'program' | 'courses' | 'journal' | 'community' | 'profile' | 'games' | 'library') => void;
    setSelectedDay: (day: number | null) => void;

    // Navigation from notifications (deep-link)
    pendingNavigation: { viewState?: string; groupId?: string; groupName?: string; prayerId?: string; communityTab?: string; conversationId?: string } | null;
    setPendingNavigation: (nav: { viewState?: string; groupId?: string; groupName?: string; prayerId?: string; communityTab?: string; conversationId?: string } | null) => void;

    // DM refresh signal — triggers message reload in chat when a DM notification arrives (workaround for RLS blocking realtime)
    dmRefreshSignal: { conversationId: string; timestamp: number } | null;
    triggerDMRefresh: (conversationId: string) => void;

    // courses Persistence
    coursesHighlights: coursesHighlight[];
    coursesFavorites: coursesFavorite[];
    addcoursesHighlight: (highlight: coursesHighlight) => void;
    removecoursesHighlight: (id: string) => void;
    togglecoursesFavorite: (favorite: coursesFavorite) => void;

    // Advanced courses State
    downloadedcoursess: string[]; // IDs
    toggleDownloadcourses: (id: string) => void;
    coursesSettings: {
        offlineMode: boolean;
        splitView: boolean;
        parallelcoursesId: string | null;
    };
    setcoursesSettings: (settings: Partial<AppState['coursesSettings']>) => void;
    dailyVerse: coursesVerse | null;
    setDailyVerse: (verse: coursesVerse | null) => void;

    // Global App Settings (Admin Controlled)
    appSettings: Record<string, string>;
    loadAppSettings: () => Promise<void>;
}

// Default achievements
const defaultAchievements: Achievement[] = [
    {
        id: 'first-day',
        name: 'Premier Pas',
        description: 'Complétez votre premier jour de marathon',
        icon: '🌟',
        requirement: { type: 'days_completed', count: 1 },
    },
    {
        id: 'week-warrior',
        name: 'Guerrier de la Semaine',
        description: 'Complétez 7 jours consécutifs',
        icon: '⚔️',
        requirement: { type: 'streak', count: 7 },
    },
    {
        id: 'halfway',
        name: 'Mi-Parcours',
        description: 'Atteignez la moitié du marathon (20 jours)',
        icon: '🎯',
        requirement: { type: 'days_completed', count: 20 },
    },
    {
        id: 'finisher',
        name: 'Finisseur',
        description: 'Complétez le programme spirituel',
        icon: '🏆',
        requirement: { type: 'days_completed', count: 40 },
    },
    {
        id: 'prayer-warrior',
        name: 'Guerrier de Prière',
        description: 'Priez pour 10 demandes de tutorat',
        icon: '🙏',
        requirement: { type: 'prayers', count: 10 },
    },
    {
        id: 'journal-master',
        name: 'Maître Journal',
        description: 'Écrivez 20 entrées dans votre journal',
        icon: '📖',
        requirement: { type: 'journal_entries', count: 20 },
    },
];

// Initialize 40 days of progress
const initializeDayProgress = (): DayProgress[] => {
    return Array.from({ length: 40 }, (_, i) => ({
        dayNumber: i + 1,
        completed: false,
        prayerCompleted: false,
        coursesReadingCompleted: false,
        fastingCompleted: false,
    }));
};

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            // User & Auth
            user: null,
            isLoading: false,
            authError: null,
            setUser: (user) => set({ user }),

            // ── Centre de Formation defaults ──
            currentFiliere: null,
            currentEnrollment: null,
            userRole: 'student' as const,
            setCurrentFiliere: (f: any) => set({ currentFiliere: f }),
            setCurrentEnrollment: (e: any) => set({ currentEnrollment: e }),
            setUserRole: (r: any) => set({ userRole: r }),

            signIn: async (email, password) => {
                set({ isLoading: true, authError: null });

                // Safety timeout — never let spinner run more than 10 seconds
                const safetyTimeout = setTimeout(() => {
                    console.error('[Auth] signIn safety timeout hit — forcing isLoading=false');
                    set({ isLoading: false, authError: 'Délai de connexion dépassé. Veuillez réessayer.' });
                }, 10000);

                try {
                    console.log('[Auth] signIn called with email:', email);
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email,
                        password,
                    });
                    console.log('[Auth] signInWithPassword result:', {
                        hasUser: !!data?.user,
                        hasSession: !!data?.session,
                        error: error?.message
                    });
                    if (error) throw error;
                } catch (error: any) {
                    console.error('[Auth] signIn error:', error.message);
                    set({ authError: error.message || 'Erreur de connexion' });
                } finally {
                    clearTimeout(safetyTimeout);
                    set({ isLoading: false });
                    console.log('[Auth] signIn complete, isLoading=false');
                }
            },

            signUp: async (formData: any) => {
                set({ isLoading: true, authError: null });
                try {
                    // Strategy: Use whatsapp number to generate a fake email for Supabase Auth
                    // email: [clean_whatsapp]@centreformation.local
                    const cleanPhone = formData.whatsapp.replace(/\D/g, '');
                    const email = `${cleanPhone}@centreformation.local`;
                    const password = formData.password;
                    const fullName = `${formData.firstName} ${formData.lastName}`;

                    const { data, error } = await supabase.auth.signUp({
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
                    // Success
                } catch (error: any) {
                    set({ authError: error.message || 'Erreur d\'inscription' });
                } finally {
                    set({ isLoading: false });
                }
            },

            signOut: async () => {
                set({ isLoading: true });
                try {
                    await supabase.auth.signOut();
                    set({ user: null }); // Clear user immediately
                } catch (error) {
                    console.error('Error signing out', error);
                } finally {
                    set({ isLoading: false });
                }
            },

            clearAuthError: () => set({ authError: null }),

            loadAppSettings: async () => {
                const { data } = await supabase.from('app_settings').select('key, value');
                if (data) {
                    const settingsMap = data.reduce((acc: any, s: any) => ({ ...acc, [s.key]: s.value }), {});
                    set({ appSettings: settingsMap });
                }
            },

            loadInitialData: async () => {
                console.log('[Store] loadInitialData called');
                get().loadAppSettings();
                const { user } = get();
                console.log('[Store] user:', user ? user.id : 'guest');

                try {
                    // Load Prayers (public - accessible even without login)
                    const { data: prayers, error: prayersError } = await supabase
                        .from('tutoring_requests')
                        .select('*, profiles(full_name, avatar_url)')
                        .order('created_at', { ascending: false })
                        .limit(20);

                    if (prayersError) console.warn('[Store] prayers error:', prayersError.message);
                    else console.log('[Store] prayers loaded:', prayers?.length || 0);

                    if (prayers) {
                        const formattedPrayers = prayers.map((p: any) => ({
                            id: p.id,
                            userId: p.user_id,
                            userName: p.profiles?.full_name || 'Anonyme',
                            userAvatar: p.profiles?.avatar_url,
                            content: p.content,
                            isAnonymous: p.is_anonymous,
                            category: p.category,
                            photos: p.photos,
                            isAnswered: p.is_answered,
                            answeredAt: p.answered_at,
                            createdAt: p.created_at,
                            prayerCount: p.prayer_count || 0,
                            prayedBy: p.prayed_by || [],
                        }));
                        set({ TutoringRequests: formattedPrayers });
                    }

                    // Load experience_feedbacks (public)
                    const { data: experience_feedbacks } = await supabase
                        .from('experience_feedbacks')
                        .select('*, profiles(full_name, avatar_url)')
                        .eq('is_approved', true)
                        .order('created_at', { ascending: false })
                        .limit(20);

                    if (experience_feedbacks) {
                        const formattedexperience_feedbacks = experience_feedbacks.map((t: any) => ({
                            id: t.id,
                            userId: t.user_id,
                            userName: t.profiles?.full_name || 'Utilisateur',
                            userAvatar: t.profiles?.avatar_url,
                            content: t.content,
                            photos: t.photos || [],
                            createdAt: t.created_at,
                            likes: t.likes || 0,
                            likedBy: t.liked_by || [],
                        }));
                        set({ experience_feedbacks: formattedexperience_feedbacks });
                    }

                    // User-specific data requires login
                    if (!user) return;
                    // Load Progress
                    const { data: progressData } = await supabase
                        .from('student_progress')
                        .select('*')
                        .eq('user_id', user.id);

                    if (progressData && progressData.length > 0) {
                        set((state) => {
                            const newDayProgress = state.dayProgress.map(day => {
                                const serverDay = progressData.find((pd: any) => pd.day_number === day.dayNumber);
                                if (serverDay) {
                                    return {
                                        ...day,
                                        completed: serverDay.completed,
                                        completedAt: serverDay.completed_at,
                                        prayerCompleted: serverDay.prayer_completed,
                                        coursesReadingCompleted: serverDay.courses_reading_completed,
                                        fastingCompleted: serverDay.fasting_completed,
                                    };
                                }
                                return day;
                            });

                            const totalDaysCompleted = newDayProgress.filter(d => d.completed).length;

                            return {
                                dayProgress: newDayProgress,
                                totalDaysCompleted,
                            };
                        });
                        // Recalculate streak after setting progress
                        get().calculateStreak();
                    }


                } catch (error) {
                    console.error('Error loading initial data', error);
                }
            },

            // Progress
            currentDay: 1,
            startDate: null,
            dayProgress: initializeDayProgress(),
            setStartDate: (date) => set({ startDate: date }),
            updateDayProgress: async (dayNumber, progress) => {
                const { user } = get();
                // Update local state first (Optimistic UI)
                set((state) => ({
                    dayProgress: state.dayProgress.map((day) =>
                        day.dayNumber === dayNumber ? { ...day, ...progress } : day
                    ),
                }));

                // Sync with Supabase if user logged in
                if (user) {
                    try {
                        // Try upsert first, fallback to update if constraint doesn't exist
                        const { error } = await supabase
                            .from('student_progress')
                            .upsert({
                                user_id: user.id,
                                day_number: dayNumber,
                                ...progress,
                                created_at: new Date().toISOString()
                            }, { onConflict: 'user_id,day_number' });

                        if (error) {
                            // Fallback: try plain insert (ignore if already exists)
                            try {
                                await supabase
                                    .from('student_progress')
                                    .insert({
                                        user_id: user.id,
                                        day_number: dayNumber,
                                        ...progress,
                                        created_at: new Date().toISOString()
                                    });
                            } catch {
                                // Silently ignore
                            }
                        }
                    } catch (e) {
                        // Silently ignore sync errors - local state is already updated
                    }
                }
            },
            completeDay: async (dayNumber) => {
                const { user } = get();
                const completedAt = new Date().toISOString();

                // Update local state
                set((state) => {
                    const updatedProgress = state.dayProgress.map((day) =>
                        day.dayNumber === dayNumber
                            ? { ...day, completed: true, completedAt }
                            : day
                    );
                    const totalDaysCompleted = updatedProgress.filter((d) => d.completed).length;
                    return {
                        dayProgress: updatedProgress,
                        totalDaysCompleted,
                        currentDay: Math.min(dayNumber + 1, 40),
                    };
                });

                // Sync with Supabase - silently ignore errors
                if (user) {
                    try {
                        const { error } = await supabase.from('student_progress').upsert({
                            user_id: user.id,
                            day_number: dayNumber,
                            completed: true,
                            completed_at: completedAt
                        }, { onConflict: 'user_id,day_number' });

                        if (error) {
                            // Fallback: plain insert
                            try {
                                await supabase.from('student_progress').insert({
                                    user_id: user.id,
                                    day_number: dayNumber,
                                    completed: true,
                                    completed_at: completedAt
                                });
                            } catch {
                                // Silently ignore
                            }
                        }
                    } catch (e) {
                        // Silently ignore
                    }
                }
            },

            // Stats
            streak: 0,
            totalDaysCompleted: 0,
            calculateStreak: () => {
                const { dayProgress } = get();
                let streak = 0;
                for (let i = dayProgress.length - 1; i >= 0; i--) {
                    if (dayProgress[i].completed) {
                        streak++;
                    } else {
                        break;
                    }
                }
                set({ streak });
                return streak;
            },

            // Achievements
            achievements: defaultAchievements,
            unlockedAchievements: [],
            unlockAchievement: (achievementId) =>
                set((state) => {
                    if (state.unlockedAchievements.includes(achievementId)) return state;
                    return {
                        unlockedAchievements: [...state.unlockedAchievements, achievementId],
                        achievements: state.achievements.map((a) =>
                            a.id === achievementId
                                ? { ...a, unlockedAt: new Date().toISOString() }
                                : a
                        ),
                    };
                }),

            // Prayer Wall
            TutoringRequests: [],
            addTutoringRequest: async (content, isAnonymous = false, category = 'other', photos = []) => {
                const { user } = get();
                if (!user) return null;

                try {
                    // Include all fields in the insert
                    const newRequest: any = {
                        user_id: user.id,
                        content,
                        is_anonymous: isAnonymous,
                        category: category || 'other',
                        photos: photos && photos.length > 0 ? photos : null,
                    };

                    // Save to Supabase
                    const { data, error } = await supabase.from('tutoring_requests').insert([newRequest]).select();

                    if (error) {
                        console.error('Error adding prayer request:', error);
                        throw error;
                    }

                    if (data && data[0]) {
                        const newId = data[0].id;
                        set((state) => ({
                            TutoringRequests: [{
                                id: newId,
                                userId: user.id,
                                userName: user.name,
                                userAvatar: user.avatar,
                                content,
                                isAnonymous: isAnonymous,
                                category: category || 'other',
                                photos: photos,
                                createdAt: data[0].created_at,
                                prayerCount: 0,
                                prayedBy: [],
                            }, ...state.TutoringRequests]
                        }));
                        return newId;
                    }
                    return null;
                } catch (e) {
                    console.error('Failed to add prayer request:', e);
                    throw e;
                }
            },
            prayForRequest: async (requestId) => {
                const { user } = get();
                if (!user) return;

                try {
                    // First, get current prayer data
                    const { data: currentPrayer, error: fetchError } = await supabase
                        .from('tutoring_requests')
                        .select('prayer_count, prayed_by')
                        .eq('id', requestId)
                        .single();

                    if (fetchError) {
                        console.error('Error fetching prayer:', fetchError);
                        return;
                    }

                    const currentPrayedBy = currentPrayer?.prayed_by || [];
                    const currentCount = currentPrayer?.prayer_count || 0;

                    // Check if user already prayed
                    if (currentPrayedBy.includes(user.id)) {
                        console.log('User already prayed for this request');
                        return;
                    }

                    // Update with new prayer
                    const { error: updateError } = await supabase
                        .from('tutoring_requests')
                        .update({
                            prayer_count: currentCount + 1,
                            prayed_by: [...currentPrayedBy, user.id]
                        })
                        .eq('id', requestId);

                    if (updateError) {
                        console.error('Error updating prayer count:', updateError);
                        return;
                    }

                    // Update local state
                    set((state) => ({
                        TutoringRequests: state.TutoringRequests.map((req) =>
                            req.id === requestId && !req.prayedBy.includes(user.id)
                                ? {
                                    ...req,
                                    prayerCount: req.prayerCount + 1,
                                    prayedBy: [...req.prayedBy, user.id],
                                }
                                : req
                        ),
                    }));

                    // Send notification to prayer owner
                    const prayerReq = get().TutoringRequests.find(p => p.id === requestId);
                    const prayerOwnerId = prayerReq?.userId;
                    if (prayerOwnerId && prayerOwnerId !== user.id) {
                        notifyPrayerPrayed({
                            prayerOwnerId,
                            prayerContent: prayerReq?.content || '',
                            prayerUserName: user.name,
                            prayerId: requestId,
                            actorId: user.id,
                            actorAvatar: user.avatar,
                        }).catch(console.error);
                    }

                    // Notify user's friends that they prayed for this topic
                    notifyFriendPrayed({
                        userId: user.id,
                        userName: user.name,
                        prayerContent: prayerReq?.content || '',
                        prayerId: requestId,
                        actorAvatar: user.avatar,
                    }).catch(console.error);
                } catch (e) {
                    console.error('Error in prayForRequest:', e);
                }
            },

            removeTutoringRequest: (requestId) => {
                set((state) => ({
                    TutoringRequests: state.TutoringRequests.filter(p => p.id !== requestId)
                }));
            },

            // experience_feedbacks
            experience_feedbacks: [],
            addExperienceFeedback: async (content, photos = []) => {
                const { user } = get();
                if (!user) return;

                try {
                    // Start with minimal fields
                    const newExperienceFeedback: any = {
                        user_id: user.id,
                        content,
                    };

                    // Save to Supabase
                    const { data, error } = await supabase.from('experience_feedbacks').insert([newExperienceFeedback]).select();

                    if (error) {
                        console.error('Error adding ExperienceFeedback:', error);
                        throw error;
                    }

                    if (data) {
                        set((state) => ({
                            experience_feedbacks: [{
                                id: data[0].id,
                                userId: user.id,
                                userName: user.name,
                                userAvatar: user.avatar,
                                content,
                                photos,
                                createdAt: data[0].created_at,
                                likes: 0,
                                likedBy: [],
                            }, ...state.experience_feedbacks]
                        }));
                    }
                } catch (e) {
                    console.error('Failed to add ExperienceFeedback:', e);
                    throw e;
                }
            },
            likeExperienceFeedback: async (ExperienceFeedbackId) => {
                const { user } = get();
                if (!user) return;

                const { error } = await supabase.rpc('like_ExperienceFeedback', { ExperienceFeedback_id: ExperienceFeedbackId });

                if (!error) {
                    set((state) => ({
                        experience_feedbacks: state.experience_feedbacks.map((t) =>
                            t.id === ExperienceFeedbackId && !t.likedBy.includes(user.id)
                                ? {
                                    ...t,
                                    likes: t.likes + 1,
                                    likedBy: [...t.likedBy, user.id],
                                }
                                : t
                        ),
                    }));
                }
            },

            // Journal
            journalEntries: [],
            addJournalEntry: (content, mood) =>
                set((state) => ({
                    journalEntries: [
                        { date: new Date().toISOString(), content, mood },
                        ...state.journalEntries,
                    ],
                })),

            // Theme
            theme: 'system',
            setTheme: (theme) => set({ theme }),

            // Hydration
            isHydrated: false,
            setHydrated: (state) => set({ isHydrated: state }),

            // Navigation Context
            coursesNavigation: null,
            CoursesViewTarget: null,
            setcoursesNavigation: (nav) => set({ coursesNavigation: nav }),
            setCoursesViewTarget: (target) => set({ CoursesViewTarget: target }),

            // UI State
            activeTab: 'home',
            selectedDay: null,
            setActiveTab: (tab) => set({ activeTab: tab }),
            setSelectedDay: (day) => set({ selectedDay: day }),
            pendingNavigation: null,
            setPendingNavigation: (nav) => set({ pendingNavigation: nav }),
            dmRefreshSignal: null,
            triggerDMRefresh: (conversationId) => set({ dmRefreshSignal: { conversationId, timestamp: Date.now() } }),

            // courses Persistence
            coursesHighlights: [],
            coursesFavorites: [],
            addcoursesHighlight: (highlight) => set((state) => ({
                coursesHighlights: [...state.coursesHighlights.filter(h => h.id !== highlight.id), highlight]
            })),
            removecoursesHighlight: (id) => set((state) => ({
                coursesHighlights: state.coursesHighlights.filter(h => h.id !== id)
            })),
            togglecoursesFavorite: (fav) => set((state) => {
                const exists = state.coursesFavorites.find(f => f.id === fav.id && f.coursesId === fav.coursesId);
                if (exists) {
                    return { coursesFavorites: state.coursesFavorites.filter(f => !(f.id === fav.id && f.coursesId === fav.coursesId)) };
                }
                return { coursesFavorites: [...state.coursesFavorites, fav] };
            }),

            // Advanced courses Persistence
            downloadedcoursess: [DEFAULT_courses_ID], // LSG downloaded by default
            toggleDownloadcourses: (id) => set((state) => ({
                downloadedcoursess: state.downloadedcoursess.includes(id)
                    ? state.downloadedcoursess.filter(bid => bid !== id)
                    : [...state.downloadedcoursess, id]
            })),
            coursesSettings: {
                offlineMode: false,
                splitView: false,
                parallelcoursesId: null,
            },
            setcoursesSettings: (settings) => set((state) => ({
                coursesSettings: { ...state.coursesSettings, ...settings }
            })),
            dailyVerse: null,
            setDailyVerse: (verse) => set({ dailyVerse: verse }),

            // Global App Settings
            appSettings: {},
        }),
        {
            name: 'centreformation-storage',
            partialize: (state) => ({
                // Sync only local prefs
                theme: state.theme,
                // UI state like activeTab shouldn't persist usually, but maybe helpful? 
                // Let's persist basic data, not navigation state for now to avoid stuck states.
                currentDay: state.currentDay,
                startDate: state.startDate,
                dayProgress: state.dayProgress,
                streak: state.streak,
                totalDaysCompleted: state.totalDaysCompleted,
                unlockedAchievements: state.unlockedAchievements,
                journalEntries: state.journalEntries,
                coursesHighlights: state.coursesHighlights,
                coursesFavorites: state.coursesFavorites,
                downloadedcoursess: state.downloadedcoursess,
                coursesSettings: state.coursesSettings,
                dailyVerse: state.dailyVerse,
                // Don't persist user/auth state ideally, rely on session check, 
                // but for transitioning we might keep it or clear it on load if session invalid
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHydrated(true);
            },
        }
    )
);
