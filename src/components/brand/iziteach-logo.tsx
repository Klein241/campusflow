'use client';

import React, { useEffect, useState } from 'react';
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
    animated?: boolean; // ← effet phare au chargement
    onClick?: () => void;
}

/**
 * ═══════════════════════════════════════════════════════════════
 * IZITEACH — LOGO OFFICIEL 100% SVG TRANSPARENT PREMIUM
 * ═══════════════════════════════════════════════════════════════
 * 
 * • Aucun fond blanc — badge vectoriel pur sur fond sombre
 * • Effet "phare lumineux" rotatif au chargement (animated=true)
 * • Tailles calibrées pour header desktop & mobile
 * 
 * Variants :
 *  "full"       → Symbole iT + IziTeach + slogan vertical
 *  "horizontal" → Symbole iT + IziTeach + slogan horizontal
 *  "compact"    → Symbole iT + IziTeach
 *  "symbol"     → Symbole iT seul (favicon, PWA, loader)
 */
export function IziTeachLogo({
    variant = 'compact',
    theme = 'dark',
    size = 'md',
    className,
    showSlogan,
    symbolOnly = false,
    animated = false,
    onClick,
}: IziTeachLogoProps) {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Déclencher l'animation phare après 100ms
        const t = setTimeout(() => setIsLoaded(true), 100);
        return () => clearTimeout(t);
    }, []);

    const finalVariant: LogoVariant = symbolOnly ? 'symbol' : variant;

    // Dimensions selon la taille
    const sizeConfig = {
        xs: { symbol: 22, text: 'text-xs',    slogan: 'text-[9px]',  gap: 'gap-1.5' },
        sm: { symbol: 32, text: 'text-sm',    slogan: 'text-[10px]', gap: 'gap-2'   },
        md: { symbol: 42, text: 'text-base',  slogan: 'text-[11px]', gap: 'gap-2.5' },
        lg: { symbol: 54, text: 'text-xl',    slogan: 'text-xs',     gap: 'gap-3'   },
        xl: { symbol: 72, text: 'text-2xl',   slogan: 'text-sm',     gap: 'gap-3.5' },
    }[size];

    const s = sizeConfig.symbol;

    // ── Symbole SVG « iT » 100% transparent & premium ──────────────
    const renderSymbol = () => (
        <div
            className={cn(
                'relative shrink-0 select-none',
                animated && 'logo-beacon-wrap'
            )}
            style={{ width: s, height: s }}
        >
            {/* Halo néon externe (pulse) */}
            {animated && (
                <span
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle, rgba(0,212,212,0.18) 0%, transparent 70%)',
                        animation: isLoaded ? 'itPulseHalo 2.4s ease-in-out infinite' : 'none',
                    }}
                />
            )}

            {/* Faisceau rotatif (effet phare) */}
            {animated && (
                <span
                    className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
                    style={{ zIndex: 2 }}
                >
                    <span
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            width: '200%',
                            height: '200%',
                            transform: 'translate(-50%, -50%)',
                            background: 'conic-gradient(from 0deg, transparent 0deg, rgba(0,230,230,0.32) 18deg, transparent 36deg)',
                            animation: isLoaded ? 'itBeamSpin 2.2s linear infinite' : 'none',
                            borderRadius: '50%',
                        }}
                    />
                </span>
            )}

            {/* Badge SVG principal */}
            <svg
                viewBox="0 0 100 100"
                width={s}
                height={s}
                xmlns="http://www.w3.org/2000/svg"
                style={{ display: 'block', position: 'relative', zIndex: 3 }}
                aria-label="IziTeach — iT"
            >
                <defs>
                    <radialGradient id="itBg" cx="50%" cy="50%" r="50%">
                        <stop offset="0%"   stopColor="#0a2a3a" />
                        <stop offset="100%" stopColor="#060f1a" />
                    </radialGradient>
                    <linearGradient id="itStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%"   stopColor="#00d4d4" stopOpacity="0.9" />
                        <stop offset="50%"  stopColor="#3b9eff" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="#00d4d4" stopOpacity="0.5" />
                    </linearGradient>
                    <linearGradient id="itTextGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%"   stopColor="#ffffff" />
                        <stop offset="55%"  stopColor="#cce8ff" />
                        <stop offset="100%" stopColor="#00d4d4" />
                    </linearGradient>
                    <filter id="itGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Fond circulaire sombre translucide */}
                <circle cx="50" cy="50" r="47" fill="url(#itBg)" opacity="0.95" />

                {/* Anneau dégradé cyan */}
                <circle
                    cx="50" cy="50" r="46"
                    fill="none"
                    stroke="url(#itStroke)"
                    strokeWidth="2.2"
                />

                {/* Lettre « i » */}
                <text
                    x="30"
                    y="68"
                    fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
                    fontWeight="900"
                    fontSize="46"
                    fill="url(#itTextGrad)"
                    filter="url(#itGlow)"
                    letterSpacing="-2"
                >i</text>

                {/* Lettre « T » légèrement décalée, couleur cyan vive */}
                <text
                    x="46"
                    y="68"
                    fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
                    fontWeight="900"
                    fontSize="46"
                    fill="#00d4d4"
                    filter="url(#itGlow)"
                    letterSpacing="-2"
                >T</text>

                {/* Point décoratif sous-ligne */}
                <circle cx="50" cy="80" r="2.5" fill="#00d4d4" opacity="0.6" />
            </svg>
        </div>
    );

    // ── Couleurs texte ───────────────────────────────────────────────
    const brandText = theme === 'light' ? 'text-slate-900' : 'text-white';

    // ── Rendu des variants ──────────────────────────────────────────

    // 1. Symbol seul
    if (finalVariant === 'symbol') {
        return (
            <div
                onClick={onClick}
                className={cn('inline-flex items-center justify-center select-none', onClick && 'cursor-pointer', className)}
                title="IziTeach — Enseigner Simplement"
            >
                {renderSymbol()}
            </div>
        );
    }

    // 2. Horizontal (footer, bannières)
    if (finalVariant === 'horizontal') {
        return (
            <div
                onClick={onClick}
                className={cn('inline-flex items-center select-none', sizeConfig.gap, onClick && 'cursor-pointer', className)}
            >
                {renderSymbol()}
                <div className="flex items-center gap-2">
                    <span className={cn('font-black tracking-tight leading-none', sizeConfig.text, brandText)}>
                        Izi<span className="text-teal-400">Teach</span>
                    </span>
                    <span className="text-slate-500 text-xs hidden sm:inline">•</span>
                    <span className={cn('font-medium text-slate-400 italic hidden sm:inline', sizeConfig.slogan)}>
                        Enseigner Simplement
                    </span>
                </div>
            </div>
        );
    }

    // 3. Full — vertical avec slogan
    if (finalVariant === 'full' || showSlogan) {
        return (
            <div
                onClick={onClick}
                className={cn('inline-flex items-center select-none', sizeConfig.gap, onClick && 'cursor-pointer', className)}
            >
                {renderSymbol()}
                <div className="flex flex-col leading-none">
                    <span className={cn('font-black tracking-tight', sizeConfig.text, brandText)}>
                        Izi<span className="text-teal-400">Teach</span>
                    </span>
                    <span className={cn('font-bold tracking-widest text-teal-400/90 mt-[3px] uppercase', sizeConfig.slogan)}>
                        Enseigner Simplement
                    </span>
                </div>
            </div>
        );
    }

    // 4. Compact (header mobile & dashboards)
    return (
        <div
            onClick={onClick}
            className={cn('inline-flex items-center select-none', sizeConfig.gap, onClick && 'cursor-pointer', className)}
        >
            {renderSymbol()}
            <span className={cn('font-black tracking-tight leading-none', sizeConfig.text, brandText)}>
                Izi<span className="text-teal-400">Teach</span>
            </span>
        </div>
    );
}

export default IziTeachLogo;
