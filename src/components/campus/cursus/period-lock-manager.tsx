'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Lock, Unlock, Clock, Sparkles,
    CheckCircle2, X, AlertCircle, Zap, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { isContentUnlocked, formatDripDate, type DripItem } from '@/lib/cursus-drip-service';

interface PeriodLockManagerProps {
    item: DripItem & { id: string; title: string };
    type: 'chapter' | 'lesson';
    canEdit?: boolean;
    onSave?: (updated: {
        unlock_date: string | null;
        lock_date: string | null;
        period_name: string | null;
        is_drip_locked: boolean;
    }) => Promise<void>;
    className?: string;
    compact?: boolean;
}

const PRESET_PERIODS = [
    'Semaine 1', 'Semaine 2', 'Semaine 3', 'Semaine 4',
    'Semaine 5', 'Semaine 6', 'Mois 1', 'Mois 2', 'Période 1', 'Période 2'
];

export function PeriodLockManager({
    item,
    type,
    canEdit = false,
    onSave,
    className,
    compact = false,
}: PeriodLockManagerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [periodName, setPeriodName] = useState(item.period_name || '');
    const [unlockDate, setUnlockDate] = useState(
        item.unlock_date ? new Date(item.unlock_date).toISOString().slice(0, 16) : ''
    );
    const [lockDate, setLockDate] = useState(
        item.lock_date ? new Date(item.lock_date).toISOString().slice(0, 16) : ''
    );
    const [isDripLocked, setIsDripLocked] = useState(Boolean(item.is_drip_locked));

    const status = isContentUnlocked(item);

    // Helper pour appliquer des dates relatives
    const applyRelativeUnlock = (days: number) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        d.setHours(8, 0, 0, 0); // 08:00 par défaut
        setUnlockDate(d.toISOString().slice(0, 16));
        setIsDripLocked(false);
    };

    const handleUnlockImmediate = () => {
        setUnlockDate('');
        setLockDate('');
        setIsDripLocked(false);
    };

    const handleSave = async () => {
        if (!onSave) return;
        setSaving(true);
        try {
            await onSave({
                unlock_date: unlockDate ? new Date(unlockDate).toISOString() : null,
                lock_date: lockDate ? new Date(lockDate).toISOString() : null,
                period_name: periodName.trim() || null,
                is_drip_locked: isDripLocked,
            });
            toast.success('Planning de diffusion mis à jour ✅');
            setIsOpen(false);
        } catch (e: any) {
            toast.error(e.message || 'Erreur d\'enregistrement');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            {/* ── Badge Visuel Cliquable ── */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    if (canEdit) setIsOpen(true);
                }}
                title={canEdit ? 'Configurer la période et la date de déverrouillage' : status.reason}
                className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border font-semibold transition-all text-left select-none',
                    compact ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]',
                    status.statusBadgeColor === 'rose'
                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
                        : status.statusBadgeColor === 'amber'
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                        : status.statusBadgeColor === 'slate'
                        ? 'bg-slate-700/40 border-slate-600 text-slate-300 hover:bg-slate-700/60'
                        : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25',
                    canEdit ? 'cursor-pointer' : 'cursor-default',
                    className
                )}
            >
                {status.isUnlocked ? (
                    <Unlock className="w-3 h-3 text-emerald-400 shrink-0" />
                ) : (
                    <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                )}

                <span className="truncate max-w-[150px]">
                    {item.period_name ? `${item.period_name} • ` : ''}
                    {status.isUnlocked ? 'Déverrouillé' : status.formattedUnlockDate ? `Dispo ${status.formattedUnlockDate.split(' à ')[0]}` : 'Verrouillé'}
                </span>

                {canEdit && (
                    <Calendar className="w-2.5 h-2.5 opacity-60 ml-0.5 shrink-0" />
                )}
            </button>

            {/* ── Modal de Configuration Période & Drip Content ── */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="w-full max-w-lg rounded-3xl bg-slate-900 border border-white/[0.12] p-6 shadow-2xl space-y-5 relative overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Glow accent */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

                            {/* Header */}
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                                            <Calendar className="w-4 h-4 text-violet-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black text-white">
                                                Planifier la diffusion (Drip Content)
                                            </h3>
                                            <p className="text-[11px] text-slate-400">
                                                {type === 'chapter' ? 'Chapitre' : 'Leçon'} : <span className="text-violet-300 font-semibold">{item.title}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Section 1 : Période de formation */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-200">
                                    1. Période / Semaine de formation
                                </Label>
                                <Input
                                    placeholder="Ex: Semaine 1 : Fondamentaux, Mois 1, Module 2..."
                                    value={periodName}
                                    onChange={(e) => setPeriodName(e.target.value)}
                                    className="h-10 text-xs bg-white/[0.04] border-white/[0.08] text-white rounded-xl"
                                />
                                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                    <span className="text-[10px] text-slate-500 font-medium">Raccourcis :</span>
                                    {PRESET_PERIODS.map((preset) => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => setPeriodName(preset)}
                                            className={cn(
                                                'text-[10px] px-2 py-0.5 rounded-md border transition-all font-medium',
                                                periodName === preset
                                                    ? 'bg-violet-500/25 border-violet-500/50 text-violet-300'
                                                    : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08]'
                                            )}
                                        >
                                            {preset}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Section 2 : Date de déverrouillage automatique */}
                            <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
                                <Label className="text-xs font-bold text-slate-200">
                                    2. Date de déverrouillage automatique
                                </Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                        <span className="text-[10px] text-slate-400 block mb-1">Date & Heure de début</span>
                                        <Input
                                            type="datetime-local"
                                            value={unlockDate}
                                            onChange={(e) => setUnlockDate(e.target.value)}
                                            className="h-10 text-xs bg-white/[0.04] border-white/[0.08] text-white rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 block mb-1">Date de fin (optionnelle)</span>
                                        <Input
                                            type="datetime-local"
                                            value={lockDate}
                                            onChange={(e) => setLockDate(e.target.value)}
                                            className="h-10 text-xs bg-white/[0.04] border-white/[0.08] text-white rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleUnlockImmediate}
                                        className="h-7 text-[10px] bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 rounded-lg"
                                    >
                                        ⚡ Immédiat (Toujours dispo)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => applyRelativeUnlock(7)}
                                        className="h-7 text-[10px] bg-white/[0.04] border-white/[0.08] text-slate-300 hover:bg-white/[0.1] rounded-lg"
                                    >
                                        +7 jours
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => applyRelativeUnlock(14)}
                                        className="h-7 text-[10px] bg-white/[0.04] border-white/[0.08] text-slate-300 hover:bg-white/[0.1] rounded-lg"
                                    >
                                        +14 jours
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => applyRelativeUnlock(30)}
                                        className="h-7 text-[10px] bg-white/[0.04] border-white/[0.08] text-slate-300 hover:bg-white/[0.1] rounded-lg"
                                    >
                                        +1 mois
                                    </Button>
                                </div>
                            </div>

                            {/* Section 3 : Verrouillage forcé manuel */}
                            <div className="pt-2 border-t border-white/[0.06]">
                                <label className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={isDripLocked}
                                        onChange={(e) => setIsDripLocked(e.target.checked)}
                                        className="w-4 h-4 rounded text-violet-500 focus:ring-violet-400 bg-slate-800 border-white/[0.2]"
                                    />
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                            <Lock className="w-3.5 h-3.5 text-rose-400" />
                                            Verrouillage forcé manuel
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            Reste verrouillé pour les étudiants même si la date est dépassée.
                                        </p>
                                    </div>
                                </label>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsOpen(false)}
                                    className="text-xs text-slate-400 hover:text-white"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-violet-500/25 px-4"
                                >
                                    {saving ? 'Enregistrement...' : 'Enregistrer le planning'}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
