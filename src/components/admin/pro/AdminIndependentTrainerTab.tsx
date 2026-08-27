'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UserCheck, Award, Sparkles, Plus, Copy,
    ExternalLink, CheckCircle2, DollarSign, Calendar,
    BookOpen, Users, Share2, ShieldCheck, Video,
    MessageSquare, Phone, Mail, Edit3, Trash2,
    Download, UserPlus, Layers, Check, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { SchoolTypeConfig } from '@/lib/school-type-adapter';
import { generateCertificatePDF, type CertificateData } from '@/lib/certificate-pdf';
import { cn } from '@/lib/utils';

interface AdminIndependentTrainerTabProps {
    org: any;
    config: SchoolTypeConfig;
    cls: any[];
    students: any[];
    subs: any[];
    onRefresh: () => void;
}

export function AdminIndependentTrainerTab({
    org,
    config,
    cls,
    students,
    subs,
    onRefresh
}: AdminIndependentTrainerTabProps) {
    const [trainerName, setTrainerName] = useState(org.name || '');
    const [trainerHeadline, setTrainerHeadline] = useState(org.slogan || 'Formateur Expert & Consultant');
    const [trainerBio, setTrainerBio] = useState(org.description || '');
    const [trainerPhone, setTrainerPhone] = useState(org.phone || '');
    const [trainerEmail, setTrainerEmail] = useState(org.email || '');
    const [savingProfile, setSavingProfile] = useState(false);

    // Modal offre de formation rapide (Création)
    const [showAddOffer, setShowAddOffer] = useState(false);
    const [offerTitle, setOfferTitle] = useState('');
    const [offerFormat, setOfferFormat] = useState('Bootcamp 1 Mois (Live + Suivi)');
    const [offerPrice, setOfferPrice] = useState('50 000 FCFA');
    const [creatingOffer, setCreatingOffer] = useState(false);

    // Modal édition d'offre existante
    const [editingOffer, setEditingOffer] = useState<any | null>(null);
    const [savingEditOffer, setSavingEditOffer] = useState(false);

    // Tiroir des apprenants d'une offre
    const [selectedOfferForStudents, setSelectedOfferForStudents] = useState<any | null>(null);

    // Inscription directe d'un apprenant
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [newApprenantFN, setNewApprenantFN] = useState('');
    const [newApprenantLN, setNewApprenantLN] = useState('');
    const [newApprenantPhone, setNewApprenantPhone] = useState('');
    const [newApprenantEmail, setNewApprenantEmail] = useState('');
    const [enrolling, setEnrolling] = useState(false);

    // Délivrance d'attestation formateur solo
    const [certModalStudent, setCertModalStudent] = useState<any | null>(null);
    const [certMention, setCertMention] = useState('Mention Très Bien');

    // ── 1. Sauvegarde du profil formateur ──
    const handleSaveProfile = async () => {
        setSavingProfile(true);
        try {
            const { error } = await supabase
                .from('organizations')
                .update({
                    slogan: trainerHeadline,
                    description: trainerBio,
                    phone: trainerPhone,
                    email: trainerEmail
                })
                .eq('id', org.id);

            if (error) throw error;
            toast.success('✅ Profil du Formateur mis à jour avec succès !');
            onRefresh();
        } catch (e: any) {
            toast.error('Erreur : ' + e.message);
        } finally {
            setSavingProfile(false);
        }
    };

    // ── 2. Création d'une nouvelle offre ──
    const handleCreateOffer = async () => {
        if (!offerTitle.trim()) {
            toast.error('Veuillez renseigner le nom de la formation / offre');
            return;
        }

        setCreatingOffer(true);
        try {
            const { error } = await supabase
                .from('classrooms')
                .insert({
                    organization_id: org.id,
                    name: offerTitle.trim(),
                    cycle: `${offerFormat} • ${offerPrice}`,
                    level: 1,
                    capacity: 50
                });

            if (error) throw error;
            toast.success(`🎉 Offre "${offerTitle}" créée avec succès !`);
            setShowAddOffer(false);
            setOfferTitle('');
            onRefresh();
        } catch (e: any) {
            toast.error('Erreur : ' + e.message);
        } finally {
            setCreatingOffer(false);
        }
    };

    // ── 3. Mise à jour d'une offre existante ──
    const handleUpdateOffer = async () => {
        if (!editingOffer || !editingOffer.name.trim()) return;
        setSavingEditOffer(true);
        try {
            const { error } = await supabase
                .from('classrooms')
                .update({
                    name: editingOffer.name.trim(),
                    cycle: editingOffer.cycle
                })
                .eq('id', editingOffer.id);

            if (error) throw error;
            toast.success('Offre de formation mise à jour !');
            setEditingOffer(null);
            onRefresh();
        } catch (e: any) {
            toast.error('Erreur : ' + e.message);
        } finally {
            setSavingEditOffer(false);
        }
    };

    // ── 4. Suppression d'une offre ──
    const handleDeleteOffer = async (id: string, name: string) => {
        if (!confirm(`Supprimer l'offre "${name}" ?`)) return;
        try {
            const { error } = await supabase.from('classrooms').delete().eq('id', id);
            if (error) throw error;
            toast.success('Offre supprimée.');
            if (selectedOfferForStudents?.id === id) setSelectedOfferForStudents(null);
            onRefresh();
        } catch (e: any) {
            toast.error('Erreur : ' + e.message);
        }
    };

    // ── 5. Inscription directe d'un apprenant ──
    const handleEnrollStudent = async (offerId: string) => {
        if (!newApprenantFN.trim() || !newApprenantLN.trim()) {
            toast.error('Prénom et nom obligatoires');
            return;
        }

        setEnrolling(true);
        try {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code = '';
            for (let i = 0; i < 12; i++) code += chars[Math.floor(Math.random() * chars.length)];
            const mat = `APP${Date.now().toString(36).toUpperCase()}`;

            const { data, error } = await supabase.from('student_profiles').insert({
                organization_id: org.id,
                first_name: newApprenantFN.trim(),
                last_name: newApprenantLN.trim(),
                classroom_id: offerId,
                phone: newApprenantPhone.trim() || null,
                email: newApprenantEmail.trim() || null,
                matricule: mat,
                access_code: code,
                pin_set: false,
                approval_status: 'approved'
            }).select().single();

            if (error) throw error;

            toast.success(`🎉 Apprenant inscrit ! Code d'accès : ${code}`, { duration: 6000 });
            setShowEnrollModal(false);
            setNewApprenantFN('');
            setNewApprenantLN('');
            setNewApprenantPhone('');
            setNewApprenantEmail('');
            onRefresh();
        } catch (e: any) {
            toast.error('Erreur : ' + e.message);
        } finally {
            setEnrolling(false);
        }
    };

    // ── 6. Délivrance de l'attestation signée par le formateur ──
    const handleGenerateTrainerCertificate = (student: any, offer: any) => {
        try {
            const certData: CertificateData = {
                org: {
                    name: org?.name || 'Formateur Expert & Consultant',
                    logo_url: org?.logo_url,
                    signature_url: org?.signature_url,
                    stamp_url: org?.stamp_url,
                    phone: org?.phone || trainerPhone,
                    email: org?.email || trainerEmail,
                    city: org?.city || 'En Ligne / Présentiel',
                    country: org?.country || ''
                },
                student: {
                    first_name: student.first_name,
                    last_name: student.last_name,
                    matricule: student.matricule,
                    classroom_name: offer?.name,
                    filiere_name: offer?.name,
                    training_duration: offer?.cycle || 'Formation Intensive & Pratique',
                    rhythm: 'Coaching & Ateliers Pratiques'
                },
                certificate: {
                    title: 'ATTESTATION DE FORMATION PROFESSIONNELLE',
                    subtitle: 'DÉLIVRÉE PAR LE FORMATEUR EXPERT',
                    course_name: offer?.name || 'Formation & Accompagnement',
                    mention: certMention,
                    date_issued: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
                    location: org?.city || 'En Ligne',
                    signatory1_title: 'Le Formateur Expert',
                    signatory1_name: org?.name || 'Formateur Référent',
                    show_stamp: true,
                    show_signature: true,
                    modules: [
                        { name: 'Maîtrise Opérationnelle & Pratique', hours: 40, status: 'Validé' },
                        { name: 'Mise en situation & Étude de Cas Réelle', hours: 60, status: 'Validé' },
                        { name: 'Projet d\'application et Validation Finale', hours: 60, status: 'Acquis' }
                    ]
                }
            };

            generateCertificatePDF(certData, 5); // Template 5 PRO spécialisé
            toast.success(`🎓 Attestation officielle délivrée pour ${student.first_name} ${student.last_name} !`);
            setCertModalStudent(null);
        } catch (e: any) {
            toast.error('Erreur génération attestation : ' + e.message);
        }
    };

    const handleCopyEnrollLink = (className?: string) => {
        const url = `${window.location.origin}/${org.slug}/inscription`;
        navigator.clipboard.writeText(url);
        toast.success('🔗 Lien d\'inscription directe copié dans le presse-papier !');
    };

    return (
        <div className="space-y-6">
            {/* Header Formateur Solo */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-orange-950/30 border border-amber-500/25 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-3xl shadow-xl shadow-amber-500/20 text-white shrink-0">
                            🧑‍🏫
                        </div>
                        <div>
                            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider mb-1">
                                <span>Formateur Indépendant & Expert Solo</span>
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight">
                                {org.name}
                            </h2>
                            <p className="text-xs text-amber-200/80 font-medium">
                                {trainerHeadline || 'Formateur Expert & Consultant'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => handleCopyEnrollLink()}
                            className="bg-white/10 hover:bg-white/15 text-white font-bold rounded-2xl text-xs h-11 border border-white/10"
                        >
                            <Share2 className="w-3.5 h-3.5 mr-1.5" />
                            Partager le lien d'inscription
                        </Button>
                        <Button
                            onClick={() => setShowAddOffer(true)}
                            className="bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 text-black font-black rounded-2xl text-xs h-11 shadow-lg shadow-amber-500/20"
                        >
                            <Plus className="w-4 h-4 mr-1 stroke-[3]" />
                            Nouvelle Offre / Formation
                        </Button>
                    </div>
                </div>

                {/* Chiffres clés */}
                <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/[0.08]">
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                        <span className="text-[11px] text-slate-400 font-semibold block">Formations / Offres</span>
                        <span className="text-2xl font-black text-amber-400">{cls.length}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                        <span className="text-[11px] text-slate-400 font-semibold block">Apprenants Suivis</span>
                        <span className="text-2xl font-black text-white">{students.length}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                        <span className="text-[11px] text-slate-400 font-semibold block">Attestations Signées</span>
                        <span className="text-2xl font-black text-emerald-400">100% Vérifié</span>
                    </div>
                </div>
            </div>

            {/* Grille : Mes Offres de Formation + Profil Expert */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 2 Colonnes : Liste des Formations Actives */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-black text-white flex items-center gap-2">
                            <span>📚 Mes Offres & Formations ({cls.length})</span>
                        </h3>
                        <span className="text-xs text-slate-400">
                            Gérez vos offres et vos apprenants
                        </span>
                    </div>

                    {cls.length === 0 ? (
                        <div className="p-8 text-center rounded-3xl bg-white/[0.02] border border-dashed border-white/10 space-y-3">
                            <div className="text-3xl">🚀</div>
                            <h4 className="text-sm font-bold text-white">Aucune offre de formation créée</h4>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                Créez votre première offre de formation (ex: Bootcamp React 1 Mois, Formation Pratique Comptabilité 3 Mois).
                            </p>
                            <Button
                                onClick={() => setShowAddOffer(true)}
                                className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Créer une formation
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {cls.map(item => {
                                const enrolled = students.filter(s => s.classroom_id === item.id);
                                return (
                                    <div
                                        key={item.id}
                                        className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-amber-500/40 transition-all space-y-3 flex flex-col justify-between group"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2">
                                                <h4 className="font-black text-sm text-white leading-snug">
                                                    {item.name}
                                                </h4>
                                                <div className="flex items-center gap-1">
                                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-bold shrink-0">
                                                        {enrolled.length} inscrit{enrolled.length > 1 ? 's' : ''}
                                                    </span>
                                                    <button
                                                        onClick={() => setEditingOffer({ ...item })}
                                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                                                        title="Modifier l'offre"
                                                    >
                                                        <Edit3 className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteOffer(item.id, item.name)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                                                        title="Supprimer l'offre"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {item.cycle || 'Formation & Accompagnement'}
                                            </p>
                                        </div>

                                        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                                            <button
                                                onClick={() => setSelectedOfferForStudents(item)}
                                                className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 text-[11px]"
                                            >
                                                <Users className="w-3 h-3" />
                                                Voir les {enrolled.length} apprenant{enrolled.length > 1 ? 's' : ''}
                                            </button>
                                            <button
                                                onClick={() => handleCopyEnrollLink(item.name)}
                                                className="text-slate-400 hover:text-white font-semibold flex items-center gap-1 text-[10px]"
                                            >
                                                <Copy className="w-2.5 h-2.5" />
                                                Lien inscription
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 1 Colonne : Carte Profil Formateur Expert */}
                <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-4 h-fit">
                    <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                        <UserCheck className="w-4 h-4 text-amber-400" />
                        <h4 className="text-sm font-black text-white">Mon Profil Formateur Expert</h4>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1">Titre / Spécialité</label>
                        <Input
                            value={trainerHeadline}
                            onChange={e => setTrainerHeadline(e.target.value)}
                            placeholder="Ex: Formateur Certifié & Consultant Web"
                            className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1">Bio / Présentation</label>
                        <textarea
                            value={trainerBio}
                            onChange={e => setTrainerBio(e.target.value)}
                            rows={3}
                            placeholder="Présentez votre expertise, vos années d'expérience et votre méthodologie..."
                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-amber-500/40 resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs font-bold text-slate-400 block mb-1">WhatsApp / Tél</label>
                            <Input
                                value={trainerPhone}
                                onChange={e => setTrainerPhone(e.target.value)}
                                placeholder="+237 ..."
                                className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 block mb-1">Email Pro</label>
                            <Input
                                value={trainerEmail}
                                onChange={e => setTrainerEmail(e.target.value)}
                                placeholder="contact@..."
                                className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs"
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xs h-9"
                    >
                        {savingProfile ? 'Enregistrement...' : 'Mettre à jour mon profil'}
                    </Button>
                </div>
            </div>

            {/* ═══ TIROIR / MODAL : APPRENANTS DE L'OFFRE SÉLECTIONNÉE ═══ */}
            <AnimatePresence>
                {selectedOfferForStudents && (
                    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            className="w-full max-w-2xl bg-[#0E131F] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <div>
                                    <h3 className="text-base font-black text-white flex items-center gap-2">
                                        <span>🧑‍🎓 Apprenants inscrits : {selectedOfferForStudents.name}</span>
                                    </h3>
                                    <p className="text-xs text-amber-300 font-medium">
                                        {selectedOfferForStudents.cycle}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedOfferForStudents(null)} className="text-slate-400 hover:text-white">✕</button>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400">
                                    {students.filter(s => s.classroom_id === selectedOfferForStudents.id).length} apprenant(s)
                                </span>
                                <Button
                                    onClick={() => setShowEnrollModal(true)}
                                    className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl h-8 px-3"
                                >
                                    <UserPlus className="w-3.5 h-3.5 mr-1" />
                                    Inscrire un apprenant
                                </Button>
                            </div>

                            {students.filter(s => s.classroom_id === selectedOfferForStudents.id).length === 0 ? (
                                <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-dashed border-white/10 space-y-2">
                                    <p className="text-xs text-slate-400">Aucun apprenant inscrit à cette offre pour le moment.</p>
                                    <Button
                                        onClick={() => setShowEnrollModal(true)}
                                        className="bg-white/10 hover:bg-white/20 text-white text-xs rounded-xl"
                                    >
                                        Inscrire un premier apprenant
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                    {students.filter(s => s.classroom_id === selectedOfferForStudents.id).map(st => (
                                        <div
                                            key={st.id}
                                            className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-amber-500/30 transition-all flex items-center justify-between gap-3"
                                        >
                                            <div>
                                                <h5 className="font-bold text-xs text-white">
                                                    {st.first_name} {st.last_name}
                                                </h5>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                                    <span>Code : {st.access_code || 'APP-001'}</span>
                                                    {st.phone && <span>• Tél : {st.phone}</span>}
                                                    {st.email && <span>• Email : {st.email}</span>}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {st.phone && (
                                                    <a
                                                        href={`https://wa.me/${st.phone.replace(/[^0-9]/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1 transition"
                                                        title="Envoyer message WhatsApp"
                                                    >
                                                        <Phone className="w-3.5 h-3.5" />
                                                    </a>
                                                )}
                                                <Button
                                                    onClick={() => setCertModalStudent(st)}
                                                    className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl h-8 px-3 shadow-md shadow-amber-500/20"
                                                >
                                                    <Award className="w-3.5 h-3.5 mr-1" />
                                                    Délivrer Attestation
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══ MODAL : INSCRIPTION DIRECTE ═══ */}
            <AnimatePresence>
                {showEnrollModal && selectedOfferForStudents && (
                    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-[#0E131F] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <h3 className="text-base font-black text-white">
                                    Inscrire un Apprenant dans {selectedOfferForStudents.name}
                                </h3>
                                <button onClick={() => setShowEnrollModal(false)} className="text-slate-400 hover:text-white">✕</button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1">Prénom <span className="text-red-400">*</span></label>
                                    <Input
                                        value={newApprenantFN}
                                        onChange={e => setNewApprenantFN(e.target.value)}
                                        placeholder="Paul"
                                        className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1">Nom <span className="text-red-400">*</span></label>
                                    <Input
                                        value={newApprenantLN}
                                        onChange={e => setNewApprenantLN(e.target.value)}
                                        placeholder="Kouam"
                                        className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-1">Téléphone / WhatsApp</label>
                                <Input
                                    value={newApprenantPhone}
                                    onChange={e => setNewApprenantPhone(e.target.value)}
                                    placeholder="+237 6..."
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-1">Email</label>
                                <Input
                                    value={newApprenantEmail}
                                    onChange={e => setNewApprenantEmail(e.target.value)}
                                    placeholder="paul.kouam@email.com"
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs"
                                />
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-white/10">
                                <Button
                                    onClick={() => setShowEnrollModal(false)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 text-xs rounded-xl"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    onClick={() => handleEnrollStudent(selectedOfferForStudents.id)}
                                    disabled={enrolling}
                                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl"
                                >
                                    {enrolling ? 'Inscription...' : 'Valider l\'inscription'}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══ MODAL : DÉLIVRANCE ATTESTATION FORMATEUR ═══ */}
            <AnimatePresence>
                {certModalStudent && selectedOfferForStudents && (
                    <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-[#0E131F] border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <div className="flex items-center gap-2">
                                    <Award className="w-5 h-5 text-amber-400" />
                                    <h3 className="text-base font-black text-white">Attestation de Formation Certifiante</h3>
                                </div>
                                <button onClick={() => setCertModalStudent(null)} className="text-slate-400 hover:text-white">✕</button>
                            </div>

                            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                                <p className="text-xs text-slate-300 font-semibold">Apprenant :</p>
                                <p className="text-sm font-black text-white">{certModalStudent.first_name} {certModalStudent.last_name}</p>
                                <p className="text-[11px] text-amber-300 font-medium">Formation : {selectedOfferForStudents.name}</p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-1">Mention</label>
                                <select
                                    value={certMention}
                                    onChange={e => setCertMention(e.target.value)}
                                    className="w-full h-9 rounded-xl bg-slate-900 border border-white/10 text-white px-3 text-xs"
                                >
                                    <option value="Mention Très Bien">Mention Très Bien</option>
                                    <option value="Mention Bien">Mention Bien</option>
                                    <option value="Mention Félicitations">Mention Félicitations</option>
                                    <option value="Sans mention">Sans mention</option>
                                </select>
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-white/10">
                                <Button
                                    onClick={() => setCertModalStudent(null)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 text-xs rounded-xl"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    onClick={() => handleGenerateTrainerCertificate(certModalStudent, selectedOfferForStudents)}
                                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/20"
                                >
                                    <Download className="w-3.5 h-3.5 mr-1" />
                                    Télécharger le PDF
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══ MODAL : CRÉATION D'UNE OFFRE ═══ */}
            <AnimatePresence>
                {showAddOffer && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-[#0E131F] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <h3 className="text-base font-black text-white">
                                    Nouvelle Offre de Formation
                                </h3>
                                <button onClick={() => setShowAddOffer(false)} className="text-slate-400 hover:text-white">✕</button>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-1">
                                    Intitulé de la formation <span className="text-red-400">*</span>
                                </label>
                                <Input
                                    value={offerTitle}
                                    onChange={e => setOfferTitle(e.target.value)}
                                    placeholder="Ex: Masterclass Marketing Digital & IA"
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1">Format / Durée</label>
                                    <select
                                        value={offerFormat}
                                        onChange={e => setOfferFormat(e.target.value)}
                                        className="w-full h-10 rounded-xl bg-slate-900 border border-white/10 text-white px-2.5 text-xs"
                                    >
                                        <option value="1 Semaine (Intensif)">1 Semaine (Intensif)</option>
                                        <option value="1 Mois (Bootcamp Live)">1 Mois (Bootcamp Live)</option>
                                        <option value="3 Mois (Accompagnement Complet)">3 Mois (Accompagnement)</option>
                                        <option value="Coaching Individuel (1-on-1)">Coaching Individuel</option>
                                        <option value="Accès Vidéo & Support">Accès VOD & Support</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1">Tarif / Prix</label>
                                    <Input
                                        value={offerPrice}
                                        onChange={e => setOfferPrice(e.target.value)}
                                        placeholder="Ex: 50 000 FCFA"
                                        className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-white/10">
                                <Button
                                    onClick={() => setShowAddOffer(false)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 text-xs rounded-xl"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    onClick={handleCreateOffer}
                                    disabled={creatingOffer}
                                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl"
                                >
                                    {creatingOffer ? 'Création...' : 'Créer l\'offre'}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══ MODAL : MODIFICATION D'UNE OFFRE ═══ */}
            <AnimatePresence>
                {editingOffer && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-[#0E131F] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <h3 className="text-base font-black text-white">
                                    Modifier l'Offre de Formation
                                </h3>
                                <button onClick={() => setEditingOffer(null)} className="text-slate-400 hover:text-white">✕</button>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-1">Intitulé</label>
                                <Input
                                    value={editingOffer.name}
                                    onChange={e => setEditingOffer({ ...editingOffer, name: e.target.value })}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-sm"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-1">Format, Durée & Prix</label>
                                <Input
                                    value={editingOffer.cycle}
                                    onChange={e => setEditingOffer({ ...editingOffer, cycle: e.target.value })}
                                    placeholder="Ex: 3 Mois (Accompagnement) • 75 000 FCFA"
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs"
                                />
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-white/10">
                                <Button
                                    onClick={() => setEditingOffer(null)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 text-xs rounded-xl"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    onClick={handleUpdateOffer}
                                    disabled={savingEditOffer}
                                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl"
                                >
                                    {savingEditOffer ? 'Enregistrement...' : 'Enregistrer'}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
