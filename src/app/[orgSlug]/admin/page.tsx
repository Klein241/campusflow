'use client';

import { useEffect, useState, useRef, Component, type ReactNode, type ErrorInfo } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { GraduationCap, Plus, Trash2, ArrowRight, ArrowLeft, BookOpen, Users, Settings, Calendar, CreditCard, Home, School, CheckCircle2, Loader2, Link2, Bell, ShieldCheck, UserPlus, ClipboardList, Globe, BookMarked, ShoppingBag, MessageSquare, BarChart3, Search, Edit, Save, X, Download, Filter, Palette, ExternalLink, Copy, RefreshCw, Upload, LayoutDashboard, Printer, Pencil, ImagePlus, Building2, FileText, Receipt, PhoneCall, ClipboardCheck } from 'lucide-react';
import { ExamRoomView } from '@/components/campus/exam-room/exam-room-view';
import { BULLETIN_TEMPLATES, generateBulletinPDF, type BulletinData } from '@/lib/bulletin-pdf';
import { RECEIPT_TEMPLATES, generateReceiptPDF, generateReceiptNumber, type ReceiptData } from '@/lib/receipt-pdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/compress';
import { uploadToR2 } from '@/lib/r2';
import { toast } from 'sonner';
import { ChatDMView } from '@/components/campus/chat-dm-view';
import { GroupesView } from '@/components/campus/groupes-view';
import { ActusView } from '@/components/campus/actus-view';
import { calculateSkyPoints } from '@/components/campus/cursus/cursus-exercise-modal';
import { RichContentRenderer } from '@/components/campus/cursus/rich-content-renderer';
import { queueGradeNotification, queuePaymentReceipt, queueDisciplineAlert, enqueueWhatsAppMessage } from '@/lib/whatsapp-queue';
import { cn } from '@/lib/utils';

// ═══ ERROR BOUNDARY (catches React render errors) ═══
class AdminErrorBoundary extends Component<{ children: ReactNode; orgSlug: string }, { hasError: boolean; error: Error | null }> {
    constructor(props: { children: ReactNode; orgSlug: string }) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }
    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[AdminPage] Render error:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-white px-4">
                    <div className="text-center max-w-md">
                        <div className="w-16 h-16 rounded-2xl bg-red-600/20 flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">⚠️</span>
                        </div>
                        <h1 className="text-2xl font-black mb-2">Erreur de chargement</h1>
                        <p className="text-slate-400 text-sm mb-4">Une erreur est survenue lors du chargement du backoffice.</p>
                        <p className="text-xs text-red-400/70 mb-6 font-mono bg-white/5 p-3 rounded-lg break-all">{this.state.error?.message || 'Erreur inconnue'}</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-500 transition">Recharger la page</button>
                            <button onClick={() => window.location.href = `/${this.props.orgSlug}/login`} className="px-6 py-2.5 bg-white/10 rounded-xl text-sm font-medium hover:bg-white/15 transition">Se reconnecter</button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// ═══ REUSABLE SELECT COMPONENT (defined outside to avoid React 19 hydration issues) ═══
const Sel = ({ v, onChange, opts, ph = '—' }: { v: string, onChange: (v: string) => void, opts: { id: string, label: string }[], ph?: string }) => (
    <select value={v} onChange={e => onChange(e.target.value)} className="w-full h-9 rounded-lg bg-white/5 border border-white/10 text-white px-3 text-sm">
        <option value="" className="bg-slate-900">{ph}</option>
        {opts.map(o => <option key={o.id} value={o.id} className="bg-slate-900">{o.label}</option>)}
    </select>
);

type Tab = 'general' | 'landing' | 'setup' | 'classes' | 'rooms' | 'subjects' | 'teachers' | 'students' | 'timetable' | 'evaluations' | 'grades' | 'payments' | 'disciplines' | 'modeles' | 'cursus' | 'settings' | 'chat' | 'stories' | 'actus' | 'groupes' | 'whatsapp' | 'exam_room';
interface Cls { id?: string; name: string; cycle: string; filiere_id: string | null; level: number; capacity: number; }
interface Sub { id?: string; name: string; code: string; coefficient: number; classroom_id: string; teacher_id: string | null; }
interface Room { id?: string; name: string; }

const SIDES = [
    { id: 'general' as Tab, icon: Home, label: 'Général' }, { id: 'landing' as Tab, icon: LayoutDashboard, label: 'Page d\'accueil' }, { id: 'setup' as Tab, icon: Settings, label: 'Configuration' },
    { id: 'classes' as Tab, icon: School, label: 'Classes' }, { id: 'rooms' as Tab, icon: Building2, label: 'Salles' }, { id: 'subjects' as Tab, icon: BookOpen, label: 'Matières' },
    { id: 'teachers' as Tab, icon: Users, label: 'Professeurs' }, { id: 'students' as Tab, icon: GraduationCap, label: 'Étudiants' },
    { id: 'timetable' as Tab, icon: Calendar, label: 'Emploi du temps' }, { id: 'evaluations' as Tab, icon: ClipboardList, label: 'Évaluations' },
    { id: 'grades' as Tab, icon: BarChart3, label: 'Notes' },
    { id: 'payments' as Tab, icon: CreditCard, label: 'Paiements' }, { id: 'disciplines' as Tab, icon: ShieldCheck, label: 'Discipline' },
    { id: 'whatsapp' as Tab, icon: PhoneCall, label: '📱 File WhatsApp' },
    { id: 'modeles' as Tab, icon: FileText, label: 'Modèles PDF' },
    { id: 'cursus' as Tab, icon: BookMarked, label: 'Cursus' },
    { id: 'chat' as Tab, icon: MessageSquare, label: 'Chat DM' },
    { id: 'groupes' as Tab, icon: Users, label: 'Groupes' },
    { id: 'actus' as Tab, icon: Bell, label: 'Actus' },
    { id: 'exam_room' as Tab, icon: ClipboardCheck, label: '🏛️ Salle d\'Évaluation' },
    { id: 'settings' as Tab, icon: Palette, label: 'Paramètres' },
];
const COLLEGE = ['6ème', '5ème', '4ème', '3ème'], LYCEE = ['Seconde', 'Première', 'Terminale'], SECS = ['A', 'B', 'C'];
const DEFS: Record<string, string[]> = { college: ['Mathématiques', 'Français', 'Anglais', 'SVT', 'Physique-Chimie', 'Histoire-Géo', 'Informatique', 'EPS'], lycee: ['Mathématiques', 'Français', 'Anglais', 'Physique', 'Chimie', 'SVT', 'Philosophie', 'Histoire-Géo', 'Informatique', 'EPS'], universite: ['Module 1', 'Module 2', 'Module 3', 'Projet tutoré', 'Stage'], centre_formation: ['Cours théorique', 'Travaux pratiques', 'Stage professionnel', 'Projet fin de formation'], institut: ['Cours fondamental', 'Spécialisation', 'Travaux pratiques', 'Stage'] };
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

// Wrapper with error boundary
export default function AdminPage() {
    const orgSlug = useOrgSlug();
    return (
        <AdminErrorBoundary orgSlug={orgSlug}>
            <AdminPageContent />
        </AdminErrorBoundary>
    );
}

