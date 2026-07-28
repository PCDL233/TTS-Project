<template>
    <div class="border-t border-gray-200 bg-white p-4 shrink-0">
        <div class="max-w-3xl mx-auto">
            <!-- 附件预览 -->
            <div v-if="inputImages.length > 0 || inputAudio" class="mb-3 flex flex-wrap gap-2">
                <div
                    v-for="(img, idx) in inputImages"
                    :key="idx"
                    class="relative group"
                >
                    <img
                        :src="img"
                        class="w-16 h-16 rounded-lg border border-gray-200 object-cover"
                    />
                    <button
                        class="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        @click="removeImage(idx)"
                    >
                        ×
                    </button>
                </div>
                <div v-if="inputAudio" class="relative group flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                    <audio
                        :src="`data:audio/${inputAudio.format};base64,${inputAudio.data}`"
                        controls
                        class="h-6 w-40"
                    />
                    <button
                        class="w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs"
                        @click="removeAudio()"
                    >
                        ×
                    </button>
                </div>
                <div v-if="inputVideo" class="relative group flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 max-w-xs">
                    <video
                        :src="inputVideo.url"
                        controls
                        class="h-20 w-32 rounded object-cover"
                    />
                    <div class="text-xs text-gray-500 truncate flex-1">视频附件</div>
                    <button
                        class="w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs shrink-0"
                        @click="removeVideo()"
                    >
                        ×
                    </button>
                </div>
                <div v-if="uploadingVideo" class="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                    <el-icon class="animate-spin text-blue-500"><loading /></el-icon>
                    <span class="text-xs text-gray-500">上传中...</span>
                </div>
            </div>

            <!-- 工具栏（放在输入框上方） -->
            <div class="chat-toolbar mb-2">
                <div class="chat-toolbar-actions">
                <!-- 上传图片 -->
                <el-tooltip content="上传图片" placement="top">
                    <button
                        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                        :class="inputImages.length > 0 ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                        @click="triggerImageUpload"
                    >
                        <el-icon :size="14"><picture-rounded /></el-icon>
                        <span>图片</span>
                    </button>
                </el-tooltip>
                <input
                    ref="imageInputRef"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="handleImageChange"
                />

                <!-- 上传音频 -->
                <el-tooltip content="上传音频" placement="top">
                    <button
                        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                        :class="inputAudio ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                        @click="triggerAudioUpload"
                    >
                        <el-icon :size="14"><mic /></el-icon>
                        <span>音频</span>
                    </button>
                </el-tooltip>
                <input
                    ref="audioInputRef"
                    type="file"
                    accept="audio/*"
                    class="hidden"
                    @change="handleAudioChange"
                />

                <!-- 上传视频 -->
                <el-tooltip content="上传视频" placement="top">
                    <button
                        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                        :class="inputVideo ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                        @click="triggerVideoUpload"
                    >
                        <el-icon :size="14"><video-camera /></el-icon>
                        <span>视频</span>
                    </button>
                </el-tooltip>
                <input
                    ref="videoInputRef"
                    type="file"
                    accept="video/*"
                    class="hidden"
                    @change="handleVideoChange"
                />

                <el-divider v-if="chatStore.adminFeatures.thinking || chatStore.adminFeatures.webSearch || chatStore.adminFeatures.functionCall || chatStore.adminFeatures.knowledgeBase" direction="vertical" class="mx-1!" />

                <!-- 深度思考 -->
                <el-tooltip v-if="chatStore.adminFeatures.thinking" :content="thinkingTooltip" placement="top">
                    <button
                        class="toolbar-button flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                        :class="chatStore.features.thinking && canUseThinking ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                        :aria-disabled="!canUseThinking"
                        @click="toggleFeature('thinking')"
                    >
                        <el-icon :size="14"><cpu /></el-icon>
                        <span>深度思考</span>
                    </button>
                </el-tooltip>

                <!-- 联网搜索 -->
                <el-tooltip v-if="chatStore.adminFeatures.webSearch" :content="webSearchTooltip" placement="top">
                    <button
                        class="toolbar-button flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                        :class="chatStore.features.webSearch && canUseWebSearch ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                        :aria-disabled="!canUseWebSearch"
                        @click="toggleFeature('webSearch')"
                    >
                        <el-icon :size="14"><search /></el-icon>
                        <span>联网搜索</span>
                    </button>
                </el-tooltip>

                <!-- 函数调用 -->
                <el-tooltip v-if="chatStore.adminFeatures.functionCall" :content="functionCallTooltip" placement="top">
                    <button
                        class="toolbar-button flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                        :class="chatStore.features.functionCall && canUseFunctionCall ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                        :aria-disabled="!canUseFunctionCall"
                        @click="toggleFeature('functionCall')"
                    >
                        <el-icon :size="14"><magic-stick /></el-icon>
                        <span>函数调用</span>
                    </button>
                </el-tooltip>

                <!-- 知识库选择 -->
                <el-tooltip v-if="chatStore.adminFeatures.knowledgeBase" content="选择知识库进行检索增强" placement="top">
                    <div>
                        <el-select
                            v-model="selectedKbId"
                            placeholder="知识库"
                            clearable
                            size="small"
                            style="width: 160px"
                            :class="selectedKbId ? 'kb-select-active' : 'kb-select-inactive'"
                            @change="handleKnowledgeBaseChange"
                        >
                            <template #prefix>
                                <el-icon><collection /></el-icon>
                            </template>
                            <el-option
                                v-for="kb in knowledgeBases"
                                :key="kb.id"
                                :label="kb.name"
                                :value="kb.id"
                            />
                        </el-select>
                    </div>
                </el-tooltip>

                </div>

                <div class="chat-toolbar-model">
                    <!-- 厂商模型选择：从当前厂商官方 /models 接口动态加载 -->
                    <div class="flex items-center gap-1">
                        <el-select
                            v-model="chatStore.currentModel"
                            class="model-select"
                            size="small"
                            style="width: clamp(180px, 24vw, 240px)"
                            filterable
                            allow-create
                            default-first-option
                            :loading="chatStore.modelsLoading"
                            :no-data-text="modelNoDataText"
                            placeholder="选择厂商模型"
                            popper-class="chat-model-select-popper"
                            :teleported="false"
                            @change="chatStore.updateModel"
                        >
                            <el-option
                                v-for="opt in availableModelOptions"
                                :key="opt.value"
                                :label="opt.label"
                                :value="opt.value"
                            >
                                <div class="model-option" :title="opt.value">
                                    <span class="model-option-label">{{ opt.label }}</span>
                                    <span v-if="opt.description || opt.ownedBy" class="model-option-meta">
                                        {{ opt.description || opt.ownedBy }}
                                    </span>
                                </div>
                            </el-option>
                        </el-select>
                        <el-button
                            text
                            size="small"
                            :loading="chatStore.modelsLoading"
                            @click="refreshProviderModels"
                        >
                            <el-icon><refresh /></el-icon>
                        </el-button>
                    </div>
                </div>
            </div>

            <div v-if="chatStore.modelsError" class="model-error-banner mb-2">
                <el-icon class="shrink-0 mt-0.5"><warning-filled /></el-icon>
                <div class="min-w-0 flex-1">
                    <div class="font-medium">未能自动获取 {{ currentProviderLabel }} 的模型列表</div>
                    <div class="mt-0.5 text-amber-700/80">
                        可直接在右侧模型框手动输入模型名继续使用。
                        <el-tooltip :content="modelErrorDetail" placement="top" :show-after="200">
                            <span class="underline decoration-dotted cursor-help">查看原因</span>
                        </el-tooltip>
                    </div>
                </div>
                <el-button link size="small" :loading="chatStore.modelsLoading" @click="refreshProviderModels">
                    重试
                </el-button>
            </div>

            <!-- 输入框 -->
            <div class="relative">
                <el-input
                    v-model="inputText"
                    type="textarea"
                    :rows="3"
                    placeholder="输入消息...（Shift+Enter 换行）"
                    class="chat-textarea"
                    resize="none"
                    @keydown="handleKeydown"
                />

                <!-- 发送/停止按钮 -->
                <div class="absolute right-2 bottom-2">
                    <el-button
                        v-if="chatStore.loading"
                        type="danger"
                        size="small"
                        @click="handleStop"
                    >
                        <el-icon class="mr-1"><video-pause /></el-icon>
                        停止
                    </el-button>
                    <el-button
                        v-else
                        type="primary"
                        size="small"
                        :disabled="!canSend"
                        @click="handleSend"
                    >
                        <el-icon class="mr-1"><promotion /></el-icon>
                        发送
                    </el-button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
    PictureRounded,
    Mic,
    Cpu,
    Search,
    MagicStick,
    VideoPause,
    Promotion,
    VideoCamera,
    Loading,
    Collection,
    Refresh,
    WarningFilled,
} from '@element-plus/icons-vue'
import { useChatStore } from '../stores/chat'
import { useConfigStore } from '../stores/config'
import { useMcpStore } from '../stores/mcp'
import type { ChatMessage, ChatMessagePart, ChatFeatures } from '../types/chat'
import { TOKEN_PLAN_BASE_URL_PRESETS, getBaseUrlOption } from '../types/llm'
import { uploadFile } from '../api/upload'
import { BACKEND_URL } from '../api/client'
import { ElMessage } from 'element-plus'
import { fetchKnowledgeBases, type KnowledgeBase } from '../api/knowledge-base'
import { updateConversation } from '../api/chat'

