/**
 * Media Repository Interface
 * Defines the contract for media operations
 */
import { MediaFile } from '../entities';

export interface MediaLimits {
  dailyUploads: number;
  maxDailyUploads: number;
  remainingUploads: number;
  lastReset: Date;
}

export interface IMediaRepository {
  /**
   * Upload a media file
   */
  upload(file: File, userId: string): Promise<string>;

  /**
   * Get media limits for a user
   */
  getLimits(userId: string): Promise<MediaLimits | null>;

  /**
   * Check if user can upload more media
   */
  canUpload(userId: string): Promise<boolean>;

  /**
   * Increment upload count
   */
  incrementUploadCount(userId: string): Promise<boolean>;

  /**
   * Compress an image file
   */
  compressImage(file: File, maxSizeMB?: number): Promise<File>;
}
