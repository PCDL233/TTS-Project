/// <reference types="jest" />

import { AgentWorkflowExecutor } from './agent-workflow-executor.service';
import type { AgentGraphV1, AgentNode } from './agent.types';

function node(
  id: string,
  type: AgentNode['type'],
  data: AgentNode['data'] = { label: id },
): AgentNode {
  return { id, type, position: { x: 0, y: 0 }, data: { ...data , label: data.label ?? id  } };
}

async function collect(generator: AsyncGenerator<unknown>): Promise<any[]> {
  const events: any[] = [];
  for await (const event of generator) events.push(event);
  return events;
}

describe('AgentWorkflowExecutor', () => {
  const chatService = { callChatCompletion: jest.fn() };
  const ragService = { retrieveWithCitations: jest.fn() };
  const mcpService = { getDecryptedConfig: jest.fn() };
  const clientManager = { getOrCreateClient: jest.fn() };
  const toolService = { callTool: jest.fn() };
  let executor: AgentWorkflowExecutor;

  beforeEach(() => {
    jest.clearAllMocks();
    executor = new AgentWorkflowExecutor(
      chatService as never,
      ragService as never,
      mcpService as never,
      clientManager as never,
      toolService as never,
    );
  });

  it('按顺序执行模板并生成回答', async () => {
    const graph: AgentGraphV1 = {
      schemaVersion: 1,
      nodes: [
        node('start', 'start'),
        node('tpl', 'template', {
          label: '模板',
          template: '问题：{{sys.query}}',
        }),
        node('answer', 'answer', {
          label: '回答',
          template: '{{nodes.tpl.output}}',
        }),
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'tpl' },
        { id: 'e2', source: 'tpl', target: 'answer' },
      ],
    };
    const events = await collect(executor.execute(1, graph, { query: '你好' }));
    const finish = events.find((event) => event.type === 'agent_run_finish');
    expect(finish.status).toBe('success');
    expect(finish.content).toBe('问题：你好');
    expect(finish.trace).toHaveLength(3);
  });

  it.each([
    ['包含', 'true', '是的'],
    ['不包含', 'false', '否'],
  ])('条件节点选择%s分支', async (_label, handle, query) => {
    const graph: AgentGraphV1 = {
      schemaVersion: 1,
      nodes: [
        node('start', 'start'),
        node('condition', 'condition', {
          label: '判断',
          left: 'sys.query',
          operator: 'contains',
          right: '是',
        }),
        node('yes', 'answer', { label: '真回答', template: 'TRUE' }),
        node('no', 'answer', { label: '假回答', template: 'FALSE' }),
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'condition' },
        { id: 'e2', source: 'condition', target: 'yes', sourceHandle: 'true' },
        { id: 'e3', source: 'condition', target: 'no', sourceHandle: 'false' },
      ],
    };
    const events = await collect(executor.execute(1, graph, { query }));
    expect(
      events.find((event) => event.type === 'agent_run_finish').content,
    ).toBe(handle === 'true' ? 'TRUE' : 'FALSE');
  });

  it('LLM 节点使用固定模型、提示词和受限会话历史', async () => {
    chatService.callChatCompletion.mockResolvedValue({
      content: '模型回答',
      reasoningContent: '推理',
      usage: { total_tokens: 12 },
    });
    const graph: AgentGraphV1 = {
      schemaVersion: 1,
      nodes: [
        node('start', 'start'),
        node('llm', 'llm', {
          label: '生成',
          model: 'mimo-test',
          systemPrompt: '系统：{{sys.query}}',
          prompt: '用户：{{sys.query}}',
          includeHistory: true,
          historyTurns: 1,
          temperature: 0.2,
          maxTokens: 256,
        }),
        node('answer', 'answer', {
          label: '回答',
          template: '{{nodes.llm.output}}',
        }),
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'llm' },
        { id: 'e2', source: 'llm', target: 'answer' },
      ],
    };
    const history = [
      { role: 'user', content: '旧问题' },
      { role: 'assistant', content: '旧回答' },
      { role: 'user', content: '最近问题' },
      { role: 'assistant', content: '最近回答' },
    ];

    const events = await collect(
      executor.execute(1, graph, { query: '当前问题', history }),
    );

    expect(chatService.callChatCompletion).toHaveBeenCalledWith(1, {
      model: 'mimo-test',
      messages: [
        { role: 'system', content: '系统：当前问题' },
        { role: 'user', content: '最近问题' },
        { role: 'assistant', content: '最近回答' },
        { role: 'user', content: '用户：当前问题', contentParts: undefined },
      ],
      temperature: 0.2,
      max_completion_tokens: 256,
    });
    expect(
      events.find((event) => event.type === 'agent_run_finish').content,
    ).toBe('模型回答');
  });

  it('将知识检索引用汇总到最终事件', async () => {
    ragService.retrieveWithCitations.mockResolvedValue({
      context: '知识上下文',
      citations: [
        {
          chunkId: 2,
          documentId: 1,
          documentName: '文档',
          chunkIndex: 0,
          source: 'doc.txt',
          content: '内容',
        },
      ],
    });
    const graph: AgentGraphV1 = {
      schemaVersion: 1,
      nodes: [
        node('start', 'start'),
        node('kb', 'knowledge', {
          label: '知识',
          knowledgeBaseId: 3,
          queryTemplate: '{{sys.query}}',
          topK: 5,
        }),
        node('answer', 'answer', {
          label: '回答',
          template: '{{nodes.kb.output}}',
        }),
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'kb' },
        { id: 'e2', source: 'kb', target: 'answer' },
      ],
    };
    const events = await collect(
      executor.execute(7, graph, { query: '查资料' }),
    );
    const finish = events.find((event) => event.type === 'agent_run_finish');
    expect(ragService.retrieveWithCitations).toHaveBeenCalledWith(
      '查资料',
      3,
      5,
      7,
    );
    expect(finish.citations).toHaveLength(1);
  });

  it('MCP 失败时停止并返回失败节点轨迹', async () => {
    mcpService.getDecryptedConfig.mockResolvedValue({
      id: 2,
      name: '工具服务',
      enabled: true,
    });
    clientManager.getOrCreateClient.mockResolvedValue({
      status: 'connected',
      tools: [{ name: 'lookup' }],
    });
    toolService.callTool.mockRejectedValue(new Error('远端服务失败'));
    const graph: AgentGraphV1 = {
      schemaVersion: 1,
      nodes: [
        node('start', 'start'),
        node('tool', 'mcpTool', {
          label: '查工具',
          mcpServerId: 2,
          toolName: 'lookup',
          arguments: {},
        }),
        node('answer', 'answer', {
          label: '回答',
          template: '{{nodes.tool.output}}',
        }),
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'tool' },
        { id: 'e2', source: 'tool', target: 'answer' },
      ],
    };
    const events = await collect(executor.execute(1, graph, { query: 'x' }));
    const finish = events.find((event) => event.type === 'agent_run_finish');
    expect(finish.status).toBe('error');
    expect(finish.content).toContain('远端服务失败');
    expect(finish.trace.at(-1).nodeId).toBe('tool');
  });

  it('MCP 工具调用超过 30 秒后终止当前工作流', async () => {
    jest.useFakeTimers();
    try {
      mcpService.getDecryptedConfig.mockResolvedValue({
        id: 2,
        name: '工具服务',
        enabled: true,
      });
      clientManager.getOrCreateClient.mockResolvedValue({
        status: 'connected',
        tools: [{ name: 'lookup' }],
      });
      toolService.callTool.mockReturnValue(new Promise(() => undefined));
      const graph: AgentGraphV1 = {
        schemaVersion: 1,
        nodes: [
          node('start', 'start'),
          node('tool', 'mcpTool', {
            label: '慢工具',
            mcpServerId: 2,
            toolName: 'lookup',
            arguments: {},
          }),
          node('answer', 'answer', { label: '回答', template: 'ok' }),
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'tool' },
          { id: 'e2', source: 'tool', target: 'answer' },
        ],
      };
      const resultPromise = collect(executor.execute(1, graph, { query: 'x' }));
      await jest.advanceTimersByTimeAsync(30_001);
      const events = await resultPromise;
      const finish = events.find((event) => event.type === 'agent_run_finish');
      expect(finish.status).toBe('error');
      expect(finish.content).toContain('MCP 工具调用超时');
    } finally {
      jest.useRealTimers();
    }
  });

  it('调试输出会脱敏并限制长文本', async () => {
    mcpService.getDecryptedConfig.mockResolvedValue({
      id: 2,
      name: '工具服务',
      enabled: true,
    });
    clientManager.getOrCreateClient.mockResolvedValue({
      status: 'connected',
      tools: [{ name: 'lookup' }],
    });
    toolService.callTool.mockResolvedValue({
      apiKey: 'do-not-show',
      payload: 'x'.repeat(20_000),
    });
    const graph: AgentGraphV1 = {
      schemaVersion: 1,
      nodes: [
        node('start', 'start'),
        node('tool', 'mcpTool', {
          label: '工具',
          mcpServerId: 2,
          toolName: 'lookup',
          arguments: {},
        }),
        node('answer', 'answer', { label: '回答', template: 'ok' }),
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'tool' },
        { id: 'e2', source: 'tool', target: 'answer' },
      ],
    };
    const events = await collect(
      executor.execute(1, graph, { query: 'x', debug: true }),
    );
    const toolFinish = events.find(
      (event) => event.type === 'agent_node_finish' && event.nodeId === 'tool',
    );
    expect(JSON.stringify(toolFinish.output)).not.toContain('do-not-show');
    expect(toolFinish.summary).not.toContain('do-not-show');
    expect(JSON.stringify(toolFinish.output).length).toBeLessThan(5_000);
  });
});
