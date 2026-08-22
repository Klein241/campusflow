'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Award, FileText, Palette, Edit, CheckCircle2, FileDown, GraduationCap } from 'lucide-react';
import { CERTIFICATE_TEMPLATES, generateCertificatePDF, type CertificateData } from '@/lib/certificate-pdf';
import { toast } from 'sonner';

interface Cls {
    id?: string;
    name: string;
}

interface AdminCertificatesTabProps {
    org: any;
    students: any[];
    cls: Cls[];
    sSignatureUrl: string;
    sStampUrl: string;
    onNavigateTab: (tab: any) => void;
    requirePinVerification: (docName: string, skyCost: number, onApproved: () => Promise<void>) => Promise<void>;
}

export function AdminCertificatesTab({
    org,
    students,
    cls,
    sSignatureUrl,
    sStampUrl,
    onNavigateTab,
    requirePinVerification
}: AdminCertificatesTabProps) {
    const [certStudentId, setCertStudentId] = useState('');
    const [certTitle, setCertTitle] = useState('CERTIFICAT DE FIN DE FORMATION');
    const [certSubtitle, setCertSubtitle] = useState('ATTESTATION DE RÉUSSITE ACADÉMIQUE');
    const [certCourseName, setCertCourseName] = useState('');
    const [certMention, setCertMention] = useState('Mention Bien');
    const [certLocation, setCertLocation] = useState(org?.city || 'Yaoundé');
    const [certDate, setCertDate] = useState(new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }));
    const [certSignatory1Name, setCertSignatory1Name] = useState('');
    const [certSignatory1Title, setCertSignatory1Title] = useState('Le Directeur Général');
    const [certSignatory2Name, setCertSignatory2Name] = useState('');
    const [certSignatory2Title, setCertSignatory2Title] = useState('Le Responsable Pédagogique');
    const [certTemplate, setCertTemplate] = useState<number>(1);
    const [certShowSignature, setCertShowSignature] = useState(true);
    const [certShowStamp, setCertShowStamp] = useState(true);

    const generateCert = async () => {
        if (!certStudentId) {
            toast.error('Veuillez sélectionner un étudiant.');
            return;
        }
        const stu = students.find((s: any) => s.id === certStudentId);
        if (!stu) return;

        const docLabel = `Certificat — ${stu.first_name} ${stu.last_name}`;

        await requirePinVerification(docLabel, 1, async () => {
            try {
                const clsObj = cls.find(c => c.id === stu.classroom_id);
                const certData: CertificateData = {
                    org: {
                        name: org?.name || 'CampusFlow Academy',
                        logo_url: org?.logo_url,
                        signature_url: certShowSignature ? (sSignatureUrl || org?.signature_url) : undefined,
                        stamp_url: certShowStamp ? (sStampUrl || org?.stamp_url) : undefined,
                        phone: org?.phone,
                        email: org?.email,
                        city: org?.city || 'Yaoundé',
                        country: org?.country || 'Cameroun'
                    },
                    student: {
                        first_name: stu.first_name,
                        last_name: stu.last_name,
                        matricule: stu.matricule || undefined,
                        classroom_name: clsObj?.name
                    },
                    certificate: {
                        title: certTitle,
                        subtitle: certSubtitle,
                        course_name: certCourseName || clsObj?.name || 'Formation Complète',
                        mention: certMention !== 'Sans mention' ? certMention : undefined,
                        date_issued: certDate,
                        location: certLocation,
                        signatory1_title: certSignatory1Title || 'Le Directeur Général',
                        signatory1_name: certSignatory1Name || undefined,
                        signatory2_title: certSignatory2Title || undefined,
                        signatory2_name: certSignatory2Name || undefined,
                        show_stamp: certShowStamp,
                        show_signature: certShowSignature
                    }
                };

                generateCertificatePDF(certData, certTemplate);
                toast.success('🎓 Certificat généré et téléchargé avec succès !');
            } catch (err: any) {
                toast.error('Erreur génération certificat : ' + err.message);
            }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <Award className="w-5 h-5 text-amber-400" /> Générateur de Certificats &amp; Diplômes
                    </h2>
                    <p className="text-slate-400 text-xs mt-0.5">
                        Émettez des attestations de réussite et certificats officiels au format A4 Paysage.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Colonne Gauche : Formulaire */}
                <div className="space-y-4">
                    {/* Sélection Étudiant */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                        <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-emerald-400" /> Étudiant Bénéficiaire
                        </h3>
                        <div>
                            <Label className="text-slate-400 text-xs">Sélectionnez un étudiant *</Label>
                            <select
                                value={certStudentId}
                                onChange={e => {
                                    const id = e.target.value;
                                    setCertStudentId(id);
                                    const s = students.find((x: any) => x.id === id);
                                    if (s) {
                                        const clsObj = cls.find(c => c.id === s.classroom_id);
                                        setCertCourseName(clsObj?.name || 'Formation Spécialisée');
                                    }
                                }}
                                className="w-full h-10 mt-1 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm focus:outline-none focus:border-amber-500"
                            >
                                <option value="" className="bg-slate-900">— Choisir un étudiant —</option>
                                {students
                                    .filter((s: any) => s.approval_status === 'approved' || !s.approval_status)
                                    .map((s: any) => (
                                        <option key={s.id} value={s.id} className="bg-slate-900">
                                            {s.first_name} {s.last_name}
                                            {s.matricule ? ` — ${s.matricule}` : ''}
                                            {cls.find(c => c.id === s.classroom_id) ? ` (${cls.find(c => c.id === s.classroom_id)?.name})` : ''}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    </div>

                    {/* Informations Certificat */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                        <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-400" /> Informations du certificat
                        </h3>

                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <Label className="text-slate-400 text-xs">Titre principal</Label>
                                <Input
                                    value={certTitle}
                                    onChange={e => setCertTitle(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                                    placeholder="CERTIFICAT DE FIN DE FORMATION"
                                />
                            </div>
                            <div>
                                <Label className="text-slate-400 text-xs">Sous-titre</Label>
                                <Input
                                    value={certSubtitle}
                                    onChange={e => setCertSubtitle(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                                    placeholder="ATTESTATION DE RÉUSSITE ACADÉMIQUE"
                                />
                            </div>
                            <div>
                                <Label className="text-slate-400 text-xs">Formation / Filière</Label>
                                <Input
                                    value={certCourseName}
                                    onChange={e => setCertCourseName(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                                    placeholder="Développement Web & Mobile"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-slate-400 text-xs">Mention</Label>
                                    <select
                                        value={certMention}
                                        onChange={e => setCertMention(e.target.value)}
                                        className="w-full h-9 mt-1 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm focus:outline-none focus:border-amber-500"
                                    >
                                        <option className="bg-slate-900" value="Mention Très Bien">Mention Très Bien</option>
                                        <option className="bg-slate-900" value="Mention Bien">Mention Bien</option>
                                        <option className="bg-slate-900" value="Mention Assez Bien">Mention Assez Bien</option>
                                        <option className="bg-slate-900" value="Mention Passable">Mention Passable</option>
                                        <option className="bg-slate-900" value="Excellence">Excellence</option>
                                        <option className="bg-slate-900" value="Sans mention">Sans mention</option>
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-slate-400 text-xs">Lieu de délivrance</Label>
                                    <Input
                                        value={certLocation}
                                        onChange={e => setCertLocation(e.target.value)}
                                        className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                                        placeholder="Yaoundé"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="text-slate-400 text-xs">Date de délivrance</Label>
                                <Input
                                    value={certDate}
                                    onChange={e => setCertDate(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                                    placeholder="14 août 2026"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Signataires */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                        <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2">
                            <Edit className="w-4 h-4 text-teal-400" /> Signataires
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-slate-400 text-xs">Nom signataire 1</Label>
                                <Input
                                    value={certSignatory1Name}
                                    onChange={e => setCertSignatory1Name(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                                    placeholder="Nom du directeur"
                                />
                            </div>
                            <div>
                                <Label className="text-slate-400 text-xs">Titre signataire 1</Label>
                                <Input
                                    value={certSignatory1Title}
                                    onChange={e => setCertSignatory1Title(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                                    placeholder="Le Directeur Général"
                                />
                            </div>
                            <div>
                                <Label className="text-slate-400 text-xs">Nom signataire 2</Label>
                                <Input
                                    value={certSignatory2Name}
                                    onChange={e => setCertSignatory2Name(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                                    placeholder="Nom du responsable"
                                />
                            </div>
                            <div>
                                <Label className="text-slate-400 text-xs">Titre signataire 2</Label>
                                <Input
                                    value={certSignatory2Title}
                                    onChange={e => setCertSignatory2Title(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                                    placeholder="Le Responsable Pédagogique"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-6 pt-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={certShowSignature}
                                    onChange={e => setCertShowSignature(e.target.checked)}
                                    className="w-4 h-4 accent-teal-500 rounded"
                                />
                                <span className="text-xs text-slate-300">Afficher la signature</span>
                                {sSignatureUrl || org?.signature_url ? (
                                    <span className="text-[10px] text-teal-400">✓ chargée</span>
                                ) : (
                                    <span className="text-[10px] text-slate-500">(non configurée)</span>
                                )}
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={certShowStamp}
                                    onChange={e => setCertShowStamp(e.target.checked)}
                                    className="w-4 h-4 accent-amber-500 rounded"
                                />
                                <span className="text-xs text-slate-300">Afficher le cachet</span>
                                {sStampUrl || org?.stamp_url ? (
                                    <span className="text-[10px] text-amber-400">✓ chargé</span>
                                ) : (
                                    <span className="text-[10px] text-slate-500">(non configuré)</span>
                                )}
                            </label>
                        </div>
                    </div>
                </div>

                {/* Colonne Droite : Modèle & Aperçu */}
                <div className="space-y-4">
                    {/* Sélecteur de Modèle */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                        <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2">
                            <Palette className="w-4 h-4 text-violet-400" /> Modèle graphique de certificat
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {CERTIFICATE_TEMPLATES.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setCertTemplate(t.id)}
                                    className={`p-4 rounded-2xl border-2 text-left transition-all relative ${
                                        certTemplate === t.id
                                            ? 'border-amber-500 bg-amber-600/10 shadow-lg shadow-amber-500/10'
                                            : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                                    }`}
                                >
                                    {certTemplate === t.id && (
                                        <CheckCircle2 className="w-4 h-4 text-amber-400 absolute top-3 right-3" />
                                    )}
                                    <span className="text-3xl block mb-2">{t.icon}</span>
                                    <p className="font-bold text-xs text-white mb-1">{t.name}</p>
                                    <p className="text-[10px] text-slate-500 leading-relaxed">{t.description}</p>
                                    <p className="text-[9px] text-slate-600 mt-2 italic">{t.suited}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Récapitulatif */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-600/10 to-orange-600/5 border border-amber-500/20 space-y-2">
                        <p className="text-sm font-bold text-amber-300 flex items-center gap-2">
                            <Award className="w-4 h-4" /> Récapitulatif du certificat
                        </p>
                        <div className="space-y-1 text-xs text-slate-400">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Étudiant</span>
                                <span className="text-white font-medium">
                                    {certStudentId
                                        ? (() => {
                                              const s = students.find((x: any) => x.id === certStudentId);
                                              return s ? `${s.first_name} ${s.last_name}` : '—';
                                          })()
                                        : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Formation</span>
                                <span className="text-white font-medium truncate ml-4 max-w-[180px]">{certCourseName || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Mention</span>
                                <span className="text-amber-300 font-medium">{certMention !== 'Sans mention' ? certMention : '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Date</span>
                                <span className="text-white">{certDate || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Modèle</span>
                                <span className="text-white">{CERTIFICATE_TEMPLATES.find(t => t.id === certTemplate)?.name || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Format</span>
                                <span className="text-teal-300 font-bold">A4 Paysage · PDF</span>
                            </div>
                        </div>
                        <Button
                            onClick={generateCert}
                            disabled={!certStudentId}
                            className="mt-2 w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                        >
                            <FileDown className="w-4 h-4" />
                            {certStudentId ? 'Générer & Imprimer le PDF' : 'Sélectionner un étudiant d\'abord'}
                        </Button>
                    </div>

                    {/* Lien rapide Étudiants */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-teal-400 shrink-0" />
                        <div className="flex-1">
                            <p className="text-xs font-medium text-slate-300">Générer depuis la liste des étudiants</p>
                            <p className="text-[10px] text-slate-600">Utilisez le bouton 🎓 sur chaque carte étudiant pour pré-remplir automatiquement.</p>
                        </div>
                        <button
                            onClick={() => onNavigateTab('students')}
                            className="text-[10px] px-3 py-1.5 rounded-lg bg-teal-600/10 text-teal-300 hover:bg-teal-600/20 transition font-medium whitespace-nowrap"
                        >
                            Voir étudiants
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
