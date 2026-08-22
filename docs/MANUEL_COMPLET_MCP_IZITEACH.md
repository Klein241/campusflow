# 📘 LE MANUEL OFFICIEL DU CONNECTEUR MCP IZITEACH
## *Cahier de Référence Technique & Guide Complet d'Utilisation*

**Version du document :** 2.0.0 (Édition 2026)  
**Plateforme :** IziTeach School Suite  
**Auteur :** Équipe d'Ingénierie & Architecture IA IziTeach  
**Statut :** Production Live (`Cloudflare D1 Primary Edge + Supabase Dual Sync`)

---

## 📑 TABLE DES MATIÈRES

1. [Vision & Présentation Générale](#1-vision--présentation-générale)
2. [Architecture Technique & Protocoles](#2-architecture-technique--protocoles)
3. [Guide de Connexion & Intégration Client](#3-guide-de-connexion--intégration-client)
   - Configuration Claude Desktop
   - Configuration Cursor IDE & Windsurf
   - Configuration Manus AI & Agents Autonomes
   - Utilisation via cURL / SDK Python / Node.js
4. [Catalogue Exhaustif des Outils MCP (37+ Outils)](#4-catalogue-exhaustif-des-outils-mcp)
   - 4.1. Module Pédagogique & Cursus
   - 4.2. Salle d'Évaluation & Examens en Direct
   - 4.3. Formulaires, Sondages & Enquêtes Publiques
   - 4.4. Gestion Académique & Vie Scolaire
   - 4.5. Superadmin & Administration de la Plateforme
   - 4.6. Superagent Marketing & Croissance IA
5. [Écosystème des Assistants IA (Sky Agent)](#5-écosystème-des-assistants-ia-sky-agent)
6. [Sécurité, Isolation Multi-Écoles & RLS](#6-sécurité-isolation-multi-écoles--rls)
7. [Système Automatique de Notifications Push & In-App](#7-système-automatique-de-notifications-push--in-app)
8. [Banc d'Essai Automatisé (Protocole 32/32 Tests)](#8-banc-dessai-automatisé)
9. [Roadmap & Propositions de Fonctionnalités Futures](#9-roadmap--propositions-de-fonctionnalités-futures)

---

## 1. VISION & PRÉSENTATION GÉNÉRALE

Le **Connecteur MCP IziTeach** (Model Context Protocol) est la passerelle d'interopérabilité universelle qui permet aux modèles de langage (LLMs) et aux agents d'intelligence artificielle (Claude, ChatGPT, Manus AI, Cursor, Windsurf, Sky Agent) d'interagir directement, en temps réel et de manière sécurisée avec le système d'information des établissements scolaires, universités et centres de formation.

Grâce au protocole MCP, l'IA ne se contente plus de « répondre à des questions » : **elle agit concrètement dans l'école**.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           AGENTS IA CONNECTÉS                            │
│     Claude Desktop • Cursor • Manus AI • Sky Agent • ChatGPT Pro        │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ JSON-RPC 2.0 / SSE (Auth Bearer)
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   PASSERELLE MCP IZITEACH (EDGE ROUTER)                  │
│             Validation Clé SHA-256 • Permissions RBAC • Audit Log        │
└──────────────────┬───────────────────────────────────────┬───────────────┘
                   │                                       │
                   ▼                                       ▼
┌──────────────────────────────────────┐  ┌────────────────────────────────┐
│      CLOUDFLARE D1 (SQLITE EDGE)     │  │   SUPABASE POSTGRESQL (SYNC)   │
│   • Latence < 15ms                   │  │   • RLS & Row Level Security   │
│   • Haute disponibilité 100%         │  │   • Stockage long terme & Auth │
│   • Mode Offline-First Failover      │  │   • Triggers & Webhooks temps  │
└──────────────────────────────────────┘  └────────────────────────────────┘
```

### Principaux Piliers :
1. **Zéro friction :** L'enseignant ou le directeur peut dicter : *"Crée un cours complet sur la thermodynamique avec 3 chapitres et 10 QCM"* et le MCP génère l'arborescence instantanément.
2. **Double moteur haute disponibilité :** Les requêtes s'exécutent en périphérie réseau (Cloudflare D1 Edge) en moins de 15ms, tout en synchronisant les données de manière bidirectionnelle avec Supabase.
3. **Sécurité militaire :** Cloisonnement strict entre établissements via clés cryptées et isolation totale entre les rôles école et Superadmin.

---

## 2. ARCHITECTURE TECHNIQUE & PROTOCOLES

### Endpoints Officiels en Production :

| Type de Transport | Méthode | URL | Utilisation |
|---|---|---|---|
| **JSON-RPC 2.0 (HTTP)** | `POST` | `https://campusflow-worker.kleintaptue1.workers.dev/mcp-gateway` | Requêtes directes, API, scripts, Claude, Cursor |
| **Server-Sent Events (SSE)** | `GET` | `https://campusflow-worker.kleintaptue1.workers.dev/mcp-gateway` | Flux temps réel, Claude Desktop SSE, streaming |
| **Endpoint Supabase Edge** | `POST` | `https://nuisijvopyudmbcqpaua.supabase.co/functions/v1/mcp-gateway` | Passerelle miroir Supabase Functions |

### Format des Requêtes (Standard JSON-RPC 2.0) :

```json
{
  "jsonrpc": "2.0",
  "id": "req_1700000000",
  "method": "tools/call",
  "params": {
    "name": "create_lesson",
    "arguments": {
      "chapter_id": "ecea67be-684a-45af-9ec6-d85bcbde98ab",
      "title": "Introduction aux Espaces Vectoriels",
      "content": "### Définition\nUn espace vectoriel est un ensemble...",
      "duration_minutes": 45
    }
  }
}
```

---

## 3. GUIDE DE CONNEXION & INTÉGRATION CLIENT

### 3.1. Configuration Claude Desktop (`claude_desktop_config.json`)

Pour connecter Claude Desktop à votre école :

```json
{
  "mcpServers": {
    "iziteach": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://campusflow-worker.kleintaptue1.workers.dev/mcp-gateway",
        "--header",
        "Authorization: Bearer cf_live_VOTRE_CLE_API"
      ]
    }
  }
}
```

### 3.2. Configuration Cursor IDE & Windsurf

Dans `Settings` > `Features` > `MCP Servers` :
- **Name :** `iziteach-mcp`
- **Type :** `command`
- **Command :** `npx -y mcp-remote https://campusflow-worker.kleintaptue1.workers.dev/mcp-gateway --header "Authorization: Bearer cf_live_VOTRE_CLE_API"`

### 3.3. Intégration en Python

```python
import requests

MCP_ENDPOINT = "https://campusflow-worker.kleintaptue1.workers.dev/mcp-gateway"
API_KEY = "cf_live_VOTRE_CLE_API"

def call_iziteach_tool(tool_name: str, arguments: dict):
    payload = {
        "jsonrpc": "2.0",
        "id": "py_req_1",
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": arguments
        }
    }
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    response = requests.post(MCP_ENDPOINT, json=payload, headers=headers)
    return response.json()

# Exemple : création d'une matière
result = call_iziteach_tool("create_subject", {
    "name": "Intelligence Artificielle & Robotique",
    "description": "Cursus spécialisé pour ingénieurs"
})
print(result)
```

---

## 4. CATALOGUE EXHAUSTIF DES OUTILS MCP

---

### 4.1. Module Pédagogique & Cursus

Ces outils permettent de concevoir et structurer l'intégralité du programme pédagogique de l'école.

#### `create_subject`
- **Description :** Crée une nouvelle matière / discipline académique.
- **Paramètres :**
  - `name` *(string, requis)* : Nom de la matière (ex: *"Mathématiques Avancées"*).
  - `description` *(string, optionnel)* : Description ou programme officiel.
  - `color` *(string, optionnel)* : Code couleur hexadécimal.

#### `update_subject` / `delete_subject`
- **Description :** Modifie ou supprime une matière existante.
- **Paramètres :** `subject_id` *(string)*.

#### `create_chapter`
- **Description :** Crée un chapitre rattaché à une matière.
- **Paramètres :**
  - `subject_id` *(string, requis)* : UUID de la matière parente.
  - `title` *(string, requis)* : Titre du chapitre (ex: *"Chapitre 1 : Algèbre Linéaire"*).
  - `position` *(number, optionnel)* : Ordre d'affichage (ex: `1`).

#### `update_chapter` / `delete_chapter`
- **Description :** Modifie ou supprime un chapitre.

#### `create_lesson`
- **Description :** Crée et publie une leçon complète avec support riche Markdown, formules LaTeX, vidéos et **génération/traduction multilingue (Français, Anglais, Arabe + 20 langues locales africaines)**.
- **Paramètres :**
  - `chapter_id` *(string, requis)* : UUID du chapitre.
  - `title` *(string, requis)* : Titre de la leçon.
  - `content` *(string, requis)* : Contenu pédagogique riche.
  - `language` *(string, optionnel)* : Code ISO ou code langue (ex: `sw`, `ha`, `yo`, `ig`, `lin`, `ful`, `ewo`, `dua`, `bam`, `kin`, `mlg`, `fr`, `en`, `ar`, etc. — Défaut : `fr`).
  - `duration_minutes` *(number, optionnel)* : Durée estimée en minutes (défaut : 15).
  - `position` *(number, optionnel)* : Ordre d'affichage dans le chapitre.

#### `create_exercise`
- **Description :** Crée un exercice ou quiz interactif rattaché à une leçon.
- **Sécurité FK :** Rejette immédiatement si la leçon parente n'appartient pas à l'école.
- **Types supportés :** `qcm`, `true_false`, `text`.
- **Paramètres :**
  - `lesson_id` *(string, requis)* : UUID de la leçon.
  - `title` *(string, requis)* : Titre de l'exercice.
  - `type` *(string)* : Type d'exercice (`qcm`, `true_false`, etc.).
  - `question` *(string, requis)* : Énoncé de la question.
  - `choices` *(array de strings)* : Liste des options pour les QCM (ex: `["A", "B", "C"]`).
  - `correct_answer` *(string)* : Bonne réponse attendue.
  - `explanation` *(string)* : Explication pédagogique détaillée.
  - `max_score` *(number)* : Barème / Points accordés (ex: `20`).
  - `language` *(string, optionnel)* : Code langue de l'exercice.

#### `bulk_create` ⚡
- **Description :** Crée en **un seul appel éclair** une matière complète avec tous ses chapitres, leçons et exercices associés, avec propagation automatique de la langue.
- **Paramètres :** Arborescence imbriquée complète JSON avec support de `language`.

#### `list_supported_languages` 🌍 *(Nouveau)*
- **Description :** Liste l'intégralité des langues supportées par le moteur IA d'IziTeach (5 langues internationales + 20 langues africaines locales).
- **Paramètres :**
  - `only_african` *(boolean, optionnel)* : Si `true`, retourne uniquement les langues africaines locales.

#### `translate_content` ⚡ *(Nouveau)*
- **Description :** Traduit à la volée un texte ou contenu pédagogique vers une langue locale africaine (ou internationale) via le modèle neuronal **Cloudflare AI M2M-100 Meta**. Permet également de mettre à jour directement une leçon (`lesson_id`) ou un exercice (`exercise_id`).
- **Paramètres :**
  - `text` *(string, requis)* : Texte à traduire.
  - `target_language` *(string, requis)* : Code de la langue cible (ex: `sw`, `lin`, `ful`, `ha`, `yo`, `ewo`, `dua`, etc.).
  - `source_language` *(string, optionnel)* : Code langue d'origine (défaut : `fr`).
  - `lesson_id` *(string, optionnel)* : ID d'une leçon à mettre à jour directement.
  - `exercise_id` *(string, optionnel)* : ID d'un exercice à mettre à jour.

---

### 4.1.bis Référentiel des Langues Africaines Supportées

| Code | Langue | Nom Natif | Niveau IA | Pays Principaux | Locuteurs |
|---|---|---|---|---|---|
| `sw` | Swahili | Kiswahili | 🟢 Tier 1 (Natif) | Kenya, Tanzanie, RDC, Ouganda, Rwanda | 200M |
| `ha` | Haoussa | Hausa | 🟢 Tier 1 (Natif) | Nigeria, Niger, Cameroun | 85M |
| `yo` | Yoruba | Yorùbá | 🟢 Tier 1 (Natif) | Nigeria, Bénin, Togo | 50M |
| `ig` | Igbo | Igbo | 🟢 Tier 1 (Natif) | Nigeria | 44M |
| `am` | Amharique | አማርኛ | 🟢 Tier 1 (Natif) | Éthiopie | 57M |
| `zu` | Zoulou | isiZulu | 🟢 Tier 1 (Natif) | Afrique du Sud | 13M |
| `wo` | Wolof | Wolof | 🟢 Tier 1 (Natif) | Sénégal, Gambie | 12M |
| `tw` | Twi (Akan) | Twi | 🟢 Tier 1 (Natif) | Ghana | 10M |
| `so` | Somali | Soomaali | 🟢 Tier 1 (Natif) | Somalie, Djibouti, Éthiopie | 22M |
| `lin` | Lingala | Lingála | ⚡ Tier 2 (M2M100) | RDC, Congo | 80M |
| `ful` | Fulfulde/Peul | Fulfulde | ⚡ Tier 2 (M2M100) | Cameroun, Guinée, Mali, Sénégal, Niger | 40M |
| `bam` | Bambara | Bamanankan | ⚡ Tier 2 (M2M100) | Mali | 15M |
| `kin` | Kinyarwanda | Kinyarwanda | ⚡ Tier 2 (M2M100) | Rwanda, Ouganda, RDC | 12M |
| `mlg` | Malgache | Malagasy | ⚡ Tier 2 (M2M100) | Madagascar | 25M |
| `dyu` | Dioula | Dioula | ⚡ Tier 2 (M2M100) | Burkina Faso, Côte d'Ivoire | 12M |
| `bci` | Baoulé | Baoulé | ⚡ Tier 2 (M2M100) | Côte d'Ivoire | 4M |
| `dje` | Zarma | Zarma | ⚡ Tier 2 (M2M100) | Niger | 5M |
| `ewo` | Ewondo | Ewondo | ⚡ Tier 2 (M2M100) | Cameroun (Centre/Sud) | 1M+ |
| `dua` | Duala | Duala | ⚡ Tier 2 (M2M100) | Cameroun (Littoral) | 1M+ |
| `fan` | Beti-Fang | Fang | ⚡ Tier 2 (M2M100) | Cameroun, Gabon, Guinée Éq. | 1M+ |


---

### 4.2. Salle d'Évaluation & Examens en Direct

Permet la création de devoirs sur table numériques, examens partiels et sessions d'évaluation chronométrées anti-triche.

#### `create_exam_paper`
- **Description :** Crée une épreuve d'examen dans la Salle d'Évaluation.
- **Paramètres :**
  - `title` *(string, requis)* : Intitulé de l'épreuve (ex: *"Examen Blanc : Physique Quantique"*).
  - `subject` *(string)* : Matière concernée.
  - `coefficient` *(number)* : Coefficient académique (ex: `3.0`).
  - `duration_minutes` *(number)* : Temps imparti (ex: `90`).
  - `instructions` *(string)* : Consignes et consignes anti-fraude.
  - `questions` *(array d'objets)* : Questions avec barème individuel (QCM ou Rédaction).
  - `status` *(string)* : `'draft'` ou `'published'`.

#### `list_exam_papers`
- **Description :** Liste les épreuves d'examen avec filtre par matière ou statut.

#### `launch_exam_session` 🚀
- **Description :** Ouvre la salle d'examen en direct et envoie une notification push instantanée à tous les étudiants de la classe pour démarrer l'épreuve.
- **Paramètres :**
  - `paper_id` *(string, requis)* : UUID de l'épreuve à lancer.
  - `participant_ids` *(array de strings, optionnel)* : Liste d'étudiants cibles.

---

### 4.3. Formulaires, Sondages & Enquêtes Publiques

Permet de recueillir l'avis des étudiants, des enseignants ou du public via un lien web direct.

#### `create_form`
- **Description :** Crée un formulaire/sondage avec génération d'un slug propre et publication immédiate (`/[orgSlug]/f/[slug]`).
- **Paramètres :**
  - `title` *(string, requis)* : Titre du formulaire (ex: *"Enquête de satisfaction rentrée"*).
  - `description` *(string)* : Objectif du sondage.
  - `form_type` *(string)* : `'survey'`, `'quiz'` ou `'registration'`.
  - `is_published` *(boolean)* : Statut de publication (défaut : `true`).
  - `fields` *(array d'objets)* : Champs (texte court, texte long, note 1-5 étoiles, choix multiple, date).

#### `get_form_results`
- **Description :** Récupère toutes les réponses soumises, les scores obtenus et les statistiques de participation.

---

### 4.4. Gestion Académique, Administration & Finances Scolaires

#### `list_students`
- **Description :** Consulte la liste des élèves inscrits (nom, prénom, classe, matricule, contacts parents).
- **Paramètres :** `class_id` *(optionnel)*, `search` *(optionnel)*, `limit` *(optionnel, max: 100)*.

#### `create_student` *(Nouveau)*
- **Description :** Inscrit un nouvel élève avec génération automatique de matricule (`IZI-2026-XXXX`) et rattachement à sa classe.
- **Paramètres :**
  - `first_name` *(string, requis)* : Prénom de l'élève.
  - `last_name` *(string, requis)* : Nom de famille.
  - `classroom_id` *(string, optionnel)* : UUID de la classe.
  - `matricule` *(string, optionnel)* : Matricule personnalisé.
  - `parent_name` / `parent_phone` *(string, optionnel)* : Coordonnées du tuteur légal.

#### `update_student` / `delete_student` *(Nouveaux)*
- **Description :** Modifie les informations ou supprime le dossier d'un élève.

#### `list_teachers` / `create_teacher` *(Nouveaux)*
- **Description :** Liste ou enregistre les professeurs avec leur spécialité, leurs diplômes et la génération automatique d'un code d'accès (`ENS-XXXXXX`).

#### `record_payment` 💰 *(Nouveau)*
- **Description :** Enregistre un versement de frais de scolarité (Cash, Orange Money, MTN MoMo, Virement bancaire, etc.) avec reçu certifié et notification Push automatique.
- **Paramètres :**
  - `student_id` *(string, requis)* : UUID de l'élève.
  - `amount` *(number, requis)* : Montant versé en XAF.
  - `payment_method` *(string)* : `'cash'`, `'momo'`, `'orange_money'`, `'bank'`, `'other'`.
  - `term` *(string)* : `'Trimestre 1'`, `'Trimestre 2'`, `'Trimestre 3'`, `'Inscription'`.
  - `academic_year` *(string)* : Ex. `'2025-2026'`.
  - `reference` *(string, optionnel)* : Numéro de reçu ou référence transaction.

#### `list_payments` 💰 *(Nouveau)*
- **Description :** Consulte l'historique financier avec calcul automatique du total encaissé (`total_amount_xaf`).

#### `get_school_stats` 📊 *(Nouveau)*
- **Description :** Fournit le tableau de bord chiffré en direct : effectif total élèves, total professeurs, nombre de classes, matières, leçons, épreuves et total des revenus scolarité perçus.

#### `create_grade` / `list_grades`
- **Description :** Enregistre ou consulte les notes et moyennes officielles des élèves.

#### `list_attendance`
- **Description :** Consulte l'historique d'assiduité et le registre des présences.

#### `list_schedule` / `update_schedule`
- **Description :** Consulte et met à jour l'emploi du temps hebdomadaire de chaque classe.

---

### 4.5. Superadmin & Administration Plateforme

*(Outils strictement réservés aux Superadmins autorisés — Permission `superadmin:*`)*

- **`list_support_messages` / `reply_support_message` :** Gestion des tickets de support et demandes de Sky Points.
- **`credit_sky_points` :** Crédite des Sky Points à un compte ou une organisation.
- **`list_bug_reports` / `update_bug_status` :** Suivi et traitement des signalements de bugs.
- **`send_superadmin_announcement` :** Diffusion d'une alerte générale sur toutes les écoles.
- **`get_platform_stats` :** Métriques globales (nombre total d'organisations, élèves, professeurs).

---

### 4.6. Superagent Marketing & Croissance IA

*(Outils dédiés à la prospection automatisée, au scraping et à la conversion — Permission `superadmin:marketing`)*

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    SUPERAGENT MARKETING & CROISSANCE IA                  │
└────────────────────────────────────┬─────────────────────────────────────┘
         │                           │                           │
         ▼                           ▼                           ▼
┌──────────────────┐       ┌──────────────────┐       ┌────────────────────┐
│ 🔍 DEEP RESEARCH │       │ ✉️ EMAIL DRIP    │       │ 🎨 STUDIO CRÉATIF  │
│  & SCRAPING WEB  │       │  & TRACKING LIVE │       │  & IMAGE REMIX IA  │
│ • Google Maps    │       │ • Pixel 1x1 lu 👁️│       │ • Upload flyer ref │
│ • LinkedIn Pro   │       │ • Séquences J+0  │       │ • Bannières 1200   │
│ • Extraction mail│       │   à J+14 auto    │       │ • Copywriting B2B  │
│ • Score Lead     │       │ • Smart Reply IA │       │ • WhatsApp direct  │
└──────────────────┘       └──────────────────┘       └────────────────────┘
```

#### `marketing_deep_research`
- **Description :** Lance un crawling sémantique approfondi pour identifier et qualifier des écoles, universités et centres de formation cibles.
- **Extraction :** Nom de l'établissement, décideur clé (Directeur, Proviseur), email direct, téléphone, site web, ville, pays et score de qualification (1-100).

#### `marketing_create_campaign`
- **Description :** Crée une campagne email ciblée avec variables dynamiques (`{{nom}}`, `{{ecole}}`, `{{ville}}`).

#### `marketing_send_campaign`
- **Description :** Expédie les emails avec injection du **pixel de détection d'ouverture 1x1 transparent** et tracking des clics sur les liens.

#### `marketing_generate_ad_creative`
- **Description :** Générateur de copywriting publicitaire et studio de **remix d'images / flyers publicitaires**.

#### `marketing_list_leads` / `marketing_get_stats`
- **Description :** Suivi en temps réel du CRM des prospects (statuts : *Nouveau*, *Contacté*, *Email Ouvert 👁️*, *Cliqué 🔗*, *Converti 🏆*) et KPIs de conversion globale.

---

## 5. ÉCOSYSTÈME DES ASSISTANTS IA (SKY AGENT)

Sky Agent est le copilote conversationnel et interactif d'IziTeach. Il intervient à 3 niveaux :

1. **Sky Agent pour les Élèves :**
   - Soutien scolaire personnalisé 24h/24.
   - Aide interactive sur les formulaires et sondages (`/f/[slug]`) via le bouton dédié sans triche.
   - Explication pas-à-pas des notions complexes et exercices ratés.

2. **Sky Agent pour les Enseignants :**
   - Génération instantanée de plans de cours, d'évaluations et de barèmes.
   - Calcul automatique des moyennes et synthèses de notes.

3. **Sky Agent pour le Superadmin (AI Closer) :**
   - Smart Reply pour répondre instantanément aux directeurs d'écoles intéressés.
   - Analyse automatique des logs d'erreurs et des anomalies de la plateforme.

---

## 6. SÉCURITÉ, ISOLATION MULTI-ÉCOLES & RLS

La sécurité du connecteur MCP repose sur une politique de défense en profondeur à 4 niveaux :

1. **Hachage Cryptographique SHA-256 :** Aucune clé API n'est stockée en clair dans la base de données. Seul le hash SHA-256 est vérifié à chaque appel.
2. **Isolation Tenant Stricte :** Les requêtes d'une école $A$ ne peuvent **en aucun cas** lire, modifier ou supprimer les données d'une école $B$. Le `org_id` est injecté de manière immuable au niveau du contexte serveur.
3. **Contrôle d'Accès Basé sur les Rôles (RBAC) :**
   - Les clés école disposent uniquement des permissions `read:curriculum`, `write:curriculum`, `read:grades`, etc.
   - Les outils Superadmin (`superadmin:*`) renvoient immédiatement une erreur HTTP `403 (Permission non accordée)` si une clé école tente de les invoquer.
4. **Audit Trail Immuable (`ai_agent_logs`) :** Chaque invocation d'outil MCP est tracée avec son horodatage, sa durée en millisecondes, l'agent appelant, les arguments fournis et le statut d'exécution.

---

## 7. SYSTÈME AUTOMATIQUE DE NOTIFICATIONS PUSH & IN-APP

À chaque action pédagogique réalisée via le MCP, le Worker déclenche automatiquement une double diffusion :
- **Web Push Notification :** Envoi vers les navigateurs et smartphones des élèves abonnés.
- **Notification In-App :** Enregistrement dans le centre de notifications de l'application.

### Événements Déclencheurs Automatiques :
- 📚 **Création d'une nouvelle leçon :** *"Une nouvelle leçon a été publiée dans votre cours !"*
- 📝 **Ajout d'un exercice :** *"Nouvel entraînement disponible pour tester vos connaissances."*
- 🎯 **Lancement d'un examen en direct :** *"L'épreuve est lancée dans la Salle d'Évaluation. Rejoignez la session !"*
- 📊 **Publication d'un sondage :** *"Votre avis compte ! Répondez dès maintenant au sondage."*

---

## 8. BANC D'ESSAI AUTOMATISÉ

Le fichier `scripts/test-mcp-expert.mjs` permet de tester de bout en bout l'ensemble des 32 scénarios opérationnels en conditions réelles de production :

```bash
node scripts/test-mcp-expert.mjs
```

### Synthèse des Résultats Validés :
```
═════════════════════════════════════════════════════════════════════
  BILAN DU PROTOCOLE DE TEST EXPERT : 32 RÉUSSIS / 32 TOTAL (0 ÉCHEC)
═════════════════════════════════════════════════════════════════════
```

---

## 9. ROADMAP & PROPOSITIONS DE FONCTIONNALITÉS FUTURES

Pour propulser IziTeach comme le standard absolu de l'éducation augmentée par l'IA en Afrique et à l'international, voici les axes d'évolution recommandés pour les prochaines versions du MCP :

### 🎙️ 1. Voice MCP Agent (Assistant Vocal Pédagogique)
- **Fonctionnalité :** Possibilité pour les élèves et enseignants d'interagir avec le MCP par la voix en langues locales (Français, Anglais, Wolof, Lingala, Duala, Baoulé, etc.).
- **Usage :** L'élève pose une question à haute voix et le MCP répond vocalement avec des explications claires et interactives.

### 📱 2. WhatsApp MCP Autonomous Bot
- **Fonctionnalité :** Connecteur MCP direct sur l'API WhatsApp Business.
- **Usage :** Les parents et étudiants peuvent envoyer un message WhatsApp (ex: *"Mon emploi du temps de demain"*, *"Mes notes du trimestre"*, *"Justifier une absence"*) et le MCP traite la requête en direct.

### 👁️ 3. Correction Automatique d'Examens par Vision IA (`ocr_grade_exam`)
- **Fonctionnalité :** L'enseignant prend en photo une pile de copies manuscrites.
- **Usage :** Le MCP analyse l'écriture de l'élève, confronte avec le barème officiel de l'épreuve, attribue les points et enregistre directement les notes sur le bulletin avec annotations constructives.

### 📅 4. Générateur Intelligent d'Emploi du Temps sous Contraintes (`auto_generate_schedule`)
- **Fonctionnalité :** Résolution par IA des contraintes complexes de rentrée : disponibilités des professeurs, capacité des salles, répartition horaire hebdomadaire sans aucun chevauchement.

### 💳 5. Passerelle de Paiement Mobile Money via MCP (`process_tuition_payment`)
- **Fonctionnalité :** Outil MCP permettant le déclenchement et le suivi des paiements de scolarité via Orange Money, MTN MoMo, Wave ou Moov Money avec émission automatique de reçu numérique.

### 🛡️ 6. Surveillance Intelligente & Anti-Fraude d'Examen (`exam_proctoring_guard`)
- **Fonctionnalité :** Détection automatique des changements d'onglets, des copier-coller suspects et analyse de cohérence stylométrique lors des rédactions d'examens en ligne.

---

*Fin du Manuel — IziTeach School Suite © 2026. Tous droits réservés.*
