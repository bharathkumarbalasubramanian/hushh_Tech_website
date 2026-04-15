/**
 * Supabase Chat Data Source
 * Handles all Supabase operations for chats
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { ChatDTO } from '../models/ChatDTO';
import { NetworkError } from '../../core/errors';
import { logger } from '../../core/utils';

export class SupabaseChatDataSource {
  constructor(private supabase: SupabaseClient) {}

  async getAll(userId: string, limit: number = 100): Promise<ChatDTO[]> {
    try {
      const { data, error } = await this.supabase
        .from('hushh_ai_chats')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Error fetching chats', error);
        throw new NetworkError(`Failed to fetch chats: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      logger.error('Unexpected error fetching chats', error as Error);
      throw new NetworkError('Failed to fetch chats');
    }
  }

  async getById(chatId: string): Promise<ChatDTO | null> {
    try {
      const { data, error } = await this.supabase
        .from('hushh_ai_chats')
        .select('*')
        .eq('id', chatId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        logger.error('Error fetching chat', error);
        throw new NetworkError(`Failed to fetch chat: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      logger.error('Unexpected error fetching chat', error as Error);
      throw new NetworkError('Failed to fetch chat');
    }
  }

  async create(userId: string, title: string = 'New Chat'): Promise<ChatDTO> {
    try {
      const { data, error } = await this.supabase
        .from('hushh_ai_chats')
        .insert({
          user_id: userId,
          title,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating chat', error);
        throw new NetworkError(`Failed to create chat: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      logger.error('Unexpected error creating chat', error as Error);
      throw new NetworkError('Failed to create chat');
    }
  }

  async updateTitle(chatId: string, title: string): Promise<ChatDTO | null> {
    try {
      const { data, error } = await this.supabase
        .from('hushh_ai_chats')
        .update({ title })
        .eq('id', chatId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating chat title', error);
        throw new NetworkError(`Failed to update chat title: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      logger.error('Unexpected error updating chat title', error as Error);
      throw new NetworkError('Failed to update chat title');
    }
  }

  async delete(chatId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('hushh_ai_chats')
        .delete()
        .eq('id', chatId);

      if (error) {
        logger.error('Error deleting chat', error);
        throw new NetworkError(`Failed to delete chat: ${error.message}`);
      }

      return true;
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      logger.error('Unexpected error deleting chat', error as Error);
      return false;
    }
  }
}
