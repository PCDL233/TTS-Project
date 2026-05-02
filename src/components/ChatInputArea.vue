<template>
    <div class="border-t border-gray-200 bg-white p-4">
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
                        :src="`data:audio/wav;base64,${inputAudio.data}`"
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

                <!-- 底部工具栏 -->
                <div class="flex items-center justify-between mt-2">
                    <div class="flex items-center gap-1">
                        <!-- 图片上传 -->
                        <el-button text class="!p-2 !h-auto" @click="triggerImageUpload">
                            <el-icon :size="16"><picture /></el-icon>
                        </el-button>
                        <input
                            ref="imageInputRef"
                            type="file"
                            accept="image/*"
                            class="hidden"
                            @change="handleImageChange"
                        />

                        <!-- 音频上传 -->
                        <el-button text class="!p-2 !h-auto" @click="triggerAudioUpload">
                            <el-icon :size="16"><microphone /></el-icon>
                        </el-button>
                        <input
                            ref="audioInputRef"
                            type="file"
                            accept="audio/*"
                            class="hidden"
                            @change="handleAudioChange"
                        />

                        <el-divider direction="vertical" />

                        <!-- 功能开关 -->
                        <el-tooltip content="深度思考" placement="top">
                            <el-button
                                text
                                class="!p-2 !h-auto"
                                :class="chatStore.features.thinking ? 'text-amber-500' : 'text-gray-400'"
                                @click="chatStore.updateFeatures({ thinking: !chatStore.features.thinking })"
                            >
                                <el-icon :size="16"><cpu /></el-icon>
                            </el-button>
                        </el-tooltip>

                        <el-tooltip content="联网搜索" placement="top">
                            <el-button
                                text
                                class="!p-2 !h-auto"
                                :class="chatStore.features.webSearch ? 'text-blue-500' : 'text-gray-400'"
                                @click="chatStore.updateFeatures({ webSearch: !chatStore.features.webSearch })"
                            >
                                <el-icon :size="16"><search /></el-icon>
                            </el-button>
                        </el-tooltip>

                        <el-tooltip content="结构化输出 (JSON)" placement="top">
                            <el-button
                                text
                                class="!p-2 !h-auto"
                                :class="chatStore.features.jsonMode ? 'text-green-500' : 'text-gray-400'"
                                @click="chatStore.updateFeatures({ jsonMode: !chatStore.features.jsonMode })"
                            >
                                <el-icon :size="16"><document /></el-icon>
                            </el-button>
                        </el-tooltip>

                        <el-tooltip content="函数调用" placement="top">
                            <el-button
                                text
                                class="!p-2 !h-auto"
                                :class="chatStore.features.functionCall ? 'text-purple-500' : 'text-gray-400'"
                                @click="chatStore.updateFeatures({ functionCall: !chatStore.features.functionCall })"
                            >
                                <el-icon :size="16"><tools /></el-icon>
                            </el-button>
                        </el-tooltip>
                    </div>

                    <div class="flex items-center gap-2">
                        <!-- 模型选择 -->
                        <el-select
                            v-model="chatStore.currentModel"
                            size="small"
                            class="w-40"
                            @change="chatStore.updateModel"
                        >
                            <el-option
                                v-for="opt in CHAT_MODEL_OPTIONS"
                                :key="opt.value"
                                :label="opt.label"
                                :value="opt.value"
                            />
                        </el-select>

                        <!-- 发送/停止按钮 -->
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
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
    Picture,
    Microphone,
    Cpu,
    Search,
    Document,
    Tools,
    VideoPause,
    Promotion,
} from '@element-plus/icons-vue'
import { useChatStore } from '../stores/chat'
import type { ChatMessage, ChatMessagePart } from '../types/chat'
import { CHAT_MODEL_OPTIONS } from '../types/chat'

const chatStore = useChatStore()

const inputText = ref('')
const inputImages = ref<string[]>([])
const inputAudio = ref<{ data: string; format: string } | null>(null)

const imageInputRef = ref<HTMLInputElement>()
const audioInputRef = ref<HTMLInputElement>()

const canSend = computed(() => {
    if (chatStore.loading) return false
    if (inputText.value.trim()) return true
    if (inputImages.value.length > 0) return true
    if (inputAudio.value) return true
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

    const userMessage: ChatMessage = {
        role: 'user',
        content: inputText.value.trim(),
        contentParts: contentParts.length > 0 ? contentParts : undefined,
    }

    // 清空输入
    inputText.value = ''
    inputImages.value = []
    inputAudio.value = null

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

function handleImageChange(e: Event) {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

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

    const reader = new FileReader()
    reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1]
        const format = file.name.endsWith('.wav') ? 'wav' : 'mp3'
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
</script>

<style scoped>
.chat-textarea :deep(.el-textarea__inner) {
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
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
