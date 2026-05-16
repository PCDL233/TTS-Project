<template>
  <div class="bg-white rounded-xl border border-gray-200 p-4">
    <div class="flex items-center justify-between mb-3">
      <span class="font-medium text-sm">生成历史</span>
      <el-button
        v-if="history.length > 0"
        size="small"
        link
        type="danger"
        @click="clearHistory"
      >
        清空
      </el-button>
    </div>

    <div v-if="history.length === 0" class="text-center text-gray-400 text-sm py-4">
      暂无生成记录
    </div>

    <div v-else class="space-y-2 max-h-64 overflow-y-auto">
      <div
        v-for="item in history"
        :key="item.id"
        class="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-orange-50 transition-colors group"
        @click="playHistory(item)"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate">{{ item.text }}</div>
            <div class="flex items-center gap-2 mt-1">
              <el-tag size="small" type="info">{{ item.voice }}</el-tag>
              <span class="text-xs text-gray-400">{{ formatTime(item.createdAt) }}</span>
            </div>
          </div>
          <el-button
            size="small"
            link
            class="opacity-0 group-hover:opacity-100"
            @click.stop="deleteItem(item.id)"
          >
            <el-icon><close /></el-icon>
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { Close } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useHistoryStore } from '../stores/history'
import type { TTSHistoryItem } from '../types/tts'

const emit = defineEmits<{
  play: [item: TTSHistoryItem]
  clear: []
}>()

const historyStore = useHistoryStore()
const { items: history } = storeToRefs(historyStore)

function playHistory(item: TTSHistoryItem) {
  emit('play', item)
}

function deleteItem(id: number | string) {
  historyStore.removeItem(id)
}

async function clearHistory() {
  try {
    await ElMessageBox.confirm('确定要清空所有历史记录吗？此操作不可恢复。', '确认清空', {
      confirmButtonText: '确定清空',
      cancelButtonText: '取消',
      type: 'warning',
    })
    historyStore.clearHistory()
    emit('clear')
  } catch {
    // 用户取消
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  if (isToday) {
    return `${hours}:${minutes}`
  }
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}
</script>
