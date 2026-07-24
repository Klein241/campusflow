-- ══════════════════════════════════════════════════════════════
-- FIX FOREIGN KEY: shop_products.created_by
-- CampusFlow n'utilise pas auth.users mais student_profiles & teacher_profiles
-- On supprime la contrainte de clé étrangère vers auth.users pour autoriser les UUID de profils
-- ══════════════════════════════════════════════════════════════

ALTER TABLE shop_products DROP CONSTRAINT IF EXISTS shop_products_created_by_fkey;
ALTER TABLE shop_orders DROP CONSTRAINT IF EXISTS shop_orders_user_id_fkey;
ALTER TABLE shop_orders DROP CONSTRAINT IF EXISTS shop_orders_buyer_id_fkey;
