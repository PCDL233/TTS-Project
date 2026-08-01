import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { CHAT_ROLE_PRESETS } from '../types/chat'
import type { ChatConversation, ChatMessage, ChatFeatures, ChatRoleSettings } from '../types/chat'
import { mergeAgentWorkflowChunk } from '../utils/agent-stream'
import { useMcpStore } from './mcp'
import {
  fetchConversations as apiFetchConversations,
  createConversation as apiCreateConversation,
  deleteConversation as apiDeleteConversation,
  updateConversation as apiUpdateConversation,
  fetchMessages as apiFetchMessages,
  sendChatStream,
  fetchChatConfig,
  fetchProviderChatModels,
} from '../api/chat'
import type { ChatModelOption } from '../types/chat'
import { getApiErrorMessage } from '../api/error'

interface SendMessageOptions {
  knowledgeBaseId?: number | null
}


const ROLE_SETTINGS_STORAGE_KEY = 'chatRoleSettings'
const USER_FEATURES_STORAGE_KEY = 'chatUserToggledFeatures'
const DEFAULT_USER_TOGGLED_FEATURES: ChatFeatures = {
  thinking: false,
  webSearch: false,
  functionCall: false,
  roleSetting: false,
  knowledgeBase: false,
}
const DEFAULT_ROLE_SETTINGS: ChatRoleSettings = {
  enabled: false,
  presetId: 'professional_assistant',
  customPrompt: '',
}

