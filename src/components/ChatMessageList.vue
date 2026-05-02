<template>
    <div ref="listRef" class="flex-1 overflow-y-auto">
        <!-- 空状态 -->
        <div
            v-if="chatStore.messages.length === 0 && !chatStore.loading"
            class="h-full flex flex-col items-center justify-center text-gray-400"
        >
            <div class="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <el-icon :size="32" class="text-gray-300"><chat-line-square /></el-icon>
            </div>
            <div class="text-lg font-medium text-gray-500 mb-1">有什么可以帮你的？</div>
            <div class="text-sm">输入问题，开始与 MiMo 对话</div>
        </div>

        <!-- 消息列表 -->
        <template v-else>
            <ChatMessageItem
                v-for="(msg, index) in chatStore.messages"
                :key="index"
                :message="msg"
                :is-loading="chatStore.loading && index === chatStore.messages.length - 1 && msg.role === 'assistant' && !msg.content"
            />
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { ChatLineSquare } from '@element-plus/icons-vue'
import { useChatStore } from '../stores/chat'
import ChatMessageItem from './ChatMessageItem.vue'

const chatStore = useChatStore()
const listRef = ref<HTMLDivElement>()

watch(
    () => chatStore.messages.length,
    () => {
        nextTick(() => {
            scrollToBottom()
        })
    },
    { immediate: true },
)

watch(
    () => chatStore.messages[chatStore.messages.length - 1]?.content,
    () => {
        nextTick(() => {
            scrollToBottom()
        })
    },
)

function scrollToBottom() {
    if (listRef.value) {
        listRef.value.scrollTop = listRef.value.scrollHeight
    }
}
</script>
