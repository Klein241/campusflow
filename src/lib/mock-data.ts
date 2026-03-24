// ============================================================
// DONNÉES MOCK — TEST LOCAL SANS SUPABASE
// Modifier librement pour simuler votre vrai centre.
// Ce fichier est ignoré en production (USE_MOCK_DATA=false).
// ============================================================

import type { Filiere, Promotion, Enrollment, StudentProfile, Note, Paiement } from "@/lib/filieres/types"

// ── FILIÈRES (13 max — adapter aux vraies filières du centre) ─
export const MOCK_FILIERES: Filiere[] = [
  { id: "f01", code: "INFO",    nom: "Informatique de Gestion",     duree_mois: 24, frais_scolarite: 450000,  couleur: "#4F46E5", icone: "monitor",      is_active: true, created_at: "", updated_at: "" },
  { id: "f02", code: "COMPTA",  nom: "Comptabilité & Finance",      duree_mois: 24, frais_scolarite: 400000,  couleur: "#0891B2", icone: "calculator",   is_active: true, created_at: "", updated_at: "" },
  { id: "f03", code: "GEST",    nom: "Gestion des Entreprises",     duree_mois: 24, frais_scolarite: 380000,  couleur: "#059669", icone: "briefcase",    is_active: true, created_at: "", updated_at: "" },
  { id: "f04", code: "MARKET",  nom: "Marketing & Communication",   duree_mois: 24, frais_scolarite: 380000,  couleur: "#D97706", icone: "megaphone",    is_active: true, created_at: "", updated_at: "" },
  { id: "f05", code: "SECR",    nom: "Secrétariat & Bureautique",   duree_mois: 18, frais_scolarite: 320000,  couleur: "#DC2626", icone: "file-text",    is_active: true, created_at: "", updated_at: "" },
  { id: "f06", code: "LOG",     nom: "Logistique & Transport",      duree_mois: 24, frais_scolarite: 400000,  couleur: "#7C3AED", icone: "truck",        is_active: true, created_at: "", updated_at: "" },
  { id: "f07", code: "BANQ",    nom: "Banque & Assurance",          duree_mois: 24, frais_scolarite: 450000,  couleur: "#DB2777", icone: "landmark",     is_active: true, created_at: "", updated_at: "" },
  { id: "f08", code: "ELEC",    nom: "Électronique & Électricité",  duree_mois: 24, frais_scolarite: 420000,  couleur: "#0D9488", icone: "zap",          is_active: true, created_at: "", updated_at: "" },
  { id: "f09", code: "AGRI",    nom: "Agriculture & Agronomie",     duree_mois: 24, frais_scolarite: 350000,  couleur: "#65A30D", icone: "leaf",         is_active: true, created_at: "", updated_at: "" },
  { id: "f10", code: "SANTE",   nom: "Santé Communautaire",         duree_mois: 30, frais_scolarite: 480000,  couleur: "#EA580C", icone: "heart-pulse",  is_active: true, created_at: "", updated_at: "" },
  { id: "f11", code: "DROIT",   nom: "Droit & Sciences Juridiques", duree_mois: 24, frais_scolarite: 400000,  couleur: "#6366F1", icone: "scale",        is_active: true, created_at: "", updated_at: "" },
  { id: "f12", code: "TOURISME",nom: "Tourisme & Hôtellerie",       duree_mois: 18, frais_scolarite: 360000,  couleur: "#E11D48", icone: "globe",        is_active: true, created_at: "", updated_at: "" },
  { id: "f13", code: "MEDIA",   nom: "Journalisme & Médias",        duree_mois: 24, frais_scolarite: 380000,  couleur: "#0284C7", icone: "tv",           is_active: true, created_at: "", updated_at: "" },
]

