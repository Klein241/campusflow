-- ============================================================
-- CampusFlow D1 — TABLES RESTANTES (miroir complet Supabase)
-- PostgreSQL → SQLite : UUID→TEXT, BOOL→INTEGER, TIMESTAMPTZ→TEXT
--                       JSONB→TEXT, ARRAY→TEXT, NUMERIC→REAL
-- ============================================================

-- ── Profiles ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
    id                TEXT PRIMARY KEY,
    full_name         TEXT,
    avatar_url        TEXT,
    phone             TEXT,
    email             TEXT,
    city              TEXT,
    country           TEXT,
    whatsapp          TEXT,
    bio               TEXT,
    filiere_id        TEXT,
    numero_matricule  TEXT,
    role              TEXT DEFAULT 'student',
    annee_entree      INTEGER,
    statut_etudiant   TEXT DEFAULT 'actif',
    date_naissance    TEXT,
    genre             TEXT,
    is_active         INTEGER DEFAULT 1,
    tenant_id         TEXT DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT,
    organization_id   TEXT
);

-- ── Filieres ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS filieres (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    code            TEXT NOT NULL UNIQUE,
    nom             TEXT NOT NULL,
    description     TEXT,
    duree_mois      INTEGER DEFAULT 24,
    frais_scolarite REAL DEFAULT 0,
    couleur         TEXT DEFAULT '#4F46E5',
    icone           TEXT DEFAULT 'book',
    is_active       INTEGER DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT,
    organization_id TEXT
);

-- ── Promotions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotions (
    id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    filiere_id   TEXT NOT NULL,
    nom          TEXT NOT NULL,
    annee_debut  INTEGER NOT NULL,
    annee_fin    INTEGER NOT NULL,
    effectif_max INTEGER DEFAULT 40,
    is_active    INTEGER DEFAULT 1,
    tenant_id    TEXT DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Enrollments ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollments (
    id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    student_id       TEXT NOT NULL,
    filiere_id       TEXT NOT NULL,
    promotion_id     TEXT,
    date_inscription TEXT DEFAULT (datetime('now')),
    statut           TEXT DEFAULT 'en_attente',
    montant_paye     REAL DEFAULT 0,
    notes_admin      TEXT,
    tenant_id        TEXT DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT
);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);

-- ── Matieres ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matieres (
    id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    filiere_id   TEXT NOT NULL,
    code         TEXT NOT NULL,
    nom          TEXT NOT NULL,
    description  TEXT,
    credits      INTEGER DEFAULT 3,
    semestre     INTEGER DEFAULT 1,
    type_matiere TEXT DEFAULT 'cours',
    teacher_id   TEXT,
    is_active    INTEGER DEFAULT 1,
    tenant_id    TEXT DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Notes (university) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
    id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    student_id       TEXT NOT NULL,
    matiere_id       TEXT NOT NULL,
    promotion_id     TEXT,
    type_evaluation  TEXT DEFAULT 'devoir',
    note             REAL,
    coefficient      REAL DEFAULT 1.0,
    periode          TEXT,
    commentaire      TEXT,
    saisi_par        TEXT,
    tenant_id        TEXT DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT
);
CREATE INDEX IF NOT EXISTS idx_notes_student ON notes(student_id);

