<template>
  <div class="h-screen bg-gray-50 flex flex-col overflow-hidden">
    <header class="h-15 bg-white border-b border-gray-200 px-4 flex items-center gap-3 shrink-0">
      <el-button text @click="goBack"><el-icon><arrow-left /></el-icon></el-button>
      <el-input v-model="agentName" class="max-w-70" maxlength="50" placeholder="智能体名称" />
      <el-input v-model="description" class="max-w-80" maxlength="200" placeholder="智能体描述（可选）" />
      <el-tag v-if="publishedVersionId" type="success" size="small">已发布</el-tag>
      <span class="text-xs" :class="saveStatusClass">{{ saveStatusText }}</span>
      <div class="ml-auto flex gap-2">
        <el-button @click="runValidation"><el-icon><circle-check /></el-icon>校验</el-button>
        <el-button @click="debugVisible = true"><el-icon><video-play /></el-icon>调试</el-button>
        <el-button type="primary" :loading="publishing" @click="publish"><el-icon><upload /></el-icon>发布</el-button>
      </div>
    </header>

    <div class="flex-1 flex min-h-0">
      <aside class="w-56 bg-white border-r border-gray-200 p-4 overflow-y-auto shrink-0">
        <div class="text-sm font-semibold text-gray-800 mb-1">节点</div>
        <div class="text-xs text-gray-400 mb-4">拖入画布构建工作流</div>
        <div class="space-y-2">
          <div
            v-for="item in palette"
            :key="item.type"
            class="border border-gray-200 rounded-lg p-3 bg-white hover:border-primary cursor-grab select-none"
            :class="{ 'opacity-40 cursor-not-allowed': item.type === 'start' && hasStart }"
            draggable="true"
            @dragstart="startDrag($event, item.type)"
          >
            <div class="text-sm font-medium text-gray-700">{{ item.label }}</div>
            <div class="text-xs text-gray-400 mt-1">{{ item.description }}</div>
          </div>
        </div>
        <el-divider />
        <div class="text-xs text-gray-400 leading-5">变量示例：<code>{{ variableExample }}</code></div>
      </aside>

      <section class="flex-1 relative min-w-0" @drop="onDrop" @dragover.prevent>
        <VueFlow
          v-model:nodes="nodes"
          v-model:edges="edges"
          class="agent-flow"
          :default-edge-options="{ type: 'smoothstep' }"
          :nodes-deletable="false"
          :edges-deletable="true"
          :delete-key-code="null"
          fit-view-on-init
          @connect="onConnect"
          @node-click="onNodeClick"
          @edge-click="onEdgeClick"
          @node-context-menu="onNodeContextMenu"
          @edge-context-menu="onEdgeContextMenu"
          @pane-click="clearSelection"
          @pane-context-menu="onPaneContextMenu"
        >
          <template #node-start="slotProps"><AgentWorkflowNode type="start" :data="slotProps.data" :selected="slotProps.selected" /></template>
          <template #node-llm="slotProps"><AgentWorkflowNode type="llm" :data="slotProps.data" :selected="slotProps.selected" /></template>
          <template #node-knowledge="slotProps"><AgentWorkflowNode type="knowledge" :data="slotProps.data" :selected="slotProps.selected" /></template>
          <template #node-mcpTool="slotProps"><AgentWorkflowNode type="mcpTool" :data="slotProps.data" :selected="slotProps.selected" /></template>
          <template #node-template="slotProps"><AgentWorkflowNode type="template" :data="slotProps.data" :selected="slotProps.selected" /></template>
          <template #node-condition="slotProps"><AgentWorkflowNode type="condition" :data="slotProps.data" :selected="slotProps.selected" /></template>
          <template #node-answer="slotProps"><AgentWorkflowNode type="answer" :data="slotProps.data" :selected="slotProps.selected" /></template>
        </VueFlow>
        <div v-if="issues.length" class="absolute left-4 bottom-4 w-96 max-h-48 overflow-auto bg-white border border-red-200 rounded-lg shadow-lg p-3 z-10">
          <div class="text-sm font-semibold text-red-600 mb-2">发现 {{ issues.length }} 个问题</div>
          <button v-for="(issue, index) in issues" :key="index" class="block text-left text-xs text-gray-600 py-1 hover:text-primary" @click="locateIssue(issue)">
            {{ issue.message }}
          </button>
        </div>
      </section>

      <aside class="w-90 bg-white border-l border-gray-200 overflow-y-auto shrink-0">
        <div v-if="selectedNode" class="p-5">
          <div class="flex items-center justify-between mb-5">
            <h3 class="font-semibold text-gray-900">节点配置</h3>
            <el-button v-if="selectedNode.type !== 'start'" link type="danger" @click="deleteSelectedNode">删除</el-button>
          </div>
          <el-form label-position="top" size="default">
            <el-form-item label="节点名称"><el-input v-model="selectedNode.data.label" maxlength="30" /></el-form-item>

            <template v-if="selectedNode.type === 'start'">
              <el-alert title="开始节点提供 sys.query、sys.history 等系统变量。" type="info" :closable="false" />
            </template>

            <template v-else-if="selectedNode.type === 'llm'">
              <el-form-item label="模型" required><el-select v-model="selectedNode.data.model" filterable class="w-full"><el-option v-for="model in models" :key="model.value" :label="model.label" :value="model.value" /></el-select></el-form-item>
              <el-form-item label="系统提示词"><el-input v-model="selectedNode.data.systemPrompt" type="textarea" :rows="3" /></el-form-item>
              <el-form-item label="用户提示词" required><el-input v-model="selectedNode.data.prompt" type="textarea" :rows="5" /></el-form-item>
              <div class="grid grid-cols-2 gap-3">
                <el-form-item label="温度"><el-input-number v-model="selectedNode.data.temperature" :min="0" :max="2" :step="0.1" class="w-full" /></el-form-item>
                <el-form-item label="最大 Token"><el-input-number v-model="selectedNode.data.maxTokens" :min="1" :max="32768" class="w-full" /></el-form-item>
              </div>
              <el-form-item label="携带历史"><el-switch v-model="selectedNode.data.includeHistory" /></el-form-item>
              <el-form-item v-if="selectedNode.data.includeHistory" label="最近历史轮数"><el-input-number v-model="selectedNode.data.historyTurns" :min="1" :max="50" /></el-form-item>
            </template>

            <template v-else-if="selectedNode.type === 'knowledge'">
              <el-form-item label="知识库" required><el-select v-model="selectedNode.data.knowledgeBaseId" class="w-full"><el-option v-for="kb in knowledgeBases" :key="kb.id" :label="kb.name" :value="kb.id" /></el-select></el-form-item>
              <el-form-item label="查询模板" required><el-input v-model="selectedNode.data.queryTemplate" type="textarea" :rows="4" /></el-form-item>
              <el-form-item label="返回数量"><el-input-number v-model="selectedNode.data.topK" :min="1" :max="20" /></el-form-item>
            </template>

            <template v-else-if="selectedNode.type === 'mcpTool'">
              <el-form-item label="MCP 服务器" required><el-select v-model="selectedNode.data.mcpServerId" class="w-full" @change="onMcpServerChange"><el-option v-for="server in mcpServers" :key="server.id" :label="server.name" :value="server.id" :disabled="!server.enabled" /></el-select></el-form-item>
              <el-form-item label="工具" required><el-select v-model="selectedNode.data.toolName" class="w-full" @change="onToolChange"><el-option v-for="tool in selectedServerTools" :key="tool.name" :label="tool.name" :value="tool.name" /></el-select></el-form-item>
              <div v-if="selectedNode.data.toolName" class="space-y-3">
                <div class="text-sm font-medium text-gray-700">参数绑定</div>
                <el-empty v-if="mcpArgumentFields.length === 0" description="该工具无需参数" :image-size="48" />
                <div v-for="field in mcpArgumentFields" :key="field.name" class="rounded-lg border border-gray-200 p-3">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-sm font-medium text-gray-800">{{ field.name }}</span>
                    <el-tag size="small" type="info">{{ argumentTypeLabel(field.schema.type) }}</el-tag>
                    <el-tag v-if="field.required" size="small" type="danger">必填</el-tag>
                  </div>
                  <p v-if="field.schema.description" class="text-xs text-gray-400 mb-2">{{ field.schema.description }}</p>
                  <el-select :model-value="getMcpBinding(field.name).mode" class="w-full mb-2" @update:model-value="updateMcpBindingMode(field.name, $event)">
                    <el-option label="字面量" value="literal" />
                    <el-option label="变量" value="variable" />
                    <el-option label="模板" value="template" />
                  </el-select>
                  <el-select
                    v-if="getMcpBinding(field.name).mode === 'literal' && field.schema.enum"
                    :model-value="getMcpBinding(field.name).value"
                    class="w-full"
                    @update:model-value="updateMcpBindingValue(field, $event)"
                  >
                    <el-option v-for="option in field.schema.enum" :key="String(option)" :label="String(option)" :value="option" />
                  </el-select>
                  <el-select
                    v-else-if="getMcpBinding(field.name).mode === 'literal' && field.schema.type === 'boolean'"
                    :model-value="getMcpBinding(field.name).value"
                    class="w-full"
                    @update:model-value="updateMcpBindingValue(field, $event)"
                  >
                    <el-option label="true" :value="true" />
                    <el-option label="false" :value="false" />
                  </el-select>
                  <el-input-number
                    v-else-if="getMcpBinding(field.name).mode === 'literal' && (field.schema.type === 'number' || field.schema.type === 'integer')"
                    :model-value="Number(getMcpBinding(field.name).value)"
                    :step="field.schema.type === 'integer' ? 1 : 0.1"
                    class="w-full"
                    @update:model-value="updateMcpBindingValue(field, $event)"
                  />
                  <el-input
                    v-else
                    :model-value="formatMcpBindingValue(field)"
                    :type="getMcpBinding(field.name).mode === 'literal' && (field.schema.type === 'object' || field.schema.type === 'array') ? 'textarea' : 'text'"
                    :rows="4"
                    :placeholder="getMcpBinding(field.name).mode === 'variable' ? '例如：nodes.llm.output' : getMcpBinding(field.name).mode === 'template' ? '例如：{{sys.query}}' : ''"
                    @change="updateMcpBindingValue(field, $event)"
                  />
                </div>
              </div>
            </template>

            <template v-else-if="selectedNode.type === 'template' || selectedNode.type === 'answer'">
              <el-form-item :label="selectedNode.type === 'answer' ? '回答模板' : '文本模板'" required><el-input v-model="selectedNode.data.template" type="textarea" :rows="8" /></el-form-item>
            </template>

            <template v-else-if="selectedNode.type === 'condition'">
              <el-form-item label="左值（变量或模板）" required><el-input v-model="selectedNode.data.left" /></el-form-item>
              <el-form-item label="操作符" required><el-select v-model="selectedNode.data.operator" class="w-full"><el-option v-for="op in operators" :key="op.value" :label="op.label" :value="op.value" /></el-select></el-form-item>
              <el-form-item v-if="!noRightOperators.includes(selectedNode.data.operator || 'equals')" label="右值"><el-input v-model="conditionRightText" @change="applyConditionRight" /></el-form-item>
            </template>
          </el-form>
        </div>
        <div v-else-if="selectedEdge" class="p-5">
          <div class="flex items-center justify-between mb-5">
            <h3 class="font-semibold text-gray-900">连线</h3>
            <el-button link type="danger" @click="deleteSelectedEdge">删除连线</el-button>
          </div>
          <el-alert title="已选中节点之间的连接" type="info" :closable="false" show-icon />
          <div class="mt-4 text-xs text-gray-500 leading-6 break-all">
            <div>起点：{{ selectedEdge.source }}</div>
            <div>终点：{{ selectedEdge.target }}</div>
            <div v-if="selectedEdge.sourceHandle">分支：{{ selectedEdge.sourceHandle === 'true' ? '真' : '假' }}</div>
          </div>
          <div class="mt-4 text-xs text-gray-400">也可以按 Delete 或 Backspace 删除此连线。</div>
        </div>
        <div v-else class="h-full flex items-center justify-center text-sm text-gray-400 px-8 text-center">选择一个节点或连线后在此配置</div>
      </aside>
    </div>

    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="flow-context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click.stop
        @contextmenu.prevent
      >
        <button type="button" class="flow-context-menu__delete" @click="deleteContextTarget">
          删除{{ contextMenu.targetType === 'node' ? '节点' : '连线' }}
        </button>
      </div>
    </Teleport>

    <el-drawer v-model="debugVisible" title="草稿调试" size="520px">
      <el-input v-model="debugQuery" type="textarea" :rows="4" placeholder="输入测试问题，调试不会写入聊天记录" />
      <el-button class="mt-3 w-full" type="primary" :loading="debugging" @click="runDebug">运行草稿</el-button>
      <div class="mt-5 space-y-3">
        <div v-for="(event, index) in debugEvents" :key="index" class="border border-gray-200 rounded-lg p-3">
          <div class="flex justify-between text-sm"><span class="font-medium">{{ event.label || event.type }}</span><el-tag :type="event.status === 'error' ? 'danger' : event.type === 'agent_node_finish' ? 'success' : 'info'" size="small">{{ event.status || event.type }}</el-tag></div>
          <div v-if="event.durationMs !== undefined" class="text-xs text-gray-400 mt-1">耗时 {{ event.durationMs }} ms</div>
          <pre v-if="event.summary || event.error || event.output" class="mt-2 text-xs whitespace-pre-wrap break-all bg-gray-50 rounded p-2 max-h-48 overflow-auto">{{ event.error || event.summary || formatDebug(event.output) }}</pre>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, CircleCheck, Upload, VideoPlay } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { VueFlow, useVueFlow, type Connection, type EdgeMouseEvent, type NodeMouseEvent } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import AgentWorkflowNode from '../components/agent/AgentWorkflowNode.vue'
