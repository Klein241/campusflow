'use client';

/**
 * PaymentModal — Modal de paiement CampusFlow × CamerPay
 * Sélection du mode de paiement, saisie du numéro et redirection vers CamerPay.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle2, AlertCircle, Phone, CreditCard, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CAMERPAY_METHODS, formatXAF, type CamerPayMethod } from '@/lib/camerpay';
import type { PaymentType } from '@/lib/payment-service';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PaymentModalProps {
    open: boolean;
    onClose: () => void;

    // Contexte de paiement
    organizationId: string;
    organizationSlug: string;
    paymentType: PaymentType;
    amount: number;
    description: string;

    // Infos client pré-remplies (optionnel)
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;

    // Entités métier (optionnel)
    schoolPaymentId?: string;
    enrollmentId?: string;
    metadata?: Record<string, unknown>;

    // Callback après paiement initié
    onPaymentInitiated?: (payUrl: string, transactionId: string) => void;
}

// ── Composant ────────────────────────────────────────────────────────────────

export function PaymentModal({
    open,
    onClose,
    organizationId,
    organizationSlug,
    paymentType,
    amount,
    description,
    customerName,
    customerEmail,
    customerPhone: defaultPhone,
    schoolPaymentId,
    enrollmentId,
    metadata,
    onPaymentInitiated,
}: PaymentModalProps) {
    const [selectedMethod, setSelectedMethod] = useState<CamerPayMethod | null>(null);
    const [phone, setPhone] = useState(defaultPhone ?? '');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'select' | 'confirm' | 'redirecting'>('select');

    const selectedInfo = selectedMethod ? CAMERPAY_METHODS[selectedMethod] : null;
    const requiresPhone = selectedInfo?.requiresPhone ?? false;

    function handleClose() {
        if (loading) return;
        setStep('select');
        setSelectedMethod(null);
        onClose();
    }

    async function handlePay() {
        if (!selectedMethod) return;
        if (requiresPhone && !phone.trim()) {
            toast.error('Veuillez saisir votre numéro de téléphone');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/camerpay/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organizationId,
                    organizationSlug,
                    paymentType,
                    amount,
                    method: selectedMethod,
                    customerPhone: requiresPhone ? phone.replace(/\s/g, '') : undefined,
                    customerName,
                    customerEmail,
                    description,
                    schoolPaymentId,
                    enrollmentId,
                    metadata,
                }),
            });

            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error ?? 'Erreur lors du paiement');
            }

            const { payUrl, transactionId } = json.data;
            setStep('redirecting');

            // Callback si défini
            onPaymentInitiated?.(payUrl, transactionId);

            // Redirection vers CamerPay après 1 seconde
            setTimeout(() => {
                window.open(payUrl, '_blank');
                handleClose();
            }, 1000);

        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erreur interne';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Overlay */}
                    <motion.div
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                    />

                    {/* Modal */}
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
                            initial={{ scale: 0.92, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.92, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white">
                                <button
                                    onClick={handleClose}
                                    disabled={loading}
                                    className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                                        <CreditCard className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-blue-200 uppercase tracking-wide">
                                            Paiement sécurisé
                                        </p>
                                        <p className="text-sm font-semibold">via CamerPay 🇨🇲</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-blue-200 text-sm mb-1">{description}</p>
                                    <p className="text-3xl font-bold">{formatXAF(amount)}</p>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-6">
                                {step === 'redirecting' ? (
                                    <div className="flex flex-col items-center py-8 gap-4 text-center">
                                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                                                Redirection en cours…
                                            </p>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Vous allez être redirigé vers CamerPay pour finaliser votre paiement.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                            Choisissez votre mode de paiement
                                        </p>

                                        {/* Sélection méthode */}
                                        <div className="grid grid-cols-2 gap-3 mb-5">
                                            {(Object.entries(CAMERPAY_METHODS) as [CamerPayMethod, typeof CAMERPAY_METHODS[CamerPayMethod]][]).map(
                                                ([key, info]) => (
                                                    <button
                                                        key={key}
                                                        onClick={() => setSelectedMethod(key)}
                                                        className={`
                                                            relative p-3.5 rounded-xl border-2 text-left transition-all duration-150
                                                            ${selectedMethod === key
                                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                            }
                                                        `}
                                                    >
                                                        {selectedMethod === key && (
                                                            <span className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                                                <CheckCircle2 className="w-3 h-3 text-white" />
                                                            </span>
                                                        )}
                                                        <span className="text-2xl block mb-1">{info.icon}</span>
                                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                                                            {info.label}
                                                        </span>
                                                    </button>
                                                )
                                            )}
                                        </div>

                                        {/* Numéro de téléphone si requis */}
                                        <AnimatePresence>
                                            {selectedMethod && requiresPhone && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="mb-5 overflow-hidden"
                                                >
                                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                                        <Smartphone className="w-4 h-4" />
                                                        Numéro {selectedInfo?.label}
                                                    </Label>
                                                    <Input
                                                        type="tel"
                                                        placeholder="Ex: 237 6XX XXX XXX"
                                                        value={phone}
                                                        onChange={e => setPhone(e.target.value)}
                                                        className="text-base"
                                                        autoComplete="tel"
                                                    />
                                                    <p className="text-xs text-gray-400 mt-1.5">
                                                        Vous recevrez une notification sur ce numéro pour valider le paiement.
                                                    </p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Sécurité */}
                                        <div className="flex items-start gap-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-5">
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                            <span>
                                                Paiement sécurisé par CamerPay • Chiffrement AES-256 •
                                                Vos données bancaires ne transitent jamais par CampusFlow.
                                            </span>
                                        </div>

                                        {/* Bouton payer */}
                                        <Button
                                            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                            onClick={handlePay}
                                            disabled={!selectedMethod || loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Initiation du paiement…
                                                </>
                                            ) : (
                                                <>
                                                    {selectedInfo?.icon} &nbsp;
                                                    Payer {formatXAF(amount)}
                                                    {selectedInfo ? ` via ${selectedInfo.label}` : ''}
                                                </>
                                            )}
                                        </Button>
                                    </>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 pb-4 text-center">
                                <p className="text-xs text-gray-400">
                                    Propulsé par{' '}
                                    <a href="https://camerpay.biz" target="_blank" rel="noopener" className="underline">
                                        CamerPay 🇨🇲
                                    </a>
                                    {' '}· Gateway de paiement camerounaise
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
