/**
 * generate-icons.mjs
 * Génère les icônes PWA IziTeach depuis le logo officiel.
 * Utilise sharp (déjà installé par Next.js).
 */
import sharp from 'sharp';
import { copyFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const PUBLIC = resolve(PROJECT_ROOT, 'public');

// Source : logo officiel uploadé
const LOGO_SRC = 'C:\\Users\\SYGMA-TECH\\.gemini\\antigravity-ide\\brain\\6b1e2f11-24e5-4e4d-89fc-abe66ba03315\\.user_uploaded\\media_1787372578912.jpg';

async function main() {
  console.log('🖼️  Génération des icônes IziTeach...\n');

  // 1. logo-iziteach.png — utilisé pour l'OG image (1200x630 recommandé)
  await sharp(LOGO_SRC)
    .resize(630, 630, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(resolve(PUBLIC, 'logo-iziteach.png'));
  console.log('✅ logo-iziteach.png (630x630)');

  // 2. logo.png — logo général (alias)
  await sharp(LOGO_SRC)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(resolve(PUBLIC, 'logo.png'));
  console.log('✅ logo.png (512x512)');

  // 3. icon-512.png — PWA grande icône
  await sharp(LOGO_SRC)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(resolve(PUBLIC, 'icon-512.png'));
  console.log('✅ icon-512.png (512x512)');

  // 4. icon-192.png — PWA petite icône + Apple touch icon
  await sharp(LOGO_SRC)
    .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(resolve(PUBLIC, 'icon-192.png'));
  console.log('✅ icon-192.png (192x192)');

  // 5. apple-touch-icon.png (180x180)
  await sharp(LOGO_SRC)
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(resolve(PUBLIC, 'apple-touch-icon.png'));
  console.log('✅ apple-touch-icon.png (180x180)');

  console.log('\n🎉 Toutes les icônes générées dans public/');
}

main().catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
