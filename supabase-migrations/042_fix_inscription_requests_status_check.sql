-- ═══════════════════════════════════════════════════════════════════════
-- Migration 042: Harmonisation du statut d'inscription (approved / accepted)
-- Problème : La table inscription_requests avait un CHECK constraint
-- status IN ('pending', 'reviewing', 'accepted', 'rejected') qui REJETAIT 'approved'.
-- Du coup, l'update vers 'approved' échouait silencieusement et la demande
-- restait en status 'pending' en base. Au rafraîchissement, elle réapparaissait.
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Mettre à jour le CHECK constraint de inscription_requests
ALTER TABLE public.inscription_requests 
    DROP CONSTRAINT IF EXISTS inscription_requests_status_check;

ALTER TABLE public.inscription_requests 
    ADD CONSTRAINT inscription_requests_status_check 
    CHECK (status IN ('pending', 'reviewing', 'accepted', 'approved', 'rejected', 'info_needed'));

-- 2. Migrer les anciens enregistrements 'accepted' vers 'approved' pour cohérence
UPDATE public.inscription_requests
SET status = 'approved'
WHERE status = 'accepted';

-- 3. Synchroniser student_profiles pour tous les inscription_requests déjà approuvés
UPDATE public.student_profiles sp
SET approval_status = 'approved'
FROM public.inscription_requests ir
WHERE (sp.access_code = ir.access_code OR sp.id = ir.id)
  AND (ir.status = 'approved' OR ir.status = 'accepted')
  AND (sp.approval_status IS NULL OR sp.approval_status != 'approved');
