export type ApiAuthType = 'auto' | 'bearer' | 'api-key' | 'x-api-key' | 'none'

export type BaseUrlPreset =
  | 'mimo-default'
  | 'mimo-token-plan-cn'
  | 'mimo-token-plan-sgp'
  | 'mimo-token-plan-ams'
  | 'openai'
  | 'deepseek'
  | 'dashscope'
  | 'dashscope-intl'
  | 'moonshot'
  | 'zhipu'
  | 'openrouter'
  | 'siliconflow'
  | 'custom'
  // 兼容旧数据：旧版普通 MiMo API 的 preset 值
  | 'default'
  | 'token-plan-cn'
  | 'token-plan-sgp'
  | 'token-plan-ams'

export interface BaseUrlOption {
  value: BaseUrlPreset
  label: string
  url: string
  description: string
  authType: ApiAuthType
}

export const BASE_URL_OPTIONS: BaseUrlOption[] = [
  {
    value: 'mimo-default',
    label: '小米 MiMo 普通 API',
    url: 'https://api.xiaomimimo.com/v1',
    description: 'MiMo 原生接口，使用 api-key 请求头，支持 MiMo 思考/联网搜索/TTS 扩展。',
    authType: 'api-key',
  },
  {
    value: 'mimo-token-plan-cn',
    label: '小米 MiMo Token Plan - 中国',
    url: 'https://token-plan-cn.xiaomimimo.com/v1',
    description: 'MiMo Token Plan 中国集群，使用 api-key 请求头。',
    authType: 'api-key',
  },
  {
    value: 'mimo-token-plan-sgp',
    label: '小米 MiMo Token Plan - 新加坡',
    url: 'https://token-plan-sgp.xiaomimimo.com/v1',
    description: 'MiMo Token Plan 新加坡集群，使用 api-key 请求头。',
    authType: 'api-key',
  },
  {
    value: 'mimo-token-plan-ams',
    label: '小米 MiMo Token Plan - 欧洲',
    url: 'https://token-plan-ams.xiaomimimo.com/v1',
    description: 'MiMo Token Plan 欧洲集群，使用 api-key 请求头。',
    authType: 'api-key',
  },
  {
    value: 'openai',
    label: 'OpenAI',
    url: 'https://api.openai.com/v1',
    description: 'OpenAI 官方 Chat Completions 兼容接口，使用 Authorization: Bearer。',
    authType: 'bearer',
  },
  {
    value: 'deepseek',
    label: 'DeepSeek',
    url: 'https://api.deepseek.com',
    description: 'DeepSeek 官方 OpenAI 兼容接口，使用 Authorization: Bearer。',
    authType: 'bearer',
  },
  {
    value: 'dashscope',
    label: '阿里云百炼 / 通义千问（北京）',
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    description: '阿里云 Model Studio OpenAI 兼容接口（中国北京）。',
    authType: 'bearer',
  },
  {
    value: 'dashscope-intl',
    label: '阿里云百炼 / 通义千问（国际）',
    url: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    description: '阿里云 Model Studio OpenAI 兼容接口（新加坡国际站）。',
    authType: 'bearer',
  },
  {
    value: 'moonshot',
    label: 'Moonshot / Kimi',
    url: 'https://api.moonshot.cn/v1',
    description: 'Kimi Open Platform OpenAI 兼容接口，使用 Authorization: Bearer。',
    authType: 'bearer',
  },
  {
    value: 'zhipu',
    label: '智谱 GLM',
    url: 'https://open.bigmodel.cn/api/paas/v4',
    description: '智谱 OpenAI 兼容接口，使用 Authorization: Bearer。',
    authType: 'bearer',
  },
  {
    value: 'openrouter',
    label: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1',
    description: 'OpenRouter 聚合接口，模型名以官方模型列表为准。',
    authType: 'bearer',
  },
  {
    value: 'siliconflow',
    label: 'SiliconFlow',
    url: 'https://api.siliconflow.cn/v1',
    description: '硅基流动 OpenAI 兼容接口，模型名通常包含组织前缀。',
    authType: 'bearer',
  },
  {
    value: 'custom',
    label: '自定义 OpenAI 兼容接口',
    url: '',
    description: '手动输入 /v1 级别 Base URL，可选择鉴权方式。',
    authType: 'auto',
  },
]

export const LEGACY_BASE_URL_PRESET_MAP: Record<string, BaseUrlPreset> = {
  default: 'mimo-default',
  'token-plan-cn': 'mimo-token-plan-cn',
  'token-plan-sgp': 'mimo-token-plan-sgp',
  'token-plan-ams': 'mimo-token-plan-ams',
}

export const MIMO_BASE_URL_PRESETS = new Set<BaseUrlPreset>([
  'default',
  'token-plan-cn',
  'token-plan-sgp',
  'token-plan-ams',
  'mimo-default',
  'mimo-token-plan-cn',
  'mimo-token-plan-sgp',
  'mimo-token-plan-ams',
])

export const TOKEN_PLAN_BASE_URL_PRESETS = new Set<BaseUrlPreset>([
  'token-plan-cn',
  'token-plan-sgp',
  'token-plan-ams',
  'mimo-token-plan-cn',
  'mimo-token-plan-sgp',
  'mimo-token-plan-ams',
])

export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

export function normalizeBaseUrlPreset(preset: BaseUrlPreset): BaseUrlPreset {
  return LEGACY_BASE_URL_PRESET_MAP[preset] || preset
}

export function getBaseUrlOption(preset: BaseUrlPreset): BaseUrlOption | undefined {
  const normalized = normalizeBaseUrlPreset(preset)
  return BASE_URL_OPTIONS.find((option) => option.value === normalized)
}
