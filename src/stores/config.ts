import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TTSConfig, TTSMode, PresetVoice, BaseUrlPreset } from '../types/tts'
import { BASE_URL_OPTIONS, MODEL_MAP } from '../types/tts'
import { client } from '../api/client'
import { ElMessage } from 'element-plus'

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

export const useConfigStore = defineStore('config', () => {
  const config = ref<TTSConfig>(getDefaultConfig())
  const loaded = ref(false)

  async function loadConfig() {
    try {
      const res = await client.get('/config')
      config.value = { ...getDefaultConfig(), ...res.data }
      // 兼容性处理
      if (!config.value.model) {
        config.value.model = MODEL_MAP[(config.value.mode as TTSMode) || 'preset']
      }
    } catch {
      ElMessage.error('加载配置失败，使用默认配置')
    } finally {
      loaded.value = true
    }
  }

  let saveTimer: ReturnType<typeof setTimeout> | null = null
  async function saveConfig() {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      try {
        await client.put('/config', config.value)
      } catch {
        ElMessage.error('保存配置失败')
      }
    }, 500)
  }

  function updateApiKey(key: string) {
    config.value.apiKey = key
    saveConfig()
  }

  function updateBaseUrlPreset(preset: BaseUrlPreset) {
    config.value.baseUrlPreset = preset
    saveConfig()
  }

  function updateBaseUrlCustom(url: string) {
    config.value.baseUrlCustom = url
    saveConfig()
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
    config.value.model = MODEL_MAP[mode]
    saveConfig()
  }

  function updateModel(model: string) {
    config.value.model = model
    const option = Object.entries(MODEL_MAP).find(([, v]) => v === model)
    if (option) {
      config.value.mode = option[0] as TTSMode
    }
    saveConfig()
  }

  function updatePresetVoice(voice: PresetVoice) {
    config.value.presetVoice = voice
    saveConfig()
  }

  function updateVoiceDesignText(text: string) {
    config.value.voiceDesignText = text
    saveConfig()
  }

  function updateCloneAudio(base64: string, name: string) {
    config.value.cloneAudioBase64 = base64
    config.value.cloneAudioName = name
    saveConfig()
  }

  function updateStyleMode(mode: 'natural' | 'tag') {
    config.value.styleMode = mode
    saveConfig()
  }

  function updateStyleText(text: string) {
    config.value.styleText = text
    saveConfig()
  }

  function updateAudioFormat(format: 'wav' | 'pcm16' | 'mp3') {
    config.value.audioFormat = format
    saveConfig()
  }

  return {
    config,
    loaded,
    loadConfig,
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
