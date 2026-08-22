-- ══════════════════════════════════════════════════════════════════
-- MIGRATION 060 — Langues Locales Africaines IziTeach
-- Ajoute le support multilingue pour les cours, leçons et exercices
-- Stratégie : double stockage (content = langue cible, content_original = pivot)
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Colonne langue par défaut sur l'établissement et les clés API ─
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'fr';
ALTER TABLE public.ai_agent_keys ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'fr';

-- ── 2. Colonnes language sur les tables de contenu ─────────────────
ALTER TABLE public.lessons       ADD COLUMN IF NOT EXISTS language     TEXT DEFAULT 'fr';
ALTER TABLE public.lessons       ADD COLUMN IF NOT EXISTS content_original TEXT; -- version française de référence
ALTER TABLE public.exercises     ADD COLUMN IF NOT EXISTS language     TEXT DEFAULT 'fr';
ALTER TABLE public.exam_papers   ADD COLUMN IF NOT EXISTS language     TEXT DEFAULT 'fr';
ALTER TABLE public.subjects      ADD COLUMN IF NOT EXISTS language     TEXT DEFAULT 'fr';
ALTER TABLE public.chapters      ADD COLUMN IF NOT EXISTS language     TEXT DEFAULT 'fr';

-- ── 3. Table de référence des langues supportées ───────────────────
CREATE TABLE IF NOT EXISTS public.iziteach_languages (
    code          TEXT PRIMARY KEY,          -- ISO 639-1 ou code interne (ex: 'sw', 'lin', 'ewo')
    name_fr       TEXT NOT NULL,             -- Nom en français
    name_native   TEXT NOT NULL,             -- Nom dans la langue elle-même
    tier          INTEGER NOT NULL DEFAULT 2, -- 1 = LLM natif, 2 = Cloudflare AI M2M100
    nllb_code     TEXT,                      -- Code NLLB pour M2M100 (ex: 'swh_Latn')
    countries     TEXT[],                    -- Pays principaux
    speakers_millions NUMERIC,               -- Nombre de locuteurs (millions)
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── 4. Données de référence — 20 langues africaines + 5 internationales
INSERT INTO public.iziteach_languages (code, name_fr, name_native, tier, nllb_code, countries, speakers_millions) VALUES
-- 5 Internationales
('fr',  'Français',        'Français',     1, 'fra_Latn', ARRAY['FR','SN','CI','CM','CD','MG'], 320),
('en',  'Anglais',         'English',      1, 'eng_Latn', ARRAY['GB','US','NG','GH','KE','ZA'], 1500),
('ar',  'Arabe',           'العربية',       1, 'ara_Arab', ARRAY['EG','DZ','MA','TN','SD','TD'], 400),
('es',  'Espagnol',        'Español',      1, 'spa_Latn', ARRAY['ES','GQ'],                     500),
('pt',  'Portugais',       'Português',    1, 'por_Latn', ARRAY['PT','AO','MZ','GW','CV'],     260),
-- Tier 1 — Support LLM direct
('sw',  'Swahili',         'Kiswahili',    1, 'swh_Latn', ARRAY['KE','TZ','CD','UG','RW'], 200),
('ha',  'Haoussa',         'Hausa',        1, 'hau_Latn', ARRAY['NG','NE','CM'],            85),
('yo',  'Yoruba',          'Yorùbá',       1, 'yor_Latn', ARRAY['NG','BJ','TG'],            50),
('ig',  'Igbo',            'Igbo',         1, 'ibo_Latn', ARRAY['NG'],                      44),
('am',  'Amharique',       'አማርኛ',        1, 'amh_Ethi', ARRAY['ET'],                      57),
('zu',  'Zoulou',          'isiZulu',      1, 'zul_Latn', ARRAY['ZA'],                      13),
('wo',  'Wolof',           'Wolof',        1, 'wol_Latn', ARRAY['SN','GM'],                 12),
('tw',  'Twi',             'Twi (Akan)',   1, 'twi_Latn', ARRAY['GH'],                      10),
('so',  'Somali',          'Soomaali',     1, 'som_Latn', ARRAY['SO','DJ','ET'],             22),
-- Tier 2 — Cloudflare AI M2M100
('lin', 'Lingala',         'Lingála',      2, 'lin_Latn', ARRAY['CD','CG'],                 80),
('ful', 'Fulfulde/Peul',   'Fulfulde',     2, 'fuv_Latn', ARRAY['CM','GN','ML','SN'],       40),
('bam', 'Bambara',         'Bamanankan',   2, 'bam_Latn', ARRAY['ML'],                      15),
('kin', 'Kinyarwanda',     'Kinyarwanda',  2, 'kin_Latn', ARRAY['RW'],                      12),
('mlg', 'Malgache',        'Malagasy',     2, 'plt_Latn', ARRAY['MG'],                      25),
('dyu', 'Dioula',          'Dioula',       2, 'dyu_Latn', ARRAY['BF','CI'],                 12),
('bci', 'Baoulé',          'Baoulé',       2, 'bci_Latn', ARRAY['CI'],                       4),
('dje', 'Zarma',           'Zarma',        2, 'dje_Latn', ARRAY['NE'],                       5),
('ewo', 'Ewondo',          'Ewondo',       2, 'ewo_Latn', ARRAY['CM'],                       1),
('dua', 'Duala',           'Duala',        2, 'dua_Latn', ARRAY['CM'],                       1),
('fan', 'Beti-Fang',       'Fang',         2, 'fan_Latn', ARRAY['CM','GA','GQ'],             1)
ON CONFLICT (code) DO NOTHING;

-- ── 5. Table des traductions stockées (cache) ──────────────────────
CREATE TABLE IF NOT EXISTS public.content_translations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     TEXT NOT NULL CHECK (entity_type IN ('lesson','exercise','exam_paper','subject','chapter')),
    entity_id       UUID NOT NULL,
    organization_id UUID NOT NULL,
    language_code   TEXT NOT NULL REFERENCES public.iziteach_languages(code),
    field_name      TEXT NOT NULL DEFAULT 'content',
    translated_text TEXT NOT NULL,
    source_language TEXT NOT NULL DEFAULT 'fr',
    translation_method TEXT DEFAULT 'cloudflare_m2m100',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (entity_id, language_code, field_name)
);