import { debugAgent, fetchAgent, publishAgent, saveAgentDraft, updateAgent, validateAgent } from '../api/agent'
import { fetchProviderChatModels } from '../api/chat'
import { fetchKnowledgeBases, type KnowledgeBase } from '../api/knowledge-base'
import { fetchMcpServers } from '../api/mcp'
import type { McpCachedTool, McpServerConfig } from '../types/mcp'
import type { AgentArgumentBinding, AgentEdge, AgentNode, AgentNodeType, AgentStreamEvent, AgentValidationIssue } from '../types/agent'
import { getApiErrorMessage } from '../api/error'
import { isAgentDraftDirty, removeAgentEdge, shouldContinueAgentSave, toAgentGraphSnapshot } from '../utils/agent-workflow'

const route = useRoute()
const router = useRouter()
const agentId = Number(route.params.id)
const { addEdges, screenToFlowCoordinate, fitView, setCenter } = useVueFlow()
const nodes = ref<AgentNode[]>([])
const edges = ref<AgentEdge[]>([])
const agentName = ref('')
const description = ref('')
const publishedVersionId = ref<number | null>(null)
const selectedNodeId = ref<string | null>(null)
const selectedEdgeId = ref<string | null>(null)
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  targetType: null as 'node' | 'edge' | null,
})
const issues = ref<AgentValidationIssue[]>([])
const knowledgeBases = ref<KnowledgeBase[]>([])
const mcpServers = ref<McpServerConfig[]>([])
const models = ref<Array<{ value: string; label: string }>>([])
const saving = ref(false)
const dirty = ref(false)
const saveError = ref('')
const ready = ref(false)
const publishing = ref(false)
const debugVisible = ref(false)
const debugQuery = ref('')
const debugging = ref(false)
const debugEvents = ref<AgentStreamEvent[]>([])
let saveTimer: ReturnType<typeof setTimeout> | null = null
let editRevision = 0
let savedRevision = 0
let activeSave: Promise<void> | null = null
let debugController: AbortController | null = null

