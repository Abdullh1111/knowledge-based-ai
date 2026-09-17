import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiAssistantModule } from './modules/ai-assistant/ai-assistant.module';
import { FilesModule } from './modules/files/files.module';
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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
