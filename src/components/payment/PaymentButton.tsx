'use client';

/**
 * PaymentButton — Bouton de paiement universel CampusFlow × CamerPay
 * Ouvre automatiquement la PaymentModal au clic.
 *
 * Usage:
 * <PaymentButton
 *   organizationId="..."
 *   organizationSlug="my-school"
 *   paymentType="scolarite"
 *   amount={50000}
 *   description="Frais de scolarité — Trimestre 1 2025-2026"
 *   customerName={student.name}
 * />
 */

import { useState } from 'react';
import { CreditCard, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentModal } from '@/components/payment/PaymentModal';
import { formatXAF } from '@/lib/camerpay';
import type { PaymentType } from '@/lib/payment-service';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaymentButtonProps {
    // Contexte de paiement
    organizationId: string;
    organizationSlug: string;
    paymentType: PaymentType;
    amount: number;
    description: string;

    // Infos client
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;

    // Entités métier
    schoolPaymentId?: string;
    enrollmentId?: string;
    metadata?: Record<string, unknown>;

    // Apparence du bouton
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'sm' | 'default' | 'lg';
    className?: string;
    label?: string;
    showAmount?: boolean;

    // Callbacks
    onPaymentInitiated?: (payUrl: string, transactionId: string) => void;
    disabled?: boolean;
}

// ── Composant ────────────────────────────────────────────────────────────────

export function PaymentButton({
    organizationId,
    organizationSlug,
    paymentType,
    amount,
    description,
    customerName,
    customerEmail,
    customerPhone,
    schoolPaymentId,
    enrollmentId,
    metadata,
    variant = 'default',
    size = 'default',
    className = '',
    label,
    showAmount = true,
    onPaymentInitiated,
    disabled = false,
}: PaymentButtonProps) {
    const [modalOpen, setModalOpen] = useState(false);

    const buttonLabel = label ?? (
        showAmount
            ? `Payer ${formatXAF(amount)}`
            : 'Payer en ligne'
    );

    return (
        <>
            <Button
                variant={variant}
                size={size}
                className={`gap-2 ${className}`}
                onClick={() => setModalOpen(true)}
                disabled={disabled || amount <= 0}
            >
                <CreditCard className="w-4 h-4" />
                {buttonLabel}
                <Lock className="w-3 h-3 opacity-60" />
            </Button>

            <PaymentModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                organizationId={organizationId}
                organizationSlug={organizationSlug}
                paymentType={paymentType}
                amount={amount}
                description={description}
                customerName={customerName}
                customerEmail={customerEmail}
                customerPhone={customerPhone}
                schoolPaymentId={schoolPaymentId}
                enrollmentId={enrollmentId}
                metadata={metadata}
                onPaymentInitiated={onPaymentInitiated}
            />
        </>
    );
}

// ── Variante : Badge de statut de paiement ────────────────────────────────────

interface PaymentStatusBadgeProps {
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
    className?: string;
}

const STATUS_CONFIG = {
    pending:    { label: 'En attente',   color: 'bg-amber-100 text-amber-700 border-amber-200' },
    processing: { label: 'En cours',     color: 'bg-blue-100 text-blue-700 border-blue-200' },
    completed:  { label: 'Payé ✓',       color: 'bg-green-100 text-green-700 border-green-200' },
    failed:     { label: 'Échoué',       color: 'bg-red-100 text-red-700 border-red-200' },
    refunded:   { label: 'Remboursé',    color: 'bg-purple-100 text-purple-700 border-purple-200' },
    cancelled:  { label: 'Annulé',       color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export function PaymentStatusBadge({ status, className = '' }: PaymentStatusBadgeProps) {
    const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
    return (
        <span className={`
            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
            ${config.color} ${className}
        `}>
            {config.label}
        </span>
    );
}

// ── Variante : Mini résumé de transaction ─────────────────────────────────────

interface PaymentSummaryCardProps {
    amount: number;
    status: PaymentStatusBadgeProps['status'];
    method?: string;
    date?: string;
    description?: string;
}

export function PaymentSummaryCard({
    amount,
    status,
    method,
    date,
    description,
}: PaymentSummaryCardProps) {
    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {formatXAF(amount)}
                    </p>
                    {description && (
                        <p className="text-xs text-gray-500 truncate max-w-[180px]">{description}</p>
                    )}
                    {method && date && (
                        <p className="text-xs text-gray-400">
                            {method} · {new Date(date).toLocaleDateString('fr-FR')}
                        </p>
                    )}
                </div>
            </div>
            <PaymentStatusBadge status={status} />
        </div>
    );
}
