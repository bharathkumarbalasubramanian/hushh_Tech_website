/**
 * Message Repository Interface
 * Defines the contract for message data operations
 */
import { Message, MessageRole, MessageMetadata } from '../entities';

export interface IMessageRepository {
  /**
   * Get all messages for a chat
   */
  getAll(chatId: string, limit?: number): Promise<Message[]>;

  /**
   * Get a single message by ID
   */
  getById(messageId: string): Promise<Message | null>;

  /**
   * Add a new message to a chat
   */
  add(
    chatId: string,
    role: MessageRole,
    content: string,
    mediaUrls?: string[],
    metadata?: MessageMetadata
  ): Promise<Message>;

  /**
   * Delete a message
   */
  delete(messageId: string): Promise<boolean>;

  /**
   * Search messages within a chat
   */
  search(chatId: string, query: string): Promise<Message[]>;
}
