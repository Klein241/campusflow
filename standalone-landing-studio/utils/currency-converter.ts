import { useState, useEffect, useCallback } from 'react';

export type CurrencyCode = 'XAF' | 'EUR' | 'USD';

export interface CurrencyConfig {
    code: CurrencyCode;
    label: string;
    symbol: string;
    rateFromFcfa: number;
    flag: string;
    isFixedRate?: boolean;
}

export const DEFAULT_CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
    XAF: {
        code: 'XAF',
        label: 'Franc CFA',
        symbol: 'FCFA',
        rateFromFcfa: 1,
        flag: '🌍',
        isFixedRate: true,
    },
    EUR: {
        code: 'EUR',
        label: 'Euro',
        symbol: '€',
        rateFromFcfa: 655.957,
        flag: '🇪🇺',
        isFixedRate: true,
    },
    USD: {
        code: 'USD',
        label: 'Dollar US',
        symbol: '$',
        rateFromFcfa: 600,
        flag: '🇺🇸',
        isFixedRate: false,
    },
};

export let CURRENCIES: Record<CurrencyCode, CurrencyConfig> = { ...DEFAULT_CURRENCIES };

const STORAGE_KEY = 'app_preferred_currency';
const EVENT_KEY = 'app_currency_changed';

export function convertFcfaTo(
    amountFcfa: number,
    targetCurrency: CurrencyCode
): { amount: number; formatted: string; symbol: string } {
    const config = CURRENCIES[targetCurrency] || DEFAULT_CURRENCIES.XAF;
    const converted = targetCurrency === 'XAF' ? amountFcfa : amountFcfa / config.rateFromFcfa;

    let formatted: string;
    if (targetCurrency === 'XAF') {
        formatted = `${new Intl.NumberFormat('fr-FR').format(Math.round(converted))} FCFA`;
    } else if (targetCurrency === 'EUR') {
        const rounded = Math.round(converted);
        formatted = `${new Intl.NumberFormat('fr-FR').format(rounded)} €`;
    } else {
        const rounded = Math.round(converted);
        formatted = `$${new Intl.NumberFormat('en-US').format(rounded)}`;
    }

    return {
        amount: converted,
        formatted,
        symbol: config.symbol,
    };
}

export function useCurrency() {
    const [currency, setCurrencyState] = useState<CurrencyCode>('XAF');

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const stored = localStorage.getItem(STORAGE_KEY) as CurrencyCode;
        if (stored && DEFAULT_CURRENCIES[stored]) {
            setCurrencyState(stored);
        }

        const handleStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue && DEFAULT_CURRENCIES[e.newValue as CurrencyCode]) {
                setCurrencyState(e.newValue as CurrencyCode);
            }
        };

        const handleCustomEvent = (e: Event) => {
            const ce = e as CustomEvent<{ currency: CurrencyCode }>;
            if (ce.detail && ce.detail.currency) {
                setCurrencyState(ce.detail.currency);
            }
        };

        window.addEventListener('storage', handleStorage);
        window.addEventListener(EVENT_KEY, handleCustomEvent);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener(EVENT_KEY, handleCustomEvent);
        };
    }, []);

    const setCurrency = useCallback((code: CurrencyCode) => {
        if (!DEFAULT_CURRENCIES[code]) return;
        setCurrencyState(code);
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(STORAGE_KEY, code);
                window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: { currency: code } }));
            } catch {
                // ignore
            }
        }
    }, []);

    const formatPrice = useCallback((amountFcfa: number | string | null | undefined): string => {
        if (amountFcfa === null || amountFcfa === undefined || amountFcfa === '') return '';
        const num = typeof amountFcfa === 'number' ? amountFcfa : parseInt(String(amountFcfa).replace(/[^0-9]/g, ''), 10);
        if (isNaN(num) || num <= 0) return String(amountFcfa);
        return convertFcfaTo(num, currency).formatted;
    }, [currency]);

    const convertCycle = useCallback((cycleText: string | null | undefined): string => {
        if (!cycleText) return '';
        return cycleText.replace(/(\d[\d\s]*)\s*(FCFA|XAF)/gi, (match, digits) => {
            const num = parseInt(digits.replace(/\s/g, ''), 10);
            if (isNaN(num)) return match;
            return convertFcfaTo(num, currency).formatted;
        });
    }, [currency]);

    return {
        currency,
        setCurrency,
        formatPrice,
        convertCycle,
        currentConfig: CURRENCIES[currency] || DEFAULT_CURRENCIES.XAF,
    };
}
