'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Copy, Check, Eye, Code2, ChevronDown, ChevronUp } from 'lucide-react';
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

export function RichContentRenderer({ content, className, truncateAt }: RichContentRendererProps) {
  const blocks = parseBlocks(content);
  if (blocks.length === 0) return null;

  // ── Compact preview mode ──
  if (truncateAt) {
    const allText = blocks
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; value: string }).value)
      .join(' ')
      .trim();
    const hasImages = blocks.some(b => b.type === 'image');
    const hasCode = allText.includes('```');
    const preview = allText.replace(/```[\s\S]*?```/g, '[code]').trim();
    const truncated = preview.length > truncateAt ? preview.slice(0, truncateAt) + '…' : preview;
    return (
      <p className={cn('text-xs text-slate-400 leading-relaxed', className)}>
        {truncated}
        {hasImages && <span className="ml-1 text-amber-400">📷</span>}
        {hasCode && <span className="ml-1 text-orange-400">{'</>'}</span>}
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

        return null;
      })}
    </div>
  );
}
