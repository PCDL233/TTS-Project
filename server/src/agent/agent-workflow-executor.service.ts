import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  AgentCitation,
  AgentGraphV1,
  AgentNode,
  AgentTraceStep,
} from './agent.types';
import { evaluateCondition } from './agent-graph.util';
import { ChatService } from '../chat/chat.service';
import { RagService } from '../knowledge-base/rag.service';
import { McpService } from '../mcp/mcp.service';
import { McpClientManager } from '../mcp/mcp-client-manager.service';
import { McpToolService } from '../mcp/mcp-tool.service';

const SENSITIVE_RE = /key|token|secret|password|api|auth|credential|private/i;
const TOOL_TIMEOUT_MS = 30_000;
const WORKFLOW_TIMEOUT_MS = 180_000;
const MAX_TOOL_RESULT = 16_000;
const MAX_SUMMARY = 2_000;

export interface AgentWorkflowEvent {
  type:
    | 'agent_run_start'
    | 'agent_node_start'
    | 'agent_node_finish'
    | 'agent_node_error'
    | 'agent_run_finish';
  runId: string;
  nodeId?: string;
  nodeType?: string;
  label?: string;
  status?: 'success' | 'error';
  durationMs?: number;
  summary?: string;
  input?: unknown;
  output?: unknown;
  error?: string;
  content?: string;
  reasoningContent?: string;
  trace?: AgentTraceStep[];
  citations?: AgentCitation[];
}

interface WorkflowContext {
  sys: {
    query: string;
    history: Array<{ role: string; content?: string; contentParts?: any[] }>;
    contentParts?: any[];
  };
  nodes: Record<string, Record<string, unknown>>;
}

