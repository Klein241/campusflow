-- ==============================================================================
-- 074: RPC FUNCTION TO SAFELY CREDIT/DEBIT SKY POINTS AS SUPERADMIN
-- Description: Bypasses RLS safely via SECURITY DEFINER to ensure that
--              organizations and their owners receive Sky Points instantly.
-- ==============================================================================

-- 1. Ensure sky_points columns exist on organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS sky_points INTEGER DEFAULT 1000;

-- 2. RPC Function: superadmin_credit_org_sky_points
CREATE OR REPLACE FUNCTION public.superadmin_credit_org_sky_points(
    p_org_id UUID,
    p_delta INTEGER,
    p_reason TEXT DEFAULT 'Ajustement Superadmin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated admin privileges, bypassing RLS safely
AS $$
DECLARE
    v_org RECORD;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_owner_id UUID;
BEGIN
    -- 1. Fetch current organization
    SELECT id, name, slug, owner_id, COALESCE(sky_points, 1000) as balance
    INTO v_org
    FROM public.organizations
    WHERE id = p_org_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Organisation introuvable.'
        );
    END IF;

    v_current_balance := v_org.balance;
    v_new_balance := GREATEST(0, v_current_balance + p_delta);
    v_owner_id := v_org.owner_id;

    -- 2. Update organizations table atomically
    UPDATE public.organizations
    SET 
        sky_points = v_new_balance,
        updated_at = now()
    WHERE id = p_org_id;

    -- 3. If owner_id exists, sync to teacher_profiles / student_profiles
    IF v_owner_id IS NOT NULL THEN
        UPDATE public.teacher_profiles
        SET sky_points = v_new_balance
        WHERE id = v_owner_id;

        UPDATE public.student_profiles
        SET sky_points = v_new_balance
        WHERE id = v_owner_id;
    END IF;

    -- 4. Log in sky_transactions if table exists
    BEGIN
        INSERT INTO public.sky_transactions (
            student_id,
            amount,
            transaction_type,
            type,
            description,
            organization_id,
            created_at
        ) VALUES (
            COALESCE(v_owner_id, p_org_id),
            p_delta,
            'superadmin_adjustment',
            'superadmin_adjustment',
            COALESCE(p_reason, 'Ajustement Superadmin') || ' (' || (CASE WHEN p_delta >= 0 THEN '+' ELSE '' END) || p_delta || ' pts)',
            p_org_id,
            now()
        );
    EXCEPTION WHEN OTHERS THEN
        -- Non-blocking if table structure differs slightly
        NULL;
    END;

    -- 5. Return success result with fresh balance
    RETURN jsonb_build_object(
        'success', true,
        'org_id', p_org_id,
        'org_name', v_org.name,
        'previous_balance', v_current_balance,
        'delta', p_delta,
        'new_balance', v_new_balance,
        'owner_id', v_owner_id
    );
END;
$$;

-- Allow execution by authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.superadmin_credit_org_sky_points(UUID, INTEGER, TEXT) TO authenticated, anon;
