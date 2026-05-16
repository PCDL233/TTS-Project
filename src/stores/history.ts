import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TTSHistoryItem } from '../types/tts'
import { client } from '../api/client'
import { ElMessage } from 'element-plus'

export const useHistoryStore = defineStore('history', () => {
  const items = ref<TTSHistoryItem[]>([])
  const loaded = ref(false)

  async function loadHistory(page = 1, pageSize = 50) {
    try {
      const res = await client.get('/history', { params: { page, pageSize } })
      const data = res.data
      const list = Array.isArray(data) ? data : data.items || []
      items.value = list.map((item: any) => ({
        id: item.id,
        text: item.text,
        mode: item.mode,
        voice: item.voice,
        styleText: item.styleText,
        audioUrl: item.audioUrl,
        audioBase64: item.audioBase64,
        audioFormat: item.audioFormat,
        createdAt: item.createdAt,
      }))
    } catch {
      ElMessage.error('加载历史记录失败')
    } finally {
      loaded.value = true
    }
  }

  async function addItem(item: Omit<TTSHistoryItem, 'id' | 'createdAt'>) {
    try {
      const res = await client.post('/history', item)
      items.value.unshift({
        ...item,
        id: res.data.id,
        createdAt: res.data.createdAt,
      })
    } catch {
      ElMessage.error('保存历史记录失败')
    }
  }

  async function removeItem(id: number | string) {
    try {
      await client.delete(`/history/${id}`)
      items.value = items.value.filter(i => String(i.id) !== String(id))
    } catch {
      ElMessage.error('删除历史记录失败')
    }
  }

  async function clearHistory() {
    try {
      await client.delete('/history')
      items.value = []
    } catch {
      ElMessage.error('清空历史记录失败')
    }
  }

  return {
    items,
    loaded,
    loadHistory,
    addItem,
    removeItem,
    clearHistory,
  }
})
