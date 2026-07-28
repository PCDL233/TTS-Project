export type ApiAuthType = 'auto' | 'bearer' | 'api-key' | 'x-api-key' | 'none';

export const DEFAULT_MIMO_BASE_URL = 'https://api.xiaomimimo.com/v1';

export const BASE_URL_PRESETS: Record<string, { url: string; authType: ApiAuthType }> = {
  default: { url: DEFAULT_MIMO_BASE_URL, authType: 'api-key' },
  'token-plan-cn': { url: 'https://token-plan-cn.xiaomimimo.com/v1', authType: 'api-key' },
  'token-plan-sgp': { url: 'https://token-plan-sgp.xiaomimimo.com/v1', authType: 'api-key' },
  'token-plan-ams': { url: 'https://token-plan-ams.xiaomimimo.com/v1', authType: 'api-key' },
  'mimo-default': { url: DEFAULT_MIMO_BASE_URL, authType: 'api-key' },
  'mimo-token-plan-cn': { url: 'https://token-plan-cn.xiaomimimo.com/v1', authType: 'api-key' },
  'mimo-token-plan-sgp': { url: 'https://token-plan-sgp.xiaomimimo.com/v1', authType: 'api-key' },
  'mimo-token-plan-ams': { url: 'https://token-plan-ams.xiaomimimo.com/v1', authType: 'api-key' },
  openai: { url: 'https://api.openai.com/v1', authType: 'bearer' },
  deepseek: { url: 'https://api.deepseek.com', authType: 'bearer' },
  dashscope: { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', authType: 'bearer' },
  'dashscope-intl': { url: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', authType: 'bearer' },
  moonshot: { url: 'https://api.moonshot.cn/v1', authType: 'bearer' },
  zhipu: { url: 'https://open.bigmodel.cn/api/paas/v4', authType: 'bearer' },
  openrouter: { url: 'https://openrouter.ai/api/v1', authType: 'bearer' },
  siliconflow: { url: 'https://api.siliconflow.cn/v1', authType: 'bearer' },
};

export const LEGACY_PRESET_MAP: Record<string, string> = {
  default: 'mimo-default',
  'token-plan-cn': 'mimo-token-plan-cn',
  'token-plan-sgp': 'mimo-token-plan-sgp',
  'token-plan-ams': 'mimo-token-plan-ams',
};

export const MIMO_PRESETS = new Set([
  'default',
  'token-plan-cn',
  'token-plan-sgp',
  'token-plan-ams',
  'mimo-default',
  'mimo-token-plan-cn',
  'mimo-token-plan-sgp',
  'mimo-token-plan-ams',
]);

export const TOKEN_PLAN_PRESETS = new Set([
  'token-plan-cn',
  'token-plan-sgp',
  'token-plan-ams',
  'mimo-token-plan-cn',
  'mimo-token-plan-sgp',
  'mimo-token-plan-ams',
]);

export function normalizeBaseUrl(url: string): string {
  return (url || '').trim().replace(/\/+$/, '');
}

export function normalizePreset(preset?: string): string {
  if (!preset) return 'mimo-default';
  return LEGACY_PRESET_MAP[preset] || preset;
}

export function resolvePresetByBaseUrl(baseUrl: string): { baseUrlPreset: string; baseUrlCustom: string } {
  const normalized = normalizeBaseUrl(baseUrl);
  for (const [preset, config] of Object.entries(BASE_URL_PRESETS)) {
    if (normalizeBaseUrl(config.url) === normalized) {
      return { baseUrlPreset: normalizePreset(preset), baseUrlCustom: '' };
    }
  }
  return { baseUrlPreset: 'custom', baseUrlCustom: normalized || DEFAULT_MIMO_BASE_URL };
}

export function resolveAuthType(baseUrlPreset: string, explicitAuthType?: string): ApiAuthType {
  if (explicitAuthType && explicitAuthType !== 'auto') {
    return explicitAuthType as ApiAuthType;
  }
  const preset = BASE_URL_PRESETS[normalizePreset(baseUrlPreset)];
  return preset?.authType || 'bearer';
}

export function buildAuthHeaders(apiKey: string, authType: ApiAuthType): Record<string, string> {
  if (authType === 'none') return {};
  if (authType === 'api-key') return { 'api-key': apiKey };
  if (authType === 'x-api-key') return { 'x-api-key': apiKey };
  return { Authorization: `Bearer ${apiKey}` };
}
