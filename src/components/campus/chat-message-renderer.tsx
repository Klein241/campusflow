'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Copy, Check, Eye, Code2, ChevronDown, ChevronUp, Play, ExternalLink } from 'lucide-react';

interface ChatMessageRendererProps {
    content: string;
    isMe?: boolean;
}

// ── Code & HTML Detection ──────────────────────────────────────────────────
function isCodeContent(text: string): boolean {
    if (!text) return false;
    const trimmed = text.trim();
    // Check code fences
    if (trimmed.includes('```')) return true;
    // Check HTML documents or tags
    if (/<!DOCTYPE\s+html/i.test(trimmed)) return true;
    if (/<html[\s>]/i.test(trimmed)) return true;
    if (/<(head|body|script|style|canvas|table|div|section)\b/i.test(trimmed) && /<\/(head|body|script|style|canvas|table|div|section)>/i.test(trimmed)) return true;
    return false;
}

function parseCodeBlocks(text: string): { type: 'text' | 'code'; lang?: string; value: string }[] {
    const parts: { type: 'text' | 'code'; lang?: string; value: string }[] = [];
    const fenceRegex = /```(\w*)\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = fenceRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            const preText = text.slice(lastIndex, match.index);
            if (preText.trim()) parts.push({ type: 'text', value: preText });
        }
        parts.push({
            type: 'code',
            lang: (match[1] || 'html').toLowerCase(),
            value: match[2].trimEnd(),
        });
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        const remaining = text.slice(lastIndex);
        if (remaining.trim()) parts.push({ type: 'text', value: remaining });
    }

    if (parts.length === 0 && text.trim()) {
        // Raw code without fences (e.g. full <!DOCTYPE html>...)
        const isRawHtml = /<!DOCTYPE\s+html/i.test(text) || /<html[\s>]/i.test(text);
        if (isRawHtml) {
            return [{ type: 'code', lang: 'html', value: text.trim() }];
        }
        return [{ type: 'text', value: text }];
    }

    return parts;
}

// ── Interactive Code Block for Chat ───────────────────────────────────────
function ChatCodeBlock({ lang, code, isMe }: { lang: string; code: string; isMe?: boolean }) {
    const [tab, setTab] = useState<'code' | 'preview'>('code');
    const [copied, setCopied] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    const isHtml = lang === 'html' || /<!DOCTYPE\s+html/i.test(code) || /<html[\s>]/i.test(code) || /<body[\s>]/i.test(code);

    const iframeSrc = isHtml ? `data:text/html;charset=utf-8,${encodeURIComponent(
        code.includes('<html') ? code :
        `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:system-ui,sans-serif;margin:16px;background:#fff;color:#111;}</style></head><body>${code}</body></html>`
    )}` : '';

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    return (
        <div className="rounded-xl overflow-hidden border border-white/15 bg-[#090C15] shadow-2xl my-1.5 min-w-[260px] max-w-full text-left">
            {/* Header bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-white/[0.04] border-b border-white/10 select-none">
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                        {isHtml ? '🌐 Code HTML' : lang.toUpperCase() || 'CODE'}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    {isHtml && (
                        <div className="flex bg-white/10 rounded-lg p-0.5">
                            <button
                                type="button"
                                onClick={() => setTab('code')}
                                className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all',
                                    tab === 'code' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                                )}
                            >
                                <Code2 className="w-3 h-3" /> Code
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab('preview')}
                                className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all',
                                    tab === 'preview' ? 'bg-emerald-500 text-black shadow' : 'text-slate-400 hover:text-white'
                                )}
                            >
                                <Play className="w-3 h-3 fill-current" /> Émulateur
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleCopy}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 text-[10px] font-medium transition-all"
                        title="Copier le code"
                    >
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copied ? 'Copié !' : 'Copier'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setCollapsed(v => !v)}
                        className="p-1 rounded-lg hover:bg-white/10 text-slate-400"
                    >
                        {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>

            {/* Code / Preview Body */}
            {!collapsed && (
                isHtml && tab === 'preview' ? (
                    <div className="bg-white relative" style={{ height: '320px' }}>
                        <iframe
                            src={iframeSrc}
                            sandbox="allow-scripts allow-same-origin"
                            title="Aperçu Émulateur HTML"
                            className="w-full h-full border-0"
                        />
                    </div>
                ) : (
                    <div className="relative">
                        <pre className="overflow-x-auto p-3 text-[11px] font-mono leading-relaxed text-emerald-300 bg-[#060810] max-h-72 select-all scrollbar-thin">
                            <code>{code}</code>
                        </pre>
                    </div>
                )
            )}
        </div>
    );
}

export function ChatMessageRenderer({ content, isMe }: ChatMessageRendererProps) {
    if (!content) return null;

    if (!isCodeContent(content)) {
        return <span className="whitespace-pre-wrap break-words">{content}</span>;
    }

    const blocks = parseCodeBlocks(content);

    return (
        <div className="space-y-1.5">
            {blocks.map((b, i) => {
                if (b.type === 'text') {
                    return (
                        <p key={i} className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {b.value}
                        </p>
                    );
                }
                return <ChatCodeBlock key={i} lang={b.lang || 'html'} code={b.value} isMe={isMe} />;
            })}
        </div>
    );
}
