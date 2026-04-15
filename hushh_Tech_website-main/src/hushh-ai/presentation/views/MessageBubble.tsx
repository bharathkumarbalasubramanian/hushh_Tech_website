/**
 * Message Bubble Component
 * Displays a single message (user or assistant)
 */
import React from 'react';
import { Flex, Box, VStack } from '@chakra-ui/react';
import { Message } from '../../domain/entities';
import { MessageBubbleMarkdown } from './MessageBubbleMarkdown';
import { CalendarEventCard } from '../components/CalendarEventCard';
import { THEME } from '../../core/constants';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export const MessageBubble = React.memo(({ message, isStreaming = false }: MessageBubbleProps) => {
  const isUser = message.isFromUser();

  return (
    <Flex justify={isUser ? 'flex-end' : 'flex-start'} direction="column" align={isUser ? 'flex-end' : 'flex-start'}>
      <Box
        maxW="70%"
        p={4}
        borderRadius={THEME.borderRadius.lg}
        bg={isUser ? THEME.colors.userBubble : THEME.colors.assistantBubble}
        boxShadow={isUser ? 'none' : THEME.shadows.sm}
      >
        {/* Media attachments */}
        {message.hasMedia() && (
          <VStack mb={3} spacing={2} align="stretch">
            {message.mediaUrls.map((url, i) => (
              <MediaPreview key={i} url={url} />
            ))}
          </VStack>
        )}

        {/* Message content with markdown */}
        <MessageBubbleMarkdown
          content={message.content}
          isUser={isUser}
          isStreaming={isStreaming}
        />
      </Box>

      {/* Calendar Event Card */}
      {message.hasCalendarEvent() && message.metadata?.calendarEvent && (
        <Box mt={2}>
          <CalendarEventCard event={message.metadata.calendarEvent} />
        </Box>
      )}
    </Flex>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.message.metadata?.calendarEvent?.id === nextProps.message.metadata?.calendarEvent?.id
  );
});

MessageBubble.displayName = 'MessageBubble';

// Media Preview Sub-component
const MediaPreview: React.FC<{ url: string }> = ({ url }) => {
  const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  if (isImage) {
    return (
      <Box borderRadius={THEME.borderRadius.sm} overflow="hidden">
        <img src={url} alt="Uploaded" style={{ maxWidth: '100%', borderRadius: '8px' }} />
      </Box>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <Box
        p={2}
        bg={THEME.colors.backgroundSecondary}
        borderRadius={THEME.borderRadius.sm}
        _hover={{ bg: THEME.colors.surfaceHover }}
      >
        📎 Attachment
      </Box>
    </a>
  );
};
