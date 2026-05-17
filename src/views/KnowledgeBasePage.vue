<template>
    <div class="h-screen bg-gray-50 flex flex-col overflow-hidden">
        <!-- 顶部导航 -->
        <header class="bg-white border-b border-gray-200 shrink-0">
            <div class="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
                <div class="flex items-center gap-6">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <el-icon color="white" :size="20"><chat-dot-square /></el-icon>
                        </div>
                        <h1 class="text-lg font-bold text-gray-800">MiMo AI 助手</h1>
                    </div>
                    <div class="flex items-center bg-gray-100 rounded-lg p-1">
                        <router-link
                            to="/assistant"
                            class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors text-gray-500 hover:text-gray-700"
                        >
                            智能助手
                        </router-link>
                        <router-link
                            to="/knowledge-base"
                            class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors bg-white text-gray-900 shadow-sm"
                        >
                            知识库
                        </router-link>
                        <router-link
                            to="/tts"
                            class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors text-gray-500 hover:text-gray-700"
                        >
                            语音合成
                        </router-link>
                    </div>
                </div>
                <div class="flex items-center gap-3">
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

        <!-- 主内容 -->
        <main class="flex-1 flex overflow-hidden">
            <!-- 左侧知识库列表 -->
            <aside class="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0">
                <div class="p-4 border-b border-gray-100">
                    <el-button class="w-full justify-start!" type="primary" @click="showCreateDialog = true">
                        <el-icon class="mr-2"><plus /></el-icon>
                        新建知识库
                    </el-button>
                </div>
                <div class="flex-1 overflow-y-auto p-3 space-y-2">
                    <div
                        v-for="kb in knowledgeBases"
                        :key="kb.id"
                        class="p-3 rounded-lg cursor-pointer transition-colors border"
                        :class="selectedKb?.id === kb.id
                            ? 'bg-primary-50 border-primary-200'
                            : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'"
                        @click="selectKb(kb)"
                    >
                        <div class="flex items-center gap-2 mb-1">
                            <el-icon :size="16"><collection /></el-icon>
                            <span class="font-medium text-sm truncate flex-1">{{ kb.name }}</span>
                            <el-tag :type="statusType(kb.status)" size="small">{{ statusLabel(kb.status) }}</el-tag>
                        </div>
                        <p class="text-xs text-gray-400 truncate">{{ kb.description || '暂无描述' }}</p>
                        <div class="mt-2 flex items-center gap-3 text-xs text-gray-400">
                            <span>{{ kb.documentCount }} 个文档</span>
                            <span>{{ kb.chunkCount }} 个片段</span>
                        </div>
                    </div>
                    <el-empty v-if="knowledgeBases.length === 0" description="暂无知识库" />
                </div>
            </aside>

            <!-- 右侧详情 -->
            <div class="flex-1 flex flex-col min-w-0 bg-gray-50 overflow-hidden">
                <div v-if="selectedKb" class="flex flex-col h-full">
                    <!-- 知识库头部 -->
                    <div class="bg-white border-b border-gray-200 px-6 py-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <h2 class="text-lg font-semibold">{{ selectedKb.name }}</h2>
                                <p class="text-sm text-gray-500 mt-1">{{ selectedKb.description || '暂无描述' }}</p>
                            </div>
                            <el-button type="danger" plain size="small" @click="handleDeleteKb(selectedKb.id)">
                                <el-icon class="mr-1"><delete /></el-icon>
                                删除知识库
                            </el-button>
                        </div>
                    </div>

                    <!-- 文档列表 + 上传区 -->
                    <div class="flex-1 overflow-y-auto p-6">
                        <!-- 上传区 -->
                        <div
                            class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-6 bg-white hover:border-primary-400 transition-colors"
                            @dragover.prevent
                            @drop.prevent="handleDrop"
                        >
                            <el-icon :size="32" class="text-gray-400 mb-2"><upload /></el-icon>
                            <p class="text-sm text-gray-600 mb-2">拖拽文件到此处，或 <el-link type="primary" @click="triggerUpload">点击上传</el-link></p>
                            <p class="text-xs text-gray-400">支持 PDF、Word、Excel、CSV、TXT、MD，单个文件最大 20MB</p>
                            <input ref="fileInput" type="file" multiple class="hidden" accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md" @change="handleFileChange">
                        </div>

                        <!-- 文档列表 -->
                        <div class="bg-white rounded-lg border border-gray-200">
                            <div class="px-4 py-3 border-b border-gray-100 font-medium text-sm">文档列表</div>
                            <div v-if="documents.length === 0" class="p-8 text-center text-gray-400 text-sm">
                                暂无文档，请上传文件
                            </div>
                            <div v-else class="divide-y divide-gray-100">
                                <div
                                    v-for="doc in documents"
                                    :key="doc.id"
                                    class="px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                                >
                                    <div class="flex items-center gap-3 min-w-0">
                                        <el-icon :size="18" class="text-gray-400 shrink-0"><document /></el-icon>
                                        <div class="min-w-0">
                                            <div class="text-sm truncate">{{ doc.originalName }}</div>
                                            <div class="text-xs text-gray-400 mt-0.5">
                                                {{ formatSize(doc.size) }} · {{ doc.chunkCount }} 个片段
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2 shrink-0 ml-2">
                                        <el-tag :type="docStatusType(doc.status)" size="small">
                                            {{ docStatusLabel(doc.status) }}
                                        </el-tag>
                                        <el-button
                                            v-if="doc.status === 'failed'"
                                            text
                                            type="danger"
                                            size="small"
                                            class="p-1! h-auto!"
                                            title="{{ doc.errorMessage }}"
                                        >
                                            <el-icon><warning /></el-icon>
                                        </el-button>
                                        <el-button text class="p-1! h-auto!" @click="handleDeleteDoc(doc.id)">
                                            <el-icon><delete /></el-icon>
                                        </el-button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <el-empty v-else description="请选择一个知识库" class="h-full" />
            </div>
        </main>

        <!-- 创建知识库对话框 -->
        <el-dialog v-model="showCreateDialog" title="新建知识库" width="480px">
            <el-form :model="createForm" label-width="80px">
                <el-form-item label="名称" required>
                    <el-input v-model="createForm.name" placeholder="请输入知识库名称" />
                </el-form-item>
                <el-form-item label="描述">
                    <el-input v-model="createForm.description" type="textarea" :rows="3" placeholder="可选，描述知识库用途" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showCreateDialog = false">取消</el-button>
                <el-button type="primary" @click="handleCreate">创建</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
    ChatDotSquare, Plus, Collection, Upload, Document,
    Delete, Warning, UserFilled, ArrowDown, User, SetUp, SwitchButton,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import {
    createKnowledgeBase, fetchKnowledgeBases, deleteKnowledgeBase,
    uploadDocument, fetchDocuments, deleteDocument, getDocumentStatus,
    type KnowledgeBase, type KnowledgeDocument,
} from '../api/knowledge-base'

