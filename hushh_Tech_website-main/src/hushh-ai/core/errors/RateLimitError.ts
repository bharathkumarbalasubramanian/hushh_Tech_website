/**
 * Rate limit error - Too many requests
 * These errors should show countdown timer
 */
import { HushhAIError } from './HushhAIError';

export class RateLimitError extends HushhAIError {
  constructor(
    public retryAfter: number,  // Seconds until retry
    message: string = 'Rate limit exceeded'
  ) {
    super(
      message,
      'RATE_LIMIT_ERROR',
      `Too many requests. Try again in ${retryAfter}s`,
      false  // Don't auto-retry, show countdown instead
    );
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}
