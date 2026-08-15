'use client';

import { useState, useEffect } from 'react';
import {
    Sparkles, Coins, Save, RefreshCw, CheckCircle2,
    Palette, Layers, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
    HERO_BANNER_STYLES,
    LANDING_LAYOUT_TEMPLATES,
    getPremiumStylesPricing,
    savePremiumStylesPricing
} from '@/lib/premium-styles-config';

export function SuperadminStylesPricing() {
    const [prices, setPrices] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getPremiumStylesPricing().then(p => {
            setPrices(p);
            setLoading(false);
        });
    }, []);

    const handlePriceChange = (id: string, val: string) => {
        const num = parseInt(val) || 0;
        setPrices(prev => ({ ...prev, [id]: num }));
    };

    const handleSave = async () => {
        setSaving(true);
        const ok = await savePremiumStylesPricing(prices);
        if (ok) {
            toast.success('Grille tarifaire des Styles Premium enregistrée ✅');
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('storage'));
            }
        } else {
            toast.error('Erreur lors de la sauvegarde');
        }
        setSaving(false);
    };

    const handleResetDefaults = () => {
        const defs: Record<string, number> = {};
        HERO_BANNER_STYLES.forEach(b => { defs[b.id] = b.defaultPrice; });
        LANDING_LAYOUT_TEMPLATES.forEach(t => { defs[t.id] = t.defaultPrice; });
        setPrices(defs);
        toast.info('Valeurs par défaut réinitialisées.');
    };

    if (loading) {
        return (
            <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-teal-400" /> Chargement de la grille tarifaire...
            </div>
        );
    }

    return (
        <div className="p-6 rounded-3xl bg-[#0F131D] border border-white/10 space-y-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-400" /> Tarifs des Styles & Templates (Sky Points)
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                        Définissez le coût en Sky Points que les administrateurs d&apos;écoles doivent payer pour activer chaque style.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleResetDefaults} className="text-xs text-slate-400">
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Défauts
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />} Enregistrer
                    </Button>
                </div>
            </div>

            {/* 1. Bannières Hero */}
            <div className="space-y-3">
                <h4 className="text-sm font-bold text-cyan-400 flex items-center gap-1.5">
                    <Palette className="w-4 h-4" /> Bannières Hero
                </h4>
                <div className="grid sm:grid-cols-3 gap-3">
                    {HERO_BANNER_STYLES.map(b => (
                        <div key={b.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-white text-xs">{b.icon} {b.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min="0"
                                    value={prices[b.id] ?? b.defaultPrice}
                                    onChange={e => handlePriceChange(b.id, e.target.value)}
                                    className="h-9 bg-white/5 border-white/10 text-white text-xs font-bold"
                                />
                                <span className="text-xs text-amber-400 font-semibold shrink-0">pts</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. Layouts Complets */}
            <div className="space-y-3 pt-2">
                <h4 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                    <Layers className="w-4 h-4" /> Modèles de Configuration Complète (Landing Page)
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                    {LANDING_LAYOUT_TEMPLATES.map(t => (
                        <div key={t.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-white text-xs">{t.icon} {t.name}</span>
                                <span className="text-[10px] text-slate-500">{t.isDefault ? '(Par défaut)' : ''}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min="0"
                                    value={prices[t.id] ?? t.defaultPrice}
                                    onChange={e => handlePriceChange(t.id, e.target.value)}
                                    className="h-9 bg-white/5 border-white/10 text-white text-xs font-bold"
                                />
                                <span className="text-xs text-amber-400 font-semibold shrink-0">pts</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
