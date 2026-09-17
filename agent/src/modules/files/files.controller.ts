import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  async create(
    @Body('content') content: string,
    @Body('name') name?: string,
    @Body('url') url?: string,
    @Body('conversationId') conversationId?: string,
    @Body('messageId') messageId?: string,
  ) {
    return this.filesService.create({ content, name, url, conversationId, messageId });
  }

  @Get('search')
  async search(@Query('q') query: string, @Query('conversationId') conversationId?: string) {
    return this.filesService.search(query, conversationId);
  }

  @Get()
  async findAll() {
    return this.filesService.findAll();
  }
}
