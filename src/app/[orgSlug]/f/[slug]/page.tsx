'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GraduationCap, Loader2, CheckCircle2, Star,
    ChevronDown, AlertCircle, Send, Circle, CheckSquare,
    AlignLeft, AlignJustify, Calendar, Clock, Hash, Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formsService, CampusForm, FormField } from '@/lib/forms-service';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ════════════════════════════════════════════════
// FIELD RENDERER (public fill view)
// ════════════════════════════════════════════════
function FormFieldRenderer({
    field, value, onChange,
}: {
    field: FormField;
    value: any;
    onChange: (v: any) => void;
}) {
    // Section header — decorative only
    if (field.field_type === 'section_header') {
        return (
            <div className="pt-2 pb-1">
                <div className="h-px bg-gradient-to-r from-indigo-500/30 via-violet-500/20 to-transparent mb-3" />
                <h3 className="font-bold text-base text-white">{field.label}</h3>
                {field.description && <p className="text-xs text-slate-400 mt-0.5">{field.description}</p>}
            </div>
        );
    }

    const baseInput = 'w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500/50 transition placeholder:text-slate-600';

    return (
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            {/* Label */}
            <div>
                <p className="text-sm font-medium text-white">
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                </p>
                {field.description && <p className="text-[11px] text-slate-500 mt-0.5">{field.description}</p>}
            </div>

            {/* Input based on type */}
            {field.field_type === 'short_text' && (
                <input
                    type="text"
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    placeholder="Votre réponse..."
                    className={baseInput}
                />
            )}

            {field.field_type === 'long_text' && (
                <textarea
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    placeholder="Votre réponse..."
                    rows={3}
                    className={`${baseInput} resize-none`}
                />
            )}

            {field.field_type === 'number' && (
                <input
                    type="number"
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    placeholder="0"
                    className={baseInput}
                />
            )}

            {field.field_type === 'date' && (
                <input
                    type="date"
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    className={`${baseInput} [color-scheme:dark]`}
                />
            )}

            {field.field_type === 'time' && (
                <input
                    type="time"
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    className={`${baseInput} [color-scheme:dark]`}
                />
            )}

            {field.field_type === 'multiple_choice' && (
                <div className="space-y-2">
                    {(field.options || []).map((opt, i) => (
                        <button
                            key={i}
                            onClick={() => onChange(opt)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all text-left ${value === opt
                                ? 'border-indigo-500/60 bg-indigo-600/10 text-white'
                                : 'border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/20 hover:bg-white/[0.04]'
                                }`}
                        >
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${value === opt ? 'border-indigo-400' : 'border-slate-600'}`}>
                                {value === opt && <div className="w-2 h-2 rounded-full bg-indigo-400" />}
                            </div>
                            {opt}
                        </button>
                    ))}
                </div>
            )}

            {field.field_type === 'checkbox' && (
                <div className="space-y-2">
                    {(field.options || []).map((opt, i) => {
                        const selected: string[] = Array.isArray(value) ? value : [];
                        const checked = selected.includes(opt);
                        const toggle = () => {
                            const next = checked ? selected.filter(x => x !== opt) : [...selected, opt];
                            onChange(next);
                        };
                        return (
                            <button
                                key={i}
                                onClick={toggle}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all text-left ${checked
                                    ? 'border-teal-500/60 bg-teal-600/10 text-white'
                                    : 'border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/20 hover:bg-white/[0.04]'
                                    }`}
                            >
                                <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${checked ? 'border-teal-400 bg-teal-500' : 'border-slate-600'}`}>
                                    {checked && <CheckSquare className="w-3 h-3 text-white" />}
                                </div>
                                {opt}
                            </button>
                        );
                    })}
                </div>
            )}

            {field.field_type === 'dropdown' && (
                <select
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500/50 transition"
                >
                    <option value="" className="bg-[#0F172A] text-slate-400">Sélectionner...</option>
                    {(field.options || []).map((opt, i) => (
                        <option key={i} value={opt} className="bg-[#0F172A]">{opt}</option>
                    ))}
                </select>
            )}

            {field.field_type === 'rating' && (
                <div className="flex gap-2 pt-1">
                    {[1, 2, 3, 4, 5].map(n => (
                        <button
                            key={n}
                            onClick={() => onChange(n)}
                            className="transition-transform hover:scale-125"
                        >
                            <Star
                                className={`w-8 h-8 transition-colors ${n <= (value || 0)
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-slate-600 hover:text-amber-400/50'}`}
                            />
                        </button>
                    ))}
                    {value && (
                        <span className="text-sm text-slate-400 self-center ml-1">{value}/5</span>
                    )}
                </div>
            )}
        </div>
    );
}

