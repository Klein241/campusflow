'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar as CalendarIcon, Clock, Plus, Trash2, CheckCircle2,
    AlertCircle, Sparkles, ChevronRight, BookOpen, Users,
    MapPin, Video, Check, Layers, ArrowRight, Download,
    Edit3, Flag, Award, RefreshCw, Briefcase, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { SchoolTypeConfig } from '@/lib/school-type-adapter';
import { cn } from '@/lib/utils';

interface AdminProCalendarTabProps {
    org: any;
    config: SchoolTypeConfig;
    cls: any[];
    subs: any[];
    teachers: any[];
    onRefresh: () => void;
}

interface Milestone {
    id: string;
    organization_id: string;
    classroom_id?: string;
    title: string;
    description?: string;
    milestone_type: string;
    due_date?: string;
    created_at?: string;
}

export function AdminProCalendarTab({
    org,
    config,
    cls,
    subs,
    teachers,
    onRefresh
}: AdminProCalendarTabProps) {
    const [selectedClassId, setSelectedClassId] = useState<string>(cls[0]?.id || 'all');
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal création jalon / livrable
    const [showAddMilestone, setShowAddMilestone] = useState(false);
    const [mTitle, setMTitle] = useState('');
    const [mDesc, setMDesc] = useState('');
    const [mType, setMType] = useState('project');
    const [mDueDate, setMDueDate] = useState('');
    const [mClassId, setMClassId] = useState(cls[0]?.id || '');
    const [savingM, setSavingM] = useState(false);

    // Charger les jalons
    const loadMilestones = async () => {
        if (!org?.id) return;
        setLoading(true);
        try {
            let q = supabase
                .from('pro_session_milestones')
                .select('*')
                .eq('organization_id', org.id)
                .order('due_date', { ascending: true });

            if (selectedClassId && selectedClassId !== 'all') {
                q = q.eq('classroom_id', selectedClassId);
            }

            const { data, error } = await q;
            if (error) {
                console.warn('[ProCalendar] Error loading milestones:', error);
            } else {
                setMilestones(data || []);
            }
        } catch (e: any) {
            console.warn('[ProCalendar] Error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMilestones();
    }, [org?.id, selectedClassId]);

    const handleCreateMilestone = async () => {
        if (!mTitle.trim() || !mDueDate) {
            toast.error('Titre et date d\'échéance requis');
            return;
        }

        setSavingM(true);
        try {
            const { error } = await supabase.from('pro_session_milestones').insert({
                organization_id: org.id,
                classroom_id: mClassId || null,
                title: mTitle.trim(),
                description: mDesc.trim() || null,
                milestone_type: mType,
                due_date: mDueDate
            });

            if (error) throw error;
            toast.success('🎉 Jalon / Échéance ajouté(e) au calendrier !');
            setShowAddMilestone(false);
            setMTitle('');
            setMDesc('');
            loadMilestones();
        } catch (e: any) {
            toast.error('Erreur : ' + e.message);
        } finally {
            setSavingM(false);
        }
    };

    const handleDeleteMilestone = async (id: string, title: string) => {
        if (!confirm(`Supprimer le jalon "${title}" ?`)) return;
        try {
            const { error } = await supabase.from('pro_session_milestones').delete().eq('id', id);
            if (error) throw error;
            toast.success('Jalon supprimé.');
            setMilestones(milestones.filter(m => m.id !== id));
        } catch (e: any) {
            toast.error('Erreur : ' + e.message);
        }
    };

    const getMilestoneBadge = (type: string) => {
        switch (type) {
            case 'final_defense':
                return { label: 'Soutenance Finale', color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: '🎓' };
            case 'midterm_exam':
                return { label: 'Évaluation Mi-parcours', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: '📝' };
            case 'workshop':
                return { label: 'Atelier / Workshop Pratique', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: '🛠️' };
            case 'cert_ceremony':
                return { label: 'Remise des Attestations', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: '🏆' };
            case 'project':
            default:
                return { label: 'Livrable / Projet', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: '💻' };
        }
    };

    // Calcul du statut de progression des sessions
    const activeClass = cls.find(c => c.id === selectedClassId);

    return (
        <div className="space-y-6">
            {/* Header & Sélecteur de Session */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-950/40 via-slate-900/80 to-indigo-950/30 border border-blue-500/20 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-black uppercase tracking-wider mb-2">
                            <span>🗓️ {config.terms.timetable}</span>
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight">
                            Planning & Échéancier des Sessions PRO
                        </h2>
                        <p className="text-sm text-slate-400 mt-1 max-w-xl">
                            Visualisez la chronologie de vos cohortes (1 mois, 3 mois, 6 mois), planifiez les ateliers pratiques, les examens de mi-parcours et les soutenances finales devant jury.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowAddMilestone(true)}
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-black text-sm shadow-xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 shrink-0"
                        >
                            <Plus className="w-4 h-4 stroke-[3]" />
                            <span>Ajouter une Échéance / Jalon</span>
                        </button>
                    </div>
                </div>

                {/* Filtre par Session / Cohorte */}
                <div className="flex flex-wrap items-center gap-2 mt-6 pt-6 border-t border-white/[0.08]">
                    <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5" /> Filtrer par session :
                    </span>
                    <button
                        onClick={() => setSelectedClassId('all')}
                        className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold transition",
                            selectedClassId === 'all'
                                ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                                : "bg-white/[0.05] text-slate-400 hover:text-white"
                        )}
                    >
                        Toutes les Sessions ({cls.length})
                    </button>
                    {cls.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedClassId(c.id)}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5",
                                selectedClassId === c.id
                                    ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                                    : "bg-white/[0.05] text-slate-400 hover:text-white"
                            )}
                        >
                            <span>{c.name}</span>
                            <span className="text-[10px] opacity-70">({c.cycle || '3 Mois'})</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Vue Chronologique des Sessions Actives */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Colonne 1 & 2 : Timeline des Jalons & Échéances */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-black text-white flex items-center gap-2">
                            <Flag className="w-4 h-4 text-blue-400" />
                            Échéancier & Jalons Pédagogiques ({milestones.length})
                        </h3>
                        <button
                            onClick={loadMilestones}
                            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition text-xs"
                            title="Actualiser"
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                            <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-400">Chargement de l'échéancier...</p>
                        </div>
                    ) : milestones.length === 0 ? (
                        <div className="p-12 text-center rounded-3xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto text-2xl text-blue-400">
                                🗓️
                            </div>
                            <h4 className="text-base font-black text-white">Aucun jalon planifié pour le moment</h4>
                            <p className="text-xs text-slate-400 max-w-md mx-auto">
                                Structurez votre formation en ajoutant des dates clés : ateliers pratiques, rendus de projets, examens de mi-parcours et soutenances.
                            </p>
                            <button
                                onClick={() => setShowAddMilestone(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-black transition"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Planifier le 1er jalon
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {milestones.map((m, idx) => {
                                const badge = getMilestoneBadge(m.milestone_type);
                                const assignedCls = cls.find(c => c.id === m.classroom_id);
                                const isPast = m.due_date ? new Date(m.due_date) < new Date() : false;

                                return (
                                    <motion.div
                                        key={m.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className={cn(
                                            "p-4 rounded-2xl border transition relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                                            isPast
                                                ? "bg-white/[0.01] border-white/[0.05] opacity-70"
                                                : "bg-slate-900/60 border-white/[0.08] hover:border-blue-500/30"
                                        )}
                                    >
                                        <div className="flex items-start gap-3.5">
                                            <div className="text-2xl mt-0.5">{badge.icon}</div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border", badge.color)}>
                                                        {badge.label}
                                                    </span>
                                                    {assignedCls && (
                                                        <span className="text-[11px] font-semibold text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-md">
                                                            📚 {assignedCls.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="text-sm font-black text-white mt-1">{m.title}</h4>
                                                {m.description && (
                                                    <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                                            <div className="text-right">
                                                <span className="text-[10px] text-slate-500 font-semibold block">Date limite</span>
                                                <span className={cn(
                                                    "text-xs font-black",
                                                    isPast ? "text-slate-500 line-through" : "text-blue-300"
                                                )}>
                                                    📅 {m.due_date ? new Date(m.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Non fixée'}
                                                </span>
                                            </div>

                                            <button
                                                onClick={() => handleDeleteMilestone(m.id, m.title)}
                                                className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                                                title="Supprimer le jalon"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Colonne 3 : Synthèse Rythme & Créneaux Types */}
                <div className="space-y-4">
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-400" />
                        Rythmes de Formation Pro
                    </h3>

                    <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/[0.08] space-y-4">
                        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-white">☀️ Cours du Jour</span>
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Plein temps</span>
                            </div>
                            <p className="text-[11px] text-slate-400">Lundi au Vendredi • 08h30 - 15h30</p>
                            <p className="text-[10px] text-slate-500 mt-1">Idéal pour les étudiants en reconversion à 100%.</p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-white">🌙 Cours du Soir</span>
                                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">Travailleurs</span>
                            </div>
                            <p className="text-[11px] text-slate-400">Mardi & Jeudi 18h30 - 21h30 + Samedi 09h - 14h</p>
                            <p className="text-[10px] text-slate-500 mt-1">Spécial professionnels en poste / cadres.</p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-white">📅 Samedi Intensif</span>
                                <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">Week-end</span>
                            </div>
                            <p className="text-[11px] text-slate-400">Samedi • 08h30 - 17h30 (8h intensif)</p>
                            <p className="text-[10px] text-slate-500 mt-1">Workshops intensifs & cas pratiques.</p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-white">🌐 Hybride / E-Learning</span>
                                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">Flex</span>
                            </div>
                            <p className="text-[11px] text-slate-400">VOD en autonomie + 2 sessions live de coaching / sem</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Création Jalon */}
            <AnimatePresence>
                {showAddMilestone && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-black text-white flex items-center gap-2">
                                    <span>🚩</span> Nouveau Jalon / Échéance
                                </h3>
                                <button
                                    onClick={() => setShowAddMilestone(false)}
                                    className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1">Titre de l'échéance *</label>
                                    <Input
                                        placeholder="Ex: Soutenance Projet Web, Examen Mi-parcours..."
                                        value={mTitle}
                                        onChange={e => setMTitle(e.target.value)}
                                        className="bg-white/5 border-white/10 text-white"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-300 block mb-1">Type de jalon</label>
                                        <select
                                            value={mType}
                                            onChange={e => setMType(e.target.value)}
                                            className="w-full h-10 px-3 rounded-xl bg-slate-800 border border-white/10 text-xs font-semibold text-white focus:outline-none"
                                        >
                                            <option value="project">💻 Rendu Projet / Livrable</option>
                                            <option value="workshop">🛠️ Atelier / Workshop Pratique</option>
                                            <option value="midterm_exam">📝 Évaluation Mi-parcours</option>
                                            <option value="final_defense">🎓 Soutenance Finale devant Jury</option>
                                            <option value="cert_ceremony">🏆 Cérémonie & Remise Attestations</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-300 block mb-1">Date limite *</label>
                                        <Input
                                            type="date"
                                            value={mDueDate}
                                            onChange={e => setMDueDate(e.target.value)}
                                            className="bg-white/5 border-white/10 text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1">Session concernée</label>
                                    <select
                                        value={mClassId}
                                        onChange={e => setMClassId(e.target.value)}
                                        className="w-full h-10 px-3 rounded-xl bg-slate-800 border border-white/10 text-xs font-semibold text-white focus:outline-none"
                                    >
                                        {cls.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} ({c.cycle || 'Formation Pro'})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1">Description / Consignes (optionnel)</label>
                                    <Input
                                        placeholder="Ex: Présentation de 15 min + Démonstration live du prototype"
                                        value={mDesc}
                                        onChange={e => setMDesc(e.target.value)}
                                        className="bg-white/5 border-white/10 text-white"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowAddMilestone(false)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    onClick={handleCreateMilestone}
                                    disabled={savingM}
                                    className="bg-blue-500 hover:bg-blue-400 text-white font-bold"
                                >
                                    {savingM ? 'Enregistrement...' : 'Enregistrer le Jalon'}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
