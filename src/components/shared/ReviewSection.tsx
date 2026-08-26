'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Send, Loader2, CheckCircle2, Edit3, MessageSquare, Gift, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { creditSkyPoints } from '@/lib/sky-points-service';

interface ReviewSectionProps {
    userId: string;
    userName: string;
    userRole: 'student' | 'teacher' | 'admin';
    orgId: string;
    orgName: string;
}

interface Review {
    id: string;
    rating: number;
    title: string;
    comment: string;
    created_at: string;
}

export function ReviewSection({ userId, userName, userRole, orgId, orgName }: ReviewSectionProps) {
    const [existingReview, setExistingReview] = useState<Review | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [title, setTitle] = useState('');
    const [comment, setComment] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        loadReview();
    }, [userId, orgId]);

    const loadReview = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('org_reviews')
                .select('*')
                .eq('user_id', userId)
                .eq('organization_id', orgId)
                .maybeSingle();

            if (data) {
                setExistingReview(data as Review);
                setRating(data.rating || 5);
                setTitle(data.title || '');
                setComment(data.comment || data.content || '');
            }
        } catch (e) {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!comment.trim()) { toast.error('Veuillez écrire un commentaire'); return; }
        setSaving(true);
        try {
            const payload = {
                user_id: userId,
                organization_id: orgId,
                author_name: userName,
                author_role: userRole,
                rating,
                title: title.trim() || null,
                comment: comment.trim(),
                content: comment.trim(),
                is_verified: true,
            };

            const isFirstReview = !existingReview;
            let error;
            if (existingReview) {
                ({ error } = await supabase
                    .from('org_reviews')
                    .update(payload)
                    .eq('id', existingReview.id));
            } else {
                ({ error } = await supabase.from('org_reviews').insert(payload));
            }

            if (error) throw error;

            // Créditer le bonus Sky Points pour le premier avis (50 points)
            if (isFirstReview && userId) {
                try {
                    await creditSkyPoints(
                        userId,
                        50,
                        'review_bonus',
                        `Bonus avis ${rating} étoiles pour ${orgName}`,
                        userRole,
                        orgId
                    );
                } catch (creditErr) {
                    console.warn('Could not credit review Sky points bonus:', creditErr);
                }
            }

            setSaved(true);
            setEditing(false);
            await loadReview();
            setTimeout(() => setSaved(false), 2000);
            
            if (isFirstReview) {
                toast.success('🎉 Avis publié avec succès ! +50 Sky Points crédités sur votre compte !', {
                    duration: 6000,
                    icon: '🎁'
                });
            } else {
                toast.success('✅ Votre avis a été mis à jour avec succès !');
            }
        } catch (e: any) {
            toast.error('Erreur : ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/8 flex items-center justify-center h-24">
                <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            </div>
        );
    }

    return (
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/8 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                        <Star className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-white">Mon Avis sur l&apos;École</p>
                        <p className="text-[11px] text-slate-500">{orgName}</p>
                    </div>
                </div>
                {existingReview && !editing && (
                    <button
                        onClick={() => setEditing(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-400 hover:text-white transition-all"
                    >
                        <Edit3 className="w-3.5 h-3.5" /> Modifier
                    </button>
                )}
            </div>

            {/* Existing review display (not editing) */}
            {existingReview && !editing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={cn('w-5 h-5', s <= existingReview.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600')} />
                        ))}
                        <span className="ml-2 text-xs text-slate-400 font-medium">{existingReview.rating}/5</span>
                    </div>
                    {existingReview.title && (
                        <p className="font-bold text-sm text-white">{existingReview.title}</p>
                    )}
                    <p className="text-sm text-slate-300 leading-relaxed">{existingReview.comment}</p>
                    <p className="text-[10px] text-slate-600">Publié le {new Date(existingReview.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </motion.div>
            )}

            {/* Form (new or editing) */}
            {(!existingReview || editing) && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {!existingReview && (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold">
                            <Gift className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>🎁 <strong>+50 Sky Points</strong> offerts immédiatement lors de la publication de votre avis !</span>
                        </div>
                    )}

                    {/* Star rating */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 block mb-2">Note globale <span className="text-red-400">*</span></label>
                        <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map(s => (
                                <button
                                    key={s}
                                    onMouseEnter={() => setHoverRating(s)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => setRating(s)}
                                    className="transition-transform hover:scale-125"
                                >
                                    <Star className={cn('w-7 h-7 transition-colors', (hoverRating || rating) >= s ? 'text-amber-400 fill-amber-400' : 'text-slate-600')} />
                                </button>
                            ))}
                            <span className="ml-2 text-sm font-black text-amber-400">{rating}/5</span>
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1.5">Titre (optionnel)</label>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ex: Excellente formation, très professionnel..."
                            className="w-full bg-white/5 border border-white/10 text-white h-10 rounded-xl text-sm px-3 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/40"
                        />
                    </div>

                    {/* Comment */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1.5">Commentaire <span className="text-red-400">*</span></label>
                        <textarea
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder="Partagez votre expérience à cet établissement : la qualité de l'enseignement, l'ambiance, les installations..."
                            rows={4}
                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl text-sm px-3 py-2.5 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/40 resize-none"
                        />
                        <p className="text-[10px] text-slate-600 mt-1">{comment.length} caractères</p>
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center gap-2">
                        {editing && (
                            <Button variant="outline" onClick={() => setEditing(false)} className="border-white/10 text-slate-400 hover:text-white rounded-xl text-xs">
                                Annuler
                            </Button>
                        )}
                        <Button
                            onClick={handleSubmit}
                            disabled={saving || !comment.trim()}
                            className={cn(
                                'flex-1 h-10 font-black rounded-xl text-sm shadow-lg',
                                saved
                                    ? 'bg-emerald-500 shadow-emerald-500/20'
                                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-amber-500/20'
                            )}
                        >
                            {saving ? (
                                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Publication...</>
                            ) : saved ? (
                                <><CheckCircle2 className="w-4 h-4 mr-2" />Publié !</>
                            ) : (
                                <><Send className="w-4 h-4 mr-2" />{existingReview ? 'Mettre à jour l\'avis' : 'Publier mon avis'}</>
                            )}
                        </Button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
