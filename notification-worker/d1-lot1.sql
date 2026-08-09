CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, full_name TEXT, avatar_url TEXT, phone TEXT, email TEXT, city TEXT, country TEXT, whatsapp TEXT, bio TEXT, filiere_id TEXT, numero_matricule TEXT, role TEXT DEFAULT 'student', annee_entree INTEGER, statut_etudiant TEXT DEFAULT 'actif', date_naissance TEXT, genre TEXT, is_active INTEGER DEFAULT 1, tenant_id TEXT DEFAULT '00000000-0000-0000-0000-000000000001', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT, organization_id TEXT);

CREATE TABLE IF NOT EXISTS filieres (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), code TEXT NOT NULL UNIQUE, nom TEXT NOT NULL, description TEXT, duree_mois INTEGER DEFAULT 24, frais_scolarite REAL DEFAULT 0, couleur TEXT DEFAULT '#4F46E5', icone TEXT DEFAULT 'book', is_active INTEGER DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT, organization_id TEXT);

CREATE TABLE IF NOT EXISTS promotions (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), filiere_id TEXT NOT NULL, nom TEXT NOT NULL, annee_debut INTEGER NOT NULL, annee_fin INTEGER NOT NULL, effectif_max INTEGER DEFAULT 40, is_active INTEGER DEFAULT 1, tenant_id TEXT DEFAULT '00000000-0000-0000-0000-000000000001', created_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS enrollments (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), student_id TEXT NOT NULL, filiere_id TEXT NOT NULL, promotion_id TEXT, date_inscription TEXT DEFAULT (datetime('now')), statut TEXT DEFAULT 'en_attente', montant_paye REAL DEFAULT 0, notes_admin TEXT, tenant_id TEXT DEFAULT '00000000-0000-0000-0000-000000000001', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);

CREATE TABLE IF NOT EXISTS matieres (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), filiere_id TEXT NOT NULL, code TEXT NOT NULL, nom TEXT NOT NULL, description TEXT, credits INTEGER DEFAULT 3, semestre INTEGER DEFAULT 1, type_matiere TEXT DEFAULT 'cours', teacher_id TEXT, is_active INTEGER DEFAULT 1, tenant_id TEXT DEFAULT '00000000-0000-0000-0000-000000000001', created_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), student_id TEXT NOT NULL, matiere_id TEXT NOT NULL, promotion_id TEXT, type_evaluation TEXT DEFAULT 'devoir', note REAL, coefficient REAL DEFAULT 1.0, periode TEXT, commentaire TEXT, saisi_par TEXT, tenant_id TEXT DEFAULT '00000000-0000-0000-0000-000000000001', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT);

CREATE INDEX IF NOT EXISTS idx_notes_student ON notes(student_id);

CREATE TABLE IF NOT EXISTS timetable (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), filiere_id TEXT NOT NULL, promotion_id TEXT, matiere_id TEXT NOT NULL, teacher_id TEXT, jour_semaine INTEGER, heure_debut TEXT NOT NULL, heure_fin TEXT NOT NULL, salle TEXT, est_recurrent INTEGER DEFAULT 1, date_specifique TEXT, type_seance TEXT DEFAULT 'cours', tenant_id TEXT DEFAULT '00000000-0000-0000-0000-000000000001', created_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS presences (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), student_id TEXT NOT NULL, timetable_id TEXT, matiere_id TEXT, date_seance TEXT NOT NULL, statut TEXT DEFAULT 'present', justification TEXT, tenant_id TEXT DEFAULT '00000000-0000-0000-0000-000000000001', created_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE INDEX IF NOT EXISTS idx_presences_student ON presences(student_id, date_seance);

CREATE TABLE IF NOT EXISTS paiements (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), student_id TEXT NOT NULL, enrollment_id TEXT, montant REAL NOT NULL, devise TEXT DEFAULT 'XAF', type_paiement TEXT DEFAULT 'scolarite', mode_paiement TEXT DEFAULT 'especes', reference TEXT, statut TEXT DEFAULT 'confirme', periode TEXT, recu_par TEXT, notes TEXT, tenant_id TEXT DEFAULT '00000000-0000-0000-0000-000000000001', created_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE INDEX IF NOT EXISTS idx_paiements_student ON paiements(student_id);

CREATE TABLE IF NOT EXISTS forum_threads (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), filiere_id TEXT, matiere_id TEXT, auteur_id TEXT NOT NULL, titre TEXT NOT NULL, contenu TEXT NOT NULL, type_thread TEXT DEFAULT 'question', is_epingle INTEGER DEFAULT 0, is_resolu INTEGER DEFAULT 0, vues INTEGER DEFAULT 0, tenant_id TEXT DEFAULT '00000000-0000-0000-0000-000000000001', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT);

CREATE TABLE IF NOT EXISTS forum_replies (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), thread_id TEXT NOT NULL, auteur_id TEXT NOT NULL, contenu TEXT NOT NULL, is_solution INTEGER DEFAULT 0, tenant_id TEXT DEFAULT '00000000-0000-0000-0000-000000000001', created_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE INDEX IF NOT EXISTS idx_forum_replies_thread ON forum_replies(thread_id);

CREATE TABLE IF NOT EXISTS shop_products (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), nom TEXT NOT NULL, description TEXT, prix REAL NOT NULL DEFAULT 0, devise TEXT DEFAULT 'XAF', image_url TEXT, categorie TEXT DEFAULT 'fourniture', filiere_id TEXT, stock INTEGER DEFAULT 0, is_visible INTEGER DEFAULT 1, created_by TEXT, tenant_id TEXT DEFAULT '00000000-0000-0000-0000-000000000001', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT);

CREATE TABLE IF NOT EXISTS shop_orders (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), student_id TEXT NOT NULL, product_id TEXT NOT NULL, quantite INTEGER DEFAULT 1, montant_total REAL NOT NULL, statut TEXT DEFAULT 'en_attente', mode_paiement TEXT DEFAULT 'especes', notes TEXT, tenant_id TEXT DEFAULT '00000000-0000-0000-0000-000000000001', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT);

SELECT 'LOT 1 OK - 15 tables' as status