const SUPPORTED_AUDIO_FORMATS = new Set(['mp3', 'wav', 'ogg', 'm4a'])

const chatStore = useChatStore()
const configStore = useConfigStore()
const mcpStore = useMcpStore()

// 知识库列表
const knowledgeBases = ref<KnowledgeBase[]>([])
const selectedKbId = ref<number | null>(null)

// 加载知识库列表
async function loadKnowledgeBases() {
    try {
        knowledgeBases.value = await fetchKnowledgeBases()
    } catch {
        // 静默失败
    }
}

// 同步当前会话的知识库选择
watch(() => chatStore.currentConversationId, () => {
    selectedKbId.value = chatStore.currentConversation?.knowledgeBaseId ?? null
}, { immediate: true })

// 切换知识库
async function handleKnowledgeBaseChange(val: number | null) {
    if (!chatStore.currentConversationId) return
    try {
        await updateConversation(chatStore.currentConversationId, { knowledgeBaseId: val })
        // 同步更新本地 store 数据
        const conv = chatStore.conversations.find(c => c.id === chatStore.currentConversationId)
        if (conv) {
            if (val) {
                conv.knowledgeBaseId = val
            } else {
                delete conv.knowledgeBaseId
            }
        }
    } catch {
        ElMessage.error('更新知识库失败')
        // 回滚
        selectedKbId.value = chatStore.currentConversation?.knowledgeBaseId ?? null
    }
}

