"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    GraduationCap, User, Mail, Lock, Phone, ChevronRight,
    ChevronLeft, Loader2, CheckCircle, BookOpen, ArrowLeft
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getFilieres, getPromotionsByFiliere } from '@/lib/filieres/api'
import { enrollStudent } from '@/lib/enrollments/api'
import type { Filiere, Promotion } from '@/lib/filieres/types'
import { CENTRE_CONFIG } from '@/lib/tenant/config'

type Step = 'info' | 'filiere' | 'confirm'

export function SignupView() {
    const router = useRouter()

    // Form state
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    // Filiere selection
    const [filieres, setFilieres] = useState<Filiere[]>([])
    const [selectedFiliere, setSelectedFiliere] = useState<Filiere | null>(null)
    const [promotions, setPromotions] = useState<Promotion[]>([])
    const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null)

    // UI state
    const [step, setStep] = useState<Step>('info')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // Load filieres on mount
    useEffect(() => {
        getFilieres().then(setFilieres).catch(() => { })
    }, [])

    // Load promotions when filiere changes
    useEffect(() => {
        if (selectedFiliere) {
            getPromotionsByFiliere(selectedFiliere.id)
                .then(setPromotions)
                .catch(() => setPromotions([]))
        } else {
            setPromotions([])
            setSelectedPromotion(null)
        }
    }, [selectedFiliere])

    const validateStep1 = () => {
        if (!fullName.trim()) return 'Veuillez entrer votre nom complet'
        if (!phone.trim()) return 'Veuillez entrer votre numéro de téléphone'
        if (password.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères'
        if (password !== confirmPassword) return 'Les mots de passe ne correspondent pas'
        return null
    }

    const handleNext = () => {
        setError(null)
        if (step === 'info') {
            const err = validateStep1()
            if (err) { setError(err); return }
            setStep('filiere')
        } else if (step === 'filiere') {
            if (!selectedFiliere) { setError('Veuillez choisir une filière'); return }
            setStep('confirm')
        }
    }

    const handleBack = () => {
        setError(null)
        if (step === 'filiere') setStep('info')
        else if (step === 'confirm') setStep('filiere')
    }

    const handleSubmit = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const cleanPhone = phone.replace(/\D/g, '')
            const authEmail = email.trim() || `${cleanPhone}@centreformation.local`

            // 1. Create Supabase Auth user
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: authEmail,
                password,
                options: {
                    data: {
                        full_name: fullName.trim(),
                        phone: phone.trim(),
                    }
                }
            })

            if (signUpError) throw signUpError

            const userId = signUpData.user?.id
            if (!userId) throw new Error("Erreur lors de la création du compte")

            // 2. Update profile with filiere info
            await supabase.from('profiles').upsert({
                id: userId,
                full_name: fullName.trim(),
                phone: phone.trim(),
                filiere_id: selectedFiliere!.id,
                role: 'student',
            }, { onConflict: 'id' })

            // 3. Create enrollment
            await enrollStudent(userId, selectedFiliere!.id, selectedPromotion?.id)

            setSuccess(true)

            // Redirect after 2.5 seconds
            setTimeout(() => {
                router.push('/')
            }, 2500)

        } catch (e: any) {
            console.error('Signup error:', e)
            if (e.message?.includes('already registered')) {
                setError('Ce numéro est déjà enregistré. Essayez de vous connecter.')
            } else {
                setError(e.message || "Erreur lors de l'inscription")
            }
        } finally {
            setIsLoading(false)
        }
    }

    const stepIndex = (s: Step) => ['info', 'filiere', 'confirm'].indexOf(s)

    if (success) {
        return (
            <div className="min-h-screen bg-linear-to-b from-[#0B0E14] to-[#0F1219] flex items-center justify-center px-4">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                    >
                        <CheckCircle className="h-20 w-20 text-emerald-400 mx-auto" />
                    </motion.div>
                    <h2 className="text-2xl font-black text-white mt-6">Inscription réussie ! 🎉</h2>
                    <p className="text-slate-400 mt-2 text-sm">
                        Bienvenue dans la filière <span className="text-indigo-400 font-bold">{selectedFiliere?.nom}</span>
                    </p>
                    <p className="text-slate-500 mt-4 text-xs">Redirection en cours...</p>
                    <Loader2 className="h-5 w-5 text-indigo-400 animate-spin mx-auto mt-3" />
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-linear-to-b from-[#0B0E14] to-[#0F1219] text-white">
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-30%] right-[-20%] w-[70%] h-[70%] bg-indigo-600/8 blur-[180px] rounded-full" />
                <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-600/6 blur-[150px] rounded-full" />
            </div>

            <div className="relative z-10 max-w-md mx-auto px-4 pt-10 pb-20">
                {/* Back button */}
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-1 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Retour
                </button>

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 mb-4">
                        <GraduationCap className="h-8 w-8 text-indigo-400" />
                    </div>
                    <h1 className="text-2xl font-black">{CENTRE_CONFIG.nom}</h1>
                    <p className="text-slate-500 text-sm mt-1">Inscription étudiant</p>
                </motion.div>

                {/* Progress steps */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {(['info', 'filiere', 'confirm'] as Step[]).map((s, i) => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === s ? 'bg-indigo-600 text-white scale-110' :
                                    stepIndex(step) > i ? 'bg-emerald-600 text-white' :
                                        'bg-white/10 text-slate-500'
                                }`}>
                                {stepIndex(step) > i ? '✓' : i + 1}
                            </div>
                            {i < 2 && <div className={`w-8 h-0.5 ${stepIndex(step) > i ? 'bg-emerald-600' : 'bg-white/10'}`} />}
                        </div>
                    ))}
                </div>

                {/* Error message */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Steps */}
                <AnimatePresence mode="wait">
                    {/* STEP 1: Personal Info */}
                    {step === 'info' && (
                        <motion.div
                            key="info"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            className="space-y-4"
                        >
                            <h2 className="text-lg font-bold mb-4">Informations personnelles</h2>

                            <div className="space-y-3">
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Nom complet *"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none transition-colors"
                                    />
                                </div>

                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <input
                                        type="email"
                                        placeholder="Email (optionnel)"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none transition-colors"
                                    />
                                </div>

                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <input
                                        type="tel"
                                        placeholder="Téléphone * (+237 6XX...)"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none transition-colors"
                                    />
                                </div>

                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <input
                                        type="password"
                                        placeholder="Mot de passe * (min 6 car.)"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none transition-colors"
                                    />
                                </div>

                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <input
                                        type="password"
                                        placeholder="Confirmer le mot de passe *"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleNext}
                                className="w-full h-12 rounded-xl bg-linear-to-r from-indigo-600 to-blue-600 text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mt-6"
                            >
                                Continuer <ChevronRight className="h-4 w-4" />
                            </button>

                            <p className="text-center text-slate-600 text-xs mt-4">
                                Déjà inscrit ?{' '}
                                <button onClick={() => router.push('/')} className="text-indigo-400 hover:underline">
                                    Se connecter
                                </button>
                            </p>
                        </motion.div>
                    )}

                    {/* STEP 2: Filiere Selection */}
                    {step === 'filiere' && (
                        <motion.div
                            key="filiere"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            className="space-y-4"
                        >
                            <h2 className="text-lg font-bold mb-2">Choisissez votre filière</h2>
                            <p className="text-slate-500 text-xs mb-4">{filieres.length} filière(s) disponible(s)</p>

                            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 scrollbar-none">
                                {filieres.map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setSelectedFiliere(f)}
                                        className={`w-full p-4 rounded-xl border text-left transition-all ${selectedFiliere?.id === f.id
                                                ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                                                : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                                style={{ backgroundColor: f.couleur + '30' }}
                                            >
                                                <BookOpen className="h-5 w-5" style={{ color: f.couleur }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm truncate">{f.nom}</p>
                                                <p className="text-xs text-slate-500">
                                                    {f.duree_mois} mois • {f.frais_scolarite.toLocaleString('fr-FR')} XAF
                                                </p>
                                            </div>
                                            {selectedFiliere?.id === f.id && (
                                                <CheckCircle className="h-5 w-5 text-indigo-400 shrink-0" />
                                            )}
                                        </div>
                                    </button>
                                ))}

                                {filieres.length === 0 && (
                                    <div className="text-center py-8 text-slate-500">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                        <p className="text-sm">Chargement des filières...</p>
                                    </div>
                                )}
                            </div>

                            {/* Promotion selection */}
                            {selectedFiliere && promotions.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-sm font-medium text-slate-400 mb-2">Promotion :</p>
                                    <div className="flex flex-wrap gap-2">
                                        {promotions.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => setSelectedPromotion(p)}
                                                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${selectedPromotion?.id === p.id
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-white/10 text-slate-400 hover:bg-white/15'
                                                    }`}
                                            >
                                                {p.nom}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleBack}
                                    className="flex-1 h-12 rounded-xl border border-white/10 text-slate-400 font-bold flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
                                >
                                    <ChevronLeft className="h-4 w-4" /> Retour
                                </button>
                                <button
                                    onClick={handleNext}
                                    disabled={!selectedFiliere}
                                    className="flex-1 h-12 rounded-xl bg-linear-to-r from-indigo-600 to-blue-600 text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40"
                                >
                                    Continuer <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: Confirmation */}
                    {step === 'confirm' && (
                        <motion.div
                            key="confirm"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            className="space-y-4"
                        >
                            <h2 className="text-lg font-bold mb-4">Confirmer votre inscription</h2>

                            <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Nom</span>
                                    <span className="font-medium">{fullName}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Téléphone</span>
                                    <span className="font-medium">{phone}</span>
                                </div>
                                {email && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Email</span>
                                        <span className="font-medium">{email}</span>
                                    </div>
                                )}
                                <div className="border-t border-white/10 pt-3" />
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Filière</span>
                                    <span className="font-medium text-indigo-400">{selectedFiliere?.nom}</span>
                                </div>
                                {selectedPromotion && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Promotion</span>
                                        <span className="font-medium">{selectedPromotion.nom}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Frais de scolarité</span>
                                    <span className="font-bold text-emerald-400">
                                        {selectedFiliere?.frais_scolarite.toLocaleString('fr-FR')} XAF
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleBack}
                                    disabled={isLoading}
                                    className="flex-1 h-12 rounded-xl border border-white/10 text-slate-400 font-bold flex items-center justify-center gap-2 hover:bg-white/5 transition-colors disabled:opacity-50"
                                >
                                    <ChevronLeft className="h-4 w-4" /> Retour
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                    className="flex-1 h-12 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            <GraduationCap className="h-4 w-4" /> S&apos;inscrire
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer */}
                <p className="text-center text-slate-600 text-xs mt-8">
                    {CENTRE_CONFIG.nom} • {CENTRE_CONFIG.ville}, {CENTRE_CONFIG.pays}
                </p>
            </div>
        </div>
    )
}
