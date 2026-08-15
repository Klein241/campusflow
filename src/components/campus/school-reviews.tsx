'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Star, MessageSquarePlus, Sparkles, CheckCircle2,
    ShieldCheck, User, Send, Loader2, X, School, Quote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface SchoolReview {
    id: string;
    org_id?: string;
    org_slug?: string;
    author_name: string;
    author_role: 'student' | 'teacher';
    classroom_name?: string;
    rating: number;
    comment: string;
    created_at: string;
}

interface SchoolReviewsProps {
    org: any;
    orgSlug: string;
    brandColor?: string;
}

export function SchoolReviewsSection({ org, orgSlug, brandColor = '#14b8a6' }: SchoolReviewsProps) {
    const [reviews, setReviews] = useState<SchoolReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form
    const [authorName, setAuthorName] = useState('');
    const [authorRole, setAuthorRole] = useState<'student' | 'teacher'>('student');
    const [classroomName, setClassroomName] = useState('');
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');

    const bc = brandColor || org?.brand_color || '#14b8a6';

    // Fetch school reviews
    useEffect(() => {
        async function fetchReviews() {
            try {
                let query = supabase
                    .from('school_reviews')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (org?.id) {
                    query = query.or(`org_id.eq.${org.id},org_slug.eq.${orgSlug}`);
                } else {
                    query = query.eq('org_slug', orgSlug);
                }

                const { data } = await query.limit(15);
                if (data && data.length > 0) {
                    setReviews(data);
                }
            } catch {}
            finally {
                setLoading(false);
            }
        }
        fetchReviews();
    }, [org?.id, orgSlug]);

    // Pre-fill user details if logged in
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const std = localStorage.getItem('campusflow_student');
                if (std) {
                    const parsed = JSON.parse(std);
                    setAuthorName(`${parsed.first_name || ''} ${parsed.last_name || ''}`.trim() || parsed.name || '');
                    setAuthorRole('student');
                }
                const prof = localStorage.getItem('campusflow_teacher');
                if (prof) {
                    const parsed = JSON.parse(prof);
                    setAuthorName(`${parsed.first_name || ''} ${parsed.last_name || ''}`.trim() || parsed.name || '');
                    setAuthorRole('teacher');
                }
            } catch {}
        }
    }, [isModalOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!authorName.trim()) {
            toast.error('Veuillez renseigner votre nom');
            return;
        }
        if (!comment.trim() || comment.length < 5) {
            toast.error('Veuillez écrire un commentaire d\'au moins 5 caractères');
            return;
        }

        setSubmitting(true);
        try {
            let authorId = '';
            if (typeof window !== 'undefined') {
                try {
                    const std = localStorage.getItem('campusflow_student');
                    if (std) authorId = JSON.parse(std).id || '';
                    const prof = localStorage.getItem('campusflow_teacher');
                    if (prof) authorId = JSON.parse(prof).id || '';
                } catch {}
            }

            const newRev = {
                org_id: org?.id,
                org_slug: orgSlug,
                author_id: authorId,
                author_name: authorName.trim(),
                author_role: authorRole,
                classroom_name: classroomName.trim() || undefined,
                rating: Number(rating),
                comment: comment.trim()
            };

            const { data, error } = await supabase
                .from('school_reviews')
                .insert([newRev])
                .select()
                .single();

            if (!error && data) {
                setReviews(prev => [data, ...prev]);
            } else {
                setReviews(prev => [{ ...newRev, id: Date.now().toString(), created_at: new Date().toISOString() }, ...prev]);
            }

            toast.success('✨ Merci pour votre avis sur l\'établissement !');
            setIsModalOpen(false);
            setComment('');
        } catch {
            toast.error('Erreur lors de l\'envoi de votre avis');
        } finally {
            setSubmitting(false);
        }
    };

    const avg = reviews.length > 0
        ? (reviews.reduce((a, b) => a + (b.rating || 5), 0) / reviews.length).toFixed(1)
        : '5.0';

    return (
        <section className="relative py-16 px-4 sm:px-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/5 text-slate-300 border border-white/10 mb-2">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> AVIS DES ÉLÈVES & ENSEIGNANTS
                    </div>
                    <h3 className="text-2xl font-black text-white">La vie à {org?.name || 'l\'établissement'}</h3>
                    <p className="text-xs text-slate-400 mt-1">Retours d&apos;expérience authentiques de notre communauté académique.</p>
                </div>

                <div className="flex items-center gap-3">
                    {reviews.length > 0 && (
                        <div className="px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-2">
                            <span className="text-amber-400 font-black text-base flex items-center gap-1">
                                <Star className="w-4 h-4 fill-amber-400" /> {avg}/5
                            </span>
                            <span className="text-[11px] text-slate-500">({reviews.length} avis)</span>
                        </div>
                    )}
                    <Button
                        size="sm"
                        onClick={() => setIsModalOpen(true)}
                        className="font-bold text-xs h-10 px-4 rounded-xl text-white shadow-lg"
                        style={{ background: `linear-gradient(135deg,${bc},${bc}cc)` }}
                    >
                        <MessageSquarePlus className="w-4 h-4 mr-1.5" /> Donner un avis
                    </Button>
                </div>
            </div>

            {/* Grid des avis */}
            {reviews.length === 0 ? (
                <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-3">
                    <p className="text-sm font-bold text-white">Soyez le premier à donner votre avis !</p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">Étudiants et professeurs, partagez vos impressions sur la formation, les cours et l&apos;ambiance de l&apos;établissement.</p>
                    <Button size="sm" onClick={() => setIsModalOpen(true)} variant="outline" className="text-xs rounded-xl border-white/15 text-slate-300">
                        Laisser mon avis
                    </Button>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reviews.map((r, i) => (
                        <div key={r.id || i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
                            <div>
                                <div className="flex items-center gap-1 mb-2.5">
                                    {[...Array(5)].map((_, idx) => (
                                        <Star key={idx} className={`w-3.5 h-3.5 ${idx < (r.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} />
                                    ))}
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed italic mb-4">&ldquo;{r.comment}&rdquo;</p>
                            </div>
                            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
                                <span className="font-bold text-white">{r.author_name}</span>
                                <span className="text-slate-400 font-medium">
                                    {r.author_role === 'teacher' ? '👨‍🏫 Professeur' : '👨‍🎓 Étudiant'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-[#0F131D] border border-white/15 rounded-3xl p-6 shadow-2xl relative">
                            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                                <h3 className="text-base font-black text-white">Donner votre avis sur {org?.name}</h3>
                                <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-xl bg-white/5 text-slate-400 hover:text-white">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Note globale</label>
                                    <div className="flex items-center gap-1.5">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <button key={s} type="button" onClick={() => setRating(s)} className="p-1 hover:scale-125 transition-transform">
                                                <Star className={`w-6 h-6 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1">Votre Nom</label>
                                    <Input value={authorName} onChange={e => setAuthorName(e.target.value)} required placeholder="Ex: Paul Martin" className="h-10 text-xs bg-white/5 border-white/10 rounded-xl text-white" />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setAuthorRole('student')}
                                        className={`p-2 rounded-xl text-xs font-bold border transition-all ${authorRole === 'student' ? 'bg-teal-500/20 border-teal-500 text-teal-300' : 'bg-white/5 border-white/10 text-slate-400'}`}
                                    >
                                        👨‍🎓 Je suis Étudiant
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAuthorRole('teacher')}
                                        className={`p-2 rounded-xl text-xs font-bold border transition-all ${authorRole === 'teacher' ? 'bg-teal-500/20 border-teal-500 text-teal-300' : 'bg-white/5 border-white/10 text-slate-400'}`}
                                    >
                                        👨‍🏫 Je suis Professeur
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1">Votre avis / expérience</label>
                                    <Textarea value={comment} onChange={e => setComment(e.target.value)} required rows={3} placeholder="Partagez vos impressions sur les cours, l'organisation..." className="text-xs bg-white/5 border-white/10 rounded-xl text-white" />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full h-11 font-black text-xs rounded-xl text-white mt-2"
                                    style={{ background: `linear-gradient(135deg,${bc},${bc}cc)` }}
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                    Publier mon avis
                                </Button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </section>
    );
}
