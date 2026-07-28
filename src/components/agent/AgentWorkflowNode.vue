<template>
  <div
    class="agent-node"
    :class="[{ 'agent-node--selected': selected, 'agent-node--error': data.validationError }, `agent-node--${type}`]"
  >
    <Handle v-if="type !== 'start'" type="target" :position="Position.Left" />
    <div class="agent-node__icon">{{ icon }}</div>
    <div class="min-w-0">
      <div class="agent-node__title">{{ data.label || nodeMeta.label }}</div>
      <div class="agent-node__type">{{ nodeMeta.description }}</div>
    </div>
    <template v-if="type === 'condition'">
      <Handle id="true" type="source" :position="Position.Right" :style="{ top: '36%' }" />
      <Handle id="false" type="source" :position="Position.Right" :style="{ top: '72%' }" />
      <span class="agent-node__branch agent-node__branch--true">真</span>
      <span class="agent-node__branch agent-node__branch--false">假</span>
    </template>
    <Handle v-else-if="type !== 'answer'" type="source" :position="Position.Right" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import type { AgentNodeData, AgentNodeType } from '../../types/agent'

const props = defineProps<{
  type: AgentNodeType
  data: AgentNodeData
  selected?: boolean
}>()

const META: Record<AgentNodeType, { label: string; description: string; icon: string }> = {
  start: { label: '开始', description: '接收用户输入', icon: '▶' },
  llm: { label: 'LLM', description: '调用大语言模型', icon: 'AI' },
  knowledge: { label: '知识检索', description: '检索知识库', icon: '知' },
  mcpTool: { label: 'MCP 工具', description: '调用指定工具', icon: '工' },
  template: { label: '模板', description: '组合变量文本', icon: '模' },
  condition: { label: '条件', description: '选择唯一分支', icon: '?' },
  answer: { label: '回答结束', description: '输出最终回答', icon: '答' },
}

const nodeMeta = computed(() => META[props.type])
const icon = computed(() => nodeMeta.value.icon)
</script>

<style scoped>
.agent-node { position: relative; width: 190px; min-height: 72px; padding: 14px; display: flex; align-items: center; gap: 10px; border: 1px solid #dcdfe6; border-radius: 12px; background: white; box-shadow: 0 4px 14px rgb(15 23 42 / 8%); }
.agent-node--selected { border-color: #409eff; box-shadow: 0 0 0 2px rgb(64 158 255 / 16%); }
.agent-node--error { border-color: #f56c6c; box-shadow: 0 0 0 2px rgb(245 108 108 / 15%); }
.agent-node__icon { width: 34px; height: 34px; border-radius: 9px; background: #eef5ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex: none; }
.agent-node--answer .agent-node__icon { background: #ecfdf5; color: #059669; }
.agent-node--condition .agent-node__icon { background: #fff7ed; color: #ea580c; }
.agent-node__title { color: #1f2937; font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agent-node__type { color: #909399; font-size: 11px; margin-top: 4px; }
.agent-node__branch { position: absolute; right: 8px; color: #909399; font-size: 10px; }
.agent-node__branch--true { top: 23%; }
.agent-node__branch--false { top: 59%; }
</style>
