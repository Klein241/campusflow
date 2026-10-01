'use client';

import { Link2 } from 'lucide-react';

interface AdminOverviewTabProps {
    org: any;
    publicBase: string;
    cls?: any[];
    subs?: any[];
    teachers?: any[];
    students?: any[];
    clsCount?: number;
    subsCount?: number;
    teachersCount?: number;
    studentsCount?: number;
}

export function AdminOverviewTab({
    org,
    publicBase,
    cls,
    subs,
    teachers,
    students,
    clsCount,
    subsCount,
    teachersCount,
    studentsCount
}: AdminOverviewTabProps) {
    if (!org) return null;

    const actualClsCount = clsCount ?? cls?.length ?? 0;
    const actualSubsCount = subsCount ?? subs?.length ?? 0;
    const actualTeachersCount = teachersCount ?? teachers?.length ?? 0;
    const actualStudentsCount = studentsCount ?? students?.length ?? 0;

    const stats = [
        { l: 'Classes', v: actualClsCount, c: 'from-teal-600 to-emerald-600', shadow: 'shadow-teal-600/20' },
        { l: 'Matières', v: actualSubsCount, c: 'from-indigo-600 to-blue-600', shadow: 'shadow-indigo-600/20' },
        { l: 'Profs', v: actualTeachersCount, c: 'from-amber-600 to-orange-600', shadow: 'shadow-amber-600/20' },
        { l: 'Étudiants', v: actualStudentsCount, c: 'from-purple-600 to-pink-600', shadow: 'shadow-purple-600/20' }
    ];

    const TYPE_LABELS: Record<string, string> = {
        'lycee': 'Lycée / Collège',
        'college': 'Collège',
        'universite': 'Université / Enseignement Supérieur',
        'centre_formation': 'Centre de Formation Professionnelle',
        'institut': 'Institut',
        'formateur_independant': 'Formateur Indépendant & Coach',
        'academie_en_ligne': 'Académie en Ligne & E-Learning',
        'k12_school': 'Lycée / Collège',
        'autre': 'Autre',
    };
    const displayType = TYPE_LABELS[org.school_type] || TYPE_LABELS[org.type] || org.school_type || org.type || 'Établissement';

    const infoFields = [
        ['Nom', org.name],
        ['Type', displayType],
        ['Ville', `${org.city || ''}, ${org.country || ''}`],
        ['Tél', org.phone || '—'],
        ['Email', org.email || '—'],
        ['WhatsApp', org.whatsapp || '—']
    ];

    const publicLinks = [
        ['Page publique', `${publicBase}`, 'text-teal-300'],
        ['Inscription prof', `${publicBase}/prof`, 'text-emerald-300'],
        ['Inscription étudiant', `${publicBase}/student`, 'text-indigo-300']
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Informations Établissement */}
            <div className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-white/10">
                <h2 className="text-xl font-black mb-4 text-gradient-primary">Informations</h2>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    {infoFields.map(([k, v], i) => (
                        <div key={i} className="flex items-center flex-wrap gap-1.5">
                            <span className="text-slate-500">{k}:</span>
                            <span className="font-medium text-white">{v}</span>
                            {k === 'Type' && (
                                <button
                                    onClick={() => window.dispatchEvent(new CustomEvent('open-school-type-modal'))}
                                    className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold transition cursor-pointer"
                                    title="Changer le type et structure d'établissement"
                                >
                                    Modifier
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Liens d'accès public */}
            <div className="p-4 sm:p-6 rounded-2xl bg-teal-500/5 backdrop-blur-sm border border-teal-500/10">
                <h3 className="font-bold text-teal-300 mb-3 flex items-center gap-2">
                    <Link2 className="w-5 h-5" /> Liens d'accès rapides
                </h3>
                <div className="space-y-2 text-sm">
                    {publicLinks.map(([l, u, c], i) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span className="text-slate-400 shrink-0">{l}:</span>
                            <code className={`px-2 py-1 rounded-lg bg-white/5 ${c} text-xs break-all font-mono`}>{u}</code>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cartes Métriques */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {stats.map((s, i) => (
                    <div key={i} className={`p-4 rounded-xl bg-gradient-to-br ${s.c} text-center shadow-lg ${s.shadow}`}>
                        <div className="text-3xl font-black">{s.v}</div>
                        <div className="text-sm text-white/80 font-medium">{s.l}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
