/**
 * User Mapper
 * Converts between DTO and Domain Entity
 */
import { User } from '../../../domain/entities';
import { UserDTO } from '../UserDTO';

export function toDomain(dto: UserDTO): User {
  return new User(
    dto.id,
    dto.supabase_user_id,
    dto.email,
    dto.display_name,
    dto.avatar_url,
    new Date(dto.created_at),
    new Date(dto.last_login_at),
    dto.total_messages,
    dto.total_chats,
    dto.is_active
  );
}

export function toDTO(user: User): UserDTO {
  return {
    id: user.id,
    supabase_user_id: user.supabaseUserId,
    email: user.email,
    display_name: user.displayName,
    avatar_url: user.avatarUrl,
    created_at: user.createdAt.toISOString(),
    last_login_at: user.lastLoginAt.toISOString(),
    total_messages: user.totalMessages,
    total_chats: user.totalChats,
    is_active: user.isActive,
  };
}