loadKnowledgeBases()

const isTokenPlanProvider = computed(() => TOKEN_PLAN_BASE_URL_PRESETS.has(configStore.config.baseUrlPreset))
const canUseThinking = computed(() => true)
const canUseWebSearch = computed(() => !isTokenPlanProvider.value)
const canUseFunctionCall = computed(() => mcpStore.enabledServers.length > 0)

const thinkingTooltip = computed(() => '深度思考')
const webSearchTooltip = computed(() => (
    canUseWebSearch.value ? '联网搜索' : 'Token Plan 端点不支持联网搜索，请切换到普通 API 或其他兼容厂商'
))
const functionCallTooltip = computed(() => (
    canUseFunctionCall.value ? 'MCP 函数调用' : '请先添加并启用 MCP 工具服务器'
))

const availableModelOptions = computed(() => chatStore.availableModelOptions)

const currentProviderLabel = computed(() => {
  if (configStore.config.baseUrlPreset === 'custom') return '自定义厂商'
  return getBaseUrlOption(configStore.config.baseUrlPreset)?.label || '当前厂商'
})

const modelNoDataText = computed(() => (
  chatStore.modelsError ? '获取失败，可手动输入模型名' : '暂无厂商模型，可手动输入模型名或点击刷新'
))

const modelErrorDetail = computed(() => {
  const message = chatStore.modelsError.trim()
  if (!message) return ''
  return message.length > 220 ? `${message.slice(0, 220)}...` : message
})