const palette: Array<{ type: AgentNodeType; label: string; description: string }> = [
  { type: 'start', label: '开始', description: '接收问题和会话历史' },
  { type: 'llm', label: 'LLM', description: '调用指定模型生成内容' },
  { type: 'knowledge', label: '知识检索', description: '检索个人知识库' },
  { type: 'mcpTool', label: 'MCP 工具', description: '显式调用一个 MCP 工具' },
  { type: 'template', label: '模板', description: '拼接受控变量' },
  { type: 'condition', label: '条件分支', description: '根据表单条件选择路径' },
  { type: 'answer', label: '回答结束', description: '形成最终助手回答' },
]
const operators = [
  ['equals', '等于'], ['notEquals', '不等于'], ['contains', '包含'], ['notContains', '不包含'],
  ['isEmpty', '为空'], ['isNotEmpty', '不为空'], ['exists', '存在'], ['notExists', '不存在'],
  ['gt', '大于'], ['gte', '大于等于'], ['lt', '小于'], ['lte', '小于等于'],
].map(([value, label]) => ({ value, label }))
const noRightOperators = ['isEmpty', 'isNotEmpty', 'exists', 'notExists']
const variableExample = '{{nodes.nodeId.output}}'
const hasStart = computed(() => nodes.value.some((node) => node.type === 'start'))
const selectedNode = computed(() => nodes.value.find((node) => node.id === selectedNodeId.value) || null)
const selectedEdge = computed(() => edges.value.find((edge) => edge.id === selectedEdgeId.value) || null)
const selectedServerTools = computed<McpCachedTool[]>(() => {
  const id = selectedNode.value?.data.mcpServerId
  return mcpServers.value.find((server) => server.id === id)?.cachedTools || []
})
interface McpArgumentField {
  name: string
  schema: Record<string, any>
  required: boolean
}
const selectedTool = computed(() => selectedServerTools.value.find((tool) => tool.name === selectedNode.value?.data.toolName) || null)
const mcpArgumentFields = computed<McpArgumentField[]>(() => {
  const schema = selectedTool.value?.inputSchema || {}
  const properties = (schema.properties || {}) as Record<string, Record<string, any>>
  const required = new Set(Array.isArray(schema.required) ? schema.required : [])
  return Object.entries(properties).map(([name, property]) => ({ name, schema: property, required: required.has(name) }))
})
const conditionRightText = ref('')
const saveStatusText = computed(() => saveError.value ? `保存失败：${saveError.value}` : saving.value ? '正在保存…' : dirty.value ? '等待保存…' : '草稿已保存')
const saveStatusClass = computed(() => saveError.value ? 'text-red-500' : saving.value || dirty.value ? 'text-amber-500' : 'text-green-600')

