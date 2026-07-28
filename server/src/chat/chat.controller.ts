import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Delete,
  Param,
  Res,
  Req,
  HttpStatus,
  Logger,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import type { RequestWithUser } from '../common/interfaces/request-with-user.interface';

import { ChatService } from './chat.service';
import { ChatCompletionDto } from './dto/chat-completion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LogOperation } from '../common/decorators/log-operation.decorator';
import { AgentChatService } from './agent-chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly agentChatService: AgentChatService,
  ) {}

  // ========== 会话接口 ==========

  @Get('conversations')
  async getConversations(@Req() req: RequestWithUser) {
    this.logger.log(`[getConversations] 用户 ${req.user.userId}`);
    return this.chatService.findConversations(req.user.userId);
  }

  @Post('conversations')
  @LogOperation('chat', 'create-conversation')
  async createConversation(
    @Req() req: RequestWithUser,
    @Body()
    body: {
      title?: string;
      model?: string;
      features?: any;
      knowledgeBaseId?: number;
    },
  ) {
    this.logger.log(`[createConversation] 用户 ${req.user.userId}`);
    if (!body.model) {
      throw new BadRequestException('请先选择或输入模型');
    }
    return this.chatService.createConversation(req.user.userId, {
      title: body.title || '新对话',
      model: body.model,
      features: body.features || {},
      knowledgeBaseId: body.knowledgeBaseId,
    });
  }

  @Patch('conversations/:id')
  async updateConversation(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: { title?: string; knowledgeBaseId?: number | null },
  ) {
    this.logger.log(
      `[updateConversation] 用户 ${req.user.userId} 更新会话 ${id}`,
    );
    return this.chatService.updateConversation(req.user.userId, Number(id), {
      title: body.title,
      knowledgeBaseId: body.knowledgeBaseId ?? undefined,
    });
  }

  @Delete('conversations/:id')
  @LogOperation('chat', 'delete-conversation')
  async deleteConversation(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    this.logger.log(
      `[deleteConversation] 用户 ${req.user.userId} 删除会话 ${id}`,
    );
    await this.chatService.removeConversation(req.user.userId, Number(id));
    return { success: true };
  }

  @Get('conversations/:id/messages')
  async getMessages(@Req() req: RequestWithUser, @Param('id') id: string) {
    this.logger.log(
      `[getMessages] 用户 ${req.user.userId} 查询会话 ${id} 消息`,
    );
    const conversation = await this.chatService.findConversation(
      req.user.userId,
      Number(id),
    );
    if (!conversation) {
      throw new ForbiddenException('无权访问该会话');
    }
    return this.chatService.findMessages(Number(id));
  }

  // ========== 流式对话接口 ==========

  @Post('completions')
  @LogOperation('chat', 'completions')
  async completions(
    @Req() req: RequestWithUser,
    @Body() dto: ChatCompletionDto,
    @Res() res: Response,
  ) {
    this.logger.log(
      `[completions] 用户 ${req.user.userId} 请求对话，model=${dto.model}, kb=${dto.knowledgeBaseId || 'none'}, mcp=${dto.mcpEnabled ?? false}`,
    );
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.status(HttpStatus.OK);

    let clientDisconnected = false;
    let fullContent = '';
    let fullReasoning = '';
    const toolCallMap = new Map<string, any>();
    const annotationsSet = new Set<string>();
    const mcpToolCalls: any[] = [];

    // 监听客户端断开
    req.on('close', () => {
      clientDisconnected = true;
      this.logger.debug(`[completions] 用户 ${req.user.userId} 客户端断开连接`);
    });

    // 心跳机制
    const heartbeat = setInterval(() => {
      if (!clientDisconnected) {
        res.write(': heartbeat\n\n');
      }
    }, 30000);

    try {
      const useAgent = dto.mcpEnabled === true;
      const stream = useAgent
        ? this.agentChatService.streamAgentCompletion(req.user.userId, {
            model: dto.model,
            messages: dto.messages,
            thinking: dto.thinking,
            temperature: dto.temperature,
            max_completion_tokens: dto.max_completion_tokens,
            knowledgeBaseId: dto.knowledgeBaseId,
            roleSettings: dto.roleSettings,
            mcpEnabled: true,
            webSearchEnabled: dto.tools?.some(
              (t: any) => t.type === 'web_search',
            ),
          })
        : this.chatService.streamChatCompletion(req.user.userId, dto);

      for await (const chunk of stream) {
        if (clientDisconnected) break;

        if (chunk.type === 'tool_call_start') {
          mcpToolCalls.push({ phase: 'start', ...chunk });
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          continue;
        }
        if (chunk.type === 'tool_call_result') {
          mcpToolCalls.push({ phase: 'result', ...chunk });
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          continue;
        }

        if (chunk.content) fullContent += chunk.content;
        if (chunk.reasoningContent) fullReasoning += chunk.reasoningContent;
        if (chunk.toolCalls) {
          for (const tc of chunk.toolCalls) {
            const existing = toolCallMap.get(tc.id);
            if (existing) {
              existing.function.arguments += tc.function.arguments || '';
            } else {
              toolCallMap.set(tc.id, { ...tc, function: { ...tc.function } });
            }
          }
        }
        if (chunk.annotations) {
          for (const anno of chunk.annotations) {
            annotationsSet.add(JSON.stringify(anno));
          }
        }
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      if (!clientDisconnected) {
        res.write('data: [DONE]\n\n');
        this.logger.log(`[completions] 用户 ${req.user.userId} 对话完成`);
      }
    } catch (err) {
      this.logger.error(`[completions] 错误: ${(err as Error).message}`);
      if (!clientDisconnected) {
        const errorMsg =
          err instanceof BadRequestException
            ? (err as Error).message
            : '对话请求处理失败，请稍后重试';
        res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
      }
    } finally {
      clearInterval(heartbeat);
      if (
        !clientDisconnected &&
        dto.conversationId &&
        (fullContent || fullReasoning)
      ) {
        try {
          const lastUserMessage = dto.messages[dto.messages.length - 1];
          const fullToolCalls = Array.from(toolCallMap.values());
          const fullAnnotations = Array.from(annotationsSet).map((s) =>
            JSON.parse(s),
          );
          await this.chatService.saveChatPair(
            dto.conversationId,
            lastUserMessage,
            {
              content: fullContent,
              reasoningContent: fullReasoning,
              toolCalls: fullToolCalls.length > 0 ? fullToolCalls : undefined,
              annotations:
                fullAnnotations.length > 0 ? fullAnnotations : undefined,
            },
          );
          this.logger.log(
            `[completions] 会话 ${dto.conversationId} 消息已保存`,
          );
        } catch (saveErr) {
          this.logger.error(
            `[completions] 保存消息失败: ${(saveErr as Error).message}`,
          );
        }
      }
      if (!clientDisconnected) {
        res.end();
      }
    }
  }
}
