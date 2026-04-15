/**
 * Hushh Studio - useVideoGeneration Hook
 * Custom hook for managing video generation state
 */

import { useState, useCallback, useRef } from 'react';
import {
  GenerationMode,
  VideoSettings,
  GeneratedVideo,
  GenerationProgress,
  DEFAULT_VIDEO_SETTINGS,
} from '../types';
import { getVeoService } from '../services/veoService';

interface UseVideoGenerationReturn {
  // State
  isGenerating: boolean;
  progress: GenerationProgress;
  currentVideo: GeneratedVideo | null;
  gallery: GeneratedVideo[];
  settings: VideoSettings;
  error: string | null;
  
  // Actions
  generateFromText: (prompt: string) => Promise<void>;
  generateFromImage: (prompt: string, imageBase64: string) => Promise<void>;
  extendVideo: (video: GeneratedVideo, prompt: string) => Promise<void>;
  updateSettings: (settings: Partial<VideoSettings>) => void;
  removeFromGallery: (id: string) => void;
  clearError: () => void;
  reset: () => void;
}

const initialProgress: GenerationProgress = {
  status: 'idle',
  progress: 0,
  message: '',
  pollingAttempts: 0,
};

export const useVideoGeneration = (): UseVideoGenerationReturn => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>(initialProgress);
  const [currentVideo, setCurrentVideo] = useState<GeneratedVideo | null>(null);
  const [gallery, setGallery] = useState<GeneratedVideo[]>([]);
  const [settings, setSettings] = useState<VideoSettings>(DEFAULT_VIDEO_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  
  const veoService = useRef(getVeoService());

  // Generate video from text prompt
  const generateFromText = useCallback(async (prompt: string) => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to generate video');
      return;
    }

    if (!veoService.current.isReady()) {
      setError('Video service not available. Please check API key.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setCurrentVideo(null);

    try {
      const video = await veoService.current.generateVideoFromText(
        prompt,
        settings,
        setProgress
      );
      
      setCurrentVideo(video);
      setGallery((prev) => [video, ...prev]);
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Video generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [settings]);

  // Generate video from image
  const generateFromImage = useCallback(async (prompt: string, imageBase64: string) => {
    if (!imageBase64) {
      setError('Please select an image first');
      return;
    }

    if (!veoService.current.isReady()) {
      setError('Video service not available. Please check API key.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setCurrentVideo(null);

    try {
      const video = await veoService.current.generateVideoFromImage(
        prompt,
        imageBase64,
        settings,
        setProgress
      );
      
      setCurrentVideo(video);
      setGallery((prev) => [video, ...prev]);
    } catch (err) {
      console.error('Image-to-video error:', err);
      setError(err instanceof Error ? err.message : 'Image animation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [settings]);

  // Extend an existing video
  const extendVideo = useCallback(async (video: GeneratedVideo, prompt: string) => {
    if (!video.videoUrl) {
      setError('No video to extend');
      return;
    }

    if (!veoService.current.isReady()) {
      setError('Video service not available. Please check API key.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const extendedVideo = await veoService.current.extendVideo(
        video.videoUrl,
        prompt,
        settings,
        setProgress
      );
      
      setCurrentVideo(extendedVideo);
      setGallery((prev) => [extendedVideo, ...prev]);
    } catch (err) {
      console.error('Video extension error:', err);
      setError(err instanceof Error ? err.message : 'Video extension failed');
    } finally {
      setIsGenerating(false);
    }
  }, [settings]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<VideoSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Remove video from gallery
  const removeFromGallery = useCallback((id: string) => {
    setGallery((prev) => prev.filter((v) => v.id !== id));
    if (currentVideo?.id === id) {
      setCurrentVideo(null);
    }
  }, [currentVideo]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Reset everything
  const reset = useCallback(() => {
    setIsGenerating(false);
    setProgress(initialProgress);
    setCurrentVideo(null);
    setError(null);
  }, []);

  return {
    isGenerating,
    progress,
    currentVideo,
    gallery,
    settings,
    error,
    generateFromText,
    generateFromImage,
    extendVideo,
    updateSettings,
    removeFromGallery,
    clearError,
    reset,
  };
};

export default useVideoGeneration;