function loadStoredRoleSettings(): ChatRoleSettings {
  try {
    const raw = localStorage.getItem(ROLE_SETTINGS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_ROLE_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<ChatRoleSettings>
    const presetIds = new Set([...CHAT_ROLE_PRESETS.map((preset) => preset.id), 'custom'])
    const presetId = parsed.presetId && presetIds.has(parsed.presetId)
      ? parsed.presetId
      : DEFAULT_ROLE_SETTINGS.presetId
    return {
      enabled: parsed.enabled === true,
      presetId,
      customPrompt: typeof parsed.customPrompt === 'string' ? parsed.customPrompt : '',
    }
  } catch {
    return { ...DEFAULT_ROLE_SETTINGS }
  }
}

function loadStoredUserToggledFeatures(): ChatFeatures {
  try {
    const raw = localStorage.getItem(USER_FEATURES_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_USER_TOGGLED_FEATURES }
    const parsed = JSON.parse(raw) as Partial<ChatFeatures>
    return {
      thinking: parsed.thinking === true,
      webSearch: parsed.webSearch === true,
      functionCall: parsed.functionCall === true,
      roleSetting: parsed.roleSetting === true,
      knowledgeBase: parsed.knowledgeBase === true,
    }
  } catch {
    return { ...DEFAULT_USER_TOGGLED_FEATURES }
  }
}

function normalizeRoleSettings(settings: ChatRoleSettings): ChatRoleSettings | undefined {
  if (!settings.enabled) return undefined
  return {
    enabled: true,
    presetId: settings.presetId,
    customPrompt: settings.presetId === 'custom' ? settings.customPrompt?.trim() : undefined,
  }
}

export const useChatStore = defineStore('chat', () => {
  // MCP store reference (lazy to avoid circular dep)
  let mcpStore: ReturnType<typeof useMcpStore> | null = null
  function getMcpStore() {
    if (!mcpStore) mcpStore = useMcpStore()
    return mcpStore
  }
  // State
  const conversations = ref<ChatConversation[]>([])
  const currentConversationId = ref<number | null>(null)
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const conversationsLoading = ref(false)
  const error = ref('')
  const currentModel = ref('')
  const selectedAgentId = ref<number | null>(null)
  // 管理员全局功能开关（控制 UI 按钮可见性）
  const adminFeatures = ref<ChatFeatures>({
    thinking: false,
    webSearch: false,
    functionCall: false,
    roleSetting: false,
    knowledgeBase: false,
  })
  // 用户本地开关偏好（仅对 adminFeatures 中开启的功能生效）
  const userToggledFeatures = ref<ChatFeatures>(loadStoredUserToggledFeatures())
  const roleSettings = ref<ChatRoleSettings>(loadStoredRoleSettings())
  // 最终生效的功能（admin 关闭则整体关闭，admin 开启则取决于用户本地开关）
  const features = computed<ChatFeatures>(() => ({
    thinking: adminFeatures.value.thinking && userToggledFeatures.value.thinking,
    webSearch: adminFeatures.value.webSearch && userToggledFeatures.value.webSearch,
    functionCall: adminFeatures.value.functionCall && userToggledFeatures.value.functionCall,
    roleSetting: adminFeatures.value.roleSetting && userToggledFeatures.value.roleSetting && roleSettings.value.enabled,
    knowledgeBase: adminFeatures.value.knowledgeBase && userToggledFeatures.value.knowledgeBase,
  }))
  const abortController = ref<AbortController | null>(null)
  const chatConfigLoaded = ref(false)
  const userSelectedModel = ref(false) // 标记用户是否手动选过模型
  const modelsLoading = ref(false)
  const modelsError = ref('')
  const providerModelSource = ref('')
  const availableModelOptions = ref<ChatModelOption[]>([])

  watch(
    roleSettings,
    (value) => {
      localStorage.setItem(ROLE_SETTINGS_STORAGE_KEY, JSON.stringify(value))
    },
    { deep: true },
  )

  watch(
    userToggledFeatures,
    (value) => {
      localStorage.setItem(USER_FEATURES_STORAGE_KEY, JSON.stringify(value))
    },
    { deep: true },
  )

  // Getters
  const currentConversation = computed(() =>
    conversations.value.find((c) => c.id === currentConversationId.value),
  )
  const isAgentMode = computed(() => Boolean(currentConversation.value?.agentVersionId || selectedAgentId.value))
  const currentRoleLabel = computed(() => {
    if (!roleSettings.value.enabled) return '未启用'
    if (roleSettings.value.presetId === 'custom') return '自定义角色'
    return CHAT_ROLE_PRESETS.find((preset) => preset.id === roleSettings.value.presetId)?.name || '模型角色'
  })

  // Actions
  async function loadConversations() {
    conversationsLoading.value = true
    try {
      conversations.value = await apiFetchConversations()
    } catch (err: unknown) {
      error.value = getApiErrorMessage(err, '加载会话列表失败')
    } finally {
      conversationsLoading.value = false
    }
  }

  async function createNewChat(title?: string, knowledgeBaseId?: number | null, agentId = selectedAgentId.value) {
    if (!agentId && !currentModel.value) {
      error.value = '请先选择或输入模型'
      return null
    }

    try {
      const conversation = await apiCreateConversation({
        title: title || '新对话',
        model: agentId ? undefined : currentModel.value,
        features: agentId ? undefined : features.value,
        knowledgeBaseId: agentId ? undefined : (knowledgeBaseId ?? undefined),
        agentId: agentId || undefined,
      })
      conversations.value.unshift(conversation)
      currentConversationId.value = conversation.id
      messages.value = []
      selectedAgentId.value = conversation.agentId ?? null
      return conversation
    } catch (err: unknown) {
      error.value = getApiErrorMessage(err, '创建会话失败')
      return null
    }
  }

  async function selectConversation(id: number) {
    // 取消正在进行的流式请求
    if (abortController.value) {
      abortController.value.abort()
      abortController.value = null
      loading.value = false
    }
    currentConversationId.value = id
    selectedAgentId.value = conversations.value.find((conversation) => conversation.id === id)?.agentId ?? null
    messages.value = []
    try {
      messages.value = await apiFetchMessages(id)
    } catch (err: unknown) {
      error.value = getApiErrorMessage(err, '加载消息失败')
    }
  }

  async function deleteConversation(id: number) {
    try {
      await apiDeleteConversation(id)
      conversations.value = conversations.value.filter((c) => c.id !== id)
      if (currentConversationId.value === id) {
        currentConversationId.value = null
        messages.value = []
        selectedAgentId.value = null
      }
    } catch (err: unknown) {
      error.value = getApiErrorMessage(err, '删除会话失败')
    }
  }

  async function sendMessage(userMessage: ChatMessage, options: SendMessageOptions = {}) {
    if (loading.value) return

    if (!isAgentMode.value && !currentModel.value) {
      error.value = '请先选择或输入模型'
      return
    }

    if (!isAgentMode.value && features.value.roleSetting && roleSettings.value.enabled && roleSettings.value.presetId === 'custom' && !roleSettings.value.customPrompt?.trim()) {
      error.value = '请输入自定义角色设定，或关闭角色设定'
      return
    }

    loading.value = true
    error.value = ''

    const activeKnowledgeBaseId = !isAgentMode.value && features.value.knowledgeBase
      ? options.knowledgeBaseId === undefined
        ? (currentConversation.value?.knowledgeBaseId ?? undefined)
        : (options.knowledgeBaseId ?? undefined)
      : undefined

    // 确保有当前会话
    if (!currentConversationId.value) {
      const conversation = await createNewChat(userMessage.content.slice(0, 20) || '新对话', activeKnowledgeBaseId)
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
    const targetConversationId = currentConversationId.value!

    // 构建请求消息
    const apiMessages = messages.value.slice(0, -1).map((msg) => ({
      role: msg.role,
      content: msg.content,
      contentParts: msg.contentParts,
    }))

    // 构建 MiMo 内置工具；MCP 函数调用由 mcpEnabled 交给后端 Agent 注入真实工具。
    const tools = !isAgentMode.value && features.value.webSearch ? [{ type: 'web_search' as const }] : []
    const mcp = getMcpStore()
    const hasEnabledMcpServers = mcp.enabledServers.length > 0

    const params = {
      model: currentModel.value,
      messages: apiMessages,
      stream: true,
      thinking: features.value.thinking ? { type: 'enabled' as const } : { type: 'disabled' as const },
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      conversationId: targetConversationId,
      knowledgeBaseId: activeKnowledgeBaseId,
      mcpEnabled: !isAgentMode.value && features.value.functionCall && hasEnabledMcpServers,
      roleSettings: !isAgentMode.value && features.value.roleSetting ? normalizeRoleSettings(roleSettings.value) : undefined,
    }

    await sendChatStream(
      params,
      (chunk) => {
        // 防止快速切换会话时消息写入错误会话
        if (currentConversationId.value !== targetConversationId) return
        const lastMsg = messages.value[messages.value.length - 1]
        if (!lastMsg || lastMsg.role !== 'assistant') return

        // MCP Agent 特殊事件
        if (chunk.type === 'tool_call_start') {
          if (!lastMsg.mcpEvents) lastMsg.mcpEvents = []
          lastMsg.mcpEvents.push({ type: 'tool_call_start', toolCalls: chunk.toolCalls || [] })
          return
        }
        if (chunk.type === 'tool_call_result') {
          if (!lastMsg.mcpEvents) lastMsg.mcpEvents = []
          lastMsg.mcpEvents.push({
            type: 'tool_call_result',
            toolCallId: chunk.toolCallId || '',
            name: chunk.name || '',
            status: chunk.status || 'error',
            result: chunk.result,
            error: chunk.error,
          })
          return
        }

        if (mergeAgentWorkflowChunk(lastMsg, chunk)) return

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
          const existingUrls = new Set(lastMsg.annotations.map((a: any) => a.url))
          const newAnnotations = chunk.annotations.filter((a: any) => a.url && !existingUrls.has(a.url))
          if (newAnnotations.length > 0) {
            lastMsg.annotations.push(...newAnnotations)
          }
        }
        if (chunk.usage) {
          lastMsg.usage = chunk.usage
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

  async function startNewChatWithAgent(agentId: number | null) {
    if (loading.value) return null
    currentConversationId.value = null
    messages.value = []
    selectedAgentId.value = agentId
    return createNewChat(undefined, undefined, agentId)
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

  function updateRoleSettings(newSettings: Partial<ChatRoleSettings>) {
    roleSettings.value = {
      ...roleSettings.value,
      ...newSettings,
    }
  }

  function updateModel(model: string) {
    userSelectedModel.value = true
    currentModel.value = model
  }

  async function loadProviderModels(resetSelection = false) {
    modelsLoading.value = true
    modelsError.value = ''
    try {
      const providerModels = await fetchProviderChatModels()
      availableModelOptions.value = providerModels.models
      providerModelSource.value = providerModels.baseUrl

      const values = providerModels.models.map((model) => model.value)
      const shouldReset = resetSelection || !userSelectedModel.value || !values.includes(currentModel.value)
      const nextModel = providerModels.defaultModel || values[0] || ''
      if (shouldReset && nextModel) {
        currentModel.value = nextModel
        userSelectedModel.value = false
      }
    } catch (err: unknown) {
      modelsError.value = getApiErrorMessage(err, '获取厂商模型列表失败')
      providerModelSource.value = ''
      availableModelOptions.value = currentModel.value
        ? [{ value: currentModel.value, label: currentModel.value, description: '当前手动模型' }]
        : []
    } finally {
      modelsLoading.value = false
    }
  }

  async function loadChatConfig() {
    try {
      const config = await fetchChatConfig()
      // 用后端返回的功能开关更新 adminFeatures。后台只控制入口可见性，
      // 不再替用户默认开启；管理员关闭时强制清空对应本地启用状态。
      if (config.features) {
        adminFeatures.value = {
          thinking: config.features.thinking ?? false,
          webSearch: config.features.webSearch ?? false,
          functionCall: config.features.functionCall ?? false,
          roleSetting: config.features.roleSetting ?? false,
          knowledgeBase: config.features.knowledgeBase ?? false,
        }
        userToggledFeatures.value = {
          thinking: adminFeatures.value.thinking && userToggledFeatures.value.thinking,
          webSearch: adminFeatures.value.webSearch && userToggledFeatures.value.webSearch,
          functionCall: adminFeatures.value.functionCall && userToggledFeatures.value.functionCall,
          roleSetting: adminFeatures.value.roleSetting && userToggledFeatures.value.roleSetting,
          knowledgeBase: adminFeatures.value.knowledgeBase && userToggledFeatures.value.knowledgeBase,
        }
        if (!adminFeatures.value.roleSetting && roleSettings.value.enabled) {
          roleSettings.value = { ...roleSettings.value, enabled: false }
        }
      }
      await loadProviderModels()
      chatConfigLoaded.value = true
    } catch (err: unknown) {
      error.value = getApiErrorMessage(err, '加载聊天配置失败')
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
    conversationsLoading,
    error,
    currentModel,
    selectedAgentId,
    isAgentMode,
    features,
    adminFeatures,
    userToggledFeatures,
    roleSettings,
    currentRoleLabel,
    rolePresets: CHAT_ROLE_PRESETS,
    chatConfigLoaded,
    modelsLoading,
    modelsError,
    providerModelSource,
    availableModelOptions,
    currentConversation,
    loadConversations,
    createNewChat,
    startNewChatWithAgent,
    selectConversation,
    deleteConversation,
    sendMessage,
    stopGeneration,
    updateFeatures,
    updateRoleSettings,
    updateModel,
    loadChatConfig,
    loadProviderModels,
    clearError,
  }
})
