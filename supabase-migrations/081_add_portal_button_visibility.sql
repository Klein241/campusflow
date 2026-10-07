-- ==============================================================================
-- 081: TOGGLE VISIBILITÉ DU BOUTON "VISITER LE PORTAIL" SUR L'ACCUEIL IZITEACH
-- ==============================================================================

-- 1. Ajout de la colonne show_portal_button sur la table organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS show_portal_button BOOLEAN DEFAULT true;

-- 2. Garantir les permissions de lecture pour anon et écriture pour superadmin / authentifié
COMMENT ON COLUMN public.organizations.show_portal_button IS 'Contrôle si le bouton "Visiter le portail" apparaît sur la carte de l école sur https://iziteach.com/';
