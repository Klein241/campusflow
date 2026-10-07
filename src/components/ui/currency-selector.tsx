'use client';

import React from 'react';
import { useCurrency, CurrencyCode, CURRENCIES } from '@/lib/currency-converter';
import { cn } from '@/lib/utils';
import { DollarSign, Euro, Globe } from 'lucide-react';

interface CurrencySelectorProps {
    className?: string;
    variant?: 'segmented' | 'compact' | 'badge';
    showRatesHint?: boolean;
}

export function CurrencySelector({
    className,
    variant = 'segmented',
    showRatesHint = false,
}: CurrencySelectorProps) {
    const { currency, setCurrency } = useCurrency();

    if (variant === 'compact') {
        return (
            <div className={cn('inline-flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10', className)}>
                {(['XAF', 'EUR', 'USD'] as CurrencyCode[]).map((code) => {
                    const active = currency === code;
                    const c = CURRENCIES[code];
                    return (
                        <button
                            key={code}
                            type="button"
                            onClick={() => setCurrency(code)}
                            className={cn(
                                'px-2 py-1 rounded-lg text-[10px] font-black transition-all flex items-center gap-1',
                                active
                                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            )}
                            title={`${c.label} (${c.symbol})`}
                        >
                            <span>{c.symbol}</span>
                        </button>
                    );
                })}
            </div>
        );
    }

    if (variant === 'badge') {
        const nextCode: CurrencyCode = currency === 'XAF' ? 'EUR' : currency === 'EUR' ? 'USD' : 'XAF';
        const curConfig = CURRENCIES[currency];

        return (
            <button
                type="button"
                onClick={() => setCurrency(nextCode)}
                className={cn(
                    'px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-amber-300 transition-all flex items-center gap-1',
                    className
                )}
                title={`Devise actuelle: ${curConfig.label}. Cliquez pour basculer vers ${CURRENCIES[nextCode].label}`}
            >
                <Globe className="w-3 h-3 text-slate-400" />
                <span>{curConfig.symbol}</span>
                <span className="text-[9px] text-slate-500">⇄ {CURRENCIES[nextCode].symbol}</span>
            </button>
        );
    }

    // Default: 'segmented' switch
    return (
        <div className={cn('inline-flex flex-col items-start gap-1', className)}>
            <div className="inline-flex items-center p-1 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md shadow-inner">
                {(['XAF', 'EUR', 'USD'] as CurrencyCode[]).map((code) => {
                    const active = currency === code;
                    const c = CURRENCIES[code];
                    return (
                        <button
                            key={code}
                            type="button"
                            onClick={() => setCurrency(code)}
                            className={cn(
                                'px-2.5 py-1 rounded-lg text-xs font-black transition-all duration-200 flex items-center gap-1.5 cursor-pointer',
                                active
                                    ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-black shadow-lg shadow-amber-500/30 scale-100'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            )}
                            title={`${c.label} — 1 ${c.code === 'XAF' ? 'FCFA' : c.code} = ${c.code === 'EUR' ? '656 FCFA' : c.code === 'USD' ? '600 FCFA' : '1 FCFA'}`}
                        >
                            <span className="text-xs">{c.flag}</span>
                            <span className="tracking-tight">{code === 'XAF' ? 'FCFA' : `${c.symbol} ${code}`}</span>
                        </button>
                    );
                })}
            </div>
            {showRatesHint && (
                <span className="text-[9px] text-slate-500 font-medium pl-1">
                    Taux fixes indicatifs : 1 € ≈ 656 F • 1 $ ≈ 600 F
                </span>
            )}
        </div>
    );
}
