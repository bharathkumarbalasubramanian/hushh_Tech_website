/**
 * Hushh AI - Constants
 * Theme, Branding, and Limits
 */

// ============================================
// Theme Constants (Claude-style)
// ============================================

export const THEME = {
  colors: {
    // Background colors
    background: '#FAF9F7',
    backgroundSecondary: '#F5F4F2',
    surface: '#FFFFFF',
    surfaceHover: '#F7F6F4',
    
    // Text colors
    textPrimary: '#1A1A1A',
    textSecondary: '#6B6B6B',
    textMuted: '#9B9B9B',
    textPlaceholder: '#AAAAAA',
    
    // Message bubbles
    userBubble: '#F1F0EE',
    assistantBubble: '#FFFFFF',
    
    // Accent colors
    accent: '#D97706',
    accentHover: '#B45309',
    accentLight: '#FEF3C7',
    
    // Borders
    border: '#E5E5E5',
    borderLight: '#EBEBEB',
    borderFocus: '#D97706',
    
    // Status colors
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    
    // Sidebar
    sidebarBg: '#FAFAF9',
    sidebarHover: '#F3F3F2',
    sidebarActive: '#EDEDE9',
  },
  
  fonts: {
    primary: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace",
  },
  
  fontSizes: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    xxl: '24px',
  },
  
  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },
  
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.05)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  },
  
  transitions: {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
  },
} as const;

// ============================================
// Branding Constants
// ============================================

export const BRANDING = {
  productName: 'Hushh AI',
  aiName: 'Hushh',
  tagline: 'Your thoughtful AI companion',
  
  messages: {
    thinking: 'Hushh is thinking...',
    welcome: "Hello! I'm Hushh, here to help you. What would you like to chat about?",
    error: "Hushh couldn't respond. Please try again.",
    uploadLimit: 'Daily upload limit reached. Try again tomorrow!',
    newChat: 'New Chat',
  },
  
  placeholders: {
    input: 'Message Hushh...',
    searchChats: 'Search chats...',
  },
  
  // Internal only - never expose to users
  internal: {
    modelName: 'gemini-2.0-flash-001',
    fallbackModel: 'gemini-1.5-pro',
    provider: 'vertex-ai',
    gcpProject: 'hushone-app',
    gcpLocation: 'us-central1',
  },
} as const;

// ============================================
// Limits Constants
// ============================================

export const LIMITS = {
  media: {
    maxDailyUploads: 20,
    maxFileSizeMB: 10,
    maxImageSizeMB: 10,
    maxDocSizeMB: 20,
    maxVideoSizeMB: 50,
    maxVideoDurationSec: 120,
  },
  
  chat: {
    maxHistoryMessages: 50,
    maxMessageLength: 32000,
    paginationLimit: 20,
    isUnlimited: true,
  },
  
  sidebar: {
    maxChatsToShow: 100,
  },
} as const;

// ============================================
// Supported File Types
// ============================================

export const SUPPORTED_FILES = {
  images: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
  ],
  documents: [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  videos: [
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ],
} as const;

// ============================================
// API Endpoints
// ============================================

export const API = {
  chat: '/functions/v1/hushh-ai-chat',
  upload: '/storage/v1/object/hushh-ai-media',
} as const;

// ============================================
// Route Paths
// ============================================

export const ROUTES = {
  home: '/hushh-ai',
  chat: '/hushh-ai/chat',
  chatById: (id: string) => `/hushh-ai/chat/${id}`,
  login: '/login',
} as const;
