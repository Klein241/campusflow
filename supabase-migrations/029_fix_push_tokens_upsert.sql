-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 029: FIX PUSH TOKENS — Contrainte user_id unique + subscription_json
-- À exécuter dans le SQL Editor de Supabase (dashboard.supabase.com)
-- Idempotente — sûre à ré-exécuter
-- ═══════════════════════════════════════════════════════════════════════════

-- Problème: push_tokens a UNIQUE(endpoint) mais le Worker fait upsert sur user_id.
-- Solution: ajouter UNIQUE(user_id) pour que le onConflict: 'user_id' fonctionne,
--           et s'assurer que endpoint/p256dh/auth sont NULLable (subscription_json suffit).

-- 1. Rendre endpoint, p256dh, auth NULLable (ils peuvent être dans subscription_json)
ALTER TABLE push_tokens
    ALTER COLUMN endpoint DROP NOT NULL,
    ALTER COLUMN p256dh   DROP NOT NULL,
    ALTER COLUMN auth     DROP NOT NULL;

-- 2. Ajouter UNIQUE(user_id) — c'est ce que le Worker et les hooks utilisent pour upsert
DO $$ BEGIN
    ALTER TABLE push_tokens ADD CONSTRAINT push_tokens_user_id_unique UNIQUE (user_id);
EXCEPTION WHEN duplicate_table THEN NULL;
WHEN duplicate_object THEN NULL;
END $$;

-- 3. Ajouter subscription_json si elle n'existe pas
ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS subscription_json TEXT;

-- 4. Ajouter platform si elle n'existe pas
ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'web';

-- 5. Migrer les données existantes: extraire endpoint/p256dh/auth vers subscription_json
UPDATE push_tokens
SET subscription_json = json_build_object(
    'endpoint', endpoint,
    'keys', json_build_object('p256dh', p256dh, 'auth', auth)
)::text
WHERE subscription_json IS NULL
  AND endpoint IS NOT NULL;

-- 6. Mettre à jour la politique RLS push_tokens — permissive pour le Worker service_role
DROP POLICY IF EXISTS "push_tokens_own"   ON push_tokens;
DROP POLICY IF EXISTS "push_tokens_select" ON push_tokens;
DROP POLICY IF EXISTS "push_tokens_insert" ON push_tokens;
DROP POLICY IF EXISTS "push_tokens_update" ON push_tokens;
DROP POLICY IF EXISTS "push_tokens_delete" ON push_tokens;

CREATE POLICY "push_tokens_select" ON push_tokens FOR SELECT USING (true);
CREATE POLICY "push_tokens_insert" ON push_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "push_tokens_update" ON push_tokens FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "push_tokens_delete" ON push_tokens FOR DELETE USING (true);

-- 7. Index de performance
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_endpoint ON push_tokens (endpoint) WHERE endpoint IS NOT NULL;

-- 8. S'assurer que la table notifications a bien la colonne body synchronisée avec message
-- (patch de sécurité — idempotent)
UPDATE notifications
SET body = message
WHERE (body IS NULL OR body = '')
  AND message IS NOT NULL AND message != '';

UPDATE notifications
SET message = body
WHERE (message IS NULL OR message = '')
  AND body IS NOT NULL AND body != '';

-- 9. Vérification
SELECT
    '✅ Migration 029 OK' AS status,
    (SELECT COUNT(*) FROM push_tokens) AS push_tokens_count,
    (SELECT COUNT(*) FROM push_tokens WHERE subscription_json IS NOT NULL) AS with_subscription_json;
