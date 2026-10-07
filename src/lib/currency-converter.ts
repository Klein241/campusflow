// ==============================================================================
// IziTeach Multi-Currency Converter (FCFA / EUR / USD)
// Devise principale de référence : FCFA (Franc CFA / XAF)
// Devises secondaires : EUR (€) et USD ($)
// - EUR : Parité officielle fixe CEMAC / UEMOA garantie (1 EUR = 655,957 FCFA)
// - USD : Taux de marché en direct (actualisé automatiquement via API de change
//         avec fallback officiel sur 600 FCFA si hors-ligne)
// ==============================================================================

import { useState, useEffect, useCallback } from 'react';

export type CurrencyCode = 'XAF' | 'EUR' | 'USD';

export interface CurrencyConfig {
    code: CurrencyCode;
    label: string;
    symbol: string;
    rateFromFcfa: number; // 1 unité de devise = X FCFA
    flag: string;
    isFixedRate?: boolean; // Vrai pour l'Euro (parité fixe légale CEMAC/UEMOA)
}

// Taux par défaut (Officiels / Référence)
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
        rateFromFcfa: 655.957, // Parité officielle fixe garantie
        flag: '🇪🇺',
        isFixedRate: true,
    },
    USD: {
        code: 'USD',
        label: 'Dollar US',
        symbol: '$',
        rateFromFcfa: 600, // Taux de référence (actualisé en direct si en ligne)
        flag: '🇺🇸',
        isFixedRate: false,
    },
};

export let CURRENCIES: Record<CurrencyCode, CurrencyConfig> = { ...DEFAULT_CURRENCIES };

const STORAGE_KEY = 'iziteach_preferred_currency';
const RATES_CACHE_KEY = 'iziteach_live_rates_cache';
const EVENT_KEY = 'iziteach_currency_changed';

/**
 * Récupère les taux mis en cache local ou par défaut
 */
export function initCachedRates(): void {
    if (typeof window === 'undefined') return;
    try {
        const cached = localStorage.getItem(RATES_CACHE_KEY);
        if (cached) {
            const data = JSON.parse(cached);
            if (data && data.rates && typeof data.rates.USD === 'number') {
                CURRENCIES.USD.rateFromFcfa = data.rates.USD;
                if (typeof data.rates.EUR === 'number') {
                    CURRENCIES.EUR.rateFromFcfa = data.rates.EUR;
                }
            }
        }
    } catch {
        // Ignorer
    }
}

/**
 * Tente d'actualiser les taux en direct depuis une API de change ouverte (sans clé)
 * Met en cache pour 12 heures.
 */
export async function fetchLiveExchangeRates(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
        const cached = localStorage.getItem(RATES_CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            // Si le cache a moins de 12 heures, ne pas refetcher
            if (parsed.timestamp && Date.now() - parsed.timestamp < 12 * 60 * 60 * 1000) {
                return;
            }
        }

        // API de taux de change publique, rapide, SSL et sans clé
        const res = await fetch('https://open.er-api.com/v6/latest/EUR', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.rates && data.rates.XAF && data.rates.USD) {
            const eurToXaf = data.rates.XAF || 655.957;
            const eurToUsd = data.rates.USD || 1.08;
            // 1 USD en XAF = (1 EUR en XAF) / (1 EUR en USD)
            const usdToXaf = Math.round((eurToXaf / eurToUsd) * 100) / 100;

            if (usdToXaf > 400 && usdToXaf < 900) {
                CURRENCIES.USD.rateFromFcfa = usdToXaf;
                localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({
                    timestamp: Date.now(),
                    rates: {
                        EUR: 655.957, // L'Euro reste à sa parité officielle fixe
                        USD: usdToXaf,
                    }
                }));
            }
        }
    } catch {
        // En cas d'erreur ou offline, les taux par défaut (655.957 EUR, 600 USD) restent actifs
    }
}

/**
 * Récupère la devise préférée stockée (ou 'XAF' par défaut)
 */
export function getSavedCurrency(): CurrencyCode {
    if (typeof window === 'undefined') return 'XAF';
    try {
        const saved = localStorage.getItem(STORAGE_KEY) as CurrencyCode;
        if (saved && (saved === 'XAF' || saved === 'EUR' || saved === 'USD')) {
            return saved;
        }
    } catch {
        // Ignorer
    }
    return 'XAF';
}

/**
 * Sauvegarde la devise préférée et notifie tous les composants abonnés
 */
export function setSavedCurrency(currency: CurrencyCode): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, currency);
        window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: currency }));
    } catch {
        // Ignorer
    }
}

/**
 * Convertit un montant FCFA vers la devise cible
 */
