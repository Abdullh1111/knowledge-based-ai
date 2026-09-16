import { Module } from '@nestjs/common';
import { AiAssistantModule } from './modules/ai-assistant/ai-assistant.module';
import { FilesModule } from './modules/files/files.module';

@Module({
  imports: [AiAssistantModule, FilesModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
