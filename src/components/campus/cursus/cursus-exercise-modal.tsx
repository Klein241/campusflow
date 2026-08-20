'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Timer, ChevronLeft, ChevronRight, Send, CheckCircle2,
    AlertCircle, BookOpen, Award, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export function calculateSkyPoints(score: number, maxScore: number): number {
    if (!maxScore || maxScore <= 0) return 0;
    const ratio = score / maxScore;
    if (ratio >= 0.75) return 5;
    if (ratio >= 0.60) return 3;
    if (ratio >= 0.50) return 1;
    return 0;
}

interface ExerciseModalProps {
    exercise: any;
    studentId: string;
    onClose: () => void;
    onComplete: (score: number, maxScore: number, skyGain: number) => void;
}

export function CursusExerciseModal({ exercise, studentId, onClose, onComplete }: ExerciseModalProps) {
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [timeLeft, setTimeLeft] = useState(exercise.duration_minutes * 60);
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState<{ score: number; max: number; skyGain: number; details: any[] } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const rawQuestions: any[] = Array.isArray(exercise.questions) && exercise.questions.length > 0
        ? exercise.questions
        : exercise.question
            ? [{
                id: 'q_1',
                question: exercise.question,
                type: exercise.type || 'qcm',
                options: exercise.options || exercise.choices || [],
                choices: exercise.choices || exercise.options || [],
                answer: exercise.correct_answer || exercise.answer || '',
                correct_answer: exercise.correct_answer || exercise.answer || '',
                explanation: exercise.explanation || null
              }]
            : [];

    const questions: any[] = rawQuestions;
    const progress = questions.length > 0 ? ((currentQ + 1) / questions.length) * 100 : 100;

    useEffect(() => {
        if (submitted) return;
        intervalRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) { clearInterval(intervalRef.current!); handleSubmit(); return 0; }
                return t - 1;
            });
        }, 1000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [submitted]);

    const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
    const isUrgent = timeLeft < 60;

    const handleSubmit = useCallback(async () => {
        if (submitting) return;
        setSubmitting(true);
        if (intervalRef.current) clearInterval(intervalRef.current);

        let score = 0;
        const qCount = questions.length || 1;
        const ptsPerQ = exercise.max_score / qCount;
        const details: any[] = [];

        questions.forEach((q: any, i: number) => {
            const userAns = answers[i];
            const userAnsStr = String(userAns ?? '').trim().toLowerCase();
            const qType = (q.type || exercise.type || 'qcm').toLowerCase();

            // ── Déterminer la bonne réponse ──
            let correctText = String(q.answer ?? q.correct_answer ?? q.correctAnswer ?? '').trim().toLowerCase();
            let correctIndex: number | null = null;
            if (typeof q.correct_option === 'number') correctIndex = q.correct_option;
            else if (typeof q.correct_option === 'string' && !isNaN(Number(q.correct_option))) correctIndex = Number(q.correct_option);

            const qOptions = Array.isArray(q.options) && q.options.length > 0
                ? q.options
                : Array.isArray(q.choices) && q.choices.length > 0
                    ? q.choices
                    : [];

            if (correctIndex !== null && qOptions[correctIndex] !== undefined) {
                correctText = String(qOptions[correctIndex]).trim().toLowerCase();
            }

            let correct = false;

            if (userAnsStr) {
                // 1. Gestion spécifique Vrai / Faux
                if (qType === 'true_false' || qType === 'vrai_faux' || qType === 'boolean') {
                    const isUserTrue = ['vrai', 'true', 'v', 't', '1', 'oui', 'yes'].includes(userAnsStr);
                    const isUserFalse = ['faux', 'false', 'f', '0', 'non', 'no'].includes(userAnsStr);
                    const isCorrectTrue = ['vrai', 'true', 'v', 't', '1', 'oui', 'yes'].includes(correctText);
                    const isCorrectFalse = ['faux', 'false', 'f', '0', 'non', 'no'].includes(correctText);

                    if ((isUserTrue && isCorrectTrue) || (isUserFalse && isCorrectFalse)) {
                        correct = true;
                    }
                }
                // 2. Comparaison directe texte-texte (QCM ou texte exact)
                else if (correctText && userAnsStr === correctText) {
                    correct = true;
                }
                // 3. L'étudiant a répondu par index numérique (ex: "2")
                else if (correctIndex !== null && String(userAns).trim() === String(correctIndex)) {
                    correct = true;
                }
                // 4. Comparaison via index option
                else if (correctIndex !== null && qOptions[correctIndex]) {
                    const optionText = String(qOptions[correctIndex]).trim().toLowerCase();
                    if (optionText && userAnsStr === optionText) correct = true;
                }
                // 5. Exercices texte avec réponse attendue (inclusion)
                else if (correctText && (userAnsStr.includes(correctText) || correctText.includes(userAnsStr))) {
                    correct = true;
                }
                // 6. Exercices ouverts sans réponse attendue stricte (si > 2 caractères)
                else if (!correctText && userAnsStr.length > 2) {
                    correct = true;
                }
            }

            if (correct) score += ptsPerQ;
            const correctDisplay = correctText || (correctIndex !== null && qOptions[correctIndex] ? qOptions[correctIndex] : '') || q.answer || '';
            details.push({ question: q.question, answer: userAns || '', correctAnswer: correctDisplay, correct, pts: correct ? ptsPerQ : 0 });
        });

        score = Math.min(Math.round(score * 10) / 10, exercise.max_score);

        const { data: existing } = await supabase.from('exercise_submissions')
            .select('id').eq('exercise_id', exercise.id).eq('student_id', studentId).maybeSingle();

        if (!existing) {
            await supabase.from('exercise_submissions').insert({
                exercise_id: exercise.id,
                student_id: studentId,
                answers,
                score,
                submitted_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                graded: true
            });
        } else {
            await supabase.from('exercise_submissions').update({
                answers,
                score,
                submitted_at: new Date().toISOString(),
                graded: true
            }).eq('id', existing.id);
        }

        const skyGain = calculateSkyPoints(score, exercise.max_score);
        if (skyGain > 0) {
            const { data: prof } = await supabase.from('student_profiles').select('sky_points').eq('id', studentId).single();
            if (prof) {
                await supabase.from('student_profiles').update({ sky_points: (prof.sky_points || 0) + skyGain }).eq('id', studentId);
                await supabase.from('sky_transactions').insert({
                    user_id: studentId,
                    student_id: studentId,
                    amount: skyGain,
                    type: 'exercise_score',
                    transaction_type: 'exercise_score',
                    description: `Score: ${score}/${exercise.max_score} (+${skyGain} Sky) — ${exercise.title}`
                });
            }
        }

        setResult({ score, max: exercise.max_score, skyGain, details });
        setSubmitted(true);
        setSubmitting(false);
        onComplete(score, exercise.max_score, skyGain);
    }, [answers, questions, exercise, studentId, submitting]);

    if (submitted && result) {
        const pct = (result.score / result.max) * 100;
        const passed = result.score >= result.max * 0.5;
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#0f1117] border border-white/10 rounded-3xl w-full max-w-lg p-8 shadow-2xl">
                    <div className="text-center mb-6">
                        {passed ? (
                            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                            </div>
                        ) : (
                            <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-10 h-10 text-red-400" />
                            </div>
                        )}
                        <h2 className="text-2xl font-bold text-white mb-1">{passed ? 'Bien joué ! 🎉' : 'Continue d\'essayer 💪'}</h2>
                        <p className="text-slate-400 text-sm">{exercise.title}</p>
                    </div>

                    <div className="bg-white/[0.04] rounded-2xl p-6 mb-6 text-center">
                        <div className="text-5xl font-black text-white mb-1">
                            <span className={passed ? 'text-emerald-400' : 'text-red-400'}>{result.score}</span>
                            <span className="text-slate-500 text-2xl">/{result.max}</span>
                        </div>
                        <Progress value={pct} className="mt-3 h-2" />
                        <p className="text-xs text-slate-500 mt-2">{pct.toFixed(0)}% de réussite</p>
                        {result.skyGain > 0 ? (
                            <p className="text-xs text-amber-400 font-bold mt-1.5 flex items-center justify-center gap-1">
                                <span>⭐</span> +{result.skyGain} Sky Point{result.skyGain > 1 ? 's' : ''} gagné{result.skyGain > 1 ? 's' : ''} !
                            </p>
                        ) : (
                            <p className="text-[10px] text-slate-500 mt-1">Nécessite au moins 50% de réussite (10/20) pour des Sky Points</p>
                        )}
                    </div>

                    {result.details.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto mb-6">
                            {result.details.map((d: any, i: number) => (
                                <div key={i} className={cn("flex items-start gap-2 p-2.5 rounded-xl text-xs", d.correct ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20')}>
                                    {d.correct ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /> : <X className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />}
                                    <div>
                                        <p className="text-slate-300 font-medium">{d.question}</p>
                                        {!d.correct && <p className="text-slate-500">Bonne réponse: <span className="text-emerald-400">{d.correctAnswer}</span></p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <Button onClick={onClose} className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl h-11">
                        Fermer
                    </Button>
                </motion.div>
            </motion.div>
        );
    }

    const q = questions[currentQ];
    if (!q) return null;

    const qType = (q.type || exercise.type || 'qcm').toLowerCase();
    const qOptions: string[] = Array.isArray(q.options) && q.options.length > 0
        ? q.options
        : Array.isArray(q.choices) && q.choices.length > 0
            ? q.choices
            : [];

    const isTrueFalse = qType === 'true_false' || qType === 'vrai_faux' || qType === 'boolean';
    const isQcm = (qType === 'qcm' || qType === 'quiz') && qOptions.length > 0;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#0f1117] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                    <div>
                        <h3 className="font-bold text-white text-sm">{exercise.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-400">
                                {isTrueFalse ? 'VRAI / FAUX' : isQcm ? 'QCM' : 'RÉPONSE ÉCRITE'}
                            </Badge>
                            <span className="text-[10px] text-slate-500">Question {currentQ + 1}/{questions.length}</span>
                        </div>
                    </div>
                    <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold", isUrgent ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/5 text-slate-300')}>
                        <Timer className="w-4 h-4" /> {formatTime(timeLeft)}
                    </div>
                </div>

                {/* Progress */}
                <div className="px-5 pt-3">
                    <Progress value={progress} className="h-1" />
                </div>

                {/* Question */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div className="bg-white/[0.04] rounded-2xl p-5 border border-white/[0.06]">
                        <p className="text-white font-medium leading-relaxed text-base">{q.question}</p>
                    </div>

                    {/* Answer area : 1. Vrai / Faux */}
                    {isTrueFalse && (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setAnswers(prev => ({ ...prev, [currentQ]: 'Vrai' }))}
                                className={cn(
                                    "p-5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 font-bold text-base",
                                    answers[currentQ] === 'Vrai'
                                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/50 scale-[1.02]'
                                        : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-emerald-500/10 hover:border-emerald-500/30'
                                )}
                            >
                                <span className="text-2xl">✅</span>
                                <span>Vrai</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setAnswers(prev => ({ ...prev, [currentQ]: 'Faux' }))}
                                className={cn(
                                    "p-5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 font-bold text-base",
                                    answers[currentQ] === 'Faux'
                                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-lg shadow-rose-500/10 ring-2 ring-rose-500/50 scale-[1.02]'
                                        : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-rose-500/10 hover:border-rose-500/30'
                                )}
                            >
                                <span className="text-2xl">❌</span>
                                <span>Faux</span>
                            </button>
                        </div>
                    )}

                    {/* Answer area : 2. QCM avec choix multiples */}
                    {!isTrueFalse && isQcm && (
                        <div className="space-y-2.5 pt-1">
                            {qOptions.map((opt: string, oi: number) => (
                                <button
                                    key={oi}
                                    type="button"
                                    onClick={() => setAnswers(prev => ({ ...prev, [currentQ]: opt }))}
                                    className={cn("w-full text-left p-4 rounded-2xl border text-sm transition-all flex items-center gap-3",
                                        answers[currentQ] === opt
                                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200 font-semibold shadow-lg ring-1 ring-indigo-500/50'
                                            : 'bg-white/[0.02] border-white/[0.06] text-slate-300 hover:border-white/20 hover:bg-white/[0.04]'
                                    )}
                                >
                                    <span className={cn(
                                        "w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-all",
                                        answers[currentQ] === opt ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-400"
                                    )}>
                                        {String.fromCharCode(65 + oi)}
                                    </span>
                                    <span className="flex-1 leading-snug">{opt}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Answer area : 3. Réponse Écrite / Texte / Open */}
                    {!isTrueFalse && !isQcm && (
                        <div className="space-y-2 pt-1">
                            <label className="text-xs text-slate-400 font-medium block">Votre réponse écrite :</label>
                            <Textarea
                                value={answers[currentQ] || ''}
                                onChange={e => setAnswers(prev => ({ ...prev, [currentQ]: e.target.value }))}
                                placeholder="Tapez votre réponse ici..."
                                className="bg-white/[0.04] border-white/15 text-white placeholder:text-slate-500 resize-none rounded-2xl p-4 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[120px]"
                                rows={4}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-white/[0.06] flex items-center justify-between gap-3">
                    <Button variant="ghost" disabled={currentQ === 0} onClick={() => setCurrentQ(q => q - 1)} className="text-slate-400">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Précédent
                    </Button>
                    {currentQ < questions.length - 1 ? (
                        <Button onClick={() => setCurrentQ(q => q + 1)} disabled={!answers[currentQ]}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6 font-bold shadow-md">
                            Suivant <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={submitting || !answers[currentQ]}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl px-6 font-bold shadow-lg">
                            {submitting ? 'Envoi...' : 'Soumettre'} <Send className="w-4 h-4 ml-1" />
                        </Button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
