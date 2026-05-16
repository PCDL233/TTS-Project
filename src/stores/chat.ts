import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChatConversation, ChatMessage, ChatFeatures } from '../types/chat'
import {
  fetchConversations as apiFetchConversations,
  createConversation as apiCreateConversation,
  deleteConversation as apiDeleteConversation,
  updateConversation as apiUpdateConversation,
  fetchMessages as apiFetchMessages,
  sendChatStream,
  fetchChatConfig,
} from '../api/chat'
import { CHAT_MODEL_OPTIONS, resolveModelOptions } from '../types/chat'

export const useChatStore = defineStore('chat', () => {
  // State
  const conversations = ref<ChatConversation[]>([])
  const currentConversationId = ref<number | null>(null)
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const error = ref('')
  const currentModel = ref('mimo-v2.5-pro')
  // 管理员全局功能开关（控制 UI 按钮可见性）
  const adminFeatures = ref<ChatFeatures>({
    thinking: false,
    webSearch: false,
    functionCall: false,
  })
  // 用户本地开关偏好（仅对 adminFeatures 中开启的功能生效）
  const userToggledFeatures = ref<ChatFeatures>({
    thinking: false,
    webSearch: false,
    functionCall: false,
  })
  // 最终生效的功能（admin 关闭则整体关闭，admin 开启则取决于用户本地开关）
  const features = computed<ChatFeatures>(() => ({
    thinking: adminFeatures.value.thinking && userToggledFeatures.value.thinking,
    webSearch: adminFeatures.value.webSearch && userToggledFeatures.value.webSearch,
    functionCall: adminFeatures.value.functionCall && userToggledFeatures.value.functionCall,
  }))
  const abortController = ref<AbortController | null>(null)
  const chatConfigLoaded = ref(false)
  const userSelectedModel = ref(false) // 标记用户是否手动选过模型
  const availableModelOptions = ref(CHAT_MODEL_OPTIONS) // 默认使用硬编码回退值

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

    // 如果当前会话标题是"新对话"，用第一条消息内容更新标题
    if (currentConversation.value?.title === '新对话' && userMessage.content) {
      const newTitle = userMessage.content.slice(0, 20)
      if (newTitle) {
        const convId = currentConversationId.value!
        try {
          await apiUpdateConversation(convId, { title: newTitle })
          const conv = conversations.value.find((c) => c.id === convId)
          if (conv) conv.title = newTitle
        } catch {
          // 标题更新失败不影响消息发送
        }
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
    for (const [key, value] of Object.entries(newFeatures)) {
      const k = key as keyof ChatFeatures
      // 仅允许切换管理员已开启的功能
      if (adminFeatures.value[k]) {
        userToggledFeatures.value[k] = value
      }
    }
  }

  function updateModel(model: string) {
    userSelectedModel.value = true
    currentModel.value = model
  }

  async function loadChatConfig() {
    try {
      const config = await fetchChatConfig()
      // 用后端返回的模型列表生成 option 对象
      if (config.models && config.models.length > 0) {
        availableModelOptions.value = resolveModelOptions(config.models)
      }
      // 用后端返回的默认模型设置 currentModel（仅用户未手动选过时）
      if (!userSelectedModel.value && config.defaultModel) {
        currentModel.value = config.defaultModel
      }
      // 用后端返回的功能开关更新 adminFeatures
      if (config.features) {
        adminFeatures.value = {
          thinking: config.features.thinking ?? false,
          webSearch: config.features.webSearch ?? false,
          functionCall: config.features.functionCall ?? false,
        }
        // 同步 userToggledFeatures：admin 关闭的功能强制关闭，
        // admin 开启的功能保持用户原选择（默认不自动开启，由用户自己决定）
        userToggledFeatures.value = {
          thinking: adminFeatures.value.thinking && userToggledFeatures.value.thinking,
          webSearch: adminFeatures.value.webSearch && userToggledFeatures.value.webSearch,
          functionCall: adminFeatures.value.functionCall && userToggledFeatures.value.functionCall,
        }
      }
      chatConfigLoaded.value = true
    } catch {
      // 加载失败时保留硬编码默认值，静默处理
    }
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
    adminFeatures,
    userToggledFeatures,
    chatConfigLoaded,
    availableModelOptions,
    currentConversation,
    loadConversations,
    createNewChat,
    selectConversation,
    deleteConversation,
    sendMessage,
    stopGeneration,
    updateFeatures,
    updateModel,
    loadChatConfig,
    clearError,
  }
})
