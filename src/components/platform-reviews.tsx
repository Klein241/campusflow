'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Star, MessageSquarePlus, Sparkles, CheckCircle2,
    Coins, Quote, ShieldCheck, User, Send, Loader2, X,
    ChevronLeft, ChevronRight, School, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form states
    const [authorName, setAuthorName] = useState('');
    const [authorRole, setAuthorRole] = useState<'student' | 'teacher' | 'admin' | 'visiteur'>('student');
    const [schoolName, setSchoolName] = useState('');
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');

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

    // Try auto-fill from current session if logged in
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
            toast.error('Veuillez entrer votre nom');
            return;
        }
        if (!comment.trim() || comment.length < 5) {
            toast.error('Veuillez écrire un commentaire d\'au moins 5 caractères');
            return;
        }

        setSubmitting(true);
        try {
            // Get potential author ID from storage
            let authorId = '';
            if (typeof window !== 'undefined') {
                try {
                    const std = localStorage.getItem('campusflow_student');
                    if (std) authorId = JSON.parse(std).id || JSON.parse(std).access_code || '';
                    const prof = localStorage.getItem('campusflow_teacher');
                    if (prof) authorId = JSON.parse(prof).id || JSON.parse(prof).email || '';
                } catch {}
            }

            const roleLabels: Record<string, string> = {
                student: 'Étudiant(e)',
                teacher: 'Professeur',
                admin: 'Administrateur',
                visiteur: 'Utilisateur'
            };

            const newRev = {
                author_id: authorId,
                author_name: authorName.trim(),
                author_role: roleLabels[authorRole] || 'Étudiant(e)',
                school_name: schoolName.trim() || 'CampusFlow',
                rating: Number(rating),
                comment: comment.trim(),
                sky_points_awarded: true
            };

            const { data, error } = await supabase
                .from('platform_reviews')
                .insert([newRev])
                .select()
                .single();

            if (!error && data) {
                setReviews(prev => [data, ...prev]);
            } else {
                setReviews(prev => [{ ...newRev, id: Date.now().toString(), created_at: new Date().toISOString() }, ...prev]);
            }

            // Award Sky Points locally and notify
            if (typeof window !== 'undefined') {
                const currentPts = parseInt(localStorage.getItem('campusflow_sky_points') || '0');
                localStorage.setItem('campusflow_sky_points', (currentPts + 10).toString());
            }

            toast.success('🎉 Merci pour votre avis ! Vous avez gagné +10 Sky Points ⭐');
            setIsModalOpen(false);
            setComment('');
        } catch (err: any) {
            toast.error('Erreur lors de l\'envoi de votre avis');
        } finally {
            setSubmitting(false);
        }
    };

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
                            Rejoignez plus de 500 établissements, professeurs et étudiants satisfaits. Partagez votre expérience et gagnez <span className="text-amber-400 font-bold">+10 Sky Points</span> !
                        </p>
                    </div>

                    {/* Stats & CTA */}
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

                        <Button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-2xl h-12 px-6 shadow-xl shadow-amber-500/20 gap-2 transition-all hover:scale-[1.02]"
                        >
                            <Coins className="w-4 h-4 text-slate-950" /> Donner mon avis (+10 Sky Pts)
                        </Button>
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

                            {/* Author Footer */}
                            <div className="pt-4 border-t border-white/5 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-white/10 flex items-center justify-center font-black text-amber-300 text-sm">
                                    {rev.author_name ? rev.author_name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="font-bold text-xs text-white truncate">{rev.author_name}</h4>
                                        <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" aria-label="Vérifié" />
                                    </div>
                                    <p className="text-[10px] text-slate-400 truncate">
                                        {rev.author_role} {rev.school_name ? `• ${rev.school_name}` : ''}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* ═══ MODALE POUR LAISSER UN AVIS (+10 SKY POINTS) ═══ */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-lg bg-[#0F131D] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
                        >
                            {/* Glow badge */}
                            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                        <Award className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white">Votre avis sur CampusFlow</h3>
                                        <p className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                                            <Coins className="w-3 h-3" /> Gagnez instantanément +10 Sky Points !
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Note en étoiles */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-2">Votre note globale</label>
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setRating(star)}
                                                className="p-1 transition-transform hover:scale-125 focus:outline-none"
                                            >
                                                <Star
                                                    className={`w-7 h-7 ${
                                                        star <= rating
                                                            ? 'fill-amber-400 text-amber-400'
                                                            : 'text-slate-600'
                                                    }`}
                                                />
                                            </button>
                                        ))}
                                        <span className="text-sm font-bold text-amber-400 ml-2">
                                            {rating === 5 ? 'Excellent ! 🌟' : rating === 4 ? 'Très bien 👍' : `${rating}/5`}
                                        </span>
                                    </div>
                                </div>

                                {/* Nom */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Votre nom complet</label>
                                    <Input
                                        value={authorName}
                                        onChange={e => setAuthorName(e.target.value)}
                                        placeholder="Ex: Jean-Luc Dupont"
                                        required
                                        className="h-11 bg-white/5 border-white/10 text-white rounded-xl text-xs"
                                    />
                                </div>

                                {/* Rôle */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {([
                                        { id: 'student', label: '👨‍🎓 Étudiant' },
                                        { id: 'teacher', label: '👨‍🏫 Professeur' },
                                        { id: 'admin', label: '🏫 Admin/Dir' },
                                        { id: 'visiteur', label: '👤 Visiteur' }
                                    ] as const).map(r => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => setAuthorRole(r.id)}
                                            className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                                                authorRole === r.id
                                                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Établissement (facultatif) */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Établissement ou ville (facultatif)</label>
                                    <Input
                                        value={schoolName}
                                        onChange={e => setSchoolName(e.target.value)}
                                        placeholder="Ex: Lycée Classique / Libreville"
                                        className="h-11 bg-white/5 border-white/10 text-white rounded-xl text-xs"
                                    />
                                </div>

                                {/* Commentaire */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Votre avis / retour d&apos;expérience</label>
                                    <Textarea
                                        value={comment}
                                        onChange={e => setComment(e.target.value)}
                                        placeholder="Dites-nous ce que vous appréciez sur CampusFlow..."
                                        required
                                        rows={4}
                                        className="bg-white/5 border-white/10 text-white rounded-xl text-xs leading-relaxed"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full h-12 font-black rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs shadow-xl shadow-amber-500/20 mt-2"
                                >
                                    {submitting ? (
                                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Envoi en cours...</>
                                    ) : (
                                        <><Send className="w-4 h-4 mr-2" /> Publier mon avis & Recevoir +10 Sky Points</>
                                    )}
                                </Button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </section>
    );
}
