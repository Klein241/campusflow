// ============================================================
// COMPOSANT — SELECTEUR DE FILIERE (dropdown ou grille)
// ============================================================
import { useState } from 'react'
import { ChevronDown, GraduationCap } from 'lucide-react'
import { useFilieres } from '@/hooks/filieres/use-filieres'
import type { Filiere } from '@/lib/filieres/types'

interface FiliereSelectorProps {
  value?: string
  onChange: (filiereId: string, filiere: Filiere) => void
  placeholder?: string
  className?: string
}

export default function FiliereSelector({
  value,
  onChange,
  placeholder = 'Sélectionner une filière',
  className = ''
}: FiliereSelectorProps) {
  const { filieres, loading } = useFilieres()
  const [open, setOpen] = useState(false)

  const selected = filieres.find(f => f.id === value)

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm hover:border-blue-400 transition-colors"
      >
        <span className="flex items-center gap-2 truncate">
          {selected ? (
            <>
              <span
                className="w-5 h-5 rounded-md text-white text-xs font-bold flex items-center justify-center"
                style={{ backgroundColor: selected.couleur }}
              >
                {selected.code.slice(0, 2)}
              </span>
              <span className="truncate">{selected.nom}</span>
            </>
          ) : (
            <>
              <GraduationCap size={16} className="text-gray-400" />
              <span className="text-gray-400">{placeholder}</span>
            </>
          )}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-4 text-xs text-gray-400 text-center">Chargement...</div>
          ) : filieres.length === 0 ? (
            <div className="px-3 py-4 text-xs text-gray-400 text-center">Aucune filière configurée</div>
          ) : filieres.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => { onChange(f.id, f); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left ${f.id === value ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
            >
              <span
                className="w-6 h-6 rounded-lg text-white text-xs font-bold flex items-center justify-center shrink-0"
                style={{ backgroundColor: f.couleur }}
              >
                {f.code.slice(0, 2)}
              </span>
              <span className="truncate font-medium text-gray-800 dark:text-gray-200">{f.nom}</span>
              <span className="ml-auto text-xs text-gray-400 shrink-0">{f.duree_mois}m</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}