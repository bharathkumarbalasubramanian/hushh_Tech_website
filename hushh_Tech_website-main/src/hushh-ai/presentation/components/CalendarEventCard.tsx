import React from 'react';
import { Box, VStack, Text, HStack, Icon, Link } from '@chakra-ui/react';
import { THEME } from '../../core/constants';

interface CalendarEvent {
    id: string;
    summary: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
    htmlLink?: string;
}

interface CalendarEventCardProps {
    event: CalendarEvent;
}

const CalendarIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
);

const ClockIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
);

const MapPinIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
    </svg>
);

export const CalendarEventCard: React.FC<CalendarEventCardProps> = ({ event }) => {
    const startDate = new Date(event.startTime);
    const endDate = new Date(event.endTime);

    const formattedDate = startDate.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
    });

    const formattedTime = `${startDate.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
    })} - ${endDate.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
    })}`;

    return (
        <Box
            p={4}
            bg="white"
            borderRadius="xl"
            boxShadow="sm"
            border="1px solid"
            borderColor={THEME.colors.border}
            maxW="300px"
            _hover={{ boxShadow: 'md', borderColor: THEME.colors.accent }}
            transition="all 0.2s"
        >
            <VStack align="start" spacing={3}>
                <HStack>
                    <Box color={THEME.colors.accent}>
                        <CalendarIcon />
                    </Box>
                    <VStack align="start" spacing={0}>
                        <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase">
                            Calendar Event
                        </Text>
                        <Text fontSize="sm" fontWeight="bold" color={THEME.colors.textPrimary} noOfLines={1}>
                            {event.summary}
                        </Text>
                    </VStack>
                </HStack>

                <VStack align="start" spacing={1} w="full">
                    <HStack spacing={2} color="gray.600">
                        <ClockIcon />
                        <VStack align="start" spacing={0}>
                            <Text fontSize="xs" fontWeight="medium">{formattedDate}</Text>
                            <Text fontSize="xs">{formattedTime}</Text>
                        </VStack>
                    </HStack>

                    {event.location && (
                        <HStack spacing={2} color="gray.600">
                            <MapPinIcon />
                            <Text fontSize="xs" noOfLines={1}>
                                {event.location}
                            </Text>
                        </HStack>
                    )}
                </VStack>

                {event.htmlLink && (
                    <Link
                        href={event.htmlLink}
                        isExternal
                        fontSize="xs"
                        color={THEME.colors.accent}
                        fontWeight="medium"
                        _hover={{ textDecoration: 'underline' }}
                    >
                        View in Google Calendar &rarr;
                    </Link>
                )}
            </VStack>
        </Box>
    );
};
