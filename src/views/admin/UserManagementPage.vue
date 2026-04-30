<template>
    <div class="bg-white rounded-xl border border-gray-200 p-5">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-semibold text-gray-800">用户列表</h3>
        </div>

        <!-- 筛选 -->
        <div class="flex gap-3 mb-4">
            <el-input v-model="searchUsername" placeholder="搜索用户名" clearable style="width: 200px" />
            <el-select v-model="searchRoleId" placeholder="选择角色" clearable style="width: 150px">
                <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id" />
            </el-select>
            <el-button type="primary" @click="loadUsers">查询</el-button>
        </div>

        <!-- 表格 -->
        <el-table :data="users" v-loading="loading" border stripe>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="username" label="用户名" />
            <el-table-column prop="nickname" label="昵称" />
            <el-table-column prop="role" label="角色">
                <template #default="{ row }">
                    <el-tag :type="row.role?.code === 'admin' ? 'danger' : 'info'" size="small">
                        {{ row.role?.name || '-' }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="email" label="邮箱" />
            <el-table-column prop="phone" label="手机号" />
            <el-table-column prop="createdAt" label="注册时间">
                <template #default="{ row }">
                    {{ row.createdAt ? new Date(row.createdAt).toLocaleString() : '-' }}
                </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
                <template #default="{ row }">
                    <el-button size="small" @click="openRoleDialog(row)">改角色</el-button>
                    <el-popconfirm title="确定删除该用户？" @confirm="deleteUser(row.id)">
                        <template #reference>
                            <el-button size="small" type="danger">删除</el-button>
                        </template>
                    </el-popconfirm>
                </template>
            </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="flex justify-end mt-4">
            <el-pagination
                v-model:current-page="page"
                v-model:page-size="pageSize"
                :total="total"
                :page-sizes="[10, 20, 50]"
                layout="total, sizes, prev, pager, next"
                @change="loadUsers"
            />
        </div>

        <!-- 修改角色弹窗 -->
        <el-dialog v-model="roleDialogVisible" title="修改用户角色" width="350px">
            <el-select v-model="selectedRoleId" placeholder="选择角色" class="w-full">
                <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id" />
            </el-select>
            <template #footer>
                <el-button @click="roleDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="confirmUpdateRole">确认</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '../../api/admin'
import { ElMessage } from 'element-plus'

const users = ref<any[]>([])
const roles = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const searchUsername = ref('')
const searchRoleId = ref<number | undefined>(undefined)

const roleDialogVisible = ref(false)
const selectedRoleId = ref<number | undefined>(undefined)
const currentUserId = ref<number | undefined>(undefined)

async function loadUsers() {
    loading.value = true
    try {
        const res = await adminApi.getUsers({
            page: page.value,
            pageSize: pageSize.value,
            username: searchUsername.value || undefined,
            roleId: searchRoleId.value,
        })
        users.value = res.data[0]
        total.value = res.data[1]
    } catch {
        ElMessage.error('加载用户列表失败')
    } finally {
        loading.value = false
    }
}

async function loadRoles() {
    try {
        const res = await adminApi.getRoles()
        roles.value = res.data
    } catch {
        ElMessage.error('加载角色列表失败')
    }
}

function openRoleDialog(row: any) {
    currentUserId.value = row.id
    selectedRoleId.value = row.role?.id
    roleDialogVisible.value = true
}

async function confirmUpdateRole() {
    if (!currentUserId.value || !selectedRoleId.value) return
    try {
        await adminApi.updateUserRole(currentUserId.value, selectedRoleId.value)
        ElMessage.success('角色修改成功')
        roleDialogVisible.value = false
        loadUsers()
    } catch {
        ElMessage.error('角色修改失败')
    }
}

async function deleteUser(id: number) {
    try {
        await adminApi.deleteUser(id)
        ElMessage.success('删除成功')
        loadUsers()
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || '删除失败')
    }
}

onMounted(() => {
    loadUsers()
    loadRoles()
})
</script>
