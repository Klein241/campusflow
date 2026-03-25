# 🔄 CampusFlow — Mapping Legacy et Architecture

> **Dernière MAJ :** 25 mars 2026
> Ce document trace la correspondance entre l'ancien projet "Maison de Prière" et CampusFlow SaaS.

---

## 🏗️ Architecture multi-tenant

```
┌─────────────────────────────────────────────────────────┐
│                    CAMPUSFLOW SaaS                       │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ École A  │  │ École B  │  │ École C  │  ...          │
│  │ /ecole-a │  │ /ecole-b │  │ /ecole-c │              │
│  ├──────────┤  ├──────────┤  ├──────────┤              │
│  │ Classes  │  │ Classes  │  │ Classes  │              │
│  │ Matières │  │ Matières │  │ Matières │              │
│  │ Profs    │  │ Profs    │  │ Profs    │              │
│  │ Étudiants│  │ Étudiants│  │ Étudiants│              │
│  │ Notes    │  │ Notes    │  │ Notes    │              │
│  │ EDT      │  │ EDT      │  │ EDT      │              │
│  │ Paiements│  │ Paiements│  │ Paiements│              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                         │
│  Isolation RLS par organization_id                      │
│  Authentification Supabase Auth                         │
│  Storage : organization-assets bucket                   │
└─────────────────────────────────────────────────────────┘
```

---

## Tables SQL — Évolution complète

### Tables CampusFlow (nouvelles, organization-scoped)

| Table | Description | Clé d'isolation |
|-------|-------------|-----------------|
| `organizations` | Établissements (nom, slug, type, owner_id) | `id` (racine) |
| `classrooms` | Classes/filières | `organization_id` |
| `subjects` | Matières (+coefficient) | `organization_id` |
| `teacher_profiles` | Profils profs | `organization_id` |
| `student_profiles` | Profils étudiants (+matricule auto) | `organization_id` |
| `timetable_slots` | Emploi du temps | `organization_id` |
| `evaluations` | Évaluations (devoir, examen, TP...) | `organization_id` |
| `grades` | Notes par évaluation/étudiant | via `evaluation_id` |
| `attendance` | Présences | `organization_id` |
| `disciplines` | Sanctions disciplinaires | `organization_id` |
| `school_payments` | Paiements scolarité (XAF, MoMo...) | `organization_id` |

### Tables legacy conservées (compatibilité)

| Table | Usage ancien | Usage actuel | Action |
|-------|-------------|--------------|--------|
| `profiles` | Profils tous utilisateurs | Toujours utilisé par le store | 🔶 Conserver |
| `filieres` | 13 filières préconfigurées | Plus utilisé directement | 🔶 Conserver (référence) |
| `promotions` | Promotions par année | Plus utilisé | ⚠️ Déprécié |
| `enrollments` | Inscriptions ancien système | Plus utilisé | ⚠️ Déprécié |
| `matieres` | Matières ancien système | Remplacé par `subjects` | ⚠️ Déprécié |
| `notes` | Notes ancien système | Remplacé par `grades` | ⚠️ Déprécié |
| `timetable` | EDT ancien | Remplacé par `timetable_slots` | ⚠️ Déprécié |
| `presences` | Présences ancien | Remplacé par `attendance` | ⚠️ Déprécié |
| `paiements` | Paiements ancien | Remplacé par `school_payments` | ⚠️ Déprécié |

### Tables legacy à supprimer (post-migration)

| Table | Contenu | Raison |
|-------|---------|--------|
| `tutoring_requests` | Demandes de prière | Religieux → hors scope |
| `experience_feedbacks` | Témoignages spirituels | Hors scope |
| `student_progress` | Programme 40 jours spirituel | Hors scope |
| `study_groups` / `_members` / `_messages` / `_join_requests` | Groupes de prière | Hors scope |
| `forum_threads` / `forum_replies` | Forum avec contenu religieux | 🔶 À réécrire si besoin |
| `shop_products` / `shop_orders` | Boutique (fournitures + spirituel) | 🔶 À migrer vers Marketplace |
| `direct_messages` | Chat WhatsApp-like | 🔶 À évaluer |
| `livestream_comments` / `_reactions` | Livestream religieux | Hors scope |
| `day_resources` / `day_views` | Ressources programme 40 jours | Hors scope |
| `push_subscriptions` | Push notifications | 🔶 À conserver si push nécessaire |
| `notifications` | Notifications in-app | 🔶 À conserver |
| `app_settings` | Config globale | 🔶 À conserver |

---

## Fichiers sources — État de la purge

### ✅ Fichiers réécrits (CampusFlow)

| Fichier | Avant | Après |
|---------|-------|-------|
| `src/app/page.tsx` | Redirection vers dashboard legacy | Landing page CampusFlow |
| `src/app/layout.tsx` | Metadata "Maison de Prière" | Metadata CampusFlow |
| `src/components/views/dashboard-view.tsx` | Prière, Jeux Bibliques, courses, Chat | Dashboard CampusFlow role-based |
| `src/components/views/courses-view.tsx` | Lecteur Bible + Programme 40 jours | Liste matières CampusFlow |

### ✅ Fichiers créés (CampusFlow)

| Fichier | Description |
|---------|-------------|
| `src/app/onboarding/page.tsx` | Wizard 6 étapes |
| `src/app/[orgSlug]/page.tsx` | Page publique école |
| `src/app/[orgSlug]/admin/page.tsx` | Backoffice 10 onglets |
| `src/app/[orgSlug]/prof/page.tsx` | Inscription prof |
| `src/app/[orgSlug]/student/page.tsx` | Inscription étudiant |
| `src/app/[orgSlug]/login/page.tsx` | Login par école |
| `src/app/login/page.tsx` | Login global |

### ❌ Fichiers à supprimer

| Fichier/Dossier | Contenu religieux |
|-----------------|-------------------|
| `src/components/views/games-view.tsx` | Jeux Bibliques |
| `src/components/community/*.tsx` | Prières, groupes, livestream |
| `src/components/bible/*.tsx` | Lecteur Bible |
| `src/components/admin/*.tsx` | Panel admin Maison de Prière |
| `src/app/admin/**` | Routes admin legacy |
| `src/app/chat/page.tsx` | Chat WhatsApp |
| `src/app/video/page.tsx` | Livestream |
| `src/app/replay/page.tsx` | Replays |
| `src/lib/curriculum-data.ts` | Programme 40 jours |
| `src/lib/french-bible-data.ts` | Données Bible |
| `src/lib/unified-bible-api.ts` | API Bible |
| `src/lib/quiz-generator.ts` | Quiz bibliques |
| `src/lib/local-bible-games.ts` | Jeux bibliques |
| `src/components/bottom-nav.tsx` | Nav legacy |
| `src/components/navigation/BottomNav.tsx` | Nav legacy |
| `src/components/feature-tutorial.tsx` | Tutorial prière |
| `src/components/app-tutorial.tsx` | Tutorial Maison de Prière |

---

## Prochaines étapes (par priorité)

1. **P1** ✅ Fix RLS + Rate limit onboarding
2. **P2** Purge complète des fichiers legacy (supprimer les fichiers listés ci-dessus)
3. **P2** Créer `/[orgSlug]/dashboard` avec routing role-based
4. **P3** Module Notes : saisie + moyennes + bulletins
5. **P3** Module Présences : appel par classe
6. **P3** Middleware Next.js pour protection des routes
7. **P4** Paiement en ligne (Notch Pay / FedaPay)
8. **P4** Bibliothèque numérique (migration depuis livre/)
9. **P5** Marketplace CampusFlow
10. **P5** Tests E2E du flux complet
