import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatConversation } from './chat-conversation.entity';
import { ChatMessage } from './chat-message.entity';
import { ConfigService } from '../config/config.service';
import { ChatConfigService } from '../chat-config/chat-config.service';
import { RagService } from '../knowledge-base/rag.service';
import { KnowledgeBase } from '../knowledge-base/knowledge-base.entity';
import {
  prependChatRolePrompt,
  resolveChatRolePrompt,
  type ChatRoleSettings,
} from './chat-role.util';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatConversation)
    private conversationRepository: Repository<ChatConversation>,
    @InjectRepository(ChatMessage)
    private messageRepository: Repository<ChatMessage>,
    @InjectRepository(KnowledgeBase)
    private kbRepository: Repository<KnowledgeBase>,
    private readonly configService: ConfigService,
    private readonly chatConfigService: ChatConfigService,
    private readonly ragService: RagService,
  ) {}

  // ========== 会话 CRUD ==========

  async findConversations(userId: number): Promise<ChatConversation[]> {
    return this.conversationRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      take: 100,
    });
  }

  async findConversation(
    userId: number,
    id: number,
  ): Promise<ChatConversation | null> {
    return this.conversationRepository.findOne({ where: { id, userId } });
  }

  async createConversation(
    userId: number,
    data: Partial<ChatConversation>,
  ): Promise<ChatConversation> {
    const conversation = this.conversationRepository.create({
      ...data,
      userId,
    });
    return this.conversationRepository.save(conversation);
  }

  async updateConversation(
    userId: number,
    id: number,
    data: Partial<ChatConversation>,
  ): Promise<ChatConversation> {
    const conversation = await this.findConversation(userId, id);
    if (!conversation) throw new BadRequestException('Conversation not found');
    Object.assign(conversation, data);
    return this.conversationRepository.save(conversation);
  }

  async removeConversation(userId: number, id: number): Promise<void> {
    const conversation = await this.findConversation(userId, id);
    if (!conversation) {
      throw new ForbiddenException('无权删除该会话');
    }
    await this.messageRepository.delete({ conversationId: id });
    await this.conversationRepository.delete({ id });
  }

  // ========== 消息 CRUD ==========

  async findMessages(conversationId: number): Promise<ChatMessage[]> {
    return this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  async saveMessage(data: Partial<ChatMessage>): Promise<ChatMessage> {
    const message = this.messageRepository.create(data);
    return this.messageRepository.save(message);
  }

  async saveChatPair(
    conversationId: number,
    userMessage: { role: string; content?: string; contentParts?: any[] },
    assistantResponse: {
      content: string;
      reasoningContent?: string;
      toolCalls?: any[];
      annotations?: any[];
      agentTrace?: any[];
      citations?: any[];
    },
  ): Promise<void> {
    // 顺序保存，确保用户消息的 createdAt 早于助手消息
    if (userMessage && userMessage.role === 'user') {
      await this.saveMessage({
        conversationId,
        role: 'user',
        content: userMessage.content || '',
        contentParts: userMessage.contentParts,
      });
    }

    await this.saveMessage({
      conversationId,
      role: 'assistant',
      content: assistantResponse.content,
      reasoningContent: assistantResponse.reasoningContent || '',
      toolCalls: assistantResponse.toolCalls,
      annotations: assistantResponse.annotations,
      agentTrace: assistantResponse.agentTrace,
      citations: assistantResponse.citations,
    });

    await this.conversationRepository.update(
      { id: conversationId },
      { updatedAt: new Date() },
    );
  }

  // ========== 流式对话 ==========

  // ========== 内部：构建 API 请求参数（供流式和非流式复用） ==========

  private async buildApiRequest(
    userId: number,
    dto: {
      model: string;
      messages: Array<{ role: string; content?: string; contentParts?: any[] }>;
      thinking?: { type: 'enabled' | 'disabled' };
      tools?: any[];
      tool_choice?: string;
      response_format?: { type: 'text' | 'json_object' };
      temperature?: number;
      max_completion_tokens?: number;
      knowledgeBaseId?: number;
      roleSettings?: ChatRoleSettings;
    },
  ): Promise<{
    baseUrl: string;
    headers: Record<string, string>;
    body: Record<string, any>;
  }> {
    const config = await this.configService.getConfig(userId);
    if (!config.apiKey) {
      this.logger.warn('[buildApiRequest] API Key 未配置');
      throw new BadRequestException(
        'API Key 未配置，请先在「API 设置」中填写有效的 API Key',
      );
    }

    // RAG 增强：如果指定了知识库，注入上下文
    let messages = dto.messages;
    if (dto.knowledgeBaseId) {
      try {
        const lastUserMessage = dto.messages
          .filter((m) => m.role === 'user')
          .pop();
        if (lastUserMessage?.content) {
          const kb = await this.kbRepository.findOne({
            where: { id: dto.knowledgeBaseId },
          });
          const context = await this.ragService.retrieveContext(
            lastUserMessage.content,
            dto.knowledgeBaseId,
            5,
            kb?.embeddingModel,
          );
          if (context) {
            messages = this.ragService.buildAugmentedMessages(
              dto.messages,
              context,
            );
            this.logger.log(
              `[buildApiRequest] 已注入 RAG 上下文，知识库=${dto.knowledgeBaseId}`,
            );
          }
        }
      } catch (ragErr) {
        this.logger.warn(
          `[buildApiRequest] RAG 检索失败，降级处理: ${(ragErr as Error).message}`,
        );
      }
    }

    let rolePrompt: string | null = null;
    if (dto.roleSettings?.enabled) {
      const features = await this.chatConfigService.getFeatures();
      if (features.roleSetting) {
        rolePrompt = resolveChatRolePrompt(dto.roleSettings);
        this.logger.log('[buildApiRequest] 已注入模型角色设定');
      } else {
        this.logger.warn(
          '[buildApiRequest] 后台已关闭模型角色设定，忽略本次角色设置',
        );
      }
    }
    messages = prependChatRolePrompt(messages, rolePrompt);

    const baseUrl = this.configService.getEffectiveBaseUrl(config);
    const isTokenPlanApi = this.configService.isTokenPlanApi(config);

    // Token Plan 仅支持 8 款模型，mimo-v2-flash 不在支持列表中
    const tokenPlanUnsupportedModels = ['mimo-v2-flash'];
    if (tokenPlanUnsupportedModels.includes(dto.model) && isTokenPlanApi) {
      throw new BadRequestException(
        `当前 API 配置（Token Plan）不支持 ${dto.model} 模型。Token Plan 仅支持 MiMo-V2.5-Pro、MiMo-V2.5、MiMo-V2-Pro、MiMo-V2-Omni 及 TTS 系列模型，请切换为普通 API 端点或选择其他模型。`,
      );
    }

    // 联网搜索 / 深度思考在多家 OpenAI 兼容厂商中存在兼容实现；除已知不支持的 Token Plan 外，
    // 不再按 MiMo 厂商限制，交由上游模型接口按自身能力处理。
    const hasWebSearch = dto.tools?.some((t: any) => t.type === 'web_search');
    if (hasWebSearch && isTokenPlanApi) {
      throw new BadRequestException(
        '当前 API 配置（Token Plan）不支持联网搜索（web_search）功能。请切换到普通 API 或其他兼容厂商，或关闭联网搜索后重试。',
      );
    }

    // 构造 MiMo API 消息格式
    const apiMessages = messages.map((msg) => {
      if (msg.contentParts && msg.contentParts.length > 0) {
        return {
          role: msg.role,
          content: msg.contentParts,
        };
      }
      return {
        role: msg.role,
        content: msg.content || '',
      };
    });

    const body: Record<string, any> = {
      model: dto.model,
      messages: apiMessages,
    };

    if (dto.thinking) body.thinking = dto.thinking;
    if (dto.tools && dto.tools.length > 0) body.tools = dto.tools;
    if (dto.tool_choice && dto.tools && dto.tools.length > 0)
      body.tool_choice = dto.tool_choice;
    if (dto.response_format) body.response_format = dto.response_format;
    if (dto.temperature !== undefined) body.temperature = dto.temperature;
    if (dto.max_completion_tokens !== undefined)
      body.max_completion_tokens = dto.max_completion_tokens;

    return {
      baseUrl,
      headers: this.configService.buildApiHeaders(config),
      body,
    };
  }

  // ========== 非流式调用（供 Agent 循环使用） ==========

  async callChatCompletion(
    userId: number,
    dto: {
      model: string;
      messages: Array<{ role: string; content?: string; contentParts?: any[] }>;
      thinking?: { type: 'enabled' | 'disabled' };
      tools?: any[];
      tool_choice?: string;
      response_format?: { type: 'text' | 'json_object' };
      temperature?: number;
      max_completion_tokens?: number;
      knowledgeBaseId?: number;
      roleSettings?: ChatRoleSettings;
    },
  ): Promise<{
    content: string;
    reasoningContent: string;
    toolCalls: any[];
    annotations: any[];
    usage: any;
    finishReason: string | null;
  }> {
    const { baseUrl, headers, body } = await this.buildApiRequest(userId, dto);
    body.stream = false;

    this.logger.debug(
      `[callChatCompletion] 非流式请求 tools 数量: ${body.tools?.length ?? 0}`,
    );

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(
        `[callChatCompletion] 模型 API 返回 ${response.status}: ${text}`,
      );
      throw new BadRequestException(
        `Chat API error: ${response.status} - ${text}`,
      );
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const message = choice?.message || {};

    return {
      content: message.content || '',
      reasoningContent: message.reasoning_content || '',
      toolCalls: message.tool_calls || [],
      annotations: message.annotations || [],
      usage: data.usage || null,
      finishReason: choice?.finish_reason || null,
    };
  }

  // ========== 流式对话 ==========

  async *streamChatCompletion(
    userId: number,
    dto: {
      model: string;
      messages: Array<{ role: string; content?: string; contentParts?: any[] }>;
      stream?: boolean;
      thinking?: { type: 'enabled' | 'disabled' };
      tools?: any[];
      tool_choice?: string;
      response_format?: { type: 'text' | 'json_object' };
      temperature?: number;
      max_completion_tokens?: number;
      knowledgeBaseId?: number;
      roleSettings?: ChatRoleSettings;
    },
  ): AsyncGenerator<any, void, unknown> {
    const { baseUrl, headers, body } = await this.buildApiRequest(userId, dto);
    body.stream = true;

    this.logger.debug(
      `[streamChatCompletion] 请求体 tools 数量: ${body.tools?.length ?? 0}`,
    );

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(
        `[streamChatCompletion] 模型 API 返回 ${response.status}: ${text}`,
      );
      throw new BadRequestException(
        `Chat API error: ${response.status} - ${text}`,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new BadRequestException('Unable to read response stream');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;
    const yieldedAnnotationUrls = new Set<string>();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') continue;

          try {
            const data = JSON.parse(dataStr);
            const choice = data.choices?.[0];
            const delta = choice?.delta;
            if (delta) {
              chunkCount++;
              // annotations 可能出现在多个位置：delta / choice / message / 顶层
              let annotations =
                delta.annotations ||
                choice?.annotations ||
                choice?.message?.annotations ||
                data.annotations ||
                null;
              // 去重：防止同一 annotation 在多个 chunk 中重复出现
              if (annotations) {
                const uniqueAnnotations = annotations.filter((a: any) => {
                  if (!a.url || yieldedAnnotationUrls.has(a.url)) return false;
                  yieldedAnnotationUrls.add(a.url);
                  return true;
                });
                annotations =
                  uniqueAnnotations.length > 0 ? uniqueAnnotations : null;
                if (annotations) {
                  this.logger.debug(
                    `[streamChatCompletion] 收到 annotations: ${JSON.stringify(annotations)}`,
                  );
                }
              }
              // 记录联网搜索用量
              if (data.usage?.web_search_usage) {
                this.logger.log(
                  `[streamChatCompletion] 联网搜索用量: tool_usage=${data.usage.web_search_usage.tool_usage}, page_usage=${data.usage.web_search_usage.page_usage}`,
                );
              }
              yield {
                content: delta.content || '',
                reasoningContent: delta.reasoning_content || '',
                toolCalls: delta.tool_calls || null,
                annotations: annotations,
                finishReason: choice?.finish_reason || null,
                usage: data.usage || null,
              };
            }
          } catch (parseErr) {
            this.logger.debug(
              `[streamChatCompletion] SSE 数据解析失败: ${dataStr}`,
            );
          }
        }
      }
      this.logger.log(
        `[streamChatCompletion] 流式完成，共 ${chunkCount} 个 chunk`,
      );
    } finally {
      reader.releaseLock();
    }
  }
}
