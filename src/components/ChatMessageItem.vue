<template>
    <div class="py-4" :class="message.role === 'user' ? 'bg-white' : 'bg-gray-50'">
        <div class="max-w-3xl mx-auto px-4 flex gap-4">
            <!-- 头像 -->
            <div class="shrink-0 mt-1">
                <el-avatar
                    :size="32"
                    :src="avatarSrc"
                    :icon="avatarIcon"
                    :class="avatarClass"
                />
            </div>

            <!-- 内容 -->
            <div class="flex-1 min-w-0">
                <!-- 角色名 -->
                <div class="text-sm font-medium text-gray-700 mb-1.5">
                    {{ roleLabel }}
                </div>

                <!-- 用户多模态内容 -->
                <template v-if="message.role === 'user'">
                    <div class="space-y-2">
                        <!-- 图片 -->
                        <div v-if="imageParts.length > 0" class="flex flex-wrap gap-2">
                            <el-image
                                v-for="(img, idx) in imageParts"
                                :key="idx"
                                :src="img.image_url?.url"
                                :preview-src-list="imageParts.map((p) => p.image_url!.url)"
                                class="w-32 h-32 rounded-lg border border-gray-200 object-cover cursor-pointer"
                                fit="cover"
                            />
                        </div>
                        <!-- 音频 -->
                        <div v-if="audioPart">
                            <audio
                                :src="`data:audio/wav;base64,${audioPart.input_audio!.data}`"
                                controls
                                class="h-8"
                            />
                        </div>
                        <!-- 文本 -->
                        <div v-if="textContent" class="text-gray-800 whitespace-pre-wrap">
                            {{ textContent }}
                        </div>
                    </div>
                </template>

                <!-- 助手内容 -->
                <template v-else>
                    <!-- 深度思考 -->
                    <div
                        v-if="message.reasoningContent"
                        class="mb-3 bg-gray-100 rounded-lg overflow-hidden"
                    >
                        <div
                            class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-200 transition-colors"
                            @click="showReasoning = !showReasoning"
                        >
                            <el-icon :size="14" class="text-amber-500"><cpu /></el-icon>
                            <span class="text-xs text-gray-500">深度思考</span>
                            <el-icon :size="12" class="text-gray-400 ml-auto transition-transform" :class="showReasoning ? 'rotate-180' : ''"><arrow-down /></el-icon>
                        </div>
                        <div
                            v-show="showReasoning"
                            class="px-3 pb-3 text-sm text-gray-500 italic whitespace-pre-wrap"
                        >
                            {{ message.reasoningContent }}
                        </div>
                    </div>

                    <!-- 主内容 -->
                    <div class="prose prose-sm max-w-none text-gray-800">
                        <div v-if="message.content" class="whitespace-pre-wrap">{{ message.content }}</div>
                        <div v-else-if="isLoading" class="flex items-center gap-1 text-gray-400">
                            <span class="animate-bounce">●</span>
                            <span class="animate-bounce" style="animation-delay: 0.1s">●</span>
                            <span class="animate-bounce" style="animation-delay: 0.2s">●</span>
                        </div>
                    </div>

                    <!-- 联网搜索引用 -->
                    <div v-if="message.annotations && message.annotations.length > 0" class="mt-3">
                        <div class="text-xs text-gray-500 mb-1.5">搜索来源：</div>
                        <div class="flex flex-wrap gap-2">
                            <a
                                v-for="(anno, idx) in message.annotations"
                                :key="idx"
                                :href="anno.url"
                                target="_blank"
                                class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-md text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                <img
                                    v-if="anno.logo_url"
                                    :src="anno.logo_url"
                                    class="w-3.5 h-3.5 rounded-sm"
                                    alt=""
                                />
                                <span class="truncate max-w-[150px]">{{ anno.title || anno.site_name || '来源' }}</span>
                            </a>
                        </div>
                    </div>

                    <!-- 函数调用 -->
                    <div v-if="message.toolCalls && message.toolCalls.length > 0" class="mt-3">
                        <div class="text-xs text-gray-500 mb-1.5">函数调用：</div>
                        <div class="space-y-1.5">
                            <div
                                v-for="(tc, idx) in message.toolCalls"
                                :key="idx"
                                class="px-3 py-2 bg-gray-100 rounded-md text-xs font-mono text-gray-600"
                            >
                                <div class="font-medium text-gray-700">{{ tc.function.name }}</div>
                                <div class="mt-1 text-gray-500">{{ tc.function.arguments }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- 操作按钮 -->
                    <div v-if="message.role === 'assistant' && message.content" class="mt-2 flex items-center gap-2">
                        <el-button text class="!p-1 !h-auto" @click="copyContent">
                            <el-icon :size="14"><document-copy /></el-icon>
                        </el-button>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Cpu, ArrowDown, DocumentCopy, UserFilled } from '@element-plus/icons-vue'
import type { ChatMessage, ChatMessagePart } from '../types/chat'
import { ElMessage } from 'element-plus'

const props = defineProps<{
    message: ChatMessage
    isLoading?: boolean
}>()

const showReasoning = ref(false)

const avatarSrc = computed(() => {
    if (props.message.role === 'user') return ''
    return ''
})

const avatarIcon = computed(() => {
    return UserFilled as any
})

const avatarClass = computed(() => {
    return props.message.role === 'user'
        ? 'bg-gray-200 text-gray-600'
        : 'bg-primary text-white'
})

const roleLabel = computed(() => {
    return props.message.role === 'user' ? '我' : 'MiMo'
})

const textContent = computed(() => {
    if (!props.message.contentParts) return props.message.content
    const textPart = props.message.contentParts.find((p: ChatMessagePart) => p.type === 'text')
    return textPart?.text || props.message.content
})

const imageParts = computed(() => {
    if (!props.message.contentParts) return []
    return props.message.contentParts.filter((p: ChatMessagePart) => p.type === 'image_url')
})

const audioPart = computed(() => {
    if (!props.message.contentParts) return null
    return props.message.contentParts.find((p: ChatMessagePart) => p.type === 'input_audio') || null
})

function copyContent() {
    navigator.clipboard.writeText(props.message.content).then(() => {
        ElMessage.success('已复制到剪贴板')
    })
}
</script>

<style scoped>
.prose pre {
    background: #f3f4f6;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    font-size: 0.875rem;
    line-height: 1.5;
}

.prose code {
    background: #f3f4f6;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
}

.prose pre code {
    background: transparent;
    padding: 0;
}

@keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
}

.animate-bounce {
    animation: bounce 1s infinite;
}
</style>
