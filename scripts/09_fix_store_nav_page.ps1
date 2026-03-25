# ============================================================
# 09_fix_store_nav_page.ps1
# Corrige le store Zustand, le SplashScreen, la page d'accueil
# et le layout.tsx pour le SaaS Centre de Formation.
#
# Ce qu'il fait :
#   1. Corrige le bug de ligne fusionnée (ligne 79) dans store.ts
#   2. Corrige le nom de persist storage dans store.ts
#   3. Met à jour page.tsx : onglet par défaut = dashboard, SplashScreen adapté
#   4. Met à jour layout.tsx : description SEO correcte
#   5. Met à jour package.json : nom du projet
#
# Usage : .\scripts\09_fix_store_nav_page.ps1
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

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " SCRIPT 09 — Fix Store, Nav & Page" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ── 1. FIX STORE.TS — Ligne 79 fusionnée ──────────────────────
$storeFile = Join-Path $SrcRoot 'lib\store.ts'
Write-Host "[1/5] Correction store.ts..." -ForegroundColor White

# Fix the merged line 79: setActiveTab and signIn were concatenated
Patch-FileContent -FilePath $storeFile `
    -Find "  setActiveTab: (tab: string) => void    signIn: (email: string, password: string) => Promise<void>;" `
    -Replace "  setActiveTab: (tab: string) => void`n    signIn: (email: string, password: string) => Promise<void>;" `
    -Description "Séparation setActiveTab/signIn (ligne 79)"

# Remove the duplicate activeTab declaration from the formation section (lines 71-79)
# since it conflicts with the existing one at line 133
Patch-FileContent -FilePath $storeFile `
    -Find @"
  // ── CHAMPS CENTRE DE FORMATION (ajoutés par script 05) ──
  currentFiliere: Filiere | null
  currentEnrollment: Enrollment | null
  studentRole: 'student' | 'teacher' | 'admin' | 'staff'
  activeTab: string
  setCurrentFiliere: (f: Filiere | null) => void
  setCurrentEnrollment: (e: Enrollment | null) => void
  setStudentRole: (r: 'student' | 'teacher' | 'admin' | 'staff') => void
  setActiveTab: (tab: string) => void
"@ `
    -Replace @"
  // ── CHAMPS CENTRE DE FORMATION (ajoutés par script 05) ──
  currentFiliere: Filiere | null
  currentEnrollment: Enrollment | null
  studentRole: 'student' | 'teacher' | 'admin' | 'staff'
  setCurrentFiliere: (f: Filiere | null) => void
  setCurrentEnrollment: (e: Enrollment | null) => void
  setStudentRole: (r: 'student' | 'teacher' | 'admin' | 'staff') => void
"@ `
    -Description "Suppression activeTab/setActiveTab dupliqué (section formation)"

# Add the formation initial values if not present in the store create block
$storeContent = [System.IO.File]::ReadAllText($storeFile, [System.Text.Encoding]::UTF8)
if (-not $storeContent.Contains("currentFiliere: null,")) {
    # Insert formation defaults right after setUser
    Patch-FileContent -FilePath $storeFile `
        -Find "            setUser: (user) => set({ user })," `
        -Replace @"
            setUser: (user) => set({ user }),

            // ── Centre de Formation defaults ──
            currentFiliere: null,
            currentEnrollment: null,
            studentRole: 'student',
            setCurrentFiliere: (f) => set({ currentFiliere: f }),
            setCurrentEnrollment: (e) => set({ currentEnrollment: e }),
            setStudentRole: (r) => set({ studentRole: r }),
"@ `
        -Description "Ajout valeurs initiales formation dans store"
}

# Fix persist storage name
Patch-FileContent -FilePath $storeFile `
    -Find "name: 'prayer-marathon-storage'" `
    -Replace "name: 'centreformation-storage'" `
    -Description "Renommage persist storage"

# Fix default activeTab to 'marketplace' -> 'home'
Patch-FileContent -FilePath $storeFile `
    -Find "activeTab: 'marketplace'," `
    -Replace "activeTab: 'home'," `
    -Description "Onglet par défaut: home au lieu de marketplace"

