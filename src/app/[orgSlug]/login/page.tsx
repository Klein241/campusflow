'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GraduationCap, Mail, Lock, Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Link from 'next/link';
import { useWhiteLabel } from '@/hooks/use-white-label';

export default function LoginPage() {
    const { orgSlug } = useParams<{ orgSlug: string }>();
    const router = useRouter();
    const [org, setOrg] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { showPlatformBranding, routePath, logoUrl, brandColor, orgName: wlName } = useWhiteLabel(orgSlug);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single();
            setOrg(data);
            setLoading(false);
        })();
    }, [orgSlug]);

    const submit = async () => {
        if (!email.trim() || !password.trim()) { toast.error('Remplissez tous les champs'); return; }
        setSubmitting(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;

            // Check role and redirect
            const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', data.user.id).single();
            if (profile?.role === 'director' || profile?.role === 'superadmin') {
                router.push(`/${orgSlug}/admin`);
            } else if (profile?.role === 'teacher') {
                router.push(`/${orgSlug}/prof/dashboard`);
            } else if (profile?.role === 'student') {
                router.push(`/${orgSlug}/student/dashboard`);
            } else {
                // Fallback: check if user has a teacher or student profile
                const { data: tp } = await supabase.from('teacher_profiles').select('id').eq('user_id', data.user.id).eq('organization_id', profile?.organization_id || '').limit(1);
                if (tp && tp.length > 0) {
                    router.push(`/${orgSlug}/prof/dashboard`);
                } else {
                    const { data: sp } = await supabase.from('student_profiles').select('id').eq('user_id', data.user.id).limit(1);
                    if (sp && sp.length > 0) {
                        router.push(`/${orgSlug}/student/dashboard`);
                    } else {
                        router.push(`/${orgSlug}`);
                    }
                }
            }
            toast.success('Connexion réussie !');
        } catch (e: any) {
            toast.error(e.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect' : e.message);
        } finally { setSubmitting(false); }
    };

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>;
    if (!org) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><h1 className="text-2xl font-bold">Établissement introuvable</h1></div>;

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    {org.logo_url ? <img src={org.logo_url} alt="" className="w-16 h-16 rounded-xl object-contain mx-auto mb-3 bg-white/10 p-1" /> : <div className="w-16 h-16 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-3"><GraduationCap className="w-8 h-8" /></div>}
                    <h1 className="text-2xl font-bold">{org.name}</h1>
                    <p className="text-slate-400 text-sm mt-1">Connectez-vous à votre espace</p>
                </div>

                <div className="space-y-4">
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
                            <button onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-3 text-slate-500 hover:text-white">
                                {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    <Button onClick={submit} disabled={submitting} className="w-full h-12 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-xl text-lg">
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                        Se connecter
                    </Button>
                </div>

                <div className="mt-6 text-center text-sm text-slate-500 space-y-2">
                    <p>Pas encore inscrit ?</p>
                    <div className="flex gap-3 justify-center">
                        <Link href={routePath('/student')} className="text-blue-400 hover:underline">Étudiant</Link>
                        <span className="text-slate-700">•</span>
                        <Link href={routePath('/prof')} className="text-emerald-400 hover:underline">Professeur</Link>
                    </div>
                </div>

                {showPlatformBranding && (
                    <div className="mt-8 text-center">
                        <Link href="/" className="text-xs text-slate-600 hover:text-slate-400">
                            Propulsé par CampusFlow
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
