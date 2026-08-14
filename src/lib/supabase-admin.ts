// ── Supabase Admin Client — Server-side only (bypass RLS) ──────────────────
// ⚠️  N'IMPORTE JAMAIS ce fichier dans du code client (composants 'use client')
// Ce client utilise la clé service_role qui bypasse toutes les politiques RLS

import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const serviceRoleKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY manquante — utilisation de la clé de secours');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession:   false,
    },
});

