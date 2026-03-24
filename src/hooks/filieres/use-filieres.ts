// ============================================================
// HOOK — FILIERES
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import { getFilieres, getFiliereById } from '@/lib/filieres/api'
import type { Filiere } from '@/lib/filieres/types'

export function useFilieres() {
  const [filieres, setFilieres] = useState<Filiere[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getFilieres()
      setFilieres(data)
    } catch (e: any) {
      setError(e.message ?? 'Erreur chargement filières')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { filieres, loading, error, reload: load }
}

export function useFiliere(id?: string) {
  const [filiere, setFiliere] = useState<Filiere | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getFiliereById(id)
      .then(setFiliere)
      .finally(() => setLoading(false))
  }, [id])

  return { filiere, loading }
}