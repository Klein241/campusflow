'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    GraduationCap, Users, BookOpen, Calendar, MapPin, Phone, Mail,
    Globe, Star, ArrowRight, MessageSquare, ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Org {
    id: string; name: string; slug: string; type: string; motto: string;
    logo_url: string; city: string; country: string; quarter: string;
    phone: string; whatsapp: string; email: string;
}

export default function SchoolPublicPage() {
    const { orgSlug } = useParams<{ orgSlug: string }>();
    const [org, setOrg] = useState<Org | null>(null);
    const [loading, setLoading] = useState(true);
    const [classrooms, setClassrooms] = useState<any[]>([]);
    const [filieres, setFilieres] = useState<any[]>([]);

    useEffect(() => {
        async function load() {
            const { data } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single();
            if (data) {
                setOrg(data);
                const { data: cls } = await supabase.from('classrooms').select('*').eq('organization_id', data.id).eq('is_active', true);
                setClassrooms(cls || []);
                const { data: fils } = await supabase.from('filieres').select('*').eq('organization_id', data.id).eq('is_active', true);
                setFilieres(fils || []);
            }
            setLoading(false);
        }
        load();
    }, [orgSlug]);

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <GraduationCap className="w-10 h-10 text-indigo-400" />
            </motion.div>
        </div>
    );

    if (!org) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-8">
            <h1 className="text-3xl font-bold mb-4">Établissement introuvable</h1>
            <p className="text-slate-400 mb-6">L&apos;URL <code className="text-indigo-400">/{orgSlug}</code> ne correspond à aucun établissement.</p>
            <Link href="/"><Button>Retour à l&apos;accueil</Button></Link>
        </div>
    );

    const typeLabels: Record<string, string> = {
        college: 'Collège', lycee: 'Lycée', universite: 'Université',
        centre_formation: 'Centre de Formation Professionnel',
        institut: 'Institut de Formation', autre: 'Établissement',
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Hero */}
            <div className="relative bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 py-16 px-4">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4YzAtMS42NTctMS4zNDMtMy0zLTNzLTMgMS4zNDMtMyAzIDEuMzQzIDMgMyAzIDMtMS4zNDMgMy0zeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
                <div className="max-w-4xl mx-auto relative z-10">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        {org.logo_url ? (
                            <img src={org.logo_url} alt={org.name} className="w-24 h-24 rounded-2xl object-contain bg-white/10 p-2" />
                        ) : (
                            <div className="w-24 h-24 rounded-2xl bg-white/10 flex items-center justify-center">
                                <GraduationCap className="w-12 h-12 text-white/60" />
                            </div>
                        )}
                        <div className="text-center sm:text-left">
                            <p className="text-indigo-300 text-sm font-medium mb-1">{typeLabels[org.type] || org.type}</p>
                            <h1 className="text-3xl sm:text-4xl font-bold">{org.name}</h1>
                            {org.motto && <p className="text-white/70 mt-2 text-lg italic">&laquo; {org.motto} &raquo;</p>}
                            <div className="flex items-center gap-4 mt-3 text-sm text-white/60 justify-center sm:justify-start flex-wrap">
                                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {org.quarter ? `${org.quarter}, ` : ''}{org.city}, {org.country}</span>
                                <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {org.phone}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-8 justify-center sm:justify-start">
                        <Link href={`/${orgSlug}/student`}>
                            <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-xl">
                                <Users className="w-5 h-5 mr-2" /> S&apos;inscrire comme étudiant
                            </Button>
                        </Link>
                        <Link href={`/${orgSlug}/prof`}>
                            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded-xl">
                                <BookOpen className="w-5 h-5 mr-2" /> Espace professeur
                            </Button>
                        </Link>
                        <Link href={`/${orgSlug}/login`}>
                            <Button size="lg" variant="ghost" className="text-white/70 hover:text-white rounded-xl">
                                Se connecter <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="max-w-4xl mx-auto -mt-6 px-4">
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Filières', value: filieres.length, icon: BookOpen },
                        { label: 'Classes', value: classrooms.length, icon: Users },
                        { label: 'Active', value: '✅', icon: Star },
                    ].map((s, i) => (
                        <div key={i} className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 text-center">
                            <s.icon className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{s.value}</div>
                            <div className="text-xs text-slate-400">{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Filières */}
            {filieres.length > 0 && (
                <section className="max-w-4xl mx-auto px-4 py-12">
                    <h2 className="text-2xl font-bold mb-6">📚 Nos filières</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {filieres.map((f: any) => (
                            <div key={f.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/30 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: f.couleur + '20' }}>
                                        <BookOpen className="w-5 h-5" style={{ color: f.couleur }} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{f.nom}</h3>
                                        <p className="text-xs text-slate-400">{f.duree_mois} mois • {new Intl.NumberFormat('fr-FR').format(f.frais_scolarite)} XAF</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Classes */}
            {classrooms.length > 0 && (
                <section className="max-w-4xl mx-auto px-4 pb-12">
                    <h2 className="text-2xl font-bold mb-6">🏫 Nos classes</h2>
                    <div className="flex flex-wrap gap-3">
                        {classrooms.map((c: any) => (
                            <div key={c.id} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm">
                                {c.name} {c.cycle && <span className="text-xs text-indigo-400 ml-1">({c.cycle})</span>}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Contact */}
            <section className="max-w-4xl mx-auto px-4 pb-16">
                <h2 className="text-2xl font-bold mb-6">📞 Contact</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                    {[
                        { icon: Phone, label: 'Téléphone', value: org.phone },
                        { icon: MessageSquare, label: 'WhatsApp', value: org.whatsapp },
                        { icon: Mail, label: 'Email', value: org.email },
                        { icon: MapPin, label: 'Adresse', value: `${org.quarter || ''} ${org.city}, ${org.country}` },
                    ].filter(c => c.value).map((c, i) => (
                        <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/10">
                            <c.icon className="w-5 h-5 text-indigo-400 shrink-0" />
                            <div>
                                <p className="text-xs text-slate-500">{c.label}</p>
                                <p className="text-sm">{c.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-6 text-center text-sm text-slate-500">
                Propulsé par <Link href="/" className="text-indigo-400 hover:underline">CampusFlow</Link> • {org.name}
            </footer>
        </div>
    );
}
