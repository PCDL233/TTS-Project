import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import type { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { ChatService } from './chat.service';
import { ChatCompletionDto } from './dto/chat-completion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LogOperation } from '../common/decorators/log-operation.decorator';
import { AgentChatService } from './agent-chat.service';
import { AgentService } from '../agent/agent.service';
import { AgentWorkflowExecutor } from '../agent/agent-workflow-executor.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly agentChatService: AgentChatService,
    private readonly agentService: AgentService,
    private readonly workflowExecutor: AgentWorkflowExecutor,
  ) {}

  @Get('conversations')
  async getConversations(@Req() req: RequestWithUser) {
    const conversations = await this.chatService.findConversations(
      req.user.userId,
    );
    const descriptors = await this.agentService.getVersionDescriptors(
      req.user.userId,
      conversations
        .map((conversation) => conversation.agentVersionId)
        .filter((id): id is number => !!id),
    );
    return conversations.map((conversation) =>
      Object.assign(
        conversation,
        conversation.agentVersionId
          ? descriptors.get(conversation.agentVersionId)
          : undefined,
      ),
    );
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
      agentId?: number;
    },
  ) {
    if (body.agentId) {
      const { agent, version } = await this.agentService.getPublishedVersion(
        req.user.userId,
        body.agentId,
      );
      const conversation = await this.chatService.createConversation(
        req.user.userId,
        {
          title: body.title || agent.name,
          model: '',
          features: {},
          knowledgeBaseId: null,
          agentId: agent.id,
          agentVersionId: version.id,
        },
      );
      return Object.assign(conversation, {
        agentName: agent.name,
        agentVersion: version.version,
      });
    }
    if (!body.model) throw new BadRequestException('请先选择或输入模型');
    return this.chatService.createConversation(req.user.userId, {
      title: body.title || '新对话',
      model: body.model,
      features: body.features || {},
      knowledgeBaseId: body.knowledgeBaseId,
      agentId: null,
      agentVersionId: null,
    });
  }

  @Patch('conversations/:id')
  updateConversation(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: { title?: string; knowledgeBaseId?: number | null },
  ) {
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
    await this.chatService.removeConversation(req.user.userId, Number(id));
    return { success: true };
  }

  @Get('conversations/:id/messages')
  async getMessages(@Req() req: RequestWithUser, @Param('id') id: string) {
    const conversation = await this.chatService.findConversation(
      req.user.userId,
      Number(id),
    );
    if (!conversation) throw new ForbiddenException('无权访问该会话');
    return this.chatService.findMessages(Number(id));
  }

  @Post('completions')
  @LogOperation('chat', 'completions')
  async completions(
    @Req() req: RequestWithUser,
    @Body() dto: ChatCompletionDto,
    @Res() res: Response,
  ) {
    const conversation = dto.conversationId
      ? await this.chatService.findConversation(
          req.user.userId,
          dto.conversationId,
        )
      : null;
    if (dto.conversationId && !conversation)
      throw new ForbiddenException('无权访问该会话');
    if (!conversation?.agentVersionId && !dto.model)
      throw new BadRequestException('请先选择或输入模型');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.status(HttpStatus.OK);

    let clientDisconnected = false;
    let fullContent = '';
    let fullReasoning = '';
    let agentTrace: any[] | undefined;
    let citations: any[] | undefined;
    const toolCallMap = new Map<string, any>();
    const annotationsSet = new Set<string>();
    const workflowAbort = new AbortController();
    res.on('close', () => {
      clientDisconnected = true;
      workflowAbort.abort();
    });
    const heartbeat = setInterval(() => {
      if (!clientDisconnected) res.write(': heartbeat\n\n');
    }, 15_000);

    try {
      if (conversation?.agentVersionId) {
        const { agent, version } =
          await this.agentService.getVersionForConversation(
            req.user.userId,
            conversation.agentVersionId,
          );
        res.write(
          `data: ${JSON.stringify({ type: 'agent_selected', agentId: agent.id, agentName: agent.name, version: version.version })}\n\n`,
        );
        const lastUserMessage = dto.messages[dto.messages.length - 1];
        const query =
          lastUserMessage?.content ||
          lastUserMessage?.contentParts?.find((part) => part.type === 'text')
            ?.text ||
          '';
        for await (const event of this.workflowExecutor.execute(
          req.user.userId,
          version.graphSnapshot,
          {
            query,
            history: dto.messages.slice(0, -1),
            contentParts: lastUserMessage?.contentParts,
            signal: workflowAbort.signal,
          },
        )) {
          if (clientDisconnected) break;
          res.write(`data: ${JSON.stringify(event)}\n\n`);
          if (event.type === 'agent_run_finish') {
            agentTrace = event.trace;
            citations = event.citations;
            const content = event.content || '';
            for (let i = 0; i < content.length; i += 20) {
              const chunk = content.slice(i, i + 20);
              fullContent += chunk;
              res.write(
                `data: ${JSON.stringify({ content: chunk, finishReason: i + 20 >= content.length ? 'stop' : null })}\n\n`,
              );
            }
          }
        }
      } else {
        const useMcpAgent = dto.mcpEnabled === true;
        const stream = useMcpAgent
          ? this.agentChatService.streamAgentCompletion(req.user.userId, {
              model: dto.model!,
              messages: dto.messages,
              thinking: dto.thinking,
              temperature: dto.temperature,
              max_completion_tokens: dto.max_completion_tokens,
              knowledgeBaseId: dto.knowledgeBaseId,
              roleSettings: dto.roleSettings,
              mcpEnabled: true,
              webSearchEnabled: dto.tools?.some(
                (tool) => tool.type === 'web_search',
              ),
            })
          : this.chatService.streamChatCompletion(req.user.userId, {
              ...dto,
              model: dto.model!,
            });

        for await (const chunk of stream) {
          if (clientDisconnected) break;
          if (
            chunk.type === 'tool_call_start' ||
            chunk.type === 'tool_call_result'
          ) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            continue;
          }
          if (chunk.content) fullContent += chunk.content;
          if (chunk.reasoningContent) fullReasoning += chunk.reasoningContent;
          if (chunk.toolCalls) {
            for (const toolCall of chunk.toolCalls) {
              const existing = toolCallMap.get(toolCall.id);
              if (existing)
                existing.function.arguments +=
                  toolCall.function.arguments || '';
              else
                toolCallMap.set(toolCall.id, {
                  ...toolCall,
                  function: { ...toolCall.function },
                });
            }
          }
          if (chunk.annotations) {
            for (const annotation of chunk.annotations)
              annotationsSet.add(JSON.stringify(annotation));
          }
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      }
      if (!clientDisconnected) res.write('data: [DONE]\n\n');
    } catch (error) {
      this.logger.error(`[completions] ${(error as Error).message}`);
      if (!clientDisconnected) {
        const message =
          error instanceof BadRequestException
            ? error.message
            : '对话请求处理失败，请稍后重试';
        res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      }
    } finally {
      clearInterval(heartbeat);
      if (
        !clientDisconnected &&
        dto.conversationId &&
        (fullContent || fullReasoning || agentTrace)
      ) {
        try {
          const lastUserMessage = dto.messages[dto.messages.length - 1];
          await this.chatService.saveChatPair(
            dto.conversationId,
            lastUserMessage,
            {
              content: fullContent,
              reasoningContent: fullReasoning,
              toolCalls: Array.from(toolCallMap.values()).length
                ? Array.from(toolCallMap.values())
                : undefined,
              annotations: annotationsSet.size
                ? Array.from(annotationsSet).map((value) => JSON.parse(value))
                : undefined,
              agentTrace,
              citations,
            },
          );
        } catch (saveError) {
          this.logger.error(
            `[completions] 保存消息失败: ${(saveError as Error).message}`,
          );
        }
      }
      if (!clientDisconnected) res.end();
    }
  }
}
