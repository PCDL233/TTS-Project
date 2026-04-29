import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { TTSConfig, TTSMode, PresetVoice, BaseUrlPreset } from '../types/tts'
import { BASE_URL_OPTIONS } from '../types/tts'

const STORAGE_KEY = 'mimo-tts-config'

function getDefaultConfig(): TTSConfig {
  return {
    apiKey: '',
    baseUrlPreset: 'default',
    baseUrlCustom: '',
    mode: 'preset',
    presetVoice: 'mimo_default',
    voiceDesignText: '',
    cloneAudioBase64: '',
    cloneAudioName: '',
    styleMode: 'natural',
    styleText: '',
    audioFormat: 'wav',
    stream: false,
  }
}

function loadConfig(): TTSConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return { ...getDefaultConfig(), ...JSON.parse(saved) }
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

  function updateAudioFormat(format: 'wav' | 'pcm16') {
    config.value.audioFormat = format
  }

  function updateStream(stream: boolean) {
    config.value.stream = stream
  }

  return {
    config,
    updateApiKey,
    updateBaseUrlPreset,
    updateBaseUrlCustom,
    getEffectiveBaseUrl,
    updateMode,
    updatePresetVoice,
    updateVoiceDesignText,
    updateCloneAudio,
    updateStyleMode,
    updateStyleText,
    updateAudioFormat,
    updateStream,
  }
})
