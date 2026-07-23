-- ══════════════════════════════════════════════════════════════
-- FIX RLS: shop_products
-- CampusFlow n'utilise pas Supabase Auth → auth.uid() = NULL
-- On ouvre le RLS pour permettre INSERT/SELECT via user_id app
-- ══════════════════════════════════════════════════════════════

-- Activer RLS si pas déjà fait
ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les anciennes policies qui bloquent
DROP POLICY IF EXISTS "shop_products_insert"           ON shop_products;
DROP POLICY IF EXISTS "shop_products_select"           ON shop_products;
DROP POLICY IF EXISTS "shop_products_update"           ON shop_products;
DROP POLICY IF EXISTS "shop_products_delete"           ON shop_products;
DROP POLICY IF EXISTS "shop_products_seller_insert"    ON shop_products;
DROP POLICY IF EXISTS "shop_products_seller_select"    ON shop_products;
DROP POLICY IF EXISTS "shop_products_own_insert"       ON shop_products;
DROP POLICY IF EXISTS "shop_products_own_rw"           ON shop_products;
DROP POLICY IF EXISTS "shop_products_open"             ON shop_products;
DROP POLICY IF EXISTS "shop_products_all_open"         ON shop_products;

-- ── Nouvelles policies ouvertes (filtrage côté app) ──────────

-- SELECT: tout le monde peut voir les produits
CREATE POLICY "shop_products_read_open" ON shop_products
    FOR SELECT USING (true);

-- INSERT: ouvert, user_id validé côté application
CREATE POLICY "shop_products_insert_open" ON shop_products
    FOR INSERT WITH CHECK (true);

-- UPDATE: ouvert, filtré par seller_id côté application
CREATE POLICY "shop_products_update_open" ON shop_products
    FOR UPDATE USING (true);

-- DELETE: ouvert, filtré côté application
CREATE POLICY "shop_products_delete_open" ON shop_products
    FOR DELETE USING (true);

-- ══════════════════════════════════════════════════════════════
-- FIX RLS: shop_orders (même logique)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_orders_insert"       ON shop_orders;
DROP POLICY IF EXISTS "shop_orders_select"       ON shop_orders;
DROP POLICY IF EXISTS "shop_orders_update"       ON shop_orders;
DROP POLICY IF EXISTS "shop_orders_open"         ON shop_orders;
DROP POLICY IF EXISTS "shop_orders_all_open"     ON shop_orders;

CREATE POLICY "shop_orders_read_open"   ON shop_orders FOR SELECT USING (true);
CREATE POLICY "shop_orders_insert_open" ON shop_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "shop_orders_update_open" ON shop_orders FOR UPDATE USING (true);
