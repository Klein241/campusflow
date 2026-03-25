// ============================================================
// TENANT CONFIG — Instance unique (1 centre de formation)
// Pour passer en SaaS multi-centre : remplacer TENANT_ID
// par la valeur issue de l'URL / session.
// ============================================================

export const TENANT_ID = '00000000-0000-0000-0000-000000000001'

export const CENTRE_CONFIG = {
  nom:          'Centre de Formation',       // ← Remplacer
  slogan:       'Excellence & Savoir',       // ← Remplacer
  ville:        'Yaoundé',                   // ← Remplacer
  pays:         'Cameroun',                  // ← Remplacer
  telephone:    '+237 000 000 000',          // ← Remplacer
  email:        'contact@campusflow.cm',// ← Remplacer
  logo_url:     '/logo.png',
  couleur_primaire: '#4F46E5',
  couleur_secondaire: '#0891B2',
  devise:       'XAF',
  nb_filieres:  13,
  tenant_id:    TENANT_ID,
} as const

export type CentreConfig = typeof CENTRE_CONFIG