import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiAssistantModule } from './modules/ai-assistant/ai-assistant.module';
import { FilesModule } from './modules/files/files.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AiAssistantModule,
    FilesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
