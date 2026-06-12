<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader />
    <div class="max-w-5xl mx-auto px-4 py-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">MCP 工具服务器管理</h1>
        <el-button type="primary" @click="openCreate">
          <el-icon><plus /></el-icon>
          添加服务器
        </el-button>
      </div>

      <el-alert
        v-if="mcpStore.error"
        :title="mcpStore.error"
        type="error"
        closable
        class="mb-4"
        @close="mcpStore.error = ''"
      />

      <el-empty v-if="!mcpStore.hasServers && !mcpStore.loading" description="暂无 MCP 服务器，点击上方按钮添加" />

      <div v-else class="space-y-4">
        <el-card
          v-for="server in mcpStore.servers"
          :key="server.id"
          class="hover:shadow-md transition-shadow"
          :class="{ 'opacity-60': !server.enabled }"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="text-lg font-semibold text-gray-800">{{ server.name }}</h3>
                <el-tag size="small" :type="server.transport.type === 'stdio' ? 'primary' : 'success'">
                  {{ server.transport.type === 'stdio' ? 'STDIO' : 'SSE' }}
                </el-tag>
                <el-tag size="small" :type="server.enabled ? 'success' : 'info'">
                  {{ server.enabled ? '已启用' : '已禁用' }}
                </el-tag>
              </div>
              <p v-if="server.description" class="text-sm text-gray-500 mb-2">{{ server.description }}</p>
              <div class="text-xs text-gray-400 space-y-1">
                <p v-if="server.transport.type === 'stdio'">
                  命令: <code class="bg-gray-100 px-1 rounded">{{ server.transport.command }}</code>
                  <span v-if="server.transport.args?.length">{{ server.transport.args.join(' ') }}</span>
                </p>
                <p v-else>
                  URL: <code class="bg-gray-100 px-1 rounded">{{ server.transport.url }}</code>
                </p>
              </div>

              <!-- 缓存工具列表 -->
              <div v-if="server.cachedTools && server.cachedTools.length > 0" class="mt-3">
                <p class="text-xs text-gray-400 mb-1">已发现 {{ server.cachedTools.length }} 个工具:</p>
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="tool in server.cachedTools"
                    :key="tool.name"
                    size="small"
                    type="info"
                    effect="plain"
                  >
                    {{ tool.name }}
                  </el-tag>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 ml-4 shrink-0">
              <el-switch
                v-model="server.enabled"
                @change="(val: boolean) => handleToggle(server, val)"
              />
              <el-button text size="small" @click="openEdit(server)">
                <el-icon><edit /></el-icon>
              </el-button>
              <el-button text size="small" @click="handleRefresh(server)">
                <el-icon><refresh /></el-icon>
              </el-button>
              <el-popconfirm
                title="确定删除该 MCP 服务器？"
                confirm-button-text="删除"
                cancel-button-text="取消"
                @confirm="handleDelete(server.id)"
              >
                <template #reference>
                  <el-button text size="small" type="danger">
                    <el-icon><delete /></el-icon>
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑 MCP 服务器' : '添加 MCP 服务器'"
      width="600px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="如：文件系统 MCP" />
        </el-form-item>

        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" rows="2" placeholder="可选描述" />
        </el-form-item>

        <el-form-item label="传输类型" prop="transportType">
          <el-radio-group v-model="form.transportType">
            <el-radio-button value="stdio">STDIO（本地命令）</el-radio-button>
            <el-radio-button value="sse">SSE（HTTP 远程）</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <!-- STDIO 配置 -->
        <template v-if="form.transportType === 'stdio'">
          <el-form-item label="命令" prop="command">
            <el-input v-model="form.command" placeholder="如：npx、python、/usr/bin/node" />
          </el-form-item>
          <el-form-item label="参数">
            <el-input
              v-model="form.args"
              type="textarea"
              rows="3"
              placeholder='JSON 数组，如：["-y", "@modelcontextprotocol/server-filesystem", "/home/user"]'
            />
            <p class="text-xs text-gray-400 mt-1">请输入 JSON 格式的参数数组</p>
          </el-form-item>
          <el-form-item label="环境变量">
            <el-input
              v-model="form.env"
              type="textarea"
              rows="3"
              placeholder='JSON 对象，如：{"API_KEY": "xxx", "PATH": "/usr/bin"}'
            />
            <p class="text-xs text-gray-400 mt-1">包含敏感关键字（key/token/secret/password）的值将被加密存储</p>
          </el-form-item>
        </template>

        <!-- SSE 配置 -->
        <template v-else>
          <el-form-item label="URL" prop="url">
            <el-input v-model="form.url" placeholder="如：http://localhost:3001/sse" />
          </el-form-item>
          <el-form-item label="Headers">
            <el-input
              v-model="form.headers"
              type="textarea"
              rows="3"
              placeholder='JSON 对象，如：{"Authorization": "Bearer xxx"}'
            />
            <p class="text-xs text-gray-400 mt-1">包含敏感关键字的值将被加密存储</p>
          </el-form-item>
        </template>

        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Edit, Delete, Refresh } from '@element-plus/icons-vue'
