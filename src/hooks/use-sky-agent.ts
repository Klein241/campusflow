'use client';

import { useState, useCallback, useRef } from 'react';

export type SkyAgentRole = 'admin' | 'prof' | 'student';

export interface SkyAttachment {
    name: string;
    url: string;
    type: string;
    size?: number;
}

export interface SkyMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    attachments?: SkyAttachment[];
    timestamp: Date;
}

export interface SkyAgentContext {
    user_name?: string;
    user_id?: string;
    user_email?: string;
    org_name?: string;
    org_id?: string;
    org_slug?: string;
    current_page?: string;
    stats?: Record<string, string | number>;
}

const WORKER_URL =
    process.env.NEXT_PUBLIC_NOTIFICATION_WORKER_URL ||
    process.env.NEXT_PUBLIC_WORKER_URL ||
    'https://campusflow-worker.kleintaptue1.workers.dev';

function generateSessionId(): string {
    return `damesky_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function useSkyAgent(role: SkyAgentRole, context?: SkyAgentContext) {
    const [messages, setMessages] = useState<SkyMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const sessionIdRef = useRef<string>(generateSessionId());

    const sendMessage = useCallback(async (userText: string, attachments?: SkyAttachment[]) => {
        if ((!userText.trim() && (!attachments || attachments.length === 0)) || isLoading) return;

        const userMsg: SkyMessage = {
            id: `u_${Date.now()}`,
            role: 'user',
            content: userText.trim(),
            attachments,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`${WORKER_URL}/api/sky-agent/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userText.trim(),
                    role,
                    session_id: sessionIdRef.current,
                    attachments,
                    context: {
                        ...context,
                        current_page: typeof window !== 'undefined' ? window.location.pathname : undefined,
                    },
                }),
            });

            const data = await res.json() as any;

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Erreur de connexion avec Dame SKY');
            }

            const assistantMsg: SkyMessage = {
                id: `a_${Date.now()}`,
                role: 'assistant',
                content: data.reply,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (err: any) {
            setError(err.message || 'Une erreur est survenue');
            const errMsg: SkyMessage = {
                id: `err_${Date.now()}`,
                role: 'assistant',
                content: '⚠️ Je rencontre une brève difficulté de liaison. Reformulez votre demande dans quelques instants. — Dame SKY',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setIsLoading(false);
        }
    }, [role, context, isLoading]);

    const clearSession = useCallback(async () => {
        try {
            await fetch(`${WORKER_URL}/api/sky-agent/session`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionIdRef.current }),
            });
        } catch { /* silent */ }
        setMessages([]);
        setError(null);
        sessionIdRef.current = generateSessionId();
    }, []);

    const openChat = useCallback(() => setIsOpen(true), []);
    const closeChat = useCallback(() => setIsOpen(false), []);
    const toggleChat = useCallback(() => setIsOpen(p => !p), []);

    return {
        messages,
        isLoading,
        isOpen,
        error,
        sendMessage,
        clearSession,
        openChat,
        closeChat,
        toggleChat,
        sessionId: sessionIdRef.current,
    };
}
