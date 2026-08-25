// ============================================================
// TYPES METIER — CAMPUSFLOW (multi-tenant)
// ============================================================
// NOTE: Les champs `tenant_id` sont optionnels — héritage de
// l'ancienne architecture mono-tenant. L'architecture active
// utilise `organization_id` pour la résolution du tenant.
// Ne pas supprimer tenant_id sans migration DB (shop_products
// utilise encore cette colonne sous ce nom).
// ============================================================

export interface EcheancePaiement {
  tranche: number
  nom: string
  montant: number
  date_limite?: string
}

export interface Filiere {
  id: string
  code: string
  nom: string
  description?: string
  duree_mois: number
  frais_scolarite: number
  frais_inscription?: number
  echeances?: EcheancePaiement[]
  couleur: string
  icone: string
  is_active: boolean
  organization_id?: string
  created_at: string
  updated_at: string
  // Relations chargées à la demande
  _count?: {
    etudiants: number
    matieres: number
    promotions: number
  }
}

export interface Promotion {
  id: string
  filiere_id: string
  nom: string
  annee_debut: number
  annee_fin: number
  effectif_max: number
  is_active: boolean
  tenant_id?: string         // optionnel — legacy mono-tenant
  organization_id?: string   // champ actif multi-tenant
  created_at: string
  filiere?: Filiere
}

export interface Enrollment {
  id: string
  student_id: string
  filiere_id: string
  promotion_id?: string
  date_inscription: string
  statut: 'en_attente' | 'confirmee' | 'annulee' | 'terminee'
  montant_paye: number
  notes_admin?: string
  tenant_id?: string         // optionnel — legacy mono-tenant
  organization_id?: string   // champ actif multi-tenant
  created_at: string
  updated_at: string
  // Relations
  filiere?: Filiere
  promotion?: Promotion
  student?: StudentProfile
}

export interface Matiere {
  id: string
  filiere_id: string
  code: string
  nom: string
  description?: string
  credits: number
  semestre: number
  type_matiere: 'cours' | 'td' | 'tp' | 'stage' | 'projet'
  teacher_id?: string
  is_active: boolean
  tenant_id?: string         // optionnel — legacy mono-tenant
  organization_id?: string   // champ actif multi-tenant
  created_at: string
  filiere?: Filiere
  teacher?: StudentProfile
}

export interface Note {
  id: string
  student_id: string
  matiere_id: string
  promotion_id?: string
  type_evaluation: 'devoir' | 'examen' | 'rattrapage' | 'tp' | 'projet'
  note: number
  coefficient: number
  periode: string
  commentaire?: string
  saisi_par?: string
  tenant_id?: string         // optionnel — legacy mono-tenant
  organization_id?: string   // champ actif multi-tenant
  created_at: string
  updated_at: string
  matiere?: Matiere
}

export interface Presence {
  id: string
  student_id: string
  timetable_id?: string
  matiere_id?: string
  date_seance: string
  statut: 'present' | 'absent' | 'retard' | 'justifie'
  justification?: string
  tenant_id?: string         // optionnel — legacy mono-tenant
  organization_id?: string   // champ actif multi-tenant
  created_at: string
}

export interface Paiement {
  id: string
  student_id: string
  enrollment_id?: string
  montant: number
  devise: string
  type_paiement: 'scolarite' | 'inscription' | 'materiel' | 'autre'
  mode_paiement: 'especes' | 'mobile_money' | 'virement' | 'cheque' | 'carte'
  reference?: string
  statut: 'en_attente' | 'confirme' | 'annule' | 'rembourse'
  periode?: string
  notes?: string
  tenant_id?: string         // optionnel — legacy mono-tenant
  organization_id?: string   // champ actif multi-tenant
  created_at: string
}

export interface TimetableSlot {
  id: string
  filiere_id: string
  promotion_id?: string
  matiere_id: string
  teacher_id?: string
  jour_semaine: number
  heure_debut: string
  heure_fin: string
  salle?: string
  est_recurrent: boolean
  date_specifique?: string
  type_seance: 'cours' | 'td' | 'tp' | 'examen' | 'rattrapage'
  tenant_id?: string         // optionnel — legacy mono-tenant
  organization_id?: string   // champ actif multi-tenant
  created_at: string
  matiere?: Matiere
  teacher?: StudentProfile
}

export interface StudentProfile {
  id: string
  full_name?: string
  avatar_url?: string
  phone?: string
  filiere_id?: string
  numero_matricule?: string
  role: 'student' | 'teacher' | 'admin' | 'staff'
  annee_entree?: number
  statut_etudiant?: 'actif' | 'suspendu' | 'diplome' | 'abandonne'
  date_naissance?: string
  genre?: 'M' | 'F' | 'autre'
  ville?: string
  filiere?: Filiere
}

export interface ForumThread {
  id: string
  filiere_id?: string
  matiere_id?: string
  auteur_id: string
  titre: string
  contenu: string
  type_thread: 'question' | 'annonce' | 'discussion' | 'aide'
  is_epingle: boolean
  is_resolu: boolean
  vues: number
  tenant_id?: string         // optionnel — legacy mono-tenant
  organization_id?: string   // champ actif multi-tenant
  created_at: string
  updated_at: string
  auteur?: StudentProfile
  filiere?: Filiere
  _replies_count?: number
}

export interface ForumReply {
  id: string
  thread_id: string
  auteur_id: string
  contenu: string
  is_solution: boolean
  tenant_id?: string         // optionnel — legacy mono-tenant
  organization_id?: string   // champ actif multi-tenant
  created_at: string
  auteur?: StudentProfile
}

// Résumé bulletin d'un étudiant
export interface StudentDashboard {
  student: StudentProfile
  filiere?: Filiere
  enrollment?: Enrollment
  moyenne_generale?: number
  taux_presence?: number
  dernieres_notes: Note[]
  paiements_en_attente: Paiement[]
  solde_restant: number
}