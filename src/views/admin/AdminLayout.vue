<template>
    <div class="h-screen flex bg-gray-100 overflow-hidden">
        <!-- 侧边栏 -->
        <aside class="w-56 bg-[#1e293b] text-white flex flex-col shrink-0">
            <div class="h-14 flex items-center px-5 border-b border-gray-700">
                <el-icon :size="20" class="mr-2"><microphone /></el-icon>
                <span class="font-bold text-sm">后台管理系统</span>
            </div>

            <nav class="flex-1 py-3 overflow-y-auto">
                <router-link
                    v-for="item in menuItems"
                    :key="item.path"
                    :to="item.path"
                    class="flex items-center px-5 py-3 text-sm hover:bg-gray-700 transition-colors"
                    :class="{ 'bg-gray-700 text-blue-400': isActive(item.path) }"
                >
                    <el-icon class="mr-3"><component :is="item.icon" /></el-icon>
                    {{ item.label }}
                </router-link>
            </nav>

            <div class="p-4 border-t border-gray-700 text-xs text-gray-400 text-center">
                MiMo TTS Admin
            </div>
        </aside>

        <!-- 右侧内容区 -->
        <div class="flex-1 flex flex-col min-w-0">
            <!-- 顶部栏 -->
            <header class="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
                <div class="text-sm text-gray-500">当前位置：{{ currentTitle }}</div>
                <div class="flex items-center gap-4">
                    <el-button size="small" @click="$router.push('/')">
                        <el-icon><home-filled /></el-icon>
                        返回前台
                    </el-button>
                    <el-dropdown @command="handleCommand">
                        <span class="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                            <el-avatar :size="28" :src="avatarUrl">
                                <el-icon><user-filled /></el-icon>
                            </el-avatar>
                            <span>{{ authStore.user?.nickname || authStore.user?.username }}</span>
                            <el-icon><arrow-down /></el-icon>
                        </span>
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                </div>
            </header>

            <!-- 页面内容 -->
            <main class="flex-1 p-6 overflow-auto">
                <router-view />
            </main>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import {
    DataLine, User, Medal, Document, SetUp, CollectionTag, ArrowDown,
    HomeFilled, UserFilled, Microphone
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const avatarUrl = computed(() => {
    const avatar = authStore.user?.avatar
    if (!avatar) return ''
    if (avatar.startsWith('http')) return avatar
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    return `${backendUrl}${avatar}`
})

const menuItems = [
    { path: '/admin/dashboard', label: '数据看板', icon: 'DataLine' },
    { path: '/admin/users', label: '用户管理', icon: 'User' },
    { path: '/admin/roles', label: '角色管理', icon: 'Medal' },
    { path: '/admin/login-logs', label: '登录日志', icon: 'Document' },
    { path: '/admin/operation-logs', label: '操作日志', icon: 'Document' },
    { path: '/admin/system-config', label: '系统配置', icon: 'SetUp' },
    { path: '/admin/audio-tags', label: '音频标签', icon: 'CollectionTag' },
]

const currentTitle = computed(() => {
    const item = menuItems.find((i) => route.path.startsWith(i.path))
    return item?.label || '后台管理'
})

function isActive(path: string) {
    return route.path === path || route.path.startsWith(path + '/')
}

function handleCommand(cmd: string) {
    if (cmd === 'profile') {
        router.push('/profile')
    } else if (cmd === 'logout') {
        authStore.logout()
        router.push('/login')
    }
}
</script>

<style scoped>
.router-link-active {
    background-color: rgb(55 65 81);
    color: rgb(96 165 250);
}
</style>
