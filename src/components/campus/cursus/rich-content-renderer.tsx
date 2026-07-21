'use client';
import { cn } from '@/lib/utils';
import type { ContentBlock } from './rich-content-editor';

// ═══════════════════════════════════════════════════════
// RICH CONTENT RENDERER — Read-only display of blocks
// ═══════════════════════════════════════════════════════

interface RichContentRendererProps {
  content: string | null | undefined;
  className?: string;
  /** If provided, shows a compact preview with max N chars of text */
  truncateAt?: number;
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
    const preview = allText.length > truncateAt ? allText.slice(0, truncateAt) + '…' : allText;
    return (
      <p className={cn('text-xs text-slate-400 leading-relaxed', className)}>
        {preview}
        {hasImages && <span className="ml-1 text-amber-400">📷</span>}
      </p>
    );
  }

  // ── Full render ──
  return (
    <div className={cn('space-y-4', className)}>
      {blocks.map((block, i) => {
        if (block.type === 'text') {
          if (!block.value.trim()) return null;
          return (
            <p key={i} className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
              {block.value}
            </p>
          );
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
