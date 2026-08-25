'use client';

/**
 * FilierePricingModal — Modal de configuration des tarifs et tranches de scolarité
 * Permet à l'administrateur de l'établissement de définir :
 *  - Frais d'inscription (ex: 50 000 XAF)
 *  - Frais de scolarité annuels (ex: 450 000 XAF)
 *  - Échéancier de paiement par tranches avec dates limites
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Plus, Trash2, Save, Loader2, Coins, Calendar,
    CheckCircle2, AlertCircle, Info, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { formatXAF } from '@/lib/camerpay';
import type { EcheancePaiement } from '@/lib/filieres/types';

interface FilierePricingModalProps {
    open: boolean;
    onClose: () => void;
    targetType: 'classroom' | 'filiere';
    targetId: string;
    targetName: string;
    initialFraisScolarite?: number;
    initialFraisInscription?: number;
    initialEcheances?: EcheancePaiement[];
    onSaved?: (fraisScolarite: number, fraisInscription: number, echeances: EcheancePaiement[]) => void;
}

export function FilierePricingModal({
    open,
    onClose,
    targetType,
    targetId,
    targetName,
    initialFraisScolarite = 0,
    initialFraisInscription = 0,
    initialEcheances = [],
    onSaved,
}: FilierePricingModalProps) {
    const [fraisScolarite, setFraisScolarite] = useState<number>(initialFraisScolarite || 0);
    const [fraisInscription, setFraisInscription] = useState<number>(initialFraisInscription || 0);
    const [echeances, setEcheances] = useState<EcheancePaiement[]>(
        initialEcheances?.length > 0
            ? initialEcheances
            : [
                  { tranche: 1, nom: '1ère tranche (Acompte)', montant: Math.round((initialFraisScolarite || 0) * 0.4), date_limite: '' },
                  { tranche: 2, nom: '2ème tranche', montant: Math.round((initialFraisScolarite || 0) * 0.3), date_limite: '' },
                  { tranche: 3, nom: '3ème tranche (Solde)', montant: Math.round((initialFraisScolarite || 0) * 0.3), date_limite: '' },
              ]
    );
    const [saving, setSaving] = useState(false);

    // Calcul somme des tranches
    const totalTranches = echeances.reduce((acc, curr) => acc + (Number(curr.montant) || 0), 0);
    const diff = Number(fraisScolarite) - totalTranches;

    function handleAddTranche() {
        const nextNum = echeances.length + 1;
        setEcheances(prev => [
            ...prev,
            { tranche: nextNum, nom: `${nextNum}ème tranche`, montant: Math.max(0, diff), date_limite: '' }
        ]);
    }

    function handleRemoveTranche(index: number) {
        setEcheances(prev => prev.filter((_, i) => i !== index).map((e, idx) => ({ ...e, tranche: idx + 1 })));
    }

    function handleTrancheChange(index: number, field: keyof EcheancePaiement, val: any) {
        setEcheances(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: val };
            return copy;
        });
    }

    async function handleAutoDistribute() {
        if (fraisScolarite <= 0) return;
        const count = Math.max(1, echeances.length || 3);
        const part = Math.floor(fraisScolarite / count);
        const remainder = fraisScolarite - (part * count);
        
        const newEchs: EcheancePaiement[] = [];
        for (let i = 0; i < count; i++) {
            newEchs.push({
                tranche: i + 1,
                nom: i === 0 ? '1ère tranche (Acompte)' : i === count - 1 ? `${i + 1}ème tranche (Solde)` : `${i + 1}ème tranche`,
                montant: part + (i === 0 ? remainder : 0),
                date_limite: echeances[i]?.date_limite || '',
            });
        }
        setEcheances(newEchs);
    }

    async function handleSave() {
        setSaving(true);
        try {
            const table = targetType === 'classroom' ? 'classrooms' : 'filieres';
            const { error } = await supabase
                .from(table)
                .update({
                    frais_scolarite: Number(fraisScolarite) || 0,
                    frais_inscription: Number(fraisInscription) || 0,
                    echeances: echeances,
                })
                .eq('id', targetId);

            if (error) throw error;

            toast.success(`Tarifs et échéances mis à jour pour ${targetName} !`);
            onSaved?.(Number(fraisScolarite) || 0, Number(fraisInscription) || 0, echeances);
            onClose();
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    }

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Overlay */}
                    <motion.div
                        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="relative w-full max-w-xl bg-[#0F1420] border border-white/10 text-white rounded-3xl shadow-2xl overflow-hidden my-8"
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-6 text-white relative">
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-2xl border border-white/20">
                                        💰
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-emerald-200 font-bold">
                                            Configuration des Prix & Scolarité
                                        </p>
                                        <h3 className="text-lg font-black">{targetName}</h3>
                                    </div>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                                {/* Prix Globaux */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                            <Coins className="w-4 h-4 text-emerald-400" />
                                            Frais de scolarité annuels (XAF)
                                        </Label>
                                        <Input
                                            type="number"
                                            value={fraisScolarite}
                                            onChange={e => setFraisScolarite(Number(e.target.value))}
                                            placeholder="Ex: 450000"
                                            className="bg-white/5 border-white/10 text-white font-mono text-base font-bold h-11 rounded-xl"
                                        />
                                        <p className="text-[11px] text-slate-400">
                                            {formatXAF(fraisScolarite || 0)}
                                        </p>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                            <ShieldCheck className="w-4 h-4 text-teal-400" />
                                            Frais d'inscription / dossier (XAF)
                                        </Label>
                                        <Input
                                            type="number"
                                            value={fraisInscription}
                                            onChange={e => setFraisInscription(Number(e.target.value))}
                                            placeholder="Ex: 50000"
                                            className="bg-white/5 border-white/10 text-white font-mono text-base font-bold h-11 rounded-xl"
                                        />
                                        <p className="text-[11px] text-slate-400">
                                            {formatXAF(fraisInscription || 0)} (payable à l'admission)
                                        </p>
                                    </div>
                                </div>

                                {/* Échéancier de paiement par tranches */}
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                                                <Calendar className="w-4 h-4 text-indigo-400" />
                                                Échéancier de paiement (Tranches)
                                            </h4>
                                            <p className="text-xs text-slate-400">
                                                Définissez les tranches que l'étudiant peut régler en ligne.
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={handleAutoDistribute}
                                            className="text-xs h-8 bg-white/5 border-white/10 hover:bg-white/10 text-indigo-300"
                                        >
                                            ⚡ Répartir équitablement
                                        </Button>
                                    </div>

                                    {/* Liste des tranches */}
                                    <div className="space-y-2.5">
                                        {echeances.map((ech, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/8 hover:border-white/15 transition flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                                            >
                                                <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 font-black text-xs flex items-center justify-center shrink-0">
                                                    T{ech.tranche}
                                                </div>

                                                <Input
                                                    value={ech.nom}
                                                    onChange={e => handleTrancheChange(idx, 'nom', e.target.value)}
                                                    placeholder="Libellé tranche"
                                                    className="bg-white/5 border-white/10 text-white text-xs h-9 rounded-xl flex-1"
                                                />

                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        value={ech.montant}
                                                        onChange={e => handleTrancheChange(idx, 'montant', Number(e.target.value))}
                                                        placeholder="Montant XAF"
                                                        className="bg-white/5 border-white/10 text-white text-xs font-mono font-bold h-9 w-32 rounded-xl"
                                                    />

                                                    <Input
                                                        type="date"
                                                        value={ech.date_limite || ''}
                                                        onChange={e => handleTrancheChange(idx, 'date_limite', e.target.value)}
                                                        title="Date limite de paiement"
                                                        className="bg-white/5 border-white/10 text-white text-xs h-9 w-36 rounded-xl"
                                                    />

                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveTranche(idx)}
                                                        className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                                                        title="Supprimer cette tranche"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleAddTranche}
                                            className="w-full h-9 rounded-xl bg-white/5 border-dashed border-white/15 text-xs text-slate-300 hover:text-white hover:bg-white/10"
                                        >
                                            <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter une tranche de paiement
                                        </Button>
                                    </div>

                                    {/* Récapitulatif balance */}
                                    <div className={`p-3.5 rounded-2xl text-xs flex items-center justify-between border ${
                                        diff === 0
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                    }`}>
                                        <div className="flex items-center gap-2">
                                            {diff === 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                            <span>
                                                Somme des tranches : <strong>{formatXAF(totalTranches)}</strong> / {formatXAF(fraisScolarite)}
                                            </span>
                                        </div>
                                        {diff !== 0 && (
                                            <span className="font-bold">
                                                Écart : {diff > 0 ? `+${formatXAF(diff)} restant` : `${formatXAF(diff)} excédent`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-5 bg-white/[0.02] border-t border-white/10 flex items-center justify-end gap-3">
                                <Button
                                    variant="ghost"
                                    onClick={onClose}
                                    disabled={saving}
                                    className="text-slate-400 hover:text-white"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-bold px-6 rounded-xl"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Enregistrement…
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Enregistrer les tarifs
                                        </>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
