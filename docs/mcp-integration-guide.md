# 📘 Guide Complet — Agent IA dans IziTeach

> **Pour qui ?** Ce guide est destiné à tout agent IA (Claude, Manus, ChatGPT, etc.) qui reçoit une clé API IziTeach. Il décrit comment se connecter, quelles actions sont disponibles, et comment les utiliser.

---

## 🔌 Connexion au Gateway MCP

### Endpoint unique

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
{ "jsonrpc": "2.0", "result": { "pong": true, "agent": "NomAgent" }, "id": 0 }
```

---

## Outils disponibles

### Consulter les données

#### `get_org_info` — Informations de l'école
```json
{ "name": "get_org_info", "arguments": {} }
```
Retourne : nom, ville, type, slug.

---

#### `list_classes` — Liste des classes
```json
{ "name": "list_classes", "arguments": {} }
```

---

#### `list_subjects` — Liste des matières
```json
{ "name": "list_subjects", "arguments": { "class_id": "UUID" } }
```
`class_id` est optionnel.

---

#### `list_chapters` — Chapitres d'une matière
```json
{ "name": "list_chapters", "arguments": { "subject_id": "UUID" } }
```

---

#### `list_lessons` — Leçons d'un chapitre
```json
{ "name": "list_lessons", "arguments": { "chapter_id": "UUID" } }
```

---

#### `list_students` — Étudiants
```json
{ "name": "list_students", "arguments": { "class_id": "UUID" } }
```
`class_id` est optionnel.

---

### Créer du contenu

#### `create_subject` — Créer une matière
```json
{
  "name": "create_subject",
  "arguments": {
    "name": "Algorithmique",
    "class_id": "UUID"
  }
}
```

---

#### `create_chapter` — Créer un chapitre
```json
{
  "name": "create_chapter",
  "arguments": {
    "subject_id": "UUID",
    "title": "Introduction à la POO",
    "description": "Optionnel",
    "order_index": 1
  }
}
```

---

#### `create_lesson` — Créer une leçon
```json
{
  "name": "create_lesson",
  "arguments": {
    "chapter_id": "UUID",
    "title": "Les variables en Python",
    "content": "## Introduction\nUne variable est...",
    "duration_minutes": 30,
    "order_index": 1
  }
}
```
Le contenu supporte le **Markdown** (titres, listes, code).

---

#### `create_exercise` — Créer un exercice
```json
{
  "name": "create_exercise",
  "arguments": {
    "lesson_id": "UUID",
    "title": "QCM Variables",
    "question": "Quelle instruction déclare une variable en Python ?",
    "type": "qcm",
    "choices": ["var x = 5", "x = 5", "int x = 5"],
    "correct_answer": "x = 5",
    "explanation": "En Python on écrit simplement x = valeur.",
    "max_score": 10
  }
}
```
Types : `"qcm"` | `"text"` | `"true_false"`

---

## Permissions requises par outil

| Outil | Permission nécessaire |
|-------|-----------------------|
| `get_org_info`, `list_*` | `read:curriculum` |
| `list_students` | `read:students` |
| `create_subject`, `create_chapter`, `create_lesson` | `write:curriculum` |
| `create_exercise` | `write:exercises` |

---

## Limites et quotas

| Paramètre | Valeur |
|-----------|--------|
| Requêtes / minute | 20 req/min |
| Seuil d'approbation | Au-delà de 10 éléments en masse |
| Expiration clé | Selon configuration admin |

---

## Flux de travail typique pour créer une leçon

```
1. get_org_info       — identifier l'organisation
2. list_subjects      — choisir une matière
3. list_chapters      — choisir un chapitre (ou create_chapter)
4. create_lesson      — créer la leçon avec son contenu
5. create_exercise    — ajouter des exercices
```

---

## Fonctionnement autonome (24h/24)

**Oui**, l'agent peut travailler même quand l'admin n'est pas connecté.

| Scénario | Résultat |
|----------|---------|
| Créer leçons la nuit | Oui |
| Lire données sans admin connecté | Oui |
| Actions en masse au-delà du seuil | Mise en attente — l'admin approuve au prochain login |
| Clé révoquée | Accès coupé immédiatement |

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

*IziTeach MCP Gateway v1.0 — Compatible JSON-RPC 2.0*
