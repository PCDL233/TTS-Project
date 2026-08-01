<template>
  <div class="bg-white rounded-xl border border-gray-200 p-5">
    <div class="flex items-center justify-between mb-4"><h3 class="text-base font-semibold text-gray-800">语音生成历史</h3><span class="text-xs text-gray-400">仅展示元数据，不提供音频 Base64 内容</span></div>
    <div class="flex gap-3 mb-4"><el-input v-model="username" clearable placeholder="筛选用户名" style="width:200px" @keyup.enter="search" /><el-input v-model="mode" clearable placeholder="筛选生成模式" style="width:180px" @keyup.enter="search" /><el-button type="primary" native-type="button" @click="search">查询</el-button></div>
    <el-table :data="items" v-loading="loading" border stripe><el-table-column prop="id" label="ID" width="70" /><el-table-column prop="owner.username" label="所属用户" width="130" /><el-table-column prop="text" label="合成文本" min-width="260" show-overflow-tooltip /><el-table-column prop="mode" label="模式" width="100" /><el-table-column prop="voice" label="音色" width="130" show-overflow-tooltip /><el-table-column prop="audioFormat" label="格式" width="80" /><el-table-column label="音频" width="90"><template #default="{ row }"><el-tag :type="row.hasAudio ? 'success' : 'info'">{{ row.hasAudio ? '已保存' : '无' }}</el-tag></template></el-table-column><el-table-column label="生成时间" width="180"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column><el-table-column label="操作" width="90" fixed="right"><template #default="{ row }"><el-popconfirm title="确定删除该生成历史？" @confirm="remove(row.id)"><template #reference><el-button size="small" type="danger" native-type="button">删除</el-button></template></el-popconfirm></template></el-table-column><template #empty><el-empty description="暂无生成历史" /></template></el-table>
    <div class="flex justify-end mt-4"><el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10,20,50]" layout="total, sizes, prev, pager, next" @change="load" /></div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '../../api/admin'
const items = ref<any[]>([]); const loading = ref(false); const page = ref(1); const pageSize = ref(20); const total = ref(0); const username = ref(''); const mode = ref('')
const formatDate = (value?: number | string) => value ? new Date(Number(value)).toLocaleString() : '-'
async function load() { loading.value = true; try { const res = await adminApi.getTtsHistory({ page: page.value, pageSize: pageSize.value, username: username.value.trim() || undefined, mode: mode.value.trim() || undefined }); items.value = res.data[0]; total.value = res.data[1] } catch { ElMessage.error('加载生成历史失败') } finally { loading.value = false } }
function search() { page.value = 1; load() }
async function remove(id: number) { try { await adminApi.deleteTtsHistory(id); ElMessage.success('生成历史已删除'); load() } catch { ElMessage.error('删除生成历史失败') } }
onMounted(load)
</script>
