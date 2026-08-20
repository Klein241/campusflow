'use client';

// ═══════════════════════════════════════════════════════════════════════════
// IziTeach — Page Agents IA / MCP Gateway
// Route : /[orgSlug]/admin/agents
//
// Page autonome et indépendante du fichier admin/page.tsx principal.
// Gère la création de clés API pour les agents IA (MANUS, Claude, GPT, etc.)
// avec permissions granulaires définies par l'administrateur.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { supabase } from '@/lib/supabase';
import { Bot, ArrowLeft, Shield, Lock, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { IziTeachLogo } from '@/components/brand/iziteach-logo';
import { AiAgentsManager } from '@/components/admin/AiAgentsManager';

// ── Vérification session admin ─────────────────────────────────────────────
function useAdminSession() {
    const [org, setOrg] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<any>(null);
    const orgSlug = useOrgSlug();
    const router = useRouter();

    useEffect(() => {
        if (!orgSlug || orgSlug === '_') return;

        let cancelled = false;

        async function checkAuth() {
            try {
                // 1. Vérifier la session Supabase Auth
                const { data: { session: authSession } } = await supabase.auth.getSession();
                if (!authSession) {
                    router.replace(`/${orgSlug}/admin`);
                    return;
                }
                if (cancelled) return;
                setSession(authSession);

                // 2. Vérifier que l'user est admin/director de cette org
                const { data: profile } = await supabase
                    .from('teacher_profiles')
                    .select('id, role, organization_id')
                    .eq('id', authSession.user.id)
                    .maybeSingle();

                if (cancelled) return;

                if (!profile || !['director', 'superadmin', 'admin'].includes(profile.role)) {
                    router.replace(`/${orgSlug}/admin`);
                    return;
                }

                // 3. Charger l'organisation
                const { data: orgData } = await supabase
                    .from('organizations')
                    .select('id, name, slug, logo_url, is_active, sky_points')
                    .eq('slug', orgSlug)
                    .maybeSingle();

                if (cancelled) return;

                if (!orgData) {
                    router.replace(`/${orgSlug}/admin`);
                    return;
                }

                setOrg(orgData);
            } catch (err) {
                console.error('[AgentsPage] Auth error:', err);
                router.replace(`/${orgSlug}/admin`);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        checkAuth();
        return () => { cancelled = true; };
    }, [orgSlug, router]);

    return { org, session, loading, orgSlug };
}

// ═══════════════════════════════════════════════════════════════════════════
export default function AgentsIAPage() {
    const { org, session, loading, orgSlug } = useAdminSession();
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push(`/${orgSlug}/admin`);
    };

    // ── Loading ──────────────────────────────────────────────────────────
    if (loading || !org) {
        return (
            <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600/30 to-purple-600/20 border border-violet-500/30 flex items-center justify-center animate-pulse">
                        <Bot className="w-6 h-6 text-violet-400" />
                    </div>
                    <p className="text-slate-500 text-sm">Chargement…</p>
                </div>
            </div>
        );
    }

    // ── Render ───────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#0B0E14] text-white">

            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-20%] right-[-10%] w-[45%] h-[45%] bg-violet-600/4 blur-[140px] rounded-full" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[35%] h-[35%] bg-indigo-600/4 blur-[140px] rounded-full" />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-20 bg-[#0B0E14]/90 backdrop-blur-xl border-b border-white/[0.06] px-4 py-3">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">

                    {/* Left: back + logo */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push(`/${orgSlug}/admin`)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.06] text-slate-400 hover:text-white transition"
                            title="Retour au panel admin"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>

                        <div className="hidden sm:flex items-center gap-2">
                            <IziTeachLogo variant="symbol" size="xs" />
                            <span className="text-xs text-slate-500 font-medium">{org.name}</span>
                        </div>

                        <div className="w-px h-5 bg-white/10 hidden sm:block" />

                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-600/40 to-purple-600/30 border border-violet-500/30 flex items-center justify-center">
                                <Bot className="w-3.5 h-3.5 text-violet-300" />
                            </div>
                            <div>
                                <h1 className="text-sm font-bold text-white">Agents IA</h1>
                                <p className="text-[10px] text-slate-500 leading-none">MCP Gateway</p>
                            </div>
                        </div>
                    </div>

                    {/* Right: security badge + logout */}
                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold">
                            <Shield className="w-3 h-3" />
                            Accès sécurisé
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition"
                        >
                            <LogOut className="w-3 h-3" />
                            <span className="hidden sm:inline">Déconnexion</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="relative z-10 max-w-5xl mx-auto px-4 py-6 pb-20">

                {/* ── Bandeau intro ───────────────────────────────────── */}
                <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-violet-600/10 to-indigo-600/10 border border-violet-500/20 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600/30 to-indigo-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                        <Lock className="w-5 h-5 text-violet-300" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-sm font-bold text-white mb-0.5">
                            Connectez des agents IA à votre école — de façon sécurisée
                        </h2>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Créez des <strong className="text-slate-200">clés API dédiées</strong> avec des permissions précises.
                            Compatible avec <strong className="text-violet-300">Claude</strong>,{' '}
                            <strong className="text-blue-300">MANUS</strong>,{' '}
                            <strong className="text-emerald-300">ChatGPT</strong>,{' '}
                            <strong className="text-amber-300">Gemini</strong> et tout outil supportant le protocole MCP.
                            L'agent IA n'a jamais accès aux vrais comptes utilisateurs.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 shrink-0">
                        {['Claude', 'MANUS', 'ChatGPT', 'Cursor', 'Windsurf', 'n8n'].map(ai => (
                            <span key={ai} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 font-medium">
                                {ai}
                            </span>
                        ))}
                    </div>
                </div>

                {/* ── Composant principal MCP ─────────────────────────── */}
                <AiAgentsManager orgId={org.id} orgSlug={org.slug} />

            </main>
        </div>
    );
}
