<template>
  <div class="bg-white rounded-xl border border-gray-200 p-5">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-semibold text-gray-800">智能体审计</h3>
      <span class="text-xs text-gray-400">仅支持查看与归档，不提供后台编辑</span>
    </div>
    <div class="flex gap-3 mb-4">
      <el-input v-model="username" clearable placeholder="筛选用户名" style="width: 200px" @keyup.enter="search" />
      <el-select v-model="published" clearable placeholder="发布状态" style="width: 160px">
        <el-option label="已发布" value="true" />
        <el-option label="未发布" value="false" />
      </el-select>
      <el-button type="primary" native-type="button" @click="search">查询</el-button>
    </div>
    <el-table :data="items" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="名称" min-width="160" />
      <el-table-column prop="owner.username" label="所属用户" width="130" />
      <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip />
      <el-table-column label="发布状态" width="110">
        <template #default="{ row }"><el-tag :type="row.publishedVersionId ? 'success' : 'info'">{{ row.publishedVersionId ? '已发布' : '未发布' }}</el-tag></template>
      </el-table-column>
      <el-table-column label="归档状态" width="110"><template #default="{ row }"><el-tag :type="row.archivedAt ? 'warning' : 'success'">{{ row.archivedAt ? '已归档' : '正常' }}</el-tag></template></el-table-column>
      <el-table-column label="更新时间" width="180"><template #default="{ row }">{{ formatDate(row.updatedAt) }}</template></el-table-column>
      <el-table-column label="操作" width="160" fixed="right"><template #default="{ row }"><el-button size="small" native-type="button" @click="showDetail(row.id)">详情</el-button><el-popconfirm v-if="!row.archivedAt" title="确定归档该智能体？" @confirm="remove(row.id)"><template #reference><el-button size="small" type="danger" native-type="button">归档</el-button></template></el-popconfirm></template></el-table-column>
      <template #empty><el-empty description="暂无智能体" /></template>
    </el-table>
    <div class="flex justify-end mt-4"><el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10,20,50]" layout="total, sizes, prev, pager, next" @change="load" /></div>
    <el-dialog v-model="detailVisible" title="智能体详情" width="720px"><pre class="audit-json">{{ JSON.stringify(detail, null, 2) }}</pre></el-dialog>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '../../api/admin'
const items = ref<any[]>([]); const loading = ref(false); const page = ref(1); const pageSize = ref(20); const total = ref(0); const username = ref(''); const published = ref(''); const detail = ref<any>(null); const detailVisible = ref(false)
const formatDate = (value?: string) => value ? new Date(value).toLocaleString() : '-'
async function load() { loading.value = true; try { const res = await adminApi.getAgents({ page: page.value, pageSize: pageSize.value, username: username.value.trim() || undefined, published: published.value || undefined }); items.value = res.data[0]; total.value = res.data[1] } catch { ElMessage.error('加载智能体审计数据失败') } finally { loading.value = false } }
function search() { page.value = 1; load() }
async function showDetail(id: number) { try { detail.value = (await adminApi.getAgent(id)).data; detailVisible.value = true } catch { ElMessage.error('加载智能体详情失败') } }
async function remove(id: number) { try { await adminApi.deleteAgent(id); ElMessage.success('智能体已归档'); load() } catch { ElMessage.error('归档智能体失败') } }
onMounted(load)
</script>
<style scoped>.audit-json { max-height: 520px; overflow: auto; padding: 12px; border-radius: 8px; background: #f8fafc; white-space: pre-wrap; word-break: break-all; }</style>
