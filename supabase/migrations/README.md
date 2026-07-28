# supabase/migrations — Patches correctifs CampusFlow

Ce dossier contient les **patches correctifs** appliqués après le schéma principal.

Le schéma principal (évolution chronologique 002→028) se trouve dans :
→ `../supabase-migrations/`

Voir l'ordre d'application complet dans :
→ `../supabase-migrations/MIGRATION_ORDER.md`

## ⚠️ Script de sécurité à exécuter

**`security_fixes_2026_07_27.sql`** — Corrections critiques identifiées lors de l'audit du 2026-07-27 :

1. `superadmin_get_sky_requests` : retire le grant `anon`, ajoute vérification `is_platform_admin()`
2. `whatsapp_queue` : remplace `FOR ALL USING (true)` par des policies scopées par `owner_id`

**Pour appliquer :** Coller le contenu dans Supabase SQL Editor → Exécuter.