function defaultData(type: AgentNodeType) {
  const model = models.value[0]?.value || ''
  const values = {
    start: { label: '开始' },
    llm: { label: 'LLM', model, systemPrompt: '', prompt: '{{sys.query}}', temperature: 0.7, maxTokens: 2048, includeHistory: true, historyTurns: 10 },
    knowledge: { label: '知识检索', queryTemplate: '{{sys.query}}', topK: 5 },
    mcpTool: { label: 'MCP 工具', arguments: {} },
    template: { label: '模板', template: '{{sys.query}}' },
    condition: { label: '条件', left: '{{sys.query}}', operator: 'contains' as const, right: '' },
    answer: { label: '回答结束', template: '{{sys.query}}' },
  }
  return values[type]
}
function uuid() { return crypto.randomUUID() }
function startDrag(event: DragEvent, type: AgentNodeType) {
  if (type === 'start' && hasStart.value) { event.preventDefault(); return }
  event.dataTransfer?.setData('application/agent-node', type)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}
function onDrop(event: DragEvent) {
  const type = event.dataTransfer?.getData('application/agent-node') as AgentNodeType
  if (!type || (type === 'start' && hasStart.value)) return
  nodes.value.push({ id: uuid(), type, position: screenToFlowCoordinate({ x: event.clientX, y: event.clientY }), data: defaultData(type) })
}
function onConnect(connection: Connection) {
  if (!connection.source || !connection.target) return
  const source = nodes.value.find((node) => node.id === connection.source)
  if (source?.type === 'condition' && !connection.sourceHandle) return ElMessage.warning('请从条件节点的“真”或“假”端口连线')
  addEdges([{ ...connection, id: uuid() }])
}
function closeContextMenu() {
  contextMenu.value.visible = false
  contextMenu.value.targetType = null
}
function openContextMenu(event: MouseEvent, targetType: 'node' | 'edge') {
  event.preventDefault()
  const menuWidth = 136
  const menuHeight = 56
  contextMenu.value = {
    visible: true,
    x: Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8)),
    y: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8)),
    targetType,
  }
}
function onNodeClick(event: NodeMouseEvent) {
  closeContextMenu()
  selectedNodeId.value = event.node.id
  selectedEdgeId.value = null
}
function onEdgeClick(event: EdgeMouseEvent) {
  closeContextMenu()
  selectedEdgeId.value = event.edge.id
  selectedNodeId.value = null
}
function onNodeContextMenu(event: NodeMouseEvent) {
  if (!(event.event instanceof MouseEvent)) return
  selectedNodeId.value = event.node.id
  selectedEdgeId.value = null
  openContextMenu(event.event, 'node')
}
function onEdgeContextMenu(event: EdgeMouseEvent) {
  if (!(event.event instanceof MouseEvent)) return
  selectedEdgeId.value = event.edge.id
  selectedNodeId.value = null
  openContextMenu(event.event, 'edge')
}
function onPaneContextMenu(event: MouseEvent) {
  event.preventDefault()
  closeContextMenu()
}
function clearSelection() {
  closeContextMenu()
  selectedNodeId.value = null
  selectedEdgeId.value = null
}
function deleteSelectedNode() {
  if (!selectedNodeId.value) return
  const id = selectedNodeId.value
  nodes.value = nodes.value.filter((node) => node.id !== id)
  edges.value = edges.value.filter((edge) => edge.source !== id && edge.target !== id)
  selectedNodeId.value = null
}
function deleteSelectedEdge() {
  if (!selectedEdgeId.value) return
  edges.value = removeAgentEdge(edges.value, selectedEdgeId.value)
  selectedEdgeId.value = null
}
function deleteContextTarget() {
  if (contextMenu.value.targetType === 'node') deleteSelectedNode()
  if (contextMenu.value.targetType === 'edge') deleteSelectedEdge()
  closeContextMenu()
}
function onEditorKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeContextMenu()
    return
  }
  if (!selectedEdgeId.value || (event.key !== 'Delete' && event.key !== 'Backspace')) return
  const target = event.target
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable)) return
  event.preventDefault()
  deleteSelectedEdge()
}
function defaultMcpLiteral(schema: Record<string, any>): unknown {
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0]
  if (schema.default !== undefined) return structuredClone(schema.default)
  if (schema.type === 'boolean') return false
  if (schema.type === 'number' || schema.type === 'integer') return 0
  if (schema.type === 'array') return []
  if (schema.type === 'object') return {}
  return ''
}
function onMcpServerChange() {
  if (!selectedNode.value) return
  selectedNode.value.data.toolName = ''
  selectedNode.value.data.arguments = {}
}
function onToolChange(toolName: string) {
  const tool = selectedServerTools.value.find((item) => item.name === toolName)
  const bindings: Record<string, AgentArgumentBinding> = {}
  const properties = (tool?.inputSchema?.properties || {}) as Record<string, Record<string, any>>
  for (const [name, schema] of Object.entries(properties)) {
    bindings[name] = { mode: 'literal', value: defaultMcpLiteral(schema) }
  }
  if (selectedNode.value) selectedNode.value.data.arguments = bindings
}
function getMcpBinding(name: string): AgentArgumentBinding {
  return selectedNode.value?.data.arguments?.[name] || { mode: 'literal', value: '' }
}
function updateMcpBindingMode(name: string, mode: unknown) {
  if (!selectedNode.value || !['literal', 'variable', 'template'].includes(String(mode))) return
  const field = mcpArgumentFields.value.find((item) => item.name === name)
  const nextMode = mode as AgentArgumentBinding['mode']
  const value = nextMode === 'literal' ? defaultMcpLiteral(field?.schema || {}) : ''
  selectedNode.value.data.arguments = {
    ...(selectedNode.value.data.arguments || {}),
    [name]: { mode: nextMode, value },
  }
}
function updateMcpBindingValue(field: McpArgumentField, rawValue: unknown) {
  if (!selectedNode.value) return
  const binding = getMcpBinding(field.name)
  let value = rawValue
  if (binding.mode === 'literal' && (field.schema.type === 'object' || field.schema.type === 'array') && typeof rawValue === 'string') {
    try { value = JSON.parse(rawValue) }
    catch { ElMessage.warning(`参数 ${field.name} 不是有效 JSON`); return }
  }
  selectedNode.value.data.arguments = {
    ...(selectedNode.value.data.arguments || {}),
    [field.name]: { ...binding, value },
  }
}
function formatMcpBindingValue(field: McpArgumentField): string {
  const value = getMcpBinding(field.name).value
  if (typeof value === 'string') return value
  if (field.schema.type === 'object' || field.schema.type === 'array') return JSON.stringify(value, null, 2)
  return String(value ?? '')
}
function argumentTypeLabel(type: unknown): string {
  return Array.isArray(type) ? type.join(' / ') : String(type || 'any')
}
function applyConditionRight() {
  if (!selectedNode.value) return
  const raw = conditionRightText.value
  if (raw === 'true' || raw === 'false') selectedNode.value.data.right = raw === 'true'
  else if (raw.trim() !== '' && Number.isFinite(Number(raw))) selectedNode.value.data.right = Number(raw)
  else selectedNode.value.data.right = raw
}
function syncPanelBuffers() {
  conditionRightText.value = String(selectedNode.value?.data.right ?? '')
}

