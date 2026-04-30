<template>
    <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div class="w-full max-w-md">
            <div class="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                <div class="flex items-center justify-center gap-3 mb-8">
                    <div
                        class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center"
                    >
                        <el-icon color="white" :size="24"><microphone /></el-icon>
                    </div>
                    <h1 class="text-xl font-bold text-gray-800">MiMo TTS</h1>
                </div>

                <h2 class="text-lg font-semibold text-gray-800 text-center mb-6">
                    账号登录
                </h2>

                <el-form
                    ref="formRef"
                    :model="form"
                    :rules="rules"
                    label-position="top"
                    @submit.prevent="handleSubmit"
                >
                    <el-form-item label="用户名" prop="username">
                        <el-input
                            v-model="form.username"
                            placeholder="请输入用户名"
                            size="large"
                            class="auth-input"
                        >
                            <template #prefix>
                                <el-icon class="text-gray-400"><user /></el-icon>
                            </template>
                        </el-input>
                    </el-form-item>

                    <el-form-item label="密码" prop="password">
                        <el-input
                            v-model="form.password"
                            type="password"
                            placeholder="请输入密码"
                            size="large"
                            class="auth-input"
                            show-password
                            @keyup.enter="handleSubmit"
                        >
                            <template #prefix>
                                <el-icon class="text-gray-400"><lock /></el-icon>
                            </template>
                        </el-input>
                    </el-form-item>

                    <el-button
                        type="primary"
                        size="large"
                        class="w-full mt-2 !rounded-lg"
                        :loading="loading"
                        @click="handleSubmit"
                    >
                        登录
                    </el-button>
                </el-form>

                <div class="mt-6 text-center text-sm text-gray-500">
                    还没有账号？
                    <router-link
                        to="/register"
                        class="text-primary hover:underline font-medium"
                    >
                        立即注册
                    </router-link>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Microphone, User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref()
const loading = ref(false)

const form = reactive({
    username: '',
    password: '',
})

const rules = {
    username: [
        { required: true, message: '请输入用户名', trigger: 'blur' },
        { min: 3, max: 20, message: '用户名长度应为3-20个字符', trigger: 'blur' },
    ],
    password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 6, max: 50, message: '密码长度应为6-50个字符', trigger: 'blur' },
    ],
}

async function handleSubmit() {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) return

    loading.value = true
    try {
        await authStore.login(form.username, form.password)
        ElMessage.success('登录成功')
        router.push('/')
    } catch (error: any) {
        ElMessage.error(error.response?.data?.message || '登录失败')
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
:deep(.auth-input .el-input__wrapper) {
    border-radius: 0.5rem;
    box-shadow: 0 0 0 1px #e5e7eb inset;
    background-color: #f9fafb;
    padding-left: 12px;
    transition: all 0.2s ease;
}

:deep(.auth-input .el-input__wrapper:hover) {
    box-shadow: 0 0 0 1px #d1d5db inset;
    background-color: #ffffff;
}

:deep(.auth-input .el-input__wrapper.is-focus) {
    box-shadow: 0 0 0 1px #6b7280 inset;
    background-color: #ffffff;
}

:deep(.auth-input .el-input__prefix) {
    background: transparent !important;
}

:deep(.auth-input .el-input__prefix-inner) {
    color: #9ca3af;
}

:deep(.auth-input .el-input__inner::placeholder) {
    color: #9ca3af;
}
</style>
