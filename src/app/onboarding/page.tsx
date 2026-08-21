'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Building2, MapPin, Phone, FileText, ArrowRight, ArrowLeft,
    GraduationCap, CheckCircle2, Upload, X, Loader2, ChevronDown,
    Lock, Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { uploadToR2 } from '@/lib/r2';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// ═══════════════════════════════════════════════
// ONBOARDING — 6 STEP WIZARD
// ═══════════════════════════════════════════════

const ROLES = [
    { id: 'fondateur', label: 'Fondateur', emoji: '🏗️' },
    { id: 'proviseur', label: 'Proviseur', emoji: '🎓' },
    { id: 'principal', label: 'Principal', emoji: '👔' },
    { id: 'formateur', label: 'Formateur', emoji: '📋' },
    { id: 'instituteur', label: 'Instituteur', emoji: '👨‍🏫' },
    { id: 'directeur', label: 'Directeur', emoji: '🏛️' },
];

const SCHOOL_TYPES = [
    { id: 'college', label: 'Collège', emoji: '🏫' },
    { id: 'lycee', label: 'Lycée', emoji: '🎓' },
    { id: 'universite', label: 'Université / Grande École', emoji: '🏛️' },
    { id: 'academie_en_ligne', label: 'Académie en Ligne / Formateur Expert (Sans Bâtiment)', emoji: '💻' },
    { id: 'centre_formation', label: 'Centre de formation professionnel', emoji: '⚙️' },
    { id: 'institut', label: 'Institut de formation spécialisé', emoji: '📚' },
    { id: 'autre', label: 'Autre (précisé)', emoji: '✨' },
];

const COUNTRIES = [
    'Cameroun', 'Côte d\'Ivoire', 'Sénégal', 'RD Congo', 'Congo', 'Gabon',
    'Bénin', 'Togo', 'Burkina Faso', 'Mali', 'Guinée', 'Niger', 'Tchad',
    'Centrafrique', 'Madagascar', 'France', 'Belgique', 'Canada', 'Suisse',
    'Autre',
];

interface OnboardingData {
    // Step 1
    firstName: string;
    lastName: string;
    // Step 2
    role: string;
    // Step 3
    schoolName: string;
    schoolType: string;
    schoolTypeOther: string;
    motto: string;
    // Step 4
    country: string;
    city: string;
    quarter: string;
    street: string;
    // Step 5
    phone: string;
    whatsapp: string;
    email: string;
    password: string;
    confirmPassword: string;
    otherPhone: string;
    otherPhoneLabel: string;
    // Step 6
    logoFile: File | null;
    documents: File[];
}

const INITIAL_DATA: OnboardingData = {
    firstName: '', lastName: '',
    role: '',
    schoolName: '', schoolType: '', schoolTypeOther: '', motto: '',
    country: 'Cameroun', city: '', quarter: '', street: '',
    phone: '', whatsapp: '', email: '', password: '', confirmPassword: '', otherPhone: '', otherPhoneLabel: '',
    logoFile: null, documents: [],
};

