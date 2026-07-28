import { ref, onUnmounted } from 'vue'
import { generateTTS } from '../api/tts'
import { useConfigStore } from '../stores/config'
import { base64ToBlob } from '../utils/audio'
import type { TTSRequestParams } from '../types/tts'

export function useChatTTS() {
  const configStore = useConfigStore()

  const isLoading = ref(false)
  const isPlaying = ref(false)
  const error = ref('')
  const audioUrl = ref('')

  let audioElement: HTMLAudioElement | null = null
  let abortController: AbortController | null = null

  async function speak(text: string): Promise<void> {
    // 如果正在播放，则暂停
    if (isPlaying.value && audioElement) {
      audioElement.pause()
      return
    }

    // 如果已有音频缓存且未在播放，直接播放
    if (audioUrl.value && audioElement) {
      try {
        await audioElement.play()
      } catch (err) {
        error.value = '播放失败'
      }
      return
    }

    if (!text.trim()) {
      error.value = '没有可朗读的内容'
      return
    }
    if (!configStore.isMimoProvider()) {
      error.value = '当前朗读仅支持小米 MiMo TTS 接口，请在 API 设置中切换为 MiMo 端点'
      return
    }

    isLoading.value = true
    error.value = ''
    abortController = new AbortController()

    try {
      const { config } = configStore

      const params: TTSRequestParams = {
        model: config.model || 'mimo-v2.5-tts',
        messages: [{ role: 'assistant', content: text.trim() }],
        audio: {
          format: config.audioFormat || 'wav',
          voice: config.mode === 'preset' ? config.presetVoice : undefined,
        },
      }

      const base64Data = await generateTTS(params, abortController.signal)
      const mimeType = config.audioFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav'
      const blob = base64ToBlob(base64Data, mimeType)
      const url = URL.createObjectURL(blob)

      audioUrl.value = url

      audioElement = new Audio(url)
      audioElement.onplay = () => {
        isPlaying.value = true
      }
      audioElement.onpause = () => {
        isPlaying.value = false
      }
      audioElement.onended = () => {
        isPlaying.value = false
      }
      audioElement.onerror = () => {
        error.value = '音频播放失败'
        isPlaying.value = false
      }

      await audioElement.play()
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message === 'canceled') {
        // 用户主动取消，忽略错误
      } else {
        error.value = err.response?.data?.message || err.message || '语音合成失败'
      }
    } finally {
      isLoading.value = false
      abortController = null
    }
  }

  function stop(): void {
    abortController?.abort()
    if (audioElement) {
      audioElement.pause()
      audioElement.currentTime = 0
      isPlaying.value = false
    }
  }

  function clear(): void {
    stop()
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value)
      audioUrl.value = ''
    }
    audioElement = null
    error.value = ''
  }

  onUnmounted(() => {
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value)
    }
    audioElement = null
  })

  return {
    isLoading,
    isPlaying,
    error,
    audioUrl,
    speak,
    stop,
    clear,
  }
}
