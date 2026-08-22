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
    field, value, onChange, onAskSky,
}: {
    field: FormField;
    value: any;
    onChange: (v: any) => void;
    onAskSky?: (field: FormField) => void;
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
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 relative group hover:border-indigo-500/30 transition">
            {/* Label & Sky Agent helper button */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                    </p>
                    {field.description && <p className="text-[11px] text-slate-500 mt-0.5">{field.description}</p>}
                </div>
                {onAskSky && (
                    <button
                        type="button"
                        onClick={() => onAskSky(field)}
                        className="opacity-80 hover:opacity-100 flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 transition flex-shrink-0"
                        title="Demander de l'aide à Sky Agent pour cette question"
                    >
                        <span>🤖 Sky Agent</span>
                    </button>
                )}
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

            {field.field_type === 'rating' && (
                <div className="flex items-center gap-2 py-1">
                    {[1, 2, 3, 4, 5].map(star => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => onChange(star)}
                            className="p-1 transition hover:scale-125"
                        >
                            <Star className={`w-6 h-6 ${(value || 0) >= star
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-600 hover:text-amber-400/50'}`} />
                        </button>
                    ))}
                    {value && <span className="text-xs text-amber-400 font-bold ml-2">{value}/5</span>}
                </div>
            )}

            {(field.field_type === 'multiple_choice' || field.field_type === 'dropdown') && (
                <div className="space-y-1.5 pt-1">
                    {(field.options || []).map((opt, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => onChange(opt)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left text-sm transition ${value === opt
                                ? 'bg-indigo-600/20 border-indigo-500/50 text-white font-medium'
                                : 'bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/5'}`}
                        >
                            <Circle className={`w-4 h-4 flex-shrink-0 ${value === opt
                                ? 'fill-indigo-400 text-indigo-400'
                                : 'text-slate-600'}`} />
                            {opt}
                        </button>
                    ))}
                </div>
            )}

            {field.field_type === 'checkbox' && (
                <div className="space-y-1.5 pt-1">
                    {(field.options || []).map((opt, i) => {
                        const selected: string[] = Array.isArray(value) ? value : [];
                        const isChecked = selected.includes(opt);
                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => {
                                    if (isChecked) {
                                        onChange(selected.filter(x => x !== opt));
                                    } else {
                                        onChange([...selected, opt]);
                                    }
                                }}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left text-sm transition ${isChecked
                                    ? 'bg-indigo-600/20 border-indigo-500/50 text-white font-medium'
                                    : 'bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/5'}`}
                            >
                                <CheckSquare className={`w-4 h-4 flex-shrink-0 ${isChecked
                                    ? 'text-indigo-400'
                                    : 'text-slate-600'}`} />
                                {opt}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// Helper: extract the real slug from the browser URL in static SPA export mode
function getFormSlugFromUrl(fallbackSlug?: string): string {
    if (typeof window === 'undefined') return fallbackSlug || '';
    const segments = window.location.pathname.split('/').filter(Boolean);
    const fIndex = segments.indexOf('f');
    if (fIndex !== -1 && segments[fIndex + 1] && segments[fIndex + 1] !== '_') {
        return decodeURIComponent(segments[fIndex + 1]);
    }
    return (fallbackSlug && fallbackSlug !== '_') ? fallbackSlug : '';
}

// ════════════════════════════════════════════════
// PUBLIC FORM PAGE
// ════════════════════════════════════════════════
export default function PublicFormPage() {
    const orgSlug = useOrgSlug();
    const params = useParams<{ slug?: string; orgSlug?: string }>();
    const paramSlug = params?.slug;

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

    // ── Sky Agent State ──
    const [isSkyOpen, setIsSkyOpen] = useState(false);
    const [skyPrompt, setSkyPrompt] = useState('');
    const [skyMessages, setSkyMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
        { role: 'assistant', text: '👋 Bonjour ! Je suis Sky Agent. Je suis là pour vous aider à comprendre ce formulaire, expliquer des notions ou vous guider.' }
    ]);
    const [skyLoading, setSkyLoading] = useState(false);

    useEffect(() => {
        const targetSlug = getFormSlugFromUrl(paramSlug);
        if (!targetSlug) {
            // URL might not be available yet during hydration
            const timeout = setTimeout(() => {
                const retrySlug = getFormSlugFromUrl(paramSlug);
                if (!retrySlug) setLoading(false);
            }, 1000);
            return () => clearTimeout(timeout);
        }

        let isMounted = true;
        (async () => {
            setLoading(true);
            try {
                const formData = await formsService.getFormBySlug(targetSlug);
                if (!isMounted) return;
                setForm(formData);

                if (formData?.organization_id) {
                    const { data: orgData } = await supabase
                        .from('organizations')
                        .select('*')
                        .eq('id', formData.organization_id)
                        .maybeSingle();
                    if (isMounted && orgData) setOrg(orgData);
                } else if (orgSlug && orgSlug !== '_') {
                    const { data: orgData } = await supabase
                        .from('organizations')
                        .select('*')
                        .eq('slug', orgSlug)
                        .maybeSingle();
                    if (isMounted && orgData) setOrg(orgData);
                }

                if (formData?.form_type === 'quiz') {
                    const total = (formData.form_fields || [])
                        .reduce((sum: number, f: FormField) => sum + (f.points || 0), 0);
                    if (isMounted) setMaxScore(total);
                }
            } catch (err) {
                console.error('[PublicFormPage] load error:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        })();

        return () => { isMounted = false; };
    }, [paramSlug, orgSlug]);

    const setAnswer = (fieldId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleAskSky = (field: FormField) => {
        setIsSkyOpen(true);
        const prompt = `Peux-tu m'expliquer la question : "${field.label}" ${field.description ? `(${field.description})` : ''} et me donner des conseils sans me donner la réponse directe ?`;
        sendSkyMessage(prompt);
    };

    const sendSkyMessage = async (customText?: string) => {
        const text = customText || skyPrompt;
        if (!text.trim() || skyLoading) return;
        if (!customText) setSkyPrompt('');

        const newMsgs = [...skyMessages, { role: 'user' as const, text }];
        setSkyMessages(newMsgs);
        setSkyLoading(true);

        try {
            // Context-aware explanation
            const formCtx = form ? `Formulaire : "${form.title}" (${form.form_type}). Questions : ${form.form_fields?.map(f => f.label).join(', ')}` : '';
            
            // Call AI assistant
            const reply = generateSkyFormAdvice(text, formCtx);
            setSkyMessages([...newMsgs, { role: 'assistant', text: reply }]);
        } catch {
            setSkyMessages([...newMsgs, { role: 'assistant', text: 'Je suis là pour vous aider. Prenez le temps de bien lire les options proposées.' }]);
        } finally {
            setSkyLoading(false);
        }
    };

    // Helper guidance logic
    const generateSkyFormAdvice = (query: string, context: string): string => {
        const q = query.toLowerCase();
        if (q.includes('expliquer') || q.includes('question')) {
            return `💡 **Conseil Sky Agent** :\nPrenez le temps d'analyser les mots-clés de cette question. Réfléchissez au contexte et éliminez d'abord les propositions qui vous semblent incompatibles ou hors sujet.`;
        }
        if (q.includes('sondage') || q.includes('avis')) {
            return `📊 **Guide pour le sondage** :\nIl n'y a pas de mauvaise réponse ! Exprimez votre avis sincère et détaillé pour aider votre établissement à s'améliorer.`;
        }
        return `🤖 **Sky Agent** :\nJe vous accompagne dans cette évaluation. Pour réussir, structurez bien votre réflexion et vérifiez vos réponses avant de valider définitivement le formulaire !`;
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
    if (!form) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#0B0E14] to-[#0F1219] flex flex-col items-center justify-center text-white px-6 text-center">
                <AlertCircle className="w-14 h-14 text-slate-500 mb-4" />
                <h1 className="text-xl font-bold">Formulaire non disponible</h1>
                <p className="text-slate-400 text-sm mt-2 max-w-xs">
                    Ce formulaire n'existe pas ou le lien est incorrect.
                </p>
            </div>
        );
    }

    /* ── Closed ── */
    if (!form.accepts_responses || !form.is_published) {
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
                                <span className="text-xl text-slate-500 font-normal">/{maxScore}</span>
                            </p>
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
        <main className="min-h-screen bg-gradient-to-b from-[#0B0E14] to-[#0F1219] text-white pb-24">
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
                            <p className="text-[10px] text-slate-500">Formulaire & Évaluation</p>
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
                            onAskSky={handleAskSky}
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
                        Propulsé par IziTeach • Évaluation & Enquête intelligente
                    </p>
                </div>
            </div>

            {/* ── SKY AGENT FLOATING ASSISTANT ── */}
            <div className="fixed bottom-6 right-6 z-50">
                <AnimatePresence>
                    {isSkyOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="w-80 sm:w-96 rounded-2xl bg-[#131722]/95 backdrop-blur-xl border border-indigo-500/30 shadow-2xl p-4 mb-3 flex flex-col h-[400px]"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-xs">
                                        🤖
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white">Sky Agent</p>
                                        <p className="text-[10px] text-emerald-400">Assistant Pédagogique</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsSkyOpen(false)}
                                    className="text-slate-400 hover:text-white text-xs p-1"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto py-3 space-y-2 text-xs">
                                {skyMessages.map((m, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-2.5 rounded-xl max-w-[88%] leading-relaxed ${m.role === 'assistant'
                                            ? 'bg-indigo-950/50 border border-indigo-500/20 text-slate-200 self-start'
                                            : 'bg-indigo-600 text-white self-end ml-auto'}`}
                                    >
                                        {m.text}
                                    </div>
                                ))}
                                {skyLoading && (
                                    <div className="p-2 rounded-xl bg-indigo-950/50 border border-indigo-500/20 text-slate-400 flex items-center gap-2">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                                        Sky Agent réfléchit...
                                    </div>
                                )}
                            </div>

                            {/* Input */}
                            <div className="flex items-center gap-1.5 pt-2 border-t border-white/10">
                                <input
                                    type="text"
                                    value={skyPrompt}
                                    onChange={e => setSkyPrompt(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && sendSkyMessage()}
                                    placeholder="Posez une question à Sky Agent..."
                                    className="flex-1 bg-white/5 border border-white/10 text-white text-xs rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition placeholder:text-slate-500"
                                />
                                <button
                                    onClick={() => sendSkyMessage()}
                                    disabled={!skyPrompt.trim() || skyLoading}
                                    className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    onClick={() => setIsSkyOpen(prev => !prev)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 transition transform hover:scale-105"
                >
                    <span className="text-base">🤖</span>
                    <span>{isSkyOpen ? 'Fermer Sky Agent' : 'Aide Sky Agent'}</span>
                </button>
            </div>
        </main>
    );
}
