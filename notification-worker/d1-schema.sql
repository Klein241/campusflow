-- ============================================================
-- CampusFlow - D1 SQLite Schema (Cloudflare Failover)
-- Mirror des tables critiques Supabase
-- SQLite : UUID=TEXT, arrays=JSON, TIMESTAMP=TEXT ISO8601
-- ============================================================

-- System alerts
CREATE TABLE IF NOT EXISTS system_alerts (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    service     TEXT NOT NULL,
    event       TEXT NOT NULL,
    table_name  TEXT,
    error_msg   TEXT,
    failover    TEXT,
    resolved_at TEXT
);

-- Pending sync vers Supabase (quand Supabase etait DOWN)
CREATE TABLE IF NOT EXISTS pending_supabase_sync (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    table_name  TEXT NOT NULL,
    operation   TEXT NOT NULL,
    record_id   TEXT NOT NULL,
    payload     TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    last_tried  TEXT,
    synced_at   TEXT
);

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id          TEXT PRIMARY KEY,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    logo_url    TEXT,
    owner_id    TEXT,
    plan        TEXT DEFAULT 'free',
    is_active   INTEGER DEFAULT 1,
    settings    TEXT DEFAULT '{}'
);

-- Student Profiles
CREATE TABLE IF NOT EXISTS student_profiles (
    id              TEXT PRIMARY KEY,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    organization_id TEXT NOT NULL,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    access_code     TEXT,
    pin_code        TEXT,
    pin_set         INTEGER DEFAULT 0,
    classroom_id    TEXT,
    photo_url       TEXT,
    sky_points      INTEGER DEFAULT 0,
    is_active       INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_student_org ON student_profiles(organization_id);

-- Teacher Profiles
CREATE TABLE IF NOT EXISTS teacher_profiles (
    id              TEXT PRIMARY KEY,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    organization_id TEXT NOT NULL,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    access_code     TEXT,
    pin_code        TEXT,
    pin_set         INTEGER DEFAULT 0,
    photo_url       TEXT,
    sky_points      INTEGER DEFAULT 0,
    role            TEXT DEFAULT 'teacher',
    is_active       INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_teacher_org ON teacher_profiles(organization_id);

-- Session Tokens
CREATE TABLE IF NOT EXISTS session_tokens (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    token           TEXT NOT NULL UNIQUE,
    profile_id      TEXT NOT NULL,
    profile_type    TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at      TEXT NOT NULL,
    is_active       INTEGER DEFAULT 1,
    invalidated_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_session_token  ON session_tokens(token);
CREATE INDEX IF NOT EXISTS idx_session_active ON session_tokens(is_active, expires_at);

-- Pin Attempts (rate limiting)
CREATE TABLE IF NOT EXISTS pin_attempts (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    profile_id      TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    attempted_at    TEXT NOT NULL DEFAULT (datetime('now')),
    succeeded       INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pin_profile ON pin_attempts(profile_id, attempted_at);

-- School Posts
CREATE TABLE IF NOT EXISTS school_posts (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT,
    organization_id TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    user_type       TEXT NOT NULL,
    content         TEXT NOT NULL,
    photos          TEXT DEFAULT '[]',
    like_count      INTEGER DEFAULT 0,
    liked_by        TEXT DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_posts_org ON school_posts(organization_id, created_at);

-- Chat Conversations
CREATE TABLE IF NOT EXISTS chat_conversations (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    organization_id TEXT NOT NULL,
    type            TEXT DEFAULT 'direct',
    name            TEXT,
    created_by      TEXT,
    last_message_at TEXT
);

-- Chat Participants
CREATE TABLE IF NOT EXISTS chat_participants (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    conversation_id TEXT NOT NULL,
    profile_id      TEXT NOT NULL,
    profile_type    TEXT NOT NULL,
    joined_at       TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (conversation_id, profile_id)
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    conversation_id TEXT NOT NULL,
    sender_id       TEXT NOT NULL,
    sender_type     TEXT NOT NULL,
    content         TEXT NOT NULL,
    message_type    TEXT DEFAULT 'text',
    file_url        TEXT,
    is_deleted      INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON chat_messages(conversation_id, created_at);
