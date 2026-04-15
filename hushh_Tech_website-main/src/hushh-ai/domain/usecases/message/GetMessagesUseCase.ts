/**
 * Get Messages Use Case
 * Retrieves all messages for a chat
 */
import { IMessageRepository } from '../../repositories';
import { Message } from '../../entities';
import { logger } from '../../../core/utils';

export class GetMessagesUseCase {
  constructor(private messageRepository: IMessageRepository) {}

  async execute(chatId: string, limit?: number): Promise<Message[]> {
    try {
      logger.debug(`Fetching messages for chat ${chatId}`);
      const messages = await this.messageRepository.getAll(chatId, limit);
      logger.info(`Fetched ${messages.length} messages for chat ${chatId}`);
      return messages;
    } catch (error) {
      logger.error('Error in GetMessagesUseCase', error as Error);
      throw error;
    }
  }
}
