// ============================================================
// BOTTOM NAVIGATION — CENTRE DE FORMATION
// Navigation adaptative selon le rôle de l'utilisateur.
// 5 rôles : student, teacher, secretary, director, superadmin
// ============================================================
"use client"
import {
  LayoutDashboard,
  GraduationCap,
  MessageSquare,
  BookOpen,
  ShoppingBag,
  User,
  CalendarDays,
  ClipboardList,
  Users,
  CreditCard,
  Settings,
  BarChart3,
  FileText,
} from 'lucide-react'
import type { UserRole } from '@/lib/roles'

export type AppTab =
  | 'dashboard'
  | 'curriculum'
  | 'forum'
  | 'resources'
  | 'shop'
  | 'grades'
  | 'timetable'
  | 'profile'
  | 'students'
  | 'payments'
  | 'admin'
  | 'reports'
  // Legacy aliases
  | 'home'
  | 'community'
  | 'marketplace'
  | 'program'
  | 'courses'
  | 'journal'
  | 'library'

interface NavItem {
  id: AppTab
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  roles: UserRole[]
}

// Tous les onglets possibles selon les rôles
export const NAV_ITEMS: NavItem[] = [
  // ── Communs ──
  { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard, roles: ['student', 'teacher', 'secretary', 'director', 'superadmin'] },
  { id: 'curriculum', label: 'Cursus', icon: GraduationCap, roles: ['student', 'teacher'] },
  { id: 'grades', label: 'Notes', icon: ClipboardList, roles: ['student', 'teacher'] },
  { id: 'timetable', label: 'Planning', icon: CalendarDays, roles: ['student', 'teacher', 'secretary'] },
  { id: 'forum', label: 'Forum', icon: MessageSquare, roles: ['student', 'teacher', 'secretary', 'director', 'superadmin'] },
  { id: 'resources', label: 'Ressources', icon: BookOpen, roles: ['student', 'teacher'] },
  { id: 'shop', label: 'Boutique', icon: ShoppingBag, roles: ['student', 'teacher'] },
  { id: 'profile', label: 'Profil', icon: User, roles: ['student', 'teacher', 'secretary', 'director', 'superadmin'] },

  // ── Secrétariat ──
  { id: 'students', label: 'Étudiants', icon: Users, roles: ['secretary', 'director', 'superadmin'] },
  { id: 'payments', label: 'Paiements', icon: CreditCard, roles: ['secretary', 'director', 'superadmin'] },

  // ── Direction / Admin ──
  { id: 'reports', label: 'Rapports', icon: BarChart3, roles: ['director', 'superadmin'] },
  { id: 'admin', label: 'Admin', icon: Settings, roles: ['director', 'superadmin'] },
]

// Onglets du bas par rôle (max 5 pour mobile)
export const BOTTOM_TABS_BY_ROLE: Record<UserRole, AppTab[]> = {
  student: ['dashboard', 'curriculum', 'grades', 'forum', 'profile'],
  teacher: ['dashboard', 'grades', 'timetable', 'forum', 'profile'],
  secretary: ['dashboard', 'students', 'payments', 'timetable', 'profile'],
  director: ['dashboard', 'students', 'reports', 'admin', 'profile'],
  superadmin: ['dashboard', 'students', 'reports', 'admin', 'profile'],
}

interface BottomNavProps {
  activeTab: AppTab | string
  onTabChange: (tab: AppTab) => void
  userRole?: UserRole
  primaryColor?: string
}

export default function BottomNav({
  activeTab,
  onTabChange,
  userRole = 'student',
  primaryColor,
}: BottomNavProps) {
  const color = primaryColor || {
    student: '#4F46E5',
    teacher: '#0891B2',
    secretary: '#D97706',
    director: '#059669',
    superadmin: '#DC2626',
  }[userRole] || '#4F46E5'

  const bottomTabs = BOTTOM_TABS_BY_ROLE[userRole] || BOTTOM_TABS_BY_ROLE.student
  const visibleTabs = bottomTabs
    .map(id => NAV_ITEMS.find(n => n.id === id)!)
    .filter(Boolean)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {visibleTabs.map(item => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[52px] ${isActive
                  ? 'scale-105'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              style={isActive ? { color } : {}}
            >
              <div className={`relative ${isActive ? 'drop-shadow-sm' : ''}`}>
                <Icon size={22} className="transition-all" />
                {isActive && (
                  <span
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                )}
              </div>
              <span className={`text-[10px] font-medium transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}