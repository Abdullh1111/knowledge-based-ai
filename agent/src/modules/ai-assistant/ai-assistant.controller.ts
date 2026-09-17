import { Body, Controller, Post } from '@nestjs/common';
import { AiAssistantService } from './ai-assistant.service';

class AskDto {
  message: string;
  conversationId?: string;
}

@Controller('ai-assistant')
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post('ask')
  ask(@Body() body: AskDto) {
    return this.aiAssistantService.ask(body.message, body.conversationId);
  }
}
