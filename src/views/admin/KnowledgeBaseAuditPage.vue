<template>
  <div class="bg-white rounded-xl border border-gray-200 p-5">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-semibold text-gray-800">知识库审计</h3>
      <span class="text-xs text-gray-400">可查看文档元数据或删除知识库，不提供后台编辑</span>
    </div>

    <div class="flex gap-3 mb-4">
      <el-input
        v-model="username"
        clearable
        placeholder="筛选用户名"
        style="width: 200px"
        @keyup.enter="search"
      />
      <el-select v-model="status" clearable placeholder="处理状态" style="width: 150px">
        <el-option label="空知识库" value="empty" />
        <el-option label="处理中" value="processing" />
        <el-option label="就绪" value="ready" />
      </el-select>
      <el-button type="primary" native-type="button" @click="search">查询</el-button>
    </div>

    <el-table :data="items" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="名称" min-width="160" />
      <el-table-column prop="owner.username" label="所属用户" width="130" />
      <el-table-column prop="status" label="状态" width="100" />
      <el-table-column prop="documentCount" label="文档数" width="90" />
      <el-table-column prop="chunkCount" label="分块数" width="90" />
      <el-table-column prop="embeddingModel" label="向量模型" min-width="170" show-overflow-tooltip />
      <el-table-column label="更新时间" width="180">
        <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" native-type="button" @click="showDocuments(row)">文档</el-button>
          <el-popconfirm title="确定删除该知识库及其文档？" @confirm="remove(row.id)">
            <template #reference>
              <el-button size="small" type="danger" native-type="button">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="暂无知识库" />
      </template>
    </el-table>

    <div class="flex justify-end mt-4">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @change="load"
      />
    </div>

    <el-dialog
      v-model="documentsVisible"
      :title="`${selectedName} - 文档列表`"
      width="980px"
      class="kb-documents-dialog"
    >
      <el-table :data="pagedDocuments" border stripe max-height="460" table-layout="fixed">
        <el-table-column prop="originalName" label="文件名" min-width="260" show-overflow-tooltip />
        <el-table-column prop="mimetype" label="类型" width="150" show-overflow-tooltip />
        <el-table-column prop="size" label="大小" width="100">
          <template #default="{ row }">{{ formatSize(row.size) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" />
        <el-table-column prop="chunkCount" label="分块数" width="90" />
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
      <div class="flex justify-end mt-4">
        <el-pagination
          v-model:current-page="documentPage"
          v-model:page-size="documentPageSize"
          :total="documents.length"
          :page-sizes="[5, 10, 20, 50]"
          layout="total, sizes, prev, pager, next"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '../../api/admin'

const items = ref<any[]>([])
const documents = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const username = ref('')
const status = ref('')
const documentsVisible = ref(false)
const selectedName = ref('')
const documentPage = ref(1)
const documentPageSize = ref(10)

const pagedDocuments = computed(() => {
  const start = (documentPage.value - 1) * documentPageSize.value
  return documents.value.slice(start, start + documentPageSize.value)
})

const formatDate = (value?: string) => value ? new Date(value).toLocaleString() : '-'
const formatSize = (value?: number) => value ? `${(value / 1024).toFixed(1)} KB` : '0 KB'

async function load() {
  loading.value = true
  try {
    const res = await adminApi.getKnowledgeBases({
      page: page.value,
      pageSize: pageSize.value,
      username: username.value.trim() || undefined,
      status: status.value || undefined,
    })
    items.value = res.data[0]
    total.value = res.data[1]
  } catch {
    ElMessage.error('加载知识库审计数据失败')
  } finally {
    loading.value = false
  }
}

function search() {
  page.value = 1
  load()
}

async function showDocuments(row: any) {
  try {
    documents.value = (await adminApi.getKnowledgeBaseDocuments(row.id)).data
    documentPage.value = 1
    selectedName.value = row.name
    documentsVisible.value = true
  } catch {
    ElMessage.error('加载知识库文档失败')
  }
}

async function remove(id: number) {
  try {
    await adminApi.deleteKnowledgeBase(id)
    ElMessage.success('知识库已删除')
    load()
  } catch {
    ElMessage.error('删除知识库失败')
  }
}

onMounted(load)
</script>

<style scoped>
:deep(.kb-documents-dialog) {
  max-width: calc(100vw - 64px);
}

:deep(.kb-documents-dialog .el-dialog__body) {
  overflow-x: hidden;
}
</style>
