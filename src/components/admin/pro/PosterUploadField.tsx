'use client';

import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Upload, Loader2, X, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { uploadToR2 } from '@/lib/r2';
import { supabase } from '@/lib/supabase';

interface PosterUploadFieldProps {
    value: string;
    onChange: (url: string) => void;
    label?: string;
}

export function PosterUploadField({
    value,
    onChange,
    label = "Affiche officielle de la formation (URL / Image)"
}: PosterUploadFieldProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Veuillez sélectionner un fichier image (PNG, JPG, WEBP, etc.)');
            return;
        }

        // 10 Mo max
        if (file.size > 10 * 1024 * 1024) {
            toast.error("L'image ne doit pas dépasser 10 Mo");
            return;
        }

        setUploading(true);
        const toastId = toast.loading("Téléversement de l'affiche en cours...");

        try {
            // 1. Essai prioritaire sur Cloudflare R2
            const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const res = await uploadToR2(file, 'posters', `poster_${Date.now()}_${cleanName}`);

            if (res?.url) {
                onChange(res.url);
                toast.success("Affiche téléversée avec succès !", { id: toastId });
                return;
            }
            throw new Error("L'URL retournée par R2 est vide");
        } catch (r2Err: any) {
            console.warn('[PosterUploadField] Échec upload R2, repli Supabase Storage:', r2Err);

            // 2. Repli de secours automatique sur Supabase Storage
            try {
                const ext = file.name.split('.').pop() || 'jpg';
                const path = `posters/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                const { error: supaErr } = await supabase.storage.from('campusflow-actifs').upload(path, file, {
                    cacheControl: '3600',
                    upsert: false
                });

                if (supaErr) throw supaErr;

                const { data: pubUrl } = supabase.storage.from('campusflow-actifs').getPublicUrl(path);
                if (pubUrl?.publicUrl) {
                    onChange(pubUrl.publicUrl);
                    toast.success("Affiche téléversée via stockage cloud !", { id: toastId });
                    return;
                }
                throw new Error("Impossible de récupérer l'URL publique de l'image");
            } catch (supaErr: any) {
                console.error('[PosterUploadField] Échec upload secours:', supaErr);
                toast.error("Erreur lors de l'envoi de l'affiche : " + (r2Err.message || supaErr.message), { id: toastId });
            }
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="space-y-2">
            {/* Input fichier masqué */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />

            <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>{label}</span>
                </label>
                <span className="text-[10px] text-slate-400">Visible sur toutes les landing pages</span>
            </div>

            {/* Bouton Upload + Champ URL */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2 transition shrink-0 cursor-pointer disabled:opacity-50"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                                <span>Envoi en cours...</span>
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4 text-amber-400" />
                                <span>📸 Uploader l'affiche</span>
                            </>
                        )}
                    </button>

                    <div className="relative flex-1">
                        <Input
                            value={value}
                            onChange={e => onChange(e.target.value)}
                            placeholder="Ou collez une URL : https://images.unsplash.com/... ou lien R2"
                            className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs pr-8"
                        />
                        {value && (
                            <button
                                type="button"
                                onClick={() => onChange('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                                title="Effacer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Aperçu de l'affiche */}
                {value && (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden border border-amber-500/30 bg-black/60 group">
                        <img
                            src={value}
                            alt="Aperçu affiche de la formation"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                // Fallback image si le lien est cassé
                                (e.target as any).src = 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&auto=format&fit=crop&q=80';
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

                        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between pointer-events-auto">
                            <span className="bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] text-emerald-300 font-bold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Affiche active
                            </span>

                            <button
                                type="button"
                                onClick={() => onChange('')}
                                className="bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 px-2 py-0.5 rounded text-[10px] text-red-300 font-bold transition cursor-pointer"
                            >
                                ✕ Remplacer
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
