import { ref, computed, onUnmounted } from 'vue'
import axios from 'axios'
import { createTTSClient } from '../api/tts'
import { base64ToBlob } from '../utils/audio'
import { useConfigStore } from '../stores/config'
import type { TTSRequestParams } from '../types/tts'

export interface GenerateResult {
  base64: string
  blob: Blob
  url: string
}

export function useTTS() {
  const configStore = useConfigStore()
  const loading = ref(false)
  const error = ref('')
  const audioUrl = ref('')
  const audioBlob = ref<Blob | null>(null)
  const audioBase64 = ref('')
  const abortController = ref<AbortController | null>(null)

  const canGenerate = computed(() => {
    const { config } = configStore
    if (!config.apiKey) return false

    switch (config.mode) {
      case 'preset':
        return true
      case 'design':
        return !!config.voiceDesignText.trim()
      case 'clone':
        return !!config.cloneAudioBase64
      default:
        return false
    }
  })

  async function generate(text: string): Promise<GenerateResult | null> {
    const { config } = configStore
    if (!config.apiKey) {
      error.value = '请先设置 API Key'
      return null
    }
    if (!text.trim()) {
      error.value = '请输入要合成的文本'
      return null
    }

    loading.value = true
    error.value = ''

    // 清理之前的音频URL
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value)
      audioUrl.value = ''
    }
    audioBlob.value = null
    audioBase64.value = ''

    abortController.value = new AbortController()

    try {
      const client = createTTSClient(config.apiKey, configStore.getEffectiveBaseUrl())
      const params = buildRequestParams(text)

      const base64Data = await client.generate(params, abortController.value.signal)
      const mimeType = config.audioFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav'
      const blob = base64ToBlob(base64Data, mimeType)
      const url = URL.createObjectURL(blob)

      audioBlob.value = blob
      audioUrl.value = url
      audioBase64.value = base64Data

      return { base64: base64Data, blob, url }
    } catch (err: any) {
      if (axios.isCancel?.(err) || err.name === 'AbortError' || err.message === 'Aborted') {
        error.value = '已取消生成'
      } else {
        error.value = err.response?.data?.error?.message || err.message || '生成失败，请检查API Key和网络连接'
      }
      return null
    } finally {
      loading.value = false
      abortController.value = null
    }
  }

  function buildRequestParams(text: string): TTSRequestParams {
    const { config } = configStore
    const messages: TTSRequestParams['messages'] = []

    let userContent = ''

    if (config.mode === 'design') {
      userContent = config.voiceDesignText.trim()
    } else {
      if (config.styleMode === 'natural') {
        userContent = config.styleText.trim()
      }
    }

    if (userContent || config.mode === 'design') {
      messages.push({
        role: 'user',
        content: userContent,
      })
    }

    let assistantContent = text.trim()
    if (config.styleMode === 'tag' && config.styleText.trim()) {
      assistantContent = `(${config.styleText.trim()})${assistantContent}`
    }

    messages.push({
      role: 'assistant',
      content: assistantContent,
    })

    const audio: TTSRequestParams['audio'] = {
      format: config.audioFormat,
    }

    if (config.mode === 'preset') {
      audio.voice = config.presetVoice
    } else if (config.mode === 'clone' && config.cloneAudioBase64) {
      const mimeType = config.cloneAudioName?.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg'
      audio.voice = `data:${mimeType};base64,${config.cloneAudioBase64}`
    }

    return {
      model: config.model || 'mimo-v2.5-tts',
      messages,
      audio,
    }
  }

  function stop() {
    abortController.value?.abort()
  }

  function clearAudio() {
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value)
    }
    audioUrl.value = ''
    audioBlob.value = null
    audioBase64.value = ''
    error.value = ''
  }

  onUnmounted(() => {
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value)
    }
  })

  return {
    loading,
    error,
    audioUrl,
    audioBlob,
    audioBase64,
    canGenerate,
    generate,
    stop,
    clearAudio,
  }
}
