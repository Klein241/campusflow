'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import BottomNav from '@/components/navigation/BottomNav';
import type { AppTab } from '@/components/navigation/BottomNav';
import type { UserRole } from '@/lib/roles';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

// Dynamic imports for code splitting
const DashboardView = dynamic(() => import('@/components/views/dashboard-view').then(m => ({ default: m.DashboardView })), { ssr: false });
const CurriculumView = dynamic(() => import('@/components/views/curriculum-view').then(m => ({ default: m.CurriculumView })), { ssr: false });
const DayDetailView = dynamic(() => import('@/components/views/day-detail-view').then(m => ({ default: m.DayDetailView })), { ssr: false });
const CoursesView = dynamic(() => import('@/components/views/courses-view').then(m => ({ default: m.CoursesView })), { ssr: false });
const GradesView = dynamic(() => import('@/components/views/grades-view').then(m => ({ default: m.GradesView })), { ssr: false });
const ForumView = dynamic(() => import('@/components/views/forum-view').then(m => ({ default: m.ForumView })), { ssr: false });
const ProfileView = dynamic(() => import('@/components/views/profile-view').then(m => ({ default: m.ProfileView })), { ssr: false });
const ResourcesView = dynamic(() => import('@/components/views/resources-view').then(m => ({ default: m.ResourcesView })), { ssr: false });
const ShopView = dynamic(() => import('@/components/views/shop-view').then(m => ({ default: m.ShopView })), { ssr: false });
const AuthView = dynamic(() => import('@/components/views/auth-view').then(m => ({ default: m.AuthView })), { ssr: false });

