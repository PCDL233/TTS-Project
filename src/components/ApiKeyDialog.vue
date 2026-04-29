<template>
  <el-dialog
    v-model="visible"
    title="API 设置"
    width="520px"
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
          获取方式：访问
          <el-link
            type="primary"
            href="https://platform.xiaomimimo.com"
            target="_blank"
            :underline="false"
          >
            platform.xiaomimimo.com
          </el-link>
          控制台获取
        </p>
      </div>

      <!-- Base URL -->
      <div>
        <label class="text-sm font-medium text-gray-700 mb-2 block">Base URL</label>
        <el-select
          v-model="baseUrlPresetInput"
          class="w-full"
          size="large"
        >
          <el-option
            v-for="opt in BASE_URL_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <p class="text-xs text-gray-400 mt-1.5">
          {{ currentBaseUrlOption?.description }}
        </p>
        <p class="text-xs text-gray-400 mt-1">
          普通 API Key（sk-xxx）请搭配「普通 API」；Token Plan Key（tp-xxx）请搭配对应集群。
        </p>
        <el-input
          v-if="baseUrlPresetInput === 'custom'"
          v-model="baseUrlCustomInput"
          class="mt-2"
          size="large"
          placeholder="https://your-custom-endpoint.com/v1"
        />
      </div>

      <!-- 当前生效地址 -->
      <el-alert
        type="info"
        :closable="false"
        class="text-xs"
      >
        <template #title>
          <div class="text-xs">
            当前生效地址：<code class="bg-gray-100 px-1 rounded">{{ effectiveBaseUrl }}</code>
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
import { BASE_URL_OPTIONS } from '../types/tts'
import type { BaseUrlPreset } from '../types/tts'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const configStore = useConfigStore()
const visible = ref(props.modelValue)
const apiKeyInput = ref('')
const baseUrlPresetInput = ref<BaseUrlPreset>('default')
const baseUrlCustomInput = ref('')

const currentBaseUrlOption = computed(() =>
  BASE_URL_OPTIONS.find(o => o.value === baseUrlPresetInput.value)
)

const effectiveBaseUrl = computed(() => {
  if (baseUrlPresetInput.value === 'custom') {
    return baseUrlCustomInput.value || 'https://api.xiaomimimo.com/v1'
  }
  return currentBaseUrlOption.value?.url || 'https://api.xiaomimimo.com/v1'
})

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    apiKeyInput.value = configStore.config.apiKey
    baseUrlPresetInput.value = configStore.config.baseUrlPreset
    baseUrlCustomInput.value = configStore.config.baseUrlCustom
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

function saveSettings() {
  configStore.updateApiKey(apiKeyInput.value.trim())
  configStore.updateBaseUrlPreset(baseUrlPresetInput.value)
  configStore.updateBaseUrlCustom(baseUrlCustomInput.value.trim())
  visible.value = false
  ElMessage.success('API 设置已保存')
}
</script>
