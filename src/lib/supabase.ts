// ── Supabase Client — CampusFlow ──────────────────────

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// In browser: env vars are inlined at build time — always available
// On server in SSR: env vars come from process.env — must be configured in hosting
if (!supabaseUrl || !supabaseKey) {
    console.error('[Supabase] Missing env vars:', {
        url: supabaseUrl ? '✅' : '❌',
        key: supabaseKey ? '✅' : '❌'
    })
}

export const supabase: SupabaseClient = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            // Store session in localStorage (default for browser client)
            storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        },
        global: {
            // Empêche les requêtes de rester bloquées à l'infini en cas de panne ou redémarrage Supabase
            fetch: (url, options = {}) => {
                if (typeof AbortController !== 'undefined') {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000);
                    const originalSignal = (options as any)?.signal;
                    if (originalSignal) {
                        originalSignal.addEventListener('abort', () => controller.abort());
                    }
                    return fetch(url, {
                        ...options,
                        signal: controller.signal,
                    }).finally(() => clearTimeout(timeoutId));
                }
                return fetch(url, options);
            },
        },
    }
)
