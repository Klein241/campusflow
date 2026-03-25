# 🏠 CentreFormation Pro — Documentation Technique Complète

> **Dernière mise à jour** : 23 mars 2026  
> **Branche de production** : `principal2`  
> **URL de production** : https://centreformation.netlify.app  
> **Repository** : https://github.com/Klein241/centreformation

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture technique](#architecture-technique)
3. [Structure du code](#structure-du-code)
4. [Stack technologique](#stack-technologique)
5. [Flux d'authentification](#flux-dauthentification)
6. [Base de données (Supabase)](#base-de-données-supabase)
7. [Fonctionnalités principales](#fonctionnalités-principales)
8. [Infrastructure de déploiement](#infrastructure-de-déploiement)
9. [Services externes](#services-externes)
10. [Gestion des branches Git](#gestion-des-branches-git)
11. [Variables d'environnement](#variables-denvironnement)
12. [Problèmes connus & solutions](#problèmes-connus--solutions)
13. [Guide de développement](#guide-de-développement)

---

## Vue d'ensemble

**CentreFormation Pro** est une application web progressive (PWA) communautaire chrétienne. Elle offre un programme de prière de 40 jours, un espace communautaire (chat en temps réel, Groupes d'etude), une Ressources pédagogiques de livres chrétiens, un marketplace, et un espace de gestion administration.

L'application est conçue comme un **SPA statique** (Single Page Application), où toute la logique s'exécute côté client. Le backend est entièrement géré par **Supabase** (base de données, authentification, temps réel) et un **Cloudflare Worker** (notifications push, stockage R2).

---

## Architecture technique

```
┌──────────────────────────────────────────────────────────┐
│                    UTILISATEUR (Navigateur)                │
│                                                            │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐  │
│  │ Next.js SPA  │   │ Service      │   │ IndexedDB    │  │
│  │ (React 18)   │   │ Worker       │   │ (MediaStore) │  │
│  │ Zustand      │   │ (Push/Cache) │   │              │  │
│  └──────┬───────┘   └──────┬───────┘   └──────────────┘  │
│         │                  │                               │
└─────────┼──────────────────┼───────────────────────────────┘
          │                  │
    ┌─────▼──────┐     ┌─────▼──────────────┐
    │  Supabase  │     │  Cloudflare Worker  │
    │            │     │  (centreformation-   │
    │ • Auth     │     │   notifications)    │
    │ • Database │     │                     │
    │ • Realtime │     │ • Push Notifications│
    │ • Storage  │     │ • R2 File Storage   │
    │            │     │ • VAPID Keys        │
    └────────────┘     └─────────────────────┘
```

### Flux de données

1. **Auth** : Supabase Auth (email/password avec fake email `{phone}@centreformation.local`, Google OAuth)
2. **Data** : Supabase PostgreSQL via REST API (`@supabase/supabase-js`)
3. **Realtime** : Supabase Channels (Presence + postgres_changes)
4. **Push** : Cloudflare Worker → Web Push Protocol (RFC 8188/8291)
5. **Media** : Cloudflare R2 (via Worker) pour livres PDF, couvertures, images marketplace

---

## Structure du code

```
holographic-ring/
├── public/                      # Assets statiques (icons, manifest.json, sw.js)
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── page.tsx             # Page principale (SPA — routing interne)
│   │   ├── layout.tsx           # Root layout (providers, fonts, listeners)
│   │   └── admin/               # Panneau d'administration
│   │       ├── page.tsx         # Dashboard admin principal
│   │       ├── content/         # Gestion cursus + ressources
│   │       ├── marketplace/     # Gestion produits marketplace
│   │       ├── users/           # Gestion utilisateurs
│   │       ├── groups/          # Gestion Groupes d'etude
│   │       ├── notifications/   # Envoi notifications push
│   │       ├── moderation/      # Modération contenus
│   │       ├── courses/           # Gestion versets/études bibliques
│   │       ├── ads/             # Gestion publicités ressources
│   │       ├── settings/        # Paramètres application
│   │       └── ...
│   ├── components/
│   │   ├── views/               # Vues principales (onglets)
│   │   │   ├── auth-view.tsx     # Connexion / Inscription
│   │   │   ├── dashboard-view.tsx     # Accueil / Tableau de bord
│   │   │   ├── forum-view.tsx # Forum étudiant (chat, groupes, prières)
│   │   │   ├── resources-view.tsx  # Ressources pédagogiques
│   │   │   ├── shop-view.tsx # Marketplace
│   │   │   ├── courses-view.tsx    # Lecteur courses
│   │   │   ├── grades-view.tsx  # Carnet de notes
│   │   │   ├── curriculum-view.tsx  # cursus
│   │   │   └── profile-view.tsx  # Profil utilisateur
│   │   ├── community/
│   │   │   └── forum-chat.tsx # Chat temps réel (3700+ lignes)
│   │   ├── admin/
│   │   │   └── resources-manager.tsx # Admin ressources (upload, bulk, gestion)
│   │   ├── auth-listener.tsx     # Gestion session auth (onAuthStateChange)
│   │   ├── NotificationContext.tsx # Provider notifications in-app
│   │   ├── notification-bell.tsx # Cloche de notifications UI
│   │   ├── push-notification-manager.tsx # Abonnement push
│   │   └── push-wrapper.tsx      # Lazy loader pour push manager
│   ├── hooks/
│   │   ├── use-presence.ts       # Présence en ligne (heartbeat, Realtime)
│   │   ├── use-notifications.ts  # Hook notifications CRUD
│   │   └── use-conversations.ts  # Hook conversations/DM
│   ├── lib/
│   │   ├── store.ts              # Store Zustand (état global, auth, données)
│   │   ├── supabase.ts           # Client Supabase singleton
│   │   ├── api-client.ts         # Fonctions API Supabase (profils, chat)
│   │   ├── notifications.ts      # Logique envoi notifications
│   │   ├── media-storage.ts      # IndexedDB + Google Drive backup
│   │   ├── curriculum-data.ts       # Données cursus
│   │   ├── types.ts              # Types TypeScript
│   │   └── utils.ts              # Utilitaires (cn, formatDate, etc.)
│   └── styles/                   # CSS global
├── netlify.toml                  # Config Netlify (build, headers, redirects)
├── next.config.ts                # Config Next.js (output: 'export')
├── package.json                  # Dépendances
└── .env.local                    # Variables d'environnement (NON déployé)
```

---

## Stack technologique

| Couche | Technologie | Version | Rôle |
|--------|-------------|---------|------|
| **Framework** | Next.js | 16.1.6 | App Router, SSG (static export) |
| **UI** | React | 18+ | Composants |
| **État global** | Zustand | latest | Store avec persist (localStorage) |
| **Animations** | Framer Motion | latest | Transitions, micro-animations |
| **Style** | TailwindCSS | latest | Classes utilitaires |
| **Auth & DB** | Supabase | 2.94.0 | PostgreSQL, Auth, Realtime, Storage |
| **Push** | Cloudflare Worker | — | Web Push, R2 storage |
| **PDF** | pdfjs-dist | latest | Extraction couverture PDF |
| **Icons** | Lucide React | latest | Icônes SVG |
| **Toasts** | Sonner | latest | Notifications UI |

---

## Flux d'authentification

### Méthode 1 : Numéro WhatsApp + Mot de passe

```
Utilisateur entre : +237675052106
                    ↓
normalizePhone() → "237675052106"
                    ↓
email construit  → "237675052106@centreformation.local"
                    ↓
supabase.auth.signInWithPassword({ email, password })
                    ↓
AuthListener.onAuthStateChange(SIGNED_IN)
                    ↓
checkProfileActive(userId) → true (assume active par défaut)
                    ↓
setUser({...}) → App affiche le contenu
```

### Méthode 2 : Google OAuth

```
supabase.auth.signInWithOAuth({ provider: 'google' })
                    ↓
Redirect → accounts.google.com → consent
                    ↓
Redirect → {origin}#access_token=...
                    ↓
detectSessionInUrl: true → session restore automatique
                    ↓
AuthListener.onAuthStateChange(SIGNED_IN)
```

### Gestion de session (CRITIQUE)

- Tokens stockés dans **localStorage** (default `@supabase/supabase-js`)
- `persistSession: true` + `autoRefreshToken: true`
- `AuthListener` vérifie `checkProfileActive()` — **retourne `true` par défaut** (jamais de signOut sur erreur)
- Guard anti-boucle : `isProcessingRef` empêche les appels ré-rentrants dans `onAuthStateChange`
- **Safety timeout 10s** sur `signIn` : si ça hang → `isLoading` remis à `false` avec message d'erreur

---

## Base de données (Supabase)

### Tables principales

| Table | Description |
|-------|-------------|
| `profiles` | Profils utilisateurs (is_online, last_seen, is_active, avatar, etc.) |
| `tutoring_requests` | Demandes de tutorat |
| `experience_feedbacks` | Retours d'expérience |
| `conversations` | Conversations DM (last_message, participants) |
| `direct_messages` | Messages privés |
| `study_groups` | Groupes d'etude |
| `group_messages` | Messages de groupe |
| `group_members` | Membres des groupes |
| `student_progress` | Progression cursus |
| `books` | ressources de livres |
| `resource_favorites` | Livres favoris |
| `resource_ratings` | Notes des livres |
| `resource_access_history` | Historique de lecture |
| `notifications` | Notifications in-app |
| `push_subscriptions` | Abonnements push |
| `notification_preferences` | Préférences notifications |
| `shop_products` | Produits marketplace |
| `shop_orders` | Commandes marketplace |
| `app_settings` | Paramètres globaux |
| `resource_banners` | Publicités ressources |

### Realtime

- **Presence** : Canal `campus-presence` (track user online/offline)
- **postgres_changes** : Canal `presence-db-changes` (fallback DB pour présence)
- **notifications** : Canal par userId pour les notifications en temps réel

---

## Fonctionnalités principales

### 1. Programme de prière 40 jours
- 40 jours de contenu (lecture biblique, méditation, prière, action pratique)
- Tracking de progression par utilisateur
- Système de streak (jours consécutifs)

### 2. Forum étudiant (Chat temps réel)
- **Messages privés** : Chat 1-to-1 avec indicateur de présence
- **Groupes d'etude** : Création, gestion, chat de groupe
- **Appels vocaux/vidéo** : WebRTC (peer-to-peer)
- **Messages vocaux** : Enregistrement et lecture
- **Réactions** : Emojis sur les messages
- **Transfert de fichiers** : Images, documents

### 3. Ressources pédagogiques
- Upload de livres (PDF/EPUB) vers Cloudflare R2
- Extraction automatique de couverture depuis PDF
- Système de notation (étoiles)
- Favoris et historique de lecture
- **Détection de doublons** à l'upload
- Upload en masse (bulk upload 100-1000+ livres)
- Publication programmée (scheduled_at)

### 4. courses intégrée
- Lecteur courses complet
- Recherche par livre/chapitre/verset
- Mode responsive mobile/desktop

### 5. Marketplace
- Catalogue de produits
- Système de commandes
- Galerie d'images avec upload R2

### 6. Notifications
- **In-app** : Cloche de notifications avec compteur
- **Push** : Web Push via Service Worker + Cloudflare Worker
- **Son** : Web Audio API (double beep, pas de fichier mp3)
- **VAPID** : Validation de clé P-256 (65 bytes) avant abonnement

### 7. Panneau d'administration
- Gestion utilisateurs (activer/désactiver)
- Gestion contenu programme
- Gestion ressources (upload, bulk, publish/unpublish)
- Envoi notifications push globales
- Marketplace admin
- Modération des contenus

---

## Infrastructure de déploiement

### Netlify (Frontend)

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "out"                # Static export

[build.environment]
  NODE_VERSION = "20"
  NEXT_PUBLIC_SUPABASE_URL = "..."
  NEXT_PUBLIC_SUPABASE_ANON_KEY = "..."
  NEXT_PUBLIC_WORKER_URL = "..."
  NEXT_PUBLIC_GOOGLE_CLIENT_ID = "..."
  NEXT_PUBLIC_ADMIN_KEY = "..."
```

**Important** : C'est un `output: 'export'` (statique) → TOUTES les `NEXT_PUBLIC_*` vars doivent être dans `netlify.toml` car elles sont **inlinées dans le JS au build time**. Le `.env.local` n'est PAS déployé.

### Cloudflare Worker (Backend)

**Repo** : `Klein241/bufferwave-cloudflare` → `centreformation-push/`

**Routes** :
- `GET /api/push/vapid-key` — Clé publique VAPID
- `POST /api/push/register` — Enregistrer abonnement push
- `POST /api/push/send` — Envoyer notification push
- `GET /notify/list` — Lister notifications
- `PATCH /notify/read` — Marquer lu (single ou all)
- `GET/PATCH /notify/preferences` — Préférences notifications
- `PUT /api/r2/upload` — Upload fichier vers R2
- `GET /api/r2/serve/:key` — Servir fichier depuis R2
- `DELETE /api/r2/delete/:key` — Supprimer fichier R2

---

## Gestion des branches Git

| Branche | État | Description |
|---------|------|-------------|
| `principal2` | ✅ **PRODUCTION** | Branche stable, déployée sur Netlify |
| `principal` | ⚠️ Obsolète | Ancienne branche, contient des bugs non résolus |
| `main` | ⚠️ Miroir | Peut être utilisé comme backup |

### Recommandation pour `principal` :
- **Option recommandée** : Archiver `principal` (ne pas supprimer) et utiliser `principal2` comme branche principale
- Pour l'archiver, renommez-la : `git branch -m principal principal-archive`
- Puis renommez `principal2` en `principal` si vous voulez unifier

---

## Variables d'environnement

### Requises au build (MUST be in netlify.toml ou Netlify Dashboard)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme Supabase (public) |
| `NEXT_PUBLIC_WORKER_URL` | URL du Cloudflare Worker |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | ID Client Google OAuth |
| `NEXT_PUBLIC_ADMIN_KEY` | Clé admin pour upload R2 |

### Optionnelles (serveur seulement)

| Variable | Description |
|----------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service Supabase (admin only, jamais côté client) |

---

## Problèmes connus & solutions

### 1. Session perdue après actualisation (RÉSOLU)
**Cause** : Proxy no-op dans `supabase.ts` masquait les erreurs + `checkProfileActive()` appelait `signOut()` sur toute erreur → boucle infinie.  
**Fix** : Client Supabase direct + `checkProfileActive` retourne `true` par défaut.

### 2. Splash screen infini (RÉSOLU)
**Cause** : `isHydrated` de Zustand ne passait jamais à `true` en static export.  
**Fix** : Timer de 2s force `setHydrated(true)`, condition rendu ne dépend plus de `isHydrated`.

### 3. notification.mp3 → 404 (RÉSOLU)
**Cause** : Fichier mp3 absent du build statique.  
**Fix** : Remplacé par Web Audio API (double beep synthétisé).

### 4. VAPID key invalide (RÉSOLU)
**Cause** : Clé de taille incorrecte (pas 65 bytes).  
**Fix** : Validation de longueur avant `subscribe()`, skip gracieux si invalide.

### 5. Variables d'environnement manquantes en production (RÉSOLU)
**Cause** : `output: 'export'` inline les `NEXT_PUBLIC_*` au build → `.env.local` ignoré.  
**Fix** : Variables ajoutées dans `netlify.toml` `[build.environment]`.

---

## Guide de développement

### Prérequis

- Node.js 20+
- npm

### Installation

```bash
git clone https://github.com/Klein241/centreformation.git
cd centreformation
git checkout principal2
npm install
```

### Configuration locale

Créer un fichier `.env.local` :
```env
NEXT_PUBLIC_SUPABASE_URL=https://holomdzjifrgirkjuaqv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_WORKER_URL=https://centreformation-notifications.bufferwave.workers.dev
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_ADMIN_KEY=your_admin_key
```

### Développement

```bash
npm run dev           # Serveur dev (localhost:3000)
npm run build         # Build production (génère /out/)
```

### Déploiement

Le déploiement est automatique via GitHub :
1. Push sur `principal2`
2. Netlify détecte le push
3. Build `npm run build` → génère `/out/`
4. Déploie les fichiers statiques

### Tester une version spécifique

```bash
git log --oneline -10          # Voir les commits récents
git checkout <hash>            # Tester un commit
npm run dev                    # Lancer en local
git checkout principal2        # Revenir à la production
```

---

## Architecture des notifications

```
┌──────────────────────┐
│ NotificationContext   │ ← Provider React (écoute Supabase Realtime)
│ • playSound()         │ ← Web Audio API (double beep)
│ • showSystemNotif()  │ ← Browser Notification API / SW
│ • handleClick()      │ ← Navigation vers la source
└──────────┬───────────┘
           │
    ┌──────▼──────────┐
    │ useNotifications │ ← Hook CRUD (list, markRead, markAll)
    │ • fetch worker   │
    │ • fallback supa  │
    └──────┬──────────┘
           │
    ┌──────▼──────────────┐     ┌───────────────────┐
    │ Cloudflare Worker    │────▶│ Supabase           │
    │ • /notify/list       │     │ notifications      │
    │ • /notify/read       │     │ push_subscriptions │
    │ • /api/push/send     │     │                    │
    └──────────────────────┘     └───────────────────┘
```

---

*Document généré le 23 mars 2026 pour faciliter la prise en main du projet par un développeur.*
