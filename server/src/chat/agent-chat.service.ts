import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatService } from './chat.service';
import { McpClientManager } from '../mcp/mcp-client-manager.service';
import { McpToolService } from '../mcp/mcp-tool.service';
import { McpServerConfig } from '../mcp/mcp-server-config.entity';

const MAX_AGENT_TURNS = 10;
const TOOL_TIMEOUT_MS = 30000;

@Injectable()
export class AgentChatService {
  private readonly logger = new Logger(AgentChatService.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly clientManager: McpClientManager,
    private readonly toolService: McpToolService,
    @InjectRepository(McpServerConfig)
    private readonly mcpConfigRepository: Repository<McpServerConfig>,
  ) {}

  /**
   * 带 MCP 工具的 ReAct Agent 流式对话
   *
   * 流程：
   * 1. 获取用户启用的 MCP 配置和工具
   * 2. 调用 LLM（非流式）判断是否需要 tool_calls
   * 3. 如有 tool_calls，并行执行所有工具
   * 4. 将结果追加为 tool 角色消息，再次调用 LLM
   * 5. 循环直到获得最终文本回复，流式 yield
   */
  async *streamAgentCompletion(
    userId: number,
    dto: {
      model: string;
      messages: Array<{ role: string; content?: string; contentParts?: any[] }>;
      thinking?: { type: 'enabled' | 'disabled' };
      temperature?: number;
      max_completion_tokens?: number;
      knowledgeBaseId?: number;
      mcpEnabled?: boolean;
      webSearchEnabled?: boolean;
    },
  ): AsyncGenerator<any, void, unknown> {
    // 1. 获取 MCP 工具
    let mcpTools: Array<{ type: 'function'; function: any }> = [];
    let mcpConfigs: McpServerConfig[] = [];

    if (dto.mcpEnabled !== false) {
      mcpConfigs = await this.mcpConfigRepository.find({
        where: { userId, enabled: true },
      });
      if (mcpConfigs.length > 0) {
        mcpTools = await this.toolService.getFunctionToolsForUser(mcpConfigs);
      }
      this.logger.log(
        `[Agent] 用户 ${userId} 启用 ${mcpConfigs.length} 个 MCP 服务器，共 ${mcpTools.length} 个工具`,
      );
    }

    // 2. 组装 tools（MCP + web_search）
    const allTools: any[] = [...mcpTools];
    if (dto.webSearchEnabled) {
      allTools.push({ type: 'web_search' });
    }

    // 3. ReAct 循环
    let turnCount = 0;
    let currentMessages = [...dto.messages];
    let finalAssistantMessage: {
      content: string;
      reasoningContent: string;
      toolCalls: any[];
      annotations: any[];
      usage: any;
    } | null = null;

    while (turnCount < MAX_AGENT_TURNS) {
      turnCount++;
      this.logger.debug(`[Agent] 第 ${turnCount} 轮 LLM 调用`);

      const llmResponse = await this.chatService.callChatCompletion(userId, {
        model: dto.model,
        messages: currentMessages,
        thinking: dto.thinking,
        tools: allTools.length > 0 ? allTools : undefined,
        tool_choice: allTools.length > 0 ? 'auto' : undefined,
        temperature: dto.temperature,
        max_completion_tokens: dto.max_completion_tokens,
        knowledgeBaseId: dto.knowledgeBaseId,
      });

      // 如果 LLM 返回了文本内容且没有 tool_calls，即为最终回复
      if ((llmResponse.content || llmResponse.reasoningContent) && llmResponse.toolCalls.length === 0) {
        finalAssistantMessage = {
          content: llmResponse.content,
          reasoningContent: llmResponse.reasoningContent,
          toolCalls: [],
          annotations: llmResponse.annotations || [],
          usage: llmResponse.usage,
        };
        break;
      }

      // 如果返回了 tool_calls
      if (llmResponse.toolCalls.length > 0) {
        // yield 工具调用开始事件
        yield {
          type: 'tool_call_start',
          toolCalls: llmResponse.toolCalls,
        };

        // 追加 assistant 的 tool_calls 消息到上下文
        currentMessages.push({
          role: 'assistant',
          content: llmResponse.content || '',
          tool_calls: llmResponse.toolCalls,
        } as any);

        // 并行执行所有工具调用
        const toolCallPromises = llmResponse.toolCalls.map(async (tc: any) => {
          const parsed = this.toolService.parseToolName(tc.function?.name);
          if (!parsed) {
            // 非 MCP 工具（如 web_search）或不识别的工具
            if (tc.function?.name === 'web_search') {
              // web_search 由 MiMo API 内部处理，不需要我们执行
              return {
                id: tc.id,
                name: tc.function.name,
                result: null,
                error: null,
                isInternal: true,
              };
            }
            return {
              id: tc.id,
              name: tc.function?.name || 'unknown',
              result: null,
              error: `未知工具名称格式: ${tc.function?.name}`,
              isInternal: false,
            };
          }

          let args: Record<string, any> = {};
          try {
            args = JSON.parse(tc.function.arguments || '{}');
          } catch {
            return {
              id: tc.id,
              name: tc.function.name,
              result: null,
              error: `工具参数 JSON 解析失败: ${tc.function.arguments}`,
              isInternal: false,
            };
          }

          const config = mcpConfigs.find((c) => c.id === parsed.configId);
          if (!config) {
            return {
              id: tc.id,
              name: tc.function.name,
              result: null,
              error: `MCP 配置 ${parsed.configId} 不存在或已禁用`,
              isInternal: false,
            };
          }

          const entry = await this.clientManager.getOrCreateClient(config);
          if (!entry) {
            return {
              id: tc.id,
              name: tc.function.name,
              result: null,
              error: `MCP 服务器 ${config.name} 连接失败`,
              isInternal: false,
            };
          }

          try {
            const result = await Promise.race([
              this.toolService.callTool(entry, parsed.toolName, args),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('工具调用超时')), TOOL_TIMEOUT_MS),
              ),
            ]);
            return {
              id: tc.id,
              name: tc.function.name,
              result,
              error: null,
              isInternal: false,
            };
          } catch (err) {
            return {
              id: tc.id,
              name: tc.function.name,
              result: null,
              error: (err as Error).message,
              isInternal: false,
            };
          }
        });

