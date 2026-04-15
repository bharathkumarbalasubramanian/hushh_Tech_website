/**
 * Vertex AI Data Source
 * Handles AI streaming via Supabase Edge Function
 */
import { NetworkError, RateLimitError } from '../../core/errors';
import { logger } from '../../core/utils';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class VertexAIDataSource {
  private abortController: AbortController | null = null;

  constructor(
    private supabaseUrl: string,
    private supabaseKey: string
  ) {}

  async streamResponse(
    message: string,
    chatId: string,
    userId?: string,
    mediaUrls?: string[],
    history?: AIMessage[]
  ): Promise<ReadableStream<Uint8Array>> {
    try {
      // Cancel any existing stream
      this.cancelStream();

      this.abortController = new AbortController();

      const response = await fetch(`${this.supabaseUrl}/functions/v1/hushh-ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
        body: JSON.stringify({
          message,
          chatId,
          userId,
          mediaUrls: mediaUrls || [],
          history: history || [],
        }),
        signal: this.abortController.signal,
      });

      if (response.status === 429) {
        const data = await response.json();
        throw new RateLimitError(data.retryAfter || 60);
      }

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('AI response failed', new Error(errorText));
        throw new NetworkError('AI service unavailable');
      }

      if (!response.body) {
        throw new NetworkError('No response stream available');
      }

      return response.body;
    } catch (error) {
      if (error instanceof RateLimitError || error instanceof NetworkError) {
        throw error;
      }

      if ((error as Error).name === 'AbortError') {
        logger.info('AI request cancelled');
        throw new NetworkError('Request cancelled');
      }

      logger.error('Unexpected error streaming AI response', error as Error);
      throw new NetworkError('Failed to get AI response');
    }
  }

  cancelStream(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      logger.debug('AI stream cancelled');
    }
  }
}
