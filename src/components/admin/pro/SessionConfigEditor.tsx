'use client';

import React, { useState } from 'react';
import { Calendar, Plus, Trash2, Zap, Clock, Tag, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface SessionInstallment {
    number: number;
    label: string;
    amount: number;
    due_date_label?: string;
}

export interface TrainingSessionItem {
    id: string;
    label: string;
    duration_months: number;
    duration_label?: string;
    price: number;
    prix_barre?: number | null;
    promo_badge?: string;
    payment_mode?: string;
    installments: SessionInstallment[];
}

interface SessionConfigEditorProps {
    sessions: TrainingSessionItem[];
    onChange: (sessions: TrainingSessionItem[]) => void;
    onGenerateDefaults?: () => void;
}

export function SessionConfigEditor({
    sessions,
    onChange,
    onGenerateDefaults
}: SessionConfigEditorProps) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

    const updateSession = (index: number, updates: Partial<TrainingSessionItem>) => {
        const next = [...sessions];
        next[index] = { ...next[index], ...updates };
        onChange(next);
    };

    const removeSession = (index: number) => {
        onChange(sessions.filter((_, i) => i !== index));
    };

    const addCustomSession = () => {
        const newDur = sessions.length > 0 ? Math.max(...sessions.map(s => s.duration_months || 1)) + 3 : 1;
        const newSession: TrainingSessionItem = {
            id: `session_${Date.now()}`,
            label: `${newDur} Mois (Formation Personnalisée)`,
            duration_months: newDur,
            duration_label: `${newDur} mois`,
            price: 100000,
            prix_barre: 150000,
            promo_badge: 'Nouveau',
            payment_mode: 'flexible',
            installments: [
                { number: 1, label: '1ère Tranche (Acompte)', amount: 60000, due_date_label: "À l'inscription" },
                { number: 2, label: '2ème Tranche (Solde)', amount: 40000, due_date_label: 'Fin du 1er mois' },
            ]
        };
        onChange([...sessions, newSession]);
        setExpandedIndex(sessions.length);
        toast.success(`Session ${newDur} Mois ajoutée !`);
    };

    const addInstallment = (sessionIdx: number) => {
        const sess = sessions[sessionIdx];
        const nextNum = (sess.installments?.length || 0) + 1;
        const newInst: SessionInstallment = {
            number: nextNum,
            label: `${nextNum}ème Tranche`,
            amount: 0,
            due_date_label: `Échéance ${nextNum}`
        };
        updateSession(sessionIdx, {
            installments: [...(sess.installments || []), newInst]
        });
    };

    const updateInstallment = (sessionIdx: number, instIdx: number, updates: Partial<SessionInstallment>) => {
        const sess = sessions[sessionIdx];
        const nextInsts = [...(sess.installments || [])];
        nextInsts[instIdx] = { ...nextInsts[instIdx], ...updates };
        updateSession(sessionIdx, { installments: nextInsts });
    };

    const removeInstallment = (sessionIdx: number, instIdx: number) => {
        const sess = sessions[sessionIdx];
        const filtered = (sess.installments || []).filter((_, i) => i !== instIdx);
        // Réindexer les numéros
        const reindexed = filtered.map((inst, idx) => ({ ...inst, number: idx + 1 }));
        updateSession(sessionIdx, { installments: reindexed });
    };

    const balanceEqually = (sessionIdx: number) => {
        const sess = sessions[sessionIdx];
        const count = sess.installments?.length || 0;
        if (count === 0) return;
        const total = sess.price || 0;
        const equalPart = Math.floor(total / count / 1000) * 1000;
        const remainder = total - (equalPart * (count - 1));

        const updated = sess.installments.map((inst, idx) => ({
            ...inst,
            amount: idx === count - 1 ? remainder : equalPart
        }));
        updateSession(sessionIdx, { installments: updated });
        toast.success('Tranches réparties équitablement !');
    };

    return (
        <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
            {/* En-tête */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h5 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span>Sessions multi-durées & Tranches de paiement</span>
                    </h5>
                    <p className="text-[10px] text-slate-400">
                        Modifiez les durées, tarifs et échéances de paiement personnalisés pour cette formation.
                    </p>
                </div>
                <div className="flex items-center gap-1.5">
                    {onGenerateDefaults && (
                        <button
                            type="button"
                            onClick={onGenerateDefaults}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-500/30 transition cursor-pointer"
                        >
                            🪄 {sessions.length > 0 ? 'Régénérer 1M/3M/6M' : 'Générer 1M/3M/6M'}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={addCustomSession}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 transition flex items-center gap-1 cursor-pointer"
                    >
                        <Plus className="w-3 h-3" />
                        <span>Ajouter session</span>
                    </button>
                </div>
            </div>

            {/* Liste des sessions */}
            {sessions.length > 0 ? (
                <div className="space-y-2.5 pt-1">
                    {sessions.map((sess, sIdx) => {
                        const isExpanded = expandedIndex === sIdx;
                        const sumInstallments = (sess.installments || []).reduce((acc, inst) => acc + (inst.amount || 0), 0);
                        const isBalanced = sumInstallments === sess.price;

                        return (
                            <div key={sess.id || sIdx} className="rounded-xl bg-slate-900/90 border border-white/10 overflow-hidden text-xs">
                                {/* Barre résumé de la session */}
                                <div
                                    className="p-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-white/[0.02] transition"
                                    onClick={() => setExpandedIndex(isExpanded ? null : sIdx)}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-black flex items-center justify-center shrink-0">
                                            {sess.duration_months}M
                                        </span>
                                        <div className="min-w-0">
                                            <p className="font-bold text-white text-xs truncate">
                                                {sess.label || `${sess.duration_months} Mois`}
                                            </p>
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                                <span>{(sess.installments || []).length} tranche(s)</span>
                                                {sess.promo_badge && (
                                                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-semibold">
                                                        {sess.promo_badge}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="text-right">
                                            <p className="font-mono font-bold text-amber-300 text-xs">
                                                {new Intl.NumberFormat('fr-FR').format(sess.price || 0)} FCFA
                                            </p>
                                            {sess.prix_barre && (
                                                <p className="text-[10px] text-slate-500 line-through font-mono">
                                                    {new Intl.NumberFormat('fr-FR').format(sess.prix_barre)} FCFA
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); removeSession(sIdx); }}
                                            className="p-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition cursor-pointer"
                                            title="Supprimer cette session"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>

                                        <div className="p-1 text-slate-400">
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Panneau d'édition détaillé */}
                                {isExpanded && (
                                    <div className="p-3 border-t border-white/10 bg-black/30 space-y-3">
                                        {/* Paramètres de base de la session */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-300 block mb-1">
                                                    Intitulé de la session
                                                </label>
                                                <Input
                                                    value={sess.label}
                                                    onChange={e => updateSession(sIdx, { label: e.target.value })}
                                                    placeholder="Ex: 3 Mois (Accéléré)"
                                                    className="h-8 text-xs bg-white/5 border-white/10 text-white rounded-lg"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-300 block mb-1">
                                                    Durée (en mois)
                                                </label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    max="36"
                                                    value={sess.duration_months}
                                                    onChange={e => {
                                                        const val = parseInt(e.target.value, 10) || 1;
                                                        updateSession(sIdx, {
                                                            duration_months: val,
                                                            duration_label: `${val} mois`
                                                        });
                                                    }}
                                                    className="h-8 text-xs bg-white/5 border-white/10 text-white rounded-lg font-mono"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-[10px] font-bold text-slate-300">
                                                        Tarif total (FCFA)
                                                    </label>
                                                    {sess.price > 0 && (
                                                        <span className="text-[9px] text-amber-300 font-mono">
                                                            ≈ {Math.round(sess.price / 655.957)} € | ≈ {Math.round(sess.price / 600)} $
                                                        </span>
                                                    )}
                                                </div>
                                                <Input
                                                    type="number"
                                                    step="1000"
                                                    value={sess.price}
                                                    onChange={e => updateSession(sIdx, { price: parseInt(e.target.value, 10) || 0 })}
                                                    placeholder="Tarif FCFA"
                                                    className="h-8 text-xs bg-white/5 border-white/10 text-amber-300 rounded-lg font-mono font-bold"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-[10px] font-bold text-slate-300">
                                                        Prix initial barré (Optionnel)
                                                    </label>
                                                    {sess.prix_barre && sess.prix_barre > 0 && (
                                                        <span className="text-[9px] text-slate-400 font-mono">
                                                            ≈ {Math.round(sess.prix_barre / 655.957)} € | ≈ {Math.round(sess.prix_barre / 600)} $
                                                        </span>
                                                    )}
                                                </div>
                                                <Input
                                                    type="number"
                                                    step="1000"
                                                    value={sess.prix_barre || ''}
                                                    onChange={e => updateSession(sIdx, { prix_barre: e.target.value ? parseInt(e.target.value, 10) : null })}
                                                    placeholder="Ex: 150 000"
                                                    className="h-8 text-xs bg-white/5 border-white/10 text-slate-400 rounded-lg font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-300 block mb-1">
                                                    Badge promo (Optionnel)
                                                </label>
                                                <Input
                                                    value={sess.promo_badge || ''}
                                                    onChange={e => updateSession(sIdx, { promo_badge: e.target.value || undefined })}
                                                    placeholder="Ex: Populaire, Express, Recommandé..."
                                                    className="h-8 text-xs bg-white/5 border-white/10 text-white rounded-lg"
                                                />
                                            </div>
                                        </div>

                                        {/* Gestion des Tranches de paiement */}
                                        <div className="pt-2 border-t border-white/10 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                                                    <span>💳 Échéancier de paiement (Tranches)</span>
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => balanceEqually(sIdx)}
                                                        className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/20 flex items-center gap-1 cursor-pointer"
                                                        title="Répartir le tarif total équitablement entre toutes les tranches"
                                                    >
                                                        <Zap className="w-2.5 h-2.5" />
                                                        <span>Équilibrer</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => addInstallment(sIdx)}
                                                        className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[10px] font-semibold border border-emerald-500/25 flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <Plus className="w-2.5 h-2.5" />
                                                        <span>Tranche</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Liste des tranches */}
                                            {sess.installments && sess.installments.length > 0 ? (
                                                <div className="space-y-1.5">
                                                    {sess.installments.map((inst, iIdx) => (
                                                        <div key={iIdx} className="grid grid-cols-12 gap-1.5 items-center p-2 rounded-lg bg-black/40 border border-white/5">
                                                            <div className="col-span-5">
                                                                <Input
                                                                    value={inst.label}
                                                                    onChange={e => updateInstallment(sIdx, iIdx, { label: e.target.value })}
                                                                    placeholder="Libellé tranche"
                                                                    className="h-7 text-[11px] bg-white/5 border-white/10 text-white rounded px-2"
                                                                />
                                                            </div>
                                                            <div className="col-span-3">
                                                                <Input
                                                                    type="number"
                                                                    step="1000"
                                                                    value={inst.amount}
                                                                    onChange={e => updateInstallment(sIdx, iIdx, { amount: parseInt(e.target.value, 10) || 0 })}
                                                                    placeholder="Montant FCFA"
                                                                    className="h-7 text-[11px] bg-white/5 border-white/10 text-amber-300 rounded font-mono px-2 font-bold"
                                                                />
                                                            </div>
                                                            <div className="col-span-3">
                                                                <Input
                                                                    value={inst.due_date_label || ''}
                                                                    onChange={e => updateInstallment(sIdx, iIdx, { due_date_label: e.target.value })}
                                                                    placeholder="Ex: À l'inscription"
                                                                    className="h-7 text-[10px] bg-white/5 border-white/10 text-slate-300 rounded px-2"
                                                                />
                                                            </div>
                                                            <div className="col-span-1 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeInstallment(sIdx, iIdx)}
                                                                    className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                                                                    title="Supprimer cette tranche"
                                                                >
                                                                    <Trash2 className="w-3 h-3 mx-auto" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* Vérification du total des tranches vs tarif session */}
                                                    <div className={cn(
                                                        "flex items-center justify-between text-[10px] px-2 py-1 rounded-lg border",
                                                        isBalanced 
                                                            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                                                            : "bg-amber-500/15 border-amber-500/30 text-amber-200"
                                                    )}>
                                                        <span>
                                                            Total tranches : <strong>{new Intl.NumberFormat('fr-FR').format(sumInstallments)} FCFA</strong> / {new Intl.NumberFormat('fr-FR').format(sess.price)} FCFA
                                                        </span>
                                                        <span>
                                                            {isBalanced ? '✓ Équilibré à 100%' : `⚠️ Écart de ${new Intl.NumberFormat('fr-FR').format(sess.price - sumInstallments)} FCFA`}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-slate-500 italic">
                                                    Paiement en une seule fois (aucune tranche échelonnée configurée).
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-4 bg-black/20 rounded-xl border border-dashed border-white/10">
                    <p className="text-[11px] text-slate-400 mb-2">
                        Aucune session multi-durées configurée pour le moment.
                    </p>
                    <div className="flex items-center justify-center gap-2">
                        {onGenerateDefaults && (
                            <button
                                type="button"
                                onClick={onGenerateDefaults}
                                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30 cursor-pointer"
                            >
                                🪄 Générer les 3 sessions types (1M / 3M / 6M)
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={addCustomSession}
                            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10 cursor-pointer"
                        >
                            + Ajouter manuellement
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
