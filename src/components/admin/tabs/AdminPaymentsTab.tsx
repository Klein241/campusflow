'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Printer, Loader2 } from 'lucide-react';

interface Student {
    id: string;
    first_name: string;
    last_name: string;
    matricule?: string;
}

interface Payment {
    id: string;
    amount: number;
    description: string;
    payment_method: string;
    paid_at: string;
    student_profiles?: {
        first_name: string;
        last_name: string;
    };
}

interface AdminPaymentsTabProps {
    pays: Payment[];
    students: Student[];
    saving: boolean;
    addPay: (payData: any) => Promise<void>;
    exportPaymentsPdf: () => void;
    printPaymentReceipt: (pay: Payment) => void;
}

export function AdminPaymentsTab({
    pays,
    students,
    saving,
    addPay,
    exportPaymentsPdf,
    printPaymentReceipt
}: AdminPaymentsTabProps) {
    const [payStu, setPayStu] = useState('');
    const [payAmt, setPayAmt] = useState('');
    const [payMeth, setPayMeth] = useState('cash');
    const [payDesc, setPayDesc] = useState('');

    const handleAddPay = async () => {
        if (!payStu || !payAmt) return;
        await addPay({
            student_id: payStu,
            amount: Number(payAmt),
            payment_method: payMeth,
            description: payDesc || 'Frais de scolarité'
        });
        setPayAmt('');
        setPayDesc('');
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-end">
                <Button
                    size="sm"
                    onClick={exportPaymentsPdf}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-xs rounded-xl font-bold"
                    disabled={pays.length === 0}
                >
                    <Printer className="w-3.5 h-3.5 mr-1" /> Exporter PDF
                </Button>
            </div>

            {/* Formulaire ajout paiement */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <h3 className="font-bold text-white text-sm">💰 Enregistrer un paiement</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                        <Label className="text-slate-400 text-xs">Étudiant</Label>
                        <select
                            value={payStu}
                            onChange={e => setPayStu(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white text-xs h-9 rounded-xl px-3 mt-1 focus:outline-none focus:border-emerald-500"
                        >
                            <option value="" className="bg-slate-900">-- Sélectionner un étudiant --</option>
                            {students.map(s => (
                                <option key={s.id} value={s.id} className="bg-slate-900">
                                    {s.first_name} {s.last_name} ({s.matricule || '—'})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">Montant (XAF)</Label>
                        <Input
                            type="number"
                            value={payAmt}
                            onChange={e => setPayAmt(e.target.value)}
                            placeholder="50000"
                            className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">Mode de règlement</Label>
                        <select
                            value={payMeth}
                            onChange={e => setPayMeth(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white text-xs h-9 rounded-xl px-3 mt-1 focus:outline-none focus:border-emerald-500"
                        >
                            <option value="cash" className="bg-slate-900">Espèces</option>
                            <option value="momo" className="bg-slate-900">MTN MoMo</option>
                            <option value="orange_money" className="bg-slate-900">Orange Money</option>
                            <option value="bank" className="bg-slate-900">Virement</option>
                            <option value="other" className="bg-slate-900">Autre</option>
                        </select>
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">Description / Motif</Label>
                        <Input
                            value={payDesc}
                            onChange={e => setPayDesc(e.target.value)}
                            placeholder="1ère tranche scolarité"
                            className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                        />
                    </div>
                </div>
                <Button
                    onClick={handleAddPay}
                    disabled={saving || !payStu || !payAmt}
                    className="mt-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold"
                    size="sm"
                >
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                    <CreditCard className="w-4 h-4 mr-1" /> Enregistrer le paiement
                </Button>
            </div>

            {/* Liste paiements */}
            {pays.length > 0 ? (
                <div className="space-y-2">
                    {pays.map(p => (
                        <div
                            key={p.id}
                            className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 font-black text-xs flex items-center justify-center border border-emerald-500/30">
                                    {p.student_profiles?.first_name?.[0]}
                                    {p.student_profiles?.last_name?.[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">
                                        {p.student_profiles?.first_name} {p.student_profiles?.last_name}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {p.description} • {p.payment_method} • {new Date(p.paid_at).toLocaleDateString('fr-FR')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => printPaymentReceipt(p)}
                                    className="text-xs px-3 py-1.5 rounded-xl bg-indigo-600/10 text-indigo-300 hover:bg-indigo-600/20 border border-indigo-500/20 flex items-center gap-1 font-semibold transition"
                                >
                                    <Printer className="w-3 h-3" /> Reçu
                                </button>
                                <span className="text-sm font-extrabold text-emerald-400 font-mono">
                                    {new Intl.NumberFormat('fr-FR').format(p.amount)} XAF
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-slate-500 bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                    <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucun paiement enregistré</p>
                </div>
            )}
        </div>
    );
}