const STEP_INFO = [
    { icon: User, title: 'Parlez-nous de vous', subtitle: 'Vos informations personnelles' },
    { icon: GraduationCap, title: 'Quel est votre rôle ?', subtitle: 'Votre fonction dans l\'établissement' },
    { icon: Building2, title: 'Votre établissement', subtitle: 'Type et nom de votre école' },
    { icon: MapPin, title: 'Localisation', subtitle: 'Où est situé votre établissement ?' },
    { icon: Phone, title: 'Contact', subtitle: 'Comment vous joindre' },
    { icon: FileText, title: 'Documentation', subtitle: 'Logo et pièces justificatives' },
];

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 60);
}

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [showPwd, setShowPwd] = useState(false);
    const [showConfirmPwd, setShowConfirmPwd] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const docsInputRef = useRef<HTMLInputElement>(null);

    const update = (partial: Partial<OnboardingData>) => setData(prev => ({ ...prev, ...partial }));

    const canNext = (): boolean => {
        switch (step) {
            case 0: return data.firstName.trim().length > 0 && data.lastName.trim().length > 0;
            case 1: return data.role.length > 0;
            case 2: return data.schoolName.trim().length > 0 && data.schoolType.length > 0;
            case 3: return data.country.length > 0 && data.city.trim().length > 0;
            case 4: return data.phone.trim().length > 0 && data.email.trim().includes('@') && data.password.length >= 6 && data.password === data.confirmPassword;
            case 5: return true; // Logo optionnel
            default: return false;
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        update({ logoFile: file });
        const reader = new FileReader();
        reader.onloadend = () => setLogoPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleDocsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        update({ documents: [...data.documents, ...files] });
    };

    const removeDoc = (idx: number) => {
        update({ documents: data.documents.filter((_, i) => i !== idx) });
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const trimmedSchoolName = data.schoolName.trim();
            if (!trimmedSchoolName) {
                throw new Error('Le nom de l\'établissement est obligatoire');
            }

            // ═══ STEP 0: Check uniqueness of organization name ═══
            const { data: existingOrgs } = await supabase
                .from('organizations')
                .select('id, name')
                .ilike('name', trimmedSchoolName)
                .limit(1);

            if (existingOrgs && existingOrgs.length > 0) {
                throw new Error(`Un établissement nommé "${trimmedSchoolName}" est déjà enregistré sur IziTeach. Veuillez choisir une dénomination distincte.`);
            }

            const slug = generateSlug(trimmedSchoolName);
            const password = data.password;

            // ═══ STEP 1: Create auth account ═══
            // Try signup first. If email is already registered, sign in instead.
            let userId: string | undefined;

            const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
                email: data.email,
                password,
                options: {
                    data: {
                        full_name: `${data.firstName} ${data.lastName}`,
                        phone: data.phone,
                    },
                },
            });

            if (signUpErr) {
                if (signUpErr.message.includes('already registered') || signUpErr.message.includes('rate limit')) {
                    // User exists or rate limited → try sign in
                    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
                        email: data.email,
                        password,
                    });
                    if (signInErr) throw new Error('Compte existant. Vérifiez votre email/mot de passe ou réessayez plus tard.');
                    userId = signInData.user?.id;
                } else {
                    throw signUpErr;
                }
            } else {
                userId = signUpData.user?.id;
                // If Supabase has email confirmation disabled, the session is set automatically.
                // If email confirmation IS enabled, the user won't have a session yet.
                // Try to sign in immediately to ensure we have a valid session:
                if (!signUpData.session) {
                    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
                        email: data.email,
                        password,
                    });
                    if (signInErr) {
                        throw new Error('Compte créé mais la confirmation email est requise. Désactivez la confirmation dans Supabase Dashboard → Auth → Email.');
                    }
                    userId = signInData.user?.id;
                }
            }

            if (!userId) throw new Error('Impossible de créer le compte utilisateur');

            // ═══ STEP 2: Verify we have a valid session ═══
            const { data: sessionCheck } = await supabase.auth.getSession();
            if (!sessionCheck.session) {
                throw new Error('Session non établie. Veuillez vérifier votre email puis vous connecter.');
            }

            // ═══ STEP 3: Create organization (now RLS will pass) ═══
            const { data: org, error: orgErr } = await supabase
                .from('organizations')
                .insert({
                    name: data.schoolName,
                    slug,
                    type: data.schoolType === 'autre' ? data.schoolTypeOther : data.schoolType,
                    motto: data.motto,
                    country: data.country,
                    city: data.city,
                    quarter: data.quarter,
                    street: data.street,
                    phone: data.phone,
                    whatsapp: data.whatsapp,
                    email: data.email,
                    other_phone: data.otherPhone,
                    other_phone_label: data.otherPhoneLabel,
                    owner_id: userId,
                    owner_role: data.role,
                    owner_first_name: data.firstName,
                    owner_last_name: data.lastName,
                    is_online_academy: data.schoolType === 'academie_en_ligne',
                    certification_badge: 'none',
                    landing_layout: 'bento_grid',
                    hero_template: 'split',
                })
                .select()
                .single();

            if (orgErr) throw orgErr;

            // ═══ STEP 4: Upload logo ═══
            if (data.logoFile && org) {
                const r2Res = await uploadToR2(data.logoFile, `orgs/${org.id}`, data.logoFile.name);
                await supabase.from('organizations').update({ logo_url: r2Res.url }).eq('id', org.id);
            }

            // ═══ STEP 5: Upload documents ═══
            if (data.documents.length > 0 && org) {
                for (const doc of data.documents) {
                    await uploadToR2(doc, `orgs/${org.id}/docs`, doc.name);
                }
            }

            // ═══ STEP 6: Update profile ═══
            await supabase.from('profiles').upsert({
                id: userId,
                full_name: `${data.firstName} ${data.lastName}`,
                phone: data.phone,
                email: data.email,
                role: 'director',
                organization_id: org.id,
            });

            toast.success('🎉 Établissement créé avec succès !');
            router.push(`/${slug}/admin`);

        } catch (err: any) {
            console.error('Onboarding error:', err);
            toast.error(err.message || 'Erreur lors de la création');
        } finally {
            setIsSubmitting(false);
        }
    };

    const next = () => { if (step < 5) setStep(s => s + 1); else handleSubmit(); };
    const prev = () => { if (step > 0) setStep(s => s - 1); };
    const progress = ((step + 1) / 6) * 100;

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-white/5">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                            <GraduationCap className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-200">IziTeach</span>
                    </div>
                    <span className="text-sm text-slate-500">Étape {step + 1} / 6</span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 bg-white/5">
                <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-500"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                />
            </div>

            {/* Content */}
            <div className="flex-1 flex items-start justify-center px-4 py-8 sm:py-12">
                <div className="w-full max-w-lg">
                    {/* Step title */}
                    <motion.div
                        key={`title-${step}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mb-8 text-center"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-4">
                            {(() => { const Icon = STEP_INFO[step].icon; return <Icon className="w-7 h-7 text-indigo-400" />; })()}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold">{STEP_INFO[step].title}</h1>
                        <p className="text-slate-400 mt-2">{STEP_INFO[step].subtitle}</p>
                    </motion.div>

                    {/* Step content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-4"
                        >
                            {/* ─── STEP 0: Identité ─── */}
                            {step === 0 && (
                                <>
                                    <div>
                                        <Label className="text-slate-300 mb-1.5 block">Prénom *</Label>
                                        <Input
                                            value={data.firstName}
                                            onChange={e => update({ firstName: e.target.value })}
                                            placeholder="Ex: Jean"
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-12 rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-slate-300 mb-1.5 block">Nom de famille *</Label>
                                        <Input
                                            value={data.lastName}
                                            onChange={e => update({ lastName: e.target.value })}
                                            placeholder="Ex: Dupont"
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-12 rounded-xl"
                                        />
                                    </div>
                                </>
                            )}

                            {/* ─── STEP 1: Rôle ─── */}
                            {step === 1 && (
                                <div className="grid grid-cols-2 gap-3">
                                    {ROLES.map(r => (
                                        <button
                                            key={r.id}
                                            onClick={() => update({ role: r.id })}
                                            className={`p-4 rounded-xl border text-left transition-all ${data.role === r.id
                                                ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                                                : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                                                }`}
                                        >
                                            <span className="text-2xl">{r.emoji}</span>
                                            <p className="mt-2 font-medium text-sm">{r.label}</p>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* ─── STEP 2: Établissement ─── */}
                            {step === 2 && (
                                <>
                                    <div>
                                        <Label className="text-slate-300 mb-1.5 block">Nom de l&apos;établissement *</Label>
                                        <Input
                                            value={data.schoolName}
                                            onChange={e => update({ schoolName: e.target.value })}
                                            placeholder="Ex: Institut de Formation des Sciences Appliquées"
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-12 rounded-xl"
                                        />
                                        {data.schoolName && (
                                            <p className="text-xs text-indigo-400 mt-1.5">
                                                🔗 URL: iziteach.com/<strong>{generateSlug(data.schoolName)}</strong>
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <Label className="text-slate-300 mb-1.5 block">Type d&apos;établissement *</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {SCHOOL_TYPES.map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => update({ schoolType: t.id })}
                                                    className={`p-3 rounded-xl border text-left text-sm transition-all ${data.schoolType === t.id
                                                        ? 'border-indigo-500 bg-indigo-500/10'
                                                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                                                        }`}
                                                >
                                                    <span className="text-lg">{t.emoji}</span>
                                                    <p className="mt-1 font-medium text-xs">{t.label}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {data.schoolType === 'autre' && (
                                        <div>
                                            <Label className="text-slate-300 mb-1.5 block">Précisez le type</Label>
                                            <Input
                                                value={data.schoolTypeOther}
                                                onChange={e => update({ schoolTypeOther: e.target.value })}
                                                placeholder="Ex: Auto-école, École de musique..."
                                                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-12 rounded-xl"
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <Label className="text-slate-300 mb-1.5 block">Devise / Slogan (optionnel)</Label>
                                        <Input
                                            value={data.motto}
                                            onChange={e => update({ motto: e.target.value })}
                                            placeholder="Ex: 100% pratique !"
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-12 rounded-xl"
                                        />
                                    </div>
                                </>
                            )}

                            {/* ─── STEP 3: Localisation ─── */}
                            {step === 3 && (
                                <>
                                    <div>
                                        <Label className="text-slate-300 mb-1.5 block">Pays *</Label>
                                        <div className="relative">
                                            <select
                                                value={data.country}
                                                onChange={e => update({ country: e.target.value })}
                                                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-4 appearance-none cursor-pointer"
                                            >
                                                {COUNTRIES.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-slate-500 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-slate-300 mb-1.5 block">Ville *</Label>
                                        <Input
                                            value={data.city}
                                            onChange={e => update({ city: e.target.value })}
                                            placeholder="Ex: Yaoundé"
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-12 rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-slate-300 mb-1.5 block">Quartier</Label>
                                        <Input
                                            value={data.quarter}
                                            onChange={e => update({ quarter: e.target.value })}
                                            placeholder="Ex: Odza - Petit Marché"
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-12 rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-slate-300 mb-1.5 block">Rue / Adresse</Label>
                                        <Input
                                            value={data.street}
                                            onChange={e => update({ street: e.target.value })}
                                            placeholder="Ex: Avenue Principale, face à l'hôpital"
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-12 rounded-xl"
                                        />
                                    </div>
                                </>
                            )}

                            {/* ─── STEP 4: Contact ─── */}
                            {step === 4 && (
                                <>
                                    <div>
                                        <Label className="text-slate-300 mb-1.5 block">N° de téléphone *</Label>
                                        <Input
                                            type="tel"
                                            value={data.phone}
                                            onChange={e => update({ phone: e.target.value })}
                                            placeholder="+237 6XX XXX XXX"
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-12 rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-slate-300 mb-1.5 block">N° WhatsApp</Label>
                                        <Input
                                            type="tel"
                                            value={data.whatsapp}
                                            onChange={e => update({ whatsapp: e.target.value })}
                                            placeholder="+237 6XX XXX XXX"
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-12 rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-slate-300 mb-1.5 block">Email *</Label>
                                        <Input
                                            type="email"
                                            value={data.email}
                                            onChange={e => update({ email: e.target.value })}
                                            placeholder="contact@votre-ecole.com"
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-12 rounded-xl"
                                        />
                                    </div>
                                    <div className="col-span-full p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 space-y-3">
                                        <p className="text-sm text-indigo-300 font-medium flex items-center gap-2"><Lock className="w-4 h-4" /> Mot de passe de connexion admin</p>
                                        <p className="text-xs text-slate-500">Ce mot de passe vous permettra de vous connecter au backoffice de votre établissement.</p>
                                        <div>
                                            <Label className="text-slate-300 mb-1.5 block">Mot de passe * (6 caractères min.)</Label>
                                            <div className="relative">
                                                <Input
                                                    type={showPwd ? 'text' : 'password'}
                                                    value={data.password}
                                                    onChange={e => update({ password: e.target.value })}
                                                    placeholder="••••••••"
                                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-12 rounded-xl pr-10"
                                                />
                                                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-3 text-slate-500">
                                                    {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                            {data.password && data.password.length < 6 && (
                                                <p className="text-xs text-amber-400 mt-1">⚠️ 6 caractères minimum</p>
                                            )}
                                        </div>
                                        <div>
                                            <Label className="text-slate-300 mb-1.5 block">Confirmer le mot de passe *</Label>
                                            <div className="relative">
                                                <Input
                                                    type={showConfirmPwd ? 'text' : 'password'}
                                                    value={data.confirmPassword}
                                                    onChange={e => update({ confirmPassword: e.target.value })}
                                                    placeholder="••••••••"
                                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-12 rounded-xl pr-10"
                                                />
                                                <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)} className="absolute right-3 top-3 text-slate-500">
                                                    {showConfirmPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                            {data.confirmPassword && data.password !== data.confirmPassword && (
                                                <p className="text-xs text-red-400 mt-1">Les mots de passe ne correspondent pas</p>
                                            )}
                                            {data.confirmPassword && data.password === data.confirmPassword && data.password.length >= 6 && (
                                                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Mots de passe identiques ✓</p>
                                            )}
                                        </div>
                                        {/* Password strength indicator */}
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                                                    data.password.length === 0 ? 'bg-white/10' :
                                                    data.password.length < 6 ? (i <= 1 ? 'bg-red-500' : 'bg-white/10') :
                                                    data.password.length < 8 ? (i <= 2 ? 'bg-amber-500' : 'bg-white/10') :
                                                    data.password.length < 12 ? (i <= 3 ? 'bg-emerald-500' : 'bg-white/10') :
                                                    'bg-emerald-400'
                                                }`} />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-5 gap-2">
                                        <div className="col-span-2">
                                            <Label className="text-slate-300 mb-1.5 block text-xs">Label (optionnel)</Label>
                                            <Input
                                                value={data.otherPhoneLabel}
                                                onChange={e => update({ otherPhoneLabel: e.target.value })}
                                                placeholder="Bureau"
                                                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-12 rounded-xl text-sm"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <Label className="text-slate-300 mb-1.5 block text-xs">Autre N°</Label>
                                            <Input
                                                type="tel"
                                                value={data.otherPhone}
                                                onChange={e => update({ otherPhone: e.target.value })}
                                                placeholder="+237..."
                                                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-12 rounded-xl text-sm"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ─── STEP 5: Documentation ─── */}
                            {step === 5 && (
                                <>
                                    {/* Logo */}
                                    <div>
                                        <Label className="text-slate-300 mb-2 block">Logo de l&apos;établissement</Label>
                                        <div
                                            onClick={() => logoInputRef.current?.click()}
                                            className="w-full p-8 border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.02] hover:border-indigo-500/30 transition-colors cursor-pointer text-center"
                                        >
                                            {logoPreview ? (
                                                <div className="flex flex-col items-center">
                                                    <img src={logoPreview} alt="Logo" className="w-24 h-24 object-contain rounded-xl mb-3" />
                                                    <p className="text-sm text-slate-400">Cliquer pour changer</p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center text-slate-500">
                                                    <Upload className="w-10 h-10 mb-3" />
                                                    <p className="font-medium">Cliquer pour uploader</p>
                                                    <p className="text-xs mt-1">PNG, JPG, SVG (max 5 Mo)</p>
                                                </div>
                                            )}
                                        </div>
                                        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                    </div>

                                    {/* Documents */}
                                    <div>
                                        <Label className="text-slate-300 mb-2 block">Pièces justificatives</Label>
                                        <div
                                            onClick={() => docsInputRef.current?.click()}
                                            className="w-full p-6 border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.02] hover:border-blue-500/30 transition-colors cursor-pointer text-center"
                                        >
                                            <div className="flex flex-col items-center text-slate-500">
                                                <FileText className="w-8 h-8 mb-2" />
                                                <p className="font-medium text-sm">Ajouter des fichiers</p>
                                                <p className="text-xs mt-1">PDF, images — autorisation, agréments...</p>
                                            </div>
                                        </div>
                                        <input ref={docsInputRef} type="file" accept=".pdf,image/*" multiple className="hidden" onChange={handleDocsUpload} />

                                        {data.documents.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                {data.documents.map((doc, i) => (
                                                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                                                        <div className="flex items-center gap-2 text-sm text-slate-300 truncate">
                                                            <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                                                            <span className="truncate">{doc.name}</span>
                                                        </div>
                                                        <button onClick={() => removeDoc(i)} className="text-red-400 hover:text-red-300 shrink-0">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Résumé */}
                                    <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 mt-4">
                                        <h3 className="font-semibold text-indigo-300 text-sm mb-2">📋 Résumé de votre établissement</h3>
                                        <div className="text-xs text-slate-400 space-y-1">
                                            <p><strong>Responsable:</strong> {data.firstName} {data.lastName} ({data.role})</p>
                                            <p><strong>Établissement:</strong> {data.schoolName}</p>
                                            <p><strong>Type:</strong> {SCHOOL_TYPES.find(t => t.id === data.schoolType)?.label || data.schoolTypeOther}</p>
                                            <p><strong>Localisation:</strong> {data.quarter}, {data.city}, {data.country}</p>
                                            <p><strong>Contact:</strong> {data.phone} — {data.email}</p>
                                            {data.schoolName && (
                                                <p><strong>URL:</strong> iziteach.com/<span className="text-indigo-400">{generateSlug(data.schoolName)}</span></p>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation buttons */}
                    <div className="mt-8 flex items-center justify-between">
                        <Button
                            variant="ghost"
                            onClick={prev}
                            disabled={step === 0}
                            className="text-slate-400 hover:text-white disabled:opacity-30"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Retour
                        </Button>

                        <Button
                            onClick={next}
                            disabled={!canNext() || isSubmitting}
                            className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 px-8 h-12 rounded-xl disabled:opacity-40"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Création...</>
                            ) : step === 5 ? (
                                <><CheckCircle2 className="w-4 h-4 mr-2" /> Créer mon établissement</>
                            ) : (
                                <>Suivant <ArrowRight className="w-4 h-4 ml-2" /></>
                            )}
                        </Button>
                    </div>

                    {/* Step dots */}
                    <div className="flex items-center justify-center gap-2 mt-6">
                        {[0, 1, 2, 3, 4, 5].map(i => (
                            <div
                                key={i}
                                className={`w-2 h-2 rounded-full transition-all ${i === step ? 'w-6 bg-indigo-500' : i < step ? 'bg-indigo-500/50' : 'bg-white/10'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
