<template>
    <div v-loading="loading" class="space-y-6">
        <!-- 统计卡片 -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-white rounded-xl border border-gray-200 p-5">
                <div class="text-sm text-gray-500 mb-1">总用户数</div>
                <div class="text-2xl font-bold text-gray-800">{{ overview.totalUsers }}</div>
            </div>
            <div class="bg-white rounded-xl border border-gray-200 p-5">
                <div class="text-sm text-gray-500 mb-1">今日新增用户</div>
                <div class="text-2xl font-bold text-blue-600">{{ overview.todayUsers }}</div>
            </div>
            <div class="bg-white rounded-xl border border-gray-200 p-5">
                <div class="text-sm text-gray-500 mb-1">总 TTS 生成次数</div>
                <div class="text-2xl font-bold text-gray-800">{{ overview.totalTts }}</div>
            </div>
            <div class="bg-white rounded-xl border border-gray-200 p-5">
                <div class="text-sm text-gray-500 mb-1">今日 TTS 生成</div>
                <div class="text-2xl font-bold text-green-600">{{ overview.todayTts }}</div>
            </div>
            <div class="bg-white rounded-xl border border-gray-200 p-5">
                <div class="text-sm text-gray-500 mb-1">总会话数</div>
                <div class="text-2xl font-bold text-gray-800">{{ chatOverview.totalConversations }}</div>
            </div>
            <div class="bg-white rounded-xl border border-gray-200 p-5">
                <div class="text-sm text-gray-500 mb-1">今日新建会话</div>
                <div class="text-2xl font-bold text-purple-600">{{ chatOverview.todayConversations }}</div>
            </div>
            <div class="bg-white rounded-xl border border-gray-200 p-5">
                <div class="text-sm text-gray-500 mb-1">总消息数</div>
                <div class="text-2xl font-bold text-gray-800">{{ chatOverview.totalMessages }}</div>
            </div>
            <div class="bg-white rounded-xl border border-gray-200 p-5">
                <div class="text-sm text-gray-500 mb-1">今日消息数</div>
                <div class="text-2xl font-bold text-orange-600">{{ chatOverview.todayMessages }}</div>
            </div>
        </div>

        <!-- 图表区域 -->
        <div class="grid grid-cols-1 gap-6">
            <!-- 趋势统计 -->
            <div class="bg-white rounded-xl border border-gray-200 p-5">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h3 class="text-sm font-semibold text-gray-700">趋势统计（近30天）</h3>
                    <el-radio-group v-model="activeTrend" size="small">
                        <el-radio-button label="user">用户注册</el-radio-button>
                        <el-radio-button label="tts">TTS 生成</el-radio-button>
                        <el-radio-button label="login">登录活跃</el-radio-button>
                        <el-radio-button label="conversation">会话创建</el-radio-button>
                        <el-radio-button label="message">消息量</el-radio-button>
                    </el-radio-group>
                </div>
                <div class="h-80 w-full">
                    <v-chart v-if="hasTrendData" class="w-full h-full" :option="trendChartOption" :autoresize="{ throttle: 100 }" />
                    <el-empty v-else description="暂无数据" />
                </div>
            </div>

            <!-- 分布统计 -->
            <div class="bg-white rounded-xl border border-gray-200 p-5">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h3 class="text-sm font-semibold text-gray-700">分布统计</h3>
                    <el-radio-group v-model="activeDistribution" size="small">
                        <el-radio-button label="role">用户角色</el-radio-button>
                        <el-radio-button label="ttsMode">TTS 模式</el-radio-button>
                        <el-radio-button label="chatModel">模型使用</el-radio-button>
                        <el-radio-button label="chatFeature">功能使用</el-radio-button>
                        <el-radio-button label="chatRole">消息角色</el-radio-button>
                    </el-radio-group>
                </div>
                <div class="h-80 w-full">
                    <v-chart v-if="hasDistributionData" class="w-full h-full" :option="distributionChartOption" :autoresize="{ throttle: 100 }" />
                    <el-empty v-else description="暂无数据" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { adminApi } from '../../api/admin'
import { ElMessage } from 'element-plus'

const loading = ref(true)
const overview = ref({ totalUsers: 0, todayUsers: 0, totalTts: 0, todayTts: 0 })
const chatOverview = ref({ totalConversations: 0, todayConversations: 0, totalMessages: 0, todayMessages: 0, activeUsers: 0 })

const userTrend = ref<{ date: string; count: number }[]>([])
const ttsTrend = ref<{ date: string; count: number }[]>([])
const loginTrend = ref<{ date: string; count: number }[]>([])
const chatConversationTrend = ref<{ date: string; count: number }[]>([])
const chatMessageTrend = ref<{ date: string; count: number }[]>([])

