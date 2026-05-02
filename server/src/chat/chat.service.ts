import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatConversation } from './chat-conversation.entity';
import { ChatMessage } from './chat-message.entity';
import { ConfigService } from '../config/config.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatConversation)
    private conversationRepository: Repository<ChatConversation>,
    @InjectRepository(ChatMessage)
    private messageRepository: Repository<ChatMessage>,
    private readonly configService: ConfigService,
  ) {}

  // ========== 会话 CRUD ==========

  async findConversations(userId: number): Promise<ChatConversation[]> {
    return this.conversationRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      take: 100,
    });
  }

  async findConversation(userId: number, id: number): Promise<ChatConversation | null> {
    return this.conversationRepository.findOne({ where: { id, userId } });
  }

  async createConversation(userId: number, data: Partial<ChatConversation>): Promise<ChatConversation> {
    const conversation = this.conversationRepository.create({ ...data, userId });
    return this.conversationRepository.save(conversation);
  }

  async updateConversation(userId: number, id: number, data: Partial<ChatConversation>): Promise<ChatConversation> {
    const conversation = await this.findConversation(userId, id);
    if (!conversation) throw new BadRequestException('Conversation not found');
    Object.assign(conversation, data);
    return this.conversationRepository.save(conversation);
  }

  async removeConversation(userId: number, id: number): Promise<void> {
    // 先删除关联消息
    await this.messageRepository.delete({ conversationId: id });
    await this.conversationRepository.delete({ id, userId });
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
    },
  ): Promise<void> {
    // 保存用户消息
    if (userMessage && userMessage.role === 'user') {
      await this.saveMessage({
        conversationId,
        role: 'user',
        content: userMessage.content || '',
        contentParts: userMessage.contentParts,
      });
    }

    // 保存助手消息
    await this.saveMessage({
      conversationId,
      role: 'assistant',
      content: assistantResponse.content,
      reasoningContent: assistantResponse.reasoningContent || '',
      toolCalls: assistantResponse.toolCalls,
      annotations: assistantResponse.annotations,
    });

    // 更新会话时间
    await this.conversationRepository.update(
      { id: conversationId },
      { updatedAt: new Date() },
    );
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
    },
  ): AsyncGenerator<any, void, unknown> {
    const config = await this.configService.getConfig(userId);
    if (!config.apiKey) {
      this.logger.warn('[streamChatCompletion] API Key 未配置');
      throw new BadRequestException('API Key 未配置，请先在「API 设置」中填写有效的 API Key');
    }

    const baseUrl = this.getEffectiveBaseUrl(config);
    this.logger.log(`[streamChatCompletion] 请求 MiMo API: ${baseUrl}/chat/completions`);

    // 构造 MiMo API 消息格式
    const apiMessages = dto.messages.map((msg) => {
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
      stream: true,
    };

    if (dto.thinking) body.thinking = dto.thinking;
    if (dto.tools && dto.tools.length > 0) body.tools = dto.tools;
    if (dto.tool_choice) body.tool_choice = dto.tool_choice;
    if (dto.response_format) body.response_format = dto.response_format;
    if (dto.temperature !== undefined) body.temperature = dto.temperature;
    if (dto.max_completion_tokens !== undefined) body.max_completion_tokens = dto.max_completion_tokens;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`[streamChatCompletion] MiMo API 返回 ${response.status}: ${text}`);
      throw new BadRequestException(`Chat API error: ${response.status} - ${text}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new BadRequestException('Unable to read response stream');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;

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
            const delta = data.choices?.[0]?.delta;
            if (delta) {
              chunkCount++;
              yield {
                content: delta.content || '',
                reasoningContent: delta.reasoning_content || '',
                toolCalls: delta.tool_calls || null,
                annotations: delta.annotations || null,
                finishReason: data.choices?.[0]?.finish_reason || null,
                usage: data.usage || null,
              };
            }
          } catch {
            // ignore parse errors
          }
        }
      }
      this.logger.log(`[streamChatCompletion] 流式完成，共 ${chunkCount} 个 chunk`);
    } finally {
      reader.releaseLock();
    }
  }

  private getEffectiveBaseUrl(config: { baseUrlPreset: string; baseUrlCustom: string }): string {
    if (config.baseUrlPreset === 'custom') {
      return config.baseUrlCustom || 'https://api.xiaomimimo.com/v1';
    }
    const presets: Record<string, string> = {
      default: 'https://api.xiaomimimo.com/v1',
      'token-plan-cn': 'https://token-plan-cn.xiaomimimo.com/v1',
      'token-plan-sgp': 'https://token-plan-sgp.xiaomimimo.com/v1',
      'token-plan-ams': 'https://token-plan-ams.xiaomimimo.com/v1',
    };
    return presets[config.baseUrlPreset] || 'https://api.xiaomimimo.com/v1';
  }
}
