'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  GraduationCap, School, BookOpen, Users, CreditCard, BarChart3,
  Calendar, MessageSquare, ShieldCheck, ArrowRight, CheckCircle2,
  Globe, Smartphone, Star, ChevronRight, Sparkles, Building2,
  Award, Laptop, Zap, Check, ExternalLink, Shield, BookMarked,
  Layers, Lock, Play, ShoppingBag, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlatformReviewsSection } from '@/components/platform-reviews';
import { supabase } from '@/lib/supabase';
import { IziTeachLogo } from '@/components/brand/iziteach-logo';

// ═══════════════════════════════════════════════
// CAMPUSFLOW — MAIN LANDING PAGE
// Pour Écoles Physiques & Académies 100% en Ligne
// ═══════════════════════════════════════════════

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: 'easeOut' as const }
  })
};

const FEATURES_PHYSICAL = [
  { icon: School, title: 'Gestion de Campus Physique', desc: 'Gestion des salles de classe, bâtiments, filières, niveaux et sections.' },
  { icon: Calendar, title: 'Emploi du Temps & Salles', desc: 'Planification automatique des créneaux horaires, attribution des matières et professeurs.' },
  { icon: ShieldCheck, title: 'Présences & Discipline', desc: 'Appel en classe, registre des absences, retards, avertissements et sanctions.' },
  { icon: GraduationCap, title: 'Bulletins & Relevés de Notes', desc: 'Calcul des moyennes pondérées, génération de bulletins PDF imprimables aux normes officielles.' },
  { icon: CreditCard, title: 'Paiements Frais de Scolarité', desc: 'Encaissement par tranches via MTN MoMo, Orange Money et espèces avec reçus instantanés.' },
  { icon: Award, title: 'Badge Établissement Agréé', desc: 'Certification officielle pour les écoles déclarées avec arrêté ministériel ou récépissé.' },
];

const FEATURES_ONLINE = [
  { icon: Laptop, title: '0 Bâtiment Requis (100% Digital)', desc: 'Lancez votre académie sans loyer ni locaux. Tout fonctionne en ligne depuis votre ordinateur ou mobile.' },
  { icon: BookOpen, title: 'Cursus & E-learning Interactif', desc: 'Publiez des cours multimédias, chapitres, leçons avec quiz et exercices auto-corrigés.' },
  { icon: Award, title: 'Certificats de Fin de Formation', desc: 'Délivrez des certificats et attestations de réussite téléchargeables en PDF avec cachet numérique.' },
  { icon: MessageSquare, title: 'Notes Vocales & Chat Étudiants', desc: 'Encadrez vos apprenants avec des messages vocaux compressés et des groupes de discussion.' },
  { icon: ShoppingBag, title: 'Boutique & Vente de Cours', desc: 'Vendez vos formations, e-books et masterclasses avec encaissement Mobile Money automatisé.' },
  { icon: Shield, title: 'Badge Formateur Expert Vérifié', desc: 'Valorisez votre doctorat, diplôme d\'ingénieur ou certificat d\'expertise avec le badge officiel.' },
];

const SCHOOL_TYPES = [
  { emoji: '🏫', name: 'Collèges & Lycées', desc: 'Enseignement général et technique, séries A, C, D, TI, F.' },
  { emoji: '🏛️', name: 'Universités & Facultés', desc: 'Licence, Master, Doctorat, départements académiques.' },
  { emoji: '💻', name: 'Académies Tech & IA', desc: 'Bootcamps de programmation, cybersécurité, design, 100% en ligne.' },
  { emoji: '⚙️', name: 'Centres de Formation Pro', desc: 'CQP, DQP, métiers manuels, artisanat et tertiaire.' },
  { emoji: '🩺', name: 'Instituts de Santé & Soins', desc: 'Sciences infirmières, santé publique, biologie.' },
  { emoji: '🌍', name: 'Académies de Langues & Coaching', desc: 'Anglais, business, mentorat individuel sans locaux physiques.' },
];

