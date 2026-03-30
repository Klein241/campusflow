-- ═══════════════════════════════════════════════════════════
-- Migration 016: School-specific notification enhancements
-- ═══════════════════════════════════════════════════════════
-- Adds organization context to push subscriptions and
-- creates notification type extensions for school events.
-- ═══════════════════════════════════════════════════════════

-- ── Enhance push_subscriptions with org context ───────────

-- Use push_tokens table if it exists (used by current worker)
DO $$ BEGIN
    -- Add organization_id to push_tokens if table exists
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'push_tokens') THEN
        ALTER TABLE public.push_tokens
            ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id),
            ADD COLUMN IF NOT EXISTS org_slug text,
            ADD COLUMN IF NOT EXISTS user_role text DEFAULT 'student';

        CREATE INDEX IF NOT EXISTS idx_push_tokens_org
            ON push_tokens(organization_id);
    END IF;

    -- Also enhance push_subscriptions if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'push_subscriptions') THEN
        ALTER TABLE public.push_subscriptions
            ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id),
            ADD COLUMN IF NOT EXISTS org_slug text,
            ADD COLUMN IF NOT EXISTS user_role text DEFAULT 'student';

        CREATE INDEX IF NOT EXISTS idx_push_subs_org
            ON push_subscriptions(organization_id);
    END IF;
END $$;

-- ── School notification action types ──────────────────────
-- These extend the notification_preferences table to include
-- school-specific event types

DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'notification_preferences') THEN
        -- Insert default preferences for school notification types
        -- These will be created per-user on first access
        INSERT INTO notification_preferences (user_id, action_type, in_app, push_enabled)
        SELECT p.id, t.action_type, true, true
        FROM profiles p
        CROSS JOIN (VALUES
            ('grade_published'),
            ('evaluation_scheduled'),
            ('payment_confirmed'),
            ('discipline_sanction'),
            ('timetable_change'),
            ('admin_announcement'),
            ('evaluation_reminder')
        ) AS t(action_type)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ── Notification type comments (documentation) ────────────
COMMENT ON TABLE notifications IS 'All notification types including school events:
  - grade_published: New grade for student evaluation
  - evaluation_scheduled: New evaluation announced
  - payment_confirmed: Payment receipt confirmation
  - discipline_sanction: Disciplinary action issued
  - timetable_change: Schedule modification
  - admin_announcement: School-wide admin post
  - evaluation_reminder: J-1 reminder before evaluation
  Plus all existing community types (support, group, dm, etc.)';
