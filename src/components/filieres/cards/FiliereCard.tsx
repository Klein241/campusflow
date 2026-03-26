// ============================================================
// COMPOSANT — FILIERE CARD
// Affiche une filière sous forme de carte cliquable
// ============================================================
import { Users, BookOpen, Clock } from 'lucide-react'
import type { Filiere } from '@/lib/filieres/types'

interface FiliereCardProps {
  filiere: Filiere
  studentsCount?: number
  onClick?: (filiere: Filiere) => void
  selected?: boolean
}

export default function FiliereCard({
  filiere,
  studentsCount = 0,
  onClick,
  selected = false
}: FiliereCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(filiere)}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(filiere)}
      className={`
        relative rounded-2xl p-5 cursor-pointer transition-all duration-200
        border-2 hover:shadow-lg hover:-translate-y-0.5
        ${selected
          ? 'border-current shadow-md ring-2 ring-offset-2'
          : 'border-transparent bg-white dark:bg-gray-900'}
      `}
      style={{
        background: selected
          ? `linear-gradient(135deg, ${filiere.couleur}18, ${filiere.couleur}08)`
          : undefined,
        borderColor: selected ? filiere.couleur : undefined,
        // Use CSS custom property for Tailwind's ring color
        '--tw-ring-color': selected ? filiere.couleur : undefined,
      } as React.CSSProperties}
    >
      {/* Barre de couleur en haut */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
        style={{ backgroundColor: filiere.couleur }}
      />

      <div className="flex items-start gap-3 mt-1">
        {/* Icône filière */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0"
          style={{ backgroundColor: filiere.couleur }}
        >
          {filiere.code.slice(0, 2)}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight truncate">
            {filiere.nom}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{filiere.code}</p>
        </div>
      </div>

      {filiere.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 line-clamp-2">
          {filiere.description}
        </p>
      )}

      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <Users size={12} />
          {studentsCount} étudiants
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {filiere.duree_mois} mois
        </span>
        <span className="flex items-center gap-1">
          <BookOpen size={12} />
          {(filiere.frais_scolarite / 1000).toFixed(0)}k XAF
        </span>
      </div>
    </div>
  )
}