import AppHeader from '../components/AppHeader.vue'
import { useMcpStore } from '../stores/mcp'
import type { McpServerConfig, McpServerForm } from '../types/mcp'

const mcpStore = useMcpStore()
const dialogVisible = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)
const submitting = ref(false)
const formRef = ref<any>(null)

const form = reactive<McpServerForm>({
  name: '',
  description: '',
  transportType: 'stdio',
  command: '',
  args: '',
  env: '',
  url: '',
  headers: '',
  enabled: true,
})

const rules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  transportType: [{ required: true, message: '请选择传输类型', trigger: 'change' }],
  command: [{ required: true, message: '请输入命令', trigger: 'blur' }],
  url: [{ required: true, message: '请输入 URL', trigger: 'blur' }],
}

onMounted(async () => {
  await mcpStore.loadServers()
})

function resetForm() {
  form.name = ''
  form.description = ''
  form.transportType = 'stdio'
  form.command = ''
  form.args = ''
  form.env = ''
  form.url = ''
  form.headers = ''
  form.enabled = true
}

function openCreate() {
  resetForm()
  isEditing.value = false
  editingId.value = null
  dialogVisible.value = true
}

function openEdit(server: McpServerConfig) {
  isEditing.value = true
  editingId.value = server.id
  form.name = server.name
  form.description = server.description || ''
  form.transportType = server.transport.type
  form.command = server.transport.command || ''
  form.args = server.transport.args ? JSON.stringify(server.transport.args, null, 2) : ''
  form.env = server.transport.env ? JSON.stringify(server.transport.env, null, 2) : ''
  form.url = server.transport.url || ''
  form.headers = server.transport.headers ? JSON.stringify(server.transport.headers, null, 2) : ''
  form.enabled = server.enabled
  dialogVisible.value = true
}

function parseJsonField(str: string): any {
  if (!str.trim()) return undefined
  try {
    return JSON.parse(str)
  } catch {
    throw new Error(`JSON 解析失败: ${str.slice(0, 50)}`)
  }
}

function buildPayload(): any {
  const payload: any = {
    name: form.name,
    description: form.description,
    transportType: form.transportType,
    enabled: form.enabled,
  }

  if (form.transportType === 'stdio') {
    payload.command = form.command
    payload.args = parseJsonField(form.args)
    payload.env = parseJsonField(form.env)
  } else {
    payload.url = form.url
    payload.headers = parseJsonField(form.headers)
  }

  return payload
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const payload = buildPayload()
    if (isEditing.value && editingId.value) {
      await mcpStore.updateServer(editingId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await mcpStore.createServer(payload)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

async function handleToggle(server: McpServerConfig, enabled: boolean) {
  try {
    await mcpStore.updateServer(server.id, { enabled })
    ElMessage.success(enabled ? '已启用' : '已禁用')
  } catch {
    // 回滚开关状态
    server.enabled = !enabled
  }
}

async function handleDelete(id: number) {
  try {
    await mcpStore.deleteServer(id)
    ElMessage.success('删除成功')
  } catch {
    // error handled in store
  }
}

async function handleRefresh(server: McpServerConfig) {
  try {
    const result = await mcpStore.refreshTools(server.id)
    ElMessage.success(`刷新成功，发现 ${result.toolCount} 个工具`)
  } catch {
    ElMessage.error('刷新失败')
  }
}
</script>
