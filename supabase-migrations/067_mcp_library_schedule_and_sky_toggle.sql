-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 067: MCP TOOLS (LIBRARY & SCHEDULE) & DAME SKY REALTIME CONFIG
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Accorder les permissions RLS et Grants sur library_items et timetable_slots
GRANT ALL ON public.library_items TO anon, authenticated, service_role;
GRANT ALL ON public.timetable_slots TO anon, authenticated, service_role;
GRANT ALL ON public.dame_sky_config TO anon, authenticated, service_role;

-- 2. Permettre la lecture publique de dame_sky_config pour que tous les utilisateurs sachent si la bulle est active
ALTER TABLE public.dame_sky_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read dame_sky_config" ON public.dame_sky_config;
CREATE POLICY "Allow public read dame_sky_config" ON public.dame_sky_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow superadmin update dame_sky_config" ON public.dame_sky_config;
CREATE POLICY "Allow superadmin update dame_sky_config" ON public.dame_sky_config FOR ALL USING (true) WITH CHECK (true);

-- 3. Activer Supabase Realtime sur dame_sky_config si disponible
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.dame_sky_config;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignorer si la table est déjà dans la publication
    NULL;
END $$;

-- 4. Ajouter les nouvelles permissions dans ai_permission_catalog
INSERT INTO public.ai_permission_catalog (id, category, label, description, risk_level, sort_order)
VALUES
    ('write:library', 'Bibliothèque Numérique', 'Publier & Compiler des Livres', 'Publier des documents et compiler automatiquement les cours en livres complets dans la bibliothèque', 'medium', 45),
    ('read:library', 'Bibliothèque Numérique', 'Consulter la Bibliothèque', 'Lister et rechercher les livres, cours et documents de la bibliothèque', 'low', 46),
    ('write:schedule', 'Emploi du Temps', 'Gérer l''Emploi du Temps', 'Créer, modifier et supprimer les créneaux de cours des classes', 'medium', 50),
    ('read:schedule', 'Emploi du Temps', 'Consulter l''Emploi du Temps', 'Consulter l''emploi du temps hebdomadaire des classes et professeurs', 'low', 51)
ON CONFLICT (id) DO UPDATE SET
    category = EXCLUDED.category,
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    risk_level = EXCLUDED.risk_level,
    sort_order = EXCLUDED.sort_order;
