/**
 * Message Mapper
 * Converts between DTO and Domain Entity
 */
import { Message, MessageMetadata } from '../../../domain/entities';
import { MessageDTO } from '../MessageDTO';

export function toDomain(dto: MessageDTO): Message {
  return new Message(
    dto.id,
    dto.chat_id,
    dto.role,
    dto.content,
    dto.media_urls || [],
    new Date(dto.created_at),
    dto.metadata as MessageMetadata | undefined
  );
}

export function toDTO(message: Message): MessageDTO {
  return {
    id: message.id,
    chat_id: message.chatId,
    role: message.role,
    content: message.content,
    media_urls: message.mediaUrls,
    metadata: message.metadata || null,
    created_at: message.createdAt.toISOString(),
  };
}
