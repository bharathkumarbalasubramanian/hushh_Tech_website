/**
 * AI Repository Implementation
 * Implements IAIRepository using Vertex AI data source
 */
import { IAIRepository, AIMessage } from '../../domain/repositories';
import { VertexAIDataSource } from '../datasources';

export class AIRepositoryImpl implements IAIRepository {
  constructor(private dataSource: VertexAIDataSource) {}

  async streamResponse(
    message: string,
    chatId: string,
    userId?: string,
    mediaUrls?: string[],
    history?: AIMessage[]
  ): Promise<ReadableStream<Uint8Array>> {
    return this.dataSource.streamResponse(
      message,
      chatId,
      userId,
      mediaUrls,
      history
    );
  }

  cancelStream(): void {
    this.dataSource.cancelStream();
  }
}
