// ============================================================
// SUPABASE MOCK CLIENT — TEST LOCAL UNIQUEMENT
// Intercepte les appels Supabase et retourne les données mock.
// Remplacé automatiquement en production par le vrai client.
// ============================================================

import {
  MOCK_FILIERES, MOCK_PROMOTIONS, MOCK_CURRENT_STUDENT,
  MOCK_ENROLLMENT, MOCK_NOTES, MOCK_PAIEMENTS
} from "@/lib/mock-data"

const MOCK_USER = {
  id:    "student-mock-001",
  email: "etudiant@campusflow.test",
  role:  "authenticated",
}

// Table → données
const MOCK_TABLES: Record<string, unknown[]> = {
  filieres:   MOCK_FILIERES,
  promotions: MOCK_PROMOTIONS,
  profiles:   [MOCK_CURRENT_STUDENT],
  enrollments: [MOCK_ENROLLMENT],
  notes:       MOCK_NOTES,
  paiements:   MOCK_PAIEMENTS,
  matieres:    [
    { id: "m1", filiere_id: "f01", code: "INFO301", nom: "Algorithmique",       credits: 3, semestre: 1, type_matiere: "cours", is_active: true, tenant_id: "mock", created_at: "" },
    { id: "m2", filiere_id: "f01", code: "INFO302", nom: "Base de données",     credits: 3, semestre: 1, type_matiere: "cours", is_active: true, tenant_id: "mock", created_at: "" },
    { id: "m3", filiere_id: "f01", code: "INFO303", nom: "Développement Web",   credits: 3, semestre: 1, type_matiere: "tp",    is_active: true, tenant_id: "mock", created_at: "" },
    { id: "m4", filiere_id: "f01", code: "INFO304", nom: "Réseaux",             credits: 2, semestre: 1, type_matiere: "cours", is_active: true, tenant_id: "mock", created_at: "" },
    { id: "m5", filiere_id: "f01", code: "INFO305", nom: "Systèmes d'exploit.", credits: 2, semestre: 1, type_matiere: "td",    is_active: true, tenant_id: "mock", created_at: "" },
  ],
  timetable: [
    { id: "t1", filiere_id: "f01", matiere_id: "m1", jour_semaine: 1, heure_debut: "08:00:00", heure_fin: "10:00:00", salle: "A01", type_seance: "cours", est_recurrent: true, tenant_id: "mock", created_at: "" },
    { id: "t2", filiere_id: "f01", matiere_id: "m2", jour_semaine: 2, heure_debut: "10:00:00", heure_fin: "12:00:00", salle: "B03", type_seance: "cours", est_recurrent: true, tenant_id: "mock", created_at: "" },
    { id: "t3", filiere_id: "f01", matiere_id: "m3", jour_semaine: 3, heure_debut: "14:00:00", heure_fin: "17:00:00", salle: "Labo",type_seance: "tp",    est_recurrent: true, tenant_id: "mock", created_at: "" },
  ],
  shop_products: [
    { id: "sp1", titre: "Manuel Algorithmique T1", description: "Ouvrage de référence", prix: 8500,  devise: "XAF", categorie: "livres",      is_active: true, tenant_id: "mock", created_at: "", updated_at: "" },
    { id: "sp2", titre: "Calculatrice Scientifique", description: null,               prix: 15000, devise: "XAF", categorie: "fournitures",  is_active: true, tenant_id: "mock", created_at: "", updated_at: "" },
    { id: "sp3", titre: "Uniforme Complet",          description: "Chemise + pantalon",prix: 25000, devise: "XAF", categorie: "uniforme",    is_active: true, tenant_id: "mock", created_at: "", updated_at: "" },
  ],
}

// Builder chaînable simplifié
function buildQuery(tableName: string, rows: unknown[]) {
  let _rows = [...rows]
  let _isSingle = false

  const chain = {
    select:  (_cols?: string)            => chain,
    eq:      (col: string, val: unknown) => { _rows = _rows.filter((r: any) => r[col] === val); return chain },
    neq:     (col: string, val: unknown) => { _rows = _rows.filter((r: any) => r[col] !== val); return chain },
    order:   (_col: string)              => chain,
    limit:   (n: number)                 => { _rows = _rows.slice(0, n); return chain },
    single:  ()                          => { _isSingle = true; return chain },
    catch:   (_fn: (e: unknown) => unknown) => chain,
    then:    (resolve: (v: { data: unknown; error: null }) => unknown) => {
      const result = _isSingle
        ? { data: _rows[0] ?? null, error: null }
        : { data: _rows,            error: null }
      return Promise.resolve(resolve(result))
    },
    // Permet await direct
    [Symbol.toStringTag]: "MockQuery",
  }

  // Support await (thenable)
  ;(chain as any)[Symbol.for("nodejs.util.inspect.custom")] = () => "[MockQuery]"

  return Object.assign(chain, {
    async *[Symbol.asyncIterator]() {
      yield _isSingle
        ? { data: _rows[0] ?? null, error: null }
        : { data: _rows,            error: null }
    }
  })
}

// Supabase mock principal
export const supabaseMock = {
  auth: {
    getUser: async () => ({ data: { user: MOCK_USER }, error: null }),
    getSession: async () => ({ data: { session: { user: MOCK_USER, access_token: "mock_token" } }, error: null }),
    signInWithPassword: async () => ({ data: { user: MOCK_USER, session: {} }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: (_cb: unknown) => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: (table: string) => {
    const rows = MOCK_TABLES[table] ?? []
    const q = buildQuery(table, rows)
    return {
      ...q,
      insert: (_data: unknown) => buildQuery(table, []),
      update: (_data: unknown) => buildQuery(table, rows),
      delete: ()               => buildQuery(table, []),
      upsert: (_data: unknown) => buildQuery(table, []),
    }
  },
  channel: (_name: string) => ({
    on: () => ({ subscribe: () => ({}) }),
  }),
  removeChannel: () => {},
}