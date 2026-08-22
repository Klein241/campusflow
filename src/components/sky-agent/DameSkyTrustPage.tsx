'use client';

import { motion } from 'framer-motion';
import { Crown, Shield, Lock, Eye, EyeOff, Globe, Users, CheckCircle2, XCircle, Server, Database, Key, Cpu } from 'lucide-react';

const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.08, duration: 0.5 },
    }),
};

function SectionTitle({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
    return (
        <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
                <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
                <h2 className="text-2xl font-black text-white">{title}</h2>
                {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
            </div>
        </div>
    );
}

const guarantees = [
    { icon: Server, color: 'from-blue-500 to-indigo-600', title: 'Hébergement Souverain', desc: 'Vos données restent dans votre instance Supabase et votre compte Cloudflare. Aucun serveur tiers inconnu n\''y accède.' },
    { icon: Cpu, color: 'from-purple-500 to-violet-600', title: 'Pas d\''entraînement sur vos données', desc: 'Le modèle LLaMA 3.1 8B est exécuté en inférence pure. Vos conversations ne servent jamais à ré-entraîner quoi que ce soit.' },
    { icon: EyeOff, color: 'from-rose-500 to-pink-600', title: 'Sessions Éphémères', desc: 'Les conversations sont effacées automatiquement après 30 minutes d\''inactivité. Rien n\''est conservé sans votre consentement.' },
    { icon: Key, color: 'from-amber-500 to-orange-600', title: 'Isolation par École', desc: 'La sécurité RLS de Supabase garantit que chaque école est un silo étanche. Aucune donnée ne traverse les frontières d\''un établissement.' },
    { icon: Shield, color: 'from-emerald-500 to-teal-600', title: 'Zéro Profilage Commercial', desc: 'Dame SKY n\''est pas financée par la publicité. Elle ne crée aucun profil commercial des élèves, surtout des mineurs.' },
    { icon: Eye, color: 'from-cyan-500 to-blue-600', title: 'Audit 100% Transparent', desc: 'Toute alerte critique (fraude, sécurité, bug) est journalisée avec horodatage. Le directeur voit tout, en temps réel.' },
];

const faqs = [
    { q: 'Dame SKY peut-elle lire les conversations d\''autres élèves ?', a: 'Non. Chaque session est strictement isolée. L\''isolation est garantie au niveau de la base de données (RLS Supabase).' },
    { q: 'Que se passe-t-il si un élève essaie de tricher lors d\''un examen ?', a: 'Dame SKY refuse, recadre l\''élève fermement, et enregistre une alerte visible immédiatement par le professeur et la direction.' },
    { q: 'Nos conversations sont-elles sauvegardées quelque part ?', a: 'Par défaut, sessions éphémères 30 min. Si l\''étudiant utilise les Projets, les échanges sont dans VOTRE Supabase uniquement — jamais externe.' },
    { q: 'Comment les directeurs contrôlent-ils Dame SKY ?', a: 'Via SuperAdmin : tempérament, directives pédagogiques, Skills, activation/désactivation par rôle, et Journal de Modération complet.' },
    { q: 'Est-ce conforme au RGPD et à la protection des mineurs ?', a: 'Oui. Minimisation des données, droit à l\''oubli, pas de PII enfant stocké en dehors de votre instance, journalisation complète des alertes.' },
];

export function DameSkyTrustPage() {
    return (
        <div className="min-h-screen bg-[#07090f] text-white">
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-950/30 via-[#07090f] to-[#07090f]" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-amber-500/10 blur-[120px] rounded-full" />
                <div className="relative max-w-5xl mx-auto px-6 py-24 text-center">
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }}
                        className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 flex items-center justify-center shadow-2xl shadow-amber-500/40">
                        <Crown className="w-12 h-12 text-amber-100" />
                    </motion.div>
                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="text-5xl md:text-6xl font-black mb-6">
                        <span className="bg-gradient-to-r from-amber-300 via-orange-200 to-amber-400 bg-clip-text text-transparent">Dame SKY</span>
                        <br /><span className="text-white text-4xl md:text-5xl">& Vos Données : La Vérité</span>
                    </motion.h1>
                    <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                        className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
                        Vous avez raison d'être vigilant. Surtout dans un contexte scolaire.
                        Voici, sans langue de bois, comment Dame SKY fonctionne et pourquoi
                        les données de vos élèves ne quittent jamais votre école.
                    </motion.p>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                        className="flex flex-wrap justify-center gap-3 mt-8">
                        {['🔒 Données souveraines', '❌ Zéro vente de données', '✅ RGPD conforme', '👑 Contrôle directeur total'].map((tag) => (
                            <span key={tag} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-slate-300">{tag}</span>
                        ))}
                    </motion.div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 pb-24 space-y-24">
                <section>
                    <SectionTitle icon={Server} title="Où vont vos données ?" subtitle="Un schéma vaut mieux que mille promesses" />
                    <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-8 font-mono text-xs md:text-sm overflow-x-auto">
                        <pre className="text-slate-300 whitespace-pre leading-relaxed">{`Navigateur de l'élève (École A)
       │  HTTPS TLS 1.3 (chiffré)
       │  Payload : prénom + école ("lycee-excellence") + leçon ouverte
       │  ❌ PAS de mot de passe  ❌ PAS d'email personnel
       ▼
☁️  PLATEFORME IZITEACH (Cloudflare Workers AI + Supabase)
   ├── Cloisonnement Multi-Tenant :
   │   → L'École A et l'École B sont dans des silos 100% étanches (RLS)
   │
   ├── Modèle LLaMA 3.1 8B Instruct (Inférence locale privée)
   │   → ❌ AUCUN entraînement sur les données des élèves
   │   → ❌ AUCUNE revente de données à des tiers
   │
   └── Sessions éphémères : historique détruit après 30 min d'inactivité

🚫  OpenAI (ChatGPT) : JAMAIS contacté
🚫  Google AI        : JAMAIS contacté
🚫  Régies de pub    : Zéro traceur, zéro profilage commercial`}</pre>
                    </div>
                </section>

                <section>
                    <SectionTitle icon={Shield} title="6 Garanties Non Négociables" subtitle="Intégrées par conception dans l'architecture, pas juste dans les CGU" />
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {guarantees.map((g, i) => (
                            <motion.div key={g.title} custom={i} variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }}
                                className="bg-white/[0.03] border border-white/8 rounded-2xl p-6 hover:border-amber-500/30 transition-all duration-300 group">
                                <div className={"w-10 h-10 rounded-xl bg-gradient-to-br " + g.color + " flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"}>
                                    <g.icon className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="font-bold text-white mb-2">{g.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{g.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                <section>
                    <SectionTitle icon={Globe} title="Dame SKY vs IA Publiques" subtitle="Ce que les autres ne vous disent pas clairement" />
                    <div className="bg-white/[0.03] border border-white/8 rounded-3xl overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/[0.02]">
                                    <th className="text-left py-4 px-6 text-slate-400 text-sm font-semibold">Critère</th>
                                    <th className="text-left py-4 px-4 text-slate-400 text-sm font-semibold">IA Publique</th>
                                    <th className="text-left py-4 pl-4 pr-6 text-amber-400 text-sm font-semibold">👑 Dame SKY</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ['Hébergement', 'Serveurs USA exportés', 'Votre Cloudflare + Supabase'],
                                    ['Entraînement', 'Possible selon CGU', '❌ Jamais — inférence pure'],
                                    ['Connaissance école', 'Générique', '✅ Personnalisée via contexte'],
                                    ['Détection fraude', '❌ Non', '✅ Automatique + journal admin'],
                                    ['Contrôle directeur', '❌ Aucun', '✅ Total — tempérament, on/off'],
                                    ['Langues africaines', 'Partiel imprévisible', '✅ Wolof, Bambara, Haoussa...'],
                                    ['Protection mineurs', 'CGU génériques', '✅ Architecture-first'],
                                ].map(([label, pub, sky], i) => (
                                    <tr key={i} className="border-b border-white/5">
                                        <td className="py-3 px-6 text-slate-300 text-sm font-medium">{label}</td>
                                        <td className="py-3 px-4 text-rose-400 text-sm">{pub}</td>
                                        <td className="py-3 pl-4 pr-6 text-emerald-400 text-sm">{sky}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section>
                    <SectionTitle icon={Users} title="Ce que vous devez savoir selon votre rôle" />
                    <div className="space-y-5">
                        <div className="bg-gradient-to-r from-amber-950/50 to-transparent border border-amber-700/30 rounded-2xl p-7">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-2xl">🏛️</span>
                                <h3 className="font-bold text-amber-300 text-lg">Directeurs & Directrices d'Établissements</h3>
                            </div>
                            <p className="text-slate-300 leading-relaxed">
                                Dame SKY est fournie nativement par la plateforme <strong className="text-white">IziTeach</strong> sur une infrastructure souveraine et chiffrée.
                                Votre école constitue un <strong className="text-white">silo étanche et hermétique</strong> : vos cours, notes, examens et effectifs ne sont jamais mélangés avec ceux d'autres établissements, ni envoyés à des tiers comme OpenAI ou Google.
                                Vous bénéficiez d'une directrice académique d'élite sans avoir à gérer de serveurs complexes, avec un contrôle continu sur les règles appliquées à vos élèves et vos professeurs.
                            </p>
                        </div>
                        <div className="bg-gradient-to-r from-emerald-950/50 to-transparent border border-emerald-700/30 rounded-2xl p-7">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-2xl">👨‍👩‍👧‍👦</span>
                                <h3 className="font-bold text-emerald-300 text-lg">Parents</h3>
                            </div>
                            <p className="text-slate-300 leading-relaxed">Dame SKY ne connaît que le <strong className="text-white">prénom et l'école</strong> de votre enfant. Les conversations <strong className="text-white">disparaissent après 30 minutes</strong>. Aucun profilage commercial des mineurs, aucune publicité. Dame SKY signale automatiquement à la direction tout propos inapproprié ou tentative de fraude.</p>
                        </div>
                        <div className="bg-gradient-to-r from-indigo-950/50 to-transparent border border-indigo-700/30 rounded-2xl p-7">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-2xl">🎒</span>
                                <h3 className="font-bold text-indigo-300 text-lg">Étudiants</h3>
                            </div>
                            <p className="text-slate-300 leading-relaxed">Dame SKY est là pour t'aider à <strong className="text-white">vraiment apprendre</strong>. Réponses honnêtes, rigoureuses, sans flatterie. Elle te challengera avec des quiz et te récompensera en Sky Points quand tu fais l'effort de comprendre. Tes conversations sont privées et disparaissent après 30 min. Si tu essaies de tricher, elle refusera et le signalera. C'est une mentore, pas un complice.</p>
                        </div>
                    </div>
                </section>

                <section>
                    <SectionTitle icon={Lock} title="Questions Fréquentes" subtitle="Les vraies questions que les institutions posent" />
                    <div className="space-y-4">
                        {faqs.map((faq, i) => (
                            <motion.div key={i} custom={i} variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }}
                                className="bg-white/[0.03] border border-white/8 rounded-2xl p-6 hover:border-amber-500/20 transition-all duration-300">
                                <p className="font-bold text-white mb-3 flex items-start gap-2">
                                    <span className="text-amber-400 font-black text-lg mt-0.5">Q</span>{faq.q}
                                </p>
                                <p className="text-slate-400 text-sm leading-relaxed pl-7">{faq.a}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                <section className="text-center">
                    <div className="bg-gradient-to-br from-amber-950/40 to-orange-950/20 border border-amber-700/30 rounded-3xl p-12">
                        <Crown className="w-12 h-12 text-amber-400 mx-auto mb-5" />
                        <h3 className="text-3xl font-black text-white mb-4">La confiance se mérite, pas se demande</h3>
                        <p className="text-slate-400 max-w-xl mx-auto mb-8">Dame SKY est construite sur l'architecture technique la plus transparente possible. Vous avez toutes les clés. Vous avez tout le contrôle. C'est ça, une IA qui respecte vraiment les écoles.</p>
                        <div className="flex flex-wrap justify-center gap-4">
                            {['Architecture open-source consultable', 'Audit technique disponible sur demande', 'Formation directeurs sur la gouvernance IA'].map((item) => (
                                <div key={item} className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />{item}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default DameSkyTrustPage;
