import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { McpServerConfig } from '../types/mcp'
import {
  fetchMcpServers as apiFetchMcpServers,
  createMcpServer as apiCreateMcpServer,
  updateMcpServer as apiUpdateMcpServer,
  deleteMcpServer as apiDeleteMcpServer,
  refreshMcpTools as apiRefreshMcpTools,
} from '../api/mcp'

export const useMcpStore = defineStore('mcp', () => {
  const servers = ref<McpServerConfig[]>([])
  const loading = ref(false)
  const error = ref('')
  const modalVisible = ref(false)
  const editingServer = ref<McpServerConfig | null>(null)
  const mcpEnabled = ref(false) // 用户是否开启 MCP 工具调用

  const enabledServers = computed(() => servers.value.filter((s) => s.enabled))
  const hasServers = computed(() => servers.value.length > 0)

  async function loadServers() {
    loading.value = true
    error.value = ''
    try {
      servers.value = await apiFetchMcpServers()
    } catch (err: any) {
      error.value = err.response?.data?.message || '加载 MCP 服务器列表失败'
    } finally {
      loading.value = false
    }
  }

  async function createServer(data: any) {
    error.value = ''
    try {
      const server = await apiCreateMcpServer(data)
      servers.value.unshift(server)
      return server
    } catch (err: any) {
      error.value = err.response?.data?.message || '创建 MCP 服务器失败'
      throw err
    }
  }

  async function updateServer(id: number, data: any) {
    error.value = ''
    try {
      const server = await apiUpdateMcpServer(id, data)
      const idx = servers.value.findIndex((s) => s.id === id)
      if (idx !== -1) servers.value[idx] = server
      return server
    } catch (err: any) {
      error.value = err.response?.data?.message || '更新 MCP 服务器失败'
      throw err
    }
  }

  async function deleteServer(id: number) {
    error.value = ''
    try {
      await apiDeleteMcpServer(id)
      servers.value = servers.value.filter((s) => s.id !== id)
    } catch (err: any) {
      error.value = err.response?.data?.message || '删除 MCP 服务器失败'
      throw err
    }
  }

  async function refreshTools(id: number) {
    error.value = ''
    try {
      const result = await apiRefreshMcpTools(id)
      await loadServers() // 刷新列表以获取最新工具缓存
      return result
    } catch (err: any) {
      error.value = err.response?.data?.message || '刷新工具列表失败'
      throw err
    }
  }

  function openModal(server?: McpServerConfig) {
    editingServer.value = server || null
    modalVisible.value = true
  }

  function closeModal() {
    modalVisible.value = false
    editingServer.value = null
  }

  function toggleMcpEnabled() {
    mcpEnabled.value = !mcpEnabled.value
  }

  return {
    servers,
    loading,
    error,
    modalVisible,
    editingServer,
    mcpEnabled,
    enabledServers,
    hasServers,
    loadServers,
    createServer,
    updateServer,
    deleteServer,
    refreshTools,
    openModal,
    closeModal,
    toggleMcpEnabled,
  }
})
