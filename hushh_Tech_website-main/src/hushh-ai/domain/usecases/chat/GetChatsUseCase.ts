/**
 * Get Chats Use Case
 * Retrieves all chats for a user
 */
import { IChatRepository } from '../../repositories';
import { Chat } from '../../entities';
import { logger } from '../../../core/utils';

export class GetChatsUseCase {
  constructor(private chatRepository: IChatRepository) {}

  async execute(userId: string, limit?: number): Promise<Chat[]> {
    try {
      logger.debug(`Fetching chats for user ${userId}`);
      const chats = await this.chatRepository.getAll(userId, limit);
      logger.info(`Fetched ${chats.length} chats for user ${userId}`);
      return chats;
    } catch (error) {
      logger.error('Error in GetChatsUseCase', error as Error);
      throw error;
    }
  }
}
