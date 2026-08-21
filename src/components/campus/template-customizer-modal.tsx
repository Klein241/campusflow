'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, X, Save, Image, Type, Eye, EyeOff,
    Sliders, BookOpen, Headphones, Award, Star,
    CheckCircle2, Loader2, UploadCloud, RefreshCw, UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { uploadToR2 } from '@/lib/r2';

export interface TemplateCustomConfig {
    // Profil Formateur
    trainer_name?: string;
    trainer_title?: string;
    trainer_subtitle?: string;
    trainer_bio?: string;
    trainer_quote?: string;
    trainer_photo_url?: string;
    trainer_photo_secondary_url?: string;

    // Produit Phare / Livre / Programme d'exception
    flagship_title?: string;
    flagship_subtitle?: string;
    flagship_description?: string;
    flagship_image_url?: string;
    flagship_cta_text?: string;
    flagship_price?: string;

    // Podcast & Presse
    podcast_title?: string;
    podcast_description?: string;
    podcast_cta_text?: string;
    podcast_episodes_count?: string;
    press_logos_text?: string;

    // Commutateurs de Visibilité (Toggles)
    show_student_count?: boolean;
    student_count_override?: string;
    show_teacher_count?: boolean;
    teacher_count_override?: string;
    show_years_experience?: boolean;
    years_experience_value?: string;
    show_rating_stars?: boolean;
    rating_score_value?: string;
    show_press_logos?: boolean;
    show_flagship_product?: boolean;
    show_podcast_section?: boolean;
    show_services_grid?: boolean;
    show_social_links?: boolean;
}

interface TemplateCustomizerModalProps {
    isOpen: boolean;
    onClose: () => void;
    org: any;
    currentTemplateId: string;
    onSaveSuccess: (updatedOrg: any) => void;
}

