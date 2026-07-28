-- ═══════════════════════════════════════════════════════════════════════
-- CAMPUSFLOW — CORRECTIONS DE SÉCURITÉ CRITIQUES
-- À exécuter dans le SQL Editor de Supabase (dashboard.supabase.com)
-- Toutes les commandes sont idempotentes (IF NOT EXISTS / OR REPLACE)
-- ═══════════════════════════════════════════════════════════════════════
-- Date : 2026-07-27
-- Auteur : Audit automatique CampusFlow
--
-- PROBLÈMES CORRIGÉS :
--   1. superadmin_get_sky_requests accordé à anon sans vérification admin
--   2. whatsapp_queue — policy FOR ALL USING (true) = injection possible
-- ═══════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────
-- CORRECTION 1 : superadmin_get_sky_requests
-- Avant : GRANT ... TO anon, authenticated — sans vérification is_platform_admin()
-- Après : Vérification admin obligatoire + REVOKE sur anon
-- ────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.superadmin_get_sky_requests()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON;
BEGIN
    -- Vérification superadmin obligatoire (comme toutes les autres RPCs superadmin)
    IF NOT (SELECT is_platform_admin()) THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    SELECT json_agg(row_to_json(r)) INTO result FROM (
        SELECT
            r.id,
            r.student_id,
            r.organization_id,
            r.points_requested,
            r.reason,
            r.status,
            r.admin_note,
            r.created_at,
            r.updated_at,
            COALESCE(sp.first_name || ' ' || sp.last_name, tp.first_name || ' ' || tp.last_name, 'Inconnu') AS user_name,
            COALESCE(sp.email, tp.email, '') AS user_email,
            o.name AS org_name,
            o.slug AS org_slug
        FROM public.sky_point_requests r
        LEFT JOIN public.student_profiles sp ON sp.id = r.student_id
        LEFT JOIN public.teacher_profiles tp ON tp.id = r.student_id
        LEFT JOIN public.organizations o ON o.id = r.organization_id
        ORDER BY r.created_at DESC
        LIMIT 100
    ) r;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Retirer le grant anon (dangereux), conserver authenticated uniquement
REVOKE EXECUTE ON FUNCTION public.superadmin_get_sky_requests() FROM anon;
GRANT  EXECUTE ON FUNCTION public.superadmin_get_sky_requests() TO authenticated;

-- ────────────────────────────────────────────────────────────────────────
-- CORRECTION 2 : whatsapp_queue — fermer la policy FOR ALL USING (true)
-- Avant : n'importe qui peut lire/écrire/supprimer dans la file WhatsApp
-- Après : lecture réservée aux directeurs (owner_id) + service_role Worker
--         écriture : uniquement via RPC queue_whatsapp_message (SECURITY DEFINER)
-- ────────────────────────────────────────────────────────────────────────

-- Supprimer toutes les policies ouvertes existantes
DROP POLICY IF EXISTS "Allow public read/insert on whatsapp_queue" ON public.whatsapp_queue;
DROP POLICY IF EXISTS "whatsapp_queue_open"                        ON public.whatsapp_queue;
DROP POLICY IF EXISTS "whatsapp_all_open"                          ON public.whatsapp_queue;
DROP POLICY IF EXISTS "whatsapp_read_open"                         ON public.whatsapp_queue;
DROP POLICY IF EXISTS "whatsapp_insert_open"                       ON public.whatsapp_queue;
DROP POLICY IF EXISTS "whatsapp_update_open"                       ON public.whatsapp_queue;
DROP POLICY IF EXISTS "whatsapp_delete_open"                       ON public.whatsapp_queue;

-- SELECT : directeurs (owner de l'org) peuvent voir leur file
CREATE POLICY "whatsapp_queue_owner_read" ON public.whatsapp_queue
    FOR SELECT USING (
        organization_id IN (
            SELECT id FROM public.organizations WHERE owner_id = auth.uid()
        )
    );

-- INSERT : uniquement via la RPC queue_whatsapp_message (SECURITY DEFINER)
-- Aucune policy INSERT directe → le service_role du Worker passe quand même
-- (service_role contourne toujours le RLS)

-- UPDATE : directeurs seulement (marquer comme envoyé)
CREATE POLICY "whatsapp_queue_owner_update" ON public.whatsapp_queue
    FOR UPDATE USING (
        organization_id IN (
            SELECT id FROM public.organizations WHERE owner_id = auth.uid()
        )
    );

-- DELETE : directeurs seulement
CREATE POLICY "whatsapp_queue_owner_delete" ON public.whatsapp_queue
    FOR DELETE USING (
        organization_id IN (
            SELECT id FROM public.organizations WHERE owner_id = auth.uid()
        )
    );

-- ────────────────────────────────────────────────────────────────────────
-- VÉRIFICATION FINALE
-- ────────────────────────────────────────────────────────────────────────
SELECT
    '✅ Corrections de sécurité appliquées' AS status,
    (
        SELECT COUNT(*) FROM pg_policies
        WHERE tablename = 'whatsapp_queue'
        AND policyname LIKE 'whatsapp_queue_owner_%'
    ) AS nouvelles_policies_whatsapp,
    (
        SELECT grantee FROM information_schema.role_routine_grants
        WHERE routine_name = 'superadmin_get_sky_requests'
        AND grantee = 'anon'
    ) AS anon_grant_restant -- doit être NULL
;
