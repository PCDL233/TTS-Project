import axios from 'axios'

export interface ApiErrorResponse {
  code?: number
  message?: string | string[]
  messages?: string[]
  requestId?: string
  timestamp?: string
  path?: string
}

function normalizeMessage(message: unknown): string {
  if (Array.isArray(message)) {
    return message.find((item): item is string => typeof item === 'string' && item.length > 0) || ''
  }
  return typeof message === 'string' ? message : ''
}

export function getApiErrorMessage(error: unknown, fallback = '请求失败'): string {
  if (axios.isAxiosError<ApiErrorResponse | string>(error)) {
    const data = error.response?.data
    if (typeof data === 'string' && data.length > 0) return data

    if (data && typeof data === 'object') {
      const message = normalizeMessage(data.message)
      if (message) return message
    }

    if (error.message) return error.message
    return fallback
  }

  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error.length > 0) return error
  return fallback
}

export function getApiRequestId(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const dataRequestId = error.response?.data?.requestId
    if (dataRequestId) return dataRequestId

    const headerRequestId = error.response?.headers?.['x-request-id']
    if (typeof headerRequestId === 'string') return headerRequestId
  }

  return ''
}
