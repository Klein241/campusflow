'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export type LogoVariant = 'full' | 'horizontal' | 'compact' | 'symbol';
export type LogoTheme = 'dark' | 'light' | 'auto';
export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface IziTeachLogoProps {
    variant?: LogoVariant;
    theme?: LogoTheme;
    size?: LogoSize;
    className?: string;
    showSlogan?: boolean;
    symbolOnly?: boolean;
    onClick?: () => void;
}

/**
 * ═══════════════════════════════════════════════════════════════
 * IZITEACH — COMPOSANT OFFICIEL DE LOGO & IDENTITÉ DE MARQUE
 * ═══════════════════════════════════════════════════════════════
 * 
 * 1. Variant "full" : Symbole iT + « IziTeach » + « Enseigner Simplement »
 *    → Page d'accueil, Header Desktop, Login, Inscription, Présentation, Tarifs
 * 
 * 2. Variant "horizontal" : Symbole iT + « IziTeach » — « Enseigner Simplement »
 *    → Footer, Bannières, Documents officiels
 * 
 * 3. Variant "compact" : Symbole iT + « IziTeach »
 *    → Header Mobile, Dashboard Admin/Prof/Student/Superadmin
 * 
 * 4. Variant "symbol" : Symbole iT dans cercle
 *    → Favicon, PWA, Loading, Avatar officiel, Watermark
 */
export function IziTeachLogo({
    variant = 'compact',
    theme = 'dark',
    size = 'md',
    className,
    showSlogan,
    symbolOnly = false,
    onClick,
}: IziTeachLogoProps) {
    // Si symbolOnly est activé, forcer la variante symbol
    const finalVariant: LogoVariant = symbolOnly ? 'symbol' : variant;

    // Dimensions en fonction de la taille
    const sizeConfig = {
        xs: { symbol: 20, text: 'text-xs', slogan: 'text-[9px]' },
        sm: { symbol: 28, text: 'text-sm', slogan: 'text-[10px]' },
        md: { symbol: 36, text: 'text-base', slogan: 'text-[11px]' },
        lg: { symbol: 48, text: 'text-xl', slogan: 'text-xs' },
        xl: { symbol: 64, text: 'text-2xl', slogan: 'text-sm' },
    }[size];

    // Rendu du Symbole officiel « iT »
    const renderSymbol = () => (
        <div
            className={cn(
                "relative rounded-full overflow-hidden shrink-0 flex items-center justify-center shadow-lg transition-transform hover:scale-105",
                theme === 'dark' ? "ring-1 ring-teal-500/30 bg-[#0B1524]" : "ring-1 ring-teal-600/20 bg-white"
            )}
            style={{ width: sizeConfig.symbol, height: sizeConfig.symbol }}
        >
            <img
                src="/logo-campusflow.png"
                alt="iT — IziTeach"
                className="w-full h-full object-cover"
                loading="eager"
            />
        </div>
    );

    // 1. Symbole pur
    if (finalVariant === 'symbol') {
        return (
            <div
                onClick={onClick}
                className={cn("inline-flex items-center justify-center select-none", onClick && "cursor-pointer", className)}
                title="IziTeach — Enseigner Simplement"
            >
                {renderSymbol()}
            </div>
        );
    }

    // 2. Variante Horizontal
    if (finalVariant === 'horizontal') {
        return (
            <div
                onClick={onClick}
                className={cn(
                    "inline-flex items-center gap-2.5 select-none",
                    onClick && "cursor-pointer",
                    className
                )}
            >
                {renderSymbol()}
                <div className="flex items-center gap-2">
                    <span className={cn("font-black tracking-tight", sizeConfig.text, theme === 'light' ? "text-slate-900" : "text-white")}>
                        Izi<span className="text-teal-400">Teach</span>
                    </span>
                    <span className="text-slate-500 text-xs hidden sm:inline">•</span>
                    <span className={cn("font-medium tracking-normal text-slate-400 italic hidden sm:inline", sizeConfig.slogan)}>
                        Enseigner Simplement
                    </span>
                </div>
            </div>
        );
    }

    // 3. Variante Full (Vertical avec Slogan)
    if (finalVariant === 'full' || showSlogan) {
        return (
            <div
                onClick={onClick}
                className={cn(
                    "inline-flex items-center gap-2.5 select-none",
                    onClick && "cursor-pointer",
                    className
                )}
            >
                {renderSymbol()}
                <div className="flex flex-col leading-none">
                    <span className={cn("font-black tracking-tight", sizeConfig.text, theme === 'light' ? "text-slate-900" : "text-white")}>
                        Izi<span className="text-teal-400">Teach</span>
                    </span>
                    <span className={cn("font-semibold tracking-wide text-teal-400/90 mt-1 uppercase text-[9px] sm:text-[10px]", sizeConfig.slogan)}>
                        Enseigner Simplement
                    </span>
                </div>
            </div>
        );
    }

    // 4. Variante Compact (Header Mobile & Dashboards)
    return (
        <div
            onClick={onClick}
            className={cn(
                "inline-flex items-center gap-2.5 select-none",
                onClick && "cursor-pointer",
                className
            )}
        >
            {renderSymbol()}
            <span className={cn("font-black tracking-tight", sizeConfig.text, theme === 'light' ? "text-slate-900" : "text-white")}>
                Izi<span className="text-teal-400">Teach</span>
            </span>
        </div>
    );
}

export default IziTeachLogo;
