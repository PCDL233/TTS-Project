<template>
  <div class="my-2">
    <!-- 工具调用开始 -->
    <div v-if="phase === 'start'" class="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div class="flex items-center gap-2 text-blue-700 text-sm font-medium mb-2">
        <el-icon><tools /></el-icon>
        <span>正在调用工具...</span>
      </div>
      <div class="space-y-1">
        <div
          v-for="tc in toolCalls"
          :key="tc.id"
          class="flex items-center gap-2 text-xs text-gray-600"
        >
          <el-tag size="small" type="primary">{{ formatToolName(tc.function?.name) }}</el-tag>
          <code class="bg-white px-1 rounded text-gray-500 truncate max-w-[300px]">
            {{ tc.function?.arguments?.slice(0, 100) || '' }}
          </code>
        </div>
      </div>
    </div>

    <!-- 工具调用结果 -->
    <div v-else-if="phase === 'result'" class="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div class="flex items-center gap-2 mb-2">
        <el-icon :class="status === 'success' ? 'text-green-500' : 'text-red-500'">
          <circle-check v-if="status === 'success'" />
          <circle-close v-else />
        </el-icon>
        <span class="text-sm font-medium" :class="status === 'success' ? 'text-green-700' : 'text-red-700'">
          {{ formatToolName(name) }}
        </span>
        <el-tag :type="status === 'success' ? 'success' : 'danger'" size="small">
          {{ status === 'success' ? '成功' : '失败' }}
        </el-tag>
      </div>
      <div v-if="status === 'success' && result" class="text-xs text-gray-600">
        <el-collapse>
          <el-collapse-item title="查看结果">
            <pre class="bg-white p-2 rounded text-xs overflow-auto max-h-[200px]">{{ formatResult(result) }}</pre>
          </el-collapse-item>
        </el-collapse>
      </div>
      <div v-else-if="status === 'error' && error" class="text-xs text-red-500">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Tools, CircleCheck, CircleClose } from '@element-plus/icons-vue'

const props = defineProps<{
  phase: 'start' | 'result'
  toolCalls?: any[]
  name?: string
  status?: 'success' | 'error'
  result?: string
  error?: string
}>()

function formatToolName(fullName?: string): string {
  if (!fullName) return 'unknown'
  // 去掉 mcp_{id}_ 前缀
  const match = fullName.match(/^mcp_\d+_(.+)$/)
  return match ? match[1] : fullName
}

function formatResult(result: string): string {
  try {
    const parsed = JSON.parse(result)
    // 如果 MCP 返回的是 content 数组，提取文本
    if (Array.isArray(parsed.content)) {
      return parsed.content.map((c: any) => c.text || JSON.stringify(c)).join('\n')
    }
    return JSON.stringify(parsed, null, 2)
  } catch {
    return result
  }
}
</script>
