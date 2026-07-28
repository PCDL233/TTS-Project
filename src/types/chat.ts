import type { AgentCitation, AgentTraceStep, AgentNodeType } from './agent'

export type ChatRolePresetId =
  | 'professional_assistant'
  | 'code_mentor'
  | 'writing_polisher'
  | 'learning_coach'
  | 'translator'

export type ChatRoleSelectionId = ChatRolePresetId | 'custom'

export interface ChatRolePreset {
  id: ChatRolePresetId
  name: string
  description: string
  prompt: string
}

export interface ChatRoleSettings {
  enabled: boolean
  presetId: ChatRoleSelectionId
  customPrompt?: string
}

export const CHAT_ROLE_PRESETS: ChatRolePreset[] = [
  {
    id: 'professional_assistant',
    name: '专业严谨助手',
    description: '结构化、准确、少废话，适合工作汇报与问题分析。',
    prompt:
      '你是一名专业严谨的智能助手。回答必须先给结论，再给关键依据和可执行步骤；使用清晰的小标题或项目符号；不编造不确定信息，对不确定内容明确说明；语言简洁、客观、礼貌。',
  },
  {
    id: 'code_mentor',
    name: '代码导师',
    description: '解释实现思路、指出风险，帮助用户写出可维护代码。',
    prompt:
      '你是一名代码导师。回答必须说明核心思路、关键代码或伪代码、潜在风险和验证方法；优先给出可执行建议；遇到错误信息时先定位原因再给修复步骤；保持耐心、清晰、工程化。',
  },
  {
    id: 'writing_polisher',
    name: '写作润色助手',
    description: '优化表达并保持原意，适合文案、邮件和报告。',
    prompt:
      '你是一名写作润色助手。回答必须保持用户原意，优化逻辑、语气和表达；优先给出润色后的完整版本，再简要列出修改要点；不擅自增加事实性信息；语言自然、流畅、有分寸。',
  },
  {
    id: 'learning_coach',
    name: '学习教练',
    description: '循序渐进讲解，适合学习新知识和复习。',
    prompt:
      '你是一名学习教练。回答必须从简单结论开始，再循序渐进解释原因；使用例子、类比或小练习帮助理解；主动指出常见误区；语气鼓励、耐心、易懂。',
  },
  {
    id: 'translator',
    name: '翻译专家',
    description: '忠实翻译并保留格式，必要时补充术语说明。',
    prompt:
      '你是一名翻译专家。回答必须忠实传达原文含义，保留原有格式、列表和专有名词；根据上下文选择自然准确的表达；必要时在译文后用简短备注说明关键术语或可替代表达。',
  },
]

export interface ChatMessagePart {
  type: 'text' | 'image_url' | 'input_audio' | 'video_url'
  text?: string
  image_url?: { url: string }
  input_audio?: { data: string; format: string }
  video_url?: { url: string; fps?: number; media_resolution?: string }
}

export interface ChatMessage {
  id?: number
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  contentParts?: ChatMessagePart[]
  reasoningContent?: string
  toolCalls?: Array<{
    id: string
    type: string
    function: { name: string; arguments: string }
  }>
  annotations?: Array<{
    type: string
    url: string
    title: string
    summary: string
    site_name: string
    logo_url: string
    publish_time: string
  }>
  usage?: {
    completion_tokens?: number
    prompt_tokens?: number
    total_tokens?: number
    web_search_usage?: {
      tool_usage?: number
      page_usage?: number
    }
  }
  createdAt?: number | string
  agentTrace?: AgentTraceStep[]
  citations?: AgentCitation[]
  // MCP Agent 临时事件（不持久化到数据库）
  mcpEvents?: Array<
    | { type: 'tool_call_start'; toolCalls: any[] }
    | { type: 'tool_call_result'; toolCallId: string; name: string; status: 'success' | 'error'; result?: string; error?: string }
  >
}

export interface ChatConversation {
  id: number
  userId?: number
  title: string
  model: string
  features: ChatFeatures
  knowledgeBaseId?: number
  agentId?: number | null
  agentVersionId?: number | null
  agentName?: string
  agentVersion?: number
  createdAt?: string
  updatedAt?: string
}

export interface ChatFeatures {
  thinking?: boolean
  webSearch?: boolean
  functionCall?: boolean
  roleSetting?: boolean
  knowledgeBase?: boolean
}

export interface StreamChunk {
  content?: string
  reasoningContent?: string
  toolCalls?: any[]
  annotations?: any[]
  finishReason?: string | null
  usage?: any
  error?: string
  // MCP Agent 新增
  type?:
    | 'tool_call_start'
    | 'tool_call_result'
    | 'agent_selected'
    | 'agent_run_start'
    | 'agent_node_start'
    | 'agent_node_finish'
    | 'agent_node_error'
    | 'agent_run_finish'
  toolCallId?: string
  name?: string
  status?: 'success' | 'error'
  result?: string
  runId?: string
  nodeId?: string
  nodeType?: AgentNodeType
  label?: string
  durationMs?: number
  summary?: string
  input?: unknown
  output?: unknown
  trace?: AgentTraceStep[]
  citations?: AgentCitation[]
  agentId?: number
  agentName?: string
  version?: number
}


export interface ChatCompletionParams {
  model: string
  messages: Array<{
    role: string
    content?: string
    contentParts?: ChatMessagePart[]
  }>
  stream?: boolean
  thinking?: { type: 'enabled' | 'disabled' }
  tools?: Array<{
    type: 'function' | 'web_search'
    function?: { name: string; description?: string; parameters?: Record<string, unknown> }
    max_keyword?: number
    force_search?: boolean
    limit?: number
    user_location?: { type: 'approximate'; country?: string; region?: string; city?: string }
  }>
  tool_choice?: string
  response_format?: { type: 'text' | 'json_object' }
  temperature?: number
  max_completion_tokens?: number
  conversationId?: number
  knowledgeBaseId?: number
  mcpEnabled?: boolean
  roleSettings?: ChatRoleSettings
}

export interface ChatModelOption {
  value: string
  label: string
  description: string
  ownedBy?: string
}

/** 将后端或厂商接口返回的模型名转换为下拉选项。 */
export function resolveModelOptions(modelValues: string[]): ChatModelOption[] {
  return modelValues.map((value) => ({
    value,
    label: value,
    description: '',
  }))
}
