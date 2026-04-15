/**
 * Send Message Use Case
 * Sends a user message and gets AI response
 */
import { IMessageRepository, IAIRepository } from '../../repositories';
import { Message } from '../../entities';
import { logger, validateMessage } from '../../../core/utils';

export interface SendMessageResult {
  userMessage: Message;
  aiResponseStream: ReadableStream<Uint8Array>;
}

export class SendMessageUseCase {
  constructor(
    private messageRepository: IMessageRepository,
    private aiRepository: IAIRepository
  ) {}

  async execute(
    chatId: string,
    content: string,
    userId?: string,
    mediaUrls?: string[]
  ): Promise<SendMessageResult> {
    try {
      // Validate message
      validateMessage(content);

      logger.debug(`Sending message to chat ${chatId}`);

      // Save user message
      const userMessage = await this.messageRepository.add(
        chatId,
        'user',
        content,
        mediaUrls
      );

      logger.info(`Saved user message ${userMessage.id} to chat ${chatId}`);

      // Get chat history (last 10 messages for context)
      const history = await this.messageRepository.getAll(chatId, 10);
      const aiHistory = history.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Get AI response stream
      const aiResponseStream = await this.aiRepository.streamResponse(
        content,
        chatId,
        userId,
        mediaUrls,
        aiHistory
      );

      return {
        userMessage,
        aiResponseStream,
      };
    } catch (error) {
      logger.error('Error in SendMessageUseCase', error as Error);
      throw error;
    }
  }

  cancel(): void {
    this.aiRepository.cancelStream();
  }
}