// ── PROMOTIONS ────────────────────────────────────────────────
export const MOCK_PROMOTIONS: Promotion[] = [
  { id: "p01", filiere_id: "f01", nom: "Promo INFO 2024-2026", annee_debut: 2024, annee_fin: 2026, effectif_max: 40, is_active: true, tenant_id: "mock", created_at: "" },
  { id: "p02", filiere_id: "f02", nom: "Promo COMPTA 2024-2026", annee_debut: 2024, annee_fin: 2026, effectif_max: 35, is_active: true, tenant_id: "mock", created_at: "" },
  { id: "p03", filiere_id: "f03", nom: "Promo GEST 2024-2026",  annee_debut: 2024, annee_fin: 2026, effectif_max: 38, is_active: true, tenant_id: "mock", created_at: "" },
]

// ── ÉTUDIANT CONNECTÉ (mock) ──────────────────────────────────
export const MOCK_CURRENT_STUDENT: StudentProfile = {
  id:               "student-mock-001",
  full_name:        "Jean-Paul Nkomo",
  avatar_url:       undefined,
  phone:            "+237 677 000 000",
  filiere_id:       "f01",
  numero_matricule: "INFO-2024-001",
  role:             "student",
  annee_entree:     2024,
  statut_etudiant:  "actif",
  genre:            "M",
  ville:            "Yaoundé",
  filiere:          undefined,
}

// ── INSCRIPTION MOCK ──────────────────────────────────────────
export const MOCK_ENROLLMENT: Enrollment = {
  id:               "enroll-mock-001",
  student_id:       "student-mock-001",
  filiere_id:       "f01",
  promotion_id:     "p01",
  date_inscription: "2024-09-01T08:00:00Z",
  statut:           "confirmee",
  montant_paye:     225000,
  tenant_id:        "mock",
  created_at:       "2024-09-01T08:00:00Z",
  updated_at:       "2024-09-01T08:00:00Z",
}

// ── NOTES MOCK ────────────────────────────────────────────────
export const MOCK_NOTES: Note[] = [
  { id: "n1", student_id: "student-mock-001", matiere_id: "m1", type_evaluation: "examen", note: 15.5, coefficient: 2, periode: "S1-2024", tenant_id: "mock", created_at: "2024-12-10T10:00:00Z", updated_at: "" },
  { id: "n2", student_id: "student-mock-001", matiere_id: "m2", type_evaluation: "devoir",  note: 12,   coefficient: 1, periode: "S1-2024", tenant_id: "mock", created_at: "2024-11-20T10:00:00Z", updated_at: "" },
  { id: "n3", student_id: "student-mock-001", matiere_id: "m3", type_evaluation: "tp",      note: 17,   coefficient: 1, periode: "S1-2024", tenant_id: "mock", created_at: "2024-11-15T10:00:00Z", updated_at: "" },
  { id: "n4", student_id: "student-mock-001", matiere_id: "m4", type_evaluation: "examen",  note: 9.5,  coefficient: 2, periode: "S1-2024", tenant_id: "mock", created_at: "2024-12-05T10:00:00Z", updated_at: "" },
  { id: "n5", student_id: "student-mock-001", matiere_id: "m5", type_evaluation: "devoir",  note: 14,   coefficient: 1, periode: "S1-2024", tenant_id: "mock", created_at: "2024-11-01T10:00:00Z", updated_at: "" },
]

// ── PAIEMENTS MOCK ────────────────────────────────────────────
export const MOCK_PAIEMENTS: Paiement[] = [
  { id: "pay1", student_id: "student-mock-001", montant: 225000, devise: "XAF", type_paiement: "scolarite", mode_paiement: "mobile_money", statut: "confirme", periode: "Tranche 1 - 2024", tenant_id: "mock", created_at: "2024-09-01T08:00:00Z" },
  { id: "pay2", student_id: "student-mock-001", montant: 225000, devise: "XAF", type_paiement: "scolarite", mode_paiement: "especes",      statut: "en_attente", periode: "Tranche 2 - 2025", tenant_id: "mock", created_at: "2025-01-15T08:00:00Z" },
]

// ── HELPER : chercher une filière par id ──────────────────────
export function getMockFiliereById(id: string): Filiere | undefined {
  return MOCK_FILIERES.find(f => f.id === id)
}

export function getMockFiliereByCode(code: string): Filiere | undefined {
  return MOCK_FILIERES.find(f => f.code === code)
}