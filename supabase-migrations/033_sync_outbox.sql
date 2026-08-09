-- ============================================================
-- CampusFlow - Migration 033 : Outbox Transactionnel
-- ============================================================
-- sync_outbox : chaque ecriture Supabase insere un enregistrement
-- dans cette table (meme transaction). Un Worker Cloudflare lit
-- cette table et pousse vers D1 de facon idempotente.
-- ============================================================

-- ── 1. TABLE SYNC OUTBOX ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sync_outbox (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    table_name  TEXT NOT NULL,
    operation   TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id   UUID NOT NULL,
    payload     JSONB NOT NULL,
    synced_at   TIMESTAMPTZ,
    retry_count INT DEFAULT 0,
    last_error  TEXT
);

-- Index pour que le Worker lise efficacement les non-syncronises
CREATE INDEX IF NOT EXISTS idx_sync_outbox_pending
    ON public.sync_outbox(created_at)
    WHERE synced_at IS NULL;

-- Nettoyage auto : supprimer les entrees syncees > 7 jours
-- (pour eviter une table qui grossit indefiniment)
CREATE INDEX IF NOT EXISTS idx_sync_outbox_synced
    ON public.sync_outbox(synced_at)
    WHERE synced_at IS NOT NULL;

-- RLS : seulement le service role peut lire/ecrire
ALTER TABLE public.sync_outbox ENABLE ROW LEVEL SECURITY;

-- Le Worker Cloudflare utilise SUPABASE_SERVICE_KEY → bypasse RLS
-- Aucune politique anon/authenticated → table completement privee

-- ── 2. TRIGGER AUTO-OUTBOX sur school_posts ───────────────
-- Chaque INSERT/UPDATE/DELETE cree automatiquement une entree outbox

