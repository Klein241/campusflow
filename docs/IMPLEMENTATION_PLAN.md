# 🎓 CampusFlow — Plan d'implémentation complet

> **Dernière MAJ :** 25 mars 2026
> **Stack :** Next.js 16 (App Router) · Supabase (Auth + PostgreSQL + RLS + Storage) · Tailwind CSS 4 · Framer Motion
> **Déploiement :** Netlify (`campusfl.netlify.app`) → futur `campusflow.app`
> **Schéma SQL de référence :** `supabase-migrations/CAMPUSFLOW_FULL_SCHEMA.sql`

---

## 📋 Table des matières

1. [Architecture des routes](#architecture-des-routes)
2. [Phase 1 — Landing Page](#phase-1--landing-page-)
3. [Phase 2 — Onboarding Wizard](#phase-2--onboarding-wizard-6-étapes)
4. [Phase 3 — Backoffice Admin](#phase-3--backoffice-admin)
5. [Phase 4 — Inscription Prof / Étudiant](#phase-4--inscription-prof--étudiant)
6. [Phase 5 — Pages publiques](#phase-5--pages-publiques-de-létablissement)
7. [Phase 6 — Dashboard role-based](#phase-6--dashboard-role-based)
8. [Phase 7 — Modules avancés](#phase-7--modules-avancés-roadmap)
9. [Schéma de base de données](#schéma-de-base-de-données)
10. [RLS & Sécurité](#rls--sécurité)
11. [Bugs corrigés](#bugs-corrigés)
12. [Purge legacy](#purge-legacy)
13. [Déploiement](#déploiement)

---

## Architecture des routes

```
ROUTES PUBLIQUES
──────────────────────────────────────────────────────────────────
/                                    → Landing page CampusFlow (CTA "Créer votre établissement")
/onboarding                          → Wizard 6 étapes (création établissement + compte admin)
/login                               → Connexion globale (redirige vers /[orgSlug]/admin)
/[orgSlug]                           → Page publique de l'établissement (infos, filières, contact)

ROUTES INSCRIPTION
──────────────────────────────────────────────────────────────────
/[orgSlug]/prof                      → Inscription professeur (+ auto-génération compte Supabase)
/[orgSlug]/student                   → Inscription étudiant (+ auto-génération matricule)
/[orgSlug]/login                     → Connexion par rôle (prof, étudiant, secrétaire, admin)

ROUTES ADMIN (PROTÉGÉES)
──────────────────────────────────────────────────────────────────
/[orgSlug]/admin                     → Backoffice directeur/fondateur (10 onglets)
/[orgSlug]/dashboard                 → Dashboard role-based (étudiant, prof, admin) [👷 TODO]

ROUTES LEGACY (À SUPPRIMER)
──────────────────────────────────────────────────────────────────
/admin/*                             → Ancien panel admin Maison de Prière [⚠️ PURGE NEEDED]
/chat                                → Ancien WhatsApp-like [⚠️ PURGE NEEDED]
/livre                               → Ancien lecteur de livres [⚠️ PURGE NEEDED]
/video, /replay                      → Ancien livestream [⚠️ PURGE NEEDED]
```

---

## Phase 1 — Landing Page (`/`)

**Fichier :** `src/app/page.tsx`
**État :** ✅ TERMINÉ

### Sections implémentées
1. **Hero** — Gradient indigo/violet + animation de texte + CTA "Créer votre établissement"
2. **Fonctionnalités clés** — 6 cards avec icônes (Gestion académique, Emploi du temps, Évaluations, Paiements, Marketplace, Communauté)
3. **Types d'établissements** — Collège, Lycée, Université, Centre de formation, Institut, Autre
4. **Comment ça marche** — 3 étapes visuelles (Inscription → Configuration → Utilisation)
5. **CTA final** — "Commencez gratuitement"
6. **Footer** — Liens, copyright

### Améliorations prévues
- [ ] Section tarification (Gratuit / Pro / Enterprise)
- [ ] Témoignages avec carousel
- [ ] Compteur d'écoles inscrites (en temps réel depuis Supabase)
- [ ] Vidéo démo (embed YouTube)

---

## Phase 2 — Onboarding Wizard (6 étapes)

**Fichier :** `src/app/onboarding/page.tsx`
**État :** ✅ TERMINÉ (bugs P1 corrigés)

### Flux complet

```
Étape 1 → Étape 2 → Étape 3 → Étape 4 → Étape 5 → Étape 6 → [Submit]
                                                                   ↓
                                                        signUp / signIn
                                                                   ↓
                                                        INSERT organizations
                                                                   ↓
                                                        redirect /[slug]/admin
```

### Étape 1 : Parlez-nous de vous
- **Champs :** Nom, Prénom
- **Upload :** Photo de profil (optionnel, Supabase Storage)

### Étape 2 : Quel est votre rôle ?
- **Options :** Fondateur | Proviseur | Principal | Formateur | Instituteur | Directeur
- Sélection visuelle (cards avec icônes)

### Étape 3 : Votre établissement
- **Nom** de l'établissement (obligatoire)
- **Type :** Collège | Lycée | Université | Centre de formation professionnel | Institut de formation | Autre (champ libre)
- **Devise/Slogan** (optionnel)

### Étape 4 : Localisation
- **Pays** (dropdown avec les pays africains en priorité)
- **Ville** (champ libre)
- **Quartier** (optionnel)
- **Adresse** complète (optionnel)

### Étape 5 : Contact
- **N° de téléphone** (obligatoire)
- **N° WhatsApp** (pré-rempli avec le téléphone)
- **Email** (obligatoire — sert aussi pour l'authentification)
- **Autre N°** (optionnel + label personnalisé)

### Étape 6 : Documentation & Récapitulatif
- **Upload logo** de l'établissement (recommandé)
- **Upload pièces justificatives** — PDF/images, multi-upload (agrément, autorisation, etc.)
- **Résumé** complet avec toutes les infos saisies
- **Bouton "Créer mon établissement"**

### Processus de soumission (technique)
1. `supabase.auth.signUp({ email, password })` → Crée le compte admin
2. **Fallback rate limit :** Si `signUp` échoue pour cause de limite de taux ou compte existant → `supabase.auth.signInWithPassword()`
3. Attente de la session active (boucle avec timeout 10s)
4. `INSERT INTO organizations` avec `owner_id = user.id`
5. Upload du logo dans le bucket `organization-assets`
6. Redirection vers `/${slug}/admin`

---

## Phase 3 — Backoffice Admin

**Fichier :** `src/app/[orgSlug]/admin/page.tsx`
**État :** ✅ TERMINÉ (10 onglets fonctionnels)

### Au premier accès → Setup Wizard (3 étapes obligatoires)

#### Étape 1 : Création des salles de classe / filières

**Si type = Collège ou Lycée :**
- Ajout rapide par niveau : 6ème A/B/C, 5ème A/B/C, etc.
- 1er cycle (6ème → 3ème) et 2nd cycle (Seconde → Terminale)
- Sections A, B, C auto-générées
- Interface : boutons rapides + ajout manuel

**Si type = Université / Centre de formation / Institut :**
- Créer des filières ou niveaux librement
- Exemple : "Massothérapie Niveau 1", "Informatique L3"
- Pas de contrainte de format

#### Étape 2 : Attribution des matières
- **Sélection de classe** → dropdown filtré
- **Matières prédéfinies** selon le type d'établissement :
  - Collège : Maths, Français, Anglais, SVT, Physique-Chimie, Histoire-Géo, Informatique, EPS
  - Lycée : + Philosophie, Chimie séparée
  - Université : Module 1/2/3, Projet tutoré, Stage
  - Centre de formation : Cours théorique, TP, Stage pro, Projet fin de formation
- **Ajout personnalisé** de matières + coefficient

#### Étape 3 : Invitation des professeurs
- Génération du lien d'inscription prof : `/{orgSlug}/prof`
- Bouton "Copier le lien"
- Bouton "Terminer la configuration"
- Marque `organization.setup_completed = true`

### Après le setup → Dashboard admin complet (10 onglets)

| # | Onglet | Icône | État | Description |
|---|--------|-------|------|-------------|
| 1 | **Général** | 🏠 | ✅ | Infos établissement, liens partagables, KPIs (classes, matières, profs, étudiants) |
| 2 | **Configuration** | ⚙️ | ✅ | Setup wizard 3 étapes (re-accessible) |
| 3 | **Classes** | 🏫 | ✅ | Liste des classes/filières avec nombre de matières par classe |
| 4 | **Matières** | 📖 | ✅ | Vue par classe avec coefficient par matière |
| 5 | **Professeurs** | 👥 | ✅ | Liste avec avatar, spécialité, contact + lien d'inscription |
| 6 | **Étudiants** | 🎓 | ✅ | Liste avec avatar, matricule + lien d'inscription |
| 7 | **Emploi du temps** | 📅 | ✅ | CRUD créneaux (Jour, Classe, Matière, Heure début/fin, Salle) — Vue par jour |
| 8 | **Évaluations** | 📝 | ✅ | CRUD évaluations (Titre, Type, Classe, Matière, Date, Note max) — Types : devoir, examen, TP, oral, projet |
| 9 | **Paiements** | 💰 | ✅ | Enregistrement paiements (Étudiant, Montant XAF, Mode : Espèces/MTN MoMo/Orange Money/Virement/Autre, Description) — Historique avec montants formatés |
| 10 | **Discipline** | ⚠️ | ✅ | Enregistrement sanctions (Étudiant, Type : Avertissement/Blâme/Exclusion temporaire/Retenue/Convocation parent, Motif) — Codes couleur par gravité |

### Fonctionnalités techniques
- **Lazy loading** des données : chaque module charge ses données uniquement quand l'onglet est sélectionné
- **Sidebar responsive** : collapsible sur mobile, fixe sur desktop
- **Toasts** de confirmation pour chaque action CRUD
- **Spinner de sauvegarde** sur tous les boutons d'action

---

## Phase 4 — Inscription Prof / Étudiant

### `/[orgSlug]/prof` — Inscription professeur
**Fichier :** `src/app/[orgSlug]/prof/page.tsx`
**État :** ✅ TERMINÉ

**Formulaire :**
| Champ | Type | Obligatoire |
|-------|------|-------------|
| Prénom | Texte | ✅ |
| Nom | Texte | ✅ |
| Email | Email | ✅ |
| Téléphone | Tél | ✅ |
| Spécialité | Texte | ❌ |
| Mot de passe | Password | ✅ |

**Processus :**
1. `signUp` avec email/password
2. `INSERT INTO teacher_profiles` avec `organization_id` et `user_id`
3. Redirection vers `/{orgSlug}/login`

### `/[orgSlug]/student` — Inscription étudiant
**Fichier :** `src/app/[orgSlug]/student/page.tsx`
**État :** ✅ TERMINÉ

**Formulaire :**
| Champ | Type | Obligatoire |
|-------|------|-------------|
| Prénom | Texte | ✅ |
| Nom | Texte | ✅ |
| Date de naissance | Date | ✅ |
| Email | Email | ✅ |
| Classe | Dropdown (classes de l'org) | ✅ |
| Mot de passe | Password | ✅ |

**Processus :**
1. `signUp` avec email/password
2. `INSERT INTO student_profiles` avec `organization_id`, `classroom_id`, `user_id`
3. **Matricule auto-généré** par trigger PostgreSQL : `{PRÉFIXE_CLASSE}-{ANNÉE}-{SÉQUENCE}`
   - Exemple : `MASS-2026-001`, `6ÈME-2026-015`
4. Redirection vers `/{orgSlug}/login`

---

## Phase 5 — Pages publiques de l'établissement

### `/[orgSlug]` — Page publique
**Fichier :** `src/app/[orgSlug]/page.tsx`
**État :** ✅ TERMINÉ

**Sections implémentées :**
1. **Header** avec nom de l'établissement, type, ville/pays
2. **Informations** — Téléphone, email, WhatsApp
3. **Filières/Classes** disponibles (chargées depuis `classrooms`)
4. **Liens** vers inscription prof et étudiant
5. **Design** — Glassmorphism, gradient header, responsive

### `/[orgSlug]/login` — Connexion par rôle
**Fichier :** `src/app/[orgSlug]/login/page.tsx`
**État :** ✅ TERMINÉ

- Login email/mot de passe via Supabase Auth
- **Détection automatique du rôle** :
  - Si `teacher_profiles` a une entrée → redirige vers dashboard prof
  - Si `student_profiles` a une entrée → redirige vers dashboard étudiant
  - Si `organizations.owner_id === user.id` → redirige vers `/admin`

### `/login` — Connexion globale
**Fichier :** `src/app/login/page.tsx`
**État :** ✅ TERMINÉ

- Login global avec détection automatique de l'organisation via `organizations.owner_id`
- Redirection vers `/{orgSlug}/admin`

---

## Phase 6 — Dashboard role-based

**Fichier :** `src/components/views/dashboard-view.tsx` (réécrit CampusFlow)
**État :** 🔶 PARTIELLEMENT TERMINÉ

### Dashboard Directeur/Admin
- ✅ KPIs : étudiants, profs, classes, matières
- ✅ Actions rapides vers les modules admin
- [ ] Graphiques de fréquentation
- [ ] Alertes automatiques (paiements en retard, etc.)

### Dashboard Professeur
- ✅ Résumé des matières enseignées
- ✅ Prochains cours depuis l'emploi du temps
- [ ] Saisie rapide de notes
- [ ] Appel (présences)

### Dashboard Étudiant
- ✅ Informations personnelles + matricule
- ✅ Emploi du temps du jour
- [ ] Notes récentes
- [ ] Moyenne générale
- [ ] Paiements en cours

### Route dédiée `/[orgSlug]/dashboard`
- [ ] **TODO** : Créer `src/app/[orgSlug]/dashboard/page.tsx` avec routing par rôle
- Le composant `dashboard-view.tsx` est prêt, il faut juste l'intégrer dans une route

---

## Phase 7 — Modules avancés (Roadmap)

### 7.1 Notes & Bulletins
- [ ] Interface de saisie des notes par évaluation
- [ ] Calcul automatique des moyennes (pondérées par coefficient)
- [ ] Génération de bulletins PDF
- [ ] Envoi par email aux parents

### 7.2 Présences / Appel
- [ ] Interface d'appel par classe
- [ ] Statistiques de présence par étudiant
- [ ] Alertes absences répétées
- Table SQL : `attendance` (✅ schéma prêt)

### 7.3 Paiements avancés
- [ ] Intégration Notch Pay / FedaPay pour paiement en ligne
- [ ] Tableau de bord financier (revenus, impayés)
- [ ] Relances automatiques par SMS/WhatsApp
- [ ] Reçus de paiement PDF

### 7.4 Bibliothèque numérique
- [ ] Upload de PDF/livres par l'admin
- [ ] Lecteur PDF intégré
- [ ] Catégories par matière/filière
- Migration depuis l'ancien système `src/app/livre/`

### 7.5 Marketplace
- [ ] Vente de fournitures, uniformes, cours payants
- [ ] Panier + checkout
- Migration depuis l'ancienne boutique `shop_products` / `shop_orders`

### 7.6 Forum / Communauté
- [ ] Discussions par classe ou matière
- [ ] Notifications en temps réel (Supabase Realtime)
- Migration depuis l'ancien forum `study_groups`

### 7.7 Notifications
- [ ] Push notifications (Web Push API)
- [ ] Notifications in-app
- [ ] Emails automatiques (inscription confirmée, notes publiées, etc.)

### 7.8 Middleware de protection
- [ ] `middleware.ts` Next.js validant le `orgSlug` sur toutes routes `/[orgSlug]/*`
- [ ] Vérification de l'appartenance à l'organisation
- [ ] Redirection si non-authentifié

---

## Schéma de base de données

**Fichier :** `supabase-migrations/CAMPUSFLOW_FULL_SCHEMA.sql` (1068 lignes, idempotent)

### Tables CampusFlow (organization-scoped)

| Table | Description | RLS |
|-------|-------------|-----|
| `organizations` | Établissements (nom, slug, type, contact, logo, owner_id) | ✅ Public read + Owner write + Auth insert |
| `classrooms` | Classes/filières par organisation | ✅ Public read + Owner write |
| `subjects` | Matières par classe (nom, code, coefficient) | ✅ Public read + Owner write |
| `teacher_profiles` | Profils profs (nom, spécialité, email) | ✅ Self read + Owner read/write |
| `student_profiles` | Profils étudiants (nom, matricule auto, classe) | ✅ Self read + Owner read/write |
| `timetable_slots` | Créneaux emploi du temps (jour, heure, salle) | ✅ Public read + Owner write |
| `evaluations` | Évaluations (titre, type, classe, matière, note max) | ✅ Public read + Owner write |
| `grades` | Notes par évaluation par étudiant | ✅ Self/Owner read + Owner write |
| `attendance` | Présences par étudiant par jour | ✅ Self/Owner read + Owner write |
| `disciplines` | Sanctions (type, motif, durée) | ✅ Self/Owner read + Owner write |
| `school_payments` | Paiements scolarité (montant, mode, description) | ✅ Self/Owner read + Owner write + Owner insert |

### Tables Legacy (héritées de Maison de Prière)

| Table | Description | Status |
|-------|-------------|--------|
| `profiles` | Profils utilisateurs ancien système | 🔶 Conservé (compatibilité) |
| `filieres` | Filières ancien système | 🔶 Conservé |
| `matieres` | Matières ancien système | 🔶 Conservé |
| `notes` | Notes ancien système | 🔶 Conservé |
| `timetable` | EDT ancien système | 🔶 Conservé |
| `presences` | Présences ancien système | 🔶 Conservé |
| `paiements` | Paiements ancien système | 🔶 Conservé |
| `forum_threads/replies` | Forum | 🔶 À migrer |
| `shop_products/orders` | Boutique | 🔶 À migrer |
| `study_groups/*` | Groupes d'étude/prière | ⚠️ À purger |
| `tutoring_requests` | Demandes de prière | ⚠️ À purger |
| `livestream_*` | Livestream | ⚠️ À purger |
| `day_*` | Cursus 40 jours | ⚠️ À purger |
| `student_progress` | Programme spirituel | ⚠️ À purger |

### Triggers

| Trigger | Table | Action |
|---------|-------|--------|
| `trg_student_matricule` | `student_profiles` | Auto-génère le matricule au format `{CLASSE}-{ANNÉE}-{SEQ}` |
| `trg_*_updated_at` | Toutes tables avec `updated_at` | Met à jour automatiquement le timestamp |

### Fonctions SQL

| Fonction | Description |
|----------|-------------|
| `generate_matricule()` | Génère les matricules étudiants |
| `get_moyenne_etudiant()` | Calcul de moyenne pondérée |
| `get_taux_presence()` | Taux de présence en pourcentage |
| `set_updated_at()` | Trigger `updated_at` |

---

## RLS & Sécurité

### Principe d'isolation multi-tenant
- Chaque table CampusFlow a un champ `organization_id`
- Les politiques RLS vérifient que l'utilisateur est le `owner_id` de l'organisation
- Les étudiants/profs ne voient que leurs propres données

### Politiques critiques

```sql
-- Organisations : lecture publique, écriture propriétaire, insertion authentifié
CREATE POLICY "org_public_read" ON organizations FOR SELECT USING (true);
CREATE POLICY "org_owner_write" ON organizations FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "org_insert" ON organizations FOR INSERT TO authenticated WITH CHECK (true);

-- Tables enfants : propriétaire de l'org peut tout faire
CREATE POLICY "xxx_write" ON [table] FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM organizations WHERE id = [table].organization_id AND owner_id = auth.uid())
);
```

### ⚠️ Configuration Supabase requise
- **Désactiver "Confirm Email"** dans Dashboard Supabase → Authentication → Email
- Sinon, les utilisateurs doivent confirmer par email avant de pouvoir insérer, ce qui bloque l'onboarding

---

## Bugs corrigés

### 🔴 P1 — RLS violation à l'onboarding
**Symptôme :** `new row violates row-level security policy for table "organizations"`
**Cause :** L'insert se faisait AVANT que la session Supabase soit active
**Fix :**
1. Inverser : `signUp` → vérifier `getUser()` → puis `insert`
2. Ajouter la policy `org_insert` pour les utilisateurs authentifiés
3. Boucle d'attente de session avec timeout

### 🔴 P1 — Email rate limit exceeded
**Symptôme :** `email rate limit exceeded` lors de tentatives répétées d'onboarding
**Cause :** Supabase rate-limite les emails de confirmation à 1 par minute
**Fix :**
1. Fallback : si `signUp` échoue → tenter `signInWithPassword`
2. Recommandation : désactiver "Confirm email" dans le dashboard Supabase

### 🟡 P2 — Build error `DEFAULT_courses_ID`
**Symptôme :** `ReferenceError: DEFAULT_courses_ID is not defined`
**Cause :** Constante manquante dans `store.ts`
**Fix :** Ajout de `export const DEFAULT_courses_ID = 'LSG';`

---

## Purge legacy

### Fichiers réécrits (CampusFlow)
| Fichier | Avant | Après |
|---------|-------|-------|
| `src/components/views/dashboard-view.tsx` | Dashboard prière (Jeux Bibliques, Prière, courses, Chat) | Dashboard CampusFlow role-based (KPIs, actions rapides) |
| `src/components/views/courses-view.tsx` | Lecteur Bible + Programme 40 jours | Liste des matières CampusFlow |

### Fichiers legacy restants à purger

| Fichier/Dossier | Contenu legacy | Action |
|-----------------|----------------|--------|
| `src/components/views/games-view.tsx` | Jeux Bibliques | ❌ Supprimer |
| `src/components/views/forum-view.tsx` | Forum avec prières, chambres hautes | 🔶 Réécrire pour CampusFlow |
| `src/components/views/profile-view.tsx` | Profil avec badges "Guerrier de Prière" | 🔶 Réécrire pour CampusFlow |
| `src/components/community/*` | Prières, groupes de prière, livestream | ❌ Supprimer |
| `src/components/bible/*` | Lecteur Bible, recherche biblique | ❌ Supprimer |
| `src/components/admin/*` | Panel admin Maison de Prière | ❌ Supprimer |
| `src/app/admin/*` | Routes admin legacy | ❌ Supprimer |
| `src/app/chat/page.tsx` | WhatsApp clone | ❌ Supprimer |
| `src/app/livre/page.tsx` | Lecteur de livres | 🔶 Migrer vers Bibliothèque CampusFlow |
| `src/app/video/page.tsx` | Page vidéo/livestream | ❌ Supprimer |
| `src/app/replay/page.tsx` | Replays vidéo | ❌ Supprimer |
| `src/lib/curriculum-data.ts` | Données programme 40 jours | ❌ Supprimer |
| `src/lib/french-bible-data.ts` | Données Bible | ❌ Supprimer |
| `src/lib/unified-bible-api.ts` | API Bible | ❌ Supprimer |
| `src/lib/quiz-generator.ts` | Générateur de quiz bibliques | ❌ Supprimer |
| `src/lib/local-bible-games.ts` | Jeux bibliques locaux | ❌ Supprimer |
| `src/components/bottom-nav.tsx` | Navigation legacy (Marketplace, Messages, Livres, courses, Profil) | ❌ Supprimer |
| `src/components/navigation/BottomNav.tsx` | Navigation legacy variante | ❌ Supprimer |
| `src/components/NotificationSettings.tsx` | Settings avec catégorie "Prière" | 🔶 Réécrire |
| `src/components/feature-tutorial.tsx` | Tutorial "Chambres Hautes" | ❌ Supprimer |
| `src/components/app-tutorial.tsx` | Tutorial "Maisons de Prière" | ❌ Supprimer |

---

## Déploiement

### Configuration actuelle
- **Build :** `npm run build` (Next.js)
- **Hébergement :** Netlify (`campusfl.netlify.app`)
- **Branche :** `principal`
- **Supabase :** Projet cloud (clés dans `.env.local`)

### Étapes de déploiement
1. `git add -A`
2. `git commit -m "description"`
3. `git push origin principal`
4. Netlify auto-deploy depuis GitHub

### Variables d'environnement requises
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### Exécution du schéma SQL
1. Ouvrir Supabase Dashboard → SQL Editor
2. Coller le contenu de `CAMPUSFLOW_FULL_SCHEMA.sql`
3. Exécuter (le script est idempotent, peut être relancé sans risque)

---

## Résumé de l'état d'avancement

| Composant | État | Priorité |
|-----------|------|----------|
| Landing page | ✅ Terminé | — |
| Onboarding 6 étapes | ✅ Terminé (bugs P1 fixés) | — |
| Page publique école | ✅ Terminé | — |
| Login global + par école | ✅ Terminé | — |
| Inscription prof | ✅ Terminé | — |
| Inscription étudiant | ✅ Terminé (matricule auto) | — |
| Admin — Général | ✅ Terminé | — |
| Admin — Setup wizard | ✅ Terminé | — |
| Admin — Classes | ✅ Terminé | — |
| Admin — Matières | ✅ Terminé | — |
| Admin — Professeurs | ✅ Terminé | — |
| Admin — Étudiants | ✅ Terminé | — |
| Admin — Emploi du temps | ✅ Terminé | — |
| Admin — Évaluations | ✅ Terminé | — |
| Admin — Paiements | ✅ Terminé | — |
| Admin — Discipline | ✅ Terminé | — |
| Schéma SQL complet | ✅ Terminé (idempotent) | — |
| RLS multi-tenant | ✅ Terminé | — |
| Dashboard role-based (route) | 🔶 Composant prêt, route TODO | P2 |
| Purge legacy complète | 🔶 Dashboard + Courses réécrits | P2 |
| Notes & Bulletins | ❌ TODO | P3 |
| Présences / Appel | ❌ TODO | P3 |
| Paiements en ligne | ❌ TODO | P4 |
| Bibliothèque | ❌ TODO | P4 |
| Marketplace | ❌ TODO | P5 |
| Middleware Next.js | ❌ TODO | P3 |
| Tests E2E | ❌ TODO | P4 |
