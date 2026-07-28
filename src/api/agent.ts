import { BACKEND_URL, client } from './client'
import type {
  Agent,
  AgentGraphV1,
  AgentStreamEvent,
  AgentValidationIssue,
  AgentVersion,
} from '../types/agent'

export async function fetchAgents(): Promise<Agent[]> {
  const response = await client.get<Agent[]>('/agents')
  return response.data
}

export async function fetchAgent(id: number): Promise<Agent> {
  const response = await client.get<Agent>(`/agents/${id}`)
  return response.data
}

export async function createAgent(data: { name: string; description?: string }): Promise<Agent> {
  const response = await client.post<Agent>('/agents', data)
  return response.data
}

export async function updateAgent(
  id: number,
  data: { name?: string; description?: string },
): Promise<Agent> {
  const response = await client.patch<Agent>(`/agents/${id}`, data)
  return response.data
}

export async function deleteAgent(id: number): Promise<void> {
  await client.delete(`/agents/${id}`)
}

export async function saveAgentDraft(id: number, graph: AgentGraphV1): Promise<Agent> {
  const response = await client.put<Agent>(`/agents/${id}/draft`, { graph })
  return response.data
}

export async function validateAgent(id: number): Promise<{
  valid: boolean
  issues: AgentValidationIssue[]
}> {
  const response = await client.post<{ valid: boolean; issues: AgentValidationIssue[] }>(
    `/agents/${id}/validate`,
  )
  return response.data
}

export async function publishAgent(id: number): Promise<AgentVersion> {
  const response = await client.post<AgentVersion>(`/agents/${id}/publish`)
  return response.data
}

export async function debugAgent(
  id: number,
  query: string,
  onEvent: (event: AgentStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = localStorage.getItem('token')
  const response = await fetch(`${BACKEND_URL}/api/agents/${id}/debug`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query }),
    signal,
  })
  if (!response.ok) throw new Error(`调试请求失败：${response.status}`)
  if (!response.body) throw new Error('浏览器不支持流式响应')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() || ''
    for (const block of blocks) {
      const data = block
        .split('\n')
        .find((line) => line.startsWith('data:'))
        ?.slice(5)
        .trim()
      if (!data) continue
      onEvent(JSON.parse(data) as AgentStreamEvent)
    }
  }
}

