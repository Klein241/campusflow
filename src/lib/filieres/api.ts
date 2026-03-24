// ============================================================
// API SUPABASE — FILIERES & MATIERES
// ============================================================
import { supabase } from '@/lib/supabase'
import type { Filiere, Matiere, Promotion } from './types'

// ── FILIÈRES ─────────────────────────────────────────────────
export async function getFilieres(activeOnly = true): Promise<Filiere[]> {
  let q = supabase.from('filieres').select('*').order('nom')
  if (activeOnly) q = q.eq('is_active', true)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function getFiliereById(id: string): Promise<Filiere | null> {
  const { data, error } = await supabase
    .from('filieres')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function createFiliere(filiere: Partial<Filiere>): Promise<Filiere> {
  const { data, error } = await supabase
    .from('filieres')
    .insert(filiere)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateFiliere(id: string, updates: Partial<Filiere>): Promise<void> {
  const { error } = await supabase.from('filieres').update(updates).eq('id', id)
  if (error) throw error
}

export async function toggleFiliereActive(id: string, is_active: boolean): Promise<void> {
  await updateFiliere(id, { is_active })
}

// ── MATIÈRES ─────────────────────────────────────────────────
export async function getMatieresByFiliere(filiereId: string): Promise<Matiere[]> {
  const { data, error } = await supabase
    .from('matieres')
    .select('*, teacher:teacher_id(id, full_name, avatar_url)')
    .eq('filiere_id', filiereId)
    .eq('is_active', true)
    .order('semestre')
    .order('nom')
  if (error) throw error
  return data ?? []
}

export async function createMatiere(matiere: Partial<Matiere>): Promise<Matiere> {
  const { data, error } = await supabase
    .from('matieres')
    .insert(matiere)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── PROMOTIONS ────────────────────────────────────────────────
export async function getPromotionsByFiliere(filiereId: string): Promise<Promotion[]> {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('filiere_id', filiereId)
    .order('annee_debut', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createPromotion(p: Partial<Promotion>): Promise<Promotion> {
  const { data, error } = await supabase
    .from('promotions')
    .insert(p)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── TIMETABLE ────────────────────────────────────────────────
export async function getTimetable(filiereId: string, promotionId?: string) {
  let q = supabase
    .from('timetable')
    .select('*, matiere:matiere_id(id, nom, code, couleur:filieres(couleur)), teacher:teacher_id(id, full_name)')
    .eq('filiere_id', filiereId)
    .order('jour_semaine')
    .order('heure_debut')
  if (promotionId) q = q.eq('promotion_id', promotionId)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}