function AdminPageContent() {
    const orgSlug = useOrgSlug();
    const router = useRouter();
    const [org, setOrg] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [session, setSession] = useState<any>(null);
    const [tab, setTab] = useState<Tab>('general');
    const [step, setStep] = useState(0);
    const [cls, setCls] = useState<Cls[]>([]);
    const [subs, setSubs] = useState<Sub[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [newName, setNewName] = useState(''); const [newSub, setNewSub] = useState(''); const [selCls, setSelCls] = useState('');
    // Rooms state
    const [rooms, setRooms] = useState<Room[]>([]); const [directNewRoom, setDirectNewRoom] = useState(''); const [editingRoomId, setEditingRoomId] = useState<string | null>(null); const [editRoomName, setEditRoomName] = useState('');
    // Teacher creation form
    const [tFN, setTFN] = useState(''); const [tLN, setTLN] = useState(''); const [tSpec, setTSpec] = useState(''); const [tEmail, setTEmail] = useState(''); const [tPhone, setTPhone] = useState('');
    const [tNat, setTNat] = useState('Camerounaise'); const [tMarital, setTMarital] = useState('celibataire'); const [tChildren, setTChildren] = useState('0'); const [tRes, setTRes] = useState('');
    const [tShowCode, setTShowCode] = useState('');
    // Student creation form
    const [sFN, setSFN] = useState(''); const [sLN, setSLN] = useState(''); const [sSex, setSSex] = useState('M'); const [sBirth, setSBirth] = useState(''); const [sClsId, setSClsId] = useState('');
    const [sPhone, setSPhone] = useState(''); const [sGuardian, setSGuardian] = useState(''); const [sGuardianPhone, setSGuardianPhone] = useState(''); const [sNat, setSNat] = useState('Camerounaise'); const [sRes, setSRes] = useState('');
    const [sShowCode, setSShowCode] = useState(''); const [showAddTeacher, setShowAddTeacher] = useState(false); const [showAddStudent, setShowAddStudent] = useState(false);
    const [sidebar, setSidebar] = useState(false);
    // Edit states for classes/subjects inline
    const [editingClsId, setEditingClsId] = useState<string | null>(null);
    const [editClsName, setEditClsName] = useState('');
    const [editingSubId, setEditingSubId] = useState<string | null>(null);
    const [editSubName, setEditSubName] = useState('');
    const [editSubCoef, setEditSubCoef] = useState('1');
    // Direct add in tabs
    const [directNewCls, setDirectNewCls] = useState('');
    const [directNewSub, setDirectNewSub] = useState('');
    const [directSubCls, setDirectSubCls] = useState('');
    // Image upload refs
    const heroImgRef = useRef<HTMLInputElement>(null);
    const aboutImgRef = useRef<HTMLInputElement>(null);
    const galleryImgRef = useRef<HTMLInputElement>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
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
    // Template selection state
    const [selBulletinTemplate, setSelBulletinTemplate] = useState(1);
    const [selReceiptTemplate, setSelReceiptTemplate] = useState(1);
    const [currentTerm, setCurrentTerm] = useState('Trimestre 1');
    const [savingTemplates, setSavingTemplates] = useState(false);
    const [sCustomDomain, setSCustomDomain] = useState(''); const [sDomainVerified, setSDomainVerified] = useState(false);
    const [sDomainSsl, setSDomainSsl] = useState('pending'); const [sBrandColor, setSBrandColor] = useState('#4f46e5');
    const [sLogoUrl, setSLogoUrl] = useState(''); const [sFaviconUrl, setSFaviconUrl] = useState('');
    const [sMetaTitle, setSMetaTitle] = useState(''); const [sMetaDesc, setSMetaDesc] = useState('');
    const [sOrgName, setSOrgName] = useState(''); const [sOrgPhone, setSOrgPhone] = useState('');
    const [sOrgEmail, setSOrgEmail] = useState(''); const [sOrgWhatsapp, setSOrgWhatsapp] = useState('');
    const [sVerifying, setSVerifying] = useState(false); const [sSavingSettings, setSSavingSettings] = useState(false);
    // Eval editing (moved here from mid-component to avoid React 19 #310)
    const [editEvalId, setEditEvalId] = useState<string | null>(null);
    const [editEvTitle, setEditEvTitle] = useState('');
    const [editEvType, setEditEvType] = useState('');
    const [editEvMax, setEditEvMax] = useState('');
    // Landing page config
    // Cursus admin state
    const [adminChapters, setAdminChapters] = useState<any[]>([]);
    const [adminLessons, setAdminLessons] = useState<any[]>([]);
    const [cursusLoaded, setCursusLoaded] = useState(false);
    const [expandedAdminSub, setExpandedAdminSub] = useState<string | null>(null);
    const [expandedAdminCh, setExpandedAdminCh] = useState<string | null>(null);
    const [editAdminChId, setEditAdminChId] = useState<string | null>(null);
    const [editAdminChContent, setEditAdminChContent] = useState('');
    const [editAdminLessonId, setEditAdminLessonId] = useState<string | null>(null);
    const [editAdminLessonContent, setEditAdminLessonContent] = useState('');
    const [lHeroImage, setLHeroImage] = useState(''); const [lHeroTitle, setLHeroTitle] = useState(''); const [lHeroSubtitle, setLHeroSubtitle] = useState('');
    const [lAboutText, setLAboutText] = useState(''); const [lAboutImage, setLAboutImage] = useState('');
    const [lGalleryImages, setLGalleryImages] = useState<string[]>([]); const [lGalleryInput, setLGalleryInput] = useState('');
    const [lSocialFb, setLSocialFb] = useState(''); const [lSocialIg, setLSocialIg] = useState(''); const [lSocialTw, setLSocialTw] = useState('');
    const [lSocialTt, setLSocialTt] = useState(''); const [lSocialYt, setLSocialYt] = useState(''); const [lSocialLi, setLSocialLi] = useState('');
    const [lFooterText, setLFooterText] = useState(''); const [lSaving, setLSaving] = useState(false);
    const loadTemplateSettings = () => { if (!org) return; setSelBulletinTemplate(org.bulletin_template || 1); setSelReceiptTemplate(org.receipt_template || 1); setCurrentTerm(org.current_term || 'Trimestre 1'); };
    const saveTemplateSettings = async () => { setSavingTemplates(true); try { const updates = { bulletin_template: selBulletinTemplate, receipt_template: selReceiptTemplate, current_term: currentTerm }; const { error } = await supabase.from('organizations').update(updates).eq('id', org.id); if (error) throw error; setOrg({ ...org, ...updates }); toast.success('Modèles sauvegardés ✅'); } catch (e: any) { toast.error(e.message); } setSavingTemplates(false); };
    const printPaymentReceipt = (p: any) => { const stu = students.find((s: any) => s.id === p.student_id); const receiptData: ReceiptData = { org: { name: org.name, logo_url: org.logo_url, phone: org.phone, email: org.email, city: org.city, country: org.country }, student: { first_name: stu?.first_name || p.student_profiles?.first_name || '', last_name: stu?.last_name || p.student_profiles?.last_name || '', matricule: stu?.matricule || p.student_profiles?.matricule, classroom_name: cls.find(c => c.id === stu?.classroom_id)?.name || '' }, payment: { id: p.id, amount: p.amount, currency: p.currency || 'XAF', method: p.payment_method, description: p.description || 'Paiement scolarité', paid_at: p.paid_at }, receiptNumber: generateReceiptNumber() }; generateReceiptPDF(receiptData, org.receipt_template || 1); };
    const loadSettings = () => { if (!org) return; setSCustomDomain(org.custom_domain || ''); setSDomainVerified(org.domain_verified || false); setSDomainSsl(org.domain_ssl_status || 'pending'); setSBrandColor(org.brand_color || '#4f46e5'); setSLogoUrl(org.logo_url || ''); setSFaviconUrl(org.favicon_url || ''); setSMetaTitle(org.meta_title || ''); setSMetaDesc(org.meta_description || ''); setSOrgName(org.name || ''); setSOrgPhone(org.phone || ''); setSOrgEmail(org.email || ''); setSOrgWhatsapp(org.whatsapp || ''); };
    const loadLanding = () => { if (!org) return; setLHeroImage(org.hero_image_url || ''); setLHeroTitle(org.hero_title || ''); setLHeroSubtitle(org.hero_subtitle || ''); setLAboutText(org.about_text || ''); setLAboutImage(org.about_image_url || ''); setLGalleryImages(org.gallery_images || []); setLSocialFb(org.social_facebook || ''); setLSocialIg(org.social_instagram || ''); setLSocialTw(org.social_twitter || ''); setLSocialTt(org.social_tiktok || ''); setLSocialYt(org.social_youtube || ''); setLSocialLi(org.social_linkedin || ''); setLFooterText(org.footer_text || ''); };
    const saveLanding = async () => { setLSaving(true); try { const updates: any = { hero_image_url: lHeroImage || null, hero_title: lHeroTitle || null, hero_subtitle: lHeroSubtitle || null, about_text: lAboutText || null, about_image_url: lAboutImage || null, gallery_images: lGalleryImages, social_facebook: lSocialFb || null, social_instagram: lSocialIg || null, social_twitter: lSocialTw || null, social_tiktok: lSocialTt || null, social_youtube: lSocialYt || null, social_linkedin: lSocialLi || null, footer_text: lFooterText || null }; const { error } = await supabase.from('organizations').update(updates).eq('id', org.id); if (error) throw error; setOrg({ ...org, ...updates }); toast.success('Page d\'accueil mise à jour ✅'); } catch (e: any) { toast.error(e.message); } setLSaving(false); };
    // WhatsApp Queue State
    const [waQueue, setWaQueue] = useState<any[]>([]);
    const [waLoaded, setWaLoaded] = useState(false);
    const [waLoading, setWaLoading] = useState(false);
    const [waFilter, setWaFilter] = useState<'all' | 'en_attente' | 'envoye' | 'echec'>('all');
    const [waTargetMode, setWaTargetMode] = useState<'single' | 'class' | 'all_school'>('single');
    const [waTargetStudent, setWaTargetStudent] = useState('');
    const [waTargetClass, setWaTargetClass] = useState('');
    const [waCustomMessage, setWaCustomMessage] = useState('');
    const [waSending, setWaSending] = useState(false);

    const loadWhatsAppQueue = async () => {
        if (!org) return;
        setWaLoading(true);
        try {
            const { data, error } = await supabase
                .from('whatsapp_queue')
                .select('*')
                .eq('organization_id', org.id)
                .order('created_at', { ascending: false })
                .limit(100);
            if (error) throw error;
            setWaQueue(data || []);
            setWaLoaded(true);
        } catch (e: any) {
            console.error('Error loading WhatsApp Queue:', e);
        } finally {
            setWaLoading(false);
        }
    };

    const sendCustomWhatsAppBroadcast = async () => {
        if (!waCustomMessage.trim()) {
            toast.error('Veuillez saisir le contenu du message');
            return;
        }
        setWaSending(true);
        try {
            let targetStudents: any[] = [];
            if (waTargetMode === 'single') {
                if (!waTargetStudent) { toast.error('Veuillez sélectionner un élève'); setWaSending(false); return; }
                targetStudents = students.filter((s: any) => s.id === waTargetStudent);
            } else if (waTargetMode === 'class') {
                if (!waTargetClass) { toast.error('Veuillez sélectionner une classe'); setWaSending(false); return; }
                targetStudents = students.filter((s: any) => s.classroom_id === waTargetClass);
            } else {
                targetStudents = students;
            }

            if (targetStudents.length === 0) {
                toast.error('Aucun élève trouvé pour cette sélection');
                setWaSending(false);
                return;
            }

            let queuedCount = 0;
            for (const st of targetStudents) {
                const phone = st.guardian_phone || st.phone;
                if (phone) {
                    const name = `${st.first_name} ${st.last_name}`;
                    const fullMsg = `🏫 *${org.name}* — Message de l'Administration\n\n` +
                        `Bonjour,\n\n` +
                        `${waCustomMessage.trim()}\n\n` +
                        `📅 *Date* : ${new Date().toLocaleDateString('fr-FR')}`;

                    await enqueueWhatsAppMessage(org.id, phone, name, 'general', fullMsg);
                    queuedCount++;
                }
            }

            toast.success(`🚀 ${queuedCount} message(s) mis en file d'attente WhatsApp !`);
            setWaCustomMessage('');
            loadWhatsAppQueue();
        } catch (e: any) {
            toast.error(e.message || 'Erreur lors de la mise en file');
        } finally {
            setWaSending(false);
        }
    };



    useEffect(() => {
        let cancelled = false; // Prevent setState after unmount (React 19 #310 fix)

        const initAdmin = async () => {
            try {
                // ── AUTH GUARD: verify the user is logged in and owns this org ──
                const { data: authData, error: authError } = await supabase.auth.getUser();
                const authUser = authData?.user ?? null;
                if (cancelled) return;

                if (authError || !authUser) {
                    console.warn('[AdminPage] Auth check:', authError?.message || 'No user session');
                    setAuthChecked(true);
                    setLoading(false);
                    return;
                }

                const { data: o, error: orgError } = await supabase.from('organizations').select('*').eq('slug', orgSlug).single();
                if (cancelled) return;
                if (orgError || !o) { setAuthChecked(true); setLoading(false); return; }

                // Verify ownership
                if (o.owner_id !== authUser.id) {
                    setAuthChecked(true);
                    setLoading(false);
                    return;
                }

                if (cancelled) return;
                setIsAuthorized(true);
                setOrg(o);
                setSession({ id: authUser.id, first_name: authUser.user_metadata?.first_name || 'Admin', last_name: authUser.user_metadata?.last_name || '' });
                const { data: c } = await supabase.from('classrooms').select('*').eq('organization_id', o.id).order('name');
                if (cancelled) return;
                setCls((c || []).map((x: any) => ({ id: x.id, name: x.name, cycle: x.cycle || '', filiere_id: x.filiere_id, level: x.level || 1, capacity: x.capacity || 50 })));
                const { data: s } = await supabase.from('subjects').select('*').eq('organization_id', o.id).order('name');
                if (cancelled) return;
                setSubs((s || []).map((x: any) => ({ id: x.id, name: x.name, code: x.code || '', coefficient: x.coefficient || 1, classroom_id: x.classroom_id, teacher_id: x.teacher_id })));
                const { data: t } = await supabase.from('teacher_profiles').select('id, organization_id, first_name, last_name, speciality, email, phone, nationality, marital_status, children_count, residence, access_code, pin_set, created_at').eq('organization_id', o.id);
                if (cancelled) return;
                setTeachers(t || []);
                const { data: st } = await supabase.from('student_profiles').select('id, organization_id, first_name, last_name, sex, birth_date, classroom_id, phone, guardian_name, guardian_phone, nationality, residence, matricule, access_code, pin_set, created_at').eq('organization_id', o.id);
                if (cancelled) return;
                setStudents(st || []);
                // Load rooms
                const { data: rm } = await supabase.from('rooms').select('*').eq('organization_id', o.id).order('name');
                if (cancelled) return;
                setRooms((rm || []).map((x: any) => ({ id: x.id, name: x.name })));
                if (!o.setup_completed && (c || []).length === 0) setTab('setup');
            } catch (err: any) {
                if (cancelled) return;
                console.error('[AdminPage] Init error:', err);
                toast.error('Erreur de chargement. Veuillez vous reconnecter.');
            } finally {
                if (!cancelled) {
                    setAuthChecked(true);
                    setLoading(false);
                }
            }
        };

        initAdmin();

        return () => {
            cancelled = true; // Cleanup on unmount
        };
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
    const saveGradeEntries = async () => {
        if (!grSelEval) return;
        setSaving(true);
        try {
            const entries = Object.entries(grGrades).filter(([_, v]) => v !== '').map(([studentId, score]) => ({
                evaluation_id: grSelEval.id, student_id: studentId, score: parseFloat(score), graded_by: null
            }));
            if (entries.length === 0) { toast.info('Aucune note'); setSaving(false); return; }
            const { error } = await supabase.from('grades').upsert(entries, { onConflict: 'evaluation_id,student_id' });
            if (error) throw error;

            // Credit Sky Points & Queue WhatsApp notifications
            for (const entry of entries) {
                const studentObj = students.find((s: any) => s.id === entry.student_id);
                const parentPhone = studentObj?.guardian_phone || studentObj?.phone;
                const studentName = studentObj ? `${studentObj.first_name} ${studentObj.last_name}` : 'Élève';

                const skyGain = calculateSkyPoints(entry.score, grSelEval.max_score || 20);
                if (skyGain > 0) {
                    const { data: prof } = await supabase.from('student_profiles').select('sky_points').eq('id', entry.student_id).single();
                    if (prof) {
                        await supabase.from('student_profiles').update({ sky_points: (prof.sky_points || 0) + skyGain }).eq('id', entry.student_id);
                        await supabase.from('sky_transactions').insert({
                            student_id: entry.student_id,
                            amount: skyGain,
                            transaction_type: 'evaluation_grade',
                            description: `Note administration: ${entry.score}/${grSelEval.max_score || 20} (+${skyGain} Sky) — ${grSelEval.title}`
                        });
                    }
                }

                if (parentPhone) {
                    await queueGradeNotification(
                        org.id,
                        org.name,
                        parentPhone,
                        studentName,
                        grSelEval.subjects?.name || 'Matière',
                        grSelEval.title,
                        entry.score,
                        grSelEval.max_score || 20
                    );
                }
            }

            toast.success(`${entries.length} notes sauvegardées ✅ (Notifications WhatsApp mises en file)`);
        } catch (e: any) { toast.error(e.message); }
        setSaving(false);
    };

    const exportStudentBulletinPdf = async (student: any) => {
        toast.info(`Génération du bulletin pour ${student.first_name}...`);
        try {
            const classroomName = cls.find(c => c.id === student.classroom_id)?.name || 'Classe';
            
            const { data: studentSubs } = await supabase.from('subjects')
                .select('*, teacher_profiles:teacher_id(first_name, last_name)')
                .eq('classroom_id', student.classroom_id)
                .eq('organization_id', org.id);

            const { data: studentGrades } = await supabase.from('grades')
                .select('*, evaluations:evaluation_id(title, max_score, type, subject_id, subjects:subject_id(name))')
                .eq('student_id', student.id);

            const { data: studentExSubs } = await supabase.from('exercise_submissions')
                .select('*, exercises:exercise_id(id, title, max_score, type, chapter_id, subject_id)')
                .eq('student_id', student.id);

            const subIds = (studentSubs || []).map((s: any) => s.id);
            let studentChaps: any[] = [];
            if (subIds.length > 0) {
                const { data: chs } = await supabase.from('chapters').select('id, subject_id').in('subject_id', subIds);
                studentChaps = chs || [];
            }

            const bulletinSubjects = (studentSubs || []).map((sub: any) => {
                const subGrades = (studentGrades || []).filter((g: any) => g.evaluations?.subject_id === sub.id || g.evaluations?.subjects?.name === sub.name);
                const subExs = (studentExSubs || []).filter((es: any) => {
                    const ex = es.exercises;
                    if (!ex) return false;
                    if (ex.subject_id === sub.id) return true;
                    if (ex.chapter_id) return studentChaps.some((c: any) => c.id === ex.chapter_id && c.subject_id === sub.id);
                    return false;
                });

                const evalItems = subGrades.map((g: any) => ({
                    title: g.evaluations?.title || 'Évaluation',
                    type: g.evaluations?.type || 'devoir',
                    score: g.score,
                    max_score: g.evaluations?.max_score || 20,
                    weight: 1,
                    remark: g.teacher_remark,
                }));

                const exItems = subExs.map((es: any) => ({
                    title: es.exercises?.title || 'Exercice Cursus',
                    type: `cursus (${es.exercises?.type || 'qcm'})`,
                    score: es.score,
                    max_score: es.exercises?.max_score || 20,
                    weight: 1,
                    remark: 'Auto-corrigé Cursus',
                }));

                const allScores = [...evalItems, ...exItems];
                let avg = 0;
                if (allScores.length > 0) {
                    const total = allScores.reduce((sum, item) => sum + (item.score / item.max_score) * 20, 0);
                    avg = total / allScores.length;
                }

                return {
                    name: sub.name,
                    coefficient: sub.coefficient || 1,
                    teacher_name: sub.teacher_profiles ? `${sub.teacher_profiles.first_name} ${sub.teacher_profiles.last_name}` : undefined,
                    grades: allScores,
                    average: avg,
                };
            });

            const scoredSubs = bulletinSubjects.filter((bs: any) => bs.grades.length > 0);
            const overallAvg = scoredSubs.length > 0
                ? scoredSubs.reduce((sum: number, bs: any) => sum + bs.average * (bs.coefficient || 1), 0) /
                  scoredSubs.reduce((sum: number, bs: any) => sum + (bs.coefficient || 1), 0)
                : 0;

            const data: BulletinData = {
                org: { name: org.name, logo_url: org.logo_url, phone: org.phone, email: org.email, city: org.city, country: org.country, current_term: org.current_term },
                student: { first_name: student.first_name, last_name: student.last_name, matricule: student.matricule, sex: student.sex, birth_date: student.birth_date, classroom_name: classroomName },
                subjects: bulletinSubjects,
                overallAverage: overallAvg,
                term: org.current_term || 'Trimestre 1',
                year: `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`,
            };

            generateBulletinPDF(data, selBulletinTemplate || org.bulletin_template || 1);
        } catch (e: any) {
            toast.error(e.message || 'Erreur lors de la génération du bulletin');
        }
    };
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
            const domain = sCustomDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
            setSCustomDomain(domain);
            await supabase.from('organizations').update({ custom_domain: domain, domain_verified: true, domain_ssl_status: 'pending' }).eq('id', org.id);
            setSDomainVerified(true); setSDomainSsl('pending');
            setOrg({ ...org, custom_domain: domain, domain_verified: true, domain_ssl_status: 'pending' });
            toast.success('Domaine enregistré ! Configurez le DNS puis patientez 24-48h pour le SSL 🎉');
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
    const loadCursus = async () => { const subIds = subs.map((s: any) => s.id); if (subIds.length === 0) { setCursusLoaded(true); return; } const { data: chaps } = await supabase.from('chapters').select('*').in('subject_id', subIds).order('position'); setAdminChapters(chaps || []); const chIds = (chaps || []).map((c: any) => c.id); if (chIds.length > 0) { const { data: lsns } = await supabase.from('lessons').select('*').in('chapter_id', chIds).order('position'); setAdminLessons(lsns || []); } setCursusLoaded(true); };
    const onTab = (t: Tab) => { setTab(t); setSidebar(false); if (t === 'timetable' && !ttLoaded) loadTT(); if (t === 'evaluations' && !evLoaded) loadEv(); if (t === 'payments' && !payLoaded) loadPay(); if (t === 'disciplines' && !dLoaded) loadDisc(); if (t === 'grades' && !grLoaded) loadGrades(); if (t === 'settings') loadSettings(); if (t === 'landing') loadLanding(); if (t === 'modeles') loadTemplateSettings(); if (t === 'cursus' && !cursusLoaded) loadCursus(); if (t === 'whatsapp' && !waLoaded) loadWhatsAppQueue(); };

    // ═══ CRUD CLASSES INLINE ═══
    const addClassDirect = async () => {
        if (!directNewCls.trim() || !org) return;
        setSaving(true);
        const { data, error } = await supabase.from('classrooms').insert({ organization_id: org.id, name: directNewCls.trim(), cycle: null, filiere_id: null, level: 1, capacity: 50 }).select().single();
        if (error) { toast.error(error.message); } else { setCls(p => [...p, { id: data.id, name: data.name, cycle: '', filiere_id: null, level: 1, capacity: 50 }]); setDirectNewCls(''); toast.success('Salle ajoutée !'); }
        setSaving(false);
    };
    const updateClass = async (id: string) => {
        if (!editClsName.trim()) return;
        const { error } = await supabase.from('classrooms').update({ name: editClsName.trim() }).eq('id', id);
        if (error) toast.error(error.message); else { setCls(p => p.map(c => c.id === id ? { ...c, name: editClsName.trim() } : c)); toast.success('Salle mise à jour'); }
        setEditingClsId(null);
    };
    const deleteClass = async (id: string) => {
        if (!confirm('Supprimer cette classe ? Les étudiants associés seront impactés.')) return;
        const { error } = await supabase.from('classrooms').delete().eq('id', id);
        if (error) toast.error(error.message); else { setCls(p => p.filter(c => c.id !== id)); toast.success('Classe supprimée'); }
    };
    // ═══ CRUD SUBJECTS INLINE ═══
    const addSubjectDirect = async () => {
        if (!directNewSub.trim() || !org) return;
        setSaving(true);
        const { data, error } = await supabase.from('subjects').insert({ organization_id: org.id, name: directNewSub.trim(), code: directNewSub.slice(0, 4).toUpperCase(), coefficient: 1, classroom_id: null, teacher_id: null }).select().single();
        if (error) { toast.error(error.message); } else { setSubs(p => [...p, { id: data.id, name: data.name, code: data.code, coefficient: data.coefficient, classroom_id: data.classroom_id || '', teacher_id: null }]); setDirectNewSub(''); toast.success('Matière ajoutée !'); }
        setSaving(false);
    };
    const updateSubject = async (id: string) => {
        if (!editSubName.trim()) return;
        const { error } = await supabase.from('subjects').update({ name: editSubName.trim(), coefficient: parseFloat(editSubCoef) || 1 }).eq('id', id);
        if (error) toast.error(error.message); else { setSubs(p => p.map(s => s.id === id ? { ...s, name: editSubName.trim(), coefficient: parseFloat(editSubCoef) || 1 } : s)); toast.success('Matière mise à jour'); }
        setEditingSubId(null);
    };
    const deleteSubject = async (id: string) => {
        if (!confirm('Supprimer cette matière ?')) return;
        const { error } = await supabase.from('subjects').delete().eq('id', id);
        if (error) toast.error(error.message); else { setSubs(p => p.filter(s => s.id !== id)); toast.success('Matière supprimée'); }
    };
    // ═══ CRUD ROOMS ═══
    const addRoomDirect = async () => {
        if (!directNewRoom.trim() || !org) return;
        setSaving(true);
        const { data, error } = await supabase.from('rooms').insert({ organization_id: org.id, name: directNewRoom.trim() }).select().single();
        if (error) { toast.error(error.message); } else { setRooms(p => [...p, { id: data.id, name: data.name }]); setDirectNewRoom(''); toast.success('Salle ajoutée !'); }
        setSaving(false);
    };
    const updateRoom = async (id: string) => {
        if (!editRoomName.trim()) return;
        const { error } = await supabase.from('rooms').update({ name: editRoomName.trim() }).eq('id', id);
        if (error) toast.error(error.message); else { setRooms(p => p.map(r => r.id === id ? { ...r, name: editRoomName.trim() } : r)); toast.success('Salle mise à jour'); }
        setEditingRoomId(null);
    };
    const deleteRoom = async (id: string) => {
        if (!confirm('Supprimer cette salle ?')) return;
        const { error } = await supabase.from('rooms').delete().eq('id', id);
        if (error) toast.error(error.message); else { setRooms(p => p.filter(r => r.id !== id)); toast.success('Salle supprimée'); }
    };
    // ═══ CRUD EVALUATIONS ═══
    const deleteEval = async (id: string) => {
        if (!confirm('Supprimer cette évaluation et toutes ses notes ?')) return;
        await supabase.from('grades').delete().eq('evaluation_id', id);
        const { error } = await supabase.from('evaluations').delete().eq('id', id);
        if (error) toast.error(error.message); else { setEvals(p => p.filter(e => e.id !== id)); toast.success('Évaluation supprimée'); }
    };
    const updateEval = async (id: string) => {
        const { error } = await supabase.from('evaluations').update({ title: editEvTitle, type: editEvType, max_score: parseFloat(editEvMax) || 20 }).eq('id', id);
        if (error) toast.error(error.message); else { setEvals(p => p.map(e => e.id === id ? { ...e, title: editEvTitle, type: editEvType, max_score: parseFloat(editEvMax) || 20 } : e)); toast.success('Évaluation mise à jour'); }
        setEditEvalId(null);
    };

    // ═══ IMAGE UPLOAD TO SUPABASE STORAGE ═══
    const uploadLandingImage = async (file: File, pathPrefix: string): Promise<string | null> => {
        setUploadingImage(true);
        try {
            const compressed = await compressImage(file, { maxWidth: 1400, quality: 0.7 });
            const r2Res = await uploadToR2(compressed, `orgs/${org.id}/landing`, `${pathPrefix}_${file.name}`);
            return r2Res.url;
        } catch (e: any) { toast.error('Erreur upload: ' + e.message); return null; }
        finally { setUploadingImage(false); }
    };
    const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const url = await uploadLandingImage(file, 'hero');
        if (url) { setLHeroImage(url); toast.success('Image bannière uploadée !'); }
    };
    const handleAboutUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const url = await uploadLandingImage(file, 'about');
        if (url) { setLAboutImage(url); toast.success('Image À propos uploadée !'); }
    };
    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        for (const file of files) {
            const url = await uploadLandingImage(file, `gallery_${lGalleryImages.length}`);
            if (url) setLGalleryImages(p => [...p, url]);
        }
        if (files.length > 0) toast.success(`${files.length} image(s) uploadée(s) !`);
    };
    const handleSettingsLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setUploadingImage(true);
        try {
            const compressed = await compressImage(file, { maxWidth: 800, quality: 0.7 });
            const r2Res = await uploadToR2(compressed, `orgs/${org.id}`, file.name);
            setSLogoUrl(r2Res.url);
            // Also update the org immediately
            await supabase.from('organizations').update({ logo_url: r2Res.url }).eq('id', org.id);
            setOrg({ ...org, logo_url: r2Res.url });
            toast.success('Logo uploadé !'); 
        } catch (e: any) { toast.error(e.message); }
        setUploadingImage(false);
    };

    // ═══ ADMIN PDF EXPORT ═══
    const printAdminPdf = (title: string, bodyHtml: string) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) { toast.error('Activez les pop-ups pour imprimer'); return; }
        printWindow.document.write(`<!DOCTYPE html><html><head><title>${title} — ${org.name}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; padding: 20mm; font-size: 11pt; }
.header { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #14b8a6; padding-bottom: 16px; margin-bottom: 20px; }
.header img { width: 70px; height: 70px; object-fit: contain; border-radius: 8px; }
.header-text h1 { font-size: 18pt; color: #0d9488; margin-bottom: 4px; }
.header-text p { font-size: 9pt; color: #64748b; }
.title { font-size: 16pt; font-weight: bold; color: #0f172a; margin: 20px 0 15px; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
table { width: 100%; border-collapse: collapse; margin: 12px 0; }
th { background: #0d9488; color: white; padding: 10px 8px; text-align: left; font-size: 10pt; }
td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 10pt; }
tr:nth-child(even) { background: #f8fafc; }
.total-row { background: #0d9488 !important; color: white; font-weight: bold; }
.total-row td { border: none; }
.footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 8pt; color: #94a3b8; }
.stamp-area { margin-top: 40px; display: flex; justify-content: flex-end; }
.stamp-area div { text-align: center; width: 40%; }
.stamp-area .line { border-top: 1px solid #94a3b8; margin-top: 50px; padding-top: 4px; font-size: 9pt; color: #64748b; }
@media print { body { padding: 15mm; } }
</style></head><body>
<div class="header">
${org.logo_url ? `<img src="${org.logo_url}" alt="${org.name}" />` : ''}
<div class="header-text">
<h1>${org.name}</h1>
<p>${org.city || ''}${org.city && org.country ? ', ' : ''}${org.country || ''}</p>
${org.phone ? `<p>Tél: ${org.phone}</p>` : ''}
${org.email ? `<p>Email: ${org.email}</p>` : ''}
</div></div>
${bodyHtml}
<div class="stamp-area"><div><p style="font-size:9pt;color:#64748b">Le Directeur</p><div class="line">Cachet & Signature</div></div></div>
<div class="footer"><p>Document généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} — ${org.name} — CampusFlow</p></div>
</body></html>`);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    };

    const exportTimetablePdf = () => {
        let html = '<div class="title">EMPLOI DU TEMPS</div>';
        DAYS.forEach((day, di) => {
            const slots = ttSlots.filter((s: any) => s.day_of_week === di + 1);
            if (slots.length === 0) return;
            html += `<h3 style="margin:15px 0 5px;color:#0d9488;font-size:12pt">${day}</h3><table><thead><tr><th>Horaire</th><th>Matière</th><th>Salle</th></tr></thead><tbody>`;
            slots.forEach((s: any) => {
                html += `<tr><td>${s.start_time?.slice(0,5)} - ${s.end_time?.slice(0,5)}</td><td>${s.subjects?.name || '—'}</td><td>${s.room || '—'}</td></tr>`;
            });
            html += '</tbody></table>';
        });
        printAdminPdf('Emploi du temps', html);
    };

    const exportGradesPdf = () => {
        if (!grSelEval) { toast.error('Sélectionnez une évaluation'); return; }
        const stuList = students.filter((s: any) => s.classroom_id === grSelEval.classroom_id);
        let html = `<div class="title">RELEVÉ DE NOTES</div><table style="margin-bottom:15px"><tr><td><strong>Évaluation:</strong> ${grSelEval.title}</td><td><strong>Type:</strong> ${grSelEval.type}</td></tr><tr><td><strong>Classe:</strong> ${grSelEval.classrooms?.name || '—'}</td><td><strong>Matière:</strong> ${grSelEval.subjects?.name || '—'}</td></tr><tr><td><strong>Note Max:</strong> /${grSelEval.max_score}</td><td><strong>Date:</strong> ${grSelEval.date || '—'}</td></tr></table>`;
        html += '<table><thead><tr><th>N°</th><th>Nom & Prénom</th><th>Note</th><th>Appréciation</th></tr></thead><tbody>';
        stuList.forEach((s: any, i: number) => {
            const score = grGrades[s.id] || '—';
            const numScore = parseFloat(score);
            const appreciation = isNaN(numScore) ? '—' : numScore >= grSelEval.max_score * 0.8 ? 'Excellent' : numScore >= grSelEval.max_score * 0.7 ? 'Très bien' : numScore >= grSelEval.max_score * 0.6 ? 'Bien' : numScore >= grSelEval.max_score * 0.5 ? 'Passable' : 'Insuffisant';
            html += `<tr><td>${i+1}</td><td>${s.first_name} ${s.last_name}</td><td style="font-weight:bold">${score}/${grSelEval.max_score}</td><td>${appreciation}</td></tr>`;
        });
        const vals = Object.values(grGrades).filter(v => v !== '').map(Number).filter(n => !isNaN(n));
        if (vals.length > 0) {
            const avg = (vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(2);
            html += `<tr class="total-row"><td colspan="2">MOYENNE DE CLASSE</td><td>${avg}/${grSelEval.max_score}</td><td>Min: ${Math.min(...vals).toFixed(1)} | Max: ${Math.max(...vals).toFixed(1)}</td></tr>`;
        }
        html += '</tbody></table>';
        printAdminPdf(`Notes - ${grSelEval.title}`, html);
    };

    const exportPaymentsPdf = () => {
        let html = '<div class="title">RAPPORT DES PAIEMENTS</div><table><thead><tr><th>N°</th><th>Étudiant</th><th>Matricule</th><th>Description</th><th>Mode</th><th>Date</th><th>Montant (XAF)</th></tr></thead><tbody>';
        let total = 0;
        pays.forEach((p: any, i: number) => {
            total += p.amount || 0;
            html += `<tr><td>${i+1}</td><td>${p.student_profiles?.first_name || ''} ${p.student_profiles?.last_name || ''}</td><td>${p.student_profiles?.matricule || '—'}</td><td>${p.description || 'Scolarité'}</td><td>${p.payment_method === 'momo' ? 'MTN MoMo' : p.payment_method === 'orange_money' ? 'Orange Money' : p.payment_method}</td><td>${new Date(p.paid_at).toLocaleDateString('fr-FR')}</td><td style="font-weight:bold">${new Intl.NumberFormat('fr-FR').format(p.amount)}</td></tr>`;
        });
        html += `<tr class="total-row"><td colspan="6">TOTAL</td><td>${new Intl.NumberFormat('fr-FR').format(total)} XAF</td></tr></tbody></table>`;
        printAdminPdf('Rapport des paiements', html);
    };

    // Module actions
    const addSlot = async () => { if (!ttCls2 || !ttSub2) { toast.error('Sélectionnez classe et matière'); return; } setSaving(true); const { error } = await supabase.from('timetable_slots').insert({ organization_id: org.id, classroom_id: ttCls2, subject_id: ttSub2, day_of_week: ttDay, start_time: ttStart, end_time: ttEnd, room: ttRoom || null }); if (error) toast.error(error.message); else { toast.success('Créneau ajouté !'); loadTT(); } setSaving(false); };
    const delSlot = async (id: string) => { await supabase.from('timetable_slots').delete().eq('id', id); setTtSlots(p => p.filter(s => s.id !== id)); toast.success('Supprimé'); };
    const addEval = async () => { if (!evTitle || !evCls || !evSub) { toast.error('Remplissez les champs'); return; } setSaving(true); const { error } = await supabase.from('evaluations').insert({ organization_id: org.id, title: evTitle, type: evType, classroom_id: evCls, subject_id: evSub, date: evDate || null, max_score: parseFloat(evMax) || 20 }); if (error) toast.error(error.message); else { toast.success('Évaluation créée !'); setEvTitle(''); loadEv(); } setSaving(false); };
    const addPay = async () => {
        if (!payStu || !payAmt) { toast.error('Sélectionnez un étudiant et un montant'); return; }
        setSaving(true);
        const amount = parseFloat(payAmt);
        const { error } = await supabase.from('school_payments').insert({
            organization_id: org.id,
            student_id: payStu,
            amount,
            payment_method: payMeth,
            description: payDesc || 'Paiement scolarité',
            currency: 'XAF'
        });
        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Paiement enregistré !');
            const studentObj = students.find((s: any) => s.id === payStu);
            const parentPhone = studentObj?.guardian_phone || studentObj?.phone;
            const studentName = studentObj ? `${studentObj.first_name} ${studentObj.last_name}` : 'Élève';
            if (parentPhone) {
                await queuePaymentReceipt(
                    org.id,
                    org.name,
                    parentPhone,
                    studentName,
                    amount,
                    payMeth,
                    payDesc || 'Paiement scolarité'
                );
            }
            setPayAmt(''); setPayDesc(''); loadPay();
        }
        setSaving(false);
    };

    const addDisc = async () => {
        if (!dStu || !dReason) { toast.error('Remplissez les champs'); return; }
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('disciplines').insert({
            organization_id: org.id,
            student_id: dStu,
            type: dType,
            reason: dReason,
            created_by: user?.id
        });
        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Sanction enregistrée');
            const studentObj = students.find((s: any) => s.id === dStu);
            const parentPhone = studentObj?.guardian_phone || studentObj?.phone;
            const studentName = studentObj ? `${studentObj.first_name} ${studentObj.last_name}` : 'Élève';
            if (parentPhone) {
                await queueDisciplineAlert(
                    org.id,
                    org.name,
                    parentPhone,
                    studentName,
                    dType,
                    dReason
                );
            }
            setDReason(''); loadDisc();
        }
        setSaving(false);
    };

    // Sel component is now defined outside AdminPage to prevent React 19 hydration issues

    return (
        <div className="min-h-screen bg-[#0B0E14] text-white flex overflow-x-hidden">
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-25%] right-[-15%] w-[50%] h-[50%] bg-teal-600/4 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-25%] left-[-15%] w-[40%] h-[40%] bg-indigo-600/4 blur-[150px] rounded-full" />
            </div>
            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-60 bg-[#0F1219]/90 backdrop-blur-xl border-r border-white/5 transform transition-transform lg:transform-none flex flex-col ${sidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="p-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <img src="/logo-campusflow.png" alt="CampusFlow" className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(20,184,166,0.4)]" />
                        <span className="font-bold text-sm truncate">{org.name}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Backoffice</p>
                </div>
                <nav className="p-2 space-y-0.5 flex-1 overflow-y-auto pb-16">{SIDES.map(i => (<button key={i.id} onClick={() => onTab(i.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${tab === i.id ? 'bg-teal-600/15 text-teal-300 font-medium' : 'text-slate-400 hover:bg-white/5'}`}><i.icon className="w-4 h-4" />{i.label}</button>))}
                    <div className="mt-3 pt-3 border-t border-white/5 space-y-0.5">
                        <button onClick={() => router.push(`/${orgSlug}/library`)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-emerald-400 hover:bg-emerald-600/10"><BookMarked className="w-4 h-4" />Bibliothèque</button>
                        <button onClick={() => router.push(`/${orgSlug}/shop`)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-teal-400 hover:bg-teal-600/10"><ShoppingBag className="w-4 h-4" />Marketplace</button>
                        <button onClick={() => router.push(`/${orgSlug}/messages`)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-indigo-400 hover:bg-indigo-600/10"><MessageSquare className="w-4 h-4" />Messages</button>
                    </div>
                </nav>
                <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/5"><Button variant="ghost" size="sm" className="w-full text-xs text-slate-500" onClick={() => router.push(`/${orgSlug}`)}><Globe className="w-3 h-3 mr-1" />Page publique</Button></div>
            </aside>
            {sidebar && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebar(false)} />}

            <main className="flex-1 min-w-0 min-h-screen relative z-10 overflow-x-hidden">
                <header className="sticky top-0 z-20 bg-[#0B0E14]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3"><button onClick={() => setSidebar(true)} className="lg:hidden p-2 hover:bg-white/5 rounded-xl"><Settings className="w-5 h-5" /></button><h1 className="text-lg font-black text-gradient-primary">{SIDES.find(i => i.id === tab)?.label}</h1></div>
                    <span className="text-xs text-slate-500">{students.length} étudiants • {teachers.length} profs</span>
                </header>

                <div className="p-3 sm:p-4 md:p-6 max-w-5xl w-full">
                    {/* ═══ GENERAL ═══ */}
                    {tab === 'general' && <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-white/10"><h2 className="text-xl font-black mb-4 text-gradient-primary">Informations</h2><div className="grid sm:grid-cols-2 gap-3 text-sm">{[['Nom', org.name], ['Type', org.type], ['Ville', `${org.city}, ${org.country}`], ['Tél', org.phone], ['Email', org.email], ['WhatsApp', org.whatsapp || '—']].map(([k, v], i) => <div key={i}><span className="text-slate-500">{k}:</span> <span className="ml-2">{v}</span></div>)}</div></div>
                        <div className="p-4 sm:p-6 rounded-2xl bg-teal-500/5 backdrop-blur-sm border border-teal-500/10"><h3 className="font-bold text-teal-300 mb-3 flex items-center gap-2"><Link2 className="w-5 h-5" />Liens</h3><div className="space-y-2 text-sm">{[['Page publique', `${origin}/${orgSlug}`, 'text-teal-300'], ['Inscription prof', `${origin}/${orgSlug}/prof`, 'text-emerald-300'], ['Inscription étudiant', `${origin}/${orgSlug}/student`, 'text-indigo-300']].map(([l, u, c], i) => <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2"><span className="text-slate-400 shrink-0">{l}:</span><code className={`px-2 py-1 rounded-lg bg-white/5 ${c} text-xs break-all`}>{u}</code></div>)}</div></div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">{[{ l: 'Classes', v: cls.length, c: 'from-teal-600 to-emerald-600', shadow: 'shadow-teal-600/20' }, { l: 'Matières', v: subs.length, c: 'from-indigo-600 to-blue-600', shadow: 'shadow-indigo-600/20' }, { l: 'Profs', v: teachers.length, c: 'from-amber-600 to-orange-600', shadow: 'shadow-amber-600/20' }, { l: 'Étudiants', v: students.length, c: 'from-purple-600 to-pink-600', shadow: 'shadow-purple-600/20' }].map((s, i) => <div key={i} className={`p-4 rounded-xl bg-gradient-to-br ${s.c} text-center shadow-lg ${s.shadow}`}><div className="text-3xl font-black">{s.v}</div><div className="text-sm text-white/80">{s.l}</div></div>)}</div>
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

                    {/* ═══ CLASSES (groupes d'étudiants) ═══ */}
                    {tab === 'classes' && <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-slate-400 text-sm">{cls.length} {isCL ? 'classe(s)' : org.type === 'universite' ? 'filière(s)/niveau(x)' : 'filière(s)/niveau(x)'}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-indigo-600/5 border border-indigo-500/10 text-xs text-slate-400">
                            💡 <strong>Classe</strong> = groupe d'étudiants (ex: Tle A, 6ème B, L1 Droit). <strong>Salle</strong> = lieu physique (dans l'onglet Salles).
                        </div>
                        {/* Ajout direct */}
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                            <h3 className="font-bold text-sm mb-3">➕ Ajouter une {isCL ? 'classe' : 'filière / niveau'}</h3>
                            <div className="flex gap-2">
                                <Input value={directNewCls} onChange={e => setDirectNewCls(e.target.value)} onKeyDown={e => e.key === 'Enter' && addClassDirect()} placeholder={isCL ? 'Ex: 6ème A, Tle C, 3ème B...' : 'Ex: L1 Droit, Niveau 2...'} className="bg-white/5 border-white/10 text-white h-10 rounded-lg" />
                                <Button onClick={addClassDirect} disabled={!directNewCls.trim() || saving} className="bg-indigo-600 shrink-0"><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
                            </div>
                            {isCL && <div className="mt-3"><p className="text-xs text-slate-500 mb-2">Ajout rapide :</p><div className="flex flex-wrap gap-2">{(org.type === 'college' ? COLLEGE : [...COLLEGE, ...LYCEE]).map(l => <Button key={l} size="sm" variant="outline" className="text-xs border-white/10" onClick={() => quickAdd(l)}><Plus className="w-3 h-3 mr-1" />{l}</Button>)}</div></div>}
                        </div>
                        {/* Liste */}
                        {cls.map((c, i) => <div key={c.id || i} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <School className="w-5 h-5 text-indigo-400 shrink-0" />
                                {editingClsId === c.id ? (
                                    <div className="flex gap-2 flex-1">
                                        <Input value={editClsName} onChange={e => setEditClsName(e.target.value)} onKeyDown={e => e.key === 'Enter' && updateClass(c.id!)} className="bg-white/5 border-white/10 text-white h-8 rounded-lg text-sm flex-1" autoFocus />
                                        <Button size="sm" className="bg-emerald-600 h-8" onClick={() => updateClass(c.id!)}><Save className="w-3 h-3" /></Button>
                                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingClsId(null)}><X className="w-3 h-3" /></Button>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="font-medium">{c.name}</p>
                                        <p className="text-xs text-slate-500">{c.cycle || '—'} • {students.filter((s: any) => s.classroom_id === c.id).length} étudiant(s){!c.id && ' • nouveau'}</p>
                                    </div>
                                )}
                            </div>
                            {c.id && editingClsId !== c.id && <div className="flex items-center gap-1">
                                <button onClick={() => { setEditingClsId(c.id!); setEditClsName(c.name); }} className="text-indigo-400 hover:text-indigo-300 p-1"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => deleteClass(c.id!)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-4 h-4" /></button>
                            </div>}
                        </div>)}
                    </div>}

                    {/* ═══ ROOMS (salles physiques) ═══ */}
                    {tab === 'rooms' && <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-slate-400 text-sm">{rooms.length} salle(s) physique(s)</p>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-600/5 border border-amber-500/10 text-xs text-slate-400">
                            🏢 <strong>Salle</strong> = lieu physique où se déroulent les cours (ex: Salle 101, Amphi A, Lab chimie). Différent des <strong>classes</strong> (groupes d'étudiants).
                        </div>
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                            <h3 className="font-bold text-sm mb-3">➕ Ajouter une salle</h3>
                            <div className="flex gap-2">
                                <Input value={directNewRoom} onChange={e => setDirectNewRoom(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRoomDirect()} placeholder="Ex: Salle 101, Amphi A, Lab chimie..." className="bg-white/5 border-white/10 text-white h-10 rounded-lg" />
                                <Button onClick={addRoomDirect} disabled={!directNewRoom.trim() || saving} className="bg-amber-600 shrink-0"><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
                            </div>
                        </div>
                        {rooms.map((r) => <div key={r.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Building2 className="w-5 h-5 text-amber-400 shrink-0" />
                                {editingRoomId === r.id ? (
                                    <div className="flex gap-2 flex-1">
                                        <Input value={editRoomName} onChange={e => setEditRoomName(e.target.value)} onKeyDown={e => e.key === 'Enter' && updateRoom(r.id!)} className="bg-white/5 border-white/10 text-white h-8 rounded-lg text-sm flex-1" autoFocus />
                                        <Button size="sm" className="bg-emerald-600 h-8" onClick={() => updateRoom(r.id!)}><Save className="w-3 h-3" /></Button>
                                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingRoomId(null)}><X className="w-3 h-3" /></Button>
                                    </div>
                                ) : (<p className="font-medium">{r.name}</p>)}
                            </div>
                            {r.id && editingRoomId !== r.id && <div className="flex items-center gap-1">
                                <button onClick={() => { setEditingRoomId(r.id!); setEditRoomName(r.name); }} className="text-amber-400 hover:text-amber-300 p-1"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => deleteRoom(r.id!)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-4 h-4" /></button>
                            </div>}
                        </div>)}
                        {rooms.length === 0 && <div className="text-center py-8 text-slate-500"><Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aucune salle</p></div>}
                    </div>}

                    {/* ═══ SUBJECTS (indépendants des classes) ═══ */}
                    {tab === 'subjects' && <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-slate-400 text-sm">{subs.length} matière(s)</p>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-600/5 border border-emerald-500/10 text-xs text-slate-400">
                            📚 Les matières sont indépendantes des classes. L'association matière ↔ classe ↔ professeur ↔ salle se fait dans l'<strong>emploi du temps</strong>.
                        </div>
                        {/* Ajout direct */}
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                            <h3 className="font-bold text-sm mb-3">➕ Ajouter une matière</h3>
                            <div className="flex gap-2">
                                <Input value={directNewSub} onChange={e => setDirectNewSub(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubjectDirect()} placeholder="Nom de la matière (ex: Mathématiques, Français...)" className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm flex-1" />
                                <Button onClick={addSubjectDirect} disabled={!directNewSub.trim() || saving} className="bg-emerald-600 h-9"><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
                            </div>
                        </div>
                        {/* Liste simple */}
                        <div className="space-y-2">
                            {subs.map(s => (
                                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/10">
                                    {editingSubId === s.id ? (
                                        <div className="flex gap-2 flex-1">
                                            <Input value={editSubName} onChange={e => setEditSubName(e.target.value)} onKeyDown={e => e.key === 'Enter' && updateSubject(s.id!)} className="bg-white/5 border-white/10 text-white h-8 rounded-lg text-sm flex-1" autoFocus />
                                            <Input type="number" value={editSubCoef} onChange={e => setEditSubCoef(e.target.value)} className="bg-white/5 border-white/10 text-white h-8 rounded-lg text-sm w-16" placeholder="Coef" />
                                            <Button size="sm" className="bg-emerald-600 h-8" onClick={() => updateSubject(s.id!)}><Save className="w-3 h-3" /></Button>
                                            <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingSubId(null)}><X className="w-3 h-3" /></Button>
                                        </div>
                                    ) : (<>
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-emerald-400" />
                                            <span className="text-sm font-medium">{s.name}</span>
                                            <span className="text-xs text-slate-500">Coef.{s.coefficient}</span>
                                            {s.teacher_id && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600/10 text-emerald-300">{teachers.find((t: any) => t.id === s.teacher_id)?.first_name || 'Prof assigné'}</span>}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => { setEditingSubId(s.id!); setEditSubName(s.name); setEditSubCoef(String(s.coefficient)); }} className="text-emerald-400 hover:text-emerald-300 p-1"><Pencil className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => deleteSubject(s.id!)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </>)}
                                </div>
                            ))}
                        </div>
                        {subs.length === 0 && <div className="text-center py-8 text-slate-500"><BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aucune matière</p></div>}
                    </div>}

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
                                        <div className="flex items-center gap-1.5">
                                            <button onClick={() => exportStudentBulletinPdf(s)} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-600/15 text-indigo-300 hover:bg-indigo-600/25 font-semibold flex items-center gap-1 transition">
                                                <Printer className="w-3 h-3" /> Bulletin
                                            </button>
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
                        <div className="flex justify-end"><Button size="sm" onClick={exportTimetablePdf} className="bg-gradient-to-r from-indigo-600 to-violet-600 text-xs rounded-xl" disabled={ttSlots.length === 0}><Printer className="w-3.5 h-3.5 mr-1" />Exporter PDF</Button></div>
                        <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                            <h3 className="font-bold mb-3">➕ Ajouter un créneau</h3>
                            <div className="grid sm:grid-cols-3 gap-3">
                                <div><Label className="text-slate-400 text-xs">Jour</Label><Sel v={String(ttDay)} onChange={v => setTtDay(+v)} opts={DAYS.map((d, i) => ({ id: String(i + 1), label: d }))} /></div>
                                <div><Label className="text-slate-400 text-xs">Classe</Label><Sel v={ttCls2} onChange={setTtCls2} opts={cls.filter(c => c.id).map(c => ({ id: c.id!, label: c.name }))} /></div>
                                <div><Label className="text-slate-400 text-xs">Matière</Label><Sel v={ttSub2} onChange={setTtSub2} opts={subs.map(s => ({ id: s.id!, label: s.name }))} /></div>
                                <div><Label className="text-slate-400 text-xs">Début</Label><Input type="time" value={ttStart} onChange={e => setTtStart(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                                <div><Label className="text-slate-400 text-xs">Fin</Label><Input type="time" value={ttEnd} onChange={e => setTtEnd(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                                <div><Label className="text-slate-400 text-xs">Salle</Label><Sel v={ttRoom} onChange={setTtRoom} opts={rooms.map(r => ({ id: r.name, label: r.name }))} ph="Sélectionner une salle..." /></div>
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
                                <div><Label className="text-slate-400 text-xs">Matière</Label><Sel v={evSub} onChange={setEvSub} opts={subs.map(s => ({ id: s.id!, label: s.name }))} /></div>
                                <div><Label className="text-slate-400 text-xs">Date</Label><Input type="date" value={evDate} onChange={e => setEvDate(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                                <div><Label className="text-slate-400 text-xs">Note max</Label><Input type="number" value={evMax} onChange={e => setEvMax(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm" /></div>
                            </div>
                            <Button onClick={addEval} disabled={saving} className="mt-3 bg-indigo-600" size="sm">{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}<Plus className="w-4 h-4 mr-1" />Créer</Button>
                        </div>
                        {evals.length > 0 ? evals.map((ev: any) => <div key={ev.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                            {editEvalId === ev.id ? (
                                <div className="space-y-2">
                                    <div className="grid sm:grid-cols-3 gap-2">
                                        <Input value={editEvTitle} onChange={e => setEditEvTitle(e.target.value)} className="bg-white/5 border-white/10 text-white h-8 rounded-lg text-sm" placeholder="Titre" />
                                        <Sel v={editEvType} onChange={setEditEvType} opts={['devoir', 'examen', 'tp', 'oral', 'projet'].map(t => ({ id: t, label: t[0].toUpperCase() + t.slice(1) }))} />
                                        <Input type="number" value={editEvMax} onChange={e => setEditEvMax(e.target.value)} className="bg-white/5 border-white/10 text-white h-8 rounded-lg text-sm" placeholder="Note max" />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" className="bg-emerald-600" onClick={() => updateEval(ev.id)}><Save className="w-3 h-3 mr-1" />Sauvegarder</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditEvalId(null)}><X className="w-3 h-3 mr-1" />Annuler</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-sm">{ev.title}</p>
                                        <p className="text-xs text-slate-500">{ev.subjects?.name} • {ev.classrooms?.name} • /{ev.max_score}{ev.date ? ` • ${ev.date}` : ''}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-300">{ev.type}</span>
                                        <button onClick={() => { onTab('grades'); setTimeout(() => loadGradeEntries(ev), 200); }} className="text-xs px-2 py-1 rounded bg-emerald-600/10 text-emerald-300 hover:bg-emerald-600/20">📝 Notes</button>
                                        <button onClick={() => { setEditEvalId(ev.id); setEditEvTitle(ev.title); setEditEvType(ev.type); setEditEvMax(String(ev.max_score)); }} className="text-indigo-400 hover:text-indigo-300 p-1"><Pencil className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => deleteEval(ev.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                            )}
                        </div>) : <div className="text-center py-8 text-slate-500"><ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aucune évaluation</p></div>}
                    </div>}

                    {/* ═══ PAYMENTS ═══ */}
                    {tab === 'payments' && <div className="space-y-4">
                        <div className="flex justify-end"><Button size="sm" onClick={exportPaymentsPdf} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-xs rounded-xl" disabled={pays.length === 0}><Printer className="w-3.5 h-3.5 mr-1" />Exporter PDF</Button></div>
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
                        {pays.length > 0 ? <div className="space-y-2">{pays.map((p: any) => <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center text-emerald-400 text-xs font-bold">{p.student_profiles?.first_name?.[0]}{p.student_profiles?.last_name?.[0]}</div><div><p className="text-sm font-medium">{p.student_profiles?.first_name} {p.student_profiles?.last_name}</p><p className="text-xs text-slate-500">{p.description} • {p.payment_method} • {new Date(p.paid_at).toLocaleDateString('fr-FR')}</p></div></div><div className="flex items-center gap-2"><button onClick={() => printPaymentReceipt(p)} className="text-xs px-2 py-1 rounded bg-indigo-600/10 text-indigo-300 hover:bg-indigo-600/20 flex items-center gap-1 transition"><Printer className="w-3 h-3" />Reçu</button><span className="text-sm font-bold text-emerald-400">{new Intl.NumberFormat('fr-FR').format(p.amount)} XAF</span></div></div>)}</div> : <div className="text-center py-8 text-slate-500"><CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aucun paiement</p></div>}
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
                                        <Button size="sm" onClick={exportGradesPdf} className="bg-gradient-to-r from-amber-600 to-orange-600 h-8 text-xs"><Printer className="w-3 h-3 mr-1" />PDF</Button>
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

                    {/* ═══ FILE & DIFFUSION WHATSAPP ═══ */}
                    {tab === 'whatsapp' && <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h2 className="font-bold text-lg flex items-center gap-2 text-emerald-400"><PhoneCall className="w-5 h-5" /> Suivi & Diffusion WhatsApp</h2>
                                <p className="text-xs text-slate-400">Gérez la file d'attente des notifications automatiques (notes, reçus, sanctions) et envoyez des messages personnalisés.</p>
                            </div>
                            <Button onClick={loadWhatsAppQueue} disabled={waLoading} size="sm" variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                                {waLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <RefreshCw className="w-4 h-4 mr-1.5" />} Actualiser la file
                            </Button>
                        </div>

                        {/* Stat Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">⏳ En Attente</span>
                                <p className="text-2xl font-black text-amber-300 mt-1">{waQueue.filter(i => i.status === 'en_attente').length}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">✅ Envoyés</span>
                                <p className="text-2xl font-black text-emerald-300 mt-1">{waQueue.filter(i => i.status === 'envoye').length}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                                <span className="text-xs text-red-400 font-semibold uppercase tracking-wider">❌ Échecs</span>
                                <p className="text-2xl font-black text-red-300 mt-1">{waQueue.filter(i => i.status === 'echec').length}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider">📱 Total</span>
                                <p className="text-2xl font-black text-blue-300 mt-1">{waQueue.length}</p>
                            </div>
                        </div>

                        {/* Form: Custom WhatsApp Broadcast */}
                        <div className="p-5 rounded-2xl bg-slate-900/60 border border-emerald-500/20 space-y-4">
                            <h3 className="font-bold text-sm text-emerald-300 flex items-center gap-2">📢 Envoyer un Message WhatsApp Personnalisé</h3>
                            
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-slate-400 mb-1.5 block">Cible du message</Label>
                                    <select
                                        value={waTargetMode}
                                        onChange={e => setWaTargetMode(e.target.value as any)}
                                        className="w-full h-10 px-3 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white">
                                        <option value="single">👤 Un élève / parent spécifique</option>
                                        <option value="class">🏫 Toute une classe</option>
                                        <option value="all_school">📢 Tous les étudiants de l'établissement</option>
                                    </select>
                                </div>

                                {waTargetMode === 'single' && (
                                    <div>
                                        <Label className="text-xs text-slate-400 mb-1.5 block">Sélectionner l'élève</Label>
                                        <select
                                            value={waTargetStudent}
                                            onChange={e => setWaTargetStudent(e.target.value)}
                                            className="w-full h-10 px-3 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white">
                                            <option value="">-- Sélectionner l'élève --</option>
                                            {students.map((s: any) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.first_name} {s.last_name} ({cls.find(c => c.id === s.classroom_id)?.name || 'Sans classe'}) - {s.guardian_phone || s.phone || 'Pas de numéro'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {waTargetMode === 'class' && (
                                    <div>
                                        <Label className="text-xs text-slate-400 mb-1.5 block">Sélectionner la classe</Label>
                                        <select
                                            value={waTargetClass}
                                            onChange={e => setWaTargetClass(e.target.value)}
                                            className="w-full h-10 px-3 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white">
                                            <option value="">-- Sélectionner la classe --</option>
                                            {cls.map((c: any) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name} ({students.filter((s: any) => s.classroom_id === c.id).length} élèves)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div>
                                <Label className="text-xs text-slate-400 mb-1.5 block">Message à diffuser</Label>
                                <textarea
                                    rows={3}
                                    value={waCustomMessage}
                                    onChange={e => setWaCustomMessage(e.target.value)}
                                    placeholder="Ex: Rappel : La réunion des parents d'élèves aura lieu ce vendredi à 15h00..."
                                    className="w-full p-3 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500/50"
                                />
                            </div>

                            <Button
                                onClick={sendCustomWhatsAppBroadcast}
                                disabled={waSending || !waCustomMessage.trim()}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs">
                                {waSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PhoneCall className="w-4 h-4 mr-2" />}
                                Mettre en file d'attente WhatsApp 🚀
                            </Button>
                        </div>

                        {/* Queue Table */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-sm text-slate-300">📋 Historique & File d'attente (100 derniers)</h3>
                                <div className="flex gap-1.5">
                                    {(['all', 'en_attente', 'envoye', 'echec'] as const).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setWaFilter(f)}
                                            className={cn("px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all",
                                                waFilter === f ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-slate-800 text-slate-400 hover:text-white"
                                            )}>
                                            {f === 'all' ? 'Tous' : f === 'en_attente' ? 'En attente' : f === 'envoye' ? 'Envoyés' : 'Échecs'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-900/40">
                                {waQueue.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 text-xs">Aucun message dans la file WhatsApp</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-white/5 text-slate-400 uppercase text-[10px]">
                                                <tr>
                                                    <th className="p-3">Destinataire</th>
                                                    <th className="p-3">Type</th>
                                                    <th className="p-3">Message</th>
                                                    <th className="p-3">Statut</th>
                                                    <th className="p-3">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5 text-slate-300">
                                                {waQueue
                                                    .filter(item => waFilter === 'all' || item.status === waFilter)
                                                    .map(item => (
                                                        <tr key={item.id} className="hover:bg-white/[0.02]">
                                                            <td className="p-3 font-semibold text-white">
                                                                {item.recipient_name}
                                                                <span className="block text-[10px] text-slate-400 font-mono">{item.recipient_phone}</span>
                                                            </td>
                                                            <td className="p-3">
                                                                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-white/10 text-slate-300">
                                                                    {item.message_type}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 max-w-xs truncate text-slate-400" title={item.message}>
                                                                {item.message}
                                                            </td>
                                                            <td className="p-3">
                                                                {item.status === 'en_attente' && (
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                                        ⏳ En attente
                                                                    </span>
                                                                )}
                                                                {item.status === 'envoye' && (
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                                        ✅ Envoyé
                                                                    </span>
                                                                )}
                                                                {item.status === 'echec' && (
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30" title={item.error_log}>
                                                                        ❌ Échec
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="p-3 text-[10px] text-slate-400">
                                                                {new Date(item.created_at).toLocaleString('fr-FR')}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>}

                    {/* ═══ MODÈLES PDF ═══ */}
                    {tab === 'modeles' && <div className="space-y-6">
                        <h2 className="font-bold text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-violet-400" /> Modèles de documents PDF</h2>
                        <p className="text-xs text-slate-500 -mt-3">Choisissez le style des bulletins et reçus générés pour votre établissement. Les étudiants et professeurs verront le modèle sélectionné.</p>

                        {/* Current Term */}
                        <div className="p-5 rounded-xl bg-violet-600/5 border border-violet-500/20">
                            <h3 className="font-bold text-violet-300 mb-3 flex items-center gap-2"><Calendar className="w-4 h-4" /> Période académique active</h3>
                            <div className="grid sm:grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-slate-400 text-xs">Trimestre / Semestre actif</Label>
                                    <Sel v={currentTerm} onChange={setCurrentTerm} opts={[
                                        { id: 'Trimestre 1', label: 'Trimestre 1' }, { id: 'Trimestre 2', label: 'Trimestre 2' }, { id: 'Trimestre 3', label: 'Trimestre 3' },
                                        { id: 'Semestre 1', label: 'Semestre 1' }, { id: 'Semestre 2', label: 'Semestre 2' },
                                        { id: 'Année complète', label: 'Année complète' },
                                    ]} />
                                </div>
                                <div className="flex items-end">
                                    <p className="text-xs text-slate-500">Cette période sera affichée sur les bulletins et reçus générés.</p>
                                </div>
                            </div>
                        </div>

                        {/* Bulletin templates */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2">📊 Modèle de bulletin de notes</h3>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {BULLETIN_TEMPLATES.map(t => (
                                    <button key={t.id} onClick={() => setSelBulletinTemplate(t.id)}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${selBulletinTemplate === t.id
                                            ? 'border-violet-500 bg-violet-600/10 shadow-lg shadow-violet-600/10'
                                            : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-2xl">{t.icon}</span>
                                            <div>
                                                <p className="font-bold text-sm">{t.name}</p>
                                                <p className="text-[9px] text-slate-500">{t.suited}</p>
                                            </div>
                                            {selBulletinTemplate === t.id && <CheckCircle2 className="w-5 h-5 text-violet-400 ml-auto" />}
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed">{t.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Receipt templates */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2">🧾 Modèle de reçu de paiement</h3>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {RECEIPT_TEMPLATES.map(t => (
                                    <button key={t.id} onClick={() => setSelReceiptTemplate(t.id)}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${selReceiptTemplate === t.id
                                            ? 'border-emerald-500 bg-emerald-600/10 shadow-lg shadow-emerald-600/10'
                                            : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-2xl">{t.icon}</span>
                                            <div>
                                                <p className="font-bold text-sm">{t.name}</p>
                                                <p className="text-[9px] text-slate-500">{t.suited}</p>
                                            </div>
                                            {selReceiptTemplate === t.id && <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto" />}
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed">{t.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Save button */}
                        <div className="flex justify-end">
                            <Button onClick={saveTemplateSettings} disabled={savingTemplates} className="bg-gradient-to-r from-violet-600 to-indigo-600 px-8 font-bold rounded-xl shadow-lg shadow-violet-600/25">
                                {savingTemplates ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Sauvegarder les modèles
                            </Button>
                        </div>
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
                                    <Label className="text-slate-400 text-xs">Image bannière</Label>
                                    <div onClick={() => heroImgRef.current?.click()} className="mt-1 w-full p-4 border-2 border-dashed border-white/10 rounded-xl bg-white/[0.02] hover:border-cyan-500/30 transition-colors cursor-pointer text-center">
                                        {lHeroImage ? (
                                            <div className="flex flex-col items-center"><img src={lHeroImage} alt="" className="w-full h-28 rounded-lg object-cover mb-2 border border-white/10" /><p className="text-xs text-slate-400">Cliquer pour changer</p></div>
                                        ) : (
                                            <div className="flex flex-col items-center text-slate-500"><ImagePlus className="w-8 h-8 mb-2" /><p className="font-medium text-sm">Cliquer pour uploader</p><p className="text-xs mt-1">PNG, JPG (max 5 Mo)</p></div>
                                        )}
                                    </div>
                                    <input ref={heroImgRef} type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} />
                                    {uploadingImage && <p className="text-xs text-cyan-400 mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Upload en cours...</p>}
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
                                    <Label className="text-slate-400 text-xs">Image section À propos</Label>
                                    <div onClick={() => aboutImgRef.current?.click()} className="mt-1 w-full p-4 border-2 border-dashed border-white/10 rounded-xl bg-white/[0.02] hover:border-indigo-500/30 transition-colors cursor-pointer text-center">
                                        {lAboutImage ? (
                                            <div className="flex flex-col items-center"><img src={lAboutImage} alt="" className="w-full h-36 rounded-lg object-cover mb-2 border border-white/10" /><p className="text-xs text-slate-400">Cliquer pour changer</p></div>
                                        ) : (
                                            <div className="flex flex-col items-center text-slate-500"><ImagePlus className="w-8 h-8 mb-2" /><p className="font-medium text-sm">Cliquer pour uploader</p></div>
                                        )}
                                    </div>
                                    <input ref={aboutImgRef} type="file" accept="image/*" className="hidden" onChange={handleAboutUpload} />
                                </div>
                            </div>
                        </div>

                        {/* Gallery */}
                        <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                            <h3 className="font-bold mb-3 flex items-center gap-2"><Upload className="w-4 h-4 text-amber-400" /> Galerie photos</h3>
                            <div className="mb-3">
                                <div onClick={() => galleryImgRef.current?.click()} className="w-full p-4 border-2 border-dashed border-white/10 rounded-xl bg-white/[0.02] hover:border-amber-500/30 transition-colors cursor-pointer text-center">
                                    <div className="flex flex-col items-center text-slate-500"><ImagePlus className="w-8 h-8 mb-2" /><p className="font-medium text-sm">Cliquer pour uploader des photos</p><p className="text-xs mt-1">PNG, JPG — plusieurs fichiers possibles</p></div>
                                </div>
                                <input ref={galleryImgRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
                                {uploadingImage && <p className="text-xs text-amber-400 mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Upload en cours...</p>}
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
                        <h2 className="font-bold text-lg flex items-center gap-2"><Palette className="w-5 h-5 text-purple-400" /> Paramètres &amp; Personnalisation</h2>

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
                                                SSL {sDomainSsl === 'active' ? '✓' : '⏳ en cours...'}
                                            </span>
                                            <Button size="sm" variant="ghost" className="text-red-400 h-7 text-xs" onClick={removeDomain}><Trash2 className="w-3 h-3 mr-1" />Retirer</Button>
                                        </div>
                                    </div>
                                    {/* DNS reminder even after activation */}
                                    <DnsInstructions domain={sCustomDomain} />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <Input value={sCustomDomain} onChange={e => setSCustomDomain(e.target.value)}
                                            placeholder="monecole.com ou ecole.mondomaine.com" className="bg-white/5 border-white/10 text-white h-10 rounded-lg flex-1" />
                                        <Button onClick={verifyDomain} disabled={sVerifying || !sCustomDomain.trim()} className="bg-purple-600 shrink-0">
                                            {sVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                                            Enregistrer
                                        </Button>
                                    </div>
                                    <DnsInstructions domain={sCustomDomain || 'monecole.com'} />
                                </div>
                            )}
                        </div>

                        {/* ── BRANDING ── */}
                        <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                            <h3 className="font-bold mb-3 flex items-center gap-2"><Palette className="w-4 h-4 text-pink-400" /> Apparence & Marque</h3>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-slate-400 text-xs">Logo de l&apos;établissement</Label>
                                    <div className="mt-1 flex items-center gap-3">
                                        {sLogoUrl ? (
                                            <img src={sLogoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-contain bg-white/10 p-1 border border-white/10" />
                                        ) : (
                                            <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500"><ImagePlus className="w-6 h-6" /></div>
                                        )}
                                        <div>
                                            <input type="file" accept="image/*" className="hidden" id="settings-logo-upload" onChange={handleSettingsLogoUpload} />
                                            <label htmlFor="settings-logo-upload" className="cursor-pointer px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 text-xs font-medium hover:bg-indigo-600/30 transition inline-flex items-center gap-1">
                                                <Upload className="w-3 h-3" /> {sLogoUrl ? 'Changer' : 'Uploader'}
                                            </label>
                                            {uploadingImage && <p className="text-xs text-indigo-400 mt-1"><Loader2 className="w-3 h-3 animate-spin inline mr-1" />Upload...</p>}
                                        </div>
                                    </div>
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

                    {/* ═══ CURSUS ═══ */}
                    {tab === 'cursus' && <div className="space-y-4">
                        {!cursusLoaded ? (
                            <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-400" /><p className="text-sm text-slate-500 mt-3">Chargement du cursus...</p></div>
                        ) : subs.length === 0 ? (
                            <div className="text-center py-16 text-slate-500"><BookMarked className="w-16 h-16 mx-auto mb-4 opacity-20" /><p>Aucune matière configurée</p></div>
                        ) : subs.map((sub: any) => {
                            const subChapters = adminChapters.filter(c => c.subject_id === sub.id).sort((a: any, b: any) => a.position - b.position);
                            const isExpSub = expandedAdminSub === sub.id;
                            const clsName = cls.find(c => c.id === sub.classroom_id)?.name || '';
                            const teacherName = teachers.find(t => t.id === sub.teacher_id);
                            return (
                                <div key={sub.id} className={`rounded-xl border transition-all ${isExpSub ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
                                    <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedAdminSub(isExpSub ? null : sub.id)}>
                                        <div className="flex items-center gap-3">
                                            <div className="bg-indigo-500/20 p-2 rounded-lg"><BookOpen className="w-4 h-4 text-indigo-400" /></div>
                                            <div>
                                                <p className="text-sm font-bold">{sub.name}</p>
                                                <p className="text-xs text-slate-500">{clsName} • Coef. {sub.coefficient || 1}{teacherName ? ` • ${teacherName.first_name} ${teacherName.last_name}` : ''} • {subChapters.length} ch.</p>
                                            </div>
                                        </div>
                                        <span className="text-slate-500">{isExpSub ? '▲' : '▼'}</span>
                                    </div>
                                    {isExpSub && (
                                        <div className="border-t border-white/5 px-4 pb-4">
                                            {subChapters.length === 0 ? <p className="text-xs text-slate-600 py-4 text-center">Aucun chapitre</p> : subChapters.map((ch: any) => {
                                                const chLessons = adminLessons.filter(l => l.chapter_id === ch.id).sort((a: any, b: any) => a.position - b.position);
                                                const chImages = (ch.resources || []).filter((r: any) => r.type === 'image');
                                                const chFiles = (ch.resources || []).filter((r: any) => r.type === 'resource');
                                                const isExpCh = expandedAdminCh === ch.id;
                                                return (
                                                    <div key={ch.id} className="mt-2">
                                                        <div className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-all ${isExpCh ? 'bg-teal-500/5 border border-teal-500/10' : 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.03]'}`}
                                                            onClick={() => setExpandedAdminCh(isExpCh ? null : ch.id)}>
                                                            <span className="text-xs font-mono text-slate-600 w-5">{ch.position}</span>
                                                            <div className="flex-1">
                                                                <p className="text-sm font-medium">{ch.title}</p>
                                                                {ch.description && <p className="text-[10px] text-slate-500">{ch.description}</p>}
                                                            </div>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded ${ch.status === 'draft' ? 'bg-slate-500/20 text-slate-400' : ch.status === 'published' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>{ch.status === 'draft' ? 'Brouillon' : ch.status === 'published' ? 'Dispensé' : 'Terminé'}</span>
                                                            {chLessons.length > 0 && <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">{chLessons.length} leçon(s)</span>}
                                                            <span className="text-slate-500 text-xs">{isExpCh ? '▲' : '▼'}</span>
                                                        </div>
                                                        {isExpCh && (
                                                            <div className="ml-8 mt-2 space-y-3">
                                                                {/* Chapter content */}
                                                                {editAdminChId === ch.id ? (
                                                                    <div className="space-y-2">
                                                                        <textarea value={editAdminChContent} onChange={e => setEditAdminChContent(e.target.value)} className="w-full min-h-[250px] p-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm leading-relaxed resize-y" placeholder="Contenu du chapitre..." />
                                                                        <div className="flex gap-2">
                                                                            <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-purple-600" onClick={async () => {
                                                                                await supabase.from('chapters').update({ content: editAdminChContent }).eq('id', ch.id);
                                                                                setAdminChapters(adminChapters.map(c => c.id === ch.id ? { ...c, content: editAdminChContent } : c));
                                                                                setEditAdminChId(null); toast.success('Sauvegardé ✅');
                                                                            }}><Save className="w-3 h-3 mr-1" />Sauvegarder</Button>
                                                                            <Button size="sm" variant="ghost" onClick={() => setEditAdminChId(null)}>Annuler</Button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        {ch.content ? <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 mb-2"><RichContentRenderer content={ch.content} /></div> : <p className="text-xs text-slate-600 italic mb-2">Pas de contenu texte</p>}
                                                                        <button onClick={() => { setEditAdminChId(ch.id); setEditAdminChContent(ch.content || ''); }} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"><Edit className="w-3 h-3" />Modifier le contenu</button>
                                                                    </div>
                                                                )}
                                                                {chImages.length > 0 && <div><p className="text-[10px] text-slate-400 mb-1">🖼️ Images</p><div className="grid grid-cols-3 gap-2">{chImages.map((r: any, ri: number) => <img key={ri} src={r.url} alt={r.name} className="w-full rounded-lg border border-white/10 object-cover h-24" />)}</div></div>}
                                                                {chFiles.length > 0 && <div><p className="text-[10px] text-slate-400 mb-1">📎 Ressources</p>{chFiles.map((r: any, ri: number) => <a key={ri} href={r.url} target="_blank" rel="noopener" className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/5 mb-1 text-xs text-slate-300 hover:text-indigo-400"><FileText className="w-3 h-3 text-indigo-400" />{r.name}<Download className="w-3 h-3 ml-auto text-slate-600" /></a>)}</div>}
                                                                {/* Lessons */}
                                                                {chLessons.length > 0 && <div><p className="text-[10px] text-purple-400 font-bold mb-2">📖 Leçons</p>{chLessons.map((lesson: any) => {
                                                                    const lImages = (lesson.resources || []).filter((r: any) => r.type === 'image');
                                                                    const lFiles = (lesson.resources || []).filter((r: any) => r.type === 'resource');
                                                                    return (
                                                                        <div key={lesson.id} className="ml-4 mb-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                                                                            <p className="text-xs font-bold text-purple-300 mb-1">{lesson.position}. {lesson.title}</p>
                                                                            {editAdminLessonId === lesson.id ? (
                                                                                <div className="space-y-2 mt-2">
                                                                                    <textarea value={editAdminLessonContent} onChange={e => setEditAdminLessonContent(e.target.value)} className="w-full min-h-[200px] p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm leading-relaxed resize-y" />
                                                                                    <div className="flex gap-2">
                                                                                        <Button size="sm" className="bg-gradient-to-r from-purple-600 to-indigo-600" onClick={async () => {
                                                                                            await supabase.from('lessons').update({ content: editAdminLessonContent }).eq('id', lesson.id);
                                                                                            setAdminLessons(adminLessons.map(l => l.id === lesson.id ? { ...l, content: editAdminLessonContent } : l));
                                                                                            setEditAdminLessonId(null); toast.success('Leçon sauvegardée ✅');
                                                                                        }}><Save className="w-3 h-3 mr-1" />Sauvegarder</Button>
                                                                                        <Button size="sm" variant="ghost" onClick={() => setEditAdminLessonId(null)}>Annuler</Button>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <>
                                                                                    {lesson.content ? <div className="mb-2"><RichContentRenderer content={lesson.content} /></div> : <p className="text-[10px] text-slate-600 italic mb-1">Pas de contenu</p>}
                                                                                    <button onClick={() => { setEditAdminLessonId(lesson.id); setEditAdminLessonContent(lesson.content || ''); }} className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"><Edit className="w-3 h-3" />Modifier</button>
                                                                                </>
                                                                            )}
                                                                            {lImages.length > 0 && <div className="grid grid-cols-3 gap-2 mt-2">{lImages.map((r: any, ri: number) => <img key={ri} src={r.url} alt={r.name} className="w-full rounded-lg border border-white/10 object-cover h-20" />)}</div>}
                                                                            {lFiles.length > 0 && lFiles.map((r: any, ri: number) => <a key={ri} href={r.url} target="_blank" rel="noopener" className="flex items-center gap-2 p-1.5 rounded bg-white/[0.03] border border-white/5 mt-1 text-[10px] text-slate-300 hover:text-purple-400"><FileText className="w-3 h-3 text-purple-400" />{r.name}<Download className="w-3 h-3 ml-auto text-slate-600" /></a>)}
                                                                        </div>
                                                                    );
                                                                })}</div>}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>}

                    {/* ── CHAT DM ── */}
                    {tab === 'chat' && session && org && (
                        <div className="h-[calc(100vh-120px)]">
                            <ChatDMView
                                orgId={org.id}
                                orgSlug={org.slug}
                                userId={session.id}
                                userName={`${session.first_name || ''} ${session.last_name || ''}`.trim()}
                                userRole="admin"
                            />
                        </div>
                    )}

                    {/* ── GROUPES ── */}
                    {tab === 'groupes' && session && org && (
                        <div className="h-[calc(100vh-120px)]">
                            <GroupesView
                                orgId={org.id}
                                orgSlug={org.slug}
                                userId={session.id}
                                userName={`${session.first_name || ''} ${session.last_name || ''}`.trim()}
                                userRole="admin"
                            />
                        </div>
                    )}

                    {/* ── ACTUS ADMIN ── */}
                    {tab === 'actus' && session && org && (
                        <div className="h-[calc(100vh-120px)] overflow-y-auto">
                            <ActusView
                                orgId={org.id}
                                orgSlug={org.slug}
                                userId={session.id}
                                userName={`${session.first_name || ''} ${session.last_name || ''}`.trim()}
                                userRole="admin"
                            />
                        </div>
                    )}

                    {/* ── SALLE D'ÉVALUATION ── */}
                    {tab === 'exam_room' && session && org && (
                        <div className="h-[calc(100vh-120px)]">
                            <ExamRoomView
                                orgId={org.id}
                                orgSlug={org.slug}
                                userId={session.id}
                                userName={`${session.first_name || ''} ${session.last_name || ''}`.trim()}
                                userRole="admin"
                            />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

// ─── DnsInstructions ─────────────────────────────────────────────────────────
// Reads the platform main domain from Supabase platform_settings, falls back
// to window.location.host. Fully registrar-agnostic — works with Hostinger,
// GoDaddy, OVH, Namecheap, Cloudflare, etc.
function DnsInstructions({ domain }: { domain: string }) {
    const [platformDomain, setPlatformDomain] = useState<string>('');

    useEffect(() => {
        // Try to read from platform_settings table (superadmin configures this once)
        (async () => {
            try {
                const { data } = await supabase.from('platform_settings').select('value').eq('key', 'main_domain').single();
                if (data?.value) {
                    setPlatformDomain(data.value);
                } else {
                    const h = typeof window !== 'undefined' ? window.location.hostname : '';
                    setPlatformDomain(h || 'campusflow.app');
                }
            } catch {
                const h = typeof window !== 'undefined' ? window.location.hostname : '';
                setPlatformDomain(h || 'campusflow.app');
            }
        })();
    }, []);

    const isSubdomain = domain.split('.').length > 2;
    const host = isSubdomain ? domain.split('.')[0] : '@';

    const copy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copié !');
    };

    return (
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
            <h4 className="font-medium text-sm text-slate-300 flex items-center gap-2">
                📋 Configuration DNS
                <span className="text-[10px] text-slate-500 font-normal">
                    (Hostinger, OVH, GoDaddy, Namecheap, Cloudflare…)
                </span>
            </h4>

            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[70px_1fr_1fr] gap-2 text-[10px] text-slate-500 font-semibold uppercase tracking-wider px-1">
                <span>Type</span><span>Host / Nom</span><span>Valeur cible</span>
            </div>

            {/* Row 1 — root domain A record */}
            <div className="flex flex-col sm:grid sm:grid-cols-[70px_1fr_1fr] gap-1 sm:gap-2 text-xs font-mono p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <span className="text-amber-400 font-bold">A</span>
                <span className="text-white">@</span>
                <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400">75.2.60.5</span>
                    <button onClick={() => copy('75.2.60.5')} className="text-slate-600 hover:text-white transition-colors"><Copy className="w-3 h-3" /></button>
                </div>
            </div>

            {/* Row 2 — CNAME for www or subdomain */}
            <div className="flex flex-col sm:grid sm:grid-cols-[70px_1fr_1fr] gap-1 sm:gap-2 text-xs font-mono p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <span className="text-amber-400 font-bold">CNAME</span>
                <span className="text-white">{isSubdomain ? host : 'www'}</span>
                <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400 truncate">{platformDomain || '…'}</span>
                    {platformDomain && <button onClick={() => copy(platformDomain)} className="text-slate-600 hover:text-white transition-colors"><Copy className="w-3 h-3" /></button>}
                </div>
            </div>

            <p className="text-[10px] text-slate-600 leading-relaxed">
                ⏱ Propagation DNS : <strong className="text-slate-500">10 min à 48h</strong> selon votre registrar.
                Après propagation, le SSL est généré automatiquement.
            </p>
        </div>
    );
}
