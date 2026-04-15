/**
 * Message Bubble with Markdown and Code Highlighting
 * Renders AI responses with proper formatting
 */
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Box, Text, IconButton } from '@chakra-ui/react';
import { THEME } from '../../core/constants';

interface MessageBubbleMarkdownProps {
  content: string;
  isUser: boolean;
  isStreaming?: boolean;
}

export const MessageBubbleMarkdown = React.memo(({
  content,
  isUser,
  isStreaming = false,
}: MessageBubbleMarkdownProps) => {
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (isUser) {
    // User messages: plain text, no markdown
    return (
      <Text
        fontSize={THEME.fontSizes.md}
        color={THEME.colors.textPrimary}
        whiteSpace="pre-wrap"
      >
        {content}
      </Text>
    );
  }

  // AI messages: full markdown rendering
  return (
    <Box
      sx={{
        '& p': {
          marginBottom: '0.75em',
        },
        '& ul, & ol': {
          marginLeft: '1.5em',
          marginBottom: '0.75em',
        },
        '& li': {
          marginBottom: '0.25em',
        },
        '& h1, & h2, & h3': {
          fontWeight: THEME.fontWeights.semibold,
          marginTop: '1em',
          marginBottom: '0.5em',
        },
        '& h1': { fontSize: THEME.fontSizes.xl },
        '& h2': { fontSize: THEME.fontSizes.lg },
        '& h3': { fontSize: THEME.fontSizes.md },
        '& code': {
          backgroundColor: THEME.colors.backgroundSecondary,
          padding: '0.2em 0.4em',
          borderRadius: '4px',
          fontSize: '0.9em',
          fontFamily: THEME.fonts.mono,
        },
        '& pre': {
          position: 'relative',
          marginBottom: '1em',
        },
      }}
    >
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            return !inline && match ? (
              <Box position="relative" mb={3}>
                {/* Copy button */}
                <IconButton
                  aria-label="Copy code"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {copiedCode === codeString ? (
                        <path d="M20 6L9 17l-5-5" />
                      ) : (
                        <>
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </>
                      )}
                    </svg>
                  }
                  size="sm"
                  position="absolute"
                  top={2}
                  right={2}
                  variant="ghost"
                  colorScheme={copiedCode === codeString ? 'green' : 'gray'}
                  onClick={() => handleCopyCode(codeString)}
                  zIndex={1}
                />

                {/* Code block with syntax highlighting */}
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    borderRadius: THEME.borderRadius.sm,
                    fontSize: THEME.fontSizes.sm,
                    padding: '1em',
                  }}
                  {...props}
                >
                  {codeString}
                </SyntaxHighlighter>

                {/* Language label */}
                <Text
                  position="absolute"
                  top={2}
                  left={3}
                  fontSize={THEME.fontSizes.xs}
                  color="whiteAlpha.700"
                  textTransform="uppercase"
                  fontWeight={THEME.fontWeights.medium}
                  pointerEvents="none"
                >
                  {match[1]}
                </Text>
              </Box>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Streaming cursor */}
      {isStreaming && (
        <Box
          as="span"
          display="inline-block"
          w="8px"
          h="16px"
          bg={THEME.colors.accent}
          ml={1}
          animation="blink 1s infinite"
          sx={{
            '@keyframes blink': {
              '0%, 49%': { opacity: 1 },
              '50%, 100%': { opacity: 0 },
            },
          }}
        />
      )}
    </Box>
  );
});

MessageBubbleMarkdown.displayName = 'MessageBubbleMarkdown';
