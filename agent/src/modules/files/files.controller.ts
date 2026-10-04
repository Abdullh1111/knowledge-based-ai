import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { memoryStorage } from 'multer';
import { FilesService } from './files.service';
import { extractTextFromBuffer } from './text-extractor.util';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.md', '.csv'];

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name?: string,
    @Body('conversationId') conversationId?: string,
    @Body('messageId') messageId?: string,
  ) {
    this.validateFile(file);

    const content = await extractTextFromBuffer(file.buffer, file.mimetype, file.originalname);

    return this.filesService.create({
      content,
      name: name ?? file.originalname,
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

  private validateFile(file: Express.Multer.File): void {
    if (!file?.buffer || !file.originalname) {
      throw new BadRequestException('Invalid file data');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      );
    }

    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(`File type '${ext}' is not allowed`);
    }
  }
}
