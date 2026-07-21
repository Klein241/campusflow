-- ═══════════════════════════════════════════════════════════
-- SKY POINTS — SPEND SYSTEM + CHAT CREDITS
-- Run this migration AFTER sky_points.sql
-- ═══════════════════════════════════════════════════════════

-- Add free_messages_used to sky_points
ALTER TABLE sky_points ADD COLUMN IF NOT EXISTS free_messages_used INTEGER DEFAULT 0;

-- ─── RPC: spend_sky_point ────────────────────────────────────
-- Atomically deducts sky points from a user's balance
CREATE OR REPLACE FUNCTION spend_sky_point(
    p_user_id UUID,
    p_org_id  UUID,
    p_amount  INTEGER DEFAULT 1,
    p_reason  TEXT    DEFAULT 'spend',
    p_description TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_balance INTEGER;
BEGIN
    -- Ensure row exists
    INSERT INTO sky_points (user_id, organization_id, balance, free_messages_used)
    VALUES (p_user_id, p_org_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Lock and read
    SELECT balance INTO v_balance
    FROM sky_points WHERE user_id = p_user_id FOR UPDATE;

    -- Insufficient balance
    IF v_balance < p_amount THEN
        RETURN json_build_object(
            'success', false,
            'balance', v_balance,
            'error', 'insufficient_balance'
        );
    END IF;

    -- Deduct
    UPDATE sky_points
    SET balance    = balance - p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- History log
    INSERT INTO sky_points_history (user_id, organization_id, delta, type, description)
    VALUES (p_user_id, p_org_id, -p_amount, p_reason, COALESCE(p_description, p_reason));

    RETURN json_build_object('success', true, 'balance', v_balance - p_amount);
END;
$$;

-- ─── RPC: use_chat_credit ────────────────────────────────────
-- Uses free chat credits first (10 total), then deducts 1 sky point per message
CREATE OR REPLACE FUNCTION use_chat_credit(
    p_user_id UUID,
    p_org_id  UUID
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_balance   INTEGER;
    v_free_used INTEGER;
    v_free_limit CONSTANT INTEGER := 10;
BEGIN
    -- Ensure row exists
    INSERT INTO sky_points (user_id, organization_id, balance, free_messages_used)
    VALUES (p_user_id, p_org_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Lock and read
    SELECT balance, free_messages_used
    INTO v_balance, v_free_used
    FROM sky_points WHERE user_id = p_user_id FOR UPDATE;

    -- Still has free credits
    IF v_free_used < v_free_limit THEN
        UPDATE sky_points
        SET free_messages_used = free_messages_used + 1,
            updated_at = NOW()
        WHERE user_id = p_user_id;

        RETURN json_build_object(
            'success',        true,
            'used_free',      true,
            'free_remaining', v_free_limit - v_free_used - 1,
            'balance',        v_balance
        );
    END IF;

    -- Free credits exhausted — need Sky Points
    IF v_balance < 1 THEN
        RETURN json_build_object(
            'success',        false,
            'used_free',      false,
            'free_remaining', 0,
            'balance',        v_balance,
            'error',          'insufficient_balance'
        );
    END IF;

    -- Deduct 1 point
    UPDATE sky_points
    SET balance    = balance - 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    INSERT INTO sky_points_history (user_id, organization_id, delta, type, description)
    VALUES (p_user_id, p_org_id, -1, 'chat_message', 'Message groupe de discussion');

    RETURN json_build_object(
        'success',        true,
        'used_free',      false,
        'free_remaining', 0,
        'balance',        v_balance - 1
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION spend_sky_point(UUID, UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION use_chat_credit(UUID, UUID) TO authenticated;
