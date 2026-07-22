-- ═══════════════════════════════════════════════════════════════════════
-- Migration 024: Table inscription_requests
-- Stocke les demandes d'inscription soumises via la landing page tenant
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS inscription_requests (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Identité
    first_name      text NOT NULL,
    last_name       text NOT NULL,
    birth_date      date,
    gender          text CHECK (gender IN ('male', 'female', 'other')),

    -- Contact
    phone           text,
    parent_phone    text,
    email           text,
    address         text,

    -- Scolarité
    filiere_id      uuid REFERENCES filieres(id) ON DELETE SET NULL,
    classe_souhaitee text,   -- niveau souhaité (ex: "Terminale", "L1", etc.)
    previous_school text,
    previous_level  text,

    -- Statut
    status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'reviewing', 'accepted', 'rejected')),
    notes           text,    -- notes internes de l'admin

    -- Timestamps
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Index utiles
CREATE INDEX IF NOT EXISTS idx_inscription_requests_org_id ON inscription_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_inscription_requests_status ON inscription_requests(status);
CREATE INDEX IF NOT EXISTS idx_inscription_requests_created_at ON inscription_requests(created_at DESC);

-- RLS
ALTER TABLE inscription_requests ENABLE ROW LEVEL SECURITY;

-- Tout le monde (anon) peut soumettre une demande
CREATE POLICY "anon_insert_inscription" ON inscription_requests
    FOR INSERT TO anon WITH CHECK (true);

-- Seuls les utilisateurs authentifiés (admin) peuvent lire/modifier
CREATE POLICY "auth_read_inscription" ON inscription_requests
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_update_inscription" ON inscription_requests
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_inscription_requests_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_inscription_updated_at ON inscription_requests;
CREATE TRIGGER trg_inscription_updated_at
    BEFORE UPDATE ON inscription_requests
    FOR EACH ROW EXECUTE FUNCTION update_inscription_requests_updated_at();

-- Droits
GRANT INSERT ON inscription_requests TO anon;
GRANT SELECT, INSERT, UPDATE ON inscription_requests TO authenticated;
