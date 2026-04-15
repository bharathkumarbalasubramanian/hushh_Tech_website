/**
 * Input Area View Component
 * Message input with file upload
 */
import React, { useRef } from 'react';
import { Box, HStack, Input, IconButton, Text } from '@chakra-ui/react';
import { MediaLimits } from '../../domain/repositories';
import { THEME, BRANDING } from '../../core/constants';

interface InputAreaViewProps {
  inputValue: string;
  selectedFiles: File[];
  isSending: boolean;
  mediaLimits: MediaLimits | null;
  onInputChange: (value: string) => void;
  onFileSelect: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onSendMessage: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export const InputAreaView: React.FC<InputAreaViewProps> = ({
  inputValue,
  selectedFiles,
  isSending,
  mediaLimits,
  onInputChange,
  onFileSelect,
  onRemoveFile,
  onSendMessage,
  onKeyDown,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onFileSelect(files);
  };

  return (
    <Box
      p={{ base: 3, md: 4 }}
      pb={{ base: 'max(16px, env(safe-area-inset-bottom))', md: 4 }} // iOS safe area
      bg={THEME.colors.surface}
      borderTop={`1px solid ${THEME.colors.border}`}
    >
      {/* Selected Files Preview - Mobile optimized */}
      {selectedFiles.length > 0 && (
        <HStack mb={{ base: 2, md: 3 }} spacing={2} flexWrap="wrap">
          {selectedFiles.map((file, index) => (
            <HStack
              key={index}
              p={{ base: 2, md: 2 }}
              minH={{ base: '36px', md: 'auto' }}
              bg={THEME.colors.backgroundSecondary}
              borderRadius={THEME.borderRadius.sm}
              spacing={2}
            >
              <Text
                fontSize={{ base: '10px', md: THEME.fontSizes.xs }}
                noOfLines={1}
                maxW={{ base: '80px', md: '100px' }}
              >
                {file.name}
              </Text>
              <IconButton
                aria-label="Remove file"
                icon={<CloseIcon />}
                size="xs"
                minW={{ base: '24px', md: 'auto' }}
                variant="ghost"
                onClick={() => onRemoveFile(index)}
              />
            </HStack>
          ))}
        </HStack>
      )}

      {/* Input Bar - Mobile first */}
      <HStack
        p={{ base: 3, md: 3 }}
        minH={{ base: '52px', md: 'auto' }}
        bg={THEME.colors.background}
        borderRadius={THEME.borderRadius.lg}
        border={`1px solid ${THEME.colors.border}`}
        _focusWithin={{ borderColor: THEME.colors.borderFocus }}
        spacing={{ base: 2, md: 2 }}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileChange}
        />
        <IconButton
          aria-label="Attach file"
          icon={<AttachIcon />}
          variant="ghost"
          size={{ base: 'md', md: 'sm' }}
          minW={{ base: '44px', md: 'auto' }} // 44px touch target on mobile
          onClick={() => fileInputRef.current?.click()}
          isDisabled={mediaLimits?.remainingUploads === 0}
        />
        <Input
          flex={1}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={BRANDING.placeholders.input}
          variant="unstyled"
          fontSize={{ base: '16px', md: THEME.fontSizes.md }} // 16px prevents iOS zoom
          _placeholder={{ color: THEME.colors.textPlaceholder }}
        />
        <IconButton
          aria-label="Send message"
          icon={<SendIcon />}
          variant="ghost"
          size={{ base: 'md', md: 'sm' }}
          minW={{ base: '44px', md: 'auto' }} // 44px touch target on mobile
          colorScheme="orange"
          onClick={onSendMessage}
          isDisabled={isSending || (!inputValue.trim() && selectedFiles.length === 0)}
        />
      </HStack>
    </Box>
  );
};

// Icons
const AttachIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
