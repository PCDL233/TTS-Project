import axios from 'axios'

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
  async (error) => {
    if (error.response?.status === 401 && !isLoggingOut) {
      isLoggingOut = true
      localStorage.removeItem('token')
      const { default: router } = await import('../router')
      await router.push('/login')
      setTimeout(() => { isLoggingOut = false }, 1000)
    }
    return Promise.reject(error)
  }
)
