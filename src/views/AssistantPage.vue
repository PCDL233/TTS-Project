<template>
    <div class="h-screen bg-gray-50 flex flex-col overflow-hidden">
        <!-- 顶部导航 -->
        <header class="bg-white border-b border-gray-200 shrink-0">
            <div
                class="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between"
            >
                <div class="flex items-center gap-6">
                    <!-- Logo -->
                    <div class="flex items-center gap-3">
                        <div
                            class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"
                        >
                            <el-icon color="white" :size="20"><chat-dot-square /></el-icon>
                        </div>
                        <h1 class="text-lg font-bold text-gray-800">MiMo AI 助手</h1>
                    </div>

                    <!-- 模块切换 -->
                    <div class="flex items-center bg-gray-100 rounded-lg p-1">
                        <router-link
                            to="/assistant"
                            class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                            :class="$route.path === '/assistant' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                        >
                            智能助手
                        </router-link>
                        <router-link
                            to="/tts"
                            class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                            :class="$route.path === '/tts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                        >
                            语音合成
                        </router-link>
                    </div>
                </div>

                <div class="flex items-center gap-3">
                    <el-tag
                        :type="configStore.config.apiKey ? 'success' : 'warning'"
                        size="small"
                    >
                        {{ configStore.config.apiKey ? "API Key 已设置" : "未设置 API Key" }}
                    </el-tag>
                    <el-button size="small" @click="showApiKeyDialog = true">
                        <el-icon><setting /></el-icon>
                        API 设置
                    </el-button>
                    <el-divider direction="vertical" />
                    <el-dropdown @command="handleUserCommand">
                        <span class="flex items-center gap-2 cursor-pointer">
                            <el-avatar :size="28" :src="avatarUrl">
                                <el-icon><user-filled /></el-icon>
                            </el-avatar>
                            <span class="text-sm text-gray-700">{{ authStore.user?.nickname || authStore.user?.username }}</span>
                            <el-icon class="text-gray-400"><arrow-down /></el-icon>
                        </span>
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item command="profile">
                                    <el-icon><user /></el-icon>
                                    <span>个人中心</span>
                                </el-dropdown-item>
                                <el-dropdown-item v-if="authStore.isAdmin" command="admin">
                                    <el-icon><set-up /></el-icon>
                                    <span>后台管理</span>
                                </el-dropdown-item>
                                <el-dropdown-item divided command="logout">
                                    <el-icon><switch-button /></el-icon>
                                    <span>退出登录</span>
                                </el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                </div>
            </div>
        </header>

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
                <!-- 收起/展开按钮 + 会话标题 -->
                <div class="px-3 py-2 border-b border-gray-100 flex items-center shrink-0">
                    <el-button text class="p-1! h-auto!" @click="sidebarCollapsed = !sidebarCollapsed">
                        <el-icon :size="16"><expand v-if="sidebarCollapsed" /><fold v-else /></el-icon>
                    </el-button>
                    <span v-if="chatStore.currentConversation" class="ml-2 text-sm text-gray-500 truncate">
                        {{ chatStore.currentConversation.title }}
                    </span>
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

        <!-- API 设置弹窗 -->
        <ApiKeyDialog v-model="showApiKeyDialog" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
    ChatDotSquare,
    Setting,
    UserFilled,
    ArrowDown,
    User,
    SetUp,
    SwitchButton,
    Expand,
    Fold,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useConfigStore } from '../stores/config'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import ChatSidebar from '../components/ChatSidebar.vue'
import ChatMessageList from '../components/ChatMessageList.vue'
import ChatInputArea from '../components/ChatInputArea.vue'
import ApiKeyDialog from '../components/ApiKeyDialog.vue'

const router = useRouter()
const configStore = useConfigStore()
const authStore = useAuthStore()
const chatStore = useChatStore()

const sidebarCollapsed = ref(false)
const showApiKeyDialog = ref(false)

const avatarUrl = computed(() => {
    const avatar = authStore.user?.avatar
    if (!avatar) return ''
    if (avatar.startsWith('http')) return avatar
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    return `${backendUrl}${avatar}`
})

function handleUserCommand(cmd: string) {
    if (cmd === 'profile') {
        router.push('/profile')
    } else if (cmd === 'admin') {
        router.push('/admin')
    } else if (cmd === 'logout') {
        handleLogout()
    }
}

async function handleLogout() {
    try {
        await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
        })
        authStore.logout()
        ElMessage.success('已退出登录')
        router.push('/login')
    } catch {
        // 取消退出
    }
}

onMounted(() => {
    configStore.loadConfig()
    chatStore.loadConversations()
    chatStore.loadChatConfig()
})
</script>
