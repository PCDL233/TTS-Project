import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TTSConfig, TTSMode, PresetVoice, BaseUrlPreset, ApiAuthType } from '../types/tts'
import { MODEL_MAP } from '../types/tts'
import { getBaseUrlOption, MIMO_BASE_URL_PRESETS, normalizeBaseUrlPreset } from '../types/llm'
import { client } from '../api/client'
import { ElMessage } from 'element-plus'

function getDefaultConfig(): TTSConfig {
  return {
    apiKey: '',
    baseUrlPreset: 'mimo-default',
    baseUrlCustom: '',
    apiAuthType: 'auto',
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
  const loading = ref(false)

  async function loadConfig() {
    loading.value = true
    try {
      const res = await client.get('/config')
      config.value = { ...getDefaultConfig(), ...res.data }
      config.value.baseUrlPreset = normalizeBaseUrlPreset(config.value.baseUrlPreset)
      // 兼容性处理
      if (!config.value.model) {
        config.value.model = MODEL_MAP[(config.value.mode as TTSMode) || 'preset']
      }
    } catch {
      ElMessage.error('加载配置失败，使用默认配置')
    } finally {
      loaded.value = true
      loading.value = false
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
    config.value.baseUrlPreset = normalizeBaseUrlPreset(preset)
    saveConfig()
  }

  function updateBaseUrlCustom(url: string) {
    config.value.baseUrlCustom = url
    saveConfig()
  }

  function getEffectiveBaseUrl(): string {
    if (config.value.baseUrlPreset === 'custom') {
      return config.value.baseUrlCustom || 'https://api.xiaomimimo.com/v1'
    }
    return getBaseUrlOption(config.value.baseUrlPreset)?.url || 'https://api.xiaomimimo.com/v1'
  }

  function updateApiAuthType(authType: ApiAuthType) {
    config.value.apiAuthType = authType
    saveConfig()
  }

  function isMimoProvider(): boolean {
    return MIMO_BASE_URL_PRESETS.has(config.value.baseUrlPreset)
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
    loading,
    loadConfig,
    updateApiKey,
    updateBaseUrlPreset,
    updateBaseUrlCustom,
    updateApiAuthType,
    getEffectiveBaseUrl,
    isMimoProvider,
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
