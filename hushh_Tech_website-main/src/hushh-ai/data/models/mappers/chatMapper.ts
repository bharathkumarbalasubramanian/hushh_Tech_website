/**
 * Chat Mapper
 * Converts between DTO and Domain Entity
 */
import { Chat } from '../../../domain/entities';
import { ChatDTO } from '../ChatDTO';

export function toDomain(dto: ChatDTO): Chat {
  return new Chat(
    dto.id,
    dto.user_id,
    dto.title,
    new Date(dto.created_at),
    new Date(dto.updated_at),
    dto.message_count
  );
}

export function toDTO(chat: Chat): ChatDTO {
  return {
    id: chat.id,
    user_id: chat.userId,
    title: chat.title,
    created_at: chat.createdAt.toISOString(),
    updated_at: chat.updatedAt.toISOString(),
    message_count: chat.messageCount,
  };
}
