'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    GraduationCap, BookOpen, Layers, Users,
    Search, ChevronRight, ArrowLeft, Plus,
    Sparkles, CheckCircle2, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ClassCardItem {
    id: string;
    name: string;
    cycle?: string | null;
    filiere_id?: string | null;
    level?: number | string | null;
    capacity?: number | null;
    [key: string]: any;
}

interface ClassSelectorCardsProps {
    classes: ClassCardItem[];
    subjects: any[];
    chapters?: any[];
    lessons?: any[];
    selectedClassId: string | null;
    onSelectClass: (classId: string | null) => void;
    role: 'admin' | 'teacher' | 'student';
    title?: string;
    subtitle?: string;
    onCreateSubject?: (classId: string) => void;
}

// Palette de styles vibrants pour les cartes de classes
const CLASS_STYLES = [
    { gradient: 'from-violet-600/20 via-indigo-600/10 to-transparent', border: 'border-violet-500/30', hoverBorder: 'hover:border-violet-400/60', text: 'text-violet-300', iconBg: 'bg-violet-500/20 text-violet-300', ring: 'ring-violet-500/30' },
    { gradient: 'from-cyan-600/20 via-blue-600/10 to-transparent', border: 'border-cyan-500/30', hoverBorder: 'hover:border-cyan-400/60', text: 'text-cyan-300', iconBg: 'bg-cyan-500/20 text-cyan-300', ring: 'ring-cyan-500/30' },
    { gradient: 'from-emerald-600/20 via-teal-600/10 to-transparent', border: 'border-emerald-500/30', hoverBorder: 'hover:border-emerald-400/60', text: 'text-emerald-300', iconBg: 'bg-emerald-500/20 text-emerald-300', ring: 'ring-emerald-500/30' },
    { gradient: 'from-amber-600/20 via-orange-600/10 to-transparent', border: 'border-amber-500/30', hoverBorder: 'hover:border-amber-400/60', text: 'text-amber-300', iconBg: 'bg-amber-500/20 text-amber-300', ring: 'ring-amber-500/30' },
    { gradient: 'from-rose-600/20 via-pink-600/10 to-transparent', border: 'border-rose-500/30', hoverBorder: 'hover:border-rose-400/60', text: 'text-rose-300', iconBg: 'bg-rose-500/20 text-rose-300', ring: 'ring-rose-500/30' },
    { gradient: 'from-fuchsia-600/20 via-purple-600/10 to-transparent', border: 'border-fuchsia-500/30', hoverBorder: 'hover:border-fuchsia-400/60', text: 'text-fuchsia-300', iconBg: 'bg-fuchsia-500/20 text-fuchsia-300', ring: 'ring-fuchsia-500/30' },
];

