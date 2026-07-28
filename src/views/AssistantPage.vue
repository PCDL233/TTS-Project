<template>
    <div class="h-screen bg-gray-50 flex flex-col overflow-hidden">
        <AppHeader />

        <!-- 主内容区 -->
        <main class="flex-1 flex overflow-hidden">
            <!-- 左侧会话栏 -->
            <aside
                class="bg-gray-50 border-r border-gray-200 shrink-0 overflow-hidden transition-all duration-300"
                :class="sidebarCollapsed ? 'w-0 opacity-0' : 'w-64 opacity-100'"
            >
                <ChatSidebar />
            </aside>

            <!-- 右侧聊天区 -->
            <div class="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
                <!-- 收起/展开按钮 + 会话标题 + MCP 控制 -->
                <div class="px-3 py-2 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div class="flex items-center min-w-0">
                        <el-button text class="p-1! h-auto!" @click="sidebarCollapsed = !sidebarCollapsed">
                            <el-icon :size="16"><expand v-if="sidebarCollapsed" /><fold v-else /></el-icon>
                        </el-button>
                        <span v-if="chatStore.currentConversation" class="ml-2 text-sm text-gray-500 truncate">
                            {{ chatStore.currentConversation.title }}
                        </span>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <el-select
                            :model-value="assistantSelection"
                            class="assistant-selector"
                            size="small"
                            :loading="agentStore.loading"
                            :title="assistantSelectionLabel"
                            @change="changeAssistant"
                        >
                            <el-option label="通用助手" value="general" />
                            <el-option
                                v-if="unavailableSelectedAgent"
                                :label="unavailableSelectedAgent.label"
                                :value="unavailableSelectedAgent.value"
                                disabled
                            />
                            <el-option
                                v-for="agent in agentStore.publishedAgents"
                                :key="agent.id"
                                :label="agent.name"
                                :value="String(agent.id)"
                            />
                        </el-select>
                        <el-tag v-if="chatStore.isAgentMode" type="success" size="small">
                            {{ currentAgentLabel }}
                        </el-tag>
                        <template v-if="!chatStore.isAgentMode">
                            <div class="flex items-center gap-1">
                                <el-tag :type="mcpStore.mcpEnabled ? 'success' : 'info'" size="small">
                                    <el-icon class="mr-0.5"><connection /></el-icon>MCP
                                </el-tag>
                                <el-tooltip content="MCP 工具开关"><el-switch v-model="mcpStore.mcpEnabled" size="small" :disabled="!mcpStore.hasServers" /></el-tooltip>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- 消息列表 -->
                <ChatMessageList />

                <!-- 错误提示 -->
                <el-alert
                    v-if="chatStore.error"
                    :title="chatStore.error"
                    type="error"
                    show-icon
                    closable
                    class="mx-4 mb-2 shrink-0"
                    @close="chatStore.clearError()"
                />

                <!-- 输入区 -->
                <ChatInputArea />
            </div>
        </main>

    </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import {
    Expand,
    Fold,
    Connection,
} from '@element-plus/icons-vue'
import { useConfigStore } from '../stores/config'
import { useChatStore } from '../stores/chat'
import { useMcpStore } from '../stores/mcp'
import { useAgentStore } from '../stores/agent'
import ChatSidebar from '../components/ChatSidebar.vue'
import ChatMessageList from '../components/ChatMessageList.vue'
import ChatInputArea from '../components/ChatInputArea.vue'
import AppHeader from '../components/AppHeader.vue'

const configStore = useConfigStore()
const chatStore = useChatStore()
const mcpStore = useMcpStore()
const agentStore = useAgentStore()

const assistantSelection = computed(() => chatStore.selectedAgentId ? String(chatStore.selectedAgentId) : 'general')
const unavailableSelectedAgent = computed(() => {
  const id = chatStore.selectedAgentId
  if (!id || agentStore.publishedAgents.some((agent) => agent.id === id)) return null
  const name = chatStore.currentConversation?.agentName || `智能体 #${id}`
  return { value: String(id), label: `${name}（历史固定版本）` }
})
const currentAgentLabel = computed(() => {
  const conversation = chatStore.currentConversation
  const name = conversation?.agentName
    || agentStore.publishedAgents.find((agent) => agent.id === chatStore.selectedAgentId)?.name
    || '智能体'
  const version = conversation?.agentVersion
  return version ? `${name} · 固定 v${version}` : `${name} · 固定版本`
})
const assistantSelectionLabel = computed(() => {
  if (!chatStore.selectedAgentId) return '通用助手'
  return chatStore.currentConversation?.agentName
    || agentStore.publishedAgents.find((agent) => agent.id === chatStore.selectedAgentId)?.name
    || `智能体 #${chatStore.selectedAgentId}`
})

async function changeAssistant(value: string) {
  await chatStore.startNewChatWithAgent(value === 'general' ? null : Number(value))
}

const sidebarCollapsed = ref(false)

onMounted(async () => {
    await Promise.all([
        configStore.loadConfig(),
        chatStore.loadConversations(),
        chatStore.loadChatConfig(),
        mcpStore.loadServers(),
        agentStore.loadAgents(),
    ])
})
</script>

<style scoped>
.assistant-selector {
    width: 220px;
    min-width: 220px;
}
</style>
