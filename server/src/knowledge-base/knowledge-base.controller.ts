import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { KnowledgeBaseService } from './knowledge-base.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestWithUser } from '../common/interfaces/request-with-user.interface';

const KB_UPLOAD_DIR = './public/uploads/knowledge-base';

if (!existsSync(KB_UPLOAD_DIR)) {
  mkdirSync(KB_UPLOAD_DIR, { recursive: true });
}

@Controller('knowledge-base')
@UseGuards(JwtAuthGuard)
export class KnowledgeBaseController {
  private readonly logger = new Logger(KnowledgeBaseController.name);

  constructor(private readonly kbService: KnowledgeBaseService) {}

  @Post()
  async create(
    @Req() req: RequestWithUser,
    @Body() body: { name: string; description?: string },
  ) {
    if (!body.name || body.name.trim().length === 0) {
      throw new BadRequestException('知识库名称不能为空');
    }
    return this.kbService.create(req.user.userId, body);
  }

  @Get()
  async findAll(@Req() req: RequestWithUser) {
    return this.kbService.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.kbService.findOne(req.user.userId, Number(id));
  }

  @Delete(':id')
  async remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    await this.kbService.remove(req.user.userId, Number(id));
    return { success: true };
  }

  @Post(':id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: KB_UPLOAD_DIR,
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'text/plain',
          'text/markdown',
        ];
        if (!allowedMimes.includes(file.mimetype)) {
          return cb(new BadRequestException('不支持的文件类型'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadDocument(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('未上传文件');
    }
    return this.kbService.uploadDocument(req.user.userId, Number(id), file);
  }

  @Get(':id/documents')
  async getDocuments(@Param('id') id: string) {
    return this.kbService.getDocuments(Number(id));
  }

  @Delete(':id/documents/:docId')
  async removeDocument(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('docId') docId: string,
  ) {
    await this.kbService.removeDocument(req.user.userId, Number(id), Number(docId));
    return { success: true };
  }

  @Get(':id/documents/:docId/status')
  async getDocumentStatus(@Param('id') id: string, @Param('docId') docId: string) {
    const doc = await this.kbService.getDocumentStatus(Number(id), Number(docId));
    if (!doc) throw new BadRequestException('文档不存在');
    return doc;
  }
}