const router = useRouter()
const authStore = useAuthStore()

const knowledgeBases = ref<KnowledgeBase[]>([])
const selectedKb = ref<KnowledgeBase | null>(null)
const documents = ref<KnowledgeDocument[]>([])
const showCreateDialog = ref(false)
const createForm = ref({ name: '', description: '' })
const fileInput = ref<HTMLInputElement | null>(null)
const statusPollingTimers = ref<Map<number, number>>(new Map())

const avatarUrl = computed(() => {
    const avatar = authStore.user?.avatar
    if (!avatar) return ''
    if (avatar.startsWith('http')) return avatar
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    return `${backendUrl}${avatar}`
})

function statusType(status: string) {
    const map: Record<string, string> = { empty: 'info', processing: 'warning', ready: 'success' }
    return map[status] || 'info'
}

function statusLabel(status: string) {
    const map: Record<string, string> = { empty: '空', processing: '处理中', ready: '就绪' }
    return map[status] || status
}

function docStatusType(status: string) {
    const map: Record<string, string> = { pending: 'info', processing: 'warning', completed: 'success', failed: 'danger' }
    return map[status] || 'info'
}

function docStatusLabel(status: string) {
    const map: Record<string, string> = { pending: '待处理', processing: '处理中', completed: '已完成', failed: '失败' }
    return map[status] || status
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function loadKnowledgeBases() {
    try {
        knowledgeBases.value = await fetchKnowledgeBases()
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || '加载知识库失败')
    }
}

