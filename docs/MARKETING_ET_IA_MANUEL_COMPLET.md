# 🚀 Manuel Complet & Guide Stratégique : Marketing & IA (IziTeach Pro)

> **Plateforme :** IziTeach School Suite & CampusFlow  
> **Version :** 2.5 (2026)  
> **Accès :** Superadmin Hub → Onglet `🚀 Marketing & IA`  
> **Intégrations :** Protocol MCP (Model Context Protocol), Cloudflare Workers AI, PostgreSQL Supabase, D1 Cache, VAPID Push & Pixel Tracking.

---

## 📋 Table des Matières
1. [Vision & Architecture Globale](#1-vision--architecture-globale)
2. [Les 7 Modules du Hub Marketing](#2-les-7-modules-du-hub-marketing)
   - [Module 1 : 🔍 Deep Research & Web/Social Scraping IA](#module-1--deep-research--websocial-scraping-ia)
   - [Module 2 : ✉️ Campagnes & Envois Ciblés](#module-2-️-campagnes--envois-ciblés)
   - [Module 3 : ⚡ Séquences Automatisées (Drip J+0 à J+14)](#module-3--séquences-automatisées-drip-j0-à-j14)
   - [Module 4 : 🎨 Studio Publicitaire & Remix IA](#module-4--studio-publicitaire--remix-ia)
   - [Module 5 : 💬 Boîte de Réception & IA Closer](#module-5--boîte-de-réception--ia-closer)
   - [Module 6 : 📊 CRM & Tracking en Direct](#module-6--crm--tracking-en-direct)
   - [Module 7 : 📅 Calendrier & Planning](#module-7--calendrier--planning)
3. [Dictionnaire Géo-Éducatif & Intégrité des Données](#3-dictionnaire-géo-éducatif--intégrité-des-données)
4. [Intégration avec les Agents IA Externes (MANUS IA, Claude, ChatGPT via MCP)](#4-intégration-avec-les-agents-ia-externes-manus-ia-claude-chatgpt-via-mcp)
5. [Guide Pratique : Du Scraping à la Signature d'une École](#5-guide-pratique--du-scraping-à-la-signature-dune-école)

---

## 1. Vision & Architecture Globale

Le module **Marketing & IA** est le moteur de croissance autonome d'IziTeach. Il a été conçu pour permettre au Superadmin (propriétaire de la plateforme) ainsi qu'à ses agents IA autonomes (MANUS IA, Claude, scripts MCP) d'acquérir, convertir et onboarder des écoles et centres de formation en Afrique et à l'international.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           IZITEACH SUPERADMIN                               │
│                         HUB MARKETING & IA (7 TABS)                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                │                                             │
      ┌─────────▼─────────┐                         ┌─────────▼─────────┐
      │   INTERFACE WEB   │                         │  GATEWAY MCP 2.0  │
      │   (React / Next)  │                         │ (Agents IA/MANUS) │
      └─────────┬─────────┘                         └─────────┬─────────┘
                │                                             │
                └──────────────────────┬──────────────────────┘
                                       │
                ┌──────────────────────▼──────────────────────┐
                │     BASE DE DONNÉES & SERVICES CLOUD        │
                │  - Supabase PostgreSQL (Table marketing_*)  │
                │  - Cloudflare D1 Cache & Workers Edge       │
                │  - Pixel de Tracking d'Ouverture & Clics    │
                └─────────────────────────────────────────────┘
```

---

## 2. Les 7 Modules du Hub Marketing

### Module 1 : 🔍 Deep Research & Web/Social Scraping IA

* **Objectif :** Extraire automatiquement les décideurs (Directeurs Généraux, Proviseurs, Responsables Pédagogiques) dans le pays ciblé.
* **Critères de prospection :**
  - **Type d'Établissement :** Écoles Privées, Universités & Grandes Écoles, Centres de Formation Professionnelle, Instituts de Langues, Lycées Modernes, Entreprises & Hubs EdTech.
  - **Pays :** Gabon (`+241`), Cameroun (`+237`), Côte d'Ivoire (`+225`), Sénégal (`+221`), Congo (`+242`), RDC (`+243`), etc.
  - **Ville :** Libreville, Port-Gentil, Douala, Yaoundé, Abidjan, Dakar, etc.
  - **Mots-clés ciblés :** Ex: *Directeur, Proviseur, Formation Bilingue, Informatique*.
  - **Canaux de recherche :** Google Search & Maps, LinkedIn Pro, Facebook Pages, Annuaires Officiels.
* **Sortie :**
  - Fiche prospect qualifiée avec **Score IA (80% à 100%)**.
  - Email direct (`direction@nom-edu.ga`), téléphone national formaté, site web.
  - **Export CSV** instantané ou bouton direct *« Lancer une campagne avec ces prospects »*.

---

### Module 2 : ✉️ Campagnes & Envois Ciblés

* **Objectif :** Rédiger et envoyer des propositions commerciales engageantes avec mesure du taux d'ouverture.
* **Fonctionnalités clés :**
  - **Variables dynamiques personnalisées :**
    - `{{nom}}` : Nom du contact (ex: Dr. Joseph Ndongo)
    - `{{ecole}}` : Nom de l'établissement (ex: Groupe Scolaire Élite)
    - `{{ville}}` : Ville de l'école (ex: Libreville)
    - `{{lead_id}}` : Identifiant unique pour le tracking
  - **Tracking Pixel Invisible :** Détection en direct de l'ouverture de l'email par le destinataire (`/api/track/open/{{lead_id}}`).
  - **Mode d'expédition :**
    - *Envoi Immédiat*
    - *Envoi Programmé (Sélection de la date et de l'heure exacte)*.
  - **Relance Automatique :** Option de relance automatique activable (ex: J+3).

---

### Module 3 : ⚡ Séquences Automatisées (Drip J+0 à J+14)

* **Objectif :** Automatiser le cycle de relance sans aucune intervention humaine.
* **Scénario standard préconfiguré :**

| Étape | Délai | Déclencheur / Condition | Message & Objectif |
|---|---|---|---|
| **Étape 1** | **J+0** | *Toujours* | Présentation IziTeach School Suite, bulletins en 1 clic & Dame SKY. |
| **Étape 2** | **J+3** | *Si non ouvert* | Relance douce mettant en avant le gain de temps pour les professeurs. |
| **Étape 3** | **J+7** | *Si ouvert sans clic* | Vidéo de démonstration de la Salle d'Évaluation interactive anti-triche. |
| **Étape 4** | **J+14** | *Si cliqué sans conversion* | Offre spéciale rentrée : Essai gratuit 30 jours + formation enseignants offerte. |

* **Bouton Master :** Possibilité de mettre en pause (⏸️) ou d'activer (▶️) toutes les automatisations en 1 clic.

---

### Module 4 : 🎨 Studio Publicitaire & Remix IA

* **Objectif :** Générer des visuels publicitaires et des copywritings percutants pour les réseaux sociaux, bannières et flyers.
* **Fonctionnalités :**
  - **Formats supportés :** Bannière Email, Flyer A4 / A5, Post Réseaux Sociaux (1:1), Story Mobile (9:16).
  - **Remixage d'Image :** Importez une photo de votre flyer papier ou d'un visuel existant pour le moderniser via l'IA.
  - **Générateur de Copywriting :**
    - Accroche percutante (*Headline*)
    - Argumentaire commercial structuré (*Body Copy*)
    - Appel à l'action irrésistible (*Call to Action - CTA*)
  - Copie rapide en presse-papier et export d'image.

---

### Module 5 : 💬 Boîte de Réception & IA Closer

* **Objectif :** Traiter les réponses des directeurs d'école et obtenir un rendez-vous de démonstration.
* **Fonctionnalités :**
  - Regroupement centralisé des messages et demandes d'informations reçus.
  - **Smart Reply IA (Bouton d'or ✨) :** Analyse la question du directeur (tarifs, fonctionnement hors-ligne, formation) et génère instantanément une réponse chaleureuse, précise et incitative à la réservation de démo.
  - Bouton d'expédition directe de la réponse.

---

### Module 6 : 📊 CRM & Tracking en Direct

* **Objectif :** Analyser le tunnel de vente et suivre l'état de chaque prospect.
* **Indicateurs KPIs temps réel :**
  - **Total Prospects Scrapés :** Nombre total de leads enregistrés en base.
  - **Prospects Qualifiés :** Leads avec score IA supérieur à 80%.
  - **Taux d'Ouverture :** Pourcentage d'emails effectivement ouverts.
  - **Taux de Clics :** Pourcentage de prospects ayant cliqué sur le lien de démo.
  - **Conversions :** Établissements déployés et abonnés.
* **Filtres Avancés :** Filtrage par pays (*Gabon, Cameroun, Côte d'Ivoire...*), par ville et par statut (*Nouveau, Contacté, Ouvert, Cliqué, Converti*).
* **Modal d'enrichissement :** Audit approfondi d'un établissement en un clic.

---

### Module 7 : 📅 Calendrier & Planning

* **Objectif :** Planifier la stratégie marketing sur l'année scolaire.
* **Fonctionnalités :**
  - Vue calendaire des campagnes prévues, des relances drip et des démonstrations confirmées.

---

## 3. Dictionnaire Géo-Éducatif & Intégrité des Données

Afin de garantir un réalisme absolu lors du scraping et des campagnes, le système utilise un **dictionnaire géo-éducatif strict** :

| Pays | Indicatif Téléphonique | Domaines TLD | Exemples de Villes | Établissements Référencés |
|---|---|---|---|---|
| 🇬🇦 **Gabon** | `+241` (ex: `+241 011...`, `+241 077...`) | `.ga`, `.com` | Libreville, Port-Gentil, Franceville, Oyem | Groupe Scolaire Élite Libreville, Complexe Scolaire Michel Dirat, IST-L, IAI Gabon, Sainte-Marie |
| 🇨🇲 **Cameroun** | `+237` (ex: `+237 6...`) | `.cm`, `.edu.cm` | Douala, Yaoundé, Bafoussam, Buea | Institut Supérieur d'Excellence (ISE), Collège Libermann, UCAC, Avenir Pro |
| 🇨🇮 **Côte d'Ivoire** | `+225` (ex: `+225 07...`) | `.ci`, `.edu.ci` | Abidjan, Bouaké, Yamoussoukro | Lycée International Les Cocotiers, Sainte-Marie de Cocody, ISMI, UIPA |
| 🇸🇳 **Sénégal** | `+221` (ex: `+221 77...`, `+221 33...`) | `.sn`, `.edu.sn` | Dakar, Thiès, Saint-Louis | Académie Polytech Dakar, ISM Dakar, BEM Dakar, Hampâté Bâ |

---

## 4. Intégration avec les Agents IA Externes (MANUS IA, Claude via MCP)

Les agents IA peuvent interagir avec le module via les 6 outils MCP suivants :

```json
// 1. Scraping par pays
{
  "name": "marketing_deep_research",
  "arguments": {
    "country": "Gabon",
    "city": "Libreville",
    "target_type": "ecoles_privees",
    "keywords": "Directeur, Formation Bilingue"
  }
}

// 2. Consultation du CRM filtré
{
  "name": "marketing_list_leads",
  "arguments": {
    "country": "Gabon",
    "status": "new"
  }
}

// 3. Création de campagne
{
  "name": "marketing_create_campaign",
  "arguments": {
    "title": "Rentrée Numérique Libreville 2026",
    "subject": "Modernisez {{ecole}} avec IziTeach Pro 🚀",
    "html_content": "<h2>Bonjour {{nom}},</h2><p>Découvrez IziTeach...</p>"
  }
}

// 4. Envoi de campagne
{
  "name": "marketing_send_campaign",
  "arguments": {
    "campaign_id": "camp_123456",
    "lead_ids": ["lead_ga_1", "lead_ga_2"]
  }
}

// 5. Génération visuelle & pub
{
  "name": "marketing_generate_ad_creative",
  "arguments": {
    "product": "IziTeach School Suite",
    "format": "email_banner"
  }
}

// 6. Statistiques et KPIs
{
  "name": "marketing_get_stats",
  "arguments": {}
}
```

---

## 5. Guide Pratique : Du Scraping à la Signature d'une École

1. **Étape 1 : Scraping** → Rendez-vous dans *Deep Research*, sélectionnez le pays (ex: `Gabon`) et cliquez sur *« Lancer le Deep Research IA »*.
2. **Étape 2 : Sélection** → Cochez les prospects extraits et cliquez sur *« Lancer une campagne ciblée »*.
3. **Étape 3 : Personnalisation** → Dans l'éditeur de campagne, vérifiez le texte avec les balises `{{nom}}` et `{{ecole}}`, puis choisissez l'envoi immédiat ou programmé.
4. **Étape 4 : Suivi des Ouvertures** → Consultez l'onglet *CRM & Tracking* pour repérer les directeurs ayant ouvert l'email.
5. **Étape 5 : Réponse & RDV Démo** → Dès qu'un directeur répond, rendez-vous dans *Boîte de Réception*, générez la réponse avec *Smart Reply IA* et validez la date de la démo en ligne.

---
*© 2026 IziTeach Pro — SYGMA-TECH. Tous droits réservés.*
