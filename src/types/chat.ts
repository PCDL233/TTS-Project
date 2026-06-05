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
  createdAt?: string
  updatedAt?: string
}

export interface ChatFeatures {
  thinking?: boolean
  webSearch?: boolean
  functionCall?: boolean
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
  type?: 'tool_call_start' | 'tool_call_result'
  toolCallId?: string
  name?: string
  status?: 'success' | 'error'
  result?: string
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
}

export const CHAT_MODEL_OPTIONS = [
  { value: 'mimo-v2.5-pro', label: 'MiMo-V2.5-Pro', description: '旗舰模型，综合能力强' },
  { value: 'mimo-v2.5', label: 'MiMo-V2.5', description: '标准模型，均衡性能' },
  { value: 'mimo-v2-pro', label: 'MiMo-V2-Pro', description: '上一代Pro模型' },
  { value: 'mimo-v2-omni', label: 'MiMo-V2-Omni', description: '多模态模型' },
  { value: 'mimo-v2-flash', label: 'MiMo-V2-Flash', description: '轻量高速模型' },
]

/** 模型元数据映射表：value → { label, description } */
export const MODEL_META: Record<string, { label: string; description: string }> = Object.fromEntries(
  CHAT_MODEL_OPTIONS.map((opt) => [opt.value, { label: opt.label, description: opt.description }]),
)

/** 根据模型 value 生成带 label/description 的 option 对象 */
export function resolveModelOptions(modelValues: string[]) {
  return modelValues.map((value) => {
    const meta = MODEL_META[value]
    return meta
      ? { value, label: meta.label, description: meta.description }
      : { value, label: value, description: '' }
  })
}

/** Token Plan 支持的聊天模型（共8款，不含 mimo-v2-flash） */
export const TOKEN_PLAN_CHAT_MODELS = new Set([
  'mimo-v2.5-pro',
  'mimo-v2.5',
  'mimo-v2-pro',
  'mimo-v2-omni',
])
