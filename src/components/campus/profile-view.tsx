'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    User, LogOut, Copy, CheckCircle2, ShoppingBag, Plus, Edit, Trash2,
    Loader2, Camera, ChevronRight, ExternalLink, Star, BarChart3,
    BookOpen, CircleDollarSign, Settings, KeyRound, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { SessionManager } from '@/lib/session';
import { compressImage } from '@/lib/compress';
import { uploadToR2 } from '@/lib/r2';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PwaInstall } from './pwa-install';

import { UserFeedbackModal, FeedbackTab } from './user-feedback-modal';
import { Bug, Lightbulb, School, Smartphone, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ═══════════════════════════════════════════════════════
// PROFILE VIEW — Profile + Marketplace + Code + Logout
// ═══════════════════════════════════════════════════════

interface ProfileViewProps {
    orgId: string;
    orgSlug: string;
    userId: string;
    userName: string;
    userRole: string;
    orgName: string;
    orgLogo?: string | null;
    userSkyPoints?: number;
    /** Called after user successfully uploads a new profile photo */
    onPhotoUpdate?: (newUrl: string) => void;
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

export function ProfileView({ orgId, orgSlug, userId, userName, userRole, orgName, orgLogo, userSkyPoints, onPhotoUpdate }: ProfileViewProps) {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [classroom, setClassroom] = useState<any>(null);
    const [filiere, setFiliere] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [codeCopied, setCodeCopied] = useState(false);

    // Feedback & Review Modal
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackTab, setFeedbackTab] = useState<FeedbackTab>('bug');

    // Edit Profile Modal states
    const [showEditModal, setShowEditModal] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editBirthDate, setEditBirthDate] = useState('');
    const [editSex, setEditSex] = useState('M');
    const [editResidence, setEditResidence] = useState('');
    const [editGuardianName, setEditGuardianName] = useState('');
    const [editGuardianPhone, setEditGuardianPhone] = useState('');
    const [editSpeciality, setEditSpeciality] = useState('');

    // Marketplace seller
    const [myProducts, setMyProducts] = useState<any[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Stats
    const [grades, setGrades] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);

    // Photo upload
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);

    const handleSaveProfile = async () => {
        if (!editFirstName.trim() || !editLastName.trim()) {
            toast.error('Prénom et nom obligatoires.');
            return;
        }

        setSavingProfile(true);
        try {
            const table = userRole === 'teacher' ? 'teacher_profiles' : 'student_profiles';
            const updates: any = {
                first_name: editFirstName.trim(),
                last_name: editLastName.trim(),
                email: editEmail.trim() || null,
                phone: editPhone.trim() || null,
                birth_date: editBirthDate || null,
                sex: editSex,
                residence: editResidence.trim() || null,
            };

            if (userRole === 'student') {
                updates.guardian_name = editGuardianName.trim() || null;
                updates.guardian_phone = editGuardianPhone.trim() || null;
            } else if (userRole === 'teacher') {
                updates.speciality = editSpeciality.trim() || null;
            }

            const { error } = await supabase.from(table).update(updates).eq('id', profile?.id || userId);
            if (error) throw error;

            setProfile((prev: any) => ({ ...prev, ...updates }));
            try {
                SessionManager.patch({
                    first_name: editFirstName.trim(),
                    last_name: editLastName.trim(),
                    email: editEmail.trim() || undefined,
                });
            } catch {}

            setShowEditModal(false);
            toast.success('Profil mis à jour avec succès ! ✅');
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la mise à jour');
        } finally {
            setSavingProfile(false);
        }
    };

    useEffect(() => {
        (async () => {
            setLoading(true);
            const table = userRole === 'teacher' ? 'teacher_profiles' : 'student_profiles';
            let { data: p } = await supabase.from(table).select('*').eq('id', userId).maybeSingle();

            // Fallback pour étudiant si p non trouvé par ID
            if (!p && userRole === 'student') {
                const sess = SessionManager.get();
                if (sess?.access_code) {
                    const { data: spByCode } = await supabase.from('student_profiles').select('*').eq('access_code', sess.access_code).maybeSingle();
                    if (spByCode) p = spByCode;
                }
                if (!p) {
                    const { data: ir } = await supabase.from('inscription_requests').select('*').eq('id', userId).maybeSingle();
                    if (ir) {
                        p = {
                            id:              ir.id,
                            first_name:      ir.first_name,
                            last_name:       ir.last_name,
                            phone:           ir.phone,
                            email:           ir.email,
                            birth_date:      ir.birth_date,
                            gender:          ir.gender,
                            classroom_id:    ir.classroom_id,
                            filiere_id:      ir.filiere_id,
                            sky_points:      100,
                            access_code:     ir.access_code,
                            nationality:     ir.nationality,
                            guardian_name:   ir.guardian_name,
                            guardian_phone:  ir.guardian_phone,
                        };
                    }
                }
            }

            setProfile(p);

            const activeClassroomId = p?.classroom_id;
            if (activeClassroomId) {
                const { data: cls } = await supabase.from('classrooms').select('*, filieres:filiere_id(*)').eq('id', activeClassroomId).maybeSingle();
                setClassroom(cls);
                if (cls?.filieres) setFiliere(cls.filieres);

                const { data: subs } = await supabase.from('subjects').select('*, teacher_profiles:teacher_id(first_name, last_name)')
                    .eq('classroom_id', activeClassroomId);
                setSubjects(subs || []);

                const { data: grs } = await supabase.from('grades')
                    .select('*, evaluations:evaluation_id(title, max_score, type, subject_id, subjects:subject_id(name))')
                    .eq('student_id', p?.id || userId);
                setGrades(grs || []);
            }

            const { data: pays } = await supabase.from('school_payments').select('*')
                .eq('student_id', p?.id || userId);
            setPayments(pays || []);

            // Load marketplace products by this user
            setLoadingProducts(true);
            const { data: products } = await supabase.from('products')
                .select('*').eq('seller_id', p?.id || userId).order('created_at', { ascending: false });
            setMyProducts(products || []);
            setLoadingProducts(false);

            setLoading(false);
        })();
    }, [userId, userRole, orgId]);

    // Computed
    const gradesBySubject = subjects.map(sub => {
        const subGrades = grades.filter((g: any) => g.evaluations?.subject_id === sub.id);
        const scored = subGrades.filter((g: any) => g.score !== null);
        let avg = 0;
        if (scored.length > 0) {
            const total = scored.reduce((s: number, g: any) => s + (g.score / (g.evaluations?.max_score || 20)) * 20, 0);
            avg = total / scored.length;
        }
        return { average: avg, count: scored.length, coefficient: sub.coefficient || 1 };
    });
    const overallAvg = gradesBySubject.filter(gs => gs.count > 0).length > 0
        ? gradesBySubject.filter(gs => gs.count > 0).reduce((sum, gs) => sum + gs.average * gs.coefficient, 0) /
        gradesBySubject.filter(gs => gs.count > 0).reduce((sum, gs) => sum + gs.coefficient, 0)
        : 0;
    const totalPaid = payments.reduce((s: number, p: any) => s + (p.amount || 0), 0);

    const copyAccessCode = () => {
        if (!profile?.access_code) return;
        navigator.clipboard.writeText(profile.access_code);
        setCodeCopied(true);
        toast.success('Code copié dans le presse-papiers !');
        setTimeout(() => setCodeCopied(false), 2000);
    };

    const signOut = async () => {
        await SessionManager.logout();
        router.push(`/${orgSlug}/login`);
    };

    const uploadProfilePhoto = async (file: File) => {
        setUploadingPhoto(true);
        try {
            const compressed = await compressImage(file, { maxWidth: 512, quality: 0.8 });
            const table = userRole === 'teacher' ? 'teacher_profiles' : 'student_profiles';
            const r2Res = await uploadToR2(compressed, `profiles/${userId}`, file.name);
            const photoUrl = r2Res.url;
            const { error: dbErr } = await supabase.from(table).update({ photo_url: photoUrl }).eq('id', userId);
            if (dbErr) throw dbErr;
            setProfile((prev: any) => ({ ...prev, photo_url: photoUrl }));
            // Mettre à jour photo_url dans la session
            try { SessionManager.patch({ photo_url: photoUrl }); } catch {}
            // Notify parent (CampusPage) to update avatar in bottom nav & header
            onPhotoUpdate?.(photoUrl);
            setShowPhotoModal(false);
            toast.success('Photo de profil mise à jour ! 📸');
        } catch (e: any) { toast.error(e.message || 'Erreur upload'); }
        setUploadingPhoto(false);
    };

    // Force photo modal if no photo
    const needsPhoto = profile && !profile.photo_url;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* ═══ MANDATORY PHOTO MODAL ═══ */}
            {(needsPhoto || showPhotoModal) && (
                <div className={cn("fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4", needsPhoto ? '' : '')}>
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="bg-[#1a1d27] rounded-2xl border border-white/10 max-w-sm w-full p-6 space-y-4 text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto">
                            <Camera className="w-10 h-10 text-amber-400" />
                        </div>
                        <h3 className="text-lg font-black text-white">{needsPhoto ? 'Photo de profil obligatoire' : 'Changer ma photo'}</h3>
                        <p className="text-sm text-slate-400">{needsPhoto ? 'Veuillez ajouter votre photo de profil pour continuer.' : 'Choisissez une nouvelle photo.'}</p>
                        <label className="block w-full py-4 rounded-xl border-2 border-dashed border-amber-500/30 cursor-pointer hover:border-amber-400/50 transition-colors">
                            {uploadingPhoto ? (
                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-400" />
                            ) : (
                                <>
                                    <Camera className="w-8 h-8 mx-auto text-amber-400 mb-2" />
                                    <span className="text-sm text-amber-300 font-medium">📷 Choisir une photo</span>
                                </>
                            )}
                            <input type="file" accept="image/*" className="hidden" disabled={uploadingPhoto}
                                onChange={e => { const f = e.target.files?.[0]; if (f) uploadProfilePhoto(f); }} />
                        </label>
                        {!needsPhoto && (
                            <button onClick={() => setShowPhotoModal(false)} className="text-xs text-slate-500 hover:text-slate-400">Annuler</button>
                        )}
                    </motion.div>
                </div>
            )}

            {/* ═══ PROFILE HEADER ═══ */}
            <div className="flex flex-col items-center mb-2">
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="relative mb-4">
                    <Avatar className="h-24 w-24 border-4 border-amber-500/30 shadow-xl shadow-amber-500/10">
                        <AvatarImage src={profile?.photo_url} />
                        <AvatarFallback className="text-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 font-black">
                            {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                        </AvatarFallback>
                    </Avatar>
                    {/* Camera button to change photo */}
                    <button onClick={() => setShowPhotoModal(true)}
                        className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30 hover:scale-110 transition-transform border-2 border-[#0B0E14]">
                        <Camera className="w-3.5 h-3.5 text-white" />
                    </button>
                    {overallAvg > 0 && (
                        <Badge className="absolute -bottom-2 -left-2 px-3 py-1 bg-gradient-to-r from-yellow-500 to-amber-600 border-none text-white shadow-lg text-[10px]">
                            {overallAvg >= 16 ? '🏆 Excellent' : overallAvg >= 14 ? '⭐ Très bien' : overallAvg >= 12 ? '👍 Bien' : overallAvg >= 10 ? '💪 Passable' : '📚 En progrès'}
                        </Badge>
                    )}
                    <Badge className="absolute -top-2 -right-2 px-2 py-0.5 border-none text-white text-[9px]"
                        style={{ background: userRole === 'teacher' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'linear-gradient(135deg,#14b8a6,#10b981)' }}>
                        {userRole === 'teacher' ? '👨‍🏫 Prof' : '🎓 Étudiant'}
                    </Badge>
                </motion.div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                    {profile?.first_name} {profile?.last_name}
                </h2>
                <p className="text-sm text-slate-400 mt-1">{classroom?.name || '—'}</p>
                <p className="text-xs text-slate-500 mt-1 bg-white/5 px-3 py-1 rounded-full">{orgName}</p>
                {/* Sky Points badge for all user roles */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 shadow-md">
                        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        <span className="text-lg font-black text-yellow-400">
                            {userSkyPoints !== undefined ? userSkyPoints : (profile?.sky_points || 0)}
                        </span>
                        <span className="text-xs text-yellow-400/70 font-semibold">Sky Points</span>
                    </div>
                </motion.div>

            </div>

            {/* ═══ PWA INSTALL ═══ */}
            <PwaInstall orgSlug={orgSlug} orgName={orgName} orgLogo={orgLogo} />

            {/* ═══ STATS ═══ */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { icon: BarChart3, value: overallAvg > 0 ? overallAvg.toFixed(1) : '—', label: 'Moyenne', color: 'amber' },
                    { icon: BookOpen, value: subjects.length, label: 'Matières', color: 'teal' },
                    { icon: CircleDollarSign, value: fmt(totalPaid), label: 'Payé', color: 'emerald' },
                ].map((s, i) => {
                    const borderMap: Record<string, string> = { amber: 'border-amber-500/20', teal: 'border-teal-500/20', emerald: 'border-emerald-500/20' };
                    const iconMap: Record<string, string> = { amber: 'text-amber-500', teal: 'text-teal-500', emerald: 'text-emerald-500' };
                    return (
                        <Card key={i} className={cn("bg-card/50 backdrop-blur-sm shadow-sm relative overflow-hidden", borderMap[s.color])}>
                            <CardContent className="flex flex-col items-center justify-center p-4">
                                <s.icon className={cn("h-5 w-5 mb-2", iconMap[s.color])} />
                                <span className="text-lg font-black">{s.value}</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">{s.label}</span>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* ═══ PROFILE INFO + EDIT BUTTON ═══ */}
            <Card className="bg-card/50 backdrop-blur-sm border-white/10 overflow-hidden">
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Informations Personnelles</span>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                setEditFirstName(profile?.first_name || '');
                                setEditLastName(profile?.last_name || '');
                                setEditEmail(profile?.email || '');
                                setEditPhone(profile?.phone || '');
                                setEditBirthDate(profile?.birth_date || profile?.date_of_birth || '');
                                setEditSex(profile?.sex || profile?.gender || 'M');
                                setEditResidence(profile?.residence || '');
                                setEditGuardianName(profile?.guardian_name || '');
                                setEditGuardianPhone(profile?.guardian_phone || '');
                                setEditSpeciality(profile?.speciality || '');
                                setShowEditModal(true);
                            }}
                            className="h-7 px-2.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg gap-1"
                        >
                            <Edit className="w-3.5 h-3.5" /> Modifier
                        </Button>
                    </div>

                    {[
                        ['🆔 Matricule / Code', profile?.matricule || profile?.access_code],
                        ['📧 Email', profile?.email],
                        ['📱 Téléphone', profile?.phone],
                        ['🎂 Naissance', profile?.birth_date || profile?.date_of_birth],
                        ['👤 Sexe', (profile?.sex === 'M' || profile?.gender === 'M') ? 'Masculin' : (profile?.sex === 'F' || profile?.gender === 'F') ? 'Féminin' : (profile?.sex || profile?.gender)],
                        ['🏠 Résidence', profile?.residence],
                        ['🎓 Filière / Classe', filiere?.nom || classroom?.filieres?.nom || classroom?.cycle || classroom?.name],
                        ...(userRole === 'student' && (profile?.guardian_name || profile?.guardian_phone) ? [
                            ['👨‍👩‍👦 Tuteur', `${profile?.guardian_name || ''} ${profile?.guardian_phone ? `(${profile?.guardian_phone})` : ''}`.trim()]
                        ] : []),
                        ...(userRole === 'teacher' && profile?.speciality ? [
                            ['📚 Spécialité', profile?.speciality]
                        ] : []),
                    ].map(([k, v], i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{k}</span>
                            <span className="font-medium text-right truncate max-w-[200px]">{v || '—'}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* ═══ RETOURS, BUGS & ÉVALUATIONS (+ SKY POINTS) ═══ */}
            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avis & Assistance</p>
                    <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400" /> Jusqu'à +7 pts
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                    {/* Bug report */}
                    <button
                        onClick={() => { setFeedbackTab('bug'); setShowFeedbackModal(true); }}
                        className="p-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-left transition group shadow-sm flex flex-col justify-between"
                    >
                        <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center mb-2">
                            <Bug className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white group-hover:text-red-300 transition">Signaler un Bug</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Avec capture d'écran</p>
                        </div>
                    </button>

                    {/* Proposer une idée */}
                    <button
                        onClick={() => { setFeedbackTab('feature'); setShowFeedbackModal(true); }}
                        className="p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-left transition group shadow-sm flex flex-col justify-between"
                    >
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
                            <Lightbulb className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white group-hover:text-amber-300 transition">Proposer une Idée</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Pour le Superadmin</p>
                        </div>
                    </button>

                    {/* Évaluer l'école */}
                    <button
                        onClick={() => { setFeedbackTab('school_review'); setShowFeedbackModal(true); }}
                        className="p-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-left transition group shadow-sm flex flex-col justify-between"
                    >
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                            <School className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition">Évaluer l'École</p>
                            <p className="text-[10px] text-emerald-400 font-bold mt-0.5">+1 à +7 Sky Points ⭐</p>
                        </div>
                    </button>

                    {/* Évaluer IziTeach */}
                    <button
                        onClick={() => { setFeedbackTab('app_review'); setShowFeedbackModal(true); }}
                        className="p-3.5 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/20 text-left transition group shadow-sm flex flex-col justify-between"
                    >
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-2">
                            <Smartphone className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition">Évaluer IziTeach</p>
                            <p className="text-[10px] text-cyan-400 font-bold mt-0.5">+1 à +7 Sky Points ⭐</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* ═══ ACCESS CODE ═══ */}
            {profile?.access_code && (
                <Card className="bg-gradient-to-br from-teal-500/10 to-emerald-500/5 border-teal-500/20 overflow-hidden">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                                <KeyRound className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">Code de connexion</h3>
                                <p className="text-[10px] text-slate-400">Gardez-le secret et en sécurité</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                            <span className="flex-1 font-mono text-lg tracking-[0.3em] text-teal-300 font-bold text-center select-all">
                                {profile.access_code}
                            </span>
                            <button onClick={copyAccessCode}
                                className={cn("p-2 rounded-lg transition-all",
                                    codeCopied ? "bg-emerald-500/20 text-emerald-400" : "hover:bg-white/10 text-slate-400"
                                )}>
                                {codeCopied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ═══ MARKETPLACE ESPACE VENDEUR ═══ */}
            <Card className="bg-gradient-to-br from-pink-500/10 to-rose-500/5 border-pink-500/20 overflow-hidden">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
                                <ShoppingBag className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">Espace Marketplace</h3>
                                <p className="text-[10px] text-slate-400">{myProducts.length} produit(s) en vente</p>
                            </div>
                        </div>
                        <Button size="sm" onClick={() => router.push(`/${orgSlug}/shop`)}
                            className="bg-gradient-to-r from-pink-600 to-rose-600 text-xs rounded-xl">
                            <ExternalLink className="w-3 h-3 mr-1" /> Marketplace
                        </Button>
                    </div>

                    {loadingProducts ? (
                        <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto text-pink-400" /></div>
                    ) : myProducts.length === 0 ? (
                        <div className="text-center py-4">
                            <p className="text-xs text-slate-500 mb-2">Vous n'avez pas encore de produit en vente</p>
                            <Button size="sm" variant="ghost" onClick={() => router.push(`/${orgSlug}/shop`)}
                                className="text-pink-400 text-xs">
                                <Plus className="w-3 h-3 mr-1" /> Publier un produit
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                            {myProducts.slice(0, 5).map((prod: any) => (
                                <div key={prod.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/[0.08] transition-all">
                                    {prod.image_url ? (
                                        <img src={prod.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center shrink-0">
                                            <ShoppingBag className="w-4 h-4 text-pink-400" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate">{prod.name || prod.title}</p>
                                        <p className="text-[10px] text-slate-500">{fmt(prod.price || 0)} XAF</p>
                                    </div>
                                    <Badge className={cn("text-[9px] border-none",
                                        prod.is_active !== false ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                                    )}>
                                        {prod.is_active !== false ? 'Actif' : 'Inactif'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ═══ SIGN OUT ═══ */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Button onClick={signOut}
                    className="w-full h-12 bg-gradient-to-r from-red-600/80 to-rose-600/80 hover:from-red-600 hover:to-rose-600 text-white font-bold rounded-2xl border border-red-500/20 shadow-lg shadow-red-600/10">
                    <LogOut className="w-5 h-5 mr-2" />
                    Se déconnecter
                </Button>
            </motion.div>

            {/* ═══ EDIT PROFILE MODAL ═══ */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-[#0e1320] border border-white/10 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h3 className="font-bold text-base text-white flex items-center gap-2">
                                <Edit className="w-4 h-4 text-amber-400" /> Modifier mon profil
                            </h3>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white p-1">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs text-slate-300">Prénom *</Label>
                                    <Input value={editFirstName} onChange={e => setEditFirstName(e.target.value)} className="bg-white/5 border-white/10 text-white text-xs h-9 mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-300">Nom *</Label>
                                    <Input value={editLastName} onChange={e => setEditLastName(e.target.value)} className="bg-white/5 border-white/10 text-white text-xs h-9 mt-1" />
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-slate-300">Email</Label>
                                <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="bg-white/5 border-white/10 text-white text-xs h-9 mt-1" />
                            </div>

                            <div>
                                <Label className="text-xs text-slate-300">Téléphone</Label>
                                <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="bg-white/5 border-white/10 text-white text-xs h-9 mt-1" />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs text-slate-300">Date de naissance</Label>
                                    <Input type="date" value={editBirthDate} onChange={e => setEditBirthDate(e.target.value)} className="bg-white/5 border-white/10 text-white text-xs h-9 mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-300">Sexe</Label>
                                    <select value={editSex} onChange={e => setEditSex(e.target.value)} className="w-full bg-[#141926] border border-white/10 text-white text-xs h-9 rounded-md mt-1 px-2">
                                        <option value="M">Masculin</option>
                                        <option value="F">Féminin</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-slate-300">Lieu de résidence / Ville</Label>
                                <Input value={editResidence} onChange={e => setEditResidence(e.target.value)} placeholder="Ex: Douala, Yaoundé..." className="bg-white/5 border-white/10 text-white text-xs h-9 mt-1" />
                            </div>

                            {userRole === 'student' && (
                                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                                    <div>
                                        <Label className="text-xs text-slate-300">Nom du tuteur / parent</Label>
                                        <Input value={editGuardianName} onChange={e => setEditGuardianName(e.target.value)} className="bg-white/5 border-white/10 text-white text-xs h-9 mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-300">Téléphone tuteur</Label>
                                        <Input value={editGuardianPhone} onChange={e => setEditGuardianPhone(e.target.value)} className="bg-white/5 border-white/10 text-white text-xs h-9 mt-1" />
                                    </div>
                                </div>
                            )}

                            {userRole === 'teacher' && (
                                <div>
                                    <Label className="text-xs text-slate-300">Spécialité / Discipline</Label>
                                    <Input value={editSpeciality} onChange={e => setEditSpeciality(e.target.value)} placeholder="Ex: Mathématiques, Sciences..." className="bg-white/5 border-white/10 text-white text-xs h-9 mt-1" />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setShowEditModal(false)} className="flex-1 text-xs h-10 border border-white/10">
                                Annuler
                            </Button>
                            <Button
                                onClick={handleSaveProfile}
                                disabled={savingProfile || !editFirstName.trim() || !editLastName.trim()}
                                className="flex-1 text-xs h-10 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                            >
                                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                                Enregistrer
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* ═══ FEEDBACK & AVIS MODAL ═══ */}
            <UserFeedbackModal
                isOpen={showFeedbackModal}
                onClose={() => setShowFeedbackModal(false)}
                initialTab={feedbackTab}
                orgId={orgId}
                orgName={orgName}
                userId={userId}
                userName={userName}
                userRole={userRole}
                userEmail={profile?.email}
                onSkyPointsEarned={(newTotal) => {
                    setProfile((prev: any) => ({ ...prev, sky_points: newTotal }));
                }}
            />
        </div>
    );
}
