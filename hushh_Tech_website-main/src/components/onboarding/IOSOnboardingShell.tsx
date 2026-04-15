/**
 * IOSOnboardingShell - Reusable iOS-first wrapper for all onboarding steps
 *
 * Features:
 * - iOS Status Bar with time, battery, signal
 * - Large Title Navigation (collapsible on scroll)
 * - Progress indicator
 * - Swipe-back gesture support
 * - Safe area insets for notch/Dynamic Island
 * - SF Pro fonts and exact iOS colors
 */
import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, Flex, Progress } from '@chakra-ui/react';

/* iOS 17+ System Design Tokens */
const IOS = {
  primary: '#007AFF',
  text: '#000000',
  textSecondary: '#8E8E93',
  labelSecondary: 'rgba(60, 60, 67, 0.6)',
  bg: '#FFFFFF',
  groupedBg: '#F2F2F7',
  separator: 'rgba(60, 60, 67, 0.12)',
  fontDisplay: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
  fontText: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
  blurRegular: 'blur(30px)',
};

interface IOSOnboardingShellProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onSkip?: () => void;
  showProgress?: boolean;
}

const IOSStatusBar: React.FC = () => {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const formattedHours = hours % 12 || 12;
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      setCurrentTime(`${formattedHours}:${formattedMinutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      h="44px"
      bg={IOS.bg}
      zIndex={9999}
      px={6}
      display="flex"
      alignItems="flex-end"
      justifyContent="space-between"
      pb="6px"
      fontFamily={IOS.fontText}
    >
      <Text fontSize="15px" fontWeight="600" color={IOS.text} letterSpacing="-0.3px">
        {currentTime}
      </Text>

      <Flex align="center" gap={1}>
        {/* Signal */}
        <Flex align="flex-end" gap="1px" h="12px">
          <Box w="3px" h="3px" bg={IOS.text} borderRadius="1px" />
          <Box w="3px" h="5px" bg={IOS.text} borderRadius="1px" />
          <Box w="3px" h="7px" bg={IOS.text} borderRadius="1px" />
          <Box w="3px" h="9px" bg={IOS.text} borderRadius="1px" />
        </Flex>

        {/* WiFi */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path d="M8 12C8.55228 12 9 11.5523 9 11C9 10.4477 8.55228 10 8 10C7.44772 10 7 10.4477 7 11C7 11.5523 7.44772 12 8 12Z" fill={IOS.text}/>
          <path d="M5.5 8.5C6.33 7.67 7.42 7.25 8 7.25C8.58 7.25 9.67 7.67 10.5 8.5" stroke={IOS.text} strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M3 6C4.66 4.34 6.34 3.5 8 3.5C9.66 3.5 11.34 4.34 13 6" stroke={IOS.text} strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M0.5 3.5C2.83 1.17 5.42 0 8 0C10.58 0 13.17 1.17 15.5 3.5" stroke={IOS.text} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>

        {/* Battery */}
        <Flex align="center" gap="1px">
          <Box w="22px" h="11px" border="1.5px solid" borderColor={IOS.text} borderRadius="3px" position="relative">
            <Box position="absolute" top="1px" left="1px" right="1px" bottom="1px" bg={IOS.text} borderRadius="1.5px" />
          </Box>
          <Box w="1.5px" h="4px" bg={IOS.text} borderRadius="0 1px 1px 0" />
        </Flex>
      </Flex>
    </Box>
  );
};

export const IOSOnboardingShell: React.FC<IOSOnboardingShellProps> = ({
  children,
  currentStep,
  totalSteps,
  title,
  subtitle,
  onBack,
  onSkip,
  showProgress = true,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsScrolled(container.scrollTop > 20);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  /* Swipe-back gesture */
  const [swipeProgress, setSwipeProgress] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - touchStartX.current;
    const deltaY = touchY - touchStartY.current;

    if (touchStartX.current < 20 && Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
      const progress = Math.min(deltaX / 300, 1);
      setSwipeProgress(progress);
    }
  };

  const handleTouchEnd = () => {
    if (swipeProgress > 0.3 && onBack) {
      onBack();
    }
    setSwipeProgress(0);
  };

  return (
    <>
      <IOSStatusBar />

      {/* Navigation Bar */}
      <Box
        position="fixed"
        top="44px"
        left={0}
        right={0}
        h="52px"
        bg={isScrolled ? 'rgba(255,255,255,0.95)' : IOS.bg}
        backdropFilter={isScrolled ? IOS.blurRegular : 'none'}
        sx={{ WebkitBackdropFilter: isScrolled ? IOS.blurRegular : 'none' }}
        borderBottom="0.5px solid"
        borderColor={isScrolled ? IOS.separator : 'transparent'}
        zIndex={998}
        transition="all 0.25s ease"
        fontFamily={IOS.fontText}
      >
        <Flex h="100%" align="flex-end" justify="space-between" px={4} pb={2}>
          {/* Back button */}
          {onBack && (
            <Flex
              as="button"
              onClick={onBack}
              align="center"
              color={IOS.primary}
              fontSize="17px"
              cursor="pointer"
              ml={-2}
              _active={{ opacity: 0.5 }}
              transition="opacity 0.15s"
            >
              <Text className="material-symbols-outlined" fontSize="28px" mr={-1} sx={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>
                chevron_left
              </Text>
              <Text fontWeight="400">Back</Text>
            </Flex>
          )}

          {/* Center title */}
          <Text
            position="absolute"
            left="50%"
            transform="translateX(-50%)"
            fontSize="17px"
            fontWeight="600"
            color={IOS.text}
          >
            Onboarding
          </Text>

          {/* Skip button */}
          {onSkip && (
            <Text
              as="button"
              onClick={onSkip}
              color={IOS.primary}
              fontSize="17px"
              fontWeight="400"
              cursor="pointer"
              _active={{ opacity: 0.5 }}
              transition="opacity 0.15s"
            >
              Skip
            </Text>
          )}
        </Flex>
      </Box>

      {/* Main Content */}
      <Box
        minH="100dvh"
        bg={IOS.groupedBg}
        pt="96px"
        pb="calc(env(safe-area-inset-bottom, 20px) + 120px)"
        fontFamily={IOS.fontText}
        sx={{ WebkitFontSmoothing: 'antialiased' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: swipeProgress > 0 ? `translateX(${swipeProgress * 100}px)` : 'none',
          transition: swipeProgress === 0 ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        }}
      >
        <Box
          ref={scrollContainerRef}
          maxW="md"
          mx="auto"
          px={5}
        >
          {/* Progress */}
          {showProgress && (
            <Box mb={6}>
              <Flex justify="space-between" align="center" mb={2}>
                <Text fontSize="13px" fontWeight="600" color={IOS.labelSecondary} textTransform="uppercase" letterSpacing="0.5px">
                  Step {currentStep} of {totalSteps}
                </Text>
                <Text fontSize="13px" fontWeight="600" color={IOS.labelSecondary}>
                  {Math.round((currentStep / totalSteps) * 100)}%
                </Text>
              </Flex>
              <Progress
                value={(currentStep / totalSteps) * 100}
                size="xs"
                borderRadius="full"
                bg="rgba(0,122,255,0.12)"
                sx={{
                  '& > div': {
                    bg: IOS.primary,
                    borderRadius: 'full',
                  },
                }}
              />
            </Box>
          )}

          {/* Title */}
          <Box mb={6}>
            <Text
              fontSize="34px"
              lineHeight="41px"
              fontWeight="700"
              letterSpacing="-0.4px"
              color={IOS.text}
              fontFamily={IOS.fontDisplay}
              mb={subtitle ? 2 : 0}
            >
              {title}
            </Text>
            {subtitle && (
              <Text fontSize="17px" lineHeight="22px" color={IOS.labelSecondary} fontWeight="400">
                {subtitle}
              </Text>
            )}
          </Box>

          {/* Content */}
          {children}
        </Box>
      </Box>
    </>
  );
};

export default IOSOnboardingShell;
