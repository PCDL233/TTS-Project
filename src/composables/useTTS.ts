import { ref, computed, onUnmounted } from 'vue'
import axios from 'axios'
import { createTTSClient } from '../api/tts'
import { base64ToBlob, pcm16ToWav, downloadBlob } from '../utils/audio'
import { useConfigStore } from '../stores/config'
import { MODEL_MAP } from '../types/tts'
import type { TTSRequestParams } from '../types/tts'

export function useTTS() {
  const configStore = useConfigStore()
  const loading = ref(false)
  const error = ref('')
  const audioUrl = ref('')
  const audioBlob = ref<Blob | null>(null)
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

  async function generate(text: string) {
    const { config } = configStore
    if (!config.apiKey) {
      error.value = '请先设置 API Key'
      return
    }
    if (!text.trim()) {
      error.value = '请输入要合成的文本'
      return
    }

    loading.value = true
    error.value = ''

    // 清理之前的音频URL
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value)
      audioUrl.value = ''
    }
    audioBlob.value = null

    abortController.value = new AbortController()

    try {
      const client = createTTSClient(config.apiKey, configStore.getEffectiveBaseUrl())
      const params = buildRequestParams(text)

      if (config.stream && config.audioFormat === 'pcm16') {
        await generateStream(client, params)
      } else {
        await generateNormal(client, params)
      }
    } catch (err: any) {
      if (axios.isCancel?.(err) || err.name === 'AbortError' || err.message === 'Aborted') {
        error.value = '已取消生成'
      } else {
        error.value = err.response?.data?.error?.message || err.message || '生成失败，请检查API Key和网络连接'
      }
    } finally {
      loading.value = false
      abortController.value = null
    }
  }

  async function generateNormal(client: ReturnType<typeof createTTSClient>, params: TTSRequestParams) {
    const signal = abortController.value?.signal
    const base64Data = await client.generate(params, signal)
    const blob = base64ToBlob(base64Data, 'audio/wav')
    audioBlob.value = blob
    audioUrl.value = URL.createObjectURL(blob)
  }

  async function generateStream(client: ReturnType<typeof createTTSClient>, params: TTSRequestParams) {
    const signal = abortController.value?.signal
    const chunks: Uint8Array[] = []

    for await (const base64Data of client.generateStream(params, signal)) {
      const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
      chunks.push(bytes)
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const merged = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      merged.set(chunk, offset)
      offset += chunk.length
    }

    const wavBlob = pcm16ToWav(merged.buffer)
    audioBlob.value = wavBlob
    audioUrl.value = URL.createObjectURL(wavBlob)
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
      const mimeType = config.cloneAudioName.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg'
      audio.voice = `data:${mimeType};base64,${config.cloneAudioBase64}`
    }

    return {
      model: MODEL_MAP[config.mode],
      messages,
      audio,
      stream: config.stream,
    }
  }

  function stop() {
    abortController.value?.abort()
  }

  function download(filename?: string) {
    if (!audioBlob.value) return
    const name = filename || `mimo-tts-${Date.now()}.wav`
    downloadBlob(audioBlob.value, name)
  }

  function clearAudio() {
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value)
    }
    audioUrl.value = ''
    audioBlob.value = null
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
    canGenerate,
    generate,
    stop,
    download,
    clearAudio,
  }
}