const STEPS = [
  { num: '01', title: 'Créez votre compte en 2 min', desc: 'Renseignez vos informations et le nom de votre école ou académie.' },
  { num: '02', title: 'Soumettez vos justificatifs', desc: 'Agrément, récépissé, diplôme ou certificat d\'expertise pour obtenir votre badge certifié.' },
  { num: '03', title: 'Ajoutez vos matières & formations', desc: 'Configurez vos classes physiques ou vos modules de formation en ligne.' },
  { num: '04', title: 'Partagez votre portail dédié', desc: 'Vos étudiants et professeurs accèdent directement à votre campus personnalisé.' },
];

export default function LandingPage() {
  const [activeSegment, setActiveSegment] = useState<'all' | 'physical' | 'online'>('all');
  const [schools, setSchools] = useState<any[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);

  // Load real registered organizations
  useEffect(() => {
    async function loadSchools() {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, slug, type, city, country, logo_url, brand_color, certification_badge, badge_title, is_online_academy')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(16);

        if (!error && data) {
          setSchools(data);
        }
      } catch (err) {
        console.warn('Could not load schools:', err);
      } finally {
        setLoadingSchools(false);
      }
    }
    loadSchools();
  }, []);

  return (
    <div className="min-h-screen bg-[#060911] text-white overflow-x-hidden font-sans selection:bg-indigo-500/30">

      {/* ═════ NAVBAR ═════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl bg-[#060911]/85 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo Desktop: Symbole + IziTeach + slogan / Mobile: Symbole + IziTeach */}
          <div className="flex items-center">
            <IziTeachLogo variant="full" size="lg" animated className="hidden sm:flex" />
            <IziTeachLogo variant="compact" size="md" animated className="flex sm:hidden" />
          </div>

          <div className="hidden md:flex items-center gap-7 text-xs font-bold text-slate-300">
            <a href="#models" className="hover:text-white transition-colors">Modèles Écoles & En Ligne</a>
            <a href="#schools" className="hover:text-white transition-colors flex items-center gap-1.5">
              <span>🏛️ Établissements</span>
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px]">{schools.length}</span>
            </a>
            <a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a>
            <a href="#types" className="hover:text-white transition-colors">Formations</a>
            <a href="#reviews" className="hover:text-white transition-colors flex items-center gap-1">⭐ Avis</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/5 text-xs font-bold">
                Se connecter
              </Button>
            </Link>
            <Link href="/onboarding">
              <Button size="sm" className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-500/25 h-10 px-4">
                Créer mon école <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ═════ HERO SECTION ═════ */}
      <section className="relative pt-32 sm:pt-40 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Glows */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-indigo-600/20 via-cyan-500/15 to-purple-600/20 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/15 to-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold mb-8 shadow-inner">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>IziTeach • Enseigner simplement • Écoles Physiques & Académies en Ligne</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.08] tracking-tight text-white uppercase">
            Créez & Développez <br />
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-teal-300 bg-clip-text text-transparent">
              Votre École ou Académie
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            Que vous dirigiez un <strong className="text-white">établissement physique</strong> (Lycée, Collège, Université) ou que vous soyez un <strong className="text-cyan-300">expert, formateur ou docteur</strong> souhaitant lancer son <strong className="text-teal-300">académie 100% en ligne sans bâtiment</strong> : IziTeach vous offre un campus digital complet en 5 minutes.
          </motion.p>

          {/* Dual CTA Buttons */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/onboarding">
              <Button size="lg" className="text-sm sm:text-base px-8 py-6 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-black shadow-2xl shadow-indigo-500/30 rounded-2xl gap-2 w-full sm:w-auto">
                <Building2 className="w-5 h-5" />
                <span>Lancer mon École ou Académie</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" size="lg" className="text-sm sm:text-base px-8 py-6 border-white/15 text-slate-200 hover:bg-white/5 rounded-2xl w-full sm:w-auto font-bold">
                <Globe className="w-5 h-5 mr-2 text-cyan-400" />
                <span>Explorer la Démo</span>
              </Button>
            </Link>
          </motion.div>

          {/* 4 Pillars Stats */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-14 grid grid-cols-3 gap-3 max-w-2xl mx-auto">
            {[
              { value: '0 Bâtiment', label: 'Option 100% en ligne sans locaux' },
              { value: '5 min', label: 'Pour créer votre établissement' },
              { value: 'Certifié', label: 'Badges de certification officielle' },
            ].map((s, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
                <div className="text-lg sm:text-xl font-black text-white">{s.value}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═════ SECTION 2: DEUX MONDES, UNE SEULE SOLUTION ═════ */}
      <section id="models" className="py-20 px-4 sm:px-6 lg:px-8 relative bg-[#090E1A]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <span className="text-xs font-black uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
              Flexibilité Totale
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white uppercase">
              Deux Modèles, Une Plateforme Sur-Mesure
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
              IziTeach s'adapte précisément à votre infrastructure, qu'elle soit implantée physiquement ou 100% dématérialisée.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* CARTE 1: ÉCOLE PHYSIQUE */}
            <div className="p-7 sm:p-9 rounded-3xl bg-gradient-to-b from-[#111A2E] to-[#0D1424] border border-indigo-500/30 shadow-2xl space-y-6 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-black text-2xl">
                  🏛️
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-black flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Badge Agréé Disponible
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white">Établissements & Campus Physiques</h3>
                <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  Lycées, Collèges, Universités et Centres de formation implantés géographiquement.
                </p>
              </div>

              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>Gestion des salles de classe, professeurs et emplois du temps hebdomadaires.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>Bulletins scolaires officiels aux normes ministérielles avec calcul des moyennes.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>Appel en classe, fiches d'absences, retards et discipline en temps réel.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>Paiements des frais de scolarité par tranches et suivi des insolvabilités.</span>
                </li>
              </ul>

              <div className="pt-2">
                <Link href="/onboarding">
                  <Button className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase shadow-lg shadow-indigo-600/25">
                    Créer mon Établissement Physique →
                  </Button>
                </Link>
              </div>
            </div>

            {/* CARTE 2: ACADÉMIE EN LIGNE */}
            <div className="p-7 sm:p-9 rounded-3xl bg-gradient-to-b from-[#0E2021] to-[#0A1617] border border-cyan-500/40 shadow-2xl space-y-6 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center font-black text-2xl">
                  🎓
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-black flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" /> Badge Expert / Académie
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white">Académies 100% en Ligne & Formateurs</h3>
                <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  Docteurs, experts, ingénieurs, mentors, créateurs de bootcamps et écoles digitales.
                </p>
              </div>

              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong>Zéro bâtiment physique requis</strong> : lancez vos cours depuis chez vous sans charges locatives.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Diffusion de cours e-learning avec devoirs, QCM et correction automatique.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Délivrance de certificats d'aptitude et attestations de formation officielles en PDF.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Boutique en ligne intégrée pour monétiser vos formations par Mobile Money.</span>
                </li>
              </ul>

              <div className="pt-2">
                <Link href="/onboarding">
                  <Button className="w-full h-12 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase shadow-lg shadow-cyan-500/25">
                    Lancer mon Académie en Ligne →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═════ SECTION 3: ÉTABLISSEMENTS & ACADÉMIES ENREGISTRÉS (MINIATURES & BADGES) ═════ */}
      <section id="schools" className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                Communauté Active
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white uppercase mt-2">
                Établissements & Académies Partenaires
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Découvrez les écoles physiques et académies en ligne créées sur IziTeach avec leurs badges de certification.
              </p>
            </div>
            <Link href="/onboarding">
              <Button size="sm" className="bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl border border-white/15">
                Rejoindre la liste →
              </Button>
            </Link>
          </div>

          {/* Grille de miniatures des écoles */}
          {loadingSchools ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-36 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : schools.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {schools.map(s => {
                const isPhysical = s.certification_badge === 'verified_physical';
                const isOnline = s.certification_badge === 'verified_online' || s.is_online_academy;
                const badgeText = s.badge_title || (isPhysical ? 'Établissement Agréé' : isOnline ? 'Académie Certifiée' : null);

                return (
                  <Link key={s.id} href={`/${s.slug}`} className="group block">
                    <div className="p-4 rounded-2xl bg-[#0B111F]/80 border border-white/10 hover:border-indigo-500/40 hover:bg-[#0E1729] transition-all duration-300 shadow-xl flex flex-col justify-between h-44 relative overflow-hidden">
                      {/* Top row: Logo & Badge */}
                      <div className="flex items-start justify-between gap-2">
                        {s.logo_url ? (
                          <img
                            src={s.logo_url}
                            alt={s.name}
                            className="w-11 h-11 rounded-xl object-contain bg-white/10 p-1 border border-white/10 shrink-0 group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white text-base shrink-0 shadow-md"
                            style={{ background: `linear-gradient(135deg, ${s.brand_color || '#4f46e5'}, #06b6d4)` }}
                          >
                            {s.name?.[0]?.toUpperCase() || 'E'}
                          </div>
                        )}

                        {/* Certification badge indicator */}
                        {badgeText && (
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black shrink-0 border flex items-center gap-1 ${
                            isPhysical
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                          }`}>
                            {isPhysical ? '🏛️' : '🎓'} {badgeText}
                          </span>
                        )}
                      </div>

                      {/* Middle: Name & location */}
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                          {s.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                          {s.is_online_academy ? '💻 Académie 100% en Ligne' : (s.city ? `${s.city}, ${s.country}` : 'Campus Connecté')}
                        </p>
                      </div>

                      {/* Bottom: Action link */}
                      <div className="flex items-center justify-between text-[10px] text-indigo-400 font-bold border-t border-white/5 pt-2">
                        <span>Visiter le portail</span>
                        <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-500 text-xs">
              Les premiers établissements certifiés apparaîtront ici.
            </div>
          )}
        </div>
      </section>

      {/* ═════ SECTION 4: FONCTIONNALITÉS COMPLÈTES ═════ */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 relative bg-[#090E1A]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase">
              Tout ce dont votre école a besoin
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-xs sm:text-sm">
              Des outils puissants conçus pour simplifier la pédagogie, l'administration et la croissance.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...FEATURES_PHYSICAL.slice(0, 3), ...FEATURES_ONLINE.slice(0, 3)].map((f, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.05] transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-white">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════ SECTION 5: TYPES D'ÉTABLISSEMENTS & FORMATIONS ═════ */}
      <section id="types" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase">
              Pour toutes les disciplines & structures
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto text-xs sm:text-sm">
              Que vous enseigniez les mathématiques, la médecine, le code ou les langues, IziTeach s'adapte à votre pédagogie.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SCHOOL_TYPES.map((t, i) => (
              <div key={i} className="p-5 rounded-2xl bg-[#0B111F]/90 border border-white/10 hover:border-cyan-500/30 transition text-center space-y-2">
                <div className="text-3xl mb-1">{t.emoji}</div>
                <h3 className="font-bold text-sm text-white">{t.name}</h3>
                <p className="text-xs text-slate-400">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════ SECTION 6: COMMENT ÇA MARCHE ═════ */}
      <section id="how" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#090E1A]">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase">Prêt en 4 étapes</h2>
            <p className="text-slate-400 text-xs sm:text-sm">Votre campus opérationnel en quelques clics seulement.</p>
          </div>

          <div className="space-y-6">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-4 p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-600 flex items-center justify-center text-lg font-black text-white shadow-lg">
                  {step.num}
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════ AVIS UTILISATEURS ═════ */}
      <div id="reviews">
        <PlatformReviewsSection />
      </div>

      {/* ═════ CTA FINAL ═════ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center p-8 sm:p-14 rounded-3xl bg-gradient-to-br from-indigo-600/25 via-blue-600/15 to-cyan-600/25 border border-indigo-500/30 space-y-6 shadow-2xl">
          <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
            Prêt à lancer votre école ou académie ?
          </h2>
          <p className="text-slate-300 max-w-xl mx-auto text-xs sm:text-base leading-relaxed">
            Rejoignez dès aujourd'hui les directeurs d'établissements et formateurs experts qui font confiance à IziTeach.
          </p>
          <Link href="/onboarding">
            <Button size="lg" className="h-14 px-8 sm:px-10 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-black text-sm sm:text-base shadow-2xl shadow-indigo-500/30 gap-2">
              <Building2 className="w-5 h-5" />
              <span>Créer mon établissement gratuitement</span>
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ═════ FOOTER ═════ */}
      <footer className="border-t border-white/5 py-10 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Footer: Logo horizontal avec slogan */}
          <IziTeachLogo variant="horizontal" size="sm" />
          <p>© 2026 SYGMA-TECH. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
