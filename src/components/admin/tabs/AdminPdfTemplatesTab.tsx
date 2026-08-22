'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FileText, Calendar, CheckCircle2, Save, Loader2 } from 'lucide-react';
import { BULLETIN_TEMPLATES } from '@/lib/bulletin-pdf';
import { RECEIPT_TEMPLATES } from '@/lib/receipt-pdf';

interface AdminPdfTemplatesTabProps {
    currentTerm: string;
    setCurrentTerm: (term: string) => void;
    selBulletinTemplate: number | string;
    setSelBulletinTemplate: (tpl: number | any) => void;
    selReceiptTemplate: number | string;
    setSelReceiptTemplate: (tpl: number | any) => void;
    saveTemplateSettings: () => Promise<void>;
    savingTemplates: boolean;
}

export function AdminPdfTemplatesTab({
    currentTerm,
    setCurrentTerm,
    selBulletinTemplate,
    setSelBulletinTemplate,
    selReceiptTemplate,
    setSelReceiptTemplate,
    saveTemplateSettings,
    savingTemplates
}: AdminPdfTemplatesTabProps) {
    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            <h2 className="font-bold text-lg text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-400" /> Modèles de documents PDF
            </h2>
            <p className="text-xs text-slate-400 -mt-3">
                Choisissez le style des bulletins et reçus générés pour votre établissement. Les étudiants et professeurs verront le modèle sélectionné.
            </p>

            {/* Current Term */}
            <div className="p-5 rounded-2xl bg-violet-600/5 border border-violet-500/20">
                <h3 className="font-bold text-violet-300 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Période académique active
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                        <Label className="text-slate-400 text-xs">Trimestre / Semestre actif</Label>
                        <select
                            value={currentTerm}
                            onChange={e => setCurrentTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white text-xs h-9 rounded-xl px-3 mt-1 focus:outline-none focus:border-violet-500"
                        >
                            {[
                                { id: 'Trimestre 1', label: 'Trimestre 1' },
                                { id: 'Trimestre 2', label: 'Trimestre 2' },
                                { id: 'Trimestre 3', label: 'Trimestre 3' },
                                { id: 'Semestre 1', label: 'Semestre 1' },
                                { id: 'Semestre 2', label: 'Semestre 2' },
                                { id: 'Année complète', label: 'Année complète' },
                            ].map(t => (
                                <option key={t.id} value={t.id} className="bg-slate-900">
                                    {t.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <p className="text-xs text-slate-500">Cette période sera affichée sur les bulletins et reçus générés.</p>
                    </div>
                </div>
            </div>

            {/* Bulletin templates */}
            <div className="space-y-3">
                <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2">📊 Modèle de bulletin de notes</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {BULLETIN_TEMPLATES.map((t: any) => (
                        <button
                            key={t.id}
                            onClick={() => setSelBulletinTemplate(t.id)}
                            className={`p-4 rounded-2xl border-2 text-left transition-all relative ${
                                selBulletinTemplate === t.id
                                    ? 'border-violet-500 bg-violet-600/10 shadow-lg shadow-violet-600/10'
                                    : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">{t.icon}</span>
                                <div>
                                    <p className="font-bold text-sm text-white">{t.name}</p>
                                    <p className="text-[9px] text-slate-500">{t.suited}</p>
                                </div>
                                {selBulletinTemplate === t.id && <CheckCircle2 className="w-5 h-5 text-violet-400 ml-auto" />}
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">{t.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Receipt templates */}
            <div className="space-y-3">
                <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2">🧾 Modèle de reçu de paiement</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {RECEIPT_TEMPLATES.map((t: any) => (
                        <button
                            key={t.id}
                            onClick={() => setSelReceiptTemplate(t.id)}
                            className={`p-4 rounded-2xl border-2 text-left transition-all relative ${
                                selReceiptTemplate === t.id
                                    ? 'border-emerald-500 bg-emerald-600/10 shadow-lg shadow-emerald-600/10'
                                    : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">{t.icon}</span>
                                <div>
                                    <p className="font-bold text-sm text-white">{t.name}</p>
                                    <p className="text-[9px] text-slate-500">{t.suited}</p>
                                </div>
                                {selReceiptTemplate === t.id && <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto" />}
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">{t.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Save button */}
            <div className="flex justify-end">
                <Button
                    onClick={saveTemplateSettings}
                    disabled={savingTemplates}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 px-8 font-bold rounded-xl shadow-lg shadow-violet-600/25 h-10"
                >
                    {savingTemplates ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Sauvegarder les modèles
                </Button>
            </div>
        </div>
    );
}
