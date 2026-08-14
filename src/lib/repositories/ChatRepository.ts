/**
 * ChatRepository.ts
 * Wrappeur des RPCs securisees chat (migration 032).
 */

import { supabase } from '@/lib/supabase';
import { SessionManager } from '@/lib/session';
import { DataProvider } from '@/lib/data-provider';

export interface ChatMessage {
    id: string;
    created_at: string;
    conversation_id: string;
    sender_id: string;
    sender_type: 'student' | 'teacher';
    content: string;
    message_type: string;
    file_url?: string;
    is_deleted: boolean;
}

export interface ChatConversation {
    id: string;
    created_at: string;
    organization_id: string;
    type: 'direct' | 'group';
    name?: string;
    last_message_at?: string;
}

export const ChatRepository = {

    /** Lire les messages d une conversation */
    async getMessages(conversationId: string, limit = 50): Promise<ChatMessage[]> {
        const session = SessionManager.get();
        if (!session) throw new Error('Session required');

        const { data, error } = await supabase.rpc('get_chat_messages', {
            p_token: session.session_token,
            p_conversation_id: conversationId,
            p_limit: limit,
        });
        if (error) throw error;
        return (data as ChatMessage[]) ?? [];
    },

    /** Envoyer un message */
    async send(conversationId: string, content: string): Promise<ChatMessage> {
        const session = SessionManager.get();
        if (!session) throw new Error('Session required');

        const { data, error } = await supabase.rpc('send_chat_message', {
            p_token: session.session_token,
            p_conversation_id: conversationId,
            p_content: content,
        });
        if (error) throw error;
        return data as ChatMessage;
    },

    /** Supprimer un message (auteur seulement) */
    async delete(messageId: string): Promise<boolean> {
        const session = SessionManager.get();
        if (!session) throw new Error('Session required');

        const { data, error } = await supabase.rpc('delete_chat_message', {
            p_token: session.session_token,
            p_message_id: messageId,
        });
        if (error) throw error;
        return !!data;
    },

    /** Lire les conversations de l utilisateur */
    async getConversations(): Promise<ChatConversation[]> {
        const session = SessionManager.get();
        if (!session) throw new Error('Session required');

        const { data, error } = await supabase.rpc('get_conversations', {
            p_token: session.session_token,
        });
        if (error) throw error;
        return (data as ChatConversation[]) ?? [];
    },
};
