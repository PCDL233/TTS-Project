export type TTSMode = 'preset' | 'design' | 'clone'

export type BaseUrlPreset = 'default' | 'token-plan-cn' | 'token-plan-sgp' | 'token-plan-ams' | 'custom'

export interface BaseUrlOption {
  value: BaseUrlPreset
  label: string
  url: string
  description: string
}

export const BASE_URL_OPTIONS: BaseUrlOption[] = [
  {
    value: 'default',
    label: '普通 API',
    url: 'https://api.xiaomimimo.com/v1',
    description: '按量计费，适合通用场景',
  },
  {
    value: 'token-plan-cn',
    label: 'Token Plan - 中国集群',
    url: 'https://token-plan-cn.xiaomimimo.com/v1',
    description: '订阅套餐，中国节点',
  },
  {
    value: 'token-plan-sgp',
    label: 'Token Plan - 新加坡集群',
    url: 'https://token-plan-sgp.xiaomimimo.com/v1',
    description: '订阅套餐，新加坡节点',
  },
  {
    value: 'token-plan-ams',
    label: 'Token Plan - 欧洲集群',
    url: 'https://token-plan-ams.xiaomimimo.com/v1',
    description: '订阅套餐，欧洲节点',
  },
  {
    value: 'custom',
    label: '自定义',
    url: '',
    description: '手动输入 Base URL',
  },
]

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
