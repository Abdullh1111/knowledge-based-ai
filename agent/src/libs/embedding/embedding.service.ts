import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private embeddings!: HuggingFaceTransformersEmbeddings;

  async onModuleInit() {
    console.log('Loading embeddings models');

    this.embeddings = new HuggingFaceTransformersEmbeddings({
      model: 'Xenova/all-MiniLM-L6-v2',
    });

    await this.embeddings.embedQuery('initialization');

    console.log('Embeddings models loaded');
  }

  async getEmbeddings(text: string) {
    return await this.embeddings.embedQuery(text);
  }

  async embeddFile(file: string[]) {
    return await this.embeddings.embedDocuments(file);
  }
}
