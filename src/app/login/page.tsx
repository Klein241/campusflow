'use client';

import { useState } from 'react';
import { GraduationCap, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function GlobalLogin() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

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

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mx-auto mb-4">
                        <GraduationCap className="w-7 h-7" />
                    </div>
                    <h1 className="text-2xl font-bold">CampusFlow</h1>
                    <p className="text-slate-400 text-sm mt-1">Connexion à votre espace</p>
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
                            <button onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-3 text-slate-500">{showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                        </div>
                    </div>
                    <Button onClick={submit} disabled={submitting} className="w-full h-12 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl text-lg">
                        {submitting && <Loader2 className="w-5 h-5 animate-spin mr-2" />}Se connecter
                    </Button>
                </div>
                <div className="mt-6 text-center">
                    <Link href="/onboarding" className="text-indigo-400 text-sm hover:underline">Créer un établissement</Link>
                    <span className="text-slate-700 mx-2">•</span>
                    <Link href="/" className="text-slate-500 text-sm hover:underline">Accueil</Link>
                </div>
            </div>
        </div>
    );
}
