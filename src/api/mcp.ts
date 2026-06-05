import { client } from './client'
import type { McpServerConfig } from '../types/mcp'

export async function fetchMcpServers(): Promise<McpServerConfig[]> {
  const res = await client.get<McpServerConfig[]>('/mcp/servers')
  return res.data
}

export async function createMcpServer(data: any): Promise<McpServerConfig> {
  const res = await client.post<McpServerConfig>('/mcp/servers', data)
  return res.data
}

export async function updateMcpServer(id: number, data: any): Promise<McpServerConfig> {
  const res = await client.patch<McpServerConfig>(`/mcp/servers/${id}`, data)
  return res.data
}

export async function deleteMcpServer(id: number): Promise<void> {
  await client.delete(`/mcp/servers/${id}`)
}

export async function refreshMcpTools(id: number): Promise<{ success: boolean; toolCount: number }> {
  const res = await client.post(`/mcp/servers/${id}/refresh`)
  return res.data
}

export async function getMcpHealth(id: number): Promise<{
  connected: boolean
  status: string
  toolCount: number
  lastError: string | null
}> {
  const res = await client.get(`/mcp/servers/${id}/health`)
  return res.data
}
