'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Palette, ShieldCheck, Lock, KeyRound, Globe, CheckCircle2,
    ExternalLink, Trash2, RefreshCw, Loader2, Upload, Search,
    Award, Edit, Save, ImagePlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadToR2 } from '@/lib/r2';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ReviewSection } from '@/components/shared/ReviewSection';
import { BugReportButton } from '@/components/shared/BugReportButton';

interface AdminSettingsTabProps {
    org: any;
    setOrg: (org: any) => void;
    orgSlug: string;
    session: any;
    adminSecurityPin: string | null;
    setPinModalMode: (mode: 'set_pin' | 'verify_pin' | 'change_pin') => void;
    setPinModalOpen: (open: boolean) => void;
    setPinInput: (val: string) => void;
    setPinConfirmInput: (val: string) => void;
    setOldPinInput: (val: string) => void;
    setPinError: (err: string) => void;
    adminSkyPoints: number;
    setShowPointsModal: (show: boolean) => void;
}

export function AdminSettingsTab({
    org,
    setOrg,
    orgSlug,
    session,
    adminSecurityPin,
    setPinModalMode,
    setPinModalOpen,
    setPinInput,
    setPinConfirmInput,
    setOldPinInput,
    setPinError,
    adminSkyPoints,
    setShowPointsModal
}: AdminSettingsTabProps) {
    const [sOrgName, setSOrgName] = useState(org.name || '');
    const [sOrgPhone, setSOrgPhone] = useState(org.phone || '');
    const [sOrgEmail, setSOrgEmail] = useState(org.email || '');
    const [sOrgWhatsapp, setSOrgWhatsapp] = useState(org.whatsapp || '');
    const [sCustomDomain, setSCustomDomain] = useState(org.custom_domain || '');
    const [sDomainVerified, setSDomainVerified] = useState(!!org.custom_domain_verified);
    const [sDomainSsl, setSDomainSsl] = useState(org.custom_domain_ssl || 'pending');
    const [sVerifying, setSVerifying] = useState(false);
    const [sBrandColor, setSBrandColor] = useState(org.brand_color || '#4f46e5');
    const [sLogoUrl, setSLogoUrl] = useState(org.logo_url || '');
    const [sFaviconUrl, setSFaviconUrl] = useState(org.favicon_url || '');
    const [sMetaTitle, setSMetaTitle] = useState(org.meta_title || '');
    const [sMetaDesc, setSMetaDesc] = useState(org.meta_description || '');
    const [sSignatureUrl, setSSignatureUrl] = useState(org.signature_url || '');
    const [sStampUrl, setSStampUrl] = useState(org.stamp_url || '');
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingSignature, setUploadingSignature] = useState(false);
    const [uploadingStamp, setUploadingStamp] = useState(false);
    const [sSavingSettings, setSSavingSettings] = useState(false);

    const handleSettingsLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingImage(true);
        try {
            const res = await uploadToR2(file, `logos/${org.id}`, file.name);
            setSLogoUrl(res.url);
            toast.success('Logo téléversé ! N\'oubliez pas de sauvegarder.');
        } catch (err: any) {
            toast.error('Erreur upload logo : ' + err.message);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSettingsSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingSignature(true);
        try {
            const res = await uploadToR2(file, `signatures/${org.id}`, file.name);
            setSSignatureUrl(res.url);
            await supabase.from('organizations').update({ signature_url: res.url }).eq('id', org.id);
            setOrg({ ...org, signature_url: res.url });
            toast.success('Signature enregistrée avec succès !');
        } catch (err: any) {
            toast.error('Erreur upload signature : ' + err.message);
        } finally {
            setUploadingSignature(false);
        }
    };

    const handleSettingsStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingStamp(true);
        try {
            const res = await uploadToR2(file, `stamps/${org.id}`, file.name);
            setSStampUrl(res.url);
            await supabase.from('organizations').update({ stamp_url: res.url }).eq('id', org.id);
            setOrg({ ...org, stamp_url: res.url });
            toast.success('Cachet enregistré avec succès !');
        } catch (err: any) {
            toast.error('Erreur upload cachet : ' + err.message);
        } finally {
            setUploadingStamp(false);
        }
    };

    const verifyDomain = async () => {
        if (!sCustomDomain.trim()) return;
        setSVerifying(true);
        try {
            const cleanDomain = sCustomDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
            const { error } = await supabase
                .from('organizations')
                .update({
                    custom_domain: cleanDomain,
                    custom_domain_verified: false,
                    custom_domain_ssl: 'pending'
                })
                .eq('id', org.id);
            if (error) throw error;
            setSCustomDomain(cleanDomain);
            setSDomainVerified(false);
            setSDomainSsl('pending');
            toast.info('Domaine enregistré. Configurez vos DNS et patientez pour la validation SSL.');
        } catch (e: any) {
            toast.error('Erreur configuration domaine : ' + e.message);
        } finally {
            setSVerifying(false);
        }
    };

    const removeDomain = async () => {
        try {
            await supabase
                .from('organizations')
                .update({
                    custom_domain: null,
                    custom_domain_verified: false,
                    custom_domain_ssl: null
                })
                .eq('id', org.id);
            setSCustomDomain('');
            setSDomainVerified(false);
            setSDomainSsl('pending');
            toast.success('Domaine personnalisé retiré');
        } catch (e: any) {
            toast.error('Erreur retrait domaine : ' + e.message);
        }
    };

    const saveSettings = async () => {
        setSSavingSettings(true);
        try {
            const payload = {
                name: sOrgName,
                phone: sOrgPhone,
                email: sOrgEmail,
                whatsapp: sOrgWhatsapp,
                brand_color: sBrandColor,
                logo_url: sLogoUrl || null,
                favicon_url: sFaviconUrl || null,
                meta_title: sMetaTitle || null,
                meta_description: sMetaDesc || null,
                signature_url: sSignatureUrl || null,
                stamp_url: sStampUrl || null
            };
            const { error } = await supabase.from('organizations').update(payload).eq('id', org.id);
            if (error) throw error;
            setOrg({ ...org, ...payload });
            toast.success('Paramètres sauvegardés avec succès ! ✅');
        } catch (err: any) {
            toast.error('Erreur sauvegarde : ' + err.message);
        } finally {
            setSSavingSettings(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            <h2 className="font-bold text-lg text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-400" /> Paramètres &amp; Personnalisation
            </h2>

            {/* ── SECURITY PIN CARD ── */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/60 border border-white/10">
                <h3 className="font-bold mb-1 flex items-center gap-2 text-white">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Code PIN de sécurité — Documents officiels
                </h3>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Ce code PIN est requis avant chaque export de document officiel (Certificat, Bulletin, Relevé, Reçu).
                    Il vous engage personnellement en tant que responsable légal de l&apos;établissement.
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border',
                            adminSecurityPin
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        )}
                    >
                        {adminSecurityPin ? (
                            <>
                                <ShieldCheck className="w-4 h-4" /> PIN actif — Protection activée
                            </>
                        ) : (
                            <>
                                <Lock className="w-4 h-4" /> Aucun PIN défini — Non protégé
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {!adminSecurityPin ? (
                            <button
                                onClick={() => {
                                    setPinModalMode('set_pin');
                                    setPinInput('');
                                    setPinConfirmInput('');
                                    setPinError('');
                                    setPinModalOpen(true);
                                }}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                            >
                                <KeyRound className="w-3.5 h-3.5" /> Définir mon PIN
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    setPinModalMode('change_pin');
                                    setPinInput('');
                                    setPinConfirmInput('');
                                    setOldPinInput('');
                                    setPinError('');
                                    setPinModalOpen(true);
                                }}
                                className="px-4 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                            >
                                <KeyRound className="w-3.5 h-3.5" /> Modifier le PIN
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── SKY POINTS OVERVIEW ── */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/30 to-orange-950/20 border border-amber-500/20">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold flex items-center gap-2 text-white">
                        <span className="text-xl">⭐</span> Sky Points — Votre solde
                    </h3>
                    <button onClick={() => setShowPointsModal(true)} className="text-xs text-amber-400 hover:text-amber-300 transition underline underline-offset-2">
                        Voir le barème complet
                    </button>
                </div>
                <div className="flex items-end gap-2 mb-4">
                    <span className="text-4xl font-extrabold text-amber-300">{new Intl.NumberFormat('fr-FR').format(adminSkyPoints)}</span>
                    <span className="text-amber-400/70 text-sm mb-1">Sky Points</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-center">
                    {[
                        { label: 'Bonus création', value: '+1 000 pts', color: 'text-emerald-300' },
                        { label: 'Bonus quotidien', value: '+1 pt / jour', color: 'text-teal-300' },
                        { label: 'Export document', value: '−1 pt', color: 'text-red-400' },
                        { label: 'Monitoring (once)', value: '−10 pts', color: 'text-violet-400' },
                    ].map((item, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                            <div className={`font-bold ${item.color}`}>{item.value}</div>
                            <div className="text-slate-500 mt-0.5">{item.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── CUSTOM DOMAIN ── */}
            <div className="p-5 rounded-2xl bg-purple-600/5 border border-purple-500/20">
                <h3 className="font-bold text-purple-300 mb-1 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Domaine personnalisé
                </h3>
                <p className="text-xs text-slate-500 mb-4">Connectez votre propre nom de domaine pour un accès entièrement personnalisé à votre établissement.</p>

                {sDomainVerified && sCustomDomain ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-600/10 border border-emerald-500/20">
                            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                            <div className="flex-1">
                                <p className="font-medium text-emerald-300">Domaine actif</p>
                                <a
                                    href={`https://${sCustomDomain}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-emerald-400 hover:underline flex items-center gap-1"
                                >
                                    https://{sCustomDomain} <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                            <div className="flex items-center gap-2">
                                <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                                        sDomainSsl === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                                    }`}
                                >
                                    SSL {sDomainSsl === 'active' ? '✓' : '⏳ en cours...'}
                                </span>
                                <Button size="sm" variant="ghost" className="text-red-400 h-7 text-xs" onClick={removeDomain}>
                                    <Trash2 className="w-3 h-3 mr-1" /> Retirer
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <Input
                                value={sCustomDomain}
                                onChange={e => setSCustomDomain(e.target.value)}
                                placeholder="monecole.com ou ecole.mondomaine.com"
                                className="bg-white/5 border-white/10 text-white h-10 rounded-xl flex-1"
                            />
                            <Button onClick={verifyDomain} disabled={sVerifying || !sCustomDomain.trim()} className="bg-purple-600 shrink-0 rounded-xl">
                                {sVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                                Enregistrer
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── BRANDING ── */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                <h3 className="font-bold mb-3 flex items-center gap-2 text-white">
                    <Palette className="w-4 h-4 text-pink-400" /> Apparence &amp; Marque
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-slate-400 text-xs">Logo de l&apos;établissement</Label>
                        <div className="mt-1 flex items-center gap-3">
                            {sLogoUrl ? (
                                <img src={sLogoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-contain bg-white/10 p-1 border border-white/10" />
                            ) : (
                                <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                                    <ImagePlus className="w-6 h-6" />
                                </div>
                            )}
                            <div>
                                <input type="file" accept="image/*" className="hidden" id="settings-logo-upload" onChange={handleSettingsLogoUpload} />
                                <label
                                    htmlFor="settings-logo-upload"
                                    className="cursor-pointer px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 text-xs font-medium hover:bg-indigo-600/30 transition inline-flex items-center gap-1"
                                >
                                    <Upload className="w-3 h-3" /> {sLogoUrl ? 'Changer' : 'Uploader'}
                                </label>
                                {uploadingImage && (
                                    <p className="text-xs text-indigo-400 mt-1">
                                        <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> Upload...
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">URL du favicon</Label>
                        <Input
                            value={sFaviconUrl}
                            onChange={e => setSFaviconUrl(e.target.value)}
                            placeholder="https://...favicon.ico"
                            className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">Couleur principale</Label>
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                type="color"
                                value={sBrandColor}
                                onChange={e => setSBrandColor(e.target.value)}
                                className="w-9 h-9 rounded-lg border border-white/10 cursor-pointer bg-transparent"
                            />
                            <Input
                                value={sBrandColor}
                                onChange={e => setSBrandColor(e.target.value)}
                                className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm flex-1"
                            />
                            <div className="w-20 h-9 rounded-xl" style={{ backgroundColor: sBrandColor }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── SEO ── */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                <h3 className="font-bold mb-3 flex items-center gap-2 text-white">
                    <Search className="w-4 h-4 text-blue-400" /> SEO &amp; Référencement
                </h3>
                <div className="space-y-3">
                    <div>
                        <Label className="text-slate-400 text-xs">Titre de la page (meta title)</Label>
                        <Input
                            value={sMetaTitle}
                            onChange={e => setSMetaTitle(e.target.value)}
                            placeholder={`${org.name} — Portail étudiant`}
                            className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">Description (meta description)</Label>
                        <Input
                            value={sMetaDesc}
                            onChange={e => setSMetaDesc(e.target.value)}
                            placeholder="Bienvenue sur le portail de notre établissement..."
                            className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                        />
                    </div>
                </div>
            </div>

            {/* ── SIGNATURE & CACHET OFFICIEL ── */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-600/10 via-white/[0.02] to-teal-600/10 border border-amber-500/20 space-y-4">
                <div>
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                        <Award className="w-5 h-5 text-amber-400" /> Signature &amp; Cachet Officiels de l&apos;Établissement
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                        Téléversez la signature et le cachet de votre établissement pour les documents officiels.
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 pt-1">
                    {/* Signature */}
                    <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-slate-300 text-xs font-bold flex items-center gap-1.5">
                                <Edit className="w-3.5 h-3.5 text-teal-400" /> Signature du Directeur / Signataire
                            </Label>
                            {sSignatureUrl && (
                                <button
                                    onClick={async () => {
                                        setSSignatureUrl('');
                                        await supabase.from('organizations').update({ signature_url: null }).eq('id', org.id);
                                        setOrg({ ...org, signature_url: null });
                                        toast.success('Signature supprimée');
                                    }}
                                    className="text-[10px] text-red-400 hover:text-red-300 transition"
                                >
                                    Supprimer
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            {sSignatureUrl ? (
                                <div className="w-32 h-20 rounded-xl bg-white/10 p-2 border border-teal-500/30 flex items-center justify-center">
                                    <img src={sSignatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
                                </div>
                            ) : (
                                <div className="w-32 h-20 rounded-xl bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center text-slate-500 text-[10px] p-2 text-center">
                                    <Edit className="w-5 h-5 mb-1 opacity-50" /> Aucune signature
                                </div>
                            )}
                            <div className="flex-1 space-y-1.5">
                                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" id="settings-signature-upload" onChange={handleSettingsSignatureUpload} />
                                <label
                                    htmlFor="settings-signature-upload"
                                    className="cursor-pointer px-3.5 py-2 rounded-xl bg-teal-600/20 text-teal-300 hover:bg-teal-600/30 border border-teal-500/30 text-xs font-semibold transition inline-flex items-center gap-1.5"
                                >
                                    <Upload className="w-3.5 h-3.5" /> {sSignatureUrl ? 'Remplacer signature' : 'Uploader signature'}
                                </label>
                                <p className="text-[10px] text-slate-500">Format PNG transparent recommandé (max 5 Mo)</p>
                                {uploadingSignature && (
                                    <p className="text-xs text-teal-400 flex items-center gap-1">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Enregistrement...
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Cachet */}
                    <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-slate-300 text-xs font-bold flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Cachet / Sceau Officiel
                            </Label>
                            {sStampUrl && (
                                <button
                                    onClick={async () => {
                                        setSStampUrl('');
                                        await supabase.from('organizations').update({ stamp_url: null }).eq('id', org.id);
                                        setOrg({ ...org, stamp_url: null });
                                        toast.success('Cachet supprimé');
                                    }}
                                    className="text-[10px] text-red-400 hover:text-red-300 transition"
                                >
                                    Supprimer
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            {sStampUrl ? (
                                <div className="w-24 h-20 rounded-xl bg-white/10 p-2 border border-amber-500/30 flex items-center justify-center">
                                    <img src={sStampUrl} alt="Cachet" className="max-h-full max-w-full object-contain" />
                                </div>
                            ) : (
                                <div className="w-24 h-20 rounded-xl bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center text-slate-500 text-[10px] p-2 text-center">
                                    <ShieldCheck className="w-5 h-5 mb-1 opacity-50" /> Aucun cachet
                                </div>
                            )}
                            <div className="flex-1 space-y-1.5">
                                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" id="settings-stamp-upload" onChange={handleSettingsStampUpload} />
                                <label
                                    htmlFor="settings-stamp-upload"
                                    className="cursor-pointer px-3.5 py-2 rounded-xl bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 border border-amber-500/30 text-xs font-semibold transition inline-flex items-center gap-1.5"
                                >
                                    <Upload className="w-3.5 h-3.5" /> {sStampUrl ? 'Remplacer cachet' : 'Uploader cachet'}
                                </label>
                                <p className="text-[10px] text-slate-500">Tampon rond ou rectangulaire (fond transparent conseillé)</p>
                                {uploadingStamp && (
                                    <p className="text-xs text-amber-400 flex items-center gap-1">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Enregistrement...
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── ORG INFO ── */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                <h3 className="font-bold mb-3 flex items-center gap-2 text-white">
                    <Edit className="w-4 h-4 text-indigo-400" /> Informations de l&apos;établissement
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                        <Label className="text-slate-400 text-xs">Nom de l&apos;établissement</Label>
                        <Input
                            value={sOrgName}
                            onChange={e => setSOrgName(e.target.value)}
                            className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">Téléphone</Label>
                        <Input
                            value={sOrgPhone}
                            onChange={e => setSOrgPhone(e.target.value)}
                            className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">Email</Label>
                        <Input
                            type="email"
                            value={sOrgEmail}
                            onChange={e => setSOrgEmail(e.target.value)}
                            className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-slate-400 text-xs">WhatsApp</Label>
                        <Input
                            value={sOrgWhatsapp}
                            onChange={e => setSOrgWhatsapp(e.target.value)}
                            placeholder="+237 6XX..."
                            className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                        />
                    </div>
                </div>
            </div>

            {/* ── Mon Avis & Témoignage ── */}
            {org && (
                <div className="pt-2">
                    <ReviewSection
                        userId={session?.user?.id || org.id}
                        userName={org.name}
                        userRole="admin"
                        orgId={org.id}
                        orgName={org.name}
                    />
                </div>
            )}

            {/* ── Signaler un bug ── */}
            {org && (
                <div className="flex justify-start pt-1">
                    <BugReportButton
                        userId={session?.user?.id || org.id}
                        userName={`Admin (${org.name})`}
                        userRole="admin"
                        orgId={org.id}
                        orgName={org.name}
                        orgSlug={org.slug}
                    />
                </div>
            )}

            {/* Save button */}
            <div className="flex justify-end pt-4">
                <Button
                    onClick={saveSettings}
                    disabled={sSavingSettings}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 rounded-xl h-10 shadow-lg shadow-purple-600/25"
                >
                    {sSavingSettings ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Sauvegarder tous les paramètres
                </Button>
            </div>
        </div>
    );
}
