-- =======================================================================
-- FIX : Etudiants crees par l'admin toujours "approved"
-- Seuls les etudiants auto-inscrits (inscription_requests) ont besoin d'approbation
-- A executer dans Supabase SQL Editor
-- =======================================================================

-- 1. Corriger les etudiants existants crees par l'admin qui ont approval_status = 'pending'
--    Regle : si l'etudiant n'a PAS de correspondance dans inscription_requests
--    -> il a ete cree manuellement par l'admin -> il doit etre 'approved'
UPDATE public.student_profiles sp
SET approval_status = 'approved'
WHERE sp.approval_status = 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM public.inscription_requests ir
    WHERE ir.access_code    = sp.access_code
      AND ir.organization_id = sp.organization_id
  );

-- 2. Verification : montrer la repartition
SELECT approval_status, COUNT(*) as count
FROM public.student_profiles
GROUP BY approval_status
ORDER BY approval_status;
