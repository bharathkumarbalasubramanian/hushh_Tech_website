/**
 * Chat Repository Interface
 * Defines the contract for chat data operations
 */
import { Chat } from '../entities';

export interface IChatRepository {
  /**
   * Get all chats for a user
   */
  getAll(userId: string, limit?: number): Promise<Chat[]>;

  /**
   * Get a single chat by ID
   */
  getById(chatId: string): Promise<Chat | null>;

  /**
   * Create a new chat
   */
  create(userId: string, title?: string): Promise<Chat>;

  /**
   * Update chat title
   */
  updateTitle(chatId: string, title: string): Promise<Chat | null>;

  /**
   * Delete a chat
   */
  delete(chatId: string): Promise<boolean>;

  /**
   * Search chats by title
   */
  search(userId: string, query: string): Promise<Chat[]>;
}
