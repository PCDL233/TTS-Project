import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TTSHistoryItem } from '../types/tts'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

/** 安全释放 blob URL */
function safeRevoke(url: string | undefined | null) {
  if (!url) return
  try {
    URL.revokeObjectURL(url)
  } catch {
    // ignore
  }
}

export const useHistoryStore = defineStore('history', () => {
  const history = ref<TTSHistoryItem[]>([])
  const loaded = ref(false)

  async function loadHistory() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/history`)
      if (res.ok) {
        const data = await res.json()
        history.value = data.map((item: any) => ({
          ...item,
          id: String(item.id),
          createdAt: Number(item.createdAt),
        }))
      }
    } catch {
      // ignore
    } finally {
      loaded.value = true
    }
  }

  async function addItem(item: Omit<TTSHistoryItem, 'id' | 'createdAt'>) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })
      if (res.ok) {
        const saved = await res.json()
        const newItem: TTSHistoryItem = {
          ...saved,
          id: String(saved.id),
          createdAt: Number(saved.createdAt),
        }
        history.value.unshift(newItem)
      }
    } catch {
      // ignore
    }
  }

  async function removeItem(id: string) {
    const index = history.value.findIndex(item => item.id === id)
    if (index > -1) {
      safeRevoke(history.value[index].audioUrl)
      history.value.splice(index, 1)
    }
    try {
      await fetch(`${BACKEND_URL}/api/history/${id}`, { method: 'DELETE' })
    } catch {
      // ignore
    }
  }

  async function clear() {
    for (const item of history.value) {
      safeRevoke(item.audioUrl)
    }
    history.value = []
    try {
      await fetch(`${BACKEND_URL}/api/history`, { method: 'DELETE' })
    } catch {
      // ignore
    }
  }

  return {
    history,
    loaded,
    loadHistory,
    addItem,
    removeItem,
    clear,
  }
})
