'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Loader2, Eye, EyeOff, KeyRound, ShieldCheck, ArrowLeft, Lock, UserCircle, Mail, CheckCircle2, ShieldAlert, Upload, Image, FileText, Send, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { SessionManager, buildSessionFromRpc } from '@/lib/session';
import { isCustomDomain } from '@/lib/custom-domain';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { IziTeachLogo } from '@/components/brand/iziteach-logo';

type LoginMode = 'choose' | 'admin' | 'access_code' | 'pin_create' | 'pin_verify' | 'dashboard_redirect' | 'forgot_password' | 'reset_password' | 'reset_success' | 'admin_recovery';

/** Check if an existing session is still valid (not expired) */
export function isSessionValid(): boolean {
    return !SessionManager.isExpired();
}

/** Get the current session or null if expired */
export function getSession() {
    return SessionManager.get();
}

interface UserProfile {
    id: string;
    first_name: string;
    last_name: string;
    role: 'teacher' | 'student';
    pin_set: boolean;
    organization_id: string;
    classroom_id?: string;
    approval_status?: 'pending' | 'approved' | 'rejected' | 'info_needed';
    is_inscription_request?: boolean;  // vrai si le profil vient de inscription_requests (pas encore validé)
    insc_pin_code?: string;            // PIN brut stocké lors de l'inscription (pour vérification offline)
}