        const results = await Promise.allSettled(toolCallPromises);

        // yield 每个工具的结果
        for (const r of results) {
          if (r.status === 'fulfilled') {
            const val = r.value;

            // 内部工具（如 web_search）跳过
            if (val.isInternal) continue;

            yield {
              type: 'tool_call_result',
              toolCallId: val.id,
              name: val.name,
              status: val.error ? 'error' : 'success',
              result: val.result
                ? JSON.stringify(val.result).slice(0, 8000)
                : undefined,
              error: val.error || undefined,
            };

            // 追加 tool 角色消息
            const toolContent = val.error
              ? `错误: ${val.error}`
              : JSON.stringify(val.result);
            currentMessages.push({
              role: 'tool',
              tool_call_id: val.id,
              content: toolContent.slice(0, 16000),
            } as any);
          }
        }

        continue; // 进入下一轮 LLM 调用
      }

      // 异常情况：无 content 也无 tool_calls
      finalAssistantMessage = {
        content: llmResponse.content || '',
        reasoningContent: llmResponse.reasoningContent || '',
        toolCalls: llmResponse.toolCalls,
        annotations: llmResponse.annotations || [],
        usage: llmResponse.usage,
      };
      break;
    }

    if (turnCount >= MAX_AGENT_TURNS && !finalAssistantMessage) {
      this.logger.warn(`[Agent] 用户 ${userId} 达到最大轮次 ${MAX_AGENT_TURNS}`);
      finalAssistantMessage = {
        content: '（工具调用次数达到上限，未能完成全部操作。请尝试简化您的请求。）',
        reasoningContent: '',
        toolCalls: [],
        annotations: [],
        usage: null,
      };
    }

    // 最终回复：流式输出（模拟流式，一次性 yield 全部内容）
    if (finalAssistantMessage) {
      // 为了前端体验，将最终内容分片 yield（每 20 个字符一段）
      const fullContent = finalAssistantMessage.content;
      const chunkSize = 20;
      for (let i = 0; i < fullContent.length; i += chunkSize) {
        yield {
          content: fullContent.slice(i, i + chunkSize),
          reasoningContent: i === 0 ? finalAssistantMessage.reasoningContent : '',
          toolCalls: null,
          annotations: i === 0 ? finalAssistantMessage.annotations : null,
          finishReason: i + chunkSize >= fullContent.length ? 'stop' : null,
          usage: i === 0 ? finalAssistantMessage.usage : null,
        };
      }

      // 如果内容为空但有 reasoningContent
      if (!fullContent && finalAssistantMessage.reasoningContent) {
        yield {
          content: '',
          reasoningContent: finalAssistantMessage.reasoningContent,
          toolCalls: null,
          annotations: finalAssistantMessage.annotations,
          finishReason: 'stop',
          usage: finalAssistantMessage.usage,
        };
      }
    }
  }
}
