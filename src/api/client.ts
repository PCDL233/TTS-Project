import axios from 'axios'
import { ElMessage } from 'element-plus'
import { getApiErrorMessage } from './error'

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** 跳过 axios 拦截器中的全局错误提示，由页面自行处理。 */
    _skipGlobalToast?: boolean
    /** 跳过 401 自动跳转登录页，适用于启动时探测登录态。 */
    _skipUnauthorizedRedirect?: boolean
  }
}

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export const client = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000,
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isLoggingOut = false

client.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const config = error.config

      if (status === 401 && !isLoggingOut && !config?._skipUnauthorizedRedirect) {
        isLoggingOut = true
        localStorage.removeItem('token')
        const { default: router } = await import('../router')
        await router.push('/login')
        setTimeout(() => {
          isLoggingOut = false
        }, 1000)
      }

      if (!config?._skipGlobalToast) {
        const message = getApiErrorMessage(error)
        if (status === 429) {
          ElMessage.warning(message || '请求过于频繁，请稍后再试')
        } else if (status && status >= 500) {
          ElMessage.error(message || '服务器异常，请稍后重试')
        }
      }
    }

    return Promise.reject(error)
  },
)
