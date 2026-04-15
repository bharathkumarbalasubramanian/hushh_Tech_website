/**
 * Input validation utilities
 */
import { ValidationError } from '../errors';
import { LIMITS } from '../constants';

export function validateMessage(message: string): void {
  if (!message.trim()) {
    throw new ValidationError('message', 'Message cannot be empty');
  }

  if (message.length > LIMITS.chat.maxMessageLength) {
    throw new ValidationError(
      'message',
      `Message too long (max ${LIMITS.chat.maxMessageLength} characters)`
    );
  }
}

export function validateFileSize(file: File, maxSizeMB: number): void {
  const maxBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxBytes) {
    throw new ValidationError(
      'file',
      `File too large (max ${maxSizeMB}MB, got ${(file.size / 1024 / 1024).toFixed(2)}MB)`
    );
  }
}

export function validateFileType(file: File, allowedTypes: string[]): void {
  if (!allowedTypes.includes(file.type)) {
    throw new ValidationError(
      'file',
      `File type not supported (${file.type})`
    );
  }
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
