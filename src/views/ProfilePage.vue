<template>
    <div class="min-h-screen bg-gray-50">
        <!-- 顶部导航 -->
        <header class="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div class="max-w-400 mx-auto px-4 h-14 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <el-icon color="white" :size="20"><microphone /></el-icon>
                    </div>
                    <h1 class="text-lg font-bold text-gray-800">MiMo TTS 语音合成</h1>
                </div>
                <div class="flex items-center gap-3">
                    <el-button size="small" @click="$router.push('/')">
                        <el-icon><home-filled /></el-icon>
                        返回首页
                    </el-button>
                </div>
            </div>
        </header>

        <!-- 主内容 -->
        <main class="max-w-2xl mx-auto p-6">
            <div class="bg-white rounded-xl border border-gray-200 p-8">
                <h2 class="text-xl font-bold text-gray-800 mb-6">个人中心</h2>

                <!-- 头像 -->
                <div class="flex items-center gap-6 mb-8">
                    <el-upload
                        class="avatar-uploader"
                        action=""
                        :auto-upload="false"
                        :show-file-list="false"
                        :on-change="handleAvatarChange"
                        accept="image/*"
                    >
                        <el-avatar :size="80" :src="avatarUrl" class="cursor-pointer hover:opacity-80 transition-opacity">
                            <el-icon :size="32"><user-filled /></el-icon>
                        </el-avatar>
                    </el-upload>
                    <div>
                        <div class="text-lg font-semibold text-gray-800">{{ authStore.user?.username }}</div>
                        <el-tag v-if="authStore.user?.role" :type="authStore.user.role.code === 'admin' ? 'danger' : 'info'" size="small" class="mt-1">
                            {{ authStore.user.role.name }}
                        </el-tag>
                    </div>
                </div>

                <!-- 表单 -->
                <el-form :model="form" label-width="80px" class="space-y-4">
                    <el-form-item label="用户名">
                        <el-input v-model="form.username" disabled class="w-full" />
                    </el-form-item>
                    <el-form-item label="昵称">
                        <el-input v-model="form.nickname" placeholder="请输入昵称" maxlength="20" show-word-limit class="w-full" />
                    </el-form-item>
                    <el-form-item label="邮箱">
                        <el-input v-model="form.email" placeholder="请输入邮箱" class="w-full" />
                    </el-form-item>
                    <el-form-item label="手机号">
                        <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="11" class="w-full" />
                    </el-form-item>
                </el-form>

                <div class="flex gap-3 mt-8">
                    <el-button type="primary" :loading="saving" @click="handleSave">保存资料</el-button>
                    <el-button @click="showPasswordDialog = true">修改密码</el-button>
                </div>
            </div>
        </main>

        <!-- 修改密码弹窗 -->
        <el-dialog v-model="showPasswordDialog" title="修改密码" width="400px" :close-on-click-modal="false">
            <el-form :model="passwordForm" label-width="100px">
                <el-form-item label="原密码">
                    <el-input v-model="passwordForm.oldPassword" type="password" placeholder="请输入原密码" show-password />
                </el-form-item>
                <el-form-item label="新密码">
                    <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码（6-50位）" show-password />
                </el-form-item>
                <el-form-item label="确认新密码">
                    <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" show-password />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showPasswordDialog = false">取消</el-button>
                <el-button type="primary" :loading="changingPassword" @click="handleChangePassword">确认</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { uploadAvatar } from '../api/upload'
import { ElMessage } from 'element-plus'

const authStore = useAuthStore()

const avatarUrl = computed(() => {
    const avatar = authStore.user?.avatar
    if (!avatar) return ''
    if (avatar.startsWith('http')) return avatar
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    return `${backendUrl}${avatar}`
})

const form = ref({
    username: '',
    nickname: '',
    email: '',
    phone: '',
})

const saving = ref(false)
const showPasswordDialog = ref(false)
const changingPassword = ref(false)
const passwordForm = ref({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
})

onMounted(() => {
    if (authStore.user) {
        form.value.username = authStore.user.username
        form.value.nickname = authStore.user.nickname || ''
        form.value.email = authStore.user.email || ''
        form.value.phone = authStore.user.phone || ''
    }
})

async function handleAvatarChange(file: any) {
    const rawFile = file.raw
    if (!rawFile) return
    if (!rawFile.type.startsWith('image/')) {
        ElMessage.error('请上传图片文件')
        return
    }
    if (rawFile.size > 2 * 1024 * 1024) {
        ElMessage.error('头像大小不能超过 2MB')
        return
    }
    try {
        const res = await uploadAvatar(rawFile)
        await authStore.updateProfile({ avatar: res.url })
        ElMessage.success('头像更新成功')
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || '头像上传失败')
    }
}

async function handleSave() {
    saving.value = true
    try {
        await authStore.updateProfile({
            nickname: form.value.nickname,
            email: form.value.email,
            phone: form.value.phone,
        })
        ElMessage.success('资料保存成功')
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || '保存失败')
    } finally {
        saving.value = false
    }
}

async function handleChangePassword() {
    const { oldPassword, newPassword, confirmPassword } = passwordForm.value
    if (!oldPassword || !newPassword || !confirmPassword) {
        ElMessage.warning('请填写所有密码字段')
        return
    }
    if (newPassword.length < 6 || newPassword.length > 50) {
        ElMessage.warning('新密码长度应为6-50个字符')
        return
    }
    if (newPassword !== confirmPassword) {
        ElMessage.warning('两次输入的新密码不一致')
        return
    }
    changingPassword.value = true
    try {
        await authStore.changePassword(oldPassword, newPassword)
        ElMessage.success('密码修改成功，请重新登录')
        showPasswordDialog.value = false
        passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
        authStore.logout()
        window.location.href = '/login'
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || '密码修改失败')
    } finally {
        changingPassword.value = false
    }
}
</script>

<style scoped>
:deep(.avatar-uploader .el-upload) {
    border-radius: 50%;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: var(--el-transition-duration-fast);
}
</style>
