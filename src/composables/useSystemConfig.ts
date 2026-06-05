import { ref, computed } from 'vue'
import axios from 'axios'
import { BACKEND_URL } from '../api/client'

export interface SystemConfigItem {
  key: string
  value: string
  description: string
}

const systemConfigs = ref<SystemConfigItem[]>([])
const loaded = ref(false)

export function useSystemConfig() {
  const systemName = computed(() => {
    const config = systemConfigs.value.find((c) => c.key === 'system_name')
    return config?.value || 'MiMo 智能助手'
  })

  const allowRegister = computed(() => {
    const config = systemConfigs.value.find((c) => c.key === 'allow_register')
    return config?.value === 'true'
  })

  async function loadSystemConfig() {
    try {
      const res = await axios.get<SystemConfigItem[]>(
        `${BACKEND_URL}/api/admin/system-config/public`,
      )
      if (Array.isArray(res.data)) {
        systemConfigs.value = res.data
        // 同步设置 document.title
        const name = systemName.value
        if (name) {
          document.title = name
        }
      }
      loaded.value = true
    } catch {
      // 静默失败，使用默认值
      loaded.value = true
    }
  }

  function getConfigValue(key: string): string | undefined {
    return systemConfigs.value.find((c) => c.key === key)?.value
  }

  return {
    systemConfigs,
    systemName,
    allowRegister,
    loaded,
    loadSystemConfig,
    getConfigValue,
  }
}
