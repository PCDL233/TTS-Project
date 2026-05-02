import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  Res,
  Req,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import type { Response, Request } from 'express';

interface RequestWithUser extends Request {
  user: { userId: number; username: string };
}

import { ChatService } from './chat.service';
import { ChatCompletionDto } from './dto/chat-completion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  // ========== 会话接口 ==========

  @Get('conversations')
  async getConversations(@Req() req: RequestWithUser) {
    this.logger.log(`[getConversations] 用户 ${req.user.userId}`);
    return this.chatService.findConversations(req.user.userId);
  }

  @Post('conversations')
  async createConversation(
    @Req() req: RequestWithUser,
    @Body() body: { title?: string; model?: string; features?: any },
  ) {
    this.logger.log(`[createConversation] 用户 ${req.user.userId}`);
    return this.chatService.createConversation(req.user.userId, {
      title: body.title || '新对话',
      model: body.model || 'mimo-v2.5-pro',
      features: body.features || {},
    });
  }

  @Delete('conversations/:id')
  async deleteConversation(@Req() req: RequestWithUser, @Param('id') id: string) {
    this.logger.log(`[deleteConversation] 用户 ${req.user.userId} 删除会话 ${id}`);
    await this.chatService.removeConversation(req.user.userId, Number(id));
    return { success: true };
  }

  @Get('conversations/:id/messages')
  async getMessages(@Req() req: RequestWithUser, @Param('id') id: string) {
    this.logger.log(`[getMessages] 用户 ${req.user.userId} 查询会话 ${id} 消息`);
    return this.chatService.findMessages(Number(id));
  }

  // ========== 流式对话接口 ==========

  @Post('completions')
  async completions(
    @Req() req: RequestWithUser,
    @Body() dto: ChatCompletionDto,
    @Res() res: Response,
  ) {
    this.logger.log(`[completions] 用户 ${req.user.userId} 请求对话，model=${dto.model}`);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.status(HttpStatus.OK);

    try {
      const stream = this.chatService.streamChatCompletion(req.user.userId, dto);
      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      this.logger.log(`[completions] 用户 ${req.user.userId} 对话完成`);
    } catch (err) {
      this.logger.error(`[completions] 错误: ${(err as Error).message}`);
      res.write(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`);
    } finally {
      res.end();
    }
  }
}
