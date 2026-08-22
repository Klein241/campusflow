'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, X, Trash2, Copy, ExternalLink, Eye, BarChart3, FileText,
    CheckCircle2, AlignLeft, AlignJustify, Circle, CheckSquare, ChevronDown,
    Calendar, Clock, Star, Hash, Minus, ChevronUp, Settings, Save,
    ToggleLeft, ToggleRight, Link2, Users, TrendingUp, Edit, ArrowLeft,
    Loader2, ClipboardList, Globe, Lock, Send, RefreshCw, GripVertical,
    PlusCircle, Type, ListOrdered
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formsService, CampusForm, FormField, FieldType, FormType, FormResponse } from '@/lib/forms-service';
import { isCustomDomain } from '@/lib/custom-domain';
import { toast } from 'sonner';

// ════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════
const FIELD_TYPES: { type: FieldType; label: string; icon: any; color: string }[] = [
    { type: 'short_text', label: 'Texte court', icon: AlignLeft, color: 'text-blue-400' },
    { type: 'long_text', label: 'Texte long', icon: AlignJustify, color: 'text-indigo-400' },
    { type: 'multiple_choice', label: 'Choix unique', icon: Circle, color: 'text-violet-400' },
    { type: 'checkbox', label: 'Cases à cocher', icon: CheckSquare, color: 'text-purple-400' },
    { type: 'dropdown', label: 'Liste déroulante', icon: ChevronDown, color: 'text-fuchsia-400' },
    { type: 'date', label: 'Date', icon: Calendar, color: 'text-teal-400' },
    { type: 'time', label: 'Heure', icon: Clock, color: 'text-cyan-400' },
    { type: 'rating', label: 'Étoiles (1-5)', icon: Star, color: 'text-amber-400' },
    { type: 'number', label: 'Nombre', icon: Hash, color: 'text-emerald-400' },
    { type: 'section_header', label: 'Séparateur', icon: Minus, color: 'text-slate-400' },
];

const FORM_TYPE_INFO: Record<FormType, { label: string; icon: string; color: string }> = {
    survey: { label: 'Sondage', icon: '📊', color: 'text-blue-400 bg-blue-500/10' },
    quiz: { label: 'Quiz', icon: '🧠', color: 'text-violet-400 bg-violet-500/10' },
    registration: { label: 'Inscription', icon: '📋', color: 'text-emerald-400 bg-emerald-500/10' },
};

function makeField(sort_order: number): FormField {
    return { field_type: 'short_text', label: 'Question', required: false, sort_order };
}

