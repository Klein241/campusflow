'use client';

/**
 * SuperadminPaymentsTab — Tableau de bord des commissions & paiements plateforme
 * Réservé au SuperAdmin CampusFlow :
 *  - Suivi des volumes financiers globaux
 *  - Prélèvement des commissions (0.5% scolarité, etc.)
 *  - Statuts des virements Mass Payout vers les comptes Mobile Money des écoles
 *  - Configuration des taux de commission par service
 *  - Relance des virements en échec
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    CreditCard, DollarSign, Wallet, TrendingUp, RefreshCw,
    CheckCircle2, AlertCircle, Clock, ShieldCheck, Search,
    Smartphone, Building2, Save, Loader2, ArrowUpRight,
    Filter, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatXAF, CAMERPAY_METHODS } from '@/lib/camerpay';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface PlatformStats {
    total_transactions: number;
    total_volume: number;
    total_commission: number;
    total_paid_to_orgs: number;
    total_pending_payout: number;
    completed_count: number;
    failed_count: number;
    by_org?: {
        org_id: string;
        org_name: string;
        volume: number;
        commission: number;
        net: number;
        count: number;
    }[];
}

interface TransactionRow {
    id: string;
    invoice_id: string;
    amount: number;
    payment_method: string;
    status: string;
    payment_type: string;
    customer_name?: string;
    customer_phone?: string;
    created_at: string;
    completed_at?: string;
    org?: {
        name: string;
        slug: string;
        logo_url: string;
    };
    commission?: {
        commission_amount: number;
        net_to_org: number;
        payout_status: string;
        camerpay_payout_id?: string;
    };
}

export function SuperadminPaymentsTab() {
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [transactions, setTransactions] = useState<TransactionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Commission Rates Form
    const [rateScolarite, setRateScolarite] = useState('0.005');
    const [rateInscription, setRateInscription] = useState('0.010');
    const [rateShop, setRateShop] = useState('0.020');
    const [rateCursus, setRateCursus] = useState('0.015');
    const [savingRates, setSavingRates] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            // 1. Stats via RPC
            const { data: statsData } = await supabase.rpc('get_platform_payment_stats');
            if (statsData) setStats(statsData);

            // 2. Transactions
            const { data: txsData, error: txsErr } = await supabase
                .from('payment_transactions')
                .select(`
                    id, invoice_id, amount, payment_method, status, payment_type,
                    customer_name, customer_phone, created_at, completed_at,
                    org:organization_id(name, slug, logo_url),
                    commission:platform_commission_id(commission_amount, net_to_org, payout_status, camerpay_payout_id)
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (!txsErr && txsData) {
                setTransactions(txsData as any);
            }

            // 3. Platform Config (Taux)
            const { data: configData } = await supabase
                .from('platform_config')
                .select('key, value');

            if (configData) {
                configData.forEach(c => {
                    if (c.key === 'commission_rate_scolarite') setRateScolarite(c.value);
                    if (c.key === 'commission_rate_inscription') setRateInscription(c.value);
                    if (c.key === 'commission_rate_shop') setRateShop(c.value);
                    if (c.key === 'commission_rate_cursus') setRateCursus(c.value);
                });
            }
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveRates() {
        setSavingRates(true);
        try {
            const updates = [
                { key: 'commission_rate_scolarite', value: rateScolarite },
                { key: 'commission_rate_inscription', value: rateInscription },
                { key: 'commission_rate_shop', value: rateShop },
                { key: 'commission_rate_cursus', value: rateCursus },
            ];

            for (const u of updates) {
                await supabase
                    .from('platform_config')
                    .upsert({ key: u.key, value: u.value, updated_at: new Date().toISOString() });
            }

            toast.success('Taux de commission mis à jour avec succès !');
        } catch (err: any) {
            toast.error(err.message || 'Erreur de mise à jour des taux');
        } finally {
            setSavingRates(false);
        }
    }

    async function handleRetryFailedPayouts() {
        setRetrying(true);
        try {
            const res = await fetch('/api/camerpay/payout/retry', { method: 'POST' });
            const json = await res.json();
            if (res.ok) {
                toast.success(json.message || 'Relance des virements effectuée !');
                loadData();
            } else {
                toast.error(json.error || 'Erreur lors de la relance');
            }
        } catch {
            toast.error('Erreur réseau');
        } finally {
            setRetrying(false);
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                        <CreditCard className="w-6 h-6 text-emerald-400" />
                        Paiements &amp; Commissions SuperAdmin
                    </h2>
                    <p className="text-slate-400 text-xs mt-1">
                        Compte unique CamerPay · Prélèvement automatique de commissions · Reversements Mass Payout
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadData}
                        disabled={loading}
                        className="bg-white/5 border-white/10 text-xs h-9 rounded-xl text-slate-300 hover:text-white"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                        Actualiser
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Volume Total Brut</span>
                        <TrendingUp className="w-4 h-4 text-indigo-400" />
                    </div>
                    <p className="text-2xl font-black text-white font-mono">
                        {formatXAF(stats?.total_volume || 0)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                        {stats?.completed_count || 0} transactions complétées
                    </p>
                </div>

                <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 space-y-2 shadow-lg shadow-emerald-500/5">
                    <div className="flex items-center justify-between text-xs text-emerald-300">
                        <span>Commissions IziTeach</span>
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-black text-emerald-400 font-mono">
                        {formatXAF(stats?.total_commission || 0)}
                    </p>
                    <p className="text-[11px] text-emerald-300/80">
                        Prélèvement moyen ~{(Number(rateScolarite) * 100).toFixed(1)}%
                    </p>
                </div>

                <div className="p-5 rounded-3xl bg-teal-500/10 border border-teal-500/20 space-y-2">
                    <div className="flex items-center justify-between text-xs text-teal-300">
                        <span>Viré aux Écoles (Mass Payout)</span>
                        <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    </div>
                    <p className="text-2xl font-black text-teal-300 font-mono">
                        {formatXAF(stats?.total_paid_to_orgs || 0)}
                    </p>
                    <p className="text-[11px] text-teal-300/80">
                        Transféré directement sur Mobile Money
                    </p>
                </div>

                <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                    <div className="flex items-center justify-between text-xs text-amber-300">
                        <span>En attente de virement</span>
                        <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="text-2xl font-black text-amber-300 font-mono">
                        {formatXAF(stats?.total_pending_payout || 0)}
                    </p>
                    <p className="text-[11px] text-amber-300/80">
                        En cours ou en attente de config école
                    </p>
                </div>
            </div>

            {/* Config des taux de commission */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-white/[0.02] to-teal-500/10 border border-indigo-500/20 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-base text-white flex items-center gap-2">
                            ⚙️ Configuration des Taux de Commission IziTeach
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Définissez la commission prélevée sur chaque paiement avant reversement automatique à l'école.
                        </p>
                    </div>
                    <Button
                        size="sm"
                        onClick={handleSaveRates}
                        disabled={savingRates}
                        className="bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl h-9"
                    >
                        {savingRates ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                        Enregistrer les taux
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/8 space-y-1.5">
                        <Label className="text-xs text-slate-300">Scolarité (frais de cours)</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                step="0.001"
                                value={rateScolarite}
                                onChange={e => setRateScolarite(e.target.value)}
                                className="bg-white/5 border-white/10 text-white font-mono text-sm h-9 rounded-xl"
                            />
                            <span className="text-xs font-bold text-emerald-400 shrink-0">
                                = {(Number(rateScolarite) * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/8 space-y-1.5">
                        <Label className="text-xs text-slate-300">Inscriptions (frais dossier)</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                step="0.001"
                                value={rateInscription}
                                onChange={e => setRateInscription(e.target.value)}
                                className="bg-white/5 border-white/10 text-white font-mono text-sm h-9 rounded-xl"
                            />
                            <span className="text-xs font-bold text-emerald-400 shrink-0">
                                = {(Number(rateInscription) * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/8 space-y-1.5">
                        <Label className="text-xs text-slate-300">Shop / Marketplace</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                step="0.001"
                                value={rateShop}
                                onChange={e => setRateShop(e.target.value)}
                                className="bg-white/5 border-white/10 text-white font-mono text-sm h-9 rounded-xl"
                            />
                            <span className="text-xs font-bold text-emerald-400 shrink-0">
                                = {(Number(rateShop) * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/8 space-y-1.5">
                        <Label className="text-xs text-slate-300">Cursus en ligne / Premium</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                step="0.001"
                                value={rateCursus}
                                onChange={e => setRateCursus(e.target.value)}
                                className="bg-white/5 border-white/10 text-white font-mono text-sm h-9 rounded-xl"
                            />
                            <span className="text-xs font-bold text-emerald-400 shrink-0">
                                = {(Number(rateCursus) * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Répartition par Organisation */}
            {stats?.by_org && stats.by_org.length > 0 && (
                <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-teal-400" />
                        Performance Financière par Établissement
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-white/10 text-slate-400 font-semibold">
                                    <th className="pb-3">Organisation</th>
                                    <th className="pb-3">Transactions</th>
                                    <th className="pb-3">Volume Brut</th>
                                    <th className="pb-3">Commission SuperAdmin</th>
                                    <th className="pb-3">Net Reversé École</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {stats.by_org.map(org => (
                                    <tr key={org.org_id} className="hover:bg-white/[0.02]">
                                        <td className="py-3 font-bold text-white">{org.org_name}</td>
                                        <td className="py-3 font-mono">{org.count}</td>
                                        <td className="py-3 font-mono font-bold text-white">{formatXAF(org.volume)}</td>
                                        <td className="py-3 font-mono font-bold text-emerald-400">{formatXAF(org.commission)}</td>
                                        <td className="py-3 font-mono font-bold text-teal-300">{formatXAF(org.net)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Journal des transactions récentes */}
            <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                        📜 Transactions Récentes ({transactions.length})
                    </h3>
                    <div className="flex items-center gap-2">
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher élève, facture, école..."
                            className="bg-white/5 border-white/10 text-white text-xs h-9 w-60 rounded-xl"
                        />
                    </div>
                </div>

                <div className="space-y-2.5">
                    {transactions
                        .filter(tx => {
                            if (!search.trim()) return true;
                            const q = search.toLowerCase();
                            return (
                                (tx.customer_name || '').toLowerCase().includes(q) ||
                                (tx.invoice_id || '').toLowerCase().includes(q) ||
                                (tx.org?.name || '').toLowerCase().includes(q)
                            );
                        })
                        .map(tx => (
                            <div
                                key={tx.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/8 hover:border-white/15 transition gap-3"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                                        📱
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-white">
                                                {tx.customer_name || 'Client'}
                                            </p>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                                                {tx.org?.name || 'École'}
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
                                                {tx.payment_type}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {tx.invoice_id} • {tx.payment_method} • {new Date(tx.created_at).toLocaleString('fr-FR')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 self-end sm:self-center">
                                    <div className="text-right">
                                        <p className="text-sm font-mono font-black text-white">{formatXAF(tx.amount)}</p>
                                        {tx.commission && (
                                            <p className="text-[10px] text-emerald-400 font-mono">
                                                Com: +{formatXAF(tx.commission.commission_amount)} | Net: {formatXAF(tx.commission.net_to_org)}
                                            </p>
                                        )}
                                    </div>
                                    <span className={`text-xs px-2.5 py-1 rounded-xl font-bold border ${
                                        tx.status === 'completed'
                                            ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                            : tx.status === 'pending'
                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                                    }`}>
                                        {tx.status === 'completed' ? 'Complété ✓' : tx.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}
