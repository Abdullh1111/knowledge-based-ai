import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiAssistantModule } from './modules/ai-assistant/ai-assistant.module';
import { FilesModule } from './modules/files/files.module';
import { PrismaModule } from './libs/prisma/prisma.module';
import { EmbeddingModule } from './libs/embedding/embedding.module';
import { FileUploadModule } from './libs/file-upload/file-upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    EmbeddingModule,
    FileUploadModule,
    AiAssistantModule,
    FilesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
