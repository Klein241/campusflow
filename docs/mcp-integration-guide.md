# 📘 Guide — MCP IziTeach (Sky Agent)

> **Pour qui ?** Ce guide est destiné à tout Sky Agent (Claude, Manus, ChatGPT, Antigravity, etc.) qui reçoit une clé API IziTeach. Il décrit comment se connecter, quelles actions sont disponibles et comment les utiliser.

---

## 🔌 Connexion au MCP IziTeach

### Endpoint Principal (Cloudflare D1 — Haute performance & Concurrence massive)

```
POST https://campusflow-worker.kleintaptue1.workers.dev/mcp-gateway
```

### Endpoint Secondaire (Supabase Failover)

```
POST https://nuisijvopyudmbcqpaua.supabase.co/functions/v1/mcp-gateway
```

### Format de requête (JSON-RPC 2.0)

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "id": 1,
  "params": {
    "name": "NOM_DE_L_OUTIL",
    "arguments": { }
  }
}
```

### En-têtes obligatoires

```
Authorization: Bearer cf_live_VOTRE_CLE
Content-Type: application/json
```

### Vérifier la connexion

```json
{ "jsonrpc": "2.0", "method": "ping", "id": 0 }
```

Réponse attendue :
```json
{ "jsonrpc": "2.0", "result": { "pong": true, "engine": "Cloudflare D1 Primary Edge (SQLite)", "agent": "NomAgent" }, "id": 0 }
```

---

## ⚙️ Configuration sur Manus IA

1. Dans Manus → **Paramètres** → **MCP** → **Ajouter un serveur**
2. Remplir comme suit :

| Champ | Valeur |
|-------|--------|
| **Nom du serveur** | `IziTeach` |
| **Type de transport** | `HTTP` |
| **URL (Cloudflare Principal)** | `https://campusflow-worker.kleintaptue1.workers.dev/mcp-gateway` |
| **Remarque** | Colle le contenu de ce guide dans ce champ |

3. Dans **Variables d'environnement** → ajouter :

| Clé | Valeur |
|-----|--------|
| `IZITEACH_KEY` | `cf_live_VOTRE_CLE_API` |

> Si Manus demande une **Commande** (STDIO), utilise plutôt le type **HTTP** qui ne nécessite pas de script local.

---

## 🛠️ Outils disponibles

### Consulter les données

| Outil | Description | Arguments requis |
|-------|------------|-----------------|
| `get_org_info` | Infos de l'école | — |
| `list_classes` | Liste des classes | — |
| `list_subjects` | Liste des matières | `class_id` (opt.) |
| `list_chapters` | Chapitres d'une matière | `subject_id` |
| `list_lessons` | Leçons d'un chapitre | `chapter_id` |
| `list_students` | Étudiants | `class_id` (opt.) |

### Créer du contenu

| Outil | Description | Arguments requis |
|-------|------------|-----------------|
| `create_subject` | Créer une matière | `name` |
| `create_chapter` | Créer un chapitre | `subject_id`, `title` |
| `create_lesson` | Créer une leçon | `chapter_id`, `title`, `content` |
| `create_exercise` | Créer un exercice | `lesson_id`, `title`, `question`, `type`, `correct_answer` |

### ⚡ Outils Superadmin (Master Agent)

| Outil | Description | Arguments |
|-------|------------|-----------|
| `list_support_messages` | Lister les tickets & requêtes Sky Requests | `status` (opt), `limit` (opt) |
| `reply_support_message` | Répondre à un ticket utilisateur | `request_id`, `reply_message` |
| `credit_sky_points` | Vendre / créditer des Sky Points | `target_type` ('org'/'user'), `target_id`, `points` |
| `list_inactive_orgs` | Lister les écoles inactives (>30j) | `days_inactive` (opt) |
| `send_email_to_org` | Envoyer un email direct à une école | `org_id`, `subject`, `message` |
| `list_bug_reports` | Consulter les rapports de bugs | `status` (opt) |
| `update_bug_status` | Traiter / résoudre un bug | `bug_id`, `status`, `admin_note` |
| `generate_bug_summary_report` | Analyse synthétique des bugs | `period_days` (opt) |
| `send_superadmin_announcement` | Diffuser une annonce globale | `title`, `content`, `target_org_id` |
| `get_platform_stats` | Statistiques globales IziTeach | — |

---

## Exemple complet — Créer une leçon

```json
// Étape 1 : Lister les matières
{ "jsonrpc": "2.0", "method": "tools/call", "id": 1,
  "params": { "name": "list_subjects", "arguments": {} } }

// Étape 2 : Créer un chapitre
{ "jsonrpc": "2.0", "method": "tools/call", "id": 2,
  "params": { "name": "create_chapter",
    "arguments": { "subject_id": "UUID", "title": "Mon chapitre" } } }

// Étape 3 : Créer la leçon
{ "jsonrpc": "2.0", "method": "tools/call", "id": 3,
  "params": { "name": "create_lesson",
    "arguments": {
      "chapter_id": "UUID",
      "title": "Ma leçon",
      "content": "## Introduction\nContenu en Markdown..."
    } } }
```

---

## 🔐 Permissions

| Permission | Outils concernés |
|-----------|-----------------|
| `read:curriculum` | `get_org_info`, `list_*` |
| `read:students` | `list_students` |
| `write:curriculum` | `create_subject`, `create_chapter`, `create_lesson` |
| `write:exercises` | `create_exercise` |

---

## ⚡ Limites

| Paramètre | Valeur |
|-----------|--------|
| Requêtes / minute | 20 req/min (par clé) |
| Actions en masse | Au-delà de 10 → approbation admin requise |

---

## Codes d'erreur

| Code | Signification |
|------|--------------|
| `-32602` | Paramètre manquant ou invalide |
| `-32001` | Clé API invalide ou expirée |
| `-32002` | Erreur base de données |
| `-32003` | Ressource introuvable |
| `-32004` | Limite de requêtes dépassée |
| `-32005` | Accès refusé (permission manquante) |

---

*MCP IziTeach v1.0 — Sky Agent System*
