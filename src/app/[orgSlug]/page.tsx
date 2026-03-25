'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    GraduationCap, Users, BookOpen, Calendar, MapPin, Phone, Mail,
    Globe, Star, ArrowRight, MessageSquare, ShoppingBag, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
        <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <GraduationCap className="w-10 h-10 text-teal-400" />
            </motion.div>
        </div>
    );

    if (!org) return (
        <div className="min-h-screen bg-[#0B0E14] flex flex-col items-center justify-center text-white p-8">
            <h1 className="text-3xl font-black mb-4">Établissement introuvable</h1>
            <p className="text-slate-400 mb-6">L&apos;URL <code className="text-teal-400">/{orgSlug}</code> ne correspond à aucun établissement.</p>
            <Link href="/"><Button className="rounded-xl">Retour à l&apos;accueil</Button></Link>
        </div>
    );

    const typeLabels: Record<string, string> = {
        college: 'Collège', lycee: 'Lycée', universite: 'Université',
        centre_formation: 'Centre de Formation Professionnel',
        institut: 'Institut de Formation', autre: 'Établissement',
    };

    return (
        <div className="min-h-screen bg-[#0B0E14] text-white">
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="ambient-blob-teal" style={{ top: '-25%', right: '-15%' }} />
                <div className="ambient-blob-indigo" style={{ bottom: '-25%', left: '-15%' }} />
                <div className="ambient-blob-purple" style={{ top: '50%', left: '60%', opacity: 0.3 }} />
            </div>

            {/* Hero */}
            <div className="relative z-10 py-16 px-4">
                <div className="max-w-4xl mx-auto">
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                        className="flex flex-col sm:flex-row items-center gap-6">
                        {org.logo_url ? (
                            <img src={org.logo_url} alt={org.name} className="w-24 h-24 rounded-2xl object-contain bg-white/10 backdrop-blur-sm p-2 border border-white/10 shadow-2xl" />
                        ) : (
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-teal-500/20 to-indigo-500/20 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                                <GraduationCap className="w-12 h-12 text-teal-400" />
                            </div>
                        )}
                        <div className="text-center sm:text-left">
                            <p className="text-teal-400 text-sm font-medium mb-1 flex items-center gap-1 justify-center sm:justify-start">
                                <Sparkles className="w-3 h-3" /> {typeLabels[org.type] || org.type}
                            </p>
                            <h1 className="text-3xl sm:text-4xl font-black text-gradient-primary">{org.name}</h1>
                            {org.motto && <p className="text-white/60 mt-2 text-lg italic">&laquo; {org.motto} &raquo;</p>}
                            <div className="flex items-center gap-4 mt-3 text-sm text-white/50 justify-center sm:justify-start flex-wrap">
                                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {org.quarter ? `${org.quarter}, ` : ''}{org.city}, {org.country}</span>
                                <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {org.phone}</span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="flex flex-wrap gap-3 mt-8 justify-center sm:justify-start">
                        <Link href={`/${orgSlug}/login`}>
                            <Button size="lg" className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 font-black rounded-xl shadow-lg shadow-teal-600/25">
                                Se connecter <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                        <Link href={`/${orgSlug}/library`}>
                            <Button size="lg" variant="outline" className="border-white/10 text-white hover:bg-white/5 rounded-xl">
                                <BookOpen className="w-4 h-4 mr-2" /> Bibliothèque
                            </Button>
                        </Link>
                        <Link href={`/${orgSlug}/shop`}>
                            <Button size="lg" variant="outline" className="border-white/10 text-white hover:bg-white/5 rounded-xl">
                                <ShoppingBag className="w-4 h-4 mr-2" /> Marketplace
                            </Button>
                        </Link>
                    </motion.div>
                </div>
            </div>

            {/* Stats */}
            <div className="relative z-10 max-w-4xl mx-auto -mt-2 px-4">
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Filières', value: filieres.length, icon: BookOpen, color: 'text-teal-400' },
                        { label: 'Classes', value: classrooms.length, icon: Users, color: 'text-indigo-400' },
                        { label: 'Active', value: '✅', icon: Star, color: 'text-amber-400' },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }}>
                            <Card className="bg-card/50 backdrop-blur-xl border-white/10 overflow-hidden">
                                <CardContent className="p-4 text-center">
                                    <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-2`} />
                                    <div className="text-2xl font-black">{s.value}</div>
                                    <div className="text-xs text-slate-400">{s.label}</div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Filières */}
            {filieres.length > 0 && (
                <section className="relative z-10 max-w-4xl mx-auto px-4 py-12">
                    <h2 className="text-2xl font-black mb-6 text-gradient-primary">📚 Nos filières</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {filieres.map((f: any, i: number) => (
                            <motion.div key={f.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05 }}>
                                <Card className="bg-card/50 backdrop-blur-sm border-white/10 hover:border-teal-500/30 transition-all group overflow-hidden">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: (f.couleur || '#14b8a6') + '20' }}>
                                                <BookOpen className="w-5 h-5" style={{ color: f.couleur || '#14b8a6' }} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold group-hover:text-teal-400 transition-colors">{f.nom}</h3>
                                                <p className="text-xs text-slate-400">{f.duree_mois} mois • {new Intl.NumberFormat('fr-FR').format(f.frais_scolarite)} XAF</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* Classes */}
            {classrooms.length > 0 && (
                <section className="relative z-10 max-w-4xl mx-auto px-4 pb-12">
                    <h2 className="text-2xl font-black mb-6 text-gradient-primary">🏫 Nos classes</h2>
                    <div className="flex flex-wrap gap-3">
                        {classrooms.map((c: any, i: number) => (
                            <motion.div key={c.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 + i * 0.03 }}
                                className="px-4 py-2 rounded-xl bg-card/50 backdrop-blur-sm border border-white/10 text-sm hover:border-indigo-500/30 transition-all">
                                {c.name} {c.cycle && <span className="text-xs text-indigo-400 ml-1">({c.cycle})</span>}
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* Contact */}
            <section className="relative z-10 max-w-4xl mx-auto px-4 pb-16">
                <h2 className="text-2xl font-black mb-6 text-gradient-primary">📞 Contact</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                    {[
                        { icon: Phone, label: 'Téléphone', value: org.phone },
                        { icon: MessageSquare, label: 'WhatsApp', value: org.whatsapp },
                        { icon: Mail, label: 'Email', value: org.email },
                        { icon: MapPin, label: 'Adresse', value: `${org.quarter || ''} ${org.city}, ${org.country}` },
                    ].filter(c => c.value).map((c, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 + i * 0.05 }}>
                            <Card className="bg-card/50 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all overflow-hidden">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <c.icon className="w-5 h-5 text-teal-400 shrink-0" />
                                        <div>
                                            <p className="text-xs text-slate-500">{c.label}</p>
                                            <p className="text-sm">{c.value}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/5 py-6 text-center text-sm text-slate-500">
                Propulsé par <Link href="/" className="text-teal-400 hover:underline font-bold">CampusFlow</Link> • {org.name}
            </footer>
        </div>
    );
}
