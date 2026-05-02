import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChatConversation, ChatMessage, ChatFeatures } from '../types/chat'
import {
  fetchConversations as apiFetchConversations,
  createConversation as apiCreateConversation,
  deleteConversation as apiDeleteConversation,
  fetchMessages as apiFetchMessages,
  sendChatStream,
} from '../api/chat'

export const useChatStore = defineStore('chat', () => {
  // State
  const conversations = ref<ChatConversation[]>([])
  const currentConversationId = ref<number | null>(null)
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const error = ref('')
  const currentModel = ref('mimo-v2.5-pro')
  const features = ref<ChatFeatures>({
    thinking: false,
    webSearch: false,
    functionCall: false,
    jsonMode: false,
  })
  const abortController = ref<AbortController | null>(null)

  // Getters
  const currentConversation = computed(() =>
    conversations.value.find((c) => c.id === currentConversationId.value),
  )

  // Actions
  async function loadConversations() {
    try {
      conversations.value = await apiFetchConversations()
    } catch (err: any) {
      error.value = err.response?.data?.message || '加载会话列表失败'
    }
  }

  async function createNewChat(title?: string) {
    try {
      const conversation = await apiCreateConversation({
        title: title || '新对话',
        model: currentModel.value,
        features: features.value,
      })
      conversations.value.unshift(conversation)
      currentConversationId.value = conversation.id
      messages.value = []
      return conversation
    } catch (err: any) {
      error.value = err.response?.data?.message || '创建会话失败'
      return null
    }
  }

  async function selectConversation(id: number) {
    currentConversationId.value = id
    messages.value = []
    try {
      messages.value = await apiFetchMessages(id)
    } catch (err: any) {
      error.value = err.response?.data?.message || '加载消息失败'
    }
  }

  async function deleteConversation(id: number) {
    try {
      await apiDeleteConversation(id)
      conversations.value = conversations.value.filter((c) => c.id !== id)
      if (currentConversationId.value === id) {
        currentConversationId.value = null
        messages.value = []
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || '删除会话失败'
    }
  }

  async function sendMessage(userMessage: ChatMessage) {
    if (loading.value) return

    loading.value = true
    error.value = ''

    // 确保有当前会话
    if (!currentConversationId.value) {
      const conversation = await createNewChat(userMessage.content.slice(0, 20) || '新对话')
      if (!conversation) {
        loading.value = false
        return
      }
    }

    // 添加用户消息到列表
    messages.value.push(userMessage)

    // 创建助手消息占位
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      reasoningContent: '',
      toolCalls: undefined,
      annotations: undefined,
    }
    messages.value.push(assistantMessage)

    abortController.value = new AbortController()

    // 构建请求消息
    const apiMessages = messages.value.slice(0, -1).map((msg) => ({
      role: msg.role,
      content: msg.content,
      contentParts: msg.contentParts,
    }))

    // 构建 tools
    const tools: any[] = []
    if (features.value.webSearch) {
      tools.push({
        type: 'web_search',
        max_keyword: 3,
        force_search: true,
        limit: 5,
        user_location: {
          type: 'approximate',
          country: 'China',
        },
      })
    }
    if (features.value.functionCall) {
      tools.push({
        type: 'function',
        function: {
          name: 'get_current_weather',
          description: '获取指定城市的当前天气',
          parameters: {
            type: 'object',
            properties: {
              location: { type: 'string', description: '城市名称' },
              unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
            },
            required: ['location'],
          },
        },
      })
    }

    const params = {
      model: currentModel.value,
      messages: apiMessages,
      stream: true,
      thinking: features.value.thinking ? { type: 'enabled' as const } : { type: 'disabled' as const },
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      response_format: features.value.jsonMode ? { type: 'json_object' as const } : undefined,
      conversationId: currentConversationId.value!,
    }

    await sendChatStream(
      params,
      (chunk) => {
        // 必须通过数组索引访问 proxy 对象才能触发 Vue 响应式更新
        const lastMsg = messages.value[messages.value.length - 1]
        if (!lastMsg || lastMsg.role !== 'assistant') return

        if (chunk.content) {
          lastMsg.content += chunk.content
        }
        if (chunk.reasoningContent) {
          lastMsg.reasoningContent = (lastMsg.reasoningContent || '') + chunk.reasoningContent
        }
        if (chunk.toolCalls) {
          if (!lastMsg.toolCalls) lastMsg.toolCalls = []
          // 增量 toolCalls 合并逻辑
          for (const tc of chunk.toolCalls) {
            const existing = lastMsg.toolCalls.find((t) => t.id === tc.id)
            if (existing) {
              existing.function.arguments += tc.function.arguments || ''
            } else {
              lastMsg.toolCalls.push(tc)
            }
          }
        }
        if (chunk.annotations) {
          if (!lastMsg.annotations) lastMsg.annotations = []
          lastMsg.annotations.push(...chunk.annotations)
        }
      },
      () => {
        loading.value = false
        abortController.value = null
      },
      (errMsg) => {
        error.value = errMsg
        loading.value = false
        abortController.value = null
      },
      abortController.value.signal,
    )
  }

  function stopGeneration() {
    abortController.value?.abort()
  }

  function updateFeatures(newFeatures: Partial<ChatFeatures>) {
    features.value = { ...features.value, ...newFeatures }
  }

  function updateModel(model: string) {
    currentModel.value = model
  }

  function clearError() {
    error.value = ''
  }

  return {
    conversations,
    currentConversationId,
    messages,
    loading,
    error,
    currentModel,
    features,
    currentConversation,
    loadConversations,
    createNewChat,
    selectConversation,
    deleteConversation,
    sendMessage,
    stopGeneration,
    updateFeatures,
    updateModel,
    clearError,
  }
})
