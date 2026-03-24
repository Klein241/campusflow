# 🔄 Table de correspondance — Maison de Prière → CampusFlow

## Fonctionnalités conservées et renommées

| # | Ancien (Maison de Prière) | Nouveau (CampusFlow) | Statut |
|---|---------------------------|----------------------|--------|
| 1 | Groupes de prière | **Groupes d'étude** (study groups) | ✅ Conservé |
| 2 | Demandes de prière (prayer requests) | **Demandes de tutorat** (tutoring requests) | ✅ Renommé |
| 3 | Prière exaucée | **Problème résolu** / Question répondue | 🔄 À adapter |
| 4 | Lecteur biblique (Bible reader) | **Bibliothèque de cours** (course library) | 🔄 À refondre |
| 5 | Jeux bibliques (quiz, mots mêlés) | **Quiz académiques** (quiz par matière) | 🔄 À adapter |
| 6 | Étude biblique / Devotional | **Contenu pédagogique** (ressources de cours) | 🔄 À adapter |
| 7 | Jeûne / Fasting | **Révisions intensives** / Prépa examens | 🔄 À adapter |
| 8 | Témoignages (experience feedbacks) | **Avis étudiants** / Témoignages campus | ✅ Conservé |
| 9 | Progression spirituelle (day progress) | **Progression académique** (suivi cursus) | 🔄 À adapter |
| 10 | Chat temps réel | **Chat campus** (messages directs + groupes) | ✅ Conservé |
| 11 | Forum communautaire | **Forum étudiant** (par filière) | ✅ Conservé |
| 12 | Marketplace / Boutique | **Marketplace éducative** (B2C/B2B) | ✅ Conservé |
| 13 | Live streaming | **Cours en direct** (live classes) | ✅ Conservé |
| 14 | Notifications push | **Notifications campus** | ✅ Conservé |
| 15 | Appels vidéo/audio (WebRTC) | **Visioconférence** (appels étude) | ✅ Conservé |
| 16 | Salon vocal (Discord-style) | **Salon vocal** (étude collaborative) | ✅ Conservé |
| 17 | Admin dashboard | **Backoffice directeur/secrétaire** | ✅ Conservé |

## Vocabulaire à remplacer dans le code

| Ancien terme | Nouveau terme | Fichiers concernés |
|-------------|---------------|-------------------|
| `prayer` | `tutoring` / `study` | store.ts, notifications.ts, types.ts |
| `prière` | `tutorat` / `étude` | UI strings, labels |
| `bible` | `cours` / `bibliothèque` | courses-view, chat, games |
| `biblique` | `académique` / `pédagogique` | UI strings |
| `spiritual` | `académique` | types.ts, marketplace |
| `fasting` | `revision` / `préparation` | day-detail, store |
| `devotional` | `contenu pédagogique` | curriculum-data |
| `church` / `église` | `établissement` / `institut` | config, UI |
| `croyant` | `étudiant` / `membre` | UI strings |
| `pasteur` | `directeur` / `professeur` | roles, UI |
| `verset` / `verse` | `extrait` / `ressource` | API, chat |
| `Maison de Prière` | `CampusFlow` | branding, layout |
| `CentreFormation Pro` | `CampusFlow` | auth, manifest |
| `prayer_request_id` | `tutoring_request_id` | DB schema, code |
| `is_prayer` | `is_academic` | group messages |
| `prayer_count` | `help_count` | tutoring requests |
| `prayed_by` | `helped_by` | tutoring requests |

## Tables SQL correspondantes

| Ancien nom | Nouveau nom | Notes |
|-----------|-------------|-------|
| `prayer_requests` → `tutoring_requests` | ✅ Déjà fait | Demandes d'aide |
| `prayer_groups` → `study_groups` | ✅ Déjà fait | Groupes d'étude |
| `student_progress` | ✅ Conservé | Progression cursus |
| `experience_feedbacks` | ✅ Conservé | Témoignages campus |
| `study_group_members` | ✅ Conservé | Membres des groupes |
| `study_group_messages` | ✅ Conservé | Messages de groupe |

## Nouvelles tables (spécifiques CampusFlow)

| Table | Description |
|-------|-------------|
| `filieres` | Filières d'études (13 préconfigurées) |
| `promotions` | Promotions par année et filière |
| `enrollments` | Inscriptions étudiants |
| `matieres` | Matières par filière |
| `notes` | Notes et évaluations |
| `timetable` | Emploi du temps |
| `presences` | Suivi des présences |
| `paiements` | Paiements scolarité |
| `organizations` | Établissements (multi-tenant) — à créer |