export function TemplateCustomizerModal({
    isOpen,
    onClose,
    org,
    currentTemplateId,
    onSaveSuccess
}: TemplateCustomizerModalProps) {
    const rawConfig = org.template_config || {};
    const [activeTab, setActiveTab] = useState<'profile' | 'flagship' | 'media' | 'toggles'>('profile');
    const [saving, setSaving] = useState(false);
    const [uploadingField, setUploadingField] = useState<string | null>(null);

    const [form, setForm] = useState<TemplateCustomConfig>({
        trainer_name: rawConfig.trainer_name || org.name || '',
        trainer_title: rawConfig.trainer_title || org.motto || 'Auteur, Conférencier, Formateur Expert & Coach',
        trainer_subtitle: rawConfig.trainer_subtitle || org.hero_subtitle || 'Développez votre plein potentiel et transformez vos compétences.',
        trainer_bio: rawConfig.trainer_bio || org.about_text || 'Bienvenue dans mon espace de formation. Des méthodes éprouvées pour propulser votre carrière.',
        trainer_quote: rawConfig.trainer_quote || 'Transformer les idées en expériences mémorables et utiles ♡',
        trainer_photo_url: rawConfig.trainer_photo_url || org.hero_image_url || org.about_image_url || '',
        trainer_photo_secondary_url: rawConfig.trainer_photo_secondary_url || '',

        flagship_title: rawConfig.flagship_title || 'Et si vous pouviez obtenir exactement ce que vous voulez ?',
        flagship_subtitle: rawConfig.flagship_subtitle || 'Formation & Méthodologie N°1 Recommandée',
        flagship_description: rawConfig.flagship_description || 'Un accompagnement structuré, des ateliers pratiques et un accès direct aux ressources et aux mentors.',
        flagship_image_url: rawConfig.flagship_image_url || '',
        flagship_cta_text: rawConfig.flagship_cta_text || 'Commander / Réserver mon accès',
        flagship_price: rawConfig.flagship_price || '250 000 FCFA',

        podcast_title: rawConfig.podcast_title || 'LE PODCAST / MASTERCLASS',
        podcast_description: rawConfig.podcast_description || 'Des centaines d\'épisodes et d\'ateliers en direct pour comprendre les rouages du succès et de la transformation.',
        podcast_cta_text: rawConfig.podcast_cta_text || 'Écouter / Voir la Masterclass',
        podcast_episodes_count: rawConfig.podcast_episodes_count || '100+',
        press_logos_text: rawConfig.press_logos_text || 'FORBES, SUCCESS, PEOPLE, HUFFPOST, YAHOO',

        show_student_count: rawConfig.show_student_count !== false,
        student_count_override: rawConfig.student_count_override || '',
        show_teacher_count: rawConfig.show_teacher_count !== false,
        teacher_count_override: rawConfig.teacher_count_override || '',
        show_years_experience: rawConfig.show_years_experience !== false,
        years_experience_value: rawConfig.years_experience_value || '14',
        show_rating_stars: rawConfig.show_rating_stars !== false,
        rating_score_value: rawConfig.rating_score_value || '5.0★ (98% Satisfaction)',
        show_press_logos: rawConfig.show_press_logos !== false,
        show_flagship_product: rawConfig.show_flagship_product !== false,
        show_podcast_section: rawConfig.show_podcast_section !== false,
        show_services_grid: rawConfig.show_services_grid !== false,
        show_social_links: rawConfig.show_social_links !== false,
    });

    if (!isOpen) return null;

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'trainer_photo_url' | 'trainer_photo_secondary_url' | 'flagship_image_url') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingField(fieldName);
        try {
            const res = await uploadToR2(file, `templates/${org.id}/${fieldName}`, file.name);
            setForm(prev => ({ ...prev, [fieldName]: res.url }));
            toast.success('Image téléversée avec succès !');
        } catch (err: any) {
            toast.error('Erreur téléversement : ' + err.message);
        } finally {
            setUploadingField(null);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Sauvegarde dans Supabase
            const { error } = await supabase
                .from('organizations')
                .update({
                    template_config: form,
                    updated_at: new Date().toISOString()
                })
                .eq('id', org.id);

            if (error) {
                console.warn('[Customizer] Supabase update warning:', error);
            }

            // Sauvegarde locale instantanée pour réactivité parfaite
            if (typeof window !== 'undefined') {
                localStorage.setItem(`campusflow_template_config_${org.id}`, JSON.stringify(form));
                localStorage.setItem(`campusflow_template_config_${org.slug}`, JSON.stringify(form));
            }

            const updatedOrg = {
                ...org,
                template_config: form
            };

            onSaveSuccess(updatedOrg);
            toast.success('✨ Personnalisation du template enregistrée avec succès !');
            onClose();
        } catch (e: any) {
            toast.error(e.message || 'Erreur lors de l\'enregistrement');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0D121D] border border-white/10 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-teal-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <Sliders className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white">Personnalisation du Template</h3>
                            <p className="text-xs text-slate-400">Ajustez les textes, photos et éléments visibles pour votre portail public.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 p-3 bg-[#080B12] border-b border-white/5 overflow-x-auto">
                    {[
                        { id: 'profile', label: '👤 Formateur & Textes', icon: Type },
                        { id: 'flagship', label: '📘 Livre & Programme Phare', icon: BookOpen },
                        { id: 'media', label: '🎙️ Podcast & Presse', icon: Headphones },
                        { id: 'toggles', label: '👁️ Visibilité & Stats', icon: Eye },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                                activeTab === t.id
                                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <t.icon className="w-3.5 h-3.5" />
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                    {/* TAB 1: FORMATEUR & PROFIL */}
                    {activeTab === 'profile' && (
                        <div className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-slate-300 font-bold block mb-1.5">Nom du Formateur / Établissement</label>
                                    <Input
                                        value={form.trainer_name}
                                        onChange={e => setForm({ ...form, trainer_name: e.target.value })}
                                        placeholder="Ex: Julie Solomon, Dr. Marc Essono..."
                                        className="bg-white/5 border-white/10 text-white rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-300 font-bold block mb-1.5">Titre Professionnel / Rôle</label>
                                    <Input
                                        value={form.trainer_title}
                                        onChange={e => setForm({ ...form, trainer_title: e.target.value })}
                                        placeholder="Ex: Auteur, Designer & Formateur Lead..."
                                        className="bg-white/5 border-white/10 text-white rounded-xl"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-slate-300 font-bold block mb-1.5">Accroche Principale (Hero Headline)</label>
                                <Input
                                    value={form.trainer_subtitle}
                                    onChange={e => setForm({ ...form, trainer_subtitle: e.target.value })}
                                    placeholder="Ex: Développez votre plein potentiel et transformez vos compétences."
                                    className="bg-white/5 border-white/10 text-white rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="text-slate-300 font-bold block mb-1.5">Biographie / Présentation Pédagogique</label>
                                <Textarea
                                    value={form.trainer_bio}
                                    onChange={e => setForm({ ...form, trainer_bio: e.target.value })}
                                    placeholder="Présentez votre méthodologie d'apprentissage et votre vision..."
                                    className="bg-white/5 border-white/10 text-white rounded-xl min-h-[90px]"
                                />
                            </div>

                            <div>
                                <label className="text-slate-300 font-bold block mb-1.5">Citation / Bulle Manuscrite</label>
                                <Input
                                    value={form.trainer_quote}
                                    onChange={e => setForm({ ...form, trainer_quote: e.target.value })}
                                    placeholder='Ex: "Transformer les idées en expériences mémorables et utiles ♡"'
                                    className="bg-white/5 border-white/10 text-white rounded-xl"
                                />
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4 pt-2">
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                                    <label className="text-slate-300 font-bold block">Photo Principale du Formateur</label>
                                    {form.trainer_photo_url && (
                                        <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                                            <img src={form.trainer_photo_url} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <Input
                                        value={form.trainer_photo_url}
                                        onChange={e => setForm({ ...form, trainer_photo_url: e.target.value })}
                                        placeholder="URL de l'image (https://...)"
                                        className="bg-white/5 border-white/10 text-white rounded-xl"
                                    />
                                    <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-white/20 hover:border-amber-400/50 cursor-pointer text-slate-400 hover:text-white transition">
                                        <UploadCloud className="w-4 h-4" />
                                        <span>{uploadingField === 'trainer_photo_url' ? 'Téléversement...' : 'Téléverser une photo'}</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'trainer_photo_url')} />
                                    </label>
                                </div>

                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                                    <label className="text-slate-300 font-bold block">Photo Secondaire (Section Podcast/About)</label>
                                    {form.trainer_photo_secondary_url && (
                                        <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                                            <img src={form.trainer_photo_secondary_url} alt="Preview 2" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <Input
                                        value={form.trainer_photo_secondary_url}
                                        onChange={e => setForm({ ...form, trainer_photo_secondary_url: e.target.value })}
                                        placeholder="URL 2ème photo (optionnel)"
                                        className="bg-white/5 border-white/10 text-white rounded-xl"
                                    />
                                    <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-white/20 hover:border-amber-400/50 cursor-pointer text-slate-400 hover:text-white transition">
                                        <UploadCloud className="w-4 h-4" />
                                        <span>{uploadingField === 'trainer_photo_secondary_url' ? 'Téléversement...' : 'Téléverser photo secondaire'}</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'trainer_photo_secondary_url')} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: LIVRE & PROGRAMME PHARE */}
                    {activeTab === 'flagship' && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-slate-300 font-bold block mb-1.5">Titre du Programme Phare ou Livre</label>
                                <Input
                                    value={form.flagship_title}
                                    onChange={e => setForm({ ...form, flagship_title: e.target.value })}
                                    placeholder="Ex: Masterclass Stratégique / Manuel Pédagogique 2026..."
                                    className="bg-white/5 border-white/10 text-white rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="text-slate-300 font-bold block mb-1.5">Sous-titre / Badge d'Accréditation</label>
                                <Input
                                    value={form.flagship_subtitle}
                                    onChange={e => setForm({ ...form, flagship_subtitle: e.target.value })}
                                    placeholder="Ex: Formation N°1 Recommandée / Best-Seller de l'Année..."
                                    className="bg-white/5 border-white/10 text-white rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="text-slate-300 font-bold block mb-1.5">Description Détaillée</label>
                                <Textarea
                                    value={form.flagship_description}
                                    onChange={e => setForm({ ...form, flagship_description: e.target.value })}
                                    placeholder="Expliquez ce que contient le programme et les bénéfices pour l'étudiant..."
                                    className="bg-white/5 border-white/10 text-white rounded-xl min-h-[90px]"
                                />
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-slate-300 font-bold block mb-1.5">Texte du Bouton d'Action (CTA)</label>
                                    <Input
                                        value={form.flagship_cta_text}
                                        onChange={e => setForm({ ...form, flagship_cta_text: e.target.value })}
                                        placeholder="Ex: Rejoindre le programme, Commander..."
                                        className="bg-white/5 border-white/10 text-white rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-300 font-bold block mb-1.5">Prix Affiché / Modalité</label>
                                    <Input
                                        value={form.flagship_price}
                                        onChange={e => setForm({ ...form, flagship_price: e.target.value })}
                                        placeholder="Ex: 250 000 FCFA / Inclus dans la scolarité"
                                        className="bg-white/5 border-white/10 text-white rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                                <label className="text-slate-300 font-bold block">Image de Couverture (Livre 3D / Mockup)</label>
                                {form.flagship_image_url && (
                                    <div className="w-20 h-24 rounded-xl overflow-hidden border border-white/10">
                                        <img src={form.flagship_image_url} alt="Cover Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <Input
                                    value={form.flagship_image_url}
                                    onChange={e => setForm({ ...form, flagship_image_url: e.target.value })}
                                    placeholder="URL de la couverture..."
                                    className="bg-white/5 border-white/10 text-white rounded-xl"
                                />
                                <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-white/20 hover:border-amber-400/50 cursor-pointer text-slate-400 hover:text-white transition">
                                    <UploadCloud className="w-4 h-4" />
                                    <span>{uploadingField === 'flagship_image_url' ? 'Téléversement...' : 'Téléverser l\'image de couverture'}</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'flagship_image_url')} />
                                </label>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: PODCAST & PRESSE */}
                    {activeTab === 'media' && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-slate-300 font-bold block mb-1.5">Titre de la Section Podcast / Masterclass Audio</label>
                                <Input
                                    value={form.podcast_title}
                                    onChange={e => setForm({ ...form, podcast_title: e.target.value })}
                                    placeholder="Ex: LE PODCAST EXCLUSIF / MASTERCLASS AUDIO"
                                    className="bg-white/5 border-white/10 text-white rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="text-slate-300 font-bold block mb-1.5">Description & Impact</label>
                                <Textarea
                                    value={form.podcast_description}
                                    onChange={e => setForm({ ...form, podcast_description: e.target.value })}
                                    placeholder="Décrivez les sujets abordés et la fréquence des masterclass..."
                                    className="bg-white/5 border-white/10 text-white rounded-xl min-h-[80px]"
                                />
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-slate-300 font-bold block mb-1.5">Texte Bouton Écoute</label>
                                    <Input
                                        value={form.podcast_cta_text}
                                        onChange={e => setForm({ ...form, podcast_cta_text: e.target.value })}
                                        placeholder="Ex: Écouter les épisodes..."
                                        className="bg-white/5 border-white/10 text-white rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-300 font-bold block mb-1.5">Nombre d'Épisodes / Heures</label>
                                    <Input
                                        value={form.podcast_episodes_count}
                                        onChange={e => setForm({ ...form, podcast_episodes_count: e.target.value })}
                                        placeholder="Ex: 100+ Épisodes, 50h de cours..."
                                        className="bg-white/5 border-white/10 text-white rounded-xl"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-slate-300 font-bold block mb-1.5">Logos de Presse / Partenaires (Séparés par des virgules)</label>
                                <Input
                                    value={form.press_logos_text}
                                    onChange={e => setForm({ ...form, press_logos_text: e.target.value })}
                                    placeholder="Ex: FORBES, LE MONDE, SUCCESS, YAHOO FINANCE, BUSINESS INSIDER"
                                    className="bg-white/5 border-white/10 text-white rounded-xl"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">Ces noms seront élégamment stylisés dans le bandeau de crédibilité presse.</p>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: COMMUTATEURS DE VISIBILITÉ (TOGGLES) */}
                    {activeTab === 'toggles' && (
                        <div className="space-y-4">
                            <p className="text-slate-400 text-xs mb-4">
                                Activez ou désactivez les statistiques et sections selon vos préférences.
                            </p>

                            <div className="grid sm:grid-cols-2 gap-3">
                                {/* Toggle Élèves */}
                                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-white">Nombre d'Élèves / Diplômés</p>
                                        <p className="text-[10px] text-slate-400">Affiche le compteur d'étudiants</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={form.show_student_count}
                                        onChange={e => setForm({ ...form, show_student_count: e.target.checked })}
                                        className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                                    />
                                </div>

                                {/* Toggle Profs */}
                                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-white">Nombre de Professeurs / Mentors</p>
                                        <p className="text-[10px] text-slate-400">Affiche l'équipe pédagogique</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={form.show_teacher_count}
                                        onChange={e => setForm({ ...form, show_teacher_count: e.target.checked })}
                                        className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                                    />
                                </div>

                                {/* Toggle Années Expérience */}
                                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-white">Années d'Expérience</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-slate-400">Valeur :</span>
                                            <input
                                                type="text"
                                                value={form.years_experience_value}
                                                onChange={e => setForm({ ...form, years_experience_value: e.target.value })}
                                                className="w-12 px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-white text-[11px] text-center font-bold"
                                            />
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={form.show_years_experience}
                                        onChange={e => setForm({ ...form, show_years_experience: e.target.checked })}
                                        className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                                    />
                                </div>

                                {/* Toggle Avis 5 Étoiles */}
                                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-white">Note 5 Étoiles / Avis</p>
                                        <p className="text-[10px] text-slate-400">{form.rating_score_value}</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={form.show_rating_stars}
                                        onChange={e => setForm({ ...form, show_rating_stars: e.target.checked })}
                                        className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                                    />
                                </div>

                                {/* Toggle Logos Presse */}
                                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-white">Bandeau Logos Presse / Partenaires</p>
                                        <p className="text-[10px] text-slate-400">Forbes, People, Success...</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={form.show_press_logos}
                                        onChange={e => setForm({ ...form, show_press_logos: e.target.checked })}
                                        className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                                    />
                                </div>

                                {/* Toggle Produit Phare */}
                                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-white">Bloc Livre / Masterclass Phare</p>
                                        <p className="text-[10px] text-slate-400">Vitrine 3D du manuel / cours</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={form.show_flagship_product}
                                        onChange={e => setForm({ ...form, show_flagship_product: e.target.checked })}
                                        className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                                    />
                                </div>

                                {/* Toggle Podcast */}
                                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-white">Section Podcast / Audio</p>
                                        <p className="text-[10px] text-slate-400">Épisodes et enregistrements</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={form.show_podcast_section}
                                        onChange={e => setForm({ ...form, show_podcast_section: e.target.checked })}
                                        className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                                    />
                                </div>

                                {/* Toggle Services */}
                                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-white">Grille de Compétences / Services</p>
                                        <p className="text-[10px] text-slate-400">Modules d'apprentissage</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={form.show_services_grid}
                                        onChange={e => setForm({ ...form, show_services_grid: e.target.checked })}
                                        className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="p-4 border-t border-white/10 bg-[#080B12] flex items-center justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white rounded-xl text-xs h-10 px-4">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs h-10 px-6 shadow-lg shadow-amber-500/20 flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>Enregistrer les Personnalisations</span>
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
