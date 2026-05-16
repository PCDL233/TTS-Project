import { client, BACKEND_URL } from './client'
import type { ChatConversation, ChatMessage, ChatCompletionParams, StreamChunk } from '../types/chat'

export async function fetchConversations(): Promise<ChatConversation[]> {
  const response = await client.get<ChatConversation[]>('/chat/conversations')
  return response.data
}

export async function createConversation(data: {
  title?: string
  model?: string
  features?: any
}): Promise<ChatConversation> {
  const response = await client.post<ChatConversation>('/chat/conversations', data)
  return response.data
}

export async function deleteConversation(id: number): Promise<void> {
  await client.delete(`/chat/conversations/${id}`)
}

export async function fetchMessages(conversationId: number): Promise<ChatMessage[]> {
  const response = await client.get<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`)
  return response.data
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
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`请求失败: ${response.status} - ${errorText}`)
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
          reader.cancel()
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
            // 忽略解析错误
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    onDone()
  } catch (err: any) {
    if (err.name === 'AbortError' || err.message === 'Aborted') {
      onError('已停止生成')
    } else {
      onError(err.message || '请求失败')
    }
  }
}
