'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GraduationCap, User, Phone, Mail, Upload, Loader2, CheckCircle2, ArrowRight, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Link from 'next/link';

export default function StudentRegistration() {
    const { orgSlug } = useParams<{ orgSlug: string }>();
    const router = useRouter();
    const [org, setOrg] = useState<any>(null);
    const [classrooms, setClassrooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [matricule, setMatricule] = useState('');
    const photoRef = useRef<HTMLInputElement>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [form, setForm] = useState({ firstName: '', lastName: '', dob: '', phone: '', email: '', classroomId: '', parentName: '', parentPhone: '', photoFile: null as File | null });
    const u = (p: Partial<typeof form>) => setForm(prev => ({ ...prev, ...p }));

    useEffect(() => {
        (async () => {
            const { data: o } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single();
            if (o) {
                setOrg(o);
                const { data: c } = await supabase.from('classrooms').select('*').eq('organization_id', o.id).eq('is_active', true).order('name');
                setClassrooms(c || []);
            }
            setLoading(false);
        })();
    }, [orgSlug]);

    const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f) return;
        u({ photoFile: f });
        const r = new FileReader(); r.onloadend = () => setPhotoPreview(r.result as string); r.readAsDataURL(f);
    };

    const submit = async () => {
        if (!form.firstName.trim() || !form.lastName.trim() || !form.classroomId) { toast.error('Remplissez les champs obligatoires'); return; }
        setSubmitting(true);
        try {
            const email = form.email || `${form.firstName.toLowerCase()}.${form.lastName.toLowerCase()}.etu@${orgSlug}.campusflow.local`;
            const pwd = (form.phone || form.dob || '12345678').replace(/\D/g, '').slice(-8) + 'Cf!';
            const { data: auth } = await supabase.auth.signUp({ email, password: pwd });
            const userId = auth?.user?.id;

            const { data: student, error } = await supabase.from('student_profiles').insert({
                user_id: userId || null,
                organization_id: org.id,
                first_name: form.firstName,
                last_name: form.lastName,
                date_of_birth: form.dob || null,
                classroom_id: form.classroomId,
                phone: form.phone,
                email: form.email,
                parent_name: form.parentName,
                parent_phone: form.parentPhone,
            }).select().single();
            if (error) throw error;

            if (form.photoFile && userId) {
                const ext = form.photoFile.name.split('.').pop();
                const path = `orgs/${org.id}/students/${userId}.${ext}`;
                await supabase.storage.from('organization-assets').upload(path, form.photoFile, { upsert: true });
            }

            if (userId) {
                await supabase.from('profiles').upsert({ id: userId, full_name: `${form.firstName} ${form.lastName}`, phone: form.phone, email: form.email, role: 'student', organization_id: org.id });
            }

            setMatricule(student?.matricule || '');
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
                <CheckCircle2 className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Bienvenue !</h1>
                <p className="text-slate-400 mb-2">Votre inscription à <strong>{org.name}</strong> est confirmée.</p>
                {matricule && <div className="my-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20"><p className="text-xs text-slate-400 mb-1">Votre matricule</p><p className="text-2xl font-mono font-bold text-indigo-300">{matricule}</p></div>}
                <Link href={`/${orgSlug}/login`}><Button className="bg-indigo-600 mt-4">Se connecter <ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4">
            <div className="max-w-md mx-auto pt-8">
                <div className="text-center mb-8">
                    {org.logo_url ? <img src={org.logo_url} alt="" className="w-16 h-16 rounded-xl object-contain mx-auto mb-3 bg-white/10 p-1" /> : <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-3"><GraduationCap className="w-8 h-8" /></div>}
                    <h1 className="text-2xl font-bold">{org.name}</h1>
                    <p className="text-blue-400 text-sm mt-1">🎓 Inscription Étudiant</p>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div><Label className="text-slate-400 text-sm">Prénom *</Label><Input value={form.firstName} onChange={e => u({ firstName: e.target.value })} className="bg-white/5 border-white/10 text-white h-11 rounded-xl mt-1" placeholder="Marie" /></div>
                        <div><Label className="text-slate-400 text-sm">Nom *</Label><Input value={form.lastName} onChange={e => u({ lastName: e.target.value })} className="bg-white/5 border-white/10 text-white h-11 rounded-xl mt-1" placeholder="Ngo" /></div>
                    </div>
                    <div><Label className="text-slate-400 text-sm">Date de naissance</Label><Input type="date" value={form.dob} onChange={e => u({ dob: e.target.value })} className="bg-white/5 border-white/10 text-white h-11 rounded-xl mt-1" /></div>
                    <div>
                        <Label className="text-slate-400 text-sm">Classe / Filière *</Label>
                        <select value={form.classroomId} onChange={e => u({ classroomId: e.target.value })} className="w-full mt-1 h-11 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm">
                            <option value="" className="bg-slate-900">Choisir...</option>
                            {classrooms.map((c: any) => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                        </select>
                    </div>
                    <div><Label className="text-slate-400 text-sm">Téléphone</Label><Input type="tel" value={form.phone} onChange={e => u({ phone: e.target.value })} className="bg-white/5 border-white/10 text-white h-11 rounded-xl mt-1" placeholder="+237 6XX..." /></div>
                    <div><Label className="text-slate-400 text-sm">Email</Label><Input type="email" value={form.email} onChange={e => u({ email: e.target.value })} className="bg-white/5 border-white/10 text-white h-11 rounded-xl mt-1" placeholder="etudiant@email.com" /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><Label className="text-slate-400 text-sm">Nom du parent</Label><Input value={form.parentName} onChange={e => u({ parentName: e.target.value })} className="bg-white/5 border-white/10 text-white h-11 rounded-xl mt-1" placeholder="Parent" /></div>
                        <div><Label className="text-slate-400 text-sm">Tél parent</Label><Input type="tel" value={form.parentPhone} onChange={e => u({ parentPhone: e.target.value })} className="bg-white/5 border-white/10 text-white h-11 rounded-xl mt-1" placeholder="+237..." /></div>
                    </div>
                    <div>
                        <Label className="text-slate-400 text-sm">Photo</Label>
                        <div onClick={() => photoRef.current?.click()} className="mt-1 w-full p-4 border-2 border-dashed border-white/10 rounded-xl bg-white/[0.02] hover:border-blue-500/30 cursor-pointer text-center">
                            {photoPreview ? <img src={photoPreview} alt="" className="w-16 h-16 rounded-full object-cover mx-auto" /> : <Upload className="w-6 h-6 text-slate-500 mx-auto" />}
                        </div>
                        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                    </div>
                    <Button onClick={submit} disabled={submitting || !form.firstName.trim() || !form.lastName.trim() || !form.classroomId} className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl text-lg">
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <GraduationCap className="w-5 h-5 mr-2" />}
                        S&apos;inscrire
                    </Button>
                </div>
            </div>
        </div>
    );
}
