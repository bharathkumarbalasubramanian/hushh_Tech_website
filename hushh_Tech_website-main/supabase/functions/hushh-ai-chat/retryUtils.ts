/**
 * Retry Utility with Exponential Backoff
 * For handling transient failures in external API calls (Google Calendar, Vertex AI)
 */

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  retryableErrors: ['503', '504', 'timeout', 'network', 'ECONNRESET', '429', 'ETIMEDOUT'],
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < cfg.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorStr = lastError.message.toLowerCase();

      // Check if error is retryable
      const isRetryable = cfg.retryableErrors.some(err =>
        errorStr.includes(err.toLowerCase())
      );

      if (!isRetryable || attempt === cfg.maxRetries - 1) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        cfg.baseDelay * Math.pow(2, attempt),
        cfg.maxDelay
      );

      console.log(`Attempt ${attempt + 1}/${cfg.maxRetries} failed: ${lastError.message}`);
      console.log(`Retrying in ${delay}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
