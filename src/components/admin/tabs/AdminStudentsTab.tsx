'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Plus, Search, GraduationCap, Copy, Edit, ArrowRight,
    Printer, Award, ClipboardList, RefreshCw, Trash2,
    CheckCircle2, X, FileText, UserPlus, Loader2, Mail, Save
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Cls {
    id?: string;
    name: string;
    filiere_id?: string;
}

interface AdminStudentsTabProps {
    org: any;
    students: any[];
    setStudents: React.Dispatch<React.SetStateAction<any[]>>;
    cls: any[];
    filieres?: any[];
    inscRequests: any[];
    setInscRequests: React.Dispatch<React.SetStateAction<any[]>>;
    saving: boolean;
    createStudent: (formData: any) => Promise<string | undefined>;
    deleteStudent: (id: string) => Promise<void>;
    resetStudentPin: (id: string, accessCode: string, name: string) => Promise<void>;
    setSuspendModal: (modal: { id: string; name: string; type: 'teacher' | 'student'; isSuspended: boolean } | null) => void;
    setEmailModalOpen: (open: boolean) => void;
    exportStudentBulletinPdf: (student: any) => void;
    openCertForStudent: (student: any) => void;
    exportReleveNotesPdf: (student: any) => void;
}

export function AdminStudentsTab({
    org,
    students,
    setStudents,
    cls,
    filieres = [],
    inscRequests,
    setInscRequests,
    saving,
    createStudent,
    deleteStudent,
    resetStudentPin,
    setSuspendModal,
    setEmailModalOpen,
    exportStudentBulletinPdf,
    openCertForStudent,
    exportReleveNotesPdf
}: AdminStudentsTabProps) {
    const [studentSubTab, setStudentSubTab] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
    const [studentSearch, setStudentSearch] = useState('');
    const [studentClsFilter, setStudentClsFilter] = useState('');
    const [showAddStudent, setShowAddStudent] = useState(false);

    // Form inscription rapide
    const [sFN, setSFN] = useState('');
    const [sLN, setSLN] = useState('');
    const [sSex, setSSex] = useState('M');
    const [sBirth, setSBirth] = useState('');
    const [sClsId, setSClsId] = useState('');
    const [sNat, setSNat] = useState('');
    const [sPhone, setSPhone] = useState('');
    const [sGuardian, setSGuardian] = useState('');
    const [sGuardianPhone, setSGuardianPhone] = useState('');
    const [sRes, setSRes] = useState('');
    const [sShowCode, setSShowCode] = useState('');

    // Inscription requests interactions
    const [chatDetailId, setChatDetailId] = useState<string | null>(null);
    const [inscActionId, setInscActionId] = useState<string | null>(null);
    const [inscMsg, setInscMsg] = useState('');
    const [inscSaving, setInscSaving] = useState(false);

    // Edit modal
    const [editStudentId, setEditStudentId] = useState<string | null>(null);
    const [editStudentData, setEditStudentData] = useState<any>(null);
    const [sendFormMsg, setSendFormMsg] = useState('');
    const [savingStudent, setSavingStudent] = useState(false);

    // Migrate modal
    const [migrateStudentId, setMigrateStudentId] = useState<string | null>(null);
    const [migrateStudentName, setMigrateStudentName] = useState('');
    const [migrateNewFiliereId, setMigrateNewFiliereId] = useState('');
    const [migrateNewClsId, setMigrateNewClsId] = useState('');
    const [savingMigrate, setSavingMigrate] = useState(false);

    const handleCreateStudent = async () => {
        if (!sFN.trim() || !sLN.trim() || !sClsId) return;
        const code = await createStudent({
            first_name: sFN.trim(),
            last_name: sLN.trim(),
            sex: sSex,
            birth_date: sBirth || null,
            classroom_id: sClsId,
            nationality: sNat.trim(),
            phone: sPhone.trim(),
            guardian_name: sGuardian.trim(),
            guardian_phone: sGuardianPhone.trim(),
            residence: sRes.trim()
        });
        if (code) {
            setSShowCode(code);
            setSFN('');
            setSLN('');
            setSPhone('');
            setSGuardian('');
            setSGuardianPhone('');
            setSRes('');
        }
    };

    return (
        <div className="space-y-5 animate-in fade-in duration-200">
            {/* 4 sous-onglets */}
            <div className="flex items-center gap-2 p-1 rounded-2xl bg-black/40 border border-white/10 w-full overflow-x-auto">
                {([
                    { key: 'all', label: '👥 Tous', count: students.length, color: 'from-indigo-600 to-blue-600' },
                    {
                        key: 'approved',
                        label: '✅ Approuvés',
                        count: students.filter((s: any) => s.approval_status === 'approved' || !s.approval_status).length,
                        color: 'from-emerald-600 to-teal-600'
                    },
                    {
                        key: 'pending',
                        label: '⏳ En attente',
                        count:
                            inscRequests.filter((r: any) => r.status === 'pending' || r.status === 'info_needed').length +
                            students.filter(
                                (s: any) =>
                                    (s.approval_status === 'pending' || s.approval_status === 'info_needed') &&
                                    !inscRequests.some((r: any) => r.access_code && r.access_code === s.access_code && (r.status === 'pending' || r.status === 'info_needed'))
                            ).length,
                        color: 'from-amber-600 to-orange-600'
                    },
                    {
                        key: 'rejected',
                        label: '❌ Rejetés',
                        count:
                            inscRequests.filter((r: any) => r.status === 'rejected').length +
                            students.filter((s: any) => s.approval_status === 'rejected').length,
                        color: 'from-red-700 to-rose-700'
                    },
                ] as const).map(st => (
                    <button
                        key={st.key}
                        onClick={() => setStudentSubTab(st.key)}
                        className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                            studentSubTab === st.key
                                ? `bg-gradient-to-r ${st.color} text-white shadow-lg`
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {st.label}
                        <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-black ${
                                studentSubTab === st.key ? 'bg-white/20' : 'bg-white/5'
                            }`}
                        >
                            {st.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* SOUS-ONGLET : TOUS & APPROUVÉS */}
            {(studentSubTab === 'all' || studentSubTab === 'approved') && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                            <Input
                                value={studentSearch}
                                onChange={e => setStudentSearch(e.target.value)}
                                placeholder="Nom, matricule ou code..."
                                className="bg-white/5 border-white/10 text-white h-10 pl-10 rounded-xl"
                            />
                        </div>
                        <select
                            value={studentClsFilter}
                            onChange={e => setStudentClsFilter(e.target.value)}
                            className="h-10 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm focus:outline-none focus:border-teal-500"
                        >
                            <option value="" className="bg-slate-900">Toutes classes</option>
                            {cls
                                .filter(c => c.id)
                                .map(c => (
                                    <option key={c.id} value={c.id!} className="bg-slate-900">
                                        {c.name}
                                    </option>
                                ))}
                        </select>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-10 border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-xl font-bold"
                            onClick={() => setEmailModalOpen(true)}
                        >
                            <Mail className="w-4 h-4 mr-1.5 text-indigo-400" /> Notifier par Email
                        </Button>
                        <Button
                            size="sm"
                            className="h-10 bg-teal-600 hover:bg-teal-500 rounded-xl font-bold"
                            onClick={() => {
                                setShowAddStudent(!showAddStudent);
                                setSShowCode('');
                            }}
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            {showAddStudent ? 'Fermer' : 'Inscrire'}
                        </Button>
                    </div>

                    {showAddStudent && (
                        <div className="p-5 rounded-2xl bg-teal-600/5 border border-teal-500/20 space-y-3">
                            <h3 className="font-bold text-teal-300">🎓 Nouvel étudiant</h3>
                            <div className="grid sm:grid-cols-3 gap-3">
                                <div>
                                    <Label className="text-slate-400 text-xs">Prénom *</Label>
                                    <Input value={sFN} onChange={e => setSFN(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" />
                                </div>
                                <div>
                                    <Label className="text-slate-400 text-xs">Nom *</Label>
                                    <Input value={sLN} onChange={e => setSLN(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" />
                                </div>
                                <div>
                                    <Label className="text-slate-400 text-xs">Sexe</Label>
                                    <select
                                        value={sSex}
                                        onChange={e => setSSex(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 text-white text-xs h-9 rounded-lg px-3 mt-1 focus:outline-none focus:border-teal-500"
                                    >
                                        <option value="M" className="bg-slate-900">Masculin</option>
                                        <option value="F" className="bg-slate-900">Féminin</option>
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-slate-400 text-xs">Date de naissance</Label>
                                    <Input type="date" value={sBirth} onChange={e => setSBirth(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" />
                                </div>
                                <div>
                                    <Label className="text-slate-400 text-xs">Classe *</Label>
                                    <select
                                        value={sClsId}
                                        onChange={e => setSClsId(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 text-white text-xs h-9 rounded-lg px-3 mt-1 focus:outline-none focus:border-teal-500"
                                    >
                                        <option value="" className="bg-slate-900">Choisir une classe...</option>
                                        {cls
                                            .filter(c => c.id)
                                            .map(c => (
                                                <option key={c.id} value={c.id!} className="bg-slate-900">
                                                    {c.name}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-slate-400 text-xs">Nationalité</Label>
                                    <Input value={sNat} onChange={e => setSNat(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" />
                                </div>
                                <div>
                                    <Label className="text-slate-400 text-xs">Téléphone</Label>
                                    <Input value={sPhone} onChange={e => setSPhone(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" />
                                </div>
                                <div>
                                    <Label className="text-slate-400 text-xs">Nom du tuteur</Label>
                                    <Input value={sGuardian} onChange={e => setSGuardian(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" />
                                </div>
                                <div>
                                    <Label className="text-slate-400 text-xs">Tél. tuteur</Label>
                                    <Input value={sGuardianPhone} onChange={e => setSGuardianPhone(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" />
                                </div>
                            </div>
                            <Button
                                onClick={handleCreateStudent}
                                disabled={saving || !sFN.trim() || !sLN.trim() || !sClsId}
                                className="bg-teal-600 hover:bg-teal-500 rounded-xl font-bold"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                                <UserPlus className="w-4 h-4 mr-1" /> Inscrire l&apos;étudiant
                            </Button>
                            {sShowCode && (
                                <div className="p-4 rounded-xl bg-teal-600/10 border border-teal-500/30 mt-2">
                                    <p className="text-sm font-bold text-teal-300">✅ Étudiant inscrit ! Code d&apos;accès :</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <code className="text-2xl font-mono font-bold tracking-widest text-white bg-white/10 px-4 py-2 rounded-lg">{sShowCode}</code>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-teal-500/20"
                                            onClick={() => {
                                                navigator.clipboard.writeText(sShowCode);
                                                toast.success('Code copié !');
                                            }}
                                        >
                                            📋 Copier
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Grille cartes étudiants */}
                    {(() => {
                        const filtered = students.filter((s: any) => {
                            const isApproved = s.approval_status === 'approved' || !s.approval_status;
                            const matchesTab = studentSubTab === 'all' ? true : isApproved;
                            const matchSearch =
                                !studentSearch ||
                                `${s.first_name} ${s.last_name} ${s.matricule || ''} ${s.access_code || ''}`.toLowerCase().includes(studentSearch.toLowerCase());
                            const matchCls = !studentClsFilter || s.classroom_id === studentClsFilter;
                            return matchesTab && matchSearch && matchCls;
                        });

                        if (filtered.length === 0)
                            return (
                                <div className="text-center py-16 text-slate-500 bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                                    <GraduationCap className="w-14 h-14 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">{studentSubTab === 'all' ? 'Aucun étudiant trouvé' : 'Aucun étudiant approuvé'}</p>
                                </div>
                            );

                        return (
                            <>
                                <p className="text-xs text-slate-500">{filtered.length} étudiant(s)</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {filtered.map((s: any) => {
                                        const isPending = s.approval_status === 'pending';
                                        const isInfoNeeded = s.approval_status === 'info_needed';
                                        const isRejected = s.approval_status === 'rejected';

                                        return (
                                            <div
                                                key={s.id}
                                                className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 shadow-xl hover:shadow-2xl bg-gradient-to-br from-[#131927] via-[#111622] to-[#0E121B] ${
                                                    isInfoNeeded
                                                        ? 'border-blue-500/40 hover:border-blue-400'
                                                        : isPending
                                                        ? 'border-amber-500/40 hover:border-amber-400'
                                                        : isRejected
                                                        ? 'border-red-500/30'
                                                        : 'border-white/10 hover:border-teal-500/40'
                                                }`}
                                            >
                                                {/* Header avec photo */}
                                                <div
                                                    className={`relative h-16 bg-gradient-to-r ${
                                                        isInfoNeeded
                                                            ? 'from-blue-600/25 to-indigo-600/15'
                                                            : isPending
                                                            ? 'from-amber-600/25 to-orange-600/15'
                                                            : isRejected
                                                            ? 'from-red-600/25 to-rose-600/15'
                                                            : 'from-teal-600/20 to-indigo-600/10'
                                                    }`}
                                                >
                                                    <div className="absolute -bottom-7 left-4">
                                                        {s.photo_url ? (
                                                            <img
                                                                src={s.photo_url}
                                                                alt={s.first_name}
                                                                className="w-14 h-14 rounded-2xl object-cover border-2 border-[#111622] shadow-lg"
                                                            />
                                                        ) : (
                                                            <div
                                                                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border-2 border-[#111622] shadow-lg ${
                                                                    s.sex === 'F'
                                                                        ? 'bg-gradient-to-br from-pink-500/30 to-rose-600/20 text-pink-300'
                                                                        : 'bg-gradient-to-br from-teal-500/30 to-indigo-600/20 text-teal-300'
                                                                }`}
                                                            >
                                                                {s.first_name?.[0]}
                                                                {s.last_name?.[0]}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="absolute top-2 right-3 flex items-center gap-1.5">
                                                        <span
                                                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                                                s.sex === 'F'
                                                                    ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                                                                    : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                                            }`}
                                                        >
                                                            {s.sex === 'F' ? '♀' : '♂'}
                                                        </span>
                                                        {isInfoNeeded ? (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                                                                📋 Infos requises
                                                            </span>
                                                        ) : isPending ? (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                                                ⏳ En attente
                                                            </span>
                                                        ) : isRejected ? (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold">
                                                                ❌ Rejeté
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                                                                ✓ Approuvé
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Corps de la carte */}
                                                <div className="pt-9 px-3 pb-3 space-y-2">
                                                    <div>
                                                        <h4 className="font-bold text-white text-sm group-hover:text-teal-300 transition-colors truncate">
                                                            {s.first_name} {s.last_name}
                                                        </h4>
                                                        <p className="text-xs text-indigo-400 font-medium truncate">
                                                            {cls.find(c => c.id === s.classroom_id)?.name || 'Sans classe'}
                                                        </p>
                                                    </div>

                                                    <div className="space-y-1 text-[11px] text-slate-400 bg-black/30 p-2.5 rounded-xl border border-white/5">
                                                        {s.access_code && (
                                                            <div className="flex justify-between items-center pb-1 border-b border-white/5">
                                                                <span className="text-slate-500 font-medium">Code d&apos;accès</span>
                                                                <button
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(s.access_code);
                                                                        toast.success('Code d\'accès copié !');
                                                                    }}
                                                                    className="font-mono text-emerald-400 font-bold hover:text-emerald-300 flex items-center gap-1 text-[11px] bg-emerald-500/10 px-1.5 py-0.5 rounded transition-colors"
                                                                    title="Copier le code d'accès"
                                                                >
                                                                    {s.access_code} <Copy className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-500">Matricule</span>
                                                            <span className="font-mono text-slate-200 font-semibold truncate">{s.matricule || '—'}</span>
                                                        </div>
                                                        {s.phone && (
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">Tél</span>
                                                                <span>{s.phone}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                                                        <button
                                                            onClick={() => {
                                                                setEditStudentId(s.id);
                                                                setEditStudentData({ ...s });
                                                            }}
                                                            className="text-[10px] py-1.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/20 font-semibold flex items-center justify-center gap-1 transition"
                                                        >
                                                            <Edit className="w-3 h-3" /> Modifier
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setMigrateStudentId(s.id);
                                                                setMigrateStudentName(`${s.first_name} ${s.last_name}`);
                                                                setMigrateNewFiliereId(s.filiere_id || '');
                                                                setMigrateNewClsId(s.classroom_id || '');
                                                            }}
                                                            className="text-[10px] py-1.5 rounded-xl bg-violet-600/15 hover:bg-violet-600/30 text-violet-300 border border-violet-500/20 font-semibold flex items-center justify-center gap-1 transition"
                                                        >
                                                            <ArrowRight className="w-3 h-3" /> Migrer
                                                        </button>
                                                        <button
                                                            onClick={() => exportStudentBulletinPdf(s)}
                                                            className="text-[10px] py-1.5 rounded-xl bg-slate-700/30 hover:bg-slate-600/40 text-slate-300 border border-white/10 font-semibold flex items-center justify-center gap-1 transition"
                                                        >
                                                            <Printer className="w-3 h-3" /> Bulletin
                                                        </button>
                                                        <button
                                                            onClick={() => openCertForStudent(s)}
                                                            className="text-[10px] py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/20 font-semibold flex items-center justify-center gap-1 transition"
                                                        >
                                                            <Award className="w-3 h-3" /> Certificat
                                                        </button>
                                                        <button
                                                            onClick={() => exportReleveNotesPdf(s)}
                                                            className="col-span-2 text-[10px] py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/30 text-blue-300 border border-blue-500/20 font-semibold flex items-center justify-center gap-1 transition"
                                                        >
                                                            <ClipboardList className="w-3 h-3" /> Relevé de notes
                                                        </button>
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        <button
                                                            onClick={() => resetStudentPin(s.id, s.access_code, `${s.first_name} ${s.last_name}`)}
                                                            className="flex-1 text-[10px] py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 font-medium flex items-center justify-center gap-1 transition"
                                                        >
                                                            <RefreshCw className="w-3 h-3" /> Reset PIN
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setSuspendModal({
                                                                    id: s.id,
                                                                    name: `${s.first_name} ${s.last_name}`,
                                                                    type: 'student',
                                                                    isSuspended: s.is_active === false
                                                                })
                                                            }
                                                            className={`px-2.5 py-1.5 rounded-xl border font-medium text-[10px] flex items-center gap-1 transition ${
                                                                s.is_active === false
                                                                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20'
                                                                    : 'bg-red-600/10 hover:bg-red-600/20 text-red-400 border-red-500/20'
                                                            }`}
                                                        >
                                                            {s.is_active === false ? '✅' : '🚫'}
                                                        </button>
                                                        <button
                                                            onClick={() => deleteStudent(s.id)}
                                                            className="px-2.5 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 transition"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}

            {/* SOUS-ONGLET : EN ATTENTE */}
            {studentSubTab === 'pending' && (
                <div className="space-y-4">
                    {(() => {
                        const pendingFromInsc = inscRequests.filter((r: any) => r.status === 'pending' || r.status === 'info_needed');
                        const pendingFromStu = students.filter((s: any) => s.approval_status === 'pending' || s.approval_status === 'info_needed');
                        const pending = [
                            ...pendingFromInsc.map((r: any) => ({ ...r, _source: 'request' })),
                            ...pendingFromStu
                                .filter((s: any) => !pendingFromInsc.some((r: any) => r.access_code && r.access_code === s.access_code))
                                .map((s: any) => ({ ...s, _source: 'profile', status: s.approval_status })),
                        ];

                        if (pending.length === 0)
                            return (
                                <div className="text-center py-16 text-slate-500 bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                                    <ClipboardList className="w-14 h-14 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">Aucune demande en attente</p>
                                </div>
                            );

                        return (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {pending.map((req: any) => (
                                    <div
                                        key={req.id}
                                        className="rounded-2xl border border-white/10 hover:border-amber-500/30 bg-gradient-to-br from-[#131927] to-[#0E121B] shadow-xl transition-all duration-300 overflow-hidden"
                                    >
                                        <div className="flex items-center gap-3 p-4 border-b border-white/5">
                                            <div
                                                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shrink-0 ${
                                                    req.status === 'info_needed'
                                                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                }`}
                                            >
                                                {req.first_name?.[0]}
                                                {req.last_name?.[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-white text-base truncate">
                                                    {req.first_name} {req.last_name}
                                                </h4>
                                                <p className="text-xs text-slate-400">{req.phone || '—'} · {req.email || '—'}</p>
                                                <p className="text-[10px] text-slate-500 mt-0.5">
                                                    Code:{' '}
                                                    <code className="font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                                        {req.access_code || '—'}
                                                    </code>{' '}
                                                    · {new Date(req.created_at || Date.now()).toLocaleDateString('fr-FR')}
                                                </p>
                                            </div>
                                            <span
                                                className={`text-[10px] px-2.5 py-1 rounded-full font-bold shrink-0 ${
                                                    req.status === 'pending'
                                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                }`}
                                            >
                                                {req.status === 'pending' ? '⏳ En attente' : '📋 Infos requises'}
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="px-4 py-4 flex flex-wrap gap-2">
                                            <button
                                                onClick={async () => {
                                                    setInscSaving(true);
                                                    try {
                                                        if (req._source === 'request') {
                                                            await supabase
                                                                .from('inscription_requests')
                                                                .update({ status: 'approved', admin_message: inscMsg || null })
                                                                .eq('id', req.id);
                                                            await supabase
                                                                .from('student_profiles')
                                                                .update({ approval_status: 'approved' })
                                                                .or(req.access_code ? `access_code.eq.${req.access_code},id.eq.${req.id}` : `id.eq.${req.id}`)
                                                                .eq('organization_id', org.id);
                                                            setInscRequests(p => p.filter((r: any) => r.id !== req.id));
                                                        } else {
                                                            await supabase.from('student_profiles').update({ approval_status: 'approved' }).eq('id', req.id);
                                                            if (req.access_code) {
                                                                await supabase.from('inscription_requests').update({ status: 'approved' }).eq('access_code', req.access_code);
                                                                setInscRequests(p => p.filter((r: any) => r.access_code !== req.access_code));
                                                            }
                                                        }
                                                        setStudents(p => p.map((s: any) => (s.id === req.id ? { ...s, approval_status: 'approved' } : s)));
                                                        setInscActionId(null);
                                                        setInscMsg('');
                                                        toast.success(`✅ ${req.first_name} ${req.last_name} approuvé(e) !`);
                                                    } catch (e: any) {
                                                        toast.error(e.message);
                                                    } finally {
                                                        setInscSaving(false);
                                                    }
                                                }}
                                                disabled={inscSaving}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white disabled:opacity-50 transition shadow-sm"
                                            >
                                                {inscSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                Approuver
                                            </button>

                                            <button
                                                onClick={async () => {
                                                    setInscSaving(true);
                                                    try {
                                                        if (req._source === 'request') {
                                                            await supabase.from('inscription_requests').update({ status: 'rejected', admin_message: inscMsg || 'Demande non acceptée.' }).eq('id', req.id);
                                                            setInscRequests(p => p.map((r: any) => (r.id === req.id ? { ...r, status: 'rejected' } : r)));
                                                        }
                                                        await supabase.from('student_profiles').update({ approval_status: 'rejected' }).eq('id', req.id);
                                                        setStudents(p => p.map((s: any) => (s.id === req.id ? { ...s, approval_status: 'rejected' } : s)));
                                                        toast.success('Demande rejetée');
                                                    } catch (e: any) {
                                                        toast.error(e.message);
                                                    } finally {
                                                        setInscSaving(false);
                                                    }
                                                }}
                                                disabled={inscSaving}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-500 text-xs font-bold text-white disabled:opacity-50 transition shadow-sm"
                                            >
                                                <X className="w-3.5 h-3.5" /> Rejeter
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* SOUS-ONGLET : REJETÉS */}
            {studentSubTab === 'rejected' && (
                <div className="space-y-4">
                    {(() => {
                        const rejFromInsc = inscRequests.filter((r: any) => r.status === 'rejected');
                        const rejFromStu = students.filter((s: any) => s.approval_status === 'rejected');
                        const all = [
                            ...rejFromInsc.map((r: any) => ({ ...r, _source: 'request' })),
                            ...rejFromStu.filter((s: any) => !rejFromInsc.some((r: any) => r.access_code === s.access_code)).map((s: any) => ({ ...s, _source: 'profile' })),
                        ];

                        if (all.length === 0)
                            return (
                                <div className="text-center py-16 text-slate-500 bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                                    <X className="w-14 h-14 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">Aucune demande rejetée</p>
                                </div>
                            );

                        return (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {all.map((item: any) => (
                                    <div key={item.id} className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-900/10 to-[#0E121B] shadow-lg p-4 space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base bg-red-500/15 text-red-300 border border-red-500/30 shrink-0">
                                                {item.first_name?.[0]}
                                                {item.last_name?.[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-white truncate">
                                                    {item.first_name} {item.last_name}
                                                </h4>
                                                <p className="text-xs text-slate-400">{item.phone || item.email || '—'}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await supabase.from('student_profiles').update({ approval_status: 'approved' }).eq('id', item.id);
                                                    setStudents(p => p.map((s: any) => (s.id === item.id ? { ...s, approval_status: 'approved' } : s)));
                                                    toast.success(`✅ ${item.first_name} réactivé(e)`);
                                                } catch (e: any) {
                                                    toast.error(e.message);
                                                }
                                            }}
                                            className="w-full text-xs py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center justify-center gap-1.5 transition"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Ré-approuver
                                        </button>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* MODAL ÉDITION ÉTUDIANT */}
            {editStudentId && editStudentData && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="w-full max-w-xl rounded-3xl bg-[#0E121B] border border-white/15 shadow-2xl p-6 space-y-5 overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black text-white">✏️ Modifier le profil</h2>
                            <button
                                onClick={() => {
                                    setEditStudentId(null);
                                    setEditStudentData(null);
                                }}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-slate-400 text-xs">Prénom *</Label>
                                <Input
                                    value={editStudentData.first_name || ''}
                                    onChange={e => setEditStudentData((p: any) => ({ ...p, first_name: e.target.value }))}
                                    className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-slate-400 text-xs">Nom *</Label>
                                <Input
                                    value={editStudentData.last_name || ''}
                                    onChange={e => setEditStudentData((p: any) => ({ ...p, last_name: e.target.value }))}
                                    className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-slate-400 text-xs">Téléphone</Label>
                                <Input
                                    value={editStudentData.phone || ''}
                                    onChange={e => setEditStudentData((p: any) => ({ ...p, phone: e.target.value }))}
                                    className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-slate-400 text-xs">Email</Label>
                                <Input
                                    type="email"
                                    value={editStudentData.email || ''}
                                    onChange={e => setEditStudentData((p: any) => ({ ...p, email: e.target.value }))}
                                    className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => {
                                    setEditStudentId(null);
                                    setEditStudentData(null);
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold transition"
                            >
                                Annuler
                            </button>
                            <button
                                disabled={savingStudent}
                                onClick={async () => {
                                    setSavingStudent(true);
                                    try {
                                        const { error } = await supabase
                                            .from('student_profiles')
                                            .update({
                                                first_name: editStudentData.first_name,
                                                last_name: editStudentData.last_name,
                                                phone: editStudentData.phone || null,
                                                email: editStudentData.email || null,
                                            })
                                            .eq('id', editStudentData.id);
                                        if (error) throw error;
                                        setStudents(p => p.map((s: any) => (s.id === editStudentData.id ? { ...s, ...editStudentData } : s)));
                                        setEditStudentId(null);
                                        setEditStudentData(null);
                                        toast.success('Profil mis à jour ✅');
                                    } catch (e: any) {
                                        toast.error(e.message);
                                    } finally {
                                        setSavingStudent(false);
                                    }
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:opacity-90 text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition shadow-lg"
                            >
                                {savingStudent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL MIGRATION FILIÈRE */}
            {migrateStudentId && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-3xl bg-[#0E121B] border border-white/15 shadow-2xl p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black text-white">🔀 Migration de filière / classe</h2>
                            <button onClick={() => setMigrateStudentId(null)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-slate-400">
                            Déplacer <span className="font-bold text-white">{migrateStudentName}</span> vers une autre classe.
                        </p>
                        <div className="space-y-3">
                            <div>
                                <Label className="text-slate-400 text-xs">Classe cible *</Label>
                                <select
                                    value={migrateNewClsId}
                                    onChange={e => setMigrateNewClsId(e.target.value)}
                                    className="mt-1 w-full h-10 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm focus:outline-none focus:border-teal-500"
                                >
                                    <option value="" className="bg-slate-900">-- Choisir une classe --</option>
                                    {cls
                                        .filter(c => c.id)
                                        .map(c => (
                                            <option key={c.id} value={c.id!} className="bg-slate-900">
                                                {c.name}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button onClick={() => setMigrateStudentId(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold transition">
                                Annuler
                            </button>
                            <button
                                disabled={savingMigrate || !migrateNewClsId}
                                onClick={async () => {
                                    if (!migrateNewClsId) return;
                                    setSavingMigrate(true);
                                    try {
                                        const updatePayload: any = { classroom_id: migrateNewClsId };
                                        const { error } = await supabase.from('student_profiles').update(updatePayload).eq('id', migrateStudentId!);
                                        if (error) throw error;
                                        setStudents(p => p.map((s: any) => (s.id === migrateStudentId ? { ...s, ...updatePayload } : s)));
                                        setMigrateStudentId(null);
                                        toast.success(`✅ ${migrateStudentName} migré(e) avec succès !`);
                                    } catch (e: any) {
                                        toast.error(e.message);
                                    } finally {
                                        setSavingMigrate(false);
                                    }
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition shadow-lg"
                            >
                                {savingMigrate ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                                Migrer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
