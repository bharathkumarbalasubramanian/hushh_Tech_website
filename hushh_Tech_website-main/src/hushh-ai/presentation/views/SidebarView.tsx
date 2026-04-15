/**
 * Sidebar View Component - MOBILE FIRST
 * Displays chat list and controls
 * Overlay on mobile, side panel on desktop
 */
import React from 'react';
import { VStack, HStack, Box, Text, IconButton } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chat } from '../../domain/entities';
import { MediaLimits } from '../../domain/repositories';
import { THEME, BRANDING } from '../../core/constants';

const MotionBox = motion(Box);

interface SidebarViewProps {
  isOpen: boolean;
  isMobile: boolean;
  chats: Chat[];
  currentChatId: string | null;
  mediaLimits: MediaLimits | null;
  onToggle: () => void;
  onNewChat: () => void;
  onSelectChat: (chat: Chat) => void;
  onDeleteChat: (chatId: string, e: React.MouseEvent) => void;
}

export const SidebarView: React.FC<SidebarViewProps> = ({
  isOpen,
  isMobile,
  chats,
  currentChatId,
  mediaLimits,
  onToggle,
  onNewChat,
  onSelectChat,
  onDeleteChat,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <MotionBox
          // Mobile: fixed overlay, Desktop: side panel
          position={isMobile ? 'fixed' : 'relative'}
          top={isMobile ? 0 : undefined}
          left={isMobile ? 0 : undefined}
          bottom={isMobile ? 0 : undefined}
          zIndex={isMobile ? 1000 : undefined}
          initial={
            isMobile
              ? { x: '-100%', opacity: 0 }
              : { width: 0, opacity: 0 }
          }
          animate={
            isMobile
              ? { x: 0, opacity: 1 }
              : { width: 280, opacity: 1 }
          }
          exit={
            isMobile
              ? { x: '-100%', opacity: 0 }
              : { width: 0, opacity: 0 }
          }
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          bg={THEME.colors.sidebarBg}
          borderRight={`1px solid ${THEME.colors.border}`}
          overflow="hidden"
          w={isMobile ? '85%' : undefined}
          maxW={isMobile ? '320px' : undefined}
          h={isMobile ? '100%' : undefined}
        >
          <VStack h="full" p={{ base: 3, md: 4 }} spacing={{ base: 3, md: 4 }} align="stretch">
            {/* Header */}
            <HStack justify="space-between" minH="44px">
              <Text
                fontSize={{ base: THEME.fontSizes.md, md: THEME.fontSizes.lg }}
                fontWeight={THEME.fontWeights.semibold}
                color={THEME.colors.textPrimary}
              >
                {BRANDING.productName}
              </Text>
              <IconButton
                aria-label="Close sidebar"
                icon={<CloseIcon />}
                variant="ghost"
                size={{ base: 'md', md: 'sm' }}
                minW={{ base: '44px', md: 'auto' }} // Larger touch target on mobile
                onClick={onToggle}
              />
            </HStack>

            {/* New Chat Button - Larger touch target on mobile */}
            <Box
              as="button"
              w="full"
              p={{ base: 4, md: 3 }}
              minH={{ base: '48px', md: 'auto' }}
              borderRadius={THEME.borderRadius.md}
              border={`1px solid ${THEME.colors.border}`}
              bg={THEME.colors.surface}
              _hover={{ bg: THEME.colors.surfaceHover }}
              _active={{ transform: 'scale(0.98)' }}
              transition={THEME.transitions.fast}
              onClick={onNewChat}
            >
              <HStack justify="center" spacing={2}>
                <PlusIcon />
                <Text fontSize={{ base: THEME.fontSizes.sm, md: THEME.fontSizes.sm }} fontWeight="medium">
                  {BRANDING.messages.newChat}
                </Text>
              </HStack>
            </Box>

            {/* Chat List - Mobile optimized scrolling */}
            <VStack
              flex={1}
              spacing={1}
              align="stretch"
              overflowY="auto"
              overflowX="hidden"
              css={{
                '&::-webkit-scrollbar': { width: isMobile ? '2px' : '4px' },
                '&::-webkit-scrollbar-thumb': {
                  background: THEME.colors.border,
                  borderRadius: '2px',
                },
                // Better momentum scrolling on iOS
                '-webkit-overflow-scrolling': 'touch',
              }}
            >
              {chats.length === 0 ? (
                <Box p={6} textAlign="center">
                  <Text fontSize="sm" color={THEME.colors.textSecondary}>
                    No chats yet.
                    <br />
                    Start a new conversation!
                  </Text>
                </Box>
              ) : (
                chats.map((chat) => (
                  <HStack
                    key={chat.id}
                    p={{ base: 4, md: 3 }}
                    minH={{ base: '52px', md: 'auto' }} // Larger touch targets on mobile
                    borderRadius={THEME.borderRadius.sm}
                    bg={currentChatId === chat.id ? THEME.colors.sidebarActive : 'transparent'}
                    _hover={{ bg: THEME.colors.sidebarHover }}
                    _active={{ bg: THEME.colors.sidebarActive }}
                    cursor="pointer"
                    onClick={() => onSelectChat(chat)}
                    justify="space-between"
                    spacing={2}
                  >
                    <Text
                      fontSize={{ base: THEME.fontSizes.sm, md: THEME.fontSizes.sm }}
                      noOfLines={1}
                      color={THEME.colors.textPrimary}
                      flex={1}
                    >
                      {chat.title}
                    </Text>
                    <IconButton
                      aria-label="Delete chat"
                      icon={<TrashIcon />}
                      variant="ghost"
                      size="xs"
                      minW={{ base: '32px', md: 'auto' }}
                      opacity={0.5}
                      _hover={{ opacity: 1, bg: 'red.50' }}
                      onClick={(e) => onDeleteChat(chat.id, e)}
                    />
                  </HStack>
                ))
              )}
            </VStack>

            {/* Media Limit Indicator - Compact on mobile */}
            {mediaLimits && (
              <Box
                p={{ base: 3, md: 3 }}
                bg={THEME.colors.backgroundSecondary}
                borderRadius={THEME.borderRadius.sm}
              >
                <Text fontSize={{ base: '10px', md: THEME.fontSizes.xs }} color={THEME.colors.textSecondary}>
                  Media uploads: {mediaLimits.dailyUploads}/{mediaLimits.maxDailyUploads}
                </Text>
                <Box
                  mt={2}
                  h="4px"
                  bg={THEME.colors.border}
                  borderRadius="full"
                  overflow="hidden"
                >
                  <Box
                    h="full"
                    w={`${(mediaLimits.dailyUploads / mediaLimits.maxDailyUploads) * 100}%`}
                    bg={THEME.colors.accent}
                    transition={THEME.transitions.normal}
                  />
                </Box>
              </Box>
            )}
          </VStack>
        </MotionBox>
      )}
    </AnimatePresence>
  );
};

// Icons
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
