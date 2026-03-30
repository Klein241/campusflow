'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  GraduationCap, School, BookOpen, Users, CreditCard, BarChart3,
  Calendar, MessageSquare, ShieldCheck, ArrowRight, CheckCircle2,
  Globe, Smartphone, Star, ChevronRight, Sparkles, Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ═══════════════════════════════════════════════
// CAMPUSFLOW — LANDING PAGE
// ═══════════════════════════════════════════════

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const }
  })
};

const FEATURES = [
  { icon: School, title: 'Multi-établissements', desc: 'Collège, Lycée, Université, Centre de formation — chaque type a son workflow adapté.' },
  { icon: Users, title: 'Gestion des classes', desc: 'Créez vos filières, niveaux et salles de classe en quelques clics.' },
  { icon: BookOpen, title: 'Matières & Emploi du temps', desc: 'Attribuez les matières, coefficients et planifiez les cours automatiquement.' },
  { icon: GraduationCap, title: 'Notes & Évaluations', desc: 'Saisie des notes, moyennes pondérées, bulletins et suivi en temps réel.' },
  { icon: CreditCard, title: 'Paiements scolarité', desc: 'Paiements Mobile Money (MTN MoMo, Orange Money) avec suivi des impayés.' },
  { icon: BarChart3, title: 'Tableaux de bord', desc: 'KPIs en temps réel : effectifs, taux de réussite, finances, présences.' },
  { icon: Calendar, title: 'Présences & Discipline', desc: 'Suivi automatique des absences, retards, avertissements et sanctions.' },
  { icon: MessageSquare, title: 'Forum & Chat', desc: 'Messagerie entre profs-étudiants, groupes d\'étude et annonces officielles.' },
  { icon: ShieldCheck, title: 'Sécurité & Rôles', desc: '5 niveaux d\'accès : Directeur, Secrétaire, Trésorier, Professeur, Étudiant.' },
];

const SCHOOL_TYPES = [
  { emoji: '🏫', name: 'Collège', desc: '6ème à 3ème — Cycles 1er et 2nd' },
  { emoji: '🎓', name: 'Lycée', desc: 'Seconde à Terminale — Séries A, C, D, E' },
  { emoji: '🏛️', name: 'Université', desc: 'Facultés, départements, Licence/Master/Doctorat' },
  { emoji: '⚙️', name: 'Centre de formation', desc: 'CQP, DQP — Filières professionnelles' },
  { emoji: '📚', name: 'Institut de formation', desc: 'Formations spécialisées (santé, tech, commerce)' },
  { emoji: '✨', name: 'Autre', desc: 'Auto-école, école de musique, centre linguistique...' },
];

const STEPS = [
  { num: '01', title: 'Créez votre compte', desc: 'Renseignez vos informations personnelles et votre rôle.' },
  { num: '02', title: 'Décrivez votre établissement', desc: 'Type, nom, localisation et documents justificatifs.' },
  { num: '03', title: 'Configurez vos classes', desc: 'Ajoutez filières, niveaux, matières et professeurs.' },
  { num: '04', title: 'Partagez le lien', desc: 'Profs et étudiants s\'inscrivent via votre URL personnalisée.' },
];

