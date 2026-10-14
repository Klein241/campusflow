# 🎨 Standalone Landing Studio & Templates (100% Cloudflare Native)

Module autonome prêt à l'emploi contenant le **Studio de Personnalisation Visuel Interactif** et la bibliothèque complète des **10 Modèles de Landing Pages Modernes**.

Ce pack est spécialement conçu et adapté pour une stack **100% Cloudflare** :
* 🗄️ **Base de données :** Cloudflare D1 (SQLite serverless)
* 🪣 **Stockage Médias & Photos :** Cloudflare R2
* ⚡ **Backend & API :** Cloudflare Worker
* 💻 **Frontend :** Vite + React / Next.js / Cloudflare Pages

---

## 📁 Structure du Pack

```
standalone-landing-studio/
├── index.ts                           # Point d'entrée principal (exports globaux)
├── types.ts                           # Interfaces TypeScript complètes
├── config/
│   └── templates-config.ts            # Catalogue des 10 templates, métadonnées & badges
├── components/
│   ├── studio/
│   │   ├── template-customizer-studio.tsx  # Le Studio Plein Écran (canevas live, clic-to-edit)
│   │   └── template-customizer-modal.tsx   # Wrapper modale réutilisable
│   ├── templates/
│   │   ├── TemplateRenderer.tsx            # Switcher universel de template en 1 ligne
│   │   ├── template-data-adapter.ts        # Normalisation automatique (cours, stats, avis)
│   │   ├── ProgramCardSessionSelector.tsx  # Sélecteur de durées (1m, 3m, 6m) & tranches
│   │   ├── template-bento-grid.tsx         # Template 1 : Bento Grid Moderne
│   │   ├── template-bento-box.tsx          # Template 2 : Bento Box Studio Prestige
│   │   ├── template-glass-showcase.tsx     # Template 3 : Glassmorphism & Dock Flottant
│   │   ├── template-segmented-hub.tsx      # Template 4 : Hub Segmenté Interactif
│   │   ├── template-hub-onglets.tsx        # Template 5 : Hub Onglets (Zero-Scroll)
│   │   ├── template-coach-pastelle.tsx     # Template 6 : Modèle Julie (Pastel & Masterclass)
│   │   ├── template-creative-studio.tsx    # Template 7 : Modèle Mariana (Studio Créatif)
│   │   ├── template-tech-mentor.tsx        # Template 8 : Modèle Jenna (Cyber Néon Dark)
│   │   ├── template-product-mastery.tsx    # Template 9 : Modèle Vladi (Product Design Orange)
│   │   └── template-nexis-studio.tsx       # Template 10 : Modèle Nexis (Corporate Noir & Jaune)
│   └── ui/                                 # Composants UI autonomes (boutons, inputs, sélecteur devise)
├── utils/                                  # Utilitaires (formatage, devise, parsing)
├── cloudflare/
│   ├── schema-d1.sql                       # Schéma SQL pour Cloudflare D1
│   ├── worker-landing-api.ts               # Handler API Worker pour D1 et R2
│   └── cloudflare-client.ts                # Client frontend pour appeler le Worker
└── assets/templates/                       # Vignettes de prévisualisation
```

---

## 🚀 Guide d'installation dans votre projet Cloudflare

### Étape 1 : Déployer le schéma dans Cloudflare D1
Dans le répertoire de votre projet où se trouve votre `wrangler.toml` configuré pour votre base D1 :

```bash
# Pour exécuter en local
npx wrangler d1 execute <NOM_DE_VOTRE_BASE_D1> --file=./standalone-landing-studio/cloudflare/schema-d1.sql --local

# Pour exécuter en production Cloudflare
npx wrangler d1 execute <NOM_DE_VOTRE_BASE_D1> --file=./standalone-landing-studio/cloudflare/schema-d1.sql --remote
```

### Étape 2 : Configurer `wrangler.toml` pour le Worker
Assurez-vous d'avoir les bindings nécessaires dans votre `wrangler.toml` :