async function saveNow(): Promise<boolean> {
  if (!ready.value) return false
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (activeSave) {
    await activeSave
    if (shouldContinueAgentSave(editRevision, savedRevision, saveError.value)) return saveNow()
    return !dirty.value && !saveError.value
  }

  const revision = editRevision
  const graph = toAgentGraphSnapshot(nodes.value, edges.value)
  const metadata = { name: agentName.value.trim() || '未命名智能体', description: description.value }
  saving.value = true
  saveError.value = ''
  activeSave = (async () => {
    try {
      await Promise.all([
        saveAgentDraft(agentId, graph),
        updateAgent(agentId, metadata),
      ])
      savedRevision = Math.max(savedRevision, revision)
    } catch (error: unknown) {
      saveError.value = getApiErrorMessage(error, '自动保存失败')
    } finally {
      activeSave = null
      saving.value = false
      dirty.value = isAgentDraftDirty(editRevision, savedRevision)
    }
  })()
  await activeSave
  if (shouldContinueAgentSave(editRevision, savedRevision, saveError.value)) return saveNow()
  return !dirty.value && !saveError.value
}
function scheduleSave() {
  if (!ready.value) return
  editRevision += 1
  dirty.value = true
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void saveNow(), 900)
}
async function runValidation() {
  if ((dirty.value || saving.value) && !(await saveNow())) {
    ElMessage.error('草稿保存失败，无法校验或发布')
    return false
  }
  try {
    const result = await validateAgent(agentId)
    issues.value = result.issues
    const errorIds = new Set(result.issues.map((issue) => issue.nodeId).filter(Boolean))
    for (const node of nodes.value) node.data.validationError = errorIds.has(node.id)
    if (result.valid) ElMessage.success('工作流校验通过')
    else ElMessage.warning(`发现 ${result.issues.length} 个问题`)
    return result.valid
  } catch (error: unknown) { ElMessage.error(getApiErrorMessage(error, '校验失败')); return false }
}
async function locateIssue(issue: AgentValidationIssue) {
  if (!issue.nodeId) return
  const node = nodes.value.find((item) => item.id === issue.nodeId)
  if (!node) return
  selectedNodeId.value = node.id
  await setCenter(node.position.x, node.position.y, { zoom: 1.2, duration: 400 })
}
async function publish() {
  publishing.value = true
  try {
    if (!(await runValidation())) return
    const version = await publishAgent(agentId)
    publishedVersionId.value = version.id
    ElMessage.success(`已发布版本 v${version.version}`)
  } catch (error: unknown) { ElMessage.error(getApiErrorMessage(error, '发布失败')) }
  finally { publishing.value = false }
}
async function runDebug() {
  if (!debugQuery.value.trim()) return ElMessage.warning('请输入测试问题')
  if ((dirty.value || saving.value) && !(await saveNow())) {
    ElMessage.error('草稿保存失败，无法开始调试')
    return
  }
  debugging.value = true
  debugEvents.value = []
  debugController?.abort()
  debugController = new AbortController()
  try {
    await debugAgent(agentId, debugQuery.value.trim(), (event) => {
      if (event.type === 'validation_error') {
        issues.value = event.issues || []
        return
      }
      debugEvents.value.push(event)
    }, debugController.signal)
  } catch (error: unknown) {
    if (!debugController.signal.aborted) ElMessage.error(getApiErrorMessage(error, '调试失败'))
  } finally { debugging.value = false }
}
function formatDebug(value: unknown) { return typeof value === 'string' ? value : JSON.stringify(value, null, 2) }
async function goBack() { if (dirty.value || saving.value) await saveNow(); await router.push('/agents') }

