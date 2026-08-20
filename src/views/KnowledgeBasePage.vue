<template>
    <div class="h-screen bg-gray-50 flex flex-col overflow-hidden">
        <AppHeader />

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
                <div v-loading="kbLoading" class="flex-1 overflow-y-auto p-3 space-y-2">
                    <el-alert
                        v-if="kbError"
                        :title="kbError"
                        type="error"
                        show-icon
                        closable
                        class="mb-2"
                        @close="kbError = ''"
                    >
                        <template #default>
                            <el-button link type="primary" size="small" @click="loadKnowledgeBases">重试</el-button>
                        </template>
                    </el-alert>
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
                    <el-empty v-if="knowledgeBases.length === 0 && !kbLoading" description="暂无知识库" />
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
                                <div class="flex items-center gap-2 mt-2 flex-wrap">
                                    <el-tag size="small" type="info">{{ selectedKb.embeddingModel }}</el-tag>
                                    <el-button link type="primary" size="small" @click="openSwitchModelDialog">
                                        切换模型
                                    </el-button>
                                    <span class="text-xs text-gray-400 mx-1">|</span>
                                    <span class="text-xs text-gray-500">
                                        chunk: {{ selectedKb.chunkSize }}/{{ selectedKb.chunkOverlap }}
                                    </span>
                                    <span class="text-xs text-gray-500">
                                        batch: {{ selectedKb.embeddingBatchSize }}
                                    </span>
                                    <el-button link type="primary" size="small" @click="openSettingsDialog">
                                        编辑参数
                                    </el-button>
                                </div>
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
                                    :class="doc.status === 'completed' ? 'cursor-pointer' : ''"
                                    @click="handleViewChunks(doc)"
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
        <el-dialog v-model="showCreateDialog" title="新建知识库" width="520px">
            <el-form :model="createForm" label-width="100px">
                <el-form-item label="名称" required>
                    <el-input v-model="createForm.name" placeholder="请输入知识库名称" />
                </el-form-item>
                <el-form-item label="描述">
                    <el-input v-model="createForm.description" type="textarea" :rows="2" placeholder="可选，描述知识库用途" />
                </el-form-item>
                <el-form-item label="嵌入模型">
                    <el-select v-model="createForm.embeddingModel" class="w-full!">
                        <el-option
                            v-for="model in availableModels"
                            :key="model.name"
                            :label="`${model.name} (${model.dimension}维)`"
                            :value="model.name"
                        />
                    </el-select>
                </el-form-item>
                <el-divider content-position="left">
                    <span class="text-sm text-gray-400">高级设置</span>
                </el-divider>
                <el-form-item label="分块大小">
                    <el-input-number v-model="createForm.chunkSize" :min="100" :max="4000" :step="100" class="w-full!" />
                </el-form-item>
                <el-form-item label="重叠大小">
                    <el-input-number v-model="createForm.chunkOverlap" :min="0" :max="1000" :step="10" class="w-full!" />
                </el-form-item>
                <el-form-item label="批处理大小">
                    <el-input-number v-model="createForm.embeddingBatchSize" :min="1" :max="32" :step="1" class="w-full!" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showCreateDialog = false">取消</el-button>
                <el-button type="primary" @click="handleCreate">创建</el-button>
            </template>
        </el-dialog>

        <!-- 切换嵌入模型对话框 -->
        <el-dialog v-model="showSwitchModelDialog" title="切换嵌入模型" width="480px">
            <el-alert
                title="警告"
                type="warning"
                :closable="false"
                show-icon
                class="mb-4"
            >
                切换模型将删除现有向量数据并重新处理所有文档，此操作不可撤销。
            </el-alert>
            <el-form label-width="80px">
                <el-form-item label="新模型">
                    <el-select v-model="switchModelForm.embeddingModel" class="w-full!">
                        <el-option
                            v-for="model in availableModels"
                            :key="model.name"
                            :label="`${model.name} (${model.dimension}维)`"
                            :value="model.name"
                        />
                    </el-select>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showSwitchModelDialog = false">取消</el-button>
                <el-button type="primary" @click="handleSwitchModel">确认切换</el-button>
            </template>
        </el-dialog>

        <!-- 编辑参数对话框 -->
        <el-dialog v-model="showSettingsDialog" title="编辑分块与嵌入参数" width="480px">
            <el-alert
                v-if="settingsChunkChanged"
                title="注意"
                type="warning"
                :closable="false"
                show-icon
                class="mb-4"
            >
                修改分块参数将重新处理所有文档，此操作不可撤销。
            </el-alert>
            <el-form label-width="100px">
                <el-form-item label="分块大小">
                    <el-input-number v-model="settingsForm.chunkSize" :min="100" :max="4000" :step="100" class="w-full!" />
                </el-form-item>
                <el-form-item label="重叠大小">
                    <el-input-number v-model="settingsForm.chunkOverlap" :min="0" :max="1000" :step="10" class="w-full!" />
                </el-form-item>
                <el-form-item label="批处理大小">
                    <el-input-number v-model="settingsForm.embeddingBatchSize" :min="1" :max="32" :step="1" class="w-full!" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showSettingsDialog = false">取消</el-button>
                <el-button type="primary" @click="handleUpdateSettings">保存</el-button>
            </template>
        </el-dialog>

        <!-- 分片详情抽屉 -->
        <el-drawer
            v-model="showChunksDrawer"
            :title="chunksDoc ? `分片详情 - ${chunksDoc.originalName}` : '分片详情'"
            size="560px"
        >
            <div v-if="chunksLoading" class="flex items-center justify-center py-12">
                <el-icon class="is-loading" :size="24"><loading /></el-icon>
                <span class="ml-2 text-gray-500">加载中...</span>
            </div>
            <div v-else-if="chunks.length === 0" class="text-center py-12 text-gray-400">
                暂无分片数据
            </div>
            <div v-else class="space-y-3">
                <div class="text-sm text-gray-500 mb-4">共 {{ chunks.length }} 个分片</div>
                <div
                    v-for="chunk in chunks"
                    :key="chunk.id"
                    class="border border-gray-200 rounded-lg p-4 bg-white"
                >
                    <div class="flex items-center justify-between mb-2">
                        <el-tag size="small" type="info">#{{ chunk.chunkIndex + 1 }}</el-tag>
                        <span class="text-xs text-gray-400">ID: {{ chunk.id }}</span>
                    </div>
                    <p class="text-sm text-gray-700 whitespace-pre-wrap wrap-break-word leading-relaxed">{{ chunk.content }}</p>
                    <div v-if="chunk.metadata && Object.keys(chunk.metadata).length > 0" class="mt-2 pt-2 border-t border-gray-100">
                        <span class="text-xs text-gray-400">元数据: {{ JSON.stringify(chunk.metadata) }}</span>
                    </div>
                </div>
            </div>
        </el-drawer>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
    Plus, Collection, Upload, Document,
    Delete, Warning, Loading,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppHeader from '../components/AppHeader.vue'
