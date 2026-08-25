'use client';

/**
 * PayoutConfigCard — Composant de configuration des coordonnées de paiement
 * À intégrer dans le dashboard admin de l'école.
 * L'admin saisit son numéro Mobile Money pour recevoir les fonds automatiquement.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Smartphone, Building2, CheckCircle2, AlertCircle,
    Save, Loader2, Info, ArrowRight, RefreshCw, Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PAYOUT_METHODS, type CamerPayPayoutMethod } from '@/lib/camerpay';

interface PayoutConfigCardProps {
    organizationId: string;
    organizationSlug: string;
}

interface PayoutConfig {
    id: string;
    payout_method: CamerPayPayoutMethod;
    payout_phone: string | null;
    payout_name: string | null;
    bank_name: string | null;
    is_active: boolean;
    verified_at: string | null;
}

export function PayoutConfigCard({ organizationId, organizationSlug }: PayoutConfigCardProps) {
    const [config, setConfig] = useState<PayoutConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Formulaire
    const [method, setMethod] = useState<CamerPayPayoutMethod>('orange_money');
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [bankName, setBankName] = useState('');
    const [bankAccount, setBankAccount] = useState('');

    useEffect(() => {
        fetchConfig();
    }, [organizationId]);

    async function fetchConfig() {
        setLoading(true);
        try {
            const res = await fetch(`/api/camerpay/config?organizationId=${organizationId}`);
            const json = await res.json();
            if (json.data) {
                setConfig(json.data);
                setMethod(json.data.payout_method ?? 'orange_money');
                setPhone(json.data.payout_phone ?? '');
                setName(json.data.payout_name ?? '');
                setBankName(json.data.bank_name ?? '');
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!method) return;
        if ((method === 'orange_money' || method === 'mtn_momo') && !phone.trim()) {
            toast.error('Veuillez saisir votre numéro de téléphone');
            return;
        }
        if (method === 'bank_transfer' && !bankAccount.trim()) {
            toast.error('Veuillez saisir votre numéro de compte bancaire');
            return;
        }
        if (!name.trim()) {
            toast.error('Le nom du bénéficiaire est requis');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/camerpay/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organizationId,
                    payoutMethod:  method,
                    payoutPhone:   phone.replace(/\s/g, '') || null,
                    payoutName:    name.trim(),
                    bankAccount:   bankAccount.trim() || null,
                    bankName:      bankName.trim() || null,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'Erreur de sauvegarde');
            toast.success(json.message ?? 'Configuration sauvegardée !');
            fetchConfig();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Erreur inconnue');
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
        );
    }

    const isConfigured = config?.is_active && config?.payout_phone;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
        >
            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-base">Recevoir les paiements</p>
                            <p className="text-emerald-100 text-sm">Compte de reversement automatique</p>
                        </div>
                    </div>
                    {isConfigured && (
                        <span className="flex items-center gap-1.5 text-xs bg-white/20 rounded-full px-3 py-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Actif
                        </span>
                    )}
                </div>
            </div>

            <div className="p-5">
                {/* Info box */}
                <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-5">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                        <p className="font-semibold mb-1">Comment ça fonctionne ?</p>
                        <p className="text-xs leading-relaxed">
                            Lorsqu'un élève paie en ligne, CampusFlow perçoit le paiement,
                            prélève une petite commission, puis <strong>vire automatiquement</strong> le
                            solde net sur votre compte Mobile Money sous 24h.
                        </p>
                    </div>
                </div>

                {/* Sélection méthode de paiement */}
                <div className="mb-4">
                    <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                        Mode de réception
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                        {(Object.entries(PAYOUT_METHODS) as [CamerPayPayoutMethod, typeof PAYOUT_METHODS[CamerPayPayoutMethod]][]).map(
                            ([key, info]) => (
                                <button
                                    key={key}
                                    onClick={() => setMethod(key)}
                                    className={`
                                        p-3 rounded-xl border-2 text-center transition-all text-sm font-medium
                                        ${method === key
                                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                        }
                                    `}
                                >
                                    <span className="text-xl block mb-1">{info.icon}</span>
                                    <span className="text-xs">{info.label}</span>
                                </button>
                            )
                        )}
                    </div>
                </div>

                {/* Nom du bénéficiaire */}
                <div className="mb-4">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                        Nom du bénéficiaire <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        placeholder="Ex: NGUETSOP Jean-Pierre"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        Doit correspondre exactement au nom enregistré sur votre compte Mobile Money.
                    </p>
                </div>

                {/* Numéro téléphone (Mobile Money) */}
                {(method === 'orange_money' || method === 'mtn_momo') && (
                    <div className="mb-4">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                            <Smartphone className="w-4 h-4" />
                            Numéro {PAYOUT_METHODS[method].label} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            type="tel"
                            placeholder="237 6XX XXX XXX"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            autoComplete="tel"
                        />
                    </div>
                )}

                {/* Infos bancaires */}
                {method === 'bank_transfer' && (
                    <div className="space-y-3 mb-4">
                        <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                Nom de la banque
                            </Label>
                            <Input
                                placeholder="Ex: Afriland First Bank"
                                value={bankName}
                                onChange={e => setBankName(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                                Numéro de compte <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                placeholder="Numéro IBAN ou compte"
                                value={bankAccount}
                                onChange={e => setBankAccount(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {/* Statut actuel */}
                {config && (
                    <div className={`
                        flex items-center gap-2 text-xs rounded-lg px-3 py-2 mb-4
                        ${config.is_active
                            ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        }
                    `}>
                        {config.is_active
                            ? <><CheckCircle2 className="w-3.5 h-3.5" /> Virements actifs vers {config.payout_phone}</>
                            : <><AlertCircle className="w-3.5 h-3.5" /> Configuration inactive — les virements sont suspendus</>
                        }
                    </div>
                )}

                {/* Bouton sauvegarder */}
                <Button
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 gap-2"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Sauvegarde…</>
                    ) : (
                        <><Save className="w-4 h-4" /> Sauvegarder les coordonnées</>
                    )}
                </Button>

                {config && (
                    <button
                        onClick={fetchConfig}
                        className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 py-1"
                    >
                        <RefreshCw className="w-3 h-3" /> Actualiser
                    </button>
                )}
            </div>
        </motion.div>
    );
}