async function selectKb(kb: KnowledgeBase) {
    selectedKb.value = kb
    await loadDocuments()
}

async function loadDocuments() {
    if (!selectedKb.value) return
    try {
        documents.value = await fetchDocuments(selectedKb.value.id)
        startStatusPolling()
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || '加载文档失败')
    }
}

function startStatusPolling() {
    // 清除旧定时器
    statusPollingTimers.value.forEach((timer) => clearInterval(timer))
    statusPollingTimers.value.clear()

    // 为 pending/processing 的文档启动轮询
    for (const doc of documents.value) {
        if (doc.status === 'pending' || doc.status === 'processing') {
            const timer = window.setInterval(async () => {
                if (!selectedKb.value) return
                try {
                    const updated = await getDocumentStatus(selectedKb.value.id, doc.id)
                    const idx = documents.value.findIndex((d) => d.id === doc.id)
                    if (idx !== -1) {
                        documents.value[idx] = updated
                    }
                    if (updated.status === 'completed' || updated.status === 'failed') {
                        clearInterval(timer)
                        statusPollingTimers.value.delete(doc.id)
                        // 刷新知识库状态
                        await loadKnowledgeBases()
                        const refreshed = knowledgeBases.value.find((k) => k.id === selectedKb.value?.id)
                        if (refreshed) selectedKb.value = refreshed
                    }
                } catch {
                    clearInterval(timer)
                    statusPollingTimers.value.delete(doc.id)
                }
            }, 2000)
            statusPollingTimers.value.set(doc.id, timer)
        }
    }
}

async function handleCreate() {
    if (!createForm.value.name.trim()) {
        ElMessage.warning('请输入知识库名称')
        return
    }
    try {
        await createKnowledgeBase(createForm.value)
        ElMessage.success('知识库创建成功')
        showCreateDialog.value = false
        createForm.value = { name: '', description: '' }
        await loadKnowledgeBases()
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || '创建失败')
    }
}

async function handleDeleteKb(id: number) {
    try {
        await ElMessageBox.confirm('确定要删除这个知识库吗？关联的文档和向量数据将一并删除。', '提示', {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning',
        })
        await deleteKnowledgeBase(id)
        ElMessage.success('已删除')
        selectedKb.value = null
        await loadKnowledgeBases()
    } catch {
        // 取消
    }
}

function triggerUpload() {
    fileInput.value?.click()
}

function handleDrop(e: DragEvent) {
    const files = e.dataTransfer?.files
    if (files) {
        for (const file of files) {
            uploadFile(file)
        }
    }
}

function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement
    if (target.files) {
        for (const file of target.files) {
            uploadFile(file)
        }
    }
    target.value = ''
}

async function uploadFile(file: File) {
    if (!selectedKb.value) return
    try {
        await uploadDocument(selectedKb.value.id, file)
        ElMessage.success(`已上传 ${file.name}`)
        await loadDocuments()
        await loadKnowledgeBases()
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || `上传 ${file.name} 失败`)
    }
}

async function handleDeleteDoc(docId: number) {
    if (!selectedKb.value) return
    try {
        await ElMessageBox.confirm('确定要删除这个文档吗？', '提示', {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning',
        })
        await deleteDocument(selectedKb.value.id, docId)
        ElMessage.success('已删除')
        await loadDocuments()
        await loadKnowledgeBases()
    } catch {
        // 取消
    }
}

function handleUserCommand(cmd: string) {
    if (cmd === 'profile') router.push('/profile')
    else if (cmd === 'admin') router.push('/admin')
    else if (cmd === 'logout') {
        authStore.logout()
        router.push('/login')
    }
}

onMounted(() => {
    loadKnowledgeBases()
})

onUnmounted(() => {
    statusPollingTimers.value.forEach((timer) => clearInterval(timer))
})
</script>
