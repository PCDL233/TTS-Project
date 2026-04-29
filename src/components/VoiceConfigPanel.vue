<template>
  <div class="h-full flex flex-col">
    <div class="flex-1 overflow-y-auto p-4 space-y-6">
      <!-- 模型选择 -->
      <div>
        <label class="text-sm font-medium text-gray-700 mb-2 block">选择模型</label>
        <el-select
          v-model="configStore.config.model"
          class="w-full"
          size="default"
          popper-class="model-select-dropdown"
          @change="onModelChange"
        >
          <el-option
            v-for="m in MODEL_OPTIONS"
            :key="m.value"
            :label="m.label"
            :value="m.value"
          >
            <div class="flex flex-col py-1.5">
              <span class="text-sm font-medium">{{ m.label }}</span>
              <span class="text-xs text-gray-400 leading-relaxed">{{ m.description }}</span>
            </div>
          </el-option>
        </el-select>
        <p class="text-xs text-gray-400 mt-1.5">
          {{ currentModelOption?.description }}
        </p>
      </div>

      <!-- 模式选择 -->
      <div>
        <label class="text-sm font-medium text-gray-700 mb-2 block">合成模式</label>
        <el-radio-group v-model="configStore.config.mode" size="default" class="w-full mode-radio-group" @change="onModeChange">
          <el-radio-button label="preset">
            <el-icon><headset /></el-icon> 预置音色
          </el-radio-button>
          <el-radio-button label="design">
            <el-icon><magic-stick /></el-icon> 音色设计
          </el-radio-button>
          <el-radio-button label="clone">
            <el-icon><copy-document /></el-icon> 音色复刻
          </el-radio-button>
        </el-radio-group>
      </div>

      <!-- 预置音色 -->
      <div v-if="configStore.config.mode === 'preset'" key="preset-panel" class="mt-4">
        <label class="text-sm font-medium text-gray-700 mb-2 block">选择音色</label>
        <el-select v-model="configStore.config.presetVoice" class="w-full" size="default">
          <el-option
            v-for="voice in PRESET_VOICES"
            :key="voice.value"
            :label="`${voice.label} · ${voice.lang} · ${voice.gender}`"
            :value="voice.value"
          />
        </el-select>
      </div>

      <!-- 音色设计 -->
      <div v-if="configStore.config.mode === 'design'" key="design-panel" class="mt-4">
        <label class="text-sm font-medium text-gray-700 mb-2 block">音色描述</label>
        <el-input
          v-model="configStore.config.voiceDesignText"
          type="textarea"
          :rows="4"
          placeholder="描述你想要的音色，例如：年轻女性，温柔甜美的声音，语速适中，像电台主持人一样..."
        />
        <div class="mt-3 flex flex-wrap gap-2">
          <el-tag
            v-for="template in voiceDesignTemplates"
            :key="template.name"
            size="small"
            class="cursor-pointer hover:bg-orange-100"
            @click="applyVoiceTemplate(template.text)"
          >
            {{ template.name }}
          </el-tag>
        </div>
      </div>

      <!-- 音色复刻 -->
      <div v-if="configStore.config.mode === 'clone'" key="clone-panel" class="mt-4">
        <label class="text-sm font-medium text-gray-700 mb-2 block">上传参考音频</label>
        <AudioUploader />
      </div>

      <el-divider />

      <!-- 风格控制 -->
      <div>
        <label class="text-sm font-medium text-gray-700 mb-2 block">风格控制方式</label>
        <el-radio-group v-model="configStore.config.styleMode" size="default" @change="onStyleModeChange">
          <el-radio-button label="natural">自然语言</el-radio-button>
          <el-radio-button label="tag">音频标签</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 自然语言风格 -->
      <div v-if="configStore.config.styleMode === 'natural'">
        <label class="text-sm font-medium text-gray-700 mb-2 block">风格描述</label>
        <el-input
          v-model="configStore.config.styleText"
          type="textarea"
          :rows="3"
          placeholder="用自然语言描述你想要的语音风格，例如：用轻快上扬的语调，语速稍快，带着兴奋与骄傲..."
        />
        <div class="mt-3 flex flex-wrap gap-2">
          <el-tag
            v-for="template in styleTemplates"
            :key="template.name"
            size="small"
            class="cursor-pointer hover:bg-orange-100"
            @click="applyStyleTemplate(template.text)"
          >
            {{ template.name }}
          </el-tag>
        </div>
      </div>

      <!-- 音频标签 -->
      <div v-else>
        <label class="text-sm font-medium text-gray-700 mb-2 block">风格标签</label>
        <el-input
          v-model="configStore.config.styleText"
          placeholder="点击下方标签插入，或直接输入"
          class="mb-3"
        />

        <div class="space-y-3 pr-1">
          <div v-for="group in STYLE_TAG_GROUPS" :key="group.key">
            <div class="text-xs text-gray-500 mb-1">{{ group.label }}</div>
            <div class="flex flex-wrap gap-1.5">
              <el-tag
                v-for="tag in STYLE_TAGS[group.key]"
                :key="tag"
                size="small"
                :effect="usedTags.has(tag) ? 'dark' : 'plain'"
                :type="usedTags.has(tag) ? 'primary' : ''"
                class="cursor-pointer select-none transition-colors"
                :class="usedTags.has(tag) ? 'tag-active' : 'tag-inactive'"
                @click="toggleTag(tag)"
              >
                {{ tag }}
              </el-tag>
            </div>
          </div>

          <div>
            <div class="text-xs text-gray-500 mb-1">音频效果</div>
            <div class="flex flex-wrap gap-1.5">
              <el-tag
                v-for="tag in STYLE_TAGS.audioEffect"
                :key="tag"
                size="small"
                :effect="usedTags.has(tag) ? 'dark' : 'plain'"
                :type="usedTags.has(tag) ? 'primary' : 'warning'"
                class="cursor-pointer select-none transition-colors"
                :class="usedTags.has(tag) ? 'tag-active' : 'tag-inactive'"
                @click="toggleTag(tag)"
              >
                {{ tag }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <el-divider />

      <!-- 高级设置 -->
      <div>
        <el-collapse>
          <el-collapse-item title="高级设置" name="advanced">
            <div class="space-y-4 pt-1 px-1">
              <!-- 音频格式 -->
              <div>
                <label class="text-sm text-gray-600 mb-2 block">音频格式</label>
                <el-radio-group v-model="configStore.config.audioFormat" size="small">
                  <el-radio-button label="wav">WAV</el-radio-button>
                  <el-radio-button label="pcm16">PCM16</el-radio-button>
                  <el-radio-button label="mp3">MP3</el-radio-button>
                </el-radio-group>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Headset, MagicStick, CopyDocument } from '@element-plus/icons-vue'
