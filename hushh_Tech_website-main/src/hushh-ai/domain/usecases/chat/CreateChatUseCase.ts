/**
 * Create Chat Use Case
 * Creates a new chat for a user
 */
import { IChatRepository } from '../../repositories';
import { Chat } from '../../entities';
import { logger } from '../../../core/utils';

export class CreateChatUseCase {
  constructor(private chatRepository: IChatRepository) {}

  async execute(userId: string, title?: string): Promise<Chat> {
    try {
      logger.debug(`Creating chat for user ${userId} with title: ${title || 'New Chat'}`);
      const chat = await this.chatRepository.create(userId, title);
      logger.info(`Created chat ${chat.id} for user ${userId}`);
      return chat;
    } catch (error) {
      logger.error('Error in CreateChatUseCase', error as Error);
      throw error;
    }
  }
}
