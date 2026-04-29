import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { TTSHistoryItem } from '../types/tts'

const STORAGE_KEY = 'mimo-tts-history'
const MAX_ITEMS = 10

function loadHistory(): TTSHistoryItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // ignore
  }
  return []
}

export const useHistoryStore = defineStore('history', () => {
  const history = ref<TTSHistoryItem[]>(loadHistory())

  watch(
    history,
    (val) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    },
    { deep: true }
  )

  function addItem(item: Omit<TTSHistoryItem, 'id' | 'createdAt'>) {
    const newItem: TTSHistoryItem = {
      ...item,
      id: Date.now().toString(),
      createdAt: Date.now(),
    }
    history.value.unshift(newItem)
    if (history.value.length > MAX_ITEMS) {
      // 释放旧的blob URL
      const removed = history.value.pop()
      if (removed) {
        URL.revokeObjectURL(removed.audioUrl)
      }
    }
  }

  function removeItem(id: string) {
    const index = history.value.findIndex(item => item.id === id)
    if (index > -1) {
      URL.revokeObjectURL(history.value[index].audioUrl)
      history.value.splice(index, 1)
    }
  }

  function clear() {
    for (const item of history.value) {
      URL.revokeObjectURL(item.audioUrl)
    }
    history.value = []
  }

  return {
    history,
    addItem,
    removeItem,
    clear,
  }
})
