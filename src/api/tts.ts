import axios, { type AxiosResponse } from 'axios'
import type { TTSRequestParams, TTSResponse } from '../types/tts'

export function createTTSClient(apiKey: string, baseUrl: string = 'https://api.xiaomimimo.com/v1') {
  const client = axios.create({
    baseURL: baseUrl,
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    timeout: 120000,
  })

  return {
    async generate(params: TTSRequestParams, signal?: AbortSignal): Promise<string> {
      const response: AxiosResponse<TTSResponse> = await client.post(
        '/chat/completions',
        params,
        { signal }
      )
      const audioData = response.data.choices[0]?.message?.audio?.data
      if (!audioData) {
        throw new Error('响应中未包含音频数据')
      }
      return audioData
    },

    async *generateStream(params: TTSRequestParams, signal?: AbortSignal): AsyncGenerator<string, void, unknown> {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          ...params,
          stream: true,
        }),
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
              const audioData = data.choices?.[0]?.delta?.audio?.data
              if (audioData) {
                yield audioData
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    },
  }
}