let providerReloadTimer: ReturnType<typeof setTimeout> | null = null
const providerConfigKey = computed(() => [
  configStore.config.baseUrlPreset,
  configStore.config.baseUrlCustom,
  configStore.config.apiAuthType,
  configStore.config.apiKey,
].join('|'))

watch(providerConfigKey, () => {
  if (!configStore.loaded) return
  if (providerReloadTimer) clearTimeout(providerReloadTimer)
  // API 设置保存有 500ms 防抖，这里稍后刷新，确保后端已持久化新的厂商配置。
  providerReloadTimer = setTimeout(() => {
    chatStore.loadProviderModels(true)
  }, 800)
})

function refreshProviderModels() {
  chatStore.loadProviderModels(true)
}

const inputText = ref('')
const inputImages = ref<string[]>([])
const inputAudio = ref<{ data: string; format: string } | null>(null)
const inputVideo = ref<{ url: string; file?: File } | null>(null)
const uploadingVideo = ref(false)

const imageInputRef = ref<HTMLInputElement>()
const audioInputRef = ref<HTMLInputElement>()
const videoInputRef = ref<HTMLInputElement>()

const canSend = computed(() => {
    if (chatStore.loading) return false
    if (uploadingVideo.value) return false
    if (!chatStore.currentModel.trim()) return false
    if (inputText.value.trim()) return true
    if (inputImages.value.length > 0) return true
    if (inputAudio.value) return true
    if (inputVideo.value) return true
    return false
})

function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (canSend.value && !chatStore.loading) {
            handleSend()
        }
    }
}

function toggleFeature(key: keyof ChatFeatures) {
    if (key === 'thinking' && !canUseThinking.value) {
        ElMessage.warning(thinkingTooltip.value)
        return
    }
    if (key === 'webSearch' && !canUseWebSearch.value) {
        ElMessage.warning(webSearchTooltip.value)
        return
    }
    if (key === 'functionCall' && !canUseFunctionCall.value) {
        ElMessage.warning(functionCallTooltip.value)
        return
    }
    chatStore.updateFeatures({ [key]: !chatStore.features[key] })
}

watch([canUseWebSearch, () => chatStore.features.webSearch], ([canUse, enabled]) => {
    if (!canUse && enabled) chatStore.updateFeatures({ webSearch: false })
}, { immediate: true })

async function handleSend() {
    if (!canSend.value) return

    const contentParts: ChatMessagePart[] = []

    if (inputText.value.trim()) {
        contentParts.push({ type: 'text', text: inputText.value.trim() })
    }

    for (const imageUrl of inputImages.value) {
        contentParts.push({ type: 'image_url', image_url: { url: imageUrl } })
    }

    if (inputAudio.value) {
        contentParts.push({
            type: 'input_audio',
            input_audio: inputAudio.value,
        })
    }

    if (inputVideo.value) {
        contentParts.push({
            type: 'video_url',
            video_url: { url: inputVideo.value.url },
        })
    }

    const userMessage: ChatMessage = {
        role: 'user',
        content: inputText.value.trim(),
        contentParts: contentParts.length > 0 ? contentParts : undefined,
    }

    // 清空输入
    inputText.value = ''
    inputImages.value = []
    inputAudio.value = null
    inputVideo.value = null

    await chatStore.sendMessage(userMessage, { knowledgeBaseId: selectedKbId.value })
}

function handleStop() {
    chatStore.stopGeneration()
}

function triggerImageUpload() {
    imageInputRef.value?.click()
}

function triggerAudioUpload() {
    audioInputRef.value?.click()
}

function validateFileSize(file: File, maxBytes: number, label: string): boolean {
    if (file.size > maxBytes) {
        ElMessage.warning(`${label}文件大小不能超过 ${maxBytes / 1024 / 1024}MB`)
        return false
    }
    return true
}

function handleImageChange(e: Event) {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    if (!validateFileSize(file, 10 * 1024 * 1024, '图片')) {
        target.value = ''
        return
    }

    const reader = new FileReader()
    reader.onload = () => {
        const result = reader.result as string
        inputImages.value.push(result)
    }
    reader.readAsDataURL(file)
    target.value = ''
}