@Injectable()
export class AgentWorkflowExecutor {
  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    private readonly ragService: RagService,
    private readonly mcpService: McpService,
    private readonly clientManager: McpClientManager,
    private readonly toolService: McpToolService,
  ) {}

  async *execute(
    userId: number,
    graph: AgentGraphV1,
    input: {
      query: string;
      history?: Array<{ role: string; content?: string; contentParts?: any[] }>;
      contentParts?: any[];
      debug?: boolean;
      signal?: AbortSignal;
    },
  ): AsyncGenerator<AgentWorkflowEvent, void, unknown> {
    const runId = randomUUID();
    const trace: AgentTraceStep[] = [];
    const citations: AgentCitation[] = [];
    const context: WorkflowContext = {
      sys: {
        query: input.query,
        history: input.history || [],
        contentParts: input.contentParts,
      },
      nodes: {},
    };
    const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
    const outgoing = new Map<string, typeof graph.edges>();
    for (const node of graph.nodes) outgoing.set(node.id, []);
    for (const edge of graph.edges) outgoing.get(edge.source)?.push(edge);
    let current = graph.nodes.find((node) => node.type === 'start');
    const startedAt = Date.now();

    yield { type: 'agent_run_start', runId };
    while (current) {
      const activeNode = current;
      if (input.signal?.aborted) throw new Error('智能体运行已取消');
      if (Date.now() - startedAt > WORKFLOW_TIMEOUT_MS) {
        throw new Error('智能体运行超过 180 秒，已自动终止');
      }
      const step: AgentTraceStep = {
        nodeId: activeNode.id,
        nodeType: activeNode.type,
        label: activeNode.data.label || activeNode.type,
        status: 'running',
      };
      trace.push(step);
      const nodeStartedAt = Date.now();
      yield {
        type: 'agent_node_start',
        runId,
        nodeId: activeNode.id,
        nodeType: activeNode.type,
        label: step.label,
        input: input.debug
          ? this.preview(this.nodeInput(activeNode, context))
          : undefined,
      };

      try {
        const remainingMs = Math.max(
          1,
          WORKFLOW_TIMEOUT_MS - (Date.now() - startedAt),
        );
        const output = await this.withTimeout(
          this.executeNode(userId, activeNode, context),
          remainingMs,
          '智能体运行超过 180 秒，已自动终止',
          input.signal,
        );
        context.nodes[activeNode.id] = output;
        if (Array.isArray(output.citations))
          citations.push(...(output.citations as AgentCitation[]));
        step.status = 'success';
        step.durationMs = Date.now() - nodeStartedAt;
        step.summary = this.summarize(output);
        yield {
          type: 'agent_node_finish',
          runId,
          nodeId: activeNode.id,
          nodeType: activeNode.type,
          label: step.label,
          status: 'success',
          durationMs: step.durationMs,
          summary: step.summary,
          output: input.debug ? this.preview(output) : undefined,
        };

        if (activeNode.type === 'answer') {
          yield {
            type: 'agent_run_finish',
            runId,
            status: 'success',
            content: String(output.output ?? ''),
            trace,
            citations: this.uniqueCitations(citations),
          };
          return;
        }
        const edges = outgoing.get(activeNode.id) || [];
        const selected =
          activeNode.type === 'condition'
            ? edges.find(
                (edge) =>
                  edge.sourceHandle === (output.result ? 'true' : 'false'),
              )
            : edges[0];
        current = selected ? nodes.get(selected.target) : undefined;
      } catch (error) {
        const rawMessage =
          error instanceof Error ? error.message : '节点执行失败';
        const message = String(this.redact(rawMessage));
        step.status = 'error';
        step.durationMs = Date.now() - nodeStartedAt;
        step.error = message;
        yield {
          type: 'agent_node_error',
          runId,
          nodeId: activeNode.id,
          nodeType: activeNode.type,
          label: step.label,
          status: 'error',
          durationMs: step.durationMs,
          error: message,
        };
        yield {
          type: 'agent_run_finish',
          runId,
          status: 'error',
          content: `智能体在「${step.label}」节点执行失败：${message}`,
          trace,
          citations: this.uniqueCitations(citations),
        };
        return;
      }
    }
    yield {
      type: 'agent_run_finish',
      runId,
      status: 'error',
      content: '智能体未产生最终回答',
      trace,
      citations,
    };
  }

  private async executeNode(
    userId: number,
    node: AgentNode,
    context: WorkflowContext,
  ): Promise<Record<string, unknown>> {
    switch (node.type) {
      case 'start':
        return {
          output: context.sys.query,
          query: context.sys.query,
          history: context.sys.history,
        };
      case 'template':
      case 'answer':
        return { output: this.render(node.data.template || '', context) };
      case 'condition': {
        const left = this.resolveExpression(node.data.left || '', context);
        return {
          output: left,
          result: evaluateCondition(left, node.data.operator!, node.data.right),
        };
      }
      case 'knowledge': {
        const query = this.render(
          node.data.queryTemplate || '{{sys.query}}',
          context,
        );
        const result = await this.ragService.retrieveWithCitations(
          query,
          node.data.knowledgeBaseId!,
          node.data.topK || 5,
          userId,
        );
        return {
          output: result.context,
          context: result.context,
          citations: result.citations,
        };
      }
      case 'llm': {
        const historyTurns = Math.min(
          Math.max(node.data.historyTurns || 10, 1),
          50,
        );
        const messages: Array<{
          role: string;
          content?: string;
          contentParts?: any[];
        }> = [];
        if (node.data.systemPrompt)
          messages.push({
            role: 'system',
            content: this.render(node.data.systemPrompt, context),
          });
        if (node.data.includeHistory !== false)
          messages.push(...context.sys.history.slice(-historyTurns * 2));
        messages.push({
          role: 'user',
          content: this.render(node.data.prompt || '{{sys.query}}', context),
          contentParts: context.sys.contentParts,
        });
        const response = await this.chatService.callChatCompletion(userId, {
          model: node.data.model!,
          messages,
          temperature: node.data.temperature,
          max_completion_tokens: node.data.maxTokens,
        });
        return {
          output: response.content,
          text: response.content,
          reasoningContent: response.reasoningContent,
          usage: response.usage,
        };
      }
      case 'mcpTool': {
        const config = await this.mcpService.getDecryptedConfig(
          userId,
          node.data.mcpServerId!,
        );
        if (!config || !config.enabled)
          throw new Error('MCP 服务器不存在或已禁用');
        const entry = await this.clientManager.getOrCreateClient(config);
        if (!entry || entry.status !== 'connected')
          throw new Error(`MCP 服务器「${config.name}」连接失败`);
        if (!entry.tools.some((tool) => tool.name === node.data.toolName))
          throw new Error('MCP 工具不存在');
        const args: Record<string, unknown> = {};
        for (const [key, binding] of Object.entries(
          node.data.arguments || {},
        )) {
          if (binding.mode === 'literal') args[key] = binding.value;
          else if (binding.mode === 'variable')
            args[key] = this.resolveExpression(
              String(binding.value || ''),
              context,
            );
          else args[key] = this.render(String(binding.value || ''), context);
        }
        const result = await this.withTimeout(
          this.toolService.callTool(entry, node.data.toolName!, args),
          TOOL_TIMEOUT_MS,
          'MCP 工具调用超时',
        );
        const serialized = JSON.stringify(result);
        const limited = serialized.slice(0, MAX_TOOL_RESULT);
        return {
          output: limited,
          result: serialized.length > MAX_TOOL_RESULT ? limited : result,
        };
      }
    }
  }

  private render(template: string, context: WorkflowContext): string {
    return template.replace(
      /\{\{\s*([^{}]+?)\s*\}\}/g,
      (_match, expression: string) => {
        const value = this.resolveExpression(expression, context);
        return typeof value === 'string' ? value : JSON.stringify(value ?? '');
      },
    );
  }

  private resolveExpression(
    expression: string,
    context: WorkflowContext,
  ): unknown {
    const path = expression
      .trim()
      .replace(/^\{\{\s*|\s*\}\}$/g, '')
      .split('.');
    let value: unknown = context;
    for (const key of path) {
      if (!value || typeof value !== 'object') return undefined;
      value = (value as Record<string, unknown>)[key];
    }
    return value;
  }

  private nodeInput(node: AgentNode, context: WorkflowContext): unknown {
    return { config: node.data, sys: context.sys, nodes: context.nodes };
  }

  private summarize(output: Record<string, unknown>): string {
    const value = output.output ?? output.result ?? output;
    return this.stringifyPreview(this.redact(value)).slice(0, MAX_SUMMARY);
  }

  private preview(value: unknown): unknown {
    const safeValue = this.redact(value);
    const serialized = this.stringifyPreview(safeValue);
    if (serialized.length <= MAX_SUMMARY) return safeValue;
    return {
      truncated: true,
      preview: serialized.slice(0, MAX_SUMMARY),
    };
  }

  private stringifyPreview(value: unknown): string {
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value) ?? String(value ?? '');
    } catch {
      return String(value ?? '');
    }
  }

  private redact(value: unknown): unknown {
    if (typeof value === 'string') {
      return value
        .replace(
          /(\"[^\"]*(?:key|token|secret|password|api|auth|credential|private)[^\"]*\"\s*:\s*)\"(?:\\.|[^\"])*\"/gi,
          '$1\"***\"',
        )
        .slice(0, MAX_SUMMARY);
    }
    if (Array.isArray(value)) return value.map((item) => this.redact(item));
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SENSITIVE_RE.test(key) ? '***' : this.redact(item),
      ]),
    );
  }

  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    message: string,
    signal?: AbortSignal,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let settled = false;
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        callback();
      };
      const abort = () => finish(() => reject(new Error('智能体运行已取消')));
      const timer = setTimeout(
        () => finish(() => reject(new Error(message))),
        timeoutMs,
      );
      if (signal?.aborted) {
        abort();
        return;
      }
      signal?.addEventListener('abort', abort, { once: true });
      promise.then(
        (value) => finish(() => resolve(value)),
        (error) => finish(() => reject(error)),
      );
    });
  }

  private uniqueCitations(citations: AgentCitation[]): AgentCitation[] {
    return Array.from(
      new Map(
        citations.map((citation) => [citation.chunkId, citation]),
      ).values(),
    );
  }
}
