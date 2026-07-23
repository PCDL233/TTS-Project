import { client, BACKEND_URL } from './client'
import type { ChatConversation, ChatMessage, ChatCompletionParams, StreamChunk, ChatFeatures } from '../types/chat'
import { getApiErrorMessage, type ApiErrorResponse } from './error'

/** 从后端动态加载聊天配置（模型列表 + 功能开关） */
export async function fetchChatConfig(): Promise<{
  models: string[]
  defaultModel: string
  features: ChatFeatures
}> {
  const [modelsRes, featuresRes] = await Promise.all([
    client.get<{ models: string[]; defaultModel: string }>('/chat/config/models'),
    client.get<ChatFeatures>('/chat/config/features'),
  ])
  return { ...modelsRes.data, features: featuresRes.data }
}

export async function fetchConversations(): Promise<ChatConversation[]> {
  const response = await client.get<ChatConversation[]>('/chat/conversations')
  return response.data
}

export async function createConversation(data: {
  title?: string
  model?: string
  features?: ChatFeatures
  knowledgeBaseId?: number
}): Promise<ChatConversation> {
  const response = await client.post<ChatConversation>('/chat/conversations', data)
  return response.data
}

export async function deleteConversation(id: number): Promise<void> {
  await client.delete(`/chat/conversations/${id}`)
}

export async function updateConversation(id: number, data: { title?: string; knowledgeBaseId?: number | null }): Promise<ChatConversation> {
  const response = await client.patch<ChatConversation>(`/chat/conversations/${id}`, data)
  return response.data
}

export async function fetchMessages(conversationId: number): Promise<ChatMessage[]> {
  const response = await client.get<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`)
  return response.data
}

async function readFetchErrorMessage(response: Response): Promise<string> {
  const fallback = `请求失败: ${response.status}`
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    try {
      const data = (await response.json()) as ApiErrorResponse
      if (Array.isArray(data.message)) return data.message[0] || fallback
      return data.message || fallback
    } catch {
      return fallback
    }
  }

  const text = await response.text()
  return text ? `${fallback} - ${text}` : fallback
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export async function sendChatStream(
  params: ChatCompletionParams,
  onChunk: (chunk: StreamChunk) => void,
  onDone: () => void,
  onError: (error: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
      signal,
    })

    if (!response.ok) {
      throw new Error(await readFetchErrorMessage(response))
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法读取响应流')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        if (signal?.aborted) {
          await reader.cancel()
          throw new Error('Aborted')
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data:')) continue

          const dataStr = trimmed.slice(5).trim()
          if (dataStr === '[DONE]') continue

          try {
            const data = JSON.parse(dataStr) as StreamChunk
            if (data.error) {
              onError(data.error)
              return
            }
            onChunk(data)
          } catch {
            // 忽略单帧解析错误，避免坏帧中断整个 SSE。
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    onDone()
  } catch (err: unknown) {
    if (isAbortError(err) || (err instanceof Error && err.message === 'Aborted')) {
      onError('已停止生成')
    } else {
      onError(getApiErrorMessage(err, '请求失败'))
    }
  }
}
