<template>
    <div
        class="py-4 px-4"
        :class="message.role === 'user' ? 'bg-white' : 'bg-gray-50'"
    >
        <div
            class="max-w-3xl mx-auto flex gap-4"
            :class="message.role === 'user' ? 'flex-row-reverse' : 'flex-row'"
        >
            <!-- 头像 -->
            <div class="shrink-0 mt-1">
                <el-avatar
                    :size="36"
                    :src="avatarSrc"
                    :icon="avatarIcon"
                    :class="avatarClass"
                    shape="square"
                    :style="{ borderRadius: '10px' }"
                />
            </div>

            <!-- 内容区域 -->
            <div class="flex-1 min-w-0" :class="message.role === 'user' ? 'text-right' : 'text-left'">
                <!-- 角色名 -->
                <div
                    class="text-xs font-medium text-gray-500 mb-1.5"
                    :class="message.role === 'user' ? 'text-right' : 'text-left'"
                >
                    {{ roleLabel }}
                </div>

                <!-- 用户消息 -->
                <template v-if="message.role === 'user'">
                    <div class="inline-block">
                        <div class="space-y-2">
                            <!-- 图片 -->
                            <div v-if="imageParts.length > 0" class="flex flex-wrap gap-2 justify-end">
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
                            <div v-if="audioPart" class="flex justify-end">
                                <audio
                                    :src="`data:audio/${audioPart.input_audio?.format || 'wav'};base64,${audioPart.input_audio!.data}`"
                                    controls
                                    class="h-8"
                                />
                            </div>
                            <!-- 视频 -->
                            <div v-if="videoPart" class="flex justify-end">
                                <video
                                    :src="videoPart.video_url?.url"
                                    controls
                                    class="h-32 rounded-lg border border-gray-200"
                                />
                            </div>
                            <!-- 文本气泡 -->
                            <div
                                v-if="textContent"
                                class="inline-block text-left px-4 py-2.5 rounded-2xl rounded-tr-sm bg-primary text-white whitespace-pre-wrap leading-relaxed"
                            >
                                {{ textContent }}
                            </div>
                        </div>
                    </div>
                </template>

                <!-- 助手消息 -->
                <template v-else>
                    <div class="text-left">
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
                                <el-icon
                                    :size="12"
                                    class="text-gray-400 ml-auto transition-transform"
                                    :class="showReasoning ? 'rotate-180' : ''"
                                ><arrow-down /></el-icon>
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
                            <!-- Loading 状态 - 三点弹跳动画 -->
                            <div v-if="isLoading && !message.content" class="flex items-center gap-1.5 py-2">
                                <span class="bounce-dot w-2 h-2 bg-gray-400 rounded-full"></span>
                                <span class="bounce-dot w-2 h-2 bg-gray-400 rounded-full" style="animation-delay: 0.15s"></span>
                                <span class="bounce-dot w-2 h-2 bg-gray-400 rounded-full" style="animation-delay: 0.3s"></span>
                            </div>
                            <!-- 正常内容 -->
                            <div
                                v-else-if="message.content"
                                class="markdown-body"
                                v-html="renderedHtml"
                            />
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
                                    <span class="truncate max-w-37.5">{{ anno.title || anno.site_name || '来源' }}</span>
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
                            <el-button text class="p-1! h-auto!" @click="copyContent">
                                <el-icon :size="14"><document-copy /></el-icon>
                            </el-button>
                        </div>
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
import { useAuthStore } from '../stores/auth'
import { BACKEND_URL } from '../api/client'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

const props = defineProps<{
    message: ChatMessage
    isLoading?: boolean
}>()

const authStore = useAuthStore()
const showReasoning = ref(false)

// 配置 marked
const renderer = new marked.Renderer()
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
    const language = lang || 'plaintext'
    let highlighted = text
    try {
        if (hljs.getLanguage(language)) {
            highlighted = hljs.highlight(text, { language }).value
        } else {
            highlighted = hljs.highlightAuto(text).value
        }
    } catch {
        highlighted = hljs.highlightAuto(text).value
    }
    return `<pre class="hljs"><code class="language-${language}">${highlighted}</code></pre>`
}
marked.use({ renderer, gfm: true, breaks: true })

function renderMarkdown(content: string): string {
    if (!content) return ''
    try {
        const result = marked.parse(content, { async: false })
        return typeof result === 'string' ? result : String(result)
    } catch {
        return content
    }
}

const renderedHtml = computed(() => renderMarkdown(props.message.content || ''))

const avatarSrc = computed(() => {
    if (props.message.role === 'user') {
        const avatar = authStore.user?.avatar
        if (!avatar) return ''
        if (avatar.startsWith('http')) return avatar
        return `${BACKEND_URL}${avatar}`
    }
    return ''
})

const avatarIcon = computed(() => UserFilled)

const avatarClass = computed(() => {
    return props.message.role === 'user'
        ? 'bg-gradient-to-br from-blue-400 to-primary text-white'
        : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
})

const roleLabel = computed(() => {
    return props.message.role === 'user' ? authStore.user?.nickname || '我' : 'MiMo'
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

const videoPart = computed(() => {
    if (!props.message.contentParts) return null
    return props.message.contentParts.find((p: ChatMessagePart) => p.type === 'video_url') || null
})

function copyContent() {
    navigator.clipboard.writeText(props.message.content).then(() => {
        ElMessage.success('已复制到剪贴板')
    })
}
</script>

<style scoped>
.markdown-body :deep(p) {
    margin: 0.5em 0;
    line-height: 1.7;
}

.markdown-body :deep(p:first-child) {
    margin-top: 0;
}

.markdown-body :deep(p:last-child) {
    margin-bottom: 0;
}

.markdown-body :deep(pre) {
    background: #f6f8fa;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    font-size: 0.875rem;
    line-height: 1.5;
    margin: 0.75em 0;
}

.markdown-body :deep(code) {
    background: #f6f8fa;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
}

.markdown-body :deep(pre code) {
    background: transparent;
    padding: 0;
    border-radius: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
    margin: 0.5em 0;
    padding-left: 1.5em;
}

.markdown-body :deep(li) {
    margin: 0.25em 0;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
    margin: 0.75em 0 0.5em;
    font-weight: 600;
    line-height: 1.3;
}

.markdown-body :deep(h1) { font-size: 1.35em; }
.markdown-body :deep(h2) { font-size: 1.2em; }
.markdown-body :deep(h3) { font-size: 1.1em; }
.markdown-body :deep(h4) { font-size: 1em; }

.markdown-body :deep(blockquote) {
    margin: 0.5em 0;
    padding-left: 1em;
    border-left: 3px solid #e5e7eb;
    color: #6b7280;
}

.markdown-body :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 0.75em 0;
    font-size: 0.875rem;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
    border: 1px solid #e5e7eb;
    padding: 0.5em 0.75em;
    text-align: left;
}

.markdown-body :deep(th) {
    background: #f9fafb;
    font-weight: 600;
}

.markdown-body :deep(tr:nth-child(even)) {
    background: #f9fafb;
}

.markdown-body :deep(a) {
    color: #2563eb;
    text-decoration: none;
}

.markdown-body :deep(a:hover) {
    text-decoration: underline;
}

.markdown-body :deep(hr) {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 1em 0;
}

.bounce-dot {
    animation: bounceDot 1.2s ease-in-out infinite;
}

@keyframes bounceDot {
    0%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-8px); }
}
</style>
