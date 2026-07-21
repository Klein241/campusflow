-- ══════════════════════════════════════════════════════
-- SKY POINTS — Tables for balance & daily credit system
-- Run this in your Supabase SQL Editor
-- ══════════════════════════════════════════════════════

-- 1. Main balance table
CREATE TABLE IF NOT EXISTS sky_points (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL UNIQUE,  -- one row per user
  organization_id    UUID REFERENCES organizations(id) ON DELETE CASCADE,
  balance            INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  last_daily_claim   TIMESTAMPTZ,           -- tracks last free-point date
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_sky_points_user ON sky_points(user_id);
CREATE INDEX IF NOT EXISTS idx_sky_points_org  ON sky_points(organization_id);

-- 2. Transaction history table
CREATE TABLE IF NOT EXISTS sky_points_history (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL,
  organization_id    UUID REFERENCES organizations(id) ON DELETE SET NULL,
  delta              INTEGER NOT NULL,                   -- positive = credit, negative = debit
  type               TEXT NOT NULL DEFAULT 'manual',    -- 'daily_free' | 'purchase' | 'spend' | 'manual'
  description        TEXT,
  reference_id       UUID,                              -- e.g. pack_id, item_id
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sky_hist_user ON sky_points_history(user_id);
CREATE INDEX IF NOT EXISTS idx_sky_hist_org  ON sky_points_history(organization_id);

-- 3. Row Level Security
ALTER TABLE sky_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE sky_points_history ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own balance
CREATE POLICY "sky_points_own_rw" ON sky_points
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can read/insert their own history
CREATE POLICY "sky_hist_own_r" ON sky_points_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sky_hist_own_ins" ON sky_points_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Superadmin: full access (adjust anon key if needed)
-- CREATE POLICY "sky_admin_all" ON sky_points FOR ALL USING (is_superadmin());

-- 4. Pack definitions table (managed by superadmin)
CREATE TABLE IF NOT EXISTS sky_point_packs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  points       INTEGER NOT NULL,
  price_cents  INTEGER NOT NULL,   -- price in euro cents (199 = €1.99)
  currency     TEXT NOT NULL DEFAULT 'EUR',
  stripe_link  TEXT,              -- Stripe payment link
  paypal_link  TEXT,              -- PayPal payment link
  is_active    BOOLEAN DEFAULT true,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sky_point_packs ENABLE ROW LEVEL SECURITY;

-- Anyone can read active packs
CREATE POLICY "packs_read_all" ON sky_point_packs
  FOR SELECT USING (is_active = true);

-- Only service_role can write packs (superadmin manages via backend)
-- INSERT default packs
INSERT INTO sky_point_packs (name, points, price_cents, currency, sort_order) VALUES
  ('Starter',  100,  199, 'EUR', 1),
  ('Populaire',300,  499, 'EUR', 2),
  ('Pro',      700,  999, 'EUR', 3),
  ('Premium',  2000, 2499,'EUR', 4)
ON CONFLICT DO NOTHING;

-- 5. Helper function: credit daily point (prevents double-claim same day)
CREATE OR REPLACE FUNCTION claim_daily_sky_point(p_user_id UUID, p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_today     DATE := CURRENT_DATE;
  v_row       sky_points%ROWTYPE;
  v_last_date DATE;
BEGIN
  -- Upsert row
  INSERT INTO sky_points (user_id, organization_id, balance, last_daily_claim)
  VALUES (p_user_id, p_org_id, 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_row FROM sky_points WHERE user_id = p_user_id FOR UPDATE;

  v_last_date := v_row.last_daily_claim::DATE;

  IF v_last_date = v_today THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already claimed today', 'balance', v_row.balance);
  END IF;

  -- Credit 1 point
  UPDATE sky_points
  SET balance = balance + 1, last_daily_claim = now(), updated_at = now()
  WHERE user_id = p_user_id;

  -- Log history
  INSERT INTO sky_points_history (user_id, organization_id, delta, type, description)
  VALUES (p_user_id, p_org_id, 1, 'daily_free', 'Point quotidien gratuit');

  RETURN jsonb_build_object('success', true, 'message', 'Claimed', 'balance', v_row.balance + 1);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION claim_daily_sky_point TO authenticated;