const roleDistribution = ref<{ name: string; value: number }[]>([])
const ttsByMode = ref<{ name: string; value: number }[]>([])
const chatModelDistribution = ref<{ name: string; value: number }[]>([])
const chatFeatureDistribution = ref<{ name: string; value: number }[]>([])
const chatRoleDistribution = ref<{ name: string; value: number }[]>([])

const activeTrend = ref<'user' | 'tts' | 'login' | 'conversation' | 'message'>('user')
const activeDistribution = ref<'role' | 'ttsMode' | 'chatModel' | 'chatFeature' | 'chatRole'>('role')

const trendConfigs: Record<string, {
    data: () => { date: string; count: number }[]
    type: 'line' | 'bar'
    color: string
    area?: boolean
}> = {
    user: { data: () => userTrend.value, type: 'line', color: '#6366f1', area: true },
    tts: { data: () => ttsTrend.value, type: 'bar', color: '#3b82f6' },
    login: { data: () => loginTrend.value, type: 'line', color: '#10b981', area: false },
    conversation: { data: () => chatConversationTrend.value, type: 'line', color: '#8b5cf6', area: true },
    message: { data: () => chatMessageTrend.value, type: 'bar', color: '#f59e0b' },
}

const trendChartOption = computed(() => {
    const cfg = trendConfigs[activeTrend.value]
    const data = cfg.data()
    return {
        tooltip: { trigger: 'axis' },
        xAxis: {
            type: 'category',
            data: data.map((d) => d.date.slice(5)),
            axisLabel: { rotate: 45 },
        },
        yAxis: { type: 'value', minInterval: 1 },
        series: [{
            data: data.map((d) => d.count),
            type: cfg.type,
            smooth: cfg.type === 'line',
            itemStyle: { color: cfg.color },
            areaStyle: cfg.area ? { opacity: 0.2, color: cfg.color } : undefined,
        }],
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    }
})

const distributionConfigs: Record<string, {
    data: () => { name: string; value: number }[]
    radius: string | [string, string]
}> = {
    role: { data: () => roleDistribution.value, radius: ['40%', '70%'] },
    ttsMode: { data: () => ttsByMode.value, radius: '60%' },
    chatModel: { data: () => chatModelDistribution.value, radius: ['40%', '70%'] },
    chatFeature: { data: () => chatFeatureDistribution.value, radius: '60%' },
    chatRole: { data: () => chatRoleDistribution.value, radius: ['40%', '70%'] },
}

const hasTrendData = computed(() => {
    const cfg = trendConfigs[activeTrend.value]
    return cfg.data().some((d) => d.count > 0)
})

const hasDistributionData = computed(() => {
    const cfg = distributionConfigs[activeDistribution.value]
    return cfg.data().length > 0 && cfg.data().some((d) => d.value > 0)
})

const distributionChartOption = computed(() => {
    const cfg = distributionConfigs[activeDistribution.value]
    return {
        tooltip: { trigger: 'item' },
        legend: { bottom: '0%' },
        series: [{
            type: 'pie',
            radius: cfg.radius,
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
            label: { show: false },
            emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
            data: cfg.data(),
        }],
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    }
})

onMounted(async () => {
    try {
        const [
            overviewRes,
            chatOverviewRes,
            userTrendRes,
            ttsTrendRes,
            loginTrendRes,
            roleDistRes,
            ttsModeRes,
            chatConvTrendRes,
            chatMsgTrendRes,
            chatModelDistRes,
            chatFeatureDistRes,
            chatRoleDistRes,
        ] = await Promise.all([
            adminApi.getOverview(),
            adminApi.getChatOverview(),
            adminApi.getUserTrend(30),
            adminApi.getTtsTrend(30),
            adminApi.getLoginTrend(30),
            adminApi.getRoleDistribution(),
            adminApi.getTtsByMode(),
            adminApi.getChatConversationTrend(30),
            adminApi.getChatMessageTrend(30),
            adminApi.getChatModelDistribution(),
            adminApi.getChatFeatureDistribution(),
            adminApi.getChatRoleDistribution(),
        ])
        overview.value = overviewRes.data
        chatOverview.value = chatOverviewRes.data
        userTrend.value = userTrendRes.data
        ttsTrend.value = ttsTrendRes.data
        loginTrend.value = loginTrendRes.data
        roleDistribution.value = roleDistRes.data
        ttsByMode.value = ttsModeRes.data
        chatConversationTrend.value = chatConvTrendRes.data
        chatMessageTrend.value = chatMsgTrendRes.data
        chatModelDistribution.value = chatModelDistRes.data
        chatFeatureDistribution.value = chatFeatureDistRes.data
        chatRoleDistribution.value = chatRoleDistRes.data
    } catch {
        ElMessage.error('加载统计数据失败')
    } finally {
        loading.value = false
    }
})
</script>
