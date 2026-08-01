<template>
    <div class="min-h-screen bg-gray-50 flex flex-col">
        <AppHeader show-help @help="showHelp = true" />

        <!-- 主内容区 -->
        <main class="flex-1 max-w-400 w-full mx-auto p-4 flex flex-col">
            <div class="flex gap-4 flex-1 min-h-0">
                <!-- 左侧配置面板 -->
                <aside
                    class="w-80 bg-white rounded-xl border border-gray-200 shrink-0 overflow-hidden"
                    :class="ttsBlocked ? 'opacity-60 pointer-events-none' : ''"
                >
                    <VoiceConfigPanel />
                </aside>

                <!-- 右侧主区 -->
                <div v-loading="pageLoading" class="flex-1 flex flex-col gap-4 min-w-0">
                    <el-alert
                        v-if="ttsBlocked"
                        type="warning"
                        show-icon
                        :closable="false"
                        class="shrink-0"
                    >
                        <template #title>当前配置不支持语音合成</template>
                        <div class="flex items-center justify-between gap-3 flex-wrap">
                            <span>{{ ttsBlockReason }}</span>
                            <el-button type="primary" size="small" @click="apiDialogVisible = true">
                                打开 API 设置
                            </el-button>
                        </div>
                    </el-alert>

                    <!-- 文本输入 -->
                    <div
                        class="bg-white rounded-xl border border-gray-200 p-5 flex-1 min-h-0"
                        :class="ttsBlocked ? 'opacity-60 pointer-events-none' : ''"
                    >
                        <TextInputArea
                            ref="textInputRef"
                            :loading="loading"
                            :can-generate="canGenerate"
                            @generate="onGenerate"
                            @stop="onStop"
                        />
                    </div>

                    <!-- 错误提示 -->
                    <el-alert
                        v-if="error"
                        :title="error"
                        type="error"
                        show-icon
                        closable
                        @close="error = ''"
                    />

                    <!-- 音频播放器 -->
                    <AudioPlayer
                        v-if="audioUrl"
                        :audio-url="audioUrl"
                        :audio-blob="audioBlob"
                        :audio-format="configStore.config.audioFormat"
                        @regenerate="onRegenerate"
                    />

                    <!-- 生成历史 -->
                    <HistoryPanel :disabled="ttsBlocked" @play="onPlayHistory" @clear="clearAudio" />
                </div>
            </div>
        </main>

        <!-- 帮助弹窗 -->
        <el-dialog v-model="showHelp" title="使用说明" width="650px">
            <div class="space-y-4 text-sm text-gray-600">
                <div>
                    <h3 class="font-medium text-gray-800 mb-1">
                        1. 设置 API Key 与 Base URL
                    </h3>
                    <p>
                        点击右上角「API 设置」按钮，输入 API Key 并选择对应的
                        Base URL。普通 API Key（sk-xxx）搭配「普通 API」；Token
                        Plan Key（tp-xxx）搭配对应集群。
                    </p>
                </div>
                <div>
                    <h3 class="font-medium text-gray-800 mb-1">
                        2. 选择模型与合成模式
                    </h3>
                    <ul class="list-disc list-inside space-y-1">
                        <li>
                            <strong>MiMo-V2.5-TTS</strong
                            >：内置精品音色，开箱即用
                        </li>
                        <li>
                            <strong>MiMo-V2.5-TTS-VoiceDesign</strong
                            >：通过文本描述创造自定义音色
                        </li>
                        <li>
                            <strong>MiMo-V2.5-TTS-VoiceClone</strong
                            >：上传音频样本，复刻任意音色
                        </li>
                    </ul>
                </div>
                <div>
                    <h3 class="font-medium text-gray-800 mb-1">3. 配置风格</h3>
                    <ul class="list-disc list-inside space-y-1">
                        <li>
                            <strong>自然语言控制</strong
                            >：用描述性文字告诉模型你想要的风格
                        </li>
                        <li>
                            <strong>音频标签控制</strong
                            >：在文本中插入风格标签，如（开心）（东北话）
                        </li>
                    </ul>
                </div>
                <div>
                    <h3 class="font-medium text-gray-800 mb-1">
                        4. 生成与下载
                    </h3>
                    <p>
                        输入文本后点击「生成语音」，等待生成完成后可在线播放，手动点击「下载」保存音频文件。
                    </p>
                </div>
                <el-divider />
                <div class="text-xs text-gray-400">
                    <p>注意事项：</p>
                    <ul class="list-disc list-inside space-y-1">
                        <li>语音合成的目标文本需填写在消息输入框中</li>
                        <li>
                            使用音频标签时，标签放在文本开头，如：（开心）今天天气真好！
                        </li>
                        <li>如需唱歌，在歌词开头添加（唱歌）标签</li>
                        <li>音色复刻支持 mp3/wav 格式，大小不超过 10MB</li>
                        <li>支持上传 .txt 文本文件快速填充内容</li>
                    </ul>
                </div>
            </div>
        </el-dialog>
        <ApiKeyDialog v-model="apiDialogVisible" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useConfigStore } from "../stores/config";
