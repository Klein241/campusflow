'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Briefcase, Plus, Calendar, Clock, Award, Users,
    BookOpen, Sparkles, CheckCircle2, ChevronRight,
    Edit3, Trash2, Search, ArrowRight, DollarSign,
    Layers, ShieldCheck, Download, AlertCircle, PlayCircle,
    UserPlus, Phone, Mail, MessageSquare, ExternalLink,
    GraduationCap, Check, X, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { SchoolTypeConfig } from '@/lib/school-type-adapter';
import { CERTIFICATE_TEMPLATES, generateCertificatePDF, type CertificateData } from '@/lib/certificate-pdf';
import { cn } from '@/lib/utils';

interface AdminProCohortTabProps {
    org: any;
    config: SchoolTypeConfig;
    cls: any[];
    subs: any[];
    students: any[];
    teachers: any[];
    onRefresh: () => void;
    onSelectClass?: (clsId: string) => void;
}

export function AdminProCohortTab({
    org,
    config,
    cls,
    subs,
    students,
    teachers,
    onRefresh,
    onSelectClass
}: AdminProCohortTabProps) {
    const [search, setSearch] = useState('');
    const [filterDuration, setFilterDuration] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [saving, setSaving] = useState(false);

    // Modal & Tiroir d'une Session sélectionnée (Gestion apprenants + modules + certification)
    const [activeSession, setActiveSession] = useState<any | null>(null);
    const [editingSession, setEditingSession] = useState<any | null>(null);

    // Formulaire de création de Session / Formation
    const [sessionTitle, setSessionTitle] = useState('');
    const [sessionDuration, setSessionDuration] = useState('3_months');
    const [sessionDurationLabel, setSessionDurationLabel] = useState('3 Mois (Spécialisation Rapide)');
    const [sessionRhythm, setSessionRhythm] = useState('Cours du Jour (Plein temps)');
    const [sessionCapacity, setSessionCapacity] = useState('25');
    const [sessionModules, setSessionModules] = useState<string[]>(['Module Fondamental', 'Pratique & Atelier', 'Projet Professionnel']);
    const [newModuleInput, setNewModuleInput] = useState('');

    // Module management inside an existing session
    const [inlineModuleName, setInlineModuleName] = useState('');
    const [inlineModuleTeacher, setInlineModuleTeacher] = useState('');
    const [addingInlineModule, setAddingInlineModule] = useState(false);

    // Quick add student directly into the active session
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const [newStudentFN, setNewStudentFN] = useState('');
    const [newStudentLN, setNewStudentLN] = useState('');
    const [newStudentPhone, setNewStudentPhone] = useState('');
    const [newStudentEmail, setNewStudentEmail] = useState('');
    const [creatingStudent, setCreatingStudent] = useState(false);

    // Certificate generation modal for a student
    const [certModalStudent, setCertModalStudent] = useState<any | null>(null);
    const [certMention, setCertMention] = useState('Mention Très Bien');
    const [certSignatory, setCertSignatory] = useState(org?.owner_first_name ? `${org.owner_first_name} ${org.owner_last_name || ''}` : 'La Direction');

    const handleAddModuleToForm = () => {
        if (!newModuleInput.trim()) return;
        setSessionModules([...sessionModules, newModuleInput.trim()]);
        setNewModuleInput('');
    };

    const handleRemoveModuleFromForm = (index: number) => {
        setSessionModules(sessionModules.filter((_, i) => i !== index));
    };

    // ── 1. Création d'une nouvelle session ──
    const handleCreateSession = async () => {
        if (!sessionTitle.trim()) {
            toast.error('Veuillez donner un nom à la session / formation');
            return;
        }

        setSaving(true);
        try {
            const cycleFormatted = `${sessionDurationLabel} • ${sessionRhythm}`;
            const { data: newCls, error: clsError } = await supabase
                .from('classrooms')
                .insert({
                    organization_id: org.id,
                    name: sessionTitle.trim(),
                    cycle: cycleFormatted,
                    level: 1,
                    capacity: parseInt(sessionCapacity) || 30
                })
                .select()
                .single();

            if (clsError) throw clsError;

            if (sessionModules.length > 0 && newCls) {
                const subInserts = sessionModules.map((modName, idx) => ({
                    organization_id: org.id,
                    classroom_id: newCls.id,
                    name: modName,
                    code: `MOD-${idx + 1}`,
                    coefficient: 1
                }));
                await supabase.from('subjects').insert(subInserts);
            }

            toast.success(`🎉 ${config.terms.class} "${sessionTitle}" créée avec succès !`);
            setShowCreateModal(false);
            setSessionTitle('');
            onRefresh();
        } catch (err: any) {
            toast.error('Erreur lors de la création : ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // ── 2. Mise à jour d'une session existante ──
    const handleUpdateSession = async () => {
        if (!editingSession || !editingSession.name.trim()) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('classrooms')
                .update({
                    name: editingSession.name.trim(),
                    cycle: editingSession.cycle,
                    capacity: parseInt(editingSession.capacity) || 30
                })
                .eq('id', editingSession.id);

            if (error) throw error;
            toast.success('Session mise à jour !');
            setEditingSession(null);
            onRefresh();
        } catch (e: any) {
            toast.error('Erreur : ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    // ── 3. Suppression d'une session ──
    const handleDeleteSession = async (id: string, name: string) => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer la session "${name}" ?`)) return;
        try {
            const { error } = await supabase.from('classrooms').delete().eq('id', id);
            if (error) throw error;
            toast.success(`Session "${name}" supprimée.`);
            if (activeSession?.id === id) setActiveSession(null);
            onRefresh();
        } catch (e: any) {
            toast.error('Erreur : ' + e.message);
        }
    };

    // ── 4. Ajout d'un module en direct sur une session existante ──
    const handleAddInlineModule = async (classroomId: string) => {
        if (!inlineModuleName.trim()) {
            toast.error('Nom du module obligatoire');
            return;
        }

        setAddingInlineModule(true);
        try {
            const existingCount = subs.filter(s => s.classroom_id === classroomId).length;
            const { error } = await supabase
                .from('subjects')
                .insert({
                    organization_id: org.id,
                    classroom_id: classroomId,
                    name: inlineModuleName.trim(),
                    code: `MOD-${existingCount + 1}`,
                    coefficient: 1,
                    teacher_id: inlineModuleTeacher || null
                });

            if (error) throw error;
            toast.success(`Module "${inlineModuleName}" ajouté à la session !`);
            setInlineModuleName('');
            setInlineModuleTeacher('');
            onRefresh();
        } catch (e: any) {
            toast.error('Erreur : ' + e.message);
        } finally {
            setAddingInlineModule(false);
        }
    };

    const handleDeleteModule = async (subId: string, name: string) => {
        if (!confirm(`Supprimer le module "${name}" ?`)) return;
        try {
            const { error } = await supabase.from('subjects').delete().eq('id', subId);
            if (error) throw error;
            toast.success('Module supprimé.');
            onRefresh();
        } catch (e: any) {
            toast.error('Erreur : ' + e.message);
        }
    };

    // ── 5. Inscription directe d'un apprenant dans la session ──
    const handleCreateStudentInSession = async (classroomId: string) => {
        if (!newStudentFN.trim() || !newStudentLN.trim()) {
            toast.error('Nom et prénom obligatoires');
            return;
        }

        setCreatingStudent(true);
        try {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code = '';
            for (let i = 0; i < 12; i++) code += chars[Math.floor(Math.random() * chars.length)];
            const mat = `STG${Date.now().toString(36).toUpperCase()}`;

            const { data, error } = await supabase.from('student_profiles').insert({
                organization_id: org.id,
                first_name: newStudentFN.trim(),
                last_name: newStudentLN.trim(),
                classroom_id: classroomId,
                phone: newStudentPhone.trim() || null,
                email: newStudentEmail.trim() || null,
                matricule: mat,
                access_code: code,
                pin_set: false,
                approval_status: 'approved'
            }).select().single();

            if (error) throw error;

            toast.success(`🎉 Stagiaire inscrit avec succès ! Code d'accès : ${code}`, { duration: 6000 });
            setShowAddStudentModal(false);
            setNewStudentFN('');
            setNewStudentLN('');
            setNewStudentPhone('');
            setNewStudentEmail('');
            onRefresh();
        } catch (e: any) {
            toast.error('Erreur : ' + e.message);
        } finally {
            setCreatingStudent(false);
        }
    };

    // ── 6. Génération directe d'Attestation PRO avec Compétences ──
    const handleGenerateCertificate = (student: any, session: any) => {
        try {
            // Récupérer les modules de cette session
            const sessionSubs = subs.filter(s => s.classroom_id === session?.id);
            const modulesList = sessionSubs.length > 0
                ? sessionSubs.map(s => ({
                    name: s.name,
                    hours: s.coefficient ? s.coefficient * 30 : 40,
                    status: 'Validé'
                }))
                : [
                    { name: 'Fondamentaux & Pratique Métier', hours: 80, status: 'Validé' },
                    { name: 'Atelier Pratique & Études de Cas', hours: 120, status: 'Validé' },
                    { name: 'Projet Professionnel & Soutenance', hours: 160, status: 'Validé' }
                ];

            const certData: CertificateData = {
                org: {
                    name: org?.name || 'Centre de Formation Professionnelle',
                    logo_url: org?.logo_url,
                    signature_url: org?.signature_url,
                    stamp_url: org?.stamp_url,
                    phone: org?.phone,
                    email: org?.email,
                    city: org?.city || 'Yaoundé',
                    country: org?.country || 'Cameroun',
                    accreditation_number: org?.pro_accreditation_number || undefined
                },
                student: {
                    first_name: student.first_name,
                    last_name: student.last_name,
                    matricule: student.matricule,
                    classroom_name: session?.name,
                    filiere_name: session?.name,
                    training_duration: session?.cycle || '3 Mois (Formation Professionnelle)',
                    rhythm: session?.rhythm || 'Présentiel & Pratique'
                },
                certificate: {
                    title: 'ATTESTATION DE FIN DE FORMATION PROFESSIONNELLE',
                    subtitle: 'CERTIFICAT DE COMPÉTENCES MÉTIER',
                    course_name: session?.name || 'Formation Professionnelle Spécialisée',
                    mention: certMention,
                    date_issued: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
                    location: org?.city || 'Yaoundé',
                    signatory1_title: 'Le Directeur du Centre',
                    signatory1_name: certSignatory || org?.default_signatory_name || 'La Direction Pédagogique',
                    show_stamp: true,
                    show_signature: true,
                    modules: modulesList
                }
            };

            generateCertificatePDF(certData, 5); // Template 5 PRO par défaut pour les centres de formation
            toast.success(`🎓 Attestation officielle PRO générée pour ${student.first_name} ${student.last_name} !`);
            setCertModalStudent(null);
        } catch (e: any) {
            toast.error('Erreur génération attestation : ' + e.message);
        }
    };

    // Filtrage des sessions
    const filteredSessions = (cls || []).filter(c => {
        const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase()) || c.cycle?.toLowerCase().includes(search.toLowerCase());
        if (filterDuration === 'all') return matchesSearch;
        return matchesSearch && c.cycle?.toLowerCase().includes(filterDuration.toLowerCase());
    });

    return (
        <div className="space-y-6">
            {/* Header & Statistiques Pro */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900/80 to-teal-950/30 border border-emerald-500/20 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black uppercase tracking-wider mb-2">
                            <span>🏢 {config.categoryLabel}</span>
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight">
                            Gestion des {config.terms.classes}
                        </h2>
                        <p className="text-sm text-slate-400 mt-1 max-w-xl">
                            Pilotez vos filières professionnelles, vos promotions en cours (1 mois, 3 mois, 6 mois, 1 an), vos modules pratiques et délivrez les attestations officielles en 1 clic.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-sm shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 shrink-0"
                    >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>Créer une {config.terms.class}</span>
                    </button>
                </div>

                {/* Métriques Clés */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/[0.08]">
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                        <span className="text-[11px] text-slate-400 font-semibold block">{config.terms.classes} Actives</span>
                        <span className="text-2xl font-black text-emerald-400">{cls.length}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                        <span className="text-[11px] text-slate-400 font-semibold block">{config.terms.students} Inscrits</span>
                        <span className="text-2xl font-black text-white">{students.length}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                        <span className="text-[11px] text-slate-400 font-semibold block">{config.terms.subjects} Totaux</span>
                        <span className="text-2xl font-black text-teal-300">{subs.length}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                        <span className="text-[11px] text-slate-400 font-semibold block">{config.terms.teachers}</span>
                        <span className="text-2xl font-black text-amber-400">{teachers.length}</span>
                    </div>
                </div>
            </div>

            {/* Barre de Recherche & Filtres de Durée */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={`Rechercher une ${config.terms.class.toLowerCase()}...`}
                        className="pl-9 bg-white/[0.04] border-white/10 text-white rounded-2xl h-11 text-sm placeholder:text-slate-500 focus:border-emerald-500/40"
                    />
                </div>

                {/* Filtre Durées */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    <button
                        onClick={() => setFilterDuration('all')}
                        className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
                            filterDuration === 'all'
                                ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                                : "bg-white/5 text-slate-400 hover:text-white"
                        )}
                    >
                        Toutes
                    </button>
                    {config.durationOptions.slice(0, 4).map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => setFilterDuration(opt.label.split(' ')[0])}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
                                filterDuration === opt.label.split(' ')[0]
                                    ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                                    : "bg-white/5 text-slate-400 hover:text-white"
                            )}
                        >
                            {opt.label.split(' ')[0]} {opt.label.split(' ')[1]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Liste des Cartes de Sessions / Formations */}
            {filteredSessions.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-white/[0.02] border border-dashed border-white/10 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-2xl">
                        🏢
                    </div>
                    <div>
                        <h4 className="text-base font-black text-white">Aucune {config.terms.class.toLowerCase()} trouvée</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            Commencez par créer votre première promotion de formation (ex: Développeur Web 3 mois, Marketing Digital 6 mois).
                        </p>
                    </div>
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl text-xs"
                    >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Créer une {config.terms.class}
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSessions.map(session => {
                        const sessionStudents = (students || []).filter(s => s.classroom_id === session.id);
                        const sessionModulesList = (subs || []).filter(s => s.classroom_id === session.id);
                        const capacity = session.capacity || 30;
                        const fillPercent = Math.min(100, Math.round((sessionStudents.length / capacity) * 100));

                        return (
                            <motion.div
                                key={session.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="group relative rounded-3xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.08] hover:border-emerald-500/40 p-5 transition-all duration-300 shadow-lg hover:shadow-emerald-500/5 flex flex-col justify-between"
                            >
                                <div className="space-y-3">
                                    {/* Top badge & actions */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                                                <Briefcase className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-white text-base leading-tight group-hover:text-emerald-300 transition-colors">
                                                    {session.name}
                                                </h3>
                                                <span className="text-[11px] text-emerald-400/90 font-medium">
                                                    {session.cycle || 'Formation Professionnelle'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setEditingSession({ ...session })}
                                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                                                title="Modifier la session"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSession(session.id, session.name)}
                                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                                                title="Supprimer la session"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Jauge de Remplissage / Effectif */}
                                    <div className="p-3 rounded-2xl bg-black/30 border border-white/[0.04] space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-400 font-medium flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5 text-slate-500" />
                                                {config.terms.students} ({sessionStudents.length})
                                            </span>
                                            <span className="font-black text-white">
                                                {fillPercent}% <span className="text-slate-500 text-[10px]">/ {capacity} max</span>
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-500",
                                                    fillPercent >= 90 ? "bg-amber-400" : "bg-emerald-400"
                                                )}
                                                style={{ width: `${fillPercent}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Modules de la session */}
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                                            {config.terms.subjects} ({sessionModulesList.length})
                                        </span>
                                        {sessionModulesList.length === 0 ? (
                                            <p className="text-[11px] text-slate-600 italic">Aucun module rattaché pour l'instant</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-1.5">
                                                {sessionModulesList.slice(0, 3).map(mod => (
                                                    <span
                                                        key={mod.id}
                                                        className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-slate-300 font-medium truncate max-w-[140px]"
                                                    >
                                                        {mod.name}
                                                    </span>
                                                ))}
                                                {sessionModulesList.length > 3 && (
                                                    <span className="px-1.5 py-0.5 rounded-lg bg-emerald-500/10 text-[10px] text-emerald-400 font-bold">
                                                        +{sessionModulesList.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Bouton vers la gestion complète de la session */}
                                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                                    <button
                                        onClick={() => setActiveSession(session)}
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
                                    >
                                        <Users className="w-3.5 h-3.5" />
                                        <span>Gérer la promo & Attestations</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* ═══ MODAL / TIROIR : GESTION COMPLÈTE DE LA SESSION (Apprenants + Modules + Attestations) ═══ */}
            <AnimatePresence>
                {activeSession && (
                    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            className="w-full max-w-4xl bg-[#0C101D] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto"
                        >
                            {/* Header modal session */}
                            <div className="flex items-start justify-between border-b border-white/10 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl text-emerald-400">
                                        🏢
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white">{activeSession.name}</h3>
                                        <p className="text-xs text-emerald-400 font-medium">{activeSession.cycle || 'Formation Professionnelle'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setActiveSession(null)}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Section 1 : Modules de la formation */}
                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-emerald-400" />
                                        <span>Modules & Compétences Métier</span>
                                    </h4>
                                    <span className="text-xs text-slate-400">
                                        {subs.filter(s => s.classroom_id === activeSession.id).length} module(s) rattaché(s)
                                    </span>
                                </div>

                                {/* Liste des modules */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {subs.filter(s => s.classroom_id === activeSession.id).map(mod => {
                                        const teacher = teachers.find(t => t.id === mod.teacher_id);
                                        return (
                                            <div
                                                key={mod.id}
                                                className="p-3 rounded-xl bg-black/30 border border-white/[0.06] flex items-center justify-between gap-2"
                                            >
                                                <div>
                                                    <p className="font-bold text-xs text-white">{mod.name}</p>
                                                    <p className="text-[10px] text-slate-400">
                                                        {teacher ? `Formateur : ${teacher.first_name} ${teacher.last_name}` : 'Aucun formateur assigné'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteModule(mod.id, mod.name)}
                                                    className="p-1 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Ajout rapide de module */}
                                <div className="flex gap-2 pt-2">
                                    <Input
                                        value={inlineModuleName}
                                        onChange={e => setInlineModuleName(e.target.value)}
                                        placeholder="Nouveau module (ex: Atelier Pratique Frontend)..."
                                        className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs"
                                    />
                                    <select
                                        value={inlineModuleTeacher}
                                        onChange={e => setInlineModuleTeacher(e.target.value)}
                                        className="h-9 rounded-xl bg-slate-900 border border-white/10 text-white px-2 text-xs"
                                    >
                                        <option value="">Formateur...</option>
                                        {teachers.map(t => (
                                            <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                                        ))}
                                    </select>
                                    <Button
                                        onClick={() => handleAddInlineModule(activeSession.id)}
                                        disabled={addingInlineModule}
                                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs h-9 px-4 rounded-xl shrink-0"
                                    >
                                        Ajouter module
                                    </Button>
                                </div>
                            </div>

                            {/* Section 2 : Apprenants & Stagiaires de la Promotion */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                                        <Users className="w-4 h-4 text-teal-400" />
                                        <span>Stagiaires & Apprenants Inscrits ({students.filter(s => s.classroom_id === activeSession.id).length})</span>
                                    </h4>
                                    <Button
                                        onClick={() => setShowAddStudentModal(true)}
                                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl h-8 px-3"
                                    >
                                        <UserPlus className="w-3.5 h-3.5 mr-1" />
                                        Inscrire un stagiaire
                                    </Button>
                                </div>

                                {students.filter(s => s.classroom_id === activeSession.id).length === 0 ? (
                                    <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-dashed border-white/10 space-y-2">
                                        <p className="text-xs text-slate-400">Aucun stagiaire inscrit dans cette session pour l'instant.</p>
                                        <Button
                                            onClick={() => setShowAddStudentModal(true)}
                                            className="bg-white/10 hover:bg-white/20 text-white text-xs rounded-xl"
                                        >
                                            Inscrire le premier stagiaire
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                        {students.filter(s => s.classroom_id === activeSession.id).map(st => (
                                            <div
                                                key={st.id}
                                                className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/30 transition-all flex items-center justify-between gap-3"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center font-bold text-emerald-300 text-xs">
                                                        {st.first_name[0]}{st.last_name[0]}
                                                    </div>
                                                    <div>
                                                        <h5 className="font-bold text-xs text-white leading-tight">
                                                            {st.first_name} {st.last_name}
                                                        </h5>
                                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                                            <span>Matricule: {st.matricule || 'STG-001'}</span>
                                                            {st.phone && <span>• Tél: {st.phone}</span>}
                                                            {st.email && <span>• Email: {st.email}</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {st.phone && (
                                                        <a
                                                            href={`https://wa.me/${st.phone.replace(/[^0-9]/g, '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1 transition"
                                                            title="WhatsApp"
                                                        >
                                                            <Phone className="w-3.5 h-3.5" />
                                                        </a>
                                                    )}
                                                    <Button
                                                        onClick={() => setCertModalStudent(st)}
                                                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl h-8 px-3 shadow-md shadow-emerald-500/20"
                                                    >
                                                        <Award className="w-3.5 h-3.5 mr-1" />
                                                        Délivrer Attestation PRO
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══ MODAL : Inscription directe d'un Stagiaire dans la Session ═══ */}
            <AnimatePresence>
                {showAddStudentModal && activeSession && (
                    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-[#0E131F] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <h3 className="text-base font-black text-white">
                                    Inscrire un Stagiaire dans {activeSession.name}
                                </h3>
                                <button onClick={() => setShowAddStudentModal(false)} className="text-slate-400 hover:text-white">✕</button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1">Prénom <span className="text-red-400">*</span></label>
                                    <Input
                                        value={newStudentFN}
                                        onChange={e => setNewStudentFN(e.target.value)}
                                        placeholder="Jean"
                                        className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1">Nom <span className="text-red-400">*</span></label>
                                    <Input
                                        value={newStudentLN}
                                        onChange={e => setNewStudentLN(e.target.value)}
                                        placeholder="Dupont"
                                        className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-1">Téléphone / WhatsApp</label>
                                <Input
                                    value={newStudentPhone}
                                    onChange={e => setNewStudentPhone(e.target.value)}
                                    placeholder="+237 6..."
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-1">Email</label>
                                <Input
                                    value={newStudentEmail}
                                    onChange={e => setNewStudentEmail(e.target.value)}
                                    placeholder="jean.dupont@email.com"
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs"
                                />
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-white/10">
                                <Button
                                    onClick={() => setShowAddStudentModal(false)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 text-xs rounded-xl"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    onClick={() => handleCreateStudentInSession(activeSession.id)}
                                    disabled={creatingStudent}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl"
                                >
                                    {creatingStudent ? 'Inscription...' : 'Valider l\'inscription'}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══ MODAL : Génération Rapide d'Attestation PRO pour un Stagiaire ═══ */}
            <AnimatePresence>
                {certModalStudent && activeSession && (
                    <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-[#0E131F] border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <div className="flex items-center gap-2">
                                    <Award className="w-5 h-5 text-emerald-400" />
                                    <h3 className="text-base font-black text-white">Délivrer Attestation Professionnelle</h3>
                                </div>
                                <button onClick={() => setCertModalStudent(null)} className="text-slate-400 hover:text-white">✕</button>
                            </div>

                            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                                <p className="text-xs text-slate-300 font-semibold">Stagiaire :</p>
                                <p className="text-sm font-black text-white">{certModalStudent.first_name} {certModalStudent.last_name}</p>
                                <p className="text-[11px] text-emerald-400 font-medium">Formation : {activeSession.name}</p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-1">Mention sur l'attestation</label>
                                <select
                                    value={certMention}
                                    onChange={e => setCertMention(e.target.value)}
                                    className="w-full h-9 rounded-xl bg-slate-900 border border-white/10 text-white px-3 text-xs"
                                >
                                    <option value="Mention Très Bien">Mention Très Bien</option>
                                    <option value="Mention Bien">Mention Bien</option>
                                    <option value="Mention Assez Bien">Mention Assez Bien</option>
                                    <option value="Mention Félicitations du Jury">Mention Félicitations du Jury</option>
                                    <option value="Sans mention">Sans mention</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-1">Nom du Signataire (Direction)</label>
                                <Input
                                    value={certSignatory}
                                    onChange={e => setCertSignatory(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs"
                                />
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-white/10">
                                <Button
                                    onClick={() => setCertModalStudent(null)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 text-xs rounded-xl"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    onClick={() => handleGenerateCertificate(certModalStudent, activeSession)}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20"
                                >
                                    <Download className="w-3.5 h-3.5 mr-1" />
                                    Télécharger le PDF
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══ MODAL : Création d'une Session Professionnelle ═══ */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-lg bg-[#0E131F] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <div>
                                    <h3 className="text-base font-black text-white">
                                        Créer une nouvelle {config.terms.class}
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        Configurez la filière, la durée (1 mois, 3 mois, 6 mois, 1 an) et les modules pratiques.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Intitulé */}
                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-1">
                                    Intitulé de la formation / session <span className="text-red-400">*</span>
                                </label>
                                <Input
                                    value={sessionTitle}
                                    onChange={e => setSessionTitle(e.target.value)}
                                    placeholder="Ex: Développeur Web Fullstack — Promo Mars 2026"
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-sm placeholder:text-slate-600"
                                />
                            </div>

                            {/* Durée de la formation */}
                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-1">
                                    Durée de la formation <span className="text-red-400">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {config.durationOptions.map(dur => (
                                        <button
                                            key={dur.id}
                                            type="button"
                                            onClick={() => {
                                                setSessionDuration(dur.id);
                                                setSessionDurationLabel(dur.label);
                                            }}
                                            className={cn(
                                                "p-2.5 rounded-xl border text-left text-xs font-semibold transition-all",
                                                sessionDuration === dur.id
                                                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                                                    : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
                                            )}
                                        >
                                            {dur.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Rythme & Capacité */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1">
                                        Rythme des cours
                                    </label>
                                    <select
                                        value={sessionRhythm}
                                        onChange={e => setSessionRhythm(e.target.value)}
                                        className="w-full h-10 rounded-xl bg-slate-900 border border-white/10 text-white px-3 text-xs"
                                    >
                                        {config.rhythms.map((r, i) => (
                                            <option key={i} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1">
                                        Nombre max de stagiaires
                                    </label>
                                    <Input
                                        type="number"
                                        value={sessionCapacity}
                                        onChange={e => setSessionCapacity(e.target.value)}
                                        className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Modules de compétences */}
                            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                                <label className="text-xs font-bold text-slate-300 block">
                                    Modules & Compétences du programme ({sessionModules.length})
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        value={newModuleInput}
                                        onChange={e => setNewModuleInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddModuleToForm())}
                                        placeholder="Ex: Module 1 : Bases & Algorithmique"
                                        className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs placeholder:text-slate-600"
                                    />
                                    <Button
                                        type="button"
                                        onClick={handleAddModuleToForm}
                                        className="bg-white/10 hover:bg-white/20 text-white text-xs h-9 px-3 rounded-xl"
                                    >
                                        Ajouter
                                    </Button>
                                </div>

                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                    {sessionModules.map((mod, i) => (
                                        <span
                                            key={i}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium"
                                        >
                                            <span>{mod}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveModuleFromForm(i)}
                                                className="text-emerald-400/60 hover:text-red-400 text-xs"
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Boutons d'actions */}
                            <div className="flex gap-3 pt-3 border-t border-white/10">
                                <Button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs h-10"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleCreateSession}
                                    disabled={saving}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl text-xs h-10"
                                >
                                    {saving ? 'Création...' : 'Valider & Créer'}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══ MODAL : Modification d'une Session existante ═══ */}
            <AnimatePresence>
                {editingSession && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-[#0E131F] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <h3 className="text-base font-black text-white">
                                    Modifier la Session
                                </h3>
                                <button onClick={() => setEditingSession(null)} className="text-slate-400 hover:text-white">✕</button>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-1">Nom de la session</label>
                                <Input
                                    value={editingSession.name}
                                    onChange={e => setEditingSession({ ...editingSession, name: e.target.value })}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-sm"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-1">Durée & Rythme</label>
                                <Input
                                    value={editingSession.cycle}
                                    onChange={e => setEditingSession({ ...editingSession, cycle: e.target.value })}
                                    placeholder="Ex: 6 Mois • Cours du Soir"
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-1">Capacité maximale</label>
                                <Input
                                    type="number"
                                    value={editingSession.capacity}
                                    onChange={e => setEditingSession({ ...editingSession, capacity: e.target.value })}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs"
                                />
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-white/10">
                                <Button
                                    onClick={() => setEditingSession(null)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 text-xs rounded-xl"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    onClick={handleUpdateSession}
                                    disabled={saving}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl"
                                >
                                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