// ════════════════════════════════════════════════
// PUBLIC FORM PAGE
// ════════════════════════════════════════════════
export default function PublicFormPage() {
    const orgSlug = useOrgSlug();
    const { slug } = useParams<{ slug: string }>();
    const [form, setForm] = useState<(CampusForm & { form_fields: FormField[] }) | null>(null);
    const [org, setOrg] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [respondentName, setRespondentName] = useState('');
    const [respondentEmail, setRespondentEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [quizScore, setQuizScore] = useState<number | null>(null);
    const [maxScore, setMaxScore] = useState(0);

    useEffect(() => {
        (async () => {
            const [formData, { data: orgData }] = await Promise.all([
                formsService.getFormBySlug(slug),
                supabase.from('organizations').select('*').eq('slug', orgSlug).single(),
            ]);
            setForm(formData);
            setOrg(orgData);
            setLoading(false);

            if (formData?.form_type === 'quiz') {
                const total = (formData.form_fields || [])
                    .reduce((sum: number, f: FormField) => sum + (f.points || 0), 0);
                setMaxScore(total);
            }
        })();
    }, [slug, orgSlug]);

    const setAnswer = (fieldId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [fieldId]: value }));
    };

    const validate = () => {
        const required = (form?.form_fields || [])
            .filter(f => f.required && f.field_type !== 'section_header');
        for (const f of required) {
            const val = answers[f.id!];
            if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
                toast.error(`Champ requis : "${f.label}"`);
                return false;
            }
        }
        return true;
    };

    const computeQuizScore = () => {
        if (!form || form.form_type !== 'quiz') return null;
        let total = 0;
        for (const f of form.form_fields) {
            if (!f.correct_answer || !f.id) continue;
            const val = answers[f.id];
            const correct = f.correct_answer.trim().toLowerCase();
            if (Array.isArray(val)) {
                if (val.map((v: string) => v.toLowerCase()).includes(correct)) {
                    total += f.points || 0;
                }
            } else if (String(val || '').trim().toLowerCase() === correct) {
                total += f.points || 0;
            }
        }
        return total;
    };

    const handleSubmit = async () => {
        if (!form?.id || !validate()) return;
        setSubmitting(true);

        const answerList = Object.entries(answers).map(([field_id, answer_value]) => ({
            field_id,
            answer_value,
        }));

        const finalScore = computeQuizScore();

        const responseId = await formsService.submitResponse(
            form.id,
            answerList,
            respondentName || undefined,
            respondentEmail || undefined,
        );

        if (responseId) {
            if (finalScore !== null) {
                await supabase.from('form_responses')
                    .update({ total_score: finalScore })
                    .eq('id', responseId);
                setQuizScore(finalScore);
            }
            setSubmitted(true);
        } else {
            toast.error('Erreur lors de l\'envoi. Réessayez.');
        }
        setSubmitting(false);
    };

    /* ── Loading ── */
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#0B0E14] to-[#0F1219] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    /* ── Unavailable ── */
    if (!form || !form.is_published) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#0B0E14] to-[#0F1219] flex flex-col items-center justify-center text-white px-6 text-center">
                <AlertCircle className="w-14 h-14 text-slate-500 mb-4" />
                <h1 className="text-xl font-bold">Formulaire non disponible</h1>
                <p className="text-slate-400 text-sm mt-2 max-w-xs">
                    {!form
                        ? 'Ce formulaire n\'existe pas ou le lien est incorrect.'
                        : 'Ce formulaire est fermé et ne collecte plus de réponses.'}
                </p>
            </div>
        );
    }

    /* ── Closed ── */
    if (!form.accepts_responses) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#0B0E14] to-[#0F1219] flex flex-col items-center justify-center text-white px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-amber-400" />
                </div>
                <h1 className="text-xl font-bold">Formulaire fermé</h1>
                <p className="text-slate-400 text-sm mt-2">Ce formulaire n'accepte plus de nouvelles réponses.</p>
            </div>
        );
    }

    /* ── Success ── */
    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#0B0E14] to-[#0F1219] flex flex-col items-center justify-center text-white px-6 text-center">
                <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/30"
                >
                    <CheckCircle2 className="w-12 h-12 text-white" />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <h1 className="text-2xl font-black mb-2">Merci ! 🎉</h1>
                    <p className="text-slate-400 mb-6">Votre réponse a bien été enregistrée.</p>

                    {quizScore !== null && (
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-600/10 to-orange-600/10 border border-amber-500/20 text-center mb-6">
                            <p className="text-slate-400 text-sm mb-2">🧠 Votre score</p>
                            <p className="text-5xl font-black text-amber-400">
                                {quizScore}
                                <span className="text-2xl text-slate-500">/{maxScore}</span>
                            </p>
                            <p className="text-slate-300 text-sm mt-2">
                                {quizScore === maxScore
                                    ? '🏆 Score parfait ! Excellent travail !'
                                    : quizScore >= maxScore * 0.8
                                        ? '⭐ Très bon résultat !'
                                        : quizScore >= maxScore * 0.6
                                            ? '👍 Bon résultat, continue !'
                                            : '📚 Continue à réviser !'}
                            </p>
                            <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${maxScore > 0 ? (quizScore / maxScore * 100) : 0}%` }}
                                    transition={{ delay: 0.4, duration: 1 }}
                                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                                />
                            </div>
                        </div>
                    )}

                    {org?.name && (
                        <p className="text-xs text-slate-600 flex items-center justify-center gap-1">
                            <GraduationCap className="w-3 h-3" />
                            {org.name}
                        </p>
                    )}
                </motion.div>
            </div>
        );
    }

    /* ── Main form ── */
    const contentFields = form.form_fields || [];
    const questionCount = contentFields.filter(f => f.field_type !== 'section_header').length;

    return (
        <main className="min-h-screen bg-gradient-to-b from-[#0B0E14] to-[#0F1219] text-white pb-16">
            {/* Ambient background blobs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-15%] right-[-15%] w-[45%] h-[45%] bg-indigo-600/[0.05] blur-[150px] rounded-full" />
                <div className="absolute bottom-[-15%] left-[-15%] w-[35%] h-[35%] bg-teal-600/[0.05] blur-[150px] rounded-full" />
            </div>

            <div className="relative z-10 max-w-xl mx-auto px-4 pt-8">
                {/* Organisation header */}
                {org && (
                    <div className="flex items-center gap-3 mb-6">
                        {org.logo_url
                            ? <img src={org.logo_url} alt={org.name} className="w-10 h-10 rounded-xl object-contain bg-white/10 border border-white/10 p-0.5" />
                            : <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg">
                                <GraduationCap className="w-5 h-5 text-white" />
                            </div>
                        }
                        <div>
                            <p className="text-sm font-semibold">{org.name}</p>
                            <p className="text-[10px] text-slate-500">Formulaire</p>
                        </div>
                    </div>
                )}

                {/* Form hero */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-600/10 to-violet-600/10 border border-indigo-500/20 mb-5">
                    <h1 className="text-xl font-black leading-tight">{form.title}</h1>
                    {form.description && (
                        <p className="text-sm text-slate-300 mt-2 leading-relaxed">{form.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${form.form_type === 'quiz'
                            ? 'bg-violet-500/10 text-violet-300'
                            : form.form_type === 'registration'
                                ? 'bg-emerald-500/10 text-emerald-300'
                                : 'bg-blue-500/10 text-blue-300'}`}>
                            {form.form_type === 'quiz' ? '🧠 Quiz' : form.form_type === 'registration' ? '📋 Inscription' : '📊 Sondage'}
                            {form.form_type === 'quiz' && maxScore > 0 && ` • ${maxScore} pts`}
                        </span>
                        <span className="text-[10px] text-slate-500">
                            {questionCount} question{questionCount !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                {/* Respondent info */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] mb-4 space-y-3">
                    <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                        Vos informations <span className="text-slate-600">(optionnel)</span>
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                        <input
                            type="text"
                            value={respondentName}
                            onChange={e => setRespondentName(e.target.value)}
                            placeholder="Votre nom complet..."
                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500/50 transition placeholder:text-slate-600"
                        />
                        <input
                            type="email"
                            value={respondentEmail}
                            onChange={e => setRespondentEmail(e.target.value)}
                            placeholder="Votre email..."
                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500/50 transition placeholder:text-slate-600"
                        />
                    </div>
                </div>

                {/* Form fields */}
                <div className="space-y-3">
                    {contentFields.map((field, i) => (
                        <FormFieldRenderer
                            key={field.id || i}
                            field={field}
                            value={field.id ? answers[field.id] : undefined}
                            onChange={val => field.id && setAnswer(field.id, val)}
                        />
                    ))}
                </div>

                {/* Submit button */}
                <div className="mt-6">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full h-13 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 rounded-2xl font-bold text-base shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
                    >
                        {submitting
                            ? <><Loader2 className="w-5 h-5 animate-spin" />Envoi en cours...</>
                            : <><Send className="w-5 h-5" />Envoyer ma réponse</>
                        }
                    </button>
                    <p className="text-center text-[10px] text-slate-600 mt-3">
                        Propulsé par IziTeach • Enseigner simplement
                    </p>
                </div>
            </div>
        </main>
    );
}
