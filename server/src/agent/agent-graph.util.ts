import type {
  AgentConditionOperator,
  AgentGraphV1,
  AgentNode,
  AgentValidationIssue,
} from './agent.types';

const NODE_LIMIT = 50;
const EDGE_LIMIT = 100;
const VARIABLE_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;
const SENSITIVE_KEY_RE =
  /key|token|secret|password|api|auth|credential|private/i;
const NODE_TYPES = new Set([
  'start',
  'llm',
  'knowledge',
  'mcpTool',
  'template',
  'condition',
  'answer',
]);
const NODE_DATA_KEYS = new Set([
  'label',
  'model',
  'systemPrompt',
  'prompt',
  'temperature',
  'maxTokens',
  'includeHistory',
  'historyTurns',
  'knowledgeBaseId',
  'queryTemplate',
  'topK',
  'mcpServerId',
  'toolName',
  'arguments',
  'template',
  'left',
  'operator',
  'right',
]);
const SYSTEM_VARIABLES = new Set([
  'sys.query',
  'sys.history',
  'sys.contentParts',
]);

function templatesOf(node: AgentNode): string[] {
  const values = [
    node.data.systemPrompt,
    node.data.prompt,
    node.data.queryTemplate,
    node.data.template,
  ];
  for (const binding of Object.values(node.data.arguments || {})) {
    if (binding.mode !== 'literal' && typeof binding.value === 'string') {
      values.push(binding.value);
    }
  }
  return values.filter((value): value is string => typeof value === 'string');
}

function hasPath(
  adjacency: Map<string, string[]>,
  from: string,
  to: string,
): boolean {
  const stack = [from];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === to) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    stack.push(...(adjacency.get(current) || []));
  }
  return false;
}

function findSensitiveLiteralField(value: unknown, path = ''): string | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findSensitiveLiteralField(
        value[index],
        `${path}[${index}]`,
      );
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (SENSITIVE_KEY_RE.test(key) && item !== null && item !== '')
      return nextPath;
    const found = findSensitiveLiteralField(item, nextPath);
    if (found) return found;
  }
  return null;
}

export function validateAgentDraftSafety(
  graph: AgentGraphV1,
): AgentValidationIssue[] {
  if (
    !graph ||
    graph.schemaVersion !== 1 ||
    !Array.isArray(graph.nodes) ||
    !Array.isArray(graph.edges)
  ) {
    return [{ message: '工作流格式无效或版本不受支持' }];
  }
  const issues: AgentValidationIssue[] = [];
  if (graph.nodes.length > NODE_LIMIT)
    issues.push({ message: `节点数量不能超过 ${NODE_LIMIT}` });
  if (graph.edges.length > EDGE_LIMIT)
    issues.push({ message: `连线数量不能超过 ${EDGE_LIMIT}` });
  for (const node of graph.nodes) {
    if (!node.id || typeof node.id !== 'string')
      issues.push({ message: '节点 ID 无效' });
    if (!NODE_TYPES.has(node.type))
      issues.push({ nodeId: node.id, message: '包含不支持的节点类型' });
    if (
      !node.position ||
      !Number.isFinite(node.position.x) ||
      !Number.isFinite(node.position.y)
    ) {
      issues.push({ nodeId: node.id, message: '节点坐标无效' });
    }
    if (!node.data || typeof node.data !== 'object') {
      issues.push({ nodeId: node.id, message: '节点配置无效' });
      continue;
    }
    const unknownKeys = Object.keys(node.data).filter(
      (key) => !NODE_DATA_KEYS.has(key),
    );
    if (unknownKeys.length > 0) {
      issues.push({
        nodeId: node.id,
        message: `节点包含不允许保存的配置字段：${unknownKeys.join('、')}`,
      });
    }
    for (const [name, binding] of Object.entries(node.data.arguments || {})) {
      if (
        !binding ||
        !['literal', 'variable', 'template'].includes(binding.mode)
      ) {
        issues.push({
          nodeId: node.id,
          message: `工具参数 ${name} 的绑定模式无效`,
        });
      }
      if (binding?.mode === 'literal') {
        const hasValue =
          binding.value !== undefined &&
          binding.value !== null &&
          binding.value !== '';
        if (hasValue && SENSITIVE_KEY_RE.test(name)) {
          issues.push({
            nodeId: node.id,
            message: `工具参数 ${name} 不允许在工作流中保存敏感字面量`,
          });
        }
        const sensitivePath = findSensitiveLiteralField(binding.value);
        if (sensitivePath) {
          issues.push({
            nodeId: node.id,
            message: `工具参数 ${name} 的字面量包含敏感字段 ${sensitivePath}`,
          });
        }
      }
    }
  }
  return issues;
}