function handleAudioChange(e: Event) {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    if (!validateFileSize(file, 10 * 1024 * 1024, '音频')) {
        target.value = ''
        return
    }

    const reader = new FileReader()
    reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1]
        const ext = file.name.split('.').pop()?.toLowerCase() || 'wav'
        const format = SUPPORTED_AUDIO_FORMATS.has(ext) ? ext : 'wav'
        inputAudio.value = { data: base64, format }
    }
    reader.readAsDataURL(file)
    target.value = ''
}

function removeImage(index: number) {
    inputImages.value.splice(index, 1)
}

function removeAudio() {
    inputAudio.value = null
}

function triggerVideoUpload() {
    videoInputRef.value?.click()
}

async function handleVideoChange(e: Event) {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    if (!validateFileSize(file, 50 * 1024 * 1024, '视频')) {
        target.value = ''
        return
    }

    uploadingVideo.value = true
    try {
        const res = await uploadFile(file)
        inputVideo.value = { url: `${BACKEND_URL}${res.url}` }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '视频上传失败'
        ElMessage.error(message)
    } finally {
        uploadingVideo.value = false
    }
    target.value = ''
}

function removeVideo() {
    inputVideo.value = null
}
</script>

<style scoped>

.chat-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: 0.5rem;
    min-width: 0;
}

.chat-toolbar-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    overflow: visible;
}

.chat-toolbar-actions > * {
    flex: 0 0 auto;
}

.chat-toolbar-model {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
}

.toolbar-button {
    white-space: nowrap;
}

.toolbar-button[aria-disabled='true'] {
    cursor: not-allowed;
    opacity: 0.55;
}

@media (max-width: 640px) {
    .chat-toolbar {
        grid-template-columns: 1fr;
        gap: 0.5rem;
    }

    .chat-toolbar-model {
        justify-content: flex-start;
        width: 100%;
    }

    .chat-toolbar-model :deep(.el-select) {
        width: 100% !important;
    }
}

.chat-textarea :deep(.el-textarea__inner) {
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
    padding-right: 5rem;
    background-color: #f9fafb;
    border-color: #e5e7eb;
    resize: none;
}

.chat-textarea :deep(.el-textarea__inner:focus) {
    background-color: #ffffff;
    border-color: #d1d5db;
    box-shadow: 0 0 0 1px #d1d5db;
}


.model-error-banner {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    border: 1px solid #fde68a;
    border-radius: 0.75rem;
    background: #fffbeb;
    padding: 0.5rem 0.75rem;
    color: #b45309;
    font-size: 0.75rem;
    line-height: 1.25rem;
}

.model-select :deep(.el-input__inner) {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 12px;
}

.model-select :deep(.chat-model-select-popper) {
    min-width: min(360px, calc(100vw - 2rem)) !important;
    max-width: min(460px, calc(100vw - 2rem));
}

.model-select :deep(.el-select-dropdown__list) {
    padding: 0.25rem;
}

.model-select :deep(.el-select-dropdown__item) {
    height: auto;
    min-height: 34px;
    line-height: normal;
    padding: 0;
    white-space: normal;
}

.model-select :deep(.el-select-dropdown__item.selected) {
    font-weight: 600;
}

.model-option {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    width: 100%;
    padding: 0.45rem 0.75rem;
    white-space: normal;
    word-break: break-all;
}

.model-option-label {
    color: #374151;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 12px;
    line-height: 1.25rem;
}

.model-option-meta {
    color: #9ca3af;
    font-size: 11px;
    line-height: 1rem;
    word-break: break-word;
}

.kb-select-active :deep(.el-input__wrapper) {
    background-color: #ecfdf5;
    box-shadow: 0 0 0 1px #10b981 inset;
}

.kb-select-active :deep(.el-input__inner) {
    color: #059669;
}

.kb-select-inactive :deep(.el-input__wrapper) {
    background-color: #ffffff;
    box-shadow: 0 0 0 1px #e5e7eb inset;
}
</style>