// ── Vues administratives (placeholders évolutifs) ──
function StudentsAdminView() {
  return (
    <div className="min-h-screen bg-[#0B0E14] text-white p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">👥</span>
          <h1 className="text-2xl font-bold bg-linear-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">Gestion des Étudiants</h1>
        </div>
        <div className="grid gap-4">
          {['Inscrire un nouvel étudiant', 'Liste par filière', 'Attestations & Certificats', 'Historique des inscriptions'].map((item, i) => (
            <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/30 transition-all cursor-pointer">
              <p className="text-sm text-white/80">{item}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 p-6 rounded-2xl bg-linear-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20">
          <p className="text-sm text-amber-400 font-medium">Module en cours de développement</p>
          <p className="text-xs text-white/50 mt-1">La gestion complète des étudiants sera disponible dans la prochaine mise à jour.</p>
        </div>
      </div>
    </div>
  );
}

function PaymentsAdminView() {
  return (
    <div className="min-h-screen bg-[#0B0E14] text-white p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">💳</span>
          <h1 className="text-2xl font-bold bg-linear-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Paiements & Scolarité</h1>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            { label: 'Total collecté', value: '0 XAF', color: 'from-green-500/20' },
            { label: 'En attente', value: '0', color: 'from-amber-500/20' },
            { label: 'Étudiants à jour', value: '0%', color: 'from-blue-500/20' },
            { label: 'Ce mois', value: '0 XAF', color: 'from-purple-500/20' },
          ].map((stat, i) => (
            <div key={i} className={`p-4 rounded-xl bg-linear-to-br ${stat.color} to-transparent border border-white/10`}>
              <p className="text-xs text-white/50">{stat.label}</p>
              <p className="text-lg font-bold mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 p-6 rounded-2xl bg-linear-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20">
          <p className="text-sm text-green-400 font-medium">Module Paiements</p>
          <p className="text-xs text-white/50 mt-1">Enregistrement des paiements, reçus automatiques, et suivi des créances.</p>
        </div>
      </div>
    </div>
  );
}

function ReportsView() {
  return (
    <div className="min-h-screen bg-[#0B0E14] text-white p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">📊</span>
          <h1 className="text-2xl font-bold bg-linear-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Rapports & Statistiques</h1>
        </div>
        <div className="grid gap-4">
          {[
            { title: 'Effectifs par filière', desc: 'Répartition et évolution des inscriptions' },
            { title: 'Taux de réussite', desc: 'Moyennes et performances par matière' },
            { title: 'Suivi des présences', desc: 'Taux d\'assiduité par filière et promotion' },
            { title: 'Revenus scolarité', desc: 'Suivi financier, créances et projections' },
            { title: 'Activité forum', desc: 'Engagement étudiant et discussions populaires' },
          ].map((report, i) => (
            <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all cursor-pointer">
              <p className="text-sm font-medium text-white">{report.title}</p>
              <p className="text-xs text-white/50 mt-1">{report.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminPanelView() {
  return (
    <div className="min-h-screen bg-[#0B0E14] text-white p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">⚙️</span>
          <h1 className="text-2xl font-bold bg-linear-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">Administration</h1>
        </div>
        <div className="grid gap-4">
          {[
            { title: '👤 Gestion des rôles', desc: 'Attribuer les rôles étudiant, professeur, secrétaire, directeur' },
            { title: '📚 Filières & Matières', desc: 'Configurer les filières, UE et coefficients' },
            { title: '🗓️ Emploi du temps', desc: 'Créer et gérer les plannings par filière' },
            { title: '📢 Notifications', desc: 'Envoyer des annonces à toute la communauté' },
            { title: '🏪 Boutique', desc: 'Gérer les produits et commandes' },
            { title: '🔧 Paramètres', desc: 'Configuration générale du centre' },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-red-500/30 transition-all cursor-pointer">
              <p className="text-sm font-medium text-white">{item.title}</p>
              <p className="text-xs text-white/50 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Splash screen — CentreFormation Pro
function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-linear-to-br from-indigo-900 via-blue-800 to-indigo-900/80"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          transition: { type: 'spring', stiffness: 260, damping: 20 }
        }}
        className="text-center text-white"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-7xl mb-4"
        >
          🎓
        </motion.div>
        <h1 className="text-3xl font-bold mb-2" suppressHydrationWarning>CentreFormation Pro</h1>
        <p className="text-white/80">Votre avenir commence ici</p>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 2, ease: 'easeInOut' }}
          className="mt-6 h-0.5 bg-white/30 rounded-full overflow-hidden max-w-48 mx-auto"
        >
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1, repeat: Infinity }}
            className="h-full w-1/2 bg-white rounded-full"
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default function Home() {
  const { user, isHydrated, activeTab, setActiveTab, selectedDay, setSelectedDay, userRole } = useAppStore();
  const [showSplash, setShowSplash] = useState(true);
  const [hideNav, setHideNav] = useState(false);

  const setPendingNavigation = useAppStore(s => s.setPendingNavigation);

  const handleHideNav = useCallback((hide: boolean) => {
    setHideNav(hide);
  }, []);

  // Set default tab on load
  useEffect(() => {
    setActiveTab('dashboard');

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const navType = params.get('nav');
      const navId = params.get('id');

      if (navType && navId) {
        if (navType === 'conversation') {
          setPendingNavigation({ communityTab: 'chat', viewState: 'conversation', conversationId: navId });
        } else if (navType === 'group') {
          setPendingNavigation({ communityTab: 'chat', viewState: 'group-detail', groupId: navId });
        }
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'forum') setHideNav(false);
  }, [activeTab]);

  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 2500);
    const hydrationTimer = setTimeout(() => {
      try { useAppStore.getState().setHydrated(true); } catch { }
    }, 2000);
    return () => { clearTimeout(splashTimer); clearTimeout(hydrationTimer); };
  }, []);

  if (showSplash) return <SplashScreen />;

  // Uncomment below to require login:
  // if (!user) return <AuthView />;

  const handleNavigateToDay = (day: number) => setSelectedDay(day);
  const handleBackFromDay = () => setSelectedDay(null);
  const handleNavigateTo = (tab: string) => setActiveTab(tab as any);

  // Map activeTab to the correct view
  const renderContent = () => {
    if (selectedDay !== null) {
      return <DayDetailView dayNumber={selectedDay} onBack={handleBackFromDay} />;
    }

    switch (activeTab) {
      // ── Vues communes ──
      case 'dashboard':
      case 'home':
        return <DashboardView onNavigateToDay={handleNavigateToDay} onNavigateTo={handleNavigateTo} />;
      case 'curriculum':
      case 'program':
        return <CurriculumView onSelectDay={handleNavigateToDay} />;
      case 'grades':
      case 'journal':
        return <GradesView />;
      case 'forum':
      case 'community':
        return <ForumView onHideNav={handleHideNav} />;
      case 'resources':
      case 'library':
        return <ResourcesView />;
      case 'shop':
      case 'marketplace':
        return <ShopView />;
      case 'profile':
        return <ProfileView />;
      case 'timetable':
        return <CurriculumView onSelectDay={handleNavigateToDay} />;
      case 'courses':
        return <CoursesView />;

      // ── Vues administratives (secrétaire, directeur, superadmin) ──
      case 'students':
        return <StudentsAdminView />;
      case 'payments':
        return <PaymentsAdminView />;
      case 'reports':
        return <ReportsView />;
      case 'admin':
        return <AdminPanelView />;

      default:
        return <DashboardView onNavigateToDay={handleNavigateToDay} onNavigateTo={handleNavigateTo} />;
    }
  };

  return (
    <main className={cn(
      "bg-[#0B0E14] overflow-x-hidden",
      hideNav ? "h-dvh overflow-hidden" : "min-h-screen pb-safe overflow-y-auto"
    )}>
      <div className={hideNav ? "h-full overflow-hidden" : "min-h-screen"}>
        {renderContent()}
      </div>

      {/* Bottom navigation — role-adaptive */}
      {selectedDay === null && !hideNav && (
        <BottomNav
          activeTab={activeTab as AppTab}
          onTabChange={(tab) => setActiveTab(tab)}
          userRole={(userRole || 'student') as UserRole}
        />
      )}
    </main>
  );
}