function validateExpression(
  expression: string,
  node: AgentNode,
  nodes: Map<string, AgentNode>,
  adjacency: Map<string, string[]>,
): string | null {
  const path = expression.trim();
  if (SYSTEM_VARIABLES.has(path)) return null;
  const nodeMatch = path.match(
    /^nodes\.([^.]+)\.(output|text|context|result|reasoningContent|usage|citations)$/,
  );
  if (!nodeMatch) return `不允许引用变量 ${path}`;
  const referencedId = nodeMatch[1];
  if (!nodes.has(referencedId)) return `变量引用了不存在的节点 ${referencedId}`;
  if (referencedId === node.id || !hasPath(adjacency, referencedId, node.id))
    return `只能引用上游节点 ${referencedId} 的输出`;
  return null;
}

export function validateAgentGraph(
  graph: AgentGraphV1,
): AgentValidationIssue[] {
  const issues = validateAgentDraftSafety(graph);
  if (
    !graph ||
    graph.schemaVersion !== 1 ||
    !Array.isArray(graph.nodes) ||
    !Array.isArray(graph.edges)
  )
    return issues;

  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  if (nodes.size !== graph.nodes.length)
    issues.push({ message: '节点 ID 不能重复' });
  const starts = graph.nodes.filter((node) => node.type === 'start');
  const answers = graph.nodes.filter((node) => node.type === 'answer');
  if (starts.length !== 1)
    issues.push({ message: '工作流必须且只能包含一个开始节点' });
  if (answers.length === 0)
    issues.push({ message: '工作流至少需要一个回答结束节点' });

  const adjacency = new Map<string, string[]>();
  const outgoing = new Map<string, typeof graph.edges>();
  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
    outgoing.set(node.id, []);
  }
  for (const edge of graph.edges) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) {
      issues.push({ edgeId: edge.id, message: '连线引用了不存在的节点' });
      continue;
    }
    adjacency.get(edge.source)!.push(edge.target);
    outgoing.get(edge.source)!.push(edge);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const detectCycle = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const next of adjacency.get(id) || []) {
      if (detectCycle(next)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  for (const node of graph.nodes) {
    if (detectCycle(node.id)) {
      issues.push({ nodeId: node.id, message: '工作流不允许出现循环' });
      break;
    }
  }

  if (starts.length === 1) {
    const reachable = new Set<string>();
    const stack = [starts[0].id];
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (reachable.has(id)) continue;
      reachable.add(id);
      stack.push(...(adjacency.get(id) || []));
    }
    for (const node of graph.nodes) {
      if (!reachable.has(node.id))
        issues.push({ nodeId: node.id, message: '节点无法从开始节点到达' });
    }
  }

  for (const node of graph.nodes) {
    const edges = outgoing.get(node.id) || [];
    if (node.type === 'answer') {
      if (edges.length > 0)
        issues.push({ nodeId: node.id, message: '回答结束节点不能有后继节点' });
    } else if (node.type === 'condition') {
      const handles = new Set(edges.map((edge) => edge.sourceHandle));
      if (edges.length !== 2 || !handles.has('true') || !handles.has('false')) {
        issues.push({
          nodeId: node.id,
          message: '条件节点必须各有一条 true 和 false 分支',
        });
      }
      if (!node.data.left || !node.data.operator) {
        issues.push({ nodeId: node.id, message: '条件节点配置不完整' });
      } else {
        const wrapped = node.data.left.match(/^\{\{\s*([^{}]+?)\s*\}\}$/);
        const expression = wrapped?.[1] || node.data.left;
        const message = validateExpression(expression, node, nodes, adjacency);
        if (message) issues.push({ nodeId: node.id, message });
      }
    } else if (edges.length !== 1) {
      issues.push({
        nodeId: node.id,
        message: '普通节点必须且只能连接一个后继节点',
      });
    }

    if (node.type === 'llm' && (!node.data.model || !node.data.prompt)) {
      issues.push({
        nodeId: node.id,
        message: 'LLM 节点必须配置模型和用户提示词',
      });
    }
    if (node.type === 'knowledge' && !node.data.knowledgeBaseId) {
      issues.push({ nodeId: node.id, message: '知识检索节点必须选择知识库' });
    }
    if (
      node.type === 'mcpTool' &&
      (!node.data.mcpServerId || !node.data.toolName)
    ) {
      issues.push({
        nodeId: node.id,
        message: 'MCP 工具节点必须选择服务器和工具',
      });
    }
    if (
      (node.type === 'template' || node.type === 'answer') &&
      !node.data.template
    ) {
      issues.push({
        nodeId: node.id,
        message: `${node.data.label || '节点'}必须配置模板`,
      });
    }

    for (const template of templatesOf(node)) {
      for (const match of template.matchAll(VARIABLE_RE)) {
        const message = validateExpression(match[1], node, nodes, adjacency);
        if (message) issues.push({ nodeId: node.id, message });
      }
    }
    for (const binding of Object.values(node.data.arguments || {})) {
      if (binding.mode === 'variable' && typeof binding.value === 'string') {
        const message = validateExpression(
          binding.value.replace(/^\{\{\s*|\s*\}\}$/g, ''),
          node,
          nodes,
          adjacency,
        );
        if (message) issues.push({ nodeId: node.id, message });
      }
    }
  }

  if (answers.length > 0) {
    for (const node of graph.nodes.filter((item) => item.type !== 'answer')) {
      if (!answers.some((answer) => hasPath(adjacency, node.id, answer.id))) {
        issues.push({
          nodeId: node.id,
          message: '该节点所在路径无法到达回答结束节点',
        });
      }
    }
  }
  return issues;
}

