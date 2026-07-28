<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader />
    <main class="max-w-6xl mx-auto px-6 py-8">
      <div class="flex items-start justify-between mb-7">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">我的智能体</h2>
          <p class="mt-1 text-sm text-gray-500">通过可视化工作流组合模型、知识库和 MCP 工具。</p>
        </div>
        <el-button type="primary" @click="openCreate"><el-icon><plus /></el-icon>创建智能体</el-button>
      </div>

      <el-skeleton v-if="agentStore.loading" :rows="5" animated />
      <el-empty v-else-if="agentStore.agents.length === 0" description="还没有智能体">
        <el-button type="primary" @click="openCreate">创建第一个智能体</el-button>
      </el-empty>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <article v-for="agent in agentStore.agents" :key="agent.id" class="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center font-bold">AI</div>
            <el-tag :type="agent.publishedVersionId ? 'success' : 'info'" size="small">
              {{ agent.publishedVersionId ? `已发布 v${agent.publishedVersion || '?'}` : '仅草稿' }}
            </el-tag>
          </div>
          <h3 class="mt-4 font-semibold text-gray-900 truncate">{{ agent.name }}</h3>
          <p class="mt-2 h-10 text-sm text-gray-500 line-clamp-2">{{ agent.description || '暂无描述' }}</p>
          <div class="mt-4 text-xs text-gray-400">更新于 {{ formatTime(agent.updatedAt) }}</div>
          <div class="mt-4 pt-4 border-t border-gray-100 flex justify-between">
            <el-button link type="primary" @click="edit(agent.id)">编辑工作流</el-button>
            <el-button link type="danger" @click="remove(agent.id, agent.name)">删除</el-button>
          </div>
        </article>
      </div>
    </main>

    <el-dialog v-model="createVisible" title="创建智能体" width="440px">
      <el-form label-position="top">
        <el-form-item label="名称" required><el-input v-model="form.name" maxlength="50" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="form.description" type="textarea" :rows="3" maxlength="200" show-word-limit /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="submitCreate">创建并编辑</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppHeader from '../components/AppHeader.vue'
import { useAgentStore } from '../stores/agent'
import { createAgent, deleteAgent } from '../api/agent'
import { getApiErrorMessage } from '../api/error'

const router = useRouter()
const agentStore = useAgentStore()
const createVisible = ref(false)
const creating = ref(false)
const form = reactive({ name: '', description: '' })

function openCreate() {
  form.name = ''
  form.description = ''
  createVisible.value = true
}
function edit(id: number) { void router.push(`/agents/${id}/edit`) }
function formatTime(value: string) { return new Date(value).toLocaleString('zh-CN') }

async function submitCreate() {
  if (!form.name.trim()) return ElMessage.warning('请输入智能体名称')
  creating.value = true
  try {
    const agent = await createAgent({ name: form.name.trim(), description: form.description.trim() })
    createVisible.value = false
    await router.push(`/agents/${agent.id}/edit`)
  } catch (error: unknown) {
    ElMessage.error(getApiErrorMessage(error, '创建智能体失败'))
  } finally { creating.value = false }
}

async function remove(id: number, name: string) {
  try {
    await ElMessageBox.confirm(
      `删除“${name}”后将永久移除该智能体、发布版本及其关联会话和聊天记录，且无法恢复。是否继续？`,
      '确认删除智能体',
      {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
      },
    )
    await deleteAgent(id)
    await agentStore.loadAgents()
    ElMessage.success('智能体已删除')
  } catch (error: unknown) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(getApiErrorMessage(error, '删除失败'))
  }
}

onMounted(() => agentStore.loadAgents())
</script>
