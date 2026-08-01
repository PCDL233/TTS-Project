import { MIMO_PRESETS } from '../config/llm-provider.util';

export const MIMO_TTS_MODELS = new Set([
  'mimo-v2.5-tts',
  'mimo-v2.5-tts-voicedesign',
  'mimo-v2.5-tts-voiceclone',
]);

export function isMimoTtsModel(model: string): boolean {
  return MIMO_TTS_MODELS.has((model || '').trim());
}

export function canUseMimoTts(config: { apiKey: string; baseUrlPreset: string }, model: string): boolean {
  return Boolean((config.apiKey || '').trim()) && MIMO_PRESETS.has(config.baseUrlPreset) && isMimoTtsModel(model);
}

export const MIMO_TTS_ERROR_MESSAGE =
  '语音合成仅支持小米 MiMo 端点和 MiMo TTS 模型，请在「API 设置」中切换为 MiMo 配置';
