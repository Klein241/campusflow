# 🎓 CampusFlow — Plan d'implémentation complet

## Architecture des routes

```
/                                    → Landing page publique (CTA "Créer votre établissement")
/onboarding                          → Wizard 6 étapes (création établissement)
/[orgSlug]                           → Page publique de l'établissement (feed, actus, infos)
/[orgSlug]/admin                     → Backoffice directeur (setup + gestion)
/[orgSlug]/prof                      → Inscription professeur
/[orgSlug]/student                   → Inscription étudiant
/[orgSlug]/login                     → Connexion (prof, étudiant, secrétaire)
/[orgSlug]/dashboard                 → Dashboard role-based
```

## Phase 1 — Landing Page (`/`)

### Sections
1. Hero avec gradient + CTA "Créer votre établissement"
2. Fonctionnalités clés (icônes + descriptions)
3. Types d'établissements supportés
4. Tarification
5. Témoignages
6. Footer

## Phase 2 — Onboarding Wizard (6 étapes)

### Étape 1: Parlez-nous de vous
- Nom, Prénom
- Photo de profil (optionnel)

### Étape 2: Quel est votre rôle ?
- Fondateur | Proviseur | Principal | Formateur | Instituteur | Directeur

### Étape 3: Votre établissement
- Nom de l'établissement
- Type: Collège | Lycée | Université | Centre de formation professionnel | Institut de formation | Autre (précisé)
- Devise/slogan (optionnel)

### Étape 4: Localisation
- Pays (dropdown)
- Ville
- Quartier
- Rue / Adresse complète

### Étape 5: Contact
- N° de téléphone
- N° WhatsApp
- Email
- Autre N° (optionnel + label)

### Étape 6: Documentation
- Upload logo établissement
- Upload pièces justificatives (PDF/images, multi-upload)

→ Après soumission: Création du `slug` automatique + redirection vers `/[orgSlug]/admin`

## Phase 3 — Backoffice Admin (Setup Wizard)

### Au premier accès → 3 étapes obligatoires

#### Étape 1: Création des salles de classe
**Si type = Collège ou Lycée:**
- 1er cycle: 6ème A, 6ème B, 5ème A, 5ème B, 4ème, 3ème
- 2nd cycle: Seconde A, Première C, Terminale D...
- Interface: ajouter/supprimer des classes par cycle

**Si type = Université / Centre de formation / Institut:**
- Créer des Facultés ou Filières
- Pour chaque filière: créer les niveaux (Niveau 1/Classe 1, Niveau 2...)
- Exemple: Filière Massothérapie → Niveau 1, Niveau 2, Niveau 3

#### Étape 2: Attribution des matières
- Sélectionner une classe → ajouter les matières correspondantes
- Matières prédéfinies + possibilité d'ajouter des matières personnalisées
- Coefficient par matière

#### Étape 3: Attribution des professeurs
- Pour chaque matière de chaque classe → attribuer un professeur
- Si professeur pas encore inscrit → générer un lien d'invitation

### Après le setup → Dashboard admin complet
- **Général**: Infos établissement, lien personnalisé, stats
- **Classes**: Gestion des salles
- **Matières**: Attribution
- **Professeurs**: Liste, attribution
- **Étudiants**: Inscriptions, matricules
- **Emploi du temps**: Planning par classe/prof
- **Évaluations**: Devoirs, examens, barèmes
- **Notes**: Saisie et consultation
- **Sanctions/Discipline**: Avertissements, exclusions
- **Paiements**: Scolarité, relances
- **Bibliothèque**: Comme ancien projet (livres, PDF)
- **Marketplace**: Comme ancien projet (boutique)

## Phase 4 — Inscription Prof / Étudiant

### `/[orgSlug]/prof`
- Formulaire: Nom, Prénom, Photo, Spécialité, Diplômes, Téléphone, Email
- Code d'accès généré par l'admin ou auto-inscription (selon config)

### `/[orgSlug]/student`
- Formulaire: Nom, Prénom, Date naissance, Photo, Filière, Niveau
- Matricule auto-généré (ex: MASS-2026-001)
- Documents requis (bulletins, etc.)

## Phase 5 — Pages publiques de l'établissement

### `/[orgSlug]` — Page publique
- Header avec logo + nom
- Feed d'actualités
- Liste des filières
- Marketplace
- Bibliothèque
- Contact
