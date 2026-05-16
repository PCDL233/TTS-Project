<template>
    <div v-loading="loading" class="space-y-6">
        <!-- 统计卡片 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        </div>

        <!-- 图表区域 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- 用户注册趋势 -->
            <div class="bg-white rounded-xl border border-gray-200 p-5">
                <h3 class="text-sm font-semibold text-gray-700 mb-4">用户注册趋势（近30天）</h3>
                <div class="h-72 w-full">
                    <v-chart class="w-full h-full" :option="userTrendOption" :autoresize="{ throttle: 100 }" />
                </div>
            </div>

            <!-- TTS 生成趋势 -->
            <div class="bg-white rounded-xl border border-gray-200 p-5">
                <h3 class="text-sm font-semibold text-gray-700 mb-4">TTS 生成趋势（近30天）</h3>
                <div class="h-72 w-full">
                    <v-chart class="w-full h-full" :option="ttsTrendOption" :autoresize="{ throttle: 100 }" />
                </div>
            </div>

            <!-- 角色分布 -->
            <div class="bg-white rounded-xl border border-gray-200 p-5">
                <h3 class="text-sm font-semibold text-gray-700 mb-4">用户角色分布</h3>
                <div class="h-72 w-full">
                    <v-chart class="w-full h-full" :option="roleDistributionOption" :autoresize="{ throttle: 100 }" />
                </div>
            </div>

            <!-- TTS 模式分布 -->
            <div class="bg-white rounded-xl border border-gray-200 p-5">
                <h3 class="text-sm font-semibold text-gray-700 mb-4">TTS 模式分布</h3>
                <div class="h-72 w-full">
                    <v-chart class="w-full h-full" :option="ttsByModeOption" :autoresize="{ throttle: 100 }" />
                </div>
            </div>

            <!-- 登录活跃度 -->
            <div class="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
                <h3 class="text-sm font-semibold text-gray-700 mb-4">登录活跃度（近30天）</h3>
                <div class="h-72 w-full">
                    <v-chart class="w-full h-full" :option="loginTrendOption" :autoresize="{ throttle: 100 }" />
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
const userTrend = ref<{ date: string; count: number }[]>([])
const ttsTrend = ref<{ date: string; count: number }[]>([])
const loginTrend = ref<{ date: string; count: number }[]>([])
const roleDistribution = ref<{ name: string; value: number }[]>([])
const ttsByMode = ref<{ name: string; value: number }[]>([])

const userTrendOption = computed(() => ({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: userTrend.value.map((d) => d.date.slice(5)), axisLabel: { rotate: 45 } },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{ data: userTrend.value.map((d) => d.count), type: 'line', smooth: true, areaStyle: { opacity: 0.2 } }],
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
}))

const ttsTrendOption = computed(() => ({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ttsTrend.value.map((d) => d.date.slice(5)), axisLabel: { rotate: 45 } },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{ data: ttsTrend.value.map((d) => d.count), type: 'bar', itemStyle: { color: '#3b82f6' } }],
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
}))

const loginTrendOption = computed(() => ({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: loginTrend.value.map((d) => d.date.slice(5)), axisLabel: { rotate: 45 } },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{ data: loginTrend.value.map((d) => d.count), type: 'line', smooth: true, itemStyle: { color: '#10b981' } }],
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
}))

const roleDistributionOption = computed(() => ({
    tooltip: { trigger: 'item' },
    legend: { bottom: '0%' },
    series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        data: roleDistribution.value,
    }],
}))

const ttsByModeOption = computed(() => ({
    tooltip: { trigger: 'item' },
    legend: { bottom: '0%' },
    series: [{
        type: 'pie',
        radius: '60%',
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        data: ttsByMode.value,
    }],
}))

onMounted(async () => {
    try {
        const [overviewRes, userTrendRes, ttsTrendRes, loginTrendRes, roleDistRes, ttsModeRes] = await Promise.all([
            adminApi.getOverview(),
            adminApi.getUserTrend(30),
            adminApi.getTtsTrend(30),
            adminApi.getLoginTrend(30),
            adminApi.getRoleDistribution(),
            adminApi.getTtsByMode(),
        ])
        overview.value = overviewRes.data
        userTrend.value = userTrendRes.data
        ttsTrend.value = ttsTrendRes.data
        loginTrend.value = loginTrendRes.data
        roleDistribution.value = roleDistRes.data
        ttsByMode.value = ttsModeRes.data
    } catch {
        ElMessage.error('加载统计数据失败')
    } finally {
        loading.value = false
    }
})
</script>
