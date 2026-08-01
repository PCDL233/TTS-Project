<template>
    <header class="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div
            class="max-w-400 mx-auto px-4 h-14 flex items-center justify-between"
        >
            <div class="flex items-center gap-6">
                <div class="flex items-center gap-3">
                    <div
                        class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"
                    >
                        <el-icon color="white" :size="20"
                            ><magic-stick
                        /></el-icon>
                    </div>
                    <h1 class="text-lg font-bold text-gray-800">
                        {{ systemName }}
                    </h1>
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
                        to="/agents"
                        class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                        :class="$route.path.startsWith('/agents') ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                    >
                        智能体
                    </router-link>
                    <router-link
                        to="/mcp-servers"
                        class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                        :class="$route.path === '/mcp-servers' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                    >
                        MCP
                    </router-link>
                    <router-link
                        to="/knowledge-base"
                        class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                        :class="$route.path === '/knowledge-base' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                    >
                        知识库
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
                    :type="
                        configStore.config.apiKey ? 'success' : 'warning'
                    "
                    size="small"
                >
                    {{
                        configStore.config.apiKey
                            ? "API Key 已设置"
                            : "未设置 API Key"
                    }}
                </el-tag>
                <el-button size="small" @click="showApiKeyDialog = true">
                    <el-icon><setting /></el-icon>
                    API 设置
                </el-button>
                <el-button
                    v-if="showHelp"
                    size="small"
                    link
                    @click="$emit('help')"
                >
                    <el-icon><question-filled /></el-icon>
                    帮助
                </el-button>
                <ThemeToggle />
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

    <!-- API 设置弹窗 -->
    <ApiKeyDialog v-model="showApiKeyDialog" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
    MagicStick,
    Setting,
    QuestionFilled,
    UserFilled,
    ArrowDown,
    User,
    SetUp,
    SwitchButton,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useConfigStore } from '../stores/config'
import { useAuthStore } from '../stores/auth'
import { useSystemConfig } from '../composables/useSystemConfig'
import ApiKeyDialog from './ApiKeyDialog.vue'
import ThemeToggle from './ThemeToggle.vue'

defineProps<{
    showHelp?: boolean
}>()

defineEmits<{
    help: []
}>()

const router = useRouter()
const configStore = useConfigStore()
const authStore = useAuthStore()
const { systemName } = useSystemConfig()

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
</script>
