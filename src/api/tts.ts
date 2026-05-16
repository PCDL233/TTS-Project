import { client } from './client'
import type { TTSRequestParams } from '../types/tts'

export async function generateTTS(params: TTSRequestParams, signal?: AbortSignal): Promise<string> {
  const response = await client.post<{ data: string }>('/tts/generate', params, { signal })
  return response.data.data
}