export function convertFcfaTo(amountInFcfa: number, targetCurrency: CurrencyCode): number {
    if (!amountInFcfa || isNaN(amountInFcfa) || amountInFcfa <= 0) return 0;
    const config = CURRENCIES[targetCurrency] || CURRENCIES.XAF;
    if (config.code === 'XAF') return amountInFcfa;

    const converted = amountInFcfa / config.rateFromFcfa;
    // Pour les montants >= 100, on arrondit à l'entier le plus proche
    if (converted >= 100) {
        return Math.round(converted);
    }
    // Pour les montants plus faibles, 2 décimales
    return Math.round(converted * 100) / 100;
}

/**
 * Extrait un montant numérique FCFA depuis un nombre ou une chaîne
 * ex: "350 000 FCFA" -> 350000
 * ex: "6 Mois • 160 000 FCFA" -> 160000
 */
export function parseFcfaAmount(input: number | string | null | undefined): number {
    if (input === null || input === undefined) return 0;
    if (typeof input === 'number') return isNaN(input) ? 0 : input;

    const str = String(input);
    const matches = str.match(/(\d[\d\s]*\d|\d+)/);
    if (!matches) return 0;
    const cleaned = matches[0].replace(/\s+/g, '');
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? 0 : num;
}

/**
 * Formate un montant FCFA dans la devise demandée avec son symbole
 * ex: formatPrice(350000, 'XAF') -> "350 000 FCFA"
 * ex: formatPrice(350000, 'EUR') -> "534 €"
 * ex: formatPrice(350000, 'USD') -> "$ 583"
 */
export function formatPriceInCurrency(
    amountInFcfa: number | string | null | undefined,
    targetCurrency: CurrencyCode = 'XAF',
    options?: { showOriginalFcfa?: boolean; compact?: boolean }
): string {
    const rawNum = parseFcfaAmount(amountInFcfa);
    if (!rawNum || rawNum <= 0) {
        return typeof amountInFcfa === 'string' && amountInFcfa.trim() ? amountInFcfa : 'Gratuit';
    }

    const converted = convertFcfaTo(rawNum, targetCurrency);

    let formattedValue: string;
    if (targetCurrency === 'XAF') {
        formattedValue = `${new Intl.NumberFormat('fr-FR').format(rawNum)} FCFA`;
    } else if (targetCurrency === 'EUR') {
        formattedValue = `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: converted % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(converted)} €`;
    } else {
        // USD
        formattedValue = `$ ${new Intl.NumberFormat('en-US', { minimumFractionDigits: converted % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(converted)}`;
    }

    if (options?.showOriginalFcfa && targetCurrency !== 'XAF') {
        return `${formattedValue} (≈ ${new Intl.NumberFormat('fr-FR').format(rawNum)} FCFA)`;
    }

    return formattedValue;
}

/**
 * Remplace dans un texte descriptif de cycle/durée le montant FCFA par la devise sélectionnée
 * ex: "6 Mois (Cycle Pro) • 350 000 FCFA" -> "6 Mois (Cycle Pro) • 534 €"
 */
export function convertCycleText(text: string | null | undefined, targetCurrency: CurrencyCode): string {
    if (!text) return '';
    if (targetCurrency === 'XAF') return text;

    return text.replace(/(\d[\d\s]*)\s*(?:FCFA|XAF|F)/gi, (match) => {
        const num = parseFcfaAmount(match);
        if (num > 0) {
            return formatPriceInCurrency(num, targetCurrency);
        }
        return match;
    });
}

/**
 * Hook React pour utiliser et synchroniser la devise actuelle
 */
export function useCurrency() {
    const [currency, setCurrencyState] = useState<CurrencyCode>('XAF');

    useEffect(() => {
        initCachedRates();
        fetchLiveExchangeRates();

        setCurrencyState(getSavedCurrency());

        const handleStorageOrEvent = (e: any) => {
            if (e.detail && (e.detail === 'XAF' || e.detail === 'EUR' || e.detail === 'USD')) {
                setCurrencyState(e.detail);
            } else {
                setCurrencyState(getSavedCurrency());
            }
        };

        window.addEventListener(EVENT_KEY, handleStorageOrEvent);
        window.addEventListener('storage', handleStorageOrEvent);

        return () => {
            window.removeEventListener(EVENT_KEY, handleStorageOrEvent);
            window.removeEventListener('storage', handleStorageOrEvent);
        };
    }, []);

    const changeCurrency = useCallback((newCurr: CurrencyCode) => {
        setCurrencyState(newCurr);
        setSavedCurrency(newCurr);
    }, []);

    const formatPrice = useCallback((amount: number | string | null | undefined, options?: { showOriginalFcfa?: boolean }) => {
        return formatPriceInCurrency(amount, currency, options);
    }, [currency]);

    const convertCycle = useCallback((text: string | null | undefined) => {
        return convertCycleText(text, currency);
    }, [currency]);

    return {
        currency,
        setCurrency: changeCurrency,
        formatPrice,
        convertCycle,
        config: CURRENCIES[currency],
        availableCurrencies: Object.values(CURRENCIES),
        currentUsdRate: CURRENCIES.USD.rateFromFcfa,
        currentEurRate: CURRENCIES.EUR.rateFromFcfa,
    };
}
