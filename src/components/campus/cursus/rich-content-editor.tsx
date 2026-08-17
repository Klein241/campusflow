'use client';
import { useState, useRef, useEffect } from 'react';
import {
    Plus, Image as ImageIcon, Type, X, MoveUp, MoveDown,
    Loader2, Mic, Play, Pause, Download, Square, Upload
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { compressImage } from '@/lib/compress';
import { uploadToR2 } from '@/lib/r2';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ===============================================================
// RICH CONTENT EDITOR — Blocs texte + images + audio
// ===============================================================

export type ContentBlock =
  | { type: 'text';  value: string }
  | { type: 'image'; url: string;  caption: string }
  | { type: 'audio'; url: string;  caption: string; duration?: number; sky_cost?: number };

interface RichContentEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  placeholder?: string;
  userId?: string;
  /** Called when teacher successfully publishes a voice note (+3 Sky Points) */
  onVoicePublished?: () => void;
}

// ── Audio compression (pass-through for now; worker handles further compress) ─
async function compressAudio(blob: Blob): Promise<Blob> {
    return blob; // WebM/Opus is already well compressed from MediaRecorder
}

// ── Audio Player ──────────────────────────────────────────────────────────────
function AudioPlayer({
  url, caption, onCaptionChange, showDownload, onDownload, downloading,
}: {
  url: string; caption: string;
  onCaptionChange?: (v: string) => void;
  showDownload?: boolean; onDownload?: () => void; downloading?: boolean;
}) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing,   setPlaying]   = useState(false);
    const [progress,  setProgress]  = useState(0);
    const [totalDur,  setTotalDur]  = useState(0);

    const toggle = () => {
        if (!audioRef.current) return;
        if (playing) { audioRef.current.pause(); setPlaying(false); }
        else         { audioRef.current.play();  setPlaying(true);  }
    };

    const fmt = (s: number) =>
        `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

    return (
        <div className="rounded-xl overflow-hidden border border-violet-500/20 bg-violet-500/5">
            <audio
                ref={audioRef} src={url}
                onTimeUpdate={()    => setProgress(audioRef.current?.currentTime || 0)}
                onLoadedMetadata={() => setTotalDur(audioRef.current?.duration   || 0)}
                onEnded={() => setPlaying(false)}
            />
            <div className="px-3 py-2.5 flex items-center gap-3">
                {/* Play / Pause */}
                <button
                    onClick={toggle}
                    className="w-9 h-9 rounded-full bg-violet-500/20 hover:bg-violet-500/40 border border-violet-500/30 flex items-center justify-center transition-all shrink-0"
                >
                    {playing
                        ? <Pause className="w-4 h-4 text-violet-300" />
                        : <Play  className="w-4 h-4 text-violet-300 ml-0.5" />
                    }
                </button>

                {/* Progress bar + time */}
                <div className="flex-1 space-y-1">
                    <div
                        className="relative h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer"
                        onClick={e => {
                            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                            const pct = (e.clientX - rect.left) / rect.width;
                            if (audioRef.current) audioRef.current.currentTime = pct * totalDur;
                        }}
                    >
                        <div
                            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all"
                            style={{ width: totalDur ? `${(progress / totalDur) * 100}%` : '0%' }}
                        />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500">
                        <span>{fmt(progress)}</span><span>{fmt(totalDur)}</span>
                    </div>
                </div>

                <Mic className="w-3.5 h-3.5 text-violet-400 shrink-0" />

                {/* Download button (student side) — always visible */}
                {showDownload && onDownload && (
                    <button
                        onClick={onDownload} disabled={downloading}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-violet-500/15 hover:bg-violet-500/30 border border-violet-500/25 text-violet-300 text-[11px] font-semibold transition-all shrink-0"
                        title="Télécharger la note vocale"
                    >
                        {downloading
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Download className="w-3.5 h-3.5" />
                        }
                        <span className="hidden sm:inline">-2 Sky Pts</span>
                    </button>
                )}
            </div>

            {/* Caption */}
            <div className="px-3 pb-2">
                {onCaptionChange ? (
                    <Input
                        value={caption}
                        onChange={e => onCaptionChange(e.target.value)}
                        placeholder="🎙️ Légende de la note vocale…"
                        className="bg-transparent border-none text-[11px] text-slate-400 placeholder:text-slate-600 focus-visible:ring-0 focus:outline-none h-7 p-0"
                    />
                ) : (
                    caption && <p className="text-[11px] text-slate-500 italic">{caption}</p>
                )}
            </div>
        </div>
    );
}

// ── Voice Recorder ────────────────────────────────────────────────────────────
function VoiceRecorder({ onDone }: { onDone: (blob: Blob, duration: number) => void }) {
    const [recording, setRecording] = useState(false);
    const [elapsed,   setElapsed]   = useState(0);
    const mrRef       = useRef<MediaRecorder | null>(null);
    const chunksRef   = useRef<Blob[]>([]);
    const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
    const startRef    = useRef<number>(0);

    const start = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                    ? 'audio/webm;codecs=opus'
                    : 'audio/webm',
            });
            mrRef.current   = mr;
            chunksRef.current = [];
            mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            mr.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const dur  = (Date.now() - startRef.current) / 1000;
                onDone(blob, Math.round(dur));
            };
            mr.start(250);
            startRef.current = Date.now();
            setRecording(true); setElapsed(0);
            timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
        } catch {
            toast.error('Microphone non accessible');
        }
    };

    const stop = () => {
        mrRef.current?.stop();
        if (timerRef.current) clearInterval(timerRef.current);
        setRecording(false);
    };

    useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

    const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    return (
        <div className="flex items-center gap-1">
            {!recording ? (
                <button
                    onClick={start}
                    className="flex items-center gap-1 text-[11px] text-violet-400 px-2.5 py-1 rounded-full bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 transition-all font-medium"
                >
                    <Mic className="w-3 h-3" /> Note vocale
                </button>
            ) : (
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                    <span className="text-[11px] text-rose-300 font-mono">{fmt(elapsed)}</span>
                    <button
                        onClick={stop}
                        className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 transition-all font-semibold"
                    >
                        <Square className="w-3 h-3 fill-current" /> Stop
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Main Editor ───────────────────────────────────────────────────────────────
export function RichContentEditor({
    blocks, onChange,
    placeholder = 'Commencez à écrire...',
    userId, onVoicePublished,
}: RichContentEditorProps) {
    const [uploadingAt,  setUploadingAt]  = useState<number | null>(null);
    const [insertAt,     setInsertAt]     = useState<number | null>(null);
    const [audioLoading, setAudioLoading] = useState<number | null>(null);
    const fileRef  = useRef<HTMLInputElement>(null);
    const multiRef = useRef<HTMLInputElement>(null);

    const displayBlocks: ContentBlock[] =
        blocks.length === 0 ? [{ type: 'text', value: '' }] : blocks;

    const update = (i: number, block: ContentBlock) => {
        const next = [...displayBlocks]; next[i] = block; onChange(next);
    };
    const remove = (i: number) => {
        if (displayBlocks.length <= 1) { onChange([{ type: 'text', value: '' }]); return; }
        onChange(displayBlocks.filter((_, idx) => idx !== i));
    };
    const move = (i: number, dir: -1 | 1) => {
        const next = [...displayBlocks]; const t = i + dir;
        if (t < 0 || t >= next.length) return;
        [next[i], next[t]] = [next[t], next[i]]; onChange(next);
    };
    const addText = (after: number) => {
        const next = [...displayBlocks];
        next.splice(after + 1, 0, { type: 'text', value: '' });
        onChange(next);
    };

    const uploadImage = async (file: File, after: number) => {
        setUploadingAt(after);
        try {
            const compressed = await compressImage(file, { maxWidth: 1200, quality: 0.82 });
            const r2 = await uploadToR2(compressed, `cursus-content/${userId || 'shared'}`, file.name);
            const next = [...displayBlocks];
            next.splice(after + 1, 0, { type: 'image', url: r2.url, caption: '' });
            onChange(next);
            toast.success('Image insérée ✅');
        } catch (e: any) { toast.error('Erreur upload: ' + (e.message || e)); }
        setUploadingAt(null); setInsertAt(null);
    };

    const uploadMultipleImages = async (files: FileList, after: number) => {
        setUploadingAt(after);
        try {
            const uploaded: ContentBlock[] = [];
            for (let idx = 0; idx < files.length; idx++) {
                const file = files[idx];
                const compressed = await compressImage(file, { maxWidth: 1200, quality: 0.82 });
                const r2 = await uploadToR2(
                    compressed, `cursus-content/${userId || 'shared'}`,
                    `${Date.now()}_${idx}_${file.name}`
                );
                uploaded.push({ type: 'image', url: r2.url, caption: '' });
            }
            const next = [...displayBlocks];
            next.splice(after + 1, 0, ...uploaded);
            onChange(next);
            toast.success(`${files.length} image(s) insérée(s) ✅`);
        } catch (e: any) { toast.error('Erreur upload: ' + (e.message || e)); }
        setUploadingAt(null); setInsertAt(null);
    };

    const uploadVoiceNote = async (blob: Blob, duration: number, after: number) => {
        setAudioLoading(after);
        try {
            const compressed = await compressAudio(blob);
            const r2 = await uploadToR2(
                compressed, `cursus-audio/${userId || 'shared'}`,
                `voice_${Date.now()}.webm`
            );
            const next = [...displayBlocks];
            next.splice(after + 1, 0, {
                type: 'audio', url: r2.url, caption: '', duration, sky_cost: 2,
            });
            onChange(next);
            toast.success('Note vocale ajoutée 🎙️ (+3 Sky Points prof)');
            onVoicePublished?.();
        } catch (e: any) { toast.error('Erreur upload audio: ' + (e.message || e)); }
        setAudioLoading(null);
    };

    return (
        <div className="space-y-2">
            <AnimatePresence>
                {displayBlocks.map((block, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        className="group relative"
                    >
                        {/* Block Controls */}
                        <div className="absolute -top-2 right-0 z-10 flex items-center gap-0.5 bg-[#0d1017] border border-white/10 rounded-lg px-1 py-0.5 shadow-xl">
                            <button onClick={() => move(i, -1)} disabled={i === 0}
                                className="p-1 text-slate-500 hover:text-white disabled:opacity-20 rounded transition">
                                <MoveUp className="w-3 h-3" />
                            </button>
                            <button onClick={() => move(i, 1)} disabled={i === displayBlocks.length - 1}
                                className="p-1 text-slate-500 hover:text-white disabled:opacity-20 rounded transition">
                                <MoveDown className="w-3 h-3" />
                            </button>
                            <button onClick={() => remove(i)}
                                className="p-1 text-red-500 hover:text-red-400 rounded transition">
                                <X className="w-3 h-3" />
                            </button>
                        </div>

                        {/* TEXT */}
                        {block.type === 'text' && (
                            <textarea
                                value={block.value}
                                onChange={e => update(i, { type: 'text', value: e.target.value })}
                                placeholder={i === 0 ? placeholder : 'Continuer le texte...'}
                                rows={3}
                                className="w-full min-h-[72px] bg-white/[0.04] border border-white/10 text-white placeholder:text-slate-600 rounded-xl px-3 py-2.5 text-sm leading-relaxed resize-none focus:outline-none focus:border-indigo-500/40 transition"
                            />
                        )}

                        {/* IMAGE */}
                        {block.type === 'image' && (
                            <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20">
                                <img src={block.url} alt={block.caption || ''} className="w-full max-h-72 object-contain mx-auto block" loading="lazy" />
                                <div className="px-3 py-1.5 bg-black/30">
                                    <Input
                                        value={block.caption}
                                        onChange={e => update(i, { ...block, caption: e.target.value })}
                                        placeholder="🖼️ Légende (optionnelle)"
                                        className="bg-transparent border-none text-[11px] text-slate-400 placeholder:text-slate-600 text-center focus-visible:ring-0 focus:outline-none h-7 p-0"
                                    />
                                </div>
                            </div>
                        )}

                        {/* AUDIO */}
                        {block.type === 'audio' && (
                            <AudioPlayer
                                url={block.url}
                                caption={block.caption}
                                onCaptionChange={v => update(i, { ...block, caption: v })}
                            />
                        )}

                        {/* ── Toolbar d'insertion (toujours visible) ── */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-white/[0.06]">
                            <button onClick={() => addText(i)}
                                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/10 border border-white/10 transition-all">
                                <Type className="w-3 h-3" /> Texte
                            </button>
                            <button
                                onClick={() => { setInsertAt(i); fileRef.current?.click(); }}
                                disabled={uploadingAt !== null}
                                className="flex items-center gap-1 text-[11px] text-amber-400 px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all disabled:opacity-40">
                                {uploadingAt === i
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <ImageIcon className="w-3 h-3" />
                                }
                                Image
                            </button>
                            <button
                                onClick={() => { setInsertAt(i); multiRef.current?.click(); }}
                                disabled={uploadingAt !== null}
                                className="flex items-center gap-1 text-[11px] text-teal-400 px-2.5 py-1 rounded-full bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 transition-all disabled:opacity-40">
                                <Upload className="w-3 h-3" /> Multi-images
                            </button>
                            {audioLoading === i ? (
                                <span className="flex items-center gap-1 text-[11px] text-violet-400 px-2.5 py-1">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Upload…
                                </span>
                            ) : (
                                <VoiceRecorder onDone={(blob, dur) => uploadVoiceNote(blob, dur, i)} />
                            )}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Hidden file inputs */}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => {
                    const f = e.target.files?.[0];
                    if (f && insertAt !== null) uploadImage(f, insertAt);
                    e.target.value = '';
                }}
            />
            <input ref={multiRef} type="file" accept="image/*" multiple className="hidden"
                onChange={e => {
                    const files = e.target.files;
                    if (files && files.length > 0 && insertAt !== null)
                        uploadMultipleImages(files, insertAt);
                    e.target.value = '';
                }}
            />
        </div>
    );
}

// ── Read-only Renderer (student side) ─────────────────────────────────────────
interface RichContentRendererProps {
    blocks: ContentBlock[];
    /** Return true if deduction succeeded; false = not enough points */
    onAudioDownload?: (block: ContentBlock & { type: 'audio' }) => Promise<boolean>;
}

export function RichContentRenderer({ blocks, onAudioDownload }: RichContentRendererProps) {
    const [downloading, setDownloading] = useState<number | null>(null);
    if (!blocks.length) return null;
    return (
        <div className="space-y-3">
            {blocks.map((block, i) => (
                <div key={i}>
                    {block.type === 'text' && block.value.trim() && (
                        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">{block.value}</p>
                    )}
                    {block.type === 'image' && (
                        <div className="rounded-xl overflow-hidden border border-white/10">
                            <img src={block.url} alt={block.caption || ''} className="w-full object-contain max-h-80" loading="lazy" />
                            {block.caption && (
                                <p className="text-center text-[11px] text-slate-500 px-3 py-1.5 italic bg-black/20">{block.caption}</p>
                            )}
                        </div>
                    )}
                    {block.type === 'audio' && (
                        <div>
                            {block.sky_cost && onAudioDownload && (
                                <p className="text-[10px] text-violet-400 mb-1 flex items-center gap-1">
                                    <Download className="w-3 h-3" /> Téléchargement = {block.sky_cost} Sky Points
                                </p>
                            )}
                            <AudioPlayer
                                url={block.url}
                                caption={block.caption}
                                showDownload={!!onAudioDownload}
                                downloading={downloading === i}
                                onDownload={onAudioDownload ? async () => {
                                    setDownloading(i);
                                    const ok = await onAudioDownload(block as ContentBlock & { type: 'audio' });
                                    if (ok) {
                                        try {
                                            const resp = await fetch(block.url);
                                            const blob = await resp.blob();
                                            const objUrl = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = objUrl;
                                            a.download = `note-vocale-${i + 1}.webm`;
                                            a.click();
                                            setTimeout(() => URL.revokeObjectURL(objUrl), 5000);
                                        } catch {
                                            const a = document.createElement('a');
                                            a.href = block.url;
                                            a.download = `note-vocale-${i + 1}.webm`;
                                            a.click();
                                        }
                                    }
                                    setDownloading(null);
                                } : undefined}
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

/** Parse a raw DB string (plain text OR JSON blocks array) into ContentBlock[] */
export function parseContent(raw: string | null | undefined): ContentBlock[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as ContentBlock[];
    } catch {}
    return [{ type: 'text', value: raw }];
}

/** Serialize ContentBlock[] to JSON string for storage */
export function serializeContent(blocks: ContentBlock[]): string {
    const meaningful = blocks.filter(b =>
        b.type === 'audio' || b.type === 'image' || (b.type === 'text' && b.value.trim())
    );
    return JSON.stringify(meaningful);
}