```toml
name = "mon-worker-api"
main = "src/index.ts"
compatibility_date = "2024-09-23"

[[d1_databases]]
binding = "DB"
database_name = "nom_de_votre_base"
database_id = "votre-d1-database-id"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "nom_de_votre_bucket_r2"

[vars]
R2_PUBLIC_DOMAIN = "https://cdn.votredomaine.com" # Ou URL r2.dev
```

### Étape 3 : Brancher le Handler d'API dans votre Cloudflare Worker
Dans le fichier principal de votre Worker (ex: `src/index.ts` ou routeur Hono) :

```typescript
import { handleLandingStudioRequest, Env } from './standalone-landing-studio/cloudflare/worker-landing-api';

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);

        // Si la requête concerne l'API du Landing Studio (/api/landing/*)
        if (url.pathname.startsWith('/api/landing')) {
            return handleLandingStudioRequest(request, env);
        }

        // Vos autres routes...
        return new Response('API OK');
    }
};
```

---

## 💻 Utilisation Frontend

### 1. Ouvrir le Studio de Personnalisation (Espace Admin)

```tsx
import React, { useState } from 'react';
import { TemplateCustomizerStudio } from './standalone-landing-studio';

export function AdminLandingManager({ org }) {
    const [isStudioOpen, setIsStudioOpen] = useState(false);

    return (
        <div>
            <button onClick={() => setIsStudioOpen(true)}>
                🎨 Ouvrir le Studio de Personnalisation
            </button>

            {isStudioOpen && (
                <TemplateCustomizerStudio
                    org={org}
                    orgSlug={org.slug}
                    currentTemplateId={org.landing_layout || 'bento_grid'}
                    workerUrl="https://mon-worker.workers.dev" // Ou '/api' si même domaine
                    onClose={() => setIsStudioOpen(false)}
                    onSaveSuccess={(updatedOrg) => {
                        console.log('Sauvegardé avec succès dans Cloudflare D1 !', updatedOrg);
                        setIsStudioOpen(false);
                    }}
                />
            )}
        </div>
    );
}
```

### 2. Afficher la Landing Page Publique avec le bon Template

Grâce au composant `TemplateRenderer`, vous affichez le template choisi par l'utilisateur en **1 seule ligne** :

```tsx
import React, { useEffect, useState } from 'react';
import { TemplateRenderer, fetchLandingFromCloudflare } from './standalone-landing-studio';

export default function PublicLandingPage({ orgId }) {
    const [data, setData] = useState(null);

    useEffect(() => {
        fetchLandingFromCloudflare('https://mon-worker.workers.dev', orgId).then(res => {
            if (res.success) setData(res);
        });
    }, [orgId]);

    if (!data) return <div>Chargement...</div>;

    const org = {
        ...data.config,
        template_config: data.config?.template_config,
    };

    return (
        <TemplateRenderer
            templateId={data.config?.landing_layout || 'bento_grid'}
            org={org}
            classrooms={data.programs}
            filieres={data.programs}
        />
    );
}
```

---

## 📦 Dépendances requises dans votre projet Frontend

Installez simplement les bibliothèques d'interface standard dans votre `package.json` :

```bash
npm install framer-motion lucide-react sonner clsx tailwind-merge class-variance-authority
```

---

## ✨ Points forts de ce module

1. **Zéro dépendance à Supabase :** Tout est piloté soit par vos callbacks, soit directement par Cloudflare D1 et Cloudflare R2.
2. **Édition visuelle au clic (WYSIWYG moderne) :** L'administrateur clique sur un titre, un bouton ou un tarif dans l'aperçu pour ouvrir immédiatement le champ à modifier.
3. **Multi-device Live Preview :** Switch instantané entre rendu PC, Tablette et Smartphone avec zoom réglable (50% à 150%).
4. **Calculateur de Tranches de Paiement :** Prise en charge automatique du paiement comptant ou échelonné en 1, 2 ou 3 tranches avec gestion multidevise (FCFA / EUR / USD).
