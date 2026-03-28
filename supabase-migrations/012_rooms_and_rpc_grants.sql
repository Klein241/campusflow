-- ============================================================
-- 012 — ROOMS TABLE + PIN RPC FUNCTIONS + GRANTS
-- ============================================================
-- Date: 2026-03-28
-- Fixes:
--   1. Creates the `rooms` table for physical room management
--   2. Adds pin_code/pin_set columns if missing
--   3. Creates set_pin + verify_pin RPC functions FIRST
--   4. Then grants EXECUTE to anon + authenticated roles
--   5. Makes subjects.classroom_id explicitly nullable
-- ============================================================

-- ── 1. ROOMS TABLE (salles physiques) ──
CREATE TABLE IF NOT EXISTS public.rooms (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    capacity        INTEGER,
    building        TEXT,
    floor           TEXT,
    equipment       TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_org ON public.rooms(organization_id);

-- RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "rooms_read" ON public.rooms;
    DROP POLICY IF EXISTS "rooms_admin_write" ON public.rooms;
    DROP POLICY IF EXISTS "rooms_anon_read" ON public.rooms;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "rooms_read" ON public.rooms
    FOR SELECT USING (true);

CREATE POLICY "rooms_admin_write" ON public.rooms
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.organizations 
            WHERE id = rooms.organization_id 
            AND owner_id = auth.uid()
        )
    );

CREATE POLICY "rooms_anon_read" ON public.rooms
    FOR SELECT TO anon USING (true);


-- ── 2. Add pin_code and pin_set columns if missing ──
DO $$ BEGIN
    ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS pin_code TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS pin_set BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS pin_code TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS pin_set BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ── 3. CREATE RPC functions FIRST (before any GRANT) ──

-- Drop existing functions to avoid signature conflicts
DROP FUNCTION IF EXISTS public.verify_pin(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.set_pin(UUID, TEXT, TEXT);

-- verify_pin: checks a PIN without exposing it client-side
CREATE OR REPLACE FUNCTION public.verify_pin(
    p_profile_id UUID,
    p_role TEXT,
    p_pin TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stored_pin TEXT;
BEGIN
    IF p_role = 'teacher' THEN
        SELECT pin_code INTO stored_pin 
        FROM public.teacher_profiles 
        WHERE id = p_profile_id;
    ELSE
        SELECT pin_code INTO stored_pin 
        FROM public.student_profiles 
        WHERE id = p_profile_id;
    END IF;
    
    RETURN stored_pin IS NOT NULL AND stored_pin = p_pin;
END;
$$;

-- set_pin: sets a PIN without exposing it client-side
CREATE OR REPLACE FUNCTION public.set_pin(
    p_profile_id UUID,
    p_role TEXT,
    p_pin TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF length(p_pin) != 4 THEN
        RETURN FALSE;
    END IF;

    IF p_role = 'teacher' THEN
        UPDATE public.teacher_profiles 
        SET pin_code = p_pin, pin_set = true 
        WHERE id = p_profile_id;
    ELSE
        UPDATE public.student_profiles 
        SET pin_code = p_pin, pin_set = true 
        WHERE id = p_profile_id;
    END IF;
    
    RETURN TRUE;
END;
$$;


-- ── 4. GRANT EXECUTE (AFTER functions exist) ──
GRANT EXECUTE ON FUNCTION public.set_pin(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.set_pin(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_pin(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_pin(UUID, TEXT, TEXT) TO authenticated;


-- ── 5. Ensure subjects.classroom_id is explicitly nullable ──
DO $$ BEGIN
    ALTER TABLE public.subjects ALTER COLUMN classroom_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
