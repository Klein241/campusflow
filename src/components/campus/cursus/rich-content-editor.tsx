'use client';
import { useState, useRef } from 'react';
import { Plus, Image as ImageIcon, Type, X, MoveUp, MoveDown, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/compress';
import { uploadToR2 } from '@/lib/r2';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════
// RICH CONTENT EDITOR — Bloc text + images style blog
// ═══════════════════════════════════════════════════════

export type ContentBlock =
  | { type: 'text'; value: string }
  | { type: 'image'; url: string; caption: string };

interface RichContentEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  placeholder?: string;
  userId?: string;
}

export function RichContentEditor({
  blocks,
  onChange,
  placeholder = 'Commencez à écrire...',
  userId,
}: RichContentEditorProps) {
  const [uploadingAt, setUploadingAt] = useState<number | null>(null);
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const displayBlocks: ContentBlock[] = blocks.length === 0 ? [{ type: 'text', value: '' }] : blocks;

  const update = (i: number, block: ContentBlock) => {
    const next = [...displayBlocks];
    next[i] = block;
    onChange(next);
  };

  const remove = (i: number) => {
    if (displayBlocks.length <= 1) { onChange([{ type: 'text', value: '' }]); return; }
    onChange(displayBlocks.filter((_, idx) => idx !== i));
  };

  const move = (i: number, dir: -1 | 1) => {
    const next = [...displayBlocks];
    const t = i + dir;
    if (t < 0 || t >= next.length) return;
    [next[i], next[t]] = [next[t], next[i]];
    onChange(next);
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
      const r2Res = await uploadToR2(compressed, `cursus-content/${userId || 'shared'}`, file.name);
      const next = [...displayBlocks];
      next.splice(after + 1, 0, { type: 'image', url: r2Res.url, caption: '' });
      onChange(next);
      toast.success('Image insérée ✅');
    } catch (e: any) {
      toast.error('Erreur upload: ' + (e.message || e));
    }
    setUploadingAt(null);
    setInsertAt(null);
  };

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {displayBlocks.map((block, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="group relative"
          >
            {/* Block Controls (visible on hover) */}
            <div className="absolute -top-2 right-0 z-10 hidden group-hover:flex items-center gap-0.5 bg-[#0d1017] border border-white/10 rounded-lg px-1 py-0.5 shadow-xl">
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="p-1 text-slate-500 hover:text-white disabled:opacity-20 rounded transition"
                title="Monter"
              >
                <MoveUp className="w-3 h-3" />
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === displayBlocks.length - 1}
                className="p-1 text-slate-500 hover:text-white disabled:opacity-20 rounded transition"
                title="Descendre"
              >
                <MoveDown className="w-3 h-3" />
              </button>
              <button
                onClick={() => remove(i)}
                className="p-1 text-red-500 hover:text-red-400 rounded transition"
                title="Supprimer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* TEXT BLOCK */}
            {block.type === 'text' && (
              <textarea
                value={block.value}
                onChange={e => update(i, { type: 'text', value: e.target.value })}
                placeholder={i === 0 ? placeholder : 'Continuer le texte...'}
                rows={3}
                className="w-full min-h-[72px] bg-white/[0.04] border border-white/10 text-white placeholder:text-slate-600 rounded-xl px-3 py-2.5 text-sm leading-relaxed resize-none focus:outline-none focus:border-indigo-500/40 transition"
              />
            )}

            {/* IMAGE BLOCK */}
            {block.type === 'image' && (
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20">
                <img
                  src={block.url}
                  alt={block.caption || ''}
                  className="w-full max-h-72 object-contain mx-auto block"
                  loading="lazy"
                />
                <div className="px-3 py-1.5 bg-black/30">
                  <Input
                    value={block.caption}
                    onChange={e => update(i, { ...block, caption: e.target.value })}
                    placeholder="Légende (optionnelle)"
                    className="bg-transparent border-none text-[11px] text-slate-400 placeholder:text-slate-600 text-center focus-visible:ring-0 focus:outline-none h-7 p-0"
                  />
                </div>
              </div>
            )}

            {/* Toolbar between blocks */}
            <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="flex-1 h-px bg-white/[0.05]" />
              <button
                onClick={() => addText(i)}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 px-2 py-0.5 rounded-full hover:bg-white/5 transition-all"
              >
                <Type className="w-2.5 h-2.5" />
                Texte
              </button>
              <button
                onClick={() => { setInsertAt(i); fileRef.current?.click(); }}
                disabled={uploadingAt !== null}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-amber-400 px-2 py-0.5 rounded-full hover:bg-amber-500/10 transition-all disabled:opacity-40"
              >
                {uploadingAt === i
                  ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  : <ImageIcon className="w-2.5 h-2.5" />
                }
                Image
              </button>
              <div className="flex-1 h-px bg-white/[0.05]" />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f && insertAt !== null) uploadImage(f, insertAt);
          e.target.value = '';
        }}
      />
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
  const meaningful = blocks.filter(b => b.type === 'image' || (b.type === 'text' && b.value.trim()));
  return JSON.stringify(meaningful);
}
