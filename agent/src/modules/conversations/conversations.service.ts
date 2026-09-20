import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/libs/prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.conversation.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, createdAt: true },
    });
  }

  async findMessages(conversationId: string) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, content: true, role: true, createdAt: true },
    });
  }
}
