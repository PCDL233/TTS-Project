<template>
  <div class="bg-white rounded-xl border border-gray-200 p-5">
    <el-tabs v-model="activeTab">
      <!-- 会话管理 -->
      <el-tab-pane label="会话管理" name="conversations">
        <div class="mb-4">
          <el-form :inline="true">
            <el-form-item label="用户名">
              <el-input v-model="filterUsername" placeholder="输入用户名" clearable @keyup.enter="loadConversations" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="loadConversations">筛选</el-button>
            </el-form-item>
          </el-form>
        </div>

        <el-table :data="conversations" v-loading="loading" border stripe>
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column label="用户" width="120">
            <template #default="{ row }">
              {{ row.user?.username || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="title" label="会话标题" />
          <el-table-column prop="model" label="模型" width="150" />
          <el-table-column label="创建时间" width="180">
            <template #default="{ row }">
              {{ new Date(row.createdAt).toLocaleString() }}
            </template>
          </el-table-column>
          <el-table-column label="更新时间" width="180">
            <template #default="{ row }">
              {{ new Date(row.updatedAt).toLocaleString() }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button size="small" @click="viewMessages(row)">查看消息</el-button>
              <el-popconfirm title="确定删除该会话？" @confirm="deleteConversation(row.id)">
                <template #reference>
                  <el-button size="small" type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>

        <div class="flex justify-end mt-4">
          <el-pagination
            v-model:current-page="page"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            @change="loadConversations"
          />
        </div>
      </el-tab-pane>

      <!-- 模型配置 -->
      <el-tab-pane label="模型配置" name="models">
        <el-form label-width="120px">
          <el-form-item label="默认模型">
            <el-select v-model="modelConfig.defaultModel" style="width: 300px">
              <el-option
                v-for="model in modelConfig.models"
                :key="model"
                :label="model"
                :value="model"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="saveModelConfig">保存</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 功能开关 -->
      <el-tab-pane label="功能开关" name="features">
        <el-form label-width="120px">
          <el-form-item label="思考模式">
            <el-switch v-model="featureConfig.thinking" />
            <span class="ml-2 text-sm text-gray-500">启用AI思考过程展示</span>
          </el-form-item>
          <el-form-item label="联网搜索">
            <el-switch v-model="featureConfig.webSearch" />
            <span class="ml-2 text-sm text-gray-500">允许AI进行联网搜索</span>
          </el-form-item>
          <el-form-item label="函数调用">
            <el-switch v-model="featureConfig.functionCall" />
            <span class="ml-2 text-sm text-gray-500">允许AI调用外部函数</span>
          </el-form-item>
          <el-form-item label="JSON模式">
            <el-switch v-model="featureConfig.jsonMode" />
            <span class="ml-2 text-sm text-gray-500">强制AI输出JSON格式</span>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="saveFeatureConfig">保存</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <!-- 消息详情弹窗 -->
    <el-dialog v-model="messageDialogVisible" title="会话消息" width="700px">
      <div class="max-h-96 overflow-y-auto space-y-4">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="p-3 rounded-lg"
          :class="msg.role === 'user' ? 'bg-blue-50' : 'bg-gray-50'"
        >
          <div class="text-xs text-gray-500 mb-1">
            {{ msg.role === 'user' ? '用户' : '助手' }} · {{ new Date(msg.createdAt).toLocaleString() }}
          </div>
          <div class="text-sm whitespace-pre-wrap">{{ msg.content }}</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '../../api/admin'
import { ElMessage } from 'element-plus'

const activeTab = ref('conversations')
const loading = ref(false)
const conversations = ref<any[]>([])
const messages = ref<any[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const filterUsername = ref('')
const messageDialogVisible = ref(false)

const modelConfig = ref({
  models: [] as string[],
  defaultModel: '',
})

const featureConfig = ref({
  thinking: true,
  webSearch: true,
  functionCall: true,
  jsonMode: false,
})

async function loadConversations() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: page.value,
      pageSize: pageSize.value,
    }
    if (filterUsername.value.trim()) {
      params.username = filterUsername.value.trim()
    }
    const res = await adminApi.getChatConversations(params)
    conversations.value = res.data[0]
    total.value = res.data[1]
  } catch {
    ElMessage.error('加载会话列表失败')
  } finally {
    loading.value = false
  }
}

async function viewMessages(conv: any) {
  try {
    const res = await adminApi.getChatMessages(conv.id)
    messages.value = res.data
    messageDialogVisible.value = true
  } catch {
    ElMessage.error('加载消息失败')
  }
}

async function deleteConversation(id: number) {
  try {
    await adminApi.deleteChatConversation(id)
    ElMessage.success('删除成功')
    loadConversations()
  } catch {
    ElMessage.error('删除失败')
  }
}

async function loadModelConfig() {
  try {
    const res = await adminApi.getChatModels()
    modelConfig.value = res.data
  } catch {
    ElMessage.error('加载模型配置失败')
  }
}

async function saveModelConfig() {
  try {
    await adminApi.updateChatModels({ defaultModel: modelConfig.value.defaultModel })
    ElMessage.success('保存成功')
  } catch {
    ElMessage.error('保存失败')
  }
}

async function loadFeatureConfig() {
  try {
    const res = await adminApi.getChatFeatures()
    featureConfig.value = res.data
  } catch {
    ElMessage.error('加载功能配置失败')
  }
}

async function saveFeatureConfig() {
  try {
    await adminApi.updateChatFeatures(featureConfig.value)
    ElMessage.success('保存成功')
  } catch {
    ElMessage.error('保存失败')
  }
}

onMounted(() => {
  loadConversations()
  loadModelConfig()
  loadFeatureConfig()
})
</script>
