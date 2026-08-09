-- ============================================================
-- CampusFlow D1 - SCHEMA COMPLET (miroir conforme Supabase)
-- Toutes les tables converties SQLite
-- UUID -> TEXT, BOOLEAN -> INTEGER, TIMESTAMPTZ -> TEXT,
-- JSONB/ARRAY -> TEXT JSON, NUMERIC -> REAL
-- ============================================================

-- ── Classrooms ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classrooms (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    name            TEXT NOT NULL,
    level           TEXT,
    section         TEXT,
    capacity        INTEGER,
    academic_year   TEXT,
    is_active       INTEGER DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_classrooms_org ON classrooms(organization_id);

-- ── Subjects ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    name            TEXT NOT NULL,
    code            TEXT,
    coefficient     REAL DEFAULT 1,
    color           TEXT,
    icon            TEXT,
    classroom_id    TEXT,
    teacher_id      TEXT,
    is_active       INTEGER DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_subjects_org ON subjects(organization_id);

-- ── Disciplines ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disciplines (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    student_id      TEXT NOT NULL,
    type            TEXT NOT NULL,
    description     TEXT,
    date            TEXT,
    severity        TEXT DEFAULT 'minor',
    resolved        INTEGER DEFAULT 0,
    created_by      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_disciplines_org ON disciplines(organization_id);

-- ── Evaluations ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evaluations (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    subject_id      TEXT,
    classroom_id    TEXT,
    title           TEXT NOT NULL,
    type            TEXT DEFAULT 'devoir',
    date            TEXT,
    duration_min    INTEGER,
    max_score       REAL DEFAULT 20,
    coefficient     REAL DEFAULT 1,
    description     TEXT,
    is_published    INTEGER DEFAULT 0,
    created_by      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_evaluations_org ON evaluations(organization_id);

-- ── Grades ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grades (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    evaluation_id   TEXT,
    student_id      TEXT NOT NULL,
    subject_id      TEXT,
    score           REAL,
    max_score       REAL DEFAULT 20,
    coefficient     REAL DEFAULT 1,
    comment         TEXT,
    is_published    INTEGER DEFAULT 0,
    published_at    TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_grades_org     ON grades(organization_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);

-- ── School Payments ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_payments (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    student_id      TEXT NOT NULL,
    amount          REAL NOT NULL,
    currency        TEXT DEFAULT 'XAF',
    payment_type    TEXT DEFAULT 'scolarite',
    status          TEXT DEFAULT 'pending',
    payment_date    TEXT,
    receipt_number  TEXT,
    notes           TEXT,
    created_by      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_org     ON school_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_student ON school_payments(student_id);

-- ── Timetable Slots ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS timetable_slots (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    classroom_id    TEXT,
    subject_id      TEXT,
    teacher_id      TEXT,
    room_id         TEXT,
    day_of_week     INTEGER NOT NULL,
    start_time      TEXT NOT NULL,
    end_time        TEXT NOT NULL,
    week_type       TEXT DEFAULT 'all',
    is_active       INTEGER DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_timetable_org ON timetable_slots(organization_id);

-- ── Attendance ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    student_id      TEXT NOT NULL,
    classroom_id    TEXT,
    subject_id      TEXT,
    date            TEXT NOT NULL,
    status          TEXT DEFAULT 'present',
    justification   TEXT,
    noted_by        TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attendance_org     ON attendance(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id, date);

-- ── Rooms ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    name            TEXT NOT NULL,
    capacity        INTEGER,
    building        TEXT,
    floor           TEXT,
    equipment       TEXT,
    is_active       INTEGER DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Library Items ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS library_items (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    title           TEXT NOT NULL,
    author          TEXT,
    description     TEXT,
    cover_url       TEXT,
    file_url        TEXT,
    category        TEXT DEFAULT 'livre',
    is_free         INTEGER DEFAULT 1,
    price           REAL DEFAULT 0,
    is_published    INTEGER DEFAULT 1,
    view_count      INTEGER DEFAULT 0,
    created_by      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_library_org ON library_items(organization_id);

-- ── Library Favorites ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS library_favorites (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    item_id         TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    organization_id TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (item_id, user_id)
);

-- ── Library Reading History ───────────────────────────────
CREATE TABLE IF NOT EXISTS library_reading_history (
    id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    item_id      TEXT NOT NULL,
    user_id      TEXT NOT NULL,
    last_read_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (item_id, user_id)
);

-- ── Library Ads ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS library_ads (
    id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title         TEXT NOT NULL,
    description   TEXT,
    image_url     TEXT,
    link_url      TEXT,
    is_active     INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    click_count   INTEGER DEFAULT 0,
    view_count    INTEGER DEFAULT 0,
    placement     TEXT DEFAULT 'book_detail',
    start_date    TEXT,
    end_date      TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Marketplace Products ──────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_products (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    price           REAL NOT NULL DEFAULT 0,
    currency        TEXT DEFAULT 'XAF',
    category        TEXT DEFAULT 'fourniture',
    image_url       TEXT,
    stock           INTEGER DEFAULT 0,
    is_available    INTEGER DEFAULT 1,
    created_by      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT
);

-- ── Marketplace Orders ────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_orders (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    product_id      TEXT NOT NULL,
    buyer_id        TEXT NOT NULL,
    quantity        INTEGER DEFAULT 1,
    total_amount    REAL NOT NULL,
    status          TEXT DEFAULT 'pending',
    payment_method  TEXT DEFAULT 'cash',
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Marketplace Favorites ─────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_favorites (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    product_id TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (product_id, user_id)
);

-- ── Teacher Curricula ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_curricula (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    teacher_id      TEXT NOT NULL,
    subject_id      TEXT NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    order_index     INTEGER DEFAULT 0,
    is_completed    INTEGER DEFAULT 0,
    completed_at    TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Subject Programs ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS subject_programs (
    id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    subject_id     TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    chapter_number INTEGER NOT NULL,
    title          TEXT NOT NULL,
    description    TEXT,
    is_completed   INTEGER DEFAULT 0,
    completed_at   TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT
);

-- ── Exercises ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exercises (
    id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id  TEXT NOT NULL,
    chapter_id       TEXT,
    lesson_id        TEXT,
    title            TEXT NOT NULL,
    type             TEXT NOT NULL DEFAULT 'qcm',
    questions        TEXT DEFAULT '[]',
    duration_minutes INTEGER DEFAULT 10,
    max_score        REAL DEFAULT 20,
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Exercise Submissions ──────────────────────────────────
CREATE TABLE IF NOT EXISTS exercise_submissions (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    exercise_id TEXT NOT NULL,
    student_id  TEXT NOT NULL,
    answers     TEXT DEFAULT '{}',
    score       REAL DEFAULT 0,
    completed_at TEXT NOT NULL DEFAULT (datetime('now')),
    graded      INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_submissions_exercise ON exercise_submissions(exercise_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student  ON exercise_submissions(student_id);

-- ── Lesson Progress ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_progress (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    student_id      TEXT NOT NULL,
    lesson_id       TEXT NOT NULL,
    completed       INTEGER DEFAULT 0,
    completed_at    TEXT,
    organization_id TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (student_id, lesson_id)
);

-- ── Grade Disputes ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grade_disputes (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    student_id      TEXT NOT NULL,
    student_name    TEXT,
    subject_id      TEXT,
    exercise_id     TEXT,
    submission_id   TEXT,
    message         TEXT NOT NULL,
    status          TEXT DEFAULT 'pending',
    response        TEXT,
    organization_id TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Sky Transactions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS sky_transactions (
    id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    student_id       TEXT NOT NULL,
    amount           INTEGER NOT NULL,
    transaction_type TEXT,
    description      TEXT,
    reason           TEXT,
    reference_id     TEXT,
    organization_id  TEXT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sky_student ON sky_transactions(student_id);

-- ── Inscription Requests ──────────────────────────────────
CREATE TABLE IF NOT EXISTS inscription_requests (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    birth_date      TEXT,
    gender          TEXT,
    phone           TEXT,
    parent_phone    TEXT,
    email           TEXT,
    address         TEXT,
    filiere_id      TEXT,
    classe_souhaitee TEXT,
    status          TEXT DEFAULT 'pending',
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Push Subscriptions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id         TEXT NOT NULL,
    organization_id TEXT,
    org_slug        TEXT,
    user_role       TEXT,
    endpoint        TEXT NOT NULL UNIQUE,
    p256dh          TEXT NOT NULL,
    auth            TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT
);

-- ── Push Tokens ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_tokens (
    id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id           TEXT NOT NULL,
    organization_id   TEXT,
    org_slug          TEXT,
    user_role         TEXT DEFAULT 'student',
    endpoint          TEXT NOT NULL UNIQUE,
    p256dh            TEXT NOT NULL,
    auth              TEXT NOT NULL,
    subscription_json TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT
);

-- ── Notifications ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id    TEXT NOT NULL,
    title      TEXT NOT NULL,
    message    TEXT NOT NULL,
    type       TEXT DEFAULT 'info',
    is_read    INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- ── Notification Preferences ──────────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
    id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id      TEXT NOT NULL,
    action_type  TEXT NOT NULL,
    in_app       INTEGER DEFAULT 1,
    push_enabled INTEGER DEFAULT 1,
    email        INTEGER DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT,
    UNIQUE (user_id, action_type)
);

-- ── Lesson Reader Notes ───────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_reader_notes (
    id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    lesson_id      TEXT NOT NULL,
    user_id        TEXT NOT NULL,
    org_id         TEXT,
    content        TEXT NOT NULL,
    highlight_text TEXT,
    color          TEXT DEFAULT 'yellow',
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
