<template>
    <div class="bg-white rounded-xl border border-gray-200 p-5">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-semibold text-gray-800">音频标签管理</h3>
            <el-button type="primary" @click="openCreateDialog">新增标签</el-button>
        </div>

        <el-form :model="filterForm" inline class="mb-4">
            <el-form-item label="名称">
                <el-input v-model="filterForm.name" placeholder="输入名称" clearable @keyup.enter="loadTags" />
            </el-form-item>
            <el-form-item label="标识">
                <el-input v-model="filterForm.code" placeholder="输入标识" clearable @keyup.enter="loadTags" />
            </el-form-item>
            <el-form-item label="分组">
                <el-select v-model="filterForm.group" placeholder="选择分组" clearable style="width: 160px">
                    <el-option v-for="(label, key) in GROUP_LABELS" :key="key" :label="label" :value="key" />
                </el-select>
            </el-form-item>
            <el-form-item>
                <el-button type="primary" @click="loadTags">筛选</el-button>
                <el-button @click="resetFilter">重置</el-button>
            </el-form-item>
        </el-form>

        <el-table :data="tags" v-loading="loading" border stripe>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="name" label="名称" />
            <el-table-column prop="code" label="标识" />
            <el-table-column prop="group" label="分组">
                <template #default="{ row }">
                    {{ GROUP_LABELS[row.group] || row.group || '-' }}
                </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" />
            <el-table-column prop="sort" label="排序" width="80" />
            <el-table-column prop="createdAt" label="创建时间">
                <template #default="{ row }">
                    {{ row.createdAt ? new Date(row.createdAt).toLocaleString() : '-' }}
                </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
                <template #default="{ row }">
                    <el-button size="small" @click="openEditDialog(row)">编辑</el-button>
                    <el-popconfirm title="确定删除该标签？" @confirm="deleteTag(row.id)">
                        <template #reference>
                            <el-button size="small" type="danger">删除</el-button>
                        </template>
                    </el-popconfirm>
                </template>
            </el-table-column>
        </el-table>

        <!-- 新增/编辑弹窗 -->
        <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑标签' : '新增标签'" width="400px">
            <el-form :model="form" label-width="80px">
                <el-form-item label="名称">
                    <el-input v-model="form.name" placeholder="如：开心" />
                </el-form-item>
                <el-form-item label="标识">
                    <el-input v-model="form.code" placeholder="如：happy" :disabled="isEdit" />
                </el-form-item>
                <el-form-item label="分组">
                    <el-select v-model="form.group" placeholder="选择分组" class="w-full">
                        <el-option v-for="(label, key) in GROUP_LABELS" :key="key" :label="label" :value="key" />
                    </el-select>
                </el-form-item>
                <el-form-item label="描述">
                    <el-input v-model="form.description" type="textarea" placeholder="请输入描述" />
                </el-form-item>
                <el-form-item label="排序">
                    <el-input-number v-model="form.sort" :min="0" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" @click="saveTag">保存</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '../../api/admin'
import { ElMessage } from 'element-plus'

const GROUP_LABELS: Record<string, string> = {
    basicEmotion: '基础情绪',
    complexEmotion: '复合情绪',
    tone: '整体语调',
    voiceQuality: '音色定位',
    character: '人设腔调',
    dialect: '方言',
    roleplay: '角色扮演',
    audioEffect: '音频效果',
}

const tags = ref<any[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const form = ref({ id: 0, name: '', code: '', group: '', description: '', sort: 0 })

const filterForm = ref({
    name: '',
    code: '',
    group: '',
})

async function loadTags() {
    loading.value = true
    try {
        const params: Record<string, string> = {}
        if (filterForm.value.name.trim()) params.name = filterForm.value.name.trim()
        if (filterForm.value.code.trim()) params.code = filterForm.value.code.trim()
        if (filterForm.value.group) params.group = filterForm.value.group
        const res = await adminApi.getAudioTags(params)
        tags.value = res.data
    } catch {
        ElMessage.error('加载音频标签失败')
    } finally {
        loading.value = false
    }
}

function resetFilter() {
    filterForm.value = { name: '', code: '', group: '' }
    loadTags()
}

function openCreateDialog() {
    isEdit.value = false
    form.value = { id: 0, name: '', code: '', group: '', description: '', sort: 0 }
    dialogVisible.value = true
}

function openEditDialog(row: any) {
    isEdit.value = true
    form.value = { id: row.id, name: row.name, code: row.code, group: row.group || '', description: row.description, sort: row.sort }
    dialogVisible.value = true
}

async function saveTag() {
    try {
        if (isEdit.value) {
            await adminApi.updateAudioTag(form.value.id, {
                name: form.value.name,
                group: form.value.group,
                description: form.value.description,
                sort: form.value.sort,
            })
        } else {
            await adminApi.createAudioTag({
                name: form.value.name,
                code: form.value.code,
                group: form.value.group,
                description: form.value.description,
                sort: form.value.sort,
            })
        }
        ElMessage.success('保存成功')
        dialogVisible.value = false
        loadTags()
    } catch {
        ElMessage.error('保存失败')
    }
}

async function deleteTag(id: number) {
    try {
        await adminApi.deleteAudioTag(id)
        ElMessage.success('删除成功')
        loadTags()
    } catch {
        ElMessage.error('删除失败')
    }
}

onMounted(() => {
    loadTags()
})
</script>
