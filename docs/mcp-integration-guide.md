# 🤖 Guide d'Intégration MCP — CampusFlow

## Qu'est-ce que le MCP Gateway ?

Le **MCP (Model Context Protocol)** de CampusFlow permet aux agents IA (MANUS, Claude, GPT, etc.) de se connecter à votre école de manière **sécurisée et contrôlée**.

> **Avant ce système** : L'agent IA devait utiliser les vrais identifiants d'un professeur ou étudiant — risqué et non traçable.  
> **Maintenant** : L'agent utilise une **clé API dédiée** avec des permissions définies par l'admin.

---

## Pour l'Administrateur

### Créer une clé pour un agent IA

1. Connectez-vous au **Panel Admin**
2. Dans le menu latéral, cliquez sur **🤖 Agents IA**
3. Cliquez sur **"Autoriser un nouvel agent IA"**
4. Remplissez :
   - **Nom** : Ex. `MANUS Créateur de Cursus`
   - **Permissions** : Cochez uniquement ce que l'IA peut faire
   - **Seuil d'approbation** : Au-delà de X items → vous devez approuver
5. Cliquez **"Générer la clé"**
6. **Copiez la clé immédiatement** — elle ne sera plus affichée

### Permissions disponibles

| Permission | Ce que l'IA peut faire | Risque |
|-----------|----------------------|--------|
| `read:curriculum` | Lire matières, chapitres, leçons | Faible |
| `read:students` | Voir la liste des étudiants | Faible |
| `write:curriculum` | Créer/modifier matières, chapitres, leçons | Moyen |
| `write:exercises` | Créer des exercices | Moyen |
| `read:grades` | Voir les notes | Moyen |
| `write:grades` | Saisir des notes | Élevé |
| `write:bulk` | Opérations massives | Moyen |

### Révoquer une clé

Dans **🤖 Agents IA** → cliquez sur la clé → **"Révoquer cette clé"**. L'agent perd l'accès immédiatement.

---

## Pour les Développeurs / Agents IA

### Authentification

Toutes les requêtes MCP doivent inclure la clé dans le header `Authorization` :

```
Authorization: Bearer cf_live_xxxxxxxx...
```

### Endpoint MCP

```
POST https://[votre-projet].supabase.co/functions/v1/mcp-gateway
Content-Type: application/json
Authorization: Bearer cf_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Format JSON-RPC 2.0

#### Lister les outils disponibles

```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}
```

#### Appeler un outil

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "create_lesson",
    "arguments": {
      "chapter_id": "uuid-du-chapitre",
      "title": "Introduction aux fonctions",
      "content": "Une fonction est...",
      "order_index": 1
    }
  },
  "id": 2
}
```

### Outils disponibles

#### `list_subjects` — Lister les matières
**Permission requise** : `read:curriculum`
```json
{
  "arguments": {}
}
```

#### `list_chapters` — Lister les chapitres
**Permission requise** : `read:curriculum`
```json
{
  "arguments": {
    "subject_id": "uuid-de-la-matiere"
  }
}
```

#### `create_subject` — Créer une matière
**Permission requise** : `write:curriculum`
```json
{
  "arguments": {
    "name": "Mathématiques Avancées",
    "description": "Cours de maths niveau terminale",
    "class_id": "uuid-de-la-classe"
  }
}
```

#### `create_chapter` — Créer un chapitre
**Permission requise** : `write:curriculum`
```json
{
  "arguments": {
    "subject_id": "uuid-de-la-matiere",
    "title": "Chapitre 1 : Les fonctions",
    "description": "Introduction aux fonctions mathématiques",
    "order_index": 1
  }
}
```

#### `create_lesson` — Créer une leçon
**Permission requise** : `write:curriculum`
```json
{
  "arguments": {
    "chapter_id": "uuid-du-chapitre",
    "title": "Qu'est-ce qu'une fonction ?",
    "content": "Contenu de la leçon en markdown...",
    "order_index": 1
  }
}
```

#### `create_exercise` — Créer un exercice
**Permission requise** : `write:exercises` ou `write:curriculum`
```json
{
  "arguments": {
    "lesson_id": "uuid-de-la-lecon",
    "title": "Exercice 1",
    "question": "Calculez f(2) si f(x) = 3x + 1",
    "type": "qcm",
    "choices": ["7", "8", "5", "6"],
    "correct_answer": "7",
    "max_score": 5
  }
}
```

#### `list_students` — Voir les étudiants
**Permission requise** : `read:students`
```json
{
  "arguments": {
    "class_id": "uuid-de-la-classe"
  }
}
```

---

## Exemple avec MANUS IA

### Configuration dans MANUS

1. Allez dans les paramètres de connexion de MANUS
2. Ajoutez une connexion MCP avec :
   - **URL** : `https://[votre-projet].supabase.co/functions/v1/mcp-gateway`
   - **Type d'auth** : Bearer Token
   - **Token** : `cf_live_votre_cle_ici`

### Prompt exemple pour MANUS

```
Tu es un assistant pédagogique pour l'école [Nom de l'école].
Tu as accès au système via le MCP CampusFlow.

Ta mission : Créer le plan complet du cours de Mathématiques Terminale :
1. Liste d'abord les matières existantes
2. Crée un chapitre "Fonctions et Limites"
3. Crée 5 leçons dans ce chapitre
4. Ajoute 2 exercices par leçon

Utilise uniquement les outils MCP disponibles. 
Ne modifie jamais les données des étudiants ou les notes.
```

---

## Sécurité : Ce que l'IA NE PEUT PAS faire

Même avec une clé active, il est **impossible** pour un agent IA de :

- ❌ Supprimer des utilisateurs (étudiants, professeurs)
- ❌ Modifier des mots de passe ou codes PIN
- ❌ Accéder aux données financières
- ❌ Lire les messages privés des étudiants
- ❌ Modifier les rôles des utilisateurs
- ❌ Exporter des données en masse
- ❌ Accéder à d'autres organisations

---

## Traçabilité

Chaque action d'un agent IA est enregistrée dans les logs :
- Outil utilisé
- Paramètres (résumé)
- Résultat
- Timestamp
- Durée d'exécution

Accessible dans **🤖 Agents IA** → **Journal d'activité**
