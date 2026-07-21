'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ShoppingBag, Zap, TrendingUp, Gift, X, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ══════════════════════════════════════════════════════════
// SKY POINTS — 1 point/jour gratuit (non-accumulable au-delà
//               du quota quotidien) + packs payants
// ══════════════════════════════════════════════════════════

interface SkyPointsProps {
    userId: string;
    orgId: string;
    compact?: boolean;               // true = badge, false = full card
    onOpenStore?: () => void;
}

export function SkyPoints({ userId, orgId, compact = false, onOpenStore }: SkyPointsProps) {
    const [balance, setBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(false);
    const [alreadyClaimed, setAlreadyClaimed] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    const loadBalance = useCallback(async () => {
        setLoading(true);
        try {
            // Call server-side RPC for atomic daily point credit
            const { data: claimResult } = await supabase.rpc('claim_daily_sky_point', {
                p_user_id: userId,
                p_org_id: orgId,
            });

            if (claimResult) {
                setBalance(claimResult.balance ?? 0);
                // If just claimed, show a subtle toast
                if (claimResult.success) {
                    // Silent auto-claim — no toast to avoid noise on every page load
                }
                setAlreadyClaimed(!claimResult.success);
            } else {
                // Fallback: read balance directly
                const { data: row } = await supabase
                    .from('sky_points')
                    .select('balance, last_daily_claim')
                    .eq('user_id', userId)
                    .single();
                if (row) {
                    setBalance(row.balance ?? 0);
                    const today = new Date().toISOString().split('T')[0];
                    const lastDay = row.last_daily_claim?.split('T')[0];
                    setAlreadyClaimed(lastDay === today);
                }
            }
        } catch (e) {
            console.error('Sky points load error:', e);
        }
        setLoading(false);
    }, [userId, orgId]);

    const claimDailyPoint = async (currentBalance: number = balance ?? 0, silent = false) => {
        if (claiming || alreadyClaimed) return;
        setClaiming(true);
        try {
            const { data: result } = await supabase.rpc('claim_daily_sky_point', {
                p_user_id: userId,
                p_org_id: orgId,
            });
            if (result?.success) {
                setBalance(result.balance ?? 0);
                setAlreadyClaimed(true);
                if (!silent) toast.success('🌟 +1 Sky Point quotidien crédité !');
            } else if (!silent) {
                toast.info('Point quotidien déjà réclamé aujourd\'hui');
            }
        } catch (e) {
            console.error('Daily claim error:', e);
        }
        setClaiming(false);
    };

    const loadHistory = async () => {
        const { data } = await supabase.from('sky_points_history')
            .select('*').eq('user_id', userId)
            .order('created_at', { ascending: false }).limit(20);
        setHistory(data || []);
    };

    useEffect(() => { loadBalance(); }, [loadBalance]);

    const handleOpenDetails = () => {
        setShowDetails(true);
        loadHistory();
    };

    // ── COMPACT BADGE (for headers) ──────────────────────
    if (compact) {
        return (
            <button onClick={handleOpenDetails}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all group">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                {loading ? (
                    <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                ) : (
                    <span className="text-xs font-bold text-amber-300">{balance ?? 0}</span>
                )}
                {!alreadyClaimed && !loading && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                )}

                {/* Tooltip */}
                <AnimatePresence>
                    {showDetails && (
                        <SkyPointsModal
                            balance={balance ?? 0}
                            alreadyClaimed={alreadyClaimed}
                            claiming={claiming}
                            history={history}
                            onClaim={() => claimDailyPoint(balance ?? 0)}
                            onClose={() => setShowDetails(false)}
                            onOpenStore={onOpenStore}
                        />
                    )}
                </AnimatePresence>
            </button>
        );
    }

    // ── FULL CARD (for profile/myspace) ──────────────────
    return (
        <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/[0.07] to-transparent border border-amber-500/20 p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
                            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Votre solde</p>
                            <p className="text-xl font-black text-amber-300">
                                {loading ? '...' : balance ?? 0}
                                <span className="text-xs font-normal text-slate-400 ml-1">Sky Points</span>
                            </p>
                        </div>
                    </div>
                    <button onClick={handleOpenDetails}
                        className="text-[10px] text-amber-400 hover:text-amber-300 underline underline-offset-2 transition">
                        Historique
                    </button>
                </div>

                {/* Daily point status */}
                <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl text-xs",
                    alreadyClaimed ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' :
                        'bg-amber-500/10 border border-amber-500/20 text-amber-300')}>
                    {alreadyClaimed ? (
                        <>
                            <Check className="w-3.5 h-3.5 shrink-0" />
                            <span>Point quotidien crédité aujourd'hui ✅</span>
                        </>
                    ) : (
                        <>
                            <Zap className="w-3.5 h-3.5 shrink-0 animate-pulse" />
                            <span>1 point gratuit disponible !</span>
                            <button onClick={() => claimDailyPoint(balance ?? 0)}
                                disabled={claiming}
                                className="ml-auto px-2 py-0.5 rounded-lg bg-amber-500/30 hover:bg-amber-500/50 font-medium transition disabled:opacity-50">
                                {claiming ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Réclamer'}
                            </button>
                        </>
                    )}
                </div>

                {/* Store CTA */}
                <button onClick={onOpenStore}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/25 text-amber-300 text-xs font-medium hover:from-amber-500/30 hover:to-orange-500/30 transition-all">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Acheter des Sky Points
                    <TrendingUp className="w-3 h-3" />
                </button>
            </motion.div>

            <AnimatePresence>
                {showDetails && (
                    <SkyPointsModal
                        balance={balance ?? 0}
                        alreadyClaimed={alreadyClaimed}
                        claiming={claiming}
                        history={history}
                        onClaim={() => claimDailyPoint(balance ?? 0)}
                        onClose={() => setShowDetails(false)}
                        onOpenStore={onOpenStore}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

// ── HISTORY MODAL ────────────────────────────────────────
function SkyPointsModal({ balance, alreadyClaimed, claiming, history, onClaim, onClose, onOpenStore }: {
    balance: number; alreadyClaimed: boolean; claiming: boolean;
    history: any[]; onClaim: () => void; onClose: () => void; onOpenStore?: () => void;
}) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/70 flex items-end sm:items-center justify-center p-4"
            onClick={onClose}>
            <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
                className="bg-[#0f1117] border border-amber-500/20 rounded-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto p-5 shadow-2xl"
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                        <span className="font-bold text-white">Sky Points</span>
                        <span className="text-2xl font-black text-amber-300">{balance}</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Daily */}
                {!alreadyClaimed && (
                    <button onClick={onClaim} disabled={claiming}
                        className="w-full mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 text-sm font-medium hover:from-amber-500/30 transition disabled:opacity-50">
                        <Gift className="w-4 h-4" />
                        {claiming ? 'Créditation...' : 'Réclamer mon point quotidien gratuit'}
                        {!claiming && <Zap className="w-3 h-3 ml-auto animate-pulse" />}
                    </button>
                )}

                {/* Store link */}
                <button onClick={() => { onOpenStore?.(); onClose(); }}
                    className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600/20 to-teal-600/20 border border-indigo-500/30 text-indigo-300 text-sm font-medium hover:from-indigo-600/30 transition">
                    <ShoppingBag className="w-4 h-4" />
                    Acheter des packs Sky Points
                </button>

                {/* History */}
                <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-2">Historique</p>
                    {history.length === 0 ? (
                        <p className="text-xs text-slate-600 text-center py-4">Aucune transaction</p>
                    ) : history.map((h, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03]">
                            <div>
                                <p className="text-xs text-white">{h.description || h.type}</p>
                                <p className="text-[9px] text-slate-500">{new Date(h.created_at).toLocaleDateString('fr-FR')}</p>
                            </div>
                            <span className={cn("text-sm font-bold", h.delta > 0 ? 'text-emerald-400' : 'text-red-400')}>
                                {h.delta > 0 ? '+' : ''}{h.delta}
                            </span>
                        </div>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
}
