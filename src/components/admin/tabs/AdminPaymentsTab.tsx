'use client';

/**
 * AdminPaymentsTab — Gestion des paiements de l'école & Configuration des reversements Mobile Money
 * Permet :
 *  1. Configuration du compte de reversement Mobile Money (Orange Money / MTN MoMo)
 *  2. Suivi des transactions en ligne CamerPay (élèves) + commission SuperAdmin
 *  3. Enregistrement des paiements manuels au guichet (espèces)
 *  4. Impression de reçus officiels & export PDF
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    CreditCard, Printer, Loader2, Smartphone, Wallet,
    TrendingUp, CheckCircle2, AlertCircle, Clock, Search,
    RefreshCw, Filter
} from 'lucide-react';
import { PayoutConfigCard } from '@/components/payment/PayoutConfigCard';
import { PaymentStatusBadge } from '@/components/payment/PaymentButton';
import { formatXAF } from '@/lib/camerpay';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Student {
    id: string;
    first_name: string;
    last_name: string;
    matricule?: string;
}

interface Payment {
    id: string;
    amount: number;
    description: string;
    payment_method: string;
    paid_at: string;
    student_profiles?: {
        first_name: string;
        last_name: string;
    };
    paid_online?: boolean;
}

interface OnlineTx {
    id: string;
    invoice_id: string;
    amount: number;
    payment_method: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
    payment_type: string;
    customer_name?: string;
    customer_phone?: string;
    created_at: string;
    completed_at?: string;
    commission?: {
        commission_amount: number;
        commission_rate: number;
        net_to_org: number;
        payout_status: string;
    };
}

interface AdminPaymentsTabProps {
    orgId?: string;
    orgSlug?: string;
    pays: Payment[];
    students: Student[];
    saving: boolean;
    addPay: (payData: any) => Promise<void>;
    exportPaymentsPdf: () => void;
    printPaymentReceipt: (pay: Payment) => void;
}

export function AdminPaymentsTab({
    orgId,
    orgSlug,
    pays,
    students,
    saving,
    addPay,
    exportPaymentsPdf,
    printPaymentReceipt
}: AdminPaymentsTabProps) {
    const [subTab, setSubTab] = useState<'overview' | 'payout_config' | 'cash_entry'>('overview');
    const [payStu, setPayStu] = useState('');
    const [payAmt, setPayAmt] = useState('');
    const [payMeth, setPayMeth] = useState('cash');
    const [payDesc, setPayDesc] = useState('');
    const [search, setSearch] = useState('');

    // Online transactions
    const [onlineTxs, setOnlineTxs] = useState<OnlineTx[]>([]);
    const [loadingOnline, setLoadingOnline] = useState(false);

    useEffect(() => {
        if (orgId) {
            loadOnlineTransactions();
        }
    }, [orgId]);

    async function loadOnlineTransactions() {
        if (!orgId) return;
        setLoadingOnline(true);
        try {
            const { data, error } = await supabase
                .from('payment_transactions')
                .select(`
                    id, invoice_id, amount, payment_method, status, payment_type,
                    customer_name, customer_phone, created_at, completed_at,
                    commission:platform_commission_id(commission_amount, commission_rate, net_to_org, payout_status)
                `)
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (!error && data) {
                setOnlineTxs(data as any);
            }
        } catch {
            // ignore
        } finally {
            setLoadingOnline(false);
        }
    }

    const handleAddPay = async () => {
        if (!payStu || !payAmt) return;
        await addPay({
            student_id: payStu,
            amount: Number(payAmt),
            payment_method: payMeth,
            description: payDesc || 'Frais de scolarité'
        });
        setPayAmt('');
        setPayDesc('');
    };

    // Calculs totaux
    const totalCollected = pays.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const onlineCollected = onlineTxs.filter(t => t.status === 'completed').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const netReceived = onlineTxs.filter(t => t.status === 'completed').reduce((sum, t) => sum + (Number(t.commission?.net_to_org) || Number(t.amount)), 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header & Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-emerald-400" /> Gestion des Paiements &amp; Scolarités
                    </h2>
                    <p className="text-slate-400 text-xs mt-0.5">
                        Encaissements guichet · Paiements en ligne CamerPay · Reversements automatiques
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        onClick={exportPaymentsPdf}
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 text-xs rounded-xl font-bold"
                        disabled={pays.length === 0}
                    >
                        <Printer className="w-3.5 h-3.5 mr-1" /> Exporter PDF
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Total Collecté</span>
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-black text-white font-mono">{formatXAF(totalCollected)}</p>
                    <p className="text-[11px] text-slate-500">{pays.length} paiements enregistrés</p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                    <div className="flex items-center justify-between text-xs text-emerald-300">
                        <span>Paiements en Ligne</span>
                        <Smartphone className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-black text-emerald-400 font-mono">{formatXAF(onlineCollected)}</p>
                    <p className="text-[11px] text-emerald-300/80">via CamerPay (MoMo &amp; OM)</p>
                </div>

                <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 space-y-1">
                    <div className="flex items-center justify-between text-xs text-teal-300">
                        <span>Net Reversé École</span>
                        <Wallet className="w-4 h-4 text-teal-400" />
                    </div>
                    <p className="text-2xl font-black text-teal-300 font-mono">{formatXAF(netReceived)}</p>
                    <p className="text-[11px] text-teal-300/80">Reversé sur Mobile Money</p>
                </div>
            </div>

            {/* Navigation sous-onglets */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <button
                    onClick={() => setSubTab('overview')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                        subTab === 'overview'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                >
                    📋 Historique des Paiements
                </button>
                <button
                    onClick={() => setSubTab('cash_entry')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                        subTab === 'cash_entry'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                >
                    ➕ Encaisser au Guichet (Espèces)
                </button>
                <button
                    onClick={() => setSubTab('payout_config')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        subTab === 'payout_config'
                            ? 'bg-teal-600 text-white'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    Compte Reversement Mobile Money
                </button>
            </div>

            {/* ═══ ONGLET CONFIG REVERSEMENT ═══ */}
            {subTab === 'payout_config' && orgId && (
                <div className="max-w-2xl">
                    <PayoutConfigCard
                        organizationId={orgId}
                        organizationSlug={orgSlug || ''}
                    />
                </div>
            )}

            {/* ═══ ONGLET ENCAISSEMENT GUICHET ═══ */}
            {subTab === 'cash_entry' && (
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 max-w-2xl">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        💰 Enregistrer un paiement manuel (Guichet / Espèces / Chèque)
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                            <Label className="text-slate-400 text-xs">Étudiant</Label>
                            <select
                                value={payStu}
                                onChange={e => setPayStu(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 text-white text-xs h-10 rounded-xl px-3 mt-1 focus:outline-none focus:border-emerald-500"
                            >
                                <option value="" className="bg-slate-900">-- Sélectionner un étudiant --</option>
                                {students.map(s => (
                                    <option key={s.id} value={s.id} className="bg-slate-900">
                                        {s.first_name} {s.last_name} ({s.matricule || '—'})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label className="text-slate-400 text-xs">Montant (XAF)</Label>
                            <Input
                                type="number"
                                value={payAmt}
                                onChange={e => setPayAmt(e.target.value)}
                                placeholder="50000"
                                className="bg-white/5 border-white/10 text-white h-10 rounded-xl text-sm mt-1"
                            />
                        </div>
                        <div>
                            <Label className="text-slate-400 text-xs">Mode de règlement</Label>
                            <select
                                value={payMeth}
                                onChange={e => setPayMeth(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 text-white text-xs h-10 rounded-xl px-3 mt-1 focus:outline-none focus:border-emerald-500"
                            >
                                <option value="cash" className="bg-slate-900">Espèces</option>
                                <option value="momo" className="bg-slate-900">MTN MoMo (direct)</option>
                                <option value="orange_money" className="bg-slate-900">Orange Money (direct)</option>
                                <option value="bank" className="bg-slate-900">Virement bancaire</option>
                                <option value="other" className="bg-slate-900">Autre</option>
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <Label className="text-slate-400 text-xs">Description / Motif</Label>
                            <Input
                                value={payDesc}
                                onChange={e => setPayDesc(e.target.value)}
                                placeholder="Ex: 1ère tranche scolarité 2026-2027"
                                className="bg-white/5 border-white/10 text-white h-10 rounded-xl text-sm mt-1"
                            />
                        </div>
                    </div>
                    <Button
                        onClick={handleAddPay}
                        disabled={saving || !payStu || !payAmt}
                        className="bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold h-10 px-6"
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        <CreditCard className="w-4 h-4 mr-2" /> Enregistrer &amp; Valider le paiement
                    </Button>
                </div>
            )}

            {/* ═══ ONGLET HISTORIQUE GLOBAL ═══ */}
            {subTab === 'overview' && (
                <div className="space-y-4">
                    {/* Filtre / Recherche */}
                    <div className="flex items-center justify-between gap-3">
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="🔍 Rechercher étudiant, matricule ou motif..."
                            className="bg-white/5 border-white/10 text-white text-xs h-9 max-w-sm rounded-xl"
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={loadOnlineTransactions}
                            className="text-xs text-slate-400 hover:text-white"
                        >
                            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Actualiser
                        </Button>
                    </div>

                    {/* Liste paiements */}
                    {pays.length > 0 ? (
                        <div className="space-y-2.5">
                            {pays
                                .filter(p => {
                                    if (!search.trim()) return true;
                                    const q = search.toLowerCase();
                                    const name = `${p.student_profiles?.first_name || ''} ${p.student_profiles?.last_name || ''}`.toLowerCase();
                                    const desc = (p.description || '').toLowerCase();
                                    return name.includes(q) || desc.includes(q);
                                })
                                .map(p => (
                                    <div
                                        key={p.id}
                                        className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 font-black text-xs flex items-center justify-center border border-emerald-500/30">
                                                {p.student_profiles?.first_name?.[0] || 'E'}
                                                {p.student_profiles?.last_name?.[0] || ''}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-white">
                                                        {p.student_profiles?.first_name} {p.student_profiles?.last_name}
                                                    </p>
                                                    {p.paid_online && (
                                                        <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">
                                                            CamerPay 📱
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400">
                                                    {p.description} • {p.payment_method} • {new Date(p.paid_at).toLocaleDateString('fr-FR')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => printPaymentReceipt(p)}
                                                className="text-xs px-3 py-1.5 rounded-xl bg-indigo-600/10 text-indigo-300 hover:bg-indigo-600/20 border border-indigo-500/20 flex items-center gap-1 font-semibold transition"
                                            >
                                                <Printer className="w-3.5 h-3.5" /> Reçu PDF
                                            </button>
                                            <span className="text-sm font-extrabold text-emerald-400 font-mono">
                                                {formatXAF(p.amount)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500 bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                            <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Aucun paiement enregistré pour le moment</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
