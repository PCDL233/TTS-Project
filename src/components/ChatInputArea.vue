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
            <div class="flex items-center gap-2 mb-2 flex-wrap">
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

                <el-divider direction="vertical" class="mx-1!" />

                <!-- 深度思考 -->
                <el-tooltip content="深度思考" placement="top">
                    <button
                        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                        :class="chatStore.features.thinking ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                        @click="toggleFeature('thinking')"
                    >
                        <el-icon :size="14"><cpu /></el-icon>
                        <span>深度思考</span>
                    </button>
                </el-tooltip>

                <!-- 联网搜索 -->
                <el-tooltip content="联网搜索" placement="top">
                    <button
                        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                        :class="chatStore.features.webSearch ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                        @click="toggleFeature('webSearch')"
                    >
                        <el-icon :size="14"><search /></el-icon>
                        <span>联网搜索</span>
                    </button>
                </el-tooltip>

                <!-- 函数调用 -->
                <el-tooltip content="函数调用" placement="top">
                    <button
                        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                        :class="chatStore.features.functionCall ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                        @click="toggleFeature('functionCall')"
                    >
                        <el-icon :size="14"><magic-stick /></el-icon>
                        <span>函数调用</span>
                    </button>
                </el-tooltip>

                <div class="ml-auto flex items-center gap-2">
                    <!-- 模型选择 -->
                    <el-select
                        v-model="chatStore.currentModel"
                        size="small"
                        style="width: 200px"
                        @change="chatStore.updateModel"
                    >
                        <el-option
                            v-for="opt in availableModelOptions"
                            :key="opt.value"
                            :label="opt.label"
                            :value="opt.value"
                        />
                    </el-select>
                </div>
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
} from '@element-plus/icons-vue'
import { useChatStore } from '../stores/chat'
import { useConfigStore } from '../stores/config'
import type { ChatMessage, ChatMessagePart, ChatFeatures } from '../types/chat'
import { CHAT_MODEL_OPTIONS, TOKEN_PLAN_CHAT_MODELS } from '../types/chat'
import { uploadFile } from '../api/upload'
import { BACKEND_URL } from '../api/client'
import { ElMessage } from 'element-plus'

const SUPPORTED_AUDIO_FORMATS = new Set(['mp3', 'wav', 'ogg', 'm4a'])

const chatStore = useChatStore()
const configStore = useConfigStore()

const availableModelOptions = computed(() => {
  const preset = configStore.config.baseUrlPreset
  if (preset && preset.startsWith('token-plan')) {
    return CHAT_MODEL_OPTIONS.filter(opt => TOKEN_PLAN_CHAT_MODELS.has(opt.value))
  }
  return CHAT_MODEL_OPTIONS
})

// 如果当前模型不在可用列表中，自动切换到第一个可用模型
watch(availableModelOptions, (options) => {
  const values = options.map(o => o.value)
  if (!values.includes(chatStore.currentModel) && values.length > 0) {
    chatStore.updateModel(values[0])
  }
}, { immediate: true })

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
    chatStore.updateFeatures({ [key]: !chatStore.features[key] })
}

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

    await chatStore.sendMessage(userMessage)
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
</style>
