import { OpenAIEmbeddings } from '@langchain/openai';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmbeddingService {
  private readonly embeddings = new OpenAIEmbeddings({
    apiKey: process.env.OPENROUTER_API_KEY,
    model: 'qwen/qwen3-embedding-0.6b',
    configuration: { baseURL: 'https://openrouter.ai/api/v1' },
  });

  async getEmbeddings(text: string) {
    return await this.embeddings.embedQuery(text);
  }

  async embeddFile(file: string[]) {
    return await this.embeddings.embedDocuments(file);
  }
}
