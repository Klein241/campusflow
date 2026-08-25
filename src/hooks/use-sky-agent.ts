'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
    thinking?: string;
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
    const [externalAgentActive, setExternalAgentActive] = useState(false);
    const [persona, setPersona] = useState('Dame SKY');
    const [isChatActive, setIsChatActive] = useState(true);
    const [allowedRoles, setAllowedRoles] = useState<string[]>(['admin', 'prof', 'student']);
    const sessionIdRef = useRef<string>(generateSessionId());

    // Charger la configuration globale Dame SKY (activation/désactivation SuperAdmin)
    useEffect(() => {
        let isMounted = true;

        async function fetchConfig() {
            try {
                const { data } = await supabase
                    .from('dame_sky_config')
                    .select('is_active, allowed_roles')
                    .limit(1)
                    .maybeSingle();

                if (data && isMounted) {
                    if (typeof data.is_active === 'boolean') {
                        setIsChatActive(data.is_active);
                    }
                    if (Array.isArray(data.allowed_roles) && data.allowed_roles.length > 0) {
                        setAllowedRoles(data.allowed_roles);
                    }
                }
            } catch (e) {
                console.warn('[useSkyAgent] Error fetching dame_sky_config:', e);
            }
        }

        fetchConfig();

        // Écouter les changements en temps réel
        const channel = supabase
            .channel('dame_sky_config_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dame_sky_config' }, (payload: any) => {
                if (payload.new && typeof payload.new.is_active === 'boolean') {
                    setIsChatActive(payload.new.is_active);
                }
                if (payload.new && Array.isArray(payload.new.allowed_roles)) {
                    setAllowedRoles(payload.new.allowed_roles);
                }
            })
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, []);

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

            let replyContent = data.reply || '';
            let thinkingContent = data.thinking || undefined;

            // Extraire les balises <think>...</think> si le modèle renvoie du raisonnement DeepSeek/Claude
            if (typeof replyContent === 'string' && replyContent.includes('<think>') && replyContent.includes('</think>')) {
                const match = replyContent.match(/<think>([\s\S]*?)<\/think>/);
                if (match) {
                    thinkingContent = match[1].trim();
                    replyContent = replyContent.replace(/<think>[\s\S]*?<\/think>/, '').trim();
                }
            }

            const assistantMsg: SkyMessage = {
                id: `a_${Date.now()}`,
                role: 'assistant',
                content: replyContent,
                thinking: thinkingContent,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, assistantMsg]);

            // Mettre à jour le statut de l'agent externe si la réponse l'indique
            if (data.external_agent_active !== undefined) {
                setExternalAgentActive(data.external_agent_active);
            }
            if (data.persona) {
                setPersona(data.persona);
            }
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
        setExternalAgentActive(false);
        setPersona('Dame SKY');
        sessionIdRef.current = generateSessionId();
    }, []);

    const openChat = useCallback(() => setIsOpen(true), []);
    const closeChat = useCallback(() => setIsOpen(false), []);
    const toggleChat = useCallback(() => setIsOpen(p => !p), []);

    const isRoleAllowed = allowedRoles.length === 0 || allowedRoles.includes(role);

    return {
        messages,
        isLoading,
        isOpen,
        error,
        externalAgentActive,
        persona,
        isChatActive,
        isRoleAllowed,
        sendMessage,
        clearSession,
        openChat,
        closeChat,
        toggleChat,
        sessionId: sessionIdRef.current,
    };
}
