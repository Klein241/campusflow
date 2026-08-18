import { IziTeachLogo } from '@/components/brand/iziteach-logo';
'use client';

import { useState, useEffect } from 'react';
import { Mail, Lock, Loader2, Eye, EyeOff, ArrowLeft, KeyRound, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

type Mode = 'login' | 'forgot' | 'reset_password' | 'reset_success';

export default function GlobalLogin() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState<Mode>('login');
    const [resetSent, setResetSent] = useState(false);

    // Reset password fields
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPwd, setShowNewPwd] = useState(false);

    // ═══ Detect recovery token from Supabase email link ═══
    useEffect(() => {
        // Supabase redirects with hash: #access_token=...&type=recovery
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');
        if (type === 'recovery') {
            setMode('reset_password');
            return;
        }

        // Also listen for auth state change
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setMode('reset_password');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // ═══ LOGIN ═══
    const submit = async () => {
        if (!email.trim() || !password.trim()) { toast.error('Remplissez tous les champs'); return; }
        setSubmitting(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;

            const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', data.user.id).single();
            if (profile?.organization_id) {
                const { data: org } = await supabase.from('organizations').select('slug').eq('id', profile.organization_id).single();
                if (org?.slug) {
                    if (profile.role === 'director' || profile.role === 'superadmin') {
                        router.push(`/${org.slug}/admin`);
                    } else {
                        router.push(`/${org.slug}`);
                    }
                    return;
                }
            }
            router.push('/');
            toast.success('Connecté !');
        } catch (e: any) {
            toast.error(e.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect' : e.message);
        } finally { setSubmitting(false); }
    };

    // ═══ FORGOT PASSWORD ═══
    const handleForgotPassword = async () => {
        if (!email.trim()) { toast.error('Entrez votre email'); return; }
        setSubmitting(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/login`,
            });
            if (error) throw error;
            setResetSent(true);
            toast.success('📧 Email de réinitialisation envoyé !');
        } catch (e: any) {
            toast.error(e.message || "Erreur lors de l'envoi");
        }
        setSubmitting(false);
    };

    // ═══ UPDATE PASSWORD ═══
    const handleUpdatePassword = async () => {
        if (!newPassword || !confirmPassword) { toast.error('Remplissez les deux champs'); return; }
        if (newPassword.length < 6) { toast.error('Le mot de passe doit contenir au moins 6 caractères'); return; }
        if (newPassword !== confirmPassword) { toast.error('Les mots de passe ne correspondent pas'); return; }
        setSubmitting(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setMode('reset_success');
            toast.success('✅ Mot de passe mis à jour !');
            // Clean URL hash
            window.history.replaceState(null, '', window.location.pathname);
        } catch (e: any) {
            toast.error(e.message || 'Erreur lors de la mise à jour');
        }
        setSubmitting(false);
    };

    return (
        <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-white p-4">
            {/* Ambient blobs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-30%] right-[-20%] w-[60%] h-[60%] bg-indigo-600/6 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-30%] left-[-20%] w-[50%] h-[50%] bg-teal-600/5 blur-[150px] rounded-full" />
            </div>

            <div className="w-full max-w-sm relative z-10">
                <div className="text-center mb-8">
                    {/* Logo officiel IziTeach */}
                    <div className="flex items-center justify-center mx-auto mb-4">
                        <IziTeachLogo variant="symbol" size="xl" className="mx-auto mb-4" />
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">IziTeach</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {mode === 'reset_password' ? 'Créer un nouveau mot de passe' :
                         mode === 'reset_success' ? 'Mot de passe mis à jour' :
                         'Enseigner simplement — Connexion'}
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {/* ═══ LOGIN MODE ═══ */}
                    {mode === 'login' && (
                        <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div>
                                <Label className="text-slate-400 text-sm">Email</Label>
                                <div className="relative mt-1">
                                    <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                                    <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="votre@email.com" className="bg-white/5 border-white/10 text-white h-11 rounded-xl pl-10" />
                                </div>
                            </div>
                            <div>
                                <Label className="text-slate-400 text-sm">Mot de passe</Label>
                                <div className="relative mt-1">
                                    <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                                    <Input value={password} onChange={e => setPassword(e.target.value)} type={showPwd ? 'text' : 'password'} placeholder="••••••••" className="bg-white/5 border-white/10 text-white h-11 rounded-xl pl-10 pr-10" onKeyDown={e => e.key === 'Enter' && submit()} />
                                    <button onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-3 text-slate-500">{showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                                </div>
                            </div>
                            <Button onClick={submit} disabled={submitting} className="w-full h-12 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl text-lg shadow-lg shadow-indigo-600/20">
                                {submitting && <Loader2 className="w-5 h-5 animate-spin mr-2" />}Se connecter
                            </Button>

                            <button
                                onClick={() => { setMode('forgot'); setResetSent(false); }}
                                className="w-full text-sm text-indigo-400 hover:text-indigo-300 transition-colors text-center"
                            >
                                🔑 Mot de passe oublié ?
                            </button>
                        </motion.div>
                    )}

                    {/* ═══ FORGOT PASSWORD MODE ═══ */}
                    {mode === 'forgot' && (
                        <motion.div key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                                <div className="text-center">
                                    <KeyRound className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                                    <h2 className="font-bold text-lg text-white">Réinitialiser le mot de passe</h2>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {resetSent
                                            ? 'Un email a été envoyé ! Vérifiez votre boîte de réception (et les spams).'
                                            : 'Entrez votre email. Vous recevrez un lien pour créer un nouveau mot de passe.'
                                        }
                                    </p>
                                </div>

                                {!resetSent ? (
                                    <>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                            <Input
                                                type="email"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                placeholder="votre@email.com"
                                                className="pl-10 bg-white/5 border-white/10 text-white h-12 rounded-xl"
                                                onKeyDown={e => e.key === 'Enter' && handleForgotPassword()}
                                                autoFocus
                                            />
                                        </div>

                                        <Button
                                            onClick={handleForgotPassword}
                                            disabled={submitting || !email.trim()}
                                            className="w-full h-12 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-amber-600/25"
                                        >
                                            {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Mail className="w-5 h-5 mr-2" />}
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
                                            className="text-xs text-indigo-400 hover:text-indigo-300 mt-3"
                                        >
                                            Renvoyer l&apos;email
                                        </button>
                                    </div>
                                )}
                            </div>

                            <Button variant="ghost" className="w-full text-slate-400" onClick={() => setMode('login')}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Retour à la connexion
                            </Button>
                        </motion.div>
                    )}

                    {/* ═══ RESET PASSWORD MODE (after clicking email link) ═══ */}
                    {mode === 'reset_password' && (
                        <motion.div key="reset" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                                <div className="text-center">
                                    <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                                    <h2 className="font-bold text-lg text-white">Nouveau mot de passe</h2>
                                    <p className="text-xs text-slate-400 mt-1">Choisissez un mot de passe sécurisé (6 caractères minimum)</p>
                                </div>

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
                                        <button onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
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

                                {/* Password strength indicator */}
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
                                    disabled={submitting || newPassword.length < 6 || newPassword !== confirmPassword}
                                    className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/25"
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
                                    Enregistrer le nouveau mot de passe
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* ═══ RESET SUCCESS ═══ */}
                    {mode === 'reset_success' && (
                        <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                            <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
                                <div className="w-20 h-20 rounded-full bg-emerald-600/20 flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                                </div>
                                <h2 className="font-bold text-xl text-white mb-2">Mot de passe mis à jour !</h2>
                                <p className="text-sm text-slate-400">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
                            </div>

                            <Button
                                onClick={() => { setMode('login'); setNewPassword(''); setConfirmPassword(''); }}
                                className="w-full h-12 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl text-lg shadow-lg shadow-indigo-600/20"
                            >
                                Se connecter
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="mt-6 text-center">
                    <Link href="/onboarding" className="text-indigo-400 text-sm hover:underline">Créer un établissement</Link>
                    <span className="text-slate-700 mx-2">•</span>
                    <Link href="/" className="text-slate-500 text-sm hover:underline">Accueil</Link>
                </div>
            </div>
        </div>
    );
}

