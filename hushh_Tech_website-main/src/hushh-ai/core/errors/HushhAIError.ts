/**
 * Base error class for Hushh AI
 * All custom errors should extend this class
 */
export class HushhAIError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'HushhAIError';
    Object.setPrototypeOf(this, HushhAIError.prototype);
  }
}
