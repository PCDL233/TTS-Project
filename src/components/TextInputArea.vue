<template>
  <div class="flex flex-col h-full">
    <!-- 工具栏 -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-gray-700">输入文本</span>
        <el-tag size="small" type="info">{{ text.length }} 字符</el-tag>
      </div>
      <div class="flex items-center gap-2">
        <el-upload
          ref="uploadRef"
          action=""
          :auto-upload="false"
          :show-file-list="false"
          :on-change="onTextFileChange"
          accept=".txt"
        >
          <el-button size="small">
            <el-icon><document /></el-icon>
            上传文本
          </el-button>
        </el-upload>
        <el-button
          size="small"
          @click="showExamples = true"
        >
          <el-icon><collection /></el-icon>
          示例
        </el-button>
        <el-button
          size="small"
          @click="clearText"
        >
          <el-icon><delete /></el-icon>
          清空
        </el-button>
      </div>
    </div>

    <!-- 文本输入 -->
    <el-input
      v-model="text"
      type="textarea"
      :rows="8"
      placeholder="请输入要转换为语音的文本内容...&#10;&#10;支持直接输入，或点击「上传文本」导入 .txt 文件。&#10;使用音频标签控制时，可直接在文本中插入标签，例如：&#10;（开心）今天天气真好！&#10;（唱歌）原谅我这一生不羁放纵爱自由"
      class="flex-1 textarea-fill"
      resize="none"
    />

    <!-- 操作按钮 -->
    <div class="flex items-center justify-between mt-4">
      <div class="flex items-center gap-2 flex-wrap">
        <el-tag size="small" type="primary">
          {{ currentModelLabel }}
        </el-tag>
        <el-tag
          v-if="configStore.config.mode === 'preset'"
          size="small"
          type="info"
        >
          {{ getVoiceLabel() }}
        </el-tag>
        <el-tag
          v-if="configStore.config.styleText"
          size="small"
          type="warning"
        >
          {{ configStore.config.styleMode === 'natural' ? '自然语言风格' : '音频标签风格' }}
        </el-tag>
      </div>
      <div class="flex items-center gap-3">
        <el-button
          v-if="loading"
          size="large"
          @click="$emit('stop')"
        >
          <el-icon><video-pause /></el-icon>
          停止
        </el-button>
        <el-button
          type="primary"
          size="large"
          :loading="loading"
          :disabled="!canGenerate || !text.trim()"
          @click="$emit('generate', text)"
        >
          <el-icon><microphone /></el-icon>
          {{ loading ? '生成中...' : '生成语音' }}
        </el-button>
      </div>
    </div>

    <!-- 示例弹窗 -->
    <el-dialog v-model="showExamples" title="示例文本" width="600px">
      <div class="space-y-3 max-h-96 overflow-y-auto">
        <div
          v-for="example in examples"
          :key="example.name"
          class="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-orange-50 transition-colors"
          @click="applyExample(example)"
        >
          <div class="font-medium text-sm mb-1">{{ example.name }}</div>
          <div class="text-xs text-gray-500 line-clamp-2">{{ example.text }}</div>
          <div class="mt-1 flex gap-1">
            <el-tag v-for="tag in example.tags" :key="tag" size="small" type="info">{{ tag }}</el-tag>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Microphone, Collection, Delete, VideoPause, Document } from '@element-plus/icons-vue'
import { useConfigStore } from '../stores/config'
import { PRESET_VOICES, MODEL_OPTIONS } from '../types/tts'
import { readTextFile } from '../utils/audio'
import type { UploadFile } from 'element-plus'

const props = defineProps<{
  loading: boolean
  canGenerate: boolean
}>()

const emit = defineEmits<{
  generate: [text: string]
  stop: []
}>()

const configStore = useConfigStore()
const text = ref('')
const showExamples = ref(false)
const uploadRef = ref()

const currentModelLabel = computed(() => {
  const model = MODEL_OPTIONS.find(m => m.value === configStore.config.model)
  return model?.label || configStore.config.model
})

const examples = [
  {
    name: '日常问候',
    text: '早上好！今天天气真不错，阳光明媚，让人心情也变好了呢。你打算今天去做些什么呢？',
    tags: ['日常', '轻松'],
  },
  {
    name: '深情告白',
    text: '（温柔）这么多年过去了，我还是会想起那个夏天，你穿着白衬衫站在梧桐树下，对我微笑的样子。（轻笑）那时候我就知道，这辈子就是你了。',
    tags: ['温柔', '情感'],
  },
  {
    name: '紧张面试',
    text: '（紧张，深呼吸）呼……冷静，冷静。不就是一个面试吗……（语速加快，碎碎念）自我介绍已经背了五十遍了，应该没问题的。加油，你可以的……（小声）哎呀，领带歪没歪？',
    tags: ['紧张', '音频标签'],
  },
  {
    name: '经典歌词',
    text: '（唱歌）原谅我这一生不羁放纵爱自由，也会怕有一天会跌倒，Oh no。背弃了理想，谁人都可以，哪会怕有一天只你共我。',
    tags: ['唱歌'],
  },
  {
    name: '方言对话',
    text: '（东北话）哎呀妈呀，这天儿也忒冷了吧！你说这风，嗖嗖的，跟刀子似的，割脸啊！',
    tags: ['东北话', '方言'],
  },
  {
    name: '疲惫加班',
    text: '（极其疲惫，有气无力）师傅……到地方了叫我一声……（长叹一口气）我先眯一会儿，这班加得我魂儿都要散了。',
    tags: ['疲惫', '音频标签'],
  },
]

function getVoiceLabel() {
  const voice = PRESET_VOICES.find(v => v.value === configStore.config.presetVoice)
  return voice?.label || configStore.config.presetVoice
}

function clearText() {
  text.value = ''
}

function applyExample(example: typeof examples[0]) {
  text.value = example.text
  showExamples.value = false
}

async function onTextFileChange(uploadFile: UploadFile) {
  const rawFile = uploadFile.raw
  if (!rawFile) return
  if (!rawFile.name.endsWith('.txt')) {
    return
  }
  try {
    const content = await readTextFile(rawFile)
    text.value = content
    if (uploadRef.value) {
      uploadRef.value.clearFiles()
    }
  } catch {
    // ignore
  }
}

// 暴露text给父组件
defineExpose({ text })
</script>

<style scoped>
/* 让 el-input textarea 占满父容器剩余高度 */
.textarea-fill {
  display: flex;
  flex-direction: column;
}
.textarea-fill :deep(.el-textarea) {
  flex: 1;
}
.textarea-fill :deep(.el-textarea__inner) {
  height: 100% !important;
}
</style>
