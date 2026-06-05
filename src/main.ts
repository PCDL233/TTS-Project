import { createApp, version } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus, { ElMessage } from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import './style.css'
import App from './App.vue'
import router from './router'
import { useSystemConfig } from './composables/useSystemConfig'

import VueECharts from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components'

use([CanvasRenderer, LineChart, BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent])

console.log('[MiMo TTS] main.ts loaded')
console.log('[MiMo TTS] Vue version:', version)

try {
  const app = createApp(App)
  const pinia = createPinia()

  // 注册所有 Element Plus 图标
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }

  app.component('v-chart', VueECharts)

  app.use(pinia)
  app.use(router)
  app.use(ElementPlus, { locale: zhCn })

  // 显式挂载全局方法
  app.config.globalProperties.$message = ElMessage

  app.mount('#app')
  console.log('[MiMo TTS] App mounted successfully')

  // 加载系统配置（设置 document.title 等）
  const { loadSystemConfig } = useSystemConfig()
  loadSystemConfig()
} catch (err) {
  console.error('[MiMo TTS] Failed to mount app:', err)
}
