'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Star, Sparkles, CheckCircle2,
    ShieldCheck, School, Quote
} from 'lucide-react';
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
                            <span className="text-[11px] text-slate-500">({reviews.length} avis vérifiés)</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Témoignages vérifiés
                    </div>
                </div>
            </div>

            {/* Grid des avis */}
            {reviews.length === 0 ? (
                <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-2">
                    <p className="text-sm font-bold text-white">Retours d&apos;expérience des membres</p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">Les avis certifiés déposés par les étudiants et professeurs inscrits apparaîtront ici.</p>
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
                                <span className="font-bold text-white flex items-center gap-1">
                                    {r.author_name}
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                </span>
                                <span className="text-slate-400 font-medium">
                                    {r.author_role === 'teacher' ? '👨‍🏫 Professeur' : '👨‍🎓 Étudiant'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