CREATE OR REPLACE FUNCTION public.fn_sync_outbox()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.sync_outbox(table_name, operation, record_id, payload)
        VALUES (TG_TABLE_NAME, 'DELETE', OLD.id, to_jsonb(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.sync_outbox(table_name, operation, record_id, payload)
        VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id, to_jsonb(NEW));
        RETURN NEW;
    ELSE
        INSERT INTO public.sync_outbox(table_name, operation, record_id, payload)
        VALUES (TG_TABLE_NAME, 'INSERT', NEW.id, to_jsonb(NEW));
        RETURN NEW;
    END IF;
END;
$$;

-- Appliquer le trigger sur les tables critiques
DROP TRIGGER IF EXISTS trg_outbox_school_posts ON public.school_posts;
CREATE TRIGGER trg_outbox_school_posts
    AFTER INSERT OR UPDATE OR DELETE ON public.school_posts
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_outbox();

DROP TRIGGER IF EXISTS trg_outbox_student_profiles ON public.student_profiles;
CREATE TRIGGER trg_outbox_student_profiles
    AFTER INSERT OR UPDATE OR DELETE ON public.student_profiles
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_outbox();

DROP TRIGGER IF EXISTS trg_outbox_teacher_profiles ON public.teacher_profiles;
CREATE TRIGGER trg_outbox_teacher_profiles
    AFTER INSERT OR UPDATE OR DELETE ON public.teacher_profiles
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_outbox();

DROP TRIGGER IF EXISTS trg_outbox_session_tokens ON public.session_tokens;
CREATE TRIGGER trg_outbox_session_tokens
    AFTER INSERT OR UPDATE OR DELETE ON public.session_tokens
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_outbox();

DROP TRIGGER IF EXISTS trg_outbox_chat_messages ON public.chat_messages;
CREATE TRIGGER trg_outbox_chat_messages
    AFTER INSERT OR UPDATE OR DELETE ON public.chat_messages
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_outbox();

DROP TRIGGER IF EXISTS trg_outbox_organizations ON public.organizations;
CREATE TRIGGER trg_outbox_organizations
    AFTER INSERT OR UPDATE OR DELETE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_outbox();

-- ── 3. FUNCTION CLEANUP OUTBOX (appeler via cron ou manuellement) ──
CREATE OR REPLACE FUNCTION public.cleanup_sync_outbox()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    deleted_count INT;
BEGIN
    DELETE FROM public.sync_outbox
    WHERE synced_at IS NOT NULL
      AND synced_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- ── 4. TABLE SYSTEM HEALTH (etat des services) ────────────
CREATE TABLE IF NOT EXISTS public.system_health (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    service     TEXT NOT NULL,
    status      TEXT NOT NULL CHECK (status IN ('up', 'down', 'degraded')),
    latency_ms  INT,
    error_msg   TEXT,
    notified    BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_system_health_service
    ON public.system_health(service, checked_at DESC);

-- Les alertes non resolues
CREATE INDEX IF NOT EXISTS idx_system_health_alerts
    ON public.system_health(status, notified)
    WHERE status != 'up';

-- ── TRIGGERS SUPPLEMENTAIRES (toutes les tables metier) ──

-- Classrooms
DROP TRIGGER IF EXISTS trg_outbox_classrooms ON public.classrooms;
CREATE TRIGGER trg_outbox_classrooms
    AFTER INSERT OR UPDATE OR DELETE ON public.classrooms
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_outbox();

-- Subjects
DROP TRIGGER IF EXISTS trg_outbox_subjects ON public.subjects;
CREATE TRIGGER trg_outbox_subjects
    AFTER INSERT OR UPDATE OR DELETE ON public.subjects
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_outbox();

-- Evaluations
DROP TRIGGER IF EXISTS trg_outbox_evaluations ON public.evaluations;
CREATE TRIGGER trg_outbox_evaluations
    AFTER INSERT OR UPDATE OR DELETE ON public.evaluations
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_outbox();

-- Grades
DROP TRIGGER IF EXISTS trg_outbox_grades ON public.grades;
CREATE TRIGGER trg_outbox_grades
    AFTER INSERT OR UPDATE OR DELETE ON public.grades
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_outbox();

-- School Payments
DROP TRIGGER IF EXISTS trg_outbox_school_payments ON public.school_payments;
CREATE TRIGGER trg_outbox_school_payments
    AFTER INSERT OR UPDATE OR DELETE ON public.school_payments
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_outbox();

-- Timetable Slots
DROP TRIGGER IF EXISTS trg_outbox_timetable_slots ON public.timetable_slots;
CREATE TRIGGER trg_outbox_timetable_slots
    AFTER INSERT OR UPDATE OR DELETE ON public.timetable_slots
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_outbox();

-- Attendance
DROP TRIGGER IF EXISTS trg_outbox_attendance ON public.attendance;
CREATE TRIGGER trg_outbox_attendance
    AFTER INSERT OR UPDATE OR DELETE ON public.attendance
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_outbox();

-- Disciplines
DROP TRIGGER IF EXISTS trg_outbox_disciplines ON public.disciplines;
CREATE TRIGGER trg_outbox_disciplines
    AFTER INSERT OR UPDATE OR DELETE ON public.disciplines
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_outbox();

-- Exercises
DROP TRIGGER IF EXISTS trg_outbox_exercises ON public.exercises;
CREATE TRIGGER trg_outbox_exercises
    AFTER INSERT OR UPDATE OR DELETE ON public.exercises
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_outbox();

-- Exercise Submissions
DROP TRIGGER IF EXISTS trg_outbox_exercise_submissions ON public.exercise_submissions;
CREATE TRIGGER trg_outbox_exercise_submissions
    AFTER INSERT OR UPDATE OR DELETE ON public.exercise_submissions
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_outbox();

-- Lesson Progress
DROP TRIGGER IF EXISTS trg_outbox_lesson_progress ON public.lesson_progress;
CREATE TRIGGER trg_outbox_lesson_progress
    AFTER INSERT OR UPDATE OR DELETE ON public.lesson_progress
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_outbox();

-- Sky Transactions
DROP TRIGGER IF EXISTS trg_outbox_sky_transactions ON public.sky_transactions;
CREATE TRIGGER trg_outbox_sky_transactions
    AFTER INSERT OR UPDATE OR DELETE ON public.sky_transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_outbox();

-- Notifications
DROP TRIGGER IF EXISTS trg_outbox_notifications ON public.notifications;
CREATE TRIGGER trg_outbox_notifications
    AFTER INSERT OR UPDATE OR DELETE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_outbox();

-- Push Subscriptions
DROP TRIGGER IF EXISTS trg_outbox_push_subscriptions ON public.push_subscriptions;
CREATE TRIGGER trg_outbox_push_subscriptions
    AFTER INSERT OR UPDATE OR DELETE ON public.push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_outbox();

-- Push Tokens
DROP TRIGGER IF EXISTS trg_outbox_push_tokens ON public.push_tokens;
CREATE TRIGGER trg_outbox_push_tokens
    AFTER INSERT OR UPDATE OR DELETE ON public.push_tokens
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_outbox();

-- Inscription Requests
DROP TRIGGER IF EXISTS trg_outbox_inscription_requests ON public.inscription_requests;
CREATE TRIGGER trg_outbox_inscription_requests
    AFTER INSERT OR UPDATE OR DELETE ON public.inscription_requests
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_outbox();
