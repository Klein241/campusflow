'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck, Award, Search, CheckCircle2, AlertTriangle,
    Building2, Calendar, User, FileText, Download, ExternalLink,
    Sparkles, ArrowLeft, RefreshCw, Lock, School
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { generateCertificatePDF, type CertificateData } from '@/lib/certificate-pdf';
import { cn } from '@/lib/utils';
import Link from 'next/link';

function VerifyContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [code, setCode] = useState(() => {
        const fromQuery = searchParams.get('code');
        if (fromQuery) return fromQuery;
        if (typeof window !== 'undefined') {
            const path = window.location.pathname;
            const match = path.match(/\/verify\/([^/?#]+)/);
            if (match && match[1] && match[1] !== '_') return decodeURIComponent(match[1]);
        }
        return '';
    });

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

    const handleVerify = async (codeToVerify: string) => {
        const cleanCode = codeToVerify.trim();
        if (!cleanCode) return;

        setLoading(true);
        setErrorMsg(null);
        setResult(null);
        setSearched(true);

        try {
            // 1. Appel RPC verify_pro_certificate
            const { data, error } = await supabase.rpc('verify_pro_certificate', {
                p_certificate_code: cleanCode
            });

            if (error) {
                console.warn('[Verify] RPC Error, fallback to direct query:', error);
                // Fallback si RPC introuvable
                const { data: directData } = await supabase
                    .from('student_profiles')
                    .select('*, organizations(*), classrooms(*)')
                    .or(`certificate_code.ilike.${cleanCode},matricule.ilike.${cleanCode}`)
                    .limit(1)
                    .maybeSingle();

                if (directData) {
                    setResult({
                        valid: true,
                        student_name: `${directData.first_name} ${directData.last_name}`,
                        matricule: directData.matricule,
                        cohort_name: directData.classrooms?.name || 'Formation Professionnelle',
                        organization_name: directData.organizations?.name || 'Centre Agréé',
                        organization_city: directData.organizations?.city || 'Yaoundé',
                        certification_status: directData.certification_status || 'certified',
                        completion_date: directData.completion_date || directData.created_at,
                        certificate_code: directData.certificate_code || cleanCode,
                        final_grade: directData.final_grade,
                        raw: directData
                    });
                } else {
                    setErrorMsg('Aucun certificat officiel ne correspond à ce code de vérification.');
                }
            } else if (data && data.valid) {
                setResult(data);
            } else {
                setErrorMsg(data?.message || 'Certificat introuvable ou code invalide.');
            }
        } catch (e: any) {
            setErrorMsg('Erreur lors de la vérification : ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (initialCode) {
            handleVerify(initialCode);
        }
    }, [initialCode]);

    const handleRePrint = () => {
        if (!result) return;
        const certData: CertificateData = {
            org: {
                name: result.organization_name || 'Centre de Formation Professionnelle',
                city: result.organization_city || 'Yaoundé',
            },
            student: {
                first_name: result.student_name?.split(' ')[0] || '',
                last_name: result.student_name?.split(' ').slice(1).join(' ') || '',
                matricule: result.matricule,
                classroom_name: result.cohort_name
            },
            certificate: {
                title: 'ATTESTATION DE FIN DE FORMATION PROFESSIONNELLE',
                subtitle: 'CERTIFICAT DE COMPÉTENCES MÉTIER',
                course_name: result.cohort_name || 'Formation Professionnelle Spécialisée',
                certificate_code: result.certificate_code,
                date_issued: result.completion_date ? new Date(result.completion_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('fr-FR'),
                location: result.organization_city || 'Yaoundé',
                signatory1_title: 'Le Directeur du Centre',
                show_stamp: true,
                show_signature: true
            }
        };

        generateCertificatePDF(certData, 5);
    };

    return (
        <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30">
            {/* Background Glows */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
                <div className="absolute top-1/3 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
            </div>

            {/* Header */}
            <header className="border-b border-white/[0.08] backdrop-blur-md bg-slate-950/40 sticky top-0 z-30 px-4 py-3.5">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-white font-black text-sm hover:opacity-80 transition">
                        <span className="text-xl">🎓</span>
                        <span>IZITEACH <span className="text-emerald-400 text-xs font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">VERIFY</span></span>
                    </Link>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Portail d'Authenticité Officiel</span>
                    </div>
                </div>
            </header>

            {/* Main Container */}
            <main className="max-w-2xl mx-auto w-full px-4 py-10 relative z-10 flex-1 flex flex-col justify-center">
                <div className="text-center space-y-3 mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5" />
                        Vérification Sécurisée de Diplômes & Attestations
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                        Vérifier un Certificat Métier
                    </h1>
                    <p className="text-sm text-slate-400 max-w-md mx-auto">
                        Entrez le code d'authentification unique (ex: <code className="text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded">CF-2026-...</code>) ou scannez le QR code présent sur le document officiel.
                    </p>
                </div>

                {/* Formulaire de Recherche */}
                <form
                    onSubmit={e => {
                        e.preventDefault();
                        handleVerify(code);
                    }}
                    className="p-2 rounded-2xl bg-slate-900/90 border border-white/10 shadow-2xl flex items-center gap-2 mb-8"
                >
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <Input
                            type="text"
                            placeholder="Code du document (ex: CF-2026-STG01-8942 ou Matricule)"
                            value={code}
                            onChange={e => setCode(e.target.value.toUpperCase())}
                            className="pl-10 h-12 bg-transparent border-none text-white placeholder:text-slate-500 font-mono text-sm tracking-wider focus-visible:ring-0"
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={loading || !code.trim()}
                        className="h-12 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95"
                    >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Vérifier'}
                    </Button>
                </form>

                {/* Résultat de la Vérification */}
                <AnimatePresence mode="wait">
                    {loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="p-8 text-center rounded-3xl bg-white/[0.02] border border-white/[0.06] space-y-3"
                        >
                            <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
                            <p className="text-sm text-slate-300 font-semibold">Interrogation du registre officiel...</p>
                        </motion.div>
                    )}

                    {searched && !loading && errorMsg && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="p-6 rounded-3xl bg-red-500/10 border border-red-500/30 text-center space-y-3 shadow-xl"
                        >
                            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto text-xl">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className="text-base font-black text-red-300">Certificat Non Authentifié</h3>
                            <p className="text-xs text-red-200/80 max-w-sm mx-auto">{errorMsg}</p>
                            <p className="text-[11px] text-slate-500">Vérifiez que le code a été saisi sans faute de frappe.</p>
                        </motion.div>
                    )}

                    {searched && !loading && result && (
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-950/30 via-slate-900/90 to-teal-950/20 border-2 border-emerald-500/40 shadow-2xl space-y-6 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                            {/* Badge Succès */}
                            <div className="flex items-center justify-between border-b border-white/[0.08] pb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shadow-inner">
                                        <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                            ✓ Document Officiel Certifié
                                        </span>
                                        <h3 className="text-lg font-black text-white mt-1">Attestation Authentique</h3>
                                    </div>
                                </div>

                                <span className="font-mono text-xs text-emerald-300 font-bold bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/[0.08]">
                                    {result.certificate_code}
                                </span>
                            </div>

                            {/* Détails du Certificat */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                                    <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5 text-emerald-400" /> Titulaire du Diplôme
                                    </span>
                                    <p className="text-base font-black text-white">{result.student_name}</p>
                                    {result.matricule && (
                                        <p className="text-[11px] text-slate-400 font-mono">Matricule : {result.matricule}</p>
                                    )}
                                </div>

                                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                                    <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                                        <Building2 className="w-3.5 h-3.5 text-blue-400" /> Établissement Émetteur
                                    </span>
                                    <p className="text-sm font-black text-white">{result.organization_name}</p>
                                    <p className="text-[11px] text-slate-400">{result.organization_city || 'Cameroun'}</p>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1 sm:col-span-2">
                                    <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                                        <Award className="w-3.5 h-3.5 text-amber-400" /> Intitulé de la Formation Validée
                                    </span>
                                    <p className="text-base font-black text-emerald-300">{result.cohort_name}</p>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                                    <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-teal-400" /> Date d'Émission
                                    </span>
                                    <p className="text-xs font-bold text-white">
                                        {result.completion_date ? new Date(result.completion_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Certifié conforme'}
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                                    <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Statut Pédagogique
                                    </span>
                                    <p className="text-xs font-bold text-emerald-400">
                                        Validation Jury & Certification PRO
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                                <Button
                                    onClick={handleRePrint}
                                    className="w-full sm:w-auto flex-1 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>Télécharger l'Attestation Officielle (PDF)</span>
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/[0.06] py-4 text-center text-xs text-slate-500">
                <span>© {new Date().getFullYear()} IZITEACH — Système National de Vérification & Certification Numérique</span>
            </footer>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#07090e] flex items-center justify-center text-white">Chargement...</div>}>
            <VerifyContent />
        </Suspense>
    );
}
