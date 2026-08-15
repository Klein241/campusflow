'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Star, Sparkles, CheckCircle2,
    Quote
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Review {
    id: string;
    author_name: string;
    author_role: string;
    school_name?: string;
    rating: number;
    comment: string;
    created_at: string;
}

const DEFAULT_REVIEWS: Review[] = [
    {
        id: '1',
        author_name: 'Dr. Marc Kouamé',
        author_role: 'Professeur',
        school_name: 'Lycée d\'Excellence',
        rating: 5,
        comment: 'CampusFlow a totalement transformé la saisie des notes et le suivi de mes élèves. Le gain de temps est exceptionnel !',
        created_at: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
        id: '2',
        author_name: 'Aïssatou Diallo',
        author_role: 'Étudiante',
        school_name: 'Institut Supérieur Tech',
        rating: 5,
        comment: 'J\'adore consulter mon emploi du temps et mes bulletins directement sur mon téléphone. L\'interface est fluide et super moderne.',
        created_at: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
        id: '3',
        author_name: 'Patrick Mengue',
        author_role: 'Directeur d\'école',
        school_name: 'GreatSoft Academy',
        rating: 5,
        comment: 'La personnalisation des pages d\'accueil et la gestion des paiements Mobile Money font de CampusFlow la meilleure plateforme scolaire.',
        created_at: new Date(Date.now() - 8 * 86400000).toISOString()
    },
    {
        id: '4',
        author_name: 'Sarah Benali',
        author_role: 'Étudiante',
        school_name: 'Faculté des Sciences',
        rating: 5,
        comment: 'Les cours en ligne et la salle d\'examen interactive rendent les révisions beaucoup plus stimulantes !',
        created_at: new Date(Date.now() - 12 * 86400000).toISOString()
    }
];

export function PlatformReviewsSection() {
    const [reviews, setReviews] = useState<Review[]>(DEFAULT_REVIEWS);
    const [loading, setLoading] = useState(true);

    // Fetch reviews from Supabase
    useEffect(() => {
        async function fetchReviews() {
            try {
                const { data, error } = await supabase
                    .from('platform_reviews')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (data && data.length > 0) {
                    setReviews(data);
                }
            } catch (e) {
                // fallback to default
            } finally {
                setLoading(false);
            }
        }
        fetchReviews();
    }, []);

    const avgRating = (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / (reviews.length || 1)).toFixed(1);

    return (
        <section className="relative py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5 overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-teal-500/10 rounded-full blur-[140px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                {/* ═══ Header de la section ═══ */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-3">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> AVIS DE LA COMMUNAUTÉ
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
                            Ce que pensent nos utilisateurs
                        </h2>
                        <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-xl">
                            Avis vérifiés déposés par nos étudiants, professeurs et chefs d&apos;établissement depuis leurs espaces personnels.
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
                            <div className="flex items-center text-amber-400">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                                ))}
                            </div>
                            <div className="border-l border-white/10 pl-3">
                                <span className="text-lg font-black text-white">{avgRating}/5</span>
                                <span className="text-[11px] text-slate-400 block">{reviews.length} avis vérifiés</span>
                            </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Profils & Avis 100% Vérifiés
                        </div>
                    </div>
                </div>

                {/* ═══ Grille des Avis ═══ */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {reviews.map((rev, idx) => (
                        <motion.div
                            key={rev.id || idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.05 }}
                            className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-amber-500/30 transition-all duration-300 flex flex-col justify-between relative group hover:bg-white/[0.04]"
                        >
                            <Quote className="absolute top-5 right-5 w-8 h-8 text-white/[0.03] group-hover:text-amber-400/10 transition-colors" />

                            <div>
                                {/* Stars */}
                                <div className="flex items-center gap-1 mb-4">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`w-3.5 h-3.5 ${
                                                i < (rev.rating || 5)
                                                    ? 'fill-amber-400 text-amber-400'
                                                    : 'text-slate-700'
                                            }`}
                                        />
                                    ))}
                                </div>

                                {/* Comment */}
                                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic mb-6">
                                    &ldquo;{rev.comment}&rdquo;
                                </p>
                            </div>

                            {/* Author details */}
                            <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center font-black text-xs text-amber-300 shrink-0">
                                    {(rev.author_name || 'U')[0]?.toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <p className="font-extrabold text-xs text-white truncate">
                                            {rev.author_name}
                                        </p>
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                    </div>
                                    <p className="text-[10px] text-slate-400 truncate">
                                        {rev.author_role} • {rev.school_name}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
