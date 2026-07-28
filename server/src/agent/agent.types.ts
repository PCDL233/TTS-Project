export type AgentNodeType =
  | 'start'
  | 'llm'
  | 'knowledge'
  | 'mcpTool'
  | 'template'
  | 'condition'
  | 'answer';

export type AgentConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'exists'
  | 'notExists'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte';

export interface AgentNodePosition {
  x: number;
  y: number;
}

export interface AgentArgumentBinding {
  mode: 'literal' | 'variable' | 'template';
  value: unknown;
}

export interface AgentNode {
  id: string;
  type: AgentNodeType;
  position: AgentNodePosition;
  data: {
    label: string;
    model?: string;
    systemPrompt?: string;
    prompt?: string;
    temperature?: number;
    maxTokens?: number;
    includeHistory?: boolean;
    historyTurns?: number;
    knowledgeBaseId?: number;
    queryTemplate?: string;
    topK?: number;
    mcpServerId?: number;
    toolName?: string;
    arguments?: Record<string, AgentArgumentBinding>;
    template?: string;
    left?: string;
    operator?: AgentConditionOperator;
    right?: unknown;
  };
}

export interface AgentEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: 'true' | 'false' | null;
}

export interface AgentGraphV1 {
  schemaVersion: 1;
  nodes: AgentNode[];
  edges: AgentEdge[];
}

export interface AgentCitation {
  documentId: number;
  documentName: string;
  chunkId: number;
  chunkIndex: number;
  source: string;
  content: string;
}

export interface AgentTraceStep {
  nodeId: string;
  nodeType: AgentNodeType;
  label: string;
  status: 'running' | 'success' | 'error';
  durationMs?: number;
  summary?: string;
  error?: string;
}

export interface AgentValidationIssue {
  nodeId?: string;
  edgeId?: string;
  message: string;
}
