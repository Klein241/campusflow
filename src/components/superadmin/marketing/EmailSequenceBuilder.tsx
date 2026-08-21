'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GitBranch, Mail, Clock, CheckCircle2, Play,
    Pause, Plus, Sparkles, ArrowDown, Settings,
    Trash2, Edit3, ShieldAlert, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface SequenceStep {
    id: string;
    day_offset: number;
    title: string;
    subject: string;
    condition: 'always' | 'if_not_opened' | 'if_opened_not_clicked' | 'if_clicked_not_converted';
    body_snippet: string;
    is_active: boolean;
}

const DEFAULT_SEQUENCE_STEPS: SequenceStep[] = [
    {
        id: 'step_1',
        day_offset: 0,
        title: 'Étape 1 : Prise de Contact Initiale',
        subject: 'Modernisation de la gestion académique de {{ecole}} 🎓',
        condition: 'always',
        body_snippet: 'Présentation de la plateforme IziTeach School Suite, bulletins en 1 clic et Sky Agent IA.',
        is_active: true,
    },
    {
        id: 'step_2',
        day_offset: 3,
        title: 'Étape 2 : Relance Douce & Cas d\'Usage',
        subject: 'Re: Question rapide concernant {{ecole}}',
        condition: 'if_not_opened',
        body_snippet: 'Rappel des gains de temps majeurs observés par les directeurs avec les présences QR code.',
        is_active: true,
    },
    {
        id: 'step_3',
        day_offset: 7,
        title: 'Étape 3 : Démonstration Vidéo Interactive',
        subject: 'Comment l\'IA Sky Agent aide vos professeurs et élèves (Démo 2 min)',
        condition: 'if_opened_not_clicked',
        body_snippet: 'Lien vers la visite guidée vidéo de la Salle d\'Évaluation interactive et anti-triche.',
        is_active: true,
    },
    {
        id: 'step_4',
        day_offset: 14,
        title: 'Étape 4 : Offre Spéciale Rentrée & Déploiement',
        subject: 'Dernière opportunité : Essai 30 jours gratuit pour {{ecole}}',
        condition: 'if_clicked_not_converted',
        body_snippet: 'Proposition d\'accompagnement sur mesure avec formation gratuite des enseignants.',
        is_active: true,
    },
];

export function EmailSequenceBuilder() {
    const [steps, setSteps] = useState<SequenceStep[]>(DEFAULT_SEQUENCE_STEPS);
    const [isAutomationActive, setIsAutomationActive] = useState(true);
    const [editingStep, setEditingStep] = useState<SequenceStep | null>(null);

    const toggleAutomation = () => {
        setIsAutomationActive(!isAutomationActive);
        toast.success(isAutomationActive ? '⏸️ Séquences automatisées mises en pause' : '▶️ Séquences automatisées activées avec succès !');
    };

    const handleSaveStep = () => {
        if (!editingStep) return;
        setSteps(prev => prev.map(s => s.id === editingStep.id ? editingStep : s));
        setEditingStep(null);
        toast.success('Étape de séquence mise à jour');
    };

    return (
        <div className="space-y-6">
            {/* Header banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-600/10 via-orange-600/10 to-violet-600/10 border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white flex-shrink-0">
                        <GitBranch className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white flex items-center gap-2">
                            Séquences d'Emails Automatisées (Drip Marketing)
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Relances Intelligentes J+0 à J+14
                            </span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Automatisez les relances conditionnelles en fonction de l'ouverture et des clics de chaque directeur d'école.
                        </p>
                    </div>
                </div>

                <Button
                    onClick={toggleAutomation}
                    className={`h-10 px-4 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg ${isAutomationActive
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                >
                    {isAutomationActive ? (
                        <>
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            Séquences Actives (En cours)
                        </>
                    ) : (
                        <>
                            <Play className="w-4 h-4" />
                            Activer l'Automatisation
                        </>
                    )}
                </Button>
            </div>

            {/* Sequence Steps Timeline */}
            <div className="max-w-3xl mx-auto space-y-4">
                {steps.map((step, idx) => {
                    const conditionLabels: Record<string, string> = {
                        always: '⚡ Déclencheur : Dès l\'ajout du prospect (J+0)',
                        if_not_opened: '⚠️ Déclencheur : Si l\'email précédent n\'a pas été ouvert',
                        if_opened_not_clicked: '👁️ Déclencheur : Si l\'email a été ouvert mais aucun lien cliqué',
                        if_clicked_not_converted: '🔗 Déclencheur : Si le prospect a cliqué mais n\'est pas encore converti',
                    };

                    return (
                        <div key={step.id} className="space-y-3">
                            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/40 transition space-y-3 relative group">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-xs">
                                            J+{step.day_offset}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white">{step.title}</h4>
                                            <p className="text-[11px] text-amber-400/90 font-medium">
                                                {conditionLabels[step.condition] || step.condition}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setEditingStep(step)}
                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1 text-xs">
                                    <p className="text-slate-400">
                                        <strong>Objet :</strong> <span className="text-white font-medium">{step.subject}</span>
                                    </p>
                                    <p className="text-slate-400">
                                        <strong>Message :</strong> <span className="text-slate-300">{step.body_snippet}</span>
                                    </p>
                                </div>
                            </div>

                            {idx < steps.length - 1 && (
                                <div className="flex justify-center">
                                    <div className="w-0.5 h-6 bg-gradient-to-b from-amber-500/50 to-transparent flex items-center justify-center">
                                        <ArrowDown className="w-3 h-3 text-amber-400 animate-bounce" />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Edit Step Modal */}
            {editingStep && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-lg bg-[#0F1420] border border-white/10 rounded-2xl p-5 space-y-4 text-xs"
                    >
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Edit3 className="w-4 h-4 text-amber-400" />
                            Modifier l'Étape de Séquence
                        </h3>

                        <div className="space-y-1">
                            <label className="text-slate-400 font-medium">Titre de l'étape</label>
                            <Input
                                value={editingStep.title}
                                onChange={e => setEditingStep({ ...editingStep, title: e.target.value })}
                                className="bg-white/5 border-white/10 text-white h-8 rounded-xl"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-slate-400 font-medium">Délai d'envoi (Jours après J+0)</label>
                            <Input
                                type="number"
                                min={0}
                                max={60}
                                value={editingStep.day_offset}
                                onChange={e => setEditingStep({ ...editingStep, day_offset: Number(e.target.value) })}
                                className="bg-white/5 border-white/10 text-white h-8 rounded-xl font-bold"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-slate-400 font-medium">Condition de Déclenchement</label>
                            <select
                                value={editingStep.condition}
                                onChange={e => setEditingStep({ ...editingStep, condition: e.target.value as any })}
                                className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                            >
                                <option value="always">Toujours envoyer (J+0)</option>
                                <option value="if_not_opened">Si email précédent non-ouvert</option>
                                <option value="if_opened_not_clicked">Si email ouvert mais pas de clic</option>
                                <option value="if_clicked_not_converted">Si cliqué mais non converti</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-slate-400 font-medium">Objet de l'Email</label>
                            <Input
                                value={editingStep.subject}
                                onChange={e => setEditingStep({ ...editingStep, subject: e.target.value })}
                                className="bg-white/5 border-white/10 text-white h-8 rounded-xl"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                            <Button variant="ghost" onClick={() => setEditingStep(null)} className="text-slate-400 hover:text-white">
                                Annuler
                            </Button>
                            <Button onClick={handleSaveStep} className="bg-amber-600 hover:bg-amber-500 text-white font-bold">
                                Enregistrer
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
