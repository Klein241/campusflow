-- ═══════════════════════════════════════════════════════════════════════
-- Fix: Notification automatique admin quand une inscription est soumise
-- + Contrainte unicité pour éviter les doublons
-- À exécuter dans Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Contrainte unicité : même prénom + nom + téléphone + école
--    (évite les doublons même côté base de données)
ALTER TABLE inscription_requests
    DROP CONSTRAINT IF EXISTS uq_inscription_per_org_person;

ALTER TABLE inscription_requests
    ADD CONSTRAINT uq_inscription_per_org_person
    UNIQUE (organization_id, first_name, last_name, phone);

-- 2. Fonction trigger : crée une notification pour tous les admins/profs de l'école
--    quand une nouvelle inscription arrive
CREATE OR REPLACE FUNCTION notify_admin_on_inscription()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    admin_row RECORD;
BEGIN
    -- Notifier tous les admins/owners de l'organisation
    FOR admin_row IN
        SELECT id FROM teacher_profiles
        WHERE organization_id = NEW.organization_id
          AND role IN ('admin', 'owner', 'prof')
    LOOP
        INSERT INTO notifications (
            user_id,
            organization_id,
            type,
            title,
            body,
            data,
            is_read,
            created_at
        ) VALUES (
            admin_row.id,
            NEW.organization_id,
            'inscription_request',
            '📋 Nouvelle demande d''inscription',
            NEW.first_name || ' ' || NEW.last_name || ' a soumis une demande d''inscription.',
            jsonb_build_object(
                'inscription_id', NEW.id,
                'first_name', NEW.first_name,
                'last_name', NEW.last_name,
                'phone', NEW.phone,
                'classroom_id', NEW.classroom_id,
                'status', 'pending'
            ),
            false,
            now()
        );
    END LOOP;

    RETURN NEW;
END;
$$;

-- 3. Attacher le trigger à la table inscription_requests
DROP TRIGGER IF EXISTS trg_notify_admin_inscription ON inscription_requests;
CREATE TRIGGER trg_notify_admin_inscription
    AFTER INSERT ON inscription_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_on_inscription();

-- 4. Vérification : lister les triggers actifs sur inscription_requests
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'inscription_requests';