import { usePageData } from '../composables/usePageData'
import {
    createKnowledgeBase, fetchKnowledgeBases, deleteKnowledgeBase,
    uploadDocument, fetchDocuments, deleteDocument, getDocumentStatus, fetchChunks,
    fetchEmbeddingModels, switchEmbeddingModel, updateKnowledgeBaseSettings,
    type KnowledgeBase, type KnowledgeDocument, type KnowledgeChunk,
    type EmbeddingModel,
} from '../api/knowledge-base'

const {
    data: kbData,
    loading: kbLoading,
    error: kbError,
    refresh: loadKnowledgeBases,
} = usePageData(fetchKnowledgeBases, { defaultErrorMessage: '加载知识库失败' })

const knowledgeBases = computed<KnowledgeBase[]>(() => kbData.value || [])
const selectedKb = ref<KnowledgeBase | null>(null)
const documents = ref<KnowledgeDocument[]>([])
const showCreateDialog = ref(false)
const createForm = ref({
    name: '', description: '', embeddingModel: '',
    chunkSize: 500, chunkOverlap: 100, embeddingBatchSize: 8,
})
const fileInput = ref<HTMLInputElement | null>(null)
const statusPollingTimers = ref<Map<number, number>>(new Map())
const showChunksDrawer = ref(false)
const chunksLoading = ref(false)
const chunksDoc = ref<KnowledgeDocument | null>(null)
const chunks = ref<KnowledgeChunk[]>([])
const availableModels = ref<EmbeddingModel[]>([])
const showSwitchModelDialog = ref(false)
const switchModelForm = ref({ embeddingModel: '' })

