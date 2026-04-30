import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { ElMessage } from 'element-plus'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/LoginPage.vue'),
      meta: { public: true },
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('../views/RegisterPage.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/HomePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('../views/ProfilePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      component: () => import('../views/admin/AdminLayout.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        { path: '', redirect: '/admin/dashboard' },
        { path: 'dashboard', component: () => import('../views/admin/DashboardPage.vue') },
        { path: 'users', component: () => import('../views/admin/UserManagementPage.vue') },
        { path: 'roles', component: () => import('../views/admin/RoleManagementPage.vue') },
        { path: 'login-logs', component: () => import('../views/admin/LoginLogsPage.vue') },
        { path: 'operation-logs', component: () => import('../views/admin/OperationLogsPage.vue') },
        { path: 'system-config', component: () => import('../views/admin/SystemConfigPage.vue') },
        { path: 'audio-tags', component: () => import('../views/admin/AudioTagsPage.vue') },
      ],
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // 如果 token 存在但用户未加载，尝试加载
  if (authStore.token && !authStore.user) {
    await authStore.fetchUser()
  }

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next('/login')
  } else if (to.meta.requiresAdmin && authStore.user?.role?.code !== 'admin') {
    next('/')
    ElMessage.warning('无权访问后台管理')
  } else if ((to.path === '/login' || to.path === '/register') && authStore.isLoggedIn) {
    next('/')
  } else {
    next()
  }
})

export default router
