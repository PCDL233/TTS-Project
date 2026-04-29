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

    <!-- 自定义播放器 -->
    <div class="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
      <!-- 播放/暂停按钮 -->
      <button
        class="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white hover:opacity-90 transition-opacity flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!canPlay"
        @click="togglePlay"
      >
        <el-icon :size="18">
          <video-pause v-if="isPlaying" />
          <video-play v-else />
        </el-icon>
      </button>

      <!-- 进度条 -->
      <div class="flex-1 flex flex-col gap-1 min-w-0">
        <input
          v-model="sliderValue"
          type="range"
          min="0"
          :max="duration || 0"
          step="0.1"
          class="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
          :disabled="!canPlay"
          @input="onSeeking"
          @change="onSeek"
        />
        <div class="flex justify-between text-xs text-gray-400">
          <span>{{ formatDuration(currentTime) }}</span>
          <span>{{ formatDuration(duration) }}</span>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-4 mt-3 text-xs text-gray-500">
      <span>格式: {{ displayFormat }}</span>
      <span>采样率: 24kHz</span>
      <span v-if="duration">时长: {{ formatDuration(duration) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { VideoPlay, VideoPause, Refresh, Download } from '@element-plus/icons-vue'
import { downloadBlob } from '../utils/audio'

const props = defineProps<{
  audioUrl: string
  audioBlob: Blob | null
  audioFormat?: string
}>()

const emit = defineEmits<{
  regenerate: []
}>()

// 播放状态
const isPlaying = ref(false)
const duration = ref(0)
const currentTime = ref(0)
const sliderValue = ref(0)
const isSeeking = ref(false)

// 纯 JS Audio 对象，不挂载到 DOM
let audioEl: HTMLAudioElement | null = null
let rafId: number | null = null

const canPlay = computed(() => !!props.audioUrl && duration.value > 0)

const displayFormat = computed(() => {
  const fmt = props.audioFormat || 'wav'
  return fmt.toUpperCase()
})

// 创建/更新 Audio 对象
function setupAudio(url: string) {
  // 销毁旧的
  destroyAudio()

  if (!url) return

  // 创建新的 Audio 对象（不挂载到 DOM，完全按需加载）
  audioEl = new Audio()
  audioEl.preload = 'none' // 关键：禁止任何预加载

  audioEl.addEventListener('loadedmetadata', onLoadedMetadata)
  audioEl.addEventListener('timeupdate', onTimeUpdate)
  audioEl.addEventListener('ended', onEnded)
  audioEl.addEventListener('play', () => { isPlaying.value = true })
  audioEl.addEventListener('pause', () => { isPlaying.value = false })
  audioEl.addEventListener('error', onError)

  // 设置 src 后不会自动加载（因为 preload=none）
  audioEl.src = url
}

function destroyAudio() {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  if (audioEl) {
    audioEl.pause()
    audioEl.src = ''
    audioEl.removeEventListener('loadedmetadata', onLoadedMetadata)
    audioEl.removeEventListener('timeupdate', onTimeUpdate)
    audioEl.removeEventListener('ended', onEnded)
    audioEl.removeEventListener('error', onError)
    audioEl = null
  }
  isPlaying.value = false
  duration.value = 0
  currentTime.value = 0
  sliderValue.value = 0
}

function onLoadedMetadata() {
  if (audioEl) {
    duration.value = audioEl.duration
  }
}

function onTimeUpdate() {
  if (audioEl && !isSeeking.value) {
    currentTime.value = audioEl.currentTime
    sliderValue.value = audioEl.currentTime
  }
}

function onEnded() {
  isPlaying.value = false
  currentTime.value = 0
  sliderValue.value = 0
  if (audioEl) {
    audioEl.currentTime = 0
  }
}

function onError() {
  isPlaying.value = false
}

function togglePlay() {
  if (!audioEl) return
  if (isPlaying.value) {
    audioEl.pause()
  } else {
    // 如果还没加载过（duration 为 0），先加载元数据
    if (!duration.value) {
      audioEl.preload = 'metadata'
      audioEl.load()
    }
    audioEl.play().catch(() => {
      // 忽略自动播放被阻止的错误
    })
  }
}

function onSeeking() {
  isSeeking.value = true
  currentTime.value = sliderValue.value
}

function onSeek() {
  isSeeking.value = false
  if (audioEl) {
    audioEl.currentTime = sliderValue.value
  }
}

function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function download() {
  if (props.audioBlob) {
    const ext = props.audioFormat === 'mp3' ? 'mp3' : 'wav'
    downloadBlob(props.audioBlob, `mimo-tts-${Date.now()}.${ext}`)
  }
}

// 监听 audioUrl 变化
watch(() => props.audioUrl, (newUrl) => {
  setupAudio(newUrl)
}, { immediate: true })

onUnmounted(() => {
  destroyAudio()
})
</script>

<style scoped>
.text-primary {
  color: var(--el-color-primary);
}
.bg-primary {
  background-color: var(--el-color-primary);
}
.accent-primary {
  accent-color: var(--el-color-primary);
}

/* range input 自定义样式 */
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--el-color-primary);
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

input[type="range"]::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--el-color-primary);
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
</style>
