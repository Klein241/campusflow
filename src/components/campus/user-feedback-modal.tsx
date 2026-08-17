'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bug, Lightbulb, Star, School, Smartphone, Upload, Camera,
    CheckCircle2, Loader2, X, Sparkles, AlertCircle, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/compress';
import { uploadToR2 } from '@/lib/r2';
import { toast } from 'sonner';

export type FeedbackTab = 'bug' | 'feature' | 'school_review' | 'app_review';

interface UserFeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: FeedbackTab;
    orgId?: string;
    orgName?: string;
    userId: string;
    userName: string;
    userRole: string;
    userEmail?: string;
    onSkyPointsEarned?: (newPoints: number) => void;
}

export function UserFeedbackModal({
    isOpen,
    onClose,
    initialTab = 'bug',
    orgId,
    orgName = 'Mon Établissement',
    userId,
    userName,
    userRole,
    userEmail,
    onSkyPointsEarned
}: UserFeedbackModalProps) {
    const [activeTab, setActiveTab] = useState<FeedbackTab>(initialTab);
    const [submitting, setSubmitting] = useState(false);

    // ── 1. Bug Report State
    const [bugDesc, setBugDesc] = useState('');
    const [bugScreenshot, setBugScreenshot] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    // ── 2. Feature Suggestion State
    const [featTitle, setFeatTitle] = useState('');
    const [featCategory, setFeatCategory] = useState('pedagogy');
    const [featDesc, setFeatDesc] = useState('');

    // ── 3. School Review State
    const [schoolRating, setSchoolRating] = useState(5);
    const [schoolComment, setSchoolComment] = useState('');

    // ── 4. App Review State
    const [appRating, setAppRating] = useState(5);
    const [appComment, setAppComment] = useState('');

    if (!isOpen) return null;

    const getPointsForRating = (stars: number) => {
        if (stars === 5) return 7;
        if (stars === 4) return 4;
        if (stars === 3) return 3;
        if (stars === 2) return 2;
        return 1;
    };

    // 📸 Screenshot upload handler
    const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Veuillez sélectionner un fichier image valide (JPG, PNG, WEBP)');
            return;
        }

        setUploadingImage(true);
        try {
            const compressed = await compressImage(file, { maxWidth: 1280, quality: 0.8 });
            // Try upload to R2
            try {
                const r2Res = await uploadToR2(compressed, `bug-reports/${userId}`, file.name);
                if (r2Res?.url) {
                    setBugScreenshot(r2Res.url);
                    toast.success('Capture d\'écran chargée avec succès !');
                    setUploadingImage(false);
                    return;
                }
            } catch {}

            // Fallback base64
            const reader = new FileReader();
            reader.onloadend = () => {
                setBugScreenshot(reader.result as string);
                toast.success('Capture d\'écran chargée avec succès !');
                setUploadingImage(false);
            };
            reader.readAsDataURL(compressed);
        } catch (err: any) {
            toast.error('Erreur lors du traitement de l\'image');
            setUploadingImage(false);
        }
    };

    // 🐛 Submit Bug
    const submitBug = async () => {
        if (!bugDesc.trim()) {
            toast.error('Veuillez décrire le problème rencontré.');
            return;
        }
        if (!bugScreenshot) {
            toast.error('La capture d\'écran est OBLIGATOIRE pour signaler un bug.');
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase.from('bug_reports').insert({
                organization_id: orgId || null,
                org_name: orgName,
                user_id: userId,
                user_name: userName,
                user_role: userRole,
                user_email: userEmail || null,
                description: bugDesc.trim(),
                screenshot_url: bugScreenshot,
                page_url: typeof window !== 'undefined' ? window.location.href : null,
                browser_info: typeof navigator !== 'undefined' ? navigator.userAgent : null,
                status: 'open'
            });

            if (error) throw error;

            toast.success('🐛 Bug signalé avec succès au Superadmin ! Merci pour votre retour.');
            setBugDesc('');
            setBugScreenshot(null);
            onClose();
        } catch (e: any) {
            toast.error(e.message || 'Erreur lors de l\'envoi du signalement');
        } finally {
            setSubmitting(false);
        }
    };

    // 💡 Submit Feature Suggestion
    const submitFeature = async () => {
        if (!featTitle.trim() || !featDesc.trim()) {
            toast.error('Veuillez renseigner le titre et la description de votre suggestion.');
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase.from('feature_suggestions').insert({
                organization_id: orgId || null,
                org_name: orgName,
                user_id: userId,
                user_name: userName,
                user_role: userRole,
                user_email: userEmail || null,
                title: featTitle.trim(),
                description: featDesc.trim(),
                category: featCategory,
                status: 'submitted'
            });

            if (error) throw error;

            toast.success('💡 Idée transmise au Superadmin ! Merci pour votre créativité.');
            setFeatTitle('');
            setFeatDesc('');
            onClose();
        } catch (e: any) {
            toast.error(e.message || 'Erreur lors de l\'envoi de la suggestion');
        } finally {
            setSubmitting(false);
        }
    };

    // 🏫 Submit School Review
    const submitSchoolReview = async () => {
        if (!schoolComment.trim()) {
            toast.error('Veuillez laisser un petit commentaire sur votre école.');
            return;
        }
        if (!orgId) {
            toast.error('Identifiant d\'établissement manquant.');
            return;
        }

        setSubmitting(true);
        try {
            const pointsToAward = getPointsForRating(schoolRating);

            const { error } = await supabase.from('school_reviews').insert({
                organization_id: orgId,
                school_name: orgName,
                user_id: userId,
                author_name: userName,
                author_role: userRole === 'teacher' ? 'Professeur' : 'Étudiant',
                rating: schoolRating,
                comment: schoolComment.trim(),
                sky_points_awarded: pointsToAward,
                is_published: true
            });

            if (error) throw error;

            // Credit Sky Points
            try {
                const { data: rpcRes } = await supabase.rpc('award_review_sky_points', {
                    p_user_id: userId,
                    p_role: userRole,
                    p_rating: schoolRating,
                    p_reason: `Avis école ${orgName} (${schoolRating}★)`,
                    p_org_id: orgId
                });

                if (rpcRes?.points_awarded) {
                    toast.success(`🎉 Avis enregistré ! +${rpcRes.points_awarded} Sky Points crédités ! ⭐`);
                    if (rpcRes.new_total && onSkyPointsEarned) {
                        onSkyPointsEarned(rpcRes.new_total);
                    }
                } else {
                    toast.success('🎉 Avis enregistré avec succès sur la page de votre école !');
                }
            } catch {
                toast.success('🎉 Avis enregistré avec succès !');
            }

            setSchoolComment('');
            onClose();
        } catch (e: any) {
            toast.error(e.message || 'Erreur lors de l\'enregistrement de l\'avis');
        } finally {
            setSubmitting(false);
        }
    };

    // 🚀 Submit App Review (IziTeach SaaS)
    const submitAppReview = async () => {
        if (!appComment.trim()) {
            toast.error('Veuillez laisser un commentaire sur votre expérience avec IziTeach.');
            return;
        }

        setSubmitting(true);
        try {
            const pointsToAward = getPointsForRating(appRating);

            const { error } = await supabase.from('platform_reviews').insert({
                organization_id: orgId || null,
                school_name: orgName,
                user_id: userId,
                author_name: userName,
                author_role: userRole === 'teacher' ? 'Professeur' : 'Étudiant',
                rating: appRating,
                comment: appComment.trim(),
                sky_points_awarded: pointsToAward,
                is_featured: true
            });

            if (error) throw error;

            // Credit Sky Points
            try {
                const { data: rpcRes } = await supabase.rpc('award_review_sky_points', {
                    p_user_id: userId,
                    p_role: userRole,
                    p_rating: appRating,
                    p_reason: `Avis IziTeach (${appRating}★)`,
                    p_org_id: orgId || null
                });

                if (rpcRes?.points_awarded) {
                    toast.success(`🎉 Merci pour votre avis ! +${rpcRes.points_awarded} Sky Points crédités ! ⭐`);
                    if (rpcRes.new_total && onSkyPointsEarned) {
                        onSkyPointsEarned(rpcRes.new_total);
                    }
                } else {
                    toast.success('🎉 Merci ! Votre avis apparaîtra sur la page d\'accueil d\'IziTeach.');
                }
            } catch {
                toast.success('🎉 Avis enregistré avec succès !');
            }

            setAppComment('');
            onClose();
        } catch (e: any) {
            toast.error(e.message || 'Erreur lors de l\'enregistrement');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0e1320] border border-white/10 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
            >
                {/* Header */}
                <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 border border-white/10 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h3 className="font-black text-base text-white">Retours & Évaluations</h3>
                            <p className="text-[11px] text-slate-400">Votre voix améliore l'expérience de tous</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 4 Tabs switcher */}
                <div className="p-2 bg-black/30 border-b border-white/5 flex gap-1 overflow-x-auto scrollbar-none">
                    {[
                        { id: 'bug' as FeedbackTab, label: 'Signaler un Bug', icon: Bug, color: 'text-red-400' },
                        { id: 'feature' as FeedbackTab, label: 'Proposer une Idée', icon: Lightbulb, color: 'text-amber-400' },
                        { id: 'school_review' as FeedbackTab, label: 'Avis École', icon: School, color: 'text-emerald-400' },
                        { id: 'app_review' as FeedbackTab, label: 'Avis IziTeach', icon: Smartphone, color: 'text-cyan-400' },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                                activeTab === t.id
                                    ? 'bg-white/10 text-white border border-white/15 shadow-md'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }`}
                        >
                            <t.icon className={`w-3.5 h-3.5 ${t.color}`} />
                            <span>{t.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
                    {/* ════ TAB 1: SIGNALER UN BUG ════ */}
                    {activeTab === 'bug' && (
                        <div className="space-y-4">
                            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-start gap-2.5">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Capture d'écran obligatoire</p>
                                    <p className="text-[11px] text-red-300/80">Pour que nos ingénieurs puissent reproduire et corriger le bug instantanément.</p>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-slate-300 font-bold">Description détaillée du problème *</Label>
                                <Textarea
                                    value={bugDesc}
                                    onChange={e => setBugDesc(e.target.value)}
                                    placeholder="Expliquez ce qui s'est passé, sur quelle page, et ce que vous essayiez de faire..."
                                    className="mt-1.5 bg-white/5 border-white/10 text-white min-h-[90px] rounded-2xl text-xs"
                                />
                            </div>

                            <div>
                                <Label className="text-xs text-slate-300 font-bold">Capture d'écran du bug (Obligatoire) *</Label>
                                {bugScreenshot ? (
                                    <div className="mt-1.5 relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-black/40 p-2 group">
                                        <img src={bugScreenshot} alt="Capture" className="w-full max-h-48 object-contain rounded-xl" />
                                        <button
                                            onClick={() => setBugScreenshot(null)}
                                            className="absolute top-4 right-4 p-1.5 rounded-full bg-red-500 text-white shadow-lg hover:scale-110 transition"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                        <p className="text-[10px] text-emerald-400 font-bold text-center mt-2 flex items-center justify-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Capture jointe avec succès
                                        </p>
                                    </div>
                                ) : (
                                    <label className="mt-1.5 block w-full py-6 rounded-2xl border-2 border-dashed border-red-500/30 hover:border-red-400/50 bg-red-500/5 cursor-pointer text-center transition-colors">
                                        {uploadingImage ? (
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-red-400" />
                                        ) : (
                                            <div className="space-y-1.5">
                                                <Camera className="w-7 h-7 text-red-400 mx-auto" />
                                                <p className="text-xs font-bold text-red-300">📷 Cliquez pour joindre une capture d'écran</p>
                                                <p className="text-[10px] text-slate-400">Format JPG, PNG, WEBP</p>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            disabled={uploadingImage}
                                            onChange={handleScreenshotChange}
                                        />
                                    </label>
                                )}
                            </div>

                            <Button
                                onClick={submitBug}
                                disabled={submitting || !bugDesc.trim() || !bugScreenshot}
                                className="w-full h-11 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/25"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bug className="w-4 h-4 mr-2" />}
                                Envoyer le rapport au Superadmin
                            </Button>
                        </div>
                    )}

                    {/* ════ TAB 2: PROPOSER UNE FONCTIONNALITÉ ════ */}
                    {activeTab === 'feature' && (
                        <div className="space-y-4">
                            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
                                <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Espace Idées & Évolutions</p>
                                    <p className="text-[11px] text-amber-300/80">Proposez des améliorations pour IziTeach. Les meilleures idées sont intégrées dans les prochaines mises à jour !</p>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-slate-300 font-bold">Titre de la fonctionnalité *</Label>
                                <Input
                                    value={featTitle}
                                    onChange={e => setFeatTitle(e.target.value)}
                                    placeholder="Ex: Mode sombre automatique, Export Excel des notes..."
                                    className="mt-1 bg-white/5 border-white/10 text-white h-10 rounded-xl text-xs"
                                />
                            </div>

                            <div>
                                <Label className="text-xs text-slate-300 font-bold">Catégorie</Label>
                                <select
                                    value={featCategory}
                                    onChange={e => setFeatCategory(e.target.value)}
                                    className="mt-1 w-full h-10 rounded-xl bg-[#141926] border border-white/10 text-xs text-slate-200 px-3"
                                >
                                    <option value="pedagogy">🎓 Pédagogie, Cours & Examens</option>
                                    <option value="design">🎨 Design & Interface utilisateur</option>
                                    <option value="mobile_money">💳 Paiements & Mobile Money</option>
                                    <option value="chat">💬 Chat & Messagerie</option>
                                    <option value="admin">🏢 Administration & Bulletins</option>
                                    <option value="other">✨ Autre suggestion</option>
                                </select>
                            </div>

                            <div>
                                <Label className="text-xs text-slate-300 font-bold">Explication de votre idée *</Label>
                                <Textarea
                                    value={featDesc}
                                    onChange={e => setFeatDesc(e.target.value)}
                                    placeholder="Décrivez comment cela devrait fonctionner et pourquoi c'est utile..."
                                    className="mt-1 bg-white/5 border-white/10 text-white min-h-[90px] rounded-2xl text-xs"
                                />
                            </div>

                            <Button
                                onClick={submitFeature}
                                disabled={submitting || !featTitle.trim() || !featDesc.trim()}
                                className="w-full h-11 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lightbulb className="w-4 h-4 mr-2" />}
                                Transmettre ma suggestion au Superadmin
                            </Button>
                        </div>
                    )}

                    {/* ════ TAB 3: AVIS ÉCOLE ════ */}
                    {activeTab === 'school_review' && (
                        <div className="space-y-4">
                            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
                                <School className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Évaluez {orgName}</p>
                                    <p className="text-[11px] text-emerald-300/80">Votre avis sera affiché sur la page d'accueil de votre école pour valoriser votre établissement.</p>
                                </div>
                            </div>

                            {/* Live Sky Points reward banner */}
                            <div className="p-3 rounded-2xl bg-gradient-to-r from-yellow-500/15 via-amber-500/10 to-orange-500/15 border border-yellow-500/30 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                    <div>
                                        <p className="text-xs font-black text-white">Récompense Sky Points</p>
                                        <p className="text-[10px] text-yellow-300/80">
                                            {schoolRating === 5 ? '🔥 BONUS 5 ÉTOILES ACTIVÉ !' : `${schoolRating} étoile(s) = +${getPointsForRating(schoolRating)} Sky Points`}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-base font-black px-3 py-1 rounded-xl bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                                    +{getPointsForRating(schoolRating)} pts
                                </span>
                            </div>

                            {/* Star Selector */}
                            <div className="text-center space-y-2 py-2">
                                <Label className="text-xs text-slate-400">Votre note globale</Label>
                                <div className="flex items-center justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setSchoolRating(star)}
                                            className="p-1 hover:scale-125 transition-transform"
                                        >
                                            <Star
                                                className={`w-8 h-8 ${
                                                    star <= schoolRating
                                                        ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]'
                                                        : 'text-slate-600'
                                                }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-slate-300 font-bold">Votre témoignage *</Label>
                                <Textarea
                                    value={schoolComment}
                                    onChange={e => setSchoolComment(e.target.value)}
                                    placeholder="Ce que vous appréciez dans l'enseignement, l'encadrement, les professeurs, l'ambiance..."
                                    className="mt-1 bg-white/5 border-white/10 text-white min-h-[90px] rounded-2xl text-xs"
                                />
                            </div>

                            <Button
                                onClick={submitSchoolReview}
                                disabled={submitting || !schoolComment.trim()}
                                className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Star className="w-4 h-4 mr-2 fill-current" />}
                                Publier mon avis (+{getPointsForRating(schoolRating)} Sky Points)
                            </Button>
                        </div>
                    )}

                    {/* ════ TAB 4: AVIS IZITEACH SAAS ════ */}
                    {activeTab === 'app_review' && (
                        <div className="space-y-4">
                            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 flex items-start gap-2.5">
                                <Smartphone className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Évaluez la plateforme IziTeach</p>
                                    <p className="text-[11px] text-cyan-300/80">Votre avis sera affiché sur la page d'accueil officielle d'IziTeach (iziteach.com).</p>
                                </div>
                            </div>

                            {/* Live Sky Points reward banner */}
                            <div className="p-3 rounded-2xl bg-gradient-to-r from-yellow-500/15 via-amber-500/10 to-orange-500/15 border border-yellow-500/30 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                    <div>
                                        <p className="text-xs font-black text-white">Récompense Sky Points</p>
                                        <p className="text-[10px] text-yellow-300/80">
                                            {appRating === 5 ? '🔥 BONUS 5 ÉTOILES : +7 SKY POINTS !' : `${appRating} étoile(s) = +${getPointsForRating(appRating)} Sky Points`}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-base font-black px-3 py-1 rounded-xl bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                                    +{getPointsForRating(appRating)} pts
                                </span>
                            </div>

                            {/* Star Selector */}
                            <div className="text-center space-y-2 py-2">
                                <Label className="text-xs text-slate-400">Votre note pour IziTeach</Label>
                                <div className="flex items-center justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setAppRating(star)}
                                            className="p-1 hover:scale-125 transition-transform"
                                        >
                                            <Star
                                                className={`w-8 h-8 ${
                                                    star <= appRating
                                                        ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]'
                                                        : 'text-slate-600'
                                                }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-slate-300 font-bold">Votre retour d'expérience *</Label>
                                <Textarea
                                    value={appComment}
                                    onChange={e => setAppComment(e.target.value)}
                                    placeholder="Ce que vous aimez sur l'application (fluidité, bulletins, cours, mobile money, notes vocales)..."
                                    className="mt-1 bg-white/5 border-white/10 text-white min-h-[90px] rounded-2xl text-xs"
                                />
                            </div>

                            <Button
                                onClick={submitAppReview}
                                disabled={submitting || !appComment.trim()}
                                className="w-full h-11 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-600/25"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Star className="w-4 h-4 mr-2 fill-current" />}
                                Publier mon avis (+{getPointsForRating(appRating)} Sky Points)
                            </Button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
