import React from 'react';
import { useCurrency, CurrencyCode, CURRENCIES } from '../../utils/currency-converter';
import { cn } from '../../utils/cn';

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
                                'px-2 py-1 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer',
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
                    'px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-amber-300 transition-all flex items-center gap-1 cursor-pointer',
                    className
                )}
                title={`Devise actuelle: ${curConfig.label}. Cliquez pour basculer vers ${CURRENCIES[nextCode].label}`}
            >
                <span>{curConfig.flag}</span>
                <span>{curConfig.symbol}</span>
            </button>
        );
    }

    return (
        <div className={cn('flex flex-col gap-1', className)}>
            <div className="inline-flex items-center bg-white/5 p-1 rounded-2xl border border-white/10">
                {(['XAF', 'EUR', 'USD'] as CurrencyCode[]).map((code) => {
                    const active = currency === code;
                    const c = CURRENCIES[code];
                    return (
                        <button
                            key={code}
                            type="button"
                            onClick={() => setCurrency(code)}
                            className={cn(
                                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                                active
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md shadow-amber-500/25'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            )}
                        >
                            <span>{c.flag}</span>
                            <span>{c.code}</span>
                            <span className="opacity-60 text-[10px]">({c.symbol})</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
