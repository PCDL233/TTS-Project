<template>
  <el-dialog
    v-model="visible"
    title="设置 API Key"
    width="480px"
    :close-on-click-modal="false"
  >
    <div class="space-y-4">
      <p class="text-sm text-gray-500">
        请输入您的小米 MiMo API Key。API Key 将保存在浏览器本地存储中，仅用于向小米官方 API 发起请求。
      </p>
      <el-alert
        type="info"
        :closable="false"
        class="text-xs"
      >
        <template #title>
          <div class="text-xs">
            当前 Base URL：<code class="bg-gray-100 px-1 rounded">{{ configStore.getEffectiveBaseUrl() }}</code>
            <br>
            <span class="text-gray-400">普通 API Key（sk-xxx）请搭配「普通 API」Base URL；Token Plan Key（tp-xxx）请搭配对应集群的 Base URL。</span>
          </div>
        </template>
      </el-alert>
      <el-input
        v-model="apiKeyInput"
        placeholder="sk-xxxxxxxxxxxxxxxx"
        show-password
        size="large"
      />
      <div class="text-xs text-gray-400">
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
      </div>
    </div>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="saveApiKey">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useConfigStore } from '../stores/config'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const configStore = useConfigStore()
const visible = ref(props.modelValue)
const apiKeyInput = ref('')

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    apiKeyInput.value = configStore.config.apiKey
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

function saveApiKey() {
  configStore.updateApiKey(apiKeyInput.value.trim())
  visible.value = false
  ElMessage.success('API Key 已保存')
}
</script>
