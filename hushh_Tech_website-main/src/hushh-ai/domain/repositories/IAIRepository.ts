/**
 * AI Repository Interface
 * Defines the contract for AI operations
 */
export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIStreamChunk {
  content: string;
  done: boolean;
}

export interface IAIRepository {
  /**
   * Stream AI response
   */
  streamResponse(
    message: string,
    chatId: string,
    userId?: string,
    mediaUrls?: string[],
    history?: AIMessage[]
  ): Promise<ReadableStream<Uint8Array>>;

  /**
   * Cancel ongoing stream
   */
  cancelStream(): void;
}
