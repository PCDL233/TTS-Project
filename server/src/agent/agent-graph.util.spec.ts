import {
  evaluateCondition,
  validateAgentDraftSafety,
  validateAgentGraph,
  validateMcpArgumentBindings,
} from './agent-graph.util';
import type { AgentGraphV1, AgentNode } from './agent.types';

function node(
  id: string,
  type: AgentNode['type'],
  data: AgentNode['data'] = { label: id },
): AgentNode {
  return { id, type, position: { x: 0, y: 0 }, data: { label: id, ...data } };
}

function graph(nodes: AgentNode[], edges: AgentGraphV1['edges']): AgentGraphV1 {
  return { schemaVersion: 1, nodes, edges };
}

const validGraph = (): AgentGraphV1 =>
  graph(
    [
      node('start', 'start'),
      node('tpl', 'template', { label: '模板', template: '{{sys.query}}' }),
      node('answer', 'answer', {
        label: '回答',
        template: '{{nodes.tpl.output}}',
      }),
    ],
    [
      { id: 'e1', source: 'start', target: 'tpl' },
      { id: 'e2', source: 'tpl', target: 'answer' },
    ],
  );

describe('validateAgentGraph', () => {
  it('接受合法的线性工作流', () => {
    expect(validateAgentGraph(validGraph())).toEqual([]);
  });

  it('拒绝环路', () => {
    const target = validGraph();
    target.edges.push({ id: 'cycle', source: 'answer', target: 'tpl' });
    expect(
      validateAgentGraph(target).some((issue) =>
        issue.message.includes('循环'),
      ),
    ).toBe(true);
  });

  it('拒绝孤立节点和无法到达回答的路径', () => {
    const target = validGraph();
    target.nodes.push(
      node('isolated', 'template', { label: '孤立', template: 'x' }),
    );
    expect(
      validateAgentGraph(target).some(
        (issue) =>
          issue.nodeId === 'isolated' && issue.message.includes('无法从开始'),
      ),
    ).toBe(true);
  });

  it('要求条件节点同时具备 true 和 false 分支', () => {
    const target = graph(
      [
        node('start', 'start'),
        node('condition', 'condition', {
          label: '判断',
          left: 'sys.query',
          operator: 'contains',
          right: '是',
        }),
        node('answer', 'answer', { label: '回答', template: '完成' }),
      ],
      [
        { id: 'e1', source: 'start', target: 'condition' },
        {
          id: 'e2',
          source: 'condition',
          target: 'answer',
          sourceHandle: 'true',
        },
      ],
    );
    expect(
      validateAgentGraph(target).some((issue) =>
        issue.message.includes('true 和 false'),
      ),
    ).toBe(true);
  });

  it('拒绝不存在、非上游和任意系统变量引用', () => {
    const missing = validGraph();
    missing.nodes[2].data.template = '{{nodes.missing.output}}';
    expect(
      validateAgentGraph(missing).some((issue) =>
        issue.message.includes('不存在'),
      ),
    ).toBe(true);

    const downstream = validGraph();
    downstream.nodes[1].data.template = '{{nodes.answer.output}}';
    expect(
      validateAgentGraph(downstream).some((issue) =>
        issue.message.includes('只能引用上游'),
      ),
    ).toBe(true);

    const arbitrary = validGraph();
    arbitrary.nodes[1].data.template = '{{sys.secret}}';
    expect(
      validateAgentGraph(arbitrary).some((issue) =>
        issue.message.includes('不允许引用变量'),
      ),
    ).toBe(true);

    const condition = graph(
      [
        node('start', 'start'),
        node('condition', 'condition', {
          label: '判断',
          left: 'process.env',
          operator: 'exists',
        }),
        node('yes', 'answer', { label: '是', template: '是' }),
        node('no', 'answer', { label: '否', template: '否' }),
      ],
      [
        { id: 'e1', source: 'start', target: 'condition' },
        { id: 'e2', source: 'condition', target: 'yes', sourceHandle: 'true' },
        { id: 'e3', source: 'condition', target: 'no', sourceHandle: 'false' },
      ],
    );
    expect(
      validateAgentGraph(condition).some((issue) =>
        issue.message.includes('不允许引用变量 process.env'),
      ),
    ).toBe(true);
  });

  it('限制节点和连线数量，并拒绝保存额外敏感配置', () => {
    const tooMany = graph(
      Array.from({ length: 51 }, (_, index) =>
        node(`n${index}`, index === 0 ? 'start' : 'template', {
          label: '节点',
          template: 'x',
        }),
      ),
      [],
    );
    expect(
      validateAgentDraftSafety(tooMany).some((issue) =>
        issue.message.includes('50'),
      ),
    ).toBe(true);

    const unsafe = validGraph();
    Object.assign(unsafe.nodes[1].data, { apiKey: 'secret' });
    expect(
      validateAgentDraftSafety(unsafe).some((issue) =>
        issue.message.includes('不允许保存'),
      ),
    ).toBe(true);
  });

  it('拒绝 MCP 参数字面量中的敏感字段', () => {
    const unsafe = validGraph();
    unsafe.nodes[1] = node('tool', 'mcpTool', {
      label: '工具',
      mcpServerId: 1,
      toolName: 'lookup',
      arguments: {
        options: {
          mode: 'literal',
          value: { authorization: 'Bearer secret' },
        },
      },
    });
    expect(
      validateAgentDraftSafety(unsafe).some((issue) =>
        issue.message.includes('包含敏感字段'),
      ),
    ).toBe(true);
  });
});

describe('evaluateCondition', () => {
  it('支持字符串、空值和数值比较', () => {
    expect(evaluateCondition('hello', 'contains', 'ell')).toBe(true);
    expect(evaluateCondition('', 'isEmpty', undefined)).toBe(true);
    expect(evaluateCondition(10, 'gte', 9)).toBe(true);
    expect(evaluateCondition(null, 'notExists', undefined)).toBe(true);
  });
});

describe('validateMcpArgumentBindings', () => {
  const schema = {
    type: 'object',
    required: ['count'],
    additionalProperties: false,
    properties: {
      count: { type: 'integer' },
      keyword: { type: 'string', enum: ['新闻', '文档'] },
    },
  };

  it('校验必填参数与字面量类型', () => {
    expect(validateMcpArgumentBindings({}, schema)).toContain(
      '缺少必填工具参数 count',
    );
    expect(
      validateMcpArgumentBindings(
        { count: { mode: 'literal', value: '2' } },
        schema,
      ),
    ).toContain('工具参数 count 的字面量类型应为 integer');
  });

  it('拒绝非字符串参数使用模板及不在 schema 中的参数', () => {
    const errors = validateMcpArgumentBindings(
      {
        count: { mode: 'template', value: '{{sys.query}}' },
        extra: { mode: 'literal', value: true },
      },
      schema,
    );
    expect(errors).toContain('工具参数 count 使用模板时必须是字符串类型');
    expect(errors).toContain('工具参数 extra 不在工具定义中');
  });
});
