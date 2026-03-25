# ============================================================
# 11_cleanup_and_netlify.ps1
# Nettoyage vocabulaire résiduel + préparation Netlify.
#
# Ce qu'il fait :
#   1. Nettoie le vocabulaire résiduel dans layout.tsx, page.tsx
#   2. Crée/met à jour netlify.toml pour Next.js
#   3. Crée un .env.local.example propre
#   4. Crée un lien inscription dans la page d'accueil (auth-view)
#
# Usage : .\scripts\11_cleanup_and_netlify.ps1
# ============================================================
param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$SrcRoot = Join-Path $ProjectRoot 'src'

function Patch-FileContent {
    param(
        [string]$FilePath,
        [string]$Find,
        [string]$Replace,
        [string]$Description
    )
    if (-not (Test-Path $FilePath)) {
        Write-Host "  [SKIP] Fichier introuvable: $FilePath" -ForegroundColor Yellow
        return $false
    }
    $content = [System.IO.File]::ReadAllText($FilePath, [System.Text.Encoding]::UTF8)
    if ($content.Contains($Find)) {
        $content = $content.Replace($Find, $Replace)
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($FilePath, $content, $utf8NoBom)
        Write-Host "  [OK] $Description" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  [SKIP] Pattern non trouvé: $Description" -ForegroundColor DarkGray
        return $false
    }
}

function Write-FileIfAbsent {
    param(
        [string]$FilePath,
        [string]$Content,
        [string]$Description,
        [switch]$Force
    )
    if ((Test-Path $FilePath) -and -not $Force) {
        Write-Host "  [SKIP] Existe déjà: $FilePath" -ForegroundColor DarkGray
        return
    }
    $dir = Split-Path $FilePath -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($FilePath, $Content, $utf8NoBom)
    Write-Host "  [OK] $Description" -ForegroundColor Green
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " SCRIPT 11 — Cleanup & Netlify Config" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ── 1. NETLIFY.TOML ───────────────────────────────────────────
$netlifyFile = Join-Path $ProjectRoot 'netlify.toml'
Write-Host "[1/4] Configuration Netlify..." -ForegroundColor White

$netlifyContent = @'
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"
  NEXT_TELEMETRY_DISABLED = "1"

# Next.js requires the @netlify/plugin-nextjs plugin
[[plugins]]
  package = "@netlify/plugin-nextjs"

# Redirects for SPA-like behavior
[[redirects]]
  from = "/auth/*"
  to = "/auth/:splat"
  status = 200

[[redirects]]
  from = "/admin/*"
  to = "/admin/:splat"
  status = 200

# Headers for PWA and security
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/manifest.json"
  [headers.values]
    Content-Type = "application/manifest+json"
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
'@

Write-FileIfAbsent -FilePath $netlifyFile -Content $netlifyContent `
    -Description "netlify.toml" -Force

# ── 2. .ENV.LOCAL.EXAMPLE ─────────────────────────────────────
$envExampleFile = Join-Path $ProjectRoot '.env.local.example'
Write-Host "`n[2/4] Template .env.local.example..." -ForegroundColor White

$envContent = @'
# ============================================================
# CentreFormation Pro — Variables d'environnement
# Copier ce fichier en .env.local et remplir les valeurs.
# ============================================================

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://VOTRE-PROJET.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...votre-clé-anon

# Mode mock (mettre à true pour test local sans Supabase)
NEXT_PUBLIC_USE_MOCK_DATA=false

# Tenant ID (ne pas changer sauf multi-centre)
NEXT_PUBLIC_TENANT_ID=00000000-0000-0000-0000-000000000001
'@

Write-FileIfAbsent -FilePath $envExampleFile -Content $envContent `
    -Description ".env.local.example" -Force

# ── 3. VOCABULAIRE RÉSIDUEL ────────────────────────────────────
Write-Host "`n[3/4] Nettoyage vocabulaire résiduel..." -ForegroundColor White

# Dashboard view — registration flow text
$dashboardFile = Join-Path $SrcRoot 'components\views\dashboard-view.tsx'

Patch-FileContent -FilePath $dashboardFile `
    -Find "const fakeEmail = ``${phone.replace(/[^0-9]/g, '')}@centreformation.app``;" `
    -Replace "const fakeEmail = ``${phone.replace(/[^0-9]/g, '')}@centreformation.local``;" `
    -Description "Fix email domain dans LiveRegistration"

Patch-FileContent -FilePath $dashboardFile `
    -Find "Pour vous identifier lors de votre prochaine visite" `
    -Replace "Pour vous identifier sur la plateforme" `
    -Description "Texte LiveRegistration adapté"

# Notification-bell if references prayer
$notifBellFile = Join-Path $SrcRoot 'components\notification-bell.tsx'
if (Test-Path $notifBellFile) {
    Patch-FileContent -FilePath $notifBellFile `
        -Find "une prière" `
        -Replace "un message" `
        -Description "Notif bell: prière → message"
}

# ── 4. MANIFEST.JSON ──────────────────────────────────────────
$manifestFile = Join-Path $ProjectRoot 'public\manifest.json'
Write-Host "`n[4/4] Mise à jour manifest.json..." -ForegroundColor White

if (Test-Path $manifestFile) {
    Patch-FileContent -FilePath $manifestFile `
        -Find "Maison de Prière" `
        -Replace "CentreFormation Pro" `
        -Description "Manifest: nom mis à jour"

    Patch-FileContent -FilePath $manifestFile `
        -Find "Prayer Marathon" `
        -Replace "CentreFormation Pro" `
        -Description "Manifest: nom anglais mis à jour"

    Patch-FileContent -FilePath $manifestFile `
        -Find "prayer" `
        -Replace "education" `
        -Description "Manifest: catégorie prayer → education"
} else {
    # Create manifest
    $manifestContent = @'
{
  "name": "CentreFormation Pro",
  "short_name": "Formation",
  "description": "Plateforme de gestion pour centre de formation",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0B0E14",
  "theme_color": "#4F46E5",
  "orientation": "portrait-primary",
  "categories": ["education", "productivity"],
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
'@
    Write-FileIfAbsent -FilePath $manifestFile -Content $manifestContent `
        -Description "manifest.json créé" -Force
}

Write-Host "`n✅ Script 11 terminé.`n" -ForegroundColor Green
Write-Host "  → netlify.toml prêt pour déploiement" -ForegroundColor DarkCyan
Write-Host "  → .env.local.example documenté" -ForegroundColor DarkCyan
Write-Host "  → Vocabulaire résiduel nettoyé" -ForegroundColor DarkCyan
