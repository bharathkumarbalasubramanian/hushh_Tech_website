/**
 * Hushh AI - Core Types
 * Fresh build for Free AI Assistant
 */

// ============================================
// User Types
// ============================================

export interface HushhAIUser {
  id: string;
  supabaseUserId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  lastLoginAt: Date;
  totalMessages: number;
  totalChats: number;
  isActive: boolean;
}

// ============================================
// Chat Types
// ============================================

export interface HushhChat {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

// ============================================
// Message Types
// ============================================

export type MessageRole = 'user' | 'assistant';


export interface MessageMetadata {
  calendarEvent?: {
    id: string;
    summary: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
    [key: string]: any;
  };
  [key: string]: any;
}


export interface HushhMessage {
  id: string;
  chatId: string;
  role: MessageRole;
  content: string;
  mediaUrls: string[];
  createdAt: Date;
  metadata?: MessageMetadata;
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

export interface AIRequest {
  message: string;
  chatId?: string;
  mediaUrls?: string[];
}

export interface AIResponse {
  content: string;
  chatId: string;
  messageId: string;
}

export interface AIStreamChunk {
  text: string;
  isComplete: boolean;
  error?: string;
}

// ============================================
// UI State Types
// ============================================

export interface ChatState {
  isTyping: boolean;
  isSending: boolean;
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
}

export interface SidebarState {
  isOpen: boolean;
  isLoading: boolean;
  chats: HushhChat[];
}
