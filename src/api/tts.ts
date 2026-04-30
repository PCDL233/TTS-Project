import { client } from './client'
import type { TTSRequestParams } from '../types/tts'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export async function generateTTS(params: TTSRequestParams, signal?: AbortSignal): Promise<string> {
  const response = await client.post<{ data: string }>('/tts/generate', params, { signal })
  return response.data.data
}

export async function* generateTTSStream(params: TTSRequestParams, signal?: AbortSignal): AsyncGenerator<string, void, unknown> {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BACKEND_URL}/api/tts/generate-stream`, {
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
          const data = JSON.parse(dataStr)
          if (data.error) {
            throw new Error(data.error)
          }
          if (data.chunk) {
            yield data.chunk
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
