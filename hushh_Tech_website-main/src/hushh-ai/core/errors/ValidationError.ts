/**
 * Validation error - Invalid user input
 * These errors are NOT retryable
 */
import { HushhAIError } from './HushhAIError';

export class ValidationError extends HushhAIError {
  constructor(field: string, message: string) {
    super(
      `Validation failed for ${field}: ${message}`,
      'VALIDATION_ERROR',
      `Please check your ${field}`,
      false  // Don't retry validation errors
    );
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
