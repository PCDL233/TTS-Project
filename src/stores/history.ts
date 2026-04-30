import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TTSHistoryItem } from '../types/tts'
import { client } from '../api/client'

export const useHistoryStore = defineStore('history', () => {
  const items = ref<TTSHistoryItem[]>([])
  const loaded = ref(false)

  async function loadHistory() {
    try {
      const res = await client.get('/history')
      items.value = res.data.map((item: any) => ({
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
      // ignore
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
      // ignore
    }
  }

  async function removeItem(id: number | string) {
    try {
      await client.delete(`/history/${id}`)
      items.value = items.value.filter(i => String(i.id) !== String(id))
    } catch {
      // ignore
    }
  }

  async function clearHistory() {
    try {
      await client.delete('/history')
      items.value = []
    } catch {
      // ignore
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
