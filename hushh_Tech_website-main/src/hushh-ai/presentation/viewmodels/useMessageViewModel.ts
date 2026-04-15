/**
 * Message ViewModel
 * Manages message state and AI streaming
 */
import { useState, useCallback, useRef } from 'react';
import { Message } from '../../domain/entities';
import {
  GetMessagesUseCase,
  SendMessageUseCase,
  SaveAIResponseUseCase,
  UploadMediaUseCase,
  HandleCalendarRequestUseCase,
} from '../../domain/usecases';
import { useOptimisticUpdate } from '../hooks';
import { logger, validateMessage, isCalendarIntent, getUserGoogleToken } from '../../core/utils';
import { HushhAIError } from '../../core/errors';

export interface MessageState {
  isTyping: boolean;
  isSending: boolean;
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
}

export function useMessageViewModel(
  getMessagesUseCase: GetMessagesUseCase,
  sendMessageUseCase: SendMessageUseCase,
  saveAIResponseUseCase: SaveAIResponseUseCase,
  uploadMediaUseCase: UploadMediaUseCase,
  handleCalendarRequestUseCase: HandleCalendarRequestUseCase,
  userId: string | null
) {
  const [state, setState] = useState<MessageState>({
    isTyping: false,
    isSending: false,
    isStreaming: false,
    streamingContent: '',
    error: null,
  });

  const {
    items: messages,
    addOptimistic,
    setItems,
  } = useOptimisticUpdate<Message>();

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load messages for a chat
  const loadMessages = useCallback(
    async (chatId: string) => {
      try {
        const messageList = await getMessagesUseCase.execute(chatId);
        setItems(messageList);
        logger.info(`Loaded ${messageList.length} messages for chat ${chatId}`);
      } catch (err) {
        logger.error('Failed to load messages', err as Error);
        setState((prev) => ({ ...prev, error: 'Failed to load messages' }));
      }
    },
    [getMessagesUseCase, setItems]
  );

  // Handle calendar-specific messages
  const handleCalendarMessage = useCallback(
    async (chatId: string, content: string, mediaUrls: string[]) => {
      try {
        // Create optimistic user message
        const optimisticMessage = new Message(
          `temp-${Date.now()}`,
          chatId,
          'user',
          content,
          mediaUrls,
          new Date()
        );

        // Add optimistically
        await addOptimistic(
          optimisticMessage,
          async () => {
            // Get Google OAuth token
            const googleToken = await getUserGoogleToken();

            if (!googleToken) {
              // No token - user needs to re-authenticate with calendar scopes
              setState((prev) => ({
                ...prev,
                error: 'Calendar access not granted. Please sign in again to enable calendar features.',
                isSending: false,
              }));

              // Save message to show the error state
              const userMessage = await sendMessageUseCase.execute(
                chatId,
                content,
                userId!,
                mediaUrls
              );

              return userMessage.userMessage;
            }

            // Process calendar request
            const calendarResult = await handleCalendarRequestUseCase.execute(
              content,
              googleToken
            );

            // Save user message first
            const userMessage = await sendMessageUseCase.execute(
              chatId,
              content,
              userId!,
              mediaUrls
            );

            // Save AI response with calendar event metadata (if event was created)
            await saveAIResponseUseCase.execute(
              chatId,
              calendarResult.response,
              calendarResult.calendarEvent
                ? { calendarEvent: calendarResult.calendarEvent }
                : undefined
            );

            // Clear state
            setState((prev) => ({
              ...prev,
              isSending: false,
            }));

            // Reload messages
            await loadMessages(chatId);

            return userMessage.userMessage;
          },
          (serverMessage) => {
            logger.info(`Sent calendar message ${serverMessage.id}`);
          },
          (err) => {
            logger.error('Failed to send calendar message', err);
            const errorMessage =
              err instanceof HushhAIError ? err.userMessage : 'Failed to process calendar request';
            setState((prev) => ({
              ...prev,
              error: errorMessage,
              isSending: false,
            }));
          }
        );
      } catch (err) {
        logger.error('Error in handleCalendarMessage', err as Error);
        setState((prev) => ({
          ...prev,
          error: 'Failed to process calendar request',
          isSending: false,
        }));
      }
    },
    [
      userId,
      handleCalendarRequestUseCase,
      sendMessageUseCase,
      saveAIResponseUseCase,
      addOptimistic,
      loadMessages,
    ]
  );

  // Send message and stream AI response
  const sendMessage = useCallback(
    async (chatId: string, content: string, mediaFiles: File[] = []) => {
      if (!userId) return;

      // Clear previous errors
      setState((prev) => ({ ...prev, error: null, isSending: true }));

      try {
        // Validate message
        validateMessage(content);

        // Check if this is a calendar-related message
        const hasCalendarIntent = isCalendarIntent(content);
        logger.info(`Calendar intent detected: ${hasCalendarIntent}`);

        // Upload media files
        const mediaUrls: string[] = [];
        for (const file of mediaFiles) {
          try {
            const url = await uploadMediaUseCase.execute(file, userId, true);
            mediaUrls.push(url);
            logger.info(`Uploaded media: ${url}`);
          } catch (err) {
            logger.error('Failed to upload media', err as Error);
            throw new Error('Failed to upload media file');
          }
        }

        // If calendar intent detected, handle it specially
        if (hasCalendarIntent) {
          return await handleCalendarMessage(chatId, content, mediaUrls);
        }

        // Create optimistic user message
        const optimisticMessage = new Message(
          `temp-${Date.now()}`,
          chatId,
          'user',
          content,
          mediaUrls,
          new Date()
        );

        // Add optimistically
        await addOptimistic(
          optimisticMessage,
          async () => {
            // Send message and get stream
            const result = await sendMessageUseCase.execute(
              chatId,
              content,
              userId,
              mediaUrls
            );

            // Start streaming AI response
            setState((prev) => ({ ...prev, isStreaming: true, streamingContent: '' }));

            const reader = result.aiResponseStream.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              fullContent += chunk;

              setState((prev) => ({ ...prev, streamingContent: fullContent }));
            }

            // Save AI response to database
            await saveAIResponseUseCase.execute(chatId, fullContent);

            // Clear streaming state
            setState((prev) => ({
              ...prev,
              isStreaming: false,
              streamingContent: '',
              isSending: false,
            }));

            // Reload messages to get the AI response
            await loadMessages(chatId);

            return result.userMessage;
          },
          (serverMessage) => {
            logger.info(`Sent message ${serverMessage.id}`);
          },
          (err) => {
            logger.error('Failed to send message', err);
            const errorMessage =
              err instanceof HushhAIError ? err.userMessage : 'Failed to send message';
            setState((prev) => ({
              ...prev,
              error: errorMessage,
              isSending: false,
              isStreaming: false,
              streamingContent: '',
            }));
          }
        );
      } catch (err) {
        logger.error('Error in sendMessage', err as Error);
        const errorMessage =
          err instanceof HushhAIError
            ? err.userMessage
            : (err as Error).message || 'Failed to send message';

        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isSending: false,
          isStreaming: false,
          streamingContent: '',
        }));
      }
    },
    [
      userId,
      sendMessageUseCase,
      saveAIResponseUseCase,
      uploadMediaUseCase,
      addOptimistic,
      loadMessages,
    ]
  );

  // Cancel ongoing stream
  const cancelStream = useCallback(() => {
    sendMessageUseCase.cancel();
    setState((prev) => ({
      ...prev,
      isStreaming: false,
      streamingContent: '',
      isSending: false,
    }));
    logger.info('AI stream cancelled');
  }, [sendMessageUseCase]);

  return {
    messages,
    state,
    loadMessages,
    sendMessage,
    cancelStream,
  };
}
