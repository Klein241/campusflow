'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Send, Loader2, CheckCircle, Users, User, Search } from 'lucide-react';

interface Student {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    classroom_id?: string;
    classroom_name?: string;
}

interface EmailModalProps {
    open: boolean;
    onClose: () => void;
    subject: string;          // Pré-rempli: "Nouvelle leçon : ..."
    body: string;             // Pré-rempli: contenu de la notification
    students: Student[];      // Liste des étudiants disponibles
    orgName: string;
    orgLogo?: string;
    workerUrl?: string;
}

export function EmailModal({
    open, onClose, subject: defaultSubject, body: defaultBody,
    students, orgName, orgLogo, workerUrl
}: EmailModalProps) {
    const [step, setStep] = useState<'compose' | 'select' | 'sending' | 'done'>('compose');
    const [subject, setSubject] = useState(defaultSubject);
    const [body, setBody] = useState(defaultBody);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');
    const [sending, setSending] = useState(false);
    const [results, setResults] = useState<{ sent: number; error?: string } | null>(null);

    const WORKER = workerUrl || process.env.NEXT_PUBLIC_WORKER_URL || 'https://campusflow-worker.kleintaptue1.workers.dev';

    useEffect(() => {
        if (open) { setStep('compose'); setSubject(defaultSubject); setBody(defaultBody); setSelected(new Set()); setResults(null); }
    }, [open, defaultSubject, defaultBody]);

    // Étudiants avec email uniquement
    const withEmail = students.filter(s => s.email && s.email.includes('@'));
    const filtered  = withEmail.filter(s =>
        !search || `${s.first_name} ${s.last_name} ${s.classroom_name || ''}`.toLowerCase().includes(search.toLowerCase())
    );

    const toggleAll = () => {
        if (selected.size === withEmail.length) setSelected(new Set());
        else setSelected(new Set(withEmail.map(s => s.id)));
    };

    const toggleStudent = (id: string) => {
        const next = new Set(selected);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelected(next);
    };

    const sendEmails = async () => {
        if (selected.size === 0) return;
        setSending(true);
        setStep('sending');
        try {
            const recipients = withEmail
                .filter(s => selected.has(s.id))
                .map(s => s.email!)
                .filter(Boolean);

            const html = `
<!DOCTYPE html><html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0F172A;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:20px;">
    <div style="text-align:center;padding:36px 0 20px;">
      ${orgLogo ? `<img src="${orgLogo}" alt="${orgName}" style="height:60px;border-radius:14px;margin-bottom:14px;object-fit:contain;" />` : ''}
      <h1 style="color:#fff;font-size:20px;margin:0 0 4px;font-weight:800;">${orgName}</h1>
      <p style="color:#64748B;font-size:13px;margin:0;">Notification de votre établissement</p>
    </div>
    <div style="background:#1E293B;border-radius:20px;padding:28px 32px;border:1px solid #334155;">
      <h2 style="color:#38BDF8;font-size:17px;font-weight:700;margin:0 0 16px;">${subject}</h2>
      <div style="color:#CBD5E1;font-size:14px;line-height:1.75;white-space:pre-line;">${body}</div>
    </div>
    <div style="text-align:center;padding:20px 0 8px;">
      <p style="color:#475569;font-size:11px;margin:0;">
        Envoyé depuis CampusFlow · ${orgName}<br/>
        <span style="font-size:10px;">Ne pas répondre à cet email</span>
      </p>
    </div>
  </div>
</body></html>`;

            const res = await fetch(`${WORKER}/api/email/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: recipients, subject, html, org_name: orgName, org_logo: orgLogo }),
            });
            const data = await res.json() as any;
            setResults(res.ok ? { sent: recipients.length } : { sent: 0, error: data.error || 'Erreur d\'envoi' });
        } catch (e: any) {
            setResults({ sent: 0, error: e.message });
        }
        setSending(false);
        setStep('done');
    };

    if (!open) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                {/* Backdrop */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, y: 60, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 60 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative z-10 w-full sm:max-w-lg bg-[#0F1829] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 flex items-center justify-center">
                                <Mail className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="font-bold text-white text-sm">Notifier par Email</h2>
                                <p className="text-xs text-slate-400">{withEmail.length} étudiant(s) avec email</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition">
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {/* DONE */}
                        {step === 'done' && (
                            <div className="p-8 text-center">
                                {results?.error ? (
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                                            <X className="w-8 h-8 text-red-400" />
                                        </div>
                                        <h3 className="font-bold text-white mb-2">Erreur d'envoi</h3>
                                        <p className="text-sm text-red-400">{results.error}</p>
                                        {results.error.includes('RESEND_API_KEY') && (
                                            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left">
                                                <p className="text-xs text-amber-300 font-semibold mb-1">⚙️ Configuration requise</p>
                                                <p className="text-xs text-slate-400">Ajoutez <code className="bg-white/10 px-1 rounded">RESEND_API_KEY</code> dans Cloudflare Worker → Settings → Variables & Secrets.</p>
                                                <a href="https://resend.com" target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline mt-1 block">Créer un compte gratuit sur resend.com →</a>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}
                                            className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle className="w-8 h-8 text-emerald-400" />
                                        </motion.div>
                                        <h3 className="font-bold text-white mb-1">Emails envoyés !</h3>
                                        <p className="text-sm text-slate-400">{results?.sent} étudiant(s) notifié(s) par email</p>
                                    </>
                                )}
                                <button onClick={onClose} className="mt-6 w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-sm text-slate-300 transition">Fermer</button>
                            </div>
                        )}

                        {/* SENDING */}
                        {step === 'sending' && (
                            <div className="p-8 text-center">
                                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
                                <p className="text-white font-semibold">Envoi en cours...</p>
                                <p className="text-slate-400 text-sm mt-1">{selected.size} email(s)</p>
                            </div>
                        )}

                        {/* COMPOSE */}
                        {step === 'compose' && (
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="text-xs text-slate-400 font-semibold block mb-1.5">Objet de l'email</label>
                                    <input value={subject} onChange={e => setSubject(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
                                        placeholder="Ex: Nouvelle leçon disponible..." />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 font-semibold block mb-1.5">Message</label>
                                    <textarea value={body} onChange={e => setBody(e.target.value)}
                                        rows={5} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white resize-none"
                                        placeholder="Contenu du message..." />
                                </div>
                                <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15 text-xs text-slate-400">
                                    📧 Sera envoyé depuis <strong className="text-indigo-300">noreply@campusflow.app</strong> au nom de {orgName}
                                </div>
                                <button onClick={() => setStep('select')} disabled={!subject.trim() || !body.trim()}
                                    className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-sm font-bold text-white flex items-center justify-center gap-2 transition">
                                    <Users className="w-4 h-4" />Sélectionner les destinataires
                                </button>
                            </div>
                        )}

                        {/* SELECT STUDENTS */}
                        {step === 'select' && (
                            <div className="p-5 space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                                        <input value={search} onChange={e => setSearch(e.target.value)}
                                            placeholder="Chercher un étudiant..."
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white" />
                                    </div>
                                    <button onClick={toggleAll} className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 whitespace-nowrap transition">
                                        {selected.size === withEmail.length ? 'Désel. tout' : 'Sél. tout'}
                                    </button>
                                </div>

                                {withEmail.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500">
                                        <Mail className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">Aucun étudiant avec adresse email</p>
                                        <p className="text-xs mt-1">Ajoutez les emails dans les profils étudiants</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                                        {filtered.map(s => (
                                            <button key={s.id} onClick={() => toggleStudent(s.id)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-left ${selected.has(s.id) ? 'bg-indigo-600/20 border border-indigo-500/30' : 'bg-white/[0.02] border border-white/5 hover:bg-white/5'}`}>
                                                <div className={`w-4 h-4 rounded flex items-center justify-center border ${selected.has(s.id) ? 'bg-indigo-600 border-indigo-400' : 'border-slate-600'}`}>
                                                    {selected.has(s.id) && <div className="w-2 h-2 bg-white rounded-sm" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-white truncate">{s.first_name} {s.last_name}</p>
                                                    <p className="text-xs text-slate-400 truncate">{s.email}</p>
                                                </div>
                                                {s.classroom_name && <span className="text-xs text-slate-500 shrink-0">{s.classroom_name}</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer actions */}
                    {step === 'select' && (
                        <div className="px-5 py-4 border-t border-white/10 flex gap-3 shrink-0">
                            <button onClick={() => setStep('compose')} className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-sm text-slate-300 transition">
                                ← Retour
                            </button>
                            <button onClick={sendEmails} disabled={selected.size === 0 || sending}
                                className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-sm font-bold text-white flex items-center justify-center gap-2 transition">
                                <Send className="w-4 h-4" />
                                Envoyer ({selected.size})
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