const showSettingsDialog = ref(false)
const settingsForm = ref({ chunkSize: 500, chunkOverlap: 100, embeddingBatchSize: 8 })

const settingsChunkChanged = computed(() => {
    if (!selectedKb.value) return false
    return (
        settingsForm.value.chunkSize !== selectedKb.value.chunkSize ||
        settingsForm.value.chunkOverlap !== selectedKb.value.chunkOverlap
    )
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
        createForm.value = {
            name: '', description: '',
            embeddingModel: availableModels.value[0]?.name || '',
            chunkSize: 500, chunkOverlap: 100, embeddingBatchSize: 8,
        }
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

async function handleViewChunks(doc: KnowledgeDocument) {
    if (doc.status !== 'completed' || !selectedKb.value) return
    chunksDoc.value = doc
    showChunksDrawer.value = true
    chunksLoading.value = true
    chunks.value = []
    try {
        chunks.value = await fetchChunks(selectedKb.value.id, doc.id)
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || '加载分片失败')
    } finally {
        chunksLoading.value = false
    }
}

async function loadModels() {
    try {
        availableModels.value = await fetchEmbeddingModels()
        if (availableModels.value.length > 0 && !createForm.value.embeddingModel) {
            createForm.value.embeddingModel = availableModels.value[0].name
        }
    } catch (err: any) {
        ElMessage.error('加载嵌入模型列表失败')
    }
}

function openSwitchModelDialog() {
    switchModelForm.value.embeddingModel = selectedKb.value?.embeddingModel || ''
    showSwitchModelDialog.value = true
}

function openSettingsDialog() {
    if (!selectedKb.value) return
    settingsForm.value = {
        chunkSize: selectedKb.value.chunkSize,
        chunkOverlap: selectedKb.value.chunkOverlap,
        embeddingBatchSize: selectedKb.value.embeddingBatchSize,
    }
    showSettingsDialog.value = true
}

async function handleUpdateSettings() {
    if (!selectedKb.value) return
    try {
        const result = await updateKnowledgeBaseSettings(selectedKb.value.id, {
            chunkSize: settingsForm.value.chunkSize,
            chunkOverlap: settingsForm.value.chunkOverlap,
            embeddingBatchSize: settingsForm.value.embeddingBatchSize,
        })
        selectedKb.value = { ...selectedKb.value, ...result }
        showSettingsDialog.value = false
        ElMessage.success(
            result.reprocessRequired ? '参数已更新，文档将重新处理' : '参数已更新',
        )
        if (result.reprocessRequired) {
            await loadDocuments()
            await loadKnowledgeBases()
        }
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || '更新参数失败')
    }
}

async function handleSwitchModel() {
    if (!selectedKb.value || !switchModelForm.value.embeddingModel) return
    if (switchModelForm.value.embeddingModel === selectedKb.value.embeddingModel) {
        ElMessage.warning('新模型与当前模型相同')
        return
    }
    try {
        const updated = await switchEmbeddingModel(selectedKb.value.id, switchModelForm.value.embeddingModel)
        selectedKb.value = updated
        showSwitchModelDialog.value = false
        ElMessage.success('模型已切换，文档将重新处理')
        await loadDocuments()
        await loadKnowledgeBases()
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || '切换模型失败')
    }
}

async function handleDeleteDoc(docId: number) {
    if (!selectedKb.value) {
        return
    }
    await ElMessageBox.confirm('确定要删除这个文档吗？', '提示', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
    })
    await deleteDocument(selectedKb.value.id, docId)
    ElMessage.success('已删除')
    await loadDocuments()
    await loadKnowledgeBases()
}

onMounted(() => {
    loadModels()
    loadKnowledgeBases()
})

onUnmounted(() => {
    statusPollingTimers.value.forEach((timer) => clearInterval(timer))
})
</script>
