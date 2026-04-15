/**
 * Network error - Connection issues, timeouts, etc.
 * These errors are retryable by default
 */
import { HushhAIError } from './HushhAIError';

export class NetworkError extends HushhAIError {
  constructor(message: string, userMessage: string = 'Connection lost. Retrying...') {
    super(
      message,
      'NETWORK_ERROR',
      userMessage,
      true  // Auto-retry network errors
    );
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}
