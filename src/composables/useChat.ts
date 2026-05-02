import { reactive, computed, toRefs } from 'vue'
import { useChatStore } from '../stores/chat'
import type { ChatMessage, ChatMessagePart } from '../types/chat'

export function useChat() {
  const store = useChatStore()

  const state = reactive({
    inputText: '',
    inputImages: [] as string[],
    inputAudio: null as { data: string; format: string } | null,
  })

  const canSend = computed(() => {
    if (store.loading) return false
    if (state.inputText.trim()) return true
    if (state.inputImages.length > 0) return true
    if (state.inputAudio) return true
    return false
  })

  async function send() {
    if (!canSend.value) return

    const contentParts: ChatMessagePart[] = []

    if (state.inputText.trim()) {
      contentParts.push({ type: 'text', text: state.inputText.trim() })
    }

    for (const imageUrl of state.inputImages) {
      contentParts.push({ type: 'image_url', image_url: { url: imageUrl } })
    }

    if (state.inputAudio) {
      contentParts.push({
        type: 'input_audio',
        input_audio: state.inputAudio,
      })
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: state.inputText.trim(),
      contentParts: contentParts.length > 0 ? contentParts : undefined,
    }

    // 清空输入
    state.inputText = ''
    state.inputImages = []
    state.inputAudio = null

    await store.sendMessage(userMessage)
  }

  function stop() {
    store.stopGeneration()
  }

  function addImage(base64: string) {
    state.inputImages.push(base64)
  }

  function removeImage(index: number) {
    state.inputImages.splice(index, 1)
  }

  function setAudio(data: string, format: string) {
    state.inputAudio = { data, format }
  }

  function removeAudio() {
    state.inputAudio = null
  }

  return {
    ...toRefs(state),
    canSend,
    send,
    stop,
    addImage,
    removeImage,
    setAudio,
    removeAudio,
  }
}
