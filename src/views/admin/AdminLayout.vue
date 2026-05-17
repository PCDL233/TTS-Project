<template>
    <div class="h-screen flex bg-gray-100 overflow-hidden">
        <!-- 侧边栏 -->
        <aside class="w-56 bg-[#1e293b] text-white flex flex-col shrink-0">
            <div class="h-14 flex items-center px-5 border-b border-gray-700">
                <el-icon :size="20" class="mr-2"><microphone /></el-icon>
                <span class="font-bold text-sm">后台管理系统</span>
            </div>

            <nav class="flex-1 py-3 overflow-y-auto">
                <template v-for="item in menuItems" :key="'path' in item ? item.path : item.label">
                    <!-- 叶子菜单项 -->
                    <router-link
                        v-if="!('children' in item)"
                        :to="item.path"
                        class="flex items-center px-5 py-3 text-sm hover:bg-gray-700 transition-colors"
                        :class="{
                            'bg-gray-700 text-blue-400': isActive(item.path),
                        }"
                    >
                        <el-icon class="mr-3"
                            ><component :is="item.icon"
                        /></el-icon>
                        {{ item.label }}
                    </router-link>

                    <!-- 分组菜单项 -->
                    <div v-else>
                        <div
                            class="flex items-center px-5 py-3 text-sm hover:bg-gray-700 transition-colors cursor-pointer select-none"
                            :class="{
                                'bg-gray-700 text-blue-400': isGroupActive(item),
                            }"
                            @click="toggleGroup(item.label)"
                        >
                            <el-icon class="mr-3"
                                ><component :is="item.icon"
                            /></el-icon>
                            <span class="flex-1">{{ item.label }}</span>
                            <el-icon class="transition-transform" :class="expandedGroups.includes(item.label) ? 'rotate-180' : ''">
                                <arrow-down />
                            </el-icon>
                        </div>
                        <div
                            v-show="expandedGroups.includes(item.label)"
                            class="bg-gray-800/50"
                        >
                            <router-link
                                v-for="child in item.children"
                                :key="child.path"
                                :to="child.path"
                                class="flex items-center pl-12 pr-5 py-2.5 text-sm hover:bg-gray-700 transition-colors"
                                :class="{
                                    'bg-gray-700 text-blue-400': isActive(child.path),
                                }"
                            >
                                {{ child.label }}
                            </router-link>
                        </div>
                    </div>
                </template>
            </nav>

            <div
                class="p-4 border-t border-gray-700 text-xs text-gray-400 text-center"
            >
                MiMo TTS Admin
            </div>
        </aside>

        <!-- 右侧内容区 -->
        <div class="flex-1 flex flex-col min-w-0">
            <!-- 顶部栏 -->
            <header
                class="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0"
            >
                <div class="text-sm text-gray-500">
                    当前位置：{{ currentTitle }}
                </div>
                <div class="flex items-center gap-4">
                    <el-button size="small" @click="$router.push('/')">
                        <el-icon><home-filled /></el-icon>
                        返回前台
                    </el-button>
                    <el-dropdown @command="handleCommand">
                        <span
                            class="flex items-center gap-2 cursor-pointer text-sm text-gray-700"
                        >
                            <el-avatar :size="28" :src="avatarUrl">
                                <el-icon><user-filled /></el-icon>
                            </el-avatar>
                            <span>{{
                                authStore.user?.nickname ||
                                authStore.user?.username
                            }}</span>
                            <el-icon><arrow-down /></el-icon>
                        </span>
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item command="profile"
                                    >个人中心</el-dropdown-item
                                >
                                <el-dropdown-item divided command="logout"
                                    >退出登录</el-dropdown-item
                                >
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
import { computed, ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import {
    ArrowDown,
    HomeFilled,
    UserFilled,
    Microphone,
} from "@element-plus/icons-vue";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const avatarUrl = computed(() => {
    const avatar = authStore.user?.avatar;
    if (!avatar) return "";
    if (avatar.startsWith("http")) return avatar;
    const backendUrl =
        import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
    return `${backendUrl}${avatar}`;
});

type LeafMenuItem = { path: string; label: string; icon: string };
type GroupMenuItem = { label: string; icon: string; children: { path: string; label: string }[] };
type MenuItem = LeafMenuItem | GroupMenuItem;

const menuItems: MenuItem[] = [
    { path: "/admin/dashboard", label: "数据看板", icon: "DataLine" },
    { path: "/admin/users", label: "用户管理", icon: "User" },
    { path: "/admin/roles", label: "角色管理", icon: "Medal" },
    { path: "/admin/chat", label: "智能助手管理", icon: "ChatDotSquare" },
    {
        label: "日志监控",
        icon: "Document",
        children: [
            { path: "/admin/logs/login-logs", label: "登录日志" },
            { path: "/admin/logs/operation-logs", label: "操作日志" },
        ],
    },
    { path: "/admin/system-config", label: "系统配置", icon: "SetUp" },
    { path: "/admin/audio-tags", label: "音频标签", icon: "CollectionTag" },
];

const expandedGroups = ref<string[]>([]);

function isActive(path: string) {
    return route.path === path || route.path.startsWith(path + "/");
}

function isGroupActive(item: GroupMenuItem) {
    return item.children.some((c) => isActive(c.path));
}

function toggleGroup(label: string) {
    const idx = expandedGroups.value.indexOf(label);
    if (idx > -1) {
        expandedGroups.value.splice(idx, 1);
    } else {
        expandedGroups.value.push(label);
    }
}

const currentTitle = computed(() => {
    for (const item of menuItems) {
        if (!("children" in item)) {
            if (route.path === item.path) {
                return item.label;
            }
        } else {
            const child = item.children.find((c) => route.path === c.path);
            if (child) return child.label;
        }
    }
    return "后台管理";
});

onMounted(() => {
    // 自动展开包含当前路由的分组
    for (const item of menuItems) {
        if ("children" in item && item.children.some((c) => isActive(c.path))) {
            if (!expandedGroups.value.includes(item.label)) {
                expandedGroups.value.push(item.label);
            }
        }
    }
});

function handleCommand(cmd: string) {
    if (cmd === "profile") {
        router.push("/profile");
    } else if (cmd === "logout") {
        authStore.logout();
        router.push("/login");
    }
}
</script>

<style scoped>
.router-link-active {
    background-color: rgb(55 65 81);
    color: rgb(96 165 250);
}
</style>
