// ============================================================
// RÔLES & PERMISSIONS — CENTRE DE FORMATION
// Définit les 5 niveaux d'accès et les menus par rôle.
// ============================================================

export type UserRole = 'student' | 'teacher' | 'secretary' | 'director' | 'superadmin'

// Labels lisibles
export const ROLE_LABELS: Record<UserRole, string> = {
    student: 'Étudiant',
    teacher: 'Professeur',
    secretary: 'Secrétaire',
    director: 'Directeur',
    superadmin: 'Super Admin',
}

// Couleurs par rôle
export const ROLE_COLORS: Record<UserRole, string> = {
    student: '#4F46E5',    // Indigo
    teacher: '#0891B2',    // Cyan
    secretary: '#D97706',  // Amber
    director: '#059669',   // Emerald
    superadmin: '#DC2626', // Red
}

// Badges par rôle
export const ROLE_BADGES: Record<UserRole, string> = {
    student: '🎓',
    teacher: '👨‍🏫',
    secretary: '📋',
    director: '🏛️',
    superadmin: '⚡',
}

// Permissions par rôle
export interface RolePermissions {
    canViewGrades: boolean
    canEditGrades: boolean
    canViewAttendance: boolean
    canEditAttendance: boolean
    canViewTimetable: boolean
    canEditTimetable: boolean
    canViewEnrollments: boolean
    canManageEnrollments: boolean
    canViewPayments: boolean
    canManagePayments: boolean
    canViewStudents: boolean
    canManageStudents: boolean
    canViewTeachers: boolean
    canManageTeachers: boolean
    canViewForum: boolean
    canPostForum: boolean
    canModerateForum: boolean
    canViewShop: boolean
    canManageShop: boolean
    canViewResources: boolean
    canManageResources: boolean
    canAccessAdmin: boolean
    canManageRoles: boolean
    canManageFilieres: boolean
    canViewReports: boolean
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
    student: {
        canViewGrades: true,
        canEditGrades: false,
        canViewAttendance: true,
        canEditAttendance: false,
        canViewTimetable: true,
        canEditTimetable: false,
        canViewEnrollments: true,
        canManageEnrollments: false,
        canViewPayments: true,
        canManagePayments: false,
        canViewStudents: false,
        canManageStudents: false,
        canViewTeachers: false,
        canManageTeachers: false,
        canViewForum: true,
        canPostForum: true,
        canModerateForum: false,
        canViewShop: true,
        canManageShop: false,
        canViewResources: true,
        canManageResources: false,
        canAccessAdmin: false,
        canManageRoles: false,
        canManageFilieres: false,
        canViewReports: false,
    },
    teacher: {
        canViewGrades: true,
        canEditGrades: true,         // Peut saisir les notes
        canViewAttendance: true,
        canEditAttendance: true,     // Peut faire l'appel
        canViewTimetable: true,
        canEditTimetable: false,
        canViewEnrollments: true,
        canManageEnrollments: false,
        canViewPayments: false,
        canManagePayments: false,
        canViewStudents: true,       // Voit ses étudiants
        canManageStudents: false,
        canViewTeachers: false,
        canManageTeachers: false,
        canViewForum: true,
        canPostForum: true,
        canModerateForum: true,      // Peut modérer
        canViewShop: true,
        canManageShop: false,
        canViewResources: true,
        canManageResources: true,    // Peut uploader des cours
        canAccessAdmin: false,
        canManageRoles: false,
        canManageFilieres: false,
        canViewReports: true,        // Stats de sa classe
    },
    secretary: {
        canViewGrades: true,
        canEditGrades: false,
        canViewAttendance: true,
        canEditAttendance: true,
        canViewTimetable: true,
        canEditTimetable: true,      // Gère les plannings
        canViewEnrollments: true,
        canManageEnrollments: true,  // Gère les inscriptions
        canViewPayments: true,
        canManagePayments: true,     // Gère les paiements
        canViewStudents: true,
        canManageStudents: true,     // CRUD étudiants
        canViewTeachers: true,
        canManageTeachers: false,
        canViewForum: true,
        canPostForum: true,
        canModerateForum: true,
        canViewShop: true,
        canManageShop: true,
        canViewResources: true,
        canManageResources: true,
        canAccessAdmin: true,        // Accès admin
        canManageRoles: false,
        canManageFilieres: false,
        canViewReports: true,
    },
    director: {
        canViewGrades: true,
        canEditGrades: true,
        canViewAttendance: true,
        canEditAttendance: true,
        canViewTimetable: true,
        canEditTimetable: true,
        canViewEnrollments: true,
        canManageEnrollments: true,
        canViewPayments: true,
        canManagePayments: true,
        canViewStudents: true,
        canManageStudents: true,
        canViewTeachers: true,
        canManageTeachers: true,     // Gère les profs
        canViewForum: true,
        canPostForum: true,
        canModerateForum: true,
        canViewShop: true,
        canManageShop: true,
        canViewResources: true,
        canManageResources: true,
        canAccessAdmin: true,
        canManageRoles: true,        // Peut changer les rôles
        canManageFilieres: true,     // Gère les filières
        canViewReports: true,
    },
    superadmin: {
        canViewGrades: true,
        canEditGrades: true,
        canViewAttendance: true,
        canEditAttendance: true,
        canViewTimetable: true,
        canEditTimetable: true,
        canViewEnrollments: true,
        canManageEnrollments: true,
        canViewPayments: true,
        canManagePayments: true,
        canViewStudents: true,
        canManageStudents: true,
        canViewTeachers: true,
        canManageTeachers: true,
        canViewForum: true,
        canPostForum: true,
        canModerateForum: true,
        canViewShop: true,
        canManageShop: true,
        canViewResources: true,
        canManageResources: true,
        canAccessAdmin: true,
        canManageRoles: true,
        canManageFilieres: true,
        canViewReports: true,
    },
}

// Helper : obtenir les permissions d'un rôle
export function getPermissions(role: UserRole): RolePermissions {
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.student
}

// Helper : vérifier si un rôle a un niveau admin (secrétaire+)
export function isStaff(role: UserRole): boolean {
    return ['secretary', 'director', 'superadmin'].includes(role)
}

// Helper : vérifier si un rôle est académique (prof+)
export function isAcademic(role: UserRole): boolean {
    return ['teacher', 'director', 'superadmin'].includes(role)
}

// Mapper les anciennes valeurs de rôle vers les nouvelles
export function normalizeRole(rawRole: string | null | undefined): UserRole {
    const map: Record<string, UserRole> = {
        student: 'student',
        teacher: 'teacher',
        secretary: 'secretary',
        staff: 'secretary',        // ancien 'staff' → secrétaire
        admin: 'director',         // ancien 'admin' → directeur
        director: 'director',
        superadmin: 'superadmin',
    }
    return map[rawRole || 'student'] || 'student'
}