import { useConfigStore } from '../stores/config'
import { PRESET_VOICES, STYLE_TAGS, STYLE_TAG_GROUPS, MODEL_OPTIONS } from '../types/tts'
import AudioUploader from './AudioUploader.vue'

const configStore = useConfigStore()

const currentModelOption = computed(() =>
  MODEL_OPTIONS.find(m => m.value === configStore.config.model)
)

/** 当前已选中的风格标签集合 */
const usedTags = computed(() => {
  const text = configStore.config.styleText.trim()
  if (!text) return new Set<string>()
  return new Set(text.split(/\s+/).filter(Boolean))
})

function onModelChange(model: string) {
  const option = MODEL_OPTIONS.find(m => m.value === model)
  if (option) {
    configStore.updateMode(option.mode)
  }
}

function onModeChange(mode: string) {
  const option = MODEL_OPTIONS.find(m => m.mode === mode)
  if (option) {
    configStore.updateModel(option.value)
  }
}

const voiceDesignTemplates = [
  {
    name: '温柔女声',
    text: '二十多岁的年轻女性，温柔甜美的声音，像春风拂面一样柔和，语速适中偏慢，带着淡淡的笑意。',
  },
  {
    name: '年轻男性',
    text: '二十多岁的阳光男孩，清亮有活力的声音，语速稍快，像刚考完试兴奋地和朋友分享好消息。',
  },
  {
    name: '苍老男声',
    text: '六十多岁的老先生，说带北方口音的普通话，语速缓慢而沉稳，嗓音略带沙哑和沧桑感，像饱经风霜的老爷爷在讲故事。',
  },
  {
    name: '御姐音',
    text: '三十岁左右的成熟女性，低沉有磁性的御姐音，语速不紧不慢，带着从容不迫的气场，像职场精英在发表演讲。',
  },
]

const styleTemplates = [
  {
    name: '报喜',
    text: '用轻快上扬的语调向领导报喜，语速稍快，带着查到成绩后压抑不住的激动与小骄傲，声音明亮有活力。',
  },
  {
    name: '温柔',
    text: '用温柔治愈的声音，语速缓慢，像在耳边轻声细语，带着温暖的安抚感。',
  },
  {
    name: '愤怒',
    text: '声音因愤怒而颤抖，语速极快，像连珠炮一样质问，音量逐渐提高，带着不可置信的震惊。',
  },
  {
    name: '慵懒',
    text: '慵懒困倦的声音，语速很慢，带着刚睡醒的含糊，尾音微微上扬，像在撒娇。',
  },
]

function applyVoiceTemplate(text: string) {
  configStore.updateVoiceDesignText(text)
}

function applyStyleTemplate(text: string) {
  configStore.updateStyleText(text)
}

function onStyleModeChange() {
  // 切换风格控制方式时清空之前的内容
  configStore.updateStyleText('')
}

function toggleTag(tag: string) {
  const current = configStore.config.styleText.trim()
  const parts = current.split(/\s+/).filter(Boolean)
  if (parts.includes(tag)) {
    // 已使用：移除该标签
    const newParts = parts.filter(t => t !== tag)
    configStore.updateStyleText(newParts.join(' '))
  } else {
    // 未使用：追加该标签
    configStore.updateStyleText(current ? `${current} ${tag}` : tag)
  }
}
</script>

<style>
/* 模型选择下拉菜单：让 option 高度自适应，容纳 label + description 两行 */
.model-select-dropdown .el-select-dropdown__item {
  height: auto;
  padding-top: 10px;
  padding-bottom: 10px;
  line-height: 1.4;
}

/* 合成模式 radio group：强制 flex 布局，按钮等分宽度 */
.mode-radio-group {
  display: flex !important;
  gap: 8px;
}
.mode-radio-group .el-radio-button {
  flex: 1;
}
.mode-radio-group .el-radio-button .el-radio-button__inner {
  width: 100%;
  padding-top: 10px;
  padding-bottom: 10px;
  /* 统一三个按钮的圆角，避免 Element Plus 默认只给首尾加圆角 */
  border-radius: 4px !important;
}

/* 标签未选中状态 hover 效果 */
.tag-inactive:hover {
  background-color: #fff7ed;
  color: #ea580c;
  border-color: #fdba74;
}

/* 标签选中状态 */
.tag-active {
  font-weight: 500;
}
</style>
