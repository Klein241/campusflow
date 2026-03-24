# 🕊️ CentreFormation Pro - Prayer CentreFormation App

**CentreFormation Pro** est une application web progressive (PWA) complète conçue pour connecter les croyants dans une expérience de prière, d'étude biblique et de communion en ligne.

![Aperçu de l'application](public/window.svg)

## 🚀 Fonctionnalités Principales

### 🙏 Groupes de Prière & CentreFormation
- **Création de Groupes** : Créez des espaces dédiés pour des sujets de prière spécifiques.
- **CentreFormations de Prière** : Organisez des sessions de prière continues (24/7) avec des créneaux horaires.
- **Retours d'expérience** : Partagez et célébrez les prières exaucées.

### 💬 Communication & Forum étudiant
- **Chat Temps Réel** : Messagerie instantanée style WhatsApp avec support des émojis et réactions.
- **Messages Vocaux** : Enregistrez et partagez des prières ou encouragements vocaux.
- **Appels Vidéo** : Réunions de groupe et appels individuels intégrés.
- **Système d'Amis** : Connectez-vous avec d'autres membres, envoyez des demandes d'amis.

### 📖 Bible & Étude
- **Lecteur Biblique** : Accès complet à la Bible (LSG, KJV) avec recherche rapide.
- **Jeux Bibliques** : Testez vos connaissances avec des Quiz et Mots Mêlés générés dynamiquement.
- **Notes & Surlignage** : Personnalisez votre étude biblique.

### 🛠️ Administration
- **Dashboard Complet** : Gestion des utilisateurs, modération de contenu et analyses.
- **Notifications** : Système d'annonces et de notifications push.

## 💻 Stack Technique

- **Frontend** : [Next.js 14](https://nextjs.org) (App Router), React, TailwindCSS, Framer Motion.
- **Backend** : [Supabase](https://supabase.com) (PostgreSQL, Auth, Realtime, Storage).
- **Déploiement** : Optimisé pour [Netlify](https://netlify.com).

## 📦 Installation & Démarrage

1. **Cloner le projet**
   ```bash
   git clone https://github.com/votre-username/centreformation.git
   cd centreformation
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer les variables d'environnement**
   Créez un fichier `.env.local` et ajoutez vos clés Supabase :
   ```env
   NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
   SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role
   ```

4. **Lancer en développement**
   ```bash
   npm run dev
   ```

## 🌍 Déploiement

Ce projet est configuré pour un déploiement facile sur **Netlify**.
Voir le guide [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md) pour les détails.

