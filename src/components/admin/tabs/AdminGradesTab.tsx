'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart3, ClipboardList, Printer, Save, X, Loader2 } from 'lucide-react';

interface Student {
    id: string;
    first_name: string;
    last_name: string;
    classroom_id?: string;
}

interface AdminGradesTabProps {
    grEvals: any[];
    grSelEval: any;
    setGrSelEval: (ev: any) => void;
    loadGradeEntries: (ev: any) => Promise<void>;
    grGrades: Record<string, string>;
    setGrGrades: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    students: Student[];
    saving: boolean;
    saveGradeEntries: () => Promise<void>;
    exportGradesPdf: () => void;
}

export function AdminGradesTab({
    grEvals,
    grSelEval,
    setGrSelEval,
    loadGradeEntries,
    grGrades,
    setGrGrades,
    students,
    saving,
    saveGradeEntries,
    exportGradesPdf
}: AdminGradesTabProps) {
    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            <h2 className="font-bold text-lg text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" /> Notes par évaluation
            </h2>

            {!grSelEval ? (
                grEvals.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                        <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Aucune évaluation. Créez-en via l&apos;onglet Évaluations.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {grEvals.map((ev: any) => (
                            <button
                                key={ev.id}
                                onClick={() => loadGradeEntries(ev)}
                                className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/5 transition text-left"
                            >
                                <div>
                                    <p className="font-medium text-sm text-white">{ev.title}</p>
                                    <p className="text-[10px] text-slate-400">
                                        {ev.subjects?.name} • {ev.classrooms?.name} • /{ev.max_score} {ev.date ? `• ${ev.date}` : ''}
                                    </p>
                                </div>
                                <span className="text-[10px] px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold">
                                    {ev.type}
                                </span>
                            </button>
                        ))}
                    </div>
                )
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/20">
                        <div>
                            <p className="font-bold text-sm text-white">{grSelEval.title}</p>
                            <p className="text-[10px] text-slate-400">
                                {grSelEval.subjects?.name} • {grSelEval.classrooms?.name} • /{grSelEval.max_score}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={exportGradesPdf}
                                className="bg-gradient-to-r from-amber-600 to-orange-600 h-8 text-xs rounded-xl font-bold"
                            >
                                <Printer className="w-3 h-3 mr-1" /> PDF
                            </Button>
                            <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-500 h-8 rounded-xl font-bold"
                                onClick={saveGradeEntries}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                                Sauver
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8" onClick={() => setGrSelEval(null)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
                        <div className="grid grid-cols-[1fr_100px] px-4 py-2.5 bg-white/5 text-xs text-slate-400 font-bold">
                            <span>Étudiant</span>
                            <span className="text-center">Note /{grSelEval.max_score}</span>
                        </div>
                        {students
                            .filter((s: any) => s.classroom_id === grSelEval.classroom_id)
                            .map((s: any) => (
                                <div
                                    key={s.id}
                                    className="grid grid-cols-[1fr_100px] items-center px-4 py-2 border-t border-white/5 hover:bg-white/[0.02]"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-blue-600/20 flex items-center justify-center text-[10px] font-black text-blue-400">
                                            {s.first_name?.[0]}
                                            {s.last_name?.[0]}
                                        </div>
                                        <span className="text-sm text-white font-medium">
                                            {s.first_name} {s.last_name}
                                        </span>
                                    </div>
                                    <Input
                                        type="number"
                                        min="0"
                                        max={grSelEval.max_score}
                                        step="0.25"
                                        value={grGrades[s.id] || ''}
                                        onChange={e => setGrGrades(g => ({ ...g, [s.id]: e.target.value }))}
                                        className="bg-white/5 border-white/10 text-white h-8 text-center rounded-lg text-sm"
                                        placeholder="—"
                                    />
                                </div>
                            ))}
                    </div>

                    {Object.values(grGrades).some(v => v !== '') &&
                        (() => {
                            const vals = Object.values(grGrades)
                                .filter(v => v !== '')
                                .map(Number);
                            const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
                            return (
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="p-3.5 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-center">
                                        <span className="text-xs text-blue-300">Moyenne</span>
                                        <p className="text-lg font-black text-blue-400 mt-0.5">{avg.toFixed(2)}</p>
                                    </div>
                                    <div className="p-3.5 rounded-2xl bg-red-600/10 border border-red-500/20 text-center">
                                        <span className="text-xs text-red-300">Min</span>
                                        <p className="text-lg font-black text-red-400 mt-0.5">{Math.min(...vals).toFixed(2)}</p>
                                    </div>
                                    <div className="p-3.5 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 text-center">
                                        <span className="text-xs text-emerald-300">Max</span>
                                        <p className="text-lg font-black text-emerald-400 mt-0.5">{Math.max(...vals).toFixed(2)}</p>
                                    </div>
                                </div>
                            );
                        })()}
                </div>
            )}
        </div>
    );
}
