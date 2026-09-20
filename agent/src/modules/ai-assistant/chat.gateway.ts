import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AiAssistantService } from './ai-assistant.service';

interface ChatMessagePayload {
  message: string;
  conversationId?: string;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @SubscribeMessage('chat:message')
  async handleMessage(
    @MessageBody() payload: ChatMessagePayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const result = await this.aiAssistantService.askStream(
        payload.message,
        payload.conversationId,
        (token) => client.emit('chat:token', { token }),
      );
      client.emit('chat:done', result);
    } catch (error) {
      client.emit('chat:error', {
        message: error instanceof Error ? error.message : 'Something went wrong',
      });
    }
  }
}
