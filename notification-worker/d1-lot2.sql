CREATE TABLE IF NOT EXISTS tutoring_requests (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), user_id TEXT NOT NULL, content TEXT NOT NULL, category TEXT DEFAULT 'other', is_anonymous INTEGER DEFAULT 0, photos TEXT DEFAULT '[]', is_answered INTEGER DEFAULT 0, answered_at TEXT, prayer_count INTEGER DEFAULT 0, prayed_by TEXT DEFAULT '[]', tenant_id TEXT DEFAULT '00000000-0000-0000-0000-000000000001', created_at TEXT NOT NULL DEFAULT (datetime('now')), image_url TEXT, edited_at TEXT, organization_id TEXT, viewed_by TEXT DEFAULT '[]');

CREATE TABLE IF NOT EXISTS experience_feedbacks (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), user_id TEXT NOT NULL, content TEXT NOT NULL, photos TEXT DEFAULT '[]', is_approved INTEGER DEFAULT 0, likes INTEGER DEFAULT 0, liked_by TEXT DEFAULT '[]', tenant_id TEXT DEFAULT '00000000-0000-0000-0000-000000000001', created_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS student_progress (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), user_id TEXT NOT NULL, day_number INTEGER NOT NULL, completed INTEGER DEFAULT 0, completed_at TEXT, prayer_completed INTEGER DEFAULT 0, courses_reading_completed INTEGER DEFAULT 0, fasting_completed INTEGER DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS study_groups (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), name TEXT NOT NULL, description TEXT, created_by TEXT NOT NULL, is_open INTEGER DEFAULT 1, is_answered INTEGER DEFAULT 0, max_members INTEGER DEFAULT 50, member_count INTEGER DEFAULT 0, requires_approval INTEGER DEFAULT 0, is_closed INTEGER DEFAULT 0, closed_reason TEXT, closed_at TEXT, pending_requests INTEGER DEFAULT 0, tenant_id TEXT DEFAULT '00000000-0000-0000-0000-000000000001', created_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS study_group_members (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), group_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT DEFAULT 'member', joined_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (group_id, user_id));

CREATE TABLE IF NOT EXISTS study_group_join_requests (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), group_id TEXT NOT NULL, user_id TEXT NOT NULL, status TEXT DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT (datetime('now')), reviewed_at TEXT, reviewed_by TEXT);

CREATE TABLE IF NOT EXISTS study_group_messages (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), group_id TEXT NOT NULL, user_id TEXT NOT NULL, content TEXT NOT NULL, is_prayer INTEGER DEFAULT 0, msg_type TEXT DEFAULT 'text', media_url TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE INDEX IF NOT EXISTS idx_sg_messages_group ON study_group_messages(group_id, created_at);

CREATE TABLE IF NOT EXISTS direct_messages (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), sender_id TEXT NOT NULL, receiver_id TEXT NOT NULL, content TEXT NOT NULL, is_read INTEGER DEFAULT 0, msg_type TEXT DEFAULT 'text', media_url TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE INDEX IF NOT EXISTS idx_dm_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_receiver ON direct_messages(receiver_id);

CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS platform_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, description TEXT, updated_at TEXT DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS livestream_comments (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), livestream_id TEXT NOT NULL DEFAULT 'global-live', user_id TEXT NOT NULL, content TEXT NOT NULL, parent_id TEXT, is_pinned INTEGER DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS livestream_reactions (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), livestream_id TEXT NOT NULL DEFAULT 'global-live', user_id TEXT NOT NULL, emoji TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS day_resources (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), day_number INTEGER NOT NULL, resource_type TEXT NOT NULL, title TEXT NOT NULL, description TEXT, url TEXT, content TEXT, sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS day_views (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), user_id TEXT NOT NULL, day_number INTEGER NOT NULL, viewed_at TEXT NOT NULL DEFAULT (datetime('now')), duration_seconds INTEGER DEFAULT 0);

CREATE TABLE IF NOT EXISTS stories (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), user_id TEXT NOT NULL, organization_id TEXT NOT NULL, content TEXT DEFAULT '', image_url TEXT, visibility TEXT DEFAULT 'public', visible_to TEXT DEFAULT '[]', created_at TEXT NOT NULL DEFAULT (datetime('now')), expires_at TEXT, caption TEXT DEFAULT '', likes TEXT DEFAULT '[]', viewed_by TEXT DEFAULT '[]');

CREATE INDEX IF NOT EXISTS idx_stories_org ON stories(organization_id, expires_at);

CREATE TABLE IF NOT EXISTS post_comments (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), post_id TEXT NOT NULL, user_id TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);

CREATE TABLE IF NOT EXISTS story_comments (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), story_id TEXT NOT NULL, user_id TEXT NOT NULL, content TEXT NOT NULL, parent_id TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));

SELECT 'LOT 2 OK - 18 tables' as status
