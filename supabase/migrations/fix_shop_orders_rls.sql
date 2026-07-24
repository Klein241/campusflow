-- ══════════════════════════════════════════════════════════════
-- FIX RLS & FK: shop_orders & shop_products
-- CampusFlow n'utilise pas Supabase Auth (auth.uid() = NULL)
-- On ouvre le RLS et on supprime les contraintes FK d'authentification
-- ══════════════════════════════════════════════════════════════

-- 1. SHOP PRODUCTS
ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;

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
DROP POLICY IF EXISTS "shop_products_read_open"        ON shop_products;
DROP POLICY IF EXISTS "shop_products_insert_open"      ON shop_products;
DROP POLICY IF EXISTS "shop_products_update_open"      ON shop_products;
DROP POLICY IF EXISTS "shop_products_delete_open"      ON shop_products;

CREATE POLICY "shop_products_read_open"   ON shop_products FOR SELECT USING (true);
CREATE POLICY "shop_products_insert_open" ON shop_products FOR INSERT WITH CHECK (true);
CREATE POLICY "shop_products_update_open" ON shop_products FOR UPDATE USING (true);
CREATE POLICY "shop_products_delete_open" ON shop_products FOR DELETE USING (true);

ALTER TABLE shop_products DROP CONSTRAINT IF EXISTS shop_products_created_by_fkey;

GRANT ALL ON shop_products TO anon, authenticated, service_role;

-- 2. SHOP ORDERS
ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_orders_insert"       ON shop_orders;
DROP POLICY IF EXISTS "shop_orders_select"       ON shop_orders;
DROP POLICY IF EXISTS "shop_orders_update"       ON shop_orders;
DROP POLICY IF EXISTS "shop_orders_delete"       ON shop_orders;
DROP POLICY IF EXISTS "shop_orders_open"         ON shop_orders;
DROP POLICY IF EXISTS "shop_orders_all_open"     ON shop_orders;
DROP POLICY IF EXISTS "shop_orders_read_open"    ON shop_orders;
DROP POLICY IF EXISTS "shop_orders_insert_open"  ON shop_orders;
DROP POLICY IF EXISTS "shop_orders_update_open"  ON shop_orders;
DROP POLICY IF EXISTS "shop_orders_delete_open"  ON shop_orders;

CREATE POLICY "shop_orders_read_open"   ON shop_orders FOR SELECT USING (true);
CREATE POLICY "shop_orders_insert_open" ON shop_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "shop_orders_update_open" ON shop_orders FOR UPDATE USING (true);
CREATE POLICY "shop_orders_delete_open" ON shop_orders FOR DELETE USING (true);

ALTER TABLE shop_orders DROP CONSTRAINT IF EXISTS shop_orders_student_id_fkey;
ALTER TABLE shop_orders DROP CONSTRAINT IF EXISTS shop_orders_user_id_fkey;
ALTER TABLE shop_orders DROP CONSTRAINT IF EXISTS shop_orders_buyer_id_fkey;

GRANT ALL ON shop_orders TO anon, authenticated, service_role;
