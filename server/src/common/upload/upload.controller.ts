import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { JwtAuthGuard } from '../../auth/jwt-auth.guard'
import { Request } from 'express'
import { Req } from '@nestjs/common'

const UPLOAD_DIR = './public/uploads/avatars'
const MEDIA_UPLOAD_DIR = './public/uploads/media'

if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true })
}
if (!existsSync(MEDIA_UPLOAD_DIR)) {
  mkdirSync(MEDIA_UPLOAD_DIR, { recursive: true })
}

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
          cb(null, uniqueSuffix + extname(file.originalname))
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp|jpg)$/)) {
          return cb(new BadRequestException('只允许上传图片文件'), false)
        }
        cb(null, true)
      },
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request & { user: { userId: number } },
  ) {
    const url = `/uploads/avatars/${file.filename}`
    return {
      url,
      filename: file.filename,
      userId: req.user.userId,
    }
  }

  @Post('file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: MEDIA_UPLOAD_DIR,
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
          cb(null, uniqueSuffix + extname(file.originalname))
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowedTypes = /^(image|audio|video)\//
        if (!allowedTypes.test(file.mimetype)) {
          return cb(new BadRequestException('只允许上传图片、音频或视频文件'), false)
        }
        cb(null, true)
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request & { user: { userId: number } },
  ) {
    const url = `/uploads/media/${file.filename}`
    return {
      url,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      userId: req.user.userId,
    }
  }
}