function matchesJsonSchemaType(value: unknown, type: unknown): boolean {
  if (Array.isArray(type))
    return type.some((item) => matchesJsonSchemaType(value, item));
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return !!value && typeof value === 'object' && !Array.isArray(value);
    case 'null':
      return value === null;
    default:
      return true;
  }
}

/** 根据 MCP 工具 JSON Schema 校验参数绑定的完整性与静态类型。 */
export function validateMcpArgumentBindings(
  bindings: AgentNode['data']['arguments'],
  schema: Record<string, unknown> | undefined,
): string[] {
  const errors: string[] = [];
  const values = bindings || {};
  const properties =
    schema?.properties && typeof schema.properties === 'object'
      ? (schema.properties as Record<string, Record<string, unknown>>)
      : {};
  const required = Array.isArray(schema?.required)
    ? schema.required.filter((item): item is string => typeof item === 'string')
    : [];

  for (const name of required) {
    if (!values[name]) errors.push(`缺少必填工具参数 ${name}`);
  }
  for (const [name, binding] of Object.entries(values)) {
    const property = properties[name];
    if (!property) {
      if (schema?.additionalProperties === false)
        errors.push(`工具参数 ${name} 不在工具定义中`);
      continue;
    }
    if (binding.mode === 'literal') {
      if (!matchesJsonSchemaType(binding.value, property.type))
        errors.push(
          `工具参数 ${name} 的字面量类型应为 ${String(property.type)}`,
        );
      if (
        Array.isArray(property.enum) &&
        !property.enum.includes(binding.value)
      )
        errors.push(`工具参数 ${name} 不在允许值范围内`);
    } else if (binding.mode === 'template') {
      const types = Array.isArray(property.type)
        ? property.type
        : [property.type];
      if (property.type && !types.includes('string'))
        errors.push(`工具参数 ${name} 使用模板时必须是字符串类型`);
    }
  }
  return errors;
}

export function evaluateCondition(
  left: unknown,
  operator: AgentConditionOperator,
  right: unknown,
): boolean {
  switch (operator) {
    case 'equals':
      return String(left ?? '') === String(right ?? '');
    case 'notEquals':
      return String(left ?? '') !== String(right ?? '');
    case 'contains':
      return String(left ?? '').includes(String(right ?? ''));
    case 'notContains':
      return !String(left ?? '').includes(String(right ?? ''));
    case 'isEmpty':
      return left === null || left === undefined || String(left).length === 0;
    case 'isNotEmpty':
      return !(
        left === null ||
        left === undefined ||
        String(left).length === 0
      );
    case 'exists':
      return left !== null && left !== undefined;
    case 'notExists':
      return left === null || left === undefined;
    case 'gt':
      return Number(left) > Number(right);
    case 'gte':
      return Number(left) >= Number(right);
    case 'lt':
      return Number(left) < Number(right);
    case 'lte':
      return Number(left) <= Number(right);
  }
}

export const DEFAULT_AGENT_GRAPH: AgentGraphV1 = {
  schemaVersion: 1,
  nodes: [
    {
      id: 'start',
      type: 'start',
      position: { x: 80, y: 180 },
      data: { label: '开始' },
    },
    {
      id: 'answer',
      type: 'answer',
      position: { x: 420, y: 180 },
      data: { label: '回答', template: '{{sys.query}}' },
    },
  ],
  edges: [{ id: 'start-answer', source: 'start', target: 'answer' }],
};
