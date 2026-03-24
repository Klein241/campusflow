# 🎓 CampusFlow — Plateforme SaaS de gestion scolaire & universitaire

**CampusFlow** est une plateforme SaaS multi-tenant conçue pour les établissements d'enseignement supérieur et centres de formation en Afrique. Chaque établissement dispose de son propre espace personnalisé, accessible via une URL unique.

## 🏗️ Architecture Multi-Tenant

```
campusflow.com/                          → Landing page publique
campusflow.com/institut-sciences-app/    → Page publique de l'institut (feed, actus, marketplace)
campusflow.com/institut-sciences-app/director/admin  → Backoffice directeur
```

Chaque établissement inscrit obtient :
- **Son propre URL** : `campusflow.com/[slug-etablissement]/`
- **Son espace public** : page d'accueil, actualités, marketplace, bibliothèque
- **Son backoffice** : gestion des filières, étudiants, professeurs, paiements
- **Ses données isolées** : isolation totale via RLS Supabase (Row Level Security)

## 👥 Les 7 acteurs du système

| Rôle | Accès | Description |
|------|-------|-------------|
| 🛡️ **Super Admin** | `/superadmin` | Opérateur de la plateforme. Vue globale cross-établissements |
| 🏛️ **Directeur** | `/[org]/director` | Gouvernance établissement, KPIs, configuration, création des comptes |
| 📋 **Secrétaire** | `/[org]/secretary` | Inscriptions, dossiers, emplois du temps, documents officiels |
| 💰 **Trésorier** | `/[org]/treasurer` | Paiements scolarité, relances, réconciliation marketplace |
| 👨‍🏫 **Professeur** | `/[org]/professor` | Ses classes, upload cours, saisie notes/présences, vente marketplace |
| 🎒 **Étudiant** | `/[org]/student` | Notes, EDT, forum, paiement scolarité, achat marketplace |
| 🏢 **Établissement** | Entité tenant | S'inscrit et configure son espace SaaS |

## 🔐 Système d'accès par codes

- **Directeur** : crée l'établissement, nomme les secrétaires et professeurs
- **Secrétaire** : gère les inscriptions, génère les codes matricules étudiants
- **Professeur** : reçoit un code d'accès attribué par le directeur
- **Étudiant** : reçoit un code matricule auto-généré (ex: `INFO-2024-001`) après validation de son dossier

## 🚀 Fonctionnalités principales

### 📚 Gestion académique
- **13+ filières** préconfigurées (Informatique, Comptabilité, Marketing, Droit, Santé…)
- **Promotions** par année et filière avec effectifs max
- **Emploi du temps** par filière, salle et professeur
- **Notes & évaluations** avec calcul automatique des moyennes pondérées
- **Suivi des présences** avec taux calculé en temps réel

### 💰 Gestion financière
- **Paiements scolarité** via Mobile Money (MTN MoMo, Orange Money — Notch Pay)
- **Suivi des impayés** et relances automatiques
- **Historique des transactions** avec reçus PDF

### 🛒 Marketplace à 3 niveaux
| Niveau | Type | Revenue Split |
|--------|------|--------------|
| B2C School | Profs → Étudiants du même centre | Prof 70% / Centre 30% |
| B2B Inter-centres | Centre → Autres centres | Vendeur 80% / Plateforme 20% |
| B2C Grand Public | Auteurs → Public illimité | Auteur 65% / École 15% / Plateforme 20% |

### 💬 Communication
- **Forum étudiant** par filière
- **Chat temps réel** (messages directs, groupes d'étude)
- **Notifications push** pour cours, notes, paiements
- **Live streaming** pour cours en ligne

## 💻 Stack technique

- **Frontend** : [Next.js 16](https://nextjs.org) (App Router, Turbopack), React 19, TailwindCSS, Framer Motion
- **Backend** : [Supabase](https://supabase.com) (PostgreSQL, Auth, Realtime, Storage, RLS)
- **Paiements** : Notch Pay / FedaPay (Mobile Money Afrique)
- **Déploiement** : [Netlify](https://netlify.com)
- **PWA** : Installation native sur mobile

## 📦 Installation

```bash
# Cloner le projet
git clone https://github.com/Klein241/campusflow.git
cd campusflow

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env.local
# Renseigner NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY

# Lancer en développement
npm run dev
```

## 🗄️ Base de données

Exécuter le schéma SQL dans l'éditeur Supabase :
```
supabase-migrations/complete_schema.sql
```

Ce script crée : 20+ tables, RLS, triggers, fonctions PostgreSQL, index et données de départ (13 filières).

## 🌍 Déploiement

1. Connecter le repo GitHub à **Netlify**
2. Branche de production : `principal`
3. Build command : `npm run build`
4. Variables d'environnement : configurer `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 📍 Roadmap

- [x] Schéma SQL multi-tenant complet
- [x] Système de rôles 5+ niveaux avec RLS
- [x] Navigation adaptative par rôle
- [x] 13 filières préconfigurées
- [ ] Routing multi-tenant `/[orgSlug]/`
- [ ] Intégration Notch Pay (Mobile Money)
- [ ] Page d'inscription établissement (onboarding wizard)
- [ ] Dashboard directeur avec KPIs
- [ ] Génération automatique des codes matricules

## 📄 Licence

Projet privé — © 2026 SYGMA-TECH. Tous droits réservés.