// ════════════════════════════════════════════════
// FIELD EDITOR
// ════════════════════════════════════════════════
function FieldEditor({
    field, index, total, isQuiz,
    onChange, onDelete, onMoveUp, onMoveDown,
}: {
    field: FormField; index: number; total: number; isQuiz: boolean;
    onChange: (f: FormField) => void;
    onDelete: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const hasOptions = ['multiple_choice', 'checkbox', 'dropdown'].includes(field.field_type);
    const opts = field.options || ['Option 1'];

    const updateOpt = (i: number, val: string) => {
        const next = [...opts]; next[i] = val; onChange({ ...field, options: next });
    };
    const addOpt = () => onChange({ ...field, options: [...opts, `Option ${opts.length + 1}`] });
    const delOpt = (i: number) => {
        if (opts.length <= 1) return;
        onChange({ ...field, options: opts.filter((_, idx) => idx !== i) });
    };

    const typeInfo = FIELD_TYPES.find(t => t.type === field.field_type);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-xl bg-white/[0.03] border border-white/10 overflow-hidden"
        >
            {/* Field header */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.02]">
                <div className="flex flex-col gap-0.5">
                    <button onClick={onMoveUp} disabled={index === 0}
                        className="text-slate-500 hover:text-white disabled:opacity-20 transition">
                        <ChevronUp className="w-3 h-3" />
                    </button>
                    <button onClick={onMoveDown} disabled={index === total - 1}
                        className="text-slate-500 hover:text-white disabled:opacity-20 transition">
                        <ChevronDown className="w-3 h-3" />
                    </button>
                </div>
                <GripVertical className="w-4 h-4 text-slate-600 flex-shrink-0" />

                <span className={`text-xs font-medium ${typeInfo?.color || 'text-slate-400'}`}>
                    {typeInfo?.label}
                </span>

                <span className="text-xs text-slate-500 flex-1 truncate">{field.label}</span>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onChange({ ...field, required: !field.required })}
                        className={`text-[9px] px-2 py-0.5 rounded-full border transition ${field.required
                            ? 'border-red-500/40 text-red-400 bg-red-500/10'
                            : 'border-white/10 text-slate-500 hover:border-white/20'}`}
                    >
                        {field.required ? 'Requis' : 'Optionnel'}
                    </button>
                    <button onClick={() => setExpanded(!expanded)}
                        className="text-slate-500 hover:text-white p-1 transition">
                        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={onDelete}
                        className="text-slate-600 hover:text-red-400 p-1 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Field body */}
            {expanded && (
                <div className="p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-slate-400 text-[10px] mb-1">Type</Label>
                            <select
                                value={field.field_type}
                                onChange={e => onChange({ ...field, field_type: e.target.value as FieldType, options: undefined, correct_answer: undefined })}
                                className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:border-indigo-500/50"
                            >
                                {FIELD_TYPES.map(t => (
                                    <option key={t.type} value={t.type} className="bg-[#0F172A]">{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label className="text-slate-400 text-[10px] mb-1">Libellé *</Label>
                            <Input
                                value={field.label}
                                onChange={e => onChange({ ...field, label: e.target.value })}
                                placeholder="Votre question..."
                                className="bg-white/5 border-white/10 text-white h-8 text-xs rounded-lg"
                            />
                        </div>
                    </div>

                    <div>
                        <Label className="text-slate-400 text-[10px] mb-1">Description (optionnel)</Label>
                        <Input
                            value={field.description || ''}
                            onChange={e => onChange({ ...field, description: e.target.value })}
                            placeholder="Sous-titre ou instructions..."
                            className="bg-white/5 border-white/10 text-white h-7 text-xs rounded-lg"
                        />
                    </div>

                    {/* Options for MC/checkbox/dropdown */}
                    {hasOptions && (
                        <div className="space-y-1.5">
                            <Label className="text-slate-400 text-[10px]">Options</Label>
                            {opts.map((opt, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                    <span className="text-slate-600 text-[10px] w-4 text-right">{i + 1}.</span>
                                    <Input
                                        value={opt}
                                        onChange={e => updateOpt(i, e.target.value)}
                                        className="bg-white/5 border-white/10 text-white h-7 text-xs rounded-lg flex-1"
                                        placeholder={`Option ${i + 1}`}
                                    />
                                    {isQuiz && (
                                        <button
                                            onClick={() => onChange({ ...field, correct_answer: opt })}
                                            className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition ${field.correct_answer === opt
                                                ? 'border-emerald-500 bg-emerald-500'
                                                : 'border-slate-600 hover:border-emerald-500/50'}`}
                                        />
                                    )}
                                    <button onClick={() => delOpt(i)}
                                        className="text-slate-600 hover:text-red-400 transition flex-shrink-0">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            <button onClick={addOpt}
                                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-1 transition">
                                <Plus className="w-3 h-3" />Ajouter une option
                            </button>
                        </div>
                    )}

                    {/* Quiz: points */}
                    {isQuiz && field.field_type !== 'section_header' && (
                        <div className="flex items-center gap-3">
                            <div className="flex-1">
                                <Label className="text-slate-400 text-[10px] mb-1">Points pour bonne réponse</Label>
                                <Input
                                    type="number" min="0" max="100"
                                    value={field.points ?? 0}
                                    onChange={e => onChange({ ...field, points: parseInt(e.target.value) || 0 })}
                                    className="bg-white/5 border-white/10 text-white h-7 text-xs rounded-lg w-20"
                                />
                            </div>
                            {!hasOptions && (
                                <div className="flex-1">
                                    <Label className="text-slate-400 text-[10px] mb-1">Réponse correcte</Label>
                                    <Input
                                        value={field.correct_answer || ''}
                                        onChange={e => onChange({ ...field, correct_answer: e.target.value })}
                                        className="bg-white/5 border-white/10 text-white h-7 text-xs rounded-lg"
                                        placeholder="Réponse attendue..."
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}

// ════════════════════════════════════════════════
// FORM BUILDER
// ════════════════════════════════════════════════
function FormBuilder({
    form, onClose, onSaved, orgId, userId, userRole,
}: {
    form: CampusForm | null;
    onClose: () => void;
    onSaved: () => void;
    orgId: string;
    userId: string;
    userRole: 'teacher' | 'student';
}) {
    const isNew = !form?.id;
    const [title, setTitle] = useState(form?.title || '');
    const [description, setDescription] = useState(form?.description || '');
    const [formType, setFormType] = useState<FormType>(form?.form_type || 'survey');
    const [fields, setFields] = useState<FormField[]>(
        (form?.form_fields || []).length > 0
            ? form!.form_fields!
            : [makeField(0)]
    );
    const [saving, setSaving] = useState(false);
    const [showTypeMenu, setShowTypeMenu] = useState(false);

    const addField = (type: FieldType) => {
        setFields(prev => [
            ...prev,
            {
                field_type: type,
                label: type === 'section_header' ? 'Section' : 'Nouvelle question',
                required: false,
                sort_order: prev.length,
                options: ['multiple_choice', 'checkbox', 'dropdown'].includes(type)
                    ? ['Option 1', 'Option 2'] : undefined,
            },
        ]);
        setShowTypeMenu(false);
    };

    const moveField = (i: number, dir: 'up' | 'down') => {
        setFields(prev => {
            const arr = [...prev];
            const j = dir === 'up' ? i - 1 : i + 1;
            if (j < 0 || j >= arr.length) return arr;
            [arr[i], arr[j]] = [arr[j], arr[i]];
            return arr;
        });
    };

    const saveForm = async (publish?: boolean) => {
        if (!title.trim()) { toast.error('Donnez un titre au formulaire'); return; }
        setSaving(true);
        try {
            let savedId = form?.id;

            if (isNew) {
                const created = await formsService.createForm({
                    organization_id: orgId,
                    created_by_role: userRole,
                    created_by_id: userId,
                    title: title.trim(),
                    description: description.trim() || undefined,
                    form_type: formType,
                });
                if (!created) { toast.error('Erreur lors de la création'); return; }
                savedId = created.id;
            } else {
                await formsService.updateForm(form!.id!, {
                    title: title.trim(),
                    description: description.trim() || undefined,
                    form_type: formType,
                    ...(publish !== undefined ? { is_published: publish } : {}),
                });
            }

            if (savedId) {
                await formsService.upsertFields(savedId, fields);
                if (publish !== undefined && !isNew) {
                    // already handled above
                } else if (publish !== undefined && isNew) {
                    await formsService.updateForm(savedId, { is_published: publish });
                }
            }

            toast.success(isNew ? '✅ Formulaire créé !' : '✅ Formulaire mis à jour !');
            onSaved();
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 bg-gradient-to-b from-[#0B0E14] to-[#0F1219] text-white overflow-y-auto"
        >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-[#0B0E14]/90 backdrop-blur border-b border-white/[0.06]">
                <button onClick={onClose}
                    className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-sm truncate">{isNew ? '📝 Nouveau formulaire' : `✏️ ${title}`}</h2>
                    <p className="text-[10px] text-slate-500">{fields.length} champ{fields.length > 1 ? 's' : ''}</p>
                </div>
                <Button
                    size="sm"
                    onClick={() => saveForm()}
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-500 text-xs h-8 rounded-xl"
                >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                    Sauver
                </Button>
                <Button
                    size="sm"
                    onClick={() => saveForm(true)}
                    disabled={saving}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-xs h-8 rounded-xl"
                >
                    <Globe className="w-3.5 h-3.5 mr-1" />
                    Publier
                </Button>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
                {/* Form meta */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div>
                        <Label className="text-slate-400 text-xs">Titre du formulaire *</Label>
                        <Input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ex: Sondage de satisfaction, Quiz de maths..."
                            className="mt-1 bg-white/5 border-white/10 text-white rounded-xl"
                        />
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">Description (optionnel)</Label>
                        <Input
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Brève description ou instructions..."
                            className="mt-1 bg-white/5 border-white/10 text-white rounded-xl"
                        />
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs mb-1">Type de formulaire</Label>
                        <div className="grid grid-cols-3 gap-2 mt-1">
                            {(Object.entries(FORM_TYPE_INFO) as [FormType, any][]).map(([t, info]) => (
                                <button
                                    key={t}
                                    onClick={() => setFormType(t)}
                                    className={`p-2.5 rounded-xl border text-center transition-all text-xs ${formType === t
                                        ? `border-indigo-500/50 bg-indigo-600/10 ${info.color.split(' ')[0]}`
                                        : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20'}`}
                                >
                                    <div className="text-lg mb-0.5">{info.icon}</div>
                                    <div className="font-medium">{info.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Fields */}
                <div className="space-y-2">
                    <AnimatePresence>
                        {fields.map((f, i) => (
                            <FieldEditor
                                key={i}
                                field={f}
                                index={i}
                                total={fields.length}
                                isQuiz={formType === 'quiz'}
                                onChange={updated => setFields(prev => prev.map((x, idx) => idx === i ? updated : x))}
                                onDelete={() => setFields(prev => prev.filter((_, idx) => idx !== i))}
                                onMoveUp={() => moveField(i, 'up')}
                                onMoveDown={() => moveField(i, 'down')}
                            />
                        ))}
                    </AnimatePresence>
                </div>

                {/* Add field */}
                <div className="relative">
                    <button
                        onClick={() => setShowTypeMenu(!showTypeMenu)}
                        className="w-full py-3 rounded-2xl border border-dashed border-white/20 text-slate-400 hover:border-indigo-500/40 hover:text-indigo-400 flex items-center justify-center gap-2 text-sm transition-all"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Ajouter une question
                    </button>
                    <AnimatePresence>
                        {showTypeMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                className="absolute bottom-full mb-2 left-0 right-0 bg-[#0F172A] border border-white/10 rounded-2xl p-2 grid grid-cols-2 gap-1 shadow-2xl z-10"
                            >
                                {FIELD_TYPES.map(t => (
                                    <button
                                        key={t.type}
                                        onClick={() => addField(t.type)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 text-left transition text-xs"
                                    >
                                        <t.icon className={`w-3.5 h-3.5 flex-shrink-0 ${t.color}`} />
                                        <span className="text-slate-300">{t.label}</span>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="h-8" />
            </div>
        </motion.div>
    );
}

// ════════════════════════════════════════════════
// ANALYTICS VIEW
// ════════════════════════════════════════════════
function AnalyticsView({ form, onClose }: { form: CampusForm; onClose: () => void }) {
    const [responses, setResponses] = useState<FormResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [liveCount, setLiveCount] = useState(0); // pour animer le badge

    const reload = useCallback(async () => {
        const r = await formsService.getResponses(form.id!);
        setResponses(r);
        setLoading(false);
        setLiveCount(c => c + 1);
    }, [form.id]);

    useEffect(() => {
        reload();
        // Realtime: refresh dès qu'une nouvelle réponse arrive
        const channel = supabase
            .channel(`analytics-${form.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'form_responses',
                filter: `form_id=eq.${form.id}`,
            }, () => reload())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [form.id, reload]);

    const fields = (form.form_fields || []).filter(f => f.field_type !== 'section_header');

    const getAnswersForField = (fieldId: string) =>
        responses.flatMap(r => r.form_answers || []).filter(a => a.field_id === fieldId);

    const getChoiceCounts = (fieldId: string, options: string[]) => {
        const answers = getAnswersForField(fieldId);
        return options.map(opt => {
            const count = answers.filter(a => {
                const v = a.answer_value;
                return Array.isArray(v) ? v.includes(opt) : v === opt;
            }).length;
            return { opt, count, pct: responses.length ? Math.round(count / responses.length * 100) : 0 };
        });
    };

    const getRatingAvg = (fieldId: string) => {
        const answers = getAnswersForField(fieldId).map(a => Number(a.answer_value)).filter(Boolean);
        if (!answers.length) return 0;
        return (answers.reduce((a, b) => a + b, 0) / answers.length).toFixed(1);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 bg-gradient-to-b from-[#0B0E14] to-[#0F1219] text-white overflow-y-auto"
        >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-[#0B0E14]/90 backdrop-blur border-b border-white/[0.06]">
                <button onClick={onClose}
                    className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h2 className="font-bold text-sm truncate">📈 Réponses — {form.title}</h2>
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] text-slate-500">{responses.length} réponse{responses.length !== 1 ? 's' : ''}</p>
                        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Live
                        </span>
                    </div>
                </div>
                <button onClick={reload}
                    className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                </div>
            ) : responses.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Aucune réponse pour l'instant</p>
                    <p className="text-xs mt-1">Partagez le lien de votre formulaire !</p>
                </div>
            ) : (
                <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-center">
                            <p className="text-2xl font-black text-indigo-400">{responses.length}</p>
                            <p className="text-[10px] text-slate-400">Réponses</p>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-center">
                            <p className="text-2xl font-black text-emerald-400">{fields.length}</p>
                            <p className="text-[10px] text-slate-400">Questions</p>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-600/10 border border-amber-500/20 text-center">
                            <p className="text-2xl font-black text-amber-400">
                                {responses.length > 0
                                    ? Math.round(responses.filter(r => r.submitted_at &&
                                        new Date(r.submitted_at).toDateString() === new Date().toDateString()).length / responses.length * 100)
                                    : 0}%
                            </p>
                            <p className="text-[10px] text-slate-400">Aujourd'hui</p>
                        </div>
                    </div>

                    {/* Per-field analytics */}
                    {fields.map(field => {
                        const hasOpts = ['multiple_choice', 'checkbox', 'dropdown'].includes(field.field_type);
                        const counts = hasOpts ? getChoiceCounts(field.id!, field.options || []) : [];
                        const textAnswers = !hasOpts && field.field_type !== 'rating'
                            ? getAnswersForField(field.id!).slice(0, 5).map(a => String(a.answer_value || '').trim()).filter(Boolean)
                            : [];

                        return (
                            <div key={field.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                                <p className="font-medium text-sm mb-3">{field.label}</p>

                                {hasOpts && (
                                    <div className="space-y-2">
                                        {counts.map(({ opt, count, pct }) => (
                                            <div key={opt}>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-slate-300 truncate max-w-[70%]">{opt}</span>
                                                    <span className="text-slate-400">{count} ({pct}%)</span>
                                                </div>
                                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${pct}%` }}
                                                        transition={{ delay: 0.2, duration: 0.6 }}
                                                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {field.field_type === 'rating' && (
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl font-black text-amber-400">{getRatingAvg(field.id!)}</span>
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <Star key={s}
                                                    className={`w-5 h-5 ${s <= Number(getRatingAvg(field.id!))
                                                        ? 'text-amber-400 fill-amber-400'
                                                        : 'text-slate-600'}`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-xs text-slate-500">{getAnswersForField(field.id!).length} vote{getAnswersForField(field.id!).length !== 1 ? 's' : ''}</span>
                                    </div>
                                )}

                                {textAnswers.length > 0 && (
                                    <div className="space-y-1.5">
                                        {textAnswers.map((a, i) => (
                                            <p key={i} className="text-xs text-slate-300 bg-white/[0.03] px-3 py-2 rounded-lg border border-white/5">
                                                "{a}"
                                            </p>
                                        ))}
                                        {getAnswersForField(field.id!).length > 5 && (
                                            <p className="text-[10px] text-slate-500">+ {getAnswersForField(field.id!).length - 5} autres réponses...</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
}

// ════════════════════════════════════════════════
// MAIN FORMS VIEW
// ════════════════════════════════════════════════
interface FormsViewProps {
    orgId: string;
    orgSlug: string;
    userId: string;
    userRole: 'teacher' | 'student';
    userName: string;
}

export function FormsView({ orgId, orgSlug, userId, userRole, userName }: FormsViewProps) {
    const [myForms, setMyForms] = useState<CampusForm[]>([]);
    const [orgForms, setOrgForms] = useState<CampusForm[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'my' | 'available'>('my');
    const [builderForm, setBuilderForm] = useState<CampusForm | null | 'new'>(null);
    const [analyticsForm, setAnalyticsForm] = useState<CampusForm | null>(null);
    const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
    const [toggling, setToggling] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const [mine, avail] = await Promise.all([
            formsService.getFormsByCreator(orgId, userId),
            formsService.getOrgPublishedForms(orgId),
        ]);
        setMyForms(mine);
        setOrgForms(avail.filter(f => f.created_by_id !== userId));

        // Load response counts
        const counts: Record<string, number> = {};
        await Promise.all(mine.map(async f => {
            counts[f.id!] = await formsService.getResponseCount(f.id!);
        }));
        setResponseCounts(counts);
        setLoading(false);
    }, [orgId, userId]);

    useEffect(() => { load(); }, [load]);

    const togglePublish = async (form: CampusForm) => {
        setToggling(form.id!);
        const success = await formsService.updateForm(form.id!, {
            is_published: !form.is_published,
            accepts_responses: !form.is_published,
        });
        if (success) {
            setMyForms(prev => prev.map(f => f.id === form.id
                ? { ...f, is_published: !f.is_published, accepts_responses: !f.is_published }
                : f
            ));
            toast.success(form.is_published ? 'Formulaire retiré' : '🌐 Formulaire publié !');
        }
        setToggling(null);
    };

    const deleteForm = async (form: CampusForm) => {
        if (!confirm(`Supprimer "${form.title}" et toutes ses réponses ?`)) return;
        const ok = await formsService.deleteForm(form.id!);
        if (ok) { setMyForms(prev => prev.filter(f => f.id !== form.id)); toast.success('Formulaire supprimé'); }
        else toast.error('Erreur lors de la suppression');
    };

    const getFormUrl = (slug: string) => {
        const isCustom = typeof window !== 'undefined' && isCustomDomain();
        const path = isCustom ? `/f/${slug}` : `/${orgSlug}/f/${slug}`;
        return typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
    };

    const copyLink = async (form: CampusForm) => {
        if (!form.is_published && form.id) {
            await formsService.updateForm(form.id, { is_published: true, accepts_responses: true });
            setMyForms(prev => prev.map(f => f.id === form.id ? { ...f, is_published: true, accepts_responses: true } : f));
        }
        const url = getFormUrl(form.slug);
        navigator.clipboard.writeText(url);
        toast.success('🔗 Lien copié et formulaire actif !');
    };

    const openForm = async (form: CampusForm) => {
        if (!form.is_published && form.id) {
            await formsService.updateForm(form.id, { is_published: true, accepts_responses: true });
            setMyForms(prev => prev.map(f => f.id === form.id ? { ...f, is_published: true, accepts_responses: true } : f));
        }
        const isCustom = typeof window !== 'undefined' && isCustomDomain();
        const path = isCustom ? `/f/${form.slug}` : `/${orgSlug}/f/${form.slug}`;
        window.open(path, '_blank');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    return (
        <>
            {/* Builder overlay */}
            <AnimatePresence>
                {builderForm !== null && (
                    <FormBuilder
                        form={builderForm === 'new' ? null : builderForm}
                        onClose={() => setBuilderForm(null)}
                        onSaved={() => { setBuilderForm(null); setActiveTab('my'); load(); }}
                        orgId={orgId}
                        userId={userId}
                        userRole={userRole}
                    />
                )}
            </AnimatePresence>

            {/* Analytics overlay */}
            <AnimatePresence>
                {analyticsForm && (
                    <AnalyticsView
                        form={analyticsForm}
                        onClose={() => setAnalyticsForm(null)}
                    />
                )}
            </AnimatePresence>

            {/* Main content */}
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-black flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-indigo-400" />
                            Formulaires
                        </h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            Créez des sondages, quiz et inscriptions
                        </p>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => setBuilderForm('new')}
                        className="bg-gradient-to-r from-indigo-600 to-violet-600 text-xs rounded-xl h-9 shadow-lg shadow-indigo-600/20"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Créer
                    </Button>
                </div>

                {/* Tab switcher */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <button
                        onClick={() => setActiveTab('my')}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === 'my'
                            ? 'bg-gradient-to-r from-indigo-600/20 to-violet-600/20 text-indigo-300'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                    >
                        📝 Mes formulaires ({myForms.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('available')}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === 'available'
                            ? 'bg-gradient-to-r from-teal-600/20 to-emerald-600/20 text-teal-300'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                    >
                        🌐 Disponibles ({orgForms.length})
                    </button>
                </div>

                {/* MY FORMS */}
                {activeTab === 'my' && (
                    <div className="space-y-3">
                        {myForms.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-16"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                                    <ClipboardList className="w-8 h-8 text-indigo-400" />
                                </div>
                                <p className="font-medium text-slate-300">Aucun formulaire créé</p>
                                <p className="text-xs text-slate-500 mt-1 mb-4">
                                    Créez votre premier sondage, quiz ou formulaire d'inscription
                                </p>
                                <Button
                                    size="sm"
                                    onClick={() => setBuilderForm('new')}
                                    className="bg-indigo-600 text-xs rounded-xl"
                                >
                                    <Plus className="w-4 h-4 mr-1" />Créer un formulaire
                                </Button>
                            </motion.div>
                        ) : (
                            myForms.map(form => {
                                const typeInfo = FORM_TYPE_INFO[form.form_type];
                                const count = responseCounts[form.id!] ?? 0;
                                return (
                                    <motion.div
                                        key={form.id}
                                        layout
                                        className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}>
                                                        {typeInfo.icon} {typeInfo.label}
                                                    </span>
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-full ${form.is_published
                                                        ? 'bg-emerald-500/10 text-emerald-400'
                                                        : 'bg-slate-500/10 text-slate-400'}`}>
                                                        {form.is_published ? '🌐 Publié' : '🔒 Brouillon'}
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-sm truncate">{form.title}</h3>
                                                {form.description && (
                                                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{form.description}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Stats row */}
                                        <div className="flex items-center gap-3 mb-3 text-xs text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3 h-3" />{count} réponse{count !== 1 ? 's' : ''}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <FileText className="w-3 h-3" />
                                                {(form.form_fields || []).filter(f => f.field_type !== 'section_header').length} questions
                                            </span>
                                            {form.created_at && (
                                                <span className="text-slate-600 text-[10px]">
                                                    {new Date(form.created_at).toLocaleDateString('fr-FR')}
                                                </span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <button
                                                onClick={() => setBuilderForm(form)}
                                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] transition"
                                            >
                                                <Edit className="w-3 h-3" />Modifier
                                            </button>
                                            <button
                                                onClick={() => setAnalyticsForm(form)}
                                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-[11px] transition"
                                            >
                                                <BarChart3 className="w-3 h-3" />Réponses
                                            </button>
                                            {form.is_published && (
                                                <>
                                                    <button
                                                        onClick={() => copyLink(form)}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-600/10 hover:bg-teal-600/20 text-teal-400 text-[11px] transition"
                                                    >
                                                        <Copy className="w-3 h-3" />Lien
                                                    </button>
                                                    <button
                                                        onClick={() => openForm(form)}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 text-[11px] transition"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />Voir
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => togglePublish(form)}
                                                disabled={toggling === form.id}
                                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition ml-auto ${form.is_published
                                                    ? 'bg-amber-600/10 hover:bg-amber-600/20 text-amber-400'
                                                    : 'bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400'}`}
                                            >
                                                {toggling === form.id
                                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                                    : form.is_published
                                                        ? <><Lock className="w-3 h-3" />Retirer</>
                                                        : <><Globe className="w-3 h-3" />Publier</>
                                                }
                                            </button>
                                            <button
                                                onClick={() => deleteForm(form)}
                                                className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* AVAILABLE FORMS */}
                {activeTab === 'available' && (
                    <div className="space-y-3">
                        {orgForms.length === 0 ? (
                            <div className="text-center py-16 text-slate-500">
                                <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">Aucun formulaire disponible</p>
                                <p className="text-xs mt-1">Les formulaires publiés par vos collègues apparaîtront ici</p>
                            </div>
                        ) : (
                            orgForms.map(form => {
                                const typeInfo = FORM_TYPE_INFO[form.form_type];
                                return (
                                    <motion.div
                                        key={form.id}
                                        layout
                                        className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 text-lg">
                                                {typeInfo.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-sm">{form.title}</h3>
                                                {form.description && (
                                                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{form.description}</p>
                                                )}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                                                        {typeInfo.label}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => openForm(form)}
                                                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-medium shadow-lg shadow-indigo-600/20 transition hover:shadow-indigo-600/30 flex-shrink-0"
                                            >
                                                <Send className="w-3 h-3" />
                                                Remplir
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
