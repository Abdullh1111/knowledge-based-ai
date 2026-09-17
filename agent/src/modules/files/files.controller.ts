import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  async create(@Body('content') content: string) {
    console.log({content});
    return this.filesService.create(content);
  }

  @Get('search')
  async search(@Query('q') query: string) {
    return this.filesService.search(query);
  }

  @Get()
  async findAll() {
    return this.filesService.findAll();
  }
}
