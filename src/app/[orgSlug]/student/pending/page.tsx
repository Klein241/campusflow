'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { supabase } from '@/lib/supabase';
import { GraduationCap, CheckCircle2, Clock, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function PendingApprovalPage() {
    const orgSlug = useOrgSlug();
    const [org, setOrg] = useState<any>(null);
    useEffect(() => {
        supabase.from('organizations').select('id,name,logo_url,brand_color').eq('slug', orgSlug).single().then(({ data }) => setOrg(data));
    }, [orgSlug]);
    const bc = org?.brand_color || '#14b8a6';
    const fakeActus = [{ l: 3 }, { l: 2 }, { l: 4 }, { l: 2 }, { l: 3 }, { l: 2 }];
    return (
        <div className="min-h-screen bg-[#08090E] text-white overflow-hidden relative select-none">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] blur-[200px] rounded-full opacity-25" style={{ backgroundColor: bc + '22' }} />
                <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/15 blur-[200px] rounded-full" />
            </div>
            <div className="relative z-10 pt-20 pb-8 px-4 max-w-5xl mx-auto pointer-events-none" aria-hidden="true">
                <div className="blur-sm opacity-25 mb-10 flex items-center gap-3 py-3 border-b border-white/5">
                    <div className="w-8 h-8 rounded-xl shrink-0" style={{ background: bc }} />
                    <div className="h-4 w-40 bg-white/20 rounded-full" />
                    <div className="ml-auto flex gap-3">
                        <div className="h-3 w-16 bg-white/10 rounded-full" />
                        <div className="h-8 w-24 bg-white/10 rounded-xl" />
                    </div>
                </div>
                <div className="blur-sm opacity-20 mb-8 grid grid-cols-4 gap-3">
                    {[1,2,3,4].map((i: number) => (
                        <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-white/10" />
                            <div className="h-5 w-12 bg-white/20 rounded-lg" />
                            <div className="h-2.5 w-16 bg-white/10 rounded-full" />
                        </div>
                    ))}
                </div>
                <div className="blur-md opacity-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {fakeActus.map((a: any, idx: number) => (
                        <div key={idx} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
                            <div className="h-36 rounded-xl bg-white/10" />
                            <div className="space-y-2">
                                <div className="h-3.5 rounded-lg bg-white/20 w-4/5" />
                                <div className="h-3 rounded bg-white/10 w-3/5" />
                                {a.l > 2 && <div className="h-3 rounded bg-white/10 w-2/3" />}
                                {a.l > 3 && <div className="h-3 rounded bg-white/10 w-1/2" />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 28 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 250 }}
                    className="w-full max-w-sm rounded-3xl border bg-[#0f1117]/98 backdrop-blur-2xl shadow-2xl overflow-hidden"
                    style={{ borderColor: bc + '30' }}>
                    <div className="relative overflow-hidden px-6 pt-8 pb-5 text-center" style={{ background: 'linear-gradient(135deg,' + bc + '18,transparent 60%)' }}>
                        <div className="absolute top-0 right-0 w-36 h-36 rounded-full blur-3xl opacity-30" style={{ background: bc }} />
                        <div className="relative w-20 h-20 mx-auto mb-5">
                            <motion.div className="absolute inset-0 rounded-full border-[3px] border-transparent" style={{ borderTopColor: bc, borderRightColor: bc + '40' }} animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} />
                            <motion.div className="absolute inset-[6px] rounded-full border-2 border-transparent" style={{ borderBottomColor: bc + '60' }} animate={{ rotate: -360 }} transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }} />
                            <div className="absolute inset-0 flex items-center justify-center">
                                {org?.logo_url ? <img src={org.logo_url} alt="" className="w-10 h-10 rounded-xl object-contain" /> : <GraduationCap className="w-8 h-8" style={{ color: bc }} />}
                            </div>
                        </div>
                        <motion.div animate={{ opacity: [1, 0.55, 1] }} transition={{ duration: 2.5, repeat: Infinity }} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border mb-3" style={{ backgroundColor: bc + '15', borderColor: bc + '30', color: bc }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: bc }} />
                            En cours de traitement
                        </motion.div>
                        <h2 className="text-lg font-black text-white mb-0.5">Inscription reçue !</h2>
                        <p className="text-xs text-slate-400 leading-relaxed">Votre dossier est examiné par {org?.name || "l'école"}.<br/>Revenez dans un instant.</p>
                    </div>
                    <div className="px-6 py-5 space-y-4">
                        <div className="space-y-2.5">
                            {([
                                { icon: CheckCircle2, label: 'Demande soumise avec succès', done: true,  pulse: false },
                                { icon: Clock,        label: 'Examen du dossier en cours',  done: false, pulse: true  },
                                { icon: BookOpen,     label: 'Activation du compte',         done: false, pulse: false },
                            ] as const).map((step, i) => (
                                <div key={i} className={cn('flex items-center gap-3 p-3 rounded-xl border', step.done ? 'bg-emerald-500/[0.08] border-emerald-500/15' : 'bg-white/[0.03] border-white/[0.05]')}>
                                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', step.done ? 'bg-emerald-500/20' : 'bg-white/[0.06]')}>
                                        {step.done
                                            ? <step.icon className="w-4 h-4 text-emerald-400" />
                                            : <motion.div animate={step.pulse ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.3 }} transition={step.pulse ? { duration: 1.6, repeat: Infinity } : {}}>
                                                <step.icon className="w-4 h-4 text-slate-600" />
                                              </motion.div>
                                        }
                                    </div>
                                    <span className={cn('text-xs font-medium leading-snug flex-1', step.done ? 'text-white' : 'text-slate-500')}>{step.label}</span>
                                    {step.pulse && (
                                        <div className="flex gap-0.5">
                                            {[0,1,2].map((j: number) => (
                                                <motion.div key={j} className="w-1 h-1 rounded-full" style={{ background: bc }} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: j * 0.2 }} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="p-3.5 rounded-2xl border" style={{ backgroundColor: bc + '08', borderColor: bc + '20' }}>
                            <p className="text-[11px] text-center leading-relaxed" style={{ color: bc + 'cc' }}>
                                Revenez vous connecter avec votre <strong className="text-white">code d'accès</strong> et votre <strong className="text-white">code PIN</strong> une fois votre dossier approuvé.
                            </p>
                        </div>
                        <Link href={'/' + orgSlug + '/login'} className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-black text-white transition-all hover:opacity-90 active:scale-[0.98]" style={{ background: 'linear-gradient(135deg,' + bc + ',' + bc + 'bb)', boxShadow: '0 10px 28px ' + bc + '35' }}>
                            <GraduationCap className="w-4 h-4" />
                            Se connecter
                        </Link>
                        <Link href={'/' + orgSlug} className="flex items-center justify-center w-full py-2 text-[11px] text-slate-600 hover:text-slate-400 transition-colors">
                            &larr; Retour à l&apos;accueil
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}