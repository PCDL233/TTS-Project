<template>
    <div class="bg-white rounded-xl border border-gray-200 p-5">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-semibold text-gray-800">登录日志</h3>
        </div>

        <div class="flex items-center gap-3 mb-4">
            <el-input v-model="searchUsername" placeholder="搜索用户名" clearable style="width: 200px" />
            <el-select v-model="searchStatus" placeholder="状态" clearable style="width: 120px">
                <el-option label="成功" value="success" />
                <el-option label="失败" value="fail" />
            </el-select>
            <el-button type="primary" @click="loadLogs">查询</el-button>
            <el-button
                v-if="selectedRows.length > 0"
                type="danger"
                @click="handleBatchDelete"
            >
                批量删除 ({{ selectedRows.length }})
            </el-button>
        </div>

        <el-table
            :data="logs"
            v-loading="loading"
            border
            stripe
            @selection-change="handleSelectionChange"
        >
            <el-table-column type="selection" width="50" align="center" />
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
            <el-table-column label="操作" width="80" align="center">
                <template #default="{ row }">
                    <el-button type="danger" size="small" link @click="handleDelete(row.id)">
                        删除
                    </el-button>
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
import { ElMessage, ElMessageBox } from 'element-plus'

const logs = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const searchUsername = ref('')
const searchStatus = ref('')
const selectedRows = ref<any[]>([])

function handleSelectionChange(rows: any[]) {
    selectedRows.value = rows
}

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

async function handleDelete(id: number) {
    try {
        await ElMessageBox.confirm('确定删除该登录日志吗？', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
        })
        await adminApi.deleteLoginLog(id)
        ElMessage.success('删除成功')
        loadLogs()
    } catch (error: any) {
        if (error !== 'cancel') {
            ElMessage.error('删除失败')
        }
    }
}

async function handleBatchDelete() {
    const ids = selectedRows.value.map((row) => row.id)
    if (ids.length === 0) return
    try {
        await ElMessageBox.confirm(`确定删除选中的 ${ids.length} 条登录日志吗？`, '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
        })
        await adminApi.deleteLoginLogs(ids)
        ElMessage.success('批量删除成功')
        selectedRows.value = []
        loadLogs()
    } catch (error: any) {
        if (error !== 'cancel') {
            ElMessage.error('批量删除失败')
        }
    }
}

onMounted(() => {
    loadLogs()
})
</script>