const MARKETPLACE_ITEMS = [
  { emoji: '👔', name: 'Uniformes scolaires', price: '15 000 XAF', cat: 'Uniformes' },
  { emoji: '📓', name: 'Cahiers & Stylos', price: '2 500 XAF', cat: 'Fournitures' },
  { emoji: '🎓', name: 'Cours de soutien Math', price: '10 000 XAF', cat: 'Cours payants' },
  { emoji: '💻', name: 'Clé USB 32 GB', price: '5 000 XAF', cat: 'Matériel' },
  { emoji: '📐', name: 'Kit géométrie', price: '3 500 XAF', cat: 'Fournitures' },
  { emoji: '🎒', name: 'Sac à dos scolaire', price: '12 000 XAF', cat: 'Autre' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">

      {/* ═════ NAVBAR ═════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
              CampusFlow
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a>
            <a href="#marketplace" className="hover:text-white transition-colors flex items-center gap-1">🛍️ Marketplace</a>
            <a href="#types" className="hover:text-white transition-colors">Établissements</a>
            <a href="#how" className="hover:text-white transition-colors">Comment ça marche</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                Se connecter
              </Button>
            </Link>
            <Link href="/onboarding">
              <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-500/25">
                Commencer <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ═════ HERO ═════ */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm mb-8">
            <Sparkles className="w-4 h-4" /> Plateforme SaaS pour établissements scolaires
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.7 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight tracking-tight">
            Gérez votre{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">établissement</span>
            <br />comme un pro
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Classes, matières, professeurs, notes, paiements — tout-en-un.
            Chaque école obtient son propre espace personnalisé avec une URL unique.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.6 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/onboarding">
              <Button size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-2xl shadow-indigo-500/30 rounded-xl">
                <Building2 className="w-5 h-5 mr-2" /> Créer votre établissement
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 border-white/10 text-slate-300 hover:bg-white/5 rounded-xl">
                <Globe className="w-5 h-5 mr-2" /> Voir une démo
              </Button>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }}
            className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { value: '100%', label: 'Gratuit au départ' },
              { value: '5min', label: 'Pour commencer' },
              { value: '24/7', label: 'Accès en ligne' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═════ FEATURES ═════ */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-bold">Tout ce dont votre école a besoin</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-slate-400 mt-4 max-w-xl mx-auto">Une plateforme complète qui s&apos;adapte à votre type d&apos;établissement.</motion.p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="group p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 flex items-center justify-center mb-4 group-hover:from-indigo-500/30 group-hover:to-blue-500/30 transition-colors">
                  <f.icon className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════ 🛍️ MARKETPLACE SHOWCASE ═════ */}
      <section id="marketplace" className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-gradient-to-b from-slate-950 via-teal-950/10 to-slate-950">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-sm mb-6">
              🛍️ Marketplace intégrée
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-bold">
              Achetez tout ce qu&apos;il faut pour{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">vos études</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-slate-400 mt-4 max-w-2xl mx-auto">
              Chaque école dispose de sa propre boutique. Parcourez les produits disponibles et contactez directement le vendeur via le chat intégré.
            </motion.p>
          </motion.div>

          {/* Product grid preview */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
            {MARKETPLACE_ITEMS.map((item, i) => (
              <motion.div key={i} variants={fadeUp} custom={i}
                className="group p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-teal-500/30 hover:bg-teal-500/5 transition-all duration-300 text-center cursor-default">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{item.emoji}</div>
                <h4 className="text-xs font-semibold mb-1 line-clamp-2">{item.name}</h4>
                <p className="text-teal-400 font-black text-sm">{item.price}</p>
                <span className="text-[9px] text-slate-500">{item.cat}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Key features row */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid sm:grid-cols-3 gap-6 mb-10">
            {[
              { icon: '👀', title: 'Parcourez librement', desc: 'Explorez les produits de chaque école sans compte. Vue seule pour les visiteurs.' },
              { icon: '💬', title: 'Discutez avec le vendeur', desc: 'Le chat intégré épingle automatiquement le produit pour faciliter la discussion.' },
              { icon: '🏫', title: 'Boutique par école', desc: 'Chaque établissement gère son catalogue. Seuls les admins ajoutent des produits.' },
            ].map((f, i) => (
              <motion.div key={i} variants={fadeUp} custom={i}
                className="flex flex-col items-center text-center p-6 rounded-2xl bg-gradient-to-b from-teal-500/5 to-transparent border border-teal-500/10">
                <span className="text-3xl mb-3">{f.icon}</span>
                <h4 className="font-semibold mb-1">{f.title}</h4>
                <p className="text-sm text-slate-400">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center">
            <Link href="/demo">
              <Button size="lg" className="px-8 py-5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-2xl shadow-teal-500/25 rounded-xl text-base">
                🛍️ Explorer la marketplace démo <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═════ TYPES D'ÉTABLISSEMENTS ═════ */}
      <section id="types" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-bold">Pour tous les types d&apos;établissements</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-slate-400 mt-4">CampusFlow s&apos;adapte à votre structure, qu&apos;elle soit publique ou privée.</motion.p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SCHOOL_TYPES.map((t, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-blue-500/20 transition-all text-center">
                <div className="text-4xl mb-3">{t.emoji}</div>
                <h3 className="font-semibold text-lg">{t.name}</h3>
                <p className="text-sm text-slate-400 mt-1">{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════ COMMENT ÇA MARCHE ═════ */}
      <section id="how" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-bold">Prêt en 4 étapes</motion.h2>
          </motion.div>
          <div className="space-y-8">
            {STEPS.map((step, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className="flex gap-6 items-start">
                <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-xl font-bold shadow-lg shadow-indigo-500/20">{step.num}</div>
                <div><h3 className="text-xl font-semibold">{step.title}</h3><p className="text-slate-400 mt-1">{step.desc}</p></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════ CTA FINAL ═════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          className="max-w-3xl mx-auto text-center p-12 rounded-3xl bg-gradient-to-br from-indigo-600/20 via-blue-600/10 to-purple-600/20 border border-indigo-500/20">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Prêt à digitaliser votre école ?</h2>
          <p className="text-slate-300 mb-8 max-w-lg mx-auto">Rejoignez les établissements qui font confiance à CampusFlow pour la gestion de leur scolarité.</p>
          <Link href="/onboarding">
            <Button size="lg" className="text-lg px-10 py-6 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-2xl shadow-indigo-500/30 rounded-xl">
              Créer votre établissement gratuitement <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* ═════ FOOTER ═════ */}
      <footer className="border-t border-white/5 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-300">CampusFlow</span>
          </div>
          <p className="text-sm text-slate-500">© 2026 SYGMA-TECH. Tous droits réservés.</p>
          <div className="flex items-center gap-1 text-sm text-slate-500">
            <Smartphone className="w-4 h-4" /> PWA disponible sur mobile
          </div>
        </div>
      </footer>
    </div>
  );
}
