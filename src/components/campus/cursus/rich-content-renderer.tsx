'use client';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Copy, Check, Eye, Code2, ChevronDown, ChevronUp, Mic, Play, Pause, Download, Loader2, X, Volume2 } from 'lucide-react';
import type { ContentBlock } from './rich-content-editor';

// ═══════════════════════════════════════════════════════
// RICH CONTENT RENDERER — Read-only display of blocks
// Supporte: texte, images, et blocs de code (avec rendu HTML live)
// ═══════════════════════════════════════════════════════

interface RichContentRendererProps {
  content: string | null | undefined;
  className?: string;
  /** If provided, shows a compact preview with max N chars of text */
  truncateAt?: number;
  /** If provided, student can download audio (-sky_cost Sky Points). Return true = success */
  onAudioDownload?: (block: ContentBlock & { type: 'audio' }) => Promise<boolean>;
}

// ── Inline AudioPlayer with contextual popup for renderer ─────────────────────
function AudioPlayerInline({
  url, caption, showDownload, onDownload, downloading,
}: {
  url: string; caption: string;
  showDownload?: boolean; onDownload?: () => void; downloading?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dur, setDur] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const fmt = (s: number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  
  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else         { audioRef.current.play();  setPlaying(true);  }
  };

  const closeModal = () => {
    if (audioRef.current) { audioRef.current.pause(); setPlaying(false); }
    setShowModal(false);
  };

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className="rounded-xl overflow-hidden border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 hover:border-violet-500/40 transition-all cursor-pointer group"
      >
        <div className="px-3 py-2.5 flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggle(); }}
            className="w-9 h-9 rounded-full bg-violet-500/20 hover:bg-violet-500/40 border border-violet-500/30 flex items-center justify-center transition-all shrink-0"
          >
            {playing ? <Pause className="w-4 h-4 text-violet-300" /> : <Play className="w-4 h-4 text-violet-300 ml-0.5" />}
          </button>
          <div className="flex-1 space-y-1">
            <div
              className="relative h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                if (audioRef.current) audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * dur;
              }}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all"
                style={{ width: dur ? `${(progress/dur)*100}%` : '0%' }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-400">
              <span className="font-mono">{fmt(progress)} / {fmt(dur)}</span>
              <span className="text-violet-300 font-medium group-hover:underline">Ouvrir le lecteur ↗</span>
            </div>
          </div>
          <Mic className="w-3.5 h-3.5 text-violet-400 shrink-0" />
        </div>
        {caption && (
          <p className="px-3 pb-2 text-[11px] text-slate-400 italic border-t border-white/5 pt-1 mt-0.5">{caption}</p>
        )}
      </div>

      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => setProgress(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDur(audioRef.current?.duration || 0)}
        onEnded={() => setPlaying(false)}
      />

      {/* ── Fenêtre contextuelle popup ── */}
      <AnimatePresence>
        {showModal && (
          <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.96 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#111625] border border-violet-500/30 rounded-3xl p-5 shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                    <Mic className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white line-clamp-1">{caption || 'Note vocale de cours'}</h4>
                    <span className="text-[10px] text-slate-400">Lecteur audio contextuel</span>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Grand bouton de lecture et onde sonore */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggle}
                    className="w-12 h-12 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 flex items-center justify-center shrink-0 shadow-lg shadow-violet-600/30 transition-transform active:scale-95"
                  >
                    {playing ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
                  </button>
                  <div className="flex-1 space-y-1.5">
                    <div
                      className="relative h-2.5 bg-white/10 rounded-full overflow-hidden cursor-pointer"
                      onClick={(e) => {
                        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                        if (audioRef.current) audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * dur;
                      }}
                    >
                      <div
                        className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-400 to-cyan-400 transition-all"
                        style={{ width: dur ? `${(progress/dur)*100}%` : '0%' }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>{fmt(progress)}</span>
                      <span>{fmt(dur)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bouton de téléchargement */}
              {showDownload && onDownload && (
                <button
                  onClick={onDownload}
                  disabled={downloading}
                  className="w-full h-11 rounded-xl border border-violet-500/30 bg-violet-600/20 hover:bg-violet-600/30 text-violet-200 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {downloading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Déduction en cours…</>
                  ) : (
                    <><Download className="w-4 h-4 text-violet-300" /> Télécharger l'audio</>
                  )}
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Parse code fences from text ───────────────────────────────────────────────
type TextSegment = { type: 'text'; value: string } | { type: 'code'; lang: string; value: string };

function parseTextSegments(raw: string): TextSegment[] {
  const parts: TextSegment[] = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      const txt = raw.slice(lastIndex, match.index);
      if (txt.trim()) parts.push({ type: 'text', value: txt });
    }
    parts.push({ type: 'code', lang: (match[1] || 'text').toLowerCase(), value: match[2].trimEnd() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < raw.length) {
    const txt = raw.slice(lastIndex);
    if (txt.trim()) parts.push({ type: 'text', value: txt });
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: raw }];
}

// ── Language color badges ──────────────────────────────────────────────────────
const LANG_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  html:       { bg: 'bg-orange-500/20', text: 'text-orange-300', label: 'HTML' },
  css:        { bg: 'bg-blue-500/20',   text: 'text-blue-300',   label: 'CSS' },
  javascript: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', label: 'JavaScript' },
  js:         { bg: 'bg-yellow-500/20', text: 'text-yellow-300', label: 'JavaScript' },
  typescript: { bg: 'bg-blue-400/20',   text: 'text-blue-200',   label: 'TypeScript' },
  ts:         { bg: 'bg-blue-400/20',   text: 'text-blue-200',   label: 'TypeScript' },
  python:     { bg: 'bg-green-500/20',  text: 'text-green-300',  label: 'Python' },
  py:         { bg: 'bg-green-500/20',  text: 'text-green-300',  label: 'Python' },
  sql:        { bg: 'bg-teal-500/20',   text: 'text-teal-300',   label: 'SQL' },
  bash:       { bg: 'bg-slate-500/20',  text: 'text-slate-300',  label: 'Bash' },
  sh:         { bg: 'bg-slate-500/20',  text: 'text-slate-300',  label: 'Shell' },
  json:       { bg: 'bg-amber-500/20',  text: 'text-amber-300',  label: 'JSON' },
  xml:        { bg: 'bg-pink-500/20',   text: 'text-pink-300',   label: 'XML' },
  php:        { bg: 'bg-violet-500/20', text: 'text-violet-300', label: 'PHP' },
};

// ── HTML Code Block with live preview ─────────────────────────────────────────
function HtmlCodeBlock({ code }: { code: string }) {
  const [tab, setTab] = useState<'code' | 'preview'>('code');
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const iframeSrc = `data:text/html;charset=utf-8,${encodeURIComponent(
    code.includes('<html') ? code : `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:system-ui,sans-serif;margin:16px;background:#fff;color:#111}</style></head><body>${code}</body></html>`
  )}`;

  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0a0d14] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500/70" />
          <span className="w-2 h-2 rounded-full bg-yellow-500/70" />
          <span className="w-2 h-2 rounded-full bg-green-500/70" />
          <span className="ml-2 text-[10px] font-semibold text-orange-300 bg-orange-500/15 px-2 py-0.5 rounded-full">HTML</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Tab switcher */}
          <div className="flex bg-white/[0.05] rounded-lg p-0.5">
            <button
              onClick={() => setTab('code')}
              className={cn("flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all", tab === 'code' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300")}>
              <Code2 className="w-2.5 h-2.5" />Code
            </button>
            <button
              onClick={() => setTab('preview')}
              className={cn("flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all", tab === 'preview' ? "bg-orange-500/20 text-orange-300" : "text-slate-500 hover:text-slate-300")}>
              <Eye className="w-2.5 h-2.5" />Aperçu
            </button>
          </div>
          <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-white/10 transition text-slate-400">
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setCollapsed(v => !v)} className="p-1.5 rounded-lg hover:bg-white/10 transition text-slate-400">
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        tab === 'code' ? (
          <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-slate-200 font-mono max-h-80 scrollbar-thin scrollbar-thumb-white/10">
            <code>{code}</code>
          </pre>
        ) : (
          <div className="relative bg-white rounded-none" style={{ height: '320px' }}>
            <iframe
              src={iframeSrc}
              sandbox="allow-scripts allow-same-origin"
              title="Aperçu HTML"
              className="w-full h-full border-0"
              style={{ colorScheme: 'normal' }}
            />
            <div className="absolute bottom-2 right-2 text-[8px] text-slate-400 bg-black/70 px-2 py-0.5 rounded-full pointer-events-none">
              Rendu HTML live
            </div>
          </div>
        )
      )}
    </div>
  );
}

// ── Generic Code Block ──────────────────────────────────────────────────────────
function GenericCodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const cfg = LANG_COLORS[lang] || { bg: 'bg-slate-500/20', text: 'text-slate-300', label: lang.toUpperCase() || 'CODE' };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0a0d14] shadow-lg">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500/70" />
          <span className="w-2 h-2 rounded-full bg-yellow-500/70" />
          <span className="w-2 h-2 rounded-full bg-green-500/70" />
          <span className={cn("ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full", cfg.bg, cfg.text)}>{cfg.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-white/10 transition text-slate-400">
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setCollapsed(v => !v)} className="p-1.5 rounded-lg hover:bg-white/10 transition text-slate-400">
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      {!collapsed && (
        <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-slate-200 font-mono max-h-64 scrollbar-thin scrollbar-thumb-white/10">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

// ── Text Block with inline code detection ─────────────────────────────────────
function TextBlockRenderer({ value }: { value: string }) {
  const segments = parseTextSegments(value);

  if (segments.length === 1 && segments[0].type === 'text') {
    return (
      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
        {value}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return seg.value.trim() ? (
            <p key={idx} className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">{seg.value}</p>
          ) : null;
        }
        if (seg.type === 'code') {
          return seg.lang === 'html'
            ? <HtmlCodeBlock key={idx} code={seg.value} />
            : <GenericCodeBlock key={idx} lang={seg.lang} code={seg.value} />;
        }
        return null;
      })}
    </div>
  );
}

function parseBlocks(raw: string | null | undefined): ContentBlock[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as ContentBlock[];
  } catch {}
  return [{ type: 'text', value: raw }];
}

export function RichContentRenderer({ content, className, truncateAt, onAudioDownload }: RichContentRendererProps) {
  const blocks = parseBlocks(content);
  const [downloading, setDownloading] = useState<number | null>(null);
  if (blocks.length === 0) return null;

  // ── Compact preview mode ──
  if (truncateAt) {
    const allText = blocks
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; value: string }).value)
      .join(' ')
      .trim();
    const hasImages = blocks.some(b => b.type === 'image');
    const hasAudio = blocks.some(b => b.type === 'audio');
    const hasCode = allText.includes('```');
    const preview = allText.replace(/```[\s\S]*?```/g, '[code]').trim();
    const truncated = preview.length > truncateAt ? preview.slice(0, truncateAt) + '…' : preview;
    return (
      <p className={cn('text-xs text-slate-400 leading-relaxed', className)}>
        {truncated}
        {hasImages && <span className="ml-1 text-amber-400">📷</span>}
        {hasAudio  && <span className="ml-1 text-violet-400">🎙️</span>}
        {hasCode   && <span className="ml-1 text-orange-400">{'</>'}</span>}
      </p>
    );
  }

  // ── Full render ──
  return (
    <div className={cn('space-y-4', className)}>
      {blocks.map((block, i) => {
        if (block.type === 'text') {
          if (!block.value.trim()) return null;
          return <TextBlockRenderer key={i} value={block.value} />;
        }

        if (block.type === 'image') {
          return (
            <figure key={i} className="rounded-xl overflow-hidden border border-white/10 mx-auto">
              <img
                src={block.url}
                alt={block.caption || ''}
                className="w-full max-h-96 object-contain mx-auto block bg-black/20"
                loading="lazy"
              />
              {block.caption && (
                <figcaption className="text-center text-[11px] text-slate-500 py-2 px-3 bg-black/20 italic">
                  {block.caption}
                </figcaption>
              )}
            </figure>
          );
        }

        if (block.type === 'audio') {
          return (
            <div key={i}>
              {onAudioDownload && block.sky_cost && (
                <p className="text-[10px] text-violet-400 mb-1 flex items-center gap-1">
                  <Download className="w-3 h-3" /> Téléchargement = {block.sky_cost} Sky Points
                </p>
              )}
              <AudioPlayerInline
                url={block.url}
                caption={block.caption}
                showDownload={!!onAudioDownload}
                downloading={downloading === i}
                onDownload={onAudioDownload ? async () => {
                  setDownloading(i);
                  const ok = await onAudioDownload(block as ContentBlock & { type: 'audio' });
                  if (ok) {
                    const a = document.createElement('a');
                    a.href = block.url; a.download = `note-vocale-${i + 1}.webm`; a.click();
                  }
                  setDownloading(null);
                } : undefined}
              />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
