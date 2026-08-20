'use client';

import { useEffect, useState, useRef, Component, type ReactNode, type ErrorInfo } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { GraduationCap, Plus, Trash2, ArrowRight, ArrowLeft, BookOpen, Users, Settings, Calendar, CreditCard, Home, School, CheckCircle2, Loader2, Link2, Bell, ShieldCheck, UserPlus, ClipboardList, Globe, BookMarked, ShoppingBag, MessageSquare, BarChart3, Search, Edit, Save, X, Download, Filter, Palette, ExternalLink, Copy, RefreshCw, Upload, LayoutDashboard, Printer, Pencil, ImagePlus, Building2, FileText, Receipt, PhoneCall, ClipboardCheck, Eye, Award, Volume2, Play, Pause, Maximize2, FileDown, Lock, KeyRound, Coins, Sparkles, Ban, CheckCircle, LogOut, AlertCircle, Send, Mail, Bot } from 'lucide-react';
import { ExamRoomView } from '@/components/campus/exam-room/exam-room-view';
import { BULLETIN_TEMPLATES, generateBulletinPDF, type BulletinData } from '@/lib/bulletin-pdf';
import { RECEIPT_TEMPLATES, generateReceiptPDF, generateReceiptNumber, type ReceiptData } from '@/lib/receipt-pdf';
import { CERTIFICATE_TEMPLATES, generateCertificatePDF, type CertificateData } from '@/lib/certificate-pdf';
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
import { AdminCursus } from '@/components/campus/cursus/admin-cursus';
import { queueGradeNotification, queuePaymentReceipt, queueDisciplineAlert, enqueueWhatsAppMessage } from '@/lib/whatsapp-queue';
import { cn } from '@/lib/utils';
import { isCustomDomain } from '@/lib/custom-domain';
import { AdsBanner } from '@/components/campus/ads-banner';
import { OfficialAnnouncements } from '@/components/campus/official-announcements';
import { AdminPremiumStyles } from '@/components/campus/admin-premium-styles';
import { AdminNotificationBell } from '@/components/admin/AdminNotificationBell';
import { ReviewSection } from '@/components/shared/ReviewSection';
import { BugReportButton } from '@/components/shared/BugReportButton';
import { EmailModal } from '@/components/campus/email-modal';
import { IziTeachLogo } from '@/components/brand/iziteach-logo';
import { AiAgentsManager } from '@/components/admin/AiAgentsManager';

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

type Tab = 'general' | 'landing' | 'premium_styles' | 'setup' | 'classes' | 'rooms' | 'subjects' | 'teachers' | 'students' | 'timetable' | 'evaluations' | 'grades' | 'payments' | 'disciplines' | 'modeles' | 'cursus' | 'settings' | 'chat' | 'stories' | 'actus' | 'groupes' | 'whatsapp' | 'exam_room' | 'monitoring' | 'certificates' | 'ai_agents';
interface Cls { id?: string; name: string; cycle: string; filiere_id: string | null; level: number; capacity: number; }
interface Sub { id?: string; name: string; code: string; coefficient: number; classroom_id: string; teacher_id: string | null; }
interface Room { id?: string; name: string; }

