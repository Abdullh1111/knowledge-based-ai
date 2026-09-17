import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EmbeddingService } from 'src/libs/embedding/embedding.service';
import { PrismaService } from 'src/libs/prisma/prisma.service';
import { FileStatus } from 'generated/prisma/enums';

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;
const SEARCH_TOP_K = 5;

interface CreateFileInput {
  content: string;
  name?: string;
  url?: string;
  conversationId?: string;
  messageId?: string;
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingService,
  ) {}

  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + CHUNK_SIZE, text.length);
      chunks.push(text.slice(start, end).trim());

      if (end === text.length) break;
      start = end - CHUNK_OVERLAP;
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }

  private toVectorLiteral(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }

  async create(input: CreateFileInput) {
    const conversationId =
      input.conversationId ?? (await this.prisma.conversation.create({ data: {} })).id;

    const file = await this.prisma.files.create({
      data: {
        name: input.name ?? 'untitled',
        url: input.url,
        content: input.content,
        conversationId,
        messageId: input.messageId,
        status: FileStatus.PROCESSING,
      },
    });

    try {
      const chunks = this.chunkText(input.content);
      const chunkEmbeddings = await this.embeddings.embeddFile(chunks);

      await this.prisma.$transaction(
        chunks.map((chunk, index) => {
          const vector = this.toVectorLiteral(chunkEmbeddings[index]);
          return this.prisma.$executeRaw`
            INSERT INTO "FileChunk" ("id", "content", "chunkIndex", "embedding", "fileId")
            VALUES (${randomUUID()}, ${chunk}, ${index}, ${vector}::vector, ${file.id})
          `;
        }),
      );

      await this.prisma.files.update({
        where: { id: file.id },
        data: { status: FileStatus.COMPLETED },
      });
    } catch (error) {
      await this.prisma.files.update({
        where: { id: file.id },
        data: { status: FileStatus.FAILED },
      });
      throw error;
    }

    return this.prisma.files.findUnique({
      where: { id: file.id },
      include: { chunks: { select: { id: true, chunkIndex: true, content: true } } },
    });
  }

  async search(query: string, conversationId?: string) {
    const embedding = await this.embeddings.getEmbeddings(query);
    const vector = this.toVectorLiteral(embedding);

    if (conversationId) {
      return this.prisma.$queryRaw`
        SELECT fc."id", fc."content", fc."chunkIndex", fc."fileId", f."name", f."url"
        FROM "FileChunk" fc
        JOIN "Files" f ON f."id" = fc."fileId"
        WHERE f."conversationId" = ${conversationId}
        ORDER BY fc."embedding" <=> ${vector}::vector
        LIMIT ${SEARCH_TOP_K}
      `;
    }

    return this.prisma.$queryRaw`
      SELECT fc."id", fc."content", fc."chunkIndex", fc."fileId", f."name", f."url"
      FROM "FileChunk" fc
      JOIN "Files" f ON f."id" = fc."fileId"
      ORDER BY fc."embedding" <=> ${vector}::vector
      LIMIT ${SEARCH_TOP_K}
    `;
  }

  async findAll() {
    return this.prisma.files.findMany();
  }
}
