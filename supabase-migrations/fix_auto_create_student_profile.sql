-- ═══════════════════════════════════════════════════════════════════════
-- Fix: Création automatique du student_profile lors de l'acceptation
-- d'une demande d'inscription + accès immédiat avec le code généré
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Trigger: quand une inscription passe à 'accepted', créer le student_profile
CREATE OR REPLACE FUNCTION create_student_on_acceptance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    new_user_id uuid;
BEGIN
    -- Seulement si le statut passe à 'accepted'
    IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN

        -- Créer l'entrée dans student_profiles
        INSERT INTO student_profiles (
            id,
            organization_id,
            first_name,
            last_name,
            phone,
            email,
            address,
            birth_date,
            gender,
            classroom_id,
            filiere_id,
            access_code,
            pin_code,
            sky_points,
            is_active,
            pin_set,
            created_at,
            updated_at
        )
        SELECT
            gen_random_uuid(),
            NEW.organization_id,
            NEW.first_name,
            NEW.last_name,
            NEW.phone,
            NEW.email,
            NEW.address,
            NEW.birth_date,
            NEW.gender,
            NEW.classroom_id,
            NEW.filiere_id,
            NEW.access_code,
            NEW.pin_code,
            100,        -- Sky Points de départ
            true,
            true,       -- PIN déjà défini lors de l'inscription
            now(),
            now()
        ON CONFLICT (access_code) DO NOTHING;  -- évite les doublons

        -- Notifier l'étudiant (optionnel — si table notifications accessible)
        -- (notification envoyée via le canal public/webhook)

    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_student_on_acceptance ON inscription_requests;
CREATE TRIGGER trg_create_student_on_acceptance
    AFTER UPDATE ON inscription_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_student_on_acceptance();

-- ═══════════════════════════════════════════════════════════════════════
-- Accès IMMÉDIAT : l'étudiant peut se connecter dès l'inscription
-- (sans attendre l'approbation admin)
-- Solution : aussi chercher dans inscription_requests lors du login
-- OU créer le student_profile immédiatement à l'inscription
-- ═══════════════════════════════════════════════════════════════════════

-- Option recommandée : créer student_profile IMMÉDIATEMENT à l'inscription
-- (avec is_active = true mais status pending dans inscription_requests)
-- Le trigger ci-dessous gère le cas 'accepted' pour les futurs flux.

-- Pour les inscriptions existantes déjà 'pending', migration manuelle :
-- INSERT INTO student_profiles (id, organization_id, first_name, last_name, phone, ...)
-- SELECT gen_random_uuid(), organization_id, first_name, last_name, phone, ...
-- FROM inscription_requests
-- WHERE status = 'pending'
-- ON CONFLICT DO NOTHING;

-- Vérification
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'inscription_requests';
