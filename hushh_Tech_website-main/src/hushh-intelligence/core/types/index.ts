/**
 * Hushh Intelligence - Core Types
 * All TypeScript types for the Intelligence product
 */

// ============================================
// User Types
// ============================================

export interface HushhUser {
  id: string;
  supabaseUserId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  lastLoginAt: Date;
  totalMessages: number;
  totalConversations: number;
  isActive: boolean;
}

export interface UserSession {
  user: HushhUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// ============================================
// Conversation Types
// ============================================

export interface HushhConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationWithMessages extends HushhConversation {
  messages: HushhMessage[];
}

// ============================================
// Message Types
// ============================================

export type MessageRole = 'user' | 'assistant';

export interface HushhMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  mediaUrls: string[];
  createdAt: Date;
}

export interface StreamingMessage {
  content: string;
  isComplete: boolean;
}

// ============================================
// Media Types
// ============================================

export interface MediaFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: Date;
}

export interface MediaUploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
}

export interface MediaLimits {
  dailyUploads: number;
  maxDailyUploads: number;
  remainingUploads: number;
  lastReset: Date;
}

// ============================================
// AI Request/Response Types
// ============================================

export interface HushhAIRequest {
  message: string;
  conversationId?: string;
  mediaUrls?: string[];
  systemPrompt?: string;
}

export interface HushhAIResponse {
  content: string;
  conversationId: string;
  messageId: string;
}

export interface HushhAIStreamChunk {
  text: string;
  isComplete: boolean;
  error?: string;
}

// ============================================
// API Error Types
// ============================================

export interface HushhAPIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================
// UI State Types
// ============================================

export interface ChatUIState {
  isTyping: boolean;
  isSending: boolean;
  isStreaming: boolean;
  error: string | null;
}

export interface SidebarState {
  isOpen: boolean;
  isLoading: boolean;
  conversations: HushhConversation[];
}

// ============================================
// Theme Constants
// ============================================

export const HUSHH_THEME = {
  colors: {
    // Claude-style cream/white theme
    background: '#FAF9F7',
    backgroundSecondary: '#F5F4F2',
    surface: '#FFFFFF',
    surfaceHover: '#F7F6F4',
    
    // Text colors
    textPrimary: '#1A1A1A',
    textSecondary: '#6B6B6B',
    textMuted: '#9B9B9B',
    
    // Message bubbles
    userBubble: '#F1F0EE',
    assistantBubble: '#FFFFFF',
    
    // Accent
    accent: '#D97706',
    accentHover: '#B45309',
    
    // Borders
    border: '#E5E5E5',
    borderLight: '#EBEBEB',
    
    // Status
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
  },
  
  fonts: {
    primary: 'Manrope, system-ui, sans-serif',
    mono: 'ui-monospace, monospace',
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    full: '9999px',
  },
} as const;

// ============================================
// Branding Constants
// ============================================

export const HUSHH_BRANDING = {
  productName: 'Hushh Intelligence',
  aiName: 'Hushh',
  tagline: 'Your Free AI Assistant',
  
  messages: {
    thinking: 'Hushh is thinking...',
    welcome: "Hi! I'm Hushh, your AI assistant. How can I help you today?",
    error: "Hushh couldn't respond. Please try again.",
    uploadLimit: 'Daily upload limit reached. Try again tomorrow!',
  },
  
  // Never expose these to users
  internal: {
    modelName: 'gemini-2.0-flash-001',
    fallbackModel: 'gemini-1.5-pro',
    provider: 'vertex-ai',
  },
} as const;

// ============================================
// Limits Constants
// ============================================

export const HUSHH_LIMITS = {
  media: {
    maxDailyUploads: 20,
    maxFileSizeMB: 10,
    maxImageSizeMB: 10,
    maxDocSizeMB: 20,
    maxVideoSizeMB: 50,
    maxVideoDurationSec: 120,
  },
  
  conversation: {
    maxHistoryMessages: 50,
    maxMessageLength: 32000,
    paginationLimit: 20,
  },
  
  chat: {
    // No limits on chat - unlimited!
    isUnlimited: true,
  },
} as const;

// ============================================
// Supported File Types
// ============================================

export const SUPPORTED_FILE_TYPES = {
  images: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/bmp',
  ],
  documents: [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ],
  videos: [
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ],
} as const;

// ============================================
// Helper Functions
// ============================================

export function isImageFile(mimeType: string): boolean {
  return SUPPORTED_FILE_TYPES.images.includes(mimeType as never);
}

export function isDocumentFile(mimeType: string): boolean {
  return SUPPORTED_FILE_TYPES.documents.includes(mimeType as never);
}

export function isVideoFile(mimeType: string): boolean {
  return SUPPORTED_FILE_TYPES.videos.includes(mimeType as never);
}

export function isSupportedFile(mimeType: string): boolean {
  return isImageFile(mimeType) || isDocumentFile(mimeType) || isVideoFile(mimeType);
}
