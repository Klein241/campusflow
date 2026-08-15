'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, BookOpen, Star, BookMarked,
    Users, Phone, Mail, MapPin, Award, CheckCircle2,
    ArrowRight, FileText, GraduationCap, ShieldCheck,
    Bell, Calendar, Clock, ChevronRight, Globe,
    Search, FlaskConical, Trophy, Palette, CheckSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { orgPath } from '@/lib/custom-domain';

interface TemplateProps {
    org: any;
    orgSlug: string;
    classrooms: any[];
    filieres: any[];
    teacherCount: number;
    studentCount: number;
    gallery: string[];
    bc: string;
    onOpenInscription?: () => void;
}

export function TemplateBentoGrid({
    org,
    orgSlug,
    classrooms,
    filieres,
    teacherCount,
    studentCount,
    gallery,
    bc,
    onOpenInscription
}: TemplateProps) {
    const [activeTab, setActiveTab] = useState<'programs' | 'about' | 'gallery' | 'portal'>('programs');

    return (
        <div className="relative min-h-screen bg-[#070A0F] text-white overflow-x-hidden selection:bg-emerald-500/30">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-emerald-500/10 blur-[180px] rounded-full" />
                <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-teal-500/10 blur-[160px] rounded-full" />
            </div>

            {/* ═══ Header Navbar Bento ═══ */}
            <nav className="relative z-20 max-w-7xl mx-auto px-4 sm:px-8 py-5">
                <div className="flex items-center justify-between gap-4 p-3 px-6 rounded-2xl bg-[#0F141E]/80 backdrop-blur-2xl border border-white/10 shadow-xl">
                    <div className="flex items-center gap-3">
                        {org.logo_url ? (
                            <img src={org.logo_url} alt={org.name} className="w-9 h-9 rounded-xl object-contain bg-white/10 p-1 border border-white/10 shrink-0" />
                        ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shrink-0">
                                <Sparkles className="w-5 h-5 font-black" />
                            </div>
                        )}
                        <span className="font-black text-sm tracking-wide text-white uppercase">{org.name}</span>
                    </div>

                    <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
                        <a href="#home" className="text-emerald-400 font-bold hover:text-emerald-300">Home</a>
                        <button onClick={() => setActiveTab('programs')} className="hover:text-emerald-400">Programs</button>
                        <a href="#inscription" onClick={onOpenInscription} className="hover:text-emerald-400">Admissions</a>
                        <button onClick={() => setActiveTab('about')} className="hover:text-emerald-400">Campus</button>
                        <button onClick={() => setActiveTab('gallery')} className="hover:text-emerald-400">News</button>
                        <a href="#contact" className="hover:text-emerald-400">Contact</a>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href={orgPath(orgSlug, 'login')}>
                            <Button size="sm" className="h-9 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-full shadow-lg shadow-emerald-500/20">
                                Log In
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ═══ Main Bento Layout ═══ */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-28 space-y-8">
                {/* ═══ Hero Title Area ═══ */}
                <div className="text-center max-w-3xl mx-auto space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        Shape Your Future at {org.name}
                    </p>
                    <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">
                        Prestigious Education <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                            with a Global Vision
                        </span>
                    </h1>
                    <div className="flex items-center justify-center gap-3 pt-3">
                        <a href="#inscription" onClick={onOpenInscription}>
                            <Button className="h-11 px-7 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25">
                                Enroll Now
                            </Button>
                        </a>
                        <button onClick={() => setActiveTab('programs')}>
                            <Button variant="outline" className="h-11 px-7 rounded-full border-white/15 text-white hover:bg-white/5 font-bold text-xs">
                                Explore Programs
                            </Button>
                        </button>
                    </div>
                </div>

                {/* ═══ Capsule Navigation Pill Bar ═══ */}
                <div className="flex justify-center">
                    <div className="flex items-center gap-2 p-1.5 rounded-full bg-[#111723]/90 border border-white/10 backdrop-blur-xl shadow-xl">
                        {[
                            { id: 'programs', label: 'Programs' },
                            { id: 'about', label: 'About Us' },
                            { id: 'gallery', label: 'Photo Gallery' },
                            { id: 'portal', label: 'Student Portal' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ═══ Bento Grid Core Layout (Exact matching cards) ═══ */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* LEFT COLUMN: Student Hub Widget (Col 5) */}
                    <div className="lg:col-span-5 space-y-5">
                        {/* 1. Student Portal Card */}
                        <div className="p-6 rounded-3xl bg-[#0D121D]/90 border border-emerald-500/30 shadow-2xl backdrop-blur-xl space-y-5">
                            {/* Profile Bar */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full border-2 border-emerald-400 p-0.5 overflow-hidden">
                                        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80" alt="" className="w-full h-full rounded-full object-cover" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-white">Welcome back, Sarah!</h3>
                                        <p className="text-[11px] text-slate-400">(Gr. 11 • Tech Section)</p>
                                    </div>
                                </div>
                                <div className="relative p-2 rounded-xl bg-white/5 text-slate-300">
                                    <Bell className="w-4 h-4" />
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                </div>
                            </div>

                            {/* 3 Stats Chips */}
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black mb-1">3</span>
                                    <p className="text-[11px] font-bold text-slate-300">Assignments</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                                    <span className="inline-block px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-black mb-1">8</span>
                                    <p className="text-[11px] font-bold text-slate-300">Classes</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                                    <span className="inline-block px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-black mb-1">5</span>
                                    <p className="text-[11px] font-bold text-slate-300">Messages</p>
                                </div>
                            </div>

                            {/* Quick Access Buttons */}
                            <div className="grid grid-cols-2 gap-2">
                                <Link href={orgPath(orgSlug, 'login')}>
                                    <Button className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20">
                                        Quick access
                                    </Button>
                                </Link>
                                <Link href={orgPath(orgSlug, 'login')}>
                                    <Button variant="outline" className="w-full h-10 rounded-xl border-white/10 text-white hover:bg-white/5 text-xs font-bold">
                                        Student Portal
                                    </Button>
                                </Link>
                            </div>

                            {/* Mini Feed */}
                            <div className="space-y-2 pt-2 border-t border-white/5">
                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                                    <div className="flex items-center gap-2.5">
                                        <Calendar className="w-4 h-4 text-amber-400" />
                                        <div>
                                            <p className="font-bold text-white text-[11px]">Upcoming Exams</p>
                                            <p className="text-[9px] text-slate-500">Upcoming Session 2026</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                                </div>
                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                                    <div className="flex items-center gap-2.5">
                                        <Sparkles className="w-4 h-4 text-pink-400" />
                                        <div>
                                            <p className="font-bold text-white text-[11px]">Campus News</p>
                                            <p className="text-[9px] text-slate-500">Hackathon & Open Days</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Bento Tiles (Col 7) */}
                    <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
                        {/* 1. Quick Links Card */}
                        <div className="p-5 rounded-3xl bg-[#0D121D]/90 border border-white/10 shadow-xl space-y-3">
                            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> Quick Links
                            </h4>
                            <div className="space-y-1.5">
                                {[
                                    { label: 'My Grades', icon: Trophy },
                                    { label: 'Academic Calendar', icon: Calendar },
                                    { label: 'Homework & Tasks', icon: BookOpen },
                                    { label: 'Tuition & Fees', icon: ShieldCheck },
                                ].map((item, i) => (
                                    <Link key={i} href={orgPath(orgSlug, 'login')}>
                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 border border-transparent hover:border-white/10 text-xs transition cursor-pointer">
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <item.icon className="w-3.5 h-3.5 text-emerald-400" />
                                                <span>{item.label}</span>
                                            </div>
                                            <ChevronRight className="w-3 h-3 text-slate-600" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* 2. Resources Card */}
                        <div className="p-5 rounded-3xl bg-[#0D121D]/90 border border-white/10 shadow-xl space-y-3">
                            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                                <BookMarked className="w-3.5 h-3.5 text-teal-400" /> Resources
                            </h4>
                            <div className="space-y-1.5">
                                {[
                                    { label: 'Digital Library', icon: BookMarked },
                                    { label: 'Official Forms', icon: FileText },
                                    { label: 'Teacher Messages', icon: Mail },
                                    { label: 'Campus Rules', icon: ShieldCheck },
                                ].map((item, i) => (
                                    <Link key={i} href={orgPath(orgSlug, 'library')}>
                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 border border-transparent hover:border-white/10 text-xs transition cursor-pointer">
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <item.icon className="w-3.5 h-3.5 text-teal-400" />
                                                <span>{item.label}</span>
                                            </div>
                                            <ChevronRight className="w-3 h-3 text-slate-600" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* 3. Our Campus Stats Card */}
                        <div className="p-5 rounded-3xl bg-[#0D121D]/90 border border-white/10 shadow-xl space-y-3">
                            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Our Campus</h4>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <p className="text-lg font-black text-emerald-400">{studentCount > 0 ? `${studentCount}+` : '2 500+'}</p>
                                    <p className="text-[10px] text-slate-400">Students</p>
                                </div>
                                <div>
                                    <p className="text-lg font-black text-teal-400">{filieres.length > 0 ? filieres.length : '15+'}</p>
                                    <p className="text-[10px] text-slate-400">Programs</p>
                                </div>
                                <div>
                                    <p className="text-lg font-black text-cyan-400">{teacherCount > 0 ? `${teacherCount}+` : '120+'}</p>
                                    <p className="text-[10px] text-slate-400">Faculty</p>
                                </div>
                            </div>
                            <div className="flex justify-center gap-2 pt-2 border-t border-white/5">
                                <span className="inline-flex items-center gap-1 text-[10px] bg-white/5 px-2.5 py-1 rounded-full text-slate-300">
                                    <FlaskConical className="w-3 h-3 text-emerald-400" /> Modern Labs
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] bg-white/5 px-2.5 py-1 rounded-full text-slate-300">
                                    <Trophy className="w-3 h-3 text-amber-400" /> Sports
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] bg-white/5 px-2.5 py-1 rounded-full text-slate-300">
                                    <Palette className="w-3 h-3 text-pink-400" /> Arts
                                </span>
                            </div>
                        </div>

                        {/* 4. Upcoming Events Card */}
                        <div className="p-5 rounded-3xl bg-[#0D121D]/90 border border-white/10 shadow-xl space-y-3">
                            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-amber-400" /> Upcoming Events
                            </h4>
                            <div className="space-y-2">
                                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                                    <div>
                                        <p className="font-bold text-white text-[11px]">Campus Open Day</p>
                                        <p className="text-[9px] text-slate-400">Campus Visit & Admissions</p>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">Oct 15</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                                    <div>
                                        <p className="font-bold text-white text-[11px]">Tech Innovation Webinar</p>
                                        <p className="text-[9px] text-slate-400">Online live stream</p>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 text-[10px] font-bold">Oct 20</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
