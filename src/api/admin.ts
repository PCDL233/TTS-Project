import { client } from './client'

export interface PageQuery {
  page?: number
  pageSize?: number
  username?: string
  roleId?: number
  status?: string
  module?: string
  startDate?: string
  endDate?: string
}

export const adminApi = {
  // 用户管理
  getUsers(params?: PageQuery) {
    return client.get('/admin/users', { params })
  },
  getUserDetail(id: number) {
    return client.get(`/admin/users/${id}`)
  },
  updateUserRole(id: number, roleId: number) {
    return client.put(`/admin/users/${id}/role`, { roleId })
  },
  deleteUser(id: number) {
    return client.delete(`/admin/users/${id}`)
  },

  // 角色管理
  getRoles() {
    return client.get('/admin/roles')
  },
  createRole(data: { name: string; code: string; description?: string }) {
    return client.post('/admin/roles', data)
  },
  updateRole(id: number, data: Partial<{ name: string; code: string; description: string }>) {
    return client.put(`/admin/roles/${id}`, data)
  },
  deleteRole(id: number) {
    return client.delete(`/admin/roles/${id}`)
  },

  // 日志
  getLoginLogs(params?: PageQuery) {
    return client.get('/admin/login-logs', { params })
  },
  deleteLoginLog(id: number) {
    return client.delete(`/admin/login-logs/${id}`)
  },
  deleteLoginLogs(ids: number[]) {
    return client.delete('/admin/login-logs', { data: { ids } })
  },
  getOperationLogs(params?: PageQuery) {
    return client.get('/admin/operation-logs', { params })
  },
  deleteOperationLog(id: number) {
    return client.delete(`/admin/operation-logs/${id}`)
  },
  deleteOperationLogs(ids: number[]) {
    return client.delete('/admin/operation-logs', { data: { ids } })
  },

  // 统计
  getOverview() {
    return client.get('/admin/stats/overview')
  },
  getUserTrend(days?: number) {
    return client.get('/admin/stats/user-trend', { params: { days } })
  },
  getTtsTrend(days?: number) {
    return client.get('/admin/stats/tts-trend', { params: { days } })
  },
  getLoginTrend(days?: number) {
    return client.get('/admin/stats/login-trend', { params: { days } })
  },
  getRoleDistribution() {
    return client.get('/admin/stats/role-distribution')
  },
  getTtsByMode() {
    return client.get('/admin/stats/tts-by-mode')
  },

  // 智能助手统计
  getChatOverview() {
    return client.get('/admin/stats/chat-overview')
  },
  getChatConversationTrend(days?: number) {
    return client.get('/admin/stats/chat-conversation-trend', { params: { days } })
  },
  getChatMessageTrend(days?: number) {
    return client.get('/admin/stats/chat-message-trend', { params: { days } })
  },
  getChatModelDistribution() {
    return client.get('/admin/stats/chat-model-distribution')
  },
  getChatFeatureDistribution() {
    return client.get('/admin/stats/chat-feature-distribution')
  },
  getChatRoleDistribution() {
    return client.get('/admin/stats/chat-role-distribution')
  },

  // 系统配置
  getSystemConfigs() {
    return client.get('/admin/system-config')
  },
  updateSystemConfig(key: string, value: string) {
    return client.put(`/admin/system-config/${key}`, { value })
  },

  // 音频标签
  getAudioTags(params?: { page?: number; pageSize?: number; name?: string; code?: string; group?: string }) {
    return client.get('/audio-tags', { params })
  },
  createAudioTag(data: { name: string; code: string; group?: string; description?: string; sort?: number }) {
    return client.post('/audio-tags', data)
  },
  updateAudioTag(id: number, data: Partial<{ name: string; code: string; group: string; description: string; sort: number }>) {
    return client.put(`/audio-tags/${id}`, data)
  },
  deleteAudioTag(id: number) {
    return client.delete(`/audio-tags/${id}`)
  },

  // 智能助手管理
  getChatConversations(params?: { page?: number; pageSize?: number; username?: string }) {
    return client.get('/admin/chat/conversations', { params })
  },
  getChatMessages(conversationId: number) {
    return client.get(`/admin/chat/conversations/${conversationId}/messages`)
  },
  deleteChatConversation(id: number) {
    return client.delete(`/admin/chat/conversations/${id}`)
  },
  getChatModels() {
    return client.get('/admin/chat-config/models')
  },
  updateChatModels(data: { defaultModel: string }) {
    return client.put('/admin/chat-config/models', data)
  },
  getChatFeatures() {
    return client.get('/admin/chat-config/features')
  },
  updateChatFeatures(data: Record<string, boolean>) {
    return client.put('/admin/chat-config/features', data)
  },
}
