/**
 * Hushh Studio - FREE AI Video Generation
 * Type definitions for Google Veo 3.1 API integration
 */

// Generation modes
export type GenerationMode = 'text-to-video' | 'image-to-video' | 'extend-video';

// Aspect ratio options
export type AspectRatio = '16:9' | '9:16';

// Resolution options
export type Resolution = '720p' | '1080p' | '4k';

// Duration options (in seconds)
export type Duration = 4 | 6 | 8;

// Generation status
export type GenerationStatus = 'idle' | 'generating' | 'polling' | 'completed' | 'error';

// Video generation settings
export interface VideoSettings {
  aspectRatio: AspectRatio;
  resolution: Resolution;
  duration: Duration;
  enableNativeAudio: boolean;
}

// Video generation request
export interface VideoGenerationRequest {
  mode: GenerationMode;
  prompt: string;
  settings: VideoSettings;
  sourceImage?: string; // Base64 for image-to-video
  sourceVideo?: string; // For video extension
}

// Generated video result
export interface GeneratedVideo {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  prompt: string;
  settings: VideoSettings;
  createdAt: Date;
  duration: number;
}

// Video operation response from Veo API
export interface VeoOperationResponse {
  done: boolean;
  name?: string;
  response?: {
    generatedVideos: {
      video: {
        uri: string;
        mimeType: string;
      };
    }[];
  };
  error?: {
    code: number;
    message: string;
  };
}

// Generation progress state
export interface GenerationProgress {
  status: GenerationStatus;
  progress: number; // 0-100
  message: string;
  pollingAttempts: number;
  estimatedTimeRemaining?: number; // seconds
}

// Gallery item
export interface GalleryItem {
  id: string;
  video: GeneratedVideo;
  isSelected: boolean;
}

// Error types
export interface StudioError {
  code: string;
  message: string;
  retryable: boolean;
}

// Default settings
export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  aspectRatio: '16:9',
  resolution: '720p',
  duration: 6,
  enableNativeAudio: true,
};

// Maximum polling attempts (10 seconds each)
export const MAX_POLLING_ATTEMPTS = 60; // 10 minutes max

// Sample prompts for inspiration
export const SAMPLE_PROMPTS = [
  "A beautiful sunrise over the Himalayan mountains with golden light streaming through clouds",
  "A traditional Indian wedding celebration with colorful decorations and dancing",
  "A bustling Mumbai street scene with rickshaws and people walking",
  "A serene Kerala backwaters scene with a houseboat floating peacefully",
  "A Bollywood-style dance sequence with vibrant costumes and energetic moves",
  "A time-lapse of the Taj Mahal from dawn to dusk with changing colors",
  "A chef preparing butter chicken in a traditional Indian kitchen",
  "A festival of lights (Diwali) celebration with fireworks and diyas",
  "A yoga session at sunrise on a peaceful Goan beach",
  "A colorful Holi celebration with people throwing colored powder",
];
