/**
 * Chat ViewModel
 * Manages chat state and operations
 */
import { useState, useCallback } from 'react';
import { Chat } from '../../domain/entities';
import { GetChatsUseCase, CreateChatUseCase, DeleteChatUseCase } from '../../domain/usecases';
import { useOptimisticUpdate } from '../hooks';
import { logger } from '../../core/utils';

export function useChatViewModel(
  getChatsUseCase: GetChatsUseCase,
  createChatUseCase: CreateChatUseCase,
  deleteChatUseCase: DeleteChatUseCase,
  userId: string | null
) {
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    items: chats,
    addOptimistic,
    removeOptimistic,
    setItems,
  } = useOptimisticUpdate<Chat>();

  // Load all chats
  const loadChats = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const chatList = await getChatsUseCase.execute(userId);
      setItems(chatList);
      logger.info(`Loaded ${chatList.length} chats`);
    } catch (err) {
      logger.error('Failed to load chats', err as Error);
      setError('Failed to load chats');
    } finally {
      setIsLoading(false);
    }
  }, [userId, getChatsUseCase, setItems]);

  // Create new chat
  const createChat = useCallback(
    async (title?: string) => {
      if (!userId) return null;

      setError(null);

      // Create optimistic chat
      const optimisticChat = new Chat(
        `temp-${Date.now()}`,
        userId,
        title || 'New Chat',
        new Date(),
        new Date(),
        0
      );

      let createdChat: Chat | null = null;

      await addOptimistic(
        optimisticChat,
        async () => {
          createdChat = await createChatUseCase.execute(userId, title);
          return createdChat;
        },
        (serverChat) => {
          setCurrentChat(serverChat);
          logger.info(`Created chat ${serverChat.id}`);
        },
        (err) => {
          logger.error('Failed to create chat', err);
          setError('Failed to create chat');
        }
      );

      return createdChat;
    },
    [userId, createChatUseCase, addOptimistic]
  );

  // Delete chat
  const deleteChat = useCallback(
    async (chatId: string) => {
      setError(null);

      await removeOptimistic(
        chatId,
        async () => {
          return await deleteChatUseCase.execute(chatId);
        },
        () => {
          if (currentChat?.id === chatId) {
            setCurrentChat(null);
          }
          logger.info(`Deleted chat ${chatId}`);
        },
        (err) => {
          logger.error('Failed to delete chat', err);
          setError('Failed to delete chat');
        }
      );
    },
    [deleteChatUseCase, removeOptimistic, currentChat]
  );

  // Select chat
  const selectChat = useCallback((chat: Chat) => {
    setCurrentChat(chat);
    logger.debug(`Selected chat ${chat.id}`);
  }, []);

  return {
    chats,
    currentChat,
    isLoading,
    error,
    loadChats,
    createChat,
    deleteChat,
    selectChat,
  };
}
