<template>
    <div class="flex flex-col h-full bg-gray-50 border-r border-gray-200">
        <!-- 顶部：新对话按钮 -->
        <div class="p-3">
            <el-button
                class="w-full justify-start!"
                @click="handleNewChat"
            >
                <el-icon class="mr-2"><plus /></el-icon>
                新对话
            </el-button>
        </div>

        <!-- 会话列表 -->
        <div class="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
            <div
                v-for="conv in chatStore.conversations"
                :key="conv.id"
                class="group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm"
                :class="
                    chatStore.currentConversationId === conv.id
                        ? 'bg-white shadow-sm border border-gray-200 text-gray-900'
                        : 'hover:bg-gray-200 text-gray-600'
                "
                @click="chatStore.selectConversation(conv.id)"
            >
                <el-icon :size="14"><chat-dot-round /></el-icon>
                <span class="flex-1 truncate">{{ conv.title }}</span>
                <el-icon v-if="conv.knowledgeBaseId" :size="12" class="text-primary-400 shrink-0" title="已关联知识库"><collection /></el-icon>
                <el-button
                    v-if="chatStore.currentConversationId === conv.id"
                    class="p-1! h-auto! opacity-0 group-hover:opacity-100 transition-opacity"
                    text
                    @click.stop="handleDelete(conv.id)"
                >
                    <el-icon :size="14"><delete /></el-icon>
                </el-button>
            </div>

            <div
                v-if="chatStore.conversations.length === 0"
                class="text-center text-gray-400 text-xs py-8"
            >
                暂无历史对话
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Plus, ChatDotRound, Delete, Collection } from '@element-plus/icons-vue'
import { useChatStore } from '../stores/chat'
import { ElMessageBox } from 'element-plus'

const chatStore = useChatStore()

async function handleNewChat() {
    await chatStore.createNewChat()
}

async function handleDelete(id: number) {
    try {
        await ElMessageBox.confirm('确定要删除这个对话吗？', '提示', {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning',
        })
        await chatStore.deleteConversation(id)
    } catch {
        // 取消删除
    }
}
</script>
