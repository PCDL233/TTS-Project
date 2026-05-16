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
  createdAt?: number | string
}

export interface ChatConversation {
  id: number
  userId?: number
  title: string
  model: string
  features: ChatFeatures
  createdAt?: string
  updatedAt?: string
}

export interface ChatFeatures {
  thinking?: boolean
  webSearch?: boolean
  functionCall?: boolean
}

export interface StreamChunk {
  content?: string
  reasoningContent?: string
  toolCalls?: any[]
  annotations?: any[]
  finishReason?: string | null
  usage?: any
  error?: string
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
  }>
  tool_choice?: string
  response_format?: { type: 'text' | 'json_object' }
  temperature?: number
  max_completion_tokens?: number
  conversationId?: number
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
