// ============================================================
// PAGE ADMIN — GESTION DES FILIÈRES
// Route : /admin/filieres
// ============================================================
"use client"
import { useState } from 'react'
import { Plus, Pencil, ToggleLeft, ToggleRight, GraduationCap, Users, BookOpen } from 'lucide-react'
import { useFilieres } from '@/hooks/filieres/use-filieres'
import { createFiliere, toggleFiliereActive } from '@/lib/filieres/api'
import type { Filiere } from '@/lib/filieres/types'
import { toast } from 'sonner'

// Couleurs prédéfinies pour les filières
const PRESET_COLORS = [
  '#4F46E5','#0891B2','#059669','#D97706','#DC2626',
  '#7C3AED','#DB2777','#0D9488','#65A30D','#EA580C',
  '#6366F1','#E11D48','#0284C7'
]

export default function AdminFilieresPage() {
  const { filieres, loading, reload } = useFilieres()
  const [showForm, setShowForm]     = useState(false)
  const [editTarget, setEditTarget] = useState<Filiere | null>(null)

  // Formulaire local
  const emptyForm = { code: '', nom: '', description: '', duree_mois: 24, frais_scolarite: 0, couleur: '#4F46E5' }
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.code.trim() || !form.nom.trim()) {
      toast.error('Code et nom de filière requis')
      return
    }
    setSaving(true)
    try {
      if (editTarget) {
        const { updateFiliere } = await import('@/lib/filieres/api')
        await updateFiliere(editTarget.id, form)
        toast.success('Filière mise à jour')
      } else {
        await createFiliere(form)
        toast.success('Filière créée')
      }
      setShowForm(false)
      setEditTarget(null)
      setForm(emptyForm)
      reload()
    } catch (e: any) {
      toast.error(e.message ?? 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(f: Filiere) {
    try {
      await toggleFiliereActive(f.id, !f.is_active)
      toast.success(f.is_active ? 'Filière désactivée' : 'Filière activée')
      reload()
    } catch {
      toast.error('Erreur lors du changement de statut')
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <GraduationCap size={24} />
            Gestion des Filières
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {filieres.length}/13 filières configurées
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditTarget(null); setForm(emptyForm) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Nouvelle filière
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 mb-6 shadow-sm">
          <h2 className="font-semibold mb-4">{editTarget ? 'Modifier la filière' : 'Nouvelle filière'}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Code *</label>
              <input
                value={form.code}
                onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent"
                placeholder="ex: INFO"
                maxLength={10}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Nom *</label>
              <input
                value={form.nom}
                onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent"
                placeholder="ex: Informatique de Gestion"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent resize-none"
                rows={2}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Durée (mois)</label>
              <input
                type="number"
                value={form.duree_mois}
                onChange={e => setForm(p => ({ ...p, duree_mois: +e.target.value }))}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent"
                min={1} max={60}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Frais scolarité (XAF)</label>
              <input
                type="number"
                value={form.frais_scolarite}
                onChange={e => setForm(p => ({ ...p, frais_scolarite: +e.target.value }))}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent"
                min={0} step={1000}
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-2">Couleur</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, couleur: c }))}
                    className={`w-7 h-7 rounded-full transition-transform ${form.couleur === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button
              onClick={() => { setShowForm(false); setEditTarget(null) }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* Liste des filières */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement des filières...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filieres.map((f, i) => (
            <div
              key={f.id}
              className={`relative bg-white dark:bg-gray-900 border rounded-2xl p-4 transition-all ${f.is_active ? 'border-gray-200 dark:border-gray-700' : 'border-dashed border-gray-200 opacity-60'}`}
            >
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: f.couleur }} />
              <div className="flex items-start gap-3 mt-1">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: f.couleur }}
                >
                  {f.code.slice(0, 2)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{f.nom}</h3>
                      <p className="text-xs text-gray-500">{f.code} · {f.duree_mois} mois</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${f.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {f.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {(f.frais_scolarite / 1000).toFixed(0)}k XAF / an
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3 justify-end">
                <button
                  onClick={() => { setEditTarget(f); setForm({ code: f.code, nom: f.nom, description: f.description ?? '', duree_mois: f.duree_mois, frais_scolarite: f.frais_scolarite, couleur: f.couleur }); setShowForm(true) }}
                  className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Modifier"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleToggle(f)}
                  className={`p-1.5 rounded-lg transition-colors ${f.is_active ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                  title={f.is_active ? 'Désactiver' : 'Activer'}
                >
                  {f.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                </button>
              </div>
            </div>
          ))}

          {/* Slots vides jusqu'à 13 */}
          {Array.from({ length: Math.max(0, 13 - filieres.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              onClick={() => { setShowForm(true); setEditTarget(null); setForm(emptyForm) }}
              className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all min-h-[100px]"
            >
              <Plus size={20} className="text-gray-300" />
              <span className="text-xs text-gray-400">Filière {filieres.length + i + 1}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}