-- ── Timetable (university) ────────────────────────────────
CREATE TABLE IF NOT EXISTS timetable (
    id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    filiere_id     TEXT NOT NULL,
    promotion_id   TEXT,
    matiere_id     TEXT NOT NULL,
    teacher_id     TEXT,
    jour_semaine   INTEGER,
    heure_debut    TEXT NOT NULL,
    heure_fin      TEXT NOT NULL,
    salle          TEXT,
    est_recurrent  INTEGER DEFAULT 1,
    date_specifique TEXT,
    type_seance    TEXT DEFAULT 'cours',
    tenant_id      TEXT DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Presences (university) ────────────────────────────────
CREATE TABLE IF NOT EXISTS presences (
    id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    student_id   TEXT NOT NULL,
    timetable_id TEXT,
    matiere_id   TEXT,
    date_seance  TEXT NOT NULL,
    statut       TEXT DEFAULT 'present',
    justification TEXT,
    tenant_id    TEXT DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_presences_student ON presences(student_id, date_seance);

-- ── Paiements (university) ────────────────────────────────
CREATE TABLE IF NOT EXISTS paiements (
    id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    student_id     TEXT NOT NULL,
    enrollment_id  TEXT,
    montant        REAL NOT NULL,
    devise         TEXT DEFAULT 'XAF',
    type_paiement  TEXT DEFAULT 'scolarite',
    mode_paiement  TEXT DEFAULT 'especes',
    reference      TEXT,
    statut         TEXT DEFAULT 'confirme',
    periode        TEXT,
    recu_par       TEXT,
    notes          TEXT,
    tenant_id      TEXT DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_paiements_student ON paiements(student_id);

-- ── Forum Threads ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_threads (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    filiere_id  TEXT,
    matiere_id  TEXT,
    auteur_id   TEXT NOT NULL,
    titre       TEXT NOT NULL,
    contenu     TEXT NOT NULL,
    type_thread TEXT DEFAULT 'question',
    is_epingle  INTEGER DEFAULT 0,
    is_resolu   INTEGER DEFAULT 0,
    vues        INTEGER DEFAULT 0,
    tenant_id   TEXT DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT
);

-- ── Forum Replies ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_replies (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    thread_id  TEXT NOT NULL,
    auteur_id  TEXT NOT NULL,
    contenu    TEXT NOT NULL,
    is_solution INTEGER DEFAULT 0,
    tenant_id  TEXT DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_forum_replies_thread ON forum_replies(thread_id);

-- ── Shop Products ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_products (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    nom         TEXT NOT NULL,
    description TEXT,
    prix        REAL NOT NULL DEFAULT 0,
    devise      TEXT DEFAULT 'XAF',
    image_url   TEXT,
    categorie   TEXT DEFAULT 'fourniture',
    filiere_id  TEXT,
    stock       INTEGER DEFAULT 0,
    is_visible  INTEGER DEFAULT 1,
    created_by  TEXT,
    tenant_id   TEXT DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT
);

-- ── Shop Orders ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_orders (
    id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    student_id    TEXT NOT NULL,
    product_id    TEXT NOT NULL,
    quantite      INTEGER DEFAULT 1,
    montant_total REAL NOT NULL,
    statut        TEXT DEFAULT 'en_attente',
    mode_paiement TEXT DEFAULT 'especes',
    notes         TEXT,
    tenant_id     TEXT DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT
);

-- ── Tutoring Requests ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS tutoring_requests (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id         TEXT NOT NULL,
    content         TEXT NOT NULL,
    category        TEXT DEFAULT 'other',
    is_anonymous    INTEGER DEFAULT 0,
    photos          TEXT DEFAULT '[]',
    is_answered     INTEGER DEFAULT 0,
    answered_at     TEXT,
    prayer_count    INTEGER DEFAULT 0,
    prayed_by       TEXT DEFAULT '[]',
    tenant_id       TEXT DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    image_url       TEXT,
    edited_at       TEXT,
    organization_id TEXT,
    viewed_by       TEXT DEFAULT '[]'
);

-- ── Experience Feedbacks ──────────────────────────────────
CREATE TABLE IF NOT EXISTS experience_feedbacks (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id    TEXT NOT NULL,
    content    TEXT NOT NULL,
    photos     TEXT DEFAULT '[]',
    is_approved INTEGER DEFAULT 0,
    likes      INTEGER DEFAULT 0,
    liked_by   TEXT DEFAULT '[]',
    tenant_id  TEXT DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Student Progress ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_progress (
    id                         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id                    TEXT NOT NULL,
    day_number                 INTEGER NOT NULL,
    completed                  INTEGER DEFAULT 0,
    completed_at               TEXT,
    prayer_completed           INTEGER DEFAULT 0,
    courses_reading_completed  INTEGER DEFAULT 0,
    fasting_completed          INTEGER DEFAULT 0,
    created_at                 TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Study Groups ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_groups (
    id                 TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name               TEXT NOT NULL,
    description        TEXT,
    created_by         TEXT NOT NULL,
    is_open            INTEGER DEFAULT 1,
    is_answered        INTEGER DEFAULT 0,
    max_members        INTEGER DEFAULT 50,
    member_count       INTEGER DEFAULT 0,
    requires_approval  INTEGER DEFAULT 0,
    is_closed          INTEGER DEFAULT 0,
    closed_reason      TEXT,
    closed_at          TEXT,
    pending_requests   INTEGER DEFAULT 0,
    tenant_id          TEXT DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Study Group Members ───────────────────────────────────
CREATE TABLE IF NOT EXISTS study_group_members (
    id        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    group_id  TEXT NOT NULL,
    user_id   TEXT NOT NULL,
    role      TEXT DEFAULT 'member',
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (group_id, user_id)
);

-- ── Study Group Join Requests ─────────────────────────────
CREATE TABLE IF NOT EXISTS study_group_join_requests (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    group_id    TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    status      TEXT DEFAULT 'pending',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_at TEXT,
    reviewed_by TEXT
);

-- ── Study Group Messages ──────────────────────────────────
CREATE TABLE IF NOT EXISTS study_group_messages (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    group_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    content    TEXT NOT NULL,
    is_prayer  INTEGER DEFAULT 0,
    msg_type   TEXT DEFAULT 'text',
    media_url  TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sg_messages_group ON study_group_messages(group_id, created_at);

-- ── Direct Messages ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS direct_messages (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    sender_id   TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    content     TEXT NOT NULL,
    is_read     INTEGER DEFAULT 0,
    msg_type    TEXT DEFAULT 'text',
    media_url   TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_dm_sender   ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_receiver ON direct_messages(receiver_id);

-- ── App Settings ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ── Platform Settings ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    description TEXT,
    updated_at  TEXT DEFAULT (datetime('now'))
);

-- ── Livestream Comments ───────────────────────────────────
CREATE TABLE IF NOT EXISTS livestream_comments (
    id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    livestream_id  TEXT NOT NULL DEFAULT 'global-live',
    user_id        TEXT NOT NULL,
    content        TEXT NOT NULL,
    parent_id      TEXT,
    is_pinned      INTEGER DEFAULT 0,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Livestream Reactions ──────────────────────────────────
CREATE TABLE IF NOT EXISTS livestream_reactions (
    id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    livestream_id TEXT NOT NULL DEFAULT 'global-live',
    user_id       TEXT NOT NULL,
    emoji         TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Day Resources ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS day_resources (
    id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    day_number    INTEGER NOT NULL,
    resource_type TEXT NOT NULL,
    title         TEXT NOT NULL,
    description   TEXT,
    url           TEXT,
    content       TEXT,
    sort_order    INTEGER DEFAULT 0,
    is_active     INTEGER DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Day Views ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS day_views (
    id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id          TEXT NOT NULL,
    day_number       INTEGER NOT NULL,
    viewed_at        TEXT NOT NULL DEFAULT (datetime('now')),
    duration_seconds INTEGER DEFAULT 0
);

-- ── Stories ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stories (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id         TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    content         TEXT DEFAULT '',
    image_url       TEXT,
    visibility      TEXT DEFAULT 'public',
    visible_to      TEXT DEFAULT '[]',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at      TEXT,
    caption         TEXT DEFAULT '',
    likes           TEXT DEFAULT '[]',
    viewed_by       TEXT DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_stories_org ON stories(organization_id, expires_at);

-- ── Post Comments ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_comments (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    post_id    TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);

-- ── Story Comments ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS story_comments (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    story_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    content    TEXT NOT NULL,
    parent_id  TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Chapters ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chapters (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    subject_id      TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    teacher_id      TEXT,
    title           TEXT NOT NULL,
    description     TEXT DEFAULT '',
    position        INTEGER NOT NULL DEFAULT 1,
    status          TEXT NOT NULL DEFAULT 'draft',
    coefficient     REAL,
    resources       TEXT DEFAULT '[]',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT,
    content         TEXT DEFAULT '',
    video_url       TEXT
);
CREATE INDEX IF NOT EXISTS idx_chapters_subject ON chapters(subject_id);

-- ── Lessons ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lessons (
    id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    chapter_id        TEXT,
    organization_id   TEXT,
    title             TEXT NOT NULL,
    description       TEXT DEFAULT '',
    content           TEXT DEFAULT '',
    resources         TEXT DEFAULT '[]',
    position          INTEGER DEFAULT 1,
    status            TEXT DEFAULT 'draft',
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    estimated_minutes INTEGER DEFAULT 15,
    video_url         TEXT
);
CREATE INDEX IF NOT EXISTS idx_lessons_chapter ON lessons(chapter_id);

-- ── Sky Points ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sky_points (
    id                 TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id            TEXT NOT NULL UNIQUE,
    organization_id    TEXT,
    balance            INTEGER NOT NULL DEFAULT 0,
    last_daily_claim   TEXT,
    created_at         TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT,
    free_messages_used INTEGER DEFAULT 0
);

-- ── Sky Points History ────────────────────────────────────
CREATE TABLE IF NOT EXISTS sky_points_history (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id         TEXT NOT NULL,
    organization_id TEXT,
    delta           INTEGER NOT NULL,
    type            TEXT NOT NULL DEFAULT 'manual',
    description     TEXT,
    reference_id    TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sky_history_user ON sky_points_history(user_id);

-- ── Sky Point Packs ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS sky_point_packs (
    id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name         TEXT NOT NULL,
    points       INTEGER NOT NULL,
    price_cents  INTEGER NOT NULL,
    currency     TEXT NOT NULL DEFAULT 'EUR',
    stripe_link  TEXT,
    paypal_link  TEXT,
    is_active    INTEGER DEFAULT 1,
    sort_order   INTEGER DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Sky Point Requests ────────────────────────────────────
CREATE TABLE IF NOT EXISTS sky_point_requests (
    id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id          TEXT NOT NULL,
    user_name        TEXT NOT NULL,
    org_id           TEXT,
    org_slug         TEXT,
    pack_id          TEXT,
    pack_name        TEXT,
    points_requested INTEGER,
    amount           REAL,
    currency         TEXT DEFAULT 'EUR',
    message          TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'pending',
    response         TEXT,
    responded_at     TEXT,
    points_credited  INTEGER,
    credited_at      TEXT,
    credited_by      TEXT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Platform Admins ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_admins (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id    TEXT UNIQUE,
    email      TEXT NOT NULL,
    name       TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login TEXT
);

-- ── Forms ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forms (
    id                          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id             TEXT NOT NULL,
    created_by_role             TEXT NOT NULL DEFAULT 'teacher',
    created_by_id               TEXT NOT NULL,
    title                       TEXT NOT NULL,
    description                 TEXT,
    slug                        TEXT NOT NULL UNIQUE,
    form_type                   TEXT NOT NULL DEFAULT 'survey',
    is_published                INTEGER NOT NULL DEFAULT 0,
    accepts_responses           INTEGER NOT NULL DEFAULT 1,
    show_results_to_respondents INTEGER NOT NULL DEFAULT 0,
    created_at                  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at                  TEXT
);

-- ── Form Fields ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS form_fields (
    id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    form_id        TEXT NOT NULL,
    field_type     TEXT NOT NULL,
    label          TEXT NOT NULL,
    description    TEXT,
    options        TEXT,
    required       INTEGER NOT NULL DEFAULT 0,
    sort_order     INTEGER NOT NULL DEFAULT 0,
    correct_answer TEXT,
    points         INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Form Responses ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS form_responses (
    id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    form_id          TEXT NOT NULL,
    respondent_name  TEXT,
    respondent_email TEXT,
    total_score      INTEGER DEFAULT 0,
    submitted_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Form Answers ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS form_answers (
    id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    response_id  TEXT NOT NULL,
    field_id     TEXT NOT NULL,
    answer_value TEXT
);

-- ── Exam Papers ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_papers (
    id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    org_id           TEXT NOT NULL,
    created_by       TEXT NOT NULL,
    title            TEXT NOT NULL,
    subject          TEXT,
    coefficient      REAL DEFAULT 1.0,
    duration_minutes INTEGER DEFAULT 60,
    instructions     TEXT,
    questions        TEXT DEFAULT '[]',
    status           TEXT DEFAULT 'draft',
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT,
    pdf_url          TEXT,
    pdf_annotations  TEXT DEFAULT '[]',
    exam_mode        TEXT DEFAULT 'structured'
);

-- ── Exam Sessions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_sessions (
    id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    exam_paper_id  TEXT,
    org_id         TEXT NOT NULL,
    launched_by    TEXT NOT NULL,
    supervisor_id  TEXT,
    participant_ids TEXT DEFAULT '[]',
    status         TEXT DEFAULT 'waiting',
    started_at     TEXT,
    ended_at       TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Exam Participants ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_participants (
    id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    session_id     TEXT,
    student_id     TEXT NOT NULL,
    joined_at      TEXT NOT NULL DEFAULT (datetime('now')),
    left_at        TEXT,
    status         TEXT DEFAULT 'waiting',
    answers        TEXT DEFAULT '{}',
    manual_grades  TEXT DEFAULT '{}',
    submitted_at   TEXT,
    score          REAL,
    feedback       TEXT,
    graded_at      TEXT
);

-- ── Exam Permission Requests ──────────────────────────────
CREATE TABLE IF NOT EXISTS exam_permission_requests (
    id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    session_id          TEXT,
    student_id          TEXT NOT NULL,
    student_name        TEXT,
    reason              TEXT,
    requested_at        TEXT NOT NULL DEFAULT (datetime('now')),
    granted_by          TEXT,
    granted_at          TEXT,
    extra_time_minutes  INTEGER DEFAULT 0,
    status              TEXT DEFAULT 'pending'
);

-- ── Admin Notifications ───────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_notifications (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT,
    title           TEXT NOT NULL,
    message         TEXT NOT NULL DEFAULT '',
    icon            TEXT,
    created_by      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Message Reactions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_reactions (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    message_id TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    emoji      TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_msg_reactions ON message_reactions(message_id);

-- ── Message Threads ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_threads (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    parent_msg_id   TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    sender_id       TEXT NOT NULL,
    content         TEXT NOT NULL DEFAULT '',
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Lesson Video Views ────────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_video_views (
    id                     TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id                TEXT NOT NULL,
    content_type           TEXT NOT NULL,
    content_id             TEXT NOT NULL,
    organization_id        TEXT NOT NULL,
    opened_at              TEXT DEFAULT (datetime('now')),
    duration_seconds       INTEGER DEFAULT 0,
    last_position_seconds  INTEGER DEFAULT 0,
    completed              INTEGER DEFAULT 0,
    updated_at             TEXT
);
CREATE INDEX IF NOT EXISTS idx_video_views_user ON lesson_video_views(user_id, content_id);

-- ── Advertisements ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS advertisements (
    id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title             TEXT NOT NULL,
    description       TEXT,
    media_url         TEXT,
    media_type        TEXT DEFAULT 'image',
    link_url          TEXT,
    target_orgs       TEXT DEFAULT '[]',
    sky_points_reward INTEGER DEFAULT 1,
    min_watch_seconds INTEGER DEFAULT 5,
    is_active         INTEGER DEFAULT 1,
    starts_at         TEXT DEFAULT (datetime('now')),
    ends_at           TEXT,
    created_by        TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    total_views       INTEGER DEFAULT 0,
    total_clicks      INTEGER DEFAULT 0
);

-- ── Ad Views ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_views (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    ad_id           TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    watched_seconds INTEGER DEFAULT 0,
    completed       INTEGER DEFAULT 0,
    points_awarded  INTEGER DEFAULT 0,
    clicked         INTEGER DEFAULT 0,
    viewed_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ad_views_ad ON ad_views(ad_id);

-- ── Organization Announcements ────────────────────────────
CREATE TABLE IF NOT EXISTS organization_announcements (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    sent_at         TEXT DEFAULT (datetime('now')),
    created_by      TEXT DEFAULT 'superadmin'
);

-- ── Cursus Push Log ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS cursus_push_log (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    action_type TEXT NOT NULL,
    target_id   TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    sent_at     TEXT DEFAULT (datetime('now'))
);

-- ── WhatsApp Queue ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_queue (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT,
    recipient_phone TEXT NOT NULL,
    recipient_name  TEXT,
    message_type    TEXT DEFAULT 'general',
    message         TEXT NOT NULL,
    status          TEXT DEFAULT 'en_attente',
    attempts        INTEGER DEFAULT 0,
    error_log       TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    sent_at         TEXT
);

-- ── Notification Queue ────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_queue (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id         TEXT NOT NULL,
    organization_id TEXT,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL DEFAULT '',
    data            TEXT DEFAULT '{}',
    sent            INTEGER DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notif_queue_user ON notification_queue(user_id, sent);
