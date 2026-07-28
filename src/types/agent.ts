export type AgentNodeType = 'start' | 'llm' | 'knowledge' | 'mcpTool' | 'template' | 'condition' | 'answer'
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
  | 'lte'

export interface AgentArgumentBinding {
  mode: 'literal' | 'variable' | 'template'
  value: unknown
}

export interface AgentNodeData {
  label: string
  model?: string
  systemPrompt?: string
  prompt?: string
  temperature?: number
  maxTokens?: number
  includeHistory?: boolean
  historyTurns?: number
  knowledgeBaseId?: number
  queryTemplate?: string
  topK?: number
  mcpServerId?: number
  toolName?: string
  arguments?: Record<string, AgentArgumentBinding>
  template?: string
  left?: string
  operator?: AgentConditionOperator
  right?: unknown
  validationError?: boolean
}

export interface AgentNode {
  id: string
  type: AgentNodeType
  position: { x: number; y: number }
  data: AgentNodeData
}

export interface AgentEdge {
  id: string
  source: string
  target: string
  sourceHandle?: 'true' | 'false' | null
}

export interface AgentGraphV1 {
  schemaVersion: 1
  nodes: AgentNode[]
  edges: AgentEdge[]
}

export interface Agent {
  id: number
  userId: number
  name: string
  description: string
  draftGraph: AgentGraphV1
  publishedVersionId: number | null
  publishedVersion?: number
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AgentVersion {
  id: number
  agentId: number
  version: number
  graphSnapshot: AgentGraphV1
  publishedAt: string
}

export interface AgentValidationIssue {
  nodeId?: string
  edgeId?: string
  message: string
}

export interface AgentCitation {
  documentId: number
  documentName: string
  chunkId: number
  chunkIndex: number
  source: string
  content: string
}

export interface AgentTraceStep {
  nodeId: string
  nodeType: AgentNodeType
  label: string
  status: 'running' | 'success' | 'error'
  durationMs?: number
  summary?: string
  error?: string
}

export interface AgentStreamEvent {
  type:
    | 'agent_run_start'
    | 'agent_node_start'
    | 'agent_node_finish'
    | 'agent_node_error'
    | 'agent_run_finish'
    | 'validation_error'
  runId?: string
  nodeId?: string
  nodeType?: AgentNodeType
  label?: string
  status?: 'success' | 'error'
  durationMs?: number
  summary?: string
  input?: unknown
  output?: unknown
  error?: string
  content?: string
  trace?: AgentTraceStep[]
  citations?: AgentCitation[]
  issues?: AgentValidationIssue[]
}
