'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UserCheck, Award, Sparkles, Plus, Copy,
    ExternalLink, CheckCircle2, DollarSign, Calendar,
    BookOpen, Users, Share2, ShieldCheck, Video,
    MessageSquare, Phone, Mail, Edit3, Trash2,
    Download, UserPlus, Layers, Check, X, Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { SchoolTypeConfig } from '@/lib/school-type-adapter';
import { generateCertificatePDF, type CertificateData } from '@/lib/certificate-pdf';
import { StudentAccessCredentialsModal } from './StudentAccessCredentialsModal';
import { DirectMobileMoneyPaymentModal } from './DirectMobileMoneyPaymentModal';
import { extractContentAndCurriculum, SAMPLE_CURRICULUM_TEMPLATE } from '@/lib/curriculum-parser';
import { SessionConfigEditor } from './SessionConfigEditor';
import { PosterUploadField } from './PosterUploadField';
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
    const [offerFormat, setOfferFormat] = useState('1 Mois (Bootcamp Live)');
    const [customFormat, setCustomFormat] = useState('');
    const [offerPrice, setOfferPrice] = useState('50 000 FCFA');
    const [offerOriginalPrice, setOfferOriginalPrice] = useState('');
    const [offerRegistrationFee, setOfferRegistrationFee] = useState('');
    const [offerDescription, setOfferDescription] = useState('');
    const [offerPosterUrl, setOfferPosterUrl] = useState('');
    const [offerSessions, setOfferSessions] = useState<any[]>([]);
    const [creatingOffer, setCreatingOffer] = useState(false);

    // Helper pour générer 3 sessions types (1 mois, 3 mois, 6 mois) avec tranches
    const generateDefaultSessions = (basePriceStr: string, origPriceStr?: string) => {
        const p = parseInt(basePriceStr.replace(/[^0-9]/g, ''), 10) || 90000;
        const op = origPriceStr ? (parseInt(origPriceStr.replace(/[^0-9]/g, ''), 10) || null) : null;
        const p1m = Math.max(25000, Math.round((p * 0.45) / 5000) * 5000);
        const p3m = Math.max(45000, Math.round((p * 0.75) / 5000) * 5000);
        const p6m = p;

        const t1_1m = Math.round((p1m * 0.6) / 1000) * 1000;
        const t2_1m = p1m - t1_1m;

        const t1_3m = Math.round((p3m * 0.5) / 1000) * 1000;
        const t2_3m = p3m - t1_3m;

        const t1_6m = Math.round((p6m * 0.4) / 1000) * 1000;
        const t2_6m = Math.round((p6m * 0.3) / 1000) * 1000;
        const t3_6m = p6m - t1_6m - t2_6m;

        return [
            {
                id: 'session_1m',
                label: '1 Mois (Intensif Express)',
                duration_months: 1,
                duration_label: '1 mois',
                price: p1m,
                prix_barre: op ? Math.round((op * 0.5) / 5000) * 5000 : null,
                promo_badge: 'Express',
                payment_mode: 'flexible',
                installments: [
                    { number: 1, label: '1ère Tranche (Acompte)', amount: t1_1m, due_date_label: "À l'inscription" },
                    { number: 2, label: '2ème Tranche (Solde)', amount: t2_1m, due_date_label: "15ème jour" },
                ]
            },
            {
                id: 'session_3m',
                label: '3 Mois (Rythme Accéléré)',
                duration_months: 3,
                duration_label: '3 mois',
                price: p3m,
                prix_barre: op ? Math.round((op * 0.8) / 5000) * 5000 : null,
                promo_badge: 'Populaire',
                payment_mode: 'flexible',
                installments: [
                    { number: 1, label: '1ère Tranche (Acompte)', amount: t1_3m, due_date_label: "À l'inscription" },
                    { number: 2, label: '2ème Tranche (Solde)', amount: t2_3m, due_date_label: "Fin du 1er mois" },
                ]
            },
            {
                id: 'session_6m',
                label: '6 Mois (Cursus Approfondi & Mentorat)',
                duration_months: 6,
                duration_label: '6 mois',
                price: p6m,
                prix_barre: op || null,
                promo_badge: op && op > p6m ? `-${Math.round(((op - p6m) / op) * 100)}%` : 'Recommandé',
                payment_mode: 'flexible',
                installments: [
                    { number: 1, label: '1ère Tranche (Acompte)', amount: t1_6m, due_date_label: "À l'inscription" },
                    { number: 2, label: '2ème Tranche', amount: t2_6m, due_date_label: "Fin du 2ème mois" },
                    { number: 3, label: '3ème Tranche (Solde)', amount: t3_6m, due_date_label: "Avant certification" },
                ]
            }
        ];
    };

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
    const [credentialsData, setCredentialsData] = useState<{
        studentName: string;
        courseName: string;
        accessCode: string;
        pin: string;
        phone?: string;
    } | null>(null);

    // Modal Paiement Mobile Money Direct
    const [paymentModalOffer, setPaymentModalOffer] = useState<any | null>(null);

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

    // ── 2. Création rapide d'une Offre de Formation ──
    const handleCreateOffer = async () => {
        if (!offerTitle.trim()) {
            toast.error('Titre de la formation obligatoire');
            return;
        }

        setCreatingOffer(true);
        try {
            const finalFormat = offerFormat === 'custom'
                ? (customFormat.trim() || 'Formation Personnalisée')
                : offerFormat;
            const finalPrice = offerPrice.trim() || 'Tarif sur demande';
            const cycleText = `${finalFormat} • ${finalPrice}`;

            const priceNum = parseInt(offerPrice.replace(/[^0-9]/g, ''), 10) || 0;
            const origPriceNum = offerOriginalPrice.trim() ? (parseInt(offerOriginalPrice.replace(/[^0-9]/g, ''), 10) || null) : null;
            const regFeeNum = offerRegistrationFee.trim() ? (parseInt(offerRegistrationFee.replace(/[^0-9]/g, ''), 10) || 0) : 0;

            const finalSessions = offerSessions.length > 0
                ? offerSessions
                : generateDefaultSessions(offerPrice, offerOriginalPrice);

            const scheduleConfig = {
                description: offerDescription.trim(),
                prix_barre: origPriceNum,
                original_price: offerOriginalPrice.trim(),
                duration_text: finalFormat,
                poster_url: offerPosterUrl.trim() || null,
                sessions: finalSessions,
            };

            const levelMatch = offerTitle.match(/(?:niveau|level|nv)\s*(\d+)/i);
            const detectedLevel = levelMatch ? parseInt(levelMatch[1], 10) : 1;

            let classroomData = null;
            const { data, error } = await supabase.from('classrooms').insert({
                organization_id: org.id,
                name: offerTitle.trim(),
                cycle: cycleText,
                level: detectedLevel,
                capacity: 100,
                tuition_fee: priceNum,
                frais_scolarite: priceNum,
                registration_fee: regFeeNum,
                frais_inscription: regFeeNum,
                training_duration: finalFormat,
                description: offerDescription.trim() || null,
                prix_barre: origPriceNum,
                schedule_config: scheduleConfig,
                competencies_list: offerDescription.trim() ? offerDescription.trim().split(/\r?\n/).filter(Boolean) : []
            }).select().single();

            if (error) {
                console.warn('Insert classrooms direct bloqué par RLS, tentative de secours via create_classroom_secure:', error);
                const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('create_classroom_secure', {
                    p_org_id: org.id,
                    p_name: offerTitle.trim(),
                    p_cycle: cycleText,
                    p_level: detectedLevel,
                    p_capacity: 100,
                    p_tuition_fee: priceNum,
                    p_registration_fee: regFeeNum,
                    p_training_duration: finalFormat,
                    p_description: offerDescription.trim() || null,
                    p_prix_barre: origPriceNum,
                    p_schedule_config: scheduleConfig,
                    p_competencies_list: offerDescription.trim() ? offerDescription.trim().split(/\r?\n/).filter(Boolean) : []
                });

                if (rpcError) {
                    console.error('Erreur create_classroom_secure:', rpcError);
                    throw error;
                }
                classroomData = rpcData?.classroom;
            } else {
                classroomData = data;
            }

            toast.success(`🎉 Formation "${offerTitle}" créée avec son programme complet !`);
            setShowAddOffer(false);
            setOfferTitle('');
            setOfferDescription('');
            setOfferPosterUrl('');
            setOfferSessions([]);
            setOfferOriginalPrice('');
            setOfferRegistrationFee('');
            setCustomFormat('');
            onRefresh();
        } catch (e: any) {
            toast.error('Erreur : ' + e.message);
        } finally {
            setCreatingOffer(false);
        }
    };

    // ── 3. Mise à jour d'une Offre ──
    const handleSaveEditOffer = async () => {
        if (!editingOffer || !editingOffer.name.trim()) return;
        setSavingEditOffer(true);
        try {
            const finalPrice = editingOffer.editPrice?.trim() || '';
            const priceNum = finalPrice ? (parseInt(finalPrice.replace(/[^0-9]/g, ''), 10) || 0) : (editingOffer.frais_scolarite || editingOffer.tuition_fee || 0);
            const origPriceNum = editingOffer.editOriginalPrice?.trim() ? (parseInt(editingOffer.editOriginalPrice.replace(/[^0-9]/g, ''), 10) || null) : (editingOffer.prix_barre || null);
            const regFeeNum = editingOffer.editRegistrationFee?.trim() ? (parseInt(editingOffer.editRegistrationFee.replace(/[^0-9]/g, ''), 10) || 0) : (editingOffer.frais_inscription || 0);
            const desc = (editingOffer.editDescription !== undefined ? editingOffer.editDescription : (editingOffer.description || editingOffer.schedule_config?.description || '')).trim();

            const editSessions = (editingOffer.editSessions && editingOffer.editSessions.length > 0)
                ? editingOffer.editSessions
                : (editingOffer.schedule_config?.sessions || generateDefaultSessions(finalPrice, editingOffer.editOriginalPrice));

            const posterUrl = editingOffer.editPosterUrl !== undefined 
                ? (editingOffer.editPosterUrl?.trim() || null)
                : (editingOffer.poster_url || editingOffer.schedule_config?.poster_url || null);

            const scheduleConfig = {
                ...(editingOffer.schedule_config || {}),
                description: desc,
                prix_barre: origPriceNum,
                original_price: editingOffer.editOriginalPrice?.trim() || '',
                poster_url: posterUrl,
                sessions: editSessions,
            };

            const levelMatch = editingOffer.name.match(/(?:niveau|level|nv)\s*(\d+)/i);
            const detectedLevel = levelMatch ? parseInt(levelMatch[1], 10) : (editingOffer.level || 1);

            const { error } = await supabase
                .from('classrooms')
                .update({
                    name: editingOffer.name.trim(),
                    cycle: editingOffer.cycle,
                    level: detectedLevel,
                    tuition_fee: priceNum,
                    frais_scolarite: priceNum,
                    registration_fee: regFeeNum,
                    frais_inscription: regFeeNum,
                    description: desc || null,
                    prix_barre: origPriceNum,
                    schedule_config: scheduleConfig,
                    competencies_list: desc ? desc.split(/\r?\n/).filter(Boolean) : []
                })
                .eq('id', editingOffer.id);

            if (error) throw error;
            toast.success('Formation et programme mis à jour !');
            setEditingOffer(null);
            onRefresh();
        } catch (e: any) {
            toast.error('Erreur : ' + e.message);
        } finally {
            setSavingEditOffer(false);
        }
    };

    // ── 4. Suppression d'une Offre ──
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

    // ── 5. Inscription directe d'un apprenant avec 12 car + PIN ──
    const handleEnrollStudent = async (offerId: string) => {
        if (!newApprenantFN.trim() || !newApprenantLN.trim()) {
            toast.error('Prénom et nom obligatoires');
            return;
        }

        setEnrolling(true);
        try {
            // Code 12 caractères formaté
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let rawCode = '';
            for (let i = 0; i < 12; i++) rawCode += chars[Math.floor(Math.random() * chars.length)];
            const formattedCode = `${rawCode.slice(0, 4)}-${rawCode.slice(4, 8)}-${rawCode.slice(8, 12)}`;

            // PIN initial 4 chiffres
            const pinCode = String(Math.floor(1000 + Math.random() * 9000));
            const mat = `APP${Date.now().toString(36).toUpperCase()}`;

            const offerName = cls.find(c => c.id === offerId)?.name || 'Formation & Coaching';

            const { data, error } = await supabase.from('student_profiles').insert({
                organization_id: org.id,
                first_name: newApprenantFN.trim(),
                last_name: newApprenantLN.trim(),
                classroom_id: offerId,
                phone: newApprenantPhone.trim() || null,
                email: newApprenantEmail.trim() || null,
                matricule: mat,
                access_code: formattedCode,
                pin_code: pinCode,
                pin_set: false,
                approval_status: 'approved'
            }).select().single();

            if (error) throw error;

            toast.success(`🎉 Apprenant inscrit avec succès !`);
            setShowEnrollModal(false);

            // Ouvrir la modale d'identifiants prête pour WhatsApp
            setCredentialsData({
                studentName: `${newApprenantFN.trim()} ${newApprenantLN.trim()}`,
                courseName: offerName,
                accessCode: formattedCode,
                pin: pinCode,
                phone: newApprenantPhone.trim() || undefined
            });

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
        const url = `${window.location.origin}/${org.slug}/#inscription`;
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
                                                        onClick={() => {
                                                            const desc = item.description 
                                                                || item.schedule_config?.description 
                                                                || (Array.isArray(item.competencies_list) ? item.competencies_list.join('\n') : '') 
                                                                || '';
                                                            const origPrice = item.prix_barre 
                                                                || item.schedule_config?.prix_barre 
                                                                || item.schedule_config?.original_price 
                                                                || '';
                                                            const currentPrice = item.frais_scolarite 
                                                                || item.tuition_fee 
                                                                || (item.cycle?.split('•')?.[1]?.trim()) 
                                                                || '';
                                                            const regFee = item.frais_inscription || item.registration_fee || '';
                                                            const poster = item.poster_url || item.schedule_config?.poster_url || item.image_url || item.schedule_config?.image_url || '';
                                                            const sessions = Array.isArray(item.schedule_config?.sessions) ? item.schedule_config.sessions : [];

                                                            setEditingOffer({
                                                                ...item,
                                                                editDescription: desc,
                                                                editPrice: currentPrice ? (String(currentPrice).includes('FCFA') ? String(currentPrice) : `${currentPrice} FCFA`) : '',
                                                                editOriginalPrice: origPrice ? (String(origPrice).includes('FCFA') ? String(origPrice) : `${origPrice} FCFA`) : '',
                                                                editRegistrationFee: regFee ? (String(regFee).includes('FCFA') ? String(regFee) : `${regFee} FCFA`) : '',
                                                                editPosterUrl: poster,
                                                                editSessions: sessions
                                                            });
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                                                        title="Modifier l'offre"
                                                    >
                                                        <Edit3 className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteOffer(item.id, item.name)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                                                        title="Supprimer l'offre"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Affiche de la formation si présente */}
                                            {(() => {
                                                const pUrl = item.poster_url || item.schedule_config?.poster_url || item.image_url || item.schedule_config?.image_url;
                                                if (!pUrl) return null;
                                                return (
                                                    <div className="w-full h-28 rounded-xl overflow-hidden mt-2 relative bg-slate-900 border border-white/10 group-hover:border-amber-500/40 transition">
                                                        <img src={pUrl} alt={item.name} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                                        <span className="absolute bottom-1.5 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[9px] text-amber-300 font-bold border border-white/10 flex items-center gap-1">
                                                            <ImageIcon className="w-2.5 h-2.5" /> Affiche officielle
                                                        </span>
                                                    </div>
                                                );
                                            })()}

                                            <p className="text-xs text-slate-400 mt-2">
                                                {item.cycle || 'Formation & Accompagnement'}
                                            </p>

                                            {/* Badges des sessions et durées disponibles */}
                                            {(() => {
                                                const sess = Array.isArray(item.schedule_config?.sessions) ? item.schedule_config.sessions : [];
                                                if (sess.length === 0) return null;
                                                return (
                                                    <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-white/5">
                                                        {sess.map((s: any, idx: number) => (
                                                            <span key={idx} className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[9px] text-amber-200 font-medium">
                                                                ⏱️ {s.duration_label || s.label} : <strong className="text-white font-mono">{s.price ? `${new Intl.NumberFormat('fr-FR').format(s.price)} F` : s.formatted_price}</strong>
                                                            </span>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs flex-wrap gap-2">
                                            <button
                                                onClick={() => setSelectedOfferForStudents(item)}
                                                className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                                            >
                                                <Users className="w-3 h-3" />
                                                Voir les {enrolled.length} apprenant{enrolled.length > 1 ? 's' : ''}
                                            </button>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setPaymentModalOffer(item)}
                                                    className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 text-[11px] bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 cursor-pointer"
                                                    title="Générer un lien de paiement Mobile Money"
                                                >
                                                    <DollarSign className="w-3 h-3" />
                                                    Paiement MoMo
                                                </button>

                                                <button
                                                    onClick={() => handleCopyEnrollLink(item.name)}
                                                    className="text-slate-400 hover:text-white font-semibold flex items-center gap-1 text-[10px] cursor-pointer"
                                                >
                                                    <Copy className="w-2.5 h-2.5" />
                                                    Lien
                                                </button>
                                            </div>
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
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xs h-9 cursor-pointer"
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
                                <button onClick={() => setSelectedOfferForStudents(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400">
                                    {students.filter(s => s.classroom_id === selectedOfferForStudents.id).length} apprenant(s)
                                </span>
                                <Button
                                    onClick={() => setShowEnrollModal(true)}
                                    className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl h-8 px-3 cursor-pointer"
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
                                        className="bg-white/10 hover:bg-white/20 text-white text-xs rounded-xl cursor-pointer"
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
                                                        className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                                                        title="Envoyer message WhatsApp"
                                                    >
                                                        <Phone className="w-3.5 h-3.5" />
                                                    </a>
                                                )}
                                                <Button
                                                    onClick={() => setCertModalStudent(st)}
                                                    className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl h-8 px-3 shadow-md shadow-amber-500/20 cursor-pointer"
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
                                <button onClick={() => setShowEnrollModal(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
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
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 text-xs rounded-xl cursor-pointer"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    onClick={() => handleEnrollStudent(selectedOfferForStudents.id)}
                                    disabled={enrolling}
                                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl cursor-pointer"
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
                                <button onClick={() => setCertModalStudent(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
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
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 text-xs rounded-xl cursor-pointer"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    onClick={() => handleGenerateTrainerCertificate(certModalStudent, selectedOfferForStudents)}
                                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer"
                                >
                                    <Download className="w-3.5 h-3.5 mr-1" />
                                    Télécharger le PDF
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══ MODAL : CRÉATION D'UNE OFFRE COMPLÈTE AVEC PROGRAMME ═══ */}
            <AnimatePresence>
                {showAddOffer && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-lg bg-[#0E131F] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <div>
                                    <h3 className="text-base font-black text-white flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-amber-400" />
                                        <span>Nouvelle Offre de Formation</span>
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Configurez le programme, les objectifs et la tarification de votre formation.
                                    </p>
                                </div>
                                <button onClick={() => setShowAddOffer(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-1">
                                    Intitulé de la formation <span className="text-red-400">*</span>
                                </label>
                                <Input
                                    value={offerTitle}
                                    onChange={e => setOfferTitle(e.target.value)}
                                    placeholder="Ex: Formation Certifiante en Stratégie Digitale"
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-sm"
                                />
                            </div>

                            {/* Description & Programme pédagogique */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-bold text-slate-300">
                                        Présentation, Objectifs & Modules Pédagogiques
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setOfferDescription(SAMPLE_CURRICULUM_TEMPLATE)}
                                        className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
                                    >
                                        📋 Insérer un exemple
                                    </button>
                                </div>
                                <textarea
                                    value={offerDescription}
                                    onChange={e => setOfferDescription(e.target.value)}
                                    rows={5}
                                    placeholder="Présentation et objectifs en premier...&#10;&#10;Programme des modules :&#10;Module 1 — Titre du module 1&#10;Module 2 — Titre du module 2"
                                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl p-3 text-xs focus:outline-none focus:border-amber-400 resize-none font-sans leading-relaxed"
                                />
                                {(() => {
                                    const preview = extractContentAndCurriculum(offerDescription);
                                    return (
                                        <div className="mt-1.5 space-y-1">
                                            <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
                                                <span className="flex items-center gap-1.5">
                                                    <span>🎯 Présentation : {preview.intro ? '✅ Détectée' : '⚠️ Non renseignée'}</span>
                                                    <span>•</span>
                                                    <span className="font-bold">{preview.modules.length} module(s) détecté(s)</span>
                                                </span>
                                                <span className="text-[10px] text-amber-200/70 hidden sm:inline">
                                                    Séparateur : "Programme des modules :"
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 leading-normal">
                                                💡 <strong>Disposition automatique :</strong> Écrivez vos paragraphes d'objectifs, puis ajoutez <code>Programme des modules :</code> sur sa propre ligne. Chaque ligne suivante débutant par <code>Module 1 — ...</code> sera automatiquement transformée en carte dorée dans la modale !
                                            </p>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1">Format / Durée</label>
                                    <select
                                        value={offerFormat}
                                        onChange={e => setOfferFormat(e.target.value)}
                                        className="w-full h-10 rounded-xl bg-slate-900 border border-white/10 text-white px-2.5 text-xs focus:border-amber-400 outline-none"
                                    >
                                        <option value="1 Semaine (Intensif)">1 Semaine (Intensif)</option>
                                        <option value="2 Semaines (Accéléré)">2 Semaines (Accéléré)</option>
                                        <option value="1 Mois (Bootcamp Live)">1 Mois (Bootcamp Live)</option>
                                        <option value="2 Mois (Spécialisation)">2 Mois (Spécialisation)</option>
                                        <option value="3 Mois (Accompagnement)">3 Mois (Accompagnement)</option>
                                        <option value="6 Mois (Cycle Professionnel)">6 Mois (Cycle Professionnel)</option>
                                        <option value="9 Mois (Cursus Complet)">9 Mois (Cursus Complet)</option>
                                        <option value="1 An (Formation Certifiante)">1 An (Formation Certifiante)</option>
                                        <option value="Coaching Individuel">Coaching Individuel</option>
                                        <option value="Accès VOD & Support">Accès VOD & Support</option>
                                        <option value="custom">✏️ Personnalisé (Saisie libre...)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1">Tarif officiel / Prix</label>
                                    <Input
                                        value={offerPrice}
                                        onChange={e => setOfferPrice(e.target.value)}
                                        placeholder="Ex: 90 000 FCFA"
                                        className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1">Prix initial barré (Réduction)</label>
                                    <Input
                                        value={offerOriginalPrice}
                                        onChange={e => setOfferOriginalPrice(e.target.value)}
                                        placeholder="Ex: 150 000 FCFA"
                                        className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1">Frais d'inscription (Optionnel)</label>
                                    <Input
                                        value={offerRegistrationFee}
                                        onChange={e => setOfferRegistrationFee(e.target.value)}
                                        placeholder="Ex: 15 000 FCFA"
                                        className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs font-mono"
                                    />
                                </div>
                            </div>

                            {/* Affiche de la formation avec Upload direct */}
                            <PosterUploadField
                                value={offerPosterUrl}
                                onChange={setOfferPosterUrl}
                            />

                            {/* Sessions multi-durées & Tranches de paiement éditables */}
                            <SessionConfigEditor
                                sessions={offerSessions}
                                onChange={setOfferSessions}
                                onGenerateDefaults={() => setOfferSessions(generateDefaultSessions(offerPrice, offerOriginalPrice))}
                            />

                            {offerFormat === 'custom' && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5"
                                >
                                    <label className="text-xs font-bold text-amber-300 flex items-center justify-between">
                                        <span>✏️ Précisez la durée ou le format personnalisé</span>
                                        <span className="text-red-400">*</span>
                                    </label>
                                    <Input
                                        value={customFormat}
                                        onChange={e => setCustomFormat(e.target.value)}
                                        placeholder="Ex: 4 Mois (Immersion), 18 Mois, 45 Heures, À la demande..."
                                        className="bg-slate-900 border-amber-500/40 focus:border-amber-400 text-white rounded-xl h-10 text-xs"
                                        autoFocus
                                    />
                                    <p className="text-[10px] text-amber-200/70">
                                        L'intitulé exact de cette durée personnalisée sera affiché sur votre page d'inscription et attestations.
                                    </p>
                                </motion.div>
                            )}

                            <div className="flex gap-2 pt-2 border-t border-white/10">
                                <Button
                                    onClick={() => setShowAddOffer(false)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 text-xs rounded-xl cursor-pointer"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    onClick={handleCreateOffer}
                                    disabled={creatingOffer}
                                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl cursor-pointer"
                                >
                                    {creatingOffer ? 'Création...' : 'Créer l\'offre'}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══ MODAL : MODIFICATION D'UNE OFFRE AVEC PROGRAMME & TARIFS ═══ */}
            <AnimatePresence>
                {editingOffer && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-lg bg-[#0E131F] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <div>
                                    <h3 className="text-base font-black text-white flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-amber-400" />
                                        <span>Modifier l'Offre de Formation</span>
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Mettez à jour le titre, les objectifs, les modules et les tarifs.
                                    </p>
                                </div>
                                <button onClick={() => setEditingOffer(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-1">Intitulé de la formation</label>
                                <Input
                                    value={editingOffer.name}
                                    onChange={e => setEditingOffer({ ...editingOffer, name: e.target.value })}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-sm"
                                />
                            </div>

                            {/* Description & Programme pédagogique */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-bold text-slate-300">
                                        Présentation, Objectifs & Modules Pédagogiques
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setEditingOffer({ ...editingOffer, editDescription: SAMPLE_CURRICULUM_TEMPLATE })}
                                        className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
                                    >
                                        📋 Insérer un exemple
                                    </button>
                                </div>
                                <textarea
                                    value={editingOffer.editDescription ?? ''}
                                    onChange={e => setEditingOffer({ ...editingOffer, editDescription: e.target.value })}
                                    rows={5}
                                    placeholder="Présentation et objectifs en premier...&#10;&#10;Programme des modules :&#10;Module 1 — Titre du module 1&#10;Module 2 — Titre du module 2"
                                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl p-3 text-xs focus:outline-none focus:border-amber-400 resize-none font-sans leading-relaxed"
                                />
                                {(() => {
                                    const preview = extractContentAndCurriculum(editingOffer.editDescription || '');
                                    return (
                                        <div className="mt-1.5 space-y-1">
                                            <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
                                                <span className="flex items-center gap-1.5">
                                                    <span>🎯 Présentation : {preview.intro ? '✅ Détectée' : '⚠️ Non renseignée'}</span>
                                                    <span>•</span>
                                                    <span className="font-bold">{preview.modules.length} module(s) détecté(s)</span>
                                                </span>
                                                <span className="text-[10px] text-amber-200/70 hidden sm:inline">
                                                    Séparateur : "Programme des modules :"
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 leading-normal">
                                                💡 <strong>Disposition automatique :</strong> Écrivez vos paragraphes d'objectifs, puis ajoutez <code>Programme des modules :</code> sur sa propre ligne. Chaque ligne suivante débutant par <code>Module 1 — ...</code> sera automatiquement transformée en carte dorée dans la modale !
                                            </p>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-1">Format & Durée affichée</label>
                                <Input
                                    value={editingOffer.cycle}
                                    onChange={e => setEditingOffer({ ...editingOffer, cycle: e.target.value })}
                                    placeholder="Ex: 6 Mois (Cycle Professionnel) • 90 000 FCFA"
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1">Tarif officiel</label>
                                    <Input
                                        value={editingOffer.editPrice ?? ''}
                                        onChange={e => setEditingOffer({ ...editingOffer, editPrice: e.target.value })}
                                        placeholder="Ex: 90 000 FCFA"
                                        className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1">Prix initial barré (Réduction)</label>
                                    <Input
                                        value={editingOffer.editOriginalPrice ?? ''}
                                        onChange={e => setEditingOffer({ ...editingOffer, editOriginalPrice: e.target.value })}
                                        placeholder="Ex: 150 000 FCFA"
                                        className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-1">Frais d'inscription (Optionnel)</label>
                                <Input
                                    value={editingOffer.editRegistrationFee ?? ''}
                                    onChange={e => setEditingOffer({ ...editingOffer, editRegistrationFee: e.target.value })}
                                    placeholder="Ex: 15 000 FCFA"
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs font-mono"
                                />
                            </div>

                            {/* Affiche officielle de la formation avec Upload direct */}
                            <PosterUploadField
                                value={editingOffer.editPosterUrl ?? ''}
                                onChange={url => setEditingOffer({ ...editingOffer, editPosterUrl: url })}
                            />

                            {/* Sessions multi-durées & Tranches de paiement éditables */}
                            <SessionConfigEditor
                                sessions={editingOffer.editSessions || []}
                                onChange={newSessions => setEditingOffer({ ...editingOffer, editSessions: newSessions })}
                                onGenerateDefaults={() => setEditingOffer({
                                    ...editingOffer,
                                    editSessions: generateDefaultSessions(editingOffer.editPrice || '', editingOffer.editOriginalPrice)
                                })}
                            />

                            <div className="flex gap-2 pt-2 border-t border-white/10">
                                <Button
                                    onClick={() => setEditingOffer(null)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 text-xs rounded-xl cursor-pointer"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    onClick={handleSaveEditOffer}
                                    disabled={savingEditOffer}
                                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl cursor-pointer"
                                >
                                    {savingEditOffer ? 'Enregistrement...' : 'Enregistrer les modifications'}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══ MODAL : Fiche Identifiants (12 car + PIN) & WhatsApp ═══ */}
            {credentialsData && (
                <StudentAccessCredentialsModal
                    open={Boolean(credentialsData)}
                    onClose={() => setCredentialsData(null)}
                    studentName={credentialsData.studentName}
                    courseName={credentialsData.courseName}
                    accessCode={credentialsData.accessCode}
                    pin={credentialsData.pin}
                    phone={credentialsData.phone}
                    orgName={org?.name || 'Formateur Expert'}
                    orgSlug={org?.slug || ''}
                />
            )}

            {/* ═══ MODAL : Paiement Direct Mobile Money (MTN / Orange) ═══ */}
            {paymentModalOffer && (
                <DirectMobileMoneyPaymentModal
                    open={Boolean(paymentModalOffer)}
                    onClose={() => setPaymentModalOffer(null)}
                    courseName={paymentModalOffer.name}
                    coursePrice={paymentModalOffer.tuition_fee || paymentModalOffer.cycle || 50000}
                    orgName={org?.name || 'Formateur Expert'}
                    orgSlug={org?.slug || ''}
                />
            )}
        </div>
    );
}
