/**
 * repositories/index.ts
 * Point d entree unique pour tous les repositories.
 * Usage : import { PostRepository, ChatRepository } from "@/lib/repositories";
 */

export { PostRepository } from './PostRepository';
export type { SchoolPost } from './PostRepository';

export { ChatRepository } from './ChatRepository';
export type { ChatMessage, ChatConversation } from './ChatRepository';
