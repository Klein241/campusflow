// ── Supabase Admin Client — Server-side only (bypass RLS) ──────────────────
// ⚠️  N'IMPORTE JAMAIS ce fichier dans du code client (composants 'use client')
// Ce client utilise la clé service_role qui bypasse toutes les politiques RLS

import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!serviceRoleKey) {
    console.warn('[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY manquante — RLS ne sera pas bypassé');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession:   false,
    },
});
