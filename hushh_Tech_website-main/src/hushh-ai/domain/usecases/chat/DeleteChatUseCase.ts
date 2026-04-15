/**
 * Delete Chat Use Case
 * Deletes a chat
 */
import { IChatRepository } from '../../repositories';
import { logger } from '../../../core/utils';

export class DeleteChatUseCase {
  constructor(private chatRepository: IChatRepository) {}

  async execute(chatId: string): Promise<boolean> {
    try {
      logger.debug(`Deleting chat ${chatId}`);
      const success = await this.chatRepository.delete(chatId);
      if (success) {
        logger.info(`Deleted chat ${chatId}`);
      }
      return success;
    } catch (error) {
      logger.error('Error in DeleteChatUseCase', error as Error);
      throw error;
    }
  }
}
