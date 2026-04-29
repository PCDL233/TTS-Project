<template>
  <div class="bg-white rounded-xl border border-gray-200 p-5">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <el-icon :size="24" class="text-primary"><video-play /></el-icon>
        <span class="font-medium">生成结果</span>
      </div>
      <div class="flex items-center gap-2">
        <el-button
          size="small"
          @click="$emit('regenerate')"
        >
          <el-icon><refresh /></el-icon>
          重新生成
        </el-button>
        <el-button
          type="primary"
          size="small"
          @click="download"
        >
          <el-icon><download /></el-icon>
          下载
        </el-button>
      </div>
    </div>

    <audio
      ref="audioRef"
      :src="audioUrl"
      controls
      class="w-full"
      @loadedmetadata="onLoadedMetadata"
    />

    <div class="flex items-center gap-4 mt-3 text-xs text-gray-500">
      <span>格式: WAV</span>
      <span>采样率: 24kHz</span>
      <span v-if="duration">时长: {{ formatDuration(duration) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VideoPlay, Refresh, Download } from '@element-plus/icons-vue'
import { downloadBlob } from '../utils/audio'

const props = defineProps<{
  audioUrl: string
  audioBlob: Blob | null
}>()

const emit = defineEmits<{
  regenerate: []
}>()

const audioRef = ref<HTMLAudioElement>()
const duration = ref(0)

function onLoadedMetadata() {
  if (audioRef.value) {
    duration.value = audioRef.value.duration
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function download() {
  if (props.audioBlob) {
    downloadBlob(props.audioBlob, `mimo-tts-${Date.now()}.wav`)
  }
}
</script>
