<template>
    <div class="bg-white rounded-xl border border-gray-200 p-5">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-semibold text-gray-800">角色列表</h3>
            <el-button type="primary" @click="openCreateDialog">新增角色</el-button>
        </div>

        <el-table :data="roles" v-loading="loading" border stripe>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="name" label="角色名" />
            <el-table-column prop="code" label="标识" />
            <el-table-column prop="description" label="描述" />
            <el-table-column prop="createdAt" label="创建时间">
                <template #default="{ row }">
                    {{ row.createdAt ? new Date(row.createdAt).toLocaleString() : '-' }}
                </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
                <template #default="{ row }">
                    <el-button size="small" @click="openEditDialog(row)">编辑</el-button>
                    <el-popconfirm title="确定删除该角色？" @confirm="deleteRole(row.id)">
                        <template #reference>
                            <el-button size="small" type="danger" :disabled="isBuiltInRole(row.code)">删除</el-button>
                        </template>
                    </el-popconfirm>
                </template>
            </el-table-column>
        </el-table>

        <!-- 新增/编辑弹窗 -->
        <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑角色' : '新增角色'" width="400px">
            <el-form :model="form" label-width="80px">
                <el-form-item label="角色名">
                    <el-input v-model="form.name" placeholder="请输入角色名" />
                </el-form-item>
                <el-form-item label="标识">
                    <el-input v-model="form.code" placeholder="如：editor" :disabled="isEdit" />
                </el-form-item>
                <el-form-item label="描述">
                    <el-input v-model="form.description" type="textarea" placeholder="请输入描述" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" @click="saveRole">保存</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '../../api/admin'
import { ElMessage } from 'element-plus'

const roles = ref<any[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const form = ref({ id: 0, name: '', code: '', description: '' })

function isBuiltInRole(code: string) {
    return code === 'admin' || code === 'user'
}

async function loadRoles() {
    loading.value = true
    try {
        const res = await adminApi.getRoles()
        roles.value = res.data
    } catch {
        ElMessage.error('加载角色列表失败')
    } finally {
        loading.value = false
    }
}

function openCreateDialog() {
    isEdit.value = false
    form.value = { id: 0, name: '', code: '', description: '' }
    dialogVisible.value = true
}

function openEditDialog(row: any) {
    isEdit.value = true
    form.value = { id: row.id, name: row.name, code: row.code, description: row.description }
    dialogVisible.value = true
}

async function saveRole() {
    try {
        if (isEdit.value) {
            await adminApi.updateRole(form.value.id, { name: form.value.name, description: form.value.description })
        } else {
            await adminApi.createRole({ name: form.value.name, code: form.value.code, description: form.value.description })
        }
        ElMessage.success('保存成功')
        dialogVisible.value = false
        loadRoles()
    } catch {
        ElMessage.error('保存失败')
    }
}

async function deleteRole(id: number) {
    try {
        await adminApi.deleteRole(id)
        ElMessage.success('删除成功')
        loadRoles()
    } catch {
        ElMessage.error('删除失败')
    }
}

onMounted(() => {
    loadRoles()
})
</script>
