<template>
  <div class="bg-white rounded-xl border border-gray-200 p-5">
    <div class="flex items-center justify-between mb-4"><h3 class="text-base font-semibold text-gray-800">MCP 服务审计</h3><span class="text-xs text-gray-400">敏感环境变量和请求头已脱敏</span></div>
    <div class="flex gap-3 mb-4"><el-input v-model="username" clearable placeholder="筛选用户名" style="width:200px" @keyup.enter="search" /><el-select v-model="enabled" clearable placeholder="启用状态" style="width:150px"><el-option label="已启用" value="true" /><el-option label="已停用" value="false" /></el-select><el-button type="primary" native-type="button" @click="search">查询</el-button></div>
    <el-table :data="items" v-loading="loading" border stripe><el-table-column prop="id" label="ID" width="70" /><el-table-column prop="name" label="名称" min-width="160" /><el-table-column prop="owner.username" label="所属用户" width="130" /><el-table-column prop="transport.type" label="传输方式" width="100" /><el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '已启用' : '已停用' }}</el-tag></template></el-table-column><el-table-column label="工具数" width="90"><template #default="{ row }">{{ row.cachedTools?.length || 0 }}</template></el-table-column><el-table-column label="更新时间" width="180"><template #default="{ row }">{{ formatDate(row.updatedAt) }}</template></el-table-column><el-table-column label="操作" width="150" fixed="right"><template #default="{ row }"><el-button size="small" native-type="button" @click="showDetail(row.id)">详情</el-button><el-popconfirm title="确定删除该 MCP 服务？" @confirm="remove(row.id)"><template #reference><el-button size="small" type="danger" native-type="button">删除</el-button></template></el-popconfirm></template></el-table-column><template #empty><el-empty description="暂无 MCP 服务" /></template></el-table>
    <div class="flex justify-end mt-4"><el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10,20,50]" layout="total, sizes, prev, pager, next" @change="load" /></div>
    <el-dialog v-model="detailVisible" title="MCP 服务详情" width="720px"><pre class="audit-json">{{ JSON.stringify(detail, null, 2) }}</pre></el-dialog>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '../../api/admin'
const items = ref<any[]>([]); const loading = ref(false); const page = ref(1); const pageSize = ref(20); const total = ref(0); const username = ref(''); const enabled = ref(''); const detail = ref<any>(null); const detailVisible = ref(false)
const formatDate = (value?: string) => value ? new Date(value).toLocaleString() : '-'
async function load() { loading.value = true; try { const res = await adminApi.getMcpServers({ page: page.value, pageSize: pageSize.value, username: username.value.trim() || undefined, enabled: enabled.value || undefined }); items.value = res.data[0]; total.value = res.data[1] } catch { ElMessage.error('加载 MCP 审计数据失败') } finally { loading.value = false } }
function search() { page.value = 1; load() }
async function showDetail(id: number) { try { detail.value = (await adminApi.getMcpServer(id)).data; detailVisible.value = true } catch { ElMessage.error('加载 MCP 服务详情失败') } }
async function remove(id: number) { try { await adminApi.deleteMcpServer(id); ElMessage.success('MCP 服务已删除'); load() } catch { ElMessage.error('删除 MCP 服务失败') } }
onMounted(load)
</script>
<style scoped>.audit-json { max-height: 520px; overflow: auto; padding: 12px; border-radius: 8px; background: #f8fafc; white-space: pre-wrap; word-break: break-all; }</style>
