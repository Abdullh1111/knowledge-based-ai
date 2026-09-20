import { Body, Controller, Get, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FileUploadService } from 'src/libs/file-upload/file-upload.service';
import { FilesService } from './files.service';
import { extractTextFromBuffer } from './text-extractor.util';

@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name?: string,
    @Body('conversationId') conversationId?: string,
    @Body('messageId') messageId?: string,
  ) {
    const uploaded = await this.fileUploadService.uploadFile(file, 'files');
    const content = await extractTextFromBuffer(file.buffer, file.mimetype, file.originalname);

    return this.filesService.create({
      content,
      name: name ?? file.originalname,
      url: uploaded.url,
      conversationId,
      messageId,
    });
  }

  @Get('search')
  async search(@Query('q') query: string, @Query('conversationId') conversationId?: string) {
    return this.filesService.search(query, conversationId);
  }

  @Get()
  async findAll(@Query('conversationId') conversationId?: string) {
    return this.filesService.findAll(conversationId);
  }
}
