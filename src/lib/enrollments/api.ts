// ============================================================
// API SUPABASE — INSCRIPTIONS, NOTES, PRESENCES, PAIEMENTS
// ============================================================
import { supabase } from '@/lib/supabase'
import type { Enrollment, Note, Presence, Paiement, StudentDashboard } from '@/lib/filieres/types'

// ── INSCRIPTIONS ─────────────────────────────────────────────
export async function enrollStudent(
  studentId: string,
  filiereId: string,
  promotionId?: string
): Promise<Enrollment> {
  const { data, error } = await supabase
    .from('enrollments')
    .insert({ student_id: studentId, filiere_id: filiereId, promotion_id: promotionId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getEnrollmentsByFiliere(filiereId: string): Promise<Enrollment[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select(`
      *,
      student:student_id(id, full_name, avatar_url, numero_matricule, phone),
      promotion:promotion_id(id, nom)
    `)
    .eq('filiere_id', filiereId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getMyEnrollment(studentId: string): Promise<Enrollment | null> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('*, filiere:filiere_id(*), promotion:promotion_id(*)')
    .eq('student_id', studentId)
    .eq('statut', 'confirmee')
    .maybeSingle()
  if (error) return null
  return data
}

export async function updateEnrollmentStatut(
  id: string,
  statut: Enrollment['statut']
): Promise<void> {
  const { error } = await supabase.from('enrollments').update({ statut }).eq('id', id)
  if (error) throw error
}

// ── NOTES ────────────────────────────────────────────────────
export async function getNotesByStudent(
  studentId: string,
  periode?: string
): Promise<Note[]> {
  let q = supabase
    .from('notes')
    .select('*, matiere:matiere_id(id, nom, code, credits, filiere_id)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  if (periode) q = q.eq('periode', periode)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function insertNote(note: Partial<Note>): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert(note)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getMoyenneEtudiant(
  studentId: string,
  filiereId: string,
  periode?: string
): Promise<number> {
  const { data, error } = await supabase
    .rpc('get_moyenne_etudiant', {
      p_student_id: studentId,
      p_filiere_id: filiereId,
      p_periode: periode ?? null
    })
  if (error) return 0
  return data ?? 0
}

// ── PRÉSENCES ────────────────────────────────────────────────
export async function getPresencesByStudent(
  studentId: string,
  filiereId?: string
): Promise<Presence[]> {
  let q = supabase
    .from('presences')
    .select('*')
    .eq('student_id', studentId)
    .order('date_seance', { ascending: false })
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function getTauxPresence(
  studentId: string,
  filiereId?: string
): Promise<number> {
  const { data, error } = await supabase
    .rpc('get_taux_presence', {
      p_student_id: studentId,
      p_filiere_id: filiereId ?? null
    })
  if (error) return 0
  return data ?? 0
}

export async function marquerPresence(
  studentId: string,
  timetableId: string,
  dateSeance: string,
  statut: Presence['statut']
): Promise<void> {
  const { error } = await supabase
    .from('presences')
    .upsert({
      student_id: studentId,
      timetable_id: timetableId,
      date_seance: dateSeance,
      statut
    }, { onConflict: 'student_id,timetable_id,date_seance' })
  if (error) throw error
}

// ── PAIEMENTS ────────────────────────────────────────────────
export async function getPaiementsByStudent(studentId: string): Promise<Paiement[]> {
  const { data, error } = await supabase
    .from('paiements')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function enregistrerPaiement(p: Partial<Paiement>): Promise<Paiement> {
  const { data, error } = await supabase
    .from('paiements')
    .insert(p)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getSoldeRestant(
  studentId: string,
  enrollmentId: string
): Promise<number> {
  // Récupère la scolarité totale de la filière et ce qui a été payé
  const { data: enr } = await supabase
    .from('enrollments')
    .select('filiere:filiere_id(frais_scolarite)')
    .eq('id', enrollmentId)
    .single()

  const { data: paie } = await supabase
    .from('paiements')
    .select('montant')
    .eq('student_id', studentId)
    .eq('enrollment_id', enrollmentId)
    .eq('statut', 'confirme')

  const total = (enr?.filiere as any)?.frais_scolarite ?? 0
  const paye  = (paie ?? []).reduce((acc: number, p: any) => acc + (p.montant ?? 0), 0)
  return Math.max(0, total - paye)
}

// ── DASHBOARD ÉTUDIANT ───────────────────────────────────────
export async function getStudentDashboard(studentId: string): Promise<StudentDashboard | null> {
  try {
    const enrollment = await getMyEnrollment(studentId)
    if (!enrollment) return null

    const [notes, paiements, moyenne, taux] = await Promise.all([
      getNotesByStudent(studentId),
      getPaiementsByStudent(studentId),
      getMoyenneEtudiant(studentId, enrollment.filiere_id),
      getTauxPresence(studentId, enrollment.filiere_id)
    ])

    const solde = await getSoldeRestant(studentId, enrollment.id)

    return {
      student: { id: studentId } as any,
      filiere: enrollment.filiere,
      enrollment,
      moyenne_generale: moyenne,
      taux_presence: taux,
      dernieres_notes: notes.slice(0, 5),
      paiements_en_attente: paiements.filter(p => p.statut === 'en_attente'),
      solde_restant: solde
    }
  } catch {
    return null
  }
}