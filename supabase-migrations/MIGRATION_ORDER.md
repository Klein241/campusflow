# 📋 Ordre d'Application des Migrations — CampusFlow

> **IMPORTANT :** Ces migrations sont appliquées **manuellement** dans l'éditeur SQL
> de Supabase (dashboard.supabase.com → SQL Editor). Elles ne sont pas gérées par
> `supabase db push` car les fichiers ne sont pas préfixés par timestamp.

---

## Architecture des dossiers

```
school app/
├── supabase-migrations/          ← Schéma principal (002 → 028)
│   ├── _archive/                 ← Vestiges archivés (jamais appliqués en prod)
│   └── [fichiers thématiques]    ← Extensions du schéma principal
└── supabase/
    └── migrations/               ← Patches correctifs (appliqués après)
```

---

## Ordre d'application réel

### Phase 1 — Schéma principal (`supabase-migrations/`)

| # | Fichier | Tables créées / modifiées |
|---|---|---|
| 1 | `002_organizations.sql` | organizations, classrooms, subjects, teacher_profiles, student_profiles, timetable_slots, evaluations, grades, attendance, disciplines, school_payments |
| 2 | `003_library_shop_chat.sql` | library_items, library_favorites, library_reading_history, marketplace_products (org-scoped), chat_conversations, chat_messages, chat_participants |
| 3 | `004_grades.sql` | Colonnes supplémentaires grades |
| 4 | `005_custom_domains.sql` | organizations: custom_domain, domain_verified |
| 5 | `006_fix_auth_marketplace.sql` | Fix FK marketplace |
| 6 | `007_fix_student_columns.sql` | Fix FK teacher_id, RLS INSERT WITH CHECK, colonnes student (pin_set, access_code, sex, birth_date...) |
| 7 | `008_cursus_enrichment.sql` | chapters, lessons, exercises, lesson_progress, exercise_submissions |
| 8 | `009_fix_storage_rls.sql` | RLS storage |
| 9 | `010_fix_chat_auth.sql` | Fix chat localStorage auth |
| 10 | `011_secure_chat_rls.sql` | RLS chat sécurisée |
| 11 | `012_rooms_and_rpc_grants.sql` | rooms, grants RPC |
| 12 | `013_school_posts_and_fixes.sql` | Posts école |
| 13 | `014_school_posts_cursus.sql` | Extension posts cursus |
| 14 | `015_bulletin_templates.sql` | Templates bulletins |
| 15 | `016_push_school_notifications.sql` | Notifications push |
| 16 | `017_notifications_system.sql` | Système notifications v1 |
| 17 | `018_fix_voice_stories_exercises.sql` | Fix exercices audio |
| 18 | `019_cursus_progress_disputes.sql` | Litiges progression |
| 19 | `020_fix_chapters_lessons_org_id.sql` | **chapters + lessons : ajout organization_id** (rétro-fill) |
| 20 | `021_fix_teacher_id_nullable.sql` | teacher_id nullable |
| 21 | `022_fix_exercise_submissions_columns.sql` | graded, teacher_comment |
| 22 | `023_fix_sky_point_requests_fk.sql` | FK sky points |
| 23 | `024_inscription_requests.sql` | Demandes d'inscription |
| 24 | `025_fix_actus_sky_points.sql` | Fix actus + sky points |
| 25 | `026_lesson_reader_push.sql` | Lecteur leçon + push |
| 26 | `027_fix_notifications_worker_columns.sql` | Colonnes worker |
| 27 | `028_final_notifications_fix.sql` | ✅ Notifications finales, push_tokens, push_subscriptions, notification_preferences |
| ... | ... | ... |
| 60 | `060_african_languages_support.sql` | Support 20+ langues africaines et multilinguisme |
| 61 | `061_landing_customization_and_gallery_enhancements.sql` | Templates landing page & galerie |
| 62 | `062_forms_system_and_rls.sql` | Sondages et formulaires publics |
| 63 | `063_dame_sky_config_and_moderation.sql` | Configuration globale, tempérament & alertes sécurité / anti-fraude de Dame SKY |
| 64 | `064_dame_sky_projects_skills_quiz.sql` | Projets/dossiers thématiques, historique, Skills IA SuperAdmin & Quiz révision Sky Points |
| 65 | `065_marketing_crm_and_sky_agent_key_fixes.sql` | Campagnes Marketing, CRM Prospects & Fix Clé IA Agent |
| 66 | `066_chat_external_agent_config.sql` | Agents IA externes connectés au chat & MCP |
| 67 | `067_mcp_library_schedule_and_sky_toggle.sql` | MCP sync planning & bascule Dame Sky |
| 68 | `068_autonomous_event_webhooks_and_security_fix.sql` | Webhooks triggers autonomes & sécurité |
| 69 | `069_payment_system.sql` | Tranches de paiement et gestion scolarité |
| 70 | `070_mcp_security_critical_fix.sql` | Sécurité critique MCP & permissions |
| 71 | `071_fix_verify_ai_agent_key_sql_syntax.sql` | Correction syntaxe verify_ai_agent_key |
| 72 | `072_fix_sky_transactions_columns_and_review_bonus.sql` | Fix colonnes transactions Sky Points & bonus review |
| 73 | `073_pro_training_center_schema.sql` | 🏢 Schéma complet Centres de Formation Pro & Formateurs Indépendants (sessions, durées, rythmes, jalons, attestations pro) |
| 74 | `074_fix_superadmin_credit_sky_points.sql` | Fonction RPC superadmin_credit_org_sky_points pour créditer les Sky Points sans blocage RLS |