watch([nodes, edges, agentName, description], scheduleSave, { deep: true })
watch(selectedNodeId, () => syncPanelBuffers())
window.addEventListener('beforeunload', beforeUnload)
window.addEventListener('keydown', onEditorKeydown)
window.addEventListener('click', closeContextMenu)
function beforeUnload(event: BeforeUnloadEvent) {
  if (dirty.value || saving.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
onBeforeRouteLeave(() => !dirty.value && !saving.value || window.confirm('草稿仍在保存，确定离开吗？'))
onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer)
  debugController?.abort()
  window.removeEventListener('beforeunload', beforeUnload)
  window.removeEventListener('keydown', onEditorKeydown)
  window.removeEventListener('click', closeContextMenu)
})

onMounted(async () => {
  try {
    const [agent, kbList, servers, modelResult] = await Promise.all([
      fetchAgent(agentId), fetchKnowledgeBases(), fetchMcpServers(), fetchProviderChatModels().catch(() => ({ models: [] })),
    ])
    agentName.value = agent.name
    description.value = agent.description
    publishedVersionId.value = agent.publishedVersionId
    nodes.value = structuredClone(agent.draftGraph.nodes)
    edges.value = structuredClone(agent.draftGraph.edges)
    knowledgeBases.value = kbList
    mcpServers.value = servers
    models.value = modelResult.models
    ready.value = true
    await nextTick()
    void fitView({ padding: 0.2 })
  } catch (error: unknown) { ElMessage.error(getApiErrorMessage(error, '加载智能体失败')); await router.push('/agents') }
})
</script>

<style scoped>
.agent-flow { background: #f8fafc; }
:deep(.vue-flow__node) { border: 0; padding: 0; background: transparent; width: auto; }
.flow-context-menu {
  position: fixed;
  z-index: 2000;
  min-width: 128px;
  padding: 4px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 30px rgb(15 23 42 / 16%);
}
.flow-context-menu__delete {
  width: 100%;
  padding: 8px 12px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #ef4444;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}
.flow-context-menu__delete:hover { background: #fef2f2; }
</style>
