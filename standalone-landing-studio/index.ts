/**
 * ==============================================================================
 * STANDALONE LANDING STUDIO & TEMPLATES (Pack 100% Découplé Cloudflare)
 * ==============================================================================
 */

// 1. Types & Interfaces
export * from './types';

// 2. Configuration & Catalogue des Templates
export * from './config/templates-config';

// 3. Studio de Personnalisation
export * from './components/studio/template-customizer-studio';
export * from './components/studio/template-customizer-modal';

// 4. Composant Switcher & Modèles de Landing Pages
export * from './components/templates/TemplateRenderer';
export * from './components/templates/template-data-adapter';
export * from './components/templates/ProgramCardSessionSelector';
export * from './components/templates/template-bento-grid';
export * from './components/templates/template-bento-box';
export * from './components/templates/template-glass-showcase';
export * from './components/templates/template-segmented-hub';
export * from './components/templates/template-hub-onglets';
export * from './components/templates/template-coach-pastelle';
export * from './components/templates/template-creative-studio';
export * from './components/templates/template-tech-mentor';
export * from './components/templates/template-product-mastery';
export * from './components/templates/template-nexis-studio';

// 5. Client Cloudflare (D1 & R2)
export * from './cloudflare/cloudflare-client';

// 6. Utilitaires
export * from './utils/cn';
export * from './utils/clean-motto';
export * from './utils/curriculum-parser';
export * from './utils/currency-converter';
export * from './utils/custom-domain';
