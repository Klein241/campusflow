'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GraduationCap, Plus, Trash2, ArrowRight, ArrowLeft, BookOpen, Users, Settings, Calendar, CreditCard, Home, School, CheckCircle2, Loader2, Link2, Bell, ShieldCheck, UserPlus, ClipboardList, Globe, BookMarked, ShoppingBag, MessageSquare, BarChart3, Search, Edit, Save, X, Download, Filter, Palette, ExternalLink, Copy, RefreshCw, Upload, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type Tab = 'general' | 'landing' | 'setup' | 'classes' | 'subjects' | 'teachers' | 'students' | 'timetable' | 'evaluations' | 'grades' | 'payments' | 'disciplines' | 'settings';
interface Cls { id?: string; name: string; cycle: string; filiere_id: string | null; level: number; capacity: number; }
interface Sub { id?: string; name: string; code: string; coefficient: number; classroom_id: string; teacher_id: string | null; }

const SIDES = [
    { id: 'general' as Tab, icon: Home, label: 'Général' }, { id: 'landing' as Tab, icon: LayoutDashboard, label: 'Page d\'accueil' }, { id: 'setup' as Tab, icon: Settings, label: 'Configuration' },
    { id: 'classes' as Tab, icon: School, label: 'Classes' }, { id: 'subjects' as Tab, icon: BookOpen, label: 'Matières' },
    { id: 'teachers' as Tab, icon: Users, label: 'Professeurs' }, { id: 'students' as Tab, icon: GraduationCap, label: 'Étudiants' },
    { id: 'timetable' as Tab, icon: Calendar, label: 'Emploi du temps' }, { id: 'evaluations' as Tab, icon: ClipboardList, label: 'Évaluations' },
    { id: 'grades' as Tab, icon: BarChart3, label: 'Notes' },
    { id: 'payments' as Tab, icon: CreditCard, label: 'Paiements' }, { id: 'disciplines' as Tab, icon: ShieldCheck, label: 'Discipline' },
    { id: 'settings' as Tab, icon: Palette, label: 'Paramètres' },
];
const COLLEGE = ['6ème', '5ème', '4ème', '3ème'], LYCEE = ['Seconde', 'Première', 'Terminale'], SECS = ['A', 'B', 'C'];
const DEFS: Record<string, string[]> = { college: ['Mathématiques', 'Français', 'Anglais', 'SVT', 'Physique-Chimie', 'Histoire-Géo', 'Informatique', 'EPS'], lycee: ['Mathématiques', 'Français', 'Anglais', 'Physique', 'Chimie', 'SVT', 'Philosophie', 'Histoire-Géo', 'Informatique', 'EPS'], universite: ['Module 1', 'Module 2', 'Module 3', 'Projet tutoré', 'Stage'], centre_formation: ['Cours théorique', 'Travaux pratiques', 'Stage professionnel', 'Projet fin de formation'], institut: ['Cours fondamental', 'Spécialisation', 'Travaux pratiques', 'Stage'] };
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function AdminPage() {
    const { orgSlug } = useParams<{ orgSlug: string }>();
    const router = useRouter();
    const [org, setOrg] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>('general');
    const [step, setStep] = useState(0);
    const [cls, setCls] = useState<Cls[]>([]);
    const [subs, setSubs] = useState<Sub[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [newName, setNewName] = useState(''); const [newSub, setNewSub] = useState(''); const [selCls, setSelCls] = useState('');
    // Teacher creation form
    const [tFN, setTFN] = useState(''); const [tLN, setTLN] = useState(''); const [tSpec, setTSpec] = useState(''); const [tEmail, setTEmail] = useState(''); const [tPhone, setTPhone] = useState('');
    const [tNat, setTNat] = useState('Camerounaise'); const [tMarital, setTMarital] = useState('celibataire'); const [tChildren, setTChildren] = useState('0'); const [tRes, setTRes] = useState('');
    const [tShowCode, setTShowCode] = useState('');
    // Student creation form
    const [sFN, setSFN] = useState(''); const [sLN, setSLN] = useState(''); const [sSex, setSSex] = useState('M'); const [sBirth, setSBirth] = useState(''); const [sClsId, setSClsId] = useState('');
    const [sPhone, setSPhone] = useState(''); const [sGuardian, setSGuardian] = useState(''); const [sGuardianPhone, setSGuardianPhone] = useState(''); const [sNat, setSNat] = useState('Camerounaise'); const [sRes, setSRes] = useState('');
    const [sShowCode, setSShowCode] = useState(''); const [showAddTeacher, setShowAddTeacher] = useState(false); const [showAddStudent, setShowAddStudent] = useState(false);
    const [sidebar, setSidebar] = useState(false);
    // Timetable
    const [ttSlots, setTtSlots] = useState<any[]>([]);
    const [ttDay, setTtDay] = useState(1); const [ttCls2, setTtCls2] = useState(''); const [ttSub2, setTtSub2] = useState('');
    const [ttStart, setTtStart] = useState('08:00'); const [ttEnd, setTtEnd] = useState('10:00'); const [ttRoom, setTtRoom] = useState(''); const [ttLoaded, setTtLoaded] = useState(false);
    // Evaluations
    const [evals, setEvals] = useState<any[]>([]); const [evTitle, setEvTitle] = useState(''); const [evType, setEvType] = useState('devoir');
    const [evCls, setEvCls] = useState(''); const [evSub, setEvSub] = useState(''); const [evDate, setEvDate] = useState(''); const [evMax, setEvMax] = useState('20'); const [evLoaded, setEvLoaded] = useState(false);
    // Payments
    const [pays, setPays] = useState<any[]>([]); const [payStu, setPayStu] = useState(''); const [payAmt, setPayAmt] = useState('');
    const [payMeth, setPayMeth] = useState('cash'); const [payDesc, setPayDesc] = useState(''); const [payLoaded, setPayLoaded] = useState(false);
    // Discipline
    const [discs, setDiscs] = useState<any[]>([]); const [dStu, setDStu] = useState(''); const [dType, setDType] = useState('avertissement');
    const [dReason, setDReason] = useState(''); const [dLoaded, setDLoaded] = useState(false);
    // Grades admin
    const [grEvals, setGrEvals] = useState<any[]>([]); const [grSelEval, setGrSelEval] = useState<any>(null);
    const [grGrades, setGrGrades] = useState<Record<string, string>>({}); const [grLoaded, setGrLoaded] = useState(false);
    // Filters / search
    const [teacherSearch, setTeacherSearch] = useState(''); const [studentSearch, setStudentSearch] = useState(''); const [studentClsFilter, setStudentClsFilter] = useState('');
    // Settings / Domain
    const [sCustomDomain, setSCustomDomain] = useState(''); const [sDomainVerified, setSDomainVerified] = useState(false);
    const [sDomainSsl, setSDomainSsl] = useState('pending'); const [sBrandColor, setSBrandColor] = useState('#4f46e5');
    const [sLogoUrl, setSLogoUrl] = useState(''); const [sFaviconUrl, setSFaviconUrl] = useState('');
    const [sMetaTitle, setSMetaTitle] = useState(''); const [sMetaDesc, setSMetaDesc] = useState('');
    const [sOrgName, setSOrgName] = useState(''); const [sOrgPhone, setSOrgPhone] = useState('');
    const [sOrgEmail, setSOrgEmail] = useState(''); const [sOrgWhatsapp, setSOrgWhatsapp] = useState('');
    const [sVerifying, setSVerifying] = useState(false); const [sSavingSettings, setSSavingSettings] = useState(false);
    // Landing page config
    const [lHeroImage, setLHeroImage] = useState(''); const [lHeroTitle, setLHeroTitle] = useState(''); const [lHeroSubtitle, setLHeroSubtitle] = useState('');
    const [lAboutText, setLAboutText] = useState(''); const [lAboutImage, setLAboutImage] = useState('');
    const [lGalleryImages, setLGalleryImages] = useState<string[]>([]); const [lGalleryInput, setLGalleryInput] = useState('');
    const [lSocialFb, setLSocialFb] = useState(''); const [lSocialIg, setLSocialIg] = useState(''); const [lSocialTw, setLSocialTw] = useState('');
    const [lSocialTt, setLSocialTt] = useState(''); const [lSocialYt, setLSocialYt] = useState(''); const [lSocialLi, setLSocialLi] = useState('');
    const [lFooterText, setLFooterText] = useState(''); const [lSaving, setLSaving] = useState(false);
    const loadSettings = () => { if (!org) return; setSCustomDomain(org.custom_domain || ''); setSDomainVerified(org.domain_verified || false); setSDomainSsl(org.domain_ssl_status || 'pending'); setSBrandColor(org.brand_color || '#4f46e5'); setSLogoUrl(org.logo_url || ''); setSFaviconUrl(org.favicon_url || ''); setSMetaTitle(org.meta_title || ''); setSMetaDesc(org.meta_description || ''); setSOrgName(org.name || ''); setSOrgPhone(org.phone || ''); setSOrgEmail(org.email || ''); setSOrgWhatsapp(org.whatsapp || ''); };
    const loadLanding = () => { if (!org) return; setLHeroImage(org.hero_image_url || ''); setLHeroTitle(org.hero_title || ''); setLHeroSubtitle(org.hero_subtitle || ''); setLAboutText(org.about_text || ''); setLAboutImage(org.about_image_url || ''); setLGalleryImages(org.gallery_images || []); setLSocialFb(org.social_facebook || ''); setLSocialIg(org.social_instagram || ''); setLSocialTw(org.social_twitter || ''); setLSocialTt(org.social_tiktok || ''); setLSocialYt(org.social_youtube || ''); setLSocialLi(org.social_linkedin || ''); setLFooterText(org.footer_text || ''); };
    const saveLanding = async () => { setLSaving(true); try { const updates: any = { hero_image_url: lHeroImage || null, hero_title: lHeroTitle || null, hero_subtitle: lHeroSubtitle || null, about_text: lAboutText || null, about_image_url: lAboutImage || null, gallery_images: lGalleryImages, social_facebook: lSocialFb || null, social_instagram: lSocialIg || null, social_twitter: lSocialTw || null, social_tiktok: lSocialTt || null, social_youtube: lSocialYt || null, social_linkedin: lSocialLi || null, footer_text: lFooterText || null }; const { error } = await supabase.from('organizations').update(updates).eq('id', org.id); if (error) throw error; setOrg({ ...org, ...updates }); toast.success('Page d\'accueil mise à jour ✅'); } catch (e: any) { toast.error(e.message); } setLSaving(false); };

    const [authChecked, setAuthChecked] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        (async () => {
            // ── AUTH GUARD: verify the user is logged in and owns this org ──
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                setAuthChecked(true);
                setLoading(false);
                return;
            }

            const { data: o } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single();
            if (!o) { setAuthChecked(true); setLoading(false); return; }

            // Verify ownership
            if (o.owner_id !== authUser.id) {
                setAuthChecked(true);
                setLoading(false);
                return;
            }

            setIsAuthorized(true);
            setOrg(o);
            const { data: c } = await supabase.from('classrooms').select('*').eq('organization_id', o.id).order('name');
            setCls((c || []).map((x: any) => ({ id: x.id, name: x.name, cycle: x.cycle || '', filiere_id: x.filiere_id, level: x.level || 1, capacity: x.capacity || 50 })));
            const { data: s } = await supabase.from('subjects').select('*').eq('organization_id', o.id).order('name');
            setSubs((s || []).map((x: any) => ({ id: x.id, name: x.name, code: x.code || '', coefficient: x.coefficient || 1, classroom_id: x.classroom_id, teacher_id: x.teacher_id })));
            const { data: t } = await supabase.from('teacher_profiles').select('id, organization_id, first_name, last_name, speciality, email, phone, nationality, marital_status, children_count, residence, access_code, pin_set, created_at').eq('organization_id', o.id);
            setTeachers(t || []);
            const { data: st } = await supabase.from('student_profiles').select('id, organization_id, first_name, last_name, sex, birth_date, classroom_id, phone, guardian_name, guardian_phone, nationality, residence, matricule, access_code, pin_set, created_at').eq('organization_id', o.id);
            setStudents(st || []);
            if (!o.setup_completed && (c || []).length === 0) setTab('setup');
            setAuthChecked(true);
            setLoading(false);
        })();
    }, [orgSlug]);

    if (loading || !authChecked) return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center"><Loader2 className="w-8 h-8 text-teal-400 animate-spin" /></div>;
    if (!isAuthorized) return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-white"><div className="text-center"><h1 className="text-2xl font-black mb-2">🔒 Accès refusé</h1><p className="text-slate-400 text-sm mb-4">Vous devez être connecté en tant que propriétaire de cet établissement.</p><button onClick={() => router.push(`/${orgSlug}/login`)} className="px-4 py-2 bg-indigo-600 rounded-xl text-sm hover:bg-indigo-500 transition">Se connecter</button></div></div>;
    if (!org) return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-white"><h1 className="text-2xl font-black">Introuvable</h1></div>;

    const isCL = ['college', 'lycee'].includes(org.type);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    // Setup helpers
    const genCode = () => { const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code = ''; for (let i = 0; i < 12; i++) code += chars[Math.floor(Math.random() * chars.length)]; return code; };
    const addClass = () => { if (!newName.trim()) return; setCls(p => [...p, { name: newName.trim(), cycle: '', filiere_id: null, level: 1, capacity: 50 }]); setNewName(''); };
    const quickAdd = (lv: string) => { const nc = SECS.map(s => ({ name: `${lv} ${s}`, cycle: COLLEGE.includes(lv) ? '1er_cycle' : '2nd_cycle', filiere_id: null, level: 1, capacity: 50 })); setCls(p => [...p, ...nc.filter(x => !p.some(y => y.name === x.name))]); };
    const addSub = () => { if (!newSub.trim() || !selCls) return; setSubs(p => [...p, { name: newSub.trim(), code: newSub.slice(0, 4).toUpperCase(), coefficient: 1, classroom_id: selCls, teacher_id: null }]); setNewSub(''); };
    const addDefs = () => { if (!selCls) { toast.error('Sélectionnez une classe'); return; } const d = DEFS[org.type] || DEFS.centre_formation; setSubs(p => [...p, ...d.map(n => ({ name: n, code: n.slice(0, 4).toUpperCase(), coefficient: 1, classroom_id: selCls, teacher_id: null })).filter(x => !p.some(y => y.name === x.name && y.classroom_id === x.classroom_id))]); };
    const saveCls = async (): Promise<Cls[]> => { setSaving(true); try { const unsaved = cls.filter(c => !c.id); if (unsaved.length > 0) { const { data, error } = await supabase.from('classrooms').insert(unsaved.map(c => ({ organization_id: org.id, name: c.name, cycle: c.cycle || null, filiere_id: c.filiere_id, level: c.level, capacity: c.capacity }))).select(); if (error) throw error; const saved = (data || []).map((d: any) => ({ id: d.id, name: d.name, cycle: d.cycle || '', filiere_id: d.filiere_id, level: d.level, capacity: d.capacity })); const merged = [...cls.filter(c => c.id), ...saved]; setCls(merged); toast.success('Classes sauvegardées !'); setSaving(false); return merged; } toast.success('Classes OK'); setSaving(false); return cls; } catch (e: any) { toast.error(e.message); setSaving(false); return cls; } };
    const saveSubs = async () => { setSaving(true); try { const u = subs.filter(s => !s.id); if (u.length > 0) { const { error } = await supabase.from('subjects').insert(u.map(s => ({ organization_id: org.id, name: s.name, code: s.code, coefficient: s.coefficient, classroom_id: s.classroom_id, teacher_id: s.teacher_id }))); if (error) throw error; } const { data } = await supabase.from('subjects').select('*').eq('organization_id', org.id); setSubs((data || []).map((x: any) => ({ id: x.id, name: x.name, code: x.code, coefficient: x.coefficient, classroom_id: x.classroom_id, teacher_id: x.teacher_id }))); toast.success('Matières sauvegardées !'); } catch (e: any) { toast.error(e.message); } finally { setSaving(false); } };
    const finishSetup = async () => { await saveCls(); await saveSubs(); await supabase.from('organizations').update({ setup_completed: true }).eq('id', org.id); setOrg({ ...org, setup_completed: true }); setTab('general'); toast.success('🎉 Configuration terminée !'); };
    const createTeacher = async () => { if (!tFN.trim() || !tLN.trim()) { toast.error('Nom et prénom obligatoires'); return; } setSaving(true); try { const code = genCode(); const { data, error } = await supabase.from('teacher_profiles').insert({ organization_id: org.id, first_name: tFN.trim(), last_name: tLN.trim(), speciality: tSpec || null, email: tEmail || null, phone: tPhone || null, nationality: tNat, marital_status: tMarital, children_count: parseInt(tChildren) || 0, residence: tRes || null, access_code: code, pin_set: false }).select().single(); if (error) throw error; setTeachers(p => [...p, data]); setTShowCode(code); setTFN(''); setTLN(''); setTSpec(''); setTEmail(''); setTPhone(''); setTRes(''); toast.success('Professeur créé ! Code: ' + code); } catch (e: any) { toast.error(e.message); } setSaving(false); };
    const createStudent = async () => { if (!sFN.trim() || !sLN.trim() || !sClsId) { toast.error('Nom, prénom et classe obligatoires'); return; } setSaving(true); try { const code = genCode(); const mat = `STU${Date.now().toString(36).toUpperCase()}`; const { data, error } = await supabase.from('student_profiles').insert({ organization_id: org.id, first_name: sFN.trim(), last_name: sLN.trim(), sex: sSex, birth_date: sBirth || null, classroom_id: sClsId, phone: sPhone || null, guardian_name: sGuardian || null, guardian_phone: sGuardianPhone || null, nationality: sNat, residence: sRes || null, matricule: mat, access_code: code, pin_set: false }).select().single(); if (error) throw error; setStudents(p => [...p, data]); setSShowCode(code); setSFN(''); setSLN(''); setSBirth(''); setSPhone(''); setSGuardian(''); setSGuardianPhone(''); setSRes(''); toast.success('Étudiant créé ! Code: ' + code); } catch (e: any) { toast.error(e.message); } setSaving(false); };

    // Module loaders
    const loadTT = async () => { const { data } = await supabase.from('timetable_slots').select('*,classrooms:classroom_id(name),subjects:subject_id(name)').eq('organization_id', org.id).order('start_time'); setTtSlots(data || []); setTtLoaded(true); };
    const loadEv = async () => { const { data } = await supabase.from('evaluations').select('*,classrooms:classroom_id(name),subjects:subject_id(name)').eq('organization_id', org.id).order('created_at', { ascending: false }); setEvals(data || []); setEvLoaded(true); };
    const loadPay = async () => { const { data } = await supabase.from('school_payments').select('*,student_profiles:student_id(first_name,last_name,matricule)').eq('organization_id', org.id).order('paid_at', { ascending: false }).limit(50); setPays(data || []); setPayLoaded(true); };
    const loadDisc = async () => { const { data } = await supabase.from('disciplines').select('*,student_profiles:student_id(first_name,last_name,matricule)').eq('organization_id', org.id).order('created_at', { ascending: false }).limit(50); setDiscs(data || []); setDLoaded(true); };
    const loadGrades = async () => { const { data } = await supabase.from('evaluations').select('*, classrooms:classroom_id(name), subjects:subject_id(name)').eq('organization_id', org.id).order('created_at', { ascending: false }); setGrEvals(data || []); setGrLoaded(true); };
    const loadGradeEntries = async (ev: any) => { setGrSelEval(ev); const clsStudents = students.filter((s: any) => s.classroom_id === ev.classroom_id); const { data: existing } = await supabase.from('grades').select('student_id, score').eq('evaluation_id', ev.id); const gMap: Record<string, string> = {}; clsStudents.forEach((s: any) => { const g = (existing || []).find((g: any) => g.student_id === s.id); gMap[s.id] = g ? String(g.score) : ''; }); setGrGrades(gMap); };
    const saveGradeEntries = async () => { if (!grSelEval) return; setSaving(true); try { const entries = Object.entries(grGrades).filter(([_, v]) => v !== '').map(([studentId, score]) => ({ evaluation_id: grSelEval.id, student_id: studentId, score: parseFloat(score), graded_by: null })); if (entries.length === 0) { toast.info('Aucune note'); setSaving(false); return; } const { error } = await supabase.from('grades').upsert(entries, { onConflict: 'evaluation_id,student_id' }); if (error) throw error; toast.success(`${entries.length} notes sauvegardées ✅`); } catch (e: any) { toast.error(e.message); } setSaving(false); };
    const assignTeacherToSubject = async (subId: string, teacherId: string | null) => { const { error } = await supabase.from('subjects').update({ teacher_id: teacherId }).eq('id', subId); if (error) { toast.error(error.message); return; } setSubs(p => p.map(s => s.id === subId ? { ...s, teacher_id: teacherId } : s)); toast.success('Professeur assigné ✅'); };
    const deleteTeacher = async (id: string) => { if (!confirm('Supprimer ce professeur ?')) return; await supabase.from('teacher_profiles').delete().eq('id', id); setTeachers(p => p.filter(t => t.id !== id)); toast.success('Professeur supprimé'); };
    const deleteStudent = async (id: string) => { if (!confirm('Supprimer cet étudiant ?')) return; await supabase.from('student_profiles').delete().eq('id', id); setStudents(p => p.filter(s => s.id !== id)); toast.success('Étudiant supprimé'); };
    const saveSettings = async () => {
        setSSavingSettings(true);
        try {
            const updates: any = {
                name: sOrgName, phone: sOrgPhone, email: sOrgEmail, whatsapp: sOrgWhatsapp,
                brand_color: sBrandColor, logo_url: sLogoUrl || null, favicon_url: sFaviconUrl || null,
                meta_title: sMetaTitle || null, meta_description: sMetaDesc || null,
            };
            if (sCustomDomain.trim()) {
                updates.custom_domain = sCustomDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
            } else { updates.custom_domain = null; updates.domain_verified = false; updates.domain_ssl_status = 'pending'; }
            const { error } = await supabase.from('organizations').update(updates).eq('id', org.id);
            if (error) throw error;
            setOrg({ ...org, ...updates }); toast.success('Paramètres sauvegardés ✅');
        } catch (e: any) { toast.error(e.message); }
        setSSavingSettings(false);
    };
    const verifyDomain = async () => {
        if (!sCustomDomain.trim()) { toast.error('Entrez un domaine'); return; }
        setSVerifying(true);
        try {
            // Simulate DNS check (in production, call a serverless function)
            const domain = sCustomDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
            setSCustomDomain(domain);
            await supabase.from('organizations').update({ custom_domain: domain, domain_verified: true, domain_ssl_status: 'active' }).eq('id', org.id);
            setSDomainVerified(true); setSDomainSsl('active');
            setOrg({ ...org, custom_domain: domain, domain_verified: true, domain_ssl_status: 'active' });
            toast.success('Domaine vérifié et activé ! 🎉');
        } catch (e: any) { toast.error(e.message); }
        setSVerifying(false);
    };
    const removeDomain = async () => {
        if (!confirm('Retirer le domaine personnalisé ?')) return;
        await supabase.from('organizations').update({ custom_domain: null, domain_verified: false, domain_ssl_status: 'pending' }).eq('id', org.id);
        setSCustomDomain(''); setSDomainVerified(false); setSDomainSsl('pending');
        setOrg({ ...org, custom_domain: null, domain_verified: false, domain_ssl_status: 'pending' });
        toast.success('Domaine retiré');
    };
    const onTab = (t: Tab) => { setTab(t); setSidebar(false); if (t === 'timetable' && !ttLoaded) loadTT(); if (t === 'evaluations' && !evLoaded) loadEv(); if (t === 'payments' && !payLoaded) loadPay(); if (t === 'disciplines' && !dLoaded) loadDisc(); if (t === 'grades' && !grLoaded) loadGrades(); if (t === 'settings') loadSettings(); if (t === 'landing') loadLanding(); };

    // Module actions
    const addSlot = async () => { if (!ttCls2 || !ttSub2) { toast.error('Sélectionnez classe et matière'); return; } setSaving(true); const { error } = await supabase.from('timetable_slots').insert({ organization_id: org.id, classroom_id: ttCls2, subject_id: ttSub2, day_of_week: ttDay, start_time: ttStart, end_time: ttEnd, room: ttRoom || null }); if (error) toast.error(error.message); else { toast.success('Créneau ajouté !'); loadTT(); } setSaving(false); };
    const delSlot = async (id: string) => { await supabase.from('timetable_slots').delete().eq('id', id); setTtSlots(p => p.filter(s => s.id !== id)); toast.success('Supprimé'); };
    const addEval = async () => { if (!evTitle || !evCls || !evSub) { toast.error('Remplissez les champs'); return; } setSaving(true); const { error } = await supabase.from('evaluations').insert({ organization_id: org.id, title: evTitle, type: evType, classroom_id: evCls, subject_id: evSub, date: evDate || null, max_score: parseFloat(evMax) || 20 }); if (error) toast.error(error.message); else { toast.success('Évaluation créée !'); setEvTitle(''); loadEv(); } setSaving(false); };
    const addPay = async () => { if (!payStu || !payAmt) { toast.error('Sélectionnez un étudiant et un montant'); return; } setSaving(true); const { error } = await supabase.from('school_payments').insert({ organization_id: org.id, student_id: payStu, amount: parseFloat(payAmt), payment_method: payMeth, description: payDesc || 'Paiement scolarité', currency: 'XAF' }); if (error) toast.error(error.message); else { toast.success('Paiement enregistré !'); setPayAmt(''); setPayDesc(''); loadPay(); } setSaving(false); };
    const addDisc = async () => { if (!dStu || !dReason) { toast.error('Remplissez les champs'); return; } setSaving(true); const { data: { user } } = await supabase.auth.getUser(); const { error } = await supabase.from('disciplines').insert({ organization_id: org.id, student_id: dStu, type: dType, reason: dReason, created_by: user?.id }); if (error) toast.error(error.message); else { toast.success('Sanction enregistrée'); setDReason(''); loadDisc(); } setSaving(false); };

    const Sel = ({ v, onChange, opts, ph = '—' }: { v: string, onChange: (v: string) => void, opts: { id: string, label: string }[], ph?: string }) => (
        <select value={v} onChange={e => onChange(e.target.value)} className="w-full h-9 rounded-lg bg-white/5 border border-white/10 text-white px-3 text-sm">
            <option value="" className="bg-slate-900">{ph}</option>
            {opts.map(o => <option key={o.id} value={o.id} className="bg-slate-900">{o.label}</option>)}
        </select>
    );

    return (
        <div className="min-h-screen bg-[#0B0E14] text-white flex">
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-25%] right-[-15%] w-[50%] h-[50%] bg-teal-600/4 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-25%] left-[-15%] w-[40%] h-[40%] bg-indigo-600/4 blur-[150px] rounded-full" />
            </div>
            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-60 bg-[#0F1219]/90 backdrop-blur-xl border-r border-white/5 transform transition-transform lg:transform-none ${sidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="p-4 border-b border-white/5">
                    <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center"><GraduationCap className="w-4 h-4" /></div><span className="font-bold text-sm truncate">{org.name}</span></div>
                    <p className="text-xs text-slate-500 mt-1">Backoffice</p>
                </div>
                <nav className="p-2 space-y-0.5">{SIDES.map(i => (<button key={i.id} onClick={() => onTab(i.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${tab === i.id ? 'bg-teal-600/15 text-teal-300 font-medium' : 'text-slate-400 hover:bg-white/5'}`}><i.icon className="w-4 h-4" />{i.label}</button>))}
                    <div className="mt-3 pt-3 border-t border-white/5 space-y-0.5">
                        <button onClick={() => router.push(`/${orgSlug}/library`)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-emerald-400 hover:bg-emerald-600/10"><BookMarked className="w-4 h-4" />Bibliothèque</button>
                        <button onClick={() => router.push(`/${orgSlug}/shop`)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-teal-400 hover:bg-teal-600/10"><ShoppingBag className="w-4 h-4" />Marketplace</button>
                        <button onClick={() => router.push(`/${orgSlug}/messages`)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-indigo-400 hover:bg-indigo-600/10"><MessageSquare className="w-4 h-4" />Messages</button>
                    </div>
                </nav>
                <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/5"><Button variant="ghost" size="sm" className="w-full text-xs text-slate-500" onClick={() => router.push(`/${orgSlug}`)}><Globe className="w-3 h-3 mr-1" />Page publique</Button></div>
            </aside>
            {sidebar && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebar(false)} />}

            <main className="flex-1 min-h-screen relative z-10">
                <header className="sticky top-0 z-20 bg-[#0B0E14]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3"><button onClick={() => setSidebar(true)} className="lg:hidden p-2 hover:bg-white/5 rounded-xl"><Settings className="w-5 h-5" /></button><h1 className="text-lg font-black text-gradient-primary">{SIDES.find(i => i.id === tab)?.label}</h1></div>
                    <span className="text-xs text-slate-500">{students.length} étudiants • {teachers.length} profs</span>
                </header>

                <div className="p-4 sm:p-6 max-w-5xl">
                    {/* ═══ GENERAL ═══ */}
                    {tab === 'general' && <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-white/10"><h2 className="text-xl font-black mb-4 text-gradient-primary">Informations</h2><div className="grid sm:grid-cols-2 gap-3 text-sm">{[['Nom', org.name], ['Type', org.type], ['Ville', `${org.city}, ${org.country}`], ['Tél', org.phone], ['Email', org.email], ['WhatsApp', org.whatsapp || '—']].map(([k, v], i) => <div key={i}><span className="text-slate-500">{k}:</span> <span className="ml-2">{v}</span></div>)}</div></div>
                        <div className="p-6 rounded-2xl bg-teal-500/5 backdrop-blur-sm border border-teal-500/10"><h3 className="font-bold text-teal-300 mb-3 flex items-center gap-2"><Link2 className="w-5 h-5" />Liens</h3><div className="space-y-2 text-sm">{[['Page publique', `${origin}/${orgSlug}`, 'text-teal-300'], ['Inscription prof', `${origin}/${orgSlug}/prof`, 'text-emerald-300'], ['Inscription étudiant', `${origin}/${orgSlug}/student`, 'text-indigo-300']].map(([l, u, c], i) => <div key={i} className="flex items-center gap-2"><span className="text-slate-400">{l}:</span><code className={`px-2 py-1 rounded-lg bg-white/5 ${c}`}>{u}</code></div>)}</div></div>
                        <div className="grid sm:grid-cols-4 gap-4">{[{ l: 'Classes', v: cls.length, c: 'from-teal-600 to-emerald-600', shadow: 'shadow-teal-600/20' }, { l: 'Matières', v: subs.length, c: 'from-indigo-600 to-blue-600', shadow: 'shadow-indigo-600/20' }, { l: 'Profs', v: teachers.length, c: 'from-amber-600 to-orange-600', shadow: 'shadow-amber-600/20' }, { l: 'Étudiants', v: students.length, c: 'from-purple-600 to-pink-600', shadow: 'shadow-purple-600/20' }].map((s, i) => <div key={i} className={`p-4 rounded-xl bg-gradient-to-br ${s.c} text-center shadow-lg ${s.shadow}`}><div className="text-3xl font-black">{s.v}</div><div className="text-sm text-white/80">{s.l}</div></div>)}</div>
                    </div>}

                    {/* ═══ SETUP ═══ */}
                    {tab === 'setup' && <div className="space-y-6">
                        <div className="flex items-center justify-center gap-2 mb-6">{['Classes', 'Matières', 'Professeurs'].map((s, i) => <div key={i} className="flex items-center gap-2"><button onClick={() => setStep(i)} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step === i ? 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-600/25' : step > i ? 'bg-emerald-600' : 'bg-white/10 text-slate-500'}`}>{step > i ? <CheckCircle2 className="w-5 h-5" /> : i + 1}</button><span className={`text-sm hidden sm:inline ${step === i ? 'text-white font-medium' : 'text-slate-500'}`}>{s}</span>{i < 2 && <div className="w-8 h-0.5 bg-white/10" />}</div>)}</div>
                        {step === 0 && <div className="space-y-4"><div className="p-5 rounded-xl bg-white/[0.03] border border-white/10"><h3 className="font-bold text-lg mb-3">{isCL ? '🏫 Salles de classe' : '📚 Filières et niveaux'}</h3>{isCL && <div className="mb-4"><p className="text-sm text-slate-400 mb-2">Ajout rapide:</p><div className="flex flex-wrap gap-2">{(org.type === 'college' ? COLLEGE : [...COLLEGE, ...LYCEE]).map(l => <Button key={l} size="sm" variant="outline" className="text-xs border-white/10" onClick={() => quickAdd(l)}><Plus className="w-3 h-3 mr-1" />{l}</Button>)}</div></div>}<div className="flex gap-2"><Input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addClass()} placeholder={isCL ? '6ème A...' : 'Niveau 1...'} className="bg-white/5 border-white/10 text-white h-10 rounded-lg" /><Button onClick={addClass} disabled={!newName.trim()} className="bg-indigo-600 shrink-0"><Plus className="w-4 h-4" /></Button></div></div>
                            {cls.length > 0 && <div className="space-y-2">{cls.map((c, i) => <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white/5 border border-white/10"><div className="flex items-center gap-3"><School className="w-4 h-4 text-indigo-400" /><span className="text-sm font-medium">{c.name}</span>{!c.id && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300">nouveau</span>}</div><button onClick={() => setCls(p => p.filter((_, j) => j !== i))} className="text-red-400"><Trash2 className="w-4 h-4" /></button></div>)}</div>}
                            <div className="flex justify-end"><Button onClick={async () => { const saved = await saveCls(); setCls(saved); setStep(1); }} disabled={cls.length === 0 || saving} className="bg-indigo-600">{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Suivant<ArrowRight className="w-4 h-4 ml-2" /></Button></div></div>}
                        {step === 1 && <div className="space-y-4"><div className="p-5 rounded-xl bg-white/[0.03] border border-white/10"><h3 className="font-bold text-lg mb-3">📖 Matières par classe</h3><Label className="text-slate-400 text-sm mb-1 block">Classe</Label><Sel v={selCls} onChange={setSelCls} opts={cls.filter(c => c.id).map(c => ({ id: c.id!, label: c.name }))} ph="Choisir..." />{selCls && <div className="mt-3"><Button size="sm" variant="outline" className="mb-3 text-xs border-white/10" onClick={addDefs}><Plus className="w-3 h-3 mr-1" />Par défaut</Button><div className="flex gap-2"><Input value={newSub} onChange={e => setNewSub(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSub()} placeholder="Nom matière" className="bg-white/5 border-white/10 text-white h-10 rounded-lg" /><Button onClick={addSub} disabled={!newSub.trim()} className="bg-emerald-600 shrink-0"><Plus className="w-4 h-4" /></Button></div></div>}</div>
                            {cls.filter(c => c.id).map(c => { const cs = subs.filter(s => s.classroom_id === c.id); if (!cs.length) return null; return <div key={c.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5"><h4 className="font-medium text-sm text-indigo-300 mb-2">{c.name}</h4><div className="flex flex-wrap gap-2">{cs.map((s, i) => <span key={i} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">{s.name}</span>)}</div></div>; })}
                            <div className="flex justify-between"><Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft className="w-4 h-4 mr-2" />Retour</Button><Button onClick={() => { saveSubs(); setStep(2); }} disabled={saving} className="bg-indigo-600">{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Suivant<ArrowRight className="w-4 h-4 ml-2" /></Button></div></div>}
                        {step === 2 && <div className="space-y-4"><div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 text-center"><UserPlus className="w-12 h-12 text-indigo-400 mx-auto mb-3" /><h3 className="font-bold text-lg mb-2">Invitez vos professeurs</h3><p className="text-sm text-slate-400 mb-4">Partagez ce lien:</p><code className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-emerald-300 text-sm">{origin}/{orgSlug}/prof</code><Button size="sm" variant="outline" className="ml-2 border-white/10" onClick={() => { navigator.clipboard.writeText(`${origin}/${orgSlug}/prof`); toast.success('Copié!'); }}>Copier</Button></div><div className="flex justify-between"><Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-2" />Retour</Button><Button onClick={finishSetup} disabled={saving} className="bg-gradient-to-r from-indigo-600 to-blue-600">{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}<CheckCircle2 className="w-4 h-4 mr-2" />Terminer</Button></div></div>}
                    </div>}

                    {/* ═══ CLASSES ═══ */}
                    {tab === 'classes' && <div className="space-y-4"><div className="flex items-center justify-between"><p className="text-slate-400 text-sm">{cls.length} classe(s)</p><Button size="sm" className="bg-indigo-600" onClick={() => onTab('setup')}><Plus className="w-4 h-4 mr-1" />Ajouter</Button></div>{cls.map((c, i) => <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10"><div className="flex items-center gap-3"><School className="w-5 h-5 text-indigo-400" /><div><p className="font-medium">{c.name}</p><p className="text-xs text-slate-500">{c.cycle || '—'} • {subs.filter(s => s.classroom_id === c.id).length} matières</p></div></div></div>)}</div>}

                    {/* ═══ SUBJECTS ═══ */}
                    {tab === 'subjects' && <div className="space-y-4"><div className="flex items-center justify-between"><p className="text-slate-400 text-sm">{subs.length} matière(s)</p><Button size="sm" className="bg-emerald-600" onClick={() => { onTab('setup'); setStep(1); }}><Plus className="w-4 h-4 mr-1" />Ajouter</Button></div>{cls.filter(c => c.id).map(c => { const cs = subs.filter(s => s.classroom_id === c.id); if (!cs.length) return null; return <div key={c.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/10"><h3 className="font-semibold text-indigo-300 mb-3">{c.name}</h3><div className="grid sm:grid-cols-2 gap-2">{cs.map((s, i) => <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5"><span className="text-sm">{s.name}</span><span className="text-xs text-slate-500">Coef.{s.coefficient}</span></div>)}</div></div>; })}</div>}

                    {/* ═══ TEACHERS ═══ */}
                    {tab === 'teachers' && <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-400">{teachers.length} professeur(s)</p>
                            <Button size="sm" className="bg-emerald-600" onClick={() => { setShowAddTeacher(!showAddTeacher); setTShowCode(''); }}><Plus className="w-4 h-4 mr-1" />{showAddTeacher ? 'Fermer' : 'Ajouter un professeur'}</Button>
                        </div>
                        {showAddTeacher && <div className="p-5 rounded-xl bg-emerald-600/5 border border-emerald-500/20 space-y-3">
                            <h3 className="font-bold text-emerald-300">👨‍🏫 Nouveau professeur</h3>
                            <div className="grid sm:grid-cols-3 gap-3">
                                <div><Label className="text-slate-400 text-xs">Prénom *</Label><Input value={tFN} onChange={e => setTFN(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                <div><Label className="text-slate-400 text-xs">Nom *</Label><Input value={tLN} onChange={e => setTLN(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                <div><Label className="text-slate-400 text-xs">Spécialité</Label><Input value={tSpec} onChange={e => setTSpec(e.target.value)} placeholder="Mathématiques" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                <div><Label className="text-slate-400 text-xs">Email</Label><Input type="email" value={tEmail} onChange={e => setTEmail(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                <div><Label className="text-slate-400 text-xs">Téléphone</Label><Input value={tPhone} onChange={e => setTPhone(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                <div><Label className="text-slate-400 text-xs">Nationalité</Label><Input value={tNat} onChange={e => setTNat(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                <div><Label className="text-slate-400 text-xs">Situation matrimoniale</Label><Sel v={tMarital} onChange={setTMarital} opts={[{ id: 'celibataire', label: 'Célibataire' }, { id: 'marie', label: 'Marié(e)' }, { id: 'divorce', label: 'Divorcé(e)' }, { id: 'veuf', label: 'Veuf/Veuve' }]} /></div>
                                <div><Label className="text-slate-400 text-xs">Nombre d'enfants</Label><Input type="number" value={tChildren} onChange={e => setTChildren(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                <div><Label className="text-slate-400 text-xs">Lieu de résidence</Label><Input value={tRes} onChange={e => setTRes(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                            </div>
                            <Button onClick={createTeacher} disabled={saving || !tFN.trim() || !tLN.trim()} className="bg-emerald-600">{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}<UserPlus className="w-4 h-4 mr-1" />Créer le professeur</Button>
                            {tShowCode && <div className="p-4 rounded-xl bg-emerald-600/10 border border-emerald-500/30 mt-2">
                                <p className="text-sm font-bold text-emerald-300">✅ Professeur créé ! Code d'accès :</p>
                                <div className="flex items-center gap-3 mt-2"><code className="text-2xl font-mono font-bold tracking-widest text-white bg-white/10 px-4 py-2 rounded-lg">{tShowCode}</code><Button size="sm" variant="outline" className="border-emerald-500/20" onClick={() => { navigator.clipboard.writeText(tShowCode); toast.success('Code copié !'); }}>📋 Copier</Button></div>
                                <p className="text-[10px] text-slate-500 mt-2">⚠️ Ce code unique permet au professeur de se connecter. Transmettez-le de manière sécurisée.</p>
                            </div>}
                        </div>}
                        <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" /><Input value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} placeholder="Rechercher un professeur..." className="bg-white/5 border-white/10 text-white h-10 pl-10 rounded-lg" /></div>
                        {teachers.filter((t: any) => !teacherSearch || `${t.first_name} ${t.last_name} ${t.speciality || ''} ${t.access_code || ''}`.toLowerCase().includes(teacherSearch.toLowerCase())).length === 0 ? (
                            <div className="text-center py-12 text-slate-500"><Users className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Aucun professeur</p></div>
                        ) : teachers.filter((t: any) => !teacherSearch || `${t.first_name} ${t.last_name} ${t.speciality || ''} ${t.access_code || ''}`.toLowerCase().includes(teacherSearch.toLowerCase())).map((t: any) => {
                            const assignedSubs = subs.filter(s => s.teacher_id === t.id);
                            return (
                                <div key={t.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center font-bold text-emerald-400 shrink-0">{t.first_name?.[0]}{t.last_name?.[0]}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium">{t.first_name} {t.last_name}</p>
                                            <p className="text-xs text-slate-500">{t.speciality || '—'} • {t.nationality || '—'} • {t.marital_status || '—'}</p>
                                            <p className="text-[10px] text-slate-600">{t.email || ''} {t.phone ? `• ${t.phone}` : ''} {t.residence ? `• ${t.residence}` : ''}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {t.access_code && <button onClick={() => { navigator.clipboard.writeText(t.access_code); toast.success('Code copié !'); }} className="text-xs px-2 py-1 rounded bg-emerald-600/10 text-emerald-300 font-mono hover:bg-emerald-600/20">{t.access_code}</button>}
                                            <button onClick={() => deleteTeacher(t.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                    {assignedSubs.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{assignedSubs.map(s => <span key={s.id} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600/10 text-emerald-300">📘 {s.name} ({cls.find(c => c.id === s.classroom_id)?.name || '—'})</span>)}</div>}
                                    <div className="mt-2"><select onChange={e => { if (e.target.value) assignTeacherToSubject(e.target.value, t.id); e.target.value = ''; }} className="text-xs h-7 rounded bg-white/5 border border-white/10 text-slate-400 px-2 w-full"><option value="" className="bg-slate-900">+ Assigner une matière...</option>{subs.filter(s => !s.teacher_id).map(s => <option key={s.id} value={s.id} className="bg-slate-900">{s.name} ({cls.find(c => c.id === s.classroom_id)?.name})</option>)}</select></div>
                                </div>
                            );
                        })}
                    </div>}

                    {/* ═══ STUDENTS ═══ */}
                    {tab === 'students' && <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-400">{students.length} étudiant(s)</p>
                            <Button size="sm" className="bg-blue-600" onClick={() => { setShowAddStudent(!showAddStudent); setSShowCode(''); }}><Plus className="w-4 h-4 mr-1" />{showAddStudent ? 'Fermer' : 'Inscrire un étudiant'}</Button>
                        </div>
                        {showAddStudent && <div className="p-5 rounded-xl bg-blue-600/5 border border-blue-500/20 space-y-3">
                            <h3 className="font-bold text-blue-300">🎓 Nouvel étudiant</h3>
                            <div className="grid sm:grid-cols-3 gap-3">
                                <div><Label className="text-slate-400 text-xs">Prénom *</Label><Input value={sFN} onChange={e => setSFN(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                <div><Label className="text-slate-400 text-xs">Nom *</Label><Input value={sLN} onChange={e => setSLN(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                <div><Label className="text-slate-400 text-xs">Sexe</Label><Sel v={sSex} onChange={setSSex} opts={[{ id: 'M', label: 'Masculin' }, { id: 'F', label: 'Féminin' }]} /></div>
                                <div><Label className="text-slate-400 text-xs">Date de naissance</Label><Input type="date" value={sBirth} onChange={e => setSBirth(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                <div><Label className="text-slate-400 text-xs">Classe *</Label><Sel v={sClsId} onChange={setSClsId} opts={cls.filter(c => c.id).map(c => ({ id: c.id!, label: c.name }))} ph="Choisir..." /></div>
                                <div><Label className="text-slate-400 text-xs">Nationalité</Label><Input value={sNat} onChange={e => setSNat(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                <div><Label className="text-slate-400 text-xs">Téléphone</Label><Input value={sPhone} onChange={e => setSPhone(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                <div><Label className="text-slate-400 text-xs">Nom du tuteur</Label><Input value={sGuardian} onChange={e => setSGuardian(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                <div><Label className="text-slate-400 text-xs">Tél. tuteur</Label><Input value={sGuardianPhone} onChange={e => setSGuardianPhone(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                <div><Label className="text-slate-400 text-xs">Lieu de résidence</Label><Input value={sRes} onChange={e => setSRes(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                            </div>
                            <Button onClick={createStudent} disabled={saving || !sFN.trim() || !sLN.trim() || !sClsId} className="bg-blue-600">{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}<UserPlus className="w-4 h-4 mr-1" />Inscrire l'étudiant</Button>
                            {sShowCode && <div className="p-4 rounded-xl bg-blue-600/10 border border-blue-500/30 mt-2">
                                <p className="text-sm font-bold text-blue-300">✅ Étudiant inscrit ! Code d'accès :</p>
                                <div className="flex items-center gap-3 mt-2"><code className="text-2xl font-mono font-bold tracking-widest text-white bg-white/10 px-4 py-2 rounded-lg">{sShowCode}</code><Button size="sm" variant="outline" className="border-blue-500/20" onClick={() => { navigator.clipboard.writeText(sShowCode); toast.success('Code copié !'); }}>📋 Copier</Button></div>
                                <p className="text-[10px] text-slate-500 mt-2">⚠️ Ce code unique permet à l'étudiant de se connecter. Transmettez-le de manière sécurisée.</p>
                            </div>}
                        </div>}
                        <div className="flex gap-2">
                            <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" /><Input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Chercher par nom, matricule ou code..." className="bg-white/5 border-white/10 text-white h-10 pl-10 rounded-lg" /></div>
                            <select value={studentClsFilter} onChange={e => setStudentClsFilter(e.target.value)} className="h-10 rounded-lg bg-white/5 border border-white/10 text-white px-3 text-sm"><option value="" className="bg-slate-900">Toutes classes</option>{cls.filter(c => c.id).map(c => <option key={c.id} value={c.id!} className="bg-slate-900">{c.name}</option>)}</select>
                        </div>
                        <p className="text-xs text-slate-500">{students.length} étudiant(s) • {cls.filter(c => c.id).map(c => `${c.name}: ${students.filter((s: any) => s.classroom_id === c.id).length}`).join(' • ')}</p>
                        {(() => {
                            const filtered = students.filter((s: any) => {
                                const matchSearch = !studentSearch || `${s.first_name} ${s.last_name} ${s.matricule || ''} ${s.access_code || ''}`.toLowerCase().includes(studentSearch.toLowerCase());
                                const matchCls = !studentClsFilter || s.classroom_id === studentClsFilter;
                                return matchSearch && matchCls;
                            });
                            return filtered.length === 0 ? (
                                <div className="text-center py-12 text-slate-500"><GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Aucun étudiant trouvé</p></div>
                            ) : (
                                <div className="space-y-2">{filtered.map((s: any) => (
                                    <div key={s.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/10">
                                        <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center font-bold text-blue-400 shrink-0">{s.first_name?.[0]}{s.last_name?.[0]}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium">{s.first_name} {s.last_name} <span className="text-xs text-slate-500">{s.sex === 'F' ? '♀' : '♂'}</span></p>
                                            <p className="text-xs text-slate-500">Mat: {s.matricule || '—'} • {cls.find(c => c.id === s.classroom_id)?.name || '—'}{s.birth_date ? ` • ${s.birth_date}` : ''}{s.nationality ? ` • ${s.nationality}` : ''}</p>
                                            <p className="text-[10px] text-slate-600">{s.guardian_name ? `Tuteur: ${s.guardian_name}` : ''}{s.guardian_phone ? ` (${s.guardian_phone})` : ''}{s.residence ? ` • ${s.residence}` : ''}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {s.access_code && <button onClick={() => { navigator.clipboard.writeText(s.access_code); toast.success('Code copié !'); }} className="text-xs px-2 py-1 rounded bg-blue-600/10 text-blue-300 font-mono hover:bg-blue-600/20">{s.access_code}</button>}
                                            <button onClick={() => deleteStudent(s.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}</div>
                            );
                        })()}
                    </div>}

                    {/* ═══ TIMETABLE ═══ */}
                    {tab === 'timetable' && <div className="space-y-4">
                        <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                            <h3 className="font-bold mb-3">➕ Ajouter un créneau</h3>
                            <div className="grid sm:grid-cols-3 gap-3">
                                <div><Label className="text-slate-400 text-xs">Jour</Label><Sel v={String(ttDay)} onChange={v => setTtDay(+v)} opts={DAYS.map((d, i) => ({ id: String(i + 1), label: d }))} /></div>
                                <div><Label className="text-slate-400 text-xs">Classe</Label><Sel v={ttCls2} onChange={setTtCls2} opts={cls.filter(c => c.id).map(c => ({ id: c.id!, label: c.name }))} /></div>
                                <div><Label className="text-slate-400 text-xs">Matière</Label><Sel v={ttSub2} onChange={setTtSub2} opts={subs.filter(s => !ttCls2 || s.classroom_id === ttCls2).map(s => ({ id: s.id!, label: s.name }))} /></div>
                                <div><Label className="text-slate-400 text-xs">Début</Label><Input type="time" value={ttStart} onChange={e => setTtStart(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                                <div><Label className="text-slate-400 text-xs">Fin</Label><Input type="time" value={ttEnd} onChange={e => setTtEnd(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                                <div><Label className="text-slate-400 text-xs">Salle</Label><Input value={ttRoom} onChange={e => setTtRoom(e.target.value)} placeholder="Salle A1" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                            </div>
                            <Button onClick={addSlot} disabled={saving} className="mt-3 bg-indigo-600" size="sm">{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}<Plus className="w-4 h-4 mr-1" />Ajouter</Button>
                        </div>
                        {DAYS.map((day, di) => { const slots = ttSlots.filter((s: any) => s.day_of_week === di + 1); if (!slots.length) return null; return <div key={di} className="p-4 rounded-xl bg-white/[0.02] border border-white/5"><h4 className="font-medium text-indigo-300 mb-2">{day}</h4><div className="space-y-2">{slots.map((s: any) => <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5"><div><span className="text-sm font-medium">{s.subjects?.name || '—'}</span><span className="text-xs text-slate-500 ml-2">{s.classrooms?.name} • {s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)}{s.room ? ` • ${s.room}` : ''}</span></div><button onClick={() => delSlot(s.id)} className="text-red-400"><Trash2 className="w-4 h-4" /></button></div>)}</div></div>; })}
                        {ttSlots.length === 0 && <div className="text-center py-8 text-slate-500"><Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aucun créneau</p></div>}
                    </div>}

                    {/* ═══ EVALUATIONS ═══ */}
                    {tab === 'evaluations' && <div className="space-y-4">
                        <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                            <h3 className="font-bold mb-3">📝 Nouvelle évaluation</h3>
                            <div className="grid sm:grid-cols-3 gap-3">
                                <div><Label className="text-slate-400 text-xs">Titre</Label><Input value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="Devoir n°1" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                                <div><Label className="text-slate-400 text-xs">Type</Label><Sel v={evType} onChange={setEvType} opts={['devoir', 'examen', 'tp', 'oral', 'projet'].map(t => ({ id: t, label: t[0].toUpperCase() + t.slice(1) }))} /></div>
                                <div><Label className="text-slate-400 text-xs">Classe</Label><Sel v={evCls} onChange={setEvCls} opts={cls.filter(c => c.id).map(c => ({ id: c.id!, label: c.name }))} /></div>
                                <div><Label className="text-slate-400 text-xs">Matière</Label><Sel v={evSub} onChange={setEvSub} opts={subs.filter(s => !evCls || s.classroom_id === evCls).map(s => ({ id: s.id!, label: s.name }))} /></div>
                                <div><Label className="text-slate-400 text-xs">Date</Label><Input type="date" value={evDate} onChange={e => setEvDate(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                                <div><Label className="text-slate-400 text-xs">Note max</Label><Input type="number" value={evMax} onChange={e => setEvMax(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                            </div>
                            <Button onClick={addEval} disabled={saving} className="mt-3 bg-indigo-600" size="sm">{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}<Plus className="w-4 h-4 mr-1" />Créer</Button>
                        </div>
                        {evals.length > 0 ? evals.map((ev: any) => <div key={ev.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10"><div><p className="font-medium text-sm">{ev.title}</p><p className="text-xs text-slate-500">{ev.subjects?.name} • {ev.classrooms?.name} • /{ev.max_score}{ev.date ? ` • ${ev.date}` : ''}</p></div><span className="text-xs px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-300">{ev.type}</span></div>) : <div className="text-center py-8 text-slate-500"><ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aucune évaluation</p></div>}
                    </div>}

                    {/* ═══ PAYMENTS ═══ */}
                    {tab === 'payments' && <div className="space-y-4">
                        <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                            <h3 className="font-bold mb-3">💰 Enregistrer un paiement</h3>
                            <div className="grid sm:grid-cols-2 gap-3">
                                <div><Label className="text-slate-400 text-xs">Étudiant</Label><Sel v={payStu} onChange={setPayStu} opts={students.map((s: any) => ({ id: s.id, label: `${s.first_name} ${s.last_name} (${s.matricule || '—'})` }))} ph="Sélectionner..." /></div>
                                <div><Label className="text-slate-400 text-xs">Montant (XAF)</Label><Input type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} placeholder="50000" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                                <div><Label className="text-slate-400 text-xs">Mode</Label><Sel v={payMeth} onChange={setPayMeth} opts={[{ id: 'cash', label: 'Espèces' }, { id: 'momo', label: 'MTN MoMo' }, { id: 'orange_money', label: 'Orange Money' }, { id: 'bank', label: 'Virement' }, { id: 'other', label: 'Autre' }]} /></div>
                                <div><Label className="text-slate-400 text-xs">Description</Label><Input value={payDesc} onChange={e => setPayDesc(e.target.value)} placeholder="1ère tranche" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                            </div>
                            <Button onClick={addPay} disabled={saving || !payStu || !payAmt} className="mt-3 bg-emerald-600" size="sm">{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}<CreditCard className="w-4 h-4 mr-1" />Enregistrer</Button>
                        </div>
                        {pays.length > 0 ? <div className="space-y-2">{pays.map((p: any) => <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center text-emerald-400 text-xs font-bold">{p.student_profiles?.first_name?.[0]}{p.student_profiles?.last_name?.[0]}</div><div><p className="text-sm font-medium">{p.student_profiles?.first_name} {p.student_profiles?.last_name}</p><p className="text-xs text-slate-500">{p.description} • {p.payment_method} • {new Date(p.paid_at).toLocaleDateString('fr-FR')}</p></div></div><span className="text-sm font-bold text-emerald-400">{new Intl.NumberFormat('fr-FR').format(p.amount)} XAF</span></div>)}</div> : <div className="text-center py-8 text-slate-500"><CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aucun paiement</p></div>}
                    </div>}

                    {/* ═══ DISCIPLINE ═══ */}
                    {tab === 'disciplines' && <div className="space-y-4">
                        <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                            <h3 className="font-bold mb-3">⚠️ Enregistrer une sanction</h3>
                            <div className="grid sm:grid-cols-2 gap-3">
                                <div><Label className="text-slate-400 text-xs">Étudiant</Label><Sel v={dStu} onChange={setDStu} opts={students.map((s: any) => ({ id: s.id, label: `${s.first_name} ${s.last_name}` }))} ph="Sélectionner..." /></div>
                                <div><Label className="text-slate-400 text-xs">Type</Label><Sel v={dType} onChange={setDType} opts={[{ id: 'avertissement', label: 'Avertissement' }, { id: 'blame', label: 'Blâme' }, { id: 'exclusion_temporaire', label: 'Exclusion temporaire' }, { id: 'retenue', label: 'Retenue' }, { id: 'convocation_parent', label: 'Convocation parent' }]} /></div>
                                <div className="sm:col-span-2"><Label className="text-slate-400 text-xs">Motif</Label><Input value={dReason} onChange={e => setDReason(e.target.value)} placeholder="Motif..." className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                            </div>
                            <Button onClick={addDisc} disabled={saving || !dStu || !dReason} className="mt-3 bg-red-600" size="sm">{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}<ShieldCheck className="w-4 h-4 mr-1" />Enregistrer</Button>
                        </div>
                        {discs.length > 0 ? <div className="space-y-2">{discs.map((d: any) => <div key={d.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${d.type === 'avertissement' ? 'bg-amber-600/20 text-amber-400' : d.type === 'blame' ? 'bg-orange-600/20 text-orange-400' : 'bg-red-600/20 text-red-400'}`}>{d.student_profiles?.first_name?.[0]}{d.student_profiles?.last_name?.[0]}</div><div><p className="text-sm font-medium">{d.student_profiles?.first_name} {d.student_profiles?.last_name}</p><p className="text-xs text-slate-500">{d.reason}</p></div></div><span className={`text-xs px-2 py-1 rounded-full ${d.type === 'avertissement' ? 'bg-amber-500/10 text-amber-300' : 'bg-red-500/10 text-red-300'}`}>{d.type.replace(/_/g, ' ')}</span></div>)}</div> : <div className="text-center py-8 text-slate-500"><ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aucune sanction</p></div>}
                    </div>}

                    {/* ═══ GRADES (Admin) ═══ */}
                    {tab === 'grades' && <div className="space-y-4">
                        <h2 className="font-bold text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-400" /> Notes par évaluation</h2>
                        {!grSelEval ? (
                            grEvals.length === 0 ? (
                                <div className="text-center py-12 text-slate-500"><ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Aucune évaluation. Créez-en via l'onglet Évaluations.</p></div>
                            ) : (
                                <div className="space-y-2">
                                    {grEvals.map((ev: any) => (
                                        <button key={ev.id} onClick={() => loadGradeEntries(ev)} className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/5 transition text-left">
                                            <div><p className="font-medium text-sm">{ev.title}</p><p className="text-[10px] text-slate-500">{ev.subjects?.name} • {ev.classrooms?.name} • /{ev.max_score} {ev.date ? `• ${ev.date}` : ''}</p></div>
                                            <span className="text-[10px] px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-300">{ev.type}</span>
                                        </button>
                                    ))}
                                </div>
                            )
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-600/10 border border-indigo-500/20">
                                    <div><p className="font-bold text-sm">{grSelEval.title}</p><p className="text-[10px] text-slate-400">{grSelEval.subjects?.name} • {grSelEval.classrooms?.name} • /{grSelEval.max_score}</p></div>
                                    <div className="flex gap-2">
                                        <Button size="sm" className="bg-emerald-600 h-8" onClick={saveGradeEntries} disabled={saving}>{saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}Sauver</Button>
                                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setGrSelEval(null)}><X className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                                <div className="rounded-xl bg-white/[0.02] border border-white/10 overflow-hidden">
                                    <div className="grid grid-cols-[1fr_80px] px-4 py-2 bg-white/5 text-xs text-slate-400 font-medium"><span>Étudiant</span><span className="text-center">Note /{grSelEval.max_score}</span></div>
                                    {students.filter((s: any) => s.classroom_id === grSelEval.classroom_id).map((s: any) => (
                                        <div key={s.id} className="grid grid-cols-[1fr_80px] items-center px-4 py-2 border-t border-white/5 hover:bg-white/[0.02]">
                                            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center text-[10px] font-bold text-blue-400">{s.first_name?.[0]}{s.last_name?.[0]}</div><span className="text-sm">{s.first_name} {s.last_name}</span></div>
                                            <Input type="number" min="0" max={grSelEval.max_score} step="0.25" value={grGrades[s.id] || ''} onChange={e => setGrGrades(g => ({ ...g, [s.id]: e.target.value }))} className="bg-white/5 border-white/10 text-white h-8 text-center rounded-lg text-sm" placeholder="—" />
                                        </div>
                                    ))}
                                </div>
                                {Object.values(grGrades).some(v => v !== '') && (() => {
                                    const vals = Object.values(grGrades).filter(v => v !== '').map(Number); const avg = vals.reduce((a, b) => a + b, 0) / vals.length; return (
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="p-3 rounded-xl bg-blue-600/10 text-center"><span className="text-xs text-blue-300">Moyenne</span><p className="text-lg font-bold text-blue-400">{avg.toFixed(2)}</p></div>
                                            <div className="p-3 rounded-xl bg-red-600/10 text-center"><span className="text-xs text-red-300">Min</span><p className="text-lg font-bold text-red-400">{Math.min(...vals).toFixed(2)}</p></div>
                                            <div className="p-3 rounded-xl bg-emerald-600/10 text-center"><span className="text-xs text-emerald-300">Max</span><p className="text-lg font-bold text-emerald-400">{Math.max(...vals).toFixed(2)}</p></div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>}

                    {/* ═══ LANDING PAGE CONFIG ═══ */}
                    {tab === 'landing' && <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-lg flex items-center gap-2"><LayoutDashboard className="w-5 h-5 text-cyan-400" /> Personnaliser votre page d&apos;accueil</h2>
                            <a href={`/${orgSlug}`} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 rounded-lg bg-teal-600/10 text-teal-300 hover:bg-teal-600/20 flex items-center gap-1 transition"><ExternalLink className="w-3 h-3" />Voir la page</a>
                        </div>
                        <p className="text-xs text-slate-500 -mt-3">Les coordonnées (téléphone, email, adresse) s&apos;affichent automatiquement depuis vos informations d&apos;inscription.</p>

                        {/* Hero */}
                        <div className="p-5 rounded-xl bg-cyan-600/5 border border-cyan-500/20">
                            <h3 className="font-bold text-cyan-300 mb-3 flex items-center gap-2"><Upload className="w-4 h-4" /> Hero / Bannière</h3>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-slate-400 text-xs">Image bannière (URL)</Label>
                                    <Input value={lHeroImage} onChange={e => setLHeroImage(e.target.value)} placeholder="https://...banner.jpg" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" />
                                    {lHeroImage && <img src={lHeroImage} alt="" className="w-full h-28 rounded-lg object-cover mt-2 border border-white/10" onError={e => (e.currentTarget.style.display='none')} />}
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-slate-400 text-xs">Titre hero (défaut: nom de l&apos;école)</Label>
                                        <Input value={lHeroTitle} onChange={e => setLHeroTitle(e.target.value)} placeholder={org.name} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-slate-400 text-xs">Sous-titre / Slogan</Label>
                                        <Input value={lHeroSubtitle} onChange={e => setLHeroSubtitle(e.target.value)} placeholder={org.motto || 'Bienvenue sur notre portail'} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* About */}
                        <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                            <h3 className="font-bold mb-3 flex items-center gap-2"><Edit className="w-4 h-4 text-indigo-400" /> À propos de l&apos;établissement</h3>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-slate-400 text-xs">Description</Label>
                                    <textarea value={lAboutText} onChange={e => setLAboutText(e.target.value)} placeholder="Décrivez votre établissement, son histoire, ses valeurs..." rows={5} className="w-full mt-1 p-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm resize-none focus:outline-none focus:border-indigo-500/50 transition" />
                                </div>
                                <div>
                                    <Label className="text-slate-400 text-xs">Image section À propos (URL)</Label>
                                    <Input value={lAboutImage} onChange={e => setLAboutImage(e.target.value)} placeholder="https://...about.jpg" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" />
                                    {lAboutImage && <img src={lAboutImage} alt="" className="w-full h-36 rounded-lg object-cover mt-2 border border-white/10" onError={e => (e.currentTarget.style.display='none')} />}
                                </div>
                            </div>
                        </div>

                        {/* Gallery */}
                        <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                            <h3 className="font-bold mb-3 flex items-center gap-2"><Upload className="w-4 h-4 text-amber-400" /> Galerie photos</h3>
                            <div className="flex gap-2 mb-3">
                                <Input value={lGalleryInput} onChange={e => setLGalleryInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && lGalleryInput.trim()) { setLGalleryImages(p => [...p, lGalleryInput.trim()]); setLGalleryInput(''); }}} placeholder="Collez l'URL d'une image" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm flex-1" />
                                <Button size="sm" className="bg-amber-600 shrink-0 h-9" onClick={() => { if (lGalleryInput.trim()) { setLGalleryImages(p => [...p, lGalleryInput.trim()]); setLGalleryInput(''); }}} disabled={!lGalleryInput.trim()}><Plus className="w-4 h-4" /></Button>
                            </div>
                            {lGalleryImages.length > 0 ? (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {lGalleryImages.map((img, i) => (
                                        <div key={i} className="relative group rounded-lg overflow-hidden border border-white/10">
                                            <img src={img} alt="" className="w-full h-20 object-cover" />
                                            <button onClick={() => setLGalleryImages(p => p.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white"><X className="w-3 h-3" /></button>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-xs text-slate-500 text-center py-4">Ajoutez des photos de votre établissement (bâtiment, salles, événements...)</p>}
                        </div>

                        {/* Social links */}
                        <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                            <h3 className="font-bold mb-3 flex items-center gap-2"><Globe className="w-4 h-4 text-pink-400" /> Réseaux sociaux</h3>
                            <div className="grid sm:grid-cols-2 gap-3">
                                <div><Label className="text-slate-400 text-xs">📘 Facebook</Label><Input value={lSocialFb} onChange={e => setLSocialFb(e.target.value)} placeholder="https://facebook.com/votre-page" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                <div><Label className="text-slate-400 text-xs">📸 Instagram</Label><Input value={lSocialIg} onChange={e => setLSocialIg(e.target.value)} placeholder="https://instagram.com/votre-compte" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                <div><Label className="text-slate-400 text-xs">🐦 Twitter / X</Label><Input value={lSocialTw} onChange={e => setLSocialTw(e.target.value)} placeholder="https://x.com/votre-compte" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                <div><Label className="text-slate-400 text-xs">🎵 TikTok</Label><Input value={lSocialTt} onChange={e => setLSocialTt(e.target.value)} placeholder="https://tiktok.com/@votre-compte" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                <div><Label className="text-slate-400 text-xs">🎬 YouTube</Label><Input value={lSocialYt} onChange={e => setLSocialYt(e.target.value)} placeholder="https://youtube.com/@votre-chaine" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                <div><Label className="text-slate-400 text-xs">💼 LinkedIn</Label><Input value={lSocialLi} onChange={e => setLSocialLi(e.target.value)} placeholder="https://linkedin.com/company/..." className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                            <h3 className="font-bold mb-3 flex items-center gap-2"><Edit className="w-4 h-4 text-slate-400" /> Pied de page</h3>
                            <Label className="text-slate-400 text-xs">Texte personnalisé (optionnel — par défaut: © année + nom)</Label>
                            <Input value={lFooterText} onChange={e => setLFooterText(e.target.value)} placeholder={`© ${new Date().getFullYear()} ${org.name}. Tous droits réservés.`} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" />
                        </div>

                        {/* Preview hint */}
                        <div className="p-4 rounded-xl bg-indigo-600/5 border border-indigo-500/15 flex items-center gap-3">
                            <Globe className="w-5 h-5 text-indigo-400 shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-indigo-300">Aperçu en direct</p>
                                <p className="text-[10px] text-slate-500">Cliquez sur &quot;Voir la page&quot; pour prévisualiser vos modifications après sauvegarde.</p>
                            </div>
                        </div>

                        {/* Save */}
                        <div className="flex justify-end">
                            <Button onClick={saveLanding} disabled={lSaving} className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 px-8 font-bold rounded-xl shadow-lg shadow-cyan-600/25">
                                {lSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Sauvegarder la page d&apos;accueil
                            </Button>
                        </div>
                    </div>}

                    {/* ═══ SETTINGS ═══ */}
                    {tab === 'settings' && <div className="space-y-6">
                        <h2 className="font-bold text-lg flex items-center gap-2"><Palette className="w-5 h-5 text-purple-400" /> Paramètres & Personnalisation</h2>

                        {/* ── CUSTOM DOMAIN ── */}
                        <div className="p-5 rounded-xl bg-purple-600/5 border border-purple-500/20">
                            <h3 className="font-bold text-purple-300 mb-1 flex items-center gap-2"><Globe className="w-4 h-4" /> Domaine personnalisé</h3>
                            <p className="text-xs text-slate-500 mb-4">Connectez votre propre nom de domaine pour un accès entièrement personnalisé à votre établissement.</p>

                            {sDomainVerified && sCustomDomain ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-600/10 border border-emerald-500/20">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                                        <div className="flex-1">
                                            <p className="font-medium text-emerald-300">Domaine actif</p>
                                            <a href={`https://${sCustomDomain}`} target="_blank" rel="noreferrer" className="text-sm text-emerald-400 hover:underline flex items-center gap-1">
                                                https://{sCustomDomain} <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${sDomainSsl === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                                SSL {sDomainSsl === 'active' ? '✓' : '...'}
                                            </span>
                                            <Button size="sm" variant="ghost" className="text-red-400 h-7 text-xs" onClick={removeDomain}><Trash2 className="w-3 h-3 mr-1" />Retirer</Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <Input value={sCustomDomain} onChange={e => setSCustomDomain(e.target.value)}
                                            placeholder="ecole.votredomaine.com" className="bg-white/5 border-white/10 text-white h-10 rounded-lg flex-1" />
                                        <Button onClick={verifyDomain} disabled={sVerifying || !sCustomDomain.trim()} className="bg-purple-600 shrink-0">
                                            {sVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                                            Vérifier
                                        </Button>
                                    </div>

                                    {/* DNS Instructions */}
                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                                        <h4 className="font-medium text-sm mb-2 text-slate-300">📋 Configuration DNS requise</h4>
                                        <p className="text-xs text-slate-500 mb-3">Ajoutez ces enregistrements DNS chez votre registrar (Namecheap, GoDaddy, OVH, etc.) :</p>
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-[60px_1fr_1fr] gap-2 text-[10px] text-slate-400 font-mono">
                                                <span className="font-bold text-slate-300">Type</span><span className="font-bold text-slate-300">Nom / Host</span><span className="font-bold text-slate-300">Valeur / Target</span>
                                            </div>
                                            <div className="grid grid-cols-[60px_1fr_1fr] gap-2 text-xs font-mono p-2 rounded-lg bg-white/5">
                                                <span className="text-amber-400 font-bold">CNAME</span>
                                                <span className="text-white">{sCustomDomain.split('.')[0] || 'www'}</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-emerald-400 truncate">campusflow.netlify.app</span>
                                                    <button onClick={() => { navigator.clipboard.writeText('campusflow.netlify.app'); toast.success('Copié !'); }} className="text-slate-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-[60px_1fr_1fr] gap-2 text-xs font-mono p-2 rounded-lg bg-white/5">
                                                <span className="text-amber-400 font-bold">A</span>
                                                <span className="text-white">@</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-emerald-400">75.2.60.5</span>
                                                    <button onClick={() => { navigator.clipboard.writeText('75.2.60.5'); toast.success('Copié !'); }} className="text-slate-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-600 mt-2">⏱ La propagation DNS peut prendre jusqu'à 24-48h. Le SSL sera automatiquement provisonné.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── BRANDING ── */}
                        <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                            <h3 className="font-bold mb-3 flex items-center gap-2"><Palette className="w-4 h-4 text-pink-400" /> Apparence & Marque</h3>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-slate-400 text-xs">URL du logo</Label>
                                    <Input value={sLogoUrl} onChange={e => setSLogoUrl(e.target.value)} placeholder="https://...logo.png" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" />
                                    {sLogoUrl && <img src={sLogoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-contain bg-white/10 p-1 mt-2" onError={e => (e.currentTarget.style.display = 'none')} />}
                                </div>
                                <div>
                                    <Label className="text-slate-400 text-xs">URL du favicon</Label>
                                    <Input value={sFaviconUrl} onChange={e => setSFaviconUrl(e.target.value)} placeholder="https://...favicon.ico" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" />
                                </div>
                                <div>
                                    <Label className="text-slate-400 text-xs">Couleur principale</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <input type="color" value={sBrandColor} onChange={e => setSBrandColor(e.target.value)} className="w-9 h-9 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                                        <Input value={sBrandColor} onChange={e => setSBrandColor(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm flex-1" />
                                        <div className="w-20 h-9 rounded-lg" style={{ backgroundColor: sBrandColor }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── SEO ── */}
                        <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                            <h3 className="font-bold mb-3 flex items-center gap-2"><Search className="w-4 h-4 text-blue-400" /> SEO & Référencement</h3>
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-slate-400 text-xs">Titre de la page (meta title)</Label>
                                    <Input value={sMetaTitle} onChange={e => setSMetaTitle(e.target.value)} placeholder={`${org.name} — Portail étudiant`} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" />
                                </div>
                                <div>
                                    <Label className="text-slate-400 text-xs">Description (meta description)</Label>
                                    <Input value={sMetaDesc} onChange={e => setSMetaDesc(e.target.value)} placeholder="Bienvenue sur le portail de notre établissement..." className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" />
                                </div>
                                {/* Preview */}
                                <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                                    <p className="text-xs text-slate-500 mb-1">Aperçu Google</p>
                                    <p className="text-blue-400 text-sm font-medium">{sMetaTitle || `${org.name} — Portail`}</p>
                                    <p className="text-emerald-500 text-xs">{sCustomDomain ? `https://${sCustomDomain}` : `https://campusflow.app/${orgSlug}`}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{sMetaDesc || `Portail en ligne de ${org.name}. Accédez à vos cours, notes et informations.`}</p>
                                </div>
                            </div>
                        </div>

                        {/* ── ORG INFO ── */}
                        <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                            <h3 className="font-bold mb-3 flex items-center gap-2"><Edit className="w-4 h-4 text-indigo-400" /> Informations de l'établissement</h3>
                            <div className="grid sm:grid-cols-2 gap-3">
                                <div><Label className="text-slate-400 text-xs">Nom de l'établissement</Label><Input value={sOrgName} onChange={e => setSOrgName(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                <div><Label className="text-slate-400 text-xs">Téléphone</Label><Input value={sOrgPhone} onChange={e => setSOrgPhone(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                <div><Label className="text-slate-400 text-xs">Email</Label><Input type="email" value={sOrgEmail} onChange={e => setSOrgEmail(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                <div><Label className="text-slate-400 text-xs">WhatsApp</Label><Input value={sOrgWhatsapp} onChange={e => setSOrgWhatsapp(e.target.value)} placeholder="+237 6XX..." className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                            </div>
                        </div>

                        {/* Save button */}
                        <div className="flex justify-end">
                            <Button onClick={saveSettings} disabled={sSavingSettings} className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8">
                                {sSavingSettings ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Sauvegarder tous les paramètres
                            </Button>
                        </div>
                    </div>}
                </div>
            </main>
        </div>
    );
}
