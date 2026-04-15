/**
 * Hushh AI Main Page - MOBILE FIRST
 * Orchestrates the chat UI using Clean Architecture
 * Optimized for mobile devices (320px+) with desktop support
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flex,
  VStack,
  HStack,
  Text,
  Spinner,
  Box,
  useToast,
  useBreakpointValue,
  IconButton,
} from '@chakra-ui/react';
import { THEME, BRANDING } from '../../core/constants';
import { HushhAIContainer } from '../../di';
import { useChatViewModel, useMessageViewModel } from '../viewmodels';
import { SidebarView, MessageListView, InputAreaView } from '../views';
import { useOfflineDetection } from '../hooks';
import { MediaLimits } from '../../domain/repositories';
import { Chat } from '../../domain/entities';

export default function HushhAIPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const isOnline = useOfflineDetection();

  // Mobile-first: detect screen size
  const isMobile = useBreakpointValue({ base: true, md: false }, { ssr: false });

  // DI Container
  const container = HushhAIContainer.getInstance();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [mediaLimits, setMediaLimits] = useState<MediaLimits | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Closed by default (mobile-first)
  const [inputValue, setInputValue] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // ViewModels
  const chatViewModel = useChatViewModel(
    container.getChatsUseCase,
    container.createChatUseCase,
    container.deleteChatUseCase,
    userId
  );

  const messageViewModel = useMessageViewModel(
    container.getMessagesUseCase,
    container.sendMessageUseCase,
    container.saveAIResponseUseCase,
    container.uploadMediaUseCase,
    container.handleCalendarRequestUseCase,
    userId
  );

  // Auto-open sidebar on desktop
  useEffect(() => {
    if (!isMobile && !sidebarOpen) {
      setSidebarOpen(true);
    }
  }, [isMobile, sidebarOpen]);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await container.isAuthenticated();
      if (!authenticated) {
        navigate('/hushh-ai/login');
        return;
      }

      // Load user and initial data
      const user = await container.getCurrentUserUseCase.execute();
      if (user) {
        setUserId(user.id);
        await chatViewModel.loadChats();
        const limits = await container.getMediaLimits(user.id);
        setMediaLimits(limits);
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [navigate, container, chatViewModel]);

  // Load messages when chat changes
  useEffect(() => {
    if (chatViewModel.currentChat) {
      messageViewModel.loadMessages(chatViewModel.currentChat.id);
    }
  }, [chatViewModel.currentChat, messageViewModel]);

  // Handlers
  const handleNewChat = async () => {
    const chat = await chatViewModel.createChat();
    if (chat) {
      setInputValue('');
      setSelectedFiles([]);
      // Auto-close sidebar on mobile after creating chat
      if (isMobile) setSidebarOpen(false);
    }
  };

  const handleSelectChat = (chat: Chat) => {
    chatViewModel.selectChat(chat);
    // Auto-close sidebar on mobile after selecting chat
    if (isMobile) setSidebarOpen(false);
  };

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    chatViewModel.deleteChat(chatId);
  };

  const handleFileSelect = (files: File[]) => {
    const remaining = mediaLimits?.remainingUploads ?? 0;
    if (files.length + selectedFiles.length > remaining) {
      toast({
        title: BRANDING.messages.uploadLimit,
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && selectedFiles.length === 0) return;
    if (messageViewModel.state.isSending) return;

    let chatId: string | undefined = chatViewModel.currentChat?.id;

    // Create chat if none selected
    if (!chatId) {
      const newChat = await chatViewModel.createChat(inputValue.slice(0, 50));
      if (!newChat) return;
      chatId = newChat.id;
    }

    // At this point chatId is guaranteed to be a string
    if (!chatId) return;

    const message = inputValue;
    const files = [...selectedFiles];

    setInputValue('');
    setSelectedFiles([]);

    // Send message with chatId
    await messageViewModel.sendMessage(chatId, message, files);

    // Refresh media limits
    if (userId) {
      const limits = await container.getMediaLimits(userId);
      setMediaLimits(limits);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Flex h="100vh" bg={THEME.colors.background} align="center" justify="center">
        <VStack spacing={4}>
          <Spinner size="lg" color={THEME.colors.accent} />
          <Text color={THEME.colors.textSecondary} fontSize={{ base: 'sm', md: 'md' }}>
            Loading Hushh AI...
          </Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Flex
      h={{ base: '100dvh', md: '100vh' }} // Mobile: use dvh for better mobile browser support
      bg={THEME.colors.background}
      position="relative"
      overflow="hidden"
    >
      {/* Offline Banner */}
      {!isOnline && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bg="orange.500"
          color="white"
          p={{ base: 2, md: 3 }}
          textAlign="center"
          zIndex={1001}
        >
          <Text fontSize={{ base: 'xs', md: 'sm' }}>
            {isMobile ? "You're offline" : "You're offline. Messages will send when reconnected."}
          </Text>
        </Box>
      )}

      {/* Mobile Overlay - Dark overlay when sidebar is open on mobile */}
      {isMobile && sidebarOpen && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="blackAlpha.600"
          zIndex={999}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Overlay on mobile, side panel on desktop */}
      <SidebarView
        isOpen={sidebarOpen}
        isMobile={isMobile || false}
        chats={chatViewModel.chats}
        currentChatId={chatViewModel.currentChat?.id || null}
        mediaLimits={mediaLimits}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
      />

      {/* Main Chat Area */}
      <Flex flex={1} direction="column" w="full" minW={0}>
        {/* Top Bar - Mobile optimized with larger touch targets */}
        <HStack
          px={{ base: 3, md: 4 }}
          py={{ base: 3, md: 4 }}
          minH={{ base: '56px', md: '64px' }} // Larger touch targets on mobile
          borderBottom={`1px solid ${THEME.colors.border}`}
          bg={THEME.colors.surface}
          spacing={3}
        >
          {/* Hamburger Menu - Always visible on mobile */}
          <IconButton
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            }
            variant="ghost"
            size={{ base: 'md', md: 'sm' }}
            minW={{ base: '44px', md: 'auto' }} // Larger touch target on mobile (44px minimum)
            onClick={() => setSidebarOpen(!sidebarOpen)}
          />

          {/* Chat Title */}
          <Text
            fontWeight={THEME.fontWeights.medium}
            color={THEME.colors.textPrimary}
            fontSize={{ base: 'sm', md: 'md' }}
            noOfLines={1}
            flex={1}
          >
            {chatViewModel.currentChat?.title || BRANDING.productName}
          </Text>
        </HStack>

        {/* Messages - Mobile optimized padding */}
        <MessageListView
          messages={messageViewModel.messages}
          streamingContent={messageViewModel.state.streamingContent}
          isStreaming={messageViewModel.state.isStreaming}
          isSending={messageViewModel.state.isSending}
          error={messageViewModel.state.error}
          currentChatId={chatViewModel.currentChat?.id || null}
        />

        {/* Input Area - Mobile optimized with safe area padding */}
        <InputAreaView
          inputValue={inputValue}
          selectedFiles={selectedFiles}
          isSending={messageViewModel.state.isSending}
          mediaLimits={mediaLimits}
          onInputChange={setInputValue}
          onFileSelect={handleFileSelect}
          onRemoveFile={handleRemoveFile}
          onSendMessage={handleSendMessage}
          onKeyDown={handleKeyDown}
        />
      </Flex>
    </Flex>
  );
}
