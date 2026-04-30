<template>
    <div class="bg-white rounded-xl border border-gray-200 p-5">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-semibold text-gray-800">登录日志</h3>
        </div>

        <div class="flex gap-3 mb-4">
            <el-input v-model="searchUsername" placeholder="搜索用户名" clearable style="width: 200px" />
            <el-select v-model="searchStatus" placeholder="状态" clearable style="width: 120px">
                <el-option label="成功" value="success" />
                <el-option label="失败" value="fail" />
            </el-select>
            <el-button type="primary" @click="loadLogs">查询</el-button>
        </div>

        <el-table :data="logs" v-loading="loading" border stripe>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="username" label="用户名" />
            <el-table-column prop="ip" label="IP 地址" />
            <el-table-column prop="userAgent" label="User Agent" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="80">
                <template #default="{ row }">
                    <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
                        {{ row.status === 'success' ? '成功' : '失败' }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="message" label="消息" />
            <el-table-column prop="createdAt" label="时间">
                <template #default="{ row }">
                    {{ row.createdAt ? new Date(row.createdAt).toLocaleString() : '-' }}
                </template>
            </el-table-column>
        </el-table>

        <div class="flex justify-end mt-4">
            <el-pagination
                v-model:current-page="page"
                v-model:page-size="pageSize"
                :total="total"
                :page-sizes="[10, 20, 50]"
                layout="total, sizes, prev, pager, next"
                @change="loadLogs"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '../../api/admin'
import { ElMessage } from 'element-plus'

const logs = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const searchUsername = ref('')
const searchStatus = ref('')

async function loadLogs() {
    loading.value = true
    try {
        const res = await adminApi.getLoginLogs({
            page: page.value,
            pageSize: pageSize.value,
            username: searchUsername.value || undefined,
            status: searchStatus.value || undefined,
        })
        logs.value = res.data[0]
        total.value = res.data[1]
    } catch {
        ElMessage.error('加载登录日志失败')
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    loadLogs()
})
</script>
