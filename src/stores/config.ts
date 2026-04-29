import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { TTSConfig, TTSMode, PresetVoice, BaseUrlPreset } from '../types/tts'
import { BASE_URL_OPTIONS, MODEL_MAP } from '../types/tts'

const STORAGE_KEY = 'mimo-tts-config'

function getDefaultConfig(): TTSConfig {
  return {
    apiKey: '',
    baseUrlPreset: 'default',
    baseUrlCustom: '',
    mode: 'preset',
    model: MODEL_MAP.preset,
    presetVoice: 'mimo_default',
    voiceDesignText: '',
    cloneAudioBase64: '',
    cloneAudioName: '',
    styleMode: 'natural',
    styleText: '',
    audioFormat: 'wav',
  }
}

function loadConfig(): TTSConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // 兼容性：旧配置可能没有 model 字段
      if (!parsed.model) {
        parsed.model = MODEL_MAP[parsed.mode || 'preset']
      }
      // 兼容性：移除旧的 stream 字段
      delete parsed.stream
      return { ...getDefaultConfig(), ...parsed }
    }
  } catch {
    // ignore
  }
  return getDefaultConfig()
}

export const useConfigStore = defineStore('config', () => {
  const config = ref<TTSConfig>(loadConfig())

  watch(
    config,
    (val) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    },
    { deep: true }
  )

  function updateApiKey(key: string) {
    config.value.apiKey = key
  }

  function updateBaseUrlPreset(preset: BaseUrlPreset) {
    config.value.baseUrlPreset = preset
  }

  function updateBaseUrlCustom(url: string) {
    config.value.baseUrlCustom = url
  }

  function getEffectiveBaseUrl(): string {
    const preset = BASE_URL_OPTIONS.find(o => o.value === config.value.baseUrlPreset)
    if (config.value.baseUrlPreset === 'custom') {
      return config.value.baseUrlCustom || 'https://api.xiaomimimo.com/v1'
    }
    return preset?.url || 'https://api.xiaomimimo.com/v1'
  }

  function updateMode(mode: TTSMode) {
    config.value.mode = mode
    // 联动更新模型
    config.value.model = MODEL_MAP[mode]
  }

  function updateModel(model: string) {
    config.value.model = model
    // 联动更新模式
    const option = Object.entries(MODEL_MAP).find(([, v]) => v === model)
    if (option) {
      config.value.mode = option[0] as TTSMode
    }
  }

  function updatePresetVoice(voice: PresetVoice) {
    config.value.presetVoice = voice
  }

  function updateVoiceDesignText(text: string) {
    config.value.voiceDesignText = text
  }

  function updateCloneAudio(base64: string, name: string) {
    config.value.cloneAudioBase64 = base64
    config.value.cloneAudioName = name
  }

  function updateStyleMode(mode: 'natural' | 'tag') {
    config.value.styleMode = mode
  }

  function updateStyleText(text: string) {
    config.value.styleText = text
  }

  function updateAudioFormat(format: 'wav' | 'pcm16' | 'mp3') {
    config.value.audioFormat = format
  }

  return {
    config,
    updateApiKey,
    updateBaseUrlPreset,
    updateBaseUrlCustom,
    getEffectiveBaseUrl,
    updateMode,
    updateModel,
    updatePresetVoice,
    updateVoiceDesignText,
    updateCloneAudio,
    updateStyleMode,
    updateStyleText,
    updateAudioFormat,
  }
})
