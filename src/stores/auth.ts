import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { client } from '../api/client'
import { aesEncrypt } from '../utils/crypto'

export interface User {
  id: number
  username: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('token') || '')
  const user = ref<User | null>(null)
  const isLoggedIn = computed(() => !!token.value && !!user.value)

  async function fetchUser() {
    try {
      const res = await client.get('/auth/me')
      user.value = res.data
      return res.data
    } catch {
      user.value = null
      token.value = ''
      localStorage.removeItem('token')
      return null
    }
  }

  async function login(username: string, password: string) {
    const encrypted = aesEncrypt(JSON.stringify({ username, password }))
    const res = await client.post('/auth/login', { data: encrypted })
    token.value = res.data.token
    user.value = res.data.user
    localStorage.setItem('token', res.data.token)
    return res.data
  }

  async function register(username: string, password: string) {
    const encrypted = aesEncrypt(JSON.stringify({ username, password }))
    const res = await client.post('/auth/register', { data: encrypted })
    // 注册成功后不自动登录，由用户手动登录
    return res.data
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
  }

  // 初始化时如果 token 存在，尝试获取用户信息
  async function init() {
    if (token.value) {
      await fetchUser()
    }
  }

  return {
    token,
    user,
    isLoggedIn,
    login,
    register,
    logout,
    fetchUser,
    init,
  }
})
