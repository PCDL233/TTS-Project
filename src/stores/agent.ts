import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fetchAgents } from '../api/agent'
import type { Agent } from '../types/agent'
import { getApiErrorMessage } from '../api/error'

export const useAgentStore = defineStore('agent', () => {
  const agents = ref<Agent[]>([])
  const loading = ref(false)
  const error = ref('')

  const publishedAgents = computed(() => agents.value.filter((agent) => agent.publishedVersionId !== null))

  async function loadAgents() {
    loading.value = true
    error.value = ''
    try {
      agents.value = await fetchAgents()
    } catch (err: unknown) {
      error.value = getApiErrorMessage(err, '加载智能体失败')
    } finally {
      loading.value = false
    }
  }

  return { agents, publishedAgents, loading, error, loadAgents }
})