### Phase 2 — Fichiers thématiques (`supabase-migrations/`, non numérotés)

| Fichier | Contenu |
|---|---|
| `notification_v2.sql` | Colonnes agrégation + push_tokens v1 (précurseur de 028) |
| `library_ads.sql` | Publicités bibliothèque |
| `upgrade_ads_placement.sql` | Amélioration placement pubs |
| `push_subscriptions.sql` | Abonnements push |
| `add_missing_columns.sql` | Colonnes diverses |
| `fix_library_ads.sql` | Fix ads |
| `fix_notifications.sql` | Fix notifications |
| `fix_presence_rls.sql` | RLS présences |
| `fix_push_tokens.sql` | Fix push tokens |

### Phase 3 — Patches correctifs (`supabase/migrations/`)

| Fichier | Contenu |
|---|---|
| `20240413_forms.sql` | forms, form_fields, form_responses, form_answers |
| `add_landing_columns.sql` | Landing page sur organizations |
| `create_storage_buckets.sql` | Buckets storage |
| `sky_points.sql` | Colonnes sky_points sur student_profiles + teacher_profiles |
| `sky_points_spend.sql` | Table dépenses sky points |
| `sky_requests.sql` | Table sky_point_requests v1 |
| `fix_sky_requests_rls.sql` | Table sky_point_requests finale + RLS + RPC |
| `fix_rls_sky_defaults.sql` | Defaults sky_points |
| `fix_spend_sky_point.sql` | RPC spend_sky_point |
| `superadmin.sql` | platform_admins + RPCs superadmin v1 |
| `superadmin_fix.sql` | RPCs superadmin v2 |
| `superadmin_search_users.sql` | RPC recherche users |
| `fix_cursus_rls.sql` | RLS ouvertes subjects/chapters/lessons (localStorage auth) |
| `fix_forms_rls.sql` | RLS ouvertes forms |
| `fix_lesson_notes_rls.sql` | lesson_reader_notes + RLS ouvertes |
| `fix_shop_rls.sql` | RLS ouvertes shop_products + shop_orders v1 |
| `fix_shop_orders_rls.sql` | RLS ouvertes shop + orders v2 |
| `fix_shop_products_fk.sql` | Suppression FK shop |
| `fix_tutoring_requests_org.sql` | Fix org tutoring |
| `push_notifications.sql` | Push notifications (supplanté par 028) |
| `whatsapp_queue.sql` | whatsapp_queue + RPC queue_whatsapp_message |
| `fix_rpc_and_schema.sql` | Correctifs RPC divers |

### Phase 4 — Corrections de sécurité (`supabase/migrations/`)

| Fichier | Contenu |
|---|---|
| `security_fixes_2026_07_27.sql` | ✅ **À exécuter** — Fix superadmin_get_sky_requests (anon) + whatsapp_queue (FOR ALL) |

---

## Tables actives en production

```
organizations            classrooms               subjects
teacher_profiles         student_profiles         timetable_slots
evaluations              grades                   attendance
disciplines              school_payments          chapters
lessons                  exercises                lesson_progress
exercise_submissions     library_items            library_favorites
shop_products            shop_orders              chat_conversations
chat_messages            chat_participants        forms
form_fields              form_responses           form_answers
notifications            push_tokens              push_subscriptions
notification_preferences platform_admins          sky_point_requests
whatsapp_queue           lesson_reader_notes      rooms
```

## Tables archivées (jamais créées en prod — voir `_archive/`)

```
marketplace_sellers        ← Maison de Prière
marketplace_reviews        ← Maison de Prière
prayer_group_messages      ← Maison de Prière
prayer_group_comments      ← Maison de Prière
library_books              ← Maison de Prière (référence invalide)
library_ratings            ← Maison de Prière (dépend de library_books)
library_downloads          ← Maison de Prière (dépend de library_books)
```

---

## Notes importantes

- **tenant_id dans shop_products** : la colonne s'appelle `tenant_id` mais contient `organization_id`. Ne pas renommer sans migration de données.
- **Middleware src/middleware.ts** : inactif (SPA statique). Le routage est dans `netlify/edge-functions/domain-router.ts`.
- **RLS** : la majorité des tables content (`subjects`, `lessons`, `forms`, `shop_*`) ont des policies `USING (true)` car les teachers/students utilisent un système de session localStorage (pas Supabase Auth). C'est intentionnel mais à sécuriser à long terme via des RPCs SECURITY DEFINER.
