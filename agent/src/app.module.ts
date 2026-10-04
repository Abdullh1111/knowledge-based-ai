import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AiAssistantModule } from './modules/ai-assistant/ai-assistant.module';
import { FilesModule } from './modules/files/files.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { PrismaModule } from './libs/prisma/prisma.module';
import { EmbeddingModule } from './libs/embedding/embedding.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    EmbeddingModule,
    AiAssistantModule,
    FilesModule,
    ConversationsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