# ── 2. FIX PAGE.TSX — SplashScreen + default tab ──────────────
$pageFile = Join-Path $SrcRoot 'app\page.tsx'
Write-Host "`n[2/5] Correction page.tsx..." -ForegroundColor White

# Fix splash screen emoji and text
Patch-FileContent -FilePath $pageFile `
    -Find '          🙏' `
    -Replace '          🎓' `
    -Description "Emoji splash: 🙏 → 🎓"

Patch-FileContent -FilePath $pageFile `
    -Find '<p className="text-white/80">Priez les uns pour les autres</p>' `
    -Replace '<p className="text-white/80">Votre avenir commence ici</p>' `
    -Description "Slogan splash adapté"

# Fix splash gradient color
Patch-FileContent -FilePath $pageFile `
    -Find 'bg-linear-to-br from-spiritual via-primary to-spiritual/80' `
    -Replace 'bg-linear-to-br from-indigo-900 via-blue-800 to-indigo-900/80' `
    -Description "Couleur splash: spiritual → indigo/blue"

# Force default tab to dashboard instead of community
Patch-FileContent -FilePath $pageFile `
    -Find "    setActiveTab('community');" `
    -Replace "    setActiveTab('home');" `
    -Description "Onglet par défaut: community → home (dashboard)"

# ── 3. FIX LAYOUT.TSX — Description SEO ────────────────────────
$layoutFile = Join-Path $SrcRoot 'app\layout.tsx'
Write-Host "`n[3/5] Correction layout.tsx..." -ForegroundColor White

Patch-FileContent -FilePath $layoutFile `
    -Find 'description: "CentreFormation Pro — Forum étudiant de prière, Bible et partage spirituel.",' `
    -Replace 'description: "CentreFormation Pro — Plateforme de gestion pour centre de formation. Cursus, notes, paiements et marketplace.",' `
    -Description "Description SEO mise à jour"

Patch-FileContent -FilePath $layoutFile `
    -Find 'description: "Forum étudiant de prière, Bible et partage spirituel.",' `
    -Replace 'description: "Plateforme de gestion pour centre de formation.",' `
    -Description "OpenGraph description mise à jour"

# ── 4. FIX PACKAGE.JSON ────────────────────────────────────────
$pkgFile = Join-Path $ProjectRoot 'package.json'
Write-Host "`n[4/5] Correction package.json..." -ForegroundColor White

Patch-FileContent -FilePath $pkgFile `
    -Find '"name": "prayer-marathon-app"' `
    -Replace '"name": "centreformation-pro"' `
    -Description "Nom du package mis à jour"

# ── 5. FIX GRADES-VIEW (c'est un journal spirituel, pas les notes) ──
$gradesFile = Join-Path $SrcRoot 'components\views\grades-view.tsx'
Write-Host "`n[5/5] Grades-view reste le journal pour l'instant (cosmétique)..." -ForegroundColor White

Patch-FileContent -FilePath $gradesFile `
    -Find 'Journal Spirituel' `
    -Replace 'Journal Personnel' `
    -Description "Titre: Journal Spirituel → Journal Personnel"

Patch-FileContent -FilePath $gradesFile `
    -Find 'Vos réflexions et prières personnelles' `
    -Replace 'Vos réflexions et notes personnelles' `
    -Description "Sous-titre journal adapté"

Patch-FileContent -FilePath $gradesFile `
    -Find "Commencez à écrire vos réflexions spirituelles" `
    -Replace "Commencez à écrire vos réflexions" `
    -Description "Texte vide journal adapté"

Patch-FileContent -FilePath $gradesFile `
    -Find "Écrivez vos pensées, prières et réflexions" `
    -Replace "Écrivez vos pensées et réflexions" `
    -Description "Description dialog journal adapté"

Write-Host "`n✅ Script 09 terminé.`n" -ForegroundColor Green
