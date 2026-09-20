import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [FilesModule],
  controllers: [AiAssistantController],
  providers: [AiAssistantService, ChatGateway],
})
export class AiAssistantModule {}
