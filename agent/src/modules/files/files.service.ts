import { Injectable } from '@nestjs/common';
import { EmbeddingService } from 'src/libs/embedding/embedding.service';
import { PrismaService } from 'src/libs/prisma/prisma.service';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingService,
  ) {}

  async create(content: string) {
    const id = Math.floor(Math.random() * 100000);
    const embedding = await this.embeddings.getEmbeddings(content);
    const vector = `[${embedding.join(',')}]`;
    await this.prisma.$executeRaw`
  INSERT INTO "Files" (
    "id",
    "name",
    "content",
    "embedding"
  )
  VALUES (
    ${id},
    ${'test'},
    ${content},
    ${vector}::vector
  )
`;

    return {
      name: 'test',
      content,
      embedding: embedding.length,
    };
  }

  async search(query: string) {
    const embedding = await this.embeddings.getEmbeddings(query);
    const vector = `[${embedding.join(',')}]`;
    const result = await this.prisma.$queryRaw`
    SELECT *
    FROM "Files"
    ORDER BY embedding <-> ${vector}::vector
    LIMIT 1
  `;

    return result;
  }

  async findAll() {
    return await this.prisma.files.findMany();
  }
}
