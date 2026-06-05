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
                        <el-tooltip content="MCP 工具开关">
                            <el-switch
                                v-model="mcpStore.mcpEnabled"
                                size="small"
                                inline-prompt
                                active-text="MCP开"
                                inactive-text="MCP关"
                                :disabled="!mcpStore.hasServers"
                            />
                        </el-tooltip>
                        <el-tooltip content="管理 MCP 服务器">
                            <el-button text size="small" @click="$router.push('/mcp-servers')">
                                <el-icon><setting /></el-icon>
                            </el-button>
                        </el-tooltip>
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
import { ref, onMounted } from 'vue'
import {
    Expand,
    Fold,
    Setting,
} from '@element-plus/icons-vue'
import { useConfigStore } from '../stores/config'
import { useChatStore } from '../stores/chat'
import { useMcpStore } from '../stores/mcp'
import ChatSidebar from '../components/ChatSidebar.vue'
import ChatMessageList from '../components/ChatMessageList.vue'
import ChatInputArea from '../components/ChatInputArea.vue'
import AppHeader from '../components/AppHeader.vue'

const configStore = useConfigStore()
const chatStore = useChatStore()
const mcpStore = useMcpStore()

const sidebarCollapsed = ref(false)

onMounted(() => {
    configStore.loadConfig()
    chatStore.loadConversations()
    chatStore.loadChatConfig()
    mcpStore.loadServers()
})
</script>
