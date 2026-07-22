'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Smartphone, CheckCircle2, X, Share, Plus, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════
// PWA INSTALL — Composant multi-tenant
// • Injecte le manifest.webmanifest propre à l'org dans le <head>
// • Capture beforeinstallprompt pour proposer l'installation
// • Fournit un guide step-by-step sur iOS (pas de prompt natif)
// ═══════════════════════════════════════════════════════

interface PwaInstallProps {
    orgSlug: string;
    orgName: string;
    orgLogo?: string | null;
    /** Render as a compact button (e.g. in the header) */
    compact?: boolean;
}

type InstallStep = 'idle' | 'prompt' | 'ios-guide' | 'installed';

export function PwaInstall({ orgSlug, orgName, orgLogo, compact = false }: PwaInstallProps) {
    const [step, setStep] = useState<InstallStep>('idle');
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    // ── Inject per-tenant manifest link ────────────────────────────
    useEffect(() => {
        if (!orgSlug) return;
        const manifestHref = `/${orgSlug}/manifest.webmanifest`;

        // Remove existing manifest link (if any)
        const existing = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
        if (existing) {
            existing.href = manifestHref;
        } else {
            const link = document.createElement('link');
            link.rel = 'manifest';
            link.href = manifestHref;
            document.head.appendChild(link);
        }

        // Update <meta name="apple-mobile-web-app-title">
        const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
        if (appleTitle) appleTitle.setAttribute('content', orgName);
    }, [orgSlug, orgName]);

    // ── Detect platform & capture install event ─────────────────────
    useEffect(() => {
        // iOS detection
        const ua = navigator.userAgent;
        const ios = /iphone|ipad|ipod/i.test(ua);
        setIsIOS(ios);

        // Already installed as standalone PWA?
        const standalone =
            (navigator as any).standalone === true ||
            window.matchMedia('(display-mode: standalone)').matches;
        if (standalone) { setIsInstalled(true); return; }

        // Chrome/Android install prompt
        const onPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', onPrompt);

        // Track successful install
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        });

        return () => window.removeEventListener('beforeinstallprompt', onPrompt);
    }, []);

    // ── Trigger native install prompt (Chrome/Android) ──────────────
    const triggerInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const result = await deferredPrompt.userChoice;
            if (result.outcome === 'accepted') setIsInstalled(true);
            setDeferredPrompt(null);
        } else if (isIOS) {
            setStep('ios-guide');
        }
    };

    // Already installed — show nothing or a badge
    if (isInstalled) {
        if (compact) return null;
        return (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Application installée
            </div>
        );
    }

    // No install capability
    if (!deferredPrompt && !isIOS) return null;

    // ─── Compact button (in-header style) ───────────────────────────
    if (compact) {
        return (
            <>
                <button
                    onClick={() => deferredPrompt ? setStep('prompt') : setStep('ios-guide')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold hover:bg-teal-500/20 transition-all"
                >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Installer l&apos;app</span>
                </button>

                <AnimatePresence>
                    {(step === 'prompt' || step === 'ios-guide') && (
                        <InstallModal
                            orgName={orgName}
                            orgLogo={orgLogo}
                            orgSlug={orgSlug}
                            isIOS={isIOS}
                            onInstall={triggerInstall}
                            onClose={() => setStep('idle')}
                        />
                    )}
                </AnimatePresence>
            </>
        );
    }

    // ─── Full card (in ProfileView) ──────────────────────────────────
    return (
        <>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/[0.07] to-cyan-500/[0.04] p-4">
                {/* Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-400/10 blur-3xl rounded-full pointer-events-none" />

                <div className="flex items-start gap-3 relative z-10">
                    {/* Icon */}
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/25">
                        {orgLogo
                            ? <img src={orgLogo} alt={orgName} className="w-8 h-8 object-contain rounded-lg" />
                            : <GraduationCap className="w-6 h-6 text-white" />
                        }
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white leading-tight">Installer l&apos;app</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                            Ajoutez <strong className="text-white">{orgName}</strong> à votre écran d&apos;accueil pour un accès rapide.
                        </p>
                    </div>
                </div>

                <Button
                    onClick={() => deferredPrompt ? triggerInstall() : setStep('ios-guide')}
                    className="mt-3 w-full h-9 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 font-bold rounded-xl text-sm shadow-lg shadow-teal-600/20 relative z-10">
                    <Download className="w-4 h-4 mr-2" />
                    {isIOS ? 'Voir comment installer' : 'Installer maintenant'}
                </Button>
            </motion.div>

            <AnimatePresence>
                {step === 'ios-guide' && (
                    <InstallModal
                        orgName={orgName}
                        orgLogo={orgLogo}
                        orgSlug={orgSlug}
                        isIOS={isIOS}
                        onInstall={triggerInstall}
                        onClose={() => setStep('idle')}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

// ─── iOS / Android install guide modal ──────────────────────────────
function InstallModal({ orgName, orgLogo, orgSlug, isIOS, onInstall, onClose }: {
    orgName: string;
    orgLogo?: string | null;
    orgSlug: string;
    isIOS: boolean;
    onInstall: () => void;
    onClose: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={onClose}>
            <motion.div
                initial={{ y: 60, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 60, opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-sm bg-[#111419] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">

                {/* Header */}
                <div className="relative p-5 pb-4 bg-gradient-to-br from-teal-900/40 to-cyan-900/20 border-b border-white/[0.06]">
                    <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                        <X className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-teal-500/30 overflow-hidden">
                            {orgLogo
                                ? <img src={orgLogo} alt={orgName} className="w-12 h-12 object-contain" />
                                : <GraduationCap className="w-8 h-8 text-white" />
                            }
                        </div>
                        <div>
                            <p className="font-black text-white text-base leading-tight">{orgName}</p>
                            <p className="text-xs text-teal-400 font-medium">Application mobile</p>
                        </div>
                    </div>
                </div>

                <div className="p-5 space-y-5">
                    {isIOS ? (
                        /* iOS guide */
                        <div className="space-y-3">
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Guide d&apos;installation iOS</p>
                            {[
                                { icon: Share, step: '1', text: 'Appuyez sur le bouton Partager en bas de Safari', color: 'text-blue-400' },
                                { icon: Plus, step: '2', text: 'Faites défiler et appuyez sur « Sur l\'écran d\'accueil »', color: 'text-teal-400' },
                                { icon: CheckCircle2, step: '3', text: `Confirmez en appuyant sur « Ajouter » en haut à droite`, color: 'text-emerald-400' },
                            ].map(({ icon: Icon, step, text, color }) => (
                                <div key={step} className="flex items-start gap-3">
                                    <div className={cn('w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5', color)}>
                                        <span className="text-[10px] font-black">{step}</span>
                                    </div>
                                    <p className="text-sm text-slate-300 leading-relaxed">{text}</p>
                                </div>
                            ))}
                            <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                                <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                                <p className="text-xs text-amber-300">Assurez-vous d&apos;être dans <strong>Safari</strong> (pas Chrome ou Firefox)</p>
                            </div>
                        </div>
                    ) : (
                        /* Android / Chrome */
                        <div className="space-y-3">
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Installer sur votre appareil</p>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                Ajoutez <strong className="text-white">{orgName}</strong> à votre écran d&apos;accueil pour un accès rapide, même hors connexion.
                            </p>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                {['Accès rapide', 'Hors ligne', 'Notifs push'].map(f => (
                                    <div key={f} className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                        <p className="text-[10px] text-slate-400 font-medium">{f}</p>
                                    </div>
                                ))}
                            </div>
                            <Button onClick={onInstall}
                                className="w-full h-11 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 font-black rounded-xl shadow-lg shadow-teal-600/25">
                                <Download className="w-4 h-4 mr-2" />
                                Installer {orgName}
                            </Button>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
