'use client';

import { useState } from 'react';
import { GraduationCap, Mail, Lock, Loader2, Eye, EyeOff, ArrowLeft, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

type Mode = 'login' | 'forgot';

export default function GlobalLogin() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState<Mode>('login');
    const [resetSent, setResetSent] = useState(false);

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

    return (
        <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-white p-4">
            {/* Ambient blobs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-30%] right-[-20%] w-[60%] h-[60%] bg-indigo-600/6 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-30%] left-[-20%] w-[50%] h-[50%] bg-teal-600/5 blur-[150px] rounded-full" />
            </div>

            <div className="w-full max-w-sm relative z-10">
                <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-indigo-500/20">
                        <GraduationCap className="w-7 h-7" />
                    </div>
                    <h1 className="text-2xl font-bold">CampusFlow</h1>
                    <p className="text-slate-400 text-sm mt-1">Connexion à votre espace</p>
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

                            {/* Forgot password link */}
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
                                            Renvoyer l'email
                                        </button>
                                    </div>
                                )}
                            </div>

                            <Button variant="ghost" className="w-full text-slate-400" onClick={() => setMode('login')}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Retour à la connexion
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