export function ClassSelectorCards({
    classes,
    subjects,
    chapters = [],
    lessons = [],
    selectedClassId,
    onSelectClass,
    role,
    title,
    subtitle,
    onCreateSubject
}: ClassSelectorCardsProps) {
    const [searchQ, setSearchQ] = useState('');

    const filteredClasses = classes.filter(c => {
        if (!searchQ) return true;
        const q = searchQ.toLowerCase();
        return c.name?.toLowerCase().includes(q) || c.cycle?.toLowerCase().includes(q);
    });

    const selectedClass = classes.find(c => c.id === selectedClassId);

    // ── Si une classe est sélectionnée : Afficher la barre de navigation breadcrumb
    if (selectedClassId && selectedClass) {
        const classSubjects = subjects.filter(s => s.classroom_id === selectedClassId);
        const classSubjectIds = classSubjects.map(s => s.id);
        const classChapters = chapters.filter(ch => classSubjectIds.includes(ch.subject_id));
        const classChapterIds = classChapters.map(ch => ch.id);
        const classLessons = lessons.filter(l => classChapterIds.includes(l.chapter_id));

        return (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-transparent border border-white/[0.09] mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectClass(null)}
                        className="gap-2 text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] rounded-xl border border-white/[0.08] transition-all"
                    >
                        <ArrowLeft className="w-4 h-4 text-violet-400" />
                        <span>{role === 'student' ? 'Mes Filières' : 'Toutes les classes'}</span>
                    </Button>

                    <div className="h-5 w-px bg-white/[0.1] hidden sm:block" />

                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                            <GraduationCap className="w-3.5 h-3.5 text-violet-400" />
                        </div>
                        <div>
                            <span className="text-sm font-bold text-white tracking-wide">
                                {selectedClass.name}
                            </span>
                            {selectedClass.cycle && (
                                <span className="ml-2 text-[10px] text-slate-400 bg-white/[0.06] px-2 py-0.5 rounded-full border border-white/[0.06]">
                                    {selectedClass.cycle}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 font-semibold text-slate-300">
                            <BookOpen className="w-3 h-3 text-indigo-400" />
                            {classSubjects.length} matière{classSubjects.length > 1 ? 's' : ''}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3 text-teal-400" />
                            {classChapters.length} chap.
                        </span>
                        <span>•</span>
                        <span>{classLessons.length} leçons</span>
                    </div>

                    {/* Sélecteur rapide de switch de classe */}
                    {classes.length > 1 && (
                        <div className="relative">
                            <select
                                value={selectedClassId}
                                onChange={(e) => onSelectClass(e.target.value)}
                                className="text-xs bg-slate-900/90 text-slate-300 border border-white/[0.12] rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400 cursor-pointer"
                            >
                                {classes.map(c => (
                                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                                        {c.name} {c.cycle ? `(${c.cycle})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── Vue Grille de Sélection des Classes / Filières
    return (
        <div className="space-y-5 mb-6">
            {/* Header & Recherche */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-violet-400" />
                        {title || (role === 'student' ? 'Mes Filières & Formations' : 'Répartition par Classe & Filière')}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                        {subtitle || (role === 'student'
                            ? 'Sélectionnez votre filière pour accéder à vos cours'
                            : 'Sélectionnez une classe pour gérer ses matières, chapitres et périodes de déverrouillage')}
                    </p>
                </div>

                {classes.length > 4 && (
                    <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            placeholder="Rechercher une classe..."
                            value={searchQ}
                            onChange={(e) => setSearchQ(e.target.value)}
                            className="pl-9 h-9 text-xs bg-white/[0.04] border-white/[0.08] text-white rounded-xl focus:border-violet-500/50"
                        />
                    </div>
                )}
            </div>

            {/* Grille des cartes de classes */}
            {filteredClasses.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/[0.08] rounded-2xl bg-white/[0.02]">
                    <GraduationCap className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-400">Aucune classe trouvée</p>
                    <p className="text-xs text-slate-600 mt-1">
                        {role === 'teacher'
                            ? 'Vous n\'avez pas encore de classe ou matière assignée.'
                            : 'Créez vos classes dans les paramètres de l\'établissement.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredClasses.map((cls, idx) => {
                        const style = CLASS_STYLES[idx % CLASS_STYLES.length];
                        const classSubjects = subjects.filter(s => s.classroom_id === cls.id);
                        const classSubjectIds = classSubjects.map(s => s.id);
                        const classChapters = chapters.filter(ch => classSubjectIds.includes(ch.subject_id));
                        const classChapterIds = classChapters.map(ch => ch.id);
                        const classLessons = lessons.filter(l => classChapterIds.includes(l.chapter_id));

                        return (
                            <motion.div
                                key={cls.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.04 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onSelectClass(cls.id)}
                                className={cn(
                                    'group relative rounded-2xl border p-4 cursor-pointer transition-all duration-200 shadow-lg',
                                    'bg-gradient-to-br bg-slate-900/60 backdrop-blur-md',
                                    style.border,
                                    style.hoverBorder,
                                    'hover:shadow-violet-500/10'
                                )}
                            >
                                <div className={cn('absolute inset-0 rounded-2xl bg-gradient-to-br opacity-50 transition-opacity group-hover:opacity-100', style.gradient)} />

                                <div className="relative z-10 space-y-3">
                                    {/* Header de la carte */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border font-black text-sm', style.iconBg, style.border)}>
                                                {cls.name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="text-base font-black text-white group-hover:text-violet-200 transition-colors">
                                                    {cls.name}
                                                </h3>
                                                {cls.cycle && (
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        Cycle : {cls.cycle}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="w-8 h-8 rounded-full bg-white/[0.04] group-hover:bg-white/[0.12] flex items-center justify-center transition-colors">
                                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                                        </div>
                                    </div>

                                    {/* Métriques / Compteurs */}
                                    <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/[0.06]">
                                        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
                                            <p className="text-[10px] text-slate-400 font-medium">Matières</p>
                                            <p className="text-sm font-black text-white">{classSubjects.length}</p>
                                        </div>
                                        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
                                            <p className="text-[10px] text-slate-400 font-medium">Chapitres</p>
                                            <p className="text-sm font-black text-teal-300">{classChapters.length}</p>
                                        </div>
                                        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
                                            <p className="text-[10px] text-slate-400 font-medium">Leçons</p>
                                            <p className="text-sm font-black text-violet-300">{classLessons.length}</p>
                                        </div>
                                    </div>

                                    {/* Action footer */}
                                    <div className="flex items-center justify-between pt-1">
                                        <span className="text-[11px] font-semibold text-slate-400 group-hover:text-violet-300 transition-colors flex items-center gap-1">
                                            <span>Ouvrir les cours</span>
                                            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                        </span>

                                        {role === 'admin' && onCreateSubject && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onCreateSubject(cls.id);
                                                }}
                                                className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-violet-500/20 text-slate-300 hover:text-violet-300 border border-white/[0.08] transition-colors flex items-center gap-1"
                                            >
                                                <Plus className="w-2.5 h-2.5" /> + Matière
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
