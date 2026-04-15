/**
 * Upload Media Use Case
 * Uploads a media file and optionally compresses it
 */
import { IMediaRepository } from '../../repositories';
import { logger, validateFileSize, validateFileType } from '../../../core/utils';
import { LIMITS, SUPPORTED_FILES } from '../../../core/constants';

export class UploadMediaUseCase {
  constructor(private mediaRepository: IMediaRepository) {}

  async execute(file: File, userId: string, compress: boolean = true): Promise<string> {
    try {
      logger.debug(`Uploading media file: ${file.name} (${file.size} bytes)`);

      // Validate file type
      const allTypes = [
        ...SUPPORTED_FILES.images,
        ...SUPPORTED_FILES.documents,
        ...SUPPORTED_FILES.videos,
      ];
      validateFileType(file, allTypes);

      // Compress images if needed
      let fileToUpload = file;
      if (compress && SUPPORTED_FILES.images.includes(file.type)) {
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > 1) {
          logger.info(`Compressing image from ${sizeMB.toFixed(2)}MB`);
          fileToUpload = await this.mediaRepository.compressImage(file, 1);
          logger.info(`Compressed to ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`);
        }
      }

      // Validate file size after compression
      const maxSize = SUPPORTED_FILES.images.includes(fileToUpload.type)
        ? LIMITS.media.maxImageSizeMB
        : SUPPORTED_FILES.videos.includes(fileToUpload.type)
        ? LIMITS.media.maxVideoSizeMB
        : LIMITS.media.maxDocSizeMB;

      validateFileSize(fileToUpload, maxSize);

      // Upload
      const url = await this.mediaRepository.upload(fileToUpload, userId);
      logger.info(`Uploaded media: ${url}`);
      return url;
    } catch (error) {
      logger.error('Error in UploadMediaUseCase', error as Error);
      throw error;
    }
  }
}