CREATE INDEX IF NOT EXISTS idx_translations_entity ON public.content_translations (entity_id, language_code);
CREATE INDEX IF NOT EXISTS idx_translations_org ON public.content_translations (organization_id);

-- ── 6. Nouvelles permissions dans le catalogue Admin ───────────────
INSERT INTO public.ai_permission_catalog (id, category, label, description, risk_level, sort_order) VALUES
    ('translate:content', 'Traduction & Langues', 'Traduire les cours', 'Traduire les contenus en 20+ langues africaines et internationales', 'low', 75),
    ('admin:students',    'Administration',       'Gérer les étudiants', 'Inscrire, modifier et gérer les dossiers étudiants',                  'high', 25),
    ('admin:payments',    'Finance',              'Gérer les paiements', 'Enregistrer les frais de scolarité et paiements d''élèves',          'high', 35),
    ('read:exams',        'Examens',              'Consulter les examens', 'Accès en lecture aux épreuves et devoirs',                          'low', 55),
    ('write:exams',       'Examens',              'Créer des examens',    'Créer et lancer des épreuves d''examen en direct',                   'medium', 85)
ON CONFLICT (id) DO NOTHING;

-- ── 7. RLS & Droits d'accès (Permissifs 058-compliant) ─────────────
ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iziteach_languages ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.iziteach_languages TO authenticated, service_role, anon;
GRANT ALL ON public.content_translations TO authenticated, service_role, anon;

DROP POLICY IF EXISTS "iziteach_languages_open_read" ON public.iziteach_languages;
CREATE POLICY "iziteach_languages_open_read" ON public.iziteach_languages FOR SELECT USING (true);
DROP POLICY IF EXISTS "iziteach_languages_open_write" ON public.iziteach_languages;
CREATE POLICY "iziteach_languages_open_write" ON public.iziteach_languages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "content_translations_open_read" ON public.content_translations;
CREATE POLICY "content_translations_open_read" ON public.content_translations FOR SELECT USING (true);
DROP POLICY IF EXISTS "content_translations_open_write" ON public.content_translations;
CREATE POLICY "content_translations_open_write" ON public.content_translations FOR ALL USING (true) WITH CHECK (true);
