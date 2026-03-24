// ============================================================
// PAGE ADMIN — INSCRIPTIONS
// Route : /admin/enrollments
// ============================================================
"use client"
import { useState, useEffect } from 'react'
import { Users, CheckCircle, Clock, XCircle, Search, Filter } from 'lucide-react'
import { getEnrollmentsByFiliere, updateEnrollmentStatut } from '@/lib/enrollments/api'
import { useFilieres } from '@/hooks/filieres/use-filieres'
import type { Enrollment } from '@/lib/filieres/types'
import { toast } from 'sonner'

const STATUT_CONFIG = {
  en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  confirmee:  { label: 'Confirmée',  color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  annulee:    { label: 'Annulée',    color: 'bg-red-100 text-red-700',      icon: XCircle },
  terminee:   { label: 'Terminée',   color: 'bg-gray-100 text-gray-600',    icon: CheckCircle },
}

export default function AdminEnrollmentsPage() {
  const { filieres } = useFilieres()
  const [selectedFiliere, setSelectedFiliere] = useState<string>('')
  const [enrollments, setEnrollments]         = useState<Enrollment[]>([])
  const [loading, setLoading]                 = useState(false)
  const [search, setSearch]                   = useState('')
  const [filterStatut, setFilterStatut]       = useState<string>('all')

  useEffect(() => {
    if (!selectedFiliere) return
    setLoading(true)
    getEnrollmentsByFiliere(selectedFiliere)
      .then(setEnrollments)
      .finally(() => setLoading(false))
  }, [selectedFiliere])

  async function handleStatutChange(enrollment: Enrollment, statut: Enrollment['statut']) {
    try {
      await updateEnrollmentStatut(enrollment.id, statut)
      setEnrollments(prev => prev.map(e => e.id === enrollment.id ? { ...e, statut } : e))
      toast.success('Statut mis à jour')
    } catch {
      toast.error('Erreur mise à jour')
    }
  }

  const filtered = enrollments.filter(e => {
    const name = (e.student as any)?.full_name?.toLowerCase() ?? ''
    const mat  = (e.student as any)?.numero_matricule?.toLowerCase() ?? ''
    const matchSearch = !search || name.includes(search.toLowerCase()) || mat.includes(search.toLowerCase())
    const matchStatut = filterStatut === 'all' || e.statut === filterStatut
    return matchSearch && matchStatut
  })

  const stats = {
    total:      enrollments.length,
    confirmees: enrollments.filter(e => e.statut === 'confirmee').length,
    attente:    enrollments.filter(e => e.statut === 'en_attente').length,
    annulees:   enrollments.filter(e => e.statut === 'annulee').length,
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Users size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inscriptions</h1>
      </div>

      {/* Sélecteur filière */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filieres.map(f => (
          <button
            key={f.id}
            onClick={() => setSelectedFiliere(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedFiliere === f.id ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            style={selectedFiliere === f.id ? { backgroundColor: f.couleur } : {}}
          >
            {f.code}
          </button>
        ))}
      </div>

      {!selectedFiliere ? (
        <div className="text-center py-16 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p>Sélectionnez une filière pour voir les inscriptions</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Total', value: stats.total, color: 'text-gray-900' },
              { label: 'Confirmées', value: stats.confirmees, color: 'text-green-600' },
              { label: 'En attente', value: stats.attente, color: 'text-yellow-600' },
              { label: 'Annulées', value: stats.annulees, color: 'text-red-500' },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filtres */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher par nom ou matricule..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent"
              />
            </div>
            <select
              value={filterStatut}
              onChange={e => setFilterStatut(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900"
            >
              <option value="all">Tous les statuts</option>
              <option value="en_attente">En attente</option>
              <option value="confirmee">Confirmées</option>
              <option value="annulee">Annulées</option>
              <option value="terminee">Terminées</option>
            </select>
          </div>

          {/* Tableau */}
          {loading ? (
            <div className="text-center py-10 text-gray-400">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-400">Aucune inscription trouvée</div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Étudiant</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Promotion</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Inscription</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, i) => {
                    const s = e.student as any
                    const cfg = STATUT_CONFIG[e.statut]
                    return (
                      <tr key={e.id} className={`border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{s?.full_name ?? '—'}</div>
                          <div className="text-xs text-gray-400">{s?.numero_matricule ?? s?.phone ?? '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                          {(e.promotion as any)?.nom ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(e.date_inscription).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {e.statut === 'en_attente' && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleStatutChange(e, 'confirmee')}
                                className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                              >
                                Confirmer
                              </button>
                              <button
                                onClick={() => handleStatutChange(e, 'annulee')}
                                className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
                              >
                                Annuler
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}