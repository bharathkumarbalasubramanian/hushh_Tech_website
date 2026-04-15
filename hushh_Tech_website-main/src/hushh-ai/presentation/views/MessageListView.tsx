/**
 * Message List View Component - MOBILE FIRST
 * Displays the list of messages in a chat
 * Optimized for mobile with better padding and spacing
 */
import React, { useRef, useEffect } from 'react';
import { VStack, Box, Text, Spinner, HStack } from '@chakra-ui/react';
import { Message } from '../../domain/entities';
import { MessageBubble } from './MessageBubble';
import { THEME, BRANDING } from '../../core/constants';

interface MessageListViewProps {
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  isSending: boolean;
  error: string | null;
  currentChatId: string | null;
}

export const MessageListView: React.FC<MessageListViewProps> = ({
  messages,
  streamingContent,
  isStreaming,
  isSending,
  error,
  currentChatId,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  return (
    <VStack
      flex={1}
      px={{ base: 3, sm: 4, md: 6 }} // Mobile: 12px, Tablet: 16px, Desktop: 24px
      py={{ base: 4, md: 6 }}
      spacing={{ base: 4, md: 6 }}
      overflowY="auto"
      overflowX="hidden"
      align="stretch"
      css={{
        '&::-webkit-scrollbar': { width: '4px' },
        '&::-webkit-scrollbar-thumb': {
          background: THEME.colors.border,
          borderRadius: '3px',
        },
        // Better momentum scrolling on iOS
        '-webkit-overflow-scrolling': 'touch',
      }}
    >
      {/* Empty state */}
      {messages.length === 0 && !currentChatId && (
        <VStack flex={1} justify="center" spacing={{ base: 3, md: 4 }} py={8}>
          <Box
            w={{ base: 14, md: 16 }}
            h={{ base: 14, md: 16 }}
            borderRadius="full"
            bg={THEME.colors.accent}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={{ base: 'xl', md: '2xl' }} color="white" fontWeight="bold">
              H
            </Text>
          </Box>
          <Text
            fontSize={{ base: THEME.fontSizes.lg, md: THEME.fontSizes.xl }}
            fontWeight={THEME.fontWeights.semibold}
            color={THEME.colors.textPrimary}
            textAlign="center"
            px={4}
          >
            {BRANDING.messages.welcome}
          </Text>
          <Text
            fontSize={{ base: THEME.fontSizes.sm, md: THEME.fontSizes.md }}
            color={THEME.colors.textSecondary}
            textAlign="center"
            px={4}
          >
            Start a conversation by typing a message below
          </Text>
        </VStack>
      )}

      {/* Messages */}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {/* Streaming Response */}
      {isStreaming && streamingContent && (
        <MessageBubble
          message={
            new Message(
              'streaming',
              currentChatId || '',
              'assistant',
              streamingContent,
              [],
              new Date()
            )
          }
          isStreaming
        />
      )}

      {/* Thinking Indicator - Mobile optimized */}
      {isSending && !streamingContent && (
        <HStack spacing={2} p={{ base: 3, md: 4 }}>
          <Spinner size="sm" color={THEME.colors.accent} />
          <Text color={THEME.colors.textSecondary} fontSize={{ base: 'xs', md: THEME.fontSizes.sm }}>
            {BRANDING.messages.thinking}
          </Text>
        </HStack>
      )}

      {/* Error Message - Mobile optimized */}
      {error && (
        <Box
          p={{ base: 3, md: 4 }}
          bg="red.50"
          borderRadius={THEME.borderRadius.md}
          border="1px solid"
          borderColor="red.200"
        >
          <Text color="red.600" fontSize={{ base: 'xs', md: THEME.fontSizes.sm }}>
            {error}
          </Text>
        </Box>
      )}

      {/* Spacer for bottom padding */}
      <div ref={messagesEndRef} />
    </VStack>
  );
};
