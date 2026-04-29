<template>
  <div class="space-y-3">
    <el-upload
      drag
      :auto-upload="false"
      :show-file-list="false"
      :on-change="handleFileChange"
      accept=".mp3,.wav"
      class="w-full"
    >
      <el-icon class="el-icon--upload"><upload-filled /></el-icon>
      <div class="el-upload__text">
        拖拽音频文件到此处，或 <em>点击上传</em>
      </div>
      <template #tip>
        <div class="el-upload__tip">
          支持 mp3/wav 格式，文件大小不超过 10MB
        </div>
      </template>
    </el-upload>

    <div v-if="configStore.config.cloneAudioBase64" class="bg-orange-50 rounded-lg p-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <el-icon><microphone /></el-icon>
          <span class="text-sm font-medium">{{ configStore.config.cloneAudioName }}</span>
        </div>
        <el-button
          type="danger"
          link
          size="small"
          @click="clearAudio"
        >
          <el-icon><delete /></el-icon>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { UploadFilled, Microphone, Delete } from '@element-plus/icons-vue'
import { useConfigStore } from '../stores/config'
import { fileToBase64, formatFileSize } from '../utils/audio'
import type { UploadFile } from 'element-plus'

const configStore = useConfigStore()

async function handleFileChange(uploadFile: UploadFile) {
  const file = uploadFile.raw
  if (!file) return

  if (!['audio/mpeg', 'audio/mp3', 'audio/wav'].includes(file.type)) {
    ElMessage.error('请上传 mp3 或 wav 格式的音频文件')
    return
  }

  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error(`文件大小 ${formatFileSize(file.size)} 超过 10MB 限制`)
    return
  }

  try {
    const base64 = await fileToBase64(file)
    configStore.updateCloneAudio(base64, file.name)
    ElMessage.success('音频文件已加载')
  } catch {
    ElMessage.error('文件读取失败')
  }
}

function clearAudio() {
  configStore.updateCloneAudio('', '')
}
</script>
