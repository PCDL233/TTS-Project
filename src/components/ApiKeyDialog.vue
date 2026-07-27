<template>
  <el-dialog
    v-model="visible"
    title="API 设置"
    width="620px"
    :close-on-click-modal="false"
  >
    <div class="space-y-5">
      <!-- API Key -->
      <div>
        <label class="text-sm font-medium text-gray-700 mb-2 block">API Key</label>
        <el-input
          v-model="apiKeyInput"
          placeholder="sk-xxxxxxxxxxxxxxxx"
          show-password
          size="large"
        />
        <p class="text-xs text-gray-400 mt-1.5">
          支持小米 MiMo 以及 OpenAI / DeepSeek / 通义千问 / Kimi / 智谱 / OpenRouter / SiliconFlow
          等 OpenAI 兼容接口；Key 仅加密存储在后端数据库。
        </p>
      </div>

      <!-- Base URL -->
      <div>
        <label class="text-sm font-medium text-gray-700 mb-2 block">Base URL</label>
        <el-select
          v-model="baseUrlPresetInput"
          class="w-full"
          size="large"
          filterable
        >
          <el-option
            v-for="opt in BASE_URL_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          >
            <div class="flex flex-col py-1">
              <span>{{ opt.label }}</span>
              <span class="text-xs text-gray-400">{{ opt.url || opt.description }}</span>
            </div>
          </el-option>
        </el-select>
        <p class="text-xs text-gray-400 mt-1.5">
          {{ currentBaseUrlOption?.description }}
        </p>
        <el-input
          v-if="baseUrlPresetInput === 'custom'"
          v-model="baseUrlCustomInput"
          class="mt-2"
          size="large"
          placeholder="https://your-openai-compatible-endpoint.com/v1"
        />
      </div>

      <!-- 鉴权方式 -->
      <div>
        <label class="text-sm font-medium text-gray-700 mb-2 block">鉴权方式</label>
        <el-select
          v-model="apiAuthTypeInput"
          class="w-full"
          size="large"
        >
          <el-option
            v-for="opt in AUTH_TYPE_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <p class="text-xs text-gray-400 mt-1.5">
          自动模式会为 MiMo 使用 <code>api-key</code> 请求头，为其它 OpenAI 兼容接口使用
          <code>Authorization: Bearer</code>。
        </p>
      </div>

      <!-- 当前生效地址 -->
      <el-alert
        type="info"
        :closable="false"
        class="text-xs"
      >
        <template #title>
          <div class="text-xs leading-5">
            当前生效地址：<code class="bg-gray-100 px-1 rounded">{{ effectiveBaseUrl }}</code><br />
            当前鉴权方式：<code class="bg-gray-100 px-1 rounded">{{ effectiveAuthLabel }}</code>
          </div>
        </template>
      </el-alert>
    </div>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="saveSettings">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useConfigStore } from '../stores/config'
import {
  BASE_URL_OPTIONS,
  MIMO_BASE_URL_PRESETS,
  getBaseUrlOption,
  normalizeBaseUrlPreset,
  normalizeBaseUrl,
} from '../types/llm'
import type { ApiAuthType, BaseUrlPreset } from '../types/tts'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const AUTH_TYPE_OPTIONS: Array<{ value: ApiAuthType; label: string }> = [
  { value: 'auto', label: '自动（推荐）' },
  { value: 'bearer', label: 'Authorization: Bearer' },
  { value: 'api-key', label: 'api-key 请求头' },
  { value: 'x-api-key', label: 'x-api-key 请求头' },
  { value: 'none', label: '不发送鉴权头（本地模型）' },
]

const configStore = useConfigStore()
const visible = ref(props.modelValue)
const apiKeyInput = ref('')
const baseUrlPresetInput = ref<BaseUrlPreset>('mimo-default')
const baseUrlCustomInput = ref('')
const apiAuthTypeInput = ref<ApiAuthType>('auto')

const currentBaseUrlOption = computed(() => getBaseUrlOption(baseUrlPresetInput.value))

const effectiveBaseUrl = computed(() => {
  if (baseUrlPresetInput.value === 'custom') {
    return normalizeBaseUrl(baseUrlCustomInput.value || 'https://api.xiaomimimo.com/v1')
  }
  return currentBaseUrlOption.value?.url || 'https://api.xiaomimimo.com/v1'
})

const effectiveAuthLabel = computed(() => {
  if (apiAuthTypeInput.value !== 'auto') {
    return AUTH_TYPE_OPTIONS.find((opt) => opt.value === apiAuthTypeInput.value)?.label || apiAuthTypeInput.value
  }
  return MIMO_BASE_URL_PRESETS.has(baseUrlPresetInput.value) ? 'api-key 请求头' : 'Authorization: Bearer'
})

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    apiKeyInput.value = configStore.config.apiKey
    baseUrlPresetInput.value = normalizeBaseUrlPreset(configStore.config.baseUrlPreset)
    baseUrlCustomInput.value = configStore.config.baseUrlCustom
    apiAuthTypeInput.value = configStore.config.apiAuthType || 'auto'
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

function saveSettings() {
  configStore.updateApiKey(apiKeyInput.value.trim())
  configStore.updateBaseUrlPreset(baseUrlPresetInput.value)
  configStore.updateBaseUrlCustom(normalizeBaseUrl(baseUrlCustomInput.value))
  configStore.updateApiAuthType(apiAuthTypeInput.value)
  visible.value = false
  ElMessage.success('API 设置已保存')
}
</script>
