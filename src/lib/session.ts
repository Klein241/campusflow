// ─────────────────────────────────────────────────────────────
// CampusFlow — Session Manager (src/lib/session.ts)
// Remplace l’accès direct à localStorage('iziteach_session')
// ─────────────────────────────────────────────────────────────

import { supabase } from '@/lib/supabase';

const SESSION_KEY = 'iziteach_session';
const SESSION_KEY_LEGACY = 'campusflow_session'; // migration douce

// ── Interface session ──────────────────────────────────────
export interface CampusSession {
    // Identité vérifiée côté serveur
    session_token: string;        // token opaque 64 hex chars (vide pour sessions pending)
    profile_id:    string;        // UUID du profil teacher/student
    role:          'teacher' | 'student' | 'admin';
    org_id:        string;        // UUID de l'organisation
    expires_at:    string;        // ISO string (8h)

    // Cache local du profil (non-vérifié côté serveur)
    first_name?:      string;
    last_name?:       string;
    classroom_id?:    string;
    photo_url?:       string | null;
    sky_points?:      number;
    approval_status?: 'pending' | 'approved' | 'rejected' | 'info_needed'; // pour étudiants auto-inscrits
    access_code?:     string | null;
    phone?:           string | null;
    email?:           string | null;
    organization_id?: string;

    // Timestamp client
    logged_in_at:  string;
}

// ── SessionManager ─────────────────────────────────────────
export const SessionManager = {

    /** Lire la session courante. Null si absente ou expirée. */
    get(): CampusSession | null {
        if (typeof window === 'undefined') return null;
        try {
            // Migration douce : lit la nouvelle clé, sinon fallback legacy
            const raw = localStorage.getItem(SESSION_KEY)
                || localStorage.getItem(SESSION_KEY_LEGACY);
            if (!raw) return null;
            const session: CampusSession = JSON.parse(raw);

            if (!session.expires_at || !session.profile_id || !session.org_id) {
                this.clear();
                return null;
            }
            if (new Date(session.expires_at).getTime() < Date.now()) {
                this.clear();
                return null;
            }
            // Si lu depuis la clé legacy, migrer vers la nouvelle clé
            if (!localStorage.getItem(SESSION_KEY) && localStorage.getItem(SESSION_KEY_LEGACY)) {
                localStorage.setItem(SESSION_KEY, raw);
                localStorage.removeItem(SESSION_KEY_LEGACY);
            }
            return session;
        } catch {
            this.clear();
            return null;
        }
    },

    /** Sauvegarder une session. */
    set(session: CampusSession): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    },

    /** Mettre à jour des champs partiels (photo_url, sky_points, etc.). */
    patch(updates: Partial<CampusSession>): void {
        const current = this.get();
        if (!current) return;
        this.set({ ...current, ...updates });
    },

    /** Retourner le session_token ou null. */
    getToken(): string | null {
        return this.get()?.session_token ?? null;
    },

    /** Vérifier si la session est expirée. */
    isExpired(): boolean {
        const session = this.get();
        if (!session) return true;
        return new Date(session.expires_at).getTime() < Date.now();
    },

    /** Supprimer la session locale uniquement. */
    clear(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(SESSION_KEY);
    },

    /**
     * Déconnexion complète :
     * 1. Invalide le session_token côté serveur
     * 2. Supprime la session locale
     */
    async logout(): Promise<void> {
        const token = this.getToken();
        if (token) {
            try {
                await supabase.rpc('invalidate_session', { p_token: token });
            } catch {
                // Réseau off ou token déjà expiré — on nettoie quand même
            }
        }
        this.clear();
    },
};

// ── buildSessionFromRpc ────────────────────────────────────
// Construit une CampusSession depuis la réponse de verify_pin_and_create_session

export function buildSessionFromRpc(
    rpcResult: {
        session_token: string;
        profile_id:    string;
        role:          string;
        org_id:        string;
        expires_at:    string;
    },
    profileData: {
        first_name:      string;
        last_name:       string;
        classroom_id?:   string;
        photo_url?:      string | null;
        sky_points?:     number;
        approval_status?: 'pending' | 'approved' | 'rejected' | 'info_needed';
    }
): CampusSession {
    return {
        session_token:   rpcResult.session_token,
        profile_id:      rpcResult.profile_id,
        role:            rpcResult.role as CampusSession['role'],
        org_id:          rpcResult.org_id,
        expires_at:      rpcResult.expires_at,
        first_name:      profileData.first_name,
        last_name:       profileData.last_name,
        classroom_id:    profileData.classroom_id,
        photo_url:       profileData.photo_url ?? null,
        sky_points:      profileData.sky_points ?? 0,
        approval_status: profileData.approval_status,
        logged_in_at:    new Date().toISOString(),
    };
}

