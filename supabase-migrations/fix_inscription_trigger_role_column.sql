-- ═══════════════════════════════════════════════════════════════════════
-- Fix CRITIQUE : trigger notify_admin_on_inscription utilise NEW.role
-- qui n'existe pas dans inscription_requests
-- À exécuter dans Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Recréer le trigger sans référence à NEW.role
CREATE OR REPLACE FUNCTION notify_admin_on_inscription()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    admin_row RECORD;
BEGIN
    -- Notifier tous les admins/profs de l'organisation
    FOR admin_row IN
        SELECT id FROM public.teacher_profiles
        WHERE organization_id = NEW.organization_id
          AND is_active = true
        UNION
        SELECT owner_id AS id FROM public.organizations
        WHERE id = NEW.organization_id
    LOOP
        INSERT INTO public.notifications (
            user_id,
            organization_id,
            type,
            title,
            body,
            data,
            is_read
        ) VALUES (
            admin_row.id,
            NEW.organization_id,
            'inscription_request',
            '📋 Nouvelle demande d''inscription',
            NEW.first_name || ' ' || NEW.last_name || ' souhaite rejoindre l''école.',
            jsonb_build_object(
                'inscription_id', NEW.id,
                'first_name', NEW.first_name,
                'last_name',  NEW.last_name,
                'phone',      NEW.phone,
                'access_code', NEW.access_code
            ),
            false
        )
        ON CONFLICT DO NOTHING;
    END LOOP;

    RETURN NEW;
END;
$$;

-- Recréer le trigger
DROP TRIGGER IF EXISTS trg_notify_admin_inscription ON public.inscription_requests;
CREATE TRIGGER trg_notify_admin_inscription
    AFTER INSERT ON public.inscription_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_on_inscription();

-- 2. Vérification
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'inscription_requests';
