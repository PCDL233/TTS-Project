<template>
    <div class="bg-white rounded-xl border border-gray-200 p-5">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-semibold text-gray-800">系统配置</h3>
        </div>

        <el-table :data="configs" v-loading="loading" border stripe>
            <el-table-column prop="key" label="配置键" />
            <el-table-column prop="value" label="配置值">
                <template #default="{ row }">
                    <el-switch
                        v-if="row.key === 'allow_register'"
                        v-model="row.value"
                        active-value="true"
                        inactive-value="false"
                        @change="(val: any) => updateConfig(row.key, String(val))"
                    />
                    <span v-else>{{ row.value }}</span>
                </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" />
            <el-table-column label="操作" width="100">
                <template #default="{ row }">
                    <el-button size="small" @click="openEditDialog(row)">编辑</el-button>
                </template>
            </el-table-column>
        </el-table>

        <!-- 编辑弹窗 -->
        <el-dialog v-model="dialogVisible" title="编辑配置" width="400px">
            <el-form label-width="80px">
                <el-form-item label="配置键">
                    <el-input v-model="currentConfig.key" disabled />
                </el-form-item>
                <el-form-item label="配置值">
                    <el-input v-model="currentConfig.value" placeholder="请输入配置值" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" @click="confirmUpdate">保存</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '../../api/admin'
import { ElMessage } from 'element-plus'

const configs = ref<any[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const currentConfig = ref({ key: '', value: '' })

async function loadConfigs() {
    loading.value = true
    try {
        const res = await adminApi.getSystemConfigs()
        configs.value = res.data
    } catch {
        ElMessage.error('加载系统配置失败')
    } finally {
        loading.value = false
    }
}

function openEditDialog(row: any) {
    currentConfig.value = { key: row.key, value: row.value }
    dialogVisible.value = true
}

async function confirmUpdate() {
    try {
        await adminApi.updateSystemConfig(currentConfig.value.key, currentConfig.value.value)
        ElMessage.success('配置更新成功')
        dialogVisible.value = false
        loadConfigs()
    } catch {
        ElMessage.error('配置更新失败')
    }
}

async function updateConfig(key: string, value: string) {
    try {
        await adminApi.updateSystemConfig(key, value)
        ElMessage.success('配置更新成功')
    } catch {
        ElMessage.error('配置更新失败')
    }
}

onMounted(() => {
    loadConfigs()
})
</script>
