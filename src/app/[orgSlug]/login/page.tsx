'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Loader2, Eye, EyeOff, KeyRound, ShieldCheck, ArrowLeft, Lock, UserCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type LoginMode = 'choose' | 'admin' | 'access_code' | 'pin_create' | 'pin_verify' | 'dashboard_redirect' | 'forgot_password';

// Session TTL: 24 hours in milliseconds
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/** Check if an existing session is still valid (not expired) */
export function isSessionValid(): boolean {
    try {
        const raw = localStorage.getItem('campusflow_session');
        if (!raw) return false;
        const session = JSON.parse(raw);
        if (!session.logged_in_at || !session.expires_at) return false;
        return new Date(session.expires_at).getTime() > Date.now();
    } catch {
        return false;
    }
}

/** Get the current session or null if expired */
export function getSession() {
    if (!isSessionValid()) {
        localStorage.removeItem('campusflow_session');
        return null;
    }
    try {
        return JSON.parse(localStorage.getItem('campusflow_session') || 'null');
    } catch {
        return null;
    }
}

interface UserProfile {
    id: string;
    first_name: string;
    last_name: string;
    role: 'teacher' | 'student';
    pin_set: boolean;
    organization_id: string;
    classroom_id?: string;
}

export default function LoginPage() {
    const { orgSlug } = useParams<{ orgSlug: string }>();
    const router = useRouter();
    const [org, setOrg] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<LoginMode>('choose');
    const [saving, setSaving] = useState(false);

    // Admin login
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Access code login
    const [accessCode, setAccessCode] = useState('');

    // PIN
    const [pin, setPin] = useState(['', '', '', '']);
    const [pinConfirm, setPinConfirm] = useState(['', '', '', '']);
    const [pinStep, setPinStep] = useState<'create' | 'confirm'>('create');
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
    const pinConfirmRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

    useEffect(() => {
        (async () => {
            const { data: o } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single();
            setOrg(o);
            setLoading(false);
        })();
    }, [orgSlug]);

    // ═══ ADMIN LOGIN (email/password) ═══
    const handleAdminLogin = async () => {
        if (!email || !password) { toast.error('Email et mot de passe requis'); return; }
        setSaving(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            if (data.user) {
                // Check if this user owns the org
                if (org?.owner_id === data.user.id) {
                    toast.success('Bienvenue, administrateur !');
                    router.push(`/${orgSlug}/admin`);
                } else {
                    toast.error('Ce compte n\'est pas administrateur de cet établissement');
                    await supabase.auth.signOut();
                }
            }
        } catch (e: any) {
            toast.error(e.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect' : e.message);
        }
        setSaving(false);
    };
    // ═══ FORGOT PASSWORD (admin) ═══
    const handleForgotPassword = async () => {
        if (!email) { toast.error('Entrez votre email administrateur'); return; }
        setSaving(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/${orgSlug}/login`,
            });
            if (error) throw error;
            toast.success('📧 Un email de réinitialisation a été envoyé ! Vérifiez votre boîte de réception.');
            setMode('admin');
        } catch (e: any) {
            toast.error(e.message || "Erreur lors de l'envoi");
        }
        setSaving(false);
    };

    // ═══ ACCESS CODE LOGIN ═══
    const handleAccessCodeLogin = async () => {
        const code = accessCode.trim().toUpperCase();
        if (code.length !== 12) { toast.error('Le code doit contenir 12 caractères'); return; }
        if (!org) { toast.error('Établissement non trouvé'); return; }
        setSaving(true);
        try {
            // Try teacher first — SCOPED to this organization
            // NOTE: We no longer select pin_code — PIN is verified server-side via RPC
            const { data: teacher } = await supabase
                .from('teacher_profiles')
                .select('id, first_name, last_name, pin_set, organization_id, is_active')
                .eq('organization_id', org.id)
                .eq('access_code', code)
                .single();

            if (teacher) {
                if (teacher.is_active === false) { toast.error('Votre compte a été désactivé. Contactez l\'administration.'); setSaving(false); return; }
                const profile: UserProfile = { id: teacher.id, first_name: teacher.first_name, last_name: teacher.last_name, role: 'teacher', pin_set: teacher.pin_set || false, organization_id: teacher.organization_id };
                setUserProfile(profile);

                if (!teacher.pin_set) {
                    setMode('pin_create');
                    setPinStep('create');
                    setTimeout(() => pinRefs[0].current?.focus(), 100);
                } else {
                    setMode('pin_verify');
                    setTimeout(() => pinRefs[0].current?.focus(), 100);
                }
                setSaving(false);
                return;
            }

            // Try student — SCOPED to this organization
            // NOTE: We no longer select pin_code — PIN is verified server-side via RPC
            const { data: student } = await supabase
                .from('student_profiles')
                .select('id, first_name, last_name, pin_set, organization_id, classroom_id, is_active')
                .eq('organization_id', org.id)
                .eq('access_code', code)
                .single();

            if (student) {
                if (student.is_active === false) { toast.error('Votre compte a été désactivé. Contactez l\'administration.'); setSaving(false); return; }
                const profile: UserProfile = { id: student.id, first_name: student.first_name, last_name: student.last_name, role: 'student', pin_set: student.pin_set || false, organization_id: student.organization_id, classroom_id: student.classroom_id };
                setUserProfile(profile);

                if (!student.pin_set) {
                    setMode('pin_create');
                    setPinStep('create');
                    setTimeout(() => pinRefs[0].current?.focus(), 100);
                } else {
                    setMode('pin_verify');
                    setTimeout(() => pinRefs[0].current?.focus(), 100);
                }
                setSaving(false);
                return;
            }

            toast.error('Code d\'accès invalide');
        } catch (e: any) {
            toast.error('Erreur de connexion');
        }
        setSaving(false);
    };

    // ═══ PIN INPUT HANDLER ═══
    const handlePinInput = useCallback((index: number, value: string, isConfirm = false) => {
        if (!/^\d*$/.test(value)) return;
        const digit = value.slice(-1);
        const setter = isConfirm ? setPinConfirm : setPin;
        const refs = isConfirm ? pinConfirmRefs : pinRefs;

        setter(prev => {
            const next = [...prev];
            next[index] = digit;
            return next;
        });

        if (digit && index < 3) {
            refs[index + 1].current?.focus();
        }
    }, []);

    const handlePinKeyDown = useCallback((index: number, e: React.KeyboardEvent, isConfirm = false) => {
        const refs = isConfirm ? pinConfirmRefs : pinRefs;
        const current = isConfirm ? pinConfirm : pin;
        if (e.key === 'Backspace' && !current[index] && index > 0) {
            refs[index - 1].current?.focus();
        }
    }, [pin, pinConfirm]);

    // ═══ CREATE PIN ═══
    const handleCreatePin = async () => {
        const pinStr = pin.join('');
        if (pinStr.length !== 4) { toast.error('Entrez 4 chiffres'); return; }

        if (pinStep === 'create') {
            setPinStep('confirm');
            setPinConfirm(['', '', '', '']);
            setTimeout(() => pinConfirmRefs[0].current?.focus(), 100);
            return;
        }

        // Confirm step
        const confirmStr = pinConfirm.join('');
        if (pinStr !== confirmStr) {
            toast.error('Les PINs ne correspondent pas');
            setPinConfirm(['', '', '', '']);
            setTimeout(() => pinConfirmRefs[0].current?.focus(), 100);
            return;
        }

        setSaving(true);
        try {
            // Use server-side RPC to set PIN (never expose pin_code on client)
            const { data: success, error } = await supabase.rpc('set_pin', {
                p_profile_id: userProfile!.id,
                p_role: userProfile!.role,
                p_pin: pinStr,
            });
            if (error) throw error;
            if (!success) throw new Error('Impossible de créer le PIN');
            toast.success('PIN créé avec succès ! 🎉');
            redirectToDashboard();
        } catch (e: any) {
            toast.error(e.message);
        }
        setSaving(false);
    };

    // ═══ VERIFY PIN ═══
    const handleVerifyPin = async () => {
        const pinStr = pin.join('');
        if (pinStr.length !== 4) return;

        setSaving(true);
        try {
            // Use server-side RPC to verify PIN (never fetch pin_code to client)
            const { data: isValid, error } = await supabase.rpc('verify_pin', {
                p_profile_id: userProfile!.id,
                p_role: userProfile!.role,
                p_pin: pinStr,
            });
            if (error) throw error;

            if (isValid) {
                toast.success(`Bienvenue, ${userProfile!.first_name} !`);
                redirectToDashboard();
            } else {
                toast.error('PIN incorrect');
                setPin(['', '', '', '']);
                setTimeout(() => pinRefs[0].current?.focus(), 100);
            }
        } catch (e: any) {
            toast.error(e.message);
        }
        setSaving(false);
    };

    const redirectToDashboard = () => {
        if (!userProfile) return;
        const now = new Date();
        // Store session in localStorage WITH expiration
        localStorage.setItem('campusflow_session', JSON.stringify({
            id: userProfile.id,
            first_name: userProfile.first_name,
            last_name: userProfile.last_name,
            role: userProfile.role,
            organization_id: userProfile.organization_id,
            classroom_id: userProfile.classroom_id,
            logged_in_at: now.toISOString(),
            expires_at: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
        }));
        if (userProfile.role === 'teacher') {
            router.push(`/${orgSlug}/prof/dashboard`);
        } else {
            router.push(`/${orgSlug}/student/dashboard`);
        }
    };

    if (loading) return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center"><Loader2 className="w-8 h-8 text-teal-400 animate-spin" /></div>;
    if (!org) return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-white"><h1 className="text-2xl font-bold">Établissement introuvable</h1></div>;

    // ═══════════════════════ PIN CREATE SCREEN ═══════════════════════
    if (mode === 'pin_create') {
        return (
            <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center px-4">
                <div className="fixed inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-30%] right-[-20%] w-[60%] h-[60%] bg-teal-600/8 blur-[150px] rounded-full" />
                    <div className="absolute bottom-[-30%] left-[-20%] w-[50%] h-[50%] bg-indigo-600/8 blur-[150px] rounded-full" />
                </div>

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-teal-500/20">
                            <Lock className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">
                            {pinStep === 'create' ? 'Créer votre PIN' : 'Confirmer votre PIN'}
                        </h1>
                        <p className="text-sm text-slate-400">
                            {pinStep === 'create'
                                ? `Bonjour ${userProfile?.first_name} ! Choisissez un PIN à 4 chiffres pour sécuriser votre compte.`
                                : 'Entrez à nouveau votre PIN pour confirmer.'
                            }
                        </p>
                    </div>

                    <div className="flex justify-center gap-4 mb-8">
                        {(pinStep === 'create' ? pin : pinConfirm).map((digit, i) => (
                            <input
                                key={`${pinStep}-${i}`}
                                ref={(pinStep === 'create' ? pinRefs : pinConfirmRefs)[i]}
                                type="password"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={e => handlePinInput(i, e.target.value, pinStep === 'confirm')}
                                onKeyDown={e => handlePinKeyDown(i, e, pinStep === 'confirm')}
                                className={`pin-input ${digit ? 'filled' : ''}`}
                            />
                        ))}
                    </div>

                    <Button
                        onClick={handleCreatePin}
                        disabled={saving || (pinStep === 'create' ? pin.join('').length !== 4 : pinConfirm.join('').length !== 4)}
                        className="w-full h-12 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-teal-600/25"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
                        {pinStep === 'create' ? 'Suivant' : 'Créer mon PIN'}
                    </Button>

                    {pinStep === 'confirm' && (
                        <Button variant="ghost" className="w-full mt-3 text-slate-400" onClick={() => { setPinStep('create'); setPin(['', '', '', '']); setTimeout(() => pinRefs[0].current?.focus(), 100); }}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Modifier le PIN
                        </Button>
                    )}
                </motion.div>
            </div>
        );
    }

    // ═══════════════════════ PIN VERIFY SCREEN ═══════════════════════
    if (mode === 'pin_verify') {
        return (
            <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center px-4">
                <div className="fixed inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-30%] right-[-20%] w-[60%] h-[60%] bg-indigo-600/8 blur-[150px] rounded-full" />
                </div>

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-indigo-500/20">
                            <UserCircle className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-1">
                            {userProfile?.first_name} {userProfile?.last_name}
                        </h1>
                        <p className="text-sm text-slate-400">
                            Entrez votre PIN pour continuer
                        </p>
                        <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300">
                            {userProfile?.role === 'teacher' ? '👨‍🏫 Professeur' : '🎓 Étudiant'}
                        </span>
                    </div>

                    <div className="flex justify-center gap-4 mb-8">
                        {pin.map((digit, i) => (
                            <input
                                key={i}
                                ref={pinRefs[i]}
                                type="password"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={e => handlePinInput(i, e.target.value)}
                                onKeyDown={e => handlePinKeyDown(i, e)}
                                className={`pin-input ${digit ? 'filled' : ''}`}
                            />
                        ))}
                    </div>

                    <Button
                        onClick={handleVerifyPin}
                        disabled={saving || pin.join('').length !== 4}
                        className="w-full h-12 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Lock className="w-5 h-5 mr-2" />}
                        Se connecter
                    </Button>

                    <Button variant="ghost" className="w-full mt-3 text-slate-400" onClick={() => { setMode('access_code'); setPin(['', '', '', '']); setUserProfile(null); setAccessCode(''); }}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Changer de compte
                    </Button>
                </motion.div>
            </div>
        );
    }

    // ═══════════════════════ MAIN LOGIN SCREEN ═══════════════════════
    return (
        <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center px-4">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-30%] right-[-20%] w-[60%] h-[60%] bg-teal-600/6 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-30%] left-[-20%] w-[50%] h-[50%] bg-indigo-600/6 blur-[150px] rounded-full" />
            </div>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    {org.logo_url ? (
                        <img src={org.logo_url} alt={org.name} className="w-16 h-16 rounded-2xl mx-auto mb-4 object-cover shadow-2xl" />
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-indigo-500/20">
                            <GraduationCap className="w-8 h-8 text-white" />
                        </div>
                    )}
                    <h1 className="text-2xl font-bold text-white">{org.name}</h1>
                    <p className="text-sm text-slate-400 mt-1">Connexion à votre espace</p>
                </div>

                <AnimatePresence mode="wait">
                    {/* ═══ CHOOSE MODE ═══ */}
                    {mode === 'choose' && (
                        <motion.div key="choose" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                            <button
                                onClick={() => setMode('access_code')}
                                className="w-full p-4 rounded-2xl bg-gradient-to-r from-teal-600/10 to-emerald-600/10 border border-teal-500/20 hover:border-teal-500/40 transition-all flex items-center gap-4 group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-600/20 group-hover:scale-105 transition-transform">
                                    <KeyRound className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="font-semibold text-white">Professeur / Étudiant</p>
                                    <p className="text-xs text-slate-400">Connectez-vous avec votre code d'accès</p>
                                </div>
                            </button>

                            <button
                                onClick={() => setMode('admin')}
                                className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/30 transition-all flex items-center gap-4 group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition-transform">
                                    <ShieldCheck className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="font-semibold text-white">Administration</p>
                                    <p className="text-xs text-slate-400">Accès avec email et mot de passe</p>
                                </div>
                            </button>
                        </motion.div>
                    )}

                    {/* ═══ ACCESS CODE ═══ */}
                    {mode === 'access_code' && (
                        <motion.div key="access" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                                <div className="text-center">
                                    <KeyRound className="w-8 h-8 text-teal-400 mx-auto mb-2" />
                                    <h2 className="font-bold text-white">Code d'accès</h2>
                                    <p className="text-xs text-slate-400 mt-1">Entrez le code à 12 caractères fourni par votre administration</p>
                                </div>

                                <Input
                                    value={accessCode}
                                    onChange={e => setAccessCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))}
                                    onKeyDown={e => e.key === 'Enter' && handleAccessCodeLogin()}
                                    placeholder="XXXX XXXX XXXX"
                                    maxLength={12}
                                    className="bg-white/5 border-white/10 text-white h-14 rounded-xl text-center text-xl font-mono tracking-[0.3em] placeholder:tracking-[0.2em] placeholder:text-slate-600"
                                    autoFocus
                                />

                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>{accessCode.length}/12 caractères</span>
                                    <div className="flex gap-1">
                                        {Array.from({ length: 12 }).map((_, i) => (
                                            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i < accessCode.length ? 'bg-teal-400' : 'bg-white/10'}`} />
                                        ))}
                                    </div>
                                </div>

                                <Button
                                    onClick={handleAccessCodeLogin}
                                    disabled={saving || accessCode.length !== 12}
                                    className="w-full h-12 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-teal-600/25"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <KeyRound className="w-5 h-5 mr-2" />}
                                    Se connecter
                                </Button>
                            </div>

                            <Button variant="ghost" className="w-full text-slate-400" onClick={() => { setMode('choose'); setAccessCode(''); }}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Retour
                            </Button>
                        </motion.div>
                    )}

                    {/* ═══ ADMIN LOGIN ═══ */}
                    {mode === 'admin' && (
                        <motion.div key="admin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                                <div className="text-center">
                                    <ShieldCheck className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                                    <h2 className="font-bold text-white">Espace Administration</h2>
                                </div>

                                <div className="space-y-3">
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <Input
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="Email administrateur"
                                            className="pl-10 bg-white/5 border-white/10 text-white h-12 rounded-xl"
                                            onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                                        />
                                    </div>

                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <Input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="Mot de passe"
                                            className="pl-10 pr-10 bg-white/5 border-white/10 text-white h-12 rounded-xl"
                                            onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                                        />
                                        <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleAdminLogin}
                                    disabled={saving || !email || !password}
                                    className="w-full h-12 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
                                    Connexion admin
                                </Button>

                                <button
                                    onClick={() => setMode('forgot_password')}
                                    className="w-full text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-1"
                                >
                                    Mot de passe oublié ?
                                </button>
                            </div>

                            <Button variant="ghost" className="w-full text-slate-400" onClick={() => { setMode('choose'); setEmail(''); setPassword(''); }}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Retour
                            </Button>
                        </motion.div>
                    )}

                    {/* ═══ FORGOT PASSWORD ═══ */}
                    {mode === 'forgot_password' && (
                        <motion.div key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                                <div className="text-center">
                                    <Mail className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                                    <h2 className="font-bold text-white">Réinitialiser le mot de passe</h2>
                                    <p className="text-xs text-slate-400 mt-1">Entrez votre email. Vous recevrez un lien de réinitialisation.</p>
                                </div>

                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="Email administrateur"
                                        className="pl-10 bg-white/5 border-white/10 text-white h-12 rounded-xl"
                                        onKeyDown={e => e.key === 'Enter' && handleForgotPassword()}
                                        autoFocus
                                    />
                                </div>

                                <Button
                                    onClick={handleForgotPassword}
                                    disabled={saving || !email}
                                    className="w-full h-12 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-amber-600/25"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Mail className="w-5 h-5 mr-2" />}
                                    Envoyer le lien
                                </Button>
                            </div>

                            <Button variant="ghost" className="w-full text-slate-400" onClick={() => setMode('admin')}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Retour à la connexion
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer */}
                <p className="text-center text-[10px] text-slate-600 mt-6">
                    Propulsé par <span className="text-teal-500 font-semibold">CampusFlow</span>
                </p>
            </motion.div>
        </div>
    );
}
