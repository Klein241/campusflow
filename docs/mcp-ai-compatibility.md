# 🤖 Compatibilité MCP IziTeach — Quelles IA peuvent se connecter ?

## Réponse courte

Le MCP IziTeach utilise le standard **JSON-RPC 2.0 sur HTTP/HTTPS**.
**Toute IA ou outil qui supporte MCP ou des appels HTTP peut s'y connecter.**

---

## ✅ Compatible NATIVEMENT (MCP natif)

Ces IA supportent le protocole MCP directement :

### 🟣 Claude (Anthropic) — Support MCP natif
**Le meilleur support MCP actuellement.**

**Via Claude Desktop (Mac/Windows) :**
```json
// Dans ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "iziteach": {
      "url": "https://[votre-projet].supabase.co/functions/v1/mcp-gateway",
      "headers": {
        "Authorization": "Bearer cf_live_VOTRE_CLE_ICI"
      }
    }
  }
}
```

**Via API Claude avec tool_use :**
Donner l'URL du MCP dans le contexte système de Claude.

---

### 🔵 MANUS IA — Compatible MCP HTTP

**Configuration dans MANUS :**
1. Paramètres → Connexions → Ajouter MCP
2. **URL** : `https://[projet].supabase.co/functions/v1/mcp-gateway`
3. **Auth** : Bearer Token → `cf_live_VOTRE_CLE_ICI`
4. Sauvegarder

**Prompt exemple pour MANUS :**
```
Tu es assistant pédagogique de l'école [Nom].
Utilise le MCP IziTeach pour créer le cursus complet de Mathématiques :
1. Liste les matières disponibles avec list_subjects
2. Crée 3 chapitres avec create_chapter
3. Ajoute 2 leçons par chapitre avec create_lesson
```

---

### 🟢 Cursor / Windsurf / VS Code Copilot — MCP via extensions

```json
// .cursor/mcp.json ou settings.json
{
  "mcp": {
    "servers": {
      "iziteach": {
        "url": "https://[projet].supabase.co/functions/v1/mcp-gateway",
        "headers": {
          "Authorization": "Bearer cf_live_VOTRE_CLE_ICI"
        }
      }
    }
  }
}
```

---

### 🟡 n8n (automatisation workflows) — Compatible via HTTP Request

**Workflow n8n :**
```
HTTP Request Node :
- Method : POST
- URL : https://[projet].supabase.co/functions/v1/mcp-gateway
- Headers : Authorization: Bearer cf_live_xxx
- Body (JSON) :
  {
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "create_lesson",
      "arguments": { ... }
    },
    "id": 1
  }
```

---

## 🟠 Compatible via ADAPTATION (appels HTTP directs)

Ces IA n'ont pas de MCP natif mais peuvent appeler l'endpoint directement :

### ChatGPT / GPT-4o (OpenAI)

**Via Custom GPT Actions :**
```yaml
openapi: 3.0.0
info:
  title: IziTeach MCP
  version: 1.0.0
servers:
  - url: https://[projet].supabase.co/functions/v1
paths:
  /mcp-gateway:
    post:
      operationId: callMcpTool
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                jsonrpc: { type: string }
                method:  { type: string }
                params:  { type: object }
                id:      { type: integer }
```

**Via OpenAI Assistants API avec function calling :**
Définir chaque outil MCP comme une fonction OpenAI.

---

### 🔴 Gemini (Google)

Pas de support MCP natif, mais via l'**API Function Calling** de Gemini :
```python
import google.generativeai as genai
import requests

def call_iziteach_mcp(tool_name: str, arguments: dict):
    response = requests.post(
        "https://[projet].supabase.co/functions/v1/mcp-gateway",
        headers={"Authorization": "Bearer cf_live_xxx"},
        json={
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": {"name": tool_name, "arguments": arguments},
            "id": 1
        }
    )
    return response.json()
```

---

## 📊 Tableau récapitulatif

| IA / Outil | Support MCP | Difficulté | Notes |
|-----------|------------|-----------|-------|
| **Claude Desktop** | ✅ Natif | Très facile | Config JSON uniquement |
| **MANUS IA** | ✅ Natif | Très facile | Interface graphique |
| **Cursor** | ✅ Natif | Facile | Via .cursor/mcp.json |
| **Windsurf** | ✅ Natif | Facile | Via settings |
| **n8n** | ✅ HTTP | Facile | Workflow visuel |
| **Make.com** | ✅ HTTP | Facile | Module HTTP |
| **ChatGPT** | 🟠 Actions | Moyen | Custom GPT requis |
| **GPT-4 API** | 🟠 Functions | Moyen | Function calling |
| **Gemini** | 🟠 HTTP | Moyen | Python/HTTP direct |
| **Zapier** | ✅ HTTP | Facile | Webhook action |
| **LangChain** | ✅ HTTP | Facile | Tool personnalisé |

---

## 🔐 Sécurité — Ce qu'IziTeach garantit

Peu importe l'IA connectée :

- ✅ **La clé est spécifique à l'école** → pas d'accès cross-organisationnel
- ✅ **Permissions définies par l'admin** → l'IA ne peut faire que ce qu'on lui autorise
- ✅ **Chaque action est loguée** → audit complet visible dans le panel admin
- ✅ **Révocation en 1 clic** → si comportement anormal, couper immédiatement
- ✅ **Rate limiting** → max N requêtes/minute par agent
- ❌ **Jamais accès aux vrais comptes** → pas de mot de passe, pas de PIN, pas de données bancaires

---

## 🧪 Tester votre connexion

```bash
# Test rapide avec curl (Windows PowerShell)
curl -X POST https://[projet].supabase.co/functions/v1/mcp-gateway `
  -H "Authorization: Bearer cf_live_VOTRE_CLE" `
  -H "Content-Type: application/json" `
  -d '{"jsonrpc":"2.0","method":"ping","id":1}'

# Réponse attendue :
# {"jsonrpc":"2.0","result":{"pong":true,"agent":"Nom de votre agent"},"id":1}
```
