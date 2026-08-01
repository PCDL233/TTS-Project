export type TTSMode = 'preset' | 'design' | 'clone'

export const MIMO_TTS_MODELS = new Set([
  'mimo-v2.5-tts',
  'mimo-v2.5-tts-voicedesign',
  'mimo-v2.5-tts-voiceclone',
])

export function isMimoTtsModel(model: string): boolean {
  return MIMO_TTS_MODELS.has(model.trim())
}

import { MIMO_BASE_URL_PRESETS } from './llm'
import type { ApiAuthType, BaseUrlPreset } from './llm'
export type { ApiAuthType, BaseUrlPreset } from './llm'
export { BASE_URL_OPTIONS } from './llm'

export type PresetVoice =
  | 'mimo_default'
  | '冰糖'
  | '茉莉'
  | '苏打'
  | '白桦'
  | 'Mia'
  | 'Chloe'
  | 'Milo'
  | 'Dean'

export interface VoiceOption {
  value: PresetVoice
  label: string
  lang: string
  gender: string
}

export const PRESET_VOICES: VoiceOption[] = [
  { value: 'mimo_default', label: 'MiMo-默认', lang: '自动', gender: '-' },
  { value: '冰糖', label: '冰糖', lang: '中文', gender: '女性' },
  { value: '茉莉', label: '茉莉', lang: '中文', gender: '女性' },
  { value: '苏打', label: '苏打', lang: '中文', gender: '男性' },
  { value: '白桦', label: '白桦', lang: '中文', gender: '男性' },
  { value: 'Mia', label: 'Mia', lang: '英文', gender: '女性' },
  { value: 'Chloe', label: 'Chloe', lang: '英文', gender: '女性' },
  { value: 'Milo', label: 'Milo', lang: '英文', gender: '男性' },
  { value: 'Dean', label: 'Dean', lang: '英文', gender: '男性' },
]

export interface ModelOption {
  value: string
  label: string
  mode: TTSMode
  description: string
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    value: 'mimo-v2.5-tts',
    label: 'MiMo-V2.5-TTS',
    mode: 'preset',
    description: '内置精品音色，支持预置音色合成',
  },
  {
    value: 'mimo-v2.5-tts-voicedesign',
    label: 'MiMo-V2.5-TTS-VoiceDesign',
    mode: 'design',
    description: '通过文本描述从零设计全新音色',
  },
  {
    value: 'mimo-v2.5-tts-voiceclone',
    label: 'MiMo-V2.5-TTS-VoiceClone',
    mode: 'clone',
    description: '基于音频样本高保真复刻任意音色',
  },
]

export const MODEL_MAP: Record<TTSMode, string> = {
  preset: 'mimo-v2.5-tts',
  design: 'mimo-v2.5-tts-voicedesign',
  clone: 'mimo-v2.5-tts-voiceclone',
}

export interface TTSMessage {
  role: 'user' | 'assistant'
  content: string
}

export type AudioFormat = 'wav' | 'pcm16' | 'mp3'

export interface TTSRequestParams {
  model: string
  messages: TTSMessage[]
  audio: {
    format: AudioFormat
    voice?: string
  }
  stream?: boolean
}

export interface TTSResponse {
  choices: Array<{
    message: {
      audio?: {
        data: string
      }
    }
  }>
}

export interface TTSHistoryItem {
  id: string
  text: string
  mode: TTSMode
  voice: string
  styleText: string
  audioUrl: string
  audioBase64?: string
  audioFormat?: AudioFormat
  createdAt: number
}

export interface TTSConfig {
  apiKey: string
  baseUrlPreset: BaseUrlPreset
  baseUrlCustom: string
  apiAuthType: ApiAuthType
  mode: TTSMode
  model: string
  presetVoice: PresetVoice
  voiceDesignText: string
  cloneAudioBase64: string
  cloneAudioName: string
  styleMode: 'natural' | 'tag'
  styleText: string
  audioFormat: AudioFormat
}

export function canUseTts(config: Pick<TTSConfig, 'apiKey' | 'baseUrlPreset' | 'model'>): boolean {
  return Boolean(config.apiKey.trim())
    && MIMO_BASE_URL_PRESETS.has(config.baseUrlPreset)
    && isMimoTtsModel(config.model)
}