import { useHistoryStore } from "../stores/history";
import { useTTS } from "../composables/useTTS";
import VoiceConfigPanel from "../components/VoiceConfigPanel.vue";
import TextInputArea from "../components/TextInputArea.vue";
import AudioPlayer from "../components/AudioPlayer.vue";
import HistoryPanel from "../components/HistoryPanel.vue";
import AppHeader from "../components/AppHeader.vue";
import { base64ToBlob } from "../utils/audio";
import type { TTSHistoryItem } from "../types/tts";
import { isMimoTtsModel } from "../types/tts";
import ApiKeyDialog from "../components/ApiKeyDialog.vue";

const configStore = useConfigStore();
const historyStore = useHistoryStore();

const {
    loading,
    error,
    audioUrl,
    audioBlob,
    canGenerate,
    generate,
    stop,
    clearAudio,
} = useTTS();

const showHelp = ref(false);
const pageLoading = ref(false);
const textInputRef = ref<InstanceType<typeof TextInputArea>>();
const apiDialogVisible = ref(false);
const ttsBlocked = computed(() => (
    !configStore.isMimoProvider() || !isMimoTtsModel(configStore.config.model)
));
const ttsBlockReason = computed(() => {
    if (!configStore.isMimoProvider()) {
        return "语音合成仅支持小米 MiMo 端点，当前 API 设置为其他厂商。";
    }
    return "当前模型不是 MiMo TTS 模型，请选择 mimo-v2.5-tts、mimo-v2.5-tts-voicedesign 或 mimo-v2.5-tts-voiceclone。";
});

async function onGenerate(text: string) {
    const result = await generate(text);
    if (!result) return;

    let voiceLabel: string = configStore.config.presetVoice;
    if (configStore.config.mode === "design") {
        voiceLabel = "自定义音色";
    } else if (configStore.config.mode === "clone") {
        voiceLabel = "复刻音色";
    }

    historyStore.addItem({
        text,
        mode: configStore.config.mode,
        voice: voiceLabel,
        styleText: configStore.config.styleText,
        audioUrl: result.url,
        audioBase64: result.base64,
        audioFormat: configStore.config.audioFormat,
    });
}

function onRegenerate() {
    const text = textInputRef.value?.text;
    if (text) {
        onGenerate(text);
    }
}

function onStop() {
    stop();
}

function onPlayHistory(item: TTSHistoryItem) {
    // 恢复文本
    if (textInputRef.value) {
        textInputRef.value.text = item.text;
    }

    // 清理当前音频
    if (audioUrl.value) {
        URL.revokeObjectURL(audioUrl.value);
    }

    // 如果有 base64，重新创建 blob URL（兼容页面刷新后 blob URL 失效的情况）
    if (item.audioBase64) {
        const mimeType =
            item.audioFormat === "mp3" ? "audio/mpeg" : "audio/wav";
        const blob = base64ToBlob(item.audioBase64, mimeType);
        audioBlob.value = blob;
        audioUrl.value = URL.createObjectURL(blob);
    } else {
        // 兼容旧数据：直接使用存储的 audioUrl（仅在当前会话内有效）
        audioBlob.value = null;
        audioUrl.value = item.audioUrl;
    }
}

onMounted(async () => {
    pageLoading.value = true;
    try {
        await Promise.all([
            configStore.loadConfig(),
            historyStore.loadHistory(),
        ]);
    } finally {
        pageLoading.value = false;
    }
});

onUnmounted(() => {
    clearAudio();
});
</script>
