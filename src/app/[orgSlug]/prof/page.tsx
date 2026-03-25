'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GraduationCap, User, BookOpen, Phone, Mail, Upload, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Link from 'next/link';

export default function TeacherRegistration() {
    const { orgSlug } = useParams<{ orgSlug: string }>();
    const router = useRouter();
    const [org, setOrg] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const photoRef = useRef<HTMLInputElement>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [form, setForm] = useState({ firstName: '', lastName: '', speciality: '', phone: '', email: '', diplomas: '', photoFile: null as File | null });
    const u = (p: Partial<typeof form>) => setForm(prev => ({ ...prev, ...p }));

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single();
            setOrg(data);
            setLoading(false);
        })();
    }, [orgSlug]);

    const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f) return;
        u({ photoFile: f });
        const r = new FileReader(); r.onloadend = () => setPhotoPreview(r.result as string); r.readAsDataURL(f);
    };

    const submit = async () => {
        if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim()) { toast.error('Remplissez les champs obligatoires'); return; }
        setSubmitting(true);
        try {
            // Sign up
            const email = form.email || `${form.firstName.toLowerCase()}.${form.lastName.toLowerCase()}@${orgSlug}.campusflow.local`;
            const pwd = form.phone.replace(/\D/g, '').slice(-8) + 'Cf!';
            const { data: auth } = await supabase.auth.signUp({ email, password: pwd });
            const userId = auth?.user?.id;

            // Create teacher profile
            const code = `PROF-${Date.now().toString(36).toUpperCase()}`;
            const { error } = await supabase.from('teacher_profiles').insert({
                user_id: userId || null,
                organization_id: org.id,
                first_name: form.firstName,
                last_name: form.lastName,
                speciality: form.speciality,
                phone: form.phone,
                email: form.email,
                diplomas: form.diplomas,
                access_code: code,
            });
            if (error) throw error;

            // Upload photo
            if (form.photoFile && userId) {
                const ext = form.photoFile.name.split('.').pop();
                const path = `orgs/${org.id}/teachers/${userId}.${ext}`;
                await supabase.storage.from('organization-assets').upload(path, form.photoFile, { upsert: true });
            }

            // Update profile role
            if (userId) {
                await supabase.from('profiles').upsert({ id: userId, full_name: `${form.firstName} ${form.lastName}`, phone: form.phone, email: form.email, role: 'teacher', organization_id: org.id });
            }

            setDone(true);
            toast.success('Inscription réussie !');
        } catch (e: any) {
            toast.error(e.message || 'Erreur');
        } finally { setSubmitting(false); }
    };

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>;
    if (!org) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><h1 className="text-2xl font-bold">Établissement introuvable</h1></div>;

    if (done) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-4">
            <div className="text-center max-w-sm">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Inscription réussie !</h1>
                <p className="text-slate-400 mb-6">Bienvenue professeur ! Votre compte a été créé pour <strong>{org.name}</strong>.</p>
                <Link href={`/${orgSlug}/login`}><Button className="bg-indigo-600">Se connecter <ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4">
            <div className="max-w-md mx-auto pt-8">
                <div className="text-center mb-8">
                    {org.logo_url ? <img src={org.logo_url} alt="" className="w-16 h-16 rounded-xl object-contain mx-auto mb-3 bg-white/10 p-1" /> : <div className="w-16 h-16 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-3"><GraduationCap className="w-8 h-8" /></div>}
                    <h1 className="text-2xl font-bold">{org.name}</h1>
                    <p className="text-emerald-400 text-sm mt-1">👨‍🏫 Inscription Professeur</p>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div><Label className="text-slate-400 text-sm">Prénom *</Label><Input value={form.firstName} onChange={e => u({ firstName: e.target.value })} className="bg-white/5 border-white/10 text-white h-11 rounded-xl mt-1" placeholder="Jean" /></div>
                        <div><Label className="text-slate-400 text-sm">Nom *</Label><Input value={form.lastName} onChange={e => u({ lastName: e.target.value })} className="bg-white/5 border-white/10 text-white h-11 rounded-xl mt-1" placeholder="Dupont" /></div>
                    </div>
                    <div><Label className="text-slate-400 text-sm">Spécialité</Label><Input value={form.speciality} onChange={e => u({ speciality: e.target.value })} className="bg-white/5 border-white/10 text-white h-11 rounded-xl mt-1" placeholder="Mathématiques" /></div>
                    <div><Label className="text-slate-400 text-sm">Téléphone *</Label><Input type="tel" value={form.phone} onChange={e => u({ phone: e.target.value })} className="bg-white/5 border-white/10 text-white h-11 rounded-xl mt-1" placeholder="+237 6XX..." /></div>
                    <div><Label className="text-slate-400 text-sm">Email</Label><Input type="email" value={form.email} onChange={e => u({ email: e.target.value })} className="bg-white/5 border-white/10 text-white h-11 rounded-xl mt-1" placeholder="prof@email.com" /></div>
                    <div><Label className="text-slate-400 text-sm">Diplômes</Label><Input value={form.diplomas} onChange={e => u({ diplomas: e.target.value })} className="bg-white/5 border-white/10 text-white h-11 rounded-xl mt-1" placeholder="Licence, Master..." /></div>
                    <div>
                        <Label className="text-slate-400 text-sm">Photo</Label>
                        <div onClick={() => photoRef.current?.click()} className="mt-1 w-full p-4 border-2 border-dashed border-white/10 rounded-xl bg-white/[0.02] hover:border-indigo-500/30 cursor-pointer text-center">
                            {photoPreview ? <img src={photoPreview} alt="" className="w-16 h-16 rounded-full object-cover mx-auto" /> : <Upload className="w-6 h-6 text-slate-500 mx-auto" />}
                        </div>
                        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                    </div>
                    <Button onClick={submit} disabled={submitting || !form.firstName.trim() || !form.lastName.trim() || !form.phone.trim()} className="w-full h-12 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-xl text-lg">
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <User className="w-5 h-5 mr-2" />}
                        S&apos;inscrire comme professeur
                    </Button>
                </div>
            </div>
        </div>
    );
}
