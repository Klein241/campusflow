'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight,
    Send, Plus, Mail, Sparkles, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ScheduledEvent {
    id: string;
    date: string; // YYYY-MM-DD
    time: string;
    title: string;
    type: 'email_campaign' | 'sequence_followup' | 'social_post' | 'webinar_demo';
    target_count: number;
    status: 'scheduled' | 'sent';
}

const DEFAULT_SCHEDULED_EVENTS: ScheduledEvent[] = [
    {
        id: 'ev_1',
        date: new Date().toISOString().slice(0, 10),
        time: '10:00',
        title: 'Campagne Rentrée IziTeach Pro (Lycées Douala)',
        type: 'email_campaign',
        target_count: 85,
        status: 'sent',
    },
    {
        id: 'ev_2',
        date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
        time: '09:30',
        title: 'Séquence Relance J+3 (Directeurs non-ouverts)',
        type: 'sequence_followup',
        target_count: 42,
        status: 'scheduled',
    },
    {
        id: 'ev_3',
        date: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
        time: '15:00',
        title: 'Webinaire Démo Live : Salle d\'Évaluation & Sky Agent',
        type: 'webinar_demo',
        target_count: 120,
        status: 'scheduled',
    },
    {
        id: 'ev_4',
        date: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
        time: '08:00',
        title: 'Diffusion Publicité LinkedIn & Facebook Universités',
        type: 'social_post',
        target_count: 350,
        status: 'scheduled',
    }
];

export function MarketingCalendarView() {
    const [events, setEvents] = useState<ScheduledEvent[]>(DEFAULT_SCHEDULED_EVENTS);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));

    // Calendar month days calculation
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const daysArray = Array.from({ length: daysInMonth }, (_, i) => {
        const dayNum = i + 1;
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        const dayEvents = events.filter(e => e.date === dateStr);
        return {
            dayNum,
            dateStr,
            events: dayEvents,
        };
    });

    const monthName = today.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-6">
            {/* Header banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-600/10 via-blue-600/10 to-violet-600/10 border border-cyan-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white flex-shrink-0">
                        <CalendarIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white flex items-center gap-2">
                            Calendrier Marketing & Programmation des Envois
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                Planning Automatisé
                            </span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Visualisez et planifiez l'ensemble de vos campagnes, relances automatiques et publications publicitaires.
                        </p>
                    </div>
                </div>
            </div>

            {/* Calendar & Scheduled List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Calendar Grid */}
                <div className="lg:col-span-2 p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white capitalize flex items-center gap-2">
                            <Clock className="w-4 h-4 text-cyan-400" />
                            {monthName}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">Total : {events.length} actions planifiées</span>
                        </div>
                    </div>

                    {/* Days grid */}
                    <div className="grid grid-cols-7 gap-2">
                        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                            <div key={d} className="text-center text-[10px] font-bold text-slate-500 py-1">
                                {d}
                            </div>
                        ))}

                        {daysArray.map(({ dayNum, dateStr, events: dayEvents }) => {
                            const isToday = dateStr === new Date().toISOString().slice(0, 10);
                            const isSelected = dateStr === selectedDate;
                            const hasEvents = dayEvents.length > 0;

                            return (
                                <div
                                    key={dayNum}
                                    onClick={() => setSelectedDate(dateStr)}
                                    className={`min-h-16 p-1.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${isSelected
                                        ? 'bg-cyan-950/30 border-cyan-500/50'
                                        : isToday
                                            ? 'bg-white/10 border-white/20'
                                            : 'bg-white/[0.01] border-white/5 hover:border-white/10'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[11px] font-bold ${isToday ? 'text-cyan-400' : 'text-slate-300'}`}>
                                            {dayNum}
                                        </span>
                                        {hasEvents && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                        )}
                                    </div>

                                    {/* Mini event tags */}
                                    <div className="space-y-0.5">
                                        {dayEvents.slice(0, 2).map(ev => (
                                            <div
                                                key={ev.id}
                                                className="text-[8px] truncate px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-medium"
                                                title={ev.title}
                                            >
                                                {ev.time} {ev.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Scheduled Actions on Selected Date */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                    <div>
                        <h3 className="text-sm font-bold text-white flex items-center justify-between">
                            <span>Planning du {selectedDate}</span>
                        </h3>
                        <p className="text-[11px] text-slate-400">Événements programmés pour ce jour</p>
                    </div>

                    <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                        {events.filter(e => e.date === selectedDate).length > 0 ? (
                            events.filter(e => e.date === selectedDate).map(ev => (
                                <div
                                    key={ev.id}
                                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-mono text-cyan-300 font-bold">
                                            ⏰ {ev.time}
                                        </span>
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${ev.status === 'sent'
                                            ? 'bg-emerald-500/20 text-emerald-300'
                                            : 'bg-amber-500/20 text-amber-300'}`}>
                                            {ev.status === 'sent' ? '✅ Envoyé' : '📅 Programmé'}
                                        </span>
                                    </div>
                                    <h4 className="text-xs font-bold text-white">{ev.title}</h4>
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5">
                                        <span>Cibles : {ev.target_count} prospects</span>
                                        <span className="capitalize">{ev.type.replace('_', ' ')}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 text-center text-slate-500 text-xs">
                                Aucune action programmée à cette date.
                            </div>
                        )}
                    </div>

                    <Button
                        onClick={() => toast.info('Pour programmer une campagne, rendez-vous dans l\'onglet Campagnes & Programmation !')}
                        className="w-full h-10 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-600/20"
                    >
                        <Plus className="w-4 h-4" /> Programmer une Action
                    </Button>
                </div>
            </div>
        </div>
    );
}