const SIDES = [
    { id: 'general' as Tab, icon: Home, label: 'Général' },
    { id: 'landing' as Tab, icon: LayoutDashboard, label: 'Page d\'accueil' },
    { id: 'premium_styles' as Tab, icon: Sparkles, label: '✨ Style Premium' },
    { id: 'setup' as Tab, icon: Settings, label: 'Configuration' },
    { id: 'classes' as Tab, icon: School, label: 'Classes & Matières' }, { id: 'rooms' as Tab, icon: Building2, label: 'Salles' },
    { id: 'teachers' as Tab, icon: Users, label: 'Professeurs' }, { id: 'students' as Tab, icon: GraduationCap, label: 'Étudiants' },
    { id: 'certificates' as Tab, icon: Award, label: '🎓 Certificats' },
    { id: 'timetable' as Tab, icon: Calendar, label: 'Emploi du temps' }, { id: 'evaluations' as Tab, icon: ClipboardList, label: 'Évaluations' },
    { id: 'grades' as Tab, icon: BarChart3, label: 'Notes' },
    { id: 'payments' as Tab, icon: CreditCard, label: 'Paiements' }, { id: 'disciplines' as Tab, icon: ShieldCheck, label: 'Discipline' },
    { id: 'whatsapp' as Tab, icon: PhoneCall, label: '📱 File WhatsApp' },
    { id: 'modeles' as Tab, icon: FileText, label: 'Modèles PDF' },
    { id: 'cursus' as Tab, icon: BookMarked, label: 'Cursus' },
    { id: 'chat' as Tab, icon: MessageSquare, label: 'Chat DM' },
    { id: 'groupes' as Tab, icon: Users, label: 'Groupes' },
    { id: 'monitoring' as Tab, icon: Eye, label: '👁️ Monitoring Chats' },
    { id: 'actus' as Tab, icon: Bell, label: 'Actus' },
    { id: 'exam_room' as Tab, icon: ClipboardCheck, label: '🏛️ Salle d\'Évaluation' },
    { id: 'settings' as Tab, icon: Palette, label: 'Paramètres' },
    { id: 'ai_agents' as Tab, icon: Bot, label: '🤖 Sky Agent' },
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
    // ── Suspension Appeal state ──
    const [appealMessage, setAppealMessage] = useState('');
    const [appealSubmitted, setAppealSubmitted] = useState(false);
    const [submittingAppeal, setSubmittingAppeal] = useState(false);
    // ── Email notification modal ──
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    // ── Inscription requests (demandes en attente) ──
    const [inscRequests, setInscRequests] = useState<any[]>([]);
    const [inscLoaded, setInscLoaded] = useState(false);
    const [inscActionId, setInscActionId] = useState<string | null>(null);
    const [inscMsg, setInscMsg] = useState('');
    const [inscSaving, setInscSaving] = useState(false);
    // ── Monitoring conversations ──
    const [monitoringConvs, setMonitoringConvs] = useState<any[]>([]);
    const [monitoringLoaded, setMonitoringLoaded] = useState(false);
    const [monitoringActiveConv, setMonitoringActiveConv] = useState<any>(null);
    const [monitoringMessages, setMonitoringMessages] = useState<any[]>([]);
    const [monitoringLoadingMsgs, setMonitoringLoadingMsgs] = useState(false);
    const [monitoringSearch, setMonitoringSearch] = useState('');
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
    // Combined Classes & Subjects state
    const [addingSubForClassId, setAddingSubForClassId] = useState<string | null>(null);
    const [classSubName, setClassSubName] = useState('');
    const [classSubCoef, setClassSubCoef] = useState('1');
    const [classSubTeacher, setClassSubTeacher] = useState('');
    const [classSearch, setClassSearch] = useState('');
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
    // ── Tâche 2 : Students tab new features ──
    const [studentSubTab, setStudentSubTab] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
    // Edit student modal
    const [editStudentId, setEditStudentId] = useState<string | null>(null);
    const [editStudentData, setEditStudentData] = useState<any>(null);
    const [savingStudent, setSavingStudent] = useState(false);
    // Migrate filière modal
    const [migrateStudentId, setMigrateStudentId] = useState<string | null>(null);
    const [migrateStudentName, setMigrateStudentName] = useState('');
    const [migrateNewFiliereId, setMigrateNewFiliereId] = useState('');
    const [migrateNewClsId, setMigrateNewClsId] = useState('');
    const [savingMigrate, setSavingMigrate] = useState(false);
    // Filieres list
    const [filieres, setFilieres] = useState<any[]>([]);
    // Chat detail for inscription requests
    const [chatDetailId, setChatDetailId] = useState<string | null>(null);
    // Send new info_needed form flag
    const [sendFormReqId, setSendFormReqId] = useState<string | null>(null);
    const [sendFormMsg, setSendFormMsg] = useState('');
    // ── Tâche 3 : Suspension + Relevé de notes ──
    const [suspendModal, setSuspendModal] = useState<{ id: string; name: string; type: 'student' | 'teacher'; isSuspended: boolean } | null>(null);
    const [suspendReason, setSuspendReason] = useState('');
    const [savingSuspend, setSavingSuspend] = useState(false);
    // Settings / Domain
    // Template selection state
    const [selBulletinTemplate, setSelBulletinTemplate] = useState(1);
    const [selReceiptTemplate, setSelReceiptTemplate] = useState(1);
    const [currentTerm, setCurrentTerm] = useState('Trimestre 1');
    const [savingTemplates, setSavingTemplates] = useState(false);
    const [sCustomDomain, setSCustomDomain] = useState(''); const [sDomainVerified, setSDomainVerified] = useState(false);
    const [sDomainSsl, setSDomainSsl] = useState('pending'); const [sBrandColor, setSBrandColor] = useState('#4f46e5');
    const [sLogoUrl, setSLogoUrl] = useState(''); const [sFaviconUrl, setSFaviconUrl] = useState('');
    const [sSignatureUrl, setSSignatureUrl] = useState('');
    const [sStampUrl, setSStampUrl] = useState('');
    const [uploadingSignature, setUploadingSignature] = useState(false);
    const [uploadingStamp, setUploadingStamp] = useState(false);
    const [sMetaTitle, setSMetaTitle] = useState(''); const [sMetaDesc, setSMetaDesc] = useState('');
    const [sOrgName, setSOrgName] = useState(''); const [sOrgPhone, setSOrgPhone] = useState('');
    const [sOrgEmail, setSOrgEmail] = useState(''); const [sOrgWhatsapp, setSOrgWhatsapp] = useState('');
    const [sVerifying, setSVerifying] = useState(false); const [sSavingSettings, setSSavingSettings] = useState(false);
    // Modal image zoom
    const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);
    // Certificat State
    const [certStudentId, setCertStudentId] = useState<string>('');
    const [certTitle, setCertTitle] = useState('CERTIFICAT DE FIN DE FORMATION');
    const [certSubtitle, setCertSubtitle] = useState('ATTESTATION DE RÉUSSITE ACADÉMIQUE');
    const [certCourseName, setCertCourseName] = useState('');
    const [certMention, setCertMention] = useState('Mention Très Bien');
    const [certDate, setCertDate] = useState(() => new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }));
    const [certLocation, setCertLocation] = useState('');
    const [certSignatory1Title, setCertSignatory1Title] = useState('Le Directeur Général');
    const [certSignatory1Name, setCertSignatory1Name] = useState('');
    const [certSignatory2Title, setCertSignatory2Title] = useState('Le Responsable Pédagogique');
    const [certSignatory2Name, setCertSignatory2Name] = useState('');
    const [certTemplate, setCertTemplate] = useState(1);
    const [certShowStamp, setCertShowStamp] = useState(true);
    const [certShowSignature, setCertShowSignature] = useState(true);

    // ── Sky Points & Security PIN State ──
    const [adminSkyPoints, setAdminSkyPoints] = useState<number>(1000);
    const [monitoringUnlocked, setMonitoringUnlocked] = useState<boolean>(false);
    const [adminSecurityPin, setAdminSecurityPin] = useState<string | null>(null);
    const [pinModalOpen, setPinModalOpen] = useState(false);
    const [pinModalMode, setPinModalMode] = useState<'set_pin' | 'verify_pin' | 'change_pin'>('verify_pin');
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [pendingDocName, setPendingDocName] = useState<string>('');
    const [pendingCost, setPendingCost] = useState<number>(1);
    const [pinInput, setPinInput] = useState('');
    const [pinConfirmInput, setPinConfirmInput] = useState('');
    const [oldPinInput, setOldPinInput] = useState('');
    const [pinError, setPinError] = useState('');
    const [pinLoading, setPinLoading] = useState(false);
    const [showPointsModal, setShowPointsModal] = useState(false);

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
    const [lHeroTemplate, setLHeroTemplate] = useState<'full' | 'split' | 'minimal'>('full');
    const [lAboutText, setLAboutText] = useState(''); const [lAboutImage, setLAboutImage] = useState('');
    const [lGalleryImages, setLGalleryImages] = useState<string[]>([]); const [lGalleryInput, setLGalleryInput] = useState('');
    const [lSocialFb, setLSocialFb] = useState(''); const [lSocialIg, setLSocialIg] = useState(''); const [lSocialTw, setLSocialTw] = useState('');
    const [lSocialTt, setLSocialTt] = useState(''); const [lSocialYt, setLSocialYt] = useState(''); const [lSocialLi, setLSocialLi] = useState('');
    const [lFooterText, setLFooterText] = useState(''); const [lSaving, setLSaving] = useState(false);
    const loadTemplateSettings = () => { if (!org) return; setSelBulletinTemplate(org.bulletin_template || 1); setSelReceiptTemplate(org.receipt_template || 1); setCurrentTerm(org.current_term || 'Trimestre 1'); };
    const saveTemplateSettings = async () => { setSavingTemplates(true); try { const updates = { bulletin_template: selBulletinTemplate, receipt_template: selReceiptTemplate, current_term: currentTerm }; const { error } = await supabase.from('organizations').update(updates).eq('id', org.id); if (error) throw error; setOrg({ ...org, ...updates }); toast.success('Modèles sauvegardés ✅'); } catch (e: any) { toast.error(e.message); } setSavingTemplates(false); };
    // ── Helper Déduction Sky Points ──
    const deductSkyPoints = async (amount: number, reason: string): Promise<boolean> => {
        if (adminSkyPoints < amount) {
            toast.error(`Solde insuffisant : ${amount} Sky Point(s) requis (Solde actuel : ${adminSkyPoints} pts)`);
            return false;
        }
        const newBal = adminSkyPoints - amount;
        setAdminSkyPoints(newBal);
        if (typeof window !== 'undefined' && org?.id) {
            localStorage.setItem(`campusflow_admin_points_${org.id}`, newBal.toString());
        }
        try {
            await supabase.from('organizations').update({ sky_points: newBal }).eq('id', org.id);
        } catch (e: any) {
            console.warn('[SkyPoints] Update error:', e);
        }
        return true;
    };

    // ── Helper Protection PIN & Export ──
    const requestPinProtectedAction = ({
        docName,
        cost = 1,
        onApproved
    }: {
        docName: string;
        cost?: number;
        onApproved: () => void;
    }) => {
        setPendingDocName(docName);
        setPendingCost(cost);
        setPendingAction(() => onApproved);
        setPinInput('');
        setPinConfirmInput('');
        setOldPinInput('');
        setPinError('');

        if (!adminSecurityPin) {
            setPinModalMode('set_pin');
        } else {
            setPinModalMode('verify_pin');
        }
        setPinModalOpen(true);
    };

    const handlePinSubmit = async () => {
        setPinError('');
        if (pinModalMode === 'set_pin') {
            if (pinInput.length < 4 || pinInput.length > 6 || !/^\d+$/.test(pinInput)) {
                setPinError('Le code PIN doit comporter entre 4 et 6 chiffres.');
                return;
            }
            if (pinInput !== pinConfirmInput) {
                setPinError('Les deux codes PIN ne correspondent pas.');
                return;
            }
            setPinLoading(true);
            try {
                await supabase.from('organizations').update({ security_pin: pinInput }).eq('id', org.id);
                if (typeof window !== 'undefined') localStorage.setItem(`campusflow_admin_pin_${org.id}`, pinInput);
                setAdminSecurityPin(pinInput);
                toast.success('🛡️ Code PIN de sécurité configuré avec succès !');

                if (pendingAction) {
                    const ok = await deductSkyPoints(pendingCost, pendingDocName);
                    if (ok) {
                        setPinModalOpen(false);
                        pendingAction();
                        toast.success(`⭐ -${pendingCost} Sky Point déduit (${pendingDocName})`);
                    }
                } else {
                    setPinModalOpen(false);
                }
            } catch (e: any) {
                setPinError(e.message || 'Erreur lors de la sauvegarde du PIN');
            } finally {
                setPinLoading(false);
            }
        } else if (pinModalMode === 'verify_pin') {
            if (pinInput !== adminSecurityPin) {
                setPinError('❌ Code PIN incorrect. Accès refusé.');
                return;
            }
            if (adminSkyPoints < pendingCost) {
                setPinError(`Solde insuffisant : ${pendingCost} Sky Point(s) requis (Solde actuel : ${adminSkyPoints} pts).`);
                return;
            }
            setPinLoading(true);
            const ok = await deductSkyPoints(pendingCost, pendingDocName);
            setPinLoading(false);
            if (ok) {
                setPinModalOpen(false);
                if (pendingAction) {
                    pendingAction();
                    toast.success(`⭐ -${pendingCost} Sky Point déduit (${pendingDocName})`);
                }
            }
        } else if (pinModalMode === 'change_pin') {
            if (oldPinInput !== adminSecurityPin) {
                setPinError('L\'ancien code PIN est incorrect.');
                return;
            }
            if (pinInput.length < 4 || pinInput.length > 6 || !/^\d+$/.test(pinInput)) {
                setPinError('Le nouveau code PIN doit comporter entre 4 et 6 chiffres.');
                return;
            }
            if (pinInput !== pinConfirmInput) {
                setPinError('Les deux nouveaux codes PIN ne correspondent pas.');
                return;
            }
            setPinLoading(true);
            try {
                await supabase.from('organizations').update({ security_pin: pinInput }).eq('id', org.id);
                if (typeof window !== 'undefined') localStorage.setItem(`campusflow_admin_pin_${org.id}`, pinInput);
                setAdminSecurityPin(pinInput);
                toast.success('🛡️ Code PIN modifié avec succès !');
                setPinModalOpen(false);
            } catch (e: any) {
                setPinError(e.message || 'Erreur');
            } finally {
                setPinLoading(false);
            }
        }
    };

    // ── Helper Déblocage Monitoring ──
    const unlockMonitoring = async () => {
        if (adminSkyPoints < 10) {
            toast.error('Solde insuffisant : 10 Sky Points requis pour débloquer le Monitoring.');
            return;
        }
        const ok = await deductSkyPoints(10, 'Déblocage Monitoring Conversations');
        if (ok) {
            setMonitoringUnlocked(true);
            try {
                await supabase.from('organizations').update({ monitoring_unlocked: true }).eq('id', org.id);
                if (typeof window !== 'undefined') localStorage.setItem(`campusflow_monitoring_unlocked_${org.id}`, 'true');
            } catch (e: any) {
                console.warn('[Monitoring] Update error:', e);
            }
            toast.success('🎉 Monitoring des conversations débloqué à vie (-10 Sky Points) !', { duration: 6000 });
        }
    };

    const printPaymentReceipt = (p: any) => {
        const stu = students.find((s: any) => s.id === p.student_id);
        const stuName = stu ? `${stu.first_name} ${stu.last_name}` : (p.student_profiles?.first_name ? `${p.student_profiles.first_name} ${p.student_profiles.last_name}` : 'Élève');
        requestPinProtectedAction({
            docName: `Reçu de paiement — ${stuName}`,
            cost: 1,
            onApproved: () => {
                const receiptData: ReceiptData = {
                    org: {
                        name: org.name,
                        logo_url: org.logo_url,
                        signature_url: org.signature_url,
                        stamp_url: org.stamp_url,
                        phone: org.phone,
                        email: org.email,
                        city: org.city,
                        country: org.country
                    },
                    student: {
                        first_name: stu?.first_name || p.student_profiles?.first_name || '',
                        last_name: stu?.last_name || p.student_profiles?.last_name || '',
                        matricule: stu?.matricule || p.student_profiles?.matricule,
                        classroom_name: cls.find(c => c.id === stu?.classroom_id)?.name || ''
                    },
                    payment: {
                        id: p.id,
                        amount: p.amount,
                        currency: p.currency || 'XAF',
                        method: p.payment_method,
                        description: p.description || 'Paiement scolarité',
                        paid_at: p.paid_at
                    },
                    receiptNumber: generateReceiptNumber()
                };
                generateReceiptPDF(receiptData, org.receipt_template || 1);
            }
        });
    };
    const loadSettings = () => { if (!org) return; setSCustomDomain(org.custom_domain || ''); setSDomainVerified(org.domain_verified || false); setSDomainSsl(org.domain_ssl_status || 'pending'); setSBrandColor(org.brand_color || '#4f46e5'); setSLogoUrl(org.logo_url || ''); setSSignatureUrl(org.signature_url || ''); setSStampUrl(org.stamp_url || ''); setSFaviconUrl(org.favicon_url || ''); setSMetaTitle(org.meta_title || ''); setSMetaDesc(org.meta_description || ''); setSOrgName(org.name || ''); setSOrgPhone(org.phone || ''); setSOrgEmail(org.email || ''); setSOrgWhatsapp(org.whatsapp || ''); };
    const loadLanding = () => {
        if (!org) return;
        setLHeroImage(org.hero_image_url || '');
        setLHeroTitle(org.hero_title || '');
        setLHeroSubtitle(org.hero_subtitle || '');
        const localTpl = typeof window !== 'undefined' ? (localStorage.getItem(`campusflow_hero_template_${org.id}`) || localStorage.getItem(`campusflow_hero_template_${org.slug}`)) : null;
        setLHeroTemplate((org.hero_template as any) || (localTpl as any) || 'full');
        setLAboutText(org.about_text || '');
        setLAboutImage(org.about_image_url || '');
        setLGalleryImages(org.gallery_images || []);
        setLSocialFb(org.social_facebook || '');
        setLSocialIg(org.social_instagram || '');
        setLSocialTw(org.social_twitter || '');
        setLSocialTt(org.social_tiktok || '');
        setLSocialYt(org.social_youtube || '');
        setLSocialLi(org.social_linkedin || '');
        setLFooterText(org.footer_text || '');
    };
    const saveLanding = async () => {
        setLSaving(true);
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem(`campusflow_hero_template_${org.id}`, lHeroTemplate);
                localStorage.setItem(`campusflow_hero_template_${org.slug}`, lHeroTemplate);
            }
            const updates: any = {
                hero_image_url: lHeroImage || null,
                hero_title: lHeroTitle || null,
                hero_subtitle: lHeroSubtitle || null,
                hero_template: lHeroTemplate,
                about_text: lAboutText || null,
                about_image_url: lAboutImage || null,
                gallery_images: lGalleryImages,
                social_facebook: lSocialFb || null,
                social_instagram: lSocialIg || null,
                social_twitter: lSocialTw || null,
                social_tiktok: lSocialTt || null,
                social_youtube: lSocialYt || null,
                social_linkedin: lSocialLi || null,
                footer_text: lFooterText || null
            };
            let { error } = await supabase.from('organizations').update(updates).eq('id', org.id);

            // Fallback si la colonne hero_template n'est pas encore créée en base Supabase
            if (error && error.message?.includes('hero_template')) {
                delete updates.hero_template;
                const retry = await supabase.from('organizations').update(updates).eq('id', org.id);
                error = retry.error;
            }

            if (error) throw error;
            setOrg({ ...org, ...updates, hero_template: lHeroTemplate });
            toast.success("Page d'accueil mise à jour ✅");
        } catch (e: any) {
            toast.error(e.message);
        }
        setLSaving(false);
    };
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
                // ── Fallback Signature & Cachet ──
                const localSig = typeof window !== 'undefined' ? localStorage.getItem(`campusflow_signature_${o.id}`) : null;
                const localStp = typeof window !== 'undefined' ? localStorage.getItem(`campusflow_stamp_${o.id}`) : null;
                if (!o.signature_url && localSig) o.signature_url = localSig;
                if (!o.stamp_url && localStp) o.stamp_url = localStp;

                setOrg(o);
                setSession({ id: authUser.id, first_name: authUser.user_metadata?.first_name || 'Admin', last_name: authUser.user_metadata?.last_name || '' });

                // ── Sky Points & PIN Initialisation ──
                // Supabase est la source de vérité prioritaire si remotePts existe.
                const localSavedPtsStr = typeof window !== 'undefined' ? localStorage.getItem(`campusflow_admin_points_${o.id}`) : null;
                const localSavedPts = localSavedPtsStr !== null ? parseInt(localSavedPtsStr, 10) : null;
                const remotePts = (typeof o.sky_points === 'number' && !isNaN(o.sky_points) && o.sky_points >= 0) ? o.sky_points : null;

                let currentPts = 1000;
                if (remotePts !== null) {
                    currentPts = remotePts;
                } else if (localSavedPts !== null && !isNaN(localSavedPts) && localSavedPts >= 0) {
                    currentPts = localSavedPts;
                }

                if (typeof window !== 'undefined') {
                    localStorage.setItem(`campusflow_admin_points_${o.id}`, currentPts.toString());
                }
                // Ne resynchroniser vers Supabase QUE si Supabase n'avait pas encore de valeur (première init)
                if (remotePts === null && localSavedPts !== null) {
                    void (async () => { try { await supabase.from('organizations').update({ sky_points: currentPts }).eq('id', o.id); } catch {} })();
                }
                setAdminSkyPoints(currentPts);

                const localMonitoring = typeof window !== 'undefined' ? localStorage.getItem(`campusflow_monitoring_unlocked_${o.id}`) === 'true' : false;
                setMonitoringUnlocked(Boolean(o.monitoring_unlocked || localMonitoring));

                const savedPin = o.security_pin || (typeof window !== 'undefined' ? localStorage.getItem(`campusflow_admin_pin_${o.id}`) : null);
                setAdminSecurityPin(savedPin || null);

                // ── Daily Bonus Check (+1 Sky Point gratuit par jour) ──
                const todayStr = new Date().toISOString().split('T')[0];
                const lastClaim = o.last_daily_claim || (typeof window !== 'undefined' ? localStorage.getItem(`campusflow_admin_daily_${o.id}`) : null);
                if (lastClaim && lastClaim !== todayStr) {
                    const rewardedPts = currentPts + 1;
                    setAdminSkyPoints(rewardedPts);
                    if (typeof window !== 'undefined') {
                        localStorage.setItem(`campusflow_admin_points_${o.id}`, rewardedPts.toString());
                        localStorage.setItem(`campusflow_admin_daily_${o.id}`, todayStr);
                    }
                    void (async () => { try { await supabase.from('organizations').update({ sky_points: rewardedPts, last_daily_claim: todayStr }).eq('id', o.id); } catch {} })();
                    toast.success(`⭐ +1 Sky Point quotidien offert ! Solde actuel : ${rewardedPts} pts`, { duration: 5000, icon: '🎁' });
                } else if (!lastClaim) {
                    if (typeof window !== 'undefined') {
                        localStorage.setItem(`campusflow_admin_daily_${o.id}`, todayStr);
                    }
                    void (async () => { try { await supabase.from('organizations').update({ last_daily_claim: todayStr }).eq('id', o.id); } catch {} })();
                }
                const { data: c } = await supabase.from('classrooms').select('*').eq('organization_id', o.id).order('name');
                if (cancelled) return;
                setCls((c || []).map((x: any) => ({ id: x.id, name: x.name, cycle: x.cycle || '', filiere_id: x.filiere_id, level: x.level || 1, capacity: x.capacity || 50 })));
                const { data: s } = await supabase.from('subjects').select('*').eq('organization_id', o.id).order('name');
                if (cancelled) return;
                setSubs((s || []).map((x: any) => ({ id: x.id, name: x.name, code: x.code || '', coefficient: x.coefficient || 1, classroom_id: x.classroom_id, teacher_id: x.teacher_id })));
                const { data: t } = await supabase.from('teacher_profiles').select('id, organization_id, first_name, last_name, speciality, email, phone, nationality, marital_status, children_count, residence, access_code, pin_set, created_at').eq('organization_id', o.id);
                if (cancelled) return;
                setTeachers(t || []);
                const { data: st } = await supabase.from('student_profiles').select('id, organization_id, first_name, last_name, sex, birth_date, classroom_id, filiere_id, phone, guardian_name, guardian_phone, nationality, residence, matricule, access_code, pin_set, approval_status, photo_url, sky_points, created_at, email, address').eq('organization_id', o.id);
                if (cancelled) return;
                setStudents(st || []);
                // Charger les demandes d'inscription en attente
                const { data: ir } = await supabase.from('inscription_requests')
                    .select('*').eq('organization_id', o.id).order('created_at', { ascending: false });
                if (!cancelled) { setInscRequests(ir || []); setInscLoaded(true); }
                // Load rooms
                const { data: rm } = await supabase.from('rooms').select('*').eq('organization_id', o.id).order('name');
                if (cancelled) return;
                setRooms((rm || []).map((x: any) => ({ id: x.id, name: x.name })));
                // Charger les filières (table globale, pas de filtre organization_id)
                const { data: fil } = await supabase.from('filieres').select('id, nom').order('nom');
                if (!cancelled) setFilieres(fil || []);
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

    // ── SUPABASE REALTIME : Écoute des réponses des étudiants aux demandes d'info ──
    useEffect(() => {
        if (!org?.id) return;

        const channel = supabase.channel(`realtime_admin_inscriptions_${org.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'inscription_requests',
            }, (payload) => {
                const created = payload.new as any;
                if (!created || created.organization_id !== org.id) return;
                // Ajouter la nouvelle demande en tête de liste
                setInscRequests(prev => [created, ...prev.filter(r => r.id !== created.id)]);
                toast.success(
                    `📋 Nouvelle inscription : ${created.first_name} ${created.last_name}`,
                    { duration: 6000, icon: '🎓' }
                );
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'inscription_requests',
            }, (payload) => {
                const updated = payload.new as any;
                if (!updated || updated.organization_id !== org.id) return;

                // Mettre à jour la liste locale
                setInscRequests(prev => prev.map((r: any) =>
                    r.id === updated.id ? { ...r, ...updated } : r
                ));

                // Notifier l'admin si l'étudiant a envoyé une réponse
                if (updated.student_response && updated.status === 'pending') {
                    toast.success(
                        `📩 ${updated.first_name} ${updated.last_name} a répondu à votre demande !`,
                        { duration: 6000, icon: '💬' }
                    );
                }
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'student_profiles',
            }, (payload) => {
                const created = payload.new as any;
                if (!created || created.organization_id !== org.id) return;
                setStudents(prev => [created, ...prev.filter(s => s.id !== created.id)]);
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'student_profiles',
            }, (payload) => {
                const updated = payload.new as any;
                if (!updated || updated.organization_id !== org.id) return;
                setStudents(prev => prev.map((s: any) =>
                    s.id === updated.id ? { ...s, ...updated } : s
                ));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [org?.id]);

    // ── SUPABASE REALTIME : Écoute de tous les messages de chat pour le Monitoring & Alertes Admin ──
    useEffect(() => {
        if (!org?.id) return;

        const chatChannel = supabase.channel(`realtime_admin_monitoring_${org.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
            }, async (payload) => {
                const newMsg = payload.new as any;
                if (!newMsg) return;

                // Récupérer le nom et type de conversation
                const { data: conv } = await supabase.from('chat_conversations')
                    .select('id, name, type, organization_id')
                    .eq('id', newMsg.conversation_id)
                    .maybeSingle();

                if (!conv || conv.organization_id !== org.id) return;

                // Identifier l'expéditeur
                const senderStu = students.find((s: any) => s.id === newMsg.sender_id);
                const senderProf = teachers.find((t: any) => t.id === newMsg.sender_id);
                const senderName = senderStu ? `${senderStu.first_name} ${senderStu.last_name}` :
                                   senderProf ? `Prof. ${senderProf.first_name} ${senderProf.last_name}` : 'Utilisateur';

                const convTitle = conv.name || (conv.type === 'direct' ? 'Message Direct' : 'Groupe');
                const snippet = newMsg.msg_type === 'voice' ? '🎙️ Message vocal' :
                                newMsg.msg_type === 'image' ? '📷 Photo reçue' :
                                newMsg.msg_type === 'file' ? '📎 Fichier joint' : (newMsg.content || '');

                toast.info(`💬 Nouveau message : ${senderName} (${convTitle})`, {
                    description: snippet.substring(0, 80),
                    duration: 5000,
                    icon: '👁️',
                });

                // Mettre à jour la conversation active si actuellement ouverte
                setMonitoringMessages(prev => {
                    if (monitoringActiveConv?.id === newMsg.conversation_id) {
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    }
                    return prev;
                });

                // Mettre à jour la liste des conversations du monitoring
                setMonitoringConvs(prev => {
                    const match = prev.find(c => c.id === newMsg.conversation_id);
                    if (match) {
                        return prev.map(c => c.id === newMsg.conversation_id ? {
                            ...c,
                            lastMessage: snippet,
                            lastMessageAt: newMsg.created_at,
                            lastMsgType: newMsg.msg_type,
                            totalMessages: (c.totalMessages || 0) + 1,
                        } : c).sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
                    }
                    return prev;
                });
            })
            .subscribe();

        return () => { supabase.removeChannel(chatChannel); };
    }, [org?.id, monitoringActiveConv?.id, students, teachers]);

    // ── SUPABASE REALTIME & AUTO-SYNC : Écoute des mises à jour de l'organisation (Sky Points, statut actif) ──
    useEffect(() => {
        if (!org?.id) return;

        // 1. Realtime postgres changes on organizations
        const orgSub = supabase
            .channel(`admin_org_realtime_${org.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'organizations',
                filter: `id=eq.${org.id}`
            }, (payload: any) => {
                if (payload.new) {
                    if (typeof payload.new.sky_points === 'number') {
                        setAdminSkyPoints(payload.new.sky_points);
                        if (typeof window !== 'undefined') {
                            localStorage.setItem(`campusflow_admin_points_${org.id}`, payload.new.sky_points.toString());
                        }
                    }
                    if (typeof payload.new.is_active === 'boolean') {
                        setOrg((prev: any) => prev ? { ...prev, is_active: payload.new.is_active, suspension_reason: payload.new.suspension_reason } : prev);
                    }
                }
            })
            .subscribe();

        // 2. Periodic sync every 15s for rock-solid consistency
        const pollTimer = setInterval(async () => {
            const { data: freshOrg } = await supabase
                .from('organizations')
                .select('sky_points, is_active, suspension_reason')
                .eq('id', org.id)
                .single();
            if (freshOrg) {
                if (typeof freshOrg.sky_points === 'number') {
                    setAdminSkyPoints(freshOrg.sky_points);
                    if (typeof window !== 'undefined') {
                        localStorage.setItem(`campusflow_admin_points_${org.id}`, freshOrg.sky_points.toString());
                    }
                }
                setOrg((prev: any) => prev ? { ...prev, is_active: freshOrg.is_active, suspension_reason: freshOrg.suspension_reason } : prev);
            }
        }, 15000);

        return () => {
            supabase.removeChannel(orgSub);
            clearInterval(pollTimer);
        };
    }, [org?.id]);

    if (loading || !authChecked) return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center"><Loader2 className="w-8 h-8 text-teal-400 animate-spin" /></div>;
    if (!isAuthorized) return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-white"><div className="text-center"><h1 className="text-2xl font-black mb-2">🔒 Accès refusé</h1><p className="text-slate-400 text-sm mb-4">Vous devez être connecté en tant que propriétaire de cet établissement.</p><button onClick={() => router.push(`/${orgSlug}/login`)} className="px-4 py-2 bg-indigo-600 rounded-xl text-sm hover:bg-indigo-500 transition">Se connecter</button></div></div>;
    if (!org) return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-white"><h1 className="text-2xl font-black">Introuvable</h1></div>;

    const isCL = ['college', 'lycee'].includes(org.type);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const isCustom = typeof window !== 'undefined' && isCustomDomain();
    // Sur domaine personnalisé, les chemins internes n'incluent pas le slug
    const navTo = (path: string) => isCustom ? `/${path}` : `/${orgSlug}/${path}`;
    // Base URL publique : gotam.fun/ ou readsgreat.site/the-greatsoft-academy/
    const publicBase = isCustom ? origin : `${origin}/${orgSlug}`;
    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push(navTo('login'));
    };

    // ── ÉCRAN ROUGE DE SUSPENSION COMPTE ──
    if (org && org.is_active === false) {
        return (
            <div className="min-h-screen bg-[#0E0608] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 blur-[160px] rounded-full pointer-events-none" />

                <div className="relative z-10 w-full max-w-xl bg-[#170C10] border border-red-500/30 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto shadow-2xl shadow-red-500/20">
                        <Ban className="w-10 h-10 text-red-400" />
                    </div>

                    <div>
                        <span className="px-3.5 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-black uppercase tracking-wider border border-red-500/30">
                            Compte Suspendu
                        </span>
                        <h1 className="text-2xl font-black text-white mt-3">
                            L'accès à votre établissement est suspendu
                        </h1>
                        <p className="text-slate-400 text-xs mt-1 font-mono">
                            {org.name} (/{org.slug})
                        </p>
                    </div>

                    {/* Suspension reason box */}
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-left space-y-1">
                        <p className="text-[11px] font-bold text-red-300 uppercase tracking-wider flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" /> Motif notifié par la plateforme :
                        </p>
                        <p className="text-sm text-white font-medium pl-5">
                            {org.suspension_reason || "Vérification administrative de conformité ou défaut de pièces justificatives."}
                        </p>
                    </div>

                    {/* Appeal / Justification form */}
                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 text-left space-y-3">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <FileText className="w-4 h-4 text-amber-400" /> Formulaire de réexamen & justificatifs
                        </h3>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                            Fournissez des explications ou transmettez vos précisions à l&apos;équipe Superadmin pour demander la levée de la suspension.
                        </p>

                        {!appealSubmitted ? (
                            <div className="space-y-3 pt-1">
                                <textarea
                                    value={appealMessage}
                                    onChange={e => setAppealMessage(e.target.value)}
                                    placeholder="Expliquez votre situation ou collez les références de vos justificatifs..."
                                    rows={3}
                                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-red-500/50"
                                />
                                <Button
                                    onClick={async () => {
                                        if (!appealMessage.trim()) { toast.error('Veuillez saisir votre message d\'explication'); return; }
                                        setSubmittingAppeal(true);
                                        try {
                                            await supabase.from('admin_recovery_requests').insert({
                                                org_id: org.id,
                                                org_slug: org.slug,
                                                org_name: org.name,
                                                owner_first_name: session?.first_name || 'Admin',
                                                owner_last_name: session?.last_name || '',
                                                what_lost: 'both',
                                                new_email: org.email || '',
                                                superadmin_note: `CONTESTATION SUSPENSION : ${appealMessage.trim()}`,
                                                status: 'pending'
                                            });
                                            setAppealSubmitted(true);
                                            toast.success('Demande de réexamen transmise au Superadmin.');
                                        } catch (e: any) {
                                            toast.error(e.message);
                                        } finally {
                                            setSubmittingAppeal(false);
                                        }
                                    }}
                                    disabled={submittingAppeal || !appealMessage.trim()}
                                    className="w-full h-10 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-600/25"
                                >
                                    {submittingAppeal ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                    Transmettre mon dossier de réexamen
                                </Button>
                            </div>
                        ) : (
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                Votre demande de réexamen a bien été transmise au Superadmin. Vous serez notifié dès son traitement.
                            </div>
                        )}
                    </div>

                    {/* Footer buttons */}
                    <div className="flex items-center justify-between gap-3 pt-2">
                        <button
                            onClick={handleLogout}
                            className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5"
                        >
                            <LogOut className="w-3.5 h-3.5" /> Se déconnecter
                        </button>
                        <a
                            href="mailto:contact@iziteach.com"
                            className="text-xs text-red-400 hover:text-red-300 transition underline"
                        >
                            Assistance d'urgence
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // Setup helpers
    const genCode = () => { const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code = ''; for (let i = 0; i < 12; i++) code += chars[Math.floor(Math.random() * chars.length)]; return code; };
    const addClass = () => { if (!newName.trim()) return; setCls(p => [...p, { name: newName.trim(), cycle: '', filiere_id: null, level: 1, capacity: 50 }]); setNewName(''); };
    const quickAdd = (lv: string) => { const nc = SECS.map(s => ({ name: `${lv} ${s}`, cycle: COLLEGE.includes(lv) ? '1er_cycle' : '2nd_cycle', filiere_id: null, level: 1, capacity: 50 })); setCls(p => [...p, ...nc.filter(x => !p.some(y => y.name === x.name))]); };
    const addSub = () => { if (!newSub.trim() || !selCls) return; setSubs(p => [...p, { name: newSub.trim(), code: newSub.slice(0, 4).toUpperCase(), coefficient: 1, classroom_id: selCls, teacher_id: null }]); setNewSub(''); };
    const addDefs = () => { if (!selCls) { toast.error('Sélectionnez une classe'); return; } const d = DEFS[org.type] || DEFS.centre_formation; setSubs(p => [...p, ...d.map(n => ({ name: n, code: n.slice(0, 4).toUpperCase(), coefficient: 1, classroom_id: selCls, teacher_id: null })).filter(x => !p.some(y => y.name === x.name && y.classroom_id === x.classroom_id))]); };
    const saveCls = async (): Promise<Cls[]> => { setSaving(true); try { const unsaved = cls.filter(c => !c.id); if (unsaved.length > 0) { const { data, error } = await supabase.from('classrooms').insert(unsaved.map(c => ({ organization_id: org.id, name: c.name, cycle: c.cycle || null, filiere_id: c.filiere_id, level: c.level, capacity: c.capacity }))).select(); if (error) throw error; const saved = (data || []).map((d: any) => ({ id: d.id, name: d.name, cycle: d.cycle || '', filiere_id: d.filiere_id, level: d.level, capacity: d.capacity })); const merged = [...cls.filter(c => c.id), ...saved]; setCls(merged); toast.success('Classes sauvegardées !'); setSaving(false); return merged; } toast.success('Classes OK'); setSaving(false); return cls; } catch (e: any) { toast.error(e.message); setSaving(false); return cls; } };
    const saveSubs = async () => { setSaving(true); try { const u = subs.filter(s => !s.id); if (u.length > 0) { const { error } = await supabase.from('subjects').insert(u.map(s => ({ organization_id: org.id, name: s.name, code: s.code, coefficient: s.coefficient, classroom_id: s.classroom_id, teacher_id: s.teacher_id }))); if (error) throw error; } const { data } = await supabase.from('subjects').select('*').eq('organization_id', org.id); setSubs((data || []).map((x: any) => ({ id: x.id, name: x.name, code: x.code, coefficient: x.coefficient, classroom_id: x.classroom_id, teacher_id: x.teacher_id }))); toast.success('Matières sauvegardées !'); } catch (e: any) { toast.error(e.message); } finally { setSaving(false); } };
    const finishSetup = async () => { await saveCls(); await saveSubs(); await supabase.from('organizations').update({ setup_completed: true }).eq('id', org.id); setOrg({ ...org, setup_completed: true }); setTab('general'); toast.success('🎉 Configuration terminée !'); };
    const createTeacher = async () => {
        if (!tFN.trim() || !tLN.trim()) { toast.error('Nom et prénom obligatoires'); return; }
        const fnTrim = tFN.trim();
        const lnTrim = tLN.trim();
        const dupTeacher = teachers.some((t: any) =>
            (t.first_name || '').trim().toLowerCase() === fnTrim.toLowerCase() &&
            (t.last_name || '').trim().toLowerCase() === lnTrim.toLowerCase()
        );
        if (dupTeacher) {
            toast.error(`Un professeur nommé "${fnTrim} ${lnTrim}" existe déjà dans cet établissement.`);
            return;
        }
        setSaving(true);
        try {
            const code = genCode();
            const { data, error } = await supabase.from('teacher_profiles').insert({
                organization_id: org.id,
                first_name: fnTrim,
                last_name: lnTrim,
                speciality: tSpec || null,
                email: tEmail || null,
                phone: tPhone || null,
                nationality: tNat,
                marital_status: tMarital,
                children_count: parseInt(tChildren) || 0,
                residence: tRes || null,
                access_code: code,
                pin_set: false
            }).select().single();
            if (error) throw error;
            setTeachers(p => [...p, data]);
            setTShowCode(code);
            setTFN(''); setTLN(''); setTSpec(''); setTEmail(''); setTPhone(''); setTRes('');
            toast.success('Professeur créé ! Code: ' + code);
        } catch (e: any) {
            toast.error(e.message);
        }
        setSaving(false);
    };

    const createStudent = async () => {
        if (!sFN.trim() || !sLN.trim() || !sClsId) { toast.error('Nom, prénom et classe obligatoires'); return; }
        const fnTrim = sFN.trim();
        const lnTrim = sLN.trim();
        const dupStudent = students.some((s: any) =>
            (s.first_name || '').trim().toLowerCase() === fnTrim.toLowerCase() &&
            (s.last_name || '').trim().toLowerCase() === lnTrim.toLowerCase()
        );
        if (dupStudent) {
            toast.error(`Un étudiant nommé "${fnTrim} ${lnTrim}" existe déjà dans cet établissement.`);
            return;
        }
        setSaving(true);
        try {
            const code = genCode();
            const mat = `STU${Date.now().toString(36).toUpperCase()}`;
            const { data, error } = await supabase.from('student_profiles').insert({
                organization_id: org.id,
                first_name: fnTrim,
                last_name: lnTrim,
                sex: sSex,
                birth_date: sBirth || null,
                classroom_id: sClsId,
                phone: sPhone || null,
                guardian_name: sGuardian || null,
                guardian_phone: sGuardianPhone || null,
                nationality: sNat,
                residence: sRes || null,
                matricule: mat,
                access_code: code,
                pin_set: false,
                approval_status: 'approved'
            }).select().single();
            if (error) throw error;
            setStudents(p => [...p, data]);
            setSShowCode(code);
            setSFN(''); setSLN(''); setSBirth(''); setSPhone(''); setSGuardian(''); setSGuardianPhone(''); setSRes('');
            toast.success('Étudiant créé ! Code: ' + code);
        } catch (e: any) {
            toast.error(e.message);
        }
        setSaving(false);
    };

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

    const doExportStudentBulletinPdf = async (student: any) => {
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
                org: { name: org.name, logo_url: org.logo_url, signature_url: org.signature_url, stamp_url: org.stamp_url, phone: org.phone, email: org.email, city: org.city, country: org.country, current_term: org.current_term },
                student: { first_name: student.first_name, last_name: student.last_name, matricule: student.matricule, sex: student.sex, birth_date: student.birth_date, classroom_name: classroomName },
                subjects: bulletinSubjects,
                overallAverage: overallAvg,
                term: org.current_term || 'Trimestre 1',
                year: `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`,
            };

            generateBulletinPDF(data, selBulletinTemplate || org.bulletin_template || 1);
            toast.success('Bulletin officiel généré !');
        } catch (e: any) {
            toast.error(e.message || 'Erreur lors de la génération du bulletin');
        }
    };

    const exportStudentBulletinPdf = (student: any) => {
        requestPinProtectedAction({
            docName: `Bulletin — ${student.first_name} ${student.last_name}`,
            cost: 1,
            onApproved: () => doExportStudentBulletinPdf(student)
        });
    };
    const assignTeacherToSubject = async (subId: string, teacherId: string | null) => { const { error } = await supabase.from('subjects').update({ teacher_id: teacherId }).eq('id', subId); if (error) { toast.error(error.message); return; } setSubs(p => p.map(s => s.id === subId ? { ...s, teacher_id: teacherId } : s)); toast.success('Professeur assigné ✅'); };
    const deleteTeacher = async (id: string) => { if (!confirm('Supprimer ce professeur ?')) return; await supabase.from('teacher_profiles').delete().eq('id', id); setTeachers(p => p.filter(t => t.id !== id)); toast.success('Professeur supprimé'); };
    const deleteStudent = async (id: string) => { if (!confirm('Supprimer cet étudiant ?')) return; await supabase.from('student_profiles').delete().eq('id', id); setStudents(p => p.filter(s => s.id !== id)); toast.success('Étudiant supprimé'); };
    const resetTeacherPin = async (id: string, name: string) => {
        if (!confirm(`Réinitialiser le PIN de ${name} ? Le professeur créera un nouveau PIN à sa prochaine connexion.`)) return;
        try {
            const { error } = await supabase.from('teacher_profiles').update({ pin_set: false, pin_code: null }).eq('id', id);
            if (error) throw error;
            setTeachers(p => p.map(t => t.id === id ? { ...t, pin_set: false } : t));
            toast.success(`🔑 PIN de ${name} réinitialisé avec succès !`);
        } catch (e: any) { toast.error(e.message); }
    };
    const resetStudentPin = async (id: string, accessCode: string, name: string) => {
        if (!confirm(`Réinitialiser le PIN de ${name} ? L'étudiant créera un nouveau PIN à sa prochaine connexion.`)) return;
        try {
            await supabase.from('student_profiles').update({ pin_set: false, pin_code: null }).eq('id', id);
            if (accessCode) {
                await supabase.from('inscription_requests').update({ pin_code: null }).eq('access_code', accessCode);
            }
            setStudents(p => p.map(s => s.id === id ? { ...s, pin_set: false } : s));
            toast.success(`🔑 PIN de ${name} réinitialisé avec succès !`);
        } catch (e: any) { toast.error(e.message); }
    };

    // ── Tâche 3 : Suspension de comptes ──
    const suspendAccount = async () => {
        if (!suspendModal) return;
        setSavingSuspend(true);
        try {
            const table = suspendModal.type === 'student' ? 'student_profiles' : 'teacher_profiles';
            const willSuspend = !suspendModal.isSuspended;
            const updateData: any = { is_active: !willSuspend };
            if (willSuspend) updateData.suspension_reason = suspendReason.trim() || 'Suspendu par l\'administrateur';
            else updateData.suspension_reason = null;
            const { error } = await supabase.from(table).update(updateData).eq('id', suspendModal.id);
            if (error) throw error;
            if (suspendModal.type === 'student') {
                setStudents(p => p.map((s: any) => s.id === suspendModal!.id ? { ...s, ...updateData } : s));
            } else {
                setTeachers(p => p.map((t: any) => t.id === suspendModal!.id ? { ...t, ...updateData } : t));
            }
            toast.success(willSuspend ? `🚫 ${suspendModal.name} suspendu(e)` : `✅ ${suspendModal.name} réactivé(e)`);
            setSuspendModal(null); setSuspendReason('');
        } catch (e: any) { toast.error(e.message); }
        setSavingSuspend(false);
    };

    // ── Tâche 3 : Relevé de notes PDF ──
    const doExportReleveNotesPdf = async (student: any) => {
        try {
            const studentCls = cls.find(c => c.id === student.classroom_id);
            const { data: evals } = await supabase.from('evaluations').select('*').eq('classroom_id', student.classroom_id).order('created_at');
            const { data: grades } = await supabase.from('grades').select('*').eq('student_id', student.id);
            const evalList = evals || [];
            const gradeList = grades || [];
            const rows = evalList.map((ev: any) => {
                const g = gradeList.find((gr: any) => gr.evaluation_id === ev.id);
                const score = g ? Number(g.value) : null;
                const sur20 = score !== null && ev.max_score ? ((score / ev.max_score) * 20).toFixed(2) : '—';
                const ok = score !== null && ev.max_score && (score / ev.max_score) * 20 >= 10;
                return `<tr><td>${ev.title}</td><td>${ev.type || '—'}</td><td style="text-align:center">${ev.coefficient || 1}</td><td style="text-align:center">${score !== null ? `${score}/${ev.max_score}` : '<em style="color:#94a3b8">Absent</em>'}</td><td style="text-align:center;font-weight:bold;color:${ok ? '#16a34a' : '#dc2626'}">${sur20}/20</td></tr>`;
            }).join('');
            const totalCoeff = evalList.reduce((s: number, e: any) => s + (e.coefficient || 1), 0);
            const moyNum = totalCoeff > 0 ? gradeList.reduce((s: number, g: any) => {
                const ev = evalList.find((e: any) => e.id === g.evaluation_id);
                if (!ev) return s;
                return s + (Number(g.value) / ev.max_score) * 20 * (ev.coefficient || 1);
            }, 0) / totalCoeff : null;
            const moy = moyNum !== null ? moyNum.toFixed(2) : '—';
            const sigUrl = org?.signature_url || sSignatureUrl;
            const stpUrl = org?.stamp_url || sStampUrl;
            const logoUrl = org?.logo_url || sLogoUrl;

            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Relevé de notes — ${student.first_name} ${student.last_name}</title><style>
                body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;padding:36px;max-width:820px;margin:auto;background:#fff}
                h1{font-size:22px;font-weight:900;color:#0f172a;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px}
                p.sub{color:#64748b;font-size:13px;margin:2px 0}
                table{width:100%;border-collapse:collapse;margin-top:20px;font-size:13px}
                th{background:#0f172a;color:#fff;padding:10px 12px;text-align:left;font-weight:700}
                td{padding:9px 12px;border-bottom:1px solid #e2e8f0}
                tr:nth-child(even){background:#f8fafc}
                .moy{margin-top:20px;text-align:right;font-size:15px;font-weight:bold;background:#f1f5f9;padding:12px 16px;border-radius:8px}
                .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:16px}
                .org{text-align:right;font-size:12px;color:#475569}
                .footer{margin-top:36px;display:flex;justify-content:space-between;align-items:flex-end}
                .stamp-sig{position:relative;display:inline-block;min-width:160px;text-align:center}
            </style></head><body>
                <div class="header">
                    <div>
                        ${logoUrl ? `<img src="${logoUrl}" style="height:48px;max-width:160px;object-fit:contain;margin-bottom:8px;" alt="Logo" />` : ''}
                        <h1>Relevé de notes</h1>
                        <p class="sub"><strong>${student.first_name} ${student.last_name}</strong> — Matricule : <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${student.matricule || '—'}</code></p>
                        <p class="sub">Classe : <strong>${studentCls?.name || 'Non assignée'}</strong></p>
                    </div>
                    <div class="org">
                        <p style="font-size:14px;font-weight:bold;color:#0f172a;margin-bottom:4px;">${org?.name || 'Établissement'}</p>
                        ${org?.phone ? `<p style="margin:2px 0">${org.phone}</p>` : ''}
                        ${org?.email ? `<p style="margin:2px 0">${org.email}</p>` : ''}
                        <p style="color:#94a3b8;margin-top:4px;"><small>Délivré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</small></p>
                    </div>
                </div>

                <table>
                    <thead><tr><th>Évaluation</th><th>Type</th><th style="text-align:center">Coeff.</th><th style="text-align:center">Note</th><th style="text-align:center">/ 20</th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px">Aucune évaluation enregistrée</td></tr>'}</tbody>
                </table>

                <div class="moy">
                    Moyenne générale pondérée : <span style="font-size:16px;color:${moyNum !== null && moyNum >= 10 ? '#16a34a' : '#dc2626'}">${moy} / 20</span>
                </div>

                <div class="footer">
                    <div>
                        <p style="font-size:11px;color:#94a3b8;">Document officiel certifié conforme.</p>
                    </div>
                    <div class="stamp-sig">
                        <p style="font-size:12px;font-weight:bold;color:#0f172a;margin-bottom:6px;">La Direction</p>
                        <div style="position:relative;min-height:70px;display:flex;align-items:center;justify-content:center;">
                            ${stpUrl ? `<img src="${stpUrl}" style="position:absolute;height:65px;width:65px;object-fit:contain;opacity:0.85;transform:rotate(-6deg);" alt="Cachet" />` : ''}
                            ${sigUrl ? `<img src="${sigUrl}" style="position:relative;z-index:2;max-height:55px;max-width:130px;object-fit:contain;" alt="Signature" />` : ''}
                        </div>
                        <p style="font-size:10px;color:#64748b;border-top:1px solid #cbd5e1;padding-top:2px;">Signature & Sceau</p>
                    </div>
                </div>
            </body></html>`;
            const w = window.open('', '_blank');
            if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 600); }
            toast.success('Relevé de notes généré !');
        } catch (e: any) { toast.error('Erreur: ' + e.message); }
    };

    const exportReleveNotesPdf = (student: any) => {
        requestPinProtectedAction({
            docName: `Relevé de notes — ${student.first_name} ${student.last_name}`,
            cost: 1,
            onApproved: () => doExportReleveNotesPdf(student)
        });
    };
    const saveSettings = async () => {
        setSSavingSettings(true);
        try {
            const updates: any = {
                name: sOrgName, phone: sOrgPhone, email: sOrgEmail, whatsapp: sOrgWhatsapp,
                brand_color: sBrandColor, logo_url: sLogoUrl || null,
                signature_url: sSignatureUrl || null, stamp_url: sStampUrl || null,
                favicon_url: sFaviconUrl || null,
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
            const domain = sCustomDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '').replace(/^www\./, '');
            setSCustomDomain(domain);
            await supabase.from('organizations').update({ custom_domain: domain, domain_verified: true, domain_ssl_status: 'pending' }).eq('id', org.id);

            // Automatisation backend (Worker -> Netlify API)
            try {
                const workerUrl = process.env.NEXT_PUBLIC_NOTIFICATION_WORKER_URL || process.env.NEXT_PUBLIC_WORKER_URL || 'https://campusflow-worker.kleintaptue1.workers.dev';
                const { data: { session: authSession } } = await supabase.auth.getSession();
                const authToken = authSession?.access_token || '';
                await fetch(`${workerUrl}/api/domain/register`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ domain, orgId: org.id })
                });
            } catch {}

            setSDomainVerified(true); setSDomainSsl('pending');
            setOrg({ ...org, custom_domain: domain, domain_verified: true, domain_ssl_status: 'pending' });
            toast.success('Domaine enregistré ! Configurez le DNS de votre hébergeur (A et CNAME) 🎉');
        } catch (e: any) { toast.error(e.message); }
        setSVerifying(false);
    };
    const removeDomain = async () => {
        if (!confirm('Retirer le domaine personnalisé ?')) return;
        const prevDomain = sCustomDomain;
        await supabase.from('organizations').update({ custom_domain: null, domain_verified: false, domain_ssl_status: 'pending' }).eq('id', org.id);

        try {
            const workerUrl = process.env.NEXT_PUBLIC_NOTIFICATION_WORKER_URL || process.env.NEXT_PUBLIC_WORKER_URL || 'https://campusflow-worker.kleintaptue1.workers.dev';
            const { data: { session: authSession } } = await supabase.auth.getSession();
            const authToken = authSession?.access_token || '';
            await fetch(`${workerUrl}/api/domain/remove`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: prevDomain, orgId: org.id })
            });
        } catch {}

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
    // ═══ CRUD SUBJECTS INLINE & CLASS LINKING ═══
    const addSubjectToClass = async (classroomId: string, name?: string, coef?: number, teacherId?: string | null) => {
        const finalName = (name || classSubName).trim();
        if (!finalName || !org) {
            toast.error('Nom de la matière obligatoire');
            return;
        }
        const finalCoef = coef !== undefined ? coef : (parseFloat(classSubCoef) || 1);
        const finalTeacher = teacherId !== undefined ? teacherId : (classSubTeacher || null);

        setSaving(true);
        const { data, error } = await supabase.from('subjects').insert({
            organization_id: org.id,
            name: finalName,
            code: finalName.slice(0, 4).toUpperCase(),
            coefficient: finalCoef,
            classroom_id: classroomId,
            teacher_id: finalTeacher
        }).select().single();

        if (error) {
            toast.error(error.message);
        } else {
            setSubs(p => [...p, { id: data.id, name: data.name, code: data.code, coefficient: data.coefficient, classroom_id: data.classroom_id, teacher_id: data.teacher_id }]);
            toast.success(`Matière "${data.name}" (Coef. ${data.coefficient}) ajoutée à la classe ! ✅`);
            setClassSubName('');
            setClassSubCoef('1');
            setClassSubTeacher('');
            setAddingSubForClassId(null);
        }
        setSaving(false);
    };

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

    const handleSettingsSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file || !org) return;
        setUploadingSignature(true);
        try {
            const compressed = await compressImage(file, { maxWidth: 800, quality: 0.8 });
            const r2Res = await uploadToR2(compressed, `orgs/${org.id}`, `signature_${Date.now()}_${file.name}`);
            setSSignatureUrl(r2Res.url);
            // Persistance localStorage — fallback si colonne Supabase pas encore en cache
            if (typeof window !== 'undefined') localStorage.setItem(`campusflow_signature_${org.id}`, r2Res.url);
            try {
                await supabase.from('organizations').update({ signature_url: r2Res.url }).eq('id', org.id);
            } catch { /* schema cache pas encore à jour, localStorage suffira */ }
            setOrg({ ...org, signature_url: r2Res.url });
            toast.success('Signature officielle enregistrée ✅');
        } catch (e: any) { toast.error(e.message); }
        setUploadingSignature(false);
    };

    const handleSettingsStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file || !org) return;
        setUploadingStamp(true);
        try {
            const compressed = await compressImage(file, { maxWidth: 800, quality: 0.8 });
            const r2Res = await uploadToR2(compressed, `orgs/${org.id}`, `stamp_${Date.now()}_${file.name}`);
            setSStampUrl(r2Res.url);
            // Persistance localStorage — fallback si colonne Supabase pas encore en cache
            if (typeof window !== 'undefined') localStorage.setItem(`campusflow_stamp_${org.id}`, r2Res.url);
            try {
                await supabase.from('organizations').update({ stamp_url: r2Res.url }).eq('id', org.id);
            } catch { /* schema cache pas encore à jour, localStorage suffira */ }
            setOrg({ ...org, stamp_url: r2Res.url });
            toast.success('Cachet officiel enregistré ✅');
        } catch (e: any) { toast.error(e.message); }
        setUploadingStamp(false);
    };

    const openCertForStudent = (s: any) => {
        setCertStudentId(s.id);
        const clsObj = cls.find(c => c.id === s.classroom_id);
        setCertCourseName(clsObj?.name || s.filiere_name || 'Formation Spécialisée');
        setCertLocation(org?.city || 'Yaoundé');
        setCertSignatory1Name(`${org?.owner_first_name || ''} ${org?.owner_last_name || ''}`.trim() || org?.name || 'La Direction');
        setTab('certificates');
    };

    const generateCert = () => {
        const targetStudent = students.find(s => s.id === certStudentId) || (students.length > 0 ? students[0] : null);
        if (!targetStudent) {
            toast.error('Veuillez sélectionner un étudiant');
            return;
        }
        const clsName = cls.find(c => c.id === targetStudent.classroom_id)?.name || '';
        const certData: CertificateData = {
            org: {
                name: org.name,
                logo_url: org.logo_url,
                signature_url: sSignatureUrl || org.signature_url,
                stamp_url: sStampUrl || org.stamp_url,
                phone: org.phone,
                email: org.email,
                city: org.city,
                country: org.country,
                motto: org.motto,
            },
            student: {
                first_name: targetStudent.first_name,
                last_name: targetStudent.last_name,
                matricule: targetStudent.matricule,
                classroom_name: clsName,
                filiere_name: targetStudent.filiere_name || clsName,
            },
            certificate: {
                title: certTitle || 'CERTIFICAT DE FIN DE FORMATION',
                subtitle: certSubtitle || 'ATTESTATION DE RÉUSSITE',
                course_name: certCourseName || clsName || 'Formation Spécialisée',
                mention: certMention === 'Sans mention' ? undefined : certMention,
                date_issued: certDate || new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
                location: certLocation || org.city || '',
                signatory1_title: certSignatory1Title || 'Directeur Général',
                signatory1_name: certSignatory1Name || `${org.owner_first_name || ''} ${org.owner_last_name || ''}`.trim() || 'La Direction',
                signatory2_title: certSignatory2Name?.trim() ? (certSignatory2Title || 'Responsable Pédagogique') : undefined,
                signatory2_name: certSignatory2Name?.trim() || undefined,
                show_stamp: certShowStamp,
                show_signature: certShowSignature,
            }
        };

        requestPinProtectedAction({
            docName: `Certificat — ${targetStudent.first_name} ${targetStudent.last_name}`,
            cost: 1,
            onApproved: () => {
                generateCertificatePDF(certData, certTemplate);
                toast.success('Certificat PDF officiel généré avec succès !');
            }
        });
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
<div class="stamp-area">
    <div style="position:relative;text-align:center;width:40%;">
        <p style="font-size:9pt;color:#64748b;margin-bottom:4px;">Le Directeur</p>
        <div style="position:relative;min-height:50px;">
            ${org.signature_url ? `<img src="${org.signature_url}" style="max-height:48px;max-width:130px;object-fit:contain;" alt="Signature" />` : '<div style="height:35px"></div>'}
            ${org.stamp_url ? `<img src="${org.stamp_url}" style="position:absolute;right:10px;bottom:0px;max-height:60px;max-width:60px;object-fit:contain;opacity:0.85;transform:rotate(-6deg);" alt="Cachet" />` : ''}
        </div>
        <div class="line" style="border-top:1px solid #94a3b8;padding-top:4px;font-size:8pt;color:#64748b">Cachet & Signature</div>
    </div>
</div>
<div class="footer"><p>Document généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} — ${org.name} — IziTeach</p></div>
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
                        <IziTeachLogo variant="symbol" size="xs" />
                        <span className="font-bold text-sm truncate">{org.name}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Backoffice</p>
                </div>
                <nav className="p-2 space-y-0.5 flex-1 overflow-y-auto pb-16">{SIDES.map(i => (<button key={i.id} onClick={() => onTab(i.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${tab === i.id ? 'bg-teal-600/15 text-teal-300 font-medium' : 'text-slate-400 hover:bg-white/5'}`}><i.icon className="w-4 h-4" />{i.label}</button>))}
                    <div className="mt-3 pt-3 border-t border-white/5 space-y-0.5">
                        <button onClick={() => router.push(navTo('library'))} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-emerald-400 hover:bg-emerald-600/10"><BookMarked className="w-4 h-4" />Bibliothèque</button>
                        <button onClick={() => router.push(navTo('shop'))} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-teal-400 hover:bg-teal-600/10"><ShoppingBag className="w-4 h-4" />Marketplace</button>
                        <button onClick={() => router.push(navTo('messages'))} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-indigo-400 hover:bg-indigo-600/10"><MessageSquare className="w-4 h-4" />Messages</button>
                    </div>
                </nav>
                <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/5 space-y-1">
                    <Button variant="ghost" size="sm" className="w-full text-xs text-slate-500" onClick={() => router.push(isCustom ? '/' : `/${orgSlug}`)}><Globe className="w-3 h-3 mr-1" />Page publique</Button>
                    <Button variant="ghost" size="sm" className="w-full text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={handleLogout}><Lock className="w-3 h-3 mr-1" />Se déconnecter</Button>
                </div>
            </aside>
            {sidebar && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebar(false)} />}

            <main className="flex-1 min-w-0 min-h-screen relative z-10 overflow-x-hidden">
                <header className="sticky top-0 z-20 bg-[#0B0E14]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebar(true)} className="lg:hidden p-2 hover:bg-white/5 rounded-xl">
                            <Settings className="w-5 h-5" />
                        </button>
                        <h1 className="text-lg font-black text-gradient-primary">
                            {SIDES.find(i => i.id === tab)?.label}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Admin Notification Bell */}
                        {org && (
                            <AdminNotificationBell
                                orgId={org.id}
                                orgSlug={orgSlug}
                                onNavigateTab={(targetTab, params) => {
                                    onTab(targetTab as Tab);
                                    if (params?.sub && targetTab === 'students') {
                                        setStudentSubTab(params.sub);
                                    }
                                }}
                            />
                        )}

                        {/* Sky Points Badge */}
                        <button
                            onClick={() => setShowPointsModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/10 border border-amber-500/30 text-amber-300 hover:border-amber-400 transition shadow-sm text-xs font-bold cursor-pointer"
                            title="Cliquez pour voir votre solde et les barèmes"
                        >
                            <span className="text-sm">⭐</span>
                            <span className="font-extrabold">{new Intl.NumberFormat('fr-FR').format(adminSkyPoints)}</span>
                            <span className="hidden sm:inline font-medium text-amber-400/80 text-[11px]">Sky Pts</span>
                        </button>

                        {/* PIN status indicator */}
                        <button
                            onClick={() => {
                                if (!adminSecurityPin) setPinModalMode('set_pin');
                                else setPinModalMode('change_pin');
                                setPinInput(''); setPinConfirmInput(''); setOldPinInput(''); setPinError('');
                                setPinModalOpen(true);
                            }}
                            className={cn(
                                "hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition",
                                adminSecurityPin
                                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                            )}
                            title="Code PIN de protection des documents officiels"
                        >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {adminSecurityPin ? 'PIN Actif' : 'Définir PIN'}
                        </button>

                        <span className="text-xs text-slate-500 hidden sm:inline">
                            {students.length} étudiants • {teachers.length} profs
                        </span>

                        {/* Déconnexion rapide */}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition cursor-pointer"
                            title="Se déconnecter"
                        >
                            <Lock className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Déconnexion</span>
                        </button>
                    </div>
                </header>

                <div className="p-3 sm:p-4 md:p-6 max-w-5xl w-full">
                    {/* ═══ Annonces officielles + Pub ═══ */}
                    {org && (
                        <>
                            <OfficialAnnouncements orgId={org.id} />
                            <AdsBanner
                                userId={session?.user?.id}
                                orgId={org.id}
                                role="admin"
                            />
                        </>
                    )}
                    {/* ═══ GENERAL ═══ */}
                    {tab === 'general' && <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-white/10"><h2 className="text-xl font-black mb-4 text-gradient-primary">Informations</h2><div className="grid sm:grid-cols-2 gap-3 text-sm">{[['Nom', org.name], ['Type', org.type], ['Ville', `${org.city}, ${org.country}`], ['Tél', org.phone], ['Email', org.email], ['WhatsApp', org.whatsapp || '—']].map(([k, v], i) => <div key={i}><span className="text-slate-500">{k}:</span> <span className="ml-2">{v}</span></div>)}</div></div>
                        <div className="p-4 sm:p-6 rounded-2xl bg-teal-500/5 backdrop-blur-sm border border-teal-500/10"><h3 className="font-bold text-teal-300 mb-3 flex items-center gap-2"><Link2 className="w-5 h-5" />Liens</h3><div className="space-y-2 text-sm">{[['Page publique', `${publicBase}`, 'text-teal-300'], ['Inscription prof', `${publicBase}/prof`, 'text-emerald-300'], ['Inscription étudiant', `${publicBase}/student`, 'text-indigo-300']].map(([l, u, c], i) => <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2"><span className="text-slate-400 shrink-0">{l}:</span><code className={`px-2 py-1 rounded-lg bg-white/5 ${c} text-xs break-all`}>{u}</code></div>)}</div></div>
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
                        {step === 2 && <div className="space-y-4"><div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 text-center"><UserPlus className="w-12 h-12 text-indigo-400 mx-auto mb-3" /><h3 className="font-bold text-lg mb-2">Invitez vos professeurs</h3><p className="text-sm text-slate-400 mb-4">Partagez ce lien:</p><code className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-emerald-300 text-sm">{publicBase}/prof</code><Button size="sm" variant="outline" className="ml-2 border-white/10" onClick={() => { navigator.clipboard.writeText(`${publicBase}/prof`); toast.success('Copié!'); }}>Copier</Button></div><div className="flex justify-between"><Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-2" />Retour</Button><Button onClick={finishSetup} disabled={saving} className="bg-gradient-to-r from-indigo-600 to-blue-600">{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}<CheckCircle2 className="w-4 h-4 mr-2" />Terminer</Button></div></div>}
                    </div>}

                    {/* ═══ COMBINED CLASSES & MATIÈRES ═══ */}
                    {(tab === 'classes' || (tab as string) === 'subjects') && <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-black text-white flex items-center gap-2">
                                    <School className="w-5 h-5 text-indigo-400" /> Classes &amp; Matières Enseignées
                                </h2>
                                <p className="text-slate-400 text-xs mt-0.5">
                                    {cls.length} classe(s) configurée(s) · {subs.length} matière(s) réparties · {teachers.length} professeur(s)
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={classSearch}
                                    onChange={e => setClassSearch(e.target.value)}
                                    placeholder="🔍 Filtrer classe ou matière..."
                                    className="bg-white/5 border-white/10 text-white text-xs h-9 w-48 sm:w-60 rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-teal-500/10 to-transparent border border-indigo-500/20 text-xs text-slate-300 flex items-center gap-2.5">
                            <span className="text-base">💡</span>
                            <div>
                                <strong className="text-indigo-300">Organisation globale :</strong> Définissez les matières qui composent chaque classe ainsi que le ou les professeurs assignés. Ces informations sont <strong>automatiquement relayées</strong> dans les cartes des professeurs et dans leur tableau de bord.
                            </div>
                        </div>

                        {/* ➕ Formulaire d'ajout d'une nouvelle classe */}
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                            <h3 className="font-bold text-sm text-indigo-300 flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Ajouter une nouvelle {isCL ? 'classe' : 'filière / niveau'}
                            </h3>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Input
                                    value={directNewCls}
                                    onChange={e => setDirectNewCls(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addClassDirect()}
                                    placeholder={isCL ? 'Ex: 6ème A, 4ème B, Terminale D...' : 'Ex: L1 Droit, Licence 2 Gestion...'}
                                    className="bg-white/5 border-white/10 text-white h-10 rounded-xl text-sm flex-1"
                                />
                                <Button onClick={addClassDirect} disabled={!directNewCls.trim() || saving} className="bg-indigo-600 hover:bg-indigo-500 h-10 px-5 shrink-0 rounded-xl font-bold">
                                    <Plus className="w-4 h-4 mr-1" /> Créer la classe
                                </Button>
                            </div>
                            {isCL && (
                                <div className="pt-2 border-t border-white/5">
                                    <p className="text-[11px] text-slate-400 mb-1.5 font-medium">Ajout rapide de niveaux scolaires :</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(org.type === 'college' ? COLLEGE : [...COLLEGE, ...LYCEE]).map(l => (
                                            <Button
                                                key={l}
                                                size="sm"
                                                variant="outline"
                                                className="text-xs h-7 px-2.5 bg-white/5 border-white/10 hover:border-indigo-500/40 text-slate-300 hover:text-white rounded-lg"
                                                onClick={() => quickAdd(l)}
                                            >
                                                <Plus className="w-3 h-3 mr-1 text-indigo-400" /> {l}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ═══ CARTES DES CLASSES & LEURS MATIÈRES ═══ */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                            {cls
                                .filter(c => {
                                    if (!classSearch.trim()) return true;
                                    const q = classSearch.toLowerCase();
                                    const matchCls = (c.name || '').toLowerCase().includes(q) || (c.cycle || '').toLowerCase().includes(q);
                                    const matchSub = subs.some(s => s.classroom_id === c.id && (s.name || '').toLowerCase().includes(q));
                                    return matchCls || matchSub;
                                })
                                .map((c, i) => {
                                    const classStudents = students.filter((s: any) => s.classroom_id === c.id);
                                    const classSubs = subs.filter(s => s.classroom_id === c.id);
                                    const totalCoef = classSubs.reduce((sum, s) => sum + (s.coefficient || 1), 0);
                                    const isAddingSub = addingSubForClassId === c.id;

                                    return (
                                        <div key={c.id || i} className="rounded-3xl bg-gradient-to-br from-[#121726] via-[#0F1420] to-[#0B0E17] border border-white/10 hover:border-indigo-500/30 transition-all duration-300 shadow-2xl p-5 flex flex-col justify-between space-y-4">
                                            {/* Header de la classe */}
                                            <div className="space-y-3 pb-3 border-b border-white/5">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-lg shrink-0 shadow-inner">
                                                            🏛️
                                                        </div>
                                                        <div className="min-w-0">
                                                            {editingClsId === c.id ? (
                                                                <div className="flex gap-2 items-center">
                                                                    <Input
                                                                        value={editClsName}
                                                                        onChange={e => setEditClsName(e.target.value)}
                                                                        onKeyDown={e => e.key === 'Enter' && updateClass(c.id!)}
                                                                        className="bg-white/5 border-white/10 text-white h-8 rounded-lg text-sm"
                                                                        autoFocus
                                                                    />
                                                                    <Button size="sm" className="bg-emerald-600 h-8 px-2" onClick={() => updateClass(c.id!)}>
                                                                        <Save className="w-3 h-3" />
                                                                    </Button>
                                                                    <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingClsId(null)}>
                                                                        <X className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <h4 className="font-black text-white text-base tracking-tight">{c.name}</h4>
                                                                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold uppercase tracking-wider">
                                                                        {c.cycle || 'Général'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                                                <span className="flex items-center gap-1">
                                                                    <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                                                                    <strong>{classStudents.length}</strong> élève(s)
                                                                </span>
                                                                <span>•</span>
                                                                <span>Capacité : {c.capacity || 50}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {c.id && editingClsId !== c.id && (
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => { setEditingClsId(c.id!); setEditClsName(c.name); }}
                                                                className="text-slate-400 hover:text-indigo-300 p-1.5 rounded-lg hover:bg-white/5 transition"
                                                                title="Modifier le nom de la classe"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => deleteClass(c.id!)}
                                                                className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition"
                                                                title="Supprimer la classe"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Section Matières constitutives de cette classe */}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                                        <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                                                        Matières de cette classe ({classSubs.length})
                                                    </h5>
                                                    <span className="text-[11px] font-mono text-teal-400 font-semibold bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20">
                                                        Total Coef : {totalCoef}
                                                    </span>
                                                </div>

                                                {/* Liste des matières */}
                                                <div className="space-y-2">
                                                    {classSubs.map(s => {
                                                        const assignedTeacher = teachers.find((t: any) => t.id === s.teacher_id);
                                                        const isEditing = editingSubId === s.id;

                                                        return (
                                                            <div
                                                                key={s.id}
                                                                className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                                                            >
                                                                {isEditing ? (
                                                                    <div className="flex gap-2 flex-1 items-center">
                                                                        <Input
                                                                            value={editSubName}
                                                                            onChange={e => setEditSubName(e.target.value)}
                                                                            onKeyDown={e => e.key === 'Enter' && updateSubject(s.id!)}
                                                                            className="bg-white/5 border-white/10 text-white h-8 rounded-lg text-xs flex-1"
                                                                            placeholder="Nom matière"
                                                                            autoFocus
                                                                        />
                                                                        <Input
                                                                            type="number"
                                                                            value={editSubCoef}
                                                                            onChange={e => setEditSubCoef(e.target.value)}
                                                                            className="bg-white/5 border-white/10 text-white h-8 rounded-lg text-xs w-16"
                                                                            placeholder="Coef"
                                                                        />
                                                                        <Button size="sm" className="bg-emerald-600 h-8 px-2.5" onClick={() => updateSubject(s.id!)}>
                                                                            <Save className="w-3 h-3" />
                                                                        </Button>
                                                                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingSubId(null)}>
                                                                            <X className="w-3 h-3" />
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 w-full">
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <span className="text-sm">📘</span>
                                                                            <span className="text-xs font-bold text-white truncate">{s.name}</span>
                                                                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-teal-500/15 text-teal-300 border border-teal-500/25 font-mono font-bold">
                                                                                Coef. {s.coefficient || 1}
                                                                            </span>
                                                                        </div>

                                                                        {/* Sélecteur de professeur pour cette matière */}
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            <select
                                                                                value={s.teacher_id || ''}
                                                                                onChange={e => assignTeacherToSubject(s.id!, e.target.value || null)}
                                                                                className="bg-[#0b0e14] border border-teal-500/30 hover:border-teal-500/60 focus:border-teal-400 text-[11px] text-teal-300 rounded-xl px-2.5 py-1 font-medium cursor-pointer transition focus:outline-none focus:ring-1 focus:ring-teal-500 max-w-[200px] truncate"
                                                                            >
                                                                                <option value="" className="text-slate-400">⚠️ Aucun professeur</option>
                                                                                {teachers.map((t: any) => (
                                                                                    <option key={t.id} value={t.id} className="text-white bg-[#0f1420]">
                                                                                        👨‍🏫 {t.first_name} {t.last_name} {t.speciality ? `(${t.speciality})` : ''}
                                                                                    </option>
                                                                                ))}
                                                                            </select>

                                                                            <div className="flex items-center gap-0.5">
                                                                                <button
                                                                                    onClick={() => { setEditingSubId(s.id!); setEditSubName(s.name); setEditSubCoef(String(s.coefficient || 1)); }}
                                                                                    className="text-slate-400 hover:text-teal-300 p-1.5 rounded-lg hover:bg-white/5 transition"
                                                                                    title="Modifier nom et coefficient"
                                                                                >
                                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => deleteSubject(s.id!)}
                                                                                    className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition"
                                                                                    title="Supprimer la matière de cette classe"
                                                                                >
                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}

                                                    {classSubs.length === 0 && (
                                                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-1">
                                                            <p className="text-xs text-slate-400">Aucune matière n&apos;est encore assignée à cette classe.</p>
                                                            <p className="text-[11px] text-slate-500">Ajoutez une matière ci-dessous ou cliquez sur une suggestion rapide.</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Formulaire d'ajout d'une matière à cette classe */}
                                                {isAddingSub ? (
                                                    <div className="p-3.5 rounded-2xl bg-[#0b0e14] border border-teal-500/30 space-y-3 animate-in fade-in">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-bold text-teal-300">➕ Nouvelle matière pour {c.name}</span>
                                                            <button onClick={() => setAddingSubForClassId(null)} className="text-slate-400 hover:text-white p-1">
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                        <div className="grid sm:grid-cols-3 gap-2">
                                                            <div className="sm:col-span-2">
                                                                <Input
                                                                    value={classSubName}
                                                                    onChange={e => setClassSubName(e.target.value)}
                                                                    placeholder="Nom de la matière (ex: Français, Mathématiques...)"
                                                                    className="bg-white/5 border-white/10 text-white text-xs h-9 rounded-xl"
                                                                    autoFocus
                                                                />
                                                            </div>
                                                            <div>
                                                                <Input
                                                                    type="number"
                                                                    value={classSubCoef}
                                                                    onChange={e => setClassSubCoef(e.target.value)}
                                                                    placeholder="Coef (ex: 3)"
                                                                    className="bg-white/5 border-white/10 text-white text-xs h-9 rounded-xl"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <select
                                                                value={classSubTeacher}
                                                                onChange={e => setClassSubTeacher(e.target.value)}
                                                                className="w-full bg-white/5 border border-white/10 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
                                                            >
                                                                <option value="" className="bg-[#0f1420] text-slate-400">👨‍🏫 Assigner un professeur (optionnel)</option>
                                                                {teachers.map((t: any) => (
                                                                    <option key={t.id} value={t.id} className="bg-[#0f1420] text-white">
                                                                        👨‍🏫 {t.first_name} {t.last_name} {t.speciality ? `(${t.speciality})` : ''}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="flex gap-2 justify-end">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => setAddingSubForClassId(null)}
                                                                className="text-xs h-8"
                                                            >
                                                                Annuler
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => addSubjectToClass(c.id!)}
                                                                disabled={!classSubName.trim() || saving}
                                                                className="bg-teal-600 hover:bg-teal-500 text-xs h-8 px-4 font-bold rounded-xl"
                                                            >
                                                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                                                                Ajouter la matière
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2 pt-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => {
                                                                    setAddingSubForClassId(c.id!);
                                                                    setClassSubName('');
                                                                    setClassSubCoef('1');
                                                                    setClassSubTeacher('');
                                                                }}
                                                                className="w-full bg-white/5 hover:bg-teal-600/20 text-teal-300 border border-teal-500/20 hover:border-teal-500/40 text-xs h-8 rounded-xl font-bold transition"
                                                            >
                                                                <Plus className="w-3.5 h-3.5 mr-1.5" /> Ajouter une matière à cette classe
                                                            </Button>
                                                        </div>

                                                        {/* Suggestions rapides en 1-clic */}
                                                        <div className="flex flex-wrap gap-1 items-center">
                                                            <span className="text-[10px] text-slate-500 mr-1">Suggestions :</span>
                                                            {(org.type === 'college'
                                                                ? ['Mathématiques', 'Français', 'Anglais', 'SVT', 'Physique-Chimie', 'Histoire-Géo', 'EPS']
                                                                : ['Mathématiques', 'Français', 'Anglais', 'Physique-Chimie', 'SVT', 'Philosophie', 'Histoire-Géo', 'Informatique']
                                                            ).map(subTitle => {
                                                                const alreadyExists = classSubs.some(s => s.name.toLowerCase() === subTitle.toLowerCase());
                                                                if (alreadyExists) return null;
                                                                return (
                                                                    <button
                                                                        key={subTitle}
                                                                        onClick={() => addSubjectToClass(c.id!, subTitle, 2)}
                                                                        className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 hover:bg-teal-500/15 border border-white/10 hover:border-teal-500/30 text-slate-300 hover:text-teal-300 transition"
                                                                        title={`Ajouter ${subTitle} (Coef. 2) à cette classe`}
                                                                    >
                                                                        + {subTitle}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        {cls.length === 0 && (
                            <div className="text-center py-16 text-slate-500 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                                <School className="w-12 h-12 mx-auto mb-2 opacity-30 text-indigo-400" />
                                <p className="text-base font-bold text-white">Aucune classe configurée</p>
                                <p className="text-xs text-slate-400 mt-1">Créez votre première classe ci-dessus pour y associer des matières et des professeurs.</p>
                            </div>
                        )}

                        {/* Matières générales non rattachées (si existantes) */}
                        {subs.some(s => !s.classroom_id) && (
                            <div className="mt-8 p-5 rounded-3xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                                        ⚠️ Matières non rattachées à une classe ({subs.filter(s => !s.classroom_id).length})
                                    </h4>
                                    <span className="text-[11px] text-slate-400">Rattachez-les à une classe existante</span>
                                </div>
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                    {subs.filter(s => !s.classroom_id).map(s => (
                                        <div key={s.id} className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-white truncate">{s.name}</p>
                                                <p className="text-[10px] text-slate-400">Coef. {s.coefficient || 1}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <select
                                                    onChange={async (e) => {
                                                        const targetClsId = e.target.value;
                                                        if (!targetClsId) return;
                                                        const { error } = await supabase.from('subjects').update({ classroom_id: targetClsId }).eq('id', s.id);
                                                        if (error) toast.error(error.message);
                                                        else {
                                                            setSubs(p => p.map(item => item.id === s.id ? { ...item, classroom_id: targetClsId } : item));
                                                            toast.success('Matière rattachée à la classe ! ✅');
                                                        }
                                                    }}
                                                    className="bg-[#0b0e14] border border-white/10 text-[11px] text-slate-200 rounded-lg px-2 py-1"
                                                >
                                                    <option value="">Rattacher à...</option>
                                                    {cls.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                                <button onClick={() => deleteSubject(s.id!)} className="text-red-400 p-1 hover:bg-red-500/10 rounded-lg">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
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
                        {/* Cartes Salles */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {rooms.map((r) => (
                                <div key={r.id} className="p-5 rounded-2xl bg-gradient-to-br from-[#1c1813] via-[#16130e] to-[#0E0C09] border border-white/10 hover:border-amber-500/40 transition-all duration-300 shadow-xl flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold shrink-0">
                                                    <Building2 className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    {editingRoomId === r.id ? (
                                                        <div className="flex gap-2">
                                                            <Input value={editRoomName} onChange={e => setEditRoomName(e.target.value)} onKeyDown={e => e.key === 'Enter' && updateRoom(r.id!)} className="bg-white/5 border-white/10 text-white h-8 rounded-lg text-sm" autoFocus />
                                                            <Button size="sm" className="bg-emerald-600 h-8 px-2" onClick={() => updateRoom(r.id!)}><Save className="w-3 h-3" /></Button>
                                                            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingRoomId(null)}><X className="w-3 h-3" /></Button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <h4 className="font-bold text-white text-base truncate">{r.name}</h4>
                                                            <span className="inline-block text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/20 font-semibold">
                                                                Salle de cours
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {r.id && editingRoomId !== r.id && (
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => { setEditingRoomId(r.id!); setEditRoomName(r.name); }} className="text-slate-400 hover:text-amber-300 p-1.5 rounded-lg hover:bg-white/5 transition" title="Modifier"><Pencil className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => deleteRoom(r.id!)} className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {rooms.length === 0 && <div className="text-center py-12 text-slate-500"><Building2 className="w-12 h-12 mx-auto mb-2 opacity-30" /><p className="text-sm">Aucune salle physique enregistrée</p></div>}
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
                        {(() => {
                            const filteredTeachers = teachers.filter((t: any) => !teacherSearch || `${t.first_name} ${t.last_name} ${t.speciality || ''} ${t.access_code || ''}`.toLowerCase().includes(teacherSearch.toLowerCase()));
                            if (filteredTeachers.length === 0) {
                                return <div className="text-center py-12 text-slate-500"><Users className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Aucun professeur trouvé</p></div>;
                            }
                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredTeachers.map((t: any) => {
                                        const assignedSubs = subs.filter(s => s.teacher_id === t.id);
                                        return (
                                            <div key={t.id} className="relative group p-5 rounded-2xl bg-gradient-to-br from-[#131927] via-[#111622] to-[#0E121B] border border-white/10 hover:border-emerald-500/40 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/5 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-start justify-between gap-3 mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-300 text-base shadow-inner shrink-0">
                                                                {t.first_name?.[0]}{t.last_name?.[0]}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h4 className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors truncate">{t.first_name} {t.last_name}</h4>
                                                                <p className="text-xs text-emerald-400 font-medium truncate">{t.speciality || 'Enseignant'}</p>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => deleteTeacher(t.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition" title="Supprimer">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    <div className="space-y-1 text-xs text-slate-400 mb-4 bg-black/30 p-2.5 rounded-xl border border-white/5">
                                                        {t.email && <div className="truncate flex items-center gap-1.5"><span className="text-slate-500">✉️</span><span className="text-slate-300 truncate">{t.email}</span></div>}
                                                        {t.phone && <div className="flex items-center gap-1.5"><span className="text-slate-500">📞</span><span className="text-slate-300">{t.phone}</span></div>}
                                                        <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1 border-t border-white/5 mt-1">
                                                            <span>{t.nationality || 'Nationalité —'}</span>
                                                            <span>•</span>
                                                            <span>{t.marital_status || 'Situation —'}</span>
                                                        </div>
                                                    </div>

                                                    <div className="mb-4 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                                Classes & Matières ({assignedSubs.length})
                                                            </p>
                                                            <span className="text-[10px] text-emerald-400 font-medium">
                                                                {[...new Set(assignedSubs.map(s => s.classroom_id).filter(Boolean))].length} classe(s)
                                                            </span>
                                                        </div>

                                                        {assignedSubs.length > 0 ? (
                                                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                                                {(() => {
                                                                    // Group subjects by classroom
                                                                    const classMap: Record<string, any[]> = {};
                                                                    assignedSubs.forEach(s => {
                                                                        const cId = s.classroom_id || 'unassigned';
                                                                        if (!classMap[cId]) classMap[cId] = [];
                                                                        classMap[cId].push(s);
                                                                    });

                                                                    return Object.entries(classMap).map(([cId, cSubs]) => {
                                                                        const classObj = cls.find(c => c.id === cId);
                                                                        const className = classObj ? classObj.name : 'Sans classe spécifique';
                                                                        return (
                                                                            <div key={cId} className="p-2 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className="text-[11px] font-bold text-teal-300 flex items-center gap-1">
                                                                                        🏛️ {className}
                                                                                    </span>
                                                                                    <span className="text-[9px] text-slate-500 font-mono">
                                                                                        {cSubs.length} matière(s)
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex flex-wrap gap-1.5">
                                                                                    {cSubs.map(s => (
                                                                                        <span key={s.id} className="text-[11px] px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium flex items-center gap-1.5">
                                                                                            <span>📘 {s.name} <span className="text-emerald-400/60 text-[9px]">(Coef.{s.coefficient || 1})</span></span>
                                                                                            <button 
                                                                                                onClick={() => assignTeacherToSubject(s.id, null)} 
                                                                                                className="text-slate-400 hover:text-red-400 p-0.5 rounded transition"
                                                                                                title={`Retirer ${s.name} de ${className}`}
                                                                                            >
                                                                                                <X className="w-3 h-3" />
                                                                                            </button>
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    });
                                                                })()}
                                                            </div>
                                                        ) : (
                                                            <div className="p-2.5 rounded-xl bg-black/20 border border-dashed border-white/10 text-center">
                                                                <p className="text-xs text-slate-500 italic">Aucune classe ni matière assignée</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="pt-3 border-t border-white/5 space-y-2">
                                                    <select 
                                                        onChange={e => { if (e.target.value) assignTeacherToSubject(e.target.value, t.id); e.target.value = ''; }} 
                                                        className="text-xs h-9 rounded-xl bg-white/5 border border-white/10 text-slate-300 px-2.5 w-full hover:bg-white/10 transition cursor-pointer font-medium"
                                                    >
                                                        <option value="" className="bg-slate-900">+ Assigner une matière par classe...</option>
                                                        {cls.map(c => {
                                                            const unassignedInClass = subs.filter(s => s.classroom_id === c.id && !s.teacher_id);
                                                            if (unassignedInClass.length === 0) return null;
                                                            return (
                                                                <optgroup key={c.id} label={`🏛️ Classe de ${c.name}`} className="bg-slate-900 font-bold text-teal-300">
                                                                    {unassignedInClass.map(s => (
                                                                        <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200 font-normal">
                                                                            📘 {s.name} (Coef. {s.coefficient || 1})
                                                                        </option>
                                                                    ))}
                                                                </optgroup>
                                                            );
                                                        })}
                                                        {subs.filter(s => !s.classroom_id && !s.teacher_id).length > 0 && (
                                                            <optgroup label="🌐 Autres matières" className="bg-slate-900 font-bold text-slate-400">
                                                                {subs.filter(s => !s.classroom_id && !s.teacher_id).map(s => (
                                                                    <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">
                                                                        📘 {s.name} (Coef. {s.coefficient || 1})
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        )}
                                                    </select>

                                                    <div className="flex items-center gap-2">
                                                        {t.access_code && (
                                                            <div className="flex-1 flex items-center justify-between bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                                                                <span className="text-[10px] text-slate-500 uppercase font-semibold">Code</span>
                                                                <button onClick={() => { navigator.clipboard.writeText(t.access_code); toast.success('Code copié !'); }} className="text-xs font-mono font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                                                                    {t.access_code} <Copy className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        )}
                                                        <button onClick={() => resetTeacherPin(t.id, `${t.first_name} ${t.last_name}`)} className="text-[11px] px-2.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 font-medium flex items-center gap-1 transition" title="Réinitialiser le PIN">
                                                            <RefreshCw className="w-3 h-3" /> Reset PIN
                                                        </button>
                                                        <button onClick={() => setSuspendModal({ id: t.id, name: `${t.first_name} ${t.last_name}`, type: 'teacher', isSuspended: t.is_active === false })}
                                                            className={`text-[11px] px-2.5 py-2 rounded-xl border font-medium flex items-center gap-1 transition ${t.is_active === false ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20' : 'bg-red-600/10 hover:bg-red-600/20 text-red-400 border-red-500/20'}`}
                                                            title={t.is_active === false ? 'Réactiver le compte' : 'Suspendre le compte'}>
                                                            {t.is_active === false ? '✅ Réactiver' : '🚫 Suspendre'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>}

                    {/* ═══ STUDENTS ═══ */}
                    {tab === 'students' && <div className="space-y-5">

                        {/* ─── 4 sous-onglets ─── */}
                        <div className="flex items-center gap-2 p-1 rounded-2xl bg-black/40 border border-white/10 w-full overflow-x-auto">
                            {([
                                { key: 'all',      label: '👥 Tous', count: students.length, color: 'from-indigo-600 to-blue-600' },
                                { key: 'approved', label: '✅ Approuvés', count: students.filter((s: any) => s.approval_status === 'approved' || (!s.approval_status)).length, color: 'from-emerald-600 to-teal-600' },
                                { key: 'pending',  label: '⏳ En attente', count: inscRequests.filter((r: any) => r.status === 'pending' || r.status === 'info_needed').length + students.filter((s: any) => (s.approval_status === 'pending' || s.approval_status === 'info_needed') && !inscRequests.some((r: any) => r.access_code && r.access_code === s.access_code && (r.status === 'pending' || r.status === 'info_needed'))).length, color: 'from-amber-600 to-orange-600' },
                                { key: 'rejected', label: '❌ Rejetés',   count: inscRequests.filter((r: any) => r.status === 'rejected').length + students.filter((s: any) => s.approval_status === 'rejected').length, color: 'from-red-700 to-rose-700' },
                            ] as const).map(st => (
                                <button key={st.key} onClick={() => setStudentSubTab(st.key)}
                                    className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                                        studentSubTab === st.key
                                            ? `bg-gradient-to-r ${st.color} text-white shadow-lg`
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}>
                                    {st.label}
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-black ${
                                        studentSubTab === st.key ? 'bg-white/20' : 'bg-white/5'
                                    }`}>{st.count}</span>
                                </button>
                            ))}
                        </div>

                        {/* ═══════════════ SOUS-ONGLET : TOUS & APPROUVÉS ═══════════════ */}
                        {(studentSubTab === 'all' || studentSubTab === 'approved') && (
                            <div className="space-y-4">
                                {/* Toolbar */}
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div className="relative flex-1 min-w-[200px]">
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                                        <Input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Nom, matricule ou code..." className="bg-white/5 border-white/10 text-white h-10 pl-10 rounded-xl" />
                                    </div>
                                    <select value={studentClsFilter} onChange={e => setStudentClsFilter(e.target.value)} className="h-10 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm">
                                        <option value="" className="bg-slate-900">Toutes classes</option>
                                        {cls.filter(c => c.id).map(c => <option key={c.id} value={c.id!} className="bg-slate-900">{c.name}</option>)}
                                    </select>
                                    <Button size="sm" variant="outline" className="h-10 border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-xl font-bold" onClick={() => setEmailModalOpen(true)}>
                                        <Mail className="w-4 h-4 mr-1.5 text-indigo-400" />Notifier par Email
                                    </Button>
                                    <Button size="sm" className="h-10 bg-teal-600 hover:bg-teal-500 rounded-xl font-bold" onClick={() => { setShowAddStudent(!showAddStudent); setSShowCode(''); }}>
                                        <Plus className="w-4 h-4 mr-1" />{showAddStudent ? 'Fermer' : 'Inscrire'}
                                    </Button>
                                </div>

                                {/* Formulaire ajout étudiant */}
                                {showAddStudent && <div className="p-5 rounded-2xl bg-teal-600/5 border border-teal-500/20 space-y-3">
                                    <h3 className="font-bold text-teal-300">🎓 Nouvel étudiant</h3>
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
                                        <div><Label className="text-slate-400 text-xs">Résidence</Label><Input value={sRes} onChange={e => setSRes(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                    </div>
                                    <Button onClick={createStudent} disabled={saving || !sFN.trim() || !sLN.trim() || !sClsId} className="bg-teal-600">{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}<UserPlus className="w-4 h-4 mr-1" />Inscrire l'étudiant</Button>
                                    {sShowCode && <div className="p-4 rounded-xl bg-teal-600/10 border border-teal-500/30 mt-2">
                                        <p className="text-sm font-bold text-teal-300">✅ Étudiant inscrit ! Code d'accès :</p>
                                        <div className="flex items-center gap-3 mt-2"><code className="text-2xl font-mono font-bold tracking-widest text-white bg-white/10 px-4 py-2 rounded-lg">{sShowCode}</code><Button size="sm" variant="outline" className="border-teal-500/20" onClick={() => { navigator.clipboard.writeText(sShowCode); toast.success('Code copié !'); }}>📋 Copier</Button></div>
                                    </div>}
                                </div>}

                                {/* Grille cartes étudiants */}
                                {(() => {
                                    const filtered = students.filter((s: any) => {
                                        const isApproved = s.approval_status === 'approved' || (!s.approval_status);
                                        const matchesTab = studentSubTab === 'all' ? true : isApproved;
                                        const matchSearch = !studentSearch || `${s.first_name} ${s.last_name} ${s.matricule || ''} ${s.access_code || ''}`.toLowerCase().includes(studentSearch.toLowerCase());
                                        const matchCls = !studentClsFilter || s.classroom_id === studentClsFilter;
                                        return matchesTab && matchSearch && matchCls;
                                    });
                                    if (filtered.length === 0) return (
                                        <div className="text-center py-16 text-slate-500"><GraduationCap className="w-14 h-14 mx-auto mb-3 opacity-20" /><p className="text-sm">{studentSubTab === 'all' ? 'Aucun étudiant trouvé' : 'Aucun étudiant approuvé'}</p></div>
                                    );
                                    return (
                                        <>
                                            <p className="text-xs text-slate-500">{filtered.length} étudiant(s)</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                                {filtered.map((s: any) => {
                                                    const isPending = s.approval_status === 'pending';
                                                    const isInfoNeeded = s.approval_status === 'info_needed';
                                                    const isRejected = s.approval_status === 'rejected';
                                                    const isApproved = !s.approval_status || s.approval_status === 'approved';

                                                    return (
                                                    <div key={s.id} className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 shadow-xl hover:shadow-2xl bg-gradient-to-br from-[#131927] via-[#111622] to-[#0E121B] ${
                                                        isInfoNeeded ? 'border-blue-500/40 hover:border-blue-400' :
                                                        isPending ? 'border-amber-500/40 hover:border-amber-400' :
                                                        isRejected ? 'border-red-500/30' :
                                                        'border-white/10 hover:border-teal-500/40'
                                                    }`}>
                                                        {/* Header avec photo */}
                                                        <div className={`relative h-16 bg-gradient-to-r ${
                                                            isInfoNeeded ? 'from-blue-600/25 to-indigo-600/15' :
                                                            isPending ? 'from-amber-600/25 to-orange-600/15' :
                                                            isRejected ? 'from-red-600/25 to-rose-600/15' :
                                                            'from-teal-600/20 to-indigo-600/10'
                                                        }`}>
                                                            <div className="absolute -bottom-7 left-4">
                                                                {s.photo_url ? (
                                                                    <img src={s.photo_url} alt={s.first_name} className="w-14 h-14 rounded-2xl object-cover border-2 border-[#111622] shadow-lg" />
                                                                ) : (
                                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border-2 border-[#111622] shadow-lg ${s.sex === 'F' ? 'bg-gradient-to-br from-pink-500/30 to-rose-600/20 text-pink-300' : 'bg-gradient-to-br from-teal-500/30 to-indigo-600/20 text-teal-300'}`}>
                                                                        {s.first_name?.[0]}{s.last_name?.[0]}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="absolute top-2 right-3 flex items-center gap-1.5">
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${s.sex === 'F' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'}`}>
                                                                    {s.sex === 'F' ? '♀' : '♂'}
                                                                </span>
                                                                {isInfoNeeded ? (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">📋 Infos requises</span>
                                                                ) : isPending ? (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">⏳ En attente</span>
                                                                ) : isRejected ? (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold">❌ Rejeté</span>
                                                                ) : (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">✓ Approuvé</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Corps de la carte */}
                                                        <div className="pt-9 px-3 pb-3 space-y-2">
                                                            <div>
                                                                <h4 className="font-bold text-white text-sm group-hover:text-teal-300 transition-colors truncate">{s.first_name} {s.last_name}</h4>
                                                                <p className="text-xs text-indigo-400 font-medium truncate">{cls.find(c => c.id === s.classroom_id)?.name || 'Sans classe'}</p>
                                                            </div>
                                                            {/* Badge suspendu */}
                                                            {s.is_active === false && (
                                                                <div className="px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center gap-1.5">
                                                                    <span className="text-[10px] text-red-300 font-bold">🚫 Suspendu</span>
                                                                    {s.suspension_reason && <span className="text-[9px] text-red-400 truncate">{s.suspension_reason}</span>}
                                                                </div>
                                                            )}
                                                            <div className="space-y-1 text-[11px] text-slate-400 bg-black/30 p-2.5 rounded-xl border border-white/5">
                                                                {s.access_code && (
                                                                    <div className="flex justify-between items-center pb-1 border-b border-white/5">
                                                                        <span className="text-slate-500 font-medium">Code d&apos;accès</span>
                                                                        <button
                                                                            onClick={() => { navigator.clipboard.writeText(s.access_code); toast.success('Code d\'accès copié !'); }}
                                                                            className="font-mono text-emerald-400 font-bold hover:text-emerald-300 flex items-center gap-1 text-[11px] bg-emerald-500/10 px-1.5 py-0.5 rounded transition-colors"
                                                                            title="Copier le code d'accès"
                                                                        >
                                                                            {s.access_code} <Copy className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between"><span className="text-slate-500">Matricule</span><span className="font-mono text-slate-200 font-semibold truncate">{s.matricule || '—'}</span></div>
                                                                {s.phone && <div className="flex justify-between"><span className="text-slate-500">Tél</span><span>{s.phone}</span></div>}
                                                                {(s.sky_points !== undefined) && <div className="flex justify-between"><span className="text-slate-500">Sky Pts</span><span className="text-amber-300 font-bold">⭐ {s.sky_points}</span></div>}
                                                            </div>

                                                            {/* Si en attente ou infos requises : Bouton direct pour traiter la demande */}
                                                            {(isPending || isInfoNeeded) && (
                                                                <button
                                                                    onClick={() => { setStudentSubTab('pending'); setChatDetailId(s.id); }}
                                                                    className="w-full py-1.5 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition animate-pulse"
                                                                >
                                                                    <ClipboardList className="w-3.5 h-3.5" />
                                                                    {isInfoNeeded ? 'Voir échanges / Formulaire' : 'Examiner la réponse & Valider'}
                                                                </button>
                                                            )}

                                                            {/* Actions — grille compacte */}
                                                            <div className="grid grid-cols-2 gap-1.5 pt-1">
                                                                <button onClick={() => { setEditStudentId(s.id); setEditStudentData({ ...s }); }} className="text-[10px] py-1.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/20 font-semibold flex items-center justify-center gap-1 transition">
                                                                    <Edit className="w-3 h-3" /> Modifier
                                                                </button>
                                                                <button onClick={() => { setMigrateStudentId(s.id); setMigrateStudentName(`${s.first_name} ${s.last_name}`); setMigrateNewFiliereId(s.filiere_id || ''); setMigrateNewClsId(s.classroom_id || ''); }} className="text-[10px] py-1.5 rounded-xl bg-violet-600/15 hover:bg-violet-600/30 text-violet-300 border border-violet-500/20 font-semibold flex items-center justify-center gap-1 transition">
                                                                    <ArrowRight className="w-3 h-3" /> Migrer
                                                                </button>
                                                                <button onClick={() => exportStudentBulletinPdf(s)} className="text-[10px] py-1.5 rounded-xl bg-slate-700/30 hover:bg-slate-600/40 text-slate-300 border border-white/10 font-semibold flex items-center justify-center gap-1 transition">
                                                                    <Printer className="w-3 h-3" /> Bulletin
                                                                </button>
                                                                <button onClick={() => openCertForStudent(s)} className="text-[10px] py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/20 font-semibold flex items-center justify-center gap-1 transition">
                                                                    <Award className="w-3 h-3" /> Certificat
                                                                </button>
                                                                <button onClick={() => exportReleveNotesPdf(s)} className="col-span-2 text-[10px] py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/30 text-blue-300 border border-blue-500/20 font-semibold flex items-center justify-center gap-1 transition">
                                                                    <ClipboardList className="w-3 h-3" /> Relevé de notes
                                                                </button>
                                                            </div>
                                                            <div className="flex gap-1.5">
                                                                <button onClick={() => resetStudentPin(s.id, s.access_code, `${s.first_name} ${s.last_name}`)} className="flex-1 text-[10px] py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 font-medium flex items-center justify-center gap-1 transition">
                                                                    <RefreshCw className="w-3 h-3" /> Reset PIN
                                                                </button>
                                                                <button onClick={() => setSuspendModal({ id: s.id, name: `${s.first_name} ${s.last_name}`, type: 'student', isSuspended: s.is_active === false })}
                                                                    className={`px-2.5 py-1.5 rounded-xl border font-medium text-[10px] flex items-center gap-1 transition ${s.is_active === false ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20' : 'bg-red-600/10 hover:bg-red-600/20 text-red-400 border-red-500/20'}`}>
                                                                    {s.is_active === false ? '✅' : '🚫'}
                                                                </button>
                                                                <button onClick={() => deleteStudent(s.id)} className="px-2.5 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 transition">
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        )}

                        {/* ═══════════════ SOUS-ONGLET : EN ATTENTE ═══════════════ */}
                        {studentSubTab === 'pending' && (
                            <div className="space-y-4">
                                {(() => {
                                    const pendingFromInsc = inscRequests.filter((r: any) => r.status === 'pending' || r.status === 'info_needed');
                                    const pendingFromStu = students.filter((s: any) => (s.approval_status === 'pending' || s.approval_status === 'info_needed'));
                                    const pending = [
                                        ...pendingFromInsc.map((r: any) => ({ ...r, _source: 'request' })),
                                        ...pendingFromStu.filter((s: any) => !pendingFromInsc.some((r: any) => r.access_code && r.access_code === s.access_code)).map((s: any) => ({ ...s, _source: 'profile', status: s.approval_status })),
                                    ];
                                    if (pending.length === 0) return (
                                        <div className="text-center py-16 text-slate-500"><ClipboardList className="w-14 h-14 mx-auto mb-3 opacity-20" /><p className="text-sm">Aucune demande en attente</p></div>
                                    );
                                    return (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                            {pending.map((req: any) => (
                                                <div key={req.id} className="rounded-2xl border border-white/10 hover:border-amber-500/30 bg-gradient-to-br from-[#131927] to-[#0E121B] shadow-xl transition-all duration-300 overflow-hidden">
                                                    {/* Header */}
                                                    <div className="flex items-center gap-3 p-4 border-b border-white/5">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shrink-0 ${
                                                            req.status === 'info_needed' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                        }`}>{req.first_name?.[0]}{req.last_name?.[0]}</div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-white text-base truncate">{req.first_name} {req.last_name}</h4>
                                                            <p className="text-xs text-slate-400">{req.phone || '—'} · {req.email || '—'}</p>
                                                            <p className="text-[10px] text-slate-500 mt-0.5">Code: <code className="font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded">{req.access_code || '—'}</code> · {new Date(req.created_at || Date.now()).toLocaleDateString('fr')}</p>
                                                        </div>
                                                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold shrink-0 ${
                                                            req.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                        }`}>{req.status === 'pending' ? '⏳ En attente' : '📋 Infos requises'}</span>
                                                    </div>

                                                    {/* Historique Chat */}
                                                    <div className="px-4 py-3 space-y-2">
                                                        <button onClick={() => setChatDetailId(chatDetailId === req.id ? null : req.id)} className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-white transition">
                                                            <span className="font-semibold flex items-center gap-1.5">💬 Historique échanges {(req.admin_message || req.student_response) ? <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span> : null}</span>
                                                            <span>{chatDetailId === req.id ? '▲' : '▼'}</span>
                                                        </button>

                                                        {chatDetailId === req.id && (
                                                            <div className="space-y-2 mt-1">
                                                                {/* Message admin */}
                                                                {req.admin_message && (
                                                                    <div className="flex justify-end">
                                                                        <div className="max-w-[85%] p-3 rounded-2xl rounded-tr-sm bg-indigo-600/20 border border-indigo-500/30">
                                                                            <p className="text-[10px] font-bold text-indigo-300 mb-1">👤 Admin</p>
                                                                            <p className="text-xs text-white leading-relaxed">{req.admin_message}</p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {/* Réponse étudiant */}
                                                                {req.student_response && (
                                                                    <div className="flex justify-start">
                                                                        <div className="max-w-[85%] p-3 rounded-2xl rounded-tl-sm bg-emerald-500/10 border border-emerald-500/30">
                                                                            <p className="text-[10px] font-bold text-emerald-300 mb-1">🎓 Étudiant</p>
                                                                            <p className="text-xs text-white leading-relaxed">{req.student_response}</p>
                                                                            {req.document_url && (
                                                                                <a href={req.document_url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 hover:underline">
                                                                                    <FileText className="w-3 h-3" /> Voir la pièce jointe
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {/* Pièce jointe sans texte */}
                                                                {req.document_url && !req.student_response && (
                                                                    <div className="flex justify-start">
                                                                        <div className="p-3 rounded-2xl rounded-tl-sm bg-emerald-500/10 border border-emerald-500/30">
                                                                            <a href={req.document_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 hover:underline">
                                                                                <FileText className="w-3.5 h-3.5" /> Pièce jointe envoyée par l'étudiant
                                                                            </a>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {!req.admin_message && !req.student_response && !req.document_url && (
                                                                    <p className="text-center text-[11px] text-slate-600 py-2">Aucun échange pour l'instant</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Zone message admin */}
                                                    {inscActionId === req.id && (
                                                        <div className="px-4 pb-3">
                                                            <textarea value={inscMsg} onChange={e => setInscMsg(e.target.value)}
                                                                placeholder="Votre message pour l'étudiant..."
                                                                rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white resize-none focus:border-amber-500/50 outline-none" />
                                                        </div>
                                                    )}

                                                    {/* Actions */}
                                                    <div className="px-4 pb-4 flex flex-wrap gap-2">
                                                        <button onClick={async () => {
                                                            setInscSaving(true);
                                                            try {
                                                                if (req._source === 'request') {
                                                                    const { error: irErr } = await supabase.from('inscription_requests').update({ status: 'approved', admin_message: inscMsg || null }).eq('id', req.id);
                                                                    if (irErr) await supabase.from('inscription_requests').update({ status: 'accepted', admin_message: inscMsg || null }).eq('id', req.id);
                                                                    let updatedSp: any[] | null = null;
                                                                    const { data: resSp } = await supabase.from('student_profiles').update({ approval_status: 'approved' }).or(req.access_code ? `access_code.eq.${req.access_code},id.eq.${req.id}` : `id.eq.${req.id}`).eq('organization_id', org.id).select();
                                                                    updatedSp = resSp;
                                                                    if (!updatedSp || updatedSp.length === 0) {
                                                                        const mat = `STU${Date.now().toString(36).toUpperCase()}`;
                                                                        await supabase.from('student_profiles').insert({ organization_id: org.id, first_name: req.first_name, last_name: req.last_name, phone: req.phone || null, email: req.email || null, address: req.address || null, birth_date: req.birth_date || null, gender: req.gender || null, classroom_id: req.classroom_id || null, filiere_id: req.filiere_id || null, access_code: req.access_code, pin_code: req.pin_code || null, sky_points: 100, pin_set: true, approval_status: 'approved', matricule: mat, nationality: req.nationality || null, guardian_name: req.guardian_name || null, guardian_phone: req.guardian_phone || null, is_active: true });
                                                                    }
                                                                    setInscRequests(p => p.filter((r: any) => r.id !== req.id));
                                                                } else {
                                                                    await supabase.from('student_profiles').update({ approval_status: 'approved' }).eq('id', req.id);
                                                                    if (req.access_code) {
                                                                        await supabase.from('inscription_requests').update({ status: 'approved' }).eq('access_code', req.access_code);
                                                                        setInscRequests(p => p.filter((r: any) => r.access_code !== req.access_code));
                                                                    }
                                                                }
                                                                const { data: freshStudents } = await supabase.from('student_profiles').select('id, organization_id, first_name, last_name, sex, birth_date, classroom_id, filiere_id, phone, guardian_name, guardian_phone, nationality, residence, matricule, access_code, pin_set, approval_status, photo_url, sky_points, created_at, email, address').eq('organization_id', org.id);
                                                                if (freshStudents) setStudents(freshStudents);
                                                                setInscActionId(null); setInscMsg('');
                                                                toast.success(`✅ ${req.first_name} ${req.last_name} approuvé(e) !`);
                                                            } catch (e: any) { toast.error(e.message); }
                                                            setInscSaving(false);
                                                        }} disabled={inscSaving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white disabled:opacity-50 transition shadow-sm">
                                                            {inscSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}Approuver
                                                        </button>

                                                        <button onClick={async () => {
                                                            if (!inscMsg.trim()) { toast.error('Écrivez un message pour l\'étudiant'); return; }
                                                            setInscSaving(true);
                                                            try {
                                                                if (req._source === 'request') {
                                                                    await supabase.from('inscription_requests').update({ status: 'info_needed', admin_message: inscMsg }).eq('id', req.id);
                                                                    await supabase.from('student_profiles').update({ approval_status: 'info_needed' }).or(req.access_code ? `access_code.eq.${req.access_code},id.eq.${req.id}` : `id.eq.${req.id}`).eq('organization_id', org.id);
                                                                    setInscRequests(p => p.map((r: any) => r.id === req.id ? { ...r, status: 'info_needed', admin_message: inscMsg } : r));
                                                                } else {
                                                                    await supabase.from('student_profiles').update({ approval_status: 'info_needed' }).eq('id', req.id);
                                                                    if (req.access_code) {
                                                                        await supabase.from('inscription_requests').update({ status: 'info_needed', admin_message: inscMsg }).eq('access_code', req.access_code);
                                                                    }
                                                                }
                                                                setStudents(p => p.map((s: any) => s.id === req.id ? { ...s, approval_status: 'info_needed' } : s));
                                                                setInscActionId(null); setInscMsg('');
                                                                toast.success('Message envoyé à l\'étudiant');
                                                            } catch (e: any) { toast.error(e.message); }
                                                            setInscSaving(false);
                                                        }} disabled={inscSaving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white disabled:opacity-50 transition shadow-sm">
                                                            <FileText className="w-3.5 h-3.5" />Demander des infos
                                                        </button>

                                                        <button onClick={async () => {
                                                            setInscSaving(true);
                                                            try {
                                                                if (req._source === 'request') {
                                                                    await supabase.from('inscription_requests').update({ status: 'rejected', admin_message: inscMsg || 'Demande non acceptée.' }).eq('id', req.id);
                                                                    await supabase.from('student_profiles').update({ approval_status: 'rejected' }).or(req.access_code ? `access_code.eq.${req.access_code},id.eq.${req.id}` : `id.eq.${req.id}`).eq('organization_id', org.id);
                                                                    setInscRequests(p => p.map((r: any) => r.id === req.id ? { ...r, status: 'rejected' } : r));
                                                                } else {
                                                                    await supabase.from('student_profiles').update({ approval_status: 'rejected' }).eq('id', req.id);
                                                                    if (req.access_code) {
                                                                        await supabase.from('inscription_requests').update({ status: 'rejected', admin_message: inscMsg || 'Demande non acceptée.' }).eq('access_code', req.access_code);
                                                                    }
                                                                }
                                                                setStudents(p => p.map((s: any) => s.id === req.id ? { ...s, approval_status: 'rejected' } : s));
                                                                setInscActionId(null); setInscMsg('');
                                                                toast.success('Demande rejetée');
                                                            } catch (e: any) { toast.error(e.message); }
                                                            setInscSaving(false);
                                                        }} disabled={inscSaving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-500 text-xs font-bold text-white disabled:opacity-50 transition shadow-sm">
                                                            <X className="w-3.5 h-3.5" />Rejeter
                                                        </button>

                                                        <button onClick={() => { setInscActionId(inscActionId === req.id ? null : req.id); setInscMsg(req.admin_message || ''); }}
                                                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-400 border border-white/10 transition">
                                                            <Edit className="w-3 h-3" />{inscActionId === req.id ? 'Annuler' : 'Écrire message'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* ═══════════════ SOUS-ONGLET : REJETÉS ═══════════════ */}
                        {studentSubTab === 'rejected' && (
                            <div className="space-y-4">
                                {(() => {
                                    const rejFromInsc = inscRequests.filter((r: any) => r.status === 'rejected');
                                    const rejFromStu = students.filter((s: any) => s.approval_status === 'rejected');
                                    const all = [
                                        ...rejFromInsc.map((r: any) => ({ ...r, _source: 'request' })),
                                        ...rejFromStu.filter((s: any) => !rejFromInsc.some((r: any) => r.access_code === s.access_code)).map((s: any) => ({ ...s, _source: 'profile' })),
                                    ];
                                    if (all.length === 0) return (
                                        <div className="text-center py-16 text-slate-500"><X className="w-14 h-14 mx-auto mb-3 opacity-20" /><p className="text-sm">Aucune demande rejetée</p></div>
                                    );
                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {all.map((item: any) => (
                                                <div key={item.id} className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-900/10 to-[#0E121B] shadow-lg p-4 space-y-3">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base bg-red-500/15 text-red-300 border border-red-500/30 shrink-0">
                                                            {item.first_name?.[0]}{item.last_name?.[0]}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-white truncate">{item.first_name} {item.last_name}</h4>
                                                            <p className="text-xs text-slate-400">{item.phone || item.email || '—'}</p>
                                                            <p className="text-[10px] text-slate-500">Rejeté le {new Date(item.updated_at || item.created_at).toLocaleDateString('fr')}</p>
                                                        </div>
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold shrink-0">❌ Rejeté</span>
                                                    </div>
                                                    {item.admin_message && (
                                                        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                                                            <p className="text-[10px] text-red-300 font-bold mb-0.5">Motif :</p>
                                                            <p className="text-xs text-slate-300">{item.admin_message}</p>
                                                        </div>
                                                    )}
                                                    {/* Re-approuver */}
                                                    <button onClick={async () => {
                                                        try {
                                                            if (item._source === 'request') {
                                                                const { error: irErr } = await supabase.from('inscription_requests').update({ status: 'approved' }).eq('id', item.id);
                                                                if (irErr) await supabase.from('inscription_requests').update({ status: 'accepted' }).eq('id', item.id);
                                                                await supabase.from('student_profiles').update({ approval_status: 'approved' }).or(`access_code.eq.${item.access_code},id.eq.${item.id}`).eq('organization_id', org.id);
                                                                setInscRequests(p => p.filter((r: any) => r.id !== item.id));
                                                            } else {
                                                                await supabase.from('student_profiles').update({ approval_status: 'approved' }).eq('id', item.id);
                                                                setStudents(p => p.map((s: any) => s.id === item.id ? { ...s, approval_status: 'approved' } : s));
                                                            }
                                                            toast.success(`✅ ${item.first_name} réactivé(e)`);
                                                        } catch (e: any) { toast.error(e.message); }
                                                    }} className="w-full text-xs py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center justify-center gap-1.5 transition">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Ré-approuver
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* ─── MODAL ÉDITION ÉTUDIANT ─── */}
                        {editStudentId && editStudentData && (
                            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                                <div className="w-full max-w-xl rounded-3xl bg-[#0E121B] border border-white/15 shadow-2xl p-6 space-y-5 overflow-y-auto max-h-[90vh]">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-black text-white">✏️ Modifier le profil</h2>
                                        <button onClick={() => { setEditStudentId(null); setEditStudentData(null); }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition"><X className="w-5 h-5" /></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><Label className="text-slate-400 text-xs">Prénom *</Label><Input value={editStudentData.first_name || ''} onChange={e => setEditStudentData((p: any) => ({ ...p, first_name: e.target.value }))} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                        <div><Label className="text-slate-400 text-xs">Nom *</Label><Input value={editStudentData.last_name || ''} onChange={e => setEditStudentData((p: any) => ({ ...p, last_name: e.target.value }))} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                        <div><Label className="text-slate-400 text-xs">Téléphone</Label><Input value={editStudentData.phone || ''} onChange={e => setEditStudentData((p: any) => ({ ...p, phone: e.target.value }))} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                        <div><Label className="text-slate-400 text-xs">Email</Label><Input type="email" value={editStudentData.email || ''} onChange={e => setEditStudentData((p: any) => ({ ...p, email: e.target.value }))} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                        <div><Label className="text-slate-400 text-xs">Date de naissance</Label><Input type="date" value={editStudentData.birth_date || ''} onChange={e => setEditStudentData((p: any) => ({ ...p, birth_date: e.target.value }))} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                        <div><Label className="text-slate-400 text-xs">Nationalité</Label><Input value={editStudentData.nationality || ''} onChange={e => setEditStudentData((p: any) => ({ ...p, nationality: e.target.value }))} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                        <div><Label className="text-slate-400 text-xs">Nom du tuteur</Label><Input value={editStudentData.guardian_name || ''} onChange={e => setEditStudentData((p: any) => ({ ...p, guardian_name: e.target.value }))} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                        <div><Label className="text-slate-400 text-xs">Tél. tuteur</Label><Input value={editStudentData.guardian_phone || ''} onChange={e => setEditStudentData((p: any) => ({ ...p, guardian_phone: e.target.value }))} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                        <div className="col-span-2"><Label className="text-slate-400 text-xs">Adresse / Résidence</Label><Input value={editStudentData.address || editStudentData.residence || ''} onChange={e => setEditStudentData((p: any) => ({ ...p, address: e.target.value, residence: e.target.value }))} className="bg-white/5 border-white/10 text-white h-9 rounded-lg text-sm mt-1" /></div>
                                    </div>
                                    {/* Option : renvoyer le formulaire à l'étudiant */}
                                    <div className="p-4 rounded-2xl bg-blue-600/8 border border-blue-500/20 space-y-2">
                                        <p className="text-xs font-bold text-blue-300">📋 Renvoyer le formulaire d'inscription à l'étudiant</p>
                                        <p className="text-[11px] text-slate-400">L'étudiant sera invité à corriger ses informations depuis son espace.</p>
                                        <textarea value={sendFormMsg} onChange={e => setSendFormMsg(e.target.value)} placeholder="Message expliquant ce qui doit être corrigé..." rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white resize-none focus:border-blue-500/50 outline-none" />
                                        <button onClick={async () => {
                                            if (!sendFormMsg.trim()) { toast.error('Écrivez un message pour guider l\'étudiant'); return; }
                                            try {
                                                const { data: updatedIr } = await supabase.from('inscription_requests')
                                                    .update({ status: 'info_needed', admin_message: sendFormMsg })
                                                    .or(editStudentData.access_code ? `access_code.eq.${editStudentData.access_code},id.eq.${editStudentData.id}` : `id.eq.${editStudentData.id}`)
                                                    .select();

                                                if (!updatedIr || updatedIr.length === 0) {
                                                    const { data: newIr } = await supabase.from('inscription_requests').insert({
                                                        organization_id: org.id,
                                                        first_name: editStudentData.first_name,
                                                        last_name: editStudentData.last_name,
                                                        phone: editStudentData.phone || null,
                                                        email: editStudentData.email || null,
                                                        access_code: editStudentData.access_code || null,
                                                        status: 'info_needed',
                                                        admin_message: sendFormMsg,
                                                        classroom_id: editStudentData.classroom_id || null,
                                                        filiere_id: editStudentData.filiere_id || null,
                                                    }).select().single();
                                                    if (newIr) {
                                                        setInscRequests(p => [newIr, ...p]);
                                                    }
                                                } else {
                                                    setInscRequests(p => p.map(r => r.id === updatedIr[0].id ? { ...r, ...updatedIr[0] } : r));
                                                }

                                                await supabase.from('student_profiles').update({ approval_status: 'info_needed' }).eq('id', editStudentData.id);
                                                setStudents(p => p.map((s: any) => s.id === editStudentData.id ? { ...s, approval_status: 'info_needed' } : s));
                                                setSendFormMsg('');
                                                toast.success('Formulaire renvoyé à l\'étudiant ✅');
                                            } catch (e: any) { toast.error(e.message); }
                                        }} className="text-xs px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 font-semibold flex items-center gap-1.5 transition">
                                            <FileText className="w-3.5 h-3.5" /> Envoyer le formulaire
                                        </button>
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button onClick={() => { setEditStudentId(null); setEditStudentData(null); }} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold transition">Annuler</button>
                                        <button disabled={savingStudent} onClick={async () => {
                                            setSavingStudent(true);
                                            try {
                                                const { error } = await supabase.from('student_profiles').update({
                                                    first_name:    editStudentData.first_name,
                                                    last_name:     editStudentData.last_name,
                                                    phone:         editStudentData.phone || null,
                                                    email:         editStudentData.email || null,
                                                    birth_date:    editStudentData.birth_date || null,
                                                    nationality:   editStudentData.nationality || null,
                                                    guardian_name: editStudentData.guardian_name || null,
                                                    guardian_phone: editStudentData.guardian_phone || null,
                                                    address:       editStudentData.address || null,
                                                    residence:     editStudentData.residence || null,
                                                }).eq('id', editStudentData.id);
                                                if (error) throw error;
                                                setStudents(p => p.map((s: any) => s.id === editStudentData.id ? { ...s, ...editStudentData } : s));
                                                setEditStudentId(null); setEditStudentData(null);
                                                toast.success('Profil mis à jour ✅');
                                            } catch (e: any) { toast.error(e.message); }
                                            setSavingStudent(false);
                                        }} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:opacity-90 text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition shadow-lg">
                                            {savingStudent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Enregistrer
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─── MODAL SUSPENSION / RÉACTIVATION ─── */}
                        {suspendModal && (
                            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
                                <div className="w-full max-w-sm rounded-3xl bg-[#0E121B] border border-white/15 shadow-2xl p-6 space-y-5">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-black text-white">
                                            {suspendModal.isSuspended ? '✅ Réactiver le compte' : '🚫 Suspendre le compte'}
                                        </h2>
                                        <button onClick={() => { setSuspendModal(null); setSuspendReason(''); }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition"><X className="w-5 h-5" /></button>
                                    </div>
                                    <p className="text-sm text-slate-400">
                                        {suspendModal.isSuspended
                                            ? <>Réactiver le compte de <span className="font-bold text-white">{suspendModal.name}</span> ? Il pourra à nouveau se connecter.</>
                                            : <>Suspendre le compte de <span className="font-bold text-white">{suspendModal.name}</span> ? Il ne pourra plus se connecter.</>}
                                    </p>
                                    {!suspendModal.isSuspended && (
                                        <div className="space-y-2">
                                            <label className="text-xs text-slate-400 font-semibold">Motif de suspension</label>
                                            <textarea
                                                value={suspendReason}
                                                onChange={e => setSuspendReason(e.target.value)}
                                                placeholder="Ex: Frais de scolarité impayés, comportement inapproprié..."
                                                rows={3}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white resize-none focus:border-red-500/50 outline-none placeholder-slate-600"
                                            />
                                        </div>
                                    )}
                                    <div className="flex gap-3 pt-1">
                                        <button onClick={() => { setSuspendModal(null); setSuspendReason(''); }} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold transition">Annuler</button>
                                        <button onClick={suspendAccount} disabled={savingSuspend}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition flex items-center justify-center gap-2 ${suspendModal.isSuspended ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}>
                                            {savingSuspend ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                            {suspendModal.isSuspended ? 'Réactiver' : 'Suspendre'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─── MODAL MIGRATION FILIÈRE ─── */}
                        {migrateStudentId && (
                            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                                <div className="w-full max-w-md rounded-3xl bg-[#0E121B] border border-white/15 shadow-2xl p-6 space-y-5">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-black text-white">🔀 Migration de filière</h2>
                                        <button onClick={() => setMigrateStudentId(null)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition"><X className="w-5 h-5" /></button>
                                    </div>
                                    <p className="text-sm text-slate-400">Déplacer <span className="font-bold text-white">{migrateStudentName}</span> vers une autre filière / classe.</p>
                                    <div className="space-y-3">
                                        {filieres.length > 0 && (
                                            <div>
                                                <Label className="text-slate-400 text-xs">Filière cible</Label>
                                                <select value={migrateNewFiliereId} onChange={e => setMigrateNewFiliereId(e.target.value)} className="mt-1 w-full h-10 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm">
                                                    <option value="" className="bg-slate-900">-- Aucune filière --</option>
                                                    {filieres.map((f: any) => <option key={f.id} value={f.id} className="bg-slate-900">{f.nom}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        <div>
                                            <Label className="text-slate-400 text-xs">Classe cible *</Label>
                                            <select value={migrateNewClsId} onChange={e => setMigrateNewClsId(e.target.value)} className="mt-1 w-full h-10 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm">
                                                <option value="" className="bg-slate-900">-- Choisir une classe --</option>
                                                {cls.filter(c => c.id && (!migrateNewFiliereId || c.filiere_id === migrateNewFiliereId)).map(c => <option key={c.id} value={c.id!} className="bg-slate-900">{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-1">
                                        <button onClick={() => setMigrateStudentId(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold transition">Annuler</button>
                                        <button disabled={savingMigrate || !migrateNewClsId} onClick={async () => {
                                            if (!migrateNewClsId) { toast.error('Choisissez une classe'); return; }
                                            setSavingMigrate(true);
                                            try {
                                                const updatePayload: any = { classroom_id: migrateNewClsId };
                                                if (migrateNewFiliereId) updatePayload.filiere_id = migrateNewFiliereId;
                                                const { error } = await supabase.from('student_profiles').update(updatePayload).eq('id', migrateStudentId!);
                                                if (error) throw error;
                                                setStudents(p => p.map((s: any) => s.id === migrateStudentId ? { ...s, ...updatePayload } : s));
                                                setMigrateStudentId(null);
                                                toast.success(`✅ ${migrateStudentName} migré(e) avec succès !`);
                                            } catch (e: any) { toast.error(e.message); }
                                            setSavingMigrate(false);
                                        }} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition shadow-lg">
                                            {savingMigrate ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}Migrer
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

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

                    {/* ═══ STYLES PREMIUM (BOUTIQUE & TEMPLATES) ═══ */}
                    {tab === 'premium_styles' && (
                        <AdminPremiumStyles
                            org={org}
                            orgSlug={orgSlug}
                            adminSkyPoints={adminSkyPoints}
                            onUpdateOrg={(updated) => setOrg(updated)}
                            onUpdatePoints={(pts) => setAdminSkyPoints(pts)}
                        />
                    )}

                    {/* ═══ LANDING PAGE CONFIG ═══ */}
                    {tab === 'landing' && <div className="space-y-6">
                        {/* Banner vers Styles Premium */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-teal-500/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">✨</span>
                                <div>
                                    <h3 className="font-extrabold text-sm text-white">Envie d&apos;une page d&apos;accueil plus moderne et compacte ?</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Explorez nos 5 modèles de landing page interactifs (Hub Onglets, Bento Grid, Glassmorphism).</p>
                                </div>
                            </div>
                            <Button onClick={() => onTab('premium_styles')} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs h-9 px-4 rounded-xl shrink-0">
                                Découvrir les Styles Premium →
                            </Button>
                        </div>

                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-lg flex items-center gap-2"><LayoutDashboard className="w-5 h-5 text-cyan-400" /> Personnaliser votre page d&apos;accueil</h2>
                            <a href={isCustom ? '/' : `/${orgSlug}`} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 rounded-lg bg-teal-600/10 text-teal-300 hover:bg-teal-600/20 flex items-center gap-1 transition"><ExternalLink className="w-3 h-3" />Voir la page</a>
                        </div>
                        <p className="text-xs text-slate-500 -mt-3">Les coordonnées (téléphone, email, adresse) s&apos;affichent automatiquement depuis vos informations d&apos;inscription.</p>

                        {/* Hero */}
                        <div className="p-5 rounded-xl bg-cyan-600/5 border border-cyan-500/20 space-y-4">
                            <h3 className="font-bold text-cyan-300 flex items-center gap-2"><Upload className="w-4 h-4" /> Hero / Bannière</h3>

                            {/* Template selector */}
                            <div>
                                <Label className="text-slate-400 text-xs mb-2 block">Modèle de bannière</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {([
                                        { id: 'full', label: 'Plein écran', desc: 'Image en fond, texte centré', icon: '🖼️' },
                                        { id: 'split', label: 'Deux colonnes', desc: 'Texte à gauche, image à droite', icon: '⬛' },
                                        { id: 'minimal', label: 'Minimaliste', desc: 'Dégradé de couleur, pas d\'image', icon: '✨' },
                                    ] as const).map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setLHeroTemplate(t.id)}
                                            className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                                                lHeroTemplate === t.id
                                                    ? 'border-cyan-400 bg-cyan-500/10'
                                                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                                            }`}
                                        >
                                            <span className="text-xl block mb-1">{t.icon}</span>
                                            <p className="text-xs font-semibold text-white">{t.label}</p>
                                            <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{t.desc}</p>
                                            {lHeroTemplate === t.id && (
                                                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center">
                                                    <span className="text-black text-[8px] font-black">✓</span>
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-slate-400 text-xs">Image bannière {lHeroTemplate === 'minimal' ? '(non utilisée sur ce modèle)' : ''}</Label>
                                    <div onClick={() => heroImgRef.current?.click()} className={`mt-1 w-full p-4 border-2 border-dashed rounded-xl bg-white/[0.02] transition-colors cursor-pointer text-center ${ lHeroTemplate === 'minimal' ? 'border-white/5 opacity-40 pointer-events-none' : 'border-white/10 hover:border-cyan-500/30' }`}>
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

                        {/* ── SECURITY PIN CARD ── */}
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/60 border border-white/10">
                            <h3 className="font-bold mb-1 flex items-center gap-2 text-white">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                Code PIN de sécurité — Documents officiels
                            </h3>
                            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                Ce code PIN est requis avant chaque export de document officiel (Certificat, Bulletin, Relevé, Reçu).
                                Il vous engage personnellement en tant que responsable légal de l'établissement.
                            </p>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <div className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border",
                                    adminSecurityPin
                                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                        : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                )}>
                                    {adminSecurityPin
                                        ? <><ShieldCheck className="w-4 h-4" /> PIN actif — Protection activée</>
                                        : <><Lock className="w-4 h-4" /> Aucun PIN défini — Non protégé</>
                                    }
                                </div>
                                <div className="flex items-center gap-2">
                                    {!adminSecurityPin ? (
                                        <button
                                            onClick={() => { setPinModalMode('set_pin'); setPinInput(''); setPinConfirmInput(''); setPinError(''); setPinModalOpen(true); }}
                                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                                        >
                                            <KeyRound className="w-3.5 h-3.5" /> Définir mon PIN
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => { setPinModalMode('change_pin'); setPinInput(''); setPinConfirmInput(''); setOldPinInput(''); setPinError(''); setPinModalOpen(true); }}
                                                className="px-4 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                                            >
                                                <KeyRound className="w-3.5 h-3.5" /> Modifier le PIN
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── SKY POINTS OVERVIEW ── */}
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/30 to-orange-950/20 border border-amber-500/20">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold flex items-center gap-2 text-white">
                                    <span className="text-xl">⭐</span> Sky Points — Votre solde
                                </h3>
                                <button onClick={() => setShowPointsModal(true)} className="text-xs text-amber-400 hover:text-amber-300 transition underline underline-offset-2">
                                    Voir le barème complet
                                </button>
                            </div>
                            <div className="flex items-end gap-2 mb-4">
                                <span className="text-4xl font-extrabold text-amber-300">{new Intl.NumberFormat('fr-FR').format(adminSkyPoints)}</span>
                                <span className="text-amber-400/70 text-sm mb-1">Sky Points</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-center">
                                {[
                                    { label: 'Bonus création', value: '+1 000 pts', color: 'text-emerald-300' },
                                    { label: 'Bonus quotidien', value: '+1 pt / jour', color: 'text-teal-300' },
                                    { label: 'Export document', value: '−1 pt', color: 'text-red-400' },
                                    { label: 'Monitoring (once)', value: '−10 pts', color: 'text-violet-400' },
                                ].map((item, i) => (
                                    <div key={i} className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                                        <div className={`font-bold ${item.color}`}>{item.value}</div>
                                        <div className="text-slate-500 mt-0.5">{item.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

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
                                    <p className="text-emerald-500 text-xs">{sCustomDomain ? `https://${sCustomDomain}` : `https://iziteach.com/${orgSlug}`}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{sMetaDesc || `Portail en ligne de ${org.name}. Accédez à vos cours, notes et informations.`}</p>
                                </div>
                            </div>
                        </div>

                        {/* ── SIGNATURE & CACHET OFFICIEL ── */}
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-600/10 via-white/[0.02] to-teal-600/10 border border-amber-500/20 space-y-4">
                            <div>
                                <h3 className="font-bold text-base text-white flex items-center gap-2">
                                    <Award className="w-5 h-5 text-amber-400" />
                                    Signature & Cachet Officiels de l'Établissement
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    Téléversez la signature et le cachet de votre établissement. Ils s'insèreront automatiquement et proprement sur vos <strong>Bulletins de notes</strong>, <strong>Certificats de formation</strong>, <strong>Reçus de paiement</strong> et <strong>Relevés de notes</strong>.
                                </p>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4 pt-1">
                                {/* Signature */}
                                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-slate-300 text-xs font-bold flex items-center gap-1.5">
                                            <Edit className="w-3.5 h-3.5 text-teal-400" />
                                            Signature du Directeur / Signataire
                                        </Label>
                                        {sSignatureUrl && (
                                            <button
                                                onClick={async () => {
                                                    setSSignatureUrl('');
                                                    await supabase.from('organizations').update({ signature_url: null }).eq('id', org.id);
                                                    setOrg({ ...org, signature_url: null });
                                                    toast.success('Signature supprimée');
                                                }}
                                                className="text-[10px] text-red-400 hover:text-red-300 transition"
                                            >
                                                Supprimer
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {sSignatureUrl ? (
                                            <div className="w-32 h-20 rounded-xl bg-white/10 p-2 border border-teal-500/30 flex items-center justify-center">
                                                <img src={sSignatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className="w-32 h-20 rounded-xl bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center text-slate-500 text-[10px] p-2 text-center">
                                                <Edit className="w-5 h-5 mb-1 opacity-50" />
                                                Aucune signature
                                            </div>
                                        )}
                                        <div className="flex-1 space-y-1.5">
                                            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" id="settings-signature-upload" onChange={handleSettingsSignatureUpload} />
                                            <label htmlFor="settings-signature-upload" className="cursor-pointer px-3.5 py-2 rounded-xl bg-teal-600/20 text-teal-300 hover:bg-teal-600/30 border border-teal-500/30 text-xs font-semibold transition inline-flex items-center gap-1.5">
                                                <Upload className="w-3.5 h-3.5" /> {sSignatureUrl ? 'Remplacer signature' : 'Uploader signature'}
                                            </label>
                                            <p className="text-[10px] text-slate-500">Format PNG transparent recommandé (max 5 Mo)</p>
                                            {uploadingSignature && <p className="text-xs text-teal-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Enregistrement...</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Cachet */}
                                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-slate-300 text-xs font-bold flex items-center gap-1.5">
                                            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                                            Cachet / Sceau Officiel
                                        </Label>
                                        {sStampUrl && (
                                            <button
                                                onClick={async () => {
                                                    setSStampUrl('');
                                                    await supabase.from('organizations').update({ stamp_url: null }).eq('id', org.id);
                                                    setOrg({ ...org, stamp_url: null });
                                                    toast.success('Cachet supprimé');
                                                }}
                                                className="text-[10px] text-red-400 hover:text-red-300 transition"
                                            >
                                                Supprimer
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {sStampUrl ? (
                                            <div className="w-24 h-20 rounded-xl bg-white/10 p-2 border border-amber-500/30 flex items-center justify-center">
                                                <img src={sStampUrl} alt="Cachet" className="max-h-full max-w-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className="w-24 h-20 rounded-xl bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center text-slate-500 text-[10px] p-2 text-center">
                                                <ShieldCheck className="w-5 h-5 mb-1 opacity-50" />
                                                Aucun cachet
                                            </div>
                                        )}
                                        <div className="flex-1 space-y-1.5">
                                            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" id="settings-stamp-upload" onChange={handleSettingsStampUpload} />
                                            <label htmlFor="settings-stamp-upload" className="cursor-pointer px-3.5 py-2 rounded-xl bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 border border-amber-500/30 text-xs font-semibold transition inline-flex items-center gap-1.5">
                                                <Upload className="w-3.5 h-3.5" /> {sStampUrl ? 'Remplacer cachet' : 'Uploader cachet'}
                                            </label>
                                            <p className="text-[10px] text-slate-500">Tampon rond ou rectangulaire (fond transparent conseillé)</p>
                                            {uploadingStamp && <p className="text-xs text-amber-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Enregistrement...</p>}
                                        </div>
                                    </div>
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

                        {/* ── Mon Avis & Témoignage ── */}
                        {org && (
                            <div className="pt-2">
                                <ReviewSection
                                    userId={session?.user?.id || org.id}
                                    userName={org.name}
                                    userRole="admin"
                                    orgId={org.id}
                                    orgName={org.name}
                                />
                            </div>
                        )}

                        {/* ── Signaler un bug ── */}
                        {org && (
                            <div className="flex justify-start pt-1">
                                <BugReportButton
                                    userId={session?.user?.id || org.id}
                                    userName={`Admin (${org.name})`}
                                    userRole="admin"
                                    orgId={org.id}
                                    orgName={org.name}
                                    orgSlug={org.slug}
                                />
                            </div>
                        )}

                        {/* Save button */}
                        <div className="flex justify-end pt-4">
                            <Button onClick={saveSettings} disabled={sSavingSettings} className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8">
                                {sSavingSettings ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Sauvegarder tous les paramètres
                            </Button>
                        </div>
                    </div>}

                    {/* ═══ CURSUS — Admin crée Matière / Chapitre / Leçon ═══ */}
                    {tab === 'cursus' && org && (
                        <AdminCursus
                            orgId={org.id}
                            allClasses={cls.filter((c: any) => c.id)}
                            allTeachers={teachers}
                            allStudents={students}
                            orgName={org.name}
                            orgLogo={org.logo_url}
                        />
                    )}


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

                    {/* ── MONITORING CONVERSATIONS (admin spy mode) ── */}
                    {tab === 'monitoring' && org && (
                        <div className="space-y-4">
                            {/* ── UNLOCK GATE ── */}
                            {!monitoringUnlocked ? (
                                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                                    <div className="relative mb-6">
                                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-600/30 to-purple-900/30 border border-violet-500/30 flex items-center justify-center text-5xl shadow-2xl shadow-violet-900/40">
                                            👁️
                                        </div>
                                        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-500 border-2 border-[#0B0E14] flex items-center justify-center">
                                            <Lock className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <h2 className="text-2xl font-black text-white mb-2">Monitoring Conversations</h2>
                                    <p className="text-slate-400 text-sm max-w-md mb-6 leading-relaxed">
                                        Surveillez en temps réel toutes les conversations DM et de groupe de votre établissement.
                                        Cette fonctionnalité est à débloquer <strong className="text-white">une seule fois</strong> pour un accès permanent.
                                    </p>
                                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 mb-6 max-w-sm w-full">
                                        <div className="flex items-center justify-between text-sm mb-3">
                                            <span className="text-slate-400">Coût de déblocage</span>
                                            <span className="text-amber-300 font-bold text-lg">⭐ −10 Sky Points</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-400">Votre solde actuel</span>
                                            <span className="text-white font-semibold">⭐ {new Intl.NumberFormat('fr-FR').format(adminSkyPoints)} pts</span>
                                        </div>
                                        {adminSkyPoints < 10 && (
                                            <p className="text-xs text-red-400 mt-3 text-center">
                                                Solde insuffisant. Revenez chaque jour pour gagner +1 Sky Point.
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={unlockMonitoring}
                                        disabled={adminSkyPoints < 10}
                                        className="px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-900/40 flex items-center gap-2"
                                    >
                                        <Lock className="w-4 h-4" />
                                        Débloquer le Monitoring (−10 Sky Points)
                                    </button>
                                    <p className="text-xs text-slate-600 mt-4">Déblocage permanent • Ne sera plus demandé par la suite</p>
                                </div>
                            ) : (
                            <>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black text-white flex items-center gap-2">👁️ Monitoring Conversations</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Surveillance en temps réel de tous les DM et groupes</p>
                                </div>
                                <button onClick={async () => {
                                    setMonitoringLoaded(false);
                                    const { data: convs } = await supabase
                                        .from('chat_conversations')
                                        .select('*, chat_participants(user_id)')
                                        .eq('organization_id', org.id)
                                        .order('created_at', { ascending: false });
                                    // Enrich avec le dernier message
                                    const enriched = await Promise.all((convs || []).map(async (c: any) => {
                                        const { data: lastMsg } = await supabase.from('chat_messages')
                                            .select('content, created_at, sender_id').eq('conversation_id', c.id)
                                            .order('created_at', { ascending: false }).limit(1).maybeSingle();
                                        const { count } = await supabase.from('chat_messages')
                                            .select('id', { count: 'exact', head: true }).eq('conversation_id', c.id);
                                        return { ...c, lastMessage: lastMsg?.content, lastMessageAt: lastMsg?.created_at || c.created_at, totalMessages: count || 0 };
                                    }));
                                    enriched.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
                                    setMonitoringConvs(enriched);
                                    setMonitoringLoaded(true);
                                }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition">
                                    Charger toutes les conversations
                                </button>
                            </div>

                            {!monitoringLoaded ? (
                                <div className="text-center py-16 text-slate-500">
                                    <p className="text-4xl mb-3">👁️</p>
                                    <p className="font-medium">Cliquez sur "Charger toutes les conversations" pour commencer la surveillance</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
                                    {/* Liste conversations */}
                                    <div className="lg:col-span-1 bg-black/30 rounded-2xl border border-white/10 overflow-hidden flex flex-col">
                                        <div className="p-3 border-b border-white/5">
                                            <input value={monitoringSearch} onChange={e => setMonitoringSearch(e.target.value)}
                                                placeholder="Rechercher une conversation..."
                                                className="w-full h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white placeholder:text-slate-600 outline-none focus:border-violet-500/50" />
                                        </div>
                                        <div className="flex-1 overflow-y-auto">
                                            {monitoringConvs
                                                .filter(c => !monitoringSearch || (c.name || '').toLowerCase().includes(monitoringSearch.toLowerCase()))
                                                .map((conv: any) => (
                                                <button key={conv.id} onClick={async () => {
                                                    setMonitoringActiveConv(conv);
                                                    setMonitoringLoadingMsgs(true);
                                                    const { data: msgs } = await supabase.from('chat_messages')
                                                        .select('*').eq('conversation_id', conv.id)
                                                        .order('created_at', { ascending: true }).limit(100);
                                                    setMonitoringMessages(msgs || []);
                                                    setMonitoringLoadingMsgs(false);
                                                }}
                                                    className={`w-full text-left p-3 border-b border-white/5 hover:bg-white/5 transition ${
                                                        monitoringActiveConv?.id === conv.id ? 'bg-violet-500/10 border-l-2 border-l-violet-500' : ''
                                                    }`}>
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-white truncate">{conv.name || 'Conversation sans nom'}</p>
                                                            <p className="text-[10px] text-slate-500 mt-0.5">{conv.type === 'direct' ? '💬 DM' : '👥 Groupe'} · {conv.totalMessages} msgs</p>
                                                            {conv.lastMessage && (
                                                                <p className={`text-[10px] truncate mt-1 ${conv.lastMsgType === 'image' ? 'text-teal-400' : conv.lastMsgType === 'voice' ? 'text-amber-400' : conv.lastMsgType === 'file' ? 'text-blue-400' : 'text-slate-400'}`}>{conv.lastMessage}</p>
                                                            )}
                                                        </div>
                                                        <div className="shrink-0 text-right">
                                                            <span className="text-[9px] text-slate-600 block">{conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' }) : ''}</span>
                                                            {conv.totalMessages > 0 && <span className="text-[8px] bg-violet-500/30 text-violet-300 rounded-full px-1.5 py-0.5 mt-0.5 inline-block">{conv.totalMessages}</span>}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                            {monitoringConvs.length === 0 && (
                                                <div className="text-center py-10 text-slate-600 text-xs">Aucune conversation trouvée</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Messages de la conversation sélectionnée */}
                                    <div className="lg:col-span-2 bg-black/30 rounded-2xl border border-white/10 overflow-hidden flex flex-col">
                                        {!monitoringActiveConv ? (
                                            <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
                                                Sélectionnez une conversation pour voir les messages
                                            </div>
                                        ) : (
                                            <>
                                                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                                    <div>
                                                        <h3 className="font-bold text-white text-sm">{monitoringActiveConv.name || 'Conversation'}</h3>
                                                        <p className="text-[10px] text-slate-500">{monitoringActiveConv.type === 'direct' ? 'Message Direct' : 'Groupe'} · {monitoringMessages.length} messages</p>
                                                    </div>
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold">🔴 MODE SURVEILLANCE</span>
                                                </div>
                                                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                                    {monitoringLoadingMsgs ? (
                                                        <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-500" /></div>
                                                    ) : monitoringMessages.length === 0 ? (
                                                        <div className="text-center py-10 text-slate-600 text-xs">Aucun message dans cette conversation</div>
                                                    ) : monitoringMessages.map((msg: any) => {
                                                        const senderStu = students.find((s: any) => s.id === msg.sender_id);
                                                        const senderProf = teachers.find((t: any) => t.id === msg.sender_id);
                                                        const senderName = senderStu
                                                            ? `${senderStu.first_name} ${senderStu.last_name}`
                                                            : senderProf
                                                            ? `${senderProf.first_name} ${senderProf.last_name}`
                                                            : 'Admin';
                                                        const senderRole = senderStu ? 'Étudiant' : senderProf ? 'Professeur' : 'Admin';
                                                        const roleColor = senderStu ? 'text-teal-300' : senderProf ? 'text-amber-300' : 'text-violet-300';
                                                        return (
                                                            <div key={msg.id} className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black bg-white/10 ${roleColor}`}>
                                                                            {senderName[0]}{senderName.split(' ')[1]?.[0] || ''}
                                                                        </div>
                                                                        <div>
                                                                            <span className={`text-[11px] font-bold ${roleColor}`}>{senderName}</span>
                                                                            <span className="ml-1.5 text-[10px] text-slate-600 font-normal">({senderRole})</span>
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-[9px] text-slate-600">{new Date(msg.created_at).toLocaleString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
                                                                </div>
                                                                {/* Contenu du message selon son type */}
                                                                {msg.msg_type === 'image' && msg.media_url ? (
                                                                    <div className="relative group">
                                                                        <img
                                                                            src={msg.media_url}
                                                                            alt="Image envoyée"
                                                                            className="w-full max-h-48 object-cover rounded-xl border border-white/10 cursor-pointer hover:opacity-90 transition"
                                                                            onClick={() => setSelectedImageModal(msg.media_url)}
                                                                        />
                                                                        <button
                                                                            onClick={() => setSelectedImageModal(msg.media_url)}
                                                                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                                                                        >
                                                                            <Maximize2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        {msg.content && <p className="text-xs text-slate-400 mt-1.5 leading-relaxed italic">{msg.content}</p>}
                                                                    </div>
                                                                ) : msg.msg_type === 'voice' && msg.media_url ? (
                                                                    <div className="flex items-center gap-3 bg-teal-600/10 border border-teal-500/20 rounded-xl p-2.5">
                                                                        <Volume2 className="w-4 h-4 text-teal-400 shrink-0" />
                                                                        <audio
                                                                            src={msg.media_url}
                                                                            controls
                                                                            className="flex-1 h-8"
                                                                            style={{ filter: 'invert(0.8) hue-rotate(150deg) brightness(0.9)' }}
                                                                        />
                                                                    </div>
                                                                ) : msg.msg_type === 'file' && msg.media_url ? (
                                                                    <a
                                                                        href={msg.media_url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600/20 transition"
                                                                    >
                                                                        <FileDown className="w-4 h-4 text-blue-400 shrink-0" />
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="text-xs font-medium text-blue-300 truncate">{msg.content || 'Fichier joint'}</p>
                                                                            <p className="text-[10px] text-slate-500">Cliquer pour télécharger</p>
                                                                        </div>
                                                                        <Download className="w-3.5 h-3.5 text-slate-500" />
                                                                    </a>
                                                                ) : msg.msg_type === 'system' ? (
                                                                    <p className="text-xs text-slate-500 italic text-center">{msg.content}</p>
                                                                ) : (
                                                                    <p className="text-xs text-white leading-relaxed">{msg.content}</p>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className="p-3 border-t border-white/5 text-center">
                                                    <p className="text-[10px] text-slate-600">Mode lecture seule — L'admin ne peut pas envoyer de messages ici</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                            </>
                            )}
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
                                allStudents={students}
                                orgName={org.name}
                                orgLogo={org.logo_url}
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

                    {/* ── CERTIFICATS ── */}
                    {tab === 'certificates' && (
                        <div className="space-y-6 max-w-5xl">
                            {/* Header */}
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div>
                                    <h2 className="text-xl font-black text-white flex items-center gap-2">🎓 Générateur de Certificats</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Créez, personnalisez et exportez des certificats officiels en PDF haute qualité</p>
                                </div>
                                <button
                                    onClick={generateCert}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-2xl font-bold text-sm shadow-lg shadow-amber-500/25 transition-all active:scale-95"
                                >
                                    <FileDown className="w-4 h-4" />
                                    Générer le certificat PDF
                                </button>
                            </div>

                            <div className="grid lg:grid-cols-2 gap-6">
                                {/* Left column: Student + certificate details */}
                                <div className="space-y-4">

                                    {/* Student selection */}
                                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                                        <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-amber-400" /> Étudiant</h3>
                                        <div>
                                            <Label className="text-slate-400 text-xs">Sélectionner un étudiant *</Label>
                                            <select
                                                value={certStudentId}
                                                onChange={e => {
                                                    setCertStudentId(e.target.value);
                                                    const s = students.find((x: any) => x.id === e.target.value);
                                                    if (s) {
                                                        const clsObj = cls.find(c => c.id === s.classroom_id);
                                                        setCertCourseName(clsObj?.name || 'Formation Spécialisée');
                                                    }
                                                }}
                                                className="w-full h-9 mt-1 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm"
                                            >
                                                <option value="" className="bg-slate-900">— Choisir un étudiant —</option>
                                                {students.filter((s: any) => s.approval_status === 'approved' || !s.approval_status).map((s: any) => (
                                                    <option key={s.id} value={s.id} className="bg-slate-900">
                                                        {s.first_name} {s.last_name}{s.matricule ? ` — ${s.matricule}` : ''}{cls.find(c => c.id === s.classroom_id) ? ` (${cls.find(c => c.id === s.classroom_id)?.name})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Certificate fields */}
                                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                                        <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-400" /> Informations du certificat</h3>

                                        <div className="grid grid-cols-1 gap-3">
                                            <div>
                                                <Label className="text-slate-400 text-xs">Titre principal</Label>
                                                <Input value={certTitle} onChange={e => setCertTitle(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1" placeholder="CERTIFICAT DE FIN DE FORMATION" />
                                            </div>
                                            <div>
                                                <Label className="text-slate-400 text-xs">Sous-titre</Label>
                                                <Input value={certSubtitle} onChange={e => setCertSubtitle(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1" placeholder="ATTESTATION DE RÉUSSITE ACADÉMIQUE" />
                                            </div>
                                            <div>
                                                <Label className="text-slate-400 text-xs">Formation / Filière</Label>
                                                <Input value={certCourseName} onChange={e => setCertCourseName(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1" placeholder="Développement Web & Mobile" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label className="text-slate-400 text-xs">Mention</Label>
                                                    <select value={certMention} onChange={e => setCertMention(e.target.value)} className="w-full h-9 mt-1 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm">
                                                        <option className="bg-slate-900" value="Mention Très Bien">Mention Très Bien</option>
                                                        <option className="bg-slate-900" value="Mention Bien">Mention Bien</option>
                                                        <option className="bg-slate-900" value="Mention Assez Bien">Mention Assez Bien</option>
                                                        <option className="bg-slate-900" value="Mention Passable">Mention Passable</option>
                                                        <option className="bg-slate-900" value="Excellence">Excellence</option>
                                                        <option className="bg-slate-900" value="Sans mention">Sans mention</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <Label className="text-slate-400 text-xs">Lieu de délivrance</Label>
                                                    <Input value={certLocation} onChange={e => setCertLocation(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1" placeholder="Yaoundé" />
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-slate-400 text-xs">Date de délivrance</Label>
                                                <Input value={certDate} onChange={e => setCertDate(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1" placeholder="14 août 2026" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Signataires */}
                                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                                        <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2"><Edit className="w-4 h-4 text-teal-400" /> Signataires</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label className="text-slate-400 text-xs">Nom signataire 1</Label>
                                                <Input value={certSignatory1Name} onChange={e => setCertSignatory1Name(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1" placeholder="Nom du directeur" />
                                            </div>
                                            <div>
                                                <Label className="text-slate-400 text-xs">Titre signataire 1</Label>
                                                <Input value={certSignatory1Title} onChange={e => setCertSignatory1Title(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1" placeholder="Le Directeur Général" />
                                            </div>
                                            <div>
                                                <Label className="text-slate-400 text-xs">Nom signataire 2</Label>
                                                <Input value={certSignatory2Name} onChange={e => setCertSignatory2Name(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1" placeholder="Nom du responsable" />
                                            </div>
                                            <div>
                                                <Label className="text-slate-400 text-xs">Titre signataire 2</Label>
                                                <Input value={certSignatory2Title} onChange={e => setCertSignatory2Title(e.target.value)} className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-sm mt-1" placeholder="Le Responsable Pédagogique" />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 pt-1">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={certShowSignature} onChange={e => setCertShowSignature(e.target.checked)} className="w-4 h-4 accent-teal-500 rounded" />
                                                <span className="text-xs text-slate-300">Afficher la signature</span>
                                                {sSignatureUrl || org?.signature_url
                                                    ? <span className="text-[10px] text-teal-400">✓ chargée</span>
                                                    : <span className="text-[10px] text-slate-500">(non configurée)</span>
                                                }
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={certShowStamp} onChange={e => setCertShowStamp(e.target.checked)} className="w-4 h-4 accent-amber-500 rounded" />
                                                <span className="text-xs text-slate-300">Afficher le cachet</span>
                                                {sStampUrl || org?.stamp_url
                                                    ? <span className="text-[10px] text-amber-400">✓ chargé</span>
                                                    : <span className="text-[10px] text-slate-500">(non configuré)</span>
                                                }
                                            </label>
                                        </div>
                                        {(!org?.signature_url && !sSignatureUrl) || (!org?.stamp_url && !sStampUrl) ? (
                                            <p className="text-[10px] text-slate-500 bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                                                💡 Pour ajouter votre signature et cachet sur les certificats, allez dans <button onClick={() => onTab('settings')} className="text-teal-400 underline underline-offset-2">Paramètres</button> → section Signature & Cachet officiel.
                                            </p>
                                        ) : null}
                                    </div>
                                </div>

                                {/* Right column: Template selector */}
                                <div className="space-y-4">
                                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                                        <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2"><Palette className="w-4 h-4 text-violet-400" /> Modèle de certificat</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {CERTIFICATE_TEMPLATES.map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setCertTemplate(t.id)}
                                                    className={`p-4 rounded-2xl border-2 text-left transition-all relative ${certTemplate === t.id
                                                        ? 'border-amber-500 bg-amber-600/10 shadow-lg shadow-amber-500/10'
                                                        : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'}`}
                                                >
                                                    {certTemplate === t.id && (
                                                        <CheckCircle2 className="w-4 h-4 text-amber-400 absolute top-3 right-3" />
                                                    )}
                                                    <span className="text-3xl block mb-2">{t.icon}</span>
                                                    <p className="font-bold text-xs text-white mb-1">{t.name}</p>
                                                    <p className="text-[10px] text-slate-500 leading-relaxed">{t.description}</p>
                                                    <p className="text-[9px] text-slate-600 mt-2 italic">{t.suited}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Preview info card */}
                                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-600/10 to-orange-600/5 border border-amber-500/20 space-y-2">
                                        <p className="text-sm font-bold text-amber-300 flex items-center gap-2"><Award className="w-4 h-4" /> Récapitulatif du certificat</p>
                                        <div className="space-y-1 text-xs text-slate-400">
                                            <div className="flex justify-between"><span className="text-slate-500">Étudiant</span><span className="text-white font-medium">{certStudentId ? (() => { const s = students.find((x: any) => x.id === certStudentId); return s ? `${s.first_name} ${s.last_name}` : '—'; })() : '—'}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-500">Formation</span><span className="text-white font-medium truncate ml-4 max-w-[180px]">{certCourseName || '—'}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-500">Mention</span><span className="text-amber-300 font-medium">{certMention !== 'Sans mention' ? certMention : '—'}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-500">Date</span><span className="text-white">{certDate || '—'}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-500">Lieu</span><span className="text-white">{certLocation || '—'}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-500">Modèle</span><span className="text-white">{CERTIFICATE_TEMPLATES.find(t => t.id === certTemplate)?.name || '—'}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-500">Format</span><span className="text-teal-300">A4 Paysage · PDF</span></div>
                                        </div>
                                        <button
                                            onClick={generateCert}
                                            disabled={!certStudentId}
                                            className="mt-2 w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                                        >
                                            <FileDown className="w-4 h-4" />
                                            {certStudentId ? 'Générer & Imprimer le PDF' : 'Sélectionner un étudiant d\'abord'}
                                        </button>
                                    </div>

                                    {/* Quick link: Students */}
                                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
                                        <GraduationCap className="w-5 h-5 text-teal-400 shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-xs font-medium text-slate-300">Générer depuis la liste des étudiants</p>
                                            <p className="text-[10px] text-slate-600">Utilisez le bouton 🎓 sur chaque carte étudiant pour pré-remplir automatiquement.</p>
                                        </div>
                                        <button onClick={() => onTab('students')} className="text-[10px] px-3 py-1.5 rounded-lg bg-teal-600/10 text-teal-300 hover:bg-teal-600/20 transition font-medium whitespace-nowrap">Voir étudiants</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── SKY AGENT ── */}
                    {tab === 'ai_agents' && org && (
                        <div className="max-w-5xl mx-auto">
                            <AiAgentsManager orgId={org.id} orgSlug={orgSlug} />
                        </div>
                    )}

                </div>
            </main>

            {/* ════════════════════════════════════════════════════════════════
                SECURITY PIN MODAL
            ════════════════════════════════════════════════════════════════ */}
            {pinModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={() => { if (!pinLoading) setPinModalOpen(false); }}>
                    <div className="bg-[#0f1520] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-6 pt-7 pb-4 text-center border-b border-white/[0.06]">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600/30 to-teal-600/20 border border-emerald-500/30 mx-auto mb-4 flex items-center justify-center">
                                <ShieldCheck className="w-7 h-7 text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-black text-white mb-1">
                                {pinModalMode === 'set_pin' && '🔐 Définir votre code PIN'}
                                {pinModalMode === 'verify_pin' && `🔒 Code PIN requis`}
                                {pinModalMode === 'change_pin' && '🔑 Modifier votre code PIN'}
                            </h3>
                            {pinModalMode === 'verify_pin' && pendingDocName && (
                                <p className="text-xs text-slate-400 mt-1">
                                    Document : <span className="text-white font-semibold">{pendingDocName}</span>
                                    {pendingCost > 0 && <span className="ml-2 text-amber-400">⭐ −{pendingCost} Sky Point{pendingCost > 1 ? 's' : ''}</span>}
                                </p>
                            )}
                        </div>

                        {/* Engagement message — shown only when setting PIN */}
                        {pinModalMode === 'set_pin' && (
                            <div className="mx-6 mt-5 p-4 rounded-xl bg-amber-500/8 border border-amber-500/20 text-xs text-amber-200 leading-relaxed">
                                <p className="font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
                                    ⚠️ Engagement de confidentialité
                                </p>
                                <p>
                                    En définissant ce code PIN, vous vous engagez personnellement en tant que responsable légal de l'établissement.
                                    Ce PIN protège l'émission de tous vos documents officiels — <strong>certificats, bulletins, relevés de notes et reçus de paiement</strong>.
                                </p>
                                <p className="mt-2 font-semibold text-amber-300">
                                    🔒 Gardez ce PIN strictement secret. Toute génération non autorisée engage votre responsabilité.
                                </p>
                            </div>
                        )}

                        {/* Form */}
                        <div className="px-6 py-5 space-y-3">
                            {pinModalMode === 'change_pin' && (
                                <div>
                                    <label className="text-xs text-slate-500 mb-1.5 block">Ancien code PIN (4 chiffres)</label>
                                    <input
                                        type="password"
                                        inputMode="numeric"
                                        maxLength={4}
                                        value={oldPinInput}
                                        onChange={e => setOldPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        placeholder="••••"
                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-center text-2xl tracking-[0.5em] placeholder:text-slate-700 outline-none focus:border-emerald-500/50"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="text-xs text-slate-500 mb-1.5 block">
                                    {pinModalMode === 'verify_pin' ? 'Votre code PIN (4 chiffres)' : 'Nouveau code PIN (4 chiffres)'}
                                </label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={4}
                                    value={pinInput}
                                    onChange={e => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="••••"
                                    autoFocus
                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-center text-2xl tracking-[0.5em] placeholder:text-slate-700 outline-none focus:border-emerald-500/50"
                                />
                            </div>
                            {(pinModalMode === 'set_pin' || pinModalMode === 'change_pin') && (
                                <div>
                                    <label className="text-xs text-slate-500 mb-1.5 block">Confirmer le code PIN</label>
                                    <input
                                        type="password"
                                        inputMode="numeric"
                                        maxLength={4}
                                        value={pinConfirmInput}
                                        onChange={e => setPinConfirmInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        placeholder="••••"
                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-center text-2xl tracking-[0.5em] placeholder:text-slate-700 outline-none focus:border-emerald-500/50"
                                    />
                                </div>
                            )}

                            {pinError && (
                                <p className="text-xs text-red-400 flex items-center gap-1.5">
                                    <span>⚠️</span> {pinError}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="px-6 pb-6 flex items-center gap-3">
                            <button
                                onClick={() => setPinModalOpen(false)}
                                disabled={pinLoading}
                                className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 text-sm font-semibold transition"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handlePinSubmit}
                                disabled={pinLoading || pinInput.length < 4}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {pinLoading
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Vérification...</>
                                    : pinModalMode === 'verify_pin' ? <><ShieldCheck className="w-4 h-4" /> Confirmer &amp; Générer</>
                                    : pinModalMode === 'set_pin' ? <><KeyRound className="w-4 h-4" /> Définir mon PIN</>
                                    : <><KeyRound className="w-4 h-4" /> Modifier le PIN</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                SKY POINTS BREAKDOWN MODAL
            ════════════════════════════════════════════════════════════════ */}
            {showPointsModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={() => setShowPointsModal(false)}>
                    <div className="bg-[#0f1520] border border-amber-500/20 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 pt-7 pb-4 text-center border-b border-white/[0.06]">
                            <div className="text-4xl mb-3">⭐</div>
                            <h3 className="text-lg font-black text-white">Sky Points</h3>
                            <p className="text-xs text-slate-500 mt-1">Votre monnaie numérique IziTeach</p>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            {/* Balance */}
                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                                <p className="text-xs text-amber-400/70 mb-1">Solde actuel</p>
                                <p className="text-4xl font-extrabold text-amber-300">{new Intl.NumberFormat('fr-FR').format(adminSkyPoints)}</p>
                                <p className="text-xs text-amber-400/70 mt-1">Sky Points</p>
                            </div>

                            {/* Credits */}
                            <div>
                                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">✅ Gains</p>
                                <div className="space-y-2">
                                    {[
                                        { label: 'Bonus à la création du compte', value: '+1 000 pts' },
                                        { label: 'Connexion quotidienne (chaque jour)', value: '+1 pt / jour' },
                                    ].map((row, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs px-3 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                            <span className="text-slate-400">{row.label}</span>
                                            <span className="text-emerald-300 font-bold">{row.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Debits */}
                            <div>
                                <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">💸 Déductions</p>
                                <div className="space-y-2">
                                    {[
                                        { label: 'Export Bulletin de notes', value: '−1 pt' },
                                        { label: 'Export Relevé de notes officiel', value: '−1 pt' },
                                        { label: 'Export Certificat de formation', value: '−1 pt' },
                                        { label: 'Export Reçu de paiement', value: '−1 pt' },
                                        { label: 'Déblocage Monitoring (une fois)', value: '−10 pts' },
                                    ].map((row, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs px-3 py-2.5 rounded-xl bg-red-500/5 border border-red-500/10">
                                            <span className="text-slate-400">{row.label}</span>
                                            <span className="text-red-400 font-bold">{row.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="px-6 pb-6">
                            <button
                                onClick={() => setShowPointsModal(false)}
                                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm transition"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox / Modal Image agrandie (Monitoring & Chat) */}
            {selectedImageModal && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
                    onClick={() => setSelectedImageModal(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
                        <img
                            src={selectedImageModal}
                            alt="Aperçu agrandi"
                            className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-white/10 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            onClick={() => setSelectedImageModal(null)}
                            className="mt-3 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur transition"
                        >
                            ✕ Fermer
                        </button>
                    </div>
                </div>
            )}

            {/* Email notification modal with anti-spam smart batching */}
            <EmailModal
                open={emailModalOpen}
                onClose={() => setEmailModalOpen(false)}
                students={students}
                orgName={org?.name || ''}
                orgLogo={org?.logo_url || ''}
                senderName={org?.name || 'Administration'}
                senderRole="admin"
            />

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
                    setPlatformDomain(h || 'iziteach.com');
                }
            } catch {
                const h = typeof window !== 'undefined' ? window.location.hostname : '';
                setPlatformDomain(h || 'iziteach.com');
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
                    <span className="text-emerald-400 truncate">{platformDomain || 'readsgreat.site'}</span>
                    <button onClick={() => copy(platformDomain || 'readsgreat.site')} className="text-slate-600 hover:text-white transition-colors"><Copy className="w-3 h-3" /></button>
                </div>
            </div>

            <p className="text-[11px] text-amber-300/80 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg leading-relaxed">
                💡 <strong>Important :</strong> Dans votre hébergeur (Hostinger, OVH...), la valeur cible doit être uniquement le nom d'hôte <code className="text-white bg-black/40 px-1 py-0.5 rounded">{platformDomain || 'readsgreat.site'}</code> (ne mettez pas de <em>https://</em> ni de chemin <em>/</em>).
            </p>

            <p className="text-[10px] text-slate-500 leading-relaxed">
                ⏱ Propagation DNS : <strong className="text-slate-400">10 min à 24h</strong> selon votre registrar.
                Après propagation, le SSL (HTTPS) est activé automatiquement.
            </p>
        </div>
    );
}