export default function LoginPage() {
    const orgSlug = useOrgSlug();
    const router = useRouter();
    const [org, setOrg] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<LoginMode>('choose');
    const [saving, setSaving] = useState(false);

    // Admin login
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Reset password
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPwd, setShowNewPwd] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    // Access code login
    const [accessCode, setAccessCode] = useState('');

    // Admin recovery form states
    const [recFirstName, setRecFirstName] = useState('');
    const [recLastName, setRecLastName] = useState('');
    const [recWhatLost, setRecWhatLost] = useState<'email' | 'password' | 'both'>('password');
    const [recNewEmail, setRecNewEmail] = useState('');
    const [recIdPhoto, setRecIdPhoto] = useState<string | null>(null);
    const [recSubmitting, setRecSubmitting] = useState(false);
    const [recSubmitted, setRecSubmitted] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Veuillez sélectionner un fichier image valide (JPG, PNG, WEBP).');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setRecIdPhoto(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleAdminRecoverySubmit = async () => {
        if (!recFirstName.trim() || !recLastName.trim()) {
            toast.error('Prénom et nom obligatoires.');
            return;
        }
        if ((recWhatLost === 'email' || recWhatLost === 'both') && !recNewEmail.trim()) {
            toast.error('Veuillez renseigner votre nouvel e-mail de remplacement.');
            return;
        }
        if (!recIdPhoto) {
            toast.error('Veuillez joindre la photo claire de votre pièce d\'identité.');
            return;
        }

        setRecSubmitting(true);
        try {
            const { data: inserted, error: insertErr } = await supabase
                .from('admin_recovery_requests')
                .insert({
                    org_id: org.id,
                    org_slug: org.slug,
                    org_name: org.name,
                    owner_first_name: recFirstName.trim(),
                    owner_last_name: recLastName.trim(),
                    what_lost: recWhatLost,
                    new_email: recNewEmail.trim() || null,
                    status: 'pending'
                })
                .select()
                .single();

            if (insertErr) throw insertErr;

            // Stockage éphémère local pour vérification visuelle unique
            if (typeof window !== 'undefined') {
                const reqId = inserted?.id || org.id;
                localStorage.setItem(`campusflow_recovery_id_photo_${reqId}`, recIdPhoto);
                localStorage.setItem(`campusflow_recovery_id_photo_${org.id}`, recIdPhoto);
                localStorage.setItem(`campusflow_recovery_id_photo_${org.slug}`, recIdPhoto);
            }

            setRecSubmitted(true);
            toast.success('Demande transmise au Superadmin avec succès !');
        } catch (err: any) {
            toast.error('Erreur : ' + err.message);
        } finally {
            setRecSubmitting(false);
        }
    };

    // PIN
    const [pin, setPin] = useState(['', '', '', '']);
    const [pinConfirm, setPinConfirm] = useState(['', '', '', '']);
    const [pinStep, setPinStep] = useState<'create' | 'confirm'>('create');
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [showPinHelp, setShowPinHelp] = useState(false);
    const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
    const pinConfirmRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

    useEffect(() => {
        (async () => {
            const { data: o } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single();
            setOrg(o);
            setLoading(false);
        })();
    }, [orgSlug]);

    // ═══ Detect password recovery token from Supabase email link ═══
    useEffect(() => {
        const handleRecovery = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const errorParam = urlParams.get('error');
            const errorDesc = urlParams.get('error_description');

            // Handle Supabase error params
            if (errorParam) {
                toast.error(errorDesc || 'Le lien de réinitialisation a expiré');
                window.history.replaceState(null, '', window.location.pathname);
                return;
            }

            // 1. PKCE flow: Supabase redirects with ?code=xxx
            const code = urlParams.get('code');
            if (code) {
                try {
                    const { error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) {
                        toast.error('Le lien a expiré. Veuillez en demander un nouveau.');
                        window.history.replaceState(null, '', window.location.pathname);
                        return;
                    }
                    setMode('reset_password');
                    window.history.replaceState(null, '', window.location.pathname);
                    return;
                } catch {
                    toast.error('Erreur lors de la vérification du lien');
                }
            }

            // 2. Implicit flow: Supabase redirects with #access_token=...&type=recovery
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const type = hashParams.get('type');
            if (type === 'recovery') {
                setMode('reset_password');
                return;
            }
        };

        handleRecovery();

        // 3. Listen for PASSWORD_RECOVERY event (works with both flows)
        // ⚠️ setTimeout defers setState to next tick — prevents React #310
        // "Cannot update a component while rendering a different component"
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setTimeout(() => setMode('reset_password'), 0);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // ═══ ADMIN LOGIN (email/password) ═══
    const handleAdminLogin = async () => {
        if (!email || !password) { toast.error('Email et mot de passe requis'); return; }
        if (!org) { toast.error('Établissement non trouvé. Rechargez la page.'); return; }
        setSaving(true);
        try {
            console.log('[Login] Attempting admin login for:', email, '| org:', orgSlug, '| owner_id:', org.owner_id);
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                console.error('[Login] Auth error:', error.status, error.message);
                throw error;
            }
            if (data.user) {
                console.log('[Login] Auth success. user.id:', data.user.id, '| org.owner_id:', org.owner_id, '| match:', org.owner_id === data.user.id);
                // Check if this user owns the org
                if (org.owner_id === data.user.id) {
                    toast.success('Bienvenue, administrateur !');
                    // Custom domain: navigate without slug in URL
                    router.push(isCustomDomain() ? '/admin' : `/${orgSlug}/admin`);
                } else {
                    console.warn('[Login] Owner mismatch. user.id:', data.user.id, '!== owner_id:', org.owner_id);
                    toast.error('Ce compte n\'est pas administrateur de cet établissement');
                    await supabase.auth.signOut();
                }
            }
        } catch (e: any) {
            const msg = e.message || 'Erreur inconnue';
            if (msg === 'Invalid login credentials' || e.status === 400) {
                toast.error('Email ou mot de passe incorrect');
            } else if (msg.includes('rate limit') || e.status === 429) {
                toast.error('Trop de tentatives. Veuillez patienter quelques minutes.');
            } else if (msg.includes('Email not confirmed')) {
                toast.error('Veuillez confirmer votre email avant de vous connecter.');
            } else {
                toast.error(msg);
            }
        }
        setSaving(false);
    };
    // ═══ FORGOT PASSWORD (admin) ═══
    const handleForgotPassword = async () => {
        if (!email) { toast.error('Entrez votre email administrateur'); return; }
        setSaving(true);
        try {
            // redirectTo must point back to THIS page so the recovery token is processed here
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/${orgSlug}/login`,
            });
            if (error) throw error;
            setResetSent(true);
            toast.success('📧 Email de réinitialisation envoyé !');
        } catch (e: any) {
            toast.error(e.message || "Erreur lors de l'envoi");
        }
        setSaving(false);
    };

    // ═══ UPDATE PASSWORD (after clicking email link) ═══
    const handleUpdatePassword = async () => {
        if (!newPassword || !confirmPassword) { toast.error('Remplissez les deux champs'); return; }
        if (newPassword.length < 6) { toast.error('Le mot de passe doit contenir au moins 6 caractères'); return; }
        if (newPassword !== confirmPassword) { toast.error('Les mots de passe ne correspondent pas'); return; }
        setSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setMode('reset_success');
            toast.success('✅ Mot de passe mis à jour !');
            // Clean the URL hash so token is not reused
            window.history.replaceState(null, '', window.location.pathname);
        } catch (e: any) {
            toast.error(e.message || 'Erreur lors de la mise à jour');
        }
        setSaving(false);
    };

    // ═══ ACCESS CODE & MATRICULE LOGIN ═══
    const handleAccessCodeLogin = async () => {
        const raw = accessCode.trim().toUpperCase();
        const code = raw.replace(/\s+/g, '');
        if (code.length < 3) { toast.error('Code d\'accès ou matricule trop court'); return; }
        if (!org) { toast.error('Établissement non trouvé'); return; }
        setSaving(true);
        try {
            // 1. Try teacher first (by access_code)
            const { data: teacher } = await supabase
                .from('teacher_profiles')
                .select('id, first_name, last_name, pin_set, organization_id, is_active, access_code')
                .eq('organization_id', org.id)
                .eq('access_code', code)
                .maybeSingle();

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

            // 2. Try student (by access_code OR by matricule with/without dashes)
            const cleanMat = code.replace(/-/g, '');
            const { data: student } = await supabase
                .from('student_profiles')
                .select('id, first_name, last_name, pin_set, organization_id, classroom_id, is_active, matricule, access_code')
                .eq('organization_id', org.id)
                .or(`access_code.eq.${code},matricule.eq.${code},matricule.ilike.${code},matricule.ilike.%${cleanMat}%`)
                .maybeSingle();

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

            // 3. Fallback : chercher dans inscription_requests (inscription via landing page)
            const { data: inscReq } = await supabase
                .from('inscription_requests')
                .select('*')
                .eq('organization_id', org.id)
                .or(`access_code.eq.${code},matricule.eq.${code}`)
                .maybeSingle();

            if (inscReq) {
                // Upsert via RPC server-side : le PIN est hashé bcrypt côté Postgres
                const { data: spRows } = await supabase.rpc('upsert_student_from_inscription', {
                    p_access_code: inscReq.access_code || code,
                    p_org_id:      org.id,
                });
                const sp = Array.isArray(spRows) ? spRows[0] : spRows;

                if (sp) {
                    const profile: UserProfile = { id: sp.id, first_name: sp.first_name, last_name: sp.last_name, role: 'student', pin_set: sp.pin_set || false, organization_id: sp.organization_id, classroom_id: sp.classroom_id };
                    setUserProfile(profile);
                    if (!sp.pin_set) {
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
            }

            toast.error('Code d\'accès ou matricule non trouvé');
        } catch (e: any) {
            toast.error(e.message || 'Erreur de connexion');
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
            // ── Cas spécial : étudiant en attente (inscription_requests) ──────
            // La RPC verify_pin_and_create_session cherche dans student_profiles
            // mais cet étudiant n'y est pas encore (dossier en attente de validation).
            // On vérifie le PIN directement contre le code stocké.
            if (userProfile?.is_inscription_request) {
                const storedPin = userProfile.insc_pin_code || '';
                // Le PIN est stocké en clair dans inscription_requests (pas de bcrypt ici)
                const pinOk = storedPin === pinStr;
                if (!pinOk) {
                    toast.error('PIN incorrect');
                    setPin(['', '', '', '']);
                    setTimeout(() => pinRefs[0].current?.focus(), 100);
                    setSaving(false);
                    return;
                }
                // PIN correct → session manuelle en attente
                toast.success(`Bienvenue, ${userProfile.first_name} !`);
                await redirectToDashboard();
                setSaving(false);
                return;
            }

            // ── Cas normal : teacher ou student validé (student_profiles) ──────
            const { data: sessionData, error } = await supabase.rpc('verify_pin_and_create_session', {
                p_profile_id: userProfile!.id,
                p_role: userProfile!.role,
                p_pin: pinStr,
            });
            if (error) throw error;

            if (sessionData) {
                toast.success(`Bienvenue, ${userProfile!.first_name} !`);
                await redirectToDashboard(sessionData);
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

    const redirectToDashboard = async (rpcSession?: any) => {
        if (!userProfile) return;

        // Re-fetch classroom_id + photo_url depuis la DB
        let freshClassroomId = userProfile.classroom_id;
        let photoUrl: string | null = null;
        if (userProfile.role === 'student') {
            const { data: freshProfile } = await supabase.from('student_profiles')
                .select('classroom_id, photo_url').eq('id', userProfile.id).single();
            if (freshProfile?.classroom_id) freshClassroomId = freshProfile.classroom_id;
            if (freshProfile?.photo_url) photoUrl = freshProfile.photo_url;
        } else {
            const { data: freshProfile } = await supabase.from('teacher_profiles')
                .select('photo_url').eq('id', userProfile.id).single();
            if (freshProfile?.photo_url) photoUrl = freshProfile.photo_url;
        }

        if (rpcSession?.session_token) {
            SessionManager.set(buildSessionFromRpc(rpcSession, {
                first_name:      userProfile.first_name,
                last_name:       userProfile.last_name,
                classroom_id:    freshClassroomId,
                photo_url:       photoUrl,
                approval_status: userProfile.approval_status,
            }));
        } else {
            SessionManager.set({
                session_token:   '',
                profile_id:      userProfile.id,
                role:            userProfile.role as 'teacher' | 'student' | 'admin',
                org_id:          userProfile.organization_id,
                expires_at:      new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
                first_name:      userProfile.first_name,
                last_name:       userProfile.last_name,
                classroom_id:    freshClassroomId,
                photo_url:       photoUrl,
                logged_in_at:    new Date().toISOString(),
                approval_status: userProfile.approval_status,
            });
        }
        // Unified SPA — all roles go to /campus
        // Custom domain: navigate without slug in URL
        router.push(isCustomDomain() ? '/campus' : `/${orgSlug}/campus`);
    };

    if (loading) return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center"><Loader2 className="w-8 h-8 text-teal-400 animate-spin" /></div>;
    if (!org) return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-white"><h1 className="text-2xl font-bold">Établissement introuvable</h1></div>;

    // ═══════════════════════ RESET PASSWORD SCREEN ═══════════════════════
    if (mode === 'reset_password') {
        return (
            <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center px-4">
                <div className="fixed inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-30%] right-[-20%] w-[60%] h-[60%] bg-emerald-600/8 blur-[150px] rounded-full" />
                    <div className="absolute bottom-[-30%] left-[-20%] w-[50%] h-[50%] bg-teal-600/8 blur-[150px] rounded-full" />
                </div>
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm">
                    <div className="text-center mb-6">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-500/20">
                            <ShieldCheck className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Nouveau mot de passe</h1>
                        <p className="text-sm text-slate-400">Choisissez un mot de passe sécurisé (6 caractères minimum)</p>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                        <div>
                            <Label className="text-slate-400 text-xs">Nouveau mot de passe</Label>
                            <div className="relative mt-1">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <Input
                                    type={showNewPwd ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="pl-10 pr-10 bg-white/5 border-white/10 text-white h-12 rounded-xl"
                                    autoFocus
                                />
                                <button onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <Label className="text-slate-400 text-xs">Confirmer le mot de passe</Label>
                            <div className="relative mt-1">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <Input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="pl-10 bg-white/5 border-white/10 text-white h-12 rounded-xl"
                                    onKeyDown={e => e.key === 'Enter' && handleUpdatePassword()}
                                />
                            </div>
                            {confirmPassword && newPassword !== confirmPassword && (
                                <p className="text-xs text-red-400 mt-1">Les mots de passe ne correspondent pas</p>
                            )}
                            {confirmPassword && newPassword === confirmPassword && newPassword.length >= 6 && (
                                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Mots de passe identiques</p>
                            )}
                        </div>

                        {/* Password strength */}
                        <div className="flex gap-1">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                                    newPassword.length === 0 ? 'bg-white/10' :
                                    newPassword.length < 6 ? (i <= 1 ? 'bg-red-500' : 'bg-white/10') :
                                    newPassword.length < 8 ? (i <= 2 ? 'bg-amber-500' : 'bg-white/10') :
                                    newPassword.length < 12 ? (i <= 3 ? 'bg-emerald-500' : 'bg-white/10') :
                                    'bg-emerald-400'
                                }`} />
                            ))}
                        </div>

                        <Button
                            onClick={handleUpdatePassword}
                            disabled={saving || newPassword.length < 6 || newPassword !== confirmPassword}
                            className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/25"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
                            Enregistrer le nouveau mot de passe
                        </Button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ═══════════════════════ RESET SUCCESS SCREEN ═══════════════════════
    if (mode === 'reset_success') {
        return (
            <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center px-4">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-sm">
                    <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
                        <div className="w-20 h-20 rounded-full bg-emerald-600/20 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h2 className="font-bold text-2xl text-white mb-2">Mot de passe mis à jour !</h2>
                        <p className="text-sm text-slate-400 mb-6">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
                        <Button
                            onClick={() => { setMode('admin'); setNewPassword(''); setConfirmPassword(''); }}
                            className="w-full h-12 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl text-white font-bold shadow-lg shadow-indigo-600/25"
                        >
                            <ShieldCheck className="w-5 h-5 mr-2" /> Se connecter
                        </Button>
                    </div>
                </motion.div>
            </div>
        );
    }

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

                    <div className="flex items-center justify-between mt-3 text-xs">
                        <button type="button" onClick={() => setShowPinHelp(true)} className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline">
                            💡 PIN oublié ?
                        </button>
                        <button type="button" onClick={() => { setMode('access_code'); setPin(['', '', '', '']); setUserProfile(null); setAccessCode(''); }} className="text-slate-400 hover:text-white transition flex items-center gap-1">
                            <ArrowLeft className="w-3 h-3" /> Changer de compte
                        </button>
                    </div>

                    {/* Modal PIN Oublié */}
                    <AnimatePresence>
                        {showPinHelp && (
                            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#111622] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
                                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                                        <Lock className="w-6 h-6" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h3 className="font-bold text-white text-lg">PIN oublié ?</h3>
                                        <p className="text-xs text-slate-300 leading-relaxed">
                                            Contactez la direction ou un administrateur de votre établissement <strong>({org?.name || 'IziTeach'})</strong>.
                                        </p>
                                        <div className="bg-black/30 p-3 rounded-xl border border-white/5 text-left text-xs text-slate-400 space-y-1.5 mt-2">
                                            <p className="font-semibold text-amber-300">Procédure simple :</p>
                                            <p>1. L'admin réinitialise votre PIN en 1 clic dans son panneau.</p>
                                            <p>2. Vous entrez votre Code d'accès et créez un nouveau PIN à 4 chiffres.</p>
                                        </div>
                                    </div>
                                    <Button onClick={() => setShowPinHelp(false)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl h-10">
                                        J'ai compris
                                    </Button>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
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
                        <IziTeachLogo variant="symbol" size="lg" className="mx-auto mb-4" />
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

                    {/* ═══ ACCESS CODE & MATRICULE ═══ */}
                    {mode === 'access_code' && (
                        <motion.div key="access" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                                <div className="text-center">
                                    <KeyRound className="w-8 h-8 text-teal-400 mx-auto mb-2" />
                                    <h2 className="font-bold text-white">Code d&apos;accès ou Matricule</h2>
                                    <p className="text-xs text-slate-400 mt-1">Entrez votre code d&apos;accès (12 car.) ou votre matricule scolaire (ex: STU-MSRT5NA8)</p>
                                </div>

                                <Input
                                    value={accessCode}
                                    onChange={e => setAccessCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24))}
                                    onKeyDown={e => e.key === 'Enter' && handleAccessCodeLogin()}
                                    placeholder="Ex: STUMSRT5NA8 ou CODE..."
                                    maxLength={24}
                                    className="bg-white/5 border-white/10 text-white h-14 rounded-xl text-center text-lg font-mono tracking-[0.15em] placeholder:tracking-normal placeholder:text-slate-600"
                                    autoFocus
                                />

                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>{accessCode.length} caractère(s) saisi(s)</span>
                                    <span className="text-[11px] text-teal-400/80">Code d&apos;accès ou Matricule</span>
                                </div>

                                <Button
                                    onClick={handleAccessCodeLogin}
                                    disabled={saving || accessCode.trim().length < 3}
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

                                <div className="space-y-1.5 pt-1">
                                    <button
                                        onClick={() => setMode('forgot_password')}
                                        className="w-full text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                    >
                                        Mot de passe oublié ?
                                    </button>
                                    <button
                                        onClick={() => { setMode('admin_recovery'); setRecSubmitted(false); }}
                                        className="w-full text-[11px] text-amber-400 hover:text-amber-300 transition-colors flex items-center justify-center gap-1 font-semibold"
                                    >
                                        <ShieldAlert className="w-3.5 h-3.5" /> Identifiants perdus (Assistance Superadmin)
                                    </button>
                                </div>
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
                                    <p className="text-xs text-slate-400 mt-1">
                                        {resetSent
                                            ? 'Un email a été envoyé ! Vérifiez votre boîte de réception (et les spams).'
                                            : 'Entrez votre email. Vous recevrez un lien de réinitialisation.'
                                        }
                                    </p>
                                </div>

                                {!resetSent ? (
                                    <>
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
                                    </>
                                ) : (
                                    <div className="text-center py-4">
                                        <div className="w-16 h-16 rounded-full bg-emerald-600/20 flex items-center justify-center mx-auto mb-3">
                                            <Mail className="w-8 h-8 text-emerald-400" />
                                        </div>
                                        <p className="text-sm text-emerald-300 font-medium">Email envoyé à</p>
                                        <p className="text-xs text-slate-400 mt-1">{email}</p>
                                        <button
                                            onClick={() => setResetSent(false)}
                                            className="text-xs text-amber-400 hover:text-amber-300 mt-3"
                                        >
                                            Renvoyer l&apos;email
                                        </button>
                                    </div>
                                )}
                            </div>

                            <Button variant="ghost" className="w-full text-slate-400" onClick={() => { setMode('admin'); setResetSent(false); }}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Retour à la connexion
                            </Button>
                        </motion.div>
                    )}

                    {/* ═══ ADMIN RECOVERY (Feature 2) ═══ */}
                    {mode === 'admin_recovery' && (
                        <motion.div key="recovery" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div className="p-6 rounded-2xl bg-white/[0.03] border border-amber-500/20 space-y-4">
                                {!recSubmitted ? (
                                    <>
                                        <div className="text-center">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-2 text-amber-400 shadow-lg shadow-amber-500/10">
                                                <ShieldAlert className="w-6 h-6" />
                                            </div>
                                            <h2 className="font-bold text-white text-base">Récupérer mes accès admin</h2>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Fournissez une pièce d'identité pour certification visuelle par le Superadmin.
                                            </p>
                                        </div>

                                        <div className="space-y-3 text-xs">
                                            {/* Noms du créateur */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <Label className="text-slate-300 text-[11px] mb-1 block">Prénom</Label>
                                                    <Input
                                                        value={recFirstName}
                                                        onChange={e => setRecFirstName(e.target.value)}
                                                        placeholder="Prénom déclaré"
                                                        className="h-10 bg-white/5 border-white/10 text-white rounded-xl text-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-slate-300 text-[11px] mb-1 block">Nom</Label>
                                                    <Input
                                                        value={recLastName}
                                                        onChange={e => setRecLastName(e.target.value)}
                                                        placeholder="Nom déclaré"
                                                        className="h-10 bg-white/5 border-white/10 text-white rounded-xl text-xs"
                                                    />
                                                </div>
                                            </div>

                                            {/* Élément perdu */}
                                            <div>
                                                <Label className="text-slate-300 text-[11px] mb-1.5 block font-bold">
                                                    Que souhaitez-vous réinitialiser ?
                                                </Label>
                                                <div className="grid grid-cols-3 gap-1.5">
                                                    {([
                                                        { id: 'password', label: 'Mot de passe' },
                                                        { id: 'email', label: 'E-mail' },
                                                        { id: 'both', label: 'Les deux' },
                                                    ] as const).map(item => (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            onClick={() => setRecWhatLost(item.id)}
                                                            className={cn(
                                                                "p-2 rounded-xl text-[10px] font-bold border transition text-center",
                                                                recWhatLost === item.id
                                                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/10"
                                                                    : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
                                                            )}
                                                        >
                                                            {item.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Nouvel email si concerné */}
                                            {(recWhatLost === 'email' || recWhatLost === 'both') && (
                                                <div>
                                                    <Label className="text-slate-300 text-[11px] mb-1 block">
                                                        Nouvel e-mail de remplacement :
                                                    </Label>
                                                    <Input
                                                        type="email"
                                                        value={recNewEmail}
                                                        onChange={e => setRecNewEmail(e.target.value)}
                                                        placeholder="nouveau-contact@ecole.com"
                                                        className="h-10 bg-white/5 border-white/10 text-white rounded-xl text-xs"
                                                    />
                                                </div>
                                            )}

                                            {/* Upload photo pièce d'identité */}
                                            <div>
                                                <Label className="text-slate-300 text-[11px] mb-1.5 block font-bold">
                                                    Photo claire de votre pièce d'identité :
                                                </Label>
                                                <input
                                                    type="file"
                                                    ref={photoInputRef}
                                                    accept="image/*"
                                                    onChange={handlePhotoSelect}
                                                    className="hidden"
                                                />
                                                {!recIdPhoto ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => photoInputRef.current?.click()}
                                                        className="w-full p-4 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 transition text-center space-y-1.5"
                                                    >
                                                        <Upload className="w-5 h-5 text-amber-400 mx-auto" />
                                                        <span className="text-[11px] font-bold text-amber-300 block">
                                                            Ajouter une photo (CNI, Passeport...)
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 block">
                                                            Format JPG, PNG (Max 5 Mo)
                                                        </span>
                                                    </button>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40 h-28 flex items-center justify-center">
                                                            <img
                                                                src={recIdPhoto}
                                                                alt="Aperçu pièce"
                                                                className="h-full w-auto object-contain"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => photoInputRef.current?.click()}
                                                            className="text-[10px] text-amber-400 hover:text-amber-300 underline block mx-auto"
                                                        >
                                                            Changer la photo
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Reassuring privacy notice */}
                                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/8 text-[10px] text-slate-400 leading-relaxed">
                                                🔒 Votre pièce d&apos;identité est traitée de manière éphémère et sécurisée sur votre appareil pour attester de l&apos;authenticité de votre demande. Elle ne sera jamais conservée de manière permanente sur nos serveurs ni stockée dans une base de données.
                                            </div>

                                            <Button
                                                onClick={handleAdminRecoverySubmit}
                                                disabled={recSubmitting || !recIdPhoto}
                                                className="w-full h-11 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-amber-600/25 mt-2"
                                            >
                                                {recSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                                Transmettre ma demande au Superadmin
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-4 space-y-3">
                                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                                            <CheckCircle2 className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-base font-bold text-white">Demande transmise avec succès !</h3>
                                        <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                                            Votre demande a été envoyée pour {org.name}. Le Superadmin vérifiera visuellement l'authenticité de votre pièce et appliquera la réinitialisation demandée.
                                        </p>
                                        <Button
                                            onClick={() => setMode('admin')}
                                            className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs mt-2"
                                        >
                                            Retour à la connexion
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <Button variant="ghost" className="w-full text-slate-400" onClick={() => setMode('admin')}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Annuler
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer — Powered by IziTeach */}
                <div className="flex items-center justify-center gap-2 mt-6">
                    <IziTeachLogo variant="symbol" size="xs" />
                    <p className="text-[10px] text-slate-600">
                        Propulsé par <span className="text-teal-500 font-semibold">IziTeach</span> • Enseigner simplement
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
