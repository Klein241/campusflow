'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type LogoVariant = 'full' | 'horizontal' | 'compact' | 'symbol';
export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';

interface IziTeachLogoProps {
    variant?: LogoVariant;
    size?: LogoSize;
    className?: string;
    isLoading?: boolean;
    showSlogan?: boolean;
    symbolOnly?: boolean;
    onClick?: () => void;
}

export function IziTeachLogo({
    variant = 'full',
    size = 'md',
    className,
    isLoading = false,
    showSlogan,
    symbolOnly = false,
    onClick,
}: IziTeachLogoProps) {
    const finalVariant = symbolOnly ? 'symbol' : variant;

    const sizes = {
        xs: { symbol: 26, title: 'text-sm', slogan: 'text-[8px]' },
        sm: { symbol: 36, title: 'text-base', slogan: 'text-[9px]' },
        md: { symbol: 52, title: 'text-2xl', slogan: 'text-[11px]' },
        lg: { symbol: 64, title: 'text-3xl', slogan: 'text-xs' },
        xl: { symbol: 80, title: 'text-4xl', slogan: 'text-sm' },
        hero: { symbol: 100, title: 'text-5xl', slogan: 'text-base' },
    }[size];

    const renderSymbol = () => (
        <div
            className={cn(
                "relative shrink-0 select-none flex items-center justify-center transition-all duration-300",
                onClick && "cursor-pointer hover:scale-105"
            )}
            style={{ width: sizes.symbol, height: sizes.symbol }}
        >
            {/* Effet gyrophare / phare lumineux au chargement */}
            {isLoading && (
                <>
                    <div 
                        className="absolute -inset-3 rounded-full animate-spin pointer-events-none opacity-80"
                        style={{
                            background: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(20,184,166,0.3) 320deg, rgba(6,182,212,0.9) 360deg)',
                            filter: 'blur(4px)',
                            animationDuration: '1.2s'
                        }}
                    />
                    <div className="absolute -inset-2 rounded-full bg-teal-400/25 blur-md animate-ping" />
                </>
            )}

            {/* Symbole iT vectoriel sur fond transparent */}
            <svg
                viewBox="0 0 120 120"
                className={cn(
                    "w-full h-full drop-shadow-[0_0_14px_rgba(20,184,166,0.5)]",
                    isLoading && "animate-spin"
                )}
                style={{ animationDuration: isLoading ? '3s' : undefined }}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="itCircleGrad" x1="15" y1="15" x2="105" y2="105" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#0B1E38" />
                        <stop offset="50%" stopColor="#0A3252" />
                        <stop offset="100%" stopColor="#0D738A" />
                    </linearGradient>
                    <linearGradient id="itRingGrad" x1="20" y1="100" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#0D738A" stopOpacity="0.2" />
                        <stop offset="50%" stopColor="#14B8A6" />
                        <stop offset="100%" stopColor="#0D738A" stopOpacity="0.2" />
                    </linearGradient>
                </defs>

                <circle cx="60" cy="58" r="44" fill="url(#itCircleGrad)" />
                <path d="M 24 74 C 32 94, 88 94, 96 74" stroke="url(#itRingGrad)" strokeWidth="3.5" strokeLinecap="round" />

                <rect x="78" y="14" width="7" height="7" rx="1.5" fill="#14B8A6" />
                <rect x="88" y="11" width="8" height="8" rx="1.5" fill="#06B6D4" />
                <rect x="83" y="23" width="7" height="7" rx="1.5" fill="#38BDF8" />
                <rect x="74" y="24" width="5" height="5" rx="1" fill="#14B8A6" />
                <rect x="92" y="21" width="5" height="5" rx="1" fill="#0EA5E9" />

                <path d="M 37 36 C 37 32, 42 32, 47 32 L 47 78 C 42 78, 37 78, 37 74 Z" fill="#FFFFFF" />
                <polygon points="46,47 46,65 59,56" fill="#00D2B4" />
                <path d="M 52 38 C 52 33, 56 32, 60 32 L 87 32 C 92 32, 92 37, 88 41 L 76 41 L 76 74 C 76 78, 71 78, 66 78 C 61 78, 61 74, 61 74 L 61 41 L 52 41 Z" fill="#FFFFFF" />
            </svg>
        </div>
    );

    if (finalVariant === 'symbol') {
        return (
            <div onClick={onClick} className={cn("inline-flex items-center justify-center", className)}>
                {renderSymbol()}
            </div>
        );
    }

    if (finalVariant === 'horizontal') {
        return (
            <div onClick={onClick} className={cn("inline-flex items-center gap-3.5", onClick && "cursor-pointer", className)}>
                {renderSymbol()}
                <div className="flex items-center gap-2.5">
                    <span className={cn("font-black tracking-tight text-white", sizes.title)}>
                        Izi<span className="text-teal-400">Teach</span>
                    </span>
                    <span className="text-slate-600 text-sm hidden sm:inline">•</span>
                    <span className={cn("font-semibold uppercase tracking-[0.18em] text-teal-400/90 hidden sm:inline", sizes.slogan)}>
                        Enseigner Simplement
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div onClick={onClick} className={cn("inline-flex items-center gap-3.5", onClick && "cursor-pointer", className)}>
            {renderSymbol()}
            <div className="flex flex-col justify-center -space-y-0.5">
                <span className={cn("font-black tracking-tight leading-none text-white", sizes.title)}>
                    Izi<span className="text-teal-400">Teach</span>
                </span>
                <span className={cn("font-bold uppercase tracking-[0.2em] text-teal-400 leading-tight mt-1", sizes.slogan)}>
                    Enseigner Simplement
                </span>
            </div>
        </div>
    );
}

export default IziTeachLogo;
